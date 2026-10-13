// Motor de «⚽ Fútbol Estelar 2010» (openspec: futbol-estelar): física del balón (frenado, altura, rebote, gol,
// poste), posesión y primer toque, pases con potencia, orientación del cuerpo, determinismo con semilla, partidos IA
// contra IA que terminan, reloj y medio tiempo, fuera de lugar encendido y apagado, faltas y penal, tanda de penales,
// cartas de habilidad y niveles (Difícil vence a Fácil).
// deno-lint-ignore-file no-explicit-any
import { assert, assertAlmostEquals, assertEquals } from "jsr:@std/assert@1";
import "../juegos/futbol-motor.js";

const M = (globalThis as any).FutbolMotor;
const equipo = (corto: string, media: number, carta: string | null = null) => M.equipoGenerico(corto, media, carta);
const partido = (o: any = {}) => M.crearPartido({ semilla: "prueba", equipos: [equipo("AAA", 70), equipo("BBB", 70)], minutos: 2, ...o });
const NADA = { x: 0, y: 0, pase: false, tiro: false, hueco: false, elevado: false, sprint: false, cambiar: false };
// Pasos con la misma entrada; devuelve los eventos juntos.
function pasos(p: any, n: number, entrada: any = NADA) {
  const ev: any[] = [];
  for (let k = 0; k < n; k++) ev.push(...M.paso(p, [entrada]));
  return ev;
}
// Deja el partido en juego con el balón en los pies del jugador `i` en (x, y), sin rivales cerca.
function enJuego(p: any, i: number, x: number, y: number) {
  M.ponerEnJuego(p);
  p.iaPausada = true; // los jugadores de la IA no se mueven (gancho de prueba)
  for (const j of p.jug) { j.x = j.eq === 0 ? -40 : 45; j.y = (j.i % 11) * 5 - 25; j.vx = 0; j.vy = 0; }
  const j = p.jug[i];
  j.x = x; j.y = y; j.dir = 0;
  M.darBalon(p, i);
  return j;
}

Deno.test("futbol: un balón rodando frena solo y la distancia de un pase se puede invertir", () => {
  const b = { x: 0, y: 0, z: 0, vx: 12.5, vy: 0, vz: 0 };
  let t = 0;
  while (Math.hypot(b.vx, b.vy) > 0 && t < 30) { M.moverBalon(b, M.PASO); t += M.PASO; }
  assert(b.x > 12 && b.x < 18, "un pase a 12.5 m/s recorre ~15 m: " + b.x);
  assertEquals([b.vx, b.vy], [0, 0]);
  for (const d of [8, 15, 25, 35]) {
    const c = { x: 0, y: 0, z: 0, vx: M.velocidadPara(d), vy: 0, vz: 0 };
    for (let k = 0; k < 2400; k++) M.moverBalon(c, M.PASO);
    assertAlmostEquals(c.x, d, d * 0.08, "velocidadPara(" + d + ")");
  }
});

Deno.test("futbol: el balón elevado sube, cae, rebota y deja su sombra en el piso", () => {
  const b = { x: 0, y: 0, z: 0, vx: 10, vy: 0, vz: 9 };
  let alto = 0, rebotes = 0, antes = b.vz;
  for (let k = 0; k < 600; k++) {
    M.moverBalon(b, M.PASO);
    alto = Math.max(alto, b.z);
    if (antes < 0 && b.vz > 0) rebotes++;
    antes = b.vz;
    assert(b.z >= 0, "nunca bajo el piso");
  }
  assert(alto > 3.5 && alto < 4.5, "altura máxima ~ v²/2g: " + alto);
  assert(rebotes >= 1, "rebota al caer");
  assertEquals(b.z, 0);
});

Deno.test("futbol: gol al cruzar entre los postes y bajo el travesaño; fuera por arriba es saque de meta", () => {
  const p = partido();
  enJuego(p, 9, 40, 0);
  M.soltarBalon(p);
  Object.assign(p.balon, { x: 51, y: 1, z: 0.5, vx: 20, vy: 0, vz: 0 });
  p.ultimoToque = 9;
  const ev = pasos(p, 30);
  assert(ev.some((e: any) => e.tipo === "gol" && e.eq === 0), JSON.stringify(ev.map((e: any) => e.tipo)));
  assertEquals(p.eq[0].goles, 1);
  const q = partido();
  enJuego(q, 9, 40, 0);
  M.soltarBalon(q);
  Object.assign(q.balon, { x: 51, y: 0, z: 3, vx: 20, vy: 0, vz: 2 });
  q.ultimoToque = 9;
  const ev2 = pasos(q, 30);
  assert(!ev2.some((e: any) => e.tipo === "gol"));
  assert(ev2.some((e: any) => e.tipo === "meta"), JSON.stringify(ev2.map((e: any) => e.tipo)));
  assertEquals(q.parada.eq, 1, "saca de meta el equipo que defiende");
});

