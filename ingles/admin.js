// Inglés · vista del admin (profe del grupo): grupos, alumnos y alumnas, juegos, tablero y cajón.
// Resumen de juegos de la semana (solo admin): jugadores y partidas con su podio.
// ---------- Alta de alumnos y alumnas (admin, openspec: alta-alumnos) ----------
// ---------- Grupos de clase (openspec: ingles-grupos) ----------
// ---------- Panel del profe en una petición (openspec: panel-profe-peticiones) ----------
// Al abrir, /ingles/data?incluir=panel trae grupos, alumnos y alumnas (sin correos), resumen y «Por revisar». Si una
// parte falla, llega con `error` y se avisa en su sección; «🔄 Reintentar» y ocultar/mostrar un grupo piden
// /ingles/panel. Registro (con correos), Juegos y la bandeja de Entregas se piden al abrir su pestaña.
const filtroPanel = () => (state.grupoFiltro ? '&grupo=' + encodeURIComponent(state.grupoFiltro) : '') + (state.mostrarOcultos ? '&ocultos=1' : '');
function aplicarPanel(p) {
  const g = p.grupos, a = p.alumnos, r = p.resumen, e = p.entregas;
  state.grupos = g && !g.error ? g : null; // sin_base (sin Postgres): sin grupos, como siempre
  state.alumnosAdmin = Array.isArray(a) ? a : { error: (a && a.error) || 'no_disponible' };
  state.resumen = r && !r.error ? r : { error: (r && r.error) || 'no_disponible', ...(r && r.detalle ? { detalle: r.detalle } : {}) };
  state.cargandoResumen = null;
  state.panelEntregas = e && !e.error ? e : null;
  state.panelFallas = (p.fallas || []).filter(n => n !== 'resumen'); // el resumen tiene su propio aviso con «Reintentar»
}
// Al abrir el panel: con `panel`, todo listo; sin él (servidor de una versión anterior), el camino de antes.
async function prepararPanelAdmin(panel) {
  state.juegos = undefined; state.registroAdmin = null; state.panelEntregas = null; state.panelFallas = [];
  if (panel) { aplicarPanel(panel); return; }
  await Promise.all([loadGruposAdmin(), cargarRegistroAdmin()]);
  state.alumnosAdmin = state.registroAdmin;
}
// GET /ingles/panel con el filtro vigente. Devuelve false si no llegó (el aviso lo dice).
async function refrescarPanel() {
  let r;
  try { r = await fetchJson(API_BASE + '/ingles/panel?email=' + encodeURIComponent(state.email) + filtroPanel()); } catch (e) { r = { ok: false, body: { error: e.message } }; }
  if (!r.ok) { state.panelFallas = ['panel']; return false; }
  aplicarPanel(r.body);
  return true;
}
const TEXTO_FALLA_PANEL = { grupos: 'los grupos', alumnos: 'la lista de alumnos y alumnas', entregas: 'las entregas por revisar', panel: 'el panel' };
// Aviso por sección (en el encabezado del panel) con «🔄 Reintentar».
function avisosPanel() {
  const f = state.panelFallas || [];
  if (!f.length) return '';
  return '<div class="card error" id="panel-avisos" role="alert" style="margin-top:10px">⚠️ No se pudo cargar ' + f.map(n => escapeHtml(TEXTO_FALLA_PANEL[n] || n)).join(', ') + '. ' +
    '<button type="button" class="btn ghost" data-action="reintentar-panel">🔄 Reintentar</button></div>';
}
const fallaPanel = n => (state.panelFallas || []).includes(n);
contentEl.addEventListener('click', async e => {
  const b = e.target.closest('[data-action="reintentar-panel"]');
  if (!b) return;
  e.preventDefault(); b.disabled = true;
  await refrescarPanel();
  render(state.data);
});

