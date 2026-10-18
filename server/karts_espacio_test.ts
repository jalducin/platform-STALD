// Copa del Espacio de Karts (openspec: karts-copa-espacio): 4 pistas espaciales cerradas y manejables, del tamaño de
// las grandes; mecánicas deterministas sobre el camino (tramos sin barandal, huecos con rampa, gravedad baja,
// plataformas, antiturbo, portales, compuertas y rocas); caída y rescate; minimapa; ids; límites por pista; bots más
// rápidos; copa con nivel y desbloqueo; salas (pistas sueltas y copa completa) sin listas fijas.
// deno-lint-ignore-file no-explicit-any
import { assert, assertAlmostEquals, assertEquals } from "jsr:@std/assert@1";
import "../juegos/karts-pistas.js";
import "../juegos/arcade.js";
import "../juegos/karts-copa.js";
import { MAPAS_SALA, reglasCarrera } from "./carreras.ts";
import { opcionesCopa } from "./karts_copa.ts";
import { validarProgreso } from "./progreso.ts";

const g = globalThis as any;
const KP = g.KartsPistas, A = g.Arcade, KC = g.KartsCopa;
const ESPACIO = ["orbital", "anillos", "cinturon", "nebulosa"];
const NUEVOS_TIPOS = new Set(["abierto", "brecha", "gravedad", "plataforma", "antiturbo", "portal", "compuerta", "asteroide"]);
const ang = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const pista = (id: string) => A.pistaPorId(id);
const preparar = (id: string) => {
  const p = pista(id), M = A.muestrearPista(p), zonas = KP.colocarMecanicas(p, M);
  return { p, M, n: M.pts.length, zonas, marcas: KP.marcasEspacio(p, M, zonas) };
};
const frac = (i: number, n: number) => i / n;
const alfabetico = (a: string, b: string) => a.localeCompare(b);

// Distancia mínima (× esc) entre dos muestras separadas al menos `salto` muestras por la pista.
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
// Muestras de una zona (punto, tramo, hueco y salida del portal) que deben quedar lejos de la meta.
const muestrasDe = (z: any) => [z.idx, z.i0, z.i1, z.idxSalida].filter((x) => x !== undefined);
// Recorre una función periódica en un ciclo y devuelve sus valores.
const ciclo = (periodo: number, f: (t: number) => number, paso = 0.02) => {
  const out: number[] = [];
  for (let t = 0; t < periodo; t += paso) out.push(f(t));
  return out;
};

Deno.test("karts-copa-espacio: 4 pistas espaciales de sala con id válido, 3 vueltas (karts-3-vueltas), nombre y descripción", () => {
  for (const id of ESPACIO) {
    const p = pista(id);
    assert(p, id + " existe");
    assert(/^[a-z][a-z-]{1,19}$/.test(id), id + " id válido para los récords del servidor");
    assert(p.espacio === true && p.sala === true, id + " espacial y de sala");
    assertEquals([p.vueltas, A.vueltasDe(id)], [3, 3], id);
    assert(p.nombre && p.emoji && p.desc.length >= 15 && p.desc.length <= 80, id + " nombre y descripción corta");
    assert(Array.isArray(p.tema.cielo) && p.tema.cielo.length === 3 && p.tema.espacio, id + " cielo espacial");
    assertEquals(p.decor.length, 3, id + " 3 adornos al azar");
  }
  assertEquals(KP.PISTAS.filter((p: any) => p.espacio).map((p: any) => p.id), ESPACIO);
});

Deno.test("karts-copa-espacio: trazados cerrados, sin encimarse, curvas tomables y meta en recta", () => {
  for (const id of ESPACIO) {
    const { p, M, n } = preparar(id), pts = M.pts;
    assert(Math.hypot(pts[n - 1].x - pts[0].x, pts[n - 1].y - pts[0].y) <= M.paso * 1.5, id + " cerrado");
    assert(pts.every((q: any) => q.x >= p.mitad + 90 && q.y >= p.mitad + 90), id + " deja orilla");
    const W = Math.max(...pts.map((q: any) => q.x)) + 220, H = Math.max(...pts.map((q: any) => q.y)) + 220;
    assert(W * H <= 12.6e6, id + " textura ≤ 12.6 M px");
    const minimo = distanciaLejana(pts, Math.ceil((p.mitad * 4) / M.paso));
    assert(minimo >= p.mitad * 2 + 30, id + " sin encimarse: " + Math.round(minimo));
    assert(radioMinimo(M) >= 100, id + " radio mínimo " + Math.round(radioMinimo(M)));
    assert(Math.abs(ang(pts[8].a - pts[n - 8].a)) < 0.35, id + " meta en recta");
  }
});

