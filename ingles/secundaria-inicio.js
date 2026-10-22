// Tablero de Secundaria (openspec: secundaria-dashboard): «🏠 Inicio» estilo RPG educativo y «📚 Mis materias» de
// ingles.html?modo=secundaria. Solo dibuja: XP, nivel, insignias, mundos y retos salen de comun/gamificacion.js
// (`Gamificacion`); día de la clase, estado, progreso y promedios, de comun/secundaria-datos.js (`SD`). Los botones
// usan las acciones del reproductor (`abrir-item`, `ver-resultado`, en ingles/app.js) y las pestañas (`data-sec-tab`,
// en ingles/secundaria.js). El admin ve lo mismo con los datos de la alumna elegida (solo lectura: abrir una clase es
// una vista previa que no se guarda). Sin ranking: hay una sola alumna.
const GAM = window.Gamificacion;

// Estado de la tarjeta → emoji del distintivo (el texto sale de SecundariaDatos.estadoClase).
const EMOJI_ESTADO = { hecha: '✅', 'en-curso': '🔁', 'vence-hoy': '⏰', 'vence-manana': '⏳', pendiente: '📌', atrasada: '⚠️', proxima: '🔒' };
const EMOJI_MUNDO = { completado: '✅', 'en-curso': '▶️', bloqueado: '🔒' };
const TEXTO_MUNDO = { completado: 'completado', 'en-curso': 'en curso', bloqueado: 'bloqueado' };

// «Martes 27 de octubre» (sin la coma que algunos navegadores ponen tras el día de la semana).
function fechaLarga(f) {
  const mes = new Date(f + 'T12:00:00Z').toLocaleDateString('es-MX', { month: 'long', timeZone: 'UTC' });
  return SD.nombreDia(f) + ' de ' + mes;
}
// Fecha AAAA-MM-DD en la Ciudad de México de un instante ISO (para «Mar 27» de la actividad reciente).
const diaMx = iso => new Date(iso).toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' });
const chipConEmoji = m => '<span class="chip mat-chip mat-' + m.clave + '"><span aria-hidden="true">' + m.emoji + '</span> ' + escapeHtml(m.nombre) + '</span>';
const materiaODefecto = it => SD.materiaDe(it) || { ...SD.OTRA, nombre: it.tipo === 'examen' ? 'Examen' : 'Clase' };
const mundoTexto = (m, hoy) => { const w = GAM.mundoDe(m.clave, hoy); return w ? w.emoji + ' ' + w.nombre : ''; };
const xpChip = (xp, posible) => '<span class="rpg-xp-chip">' + (posible ? 'hasta +' : '+') + xp + ' XP</span>';

// Botón principal de una clase según su estado (en el admin, «Vista previa» en lugar de Empezar o Continuar).
function botonClase(it, e, admin, clase, id) {
  const idAttr = id ? ' id="' + id + '"' : '';
  if (!e.accion) return '<button type="button"' + idAttr + ' class="btn ' + clase + '" disabled>🔒 Abre el ' + escapeHtml(formatFecha(it.disponibleDesde)) + '</button>';
  const texto = admin && e.accion === 'abrir-item' ? '👀 Vista previa' : e.boton;
  const tono = e.clave === 'hecha' ? ' ghost' : '';
  return '<button type="button"' + idAttr + ' class="btn ' + clase + tono + '" data-action="' + e.accion + '" data-id="' + escapeHtml(it.id) + '">' + escapeHtml(texto) + (e.clave === 'hecha' ? '' : ' <span aria-hidden="true">→</span>') + '</button>';
}

