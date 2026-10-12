// ⛳ Golf en el servidor (openspec: golf): sala de 2 a 4 personas sin bots, validación de tiros, fin de partida,
// catálogo y progreso individual. El motor (juegos/golf-motor.js) se prueba en server/golf_motor_test.ts.
// deno-lint-ignore-file no-explicit-any
import { assert, assertEquals } from "jsr:@std/assert@1";
import { CATALOGO, clearCacheJuegos, handleJuegos } from "./juegos.ts";
import { JUEGOS_PROGRESO, validarProgreso } from "./progreso.ts";
import { clearCacheSalas, enMesa, JUEGOS_PARTIDA, MESAS } from "./salas.ts";
import { MemoryStore } from "./store.ts";
import "../juegos/mesas.js";

const Mesas = (globalThis as any).Mesas;
const NOMBRES = ["Marisol", "Angel", "Laura", "Beto", "Carla"];
const correo = (n: string) => n.toLowerCase() + "@example.com";
const ingles = NOMBRES.map((n) => ({ alumno: n, userEmails: [correo(n)], userNames: [n] }));
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s });

function ctx() {
  clearCacheJuegos();
  const store = new MemoryStore();
  let t = Date.parse("2026-10-12T18:00:00.000Z");
  const deps = {
    store, admin: "admin@example.com", filasIngles: () => Promise.resolve(ingles), filasSecundaria: () => Promise.resolve([]),
    hoy: () => "2026-10-12", ahora: () => new Date(t).toISOString(),
  };
  const call = async (method: string, sub: string, email: string, body?: unknown) => {
    clearCacheSalas();
    const req = new Request(`http://x/juegos${sub}?email=${encodeURIComponent(email)}`, { method, body: body === undefined ? undefined : JSON.stringify(body) });
    const res = await handleJuegos(req, sub, email, deps, json);
    return { status: res.status, body: await res.json() };
  };
  return { store, call, avanzar: (ms: number) => { t += ms; } };
}
type Ctx = ReturnType<typeof ctx>;

// Sala de golf empezada con las primeras `n` personas (Marisol anfitriona).
async function salaGolf(c: Ctx, n = 2) {
  const r = await c.call("POST", "/sala", correo("Marisol"), { juego: "golf", opciones: {}, bots: false });
  assertEquals(r.status, 200, JSON.stringify(r.body));
  const codigo = r.body.codigo as string;
  for (const nombre of NOMBRES.slice(1, n)) assertEquals((await c.call("POST", `/sala/${codigo}/unirse`, correo(nombre))).status, 200, nombre);
  assertEquals((await c.call("POST", `/sala/${codigo}/empezar`, correo("Marisol"))).status, 200);
  c.avanzar(6000);
  return codigo;
}
const jugada = (c: Ctx, codigo: string, nombre: string, j: unknown) => c.call("POST", `/sala/${codigo}/respuesta`, correo(nombre), { jugada: j });

Deno.test("golf: se puede crear en sala, mesa de 2 a 4 sin bots y catálogo de Arcade con tope", () => {
  assert(JUEGOS_PARTIDA.has("golf"));
  assertEquals(CATALOGO.golf, { categoria: "arcade", titulo: "Golf", max: 1000 });
  assertEquals(MESAS.golf, { max: 4, min: 2, bots: "nunca" });
  assertEquals(Mesas.MESAS.golf, MESAS.golf, "juegos/mesas.js igual que el servidor");
  assertEquals([enMesa("golf", 1, true), enMesa("golf", 3, true)], [1, 3], "los bots nunca completan la mesa");
  assertEquals(Mesas.botsEnMesa("golf", 1, true), null);
  assertEquals(Mesas.textoMesa("golf", 3, 0), "Hasta 4 personas · 3 personas");
});

