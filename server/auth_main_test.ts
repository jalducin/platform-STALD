// Integración de la sesión en server/main.ts (openspec: plataforma-login): /config, CORS, admin protegido,
// transición por fecha y verificador falso con ROWS_FIXTURE. Sin red: fixture y almacén en memoria.
import { assertEquals } from "jsr:@std/assert@1";

const dir = await Deno.makeTempDir();
const fixture = dir + "/rows.json";
// Fase 2 de «Inglés sin Notion» (openspec: cierre-tecnico): la fila de Inglés del fixture (Nora, solo en Notion) debe
// ignorarse; la identidad de Inglés sale del registro (alumnos.json de la copia de datos).
await Deno.writeTextFile(fixture, JSON.stringify({
  ingles: [{ source: "clases_ingles", name: "Tarea", label: "x", completado: false, fecha: "2026-10-05", alumno: "Nora", calificacion: null, dificultad: "A1", editadoEn: "2026-10-01T00:00:00.000Z", userIds: ["u1"], userEmails: ["nora@example.com"], userNames: ["Nora"], url: "https://notion.so/x", id: "a37c7131415b08ad608e72e00a2690f2" }],
  secundaria: [],
}));
await Deno.mkdir(dir + "/datos");
const registroInicial = { "luz@example.com": { nombre: "Luz", alta: "2026-09-01T00:00:00.000Z", origen: "notion" } };
await Deno.writeTextFile(dir + "/datos/alumnos.json", JSON.stringify(registroInicial));
Deno.env.set("ROWS_FIXTURE", fixture);
Deno.env.set("DATA_DIR", dir + "/datos");
Deno.env.set("SUPER_ADMIN_EMAIL", "admin@example.com");
const { handler } = await import("./main.ts");

const get = async (ruta: string, token?: string) => {
  const r = await handler(new Request("http://x" + ruta, { headers: token ? { Authorization: "Bearer " + token } : {} }));
  return { status: r.status, body: await r.json() };
};

Deno.test("main: /config en modo prueba y CORS acepta authorization", async () => {
  assertEquals(await get("/config"), { status: 200, body: { prueba: true } });
  const o = await handler(new Request("http://x/perfil", { method: "OPTIONS" }));
  await o.body?.cancel();
  assertEquals(o.headers.get("Access-Control-Allow-Headers"), "content-type, authorization");
});

Deno.test("main: el admin con ?email= sin token → 401; con sesión → datos de admin", async () => {
  assertEquals(await get("/ingles/data?email=admin@example.com"), { status: 401, body: { error: "inicia_sesion" } });
  const r = await get("/ingles/data", "prueba:admin@example.com");
  assertEquals([r.status, r.body.isAdmin], [200, true]);
});

Deno.test("main: el correo sale de la sesión, no de la URL", async () => {
  const r = await get("/perfil?email=admin@example.com", "prueba:luz@example.com");
  assertEquals([r.status, r.body.isAdmin, r.body.email], [200, false, "luz@example.com"]);
});

Deno.test("main: alumno con ?email= funciona en la transición y recibe 401 después", async () => {
  Deno.env.set("LOGIN_TRANSICION_HASTA", "2999-12-31");
  assertEquals((await get("/ingles/data?email=luz@example.com")).body.rows.length, 1);
  Deno.env.set("LOGIN_TRANSICION_HASTA", "2026-01-01");
  assertEquals(await get("/ingles/data?email=luz@example.com"), { status: 401, body: { error: "inicia_sesion" } });
  assertEquals((await get("/ingles/data", "prueba:luz@example.com")).body.rows.length, 1);
  assertEquals((await get("/salud")).status, 200, "/salud no pide sesión");
  Deno.env.delete("LOGIN_TRANSICION_HASTA");
});

Deno.test("main: /auth/enlace rechaza a quien no es admin y al admin sin sesión", async () => {
  const post = async (token?: string, q = "") => {
    const r = await handler(new Request("http://x/auth/enlace" + q, { method: "POST", headers: token ? { Authorization: "Bearer " + token } : {}, body: JSON.stringify({ email: "luz@example.com" }) }));
    return { status: r.status, body: await r.json() };
  };
  assertEquals(await post("prueba:luz@example.com"), { status: 403, body: { error: "solo_admin" } });
  assertEquals(await post(undefined, "?email=admin@example.com"), { status: 401, body: { error: "inicia_sesion" } });
  // Admin con sesión pero sin llave de servicio (local): 503, sin llamar a la red.
  assertEquals((await post("prueba:admin@example.com")).status, 503);
});

Deno.test("main: fase 2 — Inglés no lee Notion; ya no se importan ni se marcan tareas de Notion", async () => {
  Deno.env.set("LOGIN_TRANSICION_HASTA", "2999-12-31");
  const nora = await get("/ingles/data?email=nora@example.com");
  assertEquals([nora.status, nora.body.rows.length], [200, 0], "quien solo está en Notion no tiene filas");
  const admin = await get("/ingles/data", "prueba:admin@example.com");
  assertEquals(admin.body.rows.map((r: { source: string; alumno: string }) => [r.source, r.alumno]), [["registro", "Luz"]], "solo el registro");
  const perfilNora = await get("/perfil", "prueba:nora@example.com");
  assertEquals(perfilNora.body.accesos.ingles, false, "el portal no da Inglés a quien solo está en Notion");
  const alumnos = await get("/ingles/alumnos", "prueba:admin@example.com");
  assertEquals(alumnos.body.alumnos.map((a: { nombre: string }) => a.nombre), ["Luz"], "la lista del admin sale solo del registro");
  const marcar = await handler(new Request("http://x/ingles/data/a37c7131415b08ad608e72e00a2690f2/completado", {
    method: "POST", headers: { Authorization: "Bearer prueba:admin@example.com" }, body: JSON.stringify({ completado: true }),
  }));
  assertEquals([marcar.status, (await marcar.json()).error], [404, "not_found"], "la ruta de marcar tareas de Notion ya no existe");
  Deno.env.delete("LOGIN_TRANSICION_HASTA");
});