const slugAlumno = n => (n || '').normalize('NFD').replaceAll(/[\u0300-\u036f]/g, '').toLowerCase().split(/[^a-z0-9]/).filter(Boolean).join('-') || 'sin-nombre';
async function loadGruposAdmin() {
  try {
    const r = await fetchJson(API_BASE + '/ingles/grupos?email=' + encodeURIComponent(state.email));
    state.grupos = r.ok ? r.body : null; // 503 sin_base: los grupos aún no están activos
  } catch { /* sin conexión: se pinta sin grupos */ state.grupos = null; }
}
const gruposActivos = () => (state.grupos && state.grupos.grupos || []).filter(g => g.activo);
// Grupo de un alumno o alumna: su inscripción vigente o, si no tiene, el primer grupo activo.
function grupoDeNombre(nombre) {
  if (!state.grupos) return null;
  const id = state.grupos.miembros[slugAlumno(nombre)] || (gruposActivos()[0] || {}).id;
  return (state.grupos.grupos || []).find(g => g.id === id) || null;
}
// Grupos ocultos del panel (openspec: ingles-ocultar-grupos): con `ocultoAdmin`, el grupo y sus alumnos y alumnas no
// salen en las vistas del admin, salvo con el interruptor «Mostrar grupos ocultos (N)». A ellos no les cambia nada.
const gruposOcultos = () => (state.grupos && state.grupos.grupos || []).filter(g => g.ocultoAdmin);
function ocultoEnPanel(nombre) {
  if (state.mostrarOcultos || !state.grupos) return false;
  // Solo personas del registro de Inglés (en Juegos hay jugadores de Secundaria e invitados).
  if (Array.isArray(state.alumnosAdmin) && !state.alumnosAdmin.some(x => x.nombre === nombre)) return false;
  return !!(grupoDeNombre(nombre) || {}).ocultoAdmin;
}
const chipGrupo = g => g ? '<span class="grupo-chip"><span class="grupo-sw" style="background:' + escapeHtml(g.color) + ';margin:0"></span>' + escapeHtml(g.nombre) + '</span>' : '';
const opcionesGrupo = sel => gruposActivos().filter(g => !g.ocultoAdmin || state.mostrarOcultos || g.id === sel).map(g => '<option value="' + escapeHtml(g.id) + '"' + (g.id === sel ? ' selected' : '') + '>' + escapeHtml(g.nombre) + '</option>').join('');
function renderFiltroGrupo() {
  if (!state.grupos) return '';
  const n = gruposOcultos().length;
  const interruptor = n ? '<label class="progress-text" style="margin:0;display:inline-flex;gap:6px;align-items:center"><input type="checkbox" id="mostrar-ocultos"' + (state.mostrarOcultos ? ' checked' : '') + '> Mostrar grupos ocultos (' + n + ')</label>' : '';
  return '<div class="grupos-barra"><label for="grupo-filtro">👥 Grupo</label><select id="grupo-filtro"><option value="">Todos los grupos</option>' + opcionesGrupo(state.grupoFiltro) + '</select>' + interruptor + '</div>';
}
function renderGruposAdmin() {
  if (!state.grupos) return '';
  const lista = state.grupos.grupos || [];
  // Grupo efectivo (openspec: grupos-conteo): inscripción o, sin ella, el primer grupo activo, como en «Registro».
  // Solo quienes siguen en Inglés: las bajas no cuentan en su grupo (openspec: ingles-baja-alumno).
  const registro = Array.isArray(state.alumnosAdmin) ? state.alumnosAdmin.filter(x => !x.baja) : null;
  const cuantos = id => registro ? registro.filter(x => (grupoDeNombre(x.nombre) || {}).id === id).length
    : Object.values(state.grupos.miembros).filter(x => x === id).length; // `miembros` ya viene sin bajas
  const personas = n => n === 1 ? '1 alumno o alumna' : n + ' alumnos y alumnas';
  const e = state.grupoEdicion || {};
  return '<details class="section" id="grupos-admin"' + (state.gruposAbierto === false ? '' : ' open') + '><summary><div class="section-head"><span><span class="chevron">▶</span>👥 Grupos</span><span class="count">' + lista.length + '</span></div></summary><div class="scroll">' +
    // Campos con etiqueta visible y botones de 44 px (openspec: ingles-diseno-profe).
    '<form class="grupo-form" id="grupo-form" autocomplete="off"><input type="hidden" id="g-id" value="' + escapeHtml(e.id || '') + '">' +
      '<label class="campo-et" for="g-nombre">Nombre<input id="g-nombre" maxlength="60" placeholder="Sábado A1" required value="' + escapeHtml(e.nombre || '') + '"></label>' +
      '<label class="campo-et" for="g-nivel">Nivel<input id="g-nivel" maxlength="20" placeholder="A1" value="' + escapeHtml(e.nivel || '') + '"></label>' +
      '<label class="campo-et" for="g-horario">Horario<input id="g-horario" maxlength="60" placeholder="Sáb 10:00" value="' + escapeHtml(e.horario || '') + '"></label>' +
      '<label class="campo-et" for="g-meet">Enlace de Meet<input id="g-meet" maxlength="200" placeholder="https://meet.google.com/…" value="' + escapeHtml(e.meet_url || '') + '"></label>' +
      '<label class="campo-et" for="g-color">Color<input id="g-color" type="color" value="' + escapeHtml(e.color || '#4f46e5') + '"></label>' +
      '<button class="btn" type="submit">' + (e.id ? '💾 Guardar cambios' : '➕ Crear grupo') + '</button><div id="grupo-msg"></div></form>' +
    lista.map(g => '<div class="grupo-fila" style="--gc:' + escapeHtml(g.color) + '"><div><span class="grupo-sw" style="background:' + escapeHtml(g.color) + '"></span><b>' + escapeHtml(g.nombre) + '</b>' + (g.activo ? '' : ' <small>(inactivo)</small>') + (g.ocultoAdmin ? ' <small data-oculto>🙈 oculto del panel</small>' : '') +
      '<br><small>' + [g.nivel, g.horario].filter(Boolean).map(escapeHtml).join(' · ') + ' · 👤 ' + personas(cuantos(g.id)) + '</small></div>' +
      '<span class="grupo-acc">' + (g.meet_url ? '<a class="btn ghost" href="' + escapeHtml(g.meet_url) + '" target="_blank" rel="noopener">🎥 Meet</a>' : '') +
      '<button class="btn ghost" data-action="ocultar-grupo" data-id="' + escapeHtml(g.id) + '" data-oculto="' + (g.ocultoAdmin ? '0' : '1') + '">' + (g.ocultoAdmin ? 'Mostrar en el panel' : '👁️ Ocultar del panel') + '</button>' +
      '<button class="btn ghost" data-action="editar-grupo" data-id="' + escapeHtml(g.id) + '">✏️ Editar</button></span></div>').join('') +
    '<div class="progress-text">Quien no tiene inscripción cuenta en el primer grupo activo. Las semanas con <code>"grupos"</code> en su JSON solo las ve ese grupo.</div>' +
    '</div></details>';
}
async function guardarGrupo(form) {
  const msg = document.getElementById('grupo-msg');
  const val = id => document.getElementById(id).value.trim();
  const body = { nombre: val('g-nombre'), nivel: val('g-nivel'), horario: val('g-horario'), meet_url: val('g-meet'), color: val('g-color') };
  if (val('g-id')) body.id = val('g-id');
  form.querySelector('button').disabled = true;
  const r = await fetchJson(API_BASE + '/ingles/grupos?email=' + encodeURIComponent(state.email), { method: 'POST', headers: { 'content-type': 'text/plain;charset=UTF-8' }, body: JSON.stringify(body) });
  if (!r.ok) { form.querySelector('button').disabled = false; msg.innerHTML = '<div class="reg-error" role="alert">No se pudo guardar (' + escapeHtml({ nombre_invalido: 'escribe un nombre', meet_invalido: 'el enlace de Meet debe empezar con https://', color_invalido: 'color inválido' }[r.body.error] || r.body.error || r.status) + ').</div>'; return; }
  state.grupoEdicion = null; state.gruposAbierto = true;
  await loadGruposAdmin(); render(state.data);
}
// Ocultar o mostrar un grupo en el panel del admin (solo cambia la bandera; reversible).
async function ocultarGrupo(b) {
  b.disabled = true;
  const r = await fetchJson(API_BASE + '/ingles/grupos/ocultar?email=' + encodeURIComponent(state.email), { method: 'POST', headers: { 'content-type': 'text/plain;charset=UTF-8' }, body: JSON.stringify({ grupo: b.dataset.id, oculto: b.dataset.oculto === '1' }) });
  if (!r.ok) { b.disabled = false; alert('No se pudo cambiar (' + (r.body.error || r.status) + ').'); return; }
  if (r.body.grupo && r.body.grupo.ocultoAdmin && state.grupoFiltro === r.body.grupo.id && !state.mostrarOcultos) state.grupoFiltro = null;
  // Grupos, alumnos y alumnas, resumen y «Por revisar» en una sola petición (openspec: panel-profe-peticiones).
  state.gruposAbierto = true;
  await refrescarPanel();
  if (!gruposOcultos().length) state.mostrarOcultos = false; // sin grupos ocultos, el interruptor se apaga solo
  render(state.data);
}
async function moverGrupo(sel) {
  sel.disabled = true;
  const r = await fetchJson(API_BASE + '/ingles/grupos/mover?email=' + encodeURIComponent(state.email), { method: 'POST', headers: { 'content-type': 'text/plain;charset=UTF-8' }, body: JSON.stringify({ alumno: sel.dataset.alumno, grupo: sel.value }) });
  if (!r.ok) { sel.disabled = false; alert('No se pudo mover (' + (r.body.error || r.status) + ').'); return; }
  state.altaAbierta = true; state.altaAviso = '⇄ ' + sel.dataset.alumno + ' ahora está en ' + ((state.grupos.grupos.find(g => g.id === sel.value) || {}).nombre || sel.value) + '.';
  await loadFor(state.email); // recarga alumnos y grupos, y muestra el aviso
}
// Tarjeta del grupo para alumnos y alumnas: nombre, horario y Meet.
function renderMiGrupo(act) {
  const g = act && act.grupo; if (!g) return '';
  return '<div class="mi-grupo" style="--gc:' + escapeHtml(g.color) + '"><b>👥 ' + escapeHtml(g.nombre) + '</b>' + (g.nivel ? '<span class="grupo-chip">' + escapeHtml(g.nivel) + '</span>' : '') +
    (g.horario ? '<span>🗓️ ' + escapeHtml(g.horario) + '</span>' : '') + (g.meet_url ? '<a class="btn" style="margin-left:auto" href="' + escapeHtml(g.meet_url) + '" target="_blank" rel="noopener">🎥 Unirme a la clase</a>' : '') + '</div>';
}

