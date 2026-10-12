// La semana siguiente se abre el domingo (openspec: semana-desde-domingo), con datos inline.
import { assertEquals } from "jsr:@std/assert@1";
import { clearCache, handleActividades } from "./actividades.ts";
import { abreYa } from "./motor.ts";
import { storeCon, tema } from "./test_datos.ts";

const pregunta = (id: string) => ({ id, tema: "historia", tipo: "opcion", enunciado: `¿${id}?`, opciones: ["bien", "mal"], correcta: 0, explicacion: "x" });
const act = (id: string, desde: string, limite: string, tipo = "actividad") => ({
  id, tipo, titulo: id, disponibleDesde: desde, fechaLimite: limite, intentos: 2, preguntasPorIntento: 2, temas: [tema("historia")], banco: [pregunta("q1"), pregunta("q2")],
});
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s });
const store = () => storeCon({
  "contenido/semanas/2026-10-05.json": { id: "2026-10-05", titulo: "Semana 2", elementos: [{ id: "act-2026-10-08", tipo: "actividad", fecha: "2026-10-08" }] },
  "contenido/semanas/2026-10-12.json": { id: "2026-10-12", titulo: "Semana 3", elementos: [
    { id: "act-2026-10-13", tipo: "actividad", fecha: "2026-10-13" }, { id: "examen-2026-10-16", tipo: "examen", fecha: "2026-10-16" }] },
  "contenido/actividades/act-2026-10-08.json": act("act-2026-10-08", "2026-10-05", "2026-10-08"),
  "contenido/actividades/act-2026-10-13.json": act("act-2026-10-13", "2026-10-12", "2026-10-13"),
  "contenido/examenes/examen-2026-10-16.json": act("examen-2026-10-16", "2026-10-16", "2026-10-16", "examen"),
});
const call = async (s: ReturnType<typeof store>, hoy: string, sub = "") => {
  Deno.env.set("PERMITIR_HOY", "1");
  clearCache();
  const req = new Request(`http://x/ingles/actividades${sub}?email=x&hoy=${hoy}`);
  const res = await handleActividades(req, sub, { isAdmin: false, alumno: "Sofy" }, s, json);
  return { status: res.status, body: await res.json() };
};

Deno.test("abreYa: lo del lunes se abre desde el domingo anterior; lo demás, en su día", () => {
  assertEquals(abreYa("2026-10-12", "2026-10-11"), true, "domingo 11 → lunes 12");
  assertEquals(abreYa("2026-10-12", "2026-10-10"), false, "sábado 10 todavía no");
  assertEquals(abreYa("2026-10-16", "2026-10-11"), false, "el examen del viernes, en su día");
  assertEquals(abreYa("2026-10-12", "2026-10-12"), true);
  assertEquals(abreYa("2026-10-13", "2026-10-12"), false, "lunes no adelanta el martes");
});

Deno.test("domingo: la semana siguiente ya se ve y lo del lunes se puede empezar; el examen sigue cerrado", async () => {
  const s = store();
  const dom = await call(s, "2026-10-11");
  assertEquals([dom.body.semana.id, dom.body.semanaSiguiente.id], ["2026-10-05", "2026-10-12"], "«Esta semana» sigue; la siguiente va aparte");
  const est = Object.fromEntries(dom.body.items.map((i: { id: string; estado: string }) => [i.id, i.estado]));
  assertEquals([est["act-2026-10-13"], est["examen-2026-10-16"]], ["disponible", "proximamente"]);
  assertEquals((await call(s, "2026-10-11", "/act-2026-10-13")).status, 200, "se puede abrir para adelantar");
  assertEquals((await call(s, "2026-10-11", "/examen-2026-10-16")).status, 403);
});

Deno.test("sábado: la semana siguiente todavía no se ve", async () => {
  const s = store();
  const sab = await call(s, "2026-10-10");
  assertEquals([sab.body.semana.id, sab.body.semanaSiguiente], ["2026-10-05", undefined]);
  assertEquals(sab.body.items.some((i: { id: string }) => i.id === "act-2026-10-13"), false);
});