// Una tarjeta de «Retos diarios»: chip de materia, estado, tema, mundo, XP y botón principal.
function tarjetaHoy(it, hoy, admin) {
  const m = materiaODefecto(it);
  const e = SD.estadoClase(it, hoy);
  const nota = e.porcentaje !== null && (e.clave === 'hecha' || e.clave === 'en-curso') ? ' · ' + e.porcentaje + ' %' : '';
  const meta = [it.tipo === 'examen' ? 'Examen' : 'Clase'];
  if (it.preguntas) meta.push(it.preguntas + ' preguntas');
  if (it.intentosMax) meta.push((it.intentosUsados || 0) + '/' + it.intentosMax + ' oportunidades');
  const xp = GAM.estaHecha(it) ? xpChip(GAM.xpDeClase(it, it.mejor, { hoy })) : xpChip(GAM.XP_POSIBLE, true);
  const mundo = mundoTexto(m, hoy);
  return '<article class="sec-tarjeta mat-' + m.clave + '" data-sec-card="' + escapeHtml(it.id) + '" data-estado="' + e.clave + '" aria-labelledby="sec-card-t-' + escapeHtml(it.id) + '">' +
    '<div class="sec-tarjeta-top">' + chipConEmoji(m) + '<span class="sec-estado est-' + e.clave + '"><span aria-hidden="true">' + EMOJI_ESTADO[e.clave] + '</span> ' + escapeHtml(e.texto + nota) + '</span></div>' +
    '<h3 class="sec-tarjeta-tema" id="sec-card-t-' + escapeHtml(it.id) + '">' + escapeHtml(SD.temaDe(it)) + '</h3>' +
    '<p class="sec-tarjeta-meta">' + escapeHtml(meta.join(' · ')) + '</p>' +
    '<div class="sec-tarjeta-premio">' + (mundo ? '<span class="rpg-mundo-mini">' + escapeHtml(mundo) + '</span>' : '<span></span>') + xp + '</div>' +
    botonClase(it, e, admin, 'sec-btn-grande') + '</article>';
}

// Barra de estado RPG: nivel, rango, XP del nivel, insignias y racha.
function barraRpg(nivel, insignias, racha) {
  return '<section class="rpg-stats" id="rpg-stats" aria-label="Tu avance">' +
    '<div class="rpg-nivel"><div class="rpg-nivel-num rpg-num" aria-hidden="true">' + nivel.nivel + '</div>' +
      '<div class="rpg-nivel-txt"><div class="rpg-rango" id="rpg-rango">Nivel ' + nivel.nivel + ' · ' + escapeHtml(nivel.rango) + '</div>' +
      '<div class="rpg-xp-linea"><span>XP</span><span class="rpg-num" id="rpg-xp">' + nivel.xpNivel + ' / ' + nivel.porNivel + '</span></div>' +
      '<div class="rpg-xp-barra" role="progressbar" aria-label="XP del nivel ' + nivel.nivel + '" aria-valuemin="0" aria-valuemax="' + nivel.porNivel + '" aria-valuenow="' + nivel.xpNivel + '"><span style="width:' + nivel.porcentaje + '%"></span></div></div></div>' +
    '<div class="rpg-dato" id="rpg-insignias"><span class="rpg-dato-ico" aria-hidden="true">🏅</span><div><div class="rpg-dato-t">Insignias</div><div class="rpg-dato-v rpg-num">' + insignias.length + ' / ' + (GAM.INSIGNIAS.length + (GAM.INSIGNIAS_RPG || []).length) + '</div></div></div>' +
    '<div class="rpg-dato" id="rpg-racha"><span class="rpg-dato-ico" aria-hidden="true">🔥</span><div><div class="rpg-dato-t">Racha</div><div class="rpg-dato-v"><span class="rpg-num">' + racha.dias + '</span> ' + (racha.dias === 1 ? 'día' : 'días') + '</div></div></div>' +
    '</section>';
}

// «Misión principal activa»: la primera clase de hoy sin hacer; si no hay, la próxima clase sin hacer.
function misionPrincipal(items, hoy, deHoy, admin, saludo) {
  const pendiente = deHoy.find(it => !GAM.estaHecha(it));
  const prox = items.filter(it => SD.diaDeClase(it) > hoy && !GAM.estaHecha(it)).sort((a, b) => SD.diaDeClase(a).localeCompare(SD.diaDeClase(b)))[0];
  const it = pendiente || prox;
  let cuerpo;
  if (it) {
    const m = materiaODefecto(it);
    const e = SD.estadoClase(it, hoy);
    const cuando = pendiente ? e.texto : 'Próxima: ' + SD.diaCorto(SD.diaDeClase(it));
    cuerpo = '<span class="rpg-etiqueta">⚔️ Misión principal activa</span>' +
      '<h3 class="rpg-mision-t">' + escapeHtml(SD.temaDe(it)) + '</h3>' +
      '<p class="rpg-mision-d">' + escapeHtml([mundoTexto(m, hoy), m.emoji + ' ' + m.nombre, cuando].filter(Boolean).join(' · ')) + ' · hasta +' + GAM.XP_POSIBLE + ' XP</p>' +
      '<div class="rpg-mision-acciones">' + botonClase(it, e, admin, 'rpg-btn-mision', 'rpg-mision-btn') +
      '<button type="button" class="btn ghost rpg-btn-sec" data-sec-tab="clases"><span aria-hidden="true">📅</span> Ver la semana</button></div>';
  } else {
    cuerpo = '<span class="rpg-etiqueta">🏁 Misiones al día</span><h3 class="rpg-mision-t">¡No tienes misiones pendientes! 🎉</h3>' +
      '<p class="rpg-mision-d">Cuando el profe publique tus siguientes clases, aquí aparecerá tu próxima misión.</p>';
  }
  return '<section class="rpg-mision" id="rpg-mision" aria-label="Misión principal">' + saludo + cuerpo + '</section>';
}

