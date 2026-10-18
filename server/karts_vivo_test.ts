// Karts en vivo en el servidor (openspec: juegos-en-vivo): sala de hasta 8 personas (la 9.ª recibe sala_llena), los
// bots completan 3 lugares y el tiempo de cada quien se sigue validando con el reloj del servidor.
// deno-lint-ignore-file no-explicit-any
import { assertEquals } from "jsr:@std/assert@1";
import { clearCacheJuegos, handleJuegos } from "./juegos.ts";
import { clearCacheSalas } from "./salas.ts";
import { MemoryStore } from "./store.ts";

const NOMBRES = ["Marisol", "Angel", "Laura", "Beto", "Carla", "Dani", "Eva", "Fito", "Gabo"];
const correo = (n: string) => n.toLowerCase() + "@example.com";
const ingles = NOMBRES.map((n) => ({ alumno: n, userEmails: [correo(n)], userNames: [n] }));
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s });

function ctx() {
  clearCacheJuegos();
  const store = new MemoryStore();
  let t = Date.parse("2026-10-12T18:00:00.000Z");
  const deps = {
    store, admin: "admin@example.com", filasIngles: () => Promise.resolve(ingles), filasSecundaria: () => Promise.resolve([]),
    hoy: () => "2026-10-12", ahora: () => new Date(t).toISOString(),
  };
  const call = async (method: string, sub: string, email: string, body?: unknown) => {
    clearCacheSalas();
    const req = new Request(`http://x/juegos${sub}?email=${encodeURIComponent(email)}`, { method, body: body === undefined ? undefined : JSON.stringify(body) });
    const res = await handleJuegos(req, sub, email, deps, json);
    return { status: res.status, body: await res.json() as any };
  };
  return { call, avanzar: (ms: number) => { t += ms; } };
}

Deno.test("karts en vivo: entran 8 personas y la 9.ª recibe sala_llena", async () => {
  const c = ctx();
  const r = await c.call("POST", "/sala", correo("Marisol"), { juego: "karts", opciones: { mapa: "pradera" }, bots: true });
  assertEquals(r.status, 200, JSON.stringify(r.body));
  const codigo = r.body.codigo;
  for (const n of NOMBRES.slice(1, 8)) assertEquals((await c.call("POST", `/sala/${codigo}/unirse`, correo(n))).status, 200, n); // NOSONAR: entran en orden, una a la vez
  const novena = await c.call("POST", `/sala/${codigo}/unirse`, correo("Gabo"));
  assertEquals([novena.status, novena.body.error], [409, "sala_llena"]);
  const vista = await c.call("GET", `/sala/${codigo}`, correo("Angel"));
  assertEquals(vista.body.jugadores.length, 8);
});

Deno.test("karts en vivo: una persona sola puede empezar y su tiempo se valida con el reloj", async () => {
  const c = ctx();
  const r = await c.call("POST", "/sala", correo("Marisol"), { juego: "karts", opciones: { mapa: "hielo" }, bots: true });
  const codigo = r.body.codigo;
  assertEquals((await c.call("POST", `/sala/${codigo}/empezar`, correo("Marisol"))).status, 200);
  c.avanzar(8000 + 60_000); // 8 s de cuenta regresiva en Karts (karts-salida-y-puntos); karts-3-vueltas: mínimo ≈ 48 s
  const malo = await c.call("POST", `/sala/${codigo}/respuesta`, correo("Marisol"), { carrera: { ms: 16_000, monedas: 1 } });
  assertEquals([malo.status, malo.body.error], [400, "carrera_invalida"], "16 s cuando van 60 s: no cuadra con el reloj");
  const bueno = await c.call("POST", `/sala/${codigo}/respuesta`, correo("Marisol"), { carrera: { ms: 59_500, monedas: 3 } });
  assertEquals(bueno.status, 200);
});
