// Alta de alumnos y alumnas de Inglés desde la página (openspec: alta-alumnos).
// Registro: alumnos.json → { "<correo>": { nombre, alta, inicio?, origen?, baja?, secundaria?, slugSecundaria? } } (en Postgres en producción). Desde la
// fase 2 de «Inglés sin Notion» (openspec: cierre-tecnico) es la única fuente de identidad de Inglés.
import { slugAlumno } from "./motor.ts";
import { SLUG_VALIDO } from "./secundaria_registro.ts";
import type { InglesRow } from "./rows.ts";
import type { Store } from "./store.ts";

type Json = (body: unknown, status?: number) => Response;

export interface AlumnoRegistrado {
  nombre: string;
  alta: string;
  inicio?: string; // lunes en que empieza (AAAA-MM-DD); antes no ve atrasos (openspec: inicio-lunes-alumnos)
  origen?: "notion"; // importada de Notion en la fase 1 (openspec: cierre-tecnico); hoy solo informativo
  baja?: string; // AAAA-MM-DD (CDMX) en que se dio de baja de Inglés; reversible (openspec: ingles-baja-alumno)
  // Acceso a Secundaria (openspec: secundaria-sin-notion); la baja de Inglés no lo quita. `slugSecundaria`: el slug con
  // el que ya estaban sus resultados de Secundaria (el de su primer nombre en Notion) si difiere del de `nombre`.
  secundaria?: true;
  slugSecundaria?: string;
}

// Lunes siguiente (estrictamente posterior) a la fecha del alta en CDMX (UTC−6, sin horario de verano).
export function lunesDeInicio(altaIso: string): string {
  const d = new Date(Date.parse(altaIso) - 6 * 3600_000);
  const dia = d.getUTCDay(); // 0 domingo … 1 lunes
  d.setUTCDate(d.getUTCDate() + ((8 - dia) % 7 || 7));
  return d.toISOString().slice(0, 10);
}

// Lunes de inicio del alumno o alumna con ese nombre, si su alta lo tiene.
export function inicioDe(registro: RegistroAlumnos, alumno: string | null): string | undefined {
  if (!alumno) return undefined;
  const slug = slugAlumno(alumno);
  return Object.values(registro).find((a) => slugAlumno(a.nombre) === slug)?.inicio;
}
export type RegistroAlumnos = Record<string, AlumnoRegistrado>;

// Registro sin las bajas de Inglés (openspec: ingles-baja-alumno): lo que cuenta en Inglés (tablero, resumen,
// actividades). La identidad de Juegos, el portal y la contraseña siguen usando el registro completo.
export function sinBajas(registro: RegistroAlumnos): RegistroAlumnos {
  return Object.fromEntries(Object.entries(registro).filter(([, a]) => !a.baja));
}
export function enBajaIngles(registro: RegistroAlumnos, email: string): boolean {
  return !!registro[(email || "").trim().toLowerCase()]?.baja;
}

