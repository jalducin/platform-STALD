// Inglés · tablero RPG y ranking de mi grupo (openspec: rpg-fase2-ingles).
// - Tablero (vista de alumnos y alumnas, «🏠 Inicio»): nivel, rango, XP, insignias y racha con comun/gamificacion.js
//   (`Gamificacion`) y la barra de ingles/secundaria-inicio.js (`barraRpg`). Solo dibuja; nada se guarda.
// - «🏆 Ranking de mi grupo»: solo si GET /gamificacion/perfil dice `ranking: true` (interruptor del profe, apagado por
//   defecto). Con el interruptor apagado no se dibuja nada: ni la tarjeta ni el botón para aparecer.
// - Admin: «🛡️ Nicks», la cola de moderación (aprobar o rechazar con motivo) y el interruptor del ranking.

// ---------- Tablero RPG ----------
function renderRpgIngles(act) {
  const G = window.Gamificacion;
  if (!G || typeof barraRpg !== 'function') return '';
  const hoy = (act && act.hoy) || todayStr();
  const items = ((act && act.items) || []).filter(conReto);
  const nivel = G.nivelDe(G.xpTotal(items, { hoy }));
  const logradas = insignias(act).filter(b => b.ok);
  const racha = (act && act.racha) || { dias: 0 };
  const mundo = G.mundoDe('ingles', hoy);
  return '<div class="rpg rpg-ingles" id="rpg-ingles">' + barraRpg(nivel, logradas, racha, insignias(act).length) +
    (mundo ? '<p class="rpg-mundo-linea" id="rpg-mundo"><span aria-hidden="true">' + mundo.emoji + '</span> Mundo actual: <b>' + escapeHtml(mundo.nombre) + '</b></p>' : '') +
    tarjetaRanking() + '</div>';
}
// «🏆 Ranking de mi grupo»: solo con el interruptor encendido; mientras llega, «Cargando…».
function tarjetaRanking() {
  if (!state.gam || !state.gam.ranking) return '';
  const cuerpo = state.rk ? '>' + htmlRanking(state.rk) : ' aria-busy="true"><h3 class="card-titulo" id="rk-titulo">🏆 Ranking de mi grupo</h3><div class="muted">Cargando…</div>';
  return '<section class="card rpg-ranking" id="rpg-ranking" aria-labelledby="rk-titulo"' + cuerpo + '</section>';
}

// ---------- Perfil y ranking (alumnos y alumnas) ----------
async function cargarPerfilGamificacion() {
  try {
    const r = await api(API_BASE + '/gamificacion/perfil' + '?email=' + encodeURIComponent(state.email));
    state.gam = r.ok && r.body && r.body.ranking === true ? r.body : null;
    state.rk = null;
  } catch (e) { state.gam = null; state.rk = null; /* sin ranking: el resto de la página sigue igual */ }
}

async function cargarRankingIngles(aviso) {
  if (!state.gam || !state.gam.ranking) return;
  let r;
  try { r = await api(API_BASE + '/gamificacion/ranking' + '?email=' + encodeURIComponent(state.email)); } catch (e) { r = { ok: false, status: 0, body: {} }; }
  const el = document.getElementById('rpg-ranking');
  if (r.status === 404) { state.gam = null; state.rk = null; if (el) el.remove(); return; } // el profe lo apagó
  state.rk = { ok: r.ok, body: r.body };
  if (!el) return;
  el.removeAttribute('aria-busy');
  el.innerHTML = htmlRanking(state.rk, aviso);
}
const htmlRanking = (rk, aviso) => '<h3 class="card-titulo" id="rk-titulo">🏆 Ranking de mi grupo</h3>' +
  (rk.ok ? cuerpoRanking(rk.body, aviso) : '<p class="muted" id="rk-error">El ranking no está disponible ahora. Lo demás de tu página sigue igual.</p>');

