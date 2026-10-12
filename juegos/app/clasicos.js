// Juegos · clásicos individuales (openspec: organizar-codigo).
// Basta, ¡Una! y Lotería contra bots.
// Script clásico (sin build ni módulos ES): juegos.html lo carga en orden y todos comparten el ámbito global
// (const/let/function de nivel superior). Ver docs/frontend-standards.md, «Estructura de juegos/app/».
// ---------- Clásicos: Basta ----------
// basta-divertida-una-robo: normalizar, diccionario y puntos viven en juegos/basta.js (probados con Deno).
const normBasta = Basta.norm, dicBasta = Basta.dic;
// Categorías divertidas elegidas (ids) → datos con esas columnas al final (banco = diccionario y palabras de bots).
const bastaConExtras = (todo, idioma, ids) => Basta.conExtras(todo[idioma], todo.extras, ids);
// Selector de categorías divertidas (máximo Basta.MAX_EXTRAS): casillas con data-<attr>.
const selectorExtras = (extras, attr) => '<div class="basta-extras" role="group" aria-label="Categorías divertidas">' + (extras || []).map(x =>
  '<label class="check"><input type="checkbox" data-' + attr + '="' + escapeHtml(x.id) + '"><span>' + escapeHtml(x.emoji + ' ' + x.titulo) + '</span></label>').join('') + '</div>';
// Al marcar una tercera, se desmarca y avisa.
function limitarExtras(input, attr, aviso) {
  const marcadas = [...document.querySelectorAll('[data-' + attr + ']:checked')];
  const el = document.getElementById(aviso);
  if (marcadas.length > Basta.MAX_EXTRAS) { input.checked = false; if (el) { el.textContent = 'Máximo ' + Basta.MAX_EXTRAS + ' categorías divertidas, para que la ronda no se haga eterna.'; el.className = 'feedback bad'; } }
  else if (el) { el.textContent = ''; el.className = 'feedback'; }
}

// basta-divertida-una-robo: antes de la letra, elegir hasta 2 categorías divertidas (o ninguna).
async function jugarBasta(idioma) {
  const id = idioma === 'en' ? 'basta-en' : 'basta-es';
  const todo = await datos('basta');
  const m = marco(id, { menu: true });
  m.body.innerHTML = '<div class="q-card"><div class="big">✋</div><div class="q">' + (idioma === 'en' ? 'Basta en inglés' : 'Basta') + '</div><div class="sub">Una letra, 60 segundos y una palabra por categoría.</div></div>' +
    '<label>🎉 Categorías divertidas (opcional, máximo ' + Basta.MAX_EXTRAS + ')</label>' + selectorExtras(todo.extras, 'bextra') +
    '<div class="feedback" id="b-extra-aviso"></div><div class="row-btns"><button class="btn" id="basta-empezar">✋ Empezar</button></div>';
  m.body.addEventListener('change', e => { if (e.target.dataset && e.target.dataset.bextra) limitarExtras(e.target, 'bextra', 'b-extra-aviso'); });
  m.body.querySelector('#basta-empezar').addEventListener('click', () => {
    const ids = [...m.body.querySelectorAll('[data-bextra]:checked')].map(x => x.dataset.bextra).slice(0, Basta.MAX_EXTRAS);
    empezarBasta(idioma, bastaConExtras(todo, idioma, ids));
  });
}

