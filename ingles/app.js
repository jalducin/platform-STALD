// Inglés · arranque: sesión, carga de datos, navegación por secciones (hash) y eventos.

// ---------- Tema claro / oscuro (preferencia de interfaz, sin datos personales) ----------
const TEMAS = ['auto', 'oscuro', 'claro'];
function temaGuardado() { try { const t = localStorage.getItem('stald_tema'); return TEMAS.includes(t) ? t : 'auto'; } catch (e) { return 'auto'; } }
function aplicarTema(t) {
  const html = document.documentElement;
  if (t === 'oscuro') html.dataset.theme = 'dark'; else if (t === 'claro') html.dataset.theme = 'light'; else delete html.dataset.theme;
  try { localStorage.setItem('stald_tema', t); } catch (e) { /* sin almacenamiento: solo esta vez */ }
  const b = document.getElementById('tema-btn');
  if (b) { b.textContent = { auto: '🌓', oscuro: '🌙', claro: '☀️' }[t]; b.setAttribute('aria-label', 'Tema: ' + { auto: 'automático', oscuro: 'oscuro', claro: 'claro' }[t] + '. Cambiar'); b.title = b.getAttribute('aria-label'); }
  document.querySelectorAll('input[name="tema"]').forEach(i => { i.checked = i.value === t; });
}
aplicarTema(temaGuardado());
document.getElementById('tema-btn').addEventListener('click', () => aplicarTema(TEMAS[(TEMAS.indexOf(temaGuardado()) + 1) % TEMAS.length]));

// ---------- Navegación ----------
function rolActual() { return MODO_PROFE || isAdminView() ? 'admin' : 'alumno'; }
function seccionActual() {
  const ids = seccionesDe(rolActual()).filter(s => !s.href && !s.accion).map(s => s.id);
  const h = decodeURIComponent(location.hash.slice(1));
  return ids.includes(h) ? h : ids[0];
}
function navItem(s, actual, extra) {
  const cur = s.id === actual ? ' aria-current="page"' : '';
  const cuerpo = '<span class="nav-emoji" aria-hidden="true">' + s.emoji + '</span><span class="nav-label">' + escapeHtml(s.titulo) + '</span>';
  const cls = 'nav-item' + (extra ? ' ' + extra : '') + (s.id === 'ruta' ? ' profe-link' : '');
  if (s.accion) return '<button type="button" class="' + cls + '" data-nav-accion="' + s.accion + '">' + cuerpo + '</button>';
  // En ?modo=profe las secciones del admin viven en ingles.html (sin modo).
  const href = s.href ? conApiParam(s.href) : (MODO_PROFE ? conApiParam('ingles.html') + '#' + s.id : '#' + s.id);
  return '<a class="' + cls + '" href="' + escapeHtml(href) + '" data-nav="' + s.id + '"' + cur + '>' + cuerpo + '</a>';
}
function pintarNav() {
  const rol = rolActual(), actual = MODO_PROFE ? 'ruta' : seccionActual();
  document.body.classList.toggle('vista-admin', rol === 'admin');
  document.body.classList.toggle('vista-alumno', rol === 'alumno');
  document.body.classList.add('con-barra');
  const lista = seccionesDe(rol);
  if (rol === 'alumno') {
    navEl.innerHTML = lista.map(s => navItem(s, actual)).join('');
  } else {
    const barra = lista.filter(s => s.barra), resto = lista.filter(s => !s.barra);
    navEl.innerHTML = barra.map(s => navItem(s, actual)).join('') + resto.map(s => navItem(s, actual, 'solo-escritorio')).join('') +
      '<button type="button" class="nav-item solo-celular" data-nav-accion="mas" aria-expanded="false" aria-controls="nav-mas"><span class="nav-emoji" aria-hidden="true">☰</span><span class="nav-label">Más</span></button>';
    document.getElementById('nav-mas').innerHTML = resto.map(s => navItem(s, actual)).join('');
  }
  navEl.hidden = false;
}
// Muestra la sección del hash, marca su pestaña (aria-current) y pone el título de la pestaña del navegador.
function aplicarRuta() {
  pintarNav();
  if (MODO_PROFE) return;
  const id = seccionActual();
  contentEl.querySelectorAll('[data-seccion]').forEach(s => { s.hidden = s.dataset.seccion !== id; });
  const s = seccion(rolActual(), id);
  document.title = (s ? s.titulo + ' · ' : '') + 'Clases de Inglés';
  if (rolActual() === 'admin' && id === 'resumen' && !state.resumen) cargarResumen();
}
window.addEventListener('hashchange', () => {
  document.getElementById('nav-mas').hidden = true;
  if (!state.data) return;
  if (location.hash.startsWith('#ver/')) return; // dentro del reproductor
  if (state.vista !== 'secciones') { render(state.data); window.scrollTo(0, 0); return; }
  aplicarRuta(); window.scrollTo(0, 0);
});
// Entrar a una actividad, resultado o guion agrega una entrada al historial: Atrás regresa a la sección.
function entrarVista(nombre, id) {
  state.vista = nombre;
  if (!location.hash.startsWith('#ver/')) history.pushState(null, '', '#ver/' + encodeURIComponent(id || nombre));
}
function salirVista() {
  if (location.hash.startsWith('#ver/')) { history.back(); return; } // hashchange vuelve a dibujar la sección
  render(state.data); window.scrollTo(0, 0);
}

