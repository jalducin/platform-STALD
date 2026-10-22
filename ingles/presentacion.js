// Inglés · guion de la clase y modo presentación para el Meet (solo admin).
// Guion de la clase del domingo (solo admin): retroalimentación automática + bloques de la clase.
// Sin alumnos y alumnas de grupos ocultos del panel (openspec: ingles-ocultar-grupos; ocultoEnPanel en admin.js).
const enPanel = nombre => typeof ocultoEnPanel !== 'function' || !ocultoEnPanel(nombre);
const resultadosEnPanel = it => (it.resultados || []).filter(r => enPanel(r.alumno));
function retroAlumnos() {
  const items = semanaItems(state.act).filter(i => i.tipo !== 'meet');
  const resumen = (state.act && state.act.resumen) || {};
  const diag = ((state.act && state.act.items) || []).find(i => i.id === 'diagnostico-a1');
  const nombres = [...new Set(((state.data && state.data.rows) || []).map(r => r.alumno).filter(Boolean))].filter(enPanel).sort((a, b) => a.localeCompare(b, 'es'));
  // Errores más comunes del grupo en la semana (por enunciado, en el mejor intento).
  const cuenta = new Map();
  items.forEach(it => resultadosEnPanel(it).forEach(r => ((r.mejor && r.mejor.revision) || []).forEach(x => cuenta.set(x.enunciado, (cuenta.get(x.enunciado) || 0) + 1))));
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

// Material de lectura del Meet para alumnos y alumnas (openspec: meet-sin-reto): teoría y tips de la clase, sin
// preguntas. Esa lectura es su actividad del domingo.
async function openMaterial(id) {
  entrarVista('material', id);
  contentEl.innerHTML = esqueleto();
  const r = await fetchJson(ACT_URL + '/' + encodeURIComponent(id) + '?email=' + encodeURIComponent(state.email));
  if (!r.ok) {
    const txt = r.body && r.body.error === 'no_disponible' ? 'El material se abre el ' + formatFecha(r.body.disponibleDesde) + '.' : 'No se pudo abrir el material.';
    contentEl.innerHTML = '<div class="exam-card"><div class="empty">' + escapeHtml(txt) + '</div>' + volverBtn() + '</div>';
    return;
  }
  const it = r.body;
  contentEl.innerHTML =
    '<div class="exam-card"><h3>📖 Material de la clase · ' + escapeHtml(it.titulo) + '</h3><div class="s" style="font-size:.86rem">' + escapeHtml(it.descripcion || '') + '</div>' +
    '<div class="s" style="font-size:.82rem;margin-top:6px">Léelo con calma y haz las tareas de libreta: esa es tu actividad de la clase.</div>' +
    (it.meetUrl ? '<div style="margin-top:8px"><a class="btn" href="' + escapeHtml(it.meetUrl) + '" target="_blank" rel="noopener">🎥 Unirme al Meet</a></div>' : '') + '</div>' +
    '<details class="section" open><summary><div class="section-head"><span><span class="chevron">▶</span>📖 Teoría</span><span class="count">' + (it.teoria || []).length + '</span></div></summary><div style="padding:8px">' + renderTeoria(it.teoria || []) + '</div></details>' +
    renderTips(it.tips) +
    '<div class="exam-bar">' + volverBtn() + '</div>';
  window.scrollTo(0, 0);
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
  const total = new Set(((state.data && state.data.rows) || []).map(r => r.alumno).filter(Boolean).filter(enPanel)).size || 5;
  const fuertes = new Map(), errores = new Map(), debiles = new Map();
  const stats = items.map(it => {
    const rs = resultadosEnPanel(it).filter(r => r.mejor);
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

// Diapositivas con diseño RPG (openspec: presentacion-cabe). Todo el tamaño va en `em` respecto al cuerpo de la
// diapositiva: así el ajuste automático (`--escala`, ver ajustarDiapositiva) reduce todo junto. Solo cambia la vista;
// el contenido sale tal cual de `presentacion.diapositivas` del Meet.
const ETIQUETAS = { agenda: '🗺️ Ruta de la misión', retro: '📊 Resultados del grupo', teoria: '📖 Teoría', practica: '⚔️ Reto', juego: '🏟️ Arena', reto: '📱 Reto en vivo', libreta: '📒 Tarea' };

function slideHtml(d, ctx) {
  const tono = TONOS[d.tipo] || 'indigo';
  const wrap = (titulo, cuerpo, extra) => '<div class="slide" data-tone="' + tono + '" data-tipo="' + escapeHtml(d.tipo) + '"><div class="slide-top">' +
    '<span class="slide-tag">' + escapeHtml(ETIQUETAS[d.tipo] || '🎬 Clase') + '</span><span class="slide-tit">' + escapeHtml(titulo) + '</span>' +
    '<small>' + escapeHtml(extra || ctx.titulo) + '</small></div><div class="slide-body">' + cuerpo + '</div></div>';
  const tarjetas = (xs, num, clase) => '<div class="s-grid' + (clase ? ' ' + clase : '') + '">' + xs.map((x, i) => '<div class="s-card"><span class="s-num">' + (num ? num(i) : i + 1) + '</span><span class="s-txt">' + escapeHtml(x) + '</span></div>').join('') + '</div>';
  if (d.tipo === 'portada' || d.tipo === 'cierre') {
    const portada = d.tipo === 'portada';
    const horaCtx = ctx.hora ? ' · ' + escapeHtml(ctx.hora) : '';
    return '<div class="slide hero" data-tone="' + tono + '" data-tipo="' + d.tipo + '"><div class="slide-body"><div class="hero-in">' +
      '<span class="hero-tag">' + (portada ? '⚔️ Misión de la semana' : '🏆 ¡Misión cumplida!') + '</span>' +
      '<div class="big-emoji">' + escapeHtml(d.emoji || (portada ? '🎥' : '🏆')) + '</div><h1>' + escapeHtml(d.titulo) + '</h1>' +
      (d.subtitulo ? '<h2>🌍 ' + escapeHtml(d.subtitulo) + '</h2>' : '') +
      '<div class="hero-pills">' + (d.texto ? '<span class="pill-hero">' + escapeHtml(d.texto) + '</span>' : '') +
      (portada ? '<span class="pill-hero">📅 ' + escapeHtml(formatFecha(ctx.fecha)) + horaCtx + '</span>' : '<span class="pill-hero">⭐ +XP para todo el grupo</span>') + '</div>' +
      '</div></div></div>';
  }
  if (d.tipo === 'agenda') {
    return wrap(d.titulo, '<ol class="s-ruta">' + (ctx.guion || []).map((b, i) => '<li class="s-paso"><span class="s-num">' + (i + 1) + '</span><span class="s-txt">' + escapeHtml(String(b.titulo).replace(/^\d+\.\s*/, '')) + '</span><span class="s-time">⏱ ' + escapeHtml(b.tiempo) + '</span></li>').join('') + '</ol>');
  }
  if (d.tipo === 'retro') {
    const g = retroGrupal();
    if (!g.stats.some(s => s.n)) return wrap(d.titulo, '<p class="s-lead">Esta semana arrancamos 💪 — hoy vemos juntos lo que viene.</p>');
    const cards = g.stats.map(s => '<div class="s-stat"><div class="n">' + (s.prom === null ? '—' : s.prom + '%') + '</div><div class="l">' + icono(s.it.tipo) + ' ' + escapeHtml(s.it.titulo) + '<br>' + s.n + ' de ' + g.total + ' entregas</div>' +
      '<div class="s-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + (s.prom || 0) + '"><span style="width:' + (s.prom || 0) + '%"></span></div></div>').join('');
    return wrap(d.titulo, '<div class="s-stats">' + cards + '</div>' +
      '<div class="s-grid"><div class="s-col"><h3>💪 Lo que el grupo ya domina</h3><ul>' + (g.fuertes.length ? g.fuertes.map(f => '<li>' + escapeHtml(f) + '</li>').join('') : '<li>¡Vamos por ello!</li>') + '</ul></div>' +
      '<div class="s-col"><h3>🎯 Lo que reforzamos hoy</h3><ul>' + (g.debiles.length ? g.debiles.map(e => '<li>' + escapeHtml(e) + '</li>').join('') : '<li>¡Todo en verde! 🎉</li>') + '</ul>' +
      (g.errores.length ? '<p class="s-nota">Pregunta más fallada: «' + escapeHtml(g.errores[0]) + '»</p>' : '') + '</div></div>', 'Resultados del grupo');
  }
  if (d.tipo === 'teoria') {
    const b = (ctx.teoria || [])[d.ref] || {};
    let c = '';
    if (b.texto) c += '<p class="s-lead">' + escapeHtml(b.texto) + '</p>';
    if (b.tabla) {
      const tabla = (filas) => '<div class="s-tabla"><table class="s-table"><thead><tr>' + b.tabla.columnas.map(x => '<th>' + escapeHtml(x) + '</th>').join('') + '</tr></thead><tbody>' + filas.map(f => '<tr>' + f.map(x => '<td>' + escapeHtml(x) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>';
      const fs = b.tabla.filas;
      // Más de 5 filas con 2 columnas: dos tablas lado a lado (en pantallas angostas se apilan, ver presentacion.css).
      c += fs.length > 5 && b.tabla.columnas.length <= 2
        ? '<div class="s-grid s-dos">' + tabla(fs.slice(0, Math.ceil(fs.length / 2))) + tabla(fs.slice(Math.ceil(fs.length / 2))) + '</div>'
        : tabla(fs);
    }
    if (b.ejemplos) c += '<div class="s-ex">' + b.ejemplos.map(e => '<div><span class="s-chip">EN</span><b>' + escapeHtml(e.en) + '</b><span class="s-es">' + escapeHtml(e.es) + '</span></div>').join('') + '</div>';
    if (b.puntos) c += '<ul class="s-points">' + b.puntos.map(x => '<li>' + escapeHtml(x) + '</li>').join('') + '</ul>';
    if (b.diagrama) c += renderDiagrama(b.diagrama);
    return wrap(b.titulo || '', c);
  }
  if (d.tipo === 'practica') {
    return wrap(d.titulo, (d.instrucciones ? '<p class="s-lead">' + escapeHtml(d.instrucciones) + '</p>' : '') + tarjetas(d.frases || [], null, 's-frases'));
  }
  if (d.tipo === 'juego') {
    return wrap(d.titulo, tarjetas(d.reglas || [], null, 's-lista'));
  }
  if (d.tipo === 'reto') {
    return wrap(d.titulo, '<div class="s-reto"><div class="s-lista-col">' + tarjetas(d.pasos || [], null, 's-lista') + '<div class="s-url">' + escapeHtml(d.url || '') + '</div></div>' +
      '<div class="s-qr-col"><div class="s-qr" id="deck-qr" data-url="' + escapeHtml(d.url || '') + '"></div></div></div>', '¡Desde tu celular!');
  }
  if (d.tipo === 'libreta') {
    const tips = (ctx.tips || []).filter(t => t.tipo === 'libreta');
    return wrap(d.titulo, tarjetas(tips.map(t => t.texto), () => '✓', 's-lista'), 'Tarea de la semana');
  }
  return wrap(d.titulo || '', '');
}

let qrLib = null;
function ensureQr(el, listo) {
  if (!el || el.dataset.done) return;
  const draw = () => { try { el.innerHTML = ''; new window.QRCode(el, { text: el.dataset.url, width: 256, height: 256, correctLevel: window.QRCode.CorrectLevel.M }); el.dataset.done = '1'; } catch { /* sin QR: se muestra el enlace */ el.textContent = el.dataset.url; } if (listo) listo(); };
  if (window.QRCode) return draw();
  if (!qrLib) {
    qrLib = new Promise((ok, fail) => { const sc = document.createElement('script'); sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js'; sc.onload = ok; sc.onerror = fail; document.head.appendChild(sc); });
  }
  qrLib.then(draw).catch(() => { el.textContent = el.dataset.url; if (listo) listo(); });
}

// ---------- Que todo quepa (openspec: presentacion-cabe) ----------
// 1) Se reduce `--escala` del cuerpo de la diapositiva hasta que el contenido cabe, sin bajar de LETRA_MIN px ni de
//    ESCALA_MIN. 2) Si aun así no cabe, el cuerpo queda con scroll (`.desborda`) y el aviso «⬇️ hay más · parte x/y»;
//    → / Espacio primero bajan una parte y luego pasan a la siguiente diapositiva (← / ↑ al revés).
const ESCALA_MIN = 0.7;
const LETRA_MIN = 14;
const cabe = el => el.scrollHeight <= el.clientHeight + 1 && el.scrollWidth <= el.clientWidth + 1;

function ajustarDiapositiva(slide) {
  const cuerpo = slide && slide.querySelector('.slide-body');
  if (!cuerpo) return;
  cuerpo.classList.remove('desborda');
  slide.style.setProperty('--escala', '1');
  const base = parseFloat(getComputedStyle(cuerpo).fontSize) || 16;
  const min = Math.min(1, Math.max(ESCALA_MIN, LETRA_MIN / base));
  let e = 1;
  // Búsqueda binaria de la escala más grande que cabe (≈ 6 pasos).
  if (!cabe(cuerpo) && min < 1) {
    let lo = min, hi = 1;
    for (let k = 0; k < 7; k++) {
      const m = (lo + hi) / 2;
      slide.style.setProperty('--escala', m.toFixed(3));
      if (cabe(cuerpo)) lo = m; else hi = m;
    }
    e = lo;
    slide.style.setProperty('--escala', e.toFixed(3));
  }
  if (!cabe(cuerpo)) cuerpo.classList.add('desborda');
  slide.dataset.escala = e.toFixed(2);
  avisoPartes(slide);
}

// Aviso de partes: cuántas «pantallas» tiene el cuerpo con scroll y en cuál va.
function avisoPartes(slide) {
  const cuerpo = slide.querySelector('.slide-body');
  let aviso = slide.querySelector('.slide-mas');
  if (!cuerpo || !cuerpo.classList.contains('desborda')) { if (aviso) aviso.remove(); return; }
  if (!aviso) {
    aviso = document.createElement('button');
    aviso.type = 'button'; aviso.className = 'slide-mas'; aviso.dataset.deck = 'mas';
    slide.appendChild(aviso);
  }
  const paso = cuerpo.clientHeight * 0.85;
  const total = Math.max(2, 1 + Math.ceil((cuerpo.scrollHeight - cuerpo.clientHeight) / paso));
  const alFinal = cuerpo.scrollTop + cuerpo.clientHeight >= cuerpo.scrollHeight - 2;
  const parte = alFinal ? total : Math.min(total - 1, 1 + Math.round(cuerpo.scrollTop / paso));
  aviso.textContent = alFinal ? '✅ Parte ' + parte + '/' + total + ' · → sigue' : '⬇️ Hay más · parte ' + parte + '/' + total;
  aviso.title = alFinal ? 'Regresar al inicio de la diapositiva' : 'Ver lo que sigue (↓ o →)';
  aviso.classList.toggle('al-final', alFinal);
}

// Desplaza el cuerpo una parte (dir = 1 abajo, -1 arriba). Devuelve true si se movió.
function moverParte(slide, dir) {
  const cuerpo = slide && slide.querySelector('.slide-body.desborda');
  if (!cuerpo) return false;
  const alFinal = cuerpo.scrollTop + cuerpo.clientHeight >= cuerpo.scrollHeight - 2;
  if ((dir > 0 && alFinal) || (dir < 0 && cuerpo.scrollTop <= 1)) return false;
  const suave = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  cuerpo.scrollBy({ top: dir * cuerpo.clientHeight * 0.85, behavior: suave ? 'smooth' : 'auto' });
  return true;
}

// Tema de la presentación: oscuro (pensado para proyector) o claro. Por omisión, el de la página.
function temaInicial() {
  try { const t = localStorage.getItem('stald_deck_tema'); if (t === 'claro' || t === 'oscuro') return t; } catch { /* sin almacenamiento */ }
  const pag = document.documentElement.dataset.theme;
  if (pag === 'light') return 'claro';
  if (pag === 'dark') return 'oscuro';
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'claro' : 'oscuro';
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
  deck.dataset.tema = temaInicial();
  deck.setAttribute('role', 'dialog');
  deck.setAttribute('aria-label', 'Presentación: ' + (it.titulo || ''));
  deck.innerHTML = '<div class="deck-stage" id="deck-stage" aria-live="polite"></div><div class="deck-bar">' +
    '<button class="deck-btn" data-deck="prev" title="Anterior (←)" aria-label="Diapositiva anterior">←<span class="deck-lbl"> Anterior</span></button>' +
    '<button class="deck-btn principal" data-deck="next" title="Siguiente (→)" aria-label="Siguiente diapositiva"><span class="deck-lbl">Siguiente </span>→</button>' +
    '<span class="rpg-contador deck-contador" id="deck-count"></span>' +
    '<div class="rpg-xp-barra deck-progress" role="progressbar" aria-label="Avance de la presentación" aria-valuemin="1" id="deck-progress"><span id="deck-prog"></span></div>' +
    '<button class="deck-btn" data-deck="tema" title="Modo claro u oscuro (T)" aria-label="Cambiar modo claro u oscuro"></button>' +
    '<button class="deck-btn" data-deck="full" title="Pantalla completa (F)" aria-label="Pantalla completa">⛶</button>' +
    '<button class="deck-btn" data-deck="exit" title="Salir (Esc)">✕<span class="deck-lbl"> Salir</span></button></div>';
  document.body.appendChild(deck);
  const stage = deck.querySelector('#deck-stage');
  const actual = () => stage.querySelector('.slide');
  const pintarTema = () => { deck.querySelector('[data-deck="tema"]').textContent = deck.dataset.tema === 'oscuro' ? '☀️' : '🌙'; };
  const show = () => {
    stage.innerHTML = slides[i];
    deck.querySelector('#deck-count').textContent = (i + 1) + ' / ' + slides.length;
    deck.querySelector('#deck-prog').style.width = ((i + 1) * 100 / slides.length) + '%';
    const pb = deck.querySelector('#deck-progress');
    pb.setAttribute('aria-valuemax', String(slides.length)); pb.setAttribute('aria-valuenow', String(i + 1));
    const s = actual();
    ajustarDiapositiva(s);
    const cuerpo = s.querySelector('.slide-body');
    if (cuerpo) cuerpo.addEventListener('scroll', () => avisoPartes(s), { passive: true });
    ensureQr(document.getElementById('deck-qr'), () => ajustarDiapositiva(actual()));
  };
  const go = (n) => { const j = Math.max(0, Math.min(slides.length - 1, n)); if (j !== i) { i = j; show(); } };
  const avanzar = () => { if (!moverParte(actual(), 1)) go(i + 1); };
  const retroceder = () => { if (!moverParte(actual(), -1)) go(i - 1); };
  const cambiarTema = () => {
    deck.dataset.tema = deck.dataset.tema === 'oscuro' ? 'claro' : 'oscuro';
    try { localStorage.setItem('stald_deck_tema', deck.dataset.tema); } catch { /* sin almacenamiento */ }
    pintarTema();
  };
  // Reajuste al cambiar el tamaño (pantalla completa, girar el celular, mover la ventana).
  let pendiente = 0;
  const reajustar = () => { cancelAnimationFrame(pendiente); pendiente = requestAnimationFrame(() => ajustarDiapositiva(actual())); };
  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(reajustar) : null;
  if (ro) ro.observe(stage); else window.addEventListener('resize', reajustar);
  const salir = () => { document.removeEventListener('keydown', onKey); if (ro) ro.disconnect(); else window.removeEventListener('resize', reajustar); if (document.fullscreenElement) { document.exitFullscreen().catch(() => {}); } deck.remove(); };
  const full = () => { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); else deck.requestFullscreen && deck.requestFullscreen().catch(() => {}); };
  function onKey(e) {
    if (['ArrowRight', 'PageDown', ' ', 'Enter'].includes(e.key)) { e.preventDefault(); avanzar(); }
    else if (['ArrowLeft', 'PageUp', 'Backspace'].includes(e.key)) { e.preventDefault(); retroceder(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); moverParte(actual(), 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); moverParte(actual(), -1); }
    else if (e.key === 'Home') go(0);
    else if (e.key === 'End') go(slides.length - 1);
    else if (e.key === 'f' || e.key === 'F') full();
    else if (e.key === 't' || e.key === 'T') cambiarTema();
    else if (e.key === 'Escape' && !document.fullscreenElement) salir();
  }
  document.addEventListener('keydown', onKey);
  deck.addEventListener('click', (e) => {
    const b = e.target.closest('[data-deck]');
    if (b) {
      const a = b.dataset.deck;
      if (a === 'prev') retroceder();
      else if (a === 'next') avanzar();
      else if (a === 'full') full();
      else if (a === 'tema') cambiarTema();
      else if (a === 'exit') salir();
      else if (a === 'mas') { const c = actual().querySelector('.slide-body'); if (!moverParte(actual(), 1) && c) c.scrollTo({ top: 0, behavior: 'smooth' }); }
      return;
    }
    // Un toque en la diapositiva avanza, salvo en tablas o diagramas con scroll propio.
    if (e.target.closest('.slide') && !e.target.closest('.s-tabla')) avanzar();
  });
  pintarTema();
  show();
}
