// Juegos · naipes (openspec: organizar-codigo).
// Póker Texas Hold'em y baraja española (Brisca y Conquián) contra bots; HTML de cartas y fichas que también usan las salas.
// Script clásico (sin build ni módulos ES): juegos.html lo carga en orden y todos comparten el ámbito global
// (const/let/function de nivel superior). Ver docs/frontend-standards.md, «Estructura de juegos/app/».
// ---------- Clásicos: Póker Texas Hold'em (openspec: poker). Motor en juegos/cartas.js; fichas sin valor real ----------
const PK_BOTS = [{ nombre: 'Vesper', emoji: '💎' }, { nombre: 'Le Chiffre', emoji: '🃏' }, { nombre: 'Felix', emoji: '🎩' }, { nombre: 'Mathis', emoji: '🍸' }];
const PK_VERBO = { retirarse: 'se retira', pasar: 'pasa', igualar: 'iguala', subir: 'sube a', todo: '¡va con todo!' };
const pkCarta = (id, extra) => {
  if (id === null) return '<span class="pk-carta vacia' + (extra || '') + '"></span>';
  if (id === undefined) return '<span class="pk-carta oculta' + (extra || '') + '">·</span>';
  return '<span class="pk-carta' + (Cartas.esRoja(id) ? ' roja' : '') + (extra || '') + '" aria-label="' + Cartas.nombreCarta(id) + '">' + Cartas.nombreCarta(id) + '</span>';
};
// Puntos del póker: fichas × 2 ÷ jugadores (tope 1000) y +150 al equipo o pareja ganadora. El × 2 (1000 ÷ 500 fichas
// iniciales) deja la escala igual que cuando se empezaba con 1,000 (openspec: poker-fichas).
function pkPuntos(st, equipos) {
  const n = st.jugadores.length, factor = 1000 / Cartas.FICHAS_INICIALES;
  const base = st.jugadores.map(j => Math.min(1000, Math.round(j.fichas * factor / n)));
  if (!equipos) return { puntos: base, eq: null };
  const tot = [0, 1].map(k => st.jugadores.reduce((a, j, i) => a + (equipos[i] === k ? j.fichas : 0), 0));
  let gana = 1;
  if (tot[0] === tot[1]) gana = -1;
  else if (tot[0] > tot[1]) gana = 0;
  return { puntos: base.map((p, i) => equipos[i] === gana ? Math.min(1000, p + 150) : p), eq: { tot, gana } };
}
function pkContar(st, ganadas) { if (st.fase === 'fin' && st.resultado && !st.resultado.contado) { st.resultado.contado = true; st.resultado.ganadores.forEach(g => { ganadas[g] = (ganadas[g] || 0) + 1; }); } }
function pkUltima(st, nombre) {
  const u = st.ultima; if (!u) return '';
  let monto = '';
  if (u.accion === 'subir') monto = ' ' + fmt(u.apuesta);
  else if (u.accion === 'igualar') monto = ' (' + fmt(u.apuesta) + ')';
  return escapeHtml(nombre(u.j)) + ' ' + PK_VERBO[u.accion] + monto + (u.auto ? ' ⏰' : '');
}
// Mesa compartida por el modo individual y la partida: asientos, comunes, bote y botonera.
function pkMesaHtml(st, o) {
  const yo = o.yo, fin = st.fase === 'fin', res = st.resultado;
  const ganadorCartas = new Set(fin && res && res.mostrar ? res.ganadores.flatMap(g => res.manos[g] ? res.manos[g].cartas : []) : []);
  const ver = i => i === yo || (fin && res && res.mostrar && !st.fuera[i]);
  const asiento = i => {
    const j = st.jugadores[i], fuera = st.fuera && st.fuera[i];
    const tags = (i === st.boton ? '<span class="pk-tag">D</span>' : '') + (o.equipos ? '<span class="pk-tag eq' + 'AB'[o.equipos[i]] + '">' + 'AB'[o.equipos[i]] + '</span>' : '') +
      (j.fichas === 0 && !fuera && st.cartas && st.cartas[i].length && !fin ? '<span class="pk-tag">ALL-IN</span>' : '');
    const cartas = st.cartas && st.cartas[i] && st.cartas[i].length ? st.cartas[i].map(c => pkCarta(ver(i) ? c : undefined, ' chica' + (ganadorCartas.has(c) ? ' gana' : ''))).join(' ') : '';
    let extra = '';
    if (fin && res) {
      const conMano = res.mostrar && res.manos[i];
      const nombreMano = conMano ? escapeHtml(res.manos[i].nombre) : '';
      if (res.premios[i] > 0) extra = '<b style="color:var(--ok)">+' + fmt(res.premios[i]) + '</b>' + (conMano ? ' · ' + nombreMano : '');
      else extra = nombreMano;
    } else if (st.apuesta && st.apuesta[i]) extra = pkPilaHtml(st.apuesta[i], true) + ' apuesta ' + fmt(st.apuesta[i]);
    else if (fuera) extra = 'retirado';
    return '<div class="pk-asiento' + (!fin && st.turno === i && !st.terminada ? ' turno' : '') + (fuera || j.fichas === 0 && (!st.cartas || !st.cartas[i].length) ? ' fuera' : '') + '"><span class="n">' + o.avatar(i) + escapeHtml(o.nombre(i)) + tags + '</span>' +
      '<span class="pk-fichas">🪙 ' + fmt(j.fichas) + '</span><span>' + cartas + '</span><span class="muted">' + extra + '</span></div>';
  };
  const bote = fin && res ? res.bote : Cartas.bote(st);
  const comunes = [0, 1, 2, 3, 4].map(k => pkCarta(st.comunes && k < st.comunes.length ? st.comunes[k] : null, ganadorCartas.has(st.comunes && st.comunes[k]) ? ' gana' : '')).join('');
  let msg;
  if (fin && res) msg = '🏆 ' + res.ganadores.map(g => escapeHtml(o.nombre(g))).join(' y ') + ' gana' + (res.ganadores.length > 1 ? 'n' : '') + ' ' + fmt(res.bote) + (res.mostrar ? ' con ' + escapeHtml(res.manos[res.ganadores[0]].nombre) : ' (los demás se retiraron)');
  else msg = pkUltima(st, o.nombre) || '¡Se reparten las cartas!';
  let botones = '';
  if (o.miTurno) {
    const op = Cartas.opciones(st);
    const conFichas = op.puedeSubir && op.minSubir < op.maxSubir; // si solo cabe ir con todas las fichas, queda solo el botón «🔥»
    botones = '<div class="pk-botones"><button class="btn ghost" data-pk="retirarse">🏳️ Retirarme</button>' +
      (op.pasar ? '<button class="btn ghost" data-pk="pasar">✋ Pasar</button>' : '<button class="btn ghost" data-pk="igualar">🤝 Igualar ' + fmt(op.igualar) + '</button>') +
      (conFichas ? '<button class="btn ghost" data-pk-abrir aria-expanded="false" aria-controls="pk-subir">⬆️ Subir</button>' : '') +
      '<button class="btn" data-pk="todo">🔥 Todo (' + fmt(op.maxSubir) + ')</button></div>' +
      (conFichas ? pkSelectorHtml(st.apuestaMax, op.minSubir - st.apuestaMax, op.maxSubir - st.apuestaMax) : '');
  }
  return '<div class="pk-asientos">' + st.jugadores.map((_, i) => i).filter(i => i !== yo).map(asiento).join('') + '</div>' +
    '<div class="pk-mesa"><div class="pk-titulo">♠ Casino Royale ♥</div><div class="pk-comunes">' + comunes + '</div>' +
    (bote > 0 ? '<div class="pk-pozo">' + pkPilaHtml(bote) + '</div>' : '') +
    '<div class="pk-bote">🪙 Pozo ' + fmt(bote) + ' · ciegas ' + st.ciegas.join('/') + ' · mano ' + (st.mano + 1) + '/' + st.manos + '</div><div class="pk-msg" id="pk-msg">' + msg + '</div></div>' +
    (yo >= 0 ? '<div class="pk-yo">' + asiento(yo) + '</div>' : '') + (o.pie || '') + botones +
    '<div class="row-btns" style="margin-top:8px"><button class="btn ghost sm" data-ayuda="poker">📖 Cómo se juega</button></div>';
}
// ---- Fichas de 5, 10, 20, 50 y 100 (openspec: poker-fichas) ----
// c: color, s: franjas del canto, t: número. Colores clásicos de casino.
const PK_FICHAS = [{ v: 5, c: '#dc2626', s: '#fff', t: '#fff' }, { v: 10, c: '#2563eb', s: '#fff', t: '#fff' }, { v: 20, c: '#16a34a', s: '#fff', t: '#fff' },
  { v: 50, c: '#ea580c', s: '#fff', t: '#fff' }, { v: 100, c: '#111827', s: '#fbbf24', t: '#fde68a' }];
