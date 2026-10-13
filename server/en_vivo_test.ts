// Juego en vivo entre navegadores (openspec: juegos-en-vivo): pruebas del módulo juegos/en-vivo.js con una red
// simulada y un reloj falso (sin navegador ni Supabase): sobre, orden, ritmo, latencia con pérdida, presencia,
// desconexión, reconexión, respaldo, miembros e interpolación.
// deno-lint-ignore-file no-explicit-any
import { assert, assertAlmostEquals, assertEquals } from "jsr:@std/assert@1";
import "../juegos/en-vivo.js";

const EV = (globalThis as any).EnVivo;

// Reloj falso compartido por la red y los módulos; avanzar() mueve el reloj en pasos de 10 ms y entrega y procesa.
function escenario(opciones: Record<string, unknown> = {}) {
  let ahora = 1_000_000;
  const reloj = () => ahora;
  const red = EV.redSimulada({ reloj, ...opciones });
  const vivos: any[] = [];
  const crear = (yo: string, extra: Record<string, unknown> = {}) => {
    const v = EV.crear({ transporte: red.transporte(yo), yo, reloj, manual: true, ...extra });
    vivos.push(v);
    return v;
  };
  const avanzar = (ms: number) => {
    for (let t = 0; t < ms; t += 10) { ahora += Math.min(10, ms - t); red.entregar(); vivos.forEach((v) => v.tic()); }
  };
  return { red, crear, avanzar, reloj };
}

Deno.test("en vivo: un mensaje llega al otro con el id, la secuencia y la hora del emisor", () => {
  const { crear, avanzar } = escenario({ latencia: 50 });
  const a = crear("a"), b = crear("b");
  const recibidos: any[] = [];
  b.al("k", (d: unknown, de: string, meta: any) => recibidos.push({ d, de, meta }));
  avanzar(20);
  a.enviar("k", [1, 2, 3]);
  avanzar(40);
  assertEquals(recibidos.length, 0, "todavía no llega (50 ms)");
  avanzar(30);
  assertEquals(recibidos.length, 1);
  assertEquals(recibidos[0].d, [1, 2, 3]);
  assertEquals(recibidos[0].de, "a");
  assert(recibidos[0].meta.seq >= 1);
  assertEquals(a.estado(), "vivo");
});

Deno.test("en vivo: el propio emisor no recibe su mensaje y un id ajeno a la sala se ignora", () => {
  const { crear, avanzar } = escenario({ latencia: 10 });
  const a = crear("a", { miembros: ["a", "b"] }), b = crear("b", { miembros: ["a", "b"] }), intruso = crear("x");
  const deA: string[] = [], deB: string[] = [];
  a.al("k", (_d: unknown, de: string) => deA.push(de));
  b.al("k", (_d: unknown, de: string) => deB.push(de));
  avanzar(20);
  a.enviar("k", [1]); intruso.enviar("k", [9]);
  avanzar(50);
  assertEquals(deA, [], "a no se recibe a sí misma y x no es de la sala");
  assertEquals(deB, ["a"]);
  b.miembros(["a", "b", "x"]);
  intruso.enviar("k", [9]);
  avanzar(50);
  assertEquals(deB, ["a", "x"], "al cambiar los miembros, x ya cuenta");
});

Deno.test("en vivo: fuera de orden — un estado viejo que llega después de uno nuevo se descarta", () => {
  const { red, crear, avanzar } = escenario({ latencia: 10 });
  const a = crear("a"), b = crear("b", { ritmos: { k: 1000 } });
  const vistos: number[] = [];
  b.al("k", (d: number[]) => vistos.push(d[0]));
  avanzar(20);
  // La red retrasa el primer mensaje 200 ms: llega después del segundo.
  red.retrasarSiguiente(200);
  a.enviar("k", [1]);
  avanzar(20);
  a.enviar("k", [2]);
  avanzar(300);
  assertEquals(vistos, [2], "el 1 llegó tarde y se descartó");
  assertEquals(b.estadisticas().descartados, 1);
});

Deno.test("en vivo: los eventos sueltos llegan aunque se desordenen, pero solo una vez", () => {
  const { red, crear, avanzar } = escenario({ latencia: 10 });
  const a = crear("a"), b = crear("b");
  const goles: number[] = [];
  b.al("gol", (d: any) => goles.push(d.n));
  avanzar(20);
  red.retrasarSiguiente(200);
  a.enviar("gol", { n: 1 });
  a.enviar("gol", { n: 2 });
  avanzar(300);
  assertEquals(goles.toSorted((x, y) => x - y), [1, 2]);
  red.duplicarSiguiente();
  a.enviar("gol", { n: 3 });
  avanzar(100);
  assertEquals(goles.filter((g) => g === 3).length, 1, "el repetido se ignora");
});

