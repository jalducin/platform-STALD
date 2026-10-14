// Ganador y puntos de las carreras de Karts en sala (openspec: karts-salida-y-puntos), con almacén en memoria y reloj
// controlado: gana quien llega primero aunque traiga menos monedas, el servidor calcula los puntos (ignora los de la
// página), 409 carrera_en_curso con la carrera abierta, quien no terminó va después (por su avance), los puntos por lugar
// son estrictamente decrecientes y, en la copa, los puntos de partida siguen el orden de la tabla.
// deno-lint-ignore-file no-explicit-any
import { assert, assertEquals } from "jsr:@std/assert@1";
import { clearCacheJuegos, handleJuegos } from "./juegos.ts";
import { clearCacheSalas } from "./salas.ts";
import { MemoryStore } from "./store.ts";
import "../juegos/karts-copa.js";

const G = globalThis as any;
const A = G.Arcade, KC = G.KartsCopa;
const NOMBRES = ["Marisol", "Angel", "Laura", "Beto"];
const correo = (n: string) => n.toLowerCase() + "@example.com";
const ingles = NOMBRES.map((n) => ({ alumno: n, userEmails: [correo(n)], userNames: [n] }));
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s });

function ctx() {
  clearCacheJuegos();
  const store = new MemoryStore();
  let t = Date.parse("2026-10-14T18:00:00.000Z");
  const deps = {
    store, admin: "admin@example.com", filasIngles: () => Promise.resolve(ingles), filasSecundaria: () => Promise.resolve([]),
    hoy: () => "2026-10-14", ahora: () => new Date(t).toISOString(),
  };
  const call = async (method: string, sub: string, n: string, body?: unknown) => {
    clearCacheSalas();
    const req = new Request(`http://x/juegos${sub}?email=${encodeURIComponent(correo(n))}`, { method, body: body === undefined ? undefined : JSON.stringify(body) });
    const res = await handleJuegos(req, sub, correo(n), deps, json);
    return { status: res.status, body: await res.json() as any };
  };
  return { call, ir: (ms: number) => { t = ms; }, avanzar: (ms: number) => { t += ms; } };
}
type C = ReturnType<typeof ctx>;

// Sala de una carrera en `mapa` con Marisol (anfitriona) y quienes se pidan, ya empezada; devuelve código e inicio.
async function carreraEmpezada(c: C, mapa: string, quienes: string[], bots = true) {
  const r = await c.call("POST", "/sala", "Marisol", { juego: "karts", opciones: { mapa }, bots });
  assertEquals(r.status, 200, JSON.stringify(r.body));
  const codigo = r.body.codigo as string;
  for (const n of quienes) assertEquals((await c.call("POST", `/sala/${codigo}/unirse`, n)).status, 200); // NOSONAR: en orden
  const e = await c.call("POST", `/sala/${codigo}/empezar`, "Marisol");
  assertEquals(e.status, 200);
  c.ir(e.body.sala.inicio);
  return { codigo, inicio: e.body.sala.inicio as number };
}
const reportar = (c: C, codigo: string, n: string, carrera: Record<string, unknown>) => c.call("POST", `/sala/${codigo}/respuesta`, n, { carrera });
const guardar = (c: C, codigo: string, n: string, puntos: number) =>
  c.call("POST", "/partida", n, { juego: "karts", puntos, aciertos: 0, total: 0, segundos: 0, sala: codigo });

Deno.test("karts-salida-y-puntos: Karts da 8 s de cuenta regresiva (los demás juegos, 5 s)", async () => {
  const c = ctx();
  const t0 = Date.parse("2026-10-14T18:00:00.000Z");
  for (const [juego, cuenta] of [["karts", 8000], ["plataformas", 5000], ["cultura", 5000]] as const) {
    const r = await c.call("POST", "/sala", "Marisol", { juego, bots: true }); // NOSONAR: en orden
    const e = await c.call("POST", `/sala/${r.body.codigo}/empezar`, "Marisol"); // NOSONAR: en orden
    assertEquals(e.body.sala.inicio - t0, cuenta, juego);
  }
});

