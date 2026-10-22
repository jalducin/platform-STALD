// Rutas de misiones en server/main.ts (openspec: rpg-fase2-misiones): identidad por fila de la matriz (admin, alumna
// de Secundaria, alumno de Inglés, de baja, correo no asignado, sin sesión) y teoría publicada sin respuestas.
// Sin red: fixture, copia temporal de datos en memoria (DATA_DIR) y personas inventadas.
// deno-lint-ignore-file no-explicit-any
import { assert, assertEquals } from "jsr:@std/assert@1";
import { misionValida, mundosValidos } from "./test_misiones.ts";

const dir = await Deno.makeTempDir();
const fixture = dir + "/rows.json";
await Deno.writeTextFile(fixture, JSON.stringify({ ingles: [], secundaria: [] }));
const escribir = async (ruta: string, data: unknown) => {
  await Deno.mkdir(dir + "/datos/" + ruta.split("/").slice(0, -1).join("/"), { recursive: true });
  await Deno.writeTextFile(dir + "/datos/" + ruta, JSON.stringify(data));
};
await escribir("alumnos.json", {
  "ana@example.com": { nombre: "Ana Prueba", alta: "2026-09-01T00:00:00.000Z", origen: "registro", secundaria: true, baja: "2026-10-01" },
  "beto@example.com": { nombre: "Beto Prueba", alta: "2026-09-01T00:00:00.000Z", origen: "registro" },
  "ciro@example.com": { nombre: "Ciro Prueba", alta: "2026-09-01T00:00:00.000Z", origen: "registro", baja: "2026-10-10" },
});
await escribir("contenido/secundaria/mundos.json", mundosValidos());
await escribir("contenido/secundaria/misiones/mis-mate-valle-de-los-numeros.json", misionValida());
await escribir("contenido/secundaria/semanas/2026-11-02.json", { id: "2026-11-02", titulo: "S", elementos: [{ id: "mate-1", tipo: "actividad", fecha: "2026-11-03" }] });
await escribir("contenido/secundaria/actividades/mate-1.json", {
  id: "mate-1", tipo: "actividad", titulo: "📐 Matemáticas · Porcentajes", materia: "Matemáticas", disponibleDesde: "2026-11-02", fechaLimite: "2026-11-03", intentos: 2, preguntasPorIntento: 1,
  temas: [{ id: "t", titulo: "Porcentajes", retroalimentacion: { fortaleza: "a", "en-progreso": "b", debilidad: "c" } }],
  teoria: [{ titulo: "T", texto: "x", practica: [{ id: "p-a", pregunta: "¿25 % de 80?", aceptadas: ["20"], pista: "Divide entre 4." }] }], tips: [],
  banco: [{ id: "e1", tema: "t", tipo: "opcion", enunciado: "¿?", opciones: ["a", "b"], correcta: 0, explicacion: "x" }],
});
Deno.env.set("ROWS_FIXTURE", fixture);
Deno.env.set("DATA_DIR", dir + "/datos");
Deno.env.set("SUPER_ADMIN_EMAIL", "admin@example.com");
Deno.env.set("HOY_FIJO", "2026-11-04");
Deno.env.set("LOGIN_TRANSICION_HASTA", "2026-01-01");
const { handler } = await import("./main.ts");

const pedir = async (ruta: string, quien?: string, body?: unknown) => {
  const headers: Record<string, string> = quien ? { Authorization: "Bearer prueba:" + quien } : {};
  if (body !== undefined) headers["content-type"] = "application/json";
  const r = await handler(new Request("http://x" + ruta, { method: body === undefined ? "GET" : "POST", headers, body: body === undefined ? undefined : JSON.stringify(body) }));
  return { status: r.status, body: await r.json() };
};

Deno.test("main: matriz de /misiones por persona", async () => {
  assertEquals((await pedir("/misiones")).status, 401);
  const alumna = await pedir("/misiones", "ana@example.com"); // de baja de Inglés, pero con Secundaria
  assertEquals([alumna.status, alumna.body.misiones.length], [200, 1]);
  const admin = await pedir("/misiones", "admin@example.com");
  assertEquals([admin.status, admin.body.isAdmin, admin.body.misiones.length], [200, true, 1]);
  assertEquals((await pedir("/misiones", "beto@example.com")).body.misiones, []); // Inglés: sin misiones de su grupo
  assertEquals((await pedir("/misiones", "ciro@example.com")).body.soloLectura, true);
  assertEquals((await pedir("/misiones", "nadie@example.com")).status, 403);
  const todo = JSON.stringify([alumna.body, admin.body]);
  assert(!todo.includes("@example.com"), "sin correos en las respuestas");
});

Deno.test("main: entrega y bandeja por persona; sin sesión 401", async () => {
  const ruta = "/misiones/mis-mate-valle-de-los-numeros/entrega";
  assertEquals((await pedir(ruta, undefined, { paso: "p1", texto: "hola" })).status, 401);
  assertEquals((await pedir(ruta, "beto@example.com", { paso: "p1", texto: "hola" })).status, 404);
  assertEquals((await pedir(ruta, "ciro@example.com", { paso: "p1", texto: "hola" })).status, 403);
  assertEquals((await pedir(ruta, "nadie@example.com", { paso: "p1", texto: "hola" })).status, 403);
  assertEquals((await pedir(ruta, "admin@example.com", { paso: "p1", texto: "hola" })).status, 403);
  const ok = await pedir(ruta, "ana@example.com", { paso: "p1", texto: "Mi primer paso" });
  assertEquals([ok.status, ok.body.ok], [200, true]);
  const bandeja = await pedir("/profe/entregas", "admin@example.com");
  assertEquals([bandeja.status, bandeja.body.entregas[0].nombre, bandeja.body.entregas[0].estado], [200, "Ana", "en-progreso"]);
  assertEquals((await pedir("/profe/entregas", "ana@example.com")).status, 403);
  assertEquals((await pedir("/profe/entregas")).status, 401);
});

Deno.test("main: la teoría de la clase llega sin la respuesta y /practica/comprobar la revisa", async () => {
  const clase = await pedir("/secundaria/actividades/mate-1", "ana@example.com");
  assertEquals(clase.status, 200);
  const q = clase.body.teoria[0].practica[0];
  assertEquals([q.id, "aceptadas" in q], ["p-a", false]);
  assert(!JSON.stringify(clase.body.teoria).includes("aceptadas"));
  const lista = await pedir("/secundaria/actividades", "ana@example.com");
  assertEquals(lista.body.items.find((x: any) => x.id === "mate-1").temas, ["Porcentajes"]);
  assertEquals((await pedir("/practica/comprobar", "ana@example.com", { itemId: "mate-1", practicaId: "p-a", respuesta: "20" })).body, { correcta: true, pista: null });
  assertEquals((await pedir("/practica/comprobar", undefined, { itemId: "mate-1", practicaId: "p-a", respuesta: "20" })).status, 401);
});

Deno.test("main: limpia la copia temporal", async () => {
  await Deno.remove(dir, { recursive: true });
});
