// Inglés · tablero del profe (openspec: ingles-pro): vista del admin por secciones, indicadores y mapa de calor
// (GET /ingles/resumen) y cajón del alumno o alumna con prórroga, reinicio y cambio de grupo.

function renderAdmin(data) {
  const rows = data.rows || [];
  // Un bloque plegable por alumno o alumna del registro (filas de identidad, sin tarea). Inglés ya no trae tareas
  // de Notion (openspec: cierre-tecnico, fase 2): su tablero sale de las actividades en línea.
  const items = (state.act && state.act.items) || [];
  const resumen = (state.act && state.act.resumen) || {};
  const diag = items.find(i => i.id === 'diagnostico-a1');
  const names = [...new Set(rows.filter(r => r.source === 'registro' && r.alumno).map(r => r.alumno))].sort((a, b) => a.localeCompare(b, 'es')).filter(n => !ocultoEnPanel(n) && (!state.grupoFiltro || (grupoDeNombre(n) || {}).id === state.grupoFiltro));
  const bloques = names.map(name => {
    const filas = itemRowsAdmin(items, name);
    const g = buildGroups(filas);
    const resDiag = diag && (diag.resultados || []).find(r => r.alumno === name);
    const temas = (resumen[name] && resumen[name].temasAReforzar) || [];
    const suyos = items.map(it => ({ it, r: (it.resultados || []).find(r => r.alumno === name) })).filter(x => x.r);
    const u = ultimasCalificaciones(name, items);
    return '<details class="student" data-alumno="' + escapeHtml(name) + '" style="--gc:' + escapeHtml((grupoDeNombre(name) || {}).color || '#4f46e5') + '">' +
      '<summary><span>👤 ' + escapeHtml(name) + ' ' + chipGrupo(grupoDeNombre(name)) + '</span>' +
        '<span class="mini"><span>' + g.completed + '/' + g.total + '</span>' +
        '<span class="o">⏰ ' + g.overdue.length + '</span><span class="t">📌 ' + g.today.length + '</span>' +
        '<span title="Diagnóstico">📝 ' + (resDiag && resDiag.mejor ? resDiag.mejor.porcentaje + '%' : 'pendiente') + '</span>' +
        '<span class="o" title="Temas a reforzar">🎯 ' + temas.length + '</span></span></summary>' +
      '<div class="student-body">' +
        '<button type="button" class="btn ghost sm" data-action="cajon" data-alumno="' + escapeHtml(name) + '" style="margin:4px 0 8px">🔎 Detalle y acciones</button>' +
        huecoJuegos(name) +
        (u.length ? '<div class="ultimas-lista"><div class="progress-text" style="margin:4px 0 2px">🗓️ Últimas 5 calificaciones</div>' +
          u.map(x => '<div>• ' + x.icono + ' ' + escapeHtml(x.titulo) + ' · <span class="chip ' + claseNota(x.pct) + '">' + escapeHtml(x.valor) + '</span> · ' + escapeHtml(fechaCorta(x.fecha)) + '</div>').join('') + '</div>' : '') +
        (temas.length ? '<div class="progress-text" style="margin:4px 0 2px">🎯 Temas a reforzar (para armar su clase)</div><div class="chips">' +
          temas.map(t => '<span class="chip ' + t.estado + '" title="' + escapeHtml(t.fuente) + '">' + escapeHtml(t.titulo) + '</span>').join('') + '</div>' : '') +
        suyos.map(({ it, r }) => '<details class="section"><summary><div class="section-head"><span><span class="chevron">▶</span>' + icono(it.tipo) + ' ' + escapeHtml(it.titulo) +
          ' · ' + (r.mejor ? r.mejor.porcentaje + '%' : '—') + '</span><span class="count">' + r.intentos.length + '/' + it.intentosMax + ' intento(s)</span></div></summary><div class="scroll">' +
          (r.intentos.length > 1 ? '<div class="progress-text">Intentos: ' + r.intentos.map(x => x.calificacion.porcentaje + '%').join(' → ') + ' · cuenta el mejor</div>' : '') +
          (r.mejor ? renderResultado(r.mejor, true) : '') + '</div></details>').join('') +
        renderBoard(filas) +
      '</div>' +
    '</details>';
  }).join('');
  return renderFiltroGrupo() +
    seccionHtml('admin', 'resumen', renderPanelProfe() + '<div id="tablero" aria-live="polite">' + renderTablero() + '</div>') +
    seccionHtml('admin', 'grupos', renderGruposAdmin() || (fallaPanel('grupos') ? avisosPanel() : vacio('👥', 'Los grupos se activan cuando Inglés usa la base de datos.'))) +
    seccionHtml('admin', 'alumnos', bloques || vacio('🧑‍🎓', 'Aún no hay alumnos ni alumnas en este grupo. Dalos de alta en ➕ Registro.')) +
    seccionHtml('admin', 'registro', renderAlumnosAdmin()) +
    seccionHtml('admin', 'semana', renderAdminWeek(state.act) || vacio('📅', 'Sin actividades esta semana.')) +
    seccionHtml('admin', 'resultados', renderUltimasAdmin(names, items)) +
    seccionHtml('admin', 'material', renderMaterial()) +
    seccionHtml('admin', 'presentar', renderPresentar()) +
    seccionHtml('admin', 'juegos', renderJuegosAdmin() + '<a class="btn ghost" href="' + escapeHtml(conApiParam('juegos.html')) + '">🎮 Abrir Juegos</a>') +
    seccionHtml('admin', 'nicks', '<div id="nicks-admin" aria-live="polite">' + renderNicksAdmin() + '</div>') +
    seccionHtml('admin', 'entregas', seccionEntregasIngles());
}

