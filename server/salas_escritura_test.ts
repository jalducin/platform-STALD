// Escrituras de las salas que no se guardan (openspec: errores-latentes). Almacén en memoria que falla a propósito:
// ninguna ruta debe responder `ok` sin haber guardado, y el estado debe quedar consistente.
// deno-lint-ignore-file no-explicit-any
import { assert, assertEquals } from "jsr:@std/assert@1";
import { clearCacheJuegos, handleJuegos } from "./juegos.ts";
import { clearCacheSalas } from "./salas.ts";
import { MemoryStore } from "./store.ts";

const ingles = [
  { alumno: "Marisol", userEmails: ["marisol@example.com"], userNames: ["Marisol"] },
  { alumno: "Angel", userEmails: ["angel@example.com"], userNames: ["Sisifo"] },
];
const M = "marisol@example.com", A = "angel@example.com";
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s });

// `fallar(ruta)` decide qué escrituras fallan (como un choque de sha que se repite); `antes(ruta)` corre antes de
// cada escritura (para simular otra petición que escribe primero).
class StoreQueFalla extends MemoryStore {
  fallar: (ruta: string) => boolean = () => false;
  antes: (ruta: string) => Promise<void> = () => Promise.resolve();
  intentos: string[] = [];
  override async put(ruta: string, data: unknown, sha: string | null): Promise<boolean> {
    this.intentos.push(ruta);
    await this.antes(ruta);
    if (this.fallar(ruta)) return false;
    return super.put(ruta, data, sha);
  }
}

function ctx() {
  clearCacheJuegos();
  const store = new StoreQueFalla();
  let t = Date.parse("2026-09-30T18:00:00.000Z");
  const deps = {
    store, admin: "admin@example.com", filasIngles: () => Promise.resolve(ingles), filasSecundaria: () => Promise.resolve([]),
    hoy: () => "2026-09-30", ahora: () => new Date(t).toISOString(),
  };
  const call = async (method: string, sub: string, email: string, body?: unknown) => {
    clearCacheSalas();
    const req = new Request(`http://x/juegos${sub}?email=${encodeURIComponent(email)}`, { method, body: body === undefined ? undefined : JSON.stringify(body) });
    const res = await handleJuegos(req, sub, email, deps, json);
    return { status: res.status, body: await res.json() };
  };
  return { store, call, avanzar: (ms: number) => { t += ms; } };
}

async function salaCon(c: ReturnType<typeof ctx>) {
  const r = await c.call("POST", "/sala", M, { juego: "cultura", opciones: { cat: "todas" }, bots: true });
  assertEquals(r.status, 200, JSON.stringify(r.body));
  return r.body.codigo as string;
}
const archivosDe = (s: MemoryStore, codigo: string) => [...s.files.keys()].filter((k) => k.startsWith(`juegos/salas/${codigo}/`));
const esJugador = (ruta: string) => ruta.startsWith("juegos/salas/") && !ruta.endsWith("/sala.json");

Deno.test("salas sin guardar: unirse responde 503 y la persona no queda dentro", async () => {
  const c = ctx();
  const codigo = await salaCon(c);
  c.store.fallar = esJugador;
  const r = await c.call("POST", `/sala/${codigo}/unirse`, A);
  assertEquals([r.status, r.body.error], [503, "conflicto_escritura"], JSON.stringify(r.body));
  c.store.fallar = () => false;
  const g = await c.call("GET", `/sala/${codigo}`, M);
  assertEquals(g.body.jugadores.map((j: any) => j.nombre), ["Marisol"], "sin jugador medio unido");
  assertEquals((await c.call("GET", `/sala/${codigo}`, A)).status, 403, "Angel no está en la sala");
  // Al reintentar, ya entra.
  assertEquals((await c.call("POST", `/sala/${codigo}/unirse`, A)).status, 200);
});

