// GitHubStore con peticiones condicionales y respaldo ante el límite (openspec: github-etag-cache). Sin red: fetch falso.
// deno-lint-ignore-file no-explicit-any
import { assertEquals, assertRejects } from "jsr:@std/assert@1";
import { encodeBase64 } from "jsr:@std/encoding@1/base64";
import { GitHubStore } from "./store.ts";

// GitHub simulado: archivos con su sha; responde 304 si If-None-Match coincide; puede "agotar el límite".
function githubFalso() {
  const archivos = new Map<string, { data: unknown; v: number }>();
  const g = { llamadas: [] as { method: string; path: string; status: number }[], limite: false, archivos };
  const etag = (k: string) => `"${k}-${archivos.get(k)?.v ?? 0}"`;
  const resp = (status: number, body: unknown, headers: Record<string, string> = {}) => new Response(status === 304 ? null : JSON.stringify(body), { status, headers });
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    const method = init?.method || "GET";
    const path = decodeURIComponent(url.pathname.replace(/^\/repos\/[^/]+\/[^/]+\/contents\//, ""));
    const h = new Headers(init?.headers);
    const fin = (r: Response) => { g.llamadas.push({ method, path, status: r.status }); return r; };
    if (g.limite) return fin(resp(403, { message: "API rate limit exceeded for user ID 1." }, { "x-ratelimit-remaining": "0" }));
    if (method === "GET") {
      const hijos = [...archivos.keys()].filter((k) => k.startsWith(path + "/"));
      if (archivos.has(path)) {
        const e = etag(path);
        if (h.get("if-none-match") === e) return fin(resp(304, null, { etag: e }));
        return fin(resp(200, { sha: `s${archivos.get(path)!.v}`, content: encodeBase64(new TextEncoder().encode(JSON.stringify(archivos.get(path)!.data))) }, { etag: e }));
      }
      if (hijos.length) {
        const e = `"dir-${path}-${hijos.map((k) => k + archivos.get(k)!.v).join(",")}"`;
        if (h.get("if-none-match") === e) return fin(resp(304, null, { etag: e }));
        return fin(resp(200, hijos.map((k) => ({ type: "file", name: k.slice(path.length + 1) })), { etag: e }));
      }
      return fin(resp(404, { message: "Not Found" }));
    }
    if (method === "PUT") {
      const body = JSON.parse(String(init?.body));
      const actual = archivos.get(path);
      if (actual && body.sha !== `s${actual.v}`) return fin(resp(409, { message: "conflict" }));
      archivos.set(path, { data: JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(body.content), (c) => c.charCodeAt(0)))), v: (actual?.v ?? 0) + 1 });
      return fin(resp(200, {}));
    }
    if (method === "DELETE") { archivos.delete(path); return fin(resp(200, {})); }
    return fin(resp(405, {}));
  }) as typeof fetch;
  return g;
}
const original = globalThis.fetch;
const store = (max?: number) => new GitHubStore("yo/datos", "tkn", "main", max ? { maxCache: max } : {});

Deno.test("store: ETag → 304 usa la copia sin volver a descargar", async () => {
  const g = githubFalso();
  try {
    g.archivos.set("juegos/salas/ABCD/sala.json", { data: { codigo: "ABCD" }, v: 1 });
    const s = store();
    assertEquals((await s.get<any>("juegos/salas/ABCD/sala.json"))!.data.codigo, "ABCD");
    assertEquals((await s.get<any>("juegos/salas/ABCD/sala.json"))!.data.codigo, "ABCD");
    assertEquals(g.llamadas.map((l) => l.status), [200, 304], "la 2.ª es condicional (no cuenta contra el límite)");
    assertEquals(await s.list("juegos/salas/ABCD"), ["sala.json"]);
    assertEquals(await s.list("juegos/salas/ABCD"), ["sala.json"]);
    assertEquals(g.llamadas.slice(2).map((l) => l.status), [200, 304]);
    g.archivos.set("juegos/salas/ABCD/sala.json", { data: { codigo: "ABCD", inicio: 1 }, v: 2 });
    assertEquals((await s.get<any>("juegos/salas/ABCD/sala.json"))!.data.inicio, 1, "si cambió, descarga lo nuevo");
  } finally { globalThis.fetch = original; }
});

Deno.test("store: 404 limpia la copia; put y remove invalidan copia y lista", async () => {
  const g = githubFalso();
  try {
    const s = store();
    g.archivos.set("a/x.json", { data: { n: 1 }, v: 1 });
    await s.get("a/x.json"); await s.list("a");
    const doc = (await s.get<any>("a/x.json"))!;
    assertEquals(await s.put("a/x.json", { n: 2 }, doc.sha, "m"), true);
    assertEquals((await s.get<any>("a/x.json"))!.data.n, 2, "tras escribir, lee fresco");
    await s.put("a/y.json", { n: 1 }, null, "m");
    assertEquals((await s.list("a")).sort(), ["x.json", "y.json"], "la lista se invalida al escribir");
    await s.remove("a/y.json", "m");
    assertEquals(await s.list("a"), ["x.json"]);
    g.archivos.delete("a/x.json");
    assertEquals(await s.get("a/x.json"), null);
  } finally { globalThis.fetch = original; }
});

Deno.test("store: límite agotado → última copia; sin copia → github_rate_limit", async () => {
  const g = githubFalso();
  try {
    const s = store();
    g.archivos.set("juegos/semanas/2026-09-28/a-sofy.json", { data: { total: 10 }, v: 1 });
    await s.get("juegos/semanas/2026-09-28/a-sofy.json"); await s.list("juegos/semanas/2026-09-28");
    g.limite = true;
    assertEquals((await s.get<any>("juegos/semanas/2026-09-28/a-sofy.json"))!.data.total, 10, "sirve la copia");
    assertEquals(await s.list("juegos/semanas/2026-09-28"), ["a-sofy.json"]);
    await assertRejects(() => s.get("alumnos.json"), Error, "github_rate_limit");
  } finally { globalThis.fetch = original; }
});

Deno.test("store: tope de entradas en la caché", async () => {
  const g = githubFalso();
  try {
    const s = store(2);
    for (const k of ["c/1.json", "c/2.json", "c/3.json"]) g.archivos.set(k, { data: {}, v: 1 });
    await s.get("c/1.json"); await s.get("c/2.json"); await s.get("c/3.json");
    g.llamadas.length = 0;
    await s.get("c/1.json");
    assertEquals(g.llamadas[0].status, 200, "la más antigua salió de la caché (descarga completa)");
  } finally { globalThis.fetch = original; }
});
