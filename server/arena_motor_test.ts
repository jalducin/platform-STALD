// Motor de «⚽ Futbolito Arena» (openspec: futbolito-arena, design.md §2, §3, §6 y §9): física determinista (balón,
// paredes, postes, choques, embestida y giro con recarga), gol y saque, fin por goles y por tiempo con gol de oro, IA
// (Fácil vencible, Difícil mejor que Fácil), reparto de equipos, validación del resultado y puntos.
// deno-lint-ignore-file no-explicit-any
import { assert, assertAlmostEquals, assertEquals, assertNotEquals } from "jsr:@std/assert@1";
import "../juegos/arena-motor.js";

const M = (globalThis as any).ArenaMotor;
const NADA = { x: 0, y: 0, a: false, b: false };
const robots = (formato: string) => {
  const [a, b] = M.FORMATOS[formato];
  return [...Array.from({ length: a }, (_, k) => ({ eq: 0, color: k, num: k + 1, nombre: "M" + k })), ...Array.from({ length: b }, (_, k) => ({ eq: 1, color: k, num: a + k + 1, nombre: "S" + k }))];
};
const partido = (o: any = {}) => M.crearPartido({ arena: "normal", robots: robots(o.formato || "1v1"), goles: 5, semilla: "prueba", ...o });
// Pasa el saque y deja el partido en juego.
const enJuego = (p: any) => { while (p.estado !== "juego") M.paso(p, p.robots.map(() => NADA)); return p; };
const pasos = (p: any, n: number, ents?: (p: any) => any[]) => {
  const ev: any[] = [];
  for (let k = 0; k < n; k++) ev.push(...M.paso(p, ents ? ents(p) : p.robots.map(() => NADA)));
  return ev;
};
const huella = (p: any) => JSON.stringify([p.balon, p.robots.map((r: any) => [r.x, r.y, r.vx, r.vy, r.fx, r.fy]), p.goles, p.t, p.estado]);

Deno.test("arena: arenas normal y grande; octágono convexo con la boca de la portería libre", () => {
  assertEquals(M.ARENAS.normal, { L: 16, A: 10, c: 2.4, G: 3.2 });
  assertEquals(M.ARENAS.grande, { L: 22, A: 14, c: 3.2, G: 4.2 });
  for (const id of ["normal", "grande"]) {
    const ps = M.paredes(M.ARENAS[id]);
    assertEquals(ps.length, 8);
    for (const w of ps) assertAlmostEquals(w.nx * w.nx + w.ny * w.ny, 1, 1e-12); // normales unitarias
    for (const w of ps) assert(-w.d > 0, "el centro queda adentro");
    const ar = M.ARENAS[id];
    assert(ar.G / 2 < ar.A / 2 - ar.c, "la boca cabe en la pared corta");
  }
  assertEquals(Object.keys(M.FORMATOS), ["1v1", "1v2", "2v2", "3v3"]);
});

Deno.test("arena: la física es determinista (misma semilla, mismas entradas → mismo partido)", () => {
  const ents = (p: any) => p.robots.map((_: any, i: number) => M.ia(p, i, "medio"));
  const a = partido({ formato: "2v2" }), b = partido({ formato: "2v2" });
  pasos(a, 1500, ents); pasos(b, 1500, ents);
  assertEquals(huella(a), huella(b));
  const c = partido({ formato: "2v2", semilla: "otra" });
  pasos(c, 1500, ents);
  assertNotEquals(huella(a), huella(c));
});

