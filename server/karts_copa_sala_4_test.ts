// karts-copa-sala-4 (sprint 43a): la copa en sala siempre corre sus 4 carreras y la espera entre carreras es corta.
// Reproduce el reporte del profe («solo hubo 2 premios, ya no se llevaron las 4 carreras») y fija la regla nueva:
// al llegar la primera persona a la meta, las demás tienen KartsCopa.PLAZO_MS (45 s, karts-plazo-45) para terminar
// (reloj del servidor).
// deno-lint-ignore-file no-explicit-any
import { assert, assertEquals } from "jsr:@std/assert@1";
import { clearCacheJuegos, handleJuegos } from "./juegos.ts";
import { clearCacheSalas } from "./salas.ts";
import { MemoryStore } from "./store.ts";
import "../juegos/karts-copa.js";

const G = globalThis as any;
const KC = G.KartsCopa, A = G.Arcade;
const NOMBRES = ["Marisol", "Angel", "Laura"];
const correo = (n: string) => n.toLowerCase() + "@example.com";
const ingles = NOMBRES.map((n) => ({ alumno: n, userEmails: [correo(n)], userNames: [n] }));
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s });

function ctx() {
  clearCacheJuegos();
  const store = new MemoryStore();
  let t = Date.parse("2026-10-18T18:00:00.000Z");
  const deps = {
    store, admin: "admin@example.com", filasIngles: () => Promise.resolve(ingles), filasSecundaria: () => Promise.resolve([]),
    hoy: () => "2026-10-18", ahora: () => new Date(t).toISOString(),
  };
  const call = async (method: string, sub: string, n: string, body?: unknown) => {
    clearCacheSalas();
    const req = new Request(`http://x/juegos${sub}?email=${encodeURIComponent(correo(n))}`, { method, body: body === undefined ? undefined : JSON.stringify(body) });
    const res = await handleJuegos(req, sub, correo(n), deps, json);
    return { status: res.status, body: await res.json() as any };
  };
  return { call, ahora: () => t, ir: (ms: number) => { t = ms; } };
}
type C = ReturnType<typeof ctx>;

async function salaEmpezada(c: C, opciones: Record<string, string>, quienes = ["Angel"]) {
  const r = await c.call("POST", "/sala", "Marisol", { juego: "karts", opciones, bots: true });
  assertEquals(r.status, 200, JSON.stringify(r.body));
  const codigo = r.body.codigo as string;
  for (const n of quienes) assertEquals((await c.call("POST", `/sala/${codigo}/unirse`, n)).status, 200); // NOSONAR: en orden
  const e = await c.call("POST", `/sala/${codigo}/empezar`, "Marisol");
  c.ir(e.body.sala.inicio);
  return codigo;
}
const reportar = (c: C, codigo: string, n: string, carrera: number, ms: number | null, extra: Record<string, unknown> = {}) =>
  c.call("POST", `/sala/${codigo}/respuesta`, n, { copa: { carrera, ms, monedas: 2, ...extra } });
const vista = async (c: C, codigo: string) => (await c.call("GET", `/sala/${codigo}`, "Marisol")).body;
async function aLaCarrera(c: C, codigo: string, k: number) {
  const cal = (await vista(c, codigo)).copa.calendario[k];
  assert(cal, "carrera " + k + " con hora de inicio");
  if (c.ahora() < cal.inicio) c.ir(cal.inicio);
  return cal.inicio as number;
}
const ref = (pista: string) => A.refKarts(pista) as number;

Deno.test("karts-copa-sala-4: quien se perdió una carrera vuelve a contar en las siguientes (las 4 se corren para los 2)", async () => {
  const c = ctx();
  const codigo = await salaEmpezada(c, { modo: "copa", copa: "fiesta" });
  const pistas = (await vista(c, codigo)).copa.pistas as string[];
  // Carrera 1: Angel no la reporta (su página se enteró tarde y la abandonó, o cerró la pestaña).
  let i = await aLaCarrera(c, codigo, 0);
  c.ir(i + 15_000);
  assertEquals((await c.call("POST", `/sala/${codigo}/respuesta`, "Angel", { copa: { carrera: 0, abandono: true } })).status, 200);
  c.ir(i + ref(pistas[0]));
  assertEquals((await reportar(c, codigo, "Marisol", 0, ref(pistas[0]))).status, 200);
  // Carreras 2 a 4: Angel corre y llega 5 s después de Marisol; su tiempo SIEMPRE cuenta.
  for (let k = 1; k < 4; k++) {
    i = await aLaCarrera(c, codigo, k); // NOSONAR: en orden
    const ms = ref(pistas[k]);
    c.ir(i + ms);
    assertEquals((await reportar(c, codigo, "Marisol", k, ms)).status, 200, "Marisol carrera " + (k + 1)); // NOSONAR: en orden
    const v = await vista(c, codigo); // NOSONAR: en orden
    assertEquals([v.copa.fase, v.copa.carrera], ["carrera", k], "la carrera sigue abierta para Angel (carrera " + (k + 1) + ")");
    c.ir(i + ms + 5_000);
    const r = await reportar(c, codigo, "Angel", k, ms + 5_000); // NOSONAR: en orden
    assertEquals(r.status, 200, "Angel carrera " + (k + 1) + ": " + JSON.stringify(r.body));
    const v2 = await vista(c, codigo); // NOSONAR: en orden
    assertEquals(v2.copa.fase, k < 3 ? "interpodio" : "final", "podio solo al final");
  }
  const fin = await vista(c, codigo);
  const angel = fin.copa.tabla.find((x: any) => x.nombre === "Angel");
  assertEquals(fin.copa.resultados.length, 4, "4 carreras con resultado");
  assertEquals(angel.porCarrera.map((x: any) => x.ms === null), [true, false, false, false], "Angel: NT en la 1 y tiempo en las otras 3");
  assert(angel.pts > 0);
});

