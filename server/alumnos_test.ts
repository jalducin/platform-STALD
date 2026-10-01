// Alta de alumnos y alumnas de Inglés desde la página (openspec: alta-alumnos), sin red.
// deno-lint-ignore-file no-explicit-any
import { assert, assertEquals } from "jsr:@std/assert@1";
import { aplicarAlumnos, clearCacheAlumnos, handleAlumnos, leerRegistro } from "./alumnos.ts";
import type { InglesRow } from "./rows.ts";
import { MemoryStore } from "./store.ts";

const ADMIN = "admin@example.com";
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s });
const fila = (alumno: string, emails: string[], id = "p-" + alumno): InglesRow => ({
  source: "clases_ingles", id, name: "Tarea de " + alumno, label: "", completado: false, fecha: null, alumno,
  calificacion: null, dificultad: null, editadoEn: null, userIds: [], userEmails: emails, userNames: emails.length ? [alumno] : [], url: "",
});
const notion = [fila("Marisol", ["marisol@example.com"]), fila("Pedro", [], "p-pedro")];

function ctx() {
  clearCacheAlumnos();
  const store = new MemoryStore();
  const call = async (method: string, sub: string, email: string, body?: unknown) => {
    const req = new Request(`http://x/ingles/alumnos${sub}`, { method, body: body === undefined ? undefined : JSON.stringify(body) });
    const res = await handleAlumnos(req, sub, { email, admin: ADMIN, store, filas: () => Promise.resolve(notion), ahora: () => "2026-09-30T23:00:00.000Z" }, json);
    return { status: res.status, body: await res.json() };
  };
  return { store, call };
}

Deno.test("alumnos: aplicarAlumnos une el correo a sus filas de Notion o crea una fila de identidad", () => {
  const reg = { "pedro@example.com": { nombre: "Pedro", alta: "x" }, "luz@example.com": { nombre: "Luz María", alta: "x" } };
  const filas = aplicarAlumnos(notion, reg);
  const pedro = filas.find((r) => r.id === "p-pedro")!;
  assertEquals([pedro.userEmails, pedro.userNames], [["pedro@example.com"], ["Pedro"]], "se une por el campo Nombre");
  const luz = filas.find((r) => r.alumno === "Luz María")!;
  assertEquals([luz.source, luz.userEmails, luz.name, luz.id], ["registro", ["luz@example.com"], "", "registro-luz-maria"]);
  assertEquals(filas.filter((r) => r.source === "registro").length, 1, "Pedro ya tenía filas: sin fila de identidad");
  assertEquals(notion[1].userEmails, [], "no muta las filas originales (caché de Notion)");
});

Deno.test("alumnos: el admin da de alta con nombre y correo", async () => {
  const { call, store } = ctx();
  const r = await call("POST", "", ADMIN, { nombre: "  Luz   María ", email: "Luz@Example.com " });
  assertEquals([r.status, r.body.alumno], [200, { email: "luz@example.com", nombre: "Luz María", alta: "2026-09-30T23:00:00.000Z" }]);
  assertEquals((await store.get<any>("alumnos.json"))!.data["luz@example.com"].nombre, "Luz María");
  assertEquals((await leerRegistro(store))["luz@example.com"].nombre, "Luz María", "la caché se actualiza");
  const l = await call("GET", "", ADMIN);
  assertEquals(l.body.alumnos.map((a: any) => [a.nombre, a.emails, a.origen]), [
    ["Luz María", ["luz@example.com"], "registro"], ["Marisol", ["marisol@example.com"], "notion"], ["Pedro", [], "notion"],
  ]);
});

Deno.test("alumnos: validaciones y duplicados", async () => {
  const { call } = ctx();
  const alta = (b: unknown) => call("POST", "", ADMIN, b);
  assertEquals((await alta({ nombre: "Luz", email: "no-es-correo" })).body.error, "correo_invalido");
  assertEquals((await alta({ nombre: "L", email: "l@example.com" })).body.error, "nombre_invalido");
  assertEquals((await alta({ nombre: "<script>", email: "l@example.com" })).body.error, "nombre_invalido");
  assertEquals((await alta({ nombre: "Otra", email: "marisol@example.com" })).body.error, "correo_en_uso", "ya está en Notion");
  assertEquals((await alta({ nombre: "Otra", email: ADMIN })).body.error, "correo_en_uso");
  const dup = await alta({ nombre: "marisol", email: "otra@example.com" });
  assertEquals([dup.status, dup.body.error], [409, "nombre_en_uso"], "Marisol ya tiene correo");
  assertEquals((await alta({ nombre: "Pedro", email: "pedro@example.com" })).status, 200, "Pedro está en Notion sin correo: se puede ligar");
  assertEquals((await alta({ nombre: "Pedro Dos", email: "pedro@example.com" })).body.error, "correo_en_uso");
});

Deno.test("alumnos: solo el admin; quitar solo los registrados", async () => {
  const { call } = ctx();
  assertEquals((await call("GET", "", "marisol@example.com")).status, 403);
  assertEquals((await call("POST", "", "marisol@example.com", { nombre: "Luz", email: "luz@example.com" })).status, 403);
  await call("POST", "", ADMIN, { nombre: "Luz", email: "luz@example.com" });
  assertEquals((await call("POST", "/quitar", "marisol@example.com", { email: "luz@example.com" })).status, 403);
  assertEquals((await call("POST", "/quitar", ADMIN, { email: "marisol@example.com" })).status, 404, "los de Notion se cambian en Notion");
  const q = await call("POST", "/quitar", ADMIN, { email: "LUZ@example.com" });
  assertEquals([q.status, q.body.ok], [200, true]);
  assert(!(await call("GET", "", ADMIN)).body.alumnos.some((a: any) => a.nombre === "Luz"));
});
