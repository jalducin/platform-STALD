// Motores de los juegos de tablero (openspec: juegos-tablero): Damas, Dominó, Parchís y Batalla naval.
// Sin DOM: lo usan juegos.html (con juegos/tablero-ui.js) y las pruebas de Deno (server/tablero_test.ts).
// Los estados son JSON puro; el azar entra por parámetro (rnd) o sale de la semilla (dado del parchís).
(function (g) {
  'use strict';
  function fnv(s) { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
  function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; } // NOSONAR: aritmética entera de 32 bits del generador con semilla, no es truncado
  const rng = semilla => mulberry(fnv(semilla));
  const barajar = (a, rnd) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
  const tope = n => Math.max(0, Math.min(1000, Math.round(n)));

  // ======================= Damas (reglas inglesas, 8×8) =======================
  // 32 casillas oscuras: índice = fila·4 + ⌊columna/2⌋, fila 0 arriba. Una casilla es oscura si fila + columna es impar.
  // Piezas: «b» peón blanco, «B» dama blanca, «n» peón negro, «N» dama negra. Las blancas empiezan abajo y mueven primero.
  const Damas = (() => {
    const idx = (f, c) => f >= 0 && f < 8 && c >= 0 && c < 8 && (f + c) % 2 === 1 ? f * 4 + (c >> 1) : -1;
    const fila = i => i >> 2;
    const col = i => (i & 3) * 2 + (fila(i) % 2 === 0 ? 1 : 0);
    const nombre = i => 'abcdefgh'[col(i)] + (8 - fila(i));
    const color = p => p.toLowerCase();
    const esDama = p => p === p.toUpperCase();
    const otro = c => c === 'b' ? 'n' : 'b';
    const llega = (p, i) => color(p) === 'b' ? fila(i) === 0 : fila(i) === 7;
    const dirs = p => esDama(p) ? [[-1, -1], [-1, 1], [1, -1], [1, 1]] : color(p) === 'b' ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]];
    const SIN_AVANCE = 40; // medios movimientos sin captura ni avance de peón → empate

    function nueva() {
      const t = new Array(32).fill('');
      for (let i = 0; i < 12; i++) t[i] = 'n';
      for (let i = 20; i < 32; i++) t[i] = 'b';
      return { t, turno: 'b', sinAvance: 0, jugadas: 0 };
    }
    function desdeFilas(filas, turno) {
      const t = new Array(32).fill('');
      filas.forEach((s, f) => [...s].forEach((ch, c) => { const i = idx(f, c); if (i >= 0 && 'bBnN'.includes(ch)) t[i] = ch; }));
      return { t, turno: turno || 'b', sinAvance: 0, jugadas: 0 };
    }
    // Saltos desde i: agrega a `out` cada secuencia completa (sigue saltando mientras pueda; coronar la termina).
    function saltos(t, i, p, ruta, capt, out) {
      let alguno = false;
      for (const [df, dc] of dirs(p)) {
        const m = idx(fila(i) + df, col(i) + dc), d = idx(fila(i) + 2 * df, col(i) + 2 * dc);
        if (m < 0 || d < 0 || !t[m] || color(t[m]) === color(p) || t[d]) continue;
        alguno = true;
        const corona = !esDama(p) && llega(p, d), p2 = corona ? p.toUpperCase() : p;
        const t2 = t.slice(); t2[i] = ''; t2[m] = ''; t2[d] = p2;
        const r2 = ruta.concat(d), c2 = capt.concat(m);
        if (corona || !saltos(t2, d, p2, r2, c2, out)) out.push({ ruta: r2, capturas: c2, corona });
      }
      return alguno;
    }
    function legales(st) {
      const caps = [], simples = [];
      st.t.forEach((p, i) => { if (p && color(p) === st.turno) saltos(st.t, i, p, [i], [], caps); });
      if (caps.length) return caps;
      st.t.forEach((p, i) => {
        if (!p || color(p) !== st.turno) return;
        for (const [df, dc] of dirs(p)) { const d = idx(fila(i) + df, col(i) + dc); if (d >= 0 && !st.t[d]) simples.push({ ruta: [i, d], capturas: [], corona: !esDama(p) && llega(p, d) }); }
      });
      return simples;
    }
    function aplicar(st, mv) {
      const t = st.t.slice(), de = mv.ruta[0], a = mv.ruta[mv.ruta.length - 1], p = t[de];
      t[de] = ''; mv.capturas.forEach(i => { t[i] = ''; });
      t[a] = !esDama(p) && llega(p, a) ? p.toUpperCase() : p;
      return { t, turno: otro(st.turno), sinAvance: mv.capturas.length || !esDama(p) ? 0 : st.sinAvance + 1, jugadas: st.jugadas + 1 };
    }
    const igual = (a, b) => a.length === b.length && a.every((x, k) => x === b[k]);
    const buscar = (st, ruta) => Array.isArray(ruta) ? legales(st).find(m => igual(m.ruta, ruta)) || null : null;
    const piezas = (st, c) => st.t.filter(p => p && color(p) === c).length;
    function resultado(st) {
      if (!piezas(st, st.turno)) return { gana: otro(st.turno), fin: 'sin-piezas' };
      if (!legales(st).length) return { gana: otro(st.turno), fin: 'sin-jugadas' };
      if (st.sinAvance >= SIN_AVANCE) return { empate: true, fin: 'sin-avance' };
      return null;
    }
    // Material desde el punto de vista de `yo`: peón 1, dama 2.5 y un poco por avanzar.
    function evaluar(st, yo) {
      let v = 0;
      st.t.forEach((p, i) => {
        if (!p) return;
        const avance = esDama(p) ? 0 : (color(p) === 'b' ? 7 - fila(i) : fila(i)) * 0.04;
        v += (color(p) === yo ? 1 : -1) * ((esDama(p) ? 2.5 : 1) + avance);
      });
      return v;
    }
    function minimax(st, prof, yo, alfa, beta) {
      const res = resultado(st);
      if (res) return res.empate ? 0 : (res.gana === yo ? 100 + prof : -100 - prof);
      if (!prof) return evaluar(st, yo);
      const max = st.turno === yo;
      let mejor = max ? -Infinity : Infinity;
      for (const mv of legales(st)) {
        const v = minimax(aplicar(st, mv), prof - 1, yo, alfa, beta);
        if (max) { mejor = Math.max(mejor, v); alfa = Math.max(alfa, v); } else { mejor = Math.min(mejor, v); beta = Math.min(beta, v); }
        if (beta <= alfa) break;
      }
      return mejor;
    }
    // ¿La pieza que llega a `a` puede ser capturada en la respuesta?
    const expuesta = (st, mv) => legales(aplicar(st, mv)).some(r => r.capturas.includes(mv.ruta[mv.ruta.length - 1]));
    // Nivel 1 (🐣 Fácil): al azar, con la captura más larga y sin regalar piezas si puede. Nivel 2 (🦊 Difícil): minimax a 4.
    function bot(st, nivel, rnd) {
      const ls = barajar(legales(st), rnd || Math.random);
      if (!ls.length) return null;
      if (nivel >= 2) {
        let mejor = null, mv0 = null;
        for (const mv of ls) { const v = minimax(aplicar(st, mv), 3, st.turno, -Infinity, Infinity); if (mejor === null || v > mejor) { mejor = v; mv0 = mv; } }
        return mv0;
      }
      const largo = Math.max(...ls.map(m => m.capturas.length));
      const cand = ls.filter(m => m.capturas.length === largo);
      return cand.find(m => !expuesta(st, m)) || cand[0];
    }
    return { nueva, desdeFilas, legales, aplicar, buscar, resultado, bot, piezas, idx, fila, col, nombre, color, esDama, otro, SIN_AVANCE };
  })();

  // ======================= Dominó (doble seis, sin robar) =======================
  const Domino = (() => {
    const FICHAS = [];
    for (let a = 0; a <= 6; a++) for (let b = a; b <= 6; b++) FICHAS.push([a, b]);
    const valor = f => FICHAS[f][0] + FICHAS[f][1];
    const esMula = f => FICHAS[f][0] === FICHAS[f][1];
    function nueva(n, rnd) {
      const orden = barajar(FICHAS.map((_, i) => i), rnd || Math.random);
      const manos = Array.from({ length: n }, (_, j) => orden.slice(j * 7, j * 7 + 7));
      // Sale la mula más alta; si nadie tiene mulas, la ficha más alta.
      let primera = null;
      for (let v = 6; v >= 0 && primera === null; v--) { const f = FICHAS.findIndex(x => x[0] === v && x[1] === v); if (manos.some(m => m.includes(f))) primera = f; }
      if (primera === null) primera = manos.flat().sort((x, y) => valor(y) - valor(x) || Math.max(...FICHAS[y]) - Math.max(...FICHAS[x]))[0];
      const turno = manos.findIndex(m => m.includes(primera));
      return { n, manos, mesa: [], izq: null, der: null, turno, primera, pases: 0, fin: null, log: [] };
    }
    const embona = (f, v) => FICHAS[f][0] === v || FICHAS[f][1] === v;
    function jugables(st, j) {
      j = j === undefined ? st.turno : j;
      if (st.fin) return [];
      const mano = st.manos[j];
      if (!st.mesa.length) return mano.includes(st.primera) ? [{ ficha: st.primera, lado: 'd' }] : [];
      const out = [];
      for (const f of mano) {
        if (embona(f, st.izq)) out.push({ ficha: f, lado: 'i' });
        if (embona(f, st.der) && (st.izq !== st.der || !embona(f, st.izq))) out.push({ ficha: f, lado: 'd' });
      }
      return out;
    }
    const pips = (st, j) => st.manos[j].reduce((s, f) => s + valor(f), 0);
    // Pasa al siguiente; quien no tiene ficha pasa solo. Si todos pasan seguido, el juego se cierra.
    function avanzar(st) {
      for (let guard = 0; guard <= st.n; guard++) {
        st.turno = (st.turno + 1) % st.n;
        if (jugables(st).length) return;
        st.log.push({ j: st.turno, pasa: true });
        if (++st.pases >= st.n) {
          const min = Math.min(...st.manos.map((_, j) => pips(st, j)));
          st.fin = { ganadores: st.manos.map((_, j) => j).filter(j => pips(st, j) === min), cerrado: true };
          return;
        }
      }
    }
    function jugar(st, mv) {
      if (st.fin || !mv) return false;
      const j = st.turno, mano = st.manos[j], k = mano.indexOf(mv.ficha);
      if (k < 0) return false;
      const [a, b] = FICHAS[mv.ficha];
      if (!st.mesa.length) {
        if (mv.ficha !== st.primera) return false;
        st.mesa.push({ f: mv.ficha, a, b }); st.izq = a; st.der = b; st.primera = null;
      } else if (mv.lado === 'i') {
        if (a === st.izq) { st.mesa.unshift({ f: mv.ficha, a: b, b: a }); st.izq = b; } else if (b === st.izq) { st.mesa.unshift({ f: mv.ficha, a, b }); st.izq = a; } else return false;
      } else if (mv.lado === 'd') {
        if (a === st.der) { st.mesa.push({ f: mv.ficha, a, b }); st.der = b; } else if (b === st.der) { st.mesa.push({ f: mv.ficha, a: b, b: a }); st.der = a; } else return false;
      } else return false;
      mano.splice(k, 1);
      st.pases = 0;
      st.log.push({ j, ficha: mv.ficha, lado: mv.lado });
      if (!mano.length) { st.fin = { ganadores: [j], cerrado: false }; return true; }
      avanzar(st);
      return true;
    }
    // El bot tira la ficha más pesada que embona y prefiere las mulas.
    function bot(st, rnd) {
      const js = jugables(st); if (!js.length) return null;
      const r = rnd || Math.random;
      return js.map(x => ({ x, v: valor(x.ficha) + (esMula(x.ficha) ? 0.5 : 0) + r() * 0.1 })).sort((p, q) => q.v - p.v)[0].x;
    }
    return { FICHAS, nueva, jugables, jugar, bot, pips, valor, esMula };
  })();

  // ======================= Parchís (estilo Ludo, sale con 5) =======================
  // Tablero 15×15. Anillo de 52 casillas en sentido del reloj; cada color entra en su salida y, tras 50 pasos, toma su
  // pasillo (51–55) hasta la meta (56). p = -1 es casa. Colores: 0 rojo, 1 verde, 2 amarillo, 3 azul.
  const Parchis = (() => {
    const ANILLO = [];
    const tramo = (f0, c0, df, dc, n) => { for (let k = 0; k < n; k++) ANILLO.push([f0 + df * k, c0 + dc * k]); };
    tramo(6, 1, 0, 1, 5); tramo(5, 6, -1, 0, 6); tramo(0, 7, 0, 1, 2);
    tramo(1, 8, 1, 0, 5); tramo(6, 9, 0, 1, 6); tramo(7, 14, 1, 0, 2);
    tramo(8, 13, 0, -1, 5); tramo(9, 8, 1, 0, 6); tramo(14, 7, 0, -1, 2);
    tramo(13, 6, -1, 0, 5); tramo(8, 5, 0, -1, 6); tramo(7, 0, -1, 0, 2);
    const PASILLO = [
      [1, 2, 3, 4, 5].map(c => [7, c]), [1, 2, 3, 4, 5].map(f => [f, 7]),
      [13, 12, 11, 10, 9].map(c => [7, c]), [13, 12, 11, 10, 9].map(f => [f, 7]),
    ];
    const SALIDAS = [0, 13, 26, 39];
    const SEGURAS = [0, 8, 13, 21, 26, 34, 39, 47];
    const META = 56, SALE = 5;
    const anillo = i => ANILLO[((i % 52) + 52) % 52];
    const abs = (color, p) => (SALIDAS[color] + p) % 52;
    const dado = (seed, k) => 1 + Math.floor(rng(seed + '|dado|' + k)() * 6);
    function nueva(n, seed, cuantas) {
      cuantas = cuantas === 2 ? 2 : 4;
      const st = { n, colores: n === 2 ? [0, 2] : [0, 1, 2, 3].slice(0, n), cuantas, fichas: Array.from({ length: n }, () => new Array(cuantas).fill(-1)), seed, k: 0, turno: 0, dado: 0, fin: null, log: [], forzar: [] };
      tirar(st); resolver(st);
      return st;
    }
    // `forzar` deja fijar dados en las pruebas; en el juego siempre está vacío.
    function tirar(st) { st.dado = st.forzar && st.forzar.length ? st.forzar.shift() : dado(st.seed, st.k); st.k++; }
    function destino(st, j, f) {
      const p = st.fichas[j][f];
      if (p === META) return null;
      if (p === -1) return st.dado === SALE ? 0 : null;
      return p + st.dado <= META ? p + st.dado : null;
    }
    const movibles = st => st.fin ? [] : st.fichas[st.turno].map((_, f) => f).filter(f => destino(st, st.turno, f) !== null);
    // Fichas de otros colores en la casilla absoluta a (solo en el anillo).
    function rivalesEn(st, j, a) {
      const out = [];
      st.fichas.forEach((fs, o) => { if (o !== j) fs.forEach((p, g) => { if (p >= 0 && p <= 50 && abs(st.colores[o], p) === a) out.push([o, g]); }); });
      return out;
    }
    // Sin jugada posible, el turno pasa solo (con 6 tampoco se repite).
    function resolver(st) {
      for (let guard = 0; guard < 2000 && !st.fin && !movibles(st).length; guard++) {
        st.log.push({ j: st.turno, sin: true, dado: st.dado });
        st.turno = (st.turno + 1) % st.n; tirar(st);
      }
    }
    function mover(st, f) {
      if (st.fin || !movibles(st).includes(f)) return false;
      const j = st.turno, de = st.fichas[j][f], a = destino(st, j, f), d = st.dado;
      st.fichas[j][f] = a;
      let comio = 0;
      if (a <= 50) {
        const casilla = abs(st.colores[j], a);
        if (!SEGURAS.includes(casilla)) for (const [o, g] of rivalesEn(st, j, casilla)) { st.fichas[o][g] = -1; comio++; }
      }
      st.log.push({ j, f, de, a, dado: d, comio });
      if (st.fichas[j].every(p => p === META)) { st.fin = { ganador: j }; return true; }
      if (d !== 6 && !comio) st.turno = (st.turno + 1) % st.n;
      tirar(st); resolver(st);
      return true;
    }
    const enMeta = (st, j) => st.fichas[j].filter(p => p === META).length;
    // Bot: comer, llegar a la meta, salir, entrar al pasillo, quedar en casilla segura y avanzar.
    function bot(st, rnd) {
      const r = rnd || Math.random, j = st.turno;
      const op = movibles(st).map(f => {
        const p = st.fichas[j][f], a = destino(st, j, f);
        let v = a * 0.3 + r() * 0.5;
        if (a <= 50) {
          const casilla = abs(st.colores[j], a);
          if (!SEGURAS.includes(casilla) && rivalesEn(st, j, casilla).length) v += 100;
          if (SEGURAS.includes(casilla)) v += 12;
        }
        if (a === META) v += 80; else if (a > 50) v += 30;
        if (p === -1) v += 60;
        return { f, v };
      });
      return op.sort((x, y) => y.v - x.v)[0].f;
    }
    // Casilla [fila, columna] (puede ser fraccionaria) para dibujar la ficha f del jugador j.
    const CASA = [[1.6, 1.6], [1.6, 10.6], [10.6, 10.6], [10.6, 1.6]];
    const META_XY = [[7, 6.2], [6.2, 7], [7, 7.8], [7.8, 7]];
    function celda(st, j, f) {
      const color = st.colores[j], p = st.fichas[j][f];
      if (p === -1) { const [f0, c0] = CASA[color]; return [f0 + (f >> 1) * 1.8, c0 + (f & 1) * 1.8]; }
      if (p === META) return META_XY[color];
      if (p > 50) return PASILLO[color][p - 51];
      return anillo(abs(color, p));
    }
    return { nueva, dado, movibles, mover, bot, enMeta, celda, destino, anillo, abs, ANILLO, PASILLO, SALIDAS, SEGURAS, META, SALE, CASA };
  })();

  // ======================= Batalla naval (10×10) =======================
  // Casilla c = fila·10 + columna; nombre: letra de la columna (A–J) y número de la fila (1–10).
  const Naval = (() => {
    const FLOTA = [5, 4, 3, 3, 2];
    const NOMBRES = ['Portaaviones', 'Acorazado', 'Crucero', 'Submarino', 'Destructor'];
    const TOTAL = FLOTA.reduce((a, b) => a + b, 0);
    const nombre = c => 'ABCDEFGHIJ'[c % 10] + (Math.floor(c / 10) + 1);
    const celdas = (c, largo, horizontal) => {
      const f = Math.floor(c / 10), k = c % 10;
      if (horizontal ? k + largo > 10 : f + largo > 10) return null;
      return Array.from({ length: largo }, (_, i) => horizontal ? c + i : c + 10 * i);
    };
    const entero = (x, min, max) => typeof x === 'number' && Number.isInteger(x) && x >= min && x <= max;
    function barcoValido(b) {
      if (!Array.isArray(b) || b.length < 2 || !b.every(x => entero(x, 0, 99))) return false;
      const s = b.slice().sort((x, y) => x - y);
      const h = s.every((x, i) => i === 0 || (x === s[i - 1] + 1 && Math.floor(x / 10) === Math.floor(s[0] / 10)));
      const v = s.every((x, i) => i === 0 || x === s[i - 1] + 10);
      return h || v;
    }
    function validarFlota(fl) {
      if (!Array.isArray(fl) || fl.length !== FLOTA.length || !fl.every(barcoValido)) return false;
      const largos = fl.map(b => b.length).sort((a, b) => b - a);
      if (!largos.every((x, i) => x === FLOTA[i])) return false;
      return new Set(fl.flat()).size === TOTAL;
    }
    const vecinas = c => { const f = Math.floor(c / 10), k = c % 10, out = []; if (f > 0) { out.push(c - 10); } if (f < 9) { out.push(c + 10); } if (k > 0) { out.push(c - 1); } if (k < 9) { out.push(c + 1); } return out; };
    const alrededor = c => { const f = Math.floor(c / 10), k = c % 10, out = []; for (let df = -1; df <= 1; df++) { for (let dk = -1; dk <= 1; dk++) { const ff = f + df, kk = k + dk; if (ff >= 0 && ff < 10 && kk >= 0 && kk < 10) out.push(ff * 10 + kk); } } return out; };
    // Acomodo al azar; procura que los barcos no se toquen (si no se puede, se permite).
    function autoFlota(rnd) {
      const r = rnd || Math.random;
      for (let intento = 0; intento < 50; intento++) {
        const usadas = new Set(), bloqueo = new Set(), flota = [];
        const separados = intento < 40;
        for (const largo of FLOTA) {
          let ok = null;
          for (let k = 0; k < 300 && !ok; k++) {
            const b = celdas(Math.floor(r() * 100), largo, r() < 0.5);
            if (b && b.every(x => !usadas.has(x) && (!separados || !bloqueo.has(x)))) ok = b;
          }
          if (!ok) break;
          ok.forEach(x => { usadas.add(x); alrededor(x).forEach(y => bloqueo.add(y)); });
          flota.push(ok);
        }
        if (flota.length === FLOTA.length) return flota;
      }
      return [[0, 1, 2, 3, 4], [20, 21, 22, 23], [40, 41, 42], [60, 61, 62], [80, 81]];
    }
    function disparo(flota, previos, c) {
      const barco = flota.find(b => b.includes(c));
      if (!barco) return { r: 'agua' };
      const set = new Set(previos.concat(c));
      return barco.every(x => set.has(x)) ? { r: 'hundido', barco: barco.slice().sort((a, b) => a - b) } : { r: 'tocado' };
    }
    const todoHundido = (flota, tiros) => { const set = new Set(tiros); return flota.flat().every(x => set.has(x)); };
    // Bot: caza en patrón de tablero de ajedrez; al tocar, prueba las vecinas y sigue la línea hasta hundir.
    function bot(hist, rnd) {
      const r = rnd || Math.random;
      const tirado = new Set(hist.map(h => h.c));
      const hundidas = new Set(hist.filter(h => h.r === 'hundido').flatMap(h => h.barco || [h.c]));
      const pend = hist.filter(h => (h.r === 'tocado' || h.r === 'hundido') && !hundidas.has(h.c)).map(h => h.c).sort((a, b) => a - b);
      const libre = c => c >= 0 && c < 100 && !tirado.has(c);
      const azar = l => l[Math.floor(r() * l.length)];
      if (pend.length >= 2) {
        const mismaFila = pend.every(c => Math.floor(c / 10) === Math.floor(pend[0] / 10));
        const mismaCol = pend.every(c => c % 10 === pend[0] % 10);
        const a = pend[0], z = pend[pend.length - 1];
        const linea = mismaFila ? [a % 10 > 0 ? a - 1 : -1, z % 10 < 9 ? z + 1 : -1] : mismaCol ? [a - 10, z + 10] : [];
        const ok = linea.filter(libre);
        if (ok.length) return azar(ok);
      }
      if (pend.length) {
        const ok = [...new Set(pend.flatMap(vecinas))].filter(libre);
        if (ok.length) return azar(ok);
      }
      const par = [];
      for (let c = 0; c < 100; c++) if (libre(c) && (Math.floor(c / 10) + c % 10) % 2 === 0) par.push(c);
      if (par.length) return azar(par);
      const resto = []; for (let c = 0; c < 100; c++) if (libre(c)) resto.push(c);
      return azar(resto);
    }
    // Estado de una sala a partir de las jugadas (con su resultado `r`, que pone el servidor): igual que estadoNaval de
    // server/naval.ts. Empieza el jugador 0; tras «agua» cambia el turno; gana quien junta 17 aciertos.
    function estado(jugadores) {
      const orden = jugadores.slice(0, 2).map(j => j.id);
      const todas = jugadores.slice(0, 2).flatMap(j => (j.jugadas || []).map(x => ({ id: j.id, ...x }))).sort((a, b) => a.n - b.n);
      let turno = 0, fin = null, ultimo = 0;
      const aciertos = [0, 0];
      for (const x of todas) {
        const k = orden.indexOf(x.id);
        ultimo = Math.max(ultimo, x.t || 0);
        if (x.accion === 'rendirse') { fin = { gana: orden[1 - k], por: 'rendicion' }; break; }
        if (x.accion === 'reclamar') { fin = { gana: x.id, por: 'abandono' }; break; }
        if (x.r === 'agua') { turno = 1 - k; continue; }
        turno = k;
        if (++aciertos[k] >= TOTAL) { fin = { gana: x.id, por: 'hundidos' }; break; }
      }
      return { orden, turno: orden[turno], fin, pasos: todas.length, ultimo, aciertos, disparos: todas.filter(x => x.accion === 'disparar') };
    }
    return { FLOTA, NOMBRES, TOTAL, nombre, celdas, validarFlota, autoFlota, disparo, todoHundido, bot, vecinas, estado };
  })();

  // ======================= Puntos (tope 1,000) =======================
  const puntos = {
    damas: (res, nivel, propias, capturas) => res === 'gana' ? tope((nivel === 1 ? 600 : 800) + 20 * propias) : res === 'empate' ? 300 : Math.min(300, tope(25 * capturas)),
    domino: (res, rivales, mios) => res === 'gana' ? tope(500 + 10 * rivales) : res === 'empate' ? 400 : tope(200 - 5 * mios),
    parchis: (meta, cuantas, gana) => tope(800 * meta / cuantas + (gana ? 200 : 0)),
    naval: (gana, disparos, tocados) => gana ? tope(600 + 400 * Naval.TOTAL / Math.max(Naval.TOTAL, disparos)) : tope(20 * tocados),
  };

  g.Tablero = { rng, fnv, barajar, Damas, Domino, Parchis, Naval, puntos };
})(typeof window !== 'undefined' ? window : globalThis);
