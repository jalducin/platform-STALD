// Misiones principales (openspec: rpg-fase2-misiones): lectura de misiones y catálogo, entrega de pasos SOLO en texto,
// bandeja básica del admin (evaluar con rúbrica, pedir corrección, borrar contenido) y práctica de la teoría.
// Contenido: contenido/<ámbito>/misiones/<id>.json y mundos.json (repo de datos). Entregas: entregas/<id>/<slug>.json
// (stald_docs en Postgres; prefijo en server/db.ts). Formatos en docs/data-model.md; matriz de acceso en
// openspec/changes/rpg-fase2-misiones/proposal.md.
// deno-lint-ignore-file no-explicit-any
import "../comun/gamificacion.js";
import { AMBITO_SECUNDARIA, loadItem, visibleItems } from "./actividades.ts";
import { crearMemo } from "./cache.ts";
import { leerCarpeta, rutasBajo } from "./db.ts";
import { esPara } from "./motor.ts";
import { AMBITOS_MISION, catalogoDe, type Mision, type Mundo } from "./misiones_validar.ts";
import { buscarPractica, comprobar, teoriaPublica } from "./practica.ts";
import type { Store } from "./store.ts";

const G = (globalThis as any).Gamificacion;
type Json = (body: unknown, status?: number) => Response;

export const MAX_TEXTO = 4000;
export const MAX_MOTIVO = 300;
export const MAX_COMENTARIO = 1000;
const CLAVES_ARCHIVO = ["archivo", "archivos", "imagen", "imagenes", "audio", "foto", "fotos", "adjunto", "adjuntos", "file", "files", "blob", "base64"];

// Quién pide, ya resuelto por main.ts (nunca con correo).
export type PersonaMision =
  | { tipo: "admin" }
  | { tipo: "secundaria"; slug: string; nombre: string }
  | { tipo: "ingles"; slug: string; nombre: string; grupo: string | null }
  | { tipo: "baja"; slug: string }
  | { tipo: "sin_acceso" };

export interface DepsMisiones {
  store: Store;
  hoy: () => string;
  ahora: () => string;
  persona: () => Promise<PersonaMision>;
  alumnasSecundaria: () => Promise<{ slug: string; nombre: string }[]>;
  // Nombre de pila de un slug en un ámbito (bandeja del profe). Sin correo.
  nombreDe: (slug: string, ambito: string) => Promise<string | null>;
  // false si las entregas no pueden ir a Postgres (sin base): no se guardan datos de alumnos en el repo de contenido.
  puedeGuardar?: () => Promise<boolean>;
}

export interface PasoEntregado {
  texto: string | null;
  enviadoEn: string;
  tarde: boolean;
  estado: "entregado" | "correccion";
  borrado?: string;
  correccion?: { motivo: string; privacidad: boolean; fecha: string };
}
export interface Evaluacion { puntos: Record<string, number>; porcentaje: number; aTiempo: boolean; xp: number; comentario: string; fecha: string }
export interface Entrega {
  mision: string;
  ambito: string;
  slug: string;
  pasos: Record<string, PasoEntregado>;
  evaluacion: Evaluacion | null;
  historial: { accion: string; paso?: string; fecha: string }[];
}

const rutaEntrega = (id: string, slug: string) => `entregas/${id}/${slug}.json`;

// ---------- Contenido (caché 60 s por ámbito, como las clases) ----------
const memo = crearMemo<unknown>({ ttlMs: 60_000 });
export function limpiarCacheMisiones() { memo.borrar(); }

