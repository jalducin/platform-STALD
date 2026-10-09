// Entrada con contraseña (openspec: acceso-con-contrasena). Sin red: Supabase Auth falsa en memoria.
import { assertEquals } from "jsr:@std/assert@1";
import { derivar, handleCambio, handleOlvide, handlePreparar, handleRestablecer, limpiarIntentos, normalizarInicial } from "./contrasena.ts";

const ADMIN = "profe@example.com";
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s });

// Auth falsa: usuarios por correo con contraseña y app_metadata; registra las llamadas.
function authFalsa(iniciales: Record<string, { password?: string; propia?: boolean }> = {}) {
  const usuarios = new Map<string, { id: string; email: string; password?: string; app_metadata: Record<string, unknown> }>();
  let n = 0;
  for (const [email, u] of Object.entries(iniciales)) usuarios.set(email, { id: `u${++n}`, email, password: u.password, app_metadata: u.propia === undefined ? {} : { contrasena_propia: u.propia } });
  const llamadas: string[] = [];
  const fetchFalso = (url: string | URL | Request, init?: RequestInit) => Promise.resolve(responder(url, init));
  const responder = (url: string | URL | Request, init?: RequestInit): Response => {
    const u = new URL(String(url)); const m = init?.method ?? "GET";
    llamadas.push(`${m} ${u.pathname}`);
    if (m === "GET" && u.pathname === "/auth/v1/admin/users") return json({ users: [...usuarios.values()].map((x) => ({ id: x.id, email: x.email, app_metadata: x.app_metadata })) });
    const body = init?.body ? JSON.parse(String(init.body)) : {};
    if (m === "POST" && u.pathname === "/auth/v1/admin/users") {
      const nuevo = { id: `u${++n}`, email: body.email, password: body.password, app_metadata: body.app_metadata ?? {} };
      usuarios.set(body.email, nuevo);
      return json(nuevo);
    }
    const mm = u.pathname.match(/^\/auth\/v1\/admin\/users\/(.+)$/);
    if (m === "PUT" && mm) {
      const x = [...usuarios.values()].find((y) => y.id === mm[1]);
      if (!x) return json({ error: "not_found" }, 404);
      if (body.password) x.password = body.password;
      if (body.app_metadata) x.app_metadata = { ...x.app_metadata, ...body.app_metadata };
      return json(x);
    }
    return json({ error: "ruta" }, 500);
  };
  return { usuarios, llamadas, fetch: fetchFalso as typeof fetch };
}

const clase = new Set(["marisol@example.com", "sofy@example.com"]);
function deps(a: ReturnType<typeof authFalsa>, extra: Record<string, unknown> = {}) {
  return { supabaseUrl: "https://x.supabase.co", serviceKey: "srv", admin: ADMIN, esDeClase: (e: string) => Promise.resolve(clase.has(e)), fetch: a.fetch, ...extra };
}
const post = (ruta: string, body: unknown) => new Request(`http://x${ruta}`, { method: "POST", body: JSON.stringify(body) });
async function leer(res: Response) { return { status: res.status, body: await res.json() }; }

Deno.test("derivar: prefijo stald· (las iniciales de 5 letras cumplen el mínimo de 6 de Supabase)", () => {
  assertEquals(derivar("clase"), "stald·clase");
  assertEquals([normalizarInicial(" Clase "), normalizarInicial("SENSEI"), normalizarInicial("Clase1")], ["clase", "sensei", "Clase1"]);
});

Deno.test("preparar: alumna sin cuenta + «clase» → crea la cuenta confirmada con la inicial, sin correo", async () => {
  limpiarIntentos();
  const a = authFalsa();
  const r = await leer(await handlePreparar(post("/auth/preparar", { email: " Marisol@Example.com ", password: "Clase" }), deps(a), json));
  assertEquals([r.status, r.body.listo], [200, true]);
  const u = a.usuarios.get("marisol@example.com")!;
  assertEquals([u.password, u.app_metadata.contrasena_propia], ["stald·clase", false]);
});

