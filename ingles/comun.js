// Inglés · común (openspec: ingles-pro): configuración, api(), formato y componentes compartidos.
// Scripts clásicos (no módulos ES): comparten el ámbito global y ingles.html los carga en orden con defer.
// Backend: Deno Deploy (sin Supabase). Para pruebas locales se puede usar ?api=http://localhost:8000
const DEFAULT_API = 'https://stald.jalducin.deno.net';
const API_BASE = (new URLSearchParams(location.search).get('api') || DEFAULT_API).replace(/\/$/, '');
const DATA_URL_BASE = API_BASE + '/ingles/data';
// ?modo=profe → ruta de estudio del profe (solo admin, openspec: ruta-profe).
const MODO_PROFE = new URLSearchParams(location.search).get('modo') === 'profe';
// ?modo=secundaria → exámenes de Secundaria (openspec: examen-secundaria).
const MODO_SECUNDARIA = new URLSearchParams(location.search).get('modo') === 'secundaria';
const conApiParam = href => { const a = new URLSearchParams(location.search).get('api'); return a ? href + (href.includes('?') ? '&' : '?') + 'api=' + encodeURIComponent(a) : href; };
if (MODO_PROFE) {
  document.body.classList.add('profe');
  document.title = 'Mi ruta B1 → C1';
  document.getElementById('titulo').textContent = '🎓 Mi ruta B1 → C1';
  document.getElementById('subtitulo').textContent = 'Temas de estudio, práctica y 2 exámenes por semana. Solo tú la ves.';
}
if (MODO_SECUNDARIA) {
  document.body.classList.add('secundaria');
  document.title = 'Exámenes de Secundaria';
  document.getElementById('titulo').textContent = '📝 Exámenes de Secundaria';
  document.getElementById('subtitulo').textContent = 'Exámenes mensuales: tienes dos oportunidades y se queda tu mejor calificación.';
}
const STORAGE_KEY = 'ingles_email';
// Claves de sesión compartidas con el portal (index.html): solo el correo.
const SESSION_KEYS = ['stald_email', 'ingles_email', 'secundaria_email'];
// "← Inicio" y "🎮 Juegos" conservan ?api= (pruebas locales).
(() => { const api = new URLSearchParams(location.search).get('api'); const l = document.querySelector('.home-link'); if (api && l) l.href = './?api=' + encodeURIComponent(api); const g = document.querySelector('.games-link'); if (api && g) g.href = 'juegos.html?api=' + encodeURIComponent(api); })();

