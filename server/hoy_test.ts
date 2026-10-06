// «Hoy» fijo para pruebas (openspec: pruebas-fecha-fija): HOY_FIJO solo vale con ROWS_FIXTURE.
import { assertEquals } from "jsr:@std/assert@1";
import { mxToday } from "./motor.ts";

function con(env: Record<string, string | undefined>, fn: () => void) {
  const antes = Object.fromEntries(Object.keys(env).map((k) => [k, Deno.env.get(k)]));
  for (const [k, v] of Object.entries(env)) v === undefined ? Deno.env.delete(k) : Deno.env.set(k, v);
  try { fn(); } finally { for (const [k, v] of Object.entries(antes)) v === undefined ? Deno.env.delete(k) : Deno.env.set(k, v); }
}
const real = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });

Deno.test("hoy: sin ROWS_FIXTURE, HOY_FIJO no tiene efecto (producción)", () => {
  con({ ROWS_FIXTURE: undefined, HOY_FIJO: "2026-10-04" }, () => assertEquals(mxToday(), real()));
});

Deno.test("hoy: con ROWS_FIXTURE, mxToday() da la fecha fija y mxToday(fecha) la real", () => {
  con({ ROWS_FIXTURE: "x.json", HOY_FIJO: "2026-10-04" }, () => {
    assertEquals(mxToday(), "2026-10-04");
    assertEquals(mxToday(new Date("2026-12-25T18:00:00Z")), "2026-12-25");
  });
});

Deno.test("hoy: un HOY_FIJO inválido se ignora", () => {
  con({ ROWS_FIXTURE: "x.json", HOY_FIJO: "4 de octubre" }, () => assertEquals(mxToday(), real()));
});

Deno.test("hoy: ahoraIso usa el día fijo en pruebas y la hora real sin él", async () => {
  const { ahoraIso } = await import("./motor.ts");
  con({ ROWS_FIXTURE: "x.json", HOY_FIJO: "2026-10-04" }, () => assertEquals(ahoraIso(), "2026-10-04T18:00:00.000Z"));
  con({ ROWS_FIXTURE: undefined, HOY_FIJO: "2026-10-04" }, () => assertEquals(ahoraIso().slice(0, 4), String(new Date().getUTCFullYear())));
});
