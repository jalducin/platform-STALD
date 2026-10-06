// POST /juegos/registro { email, nombre, acepto } → cuenta de Juegos sin validar el correo (openspec:
// registro-directo-juegos). Sin sesión previa. Los correos de las clases (alumnos, alumnas, admin) siguen entrando con
// su enlace (409 correo_de_clase) porque esas cuentas ven calificaciones. El resto queda como invitado y recibe una
// llave de sesión de un solo uso (`token_hash`), que la página canjea con verifyOtp; en pruebas, `{ prueba: true }`.
import { normalizeEmail } from "./rows.ts";
import { APODO, CORREO, type DepsJuegos, registrarInvitado, resolverJugador } from "./juegos.ts";

export interface DepsRegistro extends Pick<DepsJuegos, "store" | "admin" | "filasIngles" | "filasSecundaria" | "ahora"> {
  sesion(email: string): Promise<{ token_hash: string } | { prueba: true }>;
}

type Json = (b: unknown, s?: number) => Response;

export async function handleRegistroJuegos(req: Request, deps: DepsRegistro, json: Json): Promise<Response> {
  if (req.method !== "POST") return json({ error: "metodo_no_permitido" }, 405);
  let body: { email?: unknown; nombre?: unknown; acepto?: unknown } = {};
  try { body = await req.json() ?? {}; } catch { return json({ error: "json_invalido" }, 400); }
  const email = normalizeEmail(typeof body.email === "string" ? body.email : null);
  if (!CORREO.test(email)) return json({ error: "correo_invalido" }, 400);
  const nombre = typeof body.nombre === "string" ? body.nombre.trim().replace(/\s+/g, " ") : "";
  if (!APODO.test(nombre)) return json({ error: "apodo_invalido" }, 400);
  if (body.acepto !== true) return json({ error: "debe_aceptar" }, 400);
  const [ingles, secundaria] = await Promise.all([deps.filasIngles(), deps.filasSecundaria()]);
  if (await resolverJugador(email, deps.admin, ingles, secundaria, {})) return json({ error: "correo_de_clase" }, 409);
  const ahora = deps.ahora ? deps.ahora() : new Date().toISOString();
  const r = await registrarInvitado(deps.store, email, nombre, ahora);
  if ("error" in r) return json({ error: r.error }, r.status);
  const jugador = await resolverJugador(email, deps.admin, ingles, secundaria, r.invitados);
  try {
    return json({ ...(await deps.sesion(email)), jugador });
  } catch (e) {
    console.error("registro juegos:", e instanceof Error ? e.message : e);
    return json({ error: "auth_no_disponible" }, 503);
  }
}
