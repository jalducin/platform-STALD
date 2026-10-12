// Batalla naval en sala (openspec: juegos-tablero). El servidor es el árbitro: guarda la flota de cada jugador,
// valida cada disparo y lo resuelve con la flota del rival, que nunca sale del servidor mientras se juega
// (ver vistaJugadores en server/tablero.ts). Las reglas coinciden con Tablero.Naval de juegos/tablero.js.

export const FLOTA = [5, 4, 3, 3, 2];
const TOTAL = FLOTA.reduce((a, b) => a + b, 0); // 17 cuadros
export const ESPERA_RECLAMO_MS = 90_000; // sin jugar este tiempo, el rival puede reclamar la victoria

export type Flota = number[][];
export interface JugadaNaval { n: number; accion: string; c?: number; r?: string; barco?: number[]; t: number }
export interface JugadorNaval { id: string; flota?: Flota; flotaT?: number; jugadas?: JugadaNaval[] }
export interface FinNaval { gana: string; por: "hundidos" | "rendicion" | "abandono" }

const entero = (x: unknown, min: number, max: number): x is number => typeof x === "number" && Number.isInteger(x) && x >= min && x <= max;

// Barcos en línea recta (horizontal sin cambiar de fila, o vertical), dentro del tablero, sin encimarse y con los
// tamaños de FLOTA. Devuelve la flota con cada barco ordenado, o null.
export function validarFlota(x: unknown): Flota | null {
  if (!Array.isArray(x) || x.length !== FLOTA.length) return null;
  const flota: Flota = [];
  for (const b of x) {
    if (!Array.isArray(b) || b.length < 2 || !b.every((c) => entero(c, 0, 99))) return null;
    const s = (b as number[]).slice().sort((p, q) => p - q);
    const h = s.every((c, i) => i === 0 || (c === s[i - 1] + 1 && Math.floor(c / 10) === Math.floor(s[0] / 10)));
    const v = s.every((c, i) => i === 0 || c === s[i - 1] + 10);
    if (!h && !v) return null;
    flota.push(s);
  }
  const largos = flota.map((b) => b.length).sort((p, q) => q - p);
  if (!largos.every((l, i) => l === FLOTA[i]) || new Set(flota.flat()).size !== TOTAL) return null;
  return flota;
}

export function disparo(flota: Flota, previos: number[], c: number): { r: "agua" | "tocado" | "hundido"; barco?: number[] } {
  const barco = flota.find((b) => b.includes(c));
  if (!barco) return { r: "agua" };
  const set = new Set([...previos, c]);
  return barco.every((x) => set.has(x)) ? { r: "hundido", barco: barco.slice() } : { r: "tocado" };
}

// Estado a partir de las jugadas guardadas: los 2 primeros jugadores (orden de entrada) se turnan; empieza el 0 y,
// tras «agua», cambia el turno. Funciona sin las flotas (solo con los resultados), así que también lo usa la página.
export function estadoNaval(jugadores: JugadorNaval[]) {
  const orden = jugadores.slice(0, 2).map((j) => j.id);
  const todas = jugadores.slice(0, 2).flatMap((j) => (j.jugadas || []).map((x) => ({ ...x, id: j.id }))).sort((a, b) => a.n - b.n);
  let turno = 0, fin: FinNaval | null = null, ultimo = 0;
  const aciertos = [0, 0];
  for (const x of todas) {
    const k = orden.indexOf(x.id);
    ultimo = Math.max(ultimo, x.t || 0);
    if (x.accion === "rendirse") { fin = { gana: orden[1 - k], por: "rendicion" }; break; }
    if (x.accion === "reclamar") { fin = { gana: x.id, por: "abandono" }; break; }
    if (x.r === "agua") { turno = 1 - k; continue; }
    turno = k;
    if (++aciertos[k] >= TOTAL) { fin = { gana: x.id, por: "hundidos" }; break; }
  }
  return { orden, turno: orden[turno] as string | undefined, fin, pasos: todas.length, ultimo };
}

type Resultado = { error: string; status: number } | { cambiar: <E extends JugadorNaval>(e: E) => E };

// POST /juegos/sala/<código>/respuesta de una sala de Batalla naval: `{ flota }` o `{ jugada }`. Devuelve el error, el
// cambio para el archivo del jugador o null si el cuerpo es de otro tipo (por ejemplo, `final` y `podio`).
export function respuestaNaval(inicio: number, jugadores: JugadorNaval[], yo: string, body: Record<string, unknown>, ahora: number): Resultado | null {
  const k = jugadores.slice(0, 2).findIndex((j) => j.id === yo);
  const me = jugadores[k], rival = jugadores[1 - k];
  if (body.flota !== undefined) {
    if (k < 0) return { error: "no_en_sala", status: 403 };
    if (me.flota) return { error: "flota_lista", status: 409 };
    const flota = validarFlota(body.flota);
    if (!flota) return { error: "flota_invalida", status: 400 };
    return { cambiar: (e) => e.flota ? e : { ...e, flota, flotaT: ahora } };
  }
  if (body.jugada === undefined) return null;
  const j = body.jugada && typeof body.jugada === "object" ? body.jugada as Record<string, unknown> : {};
  const accion = String(j.accion ?? "");
  if (!entero(j.n, 0, 2000) || !["disparar", "rendirse", "reclamar"].includes(accion) || (accion === "disparar" ? !entero(j.c, 0, 99) : j.c !== undefined)) {
    return { error: "jugada_invalida", status: 400 };
  }
  if (k < 0) return { error: "no_en_sala", status: 403 };
  const est = estadoNaval(jugadores);
  if (est.fin) return { error: "partida_terminada", status: 409 };
  if (j.n !== est.pasos) return { error: "turno_tomado", status: 409 };
  const n = j.n as number;
  let nueva: JugadaNaval = { n, accion, t: ahora };
  if (accion === "reclamar") {
    // Solo si la jugada pendiente es del rival (acomodar su flota o disparar) y lleva 90 s sin moverse.
    const pendiente = !!me.flota && (!rival?.flota || est.turno === rival.id);
    const ref = Math.max(inicio, me.flotaT ?? 0, rival?.flotaT ?? 0, est.ultimo);
    if (!pendiente || ahora - ref < ESPERA_RECLAMO_MS) return { error: "aun_no", status: 409 };
  } else if (accion === "disparar") {
    if (!me.flota || !rival?.flota) return { error: "falta_flota", status: 409 };
    if (est.turno !== yo) return { error: "no_es_tu_turno", status: 409 };
    const mios = (me.jugadas || []).filter((x) => x.accion === "disparar").map((x) => x.c as number);
    if (mios.includes(j.c as number)) return { error: "ya_disparaste", status: 400 };
    nueva = { n, accion, c: j.c as number, ...disparo(rival.flota, mios, j.c as number), t: ahora };
  }
  return { cambiar: (e) => (e.jugadas || []).some((y) => y.n === n) ? e : { ...e, jugadas: [...(e.jugadas || []), nueva].slice(-600) } };
}

// ¿Ya terminó? (para revelar las flotas en el repaso final).
export const navalTerminada = (jugadores: JugadorNaval[]) => estadoNaval(jugadores).fin !== null;
