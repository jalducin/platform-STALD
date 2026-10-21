// Clases de Secundaria (?modo=secundaria, openspec: examen-secundaria y secundaria-mis-clases): la alumna o el alumno
// ve «📚 Mis clases» (hoy, la semana por día y lo demás) con chip y color por materia, y «🗓️ Mi horario» de 7 días;
// el admin ve los resultados por persona y por materia.
async function loadSecundaria(email) {
  const r = await fetchJson(ACT_URL + '?email=' + encodeURIComponent(email));
  if (!r.ok && StaldAuth.esSesionVencida({ status: r.status }, r.body)) return; // sesionVencida ya pintó la entrada
  loginEl.style.display = 'none'; appEl.style.display = 'block';
  if (!r.ok) {
    contentEl.innerHTML = r.status === 403
      ? vacio('🔒', 'Esta sección es solo para alumnos y alumnas de Secundaria.')
      : vacio('⚠️', 'No se pudo cargar (' + (r.body.error || r.status) + '). Intenta de nuevo en unos minutos.');
    return;
  }
  state.act = r.body; state.data = { isAdmin: !!r.body.isAdmin, rows: [] };
  render(state.data);
}

// ---------- Materia de cada clase ----------
// Nombre canónico y clave de color. Orden: el nombre más largo primero («Ciencias Sociales» antes que «Ciencias»).
const MATERIAS_SEC = [
  ['Ciencias Sociales', 'sociales'], ['Educación Física', 'edfisica'], ['Matemáticas', 'matematicas'], ['Tecnología', 'tecnologia'],
  ['Ciencias', 'ciencias'], ['Español', 'espanol'], ['Inglés', 'ingles'], ['Artes', 'artes'],
];
const DIAS_SEC = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const sinAcentos = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const EMOJI_INICIAL = /^[^\p{L}\p{N}]+/u;
function materiaConocida(texto) {
  const t = sinAcentos(texto);
  return MATERIAS_SEC.find(([n]) => t.includes(sinAcentos(n))) || null;
}
// `materia` del contenido; si falta, el prefijo del título antes de « · » (sin el emoji). Sin prefijo: sin materia.
function materiaDe(it) {
  const titulo = it.titulo || '';
  const i = titulo.indexOf(' · ');
  const prefijo = i < 0 ? '' : titulo.slice(0, i).replace(EMOJI_INICIAL, '').trim();
  const nombre = it.materia ? String(it.materia).trim() : prefijo;
  if (!nombre) return null;
  const c = materiaConocida(nombre);
  const canon = !it.materia && c ? c[0] : nombre;
  return { nombre: canon, clave: c ? c[1] : 'otra', enTitulo: !!prefijo && sinAcentos(prefijo) === sinAcentos(canon) };
}
// Texto de la fila: si el título empieza con la materia, solo el tema (la materia ya va en el chip).
function textoClase(it, m) {
  const titulo = it.titulo || '';
  const emoji = (titulo.match(EMOJI_INICIAL) || [''])[0].trim() || (it.tipo === 'examen' ? '📝' : '📘');
  const tema = m && m.enTitulo ? titulo.slice(titulo.indexOf(' · ') + 3) : titulo.replace(EMOJI_INICIAL, '');
  return emoji + ' ' + tema;
}
const chipMateria = m => m ? '<span class="chip mat-chip mat-' + m.clave + '">' + escapeHtml(m.nombre) + '</span>' : '';

