// 📜 Línea del tiempo (openspec: cultura-conocimiento): funciones puras de juegos/linea-tiempo.js y sala de
// `cultura-linea` en el servidor (tema, mesa, validación de la respuesta y partida guardada).
// deno-lint-ignore-file no-explicit-any
import { assert, assertEquals } from "jsr:@std/assert@1";
import { CATALOGO, clearCacheJuegos, handleJuegos } from "./juegos.ts";
import { clearCacheSalas, JUEGOS_PARTIDA, MESAS, TEMAS_LINEA } from "./salas.ts";
import { MemoryStore } from "./store.ts";
import "../juegos/linea-tiempo.js";

const LT = (globalThis as any).LineaTiempo;
const d = JSON.parse(await Deno.readTextFile(new URL("../juegos/datos/cultura.json", import.meta.url)));
// Aleatorio con semilla, como rngDe de juegos.html (mulberry32).
function rnd(seed: number) {
  let a = seed;
  return () => {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const ordenada = (l: any) => l.sucesos.slice().sort((a: any, b: any) => a.anio - b.anio);

// ---------- Funciones puras ----------

Deno.test("linea: temas iguales en la página, el servidor y cultura.json", () => {
  assertEquals(LT.TEMAS.map((t: any) => t.id), TEMAS_LINEA);
  assertEquals(TEMAS_LINEA[0], "todos");
  assertEquals(d.linea.temas.map((t: any) => t.id), TEMAS_LINEA.slice(1));
});

Deno.test("linea: sucesos por línea (individual 4, 5 y 6; sala 4, 5, 5, 6 y 6)", () => {
  assertEquals([0, 1, 2, 3, 5, 6, 9, 20].map(LT.sucesosDeLinea), [4, 4, 4, 5, 5, 6, 6, 6]);
  assertEquals(LT.SUCESOS_SALA, [4, 5, 5, 6, 6]);
  assertEquals(LT.RONDAS_SALA, 5);
});

Deno.test("linea: armar una línea de un tema, sin orden de entrada ya correcto", () => {
  for (let s = 1; s <= 40; s++) {
    const l = LT.armarLinea(d, "inventos", 5, rnd(s));
    assertEquals(l.sucesos.length, 5);
    assertEquals(l.tema, "inventos");
    assert(l.sucesos.some((x: any, i: number) => x.anio !== ordenada(l)[i].anio), "no viene ya ordenada");
    assertEquals(new Set(l.sucesos.map((x: any) => x.anio)).size, 5, "años distintos");
  }
  const todos = LT.armarLinea(d, "nada", 4, rnd(3));
  assert(TEMAS_LINEA.includes(todos.tema), "un tema inválido usa todos los temas");
});

Deno.test("linea: partida con semilla = mismas líneas para todos", () => {
  const a = LT.lineasPartida(d, "todos", rnd(77)), b = LT.lineasPartida(d, "todos", rnd(77));
  assertEquals(a, b);
  assertEquals(a.map((l: any) => l.sucesos.length), [4, 5, 5, 6, 6]);
  assertEquals(new Set(a.map((l: any) => l.titulo)).size, 5, "sets distintos");
  const h = LT.lineasPartida(d, "historia-mexico", rnd(5));
  assert(h.every((l: any) => l.tema === "historia-mexico"));
});

Deno.test("linea: aciertos por posición y casillas vacías", () => {
  const l = LT.armarLinea(d, "ciencia", 4, rnd(9));
  const bien = ordenada(l);
  assertEquals(LT.aciertos(bien, l), 4);
  assertEquals(LT.aciertos([bien[1], bien[0], bien[2], bien[3]], l), 2);
  assertEquals(LT.aciertos([bien[0], null, null, bien[3]], l), 2);
  assertEquals(LT.aciertos([], l), 0);
});

Deno.test("linea: puntos individuales con racha y rapidez, y parciales sin racha", () => {
  assertEquals(LT.puntosIndividual({ aciertos: 4, n: 4, racha: 1, segundosSobran: 10 }), 100 + 80 + 0 + 20);
  assertEquals(LT.puntosIndividual({ aciertos: 6, n: 6, racha: 3, segundosSobran: 60 }), 100 + 120 + 20 + 90, "rapidez hasta 90");
  assertEquals(LT.puntosIndividual({ aciertos: 6, n: 6, racha: 30, segundosSobran: 0 }), 100 + 120 + 100, "racha hasta 100");
  assertEquals(LT.puntosIndividual({ aciertos: 3, n: 5, racha: 0, segundosSobran: 40 }), 45);
});

Deno.test("linea: puntos de sala (20 por acierto + hasta 80 si es perfecta) y bots", () => {
  assertEquals(LT.puntosSala(4, 4, 0, 40000), 160);
  assertEquals(LT.puntosSala(4, 4, 20000, 40000), 120);
  assertEquals(LT.puntosSala(5, 6, 1000, 40000), 100, "sin bono si no es perfecta");
  assertEquals(LT.puntosSala(6, 6, 90000, 40000), 120);
  for (let s = 1; s < 50; s++) {
    const b = LT.botLinea(rnd(s), 0.5, 5, 40000);
    assert(b.aciertos >= 0 && b.aciertos <= 5 && b.aciertos !== 4, "un error deja al menos 2 fuera de lugar");
    assertEquals(b.correcta, b.aciertos === 5);
    assert(b.ms >= 8000 && b.ms <= 35000, String(b.ms));
    assertEquals(b.puntos, LT.puntosSala(b.aciertos, 5, b.ms, 40000));
  }
});

Deno.test("linea: podio por puntos, luego aciertos y luego menos tiempo; años antes de Cristo", () => {
  const p = LT.podioLinea([
    { id: "a", total: 300, aciertos: 20, ms: 90000 },
    { id: "b", total: 300, aciertos: 22, ms: 99000 },
    { id: "c", total: 300, aciertos: 22, ms: 80000 },
    { id: "d", total: 500, aciertos: 1, ms: 1 },
  ]);
  assertEquals(p.map((x: any) => x.id), ["d", "c", "b", "a"]);
  assertEquals([LT.anioTexto(-776), LT.anioTexto(79), LT.anioTexto(2021)], ["776 a. C.", "79", "2021"]);
});

// ---------- Servidor ----------

const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s });
function ctx() {
  clearCacheJuegos();
  const store = new MemoryStore();
  let t = Date.parse("2026-10-11T18:00:00.000Z");
  const deps: any = {
    store, admin: "admin@example.com",
    filasIngles: () => Promise.resolve([{ alumno: "Marisol", userEmails: ["marisol@example.com"], userNames: ["Marisol"] }, { alumno: "Angel", userEmails: ["angel@example.com"], userNames: ["Angel"] }]),
    filasSecundaria: () => Promise.resolve([]), hoy: () => "2026-10-11", ahora: () => new Date(t).toISOString(),
  };
  const call = async (method: string, sub: string, email: string, body?: unknown) => {
    clearCacheSalas();
    const req = new Request(`http://x/juegos${sub}?email=${encodeURIComponent(email)}`, { method, body: body === undefined ? undefined : JSON.stringify(body) });
    const res = await handleJuegos(req, sub, email, deps, json);
    return { status: res.status, body: await res.json() };
  };
  return { call, avanzar: (ms: number) => { t += ms; } };
}
async function salaEmpezada(c: ReturnType<typeof ctx>) {
  const r = await c.call("POST", "/sala", "marisol@example.com", { juego: "cultura-linea", opciones: { cat: "inventos" }, bots: true });
  assertEquals(r.status, 200, JSON.stringify(r.body));
  const codigo = r.body.codigo as string;
  assertEquals((await c.call("POST", `/sala/${codigo}/unirse`, "angel@example.com")).status, 200);
  assertEquals((await c.call("POST", `/sala/${codigo}/empezar`, "marisol@example.com")).status, 200);
  c.avanzar(6000);
  return codigo;
}