const pkEstiloFicha = f => '--c:' + f.c + ';--s:' + f.s + ';--t:' + f.t;
// Pila vista de lado: una columna por color, hasta 6 fichas visibles (con «×n» si hay más). Decorativa: el número va
// escrito al lado. `cuenta` = { valor: cuántas }; sin ella se arma `monto` de la ficha más grande a la más chica.
function pkPilaHtml(monto, chica, cuenta, nueva) {
  let resto = monto;
  const c = cuenta || {};
  if (!cuenta) for (const f of PK_FICHAS.slice().reverse()) { c[f.v] = Math.floor(resto / f.v); resto -= c[f.v] * f.v; }
  const cols = PK_FICHAS.filter(f => c[f.v] > 0).map(f => {
    const n = c[f.v], vis = Math.min(n, 6);
    return '<span class="pk-col" style="' + pkEstiloFicha(f) + '">' + Array.from({ length: vis }, (_, k) => '<span class="pk-mini' + (nueva === f.v && k === vis - 1 ? ' nueva' : '') + '"></span>').join('') + (n > 6 ? '<i>×' + n + '</i>' : '') + '</span>';
  });
  if (!cols.length) return '';
  return '<span class="pk-pila' + (chica ? ' chica' : '') + '" aria-hidden="true">' + cols.join('') + '</span>';
}
// Selector: base = apuesta más alta; el aumento va de min a max (de Cartas.opciones). Estado en data-* del propio panel.
function pkSelectorHtml(base, min, max) {
  return '<section class="pk-subir" id="pk-subir" hidden aria-label="Subir con fichas" data-base="' + base + '" data-min="' + min + '" data-max="' + max + '" data-aum="0" data-fichas="{}">' +
    '<div class="pk-subir-cab"><span>Subes<b class="pk-aum" id="pk-aum" aria-live="polite">+0</b></span><span class="pk-total" id="pk-total">Tu apuesta: ' + fmt(base) + '</span></div>' +
    '<div class="pk-pila-sel" id="pk-pila"><span class="pk-vacio">Toca las fichas para armar tu subida</span></div>' +
    '<div class="pk-fichero" role="group" aria-label="Fichas">' + PK_FICHAS.map(f => '<button type="button" class="pk-ficha" data-pk-ficha="' + f.v + '" aria-label="Ficha de ' + f.v + '" style="' + pkEstiloFicha(f) + '"' + (f.v > max ? ' disabled' : '') + '><span>' + f.v + '</span></button>').join('') + '</div>' +
    '<div class="pk-subir-ayuda" id="pk-subir-ayuda">Mínimo +' + fmt(min) + ' · máximo +' + fmt(max) + '</div>' +
    '<div class="pk-subir-pie"><button type="button" class="btn ghost sm" data-pk-limpiar>↺ Limpiar</button><button class="btn sm" data-pk="subir" disabled>✅ Apostar</button></div></section>';
}
function pkSelectorPintar(s, cuenta, nueva) {
  const aum = PK_FICHAS.reduce((a, f) => a + (cuenta[f.v] || 0) * f.v, 0);
  const base = Number(s.dataset.base), min = Number(s.dataset.min), max = Number(s.dataset.max);
  s.dataset.aum = aum; s.dataset.fichas = JSON.stringify(cuenta);
  s.querySelector('#pk-aum').textContent = '+' + fmt(aum);
  s.querySelector('#pk-total').textContent = 'Tu apuesta: ' + fmt(base + aum);
  s.querySelector('#pk-pila').innerHTML = pkPilaHtml(aum, false, cuenta, nueva) || '<span class="pk-vacio">Toca las fichas para armar tu subida</span>';
  s.querySelectorAll('[data-pk-ficha]').forEach(b => { b.disabled = aum + Number(b.dataset.pkFicha) > max; });
  s.querySelector('[data-pk="subir"]').disabled = aum < min;
}
// Un solo escucha para individual y sala: abrir, agregar una ficha y limpiar. «✅ Apostar» es data-pk="subir".
document.addEventListener('click', e => {
  const s = document.getElementById('pk-subir'); if (!s) return;
  const abrir = e.target.closest('[data-pk-abrir]');
  if (abrir) {
    s.hidden = !s.hidden; abrir.setAttribute('aria-expanded', String(!s.hidden));
    if (!s.hidden) { const f = s.querySelector('[data-pk-ficha]:not(:disabled)'); if (f) { f.focus({ preventScroll: true }); } s.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
    return;
  }
  if (e.target.closest('[data-pk-limpiar]')) { pkSelectorPintar(s, {}); tono(330, 60); return; }
  const b = e.target.closest('[data-pk-ficha]'); if (!b || b.disabled) return;
  const v = Number(b.dataset.pkFicha), cuenta = JSON.parse(s.dataset.fichas || '{}');
  if (Number(s.dataset.aum) + v > Number(s.dataset.max)) return;
  cuenta[v] = (cuenta[v] || 0) + 1;
  pkSelectorPintar(s, cuenta, v);
  b.classList.remove('toque'); b.getBoundingClientRect(); /* reflujo: reinicia la animación */ b.classList.add('toque');
  tono(620 + v * 2, 45, 'triangle', .06);
});
const pkJugadaDe = b => {
  if (b.dataset.pk !== 'subir') return { accion: b.dataset.pk };
  const s = document.getElementById('pk-subir');
  return { accion: 'subir', monto: Number(s.dataset.base) + Number(s.dataset.aum) };
};

function elegirPoker() {
  const m = marco('poker', { menu: true }); // menú: aún no es partida (openspec: juegos-recarga)
  m.body.innerHTML = '<div class="q-card"><div class="big">♠️♥️♣️♦️</div><div class="q">Póker Texas Hold\'em</div><div class="sub">Estilo Casino Royale: 500 fichas cada quien y 10 manos. Para subir, usa fichas de 5, 10, 20, 50 y 100. Las fichas son de juego, no tienen valor.</div></div>' +
    '<label>Modo</label><div class="opts"><button class="opt" data-pk-modo="solo" aria-pressed="true">🎩 Solo contra la mesa</button><button class="opt" data-pk-modo="pareja">🤝 En pareja con Vesper</button></div>' +
    '<div id="pk-rivales"><label>Rivales</label><div class="opts" style="grid-template-columns:repeat(4,1fr)">' + [1, 2, 3, 4].map(n => '<button class="opt" data-pk-bots="' + n + '"' + (n === 3 ? ' aria-pressed="true"' : '') + '>' + n + '</button>').join('') + '</div></div>' +
    '<div class="row-btns"><button class="btn ghost" data-ayuda="poker">📖 Cómo se juega</button><button class="btn" data-pk-go>🃏 Repartir</button></div>';
  let bots = 3, pareja = false;
  m.body.addEventListener('click', e => {
    const b = e.target.closest('[data-pk-bots]'), md = e.target.closest('[data-pk-modo]');
    if (b) { bots = Number(b.dataset.pkBots); m.body.querySelectorAll('[data-pk-bots]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); }
    if (md) { pareja = md.dataset.pkModo === 'pareja'; m.body.querySelectorAll('[data-pk-modo]').forEach(x => x.setAttribute('aria-pressed', String(x === md))); document.getElementById('pk-rivales').hidden = pareja; }
    if (e.target.closest('[data-pk-go]')) jugarPoker(pareja ? 3 : bots, pareja);
  });
}

function jugarPoker(numBots, pareja) {
  const m = marco('poker');
  const bots = PK_BOTS.slice(0, numBots);
  const st = Cartas.pokerNueva([{ id: 'yo', nombre: 'Tú' }].concat(bots.map((b, i) => ({ id: 'b' + i, nombre: b.nombre, bot: true }))), { manos: 10 }); // 500 fichas (Cartas.FICHAS_INICIALES)
  const equipos = pareja ? [0, 0, 1, 1] : null;
  const nombre = i => i === 0 ? 'Tú' : bots[i - 1].nombre;
  const avatar = i => i === 0 ? '🙂 ' : bots[i - 1].emoji + ' ';
  const ganadas = {}; const t0 = Date.now();
  let terminado = false;
  // emocion-sonora: ir con todo sube la tensión; al cerrar la mano, victoria o derrota (o logro si ganaste sin ir con todo).
  let conTodo = false;
  const pkEmocionFin = gano => {
    window.Emocion?.intensidad(0);
    if (conTodo) { if (gano) window.Emocion?.victoria(); else window.Emocion?.derrota(); }
    else if (gano && !window.Emocion?.logro()) sonidoOk();
    conTodo = false;
  };
  const pintar = () => {
    if (terminado) return;
    const miTurno = st.fase !== 'fin' && st.turno === 0;
    let pie = '';
    if (st.fase === 'fin') pie = '<div class="row-btns"><button class="btn" data-pk-sig>' + (st.jugadores[0].fichas <= 0 || st.mano + 1 >= st.manos ? '🏁 Ver resultado' : '➡️ Siguiente mano') + '</button></div>';
    m.body.innerHTML = pkMesaHtml(st, { yo: 0, nombre, avatar, equipos, miTurno, pie });
    m.puntos(st.jugadores[0].fichas);
  };
  const fin = () => {
    terminado = true;
    const { puntos, eq } = pkPuntos(st, equipos);
    const mano = st.mano + 1;
    let titulo;
    if (st.jugadores[0].fichas <= 0) titulo = '💸 Te quedaste sin fichas';
    else if (!eq) titulo = '♠️ ¡Fin de la partida!';
    else if (eq.gana === 0) titulo = '🤝 ¡Ganó tu pareja!';
    else if (eq.gana === 1) titulo = '😅 Ganó la otra pareja';
    else titulo = '🤝 Empate entre parejas';
    terminar('poker', { puntos: puntos[0], aciertos: ganadas[0] || 0, total: mano, segundos: (Date.now() - t0) / 1000,
      titulo,
      detalle: 'Terminaste con 🪙 ' + fmt(st.jugadores[0].fichas) + ' fichas · ganaste ' + (ganadas[0] || 0) + ' de ' + mano + ' manos' + (eq ? ' · pareja ' + fmt(eq.tot[0]) + ' vs ' + fmt(eq.tot[1]) : '') + '.' });
  };
  let auto = null;
  const siguienteMano = () => {
    clearTimeout(auto);
    if (st.jugadores[0].fichas <= 0) return fin();
    Cartas.pokerMano(st);
    if (st.terminada) return fin();
    programar();
  };
  function programar() {
    if (terminado) return;
    pkContar(st, ganadas);
    pintar();
    if (st.fase === 'fin') {
      pkEmocionFin(st.resultado.premios[0] > 0); // emocion-sonora
      auto = setTimeout(() => { if (!terminado) siguienteMano(); }, 10000 * TIEMPO); /* ritmo más lento (ajuste del profe) */ limpiezas.push(() => clearTimeout(auto));
      return;
    }
    if (st.turno !== 0) { const t = setTimeout(() => { if (terminado) { return; } Cartas.pokerActuar(st, Cartas.pokerBot(st)); tono(440, 60); programar(); }, 2000 * TIEMPO); limpiezas.push(() => clearTimeout(t)); }
  }
  m.body.addEventListener('click', e => {
    if (terminado) return;
    if (e.target.closest('[data-pk-sig]')) return siguienteMano();
    const b = e.target.closest('[data-pk]');
    if (!b || st.fase === 'fin' || st.turno !== 0) return;
    if (!Cartas.pokerActuar(st, pkJugadaDe(b))) { sonidoMal(); return; }
    if (b.dataset.pk === 'todo') { conTodo = true; window.Emocion?.suspenso(1500); window.Emocion?.intensidad(0.6); } // emocion-sonora: vas con todo
    tono(520, 60); programar();
  });
  limpiezas.push(() => { terminado = true; });
  siguienteMano();
}

// ---------- Clásicos: baraja española — Brisca y Conquián (openspec: cartas-espanolas) ----------
// Diseño de la carta (openspec: cartas-espanolas-diseno): palos y figuras del sprite SVG del <body> (es-s0..3, es-f10..12).
const ES_FIG = { 10: 'SOTA', 11: 'CABALLO', 12: 'REY' };
// Posición (% del centro de la carta) de cada palo del 2 al 7, como en la baraja.
const ES_PIPS = {
  2: [[50, 16], [50, 84]], 3: [[50, 12], [50, 50], [50, 88]], 4: [[24, 16], [76, 16], [24, 84], [76, 84]],
  5: [[24, 14], [76, 14], [50, 50], [24, 86], [76, 86]], 6: [[24, 12], [76, 12], [24, 50], [76, 50], [24, 88], [76, 88]],
  7: [[24, 8], [76, 8], [50, 31], [24, 54], [76, 54], [24, 92], [76, 92]],
};
const esUso = (sym, cls, style) => '<svg class="' + cls + '"' + (style ? ' style="' + style + '"' : '') + ' aria-hidden="true" focusable="false"><use href="#' + sym + '"/></svg>';
// extra: clases (' chica', ' triunfo', ' entra', ' es-triunfo'…). null = lugar vacío; undefined = dorso.
function esCarta(id, extra) {
  extra = extra || '';
  if (id === null) return '<span class="es-carta vacia' + extra + '" aria-hidden="true"></span>';
  if (id === undefined) return '<span class="es-carta oculta' + extra + '" aria-hidden="true"></span>';
  const v = Cartas.espValor(id), pl = Cartas.espPalo(id), palo = 'es-s' + pl, mini = / chica\b/.test(extra);
  const esq = lado => '<span class="es-esq ' + lado + '"><b>' + v + '</b>' + esUso(palo, 'es-ico') + '</span>';
  let centro;
  if (ES_FIG[v]) centro = '<span class="es-retrato">' + esUso('es-f' + v, 'es-figura') + esUso(palo, 'es-sostiene') + '</span>' + (mini ? '' : '<span class="es-nombre">' + ES_FIG[v] + '</span>');
  else if (v === 1 || mini) centro = esUso(palo, 'es-pip es-as');
  else centro = ES_PIPS[v].map(([x, y]) => esUso(palo, 'es-pip', 'left:' + x + '%;top:' + y + '%')).join('');
  return '<span class="es-carta es-p' + pl + (ES_FIG[v] ? ' es-fig' : '') + extra + '" role="img" aria-label="' + escapeHtml(Cartas.nombreEsp(id)) + '">' +
    esq('a') + '<span class="es-centro">' + centro + '</span>' + esq('z') + '</span>';
}
// Mano en abanico: lista de { c, cls, attrs, extra }; el giro y el arco van en --r y --y, la superposición la pone el CSS.
function esManoHtml(lista) {
  const n = lista.length, paso = n > 5 ? 1.6 : 3, arco = n > 5 ? .5 : 1.4;
  return '<div class="es-mano" style="--n:' + n + '">' + lista.map((x, i) => {
    const k = i - (n - 1) / 2;
    return '<button type="button" class="es-btn' + (x.cls || '') + '"' + (x.attrs || '') + ' style="--r:' + (k * paso).toFixed(1) + 'deg;--y:' + (k * k * arco).toFixed(1) + 'px">' + esCarta(x.c, x.extra) + '</button>';
  }).join('') + '</div>';
}
const esCuantas = n => n + ' carta' + (n === 1 ? '' : 's');
const esDorsosHtml = n => '<span class="es-dorsos" role="img" aria-label="' + esCuantas(n) + '">' + new Array(n).fill(esCarta(undefined, ' chica')).join('') + '</span>';
// Mazo como pila de dorsos con contador; en Brisca el triunfo va girado debajo.
function esMazoHtml(n, triunfo) {
  const conTriunfo = triunfo !== undefined; // en Brisca, el triunfo es la última carta del mazo
  const etiqueta = 'Mazo: ' + esCuantas(n) + (conTriunfo ? '; triunfo: ' + Cartas.nombreEsp(triunfo) : '');
  const minimo = conTriunfo ? 1 : 0;
  const pila = n > minimo ? esCarta(undefined) : esCarta(null);
  return '<span class="es-mazo" role="img" aria-label="' + escapeHtml(etiqueta) + '">' + (conTriunfo ? esCarta(triunfo, ' triunfo') : '') + pila +
    '<span class="es-cuenta" aria-hidden="true">' + n + '</span></span>';
}
// Animación de llegada a la mesa: solo las cartas que no estaban en el último pintado de esa zona (el sondeo de la sala repinta).
const ES_VISTAS = {};
function esNuevas(zona, ids) { const antes = ES_VISTAS[zona] || []; ES_VISTAS[zona] = ids; return id => !antes.includes(id); }
const ordenMano = ids => ids.slice().sort((a, b) => Cartas.espPalo(a) - Cartas.espPalo(b) || Cartas.espOrden(a) - Cartas.espOrden(b));
const ES_BOTS = [{ nombre: 'La Güera', emoji: '💃' }, { nombre: 'El Compadre', emoji: '🤠' }, { nombre: 'Doña Chonita', emoji: '👵' }];

// Puntos de la Brisca: puntos de cartas (o de la pareja) sobre 120 → 800, +200 si gana.
function brPuntos(st, j) {
  const r = Cartas.briscaResultado(st);
  const k = st.equipos ? st.equipos[j] : j;
  return { puntos: Math.min(1000, Math.round(r.totales[k] * 800 / 120) + (r.ganador === k ? 200 : 0)), mios: r.totales[k], gano: r.ganador === k, empate: r.ganador === -1, r };
}
// Puntos del Conquián: ganar = 700 + 15 por carta que queda en el mazo; si no, 50 por carta bajada.
const cqPuntos = (st, j) => st.ganador === j ? Math.min(1000, 700 + st.mazo.length * 15) : Math.min(1000, Cartas.bajadas(st, j) * 50);

function briscaHtml(st, o) {
  const yo = o.yo, n = st.n;
  const otros = [...new Array(n).keys()].filter(i => i !== yo);
  const tagEq = i => {
    if (!st.equipos) return '';
    return ' <span class="pk-tag eq' + 'AB'[st.equipos[i]] + '">' + (yo >= 0 && st.equipos[i] === st.equipos[yo] ? 'pareja' : 'rival') + '</span>';
  };
  const asientos = '<div class="pk-asientos">' + otros.map(i => '<div class="pk-asiento' + (!st.terminada && st.turno === i ? ' turno' : '') + '"><span class="n">' + o.avatar(i) + escapeHtml(o.nombre(i)) + tagEq(i) + '</span><span>' +
    esDorsosHtml(st.manos[i].length) + '</span><span class="muted">' + st.ganadas[i].length / n + ' ronda(s)</span></div>').join('') + '</div>';
  let baza = st.baza;
  if (!st.baza.length) baza = o.verUltima && st.ultimaBaza ? st.ultimaBaza.cartas : [];
  const u = st.ultimaBaza, nueva = esNuevas('baza', baza.map(b => b.carta));
  const ronda = u && u.puntos ? ' (+' + u.puntos + ')' : '';
  let msg = '';
  if (!st.baza.length) msg = u ? '🏆 ' + escapeHtml(o.nombre(u.ganador)) + ' gana la ronda' + ronda : '¡A jugar! Abre ' + escapeHtml(o.nombre(st.turno));
  const mesa = '<div class="pk-mesa es-mesa"><div class="pk-titulo">🏆 Brisca · triunfo ' + Cartas.ESP_PALOS[st.paloTriunfo] + ' ' + Cartas.ESP_EMOJI[st.paloTriunfo] + '</div>' +
    '<div class="es-fila-mesa">' + (st.mazo.length ? esMazoHtml(st.mazo.length, st.triunfo) : '<span class="pk-bote">Mazo agotado</span>') + '</div>' +
    '<div class="es-baza">' + baza.map(b => '<figure>' + esCarta(b.carta, nueva(b.carta) ? ' entra' : '') + '<figcaption>' + escapeHtml(o.nombre(b.j)) + '</figcaption></figure>').join('') + '</div>' +
    '<div class="pk-msg">' + msg + '</div></div>';
  let mio = '';
  if (yo >= 0) mio = '<div class="pk-yo"><div class="pk-asiento' + (!st.terminada && st.turno === yo ? ' turno' : '') + '"><span class="n">' + o.avatar(yo) + escapeHtml(o.nombre(yo)) + tagEq(yo) + '</span><span class="muted">' + st.ganadas[yo].length / n + ' ronda(s) · ' + st.puntos[yo] + ' pts</span></div></div>' +
    esManoHtml(st.manos[yo].map(c => ({ c, cls: o.miTurno ? ' jugable' : '', attrs: ' data-br-carta="' + c + '"' + (o.miTurno ? '' : ' data-no="1" aria-disabled="true"'),
      extra: Cartas.espPalo(c) === st.paloTriunfo ? ' es-triunfo' : '' })));
  return asientos + mesa + mio + (o.pie || '') + '<div class="row-btns" style="margin-top:8px"><button class="btn ghost sm" data-ayuda="brisca">📖 Cómo se juega</button></div>';
}

function conquianHtml(st, o) {
  const yo = o.yo, rival = yo >= 0 ? 1 - yo : 1, ver = yo >= 0 ? yo : 0;
  const abreJuego = (propios, a) => {
    if (!propios) return '<span class="es-juego">';
    return '<button class="es-juego' + (o.destino === a ? ' destino' : '') + '" data-cq-juego="' + a + '" aria-label="Juego ' + (a + 1) + '">';
  };
  const juegos = (j, propios) => '<div class="es-juegos">' + (st.bajados[j].length ? st.bajados[j].map((m, a) => abreJuego(propios, a) +
    ordenMano(m).map(c => esCarta(c, ' chica')).join('') + (propios ? '</button>' : '</span>')).join('') : '<span class="muted" style="font-size:.78rem">Sin juegos bajados</span>') + '</div>';
  const of = st.oferta, nuevaOf = esNuevas('oferta', of ? [of.carta] : []);
  let deQuien = 'Volteada del mazo';
  if (!of) deQuien = '';
  else if (of.origen === 'descarte') deQuien = 'Descarte de ' + escapeHtml(o.nombre(1 - of.para));
  else if (of.segunda) deQuien = escapeHtml(o.nombre(1 - of.para)) + ' no la quiso';
  const u = st.ultima;
  const ult = !u ? '' : escapeHtml(o.nombre(u.j)) + ' ' + ({ pasar: 'no quiso ' + Cartas.nombreEsp(u.carta), tomar: 'tomó ' + Cartas.nombreEsp(u.carta), bajar: 'bajó un juego', descartar: 'descartó ' + Cartas.nombreEsp(u.carta) })[u.accion];
  let paraQuien;
  if (of) paraQuien = 'Para ' + escapeHtml(o.nombre(of.para));
  else paraQuien = st.terminada ? 'Fin' : 'Bajando…';
  const mesa = '<div class="pk-mesa es-mesa"><div class="pk-titulo">🪙 Conquián · gana quien baja 9</div>' +
    '<div class="es-fila-mesa">' + esMazoHtml(st.mazo.length) + '<span' + (of ? ' data-cq-oferta="' + of.carta + '"' : '') + '>' + esCarta(of ? of.carta : null, of && nuevaOf(of.carta) ? ' entra' : '') + '</span>' +
    '<div style="text-align:left;font-size:.8rem"><b>' + paraQuien + '</b><br>' + deQuien + '<br>' + st.mazo.length + ' en el mazo · 💀 ' + st.muertas.length + '</div></div>' +
    '<div class="pk-msg">' + ult + '</div></div>';
  let botones = '';
  if (o.miTurno) {
    botones = st.fase === 'oferta'
      ? '<div class="muted" style="font-size:.8rem;text-align:center">Elige cartas de tu mano que hagan juego con la carta de la mesa, o toca uno de tus juegos para agregarla.</div><div class="row-btns"><button class="btn ghost" data-cq="pasar">🙅 No la quiero</button><button class="btn" data-cq="tomar">✅ Tomar y bajar</button></div>'
      : '<div class="muted" style="font-size:.8rem;text-align:center">Puedes bajar más juegos con tu mano. Para terminar tu turno, elige 1 carta y descártala.</div><div class="row-btns"><button class="btn ghost" data-cq="bajar">⬇️ Bajar juego</button><button class="btn" data-cq="descartar">🗑️ Descartar</button></div>';
  }
  const elegida = c => !!(o.sel && o.sel.has(c));
  const mano = yo >= 0 ? esManoHtml(ordenMano(st.manos[yo]).map(c => ({ c, cls: elegida(c) ? ' sel' : '', attrs: ' data-cq-carta="' + c + '" aria-pressed="' + elegida(c) + '"' }))) : '';
  let tuyos = '';
  if (yo >= 0) tuyos = '<div class="es-seccion">Tus juegos · ' + Cartas.bajadas(st, ver) + ' de 9' + (o.destino !== null && o.destino !== undefined ? ' · destino: juego ' + (o.destino + 1) : '') + '</div>' + juegos(yo, true) + mano;
  return '<div class="pk-asientos"><div class="pk-asiento' + (!st.terminada && st.turno === rival ? ' turno' : '') + '"><span class="n">' + o.avatar(rival) + escapeHtml(o.nombre(rival)) + '</span><span>' + esDorsosHtml(st.manos[rival].length) +
    '</span><span class="muted">' + Cartas.bajadas(st, rival) + ' de 9 bajadas</span>' + juegos(rival, false) + '</div></div>' + mesa +
    tuyos +
    '<div class="feedback" id="cq-msg">' + (o.msg || '') + '</div>' + botones + (o.pie || '') +
    '<div class="row-btns" style="margin-top:8px"><button class="btn ghost sm" data-ayuda="conquian">📖 Cómo se juega</button></div>';
}
const CQ_INVALIDA = 'Eso no forma un juego: 3 o 4 del mismo número (de palos distintos), o 3 o más seguidas del mismo palo (el 7 y la sota van seguidas).';
// Jugada de Conquián a partir de los botones, la selección y el destino; null si falta algo.
function cqJugadaDe(accion, sel, destino) {
  if (accion === 'pasar') return { accion };
  if (accion === 'descartar') return sel.size === 1 ? { accion, carta: [...sel][0] } : null;
  return { accion, con: [...sel], ...(destino !== null && destino !== undefined ? { a: destino } : {}) };
}

function elegirBrisca() {
  const m = marco('brisca', { menu: true }); // menú: aún no es partida (openspec: juegos-recarga)
  m.body.innerHTML = '<div class="q-card"><div class="big">🪙🏆⚔️🪵</div><div class="q">Brisca</div><div class="sub">Baraja española de 40 cartas. Gana quien junta más de 60 de los 120 puntos.</div></div>' +
    '<label>Modo</label><div class="opts" style="grid-template-columns:repeat(3,1fr)"><button class="opt" data-br-modo="1" aria-pressed="true">🙂 vs 1</button><button class="opt" data-br-modo="2">👥 vs 2</button><button class="opt" data-br-modo="pareja">🤝 En pareja</button></div>' +
    '<div class="row-btns"><button class="btn ghost" data-ayuda="brisca">📖 Cómo se juega</button><button class="btn" data-br-go>🃏 Repartir</button></div>';
  let modo = '1';
  m.body.addEventListener('click', e => {
    const b = e.target.closest('[data-br-modo]');
    if (b) { modo = b.dataset.brModo; m.body.querySelectorAll('[data-br-modo]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); }
    if (e.target.closest('[data-br-go]')) jugarBrisca(modo);
  });
}

function jugarBrisca(modo) {
  const m = marco('brisca');
  const bots = modo === 'pareja' ? [ES_BOTS[0], ES_BOTS[1], ES_BOTS[2]] : ES_BOTS.slice(0, Number(modo));
  // En pareja: tú (0) y El Compadre (2) contra La Güera (1) y Doña Chonita (3).
  const lugares = modo === 'pareja' ? [null, ES_BOTS[0], ES_BOTS[1], ES_BOTS[2]] : [null].concat(bots);
  const st = Cartas.briscaNueva(lugares.map((b, i) => ({ id: 'j' + i, nombre: b ? b.nombre : 'Tú' })));
  const nombre = i => i === 0 ? 'Tú' : lugares[i].nombre, avatar = i => i === 0 ? '🙂 ' : lugares[i].emoji + ' ';
  const t0 = Date.now(); let terminado = false, verUltima = false;
  const pintar = () => { m.body.innerHTML = briscaHtml(st, { yo: 0, nombre, avatar, miTurno: !st.terminada && st.turno === 0 && !verUltima, verUltima }); m.puntos(st.puntos[0]); };
  const fin = () => {
    terminado = true;
    const b = brPuntos(st, 0);
    let titulo = '😅 Esta vez no';
    if (b.empate) titulo = '🤝 ¡Empate a 60!';
    else if (b.gano) titulo = st.equipos ? '🤝 ¡Ganó tu pareja!' : '🏆 ¡Ganaste la Brisca!';
    terminar('brisca', { puntos: b.puntos, aciertos: st.ganadas[0].length / st.n, total: Math.trunc(40 / st.n), segundos: (Date.now() - t0) / 1000,
      titulo,
      detalle: (st.equipos ? 'Tu pareja juntó ' : 'Juntaste ') + b.mios + ' de 120 puntos · ' + b.r.totales.join(' vs ') + '.' });
  };
  function programar() {
    if (terminado) return;
    pintar();
    if (st.terminada) { const t = setTimeout(fin, 1500 * TIEMPO); limpiezas.push(() => clearTimeout(t)); return; }
    if (verUltima) { const t = setTimeout(() => { verUltima = false; programar(); }, 5300 * TIEMPO); /* la baza se ve ~4 s más (ajuste del profe) */ limpiezas.push(() => clearTimeout(t)); return; }
    if (st.turno !== 0) { const t = setTimeout(() => { if (terminado) { return; } jugar(Cartas.briscaBot(st)); }, 1500 * TIEMPO); limpiezas.push(() => clearTimeout(t)); }
  }
  function jugar(carta) {
    if (!Cartas.briscaJugar(st, carta)) return false;
    tono(480, 50);
    if (!st.baza.length) { verUltima = true; if (st.ultimaBaza.ganador === 0 || (st.equipos && st.equipos[st.ultimaBaza.ganador] === 0)) sonidoOk(); }
    programar(); return true;
  }
  m.body.addEventListener('click', e => {
    const b = e.target.closest('[data-br-carta]');
    if (!b || terminado || verUltima || st.turno !== 0 || st.terminada) return;
    jugar(Number(b.dataset.brCarta));
  });
  limpiezas.push(() => { terminado = true; });
  programar();
}

function elegirConquian() {
  const m = marco('conquian', { menu: true }); // menú: aún no es partida (openspec: juegos-recarga)
  m.body.innerHTML = '<div class="q-card"><div class="big">🪙🏆⚔️🪵</div><div class="q">Conquián</div><div class="sub">El rummy mexicano: forma tercias y escaleras con la carta de la mesa hasta bajar 9 cartas.</div></div>' +
    '<div class="row-btns"><button class="btn ghost" data-ayuda="conquian">📖 Cómo se juega</button><button class="btn" data-cq-go>🃏 Repartir contra El Compadre 🤠</button></div>';
  m.body.addEventListener('click', e => { if (e.target.closest('[data-cq-go]')) jugarConquian(); });
}

function jugarConquian() {
  const m = marco('conquian');
  const st = Cartas.conquianNueva([{ id: 'yo', nombre: 'Tú' }, { id: 'bot', nombre: 'El Compadre' }]);
  const nombre = i => i === 0 ? 'Tú' : 'El Compadre', avatar = i => i === 0 ? '🙂 ' : '🤠 ';
  const sel = new Set(); let destino = null, msg = '', terminado = false;
  const t0 = Date.now();
  const pintar = () => { m.body.innerHTML = conquianHtml(st, { yo: 0, nombre, avatar, miTurno: !st.terminada && st.turno === 0, sel, destino, msg }); m.puntos(Cartas.bajadas(st, 0)); };
  const fin = () => {
    terminado = true;
    let titulo = '😅 Ganó El Compadre';
    if (st.ganador === 0) titulo = '🎉 ¡Conquián! Bajaste 9';
    else if (st.ganador === -1) titulo = '🤝 Se acabó el mazo: empate';
    terminar('conquian', { puntos: cqPuntos(st, 0), aciertos: Cartas.bajadas(st, 0), total: 9, segundos: (Date.now() - t0) / 1000,
      titulo,
      detalle: 'Bajaste ' + Cartas.bajadas(st, 0) + ' de 9 cartas · quedaron ' + st.mazo.length + ' en el mazo.' });
  };
  function programar() {
    if (terminado) return;
    pintar();
    if (st.terminada) { const t = setTimeout(fin, 1800 * TIEMPO); limpiezas.push(() => clearTimeout(t)); return; }
    if (st.turno !== 0) { const t = setTimeout(() => { if (terminado) { return; } Cartas.conquianActuar(st, Cartas.conquianBot(st)); tono(440, 50); programar(); }, 2500 * TIEMPO); limpiezas.push(() => clearTimeout(t)); }
  }
  m.body.addEventListener('click', e => {
    if (terminado || st.terminada) return;
    const c = e.target.closest('[data-cq-carta]'), jg = e.target.closest('[data-cq-juego]'), b = e.target.closest('[data-cq]');
    if (c) { const id = Number(c.dataset.cqCarta); if (sel.has(id)) sel.delete(id); else { sel.add(id); } msg = ''; return pintar(); }
    if (jg) { const a = Number(jg.dataset.cqJuego); destino = destino === a ? null : a; msg = ''; return pintar(); }
    if (!b || st.turno !== 0) return;
    const mv = cqJugadaDe(b.dataset.cq, sel, destino);
    if (!mv) { msg = 'Elige exactamente 1 carta para descartar.'; sonidoMal(); return pintar(); }
    if (!Cartas.conquianActuar(st, mv)) { msg = CQ_INVALIDA; sonidoMal(); return pintar(); }
    sel.clear(); destino = null; msg = ''; if (mv.accion === 'tomar' || mv.accion === 'bajar') sonidoOk();
    programar();
  });
  limpiezas.push(() => { terminado = true; });
  programar();
}
