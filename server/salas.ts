// Partidas multijugador ("salas"): crear, unirse, empezar, responder y ver el estado.
// La sincronía es por reloj (inicio del servidor); cada jugador escribe solo su archivo y los bots se
// calculan en el cliente con la semilla. Ver openspec: juegos-partidas.
import type { Jugador } from "./juegos.ts";
import type { Store } from "./store.ts";
import { canalNuevo, type ConfigRealtime, publicarSala, topicDe } from "./realtime.ts";
import { type Carrera, CARRERAS, mapaDeSala, validarCarrera } from "./carreras.ts";
// clasicos-rapidos: Gato, Conecta 4, Piedra-papel-tijera, Ahorcado y Serpientes (reglas de sala en su módulo)
import * as Clasicos from "./clasicos_rapidos.ts";
import { JUEGOS_TABLERO, validarJugadaTablero, vistaJugadores } from "./tablero.ts"; // juegos-tablero
import { respuestaNaval } from "./naval.ts"; // juegos-tablero
// juegos-salas-grandes: Bingo, Blackjack, Dibuja y adivina, y Memorama y Sopa en partida
import * as Grandes from "./salas_grandes.ts";
import * as Futbolito from "./futbolito.ts"; // futbolito-equipos: formato, equipos y dueño de la barra
import * as FutbolLinea from "./futbol_linea.ts"; // futbol-en-linea: táctica del asiento y resultado validado
import { esPersonaje } from "./personajes.ts"; // personaje-en-salas: misma lista que juegos/personajes.js
import * as Copa from "./karts_copa.ts"; // karts-copa-en-sala: copa completa de Karts (reglas en juegos/karts-copa.js)
import * as Arena from "./arena.ts"; // futbolito-arena: equipos, robot y resultado (reglas en juegos/arena-motor.js)
import * as Brigada from "./brigada.ts"; // brigada: misión de la sala y resultado validado (reglas en juegos/brigada-motor.js)

type Json = (body: unknown, status?: number) => Response;

// Juegos que se pueden crear en partida. Los absorbidos por la fusión (openspec: juegos-fusion) ya no: en-preguntas,
// es-acentos, es-sinonimos y mente-secuencias (sus puntos anteriores siguen en el catálogo).
export const JUEGOS_PARTIDA = new Set([
  "en-vocab", "en-frases", "es-ortografia", "cultura", "mente-calculo", "basta-es", "basta-en", "loteria", "una", "poker", "brisca", "conquian", "ajedrez",
  "en-tiempos", // ⏳ Máquina del tiempo (openspec: juegos-ingles-gramatica)
  "plataformas", "karts", // carreras de Arcade (openspec: juegos-plataformas-karts)
  ...JUEGOS_TABLERO, // juegos-tablero: damas, domino, parchis y naval
  ...Grandes.JUEGOS_GRANDES, // juegos-salas-grandes
  "cultura-linea", // cultura-conocimiento: 📜 Línea del tiempo
  "futbolito", "billar", // futbolito-billar: física 1 vs 1 por tiros
  "golf", // golf: minigolf de 2 a 4 personas por turnos
  "futbol", // futbol-en-linea: Fútbol Estelar 1 vs 1 en vivo (anfitrión autoritativo por el canal en vivo)
  Arena.JUEGO_ARENA, // futbolito-arena: robots por equipos en vivo (1v1, 1v2, 2v2 y 3v3)
  Brigada.JUEGO_BRIGADA, // brigada: misión cooperativa en vivo de 1 a 8
]);
// Tema de Completa y responde (openspec: juegos-ingles-gramatica); igual que TEMAS en juegos/ingles-gramatica.js.
const TEMAS_INGLES = ["todo", "tobe", "presente", "pasado", "futuro"];
// cultura-conocimiento: temas de 📜 Línea del tiempo (opciones.cat), igual que LineaTiempo.TEMAS en juegos/linea-tiempo.js.
export const TEMAS_LINEA = ["todos", "historia-mexico", "historia-universal", "inventos", "ciencia"];
const RONDAS_LINEA = 5, SUCESOS_MAX_LINEA = 6, MS_MAX_LINEA = 60_000;
const ACCIONES_POKER = ["retirarse", "pasar", "igualar", "subir", "todo"]; // openspec: poker
const FICHA_POKER = 5; // la ficha más chica; igual que Cartas.FICHA en juegos/cartas.js (openspec: poker-fichas)
const ACCIONES_CONQUIAN = ["tomar", "bajar", "descartar", "pasar"]; // openspec: cartas-espanolas

type Jugada = NonNullable<EnSala["jugadas"]>[number];
const entero = (x: unknown, min: number, max: number) => typeof x === "number" && Number.isInteger(x) && x >= min && x <= max;
for (const j of Clasicos.CLASICOS_RAPIDOS) JUEGOS_PARTIDA.add(j); // clasicos-rapidos

