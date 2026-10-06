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
  assertEquals((await c.call("POST", "/sala", "marisol@example.com", { juego: "en-memorama" })).status, 400);
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

// openspec: juegos-recarga — al recargar, la página vuelve a unirse; quien ya está dentro no se duplica ni pierde nada.
Deno.test("salas: volver a unirse tras recargar (empezada o llena) no duplica ni borra respuestas", async () => {
  const c = ctx();
  const codigo = await salaCon(c, "ajedrez"); // cupo 2: la sala queda llena con Angel
  await c.call("POST", `/sala/${codigo}/unirse`, "angel@example.com");
  assertEquals((await c.call("POST", `/sala/${codigo}/unirse`, "angel@example.com")).status, 200, "llena, pero ya está dentro");
  await c.call("POST", `/sala/${codigo}/empezar`, "marisol@example.com");
  c.avanzar(6000);
  assertEquals((await c.call("POST", `/sala/${codigo}/respuesta`, "angel@example.com", { jugada: { n: 1, accion: "mover", de: "e7", a: "e5" } })).status, 200);
  for (const email of ["angel@example.com", "marisol@example.com"]) {
    const u = await c.call("POST", `/sala/${codigo}/unirse`, email);
    assertEquals([u.status, u.body.ok, u.body.codigo], [200, true, codigo], `${email}: empezada, pero ya está dentro`);
  }
  const g = await c.call("GET", `/sala/${codigo}`, "angel@example.com");
  assertEquals(g.body.jugadores.map((j: any) => j.nombre), ["Marisol", "Angel"], "sin duplicados");
  assertEquals(g.body.jugadores[1].jugadas.map((j: any) => [j.n, j.de, j.a]), [[1, "e7", "e5"]], "conserva sus jugadas");
  assertEquals((await c.call("POST", `/sala/${codigo}/unirse`, "admin@example.com")).body.error, "ya_empezo", "quien no estaba no entra");
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
  await c.call("POST", `/sala/${codigo}/respuesta`, "angel@example.com", { final: 50000, podio: [{ nombre: "Angel", total: 3000 }] });
  // alumna no ve el resumen
  assertEquals((await c.call("GET", "/admin/resumen", "angel@example.com")).status, 403);
  await c.call("POST", "/partida", "marisol@example.com", { juego: "cultura", puntos: 900, aciertos: 5, total: 10, segundos: 0 });
  const r = await c.call("GET", "/admin/resumen", "admin@example.com");
  assertEquals(r.status, 200);
  assertEquals(r.body.semana, "2026-09-28");
  assertEquals(r.body.jugadores.map((j: any) => [j.nombre, j.total, j.partidas]), [["Marisol", 900, 1]]);
  const s = r.body.salas[0];
  assertEquals([s.codigo, s.juego, s.host], [codigo, "cultura", "Marisol"]);
  assertEquals(s.jugadores.map((j: any) => [j.nombre, j.final]), [["Marisol", 900], ["Angel", 10000]], "final recortado a 10000 (Basta por rondas)");
  assertEquals(s.podio, podio, "solo cuenta el podio del host");
  assertEquals(r.body.catalogo.cultura, "Maratón de cultura");
  assertEquals(JSON.stringify(r.body).includes("@"), false);
});

