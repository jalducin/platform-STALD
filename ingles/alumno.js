// Inglés · vista de alumno o alumna (openspec: ingles-pro): Inicio (avance, racha, próxima clase, para hoy e
// insignias), Semana (lunes a domingo y todas sus tareas), Resultados y Perfil.

const conReto = it => it.tipo !== 'meet' || it.tieneReto;
const entregado = it => (it.intentosUsados || 0) > 0 || it.estado === 'completo';

function nombreAlumno(data) { return ((data.rows || []).find(r => r.alumno) || {}).alumno || ''; }

// Nivel: el del último examen con resultado; si no hay, el de su grupo.
function nivelAlumno(act) {
  const items = (act && act.items) || [];
  const ex = items.filter(it => it.tipo === 'examen' && it.mejor && it.nivel).sort((a, b) => String(b.ultimoEnvio || '').localeCompare(String(a.ultimoEnvio || '')))[0];
  return (ex && ex.nivel) || (act && act.grupo && act.grupo.nivel) || null;
}

// Avance de la semana: elementos con entrega de la semana actual que ya entregó.
function avanceSemana(act) {
  const lista = semanaItems(act).filter(conReto);
  const hechos = lista.filter(entregado).length;
  return { hechos, total: lista.length, pct: lista.length ? Math.round(hechos * 100 / lista.length) : 0 };
}

