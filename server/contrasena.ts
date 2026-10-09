// Entrada con correo y contraseña (openspec: acceso-con-contrasena). El correo gratuito de Supabase se agotaba con los
// enlaces, así que las clases entran con contraseña y nada depende del correo:
// - POST /auth/preparar { email, password } (sin sesión): si es la contraseña inicial de esa persona («sensei» el
//   profe, «clase» alumnos y alumnas) y aún no tiene una propia, crea o ajusta su cuenta de Auth; la página reintenta.
// - POST /auth/contrasena { nueva } (con sesión): cambia la contraseña y la marca como propia.
// - POST /auth/restablecer { email } (solo el profe): la deja otra vez con la inicial.
// - POST /auth/olvide { email } (sin sesión): «¿Olvidaste tu contraseña?» manda un enlace de acceso por correo, solo a
//   las clases y al profe (el correo de Supabase es escaso: máximo 3 por correo cada hora).
// En Auth se guarda `derivar(contraseña)`: el prefijo hace que «clase» cumpla el mínimo de 6 de Supabase.
import { normalizeEmail } from "./rows.ts";
import type { Quien } from "./auth.ts";

type Json = (b: unknown, s?: number) => Response;

export const PREFIJO = "stald·";
export const INICIAL_ALUMNOS = "clase";
export const INICIAL_PROFE = "sensei";
const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_INTENTOS = 10;
const VENTANA_MS = 10 * 60_000;

export interface DepsContrasena {
  supabaseUrl: string;
  serviceKey: string; // solo servidor
  admin: string; // SUPER_ADMIN_EMAIL normalizado
  esDeClase(email: string): Promise<boolean>; // alumno o alumna de Inglés o Secundaria (no invitado de Juegos)
  prueba?: boolean; // ROWS_FIXTURE: sin Supabase
  redirect?: string; // a dónde lleva el enlace de «¿Olvidaste tu contraseña?» (SITIO_URL)
  fetch?: typeof fetch;
  ahora?: () => number;
}

export const derivar = (p: string) => PREFIJO + p;
// Los celulares ponen mayúscula inicial: «Clase» o « sensei » cuentan como la inicial.
export function normalizarInicial(p: string): string {
  const t = p.trim().toLowerCase();
  return t === INICIAL_ALUMNOS || t === INICIAL_PROFE ? t : p;
}

const intentos = new Map<string, number[]>();
const olvidos = new Map<string, number[]>();
export function limpiarIntentos() {
  intentos.clear();
  olvidos.clear();
}

interface UsuarioAuth { id: string; email: string; app_metadata?: Record<string, unknown> }

function api(deps: DepsContrasena) {
  const base = deps.supabaseUrl.replace(/\/$/, "");
  const h = { "apikey": deps.serviceKey, "Authorization": `Bearer ${deps.serviceKey}`, "Content-Type": "application/json" };
  const f = deps.fetch ?? fetch;
  return {
    async buscar(email: string): Promise<UsuarioAuth | null> {
      const res = await f(`${base}/auth/v1/admin/users?page=1&per_page=1000`, { headers: h, signal: AbortSignal.timeout(8000) });
      if (!res.ok) { await res.body?.cancel(); throw new Error(`auth users ${res.status}`); }
      const j = await res.json() as { users?: UsuarioAuth[] };
      return (j.users || []).find((u) => normalizeEmail(u.email ?? null) === email) ?? null;
    },
    async crear(email: string, password: string, propia: boolean) {
      const res = await f(`${base}/auth/v1/admin/users`, { method: "POST", headers: h, signal: AbortSignal.timeout(8000),
        body: JSON.stringify({ email, password, email_confirm: true, app_metadata: { contrasena_propia: propia } }) });
      await res.body?.cancel();
      if (!res.ok) throw new Error(`auth alta ${res.status}`);
    },
    async actualizar(id: string, password: string, propia: boolean) {
      const res = await f(`${base}/auth/v1/admin/users/${encodeURIComponent(id)}`, { method: "PUT", headers: h, signal: AbortSignal.timeout(8000),
        body: JSON.stringify({ password, app_metadata: { contrasena_propia: propia } }) });
      await res.body?.cancel();
      if (!res.ok) throw new Error(`auth actualizar ${res.status}`);
    },
  };
}

