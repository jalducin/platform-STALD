// Datos de las pistas de Karts (openspec: karts-pistas-mesoamericanas, karts-pistas-grandes): cada pista es cerrada y
// manejable, sus mecánicas quedan sobre el camino, el minimapa encuadra el trazado completo y las copas usan pistas que
// existen. karts-pistas-grandes: vueltas ≈ 3 veces más largas con radio mínimo ≥ el de antes, 2 vueltas por pista,
// mecánicas escaladas, minimapa legible y límites de sala por pista.
// deno-lint-ignore-file no-explicit-any
import { assert, assertAlmostEquals, assertEquals } from "jsr:@std/assert@1";
import "../juegos/karts-pistas.js";
import "../juegos/arcade.js";
import { MAPAS_SALA } from "./carreras.ts";
import { validarProgreso } from "./progreso.ts";

const g = globalThis as any;
const KP = g.KartsPistas, A = g.Arcade;
const NUEVAS = ["tenochtitlan", "teotihuacan", "chichen", "laventa"];
const ORIGINALES = ["pradera", "desierto", "hielo", "volcan"];
const TIPOS = ["trajinera", "turbo", "salto", "cenote", "lodo"];
const ang = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
// karts-pistas-grandes: largo (px) y radio mínimo (px) de cada pista ANTES del cambio (medidos con muestrearPista).
const LARGO_ANTES: Record<string, number> = { pradera: 3989, desierto: 4221, hielo: 4255, volcan: 4418, tenochtitlan: 4121, teotihuacan: 4225, chichen: 4042, laventa: 4373 };
const RADIO_ANTES: Record<string, number> = { pradera: 118, desierto: 124, hielo: 131, volcan: 83, tenochtitlan: 104, teotihuacan: 92, chichen: 120, laventa: 85 };
// karts-copa-espacio: las pistas que se agregan después (otras copas) se prueban en su propio archivo.
const conMedidaAntes = (p: any) => p.id in LARGO_ANTES;
const radioMinimo = (M: any) => {
  const pts = M.pts, n = pts.length, v = 6;
  let radio = Infinity;
  for (let i = 0; i < n; i++) {
    const da = Math.abs(ang(pts[(i + v) % n].a - pts[(i - v + n) % n].a));
    if (da > 1e-6) radio = Math.min(radio, (2 * v * M.paso) / da);
  }
  return radio;
};

Deno.test("karts-pistas: 8 pistas (y las que se agreguen) con id único, nombre, descripción corta, tema y escenario", () => {
  const ids = KP.PISTAS.map((p: any) => p.id);
  assertEquals(ids.slice(0, 8), [...ORIGINALES, ...NUEVAS]); // karts-copa-espacio: después vienen las de otras copas
  assertEquals(new Set(ids).size, ids.length, "ids únicos");
  for (const p of KP.PISTAS) {
    assert(p.nombre && p.emoji, p.id + " sin nombre o emoji");
    assert(typeof p.desc === "string" && p.desc.length >= 15 && p.desc.length <= 80, p.id + " descripción de 15 a 80 caracteres");
    assert(Array.isArray(p.tema.cielo) && p.tema.cielo.length === 3, p.id + " cielo de 3 colores");
    for (const k of ["bruma", "lejos", "cerca", "cerca2", "franja"]) assert(/^#[0-9a-f]{6}$/i.test(p.tema[k]), p.id + " tema." + k);
    assertEquals(p.decor.length, 3, p.id + " 3 tipos de adorno al azar");
    assert(p.decor[2][3] === 1 && p.decor.every((d: any, i: number) => i === 0 || d[3] > p.decor[i - 1][3]), p.id + " probabilidades acumuladas");
  }
});

Deno.test("karts-pistas: cada trazado es cerrado, cabe en el mapa y no se cruza consigo mismo", () => {
  for (const p of KP.PISTAS.filter(conMedidaAntes)) {
    const M = A.muestrearPista(p), pts = M.pts, n = pts.length;
    const cierre = Math.hypot(pts[n - 1].x - pts[0].x, pts[n - 1].y - pts[0].y);
    assert(cierre <= M.paso * 1.5, p.id + " cerrado (" + cierre.toFixed(1) + " px)");
    if (LARGO_ANTES[p.id]) { const veces = M.largo / LARGO_ANTES[p.id]; assert(veces >= 2.7 && veces <= 3.3, p.id + " vuelta ≈ 3 veces más larga: " + veces.toFixed(2) + "×"); }
    assert(pts.every((q: any) => q.x >= p.mitad + 90 && q.y >= p.mitad + 90), p.id + " deja orilla en el mapa");
    const W = Math.max(...pts.map((q: any) => q.x)) + 220, H = Math.max(...pts.map((q: any) => q.y)) + 220;
    assert(W * H <= 12.6e6, p.id + " textura del piso ≤ 12.6 M px: " + (W * H / 1e6).toFixed(1));
    // Dos tramos lejanos sobre la pista nunca se acercan tanto como para encimar el camino.
    const salto = Math.ceil((p.mitad * 4) / M.paso);
    let minimo = Infinity;
    for (let i = 0; i < n; i += 2) {
      for (let j = i + salto; j < n; j += 2) {
        if (n - (j - i) < salto) continue;
        minimo = Math.min(minimo, Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y));
      }
    }
    assert(minimo >= p.mitad * 2 + 30, p.id + " sin encimarse: " + Math.round(minimo) + " px");
  }
});

