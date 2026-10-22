// Grupos ocultos del panel del admin (openspec: ingles-ocultar-grupos): POST /ingles/grupos/ocultar (solo admin),
// `ocultoAdmin` en GET /ingles/grupos, filtro de /ingles/resumen y acceso intacto de alumnos y alumnas del grupo
// oculto. Sin red: PostgREST falso en memoria (tablas stald_test_*) y contenido en un almacén en memoria (DATA_DIR);
// nunca tablas `stald_` reales.
// deno-lint-ignore-file no-explicit-any
import { assert, assertEquals } from "jsr:@std/assert@1";
import { postgrestFalso } from "./test_postgrest.ts";
import { semanaValida } from "./test_datos.ts";
import { clearCacheGrupos } from "./grupos.ts";

const PG_URL = "https://pg-falso.example.com";
const fake = postgrestFalso("stald_test_");
const fetchReal = globalThis.fetch;
// createDb toma el fetch global al importar main.ts: las llamadas a PG_URL van al PostgREST falso.
globalThis.fetch = ((u: string | URL | Request, init?: RequestInit) =>
  String(u instanceof Request ? u.url : u).startsWith(PG_URL) ? fake.fetch(u, init) : fetchReal(u, init)) as typeof fetch;

const dir = await Deno.makeTempDir();
await Deno.writeTextFile(dir + "/rows.json", JSON.stringify({ secundaria: [] }));
for (const [path, data] of Object.entries(semanaValida())) {
  await Deno.mkdir(dir + "/datos/" + path.split("/").slice(0, -1).join("/"), { recursive: true });
  await Deno.writeTextFile(dir + "/datos/" + path, JSON.stringify(data));
}
const registro = {
  "luz@example.com": { nombre: "Luz", alta: "2026-09-01T00:00:00.000Z" },
  "sofia@example.com": { nombre: "Sofía", alta: "2026-09-01T00:00:00.000Z" },
};
// Luz en el Grupo 1 y Sofía en el Grupo 2 (el que se oculta).
fake.tabla("stald_test_docs").push(
  { path: "meta/migrado", data: { en: "2026-10-01" }, version: 1 },
  { path: "alumnos.json", data: registro, version: 1 },
);
fake.tabla("stald_test_grupos").push(
  { id: "grupo-1", nombre: "Grupo 1", nivel: null, horario: null, meet_url: null, color: "#4f46e5", activo: true, orden: 0, oculto_admin: false },
  { id: "grupo-2", nombre: "Grupo 2", nivel: "A1", horario: "Sáb 10:00", meet_url: "https://meet.google.com/abc-defg-hij", color: "#db2777", activo: true, orden: 1, oculto_admin: false },
);
fake.tabla("stald_test_inscripciones").push(
  { alumno: "luz", grupo_id: "grupo-1", desde: "2026-09-28", hasta: null },
  { alumno: "sofia", grupo_id: "grupo-2", desde: "2026-09-28", hasta: null },
);

Deno.env.set("ROWS_FIXTURE", dir + "/rows.json");
Deno.env.set("DATA_DIR", dir + "/datos");
Deno.env.set("SUPER_ADMIN_EMAIL", "admin@example.com");
Deno.env.set("HOY_FIJO", "2026-10-06");
Deno.env.set("LOGIN_TRANSICION_HASTA", "2026-01-01"); // transición terminada: sin sesión → 401
Deno.env.set("SUPABASE_URL", PG_URL);
Deno.env.set("SUPABASE_SERVICE_KEY", "llave-falsa");
Deno.env.set("STALD_TABLAS", "stald_test_");
const { handler } = await import("./main.ts");

const ADMIN = "admin@example.com";
async function pedir(method: string, ruta: string, quien: string | null, body?: unknown) {
  clearCacheGrupos();
  const r = await handler(new Request("http://x" + ruta, {
    method, headers: quien ? { Authorization: "Bearer prueba:" + quien } : {},
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  }));
  return { status: r.status, body: await r.json() as any };
}
const bandera = (id: string) => fake.tabla("stald_test_grupos").find((g) => g.id === id)!.oculto_admin;
const ocultar = (grupo: unknown, oculto: unknown, quien: string | null = ADMIN) => pedir("POST", "/ingles/grupos/ocultar", quien, { grupo, oculto });
const filasResumen = async (q = "") => (await pedir("GET", "/ingles/resumen" + q, ADMIN)).body;

Deno.test("ocultar: solo el admin cambia la bandera (403 alumna, 401 sin sesión)", async () => {
  for (const quien of ["luz@example.com", "sofia@example.com"]) {
    const r = await ocultar("grupo-2", true, quien);
    assertEquals([r.status, r.body.error], [403, "solo_admin"], quien);
  }
  assertEquals((await ocultar("grupo-2", true, null)).status, 401);
  assertEquals(bandera("grupo-2"), false, "la bandera no cambió");
});

Deno.test("ocultar: errores de entrada", async () => {
  const no = await ocultar("grupo-9", true);
  assertEquals([no.status, no.body.error], [400, "grupo_inexistente"]);
  for (const malo of ["si", 1, null, undefined]) {
    const r = await ocultar("grupo-2", malo);
    assertEquals([r.status, r.body.error], [400, "oculto_invalido"], String(malo));
  }
  const json = await pedir("POST", "/ingles/grupos/ocultar", ADMIN, "{no es json");
  assertEquals([json.status, json.body.error], [400, "json_invalido"]);
  assertEquals(bandera("grupo-2"), false);
});

