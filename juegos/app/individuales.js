// Juegos · juegos individuales (openspec: organizar-codigo).
// Marco común (marco, reloj, terminar), motor quiz y los juegos de Inglés, Español, Cultura y Mente ágil.
// Script clásico (sin build ni módulos ES): juegos.html lo carga en orden y todos comparten el ámbito global
// (const/let/function de nivel superior). Ver docs/frontend-standards.md, «Estructura de juegos/app/».
// ---------- Marco común y resultado ----------
// extra.menu: pantalla de elegir nivel o modo (aún no hay partida que guardar ni avisar).
function marco(id, extra) {
  const j = juegoPorId(id);
  enCurso = extra && extra.menu ? null : { id }; modoPartida(true);
  const tone = (CATEGORIAS.find(c => c.id === j.cat) || {}).clase || '';
  app.innerHTML = '<div class="' + tone + '"><div class="play-top"><button class="btn ghost sm" data-a="salir" aria-label="Salir">✕</button><span class="t">' + j.emoji + ' ' + escapeHtml(j.t) + '</span>' +
    '<span class="stat" id="m-tiempo" hidden></span><span class="stat" id="m-vidas" hidden></span><span class="stat" id="m-puntos">⭐ 0</span></div>' +
    '<div class="bar" id="m-bar" hidden><span style="width:100%"></span></div><div id="m-body"></div></div>';
  const $ = s => document.getElementById(s);
  return {
    body: $('m-body'),
    puntos: n => { $('m-puntos').textContent = '⭐ ' + fmt(n); },
    vidas: n => { const e = $('m-vidas'); e.hidden = false; e.textContent = '❤️'.repeat(Math.max(0, n)) + '🖤'.repeat(Math.max(0, (extra && extra.vidas || 3) - n)); },
    tiempo: (s, total) => {
      const e = $('m-tiempo'); e.hidden = false; e.textContent = '⏱ ' + Math.max(0, Math.ceil(s)); e.classList.toggle('warn', s <= 10);
      if (total) { $('m-bar').hidden = false; $('m-bar').firstChild.style.width = Math.max(0, s / total * 100) + '%'; }
    },
  };
}

// Cuenta regresiva; devuelve la función para detenerla.
// Las pruebas E2E pueden acelerar los relojes con window.__TIEMPO_JUEGOS (p. ej. 0.1); para quien juega vale 1.
const TIEMPO = Number(window.__TIEMPO_JUEGOS) || 1;
function reloj(segundos, onTick, onFin) {
  const fin = Date.now() + segundos * 1000 * TIEMPO;
  const t = setInterval(() => {
    const quedan = (fin - Date.now()) / 1000 / TIEMPO;
    onTick(quedan);
    if (quedan <= 0) { clearInterval(t); onFin(); }
  }, 200);
  onTick(segundos);
  const stop = () => clearInterval(t);
  limpiezas.push(stop);
  return stop;
}

async function terminar(id, r) {
  limpiar();
  const j = juegoPorId(id);
  app.innerHTML = '<div class="card result"><div class="loading">Guardando tus puntos…</div></div>';
  const puntos = Math.max(0, Math.round(r.puntos));
  let s = null;
  try {
    const res = await post('/juegos/partida', { juego: id, puntos, aciertos: r.aciertos || 0, total: r.total || 0, segundos: Math.round(r.segundos || 0) });
    s = res.ok ? res.body : { error: res.body.error || res.status };
  } catch (e) { s = { error: e.message }; }
  if (s && s.guardado) {
    state.totalIndividual = s.totalIndividual; state.totalPartidas = s.totalPartidas; state.pos = s.pos; state.mejores[id] = s.mejor; pintarChip();
  }
  app.innerHTML = '<div class="card result"><div style="font-size:2.4rem">' + j.emoji + '</div><h1>' + escapeHtml(r.titulo || '¡Terminaste!') + '</h1>' +
    '<div class="score">' + fmt(s && s.guardado ? s.puntos : puntos) + '</div><div class="muted">puntos</div>' +
    (s && s.nuevoRecord ? '<div class="record">🏅 ¡Nuevo récord personal!</div>' : '') +
    '<div class="pills">' + (r.total ? '<span class="stat">✅ ' + r.aciertos + ' de ' + r.total + '</span>' : '') +
    (s && s.guardado ? '<span class="stat">➕ ' + fmt(s.puntos) + ' a tus individuales</span><span class="stat">⭐ ' + fmt(s.totalIndividual) + ' en la semana</span>' + (s.pos ? '<span class="stat">🏆 #' + s.pos + ' de la semana</span>' : '') : '') + '</div>' +
    (r.detalle ? '<div class="muted" style="margin-top:12px">' + r.detalle + '</div>' : '') +
    (s && s.guardado ? '' : '<div class="alert">No se guardaron tus puntos (' + escapeHtml(s && s.error) + '). ' + (s && s.error === 'limite_diario' ? 'Llegaste al límite de partidas de hoy.' : 'Revisa tu conexión.') + '</div>') +
    '<div class="row-btns"><button class="btn ghost" data-a="hub">🎮 Otros juegos</button><button class="btn" data-juego="' + id + '">🔁 Jugar otra vez</button></div></div>';
  if (s && s.nuevoRecord) confeti();
}