Deno.test("karts-pistas: las curvas se pueden tomar (radio mínimo ≥ el de antes) y la meta está en una recta", () => {
  for (const p of KP.PISTAS.filter(conMedidaAntes)) {
    const M = A.muestrearPista(p), pts = M.pts, n = pts.length;
    const radio = radioMinimo(M);
    assert(radio >= (RADIO_ANTES[p.id] ?? 100) && radio >= 100, p.id + " radio mínimo " + Math.round(radio) + " px (antes " + RADIO_ANTES[p.id] + ")");
    const recta = Math.abs(ang(pts[8].a - pts[n - 8].a));
    assert(recta < 0.35, p.id + " meta en recta (" + recta.toFixed(2) + " rad)");
  }
});

// karts-pistas-grandes: la referencia usa las vueltas de la pista. karts-3-vueltas: 3 vueltas (≈ 3 a 3.5 min).
Deno.test("karts-pistas: 3 vueltas por pista y carrera de referencia de 3 a 3.5 min", () => {
  assertEquals(A.VUELTAS, 3);
  for (const p of KP.PISTAS) {
    assertEquals([p.vueltas, A.vueltasDe(p.id)], [3, 3], p.id);
    const ref = A.refKarts(p.id);
    assertEquals(ref, Math.round(A.muestrearPista(p).largo * 3 / (A.VEL_KART * 0.8) * 1000), p.id + " referencia con sus vueltas");
    assert(ref >= 172_000 && ref <= 210_000, p.id + " referencia " + ref);
  }
  assertEquals(A.vueltasDe("luna"), 3, "pista desconocida: el valor por omisión");
  assertEquals(KP.VERSION_PISTAS, 4); // karts-3-vueltas: récords de 2 vueltas en recordsV3
});

// karts-pistas-grandes: en el minimapa de 104×72 dos tramos lejanos (≥ 1000 px por la pista) quedan a ≥ 6 px.
Deno.test("karts-pistas: minimapa legible (tramos lejanos separados)", () => {
  for (const p of KP.PISTAS) {
    const M = A.muestrearPista(p), pts = M.pts, n = pts.length, e = KP.encuadrarMinimapa(pts, 104, 72, 11);
    const salto = Math.ceil(1000 / M.paso);
    let minimo = Infinity;
    for (let i = 0; i < n; i += 2) {
      for (let j = i + salto; j < n; j += 2) {
        if (n - (j - i) < salto) continue;
        minimo = Math.min(minimo, Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y) * e.esc);
      }
    }
    assert(minimo >= 6, p.id + " tramos lejanos a " + minimo.toFixed(1) + " px en el minimapa");
  }
});

