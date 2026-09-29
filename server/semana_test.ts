// Semanas publicadas por adelantado y validador de semana, con datos inline (sin contenido privado).
// deno-lint-ignore-file no-explicit-any
import { assert, assertEquals } from "jsr:@std/assert@1";
import { clearCache, visibleItems } from "./actividades.ts";
import { validarSemana } from "./semana.ts";
import { MemoryStore } from "./store.ts";

const tema = (id: string) => ({ id, titulo: id, retroalimentacion: { "fortaleza": "ok", "en-progreso": "casi", "debilidad": "repasa" } });
const ej = (id: string, t: string) => ({ id, tema: t, tipo: "opcion", enunciado: `¿${id}?`, opciones: ["a", "b"], correcta: 0, explicacion: "porque sí" });
const banco = (pre: string, t: string, n: number) => Array.from({ length: n }, (_, i) => ej(`${pre}-${i}`, t));

// Semana completa y válida: lunes 2026-10-05.
export function semanaValida(): Record<string, unknown> {
  const act = (id: string, fecha: string, t: string) => ({
    id, tipo: "actividad", titulo: id, disponibleDesde: "2026-10-05", fechaLimite: fecha, intentos: 2, preguntasPorIntento: 4,
    temas: [tema(t)], teoria: [{ titulo: "T", texto: "x" }], tips: [{ tipo: "libreta", texto: "y" }], banco: banco(id, t, 8),
  });
  return {
    "contenido/semanas/2026-10-05.json": { id: "2026-10-05", titulo: "Semana 2", elementos: [
      { id: "act-2026-10-06", tipo: "actividad", fecha: "2026-10-06" },
      { id: "act-2026-10-08", tipo: "actividad", fecha: "2026-10-08" },
      { id: "examen-2026-10-09", tipo: "examen", fecha: "2026-10-09" },
      { id: "refuerzo-2026-10-10", tipo: "refuerzo", fecha: "2026-10-10" },
      { id: "meet-2026-10-11", tipo: "meet", fecha: "2026-10-11" },
    ] },
    "contenido/actividades/act-2026-10-06.json": act("act-2026-10-06", "2026-10-06", "wh"),
    "contenido/actividades/act-2026-10-08.json": act("act-2026-10-08", "2026-10-08", "adj"),
    "contenido/examenes/examen-2026-10-09.json": {
      id: "examen-2026-10-09", tipo: "examen", titulo: "Examen 2", disponibleDesde: "2026-10-09", fechaLimite: "2026-10-09", intentos: 1,
      preguntasPorIntento: 4, temas: [tema("wh"), tema("adj")], banco: [...banco("ex-wh", "wh", 2), ...banco("ex-adj", "adj", 2)],
    },
    "contenido/actividades/refuerzo-2026-10-10.json": {
      id: "refuerzo-2026-10-10", tipo: "refuerzo", titulo: "Refuerzo", disponibleDesde: "2026-10-10", fechaLimite: "2026-10-10", intentos: 2,
      preguntasPorIntento: 4, basadoEn: "examen-2026-10-09", mapeoTemas: { wh: "wh", adj: "adj" }, temas: [tema("wh"), tema("adj")],
      teoria: [{ titulo: "R", texto: "x" }], tips: [{ tipo: "libreta", texto: "y" }], bancoDe: ["act-2026-10-06", "act-2026-10-08", "examen-2026-10-09"], banco: [],
    },
    "contenido/actividades/meet-2026-10-11.json": {
      id: "meet-2026-10-11", tipo: "meet", titulo: "Meet", disponibleDesde: "2026-10-11", fechaLimite: "2026-10-11", meetUrl: "https://meet.google.com/abc",
      hora: "11:00", intentos: 2, preguntasPorIntento: 4, temas: [tema("wh")], teoria: [{ titulo: "M", texto: "x" }], tips: [{ tipo: "libreta", texto: "y" }],
      guion: [{ titulo: "1", tiempo: "5 min", pasos: ["a"] }], presentacion: { diapositivas: [{ tipo: "teoria", ref: 0 }] }, banco: banco("meet", "wh", 8),
    },
  };
}

export function storeCon(files: Record<string, unknown>): MemoryStore {
  const s = new MemoryStore();
  let n = 0;
  for (const [k, v] of Object.entries(files)) s.files.set(k, { data: v, sha: `t${n++}` });
  return s;
}

const conSemana1 = () => storeCon({
  ...semanaValida(),
  "contenido/semanas/2026-09-28.json": { id: "2026-09-28", titulo: "Semana 1", elementos: [{ id: "examen-2026-10-02", tipo: "examen", fecha: "2026-10-02" }] },
  "contenido/examenes/examen-2026-10-02.json": { id: "examen-2026-10-02", tipo: "examen", titulo: "Examen 1", disponibleDesde: "2026-10-02", fechaLimite: "2026-10-02", temas: [tema("x")], banco: [ej("e1", "x")] },
  "contenido/examenes/diagnostico-a1.json": { id: "diagnostico-a1", tipo: "examen", titulo: "Diagnóstico", disponibleDesde: "2026-09-01", fechaLimite: "2026-09-27", temas: [tema("x")], banco: [ej("d1", "x")] },
});

