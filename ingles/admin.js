// Inglés · vista del admin (profe del grupo): grupos, alumnos y alumnas, juegos, tablero y cajón.
// Resumen de juegos de la semana (solo admin): jugadores y partidas con su podio.
// ---------- Alta de alumnos y alumnas (admin, openspec: alta-alumnos) ----------
// ---------- Grupos de clase (openspec: ingles-grupos) ----------
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
const chipGrupo = g => g ? '<span class="grupo-chip"><span class="grupo-sw" style="background:' + escapeHtml(g.color) + ';margin:0"></span>' + escapeHtml(g.nombre) + '</span>' : '';
const opcionesGrupo = sel => gruposActivos().map(g => '<option value="' + escapeHtml(g.id) + '"' + (g.id === sel ? ' selected' : '') + '>' + escapeHtml(g.nombre) + '</option>').join('');
function renderFiltroGrupo() {
  if (!state.grupos) return '';
  return '<div class="grupos-barra"><label for="grupo-filtro">👥 Grupo</label><select id="grupo-filtro"><option value="">Todos los grupos</option>' + opcionesGrupo(state.grupoFiltro) + '</select></div>';
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
    lista.map(g => '<div class="grupo-fila" style="--gc:' + escapeHtml(g.color) + '"><div><span class="grupo-sw" style="background:' + escapeHtml(g.color) + '"></span><b>' + escapeHtml(g.nombre) + '</b>' + (g.activo ? '' : ' <small>(inactivo)</small>') +
      '<br><small>' + [g.nivel, g.horario].filter(Boolean).map(escapeHtml).join(' · ') + ' · 👤 ' + personas(cuantos(g.id)) + '</small></div>' +
      (g.meet_url ? '<a class="btn ghost" href="' + escapeHtml(g.meet_url) + '" target="_blank" rel="noopener">🎥 Meet</a>' : '') +
      '<button class="btn ghost" data-action="editar-grupo" data-id="' + escapeHtml(g.id) + '">✏️ Editar</button></div>').join('') +
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

async function loadAlumnosAdmin() {
  try {
    const r = await fetchJson(API_BASE + '/ingles/alumnos?email=' + encodeURIComponent(state.email));
    state.alumnosAdmin = r.ok ? r.body.alumnos : { error: r.body.error || r.status };
  } catch (e) { state.alumnosAdmin = { error: e.message }; }
}

function renderAlumnosAdmin() {
  const a = state.alumnosAdmin;
  const todos = Array.isArray(a) ? a : [];
  // Baja de Inglés reversible (openspec: ingles-baja-alumno): las bajas van aparte, con «Reactivar».
  const lista = todos.filter(x => !x.baja), bajas = todos.filter(x => x.baja);
  // Cada persona es una tarjeta (openspec: ingles-diseno-profe): avatar con el color de su grupo, datos y acciones.
  const tarjeta = (x, extra, cuerpo, acciones) => {
    const g = grupoDeNombre(x.nombre);
    return '<div class="ultimas-lista reg-fila' + extra + '" style="--gc:' + escapeHtml((g && g.color) || '#4f46e5') + '"' + (x.baja ? ' data-baja="' + escapeHtml(x.emails[0]) + '"' : '') + '>' +
      '<span class="avatar" aria-hidden="true">' + escapeHtml(iniciales(x.nombre)) + '</span>' +
      '<div class="reg-datos"><b>' + escapeHtml(x.nombre) + '</b><small>' + cuerpo + '</small></div>' +
      '<div class="reg-acciones">' + acciones + '</div></div>';
  };
  const datos = x => ' data-email="' + escapeHtml(x.emails[0]) + '" data-nombre="' + escapeHtml(x.nombre) + '"';
  return '<details class="section" id="alumnos-admin"' + (state.altaAbierta === false ? '' : ' open') + '><summary><div class="section-head"><span><span class="chevron">▶</span>👥 Alumnos y alumnas</span><span class="count">' + lista.length + '</span></div></summary><div class="scroll">' +
    '<form id="alta-alumno" class="reg-form" autocomplete="off">' +
      '<p class="reg-intro">➕ Nuevo alumno o alumna: entra con su correo a Inglés, al portal y a Juegos. Empieza su curso el lunes siguiente, sin actividades en atraso.</p>' +
      '<label class="campo-et" for="alta-nombre">Nombre<input id="alta-nombre" type="text" maxlength="40" placeholder="Como aparecerá en sus calificaciones" required></label>' +
      '<label class="campo-et" for="alta-correo">Correo<input id="alta-correo" type="email" maxlength="80" placeholder="correo@ejemplo.com" required></label>' +
      (state.grupos ? '<label class="campo-et" for="alta-grupo">Grupo<select id="alta-grupo">' + opcionesGrupo(state.grupoFiltro || (gruposActivos()[0] || {}).id) + '</select></label>' : '') +
      '<button class="btn reg-enviar" type="submit">➕ Dar de alta</button><div id="alta-msg" role="status"></div></form>' +
    (a && a.error ? '<div class="reg-error" role="alert">No se pudo cargar la lista (' + escapeHtml(a.error) + ').</div>' : '') +
    '<div class="reg-lista">' + lista.map(x => tarjeta(x, '',
      escapeHtml(x.emails.join(', ')) + ' · alta en la página' + (x.inicio ? ' · 📅 inicia el lunes ' + escapeHtml(fechaCorta(x.inicio)) : ''),
      (state.grupos ? '<select class="mover-grupo" data-mover="1" data-alumno="' + escapeHtml(x.nombre) + '" aria-label="Grupo de ' + escapeHtml(x.nombre) + '">' + opcionesGrupo((grupoDeNombre(x.nombre) || {}).id) + '</select>' : '') +
      '<button class="btn ghost" data-action="baja-ingles"' + datos(x) + '>🚪 Baja de Inglés</button>' +
      '<button class="btn ghost" data-action="quitar-alumno"' + datos(x) + '>Quitar</button>')).join('') + '</div>' +
    (bajas.length ? '<div id="bajas-ingles"><p class="reg-subt">🗂️ De baja de Inglés (' + bajas.length + ') · sus resultados se conservan como historial</p><div class="reg-lista">' +
      bajas.map(x => tarjeta(x, ' de-baja', escapeHtml(x.emails.join(', ')) + ' · de baja desde el ' + escapeHtml(fechaCorta(x.baja)),
        '<button class="btn ghost" data-action="reactivar-ingles"' + datos(x) + '>↩️ Reactivar</button>')).join('') + '</div></div>' : '') +
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

async function loadJuegosAdmin() {
  try {
    const r = await fetchJson(API_BASE + '/juegos/admin/resumen?email=' + encodeURIComponent(state.email));
    state.juegos = r.ok ? r.body : { error: r.body.error || r.status };
  } catch (e) { state.juegos = { error: e.message }; }
}

function renderJuegosAdmin() {
  const j = state.juegos;
  const cab = '<details class="section" id="juegos-admin"><summary><div class="section-head"><span><span class="chevron">▶</span>🎮 Juegos de la semana</span>' +
    '<span class="count">' + (j && j.jugadores ? j.jugadores.length : 0) + '</span></div></summary><div style="padding:4px 12px 10px">';
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

function lineaJuegos(name) {
  const x = state.juegos && state.juegos.jugadores && state.juegos.jugadores.find(y => y.nombre === name);
  return x ? '<div class="progress-text" data-juegos-alumno>🎮 Juegos: ⭐ ' + (x.totalIndividual ?? x.total).toLocaleString('es-MX') + ' individuales · 👥 ' + (x.totalPartidas || 0).toLocaleString('es-MX') + ' partidas · ' + x.partidas + ' jugados</div>' : '';
}
