// Tablero de Secundaria (openspec: secundaria-dashboard): reglas puras de comun/secundaria-datos.js que comparten
// ingles.html?modo=secundaria (Inicio y «📚 Mis materias») y el bloque «🗓️ Mi horario» del portal.
// deno-lint-ignore-file no-explicit-any
import { assertEquals } from "jsr:@std/assert@1";
import "../comun/gamificacion.js"; // secundaria-datos.js la usa (materias, día de la clase, mundos)
import "../comun/secundaria-datos.js";
import { clearCache, handleSecundaria } from "./actividades.ts";
import { clearCacheAlumnos, leerRegistro, RUTA_ALUMNOS } from "./alumnos.ts";
import { filasSecundaria } from "./secundaria_registro.ts";
import { storeCon, tema } from "./test_datos.ts";

const SD = (globalThis as any).SecundariaDatos;

// Clase de un día (como las del repo de datos: abre su día y vence al siguiente).
const clase = (id: string, dia: string, extra: Record<string, unknown> = {}) => ({
  id, tipo: "actividad", titulo: "📐 Matemáticas · Tema " + id, materia: "Matemáticas",
  disponibleDesde: dia, fechaLimite: SD.sumarDias(dia, 1), estado: "disponible", intentosUsados: 0, intentosMax: 2, mejor: null, ...extra,
});
const hecha = (pct: number, estado = "completo") => ({ estado, intentosUsados: estado === "completo" ? 2 : 1, mejor: { porcentaje: pct } });

Deno.test("día de la clase: disponibleDesde si dura un día; la fecha límite si tiene ventana", () => {
  assertEquals(SD.diaDeClase({ disponibleDesde: "2026-10-26", fechaLimite: "2026-10-27" }), "2026-10-26");
  assertEquals(SD.diaDeClase({ disponibleDesde: "2026-10-27", fechaLimite: "2026-10-27" }), "2026-10-27");
  assertEquals(SD.diaDeClase({ disponibleDesde: "2026-10-21", fechaLimite: "2026-10-24" }), "2026-10-24");
  assertEquals(SD.diaDeClase({ fechaLimite: "2026-10-30" }), "2026-10-30");
});

Deno.test("estado de cada tarjeta: pendiente, vence hoy o mañana, en curso, hecha con calificación y todavía no abre", () => {
  const hoy = "2026-10-27";
  const e = (extra: Record<string, unknown>) => SD.estadoClase({ ...clase("x", hoy), ...extra }, hoy);
  assertEquals([e({}).clave, e({}).boton, e({}).accion], ["vence-manana", "Empezar", "abrir-item"]);
  assertEquals(e({ fechaLimite: hoy }).clave, "vence-hoy");
  assertEquals(e({ fechaLimite: "2026-10-30" }).clave, "pendiente");
  assertEquals(e({ fechaLimite: "2026-10-26", disponibleDesde: "2026-10-25" }).clave, "atrasada");
  const curso = e(hecha(70, "en-curso"));
  assertEquals([curso.clave, curso.boton, curso.accion, curso.porcentaje], ["en-curso", "Continuar", "abrir-item", 70]);
  const lista = e(hecha(85));
  assertEquals([lista.clave, lista.boton, lista.accion, lista.porcentaje], ["hecha", "Ver resultado", "ver-resultado", 85]);
  assertEquals(e({ ...hecha(60, "en-espera"), tipo: "examen" }).clave, "hecha");
  const prox = e({ estado: "proximamente", disponibleDesde: "2026-10-28" });
  assertEquals([prox.clave, prox.boton, prox.accion], ["proxima", null, null]);
});

Deno.test("hoy te toca: las clases de hoy y, antes, lo pendiente que vence hoy", () => {
  const hoy = "2026-10-27";
  const items = [
    clase("lun", "2026-10-26"), // vence hoy y no está hecha
    clase("lun-hecha", "2026-10-26", hecha(90)), // vence hoy pero ya está hecha: no se repite
    clase("mar-a", hoy), clase("mar-b", hoy, hecha(100)),
    clase("mie", "2026-10-28"),
  ];
  assertEquals(SD.clasesDeHoy(items, hoy).map((i: any) => i.id), ["lun", "mar-a", "mar-b"]);
  assertEquals(SD.clasesDeHoy([clase("mie", "2026-10-28")], hoy), []);
});

