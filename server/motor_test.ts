import { assertEquals, assertNotEquals } from "jsr:@std/assert@1";
import { addIntento, estadoItem, grade, type Item, normalizeItem, normalizeText, publicQuestion, selectQuestions, temasAReforzar, temasRefuerzo, validateItem } from "./motor.ts";

const R = { fortaleza: "f", "en-progreso": "p", debilidad: "d" };
const banco = Array.from({ length: 20 }, (_, i) => ({
  id: `q${i}`, tema: i % 2 ? "b" : "a", tipo: "opcion" as const, enunciado: `Q${i}`, opciones: ["x", "y"], correcta: 1, explicacion: "e",
}));
const it: Item = {
  id: "act-x", tipo: "actividad", titulo: "X", disponibleDesde: "2026-09-28", fechaLimite: "2026-09-29", intentos: 2, preguntasPorIntento: 8,
  temas: [{ id: "a", titulo: "A", retroalimentacion: R }, { id: "b", titulo: "B", retroalimentacion: R }], banco,
};

Deno.test("selección determinista por alumno e intento", () => {
  const a1 = selectQuestions(banco, it, "marisol", 1).map((q) => q.id);
  assertEquals(a1, selectQuestions(banco, it, "marisol", 1).map((q) => q.id));
  assertEquals(a1.length, 8);
  assertNotEquals(a1, selectQuestions(banco, it, "angel", 1).map((q) => q.id));
  assertNotEquals(a1, selectQuestions(banco, it, "marisol", 2).map((q) => q.id));
});

Deno.test("selección repartida entre temas (4 y 4)", () => {
  const sel = selectQuestions(banco, it, "laura", 1);
  assertEquals(sel.filter((q) => q.tema === "a").length, 4);
  assertEquals(sel.filter((q) => q.tema === "b").length, 4);
});

Deno.test("selección limitada a temas (refuerzo)", () => {
  const sel = selectQuestions(banco, it, "jesus", 1, ["b"]);
  assertEquals(sel.every((q) => q.tema === "b"), true);
  assertEquals(sel.length, 8);
});

Deno.test("escribir: sin mayúsculas, acentos ni espacios extra", () => {
  const e = { id: "w", tema: "a", tipo: "escribir" as const, enunciado: "box →", aceptadas: ["boxes"], explicacion: "x" };
  assertEquals(grade(it, [e], { w: "  Boxes " }).porcentaje, 100);
  assertEquals(grade(it, [e], { w: "boxs" }).porcentaje, 0);
  assertEquals(normalizeText("  Mé  xico "), "me xico");
});

Deno.test("calificación con temas, estados y revisión", () => {
  const sel = banco.slice(0, 10); // 5 de a, 5 de b
  const resp = Object.fromEntries(sel.map((q) => [q.id, q.tema === "a" ? 1 : 0])); // a bien, b mal
  const c = grade(it, sel, resp);
  assertEquals(c.porcentaje, 50);
  assertEquals(c.fortalezas, ["A"]);
  assertEquals(c.debilidades, ["B"]);
  assertEquals(c.revision.length, 5);
  assertEquals(c.revision[0].correcta, "y");
  assertEquals(c.nivelSugerido, "Necesitas repasar");
});

Deno.test("público sin respuestas", () => {
  const p = publicQuestion({ id: "w", tema: "a", tipo: "escribir", enunciado: "x", aceptadas: ["y"], explicacion: "z" });
  assertEquals("aceptadas" in p || "explicacion" in p, false);
});

Deno.test("mejor intento y estados", () => {
  const cal = (p: number) => ({ ...grade(it, [], {}), porcentaje: p });
  let r = addIntento(null, it, "Marisol", { n: 1, enviadoEn: "t1", preguntas: [], respuestas: {}, calificacion: cal(50) });
  assertEquals(estadoItem(it, "2026-09-29", r), "en-curso");
  r = addIntento(r, it, "Marisol", { n: 2, enviadoEn: "t2", preguntas: [], respuestas: {}, calificacion: cal(80) });
  assertEquals(r.mejor!.porcentaje, 80);
  assertEquals(r.mejor!.n, 2);
  assertEquals(estadoItem(it, "2026-09-29", r), "completo");
  assertEquals(estadoItem(it, "2026-09-27", null), "proximamente");
  const r2 = addIntento(null, it, "A", { n: 1, enviadoEn: "t", preguntas: [], respuestas: {}, calificacion: cal(90) });
  assertEquals(addIntento(r2, it, "A", { n: 2, enviadoEn: "t", preguntas: [], respuestas: {}, calificacion: cal(40) }).mejor!.porcentaje, 90);
});

Deno.test("temas de refuerzo: del examen y, si no hay, del respaldo mapeado", () => {
  const ref: Item = { ...it, tipo: "refuerzo", mapeoTemas: { "presente-simple": "b" } };
  const mk = (secs: { id: string; estado: "debilidad" | "en-progreso" | "fortaleza" }[]) => ({ id: "x", titulo: "X", alumno: "L", intentos: [], mejor: { n: 1, ...grade(it, [], {}), secciones: secs.map((s) => ({ ...s, titulo: s.id, correctas: 0, total: 1, porcentaje: 0, retroalimentacion: "" })) } });
  assertEquals(temasRefuerzo(ref, mk([{ id: "a", estado: "debilidad" }, { id: "b", estado: "fortaleza" }]), null), ["a"]);
  assertEquals(temasRefuerzo(ref, null, mk([{ id: "presente-simple", estado: "debilidad" }])), ["b"]);
  assertEquals(temasRefuerzo(ref, null, null), []);
});

Deno.test("temas a reforzar acumulados: se queda el peor estado", () => {
  const mk = (titulo: string, estado: "debilidad" | "en-progreso", fuente: string) => ({ id: fuente, titulo: fuente, alumno: "J", intentos: [], mejor: { n: 1, ...grade(it, [], {}), secciones: [{ id: titulo, titulo, estado, correctas: 0, total: 1, porcentaje: 0, retroalimentacion: "" }] } });
  const t = temasAReforzar([mk("Presente simple", "en-progreso", "Act"), mk("Presente simple", "debilidad", "Diag"), mk("Plurales", "en-progreso", "Act")]);
  assertEquals(t.map((x) => `${x.titulo}:${x.estado}`), ["Presente simple:debilidad", "Plurales:en-progreso"]);
});

Deno.test("normaliza el formato del diagnóstico", () => {
  const d = normalizeItem({ id: "diag", titulo: "D", nivel: "A1", disponibleDesde: "2026-09-26", fechaLimite: "2026-09-27", secciones: [{ id: "a", titulo: "A", retroalimentacion: R }], preguntas: [{ id: "p1", seccion: "a", enunciado: "?", opciones: ["x", "y"], correcta: 0, explicacion: "e" }] });
  assertEquals(d.tipo, "examen");
  assertEquals(d.intentos, 1);
  assertEquals(d.banco![0].tema, "a");
  assertEquals(validateItem(d), []);
});
