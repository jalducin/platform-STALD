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

// Fichas iniciales por omisión (openspec: poker-fichas): 500; las pilas de la prueba se fijan a mano.
function mesa(fichas: number[], rng = mulberry(7)) {
  const st = C.pokerNueva(fichas.map((_, i) => ({ id: "j" + i, nombre: "J" + i })), { manos: 10 });
  fichas.forEach((f, i) => st.jugadores[i].fichas = f);
  C.pokerMano(st, rng);
  return st;
}

Deno.test("póker: 500 fichas por omisión y ciegas 5/10 → 10/20 → 20/40 → 40/80 (openspec: poker-fichas)", () => {
  assertEquals([C.FICHAS_INICIALES, C.FICHA], [500, 5]);
  assertEquals(C.CIEGAS, [[5, 10], [10, 20], [20, 40], [40, 80]]);
  const st = C.pokerNueva([{ id: "a", nombre: "A" }, { id: "b", nombre: "B" }]);
  assertEquals(st.jugadores.map((j: any) => j.fichas), [500, 500]);
  assertEquals(st.manos, 10);
});

Deno.test("póker: ciegas, turnos y todos se retiran ante la ciega grande", () => {
  const st = mesa([500, 500, 500]);
  // Botón 0 → ciega chica 1 (5), ciega grande 2 (10); habla primero el 0.
  assertEquals([st.boton, st.apuesta, st.turno, st.fase], [0, [0, 5, 10], 0, "preflop"]);
  assertEquals(st.cartas.map((x: number[]) => x.length), [2, 2, 2]);
  assertEquals(C.pokerActuar(st, { accion: "pasar" }), false, "no puede pasar con 10 por igualar");
  assertEquals(C.pokerActuar(st, { accion: "subir", monto: 15 }), false, "la subida mínima es a 20");
  assert(C.pokerActuar(st, { accion: "retirarse" }));
  assert(C.pokerActuar(st, { accion: "retirarse" }));
  assertEquals(st.fase, "fin");
  assertEquals(st.resultado.ganadores, [2]);
  assertEquals(st.jugadores.map((j: any) => j.fichas), [500, 495, 505]);
});

Deno.test("póker: la subida va en múltiplos de 5, salvo ir con todo (openspec: poker-fichas)", () => {
  const st = mesa([500, 500, 500]);
  assertEquals(C.pokerActuar(st, { accion: "subir", monto: 23 }), false, "23 no se arma con fichas");
  assertEquals(C.pokerActuar(st, { accion: "subir", monto: 137 }), false, "137 tampoco");
  assert(C.pokerActuar(st, { accion: "subir", monto: 135 }), "135 = 100 + 20 + 10 + 5");
  assertEquals(st.apuesta[0], 135);
  // Con una pila rara (no debería pasar), subir justo todo lo que tiene sí vale.
  const r = mesa([237, 500, 500]);
  assertEquals(C.opciones(r).maxSubir, 237);
  assert(C.pokerActuar(r, { accion: "subir", monto: 237 }), "subir el máximo es ir con todo");
});

Deno.test("póker: cara a cara el botón pone la chica y habla primero antes del flop", () => {
  const st = mesa([500, 500]);
  assertEquals([st.boton, st.apuesta, st.turno], [0, [5, 10], 0]);
  assert(C.pokerActuar(st, { accion: "igualar" }));
  assertEquals(st.turno, 1, "la ciega grande tiene opción");
  assert(C.pokerActuar(st, { accion: "pasar" }));
  assertEquals([st.fase, st.comunes.length, st.turno], ["flop", 3, 1], "después del flop habla primero quien no es botón");
});

