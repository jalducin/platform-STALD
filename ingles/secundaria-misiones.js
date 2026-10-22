// Misiones principales en Secundaria (ingles.html?modo=secundaria; openspec: rpg-fase2-misiones). Pestañas
// «⚔️ Misiones» (lista, pasos y entrega SOLO en texto con recordatorio de privacidad y contador), «🗺️ Mapa» (mundos
// del catálogo con zonas y capítulos), «🌳 Árbol» (temas por materia) y, para el admin, «📥 Entregas» (bandeja básica:
// evaluar con la rúbrica, pedir corrección y borrar contenido). Práctica de la teoría con revisión en el servidor.
// Reglas (XP, estados, árbol, misiones del día y de la semana): SOLO en comun/gamificacion.js. Aquí solo se dibuja.
const MIS_MAX = 4000;
const misGam = () => window.Gamificacion;
const misionesSec = () => (state.secMis && state.secMis.misiones) || [];
const catalogoSec = () => (state.secMis && state.secMis.mundos) || null;
const misPre = t => '<div class="mis-pre">' + escapeHtml(t || '') + '</div>';
const misFecha = f => (f ? formatFecha(f) : '');
const misClaveEmail = () => hashCorto(state.email || '');

// ---------- Carga ----------
async function cargarMisionesSec(q, alumna) {
  const sep = q ? '&' : '?';
  const url = API_BASE + '/misiones' + q + (alumna ? sep + 'alumna=' + encodeURIComponent(alumna) : '');
  const r = await fetchJson(url).catch(() => null);
  state.secMis = r && r.ok ? r.body : { misiones: [], mundos: null, error: r ? (r.body.error || r.status) : 'sin_red' };
}
async function cargarBandejaSec() {
  const q = StaldAuth.email() ? '' : '?email=' + encodeURIComponent(state.email || '');
  const r = await fetchJson(API_BASE + '/profe/entregas' + q).catch(() => null);
  state.secBandeja = r && r.ok ? r.body : { entregas: [], error: r ? (r.body.error || r.status) : 'sin_red' };
}
const misQuery = () => (StaldAuth.email() ? '' : '?email=' + encodeURIComponent(state.email || ''));

// ---------- Estado de una misión para la alumna ----------
function avanceMision(m) {
  const pasos = (m.entrega && m.entrega.pasos) || {};
  const hechos = m.pasos.filter(p => pasos[p.id] && pasos[p.id].estado === 'entregado').length;
  const correccion = m.pasos.some(p => pasos[p.id] && pasos[p.id].estado === 'correccion');
  let clave = 'en-curso', texto = 'En curso';
  if (m.evaluacion) { clave = 'evaluada'; texto = 'Evaluada · ' + m.evaluacion.porcentaje + ' %'; }
  else if (correccion) { clave = 'correccion'; texto = 'Ajusta un paso'; }
  else if (hechos === m.pasos.length) { clave = 'lista'; texto = 'Entregada · el profe la revisa'; }
  return { hechos, total: m.pasos.length, pct: Math.round(hechos * 100 / m.pasos.length), clave, texto };
}
const EMOJI_AVANCE = { 'en-curso': '🟡', evaluada: '🏆', correccion: '✏️', lista: '📨' };
const mundoDeMisionSec = m => {
  const cat = catalogoSec() || misGam().catalogoDeMundos();
  return cat.find(w => w.id === m.mundo) || null;
};
const XP_MAX_MISION = () => 100 * misGam().XP_MISION_POR_PUNTO + misGam().XP_MISION_A_TIEMPO;

// ---------- Retroalimentación: misión recién evaluada (una sola vez por evaluación, en este aparato) ----------
const claveVista = m => 'stald_mis_eval:' + misClaveEmail() + ':' + m.id + ':' + (m.evaluacion && m.evaluacion.fecha);
function evaluacionesNuevas() {
  if (!state.secMis || state.secMis.isAdmin) return [];
  return misionesSec().filter(m => m.evaluacion && (() => { try { return localStorage.getItem(claveVista(m)) !== '1'; } catch (e) { return false; } })());
}
function avisoEvaluacionHtml(items, hoy) {
  const nuevas = evaluacionesNuevas();
  if (!nuevas.length) return '';
  const G = misGam();
  const total = G.xpTotalConMisiones(items, misionesSec(), { hoy });
  const sinNuevas = total - nuevas.reduce((a, m) => a + G.xpDeMision(m), 0);
  const nA = G.nivelDe(sinNuevas), nD = G.nivelDe(total);
  for (const m of nuevas) { try { localStorage.setItem(claveVista(m), '1'); } catch (e) { /* sin almacenamiento */ } }
  return '<section class="exam-card sec-recompensa mis-recompensa" id="mis-recompensa" aria-live="polite">' +
    '<div class="sec-xp-ganado">+' + nuevas.reduce((a, m) => a + G.xpDeMision(m), 0) + ' XP</div>' +
    '<p><b>¡El profe evaluó tu misión!</b> ' + nuevas.map(m => escapeHtml(m.titulo) + ' · ' + m.evaluacion.porcentaje + ' %').join(' · ') + '</p>' +
    (nD.nivel > nA.nivel ? '<p class="chip fortaleza">⬆️ ¡Subiste a nivel ' + nD.nivel + '!</p>' : '') +
    '<button type="button" class="btn ghost" data-mis-abrir="' + escapeHtml(nuevas[0].id) + '">Ver la retroalimentación →</button></section>';
}