async function cuerpo<T>(req: Request): Promise<T | null> {
  try { return (await req.json()) ?? {}; } catch { return null; }
}

// POST /auth/preparar → 200 { listo } | 400 | 401 credenciales | 429 | 503.
export async function handlePreparar(req: Request, deps: DepsContrasena, json: Json): Promise<Response> {
  if (req.method !== "POST") return json({ error: "metodo_no_permitido" }, 405);
  const b = await cuerpo<{ email?: unknown; password?: unknown }>(req);
  if (!b) return json({ error: "json_invalido" }, 400);
  const email = normalizeEmail(typeof b.email === "string" ? b.email : null);
  if (!CORREO.test(email)) return json({ error: "correo_invalido" }, 400);
  const password = normalizarInicial(typeof b.password === "string" ? b.password : "");

  const ahora = deps.ahora ? deps.ahora() : Date.now();
  const previos = (intentos.get(email) || []).filter((t) => ahora - t < VENTANA_MS);
  if (previos.length >= MAX_INTENTOS) return json({ error: "demasiados_intentos" }, 429);
  intentos.set(email, [...previos, ahora]);

  const inicial = deps.admin && email === deps.admin ? INICIAL_PROFE : (await deps.esDeClase(email)) ? INICIAL_ALUMNOS : null;
  if (!inicial || password !== inicial) return json({ error: "credenciales" }, 401);
  if (deps.prueba) return json({ listo: true });
  if (!deps.supabaseUrl || !deps.serviceKey) return json({ error: "auth_no_disponible" }, 503);
  try {
    const a = api(deps);
    const u = await a.buscar(email);
    if (u?.app_metadata?.contrasena_propia === true) return json({ error: "credenciales" }, 401);
    if (u) await a.actualizar(u.id, derivar(inicial), false);
    else await a.crear(email, derivar(inicial), false);
    return json({ listo: true });
  } catch (e) {
    console.error("auth preparar:", e instanceof Error ? e.message : e);
    return json({ error: "auth_no_disponible" }, 503);
  }
}

// POST /auth/contrasena { nueva } (con sesión) → 200 { ok } | 400 contrasena_invalida | 401.
export async function handleCambio(req: Request, quien: Quien, deps: DepsContrasena, json: Json): Promise<Response> {
  if (req.method !== "POST") return json({ error: "metodo_no_permitido" }, 405);
  if (!quien.ok) return json({ error: quien.error }, quien.status);
  if (!quien.verificado) return json({ error: "inicia_sesion" }, 401);
  const b = await cuerpo<{ nueva?: unknown }>(req);
  if (!b) return json({ error: "json_invalido" }, 400);
  const nueva = typeof b.nueva === "string" ? b.nueva : "";
  const baja = nueva.trim().toLowerCase();
  if (nueva.length < 6 || nueva.length > 60 || baja === INICIAL_ALUMNOS || baja === INICIAL_PROFE) return json({ error: "contrasena_invalida" }, 400);
  if (deps.prueba) return json({ ok: true });
  if (!deps.supabaseUrl || !deps.serviceKey) return json({ error: "auth_no_disponible" }, 503);
  try {
    const a = api(deps);
    const u = await a.buscar(quien.email);
    if (!u) return json({ error: "sin_cuenta" }, 404);
    await a.actualizar(u.id, derivar(nueva), true);
    return json({ ok: true });
  } catch (e) {
    console.error("auth contrasena:", e instanceof Error ? e.message : e);
    return json({ error: "auth_no_disponible" }, 503);
  }
}

