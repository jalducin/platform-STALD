// Diagramas de la teoría (openspec: teoria-diagramas): validación del contrato `teoria[].diagrama`.
// deno-lint-ignore-file no-explicit-any
import { assert, assertEquals } from "jsr:@std/assert@1";
import { clearCache } from "./actividades.ts";
import { validarDiagrama } from "./diagrama.ts";
import { validarSemana } from "./semana.ts";
import { semanaValida, storeCon } from "./test_datos.ts";

const pasos = (n: number) => Array.from({ length: n }, (_, i) => ({ texto: `Paso ${i + 1}`, detalle: "algo", icono: "🧭" }));
const tiene = (xs: string[], s: string) => xs.some((x) => x.includes(s));

const DIAGRAMAS_VALIDOS: Record<string, unknown> = {
  flujo: { tipo: "flujo", titulo: "De la idea al PR", pasos: pasos(4), nota: "Siempre en ese orden" },
  ciclo: { tipo: "ciclo", pasos: [{ texto: "Explorar" }, { texto: "Planear" }, { texto: "Codificar" }, { texto: "Commit" }] },
  capas: { tipo: "capas", pasos: [{ texto: "CLAUDE.md" }, { texto: "Skills" }, { texto: "Hooks" }, { texto: "Permisos" }] },
  ramas: { tipo: "ramas", centro: "Claude Code", pasos: pasos(5) },
  comparar: { tipo: "comparar", columnas: ["Así sí", "Así no"], pasos: pasos(3), derecha: pasos(3) },
};

Deno.test("diagrama: los 5 tipos válidos no dan errores", () => {
  for (const [tipo, d] of Object.entries(DIAGRAMAS_VALIDOS)) assertEquals(validarDiagrama(d), [], tipo);
});

Deno.test("diagrama: comparar sin columnas es válido (los encabezados son opcionales)", () => {
  assertEquals(validarDiagrama({ tipo: "comparar", pasos: pasos(2), derecha: pasos(2) }), []);
});

Deno.test("diagrama: no es objeto", () => {
  assert(tiene(validarDiagrama("flujo"), "debe ser un objeto"));
  assert(tiene(validarDiagrama([]), "debe ser un objeto"));
});

Deno.test("diagrama: tipo desconocido menciona los válidos", () => {
  const e = validarDiagrama({ tipo: "pastel", pasos: pasos(3) });
  assert(tiene(e, "tipo «pastel»"), e.join("\n"));
  assert(tiene(e, "flujo, ciclo, capas, ramas, comparar"), e.join("\n"));
});

Deno.test("diagrama: 1 paso, 9 pasos o sin pasos", () => {
  assert(tiene(validarDiagrama({ tipo: "flujo", pasos: pasos(1) }), "entre 2 y 8"));
  assert(tiene(validarDiagrama({ tipo: "flujo", pasos: pasos(9) }), "entre 2 y 8"));
  assert(tiene(validarDiagrama({ tipo: "flujo" }), "entre 2 y 8"));
});

Deno.test("diagrama: paso sin texto o con texto vacío", () => {
  const e = validarDiagrama({ tipo: "flujo", pasos: [{ texto: "A" }, { texto: "  " }, { detalle: "x" }] });
  assert(tiene(e, "pasos[1]: falta texto"), e.join("\n"));
  assert(tiene(e, "pasos[2]: falta texto"), e.join("\n"));
});

Deno.test("diagrama: ramas sin centro", () => {
  assert(tiene(validarDiagrama({ tipo: "ramas", pasos: pasos(3) }), "ramas necesita «centro»"));
});

Deno.test("diagrama: comparar sin derecha o con derecha corta", () => {
  assert(tiene(validarDiagrama({ tipo: "comparar", pasos: pasos(2) }), "comparar necesita «derecha»"));
  assert(tiene(validarDiagrama({ tipo: "comparar", pasos: pasos(2), derecha: pasos(1) }), "derecha debe tener entre 2 y 8"));
  assert(tiene(validarDiagrama({ tipo: "comparar", pasos: pasos(2), derecha: [{ texto: "" }, { texto: "b" }] }), "derecha[0]: falta texto"));
});

Deno.test("diagrama: columnas mal formadas", () => {
  assert(tiene(validarDiagrama({ tipo: "comparar", columnas: ["solo una"], pasos: pasos(2), derecha: pasos(2) }), "columnas debe ser"));
  assert(tiene(validarDiagrama({ tipo: "comparar", columnas: ["a", 3], pasos: pasos(2), derecha: pasos(2) }), "columnas debe ser"));
});

Deno.test("diagrama: textos e iconos demasiado largos", () => {
  const largo = "x".repeat(200);
  assert(tiene(validarDiagrama({ tipo: "flujo", pasos: [{ texto: largo }, { texto: "b" }] }), "pasos[0].texto es muy largo"));
  assert(tiene(validarDiagrama({ tipo: "flujo", pasos: [{ texto: "a", icono: "🙂🙂🙂🙂🙂" }, { texto: "b" }] }), "pasos[0].icono"));
  assert(tiene(validarDiagrama({ tipo: "flujo", pasos: [{ texto: "a", detalle: "y".repeat(400) }, { texto: "b" }] }), "pasos[0].detalle es muy largo"));
  assert(tiene(validarDiagrama({ tipo: "flujo", titulo: largo, pasos: pasos(2) }), "titulo es muy largo"));
  assert(tiene(validarDiagrama({ tipo: "flujo", nota: "z".repeat(400), pasos: pasos(2) }), "nota es muy largo"));
});

Deno.test("diagrama: centro vacío en ramas y textos que no son string", () => {
  assert(tiene(validarDiagrama({ tipo: "ramas", centro: "  ", pasos: pasos(2) }), "ramas necesita «centro»"));
  assert(tiene(validarDiagrama({ tipo: "flujo", pasos: [{ texto: 5 }, { texto: "b" }] }), "pasos[0]: falta texto"));
  assert(tiene(validarDiagrama({ tipo: "flujo", nota: 7, pasos: pasos(2) }), "nota debe ser texto"));
});

Deno.test("validarSemana: reporta el diagrama roto con el id del elemento y el bloque", async () => {
  clearCache();
  const f = semanaValida() as Record<string, any>;
  f["contenido/actividades/act-2026-10-06.json"].teoria.push({ titulo: "Flujo", diagrama: { tipo: "pastel", pasos: pasos(3) } });
  const r = await validarSemana(storeCon(f), "2026-10-05");
  assert(tiene(r.errores, "act-2026-10-06: teoria[1] «Flujo» diagrama: tipo «pastel»"), r.errores.join("\n"));
});

Deno.test("validarSemana: diagramas válidos de los 5 tipos sin errores ni avisos", async () => {
  clearCache();
  const f = semanaValida() as Record<string, any>;
  for (const [tipo, d] of Object.entries(DIAGRAMAS_VALIDOS)) f["contenido/actividades/act-2026-10-06.json"].teoria.push({ titulo: tipo, diagrama: d });
  const r = await validarSemana(storeCon(f), "2026-10-05");
  assertEquals(r.errores, []);
  assertEquals(r.avisos, []);
});
