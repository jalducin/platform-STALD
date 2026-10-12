// Motor de los clásicos rápidos (openspec: clasicos-rapidos). Sin DOM: el mismo archivo que carga juegos.html.
// Reglas de cada juego, bots y reproducción determinista de cada sala (turnos, tiempo agotado, fin y empates).
// deno-lint-ignore-file no-explicit-any
import { assert, assertEquals } from "jsr:@std/assert@1";
import "../juegos/clasicos-rapidos.js";

const C = (globalThis as any).ClasicosRapidos;
const X = "X", O = "O", _ = null;

// Contexto de sala: dos personas, reloj normal y semilla fija.
function ctxSala(jugadas: any[], ahora: number, extra: Record<string, unknown> = {}) {
  return {
    orden: [{ id: "m" }, { id: "a" }], jugadas, inicio: 0, ahora, dur: (ms: number) => ms, rng: (e: string) => C.rng(42, e), ...extra,
  };
}
// Jugadas de una lista [jugador, campos] con pasos 0, 1, 2… y 1 s entre cada una.
const seguidas = (lista: [string, Record<string, unknown>][], desde = 1000) => lista.map(([jugador, j], n) => ({ jugador, n, t: desde + n * 1000, ...j }));

// ---------- Gato ----------
Deno.test("gato: líneas ganadoras y empate", () => {
  assertEquals(C.gatoGanador([X, X, X, _, O, O, _, _, _]), { gana: X, linea: [0, 1, 2] });
  assertEquals(C.gatoGanador([O, X, X, _, O, X, _, _, O]), { gana: O, linea: [0, 4, 8] });
  assertEquals(C.gatoGanador([X, O, _, X, O, _, X, _, _]).linea, [0, 3, 6]);
  assertEquals(C.gatoGanador([X, O, X, X, O, O, O, X, X]), { empate: true });
  assertEquals(C.gatoGanador([X, O, _, _, _, _, _, _, _]), null);
});

Deno.test("gato: el bot gana si puede, bloquea y el difícil nunca pierde", () => {
  const r = () => 0.5;
  assertEquals(C.gatoBot([O, O, _, X, X, _, _, _, _], O, 2, r), 2, "medio: gana");
  assertEquals(C.gatoBot([X, X, _, _, O, _, _, _, _], O, 3, r), 2, "difícil: bloquea");
  // El difícil contra todas las respuestas posibles de un rival que empieza: nunca pierde.
  let partidas = 0;
  const explorar = (t: (string | null)[], turno: string) => {
    const g = C.gatoGanador(t);
    if (g) { partidas++; assert(g.empate || g.gana === O, "el bot (O) perdió: " + t.join(",")); return; }
    if (turno === O) { const c = C.gatoBot(t, O, 3, Math.random); assert(!t[c]); const u = t.slice(); u[c] = O; explorar(u, X); return; }
    t.forEach((v, i) => { if (!v) { const u = t.slice(); u[i] = X; explorar(u, O); } });
  };
  explorar(new Array(9).fill(null), X);
  assert(partidas > 100, String(partidas));
  // El fácil juega una casilla libre al azar.
  assertEquals(C.gatoBot([X, O, X, O, X, O, O, X, _], X, 1, Math.random), 8);
});

