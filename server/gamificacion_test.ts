// Núcleo de gamificación (openspec: gamificacion-nucleo): reglas puras de comun/gamificacion.js (XP, nivel y rango,
// insignias, mundos, retos diarios y actividad reciente). Las usan el tablero de Secundaria y la pantalla de
// resultado de la clase; después, Inglés.
// deno-lint-ignore-file no-explicit-any
import { assertEquals } from "jsr:@std/assert@1";
import "../comun/gamificacion.js";
import { clearCache, handleSecundaria } from "./actividades.ts";
import { clearCacheAlumnos, leerRegistro, RUTA_ALUMNOS } from "./alumnos.ts";
import { filasSecundaria } from "./secundaria_registro.ts";
import { storeCon, tema } from "./test_datos.ts";

const G = (globalThis as any).Gamificacion;

// Calificación con secciones (como la del servidor): [titulo, correctas, total].
const calif = (secs: [string, number, number][]) => {
  const correctas = secs.reduce((a, s) => a + s[1], 0), total = secs.reduce((a, s) => a + s[2], 0);
  return { correctas, total, porcentaje: Math.round(correctas * 100 / total), secciones: secs.map(([titulo, c, t]) => ({ titulo, correctas: c, total: t, porcentaje: Math.round(c * 100 / t) })) };
};
const clase = (id: string, dia: string, extra: Record<string, unknown> = {}) => ({
  id, tipo: "actividad", titulo: "📐 Matemáticas · " + id, materia: "Matemáticas", disponibleDesde: dia, fechaLimite: G.sumarDias(dia, 1),
  estado: "disponible", intentosUsados: 0, mejor: null, ...extra,
});
const hecha = (c: any, aTiempo = true, envio = "2026-10-27T18:00:00Z") => ({ estado: "completo", intentosUsados: 1, mejor: c, mejorATiempo: aTiempo, ultimoEnvio: envio });

Deno.test("XP de una clase: porcentaje + 20 a tiempo; el tema 🎯 vale doble", () => {
  const simple = calif([["Fracciones", 8, 10]]);
  assertEquals(G.xpDeClase({}, simple, { aTiempo: true }), 100);
  assertEquals(G.xpDeClase({}, simple, { aTiempo: false }), 80);
  // 16 preguntas: 12 normales (9 bien) y 4 del mini examen 🎯 (4 bien) → 13/16 = 81 + 4/16 extra = 25 → 106, +20.
  const mini = calif([["Divisibilidad", 9, 12], ["🎯 Mini examen: repaso", 4, 4]]);
  assertEquals(G.xpDeClase({}, mini, { aTiempo: true }), 126);
  assertEquals(G.xpDeClase({}, calif([["🎯 Mini examen", 0, 4], ["Tema", 0, 4]]), { aTiempo: true }), 20);
  // Sin secciones: el porcentaje de la calificación.
  assertEquals(G.xpDeClase({}, { porcentaje: 70 }, { aTiempo: false }), 70);
  // Sin calificación no hay XP.
  assertEquals(G.xpDeClase({}, null, { aTiempo: true }), 0);
});

Deno.test("XP: «a tiempo» sale de opciones, de la calificación, del listado (mejorATiempo) o de hoy ≤ fecha límite", () => {
  const c = calif([["T", 5, 10]]);
  assertEquals(G.xpDeClase({ mejorATiempo: true }, c), 70);
  assertEquals(G.xpDeClase({ mejorATiempo: false }, c), 50);
  assertEquals(G.xpDeClase({}, { ...c, aTiempo: true }), 70);
  assertEquals(G.xpDeClase({ fechaLimite: "2026-10-28" }, c, { hoy: "2026-10-28" }), 70);
  assertEquals(G.xpDeClase({ fechaLimite: "2026-10-28" }, c, { hoy: "2026-10-29" }), 50);
  assertEquals(G.xpDeClase({}, c), 50); // sin dato: sin bonus
});

Deno.test("XP total: solo el mejor intento de cada clase hecha", () => {
  const items = [clase("a", "2026-10-26", hecha(calif([["T", 10, 10]]))), clase("b", "2026-10-27", hecha(calif([["T", 5, 10]]), false)), clase("c", "2026-10-28")];
  assertEquals(G.xpTotal(items), 120 + 50);
});

