// Futbolito por equipos (openspec: futbolito-equipos-controles): formato 1 vs 1 / 2 vs 2, mesa por formato, equipos
// automáticos y a pedido, dueño de la barra en cada tiro; y en los motores: reparto (igual al del servidor), turno por
// asiento, línea de sala con `valida` y barra activa con histéresis.
// deno-lint-ignore-file no-explicit-any
import { assert, assertEquals } from "jsr:@std/assert@1";
import { clearCacheJuegos, handleJuegos } from "./juegos.ts";
import { clearCacheSalas, enMesa, mesaDe } from "./salas.ts";
import { BARRAS_ROL, repartir } from "./futbolito.ts";
import { MemoryStore } from "./store.ts";
import "../juegos/fisica.js";
import "../juegos/futbolito-motor.js";
import "../juegos/mesas.js";

const g = globalThis as any;
const F = g.Fisica, T = g.Futbolito, Mesas = g.Mesas;

const ingles = ["Marisol", "Angel", "Laura", "Fernando", "Jesus"].map((n) => ({ alumno: n, userEmails: [n.toLowerCase() + "@example.com"], userNames: [n] }));
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s });
const correo = (n: string) => n + "@example.com";

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
    const email = correo(quien);
    const req = new Request(`http://x/juegos${sub}?email=${encodeURIComponent(email)}`, { method, body: body === undefined ? undefined : JSON.stringify(body) });
    const res = await handleJuegos(req, sub, email, deps, json);
    return { status: res.status, body: await res.json() };
  };
  return { call, avanzar: (ms: number) => { t += ms; } };
}
type Ctx = ReturnType<typeof ctx>;
async function crear(c: Ctx, formato: string | undefined, bots: boolean) {
  const r = await c.call("POST", "/sala", "marisol", { juego: "futbolito", opciones: formato === undefined ? {} : { formato }, bots });
  assertEquals(r.status, 200, JSON.stringify(r.body));
  return r.body.codigo as string;
}
const unirse = (c: Ctx, codigo: string, quien: string, body?: unknown) => c.call("POST", `/sala/${codigo}/unirse`, quien, body);
const empezar = async (c: Ctx, codigo: string) => { const r = await c.call("POST", `/sala/${codigo}/empezar`, "marisol"); c.avanzar(6000); return r; };
const tiro = (c: Ctx, codigo: string, quien: string, j: Record<string, unknown>) => c.call("POST", `/sala/${codigo}/respuesta`, quien, { jugada: { accion: "tiro", pos: 0, angulo: 0, fuerza: 60, ...j } });

// ---------- Servidor ----------
Deno.test("futbolito-equipos: formato 1v1 por omisión, 2v2 a pedido e inválido → 400", async () => {
  const c = ctx();
  const r1 = await c.call("POST", "/sala", "marisol", { juego: "futbolito", opciones: {}, bots: true });
  assertEquals(r1.body.sala.opciones.formato, "1v1");
  const r2 = await c.call("POST", "/sala", "marisol", { juego: "futbolito", opciones: { formato: "2v2" }, bots: true });
  assertEquals(r2.body.sala.opciones.formato, "2v2");
  const mal = await c.call("POST", "/sala", "marisol", { juego: "futbolito", opciones: { formato: "3v3" }, bots: true });
  assertEquals([mal.status, mal.body.error], [400, "formato_invalido"]);
  const billar = await c.call("POST", "/sala", "marisol", { juego: "billar", opciones: { formato: "2v2" }, bots: true });
  assertEquals([billar.status, billar.body.sala.opciones.formato], [200, undefined], "billar no tiene formato");
});

