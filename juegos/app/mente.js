// Juegos · Mente ágil (openspec: organizar-codigo).
// Sudoku por niveles y Ajedrez contra la computadora.
// Script clásico (sin build ni módulos ES): juegos.html lo carga en orden y todos comparten el ámbito global
// (const/let/function de nivel superior). Ver docs/frontend-standards.md, «Estructura de juegos/app/».
// ---------- Mente ágil: Sudoku por niveles (openspec: sudoku-niveles) ----------
const SUDOKU_NIVELES = {
  facil: { t: 'Fácil', emoji: '🟢', pistas: 40, base: 400, limite: 600 },
  medio: { t: 'Medio', emoji: '🟡', pistas: 32, base: 700, limite: 900 },
  dificil: { t: 'Difícil', emoji: '🟠', pistas: 27, base: 1000, limite: 1200 },
  experto: { t: 'Experto', emoji: '🔴', pistas: 23, base: 1400, limite: 1500 },
};
const sdkPuede = (g, i, v) => {
  const r = Math.floor(i / 9), c = i % 9, br = r - r % 3, bc = c - c % 3;
  for (let k = 0; k < 9; k++) if (g[r * 9 + k] === v || g[k * 9 + c] === v || g[(br + Math.floor(k / 3)) * 9 + bc + k % 3] === v) return false;
  return true;
};
// Tablero resuelto al azar (backtracking con números barajados).
function sudokuResuelto(rnd = Math.random) {
  const g = new Array(81).fill(0);
  const llenar = i => {
    if (i === 81) return true;
    for (const v of barajar([1, 2, 3, 4, 5, 6, 7, 8, 9], rnd)) if (sdkPuede(g, i, v)) { g[i] = v; if (llenar(i + 1)) { return true; } g[i] = 0; }
    return false;
  };
  llenar(0);
  return g;
}
// Cuenta soluciones hasta `tope` (la celda con menos candidatos primero).
function contarSoluciones(g0, tope = 2) {
  const g = g0.slice(); let n = 0;
  const buscar = () => {
    let mejor = -1, cands = null;
    for (let i = 0; i < 81; i++) {
      if (g[i]) continue;
      const cs = []; for (let v = 1; v <= 9; v++) if (sdkPuede(g, i, v)) cs.push(v);
      if (!cs.length) return;
      if (!cands || cs.length < cands.length) { mejor = i; cands = cs; if (cs.length === 1) break; }
    }
    if (mejor === -1) { n++; return; }
    for (const v of cands) { g[mejor] = v; buscar(); g[mejor] = 0; if (n >= tope) return; }
  };
  buscar();
  return n;
}
// Quita números al azar mientras haya una sola solución, hasta las pistas del nivel.
function generarSudoku(nivel, rnd = Math.random) {
  const sol = sudokuResuelto(rnd), g = sol.slice();
  let pistas = 81;
  for (const i of barajar([...new Array(81).keys()], rnd)) {
    if (pistas <= SUDOKU_NIVELES[nivel].pistas) break;
    const v = g[i]; g[i] = 0;
    if (contarSoluciones(g, 2) === 1) pistas--; else g[i] = v;
  }
  return { puzzle: g, sol };
}
const puntosSudoku = (nivel, seg, errores) => {
  const n = SUDOKU_NIVELES[nivel];
  return Math.max(Math.round(n.base * 0.2), Math.round(n.base * (1 + 0.4 * Math.max(0, 1 - seg / n.limite))) - 40 * errores);
};

