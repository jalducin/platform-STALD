// Juegos · salas de mesa (openspec: organizar-codigo).
// Lotería, ¡Una!, Póker, Brisca/Conquián y Ajedrez jugados en sala.
// Script clásico (sin build ni módulos ES): juegos.html lo carga en orden y todos comparten el ámbito global
// (const/let/function de nivel superior). Ver docs/frontend-standards.md, «Estructura de juegos/app/».
// ---- Lotería en sala (openspec: juegos-loteria-preguntas) ----
const L_CANTO = 4500, L_GRITO_BOT = 1500;
function loteriaSala() {
  if (sala.lot) return sala.lot;
  const s = sala.estado.sala; const idx = sala.contenido.cartas.map((_, i) => i);
  const lot = { orden: barajar(idx, rngDe(s.seed, 'orden')), modo: s.opciones.modo || 'linea', marcas: new Array(16).fill(false), voz: 'ambos', cantadas: 0 };
  lot.tablaDe = id => tomar(idx, 16, rngDe(s.seed, 'tabla|' + id));
  lot.mia = lot.tablaDe(sala.estado.yo);
  const guardada = salaGuardada(); // marcas de antes de recargar (openspec: juegos-recarga)
  if (guardada && guardada.codigo === sala.codigo && Array.isArray(guardada.marcas) && guardada.marcas.length === 16) lot.marcas = guardada.marcas.map(Boolean);
  sala.lot = lot;
  return lot;
}
// Cartas cantadas a la hora t (la carta k sale en inicio + k·canto).
const cantadasA = t => { const s = sala.estado.sala; return t < s.inicio ? 0 : Math.min(54, Math.floor((t - s.inicio) / dur(L_CANTO)) + 1); };
const cumpleTabla = (tabla, n) => { const set = new Set(sala.lot.orden.slice(0, n)); return cumple(tabla.map(ci => set.has(ci)), sala.lot.modo); };

// Ganador: el grito válido más temprano (humanos por su hora; bots 1.5 s después de completar).
function ganadorLoteria() {
  const lot = loteriaSala(); const s = sala.estado.sala;
  const gritos = sala.estado.jugadores.filter(x => x.loteria && cumpleTabla(lot.tablaDe(x.id), cantadasA(x.loteria))).map(x => ({ id: x.id, nombre: x.nombre, t: x.loteria }));
  if (s.bots) for (const b of BOTS) {
    const tabla = lot.tablaDe(b.id);
    for (let k = 1; k <= 54; k++) if (cumpleTabla(tabla, k)) { gritos.push({ id: b.id, nombre: b.nombre, t: s.inicio + (k - 1) * dur(L_CANTO) + dur(L_GRITO_BOT), bot: true }); break; }
  }
  return gritos.sort((a, b) => a.t - b.t)[0] || null;
}

function cantarCarta(c) {
  const v = sala.lot.voz;
  if (v === 'es') hablar(c.es, 'es-MX', 1);
  else if (v === 'en') hablar(c.en, 'en-US', .95);
  else { hablar(c.es, 'es-MX', 1); if (window.speechSynthesis) { const u = new SpeechSynthesisUtterance(c.en); u.lang = 'en-US'; u.rate = .95; speechSynthesis.speak(u); } }
}

function pintarLoteriaSala(body) {
  const e = sala.estado; const s = e.sala; const lot = loteriaSala(); const cartas = sala.contenido.cartas;
  const ahora = ahoraServidor();
  document.getElementById('m-bar').hidden = true;
  if (ahora < s.inicio) { const k = 'cuenta:' + Math.ceil((s.inicio - ahora) / 1000); if (sala.vista !== k) { body.innerHTML = '<div class="q-card"><div class="sub">¡Prepárate! Modo: ' + (lot.modo === 'llena' ? 'tabla llena' : 'línea') + '</div><div class="letra">' + Math.ceil((s.inicio - ahora) / 1000) + '</div></div>'; sala.vista = k; } return; }
  const n = cantadasA(ahora);
  const gan = ganadorLoteria();
  const fin = (gan && gan.t <= ahora) || (n >= 54 && ahora > s.inicio + 54 * dur(L_CANTO) + 3000);
  if (fin) {
    const nFin = gan ? cantadasA(gan.t) : 54;
    const conteo = id => { const set = new Set(lot.orden.slice(0, nFin)); return lot.tablaDe(id).filter(ci => set.has(ci)).length; };
    const filas = participantes().map(p => {
      const esGan = gan && gan.id === p.id;
      const baseGan = lot.modo === 'llena' ? 500 : 300;
      const total = esGan ? Math.min(1000, baseGan + (54 - nFin) * 10) : conteo(p.id) * 10;
      return { id: p.id, nombre: p.nombre + (esGan ? ' 🎉' : ''), tipo: p.tipo, avatar: p.avatar, total, ultimo: 0 };
    }).sort((a, b) => b.total - a.total);
    sala.aciertosLoteria = lot.marcas.filter(Boolean).length;
    return pintarFinalSala(body, filas, null, gan ? '🎴 ¡Lotería de ' + gan.nombre + '! (' + nFin + ' cartas cantadas)' : '🎴 Se acabaron las cartas');
  }
  if (sala.vista !== 'loteria') {
    sala.vista = 'loteria';
    body.innerHTML = '<div class="lot-top"><div class="lot-carta" id="lot-carta"><div class="big">🎴</div></div><div class="lot-lado"><div class="muted">Salieron <b id="lot-n">0</b>/54 · ' + (lot.modo === 'llena' ? 'tabla llena' : 'línea') + '</div>' +
      '<div class="lot-hist" id="lot-hist"></div><div id="lot-jug"></div></div></div>' +
      '<div class="lot-grid">' + lot.mia.map((ci, i) => '<button class="lot-cell' + (lot.marcas[i] ? ' marcada' : '') + '" data-lsc="' + i + '"><span class="em">' + escapeHtml(cartas[ci].emoji) + '</span><span class="nm">' + escapeHtml(cartas[ci].es) + '</span></button>').join('') + '</div>' +
      '<div class="feedback" id="lot-msg"></div>' +
      '<div class="row-btns"><button class="btn una-grito" data-lsgrito>🎉 ¡Lotería!</button></div>' +
      '<div class="row-btns" style="margin-top:6px">' + ['es:🇲🇽 Voz español', 'ambos:🔀 Bilingüe', 'en:🇺🇸 English'].map(x => { const [v, t] = x.split(':'); return '<button class="btn ghost sm" data-lsvoz="' + v + '" aria-pressed="' + (lot.voz === v) + '">' + t + '</button>'; }).join('') + '</div>';
    lot.cantadas = 0;
  }
  if (n !== lot.cantadas) {
    const nueva = n > lot.cantadas;
    lot.cantadas = n;
    const c = cartas[lot.orden[n - 1]];
    document.getElementById('lot-carta').innerHTML = '<div class="big">' + escapeHtml(c.emoji) + '</div><div class="q">' + c.n + '. ' + escapeHtml(c.es) + '</div><div class="sub"><i>' + escapeHtml(c.en) + '</i></div><div class="sub">«' + escapeHtml(c.verso) + '»</div>';
    document.getElementById('lot-n').textContent = n;
    document.getElementById('lot-hist').innerHTML = lot.orden.slice(Math.max(0, n - 6), n - 1).reverse().map(i => '<span title="' + escapeHtml(cartas[i].es) + '">' + escapeHtml(cartas[i].emoji) + '</span>').join('');
    if (nueva) cantarCarta(c);
  }
  // Progreso de cada quien (cartas de su tabla que ya salieron)
  const set = new Set(lot.orden.slice(0, n));
  const prog = participantes().map(p => escapeHtml(p.nombre) + ' <b>' + lot.tablaDe(p.id).filter(ci => set.has(ci)).length + '</b>/16' + (p.loteria ? ' 📣' : '')).join('<br>');
  const jug = document.getElementById('lot-jug'); if (jug && jug.innerHTML !== prog) jug.innerHTML = prog;
}

