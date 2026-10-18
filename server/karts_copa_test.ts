// Copa completa de Karts en sala (openspec: karts-copa-en-sala), con almacén en memoria y reloj controlado: crear la
// sala de copa, orden de las carreras, puntos, tabla, tiempos vencidos (no terminó), desconexión y regreso, abandono,
// tope del ranking y vista de la copa.
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
  let t = Date.parse("2026-10-13T18:00:00.000Z");
  const deps = {
    store, admin: "admin@example.com", filasIngles: () => Promise.resolve(ingles), filasSecundaria: () => Promise.resolve([]),
    hoy: () => "2026-10-13", ahora: () => new Date(t).toISOString(),
  };
  const call = async (method: string, sub: string, n: string, body?: unknown) => {
    clearCacheSalas();
    const req = new Request(`http://x/juegos${sub}?email=${encodeURIComponent(correo(n))}`, { method, body: body === undefined ? undefined : JSON.stringify(body) });
    const res = await handleJuegos(req, sub, correo(n), deps, json);
    return { status: res.status, body: await res.json() as any };
  };
  return { call, store, ahora: () => t, avanzar: (ms: number) => { t += ms; }, ir: (ms: number) => { t = ms; } };
}
type C = ReturnType<typeof ctx>;

// Sala de copa con Marisol (anfitriona) y Angel (y Laura si se pide), ya empezada; el reloj queda al inicio.
async function copaEmpezada(c: C, copa = "fiesta", bots = true, quienes = ["Angel"]) {
  const r = await c.call("POST", "/sala", "Marisol", { juego: "karts", opciones: { modo: "copa", copa }, bots });
  assertEquals(r.status, 200, JSON.stringify(r.body));
  const codigo = r.body.codigo as string;
  for (const n of quienes) assertEquals((await c.call("POST", `/sala/${codigo}/unirse`, n)).status, 200); // NOSONAR: llamadas en orden (el reloj y cada paso dependen del anterior)
  const e = await c.call("POST", `/sala/${codigo}/empezar`, "Marisol");
  assertEquals(e.status, 200);
  c.ir(e.body.sala.inicio);
  return codigo;
}
const reportar = (c: C, codigo: string, n: string, carrera: number, ms: number | null, monedas = 3) =>
  c.call("POST", `/sala/${codigo}/respuesta`, n, { copa: { carrera, ms, monedas } });
const vista = async (c: C, codigo: string, n = "Marisol") => (await c.call("GET", `/sala/${codigo}`, n)).body;
// Avanza a la carrera k ya empezada (según la vista del servidor) y devuelve su inicio.
async function aLaCarrera(c: C, codigo: string, k: number) {
  const v = await vista(c, codigo);
  const cal = v.copa.calendario[k];
  assert(cal, "carrera " + k + " con hora de inicio");
  if (c.ahora() < cal.inicio) c.ir(cal.inicio);
  return cal.inicio as number;
}

Deno.test("karts-copa: crear la sala de copa (fiesta, mesoamericana o mixta) y opciones inválidas", async () => {
  const c = ctx();
  for (const copa of ["fiesta", "mesoamerica", "mixta"]) {
    const r = await c.call("POST", "/sala", "Marisol", { juego: "karts", opciones: { modo: "copa", copa }, bots: true }); // NOSONAR: llamadas en orden (el reloj y cada paso dependen del anterior)
    assertEquals([r.status, r.body.sala.opciones.modo, r.body.sala.opciones.copa], [200, "copa", copa]);
    const pistas = KC.pistasDe(copa, r.body.sala.seed);
    assertEquals(r.body.sala.opciones.mapa, pistas[0], "el mapa es la primera pista (la vista de una carrera sigue sirviendo)");
    assertEquals(pistas.length, 4);
    assertEquals(new Set(pistas).size, 4);
  }
  const malo = await c.call("POST", "/sala", "Marisol", { juego: "karts", opciones: { modo: "copa", copa: "luna" } });
  assertEquals([malo.status, malo.body.error], [400, "copa_invalida"]);
  const modo = await c.call("POST", "/sala", "Marisol", { juego: "karts", opciones: { modo: "torneo" } });
  assertEquals([modo.status, modo.body.error], [400, "modo_invalido"]);
  const una = await c.call("POST", "/sala", "Marisol", { juego: "karts", opciones: { mapa: "hielo" } });
  assertEquals([una.status, una.body.sala.opciones.modo, una.body.sala.opciones.mapa], [200, undefined, "hielo"], "«Una carrera» como siempre");
  // Copa mixta: 2 pistas de cada copa, distintas según la semilla.
  const mixtas = new Set<string>();
  for (let s = 1; s < 40; s++) {
    const p = KC.pistasDe("mixta", s);
    assertEquals(p.filter((x: string) => G.KartsPistas.COPAS[0].pistas.includes(x)).length, 2);
    mixtas.add(p.join(","));
  }
  assert(mixtas.size > 10, "la mixta cambia con la semilla");
});

