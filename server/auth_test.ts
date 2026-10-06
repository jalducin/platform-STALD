// Inicio de sesión con Supabase Auth (openspec: plataforma-login). Sin red: `fetch` falso.
// deno-lint-ignore-file require-await
import { assertEquals } from "jsr:@std/assert@1";
import { configPublica, type DepsAuth, handleEnlace, limpiarCacheSesiones, LOGIN_TRANSICION_HASTA, quienEs } from "./auth.ts";

const ADMIN = "admin@example.com";
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

// Supabase falso: "tok-luz" es válido para luz@example.com, "tok-admin" para el admin; otro token → 401.
function supabaseFalso() {
  const llamadas: { url: string; headers: Headers; body?: string }[] = [];
  const f = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    llamadas.push({ url, headers: new Headers(init?.headers), body: init?.body as string | undefined });
    const auth = new Headers(init?.headers).get("authorization") || "";
    if (url.endsWith("/auth/v1/user")) {
      if (auth === "Bearer tok-luz") return json({ id: "u1", email: "Luz@Example.com " });
      if (auth === "Bearer tok-admin") return json({ id: "u0", email: ADMIN });
      if (auth === "Bearer tok-caido") return new Response("oops", { status: 500 });
      return json({ msg: "invalid JWT" }, 401);
    }
    return json({ error: "no esperado" }, 404);
  }) as typeof fetch;
  return { f, llamadas };
}

function deps(extra: Partial<DepsAuth> = {}): DepsAuth & { llamadas: { url: string; headers: Headers }[] } {
  const s = supabaseFalso();
  return { supabaseUrl: "https://ref.supabase.co", publishableKey: "pub", admin: ADMIN, transicionHasta: "2026-10-12", hoy: () => "2026-10-05", prueba: false, fetch: s.f, llamadas: s.llamadas, ...extra };
}
const req = (q = "", token?: string) => new Request("http://x/perfil" + q, { headers: token ? { Authorization: "Bearer " + token } : {} });

Deno.test("auth: la transición termina el 2026-10-12 por omisión", () => {
  assertEquals(LOGIN_TRANSICION_HASTA, "2026-10-12");
});

Deno.test("auth: token válido → correo verificado de Supabase, no el de la URL", async () => {
  limpiarCacheSesiones();
  const d = deps();
  const r = await quienEs(req("?email=otra@example.com", "tok-luz"), d);
  assertEquals(r, { ok: true, email: "luz@example.com", verificado: true });
  assertEquals(d.llamadas[0].url, "https://ref.supabase.co/auth/v1/user");
  assertEquals([d.llamadas[0].headers.get("apikey"), d.llamadas[0].headers.get("authorization")], ["pub", "Bearer tok-luz"]);
});

Deno.test("auth: token inválido o vencido → 401 sesion_invalida (aunque traiga ?email=)", async () => {
  limpiarCacheSesiones();
  assertEquals(await quienEs(req("?email=luz@example.com", "tok-vencido"), deps()), { ok: false, status: 401, error: "sesion_invalida" });
  assertEquals(await quienEs(req("", "   "), deps()), { ok: false, status: 401, error: "sesion_invalida" });
});

Deno.test("auth: Supabase caído o sin configurar → 503 auth_no_disponible, sin guardarlo en caché", async () => {
  limpiarCacheSesiones();
  const d = deps();
  assertEquals(await quienEs(req("", "tok-caido"), d), { ok: false, status: 503, error: "auth_no_disponible" });
  await quienEs(req("", "tok-caido"), d);
  assertEquals(d.llamadas.length, 2, "no guarda fallas");
  assertEquals(await quienEs(req("", "tok-luz"), deps({ supabaseUrl: "" })), { ok: false, status: 503, error: "auth_no_disponible" });
  const red = deps({ fetch: (async () => { throw new Error("red"); }) as typeof fetch });
  assertEquals((await quienEs(req("", "tok-luz"), red)).ok, false);
});