function marcarLoteriaSala(i, cel) {
  const lot = sala.lot; const n = cantadasA(ahoraServidor());
  const $m = document.getElementById('lot-msg');
  if (new Set(lot.orden.slice(0, n)).has(lot.mia[i])) { lot.marcas[i] = true; cel.classList.add('marcada'); tono(520, 60); recordarSala(sala.codigo, { marcas: lot.marcas }); }
  else { cel.classList.remove('tiembla'); cel.getBoundingClientRect(); /* reflujo: reinicia la animación */ cel.classList.add('tiembla'); $m.className = 'feedback bad'; $m.textContent = '¡Esa carta todavía no sale!'; }
}

function gritarLoteriaSala() {
  const lot = sala.lot; const $m = document.getElementById('lot-msg');
  if (!cumple(lot.marcas, lot.modo)) { sonidoMal(); $m.className = 'feedback bad'; $m.textContent = 'Aún no tienes lotería 😉 ' + (lot.modo === 'llena' ? 'Necesitas la tabla llena.' : 'Necesitas una línea completa.'); return; }
  sonidoOk(); $m.className = 'feedback ok'; $m.textContent = '📣 ¡LOTERÍA! Revisando…';
  post('/juegos/sala/' + sala.codigo + '/respuesta', { loteria: true }).then(() => traerSala());
}

// ---- ¡Una! en sala (openspec: una-en-partida) ----
// Estado reconstruido reproduciendo las jugadas sobre el mazo de la semilla: igual en todos los dispositivos.
const U_BOT_MS = 3000, U_TURNO_MS = 30000; // ritmo más lento (ajuste del profe)
const UNA_CARTAS = (() => {
  const m = []; let id = 0;
  for (const c of ['r', 'y', 'g', 'b']) {
    m.push({ id: id++, c, v: '0' });
    for (let k = 0; k < 2; k++) { for (let n = 1; n <= 9; n++) { m.push({ id: id++, c, v: String(n) }); } m.push({ id: id++, c, v: 'skip' }, { id: id++, c, v: 'rev' }, { id: id++, c, v: '+2' }); }
  }
  for (let k = 0; k < 4; k++) m.push({ id: id++, c: null, v: 'wild' }, { id: id++, c: null, v: '+4' });
  return m;
})();
const colorMas = ids => { const q = { r: 0, y: 0, g: 0, b: 0 }; ids.forEach(id => { const c = UNA_CARTAS[id].c; if (c) q[c]++; }); return Object.entries(q).sort((a, b) => b[1] - a[1])[0][0]; };

function estadoUna() {
  const e = sala.estado, s = e.sala;
  const orden = participantes();
  const jugs = new Map();
  e.jugadores.forEach(x => (x.jugadas || []).forEach(j => { if (!jugs.has(j.n)) jugs.set(j.n, { jugador: x.id, ...j }); }));
  const mazo = barajar(UNA_CARTAS.map(c => c.id), rngDe(s.seed, 'una-mazo'));
  const manos = orden.map(() => []);
  for (let k = 0; k < 7; k++) for (let j = 0; j < orden.length; j++) manos[j].push(mazo.pop());
  let pila = [mazo.pop()];
  while (UNA_CARTAS[pila[0]].v === '+4') { mazo.unshift(pila[0]); pila = [mazo.pop()]; }
  const st = { orden, manos, mazo, pila, color: UNA_CARTAS[pila[0]].c || 'r', dir: 1, turno: 0, paso: 0, T0: s.inicio, pendiente: null, fin: null, jugadas: orden.map(() => 0), ultima: null, castigos: [] };
  const R = unaSalaReglas(st, s.seed);
  const ahora = ahoraServidor();
  for (let guard = 0; guard < 4000 && !st.fin; guard++) {
    const sigue = st.esperaUna ? unaSalaResolverUna(st, R, e, s.seed, ahora) : unaSalaTurno(st, R, jugs, s.seed, ahora);
    if (!sigue) break;
  }
  st.valida = R.valida; st.top = R.top; st.hayParaRobar = R.hayParaRobar;
  return st;
}

// Reglas básicas de ¡Una! en sala sobre el estado st (carta de arriba, validez, siguiente turno y robo).
function unaSalaReglas(st, seed) {
  const orden = st.orden;
  const top = () => UNA_CARTAS[st.pila[st.pila.length - 1]];
  const valida = id => { const c = UNA_CARTAS[id]; return !c.c || c.c === st.color || c.v === top().v; };
  const sig = (d, pasos = 1) => ((d + st.dir * pasos) % orden.length + orden.length) % orden.length;
  // Devuelve cuántas cartas llegaron de verdad (0 si ya no hay mazo ni pila para rebarajar).
  const robar = (j, n) => {
    let r = 0;
    for (let k = 0; k < n; k++) {
      if (!st.mazo.length) { const t = st.pila.pop(); st.mazo = barajar(st.pila, rngDe(seed, 'rebaraja' + st.paso)); st.pila = [t]; }
      if (st.mazo.length) { st.manos[j].push(st.mazo.pop()); r++; }
    }
    return r;
  };
  const hayParaRobar = () => st.mazo.length > 0; // basta-divertida-una-robo: el robo no rebaraja el descarte
  return { top, valida, sig, robar, hayParaRobar };
}

// Aplica la jugada mv del jugador j a la hora t (R: reglas de unaSalaReglas).
function unaSalaAplicar(st, R, j, mv, t) {
  st.paso++; st.T0 = t;
  if (mv.accion === 'jugar') {
    const c = UNA_CARTAS[mv.carta];
    st.manos[j].splice(st.manos[j].indexOf(mv.carta), 1); st.pila.push(mv.carta);
    st.color = c.c || (['r', 'y', 'g', 'b'].includes(mv.color) ? mv.color : 'r');
    st.pendiente = null; st.jugadas[j]++;
    st.ultima = { j, accion: 'jugar', carta: mv.carta, color: st.color, paso: st.paso };
    if (!st.manos[j].length) { st.fin = { ganador: j, t }; return; }
    if (st.manos[j].length === 1) st.esperaUna = { j, paso: st.paso - 1, t0: t }; // se resuelve antes del siguiente turno
    let pasos = 1;
    if (c.v === 'skip') pasos = 2;
    if (c.v === 'rev') { if (st.orden.length === 2) pasos = 2; else st.dir *= -1; }
    if (c.v === '+2') { R.robar(R.sig(j), 2); pasos = 2; }
    if (c.v === '+4') { R.robar(R.sig(j), 4); pasos = 2; }
    st.turno = R.sig(j, pasos);
  } else if (mv.accion === 'robar') {
    // basta-divertida-una-robo: roba del mazo de la semilla hasta sacar una jugable (determinista, sin rebarajar).
    const r = Una.robarHastaPoder(st.mazo, st.manos[j], R.valida);
    st.ultima = { j, accion: 'robar', auto: !!mv.auto, paso: st.paso, robadas: r.robadas, jugable: r.jugable };
    if (!mv.auto && r.jugable !== null) st.pendiente = r.jugable; else st.turno = R.sig(j);
  } else {
    st.ultima = { j, accion: 'pasar', auto: !!mv.auto, paso: st.paso };
    st.pendiente = null; st.turno = R.sig(j);
  }
}