Deno.test("karts-salida-y-puntos: GET /juegos/sala trae `reloj` (hora del servidor al responder)", async () => {
  const c = ctx();
  const { codigo } = await carreraEmpezada(c, "pradera", ["Angel"]);
  const antes = Date.now();
  const v = (await c.call("GET", `/sala/${codigo}`, "Angel")).body;
  assert(typeof v.reloj === "number" && v.reloj >= antes && v.reloj <= Date.now(), JSON.stringify(v.reloj));
  assertEquals(typeof v.ahora, "number");
});

Deno.test("karts-salida-y-puntos: los puntos por lugar son estrictamente decrecientes en los 8 lugares", () => {
  const pts = [1, 2, 3, 4, 5, 6, 7, 8].map((l) => A.puntosLugar(l));
  assertEquals(pts, [500, 440, 380, 320, 260, 200, 140, 80]);
  for (let i = 1; i < pts.length; i++) assert(pts[i] < pts[i - 1], "lugar " + (i + 1));
});

Deno.test("karts-salida-y-puntos: gana quien llega primero aunque traiga menos monedas (podio compartido)", () => {
  const filas = A.podioCarrera([
    { id: "b", nombre: "Angel", ms: 92_000, monedas: 10, t: 2 },
    { id: "bot-vachira", nombre: "BOT-VACHIRA", bot: true, ms: 120_000 },
    { id: "a", nombre: "Marisol", ms: 90_000, monedas: 0, t: 1 },
  ]);
  assertEquals(filas.map((f: any) => [f.id, f.lugar, f.total]), [["a", 1, 500], ["b", 2, 440], ["bot-vachira", 3, 380]]);
  // Empate exacto de tiempo: va antes quien lo reportó antes al servidor.
  const empate = A.podioCarrera([{ id: "x", ms: 90_000, t: 9 }, { id: "y", ms: 90_000, t: 3 }]);
  assertEquals(empate.map((f: any) => f.id), ["y", "x"]);
});

Deno.test("karts-salida-y-puntos: sala de 2 — Marisol gana con 0 monedas y recibe más puntos que Angel (servidor)", async () => {
  const c = ctx();
  const { codigo, inicio } = await carreraEmpezada(c, "pradera", ["Angel"]);
  const ms = Math.round(A.refKarts("pradera") * 0.9); // más rápido que el bot (≥ 1.0 × la referencia)
  c.ir(inicio + ms);
  assertEquals((await reportar(c, codigo, "Marisol", { ms, monedas: 0 })).status, 200);
  // Angel todavía corre: la carrera sigue abierta y no se guarda nada.
  const abierta = await guardar(c, codigo, "Marisol", 500);
  assertEquals([abierta.status, abierta.body.error], [409, "carrera_en_curso"], JSON.stringify(abierta.body));
  c.avanzar(2_000);
  assertEquals((await reportar(c, codigo, "Angel", { ms: ms + 2_000, monedas: 10 })).status, 200);
  // La página de Marisol manda 0 y la de Angel 9999: el servidor guarda los de su podio.
  const m = await guardar(c, codigo, "Marisol", 0);
  const a = await guardar(c, codigo, "Angel", 9_999);
  assertEquals([m.status, m.body.puntos], [200, 500], JSON.stringify(m.body));
  assertEquals([a.status, a.body.puntos], [200, 440], JSON.stringify(a.body));
  assert(m.body.puntos > a.body.puntos, "quien gana la carrera recibe más puntos");
  assertEquals((await guardar(c, codigo, "Angel", 440)).body.error, "ya_guardada");
});

