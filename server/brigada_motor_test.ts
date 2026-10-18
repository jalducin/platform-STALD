// Motor de «🦎 Brigada Xalli» (openspec: brigada-xalli, design.md §2–§7 y §10): física determinista de paso fijo,
// apuntado, armas, enemigos, rescates, vehículo, corazones y vidas, burbuja y revivir, puntos de control, cámara
// compartida con liga, jefes con patrones de semilla, puntos, estrellas, escalado, plausibilidad, avance y las 4
// misiones terminadas por el piloto automático.
// deno-lint-ignore-file no-explicit-any
import { assert, assertEquals } from "jsr:@std/assert@1";
import "../juegos/brigada-misiones.js";
import "../juegos/brigada-motor.js";

const g = globalThis as any;
const M = g.BrigadaMotor, MIS = g.BrigadaMisiones;
const QUIETO = { x: 0, y: 0, a: false, b: false, ga: false, gx: false, gy: false };
const ent = (o: Record<string, unknown> = {}) => ({ ...QUIETO, ...o });

// Nivel de prueba: suelo plano en 230, un escalón chico (+8) y uno alto (+30), una plataforma y nada más.
function plano(extra: Record<string, unknown> = {}) {
  return {
    id: 0, clave: "prueba", nombre: "Prueba", largo: 3000, tiempoMeta: 100,
    suelo: [[0, 600, 230], [600, 700, 222], [700, 800, 192], [800, 3000, 230]],
    plataformas: [[300, 400, 180]], puntosControl: [], enemigos: [], jaulas: [], objetos: [], vehiculos: [],
    minijefe: null, jefe: { x: 2520, tipo: "tractor" }, ...extra,
  };
}
const mision = (def: unknown, n = 1, semilla = "prueba") => M.crearMision({ def, personajes: Array.from({ length: n }, (_, i) => ({ personaje: M.PERSONAJES[i % 8] })), semilla });
function correr(m: any, pasos: number, f: (k: number) => any[] | any) {
  const ev: any[] = [];
  for (let k = 0; k < pasos; k++) {
    const e = f(k);
    ev.push(...M.paso(m, Array.isArray(e) ? e : [e]));
  }
  return ev;
}
const enJuego = (m: any) => { m.estado = "juego"; m.estT = 0; };

Deno.test("brigada: catálogo de misiones (4, en orden, con jefe y sin fosos)", () => {
  assertEquals(MIS.LISTA.map((x: any) => x.id), [1, 2, 3, 4]);
  for (const d of MIS.LISTA) {
    assert(d.jefe && d.jefe.x + M.W === d.largo, "arena del jefe al final de " + d.clave);
    let x = 0;
    for (const [x0, x1] of d.suelo) { assertEquals(x0, x, "suelo continuo en " + d.clave); x = x1; }
    assertEquals(x, d.largo);
    assert(d.enemigos.length >= 25 && d.jaulas.length >= 4, d.clave);
    if (d.id > 1) assert(d.minijefe, "minijefe desde la misión 2");
  }
  // Dificultad creciente: más enemigos y jefes con más vida.
  const vidaJefe = MIS.LISTA.map((d: any) => M.JEFES[d.jefe.tipo].hp);
  assert(vidaJefe.every((v: number, i: number) => i === 0 || v > vidaJefe[i - 1]), vidaJefe.join());
});

