// Póker en partida (openspec: poker): sala permitida, opción de equipos y validación de la jugada.
// deno-lint-ignore-file no-explicit-any
import { assertEquals } from "jsr:@std/assert@1";
import { clearCacheJuegos, handleJuegos } from "./juegos.ts";
import { clearCacheSalas } from "./salas.ts";
import { MemoryStore } from "./store.ts";

const ingles = [
  { alumno: "Marisol", userEmails: ["marisol@example.com"], userNames: ["Marisol"] },
  { alumno: "Angel", userEmails: ["angel@example.com"], userNames: ["Angel"] },
];
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s });

function ctx() {
  clearCacheJuegos();
  const store = new MemoryStore();
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

Deno.test("póker en sala: se crea con equipos y acepta jugadas de póker válidas", async () => {
  const c = ctx();
  const r = await c.call("POST", "/sala", "marisol@example.com", { juego: "poker", opciones: { equipos: "1" }, bots: true });
  assertEquals(r.status, 200, JSON.stringify(r.body));
  assertEquals(r.body.sala.opciones, { equipos: "1" });
  const codigo = r.body.codigo;
  await c.call("POST", `/sala/${codigo}/unirse`, "angel@example.com");
  await c.call("POST", `/sala/${codigo}/empezar`, "marisol@example.com");
  c.avanzar(6000);
  const ok = await c.call("POST", `/sala/${codigo}/respuesta`, "marisol@example.com", { jugada: { n: 0, accion: "subir", monto: 60 } });
  assertEquals([ok.status, ok.body.jugadas[0].accion, ok.body.jugadas[0].monto], [200, "subir", 60]);
  for (const mala of [{ n: 1, accion: "jugar", carta: 3 }, { n: 1, accion: "subir", monto: -5 }, { n: 1, accion: "subir", monto: 2.5 }, { n: 1, accion: "magia" }]) {
    assertEquals((await c.call("POST", `/sala/${codigo}/respuesta`, "angel@example.com", { jugada: mala })).body.error, "jugada_invalida", JSON.stringify(mala));
  }
  assertEquals((await c.call("POST", `/sala/${codigo}/respuesta`, "angel@example.com", { jugada: { n: 0, accion: "igualar" } })).status, 409, "turno_tomado");
  assertEquals((await c.call("POST", `/sala/${codigo}/respuesta`, "angel@example.com", { jugada: { n: 1, accion: "todo" } })).status, 200);
});

Deno.test("póker en sala: ¡Una! no acepta acciones de póker y el póker está en el catálogo", async () => {
  const c = ctx();
  const codigo = (await c.call("POST", "/sala", "marisol@example.com", { juego: "una", opciones: {}, bots: true })).body.codigo;
  await c.call("POST", `/sala/${codigo}/empezar`, "marisol@example.com");
  c.avanzar(6000);
  assertEquals((await c.call("POST", `/sala/${codigo}/respuesta`, "marisol@example.com", { jugada: { n: 0, accion: "subir", monto: 60 } })).body.error, "jugada_invalida");
  const p = await c.call("POST", "/partida", "marisol@example.com", { juego: "poker", puntos: 800, aciertos: 6, total: 10, segundos: 300 });
  assertEquals([p.status, p.body.puntos], [200, 800]);
});
