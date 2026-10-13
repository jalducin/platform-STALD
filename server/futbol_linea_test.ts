// Fútbol Estelar en línea 1 vs 1 (openspec: futbol-en-linea): mesa sin bots, táctica en la sala de espera,
// resultado validado por el servidor (confirmado, en disputa, de una sola persona, imposible) y puntos.
// deno-lint-ignore-file no-explicit-any
import { assert, assertEquals } from "jsr:@std/assert@1";
import { clearCacheJuegos, handleJuegos } from "./juegos.ts";
import { clearCacheSalas, MESAS } from "./salas.ts";
import { puntosFutbol, resultadoFutbol, validarResultado, validarTactica } from "./futbol_linea.ts";
import { MemoryStore } from "./store.ts";
import "../juegos/mesas.js";

const Mesas = (globalThis as any).Mesas;
const ingles = ["Marisol", "Angel", "Laura"].map((n) => ({ alumno: n, userEmails: [n.toLowerCase() + "@example.com"], userNames: [n] }));
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s });

function ctx() {
  clearCacheJuegos();
  const store = new MemoryStore();
  let t = Date.parse("2026-09-30T18:00:00.000Z");
  const deps = {
    store, admin: "admin@example.com", filasIngles: () => Promise.resolve(ingles), filasSecundaria: () => Promise.resolve([]),
    hoy: () => "2026-09-30", ahora: () => new Date(t).toISOString(),
  };
  const call = async (method: string, sub: string, quien: string, body?: unknown) => {
    clearCacheSalas();
    const email = quien + "@example.com";
    const req = new Request(`http://x/juegos${sub}?email=${encodeURIComponent(email)}`, { method, body: body === undefined ? undefined : JSON.stringify(body) });
    const res = await handleJuegos(req, sub, email, deps, json);
    return { status: res.status, body: await res.json() };
  };
  return { call, avanzar: (ms: number) => { t += ms; } };
}
type Ctx = ReturnType<typeof ctx>;
async function salaEmpezada(c: Ctx) {
  const r = await c.call("POST", "/sala", "marisol", { juego: "futbol", bots: true });
  assertEquals(r.status, 200, JSON.stringify(r.body));
  const codigo = r.body.codigo;
  assertEquals((await c.call("POST", `/sala/${codigo}/unirse`, "angel")).status, 200);
  assertEquals((await c.call("POST", `/sala/${codigo}/empezar`, "marisol")).status, 200);
  c.avanzar(5000 + 190_000); // cuenta regresiva + partido de 3 minutos con reposiciones
  return codigo;
}

Deno.test("futbol-en-linea: la mesa es 1 vs 1 sin bots e igual en servidor y página", async () => {
  assertEquals(MESAS.futbol, { max: 2, min: 2, bots: "nunca" });
  assertEquals(Mesas.MESAS.futbol, MESAS.futbol);
  const c = ctx();
  const r = await c.call("POST", "/sala", "marisol", { juego: "futbol", bots: true });
  assertEquals(r.status, 200);
  assertEquals(r.body.sala.bots, false, "sin bots aunque se pidan");
  const codigo = r.body.codigo;
  assertEquals((await c.call("POST", `/sala/${codigo}/empezar`, "marisol")).status, 409, "solo no se puede empezar");
  await c.call("POST", `/sala/${codigo}/unirse`, "angel");
  assertEquals((await c.call("POST", `/sala/${codigo}/unirse`, "laura")).body.error, "sala_llena");
});

Deno.test("futbol-en-linea: validarTactica acepta formaciones conocidas y enteros 0–100", () => {
  assertEquals(validarTactica({ formacion: "4-3-3", linea: 60, ancho: 40, mentalidad: 70, presion: 80 }), { formacion: "4-3-3", linea: 60, ancho: 40, mentalidad: 70, presion: 80 });
  assertEquals(validarTactica({ formacion: "5-3-2" }), { formacion: "5-3-2", linea: 50, ancho: 50, mentalidad: 50, presion: 50 });
  assertEquals(validarTactica({ formacion: "9-0-1" }), null);
  assertEquals(validarTactica({ formacion: "4-4-2", presion: 140 }), null);
  assertEquals(validarTactica({ formacion: "4-4-2", linea: 2.5 }), null);
  assertEquals(validarTactica("4-4-2"), null);
});

Deno.test("futbol-en-linea: la táctica se guarda en el asiento antes de empezar", async () => {
  const c = ctx();
  const codigo = (await c.call("POST", "/sala", "marisol", { juego: "futbol" })).body.codigo;
  await c.call("POST", `/sala/${codigo}/unirse`, "angel");
  const ok = await c.call("POST", `/sala/${codigo}/unirse`, "angel", { tactica: { formacion: "4-3-3", presion: 80 } });
  assertEquals(ok.status, 200, JSON.stringify(ok.body));
  const mal = await c.call("POST", `/sala/${codigo}/unirse`, "angel", { tactica: { formacion: "9-0-1" } });
  assertEquals([mal.status, mal.body.error], [400, "tactica_invalida"]);
  const est = await c.call("GET", `/sala/${codigo}`, "marisol");
  const angel = est.body.jugadores.find((j: any) => j.nombre === "Angel");
  assertEquals(angel.tactica, { formacion: "4-3-3", linea: 50, ancho: 50, mentalidad: 50, presion: 80 });
  await c.call("POST", `/sala/${codigo}/empezar`, "marisol");
  const tarde = await c.call("POST", `/sala/${codigo}/unirse`, "angel", { tactica: { formacion: "4-4-2" } });
  assertEquals([tarde.status, tarde.body.error], [409, "ya_empezo"]);
});

