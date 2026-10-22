// Clases de Secundaria (?modo=secundaria, openspec: examen-secundaria, secundaria-mis-clases y secundaria-dashboard).
// Pestañas: «🏠 Inicio» (tablero, ingles/secundaria-inicio.js), «📅 Esta semana» (hoy, la semana por día y lo demás),
// «🗓️ Mi horario» (7 días) y «📚 Mis materias». El admin ve ese mismo tablero con los datos de una alumna
// (`?alumna=<slug>` del servidor, solo lectura) y, además, «📝 Resultados» por clase.
// Reglas puras (materia, día de la clase, estado, progreso, promedios y secuencias): comun/secundaria-datos.js.
const SD = window.SecundariaDatos;
// Fuentes del tablero RPG (Inter y Orbitron, Google Fonts), solo en modo Secundaria; si no cargan, quedan las del sistema.
if (MODO_SECUNDARIA) {
  const fuentes = document.createElement('link');
  fuentes.rel = 'stylesheet';
  fuentes.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=Orbitron:wght@700;900&display=swap';
  document.head.appendChild(fuentes);
}

// Pestañas: id interno → hash de la URL. «clases» conserva su id (#sec-clases) y se titula «📅 Esta semana».
const SEC_TABS = [
  { id: 'inicio', hash: 'inicio', titulo: '🏠 Inicio', corto: 'Inicio', emoji: '🏠' },
  { id: 'clases', hash: 'semana', titulo: '📅 Esta semana', corto: 'Semana', emoji: '📅' },
  { id: 'horario', hash: 'horario', titulo: '🗓️ Mi horario', corto: 'Horario', emoji: '🗓️' },
  { id: 'materias', hash: 'materias', titulo: '📚 Mis materias', corto: 'Materias', emoji: '📚' },
  { id: 'resultados', hash: 'resultados', titulo: '📝 Resultados', corto: 'Notas', emoji: '📝', soloAdmin: true },
];
const tabDeHash = h => { const t = SEC_TABS.find(x => x.hash === h || x.id === h); return t ? t.id : null; };

async function loadSecundaria(email) {
  // Con sesión el correo va en el token, no en la URL (openspec: secundaria-sin-notion).
  const q = StaldAuth.email() ? '' : '?email=' + encodeURIComponent(email);
  const pedida = new URLSearchParams(location.search).get('alumna');
  // Nombre para el saludo (/perfil) en paralelo; si falla, el saludo va sin nombre.
  const [r, perfil] = await Promise.all([fetchJson(ACT_URL + q), fetchJson(API_BASE + '/perfil' + q).catch(() => null)]);
  if (!r.ok && StaldAuth.esSesionVencida({ status: r.status }, r.body)) return; // sesionVencida ya pintó la entrada
  loginEl.style.display = 'none'; appEl.style.display = 'block';
  if (!r.ok) {
    contentEl.innerHTML = r.status === 403
      ? vacio('🔒', 'Esta sección es solo para alumnos y alumnas de Secundaria.')
      : vacio('⚠️', 'No se pudo cargar (' + (r.body.error || r.status) + '). Intenta de nuevo en unos minutos.');
    return;
  }
  state.secNombre = perfil && perfil.ok ? perfil.body.nombre || null : null;
  state.secLista = null;
  let act = r.body;
  if (act.isAdmin) {
    // Admin: la lista con resultados (📝 Resultados) y el tablero de una alumna (la pedida o la primera).
    state.secLista = act;
    const alumnas = act.alumnas || [];
    const elegida = alumnas.find(a => a.slug === pedida) || alumnas[0];
    if (elegida) {
      const v = await fetchJson(ACT_URL + (q ? q + '&' : '?') + 'alumna=' + encodeURIComponent(elegida.slug));
      act = v.ok ? v.body : { ...act, errorAlumna: v.body.error || v.status };
    }
  }
  // Pestaña inicial: la del hash; si recarga dentro de una clase (#ver/<id>), «📅 Esta semana», donde está su lista.
  if (!state.secTab) state.secTab = tabDeHash(decodeURIComponent(location.hash.slice(1))) || (location.hash.startsWith('#ver/') ? 'clases' : 'inicio');
  state.act = act; state.data = { isAdmin: !!r.body.isAdmin, rows: [] };
  render(state.data);
}

