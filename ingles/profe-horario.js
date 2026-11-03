// Inglés · ruta del profe: pestañas «🗓️ Mi horario» y «🧭 Por materia» (openspec: profe-horario-materias).
// Solo dibuja: materia, estado, semana, progreso y agrupación salen de comun/profe-horario-datos.js (`ProfeHorario`).
// Lo usa ingles/profe.js (pestañas `horario` y `materias`, solo con plan.json). El filtro por materia es uno solo para
// las dos pestañas y se recuerda en este navegador; la semana elegida vive solo en esta visita.
const PH_FILTRO_KEY = 'profe_materia';
let phLunes = null; // lunes de la semana a la vista; null = la de hoy

const hayHorarioProfe = act => !!(act && act.plan && window.ProfeHorario);
function phFiltro(tareas) {
  let f = '';
  try { f = localStorage.getItem(PH_FILTRO_KEY) || ''; } catch { /* sin almacenamiento: todas */ }
  return f && tareas.some(t => t.materia === f) ? f : '';
}
const phHoy = act => (act && act.hoy) || todayStr();
// Clase de color por materia (texto, ícono y borde; el nombre siempre va escrito: el color no es la única señal).
const phClase = m => 'ph-m-' + ProfeHorario.infoMateria(m).clave;
const phEstado = e => { const x = ProfeHorario.ESTADOS[e]; return '<span class="ph-estado ph-est-' + e + '"><span aria-hidden="true">' + x.icono + '</span> ' + x.texto + '</span>'; };
const phGrupo = t => (t.grupo ? '<span class="ph-tag-grupo"><span aria-hidden="true">👥</span> Grupo</span>' : '');
// Clase en vivo (meet) que imparte el profe: etiqueta, hora si la trae y, en lugar del botón, la liga del Meet.
const phVivo = t => (t.meet ? '<span class="ph-vivo" data-ph-vivo><span aria-hidden="true">🎥</span> Clase en vivo</span>' + (t.hora ? '<span class="ph-hora" data-ph-hora>' + escapeHtml(t.hora) + '</span>' : '') : '');
const phTipo = t => phVivo(t) + phGrupo(t);
function phBoton(t) {
  if (t.meet) return t.meetUrl ? '<a class="btn ghost ph-abrir" href="' + escapeHtml(t.meetUrl) + '" target="_blank" rel="noopener" data-ph-meet aria-label="' + escapeHtml('Abrir Meet: ' + t.titulo) + '"><span aria-hidden="true">🎥</span> Abrir Meet</a>' : '';
  const it = t.item;
  if (!it) return '<span class="ph-pronto"><span aria-hidden="true">🗓️</span> Llega pronto</span>';
  const etiqueta = ' aria-label="' + escapeHtml((ProfeHorario.esHechaEstado(t.estado) ? 'Ver resultado: ' : 'Abrir: ') + t.titulo) + '"';
  if (ProfeHorario.esHechaEstado(t.estado)) return '<button type="button" class="btn ghost ph-abrir" data-action="ver-resultado" data-id="' + escapeHtml(it.id) + '"' + etiqueta + '>Ver resultado</button>';
  return '<button type="button" class="btn ph-abrir" data-action="abrir-item" data-id="' + escapeHtml(it.id) + '"' + etiqueta + '>' + (it.estado === 'en-curso' ? 'Continuar' : 'Abrir') + ' <span aria-hidden="true">→</span></button>';
}

