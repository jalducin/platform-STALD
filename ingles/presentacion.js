// Inglés · guion de la clase y modo presentación para el Meet (solo admin).
// Guion de la clase del domingo (solo admin): retroalimentación automática + bloques de la clase.
function retroAlumnos() {
  const items = semanaItems(state.act).filter(i => i.tipo !== 'meet');
  const resumen = (state.act && state.act.resumen) || {};
  const diag = ((state.act && state.act.items) || []).find(i => i.id === 'diagnostico-a1');
  const nombres = [...new Set(((state.data && state.data.rows) || []).map(r => r.alumno).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));
  // Errores más comunes del grupo en la semana (por enunciado, en el mejor intento).
  const cuenta = new Map();
  items.forEach(it => (it.resultados || []).forEach(r => ((r.mejor && r.mejor.revision) || []).forEach(x => cuenta.set(x.enunciado, (cuenta.get(x.enunciado) || 0) + 1))));
  const comunes = [...cuenta].sort((a, b) => b[1] - a[1]).slice(0, 5);
  let html = '<div class="exam-card"><h3>👥 Errores más comunes del grupo (esta semana)</h3>' +
    (comunes.length ? '<ul class="teo-list">' + comunes.map(([e, n]) => '<li>' + escapeHtml(e) + ' <span class="pill wait">' + n + '</span></li>').join('') + '</ul>' : '<div class="s">Aún no hay intentos esta semana.</div>') + '</div>';
  html += nombres.map(name => {
    const notas = items.map(it => { const r = (it.resultados || []).find(x => x.alumno === name); return icono(it.tipo) + ' ' + escapeHtml(it.titulo) + ': <b>' + (r && r.mejor ? r.mejor.porcentaje + '%' : '—') + '</b>'; });
    const d = diag && (diag.resultados || []).find(x => x.alumno === name);
    const temas = (resumen[name] && resumen[name].temasAReforzar) || [];
    const fuertes = new Set();
    items.forEach(it => (it.resultados || []).filter(x => x.alumno === name).forEach(r => ((r.mejor && r.mejor.fortalezas) || []).forEach(f => fuertes.add(f))));
    return '<div class="topic"><div class="h"><span>👤 ' + escapeHtml(name) + '</span><span>📝 ' + (d && d.mejor ? d.mejor.porcentaje + '%' : '—') + '</span></div>' +
      '<ul class="teo-list">' + notas.map(n => '<li>' + n + '</li>').join('') + '</ul>' +
      (fuertes.size ? '<div class="chips">' + [...fuertes].map(t => '<span class="chip fortaleza">💪 ' + escapeHtml(t) + '</span>').join('') + '</div>' : '') +
      (temas.length ? '<div class="chips">' + temas.map(t => '<span class="chip ' + t.estado + '">🎯 ' + escapeHtml(t.titulo) + '</span>').join('') + '</div>' : '') + '</div>';
  }).join('');
  return html;
}

async function openGuion(id) {
  entrarVista('guion', id);
  contentEl.innerHTML = esqueleto();
  const r = await fetchJson(ACT_URL + '/' + encodeURIComponent(id) + '?email=' + encodeURIComponent(state.email));
  if (!r.ok || !r.body.guion) { contentEl.innerHTML = '<div class="exam-card"><div class="empty">No se pudo abrir el guion.</div>' + volverBtn() + '</div>'; return; }
  const it = r.body;
  const bloques = it.guion.map(b => '<div class="topic"><div class="h"><span>' + escapeHtml(b.titulo) + '</span><span class="pill wait">' + escapeHtml(b.tiempo) + '</span></div>' +
    (b.objetivo ? '<div class="r">🎯 ' + escapeHtml(b.objetivo) + '</div>' : '') +
    '<ul class="teo-list">' + (b.pasos || []).map(p => '<li>' + escapeHtml(p) + '</li>').join('') + '</ul></div>').join('');
  contentEl.innerHTML =
    '<div class="exam-card"><h3>📋 Guion de clase · ' + escapeHtml(it.titulo) + '</h3><div class="s" style="font-size:.82rem">' + escapeHtml(it.descripcion || '') + '</div>' +
    '<div class="s" style="font-size:.8rem;margin-top:4px">' + escapeHtml(formatFecha(it.fechaLimite)) + (it.hora ? ' · ' + escapeHtml(it.hora) : '') + (it.meetUrl ? ' · <a class="link" href="' + escapeHtml(it.meetUrl) + '" target="_blank" rel="noopener">Abrir Meet</a>' : ' · enlace pendiente') + '</div></div>' +
    '<details class="section" open><summary><div class="section-head"><span><span class="chevron">▶</span>1️⃣ Retroalimentación por alumno o alumna</span></div></summary><div style="padding:8px">' + retroAlumnos() + '</div></details>' +
    '<details class="section" open><summary><div class="section-head"><span><span class="chevron">▶</span>🗒️ Bloques de la clase</span><span class="count">' + it.guion.length + '</span></div></summary><div style="padding:8px">' + bloques + '</div></details>' +
    '<details class="section"><summary><div class="section-head"><span><span class="chevron">▶</span>📖 Teoría para compartir en pantalla</span><span class="count">' + it.teoria.length + '</span></div></summary><div style="padding:8px">' + renderTeoria(it.teoria) + '</div></details>' +
    renderTips(it.tips) +
    '<div class="exam-bar">' + volverBtn() + '<span style="display:flex;gap:6px">' + (it.tieneReto ? '<button class="btn ghost" data-action="abrir-item" data-id="' + escapeHtml(it.id) + '">👁 Probar el reto</button>' : '') + '<button class="btn" data-action="presentar" data-id="' + escapeHtml(it.id) + '">🎬 Presentar</button></span></div>';
  window.scrollTo(0, 0);
}