// Lista con correos para «➕ Registro» (GET /ingles/alumnos): se pide al abrir esa pestaña y solo repinta la lista,
// no el formulario (openspec: panel-profe-peticiones). `state.alumnosAdmin` (sin correos, del panel) da los conteos.
function cargarRegistroAdmin() {
  if (state.cargandoRegistro) return state.cargandoRegistro;
  state.cargandoRegistro = (async () => {
    try {
      const r = await fetchJson(API_BASE + '/ingles/alumnos?email=' + encodeURIComponent(state.email));
      state.registroAdmin = r.ok ? r.body.alumnos : { error: r.body.error || r.status };
    } catch (e) { state.registroAdmin = { error: e.message }; }
    state.cargandoRegistro = null;
    pintarRegistroLista();
  })();
  return state.cargandoRegistro;
}
function pintarRegistroLista() {
  const el = document.getElementById('registro-lista');
  if (el) el.innerHTML = registroListaHtml();
}

// Tarjetas de «➕ Registro» (con correos): esqueleto hasta que llega GET /ingles/alumnos.
function registroListaHtml() {
  const a = state.registroAdmin;
  if (!a) return esqueleto();
  if (a.error) return '<div class="reg-error" role="alert">No se pudo cargar la lista (' + escapeHtml(a.error) + '). <button type="button" class="btn ghost" data-action="reintentar-registro">🔄 Reintentar</button></div>';
  // Baja de Inglés reversible (openspec: ingles-baja-alumno): las bajas van aparte, con «Reactivar».
  const lista = a.filter(x => !x.baja && !ocultoEnPanel(x.nombre)), bajas = a.filter(x => x.baja);
  // Cada persona es una tarjeta (openspec: ingles-diseno-profe): avatar con el color de su grupo, datos y acciones.
  const tarjeta = (x, extra, cuerpo, acciones) => {
    const g = grupoDeNombre(x.nombre);
    return '<div class="ultimas-lista reg-fila' + extra + '" style="--gc:' + escapeHtml((g && g.color) || '#4f46e5') + '"' + (x.baja ? ' data-baja="' + escapeHtml(x.emails[0]) + '"' : '') + '>' +
      '<span class="avatar" aria-hidden="true">' + escapeHtml(iniciales(x.nombre)) + '</span>' +
      '<div class="reg-datos"><b>' + escapeHtml(x.nombre) + '</b><small>' + cuerpo + '</small></div>' +
      '<div class="reg-acciones">' + acciones + '</div></div>';
  };
  const datos = x => ' data-email="' + escapeHtml(x.emails[0]) + '" data-nombre="' + escapeHtml(x.nombre) + '"';
  return '<div class="reg-lista">' + lista.map(x => tarjeta(x, '',
      escapeHtml(x.emails.join(', ')) + ' · alta en la página' + (x.inicio ? ' · 📅 inicia el lunes ' + escapeHtml(fechaCorta(x.inicio)) : ''),
      (state.grupos ? '<select class="mover-grupo" data-mover="1" data-alumno="' + escapeHtml(x.nombre) + '" aria-label="Grupo de ' + escapeHtml(x.nombre) + '">' + opcionesGrupo((grupoDeNombre(x.nombre) || {}).id) + '</select>' : '') +
      '<button class="btn ghost" data-action="baja-ingles"' + datos(x) + '>🚪 Baja de Inglés</button>' +
      '<button class="btn ghost" data-action="quitar-alumno"' + datos(x) + '>Quitar</button>')).join('') + '</div>' +
    (bajas.length ? '<div id="bajas-ingles"><p class="reg-subt">🗂️ De baja de Inglés (' + bajas.length + ') · sus resultados se conservan como historial</p><div class="reg-lista">' +
      bajas.map(x => tarjeta(x, ' de-baja', escapeHtml(x.emails.join(', ')) + ' · de baja desde el ' + escapeHtml(fechaCorta(x.baja)),
        '<button class="btn ghost" data-action="reactivar-ingles"' + datos(x) + '>↩️ Reactivar</button>')).join('') + '</div></div>' : '');
}
contentEl.addEventListener('click', e => {
  if (!e.target.closest('[data-action="reintentar-registro"]')) return;
  e.preventDefault(); state.registroAdmin = null; pintarRegistroLista(); cargarRegistroAdmin();
});

