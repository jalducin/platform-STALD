// Cálculo y secuencias (openspec: errores-latentes): genCalculo y genSecuencia de juegos/app/individuales.js con
// parámetros inválidos. El script es clásico (sin módulos): se carga con new Function junto con `barajar` de
// juegos/app/nucleo.js, igual que en juegos.html, donde comparten el ámbito global.
// deno-lint-ignore-file no-explicit-any
import { assert, assertEquals, assertThrows } from "jsr:@std/assert@1";

const leer = (r: string) => Deno.readTextFileSync(new URL(r, import.meta.url));
const nucleo = leer("../juegos/app/nucleo.js");
const barajar = nucleo.split("\n").find((l) => l.startsWith("const barajar ="))!;
const { genCalculo, genSecuencia } = new Function("window", barajar + "\n" + leer("../juegos/app/individuales.js") + "\nreturn { genCalculo, genSecuencia };")({});

// Azar con tope: si un generador no termina, agota las llamadas y la prueba falla en lugar de colgarse.
function azarConTope(tope = 10_000, base: () => number = Math.random) {
  let n = 0;
  return () => {
    if (++n > tope) throw new Error("no termina: más de " + tope + " llamadas al azar");
    return base();
  };
}
// mulberry32, como las partidas con semilla.
function semilla(s: number) {
  return () => {
    s = (s + 0x6D2B79F5) | 0; // NOSONAR: mulberry32, aritmética entera de 32 bits
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function pregunta(p: any, etiqueta: string) {
  assertEquals(p.opciones.length, 4, etiqueta);
  assertEquals(new Set(p.opciones).size, 4, etiqueta + ": opciones distintas");
  assert(p.correcta >= 0 && p.correcta < 4, etiqueta + ": la correcta está entre las opciones");
  assert(p.opciones.every((o: string) => /^-?\d+$/.test(o)), etiqueta + ": " + p.opciones.join(","));
}
const INVALIDOS: [string, unknown][] = [["NaN", NaN], ["negativo", -3], ["undefined", undefined], ["texto", "x"], ["Infinity", Infinity], ["null", null]];

Deno.test("cálculo: genCalculo termina y da una pregunta válida con n inválido", () => {
  for (const [nombre, n] of INVALIDOS) {
    for (let i = 0; i < 50; i++) pregunta(genCalculo(n, azarConTope()), "genCalculo(" + nombre + ")");
  }
});

Deno.test("cálculo: genSecuencia da una pregunta válida con n inválido", () => {
  for (const [nombre, n] of INVALIDOS) {
    for (let i = 0; i < 50; i++) pregunta(genSecuencia(n, azarConTope()), "genSecuencia(" + nombre + ")");
  }
});

Deno.test("cálculo: aleatorio inválido usa Math.random", () => {
  for (const mal of [undefined, null, 7, "x"]) {
    pregunta(genCalculo(4, mal), "genCalculo con aleatorio " + String(mal));
    pregunta(genSecuencia(4, mal), "genSecuencia con aleatorio " + String(mal));
  }
});

Deno.test("cálculo: con n válido y semilla, n inválido equivale a n = 0 y los decimales se truncan", () => {
  for (let s = 1; s <= 30; s++) {
    assertEquals(genCalculo(NaN, semilla(s)), genCalculo(0, semilla(s)));
    assertEquals(genSecuencia(NaN, semilla(s)), genSecuencia(0, semilla(s)));
    assertEquals(genCalculo(7.9, semilla(s)), genCalculo(7, semilla(s)));
  }
  // El tope de la prueba sí detecta un bucle sin fin.
  assertThrows(() => { const f = azarConTope(3); for (;;) f(); }, Error, "no termina");
});