Deno.test("póker: una subida reabre la ronda y se llega a la muestra", () => {
  const st = mesa([500, 500, 500]);
  assert(C.pokerActuar(st, { accion: "igualar" })); // 0 iguala 10
  assert(C.pokerActuar(st, { accion: "igualar" })); // 1 completa 10
  assert(C.pokerActuar(st, { accion: "subir", monto: 30 })); // 2 sube a 30
  assertEquals(st.turno, 0, "se reabre para el 0");
  assert(C.pokerActuar(st, { accion: "igualar" }));
  assert(C.pokerActuar(st, { accion: "igualar" }));
  assertEquals([st.fase, st.comunes.length], ["flop", 3]);
  for (const fase of ["turn", "river", "fin"]) {
    for (let k = 0; k < 3 && st.fase !== fase; k++) assert(C.pokerActuar(st, { accion: "pasar" }));
    assertEquals(st.fase, fase);
  }
  assertEquals(st.resultado.mostrar, true);
  assertEquals(st.jugadores.reduce((a: number, j: any) => a + j.fichas, 0), 1500, "se conservan las fichas");
});

Deno.test("póker: bote lateral con all-in corto y empate dividido", () => {
  const st = mesa([500, 50, 500]);
  // Mano fija: el 1 (all-in de 50) tiene la mejor mano; el 0 vence al 2 en el bote lateral.
  st.cartas = [cs("K♠ K♥"), cs("A♠ A♥"), cs("Q♠ Q♥")];
  st.mazo = cs("3♣ 8♦ 2♣ 7♦ 9♣"); // salen del final: flop 9♣ 7♦ 2♣, turn 8♦, river 3♣
  assert(C.pokerActuar(st, { accion: "subir", monto: 150 })); // 0
  assert(C.pokerActuar(st, { accion: "todo" })); // 1: 50 en total
  assert(C.pokerActuar(st, { accion: "igualar" })); // 2: 150
  for (let k = 0; k < 10 && st.fase !== "fin"; k++) assert(C.pokerActuar(st, { accion: "pasar" }));
  assertEquals(st.comunes.length, 5);
  // Principal: 50×3 = 150 para el 1. Lateral: 100×2 = 200 para el 0.
  assertEquals(st.resultado.premios, [200, 150, 0]);
  assertEquals(st.jugadores.map((j: any) => j.fichas), [550, 150, 350]);

  const e = mesa([500, 500, 500]);
  e.cartas = [cs("2♠ 3♥"), cs("2♦ 3♣"), cs("4♠ 5♥")];
  e.mazo = cs("A♣ K♣ Q♦ J♥ 10♠"); // escalera en la mesa: empate entre todos
  assert(C.pokerActuar(e, { accion: "igualar" }));
  assert(C.pokerActuar(e, { accion: "igualar" }));
  for (let k = 0; k < 10 && e.fase !== "fin"; k++) assert(C.pokerActuar(e, { accion: "pasar" }));
  assertEquals(e.resultado.premios, [10, 10, 10], "empate a tres");
});

Deno.test("póker: un pozo empatado de 25 se reparte de 5 en 5 (openspec: poker-fichas)", () => {
  const st = mesa([500, 500, 500]);
  st.cartas = [cs("2♠ 3♥"), cs("7♦ 8♣"), cs("2♦ 3♣")];
  st.mazo = cs("A♣ K♣ Q♦ J♥ 10♠"); // escalera en la mesa
  assert(C.pokerActuar(st, { accion: "igualar" })); // 0 pone 10
  assert(C.pokerActuar(st, { accion: "retirarse" })); // 1 deja su ciega chica de 5
  assert(C.pokerActuar(st, { accion: "pasar" })); // 2: ciega grande
  for (let k = 0; k < 10 && st.fase !== "fin"; k++) assert(C.pokerActuar(st, { accion: "pasar" }));
  // Pozo 25 entre el 0 y el 2: el primero después del botón (el 2) se lleva los 5 que sobran.
  assertEquals(st.resultado.premios, [10, 0, 15]);
  assert(st.jugadores.every((j: any) => j.fichas % 5 === 0), "pilas en múltiplos de 5");
});

