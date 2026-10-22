// Tablero de Secundaria (openspec: secundaria-dashboard): «🏠 Inicio» y «📚 Mis materias» de ingles.html?modo=secundaria.
// Solo dibuja: los cálculos (día de la clase, estado, progreso, racha, promedios y secuencias) están en
// comun/secundaria-datos.js. Los botones usan las acciones del reproductor (`abrir-item`, `ver-resultado`, en
// ingles/app.js) y las pestañas (`data-sec-tab`, en ingles/secundaria.js). El admin ve lo mismo con los datos de la
// alumna elegida (solo lectura: abrir una clase es una vista previa que no se guarda).

// Estado de la tarjeta → emoji del distintivo (el texto sale de SecundariaDatos.estadoClase).
const EMOJI_ESTADO = { hecha: '✅', 'en-curso': '🔁', 'vence-hoy': '⏰', 'vence-manana': '⏳', pendiente: '📌', atrasada: '⚠️', proxima: '🔒' };

// «Martes 27 de octubre» (sin la coma que algunos navegadores ponen tras el día de la semana).
function fechaLarga(f) {
  const mes = new Date(f + 'T12:00:00Z').toLocaleDateString('es-MX', { month: 'long', timeZone: 'UTC' });
  return SD.nombreDia(f) + ' de ' + mes;
}
const chipConEmoji = m => '<span class="chip mat-chip mat-' + m.clave + '"><span aria-hidden="true">' + m.emoji + '</span> ' + escapeHtml(m.nombre) + '</span>';
const materiaODefecto = it => SD.materiaDe(it) || { ...SD.OTRA, nombre: it.tipo === 'examen' ? 'Examen' : 'Clase' };

// Una tarjeta grande de «Hoy te toca»: chip de materia, estado, tema y botón principal.
function tarjetaHoy(it, hoy, admin) {
  const m = materiaODefecto(it);
  const e = SD.estadoClase(it, hoy);
  const nota = e.porcentaje !== null && (e.clave === 'hecha' || e.clave === 'en-curso') ? ' · ' + e.porcentaje + ' %' : '';
  const meta = [it.tipo === 'examen' ? 'Examen' : 'Clase'];
  if (it.preguntas) meta.push(it.preguntas + ' preguntas');
  if (it.intentosMax) meta.push((it.intentosUsados || 0) + '/' + it.intentosMax + ' oportunidades');
  let boton;
  if (!e.accion) boton = '<button type="button" class="btn sec-btn-grande" disabled>🔒 Abre el ' + escapeHtml(formatFecha(it.disponibleDesde)) + '</button>';
  else {
    const texto = admin && e.accion === 'abrir-item' ? '👀 Vista previa' : e.boton;
    const tono = e.clave === 'hecha' ? ' ghost' : '';
    boton = '<button type="button" class="btn sec-btn-grande' + tono + '" data-action="' + e.accion + '" data-id="' + escapeHtml(it.id) + '">' + escapeHtml(texto) + (e.clave === 'hecha' ? '' : ' <span aria-hidden="true">→</span>') + '</button>';
  }
  return '<article class="sec-tarjeta mat-' + m.clave + '" data-sec-card="' + escapeHtml(it.id) + '" data-estado="' + e.clave + '" aria-labelledby="sec-card-t-' + escapeHtml(it.id) + '">' +
    '<div class="sec-tarjeta-top">' + chipConEmoji(m) + '<span class="sec-estado est-' + e.clave + '"><span aria-hidden="true">' + EMOJI_ESTADO[e.clave] + '</span> ' + escapeHtml(e.texto + nota) + '</span></div>' +
    '<h3 class="sec-tarjeta-tema" id="sec-card-t-' + escapeHtml(it.id) + '">' + escapeHtml(SD.temaDe(it)) + '</h3>' +
    '<p class="sec-tarjeta-meta">' + escapeHtml(meta.join(' · ')) + '</p>' + boton + '</article>';
}