Deno.test("nivel: floor(XP/300)+1, rango por nivel, XP dentro del nivel y meta del siguiente", () => {
  assertEquals(G.nivelDe(0), { nivel: 1, rango: "Aprendiz", xp: 0, xpNivel: 0, xpSiguiente: 300, porNivel: 300, porcentaje: 0 });
  assertEquals(G.nivelDe(299).nivel, 1);
  assertEquals([G.nivelDe(300).nivel, G.nivelDe(300).xpNivel, G.nivelDe(300).xpSiguiente], [2, 0, 600]);
  assertEquals([G.nivelDe(950).nivel, G.nivelDe(950).rango, G.nivelDe(950).xpNivel, G.nivelDe(950).porcentaje], [4, "Exploradora/Explorador", 50, 17]);
  assertEquals(G.nivelDe(950, "f").rango, "Exploradora");
  assertEquals(G.nivelDe(950, "m").rango, "Explorador");
  assertEquals([G.nivelDe(1800).nivel, G.nivelDe(1800, "f").rango], [7, "Sabia"]);
  assertEquals([G.nivelDe(2700).nivel, G.nivelDe(2700).rango, G.nivelDe(2700, "m").rango], [10, "Gran Sabia/Gran Sabio", "Gran Sabio"]);
  assertEquals(G.nivelDe(-5).nivel, 1);
});

Deno.test("mundos: el bloque de cada materia según la fecha", () => {
  const m = (materia: string, hoy?: string) => { const r = G.mundoDe(materia, hoy); return r ? r.nombre : null; };
  assertEquals(m("Matemáticas", "2026-10-27"), "Valle de los Números");
  assertEquals(m("matematicas", "2026-11-23"), "Ciudad de las Formas");
  assertEquals(m("Matemáticas", "2027-01-05"), "Torre de las Incógnitas");
  assertEquals(m("Matemáticas", "2026-12-25"), "Ciudad de las Formas"); // vacaciones: el último que empezó
  assertEquals(m("Matemáticas", "2026-10-01"), "Valle de los Números"); // antes de empezar: el primero
  assertEquals(m("Ciencias", "2026-10-27"), "Selva de la Vida");
  assertEquals(m("Ciencias Sociales", "2026-10-27"), "Ágora");
  assertEquals(m("Tecnología", "2026-10-27"), "Taller Digital");
  assertEquals(m("Inglés"), "Isla del Alfabeto");
  assertEquals(m("Español"), "Gran Biblioteca");
  assertEquals([m("Artes"), m("Educación Física")], ["Estudio y Arena", "Estudio y Arena"]);
  assertEquals(m("Música"), null);
  assertEquals(G.mundoDe("Matemáticas", "2026-10-27").emoji, "🔢");
});

Deno.test("mapa de mundos: completado, en curso o bloqueado, con su avance", () => {
  const items = [clase("a1", "2026-10-26", hecha(calif([["T", 1, 1]]))), clase("a2", "2026-11-20", hecha(calif([["T", 1, 1]])))];
  const mapa = G.mapaMundos(items, "2026-11-24");
  const mate = mapa.find((x: any) => x.clave === "matematicas").mundos.map((w: any) => w.nombre + ":" + w.estado + ":" + w.hechas + "/" + w.total);
  assertEquals(mate, ["Valle de los Números:completado:2/2", "Ciudad de las Formas:en-curso:0/0", "Torre de las Incógnitas:bloqueado:0/0"]);
  // Terminó su fecha pero le falta una clase: sigue en curso.
  const falta = G.mapaMundos([...items, clase("a3", "2026-11-21")], "2026-11-24").find((x: any) => x.clave === "matematicas").mundos[0];
  assertEquals([falta.estado, falta.hechas, falta.total], ["en-curso", 2, 3]);
  const tec = G.mapaMundos([], "2026-10-27").find((x: any) => x.clave === "tecnologia").mundos.map((w: any) => w.estado);
  assertEquals(tec, ["en-curso", "bloqueado", "bloqueado"]);
  assertEquals(G.mapaMundos([], "2026-10-27").find((x: any) => x.clave === "ingles").mundos.map((w: any) => w.estado), ["en-curso"]);
});