Deno.test("karts-copa-espacio: del tamaño de las pistas grandes (referencia de 115 a 140 s por 2 vueltas) y límites de sala por pista", () => {
  for (const id of ESPACIO) {
    const ref = A.refKarts(id), l = A.limitesKarts(id);
    assert(ref * 2 / 3 >= 115_000 && ref * 2 / 3 <= 140_000, id + " referencia " + ref); // karts-3-vueltas: por 2 vueltas
    assertEquals(l, { minMs: Math.round(ref * 0.25), limiteMs: Math.ceil(ref * 2.5 / 10_000) * 10_000 }, id);
    assert(l.limiteMs <= 540_000, id + " límite " + l.limiteMs);
    assertEquals(reglasCarrera("karts", id), l, id + " el servidor usa el límite de la pista");
  }
  assertEquals(A.LIMITE_SALA.karts, Math.max(...A.PISTAS.map((p: any) => A.limitesKarts(p.id).limiteMs)));
  assertEquals(A.MIN_SALA.karts, Math.min(...A.PISTAS.map((p: any) => A.limitesKarts(p.id).minMs)));
});

Deno.test("karts-copa-espacio: minimapa legible (tramos lejanos ≥ 6 px en 104×72)", () => {
  for (const id of ESPACIO) {
    const { M } = preparar(id), e = KP.encuadrarMinimapa(M.pts, 104, 72, 11);
    const minimo = distanciaLejana(M.pts, Math.ceil(1000 / M.paso), e.esc);
    assert(minimo >= 6, id + " " + minimo.toFixed(1));
  }
});

function revisarZona(id: string, p: any, M: any, z: any) {
  const n = M.pts.length;
  for (const i of muestrasDe(z)) assert(frac(i, n) > 0.06 && frac(i, n) < 0.94, id + " " + z.tipo + " lejos de la meta (" + frac(i, n).toFixed(2) + ")");
  if (["turbo", "antiturbo", "portal"].includes(z.tipo)) {
    const c = M.pts[z.idx];
    assert(Math.hypot(z.x - c.x, z.y - c.y) + z.r * 0.5 <= p.mitad + 1, id + " " + z.tipo + " sobre el camino");
  }
  if (z.i0 !== undefined) assert(z.i1 > z.i0 && z.i1 - z.i0 < n * 0.2, id + " " + z.tipo + " tramo válido");
}
Deno.test("karts-copa-espacio: cada pista con 3 o más mecánicas nuevas, sobre el camino y lejos de la meta", () => {
  const usados = new Set<string>();
  for (const id of ESPACIO) {
    const { p, M, zonas } = preparar(id);
    const tipos: string[] = [...new Set<string>(zonas.map((z: any) => z.tipo))].filter((t) => NUEVOS_TIPOS.has(t));
    assert(tipos.length >= 3, id + " mecánicas nuevas: " + tipos.join(", "));
    tipos.forEach((t) => usados.add(t));
    for (const z of zonas) revisarZona(id, p, M, z);
  }
  assertEquals([...usados].sort(alfabetico), [...NUEVOS_TIPOS].sort(alfabetico), "la copa usa todas las mecánicas nuevas");
  for (const p of KP.PISTAS.filter((x: any) => !x.espacio)) {
    assert((p.mecanicas || []).every((m: any) => !NUEVOS_TIPOS.has(m.tipo)), p.id + " sin mecánicas espaciales");
    const M = A.muestrearPista(p);
    assertEquals(KP.marcasEspacio(p, M, KP.colocarMecanicas(p, M)), null, p.id + " sin vacío");
  }
});

