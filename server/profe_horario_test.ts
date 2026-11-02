// Horario y materias de la ruta del profe (openspec: profe-horario-materias): reglas puras de
// comun/profe-horario-datos.js. Materia de cada elemento (campo `materia` o respaldo por nivel y prefijo del id),
// estado de cada tarea (pendiente, hecha, vencida o adelantada), semana por días con los días de oficina, agrupación
// por materia y línea, y progreso por materia (con el resumen de plan.json si viene).
// deno-lint-ignore-file no-explicit-any
import { assertEquals } from "jsr:@std/assert@1";
import "../comun/profe-horario-datos.js";

const H = (globalThis as any).ProfeHorario;

Deno.test("respaldo de materia por prefijo del id", () => {
  const casos: [string, string | null, string][] = [
    ["profe-ing-a1-repaso-1", "Inglés A1", "Inglés"],
    ["profe-ing-examen-2027-01-15", "Inglés B1", "Inglés"],
    ["act-2026-10-20", null, "Inglés"],
    ["tec-2026-10-22", null, "Inglés"],
    ["refuerzo-2026-10-24", null, "Inglés"],
    ["examen-2026-10-23", null, "Inglés"],
    ["guia-semana-3", null, "Inglés"],
    ["profe-lid-caso-1", "Liderazgo", "Tech Lead"],
    ["profe-cg-2026-11-10", null, "Cultura General"],
    ["profe-act-2026-11-04", "Claude Code", "IA · Agentic Engineer"],
    ["profe-rag-2026-11-20", "RAG", "IA · Agentic Engineer"],
    ["profe-loop-2026-11-21", "Claude Code", "IA · Agentic Engineer"],
    ["profe-act-2026-12-01", null, "IA · Agentic Engineer"],
  ];
  for (const [id, nivel, esperada] of casos) assertEquals(H.materiaPorRespaldo(id, nivel), esperada, id);
});

Deno.test("respaldo de materia de profe-staff- y profe-ref- según su nivel", () => {
  assertEquals(H.materiaPorRespaldo("profe-staff-2026-11-05", "Staff Engineer y Tech Lead"), "Staff Software Engineer");
  assertEquals(H.materiaPorRespaldo("profe-staff-2026-11-06", null), "Staff Software Engineer");
  assertEquals(H.materiaPorRespaldo("profe-ref-2026-11-05", "Refuerzo · Minto"), "Tech Lead");
  assertEquals(H.materiaPorRespaldo("profe-ref-2026-11-06", "Refuerzo · Python"), "Staff Software Engineer");
  assertEquals(H.materiaPorRespaldo("profe-ref-2026-11-07", "Refuerzo · System design y seguridad"), "Staff Software Engineer");
  assertEquals(H.materiaPorRespaldo("profe-ref-2026-11-08", "Inglés B1"), "Inglés");
  assertEquals(H.materiaPorRespaldo("profe-ref-2026-11-09", "Refuerzo · IA"), "IA · Agentic Engineer");
  // Entrevista de Python: nivel de Staff aunque el prefijo sea profe-act-.
  assertEquals(H.materiaPorRespaldo("profe-act-2026-11-10", "Entrevista · Python Senior"), "Staff Software Engineer");
  // Exámenes semanales y diagnóstico: Evaluación.
  assertEquals(H.materiaPorRespaldo("profe-examen-semanal-2026-11-07", "Examen semanal"), "Evaluación");
  assertEquals(H.materiaPorRespaldo("profe-examen-diagnostico-2026-11-02", "Diagnóstico"), "Evaluación");
  // AI Assessment (profe-sdd-, nivel «Refuerzo · SDD»): Evaluación por su título; el resto de profe-sdd-, IA.
  assertEquals(H.materiaPorRespaldo("profe-sdd-2026-11-03", "Refuerzo · SDD", "AI Assessment: ¿en qué nivel estás? (inicio)"), "Evaluación");
  assertEquals(H.materiaPorRespaldo("profe-sdd-2026-11-26", "Refuerzo · SDD", "Drill de 20 casos de SDD"), "IA · Agentic Engineer");
});

Deno.test("el campo `materia` manda sobre el respaldo (del elemento o del plan)", () => {
  assertEquals(H.materiaDe({ id: "profe-act-1", materia: "Cultura General" }, { id: "profe-act-1", nivel: "Claude Code" }), "Cultura General");
  assertEquals(H.materiaDe({ id: "profe-act-1" }, { id: "profe-act-1", nivel: "Claude Code", materia: "Tech Lead" }), "Tech Lead");
  assertEquals(H.materiaDe({ id: "profe-act-1" }, null), "IA · Agentic Engineer");
  assertEquals(H.materiaDe({ id: "profe-act-1", materia: "  " }, null), "IA · Agentic Engineer"); // vacía = sin materia
});