// ---------- Próxima clase: horario del grupo ("Sáb 10:00") o el Meet de la semana ----------
const DIAS_HORARIO = { dom: 0, lun: 1, mar: 2, mie: 3, jue: 4, vie: 5, sab: 6 };
const DURACION_CLASE_MIN = 60;
function siguienteDesdeHorario(horario, ahora) {
  const t = String(horario || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const dias = [...t.matchAll(/\b(dom|lun|mar|mie|jue|vie|sab)/g)].map(m => DIAS_HORARIO[m[1]]);
  const h = t.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
  if (!dias.length || !h) return null;
  let hora = Number(h[1]); const min = Number(h[2] || 0);
  if (h[3] === 'pm' && hora < 12) hora += 12;
  if (h[3] === 'am' && hora === 12) hora = 0;
  let mejor = null;
  for (let d = 0; d <= 7; d++) {
    const f = new Date(ahora); f.setDate(f.getDate() + d); f.setHours(hora, min, 0, 0);
    if (!dias.includes(f.getDay())) continue;
    if (f.getTime() + DURACION_CLASE_MIN * 60000 <= ahora.getTime()) continue;
    if (!mejor || f < mejor) mejor = f;
  }
  return mejor;
}
function proximaClase(act, ahora) {
  const g = act && act.grupo;
  const hoy = (act && act.hoy) || todayStr();
  const meet = ((act && act.items) || []).filter(it => it.tipo === 'meet' && it.fechaLimite >= hoy).sort((a, b) => a.fechaLimite.localeCompare(b.fechaLimite))[0];
  if (!g && !meet) return null;
  let cuando = g && g.horario ? siguienteDesdeHorario(g.horario, ahora) : null;
  if (!cuando && meet && /^\d{1,2}:\d{2}/.test(meet.hora || '')) {
    const [hh, mm] = meet.hora.split(':');
    cuando = new Date(meet.fechaLimite + 'T' + hh.padStart(2, '0') + ':' + mm.slice(0, 2) + ':00');
  }
  return {
    nombre: g ? g.nombre : 'Repaso por Meet', color: g ? g.color : null, nivel: g ? g.nivel : null,
    horario: g && g.horario ? g.horario : (meet ? formatFecha(meet.fechaLimite) + (meet.hora ? ' · ' + meet.hora : '') : ''),
    cuando, url: (g && g.meet_url) || (meet && meet.meetUrl) || null,
  };
}
function textoCuenta(cuando, ahora) {
  if (!cuando) return { texto: '', vivo: false };
  const ms = cuando.getTime() - ahora.getTime();
  if (ms <= 0) return { texto: '🔴 ¡La clase está en curso!', vivo: true };
  const min = Math.ceil(ms / 60000), h = Math.floor(min / 60), d = Math.floor(h / 24);
  if (d >= 1) return { texto: 'Faltan ' + d + (d === 1 ? ' día ' : ' días ') + (h % 24) + ' h', vivo: false };
  if (h >= 1) return { texto: 'Empieza en ' + h + ' h ' + (min % 60) + ' min', vivo: false };
  return { texto: 'Empieza en ' + min + ' min', vivo: min <= 15 };
}
function renderProximaClase(act) {
  const pc = proximaClase(act, new Date());
  if (!pc) return '';
  const c = textoCuenta(pc.cuando, new Date());
  const fecha = pc.cuando ? pc.cuando.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'short' }) + ' · ' + pc.cuando.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : pc.horario;
  return '<section class="mi-grupo proxima-clase" aria-labelledby="pc-titulo" style="--gc:' + escapeHtml(pc.color || '#4f46e5') + '"' + (pc.cuando ? ' data-cuando="' + pc.cuando.getTime() + '"' : '') + '>' +
    '<div class="pc-info"><div class="card-titulo" id="pc-titulo" style="margin:0">🎥 Próxima clase</div>' +
    '<b>👥 ' + escapeHtml(pc.nombre) + '</b>' + (pc.nivel ? ' <span class="grupo-chip">' + escapeHtml(pc.nivel) + '</span>' : '') +
    '<div class="s">🗓️ ' + escapeHtml(fecha) + '</div>' +
    (c.texto ? '<div class="pc-cuenta' + (c.vivo ? ' vivo' : '') + '" id="cuenta-regresiva" aria-live="off">' + escapeHtml(c.texto) + '</div>' : '') + '</div>' +
    (pc.url ? '<a class="btn" href="' + escapeHtml(pc.url) + '" target="_blank" rel="noopener">🎥 Unirme a la clase</a>' : '<span class="pill wait">Enlace por WhatsApp</span>') + '</section>';
}
// Cuenta regresiva en vivo (cada 30 s) mientras la tarjeta está en pantalla.
let relojClase = null;
function iniciarCuentaRegresiva() {
  clearInterval(relojClase);
  relojClase = setInterval(() => {
    const t = document.querySelector('.proxima-clase[data-cuando]'), el = document.getElementById('cuenta-regresiva');
    if (!t || !el) { clearInterval(relojClase); return; }
    const c = textoCuenta(new Date(Number(t.dataset.cuando)), new Date());
    el.textContent = c.texto; el.classList.toggle('vivo', c.vivo);
  }, 30000);
}

// ---------- Para hoy: lo atrasado y lo de hoy arriba; si no hay, lo siguiente disponible ----------
function renderParaHoy(act) {
  const hoy = (act && act.hoy) || todayStr();
  const items = ((act && act.items) || []).filter(it => conReto(it) && ['disponible', 'en-curso'].includes(it.estado));
  const urgentes = items.filter(it => it.fechaLimite <= hoy).sort((a, b) => a.fechaLimite.localeCompare(b.fechaLimite));
  const siguientes = items.filter(it => it.fechaLimite > hoy).sort((a, b) => a.fechaLimite.localeCompare(b.fechaLimite));
  const lista = urgentes.concat(siguientes).slice(0, Math.max(3, urgentes.length));
  const etiqueta = it => it.fechaLimite < hoy ? '<span class="chip bad">⏰ Atrasada</span>' : it.fechaLimite === hoy ? '<span class="chip warn">📌 Hoy</span>' : '<span class="chip">' + escapeHtml(formatFecha(it.fechaLimite)) + '</span>';
  const filas = lista.map(it => '<div class="hoy-item"><div><div class="t">' + icono(it.tipo) + ' ' + escapeHtml(it.titulo) + '</div><div class="s">' + etiqueta(it) + ' · ' + tipoTexto(it.tipo) + '</div></div>' + accionItem(it, it.estado) + '</div>').join('');
  return '<section class="card" id="para-hoy" aria-labelledby="ph-titulo"><h3 class="card-titulo" id="ph-titulo">🔥 Para hoy</h3>' +
    (filas || vacio('🎉', '¡Al día! No tienes nada atrasado ni para hoy.')) + '</section>';
}

