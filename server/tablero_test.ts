// Juegos de tablero (openspec: juegos-tablero): motores sin DOM de juegos/tablero.js (Damas, Dominó, Parchís y
// Batalla naval) y las reglas de sala del servidor (forma de las jugadas, cupos y bots).
// deno-lint-ignore-file no-explicit-any
import { assert, assertEquals } from "jsr:@std/assert@1";
import "../juegos/tablero.js";
import { clearCacheJuegos, handleJuegos } from "./juegos.ts";
import { clearCacheSalas } from "./salas.ts";
import { MemoryStore } from "./store.ts";

const T = (globalThis as any).Tablero;
const { Damas, Domino, Parchis, Naval } = T;

// ---------- Damas ----------
// Filas de arriba (0) a abajo (7): «b» peón blanco, «B» dama blanca, «n» peón negro, «N» dama negra, «.» vacía.
const ruta = (mv: any) => mv.ruta.map((i: number) => Damas.nombre(i)).join("-");
const rutas = (st: any) => Damas.legales(st).map(ruta).sort();
const fc = (f: number, c: number) => Damas.idx(f, c);

Deno.test("damas: tablero inicial con 12 piezas por lado y 7 jugadas de las blancas", () => {
  const st = Damas.nueva();
  assertEquals([Damas.piezas(st, "b"), Damas.piezas(st, "n"), st.turno], [12, 12, "b"]);
  assertEquals(Damas.legales(st).length, 7);
  assert(Damas.legales(st).every((m: any) => m.ruta.length === 2 && m.capturas.length === 0));
  assertEquals(Damas.resultado(st), null);
});

Deno.test("damas: la captura es obligatoria", () => {
  const st = Damas.desdeFilas([
    "........", "........", "........", "........",
    "...n....", "..b...b.", "........", "........",
  ], "b");
  const ls = Damas.legales(st);
  assertEquals(ls.length, 1, rutas(st).join(" "));
  assertEquals(ls[0].ruta, [fc(5, 2), fc(3, 4)]);
  assertEquals(ls[0].capturas, [fc(4, 3)]);
  const st2 = Damas.aplicar(st, ls[0]);
  assertEquals([st2.t[fc(4, 3)], st2.t[fc(3, 4)], st2.turno, Damas.piezas(st2, "n")], ["", "b", "n", 0]);
  assertEquals(Damas.resultado(st2), { gana: "b", fin: "sin-piezas" });
});

Deno.test("damas: salto múltiple en una sola jugada", () => {
  const st = Damas.desdeFilas([
    "........", "........", "........", "....n...",
    "........", "..n.....", ".b......", "........",
  ], "b");
  const ls = Damas.legales(st);
  assertEquals(ls.length, 1);
  assertEquals(ls[0].ruta, [fc(6, 1), fc(4, 3), fc(2, 5)]);
  assertEquals(ls[0].capturas.length, 2);
  const st2 = Damas.aplicar(st, ls[0]);
  assertEquals(Damas.piezas(st2, "n"), 0);
  assert(Damas.buscar(st, [fc(6, 1), fc(4, 3)]) === null, "no se puede cortar el salto a la mitad");
});

Deno.test("damas: coronación y la dama mueve hacia atrás; coronar termina el turno", () => {
  const st = Damas.desdeFilas([
    "........", "..b.....", "........", "........",
    "........", "........", "........", "......n.",
  ], "b");
  const mv = Damas.buscar(st, [fc(1, 2), fc(0, 1)]);
  assert(mv && mv.corona);
  const st2 = Damas.aplicar(st, mv);
  assertEquals(st2.t[fc(0, 1)], "B");
  // Al coronar capturando, el turno termina aunque la dama pudiera seguir saltando.
  const st3 = Damas.desdeFilas([
    "........", "..n.n...", ".b......", "........",
    "........", "........", "........", "......n.",
  ], "b");
  const ls = Damas.legales(st3);
  assertEquals(ls.map((m: any) => m.ruta.length), [2]);
  assertEquals(Damas.aplicar(st3, ls[0]).t[fc(0, 3)], "B");
  // La dama se mueve en las 4 diagonales.
  const dama = Damas.desdeFilas([
    "........", "........", "........", "........",
    "...B....", "........", "........", "n.......",
  ], "b");
  assertEquals(Damas.legales(dama).length, 4);
});

