// Partidas multijugador ("salas"): crear, unirse, empezar, responder y ver el estado.
// La sincronía es por reloj (inicio del servidor); cada jugador escribe solo su archivo y los bots se
// calculan en el cliente con la semilla. Ver openspec: juegos-partidas.
import type { Jugador } from "./juegos.ts";
import type { Store } from "./store.ts";
import { canalNuevo, type ConfigRealtime, publicarSala, topicDe } from "./realtime.ts";

type Json = (body: unknown, status?: number) => Response;

// Juegos que se pueden jugar en partida (los de preguntas y Basta).
export const JUEGOS_PARTIDA = new Set([
  "en-vocab", "en-frases", "en-preguntas", "es-ortografia", "es-acentos", "es-sinonimos", "cultura", "mente-calculo", "mente-secuencias", "basta-es", "basta-en", "loteria", "una", "poker", "brisca", "conquian",
]);
const ACCIONES_POKER = ["retirarse", "pasar", "igualar", "subir", "todo"]; // openspec: poker
const ACCIONES_CONQUIAN = ["tomar", "bajar", "descartar", "pasar"]; // openspec: cartas-espanolas

type Jugada = NonNullable<EnSala["jugadas"]>[number];
const entero = (x: unknown, min: number, max: number) => typeof x === "number" && Number.isInteger(x) && x >= min && x <= max;

// Valida la jugada según el juego y devuelve solo sus campos permitidos (sin t), o null.
function validarJugada(juego: string, crudo: unknown): Omit<Jugada, "t"> | null {
  const j = crudo && typeof crudo === "object" ? crudo as Record<string, unknown> : {};
  const n = j.n, accion = String(j.accion ?? "");
  if (!entero(n, 0, 2000)) return null;
  const base = { n: n as number, accion };
  if (juego === "poker") {
    if (!ACCIONES_POKER.includes(accion) || j.carta !== undefined || (j.monto !== undefined && !entero(j.monto, 0, 1_000_000))) return null;
    return { ...base, ...(j.monto !== undefined ? { monto: j.monto as number } : {}) };
  }
  if (juego === "brisca") return accion === "jugar" && entero(j.carta, 0, 39) ? { ...base, carta: j.carta as number } : null;
  if (juego === "conquian") {
    if (!ACCIONES_CONQUIAN.includes(accion)) return null;
    if (accion === "descartar") return entero(j.carta, 0, 39) ? { ...base, carta: j.carta as number } : null;
    if (accion === "pasar") return base;
    const con = j.con;
    if (!Array.isArray(con) || con.length > 8 || !con.every((x) => entero(x, 0, 39)) || new Set(con).size !== con.length) return null;
    if (j.a !== undefined && !entero(j.a, 0, 20)) return null;
    return { ...base, con: con as number[], ...(j.a !== undefined ? { a: j.a as number } : {}) };
  }
  // ¡Una!
  if (!["jugar", "robar", "pasar"].includes(accion) || (j.carta !== undefined && !entero(j.carta, 0, 107)) ||
    (j.color !== undefined && !["r", "y", "g", "b"].includes(String(j.color))) || (j.una !== undefined && typeof j.una !== "boolean")) return null;
  return { ...base, ...(j.carta !== undefined ? { carta: j.carta as number } : {}), ...(j.color !== undefined ? { color: String(j.color) } : {}), ...(j.una !== undefined ? { una: j.una as boolean } : {}) };
}
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
  canal?: string; // topic secreto de Supabase Realtime (openspec: salas-realtime); nunca va en el cuerpo de la sala
}