Deno.test("golf: sin bots aunque se pidan; con 1 persona faltan; 2, 3 y 4 empiezan; la quinta no entra", async () => {
  const c = ctx();
  const conBots = await c.call("POST", "/sala", correo("Marisol"), { juego: "golf", opciones: {}, bots: true });
  assertEquals([conBots.status, conBots.body.sala.bots], [200, false]);
  assertEquals((await c.call("POST", `/sala/${conBots.body.codigo}/empezar`, correo("Marisol"))).body.error, "faltan_jugadores");
  for (const n of [2, 3, 4]) await salaGolf(c, n);
  const llena = await c.call("POST", "/sala", correo("Marisol"), { juego: "golf", opciones: {}, bots: false });
  for (const nombre of NOMBRES.slice(1, 4)) assertEquals((await c.call("POST", `/sala/${llena.body.codigo}/unirse`, correo(nombre))).status, 200);
  assertEquals((await c.call("POST", `/sala/${llena.body.codigo}/unirse`, correo("Carla"))).body.error, "sala_llena");
});

Deno.test("golf: tiros válidos se guardan solo con sus campos; inválidos → jugada_invalida; turno_tomado", async () => {
  const c = ctx();
  const codigo = await salaGolf(c, 3);
  const r = await jugada(c, codigo, "Marisol", { n: 0, accion: "tiro", angulo: 3599, fuerza: 100, efecto: 30, pos: 5, extra: "x" });
  assertEquals(r.status, 200, JSON.stringify(r.body));
  const { t, ...guardada } = r.body.jugadas[0];
  assert(typeof t === "number");
  assertEquals(guardada, { n: 0, accion: "tiro", angulo: 3599, fuerza: 100 });
  assertEquals((await jugada(c, codigo, "Angel", { n: 1, accion: "tiro", angulo: 0, fuerza: 1 })).status, 200);
  const malas = [
    { n: 2, accion: "tiro", angulo: 3600, fuerza: 50 }, { n: 2, accion: "tiro", angulo: -1, fuerza: 50 },
    { n: 2, accion: "tiro", angulo: 10, fuerza: 0 }, { n: 2, accion: "tiro", angulo: 10, fuerza: 101 },
    { n: 2, accion: "tiro", angulo: 10.5, fuerza: 50 }, { n: 2, accion: "tiro", angulo: 10, fuerza: 49.5 },
    { n: 2, accion: "tiro", angulo: "10", fuerza: 50 }, { n: 2, accion: "tiro", fuerza: 50 }, { n: 2, accion: "tiro", angulo: 10 },
    { n: 2, accion: "golpe", angulo: 10, fuerza: 50 }, { n: 2 }, { n: -1, accion: "tiro", angulo: 1, fuerza: 1 },
  ];
  for (const m of malas) assertEquals((await jugada(c, codigo, "Laura", m)).body.error, "jugada_invalida", JSON.stringify(m));
  assertEquals((await jugada(c, codigo, "Laura", { n: 1, accion: "tiro", angulo: 5, fuerza: 5 })).body.error, "turno_tomado");
  const rendirse = await jugada(c, codigo, "Laura", { n: 2, accion: "rendirse", angulo: 4 });
  assertEquals([rendirse.status, rendirse.body.jugadas.at(-1).accion, rendirse.body.jugadas.at(-1).angulo], [200, "rendirse", undefined]);
});

Deno.test("golf: con la partida terminada (final registrado) no se aceptan más jugadas; la revancha sí", async () => {
  const c = ctx();
  const codigo = await salaGolf(c, 2);
  assertEquals((await jugada(c, codigo, "Marisol", { n: 0, accion: "tiro", angulo: 2700, fuerza: 40 })).status, 200);
  assertEquals((await c.call("POST", `/sala/${codigo}/respuesta`, correo("Angel"), { final: 300 })).status, 200);
  const tarde = await jugada(c, codigo, "Marisol", { n: 1, accion: "tiro", angulo: 2700, fuerza: 40 });
  assertEquals([tarde.status, tarde.body.error], [409, "partida_terminada"]);
  assertEquals((await c.call("POST", `/sala/${codigo}/respuesta`, correo("Marisol"), { final: 500, podio: [{ nombre: "Marisol", total: 500 }] })).status, 200);
  assertEquals((await c.call("POST", `/sala/${codigo}/revancha`, correo("Angel"))).status, 200);
});