Deno.test("damas: sin jugadas pierde y 40 medios movimientos sin avance es empate", () => {
  const bloqueada = Damas.desdeFilas([
    "........", "........", "........", "........",
    "........", "..n.....", ".n......", "b.......",
  ], "b");
  assertEquals(Damas.legales(bloqueada).length, 0);
  assertEquals(Damas.resultado(bloqueada), { gana: "n", fin: "sin-jugadas" });
  let st = Damas.desdeFilas([
    "........", "........", ".....N..", "........",
    "........", "........", ".B......", "........",
  ], "b");
  const ida = [[fc(6, 1), fc(5, 2)], [fc(2, 5), fc(3, 4)], [fc(5, 2), fc(6, 1)], [fc(3, 4), fc(2, 5)]];
  for (let i = 0; i < 40; i++) {
    assertEquals(Damas.resultado(st), null, `medio movimiento ${i}`);
    st = Damas.aplicar(st, Damas.buscar(st, ida[i % 4]));
  }
  assertEquals(Damas.resultado(st), { empate: true, fin: "sin-avance" });
});

Deno.test("damas: los bots de 2 niveles juegan legal hasta terminar y el difícil no regala la captura", () => {
  for (const nivel of [1, 2]) {
    let st = Damas.nueva();
    const rnd = T.rng("damas" + nivel);
    let guard = 0;
    while (!Damas.resultado(st) && guard++ < 300) {
      const mv = Damas.bot(st, st.turno === "b" ? nivel : 1, rnd);
      assert(Damas.legales(st).some((m: any) => ruta(m) === ruta(mv)), "jugada legal");
      st = Damas.aplicar(st, mv);
    }
    assert(Damas.resultado(st), `nivel ${nivel}: la partida termina`);
  }
  // Con dos capturas posibles, el difícil escoge el salto doble.
  const st = Damas.desdeFilas([
    ".......n", "........", "........", "....n...",
    "........", "..n.....", ".b...n..", "....b...",
  ], "b");
  assertEquals(Damas.legales(st).map((m: any) => m.capturas.length).sort(), [1, 2]);
  assertEquals(Damas.bot(st, 2, T.rng("x")).capturas.length, 2);
});

// ---------- Dominó ----------
Deno.test("dominó: 28 fichas, 7 por jugador y sale la mula más alta", () => {
  assertEquals(Domino.FICHAS.length, 28);
  assertEquals(new Set(Domino.FICHAS.map((f: number[]) => f.join("-"))).size, 28);
  const st = Domino.nueva(4, T.rng("domino"));
  assertEquals(st.manos.map((m: number[]) => m.length), [7, 7, 7, 7]);
  assertEquals(new Set(st.manos.flat()).size, 28);
  const mula6 = Domino.FICHAS.findIndex((f: number[]) => f[0] === 6 && f[1] === 6);
  assert(st.manos[st.turno].includes(mula6), "sale quien tiene la mula de seis");
  assertEquals(Domino.jugables(st).map((x: any) => x.ficha), [mula6], "la primera ficha es la mula");
  const st2 = Domino.nueva(2, T.rng("dos"));
  assertEquals(st2.manos.flat().length, 14);
});

const ficha = (a: number, b: number) => Domino.FICHAS.findIndex((f: number[]) => (f[0] === a && f[1] === b) || (f[0] === b && f[1] === a));
// Mesa con extremos izq y der; `cadena` son las fichas ya tiradas (por omisión, la ficha izq-der).
function mesa(manos: number[][][], izq: number, der: number, turno = 0, cadena: number[][] = [[izq, der]]) {
  const st = Domino.nueva(manos.length, T.rng("base"));
  st.manos = manos.map((m) => m.map(([a, b]) => ficha(a, b)));
  st.mesa = cadena.map(([a, b]) => ({ f: ficha(a, b), a, b }));
  st.izq = izq; st.der = der; st.turno = turno; st.primera = null; st.pases = 0; st.fin = null;
  return st;
}