const kpi = (id, cuerpo, titulo, detalle) => '<div class="sec-kpi" id="' + id + '">' + cuerpo + '<div class="sec-kpi-txt"><div class="sec-kpi-titulo">' + titulo + '</div><div class="sec-kpi-detalle">' + detalle + '</div></div></div>';

// Retos diarios = «Hoy te toca» (las clases de hoy y lo pendiente que vence hoy).
// El contador usa las mismas clases que las tarjetas (incluye lo de ayer que vence hoy y sigue sin hacer).
function retosHtml(items, hoy, deHoy, admin) {
  const hechas = deHoy.filter(GAM.estaHecha);
  const retos = { total: deHoy.length, hechos: hechas.length, faltan: deHoy.length - hechas.length, xpHoy: hechas.reduce((a, it) => a + GAM.xpDeClase(it, it.mejor, { hoy }), 0) };
  let resumen = '';
  const cuantos = retos.faltan === 1 ? 'falta 1 reto' : 'faltan ' + retos.faltan + ' retos';
  if (retos.total) resumen = retos.faltan ? '¡Te ' + cuantos + ' para completar el día!' : '¡Retos del día completos! +' + retos.xpHoy + ' XP';
  let cuerpo;
  if (deHoy.length) cuerpo = '<div class="sec-hoy-grid">' + deHoy.map(it => tarjetaHoy(it, hoy, admin)).join('') + '</div>';
  else {
    const prox = items.filter(it => SD.diaDeClase(it) > hoy).sort((a, b) => SD.diaDeClase(a).localeCompare(SD.diaDeClase(b)))[0];
    const pm = prox && materiaODefecto(prox);
    cuerpo = '<div class="sec-vacio-hoy" id="sec-hoy-vacio"><div class="sec-vacio-emoji" aria-hidden="true">🎉</div><p><b>Hoy no tienes clases 🎉</b></p>' +
      (prox ? '<p class="sec-kpi-detalle">Tu próxima clase: ' + escapeHtml(SD.diaCorto(SD.diaDeClase(prox))) + ' · ' + pm.emoji + ' ' + escapeHtml(pm.nombre) + '</p>' : '<p class="sec-kpi-detalle">Disfruta tu día.</p>') + '</div>';
  }
  return '<section class="sec-hoy-te-toca" id="sec-hoy-te-toca" aria-labelledby="sec-hoy-t"><div class="rpg-seccion-top"><h3 class="sec-subtitulo" id="sec-hoy-t">⚡ Retos diarios · Hoy te toca</h3>' +
    (retos.total ? '<span class="rpg-contador rpg-num" id="rpg-retos">' + retos.hechos + ' / ' + retos.total + '</span>' : '') + '</div>' +
    (resumen ? '<p class="rpg-bonus" id="rpg-retos-texto">' + escapeHtml(resumen) + '</p>' : '') + cuerpo + '</section>';
}

function kpisHtml(prog, racha, mapa) {
  const mundos = mapa.flatMap(m => m.mundos);
  const completados = mundos.filter(w => w.estado === 'completado').length;
  const enCurso = mundos.filter(w => w.estado === 'en-curso').length;
  let detalleRacha;
  if (racha.hoy) detalleRacha = '¡Hoy ya sumaste!';
  else detalleRacha = racha.dias ? 'Haz una clase hoy para no perderla' : 'Termina una clase para empezarla';
  return '<div class="sec-kpis">' +
    kpi('sec-progreso', anillo(prog.porcentaje, 'semana'), 'Progreso de la semana', prog.total ? prog.hechas + ' de ' + prog.total + ' clases hechas' : 'Sin clases esta semana') +
    kpi('sec-racha', '<div class="sec-kpi-num rpg-num" aria-hidden="true">🔥 ' + racha.dias + '</div>', 'Racha', racha.dias + (racha.dias === 1 ? ' día seguido' : ' días seguidos') + ' · ' + detalleRacha) +
    kpi('sec-mundos', '<div class="sec-kpi-num rpg-num" aria-hidden="true">🗺️ ' + completados + '</div>', 'Mundos', completados + (completados === 1 ? ' completado' : ' completados') + ' · ' + enCurso + ' en curso') +
    '</div>';
}