Deno.test("salas: Lotería (modo y grito único) y Responde en inglés", async () => {
  const c = ctx();
  assertEquals((await c.call("POST", "/sala", "marisol@example.com", { juego: "loteria", opciones: { modo: "nada" } })).status, 400);
  const r = await c.call("POST", "/sala", "marisol@example.com", { juego: "loteria", opciones: { modo: "llena" }, bots: true });
  assertEquals([r.status, r.body.sala.opciones.modo], [200, "llena"]);
  const def = await c.call("POST", "/sala", "marisol@example.com", { juego: "loteria" });
  assertEquals(def.body.sala.opciones.modo, "linea");
  const codigo = r.body.codigo;
  await c.call("POST", `/sala/${codigo}/unirse`, "angel@example.com");
  await c.call("POST", `/sala/${codigo}/empezar`, "marisol@example.com");
  c.avanzar(40000);
  const g1 = await c.call("POST", `/sala/${codigo}/respuesta`, "angel@example.com", { loteria: true });
  const t1 = c.ahora();
  c.avanzar(5000);
  const g2 = await c.call("POST", `/sala/${codigo}/respuesta`, "angel@example.com", { loteria: true });
  assertEquals([g1.status, g1.body.loteria, g2.body.loteria], [200, t1, t1]);
  assertEquals((await c.call("POST", "/sala", "marisol@example.com", { juego: "en-preguntas" })).status, 400, "absorbido por la fusión (openspec: juegos-fusion)");
});

Deno.test("salas: los jugadores llevan su avatar", async () => {
  const c = ctx();
  const codigo = await salaCon(c);
  const g = await c.call("GET", `/sala/${codigo}`, "marisol@example.com");
  const av = g.body.jugadores[0].avatar;
  assert(av && typeof av.emoji === "string" && av.color.startsWith("#"), JSON.stringify(av));
});

Deno.test("salas: ¡Una! en partida (jugadas con hora y turno tomado)", async () => {
  const c = ctx();
  const r = await c.call("POST", "/sala", "marisol@example.com", { juego: "una", bots: true });
  assertEquals(r.status, 200);
  const codigo = r.body.codigo;
  await c.call("POST", `/sala/${codigo}/unirse`, "angel@example.com");
  await c.call("POST", `/sala/${codigo}/empezar`, "marisol@example.com");
  c.avanzar(6000);
  const j0 = await c.call("POST", `/sala/${codigo}/respuesta`, "marisol@example.com", { jugada: { n: 0, accion: "jugar", carta: 17, color: "r", una: false } });
  assertEquals([j0.status, j0.body.jugadas.length, j0.body.jugadas[0].t, j0.body.jugadas[0].carta], [200, 1, c.ahora(), 17]);
  const tomado = await c.call("POST", `/sala/${codigo}/respuesta`, "angel@example.com", { jugada: { n: 0, accion: "robar" } });
  assertEquals([tomado.status, tomado.body.error], [409, "turno_tomado"]);
  assertEquals((await c.call("POST", `/sala/${codigo}/respuesta`, "angel@example.com", { jugada: { n: 1, accion: "bailar" } })).status, 400);
  assertEquals((await c.call("POST", `/sala/${codigo}/respuesta`, "angel@example.com", { jugada: { n: 1, accion: "jugar", carta: 500 } })).status, 400);
  assertEquals((await c.call("POST", `/sala/${codigo}/respuesta`, "angel@example.com", { jugada: { n: 1, accion: "robar" } })).status, 200);
  const g = await c.call("GET", `/sala/${codigo}`, "marisol@example.com");
  assertEquals(g.body.jugadores.map((x: any) => (x.jugadas || []).map((j: any) => j.n)), [[0], [1]]);
});

Deno.test("salas: ¡Una! registra el botón UNA con su hora (una vez por paso)", async () => {
  const c = ctx();
  const codigo = (await c.call("POST", "/sala", "marisol@example.com", { juego: "una" })).body.codigo;
  await c.call("POST", `/sala/${codigo}/empezar`, "marisol@example.com");
  c.avanzar(9000);
  const u1 = await c.call("POST", `/sala/${codigo}/respuesta`, "marisol@example.com", { una: { paso: 12 } });
  const t1 = c.ahora();
  c.avanzar(2000);
  const u2 = await c.call("POST", `/sala/${codigo}/respuesta`, "marisol@example.com", { una: { paso: 12 } });
  assertEquals([u1.status, u1.body.unas, u2.body.unas], [200, [{ paso: 12, t: t1 }], [{ paso: 12, t: t1 }]]);
  assertEquals((await c.call("POST", `/sala/${codigo}/respuesta`, "marisol@example.com", { una: { paso: -1 } })).status, 400);
});

