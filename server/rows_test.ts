import { assertEquals } from "jsr:@std/assert@1";
import { attachUsers, extractSecundariaRow, filterForEmail, normalizeEmail } from "./rows.ts";

// Página de la base «📖 Clases» (Secundaria). Inglés ya no lee Notion (openspec: cierre-tecnico, fase 2).
function secundariaPage(overrides: Record<string, unknown> = {}) {
  return {
    url: "https://notion.so/x",
    properties: {
      "Name": { title: [{ plain_text: "Lunes - Matemáticas" }] },
      "Completado": { checkbox: false },
      "Fecha entrega": { date: { start: "2026-10-01" } },
      "Usuario": { people: [{ id: "u1" }] },
      ...overrides,
    },
  };
}

const users = new Map([
  ["u1", { email: "alumna@example.com", name: "Alumna" }],
  ["u2", { email: "otra@example.com", name: "Otra" }],
]);

Deno.test("alumna ve solo sus filas y sin correos", () => {
  const rows = attachUsers(
    [extractSecundariaRow(secundariaPage()), extractSecundariaRow(secundariaPage({ "Usuario": { people: [{ id: "u2" }] } }))],
    users,
  );
  const res = filterForEmail(rows, "alumna@example.com", "admin@example.com");
  assertEquals(res.isAdmin, false);
  assertEquals(res.rows.length, 1);
  assertEquals("userEmails" in res.rows[0], false);
  assertEquals("userIds" in res.rows[0], false);
  assertEquals((res.rows[0] as { userNames: string[] }).userNames, ["Alumna"]);
});

Deno.test("admin ve todo", () => {
  const rows = attachUsers([extractSecundariaRow(secundariaPage()), extractSecundariaRow(secundariaPage({ "Usuario": { people: [] } }))], users);
  const res = filterForEmail(rows, "admin@example.com", "admin@example.com");
  assertEquals(res.isAdmin, true);
  assertEquals(res.rows.length, 2);
});

Deno.test("sin admin configurado nadie es admin", () => {
  const rows = attachUsers([extractSecundariaRow(secundariaPage())], users);
  const res = filterForEmail(rows, "", "");
  assertEquals(res.isAdmin, false);
  assertEquals(res.rows.length, 0);
});

Deno.test("normalizeEmail recorta y pasa a minúsculas", () => {
  assertEquals(normalizeEmail("  Alumna@Example.COM "), "alumna@example.com");
  assertEquals(normalizeEmail(null), "");
});

Deno.test("título: se lee de la propiedad de tipo title aunque no se llame 'Name'", () => {
  const page = secundariaPage({ "": { type: "title", title: [{ plain_text: "Lunes - " }, { plain_text: "Matemáticas" }] } });
  delete (page.properties as Record<string, unknown>)["Name"];
  assertEquals(extractSecundariaRow(page).name, "Lunes - Matemáticas");
  assertEquals(extractSecundariaRow(secundariaPage({ "Name": { type: "title", title: [] } })).name, "(sin título)");
});
