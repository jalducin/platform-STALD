// Examen semanal con segunda oportunidad (openspec: examen-segunda-oportunidad), con datos inline.
// deno-lint-ignore-file no-explicit-any
import { assert, assertEquals } from "jsr:@std/assert@1";
import { clearCache, handleActividades, handleProfe } from "./actividades.ts";
import { validateItem } from "./motor.ts";
import { validarSemana } from "./semana.ts";
import { ej, semanaValida, storeCon, tema } from "./test_datos.ts";

const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s });
const ADMIN = "admin@example.com";
const examen = (extra: Record<string, unknown> = {}) => ({
  id: "examen-2026-10-09", tipo: "examen", titulo: "Examen 2", disponibleDesde: "2026-10-09", fechaLimite: "2026-10-09", intentos: 2,
  segundaOportunidad: "2026-10-11", preguntasPorIntento: 4, temas: [tema("wh"), tema("adj")],
  banco: [...Array.from({ length: 6 }, (_, i) => ej(`ex-wh-${i}`, "wh")), ...Array.from({ length: 6 }, (_, i) => ej(`ex-adj-${i}`, "adj"))], ...extra,
});
const datos = (extra?: Record<string, unknown>) => storeCon({ ...semanaValida(), "contenido/examenes/examen-2026-10-09.json": examen(extra) });
const ana = { isAdmin: false, alumno: "Ana" };
async function call(store: any, method: string, sub: string, hoy: string, body?: unknown, quien: any = ana) {
  Deno.env.set("PERMITIR_HOY", "1");
  const req = new Request(`http://x/ingles/actividades${sub}?email=x&hoy=${hoy}`, { method, body: body ? JSON.stringify(body) : undefined });
  const res = await handleActividades(req, sub, quien, store, json);
  return { status: res.status, body: await res.json() };
}
const estadoDe = async (store: any, hoy: string) => (await call(store, "GET", "", hoy)).body.items.find((i: any) => i.id === "examen-2026-10-09");

Deno.test("2.ª oportunidad: viernes resuelve, sábado en espera, domingo preguntas nuevas y cuenta la mejor", async () => {
  clearCache();
  const store = datos();
  const v = await call(store, "GET", "/examen-2026-10-09", "2026-10-09");
  assertEquals([v.status, v.body.intento, v.body.intentosMax], [200, 1, 2]);
  const p1 = await call(store, "POST", "/examen-2026-10-09", "2026-10-09", { intento: 1, respuestas: Object.fromEntries(v.body.preguntas.map((q: any) => [q.id, 0])) });
  assertEquals([p1.status, p1.body.calificacion.porcentaje, p1.body.restantes], [200, 100, 1]);
  const sab = await estadoDe(store, "2026-10-10");
  assertEquals([sab.estado, sab.segundaOportunidad, sab.intentosUsados], ["en-espera", "2026-10-11", 1]);
  const bloq = await call(store, "GET", "/examen-2026-10-09", "2026-10-10");
  assertEquals([bloq.status, bloq.body.error, bloq.body.desde], [403, "segunda_pronto", "2026-10-11"]);
  assertEquals((await call(store, "POST", "/examen-2026-10-09", "2026-10-10", { intento: 2, respuestas: {} })).status, 403);
  assertEquals((await estadoDe(store, "2026-10-11")).estado, "en-curso");
  const d = await call(store, "GET", "/examen-2026-10-09", "2026-10-11");
  assertEquals([d.status, d.body.intento, d.body.correccion], [200, 2, undefined], "sin corrección: es examen");
  const ids1 = new Set(v.body.preguntas.map((q: any) => q.id));
  assert(d.body.preguntas.some((q: any) => !ids1.has(q.id)), "selección nueva");
  const p2 = await call(store, "POST", "/examen-2026-10-09", "2026-10-11", { intento: 2, respuestas: {} });
  assertEquals([p2.status, p2.body.calificacion.porcentaje, p2.body.mejor.porcentaje, p2.body.restantes], [200, 0, 100, 0], "cuenta la mejor");
  const doc = (await store.get("resultados/examen-2026-10-09/ana.json"))!.data as any;
  assertEquals(doc.intentos.map((x: any) => x.fueraDeTiempo), [false, false], "la 2.ª a tiempo en su fecha");
  assertEquals((await estadoDe(store, "2026-10-12")).estado, "completo");
});

Deno.test("2.ª oportunidad: hecha después de su fecha queda fuera de tiempo; quien no hizo la 1.ª la hace tarde", async () => {
  clearCache();
  const store = datos();
  assertEquals((await estadoDe(store, "2026-10-10")).estado, "disponible", "sin intento: la 1.ª sigue abierta (tarde)");
  const g = await call(store, "GET", "/examen-2026-10-09", "2026-10-10");
  await call(store, "POST", "/examen-2026-10-09", "2026-10-10", { intento: 1, respuestas: Object.fromEntries(g.body.preguntas.map((q: any) => [q.id, 0])) });
  await call(store, "GET", "/examen-2026-10-09", "2026-10-13");
  await call(store, "POST", "/examen-2026-10-09", "2026-10-13", { intento: 2, respuestas: {} });
  const doc = (await store.get("resultados/examen-2026-10-09/ana.json"))!.data as any;
  assertEquals(doc.intentos.map((x: any) => x.fueraDeTiempo), [true, true]);
});

Deno.test("2.ª oportunidad: validación del examen y de la semana", async () => {
  const it = (extra: Record<string, unknown>) => validateItem(examen(extra) as any);
  assertEquals(it({}), []);
  assert(it({ intentos: 1 }).some((e) => e.includes("segundaOportunidad")), "requiere 2 intentos");
  assert(it({ segundaOportunidad: "2026-10-09" }).some((e) => e.includes("segundaOportunidad")), "debe ser posterior al examen");
  assert(it({ segundaOportunidad: "domingo" }).some((e) => e.includes("segundaOportunidad")));
  clearCache();
  assertEquals((await validarSemana(datos(), "2026-10-05")).errores, []);
  clearCache();
  const sinFecha = await validarSemana(datos({ segundaOportunidad: undefined }), "2026-10-05");
  assert(sinFecha.avisos.some((a) => a.includes("segundaOportunidad")), "aviso: 2 intentos sin fecha de 2.ª oportunidad");
});

Deno.test("2.ª oportunidad: en la ruta del profe no hay espera", async () => {
  clearCache();
  const store = datos();
  Deno.env.set("PERMITIR_HOY", "1");
  const req = (m: string, b?: unknown) => new Request(`http://x/ingles/profe/actividades/examen-2026-10-09?email=x&hoy=2026-10-07`, { method: m, body: b ? JSON.stringify(b) : undefined });
  const g = await (await handleProfe(req("GET"), "/examen-2026-10-09", ADMIN, ADMIN, store, json)).json();
  await handleProfe(req("POST", { intento: 1, respuestas: Object.fromEntries(g.preguntas.map((q: any) => [q.id, 0])) }), "/examen-2026-10-09", ADMIN, ADMIN, store, json);
  const g2 = await handleProfe(req("GET"), "/examen-2026-10-09", ADMIN, ADMIN, store, json);
  assertEquals([g2.status, (await g2.json()).intento], [200, 2]);
});
