// Pestaña «📋 Revisión» del profe en Secundaria (openspec: revision-profe). Solo admin, con la alumna del selector
// «👀 Viendo el tablero de». Carga perezosa: GET /profe/revision sale solo al abrir la pestaña (irPestanaSec en
// ingles/secundaria.js, o al llegar con #revision). Una semana (lunes a domingo) con navegación, resumen arriba,
// una tarjeta por clase agrupada por día y «📌 Abiertas esta semana». Cada tarjeta es un <form>: avance en línea,
// checklist de libreta, audio, libro de ortografía, calificación del profe (0–10 de medio en medio), comentario y
// calificación final. Guardar = PUT /profe/revision con el estado completo de la tarjeta; las casillas se guardan solas.
// Fórmula de la final y resumen: SOLO en comun/revision-datos.js (RevisionDatos). Aquí solo se dibuja.
const RevD = () => window.RevisionDatos;
const REV_REINTENTO_MS = 3000;

// ---------- Estado y carga ----------
// state.secRev = { semana, datos, error, cargando, pedida } (datos = respuesta de GET /profe/revision).
const revAlumna = () => (state.act && state.act.vistaDe && state.act.vistaDe.slug) || null;
const revQuery = extra => {
  const q = new URLSearchParams(extra || {});
  if (!StaldAuth.email()) q.set('email', state.email || '');
  const s = q.toString();
  return s ? '?' + s : '';
};

async function cargarRevisionSec(semana) {
  const alumna = revAlumna();
  if (!alumna) return;
  const pedida = semana || (state.secRev && state.secRev.semana) || '';
  state.secRev = { ...(state.secRev || {}), cargando: true, pedida, alumna };
  pintarRevision();
  const r = await fetchJson(API_BASE + '/profe/revision' + revQuery({ alumna, ...(pedida ? { semana: pedida } : {}) })).catch(() => null);
  if (!state.secRev || state.secRev.pedida !== pedida || state.secRev.alumna !== alumna) return; // cambió de semana o de alumna mientras cargaba
  state.secRev = r && r.ok
    ? { alumna, pedida, semana: r.body.semana.lunes, datos: r.body, cargando: false }
    : { alumna, pedida, semana: pedida, datos: null, cargando: false, error: r ? (r.body.error || r.status) : 'sin_red' };
  pintarRevision();
}

// Llamada desde irPestanaSec y desde renderSecundaria cuando la pestaña activa es «revision».
function abrirRevisionSec() {
  const s = state.secRev;
  if (s && s.alumna === revAlumna() && (s.datos || s.cargando)) return;
  cargarRevisionSec(s && s.alumna === revAlumna() ? s.semana : '');
}

function pintarRevision(enfocar) {
  const cont = document.getElementById('sec-rev');
  if (!cont) return;
  cont.innerHTML = cuerpoRevision();
  if (enfocar) { const h = document.getElementById('rev-titulo'); if (h) h.focus({ preventScroll: false }); }
}

// ---------- Dibujo ----------
// Lo que pone ingles/secundaria.js en el panel. `activa`: la pestaña está a la vista (entonces se pide la semana).
function renderSecRevision(activa) {
  if (activa) setTimeout(abrirRevisionSec, 0);
  return '<div id="sec-rev" class="rev">' + cuerpoRevision() + '</div>';
}

function cuerpoRevision() {
  const s = state.secRev;
  if (!revAlumna()) return vacio('👀', 'Elige una alumna en «Viendo el tablero de» para revisar su semana.');
  if (!s || s.alumna !== revAlumna() || (s.cargando && !s.datos)) return navSemana(null) + esqueleto();
  if (s.error) {
    return navSemana(null) + '<div class="exam-card" role="alert"><div class="pf-ok">⚠️ No se pudo cargar la revisión (' + escapeHtml(String(s.error)) + ').</div>' +
      '<button type="button" class="btn" data-rev-recargar>🔁 Reintentar</button></div>';
  }
  const d = s.datos;
  const avisos = d.avisos && d.avisos.length
    ? '<p class="rev-aviso" role="status">⚠️ Algunos datos no se pudieron leer (' + escapeHtml(d.avisos.join(', ')) + '); esas tarjetas salen sin ellos.</p>' : '';
  return navSemana(d) + (s.cargando ? esqueleto() : resumenRevision(d.clases) + avisos + diasRevision(d) + abiertasRevision(d) + misionesRevision(d));
}