// ---------- Materia de cada clase (comun/secundaria-datos.js) ----------
const materiaDe = it => SD.materiaDe(it);
// Texto de la fila: el emoji del título (o 📝 / 📘) y el tema, sin la materia (ya va en el chip).
function textoClase(it, m) {
  const titulo = it.titulo || '';
  const emoji = (titulo.match(/^[^\p{L}\p{N}]+/u) || [''])[0].trim() || (it.tipo === 'examen' ? '📝' : '📘');
  return emoji + ' ' + (m ? SD.temaDe(it) : titulo.replace(/^[^\p{L}\p{N}]+/u, ''));
}
const chipMateria = m => m ? '<span class="chip mat-chip mat-' + m.clave + '">' + escapeHtml(m.nombre) + '</span>' : '';
const nombreDia = f => SD.nombreDia(f);

// ---------- «📅 Esta semana» y «🗓️ Mi horario» ----------
function filaClase(it, conFecha) {
  const m = materiaDe(it);
  let sub = (it.tipo === 'examen' ? 'Examen' : 'Clase') + (conFecha ? ' · hasta el ' + escapeHtml(formatFecha(it.fechaLimite)) : '');
  if (it.intentosMax) sub += ' · ' + (it.intentosUsados || 0) + '/' + it.intentosMax + ' oportunidades';
  if (it.mejor) sub += ' · <span class="pill ok">⭐ ' + it.mejor.porcentaje + '% (tu mejor)</span>';
  return '<div class="exam-item sec-clase mat-' + (m ? m.clave : 'otra') + '" data-sec-item="' + escapeHtml(it.id) + '"' + (m ? ' data-materia="' + escapeHtml(m.nombre) + '"' : '') + '>' +
    '<div class="sec-clase-info"><div class="t">' + chipMateria(m) + '<span class="sec-tema">' + escapeHtml(textoClase(it, m)) + '</span></div><div class="s">' + sub + '</div></div>' + accionItem(it, it.estado) + '</div>';
}

function panelSemana(items, hoy) {
  const dias = SD.semanaDe(hoy), lunes = dias[0], domingo = dias[6];
  const deDia = f => items.filter(it => SD.diaDeClase(it) === f);
  const enSemana = items.filter(it => SD.diaDeClase(it) >= lunes && SD.diaDeClase(it) <= domingo);
  const otras = items.filter(it => SD.diaDeClase(it) < lunes || SD.diaDeClase(it) > domingo);
  const deHoy = deDia(hoy);
  const panelHoy = '<div class="exam-card sec-bloque" id="sec-hoy"><h3>☀️ Hoy · ' + escapeHtml(nombreDia(hoy)) + '</h3>' +
    (deHoy.length ? deHoy.map(it => filaClase(it, false)).join('') : '<div class="pf-ok">Hoy no tienes clases. 🎉</div>') + '</div>';
  const semana = '<div class="exam-card sec-bloque" id="sec-semana"><h3>📅 Esta semana</h3>' +
    (enSemana.length ? dias.map(f => {
      const suyas = deDia(f);
      return '<div class="sec-dia' + (f === hoy ? ' es-hoy' : '') + '" data-sec-dia="' + f + '"><h4>' + escapeHtml(nombreDia(f)) + (f === hoy ? ' <span class="chip">hoy</span>' : '') + '</h4>' +
        (suyas.length ? suyas.map(it => filaClase(it, false)).join('') : '<div class="pf-ok">Sin clases.</div>') + '</div>';
    }).join('') : '<div class="pf-ok">Sin clases esta semana.</div>') + '</div>';
  const panelOtras = otras.length ? '<div class="exam-card sec-bloque" id="sec-otras"><h3>📝 Otras clases y exámenes</h3>' + otras.map(it => filaClase(it, true)).join('') + '</div>' : '';
  const nota = '<p class="meta" style="margin-top:8px">En cada clase y examen se queda tu mejor calificación. Lee con calma cada pregunta. 💪</p>';
  return panelHoy + semana + panelOtras + nota;
}

function panelHorario(items, hoy) {
  const dias = SD.horarioSemana(items, hoy);
  const horario = '<div class="sec-horario" id="sec-horario-semana" aria-label="Horario de la semana">' + dias.map(d =>
    '<div class="sec-hor-dia' + (d.esHoy ? ' es-hoy' : '') + '" data-sec-hor-dia="' + d.fecha + '"><h4>' + escapeHtml(nombreDia(d.fecha)) + (d.esHoy ? ' <span class="chip">hoy</span>' : '') + '</h4>' +
      (d.clases.length ? d.clases.map(it => { const m = materiaDe(it); return '<div class="sec-hor-clase mat-' + (m ? m.clave : 'otra') + '" data-sec-hor-item="' + escapeHtml(it.id) + '"><b>' + escapeHtml(m ? m.nombre : textoClase(it, null)) + '</b>' + (it.tipo === 'examen' ? '<small>Examen</small>' : '') + '</div>'; }).join('') : '<div class="sec-hor-libre">Libre</div>') + '</div>'
  ).join('') + '</div>';
  return '<div class="exam-card"><h3>🗓️ Mi horario · semana del ' + escapeHtml(nombreDia(dias[0].fecha)) + '</h3>' + horario + '</div>';
}