Deno.test("karts-copa: 4 carreras en orden, puntos por lugar, tabla y podio final", async () => {
  const c = ctx();
  const codigo = await copaEmpezada(c);
  const v0 = await vista(c, codigo);
  assertEquals([v0.copa.fase, v0.copa.carrera, v0.copa.pistas], ["carrera", 0, ["pradera", "desierto", "hielo", "volcan"]]);
  // No se puede reportar la 2 antes de la 1 (ni la 3 antes de la 2).
  c.avanzar(100_000);
  const adelantada = await reportar(c, codigo, "Marisol", 1, 99_000);
  assertEquals([adelantada.status, adelantada.body.error], [409, "carrera_fuera_de_turno"]);
  for (let k = 0; k < 4; k++) {
    const inicio = await aLaCarrera(c, codigo, k); // NOSONAR: llamadas en orden (el reloj y cada paso dependen del anterior)
    const ref = A.refKarts(v0.copa.pistas[k]);
    c.ir(inicio + Math.round(ref * 0.9));
    assertEquals((await reportar(c, codigo, "Marisol", k, Math.round(ref * 0.9))).status, 200, "Marisol carrera " + k); // NOSONAR: llamadas en orden (el reloj y cada paso dependen del anterior)
    const v = await vista(c, codigo); // NOSONAR: llamadas en orden (el reloj y cada paso dependen del anterior)
    assertEquals([v.copa.fase, v.copa.carrera], ["carrera", k], "sigue abierta: falta Angel");
    c.avanzar(5_000);
    const r = await reportar(c, codigo, "Angel", k, Math.round(ref * 0.9) + 5_000); // NOSONAR: llamadas en orden (el reloj y cada paso dependen del anterior)
    assertEquals(r.status, 200, JSON.stringify(r.body));
    const repetido = await reportar(c, codigo, "Angel", k, Math.round(ref * 0.9) + 6_000); // NOSONAR: llamadas en orden (el reloj y cada paso dependen del anterior)
    assertEquals(repetido.status, 409, "la carrera ya cerró: no se cambia");
    const v2 = await vista(c, codigo); // NOSONAR: llamadas en orden (el reloj y cada paso dependen del anterior)
    if (k < 3) {
      assertEquals([v2.copa.fase, v2.copa.carrera], ["interpodio", k + 1]);
      assertEquals(v2.copa.calendario[k + 1].inicio, c.ahora() + KC.INTERPODIO_MS, "la siguiente empieza tras la tabla");
    } else assertEquals(v2.copa.fase, "final");
  }
  const fin = await vista(c, codigo);
  const marisol = fin.copa.tabla.find((x: any) => x.nombre === "Marisol"), angel = fin.copa.tabla.find((x: any) => x.nombre === "Angel");
  // 2 personas + 1 bot (mesa de 3). Marisol (0.9 × ref) le gana a los bots (≥ 1.0 × ref): 1.º en las 4 → 60 puntos.
  assertEquals(fin.copa.tabla.length, 3);
  assertEquals([marisol.pts, marisol.porCarrera.map((x: any) => x.lugar)], [60, [1, 1, 1, 1]]);
  assertEquals(marisol.ranking, 2000, "500 por carrera, tope 2000");
  assertEquals(fin.copa.tabla[0].nombre, "Marisol");
  assert(angel.pts >= 4 * 10 && angel.pts <= 4 * 12, JSON.stringify(angel));
  // Ranking de partidas: tope con lo que calcula el servidor.
  const p = await c.call("POST", "/partida", "Angel", { juego: "karts", puntos: 9_999, aciertos: 0, total: 0, segundos: 0, sala: codigo });
  assertEquals([p.status, p.body.puntos], [200, angel.ranking], JSON.stringify(p.body));
});

