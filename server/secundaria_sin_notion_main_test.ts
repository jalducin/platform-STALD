// Secundaria sin Notion en server/main.ts (openspec: secundaria-sin-notion): con las bases de Notion borradas (sin
// NOTION_TOKEN y sin filas de Secundaria en el fixture), /perfil y /secundaria/actividades responden desde el registro
// alumnos.json y el contenido de Secundaria. Sin red: almacén en memoria (DATA_DIR), nunca tablas `stald_`.
// deno-lint-ignore-file no-explicit-any
import { assert, assertEquals } from "jsr:@std/assert@1";

const dir = await Deno.makeTempDir();
const fixture = dir + "/rows.json";
await Deno.writeTextFile(fixture, JSON.stringify({ cuentas: [] })); // sin clave «secundaria»: Notion ya no existe
const ALTA = "2026-09-01T00:00:00.000Z";
await Deno.mkdir(dir + "/datos/contenido/secundaria/semanas", { recursive: true });
await Deno.mkdir(dir + "/datos/contenido/secundaria/actividades", { recursive: true });
await Deno.writeTextFile(dir + "/datos/alumnos.json", JSON.stringify({
  "sofy@example.com": { nombre: "Sofy", alta: ALTA, origen: "notion", baja: "2026-10-21" }, // de baja de Inglés, sin marca
  "marisol@example.com": { nombre: "Marisol", alta: ALTA, origen: "notion" },
}));
await Deno.writeTextFile(dir + "/datos/contenido/secundaria/semanas/2026-10-19.json", JSON.stringify({ id: "2026-10-19", titulo: "Repasos", elementos: [{ id: "sec-repaso", tipo: "actividad", fecha: "2026-10-21" }] }));
const pregunta = (id: string) => ({ id, tema: "t", tipo: "opcion", enunciado: `¿${id}?`, opciones: ["a", "b"], correcta: 0, explicacion: "x" });
await Deno.writeTextFile(dir + "/datos/contenido/secundaria/actividades/sec-repaso.json", JSON.stringify({
  id: "sec-repaso", tipo: "actividad", titulo: "📗 Inglés · Repaso", disponibleDesde: "2026-10-19", fechaLimite: "2026-10-21", intentos: 2, preguntasPorIntento: 2,
  alumnos: ["sofia", "sofy"], temas: [{ id: "t", titulo: "t", retroalimentacion: { "fortaleza": "ok", "en-progreso": "casi", "debilidad": "repasa" } }],
  banco: [pregunta("p1"), pregunta("p2")],
}));
Deno.env.set("ROWS_FIXTURE", fixture);
Deno.env.set("DATA_DIR", dir + "/datos");
Deno.env.set("SUPER_ADMIN_EMAIL", "admin@example.com");
Deno.env.set("HOY_FIJO", "2026-10-21");
Deno.env.delete("NOTION_TOKEN");
const { handler } = await import("./main.ts");

async function pedir(ruta: string, quien: string | null) {
  const r = await handler(new Request("http://x" + ruta, { headers: quien ? { Authorization: "Bearer prueba:" + quien } : {} }));
  return { status: r.status, body: await r.json() as any };
}

Deno.test("sin Notion: Sofy (de baja de Inglés, con clases exclusivas) entra a Secundaria y el portal lo dice", async () => {
  const perfil = await pedir("/perfil", "sofy@example.com");
  assertEquals([perfil.status, perfil.body.accesos.secundaria, perfil.body.accesos.ingles, perfil.body.nombre], [200, true, false, "Sofy"]);
  const sec = await pedir("/secundaria/actividades", "sofy@example.com");
  assertEquals([sec.status, sec.body.items.map((i: any) => i.id)], [200, ["sec-repaso"]]);
});

Deno.test("sin Notion: quien no tiene Secundaria recibe 403 y su perfil sigue en 200", async () => {
  const perfil = await pedir("/perfil", "marisol@example.com");
  assertEquals([perfil.status, perfil.body.accesos.secundaria, perfil.body.accesos.ingles], [200, false, true]);
  assertEquals((await pedir("/secundaria/actividades", "marisol@example.com")).status, 403);
  assertEquals((await pedir("/perfil", "nadie@example.com")).status, 200);
});

Deno.test("sin Notion: el admin ve Secundaria con la lista de alumnas, sin correos", async () => {
  const r = await pedir("/secundaria/actividades", "admin@example.com");
  assertEquals([r.status, r.body.isAdmin, r.body.alumnas], [200, true, [{ nombre: "Sofy", slug: "sofy" }]]);
  assert(!JSON.stringify(r.body).includes("@example.com"));
  const vista = await pedir("/secundaria/actividades?alumna=sofy", "admin@example.com");
  assertEquals([vista.status, vista.body.vistaDe?.slug, vista.body.items.length], [200, "sofy", 1]);
});

Deno.test("sin Notion: Juegos sigue reconociendo a Sofy (a-sofy)", async () => {
  const r = await pedir("/juegos/yo", "sofy@example.com");
  assertEquals(r.status, 200);
  assertEquals(r.body.jugador?.id, "a-sofy");
});
