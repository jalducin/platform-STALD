// Gamificación de la Fase 2a (openspec: rpg-fase2-misiones): XP de misión en el mismo total, mapa con catálogo,
// misiones diarias y semanales sin XP, insignias de misión y árbol de habilidades (comun/gamificacion.js, aditivo).
// deno-lint-ignore-file no-explicit-any
import { assertEquals } from "jsr:@std/assert@1";
import "../comun/gamificacion.js";

const G = (globalThis as any).Gamificacion;

const calif = (secs: [string, number, number, string?][]) => {
  const correctas = secs.reduce((a, s) => a + s[1], 0), total = secs.reduce((a, s) => a + s[2], 0);
  return {
    correctas, total, porcentaje: Math.round(correctas * 100 / total),
    secciones: secs.map(([titulo, c, t, estado]) => ({ titulo, correctas: c, total: t, porcentaje: Math.round(c * 100 / t), estado: estado || "en-progreso" })),
  };
};
const clase = (id: string, dia: string, extra: Record<string, unknown> = {}) => ({
  id, tipo: "actividad", titulo: "📐 Matemáticas · " + id, materia: "Matemáticas", disponibleDesde: dia, fechaLimite: G.sumarDias(dia, 1),
  estado: "disponible", intentosUsados: 0, mejor: null, ...extra,
});
const hecha = (c: any, envio = "2026-10-27T18:00:00Z") => ({ estado: "completo", intentosUsados: 1, mejor: c, mejorATiempo: true, ultimoEnvio: envio });
const mision = (evaluacion: unknown, extra: Record<string, unknown> = {}) => ({ id: "mis-matematicas-valle-de-los-numeros", titulo: "Misión de prueba", mundo: "valle-de-los-numeros", evaluacion, ...extra });

Deno.test("XP de misión: rúbrica × 3 + 60 si el último paso fue a tiempo; sin evaluar, 0", () => {
  assertEquals(G.xpDeMision(mision({ porcentaje: 85, aTiempo: true })), 315);
  assertEquals(G.xpDeMision(mision({ porcentaje: 60, aTiempo: false })), 180);
  assertEquals(G.xpDeMision({ porcentaje: 100, aTiempo: true }), 360);
  assertEquals(G.xpDeMision(mision(null)), 0);
  assertEquals(G.xpDeMision(null), 0);
  assertEquals(G.xpDeMision({ porcentaje: 140, aTiempo: false }), 300); // nunca pasa de 100 %
});

Deno.test("XP total con misiones: el mismo total de las clases; 300 + 315 → nivel 3", () => {
  const items = [clase("a", "2026-10-26", hecha(calif([["T", 10, 10]]))), clase("b", "2026-10-27", hecha(calif([["T", 10, 10]]))), clase("c", "2026-10-28", hecha(calif([["T", 4, 10]])))];
  assertEquals(G.xpTotal(items), 300); // la regla de Fase 1 no cambia
  const total = G.xpTotalConMisiones(items, [mision({ porcentaje: 85, aTiempo: true })]);
  assertEquals([total, G.nivelDe(total).nivel], [615, 3]);
});

Deno.test("catálogo de mundos: derivado de MUNDOS, con ids sin acentos y Estudio y Arena por materia", () => {
  const cat = G.catalogoDeMundos();
  const valle = cat.find((w: any) => w.id === "valle-de-los-numeros");
  assertEquals([valle.materia, valle.nombre, valle.emoji, valle.desde, valle.hasta], ["Matemáticas", "Valle de los Números", "🔢", "2026-10-26", "2026-11-22"]);
  assertEquals(cat.filter((w: any) => w.nombre === "Estudio y Arena").map((w: any) => w.id), ["estudio-y-arena-artes", "estudio-y-arena-edfisica"]);
  assertEquals(new Set(cat.map((w: any) => w.id)).size, cat.length);
  assertEquals(cat.find((w: any) => w.id === "isla-del-alfabeto").desde, null);
});

Deno.test("mapa RPG: clase del 3 de nov en la zona 1 del Valle; Geometría bloqueada el 10 de nov", () => {
  const items = [clase("fracciones", "2026-11-03")];
  const mate = G.mapaRpg(items, "2026-11-10", { catalogo: G.catalogoDeMundos() }).find((m: any) => m.clave === "matematicas");
  const valle = mate.mundos[0];
  assertEquals([valle.nombre, valle.estado, valle.zonas[0].n, valle.zonas[0].capitulos.map((c: any) => c.id)], ["Valle de los Números", "en-curso", 1, ["fracciones"]]);
  assertEquals([mate.mundos[1].nombre, mate.mundos[1].estado, mate.mundos[1].desde], ["Ciudad de las Formas", "bloqueado", "2026-11-23"]);
  // La clase con campo `mundo` va a ese mundo aunque su fecha diga otra cosa.
  const conMundo = G.mapaRpg([clase("x", "2026-11-03", { mundo: "ciudad-de-las-formas" })], "2026-11-10", {}).find((m: any) => m.clave === "matematicas");
  assertEquals([conMundo.mundos[0].total, conMundo.mundos[1].total], [0, 1]);
  // Sin catálogo (ilegible): la derivación de la Fase 1, con los mismos nombres.
  assertEquals(G.mapaRpg(items, "2026-11-10", { catalogo: null }).find((m: any) => m.clave === "matematicas").mundos.map((w: any) => w.nombre), ["Valle de los Números", "Ciudad de las Formas", "Torre de las Incógnitas"]);
});