async function misionesDe(store: Store, ambito: string): Promise<Mision[]> {
  return await memo.get(`misiones:${ambito}`, async () => {
    const base = AMBITOS_MISION[ambito];
    const nombres = (await store.list(`${base}/misiones`)).filter((n) => n.endsWith(".json")).sort();
    const docs = await Promise.all(nombres.map((n) => store.get<Mision>(`${base}/misiones/${n}`)));
    return docs.map((d) => d?.data).filter((m): m is Mision => !!m && typeof m.id === "string" && Array.isArray(m.pasos) && Array.isArray(m.rubrica));
  }) as Mision[];
}
// Catálogo del ámbito; si no se puede leer (repo caído), null y la página usa la derivación de la Fase 1.
async function catalogoSeguro(store: Store, ambito: string): Promise<{ mundos: Mundo[]; desdeArchivo: boolean } | null> {
  try {
    return await memo.get(`mundos:${ambito}`, () => catalogoDe(store, ambito)) as { mundos: Mundo[]; desdeArchivo: boolean };
  } catch (e) {
    console.error("mundos.json:", e instanceof Error ? e.message : e);
    return null;
  }
}

// Desde cuándo se ve una misión: su `disponibleDesde` o, si no lo trae, el inicio de su mundo.
function abreEl(m: Mision, mundos: Mundo[]): string | null {
  return m.disponibleDesde || mundos.find((w) => w.id === m.mundo)?.desde || null;
}
function esParaPersona(m: Mision, p: PersonaMision): boolean {
  if (p.tipo === "secundaria") return !m.alumnos?.length || m.alumnos.includes(p.slug);
  if (p.tipo === "ingles") {
    if (m.alumnos?.length && m.alumnos.includes(p.slug)) return true;
    if (m.grupos?.length) return !!p.grupo && m.grupos.includes(p.grupo);
    return !m.alumnos?.length;
  }
  return false;
}
const ambitoDe = (p: PersonaMision) => (p.tipo === "secundaria" ? "secundaria" : "ingles");

// Misiones visibles para la persona (ya empezó su mundo o su disponibleDesde, y es para ella).
async function visiblesPara(d: DepsMisiones, p: PersonaMision, ambito: string): Promise<{ misiones: Mision[]; mundos: Mundo[] }> {
  const cat = await catalogoSeguro(d.store, ambito);
  const mundos = cat?.mundos ?? G.catalogoDeMundos();
  const hoy = d.hoy();
  const misiones = (await misionesDe(d.store, ambito)).filter((m) => {
    const abre = abreEl(m, mundos);
    return esParaPersona(m, p) && (!abre || abre <= hoy);
  });
  return { misiones, mundos };
}

// La misión como la ve la página: sin respuestas de la práctica. A estudiantes, sin `alumnos` ni `grupos` (los slugs
// salen de nombres); el admin los ve.
function publica(m: Mision, ambito: string, admin = false) {
  const { alumnos: _a, grupos: _g, ...resto } = m;
  return { ...(admin ? m : resto), ambito, teoria: teoriaPublica(m.teoria), tipoEntrega: "texto" };
}
// Entrega para su dueña (sin historial interno).
function entregaPublica(e: Entrega | null) {
  if (!e) return null;
  return { pasos: e.pasos, evaluacion: e.evaluacion };
}
const conEntrega = (m: Mision, ambito: string, e: Entrega | null) => ({
  ...publica(m, ambito), entrega: entregaPublica(e), evaluacion: e?.evaluacion ?? null, xp: G.xpDeMision({ evaluacion: e?.evaluacion ?? null }),
});

async function leerEntrega(store: Store, id: string, slug: string) {
  return await store.get<Entrega>(rutaEntrega(id, slug));
}

// Escribe con concurrencia optimista (hasta 3 intentos). `cambiar` devuelve una Response para cortar (409, 404…).
async function modificarEntrega(store: Store, id: string, slug: string, cambiar: (e: Entrega | null) => Entrega | Response, mensaje: string): Promise<Entrega | Response> {
  for (let i = 0; i < 3; i++) {
    const doc = await leerEntrega(store, id, slug);
    const nueva = cambiar(doc ? structuredClone(doc.data) : null);
    if (nueva instanceof Response) return nueva;
    if (await store.put(rutaEntrega(id, slug), nueva, doc?.sha ?? null, mensaje)) return nueva;
  }
  throw new Error("conflicto_entrega");
}

// Todo error del almacén al guardar → 503 (el cliente conserva su borrador).
async function conAlmacen(json: Json, fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (e) {
    console.error("misiones:", e instanceof Error ? e.message : e);
    return json({ error: "sin_guardar", mensaje: "No se pudo guardar; inténtalo de nuevo." }, 503);
  }
}