Deno.test("karts-salida-y-puntos: quien no terminó va después de todos los que terminaron, por su avance", async () => {
  const c = ctx();
  const { codigo, inicio } = await carreraEmpezada(c, "chichen", ["Angel", "Laura", "Beto"], false);
  const ms = Math.round(A.refKarts("chichen") * 1.2);
  c.ir(inicio + ms);
  assertEquals((await reportar(c, codigo, "Angel", { ms, monedas: 1 })).status, 200);
  const lim = A.limiteSala("karts", "chichen");
  c.ir(inicio + lim);
  // Avance solo cuando no terminó (‰ de 0 a 999).
  for (const malo of [{ ms, monedas: 0, avance: 500 }, { ms: null, monedas: 0, avance: 1000 }, { ms: null, monedas: 0, avance: -1 }, { ms: null, monedas: 0, avance: 1.5 }]) {
    assertEquals((await reportar(c, codigo, "Laura", malo)).body.error, "carrera_invalida", JSON.stringify(malo)); // NOSONAR: en orden
  }
  assertEquals((await reportar(c, codigo, "Laura", { ms: null, monedas: 9, avance: 300 })).status, 200);
  assertEquals((await reportar(c, codigo, "Beto", { ms: null, monedas: 0, avance: 800 })).status, 200);
  // Marisol no manda nada (se fue la red): la carrera sigue abierta hasta el límite + la gracia; luego queda al final.
  assertEquals((await guardar(c, codigo, "Angel", 0)).body.error, "carrera_en_curso");
  c.ir(inicio + lim + A.GRACIA_SALA);
  const antes = await guardar(c, codigo, "Angel", 0);
  assertEquals(antes.status, 200, JSON.stringify(antes.body));
  const vista = (await c.call("GET", `/sala/${codigo}`, "Angel")).body;
  const filas = A.podioCarrera(vista.jugadores.map((j: any) => ({ id: j.id, nombre: j.nombre, ...(j.carrera || { ms: null }) })));
  assertEquals(filas.map((f: any) => [f.nombre, f.total]), [["Angel", 500], ["Beto", 0], ["Laura", 0], ["Marisol", 0]]);
  assertEquals([antes.body.puntos, (await guardar(c, codigo, "Beto", 999)).body.puntos], [500, 0]);
});

Deno.test("karts-salida-y-puntos: el límite + la gracia cierran la carrera aunque falte alguien", async () => {
  const c = ctx();
  const { codigo, inicio } = await carreraEmpezada(c, "hielo", ["Angel"]);
  const ms = Math.round(A.refKarts("hielo") * 0.95);
  c.ir(inicio + ms);
  assertEquals((await reportar(c, codigo, "Angel", { ms, monedas: 4 })).status, 200);
  c.ir(inicio + A.limiteSala("karts", "hielo") + A.GRACIA_SALA - 1);
  assertEquals((await guardar(c, codigo, "Angel", 0)).body.error, "carrera_en_curso");
  c.avanzar(1);
  const r = await guardar(c, codigo, "Angel", 0);
  assertEquals([r.status, r.body.puntos], [200, 500], JSON.stringify(r.body));
});

Deno.test("karts-salida-y-puntos: copa — los puntos de partida siguen el orden de la tabla", () => {
  const sala = { juego: "karts", opciones: { modo: "copa", copa: "fiesta" }, seed: 7, inicio: 1_000_000, bots: false };
  const js: any[] = [{ id: "m", nombre: "Marisol", copa: [] }, { id: "l", nombre: "Laura", copa: [] }, { id: "a", nombre: "Angel", copa: [] }];
  // Lugares por carrera: Marisol 1,1,3,3 · Laura 3,3,1,1 · Angel 2,2,2,2. Marisol con menos tiempo total que Laura.
  const lugares: Record<string, number[]> = { m: [1, 1, 3, 3], l: [3, 3, 1, 1], a: [2, 2, 2, 2] };
  for (let k = 0; k < 4; k++) {
    const cal = KC.calendario(sala, js, 1e15);
    const ini = cal[k].inicio;
    for (const j of js) {
      const ms = 100_000 + lugares[j.id][k] * 1_000 + (j.id === "l" ? 500 : 0);
      j.copa.push({ k, ms, monedas: 0, t: ini + ms });
    }
  }
  const e = KC.estado(sala, js, 1e15);
  assertEquals(e.fase, "final");
  assertEquals(e.tabla.map((t: any) => [t.nombre, t.pts]), [["Marisol", 50], ["Laura", 50], ["Angel", 48]]);
  assertEquals(e.tabla.map((t: any) => t.ranking), [2000, 1760, 1520]);
  // Cada carrera da 15, 12, 10 por orden de llegada.
  assertEquals(e.resultados[0].map((f: any) => [f.id, f.pts]), [["m", 15], ["a", 12], ["l", 10]]);
});
