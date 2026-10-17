// Servidor de «⚽ Futbolito Arena» (openspec: futbolito-arena, design.md §6 y §9): catálogo, sala por formato (1v1,
// 1v2, 2v2 y 3v3) con mesa igual a la de la página, equipo y robot en la sala de espera, resultado validado (una vez
// por persona), estado confirmado/disputa/invitado y puntos de ranking que salen del servidor.
// deno-lint-ignore-file no-explicit-any
import { assert, assertEquals } from "jsr:@std/assert@1";
import { CATALOGO, clearCacheJuegos, handleJuegos } from "./juegos.ts";
import { clearCacheSalas, enMesa, mesaDe } from "./salas.ts";
import { MemoryStore } from "./store.ts";
import "../juegos/mesas.js";

const Mesas = (globalThis as any).Mesas;
const ingles = ["Marisol", "Angel", "Laura", "Fernando", "Jesus", "Sofia", "Ximena"].map((n) => ({ alumno: n, userEmails: [n.toLowerCase() + "@example.com"], userNames: [n] }));
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
async function crear(c: Ctx, opciones: Record<string, unknown>, bots = true) {
  const r = await c.call("POST", "/sala", "marisol", { juego: "futbolito-arena", opciones, bots });
  assertEquals(r.status, 200, JSON.stringify(r.body));
  return r.body;
}
const unirse = (c: Ctx, codigo: string, quien: string, body?: unknown) => c.call("POST", `/sala/${codigo}/unirse`, quien, body);
const empezar = async (c: Ctx, codigo: string) => { const r = await c.call("POST", `/sala/${codigo}/empezar`, "marisol"); c.avanzar(6000); return r; };
const reportar = (c: Ctx, codigo: string, quien: string, goles: unknown, ms = 90_000) => c.call("POST", `/sala/${codigo}/respuesta`, quien, { arena: { goles, ms } });

Deno.test("futbolito-arena: en el catálogo de Arcade con tope 1000 (id nuevo, Futbolito se conserva)", () => {
  assertEquals(CATALOGO["futbolito-arena"], { categoria: "arcade", titulo: "Futbolito Arena", max: 1000 });
  assertEquals(CATALOGO["futbolito"].titulo, "Futbolito");
});

Deno.test("futbolito-arena: opciones de la sala (2v2 por omisión, 3v3 grande) y mesa igual en servidor y página", async () => {
  const c = ctx();
  assertEquals((await crear(c, {})).sala.opciones, { formato: "2v2", arena: "normal", goles: "5" });
  assertEquals((await crear(c, { formato: "3v3", arena: "normal", goles: "7" })).sala.opciones, { formato: "3v3", arena: "grande", goles: "7" });
  assertEquals((await crear(c, { formato: "1v2", arena: "grande", goles: "3" })).sala.opciones, { formato: "1v2", arena: "grande", goles: "3" });
  for (const [op, err] of [[{ formato: "4v4" }, "formato_invalido"], [{ arena: "luna" }, "arena_invalida"], [{ goles: "10" }, "goles_invalidos"]] as const) {
    const r = await c.call("POST", "/sala", "marisol", { juego: "futbolito-arena", opciones: op, bots: true });
    assertEquals([r.status, r.body.error], [400, err]);
  }
  assertEquals([mesaDe("futbolito-arena", { formato: "1v1" })!.asientos, mesaDe("futbolito-arena", { formato: "1v2" })!.asientos, mesaDe("futbolito-arena", { formato: "2v2" })!.asientos, mesaDe("futbolito-arena", { formato: "3v3" })!.max], [2, 3, 4, 6]);
  assertEquals(Mesas.de("futbolito-arena", { formato: "3v3" }).max, 6);
  assertEquals([enMesa("futbolito-arena", 1, true, { formato: "2v2" }), enMesa("futbolito-arena", 2, false, { formato: "2v2" })], [4, 2]);
  assertEquals(Mesas.textoMesa("futbolito-arena", 2, 2, { formato: "2v2" }), "Mesa de 4 · 2 personas + 2 bots");
});

Deno.test("futbolito-arena: cupo por formato, con bots empieza con 1 y sin bots con 2", async () => {
  const c = ctx();
  const { codigo } = await crear(c, { formato: "2v2" }, false);
  for (const q of ["angel", "laura", "fernando"]) assertEquals((await unirse(c, codigo, q)).status, 200, q);
  assertEquals((await unirse(c, codigo, "jesus")).body.error, "sala_llena");
  const tres = (await crear(c, { formato: "3v3" }, false)).codigo;
  for (const q of ["angel", "laura", "fernando", "jesus", "sofia"]) assertEquals((await unirse(c, tres, q)).status, 200, q);
  assertEquals((await unirse(c, tres, "ximena")).body.error, "sala_llena");
  const sola = (await crear(c, { formato: "2v2" }, false)).codigo;
  assertEquals((await empezar(c, sola)).body.error, "faltan_jugadores");
  const conBots = (await crear(c, { formato: "2v2" }, true)).codigo;
  assertEquals((await empezar(c, conBots)).status, 200, "1 persona + 3 bots");
});

