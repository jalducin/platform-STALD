// Inglés en grupos con Postgres (openspec: ingles-grupos): db.ts, PgStore, grupos y calendario por grupo.
// deno-lint-ignore-file no-explicit-any require-await
import { assert, assertEquals, assertRejects } from "jsr:@std/assert@1";
import { createDb, PgStore } from "./db.ts";
import { clearCacheGrupos, grupoDe, handleGrupos } from "./grupos.ts";
import { clearCache, handleActividades } from "./actividades.ts";
import { MemoryStore } from "./store.ts";
import { postgrestFalso } from "./test_postgrest.ts";
import { storeCon } from "./test_datos.ts";

const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s });
const ADMIN = "admin@example.com";

Deno.test("db: encabezados, prefijo de tablas y errores", async () => {
  const vistos: any[] = [];
  const f = (async (u: string | URL | Request, init?: RequestInit) => { vistos.push({ url: String(u), h: new Headers(init?.headers) }); return new Response(JSON.stringify([{ path: "x" }]), { status: 200 }); }) as typeof fetch;
  const db = createDb({ url: "https://p.supabase.co/", key: "llave", fetch: f, prefijo: "stald_test_" });
  assertEquals(await db.select("docs", "path=eq.x"), [{ path: "x" }]);
  assertEquals(vistos[0].url, "https://p.supabase.co/rest/v1/stald_test_docs?path=eq.x");
  assertEquals([vistos[0].h.get("apikey"), vistos[0].h.get("authorization")], ["llave", "Bearer llave"]);
  const mal = createDb({ url: "https://p", key: "k", fetch: (() => Promise.resolve(new Response("{}", { status: 401 }))) as typeof fetch });
  await assertRejects(() => mal.select("docs", ""), Error, "401");
});

function pg() {
  const fake = postgrestFalso();
  const db = createDb({ url: "https://p", key: "k", fetch: fake.fetch });
  const base = new MemoryStore();
  return { fake, db, base, store: new PgStore(db, base) };
}

Deno.test("PgStore: resultados, avance y alumnos.json van a Postgres; el resto al almacén base", async () => {
  const { fake, store, base } = pg();
  assertEquals(await store.put("resultados/act-1/luz.json", { intentos: [1] }, null, "x"), true);
  assertEquals(await store.put("resultados/act-1/luz.json", { intentos: [9] }, null, "x"), false, "ya existe: conflicto");
  const d = await store.get<any>("resultados/act-1/luz.json");
  assertEquals([d!.data.intentos, d!.sha], [[1], "1"]);
  assertEquals(await store.put("resultados/act-1/luz.json", { intentos: [1, 2] }, "1", "x"), true);
  assertEquals(await store.put("resultados/act-1/luz.json", { intentos: [0] }, "1", "x"), false, "versión vieja: conflicto");
  assertEquals((await store.get<any>("resultados/act-1/luz.json"))!.sha, "2");
  await store.put("resultados/act-1/angel.json", { intentos: [] }, null, "x");
  await store.put("resultados/act-12/otro.json", { intentos: [] }, null, "x");
  assertEquals((await store.list("resultados/act-1")).sort(), ["angel.json", "luz.json"], "solo hijos directos de esa carpeta");
  await store.remove("resultados/act-1/angel.json", "x");
  assertEquals(await store.get("resultados/act-1/angel.json"), null);
  await store.put("contenido/semanas/2026-10-05.json", { id: "s" }, null, "x");
  assert(await base.get("contenido/semanas/2026-10-05.json"), "el contenido sigue en el almacén base");
  assertEquals(fake.tabla("stald_docs").some((f) => String(f.path).startsWith("contenido/")), false);
});

Deno.test("PgStore: si Postgres falla, lee del respaldo y no permite escribir con esa copia", async () => {
  const { fake, store, base } = pg();
  await base.put("resultados/act-1/luz.json", { intentos: [7] }, null);
  fake.caer(true);
  const d = await store.get<any>("resultados/act-1/luz.json");
  assertEquals(d!.data.intentos, [7]);
  assert(d!.sha!.startsWith("gh:"));
  assertEquals(await store.put("resultados/act-1/luz.json", { intentos: [7, 8] }, d!.sha, "x"), false);
});

function grupos() {
  clearCacheGrupos();
  const { db, fake } = pg();
  const call = async (method: string, sub: string, email: string, body?: unknown, hoy = "2026-10-04") => {
    const req = new Request("http://x/ingles/grupos" + sub, { method, body: body === undefined ? undefined : JSON.stringify(body) });
    const res = await handleGrupos(req, sub, { email, admin: ADMIN, db, hoy: () => hoy }, json);
    return { status: res.status, body: await res.json() };
  };
  return { call, db, fake };
}

