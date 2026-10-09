// Integración sobre una copia local del repo de datos (DATA_DIR). Sin DATA_DIR, se omite.
import { assert, assertEquals } from "jsr:@std/assert@1";
import { clearCache, handleActividades, loadItem, visibleItems } from "./actividades.ts";
import { type Item, selectQuestions, slugAlumno, validateItem } from "./motor.ts";
import { MemoryStore } from "./store.ts";

const DATA_DIR = Deno.env.get("DATA_DIR");
const ignore = !DATA_DIR;
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s });
const call = async (store: MemoryStore, method: string, sub: string, quien: { isAdmin: boolean; alumno: string | null }, body?: unknown, hoy = "2026-09-29") => {
  Deno.env.set("PERMITIR_HOY", "1");
  const req = new Request(`http://x/ingles/actividades${sub}?email=x&hoy=${hoy}`, { method, body: body ? JSON.stringify(body) : undefined });
  const res = await handleActividades(req, sub, quien, store, json);
  return { status: res.status, body: await res.json() };
};
const correctas = (qs: { id: string; tipo: string; correcta?: number; aceptadas?: string[] }[]) =>
  Object.fromEntries(qs.map((q) => [q.id, q.tipo === "escribir" ? q.aceptadas![0] : q.correcta]));

Deno.test({ name: "contenido de la semana 1 válido", ignore, fn: async () => {
  clearCache();
  const store = await MemoryStore.fromDir(DATA_DIR!);
  const { items: todos, semanaActual } = await visibleItems(store, "2026-09-29");
  assertEquals(semanaActual?.id, "2026-09-28");
  // La semana 1 y los exámenes sueltos (la copia de las E2E agrega clases de prueba de otras semanas).
  const deSemana = new Set(semanaActual!.elementos.map((e) => e.id));
  const items = todos.filter((i) => deSemana.has(i.id) || i.tipo === "examen");
  assertEquals(items.map((i) => i.tipo).sort(), ["actividad", "actividad", "examen", "examen", "meet", "refuerzo"]);
  for (const it of items) assertEquals(validateItem(it), [], it.id);
  const ref = await loadItem(store, "refuerzo-2026-10-03");
  assert((ref!.banco || []).length >= 60, "el refuerzo reúne los bancos");
}});

Deno.test({ name: "flujo: teoría → intento 1 → intento 2 (corrección, mismos ejercicios) → sin intentos", ignore, fn: async () => {
  clearCache();
  const store = await MemoryStore.fromDir(DATA_DIR!);
  // Alumno de prueba sin resultados en el repo de datos (los reales ya tienen intentos).
  const marisol = { isAdmin: false, alumno: "Prueba Integracion" };
  const g1 = await call(store, "GET", "/act-2026-09-29", marisol);
  assertEquals(g1.status, 200);
  assertEquals(g1.body.intento, 1);
  assert(g1.body.teoria.length > 0 && g1.body.tips.length > 0);
  assertEquals(JSON.stringify(g1.body.preguntas).includes("aceptadas") || JSON.stringify(g1.body.preguntas).includes('"correcta"'), false);
  const it = (await loadItem(store, "act-2026-09-29")) as Item;
  const sel1 = selectQuestions(it.banco!, it, slugAlumno("Prueba Integracion"), 1);
  assertEquals(g1.body.preguntas.map((p: { id: string }) => p.id), sel1.map((q) => q.id));
  // intento 1: todo mal
  const p1 = await call(store, "POST", "/act-2026-09-29", marisol, { intento: 1, respuestas: {} });
  assertEquals(p1.body.guardado, true);
  assertEquals(p1.body.calificacion.porcentaje, 0);
  assertEquals(p1.body.restantes, 1);
  // intento 2: corrección con los mismos ejercicios; corrige todo
  const g2 = await call(store, "GET", "/act-2026-09-29", marisol);
  assertEquals(g2.body.intento, 2);
  assertEquals(g2.body.preguntas.map((p: { id: string }) => p.id), sel1.map((q) => q.id));
  assertEquals(Object.keys(g2.body.correccion.anteriores).length, sel1.length);
  const p2 = await call(store, "POST", "/act-2026-09-29", marisol, { intento: 2, respuestas: correctas(sel1) });
  assertEquals(p2.body.calificacion.porcentaje, 100);
  assertEquals(p2.body.mejor.porcentaje, 100);
  // tercer intento
  const p3 = await call(store, "POST", "/act-2026-09-29", marisol, { intento: 3, respuestas: {} });
  assertEquals(p3.status, 409);
  assertEquals(p3.body.error, "sin_intentos");
  // lista del alumno
  const lista = await call(store, "GET", "", marisol);
  const act = lista.body.items.find((i: { id: string }) => i.id === "act-2026-09-29");
  assertEquals([act.estado, act.intentosUsados, act.mejor.porcentaje], ["completo", 2, 100]);
  const deMarisol = await call(store, "GET", "", { isAdmin: false, alumno: "Marisol" });
  const diag = deMarisol.body.items.find((i: { id: string }) => i.id === "diagnostico-a1");
  assertEquals([diag.estado, diag.mejor.porcentaje], ["completo", 70]); // resultado migrado
}});