// ---------- Para Inglés (openspec: rpg-ingles-hero-card) ----------
// ¿Tiene esta persona alguna misión visible? /ingles/actividades lo avisa a la página para que solo entonces pida
// /misiones (sin peticiones de más mientras no haya misiones).
export async function hayMisionesVisibles(d: Pick<DepsMisiones, "store" | "hoy">, p: PersonaMision): Promise<boolean> {
  if (p.tipo !== "ingles" && p.tipo !== "secundaria") return false;
  try {
    return (await visiblesPara(d as DepsMisiones, p, ambitoDe(p))).misiones.length > 0;
  } catch {
    return false;
  }
}
// Pasos entregados por una persona en las misiones de un ámbito (fecha de envío): los puntos de constancia del ranking
// de Inglés (20 por paso; openspec: rpg-fase2-ingles).
export async function pasosEntregados(store: Store, ambito: string, slug: string): Promise<{ enviadoEn: string }[]> {
  const docs = await Promise.all((await misionesDe(store, ambito)).map((m) => leerEntrega(store, m.id, slug)));
  return docs.flatMap((d) => Object.values(d?.data?.pasos ?? {}).filter((x) => x.estado === "entregado" && !!x.enviadoEn).map((x) => ({ enviadoEn: x.enviadoEn })));
}

// ---------- /misiones ----------
// GET /misiones → misiones visibles con su entrega y evaluación, y el catálogo del ámbito.
// POST /misiones/<id>/entrega { paso, texto } → guarda el paso (solo texto).
export async function handleMisiones(req: Request, subpath: string, d: DepsMisiones, json: Json): Promise<Response> {
  const partes = subpath.split("/").filter(Boolean);
  const p = await d.persona();
  if (req.method === "GET" && partes.length === 0) return await listar(req, p, d, json);
  if (req.method === "POST" && partes.length === 2 && partes[1] === "entrega") return await entregar(req, partes[0], p, d, json);
  return json({ error: "not_found" }, 404);
}

async function listar(req: Request, p: PersonaMision, d: DepsMisiones, json: Json): Promise<Response> {
  if (p.tipo === "sin_acceso") return json({ error: "sin_acceso" }, 403);
  const hoy = d.hoy();
  if (p.tipo === "admin") {
    const pedida = new URL(req.url).searchParams.get("alumna");
    const cat = await catalogoSeguro(d.store, "secundaria");
    if (pedida) {
      const alumna = (await d.alumnasSecundaria()).find((a) => a.slug === pedida);
      if (!alumna) return json({ error: "alumna_no_encontrada" }, 404);
      const como: PersonaMision = { tipo: "secundaria", slug: alumna.slug, nombre: alumna.nombre };
      const { misiones } = await visiblesPara(d, como, "secundaria");
      const docs = await Promise.all(misiones.map((m) => leerEntrega(d.store, m.id, alumna.slug)));
      return json({ isAdmin: true, vistaDe: alumna, hoy, mundos: cat?.mundos ?? null, misiones: misiones.map((m, i) => conEntrega(m, "secundaria", docs[i]?.data ?? null)) });
    }
    const todas = await misionesDe(d.store, "secundaria");
    return json({ isAdmin: true, hoy, mundos: cat?.mundos ?? null, misiones: todas.map((m) => ({ ...publica(m, "secundaria", true), entrega: null, evaluacion: null, xp: 0 })) });
  }
  if (p.tipo === "baja") {
    // De baja de Inglés: solo sus entregas anteriores, de solo lectura (spec «Persona de baja o invitado»).
    const todas = await misionesDe(d.store, "ingles");
    const docs = await Promise.all(todas.map((m) => leerEntrega(d.store, m.id, p.slug)));
    const suyas = todas.map((m, i) => ({ m, e: docs[i]?.data ?? null })).filter((x) => x.e);
    return json({ isAdmin: false, soloLectura: true, hoy, mundos: null, misiones: suyas.map((x) => conEntrega(x.m, "ingles", x.e)) });
  }
  const ambito = ambitoDe(p);
  const { misiones } = await visiblesPara(d, p, ambito);
  const cat = await catalogoSeguro(d.store, ambito);
  const docs = await Promise.all(misiones.map((m) => leerEntrega(d.store, m.id, p.slug)));
  return json({ isAdmin: false, hoy, mundos: cat?.desdeArchivo ? cat.mundos : null, misiones: misiones.map((m, i) => conEntrega(m, ambito, docs[i]?.data ?? null)) });
}