// ---------- Insignias (se calculan aquí con sus resultados; no se guardan) ----------
function insignias(act) {
  const items = (act && act.items) || [];
  const sem = semanaItems(act).filter(conReto);
  const racha = (act && act.racha && act.racha.dias) || 0;
  return [
    { id: 'primera', emoji: '🎯', texto: 'Primera entrega', ok: items.some(entregado) },
    { id: 'semana', emoji: '🌟', texto: 'Semana perfecta', ok: sem.length > 0 && sem.every(it => entregado(it) && it.mejor && it.mejor.porcentaje >= 80) },
    { id: 'racha5', emoji: '🔥', texto: 'Racha de 5', ok: racha >= 5 },
    { id: 'examen90', emoji: '🏆', texto: 'Examen 90 %+', ok: items.some(it => it.tipo === 'examen' && it.mejor && it.mejor.porcentaje >= 90) },
  ];
}
const renderInsignias = (act, id = 'insignias') => '<div class="chips" id="' + id + '">' + insignias(act).map(b =>
  '<span class="insignia' + (b.ok ? ' lograda' : '') + '" data-insignia="' + b.id + '" title="' + (b.ok ? '¡Lograda!' : 'Por lograr') + '"><span aria-hidden="true">' + (b.ok ? b.emoji : '🔒') + '</span> ' + escapeHtml(b.texto) + '<span class="sr-only">' + (b.ok ? ' (lograda)' : ' (por lograr)') + '</span></span>').join('') + '</div>';

// ---------- Semana de lunes a domingo ----------
function lunesDe(fecha) { const d = new Date(fecha + 'T12:00:00'); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return fmtDate(d); }
function renderLineaSemana(act) {
  const hoy = (act && act.hoy) || todayStr();
  const lunes = act && act.semana && /^\d{4}-\d{2}-\d{2}$/.test(act.semana.id) ? lunesDe(act.semana.id) : lunesDe(hoy);
  const items = ((act && act.items) || []).filter(conReto);
  const letras = ['L', 'M', 'M', 'J', 'V', 'S', 'D'], nombres = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
  const dias = letras.map((l, i) => {
    const d = new Date(lunes + 'T12:00:00'); d.setDate(d.getDate() + i);
    const f = fmtDate(d);
    const delDia = items.filter(it => it.fechaLimite === f);
    const total = delDia.length, hechos = delDia.filter(entregado).length;
    let estado = 'libre', icono = '';
    if (total && hechos === total) { estado = 'hecho'; icono = '✓'; }
    else if (total && f < hoy) { estado = 'atrasado'; icono = '!'; }
    else if (total) { estado = 'pendiente'; icono = String(total - hechos); }
    const texto = nombres[i] + ' ' + d.getDate() + ': ' + ({ libre: 'sin tarea', hecho: 'todo hecho', atrasado: 'con atraso', pendiente: (total - hechos) + ' pendiente(s)' })[estado];
    return '<button type="button" class="dia ' + estado + (f === hoy ? ' es-hoy' : '') + '" data-action="dia" data-fecha="' + f + '" aria-pressed="false" aria-label="' + escapeHtml(texto) + '"' + (total ? '' : ' disabled') + '>' +
      '<span aria-hidden="true">' + l + '</span><span class="c" aria-hidden="true">' + (icono || d.getDate()) + '</span></button>';
  }).join('');
  return '<section class="card" aria-labelledby="ls-titulo"><h3 class="card-titulo" id="ls-titulo">🗓️ Lunes a domingo</h3><div class="semana-linea" id="semana-linea">' + dias + '</div>' +
    '<div class="leyenda"><span>✓ hecho</span><span>! con atraso</span><span>n pendientes</span><span>toca un día para filtrar</span></div></section>';
}
// Tocar un día filtra la lista de la semana; tocarlo otra vez la muestra completa.
function filtrarDia(b) {
  const activo = b.getAttribute('aria-pressed') === 'true';
  document.querySelectorAll('#semana-linea .dia').forEach(x => x.setAttribute('aria-pressed', String(!activo && x === b)));
  document.querySelectorAll('[data-seccion="semana"] .exam-item[data-fecha]').forEach(x => { x.hidden = !activo && x.dataset.fecha !== b.dataset.fecha; });
}