async function empezarBasta(idioma, d) {
  const id = idioma === 'en' ? 'basta-en' : 'basta-es';
  const letra = d.letras[Math.floor(Math.random() * d.letras.length)];
  const L = normBasta(letra);
  const dic = dicBasta(d);
  const m = marco(id);
  const TOT = 60;
  let terminado = false;
  const t0 = Date.now();
  m.body.innerHTML = '<div class="q-card"><div class="sub">' + (idioma === 'en' ? 'Letter' : 'Letra') + '</div><div class="letra">' + escapeHtml(letra) + '</div>' +
    '<div class="sub">' + (idioma === 'en' ? 'Write one word in English for each category.' : 'Escribe una palabra por categoría.') + '</div></div>' +
    '<form id="basta-form" autocomplete="off" class="basta-grid">' + d.categorias.map(c =>
      '<label for="b-' + c.id + '">' + escapeHtml(c.emoji + ' ' + c.titulo) + '</label><input id="b-' + c.id + '" data-bcat="' + c.id + '" type="text" autocapitalize="off" spellcheck="false" maxlength="40" placeholder="' + escapeHtml(letra) + '…">').join('') +
    '<div class="row-btns" style="grid-column:1/-1"><button class="btn" type="submit">✋ ¡Basta!</button></div></form>';
  const primero = m.body.querySelector('input'); if (primero) primero.focus();
  const calificar = (porBasta, quedan) => {
    if (terminado) { return; } terminado = true; limpiar();
    const vistas = new Set();
    let puntos = 0, aciertos = 0;
    const filas = d.categorias.map(c => {
      const valor = (document.getElementById('b-' + c.id) || {}).value || '';
      const n = normBasta(valor);
      let estado, pts = 0;
      if (!n) estado = '—';
      else if (!n.startsWith(L) || n.length < 2) estado = '✘ no empieza con ' + letra;
      else if (vistas.has(n)) estado = '✘ repetida';
      else if (dic[c.id].has(n)) { estado = '✔ verificada'; pts = 100; aciertos++; }
      else if (n.length >= 3) { estado = '¿? no la conozco'; pts = 50; }
      else estado = '✘ muy corta';
      if (n) vistas.add(n);
      puntos += pts;
      const ej = pts === 100 ? '' : (d.palabras[c.id] || []).find(w => normBasta(w).startsWith(L));
      return '<tr><td>' + escapeHtml(c.emoji + ' ' + c.titulo) + '</td><td><b>' + escapeHtml(valor || '—') + '</b>' + (ej ? '<br><small>p. ej. ' + escapeHtml(ej) + '</small>' : '') + '</td><td>' + escapeHtml(estado) + '</td><td>' + pts + '</td></tr>';
    });
    const llenas = d.categorias.every(c => ((document.getElementById('b-' + c.id) || {}).value || '').trim());
    const bono = porBasta && llenas ? Math.max(0, Math.round(quedan)) * 5 : 0;
    terminar(id, {
      puntos: puntos + bono, aciertos, total: d.categorias.length, segundos: (Date.now() - t0) / 1000,
      titulo: porBasta ? '✋ ¡Basta!' : '⏰ ¡Se acabó el tiempo!',
      detalle: '<div class="scroll-x"><table class="inv basta-res"><thead><tr><th>Categoría</th><th>Tu palabra</th><th></th><th>Pts</th></tr></thead><tbody>' + filas.join('') + '</tbody></table></div>' +
        (bono ? '<p>⚡ Bono por decir ¡Basta! a tiempo: +' + bono + '</p>' : ''),
    });
  };
  let quedan = TOT;
  reloj(TOT, s => { quedan = s; m.tiempo(s, TOT); }, () => calificar(false, 0));
  m.body.addEventListener('submit', e => { e.preventDefault(); calificar(true, quedan); });
}