Deno.test("preparar: alumna con cuenta de enlace (sin contraseña) → le pone la inicial; el profe con «sensei»", async () => {
  limpiarIntentos();
  const a = authFalsa({ "sofy@example.com": {}, [ADMIN]: {} });
  assertEquals((await handlePreparar(post("/auth/preparar", { email: "sofy@example.com", password: "clase" }), deps(a), json)).status, 200);
  assertEquals(a.usuarios.get("sofy@example.com")!.password, "stald·clase");
  assertEquals((await handlePreparar(post("/auth/preparar", { email: ADMIN, password: "clase" }), deps(a), json)).status, 401, "el profe no usa «clase»");
  assertEquals((await handlePreparar(post("/auth/preparar", { email: ADMIN, password: "sensei" }), deps(a), json)).status, 200);
  assertEquals(a.usuarios.get(ADMIN)!.password, "stald·sensei");
});

Deno.test("preparar: 401 con otra contraseña, con contraseña propia o si no es de las clases; 400 correo inválido", async () => {
  limpiarIntentos();
  const a = authFalsa({ "sofy@example.com": { password: "stald·mia123", propia: true } });
  const casos = [
    [{ email: "marisol@example.com", password: "otra" }, 401],
    [{ email: "sofy@example.com", password: "clase" }, 401],
    [{ email: "osvaldo@example.com", password: "clase" }, 401],
    [{ email: "no-es-correo", password: "clase" }, 400],
  ] as const;
  for (const [body, status] of casos) assertEquals((await handlePreparar(post("/auth/preparar", body), deps(a), json)).status, status, JSON.stringify(body));
  assertEquals(a.usuarios.get("sofy@example.com")!.password, "stald·mia123", "no se pisa la propia");
  assertEquals(a.usuarios.has("osvaldo@example.com"), false);
});

Deno.test("preparar: más de 10 intentos por correo en 10 minutos → 429", async () => {
  limpiarIntentos();
  const a = authFalsa();
  let t = 1_000_000;
  const d = deps(a, { ahora: () => t });
  for (let i = 0; i < 10; i++) assertEquals((await handlePreparar(post("/auth/preparar", { email: "marisol@example.com", password: "mal" }), d, json)).status, 401);
  assertEquals((await handlePreparar(post("/auth/preparar", { email: "marisol@example.com", password: "clase" }), d, json)).status, 429);
  t += 10 * 60_000 + 1;
  assertEquals((await handlePreparar(post("/auth/preparar", { email: "marisol@example.com", password: "clase" }), d, json)).status, 200);
});

Deno.test("cambio: con sesión pone la nueva y marca contraseña propia; valida longitud e iniciales", async () => {
  limpiarIntentos();
  const a = authFalsa({ "sofy@example.com": { password: "stald·clase", propia: false } });
  const quien = { ok: true as const, email: "sofy@example.com", verificado: true };
  for (const nueva of ["corta", "clase", "SENSEI", "x".repeat(61)]) assertEquals((await handleCambio(post("/auth/contrasena", { nueva }), quien, deps(a), json)).status, 400, nueva);
  const r = await leer(await handleCambio(post("/auth/contrasena", { nueva: "sofi2026" }), quien, deps(a), json));
  assertEquals([r.status, r.body.ok], [200, true]);
  const u = a.usuarios.get("sofy@example.com")!;
  assertEquals([u.password, u.app_metadata.contrasena_propia], ["stald·sofi2026", true]);
  const sinSesion = { ok: true as const, email: "sofy@example.com", verificado: false };
  assertEquals((await handleCambio(post("/auth/contrasena", { nueva: "otra2026" }), sinSesion, deps(a), json)).status, 401);
});