// ---------- Inicio: misión principal del mundo y misiones del día y de la semana (sin XP) ----------
function misionInicioHtml(items, hoy) {
  const activa = misionesSec().find(m => !m.evaluacion) || null;
  let cuerpo;
  if (activa) {
    const a = avanceMision(activa);
    const w = mundoDeMisionSec(activa);
    const siguiente = activa.pasos.find(p => !(activa.entrega && activa.entrega.pasos[p.id] && activa.entrega.pasos[p.id].estado === 'entregado'));
    cuerpo = '<span class="rpg-etiqueta">⚔️ Misión principal del mundo</span><h3 class="rpg-mision-t">' + escapeHtml(activa.titulo) + '</h3>' +
      '<p class="rpg-mision-d">' + escapeHtml([w ? w.emoji + ' ' + w.nombre : '', a.texto, siguiente ? 'Siguiente: ' + siguiente.titulo + ' · vence ' + misFecha(siguiente.fechaLimite) : ''].filter(Boolean).join(' · ')) + '</p>' +
      '<div class="rpg-xp-barra" role="progressbar" aria-label="Pasos entregados" aria-valuemin="0" aria-valuemax="' + a.total + '" aria-valuenow="' + a.hechos + '"><span style="width:' + a.pct + '%"></span></div>' +
      '<p class="meta">' + a.hechos + ' de ' + a.total + ' pasos · hasta +' + XP_MAX_MISION() + ' XP</p>' +
      '<button type="button" class="btn rpg-btn-mision" data-mis-abrir="' + escapeHtml(activa.id) + '">⚔️ Continuar misión →</button>';
  } else if (misionesSec().length) {
    cuerpo = '<span class="rpg-etiqueta">🏆 Misiones principales</span><p class="rpg-mision-d">Ya entregaste y el profe evaluó tus misiones. ¡Bien hecho!</p>';
  } else return '';
  return '<section class="card mis-inicio" id="mis-inicio" aria-label="Misión principal del mundo">' + cuerpo + '</section>';
}
function misionesSemanaHtml(items, hoy) {
  const G = misGam();
  const lista = [G.misionDiaria(items, hoy), ...G.misionesSemanales(items, misionesSec(), hoy)].filter(x => x.total > 0);
  if (!lista.length) return '';
  return '<section class="card mis-semana" id="mis-semana" aria-labelledby="mis-semana-t"><h3 class="card-titulo" id="mis-semana-t">🗓️ Misiones de hoy y de la semana</h3>' +
    '<p class="meta">Dan insignias y progreso; la XP sale de tus clases y misiones principales.</p><ul class="mis-semana-lista">' +
    lista.map(x => '<li class="mis-semana-item' + (x.completa ? ' completa' : '') + '" data-mis-semanal="' + x.id + '"><span aria-hidden="true">' + (x.completa ? '✅' : x.emoji) + '</span>' +
      '<span class="mis-semana-t">' + escapeHtml(x.titulo) + '</span><span class="rpg-contador rpg-num">' + x.hechas + ' / ' + x.total + '</span></li>').join('') + '</ul></section>';
}