Deno.test("karts-pistas: cada pista nueva tiene al menos una mecánica sobre el camino", () => {
  for (const id of NUEVAS) {
    const p = A.pistaPorId(id), M = A.muestrearPista(p);
    assert(p.mecanicas && p.mecanicas.length >= 1, id + " con mecánica");
    const zonas = KP.colocarMecanicas(p, M);
    assertEquals(zonas.length, p.mecanicas.length);
    for (const z of zonas) {
      assert(TIPOS.includes(z.tipo), id + " tipo " + z.tipo);
      assert(z.idx > M.pts.length * 0.06 && z.idx < M.pts.length * 0.94, id + " " + z.tipo + " lejos de la meta");
      const c = M.pts[z.idx];
      assert(Math.hypot(z.x - c.x, z.y - c.y) + (z.tipo === "trajinera" ? 0 : z.r * 0.5) <= p.mitad + 1, id + " " + z.tipo + " sobre el camino");
    }
  }
  // karts-pistas-grandes: las mecánicas escalan con la pista.
  const cuantas = (id: string, t: string) => A.pistaPorId(id).mecanicas.filter((m: any) => m.tipo === t).length;
  assertEquals(cuantas("tenochtitlan", "trajinera"), 3);
  assertEquals(cuantas("teotihuacan", "turbo"), 9);
  assertEquals([cuantas("chichen", "salto"), cuantas("chichen", "cenote")], [2, 2]);
  assertEquals(cuantas("laventa", "lodo"), 7);
  // Cada salto de Chichén Itzá tiene su cenote justo después (≤ 30 muestras), para saltarlo con velocidad.
  const ch = A.pistaPorId("chichen"), Mc = A.muestrearPista(ch), zc = KP.colocarMecanicas(ch, Mc), nc = Mc.pts.length;
  for (const s of zc.filter((z: any) => z.tipo === "salto")) {
    assert(zc.some((z: any) => z.tipo === "cenote" && ((z.idx - s.idx + nc) % nc) > 0 && ((z.idx - s.idx + nc) % nc) <= 30), "salto con su cenote");
  }
  for (const id of ORIGINALES) assertEquals(A.pistaPorId(id).mecanicas || [], [], id + " sin mecánicas nuevas");
});

Deno.test("karts-pistas: cada trajinera cruza su canal de orilla a orilla y es determinista", () => {
  const p = A.pistaPorId("tenochtitlan"), M = A.muestrearPista(p), n = M.pts.length;
  const zs = KP.colocarMecanicas(p, M).filter((x: any) => x.tipo === "trajinera");
  assertEquals(new Set(zs.map((z: any) => z.periodo)).size, zs.length, "periodos distintos: no cruzan al mismo tiempo");
  for (const z of zs) {
    const lados = [];
    for (let t = 0; t < z.periodo; t += 0.05) lados.push(KP.ladoTrajinera(z, t));
    assert(Math.min(...lados) < -p.mitad && Math.max(...lados) > p.mitad, "sale de las dos orillas");
    assertAlmostEquals(KP.ladoTrajinera(z, 3.7), KP.ladoTrajinera(z, 3.7 + z.periodo * 2), 1e-9);
    // El canal (±210 px a lo ancho) no pasa por otro tramo de la calzada.
    for (let i = 0; i < n; i += 2) {
      const d = Math.min((i - z.idx + n) % n, (z.idx - i + n) % n);
      if (d * M.paso < 600) continue;
      assert(Math.hypot(M.pts[i].x - z.x, M.pts[i].y - z.y) > 210 + p.mitad, "canal lejos de otros tramos");
    }
  }
});

// karts-pistas-grandes: mínimo (25 % de la referencia) y límite (2.5 veces, en decenas de segundo) por pista.
Deno.test("karts-pistas: límites de sala por pista", () => {
  const mins: number[] = [], lims: number[] = [];
  for (const p of KP.PISTAS) {
    const ref = A.refKarts(p.id), l = A.limitesKarts(p.id);
    assertEquals(l, { minMs: Math.round(ref * 0.25), limiteMs: Math.ceil(ref * 2.5 / 10_000) * 10_000 }, p.id);
    assert(l.minMs >= 43_000 && l.limiteMs <= 540_000, p.id + " " + JSON.stringify(l)); // karts-3-vueltas
    mins.push(l.minMs);
    lims.push(l.limiteMs);
  }
  assertEquals([A.LIMITE_SALA.karts, A.MIN_SALA.karts], [Math.max(...lims), Math.min(...mins)]);
  assertEquals(A.limitesKarts("luna"), null);
});

