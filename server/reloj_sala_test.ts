// Reloj común de las salas (openspec: karts-salida-y-puntos): el desfase con el servidor sale de la intersección de
// las muestras (como NTP), sin el sesgo del tiempo de procesamiento ni de una respuesta lenta.
import { assert, assertEquals } from "jsr:@std/assert@1";
import "../juegos/reloj-sala.js";

// deno-lint-ignore no-explicit-any
const R = (globalThis as any).RelojSala;
const THETA = 5_000; // hora del servidor − hora del aparato

Deno.test("reloj-sala: sin muestras el desfase es 0", () => {
  assertEquals(R.crear().offset(), 0);
});

Deno.test("reloj-sala: una muestra HTTP con dos sellos acota el desfase a la red, sin el procesamiento", () => {
  const r = R.crear();
  // Sale a 1000, el servidor sella `ahora` a 1050 (hora del aparato), procesa 1 s y sella `reloj` a 2050; llega a 2100.
  r.http(1_000, 2_100, THETA + 1_050, THETA + 2_050);
  assert(Math.abs(r.offset() - THETA) <= 50, String(r.offset()));
  // El cálculo de antes (ahora − llegada) se equivocaba por todo el procesamiento y la bajada.
  assertEquals(THETA + 1_050 - 2_100, THETA - 1_050);
});

Deno.test("reloj-sala: una respuesta lenta después no estropea la mejor muestra", () => {
  const r = R.crear();
  r.http(1_000, 1_100, THETA + 1_040, THETA + 1_060);
  r.http(3_000, 4_600, THETA + 3_050, THETA + 3_080); // 1.5 s de bajada
  assert(Math.abs(r.offset() - THETA) <= 30, String(r.offset()));
});

Deno.test("reloj-sala: el aviso de Realtime es cota inferior", () => {
  const r = R.crear();
  r.aviso(10_000, THETA + 9_900); // llegó 100 ms después de publicarse
  assertEquals(r.offset(), THETA - 100, "solo cota inferior: se usa tal cual");
  r.http(11_000, 11_200, THETA + 11_020, THETA + 11_180);
  r.aviso(12_000, THETA + 11_990);
  // Intersección: [θ − 10, θ + 20] → punto medio θ + 5.
  assertEquals(r.offset(), THETA + 5);
});

Deno.test("reloj-sala: respuesta sin `reloj` (servidor anterior) usa `ahora` como las dos cotas", () => {
  const r = R.crear();
  r.http(1_000, 1_400, THETA + 1_100);
  assertEquals(r.offset(), THETA - 100); // [θ − 300, θ + 100] → punto medio θ − 100
});

Deno.test("reloj-sala: si el reloj del aparato salta, manda la muestra más reciente", () => {
  const r = R.crear();
  r.http(1_000, 1_100, THETA + 1_050, THETA + 1_050);
  // El aparato adelantó su reloj 10 s: el desfase real ahora es θ − 10 000.
  r.http(12_000, 12_100, THETA - 10_000 + 12_050, THETA - 10_000 + 12_050);
  assert(Math.abs(r.offset() - (THETA - 10_000)) <= 50, String(r.offset()));
});

Deno.test("reloj-sala: las muestras de hace más de 2 minutos ya no cuentan", () => {
  const r = R.crear();
  r.http(1_000, 1_020, THETA + 1_010, THETA + 1_010); // [θ − 10, θ + 10], pero vieja
  r.http(200_000, 200_100, THETA + 200_100, THETA + 200_100); // [θ, θ + 100]
  assertEquals(r.offset(), THETA + 50, "con la vieja sería θ + 5");
});