function unaSalaEsValida(st, R, j, mv) {
  if (mv.accion === 'jugar') return st.manos[j].includes(mv.carta) && R.valida(mv.carta) && (st.pendiente === null || st.pendiente === mv.carta);
  if (mv.accion === 'robar') return st.pendiente === null;
  if (mv.accion === 'pasar') return st.pendiente !== null || (!R.hayParaRobar() && !st.manos[j].some(R.valida)); // atorado sin cartas: puede pasar
  return false;
}

// Jugada del bot j (determinista por la semilla y el paso).
function unaSalaJugadaBot(st, R, seed, j) {
  const mano = st.manos[j];
  if (st.pendiente !== null) return { accion: 'jugar', carta: st.pendiente, color: colorMas(mano.filter(x => x !== st.pendiente)), una: true };
  const ops = mano.filter(R.valida);
  if (!ops.length) return { accion: 'robar' };
  const r = rngDe(seed, 'bot' + st.paso);
  const sigN = st.manos[R.sig(j)].length;
  const accion = ops.filter(id => ['skip', '+2', '+4', 'rev'].includes(UNA_CARTAS[id].v));
  const nums = ops.filter(id => UNA_CARTAS[id].c && /^\d$/.test(UNA_CARTAS[id].v));
  let c;
  if (sigN <= 2 && accion.length && r() < 0.4) c = accion[0];
  else if (nums.length) c = nums[0];
  else c = ops.find(id => UNA_CARTAS[id].c) ?? ops[0];
  return { accion: 'jugar', carta: c, color: colorMas(mano.filter(x => x !== c)), una: true };
}

// Resuelve la espera del botón UNA. Devuelve false si hay que dejar de reproducir (todavía no toca).
function unaSalaResolverUna(st, R, e, seed, ahora) {
  const unasDe = id => ((e.jugadores.find(x => x.id === id) || {}).unas || []);
  const w = st.esperaUna, quien = st.orden[w.j], lim = w.t0 + dur(5000);
  let tUna = null;
  if (quien.bot) tUna = w.t0 + dur(800 + rngDe(seed, 'una' + w.paso)() * 1000);
  else { const u = unasDe(quien.id).find(x => x.paso === w.paso); if (u && u.t <= lim) tUna = u.t; }
  let seg;
  if (tUna !== null) { if (ahora < tUna) { return false; } seg = (tUna - w.t0) / dur(1000); }
  else if (ahora >= lim) { seg = Infinity; tUna = lim; }
  else return false; // esperando a que presione UNA
  const n = castigoUna(seg);
  if (n) { R.robar(w.j, n); st.castigos.push({ j: w.j, n }); if (st.ultima) st.ultima.castigo = n; }
  st.esperaUna = null; st.T0 = tUna;
  return true;
}

// Reproduce el turno actual (bot o persona). Devuelve false si hay que dejar de reproducir (todavía no toca).
function unaSalaTurno(st, R, jugs, seed, ahora) {
  const j = st.turno, p = st.orden[j];
  if (p.bot) {
    const t = st.T0 + dur(U_BOT_MS); if (ahora < t) return false;
    unaSalaAplicar(st, R, j, unaSalaJugadaBot(st, R, seed, j), t);
    return true;
  }
  const mv = jugs.get(st.paso); const limite = st.T0 + dur(U_TURNO_MS);
  if (mv && mv.jugador === p.id && mv.t <= limite && unaSalaEsValida(st, R, j, mv)) unaSalaAplicar(st, R, j, mv, mv.t);
  else if (ahora >= limite) unaSalaAplicar(st, R, j, st.pendiente !== null ? { accion: 'pasar', auto: true } : { accion: 'robar', auto: true }, limite);
  else return false;
  return true;
}

function unaNombre(c, lang) {
  const T = UNA_TXT[lang];
  if (c.v === 'wild' || c.v === '+4') return T[c.v];
  const numeros = lang === 'en' ? NUM_EN : NUM_ES;
  const num = /^\d$/.test(c.v) ? numeros[Number(c.v)] : T[c.v];
  return lang === 'en' ? T.color[c.c] + ' ' + num : num + ' ' + T.color[c.c].toLowerCase();
}
const unaCartaHtml = (c, extra) => '<span class="una-card' + (extra || '') + '" style="--c:' + (c.c ? UNA_COLOR[c.c] : '#1e1b2e') + '">' + (c.c ? '' : '<span class="una-wild"></span>') + '<b>' + escapeHtml(unaSimbolo(c.v)) + '</b></span>';