// Cuerpos aceptados: JSON (application/json, o text/plain como manda la página para no pedir verificación previa).
const esTipoTexto = (req: Request) => {
  const ct = (req.headers.get("content-type") || "").toLowerCase();
  return !ct || ct.includes("application/json") || ct.startsWith("text/plain");
};
// ¿La petición trae un archivo o pide otro tipo que texto? (spec «Intenta subir un archivo»)
function esArchivo(req: Request, body: any): boolean {
  if (!esTipoTexto(req)) return true;
  if (!body || typeof body !== "object") return false;
  if (CLAVES_ARCHIVO.some((k) => k in body)) return true;
  if (body.tipo !== undefined && body.tipo !== "texto") return true;
  return false;
}

async function entregar(req: Request, id: string, p: PersonaMision, d: DepsMisiones, json: Json): Promise<Response> {
  if (p.tipo === "admin") return json({ error: "solo_alumnos", mensaje: "El profe evalúa en la bandeja; no entrega." }, 403);
  if (p.tipo === "baja") return json({ error: "baja_ingles" }, 403);
  if (p.tipo === "sin_acceso") return json({ error: "sin_acceso" }, 403);
  const ambito = ambitoDe(p);
  const { misiones } = await visiblesPara(d, p, ambito);
  const m = misiones.find((x) => x.id === id);
  if (!m) return json({ error: "not_found" }, 404); // ajena o futura: no revela que existe
  if (!esTipoTexto(req)) {
    await req.body?.cancel();
    return json({ error: "tipo_no_permitido", mensaje: "Por ahora las entregas son solo texto." }, 400);
  }
  let body: any;
  try { body = await req.json(); } catch { return json({ error: "entrega_invalida", motivo: "La entrega no se pudo leer." }, 400); }
  if (esArchivo(req, body)) return json({ error: "tipo_no_permitido", mensaje: "Por ahora las entregas son solo texto." }, 400);
  const paso = m.pasos.find((x) => x.id === body?.paso);
  if (!paso) return json({ error: "entrega_invalida", motivo: "Ese paso no existe en la misión." }, 400);
  if (typeof body?.texto !== "string") return json({ error: "entrega_invalida", motivo: "Escribe tu entrega en el cuadro de texto." }, 400);
  const textoLimpio = body.texto.replace(/\r\n/g, "\n").trim();
  if (!textoLimpio) return json({ error: "entrega_invalida", motivo: "La entrega está vacía." }, 400);
  if ([...textoLimpio].length > MAX_TEXTO) return json({ error: "entrega_invalida", motivo: `La entrega pasa de ${MAX_TEXTO} caracteres.` }, 400);
  if (d.puedeGuardar && !await d.puedeGuardar()) return json({ error: "sin_guardar", mensaje: "No se pudo guardar; inténtalo de nuevo." }, 503);
  return await conAlmacen(json, async () => {
    const ahora = d.ahora();
    const tarde = d.hoy() > paso.fechaLimite;
    const r = await modificarEntrega(d.store, m.id, p.slug, (e) => {
      const doc: Entrega = e ?? { mision: m.id, ambito, slug: p.slug, pasos: {}, evaluacion: null, historial: [] };
      const previo = doc.pasos[paso.id];
      if (doc.evaluacion && previo?.estado !== "correccion") return json({ error: "ya_evaluado", mensaje: "El profe ya evaluó esta misión." }, 409);
      if (doc.evaluacion && previo?.estado === "correccion") doc.evaluacion = null; // reabierta
      doc.pasos[paso.id] = { texto: textoLimpio, enviadoEn: ahora, tarde, estado: "entregado" };
      doc.historial.push({ accion: previo ? "reenvio" : "entrega", paso: paso.id, fecha: ahora });
      return doc;
    }, `entrega ${m.id}`);
    if (r instanceof Response) return r;
    const completos = m.pasos.filter((x) => r.pasos[x.id]?.estado === "entregado").length;
    return json({ ok: true, paso: paso.id, tarde, completos, totalPasos: m.pasos.length, entrega: entregaPublica(r) });
  });
}

