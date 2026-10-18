// Sala de «🦎 Brigada Xalli» (openspec: brigada-xalli, design.md §12): de 1 a 8 personas, sin bots o con compañeros IA
// hasta 4 asientos, mesa igual en servidor y página, misión de la sala, personaje por asiento, resultado validado con
// plausibilidad (una vez por persona), estado confirmado/disputa/anfitrión/invitado y puntos de ranking del servidor.
// deno-lint-ignore-file no-explicit-any
import { assertEquals } from "jsr:@std/assert@1";
import { clearCacheJuegos, handleJuegos } from "./juegos.ts";
import { clearCacheSalas, enMesa, mesaDe } from "./salas.ts";
import { MemoryStore } from "./store.ts";
import "../juegos/mesas.js";
import "../juegos/brigada-misiones.js";
import "../juegos/brigada-motor.js";

const g = globalThis as any;
const Mesas = g.Mesas, BM = g.BrigadaMotor;
const NOMBRES = ["Marisol", "Angel", "Laura", "Fernando", "Jesus", "Sofia", "Ximena", "Diego", "Paola"];
const ingles = NOMBRES.map((n) => ({ alumno: n, userEmails: [n.toLowerCase() + "@example.com"], userNames: [n] }));
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s });
function ctx() {
  clearCacheJuegos();
  const store = new MemoryStore();
  let t = Date.parse("2026-10-17T18:00:00.000Z");
  const deps = { store, admin: "admin@example.com", filasIngles: () => Promise.resolve(ingles), filasSecundaria: () => Promise.resolve([]), hoy: () => "2026-10-17", ahora: () => new Date(t).toISOString() };
  const call = async (method: string, sub: string, quien: string, body?: unknown) => {
    clearCacheSalas();
    const email = quien.toLowerCase() + "@example.com";
    const req = new Request(`http://x/juegos${sub}?email=${encodeURIComponent(email)}`, { method, body: body === undefined ? undefined : JSON.stringify(body) });
    const res = await handleJuegos(req, sub, email, deps, json);
    return { status: res.status, body: await res.json() };
  };
  return { call, avanzar: (ms: number) => { t += ms; } };
}
type Ctx = ReturnType<typeof ctx>;
async function crear(c: Ctx, opciones: Record<string, unknown>, bots = false) {
  const r = await c.call("POST", "/sala", "marisol", { juego: "brigada", opciones, bots });
  assertEquals(r.status, 200, JSON.stringify(r.body));
  return r.body.codigo as string;
}
const unirse = (c: Ctx, codigo: string, quien: string, body?: unknown) => c.call("POST", `/sala/${codigo}/unirse`, quien, body);
async function entranEnOrden(c: Ctx, codigo: string, quienes: string[]) {
  for (const q of quienes) await unirse(c, codigo, q); // NOSONAR: en orden (el orden de entrada importa en la mesa)
}
const reportar = (c: Ctx, codigo: string, quien: string, brigada: unknown) => c.call("POST", `/sala/${codigo}/respuesta`, quien, { brigada });

Deno.test("brigada-sala: misión de la sala, mesa de 1 a 8 sin bots y con compañeros IA hasta 4 asientos", async () => {
  const c = ctx();
  const codigo = await crear(c, {});
  const s = await c.call("GET", `/sala/${codigo}`, "marisol");
  assertEquals(s.body.sala.opciones.mision, "1");
  assertEquals((await c.call("POST", "/sala", "marisol", { juego: "brigada", opciones: { mision: "9" }, bots: false })).body.error, "mision_invalida");
  assertEquals([mesaDe("brigada")!.max, mesaDe("brigada")!.asientos, Mesas.de("brigada").max], [8, 4, 8]);
  assertEquals([enMesa("brigada", 1, true), enMesa("brigada", 2, true), enMesa("brigada", 6, true), enMesa("brigada", 3, false)], [4, 4, 6, 3]);
  await entranEnOrden(c, codigo, NOMBRES.slice(1, 8));
  const lleno = await unirse(c, codigo, "paola");
  assertEquals([lleno.status, lleno.body.error], [409, "sala_llena"]);
  // Personaje por asiento (como Karts y Axo).
  const p = await unirse(c, codigo, "laura", { personaje: "kinich" });
  assertEquals([p.status, p.body.personaje], [200, "kinich"]);
});