// ---- Basta por rondas (openspec: basta-rondas) ----
Deno.test("salas: Basta con rondas (10 por defecto, 5 y 12 válidos, otro 400)", async () => {
  const c = ctx();
  const crear = (opciones: unknown, juego = "basta-es") => c.call("POST", "/sala", "marisol@example.com", { juego, opciones, bots: true });
  assertEquals((await crear({})).body.sala.opciones.rondas, "10");
  assertEquals((await crear({ rondas: "5" })).body.sala.opciones.rondas, "5");
  assertEquals((await crear({ rondas: 12 }, "basta-en")).body.sala.opciones.rondas, "12");
  const mal = await crear({ rondas: "7" });
  assertEquals([mal.status, mal.body.error], [400, "rondas_invalidas"]);
  assertEquals((await c.call("POST", "/sala", "marisol@example.com", { juego: "cultura", opciones: { rondas: "5" } })).body.sala.opciones.rondas, undefined, "solo Basta");
});

Deno.test("salas: Basta guarda palabras y el primer ¡Basta! por ronda", async () => {
  const c = ctx();
  const codigo = (await c.call("POST", "/sala", "marisol@example.com", { juego: "basta-es", opciones: { rondas: "5" } })).body.codigo;
  await c.call("POST", `/sala/${codigo}/unirse`, "angel@example.com");
  await c.call("POST", `/sala/${codigo}/empezar`, "marisol@example.com");
  c.avanzar(20000);
  const r0 = await c.call("POST", `/sala/${codigo}/respuesta`, "angel@example.com", { ronda: 0, palabras: { nombre: "Ana" }, basta: true });
  assertEquals([r0.status, r0.body.rondasBasta["0"].palabras.nombre, r0.body.rondasBasta["0"].basta], [200, "Ana", c.ahora()]);
  const t0 = c.ahora();
  c.avanzar(5000);
  const otra = await c.call("POST", `/sala/${codigo}/respuesta`, "angel@example.com", { ronda: 0, palabras: { nombre: "Ana" }, basta: true });
  assertEquals(otra.body.rondasBasta["0"].basta, t0, "solo cuenta el primer ¡Basta! de la ronda");
  const r3 = await c.call("POST", `/sala/${codigo}/respuesta`, "angel@example.com", { ronda: 3, palabras: { animal: "Delfín" } });
  assertEquals([r3.body.rondasBasta["3"].palabras.animal, r3.body.rondasBasta["3"].basta, r3.body.rondasBasta["0"].palabras.nombre], ["Delfín", undefined, "Ana"]);
  assertEquals((await c.call("POST", `/sala/${codigo}/respuesta`, "angel@example.com", { ronda: 5, palabras: {} })).status, 400, "fuera de rango");
  assertEquals((await c.call("POST", `/sala/${codigo}/respuesta`, "angel@example.com", { ronda: -1, palabras: {} })).status, 400);
  assertEquals((await c.call("POST", `/sala/${codigo}/respuesta`, "angel@example.com", { ronda: 1.5, palabras: {} })).status, 400);
  const g = await c.call("GET", `/sala/${codigo}`, "marisol@example.com");
  assertEquals(Object.keys(g.body.jugadores.find((j: any) => j.nombre === "Angel").rondasBasta), ["0", "3"]);
});

Deno.test("salas: una sala vencida responde 410 sin leer a sus jugadores (openspec: github-etag-cache)", async () => {
  const c = ctx();
  const codigo = await salaCon(c);
  await c.call("POST", `/sala/${codigo}/unirse`, "angel@example.com");
  c.avanzar(3 * 3600 * 1000 + 1000);
  let listados = 0;
  const list = c.store.list.bind(c.store);
  c.store.list = (dir: string) => { listados++; return list(dir); };
  const r = await c.call("GET", `/sala/${codigo}`, "marisol@example.com");
  assertEquals([r.status, r.body.error, listados], [410, "sala_vencida", 0]);
});