Deno.test("linea sala: catálogo, juego de partida y mesa de 30 con bots aparte", () => {
  assertEquals((CATALOGO as any)["cultura-linea"], { categoria: "cultura", titulo: "Línea del tiempo", max: 3000 });
  assertEquals(["es-ortografia", "es-ordena", "es-acentos", "es-sinonimos", "cultura"].map((id) => (CATALOGO as any)[id].categoria), ["cultura", "cultura", "cultura", "cultura", "cultura"]);
  assert(JUEGOS_PARTIDA.has("cultura-linea"));
  assertEquals(MESAS["cultura-linea"], { max: 30, min: 1 });
});

Deno.test("linea sala: el tema va en opciones.cat; uno inválido responde 400", async () => {
  const c = ctx();
  const ok = await c.call("POST", "/sala", "marisol@example.com", { juego: "cultura-linea", opciones: { cat: "ciencia" } });
  assertEquals([ok.status, ok.body.sala.opciones.cat], [200, "ciencia"]);
  const sin = await c.call("POST", "/sala", "marisol@example.com", { juego: "cultura-linea", opciones: {} });
  assertEquals(sin.body.sala.opciones.cat, "todos");
  const mal = await c.call("POST", "/sala", "marisol@example.com", { juego: "cultura-linea", opciones: { cat: "deportes" } });
  assertEquals([mal.status, mal.body.error], [400, "tema_invalido"]);
});