// Catálogo único de secciones (openspec: ingles-pro, design 2b): la barra inferior, las pestañas, el menú lateral
// y los encabezados de cada sección salen de aquí. `href` = enlace a otra página; `accion` = botón.
// `barra`: en celular, el admin ve esas 4 en la barra inferior y el resto en «☰ Más».
const SECCIONES = [
  { id: 'inicio', emoji: '🏠', titulo: 'Inicio', rol: 'alumno' },
  { id: 'semana', emoji: '📅', titulo: 'Semana', encabezado: 'Mi semana', rol: 'alumno' },
  { id: 'resultados', emoji: '⭐', titulo: 'Resultados', encabezado: 'Mis resultados', rol: 'alumno' },
  { id: 'juegos', emoji: '🎮', titulo: 'Juegos', rol: 'alumno', href: 'juegos.html' },
  { id: 'perfil', emoji: '👤', titulo: 'Perfil', encabezado: 'Mi perfil', rol: 'alumno' },
  { id: 'resumen', emoji: '🏠', titulo: 'Resumen', encabezado: 'Resumen del grupo', rol: 'admin', barra: true },
  { id: 'grupos', emoji: '👥', titulo: 'Grupos', rol: 'admin' },
  { id: 'alumnos', emoji: '🧑‍🎓', titulo: 'Alumnos', encabezado: 'Avance de alumnos y alumnas', rol: 'admin', barra: true },
  // Alta y administración (grupo, quitar) separadas del avance (openspec: ingles-menu-registro).
  { id: 'registro', emoji: '➕', titulo: 'Registro', encabezado: 'Registro de alumnos y alumnas', rol: 'admin' },
  { id: 'semana', emoji: '📅', titulo: 'Semana', encabezado: 'Esta semana', rol: 'admin', barra: true },
  { id: 'resultados', emoji: '⭐', titulo: 'Resultados', encabezado: 'Últimas calificaciones', rol: 'admin', barra: true },
  { id: 'presentar', emoji: '🎬', titulo: 'Presentar', encabezado: 'Presentar la clase', rol: 'admin' },
  { id: 'ruta', emoji: '🎓', titulo: 'Mi ruta', rol: 'admin', href: 'ingles.html?modo=profe' },
  { id: 'juegos', emoji: '🎮', titulo: 'Juegos', encabezado: 'Juegos de la semana', rol: 'admin' },
  { id: 'salir', emoji: '🚪', titulo: 'Salir', rol: 'admin', accion: 'salir' },
];
const seccionesDe = rol => SECCIONES.filter(s => s.rol === rol);
const seccion = (rol, id) => SECCIONES.find(s => s.rol === rol && s.id === id);
// Encabezado de una sección: el mismo emoji que su pestaña.
function encabezadoSeccion(rol, id) {
  const s = seccion(rol, id);
  return '<h2 class="sec-titulo" id="titulo-' + id + '"><span aria-hidden="true">' + s.emoji + '</span> ' + escapeHtml(s.encabezado || s.titulo) + '</h2>';
}
// Contenedor de una sección; el ruteo por hash muestra solo la actual.
const seccionHtml = (rol, id, cuerpo) => '<section class="seccion" data-seccion="' + id + '" aria-labelledby="titulo-' + id + '" hidden>' + encabezadoSeccion(rol, id) + cuerpo + '</section>';

const loginEl = document.getElementById('login');
const appEl = document.getElementById('app');
const emailInput = document.getElementById('email-input');
const loginBtn = document.getElementById('login-btn');
const loginError = document.getElementById('login-error');
const whoLabel = document.getElementById('who-label');
const logoutBtn = document.getElementById('logout-btn');
const contentEl = document.getElementById('content');
const navEl = document.getElementById('nav');
const cajonEl = document.getElementById('cajon');

function escapeHtml(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

// Días que cuentan como "realizadas recientes": hoy y los 2 anteriores.
const RECENT_DAYS = 3;

function fmtDate(d) { return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); }
function todayStr() { return fmtDate(new Date()); }
function daysAgoStr(n) { const d = new Date(); d.setDate(d.getDate() - n); return fmtDate(d); }
function diffDays(a, b) { return Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000); }
// Fecha local (AAAA-MM-DD) de la última edición; se usa como fecha de realización.
function localDateOf(iso) { if (!iso) return null; const d = new Date(iso); return isNaN(d) ? null : fmtDate(d); }

function formatFecha(fecha) {
  try { return new Date(fecha + 'T00:00:00').toLocaleDateString('es-MX', {weekday:'short', day:'numeric', month:'short'}); }
  catch (e) { return fecha; }
}

// Estado de cada clase respecto a hoy.
function classify(r, today) {
  if (r.completado) {
    const hecho = localDateOf(r.editadoEn);
    return { status: 'done', hecho, recent: !!hecho && hecho >= daysAgoStr(RECENT_DAYS - 1) };
  }
  if (!r.fecha) return { status: 'nodate' };
  if (r.fecha < today) return { status: 'overdue', diff: diffDays(r.fecha, today) };
  if (r.fecha === today) return { status: 'today' };
  return { status: 'upcoming', diff: diffDays(today, r.fecha) };
}

function badgeText(c) {
  if (c.status === 'done') return '✅ Hecho';
  if (c.status === 'overdue') return c.diff + 'd atraso';
  if (c.status === 'today') return '📌 Hoy';
  if (c.status === 'upcoming') return 'en ' + c.diff + 'd';
  return 'Sin fecha';
}