// ---------- Fechas de la semana ----------
function sumarDias(fecha, n) { const d = new Date(fecha + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
function lunesDe(fecha) { const dow = new Date(fecha + 'T12:00:00Z').getUTCDay(); return sumarDias(fecha, -((dow + 6) % 7)); }
function nombreDia(fecha) { const d = new Date(fecha + 'T12:00:00Z'); return DIAS_SEC[d.getUTCDay()] + ' ' + d.getUTCDate(); }

// ---------- Vista de la alumna o el alumno ----------
function filaClase(it, conFecha) {
  const m = materiaDe(it);
  let sub = (it.tipo === 'examen' ? 'Examen' : 'Clase') + (conFecha ? ' · hasta el ' + escapeHtml(formatFecha(it.fechaLimite)) : '');
  if (it.intentosMax) sub += ' · ' + (it.intentosUsados || 0) + '/' + it.intentosMax + ' oportunidades';
  if (it.mejor) sub += ' · <span class="pill ok">⭐ ' + it.mejor.porcentaje + '% (tu mejor)</span>';
  return '<div class="exam-item sec-clase mat-' + (m ? m.clave : 'otra') + '" data-sec-item="' + escapeHtml(it.id) + '"' + (m ? ' data-materia="' + escapeHtml(m.nombre) + '"' : '') + '>' +
    '<div class="sec-clase-info"><div class="t">' + chipMateria(m) + '<span class="sec-tema">' + escapeHtml(textoClase(it, m)) + '</span></div><div class="s">' + sub + '</div></div>' + accionItem(it, it.estado) + '</div>';
}

function renderSecundaria(act) {
  const items = (act && act.items) || [];
  if (act && act.isAdmin) return renderSecundariaAdmin(items);
  if (!items.length) return vacio('📚', 'No tienes clases por ahora. ¡Aquí aparecerán cuando el profe las publique!');
  const hoy = act.hoy || fmtDate(new Date());
  const lunes = lunesDe(hoy), domingo = sumarDias(lunes, 6);
  const dias = Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i));
  const deDia = f => items.filter(it => it.fechaLimite === f);
  const enSemana = items.filter(it => it.fechaLimite >= lunes && it.fechaLimite <= domingo);
  const otras = items.filter(it => it.fechaLimite < lunes || it.fechaLimite > domingo);
  const deHoy = deDia(hoy);

  const panelHoy = '<div class="exam-card sec-bloque" id="sec-hoy"><h3>☀️ Hoy · ' + escapeHtml(nombreDia(hoy)) + '</h3>' +
    (deHoy.length ? deHoy.map(it => filaClase(it, false)).join('') : '<div class="pf-ok">Hoy no tienes clases. 🎉</div>') + '</div>';
  const panelSemana = '<div class="exam-card sec-bloque" id="sec-semana"><h3>📅 Esta semana</h3>' +
    (enSemana.length ? dias.map(f => {
      const suyas = deDia(f);
      return '<div class="sec-dia' + (f === hoy ? ' es-hoy' : '') + '" data-sec-dia="' + f + '"><h4>' + escapeHtml(nombreDia(f)) + (f === hoy ? ' <span class="chip">hoy</span>' : '') + '</h4>' +
        (suyas.length ? suyas.map(it => filaClase(it, false)).join('') : '<div class="pf-ok">Sin clases.</div>') + '</div>';
    }).join('') : '<div class="pf-ok">Sin clases esta semana.</div>') + '</div>';
  const panelOtras = otras.length ? '<div class="exam-card sec-bloque" id="sec-otras"><h3>📝 Otras clases y exámenes</h3>' + otras.map(it => filaClase(it, true)).join('') + '</div>' : '';
  const nota = '<p class="meta" style="margin-top:8px">En cada clase y examen se queda tu mejor calificación. Lee con calma cada pregunta. 💪</p>';

  const horario = '<div class="sec-horario" id="sec-horario-semana" aria-label="Horario de la semana">' + dias.map(f => {
    const suyas = deDia(f);
    return '<div class="sec-hor-dia' + (f === hoy ? ' es-hoy' : '') + '" data-sec-hor-dia="' + f + '"><h4>' + escapeHtml(nombreDia(f)) + (f === hoy ? ' <span class="chip">hoy</span>' : '') + '</h4>' +
      (suyas.length ? suyas.map(it => { const m = materiaDe(it); return '<div class="sec-hor-clase mat-' + (m ? m.clave : 'otra') + '" data-sec-hor-item="' + escapeHtml(it.id) + '"><b>' + escapeHtml(m ? m.nombre : textoClase(it, null)) + '</b>' + (it.tipo === 'examen' ? '<small>Examen</small>' : '') + '</div>'; }).join('') : '<div class="sec-hor-libre">Libre</div>') + '</div>';
  }).join('') + '</div>';

  const tab = state.secTab === 'horario' ? 'horario' : 'clases';
  const tabs = [['clases', '📚 Mis clases'], ['horario', '🗓️ Mi horario']];
  return '<div class="tabs sec-tabs" role="tablist" aria-label="Secundaria">' + tabs.map(([id, t]) => '<button type="button" class="tab" role="tab" id="sec-tab-' + id + '" data-sec-tab="' + id + '" aria-controls="sec-' + id + '" aria-selected="' + (id === tab) + '">' + t + '</button>').join('') + '</div>' +
    '<section id="sec-clases" role="tabpanel" data-sec-panel="clases" aria-labelledby="sec-tab-clases"' + (tab === 'clases' ? '' : ' hidden') + '>' + panelHoy + panelSemana + panelOtras + nota + '</section>' +
    '<section id="sec-horario" role="tabpanel" data-sec-panel="horario" aria-labelledby="sec-tab-horario"' + (tab === 'horario' ? '' : ' hidden') + '><div class="exam-card"><h3>🗓️ Mi horario · semana del ' + escapeHtml(nombreDia(lunes)) + '</h3>' + horario + '</div></section>';
}
// Cambio de pestaña sin redibujar (se conserva el scroll).
document.addEventListener('click', e => {
  const b = e.target.closest('[data-sec-tab]'); if (!b) return;
  state.secTab = b.dataset.secTab;
  document.querySelectorAll('[data-sec-tab]').forEach(x => x.setAttribute('aria-selected', String(x === b)));
  document.querySelectorAll('[data-sec-panel]').forEach(x => { x.hidden = x.dataset.secPanel !== state.secTab; });
});