Deno.test("golf: puntos individuales con tope de 1000", async () => {
  const c = ctx();
  const r = await c.call("POST", "/partida", correo("Marisol"), { juego: "golf", puntos: 4000, aciertos: 3, total: 3, segundos: 60 });
  assertEquals([r.status, r.body.puntos], [200, 1000]);
});

// ---------- Progreso individual ----------
const avance = (extra: Record<string, unknown> = {}) => ({ mejores: { "1": 2, "2": 3 }, estrellas: { "1": 2, "2": 1 }, recorridos: 0, mejorRecorrido: null, ...extra });

Deno.test("golf: progreso con forma exacta", () => {
  assert((JUEGOS_PROGRESO as readonly string[]).includes("golf"));
  assert(validarProgreso("golf", avance()));
  assert(validarProgreso("golf", { mejores: {}, estrellas: {}, recorridos: 0, mejorRecorrido: null }));
  const nueve = Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8, 9].map((h) => [String(h), 20]));
  assert(validarProgreso("golf", { mejores: nueve, estrellas: Object.fromEntries(Object.keys(nueve).map((k) => [k, 3])), recorridos: 100000, mejorRecorrido: 200 }));
  assert(validarProgreso("golf", avance({ recorridos: 3, mejorRecorrido: 9 })));
  const malos = [
    avance({ mejores: { "10": 3 } }), avance({ mejores: { "0": 3 } }), avance({ mejores: { "1": 0 } }), avance({ mejores: { "1": 21 } }),
    avance({ mejores: { "1": 2.5 } }), avance({ estrellas: { "1": 4 } }), avance({ estrellas: { "1": -1 } }), avance({ estrellas: { "x": 1 } }),
    avance({ recorridos: -1 }), avance({ recorridos: 100001 }), avance({ mejorRecorrido: 8 }), avance({ mejorRecorrido: 201 }),
    avance({ mejorRecorrido: "40" }), avance({ extra: 1 }), { mejores: {}, estrellas: {}, recorridos: 0 }, null, [], "x",
    avance({ mejores: [] }), avance({ estrellas: null }),
  ];
  for (const m of malos) assertEquals(validarProgreso("golf", m), false, JSON.stringify(m));
});

Deno.test("golf: guardar y leer el progreso; cada quien el suyo; inválido no cambia nada", async () => {
  const c = ctx();
  const p = await c.call("PUT", "/progreso/golf", correo("Marisol"), { v: 0, datos: avance() });
  assertEquals([p.status, p.body.ok, p.body.v], [200, true, 1], JSON.stringify(p.body));
  const g = await c.call("GET", "/progreso/golf", correo("Marisol"));
  assertEquals([g.body.juego, g.body.v, g.body.datos], ["golf", 1, avance()]);
  const doc = await c.store.get<any>("juegos/progreso/golf/a-marisol.json");
  assert(doc && !JSON.stringify(doc.data).includes("@"), "sin correos, bajo el id");
  const mala = await c.call("PUT", "/progreso/golf", correo("Marisol"), { v: 1, datos: avance({ estrellas: { "1": 4 } }) });
  assertEquals([mala.status, mala.body.error], [400, "progreso_invalido"]);
  assertEquals((await c.call("GET", "/progreso/golf", correo("Marisol"))).body.v, 1);
  const angel = await c.call("GET", "/progreso/golf", correo("Angel"));
  assertEquals([angel.body.v, angel.body.datos], [0, null]);
  const vieja = await c.call("PUT", "/progreso/golf", correo("Marisol"), { v: 0, datos: avance() });
  assertEquals([vieja.status, vieja.body.error, vieja.body.v], [409, "version_vieja", 1]);
});