// ---------- Resultados ----------
function renderResultadosAlumno(act) {
  const items = ((act && act.items) || []).filter(it => it.mejor).sort((a, b) => String(b.ultimoEnvio || '').localeCompare(String(a.ultimoEnvio || '')));
  const temas = new Map();
  items.forEach(it => {
    (it.mejor.debilidades || []).forEach(t => temas.set(t, 'debilidad'));
    (it.mejor.enProgreso || []).forEach(t => { if (!temas.has(t)) temas.set(t, 'en-progreso'); });
  });
  const reforzar = '<section class="card" aria-labelledby="tr-titulo"><h3 class="card-titulo" id="tr-titulo">🎯 Temas a reforzar</h3>' +
    (temas.size ? '<div class="chips" id="temas-reforzar">' + [...temas].map(([t, e]) => '<span class="chip ' + e + '">' + escapeHtml(t) + '</span>').join('') + '</div>' : '<div class="muted">¡Nada por reforzar por ahora! 💪</div>') + '</section>';
  const lista = items.length ? '<section class="card" aria-labelledby="mr-titulo"><h3 class="card-titulo" id="mr-titulo">⭐ Calificaciones en línea</h3>' + items.map(it => {
    const p = it.mejor.porcentaje, tono = claseNota(p);
    return '<div class="res-item" data-id="' + escapeHtml(it.id) + '"><div class="h"><span>' + icono(it.tipo) + ' ' + escapeHtml(it.titulo) + '</span><span class="pct">' + p + '%</span></div>' +
      '<div class="barra ' + (tono === 'debilidad' ? 'bad' : tono === 'en-progreso' ? 'warn' : '') + '"><span style="width:' + p + '%"></span></div>' +
      '<div style="display:flex;justify-content:space-between;gap:8px;align-items:center;flex-wrap:wrap"><span class="muted" style="font-size:.78rem">' + (it.intentosUsados || 0) + '/' + it.intentosMax + ' intento(s)' + (it.ultimoEnvio ? ' · ' + escapeHtml(fechaCorta(it.ultimoEnvio)) : '') + '</span>' +
      '<button class="btn ghost sm" data-action="ver-resultado" data-id="' + escapeHtml(it.id) + '">Ver detalle</button></div></div>';
  }).join('') + '</section>' : '<div class="card">' + vacio('⭐', 'Cuando entregues tu primera actividad, aquí verás tus resultados.') + '</div>';
  return reforzar + lista;
}

// ---------- Perfil ----------
function renderPerfil(data, act) {
  const nombre = nombreAlumno(data), g = act && act.grupo;
  const tema = temaGuardado();
  const opcion = (v, t) => '<label style="display:flex;gap:8px;align-items:center;min-height:44px"><input type="radio" name="tema" value="' + v + '"' + (tema === v ? ' checked' : '') + '> ' + t + '</label>';
  return '<section class="card" style="display:flex;gap:14px;align-items:center;--gc:' + escapeHtml((g && g.color) || '#4f46e5') + '"><span class="avatar" aria-hidden="true">' + escapeHtml(iniciales(nombre)) + '</span>' +
    '<div><div class="hola" style="font-weight:800">' + escapeHtml(nombre || 'Alumno o alumna') + '</div><div class="muted" style="font-size:.85rem">' + escapeHtml(state.email || '') + '</div>' + (g ? chipGrupo(g) : '') + '</div></section>' +
    renderMiGrupo(act) +
    '<section class="card"><h3 class="card-titulo">🏅 Insignias</h3>' + renderInsignias(act, 'insignias-perfil') + '</section>' +
    '<section class="card"><h3 class="card-titulo">🎨 Apariencia</h3><fieldset style="border:none;margin:0;padding:0"><legend class="sr-only">Tema</legend>' + opcion('auto', '🌓 Como mi dispositivo') + opcion('claro', '☀️ Claro') + opcion('oscuro', '🌙 Oscuro') + '</fieldset></section>' +
    '<button type="button" class="btn ghost" data-action="salir">🚪 Cerrar sesión</button>';
}