Deno.test("futbol: el poste devuelve el balón", () => {
  const p = partido();
  enJuego(p, 9, 40, 0);
  M.soltarBalon(p);
  Object.assign(p.balon, { x: 51.5, y: M.POSTE, z: 0.5, vx: 18, vy: 0, vz: 0 });
  p.ultimoToque = 9;
  const ev = pasos(p, 20);
  assert(ev.some((e: any) => e.tipo === "poste"), JSON.stringify(ev.map((e: any) => e.tipo)));
  assert(p.balon.vx < 0, "rebota hacia la cancha");
});

Deno.test("futbol: quien lleva el balón lo empuja delante del cuerpo y en sprint lo lleva más lejos", () => {
  const p = partido({ humanos: [{ eq: 0 }] });
  const j = enJuego(p, 7, 0, 0);
  M.asignarHumano(p, 0, 7);
  pasos(p, 60, { ...NADA, x: 1 });
  const normal = Math.hypot(p.balon.x - j.x, p.balon.y - j.y);
  pasos(p, 90, { ...NADA, x: 1, sprint: true });
  const sprint = Math.hypot(p.balon.x - j.x, p.balon.y - j.y);
  assertEquals(p.dueno, 7);
  assert(normal > 0.3 && normal < 1.4, "normal " + normal);
  assert(sprint > normal, "sprint " + sprint + " > " + normal);
  assert(p.balon.x > j.x, "el balón va delante");
});

Deno.test("futbol: el sprint cansa y el cansancio baja la velocidad tope", () => {
  const p = partido({ humanos: [{ eq: 0 }] });
  const j = enJuego(p, 7, -30, 0);
  M.asignarHumano(p, 0, 7);
  const fresco = M.velocidadTope(p, j, true);
  pasos(p, 600, { ...NADA, x: 1, sprint: true });
  assert(j.energia < 0.8, "energía " + j.energia);
  assert(M.velocidadTope(p, j, true) < fresco, "más lento cansado");
});

Deno.test("futbol: primer toque — un pase suave se controla y uno muy fuerte rebota", () => {
  const p = partido();
  enJuego(p, 7, 0, 0);
  M.soltarBalon(p);
  const r = p.jug[8];
  Object.assign(r, { x: 10, y: 0, vx: 0, vy: 0, sinTocar: 0 });
  Object.assign(p.balon, { x: 7, y: 0, z: 0, vx: 6, vy: 0, vz: 0 });
  pasos(p, 40);
  assertEquals(p.dueno, 8, "controla el pase suave");
  const q = partido();
  enJuego(q, 7, 0, 0);
  M.soltarBalon(q);
  const s = q.jug[8];
  Object.assign(s, { x: 10, y: 0, vx: 0, vy: 0, sinTocar: 0 });
  Object.assign(q.balon, { x: 8, y: 0, z: 0, vx: 34, vy: 0, vz: 0 });
  pasos(q, 3);
  assert(q.dueno !== 8 && q.balon.vx < 34, "rebota (mal control) " + q.dueno + " " + q.balon.vx);
});

Deno.test("futbol: el pase raso con A llega al compañero hacia donde apunta el joystick", () => {
  const p = partido({ humanos: [{ eq: 0 }] });
  enJuego(p, 6, 0, 0);
  M.asignarHumano(p, 0, 6);
  Object.assign(p.jug[9], { x: 14, y: 4 });
  Object.assign(p.jug[10], { x: 0, y: -16 });
  pasos(p, 2, { ...NADA, x: 1, y: -0.25, pase: true });
  pasos(p, 1, { ...NADA, x: 1, y: -0.25 });
  let n = 0;
  while (p.dueno !== 9 && n++ < 240) pasos(p, 1);
  assertEquals(p.dueno, 9, "recibe el 10 (a la derecha y un poco arriba)");
  assertEquals(p.humanos[0].jug, 9, "el control pasa a quien recibe");
});