function pintarUnaSala(body) {
  const e = sala.estado, s = e.sala;
  const lang = sala.unaLang || 'es'; const T = UNA_TXT[lang];
  const bar = document.getElementById('m-bar');
  const ahora = ahoraServidor();
  if (ahora < s.inicio) { bar.hidden = true; const k = 'cuenta:' + Math.ceil((s.inicio - ahora) / 1000); if (sala.vista !== k) { body.innerHTML = '<div class="q-card"><div class="sub">¡Prepárate! Se reparten 7 cartas</div><div class="letra">' + Math.ceil((s.inicio - ahora) / 1000) + '</div></div>'; sala.vista = k; } return; }
  const st = estadoUna();
  if (st.fin) return unaSalaFin(body, st, bar, e.yo);
  const yo = st.orden.findIndex(p => p.id === e.yo);
  if (sala.unaLocal && st.paso > sala.unaLocal.paso && !st.esperaUna) sala.unaLocal = null; // UNA ya resuelto
  const miTurno = st.turno === yo && !sala.unaEnviando && !st.esperaUna;
  const miUna = st.esperaUna && st.esperaUna.j === yo;
  let ventana;
  if (st.esperaUna) ventana = dur(5000);
  else ventana = dur(st.orden[st.turno].bot ? U_BOT_MS : U_TURNO_MS);
  const limite = (st.esperaUna ? st.esperaUna.t0 : st.T0) + ventana;
  bar.hidden = false; bar.firstChild.style.width = Math.max(0, Math.min(100, (limite - ahora) / ventana * 100)) + '%';
  // Anunciar la última jugada (voz) una sola vez
  if (st.ultima && st.ultima.paso !== sala.unaAnunciada) {
    sala.unaAnunciada = st.ultima.paso;
    if (st.ultima.accion === 'jugar') hablar(unaNombre(UNA_CARTAS[st.ultima.carta], lang), lang === 'en' ? 'en-US' : 'es-MX', 1);
  }
  const quedaUna = st.esperaUna ? Math.max(0, (st.esperaUna.t0 + dur(5000) - ahora) / dur(1000)) : 0;
  let marcaLocal = '';
  if (sala.unaLocal) marcaLocal = sala.unaLocal.presionado ? 'P' : 'L';
  const clave = 'una:' + st.paso + ':' + marcaLocal + ':' + (sala.unaElegir ?? '') + ':' + (st.esperaUna ? 'U' + st.esperaUna.paso : '') + ':' + (sala.unaEnviando ? 1 : 0) + ':' + lang + ':' + st.castigos.length;
  if (sala.vista === clave) { const cu = document.getElementById('una-cuenta'); if (cu) { cu.textContent = quedaUna.toFixed(1); } return; } // la cuenta del UNA se actualiza sin redibujar el botón
  sala.vista = clave;
  const u = st.ultima;
  const ult = unaSalaUltimaTxt(st, yo, lang);
  const mano = yo >= 0 ? st.manos[yo] : [];
  const jugable = id => miTurno && st.valida(id) && (st.pendiente === null || st.pendiente === id);
  // basta-divertida-una-robo: las cartas que robé se animan al llegar, una sola vez por paso.
  const robadasMias = u && u.accion === 'robar' && u.j === yo && sala.unaAnimado !== u.paso ? u.robadas : [];
  if (robadasMias.length) sala.unaAnimado = u.paso;
  const anim = id => { const k = robadasMias.indexOf(id); return k < 0 ? '' : ' nueva" style="--k:' + k; };
  body.innerHTML =
    '<div class="una-bots">' + st.orden.map((p, j) => j === yo ? '' : unaSalaRivalHtml(st, p, j, T)).join('') + '</div>' +
    '<div class="una-mesa"><div>' + unaCartaHtml(st.top(), ' grande') + '<div class="muted" style="text-align:center">' + escapeHtml(T.color[st.color]) + ' <span class="una-dot" style="background:' + UNA_COLOR[st.color] + '"></span></div></div>' +
    '<button class="una-mazo" data-usala="robar"' + (miTurno && st.pendiente === null && st.hayParaRobar() ? '' : ' disabled') + '>🂠<small>' + escapeHtml(T.robar) + ' (' + st.mazo.length + ')</small></button></div>' +
    '<div class="feedback" id="una-msg">' + unaSalaMsgHtml(st, lang, miUna, miTurno, quedaUna, ult) + '</div>' +
    '<div class="una-mano">' + mano.map(id => '<button class="una-btn' + (st.pendiente === id && miTurno ? ' robada' : '') + anim(id) + '" data-usala-carta="' + id + '"' + (jugable(id) ? '' : ' data-no="1"') + ' aria-label="' + escapeHtml(unaNombre(UNA_CARTAS[id], lang)) + '">' + unaCartaHtml(UNA_CARTAS[id], jugable(id) ? ' jugable' : '') + '</button>').join('') + '</div>' +
    '<div class="row-btns">' + (miTurno && (st.pendiente !== null || (!st.hayParaRobar() && !mano.some(st.valida))) ? '<button class="btn ghost" data-usala="pasar">' + escapeHtml(T.pasar) + '</button>' : '') +
    unaSalaBotonUnaHtml(T, miUna) + '</div>' +
    '<div class="row-btns" style="margin-top:6px"><button class="btn ghost sm" data-usala-lang="es" aria-pressed="' + (lang === 'es') + '">🇲🇽 Español</button><button class="btn ghost sm" data-usala-lang="en" aria-pressed="' + (lang === 'en') + '">🇺🇸 English</button></div>';
  sala.unaSt = st;
}

// Pantalla final de ¡Una! en sala (puntajes y aciertos de quien ve).
function unaSalaFin(body, st, bar, yoId) {
  bar.hidden = true;
  const restantes = st.manos.reduce((a, h, j) => a + (j === st.fin.ganador ? 0 : h.length), 0);
  const filas = st.orden.map((p, j) => ({ id: p.id, nombre: p.nombre + (j === st.fin.ganador ? ' 🏆' : ''), tipo: p.tipo, avatar: p.avatar,
    total: j === st.fin.ganador ? Math.min(1000, 400 + restantes * 10) : st.jugadas[j] * 5, ultimo: 0 })).sort((a, b) => b.total - a.total);
  const yo = st.orden.findIndex(p => p.id === yoId);
  sala.finAciertos = yo >= 0 ? st.jugadas[yo] : 0; sala.finTotal = yo >= 0 ? st.jugadas[yo] + st.manos[yo].length : 0;
  return pintarFinalSala(body, filas, null, '🃏 ¡Ganó ' + st.orden[st.fin.ganador].nombre + '!');
}

// Texto de la última jugada (o del arranque de la partida).
function unaSalaUltimaTxt(st, yo, lang) {
  const u = st.ultima;
  if (!u) return lang === 'en' ? 'The game begins!' : '¡Empieza la partida!';
  const quien = escapeHtml(st.orden[u.j].nombre) + ': ';
  const reloj = u.auto ? ' ⏰' : '';
  if (u.accion === 'jugar') {
    const lento = lang === 'en' ? 'slow on UNA +' : 'tardó en presionar UNA +';
    return quien + escapeHtml(unaNombre(UNA_CARTAS[u.carta], lang)) + (u.castigo ? ' · ⚠️ ' + lento + u.castigo : '');
  }
  if (u.accion !== 'robar') return quien + (lang === 'en' ? 'passes' : 'pasa') + reloj;
  if (u.j !== yo) return quien + (lang === 'en' ? 'draws ' : 'roba ') + u.robadas.length + reloj;
  // basta-divertida-una-robo
  return quien + escapeHtml(Una.avisoRobo(u.robadas.length, u.auto ? null : u.jugable, lang)) + reloj + (!u.auto && u.jugable !== null ? ' · 🆕 ' + escapeHtml(unaNombre(UNA_CARTAS[u.jugable], lang)) : '');
}

// Rival en la fila de arriba (cartas que le quedan y si ya dijo UNA).
function unaSalaRivalHtml(st, p, j, T) {
  return '<div class="una-bot' + (st.turno === j ? ' activo' : '') + '"><span>' + avatarHtml(p.avatar, 20) + ' ' + escapeHtml(p.nombre) + '</span><span>🂠 × ' + st.manos[j].length +
    (st.manos[j].length === 1 ? ' <b class="una-dijo">' + escapeHtml(T.una) + '</b>' : '') + '</span></div>';
}

// Mensaje bajo la mesa: elegir color, cuenta del UNA, espera o de quién es el turno.
function unaSalaMsgHtml(st, lang, miUna, miTurno, quedaUna, ult) {
  const T = UNA_TXT[lang];
  if (sala.unaElegir != null) return (lang === 'en' ? 'Choose a color: ' : 'Elige color: ') + ['r', 'y', 'g', 'b'].map(x => '<button class="una-color" data-usala-color="' + x + '" style="background:' + UNA_COLOR[x] + '" aria-label="' + T.color[x] + '"></button>').join('');
  if (miUna) return '📣 ' + (lang === 'en' ? 'Press UNA now! ' : '¡Presiona UNA ya! ') + '<b id="una-cuenta">' + quedaUna.toFixed(1) + '</b> s';
  if (st.esperaUna) return '⏳ ' + escapeHtml(st.orden[st.esperaUna.j].nombre) + (lang === 'en' ? ' must press UNA…' : ' debe presionar UNA…');
  return (miTurno ? '👉 ' + escapeHtml(T.tu) : '⏳ ' + escapeHtml(st.orden[st.turno].nombre)) + ' · ' + ult;
}

// Botón UNA (o la confirmación de que ya se presionó).
function unaSalaBotonUnaHtml(T, miUna) {
  const mostrar = sala.unaLocal ? !sala.unaLocal.presionado : miUna;
  if (mostrar) return '<button class="btn una-grito pulsa" data-usala="una">📣 ' + escapeHtml(T.una) + '</button>';
  return sala.unaLocal && sala.unaLocal.presionado && (miUna || !sala.unaLocal.enviado) ? '<span class="feedback ok">📣 ¡UNA!</span>' : '';
}

