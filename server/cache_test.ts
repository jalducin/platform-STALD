// Caché por clave con vigencia y single-flight (openspec: cache-estabilidad). Sin red ni temporizadores reales.
import { assertEquals, assertRejects } from "jsr:@std/assert@1";
import { crearMemo, unaALaVez } from "./cache.ts";

// Promesa que se resuelve a mano: simula una carga lenta en vuelo.
function diferida<T>() {
  let resolver!: (v: T) => void, rechazar!: (e: unknown) => void;
  const promesa = new Promise<T>((ok, mal) => { resolver = ok; rechazar = mal; });
  return { promesa, resolver, rechazar };
}

Deno.test("cache: vigente → no vuelve a cargar; vencido → carga de nuevo", async () => {
  let t = 0, cargas = 0;
  const m = crearMemo<number>({ ttlMs: 1000, ahora: () => t });
  const cargar = () => Promise.resolve(++cargas);
  assertEquals(await m.get("a", cargar), 1);
  t = 999;
  assertEquals(await m.get("a", cargar), 1);
  t = 1000;
  assertEquals(await m.get("a", cargar), 2);
  assertEquals(cargas, 2);
});

Deno.test("cache: single-flight — 5 peticiones simultáneas, una sola carga", async () => {
  let cargas = 0;
  const d = diferida<string>();
  const m = crearMemo<string>({ ttlMs: 1000, ahora: () => 0 });
  const ps = Array.from({ length: 5 }, () => m.get("k", () => { cargas++; return d.promesa; }));
  d.resolver("v");
  assertEquals(await Promise.all(ps), ["v", "v", "v", "v", "v"]);
  assertEquals(cargas, 1);
});

Deno.test("cache: claves distintas no se juntan", async () => {
  let cargas = 0;
  const m = crearMemo<string>({ ttlMs: 1000, ahora: () => 0 });
  const [a, b] = await Promise.all([m.get("a", () => Promise.resolve("A" + ++cargas)), m.get("b", () => Promise.resolve("B" + ++cargas))]);
  assertEquals([a[0], b[0], cargas], ["A", "B", 2]);
});

Deno.test("cache: si la carga falla, la siguiente vuelve a intentar (no se guarda el error)", async () => {
  let n = 0;
  const m = crearMemo<number>({ ttlMs: 1000, ahora: () => 0 });
  await assertRejects(() => m.get("a", () => { n++; return Promise.reject(new Error("caida")); }), Error, "caida");
  assertEquals(await m.get("a", () => Promise.resolve(++n)), 2);
});

Deno.test("cache: copia vieja ante error dentro de staleMs; fuera de staleMs el error sube", async () => {
  let t = 0;
  const m = crearMemo<string>({ ttlMs: 100, staleMs: 1000, ahora: () => t, registrar: () => {} });
  assertEquals(await m.get("a", () => Promise.resolve("v1")), "v1");
  t = 500; // vencida, pero dentro de la ventana de copia vieja
  assertEquals(await m.get("a", () => Promise.reject(new Error("notion_502"))), "v1");
  t = 1100; // más de staleMs desde que se guardó
  await assertRejects(() => m.get("a", () => Promise.reject(new Error("notion_502"))), Error, "notion_502");
});

Deno.test("cache: borrar durante una carga en vuelo → quien pide después carga de nuevo", async () => {
  const d1 = diferida<string>();
  let cargas = 0;
  const m = crearMemo<string>({ ttlMs: 1000, ahora: () => 0 });
  const vieja = m.get("a", () => { cargas++; return d1.promesa; });
  m.borrar("a"); // p. ej., se escribió el archivo
  const nueva = m.get("a", () => { cargas++; return Promise.resolve("nuevo"); });
  d1.resolver("viejo");
  assertEquals([await vieja, await nueva, cargas], ["viejo", "nuevo", 2]);
  // La carga vieja que terminó después de borrar no pisa el valor nuevo.
  assertEquals(await m.get("a", () => Promise.resolve("otra")), "nuevo");
});

Deno.test("cache: borrar() sin clave vacía todo", async () => {
  let n = 0;
  const m = crearMemo<number>({ ttlMs: 1000, ahora: () => 0 });
  await m.get("a", () => Promise.resolve(++n)); await m.get("b", () => Promise.resolve(++n));
  m.borrar();
  assertEquals([await m.get("a", () => Promise.resolve(++n)), await m.get("b", () => Promise.resolve(++n))], [3, 4]);
});

Deno.test("cache: tope de entradas desaloja la más vieja", async () => {
  let n = 0;
  const m = crearMemo<number>({ ttlMs: 1000, max: 2, ahora: () => 0 });
  await m.get("a", () => Promise.resolve(++n)); await m.get("b", () => Promise.resolve(++n)); await m.get("c", () => Promise.resolve(++n));
  assertEquals(m.tamano(), 2);
  assertEquals(await m.get("a", () => Promise.resolve(++n)), 4); // "a" se desalojó
  assertEquals(await m.get("c", () => Promise.resolve(++n)), 3); // "c" sigue
});

Deno.test("unaALaVez: junta llamadas en vuelo y libera al terminar; olvidar corta la espera compartida", async () => {
  const sf = unaALaVez<string>();
  let n = 0;
  const d = diferida<string>();
  const a = sf("k", () => { n++; return d.promesa; }), b = sf("k", () => { n++; return d.promesa; });
  d.resolver("x");
  assertEquals([await a, await b, n], ["x", "x", 1]);
  assertEquals(await sf("k", () => { n++; return Promise.resolve("y"); }), "y");
  assertEquals(n, 2);
  const d2 = diferida<string>();
  const vieja = sf("k", () => { n++; return d2.promesa; });
  sf.olvidar("k");
  const nueva = sf("k", () => { n++; return Promise.resolve("z"); });
  d2.resolver("w");
  assertEquals([await vieja, await nueva, n], ["w", "z", 4]);
});

Deno.test("unaALaVez: si la carga falla, todos reciben el error y la siguiente vuelve a intentar", async () => {
  const sf = unaALaVez<string>();
  const d = diferida<string>();
  const a = sf("k", () => d.promesa), b = sf("k", () => d.promesa);
  d.rechazar(new Error("red"));
  await assertRejects(() => a, Error, "red");
  await assertRejects(() => b, Error, "red");
  assertEquals(await sf("k", () => Promise.resolve("ok")), "ok");
});
