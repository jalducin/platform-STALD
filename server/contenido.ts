// Contenido del repo de datos en un solo paquete (openspec: contenido-en-bloque). Leer las clases una por una gastaba
// hasta 682 consultas a GitHub por arranque; así son 2 (commit y tarball) y, sin cambios, un 304 por minuto.
// Si GitHub falla: copia en memoria → respaldo de Postgres → archivo por archivo (GitHubStore), como antes.
import { decodeBase64, encodeBase64 } from "jsr:@std/encoding@1/base64";
import { unaALaVez } from "./cache.ts";
import type { Db } from "./db.ts";
import type { Doc, Store } from "./store.ts";

const PREFIJO = "contenido/";
const VIGENCIA_MS = 60_000;
export const RUTA_RESPALDO = "respaldo/contenido";

export interface Respaldo { sha: string; gz: string } // gz: base64 del JSON { ruta: texto } comprimido
export interface AlmacenRespaldo {
  leer(): Promise<Respaldo | null>;
  guardar(r: Respaldo): Promise<void>;
}

// Respaldo en `stald_docs` (RLS sin políticas: solo la llave de servicio lo lee).
export function respaldoPg(db: Db): AlmacenRespaldo {
  return {
    async leer() {
      const filas = await db.select<{ data: Respaldo }>("docs", `path=eq.${encodeURIComponent(RUTA_RESPALDO)}&select=data`);
      return filas[0]?.data ?? null;
    },
    async guardar(r) {
      // Otra instancia pudo guardar ya esta versión: no se vuelve a mandar.
      const filas = await db.select<{ sha: string }>("docs", `path=eq.${encodeURIComponent(RUTA_RESPALDO)}&select=sha:data->>sha`);
      if (filas[0]?.sha === r.sha) return;
      await db.upsert("docs", { path: RUTA_RESPALDO, data: r, actualizado: new Date().toISOString() }, "path");
    },
  };
}

