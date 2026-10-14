// Parrilla de salida de Karts (openspec: karts-salida-y-puntos): en las 8 pistas (grandes y mesoamericanas) las 8
// casillas quedan pegadas a la meta, con filas y lados a distancia fija en píxeles (no en muestras de la pista), sobre
// el camino y lejos de las mecánicas (turbo, salto, cenote, lodo, trajinera).
// deno-lint-ignore-file no-explicit-any
import { assert, assertEquals } from "jsr:@std/assert@1";
import "../juegos/karts-pistas.js";
import "../juegos/arcade.js";

const g = globalThis as any;
const KP = g.KartsPistas, A = g.Arcade;
const MEDIO_LARGO = 14, MEDIO_ANCHO = 11; // el kart mide ≈ 28 × 22 px
const ORILLA = 4; // a más de mitad + 4 px el kart ya está fuera del camino (karts.html)

// Casilla `slot` en la pista: índice de muestra, lado (px) y posición, igual que nuevoKart de karts.html.
function casilla(M: any, slot: number) {
  const c = A.parrilla(slot), n = M.pts.length;
  const idx = (n - Math.round(c.atras / M.paso)) % n;
  return { ...c, idx, ...KP.puntoEn(M, idx, c.lado) };
}

Deno.test("karts-parrilla: filas de 2 a 48 px, lados a ±24 px y la 1.ª fila a 32 px de la meta", () => {
  const cs = [0, 1, 2, 3, 4, 5, 6, 7].map((s) => A.parrilla(s));
  assertEquals(cs.map((c: any) => c.atras), [32, 32, 80, 80, 128, 128, 176, 176]);
  assertEquals(cs.map((c: any) => c.lado), [-24, 24, -24, 24, -24, 24, -24, 24]);
  assertEquals(cs.map((c: any) => c.fila), [0, 0, 1, 1, 2, 2, 3, 3]);
  assert(48 >= 1.5 * 2 * MEDIO_LARGO && 48 <= 2 * 2 * MEDIO_LARGO, "entre 1.5 y 2 largos de kart");
});

for (const pista of KP.PISTAS) {
  Deno.test(`karts-parrilla: ${pista.id} — 8 casillas pegadas a la meta, sobre el camino y sin mecánicas`, () => {
    const M = A.muestrearPista(pista);
    const meta = M.pts[0];
    const zonas = KP.colocarMecanicas(pista, M);
    const cs = [0, 1, 2, 3, 4, 5, 6, 7].map((s) => casilla(M, s));
    for (const [s, c] of cs.entries()) {
      // Distancia a la meta medida sobre la pista (muestras × paso) y en línea recta.
      const atras = (M.pts.length - c.idx) * M.paso;
      assert(atras <= 200, `${pista.id} casilla ${s}: ${atras} px detrás de la meta`);
      assert(Math.hypot(c.x - meta.x, c.y - meta.y) <= 200, `${pista.id} casilla ${s} lejos de la meta en línea recta`);
      assert(Math.abs(c.lado) + MEDIO_ANCHO < pista.mitad - ORILLA, `${pista.id} casilla ${s} fuera del camino`);
      for (const z of zonas) {
        const dIdx = Math.min(Math.abs(c.idx - z.idx), M.pts.length - Math.abs(c.idx - z.idx)) * M.paso;
        const d = z.tipo === "trajinera" ? dIdx : Math.hypot(c.x - z.x, c.y - z.y);
        assert(d > (z.r || 20) + MEDIO_LARGO + 20, `${pista.id} casilla ${s} sobre ${z.tipo} (${Math.round(d)} px)`);
      }
    }
    // Separación constante: las dos de cada fila a 48 px entre sí y cada fila a 48 px de la siguiente (± el muestreo).
    for (let f = 0; f < 4; f++) {
      const [i, d] = [cs[2 * f], cs[2 * f + 1]];
      assert(Math.abs(Math.hypot(i.x - d.x, i.y - d.y) - 48) < 1, `${pista.id} fila ${f}: lados a 48 px`);
      if (f < 3) {
        const s = cs[2 * f + 2];
        const dist = Math.hypot(i.x - s.x, i.y - s.y);
        assert(Math.abs(dist - 48) < 6, `${pista.id} fila ${f}→${f + 1}: ${dist.toFixed(1)} px`);
      }
    }
  });
}