Deno.test("karts-copa-sala-4: al vencer el plazo tras la primera llegada la carrera cierra (y la siguiente arranca sola)", async () => {
  const c = ctx();
  const codigo = await salaEmpezada(c, { modo: "copa", copa: "mesoamerica" }, ["Angel", "Laura"]);
  assertEquals(KC.PLAZO_MS, 45_000); // karts-plazo-45
  const pistas = (await vista(c, codigo)).copa.pistas as string[];
  const i = await aLaCarrera(c, codigo, 0);
  const llega = i + ref(pistas[0]);
  c.ir(llega);
  assertEquals((await reportar(c, codigo, "Marisol", 0, ref(pistas[0]))).status, 200);
  let v = await vista(c, codigo);
  assertEquals(v.copa.calendario[0].plazo, llega + KC.PLAZO_MS, "plazo visible para la cuenta «N s para terminar»");
  c.ir(llega + KC.PLAZO_MS - 1_000); // karts-plazo-45: un 2.º lugar 44 s después cuenta
  assertEquals((await reportar(c, codigo, "Angel", 0, ref(pistas[0]) + KC.PLAZO_MS - 1_000)).status, 200, "dentro del plazo cuenta");
  c.ir(llega + KC.PLAZO_MS - 1);
  assertEquals((await vista(c, codigo)).copa.fase, "carrera");
  c.ir(llega + KC.PLAZO_MS);
  v = await vista(c, codigo);
  assertEquals([v.copa.fase, v.copa.carrera], ["interpodio", 1], "Laura no llegó: cierra al vencer el plazo, sin esperar el límite de la pista");
  assertEquals(v.copa.calendario[0].cierre, llega + KC.PLAZO_MS);
  assertEquals(v.copa.calendario[1].inicio, llega + KC.PLAZO_MS + KC.INTERPODIO_MS, "tabla entre carreras ≤ 10 s");
  assert(KC.INTERPODIO_MS <= 10_000);
  const laura = v.copa.tabla.find((x: any) => x.nombre === "Laura");
  assertEquals([laura.porCarrera[0].ms, laura.porCarrera[0].pts], [null, 0], "NT, 0 puntos");
  const tarde = await reportar(c, codigo, "Laura", 0, ref(pistas[0]) + KC.PLAZO_MS + 1_000);
  assertEquals([tarde.status, tarde.body.error], [409, "carrera_cerrada"], "nadie alarga la carrera");
  // En la carrera 2, Laura vuelve a contar: cierra cuando llegan los 3 (sin esperar el plazo).
  const i1 = await aLaCarrera(c, codigo, 1);
  const ms1 = ref(pistas[1]);
  for (const [n, d] of [["Laura", 0], ["Marisol", 1_000], ["Angel", 2_000]] as const) {
    c.ir(i1 + ms1 + d);
    assertEquals((await reportar(c, codigo, n, 1, ms1 + d)).status, 200, n); // NOSONAR: en orden
  }
  v = await vista(c, codigo);
  assertEquals([v.copa.fase, v.copa.calendario[1].cierre], ["interpodio", i1 + ms1 + 2_000], "todos llegaron: cierra al instante");
});

