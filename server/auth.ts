// Inicio de sesión con Supabase Auth (openspec: plataforma-login).
// El navegador manda `Authorization: Bearer <access_token>`; aquí se valida con Supabase y se obtiene el correo
// verificado. Durante la transición (hasta LOGIN_TRANSICION_HASTA) todavía se acepta `?email=` sin token, salvo
// para el admin, que siempre requiere sesión.
import { normalizeEmail } from "./rows.ts";

// Último día (inclusive, hora de CDMX) en que se acepta `?email=` sin token. Se puede sobreescribir con la variable
// de entorno del mismo nombre (p. ej. para probar o para alargar la transición sin tocar código).
export const LOGIN_TRANSICION_HASTA = "2026-10-12";
const TTL_SESION_MS = 5 * 60_000;
const MAX_CACHE = 2000;
const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface DepsAuth {
  supabaseUrl: string; // https://<ref>.supabase.co ("" si no está configurado)
  publishableKey: string;
  admin: string; // SUPER_ADMIN_EMAIL normalizado
  transicionHasta: string; // AAAA-MM-DD
  hoy: () => string; // AAAA-MM-DD en CDMX
  prueba: boolean; // solo con ROWS_FIXTURE: acepta `Bearer prueba:<correo>`
  fetch?: typeof fetch;
  ahora?: () => number;
}

export type Quien =
  | { ok: true; email: string; verificado: boolean }
  | { ok: false; status: number; error: "sesion_invalida" | "inicia_sesion" | "auth_no_disponible" };

const cache = new Map<string, { email: string; t: number }>();
export function limpiarCacheSesiones() {
  cache.clear();
}

