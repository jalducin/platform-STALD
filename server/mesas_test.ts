// Mesas de las partidas (openspec: mesas-con-bots): la tabla del servidor y la de la página coinciden, y la regla
// de asientos (cada persona que entra quita un bot) se cumple.
import { assertEquals } from "jsr:@std/assert@1";
import { enMesa, MESAS } from "./salas.ts";
import "../juegos/mesas.js";

// deno-lint-ignore no-explicit-any
const Mesas = (globalThis as any).Mesas;

Deno.test("mesas: la tabla de la página es igual a la del servidor", () => {
  assertEquals(Mesas.MESAS, MESAS);
});

Deno.test("mesas: con asientos, los bots completan la mesa y cada persona quita uno", () => {
  assertEquals([1, 2, 3, 4].map((h) => Mesas.botsEnMesa("brisca", h, true)), [3, 2, 1, 0]);
  assertEquals([1, 3, 4].map((h) => enMesa("brisca", h, true)), [4, 4, 4]);
  assertEquals(Mesas.botsEnMesa("ajedrez", 1, true), null, "ajedrez: solo personas");
  assertEquals(enMesa("ajedrez", 1, false), 1);
  assertEquals(Mesas.botsEnMesa("cultura", 3, true), null, "sin mesa: bots aparte, como siempre");
  assertEquals(Mesas.textoMesa("brisca", 3, 1), "Mesa de 4 · 3 personas + 1 bot");
  assertEquals(Mesas.textoMesa("ajedrez", 1, 0), "Hasta 2 personas · 1 persona");
});