// Valida la jugada según el juego y devuelve solo sus campos permitidos (sin t), o null.
function validarJugada(juego: string, crudo: unknown): Omit<Jugada, "t"> | null {
  const j = crudo && typeof crudo === "object" ? crudo as Record<string, unknown> : {};
  const n = j.n, accion = String(j.accion ?? "");
  if (!entero(n, 0, 2000)) return null;
  const base = { n: n as number, accion };
  if (Clasicos.esClasicoRapido(juego)) return Clasicos.validarJugadaClasicos(juego, j); // clasicos-rapidos
  const tablero = validarJugadaTablero(juego, j, base); // juegos-tablero
  if (tablero !== undefined) return tablero as Omit<Jugada, "t"> | null;
  if (juego === "poker") return jugadaPoker(j, base);
  if (juego === "blackjack") return Grandes.validarJugadaBlackjack(j, base); // juegos-salas-grandes
  if (juego === "ajedrez") return jugadaAjedrez(j, base);
  if (juego === "brisca") return accion === "jugar" && entero(j.carta, 0, 39) ? { ...base, carta: j.carta as number } : null;
  if (juego === "conquian") return jugadaConquian(j, base);
  if (juego === "futbolito" || juego === "billar") return jugadaFisica(juego, j, base);
  if (juego === "golf") return jugadaGolf(j, base);
  return jugadaUna(j, base);
}
type BaseJugada = { n: number; accion: string };
// openspec: poker-fichas — la subida se arma con fichas de 5 a 100: entero múltiplo de FICHA_POKER y obligatorio.
function jugadaPoker(j: Record<string, unknown>, base: BaseJugada): Omit<Jugada, "t"> | null {
  const accion = base.accion;
  const montoOk = entero(j.monto, FICHA_POKER, 1_000_000) && (j.monto as number) % FICHA_POKER === 0;
  if (!ACCIONES_POKER.includes(accion) || j.carta !== undefined || (j.monto !== undefined && !montoOk) || (accion === "subir" && j.monto === undefined)) return null;
  return { ...base, ...(j.monto !== undefined ? { monto: j.monto as number } : {}) };
}
// openspec: ajedrez
function jugadaAjedrez(j: Record<string, unknown>, base: BaseJugada): Omit<Jugada, "t"> | null {
  const accion = base.accion;
  if (accion === "rendirse") return base;
  const casilla = (x: unknown) => typeof x === "string" && /^[a-h][1-8]$/.test(x);
  if (accion !== "mover" || !casilla(j.de) || !casilla(j.a) || (j.promo !== undefined && !["q", "r", "b", "n"].includes(String(j.promo)))) return null;
  return { ...base, de: j.de as string, a: j.a as string, ...(j.promo !== undefined ? { promo: String(j.promo) } : {}) };
}
// openspec: cartas-espanolas
function jugadaConquian(j: Record<string, unknown>, base: BaseJugada): Omit<Jugada, "t"> | null {
  const accion = base.accion;
  if (!ACCIONES_CONQUIAN.includes(accion)) return null;
  if (accion === "descartar") return entero(j.carta, 0, 39) ? { ...base, carta: j.carta as number } : null;
  if (accion === "pasar") return base;
  const con = j.con;
  if (!Array.isArray(con) || con.length > 8 || !con.every((x) => entero(x, 0, 39)) || new Set(con).size !== con.length) return null;
  if (j.a !== undefined && !entero(j.a, 0, 20)) return null;
  return { ...base, con: con as number[], ...(j.a !== undefined ? { a: j.a as number } : {}) };
}
// futbolito-billar: tiros de física (enteros; se simulan igual en cada cliente) o rendirse.
function jugadaFisica(juego: string, j: Record<string, unknown>, base: BaseJugada): Omit<Jugada, "t"> | null {
  const accion = base.accion;
  if (accion === "rendirse") return base;
  if (accion !== "tiro") return null;
  if (juego === "futbolito") {
    if (j.barra !== undefined && !entero(j.barra, 0, 7)) return null; // futbolito-equipos: barra que tira (0…7)
    return entero(j.pos, -150, 150) && entero(j.angulo, -60, 60) && entero(j.fuerza, 10, 100)
      ? { ...base, pos: j.pos as number, angulo: j.angulo as number, fuerza: j.fuerza as number, ...(j.barra !== undefined ? { barra: j.barra as number } : {}) } : null;
  }
  if (!entero(j.angulo, 0, 3599) || !entero(j.fuerza, 1, 100) || (j.efecto !== undefined && !entero(j.efecto, -100, 100))) return null;
  return { ...base, angulo: j.angulo as number, fuerza: j.fuerza as number, ...(j.efecto !== undefined ? { efecto: j.efecto as number } : {}) };
}
// golf: tiro determinista (ángulo en décimas de grado y fuerza enteros; se simula igual en cada cliente) o rendirse.
function jugadaGolf(j: Record<string, unknown>, base: BaseJugada): Omit<Jugada, "t"> | null {
  const accion = base.accion;
  if (accion === "rendirse") return base;
  return accion === "tiro" && entero(j.angulo, 0, 3599) && entero(j.fuerza, 1, 100) ? { ...base, angulo: j.angulo as number, fuerza: j.fuerza as number } : null;
}
// ¡Una! Robar (hasta poder tirar) y pasar no llevan carta ni color: el robo se reproduce del mazo de la semilla.
function jugadaUna(j: Record<string, unknown>, base: BaseJugada): Omit<Jugada, "t"> | null {
  const accion = base.accion;
  if (accion !== "jugar" && (j.carta !== undefined || j.color !== undefined)) return null; // basta-divertida-una-robo
  if (!["jugar", "robar", "pasar"].includes(accion) || (j.carta !== undefined && !entero(j.carta, 0, 107)) ||
    (j.color !== undefined && !["r", "y", "g", "b"].includes(String(j.color))) || (j.una !== undefined && typeof j.una !== "boolean")) return null;
  return { ...base, ...(j.carta !== undefined ? { carta: j.carta as number } : {}), ...(j.color !== undefined ? { color: String(j.color) } : {}), ...(j.una !== undefined ? { una: j.una as boolean } : {}) };
}
const LETRAS_CODIGO = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const MAX_JUGADORES = 30;
// Cupo de personas por juego (ajuste del profe): ajedrez 1 vs 1 sin bots; Brisca hasta 4 (se completa con bots).
// Mesas (openspec: mesas-con-bots): cupo de personas, asientos que se completan con bots (cada persona que entra quita
// un bot), mínimo para empezar y si los bots son fijos. Misma tabla que juegos/mesas.js (server/mesas_test.ts).
export interface Mesa { max: number; asientos?: number; min?: number; bots?: "siempre" | "nunca"; formatos?: Record<string, { max: number; asientos?: number; min?: number }> }
export const MESAS: Record<string, Mesa> = {
  ajedrez: { max: 2, min: 2, bots: "nunca" },
  brisca: { max: 4, asientos: 4, min: 4, bots: "siempre" },
  // clasicos-rapidos: Gato y Conecta 4 de 2 (1 persona + 1 bot o 2 personas), Piedra-papel-tijera y Serpientes con
  // asientos, Ahorcado sin asientos (bots aparte).
  gato: { max: 2, asientos: 2, min: 2 },
  conecta4: { max: 2, asientos: 2, min: 2 },
  ppt: { max: 8, asientos: 4, min: 2 },
  ahorcado: { max: 8, min: 1 },
  serpientes: { max: 4, asientos: 4, min: 2 },
  // juegos-tablero: Batalla naval sin bots (su flota la guarda el servidor); los demás se completan con bots.
  damas: { max: 2, asientos: 2, min: 2 },
  domino: { max: 4, asientos: 4, min: 2 },
  parchis: { max: 4, asientos: 4, min: 2 },
  naval: { max: 2, min: 2, bots: "nunca" },
  // juegos-salas-grandes
  bingo: { max: 30, min: 1 },
  blackjack: { max: 6, asientos: 3, min: 1 }, // la banca no ocupa asiento
  dibuja: { max: 12, min: 3, bots: "nunca" }, // los bots no dibujan
  "en-memorama": { max: 30, min: 1 },
  "mente-sopa": { max: 30, min: 1 },
  "cultura-linea": { max: 30, min: 1 }, // cultura-conocimiento: bots aparte, como el quiz
  // futbolito-billar: 1 vs 1 (con bots, 1 persona + 1 bot); futbolito-equipos: formato 2v2 de hasta 4 (opciones.formato)
  futbolito: { max: 2, asientos: 2, min: 2, formatos: { "2v2": { max: 4, asientos: 4, min: 2 } } },
  billar: { max: 2, asientos: 2, min: 2 },
  golf: { max: 4, min: 2, bots: "nunca" }, // golf: de 2 a 4 personas por turnos, sin bots (design.md §4)
  karts: { max: 8, asientos: 3, min: 1 }, // juegos-en-vivo: hasta 8 en vivo; con bots, 1 persona + 2 bots como antes
  futbol: { max: 2, min: 2, bots: "nunca" }, // futbol-en-linea: 1 vs 1 en vivo, solo personas
  // futbolito-arena: 2 vs 2 por omisión; cada persona que entra quita un bot
  "futbolito-arena": { max: 4, asientos: 4, min: 2, formatos: { "1v1": { max: 2, asientos: 2, min: 2 }, "1v2": { max: 3, asientos: 3, min: 2 }, "2v2": { max: 4, asientos: 4, min: 2 }, "3v3": { max: 6, asientos: 6, min: 2 } } },
  brigada: { max: 8, asientos: 4, min: 1 }, // brigada: de 1 a 8 personas; con bots, compañeros IA hasta 4 asientos
};
const FISICA = new Set(["futbolito", "billar", "golf"]); // futbolito-billar y golf: no aceptan jugadas tras el final
// futbolito-equipos: la mesa puede cambiar según `opciones.formato` (Futbolito 2v2).
export function mesaDe(juego: string, opciones?: Record<string, string>): Mesa | undefined {
  const m = MESAS[juego], f = opciones?.formato ? m?.formatos?.[opciones.formato] : undefined;
  return f ? { ...m, ...f } : m;
}
const cupo = (juego: string, opciones?: Record<string, string>) => mesaDe(juego, opciones)?.max ?? MAX_JUGADORES;
// Bots fijos de la mesa: true (siempre), false (nunca) o undefined (los decide el anfitrión).
const BOTS_FIJOS: Record<string, boolean> = { siempre: true, nunca: false };
const botsFijos = (juego: string): boolean | undefined => BOTS_FIJOS[MESAS[juego]?.bots ?? ""];
// Personas + bots que ocuparían la mesa al empezar (los bots completan los asientos libres).
export function enMesa(juego: string, humanos: number, conBots: boolean, opciones?: Record<string, string>): number {
  const m = mesaDe(juego, opciones); // futbolito-equipos
  if (!m?.asientos || !conBots || m.bots === "nunca") return humanos;
  return Math.max(Math.min(humanos, m.max), m.asientos);
}
const VIGENCIA_MS = 3 * 3600 * 1000;
const CUENTA_REGRESIVA_MS = 5000;
// karts-salida-y-puntos: en Karts, 8 s para que todos los aparatos (también un celular lento o con mala señal) tengan
// abierta la pista antes de la salida y nadie arranque tarde, lejos de los demás.
const CUENTA_REGRESIVA_KARTS_MS = 8000;
export const cuentaRegresiva = (juego: string) => (juego === "karts" ? CUENTA_REGRESIVA_KARTS_MS : CUENTA_REGRESIVA_MS);
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
  siguiente?: string; // revancha: código de la sala nueva (openspec: revancha-partidas)
  siguienteHost?: string; // revancha: id de quien la abrió (anfitrión de la sala nueva)
  secreto?: string; // juegos-salas-grandes: Dibuja; nunca sale del servidor (sinCanal lo quita)
}