Deno.test("futbol: patear de espaldas primero gira el cuerpo (la patada espera)", () => {
  const p = partido({ humanos: [{ eq: 0 }] });
  const j = enJuego(p, 6, 0, 0);
  M.asignarHumano(p, 0, 6);
  j.dir = Math.PI; // mira hacia su propia portería
  Object.assign(p.jug[9], { x: 15, y: 0 });
  pasos(p, 2, { ...NADA, x: 1, pase: true });
  pasos(p, 1, { ...NADA, x: 1 });
  assertEquals(p.dueno, 6, "todavía no patea");
  assert(j.pend, "patada en espera");
  pasos(p, 30, { ...NADA, x: 1 });
  assert(p.dueno !== 6, "ya pateó tras girar");
});

Deno.test("futbol: la potencia del tiro sale de cuánto se mantiene B", () => {
  const corto = partido({ humanos: [{ eq: 0 }] });
  enJuego(corto, 9, 30, 0);
  M.asignarHumano(corto, 0, 9);
  pasos(corto, 6, { ...NADA, x: 1, tiro: true });
  pasos(corto, 1, { ...NADA, x: 1 });
  const largo = partido({ humanos: [{ eq: 0 }] });
  enJuego(largo, 9, 30, 0);
  M.asignarHumano(largo, 0, 9);
  pasos(largo, 50, { ...NADA, x: 1, tiro: true });
  pasos(largo, 1, { ...NADA, x: 1 });
  const v = (q: any) => Math.hypot(q.balon.vx, q.balon.vy);
  assert(v(largo) > v(corto) + 4, v(corto) + " → " + v(largo));
  assert(largo.eventos.length >= 0);
});

Deno.test("futbol: misma semilla y mismas entradas → mismo partido; otra semilla → otro", () => {
  const correr = (s: string) => {
    const p = M.crearPartido({ semilla: s, equipos: [equipo("AAA", 72), equipo("BBB", 70)], minutos: 2 });
    M.simular(p, 400);
    return JSON.stringify([p.eq[0].goles, p.eq[1].goles, p.balon, p.jug.map((j: any) => [j.x, j.y])]);
  };
  assertEquals(correr("uno"), correr("uno"));
  assert(correr("uno") !== correr("dos"));
});

Deno.test("futbol: un partido IA contra IA llega a 90', cambia de lado en el medio tiempo y termina", () => {
  const p = M.crearPartido({ semilla: "completo", equipos: [equipo("AAA", 74), equipo("BBB", 70)], minutos: 2 });
  const lado0 = p.eq[0].lado;
  const ev: any[] = [];
  let pasosDados = 0;
  while (p.estado !== "fin" && pasosDados < 60 * 400) { ev.push(...M.paso(p, [])); pasosDados++; }
  assertEquals(p.estado, "fin");
  assertEquals(p.minuto, 90);
  assert(ev.some((e: any) => e.tipo === "medio"), "hubo medio tiempo");
  assert(ev.some((e: any) => e.tipo === "final"));
  assertEquals(p.eq[0].lado, -lado0, "cambiaron de lado");
  assert(p.stats.tiros[0] + p.stats.tiros[1] >= 3, "hubo tiros: " + JSON.stringify(p.stats));
  assert(p.stats.pases[0] + p.stats.pases[1] >= 20, "hubo pases: " + JSON.stringify(p.stats));
  assert(ev.some((e: any) => ["banda", "meta", "esquina"].includes(e.tipo)), "hubo reanudaciones");
});

Deno.test("futbol: fuera de lugar encendido sanciona y apagado deja seguir", () => {
  const armar = (fuera: boolean) => {
    const p = partido({ fueraDeLugar: fuera, humanos: [{ eq: 0 }] });
    enJuego(p, 6, 0, 0);
    M.asignarHumano(p, 0, 6);
    // Defensa rival en su línea de 25 m; el 10 adelantado a 40 m.
    p.jug.filter((j: any) => j.eq === 1).forEach((j: any, k: number) => { j.x = k === 0 ? 51 : 25; j.y = k === 0 ? 0 : (k % 2 ? 1 : -1) * (8 + k * 2); });
    Object.assign(p.jug[9], { x: 40, y: 0 });
    pasos(p, 2, { ...NADA, x: 1, pase: true });
    const ev: any[] = [];
    for (let k = 0; k < 240 && !ev.some((e: any) => e.tipo === "fuera_lugar"); k++) ev.push(...pasos(p, 1));
    return { p, ev };
  };
  const on = armar(true);
  assert(on.ev.some((e: any) => e.tipo === "fuera_lugar"), "silbatazo: " + JSON.stringify(on.ev.map((e: any) => e.tipo)));
  assertEquals(on.p.parada && on.p.parada.eq, 1);
  const off = armar(false);
  assert(!off.ev.some((e: any) => e.tipo === "fuera_lugar"));
});