Deno.test("dominó: embona a la derecha y una ficha que entra en los dos lados da a elegir", () => {
  const st = mesa([[[3, 5], [6, 1]], [[0, 0], [2, 2]]], 6, 3);
  const js = Domino.jugables(st).map((x: any) => Domino.FICHAS[x.ficha].join("-") + x.lado).sort();
  assertEquals(js, ["1-6i", "3-5d"]);
  assert(Domino.jugar(st, { ficha: ficha(3, 5), lado: "d" }));
  assertEquals([st.izq, st.der], [6, 5]);
  assert(!Domino.jugar(st, { ficha: ficha(0, 0), lado: "d" }), "no es su turno ni embona");
  const doble = mesa([[[6, 3], [1, 1]], [[0, 0]]], 6, 3, 0, [[6, 4], [4, 3]]);
  assertEquals(Domino.jugables(doble).filter((x: any) => x.ficha === ficha(6, 3)).map((x: any) => x.lado).sort(), ["d", "i"]);
});

Deno.test("dominó: quien no tiene ficha pasa y gana quien se queda sin fichas", () => {
  const st = mesa([[[3, 4], [4, 5]], [[0, 0], [1, 1]], [[4, 4], [2, 2]]], 6, 3);
  assert(Domino.jugar(st, { ficha: ficha(3, 4), lado: "d" }));
  // El jugador 1 no tiene 6 ni 4: pasa solo y le toca al 2.
  assertEquals(st.turno, 2);
  assert(st.log.some((x: any) => x.j === 1 && x.pasa));
  assert(Domino.jugar(st, { ficha: ficha(4, 4), lado: "d" }));
  assertEquals(st.turno, 0, "le toca al 0, que tiene el 4-5");
  const gana = mesa([[[3, 2]], [[0, 0]]], 6, 3);
  assert(Domino.jugar(gana, { ficha: ficha(3, 2), lado: "d" }));
  assertEquals(gana.fin, { ganadores: [0], cerrado: false });
});

Deno.test("dominó: juego cerrado gana quien suma menos y el empate da dos ganadores", () => {
  const st = mesa([[[3, 6], [0, 1]], [[0, 2], [1, 1]]], 6, 3, 0, [[6, 5], [5, 3]]);
  assert(Domino.jugar(st, { ficha: ficha(3, 6), lado: "d" }));
  // Extremos 6 y 6: nadie tiene 6 → se cierra. Mano 0: 0-1 = 1 punto; mano 1: 0-2 + 1-1 = 4.
  assertEquals(st.fin, { ganadores: [0], cerrado: true });
  const emp = mesa([[[3, 6], [0, 2]], [[1, 1]]], 6, 3, 0, [[6, 5], [5, 3]]);
  assert(Domino.jugar(emp, { ficha: ficha(3, 6), lado: "d" }));
  assertEquals(emp.fin, { ganadores: [0, 1], cerrado: true });
  assertEquals([Domino.pips(emp, 0), Domino.pips(emp, 1)], [2, 2]);
});

Deno.test("dominó: los bots juegan una partida completa con fichas válidas", () => {
  for (const n of [2, 3, 4]) {
    const st = Domino.nueva(n, T.rng("bots" + n));
    const rnd = T.rng("b" + n);
    let guard = 0;
    while (!st.fin && guard++ < 100) {
      const mv = Domino.bot(st, rnd);
      assert(Domino.jugar(st, mv), "jugada del bot válida");
    }
    assert(st.fin && st.fin.ganadores.length >= 1, `con ${n} termina`);
  }
});

// ---------- Parchís ----------
Deno.test("parchís: el dado sale de la semilla, del 1 al 6, igual para todos", () => {
  const vistos = new Set<number>();
  for (let k = 0; k < 600; k++) { const d = Parchis.dado(1234, k); assert(d >= 1 && d <= 6); vistos.add(d); }
  assertEquals(vistos.size, 6);
  assertEquals(Parchis.dado(1234, 7), Parchis.dado(1234, 7));
  assertEquals(Parchis.nueva(2, 99).colores, [0, 2], "con 2 jugadores, colores opuestos");
});

