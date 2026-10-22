// Inglés · ruta de estudio del profe (?modo=profe, openspec: ruta-profe y profe-diseno).
async function loadProfe(email) {
  const r = await fetchJson(ACT_URL + '?email=' + encodeURIComponent(email));
  if (!r.ok) {
    loginError.textContent = r.status === 403 ? 'Esta ruta es solo para el profe. Entra con el correo de administrador.' : '⚠️ No se pudo cargar (' + (r.body.error || r.status) + ').';
    loginError.style.display = 'block'; loginEl.style.display = 'block'; appEl.style.display = 'none';
    return;
  }
  localStorage.setItem(STORAGE_KEY, email);
  loginEl.style.display = 'none'; appEl.style.display = 'block';
  state.act = r.body; state.data = { isAdmin: false, rows: [] };
  tituloProfe(r.body.plan);
  render(state.data);
}
// Título desde el plan (openspec: profe-grupo-y-ruta-ia): la ruta propia puede ser de IA u otro tema; sin plan, el genérico.
function tituloProfe(plan) {
  if (!plan || !plan.titulo) return;
  document.title = plan.titulo;
  document.getElementById('titulo').textContent = '🎓 ' + plan.titulo;
  document.getElementById('subtitulo').textContent = 'Tus clases propias y las mismas actividades de tu grupo, para resolverlas antes que ellos. Solo tú ves tus resultados.';
}

