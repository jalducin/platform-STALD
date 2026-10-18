// Carreras de 3 vueltas en Karts (openspec: karts-3-vueltas): 3 vueltas en las 16 pistas, referencia y límites de sala
// recalculados con ellas, plausibilidad del servidor, bots, RECORD_MAX_MS coherente con los límites nuevos (una
// carrera lenta de 3 vueltas es récord válido y la copa nunca se pierde), récords de 2 vueltas archivados en recordsV3
// (VERSION_PISTAS 4) y la reversa sigue sin contar vueltas.
// deno-lint-ignore-file no-explicit-any
import { assert, assertEquals } from "jsr:@std/assert@1";
import "../juegos/karts-pistas.js";
import "../juegos/arcade.js";
import "../juegos/karts-reversa.js";
import "../juegos/karts-copa.js";
import { MAPAS_SALA, reglasCarrera } from "./carreras.ts";
import { validarProgreso, VERSION_PISTAS_KARTS } from "./progreso.ts";

const g = globalThis as any;
const KP = g.KartsPistas, A = g.Arcade, KR = g.KartsReversa;
const largo = (id: string) => A.muestrearPista(A.pistaPorId(id)).largo;
const base = () => ({
  copas: { fiesta: { lugar: 2, puntos: 44 } }, records: {}, piezas: ["chasis-ligero"],
  equipo: { chasis: "ligero", llantas: "estandar", color: "azul" }, copaEnCurso: null,
});
const v4 = (extra: any = {}) => ({ ...base(), pistasV: 4, recordsV1: {}, recordsV2: {}, recordsV3: {}, ...extra });

Deno.test("3 vueltas: las 16 pistas y el valor por omisión", () => {
  assertEquals(KP.PISTAS.length, 16);
  assertEquals(A.VUELTAS, 3);
  for (const p of KP.PISTAS) assertEquals([p.vueltas, A.vueltasDe(p.id)], [3, 3], p.id);
  assertEquals(A.vueltasDe("luna"), 3, "pista desconocida: el valor por omisión");
});

Deno.test("3 vueltas: referencia = 3 vueltas a 200 px/s (≈ 3:00–3:30) y 1.5 veces la de 2 vueltas", () => {
  for (const p of KP.PISTAS) {
    const ref = A.refKarts(p.id), dos = Math.round(largo(p.id) * 2 / (A.VEL_KART * 0.8) * 1000);
    assertEquals(ref, Math.round(largo(p.id) * 3 / (A.VEL_KART * 0.8) * 1000), p.id);
    assert(Math.abs(ref / dos - 1.5) < 0.001, p.id + " 1.5×");
    assert(ref >= 175_000 && ref <= 215_000, p.id + " referencia " + ref);
  }
});

Deno.test("3 vueltas: límites de sala (25 % y 2.5×) y plausibilidad del servidor con ellos", () => {
  const lims: number[] = [], mins: number[] = [];
  for (const id of MAPAS_SALA.karts) {
    const ref = A.refKarts(id), l = A.limitesKarts(id);
    assertEquals(l, { minMs: Math.round(ref * 0.25), limiteMs: Math.ceil(ref * 2.5 / 10_000) * 10_000 }, id);
    assert(l.minMs >= 43_000 && l.limiteMs >= 440_000 && l.limiteMs <= 540_000, id + " " + JSON.stringify(l));
    assertEquals(reglasCarrera("karts", id), l, id + ": el servidor usa los mismos límites");
    lims.push(l.limiteMs); mins.push(l.minMs);
  }
  assertEquals([A.LIMITE_SALA.karts, A.MIN_SALA.karts], [Math.max(...lims), Math.min(...mins)]);
  assertEquals(reglasCarrera("karts", "luna"), { minMs: A.MIN_SALA.karts, limiteMs: A.LIMITE_SALA.karts });
});

Deno.test("3 vueltas: bots de sala con la referencia nueva (más lentos que 2 vueltas y dentro del límite)", () => {
  for (const id of MAPAS_SALA.karts) {
    for (const b of A.BOTS_SALA) {
      const ms = A.tiempoBot("karts", id, 12345, b.id), l = A.limitesKarts(id);
      assert(ms >= l.minMs && ms <= l.limiteMs, id + " " + b.id + " " + ms);
      assert(ms > 160_000, id + " " + b.id + " corre las 3 vueltas: " + ms);
    }
  }
});

