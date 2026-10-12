// Motor de ⛳ Golf (openspec: golf): hoyos, física (paredes, arena, agua, pendientes, portales, molino y compuerta),
// reglas de turnos y hoyos, puntuación, bot y determinismo (misma lista de tiros → mismo estado, bit a bit).
// deno-lint-ignore-file no-explicit-any
import { assert, assertEquals } from "jsr:@std/assert@1";
import "../juegos/fisica.js";
import "../juegos/golf-motor.js";

const g = globalThis as any;
const F = g.Fisica, G = g.Golf;

// Estado de un solo hoyo (índice 0–8) con la pelota de quien tira en (x, y).
function en(hoyo: number, x?: number, y?: number, reloj = 0, n = 1) {
  const st = G.partida([hoyo], n);
  if (x !== undefined) Object.assign(st.jug[0], { x, y });
  st.reloj = reloj;
  return st;
}
const correr = (st: any, tiro: any) => { const s = G.crearSim(st, tiro); while (!s.termino) s.paso(); return s; };
const hacia = (x0: number, y0: number, x1: number, y1: number) => F.atan2Dec(y1 - y0, x1 - x0);

Deno.test("golf: el motor solo usa + − * / y Math.sqrt", () => {
  const fuente = Deno.readTextFileSync(new URL("../juegos/golf-motor.js", import.meta.url));
  assert(!/Math\.(sin|cos|tan|atan2?|hypot|pow|exp|log)\(|\*\*/.test(fuente), "sin trigonometría ni potencias de Math");
});

Deno.test("golf: 9 hoyos hechos a mano con par y dificultad creciente; salida y hoyo dentro del campo", () => {
  assertEquals(G.HOYOS.length, 9);
  assertEquals(G.HOYOS.map((h: any) => h.par), [2, 2, 3, 3, 3, 3, 3, 4, 5]);
  assertEquals(G.HOYOS.map((h: any) => h.n), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const mecanicas = (h: any) => [...new Set([...h.zonas.map((z: any) => z.tipo), ...h.moviles.map((m: any) => m.tipo), ...(h.portales.length ? ["portal"] : [])])];
  const todas = new Set(G.HOYOS.flatMap(mecanicas));
  for (const m of ["arena", "agua", "pendiente", "molino", "compuerta", "portal"]) assert(todas.has(m), "falta la mecánica " + m);
  assert(mecanicas(G.HOYOS[8]).length >= 4, "el gran final combina mecánicas");
  for (const h of G.HOYOS) {
    const geo = G.geometria(h);
    for (const p of [h.salida, h.hoyo]) {
      assert(G.dentroCampo(geo, p.x, p.y), `hoyo ${h.n}: punto dentro del campo`);
      assert(!h.zonas.some((z: any) => z.tipo === "agua" && G.enZona(z, p.x, p.y)), `hoyo ${h.n}: sin agua en la salida ni en el hoyo`);
    }
    assert(h.nombre && h.ayuda && h.ancho > 0 && h.alto > 0);
  }
});

Deno.test("golf: la pelota rebota en la pared", () => {
  const s = correr(en(0), { angulo: 900, fuerza: 40 }); // hacia abajo, contra la pared de la salida
  assert(s.rebotes >= 1, "rebotó");
  assert(s.bola.y < 490, "regresó hacia arriba: " + s.bola.y);
});

Deno.test("golf: la arena frena mucho más que el pasto", () => {
  const pasto = correr(en(2, 300, 600), { angulo: 2700, fuerza: 30 });
  const arena = correr(en(2, 230, 385), { angulo: 1800, fuerza: 30 });
  const recorrido = (s: any, x: number, y: number) => Math.sqrt((s.bola.x - x) ** 2 + (s.bola.y - y) ** 2);
  assert(recorrido(arena, 230, 385) * 2.5 < recorrido(pasto, 300, 600), `arena ${recorrido(arena, 230, 385)} vs pasto ${recorrido(pasto, 300, 600)}`);
});

Deno.test("golf: el agua regresa la pelota a donde se tiró con un golpe de castigo", () => {
  const st = en(4);
  const r = G.aplicar(st, { angulo: 2700, fuerza: 60 }).st; // derecho al lago
  assertEquals([r.ultimo.evento, r.jug[0].x, r.jug[0].y, r.jug[0].golpes[0]], ["agua", 80, 650, 2]);
});

Deno.test("golf: la pendiente empuja de lado y la rampa regresa una pelota lenta", () => {
  const s = correr(en(3, 100, 350), { angulo: 2700, fuerza: 5 });
  assert(s.bola.x > 115, "la loma la empuja a la derecha: " + s.bola.x);
  const rampa = correr(en(3, 180, 190), { angulo: 2700, fuerza: 1 });
  assert(rampa.bola.y > 205, "la rampa la regresa hacia abajo: " + rampa.bola.y);
});

Deno.test("golf: el portal lleva la pelota al otro lado", () => {
  const s = correr(en(6, 290, 520), { angulo: 2700, fuerza: 30 });
  assertEquals(s.portales, 1);
  assert(s.bola.x < 180 && s.bola.y > 300, `salió del otro lado y bajó: ${s.bola.x},${s.bola.y}`);
});

Deno.test("golf: el molino abre y cierra la puerta del túnel", () => {
  const m = G.HOYOS[5].moviles[0];
  assertEquals([G.estadoMovil(m, 0).cerrada, G.estadoMovil(m, 120).cerrada, G.estadoMovil(m, 240).cerrada], [true, false, true]);
  const cerrada = correr(en(5, 170, 440, 0), { angulo: 2700, fuerza: 35 });
  assert(cerrada.bola.y > 400, "rebota en el aspa: " + cerrada.bola.y);
  const abierta = correr(en(5, 170, 440, 120), { angulo: 2700, fuerza: 35 });
  assert(abierta.bola.y < 330, "pasa por el túnel: " + abierta.bola.y);
  // Pelota quieta en la puerta cuando se cierra: puede salir (no queda atrapada).
  const encima = correr(en(5, 170, 400, 0), { angulo: 900, fuerza: 20 });
  assert(encima.bola.y > 420, "sale de la puerta: " + encima.bola.y);
});

Deno.test("golf: la compuerta va y viene y desvía la pelota", () => {
  const m = G.HOYOS[7].moviles[0];
  const xs = [0, 180, 360, 540].map((t) => G.estadoMovil(m, t).x);
  assertEquals(xs, [250, 290, 330, 290]);
  assert(G.estadoMovil(m, 10).vx > 0 && G.estadoMovil(m, 400).vx < 0);
  // Al pasar por el hueco con la compuerta enfrente, la pelota rebota.
  const contra = correr(en(7, 290, 680, 0), { angulo: 2700, fuerza: 40 });
  assert(contra.rebotes >= 1 && contra.bola.y > 560, "rebota en la compuerta: " + contra.bola.y);
  const libre = correr(en(7, 290, 680, 360), { angulo: 2700, fuerza: 40 });
  assert(libre.bola.y < 560, "con la compuerta a un lado pasa: " + libre.bola.y);
});

Deno.test("golf: entra despacio; muy rápido pasa de largo", () => {
  const lenta = G.aplicar(en(0, 150, 150), { angulo: 2700, fuerza: 8 }).st;
  assertEquals([lenta.ultimo.evento, lenta.jug[0].dentro, lenta.fin !== null], ["hoyo", true, true]);
  const s = G.crearSim(en(0, 150, 250), { angulo: 2700, fuerza: 100 });
  while (!s.termino && s.bola.y > 80) s.paso();
  assert(!s.termino && s.evento === null, "a 700 u/s no se mete al pasar");
});

Deno.test("golf: límite de par + 4 (recogida) y fin del recorrido", () => {
  let st = G.partida([0, 1], 1);
  for (let i = 0; i < 6; i++) st = G.aplicar(st, { angulo: 900, fuerza: 1 }).st;
  assertEquals([st.h, st.jug[0].golpes, st.jug[0].recogidas, st.ultimo.recogida], [1, [6, 0], [0], true]);
  assertEquals([st.jug[0].x, st.jug[0].y], [75, 560], "el siguiente hoyo empieza en su salida");
  assertEquals(G.limite(2), 6);
});

Deno.test("golf: turnos por menos golpes en el hoyo, cambio de hoyo y fin con orden por golpes", () => {
  let st = G.partida([0, 1], 2);
  assertEquals(G.turno(st), 0);
  st = G.aplicar(st, { angulo: 2700, fuerza: 20 }).st;
  assertEquals(G.turno(st), 1, "el que lleva menos golpes");
  st = G.aplicar(st, { angulo: 2700, fuerza: 20 }).st;
  assertEquals(G.turno(st), 0, "empate: el primero de la mesa");
  // Las dos la meten (desde cerca) y pasan al hoyo 2.
  st.jug[0].x = 150; st.jug[0].y = 150; st.jug[1].x = 150; st.jug[1].y = 150;
  st = G.aplicar(st, { angulo: 2700, fuerza: 8 }).st;
  assertEquals([st.h, G.turno(st)], [0, 1]);
  st = G.aplicar(st, { angulo: 2700, fuerza: 8 }).st;
  assertEquals([st.h, st.jug[0].dentro, st.jug[1].dentro, st.reloj], [1, false, false, 0]);
  assertEquals(st.jug.map((j: any) => j.golpes[0]), [2, 2]);
  for (let i = 0; i < 12 && !st.fin; i++) st = G.aplicar(st, { angulo: 900, fuerza: 1 }).st;
  assert(st.fin, "terminó el recorrido");
  assertEquals(st.fin.ranking.map((r: any) => r.lugar), [1, 1], "empate en golpes comparte lugar");
});

Deno.test("golf: rendirse saca a esa persona, cuenta el límite y los demás siguen", () => {
  let st = G.partida([0, 1], 3);
  st = G.rendir(st, 1);
  assertEquals([st.jug[1].retirado, st.jug[1].golpes, st.fin], [true, [6, 6], null]);
  st = G.aplicar(st, { angulo: 2700, fuerza: 20 }).st; // tira 0
  assertEquals(G.turno(st), 2, "se salta a quien se rindió");
  st = G.rendir(G.rendir(st, 0), 2);
  assert(st.fin, "si todos se rinden, termina");
  assertEquals(G.ranking(st).every((r: any) => r.retirado), true);
});

Deno.test("golf: nombres de resultado, estrellas y puntos por hoyo", () => {
  const r = (gol: number, par: number, rec = false) => G.resultado(gol, par, rec).clave;
  assertEquals([r(1, 3), r(2, 5), r(3, 5), r(2, 3), r(3, 3), r(4, 3), r(5, 3), r(6, 3), r(7, 3), r(7, 3, true)],
    ["hoyo-en-uno", "albatros", "aguila", "birdie", "par", "bogey", "doble-bogey", "triple-bogey", "mas", "recogida"]);
  assertEquals(G.resultado(2, 3).t, "¡Birdie!");
  assertEquals([G.estrellas(2, 3), G.estrellas(3, 3), G.estrellas(5, 3), G.estrellas(7, 3, true)], [3, 2, 1, 0]);
  assertEquals([G.puntosHoyo(2, 3), G.puntosHoyo(3, 3), G.puntosHoyo(1, 2), G.puntosHoyo(7, 3), G.puntosHoyo(7, 3, true)], [110, 80, 210, 20, 10]);
});

Deno.test("golf: puntos de sala por lugar más estrellas, con tope", () => {
  let st = G.partida([0], 3);
  st.jug[0].golpes = [2]; st.jug[1].golpes = [3]; st.jug[2].golpes = [3];
  st.jug.forEach((j: any) => { j.dentro = true; });
  st.fin = { ranking: G.ranking(st) };
  assertEquals(G.ranking(st).map((r: any) => [r.idx, r.lugar]), [[0, 1], [1, 2], [2, 2]]);
  assertEquals(G.puntosSala(st), [520, 310, 310]);
  st = G.rendir(G.partida([0], 2), 1);
  st = G.aplicar(st, { angulo: 2700, fuerza: 33 }).st;
  assert(G.puntosSala(st)[1] === 0, "quien se rinde no tiene puntos de lugar");
});

Deno.test("golf: la animación por subpasos da lo mismo que la reproducción instantánea", () => {
  const st = en(5, 170, 690, 77);
  const tiro = { angulo: 2690, fuerza: 70 };
  const sim = G.crearSim(st, tiro);
  let cuadros = 0;
  while (!sim.termino) { for (let i = 0; i < G.SUB && !sim.termino; i++) sim.paso(); cuadros++; }
  assertEquals(JSON.stringify(sim.resultado()), JSON.stringify(G.aplicar(st, tiro)));
  assert(cuadros > 10);
});

Deno.test("golf: determinismo — la misma lista de tiros da exactamente el mismo estado", () => {
  const jugar = () => {
    let st = G.partida([0, 1, 2, 3, 4, 5, 6, 7, 8], 2);
    const rnd = F.rng(7, "det"), tiros: any[] = [];
    while (!st.fin && tiros.length < 120) {
      const t = { angulo: Math.floor(rnd() * 3600), fuerza: 1 + Math.floor(rnd() * 100) };
      tiros.push(t); st = G.aplicar(st, t).st;
    }
    return { st, tiros };
  };
  const a = jugar(), b = jugar();
  assertEquals(JSON.stringify(a.st), JSON.stringify(b.st));
  let st = G.partida([0, 1, 2, 3, 4, 5, 6, 7, 8], 2);
  for (const t of a.tiros) st = G.aplicar(F.clonar(st), t).st; // reproducción con clones (como otro aparato)
  assertEquals(JSON.stringify(st), JSON.stringify(a.st));
});

Deno.test("golf: cada hoyo se termina con el bot (difícil) dentro del límite, sin recogerla", () => {
  const golpes: number[] = [];
  for (let i = 0; i < 9; i++) {
    let st = G.partida([i], 1);
    const rnd = F.rng(11, "hoyo" + i);
    while (!st.fin) st = G.aplicar(st, G.tiroBot(st, "dificil", rnd)).st;
    assertEquals(st.jug[0].recogidas, [], `hoyo ${i + 1}: ${st.jug[0].golpes[0]} golpes`);
    golpes.push(st.jug[0].golpes[0]);
  }
  const pares = G.HOYOS.map((h: any) => h.par);
  assert(golpes.every((x, i) => x <= pares[i] + 2), "golpes del bot: " + golpes.join(","));
  console.log("golpes del bot difícil por hoyo:", golpes.join(" "), "· pares:", pares.join(" "));
});

Deno.test("golf: hoyos de sala con la semilla (uno fácil, uno medio y uno difícil)", () => {
  const a = G.hoyosSala(123);
  assertEquals(a, G.hoyosSala(123));
  assertEquals(a.length, 3);
  assert(a[0] <= 2 && a[1] >= 3 && a[1] <= 5 && a[2] >= 6 && a[2] <= 8, String(a));
  const varios = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((s) => G.hoyosSala(s).join(",")));
  assert(varios.size > 3, "cambia con la semilla");
});

Deno.test("golf: línea de turnos de sala con motorSala (personas, tiro automático y rendirse)", () => {
  const motor = G.motorSala(2), seed = 99, inicio = 1_000_000;
  const orden = [{ id: "a" }, { id: "b" }];
  const base = { motor, seed, orden, inicio, turnoMs: 30000, botMs: 1500, cache: {} };
  const j0 = { n: 0, accion: "tiro", angulo: 2700, fuerza: 30, t: inicio + 2000, jugador: "a" };
  let l = F.linea({ ...base, jugadas: [j0], ahora: inicio + 3000 });
  assertEquals([l.paso, l.historia[0].origen, l.espera.idx, l.espera.tipo], [1, "jugada", 1, "persona"]);
  // Nadie tira a tiempo: tiro automático en todos los aparatos (mismo resultado).
  const tarde = inicio + 2000 + l.historia[0].ms + 30000 + 3000;
  l = F.linea({ ...base, cache: {}, jugadas: [j0], ahora: tarde });
  const l2 = F.linea({ ...base, cache: {}, jugadas: [j0], ahora: tarde });
  assertEquals(l.historia[1].origen, "auto");
  assertEquals(JSON.stringify(l.historia[1].despues), JSON.stringify(l2.historia[1].despues));
  // Rendirse de quien tiene el turno: la otra persona sigue sola.
  const r = F.linea({ ...base, cache: {}, jugadas: [j0, { n: 1, accion: "rendirse", t: inicio + 6000, jugador: "b" }], ahora: inicio + 7000 });
  assertEquals([r.st.jug[1].retirado, !!r.fin, r.turno], [true, false, 0]);
});