Deno.test("karts-copa: tiempo vencido = no terminó (0 puntos) y la siguiente arranca sola", async () => {
  const c = ctx();
  const codigo = await copaEmpezada(c);
  const inicio = await aLaCarrera(c, codigo, 0);
  c.ir(inicio + 125_000);
  assertEquals((await reportar(c, codigo, "Marisol", 0, 125_000)).status, 200);
  // karts-copa-sala-4: Angel no llega en el plazo (KC.PLAZO_MS) tras la llegada de Marisol: la carrera cierra.
  c.ir(inicio + 125_000 + KC.PLAZO_MS - 1);
  assertEquals((await vista(c, codigo)).copa.fase, "carrera");
  c.ir(inicio + 125_000 + KC.PLAZO_MS);
  const v = await vista(c, codigo);
  assertEquals([v.copa.fase, v.copa.carrera], ["interpodio", 1]);
  const angel = v.copa.tabla.find((x: any) => x.nombre === "Angel");
  assertEquals([angel.pts, angel.porCarrera[0].ms, angel.porCarrera[0].lugar], [0, null, null], "no terminó");
  const tarde = await reportar(c, codigo, "Angel", 0, 160_000);
  assertEquals([tarde.status, tarde.body.error], [409, "carrera_cerrada"]);
  // karts-copa-sala-4: en la 1 Angel vuelve a contar (antes ya no se le esperaba y quedaba fuera de la copa).
  const i1 = await aLaCarrera(c, codigo, 1);
  assertEquals((await vista(c, codigo)).copa.calendario[1].esperados.length, 2);
  c.ir(i1 + 130_000);
  assertEquals((await reportar(c, codigo, "Marisol", 1, 130_000)).status, 200);
  assertEquals((await vista(c, codigo)).copa.fase, "carrera", "Angel tiene el plazo");
  c.ir(i1 + 131_000);
  assertEquals((await reportar(c, codigo, "Angel", 1, 131_000)).status, 200);
  assertEquals((await vista(c, codigo)).copa.fase, "interpodio");
  // Nadie llega a la meta: cierra al límite de la pista + la gracia.
  const i2 = await aLaCarrera(c, codigo, 2);
  const lim = A.limiteSala("karts", (await vista(c, codigo)).copa.pistas[2]);
  c.ir(i2 + lim + A.GRACIA_SALA - 1);
  assertEquals((await vista(c, codigo)).copa.fase, "carrera");
  c.ir(i2 + lim + A.GRACIA_SALA);
  assertEquals((await vista(c, codigo)).copa.fase, "interpodio");
});

Deno.test("karts-copa: desconexión (abandono) y regreso en la carrera siguiente", async () => {
  const c = ctx();
  const codigo = await copaEmpezada(c, "mesoamerica", false, ["Angel", "Laura"]);
  const inicio = await aLaCarrera(c, codigo, 0);
  c.ir(inicio + 20_000);
  // Laura cierra la pestaña: la página manda abandono y ya no se le espera.
  const ab = await c.call("POST", `/sala/${codigo}/respuesta`, "Laura", { copa: { carrera: 0, abandono: true } });
  assertEquals(ab.status, 200, JSON.stringify(ab.body));
  c.ir(inicio + 128_000);
  assertEquals((await reportar(c, codigo, "Marisol", 0, 128_000)).status, 200);
  assertEquals((await reportar(c, codigo, "Angel", 0, 127_000)).status, 200);
  const v = await vista(c, codigo);
  assertEquals([v.copa.fase, v.copa.carrera], ["interpodio", 1], "el abandono de Laura cuenta como su reporte (NT)");
  assertEquals(v.copa.calendario[1].esperados.length, 3, "karts-copa-sala-4: todas las personas cuentan en cada carrera");
  assertEquals(v.copa.tabla.find((x: any) => x.nombre === "Laura").pts, 0);
  // Laura vuelve a mitad de la carrera 1 y la corre (karts-copa-sala-4: la página ya no la abandona sola).
  const i1 = await aLaCarrera(c, codigo, 1);
  c.ir(i1 + 125_000);
  const enLa1 = await reportar(c, codigo, "Laura", 1, 125_000);
  assertEquals(enLa1.status, 200, "su tiempo cuenta");
  c.ir(i1 + 130_000);
  for (const n of ["Marisol", "Angel"]) assertEquals((await reportar(c, codigo, n, 1, 130_000)).status, 200); // NOSONAR: llamadas en orden (el reloj y cada paso dependen del anterior)
  const v2 = await vista(c, codigo);
  assertEquals(v2.copa.calendario[2].esperados.length, 3, "en la carrera 2 se espera otra vez a Laura");
  // Una abandonada sin bots: personas sin reporte en la 0 → 0 puntos; la tabla tiene 3 (sin bots).
  assertEquals(v2.copa.tabla.length, 3);
});