function confeti() {
  const b = document.createElement('div'); b.className = 'burst';
  b.innerHTML = Array.from({ length: 24 }, () => '<span style="left:' + Math.random() * 100 + '%;animation-delay:' + Math.random() * .6 + 's">' + ['🎉', '⭐', '✨', '🏅'][Math.floor(Math.random() * 4)] + '</span>').join('');
  document.body.appendChild(b); setTimeout(() => b.remove(), 2600);
}

// ---------- Motor quiz (opción múltiple) ----------
// opts: id, modo 'reloj' | 'vidas', segundos (reloj), porPregunta (vidas), siguiente() → { big, q, sub, opciones, correcta, explicacion } | null
// opts.foto: datos extra de la instantánea (p. ej. la categoría del maratón). Se reanuda con contadores, vidas y
// segundos que quedaban; la pregunta siguiente se genera de nuevo (openspec: juegos-recarga).
function quiz(opts) {
  const previo = tomarReanudacion(opts.id);
  const m = marco(opts.id, { vidas: 3 });
  const seg = opts.segundos || 60;
  let puntos = 0, aciertos = 0, total = 0, racha = 0, vidas = 3, actual = null, bloqueado = false, inicioQ = 0, stopQ = null, terminado = false, quedan = seg;
  if (previo) {
    puntos = numEntre(previo.puntos, 1e6); aciertos = numEntre(previo.aciertos, 1e4); total = Math.max(aciertos, numEntre(previo.total, 1e4)); racha = numEntre(previo.racha, 1e4);
    vidas = Math.max(1, numEntre(previo.vidas, 3)); if (previo.quedan > 0) quedan = Math.min(seg, Number(previo.quedan));
    m.puntos(puntos);
  }
  const t0 = Date.now() - (previo ? numEntre(previo.segundos, 86400) * 1000 : 0);
  enCurso.foto = () => terminado || vidas <= 0 ? null : Object.assign({ puntos, aciertos, total, racha, vidas, quedan: opts.modo === 'vidas' ? null : quedan, segundos: (Date.now() - t0) / 1000 }, opts.foto);
  const acabar = (titulo) => {
    if (terminado) return; terminado = true;
    terminar(opts.id, { puntos, aciertos, total, segundos: (Date.now() - t0) / 1000, titulo, detalle: opts.detalle ? opts.detalle({ aciertos, total }) : '' });
  };
  if (opts.modo === 'vidas') m.vidas(vidas);
  else reloj(quedan, s => { quedan = s; m.tiempo(s, seg); }, () => acabar('⏰ ¡Se acabó el tiempo!'));
  function pintar() {
    actual = opts.siguiente(total);
    if (!actual) return acabar(opts.modo === 'vidas' ? '🏁 ¡Llegaste a la meta!' : '¡Terminaste!');
    bloqueado = false; inicioQ = Date.now();
    const opciones = actual.opciones;
    m.body.innerHTML = '<div class="q-card">' + (actual.big ? '<div class="big">' + escapeHtml(actual.big) + '</div>' : '') +
      '<div class="q">' + escapeHtml(actual.q) + '</div>' + (actual.sub ? '<div class="sub">' + escapeHtml(actual.sub) + '</div>' : '') + '</div>' +
      '<div class="opts' + (opciones.some(o => String(o).length > 18) ? ' una-col' : '') + '">' +
      opciones.map((o, i) => '<button class="opt" data-opt="' + i + '"><span class="k">' + (i + 1) + '</span>' + escapeHtml(o) + '</button>').join('') + '</div>' +
      '<div class="feedback" id="fb"></div><div class="kbd-hint">Tip: usa las teclas 1–' + opciones.length + '</div>';
    if (opts.modo === 'vidas') {
      if (stopQ) stopQ();
      const seg = opts.porPregunta || 15;
      stopQ = reloj(seg, s => m.tiempo(s, seg), () => responder(-1));
    }
  }
  function responder(i) {
    if (bloqueado || terminado) return;
    bloqueado = true; total++;
    if (stopQ && opts.modo === 'vidas') stopQ();
    const btns = m.body.querySelectorAll('.opt');
    const bien = i === actual.correcta;
    if (opts.alResponder) opts.alResponder(actual, bien); // p. ej. contar fallos por tipo (openspec: juegos-ingles-gramatica)
    const fb = document.getElementById('fb');
    if (btns[actual.correcta]) btns[actual.correcta].classList.add('ok');
    if (bien) {
      aciertos++; racha++;
      const rapidez = opts.modo === 'vidas' ? Math.max(0, Math.round(((opts.porPregunta || 15) * 1000 - (Date.now() - inicioQ)) / 100)) : 0;
      const gana = 100 + Math.min(racha - 1, 10) * 10 + rapidez;
      puntos += gana; m.puntos(puntos); sonidoOk();
      fb.className = 'feedback ok'; fb.textContent = '✔ +' + gana + (racha > 2 ? ' · racha ×' + racha + ' 🔥' : '');
      if (opts.datoAlAcertar && actual.explicacion) { const x = document.createElement('div'); x.className = 'quiz-dato'; x.textContent = actual.explicacion; fb.appendChild(x); } // cultura-conocimiento
    } else {
      racha = 0; sonidoMal();
      if (i >= 0 && btns[i]) btns[i].classList.add('bad');
      fb.className = 'feedback bad'; fb.textContent = (i < 0 ? '⏰ ¡Tiempo! ' : '✘ ') + (actual.explicacion || ('Era: ' + actual.opciones[actual.correcta]));
      if (opts.modo === 'vidas') { vidas--; m.vidas(vidas); if (vidas <= 0) { guardarPartida(); return setTimeout(() => acabar('💔 ¡Sin vidas!'), 1400); } }
    }
    guardarPartida();
    setTimeout(() => { if (!terminado) pintar(); }, bien ? (opts.datoAlAcertar ? 1600 : 550) : 1400);
  }
  const onKey = e => { const n = Number(e.key); if (n >= 1 && n <= (actual ? actual.opciones.length : 0)) responder(n - 1); };
  document.addEventListener('keydown', onKey);
  limpiezas.push(() => document.removeEventListener('keydown', onKey));
  m.body.addEventListener('click', e => { const b = e.target.closest('[data-opt]'); if (b) responder(Number(b.dataset.opt)); });
  pintar();
}

