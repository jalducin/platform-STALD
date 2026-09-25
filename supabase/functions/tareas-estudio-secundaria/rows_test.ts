import { assertEquals } from "jsr:@std/assert@1";
import { attachUsers, extractInglesRow, filterForEmail, normalizeEmail } from "./rows.ts";

function inglesPage(overrides: Record<string, unknown> = {}) {
  return {
    url: "https://notion.so/x",
    properties: {
      "Name": { title: [{ plain_text: "Lesson 28" }] },
      "Módulo": { select: { name: "Fonetica 1B" } },
      "Tipo": { select: { name: "🖥️ Virtual QL" } },
      "Completado": { checkbox: false },
      "Fecha Entrega ": { date: { start: "2026-10-01" } },
      "Nombre": { select: { name: "Marisol" } },
      "Usuario": { people: [{ id: "u1" }] },
      ...overrides,
    },
  };
}

const users = new Map([
  ["u1", { email: "alumna@example.com", name: "Alumna" }],
  ["u2", { email: "otra@example.com", name: "Otra" }],
]);

Deno.test("extractInglesRow lee 'Fecha Entrega ' (con espacio) y 'Nombre'", () => {
  const row = extractInglesRow(inglesPage());
  assertEquals(row.fecha, "2026-10-01");
  assertEquals(row.alumno, "Marisol");
  assertEquals(row.label, "Fonetica 1B · 🖥️ Virtual QL");
});

Deno.test("extractInglesRow tolera propiedades vacías", () => {
  const row = extractInglesRow(inglesPage({ "Fecha Entrega ": { date: null }, "Nombre": { select: null }, "Tipo": { select: null } }));
  assertEquals(row.fecha, null);
  assertEquals(row.alumno, null);
  assertEquals(row.label, "Fonetica 1B");
});

Deno.test("alumna ve solo sus filas y sin correos", () => {
  const rows = attachUsers(
    [extractInglesRow(inglesPage()), extractInglesRow(inglesPage({ "Usuario": { people: [{ id: "u2" }] } }))],
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
  const rows = attachUsers([extractInglesRow(inglesPage()), extractInglesRow(inglesPage({ "Usuario": { people: [] } }))], users);
  const res = filterForEmail(rows, "admin@example.com", "admin@example.com");
  assertEquals(res.isAdmin, true);
  assertEquals(res.rows.length, 2);
});

Deno.test("sin admin configurado nadie es admin", () => {
  const rows = attachUsers([extractInglesRow(inglesPage())], users);
  const res = filterForEmail(rows, "", "");
  assertEquals(res.isAdmin, false);
  assertEquals(res.rows.length, 0);
});

Deno.test("normalizeEmail recorta y pasa a minúsculas", () => {
  assertEquals(normalizeEmail("  Alumna@Example.COM "), "alumna@example.com");
  assertEquals(normalizeEmail(null), "");
});