const revFecha = f => formatFecha(f);
function navSemana(d) {
  const titulo = d ? 'Semana del ' + revFecha(d.semana.lunes) + ' al ' + revFecha(d.semana.domingo) : 'Revisión de la semana';
  const nombre = d ? ' · ' + d.alumna.nombre : '';
  const dis = d ? '' : ' disabled';
  const esEsta = d && d.hoy >= d.semana.lunes && d.hoy <= d.semana.domingo;
  return '<div class="exam-card rev-cabeza" data-testid="rev-semana" data-lunes="' + (d ? d.semana.lunes : '') + '"><h3 id="rev-titulo" tabindex="-1">📋 ' + escapeHtml(titulo + nombre) + '</h3>' +
    '<nav class="rev-nav" aria-label="Cambiar de semana">' +
    '<button type="button" class="btn ghost" data-testid="rev-semana-anterior" data-rev-semana="' + (d ? d.semana.anterior : '') + '"' + dis + '>◀ Semana anterior</button>' +
    '<button type="button" class="btn ghost" data-testid="rev-semana-hoy" data-rev-semana=""' + (d && !esEsta ? '' : ' disabled') + (esEsta ? ' aria-current="date"' : '') + '>Esta semana</button>' +
    '<button type="button" class="btn ghost" data-testid="rev-semana-siguiente" data-rev-semana="' + (d ? d.semana.siguiente : '') + '"' + dis + '>Semana siguiente ▶</button></nav></div>';
}

const numero = n => (n === null || n === undefined ? '—' : String(n));
function resumenRevision(clases) {
  const r = RevD().resumenSemana(clases);
  const kpi = (id, valor, titulo) => '<div class="rev-kpi" id="rev-k-' + id + '" data-rev-resumen="' + id + '"><b class="rpg-num">' + escapeHtml(valor) + '</b><span>' + titulo + '</span></div>';
  const materias = r.porMateria.map(m => '<span class="chip mat-chip mat-' + escapeHtml(m.clave) + '" data-testid="rev-materia" data-materia="' + escapeHtml(m.clave) + '">' + escapeHtml(m.nombre) + ' · ' + escapeHtml(numero(m.promedio)) +
    ' <small>(' + m.revisadas + '/' + m.clases + ')</small></span>').join(' ');
  return '<section class="exam-card rev-resumen" id="rev-resumen" data-testid="rev-resumen" aria-label="Resumen de la semana" aria-live="polite">' +
    '<div class="rev-kpis">' + kpi('clases', String(r.clases), 'Clases') + kpi('enviadas', String(r.enviadas), 'Enviadas') +
    kpi('revisadas', String(r.revisadas), 'Revisadas por ti') + kpi('pendientes', String(r.pendientes), 'Pendientes de revisar') +
    kpi('promedio', numero(r.promedio), 'Promedio final') + '</div>' +
    (materias ? '<div class="rev-materias"><span class="meta">Por materia (final · revisadas/clases):</span> ' + materias + '</div>' : '') + '</section>';
}
function repintarResumen() {
  const el = document.getElementById('rev-resumen');
  if (el && state.secRev && state.secRev.datos) el.outerHTML = resumenRevision(state.secRev.datos.clases);
}

function diasRevision(d) {
  return '<div class="rev-dias">' + d.semana.dias.map(f => {
    const suyas = d.clases.filter(c => c.dia === f);
    const hoy = f === d.hoy;
    return '<section class="rev-dia' + (hoy ? ' es-hoy' : '') + '" data-testid="rev-dia" data-dia="' + f + '" aria-label="' + escapeHtml(nombreDia(f)) + '"><h4>' + escapeHtml(nombreDia(f)) + (hoy ? ' <span class="chip">hoy</span>' : '') + '</h4>' +
      (suyas.length ? suyas.map(tarjetaRevision).join('') : '<p class="meta rev-libre">Sin clases.</p>') + '</section>';
  }).join('') + '</div>';
}
function abiertasRevision(d) {
  if (!d.abiertas || !d.abiertas.length) return '';
  return '<section class="rev-abiertas" data-testid="rev-abiertas" aria-labelledby="rev-abiertas-t"><h3 class="sec-subtitulo" id="rev-abiertas-t">📌 Abiertas esta semana</h3>' +
    '<p class="meta">Repasos y guías de otro día que siguen abiertos esta semana.</p><div class="rev-dias rev-dias-plana">' + d.abiertas.map(tarjetaRevision).join('') + '</div></section>';
}