Deno.test("karts-copa-sala-4: reportes duplicados (dos aparatos o reintentos) no adelantan ni repiten carreras", async () => {
  const c = ctx();
  const codigo = await salaEmpezada(c, { modo: "copa", copa: "reinos" });
  const pistas = (await vista(c, codigo)).copa.pistas as string[];
  for (let k = 0; k < 4; k++) {
    const i = await aLaCarrera(c, codigo, k); // NOSONAR: en orden
    const ms = ref(pistas[k]);
    c.ir(i + ms);
    assertEquals((await reportar(c, codigo, "Marisol", k, ms)).status, 200); // NOSONAR: en orden
    const dup = await reportar(c, codigo, "Marisol", k, ms + 500); // NOSONAR: en orden
    assertEquals(dup.status, 200, "el reintento no truena (solo cuenta el primero)");
    const sig = await reportar(c, codigo, "Marisol", k + 1, ms); // NOSONAR: en orden
    assertEquals(sig.status, k < 3 ? 409 : 400, "no se puede adelantar a la siguiente");
    const v = await vista(c, codigo); // NOSONAR: en orden
    assertEquals([v.copa.fase, v.copa.carrera], ["carrera", k], "sigue la carrera " + (k + 1) + " (falta Angel)");
    c.ir(i + ms + KC.PLAZO_MS);
    const v2 = await vista(c, codigo); // NOSONAR: en orden
    assertEquals(v2.copa.fase, k < 3 ? "interpodio" : "final");
  }
  const fin = await vista(c, codigo);
  const marisol = fin.copa.tabla.find((x: any) => x.nombre === "Marisol");
  assertEquals(marisol.porCarrera.length, 4);
  assertEquals(fin.copa.calendario.length, 4);
});

Deno.test("karts-copa-sala-4: quien no termina queda NT ordenado por su avance; tiempos imposibles se rechazan", async () => {
  const c = ctx();
  const codigo = await salaEmpezada(c, { modo: "copa", copa: "fiesta" }, ["Angel", "Laura"]);
  const pistas = (await vista(c, codigo)).copa.pistas as string[];
  const i = await aLaCarrera(c, codigo, 0);
  c.ir(i + 5_000);
  const imposible = await reportar(c, codigo, "Angel", 0, 4_000);
  assertEquals([imposible.status, imposible.body.error], [400, "carrera_invalida"], "más rápido que el mínimo");
  c.ir(i + ref(pistas[0]));
  assertEquals((await reportar(c, codigo, "Marisol", 0, ref(pistas[0]))).status, 200);
  const adelantado = await reportar(c, codigo, "Angel", 0, ref(pistas[0]) + 60_000);
  assertEquals([adelantado.status, adelantado.body.error], [400, "carrera_invalida"], "más tiempo del que va en el reloj del servidor");
  c.ir(i + ref(pistas[0]) + 29_000);
  // Al cerrar el plazo el juego manda «no terminó» con su avance (‰).
  assertEquals((await reportar(c, codigo, "Angel", 0, null, { avance: 800 })).status, 200);
  const malo = await reportar(c, codigo, "Laura", 0, null, { avance: 5000 });
  assertEquals(malo.status, 400, "avance fuera de rango");
  assertEquals((await reportar(c, codigo, "Laura", 0, null, { avance: 300 })).status, 200);
  const v = await vista(c, codigo);
  assertEquals(v.copa.fase, "interpodio", "todos reportaron: cierra");
  const r0 = v.copa.resultados[0] as any[];
  const orden = r0.map((f) => v.copa.tabla.find((t: any) => t.id === f.id).nombre).filter((n: string) => !n.startsWith("BOT"));
  assertEquals(orden, ["Marisol", "Angel", "Laura"], "NT ordenados por avance");
  assertEquals(r0.filter((f) => f.ms === null).map((f) => f.pts), [0, 0], "NT = 0 puntos");
});

Deno.test("karts-copa-sala-4: carrera suelta en sala: el plazo tras la primera llegada cierra el podio", async () => {
  const c = ctx();
  const codigo = await salaEmpezada(c, { mapa: "hielo" }, ["Angel"]);
  const i = c.ahora();
  const ms = ref("hielo");
  c.ir(i + ms);
  const r = await c.call("POST", `/sala/${codigo}/respuesta`, "Marisol", { carrera: { ms, monedas: 1 } });
  assertEquals(r.status, 200);
  const p0 = await c.call("POST", "/partida", "Marisol", { juego: "karts", puntos: 9_999, aciertos: 0, total: 0, segundos: 0, sala: codigo });
  assertEquals(p0.status, 409, "todavía en curso: " + JSON.stringify(p0.body));
  c.ir(i + ms + KC.PLAZO_MS);
  const tarde = await c.call("POST", `/sala/${codigo}/respuesta`, "Angel", { carrera: { ms: ms + KC.PLAZO_MS, monedas: 1 } });
  assertEquals([tarde.status, tarde.body.error], [409, "carrera_cerrada"]);
  const p = await c.call("POST", "/partida", "Marisol", { juego: "karts", puntos: 9_999, aciertos: 0, total: 0, segundos: 0, sala: codigo });
  assertEquals(p.status, 200, "al vencer el plazo ya hay podio: " + JSON.stringify(p.body));
  assert(p.body.puntos > 0);
});
