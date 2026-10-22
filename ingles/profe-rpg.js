// Inglés · ruta de estudio del profe con la experiencia RPG de Secundaria (openspec: ingles-diseno-profe).
// ingles.html?modo=profe: barra de nivel, rango, XP, insignias y racha (`barraRpg` de ingles/secundaria-inicio.js),
// «⚔️ Misión principal activa», «⚡ Retos de hoy · a tu ritmo» y la pestaña «🌍 Mundos» (camino de mundos de su
// ruta). Solo dibuja: XP, nivel, insignias y mundos salen de comun/gamificacion.js (`mapaRuta`, `xpRuta`,
// `insigniasDe` con `mapa`); aquí no hay fórmulas. La ruta está toda abierta y las fechas son ritmo sugerido: nada
// dice «atrasada» ni «bloqueado». El panel del admin (grupos, registro, entregas) vive aparte, en ingles.html.

// Rango con la forma que usa la plataforma para el profe («el profe»).
const GENERO_PROFE = 'm';
const EST_RUTA = { hecha: ['✅', 'Hecha', 'est-hecha'], 'en-curso': ['🔁', 'En curso', 'est-en-curso'], hoy: ['📌', 'Ritmo de hoy', 'est-vence-hoy'], abierta: ['🔓', 'Abierta', 'est-pendiente'], 'sin-abrir': ['🗓️', 'Llega pronto', 'est-proxima'] };
const EST_MUNDO_RUTA = { completado: ['✅', 'Completado'], 'en-curso': ['▶️', 'En curso'], abierto: ['🔓', 'Abierto'] };

// Elementos de su ruta propia (sin `grupo`), los mismos ids del plan.
function itemsRuta(act) {
  const plan = act && act.plan;
  if (!plan) return [];
  const ids = new Set((plan.semanas || []).flatMap(s => (s.elementos || []).map(e => e.id)));
  return ((act && act.items) || []).filter(it => !it.grupo && ids.has(it.id));
}
const hayRpgProfe = act => !!(act && act.plan && window.Gamificacion && Gamificacion.mapaRuta && typeof barraRpg === 'function');
function mapaRutaDe(act) { return Gamificacion.mapaRuta(act.plan, itemsRuta(act), (act && act.hoy) || todayStr()); }
// Estado de una clase de la ruta, sin «atrasada»: lo que ya pasó su fecha sugerida es «Ritmo de hoy».
function estadoRuta(it, fecha, hoy) {
  if (!it) return 'sin-abrir';
  if (Gamificacion.estaHecha(it)) return 'hecha';
  if (it.estado === 'en-curso') return 'en-curso';
  return fecha <= hoy ? 'hoy' : 'abierta';
}
const chipEstadoRuta = e => '<span class="sec-estado ' + EST_RUTA[e][2] + '"><span aria-hidden="true">' + EST_RUTA[e][0] + '</span> ' + EST_RUTA[e][1] + '</span>';
const chipMundoRuta = w => w ? '<span class="chip pf-mundo-chip"><span aria-hidden="true">' + w.emoji + '</span> ' + escapeHtml(w.nombre) + '</span>' : '';
const xpChipRuta = it => '<span class="rpg-xp-chip">' + (it && Gamificacion.estaHecha(it) && it.mejor ? '+' + Gamificacion.xpDeClase(it, it.mejor, { aTiempo: true }) : 'hasta +' + Gamificacion.XP_POSIBLE) + ' XP</span>';
function botonRuta(it, clase, id) {
  const idAttr = id ? ' id="' + id + '"' : '';
  if (!it) return '<button type="button"' + idAttr + ' class="btn ' + clase + '" disabled>🗓️ Llega pronto</button>';
  if (Gamificacion.estaHecha(it)) return '<button type="button"' + idAttr + ' class="btn ghost ' + clase + '" data-action="ver-resultado" data-id="' + escapeHtml(it.id) + '">Ver resultado</button>';
  return '<button type="button"' + idAttr + ' class="btn ' + clase + '" data-action="abrir-item" data-id="' + escapeHtml(it.id) + '">' + (it.estado === 'en-curso' ? 'Continuar' : 'Empezar') + ' <span aria-hidden="true">→</span></button>';
}
// Clases de la ruta en orden del plan, con su mundo.
function clasesRuta(mapa) {
  return mapa.flatMap(w => w.clases.map(c => ({ ...c, mundo: w }))).sort((a, b) => String(a.elemento.fecha).localeCompare(String(b.elemento.fecha)));
}