// Estado en línea de una clase (con los datos que ya existen).
function avanceLinea(c) {
  const partes = [];
  if (c.estado === 'enviada') {
    partes.push('<span class="chip ok" data-testid="rev-estado">✅ Enviada</span>');
    if (c.mejor) partes.push('<span class="chip" data-testid="rev-en-linea">⭐ ' + c.mejor.porcentaje + ' %</span>');
    if (c.fueraDeTiempo) partes.push('<span class="chip warn" data-testid="rev-fuera-de-tiempo">⏰ Fuera de tiempo</span>');
    if (c.intentosMax) partes.push('<span class="meta">' + (c.intentosUsados || 0) + '/' + c.intentosMax + ' oportunidades</span>');
  } else if (c.estado === 'borrador') {
    const b = c.borrador || {};
    partes.push('<span class="chip warn" data-testid="rev-estado">💾 En borrador · avanzó ' + (b.respondidas || 0) + ' de ' + (b.total || 0) + '</span>');
  } else if (c.abre) {
    partes.push('<span class="chip gris" data-testid="rev-estado">🔒 Abre ' + escapeHtml(revFecha(c.abre)) + '</span>');
  } else {
    partes.push('<span class="chip gris" data-testid="rev-estado">⏳ Sin abrir</span>');
  }
  return partes.join(' ');
}
// «🔎 Ver respuestas» usa el detalle que ya existe (ver-resultado de ingles/app.js) con la lista de la alumna.
function botonesLinea(c) {
  const it = ((state.act && state.act.items) || []).find(x => x.id === c.id);
  const ver = c.estado === 'enviada' && it && it.mejor ? '<button type="button" class="btn ghost" data-testid="rev-ver-respuestas" data-action="ver-resultado" data-id="' + escapeHtml(c.id) + '">🔎 Ver respuestas</button>' : '';
  return '<div class="rev-acciones">' + ver + '<button type="button" class="btn ghost" data-sec-tab="resultados">📝 Resultados</button></div>';
}

// Calificación final en vivo: la del profe sale del formulario (aún sin guardar) para que la vea al elegirla.
function textoFinal(c, calificacion) {
  const RD = RevD();
  const enLinea = RD.enLineaDe(c);
  const f = RD.finalDe({ ...c, revision: { calificacion } });
  const linea = 'en línea ' + (RD.enviada(c) ? enLinea.toFixed(1) : '0 (sin enviar)');
  return f === null ? '<b>Final: falta tu revisión</b> <span class="meta">· ' + linea + '</span>' : '<b>Final: <span class="rpg-num">' + f.toFixed(1) + '</span></b> <span class="meta">· ' + linea + ' · tuya ' + calificacion + '</span>';
}

function valorFinal(c, calificacion) {
  const f = RevD().finalDe({ ...c, revision: { calificacion } });
  return f === null ? '' : String(f);
}
function pintarFinal(f, c, calificacion) {
  const el = f.querySelector('[data-rev-final]');
  el.dataset.final = valorFinal(c, calificacion);
  el.innerHTML = textoFinal(c, calificacion);
}

