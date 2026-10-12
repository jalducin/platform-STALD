// Clásicos rápidos en partida (openspec: clasicos-rapidos): Gato, Conecta 4, Piedra-papel-tijera, Ahorcado y
// Serpientes y escaleras. Almacén en memoria y reloj controlado, como server/salas_test.ts.
// deno-lint-ignore-file no-explicit-any
import { assert, assertEquals } from "jsr:@std/assert@1";
import { clearCacheJuegos, handleJuegos } from "./juegos.ts";
import { clearCacheSalas } from "./salas.ts";
import { MemoryStore } from "./store.ts";
import { ocultarJugadas } from "./clasicos_rapidos.ts";

const ingles = ["Marisol", "Angel", "Laura"].map((n) => ({ alumno: n, userEmails: [`${n.toLowerCase()}@example.com`], userNames: [n] }));
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s });
const M = "marisol@example.com", A = "angel@example.com", L = "laura@example.com";

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
  return { store, call, avanzar: (ms: number) => { t += ms; } };
}

// Sala empezada con las personas indicadas (la primera es el anfitrión).
async function salaEmpezada(c: ReturnType<typeof ctx>, juego: string, personas = [M, A], extra: Record<string, unknown> = {}) {
  const r = await c.call("POST", "/sala", personas[0], { juego, bots: true, ...extra });
  assertEquals(r.status, 200, JSON.stringify(r.body));
  const codigo = r.body.codigo as string;
  for (const p of personas.slice(1)) assertEquals((await c.call("POST", `/sala/${codigo}/unirse`, p)).status, 200);
  assertEquals((await c.call("POST", `/sala/${codigo}/empezar`, personas[0])).status, 200);
  c.avanzar(6000);
  return codigo;
}
const jugar = (c: ReturnType<typeof ctx>, codigo: string, email: string, jugada: unknown) => c.call("POST", `/sala/${codigo}/respuesta`, email, { jugada });

Deno.test("clasicos-rapidos: los 5 juegos se crean en partida y están en el catálogo con tope 1000", async () => {
  const c = ctx();
  for (const juego of ["gato", "conecta4", "ppt", "ahorcado", "serpientes"]) {
    const r = await c.call("POST", "/sala", M, { juego, bots: true });
    assertEquals(r.status, 200, juego);
  }
  const yo = await c.call("GET", "/yo", M);
  const cat = Object.fromEntries(yo.body.catalogo.map((x: any) => [x.id, x]));
  assertEquals(["gato", "conecta4", "ppt", "ahorcado", "serpientes"].map((id) => [cat[id].categoria, cat[id].max]), Array(5).fill(["clasicos", 1000]));
  assertEquals(cat.ppt.titulo, "Piedra, papel o tijera");
  const p = await c.call("POST", "/partida", M, { juego: "gato", puntos: 5000, aciertos: 3, total: 3, segundos: 30 });
  assertEquals([p.status, p.body.puntos], [200, 1000]);
});

Deno.test("clasicos-rapidos: Gato valida la casilla y el turno", async () => {
  const c = ctx();
  const codigo = await salaEmpezada(c, "gato");
  for (const mala of [{ n: 0, accion: "marcar", casilla: 9 }, { n: 0, accion: "marcar", casilla: -1 }, { n: 0, accion: "marcar", casilla: 1.5 }, { n: 0, accion: "marcar" }, { n: 0, accion: "soltar", col: 1 }, { n: 0, accion: "rendirse" }]) {
    assertEquals((await jugar(c, codigo, M, mala)).status, 400, JSON.stringify(mala));
  }
  const ok = await jugar(c, codigo, M, { n: 0, accion: "marcar", casilla: 4, carta: 7, color: "r" });
  assertEquals(ok.status, 200);
  assertEquals(ok.body.jugadas.map((j: any) => [j.n, j.accion, j.casilla, j.carta, j.color]), [[0, "marcar", 4, undefined, undefined]], "solo campos permitidos");
  assertEquals((await jugar(c, codigo, A, { n: 0, accion: "marcar", casilla: 0 })).status, 409, "turno tomado");
  assertEquals((await jugar(c, codigo, A, { n: 1, accion: "marcar", casilla: 0 })).status, 200);
});

Deno.test("clasicos-rapidos: Conecta 4 valida la columna", async () => {
  const c = ctx();
  const codigo = await salaEmpezada(c, "conecta4");
  assertEquals((await jugar(c, codigo, M, { n: 0, accion: "soltar", col: 7 })).status, 400);
  assertEquals((await jugar(c, codigo, M, { n: 0, accion: "soltar", col: "3" })).status, 400);
  assertEquals((await jugar(c, codigo, M, { n: 0, accion: "marcar", casilla: 3 })).status, 400);
  const r = await jugar(c, codigo, M, { n: 0, accion: "soltar", col: 3 });
  assertEquals([r.status, r.body.jugadas[0].col], [200, 3]);
  assertEquals((await jugar(c, codigo, A, { n: 0, accion: "soltar", col: 2 })).status, 409);
});