// ---------- Tablero ----------
function renderProfeRpg(act) {
  if (!hayRpgProfe(act)) return '';
  const hoy = act.hoy || todayStr();
  const ruta = itemsRuta(act);
  const mapa = mapaRutaDe(act);
  const nivel = Gamificacion.nivelDe(Gamificacion.xpRuta(ruta), GENERO_PROFE);
  const insignias = Gamificacion.insigniasDe({ items: ruta, hoy, racha: act.racha, mapa });
  const racha = act.racha || { dias: 0 };
  const clases = clasesRuta(mapa);
  const pendientes = clases.filter(c => c.item && !Gamificacion.estaHecha(c.item));
  const actual = Gamificacion.mundoActualRuta(mapa);
  // Misión principal: lo que ya empezó; si no, lo primero pendiente del mundo actual; si no, lo primero pendiente.
  const mision = pendientes.find(c => c.item.estado === 'en-curso') || pendientes.find(c => actual && c.mundo.id === actual.id) || pendientes[0] || null;
  return '<div class="rpg pf-rpg" id="pf-rpg">' + barraRpg(nivel, insignias, racha, Gamificacion.INSIGNIAS.length) +
    misionProfe(mision, actual, hoy) + retosProfe(clases, hoy) + '</div>';
}
function misionProfe(c, actual, hoy) {
  let cuerpo;
  if (c) {
    const fecha = c.elemento.fecha || (c.item && c.item.fechaLimite);
    const e = estadoRuta(c.item, fecha, hoy);
    cuerpo = '<span class="rpg-etiqueta">⚔️ Misión principal activa</span>' +
      '<h3 class="rpg-mision-t" id="pf-mision-t">' + escapeHtml(c.elemento.titulo) + '</h3>' +
      '<p class="rpg-mision-d">' + escapeHtml(c.mundo.emoji + ' ' + c.mundo.nombre + ' · Semana ' + c.semana + ' · ritmo sugerido: ' + formatFecha(fecha)) + ' · ' + EST_RUTA[e][1] + ' · hasta +' + Gamificacion.XP_POSIBLE + ' XP</p>' +
      '<div class="rpg-mision-acciones">' + botonRuta(c.item, 'rpg-btn-mision', 'pf-mision-btn') +
      '<button type="button" class="btn ghost rpg-btn-sec" data-pf-ir="mundos"><span aria-hidden="true">🌍</span> Ver mis mundos</button></div>';
  } else {
    cuerpo = '<span class="rpg-etiqueta">🏁 Ruta al día</span><h3 class="rpg-mision-t" id="pf-mision-t">¡Terminaste todo lo que ya está publicado! 🎉</h3>' +
      '<p class="rpg-mision-d">' + (actual ? escapeHtml(actual.emoji + ' ' + actual.nombre) + ' · ' : '') + 'Cuando llegue la siguiente clase de tu ruta, aquí aparece tu próxima misión.</p>';
  }
  return '<section class="rpg-mision" id="pf-mision" aria-labelledby="pf-mision-t">' + cuerpo + '</section>';
}
// Retos de hoy: lo pendiente cuya fecha sugerida ya llegó (máx. 3); si no hay, lo siguiente de la ruta.
function retosProfe(clases, hoy) {
  const pend = clases.filter(c => c.item && !Gamificacion.estaHecha(c.item));
  const deHoy = pend.filter(c => String(c.elemento.fecha) <= hoy);
  const lista = (deHoy.length ? deHoy : pend).slice(0, 3);
  const hechasHoy = clases.filter(c => c.item && Gamificacion.estaHecha(c.item) && c.item.ultimoEnvio && String(c.item.ultimoEnvio).slice(0, 10) === hoy).length;
  const tarjeta = c => {
    const fecha = c.elemento.fecha || c.item.fechaLimite;
    const e = estadoRuta(c.item, fecha, hoy);
    const meta = [tipoTexto(c.item.tipo), 'Semana ' + c.semana, 'ritmo: ' + formatFecha(fecha)];
    if (c.item.intentosMax) meta.push((c.item.intentosUsados || 0) + '/' + c.item.intentosMax + ' intentos');
    return '<article class="sec-tarjeta pf-reto" data-pf-reto="' + escapeHtml(c.item.id) + '" style="--mat:var(--rpg-indigo)" aria-labelledby="pf-reto-t-' + escapeHtml(c.item.id) + '">' +
      '<div class="sec-tarjeta-top">' + chipMundoRuta(c.mundo) + chipEstadoRuta(e) + '</div>' +
      '<h3 class="sec-tarjeta-tema" id="pf-reto-t-' + escapeHtml(c.item.id) + '">' + escapeHtml(c.elemento.titulo) + '</h3>' +
      '<p class="sec-tarjeta-meta">' + escapeHtml(meta.join(' · ')) + '</p>' +
      '<div class="sec-tarjeta-premio"><span class="rpg-mundo-mini">' + escapeHtml(c.mundo.etapa) + '</span>' + xpChipRuta(c.item) + '</div>' +
      botonRuta(c.item, 'sec-btn-grande') + '</article>';
  };
  const cuerpo = lista.length ? '<div class="sec-hoy-grid">' + lista.map(tarjeta).join('') + '</div>'
    : '<div class="sec-vacio-hoy" id="pf-retos-vacio"><div class="sec-vacio-emoji" aria-hidden="true">🎉</div><p><b>Nada pendiente en tu ruta</b></p><p class="sec-kpi-detalle">Repasa en «🌍 Mundos» o adelanta lo de tu grupo.</p></div>';
  return '<section class="sec-hoy-te-toca" id="pf-retos" aria-labelledby="pf-retos-t"><div class="rpg-seccion-top"><h3 class="sec-subtitulo" id="pf-retos-t">⚡ Retos de hoy · a tu ritmo</h3>' +
    '<span class="rpg-contador rpg-num" id="pf-retos-n" title="Hechas hoy">✅ ' + hechasHoy + '</span></div>' +
    '<p class="rpg-bonus">' + (deHoy.length ? 'Tu ritmo sugerido llega hasta hoy. Todo está abierto: avanza en el orden que quieras.' : 'Vas al día con tu ritmo sugerido. Si quieres, adelanta lo siguiente.') + '</p>' + cuerpo + '</section>';
}