// ---------- 🗺️ Mapa ----------
const EST_MUNDO = { bloqueado: ['🔒', 'Bloqueado'], 'en-curso': ['🟡', 'En curso'], completado: ['✅', 'Completado'], dominado: ['⭐', 'Dominado'] };
function renderSecMapa(items, hoy) {
  const mapa = misGam().mapaRpg(items, hoy, { catalogo: catalogoSec(), misiones: misionesSec() }).filter(m => m.mundos.length);
  const aviso = state.secMis && !catalogoSec() ? '<p class="meta">Mapa con los mundos de siempre (el catálogo no está disponible ahora).</p>' : '';
  return '<p class="rpg-leyenda" aria-hidden="true"><span>🔒 bloqueado</span><span>🟡 en curso</span><span>✅ completado</span><span>⭐ dominado</span></p>' + aviso +
    '<div class="sec-materias mis-mapa">' + mapa.map(m => '<article class="sec-materia mat-' + m.clave + '" data-mapa-materia="' + m.clave + '"><header class="sec-materia-top"><span class="sec-materia-emoji" aria-hidden="true">' + m.emoji + '</span><h3>' + escapeHtml(m.nombre) + '</h3></header>' +
      '<ol class="mis-mundos">' + m.mundos.map(w => {
        const [e, t] = EST_MUNDO[w.estado];
        const fechas = w.desde ? misFecha(w.desde) + (w.hasta ? ' → ' + misFecha(w.hasta) : ' →') : 'Todo el ciclo';
        const mision = w.mision ? '<p class="mis-mundo-mision">⚔️ ' + escapeHtml(w.mision.titulo) + (w.mision.evaluada ? ' · ' + w.mision.porcentaje + ' %' : '') +
          ' <button type="button" class="btn ghost mis-btn-chico" data-mis-abrir="' + escapeHtml(w.mision.id) + '">Ver misión</button></p>' : '';
        const zonas = w.estado !== 'bloqueado' && w.zonas.length ? '<details class="mis-zonas"><summary>' + (w.hasta && hoy > w.hasta ? '🔁 Repasar: ' : '') + 'Zonas y capítulos (' + w.total + ')</summary>' +
          w.zonas.map(z => '<div class="mis-zona"><b>Zona ' + z.n + '</b>' + (z.desde ? ' <small>' + escapeHtml(misFecha(z.desde)) + ' → ' + escapeHtml(misFecha(z.hasta)) + '</small>' : '') + '<ul>' +
            z.capitulos.map(c => '<li><span aria-hidden="true">' + (misGam().estaHecha(c) ? '✅' : '▫️') + '</span> ' +
              (c.disponibleDesde && c.disponibleDesde > hoy ? escapeHtml(SD.temaDe(c)) + ' <small>(abre ' + escapeHtml(misFecha(c.disponibleDesde)) + ')</small>'
                : '<button type="button" class="link mis-capitulo" data-action="abrir-item" data-id="' + escapeHtml(c.id) + '">' + escapeHtml(SD.temaDe(c)) + '</button>') + '</li>').join('') + '</ul></div>').join('') + '</details>' : '';
        return '<li class="mis-mundo est-' + w.estado + '" data-mundo-id="' + escapeHtml(w.id || '') + '"><div class="mis-mundo-top"><span class="mis-mundo-n"><span aria-hidden="true">' + escapeHtml(w.emoji) + '</span> ' + escapeHtml(w.nombre) +
          (w.etapa ? ' <small>' + escapeHtml(w.etapa) + '</small>' : '') + '</span><span class="mis-estado est-' + w.estado + '"><span aria-hidden="true">' + e + '</span> ' + t + '</span></div>' +
          '<p class="meta">' + escapeHtml(fechas) + (w.total ? ' · ' + w.hechas + '/' + w.total + ' clases' : '') + (w.promedio !== null ? ' · promedio ' + w.promedio + ' %' : '') + '</p>' + mision + zonas + '</li>';
      }).join('') + '</ol></article>').join('') + '</div>';
}

// ---------- 🌳 Árbol ----------
const EST_NODO = { 'no-visto': ['🔒', 'Aún no visto'], progreso: ['🌱', 'En progreso'], reforzar: ['🔧', 'A reforzar'], dominado: ['🌳', 'Dominado'] };
function renderSecArbol(items, hoy) {
  const arbol = misGam().arbolHabilidades(items, hoy, { catalogo: catalogoSec(), misiones: misionesSec() }).filter(m => m.mundos.length);
  if (!arbol.length) return vacio('🌳', 'Tu árbol crece con cada clase. ¡Haz tu primera misión para ver tus temas!');
  return '<p class="rpg-leyenda" aria-hidden="true"><span>🔒 aún no visto</span><span>🌱 en progreso</span><span>🔧 a reforzar</span><span>🌳 dominado</span></p>' +
    '<div class="sec-materias mis-arbol">' + arbol.map(m => '<article class="sec-materia mat-' + m.clave + '" data-arbol-materia="' + m.clave + '"><header class="sec-materia-top"><span class="sec-materia-emoji" aria-hidden="true">' + m.emoji + '</span><h3>' + escapeHtml(m.nombre) + '</h3></header>' +
      m.mundos.map(w => '<h4 class="mis-arbol-mundo"><span aria-hidden="true">' + escapeHtml(w.emoji) + '</span> ' + escapeHtml(w.nombre) + '</h4><ul class="mis-nodos">' + w.nodos.map(n => {
        const [e, t] = EST_NODO[n.estado];
        const extra = n.estado === 'no-visto' && n.bloqueado ? 'Aún no abre' : t + (n.porcentaje !== null ? ' · ' + n.porcentaje + ' %' : '');
        const boton = n.repasoId ? '<button type="button" class="btn mis-btn-chico" data-action="abrir-item" data-id="' + escapeHtml(n.repasoId) + '">🔧 Reforzar</button>' : '';
        return '<li class="mis-nodo est-' + n.estado + '" data-nodo="' + escapeHtml(n.tema) + '"><span class="mis-nodo-ico" aria-hidden="true">' + e + '</span><span class="mis-nodo-t"><b>' + escapeHtml(n.tema) + '</b><small>' + escapeHtml(extra) + '</small></span>' + boton + '</li>';
      }).join('') + '</ul>').join('') + '</article>').join('') + '</div>';
}

