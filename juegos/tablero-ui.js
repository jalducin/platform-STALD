// Pantallas de los juegos de tablero (openspec: juegos-tablero): Damas, Dominó, Parchís y Batalla naval, en individual
// y en sala. Script clásico que se carga antes de los scripts de juegos/app/ (el código de juegos.html); usa en tiempo de llamada sus
// funciones globales (marco, terminar, sala, post, traerSala, participantes, pintarFinalSala, rngDe, dur, TIEMPO…).
// Los motores (sin DOM) están en juegos/tablero.js. Ganchos en juegos.html y juegos/app/*.js: buscar «juegos-tablero».
(function (g) {
  'use strict';
  const T = g.Tablero, { Damas, Domino, Parchis, Naval } = T;
  const SALA = ['damas', 'domino', 'parchis', 'naval'];
  const esSala = j => SALA.includes(j);
  const $ = id => document.getElementById(id);
  const esc = s => escapeHtml(s);
  const esperar = (ms, fn) => { const t = setTimeout(fn, ms * TIEMPO); limpiezas.push(() => clearTimeout(t)); return t; };
  const BOT_MS = 1500; // los bots de sala juegan a los 1.5 s
  const COLORES = [{ n: 'Rojo', h: '#ef4444' }, { n: 'Verde', h: '#22c55e' }, { n: 'Amarillo', h: '#eab308' }, { n: 'Azul', h: '#3b82f6' }];
  const botsIndividual = () => [BOTS[0], BOTS[1], BOT_EXTRA];

  // Tarjetas del menú: en JUEGOS (juegos/app/menu.js), que se pinta sin cargar este módulo (openspec: juegos-carga-perezosa).

  // ---------- Piezas comunes ----------
  const PIPS = [[], [4], [0, 8], [0, 4, 8], [0, 2, 6, 8], [0, 2, 4, 6, 8], [0, 2, 3, 5, 6, 8]];
  const mitad = v => '<span class="tb-mi">' + Array.from({ length: 9 }, (_, i) => '<b' + (PIPS[v].includes(i) ? ' class="on"' : '') + '></b>').join('') + '</span>';
  const fichaHtml = (a, b, cls) => '<span class="tb-ficha' + (cls || '') + '">' + mitad(a) + '<i></i>' + mitad(b) + '</span>';
  const dadoHtml = (v, gira) => '<div class="tb-dado' + (gira ? ' gira' : '') + '" role="img" aria-label="Dado: ' + v + '">' + mitad(v) + '</div>';
  const CORONA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 18 4.5 7l4.8 4.2L12 5l2.7 6.2L19.5 7 21 18z" fill="#fbbf24" stroke="#92400e" stroke-width="1.2" stroke-linejoin="round"/></svg>';
  const opcionesHtml = (nombre, lista, valor) => '<div class="opts" style="grid-template-columns:repeat(' + lista.length + ',1fr)">' +
    lista.map(([v, t]) => '<button class="opt" data-tb-opt="' + nombre + '" data-v="' + v + '" aria-pressed="' + (String(v) === String(valor)) + '">' + t + '</button>').join('') + '</div>';
  function menu(id, cuerpo, valores, alJugar) {
    const m = marco(id, { menu: true });
    const j = juegoPorId(id); // juegos-carga-perezosa: la tarjeta vive en JUEGOS
    m.body.innerHTML = '<div class="q-card"><div class="big">' + (typeof icoJuego === 'function' ? icoJuego(j) : j.emoji) + '</div><div class="q">' + esc(j.t) + '</div><div class="sub">' + esc(j.d) + '</div></div>' + cuerpo +
      '<div class="row-btns"><button class="btn ghost" data-ayuda="' + id + '">📖 Cómo se juega</button><button class="btn" data-tb-go>▶ Jugar</button></div>';
    m.body.addEventListener('click', e => {
      const o = e.target.closest('[data-tb-opt]');
      if (o) { valores[o.dataset.tbOpt] = o.dataset.v; m.body.querySelectorAll('[data-tb-opt="' + o.dataset.tbOpt + '"]').forEach(x => x.setAttribute('aria-pressed', String(x === o))); }
      if (e.target.closest('[data-tb-go]')) alJugar(valores);
    });
  }
  function elegir(id) {
    if (id === 'damas') return menu('damas', '<label>Nivel del bot</label>' + opcionesHtml('nivel', [[1, '🐣 Fácil'], [2, '🦊 Difícil']], 1) +
      '<label>Juegas con</label>' + opcionesHtml('color', [['b', '⚪ Blancas'], ['n', '⚫ Negras']], 'b'), { nivel: 1, color: 'b' }, v => jugarDamas(Number(v.nivel), v.color));
    if (id === 'domino') return menu('domino', '<p class="muted" style="text-align:center">Juegas contra 3 bots. Cada quien recibe 7 fichas y sale la mula más alta.</p>', {}, () => jugarDomino());
    if (id === 'parchis') return menu('parchis', '<label>Partida</label>' + opcionesHtml('fichas', [[2, '⚡ Rápida (2 fichas)'], [4, '🏁 Completa (4)']], 2) +
      '<label>Rivales</label>' + opcionesHtml('rivales', [[1, '🤖 1 bot'], [3, '🤖🤖🤖 3 bots']], 3), { fichas: 2, rivales: 3 }, v => jugarParchis(Number(v.fichas), Number(v.rivales)));
    if (id === 'naval') return menu('naval', '<p class="muted" style="text-align:center">Acomoda tu flota y dispara contra la del Almirante Bot 🤖. Si tocas un barco, vuelves a disparar.</p>', {}, () => jugarNaval());
  }

  // ======================= Damas =======================
  const DAMAS_FIN = { 'sin-piezas': 'quedarse sin piezas', 'sin-jugadas': 'bloqueo (sin jugadas)', 'sin-avance': '40 movimientos sin capturas', rendicion: 'rendición' };
  const nombrePieza = p => ({ b: 'peón blanco', B: 'dama blanca', n: 'peón negro', N: 'dama negra' }[p] || '');
  // o: { abajo, sel, ultima, puede (Set de casillas con jugada), destinos (Map destino → jugada), anima }
  function damasHtml(st, o) {
    const dest = o.destinos || new Map(), puede = o.puede || new Set();
    const pos = id => { const f = Damas.fila(id), c = Damas.col(id); return o.abajo === 'b' ? [f, c] : [7 - f, 7 - c]; };
    const llega = o.anima && o.ultima ? o.ultima.ruta[o.ultima.ruta.length - 1] : -1;
    let h = '<div class="tb-damas" role="grid" aria-label="Tablero de damas">';
    for (let i = 0; i < 8; i++) for (let k = 0; k < 8; k++) h += casillaDamas(st, o, { dest, puede, pos, llega }, i, k);
    return h + '</div>';
  }
  // Casilla de la fila i y la columna k en pantalla. x: { dest, puede, pos, llega } (calculados una vez en damasHtml)
  function casillaDamas(st, o, x, i, k) {
    const f = o.abajo === 'b' ? i : 7 - i, c = o.abajo === 'b' ? k : 7 - k;
    if ((f + c) % 2 === 0) return '<div class="tb-dc cl"></div>';
    const id = Damas.idx(f, c), p = st.t[id], mv = x.dest.get(id);
    const cls = (o.ultima && o.ultima.ruta.includes(id) ? ' ult' : '') + (o.sel === id ? ' sel' : '') + (x.puede.has(id) ? ' puede' : '');
    const pieza = p ? piezaDamas(o, x, p, id, i, k) : '';
    return '<button class="tb-dc os' + cls + '" data-tb-d="' + id + '" aria-label="' + Damas.nombre(id) + (p ? ' ' + nombrePieza(p) : '') + (mv ? ', destino' : '') + '">' + pieza +
      destinoDamas(mv) + '</button>';
  }
  // Pieza p en la casilla id; si es la que acaba de llegar, sale desde su casilla de origen (animación).
  function piezaDamas(o, x, p, id, i, k) {
    let estilo = '';
    if (id === x.llega) { const [f0, c0] = x.pos(o.ultima.ruta[0]); estilo = ' style="--dx:' + (c0 - k) * 100 + '%;--dy:' + (f0 - i) * 100 + '%"'; }
    return '<span class="tb-pzw' + (id === x.llega ? ' llega' : '') + '"' + estilo + '><span class="tb-pz ' + Damas.color(p) + (Damas.esDama(p) ? ' dama' : '') + '">' + (Damas.esDama(p) ? CORONA : '') + '</span></span>';
  }
  const destinoDamas = mv => { if (!mv) { return ''; } return '<span class="tb-dest' + (mv.capturas.length ? ' come' : '') + '"></span>'; };
  // Selección común al individual y a la sala: { sel, jugada?, msg? }
  function damasClic(st, color, sel, id) {
    const ls = Damas.legales(st);
    if (sel !== null) { const mv = ls.find(m => m.ruta[0] === sel && m.ruta[m.ruta.length - 1] === id); if (mv) return { sel: null, jugada: mv }; }
    const p = st.t[id];
    if (p && Damas.color(p) === color) {
      if (ls.some(m => m.ruta[0] === id)) return { sel: id === sel ? null : id };
      return { sel: null, msg: ls.some(m => m.capturas.length) ? '⚠️ ¡Captura obligatoria! Mueve una pieza que pueda comer.' : 'Esa pieza no tiene movimientos.' };
    }
    return { sel: null };
  }
  function damasOpciones(st, sel, miTurno) {
    if (!miTurno) return {};
    const ls = Damas.legales(st);
    return { puede: new Set(ls.map(m => m.ruta[0])), destinos: new Map(sel === null ? [] : ls.filter(m => m.ruta[0] === sel).map(m => [m.ruta[m.ruta.length - 1], m])) };
  }
  const contarHtml = (n, color) => '<span class="tb-cuenta"><span class="tb-pz mini ' + color + '"></span> ×' + n + '</span>';
  const avisoDamas = (pensando, turnoYo) => { if (pensando) { return '🤔 Gambito está pensando…'; } return turnoYo ? '👉 Tu turno: toca una pieza y luego su destino' : ''; };
  const resDamas = (gane, empate) => { if (gane) { return 'gana'; } return empate ? 'empate' : 'pierde'; };
  const tituloDamas = (gane, empate, fin) => { if (gane) { return '🏆 ¡Ganaste por ' + DAMAS_FIN[fin] + '!'; } return empate ? '🤝 Empate: ' + DAMAS_FIN[fin] : '😅 Ganó Gambito por ' + DAMAS_FIN[fin]; };

  function jugarDamas(nivel, yo) {
    const m = marco('damas');
    const bot = Damas.otro(yo), t0 = Date.now();
    let st = Damas.nueva(), sel = null, ultima = null, pensando = false, terminado = false, msg = '', anima = false;
    const pintar = () => {
      const turnoYo = st.turno === yo && !pensando && !terminado;
      m.body.innerHTML = '<div class="tb-wrap"><div class="tb-info"><span>🤖 Gambito · ' + (nivel === 1 ? '🐣 Fácil' : '🦊 Difícil') + '</span>' + contarHtml(Damas.piezas(st, bot), bot) + '</div>' +
        damasHtml(st, { abajo: yo, sel, ultima, anima, ...damasOpciones(st, sel, turnoYo) }) +
        '<div class="tb-info"><span>🙂 Tú (' + (yo === 'b' ? 'blancas' : 'negras') + ')</span>' + contarHtml(Damas.piezas(st, yo), yo) + '</div>' +
        '<div class="feedback" role="status">' + (msg || avisoDamas(pensando, turnoYo)) + '</div>' +
        '<div class="row-btns"><button class="btn ghost sm" data-ayuda="damas">📖 Cómo se juega</button><button class="btn ghost sm" data-tb-rendir>🏳️ Rendirme</button></div></div>';
      anima = false;
      m.puntos(12 - Damas.piezas(st, bot));
    };
    const fin = res => {
      terminado = true;
      const gane = res.gana === yo, empate = !!res.empate, capt = 12 - Damas.piezas(st, bot);
      const puntos = T.puntos.damas(resDamas(gane, empate), nivel, Damas.piezas(st, yo), capt);
      esperar(res.fin === 'rendicion' ? 0 : 1600, () => terminar('damas', { puntos, aciertos: capt, total: 12, segundos: (Date.now() - t0) / 1000,
        titulo: tituloDamas(gane, empate, res.fin),
        detalle: st.jugadas + ' movimientos · nivel ' + (nivel === 1 ? '🐣 Fácil' : '🦊 Difícil') }));
    };
    const mover = mv => {
      st = Damas.aplicar(st, mv); ultima = mv; sel = null; msg = ''; anima = true;
      tono(mv.capturas.length ? 330 : 520, 60);
      const res = Damas.resultado(st);
      if (res) {
        if (res.empate) msg = '🤝 Empate';
        else msg = res.gana === yo ? '🏆 ¡Ganaste!' : '😅 Ganó Gambito';
        pintar(); return fin(res);
      }
      turnoBot();
    };
    function turnoBot() {
      if (terminado || st.turno === yo) return pintar();
      pensando = true; pintar();
      esperar(550, () => { if (terminado) { return; } pensando = false; mover(Damas.bot(st, nivel, Math.random)); });
    }
    m.body.addEventListener('click', e => {
      if (terminado) return;
      if (e.target.closest('[data-tb-rendir]')) { if (confirm('¿Rendirte? Gambito gana la partida.')) { fin({ gana: bot, fin: 'rendicion' }); } return; }
      const c = e.target.closest('[data-tb-d]');
      if (!c || st.turno !== yo || pensando) return;
      const r = damasClic(st, yo, sel, Number(c.dataset.tbD));
      if (r.jugada) return mover(r.jugada);
      sel = r.sel; msg = r.msg || ''; if (r.msg) { sonidoMal(); } pintar();
    });
    limpiezas.push(() => { terminado = true; });
    turnoBot();
  }

  // ======================= Dominó =======================
  const ultimaDe = (st, j) => { for (let i = st.log.length - 1; i >= 0; i--) { if (st.log[i].j === j) return st.log[i]; } return null; };
  const accionTxt = x => { if (!x) { return ''; } return x.pasa ? '🙅 pasó' : 'tiró ' + Domino.FICHAS[x.ficha].join('-'); };
  function mesaDominoHtml(st) {
    const nueva = st.log.length && !st.log[st.log.length - 1].pasa ? st.log[st.log.length - 1].ficha : -1;
    return '<div class="tb-mesa-wrap"><div class="tb-extremos">' + (st.mesa.length ? '<span>⬅️ ' + st.izq + '</span><span class="muted">' + st.mesa.length + ' en la mesa</span><span>' + st.der + ' ➡️</span>' : '<span class="muted">Mesa vacía: sale la mula más alta</span>') + '</div>' +
      '<div class="tb-mesa" aria-label="Fichas en la mesa">' + st.mesa.map(x => fichaHtml(x.a, x.b, (x.a === x.b ? ' v' : '') + ' chica' + (x.f === nueva ? ' nueva' : ''))).join('') + '</div></div>';
  }
  function rivalesDominoHtml(st, orden, yo) {
    return '<div class="tb-rivales">' + orden.map((p, j) => { if (j === yo) { return ''; } return '<div class="tb-rival' + (st.turno === j && !st.fin ? ' turno' : '') + '">' + avatarHtml(p.avatar, 22) + '<span class="n">' + esc(p.nombre) + '</span>' +
      '<span class="tb-dorsos" aria-label="' + st.manos[j].length + ' fichas">' + '<i></i>'.repeat(st.manos[j].length) + '</span><span class="tb-acc">' + esc(accionTxt(ultimaDe(st, j))) + '</span></div>'; }).join('') + '</div>';
  }
  const claseFichaMano = (ok, miTurno) => { if (ok) { return ' jugable'; } return miTurno ? ' apagada' : ''; };
  // Mano del jugador j: las que embonan se resaltan en su turno; si una ficha entra en los dos lados se elige el lado.
  function manoDominoHtml(st, j, miTurno, sel) {
    if (j < 0) return '';
    const js = miTurno ? Domino.jugables(st, j) : [];
    const lados = sel === null ? [] : js.filter(x => x.ficha === sel);
    return '<div class="tb-mano" aria-label="Tus fichas">' + st.manos[j].map(f => { const [a, b] = Domino.FICHAS[f], ok = js.some(x => x.ficha === f);
      return '<button class="tb-fb' + claseFichaMano(ok, miTurno) +(sel === f ? ' sel' : '') + '" data-tb-f="' + f + '" aria-label="Ficha ' + a + '-' + b + (ok ? ', se puede tirar' : '') + '">' + fichaHtml(a, b, ' v') + '</button>'; }).join('') + '</div>' +
      (lados.length > 1 ? '<div class="row-btns"><button class="btn" data-tb-lado="i">⬅️ A la izquierda (' + st.izq + ')</button><button class="btn" data-tb-lado="d">A la derecha (' + st.der + ') ➡️</button></div>' : '');
  }
  // Clic en la mano: devuelve la jugada lista o cambia la selección (tb.sel).
  function dominoClic(st, j, tb, e) {
    const js = Domino.jugables(st, j);
    const l = e.target.closest('[data-tb-lado]');
    if (l && tb.sel !== null) { const mv = js.find(x => x.ficha === tb.sel && x.lado === l.dataset.tbLado); tb.sel = null; return mv ? { accion: 'jugar', ficha: mv.ficha, lado: mv.lado } : null; }
    const b = e.target.closest('[data-tb-f]'); if (!b) return null;
    const f = Number(b.dataset.tbF), op = js.filter(x => x.ficha === f);
    if (!op.length) { tb.sel = null; tb.msg = 'Esa ficha no embona: busca un ' + st.izq + ' o un ' + st.der + '.'; sonidoMal(); return null; }
    tb.msg = '';
    if (op.length === 1) { tb.sel = null; return { accion: 'jugar', ficha: f, lado: op[0].lado }; }
    tb.sel = tb.sel === f ? null : f;
    return null;
  }
  const resDomino = (st, j) => { if (!st.fin.ganadores.includes(j)) { return 'pierde'; } return st.fin.ganadores.length === 1 ? 'gana' : 'empate'; };
  const puntosDomino = (st, j) => T.puntos.domino(resDomino(st, j), st.manos.reduce((s, _, k) => k === j ? s : s + Domino.pips(st, k), 0), Domino.pips(st, j));
  const tituloDomino = (st, nombre) => {
    if (!st.fin.cerrado) return '🔳 ¡Dominó de ' + nombre(st.fin.ganadores[0]) + '!';
    return '🔒 Juego cerrado · ' + (st.fin.ganadores.length > 1 ? 'empate entre ' + st.fin.ganadores.map(nombre).join(' y ') : 'gana ' + nombre(st.fin.ganadores[0]) + ' con menos puntos');
  };
  const avisoDomino = (st, miTurno, orden) => { if (st.fin) { return ''; } return miTurno ? '👉 Tu turno: toca una ficha que embone' : '⏳ Turno de ' + orden[st.turno].nombre; };

  function jugarDomino() {
    const m = marco('domino');
    const orden = [{ nombre: 'Tú', avatar: state.jugador && state.jugador.avatar }].concat(botsIndividual().map(b => ({ nombre: b.nombre, avatar: b.avatar, bot: true })));
    const st = Domino.nueva(4, Math.random), t0 = Date.now(), tb = { sel: null, msg: '' };
    let terminado = false;
    const pintar = () => {
      const miTurno = st.turno === 0 && !st.fin;
      m.body.innerHTML = '<div class="tb-wrap">' + rivalesDominoHtml(st, orden, 0) + mesaDominoHtml(st) +
        '<div class="feedback" role="status">' + esc(tb.msg || avisoDomino(st, miTurno, orden)) + '</div>' +
        manoDominoHtml(st, 0, miTurno, tb.sel) + '<div class="tb-acc" style="text-align:center">' + esc(accionTxt(ultimaDe(st, 0)) ? 'Tú: ' + accionTxt(ultimaDe(st, 0)) : '') + '</div>' +
        '<div class="row-btns"><button class="btn ghost sm" data-ayuda="domino">📖 Cómo se juega</button></div></div>';
      m.puntos(7 - st.manos[0].length);
    };
    const siguiente = () => {
      if (st.fin) {
        if (terminado) { return; } terminado = true; pintar();
        const puntos = puntosDomino(st, 0);
        return esperar(1800, () => terminar('domino', { puntos, aciertos: 7 - st.manos[0].length, total: 7, segundos: (Date.now() - t0) / 1000,
          titulo: tituloDomino(st, j => orden[j].nombre), detalle: 'Te quedaron ' + Domino.pips(st, 0) + ' puntos en la mano.' }));
      }
      pintar();
      if (st.turno !== 0) esperar(900, () => { Domino.jugar(st, Domino.bot(st, Math.random)); tono(440, 50); siguiente(); });
    };
    m.body.addEventListener('click', e => {
      if (st.fin || st.turno !== 0) return;
      const mv = dominoClic(st, 0, tb, e);
      if (mv) { Domino.jugar(st, mv); tono(520, 60); return siguiente(); }
      if (e.target.closest('[data-tb-f], [data-tb-lado]')) pintar();
    });
    limpiezas.push(() => { terminado = true; });
    siguiente();
  }

  // ======================= Parchís =======================
  let svgParchisCache = '';
  function svgParchis() {
    if (svgParchisCache) return svgParchisCache;
    const R = (x, y, w, h, fill, extra) => '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="' + fill + '"' + (extra || '') + '/>';
    const estrella = (cx, cy) => { let p = ''; for (let i = 0; i < 10; i++) { const r = i % 2 ? 0.16 : 0.38, a = -Math.PI / 2 + i * Math.PI / 5; p += (cx + r * Math.cos(a)).toFixed(3) + ',' + (cy + r * Math.sin(a)).toFixed(3) + ' '; } return '<polygon points="' + p + '" fill="#f59e0b" opacity=".85"/>'; };
    let s = '<svg viewBox="0 0 15 15" class="tb-par-svg" aria-hidden="true">' + R(0, 0, 15, 15, '#fffdf7');
    [[0, 0], [9, 0], [9, 9], [0, 9]].forEach(([x, y], k) => {
      s += R(x, y, 6, 6, COLORES[k].h) + R(x + 0.7, y + 0.7, 4.6, 4.6, '#fffdf7', ' rx=".7"');
      const [f0, c0] = Parchis.CASA[k];
      for (let f = 0; f < 4; f++) s += '<circle cx="' + (c0 + (f & 1) * 1.8 + 0.5) + '" cy="' + (f0 + (f >> 1) * 1.8 + 0.5) + '" r=".55" fill="' + COLORES[k].h + '" opacity=".3"/>';
    });
    Parchis.ANILLO.forEach(([f, c], i) => {
      const k = Parchis.SALIDAS.indexOf(i);
      s += R(c, f, 1, 1, k >= 0 ? COLORES[k].h : '#fff', ' stroke="#94a3b8" stroke-width=".05"' + (k >= 0 ? ' opacity=".75"' : ''));
      if (Parchis.SEGURAS.includes(i) && k < 0) s += estrella(c + 0.5, f + 0.5);
    });
    Parchis.PASILLO.forEach((l, k) => l.forEach(([f, c]) => { s += R(c, f, 1, 1, COLORES[k].h, ' stroke="#fff" stroke-width=".05" opacity=".8"'); }));
    const tri = (pts, k) => '<polygon points="' + pts + '" fill="' + COLORES[k].h + '" stroke="#fff" stroke-width=".05"/>';
    s += tri('6,6 6,9 7.5,7.5', 0) + tri('6,6 9,6 7.5,7.5', 1) + tri('9,6 9,9 7.5,7.5', 2) + tri('6,9 9,9 7.5,7.5', 3);
    svgParchisCache = s + '</svg>';
    return svgParchisCache;
  }
  // o: { yo, movibles, anima (entrada del log a animar) }
  function parchisHtml(st, o) {
    const ocup = {};
    let h = '<div class="tb-parchis">' + svgParchis();
    st.fichas.forEach((fs, j) => fs.forEach((_, f) => {
      const [r, c] = Parchis.celda(st, j, f), key = r + ',' + c, k = ocup[key] = (ocup[key] || 0) + 1;
      const off = (k - 1) * 0.22, mia = j === o.yo, mov = mia && o.movibles.includes(f);
      const an = o.anima && o.anima.j === j && o.anima.f === f;
      let estilo = 'left:' + ((c + off) / 15 * 100).toFixed(3) + '%;top:' + ((r + off) / 15 * 100).toFixed(3) + '%;--c:' + COLORES[st.colores[j]].h;
      if (an) { const p = st.fichas[j][f]; st.fichas[j][f] = o.anima.de; const [r0, c0] = Parchis.celda(st, j, f); st.fichas[j][f] = p; estilo += ';--dx:' + ((c0 - c - off) * 100).toFixed(0) + '%;--dy:' + ((r0 - r - off) * 100).toFixed(0) + '%'; }
      h += '<span class="tb-pf' + (mov ? ' mov' : '') + (an ? ' llega' : '') + '" style="' + estilo + '"' + (mov ? ' data-tb-pf="' + f + '"' : '') + ' aria-hidden="true"><i>' + (mia ? f + 1 : '') + '</i></span>';
    }));
    return h + '</div>';
  }
  const nombreCasilla = p => {
    if (p === -1) return 'casa';
    if (p === Parchis.META) return 'meta';
    return p > 50 ? 'pasillo' : 'casilla ' + p;
  };
  // Texto del botón de la ficha f: de la casilla p a la casilla a.
  const textoBotonParchis = (f, p, a) => {
    if (p === -1) return '🚪 Sacar la ficha ' + (f + 1);
    if (a === Parchis.META) return '🏁 Ficha ' + (f + 1) + ' a la meta';
    return '➡️ Ficha ' + (f + 1) + ' (' + nombreCasilla(p) + ' → ' + nombreCasilla(a) + ')';
  };
  function botonesParchis(st, j, movs) {
    return '<div class="tb-movs">' + movs.map(f => { const p = st.fichas[j][f], a = Parchis.destino(st, j, f);
      return '<button class="btn" data-tb-pf="' + f + '">' + textoBotonParchis(f, p, a) + '</button>'; }).join('') + '</div>';
  }
  function jugadoresParchisHtml(st, orden) {
    return '<div class="tb-rivales">' + orden.map((p, j) => '<div class="tb-rival' + (st.turno === j && !st.fin ? ' turno' : '') + '"><span class="tb-punto" style="background:' + COLORES[st.colores[j]].h + '"></span>' +
      avatarHtml(p.avatar, 22) + '<span class="n">' + esc(p.nombre) + '</span><span class="tb-acc">🏁 ' + Parchis.enMeta(st, j) + '/' + st.cuantas + '</span></div>').join('') + '</div>';
  }
  function logParchis(st, orden) {
    const x = st.log[st.log.length - 1]; if (!x) return '';
    const n = orden[x.j].nombre;
    if (x.sin) return '🎲 ' + n + ' sacó ' + x.dado + ' y no pudo mover';
    let como = ' y avanzó';
    if (x.de === -1) como = ' y sacó una ficha';
    else if (x.a === Parchis.META) como = ' y metió una ficha 🏁';
    let extra = '';
    if (x.comio) extra = ' · ¡comió! 😋 y vuelve a tirar';
    else if (x.dado === 6) extra = ' · con 6 vuelve a tirar';
    return '🎲 ' + n + ' sacó ' + x.dado + como + extra;
  }
  // Última jugada con movimiento (para animarla).
  const ultimoMov = st => { for (let i = st.log.length - 1; i >= 0; i--) { if (!st.log[i].sin) return st.log[i]; } return null; };
  const avisoParchis = (st, miTurno, orden) => { if (st.fin) { return ''; } return miTurno ? '👉 ¡Tu turno! Sacaste ' + st.dado : '⏳ Tira ' + orden[st.turno].nombre; };

  function jugarParchis(cuantas, rivales) {
    const m = marco('parchis');
    const n = rivales + 1;
    const orden = [{ nombre: 'Tú', avatar: state.jugador && state.jugador.avatar }].concat(botsIndividual().slice(0, rivales).map(b => ({ nombre: b.nombre, avatar: b.avatar, bot: true })));
    const st = Parchis.nueva(n, Math.floor(Math.random() * 2147483647), cuantas), t0 = Date.now(); // NOSONAR: azar de juego, no criptográfico
    let terminado = false, kVisto = -1, logVisto = -1;
    const pintar = () => {
      const miTurno = st.turno === 0 && !st.fin, movs = miTurno ? Parchis.movibles(st) : [];
      const anima = st.log.length !== logVisto ? ultimoMov(st) : null; logVisto = st.log.length;
      m.body.innerHTML = '<div class="tb-wrap">' + jugadoresParchisHtml(st, orden) + parchisHtml(st, { yo: 0, movibles: movs, anima }) +
        '<div class="tb-turno">' + dadoHtml(st.dado, st.k !== kVisto) + '<div><b>' + esc(avisoParchis(st, miTurno, orden)) + '</b><div class="muted tb-acc">' + esc(logParchis(st, orden)) + '</div></div></div>' +
        (miTurno ? botonesParchis(st, 0, movs) : '') + '<div class="row-btns"><button class="btn ghost sm" data-ayuda="parchis">📖 Cómo se juega</button></div></div>';
      kVisto = st.k;
      m.puntos(Parchis.enMeta(st, 0));
    };
    const siguiente = () => {
      pintar();
      if (st.fin) {
        if (terminado) { return; } terminado = true;
        const meta = Parchis.enMeta(st, 0), gane = st.fin.ganador === 0;
        return esperar(1800, () => terminar('parchis', { puntos: T.puntos.parchis(meta, cuantas, gane), aciertos: meta, total: cuantas, segundos: (Date.now() - t0) / 1000,
          titulo: gane ? '🏆 ¡Ganaste! Metiste todas tus fichas' : '🎲 Ganó ' + orden[st.fin.ganador].nombre, detalle: 'Metiste ' + meta + ' de ' + cuantas + ' fichas a la meta.' }));
      }
      if (st.turno !== 0) esperar(900, () => { Parchis.mover(st, Parchis.bot(st, Math.random)); tono(400, 40); siguiente(); });
    };
    m.body.addEventListener('click', e => {
      const b = e.target.closest('[data-tb-pf]');
      if (!b || st.fin || st.turno !== 0) return;
      if (Parchis.mover(st, Number(b.dataset.tbPf))) { tono(520, 60); siguiente(); }
    });
    limpiezas.push(() => { terminado = true; });
    siguiente();
  }

  // ======================= Batalla naval =======================
  // o: { celda: c → { cls, txt? }, clic, titulo, chico }
  function navalHtml(o) {
    let h = '<div class="tb-naval' + (o.chico ? ' chico' : '') + '" role="grid" aria-label="' + esc(o.titulo) + '"><span class="tb-nh"></span>' + 'ABCDEFGHIJ'.split('').map(l => '<span class="tb-nh">' + l + '</span>').join('');
    for (let f = 0; f < 10; f++) {
      h += '<span class="tb-nh">' + (f + 1) + '</span>';
      for (let k = 0; k < 10; k++) {
        const c = f * 10 + k, x = o.celda(c) || { cls: '' };
        if (o.clic) h += '<button class="tb-nc ' + x.cls + '" data-tb-n="' + c + '" aria-label="' + Naval.nombre(c) + (x.txt ? ' ' + x.txt : '') + '"></button>';
        else h += '<span class="tb-nc ' + x.cls + '"></span>';
      }
    }
    return h + '</div>';
  }
  // Mis disparos sobre el tablero rival (resultado y barcos hundidos) y, si la conozco, la flota rival.
  function celdaAtaque(tiros, flotaRival, ultimo) {
    const res = new Map(tiros.map(x => [x.c, x.r]));
    const hundidas = new Set(tiros.filter(x => x.r === 'hundido').flatMap(x => x.barco || []));
    const barcos = new Set((flotaRival || []).flat());
    const clase = c => {
      if (hundidas.has(c)) return 'hun';
      if (res.get(c) === 'agua') return 'agua';
      if (res.has(c)) return 'toc';
      return barcos.has(c) ? 'barco oculto' : '';
    };
    const texto = c => {
      if (hundidas.has(c)) return 'hundido';
      if (res.get(c) === 'agua') return 'agua';
      return res.has(c) ? 'tocado' : '';
    };
    return c => ({ cls: clase(c) + (c === ultimo ? ' ult' : ''), txt: texto(c) });
  }
  function celdaPropia(flota, tirosRival, ultimo, selBarco) {
    const res = new Map(tirosRival.map(x => [x.c, x.r]));
    const deBarco = new Map(); (flota || []).forEach((b, i) => (b || []).forEach(c => deBarco.set(c, i)));
    const claseBarco = i => { if (i === undefined) { return ''; } return 'barco' + (selBarco === i ? ' sel' : ''); };
    const claseTiro = r => {
      if (r === 'agua') return ' agua';
      if (!r) return '';
      return r === 'hundido' ? ' hun' : ' toc';
    };
    return c => { const i = deBarco.get(c), r = res.get(c);
      return { cls: claseBarco(i) + claseTiro(r) + (c === ultimo ? ' ult' : ''), txt: i !== undefined ? 'barco' : '' }; };
  }
  const textoTiro = x => {
    if (!x) return '';
    if (x.r === 'agua') return '💦 ¡Agua! en ' + Naval.nombre(x.c);
    return x.r === 'tocado' ? '💥 ¡Tocado! en ' + Naval.nombre(x.c) : '🔥 ¡Hundido! en ' + Naval.nombre(x.c);
  };
  // Acomodo: { barcos: [celdas|null ×5], sel, h, msg }
  const nuevaColocacion = () => ({ barcos: Naval.FLOTA.map(() => null), sel: 0, h: true, msg: '' });
  function colocacionHtml(col, extra) {
    const listo = col.barcos.every(Boolean);
    return '<div class="tb-wrap"><div class="feedback" role="status">' + esc(col.msg || (listo ? '✅ Tu flota está lista.' : '👉 Elige un barco y toca la casilla donde empieza.')) + '</div>' +
      navalHtml({ titulo: 'Tu flota', clic: true, celda: celdaPropia(col.barcos, [], -1, col.sel) }) +
      '<div class="tb-barcos">' + Naval.FLOTA.map((l, i) => '<button class="opt sm' + (col.barcos[i] ? ' puesto' : '') + '" data-tb-barco="' + i + '" aria-pressed="' + (col.sel === i) + '">' + (col.barcos[i] ? '✅ ' : '🚢 ') + Naval.NOMBRES[i] + ' · ' + l + '</button>').join('') + '</div>' +
      '<div class="row-btns"><button class="btn ghost" data-tb-girar>↻ Girar: ' + (col.h ? '↔️ horizontal' : '↕️ vertical') + '</button><button class="btn ghost" data-tb-auto>🎲 Acomodo automático</button></div>' +
      '<div class="row-btns"><button class="btn ghost" data-tb-limpiar>🧹 Limpiar</button><button class="btn" data-tb-listo' + (listo ? '' : ' disabled') + '>✅ ¡Listo!</button></div>' + (extra || '') + '</div>';
  }
  // Devuelve true si se tocó «¡Listo!» con la flota completa.
  function colocacionClic(col, e) {
    const b = e.target.closest('[data-tb-barco]');
    if (b) { const i = Number(b.dataset.tbBarco); col.barcos[i] = null; col.sel = i; col.msg = ''; return false; }
    if (e.target.closest('[data-tb-girar]')) { col.h = !col.h; return false; }
    if (e.target.closest('[data-tb-auto]')) { col.barcos = Naval.autoFlota(Math.random); col.sel = null; col.msg = '🎲 Flota acomodada. Puedes moverla o tocar «¡Listo!».'; return false; }
    if (e.target.closest('[data-tb-limpiar]')) { Object.assign(col, nuevaColocacion()); return false; }
    if (e.target.closest('[data-tb-listo]')) return col.barcos.every(Boolean);
    const n = e.target.closest('[data-tb-n]'); if (!n) return false;
    const c = Number(n.dataset.tbN), i = col.barcos.findIndex(x => x && x.includes(c));
    if (i >= 0) { col.barcos[i] = null; col.sel = i; col.msg = 'Levantaste el ' + Naval.NOMBRES[i].toLowerCase() + ': tócalo en otro lugar.'; return false; }
    if (col.sel === null) { col.msg = 'Elige primero un barco de la lista.'; return false; }
    const celdas = Naval.celdas(c, Naval.FLOTA[col.sel], col.h);
    if (!celdas) { col.msg = 'No cabe ahí: gíralo o elige otra casilla.'; sonidoMal(); return false; }
    if (celdas.some(x => col.barcos.some(b2 => b2 && b2.includes(x)))) { col.msg = 'Se encima con otro barco.'; sonidoMal(); return false; }
    col.barcos[col.sel] = celdas; col.msg = ''; tono(600, 40);
    const libre = col.barcos.findIndex(x => !x); col.sel = libre >= 0 ? libre : null;
    return false;
  }

  function jugarNaval() {
    const m = marco('naval');
    const col = nuevaColocacion(), t0 = Date.now();
    let fase = 'colocar', miFlota = null, rival = null, terminado = false, pensando = false, msg = '';
    const mis = [], suyos = [];
    const pintar = () => {
      if (fase === 'colocar') { m.body.innerHTML = colocacionHtml(col); return; }
      const miTurno = !pensando && !terminado;
      const ultMio = mis.length ? mis[mis.length - 1].c : -1, ultSuyo = suyos.length ? suyos[suyos.length - 1].c : -1;
      m.body.innerHTML = '<div class="tb-wrap"><div class="feedback" role="status">' + esc(msg || (miTurno ? '👉 Tu turno: dispara a una casilla del mar rival' : '')) + '</div>' +
        '<h3 class="tb-h">🎯 Mar del Almirante Bot · ' + mis.filter(x => x.r !== 'agua').length + '/17</h3>' + navalHtml({ titulo: 'Mar rival', clic: miTurno, celda: celdaAtaque(mis, terminado ? rival : null, ultMio) }) +
        '<h3 class="tb-h">🛟 Tu flota · ' + suyos.filter(x => x.r !== 'agua').length + '/17 tocados</h3>' + navalHtml({ titulo: 'Tu flota', chico: true, celda: celdaPropia(miFlota, suyos, ultSuyo) }) +
        '<div class="row-btns"><button class="btn ghost sm" data-ayuda="naval">📖 Cómo se juega</button><button class="btn ghost sm" data-tb-rendir>🏳️ Rendirme</button></div></div>';
      m.puntos(mis.filter(x => x.r !== 'agua').length);
    };
    const fin = gane => {
      terminado = true; pensando = false;
      msg = gane ? '🏆 ¡Hundiste toda la flota rival!' : '😅 El Almirante Bot hundió tu flota';
      pintar();
      const toques = mis.filter(x => x.r !== 'agua').length;
      esperar(2200, () => terminar('naval', { puntos: T.puntos.naval(gane, mis.length, toques), aciertos: toques, total: 17, segundos: (Date.now() - t0) / 1000,
        titulo: gane ? '🚢 ¡Ganaste la batalla naval!' : '⚓ Ganó el Almirante Bot', detalle: mis.length + ' disparos · ' + toques + ' aciertos' }));
    };
    const turnoBot = () => {
      pensando = true; pintar();
      esperar(750, () => {
        if (terminado) return;
        const c = Naval.bot(suyos, Math.random), r = Naval.disparo(miFlota, suyos.map(x => x.c), c);
        suyos.push({ c, ...r }); msg = '🤖 ' + textoTiro(suyos[suyos.length - 1]);
        tono(r.r === 'agua' ? 300 : 180, 90, r.r === 'agua' ? 'sine' : 'square', 0.05);
        if (Naval.todoHundido(miFlota, suyos.map(x => x.c))) return fin(false);
        if (r.r === 'agua') { pensando = false; return pintar(); }
        turnoBot();
      });
    };
    m.body.addEventListener('click', e => {
      if (terminado) return;
      if (fase === 'colocar') {
        if (colocacionClic(col, e)) { miFlota = col.barcos; rival = Naval.autoFlota(Math.random); fase = 'batalla'; msg = '⚓ ¡A la batalla! Empiezas tú.'; }
        return pintar();
      }
      if (e.target.closest('[data-tb-rendir]')) { if (confirm('¿Rendirte? El Almirante Bot gana la partida.')) { fin(false); } return; }
      const n = e.target.closest('[data-tb-n]');
      if (!n || pensando) return;
      const c = Number(n.dataset.tbN);
      if (mis.some(x => x.c === c)) { msg = 'Ya disparaste a ' + Naval.nombre(c) + '.'; return pintar(); }
      const r = Naval.disparo(rival, mis.map(x => x.c), c);
      mis.push({ c, ...r }); msg = textoTiro(mis[mis.length - 1]) + (r.r === 'hundido' ? ' (' + Naval.NOMBRES[Naval.FLOTA.indexOf(r.barco.length)].toLowerCase() + ')' : '');
      if (r.r === 'agua') sonidoMal(); else sonidoOk();
      if (Naval.todoHundido(rival, mis.map(x => x.c))) return fin(true);
      if (r.r === 'agua') turnoBot(); else { msg += ' · ¡Dispara otra vez!'; pintar(); }
    });
    limpiezas.push(() => { terminado = true; });
    pintar();
  }

  // ======================= Salas =======================
  // Reproducción determinista de Damas, Dominó y Parchís (igual que estadoCartasSala): el paso n cuenta las jugadas de
  // personas y bots; los bots juegan a los 1.5 s; si se vence el turno de una persona juega el bot por ella; una
  // jugada ilegal se ignora. En Damas, «rendirse» termina la partida.
  const CFG = {
    damas: { max: 2, turnoMs: 60000, nueva: () => ({ s: Damas.nueva(), ultima: null }), turno: st => st.s.turno === 'b' ? 0 : 1, fin: st => Damas.resultado(st.s),
      actuar: (st, mv) => { const m = Damas.buscar(st.s, mv.ruta); if (!m) { return false; } st.s = Damas.aplicar(st.s, m); st.ultima = m; return true; },
      bot: (st, rnd) => ({ accion: 'mover', ruta: Damas.bot(st.s, 1, rnd).ruta }) },
    domino: { max: 4, turnoMs: 30000, nueva: (n, seed) => Domino.nueva(n, T.rng(seed + '|domino')), turno: st => st.turno, fin: st => st.fin,
      actuar: (st, mv) => Domino.jugar(st, mv), bot: (st, rnd) => ({ accion: 'jugar', ...Domino.bot(st, rnd) }) },
    parchis: { max: 4, turnoMs: 30000, nueva: (n, seed) => Parchis.nueva(n, seed, 4), turno: st => st.turno, fin: st => st.fin,
      actuar: (st, mv) => Parchis.mover(st, mv.ficha), bot: (st, rnd) => ({ accion: 'mover', ficha: Parchis.bot(st, rnd) }) },
  };
  function reproducir(juego) {
    const cfg = CFG[juego], e = sala.estado, s = e.sala;
    const orden = participantes().slice(0, cfg.max);
    if (orden.length < 2) return { faltan: true, orden };
    const jugs = new Map();
    e.jugadores.forEach(x => (x.jugadas || []).forEach(j => { if (!jugs.has(j.n)) jugs.set(j.n, { jugador: x.id, ...j }); }));
    const st = cfg.nueva(orden.length, s.seed);
    let paso = 0, T0 = s.inicio, rendido = null;
    const ahora = ahoraServidor();
    for (let guard = 0; guard < 4000 && !cfg.fin(st); guard++) {
      const i = cfg.turno(st), p = orden[i];
      if (p.bot) { const t = T0 + dur(BOT_MS); if (ahora < t) { break; } cfg.actuar(st, cfg.bot(st, rngDe(s.seed, juego + 'bot' + paso))); paso++; T0 = t; continue; }
      const mv = jugs.get(paso), lim = T0 + dur(cfg.turnoMs);
      if (mv && mv.jugador === p.id && mv.t <= lim) {
        paso++;
        if (mv.accion === 'rendirse') { rendido = i; break; }
        if (cfg.actuar(st, mv)) T0 = Math.max(T0, mv.t);
      } else if (ahora >= lim) { cfg.actuar(st, cfg.bot(st, rngDe(s.seed, juego + 'auto' + paso))); paso++; T0 = lim; }
      else break;
    }
    const turnoIdx = cfg.turno(st);
    return { st, orden, paso, T0, rendido, turnoIdx, ventana: dur(orden[turnoIdx] && orden[turnoIdx].bot ? BOT_MS : cfg.turnoMs) };
  }
  const estadoTb = () => { if (!sala.tb || sala.tb.codigo !== sala.codigo) { sala.tb = { codigo: sala.codigo, sel: null, enviando: false, msg: '', col: null, miFlota: null, logVisto: -1, kVisto: -1 }; } return sala.tb; };
  async function enviar(jugada, n) {
    const tb = estadoTb();
    tb.enviando = true; tb.sel = null; sala.vista = null; pintarSala();
    const r = await post('/juegos/sala/' + sala.codigo + '/respuesta', { jugada: { n, ...jugada } });
    await traerSala();
    tb.enviando = false; sala.vista = null;
    if (!r.ok && r.body.error !== 'turno_tomado') tb.msg = TXT_ERROR[r.body.error] || 'No se pudo enviar la jugada (' + (r.body.error || r.status) + ').';
    pintarSala();
    return r;
  }
  const TXT_ERROR = { ya_disparaste: 'Ya disparaste a esa casilla.', no_es_tu_turno: 'Todavía no es tu turno.', falta_flota: 'Falta que tu rival acomode su flota.', partida_terminada: 'La partida ya terminó.', aun_no: 'Tu rival todavía tiene tiempo para jugar.', flota_invalida: 'Esa flota no es válida.' };
  function cuentaRegresiva(body, s, texto) {
    const k = 'cuenta:' + Math.ceil((s.inicio - ahoraServidor()) / 1000);
    if (sala.vista !== k) { body.innerHTML = '<div class="q-card"><div class="sub">' + esc(texto) + '</div><div class="letra">' + Math.ceil((s.inicio - ahoraServidor()) / 1000) + '</div></div>'; sala.vista = k; }
  }
  const nota = (body, texto) => { if (sala.vista !== 'nota:' + texto) { body.innerHTML = '<div class="card muted" style="text-align:center">' + esc(texto) + '</div>'; sala.vista = 'nota:' + texto; } };

  const resDamasSala = (res, color) => { if (res.empate) { return 'empate'; } return res.gana === color ? 'gana' : 'pierde'; };
  function finSala(juego, a) {
    const st = a.st, n = i => a.orden[i].nombre;
    if (juego === 'damas') {
      const res = a.rendido !== null ? { gana: a.rendido === 0 ? 'n' : 'b', fin: 'rendicion' } : Damas.resultado(st.s);
      if (!res) return null;
      const color = i => i === 0 ? 'b' : 'n';
      const filas = a.orden.map((p, i) => ({ p, total: T.puntos.damas(resDamasSala(res, color(i)), 2, Damas.piezas(st.s, color(i)), 12 - Damas.piezas(st.s, Damas.otro(color(i)))), sufijo: i ? ' ⚫' : ' ⚪' }));
      let quien = null;
      if (!res.empate) quien = n(res.gana === 'b' ? 0 : 1);
      return { filas, titulo: quien ? '⚫ ¡Ganó ' + quien + ' por ' + DAMAS_FIN[res.fin] + '!' : '🤝 Empate: ' + DAMAS_FIN[res.fin], aciertos: i => 12 - Damas.piezas(st.s, Damas.otro(color(i))), total: 12 };
    }
    if (!st.fin) return null;
    if (juego === 'domino') return { filas: a.orden.map((p, i) => ({ p, total: puntosDomino(st, i) })), titulo: tituloDomino(st, n), aciertos: i => 7 - st.manos[i].length, total: 7 };
    return { filas: a.orden.map((p, i) => ({ p, total: T.puntos.parchis(Parchis.enMeta(st, i), 4, st.fin.ganador === i), sufijo: ' (' + COLORES[st.colores[i]].n.toLowerCase() + ')' })),
      titulo: '🎲 ¡Ganó ' + n(st.fin.ganador) + '!', aciertos: i => Parchis.enMeta(st, i), total: 4 };
  }

  const textoCuentaSala = juego => {
    if (juego === 'naval') return '¡Prepárense! Acomoden su flota en secreto';
    return juego === 'damas' ? '¡Prepárense! Blancas: ' + ((participantes()[0] || {}).nombre || '') : '¡Prepárense!';
  };
  const avisoSala = (juego, yo, miTurno, turnoDe) => {
    if (yo < 0) return '👀 Estás viendo la partida';
    return miTurno ? '👉 ¡Tu turno! Tienes ' + (CFG[juego].turnoMs / 1000) + ' s' : turnoDe;
  };
  function pintarSalaTablero(body) {
    const e = sala.estado, s = e.sala, juego = s.juego, tb = estadoTb();
    const bar = $('m-bar');
    if (ahoraServidor() < s.inicio) { bar.hidden = true; return cuentaRegresiva(body, s, textoCuentaSala(juego)); }
    if (juego === 'naval') { bar.hidden = true; return pintarNavalSala(body); }
    const a = reproducir(juego);
    if (a.faltan) { bar.hidden = true; return nota(body, 'Se necesitan al menos 2 jugadores (activa los bots al crear la partida).'); }
    const yo = a.orden.findIndex(p => p.id === e.yo);
    const f = finSala(juego, a);
    if (f) {
      bar.hidden = true;
      const filas = f.filas.map(x => ({ id: x.p.id, nombre: x.p.nombre + (x.sufijo || ''), tipo: x.p.tipo, avatar: x.p.avatar, total: x.total, ultimo: 0 })).sort((p, q) => q.total - p.total);
      sala.finAciertos = yo >= 0 ? f.aciertos(yo) : 0; sala.finTotal = f.total;
      return pintarFinalSala(body, filas, null, f.titulo);
    }
    const ahora = ahoraServidor();
    bar.hidden = false; bar.firstChild.style.width = Math.max(0, Math.min(100, (a.T0 + a.ventana - ahora) / a.ventana * 100)) + '%';
    const miTurno = a.turnoIdx === yo && !tb.enviando && ahora >= a.T0;
    const clave = juego + ':' + a.paso + ':' + (miTurno ? 1 : 0) + ':' + tb.sel + ':' + (tb.enviando ? 1 : 0) + ':' + tb.msg + ':' + (a.st.k || 0);
    if (sala.vista === clave) return;
    sala.vista = clave;
    tb.a = a;
    const turnoDe = '⏳ Turno de ' + a.orden[a.turnoIdx].nombre;
    const pie = '<div class="feedback' + (miTurno ? ' ok' : '') + '" role="status">' + esc(tb.msg || avisoSala(juego, yo, miTurno, turnoDe)) + '</div>';
    if (juego === 'damas') {
      const st = a.st, color = yo === 1 ? 'n' : 'b', arriba = yo === 1 ? 0 : 1, abajo = 1 - arriba;
      const anima = st.s.jugadas !== tb.logVisto; tb.logVisto = st.s.jugadas;
      const fila = i => '<div class="tb-info"><span>' + avatarHtml(a.orden[i].avatar, 18) + ' ' + esc(a.orden[i].nombre) + (i ? ' ⚫' : ' ⚪') + '</span>' + contarHtml(Damas.piezas(st.s, i ? 'n' : 'b'), i ? 'n' : 'b') + '</div>';
      body.innerHTML = '<div class="tb-wrap">' + fila(arriba) + damasHtml(st.s, { abajo: color, sel: tb.sel, ultima: st.ultima, anima, ...damasOpciones(st.s, tb.sel, miTurno) }) + fila(abajo) + pie +
        '<div class="row-btns"><button class="btn ghost sm" data-ayuda="damas">📖 Cómo se juega</button>' + (miTurno ? '<button class="btn ghost sm" data-tb-rendir>🏳️ Rendirme</button>' : '') + '</div></div>';
    } else if (juego === 'domino') {
      body.innerHTML = '<div class="tb-wrap">' + rivalesDominoHtml(a.st, a.orden, yo) + mesaDominoHtml(a.st) + pie + manoDominoHtml(a.st, yo, miTurno, tb.sel) +
        '<div class="row-btns"><button class="btn ghost sm" data-ayuda="domino">📖 Cómo se juega</button></div></div>';
    } else {
      const st = a.st, movs = miTurno ? Parchis.movibles(st) : [];
      const anima = st.log.length !== tb.logVisto ? ultimoMov(st) : null; tb.logVisto = st.log.length;
      body.innerHTML = '<div class="tb-wrap">' + jugadoresParchisHtml(st, a.orden) + parchisHtml(st, { yo, movibles: movs, anima }) +
        '<div class="tb-turno">' + dadoHtml(st.dado, st.k !== tb.kVisto) + '<div><b>' + esc(miTurno ? '👉 Sacaste ' + st.dado + ': elige una ficha' : a.orden[a.turnoIdx].nombre + ' sacó ' + st.dado) + '</b><div class="muted tb-acc">' + esc(logParchis(st, a.orden)) + '</div></div></div>' +
        (miTurno ? botonesParchis(st, yo, movs) : '') + pie + '<div class="row-btns"><button class="btn ghost sm" data-ayuda="parchis">📖 Cómo se juega</button></div></div>';
      tb.kVisto = st.k;
    }
  }

  // ---- Batalla naval en sala: la flota se envía al servidor, que resuelve cada disparo ----
  const porNaval = por => {
    if (por === 'hundidos') return ' hundiendo toda la flota!';
    return por === 'rendicion' ? ' por rendición!' : ' porque su rival dejó de jugar!';
  };
  // Final de la partida: tabla de puntos y, para quien jugó, los dos mares descubiertos. d: datos de pintarNavalSala.
  function finalNavalSala(body, d) {
    const { e, dos, k, yoJ, riv, est, tb, tirosDe } = d;
    const filas = dos.map(j => { const t = tirosDe(j), toques = t.filter(x => x.r !== 'agua').length; return { id: j.id, nombre: j.nombre, tipo: j.tipo, avatar: j.avatar, total: est.fin.por === 'hundidos' || est.fin.gana !== j.id ? T.puntos.naval(est.fin.gana === j.id, t.length, toques) : Math.min(1000, 500 + 20 * toques), ultimo: 0, toques }; }).sort((p, q) => q.total - p.total);
    const mia = filas.find(x => x.id === e.yo);
    sala.finAciertos = mia ? mia.toques : 0; sala.finTotal = 17;
    const gan = dos.find(j => j.id === est.fin.gana);
    if (sala.vista === 'final') return;
    pintarFinalSala(body, filas, null, '🚢 ¡Ganó ' + (gan ? gan.nombre : '') + porNaval(est.fin.por));
    if (k >= 0 && riv) body.insertAdjacentHTML('beforeend', '<h2>🗺️ Así quedaron los mares</h2><div class="tb-mares"><div><h3 class="tb-h">' + esc(riv.nombre) + '</h3>' +
      navalHtml({ titulo: 'Flota de ' + riv.nombre, chico: true, celda: celdaPropia(riv.flota || [], tirosDe(yoJ), -1) }) + '</div><div><h3 class="tb-h">Tu flota</h3>' +
      navalHtml({ titulo: 'Tu flota', chico: true, celda: celdaPropia(tb.miFlota || [], tirosDe(riv), -1) }) + '</div></div>');
  }
  function pintarNavalSala(body) {
    const e = sala.estado, s = e.sala, tb = estadoTb();
    const dos = e.jugadores.slice(0, 2);
    if (dos.length < 2) return nota(body, '🚢 Esperando a que se una tu rival: la batalla naval es 1 vs 1.');
    const k = dos.findIndex(j => j.id === e.yo), yoJ = dos[k], riv = dos[1 - k] || dos[1];
    if (yoJ && yoJ.flota) tb.miFlota = yoJ.flota; // Realtime no trae flotas: se conserva la propia
    const est = Naval.estado(e.jugadores);
    const tirosDe = j => (j && j.jugadas || []).filter(x => x.accion === 'disparar');
    if (est.fin) return finalNavalSala(body, { e, dos, k, yoJ, riv, est, tb, tirosDe });
    if (k < 0) return nota(body, '👀 Estás viendo la partida: las flotas son secretas.');
    // Reclamar: le toca al rival (acomodar o disparar) y lleva 90 s sin jugar.
    const pendienteRival = !!tb.miFlota && (riv.flotaT === undefined || est.turno === riv.id);
    const ref = Math.max(s.inicio, yoJ.flotaT || 0, riv.flotaT || 0, est.ultimo);
    const puedeReclamar = pendienteRival && ahoraServidor() - ref >= 90000;
    const reclamar = puedeReclamar ? '<div class="row-btns"><button class="btn" data-tb-reclamar>⏰ Reclamar victoria (' + esc(riv.nombre) + ' no juega)</button></div>' : '';
    if (!tb.miFlota) {
      tb.col = tb.col || nuevaColocacion();
      const clave = 'nv-col:' + JSON.stringify(tb.col) + tb.enviando + tb.msg;
      if (sala.vista === clave) return;
      sala.vista = clave;
      body.innerHTML = '<p class="muted" style="text-align:center;margin:4px 0">🤫 Acomoda tu flota: ' + esc(riv.nombre) + ' no la verá.</p>' + colocacionHtml(tb.col, tb.msg ? '<div class="alert">' + esc(tb.msg) + '</div>' : '');
      return;
    }
    if (riv.flotaT === undefined) {
      const clave = 'nv-espera:' + puedeReclamar;
      if (sala.vista === clave) return;
      sala.vista = clave;
      body.innerHTML = '<div class="tb-wrap"><div class="feedback" role="status">⏳ Esperando a que ' + esc(riv.nombre) + ' acomode su flota…</div>' + navalHtml({ titulo: 'Tu flota', chico: true, celda: celdaPropia(tb.miFlota, [], -1) }) + reclamar + '</div>';
      return;
    }
    const miTurno = est.turno === e.yo && !tb.enviando;
    const mis = tirosDe(yoJ), suyos = tirosDe(riv), ult = est.disparos[est.disparos.length - 1];
    const clave = 'nv:' + est.pasos + ':' + miTurno + ':' + tb.enviando + ':' + tb.msg + ':' + puedeReclamar;
    if (sala.vista === clave) return;
    sala.vista = clave;
    let ultTxt = '';
    if (ult) ultTxt = (ult.id === e.yo ? 'Tú: ' : riv.nombre + ': ') + textoTiro(ult);
    body.innerHTML = '<div class="tb-wrap"><div class="feedback' + (miTurno ? ' ok' : '') + '" role="status">' + esc(tb.msg || (miTurno ? '👉 ¡Tu turno! Dispara al mar de ' + riv.nombre : '⏳ Turno de ' + riv.nombre)) + '</div>' +
      (ultTxt ? '<div class="tb-acc" style="text-align:center">' + esc(ultTxt) + '</div>' : '') +
      '<h3 class="tb-h">🎯 Mar de ' + esc(riv.nombre) + ' · ' + mis.filter(x => x.r !== 'agua').length + '/17</h3>' + navalHtml({ titulo: 'Mar de ' + riv.nombre, clic: miTurno, celda: celdaAtaque(mis, null, ult && ult.id === e.yo ? ult.c : -1) }) +
      '<h3 class="tb-h">🛟 Tu flota · ' + suyos.filter(x => x.r !== 'agua').length + '/17 tocados</h3>' + navalHtml({ titulo: 'Tu flota', chico: true, celda: celdaPropia(tb.miFlota, suyos, ult && ult.id !== e.yo ? ult.c : -1) }) +
      reclamar + '<div class="row-btns"><button class="btn ghost sm" data-ayuda="naval">📖 Cómo se juega</button><button class="btn ghost sm" data-tb-rendir>🏳️ Rendirme</button></div></div>';
    tb.est = est;
  }

  async function clicNaval(e) {
    const tb = estadoTb(), est = Naval.estado(sala.estado.jugadores);
    if (est.fin || tb.enviando) return !!e.target.closest('[data-tb-n], [data-tb-rendir], [data-tb-reclamar], [data-tb-barco], [data-tb-girar], [data-tb-auto], [data-tb-limpiar], [data-tb-listo]');
    if (!tb.miFlota && tb.col) {
      if (!e.target.closest('[data-tb-n], [data-tb-barco], [data-tb-girar], [data-tb-auto], [data-tb-limpiar], [data-tb-listo]')) return false;
      if (colocacionClic(tb.col, e)) {
        tb.enviando = true; tb.msg = ''; sala.vista = null; pintarSala();
        const r = await post('/juegos/sala/' + sala.codigo + '/respuesta', { flota: tb.col.barcos });
        if (r.ok || r.body.error === 'flota_lista') tb.miFlota = r.ok ? tb.col.barcos : tb.miFlota;
        else tb.msg = TXT_ERROR[r.body.error] || 'No se pudo enviar tu flota (' + (r.body.error || r.status) + ').';
        await traerSala(); tb.enviando = false;
      }
      sala.vista = null; pintarSala();
      return true;
    }
    // Rendirse y reclamar valen en cualquier paso: si otro disparo ganó el paso (turno_tomado), se reintenta con el nuevo.
    const sinTurno = async jugada => { const r = await enviar(jugada, est.pasos); if (!r.ok && r.body.error === 'turno_tomado') await enviar(jugada, Naval.estado(sala.estado.jugadores).pasos); };
    if (e.target.closest('[data-tb-rendir]')) { if (confirm('¿Rendirte? Tu rival gana la partida.')) { sinTurno({ accion: 'rendirse' }); } return true; }
    if (e.target.closest('[data-tb-reclamar]')) { sinTurno({ accion: 'reclamar' }); return true; }
    const n = e.target.closest('[data-tb-n]'); if (!n) return false;
    if (est.turno !== sala.estado.yo) return true;
    tb.msg = '';
    enviar({ accion: 'disparar', c: Number(n.dataset.tbN) }, est.pasos).then(r => { if (r.ok) { const x = (r.body.jugadas || []).at(-1); /* errores-latentes: sin jugadas, sin sonido; el sondeo sincroniza */ if (x) { if (x.r === 'agua') sonidoMal(); else sonidoOk(); } } });
    return true;
  }

  function clicSala(e) {
    const juego = sala.estado.sala.juego, tb = estadoTb();
    if (juego === 'naval') { clicNaval(e); return !!e.target.closest('[data-tb-n], [data-tb-rendir], [data-tb-reclamar], [data-tb-barco], [data-tb-girar], [data-tb-auto], [data-tb-limpiar], [data-tb-listo]'); }
    const a = tb.a; if (!a || a.faltan) return false;
    const yo = a.orden.findIndex(p => p.id === sala.estado.yo);
    const propio = e.target.closest('[data-tb-d], [data-tb-f], [data-tb-lado], [data-tb-pf], [data-tb-rendir]');
    if (!propio) return false;
    if (yo < 0 || a.turnoIdx !== yo || tb.enviando || finSala(juego, a)) return true;
    if (juego === 'damas') {
      if (e.target.closest('[data-tb-rendir]')) { if (confirm('¿Rendirte? Tu rival gana la partida.')) { enviar({ accion: 'rendirse' }, a.paso); } return true; }
      const c = e.target.closest('[data-tb-d]'); if (!c) return true;
      const r = damasClic(a.st.s, yo === 1 ? 'n' : 'b', tb.sel, Number(c.dataset.tbD));
      if (r.jugada) { tb.msg = ''; tono(520, 60); enviar({ accion: 'mover', ruta: r.jugada.ruta }, a.paso); return true; }
      tb.sel = r.sel; tb.msg = r.msg || ''; sala.vista = null; pintarSala();
      return true;
    }
    if (juego === 'domino') {
      const mv = dominoClic(a.st, yo, tb, e);
      if (mv) { tono(520, 60); enviar(mv, a.paso); } else { sala.vista = null; pintarSala(); }
      return true;
    }
    const b = e.target.closest('[data-tb-pf]');
    if (b && Parchis.movibles(a.st).includes(Number(b.dataset.tbPf))) { tono(520, 60); enviar({ accion: 'mover', ficha: Number(b.dataset.tbPf) }, a.paso); }
    return true;
  }

  // ---------- Selector de juego al crear la partida y avisos ----------
  const NOTAS = {
    damas: '⚫ Mesa de 2: si juegas sola o solo, el bot ocupa el lugar libre; quien se une le quita el lugar al bot.',
    naval: '🚢 Partida 1 vs 1 solo entre dos personas, sin bots. Cada quien acomoda su flota en secreto.',
    domino: '🔳 Mesa de 4: los bots completan los lugares libres y cada persona que entra quita un bot.',
    parchis: '🎲 Mesa de 4: los bots completan los lugares libres y cada persona que entra quita un bot.',
  };
  function alCambiarJuego(juego) {
    if (!NOTAS[juego]) return;
    const n = $('p-bots-nota'), w = $('p-bots-wrap');
    if (n) { n.hidden = false; n.textContent = NOTAS[juego]; }
    if (w) w.hidden = juego === 'naval';
  }
  const faltan = juego => ({ damas: '⚫ Falta tu rival: únete con otra persona o crea la partida con bots.', naval: '🚢 Espera a que se una tu rival: la batalla naval es 1 vs 1.', domino: '🔳 Se necesitan al menos 2 jugadores: invita a alguien o activa los bots.', parchis: '🎲 Se necesitan al menos 2 jugadores: invita a alguien o activa los bots.' }[juego] || '');

  // ---------- 📖 Cómo se juega ----------
  const AYUDA = {
    damas: '<h2>⚫ Damas</h2><p><b>Objetivo:</b> comer todas las piezas de tu rival o dejarlo sin movimientos. Se juega en las casillas oscuras de un tablero de 8×8. Empiezan las blancas.</p>' +
      '<h3>Cómo se mueve</h3><ul><li>El <b>peón</b> avanza 1 casilla en diagonal hacia adelante.</li><li>Para <b>comer</b>, salta sobre una pieza rival que esté junto a la tuya y cae en la casilla vacía de atrás.</li>' +
      '<li><b>Comer es obligatorio:</b> si puedes comer, tienes que hacerlo (las piezas que pueden comer se resaltan).</li><li><b>Saltos múltiples:</b> si después de comer puedes volver a comer, sigues saltando en la misma jugada.</li>' +
      '<li><b>Coronación:</b> el peón que llega a la última fila se convierte en <b>dama</b> 👑 y termina su turno. La dama mueve y come 1 casilla en las 4 diagonales (también hacia atrás).</li></ul>' +
      '<h3>Cómo termina</h3><ul><li>Gana quien deja a su rival sin piezas o sin movimientos.</li><li>Es <b>empate</b> si pasan 40 movimientos seguidos sin comer ni avanzar un peón.</li><li>En partida, cada turno dura 60 s: si se acaba, el bot mueve por ti. También puedes rendirte.</li></ul>' +
      '<h3>Cómo lo haces aquí</h3><p>Toca una de tus piezas (se marcan sus destinos) y luego la casilla a la que va. En un salto múltiple toca la casilla final.</p><p><b>Bot:</b> 🐣 Fácil juega al azar; 🦊 Difícil piensa 4 movimientos adelante.</p>',
    domino: '<h2>🔳 Dominó</h2><p>Se juega con las 28 fichas del <b>doble seis</b>, de 2 a 4 jugadores. Cada quien recibe 7 fichas. <b>Gana quien se queda sin fichas.</b></p>' +
      '<h3>Cómo se juega</h3><ol><li>Sale quien tiene la <b>mula</b> (ficha doble) más alta, empezando por la mula de seis.</li><li>Por turnos, cada quien pone una ficha que <b>embone</b> con uno de los dos extremos de la mesa: el número tiene que ser igual.</li>' +
      '<li>Si una ficha entra en los dos extremos, eliges el lado.</li><li>Si no tienes ficha que embone, <b>pasas</b> (aquí no se roba).</li></ol>' +
      '<h3>Juego cerrado</h3><p>Si nadie puede tirar, el juego se <b>cierra</b>: se suman los puntos de las fichas que le quedan a cada quien y gana quien tenga <b>menos</b>. Si hay empate, ganan los empatados.</p>' +
      '<h3>Puntos</h3><p>Ganar: 500 + 10 por cada punto que les quedó a tus rivales (máximo 1,000). Empate: 400. Si pierdes: 200 menos 5 por cada punto en tu mano.</p>',
    parchis: '<h2>🎲 Parchís</h2><p>De 2 a 4 jugadores, cada quien con sus fichas de color. <b>Gana quien mete primero todas sus fichas a la meta.</b></p>' +
      '<h3>Reglas de esta versión</h3><ul><li><b>Sales con 5:</b> para sacar una ficha de tu casa necesitas un 5 en el dado (como en el parchís tradicional).</li>' +
      '<li><b>Con 6 vuelves a tirar.</b> Si <b>comes</b> una ficha, también vuelves a tirar.</li><li><b>Comer:</b> si caes en una casilla donde hay fichas de otro color, regresan a su casa.</li>' +
      '<li><b>Casillas seguras:</b> en las salidas de color y en las estrellas ⭐ nadie come; ahí pueden estar fichas de colores distintos.</li>' +
      '<li>Después de dar la vuelta, tu ficha entra al <b>pasillo de su color</b> y llega a la meta, en el centro, con el <b>tiro exacto</b>.</li><li>Si no puedes mover ninguna ficha, el turno pasa solo.</li></ul>' +
      '<h3>Cómo lo haces aquí</h3><p>El dado se tira solo al empezar tu turno. Toca una ficha que brille o uno de los botones de abajo. En partida tienes 30 s; si se acaban, el bot mueve por ti.</p>' +
      '<p><b>Puntos:</b> 800 × las fichas que metiste ÷ tus fichas, y 200 más si ganas (máximo 1,000).</p>',
    naval: '<h2>🚢 Batalla naval</h2><p>Cada quien esconde su flota en un mar de 10×10. <b>Gana quien hunde primero todos los barcos del rival.</b></p>' +
      '<h3>Tu flota</h3><table><tr><td>Portaaviones</td><td>5 casillas</td></tr><tr><td>Acorazado</td><td>4</td></tr><tr><td>Crucero</td><td>3</td></tr><tr><td>Submarino</td><td>3</td></tr><tr><td>Destructor</td><td>2</td></tr></table>' +
      '<p>Acomódala a mano (elige un barco, ↻ gíralo y toca la casilla donde empieza) o con 🎲 Acomodo automático. Los barcos van en línea recta y no se enciman.</p>' +
      '<h3>Disparos</h3><ul><li>Toca una casilla del mar rival: las columnas van de la <b>A</b> a la <b>J</b> y las filas del <b>1</b> al <b>10</b> (por ejemplo, B3).</li>' +
      '<li>💦 <b>Agua:</b> no había barco; le toca a tu rival.</li><li>💥 <b>Tocado:</b> le diste a un barco. <b>¡Vuelves a disparar!</b></li><li>🔥 <b>Hundido:</b> tocaste todas las casillas de un barco.</li></ul>' +
      '<h3>En partida</h3><p>El servidor guarda las flotas en secreto y revisa cada disparo: nadie puede ver la flota de su rival. Si tu rival deja de jugar 90 s, puedes reclamar la victoria. Si ganas porque tu rival se rinde o deja de jugar, recibes 500 + 20 por cada casilla que tocaste.</p>' +
      '<p><b>Puntos:</b> ganar da 600 + 400 × 17 ÷ tus disparos (¡menos disparos, más puntos!). Si pierdes, 20 por cada casilla que tocaste.</p>',
  };

  g.TableroUI = { SALA, esSala, elegir, pintarSala: pintarSalaTablero, clicSala, alCambiarJuego, faltan, ayuda: id => AYUDA[id] || '' };
})(window);
