// GET /ingles/panel y GET /ingles/data?incluir=panel en server/main.ts (openspec: panel-profe-peticiones): matriz de
// acceso (admin 200, alumna 403, sin sesión 401), partes del panel sin correos, filtros de grupo y falla parcial.
// Sin red: PostgREST falso en memoria (solo tablas stald_test_*) con fallas inyectadas y copia temporal de datos.
// deno-lint-ignore-file no-explicit-any
import { assert, assertEquals } from "jsr:@std/assert@1";
import { postgrestFalso } from "./test_postgrest.ts";
import { semanaValida } from "./test_datos.ts";
import { clearCacheGrupos } from "./grupos.ts";

const PG_URL = "https://pg-falso-panel.example.com";
const fake = postgrestFalso("stald_test_");
const fetchReal = globalThis.fetch;
// Rutas de PostgREST cuyo GET «se cuelga» (como el AbortSignal.timeout de server/db.ts).
const caidas: RegExp[] = [];
globalThis.fetch = ((u: string | URL | Request, init?: RequestInit) => {
  const url = String(u instanceof Request ? u.url : u);
  if (url.startsWith(PG_URL)) {
    const ruta = decodeURIComponent(url.slice(PG_URL.length));
    if ((init?.method ?? "GET") === "GET" && caidas.some((re) => re.test(ruta))) {
      return Promise.reject(new DOMException("Signal timed out.", "TimeoutError"));
    }
    return fake.fetch(u, init);
  }
  return fetchReal(u, init);
}) as typeof fetch;

const dir = await Deno.makeTempDir();
for (const [path, data] of Object.entries(semanaValida())) {
  await Deno.mkdir(dir + "/datos/" + path.split("/").slice(0, -1).join("/"), { recursive: true });
  await Deno.writeTextFile(dir + "/datos/" + path, JSON.stringify(data));
}
const fixture = dir + "/rows.json";
await Deno.writeTextFile(fixture, JSON.stringify({ ingles: [], secundaria: [] }));
const registro = {
  "luz@example.com": { nombre: "Luz", alta: "2026-09-01T00:00:00.000Z", origen: "registro" },
  "sofia@example.com": { nombre: "Sofía", alta: "2026-09-01T00:00:00.000Z", origen: "registro" },
  "ciro@example.com": { nombre: "Ciro", alta: "2026-09-01T00:00:00.000Z", origen: "registro", baja: "2026-10-01" },
};
fake.tabla("stald_test_docs").push(
  { path: "meta/migrado", data: { en: "2026-10-01" }, version: 1 },
  { path: "alumnos.json", data: registro, version: 1 },
);
fake.tabla("stald_test_grupos").push(
  { id: "grupo-1", nombre: "Grupo 1", nivel: null, horario: null, meet_url: null, color: "#4f46e5", activo: true, orden: 0, oculto_admin: false },
  { id: "grupo-2", nombre: "Grupo 2", nivel: null, horario: null, meet_url: null, color: "#db2777", activo: true, orden: 1, oculto_admin: true },
);
fake.tabla("stald_test_inscripciones").push(
  { alumno: "luz", grupo_id: "grupo-1", desde: "2026-09-28", hasta: null },
  { alumno: "sofia", grupo_id: "grupo-2", desde: "2026-09-28", hasta: null },
);

Deno.env.set("ROWS_FIXTURE", fixture); // activa la sesión de prueba `Bearer prueba:<correo>`
Deno.env.set("DATA_DIR", dir + "/datos");
Deno.env.set("SUPER_ADMIN_EMAIL", "admin@example.com");
Deno.env.set("HOY_FIJO", "2026-10-07");
Deno.env.set("LOGIN_TRANSICION_HASTA", "2026-01-01");
Deno.env.set("SUPABASE_URL", PG_URL);
Deno.env.set("SUPABASE_SERVICE_KEY", "llave-falsa");
Deno.env.set("STALD_TABLAS", "stald_test_");
Deno.env.delete("NOTION_TOKEN");
const { handler } = await import("./main.ts");

async function pedir(ruta: string, quien?: string) {
  clearCacheGrupos();
  const headers: Record<string, string> = quien ? { Authorization: "Bearer prueba:" + quien } : {};
  const r = await handler(new Request("http://x" + ruta, { headers }));
  return { status: r.status, body: await r.json() as any };
}

Deno.test("/ingles/panel: sin sesión 401, alumna 403, de baja 403", async () => {
  assertEquals((await pedir("/ingles/panel")).status, 401);
  // Con la transición terminada, `?email=` del admin tampoco sirve sin sesión.
  assertEquals((await pedir("/ingles/panel?email=admin@example.com")).status, 401);
  assertEquals(await pedir("/ingles/panel", "luz@example.com"), { status: 403, body: { error: "solo_admin" } });
  assertEquals((await pedir("/ingles/panel", "ciro@example.com")).status, 403);
  assertEquals((await pedir("/ingles/panel", "nadie@example.com")).status, 403);
});