function parchis(n: number, fichas: number[][], dado: number, turno = 0) {
  const st = Parchis.nueva(n, 1, 4);
  st.fichas = fichas; st.turno = turno; st.dado = dado; st.fin = null; st.forzar = [];
  return st;
}

Deno.test("parchís: se sale con 5 y sin jugada el turno pasa solo", () => {
  const casa = [[-1, -1, -1, -1], [-1, -1, -1, -1]];
  const st = parchis(2, casa.map((x) => [...x]), 3);
  assertEquals(Parchis.movibles(st), []);
  const st5 = parchis(2, casa.map((x) => [...x]), 5);
  st5.forzar = [5];
  assertEquals(Parchis.movibles(st5), [0, 1, 2, 3]);
  assert(Parchis.mover(st5, 0));
  assertEquals(st5.fichas[0][0], 0);
  assertEquals([st5.turno, st5.dado], [1, 5], "el 5 no repite: tira el 1");
  // El jugador 1 sacó 2 sin fichas fuera: pasa solo y vuelve al 0.
  const sinJugada = parchis(2, casa.map((x) => [...x]), 5);
  sinJugada.forzar = [2, 4];
  Parchis.mover(sinJugada, 0);
  assertEquals([sinJugada.turno, sinJugada.dado], [0, 4]);
  assert(sinJugada.log.some((x: any) => x.j === 1 && x.sin));
});

Deno.test("parchís: el 6 y comer repiten tiro; en casilla segura no se come", () => {
  const st = parchis(4, [[0, -1, -1, -1], [-1, -1, -1, -1], [-1, -1, -1, -1], [-1, -1, -1, -1]], 6);
  st.forzar = [1];
  assert(Parchis.mover(st, 0));
  assertEquals([st.fichas[0][0], st.turno], [6, 0]);
  // Ficha verde (color 1, sale en 13) en la casilla absoluta 5: p = 44. La roja en 2 saca 3 y la come.
  const come = parchis(4, [[2, -1, -1, -1], [44, -1, -1, -1], [-1, -1, -1, -1], [-1, -1, -1, -1]], 3);
  come.forzar = [1];
  assert(Parchis.mover(come, 0));
  assertEquals([come.fichas[0][0], come.fichas[1][0], come.turno], [5, -1, 0]);
  // En la estrella 8 no se come: la verde en p = 47 (absoluta 8).
  const segura = parchis(4, [[5, -1, -1, -1], [47, -1, -1, -1], [-1, -1, -1, -1], [-1, -1, -1, -1]], 3);
  segura.forzar = [1];
  assert(Parchis.mover(segura, 0));
  assertEquals([segura.fichas[0][0], segura.fichas[1][0], segura.turno], [8, 47, 1]);
  assert(Parchis.SEGURAS.includes(8) && Parchis.SEGURAS.includes(13));
});

Deno.test("parchís: a la meta con tiro exacto y gana quien mete todas", () => {
  const st = parchis(2, [[54, 56, 56, 56], [-1, -1, -1, -1]], 4);
  assertEquals(Parchis.movibles(st), []);
  const ok = parchis(2, [[54, 56, 56, 56], [-1, -1, -1, -1]], 2);
  assert(Parchis.mover(ok, 0));
  assertEquals(ok.fin, { ganador: 0 });
  assertEquals(Parchis.enMeta(ok, 0), 4);
  assert(!Parchis.mover(ok, 0), "terminada no acepta jugadas");
});

Deno.test("parchís: los bots terminan partidas rápidas y completas", () => {
  for (const [n, cuantas] of [[2, 2], [4, 4], [3, 4]]) {
    const st = Parchis.nueva(n, 777 + n, cuantas);
    const rnd = T.rng("p" + n);
    let guard = 0;
    while (!st.fin && guard++ < 3000) {
      const f = Parchis.bot(st, rnd);
      assert(Parchis.movibles(st).includes(f));
      assert(Parchis.mover(st, f));
    }
    assert(st.fin, `${n} jugadores con ${cuantas} fichas terminan`);
    assertEquals(Parchis.enMeta(st, st.fin.ganador), cuantas);
  }
  // Coordenadas del tablero: 52 casillas del anillo distintas y dentro del 15×15.
  const celdas = new Set(Array.from({ length: 52 }, (_, i) => Parchis.anillo(i).join(",")));
  assertEquals(celdas.size, 52);
});