async function jugadaUnaSala(jugada) {
  const st = sala.unaSt; const yo = st.orden.findIndex(p => p.id === sala.estado.yo);
  const n = st.paso;
  // Tirar la penúltima carta: el botón UNA aparece ya (sin esperar al servidor).
  sala.unaLocal = jugada.accion === 'jugar' && st.manos[yo].length === 2 ? { paso: n, presionado: false, enviado: false, jugadaOk: false } : null;
  sala.unaEnviando = true; sala.vista = null; pintarSala();
  const r = await post('/juegos/sala/' + sala.codigo + '/respuesta', { jugada: { n, ...jugada } });
  if (sala.unaLocal && sala.unaLocal.paso === n) { sala.unaLocal.jugadaOk = r.ok; enviarUnaLocal(); }
  await traerSala();
  sala.unaEnviando = false; sala.unaElegir = null;
  sala.vista = null; pintarSala();
  if (!r.ok && r.body.error !== 'turno_tomado') alert('No se pudo enviar la jugada (' + (r.body.error || r.status) + ').');
}

function enviarUnaLocal() {
  const u = sala.unaLocal;
  if (!u || !u.presionado || !u.jugadaOk || u.enviado) return;
  u.enviado = true;
  post('/juegos/sala/' + sala.codigo + '/respuesta', { una: { paso: u.paso } }).then(() => traerSala()).then(() => { sala.vista = null; pintarSala(); });
}

function clicUnaSala(e) {
  const st = sala.unaSt; if (!st) return false;
  const yo = st.orden.findIndex(p => p.id === sala.estado.yo);
  const lg = e.target.closest('[data-usala-lang]'); if (lg) { sala.unaLang = lg.dataset.usalaLang; sala.vista = null; pintarSala(); return true; }
  const b = e.target.closest('[data-usala]');
  if (b && b.dataset.usala === 'una') {
    if (sala.unaLocal && !sala.unaLocal.presionado) { sala.unaLocal.presionado = true; sonidoOk(); enviarUnaLocal(); sala.vista = null; pintarSala(); return true; }
    if (!st.esperaUna || st.esperaUna.j !== yo) return true;
    sonidoOk(); sala.unaLocal = { paso: st.esperaUna.paso, presionado: true, enviado: false, jugadaOk: true }; enviarUnaLocal(); sala.vista = null; pintarSala();
    return true;
  }
  if (st.turno !== yo || sala.unaEnviando) return !!(b || e.target.closest('[data-usala-carta]'));
  const col = e.target.closest('[data-usala-color]');
  if (col && sala.unaElegir != null) { jugadaUnaSala({ accion: 'jugar', carta: sala.unaElegir, color: col.dataset.usalaColor }); return true; }
  if (b && b.dataset.usala === 'robar' && st.pendiente === null && st.hayParaRobar()) { jugadaUnaSala({ accion: 'robar' }); return true; }
  if (b && b.dataset.usala === 'pasar' && (st.pendiente !== null || (!st.hayParaRobar() && !st.manos[yo].some(st.valida)))) { jugadaUnaSala({ accion: 'pasar' }); return true; }
  const k = e.target.closest('[data-usala-carta]');
  if (k) {
    const id = Number(k.dataset.usalaCarta);
    if (!st.valida(id) || (st.pendiente !== null && st.pendiente !== id)) {
      sonidoMal(); const m = document.getElementById('una-msg'); m.className = 'feedback bad';
      const T = UNA_TXT[sala.unaLang || 'es'];
      m.textContent = st.pendiente !== null ? 'Solo puedes jugar la que robaste o pasar' : 'Debe ser ' + T.color[st.color].toLowerCase() + ' o ' + unaSimbolo(st.top().v);
      return true;
    }
    if (!UNA_CARTAS[id].c) { sala.unaElegir = id; sala.vista = null; pintarSala(); return true; }
    jugadaUnaSala({ accion: 'jugar', carta: id });
    return true;
  }
  return false;
}

// ---- Póker en sala (openspec: poker): cada jugada lleva su paso n; todos reconstruyen la mesa desde la semilla ----
const PK_BOT_MS = 2500, PK_TURNO_MS = 30000, PK_PAUSA_MS = 9000; // ritmo más lento (ajuste del profe)
function estadoPoker() {
  const e = sala.estado, s = e.sala;
  const orden = participantes();
  const jugs = new Map();
  e.jugadores.forEach(x => (x.jugadas || []).forEach(j => { if (!jugs.has(j.n)) jugs.set(j.n, { jugador: x.id, ...j }); }));
  const st = Cartas.pokerNueva(orden.map(p => ({ id: p.id, nombre: p.nombre, bot: !!p.bot })), { manos: 10 }); // 500 fichas
  Cartas.pokerMano(st, rngDe(s.seed, 'poker-mano-0'));
  const ganadas = {}; let paso = 0, T0 = s.inicio;
  const ahora = ahoraServidor();
  for (let guard = 0; guard < 6000 && !st.terminada; guard++) {
    pkContar(st, ganadas);
    if (st.fase === 'fin') { const t = T0 + dur(PK_PAUSA_MS); if (ahora < t) { break; } Cartas.pokerMano(st, rngDe(s.seed, 'poker-mano-' + (st.mano + 1))); T0 = t; continue; }
    const j = st.turno, p = orden[j];
    if (p.bot) {
      const t = T0 + dur(PK_BOT_MS); if (ahora < t) break;
      Cartas.pokerActuar(st, Cartas.pokerBot(st, rngDe(s.seed, 'pbot' + paso))); paso++; T0 = t;
    } else {
      const mv = jugs.get(paso), lim = T0 + dur(PK_TURNO_MS);
      if (mv && mv.jugador === p.id && mv.t <= lim && Cartas.pokerActuar(st, mv)) { paso++; T0 = Math.max(T0, mv.t); }
      else if (ahora >= lim) { Cartas.pokerActuar(st, { accion: Cartas.opciones(st).pasar ? 'pasar' : 'retirarse' }); st.ultima.auto = true; paso++; T0 = lim; }
      else break;
    }
  }
  pkContar(st, ganadas);
  return Object.assign(st, { orden, paso, T0, ganadas, equipos: s.opciones && s.opciones.equipos === '1' ? orden.map((_, i) => i % 2) : null });
}