// Cada muestra del tramo de la zona lleva sus banderas; los huecos, además, en recta.
function revisarMarcas(id: string, M: any, marcas: Uint8Array, z: any) {
  const { ABIERTO, HUECO, PLATAFORMA, GRAVEDAD } = KP.MARCA, n = M.pts.length;
  const bits: Record<string, number> = { abierto: ABIERTO, gravedad: GRAVEDAD, brecha: HUECO | ABIERTO, plataforma: PLATAFORMA | ABIERTO };
  if (!bits[z.tipo]) return;
  for (let i = z.i0; i <= z.i1; i++) assertEquals(marcas[i] & bits[z.tipo], bits[z.tipo], id + " " + z.tipo + " " + i);
  if (z.tipo === "brecha" || z.tipo === "plataforma") assert(Math.abs(ang(M.pts[z.i1 + 2].a - M.pts[(z.i0 - 2 + n) % n].a)) < 0.2, id + " " + z.tipo + " en recta");
}
const fraccionAbierta = (marcas: Uint8Array) => marcas.filter((m) => m & KP.MARCA.ABIERTO).length / marcas.length;
Deno.test("karts-copa-espacio: marcas de borde (abierto, hueco, plataforma y gravedad) y huecos en recta", () => {
  for (const id of ESPACIO) {
    const { M, n, zonas, marcas } = preparar(id);
    assertEquals(marcas.length, n);
    for (const z of zonas) revisarMarcas(id, M, marcas, z);
    assert(1 - fraccionAbierta(marcas) >= 0.55, id + " más de la mitad con barandal: " + (1 - fraccionAbierta(marcas)).toFixed(2));
    const enMeta = [...marcas].filter((m, i) => (frac(i, n) < 0.06 || frac(i, n) > 0.94) && m !== 0);
    assertEquals(enMeta.length, 0, id + " salida y meta sin marcas");
  }
  assert(fraccionAbierta(preparar("orbital").marcas) < fraccionAbierta(preparar("nebulosa").marcas), "la Nebulosa tiene más tramos abiertos que la Estación");
});

function revisarRescate(id: string, marcas: Uint8Array, i: number) {
  const { HUECO, PLATAFORMA } = KP.MARCA, hueco = HUECO | PLATAFORMA, n = marcas.length, r = KP.rescateEn(marcas, i);
  assert(!(marcas[r] & hueco), id + " rescate en firme desde " + i);
  assert(r > n * 0.04 && r < n * 0.96, id + " rescate lejos de la meta");
  if (marcas[i] & hueco) assert(r > i && r - i <= 20, id + " del hueco, el dron te deja del otro lado");
  else assert(r === i - 4 || (marcas[i - 4] & hueco && r - i <= 2), id + " del borde abierto, 4 muestras atrás (o pasando el hueco)");
}
Deno.test("karts-copa-espacio: al caer, el rescate deja el kart en el camino firme sin cruzar la meta", () => {
  for (const id of ESPACIO) {
    const { n, marcas } = preparar(id);
    for (let i = 0; i < n; i++) if (marcas[i] & KP.MARCA.ABIERTO) revisarRescate(id, marcas, i);
  }
  const E = KP.ESPACIO;
  assert(E.caidaS + E.remolqueS >= 2 && E.caidaS + E.remolqueS <= 2.5, "penalización fija ≈ 2.2 s");
});

Deno.test("karts-copa-espacio: los huecos se saltan a 150 px/s y la gravedad baja alarga el salto", () => {
  const E = KP.ESPACIO;
  assert(A.VEL_KART * 0.6 >= E.velSalto, "la rampa pide como mucho el 60 % de la punta");
  for (const id of ESPACIO) {
    const { M, zonas } = preparar(id);
    for (const z of zonas.filter((x: any) => x.tipo === "brecha")) {
      const hasta = (z.i1 + 1 - z.idx) * M.paso;
      assert(E.velSalto * E.saltoS >= hasta, id + " salto de " + E.velSalto * E.saltoS + " px ≥ " + hasta);
    }
  }
  assert(E.gravedadSalto > 1 && E.gravedadAgarre < 1 && E.antiturbo < 1);
});

function revisarPortal(id: string, a: any, b: any, k: number) {
  const z = a.zonas[k], n = a.n;
  assertEquals([z.idxSalida, Math.round(z.sx), Math.round(z.sy)], [b.zonas[k].idxSalida, Math.round(b.zonas[k].sx), Math.round(b.zonas[k].sy)], "misma salida");
  const fe = frac(z.idx, n), fs = frac(z.idxSalida, n);
  assert(fs > fe && fs - fe >= 0.03 && fs - fe <= 0.1, id + " salida 3–10 % adelante");
  assert((fe > 0.06 && fs < 0.4) || (fe > 0.6 && fs < 0.94), id + " no salta la mitad ni la meta");
  assert(!(a.marcas[z.idxSalida] & (KP.MARCA.HUECO | KP.MARCA.PLATAFORMA)), id + " sale en firme");
  assert(a.zonas.every((o: any) => o.tipo !== "portal" || Math.abs(o.idx - z.idxSalida) > 10), id + " no sale en otro portal");
}
Deno.test("karts-copa-espacio: portales deterministas en la misma mitad de la vuelta", () => {
  let portales = 0;
  for (const id of ESPACIO) {
    const a = preparar(id), b = preparar(id);
    a.zonas.forEach((z: any, k: number) => { if (z.tipo === "portal") { portales++; revisarPortal(id, a, b, k); } });
  }
  assert(portales >= 2, "al menos 2 portales");
});