interface EnSala extends Grandes.JugadorGrande { // juegos-salas-grandes: bingo, dibujo, aciertos, intentos, resultado
  id: string;
  nombre: string;
  tipo: Jugador["tipo"];
  unido: number;
  avatar?: { emoji: string; color: string };
  respuestas: Record<string, { correcta: boolean; puntos: number; ms: number; aciertos?: number }>; // aciertos: Línea del tiempo
  palabras?: Record<string, string>;
  basta?: number;
  rondasBasta?: Record<string, { palabras: Record<string, string>; basta?: number }>; // Basta por rondas
  loteria?: number; // hora del servidor del primer "¡Lotería!"
  unas?: { paso: number; t: number }[]; // ¡Una!: botón UNA por paso
  jugadas?: { n: number; accion: string; carta?: number; color?: string; una?: boolean; monto?: number; con?: number[]; a?: number | string; de?: string; promo?: string; pos?: number; angulo?: number; fuerza?: number; efecto?: number; barra?: number; t: number }[]; // juegos por turnos
  carrera?: Carrera & { t: number }; // Arcade: tiempo de la carrera, solo el primer envío (openspec: juegos-plataformas-karts)
  final?: number; // total del jugador al terminar
  podio?: { nombre: string; total: number; bot?: boolean }[]; // solo el host
  equipo?: 0 | 1; // futbolito-equipos: equipo pedido en la sala de espera (Futbolito 2v2)
  tactica?: FutbolLinea.TacticaFutbol; // futbol-en-linea: táctica elegida en la sala de espera
  personaje?: string; // personaje-en-salas: personaje de Karts o Axo elegido en la sala de espera
  futbol?: FutbolLinea.ReporteFutbol & { t: number }; // futbol-en-linea: resultado que vio (solo el primero)
  copa?: Copa.ReporteCopa[]; // karts-copa-en-sala: resultado de cada carrera de la copa (solo el primero de cada una)
  robot?: number; // futbolito-arena: color del robot pedido en la sala de espera (0–2)
  arena?: Arena.ReporteArena & { t: number }; // futbolito-arena: resultado que vio (solo el primero)
  brigada?: Brigada.ReporteBrigada & { t: number }; // brigada: resultado de la misión que vio (solo el primero)
  v?: number; // versión: sube en cada guardado; la página descarta avisos de Realtime más viejos (openspec: salas-realtime)
}

const RONDAS_BASTA = ["5", "10", "12"]; // Basta por rondas (openspec: basta-rondas)
// basta-divertida-una-robo: categorías divertidas que el anfitrión puede sumar (máximo 2). Misma lista que
// `extras` en juegos/datos/basta.json y Basta.CONOCIDAS en juegos/basta.js (server/basta_una_test.ts).
export const EXTRAS_BASTA = ["pokemon", "actor", "flor", "anime", "pelicula", "heroe", "antojito", "refri", "excusa", "kitchen"] as const;
export const MAX_EXTRAS_BASTA = 2;
// Normaliza `opciones.extra` (arreglo o texto "a,b") a "a,b"; "" sin extras; null si es inválida.
function extrasBasta(x: unknown): string | null {
  if (x === undefined || x === null || x === "") return "";
  let ids: unknown[] | null = null;
  if (Array.isArray(x)) ids = x;
  else if (typeof x === "string") ids = x.split(",");
  if (!ids || ids.length > MAX_EXTRAS_BASTA || new Set(ids).size !== ids.length) return null;
  if (!ids.every((id) => typeof id === "string" && (EXTRAS_BASTA as readonly string[]).includes(id))) return null;
  return ids.join(",");
}
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

// Código de 4 letras que aún no existe ("" si no se encontró en 10 intentos).
async function codigoLibre(store: Store): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const cand = [...aleatorio(4)].map((x) => LETRAS_CODIGO[x % LETRAS_CODIGO.length]).join("");
    if (!(await store.get(ruta(cand)))) return cand;
  }
  return "";
}

