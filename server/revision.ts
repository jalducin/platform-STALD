// Revisión de la semana de una alumna por el profe (openspec: revision-profe). Solo admin:
//   GET /profe/revision?alumna=<slug>&semana=<AAAA-MM-DD> → clases de esa semana (lunes a domingo) con su avance en línea
//       (resultados/, borradores/) y la revisión del profe; `abiertas`: las de otro día abiertas esa semana.
//   PUT /profe/revision { alumna, id, checks, audio, libro, calificacion, comentario } → guarda la revisión de una clase
//       en revisiones/<slug>/<id>.json (Postgres, stald_docs). Vacía → se borra.
// La alumna solo ve calificación y comentario, dentro de GET /secundaria/actividades (server/actividades.ts).
// Fórmula de la final y validación de la calificación: comun/revision-datos.js (un solo lugar).
import "../comun/gamificacion.js";
import "../comun/revision-datos.js";
import { AMBITO_SECUNDARIA, todosLosElementos } from "./actividades.ts";
import { leerCarpeta } from "./db.ts";
import { esPara, type Item, maxIntentos, paraAlumno, type Resultado, tieneReto } from "./motor.ts";
import type { Store } from "./store.ts";

type Json = (body: unknown, status?: number) => Response;
// deno-lint-ignore no-explicit-any
const G = (globalThis as any).Gamificacion;
// deno-lint-ignore no-explicit-any
const RD = (globalThis as any).RevisionDatos;

export interface Revision { checks: number[]; audio: boolean; libro: boolean; calificacion: number | null; comentario: string; revisadoEn: string }
export interface DepsRevision {
  email: string;
  verificado: boolean; // correo de una sesión verificada (no `?email=` de la transición)
  admin: string;
  store: Store;
  hoy: () => string;
  ahora: () => string;
  alumnas: () => Promise<{ slug: string; nombre: string }[]>;
  // Las revisiones viven en Postgres; sin la base migrada no se escriben en el repo de contenido.
  puedeGuardar: () => Promise<boolean>;
}

export const rutaRevision = (slug: string, id: string) => `revisiones/${slug}/${id}.json`;

// Qué revisa el profe en cada clase: tareas de libreta (tips `libreta`), audio y libro de ortografía. Las tareas de
// audio y de libro salen del checklist: tienen su propia casilla.
const ES_AUDIO = /🎙|\baudio\b/iu;
const ES_LIBRO = /libro de ortograf/iu;
export function pideDeClase(it: { tips?: unknown[]; materia?: string; titulo?: string }) {
  const tareas = ((it.tips || []) as { tipo?: string; texto?: string }[]).filter((t) => t.tipo === "libreta" && typeof t.texto === "string" && t.texto.trim()).map((t) => t.texto!.trim());
  const audio = tareas.some((t) => ES_AUDIO.test(t));
  const libroTip = tareas.some((t) => ES_LIBRO.test(t));
  const espanol = G.materiaDe(it)?.clave === "espanol";
  return { libreta: tareas.filter((t) => !ES_AUDIO.test(t) && !ES_LIBRO.test(t)), audio, libro: libroTip || espanol };
}

// ---------- Fechas ----------
const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const lunesDe = (f: string) => G.sumarDias(f, -((new Date(f + "T12:00:00Z").getUTCDay() + 6) % 7));

// ---------- Lectura de la semana ----------
interface Borrador { intento: number; respuestas: Record<string, unknown>; actualizado: string }

async function leerOAvisar<T>(fn: () => Promise<T>, aviso: string, avisos: Set<string>, porOmision: T): Promise<T> {
  try { return await fn(); } catch (e) {
    console.error(`revisión (${aviso}):`, e instanceof Error ? e.message : e);
    avisos.add(aviso);
    return porOmision;
  }
}

async function clasesDe(store: Store, slug: string, hoy: string, it: Item, revisiones: Map<string, Revision>, avisos: Set<string>) {
  const conReto = tieneReto(it);
  const [res, bor] = await Promise.all([
    conReto ? leerOAvisar(async () => (await store.get<Resultado>(`resultados/${it.id}/${slug}.json`))?.data ?? null, "resultados", avisos, null) : null,
    conReto ? leerOAvisar(async () => (await store.get<Borrador>(`borradores/${it.id}/${slug}.json`))?.data ?? null, "borradores", avisos, null) : null,
  ]);
  const usados = res?.intentos.length || 0;
  const mejor = res?.mejor ? res.intentos.find((i) => i.n === res.mejor!.n) : null;
  const total = conReto ? (it.preguntasPorIntento || (it.banco || []).length) : 0;
  const borrador = bor ? { respondidas: Object.keys(bor.respuestas || {}).length, total, actualizado: bor.actualizado } : null;
  const estado = usados > 0 ? "enviada" : borrador ? "borrador" : "sin-abrir";
  return {
    id: it.id, tipo: it.tipo, titulo: it.titulo, ...(it.materia ? { materia: it.materia } : {}), dia: G.diaDeClase(it) as string,
    disponibleDesde: it.disponibleDesde, fechaLimite: it.fechaLimite, preguntas: total, intentosMax: conReto ? maxIntentos(it) : 0,
    intentosUsados: usados, mejor: res?.mejor ? { porcentaje: res.mejor.porcentaje } : null, fueraDeTiempo: mejor ? !!mejor.fueraDeTiempo : null,
    estado, ...(estado === "sin-abrir" && it.disponibleDesde > hoy ? { abre: it.disponibleDesde } : {}), borrador,
    pide: pideDeClase(it), revision: revisiones.get(it.id) ?? null,
  };
}

