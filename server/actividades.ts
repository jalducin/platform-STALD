// Rutas /ingles/actividades[/<id>[/resultados/<alumno>]] sobre el almacén JSON.
import {
  addIntento,
  type Ejercicio,
  estadoItem,
  fueraDeTiempoDe,
  grade,
  type Intento,
  type Item,
  maxIntentos,
  correccionDe,
  paraAlumno,
  mxToday,
  normalizeItem,
  publicQuestion,
  type Resultado,
  sanitizeRespuestas,
  selectQuestions,
  slugAlumno,
  temasAReforzar,
  temasRefuerzo,
  tieneReto,
} from "./motor.ts";
import type { Store } from "./store.ts";

type Json = (body: unknown, status?: number) => Response;

export interface Identidad {
  isAdmin: boolean;
  alumno: string | null;
  inicio?: string; // lunes de inicio de un alta nueva (openspec: inicio-lunes-alumnos)
  grupo?: string; // grupo vigente (openspec: ingles-grupos); sin base de datos no se filtra
  grupoInfo?: { id: string; nombre: string; nivel: string | null; horario: string | null; meet_url: string | null; color: string } | null;
}

// Ámbito de contenido: el del grupo (contenido/) o la ruta de estudio del profe (contenido/profe/, openspec: ruta-profe).
export interface Ambito {
  contenido: string;
  clave: string;
}
export const AMBITO_CLASE: Ambito = { contenido: "contenido", clave: "clase" };
export const AMBITO_PROFE: Ambito = { contenido: "contenido/profe", clave: "profe" };

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

async function loadRaw(store: Store, id: string, ambito: Ambito): Promise<Item | null> {
  return await cached(`${ambito.clave}:item:${id}`, async () => {
    const doc = (await store.get(`${ambito.contenido}/actividades/${id}.json`)) || (await store.get(`${ambito.contenido}/examenes/${id}.json`));
    return doc ? normalizeItem(doc.data) : null;
  });
}

// El refuerzo arma su banco con los bancos de otras actividades.
export async function loadItem(store: Store, id: string, ambito: Ambito = AMBITO_CLASE): Promise<Item | null> {
  const it = await loadRaw(store, id, ambito);
  if (!it || !it.bancoDe?.length) return it;
  const bancos = await Promise.all(it.bancoDe.map((b) => loadRaw(store, b, ambito)));
  const vistos = new Set<string>();
  const banco: Ejercicio[] = [];
  for (const b of bancos) for (const e of b?.banco || []) if (!vistos.has(e.id)) { vistos.add(e.id); banco.push(e); }
  return { ...it, banco: [...(it.banco || []), ...banco] };
}

interface Semana { id: string; titulo: string; grupos?: string[]; elementos: { id: string; tipo: string; fecha: string }[] }
// Grupos a los que aplica cada elemento (de su semana; openspec: ingles-grupos). Sin grupos = todos.
type ConGrupos = Item & { grupos?: string[] };

// Elementos visibles: los de semanas ya iniciadas + exámenes sueltos (p. ej. el diagnóstico).
// Suelto = ninguna semana lo referencia, aunque no haya iniciado (las semanas se suben por adelantado).
export async function visibleItems(store: Store, hoy: string, ambito: Ambito = AMBITO_CLASE): Promise<{ items: ConGrupos[]; semanaActual: Semana | null }> {
  return await cached(`${ambito.clave}:visibles:${hoy}`, async () => {
    const nombres = (await store.list(`${ambito.contenido}/semanas`)).filter((n) => n.endsWith(".json")).map((n) => n.slice(0, -5)).sort();
    const todas = (await Promise.all(nombres.map((id) => store.get<Semana>(`${ambito.contenido}/semanas/${id}.json`)))).map((d) => d!.data);
    const semanas = todas.filter((_s, i) => nombres[i] <= hoy);
    const enSemana = new Set(todas.flatMap((s) => s.elementos.map((e) => e.id)));
    const sueltos = (await store.list(`${ambito.contenido}/examenes`)).map((n) => n.replace(/\.json$/, "")).filter((id) => !enSemana.has(id));
    const ids = [...semanas.flatMap((s) => s.elementos.map((e) => e.id)), ...sueltos];
    const gruposDe = new Map(todas.flatMap((s) => s.grupos?.length ? s.elementos.map((e) => [e.id, s.grupos!] as const) : []));
    const items: ConGrupos[] = (await Promise.all(ids.map((id) => loadItem(store, id, ambito)))).filter((x): x is Item => !!x)
      .map((it) => gruposDe.has(it.id) ? { ...it, grupos: gruposDe.get(it.id) } : it);
    items.sort((a, b) => a.fechaLimite.localeCompare(b.fechaLimite));
    return { items, semanaActual: semanas[semanas.length - 1] || null };
  });
}

