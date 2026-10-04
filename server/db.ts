// Postgres de Supabase vía PostgREST (openspec: ingles-grupos). Solo el servidor lo usa, con la llave de servicio;
// las tablas tienen RLS sin políticas, así que la llave pública no lee nada.
import type { Doc, Store } from "./store.ts";

export interface ConfigDb {
  url: string; // https://<ref>.supabase.co
  key: string; // llave de servicio (service_role o secret)
  fetch?: typeof fetch; // inyectable en pruebas
  prefijo?: string; // prefijo de tablas: "stald_" (real) o "stald_test_" (pruebas E2E)
}

export interface Db {
  select<T = Record<string, unknown>>(tabla: string, query: string): Promise<T[]>;
  insert<T = Record<string, unknown>>(tabla: string, filas: unknown, opciones?: { ignorarDuplicados?: boolean }): Promise<T[]>;
  upsert<T = Record<string, unknown>>(tabla: string, filas: unknown, onConflict?: string): Promise<T[]>;
  update<T = Record<string, unknown>>(tabla: string, filtro: string, cambios: unknown): Promise<T[]>;
  remove<T = Record<string, unknown>>(tabla: string, filtro: string): Promise<T[]>;
}

export class DbError extends Error {
  constructor(public status: number, detalle: string) {
    super(`postgrest ${status}: ${detalle}`);
  }
}

// Valor seguro para un filtro de PostgREST (eq., like., …).
export const v = (x: string) => encodeURIComponent(x);

export function createDb(cfg: ConfigDb): Db {
  const f = cfg.fetch ?? fetch;
  const base = cfg.url.replace(/\/+$/, "") + "/rest/v1/";
  const prefijo = cfg.prefijo ?? "stald_";
  async function req<T>(metodo: string, tabla: string, query: string, body?: unknown, prefer?: string): Promise<T[]> {
    const res = await f(base + prefijo + tabla + (query ? "?" + query : ""), {
      method: metodo,
      headers: { apikey: cfg.key, Authorization: `Bearer ${cfg.key}`, "Content-Type": "application/json", ...(prefer ? { Prefer: prefer } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    });
    const txt = await res.text();
    if (!res.ok) throw new DbError(res.status, txt.slice(0, 200));
    return txt ? JSON.parse(txt) : [];
  }
  return {
    select: (t, q) => req("GET", t, q),
    insert: (t, filas, o) => req("POST", t, "", filas, (o?.ignorarDuplicados ? "resolution=ignore-duplicates," : "") + "return=representation"),
    upsert: (t, filas, onConflict) => req("POST", t, onConflict ? "on_conflict=" + onConflict : "", filas, "resolution=merge-duplicates,return=representation"),
    update: (t, filtro, cambios) => req("PATCH", t, filtro, cambios, "return=representation"),
    remove: (t, filtro) => req("DELETE", t, filtro, undefined, "return=representation"),
  };
}

// Rutas de Inglés que viven en Postgres (documentos 1 a 1); el resto (contenido, juegos) sigue en el almacén base.
export const esRutaPg = (path: string) => path === "alumnos.json" || path.startsWith("resultados/") || path.startsWith("avance/");

interface FilaDoc { path: string; data: unknown; version: number }

// Store sobre stald_docs: el sha es la versión (concurrencia optimista). Si Postgres falla al leer, usa el almacén
// base como respaldo (transición) y marca el sha con "gh:" para que esa copia no se pueda escribir.
export class PgStore implements Store {
  constructor(private db: Db, private base: Store) {}

  async get<T = unknown>(path: string): Promise<Doc<T> | null> {
    if (!esRutaPg(path)) return await this.base.get<T>(path);
    try {
      const filas = await this.db.select<FilaDoc>("docs", `path=eq.${v(path)}&select=data,version`);
      return filas[0] ? { data: filas[0].data as T, sha: String(filas[0].version) } : null;
    } catch (e) {
      console.error("PgStore.get, respaldo:", e instanceof Error ? e.message : e);
      const d = await this.base.get<T>(path);
      return d ? { data: d.data, sha: "gh:" + (d.sha ?? "") } : null;
    }
  }

  async put(path: string, data: unknown, sha: string | null, message: string): Promise<boolean> {
    if (!esRutaPg(path)) return await this.base.put(path, data, sha, message);
    if (sha?.startsWith("gh:")) return false; // copia de respaldo: no se escribe sobre ella
    const ahora = new Date().toISOString();
    if (sha === null) return (await this.db.insert("docs", { path, data, version: 1, actualizado: ahora }, { ignorarDuplicados: true })).length === 1;
    const n = Number(sha);
    if (!Number.isInteger(n)) return false;
    return (await this.db.update("docs", `path=eq.${v(path)}&version=eq.${n}`, { data, version: n + 1, actualizado: ahora })).length === 1;
  }

  async list(dir: string): Promise<string[]> {
    const d = dir.replace(/\/+$/, "");
    if (!esRutaPg(d + "/x")) return await this.base.list(dir);
    const filas = await this.db.select<{ path: string }>("docs", `path=like.${v(d + "/*")}&select=path`);
    return filas.map((f) => f.path).filter((p) => p.startsWith(d + "/") && !p.slice(d.length + 1).includes("/")).map((p) => p.slice(d.length + 1));
  }

  async remove(path: string, message: string): Promise<void> {
    if (!esRutaPg(path)) return await this.base.remove(path, message);
    await this.db.remove("docs", `path=eq.${v(path)}`);
  }
}