// Clases por Meet: la de esta semana y las anteriores, para presentarlas a grupos nuevos (openspec: presentar-anteriores).
function renderPresentar() {
  const deSemana = new Set(semanaItems(state.act).map(it => it.id));
  const meets = ((state.act && state.act.items) || []).filter(it => it.tipo === 'meet');
  const semana = meets.filter(it => deSemana.has(it.id));
  const anteriores = meets.filter(it => !deSemana.has(it.id)).sort((a, b) => b.fechaLimite.localeCompare(a.fechaLimite));
  const fila = it => {
    const abrirMeet = it.meetUrl ? '<a class="btn ghost" href="' + escapeHtml(it.meetUrl) + '" target="_blank" rel="noopener">🎥 Abrir Meet</a>' : '';
    const btn = it.tieneReto || it.tieneMaterial // material del profe con o sin reto (openspec: meet-sin-reto)
      ? '<span style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end"><button class="btn" data-action="presentar" data-id="' + escapeHtml(it.id) + '">🎬 Presentar</button><button class="btn ghost" data-action="abrir-guion" data-id="' + escapeHtml(it.id) + '">📋 Guion</button></span>'
      : abrirMeet;
    return '<div class="exam-item"><div><div class="t">🎥 ' + escapeHtml(it.titulo) + '</div><div class="s">' + escapeHtml(formatFecha(it.fechaLimite)) + (it.hora ? ' · ' + escapeHtml(it.hora) : '') + '</div></div>' + btn + '</div>';
  };
  return '<div class="exam-card" id="pres-semana"><h3>📅 Esta semana</h3>' + (semana.length ? semana.map(fila).join('') : '<div class="empty">No hay clase por Meet esta semana.</div>') + '</div>' +
    (anteriores.length ? '<div class="exam-card" id="pres-anteriores"><h3>📚 Clases anteriores (' + anteriores.length + ')</h3>' +
      '<p class="progress-text" style="margin:0 0 6px">Para un grupo nuevo, empieza por la primera clase (la de más abajo).</p>' + anteriores.map(fila).join('') + '</div>' : '');
}