// ---------- /profe/entregas (solo admin) ----------
// GET /profe/entregas → bandeja; POST /profe/entregas/<id>/<slug>/(evaluar|correccion|borrar);
// POST /profe/entregas/persona/<slug>/borrar.
export async function handleProfeEntregas(req: Request, subpath: string, d: DepsMisiones, json: Json): Promise<Response> {
  const p = await d.persona();
  if (p.tipo !== "admin") return json({ error: "solo_admin" }, 403);
  const partes = subpath.split("/").filter(Boolean);
  if (req.method === "GET" && partes.length === 0) return await bandeja(d, json);
  if (req.method !== "POST") return json({ error: "not_found" }, 404);
  let body: any = {};
  try { body = await req.json(); } catch { body = {}; }
  if (partes.length === 3 && partes[0] === "persona" && partes[2] === "borrar") return await borrarPersona(partes[1], d, json);
  if (partes.length !== 3) return json({ error: "not_found" }, 404);
  const [id, slug, accion] = partes;
  const encontrada = await buscarMision(d.store, id);
  if (!encontrada) return json({ error: "not_found" }, 404);
  if (accion === "evaluar") return await evaluar(encontrada.mision, slug, body, d, json);
  if (accion === "correccion") return await pedirCorreccion(encontrada.mision, slug, body, d, json);
  if (accion === "borrar") return await borrarEntrega(id, slug, d, json);
  return json({ error: "not_found" }, 404);
}

async function buscarMision(store: Store, id: string): Promise<{ mision: Mision; ambito: string } | null> {
  for (const ambito of Object.keys(AMBITOS_MISION)) {
    const m = (await misionesDe(store, ambito)).find((x) => x.id === id);
    if (m) return { mision: m, ambito };
  }
  return null;
}

// Completa = todos sus pasos entregados y con texto (si se borró el contenido antes de evaluar, no se puede evaluar).
const completa = (m: Mision, e: Entrega) => m.pasos.every((x) => e.pasos[x.id]?.estado === "entregado" && e.pasos[x.id]?.texto !== null);
function estadoEntrega(m: Mision, e: Entrega): "evaluada" | "lista" | "correccion" | "en-progreso" {
  if (e.evaluacion) return "evaluada";
  if (completa(m, e)) return "lista";
  if (Object.values(e.pasos).some((x) => x.estado === "correccion")) return "correccion";
  return "en-progreso";
}

async function bandeja(d: DepsMisiones, json: Json): Promise<Response> {
  const filas: any[] = [];
  for (const ambito of Object.keys(AMBITOS_MISION)) {
    for (const m of await misionesDe(d.store, ambito)) {
      const docs = await leerCarpeta<Entrega>(d.store, `entregas/${m.id}`);
      for (const { data: e } of docs) {
        if (!e?.slug || e.ambito !== ambito) continue;
        const fechas = Object.values(e.pasos).map((x) => x.enviadoEn).sort();
        const estado = estadoEntrega(m, e);
        filas.push({
          mision: { id: m.id, titulo: m.titulo, materia: m.materia, ambito, pasos: m.pasos.map((x) => ({ id: x.id, titulo: x.titulo, fechaLimite: x.fechaLimite })), rubrica: m.rubrica },
          slug: e.slug, nombre: await d.nombreDe(e.slug, ambito), estado,
          // Antigüedad: desde que quedó lista (último paso) o, si no, desde su primer paso.
          desde: estado === "lista" ? fechas.at(-1) : fechas[0] ?? null,
          pasos: e.pasos, evaluacion: e.evaluacion, historial: e.historial, xp: G.xpDeMision({ evaluacion: e.evaluacion }),
        });
      }
    }
  }
  const orden: Record<string, number> = { lista: 0, correccion: 1, "en-progreso": 2, evaluada: 3 };
  filas.sort((a, b) => orden[a.estado] - orden[b.estado] || (a.estado === "evaluada" ? String(b.evaluacion.fecha).localeCompare(String(a.evaluacion.fecha)) : String(a.desde).localeCompare(String(b.desde))));
  return json({ entregas: filas, pendientes: filas.filter((f) => f.estado === "lista").length });
}