// ---------- Práctica de la teoría (se comprueba en el servidor; la respuesta no está en la página) ----------
function practicaHtml(teoria, ctx) {
  const preguntas = (teoria || []).flatMap(b => (b && b.practica) || []);
  if (!preguntas.length) return '';
  const attr = ctx.itemId ? ' data-item="' + escapeHtml(ctx.itemId) + '"' : ' data-mision="' + escapeHtml(ctx.misionId) + '"';
  return '<div class="mis-practicas"><h4>🧩 Practica (no cuenta para tu calificación)</h4>' + preguntas.map((p, i) => {
    const nombre = 'prac-' + (ctx.itemId || ctx.misionId) + '-' + p.id;
    const campo = Array.isArray(p.opciones)
      ? '<div class="mis-opciones" role="radiogroup" aria-label="Opciones">' + p.opciones.map((o, j) => '<label class="mis-opcion"><input type="radio" name="' + escapeHtml(nombre) + '" value="' + j + '"> ' + escapeHtml(o) + '</label>').join('') + '</div>'
      : '<input type="text" class="mis-input" name="' + escapeHtml(nombre) + '" aria-label="Tu respuesta" autocomplete="off">';
    return '<form class="mis-practica" data-practica="' + escapeHtml(p.id) + '"' + attr + '><p><b>' + (i + 1) + '.</b> ' + escapeHtml(p.pregunta) + '</p>' + campo +
      '<button type="submit" class="btn ghost mis-btn-chico">Comprobar</button><p class="mis-practica-res" aria-live="polite"></p></form>';
  }).join('') + '</div>';
}
document.addEventListener('submit', async e => {
  const f = e.target.closest && e.target.closest('form.mis-practica');
  if (!f) return;
  e.preventDefault();
  const marcada = f.querySelector('input[type=radio]:checked');
  const texto = f.querySelector('input[type=text]');
  const respuesta = marcada ? Number(marcada.value) : (texto ? texto.value : '');
  const res = f.querySelector('.mis-practica-res');
  if (respuesta === '' || (texto && !texto.value.trim() && !marcada)) { res.textContent = 'Escribe o elige una respuesta.'; return; }
  const body = { practicaId: f.dataset.practica, respuesta, ...(f.dataset.item ? { itemId: f.dataset.item } : { misionId: f.dataset.mision }) };
  const r = await fetchJson(API_BASE + '/practica/comprobar' + misQuery(), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) { res.textContent = 'No se pudo comprobar ahora. Inténtalo de nuevo.'; return; }
  res.className = 'mis-practica-res ' + (r.body.correcta ? 'ok' : 'casi');
  res.textContent = r.body.correcta ? '✅ ¡Correcto!' : '🤔 Casi. Pista: ' + (r.body.pista || '');
});

// ---------- ⚔️ Misiones ----------
function renderSecMisiones(hoy, admin) {
  if (state.secMis && state.secMis.error && !misionesSec().length) return vacio('⚠️', 'No se pudieron cargar tus misiones. Intenta de nuevo en unos minutos.');
  const abierta = misionesSec().find(m => m.id === state.misAbierta);
  if (abierta) return detalleMision(abierta, hoy, admin);
  if (!misionesSec().length) return vacio('⚔️', 'Aún no hay misiones principales. Aparecerán aquí cuando empiece su mundo.');
  return '<div class="mis-lista">' + misionesSec().map(m => {
    const a = avanceMision(m);
    const w = mundoDeMisionSec(m);
    const mat = SD.materiaDe(m) || SD.OTRA;
    return '<article class="sec-tarjeta mis-tarjeta mat-' + mat.clave + '" data-mis-card="' + escapeHtml(m.id) + '"><div class="sec-tarjeta-top"><span class="chip mat-chip mat-' + mat.clave + '">' + escapeHtml(mat.nombre) + '</span>' +
      '<span class="mis-estado est-' + a.clave + '"><span aria-hidden="true">' + EMOJI_AVANCE[a.clave] + '</span> ' + escapeHtml(a.texto) + '</span></div>' +
      '<h3 class="sec-tarjeta-tema">' + escapeHtml(m.titulo) + '</h3><p class="sec-tarjeta-meta">' + escapeHtml((w ? w.emoji + ' ' + w.nombre + ' · ' : '') + a.hechos + ' de ' + a.total + ' pasos') + '</p>' +
      '<div class="sec-tarjeta-premio"><span></span><span class="rpg-xp-chip">' + (m.evaluacion ? '+' + m.xp : 'hasta +' + XP_MAX_MISION()) + ' XP</span></div>' +
      '<button type="button" class="btn sec-btn-grande" data-mis-abrir="' + escapeHtml(m.id) + '">' + (m.evaluacion ? '🏆 Ver evaluación' : admin || state.secMis.soloLectura ? '👀 Ver misión' : '⚔️ Abrir misión') + ' →</button></article>';
  }).join('') + '</div>';
}

function misBorradorClave(mId, pId) { return 'stald_mis_borrador:' + misClaveEmail() + ':' + mId + ':' + pId; }
function misLeerBorrador(mId, pId) { try { return localStorage.getItem(misBorradorClave(mId, pId)) || ''; } catch (e) { return ''; } }
function misGuardarBorrador(mId, pId, v) { try { if (v) localStorage.setItem(misBorradorClave(mId, pId), v); else localStorage.removeItem(misBorradorClave(mId, pId)); } catch (e) { /* sin almacenamiento */ } }