interface EnSala {
  id: string;
  nombre: string;
  tipo: Jugador["tipo"];
  unido: number;
  avatar?: { emoji: string; color: string };
  respuestas: Record<string, { correcta: boolean; puntos: number; ms: number }>;
  palabras?: Record<string, string>;
  basta?: number;
  rondasBasta?: Record<string, { palabras: Record<string, string>; basta?: number }>; // Basta por rondas
  loteria?: number; // hora del servidor del primer "¡Lotería!"
  unas?: { paso: number; t: number }[]; // ¡Una!: botón UNA por paso
  jugadas?: { n: number; accion: string; carta?: number; color?: string; una?: boolean; monto?: number; con?: number[]; a?: number; t: number }[]; // juegos por turnos
  final?: number; // total del jugador al terminar
  podio?: { nombre: string; total: number; bot?: boolean }[]; // solo el host
  v?: number; // versión: sube en cada guardado; la página descarta avisos de Realtime más viejos (openspec: salas-realtime)
}

const RONDAS_BASTA = ["5", "10", "12"]; // Basta por rondas (openspec: basta-rondas)
const MAX_FINAL = 10_000; // total final y podio (10–12 rondas de Basta suman más que un quiz)

const cache = new Map<string, { t: number; v: unknown }>();
export function clearCacheSalas() {
  cache.clear();
}

const ruta = (codigo: string, archivo = "sala") => `juegos/salas/${codigo}/${archivo}.json`;
const aleatorio = (n: number) => crypto.getRandomValues(new Uint32Array(n));

// ahora (ms): una sala vencida se responde sin leer a sus jugadores (pestañas olvidadas siguen consultando;
// openspec: github-etag-cache).
async function estado(store: Store, codigo: string, ahora?: number) {
  const c = cache.get(codigo);
  if (c && Date.now() - c.t < 2000) return c.v as { sala: Sala; jugadores: EnSala[] } | null;
  const doc = await store.get<Sala>(ruta(codigo));
  if (!doc) return null;
  if (ahora !== undefined && ahora - doc.data.creada > VIGENCIA_MS) return { sala: doc.data, jugadores: [] as EnSala[] };
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
    const nuevo = { ...cambiar(base), avatar: j.avatar, v: (base.v ?? 0) + 1 };
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
      jugadores: est.jugadores.map((j) => ({ nombre: j.nombre, tipo: j.tipo, avatar: j.avatar, final: j.final ?? null, respondidas: Object.keys(j.respuestas || {}).length })),
      podio: host?.podio ?? null,
    };
  }));
  return salas.filter((x) => x !== null).sort((a, b) => b!.creada - a!.creada);
}

// sub: "" (crear) o "/<código>[/unirse|/empezar|/respuesta]"
// La sala que se devuelve o se publica, sin el canal secreto.
const sinCanal = (s: Sala): Sala => { const { canal: _c, ...resto } = s; return resto; };