Deno.test("brigada: correr con inercia, salto variable, escalones y plataforma de un solo sentido", () => {
  const m = mision(plano()); enJuego(m);
  const p = m.jugadores[0];
  Object.assign(p, { x: 100, y: 230, vx: 0, vy: 0 });
  correr(m, 6, () => ent({ x: 1 }));
  assert(p.vx > 20 && p.vx < M.VEL, "acelera con inercia: " + p.vx);
  correr(m, 30, () => ent({ x: 1 }));
  assertEquals(Math.round(p.vx), M.VEL);
  correr(m, 40, () => ent());
  assertEquals(p.vx, 0, "frena hasta parar");
  // Salto largo (A mantenido) contra salto corto (A suelto pronto).
  const pico = (pasosA: number) => {
    const q = mision(plano()); enJuego(q);
    Object.assign(q.jugadores[0], { x: 150, y: 230 });
    let min = 230;
    correr(q, 80, (k) => { min = Math.min(min, q.jugadores[0].y); return ent({ a: k < pasosA, ga: k === 0 }); });
    return 230 - min;
  };
  const alto = pico(60), bajo = pico(4);
  assert(alto > 50 && alto < 64, "salto largo ≈ 57 px: " + alto);
  assert(bajo < alto * 0.6, "soltar A corta el salto: " + bajo);
  // Escalón de 8 px: se sube solo; el de 30 px es pared.
  Object.assign(p, { x: 580, y: 230, vx: 0, vy: 0 }); m.cam.x = 400;
  correr(m, 30, () => ent({ x: 1 }));
  assertEquals(p.y, 222, "sube el escalón chico");
  correr(m, 60, () => ent({ x: 1 }));
  assert(p.x < 700 - 6, "el escalón alto frena: " + p.x);
  // Plataforma de un solo sentido: se atraviesa desde abajo y se aterriza encima; ↓ + A la baja.
  m.cam.x = 200; Object.assign(p, { x: 350, y: 230, vx: 0, vy: 0, suelo: true, plat: -1 });
  correr(m, 70, (k) => ent({ a: true, ga: k === 0 }));
  assertEquals([p.y, p.suelo], [180, true], "aterriza en la plataforma");
  correr(m, 40, (k) => ent({ y: 1, a: k < 3, ga: k === 0 }));
  assertEquals(p.y, 230, "↓ + A baja de la plataforma");
});

Deno.test("brigada: apuntado de 8 direcciones (4 con toques) y agacharse", () => {
  assertEquals([M.apuntar(1, 0, 1, true), M.apuntar(0, -1, 1, true), M.apuntar(1, -1, 1, true), M.apuntar(-1, 0, 1, true), M.apuntar(0, 0, -1, true)], [0, 6, 7, 4, 4]);
  assertEquals(M.apuntar(1, 1, 1, false), 1, "diagonal abajo en el aire");
  assertEquals(M.apuntar(0, 1, 1, false), 2, "abajo en el aire");
  assertEquals(M.apuntar(0, 1, 1, true), 0, "en el suelo, ↓ dispara al frente (agachado)");
  assertEquals([M.apuntar(1, -0.9, 1, true, true), M.apuntar(0.9, -0.5, 1, true, true), M.apuntar(0.6, 0.9, 1, false, true)], [6, 0, 2], "con toques: 4 direcciones");
  const m = mision(plano()); enJuego(m);
  const p = m.jugadores[0];
  Object.assign(p, { x: 120, y: 230 });
  correr(m, 3, () => ent({ y: 1 }));
  assert(p.agachado && M.cajaJugador(p).h < 20, "agachado: caja baja");
});

