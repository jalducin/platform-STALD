// Plazo de 45 s en las salas de Karts (openspec: karts-plazo-45). Con carreras de 3 vueltas (≈ 3:00–3:30) los 30 s
// tras la primera llegada eran muy justos: ahora las demás personas tienen 45 s (KartsCopa.PLAZO_MS) para terminar.
// Fija el valor, que el cierre lo respete en las 16 pistas, que el plazo siempre llegue antes del límite de la pista
// (cierre de respaldo) y que el servidor acepte a un 2.º lugar que llega 45 s después de quien ganó.
// deno-lint-ignore-file no-explicit-any
import { assert, assertEquals } from "jsr:@std/assert@1";
import "../juegos/karts-pistas.js";
import "../juegos/arcade.js";
import "../juegos/karts-copa.js";
import { MAPAS_SALA, reglasCarrera, validarCarrera } from "./carreras.ts";

const g = globalThis as any;
const KC = g.KartsCopa, A = g.Arcade;

Deno.test("plazo-45: las demás personas tienen 45 s tras la primera llegada", () => {
  assertEquals(KC.PLAZO_MS, 45_000);
});

Deno.test("plazo-45: en las 16 pistas la carrera cierra a los 45 s exactos de la primera llegada", () => {
  for (const id of MAPAS_SALA.karts) {
    const inicio = 1_000_000, limite = A.limiteSala("karts", id), ms = Math.round(A.refKarts(id) * 0.9 / 10) * 10;
    const llegada = inicio + ms;
    const c = { inicio, limite, total: 3, reportes: [{ t: llegada, ms }, undefined, undefined] };
    assertEquals(KC.cierreCarrera(c, llegada + 44_999), { cierre: null, plazo: llegada + 45_000 }, id + " abierta a los 44.999 s");
    assertEquals(KC.cierreCarrera(c, llegada + 45_000).cierre, llegada + 45_000, id + " cierra a los 45 s");
  }
});

Deno.test("plazo-45: el plazo siempre vence antes que el límite de la pista (cierre de respaldo)", () => {
  for (const id of MAPAS_SALA.karts) {
    const { minMs, limiteMs } = reglasCarrera("karts", id)!;
    // Aun con la llegada más rápida que acepta el servidor, el plazo de 45 s cae dentro del límite + la gracia, y
    // quien llega al final del plazo lleva un tiempo dentro del límite de la pista.
    assert(minMs + KC.PLAZO_MS <= limiteMs, `${id}: ${minMs} + ${KC.PLAZO_MS} ≤ ${limiteMs}`);
    assert(Math.round(A.refKarts(id) * 1.1) + KC.PLAZO_MS <= limiteMs, id + ": una llegada lenta + 45 s cabe en el límite");
  }
});

Deno.test("plazo-45: el servidor acepta a un 2.º lugar que llega 45 s después de quien ganó (3 vueltas)", () => {
  for (const id of MAPAS_SALA.karts) {
    const inicio = 1_000_000, gana = Math.round(A.refKarts(id) * 0.9 / 10) * 10, segundo = gana + KC.PLAZO_MS - 10;
    assert(validarCarrera("karts", { ms: gana, monedas: 2 }, inicio, inicio + gana + 300, id), id + " quien gana");
    const r = validarCarrera("karts", { ms: segundo, monedas: 1 }, inicio, inicio + segundo + 300, id);
    assertEquals(r, { ms: segundo, monedas: 1 }, `${id}: 2.º lugar ${segundo} ms (${gana} + 44.99 s)`);
  }
});