// Mezcla opciones y devuelve la pregunta con el índice correcto recalculado.
function conOpciones(base, correcta, distractores, rnd = Math.random) {
  const opciones = barajar([correcta, ...distractores], rnd);
  return Object.assign(base, { opciones, correcta: opciones.indexOf(correcta) });
}

// ---------- Juegos de Inglés ----------
async function jugarVocab() {
  const d = await datos('ingles');
  const pool = barajar(d.vocabulario);
  let i = 0;
  quiz({
    id: 'en-vocab', modo: 'reloj', segundos: 60,
    siguiente: () => {
      const w = pool[i++ % pool.length];
      const mismos = d.vocabulario.filter(x => x.en !== w.en && x.tema === w.tema);
      const otros = d.vocabulario.filter(x => x.en !== w.en && x.tema !== w.tema);
      const dis = tomar(mismos, 2).concat(tomar(otros, 3)).map(x => x.en).filter((v, k, a) => a.indexOf(v) === k).slice(0, 3);
      return conOpciones({ big: w.emoji, q: w.es, sub: '¿Cómo se dice en inglés?', explicacion: w.es + ' = ' + w.en }, w.en, dis);
    },
  });
}

// Completa y responde (openspec: juegos-fusion) con selector de tema, y ⏳ Máquina del tiempo: viven en
// juegos/ingles-gramatica.js (openspec: juegos-ingles-gramatica).

