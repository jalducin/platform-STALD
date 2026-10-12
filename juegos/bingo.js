// 🎱 Bingo (openspec: juegos-salas-grandes): 75 números, cartón de 5×5 con casilla libre y figura a elegir.
// - `globalThis.Bingo`: reglas puras (sin DOM), iguales a BINGO de server/salas_grandes.ts (las pruebas de Deno lo comparan).
// - Pantallas: `elegirBingo` / `jugarBingo` (individual contra 2 bots) y SALAS_GRANDES.bingo (partida de hasta 30, el
//   servidor canta por semilla cada 4.5 s y valida el «¡Bingo!»). Usan los helpers globales de juegos.html.
(function (g) {
  'use strict';

  // ---------- Reglas puras ----------
  function fnv(s) { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
  function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; } // NOSONAR: aritmética entera de 32 bits del generador con semilla, no es truncado
  const rng = (seed, etiqueta) => mulberry(fnv(seed + '|' + etiqueta));
  const barajar = (a, r) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
  const rango = (de, n) => Array.from({ length: n }, (_, i) => de + i);

  const CANTO_MS = 4500, GRITO_BOT_MS = 1500, LETRAS = 'BINGO';
  const LINEAS = rango(0, 5).map(f => rango(0, 5).map(c => f * 5 + c)).concat(rango(0, 5).map(c => rango(0, 5).map(f => f * 5 + c)), [[0, 6, 12, 18, 24], [4, 8, 12, 16, 20]]);
  const ESQUINAS = [0, 4, 20, 24];
  const FIGURAS = {
    linea: { t: 'Línea', emoji: '➖', d: 'una fila, columna o diagonal', base: 300, celdas: [10, 11, 12, 13, 14] },
    esquinas: { t: 'Cuatro esquinas', emoji: '⬛', d: 'las cuatro esquinas', base: 400, celdas: ESQUINAS },
    lleno: { t: 'Cartón lleno', emoji: '🟩', d: 'las 25 casillas', base: 600, celdas: rango(0, 25) },
  };
  const orden = seed => barajar(rango(1, 75), rng(seed, 'bingo-orden'));
  function carton(seed, id) {
    const r = rng(seed, 'bingo-carton|' + id);
    const cols = rango(0, 5).map(c => barajar(rango(c * 15 + 1, 15), r).slice(0, c === 2 ? 4 : 5));
    const t = [];
    for (let f = 0; f < 5; f++) for (let c = 0; c < 5; c++) t.push(c === 2 ? (f === 2 ? 0 : cols[2][f < 2 ? f : f - 1]) : cols[c][f]);
    return t;
  }
  const cantadosA = (inicio, t, canto = CANTO_MS) => t < inicio ? 0 : Math.min(75, Math.floor((t - inicio) / canto) + 1);
  const marcada = (t, set, i) => t[i] === 0 || set.has(t[i]);
  function cumple(t, set, figura) {
    if (figura === 'esquinas') return ESQUINAS.every(i => marcada(t, set, i));
    if (figura === 'lleno') return t.every((_, i) => marcada(t, set, i));
    return LINEAS.some(l => l.every(i => marcada(t, set, i)));
  }
  // Cuántos números le faltan al cartón para la figura.
  function faltan(t, set, figura) {
    const f = l => l.filter(i => !marcada(t, set, i)).length;
    if (figura === 'esquinas') return f(ESQUINAS);
    if (figura === 'lleno') return f(rango(0, 25));
    return Math.min(...LINEAS.map(f));
  }
  // Con cuántos números cantados completa la figura (76 si nunca).
  function completaEn(t, ord, figura) { const set = new Set(); for (let k = 0; k < ord.length; k++) { set.add(ord[k]); if (cumple(t, set, figura)) return k + 1; } return 76; }
  const letraDe = n => LETRAS[Math.floor((n - 1) / 15)];
  const puntosGanador = (figura, n) => Math.min(1000, (FIGURAS[figura] || FIGURAS.linea).base + (75 - n) * 5);
  const aciertos = (t, set) => t.filter(x => x && set.has(x)).length;

  g.Bingo = { CANTO_MS, GRITO_BOT_MS, LETRAS, FIGURAS, LINEAS, orden, carton, cantadosA, cumple, faltan, completaEn, letraDe, puntosGanador, aciertos, rng, barajar };
  if (typeof document === 'undefined') return; // en Deno solo las reglas

  // ---------- Pantallas ----------
  const SG = g.SalasGrandes;
  SG.css('css-bingo', `
  .bg-top { display: flex; gap: 12px; align-items: center; margin-bottom: 10px; }
  .bg-bola { flex: none; width: 92px; height: 92px; border-radius: 50%; display: grid; place-items: center; text-align: center; line-height: 1; color: #111827;
    background: radial-gradient(circle at 34% 28%, #fff 0 24%, var(--bgc, #2563eb) 25% 100%); box-shadow: inset -6px -8px 14px rgba(0,0,0,.25), 0 4px 10px rgba(0,0,0,.18); }
  .bg-bola span { display: grid; place-items: center; width: 58px; height: 58px; border-radius: 50%; background: #fff; font-weight: 900; font-size: 1.55rem; }
  .bg-bola small { display: block; font-size: .7rem; font-weight: 800; color: var(--bgc, #2563eb); }
  .bg-bola.entra { animation: bg-rueda .6s ease-out; }
  @keyframes bg-rueda { from { transform: translateY(-16px) scale(.6); opacity: .2; } to { transform: none; opacity: 1; } }
  .bg-lado { flex: 1; min-width: 0; font-size: .85rem; }
  .bg-hist { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }
  .bg-hist span { min-width: 30px; padding: 2px 5px; border-radius: 999px; background: var(--card); border: 1.5px solid var(--bgc); font-weight: 800; font-size: .72rem; text-align: center; }
  .bg-carton { display: grid; grid-template-columns: repeat(5, 1fr); gap: 5px; max-width: 340px; margin: 0 auto; padding: 8px; border-radius: 16px; background: linear-gradient(160deg, #1e3a8a, #6d28d9); }
  .bg-carton .bg-cab { text-align: center; font-weight: 900; color: #fff; font-size: 1.15rem; letter-spacing: .02em; }
  .bg-cell { position: relative; aspect-ratio: 1; border: 0; border-radius: 10px; background: #fff; color: #111827; font: inherit; font-weight: 800; font-size: 1.15rem; cursor: pointer; padding: 0; }
  .bg-cell.libre { background: #fde68a; font-size: 1.3rem; cursor: default; }
  .bg-cell.marcada::after { content: ""; position: absolute; inset: 9%; border-radius: 50%; background: radial-gradient(circle at 40% 35%, rgba(236,72,153,.55), rgba(190,24,93,.75)); }
  .bg-cell.fig { box-shadow: inset 0 0 0 3px #f59e0b; }
  .bg-cell.tiembla { animation: bg-tiembla .35s; }
  @keyframes bg-tiembla { 25% { transform: translateX(-4px); } 75% { transform: translateX(4px); } }
  .bg-tablero { display: grid; grid-template-columns: repeat(15, 1fr); gap: 2px; font-size: .62rem; margin-top: 8px; }
  .bg-tablero span { text-align: center; padding: 2px 0; border-radius: 4px; background: var(--card); color: var(--muted); }
  .bg-tablero span.si { background: var(--bgc); color: #fff; font-weight: 800; }
  .bg-figura { display: inline-grid; grid-template-columns: repeat(5, 7px); gap: 1px; vertical-align: middle; margin-right: 4px; }
  .bg-figura i { width: 7px; height: 7px; border-radius: 2px; background: var(--border); }
  .bg-figura i.si { background: #f59e0b; }
  .bg-prog { margin: 6px 0 0; padding: 0; list-style: none; font-size: .8rem; }
  .bg-prog li { display: flex; justify-content: space-between; gap: 6px; padding: 2px 0; border-bottom: 1px dashed var(--border); }
  @media (prefers-reduced-motion: reduce) { .bg-bola.entra, .bg-cell.tiembla { animation: none; } }
  `);
  const COLORES = ['#2563eb', '#dc2626', '#16a34a', '#ea580c', '#7c3aed'];
  const colorDe = n => COLORES[Math.floor((n - 1) / 15)];
  const figuraHtml = f => '<span class="bg-figura" aria-hidden="true">' + rango(0, 25).map(i => '<i' + (FIGURAS[f].celdas.includes(i) ? ' class="si"' : '') + '></i>').join('') + '</span>';
  const bolaHtml = n => n ? '<div class="bg-bola entra" id="bg-bola" style="--bgc:' + colorDe(n) + '" aria-live="polite" aria-label="' + letraDe(n) + ' ' + n + '"><span><small>' + letraDe(n) + '</small>' + n + '</span></div>'
    : '<div class="bg-bola" id="bg-bola"><span>🎱</span></div>';
  const histHtml = lista => lista.map(n => '<span style="--bgc:' + colorDe(n) + '">' + letraDe(n) + n + '</span>').join('');
  function cartonHtml(t, marcas, attr) {
    return '<div class="bg-carton" role="grid" aria-label="Tu cartón">' + LETRAS.split('').map(l => '<div class="bg-cab" aria-hidden="true">' + l + '</div>').join('') +
      t.map((n, i) => n === 0 ? '<button class="bg-cell libre" ' + attr + '="' + i + '" aria-label="Casilla libre" disabled>⭐</button>'
        : '<button class="bg-cell' + (marcas[i] ? ' marcada' : '') + '" ' + attr + '="' + i + '" aria-label="' + letraDe(n) + ' ' + n + '">' + n + '</button>').join('') + '</div>';
  }
  const tableroHtml = set => '<details><summary class="muted" style="cursor:pointer;font-size:.85rem">🔢 Ver los 75 números</summary><div class="bg-tablero">' +
    rango(1, 75).map(n => '<span style="--bgc:' + colorDe(n) + '"' + (set.has(n) ? ' class="si"' : '') + '>' + n + '</span>').join('') + '</div></details>';
  function cantar(n, voz) {
    if (voz === 'no' || typeof hablar !== 'function') return;
    if (voz === 'en') hablar(letraDe(n) + ' ' + n, 'en-US', .95);
    else if (voz === 'es') hablar(letraDe(n) + ' ' + n, 'es-MX', 1);
    else { hablar(letraDe(n) + ' ' + n, 'es-MX', 1); if (g.speechSynthesis) { const u = new SpeechSynthesisUtterance(letraDe(n) + ' ' + n); u.lang = 'en-US'; u.rate = .95; speechSynthesis.speak(u); } }
  }
  const VOCES = [['es', '🇲🇽 Español'], ['ambos', '🔀 Bilingüe'], ['en', '🇺🇸 English'], ['no', '🔇']];
  const vozHtml = (attr, voz) => '<div class="row-btns" style="margin-top:6px">' + VOCES.map(([v, t]) => '<button class="btn ghost sm" ' + attr + '="' + v + '" aria-pressed="' + (voz === v) + '">' + t + '</button>').join('') + '</div>';
  function sacudir(cel) { cel.classList.remove('tiembla'); cel.getBoundingClientRect(); /* reflujo: reinicia la animación */ cel.classList.add('tiembla'); }

  g.elegirBingo = function () {
    const m = marco('bingo', { menu: true });
    m.body.innerHTML = '<div class="q-card"><div class="big">🎱</div><div class="q">Bingo</div><div class="sub">Sale un número cada pocos segundos. Márcalo en tu cartón y grita «¡Bingo!» al completar la figura. Juegas contra BOT-VACHIRA y BOT-ISAGII.</div></div>' +
      '<label>Figura</label><div class="opts" style="grid-template-columns:repeat(3,1fr)">' + Object.entries(FIGURAS).map(([k, f], i) => '<button class="opt" data-bg-fig="' + k + '" aria-pressed="' + (i === 0) + '">' + figuraHtml(k) + f.t + '</button>').join('') + '</div>' +
      '<label>Voz del cantor</label>' + vozHtml('data-bg-voz', 'ambos') +
      '<div class="row-btns"><button class="btn ghost" data-ayuda="bingo">📖 Cómo se juega</button><button class="btn" data-bg-go>🎱 ¡A jugar!</button></div>';
    let figura = 'linea', voz = 'ambos';
    m.body.addEventListener('click', e => {
      const f = e.target.closest('[data-bg-fig]'), v = e.target.closest('[data-bg-voz]');
      if (f) figura = SG.elegir(m.body, 'data-bg-fig', f);
      if (v) voz = SG.elegir(m.body, 'data-bg-voz', v);
      if (e.target.closest('[data-bg-go]')) jugarBingo(figura, voz);
    });
  };

  function jugarBingo(figura, voz) {
    const m = marco('bingo');
    const seed = Math.floor(Math.random() * 2147483646) + 1;
    const ord = orden(seed), mio = carton(seed, 'yo');
    const bots = BOTS.map(b => ({ nombre: b.nombre, t: carton(seed, b.id) })).map(b => Object.assign(b, { en: completaEn(b.t, ord, figura) }));
    const marcas = mio.map(n => n === 0);
    const set = new Set(); let k = 0, terminado = false, espera = 0;
    const t0 = Date.now();
    m.body.innerHTML = '<div class="bg-top">' + bolaHtml(0) + '<div class="bg-lado"><div>Salieron <b id="bg-n">0</b>/75 · ' + figuraHtml(figura) + escapeHtml(FIGURAS[figura].t) + '</div><div class="bg-hist" id="bg-hist"></div>' +
      '<ul class="bg-prog" id="bg-bots"></ul></div></div>' + cartonHtml(mio, marcas, 'data-bg') +
      '<div class="feedback" id="bg-msg">Toca los números que salgan en tu cartón.</div><div class="row-btns"><button class="btn una-grito" data-bg-grito>🎉 ¡Bingo!</button></div>' + '<div id="bg-tab"></div>';
    const $ = id => document.getElementById(id);
    function acabar(gane, quien) {
      if (terminado) { return; } terminado = true; limpiar();
      const n = set.size, ac = aciertos(mio, set);
      terminar('bingo', { puntos: gane ? puntosGanador(figura, n) : ac * 10, aciertos: ac, total: 24, segundos: (Date.now() - t0) / 1000,
        titulo: gane ? '🎉 ¡BINGO!' : quien ? '😮 ¡Bingo de ' + quien + '!' : '🎱 Se acabaron los números',
        detalle: (gane ? 'Ganaste con ' + n + ' números cantados.' : 'Te salieron ' + ac + ' de 24 números.') + ' Figura: ' + escapeHtml(FIGURAS[figura].t) + '.' });
    }
    function siguiente() {
      if (terminado) return;
      if (k >= 75) return acabar(false, null);
      const n = ord[k++]; set.add(n);
      $('bg-bola').outerHTML = bolaHtml(n);
      $('bg-n').textContent = k;
      $('bg-hist').innerHTML = histHtml(ord.slice(Math.max(0, k - 9), k - 1).reverse());
      $('bg-tab').innerHTML = tableroHtml(set);
      $('bg-bots').innerHTML = bots.map(b => '<li><span>' + escapeHtml(b.nombre) + ' 🤖</span><b>faltan ' + faltan(b.t, set, figura) + '</b></li>').join('');
      cantar(n, voz);
      const bot = bots.find(b => b.en === k);
      if (bot) { const t = setTimeout(() => acabar(false, bot.nombre), GRITO_BOT_MS * TIEMPO); limpiezas.push(() => clearTimeout(t)); }
    }
    m.body.addEventListener('click', e => {
      if (terminado) return;
      const cel = e.target.closest('[data-bg]');
      if (cel) {
        const i = Number(cel.dataset.bg);
        if (set.has(mio[i])) { marcas[i] = true; cel.classList.add('marcada'); tono(520, 60); }
        else { sacudir(cel); $('bg-msg').className = 'feedback bad'; $('bg-msg').textContent = '¡Ese número todavía no sale!'; }
        return;
      }
      if (e.target.closest('[data-bg-grito]')) {
        if (Date.now() < espera) return;
        if (cumple(mio, set, figura)) { sonidoOk(); acabar(true); }
        else { sonidoMal(); espera = Date.now() + 2000; $('bg-msg').className = 'feedback bad'; $('bg-msg').textContent = 'Todavía no tienes bingo 😉 Necesitas ' + FIGURAS[figura].d + '.'; }
      }
    });
    const iv = setInterval(siguiente, CANTO_MS * TIEMPO);
    limpiezas.push(() => clearInterval(iv));
    siguiente();
  }

  // ---------- En partida ----------
  // Estado local de la sala: cartón, marcas (se guardan para recargar) y voz.
  function estado() {
    const s = sala.estado.sala;
    if (sala.bg && sala.bg.codigo === sala.codigo) return sala.bg;
    const mio = carton(s.seed, sala.estado.yo);
    const guardada = salaGuardada();
    const marcas = guardada && guardada.codigo === sala.codigo && Array.isArray(guardada.bingo) && guardada.bingo.length === 25 ? guardada.bingo.map(Boolean) : mio.map(n => n === 0);
    sala.bg = { codigo: sala.codigo, ord: orden(s.seed), mio, marcas, figura: s.opciones.figura || 'linea', voz: 'ambos', n: 0, espera: 0, enviando: false, msg: null };
    return sala.bg;
  }
  // Ganador: el bingo válido más temprano (personas por la hora que guardó el servidor; bots 1.5 s después de completar).
  function ganador(st) {
    const s = sala.estado.sala;
    const gritos = sala.estado.jugadores.filter(x => x.bingo).map(x => ({ id: x.id, nombre: x.nombre, t: x.bingo.t, n: x.bingo.n }));
    if (s.bots) for (const b of BOTS) {
      const k = completaEn(carton(s.seed, b.id), st.ord, st.figura);
      if (k <= 75) gritos.push({ id: b.id, nombre: b.nombre, t: s.inicio + (k - 1) * CANTO_MS + GRITO_BOT_MS, n: k, bot: true });
    }
    return gritos.sort((a, b) => a.t - b.t)[0] || null;
  }

  function pintar(body) {
    const e = sala.estado, s = e.sala, st = estado();
    if (SG.cuenta(body, '¡Prepárense! Figura: ' + escapeHtml(FIGURAS[st.figura].t))) return;
    const ahora = ahoraServidor();
    const n = cantadosA(s.inicio, ahora);
    const gan = ganador(st);
    SG.barra(null);
    if ((gan && gan.t <= ahora) || (n >= 75 && ahora > s.inicio + 75 * CANTO_MS + 3000)) {
      if (sala.vista === 'final') return;
      const nFin = gan ? gan.n : 75, set = new Set(st.ord.slice(0, nFin));
      const filas = participantes().map(p => {
        const esGan = gan && gan.id === p.id;
        return { id: p.id, nombre: p.nombre + (esGan ? ' 🎉' : ''), tipo: p.tipo, avatar: p.avatar, total: esGan ? puntosGanador(st.figura, nFin) : aciertos(carton(s.seed, p.id), set) * 10, ultimo: 0 };
      }).sort((a, b) => b.total - a.total);
      sala.finAciertos = aciertos(st.mio, set); sala.finTotal = 24;
      return pintarFinalSala(body, filas, null, gan ? '🎱 ¡Bingo de ' + gan.nombre + '! (' + nFin + ' números · ' + FIGURAS[st.figura].t.toLowerCase() + ')' : '🎱 Se acabaron los números');
    }
    if (sala.vista !== 'bingo') {
      sala.vista = 'bingo'; st.n = 0;
      body.innerHTML = '<div class="bg-top"><div id="bg-bola-wrap">' + bolaHtml(0) + '</div><div class="bg-lado"><div>Salieron <b id="bg-n">0</b>/75 · ' + figuraHtml(st.figura) + escapeHtml(FIGURAS[st.figura].t) + '</div>' +
        '<div class="bg-hist" id="bg-hist"></div></div></div>' + cartonHtml(st.mio, st.marcas, 'data-bgs') +
        '<div class="feedback" id="bg-msg">Toca los números que salgan · grita «¡Bingo!» con ' + escapeHtml(FIGURAS[st.figura].d) + '.</div>' +
        '<div class="row-btns"><button class="btn una-grito" data-bg-grito>🎉 ¡Bingo!</button></div>' + vozHtml('data-bgs-voz', st.voz) +
        '<h2 style="margin-bottom:0">👥 ¿A quién le falta menos?</h2><ul class="bg-prog" id="bg-prog"></ul><div id="bg-tab"></div>' +
        '<div class="row-btns" style="margin-top:8px"><button class="btn ghost sm" data-ayuda="bingo">📖 Cómo se juega</button></div>';
    }
    if (n !== st.n) {
      const nueva = n > st.n; st.n = n;
      const num = st.ord[n - 1];
      document.getElementById('bg-bola-wrap').innerHTML = bolaHtml(num);
      document.getElementById('bg-n').textContent = n;
      document.getElementById('bg-hist').innerHTML = histHtml(st.ord.slice(Math.max(0, n - 9), n - 1).reverse());
      const set = new Set(st.ord.slice(0, n));
      document.getElementById('bg-tab').innerHTML = tableroHtml(set);
      // Quién va más cerca (en salas de 30 solo se ven los 8 primeros).
      const lista = participantes().map(p => ({ p, f: faltan(carton(s.seed, p.id), set, st.figura) })).sort((a, b) => a.f - b.f);
      document.getElementById('bg-prog').innerHTML = lista.slice(0, 8).map(x => '<li' + (x.p.id === e.yo ? ' style="font-weight:800"' : '') + '><span>' + avatarHtml(x.p.avatar, 18) + ' ' + escapeHtml(x.p.nombre) + (x.p.bot ? ' 🤖' : '') + '</span><span>' + (x.f ? 'faltan ' + x.f : '¡completo!') + '</span></li>').join('') +
        (lista.length > 8 ? '<li class="muted"><span>… y ' + (lista.length - 8) + ' más</span></li>' : '');
      if (nueva) cantar(num, st.voz);
    }
    const msg = document.getElementById('bg-msg');
    if (st.msg && msg && msg.dataset.k !== st.msg.k) { msg.dataset.k = st.msg.k; msg.className = 'feedback ' + st.msg.cls; msg.textContent = st.msg.t; }
  }

  function clic(e) {
    const st = sala.bg; if (!st) return false;
    const cel = e.target.closest('[data-bgs]');
    if (cel) {
      const i = Number(cel.dataset.bgs);
      if (st.mio[i] === 0) return true;
      if (new Set(st.ord.slice(0, cantadosA(sala.estado.sala.inicio, ahoraServidor()))).has(st.mio[i])) {
        st.marcas[i] = true; cel.classList.add('marcada'); tono(520, 60); recordarSala(sala.codigo, { bingo: st.marcas });
      } else { sacudir(cel); st.msg = { k: 'no' + Date.now(), cls: 'bad', t: '¡Ese número todavía no sale!' }; }
      return true;
    }
    const v = e.target.closest('[data-bgs-voz]');
    if (v) { st.voz = SG.elegir(document.getElementById('p-body'), 'data-bgs-voz', v); return true; }
    if (e.target.closest('[data-bg-grito]')) {
      if (st.enviando || Date.now() < st.espera) return true;
      st.enviando = true; st.msg = { k: 'env' + Date.now(), cls: 'ok', t: '📣 ¡BINGO! Revisando tu cartón…' };
      post('/juegos/sala/' + sala.codigo + '/respuesta', { bingo: true }).then(r => {
        st.enviando = false;
        if (r.ok) { sonidoOk(); return traerSala(); }
        sonidoMal(); st.espera = Date.now() + 3000;
        st.msg = { k: 'mal' + Date.now(), cls: 'bad', t: r.body.error === 'bingo_falso' ? '🙈 Todavía no hay bingo: te falta ' + FIGURAS[st.figura].d + ' con números que ya salieron.' : 'No se pudo enviar (' + (r.body.error || r.status) + ').' };
      });
      return true;
    }
    return false;
  }

  g.SALAS_GRANDES.bingo = {
    preparar: () => { sala.bg = null; return null; }, pintar, clic,
    opcionesHtml: '<label for="p-figura">Figura</label><select id="p-figura" class="sel">' + Object.entries(FIGURAS).map(([k, f]) => '<option value="' + k + '">' + f.emoji + ' ' + f.t + '</option>').join('') + '</select>',
    opciones: () => ({ figura: document.getElementById('p-figura').value }),
  };
  g.AYUDA_GRANDES.bingo = '<h2>🎱 Bingo</h2><p>Cada quien tiene un cartón de 5×5 con números del 1 al 75: la columna <b>B</b> del 1 al 15, <b>I</b> del 16 al 30, <b>N</b> del 31 al 45, <b>G</b> del 46 al 60 y <b>O</b> del 61 al 75. La casilla del centro ⭐ es libre.</p>' +
    '<h3>Cómo se juega</h3><ol><li>El cantor saca un número cada 4.5 segundos.</li><li>Si está en tu cartón, tócalo para marcarlo.</li><li>Cuando completes la figura, toca <b>«¡Bingo!»</b>.</li></ol>' +
    '<h3>Figuras</h3><table><tr><td>➖ Línea</td><td>una fila, una columna o una diagonal completa</td></tr><tr><td>⬛ Cuatro esquinas</td><td>las 4 esquinas del cartón</td></tr><tr><td>🟩 Cartón lleno</td><td>las 25 casillas</td></tr></table>' +
    '<p>En partida, el servidor revisa tu cartón con los números que ya salieron: si cantas bingo sin tenerlo, no cuenta y esperas 3 segundos para volver a intentarlo. Gana el primer bingo válido.</p>' +
    '<h3>Puntos</h3><p>Quien gana: 300 (línea), 400 (esquinas) o 600 (lleno), más 5 por cada número que faltaba sacar. Los demás: 10 por cada número de su cartón que salió.</p>';
})(globalThis);
