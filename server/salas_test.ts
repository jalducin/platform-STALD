// Partidas multijugador (openspec: juegos-partidas), con almacén en memoria y reloj controlado.
// deno-lint-ignore-file no-explicit-any
import { assert, assertEquals } from "jsr:@std/assert@1";
import { clearCacheJuegos, handleJuegos } from "./juegos.ts";
import { clearCacheSalas } from "./salas.ts";
import { MemoryStore } from "./store.ts";

const ingles = [
  { alumno: "Marisol", userEmails: ["marisol@example.com"], userNames: ["Marisol"] },
  { alumno: "Angel", userEmails: ["angel@example.com"], userNames: ["Sisifo"] },
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
  return { store, call, avanzar: (ms: number) => { t += ms; }, ahora: () => t };
}

async function salaCon(c: ReturnType<typeof ctx>, juego = "cultura") {
  const r = await c.call("POST", "/sala", "marisol@example.com", { juego, opciones: { cat: "todas" }, bots: true });
  assertEquals(r.status, 200, JSON.stringify(r.body));
  return r.body.codigo as string;
}

Deno.test("salas: crear devuelve código y el host queda dentro", async () => {
  const c = ctx();
  const codigo = await salaCon(c);
  assert(/^[A-HJ-NP-Z]{4}$/.test(codigo), codigo);
  const g = await c.call("GET", `/sala/${codigo}`, "marisol@example.com");
  assertEquals([g.status, g.body.sala.juego, g.body.sala.bots, g.body.soyHost, g.body.jugadores.map((j: any) => j.nombre)], [200, "cultura", true, true, ["Marisol"]]);
  assert(Number.isInteger(g.body.sala.seed) && typeof g.body.ahora === "number");
  assertEquals(JSON.stringify(g.body).includes("@"), false, "sin correos");
});

Deno.test("salas: juego no permitido y no registrado", async () => {
  const c = ctx();
  assertEquals((await c.call("POST", "/sala", "marisol@example.com", { juego: "una" })).status, 400);
  assertEquals((await c.call("POST", "/sala", "marisol@example.com", { juego: "no-existe" })).status, 400);
  assertEquals((await c.call("POST", "/sala", "nadie@example.com", { juego: "cultura" })).status, 403);
});

Deno.test("salas: unirse, sala inexistente, tras empezar y cupo", async () => {
  const c = ctx();
  const codigo = await salaCon(c);
  assertEquals((await c.call("POST", `/sala/ZZZZ/unirse`, "angel@example.com")).status, 404);
  assertEquals((await c.call("POST", `/sala/${codigo}/unirse`, "angel@example.com")).status, 200);
  assertEquals((await c.call("POST", `/sala/${codigo}/unirse`, "angel@example.com")).status, 200, "unirse dos veces es idempotente");
  const g = await c.call("GET", `/sala/${codigo}`, "angel@example.com");
  assertEquals([g.body.soyHost, g.body.jugadores.length], [false, 2]);
  // Solo el host empieza
  assertEquals((await c.call("POST", `/sala/${codigo}/empezar`, "angel@example.com")).status, 403);
  const e = await c.call("POST", `/sala/${codigo}/empezar`, "marisol@example.com");
  assertEquals(e.status, 200);
  assertEquals(e.body.sala.inicio, c.ahora() + 5000);
  assertEquals((await c.call("POST", `/sala/${codigo}/unirse`, "admin@example.com")).status, 409);
});

Deno.test("salas: cupo de 30 jugadores", async () => {
  const c = ctx();
  const codigo = await salaCon(c);
  for (let i = 0; i < 29; i++) await c.store.put(`juegos/salas/${codigo}/x-${i}.json`, { id: `x-${i}`, nombre: "X", tipo: "alumno", respuestas: {} }, null);
  assertEquals((await c.call("POST", `/sala/${codigo}/unirse`, "angel@example.com")).status, 409);
});

Deno.test("salas: respuestas de preguntas (validación y primera cuenta)", async () => {
  const c = ctx();
  const codigo = await salaCon(c);
  await c.call("POST", `/sala/${codigo}/unirse`, "angel@example.com");
  assertEquals((await c.call("POST", `/sala/${codigo}/respuesta`, "angel@example.com", { q: 0, correcta: true, puntos: 150, ms: 3000 })).status, 409, "antes de empezar");
  await c.call("POST", `/sala/${codigo}/empezar`, "marisol@example.com");
  c.avanzar(6000);
  const r = await c.call("POST", `/sala/${codigo}/respuesta`, "angel@example.com", { q: 0, correcta: true, puntos: 999, ms: 3000 });
  assertEquals([r.status, r.body.respuestas["0"].puntos], [200, 200], "puntos recortados a 200");
  const otra = await c.call("POST", `/sala/${codigo}/respuesta`, "angel@example.com", { q: 0, correcta: false, puntos: 0, ms: 1 });
  assertEquals(otra.body.respuestas["0"].puntos, 200, "solo cuenta la primera");
  assertEquals((await c.call("POST", `/sala/${codigo}/respuesta`, "angel@example.com", { q: 12, correcta: true, puntos: 10 })).status, 400);
  assertEquals((await c.call("POST", `/sala/${codigo}/respuesta`, "admin@example.com", { q: 1, correcta: true, puntos: 10 })).status, 403, "no está en la sala");
  const g = await c.call("GET", `/sala/${codigo}`, "marisol@example.com");
  assertEquals(g.body.jugadores.find((j: any) => j.nombre === "Angel").respuestas["0"].correcta, true);
});