Deno.test("3 vueltas: RECORD_MAX_MS coherente con los límites nuevos", () => {
  assertEquals([KP.RECORD_MIN_MS, KP.RECORD_MAX_MS], [10_000, 1_200_000]);
  assert(KP.RECORD_MAX_MS >= 2 * A.LIMITE_SALA.karts, "≥ 2 veces el mayor límite de sala");
  assert(KP.RECORD_MAX_MS >= 5 * Math.max(...KP.PISTAS.map((p: any) => A.refKarts(p.id))), "≥ 5 veces la mayor referencia");
  // Una carrera lenta de 3 vueltas (12 min atorado) es récord válido y el servidor lo acepta.
  const pr: any = v4({ copaEnCurso: KP.copaNueva("reinos") });
  assert(KP.anotarRecord(pr, "giza", 12 * 60_000));
  KP.sumarCarreraCopa(pr, [0, 1, 2, 3, 4, 5, 6, 7], 0);
  assert(validarProgreso("karts", pr), JSON.stringify(pr.records));
  // Más de 20 min: no es récord, pero la copa se guarda.
  for (const ms of [KP.RECORD_MAX_MS, KP.RECORD_MAX_MS + 1, 25 * 60_000, 3_600_000]) {
    const q: any = v4({ copaEnCurso: KP.copaNueva("espacio") });
    KP.anotarRecord(q, "orbital", ms);
    KP.sumarCarreraCopa(q, [0, 1, 2, 3, 4, 5, 6, 7], 0);
    assert(validarProgreso("karts", q), "ms=" + ms);
    assertEquals(q.copaEnCurso.puntos[0], 15);
  }
});

Deno.test("3 vueltas: récords de 2 vueltas (versión 3) pasan a recordsV3 sin perder copas, piezas ni la copa en curso", () => {
  assertEquals([KP.VERSION_PISTAS, VERSION_PISTAS_KARTS], [4, 4]);
  const copaEnCurso = { copa: "mesoamerica", carrera: 2, puntos: [27, 20, 18, 10, 8, 6, 3, 1], dif: 95 };
  const pr: any = { ...base(), copaEnCurso, records: { pradera: 121_500, orbital: 131_000 }, pistasV: 3, recordsV1: { pradera: 61_000 }, recordsV2: { giza: 128_000 } };
  assertEquals(KP.migrarRecords(pr), "vueltas");
  assertEquals([pr.pistasV, pr.records, pr.recordsV3], [4, {}, { pradera: 121_500, orbital: 131_000 }]);
  assertEquals([pr.recordsV1, pr.recordsV2, pr.copas, pr.piezas, pr.copaEnCurso], [{ pradera: 61_000 }, { giza: 128_000 }, base().copas, base().piezas, copaEnCurso]);
  assert(validarProgreso("karts", pr), "el avance migrado es válido");
  // Ya migrado: no hace nada.
  assertEquals(KP.migrarRecords(pr), false);
  // Versión 3 sin récords: sube de versión sin aviso.
  const sin: any = { ...base(), pistasV: 3, recordsV1: {}, recordsV2: {} };
  assertEquals([KP.migrarRecords(sin), sin.pistasV, sin.recordsV3], [false, 4, {}]);
});

Deno.test("3 vueltas: de la versión 2, las rediseñadas a recordsV2 y las demás a recordsV3; sin versión, «pista chica»", () => {
  const pr: any = { ...base(), records: { pradera: 120_500, orbital: 131_000 }, pistasV: 2, recordsV1: {} };
  assertEquals(KP.migrarRecords(pr), "vueltas");
  assertEquals([pr.records, pr.recordsV2, pr.recordsV3, pr.pistasV], [{}, { orbital: 131_000 }, { pradera: 120_500 }, 4]);
  const solo: any = { ...base(), records: { giza: 128_000 }, pistasV: 2, recordsV1: {} };
  assertEquals([KP.migrarRecords(solo), solo.recordsV2, solo.recordsV3], ["trazado", { giza: 128_000 }, {}]);
  const viejo: any = { ...base(), records: { pradera: 61_234 } };
  assertEquals([KP.migrarRecords(viejo), viejo.records, viejo.recordsV1, viejo.recordsV2, viejo.recordsV3, viejo.pistasV], ["chica", {}, { pradera: 61_234 }, {}, {}, 4]);
});