// ---------- Modo presentación para el Meet (solo admin) ----------
const TONOS = { portada: 'indigo', agenda: 'indigo', retro: 'amber', teoria: 'blue', practica: 'green', juego: 'pink', reto: 'orange', libreta: 'teal', cierre: 'indigo' };

// Retroalimentación grupal, sin nombres: promedio del mejor intento, entregas, fortalezas y errores comunes.
function retroGrupal() {
  const items = semanaItems(state.act).filter(i => i.tipo !== 'meet');
  const total = new Set(((state.data && state.data.rows) || []).map(r => r.alumno).filter(Boolean)).size || 5;
  const fuertes = new Map(), errores = new Map(), debiles = new Map();
  const stats = items.map(it => {
    const rs = (it.resultados || []).filter(r => r.mejor);
    rs.forEach(r => {
      (r.mejor.fortalezas || []).forEach(f => fuertes.set(f, (fuertes.get(f) || 0) + 1));
      (r.mejor.debilidades || []).forEach(f => debiles.set(f, (debiles.get(f) || 0) + 2));
      (r.mejor.enProgreso || []).forEach(f => debiles.set(f, (debiles.get(f) || 0) + 1));
      (r.mejor.revision || []).forEach(x => errores.set(x.enunciado, (errores.get(x.enunciado) || 0) + 1));
    });
    const prom = rs.length ? Math.round(rs.reduce((a, r) => a + r.mejor.porcentaje, 0) / rs.length) : null;
    return { it, prom, n: rs.length };
  });
  const top = (m, k) => [...m].sort((a, b) => b[1] - a[1]).slice(0, k).map(x => x[0]);
  // Para proyectar: se omiten preguntas que mencionan a alguien del grupo (p. ej. «Pronombre para "Marisol"»).
  const nombres = [...new Set(((state.data && state.data.rows) || []).map(r => r.alumno).filter(Boolean))];
  const sinNombres = new Map([...errores].filter(([e]) => !nombres.some(n => e.includes(n))));
  return { stats, total, fuertes: top(fuertes, 3), debiles: top(debiles, 3), errores: top(sinNombres, 1) };
}

