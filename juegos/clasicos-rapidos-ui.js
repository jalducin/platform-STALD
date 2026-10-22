// Interfaz de los clásicos rápidos (openspec: clasicos-rapidos): modos individuales, salas y ayudas de Gato, Conecta 4,
// Piedra-papel-tijera, Ahorcado en inglés y Serpientes y escaleras. Las reglas viven en juegos/clasicos-rapidos.js.
// Se carga antes de los scripts de juegos/app/ (el código de juegos.html) y usa sus funciones (marco, terminar, sala, participantes,
// pintarFinalSala, post, traerSala, rngDe, dur, escapeHtml…) solo al jugar.
(function (g) {
  'use strict';
  const CR = g.ClasicosRapidos;
  const IDS = ['gato', 'conecta4', 'ppt', 'ahorcado', 'serpientes'];
  // Tarjetas del menú: en JUEGOS (juegos/app/menu.js), que se pinta sin cargar este módulo (openspec: juegos-carga-perezosa).
  const JUGAR = { gato: () => elegirGato(), conecta4: () => elegirConecta4(), ppt: () => jugarPpt(), ahorcado: () => jugarAhorcado(), serpientes: () => elegirSerpientes() };
  const espera = (ms, f) => { const t = setTimeout(f, ms * TIEMPO); limpiezas.push(() => clearTimeout(t)); return t; };
  const tiempoDesde = t0 => (Date.now() - t0) / 1000;
  const NIVELES = { 1: '🐣 Fácil', 2: '🦊 Medio', 3: '🦉 Difícil' };
  const nivelesHtml = (sel) => '<label>Nivel</label><div class="opts tres">' + [1, 2, 3].map(n => '<button class="opt" data-cr-nivel="' + n + '" aria-pressed="' + (n === sel) + '">' + NIVELES[n] + '</button>').join('') + '</div>';
  // Menú con nivel y botón de jugar (el menú no cuenta como partida en curso).
  function menuNivel(id, intro, alJugar, extra) {
    const m = marco(id, { menu: true });
    let nivel = 2;
    m.body.innerHTML = '<div class="cr-wrap">' + intro + (extra ? extra.html : nivelesHtml(nivel)) +
      '<div class="row-btns"><button class="btn ghost" data-ayuda="' + id + '">📖 Cómo se juega</button><button class="btn" data-cr-go>▶ Jugar</button></div></div>';
    m.body.addEventListener('click', e => {
      const n = e.target.closest('[data-cr-nivel]');
      if (n) { nivel = Number(n.dataset.crNivel); m.body.querySelectorAll('[data-cr-nivel]').forEach(x => x.setAttribute('aria-pressed', String(x === n))); }
      if (e.target.closest('[data-cr-go]')) alJugar(nivel);
    });
  }

  // ---------- Piezas de dibujo ----------
  const svgX = '<svg class="cr-x" viewBox="0 0 100 100" aria-hidden="true"><path d="M24 24 76 76"/><path d="M76 24 24 76"/></svg>';
  const svgO = '<svg class="cr-o" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="29"/></svg>';
  const fichaGato = f => {
    if (f === 'X') return svgX;
    return f === 'O' ? svgO : '';
  };
  const nombreFicha = f => f === 'X' ? 'equis' : 'círculo';
  // Ayudantes para escoger textos y clases sin ternarios anidados (los valores que reciben son textos ya armados).
  // Según el resultado de una ronda: empate, ganó `mia` o ganó el rival.
  const segunResultado = (r, mia, empate, gane, perdi) => {
    if (r.empate) return empate;
    return r.gana === mia ? gane : perdi;
  };
  // Según el marcador: voy ganando, vamos parejos o voy perdiendo.
  const segunMarcador = (yo, el, gane, parejos, perdi) => {
    if (yo > el) return gane;
    return yo === el ? parejos : perdi;
  };
  // Clase del letrero de estado: 'ok' si ganó `mia`, 'bad' si ganó `rival` y '' en otro caso o sin resultado.
  const claseResultado = (res, mia, rival) => {
    if (!res) return '';
    if (res.gana === mia) return 'ok';
    return res.gana === rival ? 'bad' : '';
  };
  // Texto de una escalera o serpiente en serpientes y escaleras ('' si no hubo salto).
  const textoSalto = (salto, escalera, serpiente) => {
    if (salto === 'escalera') return escalera;
    return salto === 'serpiente' ? serpiente : '';
  };
  function gatoHtml(t, o) {
    const clase = i => {
      if ((o.linea || []).includes(i)) return 'gana';
      return o.ultima === i ? 'ult' : '';
    };
    return '<div class="cr-gato" role="grid" aria-label="Tablero del gato">' + t.map((v, i) => '<button data-cr-g="' + i + '" class="' + clase(i) + '"' +
      (v || !o.activo ? ' disabled' : '') + ' aria-label="Casilla ' + (i + 1) + (v ? ': ' + nombreFicha(v) : ' libre') + '">' + fichaGato(v) + '</button>').join('') + '</div>';
  }
  const fichaC4 = f => '<span class="cr-ficha-chica" style="border-radius:50%;background:' + (f === 'R' ? '#dc2626' : '#eab308') + '"></span>';
  const nombreColorC4 = v => v === 'R' ? 'roja' : 'amarilla';
  const piezaC4 = (v, cae, gana, fila) => '<span class="pz ' + v + (cae ? ' cae' : '') + (gana ? ' gana' : '') + '" style="--caida:' + (fila + 1) + '"></span>';
  function c4Html(t, o) {
    let h = '<div class="cr-c4" role="grid" aria-label="Tablero de Conecta 4">';
    for (let i = 0; i < 42; i++) {
      const col = i % 7, fila = Math.floor(i / 7), v = t[i];
      const cae = o.ultima && o.ultima.col === col && o.ultima.fila === fila && o.animar;
      h += '<button data-cr-c="' + col + '"' + (o.activo && CR.c4Fila(t, col) >= 0 ? '' : ' disabled') + ' aria-label="Columna ' + (col + 1) + (v ? ', ficha ' + nombreColorC4(v) : '') + '">' +
        (v ? piezaC4(v, cae, (o.linea || []).includes(i), fila) : '') + '</button>';
    }
    return h + '</div>';
  }
  const MANO = { piedra: '✊', papel: '✋', tijera: '✌️' };
  const NOMBRE_PPT = { piedra: 'Piedra', papel: 'Papel', tijera: 'Tijera' };
  const pptOpsHtml = (activo, elegida) => '<div class="cr-ppt-ops">' + CR.PPT.map(x => '<button data-cr-ppt="' + x + '" aria-pressed="' + (elegida === x) + '"' + (activo ? '' : ' disabled') + '><span aria-hidden="true">' + MANO[x] + '</span>' + NOMBRE_PPT[x] + '</button>').join('') + '</div>';
  // Globo amable: se desinfla con cada error; con 6 queda arrugado en el piso (sin violencia).
  const COLORES_GLOBO = ['#f43f5e', '#8b5cf6', '#0ea5e9', '#22c55e', '#f97316'];
  // Boca del globo: triste si se desinfló, de «oh» con 4 errores o más y sonriente en otro caso.
  function caraGlobo(k, perdida) {
    if (perdida) return '<path d="M64 74q11-7 22 0" stroke="#1f2937" stroke-width="3" fill="none" stroke-linecap="round"/>';
    return k >= 4 ? '<ellipse cx="75" cy="76" rx="6" ry="4" fill="#1f2937"/>' : '<path d="M62 72q13 11 26 0" stroke="#1f2937" stroke-width="3" fill="none" stroke-linecap="round"/>';
  }
  function globoHtml(errores, color, perdida) {
    const k = Math.min(errores, CR.AH_ERRORES), esc = perdida ? 0.32 : 1 - k * 0.1;
    const cara = caraGlobo(k, perdida);
    return '<svg class="cr-globo' + (perdida ? '' : ' flota') + '" viewBox="0 0 150 170" role="img" aria-label="Globo: ' + (perdida ? 'se desinfló' : (CR.AH_ERRORES - k) + ' intentos') + '">' +
      '<path d="M75 ' + (perdida ? 150 : 128) + ' C70 140 82 150 74 168" stroke="#64748b" stroke-width="2" fill="none"/>' +
      '<g class="cuerpo" style="transform:scale(' + esc + ')' + (perdida ? ' translateY(120px)' : '') + '"><path d="M75 6C42 6 22 32 22 62c0 34 30 58 53 64 23-6 53-30 53-64C128 32 108 6 75 6z" fill="' + color + '"/>' +
      '<ellipse cx="55" cy="38" rx="11" ry="17" fill="#fff" opacity=".35" transform="rotate(-25 55 38)"/>' +
      '<circle cx="62" cy="58" r="4.5" fill="#1f2937"/><circle cx="88" cy="58" r="4.5" fill="#1f2937"/>' + cara +
      '<path d="M68 126h14l-4 8h-6z" fill="' + color + '"/></g></svg>';
  }
  // Una letra de la palabra: descubierta, revelada al perder o hueco.
  const letraPalabraHtml = (ch, letras, revelar, nuevas) => {
    if (letras.includes(ch)) return '<span class="' + (nuevas === ch ? 'nueva' : '') + '">' + ch + '</span>';
    return revelar ? '<span class="falto">' + ch + '</span>' : '<span></span>';
  };
  const palabraHtml = (palabra, letras, revelar, nuevas) => '<div class="cr-palabra" aria-label="Palabra">' + [...palabra].map(ch => letraPalabraHtml(ch, letras, revelar, nuevas)).join('') + '</div>';
  const tecladoHtml = (palabra, letras, activo) => '<div class="cr-teclado" role="group" aria-label="Letras">' + [...'abcdefghijklmnopqrstuvwxyz'].map(l => {
    const usada = letras.includes(l);
    let cls = '';
    if (usada) cls = palabra.includes(l) ? 'si' : 'no';
    return '<button data-cr-l="' + l + '" class="' + cls + '"' + (usada || !activo ? ' disabled' : '') + '>' + l + '</button>';
  }).join('') + '</div>';
  // Tablero de serpientes y escaleras: casillas, escaleras y serpientes en SVG, y una ficha por jugador.
  const COLORES_FICHA = ['#db2777', '#2563eb', '#16a34a', '#f59e0b'];
  const centro = n => { const c = CR.serpCelda(n); return { x: c.col * 10 + 5, y: c.fila * 10 + 5 }; };
  function escaleraSvg(a, b) {
    const p = centro(a), q = centro(b), dx = q.x - p.x, dy = q.y - p.y, L = Math.hypot(dx, dy), nx = -dy / L * 1.8, ny = dx / L * 1.8;
    let h = '<g stroke="#92400e" stroke-width=".9" stroke-linecap="round"><line x1="' + (p.x + nx) + '" y1="' + (p.y + ny) + '" x2="' + (q.x + nx) + '" y2="' + (q.y + ny) + '"/><line x1="' + (p.x - nx) + '" y1="' + (p.y - ny) + '" x2="' + (q.x - nx) + '" y2="' + (q.y - ny) + '"/>';
    const pasos = Math.max(2, Math.round(L / 3.2));
    for (let k = 1; k < pasos; k++) { const x = p.x + dx * k / pasos, y = p.y + dy * k / pasos; h += '<line x1="' + (x + nx) + '" y1="' + (y + ny) + '" x2="' + (x - nx) + '" y2="' + (y - ny) + '" stroke-width=".7"/>'; }
    return h + '</g>';
  }
  function serpienteSvg(a, b, k) {
    const p = centro(a), q = centro(b), dx = q.x - p.x, dy = q.y - p.y, L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L;
    const ondas = Math.max(2, Math.round(L / 9)), color = ['#16a34a', '#7c3aed', '#ea580c', '#0891b2'][k % 4];
    let d = 'M' + p.x + ' ' + p.y;
    for (let i = 1; i <= ondas; i++) { const t0 = (i - .5) / ondas, t1 = i / ondas, s = (i % 2 ? 1 : -1) * 3.2; d += ' Q' + (p.x + dx * t0 + nx * s) + ' ' + (p.y + dy * t0 + ny * s) + ' ' + (p.x + dx * t1) + ' ' + (p.y + dy * t1); }
    return '<path d="' + d + '" stroke="' + color + '" stroke-width="2.2" fill="none" stroke-linecap="round" opacity=".9"/><path d="' + d + '" stroke="#fde047" stroke-width=".5" fill="none" stroke-dasharray="1 2.5" opacity=".9"/>' +
      '<circle cx="' + p.x + '" cy="' + p.y + '" r="2.4" fill="' + color + '"/><circle cx="' + (p.x - .8) + '" cy="' + (p.y - .6) + '" r=".55" fill="#fff"/><circle cx="' + (p.x + .8) + '" cy="' + (p.y - .6) + '" r=".55" fill="#fff"/>';
  }
  function serpTableroHtml(jugadores) {
    let celdas = '';
    for (let f = 0; f < 10; f++) for (let c = 0; c < 10; c++) {
      const r = 9 - f, n = r * 10 + (r % 2 ? 9 - c : c) + 1;
      celdas += '<div class="' + (n === 100 ? 'meta' : 'c' + ((f + c) % 2)) + '">' + (n === 100 ? '🏁' : n) + '</div>';
    }
    const arte = Object.entries(CR.SERP_ESCALERAS).map(([a, b]) => escaleraSvg(+a, +b)).join('') + Object.entries(CR.SERP_SERPIENTES).map(([a, b], k) => serpienteSvg(+a, +b, k)).join('');
    return '<div class="cr-serp" role="img" aria-label="Tablero de serpientes y escaleras"><div class="celdas">' + celdas + '</div><svg class="arte" viewBox="0 0 100 100" aria-hidden="true">' + arte + '</svg>' +
      jugadores.map((j, i) => '<span class="ficha" id="cr-ficha-' + i + '" style="background:' + COLORES_FICHA[i] + '" title="' + escapeHtml(j.nombre) + '"></span>').join('') + '</div>';
  }
  // Ficha en su casilla (0 = fuera, junto a la 1), con un pequeño corrimiento por jugador.
  function ponerFicha(i, pos) {
    const el = document.getElementById('cr-ficha-' + i); if (!el) return;
    const c = CR.serpCelda(Math.max(1, pos)), off = [[0, 0], [3, 0], [0, 3], [3, 3]][i];
    el.style.left = (c.col * 10 + 1 + off[0]) + '%'; el.style.top = (c.fila * 10 + 1 + off[1]) + '%';
    el.style.opacity = pos ? '1' : '.85';
  }
  const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
  const dadoHtml = (n, rueda) => '<div class="cr-dado' + (rueda ? ' rueda' : '') + '" role="img" aria-label="Dado: ' + (n || 'sin tirar') + '">' + Array.from({ length: 9 }, (_, k) => '<i class="' + (n && PIPS[n].includes(k) ? 'on' : '') + '"></i>').join('') + '</div>';
  const jugadoresSerpHtml = (jug, pos, turno) => '<ul class="cr-serp-jug">' + jug.map((j, i) => '<li class="' + (i === turno ? 'activo' : '') + '"><span class="bola" style="background:' + COLORES_FICHA[i] + '"></span><span class="n">' + escapeHtml(j.nombre) + '</span><b>' + (pos[i] || '🏠') + '</b></li>').join('') + '</ul>';

  // ================= Individual =================
  // ---------- Gato contra Michi 🐱: serie de 3 ----------
  function elegirGato() {
    menuNivel('gato', '<div class="q-card"><div class="big">❌⭕</div><div class="q">Gato</div><div class="sub">Serie de 3 rondas contra Michi 🐱. Haz tres en línea.</div></div>', jugarGato);
  }
  function jugarGato(nivel) {
    const m = marco('gato'), t0 = Date.now(), PTS = { 1: [100, 30], 2: [200, 80], 3: [300, 150] }[nivel];
    let t, ronda = 0, turno, res = null, ult = null, puntos = 0, gan = 0, perd = 0, emp = 0, terminado = false;
    const empezar = () => { t = new Array(9).fill(null); res = null; ult = null; turno = ronda % 2 ? 'O' : 'X'; pintar(); if (turno === 'O') botJuega(); };
    function pintar(msg) {
      const tuTurno = !res && turno === 'X' && !terminado;
      m.body.innerHTML = '<div class="cr-wrap"><div class="cr-marcador"><span class="cr-jug' + (turno === 'X' && !res ? ' activo' : '') + '"><span class="cr-ficha-chica">' + svgX + '</span><span class="nom">Tú</span><span class="pts">' + gan + '</span></span>' +
        '<span class="muted">Ronda ' + (ronda + 1) + ' de 3 · 🤝 ' + emp + '</span><span class="cr-jug' + (turno === 'O' && !res ? ' activo' : '') + '"><span class="pts">' + perd + '</span><span class="nom">Michi 🐱</span><span class="cr-ficha-chica">' + svgO + '</span></span></div>' +
        gatoHtml(t, { activo: tuTurno, linea: res && res.linea, ultima: ult }) +
        '<div class="cr-estado ' + claseResultado(res, 'X', 'O') + '" role="status">' + (msg || (tuTurno ? '👉 Tu turno: toca una casilla' : '🤔 Michi está pensando…')) + '</div>' +
        '<div class="row-btns"><button class="btn ghost sm" data-ayuda="gato">📖 Cómo se juega</button></div></div>';
      m.puntos(puntos);
    }
    function poner(i, f) {
      t[i] = f; ult = i;
      const r = CR.gatoGanador(t);
      if (!r) { turno = f === 'X' ? 'O' : 'X'; pintar(); if (turno === 'O') { botJuega(); } return; }
      res = r;
      if (r.empate) { emp++; puntos += PTS[1]; sonidoOk(); } else if (r.gana === 'X') { gan++; puntos += PTS[0]; sonidoOk(); } else { perd++; sonidoMal(); }
      pintar(segunResultado(r, 'X', '🤝 ¡Empate! +' + PTS[1], '🎉 ¡Ganaste la ronda! +' + PTS[0], '🐱 Michi ganó esta ronda'));
      espera(1600, () => { if (++ronda < 3) { return empezar(); } terminado = true; terminar('gato', { puntos, aciertos: gan, total: 3, segundos: tiempoDesde(t0), titulo: segunMarcador(gan, perd, '🏆 ¡Le ganaste a Michi!', '🤝 ¡Quedaron parejos!', '🐱 Michi ganó la serie'), detalle: 'Nivel ' + NIVELES[nivel] + ' · ' + gan + ' ganadas, ' + emp + ' empates y ' + perd + ' perdidas.' }); });
    }
    function botJuega() { espera(550, () => { if (!terminado && !res) poner(CR.gatoBot(t, 'O', nivel, Math.random), 'O'); }); }
    m.body.addEventListener('click', e => { const b = e.target.closest('[data-cr-g]'); if (b && !b.disabled && turno === 'X' && !res) poner(Number(b.dataset.crG), 'X'); });
    empezar();
  }

  // ---------- Conecta 4 contra Cuatrito 🤖 ----------
  function elegirConecta4() {
    menuNivel('conecta4', '<div class="q-card"><div class="big">🔴🟡</div><div class="q">Conecta 4</div><div class="sub">Juegas con 🔴 y empiezas tú. Junta 4 en línea: horizontal, vertical o diagonal.</div></div>', jugarConecta4);
  }
  function jugarConecta4(nivel) {
    const m = marco('conecta4'), t0 = Date.now(), PTS = { 1: [300, 150], 2: [600, 250], 3: [1000, 400] }[nivel];
    let t = CR.c4Vacio(), turno = 'R', ult = null, res = null, terminado = false;
    function pintar(msg) {
      const tuTurno = !res && turno === 'R';
      m.body.innerHTML = '<div class="cr-wrap"><div class="cr-marcador"><span class="cr-jug' + (tuTurno ? ' activo' : '') + '">' + fichaC4('R') + '<span class="nom">Tú</span></span><span class="muted">Nivel ' + NIVELES[nivel] + '</span><span class="cr-jug' + (!res && turno === 'A' ? ' activo' : '') + '"><span class="nom">Cuatrito 🤖</span>' + fichaC4('A') + '</span></div>' +
        c4Html(t, { activo: tuTurno, ultima: ult, animar: true, linea: res && res.linea }) +
        '<div class="cr-estado ' + claseResultado(res, 'R', 'A') + '" role="status">' + (msg || (tuTurno ? '👉 Tu turno: toca una columna' : '🤔 Cuatrito está pensando…')) + '</div>' +
        '<div class="row-btns"><button class="btn ghost sm" data-ayuda="conecta4">📖 Cómo se juega</button></div></div>';
    }
    function soltar(col, f) {
      const s = CR.c4Soltar(t, col, f); if (!s) return;
      t = s.t; ult = { col, fila: s.fila }; tono(f === 'R' ? 520 : 400, 70);
      const r = CR.c4Ganador(t);
      if (!r) { turno = f === 'R' ? 'A' : 'R'; pintar(); if (turno === 'A') { espera(650, () => { if (!terminado) soltar(CR.c4Bot(t, 'A', nivel, Math.random), 'A'); }); } return; }
      res = r; terminado = true;
      const puntos = segunResultado(r, 'R', PTS[1], PTS[0], 50);
      r.gana === 'R' || r.empate ? sonidoOk() : sonidoMal();
      pintar(segunResultado(r, 'R', '🤝 ¡Tablero lleno: empate!', '🎉 ¡Cuatro en línea!', '🤖 Cuatrito hizo cuatro en línea'));
      m.puntos(puntos);
      espera(2200, () => terminar('conecta4', { puntos, aciertos: r.gana === 'R' ? 1 : 0, total: 1, segundos: tiempoDesde(t0), titulo: segunResultado(r, 'R', '🤝 ¡Empate!', '🏆 ¡Le ganaste a Cuatrito!', '🤖 Ganó Cuatrito'), detalle: 'Nivel ' + NIVELES[nivel] + '.' }));
    }
    m.body.addEventListener('click', e => { const b = e.target.closest('[data-cr-c]'); if (b && !b.disabled && turno === 'R' && !res) soltar(Number(b.dataset.crC), 'R'); });
    pintar();
  }

  // ---------- Piedra, papel o tijera contra Tito 🤖: al mejor de 5 ----------
  function jugarPpt() {
    const m = marco('ppt'), t0 = Date.now();
    let yo = 0, el = 0, tiros = 0, puntos = 0, bloqueado = false, terminado = false;
    const mias = [];
    // La mano se agita mientras cuentan; luego «sale» si ya no es el puño de espera.
    const claseMano = (agita, mano) => {
      if (agita) return ' agita';
      return mano !== '✊' ? ' sale' : '';
    };
    const pintar = (izq, der, msg, agita) => {
      m.body.innerHTML = '<div class="cr-wrap"><div class="cr-marcador"><span class="cr-jug"><span class="nom">Tú</span><span class="pts">' + yo + '</span></span><span class="cr-jug"><span class="pts">' + el + '</span><span class="nom">Tito 🤖</span></span></div><div class="cr-sub">Al mejor de 5 · gana quien llegue a 3</div>' +
        '<div class="cr-ppt-duelo" aria-hidden="true"><span class="cr-mano' + claseMano(agita, izq) + '">' + izq + '</span><span class="vs">VS</span><span class="cr-mano espejo' + claseMano(agita, der) + '">' + der + '</span></div>' +
        '<div class="cr-ya" role="status">' + (msg || '¿Qué eliges?') + '</div>' + pptOpsHtml(!bloqueado, null) +
        '<div class="row-btns"><button class="btn ghost sm" data-ayuda="ppt">📖 Cómo se juega</button></div></div>';
      m.puntos(puntos);
    };
    function tirar(mia) {
      bloqueado = true; tiros++;
      const suya = CR.pptBot(mias, Math.random); // elige antes de ver tu jugada (solo conoce tus tiros anteriores)
      mias.push(mia);
      pintar('✊', '✊', '¡Piedra, papel o tijera… ya!', true);
      espera(950, () => {
        const r = CR.pptGana(mia, suya);
        if (r > 0) { yo++; puntos += 100; sonidoOk(); } else if (r < 0) { el++; sonidoMal(); } else tono(440, 120);
        bloqueado = true;
        let texto = '🤝 Empate: otra vez';
        if (r > 0) texto = '🎉 ¡' + NOMBRE_PPT[mia] + ' le gana a ' + NOMBRE_PPT[suya].toLowerCase() + '! +100';
        else if (r < 0) texto = '😅 ' + NOMBRE_PPT[suya] + ' le gana a ' + NOMBRE_PPT[mia].toLowerCase();
        pintar(MANO[mia], MANO[suya], texto);
        espera(1300, () => {
          if (yo >= 3 || el >= 3 || tiros >= 15) {
            terminado = true; if (yo > el) puntos += 300;
            return terminar('ppt', { puntos, aciertos: yo, total: tiros, segundos: tiempoDesde(t0), titulo: segunMarcador(yo, el, '🏆 ¡Le ganaste a Tito!', '🤝 ¡Parejos!', '🤖 Tito ganó esta vez'), detalle: yo + ' a ' + el + ' en ' + tiros + ' tiros' + (yo > el ? ' · +300 por ganar' : '') + '.' });
          }
          bloqueado = false; pintar('✊', '✊');
        });
      });
    }
    m.body.addEventListener('click', e => { const b = e.target.closest('[data-cr-ppt]'); if (b && !bloqueado && !terminado) tirar(b.dataset.crPpt); });
    pintar('✊', '✊');
  }

  // ---------- Ahorcado en inglés: 5 palabras ----------
  async function jugarAhorcado() {
    const d = await datos('ingles');
    const lista = tomar(CR.ahorcadoPalabras(d.vocabulario), 5);
    const m = marco('ahorcado'), t0 = Date.now();
    let w = 0, letras = [], puntos = 0, resueltas = 0, bloqueado = false, nueva = null;
    const color = () => COLORES_GLOBO[w % COLORES_GLOBO.length];
    function pintar(msg, revelar) {
      const p = lista[w], e = CR.ahorcadoEstado(p.en, letras);
      m.body.innerHTML = '<div class="cr-wrap"><div class="cr-sub">Palabra ' + (w + 1) + ' de ' + lista.length + '</div>' + globoHtml(e.errores, color(), e.perdida) +
        '<div class="cr-pista"><span class="emo" aria-hidden="true">' + escapeHtml(p.emoji) + '</span> Pista: <b>' + escapeHtml(p.es) + '</b></div>' +
        '<div class="cr-vidas">🎈 ' + Math.max(0, CR.AH_ERRORES - e.errores) + ' de ' + CR.AH_ERRORES + ' intentos</div>' +
        palabraHtml(p.en, letras, revelar, nueva) + '<div class="cr-estado" role="status">' + (msg || 'Elige una letra') + '</div>' + tecladoHtml(p.en, letras, !bloqueado) +
        '<div class="row-btns"><button class="btn ghost sm" data-ayuda="ahorcado">📖 Cómo se juega</button></div></div>';
      m.puntos(puntos);
    }
    function letra(l) {
      if (bloqueado || letras.includes(l)) return;
      const p = lista[w]; letras.push(l); nueva = l;
      const veces = [...p.en].filter(ch => ch === l).length;
      if (veces) { puntos += 10 * veces; sonidoOk(); } else sonidoMal();
      const e = CR.ahorcadoEstado(p.en, letras);
      if (!e.resuelta && !e.perdida) return pintar(veces ? '✔ ¡Sí está! +' + 10 * veces : '✘ No está la «' + l.toUpperCase() + '»');
      bloqueado = true;
      if (e.resuelta) { const extra = 50 + 10 * (CR.AH_ERRORES - e.errores); puntos += extra; resueltas++; pintar('🎉 ¡' + p.en.toUpperCase() + ' = ' + escapeHtml(p.es) + '! +' + extra); hablar(p.en); }
      else pintar('🎈 Se desinfló el globo. Era «' + p.en.toUpperCase() + '»', true);
      espera(1900, () => {
        if (++w >= lista.length) return terminar('ahorcado', { puntos, aciertos: resueltas, total: lista.length, segundos: tiempoDesde(t0), titulo: resueltas === lista.length ? '🏆 ¡Adivinaste todas!' : '🪢 ¡Buen intento!', detalle: 'Adivinaste ' + resueltas + ' de ' + lista.length + ' palabras en inglés.' });
        letras = []; nueva = null; bloqueado = false; pintar();
      });
    }
    m.body.addEventListener('click', e => { const b = e.target.closest('[data-cr-l]'); if (b && !b.disabled) letra(b.dataset.crL); });
    const tecla = e => { if (/^[a-z]$/i.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) letra(e.key.toLowerCase()); };
    document.addEventListener('keydown', tecla); limpiezas.push(() => document.removeEventListener('keydown', tecla));
    pintar();
  }

  // ---------- Serpientes y escaleras contra bots ----------
  const BOTS_SERP = [{ nombre: 'Lupita 🐸' }, { nombre: 'Beto 🐢' }, { nombre: 'Chema 🦜' }];
  function elegirSerpientes() {
    let n = 2;
    const m = marco('serpientes', { menu: true });
    m.body.innerHTML = '<div class="cr-wrap"><div class="q-card"><div class="big">🐍🪜</div><div class="q">Serpientes y escaleras</div><div class="sub">Llega primero a la casilla 100. Con 6 vuelves a tirar.</div></div>' +
      '<label>¿Contra cuántos bots?</label><div class="opts tres">' + [1, 2, 3].map(k => '<button class="opt" data-cr-bots="' + k + '" aria-pressed="' + (k === n) + '">' + k + ' bot' + (k > 1 ? 's' : '') + '</button>').join('') + '</div>' +
      '<div class="row-btns"><button class="btn ghost" data-ayuda="serpientes">📖 Cómo se juega</button><button class="btn" data-cr-go>🎲 Jugar</button></div></div>';
    m.body.addEventListener('click', e => {
      const b = e.target.closest('[data-cr-bots]');
      if (b) { n = Number(b.dataset.crBots); m.body.querySelectorAll('[data-cr-bots]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); }
      if (e.target.closest('[data-cr-go]')) jugarSerpientes(n);
    });
  }
  function jugarSerpientes(nBots) {
    const m = marco('serpientes'), t0 = Date.now();
    const jug = [{ nombre: 'Tú' }].concat(BOTS_SERP.slice(0, nBots));
    const pos = jug.map(() => 0);
    let turno = 0, tirando = false, terminado = false, tiros = 0, dado = null;
    m.body.innerHTML = '<div class="cr-wrap">' + serpTableroHtml(jug) + '<div class="cr-serp-pie"><span id="cr-dado">' + dadoHtml(null) + '</span><button class="btn" data-cr-tirar>🎲 Tirar</button></div>' +
      '<div class="cr-estado" id="cr-serp-msg" role="status"></div><div id="cr-serp-lista"></div><div class="row-btns"><button class="btn ghost sm" data-ayuda="serpientes">📖 Cómo se juega</button></div></div>';
    jug.forEach((_, i) => ponerFicha(i, 0));
    const msg = t => { document.getElementById('cr-serp-msg').textContent = t; };
    const refrescar = () => {
      document.getElementById('cr-serp-lista').innerHTML = jugadoresSerpHtml(jug, pos, turno);
      const b = m.body.querySelector('[data-cr-tirar]'); if (b) b.disabled = turno !== 0 || tirando || terminado;
      m.puntos(pos[0] * 4);
    };
    function tirar() {
      if (terminado) return;
      tirando = true; refrescar();
      dado = CR.serpDado(Math.random); tiros++;
      document.getElementById('cr-dado').innerHTML = dadoHtml(dado, true); tono(300 + dado * 60, 80);
      const quien = turno, mv = CR.serpMover(pos[quien], dado);
      espera(650, () => {
        pos[quien] = mv.paso; ponerFicha(quien, mv.paso);
        msg((quien ? jug[quien].nombre : 'Sacaste') + (quien ? ' sacó ' : ' ') + dado + textoSalto(mv.salto, ' · 🪜 ¡sube a la ' + mv.hasta + '!', ' · 🐍 ¡baja a la ' + mv.hasta + '!'));
        espera(mv.salto ? 550 : 50, () => {
          pos[quien] = mv.hasta; ponerFicha(quien, mv.hasta);
          if (mv.salto === 'escalera' && quien === 0) { sonidoOk(); } if (mv.salto === 'serpiente' && quien === 0) sonidoMal();
          if (mv.hasta === 100) {
            terminado = true; refrescar();
            const puntos = quien === 0 ? 700 : pos[0] * 4;
            msg(quien === 0 ? '🏁 ¡Llegaste a la meta!' : '🏁 Ganó ' + jug[quien].nombre);
            return espera(1800, () => terminar('serpientes', { puntos, aciertos: quien === 0 ? 1 : 0, total: 1, segundos: tiempoDesde(t0), titulo: quien === 0 ? '🏆 ¡Ganaste!' : '🐍 Ganó ' + jug[quien].nombre, detalle: 'Llegaste a la casilla ' + pos[0] + ' en ' + tiros + ' tiros de la mesa.' }));
          }
          if (dado !== 6) turno = (turno + 1) % jug.length; else if (quien === 0) msg('🎲 ¡Sacaste 6! Vuelve a tirar');
          tirando = false; refrescar();
          if (turno !== 0) espera(800, tirar);
        });
      });
    }
    m.body.addEventListener('click', e => { if (e.target.closest('[data-cr-tirar]') && turno === 0 && !tirando) tirar(); });
    msg('👉 Tu turno: toca 🎲 Tirar'); refrescar();
  }

  // ================= Salas =================
  // Estado propio de la sala actual (se reinicia con cada código, incluida la revancha).
  function cr() {
    if (!sala.cr || sala.cr.codigo !== sala.codigo) sala.cr = { codigo: sala.codigo, memo: new Map(), vistas: new Map(), enviando: false, pasados: {}, ultimoGet: 0, palabras: null, mia: {}, anim: null };
    return sala.cr;
  }
  function ctxSala() {
    const e = sala.estado, s = e.sala, c = cr();
    const jugadas = [];
    e.jugadores.forEach(x => (x.jugadas || []).forEach(j => {
      let y = j;
      if (j.eleccion !== undefined) { // ppt: recordar las elecciones ya vistas (son inmutables)
        const k = x.id + '|' + j.n;
        if (j.eleccion !== '?') c.vistas.set(k, j.eleccion); else if (c.vistas.has(k)) y = { ...j, eleccion: c.vistas.get(k) };
      }
      jugadas.push({ jugador: x.id, ...y });
    }));
    const orden = participantes();
    return {
      orden: orden.map(p => ({ id: p.id, bot: !!p.bot })), jugadas, inicio: s.inicio, ahora: ahoraServidor(), dur, rng: et => rngDe(s.seed, et),
      memo: (k, f) => { if (!c.memo.has(k)) { c.memo.set(k, f()); } return c.memo.get(k); }, modo: s.opciones.modo, palabras: c.palabras, participantes: orden,
    };
  }
  async function enviar(jugada) {
    const c = cr(); if (c.enviando) return;
    c.enviando = true; sala.vista = null; pintarSala();
    const r = await post('/juegos/sala/' + sala.codigo + '/respuesta', { jugada });
    await traerSala();
    c.enviando = false; sala.vista = null; pintarSala();
    if (!r.ok && r.body.error !== 'turno_tomado') alert('No se pudo enviar la jugada (' + (r.body.error || r.status) + ').');
  }
  const barra = (lim, total) => { const bar = document.getElementById('m-bar'); if (!bar) { return; } if (lim === null) { bar.hidden = true; return; } bar.hidden = false; bar.firstChild.style.width = Math.max(0, Math.min(100, (lim - ahoraServidor()) / total * 100)) + '%'; };
  function cuenta(body, texto) {
    const k = 'cuenta:' + Math.ceil((sala.estado.sala.inicio - ahoraServidor()) / 1000);
    if (sala.vista !== k) { body.innerHTML = '<div class="q-card"><div class="sub">' + texto + '</div><div class="letra">' + Math.ceil((sala.estado.sala.inicio - ahoraServidor()) / 1000) + '</div></div>'; sala.vista = k; }
  }
  const nombreDe = (p, extra) => avatarHtml(p.avatar, 18) + '<span class="nom">' + escapeHtml(p.nombre) + (p.bot ? ' 🤖' : '') + '</span>' + (extra || '');
  function podio(body, ps, puntos, titulo, aciertos, total) {
    const e = sala.estado, yo = ps.findIndex(p => p.id === e.yo);
    sala.finAciertos = yo >= 0 ? aciertos(yo) : 0; sala.finTotal = total;
    const filas = ps.map((p, j) => ({ id: p.id, nombre: p.nombre, tipo: p.bot ? 'bot' : p.tipo, avatar: p.avatar, total: puntos[j], ultimo: 0 })).sort((a, b) => b.total - a.total);
    return pintarFinalSala(body, filas, null, titulo);
  }
  const FIN_MS = 2500; // se ve el tablero final antes del podio
  // Un oyente de clics por sala sobre #p-body (los atributos data-crs-* son solo de estos juegos).
  function oyente(body) {
    if (body.dataset.crOyente) return;
    body.dataset.crOyente = '1';
    body.addEventListener('click', e => {
      if (!sala.estado || !IDS.includes(sala.estado.sala.juego) || cr().enviando) return;
      const st = cr().st; if (!st || st.fin) return;
      const g = e.target.closest('[data-cr-g]'), c4 = e.target.closest('[data-cr-c]'), p = e.target.closest('[data-cr-ppt]'), l = e.target.closest('[data-cr-l]'), d = e.target.closest('[data-cr-tirar]');
      if (g && !g.disabled) return enviar({ n: st.paso, accion: 'marcar', casilla: Number(g.dataset.crG) });
      if (c4 && !c4.disabled) return enviar({ n: st.paso, accion: 'soltar', col: Number(c4.dataset.crC) });
      if (l && !l.disabled) return enviar({ n: st.paso, accion: 'letra', letra: l.dataset.crL });
      if (d && !d.disabled) return enviar({ n: st.paso, accion: 'tirar' });
      if (p && !p.disabled && st.fase === 'elegir') {
        const r = st.ronda; cr().mia[r] = p.dataset.crPpt; sonidoOk(); sala.vista = null; pintarSala();
        post('/juegos/sala/' + sala.codigo + '/respuesta', { jugada: { n: r, accion: 'elegir', eleccion: p.dataset.crPpt } }).then(() => traerSala()).then(() => { sala.vista = null; pintarSala(); });
      }
    });
  }

  function pintarSalaCR(body) {
    oyente(body);
    const s = sala.estado.sala;
    if (ahoraServidor() < s.inicio) { barra(null); return cuenta(body, { gato: '¡Prepárense! Empieza ❌', conecta4: '¡Prepárense! Empieza 🔴', ppt: '¡Prepárense! 5 rondas', ahorcado: '¡Prepárense! 3 palabras en inglés', serpientes: '¡Prepárense! Tira el dado' }[s.juego]); }
    if (s.juego === 'gato') return salaGato(body);
    if (s.juego === 'conecta4') return salaConecta4(body);
    if (s.juego === 'ppt') return salaPpt(body);
    if (s.juego === 'ahorcado') return salaAhorcado(body);
    return salaSerpientes(body);
  }

  // Encabezado de 2 jugadores (Gato y Conecta 4).
  const duoHtml = (ps, turno, fin, ficha, extra) => '<div class="cr-marcador">' + ps.map((p, j) => '<span class="cr-jug' + (!fin && turno === j ? ' activo' : '') + '">' + ficha(j) + nombreDe(p, extra ? '<span class="pts">' + extra[j] + '</span>' : '') + '</span>').join('') + '</div>';
  const estadoTurno = (ps, yo, turno, enviando) => {
    if (yo < 0) return '👀 Estás viendo la partida';
    if (enviando) return '⏳ Enviando…';
    return yo === turno ? '👉 Tu turno' : '⏳ Turno de ' + escapeHtml(ps[turno].nombre);
  };

  function salaGato(body) {
    const ctx = ctxSala(), ps = ctx.participantes, c = cr();
    if (ps.length < 2) { barra(null); if (sala.vista !== 'faltan') { body.innerHTML = '<div class="card muted" style="text-align:center">❌⭕ Falta tu rival.</div>'; sala.vista = 'faltan'; } return; }
    const st = c.st = CR.salaGato(ctx), yo = ps.findIndex(p => p.id === sala.estado.yo);
    if (st.fin && ahoraServidor() >= st.fin.t + dur(FIN_MS)) {
      const g = st.fin.gana;
      return podio(body, ps, st.puntos, g === null ? '🤝 ¡Empate en el gato!' : '❌⭕ ¡Ganó ' + ps[g].nombre + '!', j => st.victorias[j], CR.GATO_SALA.rondas);
    }
    const ultimo = st.resultados[st.resultados.length - 1], enPausa = st.esperaHasta !== null || st.fin;
    barra(enPausa ? null : st.lim, dur(ps[st.turnoIdx].bot ? CR.GATO_SALA.bot : CR.GATO_SALA.turno));
    const k = 'gato:' + st.paso + ':' + st.ronda + ':' + !!enPausa + ':' + c.enviando;
    if (sala.vista === k) return;
    sala.vista = k;
    const ficha = j => '<span class="cr-ficha-chica">' + (j === 0 ? svgX : svgO) + '</span>';
    let msg;
    if (enPausa && ultimo) msg = ultimo.gana === null ? '🤝 ¡Empate en la ronda!' : '🎉 ¡' + escapeHtml(ps[ultimo.gana].nombre) + ' gana la ronda!';
    else msg = estadoTurno(ps, yo, st.turnoIdx, c.enviando);
    body.innerHTML = '<div class="cr-wrap">' + duoHtml(ps, st.turnoIdx, enPausa, ficha, st.victorias) + '<div class="cr-sub">Ronda ' + (st.ronda + 1) + ' de ' + CR.GATO_SALA.rondas + ' · 🤝 ' + st.empates + '</div>' +
      gatoHtml(st.t, { activo: !enPausa && yo === st.turnoIdx && !c.enviando, linea: enPausa && ultimo ? ultimo.linea : null, ultima: st.ultima && st.ultima.casilla }) +
      '<div class="cr-estado" role="status">' + msg + '</div><div class="row-btns"><button class="btn ghost sm" data-ayuda="gato">📖 Cómo se juega</button></div></div>';
  }

  function salaConecta4(body) {
    const ctx = ctxSala(), ps = ctx.participantes, c = cr();
    if (ps.length < 2) { barra(null); if (sala.vista !== 'faltan') { body.innerHTML = '<div class="card muted" style="text-align:center">🔴 Falta tu rival.</div>'; sala.vista = 'faltan'; } return; }
    const st = c.st = CR.salaConecta4(ctx), yo = ps.findIndex(p => p.id === sala.estado.yo);
    if (st.fin && ahoraServidor() >= st.fin.t + dur(FIN_MS)) {
      const g = st.fin.gana;
      return podio(body, ps, st.puntos, g === null ? '🤝 ¡Empate: tablero lleno!' : '🔴 ¡Ganó ' + ps[g].nombre + '!', j => st.fin.gana === j ? 1 : 0, 1);
    }
    barra(st.fin ? null : st.lim, dur(ps[st.turnoIdx].bot ? CR.C4_SALA.bot : CR.C4_SALA.turno));
    const k = 'c4:' + st.paso + ':' + !!st.fin + ':' + c.enviando;
    if (sala.vista === k) return;
    const animar = !sala.vista || !sala.vista.startsWith('c4:' + st.paso + ':');
    sala.vista = k;
    let msg;
    if (st.fin) msg = st.fin.gana === null ? '🤝 ¡Tablero lleno: empate!' : '🎉 ¡Cuatro en línea de ' + escapeHtml(ps[st.fin.gana].nombre) + '!';
    else msg = estadoTurno(ps, yo, st.turnoIdx, c.enviando);
    body.innerHTML = '<div class="cr-wrap">' + duoHtml(ps, st.turnoIdx, !!st.fin, j => fichaC4(j === 0 ? 'R' : 'A')) +
      c4Html(st.t, { activo: !st.fin && yo === st.turnoIdx && !c.enviando, ultima: st.ultima, animar, linea: st.linea }) +
      '<div class="cr-estado" role="status">' + msg + '</div><div class="row-btns"><button class="btn ghost sm" data-ayuda="conecta4">📖 Cómo se juega</button></div></div>';
  }

  function salaPpt(body) {
    const ctx = ctxSala(), ps = ctx.participantes, c = cr(), e = sala.estado;
    const st = c.st = CR.salaPpt(ctx), yo = ps.findIndex(p => p.id === e.yo);
    // Elecciones ocultas por el servidor en una ronda ya cerrada: volver a pedir el estado (cada 1.5 s como máximo).
    if (st.ocultas && Date.now() - c.ultimoGet > 1500) { c.ultimoGet = Date.now(); traerSala().then(() => { sala.vista = null; pintarSala(); }); }
    // Ronda cerrada sin mi elección: avisar «pasar» una vez (así el servidor me deja ver la ronda).
    st.rondas.forEach((ro, r) => {
      const mia = yo >= 0 && !ps[yo].bot && ctx.jugadas.some(j => j.jugador === e.yo && j.n === r);
      if (yo >= 0 && !ps[yo].bot && ctx.ahora >= ro.cierre && !mia && !c.pasados[r] && !c.mia[r]) { c.pasados[r] = true; post('/juegos/sala/' + sala.codigo + '/respuesta', { jugada: { n: r, accion: 'pasar' } }).then(() => traerSala()); }
    });
    if (st.fase === 'fin' && !st.ocultas) {
      const N = ps.length;
      const max = Math.max(...st.victorias), lideres = ps.filter((_, j) => st.victorias[j] === max && max > 0);
      return podio(body, ps, st.puntos, lideres.length === 1 ? '✊ ¡Ganó ' + lideres[0].nombre + '!' : '✊ ¡Empate en el primer lugar!', j => st.victorias[j], CR.PPT_SALA.rondas * Math.max(1, N - 1));
    }
    if (st.fase === 'fin') { barra(null); return; }
    const ro = st.rondas[st.ronda];
    if (st.fase === 'elegir') {
      barra(ro.lim, dur(CR.PPT_SALA.ventana));
      const yaElegi = c.mia[st.ronda] || (ctx.jugadas.find(j => j.jugador === e.yo && j.n === st.ronda) || {}).eleccion;
      const listos = ps.filter((p, j) => p.bot || ctx.jugadas.some(x => x.jugador === p.id && x.n === st.ronda && x.t <= ro.lim)).length;
      const k = 'ppt-e:' + st.ronda + ':' + (yaElegi || '') + ':' + listos;
      if (sala.vista === k) return;
      sala.vista = k;
      body.innerHTML = '<div class="cr-wrap"><div class="cr-sub">Ronda ' + (st.ronda + 1) + ' de ' + CR.PPT_SALA.rondas + ' · todos contra todos</div>' +
        '<div class="cr-ppt-duelo" aria-hidden="true"><span class="cr-mano' + (yaElegi ? ' sale' : '') + '">' + (yaElegi ? MANO[yaElegi] : '❔') + '</span></div>' +
        '<div class="cr-ya" role="status">' + textoEleccionPpt(yo, yaElegi) + '</div>' +
        pptOpsHtml(yo >= 0 && !yaElegi, yaElegi) + '<p class="cr-sub">✅ ' + listos + ' de ' + ps.length + ' ya eligieron</p>' + tablaPpt(ps, st, null, yo) +
        '<div class="row-btns"><button class="btn ghost sm" data-ayuda="ppt">📖 Cómo se juega</button></div></div>';
      return;
    }
    // Revelación: primero «¡Piedra, papel o tijera… ya!» (1 s) y luego las manos de todos a la vez.
    barra(ro.revelaHasta, dur(CR.PPT_SALA.revela));
    const yaSale = ctx.ahora >= ro.cierre + dur(1000) && !st.ocultas;
    const k = 'ppt-r:' + st.ronda + ':' + yaSale;
    if (sala.vista === k) return;
    sala.vista = k;
    const mia = yo >= 0 ? ro.elecciones[yo] : null;
    body.innerHTML = '<div class="cr-wrap"><div class="cr-sub">Ronda ' + (st.ronda + 1) + ' de ' + CR.PPT_SALA.rondas + '</div>' +
      '<div class="cr-ppt-duelo" aria-hidden="true"><span class="cr-mano' + (yaSale ? ' sale' : ' agita') + '">' + (yaSale ? (MANO[mia] || '🙈') : '✊') + '</span></div>' +
      '<div class="cr-ya" role="status">' + textoRevelaPpt(yaSale, yo, ro, mia) + '</div>' +
      tablaPpt(ps, st, yaSale ? ro : null, yo) + '</div>';
  }
  // Letrero mientras se elige: espectador, ya elegí o invitación a elegir.
  function textoEleccionPpt(yo, yaElegi) {
    if (yo < 0) return '👀 Estás viendo la partida';
    return yaElegi ? '✔ Elegiste ' + NOMBRE_PPT[yaElegi] + ' · esperando a los demás' : '¿Qué eliges? Nadie ve tu elección hasta el final de la ronda';
  }
  // Letrero de la revelación: la cuenta, «¡Ya!» para quien mira o cómo me fue en la ronda.
  function textoRevelaPpt(yaSale, yo, ro, mia) {
    if (!yaSale) return '¡Piedra, papel o tijera… ya!';
    if (yo < 0) return '¡Ya!';
    const gane = ro.victorias[yo];
    if (gane) return '🎉 Le ganaste a ' + gane + (gane === 1 ? ' rival' : ' rivales');
    return mia ? '😅 Esta vez no ganaste' : '⏰ No elegiste a tiempo';
  }
  function tablaPpt(ps, st, ro, yo) {
    return '<ol class="cr-ppt-lista">' + ps.map((p, j) => '<li class="' + (j === yo ? 'yo' : '') + '">' + avatarHtml(p.avatar, 24) + '<span class="n">' + escapeHtml(p.nombre) + (p.bot ? ' 🤖' : '') + '</span>' +
      (ro ? '<span class="e" title="' + escapeHtml(NOMBRE_PPT[ro.elecciones[j]] || 'No eligió') + '">' + (MANO[ro.elecciones[j]] || '🙈') + '</span><span class="v">+' + ro.victorias[j] + '</span>' : '') +
      '<span class="v">🏅 ' + st.victorias[j] + '</span></li>').join('') + '</ol>';
  }

  // Resumen de la última jugada del Ahorcado en sala ('' si no hay letra ni pase).
  function textoUltimaAhorcado(ps, u) {
    if (u && u.accion === 'letra') return escapeHtml(ps[u.j].nombre) + ': «' + u.letra.toUpperCase() + '» ' + (u.veces ? '✔ +' + 10 * u.veces : '✘') + ' · ';
    if (u && u.accion === 'pasar') return escapeHtml(ps[u.j].nombre) + ' pasó' + (u.auto ? ' ⏰' : '') + ' · ';
    return '';
  }
  function salaAhorcado(body) {
    const c = cr(), s = sala.estado.sala;
    if (!c.palabras) {
      if (!c.cargando) { c.cargando = true; datos('ingles').then(d => { c.palabras = tomar(CR.ahorcadoPalabras(d.vocabulario), 3, rngDe(s.seed, 'ahorcado')); sala.vista = null; pintarSala(); }); }
      if (sala.vista !== 'cargando') { body.innerHTML = '<div class="loading">Preparando las palabras…</div>'; sala.vista = 'cargando'; }
      return;
    }
    const ctx = ctxSala(), ps = ctx.participantes, st = c.st = CR.salaAhorcado(ctx), yo = ps.findIndex(p => p.id === sala.estado.yo);
    if (st.fin && ahoraServidor() >= st.fin.t + dur(FIN_MS)) {
      const resueltas = st.resultados.filter(r => r.resuelta).length;
      return podio(body, ps, st.puntos, st.modo === 'coop' ? '🤝 ¡Adivinaron ' + resueltas + ' de ' + c.palabras.length + ' palabras!' : '🪢 ¡Fin del ahorcado!', j => st.aciertos[j], c.palabras.reduce((a, p) => a + p.en.length, 0));
    }
    const ultimo = st.resultados[st.resultados.length - 1], enPausa = st.esperaHasta !== null || !!st.fin;
    const w = st.w, p = c.palabras[w], letras = st.letras; // en la pausa siguen la palabra y las letras que terminaron
    const e = CR.ahorcadoEstado(p.en, letras);
    barra(enPausa ? null : st.lim, dur(ps[st.turnoIdx] && ps[st.turnoIdx].bot ? CR.AH_SALA.bot : CR.AH_SALA.turno));
    const k = 'ah:' + st.paso + ':' + st.w + ':' + enPausa + ':' + c.enviando;
    if (sala.vista === k) return;
    sala.vista = k;
    const u = st.ultima;
    let msg;
    if (enPausa && ultimo) msg = ultimo.resuelta ? '🎉 ¡' + p.en.toUpperCase() + '! La completó ' + escapeHtml(ps[ultimo.por].nombre) : '🎈 Se desinfló el globo. Era «' + p.en.toUpperCase() + '»';
    else msg = textoUltimaAhorcado(ps, u) + estadoTurno(ps, yo, st.turnoIdx, c.enviando);
    body.innerHTML = '<div class="cr-wrap"><div class="cr-sub">' + (st.modo === 'coop' ? '🤝 Cooperativo' : '⚔️ Competitivo') + ' · palabra ' + (w + 1) + ' de ' + c.palabras.length + '</div>' +
      globoHtml(e.errores, COLORES_GLOBO[w % COLORES_GLOBO.length], enPausa && ultimo && ultimo.perdida) +
      '<div class="cr-pista"><span class="emo" aria-hidden="true">' + escapeHtml(p.emoji) + '</span> Pista: <b>' + escapeHtml(p.es) + '</b></div>' +
      palabraHtml(p.en, letras, enPausa && ultimo && ultimo.perdida, u && u.accion === 'letra' ? u.letra : null) +
      '<div class="cr-estado" role="status">' + msg + '</div>' + tecladoHtml(p.en, letras, !enPausa && yo === st.turnoIdx && !c.enviando) +
      '<ol class="cr-ppt-lista">' + ps.map((q, j) => '<li class="' + (j === yo ? 'yo' : '') + '"' + (!enPausa && j === st.turnoIdx ? ' style="border-color:var(--accent-2)"' : '') + '>' + avatarHtml(q.avatar, 24) + '<span class="n">' + (!enPausa && j === st.turnoIdx ? '👉 ' : '') + escapeHtml(q.nombre) + (q.bot ? ' 🤖' : '') + '</span><span class="v">⭐ ' + st.puntos[j] + '</span></li>').join('') + '</ol>' +
      '<div class="row-btns"><button class="btn ghost sm" data-ayuda="ahorcado">📖 Cómo se juega</button></div></div>';
  }

  function salaSerpientes(body) {
    const ctx = ctxSala(), ps = ctx.participantes, c = cr(), st = c.st = CR.salaSerpientes(ctx), yo = ps.findIndex(p => p.id === sala.estado.yo);
    if (st.fin && ahoraServidor() >= st.fin.t + dur(FIN_MS)) return podio(body, ps, st.puntos, '🏁 ¡Ganó ' + ps[st.fin.gana].nombre + '!', j => st.fin.gana === j ? 1 : 0, 1);
    barra(st.fin ? null : st.lim, dur(ps[st.turnoIdx].bot ? CR.SERP_SALA.bot : CR.SERP_SALA.turno));
    if (sala.vista !== 'serp' && !String(sala.vista).startsWith('serp:')) {
      body.innerHTML = '<div class="cr-wrap">' + serpTableroHtml(ps) + '<div class="cr-serp-pie"><span id="cr-dado">' + dadoHtml(null) + '</span><button class="btn" data-cr-tirar disabled>🎲 Tirar</button></div>' +
        '<div class="cr-estado" id="cr-serp-msg" role="status"></div><div id="cr-serp-lista"></div><div class="row-btns"><button class="btn ghost sm" data-ayuda="serpientes">📖 Cómo se juega</button></div></div>';
      ps.forEach((_, i) => ponerFicha(i, 0));
      c.vistoPaso = -1;
    }
    const k = 'serp:' + st.paso + ':' + c.enviando + ':' + !!st.fin;
    if (sala.vista === k) return;
    sala.vista = k;
    const u = st.ultima, nuevo = u && c.vistoPaso !== u.n;
    if (u && nuevo) {
      c.vistoPaso = u.n;
      document.getElementById('cr-dado').innerHTML = dadoHtml(u.dado, true); tono(300 + u.dado * 60, 80);
      ps.forEach((_, i) => { if (i !== u.j) ponerFicha(i, st.pos[i]); });
      ponerFicha(u.j, u.paso);
      if (u.salto) { const j = u.j, h = u.hasta; setTimeout(() => ponerFicha(j, h), 550 * TIEMPO); } // pausa visual, sin afectar el estado
    } else ps.forEach((_, i) => ponerFicha(i, st.pos[i]));
    let quien = '';
    if (u) quien = escapeHtml(ps[u.j].nombre) + ' sacó ' + u.dado + textoSalto(u.salto, ' · 🪜 sube a la ' + u.hasta, ' · 🐍 baja a la ' + u.hasta) + (u.auto ? ' ⏰' : '') + ' · ';
    document.getElementById('cr-serp-msg').innerHTML = st.fin ? '🏁 ¡' + escapeHtml(ps[st.fin.gana].nombre) + ' llegó a la meta!' : quien + estadoTurno(ps, yo, st.turnoIdx, c.enviando);
    document.getElementById('cr-serp-lista').innerHTML = jugadoresSerpHtml(ps, st.pos, st.fin ? -1 : st.turnoIdx);
    const b = body.querySelector('[data-cr-tirar]'); if (b) b.disabled = !!st.fin || yo !== st.turnoIdx || c.enviando;
  }

  // ---------- Crear partida: modo del Ahorcado ----------
  function opcionesCrear(juego) {
    if (juego !== 'ahorcado') return {};
    const s = document.getElementById('p-cr-modo');
    return { modo: s ? s.value : 'compite' };
  }
  document.addEventListener('change', e => {
    if (!e.target || e.target.id !== 'p-juego') return;
    let w = document.getElementById('p-cr-modo-wrap');
    if (!w) {
      const ref = document.getElementById('p-tema-wrap'); if (!ref) return;
      ref.insertAdjacentHTML('afterend', '<div id="p-cr-modo-wrap" hidden><label for="p-cr-modo">Modo</label><select id="p-cr-modo" class="sel"><option value="compite">⚔️ Competitivo (quien acierta sigue)</option><option value="coop">🤝 Cooperativo (todos juntos)</option></select></div>');
      w = document.getElementById('p-cr-modo-wrap');
    }
    w.hidden = e.target.value !== 'ahorcado';
  });

  // ---------- 📖 Cómo se juega ----------
  const AYUDA = {
    gato: '<h2>❌⭕ Gato</h2><p><b>Objetivo:</b> poner tres de tus fichas en línea: en una fila, una columna o una diagonal.</p>' +
      '<ol><li>Por turnos, cada quien marca una casilla libre (❌ o ⭕).</li><li>Gana la ronda quien completa primero una línea de tres.</li><li>Si se llenan las 9 casillas sin línea, es <b>empate</b>.</li></ol>' +
      '<h3>Contra Michi 🐱</h3><p>Serie de 3 rondas y se turnan para empezar. 🐣 Fácil juega al azar, 🦊 Medio gana o te bloquea si puede y 🦉 Difícil no se equivoca: ¡empatarle ya es un logro!</p>' +
      '<h3>En partida</h3><p>1 vs 1 al mejor de 3 rondas, con 20 s por turno (si se acaba, se marca una casilla al azar). Si juegas sola o solo, tu rival es un bot. Ronda ganada: 300 puntos; empate: 120.</p>' +
      '<p>💡 Tip: el centro y las esquinas son las mejores casillas para empezar.</p>',
    conecta4: '<h2>🔴 Conecta 4</h2><p><b>Objetivo:</b> juntar <b>4 fichas</b> de tu color en línea: horizontal, vertical o diagonal.</p>' +
      '<ol><li>Toca una columna: tu ficha cae hasta la casilla libre más baja.</li><li>Se juega por turnos; empieza 🔴.</li><li>Si el tablero (7 × 6) se llena sin 4 en línea, es empate.</li></ol>' +
      '<h3>Contra Cuatrito 🤖</h3><p>🐣 Fácil gana o te bloquea si puede · 🦊 Medio piensa 4 jugadas · 🦉 Difícil piensa 6.</p>' +
      '<h3>En partida</h3><p>1 vs 1 con 25 s por turno (si se acaba, la ficha se suelta sola). Gana: 800 · empate: 400 · pierde: 100.</p><p>💡 Tip: las columnas del centro sirven para más líneas.</p>',
    ppt: '<h2>✊ Piedra, papel o tijera</h2><p>✊ <b>Piedra</b> rompe a ✌️ tijera · ✌️ <b>Tijera</b> corta a ✋ papel · ✋ <b>Papel</b> envuelve a ✊ piedra. Si eligen lo mismo, es empate.</p>' +
      '<h3>Contra Tito 🤖</h3><p>Al mejor de 5: gana quien llega primero a 3. Tito elige antes de ver tu mano. 100 puntos por tiro ganado y 300 si ganas la serie.</p>' +
      '<h3>En partida (de 2 a 8)</h3><p>5 rondas, todos contra todos. Cada quien elige en secreto (12 s) y se revela a la vez. Sumas una victoria por cada rival al que le ganas. Si no eliges a tiempo, pierdes contra todos en esa ronda. Al final, quien junte más victorias gana 200 puntos extra.</p>',
    ahorcado: '<h2>🪢 Ahorcado en inglés</h2><p>Adivina la palabra en <b>inglés</b>. Tienes la pista en español y su emoji.</p>' +
      '<ol><li>Elige letras con el teclado de la pantalla (o el de tu compu).</li><li>Si la letra está, aparece en su lugar: +10 por cada vez que sale.</li><li>Si no está, el globo 🎈 se desinfla un poco. Con 6 errores se desinfla del todo y pasas a la siguiente palabra.</li></ol>' +
      '<h3>Solo</h3><p>5 palabras. Al adivinar: +50 y +10 por cada intento que te sobró.</p>' +
      '<h3>En partida</h3><p>Las mismas 3 palabras para todos, por turnos de 20 s.</p><ul><li>⚔️ <b>Competitivo:</b> si aciertas, sigues tú; quien completa la palabra gana +50.</li><li>🤝 <b>Cooperativo:</b> el turno siempre pasa y, si la adivinan, +50 para todas y todos.</li></ul>',
    serpientes: '<h2>🐍 Serpientes y escaleras</h2><p><b>Objetivo:</b> llegar primero a la casilla <b>100</b> 🏁.</p>' +
      '<ol><li>En tu turno toca 🎲 <b>Tirar</b> y avanza lo que diga el dado.</li><li>Si caes al pie de una 🪜 <b>escalera</b>, subes. Si caes en la cabeza de una 🐍 <b>serpiente</b>, bajas a su cola.</li><li>Si sacas <b>6</b>, vuelves a tirar.</li><li>Llegas a la meta aunque te sobren puntos.</li></ol>' +
      '<h3>Puntos</h3><p>Quien gana: 700. Los demás: 4 puntos por cada casilla avanzada.</p><p>En partida juegan de 2 a 4 (con bots si se piden); el dado sale igual en todos los celulares y nadie puede escoger su número.</p>',
  };

  g.ClasicosRapidosUI = { IDS, jugar: id => JUGAR[id](), AYUDA, pintarSala: pintarSalaCR, opcionesCrear };
})(typeof window !== 'undefined' ? window : globalThis);