// ---------- Vista completa ----------
function renderAlumno(data, act) {
  // Inglés ya no trae tareas de Notion (openspec: cierre-tecnico, fase 2): todo sale de las actividades en línea.
  const hayAlgo = !!(act && act.items && act.items.length);
  // Alta nueva antes de su lunes de inicio (openspec: inicio-lunes-alumnos).
  const porEmpezar = act && act.inicio && act.hoy < act.inicio ? '<div class="card" style="text-align:center">📅 <b>Tu curso empieza el lunes ' + escapeHtml(formatFecha(act.inicio).replace(/^\S+\s/, '')) + '.</b><br><span class="muted">Ese día aparecen tus primeras actividades. ¡Bienvenido o bienvenida!</span></div>' : '';
  const nombre = nombreAlumno(data), nivel = nivelAlumno(act), av = avanceSemana(act);
  const racha = (act && act.racha) || { dias: 0, hoy: false };
  const g = act && act.grupo;
  const hero = '<section class="hero" aria-label="Tu avance" style="--gc:' + escapeHtml((g && g.color) || '#4f46e5') + '">' +
    '<div class="quien"><div class="hola">¡Hola' + (nombre ? ', ' + escapeHtml(nombre.split(' ')[0]) : '') + '! 👋</div>' +
    '<div class="muted" style="font-size:.85rem">' + (act && act.semana ? '📚 ' + escapeHtml(act.semana.titulo) : 'Tu semana de Inglés') + '</div>' +
    '<div class="chips">' + (nivel ? '<span class="chip" id="nivel">🎓 Nivel ' + escapeHtml(nivel) + '</span>' : '') +
    '<span class="chip racha" id="racha" title="Días seguidos con entregas" aria-label="Racha: ' + racha.dias + ' día(s) seguidos con entregas">🔥 ' + racha.dias + '</span>' +
    '<span class="chip gris">' + av.hechos + ' de ' + av.total + ' esta semana</span></div></div>' +
    '<div id="anillo">' + anillo(av.pct, 'semana') + '</div></section>';
  const inicio = (porEmpezar || '') + (hayAlgo || !porEmpezar ? hero + renderProximaClase(act) + renderParaHoy(act) + '<section class="card"><h3 class="card-titulo">🏅 Insignias</h3>' + renderInsignias(act) + '</section>' : renderProximaClase(act)) +
    (!hayAlgo && !porEmpezar ? '<div class="card">' + vacio('🗒️', 'No hay clases registradas todavía.') + '</div>' : '');
  const semana = hayAlgo ? renderLineaSemana(act) + renderWeekCard(act) +
    '<h3 class="card-titulo" style="margin-top:16px">📋 Todas mis tareas</h3>' + renderBoard(itemRowsAlumno(act)) : '<div class="card">' + vacio('📅', 'Aún no hay actividades en tu semana.') + '</div>';
  return seccionHtml('alumno', 'inicio', inicio) +
    seccionHtml('alumno', 'semana', semana) +
    seccionHtml('alumno', 'resultados', renderResultadosAlumno(act)) +
    seccionHtml('alumno', 'perfil', renderPerfil(data, act));
}