function slideHtml(d, ctx) {
  const tono = TONOS[d.tipo] || 'indigo';
  const wrap = (titulo, cuerpo, extra) => '<div class="slide" data-tone="' + tono + '"><div class="slide-top"><span>' + escapeHtml(titulo) + '</span><small>' + escapeHtml(extra || ctx.titulo) + '</small></div><div class="slide-body">' + cuerpo + '</div></div>';
  if (d.tipo === 'portada' || d.tipo === 'cierre') {
    return '<div class="slide hero" data-tone="' + tono + '"><div class="big-emoji">' + escapeHtml(d.emoji || '🎥') + '</div><h1>' + escapeHtml(d.titulo) + '</h1>' +
      (d.subtitulo ? '<h2>' + escapeHtml(d.subtitulo) + '</h2>' : '') + (d.texto ? '<div class="pill-hero">' + escapeHtml(d.texto) + '</div>' : '') +
      (d.tipo === 'portada' ? '<div class="pill-hero">' + escapeHtml(formatFecha(ctx.fecha)) + (ctx.hora ? ' · ' + escapeHtml(ctx.hora) : '') + '</div>' : '') + '</div>';
  }
  if (d.tipo === 'agenda') {
    return wrap(d.titulo, '<div class="s-grid">' + (ctx.guion || []).map((b, i) => '<div class="s-card"><span class="s-num">' + (i + 1) + '</span><span>' + escapeHtml(String(b.titulo).replace(/^\d+\.\s*/, '')) + '</span><span class="s-time">' + escapeHtml(b.tiempo) + '</span></div>').join('') + '</div>');
  }
  if (d.tipo === 'retro') {
    const g = retroGrupal();
    if (!g.stats.some(s => s.n)) return wrap(d.titulo, '<p class="s-lead">Esta semana arrancamos 💪 — hoy vemos juntos lo que viene.</p>');
    const cards = g.stats.map(s => '<div class="s-stat"><div class="n">' + (s.prom === null ? '—' : s.prom + '%') + '</div><div class="l">' + icono(s.it.tipo) + ' ' + escapeHtml(s.it.titulo) + '<br>' + s.n + ' de ' + g.total + ' entregas</div>' +
      '<div class="s-bar"><span style="width:' + (s.prom || 0) + '%"></span></div></div>').join('');
    return wrap(d.titulo, '<div style="display:grid;grid-template-columns:repeat(' + Math.min(4, g.stats.length) + ',1fr);gap:1.4cqw">' + cards + '</div>' +
      '<div class="s-grid"><div class="s-col"><h3>💪 Lo que el grupo ya domina</h3><ul>' + (g.fuertes.length ? g.fuertes.map(f => '<li>' + escapeHtml(f) + '</li>').join('') : '<li>¡Vamos por ello!</li>') + '</ul></div>' +
      '<div class="s-col"><h3>🎯 Lo que reforzamos hoy</h3><ul>' + (g.debiles.length ? g.debiles.map(e => '<li>' + escapeHtml(e) + '</li>').join('') : '<li>¡Todo en verde! 🎉</li>') + '</ul>' +
      (g.errores.length ? '<p style="font-size:1.7cqw;color:#78716c;margin-top:1cqw">Pregunta más fallada: «' + escapeHtml(g.errores[0]) + '»</p>' : '') + '</div></div>', 'Resultados del grupo');
  }
  if (d.tipo === 'teoria') {
    const b = (ctx.teoria || [])[d.ref] || {};
    let c = '';
    if (b.texto) c += '<p class="s-lead">' + escapeHtml(b.texto) + '</p>';
    if (b.tabla) {
      const tabla = (filas) => '<table class="s-table"><thead><tr>' + b.tabla.columnas.map(x => '<th>' + escapeHtml(x) + '</th>').join('') + '</tr></thead><tbody>' + filas.map(f => '<tr>' + f.map(x => '<td>' + escapeHtml(x) + '</td>').join('') + '</tr>').join('') + '</tbody></table>';
      const fs = b.tabla.filas;
      // Más de 5 filas con 2 columnas: se parte en dos tablas lado a lado para que quepa sin cortarse.
      c += fs.length > 5 && b.tabla.columnas.length <= 2
        ? '<div class="s-grid" style="align-items:start">' + tabla(fs.slice(0, Math.ceil(fs.length / 2))) + tabla(fs.slice(Math.ceil(fs.length / 2))) + '</div>'
        : tabla(fs);
    }
    if (b.ejemplos) c += '<div class="s-ex">' + b.ejemplos.map(e => '<div><b>' + escapeHtml(e.en) + '</b>' + escapeHtml(e.es) + '</div>').join('') + '</div>';
    if (b.puntos) c += '<ul class="s-points">' + b.puntos.map(x => '<li>' + escapeHtml(x) + '</li>').join('') + '</ul>';
    return wrap(b.titulo || '', c);
  }
  if (d.tipo === 'practica') {
    return wrap(d.titulo, '<p class="s-lead">' + escapeHtml(d.instrucciones || '') + '</p><div class="s-grid">' + (d.frases || []).map((f, i) => '<div class="s-card"><span class="s-num">' + (i + 1) + '</span><b style="font-size:2.6cqw">' + escapeHtml(f) + '</b></div>').join('') + '</div>');
  }
  if (d.tipo === 'juego') {
    return wrap(d.titulo, '<div style="display:flex;flex-direction:column;gap:1.2cqw">' + (d.reglas || []).map((r, i) => '<div class="s-card"><span class="s-num">' + (i + 1) + '</span><span style="font-size:2.5cqw">' + escapeHtml(r) + '</span></div>').join('') + '</div>');
  }
  if (d.tipo === 'reto') {
    return wrap(d.titulo, '<div style="display:grid;grid-template-columns:1.3fr 1fr;gap:3cqw;align-items:center;height:100%">' +
      '<div style="display:flex;flex-direction:column;gap:1.2cqw">' + (d.pasos || []).map((p, i) => '<div class="s-card"><span class="s-num">' + (i + 1) + '</span><span style="font-size:2.4cqw">' + escapeHtml(p) + '</span></div>').join('') + '<div class="s-url">' + escapeHtml(d.url || '') + '</div></div>' +
      '<div style="display:flex;justify-content:center"><div class="s-qr" id="deck-qr" data-url="' + escapeHtml(d.url || '') + '"></div></div></div>', '¡Desde tu celular!');
  }
  if (d.tipo === 'libreta') {
    const tips = (ctx.tips || []).filter(t => t.tipo === 'libreta');
    return wrap(d.titulo, '<div style="display:flex;flex-direction:column;gap:1.1cqw">' + tips.map((t, i) => '<div class="s-card"><span class="s-num">✓</span><span style="font-size:2.2cqw">' + escapeHtml(t.texto) + '</span></div>').join('') + '</div>', 'Tarea de la semana');
  }
  return wrap(d.titulo || '', '');
}