Deno.test({ name: "examen: solo desde su fecha; 2.ª oportunidad el domingo; admin no guarda; reinicio solo admin", ignore, fn: async () => {
  clearCache();
  const store = await MemoryStore.fromDir(DATA_DIR!);
  await store.remove("resultados/examen-2026-10-02/angel.json"); // la copia puede traer su resultado real
  const angel = { isAdmin: false, alumno: "Angel" }, admin = { isAdmin: true, alumno: null };
  assertEquals((await call(store, "GET", "/examen-2026-10-02", angel, undefined, "2026-10-01")).status, 403);
  const g = await call(store, "GET", "/examen-2026-10-02", angel, undefined, "2026-10-02");
  assertEquals([g.status, g.body.preguntas.length, g.body.intentosMax], [200, 20, 2]);
  assertEquals((await call(store, "POST", "/examen-2026-10-02", angel, { intento: 1, respuestas: {} }, "2026-10-02")).body.guardado, true);
  assertEquals((await call(store, "GET", "/examen-2026-10-02", angel, undefined, "2026-10-03")).status, 403, "la 2.ª oportunidad espera al domingo");
  assertEquals((await call(store, "POST", "/examen-2026-10-02", angel, { intento: 2, respuestas: {} }, "2026-10-04")).body.guardado, true);
  assertEquals((await call(store, "POST", "/examen-2026-10-02", angel, { intento: 3, respuestas: {} }, "2026-10-04")).status, 409);
  const pa = await call(store, "POST", "/examen-2026-10-02", admin, { respuestas: {} }, "2026-09-29");
  assertEquals(pa.body.guardado, false);
  assertEquals((await call(store, "DELETE", "/examen-2026-10-02/resultados/angel", angel)).status, 403);
  assertEquals((await call(store, "DELETE", "/examen-2026-10-02/resultados/angel", admin)).body.borrado, true);
  assertEquals(await store.get("resultados/examen-2026-10-02/angel.json"), null);
}});

Deno.test({ name: "refuerzo según debilidades del examen; si no hay examen, del diagnóstico", ignore, fn: async () => {
  clearCache();
  const store = await MemoryStore.fromDir(DATA_DIR!);
  const laura = { isAdmin: false, alumno: "Laura" };
  // Laura sin examen semanal: su diagnóstico (Alfabeto y Presente simple débiles, to be en progreso)
  // se mapea a alfabeto, verbos-3p y pronombres.
  const g0 = await call(store, "GET", "/refuerzo-2026-10-03", laura, undefined, "2026-10-03");
  assertEquals(g0.body.enfoque.sort(), ["Alfabeto y spelling", "Pronombres personales", "Verbos y 3.ª persona (-s)"]);
  // Laura hace el examen fallando solo plurales
  const ex = (await loadItem(store, "examen-2026-10-02")) as Item;
  const sel = selectQuestions(ex.banco!, ex, "laura", 1);
  const resp = Object.fromEntries(sel.filter((q) => q.tema !== "plurales").map((q) => [q.id, q.tipo === "escribir" ? q.aceptadas![0] : q.correcta]));
  await call(store, "POST", "/examen-2026-10-02", laura, { intento: 1, respuestas: resp }, "2026-10-02");
  clearCache();
  const g1 = await call(store, "GET", "/refuerzo-2026-10-03", laura, undefined, "2026-10-03");
  assertEquals(g1.body.enfoque, ["Plurales s / es / ies"]);
  assert(g1.body.preguntas.every((p: { tema: string }) => p.tema === "plurales"));
}});

Deno.test({ name: "admin: resultados por actividad y temas a reforzar por alumno", ignore, fn: async () => {
  clearCache();
  const store = await MemoryStore.fromDir(DATA_DIR!);
  const l = await call(store, "GET", "", { isAdmin: true, alumno: null });
  const diag = l.body.items.find((i: { id: string }) => i.id === "diagnostico-a1");
  assert(diag.resultados.length >= 4);
  assert(l.body.resumen.Jesus.temasAReforzar.some((t: { titulo: string }) => t.titulo === "Presente simple"));
}});

Deno.test({ name: "clase del domingo: solo la clase y el material del profe, sin reto (openspec: meet-sin-reto)", ignore, fn: async () => {
  clearCache();
  const store = await MemoryStore.fromDir(DATA_DIR!);
  const jesus = { isAdmin: false, alumno: "Jesus" }, admin = { isAdmin: true, alumno: null };
  const g = await call(store, "GET", "/meet-2026-10-04", jesus, undefined, "2026-10-04");
  assertEquals([g.status, g.body.error, "guion" in g.body], [400, "no_aplica", false]);
  const ga = await call(store, "GET", "/meet-2026-10-04", admin, undefined, "2026-10-01");
  assert(Array.isArray(ga.body.guion) && ga.body.guion.length === 5);
  assertEquals([ga.body.presentacion.diapositivas.length, ga.body.preguntas.length], [13, 0]);
  assert(!ga.body.presentacion.diapositivas.some((d: { tipo: string }) => d.tipo === "reto"));
  const l = await call(store, "GET", "", jesus, undefined, "2026-10-04");
  const m = l.body.items.find((i: { id: string }) => i.id === "meet-2026-10-04");
  assertEquals([m.tieneReto, m.tieneMaterial, m.intentosMax], [false, true, 0]);
}});