// ---------- Filtro y progreso (comunes a las dos pestañas) ----------
function phChips(todas, filtro, donde) {
  const materias = ProfeHorario.materiasDe(todas);
  const tareas = ProfeHorario.contables(todas); // los meets no cuentan como tarea
  const chip = (valor, html, n) => '<button type="button" class="ph-chip' + (valor ? ' ' + phClase(valor) : '') + '" data-ph-filtro="' + escapeHtml(valor) + '" data-ph-donde="' + donde + '" aria-pressed="' + (valor === filtro) + '">' + html + (n !== null ? ' <span class="ph-n">' + n + '</span>' : '') + '</button>';
  return '<div class="ph-filtro" role="group" aria-label="Filtrar por materia">' + chip('', '<span aria-hidden="true">✨</span> Todas', tareas.length) +
    materias.map(m => chip(m, '<span aria-hidden="true">' + ProfeHorario.infoMateria(m).icono + '</span> ' + escapeHtml(m), tareas.filter(t => t.materia === m).length)).join('') + '</div>';
}
function phBarra(p) {
  return '<div class="rpg-xp-barra ph-barra" role="progressbar" aria-label="Avance de ' + escapeHtml(p.materia) + '" aria-valuemin="0" aria-valuemax="' + p.total + '" aria-valuenow="' + p.hechas + '" aria-valuetext="' + p.hechas + ' de ' + p.total + '"><span style="width:' + p.pct + '%"></span></div>';
}
function phProgreso(act, tareas, filtro) {
  const prog = ProfeHorario.progresoPorMateria(tareas, act.plan.materias);
  if (!prog.length) return '';
  return '<section class="ph-progreso" id="ph-progreso" aria-labelledby="ph-progreso-t"><h4 class="ph-sub" id="ph-progreso-t">📊 Progreso por materia</h4><ul class="ph-prog-lista">' +
    prog.map(p => '<li class="ph-prog ' + phClase(p.materia) + (filtro && filtro !== p.materia ? ' ph-atenuada' : '') + '" data-ph-prog="' + escapeHtml(p.materia) + '">' +
      '<div class="ph-prog-top"><span class="ph-prog-nom"><span aria-hidden="true">' + p.icono + '</span> ' + escapeHtml(p.materia) + '</span><b class="ph-prog-n">' + p.hechas + '/' + p.total + '</b></div>' + phBarra(p) +
      '<small class="ph-prog-cierre">' + (p.cierre ? 'Cierra el ' + escapeHtml(ProfeHorario.fechaCorta(p.cierre)) : 'Sin fecha de cierre') + ' · ' + p.pct + ' %</small></li>').join('') + '</ul></section>';
}

