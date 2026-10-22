// Clase interactiva de Secundaria (?modo=secundaria; openspec: secundaria-sin-notion, requisito «Clase interactiva de
// Secundaria»). Al abrir una clase: pasos «1 Teoría → 2 Video → 3 Ejercicios → 4 Libreta» con indicador
// (aria-current="step"), videos de YouTube incrustados (youtube-nocookie, lazy) y la libreta con «✅ Ya la hice»
// (solo en este aparato). Al enviar: libreta y «Siguiente misión» en la pantalla de resultado. En Secundaria la clase se llama «Misión».
// Lo usan openItem y showResult (ingles/reproductor.js) solo en modo Secundaria; Inglés no cambia.

// Id de YouTube (11 caracteres) de watch?v=, youtu.be/, /embed/, /shorts/ o /live/; null si no es de YouTube.
function idYouTube(url) {
  let u;
  try { u = new URL(String(url || '')); } catch (e) { return null; }
  const host = u.hostname.replace(/^(www|m)\./, '');
  let id = null;
  if (host === 'youtu.be') id = u.pathname.slice(1).split('/')[0];
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    id = u.searchParams.get('v') || (u.pathname.match(/^\/(?:embed|shorts|live)\/([^/?#]+)/) || [])[1] || null;
  }
  return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
}

// Libreta hecha: por persona (hash del correo, sin el correo) y clase, en localStorage. Sin almacenamiento (modo
// privado, bloqueado), la casilla funciona pero no se recuerda.
const claveLibreta = id => 'stald_libreta:' + hashCorto(state.email || '') + ':' + id;
function libretaHecha(id) {
  try { return localStorage.getItem(claveLibreta(id)) === '1'; } catch (e) { return false; }
}
function marcarLibreta(id, hecha) {
  try {
    if (hecha) localStorage.setItem(claveLibreta(id), '1');
    else localStorage.removeItem(claveLibreta(id));
  } catch (e) { /* sin almacenamiento */ }
}

function bloqueLibreta(id, tips) {
  const tareas = (tips || []).filter(t => t.tipo === 'libreta' && t.texto);
  if (!tareas.length) return '';
  const hecha = libretaHecha(id);
  return '<ul class="teo-list sec-libreta-lista">' + tareas.map(t => '<li>📓 ' + escapeHtml(t.texto) + '</li>').join('') + '</ul>' +
    '<label class="sec-libreta-check' + (hecha ? ' hecha' : '') + '"><input type="checkbox" data-sec-libreta="' + escapeHtml(id) + '"' + (hecha ? ' checked' : '') + '> <span>✅ Ya la hice</span></label>';
}

const PASOS_CLASE = [['teoria', 'Teoría'], ['video', 'Video'], ['ejercicios', 'Ejercicios'], ['libreta', 'Libreta']];
const numPaso = n => '<span class="sec-paso-num" aria-hidden="true">' + n + '</span>';

// Solo enlaces http(s): nada de `javascript:` aunque venga en el contenido.
const esWeb = url => /^https?:\/\//i.test(String(url || ''));

function videosDeClase(tips) {
  const conUrl = (tips || []).filter(t => esWeb(t.url) && t.tipo !== 'libreta');
  const embebidos = conUrl.filter(t => t.tipo === 'video' && idYouTube(t.url));
  const enlaces = conUrl.filter(t => !embebidos.includes(t));
  const html = embebidos.map(t => '<figure class="sec-video"><div class="sec-video-marco">' +
      '<iframe src="https://www.youtube-nocookie.com/embed/' + idYouTube(t.url) + '" title="' + escapeHtml(t.texto || 'Video de la misión') + '" loading="lazy" ' +
      'allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe></div>' +
      '<figcaption>' + escapeHtml(t.texto || '') + ' <a class="link" href="https://www.youtube.com/watch?v=' + idYouTube(t.url) + '" target="_blank" rel="noopener">Abrir en YouTube ↗</a></figcaption></figure>').join('') +
    (enlaces.length ? '<div class="sec-enlaces">' + enlaces.map(t => '<a class="btn ghost" href="' + escapeHtml(t.url) + '" target="_blank" rel="noopener">' +
      (t.tipo === 'video' ? '▶️ ' : '📖 ') + escapeHtml(t.texto || 'Abrir') + ' ↗</a>').join('') + '</div>' : '');
  return { html, hay: !!(embebidos.length || enlaces.length) };
}

// ---------- Gamificación (reglas SOLO en comun/gamificacion.js; aquí no hay fórmulas) ----------
const hayGamificacion = () => typeof Gamificacion !== 'undefined' && !!Gamificacion.nivelDe;
const hoyDeAct = () => (state.act && state.act.hoy) || todayStr();
// Mundo actual de la materia de la misión (p. ej. «🔢 Valle de los Números · Aritmética»).
function mundoDeMision(m) {
  return hayGamificacion() && m ? Gamificacion.mundoDe(m.nombre, hoyDeAct()) : null;
}
// Recompensa de la misión: XP ganado (diferencia del XP total antes y después del envío), nivel y rango, barra del
// nivel e insignias desbloqueadas. Solo justo después del envío de ESA misión: `state.actAntes` = { id, act } lo guarda
// submitExam y se consume aquí (ver un resultado pasado no repite la recompensa).
function recompensaMision(id) {
  const envio = state.actAntes;
  state.actAntes = null;
  if (!envio || envio.id !== id) return '';
  const antes = envio.act, despues = state.act;
  if (!hayGamificacion() || !antes || !despues || antes.isAdmin || despues.isAdmin) return '';
  const hoy = despues.hoy || todayStr();
  const xpAntes = Gamificacion.xpTotal(antes.items, { hoy });
  const xpDespues = Gamificacion.xpTotal(despues.items, { hoy });
  const nA = Gamificacion.nivelDe(xpAntes), nD = Gamificacion.nivelDe(xpDespues);
  const nuevas = Gamificacion.insigniaNueva({ items: antes.items, hoy, racha: antes.racha }, { items: despues.items, hoy, racha: despues.racha });
  return '<section class="exam-card sec-recompensa" id="sec-recompensa" aria-live="polite">' +
    '<div class="sec-xp-ganado" data-sec-xp="' + Math.max(0, xpDespues - xpAntes) + '">+' + Math.max(0, xpDespues - xpAntes) + ' XP</div>' +
    '<div class="sec-nivel" data-sec-nivel="' + nD.nivel + '"><span class="sec-nivel-num">' + nD.nivel + '</span><span><b>Nivel ' + nD.nivel + '</b> · ' + escapeHtml(nD.rango) +
    (nD.nivel > nA.nivel ? ' <span class="chip fortaleza">⬆️ ¡Subiste de nivel!</span>' : '') + '</span></div>' +
    '<div class="sec-xp-barra" role="progressbar" aria-label="XP del nivel ' + nD.nivel + '" aria-valuemin="0" aria-valuemax="' + nD.porNivel + '" aria-valuenow="' + nD.xpNivel + '"><span style="width:' + nD.porcentaje + '%"></span></div>' +
    '<div class="meta">' + nD.xpNivel + ' / ' + nD.porNivel + ' XP para el nivel ' + (nD.nivel + 1) + '</div>' +
    (nuevas.length ? '<div class="sec-insignias" data-sec-insignias><b>🏅 ¡Insignia desbloqueada!</b>' + nuevas.map(i => '<span class="sec-insignia" title="' + escapeHtml(i.descripcion) + '">' + escapeHtml(i.emoji + ' ' + i.nombre) + '</span>').join('') + '</div>' : '') +
    '</section>';
}

// Vista completa de la clase. `cabecera` y `form` los arma el reproductor (los mismos que en Inglés).
function vistaClaseSecundaria(it, cabecera, form) {
  // Práctica de la teoría con revisión en el servidor (openspec: rpg-fase2-misiones; ingles/secundaria-misiones.js).
  const teoria = it.teoria && it.teoria.length ? renderTeoria(it.teoria) + (typeof practicaHtml === 'function' ? practicaHtml(it.teoria, { itemId: it.id }) : '') : '';
  const video = videosDeClase(it.tips);
  const libreta = bloqueLibreta(it.id, it.tips);
  const hay = { teoria: !!teoria, video: video.hay, ejercicios: true, libreta: !!libreta };
  const indicador = '<nav class="sec-pasos" aria-label="Pasos de la misión"><ol>' + PASOS_CLASE.map(([id, t], i) =>
    '<li><button type="button" class="sec-paso" data-sec-paso="' + id + '"' + (hay[id] ? '' : ' disabled') + '>' + numPaso(i + 1) +
    '<span>' + t + '</span>' + (hay[id] ? '' : '<span class="sr-only"> (sin contenido)</span>') + '</button></li>').join('') + '</ol></nav>';
  const seccion = (id, n, titulo, html) => '<section class="exam-card sec-paso-bloque" id="sec-paso-' + id + '" data-sec-bloque="' + id + '" aria-labelledby="sec-paso-t-' + id + '">' +
    '<h3 id="sec-paso-t-' + id + '">' + numPaso(n) + ' ' + titulo + '</h3>' + html + '</section>';
  const m = materiaDe(it);
  const mundo = mundoDeMision(m);
  const banner = '<div class="sec-mision-banner"><span class="sec-mision-tag">⚔️ Misión</span>' + chipMateria(m) +
    (mundo ? '<span class="sec-mundo" data-sec-mundo>' + escapeHtml(mundo.emoji + ' ' + mundo.nombre) + '<small> · ' + escapeHtml(mundo.etapa) + '</small></span>' : '') + '</div>';
  return '<div class="sec-clase-vista">' + banner + cabecera + indicador +
    (hay.teoria ? seccion('teoria', 1, '📖 Teoría', teoria) : '') +
    (hay.video ? seccion('video', 2, '🎬 Video', video.html) : '') +
    '<section class="sec-paso-bloque" id="sec-paso-ejercicios" data-sec-bloque="ejercicios" aria-labelledby="sec-paso-t-ejercicios">' +
    '<h3 class="sec-paso-tit" id="sec-paso-t-ejercicios">' + numPaso(3) + ' ✏️ Ejercicios</h3>' + form + '</section>' +
    (hay.libreta ? seccion('libreta', 4, '📓 Libreta', libreta + '<p class="meta">Hazla en tu libreta después de los ejercicios y márcala aquí.</p>') : '') + '</div>';
}

// Paso visible → aria-current="step" en el indicador (IntersectionObserver; sin él, queda el primero).
function activarPasosClase() {
  const botones = [...document.querySelectorAll('[data-sec-paso]')];
  const marcar = id => botones.forEach(b => {
    if (b.dataset.secPaso === id) b.setAttribute('aria-current', 'step');
    else b.removeAttribute('aria-current');
  });
  const primero = botones.find(b => !b.disabled);
  if (primero) marcar(primero.dataset.secPaso);
  if (state.obsPasos) { state.obsPasos.disconnect(); state.obsPasos = null; }
  if (!('IntersectionObserver' in window)) return;
  state.obsPasos = new IntersectionObserver(entradas => {
    const visible = entradas.filter(x => x.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
    if (visible) marcar(visible.target.dataset.secBloque);
  }, { rootMargin: '-30% 0px -60% 0px' });
  document.querySelectorAll('[data-sec-bloque]').forEach(s => state.obsPasos.observe(s));
}

// Siguiente clase: la siguiente sin completar (desde hoy, por fecha límite), sin contar la actual.
function siguienteClase(idActual) {
  const act = state.act;
  if (!act || act.isAdmin) return null;
  const hoy = act.hoy || todayStr();
  const pendientes = (act.items || []).filter(x => x.id !== idActual && (x.estado === 'disponible' || x.estado === 'en-curso'))
    .sort((a, b) => String(a.fechaLimite).localeCompare(String(b.fechaLimite)));
  return pendientes.find(x => x.fechaLimite >= hoy) || pendientes[0] || null;
}

// Extras de la pantalla de resultado en Secundaria: la libreta (si la clase la trae) y «Siguiente clase».
function extrasResultadoSecundaria(id) {
  const clase = state.claseAbierta && state.claseAbierta.id === id ? state.claseAbierta : null;
  const libreta = clase ? bloqueLibreta(id, clase.tips) : '';
  const sig = siguienteClase(id);
  const boton = sig
    ? '<button class="btn sec-siguiente" data-action="abrir-item" data-id="' + escapeHtml(sig.id) + '"><span>Siguiente misión →</span><small>' + escapeHtml(textoClase(sig, materiaDe(sig))) + '</small></button>'
    : '<button class="btn sec-siguiente" data-action="volver"><span>🗺️ Mis misiones</span><small>No tienes más misiones pendientes por ahora.</small></button>';
  return recompensaMision(id) + (libreta ? '<section class="exam-card sec-paso-bloque" id="sec-resultado-libreta"><h3>' + numPaso(4) + ' 📓 Libreta</h3>' + libreta + '</section>' : '') +
    '<div class="sec-resultado-acciones">' + boton + '</div>';
}

document.addEventListener('click', e => {
  const b = e.target.closest('[data-sec-paso]');
  if (!b || b.disabled) return;
  const destino = document.getElementById('sec-paso-' + b.dataset.secPaso);
  if (!destino) return;
  const suave = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  destino.scrollIntoView({ behavior: suave ? 'smooth' : 'auto', block: 'start' });
});
document.addEventListener('change', e => {
  const c = e.target.closest('[data-sec-libreta]');
  if (!c) return;
  marcarLibreta(c.dataset.secLibreta, c.checked);
  const l = c.closest('.sec-libreta-check');
  if (l) l.classList.toggle('hecha', c.checked);
});
