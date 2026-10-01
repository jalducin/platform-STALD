// Ejercicios de audio y pronunciación (openspec: pronunciacion), sin red.
// deno-lint-ignore-file no-explicit-any
import { assert, assertEquals } from "jsr:@std/assert@1";
import { type Ejercicio, grade, type Item, publicQuestion, sanitizeRespuestas, similitudPronunciacion, validateItem } from "./motor.ts";
import { AMBITO_PROFE, clearCache } from "./actividades.ts";
import { validarSemana } from "./semana.ts";
import { ej, storeCon, tema } from "./test_datos.ts";

const pron = (id: string, frase: string): Ejercicio => ({ id, tema: "habla", tipo: "pronunciar", enunciado: "Say it aloud.", frase, explicacion: "Modelo." } as any);
const escucha: Ejercicio = { id: "e1", tema: "habla", tipo: "opcion", enunciado: "Which word do you hear?", audio: "sheep", opciones: ["ship", "sheep"], correcta: 1, explicacion: "/iː/ larga." } as any;
const item = (banco: Ejercicio[]): Item => ({ id: "profe-pron-x", tipo: "actividad", titulo: "P", disponibleDesde: "2026-10-05", fechaLimite: "2026-10-09", intentos: 2, temas: [tema("habla")], banco });

Deno.test("pronunciación: similitud por palabras con contracciones equivalentes", () => {
  assertEquals(similitudPronunciacion("I've been teaching for years.", "I have been teaching for years"), 1);
  assertEquals(similitudPronunciacion("She can't have left.", "she cannot have left"), 1);
  assertEquals(similitudPronunciacion("We'll be there at six.", "we will be there at six"), 1);
  assert(similitudPronunciacion("I've been teaching for years.", "I been teaching years") < 0.8);
  assertEquals(similitudPronunciacion("Hello world", ""), 0);
});

Deno.test("pronunciación: calificación, autoevaluación y revisión", () => {
  const p1 = pron("p1", "I've been teaching for years."), p2 = pron("p2", "The results have been published."), p3 = pron("p3", "Think about it."), p4 = pron("p4", "Three thin things.");
  const it = item([p1, p2, p3, p4, escucha]);
  const resp = sanitizeRespuestas(it.banco!, { p1: "I have been teaching for years", p2: "the result has be publish", p3: "auto:ok", p4: "auto:repetir", e1: 1 });
  const c = grade(it, it.banco!, resp);
  assertEquals([c.correctas, c.total], [3, 5]);
  const r2 = c.revision.find((x: any) => x.id === "p2")!;
  assertEquals([r2.tuRespuesta, r2.correcta], ["the result has be publish", "The results have been published."]);
  assertEquals(c.revision.find((x: any) => x.id === "p4")!.tuRespuesta, "Autoevaluación: necesito repetir");
  assertEquals(String(sanitizeRespuestas([p1], { p1: "x".repeat(500) }).p1).length, 300);
  assertEquals(sanitizeRespuestas([p1], { p1: 5 }), {}, "solo texto");
});

Deno.test("pronunciación: validación y vista pública", () => {
  const sinFrase = { ...pron("p1", "x"), frase: "" } as any;
  assert(validateItem(item([sinFrase])).some((e) => e.includes("frase")));
  assertEquals(validateItem(item([pron("p1", "Hello there."), escucha])), []);
  const pub: any = publicQuestion(pron("p1", "Hello there."));
  assertEquals([pub.frase, pub.explicacion], ["Hello there.", undefined]);
  const pubE: any = publicQuestion(escucha);
  assertEquals([pubE.audio, pubE.correcta], ["sheep", undefined]);
});

Deno.test("pronunciación: el patrón del profe incluye el viernes", async () => {
  clearCache();
  const act = (id: string, fecha: string) => ({ id, tipo: "actividad", titulo: id, disponibleDesde: "2026-10-05", fechaLimite: fecha, intentos: 2, temas: [tema("t")], teoria: [{ titulo: "T", texto: "x" }], tips: [{ tipo: "libreta", texto: "y" }], banco: [ej(`${id}-1`, "t")] });
  const store = storeCon({
    "contenido/profe/semanas/2026-10-05.json": { id: "2026-10-05", titulo: "S1", elementos: [{ id: "profe-pron-2026-10-09", tipo: "actividad", fecha: "2026-10-09" }] },
    "contenido/profe/actividades/profe-pron-2026-10-09.json": act("profe-pron-2026-10-09", "2026-10-09"),
  });
  const r = await validarSemana(store, "2026-10-05", AMBITO_PROFE);
  assertEquals([r.errores, r.avisos.filter((a) => a.includes("se esperaba"))], [[], []]);
});