// ---------- Encabezado del panel (openspec: ingles-diseno-profe) ----------
// Solo con datos que ya existen: grupos activos (/ingles/grupos), alumnos y alumnas del registro (/ingles/alumnos) y
// quienes van en riesgo según el resumen de la semana (/ingles/resumen): sin entregas o con alguna atrasada; y las
// misiones de Inglés listas para evaluar (bandeja /profe/entregas).
function alumnosEnRiesgo() {
  const r = state.resumen;
  if (!r || r.error) return null;
  const m = new Map();
  for (const n of r.kpis.sinEntregas) m.set(n, { nombre: n, atrasos: 0, sinEntregas: true });
  for (const f of r.filas) {
    const atrasos = Object.values(f.celdas).filter(c => c.estado === 'atrasado').length;
    if (atrasos) m.set(f.alumno, { ...(m.get(f.alumno) || { nombre: f.alumno, sinEntregas: false }), atrasos });
  }
  return [...m.values()].sort((a, b) => b.atrasos - a.atrasos || a.nombre.localeCompare(b.nombre, 'es'));
}
const ppStat = (ico, valor, texto, cls) => '<div class="pp-stat' + (cls ? ' ' + cls : '') + '"><span class="pp-stat-ico" aria-hidden="true">' + ico + '</span><span class="pp-stat-txt"><b class="pp-num rpg-num">' + valor + '</b><span class="pp-stat-t">' + texto + '</span></span></div>';
// Mosaico «En riesgo»: «…» mientras llega el resumen; sin mosaico si el resumen falló (el tablero ya lo avisa).
function ppTileRiesgo(riesgo) {
  if (riesgo) return riesgo.length ? ppStat('🚨', riesgo.length, 'En riesgo', 'riesgo') : ppStat('🛡️', 0, 'En riesgo', 'sin-riesgo');
  return state.resumen && state.resumen.error ? '' : ppStat('🚨', '…', 'En riesgo', '');
}
function ppListaRiesgo(riesgo) {
  if (!riesgo || !riesgo.length) return '';
  return '<div class="pp-riesgo" id="pp-riesgo"><p class="pp-riesgo-t">🚨 Sin entregas o con atrasos esta semana</p><div class="pp-riesgo-lista">' +
    riesgo.map(x => '<button type="button" class="btn ghost" data-action="cajon" data-alumno="' + escapeHtml(x.nombre) + '">' + escapeHtml(x.nombre) + ' · ' + (x.atrasos ? '⏰ ' + x.atrasos : '😴 sin entregas') + '</button>').join('') + '</div></div>';
}
// Grupos activos que se ven en el panel: sin los ocultos (openspec: ingles-ocultar-grupos), salvo con el interruptor.
const gruposDelPanel = () => gruposActivos().filter(g => !g.ocultoAdmin || state.mostrarOcultos);
// «📥 Por revisar» y el contador de «📥 Entregas» de la barra usan el MISMO dato (openspec: panel-profe-peticiones):
// entregas de misiones listas para evaluar, Inglés + Secundaria (la bandeja las junta), sin filtrar por grupo. Sale de
// la bandeja (/profe/entregas) si ya se cargó al abrir «📥 Entregas» (más fresca tras evaluar) y, si no, del conteo del
// panel (`entregas` de /ingles/data?incluir=panel). Sin ninguno de los dos (o si falló), null: sin mosaico ni contador.
function conteoEntregas() {
  const b = state.secBandeja;
  if (b && !b.error && Array.isArray(b.entregas)) {
    const listas = b.entregas.filter(x => x.estado === 'lista');
    const de = a => listas.filter(x => x.mision && x.mision.ambito === a).length;
    return { pendientes: listas.length, ingles: de('ingles'), secundaria: de('secundaria') };
  }
  const p = state.panelEntregas;
  return p && Number.isFinite(p.pendientes) ? p : null;
}
function ppTilePorRevisar() {
  const c = conteoEntregas();
  if (!c) return '';
  const n = c.pendientes, desglose = 'Inglés ' + (c.ingles || 0) + ' · Secundaria ' + (c.secundaria || 0);
  return '<a class="pp-stat-link" href="#entregas" aria-label="' + n + ' entregas por revisar (' + desglose + '). Abrir Entregas">' +
    ppStat('📥', n, 'Por revisar<small class="pp-desglose">' + desglose + '</small>', n ? 'riesgo' : 'sin-riesgo') + '</a>';
}
function renderPanelProfe() {
  const filtro = state.grupoFiltro && state.grupos ? (state.grupos.grupos || []).find(g => g.id === state.grupoFiltro) : null;
  // Con un grupo elegido, todo el encabezado es de ese grupo (el resumen ya viene filtrado).
  const activos = state.grupos && !filtro ? gruposDelPanel().length : null;
  const enAlcance = x => !x.baja && (filtro ? (grupoDeNombre(x.nombre) || {}).id === filtro.id : !ocultoEnPanel(x.nombre));
  const registro = Array.isArray(state.alumnosAdmin) ? state.alumnosAdmin.filter(enAlcance).length : null;
  const riesgo = alumnosEnRiesgo();
  const hoy = (state.act && state.act.hoy) || todayStr();
  const fecha = new Date(hoy + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
  return '<section class="pp-hero" id="panel-profe" aria-labelledby="pp-hero-t">' +
    '<div class="pp-hero-top"><span class="rpg-etiqueta">🛡️ Panel del profe</span><span class="sec-fecha">' + escapeHtml(fecha) + '</span></div>' +
    '<h3 class="pp-hero-t" id="pp-hero-t">' + (filtro ? '👥 ' + escapeHtml(filtro.nombre) : '👥 Todos los grupos') + '</h3>' +
    '<div class="pp-stats" id="pp-stats">' +
      (activos === null ? '' : ppStat('👥', activos, activos === 1 ? 'Grupo activo' : 'Grupos activos')) +
      (registro === null ? '' : ppStat('🧑‍🎓', registro, registro === 1 ? 'Alumno o alumna' : 'Alumnos y alumnas')) +
      ppTileRiesgo(riesgo) + ppTilePorRevisar() + '</div>' + ppListaRiesgo(riesgo) + avisosPanel() +
    '<div class="pp-acciones"><a class="btn" href="#registro">➕ Registrar alumno o alumna</a><a class="btn ghost" href="#presentar">🎬 Presentar la clase</a>' +
      '<a class="btn ghost" href="' + escapeHtml(conApiParam('ingles.html?modo=profe')) + '">🎓 Mi ruta</a></div></section>';
}
function pintarPanelProfe() {
  const h = document.getElementById('panel-profe');
  if (h) h.outerHTML = renderPanelProfe();
}

// Tarjetas por grupo con el avance de la semana (entregadas / que ya abrieron), del mismo resumen. Sin resumen (falló
// o aún carga) las tarjetas salen igual, con «—», para que «👁️ Ocultar del panel» siempre esté a la mano
// (openspec: fix-ingles-admin). Con el interruptor, los grupos ocultos salen marcados con «Mostrar en el panel».
function renderTarjetasGrupo(r) {
  if (!state.grupos) return '';
  r = r && Array.isArray(r.filas) ? r : { filas: [], columnas: [], grupo: state.grupoFiltro ? { id: state.grupoFiltro } : null };
  const lista = gruposDelPanel().filter(g => !r.grupo || g.id === r.grupo.id);
  if (!lista.length) return '';
  const registro = Array.isArray(state.alumnosAdmin) ? state.alumnosAdmin.filter(x => !x.baja) : [];
  return '<div class="pp-grupos" id="pp-grupos">' + lista.map(g => tarjetaGrupo(r, g, registro.filter(x => (grupoDeNombre(x.nombre) || {}).id === g.id).length)).join('') + '</div>';
}
// Celdas de la semana del grupo que ya abrieron: entregadas, total y atrasadas.
function avanceGrupo(r, id) {
  const a = { hechas: 0, total: 0, atrasos: 0 };
  const celdas = r.filas.filter(f => (grupoDeNombre(f.alumno) || {}).id === id).flatMap(f => r.columnas.map(c => f.celdas[c.id]));
  for (const x of celdas.filter(x => x && x.estado !== 'no-aplica' && x.estado !== 'proximamente')) {
    a.total++;
    if (x.estado === 'hecho') a.hechas++;
    if (x.estado === 'atrasado') a.atrasos++;
  }
  a.pct = a.total ? Math.round(a.hechas / a.total * 100) : 0;
  return a;
}
function tarjetaGrupo(r, g, n) {
  const a = avanceGrupo(r, g.id);
  const personas = n === 1 ? '1 alumno o alumna' : n + ' alumnos y alumnas';
  const ver = r.grupo ? '<button type="button" class="btn ghost" data-action="ver-grupo" data-id="">👥 Ver todos</button>'
    : '<button type="button" class="btn ghost" data-action="ver-grupo" data-id="' + escapeHtml(g.id) + '">🔍 Ver grupo</button>';
  // Mismo botón y misma acción que en «👥 Grupos» (admin.js, ocultarGrupo; openspec: ingles-ocultar-grupos, fix-ingles-admin).
  const ocultar = '<button type="button" class="btn ghost" data-action="ocultar-grupo" data-id="' + escapeHtml(g.id) + '" data-oculto="' + (g.ocultoAdmin ? '0' : '1') + '">' + (g.ocultoAdmin ? '👁️ Mostrar en el panel' : '👁️ Ocultar del panel') + '</button>';
  const atrasos = a.atrasos === 1 ? '⏰ 1 entrega atrasada' : '⏰ ' + a.atrasos + ' entregas atrasadas';
  return '<article class="pp-grupo' + (r.grupo ? ' actual' : '') + '" data-grupo-id="' + escapeHtml(g.id) + '" style="--gc:' + escapeHtml(g.color) + '">' +
    '<div class="pp-grupo-top"><h4>' + escapeHtml(g.nombre) + '</h4>' + (g.nivel ? '<span class="chip">' + escapeHtml(g.nivel) + '</span>' : '') + (g.ocultoAdmin ? '<span class="chip" data-oculto>🙈 oculto del panel</span>' : '') + '</div>' +
    '<p class="pp-grupo-meta">' + (g.horario ? '🗓️ ' + escapeHtml(g.horario) + ' · ' : '') + '👤 ' + personas + '</p>' +
    '<div class="pp-grupo-avance"><span>Entregas de la semana</span><b>' + (a.total ? a.hechas + '/' + a.total + ' · ' + a.pct + ' %' : '—') + '</b></div>' +
    '<div class="rpg-xp-barra" role="progressbar" aria-label="Entregas de la semana de ' + escapeHtml(g.nombre) + '" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + a.pct + '"><span style="width:' + a.pct + '%"></span></div>' +
    (a.atrasos ? '<p class="pp-grupo-meta">' + atrasos + '</p>' : '') +
    '<div class="pp-grupo-acc">' + ver + (g.meet_url ? '<a class="btn ghost" href="' + escapeHtml(g.meet_url) + '" target="_blank" rel="noopener">🎥 Meet</a>' : '') + ocultar + '</div></article>';
}
// Lecturas que fallaron en el servidor: el resumen llega incompleto en lugar de caerse (openspec: fix-ingles-admin).
const TEXTO_AVISO = {
  resultados_incompletos: 'No se pudieron leer las entregas de alguna actividad; no sale en el mapa. Recarga en un momento.',
  grupos_no_disponibles: 'No se pudieron leer los grupos; el resumen sale sin filtrar por grupo.',
};
function avisosResumen(r) {
  const a = (r && r.avisos) || [];
  return a.length ? '<div class="card" id="resumen-avisos" role="status" style="margin-top:12px">⚠️ ' + a.map(x => escapeHtml(TEXTO_AVISO[x] || x)).join('<br>⚠️ ') + '</div>' : '';
}
// «🔄 Reintentar» del aviso de error del resumen.
contentEl.addEventListener('click', e => {
  if (!e.target.closest('[data-action="reintentar-resumen"]')) return;
  e.preventDefault();
  state.resumen = null; render(state.data); void cargarResumen();
});
// «🔍 Ver grupo»: el mismo filtro que el selector «👥 Grupo».
contentEl.addEventListener('click', e => {
  const b = e.target.closest('[data-action="ver-grupo"]');
  if (!b) return;
  e.preventDefault();
  state.grupoFiltro = b.dataset.id || null; state.resumen = null; state.nicks = null; // como el selector (app.js)
  render(state.data); void cargarResumen();
});

// ---------- Indicadores y mapa de calor ----------
async function cargarResumen() {
  const clave = (state.grupoFiltro || '') + (state.mostrarOcultos ? '|ocultos' : '');
  if (state.cargandoResumen === clave) return;
  state.cargandoResumen = clave;
  // «📥 Por revisar» ya no pide la bandeja: sale del panel (openspec: panel-profe-peticiones).
  // Grupos ocultos del panel (openspec: ingles-ocultar-grupos): el servidor los deja fuera salvo con ocultos=1.
  const q = (state.grupoFiltro ? '&grupo=' + encodeURIComponent(state.grupoFiltro) : '') + (state.mostrarOcultos ? '&ocultos=1' : '');
  let r;
  try { r = await api(API_BASE + '/ingles/resumen?email=' + encodeURIComponent(state.email) + q); } catch (e) { r = { ok: false, body: { error: e.message } }; }
  if (state.cargandoResumen !== clave) return; // llegó otra petición después (cambio de grupo)
  state.cargandoResumen = null;
  state.resumen = r.ok ? r.body : { error: r.body.error || r.status, ...(r.body.detalle ? { detalle: r.body.detalle } : {}) };
  const t = document.getElementById('tablero');
  if (t) t.innerHTML = renderTablero();
  pintarPanelProfe(); // «En riesgo» sale del mismo resumen
  if (cajonEl.open && state.cajonAlumno) pintarCajon(state.cajonAlumno);
}
const TEXTO_CELDA = { hecho: 'Entregada', atrasado: 'Atrasada', hoy: 'Vence hoy', pendiente: 'Pendiente', proximamente: 'Aún no abre', 'no-aplica': 'No le toca' };
function celdaHtml(c) {
  if (c.estado === 'hecho') return c.porcentaje === null || c.porcentaje === undefined ? '✓' : c.porcentaje + '%';
  return { atrasado: '⏰', hoy: '📌', pendiente: '·', proximamente: '🔒', 'no-aplica': '—' }[c.estado] || '';
}
function claseCelda(c) {
  let k = 'celda ' + c.estado;
  if (c.estado === 'hecho' && c.porcentaje >= 80) k += ' alto';
  else if (c.estado === 'hecho') k += c.porcentaje >= 60 ? ' medio' : ' bajo';
  if (c.fueraDeTiempo) k += ' tarde';
  return k;
}
function renderTablero() {
  const r = state.resumen;
  if (!r) return esqueleto() + renderTarjetasGrupo(null); // las tarjetas (y «Ocultar del panel») no esperan al resumen
  // Si el resumen falla, el aviso trae «Reintentar» y las tarjetas de grupo siguen (openspec: fix-ingles-admin).
  if (r.error) return '<div class="card error" id="resumen-error" role="alert">No se pudo cargar el resumen (' + escapeHtml(r.error) + (r.detalle ? ': ' + escapeHtml(r.detalle) : '') + '). ' +
    '<button type="button" class="btn ghost" data-action="reintentar-resumen">🔄 Reintentar</button></div>' + renderTarjetasGrupo(null);
  const k = r.kpis;
  const kpi = (cls, valor, texto) => '<div class="kpi ' + cls + '"><b>' + valor + '</b><span>' + texto + '</span></div>';
  let tonoATiempo = '';
  if (k.aTiempo !== null && k.aTiempo >= 80) tonoATiempo = 'ok';
  else if (k.aTiempo !== null) tonoATiempo = k.aTiempo >= 60 ? 'warn' : 'bad';
  const cab = '<p class="muted" style="margin:0 0 10px">' + (r.grupo ? chipGrupo(r.grupo) + ' · ' : '👥 Todos los grupos · ') + (r.semana ? '📚 ' + escapeHtml(r.semana.titulo) : 'Sin semana activa') + (r.ocultos ? ' · 🙈 ' + r.ocultos + ' en grupos ocultos' : '') + '</p>';
  const kpis = '<div class="kpis" id="kpis">' +
    kpi(tonoATiempo, k.aTiempo === null ? '—' : k.aTiempo + '%', '✅ A tiempo') +
    kpi('', k.promedio === null ? '—' : k.promedio + '%', '📊 Promedio') +
    kpi(k.atrasos ? 'bad' : 'ok', k.atrasos, '⏰ Atrasos') +
    kpi(k.sinEntregas.length ? 'warn' : 'ok', k.sinEntregas.length, '😴 Sin entregas') + '</div>' +
    (k.sinEntregas.length ? '<div class="sin-entregas">😴 Sin entregas esta semana: ' + k.sinEntregas.map(n => '<button type="button" class="btn ghost sm" data-action="cajon" data-alumno="' + escapeHtml(n) + '">' + escapeHtml(n) + '</button>').join(' ') + '</div>' : '');
  const grupos = renderTarjetasGrupo(r) + avisosResumen(r);
  if (!r.columnas.length || !r.filas.length) return cab + kpis + grupos + '<div class="card" style="margin-top:12px">' + vacio('🗓️', r.filas.length ? 'Esta semana no tiene actividades con entrega.' : 'No hay alumnos ni alumnas en este grupo.') + '</div>';
  const th = r.columnas.map(c => '<th scope="col" title="' + escapeHtml(c.titulo) + '"><span aria-hidden="true">' + icono(c.tipo) + '</span><br>' + escapeHtml(fechaCorta(c.fechaLimite)) + '<span class="sr-only"> ' + escapeHtml(c.titulo) + '</span></th>').join('');
  const filas = r.filas.map(f => '<tr data-alumno="' + escapeHtml(f.alumno) + '"><td class="alumno"><button type="button" data-action="cajon" data-alumno="' + escapeHtml(f.alumno) + '">' + escapeHtml(f.alumno) + '</button></td>' +
    r.columnas.map(c => {
      const x = f.celdas[c.id] || { estado: 'no-aplica' };
      const etiqueta = f.alumno + ' · ' + c.titulo + ': ' + TEXTO_CELDA[x.estado] + (x.estado === 'hecho' && x.porcentaje !== null ? ' ' + x.porcentaje + ' %' : '') + (x.fueraDeTiempo ? ', fuera de tiempo' : '') + (x.prorroga ? ', prórroga al ' + fechaCorta(x.prorroga) : '');
      // data-label: en celular la fila es una tarjeta y cada celda lleva su columna encima (openspec: ingles-diseno-profe).
      return '<td data-label="' + escapeHtml(icono(c.tipo) + ' ' + fechaCorta(c.fechaLimite)) + '"><button type="button" class="' + claseCelda(x) + '" data-estado="' + x.estado + '" data-action="cajon" data-alumno="' + escapeHtml(f.alumno) + '" aria-label="' + escapeHtml(etiqueta) + '" title="' + escapeHtml(etiqueta) + '">' + celdaHtml(x) + '</button></td>';
    }).join('') + '</tr>').join('');
  return cab + kpis + grupos +
    '<div class="card" style="margin-top:12px;padding:12px"><h3 class="card-titulo">🔥 Mapa de calor de la semana</h3><div class="tabla-wrap" style="border:none"><table class="heat" id="mapa-calor"><thead><tr><th scope="col" class="alumno-h">Alumno o alumna</th>' + th + '</tr></thead><tbody>' + filas + '</tbody></table></div>' +
    '<div class="leyenda"><span>✓ % entregada</span><span>⏱ fuera de tiempo</span><span>⏰ atrasada</span><span>📌 vence hoy</span><span>· pendiente</span><span>🔒 aún no abre</span><span>— no le toca</span></div></div>';
}

// ---------- Cajón del alumno o alumna (<dialog>, se cierra con Esc) ----------
function abrirCajon(nombre) {
  state.cajonAlumno = nombre;
  pintarCajon(nombre);
  if (!cajonEl.open) cajonEl.showModal();
  if (!state.resumen) cargarResumen();
  asegurarJuegosAdmin(); // la línea de juegos del historial (openspec: panel-profe-peticiones)
}
cajonEl.addEventListener('close', () => { state.cajonAlumno = null; });
cajonEl.addEventListener('click', e => { if (e.target === cajonEl) cajonEl.close(); }); // clic en el fondo
function filaCajon(c, x, it, nombre) {
  let tono = 'neutra';
  if (x.estado === 'hecho') tono = claseNota(x.porcentaje);
  else if (x.estado === 'atrasado') tono = 'debilidad';
  else if (x.estado === 'hoy') tono = 'en-progreso';
  const d = ' data-id="' + escapeHtml(c.id) + '" data-alumno="' + escapeHtml(nombre) + '"';
  const quitarProrroga = x.prorroga ? '<button type="button" class="btn ghost sm" data-action="prorroga" data-modo="quitar"' + d + '>Quitar prórroga</button>' : '';
  const reiniciar = x.intentos ? '<button type="button" class="btn ghost sm" data-action="reiniciar" data-titulo="' + escapeHtml(c.titulo) + '"' + d + '>↺ Reiniciar intentos</button>' : '';
  const acciones = x.estado === 'no-aplica' ? '' :
    '<label class="sr-only" for="pr-' + escapeHtml(c.id) + '">Nueva fecha límite para ' + escapeHtml(c.titulo) + '</label>' +
    '<input class="campo" type="date" id="pr-' + escapeHtml(c.id) + '" min="' + escapeHtml(c.disponibleDesde) + '" value="' + escapeHtml(x.prorroga || '') + '">' +
    '<button type="button" class="btn ghost sm" data-action="prorroga" data-modo="dar"' + d + '>⏳ Dar prórroga</button>' +
    quitarProrroga + reiniciar;
  return '<div class="cajon-fila" data-item="' + escapeHtml(c.id) + '"><div class="h"><span>' + icono(c.tipo) + ' ' + escapeHtml(c.titulo) + '</span><span class="chip ' + tono + '">' + escapeHtml(celdaHtml(x) + ' ' + TEXTO_CELDA[x.estado]) + '</span></div>' +
    '<div class="muted" style="font-size:.78rem">Vence ' + escapeHtml(formatFecha(x.prorroga || c.fechaLimite)) + (x.prorroga ? ' (con prórroga)' : '') + (x.fueraDeTiempo ? ' · entregó fuera de tiempo' : '') + (it.intentosMax ? ' · ' + (x.intentos || 0) + '/' + it.intentosMax + ' intento(s)' : '') + '</div>' +
    (acciones ? '<div class="acc">' + acciones + '</div>' : '') + '</div>';
}
function pintarCajon(nombre, aviso) {
  const g = grupoDeNombre(nombre);
  const items = (state.act && state.act.items) || [];
  const r = state.resumen && !state.resumen.error ? state.resumen : null;
  const fila = r && r.filas.find(f => f.alumno === nombre);
  const temas = (((state.act && state.act.resumen) || {})[nombre] || {}).temasAReforzar || [];
  const ult = ultimasCalificaciones(nombre, items);
  let semana = esqueleto();
  if (r) semana = fila ? r.columnas.map(c => filaCajon(c, fila.celdas[c.id] || { estado: 'no-aplica' }, items.find(i => i.id === c.id) || {}, nombre)).join('') : vacio('🗓️', 'No aparece en el grupo elegido.');
  cajonEl.innerHTML = '<div class="cajon-cab" style="--gc:' + escapeHtml((g && g.color) || '#4f46e5') + '"><span class="avatar" aria-hidden="true">' + escapeHtml(iniciales(nombre)) + '</span>' +
    '<div style="flex:1;min-width:0"><h2 id="cajon-titulo" style="margin:0;font-size:1.1rem">' + escapeHtml(nombre) + '</h2>' + chipGrupo(g) + '</div>' +
    '<button type="button" class="btn ghost icono" data-action="cerrar-cajon" aria-label="Cerrar">✕</button></div>' +
    '<div class="cajon-cuerpo"><div class="cajon-msg" id="cajon-msg" role="status">' + escapeHtml(aviso || '') + '</div>' +
    (state.grupos ? '<div class="card"><h3 class="card-titulo">👥 Grupo</h3><label class="sr-only" for="cajon-grupo">Grupo de ' + escapeHtml(nombre) + '</label><select id="cajon-grupo" class="campo" data-mover="1" data-alumno="' + escapeHtml(nombre) + '">' + opcionesGrupo((g || {}).id) + '</select></div>' : '') +
    '<div class="card"><h3 class="card-titulo">📅 Esta semana</h3>' + semana + '</div>' +
    '<div class="card"><h3 class="card-titulo">🗓️ Historial</h3>' + (ult.length ? '<div class="ultimas-lista">' + ult.map(x => '<div>' + x.icono + ' ' + escapeHtml(x.titulo) + ' · <span class="chip ' + claseNota(x.pct) + '">' + escapeHtml(x.valor) + '</span> · ' + escapeHtml(fechaCorta(x.fecha)) + '</div>').join('') + '</div>' : '<div class="muted">Sin calificaciones todavía.</div>') + huecoJuegos(nombre) + '</div>' +
    '<div class="card"><h3 class="card-titulo">🎯 Temas a reforzar</h3>' + (temas.length ? '<div class="chips">' + temas.map(t => '<span class="chip ' + t.estado + '" title="' + escapeHtml(t.fuente) + '">' + escapeHtml(t.titulo) + '</span>').join('') + '</div>' : '<div class="muted">Nada pendiente de reforzar. 🎉</div>') + '</div>' +
    '</div>';
  cajonEl.setAttribute('aria-labelledby', 'cajon-titulo');
}
const ERRORES_CAJON = { fecha_invalida: 'La fecha no es válida o es antes de que abra la actividad.', alumno_invalido: 'Alumno o alumna inválido.', conflicto_escritura: 'Alguien más guardó al mismo tiempo; intenta de nuevo.' };
async function recargarTrasAccion(nombre, aviso) {
  state.resumen = null;
  await loadActividades();
  render(state.data);
  await cargarResumen();
  if (cajonEl.open) pintarCajon(nombre, aviso);
}
async function darProrroga(b) {
  const nombre = b.dataset.alumno, id = b.dataset.id;
  const fecha = b.dataset.modo === 'quitar' ? null : (document.getElementById('pr-' + id) || {}).value || '';
  const msg = document.getElementById('cajon-msg');
  if (fecha === '') { msg.textContent = 'Elige una fecha para la prórroga.'; return; }
  b.disabled = true;
  const r = await api(ACT_URL + '/' + encodeURIComponent(id) + '/prorroga?email=' + encodeURIComponent(state.email), { method: 'POST', headers: { 'content-type': 'text/plain;charset=UTF-8' }, body: JSON.stringify({ alumno: nombre, fecha }) });
  if (!r.ok) { b.disabled = false; msg.textContent = '⚠️ ' + (ERRORES_CAJON[r.body.error] || 'No se pudo guardar (' + (r.body.error || r.status) + ').'); return; }
  await recargarTrasAccion(nombre, fecha ? '✅ Prórroga al ' + fechaCorta(fecha) + ' guardada.' : '✅ Se quitó la prórroga.');
}
async function reiniciarIntento(b) {
  const nombre = b.dataset.alumno;
  if (!confirm('¿Reiniciar los intentos de ' + nombre + ' en «' + b.dataset.titulo + '»? Se borran sus respuestas de esa actividad.')) return;
  b.disabled = true;
  const r = await api(ACT_URL + '/' + encodeURIComponent(b.dataset.id) + '/resultados/' + encodeURIComponent(nombre) + '?email=' + encodeURIComponent(state.email), { method: 'DELETE' });
  if (!r.ok) { b.disabled = false; document.getElementById('cajon-msg').textContent = '⚠️ No se pudo reiniciar (' + (r.body.error || r.status) + ').'; return; }
  await recargarTrasAccion(nombre, '↺ Intentos reiniciados.');
}