function renderAlumnosAdmin() {
  // Conteo con la lista del panel (sin correos); las tarjetas, con la de Registro (openspec: panel-profe-peticiones).
  const a = state.alumnosAdmin;
  const activos = Array.isArray(a) ? a.filter(x => !x.baja && !ocultoEnPanel(x.nombre)).length : 0;
  return '<details class="section" id="alumnos-admin"' + (state.altaAbierta === false ? '' : ' open') + '><summary><div class="section-head"><span><span class="chevron">▶</span>👥 Alumnos y alumnas</span><span class="count">' + activos + '</span></div></summary><div class="scroll">' +
    '<form id="alta-alumno" class="reg-form" autocomplete="off">' +
      '<p class="reg-intro">➕ Nuevo alumno o alumna: entra con su correo a Inglés, al portal y a Juegos. Empieza su curso el lunes siguiente, sin actividades en atraso.</p>' +
      '<label class="campo-et" for="alta-nombre">Nombre<input id="alta-nombre" type="text" maxlength="40" placeholder="Como aparecerá en sus calificaciones" required></label>' +
      '<label class="campo-et" for="alta-correo">Correo<input id="alta-correo" type="email" maxlength="80" placeholder="correo@ejemplo.com" required></label>' +
      (state.grupos ? '<label class="campo-et" for="alta-grupo">Grupo<select id="alta-grupo">' + opcionesGrupo(state.grupoFiltro || (gruposActivos()[0] || {}).id) + '</select></label>' : '') +
      '<button class="btn reg-enviar" type="submit">➕ Dar de alta</button><div id="alta-msg" role="status"></div></form>' +
    '<div id="registro-lista" aria-live="polite">' + registroListaHtml() + '</div>' +
    '</div></details>';
}

