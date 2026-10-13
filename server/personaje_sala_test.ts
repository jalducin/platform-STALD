// Personaje en las salas de Karts y Axo (openspec: personaje-en-salas): el asiento guarda uno de los 8 personajes de
// juegos/personajes.js (la misma lista, sin copiarla) solo en salas de karts o plataformas y antes de empezar.
// deno-lint-ignore-file no-explicit-any
import { assertEquals } from "jsr:@std/assert@1";
import { clearCacheJuegos, handleJuegos } from "./juegos.ts";
import { clearCacheSalas } from "./salas.ts";
import { esPersonaje, PERSONAJES_IDS } from "./personajes.ts";
import { MemoryStore } from "./store.ts";

const NOMBRES = ["Marisol", "Angel", "Laura", "Fernando", "Jesus", "Valeria", "Sofia", "Diego", "Regina"];
const ingles = NOMBRES.map((n) => ({ alumno: n, userEmails: [n.toLowerCase() + "@example.com"], userNames: [n] }));
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s });

function ctx() {
  clearCacheJuegos();
  const store = new MemoryStore();
  const t = Date.parse("2026-09-30T18:00:00.000Z");
  const deps = {
    store, admin: "admin@example.com", filasIngles: () => Promise.resolve(ingles), filasSecundaria: () => Promise.resolve([]),
    hoy: () => "2026-09-30", ahora: () => new Date(t).toISOString(),
  };
  const call = async (method: string, sub: string, quien: string, body?: unknown) => {
    clearCacheSalas();
    const email = quien + "@example.com";
    const req = new Request(`http://x/juegos${sub}?email=${encodeURIComponent(email)}`, { method, body: body === undefined ? undefined : JSON.stringify(body) });
    const res = await handleJuegos(req, sub, email, deps, json);
    return { status: res.status, body: await res.json() };
  };
  return { call };
}
type Ctx = ReturnType<typeof ctx>;
async function sala(c: Ctx, juego: string, opciones: Record<string, unknown> = {}) {
  const r = await c.call("POST", "/sala", "marisol", { juego, bots: false, opciones });
  assertEquals(r.status, 200, JSON.stringify(r.body));
  return r.body.codigo as string;
}
const asiento = async (c: Ctx, codigo: string, quien: string) => (await c.call("GET", `/sala/${codigo}`, "marisol")).body.jugadores.find((j: any) => j.id === "a-" + quien);

Deno.test("personaje-en-salas: el servidor usa la misma lista de juegos/personajes.js", async () => {
  await import("../juegos/personajes.js");
  const P = (globalThis as any).Personajes;
  assertEquals([...PERSONAJES_IDS], P.LISTA.map((p: any) => p.id));
  assertEquals(PERSONAJES_IDS.length, 8);
  assertEquals(esPersonaje("tona"), true);
  for (const x of ["pikachu", "", null, 3, "XALLI", "__proto__", "constructor"]) assertEquals(esPersonaje(x), false, String(x));
});

async function guardaEnAsiento(juego: string) {
  const c = ctx();
  const codigo = await sala(c, juego);
  const r = await c.call("POST", `/sala/${codigo}/unirse`, "marisol", { personaje: "tona" });
  assertEquals([r.status, r.body.personaje], [200, "tona"], juego + " " + JSON.stringify(r.body));
  assertEquals((await asiento(c, codigo, "marisol")).personaje, "tona");
  await c.call("POST", `/sala/${codigo}/unirse`, "angel");
  assertEquals((await c.call("POST", `/sala/${codigo}/unirse`, "angel", { personaje: "kinich" })).status, 200);
  assertEquals((await asiento(c, codigo, "angel")).personaje, "kinich", "se ve en el estado de la sala");
  // Cambiar de opinión antes de empezar.
  assertEquals((await c.call("POST", `/sala/${codigo}/unirse`, "marisol", { personaje: "xolo" })).status, 200);
  assertEquals((await asiento(c, codigo, "marisol")).personaje, "xolo");
}
Deno.test("personaje-en-salas: el personaje se guarda en el asiento en Karts", () => guardaEnAsiento("karts"));
Deno.test("personaje-en-salas: el personaje se guarda en el asiento en Axo", () => guardaEnAsiento("plataformas"));

Deno.test("personaje-en-salas: id inválido o sala de otro juego → 400 personaje_invalido", async () => {
  const c = ctx();
  const codigo = await sala(c, "karts");
  const malos = ["pikachu", "", 7, null, { id: "xalli" }, "Xalli"];
  const rs = await Promise.all(malos.map((personaje) => c.call("POST", `/sala/${codigo}/unirse`, "marisol", { personaje })));
  assertEquals(rs.map((r) => [r.status, r.body.error]), malos.map(() => [400, "personaje_invalido"]));
  assertEquals((await asiento(c, codigo, "marisol")).personaje, undefined, "el asiento no cambia");
  const otro = await sala(c, "futbol");
  const r = await c.call("POST", `/sala/${otro}/unirse`, "marisol", { personaje: "itzae" });
  assertEquals([r.status, r.body.error], [400, "personaje_invalido"]);
});

Deno.test("personaje-en-salas: sala ya empezada → 409 ya_empezo", async () => {
  const c = ctx();
  const codigo = await sala(c, "karts");
  await c.call("POST", `/sala/${codigo}/unirse`, "angel", { personaje: "yahui" });
  assertEquals((await c.call("POST", `/sala/${codigo}/empezar`, "marisol")).status, 200);
  const r = await c.call("POST", `/sala/${codigo}/unirse`, "angel", { personaje: "itzae" });
  assertEquals([r.status, r.body.error], [409, "ya_empezo"]);
  assertEquals((await asiento(c, codigo, "angel")).personaje, "yahui", "se queda el de antes");
});

Deno.test("personaje-en-salas: quien no está en la sala entra con su personaje (o sala_llena)", async () => {
  const c = ctx();
  const codigo = await sala(c, "plataformas");
  const r = await c.call("POST", `/sala/${codigo}/unirse`, "laura", { personaje: "yahui" });
  assertEquals(r.status, 200, JSON.stringify(r.body));
  assertEquals((await asiento(c, codigo, "laura")).personaje, "yahui");
  // Sala llena: hasta 8 personas en Karts (MESAS.karts.max); la 9.ª no entra.
  const k = await sala(c, "karts");
  const entradas = await NOMBRES.slice(1, 8).reduce(async (antes, n) => [...await antes, (await c.call("POST", `/sala/${k}/unirse`, n.toLowerCase())).status], Promise.resolve([] as number[]));
  assertEquals(entradas, [200, 200, 200, 200, 200, 200, 200]);
  const lleno = await c.call("POST", `/sala/${k}/unirse`, "regina", { personaje: "itzae" });
  assertEquals([lleno.status, lleno.body.error], [409, "sala_llena"]);
});