// ---------- 🌍 Mundos de la ruta ----------
function renderMundosProfe(act) {
  if (!hayRpgProfe(act)) return '';
  const hoy = act.hoy || todayStr();
  const mapa = mapaRutaDe(act).filter(w => w.total);
  const actual = Gamificacion.mundoActualRuta(mapa);
  const camino = '<ol class="sec-secuencia pf-camino" aria-label="Camino de mundos">' + mapa.map(w =>
    '<li class="' + (w.estado === 'completado' ? 'mundo-completado' : '') + (actual && w.id === actual.id ? ' actual' : '') + '"><span class="sec-etapa"><span aria-hidden="true">' + w.emoji + '</span> ' + escapeHtml(w.nombre) + '</span></li>').join('') + '</ol>';
  const tarjetas = mapa.map(w => {
    const pct = w.total ? Math.round(w.hechas / w.total * 100) : 0;
    const [ico, txt] = EST_MUNDO_RUTA[w.estado];
    const filas = w.clases.map(c => '<li class="pf-mundo-clase"><span>' + escapeHtml(c.elemento.titulo) + ' <small class="meta">· S' + c.semana + ' · ' + escapeHtml(formatFecha(c.elemento.fecha)) + '</small></span>' +
      chipEstadoRuta(estadoRuta(c.item, c.elemento.fecha, hoy)) + botonRuta(c.item, 'pf-mundo-btn') + '</li>').join('');
    return '<article class="sec-materia pf-mundo' + (actual && w.id === actual.id ? ' actual' : '') + '" data-pf-mundo="' + escapeHtml(w.id) + '" style="--mat:var(--rpg-indigo);--mat-soft:var(--accent-soft)">' +
      '<div class="sec-materia-top"><span class="sec-materia-emoji" aria-hidden="true">' + w.emoji + '</span><h3>' + escapeHtml(w.nombre) + '</h3><span class="sec-estado ' + (w.estado === 'completado' ? 'est-hecha' : 'est-en-curso') + '">' + ico + ' ' + txt + '</span></div>' +
      '<p class="sec-materia-nota">' + escapeHtml(w.etapa) + (w.promedio === null ? '' : ' · promedio ' + w.promedio + ' %') + '</p>' +
      '<div class="sec-materia-avance"><span>' + w.hechas + ' de ' + w.total + ' clases</span><div class="rpg-xp-barra" role="progressbar" aria-label="Avance de ' + escapeHtml(w.nombre) + '" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '"><span style="width:' + pct + '%"></span></div></div>' +
      '<details class="pf-mundo-det"' + (actual && w.id === actual.id ? ' open' : '') + '><summary>Clases del mundo</summary><ul class="pf-mundo-lista">' + filas + '</ul></details></article>';
  }).join('');
  return '<section id="pf-mundos" aria-labelledby="pf-mundos-t"><h3 class="sec-subtitulo" id="pf-mundos-t">🌍 Mis mundos</h3>' +
    '<p class="rpg-leyenda"><span>✅ completado</span><span>▶️ en curso</span><span>🔓 abierto: todo se puede hacer ya</span></p>' + camino +
    '<div class="sec-materias pf-mundos">' + tarjetas + '</div></section>';
}