function insigniasHtml(insignias) {
  return '<section class="card rpg-insignias" id="sec-insignias" aria-labelledby="sec-insignias-t"><h3 class="card-titulo" id="sec-insignias-t">🏅 Insignias</h3><ul class="rpg-insignia-lista">' +
    [...GAM.INSIGNIAS, ...(GAM.INSIGNIAS_RPG || [])].map(i => {
      const tiene = insignias.some(x => x.id === i.id);
      return '<li class="rpg-insignia' + (tiene ? ' ganada' : '') + '" data-insignia="' + i.id + '" title="' + escapeHtml(i.descripcion) + '">' +
        '<span class="rpg-insignia-ico" aria-hidden="true">' + (tiene ? i.emoji : '🔒') + '</span><span class="rpg-insignia-n">' + escapeHtml(i.nombre) + '</span>' +
        '<span class="sr-only">' + (tiene ? 'ganada' : 'por ganar') + ': ' + escapeHtml(i.descripcion) + '</span></li>';
    }).join('') + '</ul></section>';
}

function actividadHtml(items) {
  const recientes = GAM.actividadReciente(items, 5);
  return '<section class="card rpg-actividad" id="sec-actividad" aria-labelledby="sec-actividad-t"><h3 class="card-titulo" id="sec-actividad-t">🕘 Actividad reciente</h3>' +
    (recientes.length ? '<ul class="rpg-actividad-lista">' + recientes.map(r => {
      const m = materiaODefecto(r.item);
      return '<li class="rpg-act mat-' + m.clave + '" data-sec-act="' + escapeHtml(r.item.id) + '"><span class="rpg-act-ico" aria-hidden="true">✅</span>' +
        '<div class="rpg-act-txt"><b>' + escapeHtml(SD.temaDe(r.item)) + '</b><span>' + escapeHtml(m.emoji + ' ' + m.nombre + ' · ' + r.porcentaje + ' % · ' + SD.diaCorto(diaMx(r.fecha))) + '</span></div>' + xpChip(r.xp) + '</li>';
    }).join('') + '</ul>' : '<p class="sec-kpi-detalle">Aquí verás tus misiones terminadas y el XP que ganaste.</p>') + '</section>';
}

function promediosHtml(items, hoy) {
  const general = SD.promedio(items);
  const conProm = SD.resumenMaterias(items, hoy).filter(m => m.promedio !== null);
  return '<section class="card sec-promedios" id="sec-promedios" aria-labelledby="sec-promedios-t"><h3 class="card-titulo" id="sec-promedios-t">⭐ Promedio por materia' +
    (general === null ? '' : '<span class="rpg-general" id="sec-promedio-general">General: <b class="rpg-num">' + general + ' %</b></span>') + '</h3>' +
    (conProm.length ? '<ul class="sec-prom-lista">' + conProm.map(m =>
      '<li class="sec-prom mat-' + m.clave + '" data-sec-prom="' + m.clave + '">' + chipConEmoji(m) +
      '<div class="barra sec-prom-barra" role="progressbar" aria-label="Promedio de ' + escapeHtml(m.nombre) + '" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + m.promedio + '"><span style="width:' + m.promedio + '%"></span></div>' +
      '<b class="sec-prom-num">' + m.promedio + ' %</b></li>').join('') + '</ul>'
      : '<p class="sec-kpi-detalle">Aún no tienes calificaciones. ¡Tu primera misión te espera! 💪</p>') + '</section>';
}