Deno.test("auth: caché de 5 min por hash del token", async () => {
  limpiarCacheSesiones();
  let t = 1_000_000;
  const d = deps({ ahora: () => t });
  await quienEs(req("", "tok-luz"), d);
  t += 4 * 60_000;
  assertEquals((await quienEs(req("", "tok-luz"), d)).ok, true);
  assertEquals(d.llamadas.length, 1, "usa la caché dentro de 5 min");
  t += 2 * 60_000;
  await quienEs(req("", "tok-luz"), d);
  assertEquals(d.llamadas.length, 2, "vuelve a validar después de 5 min");
  // Un token inválido no se guarda como válido.
  await quienEs(req("", "tok-malo"), d);
  assertEquals((await quienEs(req("", "tok-malo"), d)).ok, false);
});

Deno.test("auth: transición → ?email= sin token se acepta (sin verificar) para alumnos y alumnas", async () => {
  limpiarCacheSesiones();
  assertEquals(await quienEs(req("?email=Luz@Example.com"), deps()), { ok: true, email: "luz@example.com", verificado: false });
  // El último día de la transición todavía cuenta.
  assertEquals((await quienEs(req("?email=luz@example.com"), deps({ hoy: () => "2026-10-12" }))).ok, true);
  // Sin correo ni token, en la transición: correo vacío (las rutas responden missing_email como antes).
  assertEquals(await quienEs(req(""), deps()), { ok: true, email: "", verificado: false });
});

Deno.test("auth: el admin SIEMPRE requiere sesión, incluso en la transición", async () => {
  limpiarCacheSesiones();
  assertEquals(await quienEs(req("?email=" + ADMIN), deps()), { ok: false, status: 401, error: "inicia_sesion" });
  assertEquals(await quienEs(req("?email=ADMIN@example.com"), deps()), { ok: false, status: 401, error: "inicia_sesion" });
  assertEquals(await quienEs(req("?email=luz@example.com", "tok-admin"), deps()), { ok: true, email: ADMIN, verificado: true });
});

Deno.test("auth: fuera de la transición, sin token → 401 inicia_sesion", async () => {
  limpiarCacheSesiones();
  const despues = deps({ hoy: () => "2026-10-13" });
  assertEquals(await quienEs(req("?email=luz@example.com"), despues), { ok: false, status: 401, error: "inicia_sesion" });
  assertEquals(await quienEs(req(""), despues), { ok: false, status: 401, error: "inicia_sesion" });
  assertEquals((await quienEs(req("", "tok-luz"), despues)).ok, true);
});

Deno.test("auth: verificador falso `prueba:<correo>` solo con ROWS_FIXTURE (deps.prueba)", async () => {
  limpiarCacheSesiones();
  const d = deps({ prueba: true });
  assertEquals(await quienEs(req("", "prueba:Ana@Example.com"), d), { ok: true, email: "ana@example.com", verificado: true });
  assertEquals(d.llamadas.length, 0, "no consulta Supabase");
  assertEquals((await quienEs(req("", "prueba:no-es-correo"), d)).ok, false);
  // Sin modo prueba, el mismo token va a Supabase y se rechaza.
  assertEquals(await quienEs(req("", "prueba:ana@example.com"), deps()), { ok: false, status: 401, error: "sesion_invalida" });
});

Deno.test("config: devuelve la llave publishable; modo prueba con ROWS_FIXTURE; 503 sin variables", () => {
  assertEquals(configPublica({ SUPABASE_URL: "https://ref.supabase.co/", SUPABASE_PUBLISHABLE_KEY: "pub", SUPABASE_SERVICE_KEY: "secreta" }), { status: 200, body: { supabaseUrl: "https://ref.supabase.co", publishableKey: "pub" } });
  assertEquals(configPublica({ ROWS_FIXTURE: "f.json", SUPABASE_URL: "u", SUPABASE_PUBLISHABLE_KEY: "p" }), { status: 200, body: { prueba: true } });
  assertEquals(configPublica({}), { status: 503, body: { error: "sin_config" } });
  assertEquals(JSON.stringify(configPublica({ SUPABASE_URL: "u", SUPABASE_PUBLISHABLE_KEY: "p", SUPABASE_SERVICE_KEY: "secreta" })).includes("secreta"), false);
});