async function jugarSpelling() {
  const d = await datos('ingles');
  const usadas = new Set(); const lista = [];
  for (const nv of [1, 1, 1, 2, 2, 2, 2, 3, 3, 3]) { const w = barajar(d.spelling.filter(s => s.nivel === nv && !usadas.has(s.en)))[0]; if (w) { usadas.add(w.en); lista.push(w); } }
  const m = marco('en-spelling');
  let i = 0, puntos = 0, aciertos = 0, pista = false;
  const t0 = Date.now();
  const voz = !!window.speechSynthesis;
  function pintar() {
    if (i >= lista.length) return terminar('en-spelling', { puntos, aciertos, total: lista.length, segundos: (Date.now() - t0) / 1000, titulo: '🐝 ¡Spelling bee terminado!' });
    const w = lista[i]; pista = false;
    m.body.innerHTML = '<div class="q-card"><div class="big">🐝</div><div class="q">Palabra ' + (i + 1) + ' de ' + lista.length + '</div>' +
      '<div class="sub" id="sp-pista">' + (voz ? 'Escucha y escríbela en inglés' : 'Tu navegador no tiene voz: usa la pista 💡') + '</div></div>' +
      '<div class="row-btns" style="margin-top:0"><button class="btn ghost" data-sp="oir">🔊 Escuchar</button><button class="btn ghost" data-sp="lento">🐢 Lento</button><button class="btn ghost" data-sp="pista">💡 Pista</button></div>' +
      '<form id="sp-form" autocomplete="off"><label for="sp-in">Escribe la palabra</label><input id="sp-in" type="text" autocapitalize="off" spellcheck="false" autocomplete="off">' +
      '<div class="row-btns"><button class="btn" type="submit">Revisar</button></div></form><div class="feedback" id="fb"></div>';
    document.getElementById('sp-in').focus();
    if (voz) setTimeout(() => hablar(w.en), 250);
    else darPista();
  }
  function darPista() {
    const w = lista[i]; pista = true;
    document.getElementById('sp-pista').textContent = '💡 ' + w.es + ' · empieza con «' + w.en[0] + '» · ' + w.en.length + ' letras';
  }
  m.body.addEventListener('click', e => {
    const b = e.target.closest('[data-sp]'); if (!b) return;
    if (b.dataset.sp === 'oir') hablar(lista[i].en);
    if (b.dataset.sp === 'lento') hablar(lista[i].en, 'en-US', .55);
    if (b.dataset.sp === 'pista') darPista();
  });
  m.body.addEventListener('submit', e => {
    e.preventDefault();
    const w = lista[i]; const v = document.getElementById('sp-in').value.trim();
    if (!v) return;
    const fb = document.getElementById('fb');
    if (v.toLowerCase() === w.en.toLowerCase()) {
      const gana = pista ? 75 : 150; puntos += gana; aciertos++; m.puntos(puntos); sonidoOk();
      fb.className = 'feedback ok'; fb.textContent = '✔ ¡Perfecto! +' + gana;
    } else {
      sonidoMal(); fb.className = 'feedback bad'; fb.textContent = '✘ Se escribe: ' + w.en + ' (' + w.es + ')';
    }
    document.querySelector('#sp-form button').disabled = true;
    i++; setTimeout(pintar, 1300);
  });
  pintar();
}

async function jugarMemorama() {
  const d = await datos('ingles');
  const pares = tomar(d.vocabulario, 8);
  const cartas = barajar(pares.flatMap((p, k) => [{ k, lado: 'en', txt: p.en }, { k, lado: 'es', txt: p.es, em: p.emoji }]));
  const m = marco('en-memorama');
  let abiertas = [], encontrados = 0, movs = 0, bloqueado = false;
  const t0 = Date.now();
  m.body.innerHTML = '<p class="muted" style="text-align:center;margin-top:0">Une cada palabra en inglés con su significado.</p><div class="memo">' +
    cartas.map((c, i) => '<button data-memo="' + i + '" aria-label="Carta ' + (i + 1) + '">' + (c.em ? '<span class="em">' + escapeHtml(c.em) + '</span>' : '') + escapeHtml(c.txt) + '</button>').join('') + '</div>';
  const btns = [...m.body.querySelectorAll('[data-memo]')];
  m.body.addEventListener('click', e => {
    const b = e.target.closest('[data-memo]'); if (!b || bloqueado || b.classList.contains('up') || b.classList.contains('done')) return;
    b.classList.add('up'); abiertas.push(Number(b.dataset.memo));
    if (abiertas.length < 2) return;
    movs++;
    const [a, c] = abiertas.map(x => cartas[x]);
    if (a.k === c.k && a.lado !== c.lado) {
      abiertas.forEach(x => btns[x].classList.add('done')); abiertas = []; encontrados++; sonidoOk();
      if (encontrados === pares.length) {
        const seg = (Date.now() - t0) / 1000;
        const puntos = Math.max(100, 1000 - Math.max(0, movs - pares.length) * 25 - Math.round(seg) * 2);
        m.puntos(puntos);
        setTimeout(() => terminar('en-memorama', { puntos, aciertos: pares.length, total: pares.length, segundos: seg, titulo: '🃏 ¡Memorama completo!', detalle: movs + ' movimientos en ' + Math.round(seg) + ' s' }), 600);
      }
    } else {
      bloqueado = true; sonidoMal();
      setTimeout(() => { abiertas.forEach(x => btns[x].classList.remove('up')); abiertas = []; bloqueado = false; }, 900);
    }
  });
}