Deno.test("brigada: armas — cadencia, munición, abanico, láser que atraviesa y globo de área", () => {
  const disparos = (arma: string, seg = 1) => {
    const m = mision(plano()); enJuego(m);
    const p = m.jugadores[0];
    Object.assign(p, { x: 100, y: 230, arma });
    if (arma !== "burbuja") p.mun[arma] = 500;
    const ev = correr(m, Math.round(seg * 60), () => ent({ b: true }));
    const ds = ev.filter((e) => e.tipo === "disparo");
    return { n: ds.length, balas: ds.length ? ds[0].balas : 0, p };
  };
  const b = disparos("burbuja"), r = disparos("rafaga"), a = disparos("abanico");
  assert(b.n >= 6 && b.n <= 7, "burbuja: " + b.n);
  assert(r.n >= 14 && r.n <= 15 && r.p.mun.rafaga === 500 - r.n, "ráfaga: " + r.n);
  assert(a.n === 3 && a.balas === 5, "abanico de 5: " + a.n + "/" + a.balas);
  // Se acaba la munición → vuelve al lanzaburbujas.
  const m = mision(plano()); enJuego(m);
  const p = m.jugadores[0];
  Object.assign(p, { x: 100, y: 230, arma: "rafaga" }); p.mun.rafaga = 3;
  correr(m, 30, () => ent({ b: true }));
  assertEquals([p.arma, p.mun.rafaga], ["burbuja", 0]);
  // Y cambia entre las armas con munición.
  p.mun.laser = 10; p.mun.abanico = 0;
  correr(m, 2, (k) => ent({ gy: k === 0 }));
  assertEquals(p.arma, "laser");
  // Láser: atraviesa a dos torretas en fila; burbuja: solo a la primera.
  const fila = (arma: string) => {
    const q = mision(plano()); enJuego(q);
    const j = q.jugadores[0];
    Object.assign(j, { x: 100, y: 230, arma }); j.mun.laser = 50;
    const e1 = M.ponerEnemigo(q, "torreta", 220, 230), e2 = M.ponerEnemigo(q, "torreta", 260, 230);
    correr(q, 26, (k) => ent({ b: k === 0 }));
    return [e1.hpMax - e1.hp, e2.hpMax - e2.hp];
  };
  assertEquals(fila("laser"), [2, 2]);
  assertEquals(fila("burbuja"), [1, 0]);
  // Globo: arco y daño 6 en 40 px.
  const q = mision(plano()); enJuego(q);
  const j = q.jugadores[0];
  Object.assign(j, { x: 100, y: 230, globos: 2 });
  const cerca = [M.ponerEnemigo(q, "escudobot", 190, 230), M.ponerEnemigo(q, "escudobot", 215, 230)], lejos = M.ponerEnemigo(q, "escudobot", 330, 230);
  const ev = correr(q, 90, (k) => ent({ gx: k === 0 }));
  assert(ev.some((e) => e.tipo === "globo"), "revienta el globo");
  assertEquals([cerca.map((e: any) => e.hpMax - e.hp), lejos.hpMax - lejos.hp, j.globos], [[6, 6], 0, 1]);
});

Deno.test("brigada: enemigos aparecen con la cámara, disparan, dan puntos y el Escudobot bloquea de frente", () => {
  const def = plano({ enemigos: [[700, "patrulla"], [900, "dron", 120], [1100, "torreta"], [1300, "saltabot"], [1500, "alien"]] });
  const m = mision(def); enJuego(m);
  assertEquals(M.contarEnemigos(m), 0);
  m.jugadores[0].x = 400; m.cam.x = 200;
  M.paso(m, [ent()]);
  assertEquals(M.contarEnemigos(m), 1, "la patrulla aparece al acercarse la cámara (x 700 ≤ 200 + 480 + 30)");
  // La patrulla dispara tuercas al acercarse; un golpe quita un corazón.
  const p = m.jugadores[0];
  const ev = correr(m, 300, () => ent());
  assert(ev.some((e) => e.tipo === "herido" && e.i === 0), "la tuerca quita un corazón");
  assert(p.cor < 3);
  // Derribar da puntos y explota en engranes.
  const q = mision(plano()); enJuego(q);
  Object.assign(q.jugadores[0], { x: 100, y: 230 });
  M.ponerEnemigo(q, "patrulla", 200, 230);
  const ev2 = correr(q, 60, () => ent({ b: true }));
  const boom = ev2.find((e) => e.tipo === "boom");
  assert(boom && boom.enemigo === "patrulla", "explota");
  assertEquals([q.jugadores[0].puntos, q.jugadores[0].robots], [M.ENEMIGOS.patrulla.puntos, 1]);
  // Escudobot: de frente bloquea; por arriba (disparo hacia abajo en el aire) sí le pega.
  const s = mision(plano()); enJuego(s);
  Object.assign(s.jugadores[0], { x: 100, y: 230, cor: 3 });
  const eb = M.ponerEnemigo(s, "escudobot", 180, 230); eb.dir = -1; eb.quieto = true;
  const ev3 = correr(s, 30, () => ent({ b: true }));
  assertEquals(eb.hp, eb.hpMax, "de frente no le pasa nada");
  assert(ev3.some((e) => e.tipo === "bloqueo"));
  Object.assign(s.jugadores[0], { x: 180, y: 140, vy: 0, suelo: false, inv: 5 });
  correr(s, 20, () => ent({ y: 1, b: true }));
  assert(eb.hp < eb.hpMax, "por arriba sí");
});