Deno.test("futbolito-arena: equipo y robot en la sala de espera (lleno, inválidos, ya empezó)", async () => {
  const c = ctx();
  const { codigo } = await crear(c, { formato: "2v2" });
  await unirse(c, codigo, "angel");
  const r = await unirse(c, codigo, "angel", { equipo: 0 });
  assertEquals([r.status, r.body.equipo], [200, 0]);
  await unirse(c, codigo, "laura", { equipo: 0 });
  const lleno = await unirse(c, codigo, "marisol", { equipo: 0 });
  assertEquals([lleno.status, lleno.body.error], [409, "equipo_lleno"]);
  assertEquals((await unirse(c, codigo, "angel", { equipo: 3 })).body.error, "equipo_invalido");
  const robot = await unirse(c, codigo, "angel", { robot: 2 });
  assertEquals([robot.status, robot.body.robot], [200, 2]);
  assertEquals((await unirse(c, codigo, "angel", { robot: 5 })).body.error, "robot_invalido");
  const sala = await c.call("GET", `/sala/${codigo}`, "marisol");
  const angel = sala.body.jugadores.find((j: any) => j.nombre === "Angel");
  assertEquals([angel.equipo, angel.robot], [0, 2]);
  // El robot no sirve en otros juegos.
  const kart = await c.call("POST", "/sala", "marisol", { juego: "golf", opciones: {}, bots: false });
  assertEquals((await unirse(c, kart.body.codigo, "marisol", { robot: 1 })).body.error, "robot_invalido");
  await empezar(c, codigo);
  assertEquals((await unirse(c, codigo, "angel", { equipo: 1 })).body.error, "ya_empezo");
  assertEquals((await unirse(c, codigo, "angel", { robot: 1 })).body.error, "ya_empezo");
});

Deno.test("futbolito-arena: resultado validado, una vez por persona, confirmado o en disputa y puntos del servidor", async () => {
  const c = ctx();
  const { codigo } = await crear(c, { formato: "2v2", goles: "5" });
  await unirse(c, codigo, "angel"); await unirse(c, codigo, "laura");
  // Reparto: Marisol 🌊 (0), Angel 🔥 (1), Laura 🌊 (0), bot 🔥.
  const antes = await reportar(c, codigo, "marisol", [3, 2]);
  assertEquals([antes.status, antes.body.error], [409, "no_empezo"]);
  await empezar(c, codigo);
  c.avanzar(100_000);
  const pend = await c.call("POST", "/partida", "marisol", { juego: "futbolito-arena", puntos: 999, sala: codigo });
  assertEquals([pend.status, pend.body.error], [409, "resultado_pendiente"]);
  for (const g of [[9, 0], [6, 0], [1, "2"], [5, 5, 1]]) assertEquals((await reportar(c, codigo, "marisol", g)).body.error, "resultado_invalido", JSON.stringify(g));
  assertEquals((await reportar(c, codigo, "marisol", [3, 2], 400_000)).body.error, "resultado_invalido", "más largo que la sala");
  const r1 = await reportar(c, codigo, "marisol", [3, 2]);
  assertEquals([r1.status, r1.body.arena.estado, r1.body.arena.goles], [200, "anfitrion", [3, 2]]);
  const r2 = await reportar(c, codigo, "angel", [3, 2]);
  assertEquals(r2.body.arena.estado, "confirmado");
  const id = Object.fromEntries((await c.call("GET", `/sala/${codigo}`, "marisol")).body.jugadores.map((j: any) => [j.nombre, j.id]));
  assertEquals(r2.body.arena.puntos, { [id.Marisol]: 440, [id.Angel]: 100, [id.Laura]: 440 });
  const r3 = await reportar(c, codigo, "laura", [2, 2]);
  assertEquals([r3.body.arena.estado, r3.body.arena.goles], ["disputa", [3, 2]], "cuenta el del anfitrión");
  await reportar(c, codigo, "marisol", [0, 5]); // el segundo reporte no cambia nada
  const sala = await c.call("GET", `/sala/${codigo}`, "angel");
  assertEquals(sala.body.arena.goles, [3, 2]);
  // Ranking: los puntos los pone el servidor (no los de la página).
  const pm = await c.call("POST", "/partida", "marisol", { juego: "futbolito-arena", puntos: 999, sala: codigo });
  assertEquals([pm.status, pm.body.puntos], [200, 440]);
  const pa = await c.call("POST", "/partida", "angel", { juego: "futbolito-arena", puntos: 999, sala: codigo });
  assertEquals(pa.body.puntos, 100);
  assert(sala.body.arena.puntos);
});

Deno.test("futbolito-arena: si el anfitrión no reporta, cuenta el del invitado", async () => {
  const c = ctx();
  const { codigo } = await crear(c, { formato: "1v1" }, false);
  await unirse(c, codigo, "angel");
  await empezar(c, codigo);
  c.avanzar(60_000);
  const r = await c.call("POST", `/sala/${codigo}/respuesta`, "angel", { arena: { goles: [0, 2], ms: 50_000, corte: true } });
  assertEquals([r.body.arena.estado, r.body.arena.goles], ["invitado", [0, 2]]);
});
