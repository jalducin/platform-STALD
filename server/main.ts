// Backend de platform-STALD para Deno Deploy (sin Supabase).
// Variables: NOTION_TOKEN, SUPER_ADMIN_EMAIL, GITHUB_TOKEN, DATA_REPO (p. ej. jalducin/platform-STALD-data).
// Pruebas locales: DATA_DIR (carpeta con una copia del repo de datos) y ROWS_FIXTURE (filas simuladas; también activa
// el verificador falso de sesión `Bearer prueba:<correo>`, openspec: plataforma-login).
// Sesión: SUPABASE_URL + SUPABASE_PUBLISHABLE_KEY (validar tokens), SUPABASE_SERVICE_KEY (enlace de acceso del admin),
// opcionales LOGIN_TRANSICION_HASTA (AAAA-MM-DD) y SITIO_URL (a dónde llevan los enlaces).
import { attachUsers, extractSecundariaRow, filterForEmail, type InglesRow, normalizeEmail, type SecundariaRow, type UserInfo } from "./rows.ts";
import { handleActividades, handleProfe, handleSecundaria } from "./actividades.ts";
import { armarPerfil } from "./perfil.ts";
import { handleJuegos, type Invitados } from "./juegos.ts";
import { aplicarAlumnos, handleAlumnos, inicioDe, leerRegistro } from "./alumnos.ts";
import { revisarSalud } from "./salud.ts";
import { GitHubStore, MemoryStore, type Store } from "./store.ts";
import { createDb, PgStore, PREFIJO_JUEGOS, PREFIJOS_INGLES, v as pgv } from "./db.ts";
import { ahoraIso, mxToday, slugAlumno } from "./motor.ts";
import { grupoDe, grupoInfo, handleGrupos } from "./grupos.ts";
import { configPublica, generarEnlace, handleEnlace, listarCuentas, LOGIN_TRANSICION_HASTA, quienEs } from "./auth.ts";
import { handleRegistroJuegos } from "./registro.ts";
import type { Cuenta } from "./jugadores.ts";
import { handleResumen } from "./resumen.ts";

const NOTION_VERSION = "2022-06-28";
const SECUNDARIA_DB_ID = "3831c6b4f8b5817ba701ed689f825cf0"; // 📖 Clases
const env = (k: string) => Deno.env.get(k) || "";

// Supabase Realtime para salas (openspec: salas-realtime). Sin las tres variables, las salas usan sondeo.
const realtime = env("SUPABASE_URL") && env("SUPABASE_PUBLISHABLE_KEY") && env("SUPABASE_SERVICE_KEY")
  ? { url: env("SUPABASE_URL").replace(/\/$/, ""), publica: env("SUPABASE_PUBLISHABLE_KEY"), servicio: env("SUPABASE_SERVICE_KEY") }
  : undefined;

// ---------- Notion ----------
// deno-lint-ignore no-explicit-any
async function queryDatabase(dbId: string): Promise<any[]> {
  // deno-lint-ignore no-explicit-any
  const pages: any[] = [];
  let cursor: string | undefined = undefined;
  do {
    const body: Record<string, unknown> = { page_size: 100 };
    if (cursor) body.start_cursor = cursor;
    const res = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${env("NOTION_TOKEN")}`, "Notion-Version": NOTION_VERSION, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`notion_${res.status}`);
    const j = await res.json();
    pages.push(...j.results);
    cursor = j.has_more ? j.next_cursor : undefined;
  } while (cursor);
  return pages;
}

async function resolveUser(userId: string): Promise<UserInfo> {
  try {
    const res = await fetch(`https://api.notion.com/v1/users/${userId}`, {
      headers: { "Authorization": `Bearer ${env("NOTION_TOKEN")}`, "Notion-Version": NOTION_VERSION },
    });
    if (!res.ok) return { email: null, name: null };
    const u = await res.json();
    return { email: u?.person?.email ? normalizeEmail(String(u.person.email)) : null, name: u?.name ? String(u.name) : null };
  } catch {
    return { email: null, name: null };
  }
}

