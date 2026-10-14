// Progreso individual de los juegos de Arcade (openspec: juegos-plataformas-karts), con almacén en memoria.
// deno-lint-ignore-file no-explicit-any
import { assert, assertEquals } from "jsr:@std/assert@1";
import { CATALOGO, clearCacheJuegos, handleJuegos } from "./juegos.ts";
import { MAX_PROGRESO, validarProgreso } from "./progreso.ts";
import { MemoryStore } from "./store.ts";

const ingles = [
  { alumno: "Marisol", userEmails: ["marisol@example.com"], userNames: ["Marisol"] },
  { alumno: "Angel", userEmails: ["angel@example.com"], userNames: ["Angel"] },
];
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s });

function ctx() {
  clearCacheJuegos();
  const store = new MemoryStore();
  const deps = {
    store, admin: "admin@example.com", filasIngles: () => Promise.resolve(ingles), filasSecundaria: () => Promise.resolve([]),
    hoy: () => "2026-10-11", ahora: () => "2026-10-11T18:00:00.000Z",
  };
  const call = async (method: string, sub: string, email: string, body?: unknown) => {
    let cuerpo: string | undefined;
    if (body !== undefined) cuerpo = typeof body === "string" ? body : JSON.stringify(body);
    const req = new Request(`http://x/juegos${sub}?email=${encodeURIComponent(email)}`, { method, body: cuerpo });
    const res = await handleJuegos(req, sub, email, deps, json);
    return { status: res.status, body: await res.json() };
  };
  return { store, call };
}

const plat = (extra: Record<string, unknown> = {}) => ({
  mundo: 1, nivel: 2, vidas: 5, monedas: 37, poder: "grande", completados: ["1-1"], mejores: { "1-1": 41 }, enCurso: null, ...extra,
});
const karts = (extra: Record<string, unknown> = {}) => ({
  copas: { fiesta: { lugar: 2, puntos: 44 } }, records: { pradera: 61234 }, piezas: ["chasis-ligero"],
  equipo: { chasis: "ligero", llantas: "estandar", color: "rojo" }, copaEnCurso: { copa: "fiesta", carrera: 1, puntos: [15, 12, 10, 8, 6, 4, 2, 1], dif: 100 }, ...extra,
});

Deno.test("progreso: plataformas y karts en el catálogo (arcade, tope 2000)", () => {
  assertEquals(CATALOGO["plataformas"], { categoria: "arcade", titulo: "Axo y los 12 mundos", max: 2000 });
  assertEquals(CATALOGO["karts"], { categoria: "arcade", titulo: "Karts Turbo", max: 2000 });
});

Deno.test("progreso: sin avance responde v 0 y datos null", async () => {
  const c = ctx();
  const r = await c.call("GET", "/progreso/plataformas", "marisol@example.com");
  assertEquals([r.status, r.body.juego, r.body.v, r.body.datos, r.body.actualizado], [200, "plataformas", 0, null, null]);
});

Deno.test("progreso: guardar y leer; el archivo usa el id, sin correos", async () => {
  const c = ctx();
  const p = await c.call("PUT", "/progreso/plataformas", "marisol@example.com", { v: 0, datos: plat() });
  assertEquals([p.status, p.body.ok, p.body.v], [200, true, 1], JSON.stringify(p.body));
  const g = await c.call("GET", "/progreso/plataformas", "marisol@example.com");
  assertEquals([g.body.v, g.body.datos, g.body.actualizado], [1, plat(), "2026-10-11T18:00:00.000Z"]);
  const doc = await c.store.get<any>("juegos/progreso/plataformas/a-marisol.json");
  assert(doc, "se guarda bajo juegos/progreso/<juego>/<id>.json");
  assertEquals(doc!.data.v, 1);
  assertEquals(JSON.stringify(doc!.data).includes("@"), false);
  const p2 = await c.call("PUT", "/progreso/plataformas", "marisol@example.com", { v: 1, datos: plat({ nivel: 3 }) });
  assertEquals([p2.status, p2.body.v], [200, 2]);
});

Deno.test("progreso: karts válido, con copa en curso", async () => {
  const c = ctx();
  const p = await c.call("PUT", "/progreso/karts", "angel@example.com", { v: 0, datos: karts() });
  assertEquals([p.status, p.body.v], [200, 1], JSON.stringify(p.body));
  assertEquals((await c.call("GET", "/progreso/karts", "angel@example.com")).body.datos, karts());
});

Deno.test("progreso: versión vieja → 409 con lo guardado, sin pisarlo", async () => {
  const c = ctx();
  await c.call("PUT", "/progreso/plataformas", "marisol@example.com", { v: 0, datos: plat() });
  await c.call("PUT", "/progreso/plataformas", "marisol@example.com", { v: 1, datos: plat({ nivel: 3 }) });
  const r = await c.call("PUT", "/progreso/plataformas", "marisol@example.com", { v: 1, datos: plat({ nivel: 1 }) });
  assertEquals([r.status, r.body.error, r.body.v, r.body.datos.nivel], [409, "version_vieja", 2, 3]);
  assertEquals((await c.call("GET", "/progreso/plataformas", "marisol@example.com")).body.datos.nivel, 3);
});

Deno.test("progreso: cada quien el suyo", async () => {
  const c = ctx();
  await c.call("PUT", "/progreso/plataformas", "marisol@example.com", { v: 0, datos: plat() });
  const r = await c.call("GET", "/progreso/plataformas", "angel@example.com");
  assertEquals([r.status, r.body.v, r.body.datos], [200, 0, null]);
});