function pintarPokerSala(body) {
  const e = sala.estado, s = e.sala;
  const bar = document.getElementById('m-bar');
  const ahora = ahoraServidor();
  if (ahora < s.inicio) { bar.hidden = true; const k = 'cuenta:' + Math.ceil((s.inicio - ahora) / 1000); if (sala.vista !== k) { body.innerHTML = '<div class="q-card"><div class="sub">¡Prepárense! Se reparten las cartas</div><div class="letra">' + Math.ceil((s.inicio - ahora) / 1000) + '</div></div>'; sala.vista = k; } return; }
  const st = estadoPoker();
  const yo = st.orden.findIndex(p => p.id === e.yo);
  if (st.terminada) {
    bar.hidden = true;
    const { puntos, eq } = pkPuntos(st, st.equipos);
    const filas = st.orden.map((p, j) => ({ id: p.id, nombre: p.nombre + (st.equipos ? ' (' + 'AB'[st.equipos[j]] + ')' : ''), tipo: p.tipo, avatar: p.avatar, total: puntos[j], ultimo: 0 })).sort((a, b) => b.total - a.total);
    sala.finAciertos = yo >= 0 ? (st.ganadas[yo] || 0) : 0; sala.finTotal = st.mano + 1;
    let titulo = '♠️ ¡Fin de la partida de póker!';
    if (eq) titulo = eq.gana < 0 ? '🤝 Empate entre equipos' : '♠️ ¡Ganó el equipo ' + 'AB'[eq.gana] + '! (' + fmt(eq.tot[0]) + ' vs ' + fmt(eq.tot[1]) + ')';
    return pintarFinalSala(body, filas, null, titulo);
  }
  const enJuego = st.fase !== 'fin';
  const miTurno = enJuego && st.turno === yo && !sala.pkEnviando;
  let ventana;
  if (enJuego) ventana = dur(st.orden[st.turno].bot ? PK_BOT_MS : PK_TURNO_MS);
  else ventana = dur(PK_PAUSA_MS);
  bar.hidden = false; bar.firstChild.style.width = Math.max(0, Math.min(100, (st.T0 + ventana - ahora) / ventana * 100)) + '%';
  const clave = 'pk:' + st.mano + ':' + st.paso + ':' + st.fase + ':' + (sala.pkEnviando ? 1 : 0);
  if (sala.vista === clave) return;
  sala.vista = clave;
  let pie;
  if (!enJuego) pie = '<div class="feedback">Siguiente mano en unos segundos…</div>';
  else if (miTurno) pie = '<div class="feedback ok">👉 ¡Tu turno! Tienes 30 s</div>';
  else pie = '<div class="feedback">⏳ Turno de ' + escapeHtml(st.orden[st.turno].nombre) + '</div>';
  body.innerHTML = pkMesaHtml(st, { yo, nombre: i => st.orden[i].nombre, avatar: i => avatarHtml(st.orden[i].avatar, 18) + ' ', equipos: st.equipos, miTurno, pie });
  sala.pkSt = st;
}

async function clicPokerSala(e) {
  const b = e.target.closest('[data-pk]'); const st = sala.pkSt;
  if (!b || !st) return false;
  const yo = st.orden.findIndex(p => p.id === sala.estado.yo);
  if (st.fase === 'fin' || st.turno !== yo || sala.pkEnviando) return true;
  const jugada = pkJugadaDe(b);
  sala.pkEnviando = true; sala.vista = null; pintarSala();
  const r = await post('/juegos/sala/' + sala.codigo + '/respuesta', { jugada: { n: st.paso, ...jugada } });
  await traerSala();
  sala.pkEnviando = false; sala.vista = null; pintarSala();
  if (!r.ok && r.body.error !== 'turno_tomado') alert('No se pudo enviar la jugada (' + (r.body.error || r.status) + ').');
  return true;
}

// ---- Brisca y Conquián en sala (openspec: cartas-espanolas): reproducción genérica por pasos ----
const CS_BOT_MS = 1500, CS_TURNO_MS = 30000, CS_PAUSA_BAZA_MS = 4000; // Brisca: la baza se ve 4 s antes del siguiente turno
const CFG_CARTAS = {
  brisca: { max: 4, botMs: 2500, pausa: st => !st.baza.length && st.ultimaBaza && !st.terminada ? CS_PAUSA_BAZA_MS : 0, nueva: (js, rng) => Cartas.briscaNueva(js, rng), actuar: (st, mv) => mv.accion === 'jugar' && Cartas.briscaJugar(st, mv.carta), bot: (st, rng) => ({ accion: 'jugar', carta: Cartas.briscaBot(st, rng) }) },
  conquian: { max: 2, botMs: 2500, nueva: (js, rng) => Cartas.conquianNueva(js, rng), actuar: (st, mv) => Cartas.conquianActuar(st, mv), bot: (st, rng) => Cartas.conquianBot(st, rng) },
};
function estadoCartasSala(juego) {
  const cfg = CFG_CARTAS[juego];
  const e = sala.estado, s = e.sala;
  const orden = participantes().slice(0, cfg.max);
  if (orden.length < 2) return { faltan: true, orden };
  const jugs = new Map();
  e.jugadores.forEach(x => (x.jugadas || []).forEach(j => { if (!jugs.has(j.n)) jugs.set(j.n, { jugador: x.id, ...j }); }));
  const st = cfg.nueva(orden.map(p => ({ id: p.id, nombre: p.nombre })), rngDe(s.seed, juego + '-mazo'));
  let paso = 0, T0 = s.inicio;
  const ahora = ahoraServidor();
  for (let guard = 0; guard < 3000 && !st.terminada; guard++) {
    const p = orden[st.turno];
    if (p.bot) {
      const t = T0 + dur(cfg.botMs || CS_BOT_MS); if (ahora < t) break;
      cfg.actuar(st, cfg.bot(st, rngDe(s.seed, juego + 'bot' + paso))); paso++; T0 = t + dur(cfg.pausa ? cfg.pausa(st) : 0);
    } else {
      const mv = jugs.get(paso), lim = T0 + dur(CS_TURNO_MS);
      if (mv && mv.jugador === p.id && mv.t <= lim && cfg.actuar(st, mv)) { paso++; T0 = Math.max(T0, mv.t) + dur(cfg.pausa ? cfg.pausa(st) : 0); }
      else if (ahora >= lim) { cfg.actuar(st, cfg.bot(st, rngDe(s.seed, juego + 'auto' + paso))); st.auto = true; paso++; T0 = lim + dur(cfg.pausa ? cfg.pausa(st) : 0); }
      else break;
    }
  }
  return Object.assign(st, { orden, paso, T0 });
}