Deno.test("arena: el balón tiene inercia, se frena con la fricción y rebota en las paredes sin salirse", () => {
  const p = enJuego(partido());
  p.robots.forEach((r: any, i: number) => Object.assign(r, { x: -6 + i, y: -4 })); // fuera del camino
  Object.assign(p.balon, { x: 0, y: 0, vx: 0, vy: 8 });
  pasos(p, 6);
  assert(p.balon.y > 0.6 && p.balon.vy < 8 && p.balon.vy > 7, "avanza y se frena poco: " + JSON.stringify(p.balon));
  pasos(p, 90);
  assert(p.balon.vy < 0, "rebotó en la pared de arriba");
  assert(p.balon.y <= p.ar.A / 2 - M.R_BALON + 1e-9);
  for (let k = 0; k < 600; k++) {
    pasos(p, 1);
    const d = Math.max(...p.paredes.map((w: any) => w.nx * p.balon.x + w.ny * p.balon.y + w.d));
    assert(d <= -M.R_BALON + 1e-6 || Math.abs(p.balon.y) < p.ar.G / 2, "dentro de la arena");
  }
  assert(Math.hypot(p.balon.vx, p.balon.vy) < 0.5, "termina casi quieto");
});

Deno.test("arena: rebote en el chaflán y en el poste", () => {
  const p = enJuego(partido());
  p.robots.forEach((r: any, i: number) => Object.assign(r, { x: -2 + i, y: 0 }));
  // Diagonal hacia la esquina de arriba a la derecha: el chaflán la devuelve hacia adentro.
  Object.assign(p.balon, { x: 4, y: 2, vx: 6, vy: 6 });
  pasos(p, 60);
  assert(p.balon.vx < 0 && p.balon.vy < 0, "rebote del chaflán: " + JSON.stringify(p.balon));
  // Directo al poste de arriba de la portería derecha.
  const q = enJuego(partido());
  q.robots.forEach((r: any, i: number) => Object.assign(r, { x: -2 + i, y: 0 }));
  Object.assign(q.balon, { x: 6, y: q.ar.G / 2, vx: 8, vy: 0 });
  const ev = pasos(q, 40);
  assertEquals(q.goles, [0, 0], "el poste no es gol");
  assert(q.balon.vx < 0, "el poste la regresa");
  assert(ev.some((e: any) => e.tipo === "poste"));
});

Deno.test("arena: el joystick acelera al robot hasta su velocidad máxima y la dirección lo sigue", () => {
  const p = enJuego(partido());
  const r = p.robots[0];
  pasos(p, 30, (p: any) => p.robots.map((_: any, i: number) => (i === 0 ? { x: 0, y: 1, a: false, b: false } : NADA)));
  assertAlmostEquals(Math.hypot(r.vx, r.vy), M.VMAX, 1e-6);
  assert(r.fy > 0.99, "mira hacia donde va");
  // Medio joystick: medio de velocidad.
  const q = enJuego(partido());
  pasos(q, 60, (p: any) => p.robots.map((_: any, i: number) => (i === 0 ? { x: -0.5, y: 0, a: false, b: false } : NADA)));
  assertAlmostEquals(Math.hypot(q.robots[0].vx, q.robots[0].vy), M.VMAX * 0.5, 0.2);
  // Zona muerta: un empujón mínimo no mueve.
  const z = enJuego(partido());
  pasos(z, 30, (p: any) => p.robots.map((_: any, i: number) => (i === 0 ? { x: 0.05, y: 0, a: false, b: false } : NADA)));
  assertEquals([z.robots[0].vx, z.robots[0].vy], [0, 0]);
});