Deno.test("póker: la partida avanza el botón, sube ciegas y termina a las N manos", () => {
  const rng = mulberry(3);
  const st = C.pokerNueva([{ id: "a", nombre: "A" }, { id: "b", nombre: "B" }, { id: "c", nombre: "C" }], { manos: 5 });
  const botones: number[] = [];
  while (!st.terminada) {
    C.pokerMano(st, rng);
    if (st.terminada) break;
    botones.push(st.boton);
    if (st.mano === 0) assertEquals(st.ciegas, [5, 10], "empiezan en 5/10");
    if (st.mano === 4) assertEquals(st.ciegas, [10, 20], "las ciegas suben en la mano 5");
    while (st.fase !== "fin") assert(C.pokerActuar(st, C.pokerBot(st, rng)));
  }
  assert(botones.length <= 5);
  assertEquals(botones.slice(0, 3).length === new Set(botones.slice(0, 3)).size, true, "el botón rota");
});

Deno.test("póker: 200 partidas de bots con jugadas siempre válidas, fichas conservadas y en múltiplos de 5", () => {
  for (let s = 1; s <= 200; s++) {
    const rng = mulberry(s);
    const n = 2 + (s % 4);
    const st = C.pokerNueva(Array.from({ length: n }, (_, i) => ({ id: "b" + i, nombre: "B" + i, bot: true })), { manos: 10 });
    let guard = 0;
    while (!st.terminada && guard++ < 200) {
      C.pokerMano(st, rng);
      if (st.terminada) break;
      let pasos = 0;
      while (st.fase !== "fin") {
        const mv = C.pokerBot(st, rng);
        if (mv.accion === "subir" && mv.monto % 5 !== 0) throw new Error(`semilla ${s}: subida de ${mv.monto}`);
        if (!C.pokerActuar(st, mv)) throw new Error(`semilla ${s}: jugada inválida ${JSON.stringify(mv)} en ${st.fase}`);
        if (++pasos > 500) throw new Error(`semilla ${s}: mano sin fin`);
      }
      assertEquals(fichasTotales(st), n * 500, `semilla ${s}: fichas`);
      assert(st.jugadores.every((j: any) => j.fichas >= 0 && j.fichas % 5 === 0), `semilla ${s}: pilas en múltiplos de 5`);
    }
    assert(st.terminada, `semilla ${s}: termina`);
  }
});

// ---------- Baraja española: Brisca y Conquián (openspec: cartas-espanolas) ----------
const ESP_V = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12];
// "1o" = as de oros; palos o, c, e, b
const e = (s: string) => "ocebb".indexOf(s.slice(-1)) * 10 + ESP_V.indexOf(Number(s.slice(0, -1)));
const es = (s: string) => s.split(" ").map(e);

Deno.test("española: 40 cartas con nombre, palo y valor", () => {
  assertEquals([C.nombreEsp(e("1o")), C.nombreEsp(e("10c")), C.nombreEsp(e("11e")), C.nombreEsp(e("12b")), C.nombreEsp(e("7b"))],
    ["As de oros", "Sota de copas", "Caballo de espadas", "Rey de bastos", "7 de bastos"]);
  assertEquals([C.espPalo(e("3e")), C.espValor(e("3e")), C.espOrden(e("10e")) - C.espOrden(e("7e"))], [2, 3, 1]);
  assertEquals([...Array(40).keys()].reduce((a, id) => a + C.briscaPuntos(id), 0), 120, "la brisca suma 120");
});

Deno.test("brisca: quién gana la baza", () => {
  const baza = (s: string) => es(s).map((carta, j) => ({ j, carta }));
  assertEquals(C.briscaGanador(baza("1o 2c"), 1), 1, "el triunfo (copas) gana aunque sea un 2");
  assertEquals(C.briscaGanador(baza("5e 12b 7e"), 0), 2, "sin triunfo gana el palo que salió; el rey de bastos no sigue");
  assertEquals(C.briscaGanador(baza("12o 3o"), 2), 1, "el tres vence al rey");
  assertEquals(C.briscaGanador(baza("3c 1c"), 3), 1, "el as vence al tres");
  assertEquals(C.briscaGanador(baza("2b 4b 6e 5b"), 3), 3, "con triunfo bastos gana el 5 (vence al 4 y al 2)");
});

