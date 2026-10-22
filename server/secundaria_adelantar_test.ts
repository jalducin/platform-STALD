// Adelantar clases de Secundaria (openspec: secundaria-adelantar): campo opcional `dia` (día del horario) en
// actividades y exámenes. La clase abre antes (inicio del bloque de 2 semanas) y sigue en su día del horario.
// Datos inline, sin red.
// deno-lint-ignore-file no-explicit-any
import { assert, assertEquals } from "jsr:@std/assert@1";
import "../comun/gamificacion.js";
import "../comun/secundaria-datos.js";
import { AMBITO_SECUNDARIA, clearCache, handleActividades, handleSecundaria } from "./actividades.ts";
import { validateItem } from "./motor.ts";
import { validarSemana } from "./semana.ts";
import { ej, semanaValida, storeCon, tema } from "./test_datos.ts";

const G = (globalThis as any).Gamificacion;
const SD = (globalThis as any).SecundariaDatos;
const ADMIN = "admin@example.com";
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s });
const filas = () => Promise.resolve([{ userEmails: ["luz@example.com"], userNames: ["Luz María Pérez"] }]);
const BLOQUE = "2026-10-21"; // inicio del bloque de 2 semanas: todo abre desde aquí
const HOY = "2026-10-22";

// Clase del horario tal como la manda el servidor: abre al inicio del bloque, toca en `dia` y vence al día siguiente.
const vista = (id: string, dia: string, extra: Record<string, unknown> = {}) => ({
  id, tipo: "actividad", titulo: "📐 Matemáticas · " + id, materia: "Matemáticas", dia,
  disponibleDesde: BLOQUE, fechaLimite: G.sumarDias(dia, 1), estado: "disponible", intentosUsados: 0, intentosMax: 2, mejor: null, ...extra,
});

Deno.test("diaDeClase: usa `dia` si viene; si no, la regla de antes", () => {
  assertEquals(G.diaDeClase({ dia: "2026-10-23", disponibleDesde: BLOQUE, fechaLimite: "2026-10-24" }), "2026-10-23");
  assertEquals(SD.diaDeClase({ dia: "2026-10-27", disponibleDesde: BLOQUE, fechaLimite: "2026-10-28" }), "2026-10-27");
  assertEquals(G.diaDeClase({ disponibleDesde: "2026-10-26", fechaLimite: "2026-10-27" }), "2026-10-26");
  assertEquals(G.diaDeClase({ disponibleDesde: BLOQUE, fechaLimite: "2026-10-24" }), "2026-10-24");
});

Deno.test("abiertas por adelantado: hoy y retos solo las del día; ninguna atrasada; horario y semana por su `dia`", () => {
  const items = [vista("j-a", HOY), vista("j-b", HOY), vista("v-a", "2026-10-23"), vista("s-a", "2026-10-24"), vista("l-a", "2026-10-26")];
  assertEquals(SD.clasesDeHoy(items, HOY).map((i: any) => i.id), ["j-a", "j-b"]);
  const retos = G.retosDiarios(items, HOY);
  assertEquals([retos.total, retos.retos.map((r: any) => r.item.id)], [2, ["j-a", "j-b"]]);
  assertEquals(items.map((i) => SD.estadoClase(i, HOY).clave), ["vence-manana", "vence-manana", "pendiente", "pendiente", "pendiente"]);
  const horario = SD.horarioSemana(items, HOY).map((d: any) => d.fecha + ":" + d.clases.map((c: any) => c.id).join("+"));
  assertEquals(horario, ["2026-10-19:", "2026-10-20:", "2026-10-21:", "2026-10-22:j-a+j-b", "2026-10-23:v-a", "2026-10-24:s-a", "2026-10-25:"]);
  assertEquals(SD.progresoSemana(items, HOY).total, 4, "la del lunes 26 es de la semana siguiente");
});