Deno.test("info de materia: catálogo con clave, ícono y orden; una desconocida conserva su nombre", () => {
  assertEquals(H.infoMateria("Inglés").clave, "ingles");
  assertEquals(H.infoMateria("ingles").nombre, "Inglés");
  assertEquals(H.infoMateria("IA · Agentic Engineer").clave, "ia");
  assertEquals(H.infoMateria("Staff Software Engineer").clave, "staff");
  assertEquals(H.infoMateria("Tech Lead").clave, "lead");
  assertEquals(H.infoMateria("Cultura General").clave, "cultura");
  assertEquals(H.infoMateria("Evaluación").clave, "evaluacion");
  const otra = H.infoMateria("Finanzas");
  assertEquals([otra.clave, otra.nombre], ["otra", "Finanzas"]);
  for (const m of H.MATERIAS_PROFE) assertEquals(typeof m.icono === "string" && m.icono.length > 0, true, m.nombre);
});

Deno.test("estado de una tarea: pendiente, hecha, vencida o adelantada", () => {
  const hoy = "2026-11-04";
  assertEquals(H.estadoTarea({ fecha: "2026-11-05", item: { estado: "disponible", intentosUsados: 0 } }, hoy), "pendiente");
  assertEquals(H.estadoTarea({ fecha: "2026-11-04", item: { estado: "disponible", intentosUsados: 0 } }, hoy), "pendiente"); // hoy aún no vence
  assertEquals(H.estadoTarea({ fecha: "2026-11-03", item: { estado: "disponible", intentosUsados: 0 } }, hoy), "vencida");
  assertEquals(H.estadoTarea({ fecha: "2026-11-03", item: null }, hoy), "vencida");
  assertEquals(H.estadoTarea({ fecha: "2026-11-03", item: { estado: "completo", intentosUsados: 1, ultimoEnvio: "2026-11-03T18:00:00Z" } }, hoy), "hecha");
  assertEquals(H.estadoTarea({ fecha: "2026-11-08", item: { estado: "completo", intentosUsados: 1, ultimoEnvio: "2026-11-04T18:00:00Z" } }, hoy), "adelantada");
  assertEquals(H.estadoTarea({ fecha: "2026-11-08", item: { estado: "completo", intentosUsados: 1, ultimoEnvio: null } }, hoy), "hecha");
});

Deno.test("fechas: lunes de la semana, días de oficina (martes y jueves) y máximo por día", () => {
  assertEquals(H.lunesDe("2026-11-02"), "2026-11-02"); // lunes
  assertEquals(H.lunesDe("2026-11-08"), "2026-11-02"); // domingo → lunes anterior
  assertEquals(H.lunesDe("2026-11-04"), "2026-11-02");
  assertEquals(H.sumarDias("2026-11-02", 7), "2026-11-09");
  // Días de oficina: solo los de plan.diasOficina (la regla cambió de mar/jue a lun/mar el 9 nov); sin el campo, ninguno.
  const ofi = H.diasOficinaDe({ diasOficina: ["2026-11-03", "2026-11-05", "2026-11-09", "2026-11-10", "no-es-fecha"] });
  assertEquals([...ofi], ["2026-11-03", "2026-11-05", "2026-11-09", "2026-11-10"]);
  assertEquals(H.esOficina("2026-11-03", ofi), true); // martes
  assertEquals(H.esOficina("2026-11-09", ofi), true); // lunes, con la regla nueva
  assertEquals(H.esOficina("2026-11-12", ofi), false); // jueves ya no
  assertEquals(H.esOficina("2026-11-03", H.diasOficinaDe({})), false); // sin el campo: no hay oficina
  assertEquals(H.maxDelDia("2026-11-03", ofi), 2);
  assertEquals(H.maxDelDia("2026-11-08", ofi), 4);
  assertEquals(H.maxDelDia("2026-11-03", undefined), 4);
  assertEquals(H.nombreDia("2026-11-03"), "Martes 3 nov");
  assertEquals(H.fechaCorta("2027-01-19"), "19 ene 2027");
  assertEquals(H.rangoSemana("2026-11-02"), "2 – 8 nov 2026");
  assertEquals(H.rangoSemana("2026-11-30"), "30 nov – 6 dic 2026");
  assertEquals(H.rangoSemana("2026-12-28"), "28 dic 2026 – 3 ene 2027");
});

