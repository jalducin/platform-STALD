// Ruta del profe con la experiencia RPG (openspec: ingles-diseno-profe): reglas puras ADITIVAS de comun/gamificacion.js
// (catálogo de mundos de la ruta, mundo de cada clase del plan, mapa de la ruta, XP «a su ritmo» e insignias con el
// mapa propio). La ruta está toda abierta y las fechas son ritmo sugerido: ningún estado dice «bloqueado» ni «atrasada».
// deno-lint-ignore-file no-explicit-any
import { assertEquals } from "jsr:@std/assert@1";
import "../comun/gamificacion.js";

const G = (globalThis as any).Gamificacion;

// Plan de ejemplo con la forma de contenido/profe/plan.json (títulos inventados, mismos patrones).
const el = (id: string, titulo: string, tipo = "actividad") => ({ id, titulo, tipo, fecha: id.slice(-10) });
const plan = {
  titulo: "Ruta de ejemplo",
  semanas: [
    { id: "2026-10-19", titulo: "Semana 1", elementos: [el("p-act-2026-10-19", "Clase: base"), el("p-act-2026-10-21", "Pirámide de Minto 1: la respuesta primero"), el("p-act-2026-10-23", "Clase: Skills en Claude a fondo")] },
    { id: "2026-10-26", titulo: "Semana 2", elementos: [el("p-act-2026-10-26", "Clase: CLAUDE.md, prompts y skills"), el("p-ex-2026-10-31", "Examen corto · Semana 2", "examen")] },
    { id: "2026-11-02", titulo: "Semana 3", elementos: [el("p-act-2026-11-02", "Clase: OpenSpec")] },
  ],
};
const calif = (pct: number) => ({ correctas: pct, total: 100, porcentaje: pct, secciones: [{ titulo: "Tema", correctas: pct, total: 100, porcentaje: pct }] });
const item = (id: string, fechaLimite: string, extra: Record<string, unknown> = {}) => ({ id, tipo: "actividad", titulo: id, disponibleDesde: "2026-10-19", fechaLimite, estado: "disponible", intentosUsados: 0, mejor: null, ...extra });
const hecho = (pct: number) => ({ estado: "completo", intentosUsados: 1, mejor: calif(pct), mejorATiempo: false, ultimoEnvio: "2026-10-22T18:00:00Z" });

Deno.test("catálogo de mundos de la ruta del profe: 8 de semanas + Torre de Minto y Forja de Skills", () => {
  const ids = G.MUNDOS_RUTA_PROFE.map((w: any) => w.id);
  assertEquals(ids, ["taller-del-agente", "fabrica-de-specs", "red-de-conectores", "colmena-de-subagentes", "biblioteca-sdd", "arena-en-accion", "proyecto-integrador", "torre-de-minto", "forja-de-skills"]);
  assertEquals(G.MUNDOS_RUTA_PROFE[0].semanas, [1, 2]);
});

Deno.test("mundo de cada clase: el patrón del título gana; si no, la semana del plan", () => {
  assertEquals(G.mundoDeClaseRuta({ titulo: "Pirámide de Minto 2: escribir y revisar con IA" }, 2).id, "torre-de-minto");
  assertEquals(G.mundoDeClaseRuta({ titulo: "Clase: Skills en Claude a fondo" }, 1).id, "forja-de-skills");
  assertEquals(G.mundoDeClaseRuta({ titulo: "Clase: CLAUDE.md, prompts y skills, a fondo" }, 2).id, "taller-del-agente"); // «skills» en medio no es la Forja
  assertEquals(G.mundoDeClaseRuta({ titulo: "Clase: OpenSpec" }, 3).id, "fabrica-de-specs");
  assertEquals(G.mundoDeClaseRuta({ titulo: "Proyecto integrador" }, 8).id, "proyecto-integrador");
  assertEquals(G.mundoDeClaseRuta({ titulo: "Algo" }, 99), null);
});

Deno.test("mapa de la ruta: clases por mundo, hechas, total y estados sin «bloqueado»", () => {
  const items = [
    item("p-act-2026-10-19", "2026-10-19", hecho(90)), item("p-act-2026-10-21", "2026-10-21", hecho(100)),
    item("p-act-2026-10-23", "2026-10-23"), item("p-act-2026-10-26", "2026-10-26"), item("p-ex-2026-10-31", "2026-10-31", { tipo: "examen" }),
    item("p-act-2026-11-02", "2026-11-02"),
  ];
  const mapa = G.mapaRuta(plan, items, "2026-10-22");
  const de = (id: string) => mapa.find((w: any) => w.id === id);
  assertEquals([de("taller-del-agente").hechas, de("taller-del-agente").total], [1, 3]);
  assertEquals(de("taller-del-agente").estado, "en-curso"); // tiene hechas (y es la semana sugerida)
  assertEquals([de("torre-de-minto").estado, de("torre-de-minto").hechas, de("torre-de-minto").total], ["completado", 1, 1]);
  assertEquals(de("forja-de-skills").estado, "en-curso"); // sin hechas, pero su clase es de la semana sugerida de hoy
  assertEquals(de("fabrica-de-specs").estado, "abierto"); // sin hechas y fuera de la semana sugerida: abierto, no bloqueado
  assertEquals(de("red-de-conectores").total, 0); // sin clases en este plan de ejemplo
  assertEquals(mapa.some((w: any) => w.estado === "bloqueado"), false);
  assertEquals(G.mundoActualRuta(mapa).id, "taller-del-agente");
  // Cada clase del mapa trae el elemento del plan y su item (o null si aún no llega del servidor).
  assertEquals(de("torre-de-minto").clases[0].item.id, "p-act-2026-10-21");
});

Deno.test("XP de la ruta «a su ritmo»: cada clase hecha suma el bono de a tiempo (no hay atrasadas)", () => {
  const items = [item("a", "2026-10-01", hecho(80)), item("b", "2026-10-30")];
  assertEquals(G.xpRuta(items), 80 + G.XP_A_TIEMPO);
  assertEquals(G.xpRuta([]), 0);
});

Deno.test("insignias con un mapa propio: «Mundo completado» sale del mapa de la ruta, el resto igual", () => {
  const items = [item("p-act-2026-10-21", "2026-10-21", { ...hecho(100) })];
  const mapa = G.mapaRuta(plan, items, "2026-10-22");
  const ids = G.insigniasDe({ items, hoy: "2026-10-22", racha: 3, mapa }).map((i: any) => i.id);
  assertEquals(ids, ["primera-mision", "racha-3", "perfecto", "mundo-completado"]);
  // Sin `mapa`, igual que antes (Secundaria): estos items no son de ninguna materia, así que no hay mundo completado.
  assertEquals(G.insigniasDe({ items, hoy: "2026-10-22", racha: 3 }).map((i: any) => i.id), ["primera-mision", "racha-3", "perfecto"]);
});
