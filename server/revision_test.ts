// Revisión de la semana por el profe (openspec: revision-profe): reglas compartidas (comun/revision-datos.js) y rutas
// GET/PUT /profe/revision, más el campo `revision` en la lista de la alumna.
// deno-lint-ignore-file no-explicit-any
import { assert, assertEquals } from "jsr:@std/assert@1";
import "../comun/gamificacion.js"; // materias (resumen por materia)
import "../comun/revision-datos.js";
import { clearCache, handleSecundaria } from "./actividades.ts";
import { esRutaPg } from "./db.ts";
import { handleRevision, pideDeClase, rutaRevision } from "./revision.ts";
import { ej, storeCon, tema } from "./test_datos.ts";

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

// ---------- Servidor: GET y PUT /profe/revision ----------
const ADMIN = "admin@example.com";
const LUZ = "luz@example.com";
const AHORA = "2026-10-28T18:00:00.000Z";
const jsonR = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s });
const banco4 = (id: string) => [1, 2, 3, 4].map((n) => ej(`${id}-${n}`, "t"));
const libreta = (...textos: string[]) => textos.map((texto) => ({ tipo: "libreta", texto }));
function claseSec(id: string, dia: string, materia: string | null, tips: unknown[], extra: Record<string, unknown> = {}) {
  return {
    id, tipo: "actividad", titulo: `📘 ${materia ?? "Repaso"} · Tema ${id}`, ...(materia ? { materia } : {}),
    disponibleDesde: dia, fechaLimite: dia, intentos: 2, preguntasPorIntento: 4, alumnos: ["luz"],
    temas: [tema("t")], teoria: [{ titulo: "T", texto: "x" }], tips, banco: banco4(id), ...extra,
  };
}
const ruta = (id: string) => `contenido/secundaria/actividades/${id}.json`;
function datos(): Record<string, unknown> {
  return {
    "contenido/secundaria/semanas/2026-10-26.json": { id: "2026-10-26", titulo: "S1", elementos: [
      { id: "c-esp", tipo: "actividad", fecha: "2026-10-26" }, { id: "c-ing", tipo: "actividad", fecha: "2026-10-27" },
      { id: "c-mat", tipo: "actividad", fecha: "2026-10-28" }, { id: "c-ana", tipo: "actividad", fecha: "2026-10-28" },
      { id: "c-guia", tipo: "actividad", fecha: "2026-11-08" },
    ] },
    "contenido/secundaria/semanas/2026-11-02.json": { id: "2026-11-02", titulo: "S2", elementos: [{ id: "c-sig", tipo: "actividad", fecha: "2026-11-02" }] },
    [ruta("c-esp")]: claseSec("c-esp", "2026-10-26", "Español", [...libreta("Copia el diagrama", "📖 Libro de ortografía (el físico): resuelve 2 páginas."), { tipo: "video", texto: "v", url: "https://youtube.com/x" }]),
    [ruta("c-ing")]: claseSec("c-ing", "2026-10-27", "Inglés", libreta("Escribe tu receta", "🎙️ Audio para el profe: lee tu receta en voz alta.")),
    [ruta("c-mat")]: claseSec("c-mat", "2026-10-28", "Matemáticas", libreta("Resuelve a mano")),
    [ruta("c-ana")]: claseSec("c-ana", "2026-10-28", "Ciencias", libreta("Dibuja"), { alumnos: ["ana"] }),
    [ruta("c-guia")]: claseSec("c-guia", "2026-10-24", "Inglés", libreta("Avanza 2 páginas"), { fechaLimite: "2026-11-08" }),
    [ruta("c-sig")]: claseSec("c-sig", "2026-11-02", "Artes", libreta("Dibuja un volcán")),
    "resultados/c-ing/luz.json": {
      id: "c-ing", titulo: "x", alumno: "Luz María Pérez",
      intentos: [{ n: 1, enviadoEn: "2026-10-28T10:00:00Z", fueraDeTiempo: true, preguntas: null, respuestas: {}, calificacion: { porcentaje: 75 } }],
      mejor: { n: 1, porcentaje: 75 },
    },
    "borradores/c-esp/luz.json": { intento: 1, respuestas: { a: 1, b: 2, c: 3 }, actualizado: "2026-10-26T20:00:00Z" },
  };
}
const alumnas = () => Promise.resolve([{ slug: "luz", nombre: "Luz María Pérez" }, { slug: "ana", nombre: "Ana" }]);
const deps = (store: any, email = ADMIN, extra: Record<string, unknown> = {}) => ({
  email, admin: ADMIN, store, hoy: () => "2026-10-28", ahora: () => AHORA, alumnas, puedeGuardar: () => Promise.resolve(true), ...extra,
});
async function pedir(store: any, metodo: string, q: string, body?: unknown, email = ADMIN, extra: Record<string, unknown> = {}) {
  clearCache();
  const cuerpo = body === undefined ? {} : { body: typeof body === "string" ? body : JSON.stringify(body) };
  const res = await handleRevision(new Request(`http://x/profe/revision${q}`, { method: metodo, ...cuerpo }), deps(store, email, extra) as any, jsonR);
  return { status: res.status, body: await res.json() };
}
const guardar = (store: any, body: Record<string, unknown>, email = ADMIN) =>
  pedir(store, "PUT", "", { alumna: "luz", id: "c-esp", checks: [], audio: false, libro: false, calificacion: null, comentario: "", ...body }, email);