Deno.test("progreso de la semana: hechas (con un envío) entre las clases de lunes a domingo de hoy", () => {
  const hoy = "2026-10-27";
  const items = [
    clase("a", "2026-10-26", hecha(100)), clase("b", "2026-10-26", hecha(50, "en-curso")), clase("c", hoy),
    clase("d", "2026-11-01"), clase("fuera", "2026-11-02", hecha(100)), clase("antes", "2026-10-25", hecha(100)),
  ];
  assertEquals(SD.progresoSemana(items, hoy), { hechas: 2, total: 4, porcentaje: 50 });
  assertEquals(SD.progresoSemana([], hoy), { hechas: 0, total: 0, porcentaje: 0 });
});

Deno.test("racha: la del servidor (días seguidos con al menos un envío), con 0 si no viene", () => {
  assertEquals(SD.rachaDe({ racha: { dias: 3, hoy: true } }), { dias: 3, hoy: true });
  assertEquals(SD.rachaDe({}), { dias: 0, hoy: false });
  assertEquals(SD.rachaDe({ racha: { dias: "x" } }), { dias: 0, hoy: false });
});

Deno.test("promedio por materia: media de la mejor calificación de las clases hechas, redondeada", () => {
  const items = [
    clase("m1", "2026-10-26", hecha(100)), clase("m2", "2026-10-27", hecha(75, "en-curso")), clase("m3", "2026-10-28"),
    { ...clase("i1", "2026-10-26", hecha(80)), titulo: "🗣️ Inglés · Hola", materia: "Inglés" },
    { ...clase("r1", "2026-10-26", hecha(90)), titulo: "Repaso general · Todo", materia: undefined },
  ];
  const res = SD.resumenMaterias(items, "2026-10-27");
  const mate = res.find((m: any) => m.clave === "matematicas");
  assertEquals([mate.total, mate.hechas, mate.promedio], [3, 2, 88]);
  const ingles = res.find((m: any) => m.clave === "ingles");
  assertEquals([ingles.total, ingles.hechas, ingles.promedio], [1, 1, 80]);
  const ciencias = res.find((m: any) => m.clave === "ciencias");
  assertEquals([ciencias.total, ciencias.hechas, ciencias.promedio], [0, 0, null]);
  // Sin materia («Repaso general») va a «Otras», que solo aparece si hay alguna.
  const otras = res.find((m: any) => m.clave === "otra");
  assertEquals([otras.nombre, otras.total, otras.promedio], ["Otras clases", 1, 90]);
  assertEquals(SD.resumenMaterias([clase("m1", "2026-10-26")], "2026-10-27").some((m: any) => m.clave === "otra"), false);
  assertEquals(SD.promedio([]), null);
});

Deno.test("Mis materias: las 8 materias en orden, con su secuencia y la etapa actual según la fecha", () => {
  const res = SD.resumenMaterias([], "2026-10-27");
  assertEquals(res.map((m: any) => m.nombre), ["Inglés", "Español", "Matemáticas", "Tecnología", "Ciencias", "Ciencias Sociales", "Artes", "Educación Física"]);
  const etapas = (clave: string, hoy: string) => SD.resumenMaterias([], hoy).find((m: any) => m.clave === clave).etapas.map((e: any) => e.nombre + (e.actual ? "*" : "")).join(" → ");
  assertEquals(etapas("matematicas", "2026-10-27"), "Aritmética* → Geometría → Álgebra");
  assertEquals(etapas("matematicas", "2026-11-23"), "Aritmética → Geometría* → Álgebra");
  assertEquals(etapas("matematicas", "2027-02-10"), "Aritmética → Geometría → Álgebra*");
  assertEquals(etapas("matematicas", "2026-12-25"), "Aritmética → Geometría* → Álgebra"); // vacaciones: el último que empezó
  assertEquals(etapas("ciencias", "2026-10-27"), "Biología* → Química → Física");
  assertEquals(etapas("sociales", "2026-11-23"), "Cívica y Ética → Historia* → Geografía");
  assertEquals(etapas("tecnologia", "2026-12-06"), "Bases* → Programación → IA");
  assertEquals(etapas("tecnologia", "2026-12-14"), "Bases → Programación* → IA");
  // Inglés avanza a su ritmo: sin fechas no se marca etapa actual (no se inventa).
  assertEquals(SD.resumenMaterias([], "2026-10-27").find((m: any) => m.clave === "ingles").etapas.some((e: any) => e.actual), false);
});