// Act de ejemplo con la forma de /ingles/profe/actividades (títulos inventados).
const el = (id: string, fecha: string, extra: Record<string, unknown> = {}) => ({ id, tipo: "actividad", titulo: "Clase " + id, fecha, ...extra });
const it = (id: string, extra: Record<string, unknown> = {}) => ({ id, tipo: "actividad", titulo: "Clase " + id, nivel: "Claude Code", estado: "disponible", intentosUsados: 0, mejor: null, ...extra });
const act = {
  hoy: "2026-11-04",
  plan: {
    titulo: "Ruta",
    semanas: [
      { id: "2026-10-26", n: 2, elementos: [el("profe-act-2026-10-27", "2026-10-27"), el("profe-ing-1", "2026-10-28")] },
      { id: "2026-11-02", n: 3, elementos: [el("profe-ing-2", "2026-11-03"), el("profe-lid-1", "2026-11-04"), el("profe-act-2026-11-06", "2026-11-06"), el("profe-cg-1", "2026-11-08", { materia: "Cultura General", linea: "Historia" })] },
      { id: "2026-11-09", n: 4, elementos: [el("profe-act-2026-11-10", "2026-11-10")] },
    ],
  },
  items: [
    it("profe-act-2026-10-27", { estado: "completo", intentosUsados: 1, ultimoEnvio: "2026-10-27T18:00:00Z" }),
    it("profe-ing-1", { nivel: "Inglés A1" }),
    it("profe-ing-2", { nivel: "Inglés A1", estado: "completo", intentosUsados: 1, ultimoEnvio: "2026-11-03T15:00:00Z" }),
    it("profe-lid-1", { nivel: "Liderazgo" }),
    it("profe-act-2026-11-06", { estado: "completo", intentosUsados: 1, ultimoEnvio: "2026-11-04T10:00:00Z" }),
    it("profe-cg-1", { nivel: "Cultura" }),
    it("profe-act-2026-11-10"),
    it("act-2026-11-06", { grupo: true, nivel: "A1", fechaLimite: "2026-11-05" }), // del grupo: su fecha es la del profe
  ],
};

Deno.test("tareas: las del plan y las del grupo, en orden de fecha, con materia, línea, semana y estado", () => {
  const ts = H.tareasRuta(act);
  assertEquals(ts.map((t: any) => t.id), ["profe-act-2026-10-27", "profe-ing-1", "profe-ing-2", "profe-lid-1", "act-2026-11-06", "profe-act-2026-11-06", "profe-cg-1", "profe-act-2026-11-10"]);
  const gr = ts.find((t: any) => t.id === "act-2026-11-06");
  assertEquals([gr.grupo, gr.materia, gr.linea, gr.fecha, gr.estado], [true, "Inglés", "Inglés con el grupo", "2026-11-05", "pendiente"]);
  // `plan.materiaDelGrupo` manda para lo del grupo.
  assertEquals(H.tareasRuta({ ...act, plan: { ...act.plan, materiaDelGrupo: "Cultura General" } }).find((t: any) => t.grupo).materia, "Cultura General");
  const cg = ts.find((t: any) => t.id === "profe-cg-1");
  assertEquals([cg.materia, cg.linea, cg.semana, cg.estado], ["Cultura General", "Historia", 3, "pendiente"]);
  const ing = ts.find((t: any) => t.id === "profe-ing-1");
  assertEquals([ing.materia, ing.linea, ing.estado], ["Inglés", "Inglés A1", "vencida"]);
  assertEquals(ts.find((t: any) => t.id === "profe-act-2026-11-06").estado, "adelantada");
  assertEquals(H.tareasRuta({ items: [] }), []); // sin plan: nada
});