// Admin API falsa para generate_link.
function adminApiFalsa(estado = 200) {
  const llamadas: { url: string; headers: Headers; body: Record<string, unknown> }[] = [];
  const f = (async (input: string | URL | Request, init?: RequestInit) => {
    llamadas.push({ url: String(input), headers: new Headers(init?.headers), body: JSON.parse(String(init?.body || "{}")) });
    if (estado === 404) return json({ msg: "User not found", error_code: "user_not_found" }, 404);
    if (estado !== 200) return json({ msg: "fallo" }, estado);
    return json({ id: "u1", email: "luz@example.com", action_link: "https://ref.supabase.co/auth/v1/verify?token=abc&type=magiclink&redirect_to=x", email_otp: "123456" });
  }) as typeof fetch;
  return { f, llamadas };
}
const enlaceDeps = (f: typeof fetch) => ({ admin: ADMIN, supabaseUrl: "https://ref.supabase.co", serviceKey: "srv", redirect: "https://jalducin.github.io/platform-STALD/", fetch: f });
const postEnlace = (body: unknown) => new Request("http://x/auth/enlace", { method: "POST", body: JSON.stringify(body) });

Deno.test("enlace: el admin con sesión genera un enlace magiclink con la llave de servicio", async () => {
  const api = adminApiFalsa();
  const r = await handleEnlace(postEnlace({ email: " Luz@Example.com" }), { ok: true, email: ADMIN, verificado: true }, enlaceDeps(api.f), json);
  assertEquals(r.status, 200);
  assertEquals(await r.json(), { email: "luz@example.com", enlace: "https://ref.supabase.co/auth/v1/verify?token=abc&type=magiclink&redirect_to=x", codigo: "123456" });
  assertEquals(api.llamadas[0].url, "https://ref.supabase.co/auth/v1/admin/generate_link");
  assertEquals([api.llamadas[0].headers.get("apikey"), api.llamadas[0].headers.get("authorization")], ["srv", "Bearer srv"]);
  assertEquals(api.llamadas[0].body, { type: "magiclink", email: "luz@example.com", redirect_to: "https://jalducin.github.io/platform-STALD/" });
});

Deno.test("enlace: solo el admin con sesión verificada; correo válido; sin cuenta → 404", async () => {
  const api = adminApiFalsa();
  const alumno = await handleEnlace(postEnlace({ email: "luz@example.com" }), { ok: true, email: "luz@example.com", verificado: true }, enlaceDeps(api.f), json);
  assertEquals([alumno.status, (await alumno.json()).error], [403, "solo_admin"]);
  const sinSesion = await handleEnlace(postEnlace({ email: "luz@example.com" }), { ok: true, email: ADMIN, verificado: false }, enlaceDeps(api.f), json);
  assertEquals([sinSesion.status, (await sinSesion.json()).error], [401, "inicia_sesion"]);
  const malo = await handleEnlace(postEnlace({ email: "no-es-correo" }), { ok: true, email: ADMIN, verificado: true }, enlaceDeps(api.f), json);
  assertEquals([malo.status, (await malo.json()).error], [400, "correo_invalido"]);
  const get = await handleEnlace(new Request("http://x/auth/enlace"), { ok: true, email: ADMIN, verificado: true }, enlaceDeps(api.f), json);
  assertEquals(get.status, 405);
  assertEquals(api.llamadas.length, 0, "no llama a Supabase si no procede");
  // Sin cuenta en Auth: se da de alta (email confirmado) y se vuelve a pedir el enlace (ajuste post-apply).
  const llamadas: { url: string; body: Record<string, unknown> }[] = [];
  let existe = false;
  const sinUsuario = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input), body = JSON.parse(String(init?.body || "{}"));
    llamadas.push({ url, body });
    if (url.endsWith("/admin/users")) { existe = true; return json({ id: "u2", email: body.email }); }
    if (!existe) return json({ msg: "User not found", error_code: "user_not_found" }, 404);
    return json({ action_link: "https://ref.supabase.co/auth/v1/verify?token=nuevo", email_otp: "654321" });
  }) as typeof fetch;
  const r = await handleEnlace(postEnlace({ email: "Nueva@Example.com" }), { ok: true, email: ADMIN, verificado: true }, enlaceDeps(sinUsuario), json);
  assertEquals([r.status, (await r.json()).enlace], [200, "https://ref.supabase.co/auth/v1/verify?token=nuevo"]);
  assertEquals(llamadas.map((l) => l.url.replace("https://ref.supabase.co/auth/v1", "")), ["/admin/generate_link", "/admin/users", "/admin/generate_link"]);
  assertEquals(llamadas[1].body, { email: "nueva@example.com", email_confirm: true });
  const caido = adminApiFalsa(500);
  const c = await handleEnlace(postEnlace({ email: "luz@example.com" }), { ok: true, email: ADMIN, verificado: true }, enlaceDeps(caido.f), json);
  assertEquals([c.status, (await c.json()).error], [503, "auth_no_disponible"]);
  const sinLlave = await handleEnlace(postEnlace({ email: "luz@example.com" }), { ok: true, email: ADMIN, verificado: true }, { ...enlaceDeps(api.f), serviceKey: "" }, json);
  assertEquals(sinLlave.status, 503);
});