// tema (solo inglés): id del selector de juegos/ingles-gramatica.js; cada oración trae su regla de orden.
async function jugarOrdena(idioma, tema) {
  const id = idioma === 'en' ? 'en-ordena' : 'es-ordena';
  const fuente = idioma === 'en' ? InglesGramatica.filtrar((await datos('ingles')).oraciones, tema).map(o => ({ txt: o.en, pista: o.es, regla: InglesGramatica.reglaOrden(o.tema) })) : (await datos('espanol')).oraciones.map(o => ({ txt: o, pista: '' }));
  const lista = tomar(fuente, 6);
  const m = marco(id);
  let i = 0, puntos = 0, aciertos = 0, intento = 1, puestas = [], quedan = [];
  const t0 = Date.now();
  function pintar() {
    if (i >= lista.length) return terminar(id, { puntos, aciertos, total: lista.length, segundos: (Date.now() - t0) / 1000, titulo: '🔀 ¡Listo!', detalle: idioma === 'en' ? 'Tema: <b>' + escapeHtml(InglesGramatica.nombreTema(tema)) + '</b>' : '' });
    const o = lista[i]; intento = 1; puestas = [];
    const palabras = o.txt.split(/\s+/);
    do { quedan = barajar(palabras.map((w, k) => ({ w, k }))); } while (palabras.length > 1 && quedan.map(x => x.w).join(' ') === o.txt);
    dibujar();
  }
  function dibujar() {
    const o = lista[i];
    m.body.innerHTML = '<div class="q-card"><div class="q">Oración ' + (i + 1) + ' de ' + lista.length + '</div>' + (o.pista ? '<div class="sub">💬 ' + escapeHtml(o.pista) + '</div>' : '<div class="sub">Toca las palabras en orden</div>') + '</div>' +
      '<div class="slots" id="slots">' + puestas.map((x, j) => '<button class="word" data-quitar="' + j + '">' + escapeHtml(x.w) + '</button>').join('') + '</div>' +
      '<div class="chips">' + quedan.map((x, j) => '<button class="word" data-poner="' + j + '">' + escapeHtml(x.w) + '</button>').join('') + '</div>' +
      '<div class="row-btns"><button class="btn ghost" data-ord="borrar">↺ Borrar</button><button class="btn" data-ord="revisar"' + (quedan.length ? ' disabled' : '') + '>Revisar</button></div><div class="feedback" id="fb"></div>';
  }
  m.body.addEventListener('click', e => {
    const p = e.target.closest('[data-poner]'), q = e.target.closest('[data-quitar]'), b = e.target.closest('[data-ord]');
    if (p) { puestas.push(quedan.splice(Number(p.dataset.poner), 1)[0]); dibujar(); }
    if (q) { quedan.push(puestas.splice(Number(q.dataset.quitar), 1)[0]); dibujar(); }
    if (b && b.dataset.ord === 'borrar') { quedan = quedan.concat(puestas); puestas = []; dibujar(); }
    if (b && b.dataset.ord === 'revisar') {
      const o = lista[i]; const fb = document.getElementById('fb');
      if (puestas.map(x => x.w).join(' ') === o.txt) {
        const gana = intento === 1 ? 150 : 75; puntos += gana; aciertos++; m.puntos(puntos); sonidoOk();
        fb.className = 'feedback ok'; fb.textContent = '✔ ¡Correcto! +' + gana; b.disabled = true;
        i++; setTimeout(pintar, 900);
      } else if (intento === 1) {
        intento = 2; sonidoMal(); fb.className = 'feedback bad'; fb.textContent = '✘ Casi. ' + (o.regla ? '📌 ' + o.regla + ' ' : '') + 'Inténtalo otra vez (último intento).';
      } else {
        sonidoMal(); fb.className = 'feedback bad'; fb.textContent = '✘ Era: ' + o.txt + (o.regla ? ' · 📌 ' + o.regla : ''); b.disabled = true;
        i++; setTimeout(pintar, 1800);
      }
    }
  });
  pintar();
}

