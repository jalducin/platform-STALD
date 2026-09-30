// Partidas multijugador ("salas"): crear, unirse, empezar, responder y ver el estado.
// La sincronía es por reloj (inicio del servidor); cada jugador escribe solo su archivo y los bots se
// calculan en el cliente con la semilla. Ver openspec: juegos-partidas.
import type { Jugador } from "./juegos.ts";
import type { Store } from "./store.ts";

type Json = (body: unknown, status?: number) => Response;

// Juegos que se pueden jugar en partida (los de preguntas y Basta).
export const JUEGOS_PARTIDA = new Set([
  "en-vocab", "en-frases", "en-preguntas", "es-ortografia", "es-acentos", "es-sinonimos", "cultura", "mente-calculo", "mente-secuencias", "basta-es", "basta-en", "loteria",
]);
const LETRAS_CODIGO = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const MAX_JUGADORES = 30;
const VIGENCIA_MS = 3 * 3600 * 1000;
const CUENTA_REGRESIVA_MS = 5000;
const PREGUNTAS = 10;

interface Sala {
  codigo: string;
  juego: string;
  opciones: Record<string, string>;
  seed: number;
  host: string; // id del jugador que la creó
  creada: number; // ms
  inicio: number | null; // ms del servidor
  bots: boolean;
}

interface EnSala {
  id: string;
  nombre: string;
  tipo: Jugador["tipo"];
  unido: number;
  respuestas: Record<string, { correcta: boolean; puntos: number; ms: number }>;
  palabras?: Record<string, string>;
  basta?: number;
  loteria?: number; // hora del servidor del primer "¡Lotería!"
  final?: number; // total del jugador al terminar
  podio?: { nombre: string; total: number; bot?: boolean }[]; // solo el host
}

const cache = new Map<string, { t: number; v: unknown }>();
export function clearCacheSalas() {
  cache.clear();
}

const ruta = (codigo: string, archivo = "sala") => `juegos/salas/${codigo}/${archivo}.json`;
const aleatorio = (n: number) => crypto.getRandomValues(new Uint32Array(n));

async function estado(store: Store, codigo: string) {
  const c = cache.get(codigo);
  if (c && Date.now() - c.t < 2000) return c.v as { sala: Sala; jugadores: EnSala[] } | null;
  const doc = await store.get<Sala>(ruta(codigo));
  if (!doc) return null;
  const nombres = (await store.list(`juegos/salas/${codigo}`)).filter((n) => n.endsWith(".json") && n !== "sala.json");
  const jugadores = (await Promise.all(nombres.map((n) => store.get<EnSala>(`juegos/salas/${codigo}/${n}`)))).map((d) => d!.data)
    .sort((a, b) => a.unido - b.unido);
  const v = { sala: doc.data, jugadores };
  cache.set(codigo, { t: Date.now(), v });
  return v;
}

async function guardarJugador(store: Store, codigo: string, j: Jugador, cambiar: (e: EnSala) => EnSala, ahora: number): Promise<EnSala | null> {
  for (let i = 0; i < 3; i++) {
    const doc = await store.get<EnSala>(ruta(codigo, j.id));
    const base: EnSala = doc?.data ?? { id: j.id, nombre: j.nombre, tipo: j.tipo, unido: ahora, respuestas: {} };
    const nuevo = cambiar(base);
    if (await store.put(ruta(codigo, j.id), nuevo, doc?.sha ?? null, `sala ${codigo}: ${j.nombre}`)) {
      cache.delete(codigo);
      return nuevo;
    }
  }
  return null;
}

// Índice semanal de salas (GitHubStore.list no lista carpetas).
async function indexar(store: Store, lunes: string, entrada: { codigo: string; juego: string; host: string; creada: number }) {
  const ruta = `juegos/salas-semana/${lunes}.json`;
  for (let i = 0; i < 3; i++) {
    const doc = await store.get<{ salas: typeof entrada[] }>(ruta);
    const salas = [...(doc?.data.salas ?? []), entrada];
    if (await store.put(ruta, { salas }, doc?.sha ?? null, `salas: ${entrada.codigo}`)) return;
  }
}