Deno.test("en vivo: el ritmo limita los envíos y manda siempre el último (coalescencia)", () => {
  const { crear, avanzar } = escenario({ latencia: 5 });
  const a = crear("a", { ritmos: { k: 10 } }), b = crear("b");
  const vistos: number[] = [];
  b.al("k", (d: number[]) => vistos.push(d[0]));
  avanzar(20);
  // 60 llamadas en 1 s (una cada 16 ms) → unas 10 se mandan, y la última siempre llega.
  for (let n = 1; n <= 60; n++) { a.enviar("k", [n]); avanzar(16); }
  avanzar(200);
  assert(vistos.length >= 9 && vistos.length <= 12, "unos 10 por segundo: " + vistos.length);
  assertEquals(vistos.at(-1), 60, "el último estado llega");
  a.ritmo("k", 2);
  const antes = vistos.length;
  for (let n = 61; n <= 120; n++) { a.enviar("k", [n]); avanzar(16); }
  avanzar(600);
  assert(vistos.length - antes <= 4, "a 2 Hz: " + (vistos.length - antes));
});

Deno.test("en vivo: latencia medida con ping a un compañero por turno, aun con pérdida", () => {
  const { crear, avanzar } = escenario({ latencia: 80, variacion: 20, perdida: 0.2, azar: semilla(7) });
  const a = crear("a"), b = crear("b"), c = crear("c");
  avanzar(20_000);
  const l = a.latencia();
  assert(l !== null, "hay latencia");
  assert(l >= 75 && l <= 110, "≈ 80–100 ms de un sentido: " + l);
  assert(b.latencia() !== null && c.latencia() !== null);
  // Pings: uno cada 2 s por persona (no a todos): en 20 s, ~10 por persona.
  assert(a.estadisticas().pings <= 11, "pings de a: " + a.estadisticas().pings);
});

Deno.test("en vivo: presencia y desconexión a los 3 s sin mensajes; vuelve al primer mensaje", () => {
  const { red, crear, avanzar } = escenario({ latencia: 20 });
  const a = crear("a");
  crear("b");
  const cambios: string[] = [];
  a.alPresencia((p: any) => cambios.push(p.id + ":" + p.presente));
  avanzar(1500);
  assertEquals(a.presentes(), ["b"], "el latido de b lo hace presente");
  red.cortar("b");
  avanzar(2500);
  assertEquals(a.presentes(), ["b"], "a los 2.5 s sigue");
  avanzar(1000);
  assertEquals(a.presentes(), [], "a los 3.5 s ya no");
  red.reanudar("b");
  avanzar(1500);
  assertEquals(a.presentes(), ["b"]);
  assertEquals(cambios, ["b:true", "b:false", "b:true"]);
});

Deno.test("en vivo: al cerrar manda adiós y el otro lo quita enseguida", () => {
  const { crear, avanzar } = escenario({ latencia: 20 });
  const a = crear("a"), b = crear("b");
  avanzar(1200);
  assertEquals(a.presentes(), ["b"]);
  b.cerrar();
  avanzar(100);
  assertEquals(a.presentes(), []);
});

Deno.test("en vivo: reconexión con espera creciente (1, 2, 4, 8 s, tope 10 s)", () => {
  const { red, crear, avanzar } = escenario({ latencia: 10 });
  const a = crear("a");
  const estados: string[] = [];
  a.alEstado((e: string) => estados.push(e));
  avanzar(100);
  red.caer("a"); // el transporte se cae y no vuelve solo
  avanzar(16_000);
  assertEquals(a.estado(), "reconectando");
  assertEquals(red.reconexiones("a"), [1000, 3000, 7000, 15000].length, "intentos a 1, 3, 7 y 15 s (1+2+4+8)");
  red.permitirReconectar("a");
  avanzar(10_100);
  assertEquals(a.estado(), "vivo");
  assertEquals(estados, ["reconectando", "vivo"], "ya estaba vivo al suscribirse; se cae y vuelve");
});

