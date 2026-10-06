// Política de caché HTTP por ruta, ETag y 304 (openspec: cache-estabilidad).
import { assertEquals, assertMatch } from "jsr:@std/assert@1";
import { aplicarCacheHttp, politicaCache } from "./http_cache.ts";

const base = () => new Headers({ "Access-Control-Allow-Origin": "*", "Content-Type": "application/json", "Cache-Control": "no-store, no-cache, must-revalidate" });
const resp = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: base() });
const get = (ruta: string, h: Record<string, string> = {}) => new Request("http://x" + ruta, { headers: h });

Deno.test("http_cache: política por ruta", () => {
  assertEquals(politicaCache("/config")?.cacheControl, "public, max-age=600");
  assertEquals(politicaCache("/api/config")?.cacheControl, "public, max-age=600");
  assertEquals(politicaCache("/juegos/ranking")?.cacheControl, "private, no-cache");
  for (const r of ["/perfil", "/ingles/data", "/ingles/actividades", "/juegos/yo", "/juegos/sala/ABCD", "/juegos/admin/resumen", "/salud"]) {
    assertEquals(politicaCache(r), null, r);
  }
});

Deno.test("http_cache: sin política la respuesta queda igual (no-store, sin ETag)", async () => {
  const r = await aplicarCacheHttp(get("/perfil"), resp({ a: 1 }), null);
  assertEquals([r.status, r.headers.get("Cache-Control"), r.headers.get("ETag")], [200, "no-store, no-cache, must-revalidate", null]);
  assertEquals(await r.json(), { a: 1 });
});

Deno.test("http_cache: 200 con política → Cache-Control, ETag débil estable y Vary", async () => {
  const pol = politicaCache("/juegos/ranking");
  const r1 = await aplicarCacheHttp(get("/juegos/ranking"), resp({ top: [1, 2] }), pol);
  const r2 = await aplicarCacheHttp(get("/juegos/ranking"), resp({ top: [1, 2] }), pol);
  const r3 = await aplicarCacheHttp(get("/juegos/ranking"), resp({ top: [2, 1] }), pol);
  const e1 = r1.headers.get("ETag")!;
  assertMatch(e1, /^W\/"[A-Za-z0-9_-]{22}"$/);
  assertEquals(r2.headers.get("ETag"), e1);
  assertEquals(r3.headers.get("ETag") === e1, false);
  assertEquals([r1.headers.get("Cache-Control"), r1.headers.get("Vary"), r1.headers.get("Access-Control-Allow-Origin")], ["private, no-cache", "Authorization", "*"]);
  assertEquals(await r1.json(), { top: [1, 2] });
  await r2.body?.cancel(); await r3.body?.cancel();
});

Deno.test("http_cache: If-None-Match coincide → 304 sin cuerpo, con CORS y ETag", async () => {
  const pol = politicaCache("/juegos/ranking");
  const e = (await aplicarCacheHttp(get("/juegos/ranking"), resp({ top: [] }), pol)).headers.get("ETag")!;
  for (const inm of [e, `"otro", ${e}`, "*"]) {
    const r = await aplicarCacheHttp(get("/juegos/ranking", { "If-None-Match": inm }), resp({ top: [] }), pol);
    assertEquals([r.status, await r.text(), r.headers.get("ETag"), r.headers.get("Access-Control-Allow-Origin"), r.headers.get("Cache-Control")], [304, "", e, "*", "private, no-cache"], inm);
  }
  const otro = await aplicarCacheHttp(get("/juegos/ranking", { "If-None-Match": 'W/"no"' }), resp({ top: [] }), pol);
  assertEquals(otro.status, 200);
  await otro.body?.cancel();
});

Deno.test("http_cache: errores y POST no llevan política", async () => {
  const pol = politicaCache("/config");
  const r503 = await aplicarCacheHttp(get("/config"), resp({ error: "sin_config" }, 503), pol);
  assertEquals([r503.status, r503.headers.get("Cache-Control"), r503.headers.get("ETag")], [503, "no-store, no-cache, must-revalidate", null]);
  await r503.body?.cancel();
  const post = await aplicarCacheHttp(new Request("http://x/juegos/ranking", { method: "POST", body: "{}" }), resp({ ok: 1 }), politicaCache("/juegos/ranking"));
  assertEquals([post.headers.get("Cache-Control"), post.headers.get("ETag")], ["no-store, no-cache, must-revalidate", null]);
  await post.body?.cancel();
});