Deno.test("mapa RPG: completado con la misión evaluada, dominado con ≥ 80 % y misión ≥ 80 %, en curso sin evaluar", () => {
  const items = [clase("a", "2026-10-27", hecha(calif([["T", 9, 10]]))), clase("b", "2026-11-10", hecha(calif([["T", 8, 10]])))];
  const estado = (m: unknown[]) => G.mapaRpg(items, "2026-11-25", { catalogo: G.catalogoDeMundos(), misiones: m }).find((x: any) => x.clave === "matematicas").mundos[0].estado;
  assertEquals(estado([mision(null)]), "en-curso"); // terminó su fecha pero la misión no está evaluada
  assertEquals(estado([mision({ porcentaje: 70, aTiempo: true })]), "completado");
  assertEquals(estado([mision({ porcentaje: 85, aTiempo: true })]), "dominado");
  assertEquals(estado([]), "dominado"); // sin misión principal: la regla de clases (todas hechas, promedio 85 %)
});

Deno.test("misión diaria: las que abren hoy (2/2) y no da XP", () => {
  const hoy = "2026-10-27";
  const items = [clase("a", hoy, hecha(calif([["T", 9, 10]]))), clase("b", hoy, hecha(calif([["T", 7, 10]]))), clase("c", "2026-10-28")];
  const d = G.misionDiaria(items, hoy);
  assertEquals([d.hechas, d.total, d.completa, d.xp], [2, 2, true, 0]);
});

Deno.test("misiones semanales: clases de la semana, paso de misión y tema mejorado; ninguna da XP", () => {
  const hoy = "2026-10-29"; // jueves; semana 26 oct – 1 nov
  const items = [
    clase("a", "2026-10-26", { ...hecha(calif([["Porcentajes", 3, 10, "debilidad"]]), "2026-10-26T18:00:00Z"), temas: ["Porcentajes"] }),
    clase("b", "2026-10-28", { ...hecha(calif([["Porcentajes", 9, 10, "fortaleza"]]), "2026-10-28T18:00:00Z"), temas: ["Porcentajes"] }),
    clase("c", "2026-10-30"),
  ];
  const m = [mision(null, { entrega: { pasos: { p1: { enviadoEn: "2026-10-27T20:00:00Z" } } } })];
  const s = G.misionesSemanales(items, m, hoy);
  assertEquals(s.map((x: any) => x.id + ":" + x.hechas + "/" + x.total + ":" + x.completa + ":" + x.xp),
    ["semana-clases:2/3:false:0", "semana-paso:1/1:true:0", "semana-debilidad:1/1:true:0"]);
});

Deno.test("insignia «Semana completa»: al terminar todas las clases de una semana; la XP no cambia", () => {
  const items = [clase("a", "2026-10-26", hecha(calif([["T", 9, 10]]))), clase("b", "2026-10-28", hecha(calif([["T", 7, 10]])))];
  const ids = (e: any) => G.insigniasRpgDe(e).map((i: any) => i.id).join();
  assertEquals(ids({ items, hoy: "2026-10-29" }), "semana-completa");
  assertEquals(ids({ items: [...items, clase("c", "2026-10-30")], hoy: "2026-10-29" }), "");
  assertEquals(G.xpTotal(items), 200); // (90 + 20) + (70 + 20): igual con o sin insignia
  const conMision = ids({ items, hoy: "2026-11-25", catalogo: G.catalogoDeMundos(), misiones: [mision({ porcentaje: 90, aTiempo: true })] });
  assertEquals(conMision, "semana-completa,mision-principal,constructora-mundos");
});

Deno.test("árbol: tema débil a reforzar con su repaso; tema de una clase que no abre, bloqueado y sin calificación", () => {
  const hoy = "2026-11-05";
  const items = [
    clase("porc", "2026-11-02", { ...hecha(calif([["Porcentajes", 4, 10, "debilidad"]]), "2026-11-02T18:00:00Z"), temas: ["Porcentajes"] }),
    clase("frac", "2026-11-03", { ...hecha(calif([["Fracciones", 9, 10, "fortaleza"]]), "2026-11-03T18:00:00Z"), temas: ["Fracciones"] }),
    clase("repaso", "2026-11-04", { tipo: "refuerzo", titulo: "📐 Matemáticas · Repaso de porcentajes", temas: ["Porcentajes"] }),
    clase("deci", "2026-11-10", { temas: ["Decimales"] }),
  ];
  const valle = G.arbolHabilidades(items, hoy, { catalogo: G.catalogoDeMundos() }).find((m: any) => m.clave === "matematicas").mundos[0];
  const nodo = (t: string) => valle.nodos.find((n: any) => n.tema === t);
  assertEquals([nodo("Porcentajes").estado, nodo("Porcentajes").repasoId], ["reforzar", "repaso"]);
  assertEquals([nodo("Fracciones").estado, nodo("Fracciones").porcentaje], ["dominado", 90]);
  assertEquals([nodo("Decimales").estado, nodo("Decimales").bloqueado, nodo("Decimales").porcentaje], ["no-visto", true, null]);
});
