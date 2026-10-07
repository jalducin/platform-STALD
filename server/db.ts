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

// Rutas que viven en Postgres (documentos 1 a 1), según las marcas de migración (openspec: ingles-grupos,
// cierre-tecnico): Inglés con meta/migrado y Juegos con meta/migrado-juegos. El contenido sigue en el repo.
// borradores/: avance del intento abierto (openspec: borrador-en-servidor); ruta nueva, sin migración.
export const PREFIJOS_INGLES = ["alumnos.json", "resultados/", "avance/", "borradores/"];
export const PREFIJO_JUEGOS = "juegos/";
export const esRutaPg = (path: string, prefijos: string[] = PREFIJOS_INGLES) =>
  prefijos.some((p) => p.endsWith("/") ? path.startsWith(p) : path === p);

interface FilaDoc { path: string; data: unknown; version: number }

// Store sobre stald_docs: el sha es la versión (concurrencia optimista). Sin respaldo (openspec: cierre-tecnico):
// si Postgres falla, el error sube y la ruta responde 503 en lugar de mostrar una copia vieja de GitHub.
export class PgStore implements Store {
  constructor(private db: Db, private base: Store, private prefijos: string[] = PREFIJOS_INGLES) {}
  private enPg(path: string) { return esRutaPg(path, this.prefijos); }

  async get<T = unknown>(path: string): Promise<Doc<T> | null> {
    if (!this.enPg(path)) return await this.base.get<T>(path);
    const filas = await this.db.select<FilaDoc>("docs", `path=eq.${v(path)}&select=data,version`);
    return filas[0] ? { data: filas[0].data as T, sha: String(filas[0].version) } : null;
  }

  async put(path: string, data: unknown, sha: string | null, message: string): Promise<boolean> {
    if (!this.enPg(path)) return await this.base.put(path, data, sha, message);
    const ahora = new Date().toISOString();
    if (sha === null) return (await this.db.insert("docs", { path, data, version: 1, actualizado: ahora }, { ignorarDuplicados: true })).length === 1;
    const n = Number(sha);
    if (!Number.isInteger(n)) return false;
    return (await this.db.update("docs", `path=eq.${v(path)}&version=eq.${n}`, { data, version: n + 1, actualizado: ahora })).length === 1;
  }

  async list(dir: string): Promise<string[]> {
    const d = dir.replace(/\/+$/, "");
    if (!this.enPg(d + "/x")) return await this.base.list(dir);
    const filas = await this.db.select<{ path: string }>("docs", `path=like.${v(d + "/*")}&select=path`);
    return filas.map((f) => f.path).filter((p) => p.startsWith(d + "/") && !p.slice(d.length + 1).includes("/")).map((p) => p.slice(d.length + 1));
  }

  // Todos los documentos hijos directos de una carpeta en una sola consulta (tablero del profe, openspec: ingles-pro).
  async leerCarpeta<T = unknown>(dir: string): Promise<{ nombre: string; data: T }[]> {
    const d = dir.replace(/\/+$/, "");
    if (!this.enPg(d + "/x")) return await leerCarpetaGenerica<T>(this.base, d);
    const filas = await this.db.select<{ path: string; data: unknown }>("docs", `path=like.${v(d + "/*")}&select=path,data`);
    return filas.filter((f) => f.path.startsWith(d + "/") && !f.path.slice(d.length + 1).includes("/"))
      .map((f) => ({ nombre: f.path.slice(d.length + 1), data: f.data as T }));
  }

  async remove(path: string, message: string): Promise<void> {
    if (!this.enPg(path)) return await this.base.remove(path, message);
    await this.db.remove("docs", `path=eq.${v(path)}`);
  }
}

// Lectura de una carpeta con cualquier almacén: list + get de cada documento.
export async function leerCarpetaGenerica<T = unknown>(store: Store, dir: string): Promise<{ nombre: string; data: T }[]> {
  const nombres = await store.list(dir);
  const docs = await Promise.all(nombres.map((n) => store.get<T>(`${dir}/${n}`)));
  return nombres.map((nombre, i) => ({ nombre, data: docs[i]?.data as T })).filter((x) => x.data !== undefined);
}

// La carpeta con el camino rápido de PgStore cuando existe.
export async function leerCarpeta<T = unknown>(store: Store, dir: string): Promise<{ nombre: string; data: T }[]> {
  return store instanceof PgStore ? await store.leerCarpeta<T>(dir) : await leerCarpetaGenerica<T>(store, dir);
}
