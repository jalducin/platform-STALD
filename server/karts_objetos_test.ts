// Ítems entre personas en sala de Karts (openspec: karts-objetos-en-sala): tablas por lugar y modo, evento `item`
// (codificar y decodificar), simulación determinista desde el evento, choque del lado de la víctima, rayo por avance,
// repetidos y viejos, 1 ítem por segundo, gracia y peor caso dentro del límite de cada pista.
// deno-lint-ignore-file no-explicit-any
import { assert, assertEquals } from "jsr:@std/assert@1";
import "../juegos/karts-pistas.js";
import "../juegos/arcade.js";
import "../juegos/karts-objetos.js";

const g = globalThis as any;
const A = g.Arcade, KO = g.KartsObjetos;
const geoDe = (id: string) => KO.geometria(A.pistaPorId(id), A.muestrearPista(A.pistaPorId(id)), A.VEL_KART);
const suma = (t: Record<string, number>) => Object.values(t).reduce((a, b) => a + b, 0);
const ev = (o: any = {}) => ({ n: 1, tipo: "cascara", x: 100.5, y: 200.25, ang: 1.234, vel: 210, vuelta: 0, idx: 40, tc: 12000, avance: 40, blanco: -1, carrera: 0, ...o });

Deno.test("tablas: individual igual que antes, sala en vivo con los 7 ítems y respaldo reducido", () => {
  const todos = new Set<string>();
  for (const r of [0, 0.2, 0.5, 0.9]) {
    const t = KO.tablaItems(r, "vivo");
    assertEquals(suma(t), 100, "suma 100 en r=" + r);
    Object.keys(t).forEach((k) => todos.add(k));
  }
  assertEquals([...todos].sort(), ["bola", "cascara", "cohete", "estrella", "monedas", "rayo", "turbo"]);
  // Quien va atrás recibe mejores: el último puede recibir rayo y el primero no; el primero no recibe cohete.
  assert(KO.tablaItems(1, "vivo").rayo > 0 && !KO.tablaItems(0, "vivo").rayo && !KO.tablaItems(0, "vivo").cohete);
  // Un poco más suave que la individual: menos cohetes y rayos atrás.
  assert(KO.tablaItems(1, "vivo").rayo < KO.tablaItems(1, "solo").rayo);
  assert(KO.tablaItems(0.6, "vivo").cohete < KO.tablaItems(0.6, "solo").cohete);
  assertEquals(KO.tablaItems(0, "solo"), { cascara: 45, bola: 25, monedas: 30 });
  for (const r of [0, 0.9]) assertEquals(Object.keys(KO.tablaItems(r, "respaldo")).sort(), ["estrella", "monedas", "turbo"]);
  assertEquals(KO.sortear({ turbo: 50, cohete: 50 }, () => 0.75), "cohete");
  assertEquals(KO.sortear({ turbo: 50, cohete: 50 }, () => 0.1), "turbo");
});

Deno.test("evento item: codificar y decodificar sin perder nada; rechaza basura", () => {
  const e = ev({ tipo: "cohete", blanco: 2, carrera: 3 });
  const d = KO.codificar(e);
  assert(Array.isArray(d) && d.every((x: unknown) => typeof x === "number"), "solo números");
  assert(JSON.stringify(d).length < 120);
  const r = KO.decodificar(d);
  assertEquals(r, { ...e, x: 100.5, y: 200.3, ang: 1.234 });
  for (const t of KO.TIPOS) assertEquals(KO.decodificar(KO.codificar(ev({ tipo: t }))).tipo, t);
  for (const malo of [null, "x", [], [1, 2], d.map((x: number, k: number) => (k === 1 ? 9 : x)), d.map((x: number, k: number) => (k === 0 ? -1 : x)), d.map((x: number, k: number) => (k === 2 ? NaN : x)), d.map((x: number, k: number) => (k === 10 ? 99 : x))]) {
    assertEquals(KO.decodificar(malo), null, JSON.stringify(malo));
  }
  assertEquals(KO.decodificarGolpe(KO.codificarGolpe({ n: 7, dueno: 2, carrera: 1 })), { n: 7, dueno: 2, carrera: 1 });
  assertEquals(KO.decodificarGolpe([1, "a", 0]), null);
  assertEquals(KO.idDe("a-marisol", 3), "a-marisol:3");
});

