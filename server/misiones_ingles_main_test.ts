// /ingles/actividades → `misiones` (openspec: rpg-ingles-hero-card): misma identidad que /misiones. Quien está en
// Inglés y en Secundaria recibe en /misiones las de Secundaria, así que Inglés no le avisa. Sin red; personas inventadas.
// deno-lint-ignore-file no-explicit-any
import { assertEquals } from "jsr:@std/assert@1";
import { misionValida, mundosValidos } from "./test_misiones.ts";

const dir = await Deno.makeTempDir();
const fixture = dir + "/rows.json";
await Deno.writeTextFile(fixture, JSON.stringify({ ingles: [], secundaria: [] }));
const escribir = async (ruta: string, data: unknown) => {
  await Deno.mkdir(dir + "/datos/" + ruta.split("/").slice(0, -1).join("/"), { recursive: true });
  await Deno.writeTextFile(dir + "/datos/" + ruta, JSON.stringify(data));
};
await escribir("alumnos.json", {
  "dani@example.com": { nombre: "Dani Prueba", alta: "2026-09-01T00:00:00.000Z", origen: "registro", secundaria: true },
  "eva@example.com": { nombre: "Eva Prueba", alta: "2026-09-01T00:00:00.000Z", origen: "registro" },
  "fito@example.com": { nombre: "Fito Prueba", alta: "2026-09-01T00:00:00.000Z", origen: "registro" },
});
await escribir("contenido/secundaria/mundos.json", mundosValidos());
await escribir("contenido/ingles/misiones/mis-ingles-prueba.json", misionValida({ id: "mis-ingles-prueba", materia: "Inglés", mundo: "isla-del-alfabeto", disponibleDesde: "2026-10-26", alumnos: ["dani-prueba", "eva-prueba"] }));
Deno.env.set("ROWS_FIXTURE", fixture);
Deno.env.set("DATA_DIR", dir + "/datos");
Deno.env.set("SUPER_ADMIN_EMAIL", "admin@example.com");
Deno.env.set("HOY_FIJO", "2026-11-04");
Deno.env.set("LOGIN_TRANSICION_HASTA", "2026-01-01");
const { handler } = await import("./main.ts");

const pedir = async (ruta: string, quien: string) => {
  const r = await handler(new Request("http://x" + ruta, { headers: { Authorization: "Bearer prueba:" + quien } }));
  return { status: r.status, body: await r.json() };
};

Deno.test("main: /ingles/actividades avisa `misiones` con la misma identidad que /misiones", async () => {
  const eva = await pedir("/ingles/actividades", "eva@example.com");
  assertEquals([eva.status, eva.body.misiones], [200, true]);
  assertEquals((await pedir("/misiones", "eva@example.com")).body.misiones.map((m: any) => m.id), ["mis-ingles-prueba"]);
  // Inglés + Secundaria: /misiones la trata como de Secundaria → Inglés no avisa (evita mezclar misiones y XP)
  const dani = await pedir("/ingles/actividades", "dani@example.com");
  assertEquals([dani.status, dani.body.misiones], [200, undefined]);
  // Sin misiones asignadas
  assertEquals((await pedir("/ingles/actividades", "fito@example.com")).body.misiones, undefined);
});
