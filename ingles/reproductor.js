// Inglés · reproductor de actividades y exámenes: preguntas, voz, envío y resultado.
async function loadActividades() {
  try {
    const r = await fetchJson(ACT_URL + '?email=' + encodeURIComponent(state.email));
    state.act = r.ok ? r.body : null;
  } catch { /* sin conexión: se pinta sin actividad */ state.act = null; }
}

function volverBtn() { return '<button class="btn ghost" data-action="volver">← Volver</button>'; }

// Clase por pasos (Teoría → Video → Ejercicios → Libreta, ingles/secundaria-clase.js): Secundaria y, desde
// ingles-alumno-diseno-rpg, alumnos y alumnas de Inglés; desde ingles-diseno-profe, también la ruta del profe
// (?modo=profe) cuando trae su plan (sin plan, como antes: lista). El panel del admin sigue con la vista de lista.
const claseEnPasos = () => {
  if (MODO_SECUNDARIA) return true;
  if (MODO_PROFE) return !!(state.act && state.act.plan);
  return !!state.data && !state.data.isAdmin;
};

async function openItem(id) {
  entrarVista('actividad', id);
  contentEl.innerHTML = esqueleto();
  state.abriendo = id;
  const r = await fetchJson(ACT_URL + '/' + encodeURIComponent(id) + '?email=' + encodeURIComponent(state.email));
  if (state.vista !== 'actividad' || state.abriendo !== id) return; // se fue a otra parte mientras cargaba
  if (r.status === 409) limpiarBorradores(claveBorrador(id, ''), null); // ya terminado: su borrador sobra
  if (r.status === 409 && r.body.resultado) return showResult(r.body.resultado.mejor, { titulo: r.body.resultado.titulo });
  if (!r.ok) {
    const msg = r.body.error === 'no_disponible' ? 'Se abre el ' + formatFecha(r.body.disponibleDesde) + '.' : 'No se pudo abrir (' + (r.body.error || r.status) + ').';
    contentEl.innerHTML = '<div class="exam-card"><div class="empty">' + escapeHtml(msg) + '</div>' + volverBtn() + '</div>';
    return;
  }
  const it = r.body;
  state.borradorCuenta = it.vistaPrevia ? null : (it.borrador || null); // copia del servidor (openspec: borrador-en-servidor)
  const titulos = new Map(it.temas.map(t => [t.id, t.titulo]));
  // Corrección (actividades): las correctas del intento anterior vienen fijas; solo se contestan las falladas.
  const corr = it.correccion || null;
  const fijas = corr ? corr.fijas : {};
  const porCorregir = it.preguntas.filter(p => !(p.id in fijas));
  const yaBien = it.preguntas.filter(p => p.id in fijas);
  const tts = t => '<div class="tts"><button type="button" data-action="tts" data-texto="' + escapeHtml(t) + '">🔊 Escuchar</button><button type="button" data-action="tts" data-lento="1" data-texto="' + escapeHtml(t) + '">🐢 Lento</button></div>';
  const audioDe = p => p.audio ? tts(p.audio) : '';
  // Pronunciar: con reconocimiento de voz se graba; sin él, autoevaluación.
  const botonesPron = () => Reconocedor
    ? '<div class="pron-btns"><button type="button" class="rec" data-action="grabar">🎙️ Decirlo</button></div>'
    : '<div class="pron-btns"><button type="button" data-action="auto" data-valor="auto:ok">✔ Me salió bien</button><button type="button" data-action="auto" data-valor="auto:repetir">↺ Necesito repetir</button></div><div class="s" style="font-size:.78rem">Tu navegador no reconoce voz: usa Chrome o Edge para calificarla. Mientras, escucha el modelo, repítelo y autoevalúate.</div>';
  const cuerpoPronunciar = (p, fija, v, dis) =>
    '<div class="pron-frase">' + escapeHtml(p.frase) + '</div>' + tts(p.frase) +
    '<input class="q-text" type="hidden" name="' + escapeHtml(p.id) + '"' + (fija ? ' value="' + escapeHtml(v) + '"' : '') + dis + '>' +
    (fija ? '' : botonesPron()) +
    '<div class="pron-oido">' + (fija ? 'Ya te salió bien ✔' : '') + '</div>';
  const cuerpoEscribir = (p, fija, v, dis) =>
    audioDe(p) + '<input class="q-text" type="text" name="' + escapeHtml(p.id) + '" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Escribe tu respuesta"' + (fija ? ' value="' + escapeHtml(v) + '"' : '') + dis + '>';
  const cuerpoOpcion = (p, fija, v, dis) =>
    audioDe(p) + p.opciones.map((o, i) => '<label><input type="radio" name="' + escapeHtml(p.id) + '" value="' + i + '"' + (fija && v === i ? ' checked' : '') + dis + '> <span>' + escapeHtml(o) + '</span>' + (i < 9 && !fija ? '<span class="tecla" aria-hidden="true">' + (i + 1) + '</span>' : '') + '</label>').join('');
  // Cuerpo del ejercicio según su tipo (opción múltiple si no es otro).
  const cuerpoDe = (p, fija, v, dis) => {
    if (p.tipo === 'pronunciar') return cuerpoPronunciar(p, fija, v, dis);
    if (p.tipo === 'ordenar') return audioDe(p) + bloqueOrdenar(p, fija);
    if (p.tipo === 'emparejar') return audioDe(p) + bloqueEmparejar(p, fija);
    if (p.tipo === 'escribir') return cuerpoEscribir(p, fija, v, dis);
    return cuerpoOpcion(p, fija, v, dis);
  };
  const pregunta = (p, n, total, fija) => {
    const v = fija ? fijas[p.id] : undefined;
    const dis = fija ? ' disabled' : '';
    const cuerpo = cuerpoDe(p, fija, v, dis);
    const antes = corr && !fija ? '<div class="antes">Antes respondiste: ' + escapeHtml(corr.anteriores[p.id] || 'Sin responder') + ' ✗</div>' : '';
    return '<div class="q' + (fija ? ' fija answered' : '') + '" data-q="' + escapeHtml(p.id) + '"' + (p.tipo === 'pronunciar' ? ' data-frase="' + escapeHtml(p.frase) + '"' : '') + '><div class="n"><span>' + (fija ? '✓ Ya la tenías bien' : 'Ejercicio ' + n + ' de ' + total) + '</span><span class="tema-q chip">' + escapeHtml(titulos.get(p.tema) || p.tema || '') + '</span></div>' +
      '<div class="e">' + escapeHtml(p.enunciado) + '</div>' + antes + cuerpo + '</div>';
  };
  const conTemas = (lista, fija) => {
    let lastTema = null, n = 0;
    return lista.map(p => {
      n++;
      const head = p.tema !== lastTema ? '<div class="exam-sec">' + escapeHtml(titulos.get(p.tema) || p.tema) + '</div>' : '';
      lastTema = p.tema;
      return head + pregunta(p, n, lista.length, fija);
    }).join('');
  };
  // Corrección: aviso, las falladas por corregir y, plegadas, las que ya estaban bien.
  const qsCorreccion = () => {
    const fallaste = porCorregir.length === 1 ? 'la que fallaste' : 'las ' + porCorregir.length + ' que fallaste';
    return '<div class="aviso-corr">✏️ Corrección: tus ' + yaBien.length + ' respuestas correctas ya están guardadas. Corrige solo ' + fallaste + '.</div>' +
      conTemas(porCorregir, false) +
      (yaBien.length ? '<details class="section"><summary><div class="section-head"><span><span class="chevron">▶</span>✅ Ya las tenías bien</span><span class="count">' + yaBien.length + '</span></div></summary><div style="padding:8px">' + conTemas(yaBien, true) + '</div></details>' : '');
  };
  const qs = corr ? qsCorreccion() : conTemas(it.preguntas, false);
  const etiquetaIntento = corr ? 'Corrección · intento ' : 'Intento ';
  const info = (it.vistaPrevia ? 'Vista previa (no se guarda)' : etiquetaIntento + it.intento + ' de ' + it.intentosMax) +
    (it.enfoque && it.enfoque.length ? ' · Enfocado en: ' + it.enfoque.join(', ') : '');
  // En celular, una pregunta por pantalla (openspec: ingles-pro); «Ver todas» vuelve a la lista completa.
  const paso = window.matchMedia('(max-width: 599.98px)').matches && porCorregir.length > 1;
  // Autoguardado (openspec: examen-autoguardado): sin vista previa ni almacenamiento no hay borrador.
  const kb = !it.vistaPrevia && almacenDisponible() ? claveBorrador(it.id, it.intento) : '';
  if (kb) limpiarBorradores(claveBorrador(it.id, ''), kb); // intentos anteriores y caducados
  const teoriaAbierta = corr ? '' : ' open'; // en la corrección, la teoría empieza plegada
  const cabecera =
    // Secundaria: si el título ya trae su emoji (p. ej. «📐 Matemáticas · …»), sin el ícono del tipo delante.
    '<div class="exam-card"><h3>' + (MODO_SECUNDARIA && /^\p{Extended_Pictographic}/u.test(it.titulo || '') ? '' : icono(it.tipo) + ' ') + escapeHtml(it.titulo) + '</h3>' +
    '<div class="s" style="font-size:.82rem">' + escapeHtml(info) + '</div>' +
    '<div class="s muted" style="font-size:.76rem;margin-top:4px">⌨️ Atajos: 1–4 eligen la opción · Enter avanza</div>' +
    (it.descripcion ? '<div class="s" style="font-size:.8rem;margin-top:4px">' + escapeHtml(it.descripcion) + '</div>' : '') + '</div>';
  const form =
    '<form id="exam-form"' + (paso ? ' class="paso"' : '') + ' data-id="' + escapeHtml(it.id) + '" data-intento="' + it.intento + '" data-total="' + porCorregir.length + '" data-borrador="' + escapeHtml(kb) + '" data-cuenta="' + (it.vistaPrevia ? '' : '1') + '">' +
    '<div class="player-progreso"><div class="barra accent" role="progressbar" aria-label="Avance" aria-valuemin="0" aria-valuemax="' + porCorregir.length + '" aria-valuenow="0" id="player-barra"><span id="player-bar" style="width:0%"></span></div><span class="num" id="player-num">0/' + porCorregir.length + '</span></div>' +
    (kb || !it.vistaPrevia ? '<div class="autoguardado muted" id="autoguardado">Tu avance se guarda en tu cuenta ✔</div><div class="autoguardado-aviso" id="autoguardado-aviso" aria-live="polite"></div>' : '') +
    (paso ? '<button type="button" class="btn ghost sm ver-todas" data-action="ver-todas">📋 Ver todas las preguntas</button>' : '') +
    '<div class="exam-sec" style="font-size:.9rem">✏️ ' + (corr ? 'Ejercicios por corregir' : 'Ejercicios') + '</div>' + qs +
    '<div class="exam-bar">' + volverBtn() + '<span class="paso-nav"><button type="button" class="btn ghost icono" data-action="q-ant" aria-label="Pregunta anterior">←</button><button type="button" class="btn ghost" data-action="q-sig">Siguiente →</button></span>' +
    '<span class="progress-text" id="exam-count" style="margin:0" aria-live="polite">0/' + porCorregir.length + ' respondidas</span>' +
    '<button class="btn" type="submit" id="exam-send" disabled>Enviar</button></div></form>';
  // Clase por pasos con videos incrustados y libreta (ingles/secundaria-clase.js); el admin, como siempre.
  const pasos = claseEnPasos();
  state.claseAbierta = pasos ? { id: it.id, tips: it.tips || [] } : null;
  contentEl.innerHTML = pasos
    ? vistaClaseSecundaria(it, cabecera, form)
    : cabecera +
      (it.teoria && it.teoria.length ? '<details class="section"' + teoriaAbierta + '><summary><div class="section-head"><span><span class="chevron">▶</span>📖 Teoría</span><span class="count">' + it.teoria.length + '</span></div></summary><div style="padding:8px">' + renderTeoria(it.teoria) + '</div></details>' : '') +
      renderTips(it.tips) + form;
  if (pasos) activarPasosClase();
  state.paso = 0;
  // Correctas fijas de la corrección: la oración y los pares ya armados (openspec: ejercicios-ordenar-emparejar).
  contentEl.querySelectorAll('#exam-form .q.fija').forEach(q => {
    if (q.querySelector('[data-ord]')) ordenarDesdeTexto(q, fijas[q.dataset.q]);
    if (q.querySelector('[data-emp]')) empPintar(q, fijas[q.dataset.q], '', true);
  });
  if (paso) mostrarPaso(0);
  state.irAPregunta = null;
  restaurarBorrador(document.getElementById('exam-form'));
  window.scrollTo(0, 0);
  // Con avance recuperado, se abre en la pregunta donde se quedó (openspec: autoguardado-todo).
  const q = state.irAPregunta || (document.querySelector('#exam-form.paso') && document.querySelector('#autoguardado-aviso:not(:empty)') ? document.querySelector('#exam-form .q.actual') : null);
  if (q) q.scrollIntoView({ block: 'center' });
  state.irAPregunta = null;
}