// ---------- Vista del profe (openspec: profe-diseno): avance, lo urgente arriba y el resto en pestañas ----------
const PF_TABS = [['semana', '📅 Esta semana'], ['material', '📚 Material'], ['mundos', '🌍 Mundos'], ['plan', '🗺️ Plan del mes'], ['grupo', '👥 Mi grupo'], ['hechas', '✅ Hechas']];
// Sin plan.json (openspec: profe-semanas-del-grupo) no hay pestaña de plan ni de mundos (openspec: ingles-diseno-profe).
const pfTabsDe = plan => PF_TABS.filter(([id]) => (id !== 'plan' && id !== 'mundos') || !!plan);
function pfTabGuardada(tabs) { try { const t = localStorage.getItem('profe_tab'); return tabs.some(x => x[0] === t) ? t : 'semana'; } catch { /* sin almacenamiento: pestaña por omisión */ return 'semana'; } }
function pfFila(it) {
  const tag = it.grupo ? '<span class="pf-tag grupo">👥 Grupo</span>' : '<span class="pf-tag ruta">🎓 Mis clases</span>';
  let sub = escapeHtml(formatFecha(it.fechaLimite)) + ' · ' + tipoTexto(it.tipo) + ' · ' + (it.intentosUsados || 0) + '/' + it.intentosMax + ' intento(s)';
  if (it.mejor) sub += ' · <span class="pill ok">⭐ ' + it.mejor.porcentaje + '%</span>';
  return '<div class="exam-item"><div><div class="t">' + icono(it.tipo) + ' ' + escapeHtml(it.titulo) + tag + '</div><div class="s">' + sub + '</div></div>' + accionItem(it, it.estado) + '</div>';
}
function renderProfe(act) {
  const items = (act && act.items) || [];
  const hoy = (act && act.hoy) || todayStr();
  const g = buildGroups(itemRowsAlumno(act));
  const plan = act && act.plan;
  const delPlan = new Set(plan ? (plan.semanas || []).flatMap(s => (s.elementos || []).map(e => e.id)) : []);
  const hechosPlan = items.filter(it => delPlan.has(it.id) && it.estado === 'completo').length;
  const pct = delPlan.size ? Math.round(hechosPlan / delPlan.size * 100) : 0;
  const pendientes = items.filter(it => it.estado !== 'completo' && it.estado !== 'proximamente');
  const urgentes = pendientes.filter(it => it.fechaLimite <= hoy).sort((a, b) => a.fechaLimite.localeCompare(b.fechaLimite));
  const futuras = items.filter(it => it.estado !== 'completo' && it.fechaLimite > hoy).sort((a, b) => a.fechaLimite.localeCompare(b.fechaLimite));
  const sig = futuras[0];
  const propia = act && (act.semanaPropia || act.semanaSiguientePropia); // ruta propia; el domingo antes de empezar, la siguiente (openspec: profe-grupo-y-ruta-ia)
  const semPlan = plan && (propia || act.semana) ? (plan.semanas || []).find(s => s.id === (propia || act.semana).id) : null;
  const pfTabs = pfTabsDe(plan);
  const tab = pfTabGuardada(pfTabs);
  const hero = '<section class="pf-hero"><div class="pf-top"><span class="pf-sem">' + (act && (act.semana || propia) ? '👉 ' + (propia ? [act.semana && '👥 ' + act.semana.titulo, '🎓 ' + propia.titulo] : [act.semana.titulo]).filter(Boolean).map(t => escapeHtml(t)).join(' · ') : '🎓 Tu ruta') + '</span>' +
    '<span class="pf-sig">' + (sig ? 'Siguiente: ' + icono(sig.tipo) + ' ' + escapeHtml(sig.titulo) + ' · ' + escapeHtml(formatFecha(sig.fechaLimite)) : 'Sin entregas próximas') + '</span></div>' +
    (plan ? '<div class="progress-bar" style="margin-top:10px"><span style="width:' + pct + '%"></span></div><div class="progress-text" style="margin:4px 0 0">Ruta del mes: ' + hechosPlan + '/' + delPlan.size + ' (' + pct + '%)</div>' : '') +
    // Su ruta va a su ritmo (openspec: ingles-diseno-profe): lo que ya pasó su fecha sugerida es «Para hoy», no «atrasada».
    '<div class="pf-stats"><div class="pf-stat hecho"><b>' + (g.recent.length + g.older.length) + '</b><span>Hechas</span></div><div class="pf-stat"><b>' + (g.overdue.length + g.today.length) + '</b><span>Para hoy</span></div>' +
    pfStatTercero(act, g) + '<div class="pf-stat"><b>' + g.upcoming.length + '</b><span>Próximas</span></div></div></section>';
  const urgente = '<div class="exam-card" id="pf-urgente"><h3>🔥 Pendiente ahora' + (urgentes.length ? ' (' + urgentes.length + ')' : '') + '</h3>' +
    (urgentes.length ? urgentes.slice(0, 5).map(pfFila).join('') : '<div class="pf-ok">¡Al día! 🎉 No tienes nada pendiente para hoy.</div>') +
    // Solo 5 a la vista; el resto, plegado, para que el tablero y las pestañas no queden hasta abajo (openspec: ingles-diseno-profe).
    (urgentes.length > 5 ? '<details class="pf-mas" id="pf-urgente-mas"><summary>Ver las ' + (urgentes.length - 5) + ' restantes</summary>' + urgentes.slice(5).map(pfFila).join('') + '</details>' : '') + '</div>';
  const objetivo = semPlan ? '<div class="exam-card"><h3>🎯 Objetivo de la semana</h3>' + (semPlan.objetivo ? '<div>' + escapeHtml(semPlan.objetivo) + '</div>' : '') + '<div class="chips" style="margin-top:6px">' + (semPlan.temas || []).map(t => '<span class="chip neutra">' + escapeHtml(t) + '</span>').join('') + '</div>' +
    (semPlan.busuu ? '<div class="meta" style="margin-top:6px">📗 ' + escapeHtml(semPlan.busuu) + '</div>' : '') + (semPlan.extra ? '<div class="meta">✍️ ' + escapeHtml(semPlan.extra) + '</div>' : '') + '</div>' : '';
  const semana = renderSemanasProfe(act, objetivo);
  const hechas = items.filter(it => it.estado === 'completo').sort((a, b) => (b.ultimoEnvio || '').localeCompare(a.ultimoEnvio || ''));
  const panelHechas = '<div class="exam-card"><h3>✅ Hechas (' + hechas.length + ')</h3>' + (hechas.length ? hechas.map(pfFila).join('') : '<div class="pf-ok">Todavía no hay entregas.</div>') + '</div>';
  const paneles = { semana: semana || '<div class="pf-ok">Sin actividades esta semana.</div>', plan: renderPlanProfe(act) || '<div class="pf-ok">Sin plan.</div>', mundos: renderMundosProfe(act) || '<div class="pf-ok">Sin mundos.</div>', grupo: renderGrupoProfe(act) || '<div class="pf-ok">Sin actividades del grupo.</div>', hechas: panelHechas, material: renderMaterial() };
  const tabs = '<div class="pf-tabs" role="tablist" aria-label="Secciones de mi ruta">' + pfTabs.map(([id, t]) => '<button type="button" role="tab" id="pf-tab-' + id + '" data-pf-tab="' + id + '" aria-controls="pf-panel-' + id + '" aria-selected="' + (id === tab) + '">' + t + '</button>').join('') + '</div>' +
    pfTabs.map(([id]) => '<div role="tabpanel" id="pf-panel-' + id + '" data-pf-panel="' + id + '" aria-labelledby="pf-tab-' + id + '"' + (id === tab ? '' : ' hidden') + '>' + paneles[id] + '</div>').join('');
  const lado = '<aside class="pf-side">' +
    (plan && (plan.reparto || plan.rutinaDiaria || plan.reglas) ? '<div class="exam-card"><h3>⏱️ ' + escapeHtml(plan.horasSemana || 'Horas por semana') + '</h3><div class="ruta-reparto">' + (plan.reparto || []).map(x => '<span>' + escapeHtml(x.que) + '</span><span>' + escapeHtml(x.tiempo) + '</span>').join('') + '</div>' +
      '<details class="section" style="margin-top:8px"><summary><div class="section-head"><span><span class="chevron">▶</span>☀️ Rutina y reglas</span></div></summary><div class="scroll"><ul class="ruta-lista">' +
      (plan.rutinaDiaria || []).map(x => '<li>' + escapeHtml(x) + '</li>').join('') + '</ul><ul class="ruta-lista" style="margin-top:8px">' + (plan.reglas || []).map(x => '<li>' + escapeHtml(x) + '</li>').join('') + '</ul></div></details></div>' : '') +
    '<div class="exam-card"><h3>📅 Próximas</h3>' + (futuras.length ? futuras.slice(0, 3).map(it => '<div class="exam-item"><div><div class="t">' + icono(it.tipo) + ' ' + escapeHtml(it.titulo) + '</div><div class="s">' + escapeHtml(formatFecha(it.fechaLimite)) + (it.grupo ? ' · 👥 Grupo' : '') + '</div></div></div>').join('') : '<div class="pf-ok">Nada próximo.</div>') + '</div>' +
    '<a class="profe-link" href="' + escapeHtml(conApiParam('ingles.html')) + '">← Vista de mi grupo</a></aside>';
  // Tablero RPG de su ruta (openspec: ingles-diseno-profe; ingles/profe-rpg.js), aparte del panel del admin.
  return hero + renderProfeRpg(act) + '<div class="pf-grid"><div class="pf-main">' + urgente + tabs + '</div>' + lado + '</div>';
}
// Tercer contador: con ruta propia, los mundos completados (ingles/profe-rpg.js); sin ella, lo de hoy.
function pfStatTercero(act, g) {
  if (!hayRpgProfe(act)) return '<div class="pf-stat"><b>' + g.today.length + '</b><span>Hoy</span></div>';
  const mapa = mapaRutaDe(act).filter(w => w.total);
  return '<div class="pf-stat hecho"><b>' + mapa.filter(w => w.estado === 'completado').length + '/' + mapa.length + '</b><span>Mundos</span></div>';
}
// Cambio de pestaña sin redibujar (se conserva el scroll); se recuerda en este navegador.
document.addEventListener('click', e => {
  const b = e.target.closest('[data-pf-tab]'); if (!b) return;
  const id = b.dataset.pfTab;
  document.querySelectorAll('[data-pf-tab]').forEach(x => x.setAttribute('aria-selected', String(x === b)));
  document.querySelectorAll('[data-pf-panel]').forEach(x => { x.hidden = x.dataset.pfPanel !== id; });
  try { localStorage.setItem('profe_tab', id); } catch (err) { /* sin almacenamiento: solo esta vez */ }
});