// Indicador compacto (progreso, racha, promedio).
const kpi = (id, cuerpo, titulo, detalle) => '<div class="sec-kpi" id="' + id + '">' + cuerpo + '<div class="sec-kpi-txt"><div class="sec-kpi-titulo">' + titulo + '</div><div class="sec-kpi-detalle">' + detalle + '</div></div></div>';

function renderSecInicio(act, o) {
  const items = act.items || [];
  const hoy = o.hoy;
  const deHoy = SD.clasesDeHoy(items, hoy);
  const prog = SD.progresoSemana(items, hoy);
  const racha = SD.rachaDe(act);
  const general = SD.promedio(items);
  const saludo = o.admin
    ? '<h2 class="sec-hola">Tablero de ' + escapeHtml(o.nombre || 'la alumna') + '</h2><span class="chip sec-vista-profe">👀 Vista del profe · solo lectura</span>'
    : '<h2 class="sec-hola">Hola' + (o.nombre ? ', ' + escapeHtml(o.nombre) : '') + ' 👋</h2>';
  const hero = '<header class="sec-hero"><div class="sec-fecha">' + escapeHtml(fechaLarga(hoy)) + '</div>' + saludo + '</header>';

  let hoyHtml;
  if (deHoy.length) hoyHtml = '<div class="sec-hoy-grid">' + deHoy.map(it => tarjetaHoy(it, hoy, o.admin)).join('') + '</div>';
  else {
    const prox = items.filter(it => SD.diaDeClase(it) > hoy).sort((a, b) => SD.diaDeClase(a).localeCompare(SD.diaDeClase(b)))[0];
    const pm = prox && materiaODefecto(prox);
    hoyHtml = '<div class="sec-vacio-hoy" id="sec-hoy-vacio"><div class="sec-vacio-emoji" aria-hidden="true">🎉</div><p><b>Hoy no tienes clases 🎉</b></p>' +
      (prox ? '<p class="sec-kpi-detalle">Tu próxima clase: ' + escapeHtml(SD.diaCorto(SD.diaDeClase(prox))) + ' · ' + pm.emoji + ' ' + escapeHtml(pm.nombre) + '</p>' : '<p class="sec-kpi-detalle">Disfruta tu día.</p>') + '</div>';
  }

  let detalleRacha;
  if (racha.hoy) detalleRacha = '¡Hoy ya sumaste!';
  else detalleRacha = racha.dias ? 'Haz una clase hoy para no perderla' : 'Termina una clase para empezarla';
  const kpis = '<div class="sec-kpis">' +
    kpi('sec-progreso', anillo(prog.porcentaje, 'semana'), 'Progreso de la semana', prog.total ? prog.hechas + ' de ' + prog.total + ' clases hechas' : 'Sin clases esta semana') +
    kpi('sec-racha', '<div class="sec-kpi-num" aria-hidden="true">🔥 ' + racha.dias + '</div>', 'Racha', racha.dias + (racha.dias === 1 ? ' día seguido' : ' días seguidos') + ' · ' + detalleRacha) +
    kpi('sec-promedio-general', '<div class="sec-kpi-num" aria-hidden="true">⭐ ' + (general === null ? '—' : general) + '</div>', 'Promedio general', general === null ? 'Aún sin calificaciones' : general + ' % con tu mejor calificación de cada clase') +
    '</div>';

  const conProm = SD.resumenMaterias(items, hoy).filter(m => m.promedio !== null);
  const promedios = '<section class="card sec-promedios" id="sec-promedios" aria-labelledby="sec-promedios-t"><h3 class="card-titulo" id="sec-promedios-t">⭐ Promedio por materia</h3>' +
    (conProm.length ? '<ul class="sec-prom-lista">' + conProm.map(m =>
      '<li class="sec-prom mat-' + m.clave + '" data-sec-prom="' + m.clave + '">' + chipConEmoji(m) +
      '<div class="barra sec-prom-barra" role="progressbar" aria-label="Promedio de ' + escapeHtml(m.nombre) + '" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + m.promedio + '"><span style="width:' + m.promedio + '%"></span></div>' +
      '<b class="sec-prom-num">' + m.promedio + ' %</b></li>').join('') + '</ul>'
      : '<p class="sec-kpi-detalle">Aún no tienes calificaciones. ¡Tu primera clase te espera! 💪</p>') + '</section>';

  const accesos = '<nav class="sec-accesos" aria-label="Más de Secundaria">' +
    [['clases', '📅', 'Esta semana'], ['horario', '🗓️', 'Mi horario'], ['materias', '📚', 'Mis materias']].map(([id, e, t]) =>
      '<button type="button" class="btn ghost sec-acceso" data-sec-tab="' + id + '"><span aria-hidden="true">' + e + '</span> ' + t + '</button>').join('') + '</nav>';

  return hero + '<section class="sec-hoy-te-toca" id="sec-hoy-te-toca" aria-labelledby="sec-hoy-t"><h3 class="sec-subtitulo" id="sec-hoy-t">☀️ Hoy te toca</h3>' + hoyHtml + '</section>' +
    kpis + promedios + accesos;
}