// ---------- Conecta 4 ----------
Deno.test("conecta4: caída, columna llena, 4 en línea y empate", () => {
  let t = C.c4Vacio();
  const s1 = C.c4Soltar(t, 3, "R");
  assertEquals([s1.fila, s1.t[5 * 7 + 3]], [5, "R"], "cae hasta abajo");
  t = s1.t;
  for (let k = 0; k < 5; k++) t = C.c4Soltar(t, 3, k % 2 ? "R" : "A").t;
  assertEquals(C.c4Soltar(t, 3, "R"), null, "columna llena");
  // Horizontal
  let h = C.c4Vacio(); for (const col of [0, 1, 2, 3]) h = C.c4Soltar(h, col, "R").t;
  assertEquals(C.c4Ganador(h), { gana: "R", linea: [35, 36, 37, 38] });
  // Vertical
  let v = C.c4Vacio(); for (let k = 0; k < 4; k++) v = C.c4Soltar(v, 6, "A").t;
  assertEquals(C.c4Ganador(v).gana, "A");
  // Diagonal ↗ desde abajo a la izquierda
  let d = C.c4Vacio();
  for (const [col, f] of [[0, "R"], [1, "A"], [1, "R"], [2, "A"], [2, "A"], [2, "R"], [3, "A"], [3, "A"], [3, "A"], [3, "R"]] as [number, string][]) d = C.c4Soltar(d, col, f).t;
  assertEquals(C.c4Ganador(d), { gana: "R", linea: [17, 23, 29, 35] });
  // Diagonal ↘
  let e = C.c4Vacio();
  for (const [col, f] of [[6, "R"], [5, "A"], [5, "R"], [4, "A"], [4, "A"], [4, "R"], [3, "A"], [3, "A"], [3, "A"], [3, "R"]] as [number, string][]) e = C.c4Soltar(e, col, f).t;
  assertEquals(C.c4Ganador(e).gana, "R");
  // Tablero lleno sin 4 en línea: patrón por pares de columnas que nunca alinea 4.
  const lleno = Array.from({ length: 42 }, (_, i) => { const f = Math.floor(i / 7), c = i % 7; return (Math.floor(c / 2) + f + Number(c === 6)) % 2 ? "R" : "A"; });
  assertEquals(C.c4Ganador(lleno), { empate: true });
});

Deno.test("conecta4: el bot gana o bloquea en todos los niveles", () => {
  for (const nivel of [1, 2, 3]) {
    let t = C.c4Vacio(); for (const col of [0, 1, 2]) t = C.c4Soltar(t, col, "A").t;
    t = C.c4Soltar(t, 0, "R").t; t = C.c4Soltar(t, 1, "R").t;
    assertEquals(C.c4Bot(t, "A", nivel, () => 0.3), 3, "gana con la 4.ª en la fila de abajo (nivel " + nivel + ")");
    let b = C.c4Vacio(); for (const col of [2, 3, 4]) b = C.c4Soltar(b, col, "R").t;
    b = C.c4Soltar(b, 1, "A").t; b = C.c4Soltar(b, 2, "A").t;
    assertEquals(C.c4Bot(b, "A", nivel, () => 0.3), 5, "bloquea la columna 5 (nivel " + nivel + ")");
  }
});

// ---------- Piedra, papel o tijera ----------
Deno.test("ppt: quién gana, pasar y bot", () => {
  assertEquals([C.pptGana("piedra", "tijera"), C.pptGana("tijera", "papel"), C.pptGana("papel", "piedra")], [1, 1, 1]);
  assertEquals([C.pptGana("tijera", "piedra"), C.pptGana("papel", "papel")], [-1, 0]);
  assertEquals([C.pptGana("piedra", null), C.pptGana(null, "papel"), C.pptGana(null, null)], [1, -1, 0], "no elegir pierde");
  for (let i = 0; i < 20; i++) assert(C.PPT.includes(C.pptBot(["piedra", "piedra"], Math.random)));
});

// ---------- Ahorcado ----------
Deno.test("ahorcado: palabras válidas, aciertos, errores, resuelta y perdida", () => {
  const vocab = [{ en: "apple", es: "manzana", emoji: "🍎" }, { en: "ice cream", es: "helado", emoji: "🍦" }, { en: "TV", es: "tele", emoji: "📺" }, { en: "dog", es: "perro", emoji: "🐶" }];
  assertEquals(C.ahorcadoPalabras(vocab).map((x: any) => x.en), ["apple", "dog"]);
  const e = C.ahorcadoEstado("apple", ["p", "z", "a"]);
  assertEquals([e.mascara, e.errores, e.resuelta, e.perdida], [["a", "p", "p", null, null], 1, false, false]);
  assertEquals(C.ahorcadoEstado("apple", ["a", "p", "l", "e"]).resuelta, true);
  assertEquals(C.ahorcadoEstado("dog", ["a", "b", "c", "e", "f", "h"]).perdida, true);
  assertEquals(C.ahorcadoEstado("dog", ["a", "b", "c", "e", "f"]).perdida, false);
  const bot = C.ahorcadoBot(["e", "t"], () => 0.99);
  assert(/^[a-z]$/.test(bot) && !["e", "t"].includes(bot));
});

