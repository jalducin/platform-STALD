// Misiones de Dragon Run (openspec: dragon-run-misiones): validación del avance en el servidor, listas compartidas
// con juegos/dragon-misiones.js y reglas de misiones diarias, logros y premios.
// deno-lint-ignore-file no-explicit-any
import { assert, assertEquals, assertNotEquals } from "jsr:@std/assert@1";
import { CATALOGO, clearCacheJuegos, handleJuegos } from "./juegos.ts";
import { COLORES_DRAGON, ESTELAS_DRAGON, JUEGOS_PROGRESO, PREMIOS_DRAGON, validarProgreso } from "./progreso.ts";
import { MemoryStore } from "./store.ts";
import "../juegos/dragon-misiones.js";

const DM = (globalThis as any).DragonMisiones;

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
    const req = new Request(`http://x/juegos${sub}?email=${encodeURIComponent(email)}`, { method, body: body === undefined ? undefined : JSON.stringify(body) });
    const res = await handleJuegos(req, sub, email, deps, json);
    return { status: res.status, body: await res.json() };
  };
  return { store, call };
}

const dragon = (extra: Record<string, unknown> = {}) => ({
  totales: { metros: 1234, monedas: 61, esquivados: 80, carreras: 4, castillos: 1, dobles: 12 },
  mejorRacha: 16,
  dias: { ultimo: "2026-10-11", racha: 2, mejor: 3 },
  diaria: { fecha: "2026-10-11", avance: [1234, 61, 1] },
  cumplidas: 2,
  premios: ["color-azul", "estela-estrellas"],
  equipo: { color: "azul", estela: "estrellas" },
  ...extra,
});

Deno.test("dragon: está en Arcade y tiene progreso en el servidor", () => {
  assertEquals(CATALOGO["dragon-run"], { categoria: "arcade", titulo: "Dragon Run", max: 2000 });
  assert((JUEGOS_PROGRESO as readonly string[]).includes("dragon-run"));
});

Deno.test("dragon: listas de colores, estelas y premios iguales en la página y el servidor", () => {
  assertEquals(DM.COLORES, COLORES_DRAGON);
  assertEquals(DM.ESTELAS, ESTELAS_DRAGON);
  assertEquals(DM.PREMIOS, PREMIOS_DRAGON);
});

Deno.test("dragon: avance válido se guarda y se lee (sin correos)", async () => {
  const c = ctx();
  const p = await c.call("PUT", "/progreso/dragon-run", "marisol@example.com", { v: 0, datos: dragon() });
  assertEquals([p.status, p.body.v], [200, 1], JSON.stringify(p.body));
  const g = await c.call("GET", "/progreso/dragon-run", "marisol@example.com");
  assertEquals([g.body.juego, g.body.v, g.body.datos], ["dragon-run", 1, dragon()]);
  const doc = await c.store.get<any>("juegos/progreso/dragon-run/a-marisol.json");
  assertEquals(JSON.stringify(doc!.data).includes("@"), false);
  assertEquals((await c.call("GET", "/progreso/dragon-run", "angel@example.com")).body.datos, null, "cada quien el suyo");
});

Deno.test("dragon: mínimo válido (nuevo) y sin diaria", () => {
  assert(validarProgreso("dragon-run", DM.nuevo()));
  assert(validarProgreso("dragon-run", dragon({ diaria: null, dias: { ultimo: null, racha: 0, mejor: 0 } })));
});

Deno.test("dragon: forma inválida → 400 progreso_invalido y no guarda", async () => {
  const c = ctx();
  const t = (x: Record<string, unknown>) => ({ ...dragon().totales, ...x });
  const malos: unknown[] = [
    null, [], dragon({ extra: 1 }), dragon({ mejorRacha: 5000 }), dragon({ mejorRacha: -1 }), dragon({ cumplidas: 1.5 }),
    dragon({ totales: t({ metros: 20_000_000 }) }), dragon({ totales: t({ trampa: 1 }) }),
    dragon({ dias: { ultimo: "2026-02-30", racha: 1, mejor: 1 } }), dragon({ dias: { ultimo: "ayer", racha: 1, mejor: 1 } }),
    dragon({ dias: { ultimo: "2026-10-11", racha: 4, mejor: 3 } }), dragon({ dias: { ultimo: null, racha: 1, mejor: 1 } }),
    dragon({ diaria: { fecha: "2026-13-01", avance: [0, 0, 0] } }), dragon({ diaria: { fecha: "2026-10-11", avance: [0, 0] } }),
    dragon({ diaria: { fecha: "2026-10-11", avance: [0, 0, 200_000] } }),
    dragon({ premios: ["color-arcoiris-nuclear"] }), dragon({ premios: ["color-azul", "color-azul"] }),
    dragon({ equipo: { color: "dorado", estela: "fuego" } }), // dorado sin desbloquear
    dragon({ equipo: { color: "verde", estela: "arcoiris" } }), // estela sin desbloquear
    dragon({ equipo: { color: "plateado", estela: "fuego" } }), dragon({ equipo: { color: "verde" } }),
  ];
  for (const datos of malos) {
    const r = await c.call("PUT", "/progreso/dragon-run", "marisol@example.com", { v: 0, datos });
    assertEquals([r.status, r.body.error], [400, "progreso_invalido"], JSON.stringify(datos));
  }
  assertEquals((await c.call("GET", "/progreso/dragon-run", "marisol@example.com")).body.v, 0, "nada se guardó");
});

