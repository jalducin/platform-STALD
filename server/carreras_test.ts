// Carreras de Arcade en partida (openspec: juegos-plataformas-karts), con almacén en memoria y reloj controlado.
// deno-lint-ignore-file no-explicit-any
import { assertEquals } from "jsr:@std/assert@1";
import { clearCacheJuegos, handleJuegos } from "./juegos.ts";
import { clearCacheSalas, JUEGOS_PARTIDA } from "./salas.ts";
import { CARRERAS, validarCarrera } from "./carreras.ts";
import { MemoryStore } from "./store.ts";

const ingles = [
  { alumno: "Marisol", userEmails: ["marisol@example.com"], userNames: ["Marisol"] },
  { alumno: "Angel", userEmails: ["angel@example.com"], userNames: ["Angel"] },
];
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s });

function ctx() {
  clearCacheJuegos();
  const store = new MemoryStore();
  let t = Date.parse("2026-10-11T18:00:00.000Z");
  const deps = {
    store, admin: "admin@example.com", filasIngles: () => Promise.resolve(ingles), filasSecundaria: () => Promise.resolve([]),
    hoy: () => "2026-10-11", ahora: () => new Date(t).toISOString(),
  };
  const call = async (method: string, sub: string, email: string, body?: unknown) => {
    clearCacheSalas();
    const req = new Request(`http://x/juegos${sub}?email=${encodeURIComponent(email)}`, { method, body: body === undefined ? undefined : JSON.stringify(body) });
    const res = await handleJuegos(req, sub, email, deps, json);
    return { status: res.status, body: await res.json() };
  };
  return { store, call, avanzar: (ms: number) => { t += ms; } };
}

// Sala empezada de `juego` con Marisol (host) y Angel; el reloj queda en el instante de inicio.
async function salaEmpezada(c: ReturnType<typeof ctx>, juego: string) {
  const r = await c.call("POST", "/sala", "marisol@example.com", { juego, bots: true });
  assertEquals(r.status, 200, JSON.stringify(r.body));
  const codigo = r.body.codigo as string;
  assertEquals((await c.call("POST", `/sala/${codigo}/unirse`, "angel@example.com")).status, 200);
  assertEquals((await c.call("POST", `/sala/${codigo}/empezar`, "marisol@example.com")).status, 200);
  c.avanzar(5000); // cuenta regresiva del servidor
  return codigo;
}

Deno.test("carreras: plataformas y karts se pueden crear en partida", () => {
  assertEquals([JUEGOS_PARTIDA.has("plataformas"), JUEGOS_PARTIDA.has("karts")], [true, true]);
});

Deno.test("carreras: enviar el tiempo; solo cuenta el primero", async () => {
  const c = ctx();
  const codigo = await salaEmpezada(c, "karts");
  c.avanzar(62_000);
  const r = await c.call("POST", `/sala/${codigo}/respuesta`, "marisol@example.com", { carrera: { ms: 61_500, monedas: 7 } });
  assertEquals(r.status, 200, JSON.stringify(r.body));
  c.avanzar(1000);
  assertEquals((await c.call("POST", `/sala/${codigo}/respuesta`, "marisol@example.com", { carrera: { ms: 62_400, monedas: 9 } })).status, 200);
  const g = await c.call("GET", `/sala/${codigo}`, "angel@example.com");
  const m = g.body.jugadores.find((j: any) => j.nombre === "Marisol");
  assertEquals([m.carrera.ms, m.carrera.monedas], [61_500, 7], "el segundo envío no reemplaza al primero");
  assertEquals(g.body.jugadores.find((j: any) => j.nombre === "Angel").carrera, undefined);
});

Deno.test("carreras: no terminó (ms null) y plataformas con su mínimo", async () => {
  const c = ctx();
  const codigo = await salaEmpezada(c, "plataformas");
  c.avanzar(7000);
  assertEquals((await c.call("POST", `/sala/${codigo}/respuesta`, "angel@example.com", { carrera: { ms: 6800, monedas: 0 } })).status, 200);
  assertEquals((await c.call("POST", `/sala/${codigo}/respuesta`, "marisol@example.com", { carrera: { ms: null, monedas: 3 } })).status, 200);
  const g = await c.call("GET", `/sala/${codigo}`, "marisol@example.com");
  assertEquals(g.body.jugadores.map((j: any) => j.carrera.ms), [null, 6800]);
});

Deno.test("carreras: tiempos inválidos → 400 carrera_invalida", async () => {
  const c = ctx();
  const codigo = await salaEmpezada(c, "karts");
  c.avanzar(60_000);
  const malos = [
    { ms: 5000, monedas: 0 }, // imposible: la carrera lleva 60 s y no cuadra con el reloj
    { ms: 14_000, monedas: 0 }, // debajo del mínimo de karts
    { ms: 63_500, monedas: 0 }, // más que el tiempo transcurrido
    { ms: 59_000.5, monedas: 0 }, { ms: "59000", monedas: 0 }, { ms: 59_000, monedas: -1 }, { ms: 59_000 }, { ms: 59_000, monedas: 0, extra: 1 }, "rapido",
  ];
  for (const carrera of malos) {
    const r = await c.call("POST", `/sala/${codigo}/respuesta`, "marisol@example.com", { carrera });
    assertEquals([r.status, r.body.error], [400, "carrera_invalida"], JSON.stringify(carrera));
  }
  c.avanzar(CARRERAS.karts.limiteMs);
  assertEquals((await c.call("POST", `/sala/${codigo}/respuesta`, "marisol@example.com", { carrera: { ms: CARRERAS.karts.limiteMs + 50_000, monedas: 0 } })).body.error, "carrera_invalida", "pasado el límite");
});

Deno.test("carreras: antes de empezar 409 y en otro juego 400", async () => {
  const c = ctx();
  const r = await c.call("POST", "/sala", "marisol@example.com", { juego: "karts", bots: true });
  const codigo = r.body.codigo;
  assertEquals((await c.call("POST", `/sala/${codigo}/respuesta`, "marisol@example.com", { carrera: { ms: 20_000, monedas: 0 } })).status, 409);
  const quiz = await salaEmpezada(c, "cultura");
  c.avanzar(30_000);
  assertEquals((await c.call("POST", `/sala/${quiz}/respuesta`, "marisol@example.com", { carrera: { ms: 29_000, monedas: 0 } })).body.error, "carrera_invalida");
});

Deno.test("carreras: validarCarrera directo", () => {
  const inicio = 1_000_000;
  assertEquals(validarCarrera("karts", { ms: 40_000, monedas: 2 }, inicio, inicio + 40_500), { ms: 40_000, monedas: 2 });
  assertEquals(validarCarrera("karts", { ms: 40_000, monedas: 2 }, inicio, inicio + 70_000), null, "más de 20 s de diferencia");
  assertEquals(validarCarrera("plataformas", { ms: null, monedas: 0 }, inicio, inicio + 1000), { ms: null, monedas: 0 });
  assertEquals(validarCarrera("poker", { ms: 40_000, monedas: 0 }, inicio, inicio + 40_000), null);
});