Deno.test("ocultar: el admin oculta y muestra; GET trae ocultoAdmin; editar el grupo no la toca", async () => {
  const antes = (await pedir("GET", "/ingles/grupos", ADMIN)).body.grupos;
  assertEquals(antes.map((g: any) => [g.id, g.ocultoAdmin]), [["grupo-1", false], ["grupo-2", false]]);

  const r = await ocultar("grupo-2", true);
  assertEquals([r.status, r.body.ok, r.body.grupo.id, r.body.grupo.ocultoAdmin], [200, true, "grupo-2", true]);
  assertEquals(bandera("grupo-2"), true);
  assertEquals((await ocultar("grupo-2", true)).body.sinCambio, true, "repetir no cambia nada");
  const g = (await pedir("GET", "/ingles/grupos", ADMIN)).body;
  assertEquals(g.grupos.find((x: any) => x.id === "grupo-2").ocultoAdmin, true);
  assertEquals(g.miembros, { luz: "grupo-1", sofia: "grupo-2" }, "los miembros no cambian");

  const datos = { id: "grupo-2", nivel: "A1", horario: "Sáb 10:00", meet_url: "https://meet.google.com/abc-defg-hij", color: "#db2777" };
  const e = await pedir("POST", "/ingles/grupos", ADMIN, { ...datos, nombre: "Grupo 2 (sábado)" });
  assertEquals([e.status, e.body.grupo.nombre, e.body.grupo.ocultoAdmin], [200, "Grupo 2 (sábado)", true]);
  assertEquals(bandera("grupo-2"), true, "editar el grupo conserva la bandera");
  await pedir("POST", "/ingles/grupos", ADMIN, { ...datos, nombre: "Grupo 2" });

  const m = await ocultar("grupo-2", false);
  assertEquals([m.status, m.body.grupo.ocultoAdmin], [200, false]);
  assertEquals(bandera("grupo-2"), false);
});

Deno.test("resumen: sin el grupo oculto por omisión; con ocultos=1 o grupo=<oculto>, sí", async () => {
  try {
    assertEquals((await filasResumen()).filas.map((f: any) => f.alumno), ["Luz", "Sofía"]);
    await ocultar("grupo-2", true);
    const r = await filasResumen();
    assertEquals(r.filas.map((f: any) => f.alumno), ["Luz"]);
    assertEquals([r.kpis.alumnos, r.ocultos], [1, 1]);
    assert(!r.kpis.sinEntregas.includes("Sofía"), "tampoco en «sin entregas»");
    const todos = await filasResumen("?ocultos=1");
    assertEquals([todos.filas.map((f: any) => f.alumno), todos.kpis.alumnos, todos.ocultos], [["Luz", "Sofía"], 2, 0]);
    const g2 = await filasResumen("?grupo=grupo-2");
    assertEquals([g2.filas.map((f: any) => f.alumno), g2.grupo.id], [["Sofía"], "grupo-2"]);
    assertEquals((await filasResumen("?grupo=grupo-1")).filas.map((f: any) => f.alumno), ["Luz"]);
  } finally {
    await ocultar("grupo-2", false);
  }
});

Deno.test("alumna de un grupo oculto: entra, ve su grupo y su calendario, entrega y se guarda", async () => {
  await ocultar("grupo-2", true);
  try {
    const data = await pedir("GET", "/ingles/data", "sofia@example.com");
    assertEquals([data.status, data.body.isAdmin, data.body.rows.length > 0], [200, false, true]);
    const perfil = await pedir("GET", "/perfil", "sofia@example.com");
    assertEquals(perfil.body.accesos.ingles, true);

    const act = await pedir("GET", "/ingles/actividades", "sofia@example.com");
    assertEquals(act.status, 200);
    assertEquals(act.body.grupo, { id: "grupo-2", nombre: "Grupo 2", nivel: "A1", horario: "Sáb 10:00", meet_url: "https://meet.google.com/abc-defg-hij", color: "#db2777" }, "sin la bandera");
    assert(act.body.items.some((i: any) => i.id === "act-2026-10-06" && i.estado === "disponible"), JSON.stringify(act.body.items.map((i: any) => [i.id, i.estado])));

    const it = await pedir("GET", "/ingles/actividades/act-2026-10-06", "sofia@example.com");
    assertEquals([it.status, it.body.intento], [200, 1]);
    const respuestas = Object.fromEntries(it.body.preguntas.map((p: any) => [p.id, 0]));
    const env = await pedir("POST", "/ingles/actividades/act-2026-10-06", "sofia@example.com", { intento: 1, respuestas });
    assertEquals([env.status, env.body.guardado], [200, true]);
    const fila = fake.tabla("stald_test_docs").find((d) => d.path === "resultados/act-2026-10-06/sofia.json");
    assert(fila, "el resultado se guardó en Postgres");
    assertEquals((fila!.data as any).intentos.length, 1);
    // Y el admin lo ve con el interruptor (ocultos=1).
    const res = await filasResumen("?ocultos=1");
    assertEquals(res.filas.find((f: any) => f.alumno === "Sofía").celdas["act-2026-10-06"].estado, "hecho");
  } finally {
    await ocultar("grupo-2", false);
  }
});