Deno.test("arena: A embiste y patea, con recarga; B gira, barre y frena, con recarga", () => {
  const p = enJuego(partido());
  const r = p.robots[0];
  Object.assign(r, { x: -3, y: 0, fx: 1, fy: 0 });
  Object.assign(p.balon, { x: 3, y: 3 });
  const conA = (a: boolean) => (p: any) => p.robots.map((_: any, i: number) => (i === 0 ? { x: 0, y: 0, a, b: false } : NADA));
  let ev = pasos(p, 1, conA(true));
  assert(ev.some((e: any) => e.tipo === "dash" && e.i === 0));
  assertAlmostEquals(r.vx, M.DASH_V, 1e-9);
  assert(r.recA > 1, "recarga");
  pasos(p, 1, conA(false));
  ev = pasos(p, 1, conA(true));
  assert(!ev.some((e: any) => e.tipo === "dash"), "en recarga no vuelve a embestir");
  pasos(p, Math.ceil(M.RECARGA_A * 60), conA(false));
  assertEquals(r.recA, 0);
  assert(pasos(p, 1, conA(true)).some((e: any) => e.tipo === "dash"), "recargado");
  // Patada: el balón pegado al frente sale fuerte en la dirección del robot.
  const q = enJuego(partido());
  const s = q.robots[0];
  Object.assign(s, { x: 0, y: 0, fx: 1, fy: 0, vx: 0, vy: 0 });
  Object.assign(q.balon, { x: M.R_ROBOT + M.R_BALON + 0.1, y: 0, vx: 0, vy: 0 });
  q.robots[1].x = -6;
  ev = pasos(q, 1, (p: any) => p.robots.map((_: any, i: number) => (i === 0 ? { x: 0, y: 0, a: true, b: false } : NADA)));
  assert(ev.some((e: any) => e.tipo === "patada"));
  assert(q.balon.vx > M.PATADA * 0.9, "patada fuerte: " + q.balon.vx);
  // B: gira la dirección, barre el balón de lado y mantenerlo frena.
  const b = enJuego(partido());
  const t = b.robots[0];
  Object.assign(t, { x: 0, y: 0, fx: 1, fy: 0, vx: M.VMAX, vy: 0 });
  b.robots[1].x = -6;
  Object.assign(b.balon, { x: -5, y: -3 });
  ev = pasos(b, 1, (p: any) => p.robots.map((_: any, i: number) => (i === 0 ? { x: 0, y: 0, a: false, b: true } : NADA)));
  assert(ev.some((e: any) => e.tipo === "giro"));
  pasos(b, 8, (p: any) => p.robots.map((_: any, i: number) => (i === 0 ? { x: 0, y: 0, a: false, b: true } : NADA)));
  assert(Math.abs(t.fx - 1) > 0.1 || Math.abs(t.fy) > 0.1, "la dirección giró");
  assert(Math.hypot(t.vx, t.vy) < M.VMAX * 0.35, "frenó: " + Math.hypot(t.vx, t.vy));
  assert(t.recB > 0);
});

Deno.test("arena: choques entre robots y robot–balón (no se atraviesan)", () => {
  const p = enJuego(partido());
  const [a, b] = p.robots;
  Object.assign(a, { x: -1, y: 0 }); Object.assign(b, { x: 1, y: 0 });
  Object.assign(p.balon, { x: 0, y: 4 });
  pasos(p, 90, () => [{ x: 1, y: 0, a: false, b: false }, { x: -1, y: 0, a: false, b: false }]);
  assert(Math.hypot(a.x - b.x, a.y - b.y) >= 2 * M.R_ROBOT - 0.02, "no se enciman");
  // Robot que llega al balón quieto lo empuja.
  const q = enJuego(partido());
  Object.assign(q.robots[0], { x: -2, y: 0, fx: 1, fy: 0 }); q.robots[1].x = 6; q.robots[1].y = 3;
  Object.assign(q.balon, { x: 0, y: 0, vx: 0, vy: 0 });
  pasos(q, 40, () => [{ x: 1, y: 0, a: false, b: false }, NADA]);
  assert(q.balon.vx > 1, "lo empujó");
  assert(Math.hypot(q.balon.x - q.robots[0].x, q.balon.y - q.robots[0].y) >= M.R_ROBOT + M.R_BALON - 0.02);
});