async function loadRows<T extends { userIds: string[]; userEmails: string[]; userNames: string[] }>(
  dbId: string,
  // deno-lint-ignore no-explicit-any
  extract: (page: any) => T,
  fixtureKey: "secundaria",
): Promise<T[]> {
  if (env("ROWS_FIXTURE")) return JSON.parse(await Deno.readTextFile(env("ROWS_FIXTURE")))[fixtureKey] as T[];
  const rows = (await queryDatabase(dbId)).map(extract);
  const ids = Array.from(new Set(rows.flatMap((r) => r.userIds)));
  const infos = await Promise.all(ids.map(resolveUser));
  return attachUsers(rows, new Map(ids.map((id, i) => [id, infos[i]])));
}

// Cuentas de acceso para la vista de jugadores del admin (openspec: jugadores-admin): Supabase Auth con la llave de
// servicio, 60 s en memoria; en pruebas, la clave `cuentas` de ROWS_FIXTURE.
let cacheCuentas: { t: number; v: Cuenta[] } | null = null;
async function cuentas(): Promise<Cuenta[]> {
  if (env("ROWS_FIXTURE")) return (JSON.parse(await Deno.readTextFile(env("ROWS_FIXTURE"))).cuentas ?? []) as Cuenta[];
  if (!env("SUPABASE_URL") || !env("SUPABASE_SERVICE_KEY")) return [];
  if (cacheCuentas && Date.now() - cacheCuentas.t < 60_000) return cacheCuentas.v;
  const v = await listarCuentas({ supabaseUrl: env("SUPABASE_URL"), serviceKey: env("SUPABASE_SERVICE_KEY") });
  cacheCuentas = { t: Date.now(), v };
  return v;
}

// Filas de Inglés: solo los alumnos y alumnas del registro (alumnos.json). Inglés ya no lee Notion
// (openspec: cierre-tecnico, fase 2); Secundaria sí.
async function filasIngles(): Promise<InglesRow[]> {
  return aplicarAlumnos([], await leerRegistro(await getStore()));
}

// ---------- HTTP ----------
function corsHeaders(extra: Record<string, string> = {}): Headers {
  const h = new Headers();
  h.set("Access-Control-Allow-Origin", "*");
  h.set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  h.set("Access-Control-Allow-Headers", "content-type, authorization"); // authorization: sesión (plataforma-login)
  h.set("Access-Control-Max-Age", "86400"); // el navegador recuerda la verificación previa un día (openspec: ahorro-peticiones)
  h.set("Cache-Control", "no-store, no-cache, must-revalidate");
  for (const [k, v] of Object.entries(extra)) h.set(k, v);
  return h;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders({ "Content-Type": "application/json" }) });
}

let storePromise: Promise<Store> | null = null;
function baseStore(): Promise<Store> {
  if (!storePromise) {
    storePromise = env("DATA_DIR")
      ? MemoryStore.fromDir(env("DATA_DIR"))
      : Promise.resolve(new GitHubStore(env("DATA_REPO"), env("GITHUB_TOKEN")));
  }
  return storePromise;
}

// Postgres de Inglés (openspec: ingles-grupos): se usa cuando hay llaves y la migración dejó la marca meta/migrado.
// STALD_TABLAS elige el prefijo (las pruebas E2E usan stald_test_). Sin marca, todo sigue en GitHub como antes.
const db = env("SUPABASE_URL") && env("SUPABASE_SERVICE_KEY")
  ? createDb({ url: env("SUPABASE_URL"), key: env("SUPABASE_SERVICE_KEY"), prefijo: env("STALD_TABLAS") || "stald_" })
  : null;