// ---------- Serpientes y escaleras ----------
Deno.test("serpientes: escaleras, serpientes, meta y dado", () => {
  assertEquals(C.serpMover(0, 4), { desde: 0, paso: 4, hasta: 14, salto: "escalera" });
  assertEquals(C.serpMover(10, 6), { desde: 10, paso: 16, hasta: 6, salto: "serpiente" });
  assertEquals(C.serpMover(20, 3), { desde: 20, paso: 23, hasta: 23, salto: null });
  assertEquals(C.serpMover(97, 5).hasta, 100, "llega a la meta aunque sobre");
  assertEquals(C.serpMover(94, 1).hasta, 75, "la 95 es serpiente");
  assertEquals(Object.keys(C.SERP_ESCALERAS).length + Object.keys(C.SERP_SERPIENTES).length, 19);
  const caras = new Set(Array.from({ length: 200 }, (_, i) => C.serpDado(C.rng(7, "dado" + i))));
  assertEquals([...caras].sort(), [1, 2, 3, 4, 5, 6]);
  assertEquals(C.serpCelda(1), { fila: 9, col: 0 });
  assertEquals(C.serpCelda(11), { fila: 8, col: 9 }, "el renglón 2 va de derecha a izquierda");
  assertEquals(C.serpCelda(100), { fila: 0, col: 0 });
});

// ---------- Salas ----------
Deno.test("sala gato: turnos, jugada inválida ignorada, ganar ronda y pausa", () => {
  // Ronda 0: m (X) gana con la fila de arriba. La jugada de a en una casilla ocupada se ignora (sigue su turno).
  const jug = seguidas([["m", { accion: "marcar", casilla: 0 }], ["a", { accion: "marcar", casilla: 0 }], ["a", { accion: "marcar", casilla: 4 }], ["m", { accion: "marcar", casilla: 1 }], ["a", { accion: "marcar", casilla: 8 }], ["m", { accion: "marcar", casilla: 2 }]]);
  const st = C.salaGato(ctxSala(jug, 6500));
  assertEquals([st.resultados.length, st.resultados[0].gana, st.resultados[0].linea, st.victorias, st.puntos], [1, 0, [0, 1, 2], [1, 0], [300, 0]]);
  assert(st.esperaHasta > 6500 && !st.fin, "pausa entre rondas");
  // En la ronda 1 empieza a (O).
  const st2 = C.salaGato(ctxSala(jug, st.esperaHasta + 10));
  assertEquals([st2.ronda, st2.turnoIdx, st2.t.every((x: any) => x === null)], [1, 1, true]);
});

Deno.test("sala gato: tiempo agotado juega una casilla al azar igual en todos y la serie termina con empate", () => {
  const st = C.salaGato(ctxSala([], 20_000 + 5));
  assertEquals([st.paso, st.t.filter(Boolean).length, st.ultima.auto], [1, 1, true], "a los 20 s se marcó sola");
  assertEquals(C.salaGato(ctxSala([], 20_005)).ultima.casilla, st.ultima.casilla, "determinista");
  // Sin nadie jugando: 3 rondas automáticas y fin.
  const fin = C.salaGato(ctxSala([], 3_600_000));
  assert(fin.fin, "terminó");
  assertEquals(fin.resultados.length, 3);
  assertEquals(fin.puntos[0] + fin.puntos[1], fin.resultados.reduce((a: number, r: any) => a + (r.gana === null ? 240 : 300), 0));
  // Empate de ronda: 120 para cada quien.
  const empate = seguidas([0, 4, 8, 2, 6, 3, 5, 7, 1].map((c, k) => [k % 2 ? "a" : "m", { accion: "marcar", casilla: c }] as [string, Record<string, unknown>]));
  const se = C.salaGato(ctxSala(empate, 9500));
  assertEquals([se.resultados[0].gana, se.puntos, se.empates], [null, [120, 120], 1]);
});

