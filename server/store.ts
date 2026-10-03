// Almacén JSON: repo privado de GitHub (producción) o memoria (pruebas locales).
import { decodeBase64, encodeBase64 } from "jsr:@std/encoding@1/base64";

export interface Doc<T = unknown> {
  data: T;
  sha: string | null;
}

export interface Store {
  get<T = unknown>(path: string): Promise<Doc<T> | null>;
  // Escribe con el sha leído; devuelve false si hubo conflicto (otro escribió antes).
  put(path: string, data: unknown, sha: string | null, message: string): Promise<boolean>;
  list(dir: string): Promise<string[]>;
  remove(path: string, message: string): Promise<void>;
}

// Peticiones condicionales (openspec: github-etag-cache): cada lectura guarda su ETag y manda If-None-Match.
// Un 304 (sin cambios) no cuenta contra el límite de la API de GitHub y usa la copia en memoria. Si el límite se
// agota, se sirve la última copia conocida; sin copia, se lanza github_rate_limit (el servidor responde 503).
export class GitHubStore implements Store {
  private cache = new Map<string, { etag: string; valor: unknown }>();
  private maxCache: number;

  constructor(private repo: string, private token: string, private branch = "main", opciones: { maxCache?: number } = {}) {
    this.maxCache = opciones.maxCache ?? 3000;
  }

  private url(path: string) {
    return `https://api.github.com/repos/${this.repo}/contents/${path.split("/").map(encodeURIComponent).join("/")}`;
  }

  private headers(): Record<string, string> {
    return {
      "Authorization": `Bearer ${this.token}`,
      "Accept": "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "platform-STALD",
    };
  }

  private guardar(clave: string, etag: string | null, valor: unknown) {
    if (!etag) return;
    this.cache.delete(clave); // reinsertar al final (LRU simple)
    this.cache.set(clave, { etag, valor });
    while (this.cache.size > this.maxCache) this.cache.delete(this.cache.keys().next().value!);
  }

  private invalidar(path: string) {
    this.cache.delete(`get:${path}`);
    this.cache.delete(`list:${path.split("/").slice(0, -1).join("/")}`);
  }

  private static async esLimite(res: Response): Promise<boolean> {
    if (res.status !== 403 && res.status !== 429) return false;
    if (res.headers.get("x-ratelimit-remaining") === "0" || res.headers.has("retry-after")) return true;
    try { return /rate limit/i.test(await res.clone().text()); } catch { return false; }
  }

  // GET condicional: 304 → copia; límite → copia o github_rate_limit.
  private async leer<V>(clave: string, url: string, convertir: (j: unknown) => V, vacio: V, error: string): Promise<V> {
    const previo = this.cache.get(clave);
    const res = await fetch(url, { headers: { ...this.headers(), ...(previo ? { "If-None-Match": previo.etag } : {}) } });
    if (res.status === 304 && previo) {
      this.cache.delete(clave); this.cache.set(clave, previo);
      return previo.valor as V;
    }
    if (res.status === 404) { this.cache.delete(clave); await res.body?.cancel(); return vacio; }
    if (await GitHubStore.esLimite(res)) {
      await res.body?.cancel();
      if (previo) return previo.valor as V;
      throw new Error("github_rate_limit");
    }
    if (!res.ok) { await res.body?.cancel(); throw new Error(`${error}_${res.status}`); }
    const valor = convertir(await res.json());
    this.guardar(clave, res.headers.get("etag"), valor);
    return valor;
  }

  async get<T>(path: string): Promise<Doc<T> | null> {
    return await this.leer<Doc<T> | null>(`get:${path}`, `${this.url(path)}?ref=${this.branch}`, (j) => {
      // deno-lint-ignore no-explicit-any
      const x = j as any;
      const text = new TextDecoder().decode(decodeBase64(String(x.content).replace(/\n/g, "")));
      return { data: JSON.parse(text) as T, sha: x.sha };
    }, null, "github_get");
  }

  async put(path: string, data: unknown, sha: string | null, message: string): Promise<boolean> {
    const body: Record<string, unknown> = {
      message,
      branch: this.branch,
      content: encodeBase64(new TextEncoder().encode(JSON.stringify(data, null, 2) + "\n")),
    };
    if (sha) body.sha = sha;
    const res = await fetch(this.url(path), { method: "PUT", headers: { ...this.headers(), "Content-Type": "application/json" }, body: JSON.stringify(body) });
    this.invalidar(path); // escrito o en conflicto: la próxima lectura va fresca
    if (res.status === 409 || res.status === 422) { await res.body?.cancel(); return false; }
    if (await GitHubStore.esLimite(res)) { await res.body?.cancel(); throw new Error("github_rate_limit"); }
    if (!res.ok) { await res.body?.cancel(); throw new Error(`github_put_${res.status}`); }
    await res.body?.cancel();
    return true;
  }

  async list(dir: string): Promise<string[]> {
    return await this.leer<string[]>(`list:${dir}`, `${this.url(dir)}?ref=${this.branch}`, (j) =>
      // deno-lint-ignore no-explicit-any
      Array.isArray(j) ? j.filter((f: any) => f.type === "file").map((f: any) => f.name as string) : [], [], "github_list");
  }

  async remove(path: string, message: string): Promise<void> {
    const doc = await this.get(path);
    if (!doc) return;
    const res = await fetch(this.url(path), {
      method: "DELETE",
      headers: { ...this.headers(), "Content-Type": "application/json" },
      body: JSON.stringify({ message, sha: doc.sha, branch: this.branch }),
    });
    this.invalidar(path);
    if (await GitHubStore.esLimite(res)) { await res.body?.cancel(); throw new Error("github_rate_limit"); }
    await res.body?.cancel();
    if (!res.ok && res.status !== 404) throw new Error(`github_delete_${res.status}`);
  }
}

// Almacén en memoria para pruebas; se puede sembrar desde una carpeta local (copia del repo de datos).
export class MemoryStore implements Store {
  files = new Map<string, { data: unknown; sha: string }>();
  private n = 0;

  static async fromDir(root: string): Promise<MemoryStore> {
    const s = new MemoryStore();
    const walk = async (dir: string, rel: string) => {
      for await (const e of Deno.readDir(dir)) {
        if (e.name.startsWith(".")) continue;
        const p = `${dir}/${e.name}`, r = rel ? `${rel}/${e.name}` : e.name;
        if (e.isDirectory) await walk(p, r);
        else if (e.name.endsWith(".json")) s.files.set(r, { data: JSON.parse(await Deno.readTextFile(p)), sha: `s${s.n++}` });
      }
    };
    await walk(root, "");
    return s;
  }

  get<T>(path: string): Promise<Doc<T> | null> {
    const f = this.files.get(path);
    return Promise.resolve(f ? { data: structuredClone(f.data) as T, sha: f.sha } : null);
  }

  put(path: string, data: unknown, sha: string | null): Promise<boolean> {
    const f = this.files.get(path);
    if ((f && f.sha !== sha) || (!f && sha)) return Promise.resolve(false);
    this.files.set(path, { data: structuredClone(data), sha: `s${this.n++}` });
    return Promise.resolve(true);
  }

  list(dir: string): Promise<string[]> {
    const pre = dir.endsWith("/") ? dir : dir + "/";
    return Promise.resolve([...this.files.keys()].filter((k) => k.startsWith(pre) && !k.slice(pre.length).includes("/")).map((k) => k.slice(pre.length)));
  }

  remove(path: string): Promise<void> {
    this.files.delete(path);
    return Promise.resolve();
  }
}
