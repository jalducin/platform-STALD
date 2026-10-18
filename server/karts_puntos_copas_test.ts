// Sprint 41c: pruebas que reproducen «en la copa Reinos Antiguos no suma puntos y gané en la primera carrera».
// Para CADA una de las 4 copas (Fiesta, Mesoamericana, Reinos Antiguos y Espacio), con almacén en memoria y reloj
// controlado:
// - el progreso de una copa en curso con la carrera 1 ganada (15 puntos) lo acepta el servidor (server/progreso.ts) y
//   regresa intacto en GET /juegos/progreso/karts;
// - el resultado de esa carrera en el ranking (POST /juegos/partida, modo individual) se guarda, y el tiempo realista de
//   las pistas rediseñadas (sprint 38) cae dentro de los límites de la pista (server/carreras.ts);
// - la tabla de puntos de la copa le da 15 al 1.º;
// - en la copa en sala (server/karts_copa.ts), lo mismo para las carreras de `reinos` y `espacio`.
// deno-lint-ignore-file no-explicit-any
import { assert, assertEquals } from "jsr:@std/assert@1";
import { clearCacheJuegos, handleJuegos } from "./juegos.ts";
import { clearCacheSalas } from "./salas.ts";
import { MemoryStore } from "./store.ts";
import { validarProgreso, VERSION_PISTAS_KARTS } from "./progreso.ts";
import { reglasCarrera, validarCarrera } from "./carreras.ts";
import "../juegos/karts-copa.js";

const G = globalThis as any;
const KC = G.KartsCopa, A = G.Arcade, KP = G.KartsPistas;
const COPAS = ["fiesta", "mesoamerica", "reinos", "espacio"];
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

// ---------- Modo individual: lo que manda karts.html al ganar la carrera 1 de una copa ----------
// Igual que karts.html: tú vas en el lugar 6 de la parrilla (slotYo = 5 → índice 5 de `karts` y de cc.puntos), los 7
// rivales en los demás. Ganaste: 15 para ti y 12, 10, 8, 6, 4, 2, 1 repartidos entre los bots. La dificultad sube 2.
const SLOT_YO = 5;
function puntosTrasGanar(): number[] {
  const puntos = [0, 0, 0, 0, 0, 0, 0, 0];
  const ordenBots = [0, 1, 2, 3, 4, 6, 7]; // los bots en el orden en que llegaron
  puntos[SLOT_YO] = A.PUNTOS_COPA[0];
  ordenBots.forEach((k, i) => { puntos[k] = A.PUNTOS_COPA[i + 1]; });
  return puntos;
}
// Tiempo realista en la pista rediseñada: la referencia de la pista (sus 3 vueltas a 80 % de la velocidad tope) más un
// 8 %, el ritmo de quien gana con muros, columnas y caídas de por medio.
const realista = (pista: string) => Math.round(A.refKarts(pista) * 1.08);

// Progreso como lo guarda karts.html (progresoNuevo + migrarRecords) tras ganar la carrera 1: la copa en curso con 15
// puntos y el récord de la primera pista. Para abrir Reinos (1 podio) y Espacio (2 podios) lleva podios en otras copas,
// como el progreso real de quien llega a esas copas.
function progresoCarrera1(copa: string) {
  const c = KP.copaPorId(copa), pista = c.pistas[0];
  const copas: Record<string, { lugar: number; puntos: number }> = {};
  if (copa === "reinos" || copa === "espacio") copas.fiesta = { lugar: 1, puntos: 54 };
  if (copa === "espacio") copas.mesoamerica = { lugar: 2, puntos: 41 };
  return {
    copas, records: { [pista]: realista(pista) }, piezas: copa === "fiesta" ? [] : ["chasis-ligero", "llantas-todoterreno"],
    equipo: { chasis: "estandar", llantas: "estandar", color: "azul" },
    copaEnCurso: { copa: c.id, carrera: 1, puntos: puntosTrasGanar(), dif: 97 },
    pistasV: VERSION_PISTAS_KARTS, recordsV1: {}, recordsV2: {}, recordsV3: {}, // karts-3-vueltas: + recordsV3
  };
}