Deno.test("brigada-sala: resultado validado, confirmado, en disputa e imposible; ranking del servidor", async () => {
  const c = ctx();
  const codigo = await crear(c, { mision: "2" });
  await entranEnOrden(c, codigo, ["angel", "laura"]);
  const s0 = (await c.call("GET", `/sala/${codigo}`, "marisol")).body, id = (n: string) => s0.jugadores.find((j: any) => j.nombre === n).id;
  const antes = await reportar(c, codigo, "marisol", { mision: 2, ms: 90_000, completada: true, puntos: {} });
  assertEquals(antes.body.error, "no_empezo");
  await c.call("POST", `/sala/${codigo}/empezar`, "marisol");
  c.avanzar(180_000);
  const puntos = { [id("Marisol")]: 9000, [id("Angel")]: 7000, [id("Laura")]: 4000 };
  const malos = [
    { mision: 3, ms: 170_000, completada: true, puntos }, // otra misión
    { mision: 2, ms: 10_000, completada: true, puntos }, // muy corto
    { mision: 2, ms: 600_000, completada: true, puntos }, // más largo que lo transcurrido
    { mision: 2, ms: 170_000, completada: true, puntos: { [id("Marisol")]: BM.puntosMaximos(2, 3) + 1 } }, // imposible
    { mision: 2, ms: 170_000, completada: true, puntos: { "intruso": 10 } }, // alguien que no está en la mesa
  ];
  for (const m of malos) { const r = await reportar(c, codigo, "angel", m); assertEquals([r.status, r.body.error], [400, "resultado_invalido"], JSON.stringify(m)); } // NOSONAR: en orden
  // Sin reportes: el ranking de la sala espera.
  const pend = await c.call("POST", "/partida", "laura", { juego: "brigada", puntos: 1000, sala: codigo });
  assertEquals([pend.status, pend.body.error], [409, "resultado_pendiente"]);
  const r1 = await reportar(c, codigo, "marisol", { mision: 2, ms: 170_000, completada: true, puntos });
  assertEquals([r1.status, r1.body.brigada.estado, r1.body.brigada.equipo], [200, "anfitrion", 20_000], JSON.stringify(r1.body));
  const r2 = await reportar(c, codigo, "angel", { mision: 2, ms: 169_000, completada: true, puntos });
  assertEquals(r2.body.brigada.estado, "anfitrion", "falta Laura");
  const r3 = await reportar(c, codigo, "laura", { mision: 2, ms: 171_000, completada: true, puntos });
  assertEquals([r3.body.brigada.estado, r3.body.brigada.ranking[id("Laura")]], ["confirmado", 200]);
  // Solo el primer reporte de cada quien cuenta.
  const otra = await reportar(c, codigo, "laura", { mision: 2, ms: 172_000, completada: true, puntos: { ...puntos, [id("Laura")]: 1 } });
  assertEquals(otra.body.brigada.estado, "confirmado");
  // Ranking de la sala: los puntos del servidor (no los que manda la página).
  const rk = await c.call("POST", "/partida", "angel", { juego: "brigada", puntos: 1000, sala: codigo });
  assertEquals([rk.status, rk.body.puntos], [200, 350], JSON.stringify(rk.body));
});

Deno.test("brigada-sala: si los reportes no coinciden cuenta el del anfitrión (disputa); sin anfitrión, el del invitado", async () => {
  const c = ctx();
  const codigo = await crear(c, { mision: "1" });
  await unirse(c, codigo, "angel");
  const s0 = (await c.call("GET", `/sala/${codigo}`, "marisol")).body, id = (n: string) => s0.jugadores.find((j: any) => j.nombre === n).id;
  await c.call("POST", `/sala/${codigo}/empezar`, "marisol");
  c.avanzar(100_000);
  const inv = await reportar(c, codigo, "angel", { mision: 1, ms: 90_000, completada: false, corte: true, puntos: { [id("Marisol")]: 100, [id("Angel")]: 2000 } });
  assertEquals([inv.body.brigada.estado, inv.body.brigada.puntos[id("Angel")]], ["invitado", 2000]);
  const anf = await reportar(c, codigo, "marisol", { mision: 1, ms: 95_000, completada: true, puntos: { [id("Marisol")]: 5000, [id("Angel")]: 3000 } });
  assertEquals([anf.body.brigada.estado, anf.body.brigada.puntos[id("Angel")]], ["disputa", 3000]);
});
