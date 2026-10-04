// Inglés pro (openspec: ingles-pro): racha, tablero del profe (/ingles/resumen) y prórroga desde el cajón.
// deno-lint-ignore-file no-explicit-any
import { assert, assertEquals } from "jsr:@std/assert@1";
import { calcularRacha } from "./motor.ts";
import { clearCache, handleActividades } from "./actividades.ts";
import { handleResumen } from "./resumen.ts";
import { createDb, PgStore } from "./db.ts";
import { MemoryStore } from "./store.ts";
import { postgrestFalso } from "./test_postgrest.ts";
import { semanaValida, storeCon } from "./test_datos.ts";

const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s });
const ADMIN = "admin@example.com";

// ---------- Racha ----------
Deno.test("racha: días seguidos con entregas que terminan hoy o ayer", () => {
  assertEquals(calcularRacha([], "2026-10-08"), { dias: 0, hoy: false });
  assertEquals(calcularRacha(["2026-10-06", "2026-10-07", "2026-10-08"], "2026-10-08"), { dias: 3, hoy: true });
  assertEquals(calcularRacha(["2026-10-06", "2026-10-07"], "2026-10-08"), { dias: 2, hoy: false }, "ayer: la racha sigue viva");
  assertEquals(calcularRacha(["2026-10-05", "2026-10-06"], "2026-10-08"), { dias: 0, hoy: false }, "antier: se rompió");
  assertEquals(calcularRacha(["2026-10-04", "2026-10-07", "2026-10-08", "2026-10-08"], "2026-10-08"), { dias: 2, hoy: true }, "hueco y repetidos");
  assertEquals(calcularRacha(["2026-09-30", "2026-10-01"], "2026-10-01"), { dias: 2, hoy: true }, "cruza de mes");
  assertEquals(calcularRacha(["2026-10-09"], "2026-10-08"), { dias: 0, hoy: false }, "fechas futuras no cuentan");
});

const intento = (n: number, enviadoEn: string, porcentaje: number, fueraDeTiempo = false) => ({
  n, enviadoEn, fueraDeTiempo, preguntas: [], respuestas: {},
  calificacion: { correctas: 0, total: 4, porcentaje, nivelSugerido: "", fortalezas: [], enProgreso: [], debilidades: [], secciones: [], revision: [] },
});
const resultado = (id: string, alumno: string, intentos: any[]) => ({
  id, titulo: id, alumno, intentos, mejor: intentos.length ? { ...intentos.reduce((a, b) => (b.calificacion.porcentaje > a.calificacion.porcentaje ? b : a)).calificacion, n: 1 } : null,
});

Deno.test("racha: /ingles/actividades la calcula con la hora de CDMX para el alumno o alumna", async () => {
  const s = storeCon({
    ...semanaValida(),
    // 2026-10-07 02:00 UTC = 6 oct 20:00 en CDMX: cuenta como martes.
    "resultados/act-2026-10-06/luz.json": resultado("act-2026-10-06", "Luz", [intento(1, "2026-10-07T02:00:00Z", 75)]),
    "resultados/act-2026-10-08/luz.json": resultado("act-2026-10-08", "Luz", [intento(1, "2026-10-07T18:00:00Z", 50), intento(2, "2026-10-08T15:00:00Z", 100)]),
  });
  Deno.env.set("PERMITIR_HOY", "1");
  clearCache();
  const res = await handleActividades(new Request("http://x/ingles/actividades?email=x&hoy=2026-10-08"), "", { isAdmin: false, alumno: "Luz" }, s, json);
  const body = await res.json();
  assertEquals(body.racha, { dias: 3, hoy: true });
  clearCache();
  const otra = await (await handleActividades(new Request("http://x/ingles/actividades?email=x&hoy=2026-10-08"), "", { isAdmin: false, alumno: "Marisol" }, s, json)).json();
  assertEquals(otra.racha, { dias: 0, hoy: false });
});

// ---------- /ingles/resumen ----------
function datosResumen() {
  return storeCon({
    ...semanaValida(),
    "resultados/act-2026-10-06/luz.json": resultado("act-2026-10-06", "Luz", [intento(1, "2026-10-06T15:00:00Z", 80)]),
    "resultados/act-2026-10-08/luz.json": resultado("act-2026-10-08", "Luz", [intento(1, "2026-10-09T15:00:00Z", 60, true)]),
    "resultados/act-2026-10-06/marisol.json": resultado("act-2026-10-06", "Marisol", [intento(1, "2026-10-06T16:00:00Z", 100)]),
    "resultados/act-2026-10-06/profe.json": resultado("act-2026-10-06", "Profe", [intento(1, "2026-10-05T16:00:00Z", 100)]),
  });
}
const ALUMNOS = [{ nombre: "Luz" }, { nombre: "Marisol" }, { nombre: "Angel" }, { nombre: "Nueva", inicio: "2026-10-12" }];
async function resumen(store: any, email: string, query = "", extra: Record<string, unknown> = {}) {
  Deno.env.set("PERMITIR_HOY", "1");
  clearCache();
  const req = new Request("http://x/ingles/resumen?email=" + email + "&hoy=2026-10-09" + query);
  const res = await handleResumen(req, { email, admin: ADMIN, store, alumnos: () => Promise.resolve(ALUMNOS), ...extra }, json);
  return { status: res.status, body: await res.json() };
}