Deno.test("puntos-copas: las 4 copas existen con 4 pistas y la tabla de la copa da 15 al 1.º", () => {
  assertEquals(KP.COPAS.map((c: any) => c.id).sort(), [...COPAS].sort());
  assertEquals(A.PUNTOS_COPA, [15, 12, 10, 8, 6, 4, 2, 1]);
  for (const copa of COPAS) {
    const c = KP.copaPorId(copa);
    assertEquals(c.id, copa, "copaPorId no cae en la Copa Fiesta para " + copa);
    assertEquals(c.pistas.length, 4, copa);
    for (const p of c.pistas) assert(A.pistaPorId(p), copa + ": la pista " + p + " existe");
  }
  // Una carrera de copa en sala ya cerrada: el 1.º lleva 15 puntos (resultadoCarrera, el mismo que usa el servidor).
  for (const copa of COPAS) {
    const pista = KP.copaPorId(copa).pistas[0], seed = 7;
    const sala = { juego: "karts", opciones: { modo: "copa", copa }, seed, inicio: 1_000_000, bots: true };
    const ms = Math.round(A.refKarts(pista) * 0.9);
    const jugadores = [{ id: "a", nombre: "Marisol", copa: [{ k: 0, ms, monedas: 3, t: 1_000_000 + ms }] }];
    const res = KC.resultadoCarrera(sala, jugadores, { k: 0, pista, cierre: 1_000_000 + ms });
    assertEquals([res[0].id, res[0].lugar, res[0].pts], ["a", 1, 15], copa + ": " + JSON.stringify(res));
  }
});

for (const copa of COPAS) {
  Deno.test(`puntos-copas (${copa}): el progreso con la carrera 1 ganada (15 puntos) se acepta y regresa intacto`, async () => {
    const datos = progresoCarrera1(copa);
    assert(KP.copaDesbloqueada(KP.copaPorId(copa), datos), copa + ": la copa está abierta con estos podios");
    assert(validarProgreso("karts", datos), copa + ": validarProgreso acepta " + JSON.stringify(datos));
    const c = ctx();
    const put = await c.call("PUT", "/progreso/karts", "Angel", { v: 0, datos });
    assertEquals([put.status, put.body.ok, put.body.v], [200, true, 1], copa + ": PUT " + JSON.stringify(put.body));
    const get = await c.call("GET", "/progreso/karts", "Angel");
    assertEquals(get.status, 200);
    assertEquals(get.body.v, 1);
    assertEquals(get.body.datos, datos, copa + ": el progreso regresa intacto");
    assertEquals(get.body.datos.copaEnCurso.puntos[SLOT_YO], 15, copa + ": 15 puntos para ti en la copa en curso");
    // Se puede seguir guardando sobre esa versión (la carrera 2 también cuenta).
    const sig = structuredClone(datos);
    sig.copaEnCurso.carrera = 2;
    sig.copaEnCurso.puntos[SLOT_YO] = 30;
    const put2 = await c.call("PUT", "/progreso/karts", "Angel", { v: 1, datos: sig });
    assertEquals([put2.status, put2.body.v], [200, 2], copa + ": carrera 2 " + JSON.stringify(put2.body));
  });

  Deno.test(`puntos-copas (${copa}): progreso real de un aparato que ya jugaba (records en las 16 pistas y archivados)`, async () => {
    // Un progreso más lleno: récords en todas las pistas, archivados de las versiones 1, 2 y 3 y copas ganadas. Debe caber en
    // MAX_PROGRESO y pasar la validación de forma.
    const todas = KP.PISTAS.map((p: any) => p.id);
    const datos = progresoCarrera1(copa);
    datos.records = Object.fromEntries(todas.map((id: string) => [id, realista(id)]));
    datos.recordsV1 = Object.fromEntries(todas.slice(0, 8).map((id: string) => [id, 61_234]));
    datos.recordsV2 = Object.fromEntries(todas.filter((id: string) => A.pistaPorId(id).trazado === 3).map((id: string) => [id, 131_000]));
    datos.recordsV3 = Object.fromEntries(todas.map((id: string) => [id, 128_500])); // karts-3-vueltas: récords de 2 vueltas
    datos.copas = { fiesta: { lugar: 1, puntos: 54 }, mesoamerica: { lugar: 2, puntos: 41 }, reinos: { lugar: 3, puntos: 30 }, espacio: { lugar: 4, puntos: 28 } };
    assert(validarProgreso("karts", datos), copa + ": validarProgreso acepta el progreso lleno " + JSON.stringify(datos));
    const c = ctx();
    const put = await c.call("PUT", "/progreso/karts", "Angel", { v: 0, datos });
    assertEquals(put.status, 200, copa + ": PUT " + JSON.stringify(put.body));
    assertEquals((await c.call("GET", "/progreso/karts", "Angel")).body.datos, datos);
  });

  Deno.test(`puntos-copas (${copa}): los tiempos realistas de las 4 pistas caben en sus límites y el ranking guarda la carrera ganada`, async () => {
    const c = ctx();
    for (const pista of KP.copaPorId(copa).pistas) {
      const reglas = reglasCarrera("karts", pista)!;
      assert(reglas, pista + ": tiene reglas de carrera");
      const ref = A.refKarts(pista);
      // De un ganador muy rápido (60 % de la referencia) a alguien lento (2 veces la referencia): no son inverosímiles.
      for (const f of [0.6, 0.9, 1.08, 1.5, 2]) {
        const ms = Math.round(ref * f), inicio = 1_000_000;
        assert(ms >= reglas.minMs && ms <= reglas.limiteMs, `${pista}: ${ms} ms dentro de [${reglas.minMs}, ${reglas.limiteMs}]`);
        const v = validarCarrera("karts", { ms, monedas: 4 }, inicio, inicio + ms + 400, pista);
        assertEquals(v, { ms, monedas: 4 }, `${pista}: validarCarrera acepta ${ms} ms (×${f})`);
      }
      // Los récords del progreso aceptan esos tiempos (de 10 s a 20 min; karts-3-vueltas).
      assert(realista(pista) >= KP.RECORD_MIN_MS && realista(pista) <= KP.RECORD_MAX_MS, pista);
    }
    // POST /juegos/partida como lo manda la página (juegos/app/arcade.js) al ganar la carrera 1 de la copa:
    // puntos = (9 − lugar) × 60 + monedas × 10; segundos del tiempo realista.
    const pista = KP.copaPorId(copa).pistas[0], ms = realista(pista), monedas = 4;
    const puntos = (9 - 1) * 60 + monedas * 10;
    const r = await c.call("POST", "/partida", "Angel", { juego: "karts", puntos, aciertos: monedas, total: 0, segundos: Math.round(ms / 1000) });
    assertEquals([r.status, r.body.guardado, r.body.puntos, r.body.modo], [200, true, puntos, "individual"], copa + ": " + JSON.stringify(r.body));
    const rk = await c.call("GET", "/ranking", "Angel");
    assertEquals(rk.body.yo.mejores.karts, puntos, copa + ": el ranking de la semana tiene la carrera");
  });
}

