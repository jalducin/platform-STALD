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
  // futbolito-billar: 1 vs 1; con bots, una persona juega contra un bot.
  assertEquals([Mesas.botsEnMesa("futbolito", 1, true), Mesas.botsEnMesa("billar", 2, true), Mesas.botsEnMesa("billar", 1, false)], [1, 0, null]);
  assertEquals(Mesas.textoMesa("billar", 1, 1), "Mesa de 2 · 1 persona + 1 bot");
});

// juegos-en-vivo: Karts hasta 8 personas en vivo; los bots completan 3 lugares (1 persona + 2 bots, como antes).
Deno.test("mesas: Karts de hasta 8 personas y cada persona quita un bot de los 3 lugares", () => {
  assertEquals([1, 2, 3, 4, 8].map((h) => Mesas.botsEnMesa("karts", h, true)), [2, 1, 0, 0, 0]);
  assertEquals(Mesas.botsEnMesa("karts", 3, false), null, "sin bots: solo personas");
  assertEquals([1, 2, 5, 8].map((h) => enMesa("karts", h, true)), [3, 3, 5, 8]);
  assertEquals(Mesas.de("karts").max, 8);
  assertEquals(Mesas.textoMesa("karts", 2, 1), "Mesa de 3 · 2 personas + 1 bot");
});