function pasoHtml(m, p, i, puedeEntregar) {
  const e = m.entrega && m.entrega.pasos[p.id];
  let estado = ['📌', 'Por entregar'];
  if (e && e.estado === 'entregado') estado = e.tarde ? ['📨', 'Entregado (después de la fecha)'] : ['✅', 'Entregado a tiempo'];
  if (e && e.estado === 'correccion') estado = ['✏️', 'Ajusta este paso'];
  const abierto = puedeEntregar && (!m.evaluacion || (e && e.estado === 'correccion'));
  const correccion = e && e.correccion && e.estado === 'correccion'
    ? '<p class="mis-correccion">✏️ <b>Tu profe te pide un ajuste:</b> ' + escapeHtml(e.correccion.motivo) + (e.correccion.privacidad ? ' Recuerda usar nombres inventados: lo que habías escrito ya se borró para cuidar tu privacidad.' : '') + '</p>' : '';
  const entregado = e && e.texto ? '<details class="mis-entregado"' + (abierto ? '' : ' open') + '><summary>Lo que entregaste</summary>' + misPre(e.texto) + '</details>' : (e && e.borrado && !correccion ? '<p class="meta">El contenido de este paso ya se borró; tu evaluación se conserva.</p>' : '');
  const idT = 'mis-txt-' + m.id + '-' + p.id;
  const inicial = misLeerBorrador(m.id, p.id) || (e && e.estado === 'entregado' && e.texto) || '';
  const form = abierto ? '<form class="mis-entrega" data-mis-entrega="' + escapeHtml(m.id) + '" data-paso="' + escapeHtml(p.id) + '">' +
    '<label for="' + escapeHtml(idT) + '" class="mis-label">Tu entrega del paso ' + (i + 1) + '</label>' +
    '<p class="mis-aviso" id="' + escapeHtml(idT) + '-aviso">🔒 Sin nombres reales, direcciones ni datos de contacto. Solo texto.</p>' +
    '<textarea id="' + escapeHtml(idT) + '" rows="8" maxlength="' + MIS_MAX + '" aria-describedby="' + escapeHtml(idT) + '-aviso ' + escapeHtml(idT) + '-cuenta" data-mis-texto>' + escapeHtml(inicial) + '</textarea>' +
    '<div class="mis-entrega-pie"><span class="mis-cuenta" id="' + escapeHtml(idT) + '-cuenta" aria-live="polite">' + [...inicial].length + ' / ' + MIS_MAX + '</span>' +
    '<button type="submit" class="btn">' + (e ? '📤 Volver a entregar' : '📤 Entregar paso') + '</button></div><p class="mis-res" aria-live="polite"></p></form>' : '';
  return '<li class="mis-paso" data-mis-paso="' + escapeHtml(p.id) + '"><h3><span class="sec-paso-num" aria-hidden="true">' + (i + 1) + '</span> ' + escapeHtml(p.titulo) + '</h3>' +
    '<p class="mis-paso-meta"><span class="mis-estado"><span aria-hidden="true">' + estado[0] + '</span> ' + estado[1] + '</span> · vence ' + escapeHtml(misFecha(p.fechaLimite)) + '</p>' +
    misPre(p.instrucciones) + (p.entregable ? '<p><b>Qué entregas:</b> ' + escapeHtml(p.entregable) + '</p>' : '') + (p.extension ? '<p class="meta">Extensión: ' + escapeHtml(p.extension) + '</p>' : '') +
    (p.ejemplo ? '<details class="mis-ejemplo"><summary>👀 Ver un ejemplo (no lo copies)</summary>' + misPre(p.ejemplo) + '</details>' : '') + correccion + entregado + form + '</li>';
}

function rubricaHtml(m) {
  const ev = m.evaluacion;
  return '<section class="exam-card mis-rubrica" aria-labelledby="mis-rub-t"><h3 id="mis-rub-t">📏 Cómo se evalúa</h3>' + m.rubrica.map(c => {
    const elegido = ev && ev.puntos ? ev.puntos[c.id] : null;
    return '<div class="mis-criterio"><p><b>' + escapeHtml(c.criterio) + '</b>' + (elegido !== null && elegido !== undefined ? ' · <span class="chip fortaleza">' + elegido + ' / ' + Math.max(...c.niveles.map(n => n.puntos)) + '</span>' : '') + '</p>' +
      (c.descripcion ? '<p class="meta">' + escapeHtml(c.descripcion) + '</p>' : '') + '<ul class="mis-niveles">' + c.niveles.map(n =>
        '<li' + (elegido === n.puntos ? ' class="elegido"' : '') + '><b>' + escapeHtml(n.nombre) + ' · ' + n.puntos + '</b>' + (n.descriptor ? ' — ' + escapeHtml(n.descriptor) : '') + '</li>').join('') + '</ul></div>';
  }).join('') + '</section>';
}

