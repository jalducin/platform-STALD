// Validación de misiones principales y del catálogo de mundos (openspec: rpg-fase2-misiones). Formato en
// docs/data-model.md § «Misiones principales». Lo usan el CLI `validar_semana.ts <datos> --misiones <ámbito>` y el
// servidor (server/misiones.ts) al leer el contenido.
// deno-lint-ignore-file no-explicit-any
import "../comun/gamificacion.js";
import { erroresDiagramas } from "./diagrama.ts";
import { erroresPractica } from "./practica.ts";
import type { Store } from "./store.ts";

const G = (globalThis as any).Gamificacion;

// Ámbitos con misiones: carpeta de contenido de cada uno. Inglés de grupo usa contenido/ingles/ (spec misiones).
export const AMBITOS_MISION: Record<string, string> = { secundaria: "contenido/secundaria", ingles: "contenido/ingles" };
export type AmbitoMision = keyof typeof AMBITOS_MISION;

export interface Mundo { id: string; materia: string; nombre: string; emoji?: string; desde?: string | null; hasta?: string | null; misionPrincipal?: string | null }
export interface Nivel { nivel?: number; nombre?: string; puntos: number; descriptor?: string }
export interface Criterio { id: string; criterio: string; descripcion?: string; puntos?: number; niveles: Nivel[] }
export interface Paso { id: string; titulo: string; instrucciones: string; fechaLimite: string; tipoEntrega: string; entregable?: string; extension?: string; ejemplo?: string }
export interface Mision {
  id: string; tipo?: string; titulo: string; materia: string; mundo: string; descripcion?: string; disponibleDesde?: string;
  consigna: string; pasos: Paso[]; rubrica: Criterio[]; teoria?: unknown[]; tips?: { tipo?: string; texto?: string; url?: string }[];
  alumnos?: string[]; grupos?: string[];
}

const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const esFecha = (f: unknown) => typeof f === "string" && FECHA.test(f) && !Number.isNaN(Date.parse(f + "T12:00:00Z"));
const texto = (x: unknown) => typeof x === "string" && x.trim().length > 0;
const sinAcentos = (s: string) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
// Aviso de privacidad obligatorio en la consigna (spec «Privacidad y retención de entregables»).
export const AVISO_PRIVACIDAD = "Sin nombres reales, direcciones ni datos de contacto";
const tieneAviso = (consigna: string) => sinAcentos(consigna).includes("sin nombres reales");
// Puntos máximos de un criterio: el mayor de sus niveles.
export const maxCriterio = (c: Criterio) => Math.max(...(c.niveles || []).map((n) => Number(n.puntos) || 0));

// Catálogo de mundos: campos, ids únicos, fechas válidas y sin encimarse dentro de una materia. En Secundaria, además,
// nombres y fechas iguales a los de comun/gamificacion.js (la fuente; si cambia ahí, se cambia aquí).
export function validarCatalogo(data: unknown, ambito: string): string[] {
  const errores: string[] = [];
  const lista = (data as any)?.mundos;
  if (!Array.isArray(lista) || !lista.length) return ["mundos.json: falta la lista `mundos`"];
  const ids = new Set<string>();
  lista.forEach((w: any, i: number) => {
    const donde = `mundos.json[${i}]${w?.id ? ` (${w.id})` : ""}`;
    for (const k of ["id", "materia", "nombre", "emoji"]) if (!texto(w?.[k])) errores.push(`${donde}: falta ${k}`);
    if (w?.id && ids.has(w.id)) errores.push(`${donde}: id repetido`);
    if (w?.id) ids.add(w.id);
    for (const k of ["desde", "hasta"]) if (w?.[k] != null && !esFecha(w[k])) errores.push(`${donde}: ${k} no es una fecha AAAA-MM-DD`);
    if (w?.hasta && !w?.desde) errores.push(`${donde}: tiene hasta sin desde`);
    if (w?.desde && w?.hasta && w.hasta < w.desde) errores.push(`${donde}: hasta antes de desde`);
  });
  // Encimados: dos mundos de la misma materia con rangos que se cruzan (los paralelos se marcan con el mismo rango
  // solo si la fuente lo dice: Laberinto Sintaxis y Núcleo IA comparten fechas a propósito).
  const fuente = G.catalogoDeMundos() as Mundo[];
  const paralelos = (a: Mundo, b: Mundo) => fuente.some((x) => x.nombre === a.nombre) && fuente.some((x) => x.nombre === b.nombre) &&
    fuente.find((x) => x.nombre === a.nombre)!.desde === fuente.find((x) => x.nombre === b.nombre)!.desde && a.desde === b.desde;
  for (let i = 0; i < lista.length; i++) {
    for (let j = i + 1; j < lista.length; j++) {
      const a = lista[i], b = lista[j];
      if (!a?.desde || !b?.desde || sinAcentos(a.materia) !== sinAcentos(b.materia) || paralelos(a, b)) continue;
      const finA = a.hasta || "9999-12-31", finB = b.hasta || "9999-12-31";
      if (a.desde <= finB && b.desde <= finA) errores.push(`mundos.json: «${a.nombre}» y «${b.nombre}» (${a.materia}) se enciman`);
    }
  }
  if (ambito === "secundaria") {
    for (const w of lista as Mundo[]) {
      const f = fuente.find((x) => x.id === w.id);
      if (!f) { errores.push(`mundos.json: «${w.id}» no está en comun/gamificacion.js`); continue; }
      if (f.nombre !== w.nombre) errores.push(`mundos.json: ${w.id} se llama «${f.nombre}» en comun/gamificacion.js, no «${w.nombre}»`);
      if ((f.desde || null) !== (w.desde || null) || (f.hasta || null) !== (w.hasta || null)) {
        errores.push(`mundos.json: ${w.id} va del ${f.desde ?? "—"} al ${f.hasta ?? "—"} en comun/gamificacion.js, no del ${w.desde ?? "—"} al ${w.hasta ?? "—"}`);
      }
      if (sinAcentos(f.materia) !== sinAcentos(w.materia)) errores.push(`mundos.json: ${w.id} es de ${f.materia} en comun/gamificacion.js`);
    }
    for (const f of fuente) if (!(lista as Mundo[]).some((w) => w.id === f.id)) errores.push(`mundos.json: falta el mundo ${f.id} (${f.nombre})`);
  }
  return errores;
}