// ---------- Página ----------
function renderSecundaria(act) {
  const items = (act && act.items) || [];
  // Admin sin alumnas de Secundaria (o sin su vista): solo los resultados por clase.
  if (act && act.isAdmin && !act.vistaDe) {
    const aviso = act.errorAlumna ? '<div class="exam-card"><div class="pf-ok">No se pudo cargar el tablero de la alumna (' + escapeHtml(act.errorAlumna) + ').</div></div>' : '';
    return aviso + renderSecundariaAdmin(((state.secLista || act).items) || []);
  }
  if (!items.length && !(act && act.isAdmin)) return vacio('📚', 'No tienes clases por ahora. ¡Aquí aparecerán cuando el profe las publique!');
  const hoy = act.hoy || fmtDate(new Date());
  const admin = !!(act && act.isAdmin);
  const tabs = SEC_TABS.filter(t => !t.soloAdmin || admin);
  const tab = tabs.some(t => t.id === state.secTab) ? state.secTab : 'inicio';
  const cuerpo = {
    inicio: () => renderSecInicio(act, { hoy, nombre: admin ? act.vistaDe.nombre : state.secNombre, admin }),
    clases: () => panelSemana(items, hoy),
    horario: () => panelHorario(items, hoy),
    materias: () => renderSecMaterias(items, hoy),
    resultados: () => renderSecundariaAdmin(((state.secLista || {}).items) || []),
  };
  return (admin ? selectorAlumna(act) : '') +
    '<div class="tabs sec-tabs" role="tablist" aria-label="Secundaria">' + tabs.map(t =>
      '<button type="button" class="tab" role="tab" id="sec-tab-' + t.id + '" data-sec-tab="' + t.id + '" aria-controls="sec-' + t.id + '" aria-selected="' + (t.id === tab) + '" tabindex="' + (t.id === tab ? '0' : '-1') + '">' +
      '<span class="sec-tab-emoji" aria-hidden="true">' + t.emoji + '</span><span class="sec-tab-largo">' + escapeHtml(t.titulo.slice(t.titulo.indexOf(' ') + 1)) + '</span><span class="sec-tab-corto" aria-hidden="true">' + escapeHtml(t.corto) + '</span></button>').join('') + '</div>' +
    tabs.map(t => '<section id="sec-' + t.id + '" class="sec-panel" role="tabpanel" data-sec-panel="' + t.id + '" aria-labelledby="sec-tab-' + t.id + '"' + (t.id === tab ? '' : ' hidden') + '>' + cuerpo[t.id]() + '</section>').join('');
}

// Cambio de pestaña sin redibujar (se conserva el estado); el hash guarda la pestaña para volver a ella al salir de
// una clase y para enlazarla (p. ej. secundaria.html#horario desde el portal).
function irPestanaSec(id, enfocar) {
  if (!document.getElementById('sec-' + id)) return;
  state.secTab = id;
  document.querySelectorAll('.sec-tabs [data-sec-tab]').forEach(x => { const sel = x.dataset.secTab === id; x.setAttribute('aria-selected', String(sel)); x.tabIndex = sel ? 0 : -1; });
  document.querySelectorAll('[data-sec-panel]').forEach(x => { x.hidden = x.dataset.secPanel !== id; });
  const t = SEC_TABS.find(x => x.id === id);
  if (t && !location.hash.startsWith('#ver/')) history.replaceState(null, '', location.pathname + location.search + '#' + t.hash);
  if (enfocar) { const b = document.getElementById('sec-tab-' + id); if (b) { b.focus(); b.scrollIntoView({ block: 'nearest' }); } }
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-sec-tab]'); if (!b) return;
  irPestanaSec(b.dataset.secTab, !b.closest('.sec-tabs')); // desde un acceso del Inicio, el foco va a la pestaña
});
// Teclado en las pestañas (← → Inicio Fin), como pide el patrón de tabs.
document.addEventListener('keydown', e => {
  const b = e.target.closest && e.target.closest('.sec-tabs [data-sec-tab]'); if (!b) return;
  const lista = [...document.querySelectorAll('.sec-tabs [data-sec-tab]')];
  const i = lista.indexOf(b);
  const j = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: lista.length - 1 }[e.key];
  if (j === undefined) return;
  e.preventDefault();
  irPestanaSec(lista[(j + lista.length) % lista.length].dataset.secTab, true);
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