Deno.test("hecha antes de su día: cuenta como hecha a tiempo (+20 XP) y no es reto de hoy", () => {
  const manana = vista("v-a", "2026-10-23", { estado: "completo", intentosUsados: 1, mejor: { porcentaje: 100, correctas: 2, total: 2, secciones: [] }, mejorATiempo: true });
  assert(G.estaHecha(manana));
  assertEquals(G.xpDeClase(manana, manana.mejor, { hoy: HOY }), 120);
  assertEquals(G.retosDiarios([manana, vista("j-a", HOY)], HOY).retos.map((r: any) => r.item.id), ["j-a"]);
  assertEquals(SD.estadoClase(manana, "2026-10-23").clave, "hecha", "en su día sigue hecha");
});

// ---------- Validador ----------
function clase(id: string, dia: string | undefined, desde: string, limite: string) {
  return {
    id, tipo: "actividad", titulo: `📐 Matemáticas · ${id}`, materia: "Matemáticas", ...(dia !== undefined ? { dia } : {}),
    disponibleDesde: desde, fechaLimite: limite, intentos: 2, preguntasPorIntento: 2, alumnos: ["luz"],
    temas: [tema("t")], teoria: [{ titulo: "T", texto: "x" }], tips: [{ tipo: "libreta", texto: "y" }],
    banco: [ej(`${id}-1`, "t"), ej(`${id}-2`, "t"), ej(`${id}-3`, "t"), ej(`${id}-4`, "t")],
  };
}
// Segunda semana del bloque (lunes 26): sus clases abren el 21 y traen `dia`.
const LUNES = "2026-10-26";
function semanaSecundaria(cambios: Record<string, unknown> = {}) {
  const c = { ...clase("sec-lun", LUNES, BLOQUE, "2026-10-27"), ...cambios };
  return {
    [`contenido/secundaria/semanas/${LUNES}.json`]: { id: LUNES, titulo: "Semana 2 del bloque", elementos: [{ id: "sec-lun", tipo: "actividad", fecha: c.fechaLimite }] },
    "contenido/secundaria/actividades/sec-lun.json": c,
  };
}

Deno.test("validateItem: `dia` opcional, fecha real dentro de [disponibleDesde, fechaLimite]", () => {
  assertEquals(validateItem(clase("a", "2026-10-22", BLOQUE, "2026-10-23") as any), []);
  assertEquals(validateItem(clase("a", undefined, BLOQUE, "2026-10-23") as any), []);
  for (const dia of ["2026-10-20", "2026-10-24", "22-10-2026", "2026-02-30", "", 7]) {
    const errs = validateItem(clase("a", dia as any, BLOQUE, "2026-10-23") as any);
    assert(errs.some((e) => e.startsWith("a: dia")), `dia ${JSON.stringify(dia)}: ${errs.join(" | ")}`);
  }
});

Deno.test("validar --secundaria: con `dia`, disponibleDesde puede ser anterior a la semana", async () => {
  clearCache();
  assertEquals((await validarSemana(storeCon(semanaSecundaria()), LUNES, AMBITO_SECUNDARIA)).errores, []);
  clearCache();
  const sinDia = { ...semanaSecundaria() };
  delete (sinDia["contenido/secundaria/actividades/sec-lun.json"] as any).dia;
  const r = await validarSemana(storeCon(sinDia), LUNES, AMBITO_SECUNDARIA);
  assert(r.errores.some((e) => e.startsWith(`sec-lun: disponibleDesde ${BLOQUE} fuera de ${LUNES}`)), r.errores.join("\n"));
});

Deno.test("validar --secundaria: `dia` fuera de la semana o apertura después de la fecha límite son error", async () => {
  clearCache();
  const fuera = await validarSemana(storeCon(semanaSecundaria({ dia: "2026-10-25", fechaLimite: "2026-10-27" })), LUNES, AMBITO_SECUNDARIA);
  assert(fuera.errores.some((e) => e.startsWith("sec-lun: dia 2026-10-25 fuera de la semana")), fuera.errores.join("\n"));
  clearCache();
  const tarde = await validarSemana(storeCon(semanaSecundaria({ disponibleDesde: "2026-10-28" })), LUNES, AMBITO_SECUNDARIA);
  assert(tarde.errores.some((e) => e.startsWith("sec-lun: disponibleDesde 2026-10-28 fuera de")), tarde.errores.join("\n"));
});

