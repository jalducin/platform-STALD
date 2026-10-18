// Carreras de Arcade en partida (openspec: juegos-plataformas-karts), con almacén en memoria y reloj controlado.
// karts-pistas-grandes: en karts el mínimo y el límite son los de la pista de la sala (reglasCarrera).
// deno-lint-ignore-file no-explicit-any
import { assert, assertEquals } from "jsr:@std/assert@1";
import { clearCacheJuegos, handleJuegos } from "./juegos.ts";
import { clearCacheSalas, JUEGOS_PARTIDA } from "./salas.ts";
import { MAPAS_SALA, reglasCarrera, validarCarrera } from "./carreras.ts";
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
async function salaEmpezada(c: ReturnType<typeof ctx>, juego: string, mapa?: string) {
  const r = await c.call("POST", "/sala", "marisol@example.com", { juego, bots: true, ...(mapa ? { opciones: { mapa } } : {}) });
  assertEquals(r.status, 200, JSON.stringify(r.body));
  const codigo = r.body.codigo as string;
  assertEquals((await c.call("POST", `/sala/${codigo}/unirse`, "angel@example.com")).status, 200);
  assertEquals((await c.call("POST", `/sala/${codigo}/empezar`, "marisol@example.com")).status, 200);
  c.avanzar(juego === "karts" ? 8000 : 5000); // cuenta regresiva del servidor (karts-salida-y-puntos: 8 s en Karts)
  return codigo;
}

Deno.test("carreras: plataformas y karts se pueden crear en partida", () => {
  assertEquals([JUEGOS_PARTIDA.has("plataformas"), JUEGOS_PARTIDA.has("karts")], [true, true]);
});