function renderSecInicio(act, o) {
  const items = act.items || [];
  const hoy = o.hoy;
  const deHoy = SD.clasesDeHoy(items, hoy);
  const racha = SD.rachaDe(act);
  // XP de clases + misiones principales evaluadas, en el mismo total (openspec: rpg-fase2-misiones).
  const misiones = typeof misionesSec === 'function' ? misionesSec() : [];
  const nivel = GAM.nivelDe(GAM.xpTotalConMisiones(items, misiones, { hoy }));
  const insignias = [...GAM.insigniasDe({ items, hoy, racha }), ...GAM.insigniasRpgDe({ items, misiones, hoy, catalogo: typeof catalogoSec === 'function' ? catalogoSec() : null })];
  const conNombre = o.nombre ? ', ' + escapeHtml(o.nombre) : '';
  const titulo = o.admin
    ? '<h2 class="sec-hola">Tablero de ' + escapeHtml(o.nombre || 'la alumna') + '</h2><span class="chip sec-vista-profe">👀 Vista del profe · solo lectura</span>'
    : '<h2 class="sec-hola">Hola' + conNombre + ' 👋</h2>';
  const saludo = '<header class="sec-hero"><div class="sec-fecha">' + escapeHtml(fechaLarga(hoy)) + '</div>' + titulo + '</header>';
  const accesos = '<nav class="sec-accesos" aria-label="Más de Secundaria">' +
    [['clases', '📅', 'Esta semana'], ['horario', '🗓️', 'Mi horario'], ['materias', '🗺️', 'Mis materias y mundos']].map(([id, e, t]) =>
      '<button type="button" class="btn ghost sec-acceso" data-sec-tab="' + id + '"><span aria-hidden="true">' + e + '</span> ' + t + '</button>').join('') + '</nav>';
  const extrasMision = typeof misionInicioHtml === 'function' ? (o.admin ? '' : avisoEvaluacionHtml(items, hoy)) + misionInicioHtml(items, hoy) + misionesSemanaHtml(items, hoy) : '';
  return '<div class="rpg">' + barraRpg(nivel, insignias, racha) + misionPrincipal(items, hoy, deHoy, o.admin, saludo) + extrasMision + retosHtml(items, hoy, deHoy, o.admin) +
    kpisHtml(SD.progresoSemana(items, hoy), racha, GAM.mapaMundos(items, hoy)) +
    '<div class="rpg-dos">' + actividadHtml(items) + promediosHtml(items, hoy) + '</div>' + insigniasHtml(insignias) + accesos + '</div>';
}

// «📚 Mis materias»: una tarjeta por materia con avance, promedio, último tema y su camino de mundos.
function caminoMundos(m) {
  if (!m.etapas.length) return '';
  return '<ol class="sec-secuencia" aria-label="Mundos de ' + escapeHtml(m.nombre) + '">' + m.etapas.map(e =>
    '<li class="mundo-' + e.estado + (e.actual ? ' actual' : '') + '"' + (e.actual ? ' aria-current="step"' : '') + ' data-mundo="' + escapeHtml(e.mundo) + '"><span class="sec-etapa">' +
    '<span aria-hidden="true">' + e.emoji + '</span> ' + escapeHtml(e.mundo) + ' <small>' + escapeHtml(e.nombre) + '</small> <span class="sec-mundo-estado" aria-hidden="true">' + EMOJI_MUNDO[e.estado] + '</span>' +
    '<span class="sr-only">, ' + TEXTO_MUNDO[e.estado] + '</span>' + (e.actual ? ' <span class="sec-ahora">ahora</span>' : '') + '</span></li>').join('') + '</ol>';
}
function renderSecMaterias(items, hoy) {
  return '<p class="rpg-leyenda" aria-hidden="true"><span>✅ completado</span><span>▶️ en curso</span><span>🔒 bloqueado</span></p><div class="sec-materias">' + SD.resumenMaterias(items, hoy).map(m => {
    const pct = m.total ? Math.round(m.hechas * 100 / m.total) : 0;
    const prom = m.promedio === null ? '<span class="chip gris">Sin calificación</span>' : '<span class="chip mat-chip mat-' + m.clave + '">⭐ ' + m.promedio + ' %</span>';
    const temas = m.temas.length ? '<p class="sec-materia-nota">Temas: ' + escapeHtml(m.temas.join(' → ')) + '</p>' : '';
    let ultimo = 'Todavía no hay clases de esta materia.';
    if (m.ultimoTema) ultimo = 'Último tema: <b>' + escapeHtml(m.ultimoTema) + '</b>';
    else if (m.total) ultimo = 'Todavía no empieza: ya está en tu horario.';
    return '<article class="sec-materia mat-' + m.clave + '" data-sec-materia="' + m.clave + '" aria-labelledby="sec-mat-' + m.clave + '">' +
      '<header class="sec-materia-top"><span class="sec-materia-emoji" aria-hidden="true">' + m.emoji + '</span><h3 id="sec-mat-' + m.clave + '">' + escapeHtml(m.nombre) + '</h3>' + prom + '</header>' +
      '<div class="sec-materia-avance"><span>' + m.hechas + ' de ' + m.total + (m.total === 1 ? ' clase hecha' : ' clases hechas') + '</span>' +
      '<div class="barra" role="progressbar" aria-label="Clases hechas de ' + escapeHtml(m.nombre) + '" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '"><span style="width:' + pct + '%"></span></div></div>' +
      '<p class="sec-materia-ultimo">' + ultimo + '</p>' + caminoMundos(m) + temas + (m.nota ? '<p class="sec-materia-nota">' + escapeHtml(m.nota) + '</p>' : '') + '</article>';
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