// «📚 Mis materias»: una tarjeta por materia con avance, promedio, último tema y su secuencia.
function renderSecMaterias(items, hoy) {
  return '<div class="sec-materias">' + SD.resumenMaterias(items, hoy).map(m => {
    const pct = m.total ? Math.round(m.hechas * 100 / m.total) : 0;
    const prom = m.promedio === null ? '<span class="chip gris">Sin calificación</span>' : '<span class="chip mat-chip mat-' + m.clave + '">⭐ ' + m.promedio + ' %</span>';
    const secuencia = m.etapas.length ? '<ol class="sec-secuencia" aria-label="Secuencia de ' + escapeHtml(m.nombre) + '">' + m.etapas.map(e =>
      '<li' + (e.actual ? ' class="actual" aria-current="step"' : '') + '><span class="sec-etapa">' + escapeHtml(e.nombre) + (e.actual ? ' <span class="sec-ahora">ahora</span>' : '') + '</span></li>').join('') + '</ol>' : '';
    return '<article class="sec-materia mat-' + m.clave + '" data-sec-materia="' + m.clave + '" aria-labelledby="sec-mat-' + m.clave + '">' +
      '<header class="sec-materia-top"><span class="sec-materia-emoji" aria-hidden="true">' + m.emoji + '</span><h3 id="sec-mat-' + m.clave + '">' + escapeHtml(m.nombre) + '</h3>' + prom + '</header>' +
      '<div class="sec-materia-avance"><span>' + m.hechas + ' de ' + m.total + (m.total === 1 ? ' clase hecha' : ' clases hechas') + '</span>' +
      '<div class="barra" role="progressbar" aria-label="Clases hechas de ' + escapeHtml(m.nombre) + '" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '"><span style="width:' + pct + '%"></span></div></div>' +
      (m.ultimoTema ? '<p class="sec-materia-ultimo">Último tema: <b>' + escapeHtml(m.ultimoTema) + '</b></p>' : '<p class="sec-materia-ultimo">' + (m.total ? 'Todavía no empieza: ya está en tu horario.' : 'Todavía no hay clases de esta materia.') + '</p>') +
      secuencia + (m.nota ? '<p class="sec-materia-nota">' + escapeHtml(m.nota) + '</p>' : '') + '</article>';
  }).join('') + '</div>';
}

// Admin: a qué alumna se ve (lista `alumnas` del servidor, sin correos).
function selectorAlumna(act) {
  const alumnas = act.alumnas || [];
  return '<div class="sec-admin-barra"><label for="sec-alumna">👀 Viendo el tablero de</label><select id="sec-alumna">' +
    alumnas.map(a => '<option value="' + escapeHtml(a.slug) + '"' + (act.vistaDe && a.slug === act.vistaDe.slug ? ' selected' : '') + '>' + escapeHtml(a.nombre) + '</option>').join('') + '</select></div>';
}
document.addEventListener('change', e => {
  if (!e.target || e.target.id !== 'sec-alumna') return;
  const q = new URLSearchParams(location.search);
  q.set('alumna', e.target.value);
  history.replaceState(null, '', location.pathname + '?' + q.toString() + location.hash);
  contentEl.innerHTML = esqueleto();
  loadSecundaria(state.email);
});
