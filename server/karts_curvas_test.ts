// Curvas complejas de Karts (openspec: karts-curvas-complejas): las 4 pistas del Espacio y las 4 de Reinos Antiguos
// tienen trazados técnicos medibles (curvas > 120°, espiral / sacacorchos / laberinto, chicanas u horquillas), siguen
// cerradas y manejables (sin encimarse, radio ≥ 100 px, meta en recta, minimapa legible), con la vuelta ±15 % de la de
// antes y límites de sala recalculados; sus récords del trazado anterior se archivan en recordsV2.
// deno-lint-ignore-file no-explicit-any
import { assert, assertEquals } from "jsr:@std/assert@1";
import "../juegos/karts-pistas.js";
import "../juegos/arcade.js";
import { MAPAS_SALA, reglasCarrera } from "./carreras.ts";
import { validarProgreso, VERSION_PISTAS_KARTS } from "./progreso.ts";

const g = globalThis as any;
const KP = g.KartsPistas, A = g.Arcade;
const ESPACIO = ["orbital", "anillos", "cinturon", "nebulosa"];
const REINOS = ["giza", "castillo", "karnak", "angkor"];
const REDISENADAS = [...REINOS, ...ESPACIO];
// Largo de la vuelta (px) de cada pista ANTES del rediseño (medido con muestrearPista).
const LARGO_ANTES: Record<string, number> = {
  orbital: 13473, anillos: 13917, cinturon: 11992, nebulosa: 13729, giza: 13348, castillo: 13902, karnak: 11634, angkor: 11665,
};
const ang = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const muestras = (id: string) => A.muestrearPista(A.pistaPorId(id));
function distanciaLejana(pts: any[], salto: number, esc = 1) {
  const n = pts.length;
  let minimo = Infinity;
  for (let i = 0; i < n; i += 2) {
    for (let j = i + salto; j < n && n - (j - i) >= salto; j += 2) minimo = Math.min(minimo, Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y) * esc);
  }
  return minimo;
}
function radioMinimo(M: any) {
  const pts = M.pts, n = pts.length;
  let radio = Infinity;
  for (let i = 0; i < n; i++) {
    const da = Math.abs(ang(pts[(i + 6) % n].a - pts[(i - 6 + n) % n].a));
    if (da > 1e-6) radio = Math.min(radio, (12 * M.paso) / da);
  }
  return radio;
}

Deno.test("karts-curvas: las 8 pistas rediseñadas llevan trazado 3 y la versión de pistas sube (3; 4 con karts-3-vueltas)", () => {
  assertEquals(KP.VERSION_PISTAS, 4); // karts-3-vueltas
  assertEquals(VERSION_PISTAS_KARTS, KP.VERSION_PISTAS, "el servidor usa la misma versión");
  assertEquals(KP.PISTAS.filter((p: any) => p.trazado === 3).map((p: any) => p.id).sort(), [...REDISENADAS].sort());
  for (const p of KP.PISTAS.filter((x: any) => !REDISENADAS.includes(x.id))) assertEquals(p.trazado, undefined, p.id + " sin cambio de trazado");
});

