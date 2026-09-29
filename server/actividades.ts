// Rutas /ingles/actividades[/<id>[/resultados/<alumno>]] sobre el almacén JSON.
import {
  addIntento,
  type Ejercicio,
  estadoItem,
  grade,
  type Intento,
  type Item,
  maxIntentos,
  mxToday,
  normalizeItem,
  publicQuestion,
  type Resultado,
  sanitizeRespuestas,
  selectQuestions,
  slugAlumno,
  temasAReforzar,
  temasRefuerzo,
} from "./motor.ts";
import type { Store } from "./store.ts";

type Json = (body: unknown, status?: number) => Response;

export interface Identidad {
  isAdmin: boolean;
  alumno: string | null;
}

const CACHE_MS = 60_000;
const cache = new Map<string, { t: number; v: unknown }>();

async function cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const c = cache.get(key);
  if (c && Date.now() - c.t < CACHE_MS) return c.v as T;
  const v = await fn();
  cache.set(key, { t: Date.now(), v });
  return v;
}

export function clearCache() {
  cache.clear();
}

async function loadRaw(store: Store, id: string): Promise<Item | null> {
  return await cached(`item:${id}`, async () => {
    const doc = (await store.get(`contenido/actividades/${id}.json`)) || (await store.get(`contenido/examenes/${id}.json`));
    return doc ? normalizeItem(doc.data) : null;
  });
}

// El refuerzo arma su banco con los bancos de otras actividades.
export async function loadItem(store: Store, id: string): Promise<Item | null> {
  const it = await loadRaw(store, id);
  if (!it || !it.bancoDe?.length) return it;
  const bancos = await Promise.all(it.bancoDe.map((b) => loadRaw(store, b)));
  const vistos = new Set<string>();
  const banco: Ejercicio[] = [];
  for (const b of bancos) for (const e of b?.banco || []) if (!vistos.has(e.id)) { vistos.add(e.id); banco.push(e); }
  return { ...it, banco: [...(it.banco || []), ...banco] };
}

interface Semana { id: string; titulo: string; elementos: { id: string; tipo: string; fecha: string }[] }

// Elementos visibles: los de semanas ya iniciadas + exámenes sueltos (p. ej. el diagnóstico).
export async function visibleItems(store: Store, hoy: string): Promise<{ items: Item[]; semanaActual: Semana | null }> {
  return await cached(`visibles:${hoy}`, async () => {
    const nombres = (await store.list("contenido/semanas")).filter((n) => n.endsWith(".json")).map((n) => n.slice(0, -5)).sort();
    const iniciadas = nombres.filter((id) => id <= hoy);
    const semanas = (await Promise.all(iniciadas.map((id) => store.get<Semana>(`contenido/semanas/${id}.json`)))).map((d) => d!.data);
    const enSemana = new Set(semanas.flatMap((s) => s.elementos.map((e) => e.id)));
    const sueltos = (await store.list("contenido/examenes")).map((n) => n.replace(/\.json$/, "")).filter((id) => !enSemana.has(id));
    const ids = [...semanas.flatMap((s) => s.elementos.map((e) => e.id)), ...sueltos];
    const items = (await Promise.all(ids.map((id) => loadItem(store, id)))).filter((x): x is Item => !!x);
    items.sort((a, b) => a.fechaLimite.localeCompare(b.fechaLimite));
    return { items, semanaActual: semanas[semanas.length - 1] || null };
  });
}

const rutaResultado = (id: string, slug: string) => `resultados/${id}/${slug}.json`;

async function leerResultado(store: Store, id: string, slug: string) {
  return await store.get<Resultado>(rutaResultado(id, slug));
}

async function resultadosDe(store: Store, id: string): Promise<Resultado[]> {
  const nombres = (await store.list(`resultados/${id}`)).filter((n) => n.endsWith(".json") && !n.startsWith("_"));
  return (await Promise.all(nombres.map((n) => store.get<Resultado>(`resultados/${id}/${n}`)))).map((d) => d!.data);
}

function meta(it: Item) {
  return {
    id: it.id, tipo: it.tipo, titulo: it.titulo, nivel: it.nivel, descripcion: it.descripcion,
    disponibleDesde: it.disponibleDesde, fechaLimite: it.fechaLimite,
    intentosMax: it.tipo === "meet" ? 0 : maxIntentos(it),
    preguntas: it.tipo === "meet" ? 0 : (it.preguntasPorIntento || (it.banco || []).length),
    meetUrl: it.meetUrl ?? null, hora: it.hora ?? null,
  };
}

// Preguntas del intento n para un alumno (o para el admin en vista previa).
async function preguntasPara(store: Store, it: Item, alumno: string | null, n: number) {
  const slug = alumno ? slugAlumno(alumno) : "admin";
  let temas: string[] | undefined;
  if (it.tipo === "refuerzo" && alumno) {
    const base = it.basadoEn ? (await leerResultado(store, it.basadoEn, slug))?.data ?? null : null;
    const resp = it.respaldo ? (await leerResultado(store, it.respaldo, slug))?.data ?? null : null;
    temas = temasRefuerzo(it, base, resp);
  }
  return { preguntas: selectQuestions(it.banco || [], it, slug, n, temas), enfoque: temas || [] };
}

