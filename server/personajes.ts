// Personajes de Arcade para las salas (openspec: personaje-en-salas). El servidor importa el mismo archivo que cargan
// Axo, Karts y la página de Juegos (juegos/personajes.js, fuente única): no hay una segunda lista que mantener. Al
// cargar no toca el DOM (solo `retrato` usa `document`), así que corre en Deno y en Deno Deploy.
import "../juegos/personajes.js";

const P = (globalThis as unknown as { Personajes: { LISTA: { id: string }[] } }).Personajes;
export const PERSONAJES_IDS: readonly string[] = Object.freeze(P.LISTA.map((p) => p.id));
export const esPersonaje = (x: unknown): x is string => typeof x === "string" && PERSONAJES_IDS.includes(x);
