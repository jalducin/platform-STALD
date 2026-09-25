import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  attachUsers,
  extractInglesRow,
  extractSecundariaRow,
  filterForEmail,
  normalizeEmail,
  type UserInfo,
} from "./rows.ts";

const NOTION_TOKEN = Deno.env.get("NOTION_TOKEN");
const SUPER_ADMIN_EMAIL = normalizeEmail(Deno.env.get("SUPER_ADMIN_EMAIL"));
const NOTION_VERSION = "2022-06-28";
const SECUNDARIA_DB_ID = "3831c6b4f8b5817ba701ed689f825cf0"; // 📖 Clases
const CLASES_INGLES_DB_ID = "3c41c6b4f8b580f888d8d122cbb5c613"; // 📖 Clases Inglés

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
      headers: {
        "Authorization": `Bearer ${NOTION_TOKEN}`,
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) throw new Error(`notion_${res.status}`);

    const json = await res.json();
    pages.push(...json.results);
    cursor = json.has_more ? json.next_cursor : undefined;
  } while (cursor);

  return pages;
}

async function resolveUser(userId: string): Promise<UserInfo> {
  try {
    const res = await fetch(`https://api.notion.com/v1/users/${userId}`, {
      headers: { "Authorization": `Bearer ${NOTION_TOKEN}`, "Notion-Version": NOTION_VERSION },
    });
    if (!res.ok) return { email: null, name: null };
    const user = await res.json();
    return {
      email: user?.person?.email ? normalizeEmail(String(user.person.email)) : null,
      name: user?.name ? String(user.name) : null,
    };
  } catch {
    return { email: null, name: null };
  }
}

// Resuelve los usuarios de todas las filas (una llamada por usuario distinto).
async function resolveUsers(rows: { userIds: string[] }[]): Promise<Map<string, UserInfo>> {
  const ids = Array.from(new Set(rows.flatMap((r) => r.userIds)));
  const infos = await Promise.all(ids.map(resolveUser));
  return new Map(ids.map((id, i) => [id, infos[i]]));
}

async function loadRows<T extends { userIds: string[]; userEmails: string[]; userNames: string[] }>(
  dbId: string,
  // deno-lint-ignore no-explicit-any
  extract: (page: any) => T,
): Promise<T[]> {
  const rows = (await queryDatabase(dbId)).map(extract);
  return attachUsers(rows, await resolveUsers(rows));
}

function corsHeaders(extra: Record<string, string> = {}): Headers {
  const h = new Headers();
  h.set("Access-Control-Allow-Origin", "*");
  h.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  h.set("Cache-Control", "no-store, no-cache, must-revalidate");
  for (const [k, v] of Object.entries(extra)) h.set(k, v);
  return h;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders({ "Content-Type": "application/json" }),
  });
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders() });
  }

  // "/ingles/data" también termina en "/data": evaluarlo primero.
  const route = url.pathname.endsWith("/ingles/data")
    ? { dbId: CLASES_INGLES_DB_ID, extract: extractInglesRow }
    : url.pathname.endsWith("/data")
    ? { dbId: SECUNDARIA_DB_ID, extract: extractSecundariaRow }
    : null;

  if (!route) return json({ error: "not_found" }, 404);

  const email = normalizeEmail(url.searchParams.get("email"));
  if (!email) return json({ error: "missing_email" }, 400);

  try {
    // deno-lint-ignore no-explicit-any
    const allRows = await loadRows(route.dbId, route.extract as (page: any) => any);
    const { rows, isAdmin } = filterForEmail(allRows, email, SUPER_ADMIN_EMAIL);
    return json({ rows, isAdmin, generatedAt: new Date().toISOString() });
  } catch (e) {
    console.error("error cargando Notion:", e instanceof Error ? e.message : "desconocido");
    return json({ error: "upstream_error" }, 500);
  }
});
