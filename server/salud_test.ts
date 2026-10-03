// /salud: estado del límite de GitHub y del repo de datos (openspec: vigilancia-servidor). Sin red.
// deno-lint-ignore-file no-explicit-any
import { assertEquals } from "jsr:@std/assert@1";
import { revisarSalud } from "./salud.ts";

const rate = (remaining: number, limit = 5000) => (async () =>
  new Response(JSON.stringify({ resources: { core: { limit, used: limit - remaining, remaining, reset: 1790999999 } } }), { status: 200 })) as typeof fetch;
const store = (falla?: string) => ({ list: () => falla ? Promise.reject(new Error(falla)) : Promise.resolve(["2026-09-28.json"]) }) as any;

Deno.test("salud: ok con los números del límite y la hora de reinicio", async () => {
  const r = await revisarSalud({ token: "secreto", store: store(), fetch: rate(4200) });
  assertEquals([r.ok, r.estado, r.github!.restantes, r.github!.usadas, r.github!.limite], [true, "ok", 4200, 800, 5000]);
  assertEquals(r.github!.reinicio, new Date(1790999999 * 1000).toISOString());
  assertEquals(JSON.stringify(r).includes("secreto"), false, "nunca expone el token");
});

Deno.test("salud: advertencia con menos del 10 % y bloqueado con 0 o si el repo no responde", async () => {
  assertEquals((await revisarSalud({ token: "t", store: store(), fetch: rate(499) })).estado, "advertencia");
  const b = await revisarSalud({ token: "t", store: store(), fetch: rate(0) });
  assertEquals([b.ok, b.estado], [false, "bloqueado"]);
  const c = await revisarSalud({ token: "t", store: store("github_rate_limit"), fetch: rate(3000) });
  assertEquals([c.ok, c.estado, c.motivo], [false, "bloqueado", "github_rate_limit"]);
});

Deno.test("salud: si no se puede consultar el límite, decide por el repo", async () => {
  const caido = (async () => { throw new Error("red"); }) as typeof fetch;
  assertEquals((await revisarSalud({ token: "t", store: store(), fetch: caido })).estado, "ok");
  assertEquals((await revisarSalud({ token: "t", store: store("github_get_500"), fetch: caido })).estado, "bloqueado");
});