const OPCIONES_CAL = Array.from({ length: 21 }, (_, i) => i / 2);
function tarjetaRevision(c) {
  const m = materiaDe(c);
  const rev = c.revision || { checks: [], audio: false, libro: false, calificacion: null, comentario: '' };
  const pide = c.pide || { libreta: [], audio: false, libro: false };
  const k = 'rev-' + c.id.replace(/[^\w-]/g, '_');
  const casilla = (attrs, texto, marcada) => '<label class="rev-check"><input type="checkbox" ' + attrs + (marcada ? ' checked' : '') + '> <span>' + texto + '</span></label>';
  const checklist = pide.libreta.length
    ? '<fieldset class="rev-libreta"><legend>📓 Libreta</legend>' + pide.libreta.map((t, i) => casilla('data-testid="rev-check" data-indice="' + i + '" data-rev-check="' + i + '"', escapeHtml(t), rev.checks.includes(i))).join('') + '</fieldset>' : '';
  const extras = (pide.audio ? casilla('data-testid="rev-audio" data-rev-audio', '🎙️ Audio recibido', rev.audio) : '') +
    (pide.libro ? casilla('data-testid="rev-libro" data-rev-libro', '📖 Páginas del libro de ortografía revisadas', rev.libro) : '');
  const revisada = typeof rev.calificacion === 'number';
  return '<form class="exam-card rev-card mat-' + (m ? m.clave : 'otra') + (revisada ? ' rev-hecha' : '') + '" data-testid="rev-tarjeta" data-rev-id="' + escapeHtml(c.id) + '" data-estado="' + escapeHtml(c.estado) + '" novalidate>' +
    '<header class="rev-card-top"><div class="t">' + chipMateria(m) + ' <span class="sec-tema">' + escapeHtml(textoClase(c, m)) + '</span>' + (c.tipo === 'examen' ? ' <span class="chip">Examen</span>' : '') + '</div>' +
    '<span class="rev-sello" data-rev-sello>' + (revisada ? '✅ Revisada' : (c.estado === 'enviada' ? '🕓 Por revisar' : '')) + '</span></header>' +
    '<div class="rev-linea">' + avanceLinea(c) + '</div>' + botonesLinea(c) +
    '<div class="rev-manual">' + checklist + (extras ? '<div class="rev-extras">' + extras + '</div>' : '') +
    '<div class="rev-campos"><label class="rev-cal" for="' + k + '-cal">Tu calificación' +
    '<select id="' + k + '-cal" data-testid="rev-calificacion" data-rev-cal><option value="">— Sin calificar</option>' +
    OPCIONES_CAL.map(n => '<option value="' + n + '"' + (rev.calificacion === n ? ' selected' : '') + '>' + n + '</option>').join('') + '</select></label>' +
    '<label class="rev-com" for="' + k + '-com">Comentario para la alumna <small class="meta" data-rev-cuenta>' + (rev.comentario || '').length + ' / ' + RevD().MAX_COMENTARIO + '</small>' +
    '<textarea id="' + k + '-com" rows="2" maxlength="' + RevD().MAX_COMENTARIO + '" data-testid="rev-comentario" data-rev-com>' + escapeHtml(rev.comentario || '') + '</textarea></label></div></div>' +
    '<p class="rev-final" data-testid="rev-final" data-final="' + valorFinal(c, rev.calificacion) + '" data-rev-final aria-live="polite">' + textoFinal(c, rev.calificacion) + '</p>' +
    '<div class="rev-guardar"><button type="submit" class="btn" data-testid="rev-guardar">💾 Guardar revisión</button>' +
    '<span class="rev-guardado" data-rev-estado role="status" aria-live="polite">' + (rev.revisadoEn ? '💾 Guardado' : '') + '</span></div></form>';
}

function misionesRevision(d) {
  const lista = RevD().misionesDeSemana(misionesSec(), d.semana.lunes);
  const cuerpo = lista.length ? '<ul class="rev-misiones">' + lista.map(mi => {
    const a = avanceMision(mi);
    return '<li class="rev-mision" data-testid="rev-mision"><div><b>' + escapeHtml(mi.titulo) + '</b><div class="meta">' + EMOJI_AVANCE[a.clave] + ' ' + escapeHtml(a.texto) + ' · ' + a.hechos + ' de ' + a.total + ' pasos entregados</div></div>' +
      '<button type="button" class="btn ghost" data-testid="rev-ir-entregas" data-sec-tab="entregas">📥 Ir a Entregas</button></li>';
  }).join('') + '</ul>' : '<p class="meta">Ninguna misión vence esta semana.</p>';
  return '<section class="exam-card rev-mis" aria-labelledby="rev-mis-t"><h3 id="rev-mis-t">⚔️ Misiones de la semana</h3>' + cuerpo +
    '<p class="meta">La evaluación con rúbrica está en «📥 Entregas».</p></section>';
}