// Publica el estado fresco de una sala en su canal (si hay Realtime configurado).
async function publicarEstado(store: Store, codigo: string, ahora: number, rt?: ConfigRealtime) {
  if (!rt) return;
  cache.delete(codigo);
  const fresco = await estado(store, codigo, ahora);
  if (fresco?.sala.canal) await publicarSala(rt, fresco.sala.canal, { sala: sinCanal(fresco.sala), jugadores: vistaJugadores(fresco.sala.juego, Clasicos.ocultarJugadas(fresco.sala.juego, fresco.jugadores), null), ahora: Date.now(), ...Copa.vistaCopa(fresco.sala, fresco.jugadores, ahora) }); // clasicos-rapidos y juegos-tablero: sin elecciones de ppt ni flotas
}

// Revancha (openspec: revancha-partidas). La primera petición reserva `siguiente` en la sala vieja con escritura
// condicional; quien encuentre la sala nueva sin crear la crea (put con sha null: solo una gana) con la misma
// configuración y `siguienteHost` de anfitrión. Devuelve la sala vieja ya marcada, o un error.
async function reservarRevancha(store: Store, codigo: string, jugador: Jugador, terminada: boolean, ahora: number, lunes: string, nombreDe: (id: string) => string | undefined): Promise<Sala | "no_termino" | "sin_codigo" | "conflicto_escritura"> {
  let vieja = await store.get<Sala>(ruta(codigo));
  for (let i = 0; i < 3 && vieja && !vieja.data.siguiente; i++) {
    if (!terminada) return "no_termino";
    const cand = await codigoLibre(store);
    if (!cand) return "sin_codigo";
    const marcada = { ...vieja.data, siguiente: cand, siguienteHost: jugador.id };
    vieja = await store.put(ruta(codigo), marcada, vieja.sha, `sala ${codigo}: revancha ${cand}`) ? { data: marcada, sha: null } : await store.get<Sala>(ruta(codigo));
  }
  const base = vieja?.data;
  if (!base?.siguiente) return "conflicto_escritura";
  cache.delete(codigo);
  const sig = base.siguiente;
  if (!(await store.get(ruta(sig)))) {
    const host = base.siguienteHost ?? jugador.id;
    const nueva: Sala = { codigo: sig, juego: base.juego, opciones: { ...base.opciones }, seed: aleatorio(1)[0] % 2147483647, host, creada: ahora, inicio: null, bots: base.bots, canal: canalNuevo() };
    if (Copa.esCopaKarts(nueva)) nueva.opciones.mapa = Copa.pistasCopa(nueva.opciones.copa, nueva.seed)[0]; // karts-copa-en-sala: la mixta sortea otra vez
    if (await store.put(ruta(sig), nueva, null, `sala ${sig}: revancha de ${codigo}`)) {
      await indexar(store, lunes, { codigo: sig, juego: base.juego, host: nombreDe(host) ?? jugador.nombre, creada: ahora });
    }
  }
  return base;
}

// sub: "" (crear) o "/<código>[/unirse|/empezar|/respuesta|/revancha]"
// La sala que se devuelve o se publica, sin el canal secreto.
const sinCanal = (s: Sala): Sala => { const { canal: _c, secreto: _s, ...resto } = s; return resto; }; // juegos-salas-grandes: sin secreto

// Contexto de una sala que ya existe, compartido por sus acciones (unirse, empezar, respuesta, revancha y ver).
interface CtxSala {
  body: Record<string, unknown>;
  jugador: Jugador;
  store: Store;
  ahora: number;
  json: Json;
  codigo: string;
  sala: Sala;
  jugadores: EnSala[];
  dentro: boolean;
  publicar: () => Promise<void>;
}
type CambioJugador = (e: EnSala) => EnSala;

// POST /juegos/sala: opciones del juego nuevo ya validadas, o el código de error (todos se responden con 400).
function opcionesNuevaSala(juego: string, op: Record<string, unknown>): Record<string, string> | string {
  const opciones: Record<string, string> = {};
  if (typeof op.cat === "string" && op.cat.length <= 30) opciones.cat = op.cat;
  if (juego === "poker" && op.equipos === "1") opciones.equipos = "1"; // póker por equipos A/B
  if (juego === "ajedrez") opciones.reloj = ["5", "10", "15"].includes(String(op.reloj)) ? String(op.reloj) : "10"; // minutos por jugador
  if (juego === "loteria") {
    if (op.modo !== undefined && op.modo !== "linea" && op.modo !== "llena") return "modo_invalido";
    opciones.modo = (op.modo as string) || "linea";
  }
  if (juego.startsWith("basta")) {
    const rondas = op.rondas === undefined ? "10" : String(op.rondas);
    if (!RONDAS_BASTA.includes(rondas)) return "rondas_invalidas";
    opciones.rondas = rondas;
    const extra = extrasBasta(op.extra); // basta-divertida-una-robo
    if (extra === null) return "extras_invalidas";
    if (extra) opciones.extra = extra;
  }
  if (CARRERAS[juego]) { // Arcade: nivel o pista en las opciones (openspec: juegos-plataformas-karts)
    const mapa = mapaDeSala(juego, op.mapa, aleatorio(1)[0]);
    if (!mapa) return "mapa_invalido";
    opciones.mapa = mapa;
    if (juego === "karts") { // karts-copa-en-sala: «Una carrera» o «Copa completa» (el mapa pasa a ser su 1.ª pista)
      const copa = Copa.opcionesCopa(op);
      if (typeof copa === "string") return copa;
      Object.assign(opciones, copa);
    }
  }
  if (juego === "futbolito") { // futbolito-equipos: 1v1 (por omisión) o 2v2
    const f = Futbolito.formatoDe(op);
    if (!f) return "formato_invalido";
    opciones.formato = f;
  }
  if (Arena.esArena(juego)) { // futbolito-arena: formato, arena y goles
    const o = Arena.opcionesArena(op);
    if (typeof o === "string") return o;
    Object.assign(opciones, o);
  }
  if (Brigada.esBrigada(juego)) { // brigada: misión de la sala
    const o = Brigada.opcionesBrigada(op);
    if (typeof o === "string") return o;
    Object.assign(opciones, o);
  }
  if (juego === "cultura-linea") { // cultura-conocimiento: el tema de la Línea del tiempo va en opciones.cat
    if (op.cat !== undefined && !TEMAS_LINEA.includes(op.cat as string)) return "tema_invalido";
    opciones.cat = (op.cat as string) ?? "todos";
  }
  if (juego === "en-frases") {
    if (op.tema !== undefined && !TEMAS_INGLES.includes(op.tema as string)) return "tema_invalido";
    opciones.tema = (op.tema as string) ?? "todo";
  }
  if (Clasicos.esClasicoRapido(juego)) { // clasicos-rapidos: modo del Ahorcado
    const o = Clasicos.opcionesClasicos(juego, op);
    if (typeof o === "string") return o;
    Object.assign(opciones, o);
  }
  { const e = Grandes.opcionesGrandes(juego, op, opciones); if (e) return e; } // juegos-salas-grandes
  return opciones;
}