// POST /auth/restablecer { email } (solo el profe) → 200 { ok, sinCuenta? } | 400 | 401 | 403.
export async function handleRestablecer(req: Request, quien: Quien, deps: DepsContrasena, json: Json): Promise<Response> {
  if (req.method !== "POST") return json({ error: "metodo_no_permitido" }, 405);
  if (!quien.ok) return json({ error: quien.error }, quien.status);
  if (!quien.verificado) return json({ error: "inicia_sesion" }, 401);
  if (!deps.admin || quien.email !== deps.admin) return json({ error: "solo_admin" }, 403);
  const b = await cuerpo<{ email?: unknown }>(req);
  if (!b) return json({ error: "json_invalido" }, 400);
  const email = normalizeEmail(typeof b.email === "string" ? b.email : null);
  if (!CORREO.test(email)) return json({ error: "correo_invalido" }, 400);
  intentos.delete(email);
  if (deps.prueba) return json({ ok: true, email });
  if (!deps.supabaseUrl || !deps.serviceKey) return json({ error: "auth_no_disponible" }, 503);
  try {
    const a = api(deps);
    const u = await a.buscar(email);
    if (!u) return json({ ok: true, email, sinCuenta: true }); // entrará con la inicial y se le preparará
    // Aleatoria: la anterior deja de servir; con contrasena_propia=false, /auth/preparar acepta otra vez la inicial.
    await a.actualizar(u.id, derivar(crypto.randomUUID()), false);
    return json({ ok: true, email });
  } catch (e) {
    console.error("auth restablecer:", e instanceof Error ? e.message : e);
    return json({ error: "auth_no_disponible" }, 503);
  }
}

// POST /auth/olvide { email } → 200 { enviado } | 404 no_es_de_clase | 429 demasiados_intentos | 429 limite_correo.
// Entra con el enlace y la página pide una contraseña nueva. Los invitados de Juegos no lo necesitan (correo y nick).
export async function handleOlvide(req: Request, deps: DepsContrasena, json: Json): Promise<Response> {
  if (req.method !== "POST") return json({ error: "metodo_no_permitido" }, 405);
  const b = await cuerpo<{ email?: unknown }>(req);
  if (!b) return json({ error: "json_invalido" }, 400);
  const email = normalizeEmail(typeof b.email === "string" ? b.email : null);
  if (!CORREO.test(email)) return json({ error: "correo_invalido" }, 400);
  const esProfe = !!deps.admin && email === deps.admin;
  if (!esProfe && !(await deps.esDeClase(email))) return json({ error: "no_es_de_clase" }, 404);
  const ahora = deps.ahora ? deps.ahora() : Date.now();
  const previos = (olvidos.get(email) || []).filter((t) => ahora - t < 60 * 60_000);
  if (previos.length >= 3) return json({ error: "demasiados_intentos" }, 429);
  olvidos.set(email, [...previos, ahora]);
  if (deps.prueba) return json({ enviado: true });
  if (!deps.supabaseUrl || !deps.serviceKey) return json({ error: "auth_no_disponible" }, 503);
  try {
    const base = deps.supabaseUrl.replace(/\/$/, "");
    const destino = deps.redirect ? `?redirect_to=${encodeURIComponent(deps.redirect)}` : "";
    const res = await (deps.fetch ?? fetch)(`${base}/auth/v1/otp${destino}`, {
      method: "POST", signal: AbortSignal.timeout(8000),
      headers: { "apikey": deps.serviceKey, "Authorization": `Bearer ${deps.serviceKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ email, create_user: true }),
    });
    await res.body?.cancel();
    if (res.status === 429) return json({ error: "limite_correo" }, 429);
    if (!res.ok) throw new Error(`auth otp ${res.status}`);
    return json({ enviado: true });
  } catch (e) {
    console.error("auth olvide:", e instanceof Error ? e.message : e);
    return json({ error: "auth_no_disponible" }, 503);
  }
}