// Giro total por vuelta (°) de cada pista ANTES del rediseño (KartsPistas.complejidad sobre los trazados de antes).
const GIRO_ANTES: Record<string, number> = {
  orbital: 839, anillos: 1080, cinturon: 742, nebulosa: 1015, giza: 702, castillo: 1039, karnak: 651, angkor: 933,
};
Deno.test("karts-curvas: complejidad medible (giro total, espiral / sacacorchos / laberinto, chicanas u horquillas)", () => {
  for (const id of REDISENADAS) {
    const c = KP.complejidad(muestras(id));
    assert(c.giroTotal >= 1350 && c.giroTotal >= GIRO_ANTES[id] * 1.5, id + " giro total " + c.giroTotal + "° (antes " + GIRO_ANTES[id] + "°)");
    assert(c.curvas >= 10 && c.mayores120 >= 1, id + " 10 o más curvas y al menos una de más de 120°: " + JSON.stringify(c));
    assert(c.espirales + c.sacacorchos >= 1 || c.laberinto >= 4, id + " espiral, sacacorchos o laberinto: " + JSON.stringify(c));
    assert(c.chicanas + c.horquillas >= 3, id + " chicanas u horquillas: " + JSON.stringify(c));
  }
  // Ninguna pista de antes llega a ese giro: la medida distingue los trazados técnicos.
  for (const p of KP.PISTAS.filter((x: any) => !REDISENADAS.includes(x.id))) assert(KP.complejidad(A.muestrearPista(p)).giroTotal < 1350, p.id);
  // Las secciones estrella de cada pista del Espacio.
  const de = (id: string) => KP.complejidad(muestras(id));
  assert(de("anillos").espirales >= 1 && de("nebulosa").espirales >= 1, "espiral doble en Anillos y Nebulosa (≥ 360° en un sentido)");
  assert(de("orbital").laberinto >= 6, "laberinto de pasillos en la Estación Orbital");
  assert(de("cinturon").sacacorchos >= 1 && de("cinturon").laberinto >= 4, "sacacorchos y escalera en el Cinturón");
});

Deno.test("karts-curvas: la complejidad distingue un óvalo de una espiral", () => {
  const ovalo = { id: "ovalo-prueba", mitad: 54, vueltas: 2, puntos: [[300, 300], [1500, 300], [1800, 600], [1500, 900], [300, 900], [100, 600]] };
  const c = KP.complejidad(A.muestrearPista(ovalo));
  assertEquals([c.espirales, c.sacacorchos], [0, 0]);
  assert(c.laberinto < 4 && c.mayores120 <= 2, JSON.stringify(c));
  const curvas = KP.curvasTrazado(muestras("anillos"));
  assert(curvas.some((x: any) => x.grados >= 400), "la espiral de los anillos gira más de 400° en un sentido");
});

Deno.test("karts-curvas: trazados cerrados, sin encimarse, radio ≥ 100 px, meta en recta y textura acotada", () => {
  for (const id of REDISENADAS) {
    const p = A.pistaPorId(id), M = muestras(id), pts = M.pts, n = pts.length;
    assert(Math.hypot(pts[n - 1].x - pts[0].x, pts[n - 1].y - pts[0].y) <= M.paso * 1.5, id + " cerrado");
    assert(pts.every((q: any) => q.x >= p.mitad + 90 && q.y >= p.mitad + 90), id + " deja orilla");
    const W = Math.max(...pts.map((q: any) => q.x)) + 220, H = Math.max(...pts.map((q: any) => q.y)) + 220;
    assert(W * H <= 12.6e6, id + " textura ≤ 12.6 M px");
    assert(distanciaLejana(pts, Math.ceil((p.mitad * 4) / M.paso)) >= p.mitad * 2 + 30, id + " sin encimarse");
    assert(radioMinimo(M) >= 100, id + " radio mínimo " + Math.round(radioMinimo(M)));
    assert(Math.abs(ang(pts[8].a - pts[n - 8].a)) < 0.35, id + " meta en recta");
    const e = KP.encuadrarMinimapa(pts, 104, 72, 11);
    assert(distanciaLejana(pts, Math.ceil(1000 / M.paso), e.esc) >= 6, id + " minimapa legible");
  }
});

Deno.test("karts-curvas: vuelta ±15 % de la de antes, referencia de 115 a 140 s por 2 vueltas y límites de sala recalculados", () => {
  for (const id of REDISENADAS) {
    const veces = muestras(id).largo / LARGO_ANTES[id];
    assert(veces >= 0.85 && veces <= 1.15, id + " largo " + veces.toFixed(2) + "× el de antes");
    const ref = A.refKarts(id), l = A.limitesKarts(id);
    assert(ref * 2 / A.vueltasDe(id) >= 115_000 && ref * 2 / A.vueltasDe(id) <= 140_000, id + " referencia " + ref); // karts-3-vueltas: por 2 vueltas
    assertEquals(l, { minMs: Math.round(ref * 0.25), limiteMs: Math.ceil(ref * 2.5 / 10_000) * 10_000 });
    assertEquals(reglasCarrera("karts", id), l, id + " el servidor usa el límite nuevo");
    assert(MAPAS_SALA.karts.includes(id), id + " en salas");
  }
  assertEquals(MAPAS_SALA.karts, A.PISTAS.map((p: any) => p.id), "MAPAS_SALA sale de las pistas");
});

