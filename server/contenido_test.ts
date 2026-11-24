// Contenido en un solo paquete con respaldo (openspec: contenido-en-bloque). Sin red: fetch falso.
// deno-lint-ignore-file no-explicit-any require-await
import { assert, assertEquals, assertRejects } from "jsr:@std/assert@1";
import { ContenidoStore, type Respaldo, shaGit } from "./contenido.ts";
import { MemoryStore } from "./store.ts";

const enc = new TextEncoder();
function entrada(nombre: string, cuerpo: Uint8Array, tipo = "0", prefijo = ""): Uint8Array {
  const h = new Uint8Array(512);
  const pon = (s: string, o: number) => h.set(enc.encode(s), o);
  pon(nombre, 0);
  pon(cuerpo.length.toString(8).padStart(11, "0"), 124);
  pon(tipo, 156);
  pon("ustar\0", 257);
  pon(prefijo, 345);
  const r = new Uint8Array(512 + Math.ceil(cuerpo.length / 512) * 512);
  r.set(h);
  r.set(cuerpo, 512);
  return r;
}
function pax(k: string, v: string): Uint8Array {
  const cola = ` ${k}=${v}\n`;
  const n = enc.encode(cola).length;
  let t = n + 1;
  while (String(t).length + n !== t) t++;
  return enc.encode(t + cola);
}
async function paquete(archivos: Record<string, unknown>): Promise<ArrayBuffer> {
  const partes = [entrada("pax_global_header", pax("comment", "abc"), "g")];
  for (const [p, d] of Object.entries(archivos)) {
    const c = enc.encode(JSON.stringify(d));
    if (p.length > 90) partes.push(entrada("x", pax("path", "repo-1/" + p), "x"), entrada("recortado", c));
    else partes.push(entrada(p, c, "0", "repo-1"));
  }
  partes.push(new Uint8Array(1024));
  return await new Response(new Blob(partes as BlobPart[]).stream().pipeThrough(new CompressionStream("gzip"))).arrayBuffer();
}

function mundo(archivos: Record<string, unknown>) {
  const m = { archivos, v: 1, limite: false, llamadas: [] as string[], t: 0, guardado: null as Respaldo | null, base: new MemoryStore() };
  const f = (async (u: string | URL | Request, init?: RequestInit) => {
    const ruta = new URL(String(u)).pathname.replace("/repos/yo/datos/", "");
    if (m.limite) {
      m.llamadas.push("403");
      return new Response("rate limit", { status: 403, headers: { "x-ratelimit-remaining": "0" } });
    }
    if (ruta.startsWith("commits/")) {
      const et = `"${m.v}"`;
      if (new Headers(init?.headers).get("if-none-match") === et) {
        m.llamadas.push("304");
        return new Response(null, { status: 304 });
      }
      m.llamadas.push("commit");
      return new Response(String(m.v).repeat(40), { headers: { etag: et } });
    }
    m.llamadas.push("paquete");
    return new Response(await paquete(m.archivos));
  }) as typeof fetch;
  const nueva = () =>
    new ContenidoStore(m.base, {
      repo: "yo/datos", token: "t", fetch: f, ahora: () => m.t, registrar: () => {},
      respaldo: { leer: async () => m.guardado, guardar: async (r) => { m.guardado = r; } },
    });
  return { m, nueva };
}
const LARGA = "contenido/secundaria/actividades/" + "x".repeat(90) + ".json";
const clases = () => ({ "contenido/semanas/a.json": { id: "a", t: "sí" }, "contenido/actividades/b.json": { id: "b" }, [LARGA]: { id: "larga" }, "alumnos.json": { x: 1 } });

Deno.test("contenido: arranque en frío con 2 consultas y lecturas concurrentes", async () => {
  const { m, nueva } = mundo(clases()), s = nueva();
  const [a, b, l, n, li] = await Promise.all([s.get<any>("contenido/semanas/a.json"), s.get<any>("contenido/actividades/b.json"), s.get<any>(LARGA), s.get("contenido/no.json"), s.list("contenido/semanas")]);
  assertEquals([a!.data, b!.data.id, l!.data.id, n, li], [{ id: "a", t: "sí" }, "b", "larga", null, ["a.json"]]);
  assertEquals(m.llamadas, ["commit", "paquete"]);
  assertEquals(await s.list("contenido"), [], "no lista carpetas");
  a!.data.id = "otro";
  assertEquals((await s.get<any>("contenido/semanas/a.json"))!.data.id, "a", "cada lectura recibe su objeto");
});