export const RUTA_ALUMNOS = "alumnos.json";
const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NOMBRE = /^[\p{L}][\p{L} .'-]{1,39}$/u;

let cache: { t: number; v: RegistroAlumnos } | null = null;
export function clearCacheAlumnos() {
  cache = null;
}

// Registro con caché de 30 s (se lee en cada carga de filas de Inglés).
export async function leerRegistro(store: Store): Promise<RegistroAlumnos> {
  if (cache && Date.now() - cache.t < 30_000) return cache.v;
  const v = (await store.get<RegistroAlumnos>(RUTA_ALUMNOS))?.data ?? {};
  cache = { t: Date.now(), v };
  return v;
}

// Liga cada correo registrado a las filas con su "Nombre"; si no tiene filas, agrega una fila de identidad
// (source "registro", sin tarea) para que el portal, Inglés, actividades y Juegos lo reconozcan. En producción se
// llama con `filas = []` (Inglés ya no lee Notion).
export function aplicarAlumnos(filas: InglesRow[], registro: RegistroAlumnos): InglesRow[] {
  const entradas = Object.entries(registro);
  if (!entradas.length) return filas;
  const porSlug = new Map(entradas.map(([email, a]) => [slugAlumno(a.nombre), { email, ...a }]));
  const usados = new Set<string>();
  const out = filas.map((r) => {
    const a = r.alumno ? porSlug.get(slugAlumno(r.alumno)) : undefined;
    if (!a || r.userEmails.includes(a.email)) return r;
    usados.add(a.email);
    return { ...r, userEmails: [...r.userEmails, a.email], userNames: [...r.userNames, a.nombre] };
  });
  for (const [email, a] of entradas) {
    if (usados.has(email) || filas.some((r) => r.userEmails.includes(email))) continue;
    out.push({
      source: "registro", id: `registro-${slugAlumno(a.nombre)}`, name: "", label: "", completado: false, fecha: null, alumno: a.nombre,
      calificacion: null, dificultad: null, editadoEn: null, userIds: [], userEmails: [email], userNames: [a.nombre], url: "",
    });
  }
  return out;
}

export interface DepsAlumnos {
  email: string;
  admin: string;
  store: Store;
  filas(): Promise<InglesRow[]>; // filas externas al registro; en producción, [] (Inglés ya no lee Notion)
  ahora?: () => string;
  // Inscribe al grupo elegido en el alta (openspec: ingles-grupos); ausente si no hay base de datos.
  inscribir?: (nombre: string, grupo: string, desde: string) => Promise<boolean>;
}

async function escribir(store: Store, cambiar: (r: RegistroAlumnos) => RegistroAlumnos, mensaje: string): Promise<boolean> {
  for (let i = 0; i < 3; i++) {
    const doc = await store.get<RegistroAlumnos>(RUTA_ALUMNOS);
    const nuevo = cambiar({ ...(doc?.data ?? {}) });
    if (await store.put(RUTA_ALUMNOS, nuevo, doc?.sha ?? null, mensaje)) {
      cache = { t: Date.now(), v: nuevo };
      return true;
    }
  }
  return false;
}

// GET /ingles/alumnos → alumnos y alumnas de las filas externas y del registro, por nombre.
function listarAlumnos(filas: InglesRow[], registro: RegistroAlumnos, json: Json): Response {
  const notion = new Map<string, Set<string>>();
  for (const r of filas) {
    if (!r.alumno) continue;
    if (!notion.has(r.alumno)) notion.set(r.alumno, new Set());
    r.userEmails.forEach((e) => notion.get(r.alumno!)!.add(e));
  }
  const alumnos = [
    ...[...notion].map(([nombre, emails]) => ({ nombre, emails: [...emails], origen: "notion" as const })),
    ...Object.entries(registro).map(([e, a]) => ({ nombre: a.nombre, emails: [e], origen: "registro" as const, alta: a.alta, ...(a.inicio ? { inicio: a.inicio } : {}), ...(a.baja ? { baja: a.baja } : {}), ...(a.secundaria ? { secundaria: true } : {}) })),
  ].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  return json({ alumnos });
}

// POST /ingles/alumnos { email, nombre, grupo? } → alta en el registro (y en su grupo, si se eligió).
async function altaAlumno(body: Record<string, unknown>, filas: InglesRow[], registro: RegistroAlumnos, deps: DepsAlumnos, json: Json): Promise<Response> {
  const correo = String(body.email ?? "").trim().toLowerCase();
  const nombre = String(body.nombre ?? "").trim().replaceAll(/\s+/g, " ");
  if (!CORREO.test(correo)) return json({ error: "correo_invalido" }, 400);
  if (!NOMBRE.test(nombre)) return json({ error: "nombre_invalido" }, 400);
  if (correo === deps.admin || registro[correo] || filas.some((r) => r.userEmails.includes(correo))) return json({ error: "correo_en_uso" }, 409);
  const slug = slugAlumno(nombre);
  if (slug === "profe") return json({ error: "nombre_en_uso" }, 409); // reservado para la ruta del profe
  const conCorreo = filas.some((r) => r.alumno && slugAlumno(r.alumno) === slug && r.userEmails.length) ||
    Object.values(registro).some((a) => slugAlumno(a.nombre) === slug);
  if (conCorreo) return json({ error: "nombre_en_uso" }, 409);
  const alta = deps.ahora ? deps.ahora() : new Date().toISOString();
  // Liga a un alumno que ya lleva el curso en Notion: sin inicio (sus atrasos son reales).
  const existente = filas.some((r) => r.alumno && slugAlumno(r.alumno) === slug);
  const alumno: AlumnoRegistrado = existente ? { nombre, alta } : { nombre, alta, inicio: lunesDeInicio(alta) };
  const grupo = body.grupo === undefined || body.grupo === "" ? null : String(body.grupo);
  if (grupo && (!deps.inscribir || !/^[a-z0-9-]{1,60}$/.test(grupo))) return json({ error: "grupo_invalido" }, 400);
  if (!await escribir(deps.store, (r) => ({ ...r, [correo]: alumno }), `alumnos: alta de ${nombre}`)) return json({ error: "conflicto_escritura" }, 503);
  if (grupo && !await deps.inscribir!(nombre, grupo, alumno.inicio ?? alta.slice(0, 10))) return json({ error: "grupo_inexistente", alumno: { email: correo, ...alumno } }, 400);
  return json({ ok: true, alumno: { email: correo, ...alumno } });
}

// sub: "" (GET lista, POST alta) o "/quitar" (POST). Solo admin.
export async function handleAlumnos(req: Request, sub: string, deps: DepsAlumnos, json: Json): Promise<Response> {
  const email = (deps.email || "").trim().toLowerCase();
  if (!deps.admin || email !== deps.admin) return json({ error: "solo_admin" }, 403);
  const filas = await deps.filas();
  const registro = (await deps.store.get<RegistroAlumnos>(RUTA_ALUMNOS))?.data ?? {};

  if (sub === "" && req.method === "GET") return listarAlumnos(filas, registro, json);

  let body: Record<string, unknown> = {};
  if (req.method === "POST") {
    try { body = await req.json(); } catch { return json({ error: "json_invalido" }, 400); }
  }

  if (sub === "" && req.method === "POST") return await altaAlumno(body, filas, registro, deps, json);

  if (sub === "/quitar" && req.method === "POST") {
    const correo = String(body.email ?? "").trim().toLowerCase();
    if (!registro[correo]) return json({ error: "not_found" }, 404);
    const nombre = registro[correo].nombre;
    if (!await escribir(deps.store, (r) => { delete r[correo]; return r; }, `alumnos: se quita a ${nombre}`)) return json({ error: "conflicto_escritura" }, 503);
    return json({ ok: true });
  }

  return json({ error: "not_found" }, 404);
}

// POST /ingles/grupos/baja | /reactivar { email } (solo admin, openspec: ingles-baja-alumno): marca o quita
// `baja: "AAAA-MM-DD"` en su entrada del registro. No borra resultados, avance, borradores ni inscripciones.
export interface DepsBaja {
  email: string;
  admin: string;
  store: Store;
  hoy: () => string; // AAAA-MM-DD (CDMX)
}
export async function handleBajaIngles(req: Request, sub: string, deps: DepsBaja, json: Json): Promise<Response> {
  const email = (deps.email || "").trim().toLowerCase();
  if (!deps.admin || email !== deps.admin) return json({ error: "solo_admin" }, 403);
  if (req.method !== "POST" || (sub !== "/baja" && sub !== "/reactivar")) return json({ error: "not_found" }, 404);
  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { return json({ error: "json_invalido" }, 400); }
  const correo = String(body?.email ?? "").trim().toLowerCase();
  const actual = (await deps.store.get<RegistroAlumnos>(RUTA_ALUMNOS))?.data?.[correo];
  if (!correo || !actual) return json({ error: "not_found" }, 404);
  const darDeBaja = sub === "/baja";
  if (darDeBaja === !!actual.baja) return json({ ok: true, sinCambio: true, alumno: { email: correo, ...actual } });
  const hoy = deps.hoy();
  let final: AlumnoRegistrado = actual;
  const ok = await escribir(deps.store, (r) => {
    if (!r[correo]) return r;
    const { baja: _previa, ...resto } = r[correo];
    final = darDeBaja ? { ...resto, baja: hoy } : resto;
    return { ...r, [correo]: final };
  }, `alumnos: ${darDeBaja ? "baja de Inglés de" : "reactiva en Inglés a"} ${actual.nombre}`);
  if (!ok) return json({ error: "conflicto_escritura" }, 503);
  return json({ ok: true, alumno: { email: correo, ...final } });
}

// POST /ingles/grupos/secundaria { email, secundaria: boolean } (solo admin, openspec: secundaria-sin-notion): marca o
// quita `secundaria: true` en su entrada del registro. Reversible; no toca Inglés, resultados ni Juegos. Al marcarla
// se guarda `slugSecundaria` si su slug de antes (primer nombre en Notion) no es el de su nombre, para que sus
// resultados de Secundaria sigan bajo un solo slug. Al quitarla se conserva `slugSecundaria`.
export interface DepsSecundariaAlumno extends DepsBaja {
  slugPrevio?: (correo: string) => Promise<string | null>;
}
export async function handleSecundariaAlumno(req: Request, deps: DepsSecundariaAlumno, json: Json): Promise<Response> {
  const email = (deps.email || "").trim().toLowerCase();
  if (!deps.admin || email !== deps.admin) return json({ error: "solo_admin" }, 403);
  if (req.method !== "POST") return json({ error: "not_found" }, 404);
  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { return json({ error: "json_invalido" }, 400); }
  if (typeof body?.secundaria !== "boolean") return json({ error: "secundaria_invalida" }, 400);
  const correo = String(body.email ?? "").trim().toLowerCase();
  const actual = (await deps.store.get<RegistroAlumnos>(RUTA_ALUMNOS))?.data?.[correo];
  if (!correo || !actual) return json({ error: "not_found" }, 404);
  const activar = body.secundaria;
  if (activar === !!actual.secundaria) return json({ ok: true, sinCambio: true, alumno: { email: correo, ...actual } });
  let previo: string | null = null;
  if (activar && !actual.slugSecundaria && deps.slugPrevio) {
    try { previo = await deps.slugPrevio(correo); } catch (e) { console.error("slug previo de Secundaria:", e instanceof Error ? e.message : e); }
  }
  let final: AlumnoRegistrado = actual;
  const ok = await escribir(deps.store, (r) => {
    if (!r[correo]) return r;
    const { secundaria: _antes, ...resto } = r[correo];
    const heredado = previo && SLUG_VALIDO.test(previo) && previo !== slugAlumno(resto.nombre) ? { slugSecundaria: previo } : {};
    final = activar ? { ...resto, ...heredado, secundaria: true } : resto;
    return { ...r, [correo]: final };
  }, `alumnos: ${activar ? "da acceso a Secundaria a" : "quita Secundaria a"} ${actual.nombre}`);
  if (!ok) return json({ error: "conflicto_escritura" }, 503);
  return json({ ok: true, alumno: { email: correo, ...final } });
}