// Admin: por examen, cada persona con su mejor calificación, oportunidades usadas y calificación por materia.
function renderSecundariaAdmin(items) {
  if (!items.length) return vacio('📝', 'Sin clases ni exámenes de Secundaria publicados.');
  return items.map(it => {
    const res = it.resultados || [];
    const filas = res.map(r => {
      const m = r.mejor || { porcentaje: null, secciones: [] };
      const materias = (m.secciones || []).map(s => '<span class="chip ' + escapeHtml(s.estado) + '">' + escapeHtml(s.titulo) + ' ' + s.porcentaje + '%</span>').join(' ');
      return '<div class="exam-item" data-sec-res="' + escapeHtml(r.alumno) + '"><div><div class="t">' + escapeHtml(r.alumno) + ' · <span class="pill ok">⭐ ' + (m.porcentaje == null ? '—' : m.porcentaje + '%') + '</span></div>' +
        '<div class="s">' + r.intentos.length + '/' + it.intentosMax + ' oportunidades usadas</div><div class="chips" style="margin-top:6px">' + materias + '</div></div></div>';
    }).join('');
    const para = it.alumnos && it.alumnos.length ? ' · solo para: ' + escapeHtml(it.alumnos.join(', ')) : '';
    return '<div class="exam-card" data-sec-admin="' + escapeHtml(it.id) + '"><h3>' + chipMateria(materiaDe(it)) + ' ' + (it.tipo === 'examen' ? '📝 ' : '') + escapeHtml(it.titulo) + '</h3>' +
      '<div class="meta">' + escapeHtml(formatFecha(it.disponibleDesde)) + ' → ' + escapeHtml(formatFecha(it.fechaLimite)) + ' · ' + it.preguntas + ' preguntas' + para + '</div>' +
      (filas || '<div class="pf-ok">Nadie lo ha resuelto todavía.</div>') +
      '<div style="margin-top:8px"><button class="btn ghost" data-action="abrir-item" data-id="' + escapeHtml(it.id) + '">👀 Vista previa</button></div></div>';
  }).join('');
}