Deno.test("brisca: reparto, triunfo al fondo y flujo de una baza", () => {
  const st3 = C.briscaNueva([{ id: "a" }, { id: "b" }, { id: "c" }], mulberry(5));
  assertEquals(st3.manos.flat().length + st3.mazo.length, 39, "con 3 jugadores se quita el 2 de oros");
  assert(![...st3.manos.flat(), ...st3.mazo].includes(e("2o")));
  assertEquals(st3.mazo[0], st3.triunfo, "el triunfo se roba al final");
  const st = C.briscaNueva([{ id: "a" }, { id: "b" }], mulberry(9));
  st.manos = [es("1o 4c 5e"), es("3o 6c 7e")]; st.triunfo = e("2b"); st.paloTriunfo = 3; st.mazo = es("2b 10c 11e 12c 1b");
  assertEquals(C.briscaJugar(st, e("3o")), false, "no es su turno");
  assert(C.briscaJugar(st, e("4c")));
  assert(C.briscaJugar(st, e("3o")));
  // Salió copas y el 3 de oros no sigue el palo ni es triunfo: gana el 4 de copas y se lleva los 10 del tres.
  assertEquals([st.puntos, st.lider, st.turno], [[10, 0], 0, 0]);
  assertEquals([st.manos[0].includes(e("1b")), st.manos[1].includes(e("12c"))], [true, true], "roba primero quien ganó");
  assertEquals(st.ultimaBaza.ganador, 0);
});

Deno.test("brisca: parejas con 4 y 200 partidas de bots que suman 120", () => {
  const p4 = C.briscaNueva([0, 1, 2, 3].map((i) => ({ id: "j" + i })), mulberry(1));
  assertEquals(p4.equipos, [0, 1, 0, 1]);
  for (let s = 1; s <= 200; s++) {
    const rng = mulberry(s), n = 2 + (s % 3);
    const st = C.briscaNueva(Array.from({ length: n }, (_, i) => ({ id: "b" + i, bot: true })), rng);
    let pasos = 0;
    while (!st.terminada) {
      const carta = C.briscaBot(st, rng);
      if (!C.briscaJugar(st, carta)) throw new Error(`semilla ${s}: carta inválida ${carta}`);
      if (++pasos > 60) throw new Error(`semilla ${s}: sin fin`);
    }
    assertEquals(st.puntos.reduce((a: number, x: number) => a + x, 0), 120, `semilla ${s}`);
    assertEquals(pasos, n === 3 ? 39 : 40);
    const r = C.briscaResultado(st);
    assert(r.ganador === -1 || r.totales[r.ganador] > 60 || n === 3, `semilla ${s}: gana con más de 60`);
  }
});

Deno.test("conquián: juegos válidos e inválidos", () => {
  assert(C.esJuego(es("3o 3c 3e")), "tercia");
  assert(C.esJuego(es("3o 3c 3e 3b")), "cuarteta");
  assert(C.esJuego(es("5o 6o 7o")), "escalera");
  assert(C.esJuego(es("6o 7o 10o 11o")), "7 y sota van seguidos");
  assert(C.esJuego(es("1b 2b 3b 4b 5b")), "escalera larga");
  assert(!C.esJuego(es("3o 3c")), "dos cartas no son juego");
  assert(!C.esJuego(es("3o 4c 5o")), "escalera de palos distintos");
  assert(!C.esJuego(es("12o 1o 2o")), "no da la vuelta");
  assert(!C.esJuego(es("5o 7o 10o")), "con hueco");
});

function conquian() {
  const st = C.conquianNueva([{ id: "a" }, { id: "b" }], mulberry(4));
  return st;
}