Deno.test("clasicos-rapidos: Gato y Conecta 4 son 1 vs 1 sin bots", async () => {
  const c = ctx();
  for (const juego of ["gato", "conecta4"]) {
    const r = await c.call("POST", "/sala", M, { juego, bots: true });
    const codigo = r.body.codigo;
    assertEquals(r.body.sala.bots, false, juego + " sin bots");
    assertEquals((await c.call("POST", `/sala/${codigo}/empezar`, M)).body.error, "faltan_jugadores");
    assertEquals((await c.call("POST", `/sala/${codigo}/unirse`, A)).status, 200);
    const llena = await c.call("POST", `/sala/${codigo}/unirse`, L);
    assertEquals([llena.status, llena.body.error], [409, "sala_llena"]);
    assertEquals((await c.call("POST", `/sala/${codigo}/empezar`, M)).status, 200);
  }
});

Deno.test("clasicos-rapidos: cupos de Piedra-papel-tijera (8), Ahorcado (8) y Serpientes (4)", async () => {
  const c = ctx();
  for (const [juego, cupo] of [["ppt", 8], ["ahorcado", 8], ["serpientes", 4]] as const) {
    const codigo = (await c.call("POST", "/sala", M, { juego, bots: true })).body.codigo;
    for (let i = 0; i < cupo - 2; i++) await c.store.put(`juegos/salas/${codigo}/x-${i}.json`, { id: `x-${i}`, nombre: "X", tipo: "alumno", unido: i + 10, respuestas: {} }, null);
    assertEquals((await c.call("POST", `/sala/${codigo}/unirse`, A)).status, 200, juego + ": cabe uno más");
    assertEquals((await c.call("POST", `/sala/${codigo}/unirse`, L)).body.error, "sala_llena", juego);
  }
});

Deno.test("clasicos-rapidos: Piedra-papel-tijera, misma ronda para todos y primera elección", async () => {
  const c = ctx();
  const codigo = await salaEmpezada(c, "ppt");
  for (const mala of [{ n: 0, accion: "elegir", eleccion: "lagarto" }, { n: 5, accion: "elegir", eleccion: "piedra" }, { n: 0, accion: "elegir" }, { n: 0, accion: "tirar" }]) {
    assertEquals((await jugar(c, codigo, M, mala)).status, 400, JSON.stringify(mala));
  }
  assertEquals((await jugar(c, codigo, M, { n: 0, accion: "elegir", eleccion: "papel" })).status, 200);
  assertEquals((await jugar(c, codigo, A, { n: 0, accion: "elegir", eleccion: "tijera" })).status, 200, "sin turno tomado");
  const otra = await jugar(c, codigo, M, { n: 0, accion: "elegir", eleccion: "piedra" });
  assertEquals(otra.body.jugadas.map((j: any) => j.eleccion), ["papel"], "cuenta la primera");
  assertEquals((await jugar(c, codigo, A, { n: 1, accion: "pasar" })).status, 200, "pasar al vencer el tiempo");
});