// ---------- 🗓️ Mi horario ----------
function phTarea(t) {
  const m = ProfeHorario.infoMateria(t.materia);
  return '<li class="ph-tarea ' + phClase(t.materia) + ' ph-t-' + t.estado + (t.meet ? ' ph-t-meet' : '') + '" data-ph-tarea="' + escapeHtml(t.id) + '" data-materia="' + escapeHtml(t.materia) + '" data-estado="' + t.estado + '">' +
    '<div class="ph-tarea-top"><span class="ph-mat"><span aria-hidden="true">' + m.icono + '</span> ' + escapeHtml(t.materia) + '</span>' + phTipo(t) + '</div>' +
    '<b class="ph-titulo">' + escapeHtml(t.titulo) + '</b>' +
    '<div class="ph-tarea-pie">' + phEstado(t.estado) + phBoton(t) + '</div></li>';
}
function phDia(d) {
  const id = 'ph-dia-t-' + d.fecha;
  const [nom, ...resto] = ProfeHorario.nombreDia(d.fecha).split(' ');
  // Día libre: estado vacío cuidado (en oficina, sin tareas en página que hacer).
  const libre = '<div class="ph-libre"><span class="ph-libre-ico" aria-hidden="true">' + (d.oficina ? '☕' : '🌿') + '</span><b>Día libre</b><small>' +
    (d.oficina ? 'Nada que hacer en la oficina.' : 'Buen momento para adelantar algo.') + '</small></div>';
  return '<section class="ph-dia' + (d.esHoy ? ' es-hoy' : '') + (d.oficina ? ' oficina' : '') + '" data-ph-dia="' + d.fecha + '" aria-labelledby="' + id + '"' + (d.esHoy ? ' aria-current="date"' : '') + '>' +
    '<header class="ph-dia-top"><h5 class="ph-dia-t" id="' + id + '">' + (d.oficina ? '<span class="ph-sello" aria-hidden="true">🏢</span>' : '') + '<span class="ph-dia-nom">' + escapeHtml(nom) + '</span> <span class="ph-dia-fecha">' + escapeHtml(resto.join(' ')) + '</span></h5>' +
    (d.esHoy ? '<span class="ph-hoy"><span aria-hidden="true">✨</span> Hoy</span>' : '') + '<span class="ph-cupo" title="Tareas del día y máximo de tu calendario (sin clases en vivo)">' + ProfeHorario.contables(d.tareas).length + ' · máx. ' + d.max + '</span></header>' +
    (d.oficina ? '<p class="ph-oficina" data-ph-oficina>Día de oficina: solo en página</p>' : '') +
    (d.tareas.length ? '<ul class="ph-lista">' + d.tareas.map(phTarea).join('') + '</ul>' : libre) + '</section>';
}
function renderHorarioProfe(act) {
  if (!hayHorarioProfe(act)) return '';
  const hoy = phHoy(act);
  const tareas = ProfeHorario.tareasRuta(act);
  if (!tareas.length) return '<div class="pf-ok">Tu ruta todavía no tiene tareas con fecha.</div>';
  const filtro = phFiltro(tareas);
  const rango = ProfeHorario.rangoSemanas(tareas);
  const deHoy = ProfeHorario.lunesDe(hoy);
  const lunes = phLunes || deHoy;
  const oficina = ProfeHorario.diasOficinaDe(act.plan);
  const dias = ProfeHorario.semanaHorario(tareas, lunes, hoy, filtro, oficina);
  const sem = (act.plan.semanas || []).find(s => s.id === lunes);
  const enSemana = dias.reduce((n, d) => n + d.tareas.length, 0);
  const nav = '<div class="ph-nav" role="group" aria-label="Cambiar de semana">' +
    '<button type="button" class="btn ghost ph-nav-btn" data-ph-semana="-1" aria-label="Semana anterior"' + (lunes <= rango.min ? ' disabled' : '') + '><span aria-hidden="true">‹</span> Anterior</button>' +
    '<div class="ph-nav-t" id="ph-semana-t" aria-live="polite"><b>' + escapeHtml(sem ? (sem.n ? 'Semana ' + sem.n : sem.titulo) : 'Semana') + '</b><span>' + escapeHtml(ProfeHorario.rangoSemana(lunes)) + '</span></div>' +
    '<button type="button" class="btn ghost ph-nav-btn" data-ph-semana="hoy"' + (lunes === deHoy ? ' aria-pressed="true"' : ' aria-pressed="false"') + '>Hoy</button>' +
    '<button type="button" class="btn ghost ph-nav-btn" data-ph-semana="1" aria-label="Semana siguiente"' + (lunes >= rango.max ? ' disabled' : '') + '>Siguiente <span aria-hidden="true">›</span></button></div>';
  const reglas = '<details class="ph-reglas" id="ph-reglas"><summary>📏 Reglas de tu calendario y estados</summary><ul class="ph-reglas-lista">' +
    (oficina.size ? '<li><span aria-hidden="true">🏢</span> Días de oficina (los marca tu plan): máximo 2 tareas y solo en página.</li>' : '') +
    '<li><span aria-hidden="true">📆</span> Los demás días, máximo 4.</li>' +
    '<li><span aria-hidden="true">🗣️</span> Inglés diario.</li>' +
    '<li><span aria-hidden="true">🔓</span> Todo está abierto: puedes adelantar lo que quieras.</li>' +
    '<li><span aria-hidden="true">🎥</span> Clases en vivo: las impartes tú; no son tareas ni cuentan en el progreso.</li></ul>' +
    '<p class="ph-leyenda">' + Object.keys(ProfeHorario.ESTADOS).map(phEstado).join('') + '<span class="ph-tag-grupo"><span aria-hidden="true">👥</span> Grupo: lo de tu grupo, que resuelves antes</span></p></details>';
  return '<section class="ph" id="ph-horario" aria-labelledby="ph-horario-t"><h3 class="sec-subtitulo" id="ph-horario-t">🗓️ Mi horario</h3>' +
    // La semana primero (en celular el progreso iría antes de la semana y la empujaría hacia abajo).
    phChips(tareas, filtro, 'horario') + nav +
    (enSemana ? '' : '<div class="ph-vacio" id="ph-semana-vacia"><span class="ph-vacio-ico" aria-hidden="true">🎉</span><b>' + (filtro ? 'Sin tareas de ' + escapeHtml(filtro) + ' esta semana' : 'Semana libre') + '</b><small>' +
      (filtro ? 'Elige «Todas» o cambia de semana con las flechas.' : 'No hay nada con fecha en esta semana. Cambia de semana con las flechas.') + '</small></div>') +
    '<div class="ph-semana" id="ph-semana" data-ph-lunes="' + lunes + '">' + dias.map(phDia).join('') + '</div>' + reglas + phProgreso(act, tareas, filtro) + '</section>';
}