Deno.test("sala conecta4: gana en vertical y el turno vencido suelta una ficha", () => {
  const jug = seguidas([["m", { accion: "soltar", col: 0 }], ["a", { accion: "soltar", col: 1 }], ["m", { accion: "soltar", col: 0 }], ["a", { accion: "soltar", col: 1 }], ["m", { accion: "soltar", col: 0 }], ["a", { accion: "soltar", col: 9 }], ["a", { accion: "soltar", col: 1 }], ["m", { accion: "soltar", col: 0 }]]);
  const st = C.salaConecta4(ctxSala(jug, 9000));
  assertEquals([st.fin && st.fin.gana, st.linea, st.puntos], [0, [14, 21, 28, 35], [800, 100]]);
  const auto = C.salaConecta4(ctxSala([], 25_001));
  assertEquals([auto.paso, auto.t.filter(Boolean).length, auto.ultima.auto], [1, 1, true]);
});

Deno.test("sala conecta4: tablero lleno es empate (400 y 400)", () => {
  // Orden de columnas que llena el tablero sin 4 en línea (hallado por búsqueda).
  const cols = [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 4, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6, 6];
  const jug = cols.map((col, n) => ({ jugador: n % 2 ? "a" : "m", n, t: 1000 + n * 100, accion: "soltar", col }));
  const st = C.salaConecta4(ctxSala(jug, 60_000));
  assertEquals([st.paso, st.fin.gana, st.linea, st.puntos], [42, null, null, [400, 400]]);
});

Deno.test("sala ppt: rondas simultáneas, cierre cuando todos eligen, victorias y puntos", () => {
  const orden = [{ id: "m" }, { id: "a" }, { id: "l" }];
  const elige = (jugador: string, n: number, eleccion: string | null, t: number) => ({ jugador, n, t, ...(eleccion ? { accion: "elegir", eleccion } : { accion: "pasar" }) });
  const jug = [elige("m", 0, "papel", 2000), elige("a", 0, "piedra", 3000), elige("l", 0, "piedra", 4000)];
  const st = C.salaPpt(ctxSala(jug, 4500, { orden }));
  assertEquals([st.ronda, st.fase, st.rondas[0].cierre], [0, "revelar", 4000], "cierra cuando eligen todos");
  assertEquals(st.victorias, [2, 0, 0]);
  assertEquals(st.rondas[1].ini, 8000, "la siguiente empieza tras 4 s de revelación");
  // Ronda 1: nadie elige → cierra a los 12 s y nadie gana.
  const st2 = C.salaPpt(ctxSala(jug, 8000 + 12_000 + 1, { orden }));
  assertEquals([st2.ronda, st2.fase, st2.victorias], [1, "revelar", [2, 0, 0]]);
  // Sin más jugadas: termina tras 5 rondas.
  const fin = C.salaPpt(ctxSala(jug, 600_000, { orden }));
  assertEquals([fin.fase, fin.victorias], ["fin", [2, 0, 0]]);
  assertEquals(fin.puntos, [Math.round(800 * 2 / 10) + 200, 0, 0]);
  // La elección oculta ("?") se marca para pedirla de nuevo.
  assertEquals(C.salaPpt(ctxSala([elige("m", 0, "?", 1000), elige("a", 0, "papel", 1200)], 2000)).ocultas, true);
  // Jugada tardía (después del cierre) no cuenta.
  const tarde = C.salaPpt(ctxSala([elige("m", 0, "piedra", 13_000)], 14_000));
  assertEquals(tarde.rondas[0].elecciones, [null, null]);
});