async function verSemana(url: URL, deps: DepsRevision, json: Json): Promise<Response> {
  const slug = url.searchParams.get("alumna") || "";
  const alumna = (await deps.alumnas()).find((a) => a.slug === slug);
  if (!alumna) return json({ error: "alumna_no_encontrada" }, 404);
  const hoy = url.searchParams.get("hoy") && Deno.env.get("PERMITIR_HOY") === "1" ? url.searchParams.get("hoy")! : deps.hoy();
  const pedida = url.searchParams.get("semana") || hoy;
  if (!FECHA.test(pedida) || Number.isNaN(Date.parse(pedida))) return json({ error: "semana_invalida" }, 400);
  const lunes = lunesDe(pedida), domingo = G.sumarDias(lunes, 6);
  const avisos = new Set<string>();
  const [todos, docs] = await Promise.all([
    todosLosElementos(deps.store, AMBITO_SECUNDARIA),
    leerOAvisar(() => leerCarpeta<Revision>(deps.store, `revisiones/${slug}`), "revisiones", avisos, []),
  ]);
  const revisiones = new Map(docs.filter((d) => d.nombre.endsWith(".json")).map((d) => [d.nombre.slice(0, -5), d.data]));
  const suyos = todos.filter((it) => esPara(it, slug)).map((it) => paraAlumno(it, slug));
  const enSemana = (f: string) => f >= lunes && f <= domingo;
  const delDia = suyos.filter((it) => enSemana(G.diaDeClase(it)));
  const abiertas = suyos.filter((it) => !enSemana(G.diaDeClase(it)) && it.disponibleDesde <= domingo && it.fechaLimite >= lunes);
  const armar = (lista: Item[]) => Promise.all(lista.map((it) => clasesDe(deps.store, slug, hoy, it, revisiones, avisos)));
  const orden = (a: { dia: string; id: string }, b: { dia: string; id: string }) => a.dia.localeCompare(b.dia) || a.id.localeCompare(b.id);
  const [clases, abiertasArm] = await Promise.all([armar(delDia), armar(abiertas)]);
  return json({
    alumna, hoy,
    semana: { lunes, domingo, anterior: G.sumarDias(lunes, -7), siguiente: G.sumarDias(lunes, 7), dias: Array.from({ length: 7 }, (_, i) => G.sumarDias(lunes, i)) },
    clases: clases.sort(orden), abiertas: abiertasArm.sort(orden),
    ...(avisos.size ? { avisos: [...avisos].sort() } : {}),
  });
}

// ---------- Guardar ----------
type Validada = { ok: true; revision: Omit<Revision, "revisadoEn"> } | { ok: false; error: string };
function validar(body: Record<string, unknown>, pide: ReturnType<typeof pideDeClase>): Validada {
  const cal = body.calificacion ?? null;
  if (cal !== null && !RD.calificacionValida(cal)) return { ok: false, error: "calificacion_invalida" };
  const com = body.comentario ?? "";
  if (typeof com !== "string" || com.trim().length > RD.MAX_COMENTARIO) return { ok: false, error: "comentario_invalido" };
  const checks = body.checks ?? [];
  if (!Array.isArray(checks) || checks.some((c) => !Number.isInteger(c) || c < 0 || c >= pide.libreta.length) || new Set(checks).size !== checks.length) {
    return { ok: false, error: "checks_invalidos" };
  }
  return {
    ok: true,
    revision: {
      checks: [...checks as number[]].sort((a, b) => a - b), audio: pide.audio && body.audio === true, libro: pide.libro && body.libro === true,
      calificacion: cal as number | null, comentario: com.trim(),
    },
  };
}
const vacia = (r: Omit<Revision, "revisadoEn">) => !r.checks.length && !r.audio && !r.libro && r.calificacion === null && !r.comentario;

async function guardar(req: Request, deps: DepsRevision, json: Json): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("no es objeto");
  } catch { return json({ error: "json_invalido" }, 400); }
  const slug = String(body.alumna ?? "");
  if (!(await deps.alumnas()).some((a) => a.slug === slug)) return json({ error: "alumna_no_encontrada" }, 404);
  const it = (await todosLosElementos(deps.store, AMBITO_SECUNDARIA)).find((x) => x.id === String(body.id ?? ""));
  if (!it || !esPara(it, slug)) return json({ error: "no_encontrado" }, 404);
  const v = validar(body, pideDeClase(it));
  if (!v.ok) return json({ error: v.error }, 400);
  if (!await deps.puedeGuardar()) return json({ error: "sin_base" }, 503);
  const ruta = rutaRevision(slug, it.id);
  if (vacia(v.revision)) {
    if (await deps.store.get(ruta)) await deps.store.remove(ruta, `revisión vacía de ${it.id} (${slug})`);
    return json({ guardado: true, vacia: true, revision: null });
  }
  const revision: Revision = { ...v.revision, revisadoEn: deps.ahora() };
  for (let i = 0; i < 3; i++) {
    const actual = await deps.store.get<Revision>(ruta);
    if (await deps.store.put(ruta, revision, actual?.sha ?? null, `revisión de ${it.id} (${slug})`)) return json({ guardado: true, revision });
  }
  return json({ error: "conflicto_escritura" }, 503);
}

export async function handleRevision(req: Request, deps: DepsRevision, json: Json): Promise<Response> {
  // Sin sesión verificada (p. ej. `?email=` o nada durante la transición del login): 401, como /auth/enlace.
  if (!deps.verificado) return json({ error: "inicia_sesion" }, 401);
  if (!deps.admin || (deps.email || "").trim().toLowerCase() !== deps.admin) return json({ error: "solo_admin" }, 403);
  if (req.method === "GET") return await verSemana(new URL(req.url), deps, json);
  if (req.method === "PUT") return await guardar(req, deps, json);
  return json({ error: "metodo_no_permitido" }, 405);
}