Deno.test("resumen: solo el admin", async () => {
  assertEquals((await resumen(datosResumen(), "luz@example.com")).status, 403);
  assertEquals((await resumen(datosResumen(), "")).status, 403);
});

Deno.test("resumen: columnas de la semana, celdas por estado y profe fuera", async () => {
  const { status, body } = await resumen(datosResumen(), ADMIN);
  assertEquals(status, 200);
  assertEquals(body.semana, { id: "2026-10-05", titulo: "Semana 2" });
  assertEquals(body.columnas.map((c: any) => c.id), ["act-2026-10-06", "act-2026-10-08", "examen-2026-10-09", "refuerzo-2026-10-10", "meet-2026-10-11"]);
  assertEquals(body.filas.map((f: any) => f.alumno), ["Angel", "Luz", "Marisol", "Nueva"], "orden alfabético, sin Profe");
  const luz = body.filas.find((f: any) => f.alumno === "Luz").celdas;
  assertEquals(luz["act-2026-10-06"], { estado: "hecho", porcentaje: 80, fueraDeTiempo: false, intentos: 1 });
  assertEquals(luz["act-2026-10-08"], { estado: "hecho", porcentaje: 60, fueraDeTiempo: true, intentos: 1 });
  assertEquals(luz["examen-2026-10-09"].estado, "hoy");
  assertEquals(luz["refuerzo-2026-10-10"].estado, "proximamente");
  const angel = body.filas.find((f: any) => f.alumno === "Angel").celdas;
  assertEquals([angel["act-2026-10-06"].estado, angel["act-2026-10-08"].estado], ["atrasado", "atrasado"]);
  const nueva = body.filas.find((f: any) => f.alumno === "Nueva").celdas;
  assertEquals(nueva["act-2026-10-06"].estado, "no-aplica", "alta nueva: empieza después");
});

Deno.test("resumen: indicadores del grupo", async () => {
  const { body } = await resumen(datosResumen(), ADMIN);
  // Vencidas o entregadas: Luz 2 (1 a tiempo), Marisol 1 a tiempo + 1 atrasada, Angel 2 atrasadas. Nueva no aplica.
  assertEquals(body.kpis.alumnos, 4);
  assertEquals(body.kpis.atrasos, 3);
  assertEquals(body.kpis.aTiempo, 33, "2 a tiempo de 6");
  assertEquals(body.kpis.promedio, 80, "(80 + 60 + 100) / 3");
  assertEquals(body.kpis.sinEntregas, ["Angel"], "Nueva no tiene nada que entregar todavía");
});

Deno.test("resumen: prórroga de la alumna en su celda", async () => {
  const s = datosResumen();
  const doc = await s.get<any>("contenido/actividades/act-2026-10-08.json");
  await s.put("contenido/actividades/act-2026-10-08.json", { ...doc!.data, prorrogas: { angel: "2026-10-10" } }, doc!.sha);
  const { body } = await resumen(s, ADMIN);
  const angel = body.filas.find((f: any) => f.alumno === "Angel").celdas["act-2026-10-08"];
  assertEquals([angel.estado, angel.prorroga], ["pendiente", "2026-10-10"]);
});

Deno.test("resumen: filtra por grupo y respeta el calendario del grupo", async () => {
  const s = datosResumen();
  const sem = await s.get<any>("contenido/semanas/2026-10-05.json");
  const grupos: Record<string, string> = { luz: "sabado-a1", marisol: "domingo-b1", angel: "domingo-b1", nueva: "domingo-b1" };
  const extra = {
    grupoDe: (slug: string) => Promise.resolve(grupos[slug] ?? null),
    grupoInfo: (id: string) => Promise.resolve({ id, nombre: id === "sabado-a1" ? "Sábado A1" : "Domingo B1", nivel: null, horario: null, meet_url: null, color: "#4f46e5" }),
  };
  const b1 = (await resumen(s, ADMIN, "&grupo=domingo-b1", extra)).body;
  assertEquals(b1.grupo.nombre, "Domingo B1");
  assertEquals(b1.filas.map((f: any) => f.alumno), ["Angel", "Marisol", "Nueva"]);
  assertEquals(b1.filas[0].grupo, "domingo-b1");
  // Semana solo para Sábado A1: el grupo Domingo B1 no tiene columnas.
  await s.put("contenido/semanas/2026-10-05.json", { ...sem!.data, grupos: ["sabado-a1"] }, sem!.sha);
  const b1b = (await resumen(s, ADMIN, "&grupo=domingo-b1", extra)).body;
  assert(b1b.filas.every((f: any) => Object.values(f.celdas).every((c: any) => c.estado === "no-aplica")), JSON.stringify(b1b.filas[0]));
  assertEquals(b1b.kpis.atrasos, 0);
  const a1 = (await resumen(s, ADMIN, "&grupo=sabado-a1", extra)).body;
  assertEquals(a1.filas.map((f: any) => f.alumno), ["Luz"]);
  assertEquals(a1.filas[0].celdas["act-2026-10-06"].estado, "hecho");
});