// ---------- Defecto real (diagnóstico del agente de puntos): récord de más de 15 min (20 min desde karts-3-vueltas) ----------
// El tiempo de la carrera es de reloj de pared: con la pestaña oculta o atorado en un muro, una carrera ganada puede durar
// más de 15 min. Ese récord no debe tumbar el guardado: en origin/main el juego lo anotaba y recordsValidos (10 s a 15 min)
// rechazaba todo el progreso con progreso_invalido, y se perdía la copa en curso con sus 15 puntos. Arreglo (cliente):
// KartsPistas.anotarRecord no anota tiempos fuera del rango que acepta el servidor; la copa en curso se guarda igual.
for (const copa of COPAS) {
  Deno.test(`puntos-copas (${copa}): una carrera de más de 20 min no hace perder la copa en curso (progreso_invalido)`, async () => {
    const datos = progresoCarrera1(copa);
    const pista = KP.copaPorId(copa).pistas[0];
    datos.records = {}; // primera vez en la pista: sin récord previo
    assertEquals(KP.anotarRecord(datos, pista, 21 * 60_000 + 1_234), false, "21:01.2 no se anota como récord"); // como karts.html
    assertEquals(datos.records[pista], undefined);
    assertEquals(validarProgreso("karts", { ...datos, records: { [pista]: 21 * 60_000 } }), false, "el servidor sigue sin aceptar récords fuera de rango");
    const c = ctx();
    const put = await c.call("PUT", "/progreso/karts", "Angel", { v: 0, datos });
    assertEquals(put.status, 200, copa + ": PUT tras una carrera de 21 min " + JSON.stringify(put.body));
    const get = await c.call("GET", "/progreso/karts", "Angel");
    assertEquals(get.body.datos?.copaEnCurso?.puntos?.[SLOT_YO], 15, copa + ": la copa en curso conserva tus 15 puntos");
  });
}

// ---------- Copa en sala: carreras de Reinos Antiguos y del Espacio ----------
async function copaEmpezada(c: C, copa: string) {
  const r = await c.call("POST", "/sala", "Marisol", { juego: "karts", opciones: { modo: "copa", copa }, bots: true });
  assertEquals(r.status, 200, JSON.stringify(r.body));
  const codigo = r.body.codigo as string;
  assertEquals((await c.call("POST", `/sala/${codigo}/unirse`, "Angel")).status, 200);
  const e = await c.call("POST", `/sala/${codigo}/empezar`, "Marisol");
  assertEquals(e.status, 200, JSON.stringify(e.body));
  c.ir(e.body.sala.inicio);
  return codigo;
}
const reportar = (c: C, codigo: string, n: string, carrera: number, ms: number | null, monedas = 3) =>
  c.call("POST", `/sala/${codigo}/respuesta`, n, { copa: { carrera, ms, monedas } });
