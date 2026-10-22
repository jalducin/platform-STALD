// Resumen del profe que no se cae (openspec: fix-ingles-admin): GET /ingles/resumen nunca depende de Notion y, si una
// lectura de Postgres falla (resultados de una columna o los grupos), responde 200 con `avisos` en lugar del 500
// `upstream_error`. También: marcar Secundaria no se cae si Notion falla, y el 500 genérico trae `detalle` solo para
// el admin. Sin red: PostgREST falso en memoria (tablas stald_test_*) y Notion simulado que siempre falla; nunca
// tablas `stald_` reales.
// deno-lint-ignore-file no-explicit-any
import { assert, assertEquals } from "jsr:@std/assert@1";
import { postgrestFalso } from "./test_postgrest.ts";
import { semanaValida } from "./test_datos.ts";
import { clearCacheGrupos } from "./grupos.ts";

const PG_URL = "https://pg-falso-resumen.example.com";
const fake = postgrestFalso("stald_test_");
const fetchReal = globalThis.fetch;
let llamadasNotion = 0;
// Fallas inyectadas: rutas de PostgREST cuyo GET «se cuelga» (como el AbortSignal.timeout de server/db.ts).
const caidas: RegExp[] = [];
// Fallas de una sola vez: la primera petición que coincide falla y se quita de la lista.
const caidasUnaVez: RegExp[] = [];
globalThis.fetch = ((u: string | URL | Request, init?: RequestInit) => {
  const url = String(u instanceof Request ? u.url : u);
  if (url.startsWith("https://api.notion.com")) {
    llamadasNotion++;
    return Promise.resolve(new Response(JSON.stringify({ object: "error", code: "object_not_found" }), { status: 404 }));
  }
  if (url.startsWith(PG_URL)) {
    const ruta = decodeURIComponent(url.slice(PG_URL.length));
    const unaVez = caidasUnaVez.findIndex((re) => re.test(ruta));
    if ((init?.method ?? "GET") === "GET" && unaVez >= 0) {
      caidasUnaVez.splice(unaVez, 1);
      return Promise.reject(new DOMException("Signal timed out.", "TimeoutError"));
    }
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
const registro = {
  "luz@example.com": { nombre: "Luz", alta: "2026-09-01T00:00:00.000Z" },
  "sofia@example.com": { nombre: "Sofía", alta: "2026-09-01T00:00:00.000Z" },
};
fake.tabla("stald_test_docs").push(
  { path: "meta/migrado", data: { en: "2026-10-01" }, version: 1 },
  { path: "alumnos.json", data: registro, version: 1 },
  { path: "resultados/act-2026-10-06/luz.json", data: { intentos: [{ n: 1, porcentaje: 90, fueraDeTiempo: false }], mejor: { porcentaje: 90 } }, version: 1 },
);
fake.tabla("stald_test_grupos").push(
  { id: "grupo-1", nombre: "Grupo 1", nivel: null, horario: null, meet_url: null, color: "#4f46e5", activo: true, orden: 0, oculto_admin: false },
);
fake.tabla("stald_test_inscripciones").push(
  { alumno: "luz", grupo_id: "grupo-1", desde: "2026-09-28", hasta: null },
  { alumno: "sofia", grupo_id: "grupo-1", desde: "2026-09-28", hasta: null },
);

// Como en producción: con NOTION_TOKEN y SIN ROWS_FIXTURE, cualquier lectura de Notion iría a api.notion.com (que falla).
// La sesión de prueba (Bearer prueba:) necesita ROWS_FIXTURE, así que el admin entra con sesión simulada de Supabase.
Deno.env.delete("ROWS_FIXTURE");
Deno.env.set("NOTION_TOKEN", "secreto-falso");
Deno.env.set("DATA_DIR", dir + "/datos");
Deno.env.set("SUPER_ADMIN_EMAIL", "admin@example.com");
Deno.env.set("HOY_FIJO", "2026-10-07");
Deno.env.set("LOGIN_TRANSICION_HASTA", "2026-01-01");
Deno.env.set("SUPABASE_URL", PG_URL);
Deno.env.set("SUPABASE_SERVICE_KEY", "llave-falsa");
Deno.env.set("SUPABASE_PUBLISHABLE_KEY", "publica-falsa");
Deno.env.set("STALD_TABLAS", "stald_test_");
const { handler } = await import("./main.ts");

// Sesión: /auth/v1/user del Supabase falso devuelve el correo según el token («token-admin» o «token-luz»).
const fakeFetch = fake.fetch;
fake.fetch = ((u: string | URL | Request, init?: RequestInit) => {
  const url = String(u instanceof Request ? u.url : u);
  if (url.includes("/auth/v1/user")) {
    const token = new Headers(init?.headers).get("Authorization") ?? "";
    const email = token.endsWith("token-luz") ? "luz@example.com" : "admin@example.com";
    return Promise.resolve(new Response(JSON.stringify({ email, email_confirmed_at: "2026-09-01T00:00:00Z" }), { status: 200 }));
  }
  return fakeFetch(u, init);
}) as typeof fetch;

async function resumen(q = "") {
  clearCacheGrupos();
  const r = await handler(new Request("http://x/ingles/resumen" + q, { headers: { Authorization: "Bearer token-admin" } }));
  return { status: r.status, body: await r.json() as any };
}

Deno.test("resumen: 200 sin tocar Notion aunque NOTION_TOKEN exista y Notion falle", async () => {
  llamadasNotion = 0;
  const r = await resumen("?grupo=grupo-1");
  assertEquals(r.status, 200, JSON.stringify(r.body));
  assertEquals(r.body.filas.map((f: any) => f.alumno), ["Luz", "Sofía"]);
  assertEquals(r.body.avisos ?? [], []);
  assertEquals(llamadasNotion, 0, "el resumen no consulta Notion");
});

Deno.test("resumen: si falla la lectura de resultados de una columna, 200 con aviso y sin esa columna", async () => {
  caidas.push(/stald_test_docs\?path=like\.resultados\/act-2026-10-06\//);
  try {
    const r = await resumen("?grupo=grupo-1");
    assertEquals(r.status, 200, JSON.stringify(r.body));
    assert(r.body.avisos.includes("resultados_incompletos"), JSON.stringify(r.body.avisos));
    assert(!r.body.columnas.some((c: any) => c.id === "act-2026-10-06"), "la columna que no se pudo leer no se cuenta");
    assert(r.body.columnas.some((c: any) => c.id === "act-2026-10-08"), "las demás columnas siguen");
    assert(r.body.filas.every((f: any) => !("act-2026-10-06" in f.celdas)), "sin celdas de la columna caída");
    assertEquals(r.body.kpis.promedio, null, "la entrega de Luz (90 %) en la columna caída no cuenta en los indicadores");
  } finally {
    caidas.length = 0;
  }
});

Deno.test("resumen: una falla aislada de una columna se recupera con el reintento, sin aviso", async () => {
  caidasUnaVez.push(/stald_test_docs\?path=like\.resultados\/act-2026-10-06\//);
  try {
    const r = await resumen("?grupo=grupo-1");
    assertEquals(r.status, 200, JSON.stringify(r.body));
    assertEquals(r.body.avisos, []);
    assert(r.body.columnas.some((c: any) => c.id === "act-2026-10-06"));
    assertEquals(r.body.kpis.promedio, 90);
    assertEquals(caidasUnaVez.length, 0, "la falla sí ocurrió");
  } finally {
    caidasUnaVez.length = 0;
  }
});

Deno.test("resumen: si fallan los grupos, 200 con aviso y sin filtrar", async () => {
  caidas.push(/stald_test_grupos\?/, /stald_test_inscripciones\?/);
  try {
    const r = await resumen();
    assertEquals(r.status, 200, JSON.stringify(r.body));
    assert(r.body.avisos.includes("grupos_no_disponibles"), JSON.stringify(r.body.avisos));
    assertEquals(r.body.filas.map((f: any) => f.alumno), ["Luz", "Sofía"]);
    // Con ?grupo= y grupos caídos tampoco se filtra (como sin base de datos) y `grupo` sale null.
    const g = await resumen("?grupo=grupo-1");
    assertEquals([g.status, g.body.grupo, g.body.filas.length], [200, null, 2]);
    assert(g.body.avisos.includes("grupos_no_disponibles"));
  } finally {
    caidas.length = 0;
  }
});

Deno.test("500 genérico: el admin recibe el detalle", async () => {
  caidas.push(/stald_test_docs\?path=eq\.alumnos\.json/);
  try {
    clearCacheGrupos();
    const r = await handler(new Request("http://x/ingles/alumnos", { headers: { Authorization: "Bearer token-admin" } }));
    const body = await r.json() as any;
    assertEquals([r.status, body.error], [500, "upstream_error"]);
    assert(typeof body.detalle === "string" && body.detalle.length > 0, JSON.stringify(body));
    // Una alumna con una falla del servidor (aquí, el resultado de ejemplo incompleto): solo el código, sin el motivo.
    const al = await handler(new Request("http://x/ingles/actividades", { headers: { Authorization: "Bearer token-luz" } }));
    assertEquals([al.status, await al.json()], [500, { error: "upstream_error" }]);
  } finally {
    caidas.length = 0;
  }
});

Deno.test("marcar Secundaria no se cae si Notion falla (slug previo = ninguno)", async () => {
  llamadasNotion = 0;
  const r = await handler(new Request("http://x/ingles/grupos/secundaria", {
    method: "POST", headers: { Authorization: "Bearer token-admin" }, body: JSON.stringify({ email: "luz@example.com", secundaria: true }),
  }));
  const body = await r.json() as any;
  assertEquals(r.status, 200, JSON.stringify(body));
});