const ERRORES_ALTA = { correo_invalido: 'Escribe un correo válido.', nombre_invalido: 'Escribe un nombre de 2 a 40 letras.', correo_en_uso: 'Ese correo ya tiene acceso.', nombre_en_uso: 'Ya hay alguien con ese nombre y correo. Usa otro nombre (por ejemplo, con apellido).' };
async function altaAlumno(form) {
  const msg = document.getElementById('alta-msg');
  const nombre = document.getElementById('alta-nombre').value, email = document.getElementById('alta-correo').value;
  form.querySelector('button').disabled = true;
  const grupoSel = document.getElementById('alta-grupo');
  const r = await fetchJson(API_BASE + '/ingles/alumnos?email=' + encodeURIComponent(state.email), { method: 'POST', headers: { 'content-type': 'text/plain;charset=UTF-8' }, body: JSON.stringify({ nombre, email, ...(grupoSel && grupoSel.value ? { grupo: grupoSel.value } : {}) }) });
  if (!r.ok) { form.querySelector('button').disabled = false; msg.innerHTML = '<div class="reg-error" role="alert">' + escapeHtml(ERRORES_ALTA[r.body.error] || ('No se pudo dar de alta (' + (r.body.error || r.status) + ').')) + '</div>'; return; }
  state.altaAbierta = true;
  state.altaAviso = '✅ ' + r.body.alumno.nombre + ' ya puede entrar con ' + r.body.alumno.email + '.' + (r.body.alumno.inicio ? ' Empieza el lunes ' + fechaCorta(r.body.alumno.inicio) + ', sin actividades en atraso.' : '');
  await loadFor(state.email);
}
async function quitarAlumno(b) {
  if (!confirm('¿Quitar el acceso de ' + b.dataset.nombre + '? Sus resultados se conservan.')) return;
  b.disabled = true;
  const r = await fetchJson(API_BASE + '/ingles/alumnos/quitar?email=' + encodeURIComponent(state.email), { method: 'POST', headers: { 'content-type': 'text/plain;charset=UTF-8' }, body: JSON.stringify({ email: b.dataset.email }) });
  if (!r.ok) { b.disabled = false; alert('No se pudo quitar (' + (r.body.error || r.status) + ').'); return; }
  state.altaAbierta = true; state.altaAviso = '🗑️ Se quitó el acceso de ' + b.dataset.nombre + '.';
  await loadFor(state.email);
}