// ---------- Juegos de Español ----------
// Ortografía (openspec: juegos-fusion): letras, acentos, sinónimos y antónimos mezclados.
const preguntaOrto = (f, tipo, rnd) => { const op = barajar(f.opciones.map((o, k) => ({ o, k })), rnd); return { big: tipo === 'acentos' ? 'á' : '✍️', q: f.frase, sub: f.regla ? 'Regla: ' + f.regla : '', opciones: op.map(x => x.o), correcta: op.findIndex(x => x.k === f.correcta), explicacion: f.explicacion }; };
const preguntaSinonimo = (f, rnd) => conOpciones({ big: f.tipo === 'sinónimo' ? '🟰' : '↔️', q: '«' + f.palabra + '»', sub: 'Elige el ' + f.tipo, explicacion: f.tipo + ' de «' + f.palabra + '»: ' + f.respuesta }, f.respuesta, f.distractores, rnd);
const poolSinonimos = d => d.sinonimos.map(x => Object.assign({ tipo: 'sinónimo' }, x)).concat(d.antonimos.map(x => Object.assign({ tipo: 'antónimo' }, x)));
async function jugarOrtografia() {
  const d = await datos('espanol');
  const mezcla = barajar(d.ortografia.map(f => ({ t: 'ortografia', f })).concat(d.acentos.map(f => ({ t: 'acentos', f })), poolSinonimos(d).map(f => ({ t: 'sin', f }))));
  quiz({
    id: 'es-ortografia', modo: 'reloj', segundos: 90,
    siguiente: n => { const x = mezcla[n % mezcla.length]; return x.t === 'sin' ? preguntaSinonimo(x.f) : preguntaOrto(x.f, x.t); },
  });
}

// ---------- Maratón de cultura ----------
async function elegirCultura() {
  const d = await datos('cultura');
  marco('cultura', { menu: true });
  const m = document.getElementById('m-body');
  m.innerHTML = '<div class="q-card"><div class="big">🏃</div><div class="q">Elige tu maratón</div><div class="sub">3 vidas · 15 segundos por pregunta · sube de nivel</div></div>' +
    '<div class="opts">' + [{ id: 'todas', titulo: 'Todas mezcladas', emoji: '🌈' }].concat(d.categorias).map(c =>
      '<button class="opt" data-cat="' + escapeHtml(c.id) + '">' + escapeHtml(c.emoji) + ' ' + escapeHtml(c.titulo) + '</button>').join('') + '</div>';
  m.addEventListener('click', e => { const b = e.target.closest('[data-cat]'); if (b) jugarCultura(d, b.dataset.cat); }, { once: false });
}

function jugarCultura(d, cat) {
  const del = d.preguntas.filter(p => cat === 'todas' || p.cat === cat);
  const orden = [].concat(barajar(del.filter(p => p.nivel === 1)).slice(0, 10), barajar(del.filter(p => p.nivel === 2)).slice(0, 12), barajar(del.filter(p => p.nivel === 3)));
  const nombreCat = cat === 'todas' ? 'Todas' : (d.categorias.find(c => c.id === cat) || {}).titulo;
  quiz({
    id: 'cultura', modo: 'vidas', porPregunta: 15, foto: { cat }, datoAlAcertar: true, // cultura-conocimiento: el dato también al acertar
    detalle: r => 'Maratón: ' + escapeHtml(nombreCat) + ' · llegaste a la pregunta ' + r.total,
    siguiente: n => {
      const p = orden[n]; if (!p) return null;
      const niv = ['', 'Nivel fácil', 'Nivel medio', 'Nivel difícil'][p.nivel];
      return { q: p.pregunta, sub: niv + ' · ' + (d.categorias.find(c => c.id === p.cat) || {}).titulo, opciones: p.opciones, correcta: p.correcta, explicacion: '💡 ' + p.dato };
    },
  });
}

// ---------- Mente ágil ----------
// Operación n (la dificultad sube con n). `aleatorio` permite semilla en partidas.
function genCalculo(n, aleatorio = Math.random) {
  const rnd = (a, b) => a + Math.floor(aleatorio() * (b - a + 1));
  const nivel = Math.min(4, Math.floor(n / 5));
  const ops = nivel < 1 ? ['+', '−'] : nivel < 2 ? ['+', '−', '×'] : ['+', '−', '×', '÷'];
  const op = ops[rnd(0, ops.length - 1)];
  let a, b, r;
  const max = [10, 20, 50, 100, 200][nivel];
  if (op === '+') { a = rnd(1, max); b = rnd(1, max); r = a + b; }
  if (op === '−') { a = rnd(2, max); b = rnd(1, a); r = a - b; }
  if (op === '×') { a = rnd(2, nivel < 3 ? 10 : 15); b = rnd(2, 10); r = a * b; }
  if (op === '÷') { b = rnd(2, 10); r = rnd(2, 12); a = b * r; }
  const dis = new Set();
  while (dis.size < 3) { const x = r + [1, -1, 2, -2, 10, -10, 5][rnd(0, 6)]; if (x !== r && x >= 0) dis.add(x); }
  return conOpciones({ big: '🧮', q: a + ' ' + op + ' ' + b + ' = ?', explicacion: a + ' ' + op + ' ' + b + ' = ' + r }, String(r), [...dis].map(String), aleatorio);
}
// Cálculo y secuencias (openspec: juegos-fusion): cada tercera pregunta es una secuencia.
function jugarCalculo() {
  quiz({ id: 'mente-calculo', modo: 'reloj', segundos: 75, siguiente: n => n % 3 === 2 ? genSecuencia(Math.floor(n / 3)) : genCalculo(n) });
}