async function evaluar(m: Mision, slug: string, body: any, d: DepsMisiones, json: Json): Promise<Response> {
  const puntos = body?.puntos;
  if (!puntos || typeof puntos !== "object") return json({ error: "rubrica_invalida", motivo: "Elige un nivel en cada criterio." }, 400);
  const elegidos: Record<string, number> = {};
  for (const c of m.rubrica) {
    const v = Number(puntos[c.id]);
    if (!c.niveles.some((n) => Number(n.puntos) === v)) return json({ error: "rubrica_invalida", motivo: `El criterio «${c.criterio}» no tiene un nivel de ${puntos[c.id]} puntos.` }, 400);
    elegidos[c.id] = v;
  }
  const comentario = typeof body?.comentario === "string" ? body.comentario.trim() : "";
  if ([...comentario].length > MAX_COMENTARIO) return json({ error: "comentario_largo", motivo: `El comentario pasa de ${MAX_COMENTARIO} caracteres.` }, 400);
  return await conAlmacen(json, async () => {
    const ahora = d.ahora();
    const r = await modificarEntrega(d.store, m.id, slug, (e) => {
      if (!e) return json({ error: "not_found" }, 404);
      if (!completa(m, e)) return json({ error: "incompleta", mensaje: "Faltan pasos por entregar." }, 409);
      const ultimo = m.pasos[m.pasos.length - 1];
      const porcentaje = Object.values(elegidos).reduce((a, b) => a + b, 0);
      const aTiempo = !e.pasos[ultimo.id].tarde;
      e.evaluacion = { puntos: elegidos, porcentaje, aTiempo, xp: G.xpDeMision({ porcentaje, aTiempo }), comentario, fecha: ahora };
      e.historial.push({ accion: "evaluacion", fecha: ahora });
      return e;
    }, `evaluación ${m.id}`);
    if (r instanceof Response) return r;
    return json({ ok: true, evaluacion: r.evaluacion });
  });
}

async function pedirCorreccion(m: Mision, slug: string, body: any, d: DepsMisiones, json: Json): Promise<Response> {
  const pasos: string[] = Array.isArray(body?.pasos) ? body.pasos.map(String) : [];
  const motivo = typeof body?.motivo === "string" ? body.motivo.trim() : "";
  if (!pasos.length || pasos.some((x) => !m.pasos.some((y) => y.id === x))) return json({ error: "correccion_invalida", motivo: "Elige los pasos que hay que corregir." }, 400);
  if (!motivo || [...motivo].length > MAX_MOTIVO) return json({ error: "correccion_invalida", motivo: `Escribe el motivo (hasta ${MAX_MOTIVO} caracteres).` }, 400);
  const privacidad = body?.privacidad === true;
  return await conAlmacen(json, async () => {
    const ahora = d.ahora();
    const r = await modificarEntrega(d.store, m.id, slug, (e) => {
      if (!e) return json({ error: "not_found" }, 404);
      if (pasos.some((x) => !e.pasos[x])) return json({ error: "correccion_invalida", motivo: "Ese paso aún no se entrega." }, 400);
      for (const x of pasos) {
        const paso = e.pasos[x];
        paso.estado = "correccion";
        paso.correccion = { motivo, privacidad, fecha: ahora };
        if (privacidad) { paso.texto = null; paso.borrado = ahora; } // el texto se borra en ese momento
        e.historial.push({ accion: privacidad ? "correccion-privacidad" : "correccion", paso: x, fecha: ahora });
      }
      e.evaluacion = null; // se vuelve a evaluar cuando se reenvíe
      return e;
    }, `corrección ${m.id}`);
    if (r instanceof Response) return r;
    return json({ ok: true, pasos: r.pasos });
  });
}