// Elementos del grupo en la ruta del profe (openspec: profe-actividades-grupo): actividades, exámenes y refuerzos de
// todas las semanas subidas y los exámenes sueltos. El profe los resuelve antes: abren ya y vencen un día antes de
// que se abran al grupo.
const TIPOS_GRUPO = new Set(["actividad", "examen", "refuerzo"]);
function diaAnterior(fecha: string): string {
  const d = new Date(`${fecha}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}
export function paraProfe(it: Item): Item {
  const { segundaOportunidad: _s, ...resto } = it; // el profe no espera la 2.ª oportunidad
  return { ...resto, disponibleDesde: "2000-01-01", fechaLimite: diaAnterior(it.disponibleDesde) };
}
async function itemsDelGrupo(store: Store): Promise<Item[]> {
  return await cached("clase:grupo-profe", async () => {
    const nombres = (await store.list("contenido/semanas")).filter((n) => n.endsWith(".json"));
    const semanas = (await Promise.all(nombres.map((n) => store.get<Semana>(`contenido/semanas/${n}`)))).map((d) => d!.data);
    const enSemana = new Set(semanas.flatMap((s) => s.elementos.map((e) => e.id)));
    const sueltos = (await store.list("contenido/examenes")).map((n) => n.replace(/\.json$/, "")).filter((id) => !enSemana.has(id));
    const ids = [...semanas.flatMap((s) => s.elementos.filter((e) => TIPOS_GRUPO.has(e.tipo)).map((e) => e.id)), ...sueltos];
    return (await Promise.all(ids.map((id) => loadItem(store, id)))).filter((x): x is Item => !!x && TIPOS_GRUPO.has(x.tipo));
  });
}

const rutaResultado = (id: string, slug: string) => `resultados/${id}/${slug}.json`;
const ARCHIVO_PROFE = "profe.json"; // intentos del profe en elementos del grupo: nunca cuentan como alumno

async function leerResultado(store: Store, id: string, slug: string) {
  return await store.get<Resultado>(rutaResultado(id, slug));
}

async function resultadosDe(store: Store, id: string): Promise<Resultado[]> {
  const nombres = (await store.list(`resultados/${id}`)).filter((n) => n.endsWith(".json") && !n.startsWith("_") && n !== ARCHIVO_PROFE);
  return (await Promise.all(nombres.map((n) => store.get<Resultado>(`resultados/${id}/${n}`)))).map((d) => d!.data);
}

function meta(it: ConGrupos) {
  return {
    id: it.id, tipo: it.tipo, titulo: it.titulo, nivel: it.nivel, descripcion: it.descripcion,
    disponibleDesde: it.disponibleDesde, fechaLimite: it.fechaLimite,
    intentosMax: tieneReto(it) ? maxIntentos(it) : 0,
    preguntas: tieneReto(it) ? (it.preguntasPorIntento || (it.banco || []).length) : 0,
    meetUrl: it.meetUrl ?? null, hora: it.hora ?? null, tieneReto: it.tipo === "meet" && tieneReto(it),
    ...(it.segundaOportunidad ? { segundaOportunidad: it.segundaOportunidad } : {}),
    ...(it.grupos ? { grupos: it.grupos } : {}),
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

export async function handleActividades(req: Request, subpath: string, quien: Identidad, store: Store, json: Json, ambito: Ambito = AMBITO_CLASE): Promise<Response> {
  if (!quien.isAdmin && !quien.alumno) return json({ error: "sin_acceso" }, 403);
  const url = new URL(req.url);
  const hoy = url.searchParams.get("hoy") && Deno.env.get("PERMITIR_HOY") === "1" ? url.searchParams.get("hoy")! : mxToday();
  const partes = subpath.split("/").filter(Boolean).map(decodeURIComponent);
  const slug = quien.alumno ? slugAlumno(quien.alumno) : null;

  // GET /ingles/actividades → elementos con estado (alumno) o con resultados y resumen (admin)
  if (partes.length === 0 && req.method === "GET") {
    const { items, semanaActual } = await visibleItems(store, hoy, ambito);
    const semana = semanaActual ? { id: semanaActual.id, titulo: semanaActual.titulo, ids: semanaActual.elementos.map((e) => e.id) } : null;
    if (quien.isAdmin) {
      const conRes = await Promise.all(items.map(async (it) => ({ ...meta(it), resultados: tieneReto(it) ? await resultadosDe(store, it.id) : [] })));
      const porAlumno = new Map<string, Resultado[]>();
      for (const it of conRes) for (const r of it.resultados) { if (!porAlumno.has(r.alumno)) porAlumno.set(r.alumno, []); porAlumno.get(r.alumno)!.push(r); }
      const resumen = Object.fromEntries([...porAlumno].map(([a, rs]) => [a, { temasAReforzar: temasAReforzar(rs) }]));
      return json({ isAdmin: true, hoy, semana, items: conRes, resumen });
    }
    const grupo = ambito.clave === "profe" ? (await itemsDelGrupo(store)).map(paraProfe) : [];
    const deGrupo = new Set(grupo.map((g) => g.id));
    const todos = [...items, ...grupo].sort((a, b) => a.fechaLimite.localeCompare(b.fechaLimite));
    // Alumnos y alumnas nuevos: lo que venció antes de su lunes de inicio no aparece (openspec: inicio-lunes-alumnos).
    const suyos = todos.filter((it: ConGrupos) => !quien.grupo || !it.grupos || it.grupos.includes(quien.grupo)) // calendario por grupo
      .map((base) => paraAlumno(base, slug!)).filter((it) => !quien.inicio || it.fechaLimite >= quien.inicio);
    const conEstado = await Promise.all(suyos.map(async (it) => {
      const r = tieneReto(it) ? (await leerResultado(store, it.id, slug!))?.data ?? null : null;
      return { ...meta(it), estado: estadoItem(it, hoy, r), intentosUsados: r?.intentos.length || 0, mejor: r?.mejor ?? null, ultimoEnvio: r?.intentos.at(-1)?.enviadoEn ?? null, ...(deGrupo.has(it.id) ? { grupo: true } : {}) };
    }));
    const plan = ambito.clave === "profe" ? (await store.get(`${ambito.contenido}/plan.json`))?.data ?? null : undefined;
    return json({ isAdmin: false, hoy, semana, items: conEstado, ...(plan !== undefined ? { plan } : {}), ...(quien.inicio ? { inicio: quien.inicio } : {}), ...(quien.grupoInfo ? { grupo: quien.grupoInfo } : {}) });
  }

  let base = await loadItem(store, partes[0], ambito);
  if (!base && ambito.clave === "profe") {
    const g = await loadItem(store, partes[0]);
    if (g && TIPOS_GRUPO.has(g.tipo)) base = paraProfe(g);
  }
  if (!base) return json({ error: "no_encontrado" }, 404);
  const it = slug && !quien.isAdmin ? paraAlumno(base, slug) : base;
  if (!tieneReto(it)) return json({ error: "no_aplica" }, 400);

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
    if (estado === "en-espera") return json({ error: "segunda_pronto", desde: it.segundaOportunidad }, 403);
  }

  // Corrección: a partir del intento anterior (del alumno o alumna, o del que ve el admin en vista previa).
  const docVista = quien.isAdmin ? (alumnoVista ? await leerResultado(store, it.id, slugAlumno(alumnoVista)) : null) : doc;
  const correccion = n > 1 ? correccionDe(it, docVista?.data.intentos[n - 2]) : null;
  const seleccion = await preguntasPara(store, it, alumnoVista, n);
  const preguntas = correccion ? correccion.preguntas : seleccion.preguntas;
  const enfoque = seleccion.enfoque;

  if (req.method === "GET") {
    const titulos = new Map((it.temas || []).map((t) => [t.id, t.titulo]));
    return json({
      ...meta(it), teoria: it.teoria || [], tips: it.tips || [],
      ...(quien.isAdmin && it.guion ? { guion: it.guion } : {}),
      ...(quien.isAdmin && it.presentacion ? { presentacion: it.presentacion } : {}),
      temas: (it.temas || []).map((t) => ({ id: t.id, titulo: t.titulo })),
      enfoque: enfoque.map((t) => titulos.get(t) || t),
      intento: n, intentosUsados: usados, vistaPrevia: quien.isAdmin,
      ...(correccion ? { correccion: { fijas: correccion.fijas, anteriores: correccion.anteriores } } : {}),
      preguntas: preguntas.map(publicQuestion),
    });
  }

  if (req.method === "POST") {
    let body: { intento?: number; respuestas?: unknown } = {};
    try { body = await req.json(); } catch { return json({ error: "json_invalido" }, 400); }
    if (!quien.isAdmin && body.intento !== n) return json({ error: "intento_invalido", esperado: n }, 409);
    // Las correctas del intento anterior mandan sobre lo que envíe el cliente.
    const respuestas = { ...sanitizeRespuestas(preguntas, body.respuestas), ...(correccion?.fijas || {}) };
    const calificacion = grade(it, preguntas, respuestas);
    if (quien.isAdmin) return json({ guardado: false, intento: n, intentosMax: maxIntentos(it), calificacion });

    const intento: Intento = { n, enviadoEn: new Date().toISOString(), fueraDeTiempo: fueraDeTiempoDe(it, n, hoy), preguntas: preguntas.map((p) => p.id), respuestas, calificacion };
    for (let i = 0; i < 3; i++) {
      const actual = await leerResultado(store, it.id, slug!);
      if ((actual?.data.intentos.length || 0) !== n - 1) return json({ error: "intento_invalido", esperado: (actual?.data.intentos.length || 0) + 1 }, 409);
      const nuevo = addIntento(actual?.data ?? null, it, quien.alumno!, intento);
      const ok = await store.put(rutaResultado(it.id, slug!), nuevo, actual?.sha ?? null, `${it.id}: intento ${n} de ${quien.alumno}`);
      const restantes = estadoItem(it, hoy, nuevo) === "completo" ? 0 : maxIntentos(it) - n;
      if (ok) return json({ guardado: true, intento: n, intentosMax: maxIntentos(it), restantes, calificacion, mejor: nuevo.mejor });
    }
    return json({ error: "conflicto_escritura" }, 503);
  }

  return json({ error: "metodo_no_permitido" }, 405);
}

// /ingles/profe/actividades[/<id>] → ruta de estudio del profe: solo el admin, atendido como el alumno "Profe".
export const ALUMNO_PROFE = "Profe";
export async function handleProfe(req: Request, subpath: string, email: string, admin: string, store: Store, json: Json): Promise<Response> {
  if (!admin || (email || "").trim().toLowerCase() !== admin) return json({ error: "solo_admin" }, 403);
  return await handleActividades(req, subpath, { isAdmin: false, alumno: ALUMNO_PROFE }, store, json, AMBITO_PROFE);
}