function pintarCartasSala(body, juego) {
  const e = sala.estado, s = e.sala;
  const bar = document.getElementById('m-bar');
  const ahora = ahoraServidor();
  if (ahora < s.inicio) { bar.hidden = true; const k = 'cuenta:' + Math.ceil((s.inicio - ahora) / 1000); if (sala.vista !== k) { body.innerHTML = '<div class="q-card"><div class="sub">¡Prepárense! Se reparten las cartas</div><div class="letra">' + Math.ceil((s.inicio - ahora) / 1000) + '</div></div>'; sala.vista = k; } return; }
  const st = estadoCartasSala(juego);
  if (st.faltan) { bar.hidden = true; if (sala.vista !== 'faltan') { body.innerHTML = '<div class="card muted" style="text-align:center">Se necesitan al menos 2 jugadores (activa los bots al crear la partida).</div>'; sala.vista = 'faltan'; } return; }
  const yo = st.orden.findIndex(p => p.id === e.yo);
  const nombre = i => st.orden[i].nombre, avatar = i => avatarHtml(st.orden[i].avatar, 18) + ' ';
  if (st.terminada) {
    bar.hidden = true;
    const pts = j => juego === 'brisca' ? brPuntos(st, j).puntos : cqPuntos(st, j);
    const filas = st.orden.map((p, j) => ({ id: p.id, nombre: p.nombre + (st.equipos ? ' (' + 'AB'[st.equipos[j]] + ')' : ''), tipo: p.tipo, avatar: p.avatar, total: pts(j), ultimo: 0 })).sort((a, b) => b.total - a.total);
    if (juego === 'brisca') { sala.finAciertos = yo >= 0 ? st.ganadas[yo].length / st.n : 0; sala.finTotal = Math.trunc(40 / st.n); }
    else { sala.finAciertos = yo >= 0 ? Cartas.bajadas(st, yo) : 0; sala.finTotal = 9; }
    const r = juego === 'brisca' ? Cartas.briscaResultado(st) : null;
    let titulo;
    if (juego !== 'brisca') titulo = st.ganador < 0 ? '🤝 Se acabó el mazo: empate' : '🎉 ¡Conquián de ' + nombre(st.ganador) + '!';
    else if (r.ganador < 0) titulo = '🤝 ¡Empate!';
    else titulo = '🏆 Gana ' + (st.equipos ? 'el equipo ' + 'AB'[r.ganador] : nombre(r.ganador)) + ' · ' + r.totales.join(' vs ');
    return pintarFinalSala(body, filas, null, titulo);
  }
  const miTurno = st.turno === yo && !sala.csEnviando && ahora >= st.T0;
  const ventana = dur(st.orden[st.turno].bot ? (CFG_CARTAS[juego].botMs || CS_BOT_MS) : CS_TURNO_MS);
  bar.hidden = false; bar.firstChild.style.width = Math.max(0, Math.min(100, (st.T0 + ventana - ahora) / ventana * 100)) + '%';
  const sel = sala.cqSel || (sala.cqSel = new Set());
  const clave = 'cs:' + st.paso + ':' + (miTurno ? 1 : 0) + ':' + (sala.csEnviando ? 1 : 0) + ':' + [...sel].join(',') + ':' + sala.cqDestino + ':' + (sala.cqMsg || '');
  if (sala.vista === clave) return;
  sala.vista = clave;
  const pie = miTurno ? '<div class="feedback ok">👉 ¡Tu turno! Tienes 30 s</div>' : '<div class="feedback">⏳ Turno de ' + escapeHtml(nombre(st.turno)) + '</div>';
  body.innerHTML = juego === 'brisca' ? briscaHtml(st, { yo, nombre, avatar, miTurno, verUltima: true, pie }) :
    conquianHtml(st, { yo, nombre, avatar, miTurno, sel, destino: sala.cqDestino ?? null, msg: sala.cqMsg, pie });
  sala.csSt = st;
}

async function enviarCartasSala(jugada) {
  const st = sala.csSt;
  sala.csEnviando = true; sala.vista = null; pintarSala();
  const r = await post('/juegos/sala/' + sala.codigo + '/respuesta', { jugada: { n: st.paso, ...jugada } });
  await traerSala();
  sala.csEnviando = false; sala.cqSel = new Set(); sala.cqDestino = null; sala.cqMsg = ''; sala.vista = null; pintarSala();
  if (!r.ok && r.body.error !== 'turno_tomado') alert('No se pudo enviar la jugada (' + (r.body.error || r.status) + ').');
}

function clicCartasSala(e) {
  const st = sala.csSt; if (!st || st.terminada) return false;
  const yo = st.orden.findIndex(p => p.id === sala.estado.yo);
  const br = e.target.closest('[data-br-carta]');
  if (br) { if (st.turno === yo && !sala.csEnviando && st.manos[yo].includes(Number(br.dataset.brCarta))) { enviarCartasSala({ accion: 'jugar', carta: Number(br.dataset.brCarta) }); } return true; }
  const c = e.target.closest('[data-cq-carta]'), jg = e.target.closest('[data-cq-juego]'), b = e.target.closest('[data-cq]');
  if (c) { const id = Number(c.dataset.cqCarta); const sel = sala.cqSel || (sala.cqSel = new Set()); if (sel.has(id)) sel.delete(id); else { sel.add(id); } sala.cqMsg = ''; sala.vista = null; pintarSala(); return true; }
  if (jg) { const a = Number(jg.dataset.cqJuego); sala.cqDestino = sala.cqDestino === a ? null : a; sala.cqMsg = ''; sala.vista = null; pintarSala(); return true; }
  if (!b) return false;
  if (st.turno !== yo || sala.csEnviando) return true;
  const mv = cqJugadaDe(b.dataset.cq, sala.cqSel || new Set(), sala.cqDestino ?? null);
  // Se valida en local antes de enviar, para explicar por qué no se puede
  if (!mv) { sala.cqMsg = 'Elige exactamente 1 carta para descartar.'; sonidoMal(); sala.vista = null; pintarSala(); return true; }
  const prueba = JSON.parse(JSON.stringify(st)); // NOSONAR: copia con JSON a propósito: la validación local ve el estado igual que el servidor
  if (!Cartas.conquianActuar(prueba, mv)) { sala.cqMsg = CQ_INVALIDA; sonidoMal(); sala.vista = null; pintarSala(); return true; }
  enviarCartasSala(mv);
  return true;
}

// ---- Ajedrez 1 vs 1 en sala (openspec: ajedrez): reloj por jugador; todos reproducen las jugadas ----
const AJ_BOT_MS = 1500;
function estadoAjedrez() {
  const e = sala.estado, s = e.sala;
  const orden = participantes().slice(0, 2);
  if (orden.length < 2) return { faltan: true, orden };
  const R = dur(Number(s.opciones.reloj || 10) * 60000);
  const jugs = new Map();
  e.jugadores.forEach(x => (x.jugadas || []).forEach(j => { if (!jugs.has(j.n)) jugs.set(j.n, { jugador: x.id, ...j }); }));
  const cache = sala.ajCache || (sala.ajCache = new Map());
  let st = Ajedrez.desdeFEN(Ajedrez.INICIAL), paso = 0, T0 = s.inicio, fin = null, ultima = null;
  const usado = [0, 0], sanes = [];
  const ahora = ahoraServidor();
  for (let guard = 0; guard < 1200 && !fin; guard++) {
    const res = Ajedrez.resultado(st);
    if (res) { fin = res; break; }
    const j = st.turno === 'w' ? 0 : 1, p = orden[j], lim = T0 + (R - usado[j]);
    const aplicar = (mv, t) => { const k = Ajedrez.aFEN(st) + mv.de + mv.a + (mv.promo || ''); if (!cache.has(k)) { cache.set(k, Ajedrez.san(st, mv)); } sanes.push(cache.get(k)); st = Ajedrez.aplicar(st, mv); ultima = mv; usado[j] += Math.max(0, t - T0); T0 = Math.max(T0, t); };
    if (p.bot) {
      const t = T0 + dur(AJ_BOT_MS); if (ahora < t) break;
      const k = 'bot:' + Ajedrez.aFEN(st);
      if (!cache.has(k)) cache.set(k, Ajedrez.bot(st, 2, rngDe(s.seed, 'aj' + paso)));
      aplicar(cache.get(k), t); paso++;
    } else {
      const mv = jugs.get(paso);
      if (mv && mv.jugador === p.id && mv.t <= lim) {
        paso++;
        if (mv.accion === 'rendirse') { fin = { fin: 'rendicion', gana: j ? 'w' : 'b' }; usado[j] += Math.max(0, mv.t - T0); break; }
        const m = Ajedrez.buscarJugada(st, mv.de, mv.a, mv.promo);
        if (m) aplicar(m, mv.t); // una jugada ilegal se ignora: sigue el mismo turno con el siguiente paso
      } else if (ahora >= lim) { fin = { fin: 'tiempo', gana: j ? 'w' : 'b' }; usado[j] = R; break; }
      else break;
    }
  }
  const turnoIdx = st.turno === 'w' ? 0 : 1;
  const quedan = [0, 1].map(k => Math.max(0, R - usado[k] - (!fin && k === turnoIdx ? Math.max(0, ahora - T0) : 0)));
  return { st, orden, paso, T0, fin, ultima, sanes, quedan, turnoIdx, R };
}
const ajFmtReloj = ms => { const sg = Math.ceil(ms / 1000 / TIEMPO); return Math.floor(sg / 60) + ':' + String(sg % 60).padStart(2, '0'); };
function ajPuntosSala(a, j) {
  const color = j ? 'b' : 'w', cap = Ajedrez.capturas(a.st)['puntos' + color.toUpperCase()];
  if (a.fin.gana === color) return Math.min(1000, 800 + (a.fin.fin === 'mate' ? 200 : 0));
  if (!a.fin.gana) return 400;
  return Math.min(300, cap * 10);
}