export async function handleActividades(req: Request, subpath: string, quien: Identidad, store: Store, json: Json): Promise<Response> {
  if (!quien.isAdmin && !quien.alumno) return json({ error: "sin_acceso" }, 403);
  const url = new URL(req.url);
  const hoy = url.searchParams.get("hoy") && Deno.env.get("PERMITIR_HOY") === "1" ? url.searchParams.get("hoy")! : mxToday();
  const partes = subpath.split("/").filter(Boolean).map(decodeURIComponent);
  const slug = quien.alumno ? slugAlumno(quien.alumno) : null;

  // GET /ingles/actividades → elementos con estado (alumno) o con resultados y resumen (admin)
  if (partes.length === 0 && req.method === "GET") {
    const { items, semanaActual } = await visibleItems(store, hoy);
    const semana = semanaActual ? { id: semanaActual.id, titulo: semanaActual.titulo, ids: semanaActual.elementos.map((e) => e.id) } : null;
    if (quien.isAdmin) {
      const conRes = await Promise.all(items.map(async (it) => ({ ...meta(it), resultados: it.tipo === "meet" ? [] : await resultadosDe(store, it.id) })));
      const porAlumno = new Map<string, Resultado[]>();
      for (const it of conRes) for (const r of it.resultados) { if (!porAlumno.has(r.alumno)) porAlumno.set(r.alumno, []); porAlumno.get(r.alumno)!.push(r); }
      const resumen = Object.fromEntries([...porAlumno].map(([a, rs]) => [a, { temasAReforzar: temasAReforzar(rs) }]));
      return json({ isAdmin: true, hoy, semana, items: conRes, resumen });
    }
    const conEstado = await Promise.all(items.map(async (it) => {
      const r = it.tipo === "meet" ? null : (await leerResultado(store, it.id, slug!))?.data ?? null;
      return { ...meta(it), estado: estadoItem(it, hoy, r), intentosUsados: r?.intentos.length || 0, mejor: r?.mejor ?? null, ultimoEnvio: r?.intentos.at(-1)?.enviadoEn ?? null };
    }));
    return json({ isAdmin: false, hoy, semana, items: conEstado });
  }

  const it = await loadItem(store, partes[0]);
  if (!it) return json({ error: "no_encontrado" }, 404);
  if (it.tipo === "meet") return json({ error: "no_aplica" }, 400);

  // DELETE /ingles/actividades/<id>/resultados/<alumno> → reiniciar (solo admin)
  if (req.method === "DELETE" && partes[1] === "resultados" && partes[2]) {
    if (!quien.isAdmin) return json({ error: "solo_admin" }, 403);
    await store.remove(rutaResultado(it.id, slugAlumno(partes[2])), `Reinicio de ${it.id} para ${partes[2]}`);
    return json({ borrado: true });
  }
  if (partes.length !== 1) return json({ error: "not_found" }, 404);

  // Intento que toca: alumno = usados + 1; admin = ?intento (vista previa) como ?alumno o como "admin".
  const alumnoVista = quien.isAdmin ? url.searchParams.get("alumno") : quien.alumno;
  const doc = slug ? await leerResultado(store, it.id, slug) : null;
  const usados = doc?.data.intentos.length || 0;
  const n = quien.isAdmin ? Math.max(1, Number(url.searchParams.get("intento")) || 1) : usados + 1;

  if (!quien.isAdmin) {
    const estado = estadoItem(it, hoy, doc?.data ?? null);
    if (estado === "proximamente") return json({ error: "no_disponible", disponibleDesde: it.disponibleDesde }, 403);
    if (estado === "completo") return json({ error: "sin_intentos", resultado: doc!.data }, 409);
  }

  const { preguntas, enfoque } = await preguntasPara(store, it, alumnoVista, n);

  if (req.method === "GET") {
    const titulos = new Map((it.temas || []).map((t) => [t.id, t.titulo]));
    return json({
      ...meta(it), teoria: it.teoria || [], tips: it.tips || [],
      temas: (it.temas || []).map((t) => ({ id: t.id, titulo: t.titulo })),
      enfoque: enfoque.map((t) => titulos.get(t) || t),
      intento: n, intentosUsados: usados, vistaPrevia: quien.isAdmin,
      preguntas: preguntas.map(publicQuestion),
    });
  }

  if (req.method === "POST") {
    let body: { intento?: number; respuestas?: unknown } = {};
    try { body = await req.json(); } catch { return json({ error: "json_invalido" }, 400); }
    if (!quien.isAdmin && body.intento !== n) return json({ error: "intento_invalido", esperado: n }, 409);
    const respuestas = sanitizeRespuestas(preguntas, body.respuestas);
    const calificacion = grade(it, preguntas, respuestas);
    if (quien.isAdmin) return json({ guardado: false, intento: n, intentosMax: maxIntentos(it), calificacion });

    const intento: Intento = { n, enviadoEn: new Date().toISOString(), fueraDeTiempo: hoy > it.fechaLimite, preguntas: preguntas.map((p) => p.id), respuestas, calificacion };
    for (let i = 0; i < 3; i++) {
      const actual = await leerResultado(store, it.id, slug!);
      if ((actual?.data.intentos.length || 0) !== n - 1) return json({ error: "intento_invalido", esperado: (actual?.data.intentos.length || 0) + 1 }, 409);
      const nuevo = addIntento(actual?.data ?? null, it, quien.alumno!, intento);
      const ok = await store.put(rutaResultado(it.id, slug!), nuevo, actual?.sha ?? null, `${it.id}: intento ${n} de ${quien.alumno}`);
      if (ok) return json({ guardado: true, intento: n, intentosMax: maxIntentos(it), restantes: maxIntentos(it) - n, calificacion, mejor: nuevo.mejor });
    }
    return json({ error: "conflicto_escritura" }, 503);
  }

  return json({ error: "metodo_no_permitido" }, 405);
}