Deno.test("salas: Basta con palabras y grito", async () => {
  const c = ctx();
  const codigo = await salaCon(c, "basta-es");
  await c.call("POST", `/sala/${codigo}/unirse`, "angel@example.com");
  await c.call("POST", `/sala/${codigo}/empezar`, "marisol@example.com");
  c.avanzar(20000);
  const r = await c.call("POST", `/sala/${codigo}/respuesta`, "angel@example.com", { palabras: { nombre: "Ana", animal: "abeja" }, basta: true });
  assertEquals([r.status, r.body.palabras.nombre, r.body.basta], [200, "Ana", c.ahora()]);
  const larga = await c.call("POST", `/sala/${codigo}/respuesta`, "marisol@example.com", { palabras: { nombre: "x".repeat(80) } });
  assertEquals(larga.body.palabras.nombre.length, 40);
  assertEquals((await c.call("POST", `/sala/${codigo}/respuesta`, "marisol@example.com", { palabras: "nada" })).status, 400);
});

Deno.test("salas: la sala vence a las 3 horas y solo la ven sus jugadores", async () => {
  const c = ctx();
  const codigo = await salaCon(c);
  assertEquals((await c.call("GET", `/sala/${codigo}`, "angel@example.com")).status, 403);
  assertEquals((await c.call("GET", `/sala/${codigo}`, "admin@example.com")).status, 200, "el admin puede ver");
  c.avanzar(3 * 3600 * 1000 + 1000);
  assertEquals((await c.call("GET", `/sala/${codigo}`, "marisol@example.com")).status, 410);
  assertEquals((await c.call("POST", `/sala/${codigo}/unirse`, "angel@example.com")).status, 410);
});

Deno.test("salas: índice semanal, final, podio del host y resumen del admin", async () => {
  const c = ctx();
  const codigo = await salaCon(c);
  await c.call("POST", `/sala/${codigo}/unirse`, "angel@example.com");
  const idx = (await c.store.get<any>("juegos/salas-semana/2026-09-28.json"))!.data;
  assertEquals(idx.salas.map((s: any) => [s.codigo, s.juego, s.host]), [[codigo, "cultura", "Marisol"]]);
  await c.call("POST", `/sala/${codigo}/empezar`, "marisol@example.com");
  c.avanzar(200000);
  const podio = [{ nombre: "Bot Ajolote 🦎", total: 1300, bot: true }, { nombre: "Marisol", total: 900 }, { nombre: "Angel", total: 400 }];
  assertEquals((await c.call("POST", `/sala/${codigo}/respuesta`, "marisol@example.com", { final: 900, podio })).status, 200);
  await c.call("POST", `/sala/${codigo}/respuesta`, "angel@example.com", { final: 5000, podio: [{ nombre: "Angel", total: 3000 }] });
  // alumna no ve el resumen
  assertEquals((await c.call("GET", "/admin/resumen", "angel@example.com")).status, 403);
  await c.call("POST", "/partida", "marisol@example.com", { juego: "cultura", puntos: 900, aciertos: 5, total: 10, segundos: 0 });
  const r = await c.call("GET", "/admin/resumen", "admin@example.com");
  assertEquals(r.status, 200);
  assertEquals(r.body.semana, "2026-09-28");
  assertEquals(r.body.jugadores.map((j: any) => [j.nombre, j.total, j.partidas]), [["Marisol", 900, 1]]);
  const s = r.body.salas[0];
  assertEquals([s.codigo, s.juego, s.host], [codigo, "cultura", "Marisol"]);
  assertEquals(s.jugadores.map((j: any) => [j.nombre, j.final]), [["Marisol", 900], ["Angel", 3000]], "final recortado a 3000");
  assertEquals(s.podio, podio, "solo cuenta el podio del host");
  assertEquals(r.body.catalogo.cultura, "Maratón de cultura");
  assertEquals(JSON.stringify(r.body).includes("@"), false);
});