// «Esta semana» del profe (openspec: profe-grupo-y-ruta-ia): dos bloques que no se ocultan entre sí, cada uno con
// su semana y solo sus elementos: su ruta propia (`semanaPropia`, sin `grupo`) y lo del grupo (`semana`, `grupo: true`).
function renderSemanasProfe(act, objetivo) {
  if (!act) return '';
  const items = act.items || [];
  const grupo = renderWeekCard({ ...act, items: items.filter(it => it.grupo) }, 'grupo-');
  if (!act.semanaPropia && !act.semanaSiguientePropia) return objetivo + grupo; // sin ruta propia: como antes
  const propia = renderWeekCard({ hoy: act.hoy, semana: act.semanaPropia || null, semanaSiguiente: act.semanaSiguientePropia || null, items: items.filter(it => !it.grupo) }, 'propia-');
  const nombre = act.plan && act.plan.titulo ? ' · ' + escapeHtml(act.plan.titulo) : '';
  return '<section class="pf-bloque" id="pf-sem-propia"><h3 class="card-titulo">🎓 Mis clases' + nombre + '</h3>' + objetivo + (propia || '<div class="pf-ok">Sin clases propias esta semana.</div>') + '</section>' +
    '<section class="pf-bloque" id="pf-sem-grupo"><h3 class="card-titulo">👥 Inglés con el grupo</h3>' + (grupo || '<div class="pf-ok">Sin actividades del grupo esta semana.</div>') + '</section>';
}