// ---------- Batalla naval ----------
const flotaBase = () => [[0, 1, 2, 3, 4], [20, 30, 40, 50], [7, 8, 9], [62, 63, 64], [97, 98]];

Deno.test("naval: flota válida e inválida", () => {
  assert(Naval.validarFlota(flotaBase()));
  const malas = [
    [[0, 1, 2, 3, 4], [20, 30, 40, 50], [7, 8, 9], [62, 63, 64]], // falta un barco
    [[0, 1, 2, 3, 4], [2, 12, 22, 32], [7, 8, 9], [62, 63, 64], [97, 98]], // encimados
    [[0, 11, 22, 33, 44], [20, 30, 40, 50], [7, 8, 9], [62, 63, 64], [97, 98]], // diagonal
    [[0, 1, 2, 3, 4], [20, 30, 40, 50], [8, 9, 10], [62, 63, 64], [97, 98]], // da la vuelta de fila
    [[0, 1, 2, 3, 4], [20, 30, 40, 50], [7, 8, 9], [62, 63, 64], [99, 100]], // fuera
    [[0, 1, 2, 3, 4], [20, 30, 40, 50], [7, 8, 9], [62, 63, 64, 65], [97, 98]], // tamaños
    [[0, 2, 3, 4, 5], [20, 30, 40, 50], [7, 8, 9], [62, 63, 64], [97, 98]], // con hueco
    "x", null, [[1.5]],
  ];
  for (const m of malas) assert(!Naval.validarFlota(m), JSON.stringify(m));
  for (let s = 0; s < 60; s++) assert(Naval.validarFlota(Naval.autoFlota(T.rng("auto" + s))), "acomodo automático " + s);
  assertEquals([Naval.nombre(0), Naval.nombre(9), Naval.nombre(99), Naval.nombre(23)], ["A1", "J1", "J10", "D3"]);
});

Deno.test("naval: agua, tocado y hundido", () => {
  const f = flotaBase();
  assertEquals(Naval.disparo(f, [], 55), { r: "agua" });
  assertEquals(Naval.disparo(f, [97], 98), { r: "hundido", barco: [97, 98] });
  assertEquals(Naval.disparo(f, [], 98), { r: "tocado" });
  assert(!Naval.todoHundido(f, [97, 98]));
  assert(Naval.todoHundido(f, f.flat()));
});

Deno.test("naval: el bot caza alrededor de lo tocado, sigue la línea y no repite", () => {
  const rnd = T.rng("bot");
  const v = Naval.bot([{ c: 44, r: "tocado" }], rnd);
  assert([34, 43, 45, 54].includes(v), String(v));
  const linea = Naval.bot([{ c: 44, r: "tocado" }, { c: 45, r: "tocado" }], rnd);
  assert([43, 46].includes(linea), String(linea));
  const borde = Naval.bot([{ c: 44, r: "tocado" }, { c: 45, r: "tocado" }, { c: 46, r: "agua" }], rnd);
  assertEquals(borde, 43);
  const caza = Naval.bot([{ c: 44, r: "tocado" }, { c: 45, r: "hundido", barco: [44, 45] }], rnd);
  assertEquals((Math.floor(caza / 10) + caza % 10) % 2, 0, "vuelve a cazar en patrón");
  // Partida completa: hunde todo sin repetir en menos de 100 disparos.
  const f = Naval.autoFlota(T.rng("rival"));
  const hist: any[] = [];
  while (!Naval.todoHundido(f, hist.map((x) => x.c)) && hist.length < 100) {
    const c = Naval.bot(hist, rnd);
    assert(!hist.some((x) => x.c === c), "no repite");
    hist.push({ c, ...Naval.disparo(f, hist.map((x) => x.c), c) });
  }
  assert(hist.length < 100 && hist.length >= 17, String(hist.length));
});