Deno.test("insignias derivadas: primera misión, rachas, 100 %, mini examen y mundo completado", () => {
  const ids = (e: any) => G.insigniasDe(e).map((i: any) => i.id).join();
  assertEquals(ids({ items: [], hoy: "2026-10-27", racha: 0 }), "");
  const una = [clase("a", "2026-10-26", hecha(calif([["T", 7, 10]])))];
  assertEquals(ids({ items: una, hoy: "2026-10-27", racha: { dias: 3 } }), "primera-mision,racha-3");
  const varias = [clase("a", "2026-10-26", hecha(calif([["T", 10, 10]]))), clase("b", "2026-10-27", hecha(calif([["T", 1, 2], ["🎯 Mini examen", 4, 5]])))];
  assertEquals(ids({ items: varias, hoy: "2026-10-27", racha: 14 }), "primera-mision,racha-3,racha-7,racha-14,perfecto,mini-examen");
  // Mini examen con menos de 80 %: no.
  assertEquals(ids({ items: [clase("b", "2026-10-27", hecha(calif([["🎯 Mini examen", 3, 5]])))], hoy: "2026-10-27" }), "primera-mision");
  const mundo = [clase("a1", "2026-10-26", hecha(calif([["T", 1, 2]])))];
  assertEquals(ids({ items: mundo, hoy: "2026-11-24" }).includes("mundo-completado"), true);
});

Deno.test("insigniaNueva: las que aparecen entre dos estados (o dos listas)", () => {
  const antes = { items: [clase("a", "2026-10-26", hecha(calif([["T", 7, 10]])))], hoy: "2026-10-27", racha: 2 };
  const despues = { items: [...antes.items, clase("b", "2026-10-27", hecha(calif([["T", 10, 10]])))], hoy: "2026-10-27", racha: 3 };
  assertEquals(G.insigniaNueva(antes, despues).map((i: any) => i.id), ["racha-3", "perfecto"]);
  assertEquals(G.insigniaNueva(["primera-mision"], ["primera-mision", "perfecto"]).map((i: any) => i.id), ["perfecto"]);
  assertEquals(G.insigniaNueva(despues, despues), []);
  assertEquals(G.insigniaNueva(null, { items: [], hoy: "2026-10-27" }), []);
});

Deno.test("retos diarios: las clases de hoy, cuántas faltan y el XP que se puede ganar", () => {
  const hoy = "2026-10-27";
  const items = [clase("lunes", "2026-10-26"), clase("a", hoy, hecha(calif([["T", 9, 10]]))), clase("b", hoy), clase("c", "2026-10-28")];
  const r = G.retosDiarios(items, hoy);
  assertEquals(r.retos.map((x: any) => x.item.id + ":" + x.hecha + ":" + x.xp + ":" + x.xpPosible), ["a:true:110:120", "b:false:0:120"]);
  assertEquals([r.hechos, r.total, r.faltan, r.xpHoy], [1, 2, 1, 110]);
  assertEquals(G.retosDiarios([], hoy), { retos: [], hechos: 0, total: 0, faltan: 0, xpHoy: 0 });
});

Deno.test("actividad reciente: lo último entregado primero, con su XP", () => {
  const items = [
    clase("a", "2026-10-26", hecha(calif([["T", 10, 10]]), true, "2026-10-26T15:00:00Z")),
    clase("b", "2026-10-27", hecha(calif([["T", 5, 10]]), false, "2026-10-27T15:00:00Z")),
    clase("c", "2026-10-28"),
  ];
  assertEquals(G.actividadReciente(items, 5).map((x: any) => x.item.id + ":" + x.porcentaje + ":" + x.xp), ["b:50:50", "a:100:120"]);
  assertEquals(G.actividadReciente(items, 1).length, 1);
});

