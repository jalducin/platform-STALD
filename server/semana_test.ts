// Semanas publicadas por adelantado y validador de semana, con datos inline (sin contenido privado).
// deno-lint-ignore-file no-explicit-any
import { assert, assertEquals } from "jsr:@std/assert@1";
import { clearCache, visibleItems } from "./actividades.ts";
import { validarSemana } from "./semana.ts";
import { ej, semanaValida, storeCon, tema } from "./test_datos.ts";

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