Deno.test("validar Inglés: `dia` no cambia sus reglas (no puede abrir antes del lunes)", async () => {
  const f = semanaValida();
  Object.assign(f["contenido/actividades/act-2026-10-06.json"] as any, { dia: "2026-10-06", disponibleDesde: "2026-10-01" });
  clearCache();
  const r = await validarSemana(storeCon(f), "2026-10-05");
  assert(r.errores.some((e) => e.startsWith("act-2026-10-06: disponibleDesde 2026-10-01 fuera de 2026-10-05")), r.errores.join("\n"));
});

// ---------- Servidor ----------
async function listaSecundaria(store: any, email: string, hoy = HOY) {
  Deno.env.set("PERMITIR_HOY", "1");
  const res = await handleSecundaria(new Request(`http://x/secundaria/actividades?hoy=${hoy}`), "", email, ADMIN, store, filas, json);
  return { status: res.status, body: await res.json() };
}

Deno.test("/secundaria/actividades: deja pasar `dia` y lista la semana siguiente ya abierta", async () => {
  // Semana 1 del bloque (lunes 19) con una clase el jueves 22, y la semana 2 (lunes 26), todo abierto desde el 21.
  const f: Record<string, unknown> = {
    ...semanaSecundaria(),
    "contenido/secundaria/semanas/2026-10-19.json": { id: "2026-10-19", titulo: "Semana 1 del bloque", elementos: [{ id: "sec-jue", tipo: "actividad", fecha: "2026-10-23" }] },
    "contenido/secundaria/actividades/sec-jue.json": clase("sec-jue", HOY, BLOQUE, "2026-10-23"),
  };
  clearCache();
  const luz = await listaSecundaria(storeCon(f), "luz@example.com");
  assertEquals(luz.status, 200);
  const por = new Map(luz.body.items.map((i: any) => [i.id, i]));
  assertEquals([(por.get("sec-jue") as any)?.dia, (por.get("sec-jue") as any)?.estado], [HOY, "disponible"]);
  assertEquals([(por.get("sec-lun") as any)?.dia, (por.get("sec-lun") as any)?.estado], [LUNES, "disponible"], "la del lunes 26 ya se puede resolver");
  const admin = await listaSecundaria(storeCon(f), ADMIN);
  assertEquals(admin.body.items.find((i: any) => i.id === "sec-jue").dia, HOY);
  // Antes de que abra el bloque, la semana siguiente no aparece.
  clearCache();
  const antes = await listaSecundaria(storeCon(f), "luz@example.com", "2026-10-20");
  assertEquals(antes.body.items.some((i: any) => i.id === "sec-lun"), false);
});

Deno.test("/ingles/actividades: deja pasar `dia` y no lista semanas futuras", async () => {
  const f = semanaValida();
  (f["contenido/actividades/act-2026-10-06.json"] as any).dia = "2026-10-06";
  clearCache();
  Deno.env.set("PERMITIR_HOY", "1");
  const res = await handleActividades(new Request("http://x/ingles/actividades?hoy=2026-10-06"), "", { isAdmin: false, alumno: "Luz" }, storeCon(f), json);
  const items = (await res.json()).items as any[];
  assertEquals(items.find((i) => i.id === "act-2026-10-06").dia, "2026-10-06");
  assertEquals("dia" in items.find((i) => i.id === "act-2026-10-08"), false);
  clearCache();
  const antes = await handleActividades(new Request("http://x/ingles/actividades?hoy=2026-10-01"), "", { isAdmin: false, alumno: "Luz" }, storeCon(f), json);
  assertEquals(((await antes.json()).items as any[]).length, 0);
});
