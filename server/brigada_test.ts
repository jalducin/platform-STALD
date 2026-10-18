// Servidor de «🦎 Brigada Xalli» (openspec: brigada-xalli, design.md §1, §5 y §10): catálogo con tope 1000, avance
// `brigada` con forma exacta y versionada (récord imposible, misión bloqueada, versión vieja) y la misma lista de
// personajes que juegos/personajes.js.
// deno-lint-ignore-file no-explicit-any
import { assert, assertEquals } from "jsr:@std/assert@1";
import { CATALOGO, clearCacheJuegos, handleJuegos } from "./juegos.ts";
import { JUEGOS_PROGRESO, validarProgreso } from "./progreso.ts";
import { MemoryStore } from "./store.ts";
import "../juegos/personajes.js";
import "../juegos/brigada-misiones.js";
import "../juegos/brigada-motor.js";

const g = globalThis as any;
const M = g.BrigadaMotor;
const ingles = ["Marisol", "Angel"].map((n) => ({ alumno: n, userEmails: [n.toLowerCase() + "@example.com"], userNames: [n] }));
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s });
function ctx() {
  clearCacheJuegos();
  const store = new MemoryStore();
  const deps = { store, admin: "admin@example.com", filasIngles: () => Promise.resolve(ingles), filasSecundaria: () => Promise.resolve([]), hoy: () => "2026-10-17", ahora: () => "2026-10-17T18:00:00.000Z" };
  const call = async (method: string, sub: string, quien: string, body?: unknown) => {
    const email = quien + "@example.com";
    const req = new Request(`http://x/juegos${sub}?email=${encodeURIComponent(email)}`, { method, body: body === undefined ? undefined : JSON.stringify(body) });
    const res = await handleJuegos(req, sub, email, deps, json);
    return { status: res.status, body: await res.json() };
  };
  return { store, call };
}
const avance = () => M.registrarMision(M.progresoVacio(), { mision: 1, puntos: 12_000, ms: 60_000, estrellas: 3, robots: 30, rescatados: 5, completada: true });

Deno.test("brigada: en el catálogo de Arcade con tope 1000 y con avance", () => {
  assertEquals(CATALOGO["brigada"], { categoria: "arcade", titulo: "Brigada Xalli", max: 1000 });
  assert((JUEGOS_PROGRESO as readonly string[]).includes("brigada"));
});

Deno.test("brigada: los personajes del motor son los de juegos/personajes.js", () => {
  assertEquals(M.PERSONAJES, g.Personajes.LISTA.map((p: any) => p.id));
});

Deno.test("brigada: avance — guardar, leer, versión vieja y formas inválidas", async () => {
  const c = ctx();
  const vacio = await c.call("GET", "/progreso/brigada", "marisol");
  assertEquals([vacio.status, vacio.body.v, vacio.body.datos], [200, 0, null]);
  const p = await c.call("PUT", "/progreso/brigada", "marisol", { v: 0, datos: avance() });
  assertEquals([p.status, p.body.v], [200, 1], JSON.stringify(p.body));
  const leido = await c.call("GET", "/progreso/brigada", "marisol");
  assertEquals([leido.body.datos.desbloqueada, leido.body.datos.misiones["1"].estrellas], [2, 3]);
  const vieja = await c.call("PUT", "/progreso/brigada", "marisol", { v: 0, datos: avance() });
  assertEquals([vieja.status, vieja.body.error], [409, "version_vieja"]);
  const a = avance();
  const malos = [
    { ...a, ver: 2 },
    { ...a, misiones: { "1": { estrellas: 3, record: M.puntosMaximos(1, 8) + 1, mejorMs: 60_000 } } },
    { ...a, misiones: { ...a.misiones, "3": { estrellas: 1, record: 100, mejorMs: 60_000 } } },
    { ...a, personaje: "otro" },
  ];
  for (const datos of malos) {
    const r = await c.call("PUT", "/progreso/brigada", "marisol", { v: 1, datos });
    assertEquals([r.status, r.body.error], [400, "progreso_invalido"], JSON.stringify(datos).slice(0, 80));
  }
  assertEquals(validarProgreso("brigada", a), true);
  // El archivo no lleva correos.
  const doc = await c.store.get<any>("juegos/progreso/brigada/a-marisol.json");
  assert(doc && !JSON.stringify(doc.data).includes("@"));
});

Deno.test("brigada: el ranking individual se topa en 1000 por misión", async () => {
  const c = ctx();
  const r = await c.call("POST", "/partida", "angel", { juego: "brigada", puntos: 5000, aciertos: 3, total: 0, segundos: 120 });
  assertEquals([r.status, r.body.puntos], [200, 1000], JSON.stringify(r.body));
});