Deno.test("Mis materias: último tema visto (la clase más reciente de esa materia hasta hoy)", () => {
  const items = [clase("m1", "2026-10-26"), { ...clase("m2", "2026-10-27"), titulo: "📐 Matemáticas · MCD y mcm" }, clase("m3", "2026-10-29")];
  assertEquals(SD.resumenMaterias(items, "2026-10-27").find((m: any) => m.clave === "matematicas").ultimoTema, "MCD y mcm");
  assertEquals(SD.resumenMaterias([], "2026-10-27").find((m: any) => m.clave === "matematicas").ultimoTema, null);
});

Deno.test("horario de la semana: 7 días de lunes a domingo con sus clases y hoy marcado", () => {
  const hoy = "2026-10-27";
  const items = [clase("a", "2026-10-26"), clase("b", hoy), clase("c", "2026-11-01"), clase("d", "2026-11-01"), clase("e", "2026-11-01"), clase("f", "2026-11-02")];
  const h = SD.horarioSemana(items, hoy);
  assertEquals(h.map((d: any) => d.fecha), ["2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31", "2026-11-01"]);
  assertEquals(h.map((d: any) => d.clases.length), [1, 1, 0, 0, 0, 0, 3]);
  assertEquals(h.map((d: any) => d.esHoy), [false, true, false, false, false, false, false]);
  assertEquals([SD.nombreDia("2026-10-26"), SD.nombreDia("2026-11-01"), SD.diaCorto("2026-10-28")], ["Lunes 26", "Domingo 1", "Mié 28"]);
});

Deno.test("materia de cada clase: explícita, deducida del título por palabra completa o ninguna", () => {
  const m = (it: Record<string, unknown>) => { const r = SD.materiaDe(it); return r ? [r.nombre, r.clave, r.emoji] : null; };
  assertEquals(m({ titulo: "x", materia: "Matemáticas" }), ["Matemáticas", "matematicas", "📐"]);
  assertEquals(m({ titulo: "🔬 Ciencias · La célula" }), ["Ciencias", "ciencias", "🔬"]);
  assertEquals(m({ titulo: "🌎 Ciencias Sociales · Mapas" }), ["Ciencias Sociales", "sociales", "🏛️"]);
  assertEquals(m({ titulo: "🦴 Partes del cuerpo · Huesos" }), ["Partes del cuerpo", "otra", "📘"]);
  assertEquals(m({ titulo: "Sin prefijo" }), null);
  assertEquals(SD.temaDe({ titulo: "📐 Matemáticas · Fracciones", materia: "Matemáticas" }), "Fracciones");
  assertEquals(SD.temaDe({ titulo: "Repaso general · Todo" }), "Todo"); // el prefijo ya va en el chip
  assertEquals(SD.temaDe({ titulo: "📝 Examen mensual" }), "Examen mensual");
});