Deno.test("carreras: enviar el tiempo; solo cuenta el primero", async () => {
  const c = ctx();
  const codigo = await salaEmpezada(c, "karts", "pradera");
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
  const codigo = await salaEmpezada(c, "karts", "hielo");
  c.avanzar(60_000);
  const malos = [
    { ms: 5000, monedas: 0 }, // imposible: la carrera lleva 60 s y no cuadra con el reloj
    { ms: 14_000, monedas: 0 }, // debajo del mínimo del Lago Helado
    { ms: 63_500, monedas: 0 }, // más que el tiempo transcurrido
    { ms: 59_000.5, monedas: 0 }, { ms: "59000", monedas: 0 }, { ms: 59_000, monedas: -1 }, { ms: 59_000 }, { ms: 59_000, monedas: 0, extra: 1 }, "rapido",
  ];
  for (const carrera of malos) {
    const r = await c.call("POST", `/sala/${codigo}/respuesta`, "marisol@example.com", { carrera });
    assertEquals([r.status, r.body.error], [400, "carrera_invalida"], JSON.stringify(carrera));
  }
  const lim = reglasCarrera("karts", "hielo")!.limiteMs;
  c.avanzar(lim);
  assertEquals((await c.call("POST", `/sala/${codigo}/respuesta`, "marisol@example.com", { carrera: { ms: lim + 50_000, monedas: 0 } })).body.error, "carrera_invalida", "pasado el límite");
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

Deno.test("carreras: el mapa vive en sala.opciones (elegido o al azar) y la revancha lo hereda", async () => {
  const c = ctx();
  const r = await c.call("POST", "/sala", "marisol@example.com", { juego: "karts", opciones: { mapa: "hielo" }, bots: true });
  assertEquals([r.status, r.body.sala.opciones.mapa], [200, "hielo"]);
  const p = await c.call("POST", "/sala", "marisol@example.com", { juego: "plataformas", bots: true });
  assertEquals(MAPAS_SALA.plataformas.includes(p.body.sala.opciones.mapa), true, p.body.sala.opciones.mapa);
  const mal = await c.call("POST", "/sala", "marisol@example.com", { juego: "karts", opciones: { mapa: "luna" } });
  assertEquals([mal.status, mal.body.error], [400, "mapa_invalido"]);
  // Revancha: termina la carrera y la sala nueva trae el mismo mapa.
  const codigo = r.body.codigo;
  assertEquals((await c.call("POST", `/sala/${codigo}/empezar`, "marisol@example.com")).status, 200);
  c.avanzar(8000 + 60_000); // 8 s de cuenta (karts-salida-y-puntos); karts-3-vueltas: arriba del mínimo del Lago Helado (≈ 48 s)
  assertEquals((await c.call("POST", `/sala/${codigo}/respuesta`, "marisol@example.com", { carrera: { ms: 60_000, monedas: 1 } })).status, 200);
  assertEquals((await c.call("POST", `/sala/${codigo}/respuesta`, "marisol@example.com", { final: 500, podio: [{ nombre: "Marisol", total: 500 }] })).status, 200);
  const rev = await c.call("POST", `/sala/${codigo}/revancha`, "marisol@example.com");
  assertEquals(rev.status, 200, JSON.stringify(rev.body));
  const g = await c.call("GET", `/sala/${rev.body.codigo}`, "marisol@example.com");
  assertEquals([g.body.sala.juego, g.body.sala.opciones.mapa], ["karts", "hielo"]);
});

Deno.test("carreras: validarCarrera directo", () => {
  const inicio = 1_000_000;
  assertEquals(validarCarrera("karts", { ms: 60_000, monedas: 2 }, inicio, inicio + 60_500, "pradera"), { ms: 60_000, monedas: 2 }); // karts-3-vueltas: mínimo ≈ 45 s
  assertEquals(validarCarrera("karts", { ms: 60_000, monedas: 2 }, inicio, inicio + 90_000, "pradera"), null, "más de 20 s de diferencia");
  assertEquals(validarCarrera("plataformas", { ms: null, monedas: 0 }, inicio, inicio + 1000, "1-1"), { ms: null, monedas: 0 });
  assertEquals(validarCarrera("poker", { ms: 40_000, monedas: 0 }, inicio, inicio + 40_000), null);
});

// karts-pistas-grandes: los límites salen de juegos/karts-pistas.js y juegos/arcade.js (la misma fuente que el juego).
Deno.test("carreras: karts con el mínimo y el límite de la pista de la sala", async () => {
  const G = globalThis as any;
  for (const id of MAPAS_SALA.karts) assertEquals(reglasCarrera("karts", id), G.Arcade.limitesKarts(id), id);
  assertEquals(reglasCarrera("karts", "luna"), { minMs: G.Arcade.MIN_SALA.karts, limiteMs: G.Arcade.LIMITE_SALA.karts }, "pista desconocida: los generales");
  assertEquals(reglasCarrera("plataformas", "1-1"), { minMs: 6_000, limiteMs: 240_000 });
  const hielo = reglasCarrera("karts", "hielo")!, pradera = reglasCarrera("karts", "pradera")!, volcan = reglasCarrera("karts", "volcan")!;
  assert(hielo.minMs > 46_000 && hielo.minMs < 49_000, JSON.stringify(hielo)); // karts-3-vueltas
  const c = ctx();
  const codigo = await salaEmpezada(c, "karts", "hielo");
  c.avanzar(25_000);
  const corto = await c.call("POST", `/sala/${codigo}/respuesta`, "marisol@example.com", { carrera: { ms: 24_800, monedas: 0 } });
  assertEquals([corto.status, corto.body.error], [400, "carrera_invalida"], "25 s en el Lago Helado: debajo del mínimo de la pista");
  c.avanzar(100_000);
  assertEquals((await c.call("POST", `/sala/${codigo}/respuesta`, "angel@example.com", { carrera: { ms: 124_600, monedas: 4 } })).status, 200, "tiempo normal");
  // karts-3-vueltas: pasar los 450 s cuenta en el Volcán (límite 500 s) pero no en la Pradera (límite 450 s).
  assertEquals([pradera.limiteMs, volcan.limiteMs], [450_000, 500_000]);
  const cp = ctx(), sp = await salaEmpezada(cp, "karts", "pradera");
  cp.avanzar(455_000);
  assertEquals((await cp.call("POST", `/sala/${sp}/respuesta`, "marisol@example.com", { carrera: { ms: 454_900, monedas: 0 } })).body.error, "carrera_invalida");
  const cv = ctx(), sv = await salaEmpezada(cv, "karts", "volcan");
  cv.avanzar(455_000);
  assertEquals((await cv.call("POST", `/sala/${sv}/respuesta`, "marisol@example.com", { carrera: { ms: 454_900, monedas: 0 } })).status, 200);
});