function elegirSudoku() {
  const m = marco('mente-sudoku', { menu: true }); // menú: aún no es partida (openspec: juegos-recarga)
  let nivel = 'facil';
  m.body.innerHTML = '<div class="q-card"><div class="big">🔢</div><div class="q">Sudoku</div><div class="sub">Llena el tablero: cada fila, columna y caja de 3×3 lleva los números del 1 al 9 sin repetir. Tienes 3 vidas.</div></div>' +
    '<label>Nivel</label><div class="opts">' + Object.entries(SUDOKU_NIVELES).map(([id, n]) => '<button class="opt" data-sdk-nivel="' + id + '" aria-pressed="' + (id === nivel) + '">' + n.emoji + ' ' + n.t + '<br><small>' + n.pistas + ' pistas · hasta ⭐ ' + fmt(puntosSudoku(id, 0, 0)) + '</small></button>').join('') + '</div>' +
    '<div class="row-btns"><button class="btn" data-sdk-go>Empezar</button></div>';
  m.body.addEventListener('click', e => {
    const b = e.target.closest('[data-sdk-nivel]');
    if (b) { nivel = b.dataset.sdkNivel; m.body.querySelectorAll('[data-sdk-nivel]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); }
    if (e.target.closest('[data-sdk-go]')) { m.body.innerHTML = '<div class="loading">Armando tu tablero…</div>'; setTimeout(() => jugarSudoku(nivel), 30); }
  });
}

function jugarSudoku(nivel) {
  // Reanudar (openspec: juegos-recarga): tablero, solución, casillas llenas, errores y segundos jugados.
  const previo = tomarReanudacion('mente-sudoku');
  const tablero = a => Array.isArray(a) && a.length === 81 && a.every(v => Number.isInteger(v) && v >= 0 && v <= 9);
  const sigue = !!previo && !!SUDOKU_NIVELES[previo.nivel] && tablero(previo.puzzle) && tablero(previo.sol) && tablero(previo.g);
  if (sigue) nivel = previo.nivel;
  const N = SUDOKU_NIVELES[nivel];
  const { puzzle, sol } = sigue ? { puzzle: previo.puzzle, sol: previo.sol } : generarSudoku(nivel);
  window.__sudoku = { puzzle, sol, nivel }; // para pruebas E2E
  const m = marco('mente-sudoku', { vidas: 3 });
  const g = sigue ? previo.g.map((v, i) => puzzle[i] || (v === sol[i] ? v : 0)) : puzzle.slice();
  let sel = g.findIndex(v => !v), errores = sigue ? Math.min(2, numEntre(previo.errores, 2)) : 0, terminado = false;
  const t0 = Date.now() - (sigue ? numEntre(previo.segundos, 86400) * 1000 * TIEMPO : 0);
  m.vidas(3 - errores);
  const segundos = () => (Date.now() - t0) / 1000 / TIEMPO;
  enCurso.foto = () => terminado || errores >= 3 ? null : { nivel, puzzle, sol, g: g.slice(), errores, segundos: segundos(), faltan: g.filter(x => !x).length };
  if (g.some((v, i) => v && !puzzle[i])) m.puntos(puntosSudoku(nivel, segundos(), errores));
  const tTimer = setInterval(() => { const e = document.getElementById('m-tiempo'); if (!e) { return; } const sg = Math.floor(segundos()); e.hidden = false; e.textContent = '⏱ ' + Math.floor(sg / 60) + ':' + String(sg % 60).padStart(2, '0'); }, 500);
  limpiezas.push(() => clearInterval(tTimer));
  m.body.innerHTML = '<p class="muted" style="text-align:center;margin:0">' + N.emoji + ' ' + N.t + ' · faltan <b id="sdk-faltan"></b></p>' +
    '<div class="sdk" id="sdk">' + g.map((v, i) => { const r = Math.floor(i / 9), c = i % 9; return '<button data-sdk-i="' + i + '" class="' + [puzzle[i] ? 'fija' : '', c % 3 === 2 && c < 8 ? 'bd' : '', r % 3 === 2 && r < 8 ? 'bb' : ''].join(' ').trim() + '" aria-label="Fila ' + (r + 1) + ', columna ' + (c + 1) + '">' + (v || '') + '</button>'; }).join('') + '</div>' +
    '<div class="sdk-pad">' + [1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => '<button data-sdk-n="' + n + '">' + n + '<small id="sdk-q' + n + '"></small></button>').join('') + '<button data-sdk-n="0" aria-label="Borrar">⌫<small>borrar</small></button></div>';
  const celdas = [...m.body.querySelectorAll('[data-sdk-i]')];
  const pintar = () => {
    const r = Math.floor(sel / 9), c = sel % 9, br = r - r % 3, bc = c - c % 3, v = g[sel];
    celdas.forEach((b, i) => {
      const ri = Math.floor(i / 9), ci = i % 9;
      b.classList.toggle('sel', i === sel);
      b.classList.toggle('zona', i !== sel && (ri === r || ci === c || (ri - ri % 3 === br && ci - ci % 3 === bc)));
      b.classList.toggle('igual', i !== sel && !!v && g[i] === v);
    });
    const faltan = g.filter(x => !x).length;
    document.getElementById('sdk-faltan').textContent = faltan;
    for (let n = 1; n <= 9; n++) { const q = 9 - g.filter(x => x === n).length; document.getElementById('sdk-q' + n).textContent = q ? q : '✓'; m.body.querySelector('[data-sdk-n="' + n + '"]').disabled = !q; }
  };
  const fin = gano => {
    if (terminado) { return; } terminado = true;
    const seg = segundos();
    if (gano) terminar('mente-sudoku', { puntos: puntosSudoku(nivel, seg, errores), aciertos: 81 - puzzle.filter(Boolean).length, total: 81 - puzzle.filter(Boolean).length, segundos: seg, titulo: '🔢 ¡Sudoku resuelto!', detalle: N.emoji + ' ' + N.t + ' · ' + Math.floor(seg / 60) + ' min ' + Math.round(seg % 60) + ' s · ' + errores + ' error(es)' });
    else terminar('mente-sudoku', { puntos: 0, aciertos: g.filter(Boolean).length - puzzle.filter(Boolean).length, total: 81 - puzzle.filter(Boolean).length, segundos: seg, titulo: '💔 Sin vidas', detalle: 'Te equivocaste 3 veces. ¡Inténtalo de nuevo!' });
  };
  const poner = n => {
    if (terminado || sel < 0 || puzzle[sel]) return;
    const b = celdas[sel];
    if (n === 0) { g[sel] = 0; b.textContent = ''; pintar(); guardarPartida(); return; }
    if (sol[sel] === n) {
      g[sel] = n; b.textContent = n; b.classList.remove('mal'); sonidoOk(); pintar();
      m.puntos(puntosSudoku(nivel, segundos(), errores));
      if (g.every((v, i) => v === sol[i])) setTimeout(() => fin(true), 600);
      guardarPartida();
    } else {
      errores++; sonidoMal(); m.vidas(3 - errores); guardarPartida();
      b.textContent = n; b.classList.add('mal');
      const idx = sel;
      setTimeout(() => { celdas[idx].textContent = g[idx] || ''; celdas[idx].classList.remove('mal'); }, 700);
      if (errores >= 3) setTimeout(() => fin(false), 800);
    }
  };
  m.body.addEventListener('click', e => {
    const c = e.target.closest('[data-sdk-i]'), n = e.target.closest('[data-sdk-n]');
    if (c) { sel = Number(c.dataset.sdkI); pintar(); }
    if (n && !n.disabled) poner(Number(n.dataset.sdkN));
  });
  const onKey = e => {
    if (terminado) return;
    if (/^[1-9]$/.test(e.key)) { poner(Number(e.key)); e.preventDefault(); }
    else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') { poner(0); e.preventDefault(); }
    else {
      const d = { ArrowUp: -9, ArrowDown: 9, ArrowLeft: -1, ArrowRight: 1 }[e.key];
      if (d !== undefined) { sel = (sel + d + 81) % 81; pintar(); e.preventDefault(); }
    }
  };
  document.addEventListener('keydown', onKey);
  limpiezas.push(() => document.removeEventListener('keydown', onKey));
  pintar();
}

// ---------- Mente ágil: Ajedrez (openspec: ajedrez). Motor en juegos/ajedrez.js ----------
const AJ_GLIFO = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
const AJ_NIVEL = { 1: { t: '🐣 Básico', pts: 400 }, 2: { t: '🦊 Intermedio', pts: 700 }, 3: { t: '🦉 Avanzado', pts: 1000 } };
const ajPieza = p => p ? '<span class="aj-p ' + Ajedrez.colorDe(p) + '">' + AJ_GLIFO[p.toLowerCase()] + '\uFE0E</span>' : '';
// Tablero: abajo = color que juega abajo; sel = casilla elegida; destinos = jugadas legales de esa pieza.
function ajTableroHtml(st, o) {
  const dest = new Map((o.destinos || []).map(m => [m.a, m]));
  const rey = Ajedrez.enJaque(st) ? st.t.findIndex(p => p === (st.turno === 'w' ? 'K' : 'k')) : -1;
  let h = '<div class="aj-tablero" role="grid" aria-label="Tablero de ajedrez">';
  for (let i = 0; i < 8; i++) for (let k = 0; k < 8; k++) {
    const f = o.abajo === 'w' ? i : 7 - i, c = o.abajo === 'w' ? k : 7 - k, sq = f * 16 + c;
    const cls = ((f + c) % 2 ? 'os' : 'cl') + (o.ultima && (o.ultima.de === sq || o.ultima.a === sq) ? ' ult' : '') + (o.sel === sq ? ' sel' : '') + (sq === rey ? ' jaque' : '');
    const m = dest.get(sq);
    let destHtml = '';
    if (m) destHtml = '<span class="dest' + (m.captura ? ' come' : '') + '"></span>';
    h += '<button class="aj-c ' + cls + '" data-aj="' + sq + '" aria-label="' + Ajedrez.casilla(sq) + (st.t[sq] ? ' ' + st.t[sq] : '') + '">' +
      (k === 0 ? '<span class="aj-coord f">' + (8 - f) + '</span>' : '') + (i === 7 ? '<span class="aj-coord c">' + 'abcdefgh'[c] + '</span>' : '') +
      ajPieza(st.t[sq]) + destHtml + '</button>';
  }
  return h + '</div>';
}
const ajCapturasHtml = (lista) => lista.map(p => '<span class="aj-p ' + Ajedrez.colorDe(p) + '" style="font-size:1rem">' + AJ_GLIFO[p.toLowerCase()] + '\uFE0E</span>').join('');
const ajJugadasHtml = sanes => sanes.length ? '<div class="aj-jugadas">' + sanes.reduce((a, x, i) => a + (i % 2 ? ' ' + escapeHtml(x) + ' &nbsp;' : '<b>' + (i / 2 + 1) + '.</b> ' + escapeHtml(x)), '') + '</div>' : '';
const ajPromoHtml = color => '<div class="aj-promo" role="group" aria-label="Elige la pieza para coronar">' + ['q', 'r', 'b', 'n'].map(x => '<button data-aj-promo="' + x + '" aria-label="' + Ajedrez.LETRA[x] + '">' + ajPieza(color === 'w' ? x.toUpperCase() : x) + '</button>').join('') + '</div>';
const AJ_FIN = { mate: 'jaque mate', ahogado: 'rey ahogado (tablas)', '50': '50 jugadas sin captura (tablas)', repeticion: 'triple repetición (tablas)', material: 'material insuficiente (tablas)', tiempo: 'se acabó el tiempo', rendicion: 'rendición' };
// Selección de casilla común al individual y a la sala; devuelve { sel, promo, jugada }.
function ajClic(st, color, sel, sq) {
  const mias = sq2 => st.t[sq2] && Ajedrez.colorDe(st.t[sq2]) === color;
  if (sel !== null) {
    const ms = Ajedrez.legales(st).filter(m => m.de === sel && m.a === sq);
    if (ms.length > 1) return { sel, promo: { de: sel, a: sq } };
    if (ms.length === 1) return { sel: null, jugada: ms[0] };
  }
  return { sel: mias(sq) && sel !== sq ? sq : null };
}

function elegirAjedrez() {
  const m = marco('ajedrez', { menu: true }); // menú: aún no es partida (openspec: juegos-recarga)
  m.body.innerHTML = '<div class="q-card"><div class="big">♚♛♞</div><div class="q">Ajedrez</div><div class="sub">Juega contra Gambito 🤖. Gana dando jaque mate.</div></div>' +
    '<label>Nivel</label><div class="opts" style="grid-template-columns:repeat(3,1fr)">' + [1, 2, 3].map(n => '<button class="opt" data-aj-nivel="' + n + '"' + (n === 2 ? ' aria-pressed="true"' : '') + '>' + AJ_NIVEL[n].t + '</button>').join('') + '</div>' +
    '<label>Juegas con</label><div class="opts" style="grid-template-columns:repeat(3,1fr)"><button class="opt" data-aj-color="w" aria-pressed="true">♔ Blancas</button><button class="opt" data-aj-color="b">♚ Negras</button><button class="opt" data-aj-color="azar">🎲 Al azar</button></div>' +
    '<div class="row-btns"><button class="btn ghost" data-ayuda="ajedrez">📖 Cómo se juega</button><button class="btn" data-aj-go>♟️ Jugar</button></div>';
  let nivel = 2, color = 'w';
  const colorAlAzar = () => (Math.random() < .5 ? 'w' : 'b'); // NOSONAR: azar de juego, no criptográfico
  m.body.addEventListener('click', e => {
    const n = e.target.closest('[data-aj-nivel]'), c = e.target.closest('[data-aj-color]');
    if (n) { nivel = Number(n.dataset.ajNivel); m.body.querySelectorAll('[data-aj-nivel]').forEach(x => x.setAttribute('aria-pressed', String(x === n))); }
    if (c) { color = c.dataset.ajColor; m.body.querySelectorAll('[data-aj-color]').forEach(x => x.setAttribute('aria-pressed', String(x === c))); }
    if (e.target.closest('[data-aj-go]')) jugarAjedrez(nivel, color === 'azar' ? colorAlAzar() : color);
  });
}

function jugarAjedrez(nivel, yo) {
  const m = marco('ajedrez');
  let st = Ajedrez.desdeFEN(Ajedrez.INICIAL), sel = null, promo = null, ultima = null, pensando = false, terminado = false;
  const sanes = [], t0 = Date.now();
  const pintar = msg => {
    const cap = Ajedrez.capturas(st), bot = yo === 'w' ? 'b' : 'w';
    const turnoYo = st.turno === yo && !pensando;
    let estado = '';
    if (pensando) estado = '🤔 Gambito está pensando…';
    else if (turnoYo) estado = Ajedrez.enJaque(st) ? '⚠️ ¡Jaque! Protege a tu rey' : '👉 Tu turno: toca una pieza y luego su destino';
    m.body.innerHTML = '<div class="aj-wrap"><div class="aj-info"><span>🤖 Gambito · ' + AJ_NIVEL[nivel].t + '</span><span class="aj-capt">' + ajCapturasHtml(cap[bot]) + '</span></div>' +
      ajTableroHtml(st, { abajo: yo, sel, destinos: sel !== null && turnoYo ? Ajedrez.legales(st).filter(x => x.de === sel) : [], ultima }) +
      '<div class="aj-info"><span>🙂 Tú (' + (yo === 'w' ? 'blancas' : 'negras') + ')</span><span class="aj-capt">' + ajCapturasHtml(cap[yo]) + '</span></div>' +
      (promo ? ajPromoHtml(yo) : '') +
      '<div class="feedback' + (Ajedrez.enJaque(st) ? ' bad' : '') + '" id="aj-msg">' + (msg || estado) + '</div>' +
      ajJugadasHtml(sanes) + '<div class="row-btns"><button class="btn ghost sm" data-ayuda="ajedrez">📖 Cómo se juega</button><button class="btn ghost sm" data-aj-rendir>🏳️ Rendirme</button></div></div>';
    m.puntos(Ajedrez.capturas(st)['puntos' + yo.toUpperCase()]);
  };
  const fin = res => {
    terminado = true;
    const cap = Ajedrez.capturas(st)['puntos' + yo.toUpperCase()];
    const gane = res.gana === yo, tablas = !res.gana;
    let puntos, titulo;
    if (gane) { puntos = AJ_NIVEL[nivel].pts; titulo = '🏆 ¡Ganaste por ' + AJ_FIN[res.fin] + '!'; }
    else if (tablas) { puntos = Math.round(AJ_NIVEL[nivel].pts / 2); titulo = '🤝 Tablas: ' + AJ_FIN[res.fin]; }
    else { puntos = Math.min(200, cap * 10); titulo = '😅 Ganó Gambito por ' + AJ_FIN[res.fin]; }
    setTimeout(() => terminar('ajedrez', { puntos, aciertos: cap, total: 39, segundos: (Date.now() - t0) / 1000,
      titulo,
      detalle: sanes.length + ' jugadas · nivel ' + AJ_NIVEL[nivel].t + (sanes.length ? ' · última: ' + escapeHtml(sanes[sanes.length - 1]) : '') }), res.fin === 'rendicion' ? 0 : 1600 * TIEMPO);
  };
  const mover = mv => {
    sanes.push(Ajedrez.san(st, mv)); st = Ajedrez.aplicar(st, mv); ultima = mv; sel = null; promo = null;
    tono(mv.captura ? 330 : 520, 60);
    const res = Ajedrez.resultado(st);
    if (res) { pintar(res.fin === 'mate' ? '♚ ¡Jaque mate!' : '🤝 ' + AJ_FIN[res.fin]); return fin(res); }
    turnoBot();
  };
  function turnoBot() {
    if (terminado || st.turno === yo) return pintar();
    pensando = true; pintar();
    const t = setTimeout(() => { if (terminado) { return; } pensando = false; mover(Ajedrez.bot(st, nivel)); }, 450 * TIEMPO);
    limpiezas.push(() => clearTimeout(t));
  }
  m.body.addEventListener('click', e => {
    if (terminado) return;
    if (e.target.closest('[data-aj-rendir]')) { if (confirm('¿Rendirte? Gambito gana la partida.')) { fin({ fin: 'rendicion', gana: yo === 'w' ? 'b' : 'w' }); } return; }
    if (st.turno !== yo || pensando) return;
    const pr = e.target.closest('[data-aj-promo]');
    if (pr && promo) { const mv = Ajedrez.legales(st).find(x => x.de === promo.de && x.a === promo.a && x.promo === pr.dataset.ajPromo); if (mv) { mover(mv); } return; }
    const c = e.target.closest('[data-aj]'); if (!c) return;
    const r = ajClic(st, yo, sel, Number(c.dataset.aj));
    if (r.jugada) return mover(r.jugada);
    sel = r.sel; promo = r.promo || null; pintar();
  });
  limpiezas.push(() => { terminado = true; });
  turnoBot();
}