Deno.test("3 vueltas: el servidor acepta la forma nueva y las anteriores, y rechaza combinaciones inválidas", () => {
  const records = { pradera: 185_000 };
  assert(validarProgreso("karts", v4({ records, recordsV3: { pradera: 121_000 } })), "versión 4");
  assert(validarProgreso("karts", { ...base(), records, pistasV: 3, recordsV1: {}, recordsV2: {} }), "versión 3 (pestaña vieja)");
  assert(validarProgreso("karts", { ...base(), records, pistasV: 2, recordsV1: {} }), "versión 2 (pestaña vieja)");
  assert(validarProgreso("karts", { ...base(), records }), "forma anterior");
  for (const malo of [
    { ...base(), records, pistasV: 3, recordsV1: {}, recordsV2: {}, recordsV3: {} }, // recordsV3 solo con la versión 4
    { ...base(), records, pistasV: 4, recordsV1: {}, recordsV2: {} }, // a la 4 le falta recordsV3
    { ...base(), records, pistasV: 4, recordsV1: {}, recordsV3: {} }, // y recordsV2
    v4({ recordsV3: { pradera: 5 } }), // tiempo imposible
    v4({ recordsV3: { "Pradera!": 121_000 } }), // pista inválida
    v4({ pistasV: 5 }),
  ]) assertEquals(validarProgreso("karts", malo), false, JSON.stringify(malo));
});

Deno.test("3 vueltas: la reversa sobre la meta no suma vueltas y la 3.ª vuelta termina la carrera", () => {
  const N = 400, k: any = { idx: N - 3, vuelta: 2, mitadOk: true, deuda: 0, termino: null };
  const mover = (i: number) => { const antes = k.idx; k.idx = i; return KR.cruzarMeta(k, antes, N); };
  assertEquals(mover(3), "vuelta");
  assertEquals(k.vuelta, 3, "cruza por 3.ª vez: vuelta === vueltasDe (fin de la carrera)");
  assert(k.vuelta >= A.vueltasDe("pradera"));
  const j: any = { idx: N - 3, vuelta: 1, mitadOk: true, deuda: 0, termino: null };
  const mj = (i: number) => { const antes = j.idx; j.idx = i; return KR.cruzarMeta(j, antes, N); };
  assertEquals(mj(3), "vuelta");
  for (let i = 0; i < 10; i++) { assertEquals(mj(N - 4), "atras"); assertEquals(mj(4), "recupera"); }
  assertEquals([j.vuelta, j.deuda], [2, 0], "ir y venir no llega a la 3.ª");
});

// karts-3-vueltas + karts-copa-sala-4: si nadie llega, la carrera (suelta o de copa) cierra al vencer el límite de la
// pista con 3 vueltas + la gracia; con una llegada, a los 30 s de ella (el plazo no depende de las vueltas).
Deno.test("3 vueltas: el límite de la pista con 3 vueltas sigue siendo el cierre de respaldo de la sala", () => {
  const KC = g.KartsCopa;
  for (const id of MAPAS_SALA.karts) {
    const limite = A.limiteSala("karts", id), inicio = 1_000_000;
    assertEquals(limite, A.limitesKarts(id).limiteMs, id);
    assert(limite >= 440_000, id + " límite de 3 vueltas: " + limite);
    const c = { inicio, limite, total: 2, reportes: [undefined, undefined] };
    assertEquals(KC.cierreCarrera(c, inicio + limite + A.GRACIA_SALA - 1).cierre, null, id + " sigue abierta antes del límite");
    assertEquals(KC.cierreCarrera(c, inicio + limite + A.GRACIA_SALA).cierre, inicio + limite + A.GRACIA_SALA, id + " cierra al vencer");
    const llegada = inicio + A.refKarts(id);
    const una = { inicio, limite, total: 2, reportes: [{ t: llegada, ms: A.refKarts(id) }, undefined] };
    assertEquals(KC.cierreCarrera(una, llegada + KC.PLAZO_MS).cierre, llegada + KC.PLAZO_MS, id + " 30 s tras la primera llegada");
  }
});
