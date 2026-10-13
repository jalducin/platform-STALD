// Datos de las pistas de Karts (openspec: karts-pistas-mesoamericanas): cada pista es cerrada y manejable, sus
// mecánicas quedan sobre el camino, el minimapa encuadra el trazado completo y las copas usan pistas que existen.
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

Deno.test("karts-pistas: 8 pistas con id único, nombre, descripción corta, tema y escenario", () => {
  const ids = KP.PISTAS.map((p: any) => p.id);
  assertEquals(ids, [...ORIGINALES, ...NUEVAS]);
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
  for (const p of KP.PISTAS) {
    const M = A.muestrearPista(p), pts = M.pts, n = pts.length;
    const cierre = Math.hypot(pts[n - 1].x - pts[0].x, pts[n - 1].y - pts[0].y);
    assert(cierre <= M.paso * 1.5, p.id + " cerrado (" + cierre.toFixed(1) + " px)");
    assert(M.largo >= 3800 && M.largo <= 6500, p.id + " largo razonable: " + Math.round(M.largo));
    assert(pts.every((q: any) => q.x >= p.mitad + 90 && q.y >= p.mitad + 90), p.id + " deja orilla en el mapa");
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

Deno.test("karts-pistas: las curvas se pueden tomar (radio mínimo) y la meta está en una recta", () => {
  for (const p of KP.PISTAS) {
    const M = A.muestrearPista(p), pts = M.pts, n = pts.length, v = 6;
    let radio = Infinity;
    for (let i = 0; i < n; i++) {
      const da = Math.abs(ang(pts[(i + v) % n].a - pts[(i - v + n) % n].a));
      if (da > 1e-6) radio = Math.min(radio, (2 * v * M.paso) / da);
    }
    assert(radio >= 80, p.id + " radio mínimo " + Math.round(radio) + " px");
    const recta = Math.abs(ang(pts[8].a - pts[n - 8].a));
    if (NUEVAS.includes(p.id)) assert(recta < 0.35, p.id + " meta en recta (" + recta.toFixed(2) + " rad)");
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
  const tipos = (id: string) => A.pistaPorId(id).mecanicas.map((m: any) => m.tipo);
  assert(tipos("tenochtitlan").includes("trajinera"));
  assert(tipos("teotihuacan").includes("turbo"));
  assert(tipos("chichen").includes("salto") && tipos("chichen").includes("cenote"));
  assert(tipos("laventa").includes("lodo"));
  for (const id of ORIGINALES) assertEquals(A.pistaPorId(id).mecanicas || [], [], id + " sin mecánicas nuevas");
});

Deno.test("karts-pistas: la trajinera cruza el canal de orilla a orilla y es determinista", () => {
  const p = A.pistaPorId("tenochtitlan"), M = A.muestrearPista(p);
  const z = KP.colocarMecanicas(p, M).find((x: any) => x.tipo === "trajinera");
  const lados = [];
  for (let t = 0; t < z.periodo; t += 0.05) lados.push(KP.ladoTrajinera(z, t));
  assert(Math.min(...lados) < -p.mitad && Math.max(...lados) > p.mitad, "sale de las dos orillas");
  assertAlmostEquals(KP.ladoTrajinera(z, 3.7), KP.ladoTrajinera(z, 3.7 + z.periodo * 2), 1e-9);
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
  assertEquals(KP.COPAS.map((c: any) => c.id), ["fiesta", "mesoamerica"]);
  assertEquals(KP.COPAS[0].pistas, ORIGINALES);
  assertEquals(KP.COPAS[1].pistas, ["laventa", "teotihuacan", "chichen", "tenochtitlan"]);
  for (const c of KP.COPAS) {
    assert(c.nombre && c.emoji && c.desc, c.id);
    assert(c.pistas.every((id: string) => A.pistaPorId(id)), c.id + " con pistas que existen");
  }
  assertEquals(KP.copaPorId("mesoamerica").nombre, "Copa Mesoamericana");
  assertEquals(KP.copaPorId(undefined).id, "fiesta", "progreso viejo sin id → Copa Fiesta");
});

Deno.test("karts-pistas: las salas siguen con las 4 pistas originales (igual que el servidor)", () => {
  assertEquals(A.PISTAS.map((p: any) => p.id), MAPAS_SALA.karts);
  for (let s = 0; s < 60; s++) assert(MAPAS_SALA.karts.includes(A.mapaDeSala("karts", "semilla" + s)));
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
  }
});