Deno.test("arena: gol cuando el balón cruza la boca, grito, saque al centro y fin a N goles", () => {
  const p = enJuego(partido({ goles: 3 }));
  p.robots.forEach((r: any, i: number) => Object.assign(r, { x: -4, y: -3 + 2 * i }));
  Object.assign(p.balon, { x: 6, y: 0, vx: 10, vy: 0 });
  const ev = pasos(p, 30);
  const gol = ev.find((e: any) => e.tipo === "gol");
  assert(gol, "hubo gol");
  assertEquals([gol.eq, p.goles], [0, [1, 0]], "el equipo 0 ataca a la derecha");
  assertEquals(p.estado, "gol");
  const ev2 = pasos(p, Math.ceil((M.T_GOL + 0.1) * 60));
  assert(ev2.some((e: any) => e.tipo === "saque"));
  assertEquals(p.estado, "saque");
  assertEquals([p.balon.x, p.balon.y, p.balon.vx, p.balon.vy], [0, 0, 0, 0]);
  assert(p.robots[0].x < 0 && p.robots[1].x > 0, "cada quien en su mitad");
  // Durante el saque nadie se mueve.
  const x0 = p.robots[0].x;
  pasos(p, 20, (p: any) => p.robots.map(() => ({ x: 1, y: 0, a: true, b: false })));
  assertEquals(p.robots[0].x, x0);
  // Gol en contra (equipo 1) y llegar a 3 termina el partido.
  enJuego(p);
  for (let k = 0; k < 3; k++) {
    enJuego(p);
    p.robots.forEach((r: any, i: number) => Object.assign(r, { x: 4, y: -3 + 2 * i }));
    Object.assign(p.balon, { x: -6, y: 0.5, vx: -10, vy: 0 });
    pasos(p, Math.ceil((M.T_GOL + 0.5) * 60));
  }
  assertEquals(p.goles, [1, 3]);
  assertEquals(p.estado, "fin");
  assertEquals(p.ganador, 1);
});

Deno.test("arena: se acaba el tiempo; con empate hay gol de oro hasta 60 s y luego empate", () => {
  const p = enJuego(partido());
  p.goles = [2, 1];
  p.t = M.DURACION - 0.01;
  const ev = pasos(p, 3);
  assert(ev.some((e: any) => e.tipo === "fin"));
  assertEquals([p.estado, p.ganador], ["fin", 0]);
  const q = enJuego(partido());
  q.goles = [1, 1]; q.t = M.DURACION - 0.01;
  assert(pasos(q, 3).some((e: any) => e.tipo === "oro"));
  assertEquals([q.estado, q.oro], ["juego", true]);
  // Gol de oro: el siguiente gol gana.
  q.robots.forEach((r: any, i: number) => Object.assign(r, { x: -4, y: -3 + 2 * i }));
  Object.assign(q.balon, { x: 6, y: 0, vx: 10, vy: 0 });
  pasos(q, Math.ceil((M.T_GOL + 0.5) * 60));
  assertEquals([q.estado, q.ganador, q.goles], ["fin", 0, [2, 1]]);
  const e = enJuego(partido());
  e.goles = [0, 0]; e.t = M.DURACION + M.ORO - 0.01; e.oro = true;
  pasos(e, 3);
  assertEquals([e.estado, e.ganador], ["fin", -1], "empate");
});

// Jugador «de niña o niño» (equipo 0, ataca a la derecha): corre derecho al balón; si quedó del lado de la portería
// rival, primero se regresa un poco; aprieta A (sin buscar el mejor momento) cuando el balón le queda enfrente.
const nino = (p: any, i: number) => {
  const r = p.robots[i], b = p.balon;
  const tx = r.x > b.x - 0.3 ? b.x - 1.2 : b.x, ty = b.y;
  const dx = tx - r.x, dy = ty - r.y, d = Math.hypot(dx, dy) || 1, db = Math.hypot(b.x - r.x, b.y - r.y);
  return { x: dx / d, y: dy / d, a: db < 1.6 && b.x > r.x && p.pasos % 20 === 0, b: false };
};
function jugar(fA: (p: any, i: number) => any, fB: (p: any, i: number) => any, semilla: string, formato = "1v1") {
  const p = partido({ formato, goles: 3, semilla });
  let n = 0;
  while (p.estado !== "fin" && n++ < 60 * 60 * 5) M.paso(p, p.robots.map((r: any, i: number) => (r.eq === 0 ? fA(p, i) : fB(p, i))));
  return p.goles;
}