// Baja de Inglés reversible (openspec: ingles-baja-alumno): no borra resultados ni toca Secundaria o Juegos.
async function bajaIngles(b, reactivar) {
  const nombre = b.dataset.nombre;
  const pregunta = reactivar
    ? '¿Reactivar a ' + nombre + ' en Inglés en línea? Vuelve a su grupo, a la lista y al tablero con sus resultados.'
    : '¿Dar de baja de Inglés en línea a ' + nombre + '?\n\nSus resultados se conservan como historial. Ya no aparecerá en la lista, el tablero ni el resumen, y no verá las actividades ni el Meet de su grupo. Su acceso a Secundaria y a Juegos no cambia. Puedes reactivarla o reactivarlo cuando quieras.';
  if (!confirm(pregunta)) return;
  b.disabled = true;
  const r = await fetchJson(API_BASE + '/ingles/grupos/' + (reactivar ? 'reactivar' : 'baja') + '?email=' + encodeURIComponent(state.email), { method: 'POST', headers: { 'content-type': 'text/plain;charset=UTF-8' }, body: JSON.stringify({ email: b.dataset.email }) });
  if (!r.ok) { b.disabled = false; alert('No se pudo ' + (reactivar ? 'reactivar' : 'dar de baja') + ' (' + (r.body.error || r.status) + ').'); return; }
  state.altaAbierta = true;
  state.altaAviso = reactivar ? '↩️ ' + nombre + ' está de nuevo en Inglés.' : '🚪 ' + nombre + ' quedó de baja de Inglés. Sus resultados se conservan.';
  await loadFor(state.email);
}