Deno.test("brigada: rescate en jaula, premios y vehículo Armadillo", () => {
  const m = mision(plano({ jaulas: [[220, "xolito"]], vehiculos: [[500]] })); enJuego(m);
  const p = m.jugadores[0];
  Object.assign(p, { x: 100, y: 230 });
  const ev = correr(m, 40, () => ent({ b: true }));
  const r = ev.find((e) => e.tipo === "rescate");
  assert(r && r.animal === "xolito", "rescate");
  assertEquals([p.puntos, p.rescates], [500, 1]);
  assert(M.contarObjetos(m) === 1, "suelta un premio");
  correr(m, 120, () => ent({ x: 1 }));
  assert(ev.length && p.rescates === 1);
  assert(p.puntos >= 550, "recoger el premio suma 50: " + p.puntos);
  // Vehículo: se sube al tocarlo, dispara confeti de 4, absorbe golpes y se baja con X.
  Object.assign(p, { x: 470, y: 230, vx: 0 });
  correr(m, 30, () => ent({ x: 0.5 }));
  assert(p.vehiculo >= 0, "se sube al Armadillo");
  const t = M.ponerEnemigo(m, "torreta", p.x + 90, 230);
  correr(m, 20, (k) => ent({ b: k === 0 }));
  assertEquals(t.hpMax - t.hp, 4, "bola de confeti de 4");
  const v = m.vehiculos[p.vehiculo], cor = p.cor;
  M.herir(m, 0);
  assertEquals([v.hp, p.cor], [M.VIDA_VEHICULO - 1, cor], "el golpe lo absorbe el vehículo");
  correr(m, 3, (k) => ent({ gx: k === 0 }));
  assertEquals(p.vehiculo, -1, "X lo baja");
});

Deno.test("brigada: corazones, vidas, misión fallida y reintento desde el punto de control", () => {
  const m = mision(plano({ puntosControl: [800] })); enJuego(m);
  const p = m.jugadores[0];
  Object.assign(p, { x: 820, y: 230 }); m.cam.x = 620;
  M.paso(m, [ent()]);
  assertEquals(m.cp, 0, "punto de control alcanzado");
  for (let v = 0; v < 3; v++) {
    for (let k = 0; k < 3; k++) { p.inv = 0; M.herir(m, 0); }
    assertEquals(p.vidas, 2 - v);
    correr(m, 200, () => ent());
  }
  assertEquals(m.estado, "fallida", "solo y sin vidas: misión fallida");
  M.reintentar(m);
  assertEquals([m.estado, m.reintentos, p.vidas, p.cor, p.estado], ["juego", 1, 3, 3, "vivo"]);
  assert(p.x > 600 && p.x < 900 && m.cam.x <= 800, "desde el punto de control: " + p.x);
});

Deno.test("brigada: en equipo, sin vidas queda en burbuja y un compañero lo revive", () => {
  const m = mision(plano(), 2); enJuego(m);
  const [a, b] = m.jugadores;
  Object.assign(a, { x: 200, y: 230 }); Object.assign(b, { x: 260, y: 230 });
  b.vidas = 1;
  for (let k = 0; k < 3; k++) { b.inv = 0; M.herir(m, 1); }
  correr(m, 90, () => [ent(), ent()]);
  assertEquals(b.estado, "burbuja");
  assert(m.estado === "juego", "el equipo sigue");
  // A va hacia la burbuja y la toca.
  let ev: any[] = [];
  for (let k = 0; k < 400 && b.estado !== "vivo"; k++) ev = ev.concat(M.paso(m, [ent({ x: Math.sign(b.x - a.x) || 0.01, y: 0 }), ent()]));
  assertEquals([b.estado, b.vidas], ["vivo", 1]);
  assert(ev.some((e) => e.tipo === "revive" && e.i === 1));
  // Todos en burbuja → falla el equipo.
  const q = mision(plano(), 2); enJuego(q);
  q.jugadores.forEach((j: any, i: number) => { j.vidas = 1; for (let k = 0; k < 3; k++) { j.inv = 0; M.herir(q, i); } });
  correr(q, 120, () => [ent(), ent()]);
  assertEquals(q.estado, "fallida");
});