// POST /juegos/sala → crear
async function crearSala(body: Record<string, unknown>, jugador: Jugador, store: Store, ahora: number, json: Json, lunes: string): Promise<Response> {
  const juego = String(body.juego || "");
  if (!JUEGOS_PARTIDA.has(juego)) return json({ error: "juego_no_permitido" }, 400);
  const op = (body.opciones && typeof body.opciones === "object") ? body.opciones as Record<string, unknown> : {};
  const opciones = opcionesNuevaSala(juego, op);
  if (typeof opciones === "string") return json({ error: opciones }, 400);
  const codigo = await codigoLibre(store);
  if (!codigo) return json({ error: "sin_codigo" }, 503);
  const sala: Sala = { codigo, juego, opciones, seed: aleatorio(1)[0] % 2147483647, host: jugador.id, creada: ahora, inicio: null, bots: botsFijos(juego) ?? body.bots !== false, canal: canalNuevo() };
  if (Copa.esCopaKarts(sala)) opciones.mapa = Copa.pistasCopa(opciones.copa, sala.seed)[0]; // karts-copa-en-sala
  // errores-latentes: sin sala o sin anfitrión guardados no hay partida (y no queda una sala sin anfitrión).
  if (!(await store.put(ruta(codigo), sala, null, `sala ${codigo}: nueva (${juego})`))) return json({ error: "conflicto_escritura" }, 503);
  if (!(await guardarJugador(store, codigo, jugador, (e) => e, ahora))) {
    await store.remove(ruta(codigo), `sala ${codigo}: sin anfitrión`);
    cache.delete(codigo);
    return json({ error: "conflicto_escritura" }, 503);
  }
  await indexar(store, lunes, { codigo, juego, host: jugador.nombre, creada: ahora });
  return json({ codigo, sala: sinCanal(sala) });
}

// futbolito-equipos y futbolito-arena: equipo pedido en la sala de espera (cada juego con su regla).
function equipoPedido(c: CtxSala) {
  const { body, jugador, sala, jugadores } = c;
  if (Arena.esArena(sala.juego)) return Arena.validarEquipoArena(sala, jugadores, jugador.id, body.equipo); // futbolito-arena
  return Futbolito.validarEquipo(sala.opciones?.formato, sala.inicio !== null, jugadores, jugador.id, body.equipo);
}
// POST /juegos/sala/<código>/unirse
async function unirseSala(c: CtxSala): Promise<Response> {
  const { body, jugador, store, ahora, json, codigo, sala, jugadores, dentro, publicar } = c;
  // futbolito-equipos: { equipo } guarda la preferencia de equipo (también para quien ya está dentro).
  const equipo = body.equipo === undefined ? undefined : equipoPedido(c);
  if (equipo !== undefined && typeof equipo === "object") return json({ error: equipo.error }, equipo.status);
  const soloAsiento = cambioDeAsiento(c); // futbol-en-linea y personaje-en-salas: táctica o personaje del asiento
  if (soloAsiento) return soloAsiento;
  if (dentro && equipo === undefined) return json({ ok: true, codigo });
  if (!dentro && sala.inicio !== null) return json({ error: "ya_empezo" }, 409);
  if (!dentro && jugadores.length >= cupo(sala.juego, sala.opciones)) return json({ error: "sala_llena" }, 409);
  const guardado = await guardarJugador(store, codigo, jugador, (e) => equipo === undefined ? e : { ...e, equipo }, ahora);
  if (!guardado) return json({ error: "conflicto_escritura" }, 503); // errores-latentes: no se guardó, no está dentro
  if (equipo !== undefined) { await publicar(); return json({ ok: true, codigo, equipo }); } // futbolito-equipos
  await publicar();
  return json({ ok: true, codigo });
}

// futbol-en-linea: { tactica } en /unirse guarda la táctica del asiento (solo en salas de futbol y antes de empezar).
function tacticaDeAsiento(sala: Sala, crudo: unknown): FutbolLinea.TacticaFutbol | { error: string; status: number } {
  if (sala.juego !== "futbol") return { error: "tactica_invalida", status: 400 };
  if (sala.inicio !== null) return { error: "ya_empezo", status: 409 };
  return FutbolLinea.validarTactica(crudo) ?? { error: "tactica_invalida", status: 400 };
}
async function guardarTactica(c: CtxSala, tactica: FutbolLinea.TacticaFutbol): Promise<Response> {
  const { jugador, store, ahora, json, codigo, sala, jugadores, dentro, publicar } = c;
  if (!dentro && jugadores.length >= cupo(sala.juego, sala.opciones)) return json({ error: "sala_llena" }, 409);
  if (!(await guardarJugador(store, codigo, jugador, (e) => ({ ...e, tactica }), ahora))) return json({ error: "conflicto_escritura" }, 503);
  await publicar();
  return json({ ok: true, codigo, tactica });
}
// { tactica } (futbol-en-linea) o { personaje } (personaje-en-salas) en /unirse solo cambian el asiento; null si no vienen.
function cambioDeAsiento(c: CtxSala): Promise<Response> | null {
  const { body, sala, json } = c;
  if (body.tactica !== undefined) {
    const tactica = tacticaDeAsiento(sala, body.tactica);
    return "error" in tactica ? Promise.resolve(json({ error: tactica.error }, tactica.status)) : guardarTactica(c, tactica);
  }
  if (body.robot !== undefined) return guardarRobot(c, body.robot); // futbolito-arena
  return body.personaje === undefined ? null : guardarPersonaje(c, body.personaje);
}
// futbolito-arena: { robot } en /unirse guarda el color del robot del asiento (antes de empezar).
async function guardarRobot(c: CtxSala, crudo: unknown): Promise<Response> {
  const { jugador, store, ahora, json, codigo, sala, jugadores, dentro, publicar } = c;
  if (!Arena.esArena(sala.juego) || !Arena.validarRobot(crudo)) return json({ error: "robot_invalido" }, 400);
  if (sala.inicio !== null) return json({ error: "ya_empezo" }, 409);
  if (!dentro && jugadores.length >= cupo(sala.juego, sala.opciones)) return json({ error: "sala_llena" }, 409);
  const robot = crudo as number;
  if (!(await guardarJugador(store, codigo, jugador, (e) => ({ ...e, robot }), ahora))) return json({ error: "conflicto_escritura" }, 503);
  await publicar();
  return json({ ok: true, codigo, robot });
}
// personaje-en-salas: { personaje } en /unirse guarda el personaje del asiento (solo en salas de Karts o Axo, antes de
// empezar). Como la táctica: quien no está dentro entra con él si hay lugar.
const JUEGOS_PERSONAJE = new Set(["karts", "plataformas", "brigada"]); // brigada: personaje de la brigada en la sala
async function guardarPersonaje(c: CtxSala, crudo: unknown): Promise<Response> {
  const { jugador, store, ahora, json, codigo, sala, jugadores, dentro, publicar } = c;
  if (!JUEGOS_PERSONAJE.has(sala.juego) || !esPersonaje(crudo)) return json({ error: "personaje_invalido" }, 400);
  if (sala.inicio !== null) return json({ error: "ya_empezo" }, 409);
  if (!dentro && jugadores.length >= cupo(sala.juego, sala.opciones)) return json({ error: "sala_llena" }, 409);
  const personaje = crudo;
  if (!(await guardarJugador(store, codigo, jugador, (e) => ({ ...e, personaje }), ahora))) return json({ error: "conflicto_escritura" }, 503);
  await publicar();
  return json({ ok: true, codigo, personaje });
}
// futbol-en-linea: resultado de la sala con la regla del servidor (vacío en otros juegos).
const vistaFutbol = (sala: Sala, jugadores: EnSala[]) => sala.juego === "futbol" ? { futbol: FutbolLinea.resultadoFutbol(sala.host, jugadores) } : {};

