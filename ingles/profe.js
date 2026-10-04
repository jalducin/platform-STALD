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
  render(state.data);
}

// ---------- Vista del profe (openspec: profe-diseno): avance, lo urgente arriba y el resto en pestañas ----------
const PF_TABS = [['semana', '📅 Esta semana'], ['plan', '🗺️ Plan del mes'], ['grupo', '👥 Mi grupo'], ['hechas', '✅ Hechas']];
function pfTabGuardada() { try { const t = localStorage.getItem('profe_tab'); return PF_TABS.some(x => x[0] === t) ? t : 'semana'; } catch (e) { return 'semana'; } }
function pfFila(it) {
  const tag = it.grupo ? '<span class="pf-tag grupo">👥 Grupo</span>' : '<span class="pf-tag ruta">🎓 Ruta</span>';
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
  const semPlan = plan && act.semana ? (plan.semanas || []).find(s => s.id === act.semana.id) : null;
  const tab = pfTabGuardada();
  const hero = '<section class="pf-hero"><div class="pf-top"><span class="pf-sem">' + (act && act.semana ? '👉 ' + escapeHtml(act.semana.titulo) : '🎓 Tu ruta') + '</span>' +
    '<span class="pf-sig">' + (sig ? 'Siguiente: ' + icono(sig.tipo) + ' ' + escapeHtml(sig.titulo) + ' · ' + escapeHtml(formatFecha(sig.fechaLimite)) : 'Sin entregas próximas') + '</span></div>' +
    '<div class="progress-bar" style="margin-top:10px"><span style="width:' + pct + '%"></span></div><div class="progress-text" style="margin:4px 0 0">Ruta del mes: ' + hechosPlan + '/' + delPlan.size + ' (' + pct + '%)</div>' +
    '<div class="pf-stats"><div class="pf-stat hecho"><b>' + (g.recent.length + g.older.length) + '</b><span>Hechas</span></div><div class="pf-stat atraso"><b>' + g.overdue.length + '</b><span>Atrasadas</span></div>' +
    '<div class="pf-stat"><b>' + g.today.length + '</b><span>Hoy</span></div><div class="pf-stat"><b>' + g.upcoming.length + '</b><span>Próximas</span></div></div></section>';
  const urgente = '<div class="exam-card" id="pf-urgente"><h3>🔥 Pendiente ahora' + (urgentes.length ? ' (' + urgentes.length + ')' : '') + '</h3>' +
    (urgentes.length ? urgentes.map(pfFila).join('') : '<div class="pf-ok">¡Al día! 🎉 No tienes nada atrasado ni para hoy.</div>') + '</div>';
  const semana = (semPlan ? '<div class="exam-card"><h3>🎯 Objetivo de la semana</h3><div>' + escapeHtml(semPlan.objetivo) + '</div><div class="chips" style="margin-top:6px">' + (semPlan.temas || []).map(t => '<span class="chip neutra">' + escapeHtml(t) + '</span>').join('') + '</div>' +
    '<div class="meta" style="margin-top:6px">📗 ' + escapeHtml(semPlan.busuu) + '</div><div class="meta">✍️ ' + escapeHtml(semPlan.extra) + '</div></div>' : '') + renderWeekCard(act);
  const hechas = items.filter(it => it.estado === 'completo').sort((a, b) => (b.ultimoEnvio || '').localeCompare(a.ultimoEnvio || ''));
  const panelHechas = '<div class="exam-card"><h3>✅ Hechas (' + hechas.length + ')</h3>' + (hechas.length ? hechas.map(pfFila).join('') : '<div class="pf-ok">Todavía no hay entregas.</div>') + '</div>';
  const paneles = { semana: semana || '<div class="pf-ok">Sin actividades esta semana.</div>', plan: renderPlanProfe(act) || '<div class="pf-ok">Sin plan.</div>', grupo: renderGrupoProfe(act) || '<div class="pf-ok">Sin actividades del grupo.</div>', hechas: panelHechas };
  const tabs = '<div class="pf-tabs" role="tablist" aria-label="Secciones de mi ruta">' + PF_TABS.map(([id, t]) => '<button type="button" role="tab" id="pf-tab-' + id + '" data-pf-tab="' + id + '" aria-controls="pf-panel-' + id + '" aria-selected="' + (id === tab) + '">' + t + '</button>').join('') + '</div>' +
    PF_TABS.map(([id]) => '<div role="tabpanel" id="pf-panel-' + id + '" data-pf-panel="' + id + '" aria-labelledby="pf-tab-' + id + '"' + (id === tab ? '' : ' hidden') + '>' + paneles[id] + '</div>').join('');
  const lado = '<aside class="pf-side">' +
    (plan ? '<div class="exam-card"><h3>⏱️ ' + escapeHtml(plan.horasSemana || 'Horas por semana') + '</h3><div class="ruta-reparto">' + (plan.reparto || []).map(x => '<span>' + escapeHtml(x.que) + '</span><span>' + escapeHtml(x.tiempo) + '</span>').join('') + '</div>' +
      '<details class="section" style="margin-top:8px"><summary><div class="section-head"><span><span class="chevron">▶</span>☀️ Rutina y reglas</span></div></summary><div class="scroll"><ul class="ruta-lista">' +
      (plan.rutinaDiaria || []).map(x => '<li>' + escapeHtml(x) + '</li>').join('') + '</ul><ul class="ruta-lista" style="margin-top:8px">' + (plan.reglas || []).map(x => '<li>' + escapeHtml(x) + '</li>').join('') + '</ul></div></details></div>' : '') +
    '<div class="exam-card"><h3>📅 Próximas</h3>' + (futuras.length ? futuras.slice(0, 3).map(it => '<div class="exam-item"><div><div class="t">' + icono(it.tipo) + ' ' + escapeHtml(it.titulo) + '</div><div class="s">' + escapeHtml(formatFecha(it.fechaLimite)) + (it.grupo ? ' · 👥 Grupo' : '') + '</div></div></div>').join('') : '<div class="pf-ok">Nada próximo.</div>') + '</div>' +
    '<a class="profe-link" href="' + escapeHtml(conApiParam('ingles.html')) + '">← Vista de mi grupo</a></aside>';
  return hero + '<div class="pf-grid"><div class="pf-main">' + urgente + tabs + '</div>' + lado + '</div>';
}
// Cambio de pestaña sin redibujar (se conserva el scroll); se recuerda en este navegador.
document.addEventListener('click', e => {
  const b = e.target.closest('[data-pf-tab]'); if (!b) return;
  const id = b.dataset.pfTab;
  document.querySelectorAll('[data-pf-tab]').forEach(x => x.setAttribute('aria-selected', String(x === b)));
  document.querySelectorAll('[data-pf-panel]').forEach(x => { x.hidden = x.dataset.pfPanel !== id; });
  try { localStorage.setItem('profe_tab', id); } catch (err) { /* sin almacenamiento: solo esta vez */ }
});

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
  const actual = act.semana && act.semana.id;
  const estadoDe = id => {
    const it = items.get(id);
    if (!it) return '<span class="pill wait">🔒 abre su lunes</span>';
    if (it.mejor) return '<span class="pill ok">⭐ ' + it.mejor.porcentaje + '%</span>';
    if (it.estado === 'proximamente') return '<span class="pill wait">🔒 ' + escapeHtml(formatFecha(it.disponibleDesde)) + '</span>';
    return '<span class="pill">pendiente</span>';
  };
  const semanas = (plan.semanas || []).map(s => {
    const elementos = (s.elementos || []).map(e => '<li>' + icono(e.tipo) + ' ' + escapeHtml(e.titulo) + ' · <span class="meta">' + escapeHtml(formatFecha(e.fecha)) + '</span> · ' + estadoDe(e.id) + '</li>').join('');
    const hechos = (s.elementos || []).filter(e => { const it = items.get(e.id); return it && it.estado === 'completo'; }).length;
    return '<details class="ruta-sem' + (s.id === actual ? ' actual' : '') + '"' + (s.id === actual ? ' open' : '') + '><summary><span>' + (s.id === actual ? '👉 ' : '') + escapeHtml(s.titulo) + '</span><span class="pf-avance">' + hechos + '/' + (s.elementos || []).length + '</span></summary>' +
      '<div>' + escapeHtml(s.objetivo) + '</div>' +
      '<div class="chips">' + (s.temas || []).map(t => '<span class="chip neutra">' + escapeHtml(t) + '</span>').join('') + '</div>' +
      '<div class="meta">📗 ' + escapeHtml(s.busuu) + '</div><div class="meta">✍️ ' + escapeHtml(s.extra) + '</div>' +
      '<ul class="ruta-lista">' + elementos + '</ul></details>';
  }).join('');
  return '<details class="section" id="ruta-plan" open><summary><div class="section-head"><span><span class="chevron">▶</span>🗺️ ' + escapeHtml(plan.titulo) + '</span><span class="count">' + escapeHtml(plan.nivelActual + ' → ' + plan.meta) + '</span></div></summary><div class="ruta-body">' +
    '<div class="progress-text" style="margin:0 0 6px">' + escapeHtml(plan.subtitulo || '') + '</div>' +
    '<div class="progress-text">🎯 ' + escapeHtml(plan.horizonte || '') + '</div>' +
    semanas + '</div></details>';
}