function estadoPropio(g) {
  const nick = g.nick ? '«' + escapeHtml(g.nick) + '»' : '';
  const juegos = '<a class="btn ghost" href="' + escapeHtml(conApiParam('juegos.html')) + '">🎮 Cambiar mi nick en Juegos</a>';
  const ocultar = '<button type="button" class="btn ghost" data-rk="ocultar">🙈 No aparecer</button>';
  if (!g.aparecer) {
    if (g.estadoNick === 'sin_nick') return '<p>Para aparecer necesitas un nick. Póntelo en Juegos, en «🎨 Tu avatar» → «✏️ Tu nick».</p><div class="rk-acciones">' + juegos.replace('Cambiar mi nick', 'Ponerme un nick') + '</div>';
    return '<p>Nadie ve tu nick en el ranking (así viene de inicio).</p><div class="rk-acciones"><button type="button" class="btn" data-rk="aparecer">🏆 Aparecer en el ranking</button></div>';
  }
  if (g.estadoNick === 'aprobado') return '<p>Tu nick ' + nick + ' aparece en el ranking de tu grupo.</p><div class="rk-acciones">' + ocultar + '</div>';
  if (g.estadoNick === 'rechazado') return '<p>El profe no aprobó tu nick ' + nick + (g.motivo ? ': ' + escapeHtml(g.motivo) : '.') + ' Elige otro en Juegos y aquí se vuelve a revisar.</p><div class="rk-acciones">' + juegos + ocultar + '</div>';
  if (g.estadoNick === 'sin_nick') return '<p>Quitaste tu nick en Juegos. Ponte uno para volver a aparecer.</p><div class="rk-acciones">' + juegos + ocultar + '</div>';
  return '<p>Tu nick ' + nick + ' está esperando que el profe lo apruebe. Mientras, no aparece.</p><div class="rk-acciones">' + ocultar + '</div>';
}

function cuerpoRanking(b, aviso) {
  const g = state.gam || {};
  const yo = b.yo || { posicion: 1, puntos: 0, visible: false };
  const lista = b.lista || [];
  const filas = lista.map(f => {
    const mio = yo.visible && f.nick === g.nick;
    return '<li class="rk-fila' + (mio ? ' rk-mia' : '') + '"' + (mio ? ' aria-current="true"' : '') + '><span class="rk-pos rpg-num">' + f.posicion + '</span><span class="rk-nick">' + escapeHtml(f.nick) + (mio ? ' <small>(tú)</small>' : '') + '</span><span class="rk-pts rpg-num">' + f.puntos + ' pts</span></li>';
  }).join('');
  return '<p class="muted rk-explica">Cuenta la constancia de esta semana (lunes a domingo): 10 puntos por actividad a tiempo y 5 si llega tarde. No cuenta calificaciones.</p>' +
    '<div class="rk-yo" id="rk-yo"><b>Tu lugar: ' + yo.posicion + '.º · ' + yo.puntos + ' pts</b>' + (yo.visible ? '' : ' <span class="muted">(solo tú lo ves)</span>') + '</div>' +
    (filas ? '<ol class="rk-lista" id="rk-lista">' + filas + '</ol>' : '<p class="muted" id="rk-vacio">Todavía nadie de tu grupo aparece en el ranking.</p>') +
    '<div id="rk-estado">' + estadoPropio(g) + '</div>' +
    '<div id="rk-msg" role="status" aria-live="polite">' + (aviso ? '<p class="rk-aviso">' + escapeHtml(aviso) + '</p>' : '') + '</div>';
}

function textoAparecer(aparecer, estado) {
  if (!aparecer) return 'Listo. Ya no apareces en el ranking.';
  return estado === 'aprobado' ? '¡Listo! Ya apareces.' : 'Listo. Tu nick aparecerá cuando el profe lo apruebe.';
}
const POST_TEXTO = { 'content-type': 'text/plain;charset=UTF-8' }; // sin verificación previa (openspec: ahorro-peticiones)

async function cambiarAparecer(aparecer, boton) {
  if (boton) boton.disabled = true;
  const r = await api(API_BASE + '/gamificacion/perfil?email=' + encodeURIComponent(state.email), { method: 'PUT', headers: POST_TEXTO, body: JSON.stringify({ aparecer }) });
  if (r.ok) { state.gam = r.body; return cargarRankingIngles(textoAparecer(aparecer, r.body.estadoNick)); }
  if (boton) boton.disabled = false;
  const msg = document.getElementById('rk-msg');
  const texto = (r.body && r.body.mensaje) || (r.status === 404 ? 'El ranking está apagado por ahora.' : 'No se pudo guardar. Intenta de nuevo.');
  if (msg) msg.innerHTML = '<p class="rk-aviso">' + escapeHtml(texto) + '</p>';
}