// Tarjeta "Lo de tu grupo": actividades del grupo que el profe resuelve antes (openspec: profe-actividades-grupo).
function renderGrupoProfe(act) {
  const lista = ((act && act.items) || []).filter(it => it.grupo);
  if (!lista.length) return '';
  const hoy = todayStr();
  const pendientes = lista.filter(it => it.estado !== 'completo'), hechas = lista.filter(it => it.estado === 'completo');
  const fila = it => {
    const atraso = it.estado !== 'completo' && it.fechaLimite < hoy;
    let sub = 'Para ti: ' + escapeHtml(formatFecha(it.fechaLimite)) + ' · ' + tipoTexto(it.tipo) + ' · ' + (it.intentosUsados || 0) + '/' + it.intentosMax + ' intento(s)';
    if (atraso) sub += ' · <span class="pill" style="background:var(--overdue-bg);color:var(--overdue)">⏰ En atraso</span>';
    if (it.mejor) sub += ' · <span class="pill ok">⭐ ' + it.mejor.porcentaje + '%</span>';
    return '<div class="exam-item"><div><div class="t">' + icono(it.tipo) + ' ' + escapeHtml(it.titulo) + '</div><div class="s">' + sub + '</div></div>' + accionItem(it, it.estado) + '</div>';
  };
  return '<div class="exam-card" id="grupo-profe"><h3>📚 Lo de tu grupo · resuélvelo antes que ellos (' + pendientes.length + ' pendiente' + (pendientes.length === 1 ? '' : 's') + ')</h3>' +
    pendientes.map(fila).join('') + (hechas.length ? '<div class="s" style="font-size:.8rem;margin-top:6px">✅ Hechas: ' + hechas.length + '</div>' + hechas.map(fila).join('') : '') + '</div>';
}