document.addEventListener('click', e => {
  const b = e.target.closest('[data-nav-accion]');
  const mas = document.getElementById('nav-mas');
  if (!b) { if (!e.target.closest('#nav-mas')) mas.hidden = true; return; }
  if (b.dataset.navAccion === 'mas') { mas.hidden = !mas.hidden; b.setAttribute('aria-expanded', String(!mas.hidden)); return; }
  if (b.dataset.navAccion === 'salir') { mas.hidden = true; cerrarSesion(); }
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') document.getElementById('nav-mas').hidden = true; });

// ---------- Dibujo ----------
function render(data) {
  state.vista = 'secciones';
  if (location.hash.startsWith('#ver/')) history.replaceState(null, '', location.pathname + location.search + '#' + seccionActual());
  whoLabel.textContent = MODO_PROFE ? 'Ruta del profe' : data.isAdmin ? 'Modo maestro' : '';
  if (data.isAdmin) {
    const tag = document.createElement('span');
    tag.className = 'admin-tag';
    tag.textContent = 'Admin';
    whoLabel.appendChild(tag);
  }
  if (MODO_PROFE) contentEl.innerHTML = renderProfe(state.act);
  else if (!data.isAdmin) contentEl.innerHTML = renderAlumno(data, state.act);
  else contentEl.innerHTML = renderAdmin(data);
  aplicarRuta();
  if (!MODO_PROFE && !data.isAdmin) iniciarCuentaRegresiva();
}

// ---------- Eventos del contenido (y del cajón, que vive fuera de #content) ----------
function onSubmit(e) {
  if (e.target.id === 'alta-alumno') { e.preventDefault(); altaAlumno(e.target); }
  if (e.target.id === 'grupo-form') { e.preventDefault(); guardarGrupo(e.target); }
  const f = e.target.closest('#exam-form'); if (f) { e.preventDefault(); submitExam(f); }
}
function onChange(e) {
  if (e.target.id === 'grupo-filtro') { state.grupoFiltro = e.target.value || null; state.resumen = null; render(state.data); cargarResumen(); }
  if (e.target.dataset && e.target.dataset.mover) moverGrupo(e.target);
  if (e.target.name === 'tema') aplicarTema(e.target.value);
  const f = e.target.closest('#exam-form'); if (f) updateExamProgress(f);
}
function onClick(e) {
  const b = e.target.closest('[data-action]');
  if (!b) return;
  const act = b.dataset.action;
  if (act === 'filtrar') { const board = b.closest('.board'); aplicarFiltro(board, b.getAttribute('aria-pressed') === 'true' ? null : b.dataset.grupo); }
  if (act === 'ver-todo') aplicarFiltro(b.closest('.board'), null);
  if (act === 'marcar') { e.preventDefault(); marcarTarea(b); }
  if (act === 'quitar-alumno') { e.preventDefault(); quitarAlumno(b); }
  if (act === 'editar-grupo') { e.preventDefault(); state.grupoEdicion = (state.grupos.grupos || []).find(g => g.id === b.dataset.id) || null; state.gruposAbierto = true; render(state.data); document.getElementById('g-nombre').focus(); }
  if (act === 'tts') { e.preventDefault(); hablar(b.dataset.texto, !!b.dataset.lento); }
  if (act === 'grabar') { e.preventDefault(); grabarPron(b); }
  if (act === 'auto') { e.preventDefault(); const q = b.closest('.q'); const okv = b.dataset.valor === 'auto:ok'; ponerRespuestaPron(q, b.dataset.valor, okv ? '✔ Marcaste que te salió bien' : '↺ Marcaste que necesitas repetir', okv); }
  if (act === 'abrir-item') { e.preventDefault(); if (cajonEl.open) cajonEl.close(); openItem(b.dataset.id, b.dataset.alumno); }
  if (act === 'ver-resultado') {
    const it = ((state.act && state.act.items) || []).find(x => x.id === b.dataset.id);
    if (it && it.mejor) showResult(it.mejor, { titulo: it.titulo + ' · mejor intento (' + it.intentosUsados + '/' + it.intentosMax + ')' });
  }
  if (act === 'abrir-guion') { e.preventDefault(); openGuion(b.dataset.id); }
  if (act === 'presentar') { e.preventDefault(); openPresentacion(b.dataset.id); }
  if (act === 'volver') { e.preventDefault(); salirVista(); }
  if (act === 'dia') { e.preventDefault(); filtrarDia(b); }
  if (act === 'salir') { e.preventDefault(); cerrarSesion(); }
  if (act === 'cajon') { e.preventDefault(); abrirCajon(b.dataset.alumno); }
  if (act === 'cerrar-cajon') { e.preventDefault(); cajonEl.close(); }
  if (act === 'prorroga') { e.preventDefault(); darProrroga(b); }
  if (act === 'reiniciar') { e.preventDefault(); reiniciarIntento(b); }
  if (act === 'q-sig') { e.preventDefault(); moverPaso(1); }
  if (act === 'q-ant') { e.preventDefault(); moverPaso(-1); }
  if (act === 'ver-todas') { e.preventDefault(); verTodas(b); }
}
for (const el of [contentEl, cajonEl]) {
  el.addEventListener('submit', onSubmit);
  el.addEventListener('change', onChange);
  el.addEventListener('click', onClick);
}
contentEl.addEventListener('input', (e) => { const f = e.target.closest('#exam-form'); if (f && e.target.classList.contains('q-text')) updateExamProgress(f); });

// ---------- Sesión y carga ----------
async function loadFor(email) {
  contentEl.innerHTML = esqueleto();
  loginError.style.display = 'none';
  try {
    // Tablero y exámenes en paralelo para no sumar las dos esperas.
    state.email = email;
    if (MODO_PROFE) return await loadProfe(email);
    const actividadesP = loadActividades();
    const r = await api(DATA_URL_BASE + '?email=' + encodeURIComponent(email));
    const data = r.body;
    if (!r.ok) throw new Error(data.error === 'mucho_trafico' ? 'Hay mucha actividad en este momento. Intenta de nuevo en unos minutos.' : (data.error || ('HTTP ' + r.status)));

    if (!data.isAdmin && (!data.rows || data.rows.length === 0)) {
      loginError.textContent = 'No encontré clases asociadas a ese correo.';
      loginError.style.display = 'block';
      localStorage.removeItem(STORAGE_KEY);
      loginEl.style.display = 'block';
      appEl.style.display = 'none';
      return;
    }

    localStorage.setItem(STORAGE_KEY, email);
    loginEl.style.display = 'none';
    appEl.style.display = 'block';
    state.data = data;
    await actividadesP;
    if (data.isAdmin) { state.resumen = null; await Promise.all([loadJuegosAdmin(), loadAlumnosAdmin(), loadGruposAdmin()]); }
    render(data);
    if (data.isAdmin) cargarResumen(); // idempotente; el cajón también lo usa
    if (state.altaAviso) { const m = document.getElementById('alta-msg'); if (m) m.innerHTML = '<div class="progress-text">' + escapeHtml(state.altaAviso) + '</div>'; state.altaAviso = null; }
  } catch (e) {
    loginError.textContent = '⚠️ ' + e.message;
    loginError.style.display = 'block';
  }
}

loginBtn.addEventListener('click', () => {
  const email = emailInput.value.trim().toLowerCase();
  if (!email) return;
  loadFor(email);
});
emailInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') loginBtn.click(); });

function cerrarSesion() {
  SESSION_KEYS.forEach(k => localStorage.removeItem(k));
  if (cajonEl.open) cajonEl.close();
  appEl.style.display = 'none';
  loginEl.style.display = 'block';
  navEl.hidden = true;
  emailInput.value = '';
  state.data = null;
}
logoutBtn.addEventListener('click', cerrarSesion);

const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('stald_email');
if (saved) {
  emailInput.value = saved;
  loadFor(saved);
}