export async function handleSalas(req: Request, sub: string, jugador: Jugador, store: Store, ahoraIso: string, json: Json, lunes: string, rt?: ConfigRealtime): Promise<Response> {
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
    if (juego === "poker" && op.equipos === "1") opciones.equipos = "1"; // póker por equipos A/B
    if (juego === "loteria") {
      if (op.modo !== undefined && op.modo !== "linea" && op.modo !== "llena") return json({ error: "modo_invalido" }, 400);
      opciones.modo = (op.modo as string) || "linea";
    }
    if (juego.startsWith("basta")) {
      const rondas = op.rondas === undefined ? "10" : String(op.rondas);
      if (!RONDAS_BASTA.includes(rondas)) return json({ error: "rondas_invalidas" }, 400);
      opciones.rondas = rondas;
    }
    let codigo = "";
    for (let i = 0; i < 10 && !codigo; i++) {
      const cand = [...aleatorio(4)].map((x) => LETRAS_CODIGO[x % LETRAS_CODIGO.length]).join("");
      if (!(await store.get(ruta(cand)))) codigo = cand;
    }
    if (!codigo) return json({ error: "sin_codigo" }, 503);
    const sala: Sala = { codigo, juego, opciones, seed: aleatorio(1)[0] % 2147483647, host: jugador.id, creada: ahora, inicio: null, bots: body.bots !== false, canal: canalNuevo() };
    await store.put(ruta(codigo), sala, null, `sala ${codigo}: nueva (${juego})`);
    await guardarJugador(store, codigo, jugador, (e) => e, ahora);
    await indexar(store, lunes, { codigo, juego, host: jugador.nombre, creada: ahora });
    return json({ codigo, sala: sinCanal(sala) });
  }

  const m = sub.match(/^\/([A-Z]{4})(\/(unirse|empezar|respuesta))?$/);
  if (!m) return json({ error: "not_found" }, 404);
  const [, codigo, , accion] = m;
  const est = await estado(store, codigo, ahora);
  if (!est) return json({ error: "sala_no_existe" }, 404);
  const { sala, jugadores } = est;
  if (ahora - sala.creada > VIGENCIA_MS) return json({ error: "sala_vencida" }, 410);
  const dentro = jugadores.some((j) => j.id === jugador.id);
  // Tras un cambio: publicar el estado fresco en el canal de la sala (si hay Realtime configurado).
  const publicar = async () => {
    if (!rt || !sala.canal) return;
    cache.delete(codigo);
    const fresco = await estado(store, codigo, ahora);
    if (fresco) await publicarSala(rt, sala.canal, { sala: sinCanal(fresco.sala), jugadores: fresco.jugadores, ahora: Date.now() });
  };

  if (accion === "unirse" && req.method === "POST") {
    if (dentro) return json({ ok: true, codigo });
    if (sala.inicio !== null) return json({ error: "ya_empezo" }, 409);
    if (jugadores.length >= MAX_JUGADORES) return json({ error: "sala_llena" }, 409);
    await guardarJugador(store, codigo, jugador, (e) => e, ahora);
    await publicar();
    return json({ ok: true, codigo });
  }

  if (accion === "empezar" && req.method === "POST") {
    if (sala.host !== jugador.id) return json({ error: "solo_host" }, 403);
    if (sala.inicio === null) {
      const doc = await store.get<Sala>(ruta(codigo));
      const nueva = { ...doc!.data, inicio: ahora + CUENTA_REGRESIVA_MS };
      await store.put(ruta(codigo), nueva, doc!.sha, `sala ${codigo}: empieza`);
      cache.delete(codigo);
      await publicar();
      return json({ ok: true, sala: sinCanal(nueva), ahora });
    }
    return json({ ok: true, sala: sinCanal(sala), ahora });
  }

  if (accion === "respuesta" && req.method === "POST") {
    if (!dentro) return json({ error: "no_en_sala" }, 403);
    if (sala.inicio === null) return json({ error: "no_empezo" }, 409);
    let cambiar: (e: EnSala) => EnSala;
    if (body.una !== undefined && body.jugada === undefined) {
      const paso = Number((body.una as Record<string, unknown>)?.paso);
      if (!Number.isInteger(paso) || paso < 0 || paso > 2000) return json({ error: "una_invalida" }, 400);
      cambiar = (e) => (e.unas || []).some((u) => u.paso === paso) ? e : { ...e, unas: [...(e.unas || []), { paso, t: ahora }].slice(-100) };
    } else if (body.jugada !== undefined) {
      // Juegos por turnos (¡Una!, póker, Brisca, Conquián): cada jugada con su paso n; nadie más puede tener ese paso.
      const v = validarJugada(sala.juego, body.jugada);
      if (!v) return json({ error: "jugada_invalida" }, 400);
      const n = v.n;
      if (jugadores.some((x) => x.id !== jugador.id && (x.jugadas || []).some((y) => y.n === n))) return json({ error: "turno_tomado" }, 409);
      const nueva = { ...v, t: ahora };
      cambiar = (e) => (e.jugadas || []).some((y) => y.n === n) ? e : { ...e, jugadas: [...(e.jugadas || []), nueva].slice(-600) };
    } else if (body.loteria === true) {
      cambiar = (e) => e.loteria ? e : { ...e, loteria: ahora };
    } else if (body.final !== undefined || body.podio !== undefined) {
      // Cierre: total final de cada jugador y, del host, el podio completo (con bots).
      const final = Math.max(0, Math.min(MAX_FINAL, Math.round(Number(body.final) || 0)));
      const podio = sala.host === jugador.id && Array.isArray(body.podio)
        ? (body.podio as Record<string, unknown>[]).slice(0, 32).map((x) => ({ nombre: String(x?.nombre ?? "").slice(0, 30), total: Math.max(0, Math.min(MAX_FINAL, Math.round(Number(x?.total) || 0))), ...(x?.bot ? { bot: true } : {}) }))
        : undefined;
      cambiar = (e) => ({ ...e, ...(body.final !== undefined ? { final } : {}), ...(podio ? { podio } : {}) });
    } else if (sala.juego.startsWith("basta")) {
      if (body.palabras !== undefined && (typeof body.palabras !== "object" || body.palabras === null || Array.isArray(body.palabras))) return json({ error: "palabras_invalidas" }, 400);
      const palabras = Object.fromEntries(Object.entries((body.palabras || {}) as Record<string, unknown>).slice(0, 10)
        .map(([k, v]) => [String(k).slice(0, 20), String(v ?? "").trim().slice(0, 40)]));
      if (body.ronda !== undefined) {
        // Basta por rondas: palabras y primer ¡Basta! de cada ronda.
        const ronda = Number(body.ronda);
        if (!Number.isInteger(ronda) || ronda < 0 || ronda >= Number(sala.opciones.rondas || 1)) return json({ error: "ronda_invalida" }, 400);
        cambiar = (e) => {
          const previa = (e.rondasBasta || {})[ronda];
          const r = { palabras: body.palabras !== undefined ? palabras : (previa?.palabras ?? {}), ...(previa?.basta ? { basta: previa.basta } : body.basta === true ? { basta: ahora } : {}) };
          return { ...e, rondasBasta: { ...(e.rondasBasta || {}), [ronda]: r } };
        };
      } else {
        cambiar = (e) => ({ ...e, palabras: body.palabras !== undefined ? palabras : e.palabras, basta: body.basta === true && !e.basta ? ahora : e.basta });
      }
    } else {
      const q = Number(body.q);
      if (!Number.isInteger(q) || q < 0 || q >= PREGUNTAS || typeof body.correcta !== "boolean") return json({ error: "respuesta_invalida" }, 400);
      const puntos = Math.max(0, Math.min(200, Math.round(Number(body.puntos) || 0)));
      const ms = Math.max(0, Math.min(20000, Math.round(Number(body.ms) || 0)));
      cambiar = (e) => e.respuestas[q] ? e : ({ ...e, respuestas: { ...e.respuestas, [q]: { correcta: body.correcta as boolean, puntos, ms } } });
    }
    const nuevo = await guardarJugador(store, codigo, jugador, cambiar, ahora);
    if (!nuevo) return json({ error: "conflicto_escritura" }, 503);
    await publicar();
    return json({ ok: true, respuestas: nuevo.respuestas, palabras: nuevo.palabras, basta: nuevo.basta, rondasBasta: nuevo.rondasBasta, loteria: nuevo.loteria, jugadas: nuevo.jugadas, unas: nuevo.unas });
  }

  if (!accion && req.method === "GET") {
    if (!dentro && jugador.tipo !== "admin") return json({ error: "no_en_sala" }, 403);
    const enVivo = rt && sala.canal ? { rt: { url: rt.url, key: rt.publica, topic: topicDe(sala.canal) } } : {};
    return json({ sala: sinCanal(sala), jugadores, ahora, yo: jugador.id, soyHost: sala.host === jugador.id, ...enVivo });
  }

  return json({ error: "metodo_no_permitido" }, 405);
}
