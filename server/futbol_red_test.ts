// Netcode de Fútbol Estelar en línea (openspec: futbol-en-linea): foto cuantizada, entrada empacada, interpolación,
// predicción y reconciliación, y un partido completo anfitrión–invitado sobre un canal simulado con latencia, pérdida
// y desorden que mantiene los dos aparatos cerca y con el mismo marcador.
// deno-lint-ignore-file no-explicit-any
import { assert, assertAlmostEquals, assertEquals } from "jsr:@std/assert@1";
import "../juegos/futbol-motor.js";
import "../juegos/futbol-red.js";
import { canalesSimulados } from "./futbol_red_canal.ts";

const g = globalThis as any;
const M = g.FutbolMotor, R = g.FutbolRed;
const equipo = (corto: string, media: number) => M.equipoGenerico(corto, media, null);
const partido = (humanos = [{ eq: 0 }, { eq: 1 }], semilla = "sala") => M.crearPartido({ semilla, equipos: [equipo("AAA", 70), equipo("BBB", 70)], minutos: 1, humanos });

Deno.test("futbol-red: la foto pesa ~500 B y su error de posición es ≤ 0.05 m", () => {
  const p = partido();
  M.simular(p, 20);
  p.balon.z = 1.234;
  const f = R.foto(p, { q: 7, t: 1234, ai: 3, ev: [] });
  const bytes = new TextEncoder().encode(JSON.stringify(f)).length;
  assert(bytes < 600, "foto de " + bytes + " B");
  assert(bytes > 250);
  const s = R.leerFoto(structuredClone(f));
  assertEquals([s.q, s.t, s.ai, s.goles, s.estado, s.minuto], [7, 1234, 3, [p.eq[0].goles, p.eq[1].goles], p.estado, p.minuto]);
  for (let i = 0; i < 22; i++) {
    assert(Math.abs(s.jug[i].x - p.jug[i].x) <= 0.025 + 1e-9 && Math.abs(s.jug[i].y - p.jug[i].y) <= 0.025 + 1e-9, "jugador " + i);
    const d = Math.abs(((s.jug[i].dir - p.jug[i].dir) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI);
    assert(d <= Math.PI / 64 + 1e-9, "dirección " + i);
  }
  assertAlmostEquals(s.balon.z, 1.25, 1e-9, "altura del balón cuantizada a 0.05 m");
  assertEquals(R.leerFoto({ j: [1, 2, 3] }), null, "foto mal formada");
});

Deno.test("futbol-red: la entrada viaja en ~40 B con joystick y botones", () => {
  const m = R.empacarEntrada({ x: 0.5, y: -1.7, tiro: true, sprint: true }, 12);
  assertEquals(m, { s: 12, x: 50, y: -100, b: (1 << 1) | (1 << 4) });
  assert(JSON.stringify(m).length <= 40);
  const e = R.leerEntrada(m);
  assertEquals([e.x, e.y, e.tiro, e.sprint, e.pase, e.cambiar], [0.5, -1, true, true, false, false]);
});

Deno.test("futbol-red: el búfer interpola entre fotos, descarta viejas y repetidas y extrapola poco", () => {
  const base = (q: number, t: number, x: number) => ({ q, t, estado: "juego", minuto: 1, mitad: 1, goles: [0, 0], dueno: -1, posesion: 0, humanos: [0, 11], ai: 0, tanda: null, ev: [], balon: { x, y: 0, z: 0, vx: 10, vy: 0, vz: 0 }, jug: [{ x, y: 0, dir: 3.1, anim: "corre" }] });
  const buf = R.crearBuffer(100);
  assert(R.agregarFoto(buf, base(1, 0, 0), 1000));
  assert(R.agregarFoto(buf, base(3, 133, 2), 1133));
  assert(R.agregarFoto(buf, base(2, 66, 1), 1140), "llega fuera de orden pero entra en su lugar");
  assert(!R.agregarFoto(buf, base(2, 66, 1), 1150), "repetida");
  assertEquals(buf.fotos.map((f: any) => f.q), [1, 2, 3]);
  const s = R.estadoEn(buf, 99.5);
  assertAlmostEquals(s.jug[0].x, 1.5, 1e-9);
  assertAlmostEquals(s.balon.x, 1.5, 1e-9);
  const ang = R.interpolar({ ...base(1, 0, 0), jug: [{ x: 0, y: 0, dir: 3.1, anim: "corre" }] }, { ...base(2, 100, 0), jug: [{ x: 0, y: 0, dir: -3.1, anim: "corre" }] }, 0.5);
  assert(Math.abs(Math.abs(ang.jug[0].dir) - Math.PI) < 0.01, "la dirección gira por el camino corto");
  const ex = R.estadoEn(buf, 133 + 500);
  assertAlmostEquals(ex.balon.x, 2 + 10 * 0.1, 1e-9, "extrapola a lo más 100 ms");
  R.podar(buf, 120);
  assertEquals(buf.fotos.map((f: any) => f.q), [2, 3]);
  assert(!R.agregarFoto(buf, base(0, -50, 0), 1200), "más vieja que la primera del búfer");
  // Reloj: dibuja 100 ms atrás del anfitrión.
  const b2 = R.crearBuffer(100);
  R.agregarFoto(b2, base(1, 500, 0), 10_000);
  assertEquals(R.tiempoRender(b2, 10_050), 450);
});

Deno.test("futbol-red: predicción y reconciliación del jugador del invitado", () => {
  const vmax = (s: boolean) => (s ? 8 : 6);
  const pred = R.crearPrediccion();
  R.reconciliar(pred, { x: 0, y: 0, vx: 0, vy: 0 }, 0, vmax);
  for (let s = 1; s <= 30; s++) R.predecir(pred, s, { x: 1, y: 0 }, 1 / 30, vmax);
  assert(pred.x > 2 && Math.abs(pred.y) < 1e-9, "avanza a la derecha sin esperar al anfitrión: " + pred.x);
  // El anfitrión ya aplicó hasta la 20 y su posición coincide con lo que predijimos hasta ahí: la corrección es mínima.
  const sim = R.crearPrediccion(); R.reconciliar(sim, { x: 0, y: 0, vx: 0, vy: 0 }, 0, vmax);
  for (let s = 1; s <= 20; s++) R.predecir(sim, s, { x: 1, y: 0 }, 1 / 30, vmax);
  const dibujado = { x: pred.x, y: pred.y };
  R.reconciliar(pred, { x: sim.x, y: sim.y, vx: sim.vx, vy: sim.vy }, 20, vmax);
  assertEquals(pred.pend.length, 10, "solo quedan las entradas que el anfitrión no ha visto");
  assert(Math.hypot(pred.x + pred.ex - dibujado.x, pred.y + pred.ey - dibujado.y) < 1e-6, "sin salto visible");
  assert(Math.hypot(pred.x - dibujado.x, pred.y - dibujado.y) < 0.05, "y la predicción re-aplicada llega al mismo lugar");
  // Un empujón del anfitrión (el jugador quedó 1 m más abajo): se corrige suave, no de golpe.
  R.reconciliar(pred, { x: sim.x, y: sim.y - 1, vx: sim.vx, vy: sim.vy }, 20, vmax);
  const p1 = R.posicionPredicha(pred), p2 = R.posicionPredicha(pred);
  assert(p1.y - pred.y > 0.5 && p2.y < p1.y && p2.y > pred.y, "error que decae");
  for (let k = 0; k < 30; k++) R.posicionPredicha(pred);
  assert(Math.abs(R.posicionPredicha(pred).y - pred.y) < 1e-3, "termina en la autoritativa");
  // Un salto de más de 3 m se corrige de golpe.
  R.reconciliar(pred, { x: sim.x + 10, y: 0, vx: 0, vy: 0 }, 30, vmax);
  assertEquals([pred.ex, pred.ey], [0, 0]);
});

Deno.test("futbol-red: clubes de la sala distintos y iguales en los dos aparatos", () => {
  for (const seed of [0, 1, 23, 24, 12345, 2147483646]) {
    const [a, b] = R.clubesDeSala(seed, 24);
    assert(a !== b && a >= 0 && b >= 0 && a < 24 && b < 24, String(seed));
    assertEquals(R.clubesDeSala(seed, 24), [a, b]);
  }
});

// Partido completo: el anfitrión simula; el invitado manda entradas (persigue al balón con su jugador) por un canal
// con latencia, pérdida y desorden. Se comparan las posiciones dibujadas con las del anfitrión en el mismo instante
// (100 ms + latencia atrás) y el marcador final.
function partidoEnRed(red: { latencia: number; perdida: number; desorden: number }, semilla: string) {
  let reloj = 0;
  const ahora = () => reloj;
  const [cA, cI] = canalesSimulados({ ...red, ahora, semilla, ids: ["anf", "inv"] });
  const pa = partido([{ eq: 0 }, { eq: 1 }], semilla), pi = partido([{ eq: 0 }, { eq: 1 }], semilla);
  const anf = R.anfitrion({ canal: cA, p: pa, M, invitado: "inv", ahora });
  const inv = R.invitado({ canal: cI, p: pi, M, anfitrion: "anf", ahora });
  const historial: any[] = [];
  const errores: number[] = [];
  let golesVistos = 0;
  const PASO_MS = 1000 / 60;
  for (let k = 0; k < 60 * 75 && pa.estado !== "fin"; k++) {
    reloj = k * PASO_MS;
    // Invitado: su jugador va hacia el balón que ve; tira cerca del arco.
    const yo = pi.humanos[1] && pi.humanos[1].jug >= 0 ? pi.jug[pi.humanos[1].jug] : null;
    const ent = yo ? { x: Math.sign(pi.balon.x - yo.x) * Math.min(1, Math.abs(pi.balon.x - yo.x)), y: -Math.sign(pi.balon.y - yo.y) * Math.min(1, Math.abs(pi.balon.y - yo.y)), tiro: k % 90 < 20, sprint: true } : M.NADA;
    inv.entrada(ent);
    anf.paso(M.NADA);
    anf.enviarSiToca();
    historial.push({ t: reloj, jug: pa.jug.map((j: any) => ({ x: j.x, y: j.y })), goles: [pa.eq[0].goles, pa.eq[1].goles] });
    cA.entregar(); cI.entregar();
    const d = inv.dibujar();
    if (d) golesVistos += d.eventos.filter((e: any) => e.tipo === "gol").length;
    if (d && k % 30 === 0 && d.estado.estado === "juego") {
      const tr = R.tiempoRender(inv.buf, reloj);
      const h = historial.reduce((a, b) => (Math.abs(b.t - tr) < Math.abs(a.t - tr) ? b : a));
      const yoI = pi.humanos[1].jug;
      const otros = pi.jug.filter((_: any, i: number) => i !== yoI).map((j: any, i: number) => Math.hypot(j.x - h.jug[i >= yoI ? i + 1 : i].x, j.y - h.jug[i >= yoI ? i + 1 : i].y));
      errores.push(Math.max(...otros));
    }
  }
  // Las últimas fotos llegan.
  for (let k = 0; k < 120; k++) { reloj += PASO_MS; anf.enviarSiToca(); cA.entregar(); cI.entregar(); inv.dibujar(); }
  return { pa, pi, inv, errores, golesVistos, enviadas: cA.enviadas, recibidas: inv.st.recibidas };
}

Deno.test("futbol-red: partido completo con 150 ms, 10 % de pérdida y desorden: mismo marcador y dibujo cercano", () => {
  const r = partidoEnRed({ latencia: 150, perdida: 0.1, desorden: 0.2 }, "sala-red");
  assertEquals(r.pa.estado, "fin");
  assertEquals([r.pi.eq[0].goles, r.pi.eq[1].goles], [r.pa.eq[0].goles, r.pa.eq[1].goles], "mismo marcador");
  assertEquals(r.pi.estado, "fin", "el invitado también ve el final");
  assertEquals(r.golesVistos, r.pa.eq[0].goles + r.pa.eq[1].goles, "un aviso de gol por gol");
  const ordenado = r.errores.slice().sort((a, b) => a - b), p90 = ordenado[Math.floor(ordenado.length * 0.9)];
  console.log("red 150 ms:", { p90: p90.toFixed(2), muestras: r.errores.length, goles: [r.pa.eq[0].goles, r.pa.eq[1].goles], enviadas: r.enviadas, recibidas: r.recibidas });
  assert(r.errores.length > 50);
  assert(p90 < 0.5, "90 % de las muestras con el peor jugador a menos de 0.5 m: " + p90.toFixed(2));
  assert(r.recibidas < r.enviadas && r.recibidas > r.enviadas * 0.8, "se perdieron fotos y aun así funciona");
});

Deno.test("futbol-red: sin pérdida ni latencia el dibujo es casi exacto", () => {
  const r = partidoEnRed({ latencia: 0, perdida: 0, desorden: 0 }, "sala-limpia");
  const ordenado = r.errores.slice().sort((a, b) => a - b);
  assert(ordenado[Math.floor(ordenado.length * 0.9)] < 0.6, "p90 " + ordenado[Math.floor(ordenado.length * 0.9)]);
  assertEquals([r.pi.eq[0].goles, r.pi.eq[1].goles], [r.pa.eq[0].goles, r.pa.eq[1].goles]);
});

Deno.test("futbol-red: el anfitrión ignora entradas viejas y de quien no es el invitado; la IA toma al que se cae", () => {
  let reloj = 0;
  const [cA, cI, cX] = canalesSimulados({ latencia: 0, perdida: 0, desorden: 0, ahora: () => reloj, semilla: "x", ids: ["anf", "inv", "intruso"] });
  const pa = partido();
  const anf = R.anfitrion({ canal: cA, p: pa, M, invitado: "inv", ahora: () => reloj });
  cI.enviar("fe:entrada", R.empacarEntrada({ x: 1, y: 0 }, 5)); cA.entregar();
  cI.enviar("fe:entrada", R.empacarEntrada({ x: -1, y: 0 }, 4)); cA.entregar();
  assertEquals(anf.st.entrada.x, 1, "la entrada 4 llegó tarde y se ignora");
  cX.enviar("fe:entrada", R.empacarEntrada({ x: 0, y: 1 }, 99)); cA.entregar();
  assertEquals([anf.st.entrada.y, anf.st.ultimaS], [0, 5], "el intruso no cuenta");
  assertEquals(pa.humanos.length, 2);
  anf.iaAlInvitado();
  assertEquals(pa.humanos.length, 1, "la IA mueve al equipo del invitado");
  assert(pa.jug.filter((j: any) => j.eq === 1).every((j: any) => j.humano < 0));
  reloj = R.DESCONEXION_MS - 1; assert(!anf.cerrarPorCaida());
  reloj = R.DESCONEXION_MS; assert(anf.cerrarPorCaida(), "a los 15 s se cierra");
  cI.enviar("fe:entrada", R.empacarEntrada({ x: 0, y: 0 }, 6)); cA.entregar();
  assertEquals(pa.humanos.length, 2, "si vuelve, recupera su equipo");
  assert(pa.jug.some((j: any) => j.eq === 1 && j.humano === 1));
});