function genSecuencia(n, aleatorio = Math.random) {
  const rnd = (a, b) => a + Math.floor(aleatorio() * (b - a + 1));
  const tipos = [
    () => { const a = rnd(1, 20), k = rnd(2, 9); return { s: [0, 1, 2, 3].map(i => a + k * i), r: a + 4 * k, regla: 'sumar ' + k }; },
    () => { const a = rnd(60, 99), k = rnd(2, 9); return { s: [0, 1, 2, 3].map(i => a - k * i), r: a - 4 * k, regla: 'restar ' + k }; },
    () => { const a = rnd(1, 5), k = rnd(2, 3); return { s: [0, 1, 2, 3].map(i => a * k ** i), r: a * k ** 4, regla: 'multiplicar por ' + k }; },
    () => { const a = rnd(1, 6); return { s: [0, 1, 2, 3].map(i => (a + i) ** 2), r: (a + 4) ** 2, regla: 'cuadrados' }; },
    () => { let x = rnd(1, 4), y = rnd(1, 5); const s = [x, y]; while (s.length < 5) s.push(s[s.length - 1] + s[s.length - 2]); return { s: s.slice(0, 4), r: s[4], regla: 'sumar los dos anteriores' }; },
    () => { const a = rnd(1, 9), k = rnd(1, 4); return { s: [a, a + k, a + 3 * k, a + 6 * k], r: a + 10 * k, regla: 'sumar ' + k + ', ' + 2 * k + ', ' + 3 * k + '…' }; },
  ];
  const g = tipos[rnd(0, Math.min(tipos.length - 1, 1 + Math.floor(n / 3)))]();
  const dis = new Set();
  while (dis.size < 3) { const x = g.r + [1, -1, 2, -2, 3, 5, -5, 10][rnd(0, 7)]; if (x !== g.r) dis.add(x); }
  return conOpciones({ big: '🔢', q: g.s.join(', ') + ', ?', sub: '¿Qué número sigue?', explicacion: 'Era ' + g.r + ' (' + g.regla + ')' }, String(g.r), [...dis].map(String), aleatorio);
}
function jugarSimon() {
  const m = marco('mente-simon');
  const colores = [{ c: '#22c55e', f: 330 }, { c: '#ef4444', f: 262 }, { c: '#eab308', f: 392 }, { c: '#3b82f6', f: 494 }];
  let seq = [], paso = 0, turno = false, nivel = 0, terminado = false;
  const t0 = Date.now();
  m.body.innerHTML = '<div class="q-card"><div class="q" id="sim-msg">Mira la secuencia…</div><div class="sub">Nivel <b id="sim-niv">1</b></div></div>' +
    '<div class="simon">' + colores.map((x, i) => '<button data-sim="' + i + '" aria-label="Color ' + (i + 1) + '" style="background:' + x.c + ';color:' + x.c + '"></button>').join('') + '</div>';
  const pads = [...m.body.querySelectorAll('[data-sim]')];
  const encender = (i, ms = 420) => new Promise(ok => { pads[i].classList.add('on'); tono(colores[i].f, ms - 60, 'triangle', .1); setTimeout(() => { pads[i].classList.remove('on'); setTimeout(ok, 140); }, ms); });
  async function ronda() {
    nivel++; paso = 0; turno = false;
    document.getElementById('sim-niv').textContent = nivel;
    document.getElementById('sim-msg').textContent = 'Mira la secuencia…';
    seq.push(Math.floor(Math.random() * 4));
    pads.forEach(p => { p.disabled = true; });
    await new Promise(r => setTimeout(r, 600));
    const vel = Math.max(220, 480 - nivel * 20);
    for (const i of seq) { if (terminado) return; await encender(i, vel); }
    turno = true; pads.forEach(p => { p.disabled = false; });
    document.getElementById('sim-msg').textContent = '¡Tu turno!';
  }
  m.body.addEventListener('click', async e => {
    const b = e.target.closest('[data-sim]'); if (!b || !turno || terminado) return;
    const i = Number(b.dataset.sim);
    encender(i, 220);
    if (i !== seq[paso]) {
      terminado = true; sonidoMal();
      const puntos = (nivel - 1) * 100;
      document.getElementById('sim-msg').textContent = '✘ ¡Uy! Llegaste al nivel ' + nivel;
      return setTimeout(() => terminar('mente-simon', { puntos, aciertos: nivel - 1, total: nivel, segundos: (Date.now() - t0) / 1000, titulo: '🟢 Simón dice', detalle: 'Repetiste ' + (nivel - 1) + ' secuencia(s)' }), 1200);
    }
    paso++;
    if (paso === seq.length) { turno = false; m.puntos(nivel * 100); setTimeout(ronda, 600); }
  });
  limpiezas.push(() => { terminado = true; });
  ronda();
}