function renderRow(r) {
  const c = r._c;
  const parts = [];
  if (r.fecha) parts.push('<span class="fecha">📅 ' + escapeHtml(formatFecha(r.fecha)) + '</span>');
  if (c.status === 'done' && c.hecho) parts.push('<span>hecho ' + escapeHtml(formatFecha(c.hecho)) + '</span>');
  if (r.dificultad) parts.push('<span class="level">' + escapeHtml(r.dificultad) + '</span>');
  if (r.label) parts.push('<span>' + escapeHtml(r.label) + '</span>');
  if (r.calificacion) parts.push('<span class="grade">⭐ ' + escapeHtml(r.calificacion) + '</span>');
  return '<div class="row ' + c.status + '">' +
    '<span class="badge ' + c.status + '">' + badgeText(c) + '</span>' +
    '<div class="meta">' +
      '<div class="name">' + escapeHtml(r.name) + '</div>' +
      '<div class="row2">' + parts.join('') + '</div>' +
    '</div>' +
    rowAction(r) +
  '</div>';
}


// Agrupa en el orden pedido: realizadas recientes, atrasadas, hoy, próximas, y lo demás plegado.
function buildGroups(rows) {
  const today = todayStr();
  rows.forEach(r => { r._c = classify(r, today); });
  const byFecha = (a, b) => (a.fecha || '').localeCompare(b.fecha || '');
  const byHechoDesc = (a, b) => (b._c.hecho || '').localeCompare(a._c.hecho || '');
  const done = rows.filter(r => r._c.status === 'done');
  return {
    recent: done.filter(r => r._c.recent).sort(byHechoDesc),
    overdue: rows.filter(r => r._c.status === 'overdue').sort(byFecha),
    today: rows.filter(r => r._c.status === 'today').sort(byFecha),
    upcoming: rows.filter(r => r._c.status === 'upcoming').sort(byFecha),
    older: done.filter(r => !r._c.recent).sort(byHechoDesc),
    nodate: rows.filter(r => r._c.status === 'nodate'),
    // Los exámenes aparecen en las secciones pero no cuentan en el total de actividades.
    total: rows.filter(r => !r._examen).length,
    completed: done.filter(r => !r._examen).length,
  };
}

function section(title, items, opts) {
  const o = opts || {};
  const grupo = o.grupo ? ' data-grupo="' + o.grupo + '"' : '';
  if (!items.length && o.hideEmpty) return '';
  const body = items.length
    ? '<div class="scroll"><div class="list">' + items.map(renderRow).join('') + '</div></div>'
    : '<div class="empty">' + escapeHtml(o.empty || 'Nada por aquí.') + '</div>';
  const head = '<div class="section-head"><span>' + (o.collapsible ? '<span class="chevron">▶</span>' : '') + escapeHtml(title) + '</span><span class="count">' + items.length + '</span></div>';
  return o.collapsible
    ? '<details class="section"' + grupo + '><summary>' + head + '</summary>' + body + '</details>'
    : '<div class="section"' + grupo + '>' + head + body + '</div>';
}

function renderStats(g) {
  const pct = g.total ? Math.round(g.completed * 100 / g.total) : 0;
  const tarjeta = (cls, grupo, n, label) => '<button type="button" class="stat ' + cls + '" data-action="filtrar" data-grupo="' + grupo + '" aria-pressed="false" title="Ver solo: ' + label + '">' +
    '<div class="num">' + n + '</div><div class="label">' + label + '</div></button>';
  return '<div class="stats">' +
      tarjeta('done', 'recent', g.recent.length, 'Hechas 3 días') +
      tarjeta('overdue', 'overdue', g.overdue.length, 'Atrasadas') +
      tarjeta('today', 'today', g.today.length, 'Hoy') +
      tarjeta('upcoming', 'upcoming', g.upcoming.length, 'Próximas') +
    '</div>' +
    '<button type="button" class="ver-todo" data-action="ver-todo" hidden>✕ Ver todo</button>' +
    '<div class="progress-bar"><span style="width:' + pct + '%"></span></div>' +
    '<div class="progress-text">' + g.completed + '/' + g.total + ' completadas (' + pct + '%)</div>';
}

