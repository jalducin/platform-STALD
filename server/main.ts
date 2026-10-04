// Backend de platform-STALD para Deno Deploy (sin Supabase).
// Variables: NOTION_TOKEN, SUPER_ADMIN_EMAIL, GITHUB_TOKEN, DATA_REPO (p. ej. jalducin/platform-STALD-data).
// Pruebas locales: DATA_DIR (carpeta con una copia del repo de datos) y ROWS_FIXTURE (filas simuladas).
import { attachUsers, extractInglesRow, extractSecundariaRow, filterForEmail, type InglesRow, normalizeEmail, type UserInfo } from "./rows.ts";
import { handleActividades, handleProfe } from "./actividades.ts";
import { handleCompletar } from "./completar.ts";
import { armarPerfil } from "./perfil.ts";
import { handleJuegos, type Invitados } from "./juegos.ts";
import { aplicarAlumnos, handleAlumnos, leerRegistro } from "./alumnos.ts";
import { revisarSalud } from "./salud.ts";
import { GitHubStore, MemoryStore, type Store } from "./store.ts";

const NOTION_VERSION = "2022-06-28";
const SECUNDARIA_DB_ID = "3831c6b4f8b5817ba701ed689f825cf0"; // 📖 Clases
const CLASES_INGLES_DB_ID = "3c41c6b4f8b580f888d8d122cbb5c613"; // 📖 Clases Inglés
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
  fixtureKey: "ingles" | "secundaria",
): Promise<T[]> {
  if (env("ROWS_FIXTURE")) return JSON.parse(await Deno.readTextFile(env("ROWS_FIXTURE")))[fixtureKey] as T[];
  const rows = (await queryDatabase(dbId)).map(extract);
  const ids = Array.from(new Set(rows.flatMap((r) => r.userIds)));
  const infos = await Promise.all(ids.map(resolveUser));
  return attachUsers(rows, new Map(ids.map((id, i) => [id, infos[i]])));
}

// En modo fixture (pruebas locales) las marcas se guardan en memoria y se aplican al leer.
const marcasFixture = new Map<string, { completado: boolean; en: string }>();

// Filas de Inglés con los alumnos y alumnas dados de alta en la página (alumnos.json).
async function filasIngles(): Promise<InglesRow[]> {
  return aplicarAlumnos(await filasNotion(), await leerRegistro(await getStore()));
}

async function filasNotion(): Promise<InglesRow[]> {
  const rows = await loadRows<InglesRow>(CLASES_INGLES_DB_ID, extractInglesRow, "ingles");
  if (env("ROWS_FIXTURE")) {
    for (const r of rows) {
      const m = marcasFixture.get(r.id);
      if (m) { r.completado = m.completado; r.editadoEn = m.en; } // como Notion: marcar actualiza la última edición
    }
  }
  return rows;
}

async function parcheCompletado(id: string, completado: boolean): Promise<{ ok: boolean; status: number }> {
  if (env("ROWS_FIXTURE")) { marcasFixture.set(id, { completado, en: new Date().toISOString() }); return { ok: true, status: 200 }; }
  const res = await fetch(`https://api.notion.com/v1/pages/${id}`, {
    method: "PATCH",
    headers: { "Authorization": `Bearer ${env("NOTION_TOKEN")}`, "Notion-Version": NOTION_VERSION, "Content-Type": "application/json" },
    body: JSON.stringify({ properties: { "Completado": { checkbox: completado } } }),
  });
  await res.body?.cancel();
  return { ok: res.ok, status: res.status };
}

// ---------- HTTP ----------
function corsHeaders(extra: Record<string, string> = {}): Headers {
  const h = new Headers();
  h.set("Access-Control-Allow-Origin", "*");
  h.set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  h.set("Access-Control-Allow-Headers", "content-type");
  h.set("Access-Control-Max-Age", "86400"); // el navegador recuerda la verificación previa un día (openspec: ahorro-peticiones)
  h.set("Cache-Control", "no-store, no-cache, must-revalidate");
  for (const [k, v] of Object.entries(extra)) h.set(k, v);
  return h;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders({ "Content-Type": "application/json" }) });
}

let storePromise: Promise<Store> | null = null;
function getStore(): Promise<Store> {
  if (!storePromise) {
    storePromise = env("DATA_DIR")
      ? MemoryStore.fromDir(env("DATA_DIR"))
      : Promise.resolve(new GitHubStore(env("DATA_REPO"), env("GITHUB_TOKEN")));
  }
  return storePromise;
}

export async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders() });
  const email = normalizeEmail(url.searchParams.get("email"));
  const admin = normalizeEmail(env("SUPER_ADMIN_EMAIL"));

  try {
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
      return await handleAlumnos(req, url.pathname.slice(iAl + "/ingles/alumnos".length), { email, admin, store: await getStore(), filas: filasNotion }, json);
    }

    // /ingles/profe/actividades[/<id>] → ruta de estudio del profe (solo admin, server/actividades.ts)
    const iProfe = url.pathname.indexOf("/ingles/profe/actividades");
    if (iProfe !== -1) {
      return await handleProfe(req, url.pathname.slice(iProfe + "/ingles/profe/actividades".length), email, admin, await getStore(), json);
    }

    const idx = url.pathname.indexOf("/ingles/actividades");
    if (idx !== -1) {
      if (!email) return json({ error: "missing_email" }, 400);
      const all = await filasIngles();
      const { rows, isAdmin } = filterForEmail(all, email, admin);
      const alumno = isAdmin ? null : (rows.find((r) => r.alumno)?.alumno ?? null);
      return await handleActividades(req, url.pathname.slice(idx + "/ingles/actividades".length), { isAdmin, alumno }, await getStore(), json);
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
        store: await getStore(), admin, filasIngles, filasSecundaria: () => loadRows(SECUNDARIA_DB_ID, extractSecundariaRow, "secundaria"), realtime,
      }, json);
    }

    // POST /ingles/data/<pageId>/completado → marcar o desmarcar una tarea de Notion.
    const marca = url.pathname.match(/\/ingles\/data\/([0-9a-fA-F-]{32,36})\/completado$/);
    if (marca) {
      if (req.method !== "POST") return json({ error: "metodo_no_permitido" }, 405);
      return await handleCompletar(req, marca[1], email, { filas: filasIngles, parche: parcheCompletado, store: await getStore(), admin }, json);
    }

    // "/ingles/data" también termina en "/data": evaluarlo primero.
    const route = url.pathname.endsWith("/ingles/data")
      ? { db: CLASES_INGLES_DB_ID, extract: extractInglesRow, key: "ingles" as const }
      : url.pathname.endsWith("/data")
      ? { db: SECUNDARIA_DB_ID, extract: extractSecundariaRow, key: "secundaria" as const }
      : null;
    if (!route) return json({ error: "not_found" }, 404);
    if (!email) return json({ error: "missing_email" }, 400);
    // deno-lint-ignore no-explicit-any
    const all = route.key === "ingles" ? await filasIngles() : await loadRows(route.db, route.extract as (p: any) => any, route.key);
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