// POST /juegos/sala/<código>/empezar (solo el anfitrión)
function empezarSala(c: CtxSala): Promise<Response> {
  const { jugador, ahora, json, sala, jugadores } = c;
  if (sala.host !== jugador.id) return Promise.resolve(json({ error: "solo_host" }, 403));
  const minimo = mesaDe(sala.juego, sala.opciones)?.min ?? 1; // futbolito-equipos: mesa por formato
  if (sala.inicio === null && enMesa(sala.juego, jugadores.length, sala.bots, sala.opciones) < minimo) return Promise.resolve(json({ error: "faltan_jugadores", minimo }, 409));
  if (sala.inicio !== null) return Promise.resolve(json({ ok: true, sala: sinCanal(sala), ahora }));
  return fijarInicio(c, 3);
}

// errores-latentes: fija `inicio` con la versión fresca de la sala (hasta `intentos` veces, en secuencia: cada
// intento relee el sha); si otra petición ya la empezó, se responde esa sala sin reescribirla.
async function fijarInicio(c: CtxSala, intentos: number): Promise<Response> {
  const { store, ahora, json, codigo, publicar } = c;
  const doc = await store.get<Sala>(ruta(codigo));
  if (!doc) return json({ error: "sala_no_existe" }, 404);
  if (doc.data.inicio !== null) { cache.delete(codigo); return json({ ok: true, sala: sinCanal(doc.data), ahora }); }
  const nueva = { ...doc.data, inicio: ahora + cuentaRegresiva(doc.data.juego), ...Grandes.alEmpezarGrande(doc.data, canalNuevo) }; // + secreto de Dibuja
  if (await store.put(ruta(codigo), nueva, doc.sha, `sala ${codigo}: empieza`)) {
    cache.delete(codigo);
    await publicar();
    return json({ ok: true, sala: sinCanal(nueva), ahora });
  }
  return intentos > 1 ? fijarInicio(c, intentos - 1) : json({ error: "conflicto_escritura" }, 503);
}

// Juegos por turnos (¡Una!, póker, Brisca, Conquián): cada jugada con su paso n; nadie más puede tener ese paso.
function cambioDeJugada(c: CtxSala): CambioJugador | Response {
  const { body, jugador, ahora, json, sala, jugadores } = c;
  const v = validarJugada(sala.juego, body.jugada);
  if (!v) return json({ error: "jugada_invalida" }, 400);
  // futbolito-billar: con un final registrado la partida ya terminó.
  if (FISICA.has(sala.juego) && jugadores.some((x) => x.final !== undefined || x.podio !== undefined)) return json({ error: "partida_terminada" }, 409);
  if (sala.juego === "futbolito") { // futbolito-equipos: el tiro debe usar una barra de quien lo manda
    const e = Futbolito.validarTiro(sala.opciones?.formato, Futbolito.asientosDe(jugadores, mesaDe(sala.juego, sala.opciones)!, sala.bots), jugador.id, v);
    if (e) return json({ error: e.error }, e.status);
  }
  const n = v.n;
  if (!Clasicos.sinTurnoUnico(sala.juego) && jugadores.some((x) => x.id !== jugador.id && (x.jugadas || []).some((y) => y.n === n))) return json({ error: "turno_tomado" }, 409); // clasicos-rapidos: ppt juega la misma ronda
  const nueva = { ...v, t: ahora };
  return (e: EnSala) => (e.jugadas || []).some((y) => y.n === n) ? e : { ...e, jugadas: [...(e.jugadas || []), nueva].slice(-600) };
}

// Cierre: total final de cada jugador y, del host, el podio completo (con bots).
function cambioDeCierre(c: CtxSala): CambioJugador {
  const { body, jugador, sala } = c;
  const final = Math.max(0, Math.min(MAX_FINAL, Math.round(Number(body.final) || 0)));
  const podio = sala.host === jugador.id && Array.isArray(body.podio)
    ? (body.podio as Record<string, unknown>[]).slice(0, 32).map((x) => ({ nombre: String(x?.nombre ?? "").slice(0, 30), total: Math.max(0, Math.min(MAX_FINAL, Math.round(Number(x?.total) || 0))), ...(x?.bot ? { bot: true } : {}) }))
    : undefined;
  return (e: EnSala) => ({ ...e, ...(body.final !== undefined ? { final } : {}), ...(podio ? { podio } : {}) });
}

// Basta: palabras y ¡Basta! de la partida o, en Basta por rondas, de cada ronda.
function cambioDeBasta(c: CtxSala): CambioJugador | Response {
  const { body, ahora, json, sala } = c;
  if (body.palabras !== undefined && (typeof body.palabras !== "object" || body.palabras === null || Array.isArray(body.palabras))) return json({ error: "palabras_invalidas" }, 400);
  const palabras = Object.fromEntries(Object.entries((body.palabras || {}) as Record<string, unknown>).slice(0, 10)
    .map(([k, v]) => [String(k).slice(0, 20), String(v ?? "").trim().slice(0, 40)]));
  if (body.ronda !== undefined) {
    // Basta por rondas: palabras y primer ¡Basta! de cada ronda.
    const ronda = Number(body.ronda);
    if (!Number.isInteger(ronda) || ronda < 0 || ronda >= Number(sala.opciones.rondas || 1)) return json({ error: "ronda_invalida" }, 400);
    return (e: EnSala) => {
      const previa = (e.rondasBasta || {})[ronda];
      // El primer ¡Basta! de la ronda se conserva; si no hay, cuenta el de ahora.
      let basta: { basta?: number } = {};
      if (previa?.basta) basta = { basta: previa.basta };
      else if (body.basta === true) basta = { basta: ahora };
      const r = { palabras: body.palabras !== undefined ? palabras : (previa?.palabras ?? {}), ...basta };
      return { ...e, rondasBasta: { ...(e.rondasBasta || {}), [ronda]: r } };
    };
  }
  return (e: EnSala) => ({ ...e, palabras: body.palabras !== undefined ? palabras : e.palabras, basta: body.basta === true && !e.basta ? ahora : e.basta });
}

