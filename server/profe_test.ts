// Ruta de estudio del profe (openspec: ruta-profe), con datos inline y sin red.
// deno-lint-ignore-file no-explicit-any
import { assert, assertEquals } from "jsr:@std/assert@1";
import { AMBITO_PROFE, clearCache, handleActividades, handleProfe, visibleItems } from "./actividades.ts";
import { clearCacheAlumnos, handleAlumnos } from "./alumnos.ts";
import { validarSemana } from "./semana.ts";
import { ej, semanaValida, storeCon, tema } from "./test_datos.ts";

const ADMIN = "admin@example.com";
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s });
const act = (id: string, fecha: string, t: string) => ({
  id, tipo: "actividad", titulo: id, disponibleDesde: "2026-10-05", fechaLimite: fecha, intentos: 2, preguntasPorIntento: 4,
  temas: [tema(t)], teoria: [{ titulo: "T", texto: "x" }], tips: [{ tipo: "libreta", texto: "y" }], banco: Array.from({ length: 4 }, (_, i) => ej(`${id}-${i}`, t)),
});
const examen = (id: string, fecha: string, t: string) => ({
  id, tipo: "examen", titulo: id, disponibleDesde: fecha, fechaLimite: fecha, intentos: 1, preguntasPorIntento: 2, temas: [tema(t)], banco: [ej(`${id}-a`, t), ej(`${id}-b`, t)],
});
function datos() {
  return storeCon({
    ...semanaValida(),
    "contenido/profe/plan.json": { titulo: "Ruta B1 → C1 · Mes 1", semanas: [{ id: "2026-10-05", titulo: "Tiempos perfectos" }] },
    "contenido/profe/semanas/2026-09-28.json": { id: "2026-09-28", titulo: "Semana 0", elementos: [{ id: "profe-examen-directo-s1", tipo: "examen", fecha: "2026-10-01" }] },
    "contenido/profe/examenes/profe-examen-directo-s1.json": examen("profe-examen-directo-s1", "2026-10-01", "articulos"),
    "contenido/profe/semanas/2026-10-05.json": { id: "2026-10-05", titulo: "Semana 1", elementos: [
      { id: "profe-act-2026-10-05", tipo: "actividad", fecha: "2026-10-05" },
      { id: "profe-examen-2026-10-07", tipo: "examen", fecha: "2026-10-07" },
      { id: "profe-act-2026-10-08", tipo: "actividad", fecha: "2026-10-08" },
      { id: "profe-examen-2026-10-10", tipo: "examen", fecha: "2026-10-10" },
    ] },
    "contenido/profe/actividades/profe-act-2026-10-05.json": act("profe-act-2026-10-05", "2026-10-05", "pp"),
    "contenido/profe/examenes/profe-examen-2026-10-07.json": examen("profe-examen-2026-10-07", "2026-10-07", "pp"),
    "contenido/profe/actividades/profe-act-2026-10-08.json": act("profe-act-2026-10-08", "2026-10-08", "nt"),
    "contenido/profe/examenes/profe-examen-2026-10-10.json": examen("profe-examen-2026-10-10", "2026-10-10", "nt"),
  });
}
async function profe(store: any, method: string, sub: string, email = ADMIN, body?: unknown, hoy = "2026-10-01") {
  Deno.env.set("PERMITIR_HOY", "1");
  const req = new Request(`http://x/ingles/profe/actividades${sub}?email=x&hoy=${hoy}`, { method, body: body ? JSON.stringify(body) : undefined });
  const res = await handleProfe(req, sub, email, ADMIN, store, json);
  return { status: res.status, body: await res.json() };
}

Deno.test("profe: lista su ámbito con plan y solo sus elementos", async () => {
  clearCache();
  const store = datos();
  const r = await profe(store, "GET", "");
  assertEquals(r.status, 200);
  assertEquals(r.body.plan.titulo, "Ruta B1 → C1 · Mes 1");
  assertEquals(r.body.semana.id, "2026-09-28");
  assertEquals(r.body.items.map((i: any) => [i.id, i.estado]), [["profe-examen-directo-s1", "disponible"]]);
  const lunes = await profe(store, "GET", "", ADMIN, undefined, "2026-10-07");
  assertEquals(lunes.body.semana.id, "2026-10-05");
  assertEquals(lunes.body.items.find((i: any) => i.id === "profe-examen-2026-10-10").estado, "proximamente", "el examen B abre el sábado");
});

Deno.test("profe: el grupo no ve contenido del profe", async () => {
  clearCache();
  const store = datos();
  const { items } = await visibleItems(store, "2026-10-07");
  assert(!items.some((i) => i.id.startsWith("profe-")));
  const { items: delProfe } = await visibleItems(store, "2026-10-07", AMBITO_PROFE);
  assert(delProfe.every((i) => i.id.startsWith("profe-")) && delProfe.length === 5);
  Deno.env.set("PERMITIR_HOY", "1");
  const req = new Request("http://x/ingles/actividades/profe-examen-directo-s1?email=x&hoy=2026-10-01");
  const res = await handleActividades(req, "/profe-examen-directo-s1", { isAdmin: false, alumno: "Marisol" }, store, json);
  assertEquals(res.status, 404, "un alumno no abre elementos del profe por id");
});

Deno.test("profe: su intento se guarda como Profe y solo el admin entra", async () => {
  clearCache();
  const store = datos();
  const g = await profe(store, "GET", "/profe-examen-directo-s1");
  assertEquals([g.status, g.body.intento, g.body.vistaPrevia], [200, 1, false]);
  const resp = Object.fromEntries(g.body.preguntas.map((p: any) => [p.id, 0]));
  const p = await profe(store, "POST", "/profe-examen-directo-s1", ADMIN, { intento: 1, respuestas: resp });
  assertEquals([p.status, p.body.guardado, p.body.calificacion.porcentaje], [200, true, 100]);
  const doc = (await store.get<any>("resultados/profe-examen-directo-s1/profe.json"))!.data;
  assertEquals([doc.alumno, doc.intentos.length], ["Profe", 1]);
  assertEquals((await profe(store, "GET", "")).body.items[0].estado, "completo");
  assertEquals((await profe(store, "GET", "", "marisol@example.com")).status, 403);
  assertEquals((await profe(store, "GET", "/profe-examen-directo-s1", "marisol@example.com")).status, 403);
});

Deno.test("profe: validador con su ámbito y patrón lun/mié/jue/sáb", async () => {
  clearCache();
  const r = await validarSemana(datos(), "2026-10-05", AMBITO_PROFE);
  assertEquals(r.errores, []);
  assertEquals(r.avisos.filter((a) => a.includes("se esperaba")), [], "sigue el patrón del profe");
  const clase = await validarSemana(datos(), "2026-10-05");
  assertEquals(clase.errores, [], "la semana del grupo no cambia");
});

Deno.test("profe: el nombre Profe queda reservado en altas", async () => {
  clearCacheAlumnos();
  const store = storeCon({});
  const req = new Request("http://x/ingles/alumnos", { method: "POST", body: JSON.stringify({ nombre: "profe", email: "otro@example.com" }) });
  const res = await handleAlumnos(req, "", { email: ADMIN, admin: ADMIN, store, filas: () => Promise.resolve([]) }, json);
  assertEquals([res.status, (await res.json()).error], [409, "nombre_en_uso"]);
});