// Tarjeta "Ruta del mes": semanas con objetivo, temas, Busuu, rutina y resultados.
function renderPlanProfe(act) {
  const plan = act && act.plan;
  if (!plan) return '';
  const items = new Map(((act && act.items) || []).map(it => [it.id, it]));
  const actual = (act.semanaPropia || act.semanaSiguientePropia || act.semana || {}).id; // el plan describe la ruta propia
  const estadoDe = id => {
    const it = items.get(id);
    if (!it) return '<span class="pill wait">🔒 abre su lunes</span>';
    if (it.mejor) return '<span class="pill ok">⭐ ' + it.mejor.porcentaje + '%</span>';
    if (it.estado === 'proximamente') return '<span class="pill wait">🔒 ' + escapeHtml(formatFecha(it.disponibleDesde)) + '</span>';
    return '<span class="pill">pendiente</span>';
  };
  // Ruta abierta a su ritmo (openspec: profe-ruta-abierta): todo lo que ya abrió se resuelve desde aquí, sin esperar
  // su semana; la fecha de cada elemento es ritmo sugerido.
  const accion = id => { const it = items.get(id); return it && it.estado !== 'proximamente' ? ' ' + accionItem(it, it.estado) : ''; };
  const abiertas = (plan.semanas || []).filter(s => s.id !== actual && (s.elementos || []).some(e => { const it = items.get(e.id); return it && it.estado !== 'proximamente'; })).length;
  const semanas = (plan.semanas || []).map(s => {
    const elementos = (s.elementos || []).map(e => '<li class="pf-plan-el" data-plan-id="' + escapeHtml(e.id) + '"><span>' + icono(e.tipo) + ' ' + escapeHtml(e.titulo) + ' · <span class="meta">' + escapeHtml(formatFecha(e.fecha)) + '</span> · ' + estadoDe(e.id) + '</span>' + accion(e.id) + '</li>').join('');
    const hechos = (s.elementos || []).filter(e => { const it = items.get(e.id); return it && it.estado === 'completo'; }).length;
    return '<details class="ruta-sem' + (s.id === actual ? ' actual' : '') + '"' + (s.id === actual ? ' open' : '') + '><summary><span>' + (s.id === actual ? '👉 ' : '') + escapeHtml(s.titulo) + '</span><span class="pf-avance">' + hechos + '/' + (s.elementos || []).length + '</span></summary>' +
      (s.objetivo ? '<div>' + escapeHtml(s.objetivo) + '</div>' : '') +
      '<div class="chips">' + (s.temas || []).map(t => '<span class="chip neutra">' + escapeHtml(t) + '</span>').join('') + '</div>' +
      (s.busuu ? '<div class="meta">📗 ' + escapeHtml(s.busuu) + '</div>' : '') + (s.extra ? '<div class="meta">✍️ ' + escapeHtml(s.extra) + '</div>' : '') +
      '<ul class="ruta-lista">' + elementos + '</ul></details>';
  }).join('');
  return '<details class="section" id="ruta-plan" open><summary><div class="section-head"><span><span class="chevron">▶</span>🗺️ ' + escapeHtml(plan.titulo) + '</span>' + (plan.nivelActual && plan.meta ? '<span class="count">' + escapeHtml(plan.nivelActual + ' → ' + plan.meta) + '</span>' : '') + '</div></summary><div class="ruta-body">' +
    (plan.subtitulo ? '<div class="progress-text" style="margin:0 0 6px">' + escapeHtml(plan.subtitulo) + '</div>' : '') +
    (plan.horizonte ? '<div class="progress-text">🎯 ' + escapeHtml(plan.horizonte) + '</div>' : '') +
    (abiertas ? '<div class="pf-ok" id="pf-ruta-abierta">🔓 Tu ruta ya está abierta: abre cualquier semana y resuélvela a tu ritmo. Las fechas son ritmo sugerido.</div>' : '') +
    semanas + '</div></details>';
}
