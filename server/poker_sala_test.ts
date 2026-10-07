// Póker en partida (openspec: poker): sala permitida, opción de equipos y validación de la jugada.
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

// openspec: poker-fichas — la subida se arma con fichas de 5, 10, 20, 50 y 100: entero, múltiplo de 5 y con monto.
Deno.test("póker en sala: la subida es un monto múltiplo de 5 (fichas de 5 a 100)", async () => {
  const c = ctx();
  const codigo = (await c.call("POST", "/sala", "marisol@example.com", { juego: "poker", opciones: {}, bots: true })).body.codigo;
  await c.call("POST", `/sala/${codigo}/unirse`, "angel@example.com");
  await c.call("POST", `/sala/${codigo}/empezar`, "marisol@example.com");
  c.avanzar(6000);
  const jug = (email: string, jugada: unknown) => c.call("POST", `/sala/${codigo}/respuesta`, email, { jugada });
  for (const mala of [{ n: 0, accion: "subir" }, { n: 0, accion: "subir", monto: 23 }, { n: 0, accion: "subir", monto: 0 }, { n: 0, accion: "subir", monto: "135" }, { n: 0, accion: "igualar", monto: 7 }]) {
    assertEquals((await jug("marisol@example.com", mala)).body.error, "jugada_invalida", JSON.stringify(mala));
  }
  const ok = await jug("marisol@example.com", { n: 0, accion: "subir", monto: 100 + 20 + 10 + 5 });
  assertEquals([ok.status, ok.body.jugadas[0].monto], [200, 135]);
  assertEquals((await jug("angel@example.com", { n: 1, accion: "subir", monto: 285 })).status, 200, "285 = 100 + 100 + 50 + 20 + 10 + 5");
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

// Brisca y Conquián en partida (openspec: cartas-espanolas): validación de la jugada por juego.
Deno.test("cartas españolas en sala: brisca y conquián con sus jugadas", async () => {
  const c = ctx();
  const abrir = async (juego: string) => {
    const r = await c.call("POST", "/sala", "marisol@example.com", { juego, opciones: {}, bots: true });
    assertEquals(r.status, 200, juego + " " + JSON.stringify(r.body));
    await c.call("POST", `/sala/${r.body.codigo}/empezar`, "marisol@example.com");
    return r.body.codigo as string;
  };
  const br = await abrir("brisca"), cq = await abrir("conquian");
  c.avanzar(6000);
  const jug = (codigo: string, jugada: unknown) => c.call("POST", `/sala/${codigo}/respuesta`, "marisol@example.com", { jugada });
  assertEquals((await jug(br, { n: 0, accion: "jugar", carta: 39 })).status, 200);
  for (const mala of [{ n: 1, accion: "jugar", carta: 40 }, { n: 1, accion: "jugar" }, { n: 1, accion: "subir", monto: 5 }]) {
    assertEquals((await jug(br, mala)).body.error, "jugada_invalida", "brisca " + JSON.stringify(mala));
  }
  const t = await jug(cq, { n: 0, accion: "tomar", con: [1, 2], a: 0 });
  assertEquals([t.status, t.body.jugadas[0].con, t.body.jugadas[0].a], [200, [1, 2], 0]);
  assertEquals((await jug(cq, { n: 1, accion: "descartar", carta: 7 })).status, 200);
  assertEquals((await jug(cq, { n: 2, accion: "pasar" })).status, 200);
  for (const mala of [{ n: 3, accion: "tomar", con: [1, 1] }, { n: 3, accion: "tomar", con: [50] }, { n: 3, accion: "bajar", con: Array(9).fill(0).map((_, i) => i) },
    { n: 3, accion: "descartar" }, { n: 3, accion: "jugar", carta: 3 }, { n: 3, accion: "tomar", con: [1, 2, 3], a: 99 }]) {
    assertEquals((await jug(cq, mala)).body.error, "jugada_invalida", "conquián " + JSON.stringify(mala));
  }
  for (const juego of ["brisca", "conquian"]) {
    const p = await c.call("POST", "/partida", "marisol@example.com", { juego, puntos: 700, aciertos: 1, total: 1, segundos: 60 });
    assertEquals(p.status, 200, juego);
  }
});

// Ajedrez 1 vs 1 (openspec: ajedrez): reloj y validación de la jugada.
Deno.test("ajedrez en sala: reloj y jugadas válidas e inválidas", async () => {
  const c = ctx();
  const r = await c.call("POST", "/sala", "marisol@example.com", { juego: "ajedrez", opciones: { reloj: "5" }, bots: true });
  assertEquals([r.status, r.body.sala.opciones], [200, { reloj: "5" }]);
  const d = await c.call("POST", "/sala", "marisol@example.com", { juego: "ajedrez", opciones: { reloj: "99" }, bots: true });
  assertEquals(d.body.sala.opciones, { reloj: "10" }, "reloj por omisión");
  const codigo = r.body.codigo;
  await c.call("POST", `/sala/${codigo}/unirse`, "angel@example.com"); // 1 vs 1: sin rival no empieza
  await c.call("POST", `/sala/${codigo}/empezar`, "marisol@example.com");
  c.avanzar(6000);
  const jug = (jugada: unknown) => c.call("POST", `/sala/${codigo}/respuesta`, "marisol@example.com", { jugada });
  const ok = await jug({ n: 0, accion: "mover", de: "e2", a: "e4" });
  assertEquals([ok.status, ok.body.jugadas[0].de, ok.body.jugadas[0].a], [200, "e2", "e4"]);
  assertEquals((await jug({ n: 2, accion: "mover", de: "e7", a: "e8", promo: "q" })).status, 200);
  assertEquals((await jug({ n: 4, accion: "rendirse" })).status, 200);
  for (const mala of [{ n: 6, accion: "mover", de: "e9", a: "e4" }, { n: 6, accion: "mover", de: "e2" }, { n: 6, accion: "mover", de: "e7", a: "e8", promo: "k" }, { n: 6, accion: "jugar", carta: 1 }]) {
    assertEquals((await jug(mala)).body.error, "jugada_invalida", JSON.stringify(mala));
  }
  assertEquals((await c.call("POST", "/partida", "marisol@example.com", { juego: "ajedrez", puntos: 700, aciertos: 1, total: 1, segundos: 600 })).status, 200);
});

// Ajuste post-apply (openspec: ajedrez, cartas-espanolas): ajedrez solo 2 personas sin bots; Brisca cupo 4 con bots.
Deno.test("cupos: ajedrez 2 personas sin bots y Brisca hasta 4 con bots", async () => {
  const c = ctx();
  const extra = ["laura@example.com", "jesus@example.com", "sofy@example.com"];
  for (const e of extra) ingles.push({ alumno: e.split("@")[0], userEmails: [e], userNames: [e.split("@")[0]] });
  try {
    const aj = await c.call("POST", "/sala", "marisol@example.com", { juego: "ajedrez", opciones: {}, bots: true });
    assertEquals(aj.body.sala.bots, false, "el ajedrez nunca lleva bots");
    assertEquals((await c.call("POST", `/sala/${aj.body.codigo}/empezar`, "marisol@example.com")).body.error, "faltan_jugadores");
    assertEquals((await c.call("POST", `/sala/${aj.body.codigo}/unirse`, "angel@example.com")).status, 200);
    assertEquals((await c.call("POST", `/sala/${aj.body.codigo}/unirse`, "laura@example.com")).body.error, "sala_llena");
    assertEquals((await c.call("POST", `/sala/${aj.body.codigo}/empezar`, "marisol@example.com")).status, 200);
    const br = await c.call("POST", "/sala", "marisol@example.com", { juego: "brisca", opciones: {}, bots: false });
    assertEquals(br.body.sala.bots, true, "la Brisca siempre completa con bots");
    for (const e of ["angel@example.com", "laura@example.com", "jesus@example.com"]) assertEquals((await c.call("POST", `/sala/${br.body.codigo}/unirse`, e)).status, 200, e);
    assertEquals((await c.call("POST", `/sala/${br.body.codigo}/unirse`, "sofy@example.com")).body.error, "sala_llena");
  } finally { ingles.splice(2); }
});