let qrLib = null;
function ensureQr(el) {
  if (!el || el.dataset.done) return;
  const draw = () => { try { el.innerHTML = ''; new window.QRCode(el, { text: el.dataset.url, width: 256, height: 256, correctLevel: window.QRCode.CorrectLevel.M }); el.dataset.done = '1'; } catch (e) { el.textContent = el.dataset.url; } };
  if (window.QRCode) return draw();
  if (!qrLib) {
    qrLib = new Promise((ok, fail) => { const sc = document.createElement('script'); sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js'; sc.onload = ok; sc.onerror = fail; document.head.appendChild(sc); });
  }
  qrLib.then(draw).catch(() => { el.textContent = el.dataset.url; });
}

async function openPresentacion(id) {
  const r = await fetchJson(ACT_URL + '/' + encodeURIComponent(id) + '?email=' + encodeURIComponent(state.email));
  const it = r.body || {};
  const diapos = (it.presentacion && it.presentacion.diapositivas) || [];
  if (!r.ok || !diapos.length) { alert('Esta clase no tiene presentación.'); return; }
  const ctx = { titulo: it.titulo, fecha: it.fechaLimite, hora: it.hora, guion: it.guion, teoria: it.teoria, tips: it.tips };
  const slides = diapos.map(d => slideHtml(d, ctx));
  let i = 0;
  const deck = document.createElement('div');
  deck.className = 'deck';
  deck.innerHTML = '<div class="deck-stage" id="deck-stage"></div><div class="deck-bar">' +
    '<button data-deck="prev" title="Anterior (←)">←</button><button data-deck="next" title="Siguiente (→)">→</button>' +
    '<span id="deck-count"></span><div class="deck-progress"><span id="deck-prog"></span></div>' +
    '<button data-deck="full" title="Pantalla completa (F)">⛶</button><button data-deck="exit" title="Salir (Esc)">✕ Salir</button></div>';
  document.body.appendChild(deck);
  const show = () => {
    document.getElementById('deck-stage').innerHTML = slides[i];
    document.getElementById('deck-count').textContent = (i + 1) + ' / ' + slides.length;
    document.getElementById('deck-prog').style.width = ((i + 1) * 100 / slides.length) + '%';
    ensureQr(document.getElementById('deck-qr'));
  };
  const go = (n) => { i = Math.max(0, Math.min(slides.length - 1, n)); show(); };
  const salir = () => { document.removeEventListener('keydown', onKey); if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); deck.remove(); };
  const full = () => { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); else deck.requestFullscreen && deck.requestFullscreen().catch(() => {}); };
  function onKey(e) {
    if (['ArrowRight', 'PageDown', ' ', 'Enter'].includes(e.key)) { e.preventDefault(); go(i + 1); }
    else if (['ArrowLeft', 'PageUp', 'Backspace'].includes(e.key)) { e.preventDefault(); go(i - 1); }
    else if (e.key === 'Home') go(0);
    else if (e.key === 'End') go(slides.length - 1);
    else if (e.key === 'f' || e.key === 'F') full();
    else if (e.key === 'Escape' && !document.fullscreenElement) salir();
  }
  document.addEventListener('keydown', onKey);
  deck.addEventListener('click', (e) => {
    const b = e.target.closest('[data-deck]');
    if (b) { const a = b.dataset.deck; if (a === 'prev') go(i - 1); if (a === 'next') go(i + 1); if (a === 'full') full(); if (a === 'exit') salir(); return; }
    if (e.target.closest('.slide')) go(i + 1);
  });
  show();
}
