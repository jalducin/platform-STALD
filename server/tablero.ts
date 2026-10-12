// Juegos de tablero en sala (openspec: juegos-tablero): Damas, Dominó, Parchís y Batalla naval. Reglas de sala que
// usa server/salas.ts con ganchos de una línea: forma de las jugadas y qué ve cada jugador.
// Damas, Dominó y Parchís se reproducen en cada navegador (juegos/tablero.js); Batalla naval se arbitra en el servidor
// (server/naval.ts).
import { type JugadorNaval, navalTerminada } from "./naval.ts";

export const JUEGOS_TABLERO = ["damas", "domino", "parchis", "naval"];
// Cupo, asientos con bots y mínimo para empezar: renglones de MESAS (server/salas.ts y juegos/mesas.js).

const entero = (x: unknown, min: number, max: number): x is number => typeof x === "number" && Number.isInteger(x) && x >= min && x <= max;

// Jugada de Damas, Dominó o Parchís con solo sus campos permitidos; null si es inválida; undefined si el juego no es
// de tablero (sigue la validación de siempre). Batalla naval no pasa por aquí: la resuelve respuestaNaval.
export function validarJugadaTablero(juego: string, j: Record<string, unknown>, base: { n: number; accion: string }): Record<string, unknown> | null | undefined {
  if (juego === "damas") {
    if (base.accion === "rendirse") return Object.keys(j).every((k) => k === "n" || k === "accion") ? base : null;
    const ruta = j.ruta;
    if (base.accion !== "mover" || !Array.isArray(ruta) || ruta.length < 2 || ruta.length > 13 || !ruta.every((x) => entero(x, 0, 31))) return null;
    return { ...base, ruta: ruta.slice() };
  }
  if (juego === "domino") {
    if (base.accion !== "jugar" || !entero(j.ficha, 0, 27) || (j.lado !== "i" && j.lado !== "d")) return null;
    return { ...base, ficha: j.ficha, lado: j.lado };
  }
  if (juego === "parchis") {
    if (base.accion !== "mover" || !entero(j.ficha, 0, 3)) return null;
    return { ...base, ficha: j.ficha };
  }
  return undefined;
}

// Lo que ve cada quien de los jugadores de una sala. En Batalla naval, mientras se juega, cada jugador recibe solo su
// propia flota (yo); con yo = null (Realtime) o para el admin, ninguna. Al terminar se revelan las dos.
export function vistaJugadores<J extends JugadorNaval>(juego: string, jugadores: J[], yo: string | null): J[] {
  if (juego !== "naval" || navalTerminada(jugadores)) return jugadores;
  return jugadores.map((j) => {
    if (j.id === yo || j.flota === undefined) return j;
    const { flota: _f, ...resto } = j;
    return resto as J;
  });
}