function renderBoard(rows) {
  const g = buildGroups(rows);
  return '<div class="board">' + renderStats(g) +
    section('✅ Realizadas · últimos 3 días', g.recent, { grupo: 'recent', empty: 'Aún no hay entregas en los últimos 3 días.' }) +
    section('⏰ Atrasadas', g.overdue, { grupo: 'overdue', empty: '¡Nada atrasado! 🎉' }) +
    section('📌 Hoy', g.today, { grupo: 'today', empty: 'No hay entrega para hoy.' }) +
    section('📅 Próximas', g.upcoming, { grupo: 'upcoming', empty: 'No hay entregas próximas.' }) +
    section('✔️ Realizadas anteriores', g.older, { grupo: 'older', collapsible: true, hideEmpty: true }) +
    section('🗒️ Sin fecha', g.nodate, { grupo: 'nodate', collapsible: true, hideEmpty: true }) + '</div>';
}

// Filtro por tarjeta: solo afecta a su tablero (en admin, a ese alumno o alumna). null = ver todo.
function aplicarFiltro(board, grupo) {
  board.querySelectorAll('.section[data-grupo]').forEach(sec => { sec.hidden = !!grupo && sec.dataset.grupo !== grupo; });
  board.querySelectorAll('button.stat[data-grupo]').forEach(t => t.setAttribute('aria-pressed', String(t.dataset.grupo === grupo)));
  const todo = board.querySelector('[data-action="ver-todo"]');
  if (todo) todo.hidden = !grupo;
}
// ---------- Actividades y exámenes (servidor: /ingles/actividades) ----------
const ACT_URL = API_BASE + (MODO_PROFE ? '/ingles/profe/actividades' : MODO_SECUNDARIA ? '/secundaria/actividades' : '/ingles/actividades');
const state = { email: null, data: null, act: null };

function isAdminView() { return !!(state.data && state.data.isAdmin); }
function icono(tipo) { return ({ actividad: '📘', refuerzo: '🎯', examen: '📝', meet: '🎥' })[tipo] || '📘'; }
function tipoTexto(tipo) { return ({ actividad: 'Actividad', refuerzo: 'Refuerzo', examen: 'Examen', meet: 'Repaso por Meet' })[tipo] || 'Actividad'; }

// Un elemento (actividad, examen, refuerzo, Meet) como fila del tablero.
function itemRow(it, estado, mejor, ultimoEnvio, intentosUsados) {
  const esMeet = it.tipo === 'meet';
  return {
    _item: it.id, _tipo: it.tipo, _estado: estado, _meetUrl: it.meetUrl, source: 'item',
    name: icono(it.tipo) + ' ' + it.titulo,
    label: tipoTexto(it.tipo) + (esMeet ? (it.hora ? ' · ' + it.hora : '') + (it.tieneReto ? ' · reto en vivo ' + (intentosUsados || 0) + '/' + it.intentosMax : it.tieneMaterial ? ' · material para leer' : '') : ' · ' + it.preguntas + ' ejercicios · ' + (intentosUsados || 0) + '/' + it.intentosMax + ' intento(s)'),
    dificultad: it.nivel,
    fecha: it.fechaLimite,
    // Con un intento enviado ya está hecha: la corrección (2.º intento) es opcional.
    completado: estado === 'completo' || (intentosUsados || 0) > 0 || (esMeet && !it.tieneReto && todayStr() > it.fechaLimite),
    calificacion: mejor ? mejor.porcentaje + '%' : null,
    editadoEn: ultimoEnvio || (esMeet ? it.fechaLimite + 'T23:00:00' : null),
    userNames: [],
  };
}
function itemRowsAlumno(act) {
  return ((act && act.items) || []).map(it => itemRow(it, it.estado, it.mejor, it.ultimoEnvio, it.intentosUsados));
}
function itemRowsAdmin(items, alumno) {
  return items.map(it => {
    const r = (it.resultados || []).find(x => x.alumno === alumno);
    const usados = r ? r.intentos.length : 0;
    const perfecto = it.tipo !== 'examen' && r && r.intentos.length && r.intentos[r.intentos.length - 1].calificacion.porcentaje === 100;
    const estado = it.tipo === 'meet' ? 'disponible' : (usados >= it.intentosMax || perfecto ? 'completo' : (usados ? 'en-curso' : 'disponible'));
    return itemRow(it, estado, r && r.mejor, r && r.intentos.length ? r.intentos[r.intentos.length - 1].enviadoEn : null, usados);
  });
}