// ---------- Clase por pasos (ingles/secundaria-clase.js) ----------
// Mundo de una clase de su ruta para el banner de la misión: { emoji, nombre, etapa } o null (lo del grupo no tiene).
function mundoDeClaseProfe(id) {
  const act = state.act;
  if (!hayRpgProfe(act)) return null;
  const w = mapaRutaDe(act).find(x => x.clases.some(c => c.elemento.id === id));
  return w ? { emoji: w.emoji, nombre: w.nombre, etapa: w.etapa } : null;
}
// Recompensa tras enviar una clase: XP de su ruta antes y después, nivel e insignias nuevas (con su mapa de mundos).
// Lo del grupo (`grupo: true`) no es de su ruta: sin recompensa.
function recompensaProfe(antes, despues, id) {
  if (!hayRpgProfe(despues) || !itemsRuta(despues).some(it => it.id === id)) return '';
  const hoy = despues.hoy || todayStr();
  const ra = itemsRuta(antes), rd = itemsRuta(despues);
  const xpA = Gamificacion.xpRuta(ra), xpD = Gamificacion.xpRuta(rd);
  const estado = (act, items) => ({ items, hoy, racha: act.racha, mapa: Gamificacion.mapaRuta(act.plan || despues.plan, items, hoy) });
  const nuevas = Gamificacion.insigniaNueva(Gamificacion.insigniasDe(estado(antes, ra)), Gamificacion.insigniasDe(estado(despues, rd)));
  return htmlRecompensa(xpA, xpD, Gamificacion.nivelDe(xpA, GENERO_PROFE), Gamificacion.nivelDe(xpD, GENERO_PROFE), nuevas);
}

// «🌍 Ver mis mundos» abre la pestaña (mismo comportamiento que tocar la pestaña).
document.addEventListener('click', e => {
  const b = e.target.closest('[data-pf-ir]');
  if (!b) return;
  const tab = document.querySelector('[data-pf-tab="' + b.dataset.pfIr + '"]');
  if (tab) { tab.click(); tab.scrollIntoView({ block: 'start' }); tab.focus(); }
});