Deno.test("futbolito-equipos: mesa por formato (tabla igual en servidor y página)", () => {
  assertEquals(mesaDe("futbolito", { formato: "2v2" })!.asientos, 4);
  assertEquals(mesaDe("futbolito", { formato: "1v1" })!.max, 2);
  assertEquals(mesaDe("futbolito")!.max, 2);
  assertEquals([enMesa("futbolito", 1, true, { formato: "2v2" }), enMesa("futbolito", 3, false, { formato: "2v2" }), enMesa("futbolito", 1, true)], [4, 3, 2]);
  assertEquals(Mesas.de("futbolito", { formato: "2v2" }).max, 4);
  assertEquals([Mesas.botsEnMesa("futbolito", 2, true, { formato: "2v2" }), Mesas.botsEnMesa("futbolito", 1, true)], [2, 1]);
  assertEquals(Mesas.textoMesa("futbolito", 2, 2, { formato: "2v2" }), "Mesa de 4 · 2 personas + 2 bots");
});

Deno.test("futbolito-equipos: 2v2 admite 4 personas (la quinta no), sin bots empieza con 2 y con bots con 1", async () => {
  const c = ctx();
  const codigo = await crear(c, "2v2", false);
  for (const q of ["angel", "laura", "fernando"]) assertEquals((await unirse(c, codigo, q)).status, 200, q);
  assertEquals((await unirse(c, codigo, "jesus")).body.error, "sala_llena");
  const sinBots = await crear(c, "2v2", false);
  assertEquals((await empezar(c, sinBots)).body.error, "faltan_jugadores");
  await unirse(c, sinBots, "angel");
  assertEquals((await empezar(c, sinBots)).status, 200, "2 personas sin bots");
  const conBots = await crear(c, "2v2", true);
  assertEquals((await empezar(c, conBots)).status, 200, "1 persona + 3 bots");
});

Deno.test("futbolito-equipos: cambiar de equipo antes de empezar (lleno, inválido, sin equipos, ya empezó)", async () => {
  const c = ctx();
  const codigo = await crear(c, "2v2", true);
  await unirse(c, codigo, "angel");
  const r = await unirse(c, codigo, "angel", { equipo: 0 });
  assertEquals([r.status, r.body.equipo], [200, 0]);
  const sala = await c.call("GET", `/sala/${codigo}`, "marisol");
  assertEquals(sala.body.jugadores.find((j: any) => j.nombre === "Angel").equipo, 0);
  assertEquals((await unirse(c, codigo, "marisol", { equipo: 1 })).status, 200);
  await unirse(c, codigo, "laura", { equipo: 1 });
  const lleno = await unirse(c, codigo, "fernando", { equipo: 1 });
  assertEquals([lleno.status, lleno.body.error], [409, "equipo_lleno"]);
  assertEquals((await unirse(c, codigo, "fernando")).status, 200, "sin preferencia sí entra");
  assertEquals((await unirse(c, codigo, "angel", { equipo: 2 })).body.error, "equipo_invalido");
  const uno = await crear(c, "1v1", true);
  assertEquals((await unirse(c, uno, "marisol", { equipo: 1 })).body.error, "sin_equipos");
  await empezar(c, codigo);
  assertEquals((await unirse(c, codigo, "angel", { equipo: 1 })).body.error, "ya_empezo");
});

Deno.test("futbolito-equipos: en 2v2 cada tiro lleva su barra y solo vale la del asiento de quien tira", async () => {
  const c = ctx();
  const codigo = await crear(c, "2v2", true);
  await unirse(c, codigo, "angel"); // Marisol equipo 0 (adelante), Angel equipo 1 (adelante); bots atrás
  await empezar(c, codigo);
  const ok = await tiro(c, codigo, "marisol", { n: 0, barra: 4 });
  assertEquals(ok.status, 200, JSON.stringify(ok.body));
  const { t: _t, ...guardada } = ok.body.jugadas[0];
  assertEquals(guardada, { n: 0, accion: "tiro", pos: 0, angulo: 0, fuerza: 60, barra: 4 });
  const sinBarra = await tiro(c, codigo, "marisol", { n: 1 });
  assertEquals([sinBarra.status, sinBarra.body.error], [400, "jugada_invalida"]);
  const ajena = await tiro(c, codigo, "marisol", { n: 1, barra: 6 }); // defensa: es del bot de su equipo
  assertEquals([ajena.status, ajena.body.error], [409, "no_es_tu_barra"]);
  const rival = await tiro(c, codigo, "angel", { n: 1, barra: 4 });
  assertEquals([rival.status, rival.body.error], [409, "no_es_tu_barra"]);
  assertEquals((await tiro(c, codigo, "angel", { n: 1, barra: 5 })).status, 200);
  for (const b of [-1, 8, 2.5, "4"]) assertEquals((await tiro(c, codigo, "angel", { n: 2, barra: b })).body.error, "jugada_invalida", String(b));
  assertEquals((await c.call("POST", `/sala/${codigo}/respuesta`, "angel", { jugada: { n: 2, accion: "rendirse" } })).status, 200);
});