Deno.test("salas sin guardar: empezar responde 503 y la sala sigue sin empezar", async () => {
  const c = ctx();
  const codigo = await salaCon(c);
  c.store.fallar = (ruta) => ruta === `juegos/salas/${codigo}/sala.json`;
  const r = await c.call("POST", `/sala/${codigo}/empezar`, M);
  assertEquals([r.status, r.body.error], [503, "conflicto_escritura"], JSON.stringify(r.body));
  assertEquals(c.store.intentos.filter((x) => x.endsWith(`${codigo}/sala.json`)).length, 1 + 3, "crear + 3 intentos de empezar");
  c.store.fallar = () => false;
  const g = await c.call("GET", `/sala/${codigo}`, M);
  assertEquals(g.body.sala.inicio, null, "sin sala medio empezada");
  const ok = await c.call("POST", `/sala/${codigo}/empezar`, M);
  assertEquals(ok.status, 200);
  assert(typeof ok.body.sala.inicio === "number");
});

Deno.test("salas sin guardar: si otra petición ya la empezó, empezar responde esa sala sin reescribirla", async () => {
  const c = ctx();
  const codigo = await salaCon(c);
  const ruta = `juegos/salas/${codigo}/sala.json`;
  const inicioAjeno = 123_456;
  let primera = true;
  c.store.antes = async (r) => {
    if (r !== ruta || !primera) return;
    primera = false; // otra petición del anfitrión gana la escritura
    const doc = await c.store.get<any>(ruta);
    await MemoryStore.prototype.put.call(c.store, ruta, { ...doc!.data, inicio: inicioAjeno }, doc!.sha);
  };
  const r = await c.call("POST", `/sala/${codigo}/empezar`, M);
  assertEquals([r.status, r.body.sala?.inicio], [200, inicioAjeno], JSON.stringify(r.body));
  assertEquals((await c.store.get<any>(ruta))!.data.inicio, inicioAjeno, "no se reescribe el inicio");
});

Deno.test("salas sin guardar: crear responde 503 y no deja una sala sin anfitrión", async () => {
  const c = ctx();
  c.store.fallar = esJugador;
  const r = await c.call("POST", "/sala", M, { juego: "cultura", opciones: { cat: "todas" }, bots: true });
  assertEquals([r.status, r.body.error], [503, "conflicto_escritura"], JSON.stringify(r.body));
  assertEquals([...c.store.files.keys()].filter((k) => k.startsWith("juegos/salas")), [], "ni sala ni índice semanal");
  // Si la sala misma no se puede guardar, tampoco hay ok.
  c.store.fallar = (ruta) => ruta.endsWith("/sala.json");
  const r2 = await c.call("POST", "/sala", M, { juego: "cultura", opciones: { cat: "todas" }, bots: true });
  assertEquals([r2.status, r2.body.error], [503, "conflicto_escritura"], JSON.stringify(r2.body));
  assertEquals([...c.store.files.keys()].filter((k) => k.startsWith("juegos/salas")), []);
});

Deno.test("salas sin guardar: revancha responde 503 con el código si quien la pide no queda dentro", async () => {
  const c = ctx();
  const codigo = await salaCon(c);
  assertEquals((await c.call("POST", `/sala/${codigo}/empezar`, M)).status, 200);
  c.avanzar(6000);
  assertEquals((await c.call("POST", `/sala/${codigo}/respuesta`, M, { final: 500, podio: [{ nombre: "Marisol", total: 500 }] })).status, 200);
  c.store.fallar = (ruta) => esJugador(ruta) && !ruta.startsWith(`juegos/salas/${codigo}/`);
  const r = await c.call("POST", `/sala/${codigo}/revancha`, M);
  assertEquals([r.status, r.body.error], [503, "conflicto_escritura"], JSON.stringify(r.body));
  const sig = r.body.codigo as string;
  assert(/^[A-Z]{4}$/.test(sig) && sig !== codigo, sig);
  assertEquals(archivosDe(c.store, sig), [`juegos/salas/${sig}/sala.json`], "la sala nueva existe, sin la persona");
  // Al reintentar, entra a la misma revancha.
  c.store.fallar = () => false;
  const otra = await c.call("POST", `/sala/${codigo}/revancha`, M);
  assertEquals([otra.status, otra.body.codigo], [200, sig]);
});