Deno.test("karts-copa: validaciones del reporte", async () => {
  const c = ctx();
  const codigo = await copaEmpezada(c);
  const inicio = await aLaCarrera(c, codigo, 0);
  c.ir(inicio + 20_000);
  const corto = await reportar(c, codigo, "Marisol", 0, 19_000);
  assertEquals([corto.status, corto.body.error], [400, "carrera_invalida"], "debajo del mínimo de la Pradera");
  for (const malo of [{ carrera: 0 }, { carrera: 7, ms: 20_000, monedas: 0 }, { carrera: "0", ms: 20_000, monedas: 0 }, { carrera: 0, ms: 20_000, monedas: 0, extra: 1 }, "x"]) {
    const r = await c.call("POST", `/sala/${codigo}/respuesta`, "Marisol", { copa: malo }); // NOSONAR: llamadas en orden (el reloj y cada paso dependen del anterior)
    assertEquals([r.status, r.body.error], [400, "copa_invalida"], JSON.stringify(malo));
  }
  // En una sala de una sola carrera no hay copa; la de copa no acepta `carrera` suelta.
  const una = await c.call("POST", "/sala", "Marisol", { juego: "karts", opciones: { mapa: "hielo" }, bots: true });
  await c.call("POST", `/sala/${una.body.codigo}/empezar`, "Marisol");
  c.avanzar(40_000);
  const sinCopa = await c.call("POST", `/sala/${una.body.codigo}/respuesta`, "Marisol", { copa: { carrera: 0, ms: 34_000, monedas: 0 } });
  assertEquals([sinCopa.status, sinCopa.body.error], [400, "copa_invalida"]);
  const suelta = await c.call("POST", `/sala/${codigo}/respuesta`, "Marisol", { carrera: { ms: 50_000, monedas: 0 } });
  assertEquals([suelta.status, suelta.body.error], [400, "carrera_invalida"]);
  const nadie = await c.call("POST", `/sala/${codigo}/respuesta`, "Laura", { copa: { carrera: 0, ms: 50_000, monedas: 0 } });
  assertEquals(nadie.status, 403);
});

Deno.test("karts-copa: la revancha hereda la copa (la mixta sortea otras pistas)", async () => {
  const c = ctx();
  const codigo = await copaEmpezada(c, "mixta");
  for (let k = 0; k < 4; k++) {
    const inicio = await aLaCarrera(c, codigo, k); // NOSONAR: llamadas en orden (el reloj y cada paso dependen del anterior)
    c.ir(inicio + 130_000);
    for (const n of ["Marisol", "Angel"]) assertEquals((await reportar(c, codigo, n, k, 130_000)).status, 200); // NOSONAR: en orden
  }
  assertEquals((await vista(c, codigo)).copa.fase, "final");
  assertEquals((await c.call("POST", `/sala/${codigo}/respuesta`, "Marisol", { final: 1500, podio: [{ nombre: "Marisol", total: 1500 }] })).status, 200);
  const rev = await c.call("POST", `/sala/${codigo}/revancha`, "Angel");
  assertEquals(rev.status, 200, JSON.stringify(rev.body));
  const v = await vista(c, rev.body.codigo, "Angel");
  assertEquals([v.sala.opciones.modo, v.sala.opciones.copa], ["copa", "mixta"]);
});
