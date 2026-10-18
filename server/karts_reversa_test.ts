// Reversa de Karts (openspec: karts-reversa): velocidad de reversa (frena primero, retrocede a ≈ 38 % de la punta con
// aceleración suave), «freno estando parado» = reversa, volante invertido y cruce de la meta en ambos sentidos sin
// poder sumar vueltas yendo y viniendo.
// deno-lint-ignore-file no-explicit-any
import { assert, assertAlmostEquals, assertEquals } from "jsr:@std/assert@1";
import "../juegos/karts-reversa.js";

const KR = (globalThis as any).KartsReversa;
const TOP = 230, DT = 1 / 60;

Deno.test("reversa: si va hacia adelante primero frena y luego retrocede despacio", () => {
  let v = 200, pasos = 0;
  while (v > 0 && pasos < 600) { v = KR.pasoVel(v, TOP, DT); pasos++; }
  assert(pasos > 20 && pasos < 60, "frena con la fuerza del freno (" + pasos + " pasos)");
  assertEquals(v, 0, "frena hasta 0, sin pasarse a negativo en el mismo paso");
  const v1 = KR.pasoVel(0, TOP, DT);
  assert(v1 < 0 && v1 > -3, "arranque suave hacia atrás: " + v1);
  for (let i = 0; i < 600; i++) v = KR.pasoVel(v, TOP, DT);
  assert(v / TOP <= -0.35 && v / TOP >= -0.40, "tope entre 35 y 40 % de la punta: " + v);
  assertAlmostEquals(v, -TOP * KR.FRACCION, 0.01);
  // Tarda más de un segundo en llegar al tope (aceleración suave).
  let w = 0, t = 0;
  while (w > -TOP * KR.FRACCION + 0.5 && t < 10) { w = KR.pasoVel(w, TOP, DT); t += DT; }
  assert(t > 0.8, "aceleración suave: " + t.toFixed(2) + " s");
});

Deno.test("reversa: el tope sigue a la punta (lodo, rayo) y no pasa de él", () => {
  let v = 0;
  for (let i = 0; i < 600; i++) v = KR.pasoVel(v, TOP * 0.5, DT);
  assertAlmostEquals(v, -TOP * 0.5 * KR.FRACCION, 0.01);
  // Si ya iba más rápido hacia atrás (p. ej. se acabó el lodo al revés), se acerca al nuevo tope sin brincos.
  const r = KR.pasoVel(-TOP, TOP, DT);
  assert(r > -TOP && r < -TOP * KR.FRACCION, "se acerca al tope: " + r);
});

Deno.test("freno estando parado = reversa; con el carro en marcha solo frena", () => {
  assertEquals(KR.quiereReversa({ reversa: true, frenoParado: false, vel: 150 }), true, "botón o R: siempre");
  assertEquals(KR.quiereReversa({ reversa: false, frenoParado: true, vel: 150 }), false, "en marcha: frena");
  assertEquals(KR.quiereReversa({ reversa: false, frenoParado: true, vel: 3 }), true, "parado: reversa");
  assertEquals(KR.quiereReversa({ reversa: false, frenoParado: true, vel: -40 }), true, "ya en reversa: sigue");
  assertEquals(KR.quiereReversa({ reversa: false, frenoParado: false, vel: 0 }), false);
});

Deno.test("volante invertido en reversa, como un carro real", () => {
  assert(KR.factorGiro(200) === 1);
  assertAlmostEquals(KR.factorGiro(45), 0.5, 1e-9);
  assert(KR.factorGiro(-60) < 0, "en reversa el giro se invierte");
  assertEquals(KR.factorGiro(0), 0);
});

// Kart de prueba sobre una pista de N muestras.
const N = 400;
const kart = (o: any = {}) => ({ idx: N - 5, vuelta: -1, mitadOk: true, termino: null, deuda: 0, ...o });
function mover(k: any, a: number) {
  const antes = k.idx;
  k.idx = ((a % N) + N) % N;
  return KR.cruzarMeta(k, antes, N);
}

Deno.test("meta: hacia adelante cuenta la vuelta como siempre", () => {
  const k = kart();
  assertEquals(mover(k, 2), "vuelta");
  assertEquals(k.vuelta, 0);
  assertEquals(k.mitadOk, false);
  // Retroceder sobre la meta resta la vuelta.
  mover(k, N - 3);
  assertEquals(k.vuelta, -1, "hacia atrás resta");
  assertEquals(mover(k, 1), "recupera", "y al volver solo la repone, sin aviso");
  assertEquals(k.vuelta, 0);
});

Deno.test("meta: ir y venir en reversa sobre la meta no suma vueltas", () => {
  const k = kart({ idx: N - 3, vuelta: 0, mitadOk: true });
  assertEquals(mover(k, 3), "vuelta");
  assertEquals(k.vuelta, 1);
  for (let i = 0; i < 25; i++) {
    assertEquals(mover(k, N - 4), "atras");
    assertEquals(k.vuelta, 0);
    assertEquals(mover(k, 4), "recupera");
    assertEquals(k.vuelta, 1);
  }
  assertEquals(k.deuda, 0);
  // Avanzar de verdad: pasa por la mitad y la siguiente vuelta sí cuenta.
  mover(k, N / 2);
  mover(k, N - 2);
  assertEquals(mover(k, 2), "vuelta");
  assertEquals(k.vuelta, 2);
});

Deno.test("meta: una vuelta completa hacia atrás se debe toda antes de volver a contar", () => {
  const k = kart({ idx: 2, vuelta: 1, mitadOk: false });
  mover(k, N - 2); assertEquals(k.vuelta, 0);
  for (let i = N - 20; i > 10; i -= 20) mover(k, i); // recorre la pista al revés (pasa la mitad)
  assertEquals(mover(k, N - 3), "atras");
  assertEquals(k.vuelta, -1);
  assertEquals(k.deuda, 2);
  mover(k, 3); assertEquals(k.vuelta, 0); // repone (con mitadOk de la reversa)
  // La segunda deuda pide pasar por la mitad otra vez, y se repone sin aviso.
  assertEquals(mover(k, N - 3), "atras");
  assertEquals(mover(k, 3), "recupera");
  mover(k, N / 2); mover(k, N - 2);
  assertEquals(mover(k, 2), "recupera");
  assertEquals(k.vuelta, 1);
  assertEquals(k.deuda, 0);
  mover(k, N / 2); mover(k, N - 2);
  assertEquals(mover(k, 2), "vuelta");
  assertEquals(k.vuelta, 2);
});

Deno.test("meta: en la salida, al terminar o con saltos grandes no resta", () => {
  const salida = kart({ idx: 5, vuelta: -1 });
  assertEquals(mover(salida, N - 5), null, "no baja de −1");
  assertEquals(salida.vuelta, -1);
  const fin = kart({ idx: 3, vuelta: 2, termino: 90000, mitadOk: false });
  assertEquals(mover(fin, N - 3), null, "ya terminó");
  assertEquals(fin.vuelta, 2);
  const salto = kart({ idx: 20, vuelta: 1, mitadOk: false });
  assertEquals(mover(salto, N - 40), null, "un salto de 60 muestras no es un cruce");
  assertEquals(salto.vuelta, 1);
});