Deno.test("sala ppt: bots eligen igual en todos los dispositivos y hay empate en el primer lugar", () => {
  const orden = [{ id: "m" }, { id: "bot-vachira", bot: true }, { id: "bot-isagii", bot: true }];
  const a = C.salaPpt(ctxSala([], 600_000, { orden })), b = C.salaPpt(ctxSala([], 600_000, { orden }));
  assertEquals(a.rondas.map((r: any) => r.elecciones), b.rondas.map((r: any) => r.elecciones));
  assert(a.rondas.every((r: any) => C.PPT.includes(r.elecciones[1]) && r.elecciones[0] === null));
  const max = Math.max(...a.victorias);
  a.victorias.forEach((v: number, i: number) => { if (v === max && max > 0) assert(a.puntos[i] >= 200, "bono al primer lugar (con empate)"); });
});

Deno.test("sala ahorcado: competitivo (acierto sigue), coop (+50 a todos), pasar y palabra perdida", () => {
  const palabras = [{ en: "dog", es: "perro", emoji: "🐶" }, { en: "cat", es: "gato", emoji: "🐱" }, { en: "sun", es: "sol", emoji: "☀️" }];
  const L = (jugador: string, letra: string | null) => [jugador, letra ? { accion: "letra", letra } : { accion: "pasar" }] as [string, Record<string, unknown>];
  // Competitivo: m acierta d y o (sigue), luego g completa: +10 +10 +10 +50.
  const comp = C.salaAhorcado(ctxSala(seguidas([L("m", "d"), L("m", "o"), L("m", "g")]), 3500, { palabras, modo: "compite" }));
  assertEquals([comp.puntos, comp.resultados[0].resuelta, comp.resultados[0].por], [[80, 0], true, 0]);
  // Cooperativo: el turno rota y al completar todos ganan 50; una letra repetida se ignora.
  const coop = C.salaAhorcado(ctxSala(seguidas([L("m", "d"), L("a", "d"), L("a", "o"), L("m", "g")]), 4500, { palabras, modo: "coop" }));
  assertEquals([coop.puntos, coop.resultados[0].resuelta], [[10 + 10 + 50, 10 + 50], true]);
  // Palabra perdida con 6 errores (y pasar no cuenta como error).
  const mal = C.salaAhorcado(ctxSala(seguidas([L("m", "a"), L("a", null), L("m", "b"), L("a", "c"), L("m", "e"), L("a", "f"), L("m", "h")]), 7500, { palabras, modo: "compite" }));
  assertEquals([mal.resultados[0].resuelta, mal.resultados[0].perdida, mal.puntos], [false, true, [0, 0]]);
  // Sin jugadas: turnos vencidos (pasar) hasta el final de la sala.
  const nada = C.salaAhorcado(ctxSala([], 20_005, { palabras, modo: "compite" }));
  assertEquals([nada.paso, nada.ultima.accion, nada.turnoIdx], [1, "pasar", 1]);
});

Deno.test("sala serpientes: dado de la semilla, 6 repite turno, bots y fin", () => {
  const orden = [{ id: "m" }, { id: "bot-vachira", bot: true }];
  const jug = [{ jugador: "m", n: 0, t: 500, accion: "tirar" }];
  const st = C.salaSerpientes(ctxSala(jug, 600, { orden }));
  const d0 = C.serpDado(C.rng(42, "dado0"));
  assertEquals([st.ultima.dado, st.pos[0]], [d0, C.serpMover(0, d0).hasta]);
  assertEquals(st.turnoIdx, d0 === 6 ? 0 : 1, "con 6 repite");
  // Sin jugadas humanas, la partida termina sola (turnos vencidos) con un ganador en la casilla 100 o por tope.
  const fin = C.salaSerpientes(ctxSala([], 36_000_000, { orden }));
  assert(fin.fin, "terminó");
  assert(fin.pos[fin.fin.gana] === 100 || fin.tiros >= C.SERP_SALA.maxTiros);
  assertEquals(fin.puntos[fin.fin.gana], 700);
  const otro = 1 - fin.fin.gana;
  assertEquals(fin.puntos[otro], fin.pos[otro] * 4);
});