Deno.test("en vivo: respaldo si el canal no conecta en 5 s; si conecta después, pasa a vivo", () => {
  const { red, crear, avanzar } = escenario({ latencia: 10, conectar: false });
  const a = crear("a");
  const estados: string[] = [];
  a.alEstado((e: string) => estados.push(e));
  avanzar(4900);
  assertEquals(a.estado(), "conectando");
  avanzar(200);
  assertEquals(a.estado(), "respaldo");
  red.conectar("a");
  avanzar(50);
  assertEquals(estados, ["respaldo", "vivo"]);
});

Deno.test("en vivo: datos inválidos o sobres enormes se descartan", () => {
  const { red, crear, avanzar } = escenario({ latencia: 10 });
  crear("a");
  const b = crear("b");
  const vistos: unknown[] = [];
  b.al("k", (d: unknown) => vistos.push(d));
  avanzar(20);
  red.inyectar({ i: "a", s: "x", t: 1, e: "k", d: [1] });
  red.inyectar({ i: "a", s: 99, t: 1, e: "k", d: "x".repeat(3000) });
  red.inyectar(null);
  avanzar(50);
  assertEquals(vistos, []);
});

Deno.test("en vivo: con 8 personas a 10 Hz cada quien recibe ~70 estados por segundo", () => {
  const { crear, avanzar } = escenario({ latencia: 60, variacion: 30, perdida: 0.02, azar: semilla(3) });
  const ids = ["a", "b", "c", "d", "e", "f", "g", "h"];
  const vivos = ids.map((id) => crear(id, { ritmos: { k: 10 }, miembros: ids }));
  const cuenta = new Map(ids.map((id) => [id, 0]));
  vivos.forEach((v, n) => v.al("k", () => cuenta.set(ids[n], cuenta.get(ids[n])! + 1)));
  avanzar(100);
  for (let t = 0; t < 5000; t += 16) { vivos.forEach((v, n) => v.enviar("k", [n, t])); avanzar(16); }
  for (const id of ids) {
    const porSeg = cuenta.get(id)! / 5;
    assert(porSeg >= 60 && porSeg <= 75, id + ": " + porSeg + " por segundo");
  }
  assertEquals(vivos[0].presentes().length, 7);
});

// ---- Interpolador ----
Deno.test("interpolador: interpola 100 ms atrás entre dos muestras", () => {
  const it = EV.interpolador({ retraso: 100 });
  it.agregar(1000, [0, 0]);
  it.agregar(1100, [10, 20]);
  assertEquals(it.muestra(1150), [5, 10]);
  assertEquals(it.muestra(1100), [0, 0]);
});

Deno.test("interpolador: extrapola hasta 250 ms y luego se queda quieto", () => {
  const it = EV.interpolador({ retraso: 100, extrapolar: 250 });
  it.agregar(1000, [0]);
  it.agregar(1100, [10]);
  assertAlmostEquals(it.muestra(1300)[0], 20, 1e-9); // objetivo 1200: 100 ms después de la última → +10
  assertAlmostEquals(it.muestra(1450)[0], 35, 1e-9); // objetivo 1350: tope 250 ms → +25
  assertAlmostEquals(it.muestra(2000)[0], 35, 1e-9);
  assertEquals(it.edad(2000), 900);
});

Deno.test("interpolador: los ángulos van por el camino corto y los discretos toman la muestra nueva", () => {
  const it = EV.interpolador({ retraso: 0, angulos: [0], discretos: [1] });
  it.agregar(0, [3.0, 7, "xalli"]);
  it.agregar(100, [-3.0, 8, "itzae"]);
  const m = it.muestra(50);
  assert(Math.abs(Math.abs(m[0]) - Math.PI) < 0.01, "cruza por π: " + m[0]);
  assertEquals(m[1], 8);
  assertEquals(m[2], "itzae");
});

Deno.test("interpolador: muestras desordenadas se acomodan por tiempo; sin muestras da null", () => {
  const it = EV.interpolador({ retraso: 0 });
  assertEquals(it.muestra(0), null);
  it.agregar(200, [20]);
  it.agregar(100, [10]);
  assertEquals(it.muestra(150), [15]);
});

// ---- Contrato EnVivo.conectar con el doble EnVivo.simulado (reloj real, canales de esta misma «página») ----
const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));
const abrir = (sim: any, topic: string, id: string, ids: string[], extra: Record<string, unknown> = {}) =>
  sim.conectar({ topic, yo: { id, nombre: id.toUpperCase() }, participantes: ids, hz: 15, ...extra });