function detalleMision(m, hoy, admin) {
  const a = avanceMision(m);
  const w = mundoDeMisionSec(m);
  const mat = SD.materiaDe(m) || SD.OTRA;
  const puede = !admin && !(state.secMis && state.secMis.soloLectura);
  const ev = m.evaluacion ? '<section class="exam-card sec-recompensa" id="mis-evaluacion" aria-live="polite"><div class="sec-xp-ganado">+' + m.xp + ' XP</div>' +
    '<p><b>¡Misión evaluada!</b> ' + m.evaluacion.porcentaje + ' %' + (m.evaluacion.aTiempo ? ' · a tiempo (+' + misGam().XP_MISION_A_TIEMPO + ' XP)' : '') + '</p>' +
    (m.evaluacion.comentario ? '<p class="mis-comentario">💬 ' + escapeHtml(m.evaluacion.comentario) + '</p>' : '') + '</section>' : '';
  const teoria = m.teoria && m.teoria.length ? '<details class="exam-card mis-teoria"><summary><b>📖 Teoría de la misión</b></summary>' + renderTeoria(m.teoria) + practicaHtml(m.teoria, { misionId: m.id }) + '</details>' : '';
  return '<div class="mis-detalle" data-mis-detalle="' + escapeHtml(m.id) + '"><button type="button" class="btn ghost" data-mis-volver>← Mis misiones</button>' +
    '<header class="rpg-mision mis-hero mat-' + mat.clave + '"><span class="rpg-etiqueta">⚔️ Misión principal' + (w ? ' · ' + escapeHtml(w.emoji + ' ' + w.nombre) : '') + '</span>' +
    '<h2 class="rpg-mision-t">' + escapeHtml(m.titulo) + '</h2>' + (m.descripcion ? '<p class="rpg-mision-d">' + escapeHtml(m.descripcion) + '</p>' : '') +
    '<div class="rpg-xp-barra" role="progressbar" aria-label="Pasos entregados" aria-valuemin="0" aria-valuemax="' + a.total + '" aria-valuenow="' + a.hechos + '"><span style="width:' + a.pct + '%"></span></div>' +
    '<p class="meta">' + a.hechos + ' de ' + a.total + ' pasos · ' + escapeHtml(a.texto) + ' · hasta +' + XP_MAX_MISION() + ' XP</p></header>' + ev +
    '<section class="exam-card"><h3>📜 Consigna</h3>' + misPre(m.consigna) + '</section>' + teoria + (m.tips && m.tips.length ? renderTips(m.tips) : '') +
    '<ol class="mis-pasos">' + m.pasos.map((p, i) => pasoHtml(m, p, i, puede)).join('') + '</ol>' + rubricaHtml(m) + '</div>';
}

function repintarMisiones() {
  const panel = document.getElementById('sec-misiones');
  if (panel) panel.innerHTML = renderSecMisiones(state.act && state.act.hoy, !!(state.act && state.act.isAdmin));
}
document.addEventListener('click', e => {
  const abrir = e.target.closest('[data-mis-abrir]');
  if (abrir) {
    state.misAbierta = abrir.dataset.misAbrir;
    if (typeof irPestanaSec === 'function') irPestanaSec('misiones', false, 'agregar'); // «Atrás» regresa a donde estaba (openspec: navegacion-dispositivos)
    repintarMisiones();
    const d = document.querySelector('[data-mis-detalle]');
    if (d) { d.scrollIntoView({ block: 'start' }); const h = d.querySelector('h2'); if (h) { h.tabIndex = -1; h.focus(); } }
    return;
  }
  if (e.target.closest('[data-mis-volver]')) { state.misAbierta = null; repintarMisiones(); }
});
document.addEventListener('input', e => {
  const t = e.target.closest && e.target.closest('[data-mis-texto]');
  if (!t) return;
  const f = t.closest('form');
  const n = [...t.value].length;
  const c = f.querySelector('.mis-cuenta');
  c.textContent = n + ' / ' + MIS_MAX;
  c.classList.toggle('lleno', n > MIS_MAX * 0.95);
  misGuardarBorrador(f.dataset.misEntrega, f.dataset.paso, t.value);
});
document.addEventListener('submit', async e => {
  const f = e.target.closest && e.target.closest('form.mis-entrega');
  if (!f) return;
  e.preventDefault();
  const t = f.querySelector('textarea');
  const res = f.querySelector('.mis-res');
  const texto = t.value.trim();
  if (!texto) { res.textContent = 'Escribe tu entrega antes de enviarla.'; t.focus(); return; }
  if ([...texto].length > MIS_MAX) { res.textContent = 'Tu entrega pasa de ' + MIS_MAX + ' caracteres; acórtala un poco.'; return; }
  const boton = f.querySelector('button[type=submit]');
  boton.disabled = true;
  res.textContent = 'Enviando…';
  const id = f.dataset.misEntrega, paso = f.dataset.paso;
  const r = await fetchJson(API_BASE + '/misiones/' + encodeURIComponent(id) + '/entrega' + misQuery(), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ paso, texto }) });
  boton.disabled = false;
  if (!r.ok) {
    // El borrador se queda en este aparato.
    res.textContent = r.status === 400 && r.body.motivo ? r.body.motivo : r.status === 409 ? 'El profe ya evaluó esta misión.' : 'No se pudo enviar; inténtalo de nuevo. Tu texto se queda guardado aquí.';
    return;
  }
  misGuardarBorrador(id, paso, '');
  await cargarMisionesSec(misQuery(), null);
  repintarMisiones();
  const aviso = document.querySelector('[data-mis-paso="' + CSS.escape(paso) + '"] .mis-paso-meta');
  const faltan = r.body.totalPasos - r.body.completos;
  const msg = document.createElement('p');
  msg.className = 'mis-res ok';
  msg.setAttribute('role', 'status');
  msg.textContent = '✅ ¡Paso entregado! ' + (faltan ? 'Te ' + (faltan === 1 ? 'falta 1 paso' : 'faltan ' + faltan + ' pasos') + ' para terminar tu misión.' : 'Terminaste tu misión: el profe la va a revisar.');
  if (aviso) aviso.after(msg);
});

