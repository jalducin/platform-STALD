// Inglés · vista del admin (profe del grupo): grupos, alumnos y alumnas, juegos, tablero y cajón.
// Resumen de juegos de la semana (solo admin): jugadores y partidas con su podio.
// ---------- Alta de alumnos y alumnas (admin, openspec: alta-alumnos) ----------
// ---------- Grupos de clase (openspec: ingles-grupos) ----------
const slugAlumno = n => (n || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().split(/[^a-z0-9]/).filter(Boolean).join('-') || 'sin-nombre';
async function loadGruposAdmin() {
  try {
    const r = await fetchJson(API_BASE + '/ingles/grupos?email=' + encodeURIComponent(state.email));
    state.grupos = r.ok ? r.body : null; // 503 sin_base: los grupos aún no están activos
  } catch (e) { state.grupos = null; }
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
  const cuantos = id => Object.values(state.grupos.miembros).filter(x => x === id).length;
  const e = state.grupoEdicion || {};
  return '<details class="section" id="grupos-admin"' + (state.gruposAbierto === false ? '' : ' open') + '><summary><div class="section-head"><span><span class="chevron">▶</span>👥 Grupos</span><span class="count">' + lista.length + '</span></div></summary><div class="scroll">' +
    '<form class="grupo-form" id="grupo-form" autocomplete="off"><input type="hidden" id="g-id" value="' + escapeHtml(e.id || '') + '">' +
      '<input id="g-nombre" maxlength="60" placeholder="Nombre (Sábado A1)" required value="' + escapeHtml(e.nombre || '') + '">' +
      '<input id="g-nivel" maxlength="20" placeholder="Nivel (A1)" value="' + escapeHtml(e.nivel || '') + '">' +
      '<input id="g-horario" maxlength="60" placeholder="Horario (Sáb 10:00)" value="' + escapeHtml(e.horario || '') + '">' +
      '<input id="g-meet" maxlength="200" placeholder="https://meet.google.com/…" value="' + escapeHtml(e.meet_url || '') + '">' +
      '<input id="g-color" type="color" value="' + escapeHtml(e.color || '#4f46e5') + '" aria-label="Color del grupo">' +
      '<button class="btn" type="submit">' + (e.id ? '💾 Guardar cambios' : '➕ Crear grupo') + '</button><div id="grupo-msg"></div></form>' +
    lista.map(g => '<div class="grupo-fila"><div><span class="grupo-sw" style="background:' + escapeHtml(g.color) + '"></span><b>' + escapeHtml(g.nombre) + '</b>' + (g.activo ? '' : ' <small>(inactivo)</small>') +
      '<br><small>' + [g.nivel, g.horario].filter(Boolean).map(escapeHtml).join(' · ') + (g.meet_url ? ' · <a class="link" href="' + escapeHtml(g.meet_url) + '" target="_blank" rel="noopener">🎥 Meet</a>' : '') + ' · 👤 ' + cuantos(g.id) + ' inscritos</small></div>' +
      '<button class="btn ghost sm" data-action="editar-grupo" data-id="' + escapeHtml(g.id) + '">✏️ Editar</button></div>').join('') +
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
  if (!r.ok) { form.querySelector('button').disabled = false; msg.innerHTML = '<div class="empty" style="color:var(--bad)">No se pudo guardar (' + escapeHtml({ nombre_invalido: 'escribe un nombre', meet_invalido: 'el enlace de Meet debe empezar con https://', color_invalido: 'color inválido' }[r.body.error] || r.body.error || r.status) + ').</div>'; return; }
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
  const lista = Array.isArray(a) ? a : [];
  return '<details class="section" id="alumnos-admin"' + (state.altaAbierta === false ? '' : ' open') + '><summary><div class="section-head"><span><span class="chevron">▶</span>👥 Alumnos y alumnas</span><span class="count">' + lista.length + '</span></div></summary><div class="scroll">' +
    '<form id="alta-alumno" autocomplete="off" style="display:grid;gap:8px;margin:6px 0 12px">' +
      '<div class="progress-text" style="margin:0">➕ Nuevo alumno o alumna: entra con su correo a Inglés, al portal y a Juegos. Empieza su curso el lunes siguiente, sin actividades en atraso.</div>' +
      '<input id="alta-nombre" type="text" maxlength="40" placeholder="Nombre (como aparecerá en sus calificaciones)" required style="padding:10px;border-radius:10px;border:1px solid var(--border);font:inherit">' +
      '<input id="alta-correo" type="email" maxlength="80" placeholder="correo@ejemplo.com" required style="padding:10px;border-radius:10px;border:1px solid var(--border);font:inherit">' +
      (state.grupos ? '<select id="alta-grupo" aria-label="Grupo" style="padding:10px;border-radius:10px;border:1px solid var(--border);font:inherit">' + opcionesGrupo(state.grupoFiltro || (gruposActivos()[0] || {}).id) + '</select>' : '') +
      '<button class="btn" type="submit">Dar de alta</button><div id="alta-msg"></div></form>' +
    (a && a.error ? '<div class="empty">No se pudo cargar la lista (' + escapeHtml(a.error) + ').</div>' : '') +
    lista.map(x => '<div class="ultimas-lista" style="display:flex;justify-content:space-between;align-items:center;gap:8px"><div>👤 <b>' + escapeHtml(x.nombre) + '</b><br><small>' +
      escapeHtml(x.emails.join(', ') || 'sin correo en Notion') + ' · ' + (x.origen === 'registro' ? 'alta en la página' : 'Notion') + (x.inicio ? ' · 📅 inicia el lunes ' + escapeHtml(fechaCorta(x.inicio)) : '') + '</small></div>' +
      (state.grupos ? '<select class="mover-grupo" data-mover="1" data-alumno="' + escapeHtml(x.nombre) + '" aria-label="Grupo de ' + escapeHtml(x.nombre) + '">' + opcionesGrupo((grupoDeNombre(x.nombre) || {}).id) + '</select>' : '') +
      (x.origen === 'registro' ? '<button class="btn ghost" data-action="quitar-alumno" data-email="' + escapeHtml(x.emails[0]) + '" data-nombre="' + escapeHtml(x.nombre) + '">Quitar</button>' : '') + '</div>').join('') +
    '</div></details>';
}

const ERRORES_ALTA = { correo_invalido: 'Escribe un correo válido.', nombre_invalido: 'Escribe un nombre de 2 a 40 letras.', correo_en_uso: 'Ese correo ya tiene acceso.', nombre_en_uso: 'Ya hay alguien con ese nombre y correo. Usa otro nombre (por ejemplo, con apellido).' };
async function altaAlumno(form) {
  const msg = document.getElementById('alta-msg');
  const nombre = document.getElementById('alta-nombre').value, email = document.getElementById('alta-correo').value;
  form.querySelector('button').disabled = true;
  const grupoSel = document.getElementById('alta-grupo');
  const r = await fetchJson(API_BASE + '/ingles/alumnos?email=' + encodeURIComponent(state.email), { method: 'POST', headers: { 'content-type': 'text/plain;charset=UTF-8' }, body: JSON.stringify(Object.assign({ nombre, email }, grupoSel && grupoSel.value ? { grupo: grupoSel.value } : {})) });
  if (!r.ok) { form.querySelector('button').disabled = false; msg.innerHTML = '<div class="empty" style="color:var(--bad)">' + escapeHtml(ERRORES_ALTA[r.body.error] || ('No se pudo dar de alta (' + (r.body.error || r.status) + ').')) + '</div>'; return; }
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
  const medalla = i => i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i + 1) + '.';
  const ranking = '<div class="progress-text" style="margin:4px 0">🏆 Ranking de la semana (suma del mejor de cada juego)</div><table class="ultimas-tabla"><tbody>' +
    j.jugadores.map((x, i) => '<tr data-jugador="' + escapeHtml(x.nombre) + '"><td>' + medalla(i) + ' ' + (x.avatar ? '<span style="display:inline-grid;place-items:center;width:22px;height:22px;border-radius:50%;font-size:13px;vertical-align:middle;overflow:hidden;background:' + escapeHtml(x.avatar.color) + '">' +
      (x.avatar.foto ? '<img src="' + escapeHtml(API_BASE + '/juegos/foto/' + encodeURIComponent(x.avatar.foto)) + '" alt="" style="width:100%;height:100%;object-fit:cover" data-e="' + escapeHtml(x.avatar.emoji) + '" onerror="this.replaceWith(document.createTextNode(this.dataset.e))">' : escapeHtml(x.avatar.emoji)) + '</span> ' : '') + escapeHtml(x.nombre) + (x.tipo === 'invitado' ? ' <small>(invitado)</small>' : '') + '</td>' +
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
