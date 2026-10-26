// Inglés · arranque: sesión, carga de datos, navegación por secciones (hash) y eventos.

// ---------- Tema claro / oscuro (preferencia de interfaz, sin datos personales) ----------
const TEMAS = ['auto', 'oscuro', 'claro'];
function temaGuardado() { try { const t = localStorage.getItem('stald_tema'); return TEMAS.includes(t) ? t : 'auto'; } catch { /* sin almacenamiento: tema automático */ return 'auto'; } }
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
// Entregas listas para evaluar (Inglés + Secundaria; null si no se sabe). Mismo dato que «📥 Por revisar»: la bandeja si ya
// se cargó y, si no, el conteo del panel (openspec: navegacion-mejoras, panel-profe-peticiones).
function entregasPendientes() {
  const c = conteoEntregas();
  return c ? c.pendientes : null;
}
// Visible: el número sobre el emoji; para lectores de pantalla, «Entregas, N por revisar» (después de la etiqueta).
const contadorEntregas = () => { const n = entregasPendientes(); return n ? '<span class="nav-contador" data-contador-entregas aria-hidden="true">' + (n > 99 ? '99+' : n) + '</span>' : ''; };
const avisoEntregas = () => { const n = entregasPendientes(); return n ? '<span class="sr-only" data-aviso-entregas>, ' + n + ' por revisar</span>' : ''; };
// Repinta el contador de «📥 Entregas» en la barra del celular y en el menú lateral (lo llama cargarBandejaSec).
function pintarContadorEntregas() {
  document.querySelectorAll('#nav [data-nav="entregas"]').forEach(a => {
    a.querySelectorAll('[data-contador-entregas], [data-aviso-entregas]').forEach(x => x.remove());
    a.querySelector('.nav-emoji').insertAdjacentHTML('afterend', contadorEntregas());
    a.querySelector('.nav-label').insertAdjacentHTML('afterend', avisoEntregas());
  });
  // «📥 Por revisar» usa el mismo dato: se repinta con el contador (openspec: panel-profe-peticiones).
  if (typeof pintarPanelProfe === 'function' && rolActual() === 'admin' && !MODO_PROFE && !MODO_SECUNDARIA) pintarPanelProfe();
}
function navItem(s, actual, extra) {
  const cur = s.id === actual ? ' aria-current="page"' : '';
  const cuerpo = '<span class="nav-emoji" aria-hidden="true">' + s.emoji + '</span>' + (s.id === 'entregas' && s.rol === 'admin' ? contadorEntregas() : '') + '<span class="nav-label">' + escapeHtml(s.titulo) + '</span>' + (s.id === 'entregas' && s.rol === 'admin' ? avisoEntregas() : '');
  const cls = 'nav-item' + (extra ? ' ' + extra : '') + (s.id === 'ruta' ? ' profe-link' : '');
  if (s.accion) return '<button type="button" class="' + cls + '" data-nav-accion="' + s.accion + '">' + cuerpo + '</button>';
  // En ?modo=profe las secciones del admin viven en ingles.html (sin modo).
  let href = '#' + s.id;
  if (s.href) href = conApiParam(s.href);
  else if (MODO_PROFE) href = conApiParam('ingles.html') + '#' + s.id;
  return '<a class="' + cls + '" href="' + escapeHtml(href) + '" data-nav="' + s.id + '"' + cur + '>' + cuerpo + '</a>';
}
function pintarNav() {
  if (MODO_SECUNDARIA) { navEl.hidden = true; return; } // página de una sola vista
  const rol = rolActual(), actual = MODO_PROFE ? 'ruta' : seccionActual();
  document.body.classList.toggle('vista-admin', rol === 'admin');
  document.body.classList.toggle('vista-alumno', rol === 'alumno');
  document.body.classList.add('con-barra');
  const lista = seccionesDe(rol);
  if (rol === 'alumno') {
    navEl.innerHTML = lista.filter(s => !s.fueraDeBarra).map(s => navItem(s, actual)).join('');
  } else {
    // En el orden del catálogo (el menú lateral de PC no cambia); en celular solo las de barra y el resto en «☰ Más».
    const resto = lista.filter(s => !s.barra);
    navEl.innerHTML = lista.map(s => navItem(s, actual, s.barra ? '' : 'solo-escritorio')).join('') +
      '<button type="button" class="nav-item solo-celular" data-nav-accion="mas" aria-expanded="false" aria-controls="nav-mas"><span class="nav-emoji" aria-hidden="true">☰</span><span class="nav-label">Más</span></button>';
    document.getElementById('nav-mas').innerHTML = resto.map(s => navItem(s, actual)).join('');
  }
  navEl.hidden = false;
}
// Muestra la sección del hash, marca su pestaña (aria-current) y pone el título de la pestaña del navegador.
function aplicarRuta() {
  pintarNav();
  if (MODO_PROFE || MODO_SECUNDARIA) return;
  const id = seccionActual();
  contentEl.querySelectorAll('[data-seccion]').forEach(s => { s.hidden = s.dataset.seccion !== id; });
  const s = seccion(rolActual(), id);
  document.title = (s ? s.titulo + ' · ' : '') + 'Clases de Inglés';
  if (rolActual() === 'admin' && id === 'resumen' && !state.resumen) cargarResumen();
  if (rolActual() === 'admin' && id === 'nicks' && !state.nicks) cargarNicksAdmin(); // openspec: rpg-fase2-ingles
  if (rolActual() === 'admin' && id === 'entregas') { if (state.secBandeja) pintarEntregasPendientes(); else cargarEntregasIngles(); } // openspec: rpg-ingles-hero-card, navegacion-dispositivos
  // Pestañas pesadas bajo demanda (openspec: panel-profe-peticiones): la lista con correos y los juegos de la semana.
  if (rolActual() === 'admin' && id === 'registro' && !state.registroAdmin) cargarRegistroAdmin();
  if (rolActual() === 'admin' && (id === 'juegos' || id === 'alumnos')) asegurarJuegosAdmin();
}
window.addEventListener('hashchange', () => {
  document.getElementById('nav-mas').hidden = true;
  if (!state.data) return;
  if (location.hash.startsWith('#ver/')) return; // dentro del reproductor
  if (state.vista !== 'secciones') { render(state.data); window.scrollTo(0, 0); return; }
  // Secundaria: «Atrás» entre pestañas (cada toque agrega una entrada; openspec: navegacion-dispositivos).
  // Sin hash = la entrada con la que se abrió la página (Inicio); otro hash que no es pestaña (p. ej. #content) no cambia nada.
  if (MODO_SECUNDARIA) { const h = decodeURIComponent(location.hash.slice(1)); const t = h ? tabDeHash(h) : 'inicio'; if (t) irPestanaSec(t, false, 'nada'); return; }
  aplicarRuta(); window.scrollTo(0, 0);
});
// Entrar a una actividad, resultado o guion agrega una entrada al historial: Atrás regresa a la sección.
function entrarVista(nombre, id) {
  state.vista = nombre;
  // El hash nombra lo que se ve (al recargar se reabre; openspec: autoguardado-todo). El resultado lleva su prefijo
  // para que recargarlo no abra un intento nuevo.
  const hash = '#ver/' + (nombre === 'resultado' ? 'resultado:' : '') + encodeURIComponent(id || nombre);
  if (!location.hash.startsWith('#ver/')) history.pushState(null, '', hash);
  else if (location.hash !== hash) history.replaceState(null, '', hash);
}
function salirVista() {
  if (location.hash.startsWith('#ver/')) { history.back(); return; } // hashchange vuelve a dibujar la sección
  render(state.data); window.scrollTo(0, 0);
}

