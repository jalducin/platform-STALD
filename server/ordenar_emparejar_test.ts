// Ejercicios para ordenar la oración y unir pares (openspec: ejercicios-ordenar-emparejar), sin red.
// deno-lint-ignore-file no-explicit-any
import { assert, assertEquals, assertNotEquals } from "jsr:@std/assert@1";
import { correccionDe, type Ejercicio, grade, type Item, publicQuestion, sanitizeRespuestas, validateItem } from "./motor.ts";
import { clearCache, handleSecundaria } from "./actividades.ts";
import { validarSemana } from "./semana.ts";
import { storeCon, tema } from "./test_datos.ts";

const ord = (id: string, extra: Record<string, unknown> = {}): Ejercicio => ({
  id, tema: "t", tipo: "ordenar", enunciado: "Ordena: Yo voy a viajar mañana", palabras: ["I", "will", "travel", "tomorrow"],
  distractores: ["going"], aceptadas: ["Tomorrow I will travel"], explicacion: "will + verbo.", ...extra,
} as any);
const PARES = [["this", "este / esta"], ["these", "estos / estas"], ["that", "ese / esa / aquel"], ["those", "esos / esas"]];
const emp = (id: string, pares = PARES): Ejercicio => ({ id, tema: "t", tipo: "emparejar", enunciado: "Une cada palabra con su significado", pares, explicacion: "Demostrativos." } as any);
const item = (banco: Ejercicio[]): Item => ({ id: "act-fichas", tipo: "actividad", titulo: "F", disponibleDesde: "2026-10-05", fechaLimite: "2026-10-09", intentos: 2, temas: [tema("t")], banco });
const BIEN = PARES.map((p) => p[1]);

Deno.test("ordenar: correcta con el orden de palabras o con aceptadas, normalizada", () => {
  const it = item([ord("o1")]);
  const nota = (r: unknown) => grade(it, it.banco!, sanitizeRespuestas(it.banco!, { o1: r })).correctas;
  assertEquals(nota("I will travel tomorrow"), 1);
  assertEquals(nota("  i  WILL travel tomorrow "), 1);
  assertEquals(nota("tomorrow I will travel"), 1, "aceptadas");
  assertEquals(nota("I going travel tomorrow"), 0, "con distractor");
  assertEquals(nota("will I travel tomorrow"), 0);
  assertEquals(nota(""), 0);
});

Deno.test("ordenar: saneo y revisión", () => {
  const e = ord("o1");
  assertEquals(sanitizeRespuestas([e], { o1: 3 }), {}, "solo texto");
  assertEquals(sanitizeRespuestas([e], { o1: "   " }), {});
  assertEquals(String(sanitizeRespuestas([e], { o1: "x ".repeat(400) }).o1).length, 300);
  const c = grade(item([e]), [e], { o1: "I going travel tomorrow" });
  assertEquals([c.revision[0].tuRespuesta, c.revision[0].correcta], ["I going travel tomorrow", "I will travel tomorrow"]);
  assertEquals(grade(item([e]), [e], {}).revision[0].tuRespuesta, null);
});

Deno.test("emparejar: todos los pares, uno mal, parcial; saneo estricto", () => {
  const e = emp("m1");
  const it = item([e]);
  const nota = (r: unknown) => grade(it, [e], sanitizeRespuestas([e], { m1: r })).correctas;
  assertEquals(nota(BIEN), 1);
  assertEquals(nota([BIEN[1], BIEN[0], BIEN[2], BIEN[3]]), 0, "dos intercambiados");
  assertEquals(nota([BIEN[0], "", "", ""]), 0, "parcial");
  // Saneo: largo exacto, solo texto, solo opciones que existen y al menos un par.
  assertEquals(sanitizeRespuestas([e], { m1: BIEN.slice(0, 3) }), {});
  assertEquals(sanitizeRespuestas([e], { m1: [1, 2, 3, 4] }), {});
  assertEquals(sanitizeRespuestas([e], { m1: [BIEN[0], BIEN[1], BIEN[2], "inventado"] }), {});
  assertEquals(sanitizeRespuestas([e], { m1: ["", "", "", ""] }), {});
  assertEquals(sanitizeRespuestas([e], { m1: "this" }), {});
  assertEquals(sanitizeRespuestas([e], { m1: [BIEN[0], "", "", ""] }), { m1: [BIEN[0], "", "", ""] }, "avance parcial (borrador)");
});

