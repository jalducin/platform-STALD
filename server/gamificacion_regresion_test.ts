// Los 10 casos fijos de regresión de XP, nivel y racha (openspec: plataforma-rpg, tarea 2.3). Fijan las reglas de la
// Fase 1 (comun/gamificacion.js y calcularRacha de server/motor.ts) como invariante: las fases 2 a 4 solo SUMAN XP de
// misiones al mismo total; si alguno de estos casos cambia, primero se actualiza el spec (base-standards §7).
// deno-lint-ignore-file no-explicit-any
import { assertEquals } from "jsr:@std/assert@1";
import "../comun/gamificacion.js";
import { calcularRacha } from "./motor.ts";

const G = (globalThis as any).Gamificacion;

// Calificación con secciones como la del servidor: [titulo, correctas, total].
const calif = (secs: [string, number, number][]) => {
  const correctas = secs.reduce((a, s) => a + s[1], 0), total = secs.reduce((a, s) => a + s[2], 0);
  return { correctas, total, porcentaje: Math.round(correctas * 100 / total), secciones: secs.map(([titulo, c, t]) => ({ titulo, correctas: c, total: t })) };
};

Deno.test("regresión 1: clase a tiempo con 85 % sin tema 🎯 da 105 XP", () => {
  assertEquals(G.xpDeClase({}, calif([["Fracciones", 17, 20]]), { aTiempo: true }), 105);
});

Deno.test("regresión 2: mini examen 🎯 tardío con 70 % da 140 XP (cada acierto 🎯 cuenta otra vez, sin bono)", () => {
  assertEquals(G.xpDeClase({}, calif([["🎯 Repaso de aritmética", 7, 10]]), { aTiempo: false }), 140);
});

Deno.test("regresión 3: clase con tema 🎯 a tiempo: round(100 × (13 + 4) / 16) + 20 = 126", () => {
  assertEquals(G.xpDeClase({}, calif([["Divisibilidad", 9, 12], ["🎯 Mini examen", 4, 4]]), { aTiempo: true }), 126);
});

Deno.test("regresión 4: el bono de 20 a tiempo NO se duplica en un mini examen 🎯 perfecto (220, no 240)", () => {
  assertEquals(G.xpDeClase({}, calif([["🎯 Mini examen", 10, 10]]), { aTiempo: true }), 220);
});

Deno.test("regresión 5: clase vencida sin intento da 0 XP y no resta", () => {
  const vencida = { id: "v", titulo: "📐 Matemáticas · x", disponibleDesde: "2026-10-26", fechaLimite: "2026-10-27", estado: "vencido", intentosUsados: 0, mejor: null };
  const hecha = { id: "h", titulo: "📐 Matemáticas · y", disponibleDesde: "2026-10-26", fechaLimite: "2026-10-27", estado: "completo", intentosUsados: 1, mejor: calif([["T", 10, 10]]), mejorATiempo: true };
  assertEquals(G.xpTotal([vencida]), 0);
  assertEquals(G.xpTotal([vencida, hecha]), 120);
});

Deno.test("regresión 6: subir de nivel de 290 a 310 XP pasa del nivel 1 al 2", () => {
  assertEquals([G.nivelDe(290).nivel, G.nivelDe(310).nivel], [1, 2]);
});

Deno.test("regresión 7: de 595 a 610 XP sube al nivel 3 (floor(XP / 300) + 1)", () => {
  assertEquals([G.nivelDe(595).nivel, G.nivelDe(610).nivel, G.nivelDe(610).xpNivel], [2, 3, 10]);
});

Deno.test("regresión 8: la XP nunca es negativa; el nivel mínimo es 1", () => {
  assertEquals([G.nivelDe(-40).nivel, G.nivelDe(-40).xp], [1, 0]);
});

Deno.test("regresión 9: racha de 3 días seguidos con envío hoy", () => {
  assertEquals(calcularRacha(["2026-10-25", "2026-10-26", "2026-10-27"], "2026-10-27"), { dias: 3, hoy: true });
});

Deno.test("regresión 10: sin envío hoy la racha sigue con los días anteriores; un hueco la corta", () => {
  assertEquals(calcularRacha(["2026-10-22", "2026-10-25", "2026-10-26"], "2026-10-27"), { dias: 2, hoy: false });
});