Deno.test("/ingles/panel: el admin recibe grupos, alumnos, resumen y entregas sin correos", async () => {
  const r = await pedir("/ingles/panel", "admin@example.com");
  assertEquals(r.status, 200, JSON.stringify(r.body));
  assertEquals(r.body.fallas, []);
  assertEquals(r.body.grupos.grupos.map((g: any) => [g.id, g.ocultoAdmin]), [["grupo-1", false], ["grupo-2", true]]);
  assertEquals(r.body.grupos.miembros, { luz: "grupo-1", sofia: "grupo-2" });
  assertEquals(r.body.alumnos, [{ nombre: "Ciro", baja: "2026-10-01" }, { nombre: "Luz" }, { nombre: "Sofía" }]);
  // El resumen es el mismo que /ingles/resumen (sin el grupo oculto, salvo con ocultos=1).
  const suelto = await pedir("/ingles/resumen", "admin@example.com");
  assertEquals(r.body.resumen.filas.map((f: any) => f.alumno), suelto.body.filas.map((f: any) => f.alumno));
  assertEquals(r.body.resumen.filas.map((f: any) => f.alumno), ["Luz"]);
  assertEquals(r.body.entregas, { pendientes: 0, ingles: 0, secundaria: 0 });
  assert(!JSON.stringify(r.body).includes("@example.com"), "el panel no lleva correos");
});

Deno.test("/ingles/panel: ?grupo= y ?ocultos=1 llegan al resumen", async () => {
  const g = await pedir("/ingles/panel?grupo=grupo-2", "admin@example.com");
  assertEquals([g.status, g.body.resumen.grupo?.id, g.body.resumen.filas.map((f: any) => f.alumno)], [200, "grupo-2", ["Sofía"]]);
  const o = await pedir("/ingles/panel?ocultos=1", "admin@example.com");
  assertEquals(o.body.resumen.filas.map((f: any) => f.alumno), ["Luz", "Sofía"]);
});

Deno.test("/ingles/panel: si fallan los grupos, 200 con esa parte marcada y las demás completas", async () => {
  caidas.push(/stald_test_grupos\?/, /stald_test_inscripciones\?/);
  try {
    const r = await pedir("/ingles/panel", "admin@example.com");
    assertEquals(r.status, 200, JSON.stringify(r.body));
    assertEquals(r.body.fallas, ["grupos"]);
    assertEquals(r.body.grupos.error, "upstream_error");
    assert(typeof r.body.grupos.detalle === "string" && r.body.grupos.detalle.length > 0, "el admin ve el motivo");
    assertEquals(r.body.alumnos.length, 3);
    assert(r.body.resumen.avisos.includes("grupos_no_disponibles"), JSON.stringify(r.body.resumen.avisos));
    assertEquals(r.body.entregas, { pendientes: 0, ingles: 0, secundaria: 0 });
  } finally {
    caidas.length = 0;
  }
});

Deno.test("/ingles/panel: si falla el registro, se marcan las partes que lo leen y las entregas llegan", async () => {
  caidas.push(/stald_test_docs\?path=eq\.alumnos\.json/);
  try {
    const r = await pedir("/ingles/panel", "admin@example.com");
    assertEquals(r.status, 200, JSON.stringify(r.body));
    // Grupos y resumen también leen el registro (bajas); según la caché del almacén pueden fallar o no. Lo fijo: la
    // lista de alumnos falla, queda marcada, y las entregas llegan completas.
    assert(r.body.fallas.includes("alumnos") && !r.body.fallas.includes("entregas"), JSON.stringify(r.body.fallas));
    assertEquals(r.body.alumnos.error, "upstream_error");
    for (const n of r.body.fallas) assertEquals(r.body[n].error, "upstream_error", n);
    assertEquals(r.body.entregas, { pendientes: 0, ingles: 0, secundaria: 0 });
  } finally {
    caidas.length = 0;
  }
});

Deno.test("/ingles/data?incluir=panel: el admin recibe el panel; la alumna, lo de siempre", async () => {
  const admin = await pedir("/ingles/data?incluir=panel", "admin@example.com");
  assertEquals([admin.status, admin.body.isAdmin, admin.body.panel.fallas], [200, true, []]);
  assertEquals(admin.body.panel.resumen.filas.map((f: any) => f.alumno), ["Luz"]);
  assertEquals(admin.body.rows.map((r: any) => r.alumno).sort(), ["Luz", "Sofía"]);
  const conGrupo = await pedir("/ingles/data?incluir=panel&grupo=grupo-2", "admin@example.com");
  assertEquals(conGrupo.body.panel.resumen.grupo.id, "grupo-2");
  const sinParam = await pedir("/ingles/data", "admin@example.com");
  assert(!("panel" in sinParam.body), "sin incluir=panel no hay panel");
  const luz = await pedir("/ingles/data?incluir=panel", "luz@example.com");
  const luzSin = await pedir("/ingles/data", "luz@example.com");
  assertEquals([luz.status, "panel" in luz.body, luz.body.rows.length, luz.body.isAdmin], [200, false, 1, false]);
  assertEquals({ ...luz.body, generatedAt: null }, { ...luzSin.body, generatedAt: null }, "la alumna recibe lo mismo que sin el parámetro");
  assertEquals((await pedir("/ingles/data?incluir=panel")).status, 401);
});
