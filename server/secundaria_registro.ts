// Identidad de Secundaria sin Notion (openspec: secundaria-sin-notion): sale del registro de alumnos y alumnas
// (alumnos.json, en Postgres en producción; server/alumnos.ts). Entra a Secundaria, con su nombre y su slug canónico
// (abajo), una entrada que:
//   - tiene `secundaria: true` (la marca del profe), o
//   - cuyo slug aparece en `alumnos` de algún elemento de contenido/secundaria/ (sus clases exclusivas).
// La baja de Inglés NO quita Secundaria. Los correos nunca salen en las respuestas.
// Slug canónico de Secundaria: `slugSecundaria` si lo tiene; si no, si el slug de su nombre aparece en un arreglo
// `alumnos` (p. ej. ["sofia","sofy"]), el PRIMERO de ese arreglo («sofia», con el que ya estaban sus resultados); si
// no, el de su nombre. Salvaguarda (`alumnos` dice a quién va la clase, no siempre son alias): el primero solo se toma
// si parece la misma persona (empieza con las mismas 3 letras que su slug) y no es el slug propio de otra entrada del
// registro; así una clase para ["sofia","ana"] no le da a Ana el slug ni los resultados de Sofía.
// Mientras ninguna entrada tenga `secundaria: true`, `filasSecundaria` cae temporalmente a las filas de Notion y deja
// un aviso en el log (tarea de seguimiento: quitar esa caída cuando el profe ya haya marcado a sus alumnas).
import type { RegistroAlumnos } from "./alumnos.ts";
import { slugAlumno } from "./motor.ts";
import { normalizeEmail } from "./rows.ts";

// Misma forma que las filas de Notion (FilaConUsuarios): perfil, Juegos y contraseña las consumen sin cambios.
export interface FilaSecundaria {
  userIds: string[];
  userEmails: string[];
  userNames: string[];
  slug?: string; // solo las del registro; las de Notion lo sacan del primer nombre
}

// Lo que necesita la identidad (las filas de Notion y las del registro lo tienen).
export type FilaIdentidad = Pick<FilaSecundaria, "userEmails" | "userNames" | "slug">;

export const SLUG_VALIDO = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// Slug de Secundaria de una entrada: el guardado al marcarla (el que ya usaban sus resultados) o el de su nombre.
export function slugSecundariaDe(a: { nombre: string; slugSecundaria?: string }): string {
  return typeof a.slugSecundaria === "string" && SLUG_VALIDO.test(a.slugSecundaria) ? a.slugSecundaria : slugAlumno(a.nombre);
}

// `exclusivos`: slug de `alumnos` → slug canónico (el primero de su arreglo); ver `slugsExclusivos`.
export function filasDeRegistro(reg: RegistroAlumnos, exclusivos: Map<string, string> = new Map()): FilaSecundaria[] {
  const filas: FilaSecundaria[] = [];
  // Slugs propios de todo el registro (nombre o slugSecundaria): nadie toma como alias el slug de otra persona.
  const propios = new Set(Object.values(reg || {}).filter((a) => typeof a?.nombre === "string").map(slugSecundariaDe));
  for (const [correo, a] of Object.entries(reg || {})) {
    const nombre = typeof a?.nombre === "string" ? a.nombre.trim() : "";
    const email = normalizeEmail(correo);
    if (!nombre || !email) continue;
    const propio = slugSecundariaDe(a);
    const canonico = exclusivos.get(propio);
    if (a.secundaria !== true && !canonico) continue;
    const alias = canonico && canonico !== propio && esAliasDe(canonico, propio) && !propios.has(canonico) ? canonico : propio;
    const slug = SLUG_VALIDO.test(a.slugSecundaria ?? "") ? propio : alias;
    filas.push({ userIds: [], userEmails: [email], userNames: [nombre], slug });
  }
  return filas;
}

// ¿`canonico` parece otro slug de la misma persona? Mismas 3 primeras letras (sofia / sofy).
const esAliasDe = (canonico: string, propio: string) => canonico.length >= 3 && propio.slice(0, 3) === canonico.slice(0, 3);

// Slugs de `alumnos` de una lista de elementos → slug canónico: el primero del primer arreglo que lo nombra
// (["sofia","sofy"] → sofia ↦ sofia, sofy ↦ sofia).
export function slugsExclusivos(items: { alumnos?: string[] }[]): Map<string, string> {
  const mapa = new Map<string, string>();
  for (const it of items) {
    const lista = Array.isArray(it.alumnos) ? it.alumnos.filter((x) => typeof x === "string" && SLUG_VALIDO.test(x)) : [];
    for (const x of lista) if (!mapa.has(x)) mapa.set(x, lista[0]);
  }
  return mapa;
}

export interface DepsFilasSecundaria {
  registro(): Promise<RegistroAlumnos>; // registro completo (con bajas de Inglés)
  exclusivos?: () => Promise<Map<string, string>>; // slugs de `alumnos` del contenido → slug canónico
  notion(): Promise<FilaSecundaria[]>; // caída temporal; sin NOTION_TOKEN, []
  avisar?: (m: string) => void;
}

export async function filasSecundaria(deps: DepsFilasSecundaria): Promise<FilaSecundaria[]> {
  const avisar = deps.avisar ?? console.warn;
  let exclusivos = new Map<string, string>();
  try { exclusivos = deps.exclusivos ? await deps.exclusivos() : exclusivos; } catch (e) { avisar(`secundaria: no se pudo leer el contenido (${e instanceof Error ? e.message : e})`); }
  const filas = filasDeRegistro(await deps.registro(), exclusivos);
  if (filas.length) return filas;
  avisar("secundaria: nadie de alumnos.json tiene Secundaria (ni «secundaria: true» ni clases exclusivas); se usan temporalmente las filas de Notion");
  try {
    const notion = await deps.notion();
    return Array.isArray(notion) ? notion : [];
  } catch (e) {
    avisar(`secundaria: la caída a Notion falló (${e instanceof Error ? e.message : e}); nadie entra a Secundaria`);
    return [];
  }
}

// Nombre y slug de un correo: los del registro o, en filas de Notion, el primer nombre (como antes).
export function identidadSecundaria(filas: FilaIdentidad[], correo: string): { nombre: string; slug: string } | null {
  const fila = filas.find((r) => r.userEmails.includes(correo));
  return fila ? identidadDeFila(fila) : null;
}

function identidadDeFila(fila: FilaIdentidad): { nombre: string; slug: string } | null {
  const completo = fila.userNames[0]?.trim() || "";
  const nombre = fila.slug ? completo : completo.split(/\s+/)[0];
  if (!nombre) return null;
  return { nombre, slug: fila.slug ?? slugAlumno(nombre) };
}

// Alumnas para el selector del profe: nombre y slug, sin correos, sin repetir slug.
export function alumnasSecundaria(filas: FilaIdentidad[]): { nombre: string; slug: string }[] {
  const vistas = new Map<string, { nombre: string; slug: string }>();
  for (const f of filas) {
    const id = identidadDeFila(f);
    if (id && !vistas.has(id.slug)) vistas.set(id.slug, id);
  }
  return [...vistas.values()];
}
