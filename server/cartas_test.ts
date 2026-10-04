// Motor de cartas: póker Texas Hold'em (openspec: poker). Sin DOM: el mismo archivo que carga juegos.html.
// deno-lint-ignore-file no-explicit-any
import { assert, assertEquals } from "jsr:@std/assert@1";
import "../juegos/cartas.js";

const C = (globalThis as any).Cartas;
const RANGOS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
const PALOS = ["♠", "♥", "♦", "♣"];
// "A♠" → id de la carta
const c = (s: string) => PALOS.indexOf(s.slice(-1)) * 13 + RANGOS.indexOf(s.slice(0, -1));
const cs = (s: string) => s.split(" ").map(c);
const v = (s: string) => C.valor5(cs(s));
const mulberry = (a: number) => () => {
  a |= 0; a = a + 0x6D2B79F5 | 0;
  let t = Math.imul(a ^ a >>> 15, 1 | a);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
};
const fichasTotales = (st: any) => st.jugadores.reduce((a: number, j: any) => a + j.fichas, 0) + st.aportado.reduce((a: number, x: number) => a + x, 0);

Deno.test("cartas: orden de las categorías de póker", () => {
  const manos = [
    "2♠ 7♥ 9♦ J♣ K♠", // carta alta
    "4♠ 4♥ 9♦ J♣ K♠", // par
    "4♠ 4♥ 9♦ 9♣ K♠", // doble par
    "4♠ 4♥ 4♦ 9♣ K♠", // tercia
    "A♠ 2♥ 3♦ 4♣ 5♠", // escalera baja (5 alta)
    "2♠ 3♥ 4♦ 5♣ 6♠", // escalera 6 alta
    "2♥ 7♥ 9♥ J♥ K♥", // color
    "4♠ 4♥ 4♦ 9♣ 9♠", // full
    "4♠ 4♥ 4♦ 4♣ K♠", // póker
    "5♦ 6♦ 7♦ 8♦ 9♦", // escalera de color
    "10♠ J♠ Q♠ K♠ A♠", // escalera real
  ].map(v);
  for (let i = 1; i < manos.length; i++) assert(manos[i] > manos[i - 1], `la mano ${i} vence a la ${i - 1}`);
  assert(v("K♠ K♥ 9♦ 4♣ 2♠") > v("K♦ K♣ 9♠ 4♥ 2♦") === false && v("K♠ K♥ 9♦ 4♣ 2♠") === v("K♦ K♣ 9♠ 4♥ 2♦"), "manos iguales empatan");
  assert(v("K♠ K♥ 9♦ 5♣ 2♠") > v("K♦ K♣ 9♠ 4♥ 3♦"), "desempate por cartas altas");
  assert(v("A♠ A♥ 3♦ 3♣ 2♠") > v("K♦ K♣ Q♠ Q♥ J♦"), "doble par: manda el par alto");
});

Deno.test("cartas: mejor mano de 7 cartas con su nombre", () => {
  const m = C.mejorMano(cs("A♥ K♥ 2♥ 9♣ 7♥ 4♥ 4♠"));
  assertEquals([m.categoria, m.nombre], [5, "Color"]);
  assertEquals(C.mejorMano(cs("10♠ J♠ Q♠ K♠ A♠ 2♥ 3♦")).nombre, "Escalera real");
  assertEquals(C.mejorMano(cs("9♠ 9♥ 9♦ 4♣ 4♠ 4♥ 2♦")).nombre, "Full");
  assertEquals(C.nombreCarta(c("10♥")), "10♥");
});

function mesa(fichas: number[], rng = mulberry(7)) {
  const st = C.pokerNueva(fichas.map((_, i) => ({ id: "j" + i, nombre: "J" + i })), { fichas: 1000, manos: 10 });
  fichas.forEach((f, i) => st.jugadores[i].fichas = f);
  C.pokerMano(st, rng);
  return st;
}

Deno.test("póker: ciegas, turnos y todos se retiran ante la ciega grande", () => {
  const st = mesa([1000, 1000, 1000]);
  // Botón 0 → ciega chica 1 (10), ciega grande 2 (20); habla primero el 0.
  assertEquals([st.boton, st.apuesta, st.turno, st.fase], [0, [0, 10, 20], 0, "preflop"]);
  assertEquals(st.cartas.map((x: number[]) => x.length), [2, 2, 2]);
  assertEquals(C.pokerActuar(st, { accion: "pasar" }), false, "no puede pasar con 20 por igualar");
  assertEquals(C.pokerActuar(st, { accion: "subir", monto: 30 }), false, "la subida mínima es a 40");
  assert(C.pokerActuar(st, { accion: "retirarse" }));
  assert(C.pokerActuar(st, { accion: "retirarse" }));
  assertEquals(st.fase, "fin");
  assertEquals(st.resultado.ganadores, [2]);
  assertEquals(st.jugadores.map((j: any) => j.fichas), [1000, 990, 1010]);
});

Deno.test("póker: cara a cara el botón pone la chica y habla primero antes del flop", () => {
  const st = mesa([1000, 1000]);
  assertEquals([st.boton, st.apuesta, st.turno], [0, [10, 20], 0]);
  assert(C.pokerActuar(st, { accion: "igualar" }));
  assertEquals(st.turno, 1, "la ciega grande tiene opción");
  assert(C.pokerActuar(st, { accion: "pasar" }));
  assertEquals([st.fase, st.comunes.length, st.turno], ["flop", 3, 1], "después del flop habla primero quien no es botón");
});

