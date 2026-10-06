// Caché HTTP en server/main.ts (openspec: cache-estabilidad): /config se puede guardar, el ranking responde 304 con
// If-None-Match y las rutas con datos personales siguen no-store y sin ETag. Sin red: fixture y almacén en memoria.
import { assertEquals } from "jsr:@std/assert@1";

const dir = await Deno.makeTempDir();
const fixture = dir + "/rows.json";
await Deno.writeTextFile(fixture, JSON.stringify({ secundaria: [] }));

await Deno.mkdir(dir + "/datos");
// Inglés sin Notion (cierre-tecnico, fase 2): Luz entra por el registro de la plataforma.
await Deno.writeTextFile(dir + "/datos/alumnos.json", JSON.stringify({ "luz@example.com": { nombre: "Luz", alta: "2026-09-01T00:00:00.000Z", origen: "notion" } }));
Deno.env.set("ROWS_FIXTURE", fixture);
Deno.env.set("DATA_DIR", dir + "/datos");
Deno.env.set("SUPER_ADMIN_EMAIL", "admin@example.com");
const { handler } = await import("./main.ts");
const TOKEN = { Authorization: "Bearer prueba:luz@example.com" };

Deno.test("main: /config se puede guardar 10 min", async () => {
  const r = await handler(new Request("http://x/config"));
  await r.body?.cancel();
  assertEquals([r.status, r.headers.get("Cache-Control")], [200, "public, max-age=600"]);
});

Deno.test("main: /perfil y /juegos/yo siguen no-store y sin ETag (datos personales)", async () => {
  for (const ruta of ["/perfil", "/juegos/yo", "/ingles/data"]) {
    const r = await handler(new Request("http://x" + ruta, { headers: TOKEN }));
    await r.body?.cancel();
    assertEquals([r.status, r.headers.get("Cache-Control"), r.headers.get("ETag")], [200, "no-store, no-cache, must-revalidate", null], ruta);
  }
});

Deno.test("main: ranking con ETag y 304 si no cambió; OPTIONS con Max-Age", async () => {
  const r1 = await handler(new Request("http://x/juegos/ranking?tipo=individual", { headers: TOKEN }));
  const cuerpo = await r1.json();
  const etag = r1.headers.get("ETag");
  assertEquals([r1.status, r1.headers.get("Cache-Control"), r1.headers.get("Vary"), Array.isArray(cuerpo.top)], [200, "private, no-cache", "Authorization", true]);
  const r2 = await handler(new Request("http://x/juegos/ranking?tipo=individual", { headers: { ...TOKEN, "If-None-Match": etag! } }));
  assertEquals([r2.status, await r2.text(), r2.headers.get("Access-Control-Allow-Origin")], [304, "", "*"]);
  const o = await handler(new Request("http://x/juegos/ranking", { method: "OPTIONS" }));
  await o.body?.cancel();
  assertEquals(o.headers.get("Access-Control-Max-Age"), "86400");
});
