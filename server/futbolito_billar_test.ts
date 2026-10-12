// Futbolito y Billar en partida (openspec: futbolito-billar): sala 1 vs 1, validación de tiros, fin de partida y
// catálogo. Los motores (juegos/*-motor.js) se prueban en server/fisica_test.ts.
import { assert, assertEquals } from "jsr:@std/assert@1";
import { CATALOGO, clearCacheJuegos, handleJuegos } from "./juegos.ts";
import { clearCacheSalas, enMesa, JUEGOS_PARTIDA, MESAS } from "./salas.ts";
import { MemoryStore } from "./store.ts";

const ingles = [
  { alumno: "Marisol", userEmails: ["marisol@example.com"], userNames: ["Marisol"] },
  { alumno: "Angel", userEmails: ["angel@example.com"], userNames: ["Angel"] },
  { alumno: "Laura", userEmails: ["laura@example.com"], userNames: ["Laura"] },
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
  return { call, avanzar: (ms: number) => { t += ms; } };
}

// Sala empezada de 2 personas (Marisol anfitriona, Angel invitado).
async function salaDe(c: ReturnType<typeof ctx>, juego: string) {
  const r = await c.call("POST", "/sala", "marisol@example.com", { juego, opciones: {}, bots: false });
  assertEquals(r.status, 200, JSON.stringify(r.body));
  const codigo = r.body.codigo as string;
  assertEquals((await c.call("POST", `/sala/${codigo}/unirse`, "angel@example.com")).status, 200);
  assertEquals((await c.call("POST", `/sala/${codigo}/empezar`, "marisol@example.com")).status, 200);
  c.avanzar(6000);
  return codigo;
}
const jugada = (c: ReturnType<typeof ctx>, codigo: string, email: string, j: unknown) => c.call("POST", `/sala/${codigo}/respuesta`, email, { jugada: j });

Deno.test("futbolito-billar: se pueden crear en sala y están en el catálogo de Arcade con tope", () => {
  assert(JUEGOS_PARTIDA.has("futbolito") && JUEGOS_PARTIDA.has("billar"));
  assertEquals(CATALOGO.futbolito, { categoria: "arcade", titulo: "Futbolito", max: 1000 });
  assertEquals(CATALOGO.billar, { categoria: "arcade", titulo: "Billar bola 8", max: 1000 });
  assertEquals(MESAS.futbolito, { max: 2, asientos: 2, min: 2 });
  assertEquals(MESAS.billar, { max: 2, asientos: 2, min: 2 });
  assertEquals([enMesa("billar", 1, true), enMesa("billar", 1, false), enMesa("futbolito", 2, true)], [2, 1, 2]);
});

Deno.test("futbolito-billar: mesa 1 vs 1 (1 persona + bot empieza; sin bots faltan; la tercera no entra)", async () => {
  const c = ctx();
  for (const juego of ["futbolito", "billar"]) {
    const conBot = await c.call("POST", "/sala", "marisol@example.com", { juego, opciones: {}, bots: true });
    assertEquals([conBot.status, conBot.body.sala.bots], [200, true], juego);
    assertEquals((await c.call("POST", `/sala/${conBot.body.codigo}/empezar`, "marisol@example.com")).status, 200, juego + ": 1 persona + bot");
    const sinBot = await c.call("POST", "/sala", "marisol@example.com", { juego, opciones: {}, bots: false });
    assertEquals((await c.call("POST", `/sala/${sinBot.body.codigo}/empezar`, "marisol@example.com")).body.error, "faltan_jugadores", juego);
    assertEquals((await c.call("POST", `/sala/${sinBot.body.codigo}/unirse`, "angel@example.com")).status, 200);
    assertEquals((await c.call("POST", `/sala/${sinBot.body.codigo}/unirse`, "laura@example.com")).body.error, "sala_llena", juego);
    assertEquals((await c.call("POST", `/sala/${sinBot.body.codigo}/empezar`, "marisol@example.com")).status, 200, juego);
  }
});

Deno.test("billar: tiros válidos se guardan solo con sus campos; inválidos → jugada_invalida", async () => {
  const c = ctx();
  const codigo = await salaDe(c, "billar");
  const r = await jugada(c, codigo, "marisol@example.com", { n: 0, accion: "tiro", angulo: 3599, fuerza: 100, efecto: -100, carta: 3, extra: "x" });
  assertEquals(r.status, 200, JSON.stringify(r.body));
  const { t, ...guardada } = r.body.jugadas[0];
  assert(typeof t === "number");
  assertEquals(guardada, { n: 0, accion: "tiro", angulo: 3599, fuerza: 100, efecto: -100 });
  const sinEfecto = await jugada(c, codigo, "angel@example.com", { n: 1, accion: "tiro", angulo: 0, fuerza: 1 });
  assertEquals([sinEfecto.status, sinEfecto.body.jugadas[0].efecto], [200, undefined]);
  const malas = [
    { n: 2, accion: "tiro", angulo: 3600, fuerza: 50 }, { n: 2, accion: "tiro", angulo: -1, fuerza: 50 },
    { n: 2, accion: "tiro", angulo: 10, fuerza: 0 }, { n: 2, accion: "tiro", angulo: 10, fuerza: 101 },
    { n: 2, accion: "tiro", angulo: 10.5, fuerza: 50 }, { n: 2, accion: "tiro", angulo: 10, fuerza: 50, efecto: 101 },
    { n: 2, accion: "tiro", angulo: "10", fuerza: 50 }, { n: 2, accion: "tiro", fuerza: 50 },
    { n: 2, accion: "mover", de: "e2", a: "e4" }, { n: 2, accion: "jugar", carta: 1 }, { n: -1, accion: "tiro", angulo: 1, fuerza: 1 },
  ];
  for (const m of malas) assertEquals((await jugada(c, codigo, "marisol@example.com", m)).body.error, "jugada_invalida", JSON.stringify(m));
  assertEquals((await jugada(c, codigo, "marisol@example.com", { n: 1, accion: "tiro", angulo: 5, fuerza: 5 })).body.error, "turno_tomado");
  const rendirse = await jugada(c, codigo, "marisol@example.com", { n: 2, accion: "rendirse", angulo: 4 });
  assertEquals([rendirse.status, rendirse.body.jugadas.at(-1).accion, rendirse.body.jugadas.at(-1).angulo], [200, "rendirse", undefined]);
});