Deno.test("futbol-en-linea: validarResultado revisa marcador, plausibilidad y duración", () => {
  const inicio = 1_000_000, ahora = inicio + 200_000;
  assertEquals(validarResultado({ goles: [2, 1], ms: 185_000 }, inicio, ahora), { goles: [2, 1], ms: 185_000 });
  assertEquals(validarResultado({ goles: [1, 1], ms: 60_000, corte: true }, inicio, ahora), { goles: [1, 1], ms: 60_000, corte: true });
  assertEquals(validarResultado({ goles: [31, 0], ms: 185_000 }, inicio, ahora), null, "más de 30");
  assertEquals(validarResultado({ goles: [25, 0], ms: 40_000 }, inicio, ahora), null, "más goles de los plausibles");
  assertEquals(validarResultado({ goles: [-1, 0], ms: 185_000 }, inicio, ahora), null);
  assertEquals(validarResultado({ goles: [1.5, 0], ms: 185_000 }, inicio, ahora), null);
  assertEquals(validarResultado({ goles: [1, 0], ms: 5_000 }, inicio, ahora), null, "muy corto");
  assertEquals(validarResultado({ goles: [1, 0], ms: 21 * 60_000 }, inicio, inicio + 30 * 60_000), null, "muy largo");
  assertEquals(validarResultado({ goles: [1, 0], ms: 210_000 }, inicio, ahora), null, "más largo que el tiempo desde el inicio");
  assertEquals(validarResultado({ goles: [1, 0] }, inicio, ahora), null);
});

Deno.test("futbol-en-linea: puntos como el partido rápido (topados)", () => {
  assertEquals(puntosFutbol(2, 1), 300 + 120 - 20);
  assertEquals(puntosFutbol(1, 1), 120 + 60 - 20);
  assertEquals(puntosFutbol(0, 3), 0);
  assertEquals(puntosFutbol(9, 0), 300 + 360);
});

Deno.test("futbol-en-linea: resultadoFutbol confirmado, en disputa, de una persona o pendiente", () => {
  const h = { id: "h", futbol: { goles: [2, 1], ms: 1e5, t: 1 } }, g = { id: "g", futbol: { goles: [2, 1], ms: 1e5, t: 2 } };
  const r = resultadoFutbol("h", [h, g] as any);
  assertEquals([r.estado, r.goles, r.puntos], ["confirmado", [2, 1], { h: 400, g: 40 + 60 - 40 }]);
  assertEquals(resultadoFutbol("h", [h, { ...g, futbol: { goles: [1, 1], ms: 1e5, t: 2 } }] as any).estado, "disputa");
  assertEquals(resultadoFutbol("h", [h, { ...g, futbol: { goles: [1, 1], ms: 1e5, t: 2 } }] as any).goles, [2, 1]);
  assertEquals(resultadoFutbol("h", [h, { id: "g" }] as any).estado, "anfitrion");
  const soloInvitado = resultadoFutbol("h", [{ id: "h" }, { id: "g", futbol: { goles: [0, 2], ms: 1e5, corte: true, t: 2 } }] as any);
  assertEquals([soloInvitado.estado, soloInvitado.goles], ["invitado", [0, 2]]);
  assertEquals(resultadoFutbol("h", [{ id: "h" }, { id: "g" }] as any).estado, "pendiente");
});

Deno.test("futbol-en-linea: /respuesta guarda el primer reporte de cada quien y devuelve el resultado", async () => {
  const c = ctx();
  const codigo = await salaEmpezada(c);
  const mal = await c.call("POST", `/sala/${codigo}/respuesta`, "marisol", { futbol: { goles: [25, 0], ms: 40_000 } });
  assertEquals([mal.status, mal.body.error], [400, "resultado_invalido"]);
  const h = await c.call("POST", `/sala/${codigo}/respuesta`, "marisol", { futbol: { goles: [2, 1], ms: 185_000 } });
  assertEquals(h.status, 200, JSON.stringify(h.body));
  assertEquals([h.body.futbol.estado, h.body.futbol.goles], ["anfitrion", [2, 1]]);
  const otra = await c.call("POST", `/sala/${codigo}/respuesta`, "marisol", { futbol: { goles: [5, 0], ms: 185_000 } });
  assertEquals(otra.body.futbol.goles, [2, 1], "solo cuenta el primer reporte");
  const g = await c.call("POST", `/sala/${codigo}/respuesta`, "angel", { futbol: { goles: [2, 1], ms: 184_000 } });
  assertEquals(g.body.futbol.estado, "confirmado");
  const est = await c.call("GET", `/sala/${codigo}`, "angel");
  assertEquals(est.body.futbol.estado, "confirmado");
  assert(est.body.futbol.puntos[est.body.yo] >= 0);
});

Deno.test("futbol-en-linea: sin empezar o fuera de la sala no se reporta", async () => {
  const c = ctx();
  const codigo = (await c.call("POST", "/sala", "marisol", { juego: "futbol" })).body.codigo;
  await c.call("POST", `/sala/${codigo}/unirse`, "angel");
  assertEquals((await c.call("POST", `/sala/${codigo}/respuesta`, "marisol", { futbol: { goles: [0, 0], ms: 60_000 } })).body.error, "no_empezo");
  assertEquals((await c.call("POST", `/sala/${codigo}/respuesta`, "laura", { futbol: { goles: [0, 0], ms: 60_000 } })).status, 403);
});