// cultura-conocimiento: Línea del tiempo — 5 líneas, aciertos 0–6 obligatorios, hasta 60 s, y puntos recortados a
// 20 por acierto + 80 si la línea es perfecta.
function cambioDeLinea(c: CtxSala): CambioJugador | Response {
  const { body, json } = c;
  const q = Number(body.q), aciertos = body.aciertos;
  if (!Number.isInteger(q) || q < 0 || q >= RONDAS_LINEA || typeof body.correcta !== "boolean" || !entero(aciertos, 0, SUCESOS_MAX_LINEA)) return json({ error: "respuesta_invalida" }, 400);
  const tope = 20 * (aciertos as number) + (body.correcta ? 80 : 0);
  const puntos = Math.max(0, Math.min(tope, Math.round(Number(body.puntos) || 0)));
  const ms = Math.max(0, Math.min(MS_MAX_LINEA, Math.round(Number(body.ms) || 0)));
  return (e: EnSala) => e.respuestas[q] ? e : ({ ...e, respuestas: { ...e.respuestas, [q]: { correcta: body.correcta as boolean, puntos, ms, aciertos: aciertos as number } } });
}

// Quiz (preguntas): respuesta de la pregunta q; solo cuenta la primera.
function cambioDeQuiz(c: CtxSala): CambioJugador | Response {
  const { body, json } = c;
  const q = Number(body.q);
  if (!Number.isInteger(q) || q < 0 || q >= PREGUNTAS || typeof body.correcta !== "boolean") return json({ error: "respuesta_invalida" }, 400);
  const puntos = Math.max(0, Math.min(200, Math.round(Number(body.puntos) || 0)));
  const ms = Math.max(0, Math.min(20000, Math.round(Number(body.ms) || 0)));
  return (e: EnSala) => e.respuestas[q] ? e : ({ ...e, respuestas: { ...e.respuestas, [q]: { correcta: body.correcta as boolean, puntos, ms } } });
}

// futbol-en-linea: el primer reporte de resultado de cada quien, si es plausible.
function cambioDeFutbol(c: CtxSala, inicio: number): CambioJugador | Response {
  const { body, ahora, json, sala } = c;
  const r = sala.juego === "futbol" ? FutbolLinea.validarResultado(body.futbol, inicio, ahora) : null;
  if (!r) return json({ error: "resultado_invalido" }, 400);
  return (e: EnSala) => e.futbol ? e : { ...e, futbol: { ...r, t: ahora } };
}

// Elige cómo cambia el archivo del jugador según lo que trae la respuesta, o la respuesta de error.
// deGrande: el cambio que ya resolvió juegos-salas-grandes (si aplica).
function cambioDeRespuesta(c: CtxSala, inicio: number, deGrande: CambioJugador | undefined): CambioJugador | Response {
  const { body, jugador, ahora, json, sala, jugadores } = c;
  // juegos-tablero: Batalla naval guarda la flota y resuelve cada disparo en el servidor (server/naval.ts).
  const naval = sala.juego === "naval" ? respuestaNaval(inicio, jugadores, jugador.id, body, ahora) : null;
  if (naval && "error" in naval) return json({ error: naval.error }, naval.status);
  if (naval) return naval.cambiar;
  if (deGrande) return deGrande;
  if (body.una !== undefined && body.jugada === undefined) {
    const paso = Number((body.una as Record<string, unknown>)?.paso);
    if (!Number.isInteger(paso) || paso < 0 || paso > 2000) return json({ error: "una_invalida" }, 400);
    return (e: EnSala) => (e.unas || []).some((u) => u.paso === paso) ? e : { ...e, unas: [...(e.unas || []), { paso, t: ahora }].slice(-100) };
  }
  if (body.jugada !== undefined) return cambioDeJugada(c);
  if (body.futbol !== undefined) return cambioDeFutbol(c, inicio); // futbol-en-linea
  if (body.arena !== undefined) { // futbolito-arena: el primer reporte de cada quien, si es plausible
    const r = Arena.esArena(sala.juego) ? Arena.validarReporte(sala, body.arena, inicio, ahora) : null;
    if (!r) return json({ error: "resultado_invalido" }, 400);
    return (e: EnSala) => e.arena ? e : { ...e, arena: { ...r, t: ahora } };
  }
  if (body.brigada !== undefined) { // brigada: el primer reporte de cada quien, si es plausible
    const r = Brigada.esBrigada(sala.juego) ? Brigada.validarReporteBrigada(sala, jugadores.map((x) => x.id), body.brigada, inicio, ahora) : null;
    if (!r) return json({ error: "resultado_invalido" }, 400);
    return (e: EnSala) => e.brigada ? e : { ...e, brigada: { ...r, t: ahora } };
  }
  if (body.copa !== undefined) { // karts-copa-en-sala: resultado de la carrera en curso de la copa
    const r = Copa.reporteCopa(sala, jugadores, body.copa, ahora);
    return "error" in r ? json({ error: r.error }, r.status) : r.cambiar;
  }
  if (body.carrera !== undefined && Copa.esCopaKarts(sala)) return json({ error: "carrera_invalida" }, 400); // en copa, cada carrera va en `copa`
  if (body.carrera !== undefined) {
    // Carreras de Arcade (server/carreras.ts): tiempo validado con el reloj del servidor; solo cuenta el primero.
    const carrera = validarCarrera(sala.juego, body.carrera, inicio, ahora, sala.opciones?.mapa); // karts-pistas-grandes: límites de la pista
    if (!carrera) return json({ error: "carrera_invalida" }, 400);
    return (e: EnSala) => e.carrera ? e : { ...e, carrera: { ...carrera, t: ahora } };
  }
  if (body.loteria === true) return (e: EnSala) => e.loteria ? e : { ...e, loteria: ahora };
  if (body.final !== undefined || body.podio !== undefined) return cambioDeCierre(c);
  if (sala.juego.startsWith("basta")) return cambioDeBasta(c);
  if (sala.juego === "cultura-linea") return cambioDeLinea(c);
  return cambioDeQuiz(c);
}