function accionItem(it, estado) {
  if (it.tipo === 'meet') {
    const enlace = it.meetUrl ? '<a class="btn" href="' + escapeHtml(it.meetUrl) + '" target="_blank" rel="noopener">Unirme</a>' : '<span class="pill wait">Enlace por WhatsApp</span>';
    // Sin reto (openspec: meet-sin-reto): su actividad es leer el material de la clase.
    if (!it.tieneReto) return it.tieneMaterial && estado === 'disponible'
      ? '<span style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end">' + enlace + '<button class="btn ghost" data-action="abrir-material" data-id="' + escapeHtml(it.id) + '">📖 Material</button></span>'
      : enlace;
    let reto = '';
    if (estado === 'completo') reto = '<button class="btn ghost" data-action="ver-resultado" data-id="' + escapeHtml(it.id) + '">Ver reto</button>';
    else if (estado === 'en-curso') reto = '<button class="btn" data-action="abrir-item" data-id="' + escapeHtml(it.id) + '">Corregir reto</button>';
    else if (estado === 'disponible') reto = '<button class="btn" data-action="abrir-item" data-id="' + escapeHtml(it.id) + '">Reto en vivo</button>';
    return '<span style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end">' + enlace + reto + '</span>';
  }
  if (estado === 'completo') return '<button class="btn ghost" data-action="ver-resultado" data-id="' + escapeHtml(it.id) + '">Ver resultado</button>';
  // Examen con 2.ª oportunidad (openspec: examen-segunda-oportunidad): en espera hasta su fecha.
  if (estado === 'en-espera') return '<span style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end;align-items:center"><span class="pill wait">2.ª oportunidad ' + escapeHtml(formatFecha(it.segundaOportunidad)) + '</span><button class="btn ghost" data-action="ver-resultado" data-id="' + escapeHtml(it.id) + '">Ver resultado</button></span>';
  if (estado === 'en-curso') return '<button class="btn" data-action="abrir-item" data-id="' + escapeHtml(it.id) + '">' + (it.tipo === 'examen' ? (it.segundaOportunidad ? '2.ª oportunidad' : 'Reintentar') : 'Corregir errores') + '</button>';
  if (estado === 'disponible') return '<button class="btn" data-action="abrir-item" data-id="' + escapeHtml(it.id) + '">' + (it.tipo === 'examen' ? 'Resolver' : 'Empezar') + '</button>';
  return '<span class="pill wait">Abre ' + escapeHtml(formatFecha(it.disponibleDesde)) + '</span>';
}

// Acción de una fila del tablero: solo actividades en línea (Inglés ya no trae tareas de Notion; openspec: cierre-tecnico).
function rowAction(r) {
  if (!r._item || isAdminView()) return '';
  const it = ((state.act && state.act.items) || []).find(x => x.id === r._item);
  return it ? accionItem(it, it.estado) : '';
}

// Últimas calificaciones de un alumno o alumna: actividades y exámenes en línea (mejor intento, fecha del último
// envío). De la más reciente a la más antigua.
function ultimasCalificaciones(name, items, n = 5) {
  return items.map(it => ({ it, r: (it.resultados || []).find(r => r.alumno === name) }))
    .filter(x => x.r && x.r.mejor && x.r.intentos.length)
    .map(({ it, r }) => ({ icono: icono(it.tipo), titulo: it.titulo, valor: r.mejor.porcentaje + '%', pct: r.mejor.porcentaje, fecha: r.intentos[r.intentos.length - 1].enviadoEn }))
    .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha))).slice(0, n);
}
const claseNota = pct => pct === null ? 'neutra' : pct >= 80 ? 'fortaleza' : pct >= 60 ? 'en-progreso' : 'debilidad';
const fechaCorta = f => f ? new Date(f.length === 10 ? f + 'T12:00:00' : f).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }) : '';