// sha de git de un archivo: el mismo que da la API de contenidos (concurrencia optimista al escribir).
export async function shaGit(bytes: Uint8Array): Promise<string> {
  const cab = new TextEncoder().encode(`blob ${bytes.length}\0`);
  const todo = new Uint8Array(cab.length + bytes.length);
  todo.set(cab);
  todo.set(bytes, cab.length);
  const h = new Uint8Array(await crypto.subtle.digest("SHA-1", todo));
  return [...h].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function transformar(datos: BlobPart, t: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  return new Uint8Array(await new Response(new Blob([datos]).stream().pipeThrough(t as unknown as ReadableWritablePair<Uint8Array, BufferSource>)).arrayBuffer());
}

// Ruta larga de un encabezado pax: líneas «<largo> clave=valor\n».
function rutaPax(b: Uint8Array): string | null {
  const m = /\d+ path=([^\n]*)\n/.exec(new TextDecoder().decode(b));
  return m ? m[1] : null;
}

// Archivos .json de contenido/ de un tar de GitHub (todo cuelga de una carpeta «<repo>-<sha>/»).
export function leerTar(tar: Uint8Array): Map<string, string> {
  const r = new Map<string, string>();
  const campo = (o: number, n: number) => {
    const s = tar.subarray(o, o + n);
    const fin = s.indexOf(0);
    return new TextDecoder().decode(fin < 0 ? s : s.subarray(0, fin));
  };
  let larga: string | null = null;
  for (let o = 0; o + 512 <= tar.length && tar[o] !== 0;) {
    const n = parseInt(campo(o + 124, 12).trim(), 8) || 0;
    const tipo = campo(o + 156, 1) || "0";
    const cuerpo = tar.subarray(o + 512, o + 512 + n);
    if (cuerpo.length !== n) throw new Error("paquete_incompleto");
    if (tipo === "x") larga = rutaPax(cuerpo);
    else if (tipo !== "g") {
      const prefijo = campo(o + 345, 155);
      const completa = larga ?? (prefijo ? `${prefijo}/${campo(o, 100)}` : campo(o, 100));
      larga = null;
      const ruta = completa.slice(completa.indexOf("/") + 1);
      if (tipo === "0" && ruta.startsWith(PREFIJO) && ruta.endsWith(".json")) r.set(ruta, new TextDecoder("utf-8", { ignoreBOM: true }).decode(cuerpo));
    }
    o += 512 + Math.ceil(n / 512) * 512;
  }
  return r;
}

export interface OpcionesContenido {
  repo: string;
  token: string;
  branch?: string;
  respaldo?: AlmacenRespaldo | null;
  fetch?: typeof fetch; // inyectable en pruebas
  ahora?: () => number;
  registrar?: (msg: string) => void;
}

export class ContenidoStore implements Store {
  private copia: { sha: string; archivos: Map<string, string> } | null = null;
  private etag: string | null = null;
  private revisado = -Infinity;
  private sucias = new Map<string, number>(); // ruta escrita aquí → número de escritura
  private escrituras = 0;
  private enVuelo = unaALaVez<void>();
  respaldoListo: Promise<void> = Promise.resolve();

  constructor(private base: Store, private o: OpcionesContenido) {}

  private ahora() { return (this.o.ahora ?? Date.now)(); }
  private registrar(m: string) { (this.o.registrar ?? ((x: string) => console.error(x)))(m); }

  private async pedir(ruta: string, extra: Record<string, string>): Promise<Response> {
    const res = await (this.o.fetch ?? fetch)(`https://api.github.com/repos/${this.o.repo}/${ruta}`, {
      headers: { "Authorization": `Bearer ${this.o.token}`, "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "platform-STALD", ...extra },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok && res.status !== 304) {
      await res.body?.cancel();
      throw new Error(`github_${res.status}`);
    }
    return res;
  }

  private async actualizar(): Promise<void> {
    if (this.ahora() - this.revisado < VIGENCIA_MS) return;
    const antes = this.escrituras;
    try {
      const res = await this.pedir(`commits/${this.o.branch ?? "main"}`, { "Accept": "application/vnd.github.sha", ...(this.copia && this.etag ? { "If-None-Match": this.etag } : {}) });
      if (res.status !== 304) {
        const sha = (await res.text()).trim();
        if (sha !== this.copia?.sha) await this.bajar(sha, antes);
        this.etag = res.headers.get("etag");
      }
    } catch (e) {
      this.registrar(`contenido: no se pudo actualizar (${e instanceof Error ? e.message : e})`);
      if (!this.copia) await this.recuperar();
    }
    this.revisado = this.ahora();
  }

  private async bajar(sha: string, antes: number): Promise<void> {
    const res = await this.pedir(`tarball/${sha}`, { "Accept": "application/vnd.github+json" });
    const archivos = leerTar(await transformar(await res.arrayBuffer(), new DecompressionStream("gzip")));
    if (!archivos.size) throw new Error("paquete_vacio");
    this.copia = { sha, archivos };
    for (const [ruta, n] of this.sucias) if (n <= antes) this.sucias.delete(ruta);
    this.respaldoListo = this.respaldar(sha, archivos);
  }

  // En segundo plano: si el respaldo falla, las clases siguen.
  private async respaldar(sha: string, archivos: Map<string, string>): Promise<void> {
    if (!this.o.respaldo) return;
    try {
      const gz = await transformar(JSON.stringify(Object.fromEntries(archivos)), new CompressionStream("gzip"));
      await this.o.respaldo.guardar({ sha, gz: encodeBase64(gz) });
    } catch (e) {
      this.registrar(`contenido: no se guardó el respaldo (${e instanceof Error ? e.message : e})`);
    }
  }

  private async recuperar(): Promise<void> {
    try {
      const r = await this.o.respaldo?.leer();
      if (!r) return;
      const json = new TextDecoder().decode(await transformar(decodeBase64(r.gz), new DecompressionStream("gzip")));
      this.copia = { sha: r.sha, archivos: new Map(Object.entries(JSON.parse(json) as Record<string, string>)) };
      this.registrar("contenido: se sirve el respaldo de Postgres");
    } catch (e) {
      this.registrar(`contenido: no se leyó el respaldo (${e instanceof Error ? e.message : e})`);
    }
  }

  private async archivos(): Promise<Map<string, string> | null> {
    await this.enVuelo("actualizar", () => this.actualizar());
    return this.copia?.archivos ?? null;
  }

  async get<T = unknown>(path: string): Promise<Doc<T> | null> {
    if (!path.startsWith(PREFIJO) || !path.endsWith(".json")) return await this.base.get<T>(path);
    const a = await this.archivos();
    if (!a || this.sucias.has(path)) return await this.base.get<T>(path);
    const texto = a.get(path);
    if (texto === undefined) return null;
    return { data: JSON.parse(texto.replace(/^﻿/, "")) as T, sha: await shaGit(new TextEncoder().encode(texto)) };
  }

  async list(dir: string): Promise<string[]> {
    const pre = dir.replace(/\/+$/, "") + "/";
    if (!pre.startsWith(PREFIJO)) return await this.base.list(dir);
    const a = await this.archivos();
    if (!a || [...this.sucias.keys()].some((p) => p.startsWith(pre))) return await this.base.list(dir);
    return [...a.keys()].filter((k) => k.startsWith(pre) && !k.slice(pre.length).includes("/")).map((k) => k.slice(pre.length));
  }

  // Lo escrito aquí se lee directo de GitHub hasta cargar un paquete pedido después.
  private marcar(path: string) {
    if (path.startsWith(PREFIJO)) this.sucias.set(path, ++this.escrituras);
  }

  async put(path: string, data: unknown, sha: string | null, message: string): Promise<boolean> {
    try {
      return await this.base.put(path, data, sha, message);
    } finally {
      this.marcar(path);
    }
  }

  async remove(path: string, message: string): Promise<void> {
    try {
      await this.base.remove(path, message);
    } finally {
      this.marcar(path);
    }
  }
}