// ---------- Contrato que usa el tablero (sin cambios en el servidor) ----------
// `/secundaria/actividades` de la alumna, y la del admin con `?alumna=<slug>`, traen lo que el tablero necesita:
// `hoy`, `racha` y por clase `estado`, `intentosUsados`, `mejor`, `disponibleDesde`, `fechaLimite` y `materia`.
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s });
const preg = (id: string) => ({ id, tema: "t", tipo: "opcion", enunciado: `¿${id}?`, opciones: ["bien", "mal"], correcta: 0, explicacion: "x" });
const claseDatos = (id: string, dia: string, materia: string) => ({
  id, tipo: "actividad", titulo: `📐 ${materia} · ${id}`, materia, disponibleDesde: dia, fechaLimite: SD.sumarDias(dia, 1),
  intentos: 2, preguntasPorIntento: 2, alumnos: ["luz"], temas: [tema("t")], banco: [preg(id + "1"), preg(id + "2")],
});
function tienda() {
  clearCacheAlumnos();
  clearCache();
  return storeCon({
    [RUTA_ALUMNOS]: { "luz@example.com": { nombre: "Luz", alta: "2026-09-01T12:00:00.000Z", secundaria: true } },
    "contenido/secundaria/semanas/2026-10-26.json": { id: "2026-10-26", titulo: "Semana 1", elementos: [
      { id: "sec-mate-26", tipo: "actividad", fecha: "2026-10-27" }, { id: "sec-ingles-27", tipo: "actividad", fecha: "2026-10-28" },
    ] },
    "contenido/secundaria/actividades/sec-mate-26.json": claseDatos("sec-mate-26", "2026-10-26", "Matemáticas"),
    "contenido/secundaria/actividades/sec-ingles-27.json": claseDatos("sec-ingles-27", "2026-10-27", "Inglés"),
  });
}
async function pedir(store: any, email: string, q = "") {
  Deno.env.set("PERMITIR_HOY", "1");
  const req = new Request(`http://x/secundaria/actividades?hoy=2026-10-27${q}`);
  const filas = () => filasSecundaria({ registro: () => leerRegistro(store), notion: () => Promise.resolve([]), avisar: () => {} });
  const res = await handleSecundaria(req, "", email, "admin@example.com", store, filas, json);
  return { status: res.status, body: await res.json() };
}

Deno.test("contrato del tablero: la alumna y el admin con ?alumna reciben hoy, racha, estado y mejor por clase", async () => {
  const store = tienda();
  const mejor = { porcentaje: 80, correctas: 2, total: 2, secciones: [] };
  await store.put("resultados/sec-mate-26/luz.json", { alumno: "Luz", itemId: "sec-mate-26", intentos: [{ n: 1, enviadoEn: "2026-10-27T18:00:00Z", calificacion: mejor, respuestas: {} }], mejor }, null);
  const ella = await pedir(store, "luz@example.com");
  const admin = await pedir(store, "admin@example.com", "&alumna=luz");
  for (const [quien, r] of [["alumna", ella], ["admin", admin]] as const) {
    assertEquals([r.status, r.body.hoy, r.body.racha], [200, "2026-10-27", { dias: 1, hoy: true }], quien);
    const mate = r.body.items.find((i: any) => i.id === "sec-mate-26");
    assertEquals([mate.estado, mate.intentosUsados, mate.mejor.porcentaje, mate.disponibleDesde, mate.fechaLimite, mate.materia],
      ["en-curso", 1, 80, "2026-10-26", "2026-10-27", "Matemáticas"], quien);
    // Con esos datos: progreso 1 de 2, promedio de Matemáticas 80 y hoy toca Inglés (la de ayer ya está hecha).
    assertEquals(SD.progresoSemana(r.body.items, r.body.hoy), { hechas: 1, total: 2, porcentaje: 50 }, quien);
    assertEquals(SD.resumenMaterias(r.body.items, r.body.hoy).find((m: any) => m.clave === "matematicas").promedio, 80, quien);
    assertEquals(SD.clasesDeHoy(r.body.items, r.body.hoy).map((i: any) => i.id), ["sec-ingles-27"], quien);
  }
  assertEquals([admin.body.isAdmin, admin.body.vistaDe], [true, { nombre: "Luz", slug: "luz" }]);
});