function renderUltimasAdmin(names, items) {
  return '<details class="section" id="ultimas" open><summary><div class="section-head"><span><span class="chevron">▶</span>📊 Últimas calificaciones</span><span class="count">' + names.length + '</span></div></summary>' +
    '<div style="padding:4px 12px 10px"><div class="progress-text" style="margin:4px 0">Las 5 más recientes de cada alumno o alumna · en línea (mejor intento)</div>' +
    '<table class="ultimas-tabla"><tbody>' + names.map(name => {
      const u = ultimasCalificaciones(name, items);
      return '<tr data-alumno="' + escapeHtml(name) + '"><td>' + escapeHtml(name) + '</td><td>' + (u.length
        ? '<div class="chips">' + u.map(x => '<span class="chip ' + claseNota(x.pct) + '" data-fecha="' + escapeHtml(x.fecha) + '" title="' + escapeHtml(x.titulo + ' · ' + fechaCorta(x.fecha)) + '">' + escapeHtml(x.valor) + '</span>').join('') + '</div>'
        : '<span class="progress-text">—</span>') + '</td></tr>';
    }).join('') + '</tbody></table></div></details>';
}

function semanaItems(act) {
  if (!act || !act.semana) return [];
  const ids = new Set(act.semana.ids);
  return (act.items || []).filter(i => ids.has(i.id));
}

function filaSemana(it) {
  let sub = escapeHtml(formatFecha(it.fechaLimite)) + ' · ' + tipoTexto(it.tipo);
  if (it.tipo !== 'meet') sub += ' · ' + (it.intentosUsados || 0) + '/' + it.intentosMax + ' intento(s)';
  if (it.mejor) sub += ' · <span class="pill ok">⭐ ' + it.mejor.porcentaje + '%</span>';
  return '<div class="exam-item" data-fecha="' + escapeHtml(it.fechaLimite) + '"><div><div class="t">' + icono(it.tipo) + ' ' + escapeHtml(it.titulo) + '</div><div class="s">' + sub + '</div></div>' + accionItem(it, it.estado) + '</div>';
}
// «📌 Para ponerte al día» (openspec: semana-ponerse-al-dia): elementos de otras semanas cuya fecha (con prórroga)
// cae entre el lunes y el domingo de esta semana.
function alDiaItems(act) {
  if (!act || !act.semana) return [];
  const ids = new Set(act.semana.ids);
  const lunes = new Date((/^\d{4}-\d{2}-\d{2}$/.test(act.semana.id) ? act.semana.id : (act.hoy || todayStr())) + 'T12:00:00');
  lunes.setDate(lunes.getDate() - ((lunes.getDay() + 6) % 7));
  const domingo = new Date(lunes); domingo.setDate(domingo.getDate() + 6);
  const ini = fmtDate(lunes), fin = fmtDate(domingo);
  return (act.items || []).filter(i => !ids.has(i.id) && i.fechaLimite >= ini && i.fechaLimite <= fin)
    .sort((a, b) => a.fechaLimite.localeCompare(b.fechaLimite));
}
function renderWeekCard(act) {
  const lista = semanaItems(act), alDia = alDiaItems(act);
  if (!lista.length && !alDia.length) return '';
  return (lista.length ? '<div class="exam-card"><h3>📚 Esta semana · ' + escapeHtml(act.semana.titulo) + '</h3>' + lista.map(filaSemana).join('') + '</div>' : '') +
    (alDia.length ? '<div class="exam-card" id="al-dia"><h3>📌 Para ponerte al día</h3><div class="s" style="font-size:.82rem;margin-bottom:6px">De semanas anteriores, con fecha esta semana.</div>' + alDia.map(filaSemana).join('') + '</div>' : '');
}