Deno.test("linea sala: una persona sola puede empezar (mínimo 1)", async () => {
  const c = ctx();
  const r = await c.call("POST", "/sala", "marisol@example.com", { juego: "cultura-linea", opciones: {}, bots: false });
  assertEquals((await c.call("POST", `/sala/${r.body.codigo}/empezar`, "marisol@example.com")).status, 200);
});

Deno.test("linea sala: respuesta con aciertos; puntos recortados según los aciertos", async () => {
  const c = ctx();
  const codigo = await salaEmpezada(c);
  const r = await c.call("POST", `/sala/${codigo}/respuesta`, "angel@example.com", { q: 0, correcta: false, puntos: 200, ms: 30000, aciertos: 2 });
  assertEquals([r.status, r.body.respuestas["0"]], [200, { correcta: false, puntos: 40, ms: 30000, aciertos: 2 }]);
  const p = await c.call("POST", `/sala/${codigo}/respuesta`, "angel@example.com", { q: 1, correcta: true, puntos: 999, ms: 45000, aciertos: 5 });
  assertEquals(p.body.respuestas["1"], { correcta: true, puntos: 180, ms: 45000, aciertos: 5 }, "20 × 5 + 80");
  const lento = await c.call("POST", `/sala/${codigo}/respuesta`, "angel@example.com", { q: 4, correcta: true, puntos: 150, ms: 90000, aciertos: 6 });
  assertEquals(lento.body.respuestas["4"].ms, 60000, "ms hasta 60 s");
  const otra = await c.call("POST", `/sala/${codigo}/respuesta`, "angel@example.com", { q: 0, correcta: true, puntos: 200, ms: 1, aciertos: 4 });
  assertEquals(otra.body.respuestas["0"].puntos, 40, "solo cuenta la primera");
});

Deno.test("linea sala: línea fuera de rango, sin aciertos o con aciertos inválidos → 400", async () => {
  const c = ctx();
  const codigo = await salaEmpezada(c);
  const enviar = (b: unknown) => c.call("POST", `/sala/${codigo}/respuesta`, "marisol@example.com", b);
  for (const b of [
    { q: 5, correcta: true, puntos: 100, ms: 1000, aciertos: 4 },
    { q: 0, correcta: true, puntos: 100, ms: 1000 },
    { q: 0, correcta: true, puntos: 100, ms: 1000, aciertos: 7 },
    { q: 0, correcta: true, puntos: 100, ms: 1000, aciertos: 2.5 },
    { q: 0, correcta: "si", puntos: 100, ms: 1000, aciertos: 2 },
  ]) {
    const r = await enviar(b);
    assertEquals([r.status, r.body.error], [400, "respuesta_invalida"], JSON.stringify(b));
  }
});

Deno.test("linea sala: el quiz no cambia (Maratón acepta la pregunta 9 y no guarda aciertos)", async () => {
  const c = ctx();
  const r = await c.call("POST", "/sala", "marisol@example.com", { juego: "cultura", opciones: { cat: "todas" }, bots: true });
  await c.call("POST", `/sala/${r.body.codigo}/empezar`, "marisol@example.com");
  c.avanzar(6000);
  const q = await c.call("POST", `/sala/${r.body.codigo}/respuesta`, "marisol@example.com", { q: 9, correcta: true, puntos: 150, ms: 3000, aciertos: 3 });
  assertEquals([q.status, q.body.respuestas["9"]], [200, { correcta: true, puntos: 150, ms: 3000 }]);
});

Deno.test("linea sala: la partida se guarda en puntos de partidas", async () => {
  const c = ctx();
  const codigo = await salaEmpezada(c);
  c.avanzar(5 * 48000);
  assertEquals((await c.call("POST", `/sala/${codigo}/respuesta`, "marisol@example.com", { final: 620 })).status, 200);
  const g = await c.call("POST", "/partida", "marisol@example.com", { juego: "cultura-linea", puntos: 620, aciertos: 3, total: 5, segundos: 0, sala: codigo });
  assertEquals([g.status, g.body.puntos, g.body.totalPartidas], [200, 620, 620]);
  const ind = await c.call("POST", "/partida", "angel@example.com", { juego: "cultura-linea", puntos: 99999, aciertos: 4, total: 10, segundos: 300 });
  assertEquals([ind.status, ind.body.puntos], [200, 3000], "tope individual de 3,000");
});