Deno.test("simulación determinista: dos aparatos con el mismo evento ven lo mismo, aunque lo reciban a destiempo", () => {
  const geo = geoDe("pradera");
  const p = geo.pts[60];
  for (const tipo of ["cascara", "bola", "cohete"]) {
    const e = ev({ tipo, x: p.x, y: p.y, ang: p.a, idx: 60, tc: 5000 });
    const a = KO.crear(e, geo, "x"), b = KO.crear(e, geo, "x");
    // A lo avanza cuadro por cuadro (16 ms), B lo recibe 250 ms tarde y se pone al día de un jalón.
    for (let t = 5016; t <= 6500; t += 16) KO.avanzar(a, geo, t, () => 0);
    KO.avanzar(a, geo, 6500, () => 0);
    KO.avanzar(b, geo, 5250, () => 0); KO.avanzar(b, geo, 6500, () => 0);
    assert(Math.hypot(a.x - b.x, a.y - b.y) < 0.5, tipo + " " + JSON.stringify([a.x, a.y, b.x, b.y]));
  }
  // La cáscara queda detrás del kart y no se mueve; la bola avanza y se queda en el camino (rebota).
  const c = KO.crear(ev({ x: p.x, y: p.y, ang: p.a, tc: 0 }), geo, "x");
  const c0 = { x: c.x, y: c.y };
  KO.avanzar(c, geo, 3000, () => 0);
  assertEquals({ x: c.x, y: c.y }, c0);
  assert(Math.hypot(c.x - p.x, c.y - p.y) > 10);
  const bola = KO.crear(ev({ tipo: "bola", x: p.x, y: p.y, ang: p.a, tc: 0 }), geo, "x");
  let fuera = 0;
  for (let t = 16; t <= 2900; t += 16) { KO.avanzar(bola, geo, t, () => 0); if (KO.distanciaCamino(geo, bola.x, bola.y) > geo.mitad + 25) fuera++; }
  assert(Math.hypot(bola.x - p.x, bola.y - p.y) > 200, "la bola avanzó");
  assertEquals(fuera, 0, "la bola no se sale del camino");
  // Vida: la bola dura 3 s, la cáscara 40 s.
  KO.avanzar(bola, geo, 3100, () => 0);
  assert(bola.vida <= 0);
});

Deno.test("cohete: avanza por la pista más rápido que un kart y se cierra al carril de su blanco", () => {
  const geo = geoDe("pradera");
  const p = geo.pts[10];
  const o = KO.crear(ev({ tipo: "cohete", x: p.x, y: p.y, ang: p.a, idx: 10, vuelta: 0, tc: 0, blanco: 1 }), geo, "x");
  for (let t = 16; t <= 1000; t += 16) KO.avanzar(o, geo, t, () => 30);
  const avanzo = (o.idx - 10) * geo.paso;
  assert(avanzo > A.VEL_KART * 1.5 && avanzo < A.VEL_KART * 1.9, "avanzó " + avanzo);
  assert(Math.abs(o.carril - 30) < 3, "carril " + o.carril);
  assertEquals(o.blanco, 1);
});

Deno.test("choque del lado de la víctima: toca por distancia; el cohete solo a su blanco; el dueño es inmune al soltarlo", () => {
  const geo = geoDe("pradera");
  const p = geo.pts[100];
  const c = KO.crear(ev({ x: p.x, y: p.y, ang: p.a, tc: 0 }), geo, "a");
  assert(KO.toca(c, c.x + 10, c.y, 2, "b"));
  assert(!KO.toca(c, c.x + 30, c.y, 2, "b"));
  assert(!KO.toca(c, c.x, c.y, 0, "a"), "el dueño no la pisa al soltarla");
  KO.avanzar(c, geo, 600, () => 0);
  assert(KO.toca(c, c.x, c.y, 0, "a"), "después sí");
  const r = KO.crear(ev({ tipo: "cohete", x: p.x, y: p.y, ang: p.a, idx: 100, tc: 0, blanco: 2 }), geo, "a");
  KO.avanzar(r, geo, 400, () => 0);
  assert(!KO.toca(r, r.x, r.y, 1, "b"), "no es su blanco");
  assert(KO.toca(r, r.x, r.y, 2, "c"), "su blanco");
  const libre = KO.crear(ev({ tipo: "cohete", x: p.x, y: p.y, ang: p.a, idx: 100, tc: 0, blanco: -1 }), geo, "a");
  KO.avanzar(libre, geo, 400, () => 0);
  assert(KO.toca(libre, libre.x, libre.y, 1, "b"), "sin blanco le pega a quien toque");
});