Deno.test("revision: semana normalizada a su lunes, días de lunes a domingo y navegación", async () => {
  const r = await pedir(storeCon(datos()), "GET", "?alumna=luz&semana=2026-10-28");
  assertEquals(r.status, 200);
  assertEquals(r.body.alumna, { slug: "luz", nombre: "Luz María Pérez" });
  assertEquals([r.body.semana.lunes, r.body.semana.domingo, r.body.semana.anterior, r.body.semana.siguiente], ["2026-10-26", "2026-11-01", "2026-10-19", "2026-11-02"]);
  assertEquals(r.body.clases.map((c: any) => [c.id, c.dia]), [["c-esp", "2026-10-26"], ["c-ing", "2026-10-27"], ["c-mat", "2026-10-28"]]);
  assertEquals(r.body.abiertas.map((c: any) => c.id), ["c-guia"], "abierta esa semana, de otro día");
  // Sin semana: la de hoy. La siguiente, aunque sus clases no abran todavía.
  assertEquals((await pedir(storeCon(datos()), "GET", "?alumna=luz")).body.semana.lunes, "2026-10-26");
  const sig = await pedir(storeCon(datos()), "GET", "?alumna=luz&semana=2026-11-02");
  // La guía (ventana larga) cuenta en la semana de su fecha límite (Gamificacion.diaDeClase), aquí la del 8 de noviembre.
  assertEquals(sig.body.clases.map((c: any) => [c.id, c.estado, c.abre]), [["c-sig", "sin-abrir", "2026-11-02"], ["c-guia", "sin-abrir", undefined]]);
  assertEquals((await pedir(storeCon(datos()), "GET", "?alumna=luz&semana=ayer")).status, 400);
});

Deno.test("revision: avance en línea con los datos que ya existen (borrador N de M, enviada, fuera de tiempo)", async () => {
  const { body } = await pedir(storeCon(datos()), "GET", "?alumna=luz&semana=2026-10-26");
  const c = Object.fromEntries(body.clases.map((x: any) => [x.id, x]));
  assertEquals([c["c-esp"].estado, c["c-esp"].borrador.respondidas, c["c-esp"].borrador.total, c["c-esp"].mejor], ["borrador", 3, 4, null]);
  assertEquals([c["c-ing"].estado, c["c-ing"].mejor.porcentaje, c["c-ing"].fueraDeTiempo, c["c-ing"].intentosUsados, c["c-ing"].intentosMax], ["enviada", 75, true, 1, 2]);
  assertEquals([c["c-mat"].estado, c["c-mat"].borrador, c["c-mat"].revision, c["c-mat"].abre], ["sin-abrir", null, null, undefined]);
  assertEquals(body.avisos, undefined);
});

Deno.test("revision: qué pide cada clase (checklist de libreta, audio y libro de ortografía)", () => {
  const d = datos() as any;
  assertEquals(pideDeClase(d[ruta("c-esp")]), { libreta: ["Copia el diagrama"], audio: false, libro: true });
  assertEquals(pideDeClase(d[ruta("c-ing")]), { libreta: ["Escribe tu receta"], audio: true, libro: false });
  assertEquals(pideDeClase(d[ruta("c-mat")]), { libreta: ["Resuelve a mano"], audio: false, libro: false });
  assertEquals(pideDeClase({ tips: [] }), { libreta: [], audio: false, libro: false });
});

Deno.test("revision: el profe guarda su revisión y se lee igual en la semana", async () => {
  const store = storeCon(datos());
  const r = await guardar(store, { checks: [0], libro: true, calificacion: 9, comentario: "  Muy buena letra  " });
  assertEquals(r.status, 200);
  assertEquals(r.body.revision, { checks: [0], audio: false, libro: true, calificacion: 9, comentario: "Muy buena letra", revisadoEn: AHORA });
  assertEquals((await store.get(rutaRevision("luz", "c-esp")))!.data, r.body.revision);
  const { body } = await pedir(store, "GET", "?alumna=luz&semana=2026-10-26");
  assertEquals(body.clases.find((c: any) => c.id === "c-esp").revision, r.body.revision);
  // Audio solo si la clase lo pide: aquí no, se guarda en false.
  assertEquals((await guardar(store, { audio: true, calificacion: 8 })).body.revision.audio, false);
  assertEquals((await guardar(store, { id: "c-ing", audio: true, calificacion: 8 })).body.revision.audio, true);
});