Deno.test("arena: IA — en Fácil una niña o un niño le gana; Difícil le gana a Fácil", () => {
  const semillas = ["a", "b", "c", "d", "e", "f", "g", "h"];
  let ninoGana = 0, dificilGana = 0;
  for (const s of semillas) {
    const g1 = jugar(nino, (p, i) => M.ia(p, i, "facil"), s);
    if (g1[0] > g1[1]) ninoGana++;
    const g2 = jugar((p, i) => M.ia(p, i, "dificil"), (p, i) => M.ia(p, i, "facil"), s);
    if (g2[0] > g2[1]) dificilGana++;
  }
  assert(ninoGana >= 6, "la niña o el niño gana " + ninoGana + " de 8 contra Fácil");
  assert(dificilGana >= 6, "Difícil gana " + dificilGana + " de 8 contra Fácil");
});

Deno.test("arena: IA — la entrada tiene la forma de una persona y en 2 vs 2 hay quien ataca y quien defiende", () => {
  const p = enJuego(partido({ formato: "2v2" }));
  const e = M.ia(p, 0, "medio");
  assertEquals(Object.keys(e).sort(), ["a", "b", "x", "y"]);
  assert(Math.hypot(e.x, e.y) <= 1 + 1e-9);
  Object.assign(p.balon, { x: 2, y: 1 });
  Object.assign(p.robots[0], { x: 1, y: 1 }); Object.assign(p.robots[1], { x: -6, y: 0 });
  assertEquals([M.rolIA(p, 0), M.rolIA(p, 1)], ["ataca", "defiende"]);
  // 3 vs 3: uno de medio.
  const q = enJuego(partido({ formato: "3v3", arena: "grande" }));
  assertEquals(q.robots.filter((r: any) => r.eq === 0).map((r: any) => M.rolIA(q, r.i)).sort(), ["ataca", "defiende", "medio"]);
});

Deno.test("arena: reparto parejo de equipos, equipo y color pedidos, bots al final", () => {
  const per = (id: string, x: any = {}) => ({ id, ...x });
  const bot = (id: string) => ({ id, bot: true });
  // 2 vs 2 con 2 personas y 2 bots: una persona por equipo.
  assertEquals(M.repartir([per("a"), per("b"), bot("x"), bot("y")], "2v2").map((l: any) => l.eq), [0, 1, 0, 1]);
  // Las dos piden el Sol: caben (2 por equipo) y los bots van al Mar.
  assertEquals(M.repartir([per("a", { equipo: 1 }), per("b", { equipo: 1 }), bot("x"), bot("y")], "2v2").map((l: any) => l.eq), [1, 1, 0, 0]);
  // Tres piden el Sol: la tercera no cabe y va al Mar.
  assertEquals(M.repartir([per("a", { equipo: 1 }), per("b", { equipo: 1 }), per("c", { equipo: 1 }), bot("x")], "2v2").map((l: any) => l.eq), [1, 1, 0, 0]);
  // 1 vs 2: quien crea va solo al Mar; las dos siguientes al Sol.
  assertEquals(M.repartir([per("a"), per("b"), per("c")], "1v2").map((l: any) => l.eq), [0, 1, 1]);
  // Colores: el pedido si está libre; si no, el primero libre. Número = lugar en la mesa.
  const r = M.repartir([per("a", { robot: 1 }), per("b", { robot: 2 }), per("c", { equipo: 0, robot: 1 }), bot("x")], "2v2");
  assertEquals(r.map((l: any) => [l.eq, l.color, l.num]), [[0, 1, 1], [1, 2, 2], [0, 0, 3], [1, 0, 4]]);
  // 3 vs 3: 3 y 3.
  const t = M.repartir([per("a"), per("b"), per("c"), bot("x"), bot("y"), bot("z")], "3v3");
  assertEquals([t.filter((l: any) => l.eq === 0).length, t.filter((l: any) => l.eq === 1).length], [3, 3]);
  assertEquals(new Set(t.map((l: any) => l.eq + ":" + l.color)).size, 6, "colores distintos");
});

