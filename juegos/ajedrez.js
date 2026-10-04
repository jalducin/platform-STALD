// Motor de ajedrez (openspec: ajedrez). Sin DOM: lo usan juegos.html y las pruebas de Deno (server/ajedrez_test.ts).
// Tablero 0x88 (128 casillas; fila 0 = rango 8). Piezas: mayúsculas blancas, minúsculas negras.
(function (g) {
  'use strict';
  const INICIAL = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  const FILAS = 'abcdefgh';
  const casilla = sq => FILAS[sq & 7] + (8 - (sq >> 4));
  const sqDe = s => (8 - Number(s[1])) * 16 + FILAS.indexOf(s[0]);
  const colorDe = p => p === p.toUpperCase() ? 'w' : 'b';
  const otro = c => c === 'w' ? 'b' : 'w';
  const N_OFF = [-33, -31, -18, -14, 14, 18, 31, 33], K_OFF = [-17, -16, -15, -1, 1, 15, 16, 17];
  const DIAG = [-17, -15, 15, 17], ORTO = [-16, -1, 1, 16];
  const E1 = sqDe('e1'), E8 = sqDe('e8');

  // ---------- FEN ----------
  function colocacion(t) {
    let s = '';
    for (let f = 0; f < 8; f++) {
      let vac = 0;
      for (let c = 0; c < 8; c++) { const p = t[f * 16 + c]; if (!p) vac++; else { if (vac) { s += vac; vac = 0; } s += p; } }
      if (vac) s += vac;
      if (f < 7) s += '/';
    }
    return s;
  }
  const clave = st => colocacion(st.t) + ' ' + st.turno + ' ' + st.enroques + ' ' + st.ep;
  function desdeFEN(fen) {
    const [col, turno, enr, ep, medio, num] = fen.trim().split(/\s+/);
    const t = new Array(128).fill(null);
    col.split('/').forEach((fila, f) => { let c = 0; for (const ch of fila) { if (/\d/.test(ch)) c += Number(ch); else t[f * 16 + c++] = ch; } });
    const st = { t, turno: turno || 'w', enroques: enr && enr !== '-' ? enr : '', ep: ep && ep !== '-' ? sqDe(ep) : -1, medio: Number(medio) || 0, num: Number(num) || 1, claves: [] };
    st.claves = [clave(st)];
    return st;
  }
  const aFEN = st => colocacion(st.t) + ' ' + st.turno + ' ' + (st.enroques || '-') + ' ' + (st.ep >= 0 ? casilla(st.ep) : '-') + ' ' + st.medio + ' ' + st.num;

  // ---------- Ataques y jugadas ----------
  function atacada(t, sq, por) {
    const blanco = por === 'w';
    for (const d of blanco ? [15, 17] : [-15, -17]) { const x = sq + d; if (!(x & 0x88) && t[x] === (blanco ? 'P' : 'p')) return true; }
    for (const d of N_OFF) { const x = sq + d; if (!(x & 0x88) && t[x] === (blanco ? 'N' : 'n')) return true; }
    for (const d of K_OFF) { const x = sq + d; if (!(x & 0x88) && t[x] === (blanco ? 'K' : 'k')) return true; }
    for (const [dirs, piezas] of [[DIAG, blanco ? 'BQ' : 'bq'], [ORTO, blanco ? 'RQ' : 'rq']]) {
      for (const d of dirs) {
        for (let x = sq + d; !(x & 0x88); x += d) { const p = t[x]; if (p) { if (piezas.includes(p)) return true; break; } }
      }
    }
    return false;
  }
  const reyDe = (t, c) => { const k = c === 'w' ? 'K' : 'k'; for (let s = 0; s < 128; s++) if (!(s & 0x88) && t[s] === k) return s; return -1; };
  const enJaque = st => atacada(st.t, reyDe(st.t, st.turno), otro(st.turno));

  function pseudo(st) {
    const t = st.t, c = st.turno, ms = [];
    const enemigo = x => t[x] && colorDe(t[x]) !== c;
    const agregar = (de, a, extra) => ms.push(Object.assign({ de, a, captura: !!t[a] }, extra));
    for (let s = 0; s < 128; s++) {
      if (s & 0x88) { s += 7; continue; }
      const p = t[s]; if (!p || colorDe(p) !== c) continue;
      const tipo = p.toLowerCase();
      if (tipo === 'p') {
        const dir = c === 'w' ? -16 : 16, ini = c === 'w' ? 6 : 1, ult = c === 'w' ? 0 : 7;
        const coronar = (a, extra) => { if ((a >> 4) === ult) for (const pr of 'qrbn') agregar(s, a, Object.assign({ promo: pr }, extra)); else agregar(s, a, extra); };
        const uno = s + dir;
        if (!(uno & 0x88) && !t[uno]) {
          coronar(uno);
          const dos = uno + dir;
          if ((s >> 4) === ini && !t[dos]) agregar(s, dos, { doble: true });
        }
        for (const d of [dir - 1, dir + 1]) {
          const a = s + d; if (a & 0x88) continue;
          if (enemigo(a)) coronar(a);
          else if (a === st.ep) agregar(s, a, { ep: true, captura: true });
        }
      } else if (tipo === 'n' || tipo === 'k') {
        for (const d of tipo === 'n' ? N_OFF : K_OFF) { const a = s + d; if (!(a & 0x88) && (!t[a] || enemigo(a))) agregar(s, a); }
        if (tipo === 'k' && s === (c === 'w' ? E1 : E8)) {
          const r = c === 'w' ? 'R' : 'r', o = otro(c), en = st.enroques;
          if (en.includes(c === 'w' ? 'K' : 'k') && !t[s + 1] && !t[s + 2] && t[s + 3] === r && !atacada(t, s, o) && !atacada(t, s + 1, o) && !atacada(t, s + 2, o)) agregar(s, s + 2, { enroque: 'K' });
          if (en.includes(c === 'w' ? 'Q' : 'q') && !t[s - 1] && !t[s - 2] && !t[s - 3] && t[s - 4] === r && !atacada(t, s, o) && !atacada(t, s - 1, o) && !atacada(t, s - 2, o)) agregar(s, s - 2, { enroque: 'Q' });
        }
      } else {
        const dirs = tipo === 'b' ? DIAG : tipo === 'r' ? ORTO : DIAG.concat(ORTO);
        for (const d of dirs) for (let a = s + d; !(a & 0x88); a += d) { if (!t[a]) agregar(s, a); else { if (enemigo(a)) agregar(s, a); break; } }
      }
    }
    return ms;
  }

  function aplicar(st, m, sinClave) {
    const t = st.t.slice(), p = t[m.de], c = st.turno, blanco = c === 'w';
    t[m.a] = m.promo ? (blanco ? m.promo.toUpperCase() : m.promo) : p; t[m.de] = null;
    if (m.ep) t[m.a + (blanco ? 16 : -16)] = null;
    if (m.enroque) { const fila = blanco ? 7 : 0, r = blanco ? 'R' : 'r'; if (m.enroque === 'K') { t[fila * 16 + 7] = null; t[fila * 16 + 5] = r; } else { t[fila * 16] = null; t[fila * 16 + 3] = r; } }
    let en = st.enroques;
    if (p === 'K') en = en.replace(/[KQ]/g, ''); if (p === 'k') en = en.replace(/[kq]/g, '');
    for (const [sq, l] of [[sqDe('a1'), 'Q'], [sqDe('h1'), 'K'], [sqDe('a8'), 'q'], [sqDe('h8'), 'k']]) if (m.de === sq || m.a === sq) en = en.replace(l, '');
    const n = { t, turno: otro(c), enroques: en, ep: m.doble ? (m.de + m.a) / 2 : -1, medio: p.toLowerCase() === 'p' || m.captura ? 0 : st.medio + 1, num: c === 'b' ? st.num + 1 : st.num, claves: st.claves };
    if (!sinClave) n.claves = st.claves.concat(clave(n));
    return n;
  }

  function legales(st) {
    const c = st.turno, o = otro(c);
    return pseudo(st).filter(m => { const n = aplicar(st, m, true); return !atacada(n.t, reyDe(n.t, c), o); });
  }
  function perft(st, d) {
    const L = legales(st);
    if (d <= 1) return L.length;
    let n = 0; for (const m of L) n += perft(aplicar(st, m, true), d - 1);
    return n;
  }

  function materialInsuficiente(t) {
    const otras = [];
    for (let s = 0; s < 128; s++) if (!(s & 0x88) && t[s] && t[s].toLowerCase() !== 'k') otras.push(t[s].toLowerCase());
    return otras.length === 0 || (otras.length === 1 && (otras[0] === 'n' || otras[0] === 'b'));
  }
  function resultado(st) {
    if (!legales(st).length) return enJaque(st) ? { fin: 'mate', gana: otro(st.turno) } : { fin: 'ahogado' };
    if (st.medio >= 100) return { fin: '50' };
    const k = st.claves[st.claves.length - 1];
    if (st.claves.filter(x => x === k).length >= 3) return { fin: 'repeticion' };
    if (materialInsuficiente(st.t)) return { fin: 'material' };
    return null;
  }

  // ---------- Notación algebraica en español ----------
  const LETRA = { n: 'C', b: 'A', r: 'T', q: 'D', k: 'R' };
  function san(st, m) {
    let s;
    if (m.enroque) s = m.enroque === 'K' ? 'O-O' : 'O-O-O';
    else {
      const tipo = st.t[m.de].toLowerCase();
      if (tipo === 'p') s = (m.captura ? FILAS[m.de & 7] + 'x' : '') + casilla(m.a) + (m.promo ? '=' + LETRA[m.promo] : '');
      else {
        const otros = legales(st).filter(x => x.a === m.a && x.de !== m.de && st.t[x.de] === st.t[m.de]);
        let dis = '';
        if (otros.length) {
          if (!otros.some(x => (x.de & 7) === (m.de & 7))) dis = FILAS[m.de & 7];
          else if (!otros.some(x => (x.de >> 4) === (m.de >> 4))) dis = String(8 - (m.de >> 4));
          else dis = casilla(m.de);
        }
        s = LETRA[tipo] + dis + (m.captura ? 'x' : '') + casilla(m.a);
      }
    }
    const n = aplicar(st, m, true);
    if (enJaque(n)) s += legales(n).length ? '+' : '#';
    return s;
  }
  function buscarJugada(st, de, a, promo) {
    const L = legales(st).filter(m => casilla(m.de) === de && casilla(m.a) === a);
    if (!L.length) return null;
    return L.find(m => !m.promo || m.promo === (promo || 'q')) || null;
  }

  // ---------- Bot: negamax con poda alfa-beta ----------
  const VALOR = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
  // Tablas de posición (blancas, de la fila 8 a la 1).
  const PST = {
    p: [0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 50, 50, 50, 10, 10, 20, 30, 30, 20, 10, 10, 5, 5, 10, 25, 25, 10, 5, 5, 0, 0, 0, 20, 20, 0, 0, 0, 5, -5, -10, 0, 0, -10, -5, 5, 5, 10, 10, -20, -20, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0],
    n: [-50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 0, 0, 0, -20, -40, -30, 0, 10, 15, 15, 10, 0, -30, -30, 5, 15, 20, 20, 15, 5, -30, -30, 0, 15, 20, 20, 15, 0, -30, -30, 5, 10, 15, 15, 10, 5, -30, -40, -20, 0, 5, 5, 0, -20, -40, -50, -40, -30, -30, -30, -30, -40, -50],
    b: [-20, -10, -10, -10, -10, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 10, 10, 5, 0, -10, -10, 5, 5, 10, 10, 5, 5, -10, -10, 0, 10, 10, 10, 10, 0, -10, -10, 10, 10, 10, 10, 10, 10, -10, -10, 5, 0, 0, 0, 0, 5, -10, -20, -10, -10, -10, -10, -10, -10, -20],
    r: [0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, 10, 10, 10, 10, 5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, 0, 0, 0, 5, 5, 0, 0, 0],
    q: [-20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 5, 5, 5, 0, -10, -5, 0, 5, 5, 5, 5, 0, -5, 0, 0, 5, 5, 5, 5, 0, -5, -10, 5, 5, 5, 5, 5, 0, -10, -10, 0, 5, 0, 0, 0, 0, -10, -20, -10, -10, -5, -5, -10, -10, -20],
    k: [-30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -20, -30, -30, -40, -40, -30, -30, -20, -10, -20, -20, -20, -20, -20, -20, -10, 20, 20, 0, 0, 0, 0, 20, 20, 20, 30, 10, 0, 0, 10, 30, 20],
  };
  function evaluar(st) { // desde el punto de vista de quien mueve
    let v = 0;
    for (let s = 0; s < 128; s++) {
      if (s & 0x88) { s += 7; continue; }
      const p = st.t[s]; if (!p) continue;
      const tipo = p.toLowerCase(), f = s >> 4, c = s & 7;
      const blanca = p !== tipo;
      const val = VALOR[tipo] + PST[tipo][(blanca ? f : 7 - f) * 8 + c];
      v += blanca ? val : -val;
    }
    return st.turno === 'w' ? v : -v;
  }
  const ordenar = (st, L) => L.map(m => ({ m, k: (m.promo ? 800 : 0) + (m.captura ? 10 * VALOR[(st.t[m.a] || 'p').toLowerCase()] - VALOR[st.t[m.de].toLowerCase()] / 10 + 50 : 0) }))
    .sort((a, b) => b.k - a.k).map(x => x.m);
  const MATE = 100000;
  function quietud(st, alfa, beta, prof) {
    const base = evaluar(st);
    if (base >= beta) return beta;
    if (base > alfa) alfa = base;
    if (prof <= 0) return alfa;
    for (const m of ordenar(st, legales(st).filter(x => x.captura || x.promo))) {
      const v = -quietud(aplicar(st, m, true), -beta, -alfa, prof - 1);
      if (v >= beta) return beta;
      if (v > alfa) alfa = v;
    }
    return alfa;
  }
  function negamax(st, prof, alfa, beta, ply, conQuietud) {
    if (prof === 0) return conQuietud ? quietud(st, alfa, beta, 4) : evaluar(st);
    const L = legales(st);
    if (!L.length) return enJaque(st) ? -(MATE - ply) : 0;
    for (const m of ordenar(st, L)) {
      const v = -negamax(aplicar(st, m, true), prof - 1, -beta, -alfa, ply + 1, conQuietud);
      if (v >= beta) return beta;
      if (v > alfa) alfa = v;
    }
    return alfa;
  }
  function bot(st, nivel, rng) {
    const r = rng || Math.random;
    const L = legales(st);
    if (!L.length) return null;
    if (nivel <= 1 && r() < 0.35) return L[Math.floor(r() * L.length)];
    const prof = nivel <= 1 ? 1 : nivel === 2 ? 2 : 3;
    let mejor = -Infinity, mejores = [];
    for (const m of ordenar(st, L)) {
      const v = -negamax(aplicar(st, m, true), prof - 1, -Infinity, -(mejor - 1), 1, nivel >= 3);
      if (v > mejor) { mejor = v; mejores = [m]; } else if (v === mejor) mejores.push(m);
    }
    return mejores[Math.floor(r() * mejores.length)];
  }

  // Material capturado por cada color (puntos clásicos: P1 C3 A3 T5 D9).
  const PUNTOS = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
  function capturas(st) {
    const cuenta = { P: 8, N: 2, B: 2, R: 2, Q: 1, p: 8, n: 2, b: 2, r: 2, q: 1 };
    for (let s = 0; s < 128; s++) if (!(s & 0x88) && st.t[s] && cuenta[st.t[s]] !== undefined) cuenta[st.t[s]]--;
    const de = c => Object.entries(cuenta).filter(([p, n]) => n > 0 && colorDe(p) !== c).flatMap(([p, n]) => Array(n).fill(p));
    const pts = lista => lista.reduce((a, p) => a + PUNTOS[p.toLowerCase()], 0);
    const w = de('w'), b = de('b'); // piezas que capturó cada color (si hubo coronación puede salir negativo; se ignora)
    return { w, b, puntosW: pts(w), puntosB: pts(b) };
  }

  g.Ajedrez = { INICIAL, casilla, sqDe, colorDe, desdeFEN, aFEN, legales, aplicar, perft, enJaque, resultado, san, buscarJugada, bot, evaluar, capturas, LETRA };
})(typeof window !== 'undefined' ? window : globalThis);