Deno.test("brigada: cámara compartida que no regresa, ventana para todos y liga", () => {
  const m = mision(plano(), 2); enJuego(m);
  const [a, b] = m.jugadores;
  Object.assign(a, { x: 100, y: 230 }); Object.assign(b, { x: 100, y: 230 });
  correr(m, 240, () => [ent({ x: 1 }), ent()]);
  assert(m.cam.x > 0 && b.x >= m.cam.x + 6, "el de atrás sigue en la ventana");
  assert(a.x <= m.cam.x + M.W - 6, "el de adelante no sale de la ventana");
  const camAntes = m.cam.x;
  correr(m, 120, () => [ent({ x: -1 }), ent({ x: -1 })]);
  assertEquals(m.cam.x, camAntes, "la cámara no regresa");
  // Liga: B se queda quieto atrás y A empuja el borde 3 s → B salta junto al grupo.
  const bAntes = b.x;
  const ev = correr(m, 60 * 6, () => [ent({ x: 1 }), ent()]);
  const junto = b.x - bAntes;
  assert(ev.some((e) => e.tipo === "liga" && e.i === 1), "¡Jalón!");
  assert(junto > 150, "B avanzó con el grupo: " + junto);
});

Deno.test("brigada: jefes con patrones de semilla (misma semilla → mismas fases) y la cámara fija", () => {
  for (const tipo of Object.keys(M.JEFES)) {
    const fases = (semilla: string) => {
      const def = plano({ jefe: { x: 2520, tipo } });
      const m = mision(def, 1, semilla); enJuego(m);
      Object.assign(m.jugadores[0], { x: 2560, y: 230, inv: 1e9 });
      m.cam.x = 2400;
      const lista: string[] = [];
      for (let k = 0; k < 60 * 40; k++) {
        M.paso(m, [ent()]);
        m.jugadores[0].inv = 1e9; m.jugadores[0].cor = 3;
        if (m.jefe && lista.at(-1) !== m.jefe.fase) lista.push(m.jefe.fase);
      }
      return { lista, cam: m.cam.x, estado: m.estado };
    };
    const a = fases("uno"), b = fases("uno"), c = fases("otra-semilla");
    assertEquals(a.lista, b.lista, tipo + ": determinista");
    assert(a.lista.length >= 6, tipo + ": cambia de fase " + a.lista.join(","));
    assert(new Set(a.lista).size >= 3, tipo + ": al menos 3 ataques distintos");
    assert(JSON.stringify(a.lista) !== JSON.stringify(c.lista), tipo + ": otra semilla, otro orden");
    assertEquals([a.cam, a.estado], [2520, "jefe"], tipo + ": cámara fija en la arena");
  }
});

Deno.test("brigada: puntos, bono de tiempo, estrellas, escalado y máximo plausible", () => {
  assertEquals([M.puntosRanking(0), M.puntosRanking(10_000), M.puntosRanking(99_999)], [0, 500, 1000]);
  assertEquals([M.escala(1).enemigo, M.escala(1).jefe], [1, 1]);
  assert(M.escala(8).enemigo > 2 && M.escala(8).jefe > 4);
  assertEquals([M.copiasExtra(0, 1), M.copiasExtra(0, 8), M.copiasExtra(3, 8)], [0, 1, 0]);
  for (const d of MIS.LISTA) assert(M.puntosMaximos(d.id, 8) >= M.puntosMaximos(d.id, 1) && M.puntosMaximos(d.id, 1) > 10_000);
  const m = mision(plano({ jaulas: [[2000, "conejo"]] }));
  m.estado = "cumplida"; m.reintentos = 0; m.completadaEn = 50;
  assertEquals(M.estrellas(m), 2, "sin rescatar a todos: 2");
  m.jaulas[0].abierta = true;
  assertEquals(M.estrellas(m), 3);
  m.reintentos = 1;
  assertEquals(M.estrellas(m), 2);
  m.estado = "juego";
  assertEquals(M.estrellas(m), 0);
  assertEquals(M.bonoTiempo(100, 40), 600);
  assertEquals(M.bonoTiempo(100, 140), 0);
});

