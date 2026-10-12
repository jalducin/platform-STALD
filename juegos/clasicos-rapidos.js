// Motor de los clásicos rápidos (openspec: clasicos-rapidos): Gato, Conecta 4, Piedra-papel-tijera, Ahorcado en inglés y
// Serpientes y escaleras. Sin DOM: lo usan juegos.html (vía juegos/clasicos-rapidos-ui.js) y las pruebas de Deno
// (server/clasicos_rapidos_motor_test.ts). Incluye la reproducción determinista de cada sala a partir de las jugadas.
(function (g) {
  'use strict';

  // ---------- Azar con semilla (igual que rngDe en juegos.html) ----------
  function fnv(s) { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
  function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const rng = (seed, etiqueta) => mulberry(fnv(seed + '|' + etiqueta));
  const alAzar = (lista, r) => lista[Math.floor(r() * lista.length)];

  // ---------- ❌⭕ Gato ----------
  const GATO_LINEAS = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
  const otraFicha = f => f === 'X' ? 'O' : 'X';
  function gatoGanador(t) {
    for (const l of GATO_LINEAS) if (t[l[0]] && t[l[0]] === t[l[1]] && t[l[0]] === t[l[2]]) return { gana: t[l[0]], linea: l };
    return t.every(Boolean) ? { empate: true } : null;
  }
  const libres = t => t.map((v, i) => v ? -1 : i).filter(i => i >= 0);
  // Minimax completo (9 casillas): +10 − profundidad si gana `yo`, −10 + profundidad si pierde, 0 empate.
  function gatoValor(t, turno, yo, prof) {
    const r = gatoGanador(t);
    if (r) return r.empate ? 0 : r.gana === yo ? 10 - prof : prof - 10;
    let mejor = turno === yo ? -Infinity : Infinity;
    for (const i of libres(t)) {
      t[i] = turno; const v = gatoValor(t, otraFicha(turno), yo, prof + 1); t[i] = null;
      mejor = turno === yo ? Math.max(mejor, v) : Math.min(mejor, v);
    }
    return mejor;
  }
  function gatoMejores(t, ficha) {
    let mejor = -Infinity, mejores = [];
    const u = t.slice();
    for (const i of libres(u)) {
      u[i] = ficha; const v = gatoValor(u, otraFicha(ficha), ficha, 1); u[i] = null;
      if (v > mejor) { mejor = v; mejores = [i]; } else if (v === mejor) mejores.push(i);
    }
    return mejores;
  }
  const gatoQueGana = (t, ficha) => libres(t).find(i => { const u = t.slice(); u[i] = ficha; return gatoGanador(u) && gatoGanador(u).gana === ficha; });
  // nivel 1 fácil: al azar · 2 medio: gana o bloquea y la mitad de las veces juega perfecto · 3 difícil: minimax.
  function gatoBot(t, ficha, nivel, r) {
    const l = libres(t);
    if (nivel <= 1) return alAzar(l, r);
    if (nivel === 2) {
      const gana = gatoQueGana(t, ficha); if (gana !== undefined) return gana;
      const bloquea = gatoQueGana(t, otraFicha(ficha)); if (bloquea !== undefined) return bloquea;
      return r() < 0.5 ? alAzar(gatoMejores(t, ficha), r) : alAzar(l, r);
    }
    return alAzar(gatoMejores(t, ficha), r);
  }

  // ---------- 🔴 Conecta 4 (7 × 6; índice = fila × 7 + columna, fila 0 arriba) ----------
  const C4_COLS = 7, C4_FILAS = 6;
  const c4Vacio = () => Array(C4_COLS * C4_FILAS).fill(null);
  function c4Fila(t, col) { for (let f = C4_FILAS - 1; f >= 0; f--) if (!t[f * C4_COLS + col]) return f; return -1; }
  function c4Soltar(t, col, ficha) {
    if (!Number.isInteger(col) || col < 0 || col >= C4_COLS) return null;
    const fila = c4Fila(t, col); if (fila < 0) return null;
    const u = t.slice(); u[fila * C4_COLS + col] = ficha;
    return { t: u, fila };
  }
  const C4_DIRS = [[0, 1], [1, 0], [1, 1], [1, -1]];
  function c4Ganador(t) {
    for (let i = 0; i < t.length; i++) {
      if (!t[i]) continue;
      const f = Math.floor(i / C4_COLS), c = i % C4_COLS;
      for (const [df, dc] of C4_DIRS) {
        const linea = [];
        for (let k = 0; k < 4; k++) { const ff = f + df * k, cc = c + dc * k; if (ff < 0 || ff >= C4_FILAS || cc < 0 || cc >= C4_COLS || t[ff * C4_COLS + cc] !== t[i]) break; linea.push(ff * C4_COLS + cc); }
        if (linea.length === 4) return { gana: t[i], linea };
      }
    }
    return t.every(Boolean) ? { empate: true } : null;
  }
  const c4Validas = t => [3, 2, 4, 1, 5, 0, 6].filter(c => c4Fila(t, c) >= 0); // del centro hacia afuera
  const c4GanaCon = (t, col, ficha) => { const s = c4Soltar(t, col, ficha); const r = s && c4Ganador(s.t); return !!(r && r.gana === ficha); };
  // Heurística: ventanas de 4 con fichas propias y huecos, y control del centro.
  function c4Evaluar(t, yo) {
    const tu = yo === 'R' ? 'A' : 'R';
    let v = 0;
    for (let f = 0; f < C4_FILAS; f++) if (t[f * C4_COLS + 3] === yo) v += 3; else if (t[f * C4_COLS + 3] === tu) v -= 3;
    for (let f = 0; f < C4_FILAS; f++) for (let c = 0; c < C4_COLS; c++) for (const [df, dc] of C4_DIRS) {
      const ff = f + df * 3, cc = c + dc * 3;
      if (ff < 0 || ff >= C4_FILAS || cc < 0 || cc >= C4_COLS) continue;
      let mias = 0, suyas = 0;
      for (let k = 0; k < 4; k++) { const x = t[(f + df * k) * C4_COLS + c + dc * k]; if (x === yo) mias++; else if (x === tu) suyas++; }
      if (mias && suyas) continue;
      if (mias === 3) v += 5; else if (mias === 2) v += 2;
      if (suyas === 3) v -= 4; else if (suyas === 2) v -= 1;
    }
    return v;
  }
  // Negamax con poda alfa-beta, desde quien mueve (`turno`). Perder antes vale menos.
  function c4Negamax(t, prof, alfa, beta, turno) {
    const r = c4Ganador(t);
    if (r) return r.empate ? 0 : -(100000 + prof); // solo pudo ganar quien acaba de mover
    if (prof === 0) return c4Evaluar(t, turno);
    let mejor = -Infinity;
    for (const c of c4Validas(t)) {
      const v = -c4Negamax(c4Soltar(t, c, turno).t, prof - 1, -beta, -alfa, turno === 'R' ? 'A' : 'R');
      if (v > mejor) mejor = v;
      if (v > alfa) alfa = v;
      if (alfa >= beta) break;
    }
    return mejor;
  }
  // nivel 1: gana o bloquea; si no, al azar con preferencia al centro · 2: minimax a 4 · 3: minimax a 6.
  function c4Bot(t, ficha, nivel, r) {
    const tu = ficha === 'R' ? 'A' : 'R', validas = c4Validas(t);
    const gana = validas.find(c => c4GanaCon(t, c, ficha)); if (gana !== undefined) return gana;
    const bloquea = validas.find(c => c4GanaCon(t, c, tu)); if (bloquea !== undefined) return bloquea;
    if (nivel <= 1) {
      const pesos = validas.map(c => 4 - Math.abs(3 - c));
      let x = r() * pesos.reduce((a, b) => a + b, 0);
      for (let k = 0; k < validas.length; k++) { x -= pesos[k]; if (x < 0) return validas[k]; }
      return validas[0];
    }
    const prof = nivel === 2 ? 4 : 6;
    let mejor = -Infinity, mejores = [];
    for (const c of validas) {
      const v = -c4Negamax(c4Soltar(t, c, ficha).t, prof - 1, -Infinity, Infinity, tu);
      if (v > mejor) { mejor = v; mejores = [c]; } else if (v === mejor) mejores.push(c);
    }
    return mejores.length > 1 && r() < 0.3 ? alAzar(mejores, r) : mejores[0];
  }

  // ---------- ✊ Piedra, papel o tijera ----------
  const PPT = ['piedra', 'papel', 'tijera'];
  const VENCE = { piedra: 'tijera', papel: 'piedra', tijera: 'papel' };
  // 1 si a vence a b, −1 si pierde, 0 empate. No elegir (null, "pasar" o "?") pierde contra cualquier elección.
  function pptGana(a, b) {
    const va = PPT.includes(a), vb = PPT.includes(b);
    if (!va || !vb) return va === vb ? 0 : va ? 1 : -1;
    return a === b ? 0 : VENCE[a] === b ? 1 : -1;
  }
  // Bot: elige antes de ver la jugada. A veces le gana a la última elección del rival; si no, al azar.
  function pptBot(historialRival, r) {
    const ultima = historialRival && historialRival[historialRival.length - 1];
    if (ultima && PPT.includes(ultima) && r() < 0.35) return PPT.find(x => VENCE[x] === ultima);
    return alAzar(PPT, r);
  }

  // ---------- 🪢 Ahorcado en inglés ----------
  const AH_ERRORES = 6;
  const ahorcadoPalabras = vocab => (vocab || []).filter(x => x && /^[a-z]{3,10}$/.test(x.en));
  function ahorcadoEstado(palabra, letras) {
    const mascara = [...palabra].map(ch => letras.includes(ch) ? ch : null);
    const errores = letras.filter(l => !palabra.includes(l)).length;
    const resuelta = mascara.every(Boolean);
    return { mascara, errores, resuelta, perdida: !resuelta && errores >= AH_ERRORES };
  }
  const FRECUENCIA_EN = 'etaoinshrdlcumwfgypbvkjxqz';
  function ahorcadoBot(usadas, r) {
    const quedan = [...FRECUENCIA_EN].filter(l => !usadas.includes(l));
    const salto = r() < 0.35 ? 1 + Math.floor(r() * 4) : 0;
    return quedan[Math.min(salto, quedan.length - 1)];
  }

  // ---------- 🐍 Serpientes y escaleras (tablero clásico de 100 casillas) ----------
  const SERP_ESCALERAS = { 1: 38, 4: 14, 9: 31, 21: 42, 28: 84, 36: 44, 51: 67, 71: 91, 80: 100 };
  const SERP_SERPIENTES = { 16: 6, 47: 26, 49: 11, 56: 53, 62: 19, 64: 60, 87: 24, 93: 73, 95: 75, 98: 78 };
  const serpDado = r => 1 + Math.floor(r() * 6);
  // Se llega a la meta aunque sobren puntos (más corto para jugar en clase).
  function serpMover(pos, dado) {
    const paso = Math.min(100, pos + dado);
    const hasta = SERP_ESCALERAS[paso] || SERP_SERPIENTES[paso] || paso;
    return { desde: pos, paso, hasta, salto: SERP_ESCALERAS[paso] ? 'escalera' : SERP_SERPIENTES[paso] ? 'serpiente' : null };
  }
  // Fila (0 arriba) y columna de una casilla: la 1 abajo a la izquierda y cada renglón cambia de sentido.
  function serpCelda(n) {
    const r = Math.floor((n - 1) / 10), k = (n - 1) % 10;
    return { fila: 9 - r, col: r % 2 ? 9 - k : k };
  }

  // ---------- Reproducción de salas ----------
  // ctx = { orden: [{ id, bot? }], jugadas: [{ jugador, n, accion, …, t }], inicio, ahora, dur(ms), rng(etiqueta) }.
  // Turnos: se espera la jugada del paso actual de quien tiene el turno (t ≤ T0 + turno). Una jugada inválida se ignora
  // (avanza el paso); al vencer el tiempo hay jugada automática a la hora límite. Los bots juegan a T0 + su ritmo.
  // st.esperaHasta: pausa entre rondas o palabras (g.reanudar prepara la siguiente).
  function recorrer(ctx, st, g) {
    const jugs = new Map();
    for (const x of ctx.jugadas || []) if (!jugs.has(x.n)) jugs.set(x.n, x);
    for (let guard = 0; guard < 6000 && !st.fin; guard++) {
      if (st.esperaHasta !== null) {
        if (ctx.ahora < st.esperaHasta) break;
        st.T0 = st.esperaHasta; st.esperaHasta = null; g.reanudar(st);
        continue;
      }
      const j = st.turnoIdx, p = ctx.orden[j], n = st.paso;
      if (p.bot) {
        const t = st.T0 + ctx.dur(g.botMs); if (ctx.ahora < t) break;
        const mv = g.bot(st, j, n);
        st.paso++; st.T0 = t; g.aplicar(st, j, mv, t, n);
        continue;
      }
      const lim = st.T0 + ctx.dur(g.turnoMs), mv = jugs.get(n);
      if (mv && mv.jugador === p.id && mv.t <= lim) {
        st.paso++;
        if (g.valida(st, j, mv)) { const t = Math.max(mv.t, st.T0); st.T0 = t; g.aplicar(st, j, mv, t, n); }
        continue;
      }
      if (ctx.ahora >= lim) { st.paso++; st.T0 = lim; g.aplicar(st, j, Object.assign(g.auto(st, j, n), { auto: true }), lim, n); continue; }
      break;
    }
    st.lim = st.fin || st.esperaHasta !== null ? null : st.T0 + ctx.dur(ctx.orden[st.turnoIdx] && ctx.orden[st.turnoIdx].bot ? g.botMs : g.turnoMs);
    return st;
  }
  const entero = (x, min, max) => Number.isInteger(x) && x >= min && x <= max;

  // Gato en sala: 3 rondas; orden[0] juega con ❌ y orden[1] con ⭕; empieza ❌ y luego alterna.
  const GATO_SALA = { rondas: 3, turno: 20000, bot: 1200, pausa: 3000, gana: 300, empate: 120 };
  function salaGato(ctx) {
    const C = GATO_SALA, ficha = j => j === 0 ? 'X' : 'O';
    const st = { juego: 'gato', t: Array(9).fill(null), ronda: 0, turnoIdx: 0, paso: 0, T0: ctx.inicio, puntos: [0, 0], victorias: [0, 0], empates: 0, resultados: [], ultima: null, esperaHasta: null, fin: null, ficha };
    return recorrer(ctx, st, {
      turnoMs: C.turno, botMs: C.bot,
      bot: (s, j, n) => ({ accion: 'marcar', casilla: gatoBot(s.t, ficha(j), 3, ctx.rng('gato-bot' + n)) }),
      auto: (s, _j, n) => ({ accion: 'marcar', casilla: alAzar(libres(s.t), ctx.rng('gato-auto' + n)) }),
      valida: (s, _j, mv) => mv.accion === 'marcar' && entero(mv.casilla, 0, 8) && !s.t[mv.casilla],
      aplicar: (s, j, mv, t) => {
        s.t[mv.casilla] = ficha(j); s.ultima = { j, casilla: mv.casilla, auto: !!mv.auto, t };
        const r = gatoGanador(s.t);
        if (!r) { s.turnoIdx = 1 - j; return; }
        s.resultados.push({ ronda: s.ronda, gana: r.empate ? null : j, linea: r.linea || null, t });
        if (r.empate) { s.empates++; s.puntos[0] += C.empate; s.puntos[1] += C.empate; } else { s.victorias[j]++; s.puntos[j] += C.gana; }
        if (s.ronda + 1 >= C.rondas) s.fin = { t, gana: s.puntos[0] === s.puntos[1] ? null : s.puntos[0] > s.puntos[1] ? 0 : 1 };
        else s.esperaHasta = t + ctx.dur(C.pausa);
      },
      reanudar: s => { s.ronda++; s.t = Array(9).fill(null); s.turnoIdx = s.ronda % 2; s.ultima = null; },
    });
  }

  // Conecta 4 en sala: 1 partida; orden[0] = 🔴 (R) empieza.
  const C4_SALA = { turno: 25000, bot: 1500, gana: 800, empate: 400, pierde: 100 };
  function salaConecta4(ctx) {
    const C = C4_SALA, ficha = j => j === 0 ? 'R' : 'A';
    const st = { juego: 'conecta4', t: c4Vacio(), turnoIdx: 0, paso: 0, T0: ctx.inicio, puntos: [0, 0], ultima: null, linea: null, esperaHasta: null, fin: null, ficha };
    return recorrer(ctx, st, {
      turnoMs: C.turno, botMs: C.bot,
      bot: (s, j, n) => ({ accion: 'soltar', col: c4Bot(s.t, ficha(j), 2, ctx.rng('c4-bot' + n)) }),
      auto: (s, j, n) => ({ accion: 'soltar', col: c4Bot(s.t, ficha(j), 1, ctx.rng('c4-auto' + n)) }),
      valida: (s, _j, mv) => mv.accion === 'soltar' && entero(mv.col, 0, C4_COLS - 1) && c4Fila(s.t, mv.col) >= 0,
      aplicar: (s, j, mv, t) => {
        const r0 = c4Soltar(s.t, mv.col, ficha(j));
        s.t = r0.t; s.ultima = { j, col: mv.col, fila: r0.fila, auto: !!mv.auto, t };
        const r = c4Ganador(s.t);
        if (!r) { s.turnoIdx = 1 - j; return; }
        s.linea = r.linea || null;
        s.fin = { t, gana: r.empate ? null : j };
        s.puntos = r.empate ? [C.empate, C.empate] : [0, 1].map(k => k === j ? C.gana : C.pierde);
      },
      reanudar: () => {},
    });
  }

  // Piedra, papel o tijera en sala: 5 rondas simultáneas, todos contra todos.
  const PPT_SALA = { rondas: 5, ventana: 12000, revela: 4000, total: 800, bono: 200 };
  function salaPpt(ctx) {
    const C = PPT_SALA, orden = ctx.orden, N = orden.length;
    const porJugador = new Map(orden.map(p => [p.id, new Map()]));
    for (const x of ctx.jugadas || []) { const m = porJugador.get(x.jugador); if (m && !m.has(x.n)) m.set(x.n, x); }
    const rondas = [];
    let ini = ctx.inicio;
    for (let r = 0; r < C.rondas; r++) {
      const lim = ini + ctx.dur(C.ventana);
      const subs = orden.map(p => { if (p.bot) return null; const x = porJugador.get(p.id).get(r); return x && x.t <= lim ? x : null; });
      const humanos = orden.map((_p, i) => i).filter(i => !orden[i].bot);
      const todos = humanos.length > 0 && humanos.every(i => subs[i]);
      const cierre = todos ? Math.max(ini, Math.min(lim, Math.max(...humanos.map(i => subs[i].t)))) : lim;
      const elecciones = orden.map((p, i) => p.bot ? pptBot(null, ctx.rng(p.id + '|ppt' + r)) : subs[i] && subs[i].accion === 'elegir' ? subs[i].eleccion : null);
      rondas.push({ r, ini, lim, cierre, revelaHasta: cierre + ctx.dur(C.revela), elecciones, eligio: orden.map((p, i) => !!(p.bot || subs[i])) });
      ini = cierre + ctx.dur(C.revela);
    }
    const victorias = orden.map(() => 0);
    let ocultas = false;
    for (const ro of rondas) {
      ro.victorias = orden.map(() => 0);
      if (ctx.ahora < ro.cierre) continue; // aún abierta
      if (ro.elecciones.includes('?')) ocultas = true;
      for (let i = 0; i < N; i++) for (let k = 0; k < N; k++) if (i !== k && pptGana(ro.elecciones[i], ro.elecciones[k]) === 1) { ro.victorias[i]++; victorias[i]++; }
    }
    const actual = rondas.findIndex(ro => ctx.ahora < ro.revelaHasta);
    const fase = actual < 0 ? 'fin' : ctx.ahora < rondas[actual].cierre ? 'elegir' : 'revelar';
    const max = Math.max(...victorias);
    const puntos = victorias.map(v => Math.round(C.total * v / (C.rondas * Math.max(1, N - 1))) + (max > 0 && v === max ? C.bono : 0));
    return { juego: 'ppt', rondas, ronda: actual < 0 ? C.rondas - 1 : actual, fase, victorias, puntos, ocultas, fin: fase === 'fin' ? { t: rondas[C.rondas - 1].revelaHasta } : null };
  }

  // Ahorcado en sala: las mismas palabras para todos, por turnos. modo "compite" (quien acierta sigue; +50 a quien la
  // completa) o "coop" (el turno rota; +50 para todos si la adivinan). +10 por cada aparición de la letra acertada.
  const AH_SALA = { turno: 20000, bot: 1800, pausa: 3500, letra: 10, palabra: 50 };
  function salaAhorcado(ctx) {
    const C = AH_SALA, N = ctx.orden.length, coop = ctx.modo === 'coop';
    const st = { juego: 'ahorcado', w: 0, letras: [], turnoIdx: 0, paso: 0, T0: ctx.inicio, puntos: ctx.orden.map(() => 0), aciertos: ctx.orden.map(() => 0), resultados: [], ultima: null, esperaHasta: null, fin: null, modo: coop ? 'coop' : 'compite' };
    const palabra = s => ctx.palabras[s.w].en;
    const cerrar = (s, t, datos) => {
      s.resultados.push(Object.assign({ w: s.w, palabra: palabra(s), t }, datos));
      if (s.w + 1 >= ctx.palabras.length) s.fin = { t }; else s.esperaHasta = t + ctx.dur(C.pausa);
    };
    recorrer(ctx, st, {
      turnoMs: C.turno, botMs: C.bot,
      bot: (s, j, n) => ({ accion: 'letra', letra: ahorcadoBot(s.letras, ctx.rng(ctx.orden[j].id + '|ah' + n)) }),
      auto: () => ({ accion: 'pasar' }),
      valida: (s, _j, mv) => mv.accion === 'pasar' || (mv.accion === 'letra' && typeof mv.letra === 'string' && /^[a-z]$/.test(mv.letra) && !s.letras.includes(mv.letra)),
      aplicar: (s, j, mv, t) => {
        if (mv.accion === 'pasar') { s.ultima = { j, accion: 'pasar', auto: !!mv.auto, t }; s.turnoIdx = (j + 1) % N; return; }
        s.letras.push(mv.letra);
        const veces = [...palabra(s)].filter(ch => ch === mv.letra).length;
        s.ultima = { j, accion: 'letra', letra: mv.letra, veces, t };
        if (veces) { s.puntos[j] += C.letra * veces; s.aciertos[j] += veces; }
        const e = ahorcadoEstado(palabra(s), s.letras);
        if (e.resuelta) {
          if (coop) s.puntos = s.puntos.map(x => x + C.palabra); else s.puntos[j] += C.palabra;
          s.turnoIdx = (j + 1) % N;
          return cerrar(s, t, { resuelta: true, perdida: false, por: j });
        }
        if (e.perdida) { s.turnoIdx = (j + 1) % N; return cerrar(s, t, { resuelta: false, perdida: true, por: null }); }
        if (!(veces && !coop)) s.turnoIdx = (j + 1) % N;
      },
      reanudar: s => { s.w++; s.letras = []; s.ultima = null; },
    });
    st.estado = ahorcadoEstado(palabra(st), st.letras);
    return st;
  }

  // Serpientes y escaleras en sala: de 2 a 4; el dado sale de la semilla y del paso; con 6 se repite turno.
  const SERP_SALA = { turno: 15000, bot: 1400, maxTiros: 240, gana: 700, porCasilla: 4 };
  const serpPuntos = (pos, gana) => pos.map((p, i) => i === gana ? SERP_SALA.gana : p * SERP_SALA.porCasilla);
  function salaSerpientes(ctx) {
    const C = SERP_SALA, N = ctx.orden.length;
    const st = { juego: 'serpientes', pos: ctx.orden.map(() => 0), turnoIdx: 0, paso: 0, T0: ctx.inicio, tiros: 0, ultima: null, esperaHasta: null, fin: null, puntos: ctx.orden.map(() => 0) };
    recorrer(ctx, st, {
      turnoMs: C.turno, botMs: C.bot,
      bot: () => ({ accion: 'tirar' }),
      auto: () => ({ accion: 'tirar' }),
      valida: (_s, _j, mv) => mv.accion === 'tirar',
      aplicar: (s, j, mv, t, n) => {
        const dado = serpDado(ctx.rng('dado' + n));
        const m = serpMover(s.pos[j], dado);
        s.pos[j] = m.hasta; s.tiros++;
        s.ultima = Object.assign({ j, dado, n, auto: !!mv.auto, t }, m);
        if (m.hasta === 100) s.fin = { t, gana: j };
        else if (s.tiros >= C.maxTiros) { const max = Math.max(...s.pos); s.fin = { t, gana: s.pos.indexOf(max) }; }
        else if (dado !== 6) s.turnoIdx = (j + 1) % N;
      },
      reanudar: () => {},
    });
    st.puntos = st.fin ? serpPuntos(st.pos, st.fin.gana) : st.pos.map(p => p * C.porCasilla);
    return st;
  }

  g.ClasicosRapidos = {
    rng, fnv, mulberry,
    GATO_LINEAS, gatoGanador, gatoBot,
    C4_COLS, C4_FILAS, c4Vacio, c4Fila, c4Soltar, c4Ganador, c4Bot,
    PPT, pptGana, pptBot,
    AH_ERRORES, ahorcadoPalabras, ahorcadoEstado, ahorcadoBot,
    SERP_ESCALERAS, SERP_SERPIENTES, serpDado, serpMover, serpCelda, serpPuntos,
    GATO_SALA, C4_SALA, PPT_SALA, AH_SALA, SERP_SALA,
    salaGato, salaConecta4, salaPpt, salaAhorcado, salaSerpientes,
  };
})(typeof window !== 'undefined' ? window : globalThis);