// ---------- 📥 Entregas (admin) ----------
const EST_ENTREGA = { lista: ['📨', 'Lista para evaluar'], correccion: ['✏️', 'En corrección'], 'en-progreso': ['🟡', 'En progreso'], evaluada: ['🏆', 'Evaluada'] };
function renderSecEntregas() {
  const b = state.secBandeja;
  if (!b) return esqueleto();
  if (b.error) return vacio('⚠️', 'No se pudo cargar la bandeja (' + b.error + ').');
  if (!b.entregas.length) return vacio('📥', 'Aún no hay entregas de misiones.');
  return '<p class="meta" id="ent-resumen">' + b.pendientes + (b.pendientes === 1 ? ' entrega lista' : ' entregas listas') + ' para evaluar · de la más antigua a la más nueva.</p>' +
    b.entregas.map((x, k) => entregaHtml(x, k)).join('');
}
function entregaHtml(x, k) {
  const [e, t] = EST_ENTREGA[x.estado];
  const ultimo = x.mision.pasos[x.mision.pasos.length - 1];
  const aTiempo = !!(x.pasos[ultimo.id] && !x.pasos[ultimo.id].tarde);
  const pasos = x.mision.pasos.map((p, i) => {
    const d = x.pasos[p.id];
    let cuerpo = '<p class="meta">Aún no entrega este paso.</p>';
    if (d) cuerpo = '<p class="meta">' + (d.tarde ? '📨 tardía' : '✅ a tiempo') + ' · ' + escapeHtml(new Date(d.enviadoEn).toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })) + (d.estado === 'correccion' ? ' · ✏️ corrección pedida' : '') + '</p>' +
      (d.texto ? misPre(d.texto) : '<p class="meta">(contenido borrado)</p>');
    return '<details class="ent-paso"' + (x.estado === 'lista' ? ' open' : '') + '><summary><b>' + (i + 1) + '. ' + escapeHtml(p.titulo) + '</b> <small>vence ' + escapeHtml(misFecha(p.fechaLimite)) + '</small></summary>' + cuerpo + '</details>';
  }).join('');
  const puedeEvaluar = x.estado === 'lista' || x.estado === 'evaluada';
  const evalForm = puedeEvaluar ? '<form class="ent-evaluar" data-ent-evaluar="' + escapeHtml(x.mision.id) + '" data-slug="' + escapeHtml(x.slug) + '" data-a-tiempo="' + aTiempo + '"><h4>📏 Rúbrica</h4>' +
    x.mision.rubrica.map(c => '<fieldset class="ent-criterio"><legend>' + escapeHtml(c.criterio) + '</legend>' + c.niveles.map(n =>
      '<label class="mis-opcion"><input type="radio" name="ent-' + k + '-' + escapeHtml(c.id) + '" data-criterio="' + escapeHtml(c.id) + '" value="' + n.puntos + '"' + (x.evaluacion && x.evaluacion.puntos[c.id] === n.puntos ? ' checked' : '') + ' required> ' +
      escapeHtml(n.nombre) + ' · ' + n.puntos + '</label>').join('') + '</fieldset>').join('') +
    '<label class="mis-label" for="ent-com-' + k + '">Comentario para la alumna (opcional)</label><textarea id="ent-com-' + k + '" rows="3" maxlength="1000" data-ent-comentario>' + escapeHtml((x.evaluacion && x.evaluacion.comentario) || '') + '</textarea>' +
    '<p class="ent-total" aria-live="polite">' + totalTexto(x.evaluacion ? x.evaluacion.porcentaje : null, aTiempo) + '</p><button type="submit" class="btn">✅ Guardar evaluación</button><p class="mis-res" aria-live="polite"></p></form>' : '';
  const entregados = x.mision.pasos.filter(p => x.pasos[p.id]);
  const corrForm = entregados.length ? '<details class="ent-corr"><summary>✏️ Pedir corrección</summary><form class="ent-correccion" data-ent-correccion="' + escapeHtml(x.mision.id) + '" data-slug="' + escapeHtml(x.slug) + '">' +
    entregados.map(p => '<label class="mis-opcion"><input type="checkbox" value="' + escapeHtml(p.id) + '"> ' + escapeHtml(p.titulo) + '</label>').join('') +
    '<label class="mis-label" for="ent-mot-' + k + '">Motivo (en positivo)</label><input id="ent-mot-' + k + '" class="mis-input" maxlength="300" data-ent-motivo required>' +
    '<label class="mis-opcion"><input type="checkbox" data-ent-privacidad> Es por privacidad (borra ya el texto de esos pasos)</label>' +
    '<button type="submit" class="btn ghost">Pedir corrección</button><p class="mis-res" aria-live="polite"></p></form></details>' : '';
  return '<article class="exam-card ent-card est-' + x.estado + '" data-ent="' + escapeHtml(x.mision.id + '/' + x.slug) + '"><header class="ent-top"><h3>' + escapeHtml(x.nombre || x.slug) + ' · ' + escapeHtml(x.mision.titulo) + '</h3>' +
    '<span class="mis-estado est-' + x.estado + '"><span aria-hidden="true">' + e + '</span> ' + t + (x.evaluacion ? ' · ' + x.evaluacion.porcentaje + ' % · +' + x.xp + ' XP' : '') + '</span></header>' +
    pasos + evalForm + corrForm +
    '<div class="ent-borrar"><button type="button" class="btn ghost" data-ent-borrar="' + escapeHtml(x.mision.id) + '" data-slug="' + escapeHtml(x.slug) + '">🗑️ Borrar contenido de esta entrega</button>' +
    '<button type="button" class="btn ghost" data-ent-borrar-persona="' + escapeHtml(x.slug) + '">🗑️ Borrar todas sus entregas</button></div></article>';
}
function totalTexto(pct, aTiempo) {
  if (pct === null || pct === undefined) return 'Elige un nivel en cada criterio.';
  return 'Total: ' + pct + ' % · ' + misGam().xpDeMision({ porcentaje: pct, aTiempo }) + ' XP' + (aTiempo ? ' (incluye +' + misGam().XP_MISION_A_TIEMPO + ' a tiempo)' : '');
}
document.addEventListener('change', e => {
  const f = e.target.closest && e.target.closest('form.ent-evaluar');
  if (!f) return;
  const radios = [...f.querySelectorAll('input[type=radio]:checked')];
  const criterios = new Set([...f.querySelectorAll('input[type=radio]')].map(r => r.dataset.criterio));
  const pct = radios.length === criterios.size ? radios.reduce((a, r) => a + Number(r.value), 0) : null;
  f.querySelector('.ent-total').textContent = totalTexto(pct, f.dataset.aTiempo === 'true');
});
async function accionBandeja(ruta, body, res) {
  const r = await fetchJson(API_BASE + '/profe/entregas' + ruta + misQuery(), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) { if (res) res.textContent = r.body.motivo || r.body.mensaje || 'No se pudo guardar (' + (r.body.error || r.status) + ').'; return false; }
  await cargarBandejaSec();
  const panel = document.getElementById('sec-entregas');
  if (panel) panel.innerHTML = renderSecEntregas();
  return true;
}
document.addEventListener('submit', async e => {
  const ev = e.target.closest && e.target.closest('form.ent-evaluar');
  const co = e.target.closest && e.target.closest('form.ent-correccion');
  if (!ev && !co) return;
  e.preventDefault();
  if (ev) {
    const puntos = {};
    for (const r of ev.querySelectorAll('input[type=radio]:checked')) puntos[r.dataset.criterio] = Number(r.value);
    await accionBandeja('/' + encodeURIComponent(ev.dataset.entEvaluar) + '/' + encodeURIComponent(ev.dataset.slug) + '/evaluar',
      { puntos, comentario: ev.querySelector('[data-ent-comentario]').value }, ev.querySelector('.mis-res'));
    return;
  }
  const pasos = [...co.querySelectorAll('input[type=checkbox][value]:checked')].map(c => c.value);
  const res = co.querySelector('.mis-res');
  if (!pasos.length) { res.textContent = 'Elige al menos un paso.'; return; }
  await accionBandeja('/' + encodeURIComponent(co.dataset.entCorreccion) + '/' + encodeURIComponent(co.dataset.slug) + '/correccion',
    { pasos, motivo: co.querySelector('[data-ent-motivo]').value, privacidad: co.querySelector('[data-ent-privacidad]').checked }, res);
});
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-ent-borrar]');
  const bp = e.target.closest('[data-ent-borrar-persona]');
  if (b && confirm('¿Borrar el texto de esta entrega? La evaluación y la XP se conservan.')) {
    await accionBandeja('/' + encodeURIComponent(b.dataset.entBorrar) + '/' + encodeURIComponent(b.dataset.slug) + '/borrar', {});
  } else if (bp && confirm('¿Borrar el texto de TODAS las entregas de esta persona? Las evaluaciones y la XP se conservan.')) {
    await accionBandeja('/persona/' + encodeURIComponent(bp.dataset.entBorrarPersona) + '/borrar', {});
  }
});