const base = () => ({
  copas: { fiesta: { lugar: 1, puntos: 60 } }, piezas: ["pintura-dorada"],
  equipo: { chasis: "estandar", llantas: "estandar", color: "dorado" }, copaEnCurso: null,
});
// karts-3-vueltas: desde la versión 2 se llega a la 4; los récords de las demás pistas (2 vueltas) pasan a recordsV3.
Deno.test("karts-curvas: migrar récords del trazado anterior (pistasV 2 → 4) sin perder copas, piezas ni otros récords", () => {
  const pr: any = { ...base(), records: { pradera: 120_500, orbital: 131_000, giza: 128_000 }, pistasV: 2, recordsV1: { pradera: 61_000 } };
  assertEquals(KP.migrarRecords(pr), "vueltas");
  assertEquals([pr.records, pr.recordsV3], [{}, { pradera: 120_500 }]);
  assertEquals(pr.recordsV2, { orbital: 131_000, giza: 128_000 });
  assertEquals([pr.pistasV, pr.recordsV1, pr.copas, pr.piezas], [4, { pradera: 61_000 }, base().copas, base().piezas]);
  assert(validarProgreso("karts", pr), "el servidor acepta el progreso migrado");
  assertEquals(KP.migrarRecords(pr), false, "migrar otra vez no cambia nada");
  // Sin récords en las pistas rediseñadas: el de 2 vueltas pasa a recordsV3 (karts-3-vueltas).
  const sin: any = { ...base(), records: { volcan: 125_000 }, pistasV: 2, recordsV1: {} };
  assertEquals([KP.migrarRecords(sin), sin.pistasV, sin.records, sin.recordsV2, sin.recordsV3], ["vueltas", 4, {}, {}, { volcan: 125_000 }]);
  // Progreso de antes de las pistas grandes: todo a «pista chica», como siempre.
  const viejo: any = { ...base(), records: { pradera: 61_234 } };
  assertEquals([KP.migrarRecords(viejo), viejo.records, viejo.recordsV1, viejo.recordsV2, viejo.pistasV], ["chica", {}, { pradera: 61_234 }, {}, 4]);
});

Deno.test("karts-curvas: forma del progreso versión 3 en el servidor (y las anteriores de pestañas viejas)", () => {
  const records = { pradera: 120_000 };
  assert(validarProgreso("karts", { ...base(), records, pistasV: 3, recordsV1: {}, recordsV2: { orbital: 130_000 } }), "versión 3");
  assert(validarProgreso("karts", { ...base(), records, pistasV: 2, recordsV1: {} }), "versión 2 (pestaña vieja)");
  assert(validarProgreso("karts", { ...base(), records }), "forma anterior");
  for (const malo of [
    { ...base(), records, pistasV: 2, recordsV1: {}, recordsV2: {} }, // recordsV2 solo con la versión 3
    { ...base(), records, pistasV: 3, recordsV1: {} }, // a la 3 le falta recordsV2
    { ...base(), records, pistasV: 3, recordsV1: {}, recordsV2: { orbital: 5 } }, // tiempo imposible
    { ...base(), records, pistasV: 3, recordsV1: {}, recordsV2: { "Orbital!": 130_000 } }, // pista inválida
    { ...base(), records, pistasV: 4, recordsV1: {}, recordsV2: {} },
  ]) assertEquals(validarProgreso("karts", malo), false, JSON.stringify(malo));
});