// ---------- 🧭 Por materia ----------
function phFila(t, oficina) {
  return '<li class="ph-fila ' + phClase(t.materia) + ' ph-t-' + t.estado + (t.meet ? ' ph-t-meet' : '') + '" data-ph-fila="' + escapeHtml(t.id) + '" data-estado="' + t.estado + '">' +
    '<div class="ph-fila-info"><b class="ph-titulo">' + escapeHtml(t.titulo) + '</b><span class="ph-fila-meta">' + escapeHtml(ProfeHorario.nombreDia(t.fecha)) + (t.semana ? ' · Semana ' + t.semana : '') + (ProfeHorario.esOficina(t.fecha, oficina) ? ' · <span aria-hidden="true">🏢</span> oficina' : '') + '</span>' +
    '<span class="ph-fila-estado">' + phEstado(t.estado) + phTipo(t) + '</span></div>' + phBoton(t) + '</li>';
}
function renderPorMateriaProfe(act) {
  if (!hayHorarioProfe(act)) return '';
  const tareas = ProfeHorario.tareasRuta(act);
  if (!tareas.length) return '<div class="pf-ok">Tu ruta todavía no tiene tareas con fecha.</div>';
  const filtro = phFiltro(tareas);
  const oficina = ProfeHorario.diasOficinaDe(act.plan);
  const prog = new Map(ProfeHorario.progresoPorMateria(tareas, act.plan.materias).map(p => [p.materia, p]));
  const grupos = ProfeHorario.agruparPorMateria(tareas, filtro);
  const secciones = grupos.map(g => {
    const p = prog.get(g.materia);
    // Abierta: la primera línea con algo sin hacer (si no hay, ninguna).
    const abierta = g.lineas.find(l => ProfeHorario.contables(l.tareas).some(t => !ProfeHorario.esHechaEstado(t.estado)));
    const lineas = g.lineas.map(l => {
      const suyas = ProfeHorario.contables(l.tareas); // los meets se listan, pero no cuentan
      const hechas = suyas.filter(t => ProfeHorario.esHechaEstado(t.estado)).length;
      return '<details class="ph-linea" data-ph-linea="' + escapeHtml(l.linea) + '"' + (l === abierta ? ' open' : '') + '><summary><span class="ph-linea-t">' + escapeHtml(l.linea) + '</span><span class="ph-linea-n">' + hechas + '/' + suyas.length + '</span></summary>' +
        '<ol class="ph-filas">' + l.tareas.map(t => phFila(t, oficina)).join('') + '</ol></details>';
    }).join('');
    return '<section class="ph-materia ' + phClase(g.materia) + '" data-ph-materia="' + escapeHtml(g.materia) + '" aria-labelledby="ph-mat-t-' + g.clave + '">' +
      '<div class="ph-materia-top"><h4 class="ph-materia-t" id="ph-mat-t-' + g.clave + '"><span aria-hidden="true">' + g.icono + '</span> ' + escapeHtml(g.materia) + '</h4>' +
      (p ? '<span class="ph-prog-n">' + p.hechas + '/' + p.total + '</span>' : '') + '</div>' +
      (p ? phBarra(p) + '<small class="ph-prog-cierre">' + (p.cierre ? 'Cierra el ' + escapeHtml(ProfeHorario.fechaCorta(p.cierre)) : 'Sin fecha de cierre') + ' · ' + p.pct + ' %</small>' : '') +
      lineas + '</section>';
  }).join('');
  return '<section class="ph" id="ph-por-materia" aria-labelledby="ph-por-materia-t"><h3 class="sec-subtitulo" id="ph-por-materia-t">🧭 Por materia</h3>' +
    '<p class="rpg-bonus">Tu ruta agrupada por materia y, dentro de cada una, por línea o tema en orden de fecha.</p>' +
    phChips(tareas, filtro, 'materias') + '<div class="ph-materias">' + secciones + '</div></section>';
}

// ---------- Interacción ----------
// Redibuja solo las dos pestañas (se conserva el resto de la página y el foco en el control tocado).
function phRedibujar(selFoco) {
  const act = state.act;
  const h = document.getElementById('pf-panel-horario'), m = document.getElementById('pf-panel-materias');
  if (h) h.innerHTML = renderHorarioProfe(act);
  if (m) m.innerHTML = renderPorMateriaProfe(act);
  const foco = selFoco && document.querySelector(selFoco);
  if (foco && !foco.disabled) foco.focus();
  else if (selFoco) { const t = document.getElementById('ph-semana-t'); if (t) { t.setAttribute('tabindex', '-1'); t.focus(); } }
}
document.addEventListener('click', e => {
  const f = e.target.closest('[data-ph-filtro]');
  if (f) {
    try { localStorage.setItem(PH_FILTRO_KEY, f.dataset.phFiltro); } catch { /* sin almacenamiento: solo esta vez */ }
    phRedibujar('[data-ph-donde="' + f.dataset.phDonde + '"][data-ph-filtro="' + CSS.escape(f.dataset.phFiltro) + '"]');
    return;
  }
  const s = e.target.closest('[data-ph-semana]');
  if (!s || s.disabled) return;
  const act = state.act;
  const actual = phLunes || ProfeHorario.lunesDe(phHoy(act));
  phLunes = s.dataset.phSemana === 'hoy' ? null : ProfeHorario.sumarDias(actual, 7 * Number(s.dataset.phSemana));
  phRedibujar('[data-ph-semana="' + s.dataset.phSemana + '"]');
});