Deno.test("resumen: con PgStore lee los resultados de cada actividad en una consulta", async () => {
  const fake = postgrestFalso();
  let consultas = 0;
  const contar = (async (u: string | URL | Request, init?: RequestInit) => {
    if (decodeURIComponent(String(u)).includes("resultados/")) consultas++;
    return await fake.fetch(u, init);
  }) as typeof fetch;
  const base: MemoryStore = datosResumen();
  const store = new PgStore(createDb({ url: "https://p", key: "k", fetch: contar }), base);
  // Los resultados pasan a Postgres y se quitan del almacén base: así se comprueba que se leen de ahí.
  for (const [path, f] of [...base.files]) if (path.startsWith("resultados/")) { await store.put(path, f.data, null, "x"); base.files.delete(path); }
  consultas = 0;
  const { body } = await resumen(store, ADMIN);
  assertEquals(body.filas.find((f: any) => f.alumno === "Luz").celdas["act-2026-10-06"].porcentaje, 80);
  assertEquals(consultas, 5, "una consulta por columna");
});

// ---------- Prórroga desde el cajón del profe ----------
async function prorroga(s: MemoryStore, quien: any, body: unknown, id = "act-2026-10-08") {
  clearCache();
  const req = new Request(`http://x/ingles/actividades/${id}/prorroga?email=x`, { method: "POST", body: JSON.stringify(body) });
  const res = await handleActividades(req, `/${id}/prorroga`, quien, s, json);
  return { status: res.status, body: await res.json() };
}

Deno.test("prórroga: el admin la da y la quita; la alumna ve su nueva fecha", async () => {
  const s = storeCon(semanaValida());
  const r = await prorroga(s, { isAdmin: true, alumno: null }, { alumno: "Luz María", fecha: "2026-10-12" });
  assertEquals([r.status, r.body.prorrogas], [200, { "luz-maria": "2026-10-12" }]);
  assertEquals((await s.get<any>("contenido/actividades/act-2026-10-08.json"))!.data.prorrogas, { "luz-maria": "2026-10-12" });
  Deno.env.set("PERMITIR_HOY", "1");
  clearCache();
  const lista = await (await handleActividades(new Request("http://x/ingles/actividades?email=x&hoy=2026-10-09"), "", { isAdmin: false, alumno: "Luz María" }, s, json)).json();
  assertEquals(lista.items.find((i: any) => i.id === "act-2026-10-08").fechaLimite, "2026-10-12");
  clearCache();
  const admin = await (await handleActividades(new Request("http://x/ingles/actividades?email=x&hoy=2026-10-09"), "", { isAdmin: true, alumno: null }, s, json)).json();
  assertEquals(admin.items.find((i: any) => i.id === "act-2026-10-08").prorrogas, { "luz-maria": "2026-10-12" }, "el admin ve las prórrogas");
  const q = await prorroga(s, { isAdmin: true, alumno: null }, { alumno: "Luz María", fecha: null });
  assertEquals([q.status, q.body.prorrogas], [200, {}]);
  assertEquals("prorrogas" in (await s.get<any>("contenido/actividades/act-2026-10-08.json"))!.data, false);
});

Deno.test("prórroga: validación y permisos", async () => {
  const s = storeCon(semanaValida());
  assertEquals((await prorroga(s, { isAdmin: false, alumno: "Luz" }, { alumno: "Luz", fecha: "2026-10-12" })).status, 403);
  assertEquals((await prorroga(s, { isAdmin: true, alumno: null }, { alumno: "Luz", fecha: "mañana" })).body.error, "fecha_invalida");
  assertEquals((await prorroga(s, { isAdmin: true, alumno: null }, { alumno: "Luz", fecha: "2026-10-01" })).body.error, "fecha_invalida", "antes de que abra");
  assertEquals((await prorroga(s, { isAdmin: true, alumno: null }, { alumno: "", fecha: "2026-10-12" })).body.error, "alumno_invalido");
  assertEquals((await prorroga(s, { isAdmin: true, alumno: null }, { alumno: "Luz", fecha: "2026-10-12" }, "no-existe")).status, 404);
});