Deno.test("karts-pistas: el minimapa encuadra todo el trazado dentro del margen y sin deformar", () => {
  for (const p of KP.PISTAS) {
    const pts = A.muestrearPista(p).pts;
    for (const [w, h] of [[96, 96], [120, 80], [80, 130]]) {
      const e = KP.encuadrarMinimapa(pts, w, h, 11);
      const xs = pts.map((q: any) => e.ox + q.x * e.esc), ys = pts.map((q: any) => e.oy + q.y * e.esc);
      assert(Math.min(...xs) >= 10.99 && Math.max(...xs) <= w - 10.99, p.id + " x dentro");
      assert(Math.min(...ys) >= 10.99 && Math.max(...ys) <= h - 10.99, p.id + " y dentro");
      const ancho = Math.max(...xs) - Math.min(...xs), alto = Math.max(...ys) - Math.min(...ys);
      assert(Math.abs(ancho - (w - 22)) < 0.01 || Math.abs(alto - (h - 22)) < 0.01, p.id + " usa todo el espacio en un eje");
    }
  }
});

Deno.test("karts-pistas: Copa Fiesta y Copa Mesoamericana con 4 pistas que existen", () => {
  // karts-copa-espacio: las dos primeras por dificultad (nivel 1 y 2); las demás copas se prueban en su archivo.
  assertEquals(KP.copasOrdenadas().slice(0, 2).map((c: any) => [c.id, c.nivel]), [["fiesta", 1], ["mesoamerica", 2]]);
  assertEquals(KP.copaPorId("fiesta").pistas, ORIGINALES);
  assertEquals(KP.copaPorId("mesoamerica").pistas, ["laventa", "teotihuacan", "chichen", "tenochtitlan"]);
  for (const c of KP.COPAS) {
    assert(c.nombre && c.emoji && c.desc, c.id);
    assert(c.pistas.every((id: string) => A.pistaPorId(id)), c.id + " con pistas que existen");
  }
  assertEquals(KP.copaPorId("mesoamerica").nombre, "Copa Mesoamericana");
  assertEquals(KP.copaPorId(undefined).id, "fiesta", "progreso viejo sin id → Copa Fiesta");
});

// juegos-en-vivo: las salas (hasta 8 personas en vivo) ofrecen las 8 pistas, también las mesoamericanas.
Deno.test("karts-pistas: las salas ofrecen todas las pistas (igual que el servidor)", () => {
  assertEquals(A.PISTAS.map((p: any) => p.id), MAPAS_SALA.karts);
  for (const id of ORIGINALES) assert(MAPAS_SALA.karts.includes(id), id + " en salas"); // karts-copa-espacio: y las de otras copas
  for (const id of NUEVAS) assert(MAPAS_SALA.karts.includes(id), id + " en salas");
  const azar = new Set<string>();
  for (let s = 0; s < 200; s++) { const m = A.mapaDeSala("karts", "semilla" + s); assert(MAPAS_SALA.karts.includes(m)); azar.add(m); }
  assert(NUEVAS.some((id: string) => azar.has(id)), "el azar también elige pistas nuevas");
  for (const id of NUEVAS) assert(A.refKarts(id) > 0 && A.nombreMapa("karts", id).includes(A.pistaPorId(id).nombre));
});

Deno.test("karts-pistas: el servidor acepta el progreso con cada copa en curso, su mejor resultado y los récords de las 8 pistas", () => {
  const records = Object.fromEntries(KP.PISTAS.map((p: any) => [p.id, 61_000]));
  for (const c of KP.COPAS) {
    const datos = {
      copas: { [c.id]: { lugar: 1, puntos: 60 } }, records, piezas: [],
      equipo: { chasis: "estandar", llantas: "estandar", color: "azul" },
      copaEnCurso: { copa: c.id, carrera: 1, puntos: [15, 12, 10, 8, 6, 4, 2, 1], dif: 95 },
    };
    assert(validarProgreso("karts", datos), c.id + " pasa la validación del servidor");
    assert(validarProgreso("karts", { ...datos, pistasV: KP.VERSION_PISTAS, recordsV1: records, recordsV2: {}, recordsV3: records }), c.id + " con récords versionados");
  }
});