Deno.test("arena: opciones de la sala, validación del resultado y puntos", () => {
  assertEquals(M.opcionesSala({}), { formato: "2v2", arena: "normal", goles: "5" });
  assertEquals(M.opcionesSala({ formato: "3v3", arena: "normal", goles: "7" }), { formato: "3v3", arena: "grande", goles: "7" }, "3 vs 3 siempre en la grande");
  assertEquals([M.opcionesSala({ formato: "5v5" }), M.opcionesSala({ arena: "luna" }), M.opcionesSala({ goles: "9" })], ["formato_invalido", "arena_invalida", "goles_invalidos"]);
  const inicio = 1_000_000;
  const ok = (g: number[], ms: number, ahora = inicio + 200_000) => M.validarResultado({ goles: g, ms }, 5, inicio, ahora);
  assertEquals(ok([3, 2], 120_000), { goles: [3, 2], ms: 120_000 });
  assertEquals(ok([5, 4], 180_000), { goles: [5, 4], ms: 180_000 });
  assertEquals(ok([6, 0], 180_000), null, "más que los goles de la sala");
  assertEquals(ok([4, 4], 15_000), null, "demasiados goles para 15 s");
  assertEquals(ok([0, 0], 3_000), null, "menos de 5 s");
  assertEquals(ok([1, 0], 400_000, inicio + 500_000), null, "más de 5 min");
  assertEquals(ok([1, 0], 120_000, inicio + 60_000), null, "más largo que lo que lleva la sala");
  assertEquals(M.validarResultado({ goles: [1, "2"], ms: 60_000 }, 5, inicio, inicio + 90_000), null);
  assertEquals(M.validarResultado({ goles: [1, 2], ms: 60_000, corte: true }, 5, inicio, inicio + 90_000), { goles: [1, 2], ms: 60_000, corte: true });
  // Puntos por equipo (como Fútbol Estelar) y contra la IA (por nivel).
  assertEquals([M.puntosEquipo(3, 1), M.puntosEquipo(2, 2), M.puntosEquipo(0, 5)], [460, 200, 0]);
  assertEquals(M.puntosEquipo(9, 0), 660);
  assert(M.puntosSolo(5, 0, "dificil") > M.puntosSolo(5, 0, "medio") && M.puntosSolo(5, 0, "medio") > M.puntosSolo(5, 0, "facil"));
  assert(M.puntosSolo(9, 0, "dificil") <= 1000);
  // Resultado de la sala: confirmado, disputa, invitado, pendiente; puntos por equipo solo a personas.
  const eq = { h: 0, i1: 1, i2: 0, i3: 1 };
  const rep = (id: string, g: number[]) => ({ id, arena: { goles: g, ms: 90_000 } });
  const c = M.resultadoSala("h", [rep("h", [3, 2]), rep("i1", [3, 2]), rep("i2", [3, 2]), { id: "i3" }], eq);
  assertEquals([c.estado, c.goles], ["confirmado", [3, 2]]);
  assertEquals(c.puntos, { h: 440, i1: 100, i2: 440, i3: 100 });
  assertEquals(M.resultadoSala("h", [rep("h", [3, 2]), rep("i1", [2, 2])], eq).estado, "disputa");
  assertEquals(M.resultadoSala("h", [rep("h", [3, 2]), rep("i1", [2, 2])], eq).goles, [3, 2]);
  const inv = M.resultadoSala("h", [{ id: "h" }, rep("i1", [0, 1])], eq);
  assertEquals([inv.estado, inv.goles], ["invitado", [0, 1]]);
  assertEquals(M.resultadoSala("h", [{ id: "h" }], eq), { estado: "pendiente", goles: null, puntos: {} });
});