const vista = async (c: C, codigo: string, n = "Marisol") => (await c.call("GET", `/sala/${codigo}`, n)).body;

// Un tiempo fuera de la ventana del reloj del servidor se rechaza con 400 carrera_invalida (la página debe avisarlo, ver
// tests/e2e/e2e-karts-puntos.js) y no suma: la persona sigue con 0 en la tabla.
for (const copa of ["reinos", "espacio"]) {
  Deno.test(`puntos-copas (${copa}): copa en sala, un tiempo fuera del reloj del servidor responde carrera_invalida y no suma`, async () => {
    const c = ctx();
    const codigo = await copaEmpezada(c, copa);
    const v = await vista(c, codigo);
    const cal = v.copa.calendario[0], ref = A.refKarts(cal.pista);
    c.ir(cal.inicio + 40_000);
    const r = await reportar(c, codigo, "Marisol", 0, Math.round(ref * 0.9)); // dice 0.9 × ref, pero solo pasaron 40 s
    assertEquals([r.status, r.body.error], [400, "carrera_invalida"], JSON.stringify(r.body));
    const t = (await vista(c, codigo)).copa.tabla.find((x: any) => x.nombre === "Marisol");
    assertEquals(t.pts, 0);
  });
}

for (const copa of COPAS) {
  Deno.test(`puntos-copas (${copa}): copa en sala, quien gana la carrera 1 suma 15 y las 4 carreras se pueden reportar`, async () => {
    const c = ctx();
    const codigo = await copaEmpezada(c, copa);
    const v0 = await vista(c, codigo);
    assertEquals(v0.copa.pistas, KP.copaPorId(copa).pistas, copa + ": las pistas de la copa");
    for (let k = 0; k < 4; k++) {
      const v = await vista(c, codigo); // NOSONAR: llamadas en orden (el reloj y cada paso dependen del anterior)
      const cal = v.copa.calendario[k];
      assert(cal, copa + ": carrera " + k + " con hora de inicio");
      if (c.ahora() < cal.inicio) c.ir(cal.inicio);
      const pista = v0.copa.pistas[k], ref = A.refKarts(pista);
      // Marisol gana: 90 % de la referencia (los bots tardan al menos la referencia / ritmoBots de la pista).
      const msGana = Math.round(ref * 0.9 / 10) * 10;
      c.ir(cal.inicio + msGana + 300); // el reporte llega 0.3 s después de cruzar la meta
      const r1 = await reportar(c, codigo, "Marisol", k, msGana); // NOSONAR: llamadas en orden
      assertEquals(r1.status, 200, `${copa} carrera ${k} (${pista}) Marisol ${msGana} ms: ${JSON.stringify(r1.body)}`);
      // karts-3-vueltas: con 3 vueltas, «realista» (108 %) llega > 30 s después del 90 % y la carrera ya cerró
      // (karts-copa-sala-4); Angel llega 20 s después de Marisol, dentro del plazo.
      const msAngel = Math.min(realista(pista), msGana + 20_000);
      c.ir(cal.inicio + msAngel + 300);
      const r2 = await reportar(c, codigo, "Angel", k, msAngel); // NOSONAR: llamadas en orden
      assertEquals(r2.status, 200, `${copa} carrera ${k} (${pista}) Angel ${msAngel} ms: ${JSON.stringify(r2.body)}`);
      const v2 = await vista(c, codigo); // NOSONAR: llamadas en orden
      const marisol = v2.copa.tabla.find((x: any) => x.nombre === "Marisol");
      assertEquals(marisol.porCarrera[k].lugar, 1, `${copa} carrera ${k}: Marisol 1.ª ${JSON.stringify(v2.copa.resultados[k])}`);
      assertEquals(marisol.pts, 15 * (k + 1), `${copa} carrera ${k}: Marisol suma 15 por carrera`);
      if (k === 0) assertEquals(v2.copa.tabla[0].nombre, "Marisol", copa + ": Marisol arriba en la tabla tras la carrera 1");
    }
    const fin = await vista(c, codigo);
    assertEquals(fin.copa.fase, "final");
    const marisol = fin.copa.tabla.find((x: any) => x.nombre === "Marisol");
    assertEquals([marisol.pts, marisol.ranking], [60, 2000], copa);
    const p = await c.call("POST", "/partida", "Marisol", { juego: "karts", puntos: 2000, aciertos: 0, total: 0, segundos: 0, sala: codigo });
    assertEquals([p.status, p.body.puntos], [200, 2000], copa + ": " + JSON.stringify(p.body));
  });
}