Deno.test("emparejar: textos de revisión", () => {
  const e = emp("m1");
  const c = grade(item([e]), [e], { m1: [BIEN[1], BIEN[0], "", BIEN[3]] });
  assertEquals(c.revision[0].tuRespuesta, "this → estos / estas · these → este / esta · that → — · those → esos / esas");
  assertEquals(c.revision[0].correcta, "this → este / esta · these → estos / estas · that → ese / esa / aquel · those → esos / esas");
});

Deno.test("vista pública: fichas y derecha barajadas, deterministas y sin respuestas", () => {
  const o = ord("o1"), m = emp("m1");
  const po: any = publicQuestion(o, "act|marisol|1");
  for (const k of ["palabras", "distractores", "aceptadas", "explicacion"]) assertEquals(po[k], undefined, k);
  assertEquals([...po.fichas].sort(), ["I", "going", "tomorrow", "travel", "will"].sort());
  assertEquals(publicQuestion(o, "act|marisol|1"), po, "mismo alumno e intento → mismo orden");
  const pm: any = publicQuestion(m, "act|marisol|1");
  assertEquals([pm.pares, pm.explicacion], [undefined, undefined]);
  assertEquals(pm.izquierda, ["this", "these", "that", "those"]);
  assertEquals([...pm.derecha].sort(), [...BIEN].sort());
  // Nunca en el orden correcto, para ninguna semilla.
  const sinDistr = ord("o2", { distractores: undefined });
  for (let i = 0; i < 200; i++) {
    assertNotEquals((publicQuestion(sinDistr, `s${i}`) as any).fichas, ["I", "will", "travel", "tomorrow"]);
    assertNotEquals((publicQuestion(m, `s${i}`) as any).derecha, BIEN);
  }
  // Varía entre alumnos o intentos.
  const ordenes = new Set(Array.from({ length: 20 }, (_, i) => JSON.stringify((publicQuestion(o, `act|a${i}|1`) as any).fichas)));
  assert(ordenes.size > 1);
});

Deno.test("validación: campos, 3–6 pares y repetidos", () => {
  assertEquals(validateItem(item([ord("o1"), emp("m1")])), []);
  const errs = (e: Ejercicio) => validateItem(item([e]));
  assert(errs(ord("o1", { palabras: ["I"] })).some((x) => x.includes("ordenar sin palabras")));
  assert(errs(ord("o1", { palabras: undefined })).some((x) => x.includes("ordenar sin palabras")));
  assert(errs(ord("o1", { palabras: ["I", " "] })).some((x) => x.includes("ordenar sin palabras")));
  assert(errs(ord("o1", { distractores: ["Will"] })).some((x) => x.includes("ficha repetida")));
  assert(errs(ord("o1", { palabras: ["the", "cat", "the"] })).some((x) => x.includes("ficha repetida")));
  assert(errs(ord("o1", { distractores: "going" })).some((x) => x.includes("distractores inválidos")));
  assert(errs(ord("o1", { aceptadas: [""] })).some((x) => x.includes("aceptadas inválidas")));
  assert(errs(emp("m1", PARES.slice(0, 2))).some((x) => x.includes("(3 a 6)")));
  assert(errs(emp("m1", [...PARES, ["a", "1"], ["b", "2"], ["c", "3"]])).some((x) => x.includes("(3 a 6)")));
  assert(errs(emp("m1", [...PARES.slice(0, 3), ["those"]] as any)).some((x) => x.includes("par inválido")));
  assert(errs(emp("m1", [...PARES.slice(0, 3), ["those", "este / esta"]])).some((x) => x.includes("texto repetido")));
  assert(errs(emp("m1", [...PARES.slice(0, 3), ["this", "otro"]])).some((x) => x.includes("texto repetido")));
});

Deno.test("validar_semana: reporta el emparejar con 2 pares", async () => {
  clearCache();
  const act = { ...item([emp("m1", PARES.slice(0, 2))]), id: "act-2026-10-06", teoria: [{ titulo: "T", texto: "x" }], tips: [{ tipo: "libreta", texto: "y" }] };
  const store = storeCon({
    "contenido/semanas/2026-10-05.json": { id: "2026-10-05", titulo: "S", elementos: [{ id: "act-2026-10-06", tipo: "actividad", fecha: "2026-10-06" }] },
    "contenido/actividades/act-2026-10-06.json": act,
  });
  const r = await validarSemana(store, "2026-10-05");
  assert(r.errores.some((e) => e.includes("m1") && e.includes("(3 a 6)")), JSON.stringify(r.errores));
});