Deno.test("contenido: fuera de contenido/ pasa al almacén base", async () => {
  const { m, nueva } = mundo(clases());
  await m.base.put("juegos/x.json", { j: 1 }, null);
  assertEquals((await nueva().get<any>("juegos/x.json"))!.data.j, 1);
  assertEquals([await nueva().get("alumnos.json"), m.llamadas], [null, []]);
});

Deno.test("contenido: 304 sin cambios; contenido nuevo a los 60 s", async () => {
  const { m, nueva } = mundo(clases()), s = nueva();
  await s.get("contenido/semanas/a.json");
  m.t = 59_000;
  await s.get("contenido/semanas/a.json");
  assertEquals(m.llamadas.length, 2);
  m.t = 61_000;
  await s.get("contenido/semanas/a.json");
  assertEquals(m.llamadas.slice(2), ["304"]);
  m.v = 2; m.archivos = { "contenido/semanas/a.json": { id: "a2" } }; m.t = 122_000;
  assertEquals((await s.get<any>("contenido/semanas/a.json"))!.data.id, "a2");
  assertEquals(await s.get("contenido/actividades/b.json"), null);
});

Deno.test("contenido: límite agotado → copia; instancia nueva → respaldo de Postgres y luego se recupera", async () => {
  const { m, nueva } = mundo(clases()), s = nueva();
  await s.get("contenido/semanas/a.json");
  await s.respaldoListo;
  assert(m.guardado, "dejó respaldo");
  m.limite = true; m.t = 61_000;
  assertEquals((await s.get<any>("contenido/semanas/a.json"))!.data.id, "a");
  const fria = nueva();
  assertEquals((await fria.get<any>(LARGA))!.data.id, "larga");
  const antes = m.llamadas.length;
  await fria.get(LARGA);
  assertEquals(m.llamadas.length, antes, "no insiste antes de 60 s");
  m.limite = false; m.v = 2; m.archivos = { "contenido/semanas/a.json": { id: "a2" } }; m.t = 122_000;
  assertEquals((await fria.get<any>("contenido/semanas/a.json"))!.data.id, "a2");
});

Deno.test("contenido: sin paquete ni respaldo, archivo por archivo; paquete vacío no borra las clases", async () => {
  const { m, nueva } = mundo(clases());
  await m.base.put("contenido/semanas/a.json", { id: "base" }, null);
  m.limite = true;
  assertEquals((await nueva().get<any>("contenido/semanas/a.json"))!.data.id, "base");
  m.limite = false;
  const s = nueva();
  await s.get("contenido/semanas/a.json");
  m.v = 2; m.archivos = { "alumnos.json": {} }; m.t = 61_000;
  assertEquals((await s.get<any>("contenido/actividades/b.json"))!.data.id, "b");
  const rota = new ContenidoStore({ get: async () => { throw new Error("github_rate_limit"); } } as any, { repo: "yo/datos", token: "t", fetch: async () => new Response("", { status: 403 }), registrar: () => {} });
  await assertRejects(() => rota.get("contenido/semanas/a.json"), Error, "github_rate_limit");
});

Deno.test("contenido: sha de git y escritura que se lee de inmediato", async () => {
  assertEquals(await shaGit(enc.encode("hello\n")), "ce013625030ba8dba906f756967f9e9ca394464a");
  const { m, nueva } = mundo(clases()), s = nueva(), p = "contenido/actividades/b.json";
  const d = (await s.get<any>(p))!;
  assertEquals(d.sha, await shaGit(enc.encode('{"id":"b"}')));
  m.base.files.set(p, { data: d.data, sha: d.sha! });
  assertEquals(await s.put(p, { id: "b", prorrogas: 1 }, d.sha, "x"), true);
  assertEquals((await s.get<any>(p))!.data.prorrogas, 1);
  assertEquals(await s.list("contenido/actividades"), ["b.json"]);
  m.v = 2; m.archivos = { [p]: { id: "b", prorrogas: 2 } }; m.t = 61_000;
  assertEquals((await s.get<any>(p))!.data.prorrogas, 2, "el paquete nuevo manda");
});
