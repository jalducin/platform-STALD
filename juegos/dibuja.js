// 🎨 Dibuja y adivina (openspec: juegos-salas-grandes): partida por turnos de 3 a 12 personas con vocabulario de inglés.
// - `globalThis.Dibuja`: reglas puras (calendario de turnos igual a server/salas_grandes.ts, simplificar el trazo).
// - Sala: quien dibuja recibe la palabra del servidor (GET de la sala, solo en su turno) y manda el trazo en lotes;
//   los demás lo ven llegar por Realtime (o el sondeo) y escriben en inglés; el servidor valida.
// - Práctica individual: adivinar la palabra mientras su emoji se aclara.
(function (g) {
  'use strict';
  const DIBUJO_MS = 60000, PAUSA_MS = 5000, MAX_PUNTOS = 64, MAX_POR_ENVIO = 6, ENVIO_MS = 600, PUNTOS_POR_ACIERTO = 50;
  // Calendario (igual que calendarioDibuja del servidor).
  function calendario(inicio, ids, acierto) {
    const turnos = []; let ini = inicio;
    ids.forEach((dibuja, i) => {
      const finDibujo = ini + DIBUJO_MS;
      const ts = ids.filter(x => x !== dibuja).map(x => acierto(x, i));
      const todos = ts.every(t => t !== undefined && t <= finDibujo);
      const fin = todos && ts.length ? Math.max(...ts) : finDibujo;
      turnos.push({ i, dibuja, ini, finDibujo, fin }); ini = fin + PAUSA_MS;
    });
    return turnos;
  }
  function turnoEn(cal, t) {
    for (const x of cal) {
      if (t < x.ini) return null;
      if (t < x.fin) return { turno: x, fase: 'dibujo' };
      if (t < x.fin + PAUSA_MS) return { turno: x, fase: 'pausa' };
    }
    return null;
  }
  // Puntos [x, y, …] en 0–255: quita los que quedan a menos de 3 unidades y parte en trazos de hasta 64 puntos.
  function simplificar(p) {
    const q = [Math.round(p[0]), Math.round(p[1])];
    for (let k = 2; k < p.length; k += 2) { const x = Math.round(p[k]), y = Math.round(p[k + 1]); if (Math.hypot(x - q[q.length - 2], y - q[q.length - 1]) >= 3) q.push(x, y); }
    if (q.length === 2) q.push(q[0], q[1]); // un punto: trazo de 2 iguales
    const partes = [];
    for (let k = 0; k < q.length - 2; k += (MAX_PUNTOS - 1) * 2) partes.push(q.slice(k, k + MAX_PUNTOS * 2));
    return partes.map(x => x.map(v => Math.max(0, Math.min(255, v))));
  }
  const normalizar = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z ]/g, '').replace(/\s+/g, ' ').trim();
  g.Dibuja = { DIBUJO_MS, PAUSA_MS, calendario, turnoEn, simplificar, normalizar };
  if (typeof document === 'undefined') return;

  // ---------- Lienzo ----------
  const SG = g.SalasGrandes;
  const COLORES = ['#111827', '#dc2626', '#2563eb', '#16a34a', '#f59e0b', '#7c3aed', '#ec4899', '#ffffff'];
  const NOMBRES_COLOR = ['negro', 'rojo', 'azul', 'verde', 'amarillo', 'morado', 'rosa', 'goma (blanco)'];
  const GROSOR = [0, 2.5, 6, 12];
  SG.css('css-dibuja', `
  .dj-lienzo { display: block; width: 100%; max-width: 360px; aspect-ratio: 1; margin: 0 auto; background: #fff; border-radius: 14px; border: 3px solid var(--border); touch-action: none; cursor: crosshair; }
  .dj-lienzo.solo-ver { cursor: default; }
  .dj-cab { text-align: center; margin: 4px 0 8px; }
  .dj-cab .pal { font-size: 1.5rem; font-weight: 900; letter-spacing: .04em; }
  .dj-huecos { font-family: ui-monospace, monospace; font-size: 1.3rem; font-weight: 800; letter-spacing: .35em; }
  .dj-herr { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px; margin: 8px auto 0; max-width: 360px; }
  .dj-herr button { width: 34px; height: 34px; border-radius: 50%; border: 2px solid var(--border); cursor: pointer; padding: 0; }
  .dj-herr button[aria-pressed="true"] { outline: 3px solid var(--gold, #f59e0b); outline-offset: 2px; }
  .dj-herr .g { background: var(--card); color: var(--text); font-weight: 900; }
  .dj-herr .borrar { width: auto; border-radius: 999px; padding: 0 10px; background: var(--card); color: var(--text); font: inherit; font-size: .8rem; }
  .dj-feed { list-style: none; margin: 8px auto 0; padding: 0; max-width: 360px; font-size: .85rem; }
  .dj-feed li { padding: 3px 6px; border-bottom: 1px dashed var(--border); }
  .dj-feed li.ok { color: var(--ok); font-weight: 800; }
  .dj-form { display: flex; gap: 6px; max-width: 360px; margin: 8px auto 0; }
  .dj-form input { flex: 1; min-width: 0; }
  .dj-revela { text-align: center; }
  .dj-revela .em { font-size: 3rem; }
  .dj-practica { image-rendering: pixelated; }
  `);
  function crearLienzo(cont, clase) {
    const c = document.createElement('canvas');
    c.className = 'dj-lienzo ' + (clase || ''); c.id = 'dj-lienzo'; c.width = 512; c.height = 512;
    c.setAttribute('role', 'img'); c.setAttribute('aria-label', 'Lienzo del dibujo');
    cont.appendChild(c);
    const ctx = c.getContext('2d'); ctx.scale(2, 2); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 256, 256);
    return { c, ctx };
  }
  function pintarTrazo(ctx, t) {
    ctx.strokeStyle = COLORES[t.c] || '#111827'; ctx.lineWidth = GROSOR[t.g] || 2.5;
    ctx.beginPath(); ctx.moveTo(t.p[0], t.p[1]);
    for (let k = 2; k < t.p.length; k += 2) ctx.lineTo(t.p[k], t.p[k + 1]);
    if (t.p.length === 4 && t.p[0] === t.p[2] && t.p[1] === t.p[3]) ctx.lineTo(t.p[0] + 0.1, t.p[1]);
    ctx.stroke();
  }
  const limpiarLienzo = ctx => { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 256, 256); };
  const huecos = forma => (forma || []).map(n => '_'.repeat(n).split('').join(' ')).join('   ');

  // ---------- Sala ----------
  const est = () => {
    if (!sala.dj || sala.dj.codigo !== sala.codigo) sala.dj = { codigo: sala.codigo, mios: [], pendientes: [], borrar: false, enviando: false, ultimoEnvio: 0, color: 0, g: 2, dibujados: 0, msg: '', pidiendo: 0, feed: null };
    return sala.dj;
  };
  const humanosOrden = () => [...sala.estado.jugadores].sort((a, b) => a.unido - b.unido);
  function calendarioSala() {
    const js = humanosOrden(), por = new Map(js.map(j => [j.id, j]));
    return calendario(sala.estado.sala.inicio, js.map(j => j.id), (id, t) => { const a = (por.get(id) || {}).aciertos; return a && a[t] ? a[t].t : undefined; });
  }
  function totales(cal) {
    const js = humanosOrden();
    return js.map(p => {
      let total = 0, ac = 0;
      for (const t of cal) {
        if (t.dibuja === p.id) total += PUNTOS_POR_ACIERTO * js.filter(x => x.id !== p.id && x.aciertos && x.aciertos[t.i]).length;
        else if (p.aciertos && p.aciertos[t.i]) { total += p.aciertos[t.i].pts; ac++; }
      }
      return { id: p.id, nombre: p.nombre, tipo: p.tipo, avatar: p.avatar, total, ultimo: 0, aciertos: ac };
    }).sort((a, b) => b.total - a.total);
  }
  // Pide la sala de nuevo (la palabra o las reveladas) como mucho cada 1.5 s.
  function pedirSala(st) {
    if (Date.now() - st.pidiendo < 1500) return;
    st.pidiendo = Date.now();
    const codigo = sala.codigo;
    traerSala().then(() => { if (sala.codigo === codigo && sala.vista !== 'final') sala.vista = null; });
  }
  const nombreDe = id => (sala.estado.jugadores.find(j => j.id === id) || {}).nombre || '?';

  function pintar(body) {
    const e = sala.estado, s = e.sala, st = est();
    if (SG.cuenta(body, '¡Prepárense! Dibuja primero ' + escapeHtml(nombreDe(humanosOrden()[0] && humanosOrden()[0].id)))) return;
    const ahora = ahoraServidor(), cal = calendarioSala(), act = turnoEn(cal, ahora);
    if (!act) {
      SG.barra(null);
      if (sala.vista === 'final') return;
      const filas = totales(cal), mio = filas.find(f => f.id === e.yo);
      sala.finAciertos = mio ? mio.aciertos : 0; sala.finTotal = Math.max(0, cal.length - 1);
      return pintarFinalSala(body, filas, null, '🎨 ¡Fin de Dibuja y adivina!');
    }
    const t = act.turno, soy = t.dibuja === e.yo, dj = e.dibuja || {};
    const revelada = (dj.reveladas || []).find(r => r.turno === t.i);
    if (act.fase === 'dibujo') SG.barra((t.finDibujo - ahora) / DIBUJO_MS); else SG.barra(null);
    const miPalabra = soy && dj.turno === t.i && dj.palabra ? dj : null;
    if (act.fase === 'dibujo' && soy && !miPalabra) pedirSala(st);
    if (act.fase === 'pausa' && !revelada) pedirSala(st);
    const clave = 'dj:' + t.i + ':' + act.fase + ':' + (soy ? 1 : 0) + ':' + (miPalabra ? 1 : 0) + ':' + (revelada ? 1 : 0);
    if (sala.vista !== clave) {
      sala.vista = clave;
      if (act.fase === 'pausa') {
        body.innerHTML = '<div class="q-card dj-revela"><div class="sub">Turno ' + (t.i + 1) + ' de ' + cal.length + ' · dibujó ' + escapeHtml(nombreDe(t.dibuja)) + '</div>' +
          (revelada ? '<div class="em">' + escapeHtml(revelada.emoji) + '</div><div class="q">La palabra era: <b id="dj-revelada">' + escapeHtml(revelada.palabra) + '</b></div><div class="sub">' + escapeHtml(revelada.es) + '</div>' : '<div class="q">⏳ Revelando la palabra…</div>') +
          '</div><h2>🏆 Marcador</h2>' + marcadorHtml(totales(cal), e.yo);
        return;
      }
      st.dibujados = 0;
      if (soy && st.turnoMios !== t.i) { st.turnoMios = t.i; st.mios = []; st.pendientes = []; st.borrar = false; const previo = (e.jugadores.find(j => j.id === e.yo) || {}).dibujo; if (previo && previo.turno === t.i) st.mios = previo.trazos.slice(); }
      body.innerHTML = '<div class="dj-cab" id="dj-cab">' + (soy
        ? (miPalabra ? '<div class="sub">✏️ ¡Te toca dibujar! No escribas letras.</div><div class="pal" id="dj-palabra" data-palabra="' + escapeHtml(miPalabra.palabra) + '">' + escapeHtml(miPalabra.emoji + ' ' + miPalabra.palabra) + '</div><div class="sub">(' + escapeHtml(miPalabra.es) + ')</div>' : '<div class="q">⏳ Recibiendo tu palabra…</div>')
        : '<div class="sub">🎨 Dibuja <b>' + escapeHtml(nombreDe(t.dibuja)) + '</b> · adivina en inglés</div><div class="dj-huecos" id="dj-huecos">' + escapeHtml(huecos(dj.turno === t.i ? dj.forma : null)) + '</div>') +
        '</div><div id="dj-lienzo-wrap"></div>' +
        (soy ? '<div class="dj-herr" role="group" aria-label="Colores y grosor">' + COLORES.map((c, k) => '<button type="button" data-dj-color="' + k + '" style="background:' + c + '" aria-label="Color ' + NOMBRES_COLOR[k] + '" aria-pressed="' + (st.color === k) + '"></button>').join('') +
          [1, 2, 3].map(k => '<button type="button" class="g" data-dj-g="' + k + '" aria-label="Grosor ' + k + '" aria-pressed="' + (st.g === k) + '">' + ['', '·', '•', '●'][k] + '</button>').join('') +
          '<button type="button" class="borrar" data-dj-borrar>🧽 Borrar todo</button></div>'
          : '<form class="dj-form" id="dj-form" autocomplete="off"><input id="dj-texto" maxlength="40" placeholder="Escribe en inglés…" autocapitalize="off" spellcheck="false" aria-label="Tu respuesta en inglés"><button class="btn" type="submit">Adivinar</button></form>') +
        '<div class="feedback" id="dj-msg"></div><ul class="dj-feed" id="dj-feed" aria-live="polite"></ul>' +
        '<div class="row-btns" style="margin-top:8px"><button class="btn ghost sm" data-ayuda="dibuja">📖 Cómo se juega</button></div>';
      st.feed = null;
      const L = crearLienzo(document.getElementById('dj-lienzo-wrap'), soy ? '' : 'solo-ver');
      st.lienzo = L;
      if (soy) { st.mios.forEach(x => pintarTrazo(L.ctx, x)); conectarDibujo(L, st, t.i); }
    }
    // Trazo de quien dibuja (los demás).
    if (!soy && st.lienzo) {
      const d = (e.jugadores.find(j => j.id === t.dibuja) || {}).dibujo;
      const lista = d && d.turno === t.i ? d.trazos : [];
      if (lista.length < st.dibujados) { limpiarLienzo(st.lienzo.ctx); st.dibujados = 0; }
      for (; st.dibujados < lista.length; st.dibujados++) pintarTrazo(st.lienzo.ctx, lista[st.dibujados]);
      const h = document.getElementById('dj-huecos'); if (h && dj.turno === t.i && dj.forma && !h.textContent.trim()) h.textContent = huecos(dj.forma);
    }
    if (soy) enviarTrazos(st, t.i);
    // Lo que escriben los demás y quién ya adivinó.
    const feed = [];
    for (const j of e.jugadores) {
      (j.intentos || []).filter(x => x.turno === t.i).forEach(x => feed.push({ t: x.t, html: escapeHtml(j.nombre) + ': ' + (x.casi ? '🔥 ¡casi!' : escapeHtml(x.texto)) }));
      if (j.aciertos && j.aciertos[t.i]) feed.push({ t: j.aciertos[t.i].t, ok: true, html: '✅ ' + escapeHtml(j.nombre) + ' adivinó (+' + j.aciertos[t.i].pts + ')' });
    }
    const html = feed.sort((a, b) => b.t - a.t).slice(0, 8).map(x => '<li' + (x.ok ? ' class="ok"' : '') + '>' + x.html + '</li>').join('');
    const ul = document.getElementById('dj-feed');
    if (ul && st.feed !== html) { st.feed = html; ul.innerHTML = html || '<li class="muted">' + (soy ? 'Aquí verás lo que escriben.' : 'Sé el primero en adivinar.') + '</li>'; }
    const yaAdivine = !soy && ((e.jugadores.find(j => j.id === e.yo) || {}).aciertos || {})[t.i];
    const form = document.getElementById('dj-form');
    if (form && yaAdivine && !form.hidden) { form.hidden = true; mensaje('✅ ¡Adivinaste! Espera a los demás…', 'ok'); }
  }
  function mensaje(t, cls) { const m = document.getElementById('dj-msg'); if (m) { m.className = 'feedback ' + (cls || ''); m.textContent = t; } }

  // Dibujar con el dedo o el mouse: el trazo se ve al instante y se manda simplificado en lotes.
  function conectarDibujo(L, st, turno) {
    let actual = null;
    const punto = ev => { const r = L.c.getBoundingClientRect(); return [(ev.clientX - r.left) / r.width * 256, (ev.clientY - r.top) / r.height * 256]; };
    L.c.addEventListener('pointerdown', ev => {
      ev.preventDefault(); L.c.setPointerCapture(ev.pointerId);
      actual = { c: st.color, g: st.g, p: punto(ev) };
    });
    L.c.addEventListener('pointermove', ev => {
      if (!actual) return;
      const [x, y] = punto(ev), n = actual.p.length;
      L.ctx.strokeStyle = COLORES[actual.c]; L.ctx.lineWidth = GROSOR[actual.g];
      L.ctx.beginPath(); L.ctx.moveTo(actual.p[n - 2], actual.p[n - 1]); L.ctx.lineTo(x, y); L.ctx.stroke();
      actual.p.push(x, y);
    });
    const soltar = () => {
      if (!actual) return;
      const partes = simplificar(actual.p).map(p => ({ c: actual.c, g: actual.g, p }));
      if (partes.length === 1 && partes[0].p.length === 4) pintarTrazo(L.ctx, partes[0]);
      st.mios.push(...partes); st.pendientes.push(...partes); actual = null;
      enviarTrazos(st, turno);
    };
    L.c.addEventListener('pointerup', soltar); L.c.addEventListener('pointercancel', soltar); L.c.addEventListener('pointerleave', soltar);
  }
  function enviarTrazos(st, turno) {
    if (st.enviando || (!st.pendientes.length && !st.borrar) || Date.now() - st.ultimoEnvio < ENVIO_MS) return;
    const borrar = st.borrar, lote = borrar ? [] : st.pendientes.splice(0, MAX_POR_ENVIO);
    st.borrar = false; st.enviando = true; st.ultimoEnvio = Date.now();
    post('/juegos/sala/' + sala.codigo + '/respuesta', { trazo: borrar ? { turno, borrar: true } : { turno, nuevos: lote } }).then(r => {
      st.enviando = false;
      if (r.ok) return;
      if (r.status === 429 || r.status === 0 || r.status >= 500) { if (borrar) st.borrar = true; else st.pendientes.unshift(...lote); }
      else if (r.body.error === 'dibujo_lleno') mensaje('🧽 El lienzo está lleno: borra para seguir dibujando.', 'bad');
    });
  }

  function clic(e) {
    const st = sala.dj; if (!st) return false;
    const c = e.target.closest('[data-dj-color]'), gr = e.target.closest('[data-dj-g]');
    if (c) { st.color = Number(SG.elegir(document.getElementById('p-body').querySelector('.dj-herr'), 'data-dj-color', c)); return true; }
    if (gr) { st.g = Number(SG.elegir(document.getElementById('p-body').querySelector('.dj-herr'), 'data-dj-g', gr)); return true; }
    if (e.target.closest('[data-dj-borrar]')) {
      if (!st.lienzo) return true;
      limpiarLienzo(st.lienzo.ctx); st.mios = []; st.pendientes = []; st.borrar = true; tono(330, 60);
      return true;
    }
    return false;
  }
  // Enviar la respuesta (el formulario de la sala).
  document.addEventListener('submit', ev => {
    if (!ev.target || ev.target.id !== 'dj-form' || !sala.estado) return;
    ev.preventDefault();
    const input = document.getElementById('dj-texto'), texto = input.value.trim(); if (!texto) return;
    const cal = calendarioSala(), act = turnoEn(cal, ahoraServidor()); if (!act || act.fase !== 'dibujo') return;
    input.value = '';
    post('/juegos/sala/' + sala.codigo + '/respuesta', { adivina: { turno: act.turno.i, texto } }).then(r => {
      if (r.ok && r.body.correcta) { sonidoOk(); mensaje('✅ ¡Correcto! +' + r.body.pts, 'ok'); return traerSala(); }
      if (r.ok) { sonidoMal(); mensaje(r.body.casi ? '🔥 ¡Casi! Escribe solo la palabra.' : '✘ No es «' + texto + '». ¡Sigue intentando!', 'bad'); return traerSala(); }
      mensaje(r.body.error === 'muy_rapido' ? '⏳ Espera un segundo entre intentos.' : r.body.error === 'turno_cerrado' ? 'Se acabó el turno.' : 'No se pudo enviar (' + (r.body.error || r.status) + ').', 'bad');
    });
  });

  g.SALAS_GRANDES.dibuja = { preparar: () => { sala.dj = null; return null; }, pintar, clic, nota: '🎨 De 3 a 12 personas, sin bots: cada quien dibuja una vez.' };

  // ---------- Inicio del juego y práctica individual ----------
  g.elegirDibuja = function () {
    const m = marco('dibuja', { menu: true });
    m.body.innerHTML = '<div class="q-card"><div class="big">🎨✏️</div><div class="q">Dibuja y adivina</div><div class="sub">Por turnos, alguien dibuja una palabra en inglés y los demás la adivinan escribiéndola. Se juega en partida, de 3 a 12 personas.</div></div>' +
      '<div class="row-btns"><button class="btn" data-dj-sala>👥 Crear partida</button><button class="btn ghost" data-dj-practica>🎯 Práctica: adivina el dibujo</button></div>' +
      '<div class="row-btns"><button class="btn ghost sm" data-ayuda="dibuja">📖 Cómo se juega</button></div>';
    m.body.addEventListener('click', e => {
      if (e.target.closest('[data-dj-practica]')) return practicar();
      if (e.target.closest('[data-dj-sala]')) {
        limpiar(); pantallaHub('partidas');
        const s = document.getElementById('p-juego');
        if (s) { s.value = 'dibuja'; s.dispatchEvent(new Event('change', { bubbles: true })); }
      }
    });
  };

  async function practicar() {
    const d = await datos('ingles');
    const pool = d.vocabulario.filter(v => /^[a-z]+( [a-z]+)?$/.test(v.en) && v.en.length >= 3 && v.en.length <= 14 && v.tema !== 'dias-meses');
    const lista = tomar(pool, 5), SEG = 20;
    const m = marco('dibuja');
    let i = 0, puntos = 0, aciertos = 0, stop = null, terminado = false, t0q = 0;
    const t0 = Date.now();
    m.body.innerHTML = '<div class="dj-cab"><div class="sub" id="dj-n"></div><div class="dj-huecos" id="dj-huecos"></div></div><div id="dj-lienzo-wrap"></div>' +
      '<form class="dj-form" id="dj-prac" autocomplete="off"><input id="dj-ptexto" maxlength="40" placeholder="Escribe en inglés…" autocapitalize="off" spellcheck="false" aria-label="Tu respuesta en inglés"><button class="btn" type="submit">Adivinar</button></form>' +
      '<div class="row-btns"><button class="btn ghost sm" data-dj-pasar>⏭️ Pasar</button></div><div class="feedback" id="dj-pmsg"></div>';
    const L = crearLienzo(document.getElementById('dj-lienzo-wrap'), 'solo-ver dj-practica');
    const chico = document.createElement('canvas'), cx = chico.getContext('2d');
    function dibujar(frac) { // de 4 a 48 «pixeles» según el tiempo que pasó
      const k = Math.round(4 + 44 * Math.min(1, frac)), w = lista[i];
      chico.width = chico.height = k; cx.fillStyle = '#fff'; cx.fillRect(0, 0, k, k);
      cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.font = Math.round(k * 0.82) + 'px serif'; cx.fillText(w.emoji, k / 2, k / 2 + k * 0.04);
      L.ctx.imageSmoothingEnabled = false; limpiarLienzo(L.ctx); L.ctx.drawImage(chico, 0, 0, k, k, 0, 0, 256, 256);
    }
    const fin = () => { terminado = true; terminar('dibuja', { puntos, aciertos, total: lista.length, segundos: (Date.now() - t0) / 1000, titulo: '🎨 ¡Práctica terminada!', detalle: 'Adivinaste ' + aciertos + ' de ' + lista.length + ' palabras en inglés.' }); };
    function siguiente(msg, cls) {
      if (stop) stop();
      if (msg) { const p = document.getElementById('dj-pmsg'); p.className = 'feedback ' + cls; p.textContent = msg; }
      if (i >= lista.length) return setTimeout(() => { if (!terminado) fin(); }, 1200);
      const w = lista[i]; t0q = Date.now();
      document.getElementById('dj-n').textContent = 'Palabra ' + (i + 1) + ' de ' + lista.length + ' · ¿qué es en inglés?';
      document.getElementById('dj-huecos').textContent = huecos(w.en.split(' ').map(x => x.length));
      stop = reloj(SEG, s => { m.tiempo(s, SEG); if (lista[i] === w) dibujar(1 - s / SEG); }, () => { i++; siguiente('⏰ Era «' + w.en + '» (' + w.es + ')', 'bad'); });
    }
    m.body.addEventListener('submit', e => {
      e.preventDefault(); if (terminado || i >= lista.length) return;
      const inp = document.getElementById('dj-ptexto'), w = lista[i];
      if (normalizar(inp.value) === normalizar(w.en) || normalizar(inp.value) === normalizar(w.en) + 's') {
        const gana = 100 + Math.round(100 * Math.max(0, 1 - (Date.now() - t0q) / (SEG * 1000 * TIEMPO)));
        puntos += gana; aciertos++; m.puntos(puntos); sonidoOk(); inp.value = ''; dibujar(1);
        i++; siguiente('✔ ¡Sí! ' + w.en + ' = ' + w.es + ' · +' + gana, 'ok');
      } else { sonidoMal(); const p = document.getElementById('dj-pmsg'); p.className = 'feedback bad'; p.textContent = '✘ Todavía no. ¡Mira bien!'; }
    });
    m.body.addEventListener('click', e => { if (e.target.closest('[data-dj-pasar]') && i < lista.length && !terminado) { const w = lista[i]; i++; siguiente('⏭️ Era «' + w.en + '» (' + w.es + ')', 'bad'); } });
    limpiezas.push(() => { terminado = true; });
    siguiente();
  }

  g.AYUDA_GRANDES.dibuja = '<h2>🎨 Dibuja y adivina</h2><p>Juego por turnos para <b>3 a 12 personas</b> que practica el vocabulario de inglés.</p>' +
    '<h3>Cómo se juega</h3><ol><li>En cada turno, una persona recibe una palabra en inglés (solo ella la ve) y la <b>dibuja</b> en el lienzo. ¡Sin escribir letras!</li>' +
    '<li>Las demás ven el dibujo en vivo y <b>escriben la palabra en inglés</b>. No importan mayúsculas ni acentos.</li><li>El turno dura 60 segundos o hasta que todas adivinen; luego se revela la palabra.</li><li>Cada quien dibuja una vez.</li></ol>' +
    '<h3>Puntos</h3><table><tr><td>Adivinar</td><td>de 100 a 200: más rápido, más puntos</td></tr><tr><td>Dibujar</td><td>50 por cada persona que adivina tu dibujo</td></tr></table>' +
    '<p>🎯 En la práctica individual, el dibujo se va aclarando poco a poco: adivina antes de que se vea completo.</p>';
})(globalThis);