Deno.test("conquián: reparto, tomar para bajar, descartar y pasar", () => {
  const s0 = conquian();
  assertEquals([s0.manos[0].length, s0.manos[1].length, s0.mazo.length, s0.oferta.para, s0.oferta.origen, s0.fase], [8, 8, 23, 0, "mazo", "oferta"]);
  const st = conquian();
  st.manos[0] = es("3o 4o 7c 10c 1e 2e 12b 11b"); st.oferta = { carta: e("5o"), para: 0, origen: "mazo", segunda: false };
  assertEquals(C.conquianActuar(st, { accion: "tomar", con: es("3o 7c") }), false, "3-5-7 no es juego");
  assertEquals(C.conquianActuar(st, { accion: "descartar", carta: e("7c") }), false, "primero se toma o se pasa");
  assert(C.conquianActuar(st, { accion: "tomar", con: es("3o 4o") }));
  assertEquals([st.bajados[0].length, st.manos[0].length, st.fase, st.turno], [1, 6, "bajar", 0]);
  assert(C.conquianActuar(st, { accion: "descartar", carta: e("12b") }));
  assertEquals([st.oferta.carta, st.oferta.para, st.oferta.origen, st.turno, st.fase], [e("12b"), 1, "descarte", 1, "oferta"]);
  // El rival no quiere el descarte: queda muerta y voltea una para sí
  const antes = st.mazo.length;
  assert(C.conquianActuar(st, { accion: "pasar" }));
  assertEquals([st.muertas.length, st.oferta.para, st.oferta.origen, st.mazo.length], [1, 1, "mazo", antes - 1]);
  // La volteada pasa al otro (segunda); si tampoco la quiere, queda muerta y él voltea
  assert(C.conquianActuar(st, { accion: "pasar" }));
  assertEquals([st.oferta.para, st.oferta.segunda], [0, true]);
  assert(C.conquianActuar(st, { accion: "pasar" }));
  assertEquals([st.muertas.length, st.oferta.para, st.oferta.segunda], [2, 0, false]);
});

Deno.test("conquián: agregar a un juego propio, ganar con 9 y empate sin mazo", () => {
  const st = conquian();
  st.bajados[0] = [es("3o 4o 5o")]; st.manos[0] = es("1c 1e 2b 3b 4b"); st.oferta = { carta: e("6o"), para: 0, origen: "mazo", segunda: false };
  assert(C.conquianActuar(st, { accion: "tomar", con: [], a: 0 }));
  assertEquals(st.bajados[0][0].length, 4);
  const w = conquian();
  w.manos[0] = es("1c 1e 2o 3o 4o 7b 10b 11b"); w.oferta = { carta: e("1o"), para: 0, origen: "descarte", segunda: false };
  assert(C.conquianActuar(w, { accion: "tomar", con: es("1c 1e") }));
  assert(C.conquianActuar(w, { accion: "bajar", con: es("2o 3o 4o") }));
  assertEquals(w.terminada, false);
  assert(C.conquianActuar(w, { accion: "bajar", con: es("7b 10b 11b") }));
  assertEquals([w.terminada, w.ganador], [true, 0], "9 cartas bajadas");
  const t = conquian();
  t.mazo = []; t.oferta = { carta: e("12c"), para: 0, origen: "descarte", segunda: false };
  assert(C.conquianActuar(t, { accion: "pasar" }));
  assertEquals([t.terminada, t.ganador], [true, -1], "empate: se acabó el mazo");
});

Deno.test("conquián: 200 partidas de bots válidas que conservan las 40 cartas", () => {
  let ganadas = 0;
  for (let s = 1; s <= 200; s++) {
    const rng = mulberry(s);
    const st = C.conquianNueva([{ id: "a", bot: true }, { id: "b", bot: true }], rng);
    let pasos = 0;
    while (!st.terminada) {
      const mv = C.conquianBot(st, rng);
      if (!C.conquianActuar(st, mv)) throw new Error(`semilla ${s}: jugada inválida ${JSON.stringify(mv)} en ${st.fase}`);
      if (++pasos > 400) throw new Error(`semilla ${s}: sin fin`);
      const total = st.manos.flat().length + st.bajados.flat(2).length + st.mazo.length + st.muertas.length + (st.oferta ? 1 : 0);
      if (total !== 40) throw new Error(`semilla ${s}: ${total} cartas`);
    }
    if (st.ganador >= 0) { ganadas++; assertEquals(st.bajados[st.ganador].flat().length >= 9, true); }
  }
  assert(ganadas > 20, `los bots ganan algunas (${ganadas}/200)`);
});