// Piloto automático: todas las misiones se pueden terminar (1, 4 y 8 personajes; varias semillas).
function autopiloto(id: number, n: number, semilla: string, maxSeg = 900) {
  const m = M.crearMision({ mision: id, personajes: Array.from({ length: n }, (_, i) => ({ personaje: M.PERSONAJES[i % 8], ia: true })), semilla });
  let reintentos = 0;
  for (let k = 0; k < maxSeg * 60 && m.estado !== "cumplida"; k++) {
    if (m.estado === "fallida") { reintentos++; M.reintentar(m); }
    M.paso(m, m.jugadores.map((_: any, i: number) => M.ia(m, i)));
  }
  return { m, reintentos };
}
for (const id of [1, 2, 3, 4]) {
  Deno.test(`brigada: el piloto automático termina la misión ${id} (1, 4 y 8 personajes)`, () => {
    for (const [n, semilla] of [[1, "a"], [1, "b"], [4, "c"], [8, "d"]] as const) {
      const { m, reintentos } = autopiloto(id, n, semilla);
      assertEquals(m.estado, "cumplida", `misión ${id} con ${n} (${semilla}): ${m.estado} en x=${Math.round(m.jugadores[0].x)} cam=${Math.round(m.cam.x)} reintentos=${reintentos}`);
      const total = m.jugadores.reduce((s: number, j: any) => s + j.puntos, 0);
      assert(m.jugadores.every((j: any) => j.puntos <= M.puntosMaximos(id, n)), "puntos plausibles");
      assert(total > 3000, `misión ${id}: ${total} puntos`);
      assert(reintentos <= 3, `misión ${id} con ${n}: ${reintentos} reintentos`);
    }
  });
}

Deno.test("brigada: misma semilla y entradas → misma misión (huella)", () => {
  const huella = () => {
    const { m } = autopiloto(2, 4, "huella", 400);
    return JSON.stringify([m.t.toFixed(3), m.jugadores.map((j: any) => [Math.round(j.x), j.puntos, j.vidas]), m.reintentos, m.estado]);
  };
  assertEquals(huella(), huella());
});

Deno.test("brigada: avance — vacío válido, registrar misión, desbloqueo y formas inválidas", () => {
  const v = M.progresoVacio();
  assert(M.validarProgreso(v));
  assertEquals([v.ver, v.desbloqueada, v.personaje, v.companeros], [1, 1, "xalli", 0]);
  const p1 = M.registrarMision(v, { mision: 1, puntos: 9000, ms: 140_000, estrellas: 2, robots: 30, rescatados: 4, completada: true });
  assert(M.validarProgreso(p1));
  assertEquals([p1.desbloqueada, p1.misiones["1"].record, p1.misiones["1"].estrellas, p1.totales.completadas], [2, 9000, 2, 1]);
  const p2 = M.registrarMision(p1, { mision: 1, puntos: 7000, ms: 120_000, estrellas: 3, robots: 10, rescatados: 1, completada: true });
  assertEquals([p2.misiones["1"].record, p2.misiones["1"].estrellas, p2.misiones["1"].mejorMs, p2.totales.robots], [9000, 3, 120_000, 40], "se queda lo mejor de cada cosa");
  const p3 = M.registrarMision(p2, { mision: 2, puntos: 100, ms: 30_000, estrellas: 0, robots: 3, rescatados: 0, completada: false });
  assertEquals([p3.desbloqueada, p3.misiones["2"].estrellas, p3.misiones["2"].mejorMs], [2, 0, null], "sin terminar no desbloquea ni guarda tiempo");
  const malos = [
    { ...p1, ver: 2 }, { ...p1, extra: 1 }, { ...p1, desbloqueada: 5 }, { ...p1, personaje: "mario" }, { ...p1, companeros: 2 },
    { ...p1, misiones: { ...p1.misiones, "3": { estrellas: 1, record: 10, mejorMs: 60_000 } } }, // misión bloqueada
    { ...p1, misiones: { "1": { estrellas: 1, record: M.puntosMaximos(1, 8) + 1, mejorMs: 60_000 } } }, // récord imposible
    { ...p1, misiones: { "1": { estrellas: 4, record: 10, mejorMs: 60_000 } } },
    { ...p1, misiones: { "1": { estrellas: 1, record: 10, mejorMs: 5 } } },
    { ...v, misiones: { "1": { estrellas: 1, record: 10, mejorMs: 60_000 } } }, // completó la 1 pero la 2 no está desbloqueada
    { ...p1, totales: { robots: -1, rescatados: 0, completadas: 0 } },
  ];
  malos.forEach((x, i) => assertEquals(M.validarProgreso(x), false, "inválido " + i));
});
