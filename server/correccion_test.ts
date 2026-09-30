// Segundo intento como corrección (openspec: segundo-intento-correccion), con datos inline.
// deno-lint-ignore-file no-explicit-any
import { assert, assertEquals } from "jsr:@std/assert@1";
import { clearCache, handleActividades } from "./actividades.ts";
import { storeCon, tema } from "./test_datos.ts";

const banco = [
  ...Array.from({ length: 4 }, (_, i) => ({ id: `op-${i}`, tema: "a", tipo: "opcion", enunciado: `¿op ${i}?`, opciones: ["bien", "mal"], correcta: 0, explicacion: "x" })),
  ...Array.from({ length: 4 }, (_, i) => ({ id: `es-${i}`, tema: "b", tipo: "escribir", enunciado: `Escribe ${i}`, aceptadas: [`ok${i}`], explicacion: "y" })),
];
const act = { id: "act", tipo: "actividad", titulo: "Act", disponibleDesde: "2026-09-28", fechaLimite: "2026-09-29", intentos: 2, preguntasPorIntento: 6, temas: [tema("a"), tema("b")], banco };
const exa = { id: "exa", tipo: "examen", titulo: "Exa", disponibleDesde: "2026-09-28", fechaLimite: "2026-10-02", intentos: 1, preguntasPorIntento: 6, temas: [tema("a"), tema("b")], banco };
const porId = new Map(banco.map((e) => [e.id, e]));
const bien = (id: string) => { const e: any = porId.get(id); return e.tipo === "opcion" ? e.correcta : e.aceptadas[0]; };
const mal = (id: string) => (porId.get(id)!.tipo === "opcion" ? 1 : "nope");

const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s });
const store = () => storeCon({ "contenido/examenes/act.json": structuredClone(act), "contenido/examenes/exa.json": structuredClone(exa) });
const call = async (s: ReturnType<typeof store>, alumno: string | null, method: string, sub: string, body?: unknown, query = "") => {
  Deno.env.set("PERMITIR_HOY", "1");
  clearCache();
  const req = new Request(`http://x/ingles/actividades${sub}?email=x&hoy=2026-09-29${query}`, { method, body: body ? JSON.stringify(body) : undefined });
  const res = await handleActividades(req, sub, { isAdmin: !alumno, alumno }, s, json);
  return { status: res.status, body: await res.json() };
};

// Intento 1: bien las 3 primeras, mal el resto.
async function primerIntento(s: ReturnType<typeof store>, alumno = "Ana") {
  const g1 = await call(s, alumno, "GET", "/act");
  const ids: string[] = g1.body.preguntas.map((p: any) => p.id);
  const resp = Object.fromEntries(ids.map((id, i) => [id, i < 3 ? bien(id) : mal(id)]));
  const p1 = await call(s, alumno, "POST", "/act", { intento: 1, respuestas: resp });
  assertEquals(p1.body.calificacion.porcentaje, 50);
  return ids;
}

Deno.test("corrección: mismos ejercicios, fijas las correctas y anteriores sin revelar respuestas", async () => {
  const s = store();
  const ids = await primerIntento(s);
  const g2 = await call(s, "Ana", "GET", "/act");
  assertEquals(g2.body.intento, 2);
  assertEquals(g2.body.preguntas.map((p: any) => p.id), ids);
  assertEquals(Object.keys(g2.body.correccion.fijas).sort(), ids.slice(0, 3).sort());
  assertEquals(Object.keys(g2.body.correccion.anteriores).sort(), ids.slice(3).sort());
  for (const id of ids.slice(3)) assertEquals(typeof g2.body.correccion.anteriores[id], "string");
  const texto = JSON.stringify(g2.body);
  assertEquals(texto.includes("aceptadas") || texto.includes('"correcta"'), false);
  for (const id of ids.slice(3)) if (id.startsWith("es-")) assert(!texto.includes(`ok${id.slice(3)}`), "no revela la respuesta escrita correcta");
});

Deno.test("corrección: las fijas no se alteran y el intento 2 no baja", async () => {
  const s = store();
  const ids = await primerIntento(s);
  // El cliente manda todo mal, incluso las que estaban bien.
  const p2 = await call(s, "Ana", "POST", "/act", { intento: 2, respuestas: Object.fromEntries(ids.map((id) => [id, mal(id)])) });
  assertEquals(p2.status, 200);
  assertEquals(p2.body.calificacion.porcentaje, 50);
  assertEquals(p2.body.calificacion.total, 6);
});

Deno.test("corrección: corrige todo → 100 % y completo", async () => {
  const s = store();
  const ids = await primerIntento(s);
  const p2 = await call(s, "Ana", "POST", "/act", { intento: 2, respuestas: Object.fromEntries(ids.slice(3).map((id) => [id, bien(id)])) });
  assertEquals([p2.body.calificacion.porcentaje, p2.body.mejor.porcentaje], [100, 100]);
  const lista = await call(s, "Ana", "GET", "");
  assertEquals(lista.body.items.find((i: any) => i.id === "act").estado, "completo");
});

Deno.test("corrección: 100 % en el intento 1 → completo, sin otro intento", async () => {
  const s = store();
  const g1 = await call(s, "Ana", "GET", "/act");
  const resp = Object.fromEntries(g1.body.preguntas.map((p: any) => [p.id, bien(p.id)]));
  const p1 = await call(s, "Ana", "POST", "/act", { intento: 1, respuestas: resp });
  assertEquals(p1.body.restantes, 0);
  assertEquals((await call(s, "Ana", "GET", "")).body.items.find((i: any) => i.id === "act").estado, "completo");
  assertEquals((await call(s, "Ana", "GET", "/act")).status, 409);
});

Deno.test("corrección: el examen no cambia (1 intento, sin corrección)", async () => {
  const s = store();
  const g = await call(s, "Ana", "GET", "/exa");
  assertEquals(g.body.correccion, undefined);
  await call(s, "Ana", "POST", "/exa", { intento: 1, respuestas: {} });
  assertEquals((await call(s, "Ana", "POST", "/exa", { intento: 2, respuestas: {} })).status, 409);
});

Deno.test("corrección: vista previa del admin por alumno, sin guardar", async () => {
  const s = store();
  const ids = await primerIntento(s);
  const g = await call(s, null, "GET", "/act", undefined, "&alumno=Ana&intento=2");
  assertEquals(g.body.preguntas.map((p: any) => p.id), ids);
  assertEquals(Object.keys(g.body.correccion.fijas).length, 3);
  const p = await call(s, null, "POST", "/act", { intento: 2, respuestas: {} }, "&alumno=Ana&intento=2");
  assertEquals([p.body.guardado, p.body.calificacion.porcentaje], [false, 50]);
  assertEquals((await s.get<any>("resultados/act/ana.json"))!.data.intentos.length, 1);
});