Deno.test("semana del horario: 7 días de lunes a domingo, hoy, oficina, máximo y filtro por materia", () => {
  const ts = H.tareasRuta(act);
  const dias = H.semanaHorario(ts, "2026-11-02", act.hoy, null, ["2026-11-03", "2026-11-05"]);
  assertEquals(dias.length, 7);
  assertEquals(dias.map((d: any) => d.fecha)[0], "2026-11-02");
  assertEquals(dias.filter((d: any) => d.esHoy).map((d: any) => d.fecha), ["2026-11-04"]);
  assertEquals(dias.filter((d: any) => d.oficina).map((d: any) => d.fecha), ["2026-11-03", "2026-11-05"]);
  assertEquals(dias.map((d: any) => d.max), [4, 2, 4, 2, 4, 4, 4]);
  assertEquals(H.semanaHorario(ts, "2026-11-02", act.hoy, null, undefined).some((d: any) => d.oficina), false); // sin diasOficina
  assertEquals(dias[1].tareas.map((t: any) => t.id), ["profe-ing-2"]);
  assertEquals(dias[3].tareas.map((t: any) => t.id), ["act-2026-11-06"]);
  const soloIa = H.semanaHorario(ts, "2026-11-02", act.hoy, "IA · Agentic Engineer");
  assertEquals(soloIa.flatMap((d: any) => d.tareas.map((t: any) => t.id)), ["profe-act-2026-11-06"]);
  assertEquals(H.rangoSemanas(ts), { min: "2026-10-26", max: "2026-11-09" });
  assertEquals(H.rangoSemanas([]), null);
});

Deno.test("progreso por materia: hechas / totales y fecha de cierre (la última fecha), en el orden del catálogo", () => {
  const p = H.progresoPorMateria(H.tareasRuta(act), null);
  assertEquals(p.map((x: any) => [x.materia, x.hechas, x.total, x.cierre]), [
    ["Inglés", 1, 3, "2026-11-05"],
    ["IA · Agentic Engineer", 2, 3, "2026-11-10"],
    ["Tech Lead", 0, 1, "2026-11-04"],
    ["Cultura General", 0, 1, "2026-11-08"],
  ]);
  assertEquals(p[1].pct, 67);
});

Deno.test("progreso por materia: usa el resumen de plan.json (arreglo u objeto) para el cierre y el total", () => {
  const ts = H.tareasRuta(act);
  const conArreglo = H.progresoPorMateria(ts, [{ nombre: "Inglés", cierre: "2027-01-31", total: 40 }, { materia: "Staff Software Engineer", cierre: "2027-01-15" }]);
  const ingles = conArreglo.find((x: any) => x.materia === "Inglés");
  assertEquals([ingles.hechas, ingles.total, ingles.cierre], [1, 40, "2027-01-31"]);
  // Una materia del resumen sin tareas publicadas aparece con 0 hechas.
  const staff = conArreglo.find((x: any) => x.materia === "Staff Software Engineer");
  assertEquals([staff.hechas, staff.total, staff.cierre], [0, 0, "2027-01-15"]);
  const conObjeto = H.progresoPorMateria(ts, { "Tech Lead": { fechaCierre: "2026-12-20", total: 5 } });
  const lead = conObjeto.find((x: any) => x.materia === "Tech Lead");
  assertEquals([lead.hechas, lead.total, lead.cierre, lead.pct], [0, 5, "2026-12-20", 0]);
  // El total del resumen nunca queda debajo de las tareas que ya existen.
  // Forma que escribe el repo de datos: { materia, elementos, inicio, fin }.
  const delRepo = H.progresoPorMateria(ts, [{ materia: "Tech Lead", elementos: 17, inicio: "2026-11-02", fin: "2027-01-21" }]);
  const lead2 = delRepo.find((x: any) => x.materia === "Tech Lead");
  assertEquals([lead2.total, lead2.cierre], [17, "2027-01-21"]);
  const corto = H.progresoPorMateria(ts, [{ nombre: "IA · Agentic Engineer", total: 1 }]);
  assertEquals(corto.find((x: any) => x.materia === "IA · Agentic Engineer").total, 3);
});

Deno.test("agrupación por materia y, dentro, por línea en orden de fecha", () => {
  const g = H.agruparPorMateria(H.tareasRuta(act), null);
  assertEquals(g.map((m: any) => m.materia), ["Inglés", "IA · Agentic Engineer", "Tech Lead", "Cultura General"]);
  const ia = g.find((m: any) => m.materia === "IA · Agentic Engineer");
  assertEquals(g[0].lineas.map((l: any) => l.linea), ["Inglés A1", "Inglés con el grupo"]);
  assertEquals(ia.lineas.map((l: any) => [l.linea, l.tareas.map((t: any) => t.id)]), [["Claude Code", ["profe-act-2026-10-27", "profe-act-2026-11-06", "profe-act-2026-11-10"]]]);
  assertEquals(H.agruparPorMateria(H.tareasRuta(act), "Tech Lead").map((m: any) => m.materia), ["Tech Lead"]);
});