Deno.test("generarEnlace: devuelve hashed_token y da de alta la cuenta si falta (openspec: registro-directo-juegos)", async () => {
  const { generarEnlace } = await import("./auth.ts");
  let existe = false;
  const rutas: string[] = [];
  const f = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input), body = JSON.parse(String(init?.body || "{}"));
    rutas.push(url.replace("https://ref.supabase.co/auth/v1", ""));
    if (url.endsWith("/admin/users")) { existe = true; return json({ id: "u", email: body.email }); }
    if (!existe) return json({ error_code: "user_not_found" }, 404);
    return json({ action_link: "https://ref/verify?token=t", email_otp: "12345678", hashed_token: "hash-1" });
  }) as typeof fetch;
  const r = await generarEnlace({ supabaseUrl: "https://ref.supabase.co", serviceKey: "srv", fetch: f }, "leo@example.com", "https://sitio/juegos.html");
  assertEquals(r, { enlace: "https://ref/verify?token=t", codigo: "12345678", tokenHash: "hash-1" });
  assertEquals(rutas, ["/admin/generate_link", "/admin/users", "/admin/generate_link"]);
});

Deno.test("enlace: destino «juegos» lleva a juegos.html (openspec: jugadores-admin)", async () => {
  const api = adminApiFalsa();
  const r = await handleEnlace(postEnlace({ email: "leo@example.com", destino: "juegos" }), { ok: true, email: ADMIN, verificado: true }, enlaceDeps(api.f), json);
  assertEquals(r.status, 200);
  assertEquals(api.llamadas[0].body.redirect_to, "https://jalducin.github.io/platform-STALD/juegos.html");
});

Deno.test("cuentas: listarCuentas lee la Admin API con la llave de servicio y normaliza", async () => {
  const { listarCuentas } = await import("./auth.ts");
  const llamadas: string[] = [];
  const f = (async (input: string | URL | Request, init?: RequestInit) => {
    llamadas.push(String(input) + "|" + new Headers(init?.headers).get("apikey"));
    return json({ users: [{ email: "Leo@Example.com", created_at: "c", email_confirmed_at: null, last_sign_in_at: null, confirmation_sent_at: "e" }] });
  }) as typeof fetch;
  const cs = await listarCuentas({ supabaseUrl: "https://ref.supabase.co/", serviceKey: "srv", fetch: f });
  assertEquals(cs, [{ email: "leo@example.com", creada: "c", confirmada: false, ultimoAcceso: null, ultimoEnvio: "e" }]);
  assertEquals(llamadas[0], "https://ref.supabase.co/auth/v1/admin/users?page=1&per_page=1000|srv");
});