Deno.test("puntos de los juegos de tablero con tope de 1,000", () => {
  assertEquals(T.puntos.naval(true, 40, 17), 770);
  assertEquals(T.puntos.naval(true, 17, 17), 1000);
  assertEquals(T.puntos.naval(false, 60, 9), 180);
  assertEquals(T.puntos.damas("gana", 2, 10, 5), 1000);
  assertEquals(T.puntos.damas("gana", 1, 3, 9), 660);
  assertEquals(T.puntos.damas("empate", 2, 3, 9), 300);
  assertEquals(T.puntos.damas("pierde", 2, 3, 20), 300);
  assertEquals(T.puntos.parchis(4, 4, true), 1000);
  assertEquals(T.puntos.parchis(1, 2, false), 400);
  assertEquals(T.puntos.domino("gana", 30, 0), 800);
  assertEquals(T.puntos.domino("gana", 90, 0), 1000);
  assertEquals(T.puntos.domino("empate", 0, 4), 400);
  assertEquals(T.puntos.domino("pierde", 0, 12), 140);
  assertEquals(T.puntos.domino("pierde", 0, 60), 0);
});

// ---------- Salas (servidor) ----------
const ingles = [
  { alumno: "Marisol", userEmails: ["marisol@example.com"], userNames: ["Marisol"] },
  { alumno: "Angel", userEmails: ["angel@example.com"], userNames: ["Angel"] },
  { alumno: "Jesus", userEmails: ["jesus@example.com"], userNames: ["Jesus"] },
  { alumno: "Laura", userEmails: ["laura@example.com"], userNames: ["Laura"] },
  { alumno: "Sofy", userEmails: ["sofy@example.com"], userNames: ["Sofy"] },
];
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s });
function ctx() {
  clearCacheJuegos();
  const store = new MemoryStore();
  let t = Date.parse("2026-09-30T18:00:00.000Z");
  const deps = {
    store, admin: "admin@example.com", filasIngles: () => Promise.resolve(ingles), filasSecundaria: () => Promise.resolve([]),
    hoy: () => "2026-09-30", ahora: () => new Date(t).toISOString(),
  };
  const call = async (method: string, sub: string, email: string, body?: unknown) => {
    clearCacheSalas();
    const req = new Request(`http://x/juegos${sub}?email=${encodeURIComponent(email)}`, { method, body: body === undefined ? undefined : JSON.stringify(body) });
    const res = await handleJuegos(req, sub, email, deps, json);
    return { status: res.status, body: await res.json() };
  };
  return { call, avanzar: (ms: number) => { t += ms; } };
}
const M = "marisol@example.com", A = "angel@example.com";

Deno.test("salas de tablero: damas y naval son 1 vs 1 sin bots y no empiezan solas", async () => {
  for (const juego of ["damas", "naval"]) {
    const c = ctx();
    const r = await c.call("POST", "/sala", M, { juego, bots: true });
    assertEquals([r.status, r.body.sala.bots], [200, false], juego);
    const codigo = r.body.codigo;
    assertEquals((await c.call("POST", `/sala/${codigo}/empezar`, M)).body.error, "faltan_jugadores");
    assertEquals((await c.call("POST", `/sala/${codigo}/unirse`, A)).status, 200);
    assertEquals((await c.call("POST", `/sala/${codigo}/unirse`, "jesus@example.com")).body.error, "sala_llena");
    assertEquals((await c.call("POST", `/sala/${codigo}/empezar`, M)).status, 200);
  }
});

