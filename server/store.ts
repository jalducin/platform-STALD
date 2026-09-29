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

export class GitHubStore implements Store {
  constructor(private repo: string, private token: string, private branch = "main") {}

  private url(path: string) {
    return `https://api.github.com/repos/${this.repo}/contents/${path.split("/").map(encodeURIComponent).join("/")}`;
  }

  private headers(): HeadersInit {
    return {
      "Authorization": `Bearer ${this.token}`,
      "Accept": "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "platform-STALD",
    };
  }

  async get<T>(path: string): Promise<Doc<T> | null> {
    const res = await fetch(`${this.url(path)}?ref=${this.branch}`, { headers: this.headers() });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`github_get_${res.status}`);
    const j = await res.json();
    const text = new TextDecoder().decode(decodeBase64(String(j.content).replace(/\n/g, "")));
    return { data: JSON.parse(text) as T, sha: j.sha };
  }

  async put(path: string, data: unknown, sha: string | null, message: string): Promise<boolean> {
    const body: Record<string, unknown> = {
      message,
      branch: this.branch,
      content: encodeBase64(new TextEncoder().encode(JSON.stringify(data, null, 2) + "\n")),
    };
    if (sha) body.sha = sha;
    const res = await fetch(this.url(path), { method: "PUT", headers: { ...this.headers(), "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.status === 409 || res.status === 422) return false;
    if (!res.ok) throw new Error(`github_put_${res.status}`);
    return true;
  }

  async list(dir: string): Promise<string[]> {
    const res = await fetch(`${this.url(dir)}?ref=${this.branch}`, { headers: this.headers() });
    if (res.status === 404) return [];
    if (!res.ok) throw new Error(`github_list_${res.status}`);
    const j = await res.json();
    // deno-lint-ignore no-explicit-any
    return Array.isArray(j) ? j.filter((f: any) => f.type === "file").map((f: any) => f.name as string) : [];
  }

  async remove(path: string, message: string): Promise<void> {
    const doc = await this.get(path);
    if (!doc) return;
    const res = await fetch(this.url(path), {
      method: "DELETE",
      headers: { ...this.headers(), "Content-Type": "application/json" },
      body: JSON.stringify({ message, sha: doc.sha, branch: this.branch }),
    });
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