Deno.test("rayo: frena a quien iba adelante a la hora del evento (historial del avance)", () => {
  const h = KO.historial(5000);
  for (let t = 0; t <= 7000; t += 16) h.agregar(t, Math.floor(t / 10)); // avance = t/10; guarda los últimos 5 s
  assertEquals(h.en(5008), 500);
  assertEquals(h.en(4990), 497); // la muestra anterior más cercana (4976 ms)
  assert(KO.rayoAfecta(h.en(6000), 550), "iba adelante a esa hora (600 > 550)");
  assert(!KO.rayoAfecta(h.en(5000), 550), "iba atrás a esa hora (500 < 550), aunque ahora vaya adelante");
  assert(!KO.rayoAfecta(550, 550));
  assertEquals(h.en(-20000), null, "fuera del historial");
});

Deno.test("anti-abuso: repetidos, números viejos, eventos de más de 4 s y más de 1 ítem por segundo", () => {
  const reg = KO.registro();
  assertEquals(reg.aceptar("a", ev({ n: 1, tc: 1000 }), 1100), "ok");
  assertEquals(reg.aceptar("a", ev({ n: 1, tc: 1000 }), 1200), "repetido", "la copia de la red");
  assertEquals(reg.aceptar("a", ev({ n: 2, tc: 1500 }), 1600), "rapido", "menos de 1 s después");
  assertEquals(reg.aceptar("a", ev({ n: 3, tc: 2100 }), 2200), "ok");
  assertEquals(reg.aceptar("a", ev({ n: 2, tc: 2500 }), 2600), "viejo", "número viejo (seq)");
  assertEquals(reg.aceptar("a", ev({ n: 9, tc: 1000 }), 9000), "viejo", "más de 4 s");
  assertEquals(reg.aceptar("b", ev({ n: 1, tc: 2150 }), 2200), "ok", "otra persona tiene su propio ritmo");
  reg.retirar("c:1");
  assertEquals(reg.aceptar("c", ev({ n: 1, tc: 2150 }), 2200), "repetido", "el golpe llegó antes que el ítem");
  assert(reg.retirado("c:1"));
  assertEquals(reg.stats(), { ok: 3, repetido: 2, rapido: 1, viejo: 2 });
  // Del lado de quien lo usa: puede mandar si pasó 1 s desde su último ítem.
  assertEquals(KO.puedeUsar(null, 500), true);
  assertEquals(KO.puedeUsar(500, 1200), false);
  assertEquals(KO.puedeUsar(500, 1500), true);
});

Deno.test("gracia y límite del servidor: el peor caso de golpes cabe en el límite de cada pista", () => {
  assertEquals(KO.GRACIA_MS, 4000);
  assert(KO.enGracia(1000, 4900) && !KO.enGracia(1000, 5000) && !KO.enGracia(null, 10));
  const f = KO.factorPeorCaso(A.VEL_KART, 150);
  assert(f > 1.5 && f < 1.9, "factor " + f);
  for (const p of A.PISTAS) {
    const ref = A.refKarts(p.id), lim = A.limitesKarts(p.id);
    // Aun manejando 30 % más lento que la referencia y con golpes todo el tiempo, se llega antes del límite.
    assert(ref * 1.3 * f < lim.limiteMs, p.id + ": " + Math.round(ref * 1.3 * f) + " < " + lim.limiteMs);
    assert(ref * 1 > lim.minMs, "los ítems no ayudan a bajar del mínimo");
  }
});