function renderAdminWeek(act) {
  const lista = semanaItems(act);
  if (!lista.length) return '';
  return '<div class="exam-card"><h3>📚 Esta semana · ' + escapeHtml(act.semana.titulo) + '</h3>' + lista.map(it => {
    const n = (it.resultados || []).length;
    const sub = escapeHtml(formatFecha(it.fechaLimite)) + ' · ' + tipoTexto(it.tipo) + (it.tipo === 'meet' ? (it.meetUrl ? ' · con enlace' : ' · sin enlace (meetUrl)') : ' · ' + n + ' con intentos');
    let btn = it.tipo === 'meet' ? '' : '<button class="btn ghost" data-action="abrir-item" data-id="' + escapeHtml(it.id) + '">👁 Vista previa</button>';
    // Material del profe con o sin reto (openspec: meet-sin-reto); «👁 Reto» solo si lo hay.
    if (it.tipo === 'meet' && (it.tieneReto || it.tieneMaterial)) btn = '<span style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end"><button class="btn" data-action="presentar" data-id="' + escapeHtml(it.id) + '">🎬 Presentar</button><button class="btn ghost" data-action="abrir-guion" data-id="' + escapeHtml(it.id) + '">📋 Guion</button>' + (it.tieneReto ? '<button class="btn ghost" data-action="abrir-item" data-id="' + escapeHtml(it.id) + '">👁 Reto</button>' : '') + '</span>';
    return '<div class="exam-item"><div><div class="t">' + icono(it.tipo) + ' ' + escapeHtml(it.titulo) + '</div><div class="s">' + sub + '</div></div>' + btn + '</div>';
  }).join('') + '</div>';
}

function renderResultado(r, compacto) {
  const chips = (arr, cls) => arr.map(t => '<span class="chip ' + cls + '">' + escapeHtml(t) + '</span>').join('');
  let html = '';
  if (!compacto) {
    html += '<div class="score">' + anillo(r.porcentaje, '', claseNota(r.porcentaje)) + '<div><div class="big">' + r.porcentaje + '%</div>' +
      '<div class="progress-text" style="margin:4px 0 0">' + r.correctas + ' de ' + r.total + ' correctas</div>' +
      '<div class="lvl">' + escapeHtml(r.nivelSugerido) + '</div></div></div>';
    if (r.secciones.length) html += '<h3 class="card-titulo" style="margin-top:4px">📊 Resultado por tema</h3>';
  }
  if (r.fortalezas.length) html += '<div class="progress-text" style="margin:0">💪 Fortalezas</div><div class="chips">' + chips(r.fortalezas, 'fortaleza') + '</div>';
  if (r.enProgreso.length) html += '<div class="progress-text" style="margin:0">📈 En progreso</div><div class="chips">' + chips(r.enProgreso, 'en-progreso') + '</div>';
  if (r.debilidades.length) html += '<div class="progress-text" style="margin:0">🎯 A reforzar</div><div class="chips">' + chips(r.debilidades, 'debilidad') + '</div>';
  html += r.secciones.map(s =>
    '<div class="topic ' + s.estado + '"><div class="h"><span>' + escapeHtml(s.titulo) + '</span><span>' + s.correctas + '/' + s.total + ' · ' + s.porcentaje + '%</span></div>' +
    '<div class="bar"><span style="width:' + s.porcentaje + '%"></span></div><div class="r">' + escapeHtml(s.retroalimentacion) + '</div></div>'
  ).join('');
  if (r.revision && r.revision.length) {
    html += '<details class="section"' + (compacto ? '' : ' open') + '><summary><div class="section-head"><span><span class="chevron">▶</span>🔍 Revisa tus errores</span><span class="count">' + r.revision.length + '</span></div></summary><div class="scroll">' +
      r.revision.map(x => '<div class="rev"><div><b>' + escapeHtml(x.enunciado) + '</b></div>' +
        '<div class="bad">✗ ' + (x.tuRespuesta === null ? 'Sin responder' : escapeHtml(x.tuRespuesta)) + '</div>' +
        '<div class="good">✓ ' + escapeHtml(x.correcta) + '</div><div class="why">' + escapeHtml(x.explicacion) + '</div></div>').join('') +
      '</div></details>';
  } else {
    html += '<div class="empty">¡Sin errores! 🎉</div>';
  }
  return html;
}