// Marcas de migración (se revisan cada 60 s): meta/migrado → Inglés; meta/migrado-juegos → juegos/
// (openspec: ingles-grupos, cierre-tecnico). Si no se pueden leer, se conserva lo último conocido.
let marcas: { t: number; ingles: boolean; juegos: boolean } | null = null;
async function leerMarcas(): Promise<{ ingles: boolean; juegos: boolean }> {
  if (!db) return { ingles: false, juegos: false };
  if (marcas && Date.now() - marcas.t < 60_000) return marcas;
  try {
    const filas = await db.select<{ path: string }>("docs", `path=like.${pgv("meta/migrado*")}&select=path`);
    marcas = { t: Date.now(), ingles: filas.some((f) => f.path === "meta/migrado"), juegos: filas.some((f) => f.path === "meta/migrado-juegos") };
  } catch (e) {
    console.error("marcas de migración:", e instanceof Error ? e.message : e);
    marcas = { t: Date.now(), ingles: marcas?.ingles ?? false, juegos: marcas?.juegos ?? false };
  }
  return marcas;
}
const inglesEnPg = async () => (await leerMarcas()).ingles;
let pgStore: { clave: string; store: PgStore } | null = null;
async function getStore(): Promise<Store> {
  const base = await baseStore();
  const m = await leerMarcas();
  const prefijos = [...(m.ingles ? PREFIJOS_INGLES : []), ...(m.juegos ? [PREFIJO_JUEGOS] : [])];
  if (!prefijos.length) return base;
  const clave = prefijos.join(",");
  if (!pgStore || pgStore.clave !== clave) pgStore = { clave, store: new PgStore(db!, base, prefijos) };
  return pgStore.store;
}