// Una misión contra su catálogo de mundos. Devuelve errores (bloquean) y avisos.
export function validarMision(m: any, mundos: Mundo[], archivo = ""): { errores: string[]; avisos: string[] } {
  const errores: string[] = [];
  const avisos: string[] = [];
  const id = m?.id || archivo || "misión";
  const e = (msg: string) => errores.push(`${id}: ${msg}`);
  for (const k of ["id", "titulo", "materia", "mundo", "consigna"]) if (!texto(m?.[k])) e(`falta ${k}`);
  if (archivo && m?.id && archivo !== m.id) e(`el archivo se llama ${archivo}.json pero el id es ${m.id}`);
  if (m?.id && !/^mis-[a-z0-9]+(-[a-z0-9]+)+$/.test(m.id)) e("el id debe ser mis-<materia>-<mundo> (minúsculas y guiones)");
  if (texto(m?.consigna) && !tieneAviso(m.consigna)) e(`la consigna no incluye el aviso de privacidad («${AVISO_PRIVACIDAD}»)`);
  if (m?.disponibleDesde != null && !esFecha(m.disponibleDesde)) e("disponibleDesde no es una fecha AAAA-MM-DD");
  const mundo = mundos.find((w) => w.id === m?.mundo);
  if (texto(m?.mundo) && !mundo) e(`el mundo ${m.mundo} no está en el catálogo`);
  // Pasos: 3 a 5, ids únicos, campos, fechas en orden y dentro del mundo, solo texto.
  const pasos = Array.isArray(m?.pasos) ? m.pasos : [];
  if (pasos.length < 3 || pasos.length > 5) e(`debe tener de 3 a 5 pasos (tiene ${pasos.length})`);
  const idsPaso = new Set<string>();
  let previa = "";
  pasos.forEach((p: any, i: number) => {
    const donde = `paso ${i + 1}${p?.id ? ` (${p.id})` : ""}`;
    for (const k of ["id", "titulo", "instrucciones"]) if (!texto(p?.[k])) e(`${donde}: falta ${k}`);
    if (p?.id && idsPaso.has(p.id)) e(`${donde}: id repetido`);
    if (p?.id) idsPaso.add(p.id);
    if (p?.tipoEntrega !== "texto") {
      if (p?.tipoEntrega === "imagen" || p?.tipoEntrega === "audio") e(`${donde}: por ahora las entregas son solo texto (pide «${p.tipoEntrega}»)`);
      else e(`${donde}: tipoEntrega debe ser «texto»`);
    }
    if (!esFecha(p?.fechaLimite)) { e(`${donde}: fechaLimite no es una fecha AAAA-MM-DD`); return; }
    if (previa && p.fechaLimite < previa) e(`${donde}: las fechas de los pasos no van en orden`);
    previa = p.fechaLimite;
    if (mundo?.desde && p.fechaLimite < mundo.desde) e(`${donde}: vence antes de que empiece el mundo (${mundo.desde})`);
    if (mundo?.hasta && p.fechaLimite > mundo.hasta) e(`${donde}: vence después de que termine el mundo (${mundo.hasta})`);
    if (esFecha(m?.disponibleDesde) && p.fechaLimite < m.disponibleDesde) e(`${donde}: vence antes de disponibleDesde`);
  });
  if (esFecha(m?.disponibleDesde) && mundo?.hasta && m.disponibleDesde > mundo.hasta) e("disponibleDesde queda después del fin del mundo");
  // Rúbrica: exactamente 4 criterios con id, niveles con puntos; los máximos suman 100.
  const rubrica = Array.isArray(m?.rubrica) ? m.rubrica : [];
  if (rubrica.length !== 4) e(`la rúbrica debe tener exactamente 4 criterios (tiene ${rubrica.length})`);
  const idsCrit = new Set<string>();
  let suma = 0;
  rubrica.forEach((c: any, i: number) => {
    const donde = `criterio ${i + 1}${c?.id ? ` (${c.id})` : ""}`;
    if (!texto(c?.id)) e(`${donde}: falta id`);
    if (!texto(c?.criterio)) e(`${donde}: falta criterio`);
    if (c?.id && idsCrit.has(c.id)) e(`${donde}: id repetido`);
    if (c?.id) idsCrit.add(c.id);
    const niveles = Array.isArray(c?.niveles) ? c.niveles : [];
    if (niveles.length < 2) e(`${donde}: necesita al menos 2 niveles`);
    if (niveles.some((n: any) => !Number.isFinite(Number(n?.puntos)) || Number(n.puntos) < 0 || !texto(n?.nombre))) e(`${donde}: cada nivel necesita nombre y puntos ≥ 0`);
    const max = niveles.length ? maxCriterio(c) : 0;
    if (c?.puntos != null && Number(c.puntos) !== max) e(`${donde}: puntos (${c.puntos}) no coincide con su nivel más alto (${max})`);
    suma += max;
  });
  if (rubrica.length && suma !== 100) e(`la rúbrica suma ${suma} puntos; debe sumar 100`);
  // Tips con fuente y teoría con diagramas válidos (mismas reglas que las clases).
  const tips = Array.isArray(m?.tips) ? m.tips : [];
  if (!tips.length) avisos.push(`${id}: sin tips`);
  tips.forEach((t: any, i: number) => {
    if (!texto(t?.texto)) e(`tip ${i + 1}: falta texto`);
    if (t?.url != null && !/^https:\/\//.test(String(t.url))) e(`tip ${i + 1}: la url debe ser https`);
  });
  errores.push(...erroresDiagramas(m?.teoria).map((x) => `${id}: ${x}`), ...erroresPractica(m?.teoria).map((x) => `${id}: ${x}`));
  if (m?.alumnos != null && (!Array.isArray(m.alumnos) || m.alumnos.some((s: unknown) => !texto(s)))) e("alumnos debe ser una lista de slugs");
  if (m?.grupos != null && (!Array.isArray(m.grupos) || m.grupos.some((s: unknown) => !texto(s)))) e("grupos debe ser una lista de ids de grupo");
  return { errores, avisos };
}

// Catálogo de un ámbito: el de mundos.json si se puede leer; si no, el derivado de comun/gamificacion.js.
export async function catalogoDe(store: Store, ambito: string): Promise<{ mundos: Mundo[]; desdeArchivo: boolean }> {
  const doc = await store.get<{ mundos: Mundo[] }>(`${AMBITOS_MISION[ambito]}/mundos.json`);
  if (doc && Array.isArray(doc.data?.mundos)) return { mundos: doc.data.mundos, desdeArchivo: true };
  return { mundos: G.catalogoDeMundos(), desdeArchivo: false };
}

// Valida el catálogo y todas las misiones de un ámbito (forma `--misiones <ámbito>` del CLI). Un id de misión no
// puede repetirse en otro ámbito: las entregas se guardan en entregas/<id>/<slug>.json.
export async function validarMisiones(store: Store, ambito: string): Promise<{ errores: string[]; avisos: string[] }> {
  const errores: string[] = [];
  const avisos: string[] = [];
  const base = AMBITOS_MISION[ambito];
  if (!base) return { errores: [`ámbito desconocido: ${ambito} (usa ${Object.keys(AMBITOS_MISION).join(" o ")})`], avisos };
  const cat = await store.get(`${base}/mundos.json`);
  if (cat) errores.push(...validarCatalogo(cat.data, ambito));
  else if (ambito === "secundaria") errores.push(`${base}/mundos.json: no existe`);
  else avisos.push(`${base}/mundos.json: no existe; se usan los mundos de comun/gamificacion.js`);
  const { mundos } = await catalogoDe(store, ambito);
  const nombres = (await store.list(`${base}/misiones`)).filter((n) => n.endsWith(".json"));
  if (!nombres.length) avisos.push(`${base}/misiones: sin misiones`);
  const otros = (await Promise.all(Object.entries(AMBITOS_MISION).filter(([k]) => k !== ambito).map(([, d]) => store.list(`${d}/misiones`)))).flat();
  for (const n of nombres) {
    const doc = await store.get<Mision>(`${base}/misiones/${n}`);
    const r = validarMision(doc?.data, mundos, n.slice(0, -5));
    errores.push(...r.errores);
    avisos.push(...r.avisos);
    if (otros.includes(n)) errores.push(`${n.slice(0, -5)}: el id se repite en otro ámbito; las entregas se guardan por id`);
    const w = mundos.find((x) => x.id === doc?.data?.mundo);
    if (w?.misionPrincipal && w.misionPrincipal !== doc?.data?.id) avisos.push(`${doc?.data?.id}: su mundo dice que la misión principal es ${w.misionPrincipal}`);
  }
  return { errores, avisos };
}