Deno.test("futbolito-equipos: en 1v1 la barra es opcional pero, si viene, debe ser del equipo de quien tira", async () => {
  const c = ctx();
  const codigo = await crear(c, undefined, false);
  await unirse(c, codigo, "angel");
  await empezar(c, codigo);
  assertEquals((await tiro(c, codigo, "marisol", { n: 0 })).status, 200);
  assertEquals((await tiro(c, codigo, "angel", { n: 1, barra: 4 })).body.error, "no_es_tu_barra");
  assertEquals((await tiro(c, codigo, "angel", { n: 1, barra: 0 })).status, 200);
});

Deno.test("futbolito-equipos: 2 vs 1 sin bots; el que juega solo maneja las 4 barras", async () => {
  const c = ctx();
  const codigo = await crear(c, "2v2", false);
  await unirse(c, codigo, "angel"); await unirse(c, codigo, "laura");
  await empezar(c, codigo); // Marisol 0, Angel 1, Laura 0
  for (const b of [0, 1, 3, 5]) assertEquals((await tiro(c, codigo, "angel", { n: b + 10, barra: b })).status, 200, "Angel solo: barra " + b);
  assertEquals((await tiro(c, codigo, "laura", { n: 30, barra: 7 })).status, 200, "Laura atrás: portero");
  assertEquals((await tiro(c, codigo, "laura", { n: 31, barra: 4 })).body.error, "no_es_tu_barra");
});

// ---------- Motores ----------
const B = (eq: number, rol: "todas" | "adelante" | "atras") => BARRAS_ROL[eq][rol];
Deno.test("futbolito-equipos: reparto automático, preferencias y 2 vs 1", () => {
  const r = T.repartir([{ id: "a" }, { id: "b" }, { id: "x", bot: true }, { id: "y", bot: true }]);
  assertEquals(r.map((s: any) => [s.eq, s.rol]), [[0, "adelante"], [1, "adelante"], [0, "atras"], [1, "atras"]]);
  assertEquals(r[0].barras, [2, 4]); assertEquals(r[2].barras, [6, 7]); assertEquals(r[1].barras, [3, 5]); assertEquals(r[3].barras, [0, 1]);
  assertEquals(B(0, "todas"), [2, 4, 6, 7]);
  const juntos = T.repartir([{ id: "a", equipo: 0 }, { id: "b", equipo: 0 }, { id: "x", bot: true }, { id: "y", bot: true }]);
  assertEquals(juntos.map((s: any) => s.eq), [0, 0, 1, 1]);
  const cambia = T.repartir([{ id: "m" }, { id: "a", equipo: 0 }, { id: "x", bot: true }, { id: "y", bot: true }]);
  assertEquals(cambia.map((s: any) => [s.eq, s.rol]), [[0, "adelante"], [0, "atras"], [1, "adelante"], [1, "atras"]], "Angel se cambia al equipo de Marisol");
  const tres = T.repartir([{ id: "a" }, { id: "b" }, { id: "c" }]);
  assertEquals(tres.map((s: any) => [s.eq, s.rol]), [[0, "adelante"], [1, "todas"], [0, "atras"]]);
  const uno = T.repartir([{ id: "a" }, { id: "x", bot: true }]);
  assertEquals(uno.map((s: any) => [s.eq, s.rol]), [[0, "todas"], [1, "todas"]]);
  const llenos = T.repartir([{ id: "a", equipo: 1 }, { id: "b", equipo: 1 }, { id: "c", equipo: 1 }, { id: "x", bot: true }]);
  assertEquals(llenos.map((s: any) => s.eq), [1, 1, 0, 0], "la tercera preferencia no cabe");
});

