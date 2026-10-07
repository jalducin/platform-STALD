// Borrador del intento guardado en el servidor (openspec: borrador-en-servidor), con el ámbito de Secundaria y datos
// inline, sin red.
// deno-lint-ignore-file no-explicit-any
import { assertEquals } from "jsr:@std/assert@1";
import { clearCache, handleSecundaria } from "./actividades.ts";
import { storeCon, tema } from "./test_datos.ts";

const ADMIN = "admin@example.com";
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s });
const pregunta = (id: string) => ({ id, tema: "historia", tipo: "opcion", enunciado: `¿${id}?`, opciones: ["bien", "mal"], correcta: 0, explicacion: "x" });
const filas = () => Promise.resolve([
  { userEmails: ["luz@example.com"], userNames: ["Luz María Pérez"] },
  { userEmails: ["beto@example.com"], userNames: ["Beto Ruiz"] },
]);

function datos() {
  return storeCon({
    "contenido/secundaria/semanas/2026-10-05.json": { id: "2026-10-05", titulo: "Mensual", elementos: [{ id: "sec-mensual", tipo: "examen", fecha: "2026-10-11" }] },
    "contenido/secundaria/examenes/sec-mensual.json": {
      id: "sec-mensual", tipo: "examen", titulo: "Examen mensual", disponibleDesde: "2026-10-05", fechaLimite: "2026-10-11",
      intentos: 1, preguntasPorIntento: 3, alumnos: ["luz"], temas: [tema("historia")],
      banco: [pregunta("h1"), pregunta("h2"), pregunta("h3")],
    },
  });
}
async function sec(store: any, method: string, sub: string, email: string, body?: unknown) {
  Deno.env.set("PERMITIR_HOY", "1");
  const req = new Request(`http://x/secundaria/actividades${sub}?hoy=2026-10-06`, { method, body: body ? JSON.stringify(body) : undefined });
  const res = await handleSecundaria(req, sub, email, ADMIN, store, filas, json);
  return { status: res.status, body: await res.json() };
}
const RUTA = "borradores/sec-mensual/luz.json";

Deno.test("borrador: se guarda en el servidor y vuelve al abrir el intento (otro aparato)", async () => {
  clearCache();
  const store = datos();
  const g = await sec(store, "GET", "/sec-mensual", "luz@example.com");
  assertEquals([g.status, g.body.intento, g.body.borrador], [200, 1, undefined]);
  const p = await sec(store, "PUT", "/sec-mensual/borrador", "luz@example.com", { intento: 1, respuestas: { h1: 0, h2: 1, intruso: 0 } });
  assertEquals([p.status, p.body.guardado], [200, true]);
  const doc = (await store.get<any>(RUTA))!.data;
  assertEquals([doc.intento, doc.respuestas], [1, { h1: 0, h2: 1 }], "solo preguntas del intento");
  const g2 = await sec(store, "GET", "/sec-mensual", "luz@example.com");
  assertEquals(g2.body.borrador.respuestas, { h1: 0, h2: 1 });
  assertEquals(typeof g2.body.borrador.actualizado, "string");
});

Deno.test("borrador: nadie más lo escribe (otra persona 404, sin Secundaria 403, admin 403) e intento equivocado 409", async () => {
  clearCache();
  const store = datos();
  const cuerpo = { intento: 1, respuestas: { h1: 0 } };
  assertEquals((await sec(store, "PUT", "/sec-mensual/borrador", "beto@example.com", cuerpo)).status, 404);
  assertEquals((await sec(store, "PUT", "/sec-mensual/borrador", "nadie@example.com", cuerpo)).status, 403);
  const a = await sec(store, "PUT", "/sec-mensual/borrador", ADMIN, cuerpo);
  assertEquals([a.status, a.body.error], [403, "solo_alumno"]);
  const m = await sec(store, "PUT", "/sec-mensual/borrador", "luz@example.com", { intento: 2, respuestas: { h1: 0 } });
  assertEquals([m.status, m.body.error], [409, "intento_invalido"]);
  assertEquals(await store.get(RUTA), null);
});

Deno.test("borrador: enviar el intento lo borra; un borrador vacío también se borra; completo → 409", async () => {
  clearCache();
  const store = datos();
  await sec(store, "PUT", "/sec-mensual/borrador", "luz@example.com", { intento: 1, respuestas: { h1: 0 } });
  await sec(store, "PUT", "/sec-mensual/borrador", "luz@example.com", { intento: 1, respuestas: {} });
  assertEquals(await store.get(RUTA), null, "vacío se borra");
  await sec(store, "PUT", "/sec-mensual/borrador", "luz@example.com", { intento: 1, respuestas: { h1: 0, h2: 0 } });
  const env = await sec(store, "POST", "/sec-mensual", "luz@example.com", { intento: 1, respuestas: { h1: 0, h2: 0, h3: 0 } });
  assertEquals([env.status, env.body.guardado], [200, true]);
  assertEquals(await store.get(RUTA), null, "enviado: sin borrador");
  assertEquals((await sec(store, "PUT", "/sec-mensual/borrador", "luz@example.com", { intento: 1, respuestas: { h1: 0 } })).status, 409);
});
