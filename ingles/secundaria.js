// Exámenes de Secundaria (?modo=secundaria, openspec: examen-secundaria): la alumna o el alumno ve sus exámenes con
// sus oportunidades y su mejor calificación; el admin ve los resultados por persona y por materia.
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

function renderSecundaria(act) {
  const items = (act && act.items) || [];
  if (act && act.isAdmin) return renderSecundariaAdmin(items);
  if (!items.length) return vacio('📝', 'No tienes exámenes por ahora. ¡Aquí aparecerán cuando el profe los publique!');
  const fila = it => {
    let sub = 'Hasta el ' + escapeHtml(formatFecha(it.fechaLimite)) + ' · ' + (it.intentosUsados || 0) + '/' + it.intentosMax + ' oportunidades';
    if (it.mejor) sub += ' · <span class="pill ok">⭐ ' + it.mejor.porcentaje + '% (tu mejor)</span>';
    return '<div class="exam-item" data-sec-item="' + escapeHtml(it.id) + '"><div><div class="t">📝 ' + escapeHtml(it.titulo) + '</div><div class="s">' + sub + '</div></div>' + accionItem(it, it.estado) + '</div>';
  };
  return '<div class="exam-card" id="sec-examenes"><h3>📝 Mis exámenes</h3>' + items.map(fila).join('') +
    '<p class="meta" style="margin-top:8px">Tienes ' + items[0].intentosMax + ' oportunidades por examen y se queda tu mejor calificación. Lee con calma cada pregunta. 💪</p></div>';
}

// Admin: por examen, cada persona con su mejor calificación, oportunidades usadas y calificación por materia.
function renderSecundariaAdmin(items) {
  if (!items.length) return vacio('📝', 'Sin exámenes de Secundaria publicados.');
  return items.map(it => {
    const res = it.resultados || [];
    const filas = res.map(r => {
      const m = r.mejor || { porcentaje: null, secciones: [] };
      const materias = (m.secciones || []).map(s => '<span class="chip ' + escapeHtml(s.estado) + '">' + escapeHtml(s.titulo) + ' ' + s.porcentaje + '%</span>').join(' ');
      return '<div class="exam-item" data-sec-res="' + escapeHtml(r.alumno) + '"><div><div class="t">' + escapeHtml(r.alumno) + ' · <span class="pill ok">⭐ ' + (m.porcentaje == null ? '—' : m.porcentaje + '%') + '</span></div>' +
        '<div class="s">' + r.intentos.length + '/' + it.intentosMax + ' oportunidades usadas</div><div class="chips" style="margin-top:6px">' + materias + '</div></div></div>';
    }).join('');
    const para = it.alumnos && it.alumnos.length ? ' · solo para: ' + escapeHtml(it.alumnos.join(', ')) : '';
    return '<div class="exam-card" data-sec-admin="' + escapeHtml(it.id) + '"><h3>📝 ' + escapeHtml(it.titulo) + '</h3>' +
      '<div class="meta">' + escapeHtml(formatFecha(it.disponibleDesde)) + ' → ' + escapeHtml(formatFecha(it.fechaLimite)) + ' · ' + it.preguntas + ' preguntas' + para + '</div>' +
      (filas || '<div class="pf-ok">Nadie lo ha resuelto todavía.</div>') +
      '<div style="margin-top:8px"><button class="btn ghost" data-action="abrir-item" data-id="' + escapeHtml(it.id) + '">👀 Vista previa</button></div></div>';
  }).join('');
}
