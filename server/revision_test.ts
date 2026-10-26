// Revisión de la semana por el profe (openspec: revision-profe): reglas compartidas (comun/revision-datos.js) y rutas
// GET/PUT /profe/revision, más el campo `revision` en la lista de la alumna.
// deno-lint-ignore-file no-explicit-any
import { assert, assertEquals } from "jsr:@std/assert@1";
import "../comun/gamificacion.js"; // materias (resumen por materia)
import "../comun/revision-datos.js";

const RD = (globalThis as any).RevisionDatos;

// ---------- Fórmula y resumen (comun/revision-datos.js) ----------
const clase = (extra: Record<string, unknown> = {}) => ({ id: "c", materia: "Matemáticas", titulo: "📐 Matemáticas · x", intentosUsados: 0, mejor: null, revision: null, ...extra });

Deno.test("revision-datos: la final es el promedio simple de la en línea (0–10) y la del profe", () => {
  assertEquals(RD.FORMULA_FINAL, { pesoEnLinea: 1, pesoProfe: 1 });
  assertEquals(RD.finalDe(clase({ intentosUsados: 1, mejor: { porcentaje: 80 }, revision: { calificacion: 9 } })), 8.5);
  assertEquals(RD.finalDe(clase({ intentosUsados: 1, mejor: { porcentaje: 77 }, revision: { calificacion: 10 } })), 8.9); // 8.85 → 8.9
  // Nunca la envió: la en línea cuenta 0.
  assertEquals(RD.finalDe(clase({ revision: { calificacion: 8 } })), 4);
  // Sin calificación del profe no hay final.
  assertEquals(RD.finalDe(clase({ intentosUsados: 1, mejor: { porcentaje: 70 } })), null);
  assertEquals(RD.finalDe(clase({ intentosUsados: 1, mejor: { porcentaje: 70 }, revision: { calificacion: null, comentario: "x" } })), null);
});

Deno.test("revision-datos: la fórmula se cambia en un solo lugar", () => {
  const antes = { ...RD.FORMULA_FINAL };
  try {
    RD.FORMULA_FINAL.pesoEnLinea = 1; RD.FORMULA_FINAL.pesoProfe = 3;
    assertEquals(RD.finalDe(clase({ intentosUsados: 1, mejor: { porcentaje: 60 }, revision: { calificacion: 10 } })), 9);
  } finally { Object.assign(RD.FORMULA_FINAL, antes); }
});

Deno.test("revision-datos: calificación válida de 0 a 10 de medio en medio", () => {
  for (const ok of [0, 0.5, 7, 9.5, 10]) assert(RD.calificacionValida(ok), String(ok));
  for (const mal of [-0.5, 10.5, 9.3, NaN, "9", null, undefined]) assert(!RD.calificacionValida(mal), String(mal));
  assertEquals(RD.MAX_COMENTARIO, 300);
});

Deno.test("revision-datos: resumen de la semana (enviadas, revisadas, promedios y pendientes)", () => {
  const clases = [
    clase({ id: "a", intentosUsados: 1, mejor: { porcentaje: 80 }, revision: { calificacion: 9 } }), // final 8.5
    clase({ id: "b", intentosUsados: 1, mejor: { porcentaje: 60 } }), // enviada sin revisar → pendiente
    clase({ id: "c", materia: "Español", titulo: "📖 Español · y", intentosUsados: 2, mejor: { porcentaje: 100 }, revision: { calificacion: 7 } }), // 8.5
    clase({ id: "d", materia: "Español", titulo: "📖 Español · z" }), // sin abrir
  ];
  const r = RD.resumenSemana(clases);
  assertEquals([r.clases, r.enviadas, r.revisadas, r.pendientes], [4, 3, 2, 1]);
  assertEquals(r.promedio, 8.5);
  assertEquals(r.porMateria.map((m: any) => [m.nombre, m.promedio, m.revisadas, m.clases]), [["Matemáticas", 8.5, 1, 2], ["Español", 8.5, 1, 2]]);
  assertEquals(RD.resumenSemana([]).promedio, null);
});

Deno.test("revision-datos: misiones con algún paso que vence en la semana", () => {
  const m = (id: string, ...fechas: string[]) => ({ id, pasos: fechas.map((f, i) => ({ id: "p" + i, fechaLimite: f })) });
  const lista = [m("antes", "2026-10-20"), m("dentro", "2026-10-20", "2026-10-28"), m("despues", "2026-11-03"), m("borde", "2026-11-01")];
  assertEquals(RD.misionesDeSemana(lista, "2026-10-26").map((x: any) => x.id), ["dentro", "borde"]);
  assertEquals(RD.misionesDeSemana(null, "2026-10-26"), []);
});