Deno.test("grupos: solo el admin crea y edita; validación y slug", async () => {
  const { call } = grupos();
  assertEquals((await call("GET", "", "luz@example.com")).status, 403);
  const r = await call("POST", "", ADMIN, { nombre: "Sábado A1", nivel: "A1", horario: "Sáb 10:00", meet_url: "https://meet.google.com/abc-defg-hij", color: "#db2777" });
  assertEquals([r.status, r.body.grupo.id], [200, "sabado-a1"]);
  assertEquals((await call("POST", "", ADMIN, { nombre: "" })).body.error, "nombre_invalido");
  assertEquals((await call("POST", "", ADMIN, { nombre: "X", meet_url: "javascript:alert(1)" })).body.error, "meet_invalido");
  assertEquals((await call("POST", "", ADMIN, { nombre: "X", color: "rojo" })).body.error, "color_invalido");
  const e = await call("POST", "", ADMIN, { id: "sabado-a1", nombre: "Sábado A1 (mañana)", horario: "Sáb 9:00" });
  assertEquals([e.body.grupo.id, e.body.grupo.nombre], ["sabado-a1", "Sábado A1 (mañana)"]);
  const g = await call("GET", "", ADMIN);
  assertEquals(g.body.grupos.map((x: any) => x.id), ["sabado-a1"]);
});

Deno.test("grupos: mover de grupo conserva el historial y el mismo día solo corrige", async () => {
  const { call, db } = grupos();
  await call("POST", "", ADMIN, { nombre: "Grupo 1" });
  await call("POST", "", ADMIN, { nombre: "Domingo B1" });
  assertEquals(await grupoDe(db, "luz", "2026-10-04"), "grupo-1", "sin inscripción: primer grupo activo");
  assertEquals((await call("POST", "/mover", ADMIN, { alumno: "Luz", grupo: "domingo-b1" }, "2026-10-04")).status, 200);
  clearCacheGrupos();
  assertEquals(await grupoDe(db, "luz", "2026-10-04"), "domingo-b1");
  await call("POST", "/mover", ADMIN, { alumno: "Luz", grupo: "grupo-1" }, "2026-10-04"); // mismo día: corrige
  await call("POST", "/mover", ADMIN, { alumno: "Luz", grupo: "domingo-b1" }, "2026-10-11");
  const ins = await db.select<any>("inscripciones", "alumno=eq.luz");
  assertEquals(ins.map((i: any) => [i.grupo_id, i.desde, i.hasta ?? null]).sort(), [["domingo-b1", "2026-10-11", null], ["grupo-1", "2026-10-04", "2026-10-11"]]);
  assertEquals((await call("POST", "/mover", ADMIN, { alumno: "Luz", grupo: "no-existe" })).body.error, "grupo_inexistente");
  const g = await call("GET", "", ADMIN, undefined, "2026-10-12");
  assertEquals(g.body.miembros.luz, "domingo-b1");
});

Deno.test("calendario por grupo: una semana con grupos solo la ve su grupo", async () => {
  const tema = { id: "x", titulo: "X", retroalimentacion: { "fortaleza": "a", "en-progreso": "b", "debilidad": "c" } };
  const act = (id: string, f: string) => ({ id, tipo: "actividad", titulo: id, disponibleDesde: f, fechaLimite: f, intentos: 2, temas: [tema], banco: [{ id: "q", tema: "x", tipo: "opcion", enunciado: "?", opciones: ["a", "b"], correcta: 0, explicacion: "a" }] });
  const s = storeCon({
    "contenido/semanas/2026-09-28.json": { id: "2026-09-28", titulo: "S0", elementos: [{ id: "a-todos", tipo: "actividad", fecha: "2026-09-29" }] },
    "contenido/semanas/2026-10-05.json": { id: "2026-10-05", titulo: "S1", grupos: ["domingo-b1"], elementos: [{ id: "a-b1", tipo: "actividad", fecha: "2026-10-06" }] },
    "contenido/actividades/a-todos.json": act("a-todos", "2026-09-29"),
    "contenido/actividades/a-b1.json": act("a-b1", "2026-10-06"),
  });
  Deno.env.set("PERMITIR_HOY", "1");
  const ids = async (quien: any) => { clearCache(); const req = new Request("http://x/ingles/actividades?email=x&hoy=2026-10-06"); return ((await (await handleActividades(req, "", quien, s, json)).json()).items as any[]).map((i) => i.id).sort(); };
  assertEquals(await ids({ isAdmin: false, alumno: "Luz", grupo: "domingo-b1" }), ["a-b1", "a-todos"]);
  assertEquals(await ids({ isAdmin: false, alumno: "Marisol", grupo: "grupo-1" }), ["a-todos"]);
  assertEquals(await ids({ isAdmin: false, alumno: "Sin grupo" }), ["a-b1", "a-todos"], "sin base de datos: como hoy");
  const admin = await (await handleActividades(new Request("http://x/ingles/actividades?email=x&hoy=2026-10-06"), "", { isAdmin: true, alumno: null }, s, json)).json();
  assertEquals(admin.items.find((i: any) => i.id === "a-b1").grupos, ["domingo-b1"], "el admin ve a qué grupos aplica");
});