Deno.test("semana futura: ningún elemento visible antes de su lunes (ni su examen)", async () => {
  clearCache();
  const { items, semanaActual } = await visibleItems(conSemana1(), "2026-10-03");
  assertEquals(semanaActual?.id, "2026-09-28");
  assertEquals(items.map((i) => i.id).sort(), ["diagnostico-a1", "examen-2026-10-02"]);
});

Deno.test("semana futura: visible desde su lunes", async () => {
  clearCache();
  const { items, semanaActual } = await visibleItems(conSemana1(), "2026-10-05");
  assertEquals(semanaActual?.id, "2026-10-05");
  assert(items.some((i) => i.id === "examen-2026-10-09"));
  assert(items.some((i) => i.id === "diagnostico-a1"), "el diagnóstico sigue como examen suelto");
  assertEquals(items.length, 7);
});

// ---- Validador ----

const validar = async (mutar?: (f: Record<string, any>) => void, lunes = "2026-10-05") => {
  clearCache();
  const f = semanaValida() as Record<string, any>;
  mutar?.(f);
  return await validarSemana(storeCon(f), lunes);
};
const tiene = (xs: string[], s: string) => xs.some((x) => x.includes(s));

Deno.test("validador: semana válida sin errores ni avisos", async () => {
  const r = await validar();
  assertEquals(r.errores, []);
  assertEquals(r.avisos, []);
});

Deno.test("validador: id que no es lunes", async () => {
  const r = await validar((f) => { f["contenido/semanas/2026-10-06.json"] = { ...f["contenido/semanas/2026-10-05.json"], id: "2026-10-06" }; }, "2026-10-06");
  assert(tiene(r.errores, "no es lunes"), r.errores.join("\n"));
});

Deno.test("validador: semana inexistente", async () => {
  const r = await validar(undefined, "2026-10-12");
  assert(tiene(r.errores, "no existe"));
});

Deno.test("validador: examen que se abre antes de su día", async () => {
  const r = await validar((f) => { f["contenido/examenes/examen-2026-10-09.json"].disponibleDesde = "2026-10-05"; });
  assert(tiene(r.errores, "bloqueado hasta su día"), r.errores.join("\n"));
});

Deno.test("validador: elemento sin archivo y fecha distinta", async () => {
  const r = await validar((f) => {
    delete f["contenido/actividades/act-2026-10-08.json"];
    f["contenido/actividades/act-2026-10-06.json"].fechaLimite = "2026-10-07";
  });
  assert(tiene(r.errores, "act-2026-10-08: no existe el archivo"), r.errores.join("\n"));
  assert(tiene(r.errores, "act-2026-10-06: fechaLimite"), r.errores.join("\n"));
});

Deno.test("validador: tipo distinto y disponibleDesde fuera de la semana", async () => {
  const r = await validar((f) => {
    f["contenido/actividades/act-2026-10-06.json"].tipo = "refuerzo";
    f["contenido/actividades/meet-2026-10-11.json"].disponibleDesde = "2026-10-01";
  });
  assert(tiene(r.errores, "act-2026-10-06: tipo"), r.errores.join("\n"));
  assert(tiene(r.errores, "meet-2026-10-11: disponibleDesde"), r.errores.join("\n"));
});

Deno.test("validador: refuerzo incoherente", async () => {
  const r = await validar((f) => {
    const ref = f["contenido/actividades/refuerzo-2026-10-10.json"];
    ref.bancoDe = ["act-2026-10-06", "act-9999"];
    ref.mapeoTemas = { wh: "wh", adj: "no-existe" };
  });
  assert(tiene(r.errores, "bancoDe act-9999"), r.errores.join("\n"));
  assert(tiene(r.errores, "mapeoTemas"), r.errores.join("\n"));
  assert(tiene(r.errores, "tema adj sin ejercicios"), r.errores.join("\n"));
});

Deno.test("validador: correo en el contenido y ref de diapositiva inválida", async () => {
  const r = await validar((f) => {
    f["contenido/actividades/act-2026-10-06.json"].banco[0].enunciado = "Escribe a alguien@example.com";
    f["contenido/actividades/meet-2026-10-11.json"].presentacion.diapositivas.push({ tipo: "teoria", ref: 5 });
  });
  assert(tiene(r.errores, "correo"), r.errores.join("\n"));
  assert(tiene(r.errores, "ref 5"), r.errores.join("\n"));
});

Deno.test("validador: avisos (banco corto, Meet sin enlace, día fuera de patrón)", async () => {
  const r = await validar((f) => {
    f["contenido/actividades/act-2026-10-06.json"].banco.splice(6);
    f["contenido/actividades/meet-2026-10-11.json"].meetUrl = null;
    f["contenido/semanas/2026-10-05.json"].elementos[1].fecha = "2026-10-07";
    f["contenido/actividades/act-2026-10-08.json"].fechaLimite = "2026-10-07";
  });
  assertEquals(r.errores, []);
  assert(tiene(r.avisos, "act-2026-10-06: banco"), r.avisos.join("\n"));
  assert(tiene(r.avisos, "meetUrl"), r.avisos.join("\n"));
  assert(tiene(r.avisos, "act-2026-10-08: actividad el miércoles"), r.avisos.join("\n"));
});

Deno.test("validador: errores del motor (respuesta inválida)", async () => {
  const r = await validar((f) => { f["contenido/actividades/act-2026-10-06.json"].banco[0].correcta = 9; });
  assert(tiene(r.errores, "correcta inválida"), r.errores.join("\n"));
});