export async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders() });
  const admin = normalizeEmail(env("SUPER_ADMIN_EMAIL"));

  // GET /config → configuración pública para comun/auth.js (sin sesión; openspec: plataforma-login).
  if (url.pathname.endsWith("/config")) {
    const c = configPublica({ ROWS_FIXTURE: env("ROWS_FIXTURE"), SUPABASE_URL: env("SUPABASE_URL"), SUPABASE_PUBLISHABLE_KEY: env("SUPABASE_PUBLISHABLE_KEY") });
    return json(c.body, c.status);
  }

  // Rutas sin identidad: /salud y la foto de avatar (la pide un <img>, sin encabezados).
  // /juegos/registro crea la cuenta de Juegos sin sesión previa (openspec: registro-directo-juegos).
  const sinIdentidad = url.pathname.endsWith("/salud") || url.pathname.endsWith("/juegos/registro") || /\/juegos\/foto\/[^/]+$/.test(url.pathname);
  // Quién hace la petición: correo verificado por la sesión o, en la transición, `?email=` (nunca el admin).
  const quien = sinIdentidad ? { ok: true as const, email: "", verificado: false } : await quienEs(req, {
    supabaseUrl: env("SUPABASE_URL"),
    publishableKey: env("SUPABASE_PUBLISHABLE_KEY"),
    admin,
    transicionHasta: env("LOGIN_TRANSICION_HASTA") || LOGIN_TRANSICION_HASTA,
    hoy: () => mxToday(),
    prueba: !!env("ROWS_FIXTURE"),
  });
  if (!quien.ok) return json({ error: quien.error }, quien.status);
  const email = quien.email;

  try {
    // POST /juegos/registro → cuenta de Juegos con correo y apodo, sin validar el correo (openspec: registro-directo-juegos).
    if (url.pathname.endsWith("/juegos/registro")) {
      const sitio = (env("SITIO_URL") || "https://jalducin.github.io/platform-STALD/").replace(/\/?$/, "/");
      return await handleRegistroJuegos(req, {
        store: await getStore(), admin, filasIngles, filasSecundaria: () => loadRows(SECUNDARIA_DB_ID, extractSecundariaRow, "secundaria"),
        ahora: ahoraIso,
        sesion: async (correo) => {
          if (env("ROWS_FIXTURE")) return { prueba: true as const };
          const r = await generarEnlace({ supabaseUrl: env("SUPABASE_URL"), serviceKey: env("SUPABASE_SERVICE_KEY") }, correo, sitio + "juegos.html");
          if (!r.tokenHash) throw new Error("sin hashed_token");
          return { token_hash: r.tokenHash };
        },
      }, json);
    }

    // POST /auth/enlace → enlace de acceso para mandar por WhatsApp (solo admin con sesión).
    if (url.pathname.endsWith("/auth/enlace")) {
      return await handleEnlace(req, quien, { admin, supabaseUrl: env("SUPABASE_URL"), serviceKey: env("SUPABASE_SERVICE_KEY"), redirect: env("SITIO_URL") || "https://jalducin.github.io/platform-STALD/" }, json);
    }

    // GET /salud → límite de GitHub y repo de datos, sin correo ni datos privados (openspec: vigilancia-servidor).
    if (url.pathname.endsWith("/salud")) {
      const salud = env("DATA_DIR")
        ? { ok: true, estado: "ok", github: null, revisado: new Date().toISOString() }
        : await revisarSalud({ token: env("GITHUB_TOKEN"), store: await getStore() });
      return json(salud, salud.ok ? 200 : 503);
    }

    // /ingles/alumnos[/quitar] → alta de alumnos y alumnas (solo admin, server/alumnos.ts)
    const iAl = url.pathname.indexOf("/ingles/alumnos");
    if (iAl !== -1) {
      const conGrupos = await inglesEnPg();
      const inscribir = conGrupos ? async (nombre: string, grupo: string, desde: string) => {
        const r = await handleGrupos(new Request("http://x", { method: "POST", body: JSON.stringify({ alumno: nombre, grupo }) }), "/mover", { email: admin, admin, db: db!, hoy: () => desde }, json);
        return r.ok;
      } : undefined;
      return await handleAlumnos(req, url.pathname.slice(iAl + "/ingles/alumnos".length), { email, admin, store: await getStore(), filas: () => Promise.resolve([]), inscribir, ahora: ahoraIso }, json);
    }

    // /ingles/grupos[/mover] → grupos de clase (solo admin, server/grupos.ts; requiere la base migrada)
    const iGr = url.pathname.indexOf("/ingles/grupos");
    if (iGr !== -1) {
      if (!await inglesEnPg()) return json({ error: "sin_base" }, 503);
      return await handleGrupos(req, url.pathname.slice(iGr + "/ingles/grupos".length), { email, admin, db: db!, hoy: () => mxToday() }, json);
    }

    // GET /ingles/resumen?grupo=<id> → tablero del profe: indicadores y mapa de calor (solo admin, server/resumen.ts,
    // openspec: ingles-pro). La racha del alumno o alumna va dentro de /ingles/actividades (sin ruta aparte).
    if (url.pathname.endsWith("/ingles/resumen")) {
      const store = await getStore();
      const conGrupos = await inglesEnPg();
      return await handleResumen(req, {
        email, admin, store,
        alumnos: async () => {
          const registro = await leerRegistro(store);
          const nombres = [...new Set((await filasIngles()).map((r) => r.alumno).filter((n): n is string => !!n))];
          return nombres.map((nombre) => ({ nombre, ...(inicioDe(registro, nombre) ? { inicio: inicioDe(registro, nombre) } : {}) }));
        },
        ...(conGrupos ? { grupoDe: (slug: string) => grupoDe(db!, slug, mxToday()), grupoInfo: (id: string) => grupoInfo(db!, id) } : {}),
      }, json);
    }

    // /ingles/profe/actividades[/<id>] → ruta de estudio del profe (solo admin, server/actividades.ts)
    const iProfe = url.pathname.indexOf("/ingles/profe/actividades");
    if (iProfe !== -1) {
      return await handleProfe(req, url.pathname.slice(iProfe + "/ingles/profe/actividades".length), email, admin, await getStore(), json);
    }

    // /secundaria/actividades[/<id>] → exámenes de Secundaria (openspec: examen-secundaria)
    const iSec = url.pathname.indexOf("/secundaria/actividades");
    if (iSec !== -1) {
      return await handleSecundaria(req, url.pathname.slice(iSec + "/secundaria/actividades".length), email, admin, await getStore(),
        () => loadRows(SECUNDARIA_DB_ID, extractSecundariaRow, "secundaria"), json);
    }

    const idx = url.pathname.indexOf("/ingles/actividades");
    if (idx !== -1) {
      if (!email) return json({ error: "missing_email" }, 400);
      const all = await filasIngles();
      const { rows, isAdmin } = filterForEmail(all, email, admin);
      const alumno = isAdmin ? null : (rows.find((r) => r.alumno)?.alumno ?? null);
      const store = await getStore();
      const inicio = inicioDe(await leerRegistro(store), alumno);
      // Grupo vigente (openspec: ingles-grupos): filtra el calendario y da horario y Meet a la página.
      const grupo = alumno && await inglesEnPg() ? await grupoDe(db!, slugAlumno(alumno), mxToday()) : null;
      const info = grupo ? await grupoInfo(db!, grupo) : null;
      const quien = { isAdmin, alumno, ...(inicio ? { inicio } : {}), ...(grupo ? { grupo, grupoInfo: info && { id: info.id, nombre: info.nombre, nivel: info.nivel, horario: info.horario, meet_url: info.meet_url, color: info.color } } : {}) };
      return await handleActividades(req, url.pathname.slice(idx + "/ingles/actividades".length), quien, store, json);
    }

    // GET /perfil → accesos del portal (sin filas ni correos ajenos).
    if (url.pathname.endsWith("/perfil")) {
      if (!email) return json({ error: "missing_email" }, 400);
      const store = await getStore();
      const [ingles, secundaria, inv] = await Promise.all([filasIngles(), loadRows(SECUNDARIA_DB_ID, extractSecundariaRow, "secundaria"), store.get<Invitados>("juegos/invitados.json")]);
      return json(armarPerfil(email, admin, ingles, secundaria, inv?.data ?? {}));
    }

    // /juegos/… → partidas, ranking e invitados (server/juegos.ts)
    const iJuegos = url.pathname.indexOf("/juegos/");
    if (iJuegos !== -1) {
      return await handleJuegos(req, url.pathname.slice(iJuegos + "/juegos".length), email, {
        store: await getStore(), admin, filasIngles, filasSecundaria: () => loadRows(SECUNDARIA_DB_ID, extractSecundariaRow, "secundaria"), realtime, cuentas,
      }, json);
    }

    // GET /ingles/data → filas de identidad del registro (Inglés ya no trae tareas de Notion); GET /data → base
    // «📖 Clases» de Secundaria. "/ingles/data" también termina en "/data": evaluarlo primero.
    const deIngles = url.pathname.endsWith("/ingles/data");
    if (!deIngles && !url.pathname.endsWith("/data")) return json({ error: "not_found" }, 404);
    if (!email) return json({ error: "missing_email" }, 400);
    const all: (InglesRow | SecundariaRow)[] = deIngles ? await filasIngles() : await loadRows(SECUNDARIA_DB_ID, extractSecundariaRow, "secundaria");
    const { rows, isAdmin } = filterForEmail(all, email, admin);
    return json({ rows, isAdmin, generatedAt: new Date().toISOString() });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "desconocido";
    console.error("error:", msg);
    // Límite de la API de GitHub agotado y sin copia en memoria (openspec: github-etag-cache).
    if (msg === "github_rate_limit") return json({ error: "mucho_trafico" }, 503);
    return json({ error: "upstream_error" }, 500);
  }
}

if (import.meta.main) Deno.serve({ port: Number(env("PORT")) || 8000 }, handler);
