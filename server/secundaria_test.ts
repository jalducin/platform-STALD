// Exámenes de Secundaria (openspec: examen-secundaria): ámbito contenido/secundaria, examen exclusivo con `alumnos`,
// dos oportunidades con la mejor calificación e identidad desde las filas de Secundaria. Datos inline, sin red.
// deno-lint-ignore-file no-explicit-any
import { assert, assertEquals } from "jsr:@std/assert@1";
import { clearCache, handleSecundaria } from "./actividades.ts";
import { storeCon, tema } from "./test_datos.ts";

const ADMIN = "admin@example.com";
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s });
const pregunta = (id: string, t: string) => ({ id, tema: t, tipo: "opcion", enunciado: `¿${id}?`, opciones: ["bien", "mal"], correcta: 0, explicacion: "x" });
const filas = () => Promise.resolve([
  { userEmails: ["luz@example.com"], userNames: ["Luz María Pérez"] },
  { userEmails: ["beto@example.com"], userNames: ["Beto Ruiz"] },
]);

function datos() {
  return storeCon({
    "contenido/secundaria/semanas/2026-10-05.json": { id: "2026-10-05", titulo: "Mensual", elementos: [{ id: "sec-mensual", tipo: "examen", fecha: "2026-10-11" }] },
    "contenido/secundaria/examenes/sec-mensual.json": {
      id: "sec-mensual", tipo: "examen", titulo: "Examen mensual", disponibleDesde: "2026-10-05", fechaLimite: "2026-10-11",
      intentos: 2, preguntasPorIntento: 4, alumnos: ["luz"], temas: [tema("historia"), tema("ingles")],
      banco: [pregunta("h1", "historia"), pregunta("h2", "historia"), pregunta("i1", "ingles"), pregunta("i2", "ingles")],
    },
  });
}
async function sec(store: any, method: string, sub: string, email: string, body?: unknown) {
  Deno.env.set("PERMITIR_HOY", "1");
  const req = new Request(`http://x/secundaria/actividades${sub}?hoy=2026-10-06`, { method, body: body ? JSON.stringify(body) : undefined });
  const res = await handleSecundaria(req, sub, email, ADMIN, store, filas, json);
  return { status: res.status, body: await res.json() };
}
async function contestar(store: any, intento: number, buenas: number) {
  const g = await sec(store, "GET", "/sec-mensual", "luz@example.com");
  assertEquals([g.status, g.body.intento], [200, intento]);
  const resp = Object.fromEntries(g.body.preguntas.map((p: any, i: number) => [p.id, i < buenas ? 0 : 1]));
  return await sec(store, "POST", "/sec-mensual", "luz@example.com", { intento, respuestas: resp });
}

Deno.test("secundaria: la alumna ve su examen exclusivo; otra persona no lo ve ni lo abre", async () => {
  clearCache();
  const store = datos();
  const luz = await sec(store, "GET", "", "luz@example.com");
  assertEquals([luz.status, luz.body.items.map((i: any) => i.id)], [200, ["sec-mensual"]]);
  const beto = await sec(store, "GET", "", "beto@example.com");
  assertEquals([beto.status, beto.body.items.length], [200, 0]);
  assertEquals((await sec(store, "GET", "/sec-mensual", "beto@example.com")).status, 404);
});

Deno.test("secundaria: un correo sin Secundaria recibe 403", async () => {
  clearCache();
  assertEquals((await sec(datos(), "GET", "", "nadie@example.com")).status, 403);
});

Deno.test("secundaria: dos oportunidades, se queda la mejor y no hay tercera", async () => {
  clearCache();
  const store = datos();
  const p1 = await contestar(store, 1, 2);
  assertEquals([p1.status, p1.body.calificacion.porcentaje], [200, 50]);
  const p2 = await contestar(store, 2, 4);
  assertEquals([p2.body.calificacion.porcentaje, p2.body.mejor.porcentaje], [100, 100]);
  const doc = (await store.get<any>("resultados/sec-mensual/luz.json"))!.data;
  assertEquals([doc.intentos.length, doc.mejor.porcentaje], [2, 100]);
  assertEquals((await sec(store, "GET", "/sec-mensual", "luz@example.com")).status, 409, "sin tercer intento");
  const lista = await sec(store, "GET", "", "luz@example.com");
  assertEquals([lista.body.items[0].estado, lista.body.items[0].mejor.porcentaje], ["completo", 100]);
});

Deno.test("secundaria: si el segundo intento sale peor, se conserva el primero", async () => {
  clearCache();
  const store = datos();
  await contestar(store, 1, 4);
  const p2 = await contestar(store, 2, 1);
  assertEquals([p2.body.calificacion.porcentaje, p2.body.mejor.porcentaje], [25, 100]);
});

Deno.test("secundaria: el admin ve los resultados de todas las personas", async () => {
  clearCache();
  const store = datos();
  await contestar(store, 1, 3);
  const a = await sec(store, "GET", "", ADMIN);
  assertEquals([a.status, a.body.isAdmin], [200, true]);
  const it = a.body.items.find((i: any) => i.id === "sec-mensual");
  assert(it, "el admin ve el examen exclusivo");
  assertEquals([it.alumnos, it.resultados.length, it.resultados[0].alumno], [["luz"], 1, "Luz"]);
});

Deno.test("secundaria: con porSecciones las preguntas salen agrupadas por materia, en el orden de temas", async () => {
  clearCache();
  const store = datos();
  const ruta = "contenido/secundaria/examenes/sec-mensual.json";
  const ex = (await store.get<any>(ruta))!.data;
  const banco = ["h1", "i1", "h2", "i2", "h3", "i3"].map((id) => pregunta(id, id[0] === "h" ? "historia" : "ingles"));
  await store.put(ruta, { ...ex, banco, preguntasPorIntento: 6, porSecciones: true, temas: [tema("ingles"), tema("historia")] }, (await store.get(ruta))!.sha);
  for (const intento of [1, 2]) {
    const g = await sec(store, "GET", "/sec-mensual", "luz@example.com");
    const temas = g.body.preguntas.map((p: any) => p.tema);
    assertEquals(temas, ["ingles", "ingles", "ingles", "historia", "historia", "historia"], `intento ${intento}`);
    if (intento === 1) await sec(store, "POST", "/sec-mensual", "luz@example.com", { intento: 1, respuestas: Object.fromEntries(g.body.preguntas.map((p: any) => [p.id, 0])) });
  }
});
