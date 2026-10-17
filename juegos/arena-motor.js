// Motor de «⚽ Futbolito Arena» (openspec: futbolito-arena, design.md §2, §3, §6 y §9). Sin DOM: lo cargan
// juegos/futbolito-arena.html, la página de Juegos (reparto de equipos en la sala de espera), el servidor
// (server/arena.ts: opciones, equipos, validación del resultado y puntos) y las pruebas de Deno
// (server/arena_motor_test.ts).
//   - Física de paso fijo (1/60 s) solo con + − × ÷ y Math.sqrt (sin trigonometría): misma semilla y mismas
//     entradas dan el mismo partido en cualquier navegador.
//   - Arena octagonal con paredes que rebotan; las porterías son la boca de las paredes cortas (x = ±L/2).
//   - Robots redondos que se mueven con el joystick; A = embestida/patada y B = giro/freno, cada uno con recarga.
//   - IA que produce la misma entrada que una persona ({ x, y, a, b }).
(function (g) {
  'use strict';
  const PASO = 1 / 60;
  const ARENAS = { normal: { L: 16, A: 10, c: 2.4, G: 3.2 }, grande: { L: 22, A: 14, c: 3.2, G: 4.2 } };
  const FORMATOS = { '1v1': [1, 1], '1v2': [1, 2], '2v2': [2, 2], '3v3': [3, 3] };
  const GOLES = ['3', '5', '7'];
  const R_ROBOT = 0.55, R_BALON = 0.28;
  const VMAX = 5, ACEL = 18, FRENO = 30, ROT = 12, MUERTA = 0.12;
  const DASH_V = 9.5, T_DASH = 0.22, T_GOLPE = 0.3, RECARGA_A = 1.1, PATADA = 12, ALCANCE = 0.35;
  const T_GIRO = 0.4, RECARGA_B = 0.9, BARRIDA = 7;
  const FRICCION = 0.55, VBALON_MAX = 16, REB_PARED = 0.85, REB_ROBOT = 0.35, REB_ROBOT_PARED = 0.35, REB_ROBOTS = 0.4;
  const RED = 0.9; // fondo de la portería, detrás de la línea
  const T_SAQUE = 1.2, T_GOL = 1.6, DURACION = 180, ORO = 60;
  const GIRO_C = 0.9659258262890683, GIRO_S = 0.25881904510252074; // cos y sen de 15° (giro por paso, sin trigonometría)
  // 🌊 Mar (ataca a la derecha) y 🔥 Sol; tres colores de robot por equipo.
  const EQUIPOS = [{ nombre: 'Mar', emoji: '🌊', color: '#0ea5e9' }, { nombre: 'Sol', emoji: '🔥', color: '#f59e0b' }];
  const COLORES = [['#14b8a6', '#3b82f6', '#8b5cf6'], ['#facc15', '#ef4444', '#f97316']];
  const NOMBRES_COLOR = [['Turquesa', 'Azul', 'Morado'], ['Amarillo', 'Rojo', 'Naranja']];
  // vel: fracción de la velocidad; cada: pasos entre decisiones; err: error de puntería (u); pA/pB: ganas de embestir y barrer.
  const NIVELES = {
    facil: { vel: 0.45, cada: 28, err: 3, pA: 0.08, pB: 0 },
    medio: { vel: 0.9, cada: 8, err: 0.7, pA: 0.7, pB: 0.35 },
    dificil: { vel: 1, cada: 4, err: 0.2, pA: 0.95, pB: 0.6 },
  };
  // Lugares del saque por tamaño de equipo (fracción de L y A) para el equipo 0; el 1 va en espejo.
  const SAQUE = { 1: [[-0.25, 0]], 2: [[-0.17, -0.22], [-0.36, 0.14]], 3: [[-0.16, -0.26], [-0.16, 0.26], [-0.38, 0]] };
  const NADA = { x: 0, y: 0, a: false, b: false };

  const raiz = Math.sqrt;
  const acotar = (v, a, b) => Math.min(b, Math.max(a, v));
  const entero = (x, a, b) => typeof x === 'number' && Number.isInteger(x) && x >= a && x <= b;

  // Azar con semilla (mulberry32 sobre un hash FNV-1a del texto).
  function hash(s) {
    let h = 2166136261 >>> 0;
    s = String(s);
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return h;
  }
  function rng(semilla) {
    let a = hash(semilla);
    return () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ================= Arena =================
  // Vértices del octágono (en sentido antihorario) y sus 8 paredes: normal hacia afuera (nx, ny) y d, de modo que
  // nx·x + ny·y + d es la distancia con signo (negativa adentro). Las paredes 0 y 4 son las de las porterías.
  function vertices(ar) {
    const L = ar.L / 2, A = ar.A / 2, c = ar.c;
    return [[L, -A + c], [L, A - c], [L - c, A], [-L + c, A], [-L, A - c], [-L, -A + c], [-L + c, -A], [L - c, -A]];
  }
  const PORTERIA = { 0: 1, 4: -1 }; // pared 0: portería derecha; pared 4: izquierda
  function paredes(ar) {
    const v = vertices(ar);
    return v.map((p1, k) => {
      const p2 = v[(k + 1) % 8], dx = p2[0] - p1[0], dy = p2[1] - p1[1], n = raiz(dx * dx + dy * dy);
      const nx = dy / n, ny = -dx / n;
      return { nx, ny, d: -(nx * p1[0] + ny * p1[1]), porteria: PORTERIA[k] || 0, a: p1, b: p2 };
    });
  }
  const postes = ar => [[ar.L / 2, ar.G / 2], [ar.L / 2, -ar.G / 2], [-ar.L / 2, ar.G / 2], [-ar.L / 2, -ar.G / 2]];

  // Empuja un cuerpo (x, y, vx, vy) fuera de las paredes y rebota su velocidad. El balón pasa por la boca de las
  // porterías. Devuelve el golpe más fuerte { vn, poste } o null.
  function contraParedes(p, o, r, e, esBalon) {
    let golpe = null;
    const boca = p.ar.G / 2;
    for (const w of p.paredes) {
      const s = w.nx * o.x + w.ny * o.y + w.d;
      if (s <= -r) continue;
      if (w.porteria && esBalon && (o.y < boca && o.y > -boca)) continue;
      o.x -= w.nx * (s + r); o.y -= w.ny * (s + r);
      const vn = o.vx * w.nx + o.vy * w.ny;
      if (vn > 0) {
        o.vx -= (1 + e) * vn * w.nx; o.vy -= (1 + e) * vn * w.ny;
        if (!golpe || vn > golpe.vn) golpe = { vn, poste: !!w.porteria && esBalon && (o.y < boca + r && o.y > -boca - r) };
      }
    }
    return golpe;
  }

  // ================= Partido =================
  // o: { arena: 'normal' | 'grande', robots: [{ eq, color, num, nombre, vel? }], goles (N), semilla, duracion? }
  function crearPartido(o) {
    const ar = ARENAS[o.arena] || ARENAS.normal;
    const p = {
      arena: ARENAS[o.arena] ? o.arena : 'normal', ar, paredes: paredes(ar), postes: postes(ar),
      robots: (o.robots || []).map((r, i) => ({
        i, eq: r.eq === 1 ? 1 : 0, color: r.color || 0, num: r.num || i + 1, nombre: String(r.nombre || ''), vel: r.vel || 1,
        x: 0, y: 0, vx: 0, vy: 0, fx: 1, fy: 0, dashT: 0, golpeT: 0, recA: 0, giroT: 0, recB: 0, aPrev: false, bPrev: false, patear: false, barrio: false,
      })),
      balon: { x: 0, y: 0, vx: 0, vy: 0 }, goles: [0, 0], objetivo: Number(o.goles) || 5, t: 0, duracion: o.duracion || DURACION,
      oro: false, estado: 'saque', estT: 0, terminar: false, ganador: null, ultimo: -1, pasos: 0, rnd: rng(o.semilla === undefined ? 'arena' : o.semilla), mem: [],
    };
    ponerSaque(p);
    return p;
  }
  // Saque al centro: cada quien a su lugar, mirando a la portería rival; balón quieto en el centro.
  function ponerSaque(p) {
    for (const eq of [0, 1]) {
      const del = p.robots.filter(r => r.eq === eq), lugares = SAQUE[Math.min(3, del.length)] || SAQUE[1], s = eq === 0 ? 1 : -1;
      del.forEach((r, k) => {
        const l = lugares[k % lugares.length];
        Object.assign(r, { x: s * l[0] * p.ar.L, y: s * l[1] * p.ar.A, vx: 0, vy: 0, fx: s, fy: 0, dashT: 0, golpeT: 0, giroT: 0, recA: 0, recB: 0, patear: false, barrio: false });
      });
    }
    Object.assign(p.balon, { x: 0, y: 0, vx: 0, vy: 0 });
    p.estado = 'saque'; p.estT = 0;
  }

  // Entrada con zona muerta y acotada al círculo.
  function entradaLimpia(ent) {
    let x = Number(ent && ent.x) || 0, y = Number(ent && ent.y) || 0;
    const m = raiz(x * x + y * y);
    if (m < MUERTA) return { x: 0, y: 0, m: 0 };
    if (m > 1) { x /= m; y /= m; return { x, y, m: 1 }; }
    return { x, y, m };
  }
  function normalizar(r) {
    const m = raiz(r.fx * r.fx + r.fy * r.fy) || 1;
    r.fx /= m; r.fy /= m;
  }
  // La dirección gira suave hacia (tx, ty) unitario; si apunta al lado contrario, primero se ladea.
  function girarHacia(r, tx, ty, dt) {
    if (r.fx * tx + r.fy * ty < -0.95) { r.fx += -r.fy * 0.3; r.fy += r.fx * 0.3; normalizar(r); }
    const k = Math.min(1, ROT * dt);
    r.fx += (tx - r.fx) * k; r.fy += (ty - r.fy) * k;
    normalizar(r);
  }
  // Mueve un robot un paso con su entrada (joystick, A y B). Lo usa el motor y la predicción del invitado
  // (juegos/arena-red.js). ent: { x, y, a, b, ga?, gb? } — ga/gb fuerzan una presión (llegó por la red).
  const tiene = (ent, k) => !!(ent && ent[k]);
  // Recargas y presiones (flanco de bajada del botón, o forzada por la red).
  function presiones(r, ent, dt) {
    r.recA = Math.max(0, r.recA - dt); r.recB = Math.max(0, r.recB - dt);
    const a = tiene(ent, 'ga') || (tiene(ent, 'a') && !r.aPrev), b = tiene(ent, 'gb') || (tiene(ent, 'b') && !r.bPrev);
    r.aPrev = tiene(ent, 'a'); r.bPrev = tiene(ent, 'b');
    return { a, b };
  }
  function activar(r, pres, ev) {
    if (pres.a && r.recA <= 0) { r.dashT = T_DASH; r.golpeT = T_GOLPE; r.recA = RECARGA_A; r.patear = true; ev.push({ tipo: 'dash', i: r.i }); }
    if (pres.b && r.recB <= 0) { r.giroT = T_GIRO; r.recB = RECARGA_B; r.barrio = false; ev.push({ tipo: 'giro', i: r.i }); }
  }
  // Dirección: gira sola durante el giro; si no, sigue al joystick (mientras no embista).
  function orientar(r, e, dt) {
    if (r.giroT > 0) {
      const fx = r.fx * GIRO_C - r.fy * GIRO_S, fy = r.fx * GIRO_S + r.fy * GIRO_C;
      r.fx = fx; r.fy = fy; normalizar(r);
      r.giroT = Math.max(0, r.giroT - dt);
    } else if (e.m > 0.2 && r.dashT <= 0) girarHacia(r, e.x / e.m, e.y / e.m, dt);
  }
  // Velocidad: la embestida manda; si no, acelera hacia lo que pide el joystick (o frena fuerte con B).
  function acelerar(r, e, frena, dt) {
    if (r.dashT > 0) {
      r.vx = r.fx * DASH_V; r.vy = r.fy * DASH_V;
      r.dashT = Math.max(0, r.dashT - dt);
      return;
    }
    const vmax = VMAX * (r.vel || 1), ac = (frena ? FRENO : ACEL) * dt;
    let ux = (frena ? 0 : e.x * vmax) - r.vx, uy = (frena ? 0 : e.y * vmax) - r.vy;
    const m = raiz(ux * ux + uy * uy);
    if (m > ac) { ux *= ac / m; uy *= ac / m; }
    r.vx += ux; r.vy += uy;
  }
  function moverRobot(r, ent, dt, p, juega) {
    const ev = [], pres = presiones(r, ent, dt);
    if (!juega) { r.vx = 0; r.vy = 0; r.dashT = 0; r.golpeT = 0; r.giroT = 0; return ev; }
    const e = entradaLimpia(ent);
    activar(r, pres, ev);
    orientar(r, e, dt);
    acelerar(r, e, tiene(ent, 'b'), dt);
    r.x += r.vx * dt; r.y += r.vy * dt;
    contraParedes(p, r, R_ROBOT, REB_ROBOT_PARED, false);
    return ev;
  }

  // Patada: el balón sale hacia donde mira el robot (un poco hacia el lado del contacto), con algo de su velocidad.
  function patada(p, r, nx, ny, ev) {
    let dx = r.fx * 0.8 + nx * 0.2, dy = r.fy * 0.8 + ny * 0.2;
    const m = raiz(dx * dx + dy * dy) || 1;
    dx /= m; dy /= m;
    const b = p.balon;
    b.vx = dx * PATADA + r.vx * 0.25; b.vy = dy * PATADA + r.vy * 0.25;
    r.golpeT = 0; p.ultimo = r.i;
    ev.push({ tipo: 'patada', i: r.i });
  }
  // Dos robots que se enciman: se separan (el que embiste pesa más) e intercambian velocidad con rebote.
  function separar(a, b, min) {
    const dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy;
    if (d2 >= min * min) return;
    const d = raiz(d2) || 1e-6, nx = d2 ? dx / d : 1, ny = d2 ? dy / d : 0;
    const ma = a.dashT > 0 ? 1.6 : 1, mb = b.dashT > 0 ? 1.6 : 1, sol = min - d;
    a.x -= nx * sol * mb / (ma + mb); a.y -= ny * sol * mb / (ma + mb);
    b.x += nx * sol * ma / (ma + mb); b.y += ny * sol * ma / (ma + mb);
    const vr = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
    if (vr >= 0) return;
    const j2 = -(1 + REB_ROBOTS) * vr / (1 / ma + 1 / mb);
    a.vx -= nx * j2 / ma; a.vy -= ny * j2 / ma; b.vx += nx * j2 / mb; b.vy += ny * j2 / mb;
  }
  function choquesRobots(p) {
    const rs = p.robots;
    for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) separar(rs[i], rs[j], 2 * R_ROBOT);
    for (const r of rs) contraParedes(p, r, R_ROBOT, REB_ROBOT_PARED, false);
  }
  // Al presionar A con el balón al alcance y enfrente, la patada sale de inmediato.
  function patadaInmediata(p, r, dx, dy, d2, ev) {
    if (!r.patear) return false;
    r.patear = false;
    const lim = R_ROBOT + R_BALON + ALCANCE;
    if (d2 >= lim * lim) return false;
    const d = raiz(d2) || 1e-6;
    if ((dx * r.fx + dy * r.fy) / d <= 0.5) return false;
    patada(p, r, dx / d, dy / d, ev);
    return true;
  }
  // Contacto robot–balón: patada (si embiste de frente), barrida (si gira) o rebote con el empuje del robot.
  function contacto(p, r, dx, dy, d2, ev) {
    const b = p.balon, min = R_ROBOT + R_BALON;
    const d = raiz(d2) || 1e-6, nx = d2 ? dx / d : r.fx, ny = d2 ? dy / d : r.fy;
    b.x = r.x + nx * min; b.y = r.y + ny * min;
    p.ultimo = r.i;
    if (r.golpeT > 0 && nx * r.fx + ny * r.fy > 0.3) { patada(p, r, nx, ny, ev); return; }
    if (r.giroT > 0 && !r.barrio) { // barrida: el balón sale de lado
      b.vx = r.vx - ny * BARRIDA + nx * 3; b.vy = r.vy + nx * BARRIDA + ny * 3;
      r.barrio = true; ev.push({ tipo: 'barrida', i: r.i });
      return;
    }
    const vr = (b.vx - r.vx) * nx + (b.vy - r.vy) * ny;
    if (vr < 0) { b.vx -= (1 + REB_ROBOT) * vr * nx; b.vy -= (1 + REB_ROBOT) * vr * ny; ev.push({ tipo: 'toque', i: r.i, v: -vr }); }
  }
  function choquesBalon(p, ev) {
    const b = p.balon, min = R_ROBOT + R_BALON;
    for (const r of p.robots) {
      const dx = b.x - r.x, dy = b.y - r.y, d2 = dx * dx + dy * dy;
      if (patadaInmediata(p, r, dx, dy, d2, ev) || d2 >= min * min) continue;
      contacto(p, r, dx, dy, d2, ev);
    }
  }
  // Inercia del balón: avanza, se frena con la fricción, con tope de velocidad y se detiene si ya casi no se mueve.
  function integrarBalon(b, dt) {
    b.x += b.vx * dt; b.y += b.vy * dt;
    const k = 1 - FRICCION * dt;
    b.vx *= k; b.vy *= k;
    let v2 = b.vx * b.vx + b.vy * b.vy;
    if (v2 > VBALON_MAX * VBALON_MAX) { const f = VBALON_MAX / raiz(v2); b.vx *= f; b.vy *= f; v2 = VBALON_MAX * VBALON_MAX; }
    if (v2 < 0.03 * 0.03) { b.vx = 0; b.vy = 0; }
  }
  // Postes: puntos que rebotan.
  function contraPostes(p, ev) {
    const b = p.balon;
    for (const [px, py] of p.postes) {
      const dx = b.x - px, dy = b.y - py, d2 = dx * dx + dy * dy;
      if (d2 >= R_BALON * R_BALON) continue;
      const d = raiz(d2) || 1e-6, nx = d2 ? dx / d : -Math.sign(px), ny = d2 ? dy / d : 0;
      b.x = px + nx * R_BALON; b.y = py + ny * R_BALON;
      const vn = b.vx * nx + b.vy * ny;
      if (vn < 0) { b.vx -= (1 + REB_PARED) * vn * nx; b.vy -= (1 + REB_PARED) * vn * ny; ev.push({ tipo: 'poste', v: -vn }); }
    }
  }
  // Dentro de la portería: la red (fondo y lados) frena el balón.
  function contraRed(p) {
    const b = p.balon, L = p.ar.L / 2;
    if (b.x <= L && b.x >= -L) return;
    const s = b.x > 0 ? 1 : -1, fondo = L + RED - R_BALON, lado = p.ar.G / 2 - R_BALON;
    if (s * b.x > fondo) { b.x = s * fondo; if (s * b.vx > 0) b.vx = -b.vx * 0.3; }
    if (b.y > lado) { b.y = lado; if (b.vy > 0) b.vy = -b.vy * 0.3; }
    if (b.y < -lado) { b.y = -lado; if (b.vy < 0) b.vy = -b.vy * 0.3; }
  }
  function moverBalon(p, dt, ev) {
    integrarBalon(p.balon, dt);
    choquesBalon(p, ev);
    const golpe = contraParedes(p, p.balon, R_BALON, REB_PARED, true);
    if (golpe) ev.push({ tipo: golpe.poste ? 'poste' : 'pared', v: golpe.vn });
    contraPostes(p, ev);
    contraRed(p);
  }
  function terminar(p, ganador, ev) {
    p.estado = 'fin'; p.ganador = ganador;
    ev.push({ tipo: 'fin', ganador, marcador: p.goles.slice() });
  }
  // Cambios de estado por tiempo: saque → juego y gol → saque (o fin). Devuelve true si el partido terminó.
  function transicion(p, ev) {
    if (p.estado === 'saque' && p.estT >= T_SAQUE) {
      p.estado = 'juego'; p.estT = 0;
      ev.push({ tipo: 'arranque', primero: p.t === 0 && p.goles[0] + p.goles[1] === 0 });
    } else if (p.estado === 'gol' && p.estT >= T_GOL) {
      if (p.terminar) { terminar(p, p.ganador, ev); return true; }
      ponerSaque(p); ev.push({ tipo: 'saque' });
    }
    return false;
  }
  // ¿El balón cruzó la boca de una portería? Anota, festeja y, si llegó a los goles (o era gol de oro), termina.
  function revisarGol(p, ev) {
    const b = p.balon, L = p.ar.L / 2, boca = p.ar.G / 2;
    if (!((b.x > L || b.x < -L) && b.y < boca && b.y > -boca)) return false;
    const eq = b.x > L ? 0 : 1;
    p.goles[eq]++;
    ev.push({ tipo: 'gol', eq, i: p.ultimo, marcador: p.goles.slice(), oro: p.oro || undefined });
    p.estado = 'gol'; p.estT = 0;
    if (p.goles[eq] >= p.objetivo || p.oro) { p.terminar = true; p.ganador = eq; }
    return true;
  }
  // Reloj del partido: al cumplirse el tiempo gana quien va arriba; con empate, gol de oro hasta ORO segundos más.
  function avanzarReloj(p, dt, ev) {
    p.t += dt;
    if (!p.oro && p.t >= p.duracion) {
      if (p.goles[0] === p.goles[1]) { p.oro = true; ev.push({ tipo: 'oro' }); }
      else terminar(p, p.goles[0] > p.goles[1] ? 0 : 1, ev);
    } else if (p.oro && p.t >= p.duracion + ORO) terminar(p, -1, ev);
  }

  // Un paso de 1/60 s. entradas[i] es la del robot i (persona o IA). Devuelve los eventos del paso.
  function paso(p, entradas) {
    const ev = [];
    if (p.estado === 'fin') return ev;
    const dt = PASO;
    p.estT += dt;
    if (transicion(p, ev)) return ev;
    const juega = p.estado !== 'saque';
    p.robots.forEach((r, i) => { for (const e of moverRobot(r, (entradas && entradas[i]) || NADA, dt, p, juega)) ev.push(e); });
    choquesRobots(p);
    if (juega) moverBalon(p, dt, ev);
    if (p.estado === 'juego' && !revisarGol(p, ev)) avanzarReloj(p, dt, ev);
    p.pasos++;
    return ev;
  }

  // ================= IA =================
  // Rol en su equipo: el más cercano al balón ataca; en 3 vs 3 el segundo va de medio; los demás defienden.
  function rolIA(p, i) {
    const r = p.robots[i], comp = p.robots.filter(x => x.eq === r.eq);
    if (comp.length === 1) return 'ataca';
    const b = p.balon, d = x => (x.x - b.x) * (x.x - b.x) + (x.y - b.y) * (x.y - b.y);
    const orden = comp.slice().sort((a, c) => d(a) - d(c) || a.i - c.i), k = orden.indexOf(r);
    if (k === 0) return 'ataca';
    return comp.length >= 3 && k === 1 ? 'medio' : 'defiende';
  }
  // Balón pegado a la pared (no hay lugar detrás): si el balón queda hacia la portería rival lo empuja derecho; si
  // no, se regresa hacia su lado para volver a entrar.
  function pegadoPared(p, r, m, N, c) {
    const b = p.balon, cx = c.rbx / c.dB, cy = c.rby / c.dB;
    if (cx * c.s > -0.2) {
      m.tx = b.x + cx * 0.8; m.ty = b.y + cy * 0.8;
      if (c.dB < c.min + 1 && r.recA <= 0 && p.rnd() < N.pA) m.a = true;
    } else { m.tx = b.x - c.s * 1.3; m.ty = b.y * 0.6; }
  }
  // Del lado equivocado: rodea el balón por el lado donde ya está (con histéresis, para no cambiar a cada decisión).
  function rodear(p, r, m, N, c) {
    const b = p.balon, rx = r.x - b.x, ry = r.y - b.y, lat = rx * -c.uy + ry * c.ux;
    const ladoAhora = lat >= 0 ? 1 : -1;
    if (!m.lado || Math.abs(lat) > 0.6) m.lado = ladoAhora;
    m.tx = b.x - c.ux * 1.1 - c.uy * m.lado * 1.3; m.ty = b.y - c.uy * 1.1 + c.ux * m.lado * 1.3;
    if (c.dB < c.min + 0.4 && r.recB <= 0 && p.rnd() < N.pB) m.b = true;
  }
  // Detrás del balón: se acomoda y lo empuja hacia la portería; embiste si está alineado y cerca.
  function empujar(p, r, m, N, c) {
    const b = p.balon, dp = raiz((c.px - r.x) * (c.px - r.x) + (c.py - r.y) * (c.py - r.y));
    if (dp < 0.6) { m.tx = b.x + c.ux * 0.8; m.ty = b.y + c.uy * 0.8; } else { m.tx = c.px; m.ty = c.py; }
    const alineado = c.dB > 0 && (c.rbx * c.ux + c.rby * c.uy) / c.dB > 0.9;
    if (alineado && c.dB < c.min + 1.3 && r.recA <= 0 && p.rnd() < N.pA) m.a = true;
  }
  function atacar(p, r, m, N, c) {
    const b = p.balon;
    let ux = c.gx - b.x, uy = c.gy - b.y;
    const un = raiz(ux * ux + uy * uy) || 1;
    ux /= un; uy /= un;
    Object.assign(c, { ux, uy, px: b.x - ux * (c.min + 0.1), py: b.y - uy * (c.min + 0.1) });
    const delante = (r.x - b.x) * ux + (r.y - b.y) * uy;
    if (fuera(p, c.px, c.py, R_ROBOT * 0.9) && c.dB > 0) pegadoPared(p, r, m, N, c);
    else if (delante > -0.2) rodear(p, r, m, N, c);
    else empujar(p, r, m, N, c);
  }
  // Atasco: el balón casi quieto junto al robot un rato → lo embiste derecho.
  function desatorar(p, r, m, N, c) {
    const b = p.balon;
    m.tx = b.x + c.rbx / c.dB; m.ty = b.y + c.rby / c.dB; m.atasco = 0;
    if (r.recA <= 0 && p.rnd() < Math.max(0.5, N.pA)) m.a = true;
  }
  function defender(p, m, s) {
    const b = p.balon, ox = -s * p.ar.L / 2, vx = b.x - ox, vy = b.y, dv = raiz(vx * vx + vy * vy) || 1, k = Math.max(1.2, Math.min(dv * 0.4, 3.5));
    m.tx = ox + vx / dv * k; m.ty = vy / dv * k;
  }
  function decidir(p, r, m, N) {
    const ar = p.ar, b = p.balon, s = r.eq === 0 ? 1 : -1, min = R_ROBOT + R_BALON;
    m.a = false; m.b = false;
    const c = { s, min, gx: s * ar.L / 2, gy: (p.rnd() * 2 - 1) * N.err, rbx: b.x - r.x, rby: b.y - r.y };
    c.dB = raiz(c.rbx * c.rbx + c.rby * c.rby);
    let rol = rolIA(p, r.i);
    if (rol === 'defiende' && c.dB < 1.6 && s * b.x < 0) rol = 'ataca'; // despeja si el balón llega a su lado
    const vb = b.vx * b.vx + b.vy * b.vy;
    m.atasco = vb < 0.09 && c.dB < min + 0.8 ? (m.atasco || 0) + N.cada : 0; // pasos con el balón quieto a un lado
    if (rol === 'ataca' && m.atasco >= 45 && c.dB > 0) desatorar(p, r, m, N, c);
    else if (rol === 'ataca') atacar(p, r, m, N, c);
    else if (rol === 'medio') { m.tx = b.x - s * ar.L * 0.22; m.ty = b.y * 0.5; }
    else defender(p, m, s);
    m.tx = acotar(m.tx, -ar.L / 2 + 0.6, ar.L / 2 - 0.6); m.ty = acotar(m.ty, -ar.A / 2 + 0.6, ar.A / 2 - 0.6);
  }
  // ¿El punto queda a menos de `r` de alguna pared (o afuera)?
  function fuera(p, x, y, r) {
    return p.paredes.some(w => w.nx * x + w.ny * y + w.d > -r);
  }
  // Entrada de la IA para el robot i: decide cada `cada` pasos (según el nivel) y entre decisiones va hacia su objetivo.
  function ia(p, i, nivel) {
    const N = NIVELES[nivel] || NIVELES.medio, r = p.robots[i];
    const m = p.mem[i] || (p.mem[i] = { prox: 0, tx: r.x, ty: r.y, a: false, b: false });
    if (p.estado !== 'juego' && p.estado !== 'gol') { m.prox = 0; return { x: 0, y: 0, a: false, b: false }; }
    let a = false, b = false;
    if (p.pasos >= m.prox) {
      m.prox = p.pasos + N.cada;
      decidir(p, r, m, N);
      a = m.a; b = m.b;
    }
    const vx = m.tx - r.x, vy = m.ty - r.y, d = raiz(vx * vx + vy * vy);
    if (d < 0.12) return { x: 0, y: 0, a, b: false };
    const k = Math.min(1, d / 0.7) * N.vel;
    return { x: vx / d * k, y: vy / d * k, a, b };
  }

  // ================= Sala: opciones, equipos, resultado y puntos =================
  // Opciones al crear la sala (strings, como el resto de opciones de sala). 3 vs 3 siempre en la arena grande.
  function opcionesSala(op) {
    op = op || {};
    const formato = op.formato === undefined || op.formato === '' ? '2v2' : String(op.formato);
    if (!FORMATOS[formato]) return 'formato_invalido';
    const arena = op.arena === undefined || op.arena === '' ? 'normal' : String(op.arena);
    if (!ARENAS[arena]) return 'arena_invalida';
    const goles = op.goles === undefined || op.goles === '' ? '5' : String(op.goles);
    if (!GOLES.includes(goles)) return 'goles_invalidos';
    return { formato, arena: formato === '3v3' ? 'grande' : arena, goles };
  }
  // Reparto de la mesa (design.md §6). asientos: personas por orden de entrada y luego bots ({ id, bot?, equipo?, robot? }).
  // Devuelve por asiento { eq, color, num }. La página y el servidor usan esta misma función.
  function repartir(asientos, formato) {
    const tam = FORMATOS[formato] || FORMATOS['2v2'], cuenta = [0, 0];
    const eq = asientos.map(() => undefined);
    const cabe = e => cuenta[e] < tam[e];
    asientos.forEach((a, i) => {
      if (a.bot || (a.equipo !== 0 && a.equipo !== 1) || !cabe(a.equipo)) return;
      eq[i] = a.equipo; cuenta[a.equipo]++;
    });
    asientos.forEach((a, i) => { // personas sin equipo (o que no cupieron): alternadas por lugar en la mesa
      if (a.bot || eq[i] !== undefined) return;
      let e = i % 2;
      if (!cabe(e)) e = 1 - e;
      eq[i] = e; cuenta[e]++;
    });
    asientos.forEach((_, i) => { // bots: al equipo con menos integrantes que aún tenga lugar
      if (eq[i] !== undefined) return;
      let e = cuenta[0] <= cuenta[1] ? 0 : 1;
      if (!cabe(e)) e = 1 - e;
      eq[i] = e; cuenta[e]++;
    });
    const usados = [new Set(), new Set()], color = asientos.map(() => undefined);
    asientos.forEach((a, i) => {
      if (a.bot || !entero(a.robot, 0, 2) || usados[eq[i]].has(a.robot)) return;
      color[i] = a.robot; usados[eq[i]].add(a.robot);
    });
    asientos.forEach((_, i) => {
      if (color[i] !== undefined) return;
      let c = 0;
      while (usados[eq[i]].has(c) && c < 2) c++;
      color[i] = c; usados[eq[i]].add(c);
    });
    return asientos.map((_, i) => ({ eq: eq[i], color: color[i], num: i + 1 }));
  }
  // Equipo pedido en la sala de espera: 0 o 1, antes de empezar y si cabe.
  function validarEquipo(formato, iniciada, jugadores, yo, equipo) {
    if (equipo !== 0 && equipo !== 1) return { error: 'equipo_invalido', status: 400 };
    if (iniciada) return { error: 'ya_empezo', status: 409 };
    const tam = (FORMATOS[formato] || FORMATOS['2v2'])[equipo];
    if (jugadores.filter(j => j.id !== yo && j.equipo === equipo).length >= tam) return { error: 'equipo_lleno', status: 409 };
    return equipo;
  }
  const validarRobot = x => entero(x, 0, 2);
  // Reporte de fin de partido: enteros ≤ goles de la sala, ≤ 1 gol cada 2.5 s (+1), 5 s ≤ ms ≤ 5 min y no más largo
  // que lo que lleva la sala (+5 s). null si no es plausible.
  function validarResultado(crudo, objetivo, inicio, ahora) {
    if (!crudo || typeof crudo !== 'object') return null;
    const g = crudo.goles, ms = crudo.ms;
    if (!Array.isArray(g) || g.length !== 2 || !g.every(x => entero(x, 0, objetivo))) return null;
    if (!entero(ms, 5000, 300000) || ms > ahora - inicio + 5000) return null;
    if (g[0] + g[1] > 1 + ms / 2500) return null;
    return { goles: [g[0], g[1]], ms, ...(crudo.corte === true ? { corte: true } : {}) };
  }
  // Puntos por equipo en sala (como Fútbol Estelar): gana 300, empata 120, pierde 40, +60 por gol (hasta 6), −20 por
  // gol recibido; de 0 a 1000.
  function puntosEquipo(gf, gc) {
    let base = 40;
    if (gf > gc) base = 300; else if (gf === gc) base = 120;
    return Math.max(0, Math.min(1000, Math.round(base + 60 * Math.min(6, gf) - 20 * gc)));
  }
  const FACTOR = { facil: 0.6, medio: 1, dificil: 1.4 };
  // Contra la IA: base por resultado × nivel + 40 por gol − 15 por gol recibido (tope 1000, el del catálogo).
  function puntosSolo(gf, gc, nivel) {
    let base = 40;
    if (gf > gc) base = 300; else if (gf === gc) base = 120;
    return Math.max(0, Math.min(1000, Math.round(base * (FACTOR[nivel] || 1) + 40 * Math.min(7, gf) - 15 * gc)));
  }
  const igual = (a, b) => a.goles[0] === b.goles[0] && a.goles[1] === b.goles[1];
  // Resultado de la sala (design.md §9). jugadores: personas con su reporte `arena`; equipos: { id: 0 | 1 }.
  function resultadoSala(host, jugadores, equipos) {
    const con = jugadores.filter(j => j.arena), anf = con.find(j => j.id === host);
    let estado = 'pendiente', goles = null;
    if (anf) {
      goles = anf.arena.goles.slice();
      if (!con.every(j => igual(j.arena, anf.arena))) estado = 'disputa';
      else estado = con.length > 1 ? 'confirmado' : 'anfitrion';
    } else if (con.length) { estado = 'invitado'; goles = con[0].arena.goles.slice(); }
    const puntos = {};
    if (goles) for (const j of jugadores) { const e = equipos[j.id]; if (e === 0 || e === 1) puntos[j.id] = puntosEquipo(goles[e], goles[1 - e]); }
    return { estado, goles, puntos };
  }

  g.ArenaMotor = {
    PASO, ARENAS, FORMATOS, GOLES, R_ROBOT, R_BALON, VMAX, DASH_V, T_DASH, RECARGA_A, PATADA, T_GIRO, RECARGA_B, RED,
    T_SAQUE, T_GOL, DURACION, ORO, EQUIPOS, COLORES, NOMBRES_COLOR, NIVELES, NADA,
    rng, vertices, paredes, crearPartido, ponerSaque, paso, moverRobot, entradaLimpia, rolIA, ia,
    opcionesSala, repartir, validarEquipo, validarRobot, validarResultado, puntosEquipo, puntosSolo, resultadoSala,
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