Deno.test("materia de una clase: explícita o del prefijo del título (palabra completa)", () => {
  const m = (it: Record<string, unknown>) => { const r = G.materiaDe(it); return r ? r.clave + ":" + r.nombre : null; };
  assertEquals(m({ materia: "Ciencias Sociales" }), "sociales:Ciencias Sociales");
  assertEquals(m({ titulo: "🔬 Ciencias · La célula" }), "ciencias:Ciencias");
  assertEquals(m({ titulo: "🦴 Partes del cuerpo · Huesos" }), "otra:Partes del cuerpo");
  assertEquals(m({ titulo: "Sin prefijo" }), null);
  assertEquals([G.diaDeClase({ disponibleDesde: "2026-10-26", fechaLimite: "2026-10-27" }), G.diaDeClase({ disponibleDesde: "2026-10-21", fechaLimite: "2026-10-24" })], ["2026-10-26", "2026-10-24"]);
});

// ---------- Servidor: «a tiempo» del mejor intento (dato nuevo para el bonus de XP) ----------
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s });
const preg = (id: string) => ({ id, tema: "t", tipo: "opcion", enunciado: `¿${id}?`, opciones: ["bien", "mal"], correcta: 0, explicacion: "x" });
function tienda() {
  clearCacheAlumnos();
  clearCache();
  return storeCon({
    [RUTA_ALUMNOS]: { "luz@example.com": { nombre: "Luz", alta: "2026-09-01T12:00:00.000Z", secundaria: true } },
    "contenido/secundaria/semanas/2026-10-26.json": { id: "2026-10-26", titulo: "Semana 1", elementos: [{ id: "sec-mate", tipo: "actividad", fecha: "2026-10-27" }] },
    "contenido/secundaria/actividades/sec-mate.json": {
      id: "sec-mate", tipo: "actividad", titulo: "📐 Matemáticas · Fracciones", materia: "Matemáticas", disponibleDesde: "2026-10-26", fechaLimite: "2026-10-27",
      intentos: 2, preguntasPorIntento: 2, alumnos: ["luz"], temas: [tema("t")], banco: [preg("p1"), preg("p2")],
    },
  });
}
async function pedir(store: any, method: string, sub: string, hoy: string, body?: unknown) {
  Deno.env.set("PERMITIR_HOY", "1");
  const req = new Request(`http://x/secundaria/actividades${sub}?hoy=${hoy}`, { method, body: body ? JSON.stringify(body) : undefined });
  const filas = () => filasSecundaria({ registro: () => leerRegistro(store), notion: () => Promise.resolve([]), avisar: () => {} });
  const res = await handleSecundaria(req, sub, "luz@example.com", "admin@example.com", store, filas, json);
  return { status: res.status, body: await res.json() };
}
async function enviar(store: any, hoy: string, intento: number, bien: number) {
  clearCache();
  const it = await pedir(store, "GET", "/sec-mate", hoy);
  const respuestas = Object.fromEntries(it.body.preguntas.map((p: any, i: number) => [p.id, i < bien ? 0 : 1]));
  return await pedir(store, "POST", "/sec-mate", hoy, { intento, respuestas });
}

Deno.test("servidor: el envío dice si llegó a tiempo y el listado trae mejorATiempo del mejor intento", async () => {
  const store = tienda();
  const r1 = await enviar(store, "2026-10-27", 1, 1); // a tiempo, 50 %
  assertEquals([r1.status, r1.body.aTiempo], [200, true]);
  clearCache();
  let lista = await pedir(store, "GET", "", "2026-10-27");
  assertEquals(lista.body.items[0].mejorATiempo, true);
  const r2 = await enviar(store, "2026-10-29", 2, 2); // tarde, 100 % → el mejor ahora es el tardío
  assertEquals([r2.status, r2.body.aTiempo], [200, false]);
  clearCache();
  lista = await pedir(store, "GET", "", "2026-10-29");
  const it = lista.body.items[0];
  assertEquals([it.mejor.porcentaje, it.mejorATiempo], [100, false]);
  // Con esos datos, el XP de la clase es 100 sin bonus.
  assertEquals(G.xpDeClase(it, it.mejor), 100);
});

Deno.test("servidor: sin intentos, mejorATiempo es null", async () => {
  const lista = await pedir(tienda(), "GET", "", "2026-10-27");
  assertEquals(lista.body.items[0].mejorATiempo, null);
});