Deno.test("revision: validaciones 400 y 404 sin guardar nada", async () => {
  const store = storeCon(datos());
  const casos: [Record<string, unknown>, string][] = [
    [{ calificacion: 9.3 }, "calificacion_invalida"], [{ calificacion: 11 }, "calificacion_invalida"], [{ calificacion: "9" }, "calificacion_invalida"],
    [{ comentario: "x".repeat(301) }, "comentario_invalido"], [{ comentario: 5 }, "comentario_invalido"],
    [{ checks: [1] }, "checks_invalidos"], [{ checks: [0, 0] }, "checks_invalidos"], [{ checks: "0" }, "checks_invalidos"],
  ];
  for (const [body, error] of casos) {
    const r = await guardar(store, body);
    assertEquals([r.status, r.body.error], [400, error], JSON.stringify(body));
  }
  assertEquals((await guardar(store, { alumna: "nadie" })).status, 404);
  assertEquals((await guardar(store, { id: "no-existe" })).status, 404);
  assertEquals((await guardar(store, { id: "c-ana", calificacion: 7 })).status, 404, "clase exclusiva de otra alumna");
  assertEquals((await pedir(store, "GET", "?alumna=nadie")).status, 404);
  assertEquals((await pedir(store, "PUT", "", "no es json")).status, 400);
  assertEquals(await store.get(rutaRevision("luz", "c-esp")), null);
});

Deno.test("revision: una revisión vacía se borra", async () => {
  const store = storeCon(datos());
  await guardar(store, { checks: [0], calificacion: 9 });
  const r = await guardar(store, {});
  assertEquals([r.status, r.body.vacia, r.body.revision], [200, true, null]);
  assertEquals(await store.get(rutaRevision("luz", "c-esp")), null);
});

Deno.test("revision: matriz de acceso (solo admin; sin base, 503)", async () => {
  const store = storeCon(datos());
  for (const correo of [LUZ, "marisol@example.com", "invitado@example.com", ""]) {
    assertEquals((await pedir(store, "GET", "?alumna=luz", undefined, correo)).status, 403, correo);
    assertEquals((await guardar(store, { calificacion: 10 }, correo)).status, 403, correo);
  }
  assertEquals(await store.get(rutaRevision("luz", "c-esp")), null);
  const sinBase = await pedir(store, "PUT", "", { alumna: "luz", id: "c-esp", calificacion: 9 }, ADMIN, { puedeGuardar: () => Promise.resolve(false) });
  assertEquals([sinBase.status, sinBase.body.error], [503, "sin_base"]);
  assertEquals((await pedir(store, "POST", "")).status, 405);
});

Deno.test("revision: si falla una lectura, la semana sale igual con aviso", async () => {
  const store = storeCon(datos());
  const get = store.get.bind(store);
  (store as any).get = (p: string) => p.startsWith("borradores/") ? Promise.reject(new Error("caída")) : get(p);
  const { status, body } = await pedir(store, "GET", "?alumna=luz&semana=2026-10-26");
  assertEquals(status, 200);
  assertEquals(body.clases.find((c: any) => c.id === "c-esp").borrador, null);
  assertEquals(body.avisos, ["borradores"]);
});

Deno.test("revision: revisiones/ vive en Postgres", () => {
  assert(esRutaPg("revisiones/luz/c-esp.json"));
  assertEquals(rutaRevision("luz", "c-esp"), "revisiones/luz/c-esp.json");
});

// ---------- Lo que ve la alumna ----------
const filasLuz = () => Promise.resolve([{ userEmails: [LUZ], userNames: ["Luz María Pérez"] }]);
async function listaAlumna(store: any, email = LUZ) {
  clearCache();
  Deno.env.set("PERMITIR_HOY", "1");
  const res = await handleSecundaria(new Request("http://x/secundaria/actividades?hoy=2026-10-28"), "", email, ADMIN, store, filasLuz, jsonR);
  return { status: res.status, body: await res.json() };
}

Deno.test("revision: la alumna ve solo la calificación y el comentario de sus clases revisadas", async () => {
  const store = storeCon(datos());
  await guardar(store, { checks: [0], libro: true, calificacion: 9, comentario: "Muy buena letra" });
  await guardar(store, { id: "c-mat", checks: [0] }); // sin calificación: aún no revisada
  const { status, body } = await listaAlumna(store);
  assertEquals(status, 200);
  const c = Object.fromEntries(body.items.map((x: any) => [x.id, x]));
  assertEquals(c["c-esp"].revision, { calificacion: 9, comentario: "Muy buena letra", revisadoEn: AHORA });
  assertEquals(c["c-mat"].revision, undefined);
  assertEquals(c["c-ing"].revision, undefined);
  assert(!JSON.stringify(body).includes("checks"), "nunca el checklist");
});

Deno.test("revision: si fallan las revisiones, la lista de la alumna sale igual", async () => {
  const store = storeCon(datos());
  await guardar(store, { calificacion: 9 });
  const list = store.list.bind(store);
  (store as any).list = (d: string) => d.startsWith("revisiones") ? Promise.reject(new Error("caída")) : list(d);
  const { status, body } = await listaAlumna(store);
  assertEquals(status, 200);
  assert(body.items.length > 0 && body.items.every((x: any) => x.revision === undefined));
});