// Borra el texto de todos los pasos y conserva la evaluación (puntos y fecha): la XP no cambia.
export function sinContenido(e: Entrega, ahora: string, accion = "borrado"): Entrega {
  for (const paso of Object.values(e.pasos)) if (paso.texto !== null) { paso.texto = null; paso.borrado = ahora; }
  e.historial.push({ accion, fecha: ahora });
  return e;
}

async function borrarEntrega(id: string, slug: string, d: DepsMisiones, json: Json): Promise<Response> {
  return await conAlmacen(json, async () => {
    const r = await modificarEntrega(d.store, id, slug, (e) => (e ? sinContenido(e, d.ahora()) : json({ error: "not_found" }, 404)), `borrado ${id}`);
    if (r instanceof Response) return r;
    return json({ ok: true, evaluacion: r.evaluacion });
  });
}

async function borrarPersona(slug: string, d: DepsMisiones, json: Json): Promise<Response> {
  return await conAlmacen(json, async () => {
    let n = 0;
    // Todas sus entregas, también las de misiones que ya no están en el repo de datos (spec «Borrado a petición»).
    const ids = new Set<string>();
    for (const ambito of Object.keys(AMBITOS_MISION)) for (const m of await misionesDe(d.store, ambito)) ids.add(m.id);
    for (const ruta of await rutasBajo(d.store, "entregas/")) {
      const partes = ruta.split("/");
      if (partes.length === 3 && partes[2] === `${slug}.json`) ids.add(partes[1]);
    }
    for (const id of ids) {
      if (!await leerEntrega(d.store, id, slug)) continue;
      const r = await modificarEntrega(d.store, id, slug, (e) => (e ? sinContenido(e, d.ahora()) : json({ error: "not_found" }, 404)), `borrado ${id}`);
      if (!(r instanceof Response)) n++;
    }
    return json({ ok: true, entregas: n });
  });
}

// ---------- /practica/comprobar ----------
// { itemId, practicaId, respuesta } (clase de Secundaria) o { misionId, practicaId, respuesta } (teoría de la misión).
export async function handlePractica(req: Request, d: DepsMisiones, json: Json): Promise<Response> {
  if (req.method !== "POST") return json({ error: "not_found" }, 404);
  const p = await d.persona();
  if (p.tipo === "sin_acceso" || p.tipo === "baja") return json({ error: p.tipo === "baja" ? "baja_ingles" : "sin_acceso" }, 403);
  let body: any;
  try { body = await req.json(); } catch { return json({ error: "peticion_invalida" }, 400); }
  const practicaId = typeof body?.practicaId === "string" ? body.practicaId : "";
  if (!practicaId || body?.respuesta === undefined) return json({ error: "peticion_invalida" }, 400);
  let teoria: unknown[] | undefined;
  if (typeof body.misionId === "string") {
    if (p.tipo === "admin") teoria = (await buscarMision(d.store, body.misionId))?.mision.teoria;
    else teoria = (await visiblesPara(d, p, ambitoDe(p))).misiones.find((m) => m.id === body.misionId)?.teoria;
  } else if (typeof body.itemId === "string") {
    if (p.tipo === "admin") teoria = (await loadItem(d.store, body.itemId, AMBITO_SECUNDARIA))?.teoria;
    else if (p.tipo === "secundaria") {
      const hoy = d.hoy();
      const it = (await visibleItems(d.store, hoy, AMBITO_SECUNDARIA)).items.find((x) => x.id === body.itemId);
      teoria = it && esPara(it, p.slug) && it.disponibleDesde <= hoy ? it.teoria : undefined;
    }
  }
  const practica = buscarPractica(teoria, practicaId);
  if (!practica) return json({ error: "not_found" }, 404);
  return json(comprobar(practica, body.respuesta));
}