async function jugarSopa() {
  const d = await datos('ingles');
  const N = 10;
  const candidatas = barajar(d.vocabulario.filter(v => /^[a-z]{3,8}$/.test(v.en)));
  const grid = Array.from({ length: N }, () => Array(N).fill(''));
  const dirs = [[0, 1], [1, 0], [1, 1], [-1, 1]];
  const puestas = [];
  for (const w of candidatas) {
    if (puestas.length >= 6) break;
    const W = w.en.toUpperCase();
    for (let intento = 0; intento < 60; intento++) {
      const [dr, dc] = dirs[Math.floor(Math.random() * dirs.length)];
      const r0 = Math.floor(Math.random() * N), c0 = Math.floor(Math.random() * N);
      const celdas = [...W].map((_, k) => [r0 + dr * k, c0 + dc * k]);
      if (celdas.every(([r, c], k) => r >= 0 && r < N && c >= 0 && c < N && (!grid[r][c] || grid[r][c] === W[k]))) {
        celdas.forEach(([r, c], k) => { grid[r][c] = W[k]; });
        puestas.push({ w, W, celdas, found: false });
        break;
      }
    }
  }
  const letras = 'ABCDEFGHIJKLMNOPRSTUVWY';
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (!grid[r][c]) grid[r][c] = letras[Math.floor(Math.random() * letras.length)];
  const m = marco('mente-sopa');
  const TOT = 180;
  let inicio = null, encontradas = 0, terminado = false;
  const t0 = Date.now();
  const fin = () => {
    if (terminado) return; terminado = true;
    const seg = (Date.now() - t0) / 1000;
    const bono = encontradas === puestas.length ? Math.max(0, Math.round(TOT - seg)) * 3 : 0;
    terminar('mente-sopa', { puntos: encontradas * 150 + bono, aciertos: encontradas, total: puestas.length, segundos: seg, titulo: '🔎 Sopa de letras', detalle: encontradas === puestas.length ? '¡Las encontraste todas! Bono de tiempo: ' + bono : '' });
  };
  reloj(TOT, s => m.tiempo(s, TOT), fin);
  m.body.innerHTML = '<p class="muted" style="text-align:center;margin-top:0">Toca la primera y la última letra de cada palabra en inglés.</p>' +
    '<div class="sopa" style="grid-template-columns:repeat(' + N + ',1fr)">' + grid.flatMap((fila, r) => fila.map((l, c) => '<button data-r="' + r + '" data-c="' + c + '">' + l + '</button>')).join('') + '</div>' +
    '<div class="lista-sopa">' + puestas.map((p, i) => '<span id="sopa-w' + i + '">' + escapeHtml(p.w.emoji + ' ' + p.w.es) + '</span>').join('') + '</div>';
  const celda = (r, c) => m.body.querySelector('[data-r="' + r + '"][data-c="' + c + '"]');
  m.body.addEventListener('click', e => {
    const b = e.target.closest('[data-r]'); if (!b || terminado) return;
    const r = Number(b.dataset.r), c = Number(b.dataset.c);
    if (!inicio) { inicio = [r, c]; b.classList.add('sel'); return; }
    celda(inicio[0], inicio[1]).classList.remove('sel');
    const [r0, c0] = inicio; inicio = null;
    const hit = puestas.findIndex(p => !p.found && ((p.celdas[0][0] === r0 && p.celdas[0][1] === c0 && p.celdas.at(-1)[0] === r && p.celdas.at(-1)[1] === c) ||
      (p.celdas.at(-1)[0] === r0 && p.celdas.at(-1)[1] === c0 && p.celdas[0][0] === r && p.celdas[0][1] === c)));
    if (hit >= 0) {
      const p = puestas[hit]; p.found = true; encontradas++;
      p.celdas.forEach(([rr, cc]) => celda(rr, cc).classList.add('found'));
      const s = document.getElementById('sopa-w' + hit); s.classList.add('found'); s.textContent = p.w.emoji + ' ' + p.w.es + ' = ' + p.W;
      m.puntos(encontradas * 150); sonidoOk();
      if (encontradas === puestas.length) setTimeout(fin, 700);
    } else sonidoMal();
  });
}