Deno.test("dragon: misiones del día deterministas por fecha y jugador, 3 de tipos distintos", () => {
  const a = DM.misionesDelDia("2026-10-11", "a-marisol");
  assertEquals(a, DM.misionesDelDia("2026-10-11", "a-marisol"), "mismas para la misma fecha y jugador");
  assertEquals(a.length, 3);
  assertEquals(new Set(a.map((m: any) => m.tipo)).size, 3);
  for (const m of a) assert(m.meta > 0 && typeof m.texto === "string" && m.texto.length > 3);
  // Cambian con el día o con el jugador (en algún día de la semana).
  const dias = ["2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15", "2026-10-16"];
  assert(dias.some((d) => JSON.stringify(DM.misionesDelDia(d, "a-marisol")) !== JSON.stringify(a)));
  assert(dias.some((d) => JSON.stringify(DM.misionesDelDia(d, "a-marisol")) !== JSON.stringify(DM.misionesDelDia(d, "a-angel"))));
});

Deno.test("dragon: cumplir una misión diaria da mensaje, cuenta y el premio de burbujas", () => {
  const f = "2026-10-11", s = "a-marisol";
  const m = DM.misionesDelDia(f, s).find((x: any) => x.tipo !== "carreras"); // «Corre 3 carreras» no se cumple en una
  const carrera = DM.carreraParaCumplir(m); // carrera mínima que cumple esa misión
  const r = DM.aplicarCarrera(DM.nuevo(), carrera, f, s);
  assert(r.mensajes.some((x: string) => x.includes("¡Misión cumplida!") && x.includes(m.texto)), JSON.stringify(r.mensajes));
  assert(r.prog.cumplidas >= 1);
  assert(r.prog.premios.includes("estela-burbujas"));
  assert(validarProgreso("dragon-run", r.prog), JSON.stringify(r.prog));
  // Otra carrera el mismo día no repite el mensaje de esa misión.
  const r2 = DM.aplicarCarrera(r.prog, carrera, f, s);
  assertEquals(r2.mensajes.filter((x: string) => x.includes(m.texto)).length, 0);
  assertEquals(r2.prog.cumplidas >= r.prog.cumplidas, true);
});

Deno.test("dragon: logros por niveles desbloquean colores; días seguidos y racha que se reinicia", () => {
  const base = { metros: 0, monedas: 0, esquivados: 0, mejorRacha: 0, dobles: 0, castillo: false };
  let p = DM.nuevo();
  p = DM.aplicarCarrera(p, { ...base, metros: 600, castillo: true }, "2026-10-05", "x").prog;
  p = DM.aplicarCarrera(p, { ...base, metros: 450 }, "2026-10-06", "x").prog;
  const r = DM.aplicarCarrera(p, { ...base, metros: 10 }, "2026-10-07", "x");
  assertEquals(DM.nivelLogro("explorador", r.prog), 1);
  assertEquals(DM.nivelLogro("conquistador", r.prog), 1);
  assertEquals(DM.nivelLogro("constante", r.prog), 1);
  assertEquals([r.prog.dias.racha, r.prog.dias.mejor], [3, 3]);
  assert(r.mensajes.some((x: string) => x.includes("Constante") && x.includes("🥉")), JSON.stringify(r.mensajes));
  for (const k of ["color-azul", "color-rojo", "estela-hojas"]) assert(r.prog.premios.includes(k), k);
  const r2 = DM.aplicarCarrera(r.prog, base, "2026-10-09", "x");
  assertEquals([r2.prog.dias.racha, r2.prog.dias.mejor], [1, 3], "se saltó un día");
  const r3 = DM.aplicarCarrera(r2.prog, base, "2026-10-09", "x");
  assertEquals(r3.prog.dias.racha, 1, "mismo día no suma");
  assertEquals(r3.prog.totales.carreras, 5);
});

Deno.test("dragon: aplicarCarrera siempre produce un avance válido (topes) y normalizar repara lo dañado", () => {
  let p = DM.nuevo();
  const enorme = { metros: 9_999_999, monedas: 999_999, esquivados: 9_999_999, mejorRacha: 99_999, dobles: 9_999_999, castillo: true };
  for (let i = 0; i < 3; i++) p = DM.aplicarCarrera(p, enorme, "2026-10-1" + i, "x").prog;
  assert(validarProgreso("dragon-run", p), JSON.stringify(p));
  // 3 días y 3 castillos: faltan Constante 🥈 (rosa, 7 días) y Conquistador 🥇 (noche, 20 castillos).
  assertEquals(p.premios, PREMIOS_DRAGON.filter((x) => !["color-rosa", "color-noche"].includes(x)));
  assertEquals(DM.normalizar(null), DM.nuevo());
  assertEquals(DM.normalizar({ basura: true }), DM.nuevo());
  assertEquals(DM.normalizar(dragon()), dragon());
  assertNotEquals(DM.normalizar(dragon({ mejorRacha: "mucho" })).mejorRacha, "mucho");
});