Deno.test("póker: una subida reabre la ronda y se llega a la muestra", () => {
  const st = mesa([1000, 1000, 1000]);
  assert(C.pokerActuar(st, { accion: "igualar" })); // 0 iguala 20
  assert(C.pokerActuar(st, { accion: "igualar" })); // 1 completa 20
  assert(C.pokerActuar(st, { accion: "subir", monto: 60 })); // 2 sube a 60
  assertEquals(st.turno, 0, "se reabre para el 0");
  assert(C.pokerActuar(st, { accion: "igualar" }));
  assert(C.pokerActuar(st, { accion: "igualar" }));
  assertEquals([st.fase, st.comunes.length], ["flop", 3]);
  for (const fase of ["turn", "river", "fin"]) {
    for (let k = 0; k < 3 && st.fase !== fase; k++) assert(C.pokerActuar(st, { accion: "pasar" }));
    assertEquals(st.fase, fase);
  }
  assertEquals(st.resultado.mostrar, true);
  assertEquals(st.jugadores.reduce((a: number, j: any) => a + j.fichas, 0), 3000, "se conservan las fichas");
});

Deno.test("póker: bote lateral con all-in corto y empate dividido", () => {
  const st = mesa([1000, 100, 1000]);
  // Mano fija: el 1 (all-in de 100) tiene la mejor mano; el 0 vence al 2 en el bote lateral.
  st.cartas = [cs("K♠ K♥"), cs("A♠ A♥"), cs("Q♠ Q♥")];
  st.mazo = cs("3♣ 8♦ 2♣ 7♦ 9♣"); // salen del final: flop 9♣ 7♦ 2♣, turn 8♦, river 3♣
  assert(C.pokerActuar(st, { accion: "subir", monto: 300 })); // 0
  assert(C.pokerActuar(st, { accion: "todo" })); // 1: 100 en total
  assert(C.pokerActuar(st, { accion: "igualar" })); // 2: 300
  for (let k = 0; k < 10 && st.fase !== "fin"; k++) assert(C.pokerActuar(st, { accion: "pasar" }));
  assertEquals(st.comunes.length, 5);
  // Principal: 100×3 = 300 para el 1. Lateral: 200×2 = 400 para el 0.
  assertEquals(st.resultado.premios, [400, 300, 0]);
  assertEquals(st.jugadores.map((j: any) => j.fichas), [1100, 300, 700]);

  const e = mesa([1000, 1000, 1000]);
  e.cartas = [cs("2♠ 3♥"), cs("2♦ 3♣"), cs("4♠ 5♥")];
  e.mazo = cs("A♣ K♣ Q♦ J♥ 10♠"); // escalera en la mesa: empate entre todos
  assert(C.pokerActuar(e, { accion: "igualar" }));
  assert(C.pokerActuar(e, { accion: "igualar" }));
  for (let k = 0; k < 10 && e.fase !== "fin"; k++) assert(C.pokerActuar(e, { accion: "pasar" }));
  assertEquals(e.resultado.premios, [20, 20, 20], "empate a tres");
});

Deno.test("póker: la partida avanza el botón, sube ciegas y termina a las N manos", () => {
  const rng = mulberry(3);
  const st = C.pokerNueva([{ id: "a", nombre: "A" }, { id: "b", nombre: "B" }, { id: "c", nombre: "C" }], { fichas: 1000, manos: 5 });
  const botones: number[] = [];
  while (!st.terminada) {
    C.pokerMano(st, rng);
    if (st.terminada) break;
    botones.push(st.boton);
    if (st.mano === 4) assertEquals(st.ciegas, [20, 40], "las ciegas suben en la mano 5");
    while (st.fase !== "fin") assert(C.pokerActuar(st, C.pokerBot(st, rng)));
  }
  assert(botones.length <= 5);
  assertEquals(botones.slice(0, 3).length === new Set(botones.slice(0, 3)).size, true, "el botón rota");
});

Deno.test("póker: 200 partidas de bots con jugadas siempre válidas y fichas conservadas", () => {
  for (let s = 1; s <= 200; s++) {
    const rng = mulberry(s);
    const n = 2 + (s % 4);
    const st = C.pokerNueva(Array.from({ length: n }, (_, i) => ({ id: "b" + i, nombre: "B" + i, bot: true })), { fichas: 1000, manos: 10 });
    let guard = 0;
    while (!st.terminada && guard++ < 200) {
      C.pokerMano(st, rng);
      if (st.terminada) break;
      let pasos = 0;
      while (st.fase !== "fin") {
        const mv = C.pokerBot(st, rng);
        if (!C.pokerActuar(st, mv)) throw new Error(`semilla ${s}: jugada inválida ${JSON.stringify(mv)} en ${st.fase}`);
        if (++pasos > 500) throw new Error(`semilla ${s}: mano sin fin`);
      }
      assertEquals(fichasTotales(st), n * 1000, `semilla ${s}: fichas`);
      assert(st.jugadores.every((j: any) => j.fichas >= 0));
    }
    assert(st.terminada, `semilla ${s}: termina`);
  }
});
