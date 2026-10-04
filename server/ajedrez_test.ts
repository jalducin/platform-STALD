// Motor de ajedrez (openspec: ajedrez). Sin DOM: el mismo archivo que carga juegos.html.
// deno-lint-ignore-file no-explicit-any
import { assert, assertEquals } from "jsr:@std/assert@1";
import "../juegos/ajedrez.js";

const A = (globalThis as any).Ajedrez;
const mulberry = (a: number) => () => {
  a |= 0; a = a + 0x6D2B79F5 | 0;
  let t = Math.imul(a ^ a >>> 15, 1 | a);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
};
// Juega una lista de jugadas "e2e4 e7e5 ..." (con coronación "e7e8q").
function jugar(st: any, jugadas: string) {
  for (const j of jugadas.split(" ").filter(Boolean)) {
    const m = A.buscarJugada(st, j.slice(0, 2), j.slice(2, 4), j[4]);
    if (!m) throw new Error("ilegal: " + j + " en " + A.aFEN(st));
    st = A.aplicar(st, m);
  }
  return st;
}

Deno.test("ajedrez: perft de posiciones conocidas", () => {
  const casos: [string, number[]][] = [
    [A.INICIAL, [20, 400, 8902]],
    ["r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1", [48, 2039]],
    ["8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1", [14, 191, 2812]],
    ["r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1", [6, 264, 9467]],
    ["rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8", [44, 1486]],
  ];
  for (const [fen, esperados] of casos) {
    const st = A.desdeFEN(fen);
    esperados.forEach((n, i) => assertEquals(A.perft(st, i + 1), n, `${fen} profundidad ${i + 1}`));
  }
});

Deno.test("ajedrez: FEN de ida y vuelta y turno", () => {
  const st = A.desdeFEN(A.INICIAL);
  assertEquals(A.aFEN(st), A.INICIAL);
  const s2 = jugar(st, "e2e4");
  assertEquals(A.aFEN(s2), "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1");
});

Deno.test("ajedrez: mates, ahogado y tablas", () => {
  const tonto = jugar(A.desdeFEN(A.INICIAL), "f2f3 e7e5 g2g4 d8h4");
  assertEquals(A.resultado(tonto), { fin: "mate", gana: "b" });
  const pastor = jugar(A.desdeFEN(A.INICIAL), "e2e4 e7e5 f1c4 b8c6 d1h5 g8f6 h5f7");
  assertEquals(A.resultado(pastor), { fin: "mate", gana: "w" });
  assertEquals(A.resultado(A.desdeFEN("7k/5Q2/6K1/8/8/8/8/8 b - - 0 1")).fin, "ahogado");
  assertEquals(A.resultado(A.desdeFEN("8/8/4k3/8/8/3NK3/8/8 w - - 0 1")).fin, "material", "rey y caballo contra rey");
  assertEquals(A.resultado(A.desdeFEN("8/8/4k3/8/8/3RK3/8/8 w - - 0 1")), null, "con torre no son tablas");
  assertEquals(A.resultado(A.desdeFEN("8/8/4k3/8/8/4K3/8/7R w - - 100 80")).fin, "50");
  const rep = jugar(A.desdeFEN(A.INICIAL), "g1f3 g8f6 f3g1 f6g8 g1f3 g8f6 f3g1 f6g8");
  assertEquals(A.resultado(rep).fin, "repeticion");
  assertEquals(A.resultado(A.desdeFEN(A.INICIAL)), null);
});

Deno.test("ajedrez: captura al paso, enroque y coronación", () => {
  const ep = jugar(A.desdeFEN(A.INICIAL), "e2e4 a7a6 e4e5 d7d5");
  const m = A.buscarJugada(ep, "e5", "d6");
  assert(m && m.ep, "captura al paso disponible");
  const tras = A.aplicar(ep, m);
  assertEquals(A.aFEN(tras).split(" ")[0], "rnbqkbnr/1pp1pppp/p2P4/8/8/8/PPPP1PPP/RNBQKBNR");
  // No se enroca a través de una casilla atacada (f1 atacada por el alfil de c4)
  const cruz = A.desdeFEN("4k3/8/8/8/2b5/8/8/4K2R w K - 0 1");
  assertEquals(A.buscarJugada(cruz, "e1", "g1"), null);
  const libre = A.desdeFEN("4k3/8/8/8/8/8/8/4K2R w K - 0 1");
  const oo = A.buscarJugada(libre, "e1", "g1");
  assert(oo && oo.enroque);
  assertEquals(A.aFEN(A.aplicar(libre, oo)).split(" ")[0], "4k3/8/8/8/8/8/8/5RK1");
  const corona = A.desdeFEN("8/4P3/8/8/8/8/k7/4K3 w - - 0 1");
  assertEquals(A.legales(corona).filter((x: any) => x.promo).length, 4, "4 opciones de coronación");
  const caballo = A.aplicar(corona, A.buscarJugada(corona, "e7", "e8", "n"));
  assertEquals(A.aFEN(caballo).split(" ")[0], "4N3/8/8/8/8/8/k7/4K3");
});

Deno.test("ajedrez: notación algebraica en español", () => {
  const st = A.desdeFEN(A.INICIAL);
  assertEquals(A.san(st, A.buscarJugada(st, "g1", "f3")), "Cf3");
  assertEquals(A.san(st, A.buscarJugada(st, "e2", "e4")), "e4");
  const s2 = jugar(st, "e2e4 d7d5");
  assertEquals(A.san(s2, A.buscarJugada(s2, "e4", "d5")), "exd5");
  const tonto = jugar(st, "f2f3 e7e5 g2g4");
  assertEquals(A.san(tonto, A.buscarJugada(tonto, "d8", "h4")), "Dh4#");
  const enroque = A.desdeFEN("4k3/8/8/8/8/8/8/4K2R w K - 0 1");
  assertEquals(A.san(enroque, A.buscarJugada(enroque, "e1", "g1")), "O-O");
  const corona = A.desdeFEN("3k4/4P3/8/8/8/8/8/4K3 w - - 0 1");
  assertEquals(A.san(corona, A.buscarJugada(corona, "e7", "e8", "q")), "e8=D+");
  const dos = A.desdeFEN("4k3/8/8/8/8/8/4K3/R6R w - - 0 1");
  assertEquals(A.san(dos, A.buscarJugada(dos, "a1", "d1")), "Tad1", "desambigua por columna");
});

Deno.test("ajedrez: el bot juega legal, da mate en 1 y toma la dama colgada", () => {
  const mate1 = A.desdeFEN("6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1"); // Ta8#
  for (const nivel of [2, 3]) {
    const m = A.bot(mate1, nivel, mulberry(nivel));
    assertEquals(A.resultado(A.aplicar(mate1, m)), { fin: "mate", gana: "w" }, "nivel " + nivel);
  }
  const colgada = A.desdeFEN("4k3/8/8/3q4/8/8/3R4/4K3 w - - 0 1"); // Txd5
  const m = A.bot(colgada, 2, mulberry(1));
  assertEquals(A.casilla(m.a), "d5");
  for (let s = 1; s <= 20; s++) {
    let st = A.desdeFEN(A.INICIAL); const rng = mulberry(s);
    for (let k = 0; k < 120 && !A.resultado(st); k++) {
      const jug = A.bot(st, 1 + (k % 2), rng);
      assert(A.legales(st).some((x: any) => x.de === jug.de && x.a === jug.a && x.promo === jug.promo), "legal");
      st = A.aplicar(st, jug);
    }
  }
});