Deno.test("restablecer: solo el profe; deja la cuenta para entrar otra vez con la inicial", async () => {
  limpiarIntentos();
  const a = authFalsa({ "sofy@example.com": { password: "stald·sofi2026", propia: true } });
  const profe = { ok: true as const, email: ADMIN, verificado: true };
  const alumna = { ok: true as const, email: "marisol@example.com", verificado: true };
  assertEquals((await handleRestablecer(post("/auth/restablecer", { email: "sofy@example.com" }), alumna, deps(a), json)).status, 403);
  const r = await leer(await handleRestablecer(post("/auth/restablecer", { email: "sofy@example.com" }), profe, deps(a), json));
  assertEquals([r.status, r.body.ok], [200, true]);
  const u = a.usuarios.get("sofy@example.com")!;
  assertEquals(u.app_metadata.contrasena_propia, false);
  assertEquals(u.password === "stald·sofi2026", false, "la anterior ya no sirve");
  assertEquals((await handlePreparar(post("/auth/preparar", { email: "sofy@example.com", password: "clase" }), deps(a), json)).status, 200);
  assertEquals((await handleRestablecer(post("/auth/restablecer", { email: "nadie@example.com" }), profe, deps(a), json)).status, 200, "sin cuenta: entrará con la inicial");
});

Deno.test("modo de prueba: cambio y restablecer responden sin Supabase", async () => {
  const d = { supabaseUrl: "", serviceKey: "", admin: ADMIN, esDeClase: () => Promise.resolve(true), prueba: true };
  assertEquals((await handleCambio(post("/auth/contrasena", { nueva: "nueva2026" }), { ok: true, email: "sofy@example.com", verificado: true }, d, json)).status, 200);
  assertEquals((await handleRestablecer(post("/auth/restablecer", { email: "sofy@example.com" }), { ok: true, email: ADMIN, verificado: true }, d, json)).status, 200);
});

Deno.test("olvidé: a las clases y al profe les manda el enlace por correo (Supabase /otp); a otros no; 429 del correo", async () => {
  limpiarIntentos();
  const pedidas: string[] = [];
  let respuesta = 200;
  const f = ((url: string | URL | Request, init?: RequestInit) => {
    pedidas.push(`${new URL(String(url)).pathname}?${new URL(String(url)).searchParams.get("redirect_to")} ${init?.body}`);
    return Promise.resolve(json({}, respuesta));
  }) as typeof fetch;
  const d = { ...deps(authFalsa()), fetch: f, redirect: "https://sitio/" };
  const r = await leer(await handleOlvide(post("/auth/olvide", { email: " Sofy@Example.com " }), d, json));
  assertEquals([r.status, r.body.enviado], [200, true]);
  assertEquals(pedidas, ['/auth/v1/otp?https://sitio/ {"email":"sofy@example.com","create_user":true}']);
  assertEquals((await handleOlvide(post("/auth/olvide", { email: ADMIN }), d, json)).status, 200);
  const otro = await leer(await handleOlvide(post("/auth/olvide", { email: "osvaldo@example.com" }), d, json));
  assertEquals([otro.status, otro.body.error], [404, "no_es_de_clase"]);
  respuesta = 429;
  const lim = await leer(await handleOlvide(post("/auth/olvide", { email: "marisol@example.com" }), d, json));
  assertEquals([lim.status, lim.body.error], [429, "limite_correo"]);
  assertEquals(pedidas.length, 3, "a quien no es de clase no se le manda nada");
});

Deno.test("olvidé: máximo 3 por correo cada hora; en modo de prueba no llama a Supabase", async () => {
  limpiarIntentos();
  const d = { ...deps(authFalsa()), prueba: true, redirect: "https://sitio/" };
  for (let i = 0; i < 3; i++) assertEquals((await handleOlvide(post("/auth/olvide", { email: "sofy@example.com" }), d, json)).status, 200);
  assertEquals((await handleOlvide(post("/auth/olvide", { email: "sofy@example.com" }), d, json)).status, 429);
});