// ---------- Admin: «🛡️ Nicks» ----------
const ESTADO_NICK = { pendiente: '⏳ Pendiente', aprobado: '✅ Aprobado', rechazado: '⛔ Rechazado', sin_nick: '— Sin nick' };
const REVISION_NICK = { correo: 'parece un correo', telefono: 'parece un teléfono', nombre: 'incluye un nombre del registro', palabra: 'tiene una palabra bloqueada', caracteres: 'usa símbolos de otros alfabetos', repetido: 'otra persona usa el mismo nick' };

async function cargarNicksAdmin(aviso) {
  const q = state.grupoFiltro ? '&grupo=' + encodeURIComponent(state.grupoFiltro) : '';
  let r;
  try { r = await api(API_BASE + '/profe/nicks?email=' + encodeURIComponent(state.email) + q); } catch (e) { r = { ok: false, body: {} }; }
  state.nicks = r.ok ? r.body : { error: (r.body && r.body.error) || 'no_disponible' };
  const el = document.getElementById('nicks-admin');
  if (el) el.innerHTML = renderNicksAdmin(aviso);
}

// Interruptor general y, con un grupo elegido, el de ese grupo.
function interruptorRanking(n) {
  const sin = n.gruposSinRanking || [];
  const general = n.ranking
    ? { estado: 'encendido', texto: 'Alumnos y alumnas ven «🏆 Ranking de mi grupo».', boton: '<button type="button" class="btn ghost" data-nk="general" data-valor="false">⏸️ Apagar el ranking</button>' }
    : { estado: 'apagado', texto: 'Nadie ve nada del ranking, ni el botón para aparecer.', boton: '<button type="button" class="btn" data-nk="general" data-valor="true">▶️ Encender el ranking</button>' };
  let grupo = '';
  if (state.grupoFiltro) {
    const apagado = sin.includes(state.grupoFiltro);
    grupo = '<button type="button" class="btn ghost" data-nk="grupo" data-valor="' + (apagado ? 'false' : 'true') + '">' + (apagado ? '▶️ Prender en este grupo' : '⏸️ Apagar en este grupo') + '</button>';
  }
  return '<section class="card" id="rk-interruptor"><h3 class="card-titulo">🔌 Ranking de Inglés</h3>' +
    '<p>Interruptor general: <b id="rk-general">' + general.estado + '</b>. ' + general.texto + '</p>' +
    '<div class="rk-acciones">' + general.boton + grupo + '</div>' +
    (sin.length ? '<p class="muted">Apagado en: ' + sin.map(escapeHtml).join(', ') + '</p>' : '') + '</section>';
}

function filaNick(p) {
  const datos = ' data-alumno="' + escapeHtml(p.alumno) + '" data-nick="' + escapeHtml(p.nick || '') + '"';
  const detalle = [ESTADO_NICK[p.estado], p.aparecer ? 'pidió aparecer' : 'oculto'];
  if (p.revision) detalle.push('⚠️ ' + REVISION_NICK[p.revision]);
  if (p.motivo) detalle.push('motivo: ' + p.motivo);
  let botones = '';
  if (p.nick && p.estado !== 'aprobado' && !p.revision) botones += '<button type="button" class="btn sm" data-nk="aprobar"' + datos + '>✅ Aprobar</button>';
  if (p.nick && p.estado !== 'rechazado') botones += '<button type="button" class="btn ghost sm" data-nk="rechazar"' + datos + '>⛔ Rechazar</button>';
  const nick = p.nick ? '«' + escapeHtml(p.nick) + '»' : '<span class="muted">sin nick</span>';
  return '<li class="nk-fila" data-alumno="' + escapeHtml(p.alumno) + '"><div><b>' + escapeHtml(p.nombre) + '</b> · ' + nick +
    '<div class="s">' + escapeHtml(detalle.join(' · ')) + '</div></div>' + botones + '</li>';
}
const listaNicks = (lista, vacia) => lista.length ? '<ul class="nk-lista">' + lista.map(filaNick).join('') + '</ul>' : '<p class="muted">' + vacia + '</p>';