function renderTeoria(teoria) {
  return (teoria || []).map(b => {
    let h = '<div class="topic"><div class="h"><span>' + escapeHtml(b.titulo || '') + '</span></div>';
    if (b.texto) h += '<div class="r" style="margin-top:6px;color:var(--text)">' + escapeHtml(b.texto) + '</div>';
    if (b.tabla) {
      h += '<div class="scroll" style="max-height:260px;padding:6px 0"><table class="teo"><thead><tr>' + b.tabla.columnas.map(c => '<th>' + escapeHtml(c) + '</th>').join('') + '</tr></thead><tbody>' +
        b.tabla.filas.map(f => '<tr>' + f.map(c => '<td>' + escapeHtml(c) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>';
    }
    if (b.puntos) h += '<ul class="teo-list">' + b.puntos.map(p => '<li>' + escapeHtml(p) + '</li>').join('') + '</ul>';
    if (b.ejemplos) h += '<ul class="teo-list">' + b.ejemplos.map(e => '<li><b>' + escapeHtml(e.en) + '</b> — ' + escapeHtml(e.es) + '</li>').join('') + '</ul>';
    return h + '</div>';
  }).join('');
}

function renderTips(tips) {
  if (!tips || !tips.length) return '';
  return '<details class="section"><summary><div class="section-head"><span><span class="chevron">▶</span>💡 Tips extra</span><span class="count">' + tips.length + '</span></div></summary><div class="scroll"><ul class="teo-list">' +
    tips.map(t => '<li>' + (t.tipo === 'video' ? '▶️ ' : '📓 ') + (t.url ? '<a class="link" href="' + escapeHtml(t.url) + '" target="_blank" rel="noopener">' + escapeHtml(t.texto) + '</a>' : escapeHtml(t.texto)) + '</li>').join('') +
    '</ul></div></details>';
}

// Única salida de peticiones de la página (openspec: ingles-pro). Sprint 3 (plataforma-login): aquí se agrega el
// encabezado Authorization con el token de sesión; ninguna otra función llama a fetch() directamente.
// Todas las peticiones salen por aquí: con sesión mandan Authorization: Bearer (openspec: plataforma-login).
// Si el servidor dice que la sesión no sirve, la página regresa a la pantalla de entrada (sesionVencida, app.js).
// Con StaldAuth sale por pedirJson (openspec: cache-estabilidad): GET iguales en vuelo se juntan, las lecturas se
// reintentan ante fallas pasajeras, los envíos vacían la caché y, sin red, responde status 0 en lugar de lanzar.
async function api(url, opts, cfg) {
  if (window.StaldAuth && StaldAuth.pedirJson) {
    const r = await StaldAuth.pedirJson(url, opts, cfg);
    if (StaldAuth.esSesionVencida({ status: r.status }, r.body) && typeof sesionVencida === 'function') sesionVencida(r.body);
    return r;
  }
  const res = await fetch(url, opts || {});
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}
const fetchJson = api; // nombre anterior, usado en todo el código


// Anillo de progreso (SVG): porcentaje 0–100, texto pequeño debajo y tono (fortaleza / en-progreso / debilidad).
function anillo(pct, etiqueta, tono) {
  const r = 34, c = 2 * Math.PI * r, p = Math.max(0, Math.min(100, Number(pct) || 0));
  const color = tono === 'debilidad' ? 'var(--bad)' : tono === 'en-progreso' ? 'var(--warn)' : 'var(--ok)';
  return '<div class="anillo" role="img" aria-label="' + escapeHtml(p + ' %' + (etiqueta ? ' ' + etiqueta : '')) + '"><svg viewBox="0 0 80 80" aria-hidden="true">' +
    '<circle class="pista" cx="40" cy="40" r="' + r + '" fill="none" stroke-width="8"/>' +
    '<circle class="valor" cx="40" cy="40" r="' + r + '" fill="none" stroke-width="8" style="stroke:' + color + '" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + (c * (1 - p / 100)).toFixed(1) + '"/></svg>' +
    '<div class="centro" aria-hidden="true"><span>' + p + '%' + (etiqueta ? '<small>' + escapeHtml(etiqueta) + '</small>' : '') + '</span></div></div>';
}
const vacio = (emoji, texto) => '<div class="vacio"><span class="grande" aria-hidden="true">' + emoji + '</span>' + escapeHtml(texto) + '</div>';
const esqueleto = () => '<div class="esqueleto" aria-busy="true" aria-label="Cargando"><i></i><i></i><i></i><span class="sr-only">Cargando…</span></div>';
const iniciales = n => String(n || '?').trim().split(/\s+/).slice(0, 2).map(x => x[0] || '').join('').toUpperCase() || '?';