async function hashToken(token: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function tokenDe(req: Request): string | null {
  const h = req.headers.get("authorization");
  if (h === null) return null;
  const m = h.match(/^Bearer\s*(.*)$/i);
  return m ? m[1].trim() : "";
}

// Quién hace la petición: correo verificado por la sesión o, en la transición, el de `?email=` (sin verificar).
export async function quienEs(req: Request, deps: DepsAuth): Promise<Quien> {
  const token = tokenDe(req);
  if (token !== null) {
    if (!token) return { ok: false, status: 401, error: "sesion_invalida" };
    if (deps.prueba && token.startsWith("prueba:")) {
      const email = normalizeEmail(token.slice("prueba:".length));
      return CORREO.test(email) ? { ok: true, email, verificado: true } : { ok: false, status: 401, error: "sesion_invalida" };
    }
    const ahora = deps.ahora ? deps.ahora() : Date.now();
    const clave = await hashToken(token);
    const memo = cache.get(clave);
    if (memo && ahora - memo.t < TTL_SESION_MS) return { ok: true, email: memo.email, verificado: true };
    if (!deps.supabaseUrl || !deps.publishableKey) return { ok: false, status: 503, error: "auth_no_disponible" };
    let res: Response;
    try {
      res = await (deps.fetch ?? fetch)(`${deps.supabaseUrl.replace(/\/$/, "")}/auth/v1/user`, {
        headers: { "apikey": deps.publishableKey, "Authorization": `Bearer ${token}` },
        signal: AbortSignal.timeout(5000),
      });
    } catch (e) {
      console.error("auth:", e instanceof Error ? e.message : e);
      return { ok: false, status: 503, error: "auth_no_disponible" };
    }
    if (res.status === 401 || res.status === 403) {
      await res.body?.cancel();
      return { ok: false, status: 401, error: "sesion_invalida" };
    }
    if (!res.ok) {
      await res.body?.cancel();
      console.error("auth: /auth/v1/user", res.status);
      return { ok: false, status: 503, error: "auth_no_disponible" };
    }
    const u = await res.json().catch(() => ({}));
    const email = normalizeEmail(typeof u?.email === "string" ? u.email : null);
    if (!email) return { ok: false, status: 401, error: "sesion_invalida" };
    if (cache.size >= MAX_CACHE) cache.clear();
    cache.set(clave, { email, t: ahora });
    return { ok: true, email, verificado: true };
  }
  // Sin token: solo durante la transición y nunca para el admin.
  const email = normalizeEmail(new URL(req.url).searchParams.get("email"));
  if (deps.admin && email === deps.admin) return { ok: false, status: 401, error: "inicia_sesion" };
  if (deps.hoy() > deps.transicionHasta) return { ok: false, status: 401, error: "inicia_sesion" };
  return { ok: true, email, verificado: false };
}

// GET /config → configuración pública para el navegador (la llave publishable es pública por diseño).
export function configPublica(env: Record<string, string | undefined>): { status: number; body: Record<string, unknown> } {
  if (env.ROWS_FIXTURE) return { status: 200, body: { prueba: true } };
  if (!env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY) return { status: 503, body: { error: "sin_config" } };
  return { status: 200, body: { supabaseUrl: env.SUPABASE_URL.replace(/\/$/, ""), publishableKey: env.SUPABASE_PUBLISHABLE_KEY } };
}

export interface DepsEnlace {
  admin: string;
  supabaseUrl: string;
  serviceKey: string; // solo servidor
  redirect: string; // a dónde lleva el enlace (debe estar en las redirecciones permitidas de Supabase)
  fetch?: typeof fetch;
}

// POST /auth/enlace { email } → enlace de acceso de un solo uso (Admin API generate_link, tipo magiclink), para que
// el profe lo mande por WhatsApp. Solo el admin con sesión verificada.
export async function handleEnlace(req: Request, quien: Quien, deps: DepsEnlace, json: (b: unknown, s?: number) => Response): Promise<Response> {
  if (req.method !== "POST") return json({ error: "metodo_no_permitido" }, 405);
  if (!quien.ok) return json({ error: quien.error }, quien.status);
  if (!quien.verificado) return json({ error: "inicia_sesion" }, 401);
  if (!deps.admin || quien.email !== deps.admin) return json({ error: "solo_admin" }, 403);
  let body: { email?: unknown; destino?: unknown } = {};
  try { body = await req.json(); } catch { return json({ error: "json_invalido" }, 400); }
  const email = normalizeEmail(typeof body.email === "string" ? body.email : null);
  if (!CORREO.test(email)) return json({ error: "correo_invalido" }, 400);
  if (!deps.supabaseUrl || !deps.serviceKey) return json({ error: "auth_no_disponible" }, 503);
  // destino «juegos»: el enlace lleva directo a Juegos (openspec: jugadores-admin).
  const redirect = body.destino === "juegos" ? deps.redirect.replace(/\/?$/, "/") + "juegos.html" : deps.redirect;
  try {
    const r = await generarEnlace(deps, email, redirect);
    return json({ email, enlace: r.enlace, codigo: r.codigo });
  } catch (e) {
    console.error("auth enlace:", e instanceof Error ? e.message : e);
    return json({ error: "auth_no_disponible" }, 503);
  }
}

// Enlace de acceso de un solo uso con la Admin API (generate_link, tipo magiclink), sin mandar correo. Si la cuenta
// no existe, la da de alta con el correo confirmado y lo pide otra vez. Devuelve también `tokenHash`, que la página
// canjea con verifyOtp para entrar sin abrir el enlace (openspec: registro-directo-juegos). Lanza error si Auth falla.
export async function generarEnlace(deps: { supabaseUrl: string; serviceKey: string; fetch?: typeof fetch }, email: string, redirect: string):
  Promise<{ enlace: string; codigo: string | null; tokenHash: string | null }> {
  const base = deps.supabaseUrl.replace(/\/$/, "");
  const admin = (ruta: string, body: unknown) => (deps.fetch ?? fetch)(`${base}/auth/v1/admin/${ruta}`, {
    method: "POST",
    headers: { "apikey": deps.serviceKey, "Authorization": `Bearer ${deps.serviceKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
  });
  const pedirEnlace = () => admin("generate_link", { type: "magiclink", email, redirect_to: redirect });
  let res = await pedirEnlace();
  let j: Record<string, unknown> & { properties?: Record<string, unknown> } = await res.json().catch(() => ({}));
  // Aún no existe en Auth: se da de alta con el correo confirmado y se pide el enlace otra vez.
  if (res.status === 404 || res.status === 422 || j?.error_code === "user_not_found") {
    const alta = await admin("users", { email, email_confirm: true });
    await alta.body?.cancel();
    if (!alta.ok && alta.status !== 422) throw new Error(`auth alta ${alta.status}`);
    res = await pedirEnlace();
    j = await res.json().catch(() => ({}));
  }
  if (!res.ok) throw new Error(`auth enlace ${res.status}`);
  // GoTrue devuelve las propiedades del enlace en la raíz; supabase-js las agrupa en `properties`.
  const enlace = j?.action_link ?? j?.properties?.action_link;
  if (typeof enlace !== "string") throw new Error("auth enlace sin action_link");
  const codigo = (j?.email_otp ?? j?.properties?.email_otp ?? null) as string | null;
  const tokenHash = (j?.hashed_token ?? j?.properties?.hashed_token ?? null) as string | null;
  return { enlace, codigo, tokenHash };
}

// Cuentas de acceso de Supabase Auth (Admin API, llave de servicio; solo servidor) para la vista de jugadores del
// admin (openspec: jugadores-admin). Sin correo normalizado no se incluye.
export async function listarCuentas(deps: { supabaseUrl: string; serviceKey: string; fetch?: typeof fetch }): Promise<import("./jugadores.ts").Cuenta[]> {
  const base = deps.supabaseUrl.replace(/\/$/, "");
  const res = await (deps.fetch ?? fetch)(`${base}/auth/v1/admin/users?page=1&per_page=1000`, {
    headers: { "apikey": deps.serviceKey, "Authorization": `Bearer ${deps.serviceKey}` },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) { await res.body?.cancel(); throw new Error(`auth users ${res.status}`); }
  const j = await res.json() as { users?: Record<string, string | null>[] };
  return (j.users || []).map((u) => ({
    email: normalizeEmail(u.email ?? null), creada: u.created_at ?? "", confirmada: !!u.email_confirmed_at,
    ultimoAcceso: u.last_sign_in_at ?? null, ultimoEnvio: u.recovery_sent_at ?? u.confirmation_sent_at ?? null,
  })).filter((c) => c.email);
}