// ---------- Guardar ----------
const claseDeForm = f => {
  const d = state.secRev && state.secRev.datos;
  return d ? [...d.clases, ...(d.abiertas || [])].find(c => c.id === f.dataset.revId) : null;
};
function leerForm(f) {
  const cal = f.querySelector('[data-rev-cal]').value;
  const aud = f.querySelector('[data-rev-audio]'), lib = f.querySelector('[data-rev-libro]');
  return {
    alumna: state.secRev.alumna, id: f.dataset.revId,
    checks: [...f.querySelectorAll('[data-rev-check]:checked')].map(x => Number(x.dataset.revCheck)),
    audio: !!(aud && aud.checked), libro: !!(lib && lib.checked),
    calificacion: cal === '' ? null : Number(cal), comentario: f.querySelector('[data-rev-com]').value.trim(),
  };
}
const MSG_ERROR = {
  calificacion_invalida: 'la calificación va de 0 a 10, de medio en medio punto', comentario_invalido: 'el comentario es de hasta 300 caracteres',
  checks_invalidos: 'el checklist cambió; recarga la semana', no_encontrado: 'esa clase ya no es de esta alumna', alumna_no_encontrada: 'no encontré a la alumna',
  sin_base: 'la base de datos no está lista', conflicto_escritura: 'alguien más guardó al mismo tiempo', sin_red: 'sin conexión',
};
function ponerEstado(f, html, clase) {
  const e = f.querySelector('[data-rev-estado]');
  e.className = 'rev-guardado' + (clase ? ' ' + clase : '');
  e.innerHTML = html;
}
async function guardarRevision(f, intento = 1) {
  const clase = claseDeForm(f);
  if (!clase) return;
  clearTimeout(f._revReintento);
  const n = (f._revN || 0) + 1; f._revN = n; // solo cuenta la respuesta del último guardado
  ponerEstado(f, '💾 Guardando…', 'guardando');
  const r = await fetchJson(API_BASE + '/profe/revision' + revQuery(), { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(leerForm(f)) }).catch(() => null);
  if (f._revN !== n) return;
  if (r && r.ok) {
    clase.revision = r.body.revision;
    const revisada = !!(r.body.revision && typeof r.body.revision.calificacion === 'number');
    f.classList.toggle('rev-hecha', revisada);
    f.querySelector('[data-rev-sello]').textContent = revisada ? '✅ Revisada' : (clase.estado === 'enviada' ? '🕓 Por revisar' : '');
    ponerEstado(f, r.body.vacia ? '💾 Guardado · sin revisión' : '💾 Guardado', 'ok');
    repintarResumen();
    return;
  }
  const error = r ? (r.body.error || r.status) : 'sin_red';
  // Fallas pasajeras (sin red, 5xx salvo sin_base): un reintento solo; después, el botón.
  const pasajera = !r || r.status === 0 || (r.status >= 500 && error !== 'sin_base');
  if (pasajera && intento === 1) {
    ponerEstado(f, '⚠️ No se guardó; reintento en unos segundos…', 'error');
    f._revReintento = setTimeout(() => guardarRevision(f, 2), REV_REINTENTO_MS);
    return;
  }
  ponerEstado(f, '⚠️ No se guardó (' + escapeHtml(MSG_ERROR[error] || String(error)) + '). <button type="button" class="btn ghost sm" data-rev-reintentar>🔁 Reintentar</button>', 'error');
}

// ---------- Eventos ----------
document.addEventListener('click', e => {
  const s = e.target.closest('[data-rev-semana]');
  if (s && !s.disabled) {
    const destino = s.dataset.revSemana || (state.secRev && state.secRev.datos ? state.secRev.datos.hoy : '');
    cargarRevisionSec(destino).then(() => pintarRevision(true));
    return;
  }
  if (e.target.closest('[data-rev-recargar]')) { cargarRevisionSec(state.secRev && state.secRev.pedida); return; }
  const re = e.target.closest('[data-rev-reintentar]');
  if (re) guardarRevision(re.closest('form.rev-card'));
});
document.addEventListener('submit', e => {
  const f = e.target.closest && e.target.closest('form.rev-card');
  if (!f) return;
  e.preventDefault();
  guardarRevision(f);
});
document.addEventListener('change', e => {
  const f = e.target.closest && e.target.closest('form.rev-card');
  if (!f) return;
  if (e.target.type === 'checkbox') { guardarRevision(f); return; } // las casillas se guardan solas
  if (e.target.matches('[data-rev-cal]')) {
    const clase = claseDeForm(f);
    const v = e.target.value === '' ? null : Number(e.target.value);
    if (clase) pintarFinal(f, clase, v);
    ponerEstado(f, '✏️ Sin guardar', 'pendiente');
  }
});
document.addEventListener('input', e => {
  const f = e.target.closest && e.target.closest('form.rev-card');
  if (!f || !e.target.matches('[data-rev-com]')) return;
  f.querySelector('[data-rev-cuenta]').textContent = e.target.value.length + ' / ' + RevD().MAX_COMENTARIO;
  ponerEstado(f, '✏️ Sin guardar', 'pendiente');
});