document.addEventListener('click', e => {
  const b = e.target.closest('[data-nav-accion]');
  const mas = document.getElementById('nav-mas');
  if (!b) { if (!e.target.closest('#nav-mas')) { mas.hidden = true; } return; }
  if (b.dataset.navAccion === 'mas') { mas.hidden = !mas.hidden; b.setAttribute('aria-expanded', String(!mas.hidden)); return; }
  if (b.dataset.navAccion === 'salir') { mas.hidden = true; cerrarSesion(); }
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') document.getElementById('nav-mas').hidden = true; });

// ---------- Dibujo ----------
function render(data) {
  state.vista = 'secciones';
  mostrarMaterialPublico(false);
  if (location.hash.startsWith('#ver/')) history.replaceState(null, '', location.pathname + location.search + '#' + seccionActual());
  whoLabel.textContent = segunModo('Ruta del profe', 'Secundaria', data.isAdmin ? 'Modo maestro' : '');
  if (data.isAdmin) {
    const tag = document.createElement('span');
    tag.className = 'admin-tag';
    tag.textContent = 'Admin';
    whoLabel.appendChild(tag);
  }
  if (MODO_PROFE) contentEl.innerHTML = renderProfe(state.act);
  else if (MODO_SECUNDARIA) contentEl.innerHTML = renderSecundaria(state.act);
  else if (!data.isAdmin) contentEl.innerHTML = renderAlumno(data, state.act);
  else contentEl.innerHTML = renderAdmin(data);
  aplicarRuta();
  if (!MODO_PROFE && !MODO_SECUNDARIA && !data.isAdmin) iniciarCuentaRegresiva();
}

// ---------- Eventos del contenido (y del cajón, que vive fuera de #content) ----------
function onSubmit(e) {
  if (e.target.id === 'alta-alumno') { e.preventDefault(); altaAlumno(e.target); }
  if (e.target.id === 'grupo-form') { e.preventDefault(); guardarGrupo(e.target); }
  const f = e.target.closest('#exam-form'); if (f) { e.preventDefault(); submitExam(f); }
}
function onChange(e) {
  if (e.target.id === 'grupo-filtro') { state.grupoFiltro = e.target.value || null; state.resumen = null; state.nicks = null; render(state.data); cargarResumen(); }
  if (e.target.id === 'mostrar-ocultos') { // openspec: ingles-ocultar-grupos
    state.mostrarOcultos = e.target.checked;
    if (!state.mostrarOcultos && gruposOcultos().some(g => g.id === state.grupoFiltro)) state.grupoFiltro = null;
    state.resumen = null; render(state.data); cargarResumen();
  }
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
  if (act === 'quitar-alumno') { e.preventDefault(); quitarAlumno(b); }
  if (act === 'baja-ingles') { e.preventDefault(); bajaIngles(b, false); }
  if (act === 'reactivar-ingles') { e.preventDefault(); bajaIngles(b, true); }
  if (act === 'ocultar-grupo') { e.preventDefault(); ocultarGrupo(b); }
  if (act === 'editar-grupo') { e.preventDefault(); state.grupoEdicion = (state.grupos.grupos || []).find(g => g.id === b.dataset.id) || null; state.gruposAbierto = true; render(state.data); document.getElementById('g-nombre').focus(); }
  if (act === 'tts') { e.preventDefault(); hablar(b.dataset.texto, !!b.dataset.lento); }
  if (act === 'grabar') { e.preventDefault(); grabarPron(b); }
  if (act === 'auto') { e.preventDefault(); const q = b.closest('.q'); const okv = b.dataset.valor === 'auto:ok'; ponerRespuestaPron(q, b.dataset.valor, okv ? '✔ Marcaste que te salió bien' : '↺ Marcaste que necesitas repetir', okv); }
  if (act === 'ficha') { e.preventDefault(); ordenarMover(b); }
  if (act === 'ord-borrar') { e.preventDefault(); ordenarBorrar(b); }
  if (act === 'emp') { e.preventDefault(); empClick(b); }
  if (act === 'abrir-item') { e.preventDefault(); if (cajonEl.open) { cajonEl.close(); } openItem(b.dataset.id, b.dataset.alumno); }
  if (act === 'ver-resultado') {
    const it = ((state.act && state.act.items) || []).find(x => x.id === b.dataset.id);
    if (it && it.mejor) showResult(it.mejor, { titulo: it.titulo + ' · mejor intento (' + it.intentosUsados + '/' + it.intentosMax + ')', revisionDe: it.id });
  }
  if (act === 'abrir-guion') { e.preventDefault(); openGuion(b.dataset.id); }
  if (act === 'abrir-material') { e.preventDefault(); openMaterial(b.dataset.id); }
  if (act === 'ver-pendientes') { e.preventDefault(); openPendientes(); }
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

// Recargar dentro de una actividad (#ver/<id>) la vuelve a abrir con su avance (openspec: autoguardado-todo). Solo una
// vez, solo alumnos, alumnas y la ruta del profe, y solo si el elemento sigue abierto para resolverse.
let verAlCargar = location.hash.startsWith('#ver/') ? decodeURIComponent(location.hash.slice(5)) : null;
function reabrirTrasRecarga() {
  const id = verAlCargar;
  verAlCargar = null;
  const act = state.act;
  if (!id || !act || act.isAdmin) return;
  const it = (act.items || []).find(x => x.id === id);
  if (it && it.intentosMax > 0 && (it.estado === 'disponible' || it.estado === 'en-curso')) openItem(id);
}

// ---------- Sesión y carga ----------
async function loadFor(email) {
  contentEl.innerHTML = esqueleto();
  loginError.style.display = 'none';
  try {
    // Tablero y exámenes en paralelo para no sumar las dos esperas.
    state.email = email;
    if (MODO_PROFE) { await loadProfe(email); return reabrirTrasRecarga(); }
    if (MODO_SECUNDARIA) { await loadSecundaria(email); return reabrirTrasRecarga(); }
    const actividadesP = loadActividades();
    // incluir=panel (openspec: panel-profe-peticiones): si es el admin, el servidor agrega en la misma respuesta grupos,
    // alumnos y alumnas, resumen y «Por revisar»; a cualquier otra persona le responde lo de siempre.
    const clavePanel = claveFiltro();
    const r = await api(DATA_URL_BASE + '?email=' + encodeURIComponent(email) + '&incluir=panel' + filtroPanel());
    const data = r.body;
    if (!r.ok && StaldAuth.esSesionVencida({ status: r.status }, data)) return; // sesionVencida ya pintó la entrada
    if (!r.ok) throw new Error(data.error === 'mucho_trafico' ? 'Hay mucha actividad en este momento. Intenta de nuevo en unos minutos.' : (data.mensaje || data.error || ('HTTP ' + r.status)));

    if (!r.ok && StaldAuth.esSesionVencida({ status: r.status }, data)) return; // ya se mostró la entrada
    if (!data.isAdmin && data.baja) return mostrarBaja(); // de baja de Inglés: aviso, sin cerrar su sesión
    if (!data.isAdmin && (!data.rows || data.rows.length === 0)) {
      await StaldAuth.salir();
      return mostrarEntrada('No encontré clases asociadas a ' + email + '. Revisa que sea el correo que te dio tu profe.');
    }

    loginEl.style.display = 'none';
    appEl.style.display = 'block';
    state.data = data;
    await actividadesP;
    // Ranking de Inglés: el perfil solo se pide si /ingles/actividades dice que está encendido (openspec: rpg-fase2-ingles).
    if (!data.isAdmin && state.act && state.act.ranking) await cargarPerfilGamificacion(); else { state.gam = null; state.rk = null; }
    if (!data.isAdmin) await cargarMisionesIngles(); // solo pide /misiones si hay alguna visible (openspec: rpg-ingles-hero-card)
    if (data.isAdmin) { state.resumen = null; await prepararPanelAdmin(data.panel, clavePanel); }
    render(data);
    if (data.isAdmin && !state.resumen) cargarResumen(); // servidor sin panel, o el filtro cambió mientras llegaba
    if (data.isAdmin && cajonEl.open && state.cajonAlumno) pintarCajon(state.cajonAlumno); // tras mover de grupo desde el cajón
    else cargarRankingIngles();
    if (!data.isAdmin) reabrirTrasRecarga();
    if (state.altaAviso) { const m = document.getElementById('alta-msg'); if (m) { m.innerHTML = '<div class="progress-text">' + escapeHtml(state.altaAviso) + '</div>'; } state.altaAviso = null; }
  } catch (e) {
    if (appEl.style.display === 'none') mostrarEntrada('⚠️ ' + e.message);
    else contentEl.innerHTML = vacio('⚠️', e.message);
  }
}

// De baja de Inglés (openspec: ingles-baja-alumno): aviso amable; Secundaria y Juegos siguen igual.
function mostrarBaja() {
  loginEl.style.display = 'none'; appEl.style.display = 'block'; navEl.hidden = true;
  mostrarMaterialPublico(false);
  state.data = null;
  whoLabel.textContent = '';
  document.title = 'Clases de Inglés';
  contentEl.innerHTML = '<section class="card baja-ingles" style="max-width:560px;margin:24px auto;text-align:center">' +
    '<div style="font-size:2.4rem" aria-hidden="true">👋</div>' +
    '<h2 class="card-titulo">Ya no estás en Inglés en línea</h2>' +
    '<p>Tus clases de Inglés siguen en Secundaria. Ahí encuentras tus actividades y exámenes.</p>' +
    '<div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-top:12px">' +
      '<a class="btn" href="' + escapeHtml(conApiParam('ingles.html?modo=secundaria')) + '">📚 Ir a mis clases de Secundaria</a>' +
      '<a class="btn ghost" href="' + escapeHtml(conApiParam('juegos.html')) + '">🎮 Juegos</a></div></section>';
}

// ---------- Inicio de sesión con correo y contraseña (comun/auth.js, openspec: acceso-con-contrasena) ----------
function mostrarEntrada(aviso) {
  if (cajonEl.open) cajonEl.close();
  appEl.style.display = 'none'; navEl.hidden = true; loginEl.style.display = 'block';
  mostrarMaterialPublico(true);
  state.data = null;
  StaldAuth.pintarEntrada(loginEl, { titulo: MODO_SECUNDARIA ? '📚 Clases de Secundaria' : '📗 Clases de Inglés', texto: 'Entra con tu correo y tu contraseña. Si es tu primera vez, usa la que te dio tu profe.', aviso, alEntrar: c => loadFor(c) });
}
let saliendo = false;
function sesionVencida(body) {
  if (saliendo) return;
  saliendo = true;
  StaldAuth.salir().then(() => {
    saliendo = false;
    mostrarEntrada(body && body.error === 'inicia_sesion' ? '🔒 Por seguridad, ahora entras con tu correo y tu contraseña.' : 'Tu sesión terminó. Vuelve a entrar con tu correo.');
  });
}
async function cerrarSesion() {
  borrarBorradores(); // el avance guardado en este aparato se va con la sesión (openspec: examen-autoguardado)
  await StaldAuth.salir();
  mostrarEntrada();
}
logoutBtn.addEventListener('click', cerrarSesion);

(async () => {
  try { await StaldAuth.iniciar(API_BASE); } catch (e) { /* sin configuración: la entrada muestra el aviso */ }
  // Con sesión: su correo verificado. En la transición (hasta el 12 de octubre): el correo guardado de antes.
  const email = StaldAuth.email() || StaldAuth.correoViejo();
  if (email) loadFor(email); else mostrarEntrada();
})();