// POST /juegos/sala/<código>/respuesta
async function responderSala(c: CtxSala): Promise<Response> {
  const { body, jugador, store, ahora, json, codigo, sala, jugadores, dentro, publicar } = c;
  if (!dentro) return json({ error: "no_en_sala" }, 403);
  if (sala.inicio === null) return json({ error: "no_empezo" }, 409);
  // juegos-salas-grandes: ¡Bingo!, trazo y adivina de Dibuja, y resultado de Memorama y Sopa
  const grande = Grandes.respuestaGrande(sala, jugadores, jugador.id, body, ahora);
  if (grande && "error" in grande) {
    if (grande.cambiar && await guardarJugador(store, codigo, jugador, grande.cambiar, ahora)) await publicar();
    return json({ error: grande.error }, grande.status);
  }
  const cambiar = cambioDeRespuesta(c, sala.inicio, grande?.cambiar);
  if (typeof cambiar !== "function") return cambiar;
  const nuevo = await guardarJugador(store, codigo, jugador, cambiar, ahora);
  if (!nuevo) return json({ error: "conflicto_escritura" }, 503);
  await publicar();
  return json({ ok: true, respuestas: nuevo.respuestas, palabras: nuevo.palabras, basta: nuevo.basta, rondasBasta: nuevo.rondasBasta, loteria: nuevo.loteria, jugadas: nuevo.jugadas, unas: nuevo.unas,
    ...(grande ? { ...grande.respuesta, bingo: nuevo.bingo, resultado: nuevo.resultado } : {}), // juegos-salas-grandes
    ...vistaFutbol(sala, jugadores.map((x) => x.id === jugador.id ? nuevo : x)), // futbol-en-linea
    ...Arena.vistaArena(sala, jugadores.map((x) => x.id === jugador.id ? nuevo : x)), // futbolito-arena
    ...Brigada.vistaBrigada(sala, jugadores.map((x) => x.id === jugador.id ? nuevo : x)), // brigada
    ...Copa.vistaCopa(sala, jugadores.map((x) => x.id === jugador.id ? nuevo : x), ahora) }); // karts-copa-en-sala
}

// POST /juegos/sala/<código>/revancha → { codigo } de la sala nueva, con quien la pidió dentro.
async function revanchaSala(c: CtxSala, lunes: string, rt?: ConfigRealtime): Promise<Response> {
  const { jugador, store, ahora, json, codigo, sala, jugadores, dentro, publicar } = c;
  if (!dentro) return json({ error: "no_en_sala" }, 403);
  // Terminó: algún jugador ya mandó su total final (lo envía la página al pintar el podio, en todos los juegos).
  const terminada = sala.inicio !== null && jugadores.some((j) => j.final !== undefined || j.podio !== undefined);
  const base = await reservarRevancha(store, codigo, jugador, terminada, ahora, lunes, (id) => jugadores.find((j) => j.id === id)?.nombre);
  if (typeof base === "string") return json({ error: base }, base === "no_termino" ? 409 : 503);
  const sig = base.siguiente!;
  cache.delete(sig);
  const nueva = await estado(store, sig, ahora);
  if (!nueva) return json({ error: "conflicto_escritura" }, 503);
  if (!nueva.jugadores.some((j) => j.id === jugador.id)) {
    if (nueva.sala.inicio !== null) return json({ error: "ya_empezo", codigo: sig }, 409);
    if (nueva.jugadores.length >= cupo(nueva.sala.juego, nueva.sala.opciones)) return json({ error: "sala_llena", codigo: sig }, 409);
    if (!(await guardarJugador(store, sig, jugador, (e) => e, ahora))) return json({ error: "conflicto_escritura", codigo: sig }, 503); // errores-latentes
  }
  await publicar();
  await publicarEstado(store, sig, ahora, rt);
  return json({ ok: true, codigo: sig });
}

// GET /juegos/sala/<código>: estado de la sala para quien está dentro (o el admin).
function verSala(c: CtxSala, rt?: ConfigRealtime): Response {
  const { jugador, ahora, json, sala, jugadores, dentro } = c;
  if (!dentro && jugador.tipo !== "admin") return json({ error: "no_en_sala" }, 403);
  const enVivo = rt && sala.canal ? { rt: { url: rt.url, key: rt.publica, topic: topicDe(sala.canal) } } : {};
  // karts-salida-y-puntos: `reloj` = hora del servidor al responder (`ahora` es la de cuando empezó a atender); con las
  // dos, la página acota su desfase sin el tiempo de procesamiento (juegos/reloj-sala.js).
  return json({ sala: sinCanal(sala), jugadores: vistaJugadores(sala.juego, Clasicos.ocultarJugadas(sala.juego, jugadores, jugador.id), jugador.id), ahora, reloj: Date.now(), yo: jugador.id, soyHost: sala.host === jugador.id, ...enVivo,
    ...Grandes.vistaGrande(sala, jugadores, jugador.id, ahora), ...vistaFutbol(sala, jugadores), ...Arena.vistaArena(sala, jugadores) /* futbolito-arena */, ...Brigada.vistaBrigada(sala, jugadores) /* brigada */, ...Copa.vistaCopa(sala, jugadores, ahora) }); // karts-copa-en-sala // futbol-en-linea // clasicos-rapidos y juegos-tablero: solo tu elección y tu flota; juegos-salas-grandes: la palabra de Dibuja, solo a quien dibuja
}

export async function handleSalas(req: Request, sub: string, jugador: Jugador, store: Store, ahoraIso: string, json: Json, lunes: string, rt?: ConfigRealtime): Promise<Response> {
  const ahora = Date.parse(ahoraIso);
  let body: Record<string, unknown> = {};
  if (req.method === "POST") {
    const txt = await req.text();
    if (txt) { try { body = JSON.parse(txt); } catch { return json({ error: "json_invalido" }, 400); } }
  }

  // POST /juegos/sala → crear
  if (sub === "" && req.method === "POST") return crearSala(body, jugador, store, ahora, json, lunes);

  const m = sub.match(/^\/([A-Z]{4})(\/(unirse|empezar|respuesta|revancha))?$/);
  if (!m) return json({ error: "not_found" }, 404);
  const [, codigo, , accion] = m;
  const est = await estado(store, codigo, ahora);
  if (!est) return json({ error: "sala_no_existe" }, 404);
  const { sala, jugadores } = est;
  if (ahora - sala.creada > VIGENCIA_MS) return json({ error: "sala_vencida" }, 410);
  const dentro = jugadores.some((j) => j.id === jugador.id);
  // Tras un cambio: publicar el estado fresco en el canal de la sala (si hay Realtime configurado).
  const publicar = () => publicarEstado(store, codigo, ahora, rt);
  const c: CtxSala = { body, jugador, store, ahora, json, codigo, sala, jugadores, dentro, publicar };

  if (accion === "unirse" && req.method === "POST") return unirseSala(c);
  if (accion === "empezar" && req.method === "POST") return empezarSala(c);
  if (accion === "respuesta" && req.method === "POST") return responderSala(c);
  if (accion === "revancha" && req.method === "POST") return revanchaSala(c, lunes, rt);
  if (!accion && req.method === "GET") return verSala(c, rt);

  return json({ error: "metodo_no_permitido" }, 405);
}