Deno.test("futbolito: tiros válidos se guardan solo con sus campos; inválidos → jugada_invalida", async () => {
  const c = ctx();
  const codigo = await salaDe(c, "futbolito");
  const r = await jugada(c, codigo, "marisol@example.com", { n: 0, accion: "tiro", pos: -150, angulo: 60, fuerza: 10, efecto: 5 });
  assertEquals(r.status, 200, JSON.stringify(r.body));
  const { t: _t, ...guardada } = r.body.jugadas[0];
  assertEquals(guardada, { n: 0, accion: "tiro", pos: -150, angulo: 60, fuerza: 10 });
  assertEquals((await jugada(c, codigo, "angel@example.com", { n: 1, accion: "tiro", pos: 150, angulo: -60, fuerza: 100 })).status, 200);
  const malas = [
    { n: 2, accion: "tiro", pos: 151, angulo: 0, fuerza: 50 }, { n: 2, accion: "tiro", pos: 0, angulo: 61, fuerza: 50 },
    { n: 2, accion: "tiro", pos: 0, angulo: -90, fuerza: 50 }, { n: 2, accion: "tiro", pos: 0, angulo: 0, fuerza: 9 },
    { n: 2, accion: "tiro", pos: 0, angulo: 0, fuerza: 101 }, { n: 2, accion: "tiro", pos: 0.5, angulo: 0, fuerza: 50 },
    { n: 2, accion: "tiro", angulo: 0, fuerza: 50 }, { n: 2, accion: "patear" }, { n: 2 }, { n: 2, accion: "tiro", pos: 0, angulo: 0, fuerza: "50" },
  ];
  for (const m of malas) assertEquals((await jugada(c, codigo, "marisol@example.com", m)).body.error, "jugada_invalida", JSON.stringify(m));
  assertEquals((await jugada(c, codigo, "angel@example.com", { n: 2, accion: "rendirse" })).status, 200);
});

Deno.test("futbolito-billar: con la partida terminada (final registrado) no se aceptan más jugadas", async () => {
  const c = ctx();
  for (const juego of ["futbolito", "billar"]) {
    const codigo = await salaDe(c, juego);
    const tiro = juego === "billar" ? { accion: "tiro", angulo: 0, fuerza: 50 } : { accion: "tiro", pos: 0, angulo: 0, fuerza: 50 };
    assertEquals((await jugada(c, codigo, "marisol@example.com", { n: 0, ...tiro })).status, 200, juego);
    assertEquals((await c.call("POST", `/sala/${codigo}/respuesta`, "angel@example.com", { final: 410 })).status, 200);
    const tarde = await jugada(c, codigo, "marisol@example.com", { n: 1, ...tiro });
    assertEquals([tarde.status, tarde.body.error], [409, "partida_terminada"], juego);
    // El cierre de cada quien sí se sigue registrando (podio del anfitrión).
    assertEquals((await c.call("POST", `/sala/${codigo}/respuesta`, "marisol@example.com", { final: 900, podio: [{ nombre: "Marisol", total: 900 }] })).status, 200);
    // La revancha se puede pedir: la partida terminó.
    assertEquals((await c.call("POST", `/sala/${codigo}/revancha`, "angel@example.com")).status, 200, juego);
  }
});

Deno.test("futbolito-billar: otros juegos por turnos siguen aceptando jugadas tras un final (sin cambio)", async () => {
  const c = ctx();
  const codigo = await salaDe(c, "ajedrez");
  assertEquals((await c.call("POST", `/sala/${codigo}/respuesta`, "angel@example.com", { final: 10 })).status, 200);
  assertEquals((await jugada(c, codigo, "marisol@example.com", { n: 0, accion: "mover", de: "e2", a: "e4" })).status, 200);
});

Deno.test("futbolito-billar: puntos individuales con tope de 1000", async () => {
  const c = ctx();
  const r = await c.call("POST", "/partida", "marisol@example.com", { juego: "billar", puntos: 5000, aciertos: 7, total: 7, segundos: 300 });
  assertEquals([r.status, r.body.puntos], [200, 1000]);
  const f = await c.call("POST", "/partida", "marisol@example.com", { juego: "futbolito", puntos: 650, aciertos: 5, total: 5, segundos: 200 });
  assertEquals([f.status, f.body.puntos], [200, 650]);
});