// Juegos de la semana bajo demanda (openspec: panel-profe-peticiones): se piden al abrir «🎮 Juegos», «🧑‍🎓 Alumnos»
// o el cajón; al llegar se repintan la sección y la línea de cada alumno o alumna y la del cajón ([data-juegos-slot]).
function asegurarJuegosAdmin() {
  if (state.juegos !== undefined || state.cargandoJuegos) return;
  state.cargandoJuegos = true;
  loadJuegosAdmin().finally(() => { state.cargandoJuegos = false; pintarJuegosAdmin(); });
}
function pintarJuegosAdmin() {
  const j = document.getElementById('juegos-admin');
  if (j) { const abierto = j.open; j.outerHTML = renderJuegosAdmin(); if (abierto) document.getElementById('juegos-admin').open = true; }
  document.querySelectorAll('[data-juegos-slot]').forEach(el => { el.innerHTML = lineaJuegos(el.dataset.juegosSlot); });
}
async function loadJuegosAdmin() {
  try {
    const r = await fetchJson(API_BASE + '/juegos/admin/resumen?email=' + encodeURIComponent(state.email));
    state.juegos = r.ok ? r.body : { error: r.body.error || r.status };
  } catch (e) { state.juegos = { error: e.message }; }
}

function renderJuegosAdmin() {
  const j = state.juegos && state.juegos.jugadores ? { ...state.juegos, jugadores: state.juegos.jugadores.filter(x => !ocultoEnPanel(x.nombre)) } : state.juegos;
  const cuantos = j && j.jugadores ? j.jugadores.length : 0;
  const cab = '<details class="section" id="juegos-admin"><summary><div class="section-head"><span><span class="chevron">▶</span>🎮 Juegos de la semana</span>' +
    '<span class="count">' + (j === undefined ? '…' : cuantos) + '</span></div></summary><div style="padding:4px 12px 10px">';
  if (j === undefined) return cab + esqueleto() + '</div></details>'; // se piden al abrir la pestaña
  if (!j || j.error) return cab + '<div class="progress-text">No se pudieron cargar los juegos (' + escapeHtml(j && j.error) + ').</div></div></details>';
  if (!j.jugadores.length && !j.salas.length) return cab + '<div class="progress-text">Aún no hay juegos esta semana.</div></div></details>';
  const cuando = ms => new Date(ms).toLocaleString('es-MX', { weekday: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  const MEDALLAS = ['🥇', '🥈', '🥉'];
  const medalla = i => MEDALLAS[i] || (i + 1) + '.';
  // Avatar en un círculo de su color: la foto (si no carga, el emoji) o el emoji.
  const caraDe = av => av.foto
    ? '<img src="' + escapeHtml(API_BASE + '/juegos/foto/' + encodeURIComponent(av.foto)) + '" alt="" style="width:100%;height:100%;object-fit:cover" data-e="' + escapeHtml(av.emoji) + '" onerror="this.replaceWith(document.createTextNode(this.dataset.e))">'
    : escapeHtml(av.emoji);
  const avatarDe = av => '<span style="display:inline-grid;place-items:center;width:22px;height:22px;border-radius:50%;font-size:13px;vertical-align:middle;overflow:hidden;background:' + escapeHtml(av.color) + '">' + caraDe(av) + '</span> ';
  const ranking = '<div class="progress-text" style="margin:4px 0">🏆 Ranking de la semana (suma del mejor de cada juego)</div><table class="ultimas-tabla"><tbody>' +
    j.jugadores.map((x, i) => '<tr data-jugador="' + escapeHtml(x.nombre) + '"><td>' + medalla(i) + ' ' + (x.avatar ? avatarDe(x.avatar) : '') + escapeHtml(x.nombre) + (x.tipo === 'invitado' ? ' <small>(invitado)</small>' : '') + '</td>' +
      '<td>⭐ <b>' + (x.totalIndividual ?? x.total).toLocaleString('es-MX') + '</b> individuales · 👥 <b>' + (x.totalPartidas || 0).toLocaleString('es-MX') + '</b> partidas · ' + x.partidas + ' juego(s) jugados' + (x.ultima ? ' · ' + escapeHtml(cuando(Date.parse(x.ultima))) : '') + '</td></tr>').join('') + '</tbody></table>';
  const salas = j.salas.length ? '<div class="progress-text" style="margin:12px 0 4px">👥 Partidas de la semana</div>' + j.salas.map(s => {
    const podio = s.podio || s.jugadores.filter(x => x.final !== null).map(x => ({ nombre: x.nombre, total: x.final })).sort((a, b) => b.total - a.total);
    return '<div class="topic" data-sala="' + escapeHtml(s.codigo) + '"><div class="h"><span>' + escapeHtml((j.catalogo[s.juego] || s.juego)) + ' · 🔑 ' + escapeHtml(s.codigo) + '</span><span class="pill wait">' + escapeHtml(cuando(s.creada)) + '</span></div>' +
      '<div class="r">Anfitrión: ' + escapeHtml(s.host) + ' · ' + s.jugadores.length + ' persona(s)' + (s.bots ? ' + 2 bots' : '') + (s.inicio ? '' : ' · no empezó') + '</div>' +
      (podio.length ? '<div class="chips">' + podio.map((p, i) => '<span class="chip ' + (i === 0 ? 'fortaleza' : 'neutra') + '">' + medalla(i) + ' ' + escapeHtml(p.nombre) + ' ' + p.total.toLocaleString('es-MX') + '</span>').join('') + '</div>'
        : '<div class="progress-text">Sin resultados todavía.</div>') + '</div>';
  }).join('') : '';
  return cab + ranking + salas + '</div></details>';
}

// Hueco de la línea de juegos de un alumno o alumna: se llena cuando llegan los juegos (pintarJuegosAdmin).
const huecoJuegos = name => '<div data-juegos-slot="' + escapeHtml(name) + '">' + lineaJuegos(name) + '</div>';
function lineaJuegos(name) {
  const x = state.juegos && state.juegos.jugadores && state.juegos.jugadores.find(y => y.nombre === name);
  return x ? '<div class="progress-text" data-juegos-alumno>🎮 Juegos: ⭐ ' + (x.totalIndividual ?? x.total).toLocaleString('es-MX') + ' individuales · 👥 ' + (x.totalPartidas || 0).toLocaleString('es-MX') + ' partidas · ' + x.partidas + ' jugados</div>' : '';
}