Deno.test("salas de tablero: dominó y parchís admiten 4 personas y bots opcionales", async () => {
  for (const juego of ["domino", "parchis"]) {
    const c = ctx();
    const sinBots = (await c.call("POST", "/sala", M, { juego, bots: false })).body.codigo;
    assertEquals((await c.call("POST", `/sala/${sinBots}/empezar`, M)).body.error, "faltan_jugadores", juego + " sin bots necesita 2");
    const conBots = await c.call("POST", "/sala", M, { juego, bots: true });
    assertEquals(conBots.body.sala.bots, true);
    const codigo = conBots.body.codigo;
    for (const e of [A, "jesus@example.com", "laura@example.com"]) assertEquals((await c.call("POST", `/sala/${codigo}/unirse`, e)).status, 200);
    assertEquals((await c.call("POST", `/sala/${codigo}/unirse`, "sofy@example.com")).body.error, "sala_llena");
    assertEquals((await c.call("POST", `/sala/${conBots.body.codigo}/empezar`, M)).status, 200, juego + " con bots empieza");
  }
});

Deno.test("salas de tablero: forma de las jugadas de damas, dominó y parchís", async () => {
  const casos: [string, unknown[], unknown[]][] = [
    ["damas", [{ n: 0, accion: "mover", ruta: [21, 17] }, { n: 0, accion: "mover", ruta: [21, 14, 7] }, { n: 0, accion: "rendirse" }],
      [{ n: 0, accion: "mover", ruta: [21] }, { n: 0, accion: "mover", ruta: [21, 32] }, { n: 0, accion: "mover", ruta: "21-17" }, { n: 0, accion: "mover", ruta: Array(14).fill(1) }, { n: 0, accion: "volar" }, { n: 0, accion: "mover", ruta: [1.5, 2] }]],
    ["domino", [{ n: 0, accion: "jugar", ficha: 27, lado: "d" }, { n: 0, accion: "jugar", ficha: 0, lado: "i" }],
      [{ n: 0, accion: "jugar", ficha: 28, lado: "d" }, { n: 0, accion: "jugar", ficha: 3, lado: "x" }, { n: 0, accion: "jugar", ficha: 3 }, { n: 0, accion: "pasar" }]],
    ["parchis", [{ n: 0, accion: "mover", ficha: 0 }, { n: 0, accion: "mover", ficha: 3 }],
      [{ n: 0, accion: "mover", ficha: 4 }, { n: 0, accion: "mover" }, { n: 0, accion: "tirar" }, { n: -1, accion: "mover", ficha: 0 }]],
  ];
  for (const [juego, buenas, malas] of casos) {
    const c = ctx();
    const codigo = (await c.call("POST", "/sala", M, { juego, bots: true })).body.codigo;
    await c.call("POST", `/sala/${codigo}/unirse`, A);
    await c.call("POST", `/sala/${codigo}/empezar`, M);
    c.avanzar(6000);
    for (const mala of malas) assertEquals((await c.call("POST", `/sala/${codigo}/respuesta`, M, { jugada: mala })).body.error, "jugada_invalida", juego + " " + JSON.stringify(mala));
    const r = await c.call("POST", `/sala/${codigo}/respuesta`, M, { jugada: buenas[0] });
    assertEquals(r.status, 200, juego + " " + JSON.stringify(r.body));
    const { t: _t, ...guardada } = r.body.jugadas[0];
    assertEquals(guardada, buenas[0]);
    for (const b of buenas.slice(1)) assertEquals((await c.call("POST", `/sala/${codigo}/respuesta`, A, { jugada: b })).body.error, "turno_tomado", juego);
  }
});

Deno.test("catálogo: los 4 juegos de tablero suman con tope de 1,000 y título para el ranking", async () => {
  const { CATALOGO } = await import("./juegos.ts");
  assertEquals(CATALOGO.damas, { categoria: "mente", titulo: "Damas", max: 1000 });
  assertEquals(CATALOGO.domino, { categoria: "clasicos", titulo: "Dominó", max: 1000 });
  assertEquals(CATALOGO.parchis, { categoria: "clasicos", titulo: "Parchís", max: 1000 });
  assertEquals(CATALOGO.naval, { categoria: "mente", titulo: "Batalla naval", max: 1000 });
  const c = ctx();
  const r = await c.call("POST", "/partida", M, { juego: "parchis", puntos: 5000, aciertos: 4, total: 4, segundos: 300 });
  assertEquals([r.status, r.body.puntos], [200, 1000]);
});
