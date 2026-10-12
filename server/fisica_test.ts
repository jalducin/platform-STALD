// Motores de Futbolito y Billar (openspec: futbolito-billar): trigonometría determinista, reglas de la bola 8,
// tiros de futbolito, línea de turnos de sala y determinismo (misma lista de tiros → mismo estado, bit a bit).
// deno-lint-ignore-file no-explicit-any
import { assert, assertAlmostEquals, assertEquals } from "jsr:@std/assert@1";
import "../juegos/fisica.js";
import "../juegos/billar-motor.js";
import "../juegos/futbolito-motor.js";

const g = globalThis as any;
const F = g.Fisica, B = g.Billar, T = g.Futbolito;

Deno.test("fisica: senCos y atan2Dec coinciden con Math sin usar Math.sin/cos/atan2", () => {
  for (let d = -3600; d <= 7200; d += 7) {
    const [s, c] = F.senCos(d), r = d * Math.PI / 1800;
    assertAlmostEquals(s, Math.sin(r), 1e-12); assertAlmostEquals(c, Math.cos(r), 1e-12);
  }
  const rnd = F.rng(1, "atan");
  for (let i = 0; i < 2000; i++) {
    const x = (rnd() * 2 - 1) * 900, y = (rnd() * 2 - 1) * 900;
    const ref = ((Math.atan2(y, x) * 1800 / Math.PI) % 3600 + 3600) % 3600;
    const d = F.atan2Dec(y, x);
    assert(Math.abs(d - ref) <= 0.5001 || Math.abs(d - ref) >= 3599.4999, `${x},${y}: ${d} vs ${ref}`);
  }
  assertEquals([F.atan2Dec(0, 1), F.atan2Dec(1, 0), F.atan2Dec(0, -1), F.atan2Dec(-1, 0), F.atan2Dec(0, 0)], [0, 900, 1800, 2700, 0]);
  const fuente = Deno.readTextFileSync(new URL("../juegos/billar-motor.js", import.meta.url)) + Deno.readTextFileSync(new URL("../juegos/futbolito-motor.js", import.meta.url));
  assert(!/Math\.(sin|cos|tan|atan2?|hypot|pow|exp|log)\(|\*\*/.test(fuente), "los motores solo usan + − * / y Math.sqrt");
});

// ---------- Billar ----------
// Mesa armada a mano: las bolas que no se nombran quedan fuera.
function mesa(bolas: Record<number, [number, number]>, extra: Record<string, unknown> = {}) {
  const st = B.inicial(1);
  st.bolas = st.bolas.map((o: any) => bolas[o.n] ? { n: o.n, x: bolas[o.n][0], y: bolas[o.n][1], fuera: false } : { ...o, fuera: true });
  return Object.assign(st, { tiros: 5 }, extra);
}
const hacia = (st: any, x: number, y: number) => F.atan2Dec(y - st.bolas[0].y, x - st.bolas[0].x);

Deno.test("billar: triángulo con la 8 en medio, esquinas lisa y rayada, igual con la misma semilla", () => {
  const a = B.inicial(42), b = B.inicial(42), c = B.inicial(43);
  assertEquals(JSON.stringify(a), JSON.stringify(b));
  assert(JSON.stringify(a) !== JSON.stringify(c), "otra semilla, otro orden");
  assertEquals(a.bolas.length, 16);
  const ocho = a.bolas[8];
  assertAlmostEquals(ocho.y, 250, 0.01);
  const fondo = a.bolas.filter((o: any) => o.n && Math.abs(o.x - Math.max(...a.bolas.map((p: any) => p.x))) < 0.01).sort((p: any, q: any) => p.y - q.y);
  assertEquals(fondo.length, 5);
  assert(B.tipo(fondo[0].n) !== B.tipo(fondo[4].n) && fondo[0].n !== 8 && fondo[4].n !== 8, "esquinas: una lisa y una rayada");
});

Deno.test("billar: falta con la blanca → la blanca vuelve a su punto y el turno pasa", () => {
  const st = mesa({ 0: [100, 100], 3: [800, 400] });
  const r = B.aplicar(st, { angulo: hacia(st, 0, 0), fuerza: 30, efecto: 0 }).st;
  assertEquals([r.ultimo.falta, r.turno, r.bolas[0].fuera, r.bolas[0].x, r.bolas[0].y], ["blanca", 1, false, 250, 250]);
  assertEquals(r.fin, null);
});

Deno.test("billar: mesa abierta → meter una rayada asigna grupos y sigue tirando", () => {
  const st = mesa({ 0: [160, 160], 9: [60, 60], 2: [800, 400] });
  const r = B.aplicar(st, { angulo: hacia(st, 60, 60), fuerza: 40, efecto: 0 }).st;
  assertEquals([r.ultimo.metidas, r.grupos, r.turno, r.ultimo.falta], [[9], ["rayadas", "lisas"], 0, null]);
});

Deno.test("billar: no tocar ninguna bola es falta y pasa el turno", () => {
  const st = mesa({ 0: [500, 250], 2: [900, 60] });
  const r = B.aplicar(st, { angulo: 900, fuerza: 5, efecto: 0 }).st;
  assertEquals([r.ultimo.falta, r.turno], ["sin-toque", 1]);
});

Deno.test("billar: meter la 8 antes de tiempo pierde (carambola sin falta)", () => {
  const st = mesa({ 0: [300, 300], 1: [200, 200], 8: [100, 100], 5: [800, 450] }, { grupos: ["lisas", "rayadas"] });
  const r = B.aplicar(st, { angulo: hacia(st, 0, 0), fuerza: 70, efecto: 0 }).st;
  assert(r.ultimo.metidas.includes(8), JSON.stringify(r.ultimo));
  assertEquals([r.ultimo.primer, r.fin], [1, { gana: 1, motivo: "ocho-antes" }]);
});

Deno.test("billar: meter la 8 tocando primero la 8 con bolas propias en la mesa es falta y pierde", () => {
  const st = mesa({ 0: [160, 160], 8: [60, 60], 1: [800, 400] }, { grupos: ["lisas", "rayadas"] });
  const r = B.aplicar(st, { angulo: hacia(st, 60, 60), fuerza: 40, efecto: 0 }).st;
  assertEquals(r.fin, { gana: 1, motivo: "ocho-falta" });
});

Deno.test("billar: con su grupo completo, meter la 8 sin falta gana; puntos con tope", () => {
  const st = mesa({ 0: [160, 160], 8: [60, 60], 10: [800, 400] }, { grupos: ["lisas", "rayadas"] });
  const r = B.aplicar(st, { angulo: hacia(st, 60, 60), fuerza: 40, efecto: 0 }).st;
  assertEquals(r.fin, { gana: 0, motivo: "ocho" });
  assertEquals([B.puntos(r, 0), B.puntos(r, 1), B.puntos(r, 0, 200)], [30 * 7 + 500 + 10, 30 * 6, 920]); // las rayadas que no se nombran están fuera
});

Deno.test("billar: el efecto cambia lo que hace la blanca tras el choque (seguir vs retroceder)", () => {
  const st = mesa({ 0: [300, 250], 4: [500, 250], 12: [900, 450] });
  const sigue = B.aplicar(st, { angulo: 0, fuerza: 40, efecto: 100 }).st.bolas[0].x;
  const regresa = B.aplicar(st, { angulo: 0, fuerza: 40, efecto: -100 }).st.bolas[0].x;
  const nada = B.aplicar(st, { angulo: 0, fuerza: 40, efecto: 0 }).st.bolas[0].x;
  assert(sigue > nada + 50 && regresa < nada - 50, JSON.stringify({ sigue, nada, regresa }));
});

Deno.test("billar: partidas bot contra bot terminan y se reproducen idénticas (determinismo)", () => {
  for (const seed of [3, 11]) {
    const jugar = () => {
      let st = B.inicial(seed); const rnd = F.rng(seed, "prueba"), tiros = [];
      while (!st.fin && tiros.length < 300) { const t = B.tiroBot(st, "dificil", rnd); tiros.push(t); st = B.aplicar(st, t).st; }
      return { st, tiros };
    };
    const a = jugar(), b = jugar();
    assert(a.st.fin, "la partida termina");
    assertEquals(JSON.stringify(a), JSON.stringify(b));
    // Reproducir la lista de tiros (como otro aparato) da el mismo estado.
    let st = B.inicial(seed);
    for (const t of a.tiros) st = B.aplicar(st, t).st;
    assertEquals(JSON.stringify(st), JSON.stringify(a.st));
  }
});

Deno.test("billar: la animación por subpasos da lo mismo que la reproducción instantánea", () => {
  const st = B.inicial(5), tiro = { angulo: 3, fuerza: 95, efecto: 20 };
  const sim = B.crearSim(st, tiro); let cuadros = 0;
  while (!sim.termino) { for (let i = 0; i < B.SUB; i++) { sim.paso(); } cuadros++; }
  assertEquals(JSON.stringify(sim.resultado()), JSON.stringify(B.aplicar(st, tiro)));
  assert(cuadros > 10);
});

// ---------- Línea de turnos de sala ----------
Deno.test("linea: jugadas de la persona, turno del bot por tiempo, tiro automático y rendirse", () => {
  const orden = [{ id: "a-marisol" }, { id: "bot-vachira", bot: true }];
  const base = { motor: B, seed: 9, orden, inicio: 1000, turnoMs: 60000, botMs: 1500 };
  // Sin jugadas: se espera a Marisol hasta el límite.
  let l = F.linea({ ...base, jugadas: [], ahora: 2000 });
  assertEquals([l.paso, l.espera.tipo, l.espera.idx, l.espera.limite], [0, "persona", 0, 61000]);
  // Rompe Marisol; luego le toca al bot cuando pase su tiempo.
  const j0 = { n: 0, accion: "tiro", angulo: 0, fuerza: 90, efecto: 0, t: 5000, jugador: "a-marisol" };
  l = F.linea({ ...base, jugadas: [j0], ahora: 5001 });
  assertEquals(l.paso, 1);
  const T0 = 5000 + l.historia[0].ms;
  if (l.turno === 1) {
    assertEquals([l.espera.tipo, l.espera.t], ["bot", T0 + 1500]);
    const l2 = F.linea({ ...base, jugadas: [j0], ahora: T0 + 1500 });
    assertEquals([l2.historia[1].origen, l2.historia[1].idx], ["bot", 1]);
  }
  // Jugada de quien no tiene el turno o tarde → se ignora; sin tiro a tiempo, tiro automático tras la gracia.
  const tarde = { ...j0, t: 70000 };
  assertEquals(F.linea({ ...base, jugadas: [tarde], ahora: 62000 }).paso, 0, "dentro de la gracia aún espera");
  const auto = F.linea({ ...base, jugadas: [tarde], ahora: 64001 });
  assertEquals([auto.historia[0].origen, auto.historia[0].t], ["auto", 61000]);
  // Rendirse termina a favor del otro.
  const r = F.linea({ ...base, jugadas: [{ n: 0, accion: "rendirse", t: 3000, jugador: "a-marisol" }], ahora: 4000 });
  assertEquals(r.fin, { gana: 1, motivo: "rendicion" });
});

Deno.test("linea: dos personas reproducen lo mismo con o sin caché (determinismo de sala)", () => {
  const orden = [{ id: "a" }, { id: "b" }];
  const base = { motor: B, seed: 77, orden, inicio: 0, turnoMs: 60000, botMs: 1500 };
  const jugadas: any[] = [];
  const cache = {};
  let l = F.linea({ ...base, jugadas, ahora: 0, cache });
  const rnd = F.rng(77, "personas");
  for (let n = 0; n < 12 && !l.fin; n++) {
    const quien = orden[l.turno].id, t = l.T0 + 500;
    jugadas.push({ n, accion: "tiro", ...B.tiroBot(l.st, "medio", rnd), t, jugador: quien });
    l = F.linea({ ...base, jugadas, ahora: t + 1, cache });
    assertEquals(l.paso, n + 1);
  }
  const fresco = F.linea({ ...base, jugadas, ahora: l.T0 + 1 });
  assertEquals(JSON.stringify(fresco.st), JSON.stringify(l.st));
});

// ---------- Futbolito ----------
Deno.test("futbolito: barra activa según la pelota y patada hacia la portería rival", () => {
  const st = T.nuevo();
  st.pelota = { x: 150, y: 250, vx: 0, vy: 0 };
  assertEquals(T.BARRAS[T.barraActiva(st, 0)].puesto, "medios");
  st.pelota.y = 300;
  assertEquals(T.BARRAS[T.barraActiva(st, 0)].puesto, "defensa");
  // Pelota frente al jugador central de los medios (y = 270): patada → sale hacia arriba (equipo 0 ataca hacia y = 0).
  st.pelota = { x: 150, y: 270 - T.ALCANCE - 2, vx: 0, vy: 0 };
  T.patear(st, 4, 450);
  const mando = { obj: st.s.slice(), vmax: T.BARRAS.map(() => 300), fantasma: T.BARRAS.map(() => false) };
  for (let i = 0; i < 6; i++) T.paso(st, T.DT, mando);
  assert(st.pelota.vy < -380 && Math.abs(st.pelota.vx) < 60, JSON.stringify(st.pelota));
});

Deno.test("futbolito: la pelota nunca se queda donde nadie la alcanza (bot contra bot, 3 minutos)", () => {
  const st = T.nuevo(); T.saque(st, 0, 12);
  const rnd = F.rng(2, "vivo"), m0 = {}, m1 = {};
  const mando = { obj: st.s.slice(), vmax: T.BARRAS.map(() => 0), fantasma: T.BARRAS.map(() => false) };
  let quieto = 0, peor = 0;
  const goles = [0, 0];
  for (let f = 0; f < 60 * 180; f++) {
    T.iaBot(st, 0, "medio", mando, m0, rnd, 1 / 60); T.iaBot(st, 1, "dificil", mando, m1, rnd, 1 / 60);
    for (let s = 0; s < T.SUB; s++) { const gg = T.paso(st, T.DT, mando); if (gg !== null) { goles[gg]++; T.saque(st, 1 - gg); break; } }
    const v = Math.sqrt(st.pelota.vx * st.pelota.vx + st.pelota.vy * st.pelota.vy);
    quieto = v < 5 ? quieto + 1 : 0; peor = Math.max(peor, quieto);
  }
  assert(peor < 180, `quieta ${peor} cuadros`);
  assert(goles[0] + goles[1] > 0, "hay goles");
});

Deno.test("futbolito: tiros deterministas, gol y saque de quien lo recibió, fin a 5 goles", () => {
  const jugar = (seed: number) => {
    let st = T.inicial(seed); const rnd = F.rng(seed, "t"), tiros = [];
    while (!st.fin && tiros.length < 400) { const t = T.tiroBot(st, "medio", rnd); tiros.push(t); st = T.aplicar(st, t).st; }
    return { st, tiros };
  };
  const a = jugar(4), b = jugar(4);
  assertEquals(JSON.stringify(a), JSON.stringify(b));
  assert(a.st.fin && a.st.marcador[a.st.fin.gana] === 5 && a.st.posesion === null, JSON.stringify(a.st.marcador));
  // Tras cada gol saca el equipo que lo recibió, desde sus medios.
  let st = T.inicial(4);
  for (const t of a.tiros) {
    const r = T.aplicar(st, t).st;
    if (r.ultimo.gol !== null && !r.fin) assertEquals([r.turno, r.posesion.barra], [1 - r.ultimo.gol, T.MEDIOS[1 - r.ultimo.gol]]);
    st = r;
  }
  assertEquals(JSON.stringify(st), JSON.stringify(a.st));
  assertEquals(T.puntos(a.st, a.st.fin.gana), Math.min(1000, 300 + 350));
  // Animación por subpasos = reproducción instantánea.
  const s0 = T.inicial(1), tiro = { pos: 10, angulo: -20, fuerza: 90 }, sim = T.crearSim(s0, tiro);
  while (!sim.termino) for (let i = 0; i < T.SUB; i++) sim.paso();
  assertEquals(JSON.stringify(sim.resultado()), JSON.stringify(T.aplicar(s0, tiro)));
});

Deno.test("futbolito: la línea de sala con 1 persona + bot y rendirse", () => {
  const orden = [{ id: "a-angel" }, { id: "bot-vachira", bot: true }];
  const base = { motor: T, seed: 5, orden, inicio: 0, turnoMs: 30000, botMs: 1500 };
  const j0 = { n: 0, accion: "tiro", pos: 0, angulo: 0, fuerza: 80, t: 1000, jugador: "a-angel" };
  const l = F.linea({ ...base, jugadas: [j0], ahora: 999999 });
  assert(l.historia.length > 1 && l.historia.some((h: any) => h.origen === "bot"));
  const r = F.linea({ ...base, jugadas: [{ n: 0, accion: "rendirse", t: 500, jugador: "a-angel" }], ahora: 600 });
  assertEquals(r.fin, { gana: 1, motivo: "rendicion" });
});