Deno.test("futbolito-equipos: el reparto de la página y el del servidor son iguales", () => {
  const rnd = F.rng(7, "reparto");
  for (let k = 0; k < 400; k++) {
    const n = 2 + Math.floor(rnd() * 3), humanos = 1 + Math.floor(rnd() * n);
    const asientos = Array.from({ length: n }, (_, i) => i < humanos ? { id: "p" + i, ...(rnd() < 0.5 ? { equipo: rnd() < 0.5 ? 0 : 1 } : {}) } : { id: "b" + i, bot: true });
    assertEquals(T.repartir(asientos), repartir(asientos), JSON.stringify(asientos));
  }
});

Deno.test("futbolito-equipos: motorSala da el turno al asiento dueño de la barra con la pelota y rendirse es por equipo", () => {
  const rep = T.repartir([{ id: "a" }, { id: "b" }, { id: "x", bot: true }, { id: "y", bot: true }]);
  const M = T.motorSala(rep);
  const st = M.inicial(5);
  assertEquals(M.turno(st), 0, "saca el equipo 0 desde sus medios: a");
  T.darPosesion(st, 6, 0, 0); assertEquals(M.turno(st), 2, "defensa del equipo 0: el bot x");
  T.darPosesion(st, 3, 2, 0); assertEquals(M.turno(st), 1, "medios del equipo 1: b");
  assertEquals(M.rendir(st, 1).fin.gana, 0);
  assertEquals(M.rendir(st, 2).fin.gana, 1);
  assertEquals([M.valida(st, { barra: 3 }), M.valida(st, { barra: 4 }), M.valida(st, {})], [true, false, true]);
  assertEquals(T.puntosAsiento(Object.assign(F.clonar(st), { marcador: [5, 2], fin: { gana: 0 } }), rep, 2), 650);
});

Deno.test("futbolito-equipos: la línea de sala ignora un tiro con una barra que no tiene la pelota", () => {
  const rep = T.repartir([{ id: "a" }, { id: "b" }]);
  const M = T.motorSala(rep), orden = [{ id: "a" }, { id: "b" }];
  const base = { motor: M, seed: 9, orden, inicio: 0, turnoMs: 30000, botMs: 1500 };
  const mala = F.linea({ ...base, jugadas: [{ n: 0, accion: "tiro", pos: 0, angulo: 0, fuerza: 60, barra: 2, t: 100, jugador: "a" }], ahora: 1000 });
  assertEquals([mala.paso, mala.espera.idx, mala.espera.tipo], [0, 0, "persona"]);
  const buena = F.linea({ ...base, jugadas: [{ n: 0, accion: "tiro", pos: 0, angulo: 0, fuerza: 60, barra: 4, t: 100, jugador: "a" }], ahora: 1000 });
  assertEquals(buena.paso, 1);
});

Deno.test("futbolito-equipos: barra activa con la pelota pegada por detrás y con histéresis", () => {
  const st = T.nuevo();
  const en = (y: number) => { st.pelota.y = y; st.pelota.x = 150; return st; };
  assertEquals(T.barraActivaCon(en(278), 0, -1), 4, "pegada por detrás de los medios");
  assertEquals(T.barraActivaCon(en(290), 0, 4), 4, "zona dudosa: se queda la actual");
  assertEquals(T.barraActivaCon(en(290), 0, 6), 6, "zona dudosa: se queda la actual");
  assertEquals(T.barraActivaCon(en(300), 0, 4), 6, "ya pasó: la defensa");
  assertEquals(T.barraActivaCon(en(260), 0, 6), 4, "delante de los medios");
  assertEquals(T.barraActivaCon(en(225), 1, -1), 3, "equipo 1 (ataca hacia abajo): pelota delante de sus medios");
  assertEquals(T.barraActivaCon(en(200), 1, -1), 3, "equipo 1: pegada por detrás de sus medios");
  assert(T.barraActivaCon(en(100), 0, 2) === 2);
});
