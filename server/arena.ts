// «⚽ Futbolito Arena» en sala (openspec: futbolito-arena, design.md §6 y §9). Las reglas (opciones, reparto de equipos,
// validación del resultado y puntos) viven en juegos/arena-motor.js, el mismo archivo que usa la página: el servidor lo
// importa (como server/carreras.ts importa juegos/arcade.js). Aquí solo va lo del servidor: equipo y robot del asiento,
// el reporte de cada persona, el resultado aceptado de la sala y los puntos de ranking.
import "../juegos/arena-motor.js";
import "../juegos/mesas.js";
import type { Store } from "./store.ts";

export const JUEGO_ARENA = "futbolito-arena";
export interface ReporteArena { goles: [number, number]; ms: number; corte?: true }
export interface ResultadoArena { estado: "confirmado" | "disputa" | "anfitrion" | "invitado" | "pendiente"; goles: [number, number] | null; puntos: Record<string, number> }
interface Asiento { id: string; bot?: boolean; equipo?: number; robot?: number }
interface JugadorArena { id: string; unido?: number; equipo?: number; robot?: number; arena?: ReporteArena & { t?: number } }
interface SalaArena { juego: string; host: string; opciones: Record<string, string>; bots: boolean; inicio: number | null }
type Error = { error: string; status: number };

const AM = (globalThis as unknown as {
  ArenaMotor: {
    opcionesSala(op: Record<string, unknown>): Record<string, string> | string;
    repartir(asientos: Asiento[], formato: string): { eq: 0 | 1; color: number; num: number }[];
    validarEquipo(formato: string, iniciada: boolean, jugadores: JugadorArena[], yo: string, equipo: unknown): Error | 0 | 1;
    validarRobot(x: unknown): boolean;
    validarResultado(crudo: unknown, objetivo: number, inicio: number, ahora: number): ReporteArena | null;
    resultadoSala(host: string, jugadores: JugadorArena[], equipos: Record<string, number>): ResultadoArena;
  };
}).ArenaMotor;
const MESAS = (globalThis as unknown as {
  Mesas: { de(juego: string, opciones?: Record<string, string>): { max: number } | null; botsEnMesa(juego: string, humanos: number, conBots: boolean, opciones?: Record<string, string>): number | null };
}).Mesas;

export const esArena = (juego: string) => juego === JUEGO_ARENA;
// POST /juegos/sala: formato, arena y goles (strings) o el código de error (400).
export const opcionesArena = (op: Record<string, unknown>) => AM.opcionesSala(op);
// POST /unirse { equipo }: 0 o 1, antes de empezar y si cabe en su equipo.
export const validarEquipoArena = (sala: SalaArena, jugadores: JugadorArena[], yo: string, equipo: unknown) =>
  AM.validarEquipo(sala.opciones?.formato, sala.inicio !== null, jugadores, yo, equipo);
export const validarRobot = (x: unknown) => AM.validarRobot(x);
// POST /respuesta { arena }: reporte plausible para los goles de la sala, o null.
export const validarReporte = (sala: SalaArena, crudo: unknown, inicio: number, ahora: number) =>
  AM.validarResultado(crudo, Number(sala.opciones?.goles) || 5, inicio, ahora);

// Equipo de cada persona con el mismo reparto que la página (personas por orden de entrada y luego bots).
export function equiposDe(sala: SalaArena, jugadores: JugadorArena[]): Record<string, number> {
  const mesa = MESAS.de(JUEGO_ARENA, sala.opciones), personas = jugadores.slice().sort((a, b) => (a.unido ?? 0) - (b.unido ?? 0)).slice(0, mesa?.max ?? 4);
  const nb = MESAS.botsEnMesa(JUEGO_ARENA, personas.length, sala.bots, sala.opciones) ?? 0;
  const asientos: Asiento[] = [
    ...personas.map((j) => ({ id: j.id, ...(j.equipo === 0 || j.equipo === 1 ? { equipo: j.equipo } : {}), ...(Number.isInteger(j.robot) ? { robot: j.robot } : {}) })),
    ...Array.from({ length: nb }, (_, k) => ({ id: "bot" + k, bot: true })),
  ];
  const rep = AM.repartir(asientos, sala.opciones?.formato || "2v2");
  return Object.fromEntries(personas.map((j, i) => [j.id, rep[i].eq]));
}
// Resultado aceptado de la sala (confirmado, disputa, del anfitrión, del invitado o pendiente) y puntos por persona.
export const resultadoArena = (sala: SalaArena, jugadores: JugadorArena[]): ResultadoArena =>
  AM.resultadoSala(sala.host, jugadores, equiposDe(sala, jugadores));
export const vistaArena = (sala: SalaArena, jugadores: JugadorArena[]) => (esArena(sala.juego) ? { arena: resultadoArena(sala, jugadores) } : {});

// Puntos de ranking de una persona en una sala de Futbolito Arena: los del resultado del servidor; "pendiente" si nadie
// ha reportado; null si la sala no es de este juego.
export async function puntosArenaSala(store: Store, codigo: string, jugadorId: string): Promise<number | "pendiente" | null> {
  const sala = (await store.get<SalaArena>(`juegos/salas/${codigo}/sala.json`))?.data;
  if (!sala || !esArena(sala.juego)) return null;
  const nombres = (await store.list(`juegos/salas/${codigo}`)).filter((n) => n.endsWith(".json") && n !== "sala.json");
  const jugadores = (await Promise.all(nombres.map((n) => store.get<JugadorArena>(`juegos/salas/${codigo}/${n}`)))).filter((d) => d?.data?.id).map((d) => d!.data);
  const r = resultadoArena(sala, jugadores);
  if (r.estado === "pendiente") return "pendiente";
  return r.puntos[jugadorId] ?? 0;
}
