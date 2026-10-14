// Copa completa de Karts en sala (openspec: karts-copa-en-sala). Las reglas (calendario, puntos, tabla) viven en
// juegos/karts-copa.js, el mismo archivo que usa la página: el servidor lo importa para validar cada reporte y para
// mostrar la copa en GET /juegos/sala/<código>. Aquí solo va lo del servidor: opciones de la sala, validación del
// reporte de cada carrera y el tope de puntos de la partida.
import "../juegos/karts-pistas.js";
import "../juegos/arcade.js";
import "../juegos/karts-copa.js";
import { validarCarrera } from "./carreras.ts";
import type { Store } from "./store.ts";

export interface ReporteCopa { k: number; ms: number | null; monedas: number; t: number; abandono?: true }
interface SalaCopa { juego: string; opciones: Record<string, string>; seed: number; inicio: number | null; bots: boolean }
interface JugadorCopa { id: string; nombre: string; copa?: ReporteCopa[] }
interface Cal { k: number; pista: string; inicio: number; cierre: number | null }
// deno-lint-ignore no-explicit-any
const KC = (globalThis as any).KartsCopa as {
  COPAS_SALA: string[]; CARRERAS: number;
  pistasDe(copa: string, seed: number): string[]; esCopa(s: SalaCopa): boolean; reporte(j: JugadorCopa, k: number): ReporteCopa | null;
  calendario(s: SalaCopa, js: JugadorCopa[], ahora: number): Cal[];
  estado(s: SalaCopa, js: JugadorCopa[], ahora: number): { fase: string; tabla: { id: string; ranking: number }[] };
};
export const esCopaKarts = (sala: SalaCopa) => KC.esCopa(sala);
export const pistasCopa = (copa: string, seed: number) => KC.pistasDe(copa, seed);

// POST /juegos/sala de karts: «Una carrera» (sin modo o modo "carrera") o «Copa completa» (modo "copa" + copa).
// Devuelve las opciones de copa, {} para una carrera, o el código de error.
export function opcionesCopa(op: Record<string, unknown>): Record<string, string> | string {
  if (op.modo === undefined || op.modo === "" || op.modo === "carrera") return {};
  if (op.modo !== "copa") return "modo_invalido";
  if (!KC.COPAS_SALA.includes(String(op.copa))) return "copa_invalida";
  return { modo: "copa", copa: String(op.copa) };
}

type Resultado<J> = { cambiar: (j: J) => J } | { error: string; status: number };
const entero = (x: unknown, min: number, max: number) => typeof x === "number" && Number.isInteger(x) && x >= min && x <= max;
const llavesExactas = (o: Record<string, unknown>, ks: string[]) => Object.keys(o).length === ks.length && ks.every((k) => k in o);

// { copa: { carrera, ms, monedas } } o { copa: { carrera, abandono: true } }: solo la carrera abierta y ya empezada
// (409 carrera_fuera_de_turno si todavía no toca, 409 carrera_cerrada si ya cerró); el tiempo se valida como una carrera
// suelta (mínimo y límite de su pista y reloj del servidor desde el inicio de esa carrera). Solo cuenta el primero.
export function reporteCopa<J extends JugadorCopa>(sala: SalaCopa, jugadores: J[], crudo: unknown, ahora: number): Resultado<J> {
  if (!KC.esCopa(sala) || !crudo || typeof crudo !== "object" || Array.isArray(crudo)) return { error: "copa_invalida", status: 400 };
  const c = crudo as Record<string, unknown>;
  const abandono = llavesExactas(c, ["carrera", "abandono"]) && c.abandono === true;
  if (!entero(c.carrera, 0, KC.CARRERAS - 1) || !(abandono || llavesExactas(c, ["carrera", "ms", "monedas"]))) return { error: "copa_invalida", status: 400 };
  const k = c.carrera as number;
  const cal = KC.calendario(sala, jugadores, ahora), ultima = cal[cal.length - 1];
  if (!ultima || k > ultima.k || (k === ultima.k && ahora < ultima.inicio)) return { error: "carrera_fuera_de_turno", status: 409 };
  if (k < ultima.k || ultima.cierre !== null) return { error: "carrera_cerrada", status: 409 };
  let nuevo: ReporteCopa;
  if (abandono) nuevo = { k, ms: null, monedas: 0, t: ahora, abandono: true };
  else {
    const v = validarCarrera("karts", { ms: c.ms, monedas: c.monedas }, ultima.inicio, ahora, ultima.pista);
    if (!v) return { error: "carrera_invalida", status: 400 };
    nuevo = { k, ms: v.ms, monedas: v.monedas, t: ahora };
  }
  return { cambiar: (j) => KC.reporte(j, k) ? j : { ...j, copa: [...(j.copa || []), nuevo].slice(-KC.CARRERAS) } };
}

// La copa (fase, carrera en curso, calendario, resultados y tabla) para GET y Realtime; vacío en otras salas.
export const vistaCopa = (sala: SalaCopa, jugadores: JugadorCopa[], ahora: number) =>
  KC.esCopa(sala) && sala.inicio !== null ? { copa: KC.estado(sala, jugadores, ahora) } : {};

// POST /juegos/partida de una sala de copa: los puntos de quien la pide no pasan de lo que le da la tabla del servidor
// (suma de los puntos por lugar, tope 2000). null si la sala no es de copa o todavía no termina.
export async function topeRankingCopa(store: Store, codigo: string, jugadorId: string, ahora: number): Promise<number | null> {
  const sd = (await store.get<SalaCopa>(`juegos/salas/${codigo}/sala.json`))?.data;
  if (!sd || !KC.esCopa(sd) || sd.inicio === null) return null;
  const nombres = (await store.list(`juegos/salas/${codigo}`)).filter((n) => n.endsWith(".json") && n !== "sala.json");
  const jugadores = (await Promise.all(nombres.map((n) => store.get<JugadorCopa & { unido: number }>(`juegos/salas/${codigo}/${n}`))))
    .map((d) => d!.data).sort((a, b) => a.unido - b.unido);
  const e = KC.estado(sd, jugadores, ahora);
  if (e.fase !== "final") return 0;
  return e.tabla.find((x) => x.id === jugadorId)?.ranking ?? 0;
}