Deno.test("karts-copa-espacio: plataformas que van y vienen y cubren el centro casi siempre", () => {
  for (const id of ESPACIO) {
    const { p, zonas } = preparar(id);
    for (const z of zonas.filter((x: any) => x.tipo === "plataforma")) {
      assertAlmostEquals(KP.ladoPlataforma(z, 1.3), KP.ladoPlataforma(z, 1.3 + z.periodo * 3), 1e-9);
      const lados = ciclo(z.periodo, (t) => KP.ladoPlataforma(z, t)), medio = z.ancho * p.mitad;
      const centro = lados.filter((c) => Math.abs(c) < medio).length / lados.length;
      assert(centro >= 0.5, id + " cubre el centro " + centro.toFixed(2));
      assert(medio >= p.mitad * 0.45 && Math.max(...lados.map(Math.abs)) + medio <= p.mitad + 20, id + " plataforma ancha y dentro del camino");
    }
  }
});

Deno.test("karts-copa-espacio: compuertas que abren y cierran con el centro siempre libre; rocas que cruzan", () => {
  for (const id of ESPACIO) {
    const { p, zonas } = preparar(id);
    for (const z of zonas.filter((x: any) => x.tipo === "compuerta")) {
      const a = ciclo(z.periodo, (t) => KP.aperturaCompuerta(z, t)), min = Math.min(...a), max = Math.max(...a);
      assert(min >= 0.3 - 1e-9 && max <= 1 && max > 0.95, id + " abre del todo y cierra hasta 0.3");
      assert(min * p.mitad >= 16, id + " el centro (±16 px) siempre pasa");
      assertAlmostEquals(KP.aperturaCompuerta(z, 2), KP.aperturaCompuerta(z, 2 + z.periodo), 1e-9);
    }
    const rocas = zonas.filter((x: any) => x.tipo === "asteroide");
    assertEquals(new Set(rocas.map((z: any) => z.periodo)).size, rocas.length, id + " rocas con periodos distintos");
    for (const z of rocas) {
      const lados = ciclo(z.periodo, (t) => KP.ladoTrajinera(z, t), 0.05);
      assert(Math.min(...lados) < -p.mitad && Math.max(...lados) > p.mitad, id + " la roca cruza de orilla a orilla");
    }
  }
});

function revisarFantasmas(id: string) {
  const ref = A.refKarts(id), ritmo = A.ritmoBots(id);
  for (const bot of A.BOTS_SALA) {
    for (let s = 0; s < 20; s++) {
      const ms = A.tiempoBot("karts", id, "semilla" + s, bot.id);
      assert(ms <= ref * bot.factor[1] / ritmo + 10 && ms >= ref * bot.factor[0] / ritmo - 10, id + " fantasma con el ritmo de la pista");
    }
  }
}
Deno.test("karts-copa-espacio: los bots más rápidos de todas las copas, más rápidos en cada pista de la copa", () => {
  const otras = KP.PISTAS.filter((p: any) => !p.espacio).map((p: any) => A.ritmoBots(p.id));
  ESPACIO.forEach((id, i) => {
    assert(A.ritmoBots(id) > Math.max(...otras), id + " más rápido que cualquier otra pista");
    if (i) assert(A.ritmoBots(id) > A.ritmoBots(ESPACIO[i - 1]), id + " más rápido que la anterior");
    revisarFantasmas(id);
  });
  assertEquals(A.ritmoBots("pradera"), 1);
  assertEquals(A.ritmoBots("luna"), 1);
});

