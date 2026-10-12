/* Física de mesa determinista (openspec: futbolito-billar). Sin DOM ni dependencias: lo cargan juegos/futbolito.html,
   juegos/billar.html y las pruebas de Deno (server/fisica_test.ts).
   - Trigonometría propia solo con + − * / (Math.sin, Math.cos y Math.atan2 pueden variar en el último bit entre
     navegadores; la simulación de sala debe dar lo mismo en todos los aparatos).
   - Azar con semilla (igual que las salas de juegos.html).
   - `linea`: reproduce una partida 1 vs 1 por tiros a partir de las jugadas del servidor (bots, tiro automático por
     tiempo y rendirse), con caché por prefijo. */
(function (raiz) {
  'use strict';
  const PI = 3.141592653589793;

  function fnv(s) { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
  function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; } // NOSONAR: aritmética entera de 32 bits del generador con semilla, no es truncado
  const rng = (seed, etiqueta) => mulberry(fnv(seed + '|' + etiqueta));
  // Redondeo a milésimas: el estado de cada tiro empieza exactamente igual en todos los aparatos.
  const q = v => Math.round(v * 1000) / 1000;
  const acotar = (v, a, b) => {
    if (v < a) return a;
    return v > b ? b : v;
  };

  // [seno, coseno] de un ángulo en décimas de grado (entero). Serie de Taylor en [0°, 90°) y cuadrantes.
  function senCos(decimas) {
    let a = Math.round(decimas) % 3600; if (a < 0) a += 3600;
    const cuad = Math.floor(a / 900), x = (a - cuad * 900) * PI / 1800, x2 = x * x;
    let s = x, c = 1, ts = x, tc = 1;
    for (let k = 1; k <= 10; k++) { ts = -ts * x2 / ((2 * k) * (2 * k + 1)); s += ts; tc = -tc * x2 / ((2 * k - 1) * (2 * k)); c += tc; }
    if (cuad === 0) return [s, c];
    if (cuad === 1) return [c, -s];
    return cuad === 2 ? [-s, -c] : [-c, s];
  }
  // atan para |t| ≤ tan 22.5°.
  function atanSerie(t) { const t2 = t * t; let term = t, suma = t; for (let k = 1; k <= 16; k++) { term = -term * t2; suma += term / (2 * k + 1); } return suma; }
  const atan01 = z => z > 0.41421356237309503 ? PI / 4 + atanSerie((z - 1) / (z + 1)) : atanSerie(z);
  // Ángulo de (x, y) en décimas de grado enteras 0…3599 (0 = +x; crece hacia +y).
  function atan2Dec(y, x) {
    if (x === 0 && y === 0) return 0;
    const ax = Math.abs(x), ay = Math.abs(y);
    let a = ax >= ay ? atan01(ay / ax) : PI / 2 - atan01(ax / ay);
    if (x < 0) a = PI - a;
    if (y < 0) a = -a;
    let d = Math.round(a * 1800 / PI) % 3600; if (d < 0) d += 3600;
    return d;
  }
  // Distancia de (px, py) al segmento a–b.
  function distSeg(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
    let t = l2 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0; t = acotar(t, 0, 1);
    const ex = ax + dx * t - px, ey = ay + dy * t - py;
    return Math.sqrt(ex * ex + ey * ey);
  }
  const clonar = o => JSON.parse(JSON.stringify(o)); // NOSONAR: copia con JSON a propósito: normaliza -0, NaN e Infinity como la red; la simulación es determinista

  /* Línea de turnos de una partida de sala 1 vs 1 por tiros (design.md §4).
     o.motor: { inicial(seed), turno(st) → 0|1, fin(st), aplicar(st, tiro) → { st, ms }, rendir(st, idx), tiroBot(st, nivel, rnd) }
     o.orden: [{ id, bot }] (índice = lugar en la mesa); o.jugadas: [{ n, accion, …, t, jugador }] del servidor.
     o.inicio y o.ahora en hora del servidor. Devuelve la historia de tiros, el estado, el fin y a quién se espera. */
  function linea(o) {
    const { motor, seed, orden, inicio, ahora, turnoMs, botMs } = o;
    const gracia = o.gracia === undefined ? 3000 : o.gracia, nivelBot = o.nivelBot || 'medio';
    const cache = o.cache || {};
    if (cache.seed !== seed) { cache.seed = seed; cache.st0 = motor.inicial(seed); cache.pasos = []; }
    const porN = new Map();
    for (const j of o.jugadas || []) if (!porN.has(j.n)) porN.set(j.n, j);
    let st = cache.st0, T0 = inicio, paso = 0, espera = null;
    const historia = [];
    while (!motor.fin(st) && paso < 2000) {
      const idx = motor.turno(st), p = orden[idx] || {};
      const lim = T0 + turnoMs;
      let tiro = null, t = 0, origen = '';
      if (p.bot) {
        t = T0 + botMs;
        if (ahora < t) { espera = { idx, tipo: 'bot', t }; break; }
        origen = 'bot';
      } else {
        const j = porN.get(paso);
        // futbolito-equipos: el motor puede rechazar una jugada (p. ej. un tiro con una barra que no tiene la pelota).
        if (j && j.jugador === p.id && j.t <= lim && (!motor.valida || motor.valida(st, j))) {
          t = Math.max(T0, j.t); origen = 'jugada';
          tiro = j.accion === 'rendirse' ? { rendirse: true } : motor.tiroDe(j);
        } else if (ahora >= lim + gracia) { t = lim; origen = 'auto'; }
        else { espera = { idx, tipo: 'persona', limite: lim }; break; }
      }
      // Bots y tiro automático: deterministas con la semilla y el paso.
      if (!tiro) tiro = motor.tiroBot(st, origen === 'bot' ? nivelBot : 'auto', rng(seed, origen + '|' + paso));
      const firma = idx + ':' + JSON.stringify(tiro);
      let reg = cache.pasos[paso];
      if (!reg || reg.firma !== firma) {
        cache.pasos.length = paso; // lo que sigue ya no vale
        const r = tiro.rendirse ? { st: motor.rendir(st, idx), ms: 0 } : motor.aplicar(st, tiro);
        reg = cache.pasos[paso] = { firma, st: r.st, ms: r.ms };
      }
      historia.push({ paso, idx, origen, tiro, t, ms: reg.ms, antes: st, despues: reg.st });
      st = reg.st; T0 = t + reg.ms; paso++;
    }
    return { st, historia, paso, T0, fin: motor.fin(st), turno: motor.fin(st) ? null : motor.turno(st), espera };
  }

  raiz.Fisica = { PI, fnv, mulberry, rng, q, acotar, senCos, atan2Dec, distSeg, clonar, linea };
})(typeof window !== 'undefined' ? window : globalThis);