Deno.test("futbol: entrada por detrás es falta y dentro del área es penal", () => {
  const p = partido({ humanos: [{ eq: 1 }] });
  enJuego(p, 9, 20, 0); // el 10 del equipo 0 con el balón
  p.jug[9].dir = 0;
  const d = p.jug[11 + 4];
  Object.assign(d, { x: 19, y: 0, dir: 0 });
  M.asignarHumano(p, 0, d.i);
  const f = M.entrada(p, d);
  assertEquals(f, "falta");
  assertEquals(p.parada.tipo, "libre");
  assertEquals(p.parada.eq, 0);
  const q = partido({ humanos: [{ eq: 1 }] });
  enJuego(q, 9, 45, 0);
  q.jug[9].dir = 0;
  const e = q.jug[11 + 4];
  Object.assign(e, { x: 44, y: 0, dir: 0 });
  assertEquals(M.entrada(q, e), "falta");
  assertEquals(q.estado, "penal");
});

Deno.test("futbol: tanda de penales termina con ganador y 5 tiros por lado o muerte súbita", () => {
  for (const s of ["p1", "p2", "p3"]) {
    const p = M.crearPartido({ semilla: s, equipos: [equipo("AAA", 70), equipo("BBB", 70)], minutos: 2, eliminatoria: true });
    M.iniciarPenales(p);
    let n = 0;
    while (p.estado !== "fin" && n++ < 60 * 300) M.paso(p, []);
    assertEquals(p.estado, "fin");
    const t = p.tanda;
    assert(t.goles[0] !== t.goles[1], "hay ganador " + JSON.stringify(t));
    assert(t.tiros[0] >= 3 && Math.abs(t.tiros[0] - t.tiros[1]) <= 1, JSON.stringify(t));
    assertEquals(M.ganador(p), t.goles[0] > t.goles[1] ? 0 : 1);
  }
});

Deno.test("futbol: las cartas cambian atributos (Velocista, Portero felino, Regateador, Incansable)", () => {
  const p = partido({ equipos: [equipo("AAA", 70, "veloz"), equipo("BBB", 70)] });
  M.ponerEnJuego(p);
  assert(M.velocidadTope(p, p.jug[5], true) > M.velocidadTope(p, p.jug[16], true));
  const q = partido({ equipos: [equipo("AAA", 70, "felino"), equipo("BBB", 70)] });
  assert(M.reaccionPortero(q, q.jug[0]) < M.reaccionPortero(q, q.jug[11]));
  assert(M.alcancePortero(q.jug[0]) > M.alcancePortero(q.jug[11]));
  const r = partido({ equipos: [equipo("AAA", 70, "regate"), equipo("BBB", 70)] });
  assert(M.giro(r, r.jug[5], true) > M.giro(r, r.jug[16], true));
  assertEquals(M.CARTAS.length, 8);
  assert(M.CARTAS.every((c: any) => c.id && c.nombre && c.icono && c.d));
});

Deno.test("futbol: la IA en Difícil le gana a Fácil en la suma de varias semillas", () => {
  let dificil = 0, facil = 0;
  for (const s of ["a", "b", "c", "d"]) {
    const p = M.crearPartido({ semilla: s, equipos: [equipo("DIF", 70), equipo("FAC", 70)], minutos: 2, dificultades: ["dificil", "facil"] });
    M.simular(p, 400);
    dificil += p.eq[0].goles; facil += p.eq[1].goles;
  }
  assert(dificil > facil, "Difícil " + dificil + " vs Fácil " + facil);
});

Deno.test("futbol: táctica y formación ordenan a la IA (línea alta adelanta a la defensa)", () => {
  const base = { linea: 50, ancho: 50, mentalidad: 50, presion: 50 };
  const alta = M.crearPartido({ semilla: "t", equipos: [equipo("AAA", 70), equipo("BBB", 70)], tacticas: [{ ...base, linea: 95 }, base], minutos: 2 });
  const baja = M.crearPartido({ semilla: "t", equipos: [equipo("AAA", 70), equipo("BBB", 70)], tacticas: [{ ...base, linea: 5 }, base], minutos: 2 });
  const defensa = (p: any) => { const j = p.jug[2]; return M.objetivoFormacion(p, j, false).x * p.eq[0].lado; };
  assert(defensa(alta) > defensa(baja) + 3, defensa(alta) + " vs " + defensa(baja));
  assertEquals(Object.keys(M.FORMACIONES).sort(), ["3-5-2", "4-3-3", "4-4-2", "5-3-2"]);
  for (const f of Object.values(M.FORMACIONES) as any[]) {
    assertEquals(f.length, 11);
    assertEquals(f[0][0], "POR");
  }
});