// ---------- Clásicos: ¡Una! (cartas de colores) ----------
const UNA_COLOR = { r: '#ef4444', y: '#eab308', g: '#22c55e', b: '#3b82f6' };
const UNA_TXT = {
  es: { color: { r: 'Rojo', y: 'Amarillo', g: 'Verde', b: 'Azul' }, skip: 'Salta', rev: 'Reversa', '+2': 'Más dos', wild: 'Comodín', '+4': 'Más cuatro', tu: 'Tu turno', robar: 'Robar', pasar: 'Pasar', una: 'UNA' },
  en: { color: { r: 'Red', y: 'Yellow', g: 'Green', b: 'Blue' }, skip: 'Skip', rev: 'Reverse', '+2': 'Draw two', wild: 'Wild', '+4': 'Wild draw four', tu: 'Your turn', robar: 'Draw', pasar: 'Pass', una: 'UNA' },
};
const NUM_EN = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
const NUM_ES = ['cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];

function unaMazo() {
  const m = [];
  for (const c of ['r', 'y', 'g', 'b']) {
    m.push({ c, v: '0' });
    for (let k = 0; k < 2; k++) { for (let n = 1; n <= 9; n++) { m.push({ c, v: String(n) }); } m.push({ c, v: 'skip' }, { c, v: 'rev' }, { c, v: '+2' }); }
  }
  for (let k = 0; k < 4; k++) m.push({ c: null, v: 'wild' }, { c: null, v: '+4' });
  return barajar(m);
}
// Castigo por tardar en presionar UNA (segundos desde que se tira la penúltima carta).
const castigoUna = seg => {
  if (seg <= 2) return 0;
  if (seg <= 3) return 1;
  if (seg <= 4) return 2;
  if (seg <= 5) return 3;
  return 4;
};
const unaSimbolo = v => ({ skip: '⊘', rev: '⇄', '+2': '+2', wild: '★', '+4': '+4' }[v] || v);

function elegirUna() {
  const m = marco('una', { menu: true }); // menú: aún no es partida (openspec: juegos-recarga)
  m.body.innerHTML = '<div class="q-card"><div class="big">🃏</div><div class="q">¡Una!</div><div class="sub">Iguala el color o el número. Cuando te quede una carta, ¡presiona el botón UNA!</div></div>' +
    '<label>Rivales</label><div class="opts" style="grid-template-columns:repeat(3,1fr)">' + [1, 2, 3].map(n => '<button class="opt" data-una-bots="' + n + '"' + (n === 2 ? ' aria-pressed="true"' : '') + '>' + n + ' bot' + (n > 1 ? 's' : '') + '</button>').join('') + '</div>' +
    '<label>Idioma</label><div class="opts"><button class="opt" data-una-lang="es" aria-pressed="true">🇲🇽 Español</button><button class="opt" data-una-lang="en">🇺🇸 English</button></div>' +
    '<div class="row-btns"><button class="btn" data-una-go>Repartir cartas</button></div>';
  let bots = 2, lang = 'es';
  m.body.addEventListener('click', e => {
    const b = e.target.closest('[data-una-bots]'), l = e.target.closest('[data-una-lang]');
    if (b) { bots = Number(b.dataset.unaBots); m.body.querySelectorAll('[data-una-bots]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); }
    if (l) { lang = l.dataset.unaLang; m.body.querySelectorAll('[data-una-lang]').forEach(x => x.setAttribute('aria-pressed', String(x === l))); }
    if (e.target.closest('[data-una-go]')) jugarUna(bots, lang);
  });
}

function jugarUna(numBots, lang) {
  const T = UNA_TXT[lang];
  const m = marco('una');
  const nombres = ['Tú', 'Ajolote 🦎', 'Colibrí 🐦', 'Tlacuache 🐀'];
  let resolverUna = () => {};
  let mazo = unaMazo(), pila = [], dir = 1, turno = 0, color = null, terminado = false, esperandoUna = false, jugadas = 0, robada = null, msg = '';
  let nuevas = []; // basta-divertida-una-robo: cartas recién robadas por ti (se animan una vez)
  const manos = Array.from({ length: numBots + 1 }, () => []);
  const t0 = Date.now();
  // Devuelve cuántas cartas llegaron de verdad (0 si ya no hay mazo ni pila para rebarajar).
  const robar = (j, n) => { let r = 0; for (let k = 0; k < n; k++) { if (!mazo.length) { const top = pila.pop(); mazo = barajar(pila); pila = [top]; } if (mazo.length) { manos[j].push(mazo.pop()); r++; } } return r; };
  const hayParaRobar = () => mazo.length > 0; // basta-divertida-una-robo: el robo no rebaraja el descarte
  for (let k = 0; k < 7; k++) manos.forEach((_, j) => robar(j, 1));
  let primera = mazo.pop(); while (primera.v === '+4') { mazo.unshift(primera); primera = mazo.pop(); }
  pila.push(primera); color = primera.c || ['r', 'y', 'g', 'b'][Math.floor(Math.random() * 4)];
  const top = () => pila[pila.length - 1];
  const valida = c => !c.c || c.c === color || c.v === top().v;
  const nombreCarta = c => {
    if (c.v === 'wild' || c.v === '+4') return T[c.v];
    const nums = lang === 'en' ? NUM_EN : NUM_ES;
    const num = /^\d$/.test(c.v) ? nums[Number(c.v)] : T[c.v];
    return lang === 'en' ? T.color[c.c] + ' ' + num : num + ' ' + T.color[c.c].toLowerCase();
  };
  const anunciar = texto => hablar(texto, lang === 'en' ? 'en-US' : 'es-MX', 1);
  const sig = (desde, pasos = 1) => ((desde + dir * pasos) % manos.length + manos.length) % manos.length;
  const cartaHtml = (c, extra) => '<span class="una-card' + (extra || '') + '" style="--c:' + (c.c ? UNA_COLOR[c.c] : '#1e1b2e') + '">' + (c.c ? '' : '<span class="una-wild"></span>') + '<b>' + escapeHtml(unaSimbolo(c.v)) + '</b></span>';

  function dibujar() {
    if (terminado) return;
    const tuTurno = turno === 0 && !esperandoUna;
    const anim = c => { const k = nuevas.indexOf(c); return k < 0 ? '' : ' nueva" style="--k:' + k; }; // basta-divertida-una-robo
    const sentido = (lang === 'en' ? 'dir ' : 'sentido ') + (dir === 1 ? '↻' : '↺');
    m.body.innerHTML =
      '<div class="una-bots">' + manos.slice(1).map((h, k) => '<div class="una-bot' + (turno === k + 1 ? ' activo' : '') + '"><span>' + escapeHtml(nombres[k + 1]) + '</span><span>🂠 × ' + h.length + (h.length === 1 ? ' <b class="una-dijo">' + escapeHtml(T.una) + '</b>' : '') + '</span></div>').join('') + '</div>' +
      '<div class="una-mesa"><div>' + cartaHtml(top(), ' grande') + '<div class="muted" style="text-align:center">' + escapeHtml(T.color[color]) + ' <span class="una-dot" style="background:' + UNA_COLOR[color] + '"></span></div></div>' +
      '<button class="una-mazo" data-una="robar"' + (tuTurno && !robada && hayParaRobar() ? '' : ' disabled') + '>🂠<small>' + escapeHtml(T.robar) + ' (' + mazo.length + ')</small></button></div>' +
      '<div class="feedback" id="una-msg">' + escapeHtml(msg || (tuTurno ? T.tu + ' · ' + sentido : '…')) + '</div>' +
      '<div class="una-mano">' + manos[0].map((c, i) => '<button class="una-btn' + (c === robada ? ' robada' : '') + anim(c) + '" data-una-card="' + i + '"' + (tuTurno && valida(c) && (!robada || robada === c) ? '' : ' data-no="1"') + ' aria-label="' + escapeHtml(nombreCarta(c)) + '">' + cartaHtml(c, tuTurno && valida(c) && (!robada || robada === c) ? ' jugable' : '') + '</button>').join('') + '</div>' +
      '<div class="row-btns">' + (robada || (tuTurno && !hayParaRobar() && !manos[0].some(valida)) ? '<button class="btn ghost" data-una="pasar">' + escapeHtml(T.pasar) + '</button>' : '') +
      '<button class="btn una-grito' + (esperandoUna ? ' pulsa' : '') + '" data-una="una"' + (esperandoUna ? '' : ' disabled') + '>📣 ' + escapeHtml(T.una) + '</button></div>';
    nuevas = [];
  }

  function fin(ganador) {
    terminado = true; limpiar();
    const restantes = manos.slice(1).reduce((a, h) => a + h.length, 0);
    const gano = ganador === 0;
    const puntos = gano ? Math.min(1000, 400 + restantes * 10) : jugadas * 5;
    terminar('una', { puntos, aciertos: jugadas, total: jugadas + manos[0].length, segundos: (Date.now() - t0) / 1000,
      titulo: gano ? '🏆 ¡Ganaste la partida!' : '😅 Ganó ' + nombres[ganador], detalle: gano ? 'A tus rivales les quedaron ' + restantes + ' cartas.' : 'Jugaste ' + jugadas + ' cartas. ¡La próxima es tuya!' });
  }

  function aplicar(j, c) {
    pila.push(c); if (c.c) color = c.c;
    anunciar(nombreCarta(c) + (c.c ? '' : ', ' + T.color[color]));
    if (!manos[j].length) return fin(j);
    let pasos = 1;
    if (c.v === 'skip') pasos = 2;
    if (c.v === 'rev') { if (manos.length === 2) pasos = 2; else dir *= -1; }
    if (c.v === '+2') { robar(sig(j), 2); pasos = 2; }
    if (c.v === '+4') { robar(sig(j), 4); pasos = 2; }
    turno = sig(j, pasos);
    programar();
  }

  function programar() {
    if (terminado) return;
    dibujar();
    if (turno !== 0) { const t = setTimeout(turnoBot, 2500 * TIEMPO); limpiezas.push(() => clearTimeout(t)); } /* ritmo más lento (ajuste del profe) */
  }

  function turnoBot() {
    if (terminado) return;
    const j = turno, mano = manos[j];
    const siguiente = manos[sig(j)].length;
    let opciones = mano.filter(valida), robo = 0;
    // basta-divertida-una-robo: sin carta jugable, roba hasta sacar una que sirva (sin rebarajar el descarte).
    const cartas = n => {
      if (lang === 'en') return n + (n === 1 ? ' card' : ' cards');
      return n + (n === 1 ? ' carta' : ' cartas');
    };
    if (!opciones.length) {
      const r = Una.robarHastaPoder(mazo, mano, valida); robo = r.robadas.length;
      if (r.jugable) opciones = [r.jugable];
      else {
        let sinJugada;
        if (lang === 'en') sinJugada = robo ? ' drew ' + cartas(robo) + ' and the deck ran out' : ' has nothing to play and the deck is empty';
        else sinJugada = robo ? ' robó ' + cartas(robo) + ' y se acabó el mazo' : ' no tiene carta y el mazo está vacío';
        msg = nombres[j] + sinJugada; turno = sig(j); return programar();
      }
    }
    const accion = opciones.filter(c => ['skip', '+2', '+4', 'rev'].includes(c.v));
    const numeros = opciones.filter(c => c.c && /^\d$/.test(c.v));
    // Bots amables: solo a veces castigan a quien tiene pocas cartas, para que el juego sea retador pero ganable.
    const castiga = siguiente <= 2 && accion.length && Math.random() < 0.4;
    const c = castiga ? accion[0] : (numeros[0] || opciones.find(x => x.c) || opciones[0]);
    mano.splice(mano.indexOf(c), 1);
    if (!c.c) { const cuenta = { r: 0, y: 0, g: 0, b: 0 }; mano.forEach(x => { if (x.c) cuenta[x.c]++; }); color = Object.entries(cuenta).sort((a, b) => b[1] - a[1])[0][0]; }
    let jugo = ': ';
    if (robo) jugo = lang === 'en' ? ' drew ' + cartas(robo) + ' and played ' : ' robó ' + cartas(robo) + ' y tiró ';
    msg = nombres[j] + jugo + nombreCarta(c) + (mano.length === 1 ? ' · ' + T.una : '');
    aplicar(j, c);
  }

  function jugarCarta(i, colorElegido) {
    const c = manos[0][i];
    manos[0].splice(i, 1); jugadas++; robada = null;
    if (!c.c) color = colorElegido;
    msg = (lang === 'en' ? 'You: ' : 'Tú: ') + nombreCarta(c);
    if (manos[0].length === 1) {
      esperandoUna = true;
      pila.push(c); if (c.c) color = c.c;
      anunciar(nombreCarta(c));
      const tJugada = Date.now();
      msg = lang === 'en' ? '📣 Press UNA now! The longer you wait, the more cards you draw' : '📣 ¡Presiona UNA ya! Entre más tardes, más cartas robas';
      dibujar();
      // Castigo por segundos: ≤2 s 0, ≤3 s +1, ≤4 s +2, ≤5 s +3, sin presionar +4
      resolverUna = presiono => {
        if (!esperandoUna) return;
        esperandoUna = false; clearTimeout(t); pila.pop();
        const n = castigoUna(presiono ? (Date.now() - tJugada) / (1000 * TIEMPO) : Infinity);
        if (n) { robar(0, n); msg = (lang === 'en' ? '⚠️ Too slow on UNA! +' : '⚠️ ¡Tardaste en presionar UNA! +') + n + (lang === 'en' ? ' card(s)' : ' carta(s)'); sonidoMal(); }
        else { msg = lang === 'en' ? '✔ UNA on time!' : '✔ ¡UNA a tiempo!'; sonidoOk(); }
        aplicar(0, c);
      };
      const t = setTimeout(() => resolverUna(false), 5000 * TIEMPO);
      limpiezas.push(() => clearTimeout(t));
      return;
    }
    aplicar(0, c);
  }

  m.body.addEventListener('click', e => {
    if (terminado) return;
    const a = e.target.closest('[data-una]'), k = e.target.closest('[data-una-card]'), col = e.target.closest('[data-una-color]');
    if (a && a.dataset.una === 'una' && esperandoUna) { resolverUna(true); return; }
    if (turno !== 0 || esperandoUna) return;
    if (col) return jugarCarta(Number(col.dataset.idx), col.dataset.unaColor);
    if (a && a.dataset.una === 'robar' && !robada) {
      // basta-divertida-una-robo: roba hasta sacar una que sí puedas tirar; si el mazo se acaba, sigue el siguiente.
      const r = Una.robarHastaPoder(mazo, manos[0], valida);
      nuevas = r.robadas;
      msg = (r.robadas.length ? '🂠 ' : '') + Una.avisoRobo(r.robadas.length, r.jugable, lang) + (r.jugable ? ' · 🆕 ' + nombreCarta(r.jugable) : '');
      if (r.jugable) { robada = r.jugable; dibujar(); } else { turno = sig(0); programar(); }
      return;
    }
    if (a && a.dataset.una === 'pasar') { robada = null; turno = sig(0); msg = ''; return programar(); }
    if (k) {
      const i = Number(k.dataset.unaCard), c = manos[0][i];
      if (!valida(c) || (robada && robada !== c)) {
        sonidoMal(); document.getElementById('una-msg').className = 'feedback bad';
        let aviso;
        if (robada) aviso = lang === 'en' ? 'Play the card you drew or pass' : 'Solo puedes jugar la que robaste o pasar';
        else if (lang === 'en') aviso = 'Match ' + T.color[color].toLowerCase() + ' or ' + unaSimbolo(top().v);
        else aviso = 'Debe ser ' + T.color[color].toLowerCase() + ' o ' + unaSimbolo(top().v);
        document.getElementById('una-msg').textContent = aviso;
        return;
      }
      if (!c.c) {
        document.getElementById('una-msg').innerHTML = (lang === 'en' ? 'Choose a color: ' : 'Elige color: ') + ['r', 'y', 'g', 'b'].map(x => '<button class="una-color" data-una-color="' + x + '" data-idx="' + i + '" style="background:' + UNA_COLOR[x] + '" aria-label="' + T.color[x] + '"></button>').join('');
        return;
      }
      jugarCarta(i);
    }
  });
  limpiezas.push(() => { terminado = true; });
  programar();
}

// ---------- Clásicos: Lotería ----------
function elegirLoteria() {
  const m = marco('loteria', { menu: true }); // menú: aún no es partida (openspec: juegos-recarga)
  m.body.innerHTML = '<div class="q-card"><div class="big">🎴</div><div class="q">Lotería mexicana</div><div class="sub">Escucha al gritón, marca con 🫘 las cartas que salgan en tu tabla y grita «¡Lotería!»</div></div>' +
    '<label>Modo</label><div class="opts"><button class="opt" data-lot-modo="linea" aria-pressed="true">➖ Línea (rápido)</button><button class="opt" data-lot-modo="llena">🟩 Tabla llena</button></div>' +
    '<label>Voz del gritón</label><div class="opts" style="grid-template-columns:repeat(3,1fr)"><button class="opt" data-lot-voz="es">Español</button><button class="opt" data-lot-voz="ambos" aria-pressed="true">Bilingüe</button><button class="opt" data-lot-voz="en">English</button></div>' +
    '<div class="row-btns"><button class="btn" data-lot-go>¡Corre y se va!</button></div>';
  let modo = 'linea', voz = 'ambos';
  m.body.addEventListener('click', e => {
    const a = e.target.closest('[data-lot-modo]'), v = e.target.closest('[data-lot-voz]');
    if (a) { modo = a.dataset.lotModo; m.body.querySelectorAll('[data-lot-modo]').forEach(x => x.setAttribute('aria-pressed', String(x === a))); }
    if (v) { voz = v.dataset.lotVoz; m.body.querySelectorAll('[data-lot-voz]').forEach(x => x.setAttribute('aria-pressed', String(x === v))); }
    if (e.target.closest('[data-lot-go]')) jugarLoteria(modo, voz);
  });
}

// Líneas de una tabla 4×4: 4 filas, 4 columnas y 2 diagonales.
const LINEAS = [0, 1, 2, 3].map(r => [0, 1, 2, 3].map(c => r * 4 + c)).concat([0, 1, 2, 3].map(c => [0, 1, 2, 3].map(r => r * 4 + c)), [[0, 5, 10, 15], [3, 6, 9, 12]]);
const cumple = (marcas, modo) => modo === 'llena' ? marcas.every(Boolean) : LINEAS.some(l => l.every(i => marcas[i]));

async function jugarLoteria(modo, voz) {
  const d = await datos('loteria');
  const cartas = d.cartas;
  const m = marco('loteria');
  const tabla = tomar(cartas.map((_, i) => i), 16);
  const bots = [{ n: 'Doña Tere 👵' }, { n: 'Don Beto 👴' }].map(b => Object.assign(b, { tabla: tomar(cartas.map((_, i) => i), 16), marcas: new Array(16).fill(false) }));
  const marcas = new Array(16).fill(false);
  const orden = barajar(cartas.map((_, i) => i));
  const salidas = new Set();
  let k = 0, terminado = false, botGrito = null;
  const t0 = Date.now();
  const cantar = c => {
    if (voz === 'es') hablar(c.es, 'es-MX', 1);
    else if (voz === 'en') hablar(c.en, 'en-US', .95);
    else { hablar(c.es, 'es-MX', 1); setTimeout(() => { if (!terminado && window.speechSynthesis) { const u = new SpeechSynthesisUtterance(c.en); u.lang = 'en-US'; u.rate = .95; speechSynthesis.speak(u); } }, 50); }
  };
  m.body.innerHTML = '<div class="lot-top"><div class="lot-carta" id="lot-carta"><div class="big">🎴</div><div class="q">¡Atención!</div></div>' +
    '<div class="lot-lado"><div class="muted">Salieron <b id="lot-n">0</b>/54</div><div class="lot-hist" id="lot-hist"></div>' + bots.map((b, i) => '<div class="lot-bot">' + escapeHtml(b.n) + ' <b id="lot-b' + i + '">0</b>/16</div>').join('') + '</div></div>' +
    '<div class="lot-grid">' + tabla.map((ci, i) => '<button class="lot-cell" data-lot="' + i + '"><span class="em">' + escapeHtml(cartas[ci].emoji) + '</span><span class="nm">' + escapeHtml(cartas[ci].es) + '</span></button>').join('') + '</div>' +
    '<div class="feedback" id="lot-msg">' + (modo === 'llena' ? 'Modo: tabla llena' : 'Modo: una línea (fila, columna o diagonal)') + '</div>' +
    '<div class="row-btns"><button class="btn una-grito" data-lot-grito>🎉 ¡Lotería!</button></div>';
  const $m = document.getElementById('lot-msg');
  function acabar(gano, quien) {
    if (terminado) { return; } terminado = true; limpiar();
    const bien = marcas.filter(Boolean).length;
    const faltan = 54 - salidas.size;
    const baseGano = modo === 'llena' ? 500 : 300;
    const puntos = gano ? Math.min(1000, baseGano + faltan * 10) : bien * 10;
    let titulo = '🎴 Se acabaron las cartas';
    if (gano) titulo = '🎉 ¡LOTERÍA!';
    else if (quien) titulo = '😮 ¡Lotería de ' + quien + '!';
    terminar('loteria', { puntos, aciertos: bien, total: 16, segundos: (Date.now() - t0) / 1000,
      titulo,
      detalle: gano ? 'Ganaste con ' + salidas.size + ' cartas cantadas.' : 'Marcaste ' + bien + ' de 16 casillas.' });
  }
  function siguiente() {
    if (terminado) return;
    if (k >= orden.length) return acabar(false, null);
    const ci = orden[k++]; salidas.add(ci);
    const c = cartas[ci];
    document.getElementById('lot-carta').innerHTML = '<div class="big">' + escapeHtml(c.emoji) + '</div><div class="q">' + c.n + '. ' + escapeHtml(c.es) + '</div><div class="sub"><i>' + escapeHtml(c.en) + '</i></div><div class="sub">«' + escapeHtml(c.verso) + '»</div>';
    document.getElementById('lot-n').textContent = salidas.size;
    document.getElementById('lot-hist').innerHTML = orden.slice(Math.max(0, k - 6), k - 1).reverse().map(i => '<span title="' + escapeHtml(cartas[i].es) + '">' + escapeHtml(cartas[i].emoji) + '</span>').join('');
    cantar(c);
    bots.forEach((b, i) => {
      const p = b.tabla.indexOf(ci); if (p >= 0) b.marcas[p] = true;
      document.getElementById('lot-b' + i).textContent = b.marcas.filter(Boolean).length;
      if (!botGrito && cumple(b.marcas, modo)) {
        botGrito = b.n;
        const t = setTimeout(() => acabar(false, b.n), 1500 * TIEMPO);
        limpiezas.push(() => clearTimeout(t));
      }
    });
  }
  m.body.addEventListener('click', e => {
    if (terminado) return;
    const cel = e.target.closest('[data-lot]');
    if (cel) {
      const i = Number(cel.dataset.lot);
      if (salidas.has(tabla[i])) { marcas[i] = true; cel.classList.add('marcada'); tono(520, 60); }
      else { cel.classList.remove('tiembla'); cel.getBoundingClientRect(); /* reflujo: reinicia la animación */ cel.classList.add('tiembla'); $m.className = 'feedback bad'; $m.textContent = '¡Esa carta todavía no sale!'; }
      return;
    }
    if (e.target.closest('[data-lot-grito]')) {
      if (cumple(marcas, modo)) { sonidoOk(); acabar(true); }
      else { sonidoMal(); $m.className = 'feedback bad'; $m.textContent = 'Aún no tienes lotería 😉 ' + (modo === 'llena' ? 'Necesitas la tabla llena.' : 'Necesitas una línea completa.'); }
    }
  });
  const iv = setInterval(siguiente, 4500 * TIEMPO);
  limpiezas.push(() => clearInterval(iv));
  siguiente();
}