Deno.test("karts-copa-espacio: Copa del Espacio con nivel 4, copas en orden de dificultad y desbloqueo con 2 podios", () => {
  const copa = KP.copaPorId("espacio");
  assertEquals([copa.id, copa.nombre, copa.nivel, copa.pistas], ["espacio", "Copa del Espacio", 4, ESPACIO]);
  assert(/^[a-z]{2,12}$/.test(copa.id) && copa.emoji && copa.desc);
  const orden = KP.copasOrdenadas(), niveles = orden.map((c: any) => c.nivel);
  assertEquals(niveles, [...niveles].sort((a: number, b: number) => a - b));
  assertEquals(new Set(niveles).size, orden.length, "niveles distintos");
  assertEquals([orden[0].id, orden[1].id, orden.at(-1).id], ["fiesta", "mesoamerica", "espacio"]);
  for (const c of KP.COPAS) assert(c.pistas.every((id: string) => pista(id)), c.id);
  const prog = (copas: Record<string, { lugar: number; puntos: number }>) => ({ copas });
  assertEquals(KP.copaDesbloqueada(copa, prog({})), false);
  assertEquals(KP.copaDesbloqueada(copa, prog({ fiesta: { lugar: 1, puntos: 60 } })), false, "1 podio no alcanza");
  assertEquals(KP.copaDesbloqueada(copa, prog({ fiesta: { lugar: 2, puntos: 40 }, mesoamerica: { lugar: 4, puntos: 20 } })), false, "4.º no es podio");
  assertEquals(KP.copaDesbloqueada(copa, prog({ fiesta: { lugar: 3, puntos: 30 }, mesoamerica: { lugar: 1, puntos: 50 } })), true);
  assertEquals(KP.copaDesbloqueada(copa, prog({ espacio: { lugar: 1, puntos: 60 }, fiesta: { lugar: 1, puntos: 60 } })), false, "la misma copa no cuenta");
  assertEquals(KP.podiosFaltan(copa, prog({ fiesta: { lugar: 1, puntos: 60 } })), 1);
  for (const id of ["fiesta", "mesoamerica"]) assertEquals(KP.copaDesbloqueada(KP.copaPorId(id), prog({})), true, id + " siempre abierta");
});

Deno.test("karts-copa-espacio: salas con las pistas espaciales y copa completa del espacio (sin listas fijas)", () => {
  assertEquals(MAPAS_SALA.karts, A.PISTAS.map((p: any) => p.id));
  for (const id of ESPACIO) assert(MAPAS_SALA.karts.includes(id), id + " en salas");
  const azar = new Set<string>();
  for (let s = 0; s < 400; s++) azar.add(A.mapaDeSala("karts", "s" + s));
  assert(ESPACIO.some((id) => azar.has(id)), "el azar también elige pistas espaciales");
  assertEquals(KC.COPAS_SALA, [...KP.copasOrdenadas().map((c: any) => c.id), "mixta"]);
  assertEquals([KC.NOMBRE.espacio, KC.EMOJI.espacio], ["Copa del Espacio", KP.copaPorId("espacio").emoji]);
  assertEquals(KC.pistasDe("espacio", 7), ESPACIO);
  assertEquals(opcionesCopa({ modo: "copa", copa: "espacio" }), { modo: "copa", copa: "espacio" });
  const mixta = KC.pistasDe("mixta", 12345);
  assert(mixta.length === 4 && mixta.every((id: string) => !ESPACIO.includes(id)), "la mixta sigue siendo Fiesta + Mesoamericana");
});

Deno.test("karts-copa-espacio: el servidor acepta el progreso con la Copa del Espacio y récords de todas las pistas", () => {
  const records = Object.fromEntries(KP.PISTAS.map((p: any) => [p.id, 95_000]));
  const datos = {
    copas: { fiesta: { lugar: 1, puntos: 60 }, mesoamerica: { lugar: 2, puntos: 44 }, espacio: { lugar: 3, puntos: 38 } }, records, piezas: [],
    equipo: { chasis: "estandar", llantas: "estandar", color: "azul" },
    copaEnCurso: { copa: "espacio", carrera: 2, puntos: [15, 12, 10, 8, 6, 4, 2, 1], dif: 95 },
    pistasV: KP.VERSION_PISTAS, recordsV1: {}, recordsV2: {}, recordsV3: {}, // karts-curvas-complejas: + recordsV2; karts-3-vueltas: + recordsV3
  };
  assert(validarProgreso("karts", datos), "progreso con la copa espacio");
  assertEquals(KP.VERSION_PISTAS, 4, "karts-3-vueltas: récords de 2 vueltas en recordsV3");
});