Deno.test("progreso: forma inválida → 400 progreso_invalido", async () => {
  const c = ctx();
  const malos: unknown[] = [
    null, [], "x", plat({ vidas: 500 }), plat({ mundo: 13 }), plat({ nivel: 0 }), plat({ poder: "estrella" }), plat({ extra: 1 }),
    plat({ completados: ["1-1", "1-1"] }), plat({ completados: ["13-1"] }), plat({ mejores: { "1-1": 0 } }), plat({ enCurso: { nivel: "1-4", checkpoint: true } }),
    plat({ monedas: 1.5 }),
  ];
  for (const datos of malos) {
    const r = await c.call("PUT", "/progreso/plataformas", "marisol@example.com", { v: 0, datos });
    assertEquals([r.status, r.body.error], [400, "progreso_invalido"], JSON.stringify(datos));
  }
  const malosK: unknown[] = [
    karts({ piezas: ["turbo-nuclear"] }), karts({ piezas: [] }), // equipo con chasis ligero sin la pieza
    karts({ equipo: { chasis: "estandar", llantas: "estandar", color: "dorado" } }), karts({ records: { pradera: 5 } }),
    karts({ copaEnCurso: { copa: "fiesta", carrera: 4, puntos: [0, 0, 0, 0, 0, 0, 0, 0], dif: 100 } }),
    karts({ copaEnCurso: { copa: "fiesta", carrera: 0, puntos: [0, 0], dif: 100 } }), karts({ copas: { fiesta: { lugar: 9, puntos: 1 } } }),
  ];
  for (const datos of malosK) {
    const r = await c.call("PUT", "/progreso/karts", "marisol@example.com", { v: 0, datos });
    assertEquals([r.status, r.body.error], [400, "progreso_invalido"], JSON.stringify(datos));
  }
  assertEquals((await c.call("GET", "/progreso/plataformas", "marisol@example.com")).body.v, 0, "nada se guardó");
});

Deno.test("progreso: tamaño máximo → 413", async () => {
  const c = ctx();
  const mejores: Record<string, number> = {};
  const datos = plat({ mejores, relleno: "x".repeat(MAX_PROGRESO) });
  const r = await c.call("PUT", "/progreso/plataformas", "marisol@example.com", { v: 0, datos });
  assertEquals([r.status, r.body.error], [413, "progreso_grande"]);
});

Deno.test("progreso: errores de petición", async () => {
  const c = ctx();
  assertEquals((await c.call("GET", "/progreso/sudoku", "marisol@example.com")).body.error, "juego_sin_progreso");
  assertEquals((await c.call("PUT", "/progreso/plataformas", "marisol@example.com", "{no json")).body.error, "json_invalido");
  assertEquals((await c.call("PUT", "/progreso/plataformas", "marisol@example.com", { v: -1, datos: plat() })).body.error, "version_invalida");
  assertEquals((await c.call("PUT", "/progreso/plataformas", "marisol@example.com", { datos: plat() })).body.error, "version_invalida");
  assertEquals((await c.call("POST", "/progreso/plataformas", "marisol@example.com", { v: 0, datos: plat() })).status, 405);
  const nadie = await c.call("GET", "/progreso/plataformas", "nadie@example.com");
  assertEquals([nadie.status, nadie.body.error], [403, "no_registrado"]);
});

// karts-pistas-grandes: récords versionados. pistasV 2 = récords de las pistas grandes; recordsV1 = los de las chicas.
Deno.test("progreso: karts con récords versionados (pistasV 2 y recordsV1) y la forma anterior", async () => {
  const c = ctx();
  const nuevo = karts({ records: { hielo: 131_400 }, pistasV: 2, recordsV1: { pradera: 61_234, volcan: 70_100 } });
  const p = await c.call("PUT", "/progreso/karts", "angel@example.com", { v: 0, datos: nuevo });
  assertEquals([p.status, p.body.v], [200, 1], JSON.stringify(p.body));
  assertEquals((await c.call("GET", "/progreso/karts", "angel@example.com")).body.datos, nuevo);
  assert(validarProgreso("karts", karts({ records: {}, pistasV: 2, recordsV1: {} })), "migrado sin récords todavía");
  assert(validarProgreso("karts", karts()), "la forma anterior (5 llaves) sigue valiendo: pestañas viejas");
  const malos: unknown[] = [
    karts({ pistasV: 2 }), // falta recordsV1
    karts({ recordsV1: {} }), // falta pistasV
    karts({ pistasV: 3, recordsV1: {} }), karts({ pistasV: 1, recordsV1: {} }), karts({ pistasV: "2", recordsV1: {} }),
    karts({ pistasV: 2, recordsV1: { pradera: 5 } }), karts({ pistasV: 2, recordsV1: { "Pradera!": 61_000 } }),
    karts({ pistasV: 2, recordsV1: Object.fromEntries(Array.from({ length: 33 }, (_, i) => ["pista-" + "abc"[i % 3] + "abcdefghijk"[Math.floor(i / 3)], 61_000])) }),
  ];
  const rs = await Promise.all(malos.map((datos) => c.call("PUT", "/progreso/karts", "marisol@example.com", { v: 0, datos })));
  rs.forEach((r, i) => assertEquals([r.status, r.body.error], [400, "progreso_invalido"], JSON.stringify(malos[i])));
});

Deno.test("progreso: validarProgreso acepta lo mínimo y rechaza llaves faltantes", () => {
  assert(validarProgreso("plataformas", plat()));
  assert(validarProgreso("karts", karts({ copaEnCurso: null, piezas: [], equipo: { chasis: "estandar", llantas: "estandar", color: "azul" } })));
  const { vidas: _v, ...sinVidas } = plat();
  assertEquals(validarProgreso("plataformas", sinVidas), false);
  assertEquals(validarProgreso("otro", plat()), false);
});