function pintarAjedrezSala(body) {
  const e = sala.estado, s = e.sala;
  const bar = document.getElementById('m-bar'); bar.hidden = true;
  const ahora = ahoraServidor();
  if (ahora < s.inicio) { const k = 'cuenta:' + Math.ceil((s.inicio - ahora) / 1000); if (sala.vista !== k) { body.innerHTML = '<div class="q-card"><div class="sub">¡Prepárense! Blancas: ' + escapeHtml((participantes()[0] || {}).nombre || '') + '</div><div class="letra">' + Math.ceil((s.inicio - ahora) / 1000) + '</div></div>'; sala.vista = k; } return; }
  const a = estadoAjedrez();
  if (a.faltan) { if (sala.vista !== 'faltan') { body.innerHTML = '<div class="card muted" style="text-align:center">♟️ Esperando a que se una tu rival: el ajedrez en partida es solo entre 2 personas.</div>'; sala.vista = 'faltan'; } return; }
  const yo = a.orden.findIndex(p => p.id === e.yo), color = yo === 1 ? 'b' : 'w';
  if (a.fin) {
    const filas = a.orden.map((p, j) => ({ id: p.id, nombre: p.nombre + (j ? ' ♚' : ' ♔'), tipo: p.tipo, avatar: p.avatar, total: ajPuntosSala(a, j), ultimo: 0 })).sort((x, y) => y.total - x.total);
    sala.finAciertos = yo >= 0 ? Ajedrez.capturas(a.st)['puntos' + color.toUpperCase()] : 0; sala.finTotal = 39;
    const idxGana = a.fin.gana === 'w' ? 0 : 1;
    const quien = a.fin.gana ? a.orden[idxGana].nombre : null;
    return pintarFinalSala(body, filas, null, quien ? '♟️ ¡Ganó ' + quien + ' por ' + AJ_FIN[a.fin.fin] + '!' : '🤝 Tablas: ' + AJ_FIN[a.fin.fin]);
  }
  const miTurno = yo === a.turnoIdx && !sala.ajEnviando;
  const relojHtml = j => '<span class="aj-reloj' + (j === a.turnoIdx ? ' activo' : '') + (a.quedan[j] < dur(30000) ? ' poco' : '') + '" id="aj-reloj-' + j + '">⏱ ' + ajFmtReloj(a.quedan[j]) + '</span>';
  const clave = 'aj:' + a.paso + ':' + sala.ajSel + ':' + (sala.ajPromo ? 1 : 0) + ':' + (sala.ajEnviando ? 1 : 0);
  if (sala.vista === clave) { [0, 1].forEach(j => { const r = document.getElementById('aj-reloj-' + j); if (r) { r.textContent = '⏱ ' + ajFmtReloj(a.quedan[j]); r.classList.toggle('poco', a.quedan[j] < dur(30000)); } }); return; }
  sala.vista = clave;
  const arriba = yo === 1 ? 0 : 1, abajo = 1 - arriba;
  const cap = Ajedrez.capturas(a.st);
  const fila = j => '<div class="aj-info"><span>' + avatarHtml(a.orden[j].avatar, 18) + ' ' + escapeHtml(a.orden[j].nombre) + (j ? ' ♚' : ' ♔') + ' <span class="aj-capt">' + ajCapturasHtml(cap[j ? 'b' : 'w']) + '</span></span>' + relojHtml(j) + '</div>';
  const sel = sala.ajSel ?? null;
  let aviso;
  if (yo < 0) aviso = '👀 Estás viendo la partida';
  else if (miTurno) aviso = Ajedrez.enJaque(a.st) ? '⚠️ ¡Jaque! Protege a tu rey' : '👉 Tu turno';
  else aviso = '⏳ Turno de ' + escapeHtml(a.orden[a.turnoIdx].nombre);
  body.innerHTML = '<div class="aj-wrap">' + fila(arriba) + ajTableroHtml(a.st, { abajo: yo === 1 ? 'b' : 'w', sel, destinos: sel !== null && miTurno ? Ajedrez.legales(a.st).filter(x => x.de === sel) : [], ultima: a.ultima }) + fila(abajo) +
    (sala.ajPromo && miTurno ? ajPromoHtml(color) : '') +
    '<div class="feedback' + (Ajedrez.enJaque(a.st) ? ' bad' : '') + '">' + aviso + '</div>' +
    ajJugadasHtml(a.sanes) + '<div class="row-btns"><button class="btn ghost sm" data-ayuda="ajedrez">📖 Cómo se juega</button>' + (miTurno ? '<button class="btn ghost sm" data-aj-rendir>🏳️ Rendirme</button>' : '') + '</div></div>';
  sala.ajA = a;
}

async function enviarAjedrez(jugada) {
  const a = sala.ajA;
  sala.ajEnviando = true; sala.ajSel = null; sala.ajPromo = null; sala.vista = null; pintarSala();
  const r = await post('/juegos/sala/' + sala.codigo + '/respuesta', { jugada: { n: a.paso, ...jugada } });
  await traerSala();
  sala.ajEnviando = false; sala.vista = null; pintarSala();
  if (!r.ok && r.body.error !== 'turno_tomado') alert('No se pudo enviar la jugada (' + (r.body.error || r.status) + ').');
}
function clicAjedrezSala(e) {
  const a = sala.ajA; if (!a || a.fin) return false;
  const yo = a.orden.findIndex(p => p.id === sala.estado.yo);
  const enTablero = e.target.closest('[data-aj], [data-aj-promo], [data-aj-rendir]');
  if (!enTablero) return false;
  if (yo !== a.turnoIdx || sala.ajEnviando) return true;
  if (e.target.closest('[data-aj-rendir]')) { if (confirm('¿Rendirte? Tu rival gana la partida.')) { enviarAjedrez({ accion: 'rendirse' }); } return true; }
  const pr = e.target.closest('[data-aj-promo]');
  if (pr && sala.ajPromo) { enviarAjedrez({ accion: 'mover', de: Ajedrez.casilla(sala.ajPromo.de), a: Ajedrez.casilla(sala.ajPromo.a), promo: pr.dataset.ajPromo }); return true; }
  const c = e.target.closest('[data-aj]');
  const r = ajClic(a.st, yo === 1 ? 'b' : 'w', sala.ajSel ?? null, Number(c.dataset.aj));
  if (r.jugada) { enviarAjedrez({ accion: 'mover', de: Ajedrez.casilla(r.jugada.de), a: Ajedrez.casilla(r.jugada.a) }); return true; }
  sala.ajSel = r.sel; sala.ajPromo = r.promo || null; sala.vista = null; pintarSala();
  return true;
}