Deno.test({ name: "conectar: se envía y recibe con { de, seq, t, latencia } e ignora a quien no participa", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  const sim = EV.simulado({ latencia: 30 });
  const topic = "sala-prueba-1", ids = ["a", "b"];
  const [a, b, x] = await Promise.all([abrir(sim, topic, "a", ids), abrir(sim, topic, "b", ids), abrir(sim, topic, "x", ["a", "b", "x"])]);
  const vistos: any[] = [];
  b.al("k", (d: unknown, meta: any) => vistos.push({ d, ...meta }));
  a.enviar("k", [1, 2]);
  x.enviar("k", [9]);
  await esperar(150);
  assertEquals(vistos.length, 1);
  assertEquals(vistos[0].d, [1, 2]);
  assertEquals(vistos[0].de, "a");
  assert(vistos[0].seq >= 1 && typeof vistos[0].t === "number" && "latencia" in vistos[0]);
  assertEquals(b.presencia(), ["a", "b"], "incluye el propio id");
  [a, b, x].forEach((c) => c.cerrar());
} });

Deno.test({ name: "conectar: ritmo por evento a hz, latencia por id y alDesconectar a los 3 s", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  const sim = EV.simulado({ latencia: 40 });
  const topic = "sala-prueba-2", ids = ["a", "b"];
  const [a, b] = await Promise.all([abrir(sim, topic, "a", ids, { hz: 10 }), abrir(sim, topic, "b", ids)]);
  let n = 0;
  b.al("k", () => n++);
  const fin = Date.now() + 1000;
  while (Date.now() < fin) { a.enviar("k", [Date.now()]); await esperar(5); } // NOSONAR: un envío por cuadro, en orden
  await esperar(200);
  assert(n >= 8 && n <= 13, "≈ 10 por segundo: " + n);
  await esperar(2500);
  const l = a.latencia("b");
  assert(l !== null && l >= 25 && l <= 120, "latencia a b ≈ 40 ms: " + l);
  const idas: string[] = [], presencias: string[][] = [];
  a.alDesconectar((id: string) => idas.push(id));
  a.alCambiarPresencia((ids2: string[]) => presencias.push(ids2));
  sim.cortar("b");
  await esperar(3600);
  assertEquals(idas, ["b"]);
  assertEquals(presencias.at(-1), ["a"]);
  a.cerrar(); b.cerrar();
} });

Deno.test({ name: "conectar: se rechaza si el canal no conecta a tiempo (respaldo)", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  const sim = EV.simulado({ noConecta: true });
  const t0 = Date.now();
  let error = "";
  try { await abrir(sim, "sala-prueba-3", "a", ["a", "b"], { espera: 400 }); } catch (e) { error = (e as Error).message; }
  assertEquals(error, "sin_canal");
  assert(Date.now() - t0 < 1500);
  let sinRt = "";
  try { await EV.conectar({ yo: { id: "a" }, participantes: ["a"] }); } catch (e) { sinRt = (e as Error).message; }
  assertEquals(sinRt, "sin_realtime", "sin topic/url/llave no hay Realtime");
} });

Deno.test({ name: "conectar: con pérdida y desorden, los estados viejos no se entregan", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  const sim = EV.simulado({ latencia: 30, perdida: 0.2, desorden: 0.5, azar: semilla(11) });
  const ids = ["a", "b"];
  const [a, b] = await Promise.all([abrir(sim, "sala-prueba-4", "a", ids, { hz: 60 }), abrir(sim, "sala-prueba-4", "b", ids)]);
  const seqs: number[] = [];
  b.al("k", (_d: unknown, meta: any) => seqs.push(meta.seq));
  for (let k = 0; k < 60; k++) { a.enviar("k", [k]); await esperar(17); } // NOSONAR: un envío por cuadro, en orden
  await esperar(300);
  assert(seqs.length >= 20, "llegaron " + seqs.length);
  assert(seqs.every((s, k) => k === 0 || s > seqs[k - 1]), "siempre crecientes");
  a.cerrar(); b.cerrar();
} });

// Azar con semilla (mulberry32) para que la pérdida y la variación sean reproducibles.
function semilla(s: number) { // NOSONAR: aritmética entera de 32 bits del generador, no es truncado
  let a = s;
  return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; // NOSONAR: aritmética entera de 32 bits
}
