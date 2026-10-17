// Copa Reinos Antiguos de Karts (openspec: karts-copa-reinos): 4 pistas con tramos DENTRO de cada monumento, mecánicas
// deterministas sobre el camino, columnas, copa por dificultad con candado (`requiere`), salas en pistas nuevas con su
// mínimo y su límite, copa en sala y copa mixta de todas las copas (sin listas fijas).
// deno-lint-ignore-file no-explicit-any
import { assert, assertAlmostEquals, assertEquals } from "jsr:@std/assert@1";
import "../juegos/karts-pistas.js";
import "../juegos/arcade.js";
import "../juegos/karts-copa.js";
import { MAPAS_SALA, reglasCarrera, validarCarrera } from "./carreras.ts";
import { opcionesCopa } from "./karts_copa.ts";

const g = globalThis as any;
const KP = g.KartsPistas, A = g.Arcade, KC = g.KartsCopa;
const REINOS = ["giza", "castillo", "karnak", "angkor"];
const TIPOS_NUEVOS = ["bloques", "roca", "compuerta", "arena", "luz"];
const pista = (id: string) => A.pistaPorId(id);

Deno.test("karts-reinos: Copa Reinos Antiguos con 4 pistas, más difícil que la Mesoamericana y con candado", () => {
  const c = KP.copaPorId("reinos");
  assertEquals([c.id, c.nombre, c.pistas], ["reinos", "Copa Reinos Antiguos", REINOS]);
  assert(/^[a-z]{2,12}$/.test(c.id), "id de copa válido para el servidor (2 a 12 letras)");
  assertEquals(c.requiere, "mesoamerica");
  const orden = KP.copasPorDificultad().map((x: any) => x.id);
  assertEquals(orden.slice(0, 3), ["fiesta", "mesoamerica", "reinos"], "orden de dificultad");
  assert(KP.copasPorDificultad().every((x: any, i: number, l: any[]) => i === 0 || x.dificultad > l[i - 1].dificultad), "dificultades crecientes");
  assertEquals([KP.copaAbierta(c, {}), KP.copaAbierta(c, { fiesta: { lugar: 1, puntos: 60 } })], [false, false]);
  assert(KP.copaAbierta(c, { mesoamerica: { lugar: 8, puntos: 3 } }), "se abre al TERMINAR la Mesoamericana, en cualquier lugar");
  assert(KP.copaAbierta(KP.copaPorId("fiesta"), {}) && KP.copaAbierta(KP.copaPorId("mesoamerica"), {}), "las de antes siguen abiertas");
  for (const id of REINOS) {
    const p = pista(id);
    assert(p.sala, id + " también en salas");
    assert(p.mitad <= 52, id + " camino más angosto que las mesoamericanas (56–58)");
    assert(p.bots > 1 && p.bots <= 1.05, id + " bots un poco más rápidos en el modo individual");
    assert(p.civ && p.int && /^#[0-9a-f]{6}$/i.test(p.int.muro) && p.int.cielo.length === 3, id + " civilización y colores del interior");
    const textos = [p.nombre, p.desc, ...(p.interiores || []).map((t: any) => t.nombre)].join(" ");
    assert(!/maldici|momia|tumba|miedo|terror|curse/i.test(textos), id + " textos de aventura, sin sustos: " + textos);
  }
});

Deno.test("karts-reinos: cada pista tiene tramos interiores largos, con muros dentro del camino, y la meta queda afuera", () => {
  for (const id of REINOS) {
    const p = pista(id), M = A.muestrearPista(p), n = M.pts.length;
    const tramos = KP.tramosInteriores(p, M), muros = KP.muroEn(p, M);
    assert(tramos.length >= 1, id + " con tramo interior");
    for (const t of tramos) {
      assert(t.largo * M.paso >= 600, id + " " + t.nombre + " de al menos 600 px: " + t.largo * M.paso);
      assert(t.w >= p.mitad * 0.8 && t.w <= p.mitad, id + " " + t.nombre + " muro entre 0.8 y 1 mitad: " + t.w);
      assert([0, 1, -1].includes(t.muro), id + " lado del muro");
    }
    const adentro = muros.w.filter((w: number) => w > 0).length;
    assert(adentro / n >= 0.25 && adentro / n <= 0.75, id + " entre 25 y 75 % de la vuelta adentro: " + Math.round(adentro / n * 100) + " %");
    for (let d = -40; d <= 40; d++) assertEquals(muros.w[(d + n) % n], 0, id + " la meta y la parrilla quedan afuera");
    assertEquals(muros.w.length, n);
  }
});

Deno.test("karts-reinos: al menos 2 mecánicas por pista, sobre el camino (dentro de los muros) y lejos de la meta", () => {
  const usados = new Set<string>();
  for (const id of REINOS) {
    const p = pista(id), M = A.muestrearPista(p), n = M.pts.length, muros = KP.muroEn(p, M);
    const zonas = KP.colocarMecanicas(p, M), cols = KP.colocarColumnas(p, M);
    const tipos = new Set([...zonas.map((z: any) => z.tipo), ...(cols.length ? ["columnas"] : [])]);
    assert(tipos.size >= 2, id + " con 2 o más mecánicas: " + [...tipos]);
    for (const z of zonas) {
      usados.add(z.tipo);
      assert(z.idx > n * 0.06 && z.idx < n * 0.94, id + " " + z.tipo + " lejos de la meta");
      const c = M.pts[z.idx], borde = muros.w[z.idx] || p.mitad;
      assert(Math.hypot(z.x - c.x, z.y - c.y) + z.r * 0.5 <= borde + 1, id + " " + z.tipo + " sobre el camino");
      if (["bloques", "roca", "compuerta"].includes(z.tipo)) assert(muros.w[z.idx] > 0, id + " " + z.tipo + " adentro del monumento");
      if (z.tipo === "roca") assert(z.ancho + z.r <= z.w, id + " la roca rueda entre los muros");
    }
  }
  assert(TIPOS_NUEVOS.filter((t) => usados.has(t)).length >= 2, "al menos 2 mecánicas nuevas en la copa: " + [...usados]);
});

Deno.test("karts-reinos: columnas de la sala hipóstila en el camino, alternadas y con un carril libre", () => {
  const p = pista("karnak"), M = A.muestrearPista(p), muros = KP.muroEn(p, M), cols = KP.colocarColumnas(p, M);
  assert(cols.length >= 8, "slalom de 8 o más columnas: " + cols.length);
  cols.forEach((c: any, i: number) => {
    assert(muros.w[c.idx] > 0, "columna adentro de la sala");
    const w = muros.w[c.idx];
    assert(Math.abs(c.lado) + c.r < w, "la columna no toca el muro");
    assert(w + Math.abs(c.lado) - c.r >= 40, "queda un carril libre de 40 px del otro lado");
    if (i) {
      assert(Math.sign(c.lado) !== Math.sign(cols[i - 1].lado), "alternadas");
      assert(Math.hypot(c.x - cols[i - 1].x, c.y - cols[i - 1].y) >= 100, "≥ 100 px entre columnas: da tiempo de esquivar");
    }
  });
  for (const id of REINOS.filter((x) => x !== "karnak")) assertEquals(KP.colocarColumnas(pista(id), A.muestrearPista(pista(id))), []);
});

Deno.test("karts-reinos: bloques, roca y compuertas son deterministas, periódicos y avisan", () => {
  const z = { periodo: 4, desfase: 0.5 };
  for (const t of [0, 0.7, 1.9, 3.3]) assertAlmostEquals(KP.alturaBloque(z, t), KP.alturaBloque(z, t + 8), 1e-9);
  // El aviso (el bloque baja y su sombra crece) empieza al menos 0.9 s antes del peligro.
  const primero = (desde: number, cumple: (t: number) => boolean) => {
    for (let t = desde; t < desde + 8; t += 0.01) { if (cumple(t)) return t; }
    return -1;
  };
  const aviso = primero(0, (t) => KP.alturaBloque(z, t) < KP.ALTO_BLOQUE - 0.01), peligro = primero(aviso, (t) => KP.bloquePeligro(z, t));
  assert(aviso >= 0 && peligro - aviso >= 0.9, "aviso de " + (peligro - aviso).toFixed(2) + " s");
  let enPeligro = 0;
  for (let t = 0; t < 4; t += 0.01) if (KP.bloquePeligro(z, t)) enPeligro += 0.01;
  assert(enPeligro > 0.3 && enPeligro < 1, "peligro un rato corto del ciclo: " + enPeligro.toFixed(2) + " s");
  const roca = { periodo: 3.4, ancho: 20 };
  const lados = [];
  for (let t = 0; t < 3.4; t += 0.02) lados.push(KP.ladoRoca(roca, t));
  assert(Math.max(...lados) > 19 && Math.min(...lados) < -19 && Math.max(...lados.map(Math.abs)) <= 20, "la roca va de un lado al otro sin pasar su recorrido");
  assertAlmostEquals(KP.ladoRoca(roca, 1.1), KP.ladoRoca(roca, 1.1 + 6.8), 1e-9);
  const comp = { periodo: 4, w: 42 };
  const centros = Array.from({ length: 200 }, (_, k) => KP.centroCompuerta(comp, k * 0.02));
  assert(centros.every((c) => Math.abs(c) <= 21 + 1e-9), "siempre queda medio camino libre (la losa tapa medio ancho)");
  assertEquals([KP.centroCompuerta(comp, 0.5), KP.centroCompuerta(comp, 2.5)], [-21, 21]);
});

Deno.test("karts-reinos: salas en las pistas nuevas con su mínimo y su límite (MAPAS_SALA sin lista fija)", () => {
  assertEquals(MAPAS_SALA.karts, A.PISTAS.map((p: any) => p.id), "los mapas de sala salen de las pistas con sala: true");
  for (const id of REINOS) {
    assert(MAPAS_SALA.karts.includes(id), id + " en salas");
    const l = reglasCarrera("karts", id)!;
    assertEquals(l, A.limitesKarts(id));
    assert(l.minMs >= 28_000 && l.limiteMs <= 360_000, id + " " + JSON.stringify(l));
    const inicio = 1_000_000, debajo = l.minMs - 1000;
    assertEquals(validarCarrera("karts", { ms: debajo, monedas: 0 }, inicio, inicio + debajo, id), null, id + " debajo del mínimo");
    assertEquals(validarCarrera("karts", { ms: l.minMs + 60_000, monedas: 3 }, inicio, inicio + l.minMs + 60_000, id), { ms: l.minMs + 60_000, monedas: 3 });
  }
});

Deno.test("karts-reinos: copa en sala (reinos) y copas de sala derivadas de las copas, por dificultad", () => {
  assertEquals(KC.COPAS_SALA, [...KP.copasPorDificultad().map((c: any) => c.id), "mixta"]);
  assertEquals(opcionesCopa({ modo: "copa", copa: "reinos" }), { modo: "copa", copa: "reinos" });
  assertEquals(opcionesCopa({ modo: "copa", copa: "egipto" }), "copa_invalida");
  assertEquals([KC.NOMBRE.reinos, KC.EMOJI.reinos], ["Copa Reinos Antiguos", KP.copaPorId("reinos").emoji]);
  assertEquals(KC.pistasDe("reinos", 7), REINOS);
  // Mixta: 4 pistas distintas, de todas las copas (con tres copas, 2-1-1), cambia con la semilla.
  const vistas = new Set<string>();
  for (let s = 1; s < 60; s++) {
    const p = KC.pistasDe("mixta", s);
    assertEquals(new Set(p).size, 4);
    const porCopa = KP.COPAS.map((c: any) => p.filter((x: string) => c.pistas.includes(x)).length);
    if (KP.COPAS.length <= 4) assert(porCopa.every((k: number) => k >= 1 && k <= 2), "de todas las copas: " + porCopa);
    vistas.add(p.join(","));
  }
  assert(vistas.size > 20, "la mixta cambia con la semilla");
  assertEquals(KC.pistasDe("mixta", 5), KC.pistasDe("mixta", 5), "misma semilla, mismas pistas");
});
