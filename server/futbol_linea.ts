// Fútbol Estelar en línea 1 vs 1 (openspec: futbol-en-linea, design.md §1 y §6): táctica del asiento, validación
// del resultado que reportan anfitrión e invitado, regla cuando no coinciden y puntos por resultado.
// El servidor no simula: el anfitrión es autoritativo y aquí solo se revisa que el resultado sea plausible.

// Formaciones de juegos/futbol-motor.js (FORMACIONES) y deslizadores de la pizarra táctica (TACTICA_BASE).
export const FORMACIONES_FUTBOL = ["4-4-2", "4-3-3", "3-5-2", "5-3-2"] as const;
const DESLIZADORES = ["linea", "ancho", "mentalidad", "presion"] as const;
export interface TacticaFutbol { formacion: string; linea: number; ancho: number; mentalidad: number; presion: number }
export interface ReporteFutbol { goles: [number, number]; ms: number; corte?: true }
export type EstadoResultado = "confirmado" | "disputa" | "anfitrion" | "invitado" | "pendiente";
export interface ResultadoFutbol { estado: EstadoResultado; goles: [number, number] | null; puntos: Record<string, number> }
interface ConReporte { id: string; futbol?: ReporteFutbol & { t?: number } }

const entero = (x: unknown, min: number, max: number) => typeof x === "number" && Number.isInteger(x) && x >= min && x <= max;
const GOLES_MAX = 30, MS_MIN = 10_000, MS_MAX = 20 * 60_000, HOLGURA_MS = 5_000, MS_POR_GOL = 10_000;

// Táctica del asiento: formación conocida y deslizadores enteros 0–100 (los que falten valen 50). null si es inválida.
export function validarTactica(crudo: unknown): TacticaFutbol | null {
  if (!crudo || typeof crudo !== "object" || Array.isArray(crudo)) return null;
  const t = crudo as Record<string, unknown>;
  if (!(FORMACIONES_FUTBOL as readonly string[]).includes(String(t.formacion))) return null;
  const r: TacticaFutbol = { formacion: String(t.formacion), linea: 50, ancho: 50, mentalidad: 50, presion: 50 };
  for (const k of DESLIZADORES) {
    if (t[k] === undefined) continue;
    if (!entero(t[k], 0, 100)) return null;
    r[k] = t[k] as number;
  }
  return r;
}

// Reporte de fin de partido: goles enteros 0–30, no más de 1 gol cada 10 s (+1) y duración entre 10 s y 20 min que
// no supere el tiempo desde el inicio de la sala (+5 s de holgura). null si no es plausible.
export function validarResultado(crudo: unknown, inicio: number, ahora: number): ReporteFutbol | null {
  if (!crudo || typeof crudo !== "object") return null;
  const r = crudo as Record<string, unknown>, g = r.goles;
  if (!Array.isArray(g) || g.length !== 2 || !g.every((x) => entero(x, 0, GOLES_MAX))) return null;
  if (!entero(r.ms, MS_MIN, MS_MAX) || (r.ms as number) > ahora - inicio + HOLGURA_MS) return null;
  const goles = g as [number, number], ms = r.ms as number;
  if (goles[0] + goles[1] > 1 + ms / MS_POR_GOL) return null;
  return { goles: [goles[0], goles[1]], ms, ...(r.corte === true ? { corte: true as const } : {}) };
}

// Puntos por partido (igual que FutbolLiga.puntosPartido sin factor de nivel): gana 300, empata 120, pierde 40,
// +60 por gol (hasta 6) y −20 por gol recibido; de 0 a 1000.
export function puntosFutbol(gf: number, gc: number): number {
  let base = 40;
  if (gf > gc) base = 300;
  else if (gf === gc) base = 120;
  return Math.max(0, Math.min(1000, Math.round(base + 60 * Math.min(6, gf) - 20 * gc)));
}

const igual = (a: ReporteFutbol, b: ReporteFutbol) => a.goles[0] === b.goles[0] && a.goles[1] === b.goles[1];

// Resultado aceptado de la sala. goles = [anfitrión (local), invitado (visitante)].
// Coinciden → confirmado; difieren → cuenta el del anfitrión (simula el partido) «en disputa»; solo uno → ese.
export function resultadoFutbol(host: string, jugadores: ConReporte[]): ResultadoFutbol {
  const anf = jugadores.find((j) => j.id === host), inv = jugadores.find((j) => j.id !== host);
  const ra = anf?.futbol, ri = inv?.futbol;
  let estado: EstadoResultado = "pendiente", goles: [number, number] | null = null;
  if (ra && ri) { estado = igual(ra, ri) ? "confirmado" : "disputa"; goles = ra.goles; }
  else if (ra) { estado = "anfitrion"; goles = ra.goles; }
  else if (ri) { estado = "invitado"; goles = ri.goles; }
  const puntos: Record<string, number> = {};
  if (goles) {
    if (anf) puntos[anf.id] = puntosFutbol(goles[0], goles[1]);
    if (inv) puntos[inv.id] = puntosFutbol(goles[1], goles[0]);
  }
  return { estado, goles, puntos };
}