Deno.test("clasicos-rapidos: Piedra-papel-tijera oculta la elección ajena hasta elegir", async () => {
  const c = ctx();
  const codigo = await salaEmpezada(c, "ppt", [M, A, L]);
  await jugar(c, codigo, M, { n: 0, accion: "elegir", eleccion: "papel" });
  const eleccionDe = (g: any, nombre: string, ronda: number) => (g.body.jugadores.find((j: any) => j.nombre === nombre).jugadas || []).find((x: any) => x.n === ronda)?.eleccion;
  let ga = await c.call("GET", `/sala/${codigo}`, A);
  assertEquals(eleccionDe(ga, "Marisol", 0), "?", "Angel no ha elegido: no ve la de Marisol");
  assertEquals(eleccionDe(await c.call("GET", `/sala/${codigo}`, M), "Marisol", 0), "papel", "la propia sí");
  assertEquals(eleccionDe(await c.call("GET", `/sala/${codigo}`, "admin@example.com"), "Marisol", 0), "?", "el admin tampoco");
  await jugar(c, codigo, A, { n: 0, accion: "elegir", eleccion: "tijera" });
  ga = await c.call("GET", `/sala/${codigo}`, A);
  assertEquals([eleccionDe(ga, "Marisol", 0), eleccionDe(ga, "Angel", 0)], ["papel", "tijera"], "Angel ya eligió: ve todo");
  const gl = await c.call("GET", `/sala/${codigo}`, L);
  assertEquals([eleccionDe(gl, "Marisol", 0), eleccionDe(gl, "Angel", 0)], ["?", "?"], "Laura no ha elegido");
  await jugar(c, codigo, L, { n: 0, accion: "pasar" });
  assertEquals(eleccionDe(await c.call("GET", `/sala/${codigo}`, L), "Angel", 0), "tijera", "tras pasar ve la ronda");
  assertEquals(eleccionDe(await c.call("GET", `/sala/${codigo}`, "admin@example.com"), "Angel", 0), "tijera", "ronda completa: visible para todos");
  // La vista publicada (Realtime, sin yo) oculta solo las rondas incompletas.
  await jugar(c, codigo, M, { n: 1, accion: "elegir", eleccion: "piedra" });
  const doc = await c.call("GET", `/sala/${codigo}`, M);
  const crudo = ["Marisol", "Angel", "Laura"].map((n) => ({ ...doc.body.jugadores.find((j: any) => j.nombre === n) }));
  const pub = ocultarJugadas("ppt", crudo);
  assertEquals([eleccionDe({ body: { jugadores: pub } }, "Marisol", 0), eleccionDe({ body: { jugadores: pub } }, "Marisol", 1)], ["papel", "?"]);
  assertEquals(ocultarJugadas("gato", crudo), crudo, "otros juegos no cambian");
});

Deno.test("clasicos-rapidos: Ahorcado valida la letra y el modo (y la revancha lo conserva)", async () => {
  const c = ctx();
  assertEquals((await c.call("POST", "/sala", M, { juego: "ahorcado", opciones: { modo: "todos" } })).body.error, "modo_invalido");
  const def = await c.call("POST", "/sala", M, { juego: "ahorcado" });
  assertEquals(def.body.sala.opciones, { modo: "compite" });
  const codigo = await salaEmpezada(c, "ahorcado", [M, A], { opciones: { modo: "coop" } });
  for (const mala of [{ n: 0, accion: "letra", letra: "ab" }, { n: 0, accion: "letra", letra: "Ñ" }, { n: 0, accion: "letra", letra: "1" }, { n: 0, accion: "letra" }]) {
    assertEquals((await jugar(c, codigo, M, mala)).status, 400, JSON.stringify(mala));
  }
  const r = await jugar(c, codigo, M, { n: 0, accion: "letra", letra: "e" });
  assertEquals([r.status, r.body.jugadas[0].letra], [200, "e"]);
  assertEquals((await jugar(c, codigo, A, { n: 1, accion: "pasar" })).status, 200);
  assertEquals((await jugar(c, codigo, A, { n: 1, accion: "letra", letra: "a" })).status, 200, "mismo jugador, mismo paso: se ignora");
  // Revancha: tras el final se crea otra sala con el mismo modo.
  await c.call("POST", `/sala/${codigo}/respuesta`, M, { final: 120 });
  const rev = await c.call("POST", `/sala/${codigo}/revancha`, A);
  const g = await c.call("GET", `/sala/${rev.body.codigo}`, A);
  assertEquals([g.body.sala.juego, g.body.sala.opciones], ["ahorcado", { modo: "coop" }]);
});

Deno.test("clasicos-rapidos: Serpientes solo acepta tirar (el dado sale de la semilla)", async () => {
  const c = ctx();
  const codigo = await salaEmpezada(c, "serpientes");
  assertEquals((await jugar(c, codigo, M, { n: 0, accion: "tirar", dado: 6 })).body.jugadas[0], { n: 0, accion: "tirar", t: Date.parse("2026-09-30T18:00:06.000Z") }, "sin dado elegido");
  assertEquals((await jugar(c, codigo, A, { n: 1, accion: "mover", casilla: 99 })).status, 400);
  assertEquals((await jugar(c, codigo, A, { n: 0, accion: "tirar" })).status, 409);
});

Deno.test("clasicos-rapidos: jugar antes de empezar o fuera de la sala", async () => {
  const c = ctx();
  const codigo = (await c.call("POST", "/sala", M, { juego: "gato" })).body.codigo;
  await c.call("POST", `/sala/${codigo}/unirse`, A);
  assertEquals((await jugar(c, codigo, M, { n: 0, accion: "marcar", casilla: 0 })).status, 409, "no empezó");
  await c.call("POST", `/sala/${codigo}/empezar`, M);
  c.avanzar(6000);
  assertEquals((await jugar(c, codigo, L, { n: 0, accion: "marcar", casilla: 0 })).status, 403, "no está en la sala");
  assert((await jugar(c, codigo, M, { n: 0, accion: "marcar", casilla: 0 })).status === 200);
});
