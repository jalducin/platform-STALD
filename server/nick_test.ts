// Nick de jugador (openspec: nick-jugadores), con almacén en memoria y sin red.
// deno-lint-ignore-file no-explicit-any
import { assertEquals } from "jsr:@std/assert@1";
import { clearCacheJuegos, handleJuegos } from "./juegos.ts";
import { MemoryStore } from "./store.ts";

const ADMIN = "admin@example.com";
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s });
const ingles = [{ alumno: "Marisol", userEmails: ["marisol@example.com"], userNames: ["Marisol"] }];

function ctx() {
  clearCacheJuegos();
  const store = new MemoryStore();
  const deps = { store, admin: ADMIN, filasIngles: () => Promise.resolve(ingles), filasSecundaria: () => Promise.resolve([]),
    hoy: () => "2026-10-06", ahora: () => "2026-10-06T12:00:00.000Z", cuentas: () => Promise.resolve([]) };
  const call = async (method: string, sub: string, email: string, body?: unknown) => {
    const req = new Request(`http://x/juegos${sub}?email=${encodeURIComponent(email)}`, { method, body: body === undefined ? undefined : JSON.stringify(body) });
    const res = await handleJuegos(req, sub, email, deps as any, json);
    return { status: res.status, body: await res.json() };
  };
  return { store, call };
}

Deno.test("nick: ponerlo cambia el nombre en Juegos y conserva el real", async () => {
  const { store, call } = ctx();
  const r = await call("POST", "/nick", "marisol@example.com", { nick: "  Mari   Star " });
  assertEquals([r.status, r.body.jugador.nombre, r.body.jugador.nombreReal], [200, "Mari Star", "Marisol"]);
  assertEquals((await store.get<any>("juegos/nicks.json"))!.data, { "a-marisol": "Mari Star" });
  const yo = await call("GET", "/yo", "marisol@example.com");
  assertEquals([yo.body.jugador.nombre, yo.body.jugador.nombreReal], ["Mari Star", "Marisol"]);
});

Deno.test("nick: el ranking lo usa tras una partida y al cambiarlo; quitarlo vuelve al nombre", async () => {
  const { call } = ctx();
  await call("POST", "/partida", "marisol@example.com", { juego: "en-vocab", puntos: 50, aciertos: 5, total: 10, segundos: 60 });
  await call("POST", "/nick", "marisol@example.com", { nick: "Mari" });
  let rank = await call("GET", "/ranking", "marisol@example.com");
  assertEquals(rank.body.top.map((j: any) => j.nombre), ["Mari"]);
  await call("POST", "/nick", "marisol@example.com", { nick: "" });
  rank = await call("GET", "/ranking", "marisol@example.com");
  assertEquals(rank.body.top.map((j: any) => j.nombre), ["Marisol"]);
  assertEquals((await call("GET", "/yo", "marisol@example.com")).body.jugador.nombreReal, undefined);
});

Deno.test("nick: inválido → 400; el admin lo ve en Jugadores", async () => {
  const { call } = ctx();
  assertEquals((await call("POST", "/nick", "marisol@example.com", { nick: "x" })).body.error, "nick_invalido");
  assertEquals((await call("POST", "/nick", "marisol@example.com", { nick: "<b>hola</b>" })).status, 400);
  await call("POST", "/nick", "marisol@example.com", { nick: "Mari" });
  const a = await call("GET", "/jugadores", ADMIN);
  assertEquals(a.body.jugadores.map((j: any) => [j.nombre, j.nick]), [["Marisol", "Mari"]]);
});
