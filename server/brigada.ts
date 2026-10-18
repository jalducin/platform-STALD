// «🦎 Brigada Xalli» en el servidor (openspec: brigada-xalli, design.md §10 y §12). Las reglas (forma del avance, puntos
// máximos de cada misión y puntos de ranking) viven en juegos/brigada-motor.js, el mismo archivo que usa la página: el
// servidor lo importa (como server/arena.ts importa juegos/arena-motor.js). Aquí solo va lo del servidor: avance,
// opciones de la sala, reporte de cada persona, resultado aceptado y puntos de ranking de la sala.
import "../juegos/brigada-misiones.js";
import "../juegos/brigada-motor.js";
import "../juegos/mesas.js";
import type { Store } from "./store.ts";

export const JUEGO_BRIGADA = "brigada";
export const MISIONES_SALA = ["1", "2", "3", "4"];
const MS_MIN = 20_000, MS_MAX = 40 * 60_000, HOLGURA_MS = 5_000;

const BM = (globalThis as unknown as {
  BrigadaMotor: {
    validarProgreso(datos: unknown): boolean;
    puntosMaximos(mision: number, n: number): number;
    puntosRanking(puntos: number): number;
  };
}).BrigadaMotor;
const MESAS = (globalThis as unknown as {
  Mesas: { botsEnMesa(juego: string, humanos: number, conBots: boolean, opciones?: Record<string, string>): number | null };
}).Mesas;

export interface ReporteBrigada { mision: number; ms: number; completada: boolean; puntos: Record<string, number>; corte?: true }
export interface ResultadoBrigada {
  estado: "confirmado" | "disputa" | "anfitrion" | "invitado" | "pendiente";
  mision: number; completada: boolean; puntos: Record<string, number>; ranking: Record<string, number>; equipo: number;
}
interface JugadorBrigada { id: string; unido?: number; brigada?: ReporteBrigada & { t?: number } }
interface SalaBrigada { juego: string; host: string; opciones: Record<string, string>; bots: boolean; inicio: number | null }

// PUT /juegos/progreso/brigada: forma exacta y versionada ({ ver: 1, desbloqueada, personaje, misiones, companeros,
// totales }), sin misiones por encima de la desbloqueada y con récords posibles.
export const validarProgresoBrigada = (datos: unknown) => BM.validarProgreso(datos);
export const puntosMaximosBrigada = (mision: number, n: number) => BM.puntosMaximos(mision, n);
export const puntosRankingBrigada = (puntos: number) => BM.puntosRanking(puntos);
export const esBrigada = (juego: string) => juego === JUEGO_BRIGADA;

// POST /juegos/sala: { mision: "1"…"4" } ("1" por omisión) o el código de error (400).
export function opcionesBrigada(op: Record<string, unknown>): { mision: string } | "mision_invalida" {
  const m = op.mision === undefined ? "1" : String(op.mision);
  return MISIONES_SALA.includes(m) ? { mision: m } : "mision_invalida";
}

// Personajes de la misión: personas de la sala + compañeros IA de la mesa (para el máximo de puntos posible).
const personajesDe = (sala: SalaBrigada, personas: number) => personas + (MESAS.botsEnMesa(JUEGO_BRIGADA, personas, sala.bots, sala.opciones) ?? 0);
const entero = (x: unknown, a: number, b: number) => typeof x === "number" && Number.isInteger(x) && x >= a && x <= b;

// POST /respuesta { brigada }: reporte plausible para la misión de la sala, o null.
export function validarReporteBrigada(sala: SalaBrigada, ids: string[], crudo: unknown, inicio: number, ahora: number): ReporteBrigada | null {
  if (!crudo || typeof crudo !== "object" || Array.isArray(crudo)) return null;
  const r = crudo as Record<string, unknown>, mision = Number(sala.opciones?.mision || "1");
  if (r.mision !== mision || !entero(r.ms, MS_MIN, MS_MAX) || (r.ms as number) > ahora - inicio + HOLGURA_MS || typeof r.completada !== "boolean") return null;
  const puntos = r.puntos;
  if (!puntos || typeof puntos !== "object" || Array.isArray(puntos)) return null;
  const tope = BM.puntosMaximos(mision, personajesDe(sala, ids.length));
  const filas = Object.entries(puntos as Record<string, unknown>);
  if (filas.length > ids.length || !filas.every(([id, p]) => ids.includes(id) && entero(p, 0, tope))) return null;
  return { mision, ms: r.ms as number, completada: r.completada, puntos: Object.fromEntries(filas) as Record<string, number>, ...(r.corte === true ? { corte: true as const } : {}) };
}

const iguales = (a: Record<string, number>, b: Record<string, number>) => Object.keys(b).every((k) => a[k] === b[k]);
// Resultado aceptado de la sala: con el del anfitrión, confirmado si todos coinciden y en disputa si alguien difiere
// (cuenta el del anfitrión); sin el del anfitrión, el primer invitado; sin reportes, pendiente.
export function resultadoBrigada(sala: SalaBrigada, jugadores: JugadorBrigada[]): ResultadoBrigada {
  const reportes = jugadores.filter((j) => j.brigada).sort((a, b) => (a.brigada!.t ?? 0) - (b.brigada!.t ?? 0));
  const mision = Number(sala.opciones?.mision || "1");
  const anf = reportes.find((j) => j.id === sala.host);
  const base = anf ?? reportes[0];
  if (!base) return { estado: "pendiente", mision, completada: false, puntos: {}, ranking: {}, equipo: 0 };
  let estado: ResultadoBrigada["estado"] = anf ? "anfitrion" : "invitado";
  if (anf) {
    const otros = reportes.filter((j) => j !== anf);
    if (otros.some((j) => !iguales(anf.brigada!.puntos, j.brigada!.puntos))) estado = "disputa";
    else if (otros.length >= jugadores.length - 1) estado = "confirmado";
  }
  const puntos = base.brigada!.puntos;
  return {
    estado, mision, completada: base.brigada!.completada, puntos,
    ranking: Object.fromEntries(Object.entries(puntos).map(([id, p]) => [id, BM.puntosRanking(p)])),
    equipo: Object.values(puntos).reduce((s, p) => s + p, 0),
  };
}
export const vistaBrigada = (sala: SalaBrigada, jugadores: JugadorBrigada[]) => (esBrigada(sala.juego) ? { brigada: resultadoBrigada(sala, jugadores) } : {});

// Puntos de ranking de una persona en una sala de Brigada: los del resultado del servidor; "pendiente" si nadie ha
// reportado; null si la sala no es de este juego.
export async function puntosBrigadaSala(store: Store, codigo: string, jugadorId: string): Promise<number | "pendiente" | null> {
  const sala = (await store.get<SalaBrigada>(`juegos/salas/${codigo}/sala.json`))?.data;
  if (!sala || !esBrigada(sala.juego)) return null;
  const nombres = (await store.list(`juegos/salas/${codigo}`)).filter((n) => n.endsWith(".json") && n !== "sala.json");
  const jugadores = (await Promise.all(nombres.map((n) => store.get<JugadorBrigada>(`juegos/salas/${codigo}/${n}`)))).filter((d) => d?.data?.id).map((d) => d!.data);
  const r = resultadoBrigada(sala, jugadores);
  if (r.estado === "pendiente") return "pendiente";
  return r.ranking[jugadorId] ?? 0;
}