// ---------- Autoguardado del avance en este aparato (openspec: examen-autoguardado) ----------
// Un borrador por ámbito + persona (hash corto del correo, no el correo) + elemento + intento, en localStorage.
// Nunca viaja al servidor. Valor: { v: 1, t: <ms>, r: <lo mismo que examAnswers> }.
const BORRADOR = 'stald_borrador:';
const BORRADOR_DIAS = 14;
const BORRADOR_AMBITO = segunModo('profe', 'secundaria', 'ingles');
function hashCorto(s) { // FNV-1a de 32 bits en base 36: separa personas sin dejar el correo en claro
  let h = 0x811c9dc5;
  for (const c of String(s || '').toLowerCase()) { h ^= c.codePointAt(0); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(36);
}
function claveBorrador(id, intento) { return BORRADOR + BORRADOR_AMBITO + ':' + hashCorto(state.email) + ':' + id + ':' + intento; }
function almacenDisponible() {
  try { localStorage.setItem(BORRADOR + 'prueba', '1'); localStorage.removeItem(BORRADOR + 'prueba'); return true; } catch { /* almacenamiento bloqueado o lleno */ return false; }
}
function clavesBorrador() { try { return Object.keys(localStorage).filter(k => k.startsWith(BORRADOR)); } catch (e) { return []; } }
function leerBorrador(k) {
  try { const d = JSON.parse(localStorage.getItem(k) || 'null'); return d && d.r && typeof d.r === 'object' ? d : null; } catch { /* borrador ilegible o sin almacenamiento: se ignora */ return null; }
}
function quitarBorrador(k) { try { if (k) localStorage.removeItem(k); } catch (e) { /* sin almacenamiento */ } }
// Borra los caducados o ilegibles y, con `prefijo`, los de ese elemento salvo `conservar`.
function limpiarBorradores(prefijo, conservar) {
  const limite = Date.now() - BORRADOR_DIAS * 864e5;
  for (const k of clavesBorrador()) {
    const d = leerBorrador(k);
    if (!d || !(d.t > limite) || (prefijo && k.startsWith(prefijo) && k !== conservar)) quitarBorrador(k);
  }
}
// «Cerrar sesión»: también los borradores de misiones de este aparato (su copia sigue en la cuenta; openspec: autoguardado-todo).
function borrarBorradores() {
  clavesBorrador().forEach(quitarBorrador);
  try { Object.keys(localStorage).filter(k => k.startsWith('stald_mis_borrador:')).forEach(quitarBorrador); } catch (e) { /* sin almacenamiento */ }
}
function guardarBorrador(form, answers) {
  const k = form.dataset.borrador;
  if (k) {
    try {
      if (Object.keys(answers).length) localStorage.setItem(k, JSON.stringify({ v: 1, t: Date.now(), r: answers, p: state.paso || 0, s: 0 })); // s: 0 = sin subir
      else localStorage.removeItem(k);
      form.dataset.guardado = String(Date.now());
    } catch (e) { /* sin almacenamiento: queda la copia en la cuenta */ }
  }
  if (form.dataset.cuenta) programarCuenta(form, answers);
  pintarGuardado();
}
// Copia en la cuenta (servidor): 2.5 s después del último cambio, al ocultar la pestaña y al volver la conexión.
const CUENTA_ESPERA_MS = 2500;
function programarCuenta(form, answers) {
  form._respuestas = answers;
  clearTimeout(form._tCuenta);
  form._tCuenta = setTimeout(() => subirCuenta(form), CUENTA_ESPERA_MS);
}
// Una subida a la vez (en orden): si llega otra mientras va una, se repite al terminar con lo más nuevo.
function subirCuenta(form, keepalive) {
  clearTimeout(form._tCuenta); form._tCuenta = null;
  if (form._prom) { form._otraVez = true; return form._prom; }
  form._prom = subirCuentaUna(form, keepalive).finally(() => {
    form._prom = null;
    if (form._otraVez) { form._otraVez = false; if (form._respuestas) subirCuenta(form); }
  });
  return form._prom;
}
async function subirCuentaUna(form, keepalive) {
  if (!form.isConnected || !form._respuestas) return;
  const respuestas = form._respuestas;
  const paso = state.paso || 0; // paso visible: al recargar o en otro aparato se vuelve ahí (openspec: autoguardado-todo)
  form.dataset.subiendo = '1';
  pintarGuardado();
  try {
    const res = await StaldAuth.fetchConSesion(ACT_URL + '/' + encodeURIComponent(form.dataset.id) + '/borrador?email=' + encodeURIComponent(state.email), {
      method: 'PUT', headers: { 'content-type': 'text/plain;charset=UTF-8' }, keepalive: !!keepalive,
      body: JSON.stringify({ intento: Number(form.dataset.intento), respuestas, paso }),
    });
    if (res.ok) {
      form.dataset.enCuenta = String(Date.now()); form.dataset.pasoCuenta = String(paso); delete form.dataset.pendiente;
      if (form._respuestas === respuestas) { form._respuestas = null; marcarSubido(form.dataset.borrador, respuestas); }
    }
    else if (res.status >= 500 || res.status === 429) form.dataset.pendiente = '1'; // pasajero: se reintenta
    else { form._respuestas = null; delete form.dataset.pendiente; if (res.status === 409) form.dataset.cerrado = '1'; } // 4xx: intento cerrado o sin acceso
  } catch { /* sin conexión: queda pendiente y se reintenta */ form.dataset.pendiente = '1'; }
  delete form.dataset.subiendo;
  pintarGuardado();
}
// La copia local ya está en la cuenta (s: 1) si sigue con las mismas respuestas.
function marcarSubido(k, respuestas) {
  const d = leerBorrador(k || '');
  if (!d || JSON.stringify(d.r) !== JSON.stringify(respuestas)) return;
  try { localStorage.setItem(k, JSON.stringify({ ...d, s: 1 })); } catch (e) { /* sin almacenamiento */ }
}
// Cambiar de pregunta (paso) guarda ya, sin esperar los 2.5 s, si hay algo que subir o el paso cambió.
function guardarAlCambiarPaso() {
  const f = document.getElementById('exam-form');
  if (!f || !f.dataset.cuenta || f.dataset.cerrado) return;
  const r = examAnswers(f);
  if (!Object.keys(r).length) return;
  if (!f._respuestas && f.dataset.pasoCuenta === String(state.paso || 0)) return;
  f._respuestas = r;
  guardarBorrador(f, r); // copia local con el paso nuevo
  subirCuenta(f);
}
document.addEventListener('visibilitychange', () => {
  const f = document.getElementById('exam-form');
  if (document.visibilityState === 'hidden' && f && f._respuestas) subirCuenta(f, true);
});
window.addEventListener('online', () => {
  const f = document.getElementById('exam-form');
  if (f && f.dataset.pendiente && f._respuestas) subirCuenta(f);
});
// «hace 5 s», «hace 3 min»… (lo comparten el examen y las misiones de texto).
function haceCuanto(ms) {
  const s = Math.max(0, Math.round((Date.now() - ms) / 1000));
  if (s < 60) return 'hace ' + s + ' s';
  const min = Math.floor(s / 60);
  return min < 60 ? 'hace ' + min + ' min' : 'hace ' + Math.floor(min / 60) + ' h';
}
// Indicador discreto (openspec: autoguardado-todo): «💾 Guardado hace 5 s», «Guardando…» o, si no se pudo subir,
// el aviso con «Reintentar». El avance siempre queda también en este aparato.
function pintarGuardado() {
  const el = document.getElementById('autoguardado'), f = document.getElementById('exam-form');
  if (!el || !f) return;
  if (f.dataset.cerrado) {
    el.innerHTML = '⚠️ Este intento ya se envió desde otro aparato o navegador. Toca «← Volver» y ábrelo otra vez.';
    return;
  }
  if (f.dataset.pendiente && !f.dataset.subiendo) {
    el.innerHTML = '📴 No se pudo guardar en tu cuenta (¿sin internet?). Tu avance sigue en este aparato. ' +
      '<button type="button" class="btn ghost sm" data-action="reintentar-guardado">🔄 Reintentar</button>';
    return;
  }
  if (f.dataset.subiendo || f._tCuenta) { el.textContent = 'Guardando…'; return; }
  const ref = Number(f.dataset.enCuenta || 0);
  if (ref) el.textContent = '💾 Guardado ' + haceCuanto(ref);
}
setInterval(pintarGuardado, 5000);
document.addEventListener('click', e => {
  if (!e.target.closest('[data-action="reintentar-guardado"]')) return;
  const f = document.getElementById('exam-form');
  if (f && f._respuestas) subirCuenta(f);
});
// Aplica el borrador del intento abierto por id de pregunta; ignora ids que ya no están y las fijas de la corrección.
// Entre la copia de este aparato y la de la cuenta gana la más reciente (openspec: borrador-en-servidor).
function restaurarBorrador(form) {
  if (!form) return;
  const local = leerBorrador(form.dataset.borrador || '');
  const cuenta = state.borradorCuenta;
  // Gana la cuenta salvo que este aparato tenga cambios que aún no subió (s: 0): así no depende del reloj del aparato.
  // Una copia de antes de este cambio (sin `s`) gana solo si es más reciente, como antes.
  const localGana = local && (local.s === 0 || (local.s === undefined && cuenta && local.t > Date.parse(cuenta.actualizado)));
  const deCuenta = cuenta && cuenta.respuestas && !localGana;
  const r = deCuenta ? cuenta.respuestas : local && local.r;
  if (!r) return;
  const pasoGuardado = deCuenta ? cuenta.paso : local.p;
  if (deCuenta) { form.dataset.enCuenta = String(Date.parse(cuenta.actualizado) || Date.now()); form.dataset.pasoCuenta = String(cuenta.paso || 0); }
  const qs = new Map(preguntasPorContestar().map(q => [q.dataset.q, q]));
  let n = 0;
  for (const [id, v] of Object.entries(r)) {
    const q = qs.get(id);
    if (!q) continue;
    const radio = [...q.querySelectorAll('input[type=radio]:not(:disabled)')].find(i => i.value === String(v));
    const txt = q.querySelector('input.q-text:not(:disabled)');
    const par = q.querySelector('input.q-par:not(:disabled)');
    if (par) { if (!Array.isArray(v) || !v.some(x => x)) { continue; } empPintar(q, v, '', true); }
    else if (radio) radio.checked = true;
    else if (txt && typeof v === 'string' && v.trim()) {
      txt.value = v;
      if (q.querySelector('[data-ord]')) ordenarDesdeTexto(q, v);
      const o = q.querySelector('.pron-oido');
      if (o) { o.textContent = 'Respuesta recuperada ✔'; o.className = 'pron-oido ok'; }
    } else continue;
    n++;
  }
  if (!n) return;
  updateExamProgress(form);
  document.getElementById('autoguardado-aviso').textContent = '↺ ' + (n === 1 ? 'Recuperamos tu respuesta' : 'Recuperamos tus ' + n + ' respuestas') + '. Sigue donde te quedaste.';
  // Mismo paso que dejó (openspec: autoguardado-todo); sin paso guardado, la primera sin contestar.
  const qs2 = preguntasPorContestar();
  const sinContestar = qs2.findIndex(q => !q.classList.contains('answered'));
  const i = Number.isInteger(pasoGuardado) && pasoGuardado >= 0 && pasoGuardado < qs2.length ? pasoGuardado : (sinContestar < 0 ? qs2.length - 1 : sinContestar);
  if (form.classList.contains('paso')) mostrarPaso(i);
  else { state.paso = i; state.irAPregunta = qs2[i] || null; } // clase por pasos en lista: se desplaza al abrir
}
limpiarBorradores(); // caducados, al cargar la página
// Con el examen abierto: sin «jalar para recargar» (CSS) y confirmación al salir si hay respuestas sin enviar.
new MutationObserver(() => document.documentElement.classList.toggle('examen-abierto', !!document.getElementById('exam-form')))
  .observe(contentEl, { childList: true });
window.addEventListener('beforeunload', e => {
  const f = document.getElementById('exam-form');
  if (!f || !f.dataset.borrador || !Object.keys(examAnswers(f)).length) return;
  e.preventDefault();
  e.returnValue = '';
});

// ---------- Una pregunta por pantalla y atajos de teclado (openspec: ingles-pro) ----------
const preguntasPorContestar = () => [...document.querySelectorAll('#exam-form .q:not(.fija)')];
function mostrarPaso(i) {
  const qs = preguntasPorContestar();
  if (!qs.length) return;
  state.paso = Math.max(0, Math.min(qs.length - 1, i));
  qs.forEach((q, k) => q.classList.toggle('actual', k === state.paso));
  const ant = document.querySelector('[data-action="q-ant"]'), sig = document.querySelector('[data-action="q-sig"]');
  if (ant) ant.disabled = state.paso === 0;
  if (sig) sig.disabled = state.paso === qs.length - 1;
}
function moverPaso(d) {
  mostrarPaso((state.paso || 0) + d);
  guardarAlCambiarPaso();
  const q = preguntasPorContestar()[state.paso];
  if (!q) return;
  const i = q.querySelector('input:not([type=hidden]):not(:disabled)');
  if (i && i.type === 'text') i.focus(); else q.scrollIntoView({ block: 'nearest' });
}
// En lista (clase por pasos en pantalla grande o «Ver todas»), el paso es la pregunta en la que trabaja.
document.addEventListener('focusin', e => {
  const q = e.target.closest && e.target.closest('#exam-form:not(.paso) .q:not(.fija)');
  if (!q) return;
  const i = preguntasPorContestar().indexOf(q);
  if (i < 0 || i === state.paso) return;
  state.paso = i;
  guardarAlCambiarPaso();
});
function verTodas(b) {
  document.getElementById('exam-form').classList.remove('paso');
  b.remove();
}
// Pregunta activa para los atajos: la de la pantalla (modo paso), la que tiene el foco o la primera sin responder.
function preguntaActiva() {
  const f = document.getElementById('exam-form');
  if (f.classList.contains('paso')) return preguntasPorContestar()[state.paso || 0];
  const a = document.activeElement;
  const conFoco = a && a.closest ? a.closest('#exam-form .q:not(.fija)') : null;
  return conFoco || preguntasPorContestar().find(q => !q.classList.contains('answered')) || null;
}
document.addEventListener('keydown', e => {
  const f = document.getElementById('exam-form');
  if (!f || e.ctrlKey || e.metaKey || e.altKey || document.querySelector('.deck')) return;
  const t = e.target;
  const enTexto = !!(t && t.matches && t.matches('input[type=text], textarea'));
  const q = preguntaActiva();
  if (/^[1-9]$/.test(e.key) && !enTexto && q) {
    const r = q.querySelectorAll('input[type=radio]:not(:disabled)')[Number(e.key) - 1];
    if (r) { e.preventDefault(); r.checked = true; r.focus(); r.dispatchEvent(new Event('change', { bubbles: true })); }
    return;
  }
  if (e.key !== 'Enter' || (t && t.closest && t.closest('button, a, summary'))) return;
  e.preventDefault();
  const todas = preguntasPorContestar();
  if (todas.every(x => x.classList.contains('answered')) && !document.getElementById('exam-send').disabled) { f.requestSubmit(); return; }
  if (f.classList.contains('paso')) { moverPaso(1); return; }
  const sig = todas.find(x => !x.classList.contains('answered'));
  if (sig) { sig.scrollIntoView({ block: 'center' }); const i = sig.querySelector('input:not([type=hidden])'); if (i) i.focus(); }
});

// ---------- Voz: modelo (speechSynthesis) y reconocimiento (SpeechRecognition) ----------
function hablar(texto, lento) {
  if (!window.speechSynthesis) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(texto);
  u.lang = 'en-US'; u.rate = lento ? 0.7 : 1;
  const voz = speechSynthesis.getVoices().find(v => /^en[-_]US/i.test(v.lang)) || speechSynthesis.getVoices().find(v => /^en/i.test(v.lang));
  if (voz) u.voice = voz;
  speechSynthesis.speak(u);
}
const Reconocedor = window.SpeechRecognition || window.webkitSpeechRecognition || null;
const CONTRACCIONES = [[/\bcan't\b/g, 'can not'], [/\bcannot\b/g, 'can not'], [/\bwon't\b/g, 'will not'], [/\blet's\b/g, 'let us'], [/\b(it|that|there|he|she|what|where|who)'s\b/g, '$1 is'],
  [/n't\b/g, ' not'], [/'ve\b/g, ' have'], [/'ll\b/g, ' will'], [/'re\b/g, ' are'], [/'m\b/g, ' am'], [/'d\b/g, ' would']];
function palabrasPron(t) {
  t = String(t || '').normalize('NFD').replaceAll(/[̀-ͯ]/g, '').toLowerCase().trim().replaceAll(/[’‘`]/g, "'");
  for (const [re, por] of CONTRACCIONES) t = t.replace(re, por);
  return t.replaceAll(/[^a-z0-9' ]+/g, ' ').replaceAll('\'', '').split(/\s+/).filter(Boolean);
}
function similitudPron(frase, oido) {
  const a = palabrasPron(frase), b = palabrasPron(oido);
  if (!a.length || !b.length) return 0;
  const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
  return dp[a.length][b.length] / a.length;
}
function ponerRespuestaPron(q, valor, texto, ok) {
  const inp = q.querySelector('input.q-text');
  inp.value = valor;
  const o = q.querySelector('.pron-oido');
  o.textContent = texto; o.className = 'pron-oido ' + (ok ? 'ok' : 'mal');
  updateExamProgress(q.closest('#exam-form'));
}
function grabarPron(btn) {
  const q = btn.closest('.q'); const frase = q.dataset.frase;
  if (!Reconocedor) return;
  const r = new Reconocedor();
  r.lang = 'en-US'; r.interimResults = false; r.maxAlternatives = 3;
  btn.classList.add('on'); btn.textContent = '🎙️ Escuchando…';
  r.onresult = ev => {
    const alts = Array.from(ev.results[0] || []).map(x => x.transcript);
    const mejor = alts.sort((x, y) => similitudPron(frase, y) - similitudPron(frase, x))[0] || '';
    const p = Math.round(similitudPron(frase, mejor) * 100);
    ponerRespuestaPron(q, mejor, 'Te escuché: «' + mejor + '» · coincide ' + p + ' % ' + (p >= 80 ? '✔' : '↺ inténtalo otra vez'), p >= 80);
  };
  r.onerror = ev => { const o = q.querySelector('.pron-oido'); o.textContent = ev.error === 'not-allowed' ? 'Permite el micrófono para calificar tu voz.' : 'No te escuché bien; inténtalo otra vez.'; o.className = 'pron-oido mal'; };
  r.onend = () => { btn.classList.remove('on'); btn.textContent = '🎙️ Decirlo otra vez'; };
  r.start();
}

// ---------- Ordenar la oración y unir pares (openspec: ejercicios-ordenar-emparejar) ----------
// Ordenar: cada ficha es un botón; en el banco se agrega al final de la línea y en la línea regresa a su lugar.
// La respuesta (fichas unidas por espacios) vive en un input oculto `q-text`, como la pronunciación.
function bloqueOrdenar(p, fija) {
  const id = escapeHtml(p.id), dis = fija ? ' disabled' : '';
  return '<div class="ord" data-ord>' +
    '<div class="ord-etq" id="ord-l-' + id + '">Tu oración</div>' +
    '<div class="ord-linea" role="group" aria-labelledby="ord-l-' + id + '" data-vacio="Toca las fichas en orden"></div>' +
    '<div class="ord-etq" id="ord-b-' + id + '">Fichas</div>' +
    '<div class="ord-banco" role="group" aria-labelledby="ord-b-' + id + '">' +
    (p.fichas || []).map((f, i) => '<button type="button" class="ficha" data-action="ficha" data-i="' + i + '" aria-label="' + escapeHtml(f) + '. Toca para agregarla"' + dis + '>' + escapeHtml(f) + '</button>').join('') + '</div>' +
    (fija ? '' : '<button type="button" class="btn ghost sm ord-borrar" data-action="ord-borrar">⌫ Borrar</button>') +
    '<input class="q-text" type="hidden" name="' + id + '"' + dis + '>' +
    '<div class="sr-only" aria-live="polite" data-anuncio></div></div>';
}
function devolverFicha(q, b) {
  const banco = q.querySelector('.ord-banco');
  banco.insertBefore(b, [...banco.children].find(x => Number(x.dataset.i) > Number(b.dataset.i)) || null);
}
function ordenarSync(q, anuncio, sinProgreso) {
  const fichas = [...q.querySelectorAll('.ord-linea .ficha')];
  const inp = q.querySelector('input.q-text');
  inp.value = fichas.map(b => b.textContent).join(' ');
  fichas.forEach((b, k) => b.setAttribute('aria-label', b.textContent + ', ficha ' + (k + 1) + ' de tu oración. Toca para quitarla'));
  q.querySelectorAll('.ord-banco .ficha').forEach(b => b.setAttribute('aria-label', b.textContent + '. Toca para agregarla'));
  if (anuncio) q.querySelector('[data-anuncio]').textContent = anuncio + '. Tu oración: ' + (inp.value || 'vacía') + '.';
  const f = q.closest('#exam-form');
  if (f && !sinProgreso && !q.classList.contains('fija')) updateExamProgress(f);
}
function ordenarMover(b) {
  const q = b.closest('.q'), linea = q.querySelector('.ord-linea'), banco = q.querySelector('.ord-banco');
  const deLinea = b.parentElement === linea;
  if (deLinea) devolverFicha(q, b); else linea.appendChild(b);
  ordenarSync(q, (deLinea ? 'Quitaste «' : 'Agregaste «') + b.textContent + '»');
  // El foco sigue en el mismo lado (la siguiente ficha) para no perderse con teclado o lector de pantalla.
  const sig = (deLinea ? linea : banco).querySelector('.ficha') || (deLinea ? banco : linea).querySelector('.ficha');
  if (sig) sig.focus();
}
function ordenarBorrar(btn) {
  const q = btn.closest('.q');
  [...q.querySelectorAll('.ord-linea .ficha')].forEach(b => devolverFicha(q, b));
  ordenarSync(q, 'Borraste tu oración');
  const f = q.querySelector('.ord-banco .ficha'); if (f) f.focus();
}
// Texto → fichas (borrador o corrección): toma la ficha libre más larga que coincida con el inicio del texto.
function ordenarDesdeTexto(q, texto) {
  [...q.querySelectorAll('.ord-linea .ficha')].forEach(b => devolverFicha(q, b));
  const linea = q.querySelector('.ord-linea');
  let resto = String(texto || '').trim();
  while (resto) {
    const libres = [...q.querySelectorAll('.ord-banco .ficha')].sort((a, b) => b.textContent.length - a.textContent.length);
    const f = libres.find(b => resto === b.textContent || resto.startsWith(b.textContent + ' '));
    if (!f) break;
    linea.appendChild(f);
    resto = resto.slice(f.textContent.length).trim();
  }
  ordenarSync(q, '', true);
}

// Unir pares: se toca uno de un lado y luego uno del otro; tocar uno ya unido deshace su par. La respuesta es el
// arreglo con la opción de la derecha elegida para cada elemento de la izquierda ("" = sin unir), en `q-par`.
function bloqueEmparejar(p, fija) {
  const id = escapeHtml(p.id), dis = fija ? ' disabled' : '';
  const boton = (lado, t, i) => '<button type="button" class="emp-btn" data-action="emp" data-lado="' + lado + '"' + (lado === 'izq' ? ' data-i="' + i + '"' : '') +
    ' data-v="' + escapeHtml(t) + '" aria-pressed="false" aria-label="' + escapeHtml(t) + ', sin unir"' + dis + '><span class="emp-num" aria-hidden="true"></span><span class="emp-t">' + escapeHtml(t) + '</span></button>';
  return '<div class="emp" data-emp>' +
    '<div class="emp-col" role="group" aria-label="Columna izquierda">' + (p.izquierda || []).map((t, i) => boton('izq', t, i)).join('') + '</div>' +
    '<div class="emp-col" role="group" aria-label="Columna derecha">' + (p.derecha || []).map(t => boton('der', t)).join('') + '</div>' +
    '<input class="q-par" type="hidden" name="' + id + '"' + dis + '>' +
    '<div class="sr-only" aria-live="polite" data-anuncio></div></div>';
}
function leerPares(valor) {
  try { const r = JSON.parse(valor || '[]'); return Array.isArray(r) ? r.map(x => typeof x === 'string' ? x : '') : []; } catch { /* valor ilegible: sin pares */ return []; }
}
function empPintar(q, r, anuncio, sinProgreso) {
  const izqs = [...q.querySelectorAll('.emp-btn[data-lado="izq"]')], ders = [...q.querySelectorAll('.emp-btn[data-lado="der"]')];
  r = izqs.map((_, i) => (Array.isArray(r) && typeof r[i] === 'string' && ders.some(d => d.dataset.v === r[i])) ? r[i] : '');
  for (const b of [...izqs, ...ders]) {
    b.className = 'emp-btn'; b.querySelector('.emp-num').textContent = '';
    b.setAttribute('aria-label', b.dataset.v + ', sin unir');
  }
  r.forEach((v, i) => {
    if (!v) return;
    const d = ders.find(x => x.dataset.v === v);
    for (const b of [izqs[i], d]) { b.classList.add('unido', 'par-' + (i % 6)); b.querySelector('.emp-num').textContent = String(i + 1); }
    izqs[i].setAttribute('aria-label', izqs[i].dataset.v + ', par ' + (i + 1) + ', unida con ' + v + '. Toca para deshacer');
    d.setAttribute('aria-label', v + ', par ' + (i + 1) + ', unida con ' + izqs[i].dataset.v + '. Toca para deshacer');
  });
  q.querySelector('input.q-par').value = r.some(x => x) ? JSON.stringify(r) : '';
  if (anuncio) q.querySelector('[data-anuncio]').textContent = anuncio;
  const f = q.closest('#exam-form');
  if (f && !sinProgreso && !q.classList.contains('fija')) updateExamProgress(f);
}
function empClick(b) {
  const q = b.closest('.q');
  const izqs = [...q.querySelectorAll('.emp-btn[data-lado="izq"]')];
  const guardados = leerPares(q.querySelector('input.q-par').value);
  const r = izqs.map((_, i) => guardados[i] || '');
  const sel = q.querySelector('.emp-btn[aria-pressed="true"]');
  const marcar = x => { q.querySelectorAll('.emp-btn').forEach(y => y.setAttribute('aria-pressed', String(y === x))); };
  const anunciar = t => { q.querySelector('[data-anuncio]').textContent = t; };
  const i = b.dataset.lado === 'izq' ? Number(b.dataset.i) : r.indexOf(b.dataset.v);
  if (i >= 0 && r[i]) { // ya unido: deshacer
    const antes = r[i]; r[i] = '';
    marcar(null);
    return empPintar(q, r, 'Deshiciste el par ' + izqs[i].dataset.v + ' con ' + antes + '.');
  }
  if (sel === b) { marcar(null); return anunciar('Quitaste la selección.'); }
  if (!sel || sel.dataset.lado === b.dataset.lado) {
    marcar(b);
    return anunciar('Elegiste ' + b.dataset.v + '. Ahora toca su pareja en la otra columna.');
  }
  const izq = b.dataset.lado === 'izq' ? b : sel, der = b.dataset.lado === 'der' ? b : sel;
  r[Number(izq.dataset.i)] = der.dataset.v;
  marcar(null);
  empPintar(q, r, 'Uniste ' + izq.dataset.v + ' con ' + der.dataset.v + '.');
}

function examAnswers(form) {
  const out = {};
  form.querySelectorAll('input[type=radio]:checked:not(:disabled)').forEach(i => { out[i.name] = Number(i.value); });
  form.querySelectorAll('input.q-text:not(:disabled)').forEach(i => { if (i.value.trim()) out[i.name] = i.value; });
  form.querySelectorAll('input.q-par:not(:disabled)').forEach(i => { const r = leerPares(i.value); if (r.some(x => x)) out[i.name] = r; });
  return out;
}

// Respondida = con valor; unir pares, solo con todos los pares hechos (el avance parcial sí se guarda).
const respuestaCompleta = v => !Array.isArray(v) || v.every(x => x);

function updateExamProgress(form) {
  const total = Number(form.dataset.total);
  const answers = examAnswers(form);
  const hechas = new Set(Object.keys(answers).filter(k => respuestaCompleta(answers[k])));
  const count = hechas.size;
  form.querySelectorAll('.q:not(.fija)').forEach(q => q.classList.toggle('answered', hechas.has(q.dataset.q)));
  document.getElementById('exam-count').textContent = count + '/' + total + ' respondidas' + (count < total ? ' · faltan ' + (total - count) : '');
  const barra = document.getElementById('player-barra');
  if (barra) {
    document.getElementById('player-bar').style.width = (total ? Math.round(count * 100 / total) : 0) + '%';
    barra.setAttribute('aria-valuenow', String(count));
    document.getElementById('player-num').textContent = count + '/' + total;
  }
  document.getElementById('exam-send').disabled = count < total;
  guardarBorrador(form, answers);
}

async function submitExam(form) {
  if (!confirm('¿Enviar tus respuestas?')) return;
  const btn = document.getElementById('exam-send');
  btn.disabled = true; btn.textContent = 'Enviando…';
  const id = form.dataset.id;
  // Secundaria: la lista de antes de ESTE envío, para el XP, el nivel y las insignias ganadas (ingles/secundaria-clase.js).
  state.actAntes = claseEnPasos() ? { id, act: state.act } : null;
  const r = await fetchJson(ACT_URL + '/' + encodeURIComponent(id) + '?email=' + encodeURIComponent(state.email), {
    method: 'POST', headers: { 'content-type': 'text/plain;charset=UTF-8' },
    body: JSON.stringify({ intento: Number(form.dataset.intento), respuestas: examAnswers(form) }),
  });
  if (r.ok) {
    quitarBorrador(form.dataset.borrador); // enviado: el borrador ya no hace falta
    clearTimeout(form._tCuenta); form._respuestas = null; // el servidor ya borró la copia de la cuenta
    await loadActividades();
    return showResult(r.body.calificacion, { id, intento: r.body.intento, intentosMax: r.body.intentosMax, restantes: r.body.restantes, mejor: r.body.mejor, vistaPrevia: !r.body.guardado });
  }
  state.actAntes = null; // sin envío no hay recompensa
  btn.disabled = false; btn.textContent = 'Enviar';
  alert('No se pudo enviar (' + (r.body.error || r.status) + '). Intenta de nuevo.');
}

function showResult(calificacion, info) {
  entrarVista('resultado', (info && info.id) || 'resultado');
  const i = info || {};
  const it = ((state.act && state.act.items) || []).find(x => x.id === i.id);
  let head = '📝 Tu resultado';
  if (MODO_SECUNDARIA) head = '🎉 ¡Misión cumplida! · Tu resultado';
  else if (claseEnPasos()) head = '🎉 ¡Listo! · Tu resultado';
  if (i.vistaPrevia) head += ' · vista previa (no se guardó)';
  else if (i.intento) head += ' · intento ' + i.intento + ' de ' + i.intentosMax + (i.mejor ? ' · mejor: ' + i.mejor.porcentaje + '%' : '');
  const corrige = it ? it.tipo !== 'examen' : true;
  const espera = it && it.tipo === 'examen' && it.segundaOportunidad && i.restantes > 0 && !i.vistaPrevia && todayStr() < it.segundaOportunidad;
  // Otro intento: corregir errores (actividades) o reintentar / 2.ª oportunidad (exámenes); no mientras espera.
  const textoReintento = () => {
    if (corrige) return 'Corregir errores';
    return it && it.segundaOportunidad ? '2.ª oportunidad' : 'Reintentar';
  };
  let reintento = '';
  if (!espera && i.restantes > 0) reintento = '<button class="btn" data-action="abrir-item" data-id="' + escapeHtml(i.id) + '">' + textoReintento() + ' (' + i.restantes + ' intento restante)</button>';
  const aviso = espera ? '<div class="aviso-corr" id="aviso-segunda">📅 Tienes una 2.ª oportunidad el ' + escapeHtml(formatFecha(it.segundaOportunidad)) + ' con preguntas nuevas. Estudia el sábado con tu refuerzo; cuenta la mejor de las dos.</div>' : '';
  contentEl.innerHTML = '<div class="exam-card"><h3>' + escapeHtml(head) + '</h3>' + (i.titulo ? '<div class="s">' + escapeHtml(i.titulo) + '</div>' : '') + '</div>' + aviso +
    renderResultado(calificacion, false) +
    (claseEnPasos() && !i.vistaPrevia ? extrasResultadoSecundaria(i.id) : '') +
    '<div class="exam-bar">' + volverBtn() + reintento + '</div>';
  window.scrollTo(0, 0);
}