Deno.test("corrección: el emparejar correcto queda fijo y el ordenar fallado muestra lo que armó", () => {
  const it = item([ord("o1"), emp("m1")]);
  const intento = { n: 1, enviadoEn: "x", preguntas: ["o1", "m1"], respuestas: { o1: "travel I will tomorrow", m1: BIEN }, calificacion: {} as any };
  const c = correccionDe(it, intento)!;
  assertEquals(c.fijas, { m1: BIEN });
  assertEquals(c.anteriores, { o1: "travel I will tomorrow" });
});

// ---------- Por HTTP (ámbito de Secundaria, como borrador_test.ts) ----------
const ADMIN = "admin@example.com";
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s });
const filas = () => Promise.resolve([{ userEmails: ["luz@example.com"], userNames: ["Luz María Pérez"] }]);
function datos() {
  return storeCon({
    "contenido/secundaria/semanas/2026-10-05.json": { id: "2026-10-05", titulo: "S", elementos: [{ id: "sec-fichas", tipo: "actividad", fecha: "2026-10-11" }] },
    "contenido/secundaria/actividades/sec-fichas.json": { ...item([ord("o1"), emp("m1")]), id: "sec-fichas", fechaLimite: "2026-10-11", alumnos: ["luz"] },
  });
}
async function sec(store: any, method: string, sub: string, email: string, body?: unknown) {
  Deno.env.set("PERMITIR_HOY", "1");
  const req = new Request(`http://x/secundaria/actividades${sub}?hoy=2026-10-06`, { method, body: body ? JSON.stringify(body) : undefined });
  const res = await handleSecundaria(req, sub, email, ADMIN, store, filas, json);
  return { status: res.status, body: await res.json() };
}

Deno.test("HTTP: intento sin respuestas, borrador parcial, envío y corrección", async () => {
  clearCache();
  const store = datos();
  const g = await sec(store, "GET", "/sec-fichas", "luz@example.com");
  assertEquals(g.status, 200);
  const [po, pm] = g.body.preguntas;
  assertEquals([po.palabras, po.aceptadas, po.distractores, pm.pares], [undefined, undefined, undefined, undefined]);
  assertEquals(po.fichas.length, 5);
  assertEquals(pm.izquierda, ["this", "these", "that", "those"]);
  assertEquals((await sec(store, "GET", "/sec-fichas", "luz@example.com")).body.preguntas, g.body.preguntas, "recargar: mismo orden");
  // Vista previa del admin: tampoco revela respuestas.
  const a = await sec(store, "GET", "/sec-fichas", ADMIN);
  assertEquals([a.body.vistaPrevia, a.body.preguntas[0].palabras, a.body.preguntas[1].pares], [true, undefined, undefined]);
  // Borrador parcial en el servidor.
  const parcial = { o1: "I will", m1: [BIEN[0], "", "", ""], intruso: 1 };
  assertEquals((await sec(store, "PUT", "/sec-fichas/borrador", "luz@example.com", { intento: 1, respuestas: parcial })).status, 200);
  assertEquals((await sec(store, "GET", "/sec-fichas", "luz@example.com")).body.borrador.respuestas, { o1: "I will", m1: [BIEN[0], "", "", ""] });
  // Envío: ordenar mal, emparejar bien; arreglo malformado descartado en otra prueba de saneo.
  const p = await sec(store, "POST", "/sec-fichas", "luz@example.com", { intento: 1, respuestas: { o1: "travel I will tomorrow", m1: BIEN } });
  assertEquals([p.status, p.body.calificacion.correctas, p.body.calificacion.total], [200, 1, 2]);
  assertEquals(p.body.calificacion.revision[0].correcta, "I will travel tomorrow");
  // Corrección: el emparejar viene fijo; solo se vuelve a armar la oración.
  const c = await sec(store, "GET", "/sec-fichas", "luz@example.com");
  assertEquals([c.body.intento, c.body.correccion.fijas, c.body.correccion.anteriores], [2, { m1: BIEN }, { o1: "travel I will tomorrow" }]);
  const p2 = await sec(store, "POST", "/sec-fichas", "luz@example.com", { intento: 2, respuestas: { o1: "I will travel tomorrow", m1: ["x"] } });
  assertEquals(p2.body.calificacion.porcentaje, 100, "las fijas mandan");
});

Deno.test("HTTP: un arreglo malformado cuenta como sin responder", async () => {
  clearCache();
  const store = datos();
  const p = await sec(store, "POST", "/sec-fichas", "luz@example.com", { intento: 1, respuestas: { m1: [0, 1, 2, 3] } });
  const r = p.body.calificacion.revision.find((x: any) => x.id === "m1");
  assertEquals(r.tuRespuesta, null);
});
