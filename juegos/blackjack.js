// 🂡 Blackjack (21) con fichas sin valor real (openspec: juegos-salas-grandes).
// - `globalThis.Blackjack`: motor puro (sin DOM), con las cartas de juegos/cartas.js (ids 0–51, rango id % 13).
// - Pantallas: `elegirBlackjack` / individual contra la banca, y SALAS_GRANDES.blackjack (2 a 6 jugadores contra la
//   banca; cada jugada lleva su paso n y todos reproducen la mesa con la semilla, como el póker).
(function (g) {
  'use strict';
  const FICHA = 5, FICHAS_INICIALES = 500, MANOS = 8;
  const barajar = (a, r) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
  const valorCarta = id => { const r = id % 13; return r <= 7 ? r + 2 : r <= 11 ? 10 : 11; };
  // Total de la mano: los ases valen 11 o 1. suave = hay un as contando 11.
  function total(cartas) {
    let v = 0, ases = 0;
    for (const c of cartas) { v += valorCarta(c); if (c % 13 === 12) ases++; }
    while (v > 21 && ases) { v -= 10; ases--; }
    return { v, suave: ases > 0 };
  }
  const esBJ = cartas => cartas.length === 2 && total(cartas).v === 21;
  const pagoBJ = a => a + Math.floor(a * 1.5 / FICHA) * FICHA; // 3 a 2 en múltiplos de 5

  function nueva(jugadores, o) {
    o = o || {};
    return { jugadores: jugadores.map(j => Object.assign({}, j, { fichas: o.fichas || FICHAS_INICIALES })), manos: o.manos || MANOS, mano: -1, fase: 'espera', terminada: false,
      turno: -1, apuesta: [], cartas: [], estado: [], banca: [], mazo: [], resultado: null, ultima: null };
  }
  // estado por jugador: fuera (sin fichas), apuesta (debe apostar), juega, planta, pasado, bj.
  const pendiente = (st, i) => st.estado[i] === (st.fase === 'apuestas' ? 'apuesta' : 'juega');
  function siguiente(st, desde) { for (let i = desde + 1; i < st.jugadores.length; i++) if (pendiente(st, i)) return i; return -1; }
  function mano(st, rng) {
    st.mano++;
    if (st.mano >= st.manos || !st.jugadores.some(j => j.fichas >= FICHA)) { st.terminada = true; st.fase = 'fin'; st.turno = -1; return; }
    st.mazo = barajar([...Array(104).keys()].map(x => x % 52), rng || Math.random);
    const n = st.jugadores.length;
    Object.assign(st, { apuesta: Array(n).fill(0), cartas: st.jugadores.map(() => []), estado: st.jugadores.map(j => j.fichas >= FICHA ? 'apuesta' : 'fuera'), banca: [], resultado: null, ultima: null, fase: 'apuestas' });
    st.turno = siguiente(st, -1);
  }
  const sacar = st => st.mazo.pop();
  function repartir(st) {
    st.fase = 'turnos';
    const activos = st.estado.map((e, i) => e === 'juega' ? i : -1).filter(i => i >= 0);
    for (let k = 0; k < 2; k++) { activos.forEach(i => st.cartas[i].push(sacar(st))); st.banca.push(sacar(st)); }
    activos.forEach(i => { if (esBJ(st.cartas[i])) st.estado[i] = 'bj'; });
    if (esBJ(st.banca)) return resolver(st);
    st.turno = siguiente(st, -1);
    if (st.turno < 0) jugarBanca(st);
  }
  function jugarBanca(st) {
    if (st.estado.some(e => e === 'planta')) while (total(st.banca).v < 17) st.banca.push(sacar(st));
    resolver(st);
  }
  function resolver(st) {
    const b = total(st.banca).v, bjBanca = esBJ(st.banca);
    const premios = st.jugadores.map((_, i) => {
      const a = st.apuesta[i], e = st.estado[i], t = total(st.cartas[i]).v;
      if (!a || e === 'pasado') return 0;
      if (e === 'bj') return bjBanca ? a : pagoBJ(a);
      if (bjBanca) return 0;
      return b > 21 || t > b ? 2 * a : t === b ? a : 0;
    });
    premios.forEach((p, i) => { st.jugadores[i].fichas += p; });
    st.resultado = { premios, banca: b, bjBanca, neto: premios.map((p, i) => p - st.apuesta[i]) };
    st.fase = 'fin'; st.turno = -1;
  }
  function opciones(st) {
    const i = st.turno; if (i < 0 || st.terminada) return null;
    const j = st.jugadores[i];
    if (st.fase === 'apuestas') return { apostar: { min: FICHA, max: Math.floor(j.fichas / FICHA) * FICHA } };
    return { pedir: true, plantarse: true, doblar: st.cartas[i].length === 2 && j.fichas >= st.apuesta[i] };
  }
  // Aplica la jugada del jugador en turno; false si no es válida.
  function actuar(st, mv) {
    const i = st.turno; if (i < 0 || st.terminada || !mv) return false;
    const j = st.jugadores[i], op = opciones(st);
    if (st.fase === 'apuestas') {
      const m = mv.monto;
      if (mv.accion !== 'apostar' || !Number.isInteger(m) || m % FICHA || m < op.apostar.min || m > op.apostar.max) return false;
      j.fichas -= m; st.apuesta[i] = m; st.estado[i] = 'juega';
      st.ultima = { j: i, accion: 'apostar', monto: m };
      st.turno = siguiente(st, i);
      if (st.turno < 0) repartir(st);
      return true;
    }
    if (mv.accion === 'pedir') {
      st.cartas[i].push(sacar(st));
      const t = total(st.cartas[i]).v;
      if (t > 21) st.estado[i] = 'pasado'; else if (t === 21) st.estado[i] = 'planta';
    } else if (mv.accion === 'plantarse') st.estado[i] = 'planta';
    else if (mv.accion === 'doblar' && op.doblar) {
      j.fichas -= st.apuesta[i]; st.apuesta[i] *= 2; st.cartas[i].push(sacar(st));
      st.estado[i] = total(st.cartas[i]).v > 21 ? 'pasado' : 'planta';
    } else return false;
    st.ultima = { j: i, accion: mv.accion };
    if (st.estado[i] !== 'juega') { st.turno = siguiente(st, i); if (st.turno < 0) jugarBanca(st); }
    return true;
  }
  // Bot: apuesta de 10 a 50 y la estrategia básica (simplificada).
  function bot(st, rng) {
    const r = rng || Math.random, i = st.turno, op = opciones(st);
    if (st.fase === 'apuestas') return { accion: 'apostar', monto: Math.max(FICHA, Math.min(op.apostar.max, FICHA * (2 + Math.floor(r() * 9)))) };
    const { v, suave } = total(st.cartas[i]), arriba = valorCarta(st.banca[0]);
    if (op.doblar && (v === 10 || v === 11) && arriba < 10) return { accion: 'doblar' };
    if (v <= 11 || (suave && v <= 17) || (v <= 16 && arriba >= 7) || (v === 12 && arriba <= 3)) return { accion: 'pedir' };
    return { accion: 'plantarse' };
  }
  // Al vencer el turno: apuesta mínima o plantarse.
  const auto = st => st.fase === 'apuestas' ? { accion: 'apostar', monto: FICHA } : { accion: 'plantarse' };
  const puntos = fichas => Math.max(0, Math.min(1000, fichas));

  g.Blackjack = { FICHA, FICHAS_INICIALES, MANOS, valorCarta, total, esBJ, pagoBJ, nueva, mano, actuar, opciones, bot, auto, puntos };
  if (typeof document === 'undefined') return;

  // ---------- Pantallas ----------
  const SG = g.SalasGrandes;
  SG.css('css-blackjack', `
  .bj-mesa { background: radial-gradient(ellipse at center, #1f7a4a 0%, #13603a 60%, #0b3d26 100%); border: 7px solid #6b4423; border-radius: 26px; padding: 12px 10px; color: #fff; text-align: center; margin: 8px 0; }
  .bj-mesa .bj-titulo { font-size: .72rem; letter-spacing: .14em; color: #fde68a; font-weight: 800; }
  .bj-cartas { display: flex; justify-content: center; gap: 5px; flex-wrap: wrap; min-height: 66px; margin: 6px 0; }
  .bj-cartas .pk-carta.entra { animation: bj-entra .35s ease-out; }
  @keyframes bj-entra { from { transform: translateY(-18px) rotate(-8deg); opacity: 0; } to { transform: none; opacity: 1; } }
  .bj-total { display: inline-block; min-width: 34px; padding: 1px 8px; border-radius: 999px; background: rgba(0,0,0,.35); font-weight: 900; }
  .bj-total.pasado { background: #b91c1c; } .bj-total.bj { background: #b45309; color: #fff7ed; }
  .bj-msg { min-height: 1.3em; font-weight: 700; font-size: .9rem; margin-top: 4px; }
  .bj-yo { background: var(--card); border: 2px solid var(--border); border-radius: 16px; padding: 8px; text-align: center; }
  .bj-yo .pk-carta.vacia { background: transparent; border: 1.5px dashed var(--border); }
  .bj-yo.turno { border-color: var(--gold); box-shadow: 0 0 0 3px rgba(245,158,11,.22); }
  .bj-botones { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-top: 8px; }
  .bj-apuesta { text-align: center; }
  .bj-apuesta .pk-pila-sel { min-height: 54px; display: flex; justify-content: center; align-items: flex-end; }
  .bj-aviso { font-size: .76rem; color: var(--muted); text-align: center; margin-top: 8px; }
  @media (prefers-reduced-motion: reduce) { .bj-cartas .pk-carta.entra { animation: none; } }
  `);
  const ESTADO_TXT = { pasado: '💥 Se pasó', bj: '🂡 ¡Blackjack!', planta: '✋ Se plantó', fuera: 'Sin fichas', apuesta: 'Apostando…', juega: 'Jugando' };
  const VERBO = { apostar: 'apuesta', pedir: 'pide carta', plantarse: 'se planta', doblar: 'dobla' };
  const totalHtml = (cartas, e) => { if (!cartas.length) return ''; const t = total(cartas); return '<span class="bj-total' + (t.v > 21 ? ' pasado' : e === 'bj' ? ' bj' : '') + '">' + (t.suave && t.v < 21 ? (t.v - 10) + '/' : '') + t.v + '</span>'; };
  const cartasHtml = (cartas, ocultar, vistas) => '<div class="bj-cartas">' + (cartas.length ? cartas.map((c, k) => pkCarta(ocultar && k === 1 ? undefined : c, vistas && k >= vistas ? ' entra' : '')).join('') : pkCarta(null) + pkCarta(null)) + '</div>';
  // Selector de apuesta con fichas de 5 a 100 (las del póker). Estado en data-* del propio panel.
  const apuestaHtml = max => '<section class="bj-apuesta" id="bj-apuesta" data-monto="0" data-max="' + max + '" aria-label="Arma tu apuesta con fichas">' +
    '<div>Tu apuesta: <b id="bj-monto" aria-live="polite">0</b> <span class="muted">(de 5 a ' + fmt(max) + ')</span></div><div class="pk-pila-sel" id="bj-pila"></div>' +
    '<div class="pk-fichero" role="group" aria-label="Fichas">' + PK_FICHAS.map(f => '<button type="button" class="pk-ficha" data-bj-ficha="' + f.v + '" aria-label="Ficha de ' + f.v + '" style="' + pkEstiloFicha(f) + '"' + (f.v > max ? ' disabled' : '') + '><span>' + f.v + '</span></button>').join('') + '</div>' +
    '<div class="row-btns" style="margin-top:4px"><button type="button" class="btn ghost sm" data-bj-limpiar>↺ Limpiar</button><button class="btn sm" data-bj="apostar" disabled>✅ Apostar</button></div></section>';
  function apuestaClic(e) {
    const s = document.getElementById('bj-apuesta'); if (!s) return false;
    const f = e.target.closest('[data-bj-ficha]'), l = e.target.closest('[data-bj-limpiar]');
    if (!f && !l) return false;
    const max = Number(s.dataset.max), m = l ? 0 : Number(s.dataset.monto) + Number(f.dataset.bjFicha);
    if (m > max) return true;
    s.dataset.monto = m;
    document.getElementById('bj-monto').textContent = fmt(m);
    document.getElementById('bj-pila').innerHTML = pkPilaHtml(m, false, null, f ? Number(f.dataset.bjFicha) : null);
    s.querySelectorAll('[data-bj-ficha]').forEach(b => { b.disabled = m + Number(b.dataset.bjFicha) > max; });
    s.querySelector('[data-bj="apostar"]').disabled = m < FICHA;
    tono(l ? 330 : 620, 45, 'triangle', .06);
    return true;
  }
  const jugadaDe = b => b.dataset.bj === 'apostar' ? { accion: 'apostar', monto: Number(document.getElementById('bj-apuesta').dataset.monto) } : { accion: b.dataset.bj };

  // Mesa: banca arriba, asientos de los demás, tu lugar y los botones. o: { yo, nombre(i), avatar(i), miTurno, pie }
  function mesaHtml(st, o) {
    const fin = st.fase === 'fin', res = st.resultado, yo = o.yo;
    const asiento = i => {
      const j = st.jugadores[i], e = st.estado[i], c = st.cartas[i] || [];
      const extra = fin && res && st.apuesta[i] ? (res.neto[i] > 0 ? '<b style="color:var(--ok)">+' + fmt(res.neto[i]) + '</b>' : res.neto[i] < 0 ? '<b style="color:var(--bad, #dc2626)">' + fmt(res.neto[i]) + '</b>' : '🤝 empate')
        : st.apuesta[i] ? pkPilaHtml(st.apuesta[i], true) + ' ' + fmt(st.apuesta[i]) : '';
      return '<div class="pk-asiento' + (st.turno === i ? ' turno' : '') + (e === 'fuera' ? ' fuera' : '') + '"><span class="n">' + o.avatar(i) + escapeHtml(o.nombre(i)) + '</span><span class="pk-fichas">🪙 ' + fmt(j.fichas) + '</span>' +
        '<span>' + c.map(x => pkCarta(x, ' chica')).join(' ') + ' ' + totalHtml(c, e) + '</span><span class="muted">' + (ESTADO_TXT[e] && e !== 'juega' && e !== 'apuesta' ? ESTADO_TXT[e] + ' · ' : '') + extra + '</span></div>';
    };
    const u = st.ultima;
    const msg = fin && res ? (res.bjBanca ? '🂡 ¡La banca tiene blackjack!' : res.banca > 21 ? '💥 La banca se pasó con ' + res.banca : '🏦 La banca se queda con ' + res.banca)
      : u ? escapeHtml(o.nombre(u.j)) + ' ' + VERBO[u.accion] + (u.monto ? ' ' + fmt(u.monto) : '') + (u.auto ? ' ⏰' : '') : st.fase === 'apuestas' ? '🪙 ¡Hagan sus apuestas!' : '';
    const otros = st.jugadores.map((_, i) => i).filter(i => i !== yo);
    let botones = '';
    if (o.miTurno) {
      const op = opciones(st);
      botones = op.apostar ? apuestaHtml(op.apostar.max)
        : '<div class="bj-botones"><button class="btn" data-bj="pedir">🃏 Pedir</button><button class="btn ghost" data-bj="plantarse">✋ Plantarme</button><button class="btn ghost" data-bj="doblar"' + (op.doblar ? '' : ' disabled') + '>✌️ Doblar</button></div>';
    }
    const mia = yo >= 0 ? (() => {
      const c = st.cartas[yo] || [], e = st.estado[yo], net = fin && res && st.apuesta[yo] ? res.neto[yo] : null;
      return '<div class="bj-yo' + (st.turno === yo ? ' turno' : '') + '"><div><b>' + o.avatar(yo) + escapeHtml(o.nombre(yo)) + '</b> · 🪙 ' + fmt(st.jugadores[yo].fichas) + (st.apuesta[yo] ? ' · apuesta ' + fmt(st.apuesta[yo]) : '') + '</div>' +
        cartasHtml(c, false) + '<div>' + totalHtml(c, e) + ' ' + (ESTADO_TXT[e] && !['juega', 'apuesta'].includes(e) ? ESTADO_TXT[e] : '') + '</div>' +
        (net !== null ? '<div class="bj-msg" style="color:' + (net > 0 ? 'var(--ok)' : net < 0 ? '#dc2626' : 'inherit') + '">' + (net > 0 ? '🏆 Ganaste ' + fmt(net) : net < 0 ? '😅 Perdiste ' + fmt(-net) : '🤝 Empate: recuperas tu apuesta') + '</div>' : '') + '</div>';
    })() : '';
    return (otros.length ? '<div class="pk-asientos">' + otros.map(asiento).join('') + '</div>' : '') +
      '<div class="bj-mesa"><div class="bj-titulo">🏦 BANCA · PIDE HASTA 17</div>' + cartasHtml(st.banca, !fin) + (fin ? totalHtml(st.banca) : '') +
      '<div class="bj-msg" id="bj-msg">' + msg + '</div><div style="font-size:.75rem;opacity:.8">Mano ' + (st.mano + 1) + ' de ' + st.manos + ' · blackjack paga 3 a 2</div></div>' +
      mia + (o.pie || '') + botones +
      '<div class="bj-aviso">🪙 Fichas de juego: no se compran, no se cambian y no tienen valor real.</div>' +
      '<div class="row-btns" style="margin-top:8px"><button class="btn ghost sm" data-ayuda="blackjack">📖 Cómo se juega</button></div>';
  }

  g.elegirBlackjack = function () {
    const m = marco('blackjack', { menu: true });
    m.body.innerHTML = '<div class="q-card"><div class="big">🂡🃏</div><div class="q">Blackjack (21)</div><div class="sub">Acércate a 21 sin pasarte y gánale a la banca. 500 fichas y ' + MANOS + ' manos. Las fichas son de juego: no tienen valor.</div></div>' +
      '<div class="row-btns"><button class="btn ghost" data-ayuda="blackjack">📖 Cómo se juega</button><button class="btn" data-bj-go>🃏 Sentarme a la mesa</button></div>' +
      '<p class="muted" style="text-align:center;font-size:.85rem">¿Con amigos? En 👥 Partidas crea una sala de Blackjack (de 2 a 6 contra la banca).</p>';
    m.body.addEventListener('click', e => { if (e.target.closest('[data-bj-go]')) jugarBlackjack(); });
  };

  function jugarBlackjack() {
    const m = marco('blackjack');
    const st = nueva([{ id: 'yo', nombre: 'Tú' }]);
    const t0 = Date.now(); let ganadas = 0, terminado = false, auto = null;
    const pintar = () => {
      const pie = st.fase === 'fin' ? '<div class="row-btns"><button class="btn" data-bj-sig>' + (st.mano + 1 >= st.manos || st.jugadores[0].fichas < FICHA ? '🏁 Ver resultado' : '➡️ Siguiente mano') + '</button></div>' : '';
      m.body.innerHTML = mesaHtml(st, { yo: 0, nombre: () => 'Tú', avatar: () => '🙂 ', miTurno: st.fase !== 'fin' && st.turno === 0, pie });
      m.puntos(st.jugadores[0].fichas);
    };
    const fin = () => {
      terminado = true;
      const f = st.jugadores[0].fichas;
      terminar('blackjack', { puntos: puntos(f), aciertos: ganadas, total: st.mano + (st.terminada ? 0 : 1), segundos: (Date.now() - t0) / 1000,
        titulo: f <= 0 ? '💸 Te quedaste sin fichas' : f > FICHAS_INICIALES ? '🂡 ¡Le ganaste a la banca!' : '🂡 Fin de la partida',
        detalle: 'Terminaste con 🪙 ' + fmt(f) + ' fichas · ganaste ' + ganadas + ' mano' + (ganadas === 1 ? '' : 's') + '.' });
    };
    const siguienteMano = () => { clearTimeout(auto); mano(st); if (st.terminada) return fin(); pintar(); };
    const tras = () => {
      if (st.fase === 'fin') {
        if (st.resultado.neto[0] > 0) { ganadas++; sonidoOk(); } else if (st.resultado.neto[0] < 0) sonidoMal();
        auto = setTimeout(() => { if (!terminado) siguienteMano(); }, 9000 * TIEMPO); limpiezas.push(() => clearTimeout(auto));
      }
      pintar();
    };
    m.body.addEventListener('click', e => {
      if (terminado || apuestaClic(e)) return;
      if (e.target.closest('[data-bj-sig]')) return siguienteMano();
      const b = e.target.closest('[data-bj]'); if (!b || b.disabled || st.turno !== 0) return;
      if (!actuar(st, jugadaDe(b))) { sonidoMal(); return; }
      tono(520, 60); tras();
    });
    limpiezas.push(() => { terminado = true; });
    siguienteMano();
  }

  // ---------- En partida ----------
  const BJ_BOT_MS = 1500, BJ_TURNO_MS = 30000, BJ_PAUSA_MS = 7000;
  function estadoSala() {
    const e = sala.estado, s = e.sala, orden = participantes();
    const jugs = new Map();
    e.jugadores.forEach(x => (x.jugadas || []).forEach(j => { if (!jugs.has(j.n)) jugs.set(j.n, Object.assign({ jugador: x.id }, j)); }));
    const st = nueva(orden.map(p => ({ id: p.id, nombre: p.nombre, bot: !!p.bot })));
    mano(st, rngDe(s.seed, 'bj-mano-0'));
    const ganadas = {}; let paso = 0, T0 = s.inicio, contada = -1;
    const ahora = ahoraServidor();
    const contar = () => { if (st.fase === 'fin' && st.resultado && contada !== st.mano) { contada = st.mano; st.resultado.neto.forEach((n, i) => { if (n > 0) ganadas[i] = (ganadas[i] || 0) + 1; }); } };
    for (let guard = 0; guard < 6000 && !st.terminada; guard++) {
      contar();
      if (st.fase === 'fin') { const t = T0 + dur(BJ_PAUSA_MS); if (ahora < t) break; mano(st, rngDe(s.seed, 'bj-mano-' + (st.mano + 1))); T0 = t; continue; }
      const p = orden[st.turno];
      if (p.bot) {
        const t = T0 + dur(BJ_BOT_MS); if (ahora < t) break;
        actuar(st, bot(st, rngDe(s.seed, 'bjbot' + paso))); paso++; T0 = t;
      } else {
        const mv = jugs.get(paso), lim = T0 + dur(BJ_TURNO_MS);
        if (mv && mv.jugador === p.id && mv.t <= lim && actuar(st, mv)) { paso++; T0 = Math.max(T0, mv.t); }
        else if (ahora >= lim) { actuar(st, auto(st)); if (st.ultima) st.ultima.auto = true; paso++; T0 = lim; }
        else break;
      }
    }
    contar();
    return Object.assign(st, { orden, paso, T0, ganadas });
  }

  function pintar(body) {
    const e = sala.estado;
    if (SG.cuenta(body, '¡Prepárense! La banca baraja')) return;
    const st = estadoSala(), ahora = ahoraServidor();
    const yo = st.orden.findIndex(p => p.id === e.yo);
    if (st.terminada) {
      SG.barra(null);
      if (sala.vista === 'final') return;
      const filas = st.orden.map((p, j) => ({ id: p.id, nombre: p.nombre, tipo: p.tipo, avatar: p.avatar, total: puntos(st.jugadores[j].fichas), ultimo: 0 })).sort((a, b) => b.total - a.total);
      sala.finAciertos = yo >= 0 ? (st.ganadas[yo] || 0) : 0; sala.finTotal = st.manos;
      return pintarFinalSala(body, filas, null, '🂡 ¡Fin del Blackjack!');
    }
    const enJuego = st.fase !== 'fin';
    const miTurno = enJuego && st.turno === yo && !sala.bjEnviando;
    const ventana = !enJuego ? dur(BJ_PAUSA_MS) : dur(st.orden[st.turno].bot ? BJ_BOT_MS : BJ_TURNO_MS);
    SG.barra((st.T0 + ventana - ahora) / ventana);
    const clave = 'bj:' + st.mano + ':' + st.paso + ':' + st.fase + ':' + (sala.bjEnviando ? 1 : 0);
    if (sala.vista === clave) return;
    sala.vista = clave; sala.bjSt = st;
    const pie = enJuego && !miTurno ? '<div class="feedback">⏳ Turno de ' + escapeHtml(st.orden[st.turno].nombre) + '</div>' : !enJuego ? '<div class="feedback">Siguiente mano en unos segundos…</div>'
      : '<div class="feedback ok">👉 ¡Tu turno! Tienes 30 s</div>';
    body.innerHTML = mesaHtml(st, { yo, nombre: i => st.orden[i].nombre, avatar: i => avatarHtml(st.orden[i].avatar, 18) + ' ', miTurno, pie });
  }

  function clic(e) {
    if (apuestaClic(e)) return true;
    const b = e.target.closest('[data-bj]'), st = sala.bjSt;
    if (!b || !st) return false;
    const yo = st.orden.findIndex(p => p.id === sala.estado.yo);
    if (b.disabled || st.fase === 'fin' || st.turno !== yo || sala.bjEnviando) return true;
    const jugada = jugadaDe(b);
    sala.bjEnviando = true; sala.vista = null; pintarSala();
    post('/juegos/sala/' + sala.codigo + '/respuesta', { jugada: Object.assign({ n: st.paso }, jugada) }).then(async r => {
      await traerSala();
      sala.bjEnviando = false; sala.vista = null; pintarSala();
      if (!r.ok && r.body.error !== 'turno_tomado') alert('No se pudo enviar la jugada (' + (r.body.error || r.status) + ').');
    });
    return true;
  }

  g.SALAS_GRANDES.blackjack = { preparar: () => { sala.bjSt = null; sala.bjEnviando = false; return null; }, pintar, clic };
  g.AYUDA_GRANDES.blackjack = '<h2>🂡 Blackjack (21)</h2><p><b>Objetivo:</b> que tus cartas sumen más que las de la banca <b>sin pasarte de 21</b>. Cada quien empieza con 500 fichas y se juegan ' + MANOS + ' manos.</p>' +
    '<h3>Cuánto vale cada carta</h3><table><tr><td>2 a 10</td><td>lo que dice la carta</td></tr><tr><td>J, Q, K</td><td>10</td></tr><tr><td>A (as)</td><td>11 o 1, lo que más te convenga</td></tr></table>' +
    '<h3>Cómo va una mano</h3><ol><li><b>Apuesta:</b> arma tu apuesta con fichas de 5, 10, 20, 50 y 100.</li><li>Recibes 2 cartas; la banca, una boca arriba y otra boca abajo.</li>' +
    '<li>En tu turno: <b>🃏 Pedir</b> otra carta, <b>✋ Plantarte</b> o <b>✌️ Doblar</b> (con tus 2 primeras cartas: duplicas tu apuesta y recibes solo una carta más).</li>' +
    '<li>La banca voltea su carta y <b>pide hasta tener 17 o más</b>.</li></ol>' +
    '<h3>Pagos</h3><table><tr><td>Le ganas a la banca</td><td>recibes el doble de tu apuesta</td></tr><tr><td>Empate</td><td>recuperas tu apuesta</td></tr><tr><td>🂡 Blackjack (A + 10 con tus 2 primeras cartas)</td><td>paga 3 a 2</td></tr><tr><td>Te pasas de 21</td><td>pierdes tu apuesta</td></tr></table>' +
    '<p>En partida, cada quien juega contra la banca (no contra los demás) y tiene 30 segundos por turno; si se acaba, se planta solo.</p><h3>Puntos</h3><p>Tus puntos son las fichas con las que terminas (máximo 1,000).</p>' +
    '<div class="aviso">🪙 Las fichas son solo de juego: no se compran, no se cambian y no tienen valor real. Aquí se juega por diversión y por puntos del ranking.</div>';
})(globalThis);
