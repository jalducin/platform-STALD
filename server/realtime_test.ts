// Salas en tiempo real con Supabase Realtime (openspec: salas-realtime). Sin red: fetch falso para el broadcast.
// deno-lint-ignore-file no-explicit-any require-await
import { assert, assertEquals } from "jsr:@std/assert@1";
import { clearCacheJuegos, handleJuegos } from "./juegos.ts";
import { clearCacheSalas } from "./salas.ts";
import { MemoryStore } from "./store.ts";

const ingles = [
  { alumno: "Marisol", userEmails: ["marisol@example.com"], userNames: ["Marisol"] },
  { alumno: "Angel", userEmails: ["angel@example.com"], userNames: ["Angel"] },
];
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s });

function ctx(conRealtime = true, falla = false) {
  clearCacheJuegos();
  const store = new MemoryStore();
  const enviados: any[] = [];
  const fetchFalso = (async (url: string | URL | Request, init?: RequestInit) => {
    enviados.push({ url: String(url), headers: new Headers(init?.headers), body: JSON.parse(String(init?.body)) });
    if (falla) throw new Error("red caída");
    return new Response(null, { status: 202 });
  }) as typeof fetch;
  const t = Date.parse("2026-09-30T18:00:00.000Z");
  const deps: any = {
    store, admin: "admin@example.com", filasIngles: () => Promise.resolve(ingles), filasSecundaria: () => Promise.resolve([]),
    hoy: () => "2026-09-30", ahora: () => new Date(t).toISOString(),
    ...(conRealtime ? { realtime: { url: "https://proj.supabase.co", publica: "sb_publishable_x", servicio: "sb_secret_y", fetch: fetchFalso } } : {}),
  };
  const call = async (method: string, sub: string, email: string, body?: unknown) => {
    clearCacheSalas();
    const req = new Request(`http://x/juegos${sub}?email=${encodeURIComponent(email)}`, { method, body: body === undefined ? undefined : JSON.stringify(body) });
    const res = await handleJuegos(req, sub, email, deps, json);
    return { status: res.status, body: await res.json() };
  };
  return { store, call, enviados };
}

Deno.test("realtime: la sala nace con canal secreto y el GET da rt solo a quien está dentro", async () => {
  const c = ctx();
  const r = await c.call("POST", "/sala", "marisol@example.com", { juego: "cultura", opciones: { cat: "todas" }, bots: true });
  const sala = (await c.store.get<any>(`juegos/salas/${r.body.codigo}/sala.json`))!.data;
  assert(/^[0-9a-f]{24}$/.test(sala.canal), "canal aleatorio");
  assertEquals(r.body.sala.canal, undefined, "la creación no lo expone en el cuerpo de la sala");
  const g = await c.call("GET", `/sala/${r.body.codigo}`, "marisol@example.com");
  assertEquals(g.body.rt, { url: "https://proj.supabase.co", key: "sb_publishable_x", topic: `sala-${sala.canal}` });
  assertEquals(g.body.sala.canal, undefined, "el canal solo va en rt");
  assertEquals((await c.call("GET", `/sala/${r.body.codigo}`, "angel@example.com")).status, 403);
});

Deno.test("realtime: publica el estado tras unirse, empezar y responder", async () => {
  const c = ctx();
  const codigo = (await c.call("POST", "/sala", "marisol@example.com", { juego: "cultura", opciones: { cat: "todas" }, bots: true })).body.codigo;
  const canal = (await c.store.get<any>(`juegos/salas/${codigo}/sala.json`))!.data.canal;
  await c.call("POST", `/sala/${codigo}/unirse`, "angel@example.com");
  await c.call("POST", `/sala/${codigo}/empezar`, "marisol@example.com");
  await c.call("POST", `/sala/${codigo}/respuesta`, "angel@example.com", { q: 0, correcta: true, puntos: 150, ms: 900 });
  assertEquals(c.enviados.length, 3);
  const ult = c.enviados[2];
  assertEquals(ult.url, "https://proj.supabase.co/realtime/v1/api/broadcast");
  assertEquals([ult.headers.get("apikey"), ult.headers.get("authorization")], ["sb_secret_y", "Bearer sb_secret_y"]);
  const m = ult.body.messages[0];
  assertEquals([m.topic, m.event, m.private], [`sala-${canal}`, "estado", false]);
  assertEquals(m.payload.jugadores.find((j: any) => j.nombre === "Angel").respuestas["0"].puntos, 150);
  assertEquals([m.payload.sala.canal, typeof m.payload.ahora], [undefined, "number"]);
  assertEquals(JSON.stringify(m.payload).includes("@"), false, "sin correos");
  const angel = (j: any) => j.jugadores.find((x: any) => x.nombre === "Angel");
  assertEquals([angel(c.enviados[0].body.messages[0].payload).v, angel(m.payload).v], [1, 2], "v sube en cada guardado");
});

Deno.test("realtime: si falla la publicación la respuesta sigue bien; sin configuración no hay rt", async () => {
  const c = ctx(true, true);
  const codigo = (await c.call("POST", "/sala", "marisol@example.com", { juego: "cultura", opciones: { cat: "todas" }, bots: true })).body.codigo;
  const u = await c.call("POST", `/sala/${codigo}/unirse`, "angel@example.com");
  assertEquals(u.status, 200);
  const s = ctx(false);
  const cod2 = (await s.call("POST", "/sala", "marisol@example.com", { juego: "cultura", opciones: { cat: "todas" }, bots: true })).body.codigo;
  assertEquals((await s.call("GET", `/sala/${cod2}`, "marisol@example.com")).body.rt, undefined);
});
