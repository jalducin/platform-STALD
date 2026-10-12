/* Motor de «Futbolito» (openspec: futbolito-billar). Sin DOM; requiere juegos/fisica.js.
   Mesa vista desde arriba: el equipo 0 defiende abajo (y = LARGO) y ataca hacia arriba; el equipo 1 al revés.
   Dos modos con la misma física de paso fijo (1/180 s):
   - vivo (individual): `paso(st, dt, mando)` con las barras que mueve la persona y el bot;
   - tiros (sala 1 vs 1): `crearSim(st, tiro)` simula un tiro completo con una defensa automática igual para los dos
     equipos; es determinista (solo + − * / y Math.sqrt; estado redondeado al terminar). */
(function (raiz) {
  'use strict';
  const F = raiz.Fisica;
  const ANCHO = 300, LARGO = 480, PX0 = 105, PX1 = 195, RH = 9, RB = 6, ALCANCE = RH + RB, META = 5;
  const SUB = 3, DT = 1 / 180, PATADA = 0.2, VMAX_PELOTA = 620, E_PARED = 0.85, E_JUGADOR = 0.6;
  // Barras de arriba abajo: equipo, puesto, línea y (jugadores relativos al centro) y corrimiento máximo.
  const BARRAS = [
    { eq: 1, puesto: 'portero', y: 30, h: [-85, 0, 85], rango: 40 },
    { eq: 1, puesto: 'defensa', y: 90, h: [-55, 55], rango: 81 },
    { eq: 0, puesto: 'delanteros', y: 150, h: [-90, 0, 90], rango: 46 },
    { eq: 1, puesto: 'medios', y: 210, h: [-112, -56, 0, 56, 112], rango: 24 },
    { eq: 0, puesto: 'medios', y: 270, h: [-112, -56, 0, 56, 112], rango: 24 },
    { eq: 1, puesto: 'delanteros', y: 330, h: [-90, 0, 90], rango: 46 },
    { eq: 0, puesto: 'defensa', y: 390, h: [-55, 55], rango: 81 },
    { eq: 0, puesto: 'portero', y: 450, h: [-85, 0, 85], rango: 40 },
  ];
  const MEDIOS = [4, 3]; // barra de medios de cada equipo (saque)
  const dir = eq => eq === 0 ? -1 : 1; // hacia dónde ataca cada equipo (en y)
  const xHombre = (st, i, k) => ANCHO / 2 + BARRAS[i].h[k] + st.s[i];

  // Corrimiento de la barra i para poner a alguno de sus jugadores en x (el más cercano; empate: el que menos se mueve).
  function seguir(st, i, x) {
    const b = BARRAS[i];
    let mejor = null;
    for (let k = 0; k < b.h.length; k++) {
      const s = F.acotar(x - ANCHO / 2 - b.h[k], -b.rango, b.rango);
      const err = Math.abs(ANCHO / 2 + b.h[k] + s - x), mov = Math.abs(s - st.s[i]);
      if (!mejor || err < mejor.err - 0.001 || (Math.abs(err - mejor.err) <= 0.001 && mov < mejor.mov)) mejor = { s, k, err, mov };
    }
    return mejor;
  }
  // Barra de la línea más cercana a y (cualquier equipo).
  function barraCercana(y) {
    let m = 0;
    for (let i = 1; i < BARRAS.length; i++) if (Math.abs(BARRAS[i].y - y) < Math.abs(BARRAS[m].y - y)) m = i;
    return m;
  }
  // Barra activa de un equipo: la suya más cercana detrás de la pelota (desde donde se patea); si no hay, la más cercana.
  function barraActiva(st, eq) {
    const y = st.pelota.y, d = dir(eq);
    let mejor = -1, mejorD = Infinity;
    for (let i = 0; i < BARRAS.length; i++) {
      if (BARRAS[i].eq !== eq) continue;
      const atras = (BARRAS[i].y - y) * -d; // > 0: la barra está detrás de la pelota
      if (atras >= -4 && atras < mejorD) { mejorD = atras; mejor = i; }
    }
    if (mejor >= 0) return mejor;
    for (let i = 0; i < BARRAS.length; i++) if (BARRAS[i].eq === eq && (mejor < 0 || Math.abs(BARRAS[i].y - y) < Math.abs(BARRAS[mejor].y - y))) mejor = i;
    return mejor;
  }

  function nuevo() {
    return {
      pelota: { x: ANCHO / 2, y: LARGO / 2, vx: 0, vy: 0 },
      s: BARRAS.map(() => 0), vs: BARRAS.map(() => 0), patada: BARRAS.map(() => 0), pateo: BARRAS.map(() => false), fuerzaPatada: BARRAS.map(() => 450),
      marcador: [0, 0], turno: 0, posesion: null, fin: null, tiros: 0, ultimo: null,
    };
  }
  // Saque (vivo): pelota al centro rodando hacia los medios de quien recibió el gol.
  function saque(st, recibe, lateral = 0) {
    Object.assign(st.pelota, { x: ANCHO / 2 + lateral, y: LARGO / 2, vx: lateral * 0.6, vy: recibe === 0 ? 70 : -70 });
  }
  function patear(st, i, fuerza) {
    if (st.patada[i] > 0) return false;
    st.patada[i] = PATADA; st.pateo[i] = false; if (fuerza) st.fuerzaPatada[i] = fuerza;
    return true;
  }

  // Un subpaso de física. mando: { obj: [corrimiento objetivo por barra], vmax: [...], fantasma: [bool] (no chocan),
  // patadas: bool (si false, nadie patea: modo tiros) }. Devuelve el equipo que anotó o null.
  function paso(st, dt, mando) {
    const p = st.pelota;
    for (let i = 0; i < BARRAS.length; i++) {
      const b = BARRAS[i], obj = F.acotar(mando.obj[i], -b.rango, b.rango), mx = mando.vmax[i] * dt;
      const mv = F.acotar(obj - st.s[i], -mx, mx);
      st.s[i] += mv; st.vs[i] = mv / dt;
      if (st.patada[i] > 0) st.patada[i] = Math.max(0, st.patada[i] - dt);
    }
    // Fricción
    let v = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
    if (v > 0) {
      let nv = v * (1 - 0.35 * dt) - 12 * dt;
      if (nv > VMAX_PELOTA) nv = VMAX_PELOTA;
      if (nv <= 0) { p.vx = 0; p.vy = 0; } else { const f = nv / v; p.vx *= f; p.vy *= f; }
    }
    // Pendiente: con la pelota lenta, la mesa la lleva hacia la línea de barra más cercana; en las cabeceras y junto a
    // las bandas, hacia adentro (como las mesas reales), para que nunca quede donde nadie la alcanza.
    const enBoca = p.x > PX0 && p.x < PX1;
    if (!enBoca && p.y < 24) p.vy += 160 * dt;
    else if (!enBoca && p.y > LARGO - 24) p.vy -= 160 * dt;
    if (p.x < 16) p.vx += 120 * dt; else if (p.x > ANCHO - 16) p.vx -= 120 * dt;
    if (v < 45) {
      const ly = BARRAS[barraCercana(p.y)].y, dy = ly - p.y;
      if (dy > 2) p.vy += 70 * dt; else if (dy < -2) p.vy -= 70 * dt;
    }
    p.x += p.vx * dt; p.y += p.vy * dt;
    // Paredes laterales
    if (p.x < RB) { p.x = RB + (RB - p.x); p.vx = -p.vx * E_PARED; } else if (p.x > ANCHO - RB) { p.x = (ANCHO - RB) - (p.x - (ANCHO - RB)); p.vx = -p.vx * E_PARED; }
    // Cabeceras y porterías
    let gol = null;
    for (const lado of [0, 1]) {
      const fuera = lado === 0 ? -p.y : p.y - LARGO; // > 0: pasó la línea de su cabecera
      const borde = lado === 0 ? RB : LARGO - RB;
      if (p.x > PX0 && p.x < PX1) {
        if (fuera > RB) { gol = lado === 0 ? 0 : 1; break; } // arriba anota el equipo 0, abajo el 1
        // dentro de la portería: paredes de la caja
        if (fuera > -RB) { if (p.x < PX0 + RB) { p.x = PX0 + RB; p.vx = Math.abs(p.vx) * E_PARED; } else if (p.x > PX1 - RB) { p.x = PX1 - RB; p.vx = -Math.abs(p.vx) * E_PARED; } }
      } else if ((lado === 0 && p.y < borde) || (lado === 1 && p.y > borde)) {
        p.y = borde + (borde - p.y); p.vy = -p.vy * E_PARED;
      }
      // Postes
      for (const px of [PX0, PX1]) {
        const py = lado === 0 ? 0 : LARGO, dx = p.x - px, dy = p.y - py, d2 = dx * dx + dy * dy;
        if (d2 < RB * RB && d2 > 0) {
          const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, vn = p.vx * nx + p.vy * ny;
          p.x = px + nx * RB; p.y = py + ny * RB;
          if (vn < 0) { p.vx -= (1 + E_PARED) * vn * nx; p.vy -= (1 + E_PARED) * vn * ny; }
        }
      }
    }
    if (gol !== null) return gol;
    // Jugadores
    for (let i = 0; i < BARRAS.length; i++) {
      const b = BARRAS[i];
      if (mando.fantasma && mando.fantasma[i]) continue;
      const dy = p.y - b.y;
      if (Math.abs(dy) > ALCANCE + 8) continue;
      const pateando = mando.patadas !== false && st.patada[i] > 0 && !st.pateo[i];
      for (let k = 0; k < b.h.length; k++) {
        const dx = p.x - xHombre(st, i, k);
        // Patada: el pie alcanza un poco más hacia el frente.
        if (pateando && Math.abs(dx) < ALCANCE && dy * dir(b.eq) > -RH && dy * dir(b.eq) < ALCANCE + 8) {
          const off = F.acotar(dx / ALCANCE, -1, 1);
          const [sn, cs] = F.senCos(Math.round(off * 350));
          const fz = st.fuerzaPatada[i];
          p.vx = sn * fz + st.vs[i] * 0.25; p.vy = dir(b.eq) * cs * fz;
          p.y = b.y + dir(b.eq) * (ALCANCE + 1);
          st.pateo[i] = true;
          break;
        }
        const d2 = dx * dx + dy * dy;
        if (d2 >= ALCANCE * ALCANCE) continue;
        let nx = 0, ny = dir(b.eq), d = Math.sqrt(d2);
        if (d > 0) { nx = dx / d; ny = dy / d; } else d = 0;
        p.x = xHombre(st, i, k) + nx * ALCANCE; p.y = b.y + ny * ALCANCE;
        const rvx = p.vx - st.vs[i], rvy = p.vy, vn = rvx * nx + rvy * ny;
        if (vn < 0) { p.vx -= (1 + E_JUGADOR) * vn * nx; p.vy -= (1 + E_JUGADOR) * vn * ny; }
      }
    }
    return null;
  }

  // ---------- Modo vivo: bot ----------
  const NIVELES = {
    facil: { vmax: 190, reaccion: 0.24, error: 24, patea: 0.45, fuerza: 330, predice: 0 },
    medio: { vmax: 290, reaccion: 0.12, error: 12, patea: 0.8, fuerza: 400, predice: 0.12 },
    dificil: { vmax: 400, reaccion: 0.05, error: 5, patea: 0.96, fuerza: 460, predice: 0.25 },
  };
  // Llena el mando de las barras del equipo eq con la IA del nivel. mem guarda el objetivo y el tiempo de reacción.
  function iaBot(st, eq, nivel, mando, mem, rnd, dt) {
    const N = NIVELES[nivel] || NIVELES.medio, p = st.pelota;
    mem.t = (mem.t || 0) - dt;
    if (mem.t <= 0 || mem.x === undefined) { mem.t = N.reaccion; mem.x = p.x + p.vx * N.predice + (rnd() * 2 - 1) * N.error; }
    for (let i = 0; i < BARRAS.length; i++) {
      if (BARRAS[i].eq !== eq) continue;
      mando.obj[i] = seguir(st, i, mem.x).s; mando.vmax[i] = N.vmax;
      // Patada: pelota al alcance y enfrente.
      const dy = (p.y - BARRAS[i].y) * dir(eq);
      if (dy > -6 && dy < ALCANCE + 10 && st.patada[i] <= 0) {
        const cerca = BARRAS[i].h.some((_, k) => Math.abs(p.x - xHombre(st, i, k)) < ALCANCE);
        if (cerca) { if (!mem['p' + i]) { mem['p' + i] = true; if (rnd() < N.patea) patear(st, i, N.fuerza); } }
        else mem['p' + i] = false;
      } else mem['p' + i] = false;
    }
  }

  // ---------- Modo tiros (sala) ----------
  const AUTO_VMAX = 200, AUTO_REACCION = 30, MAX_TIRO = 180 * 8; // defensa automática: velocidad y cada cuántos subpasos mira la pelota
  // Estado inicial de sala: saca el equipo 0 desde sus medios.
  function inicial() { const st = nuevo(); darPosesion(st, MEDIOS[0], 2, 0); return st; }
  // Posesión: la pelota se queda enfrente del jugador k de la barra i (corrida s).
  function darPosesion(st, i, k, s) {
    const b = BARRAS[i];
    st.s[i] = F.acotar(s, -b.rango, b.rango);
    st.posesion = { barra: i, hombre: k };
    st.turno = b.eq;
    Object.assign(st.pelota, { x: F.q(xHombre(st, i, k)), y: b.y + dir(b.eq) * (ALCANCE + 1), vx: 0, vy: 0 });
  }
  const velocidadTiro = fuerza => 140 + 4.2 * fuerza;
  // Dónde queda la pelota si la barra con posesión se corre a `pos`.
  function pelotaCon(st, pos) {
    const { barra, hombre } = st.posesion, b = BARRAS[barra];
    return { x: ANCHO / 2 + b.h[hombre] + F.acotar(pos, -b.rango, b.rango), y: b.y + dir(b.eq) * (ALCANCE + 1) };
  }
  function crearSim(st0, tiro) {
    const st = F.clonar(st0), eq = st.turno, { barra } = st.posesion, b = BARRAS[barra];
    st.s[barra] = F.acotar(tiro.pos, -b.rango, b.rango);
    const pp = pelotaCon(st0, tiro.pos), [sn, cs] = F.senCos(tiro.angulo * 10), v0 = velocidadTiro(tiro.fuerza);
    Object.assign(st.pelota, { x: pp.x, y: pp.y, vx: sn * v0, vy: dir(eq) * cs * v0 });
    st.vs = BARRAS.map(() => 0); st.patada = BARRAS.map(() => 0);
    const mando = { obj: st.s.slice(), vmax: BARRAS.map(() => AUTO_VMAX), fantasma: BARRAS.map(() => false), patadas: false };
    const sim = { st, pasos: 0, termino: false, gol: null };
    sim.paso = () => {
      if (sim.termino) return;
      const p = st.pelota, adelante = p.vy * dir(eq) > 0;
      const mira = sim.pasos % AUTO_REACCION === 0;
      for (let i = 0; i < BARRAS.length; i++) {
        // Defensa automática igual para los dos equipos (mira la pelota cada 1/6 s); la barra que tiró se queda quieta un momento.
        if (i === barra && sim.pasos < 45) mando.obj[i] = st.s[i];
        else if (mira) mando.obj[i] = seguir(st, i, p.x).s;
        // Las barras de quien tira se «levantan» mientras la pelota va hacia la portería rival.
        mando.fantasma[i] = (BARRAS[i].eq === eq && adelante) || (i === barra && sim.pasos < 27);
      }
      const g = paso(st, DT, mando);
      sim.pasos++;
      if (g !== null) { sim.gol = g; sim.termino = true; return; }
      const v = Math.sqrt(p.vx * p.vx + p.vy * p.vy), ly = BARRAS[barraCercana(p.y)].y;
      if ((v < 40 && Math.abs(p.y - ly) <= ALCANCE) || sim.pasos >= MAX_TIRO) sim.termino = true;
    };
    sim.resultado = () => {
      const r = F.clonar(st0), ms = Math.round(sim.pasos * 1000 / 180);
      r.s = st.s.map(F.q); r.vs = BARRAS.map(() => 0); r.patada = BARRAS.map(() => 0); r.pateo = BARRAS.map(() => false);
      r.tiros = st0.tiros + 1;
      if (sim.gol !== null) {
        r.marcador[sim.gol]++;
        r.ultimo = { quien: eq, gol: sim.gol };
        if (r.marcador[sim.gol] >= META) { r.fin = { gana: sim.gol, motivo: 'goles' }; r.posesion = null; Object.assign(r.pelota, { x: F.q(st.pelota.x), y: F.q(st.pelota.y), vx: 0, vy: 0 }); }
        else darPosesion(r, MEDIOS[1 - sim.gol], 2, 0);
        return { st: r, ms };
      }
      const i = barraCercana(st.pelota.y), sg = seguir(r, i, st.pelota.x);
      darPosesion(r, i, sg.k, sg.s);
      r.ultimo = { quien: eq, gol: null, para: BARRAS[i].eq };
      return { st: r, ms };
    };
    return sim;
  }
  function aplicar(st, tiro) {
    const sim = crearSim(st, tiro);
    while (!sim.termino) sim.paso();
    return sim.resultado();
  }
  const rendir = (st, idx) => Object.assign(F.clonar(st), { fin: { gana: 1 - idx, motivo: 'rendicion' } });
  const tiroDe = j => ({ pos: j.pos, angulo: j.angulo, fuerza: j.fuerza });
  // Tiro del bot (sala): se corre un poco y apunta a la portería con error según el nivel.
  const ERROR_TIRO = { facil: 20, medio: 10, dificil: 4, auto: 25 };
  function tiroBot(st, nivel, rnd) {
    const { barra } = st.posesion, b = BARRAS[barra], eq = st.turno;
    const pos = Math.round(F.acotar(st.s[barra] + (rnd() * 2 - 1) * b.rango, -b.rango, b.rango));
    const pp = pelotaCon(st, pos);
    const tx = ANCHO / 2 + (rnd() * 2 - 1) * 30, frente = eq === 0 ? pp.y : LARGO - pp.y;
    let a = F.atan2Dec(tx - pp.x, frente); if (a > 1800) a -= 3600;
    const err = ERROR_TIRO[nivel] === undefined ? ERROR_TIRO.medio : ERROR_TIRO[nivel];
    const angulo = F.acotar(Math.round(a / 10 + (rnd() * 2 - 1) * err), -60, 60);
    const fuerza = F.acotar(Math.round((nivel === 'dificil' ? 85 : nivel === 'facil' ? 60 : 72) + rnd() * 15), 10, 100);
    return { pos, angulo, fuerza };
  }
  // Puntos: 60 por gol; al ganar, bono (individual por nivel; en sala 350). Tope 1000.
  const BONO = { facil: 200, medio: 350, dificil: 500, sala: 350 };
  const puntos = (st, idx, nivel = 'sala') => Math.min(1000, 60 * st.marcador[idx] + (st.fin && st.fin.gana === idx ? BONO[nivel] || 0 : 0));

  /* ---------- Barra activa con histéresis (futbolito-equipos, design.md §2) ----------
     frente(i) > 0: la pelota está delante de la barra i (hacia donde ataca su equipo). La candidata es la propia con
     la pelota delante o pegada por detrás hasta `margen`, la de menor frente. Entre margen ALCANCE − 6 y ALCANCE + 6
     se queda la barra actual (no parpadea cuando la pelota tiembla junto a una barra). */
  const frente = (st, i) => (BARRAS[i].y - st.pelota.y) * -dir(BARRAS[i].eq);
  function candidata(st, eq, margen) {
    let mejor = -1;
    for (let i = 0; i < BARRAS.length; i++) {
      if (BARRAS[i].eq !== eq || frente(st, i) < -margen) continue;
      if (mejor < 0 || frente(st, i) < frente(st, mejor)) mejor = i;
    }
    if (mejor >= 0) return mejor;
    for (let i = 0; i < BARRAS.length; i++) if (BARRAS[i].eq === eq && (mejor < 0 || Math.abs(BARRAS[i].y - st.pelota.y) < Math.abs(BARRAS[mejor].y - st.pelota.y))) mejor = i;
    return mejor;
  }
  function barraActivaCon(st, eq, actual) {
    if (actual >= 0 && BARRAS[actual] && BARRAS[actual].eq === eq && (candidata(st, eq, ALCANCE + 6) === actual || candidata(st, eq, ALCANCE - 6) === actual)) return actual;
    return candidata(st, eq, ALCANCE);
  }

  /* ---------- Sala por equipos (futbolito-equipos, design.md §4) ----------
     Mismo reparto que server/futbolito.ts (server/futbolito_equipos_test.ts los compara). */
  const BARRAS_ROL = {
    0: { adelante: [2, 4], atras: [6, 7], todas: [2, 4, 6, 7] },
    1: { adelante: [3, 5], atras: [0, 1], todas: [0, 1, 3, 5] },
  };
  // asientos: [{ id, bot?, equipo? }] (personas por orden de entrada y luego bots) → [{ eq, rol, barras }].
  function repartir(asientos) {
    const cupo = Math.ceil(asientos.length / 2), cuenta = [0, 0], eq = asientos.map(() => undefined);
    asientos.forEach((a, i) => {
      if (a.bot || (a.equipo !== 0 && a.equipo !== 1)) return;
      if (cuenta[a.equipo] < cupo) { eq[i] = a.equipo; cuenta[a.equipo]++; }
    });
    asientos.forEach((_, i) => {
      if (eq[i] !== undefined) return;
      const e = cuenta[0] <= cuenta[1] ? 0 : 1;
      eq[i] = e; cuenta[e]++;
    });
    return asientos.map((_, i) => {
      const e = eq[i], miembros = asientos.map((_, k) => k).filter(k => eq[k] === e);
      const rol = miembros.length === 1 ? 'todas' : miembros.indexOf(i) === 0 ? 'adelante' : 'atras';
      return { eq: e, rol, barras: BARRAS_ROL[e][rol].slice() };
    });
  }
  // Asiento que maneja la barra i (o -1).
  const asientoDe = (reparto, i) => reparto.findIndex(l => l.barras.includes(i));
  // Motor de sala por asientos para Fisica.linea: tira el asiento dueño de la barra con la pelota; rendirse es por
  // equipo; una jugada con `barra` distinta de la que tiene la pelota no cuenta (valida).
  function motorSala(reparto) {
    return {
      inicial, fin: st => st.fin, aplicar, tiroBot, tiroDe,
      turno: st => asientoDe(reparto, st.posesion.barra),
      rendir: (st, asiento) => rendir(st, reparto[asiento].eq),
      valida: (st, j) => j.barra === undefined || !st.posesion || j.barra === st.posesion.barra,
      crearSim,
    };
  }
  const puntosAsiento = (st, reparto, asiento) => puntos(st, reparto[asiento].eq, 'sala');

  raiz.Futbolito = {
    ANCHO, LARGO, PX0, PX1, RH, RB, ALCANCE, META, SUB, DT, PATADA, BARRAS, MEDIOS, NIVELES, BONO, BARRAS_ROL,
    dir, xHombre, seguir, barraCercana, barraActiva, barraActivaCon, nuevo, saque, patear, paso, iaBot,
    inicial, darPosesion, velocidadTiro, pelotaCon, crearSim, aplicar, rendir, tiroDe, tiroBot, puntos,
    repartir, asientoDe, motorSala, puntosAsiento,
    turno: st => st.turno, fin: st => st.fin,
  };
})(typeof window !== 'undefined' ? window : globalThis);
