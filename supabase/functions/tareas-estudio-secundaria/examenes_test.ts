import { assertEquals } from "jsr:@std/assert@1";
import {
  type Examen,
  gradeExam,
  isAvailable,
  isLate,
  mxToday,
  publicQuestions,
  sanitizeRespuestas,
  slugAlumno,
  validateExam,
} from "./examenes.ts";
import diagnostico from "./examenes/diagnostico-a1.json" with { type: "json" };

const ex = diagnostico as Examen;
const todasCorrectas = Object.fromEntries(ex.preguntas.map((p) => [p.id, p.correcta]));

Deno.test("diagnóstico A1: definición válida, 33 preguntas en 6 secciones", () => {
  assertEquals(validateExam(ex), []);
  assertEquals(ex.preguntas.length, 33);
  assertEquals(ex.secciones.length, 6);
  for (const s of ex.secciones) {
    assertEquals(ex.preguntas.some((p) => p.seccion === s.id), true, `sección vacía: ${s.id}`);
  }
});

Deno.test("las preguntas públicas no incluyen la respuesta correcta", () => {
  const pub = publicQuestions(ex);
  assertEquals(pub.total, 33);
  assertEquals(pub.preguntas.every((p) => !("correcta" in p) && !("explicacion" in p)), true);
  const txt = JSON.stringify(pub);
  assertEquals(txt.includes('"correcta"') || txt.includes('"explicacion"') || txt.includes('"retroalimentacion"'), false);
});

Deno.test("todo correcto = 100 % y A1 sólido", () => {
  const r = gradeExam(ex, todasCorrectas);
  assertEquals(r.correctas, 33);
  assertEquals(r.porcentaje, 100);
  assertEquals(r.nivelSugerido, "A1 sólido — listo para A2");
  assertEquals(r.fortalezas.length, 6);
  assertEquals(r.debilidades, []);
  assertEquals(r.revision, []);
});

Deno.test("sin respuestas = 0 % e Iniciando A1; todas las secciones a reforzar", () => {
  const r = gradeExam(ex, {});
  assertEquals(r.porcentaje, 0);
  assertEquals(r.nivelSugerido, "Iniciando A1");
  assertEquals(r.debilidades.length, 6);
  assertEquals(r.revision.length, 33);
  assertEquals(r.revision[0].tuRespuesta, null);
});

Deno.test("calificación por sección: fallar todo 'to be' deja esa sección en 0", () => {
  const resp = { ...todasCorrectas };
  ex.preguntas.filter((p) => p.seccion === "to-be").forEach((p) => { resp[p.id] = (p.correcta + 1) % p.opciones.length; });
  const r = gradeExam(ex, resp);
  const tobe = r.secciones.find((s) => s.id === "to-be")!;
  assertEquals(tobe.correctas, 0);
  assertEquals(r.correctas, 26);
  assertEquals(r.porcentaje, 79);
  assertEquals(r.nivelSugerido, "A1 en progreso");
  assertEquals(r.debilidades, ["Verbo to be"]);
  assertEquals(r.fortalezas.length, 5);
  assertEquals(tobe.estado, "debilidad");
  assertEquals(tobe.retroalimentacion, ex.secciones.find((s) => s.id === "to-be")!.retroalimentacion.debilidad);
  assertEquals(r.revision.length, 7);
});

Deno.test("revisión de errores: respuesta del alumno, correcta y explicación", () => {
  const r = gradeExam(ex, { ...todasCorrectas, "be-1": 0 }); // "is" en lugar de "am"
  assertEquals(r.revision.length, 1);
  assertEquals(r.revision[0].enunciado, "I ___ a student.");
  assertEquals(r.revision[0].tuRespuesta, "is");
  assertEquals(r.revision[0].correcta, "am");
  assertEquals(r.revision[0].explicacion.length > 0, true);
});

Deno.test("estado por tema: umbrales 80 / 60", () => {
  // 'orden' tiene 4 preguntas: 3/4 = 75 % → en progreso; 2/4 = 50 % → debilidad.
  const ord = ex.preguntas.filter((p) => p.seccion === "orden");
  const mal = (n: number) => { const r = { ...todasCorrectas }; ord.slice(0, n).forEach((p) => { r[p.id] = (p.correcta + 1) % p.opciones.length; }); return r; };
  assertEquals(gradeExam(ex, mal(1)).secciones.find((s) => s.id === "orden")!.estado, "en-progreso");
  assertEquals(gradeExam(ex, mal(2)).secciones.find((s) => s.id === "orden")!.estado, "debilidad");
  assertEquals(gradeExam(ex, mal(1)).enProgreso, ["Orden de la oración (S + V + C)"]);
});

Deno.test("sanitizeRespuestas descarta ids desconocidos e índices inválidos", () => {
  const r = sanitizeRespuestas(ex, { "alf-1": 1, "alf-2": 9, "nope": 0, "be-1": "2", "be-2": 1.5 });
  assertEquals(r, { "alf-1": 1 });
  assertEquals(sanitizeRespuestas(ex, null), {});
});

Deno.test("disponibilidad por fecha de CDMX", () => {
  assertEquals(isAvailable(ex, "2026-09-25"), false);
  assertEquals(isAvailable(ex, "2026-09-26"), true); // se puede adelantar
  assertEquals(ex.fechaLimite, "2026-09-27");
  assertEquals(isLate(ex, "2026-09-27"), false);
  assertEquals(isLate(ex, "2026-09-28"), true);
  // 27 sep 05:30 UTC = 26 sep 23:30 en CDMX (UTC-6): todavía no.
  assertEquals(mxToday(new Date("2026-09-27T05:30:00Z")), "2026-09-26");
  assertEquals(mxToday(new Date("2026-09-27T06:30:00Z")), "2026-09-27");
});

Deno.test("slugAlumno quita acentos y espacios", () => {
  assertEquals(slugAlumno("Jesús "), "jesus");
  assertEquals(slugAlumno("María José"), "maria-jose");
  assertEquals(slugAlumno(""), "sin-nombre");
});