function renderNicksAdmin(aviso) {
  const n = state.nicks;
  if (!n) return esqueleto();
  if (n.error) return vacio('⚠️', 'La moderación de nicks no está disponible ahora.');
  const personas = n.personas || [];
  const cola = personas.filter(p => p.aparecer && p.estado === 'pendiente');
  return interruptorRanking(n) +
    '<section class="card" id="nk-cola"><h3 class="card-titulo">⏳ Por revisar (' + cola.length + ')</h3>' + listaNicks(cola, 'No hay nicks esperando revisión.') + '</section>' +
    // Grupos ocultos del panel (openspec: ingles-ocultar-grupos): fuera de «Todos los nicks»; «Por revisar» los conserva
    // para que ninguna petición de nick quede sin moderar.
    '<section class="card" id="nk-todos"><h3 class="card-titulo">👥 Todos los nicks</h3>' + listaNicks(personas.filter(p => state.mostrarOcultos || typeof gruposOcultos !== 'function' || !gruposOcultos().some(g => g.id === p.grupo)), 'Sin alumnos ni alumnas en este grupo.') + '</section>' +
    '<div id="nk-msg" role="status" aria-live="polite">' + (aviso ? '<p class="rk-aviso">' + escapeHtml(aviso) + '</p>' : '') + '</div>';
}

// Rechazar pide el motivo en la misma fila (lo verá quien pidió aparecer).
function pedirMotivo(b) {
  const fila = b.closest('.nk-fila');
  if (!fila || fila.querySelector('.nk-motivo')) return;
  const id = 'nk-motivo-' + b.dataset.alumno;
  fila.insertAdjacentHTML('beforeend', '<div class="nk-motivo"><label for="' + escapeHtml(id) + '">Motivo (lo verá quien lo pidió)</label>' +
    '<input id="' + escapeHtml(id) + '" class="campo" maxlength="200" value="Elige un nick sin nombres ni datos personales.">' +
    '<button type="button" class="btn sm" data-nk="rechazar-ok" data-alumno="' + escapeHtml(b.dataset.alumno) + '" data-nick="' + escapeHtml(b.dataset.nick) + '">Enviar</button></div>');
  document.getElementById(id).focus();
}

// Petición de cada botón de «🛡️ Nicks»; null si falta el motivo.
function peticionNick(b) {
  const tipo = b.dataset.nk;
  if (tipo === 'general') return { ruta: '/profe/ranking', body: { ranking: b.dataset.valor === 'true' } };
  if (tipo === 'grupo') return { ruta: '/profe/ranking', body: { grupo: state.grupoFiltro, apagado: b.dataset.valor === 'true' } };
  const body = { alumno: b.dataset.alumno, nick: b.dataset.nick };
  if (tipo === 'aprobar') return { ruta: '/profe/nicks/aprobar', body };
  const campo = document.getElementById('nk-motivo-' + b.dataset.alumno);
  body.motivo = campo ? campo.value.trim() : '';
  if (!body.motivo) { if (campo) campo.focus(); return null; }
  return { ruta: '/profe/nicks/rechazar', body };
}

async function accionNick(b) {
  if (b.dataset.nk === 'rechazar') return pedirMotivo(b);
  const p = peticionNick(b);
  if (!p) return;
  b.disabled = true;
  const r = await api(API_BASE + p.ruta + '?email=' + encodeURIComponent(state.email), { method: 'POST', headers: POST_TEXTO, body: JSON.stringify(p.body) });
  const error = (r.body && r.body.mensaje) || 'No se pudo: ' + ((r.body && r.body.error) || r.status);
  await cargarNicksAdmin(r.ok ? 'Listo.' : error);
}

contentEl.addEventListener('click', e => {
  const rk = e.target.closest('[data-rk]');
  if (rk) { e.preventDefault(); cambiarAparecer(rk.dataset.rk === 'aparecer', rk); return; }
  const nk = e.target.closest('[data-nk]');
  if (nk) { e.preventDefault(); accionNick(nk); }
});