// Resumen de las salas de una semana, para el admin (sin correos).
export async function resumenSalas(store: Store, lunes: string) {
  const idx = await store.get<{ salas: { codigo: string; juego: string; host: string; creada: number }[] }>(`juegos/salas-semana/${lunes}.json`);
  const salas = await Promise.all((idx?.data.salas ?? []).map(async (s) => {
    const est = await estado(store, s.codigo);
    if (!est) return null;
    const host = est.jugadores.find((j) => j.id === est.sala.host);
    return {
      codigo: s.codigo, juego: s.juego, host: s.host, creada: s.creada, inicio: est.sala.inicio, bots: est.sala.bots,
      jugadores: est.jugadores.map((j) => ({ nombre: j.nombre, tipo: j.tipo, final: j.final ?? null, respondidas: Object.keys(j.respuestas || {}).length })),
      podio: host?.podio ?? null,
    };
  }));
  return salas.filter((x) => x !== null).sort((a, b) => b!.creada - a!.creada);
}

// sub: "" (crear) o "/<código>[/unirse|/empezar|/respuesta]"
export async function handleSalas(req: Request, sub: string, jugador: Jugador, store: Store, ahoraIso: string, json: Json, lunes: string): Promise<Response> {
  const ahora = Date.parse(ahoraIso);
  let body: Record<string, unknown> = {};
  if (req.method === "POST") {
    const txt = await req.text();
    if (txt) { try { body = JSON.parse(txt); } catch { return json({ error: "json_invalido" }, 400); } }
  }

  // POST /juegos/sala → crear
  if (sub === "" && req.method === "POST") {
    const juego = String(body.juego || "");
    if (!JUEGOS_PARTIDA.has(juego)) return json({ error: "juego_no_permitido" }, 400);
    const opciones: Record<string, string> = {};
    const op = (body.opciones && typeof body.opciones === "object") ? body.opciones as Record<string, unknown> : {};
    if (typeof op.cat === "string" && op.cat.length <= 30) opciones.cat = op.cat;
    if (juego === "loteria") {
      if (op.modo !== undefined && op.modo !== "linea" && op.modo !== "llena") return json({ error: "modo_invalido" }, 400);
      opciones.modo = (op.modo as string) || "linea";
    }
    let codigo = "";
    for (let i = 0; i < 10 && !codigo; i++) {
      const cand = [...aleatorio(4)].map((x) => LETRAS_CODIGO[x % LETRAS_CODIGO.length]).join("");
      if (!(await store.get(ruta(cand)))) codigo = cand;
    }
    if (!codigo) return json({ error: "sin_codigo" }, 503);
    const sala: Sala = { codigo, juego, opciones, seed: aleatorio(1)[0] % 2147483647, host: jugador.id, creada: ahora, inicio: null, bots: body.bots !== false };
    await store.put(ruta(codigo), sala, null, `sala ${codigo}: nueva (${juego})`);
    await guardarJugador(store, codigo, jugador, (e) => e, ahora);
    await indexar(store, lunes, { codigo, juego, host: jugador.nombre, creada: ahora });
    return json({ codigo, sala });
  }

  const m = sub.match(/^\/([A-Z]{4})(\/(unirse|empezar|respuesta))?$/);
  if (!m) return json({ error: "not_found" }, 404);
  const [, codigo, , accion] = m;
  const est = await estado(store, codigo);
  if (!est) return json({ error: "sala_no_existe" }, 404);
  const { sala, jugadores } = est;
  if (ahora - sala.creada > VIGENCIA_MS) return json({ error: "sala_vencida" }, 410);
  const dentro = jugadores.some((j) => j.id === jugador.id);

  if (accion === "unirse" && req.method === "POST") {
    if (dentro) return json({ ok: true, codigo });
    if (sala.inicio !== null) return json({ error: "ya_empezo" }, 409);
    if (jugadores.length >= MAX_JUGADORES) return json({ error: "sala_llena" }, 409);
    await guardarJugador(store, codigo, jugador, (e) => e, ahora);
    return json({ ok: true, codigo });
  }

  if (accion === "empezar" && req.method === "POST") {
    if (sala.host !== jugador.id) return json({ error: "solo_host" }, 403);
    if (sala.inicio === null) {
      const doc = await store.get<Sala>(ruta(codigo));
      const nueva = { ...doc!.data, inicio: ahora + CUENTA_REGRESIVA_MS };
      await store.put(ruta(codigo), nueva, doc!.sha, `sala ${codigo}: empieza`);
      cache.delete(codigo);
      return json({ ok: true, sala: nueva, ahora });
    }
    return json({ ok: true, sala, ahora });
  }

  if (accion === "respuesta" && req.method === "POST") {
    if (!dentro) return json({ error: "no_en_sala" }, 403);
    if (sala.inicio === null) return json({ error: "no_empezo" }, 409);
    let cambiar: (e: EnSala) => EnSala;
    if (body.loteria === true) {
      cambiar = (e) => e.loteria ? e : { ...e, loteria: ahora };
    } else if (body.final !== undefined || body.podio !== undefined) {
      // Cierre: total final de cada jugador y, del host, el podio completo (con bots).
      const final = Math.max(0, Math.min(3000, Math.round(Number(body.final) || 0)));
      const podio = sala.host === jugador.id && Array.isArray(body.podio)
        ? (body.podio as Record<string, unknown>[]).slice(0, 32).map((x) => ({ nombre: String(x?.nombre ?? "").slice(0, 30), total: Math.max(0, Math.min(3000, Math.round(Number(x?.total) || 0))), ...(x?.bot ? { bot: true } : {}) }))
        : undefined;
      cambiar = (e) => ({ ...e, ...(body.final !== undefined ? { final } : {}), ...(podio ? { podio } : {}) });
    } else if (sala.juego.startsWith("basta")) {
      if (body.palabras !== undefined && (typeof body.palabras !== "object" || body.palabras === null || Array.isArray(body.palabras))) return json({ error: "palabras_invalidas" }, 400);
      const palabras = Object.fromEntries(Object.entries((body.palabras || {}) as Record<string, unknown>).slice(0, 10)
        .map(([k, v]) => [String(k).slice(0, 20), String(v ?? "").trim().slice(0, 40)]));
      cambiar = (e) => ({ ...e, palabras: body.palabras !== undefined ? palabras : e.palabras, basta: body.basta === true && !e.basta ? ahora : e.basta });
    } else {
      const q = Number(body.q);
      if (!Number.isInteger(q) || q < 0 || q >= PREGUNTAS || typeof body.correcta !== "boolean") return json({ error: "respuesta_invalida" }, 400);
      const puntos = Math.max(0, Math.min(200, Math.round(Number(body.puntos) || 0)));
      const ms = Math.max(0, Math.min(20000, Math.round(Number(body.ms) || 0)));
      cambiar = (e) => e.respuestas[q] ? e : ({ ...e, respuestas: { ...e.respuestas, [q]: { correcta: body.correcta as boolean, puntos, ms } } });
    }
    const nuevo = await guardarJugador(store, codigo, jugador, cambiar, ahora);
    if (!nuevo) return json({ error: "conflicto_escritura" }, 503);
    return json({ ok: true, respuestas: nuevo.respuestas, palabras: nuevo.palabras, basta: nuevo.basta, loteria: nuevo.loteria });
  }

  if (!accion && req.method === "GET") {
    if (!dentro && jugador.tipo !== "admin") return json({ error: "no_en_sala" }, 403);
    return json({ sala, jugadores, ahora, yo: jugador.id, soyHost: sala.host === jugador.id });
  }

  return json({ error: "metodo_no_permitido" }, 405);
}
