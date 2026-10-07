// Inglés · reproductor de actividades y exámenes: preguntas, voz, envío y resultado.
async function loadActividades() {
  try {
    const r = await fetchJson(ACT_URL + '?email=' + encodeURIComponent(state.email));
    state.act = r.ok ? r.body : null;
  } catch (e) { state.act = null; }
}

function volverBtn() { return '<button class="btn ghost" data-action="volver">← Volver</button>'; }

async function openItem(id) {
  entrarVista('actividad', id);
  contentEl.innerHTML = esqueleto();
  const r = await fetchJson(ACT_URL + '/' + encodeURIComponent(id) + '?email=' + encodeURIComponent(state.email));
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
  const pregunta = (p, n, total, fija) => {
    const v = fija ? fijas[p.id] : undefined;
    const dis = fija ? ' disabled' : '';
    const tts = t => '<div class="tts"><button type="button" data-action="tts" data-texto="' + escapeHtml(t) + '">🔊 Escuchar</button><button type="button" data-action="tts" data-lento="1" data-texto="' + escapeHtml(t) + '">🐢 Lento</button></div>';
    const cuerpo = p.tipo === 'pronunciar'
      ? '<div class="pron-frase">' + escapeHtml(p.frase) + '</div>' + tts(p.frase) +
        '<input class="q-text" type="hidden" name="' + escapeHtml(p.id) + '"' + (fija ? ' value="' + escapeHtml(v) + '"' : '') + dis + '>' +
        (fija ? '' : Reconocedor
          ? '<div class="pron-btns"><button type="button" class="rec" data-action="grabar">🎙️ Decirlo</button></div>'
          : '<div class="pron-btns"><button type="button" data-action="auto" data-valor="auto:ok">✔ Me salió bien</button><button type="button" data-action="auto" data-valor="auto:repetir">↺ Necesito repetir</button></div><div class="s" style="font-size:.78rem">Tu navegador no reconoce voz: usa Chrome o Edge para calificarla. Mientras, escucha el modelo, repítelo y autoevalúate.</div>') +
        '<div class="pron-oido">' + (fija ? 'Ya te salió bien ✔' : '') + '</div>'
      : p.tipo === 'escribir'
      ? (p.audio ? tts(p.audio) : '') + '<input class="q-text" type="text" name="' + escapeHtml(p.id) + '" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Escribe tu respuesta"' + (fija ? ' value="' + escapeHtml(v) + '"' : '') + dis + '>'
      : (p.audio ? tts(p.audio) : '') + p.opciones.map((o, i) => '<label><input type="radio" name="' + escapeHtml(p.id) + '" value="' + i + '"' + (fija && v === i ? ' checked' : '') + dis + '> <span>' + escapeHtml(o) + '</span>' + (i < 9 && !fija ? '<span class="tecla" aria-hidden="true">' + (i + 1) + '</span>' : '') + '</label>').join('');
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
  const qs = corr
    ? '<div class="aviso-corr">✏️ Corrección: tus ' + yaBien.length + ' respuestas correctas ya están guardadas. Corrige solo ' + (porCorregir.length === 1 ? 'la que fallaste' : 'las ' + porCorregir.length + ' que fallaste') + '.</div>' +
      conTemas(porCorregir, false) +
      (yaBien.length ? '<details class="section"><summary><div class="section-head"><span><span class="chevron">▶</span>✅ Ya las tenías bien</span><span class="count">' + yaBien.length + '</span></div></summary><div style="padding:8px">' + conTemas(yaBien, true) + '</div></details>' : '')
    : conTemas(it.preguntas, false);
  const info = (it.vistaPrevia ? 'Vista previa (no se guarda)' : (corr ? 'Corrección · intento ' : 'Intento ') + it.intento + ' de ' + it.intentosMax) +
    (it.enfoque && it.enfoque.length ? ' · Enfocado en: ' + it.enfoque.join(', ') : '');
  // En celular, una pregunta por pantalla (openspec: ingles-pro); «Ver todas» vuelve a la lista completa.
  const paso = window.matchMedia('(max-width: 599.98px)').matches && porCorregir.length > 1;
  // Autoguardado (openspec: examen-autoguardado): sin vista previa ni almacenamiento no hay borrador.
  const kb = !it.vistaPrevia && almacenDisponible() ? claveBorrador(it.id, it.intento) : '';
  if (kb) limpiarBorradores(claveBorrador(it.id, ''), kb); // intentos anteriores y caducados
  contentEl.innerHTML =
    '<div class="exam-card"><h3>' + icono(it.tipo) + ' ' + escapeHtml(it.titulo) + '</h3>' +
    '<div class="s" style="font-size:.82rem">' + escapeHtml(info) + '</div>' +
    '<div class="s muted" style="font-size:.76rem;margin-top:4px">⌨️ Atajos: 1–4 eligen la opción · Enter avanza</div>' +
    (it.descripcion ? '<div class="s" style="font-size:.8rem;margin-top:4px">' + escapeHtml(it.descripcion) + '</div>' : '') + '</div>' +
    (it.teoria && it.teoria.length ? '<details class="section"' + (corr ? '' : ' open') + '><summary><div class="section-head"><span><span class="chevron">▶</span>📖 Teoría</span><span class="count">' + it.teoria.length + '</span></div></summary><div style="padding:8px">' + renderTeoria(it.teoria) + '</div></details>' : '') +
    renderTips(it.tips) +
    '<form id="exam-form"' + (paso ? ' class="paso"' : '') + ' data-id="' + escapeHtml(it.id) + '" data-intento="' + it.intento + '" data-total="' + porCorregir.length + '" data-borrador="' + escapeHtml(kb) + '" data-cuenta="' + (it.vistaPrevia ? '' : '1') + '">' +
    '<div class="player-progreso"><div class="barra accent" role="progressbar" aria-label="Avance" aria-valuemin="0" aria-valuemax="' + porCorregir.length + '" aria-valuenow="0" id="player-barra"><span id="player-bar" style="width:0%"></span></div><span class="num" id="player-num">0/' + porCorregir.length + '</span></div>' +
    (kb || !it.vistaPrevia ? '<div class="autoguardado muted" id="autoguardado">Tu avance se guarda en tu cuenta ✔</div><div class="autoguardado-aviso" id="autoguardado-aviso" aria-live="polite"></div>' : '') +
    (paso ? '<button type="button" class="btn ghost sm ver-todas" data-action="ver-todas">📋 Ver todas las preguntas</button>' : '') +
    '<div class="exam-sec" style="font-size:.9rem">✏️ ' + (corr ? 'Ejercicios por corregir' : 'Ejercicios') + '</div>' + qs +
    '<div class="exam-bar">' + volverBtn() + '<span class="paso-nav"><button type="button" class="btn ghost icono" data-action="q-ant" aria-label="Pregunta anterior">←</button><button type="button" class="btn ghost" data-action="q-sig">Siguiente →</button></span>' +
    '<span class="progress-text" id="exam-count" style="margin:0" aria-live="polite">0/' + porCorregir.length + ' respondidas</span>' +
    '<button class="btn" type="submit" id="exam-send" disabled>Enviar</button></div></form>';
  state.paso = 0;
  if (paso) mostrarPaso(0);
  restaurarBorrador(document.getElementById('exam-form'));
  window.scrollTo(0, 0);
}

// ---------- Autoguardado del avance en este aparato (openspec: examen-autoguardado) ----------
// Un borrador por ámbito + persona (hash corto del correo, no el correo) + elemento + intento, en localStorage.
// Nunca viaja al servidor. Valor: { v: 1, t: <ms>, r: <lo mismo que examAnswers> }.
const BORRADOR = 'stald_borrador:';
const BORRADOR_DIAS = 14;
const BORRADOR_AMBITO = MODO_PROFE ? 'profe' : MODO_SECUNDARIA ? 'secundaria' : 'ingles';
function hashCorto(s) { // FNV-1a de 32 bits en base 36: separa personas sin dejar el correo en claro
  let h = 0x811c9dc5;
  for (const c of String(s || '').toLowerCase()) { h ^= c.codePointAt(0); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(36);
}
function claveBorrador(id, intento) { return BORRADOR + BORRADOR_AMBITO + ':' + hashCorto(state.email) + ':' + id + ':' + intento; }
function almacenDisponible() {
  try { localStorage.setItem(BORRADOR + 'prueba', '1'); localStorage.removeItem(BORRADOR + 'prueba'); return true; } catch (e) { return false; }
}
function clavesBorrador() { try { return Object.keys(localStorage).filter(k => k.startsWith(BORRADOR)); } catch (e) { return []; } }
function leerBorrador(k) {
  try { const d = JSON.parse(localStorage.getItem(k) || 'null'); return d && d.r && typeof d.r === 'object' ? d : null; } catch (e) { return null; }
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
function borrarBorradores() { clavesBorrador().forEach(quitarBorrador); } // «Cerrar sesión»
function guardarBorrador(form, answers) {
  const k = form.dataset.borrador;
  if (k) {
    try {
      if (Object.keys(answers).length) localStorage.setItem(k, JSON.stringify({ v: 1, t: Date.now(), r: answers }));
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
async function subirCuenta(form, keepalive) {
  clearTimeout(form._tCuenta); form._tCuenta = null;
  if (!form.isConnected || !form._respuestas) return;
  const respuestas = form._respuestas;
  try {
    const res = await StaldAuth.fetchConSesion(ACT_URL + '/' + encodeURIComponent(form.dataset.id) + '/borrador?email=' + encodeURIComponent(state.email), {
      method: 'PUT', headers: { 'content-type': 'text/plain;charset=UTF-8' }, keepalive: !!keepalive,
      body: JSON.stringify({ intento: Number(form.dataset.intento), respuestas }),
    });
    if (res.ok) { form.dataset.enCuenta = String(Date.now()); delete form.dataset.pendiente; if (form._respuestas === respuestas) form._respuestas = null; }
    else if (res.status >= 500 || res.status === 429) form.dataset.pendiente = '1'; // pasajero: se reintenta
    else form._respuestas = null; // 4xx: intento cerrado o sin acceso, no insistir
  } catch (e) { form.dataset.pendiente = '1'; }
  pintarGuardado();
}
document.addEventListener('visibilitychange', () => {
  const f = document.getElementById('exam-form');
  if (document.visibilityState === 'hidden' && f && f._respuestas) subirCuenta(f, true);
});
window.addEventListener('online', () => {
  const f = document.getElementById('exam-form');
  if (f && f.dataset.pendiente && f._respuestas) subirCuenta(f);
});
function pintarGuardado() {
  const el = document.getElementById('autoguardado'), f = document.getElementById('exam-form');
  if (!el || !f) return;
  const ref = Number(f.dataset.enCuenta || f.dataset.guardado || 0);
  if (!ref) return;
  const min = Math.floor((Date.now() - ref) / 60000);
  const cuando = 'Guardado hace ' + (min < 1 ? 'un momento' : min + ' min');
  el.textContent = f.dataset.pendiente ? '📴 Sin conexión: tu avance está en este aparato y se subirá a tu cuenta al reconectar'
    : f.dataset.enCuenta ? 'Tu avance se guarda en tu cuenta ✔ · ' + cuando
    : 'Guardando en tu cuenta… · ' + cuando + ' en este aparato';
}
setInterval(pintarGuardado, 30000);
// Aplica el borrador del intento abierto por id de pregunta; ignora ids que ya no están y las fijas de la corrección.
// Entre la copia de este aparato y la de la cuenta gana la más reciente (openspec: borrador-en-servidor).
function restaurarBorrador(form) {
  if (!form) return;
  const local = leerBorrador(form.dataset.borrador || '');
  const cuenta = state.borradorCuenta;
  const deCuenta = cuenta && cuenta.respuestas && (!local || Date.parse(cuenta.actualizado) > local.t);
  const r = deCuenta ? cuenta.respuestas : local && local.r;
  if (!r) return;
  if (deCuenta) form.dataset.enCuenta = String(Date.parse(cuenta.actualizado) || Date.now());
  const qs = new Map(preguntasPorContestar().map(q => [q.dataset.q, q]));
  let n = 0;
  for (const [id, v] of Object.entries(r)) {
    const q = qs.get(id);
    if (!q) continue;
    const radio = [...q.querySelectorAll('input[type=radio]:not(:disabled)')].find(i => i.value === String(v));
    const txt = q.querySelector('input.q-text:not(:disabled)');
    if (radio) radio.checked = true;
    else if (txt && typeof v === 'string' && v.trim()) {
      txt.value = v;
      const o = q.querySelector('.pron-oido');
      if (o) { o.textContent = 'Respuesta recuperada ✔'; o.className = 'pron-oido ok'; }
    } else continue;
    n++;
  }
  if (!n) return;
  updateExamProgress(form);
  document.getElementById('autoguardado-aviso').textContent = '↺ ' + (n === 1 ? 'Recuperamos tu respuesta' : 'Recuperamos tus ' + n + ' respuestas') + '. Sigue donde te quedaste.';
  if (form.classList.contains('paso')) {
    const i = preguntasPorContestar().findIndex(q => !q.classList.contains('answered'));
    mostrarPaso(i < 0 ? preguntasPorContestar().length - 1 : i);
  }
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
  const q = preguntasPorContestar()[state.paso];
  if (!q) return;
  const i = q.querySelector('input:not([type=hidden]):not(:disabled)');
  if (i && i.type === 'text') i.focus(); else q.scrollIntoView({ block: 'nearest' });
}
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
  t = String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/[’‘`]/g, "'");
  for (const [re, por] of CONTRACCIONES) t = t.replace(re, por);
  return t.replace(/[^a-z0-9' ]+/g, ' ').replace(/'/g, '').split(/\s+/).filter(Boolean);
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

function examAnswers(form) {
  const out = {};
  form.querySelectorAll('input[type=radio]:checked:not(:disabled)').forEach(i => { out[i.name] = Number(i.value); });
  form.querySelectorAll('input.q-text:not(:disabled)').forEach(i => { if (i.value.trim()) out[i.name] = i.value; });
  return out;
}

function updateExamProgress(form) {
  const total = Number(form.dataset.total);
  const answers = examAnswers(form);
  const count = Object.keys(answers).length;
  form.querySelectorAll('.q:not(.fija)').forEach(q => q.classList.toggle('answered', q.dataset.q in answers));
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
  btn.disabled = false; btn.textContent = 'Enviar';
  alert('No se pudo enviar (' + (r.body.error || r.status) + '). Intenta de nuevo.');
}

function showResult(calificacion, info) {
  entrarVista('resultado', (info && info.id) || 'resultado');
  const i = info || {};
  const it = ((state.act && state.act.items) || []).find(x => x.id === i.id);
  let head = '📝 Tu resultado';
  if (i.vistaPrevia) head += ' · vista previa (no se guardó)';
  else if (i.intento) head += ' · intento ' + i.intento + ' de ' + i.intentosMax + (i.mejor ? ' · mejor: ' + i.mejor.porcentaje + '%' : '');
  const corrige = it ? it.tipo !== 'examen' : true;
  const espera = it && it.tipo === 'examen' && it.segundaOportunidad && i.restantes > 0 && !i.vistaPrevia && todayStr() < it.segundaOportunidad;
  const reintento = espera ? '' : i.restantes > 0 ? '<button class="btn" data-action="abrir-item" data-id="' + escapeHtml(i.id) + '">' + (corrige ? 'Corregir errores' : (it && it.segundaOportunidad ? '2.ª oportunidad' : 'Reintentar')) + ' (' + i.restantes + ' intento restante)</button>' : '';
  const aviso = espera ? '<div class="aviso-corr" id="aviso-segunda">📅 Tienes una 2.ª oportunidad el ' + escapeHtml(formatFecha(it.segundaOportunidad)) + ' con preguntas nuevas. Estudia el sábado con tu refuerzo; cuenta la mejor de las dos.</div>' : '';
  contentEl.innerHTML = '<div class="exam-card"><h3>' + escapeHtml(head) + '</h3>' + (i.titulo ? '<div class="s">' + escapeHtml(i.titulo) + '</div>' : '') + '</div>' + aviso +
    renderResultado(calificacion, false) +
    '<div class="exam-bar">' + volverBtn() + reintento + '</div>';
  window.scrollTo(0, 0);
}
