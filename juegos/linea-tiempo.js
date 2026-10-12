// 📜 Línea del tiempo (openspec: cultura-conocimiento): ordenar sucesos del más antiguo al más reciente.
// Script clásico cargado antes del script principal de juegos.html.
// - `globalThis.LineaTiempo`: funciones puras (sin DOM), también usadas por server/linea_tiempo_test.ts.
// - Pantallas (`elegirLineaTiempo`, `jugarLineaTiempo`, `pintarLineaSala`): usan los helpers globales de juegos.html
//   (marco, reloj, terminar, datos, barajar, escapeHtml, rngDe, sala, pintarFinalSala…), que se resuelven al llamarlas.
(function (g) {
  'use strict';

  // Igual que TEMAS_LINEA en server/salas.ts; los 4 últimos son los temas de cultura.json (linea.temas).
  const TEMAS = [
    { id: 'todos', titulo: 'Todos los temas', emoji: '🌈' },
    { id: 'historia-mexico', titulo: 'Historia de México', emoji: '🇲🇽' },
    { id: 'historia-universal', titulo: 'Historia universal', emoji: '🏛️' },
    { id: 'inventos', titulo: 'Inventos', emoji: '💡' },
    { id: 'ciencia', titulo: 'Ciencia', emoji: '🔬' },
  ];
  const VIDAS = 3, LINEAS_MAX = 10, SEGUNDOS = 45; // individual
  const RONDAS_SALA = 5, SUCESOS_SALA = [4, 5, 5, 6, 6], L_MS = 40000, L_REV = 8000; // sala
  const temaValido = t => TEMAS.some(x => x.id === t) ? t : 'todos';
  const nombreTema = t => TEMAS.find(x => x.id === temaValido(t)).titulo;

  const mezclar = (a, rnd) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
  // Individual: 4 sucesos en las líneas 1–3, 5 en las 4–6 y 6 desde la 7.
  const sucesosDeLinea = i => i < 3 ? 4 : i < 6 ? 5 : 6;
  const setsDe = (d, tema) => { const t = temaValido(tema); return d.linea.sets.filter(s => t === 'todos' || s.tema === t); };
  const ordenar = lista => lista.slice().sort((a, b) => a.anio - b.anio);

  // Línea de n sucesos tomados de un set; el orden inicial nunca es ya el correcto.
  function lineaDeSet(set, n, rnd) {
    const k = Math.min(n, set.sucesos.length);
    const elegidos = mezclar(set.sucesos, rnd).slice(0, k);
    const bien = ordenar(elegidos);
    let sucesos = elegidos;
    for (let i = 0; i < 10 && sucesos.every((x, j) => x.anio === bien[j].anio); i++) sucesos = mezclar(elegidos, rnd);
    if (sucesos.every((x, j) => x.anio === bien[j].anio)) sucesos = elegidos.slice().reverse();
    return { tema: set.tema, titulo: set.titulo, sucesos: sucesos.map(x => ({ txt: x.txt, anio: x.anio, dato: x.dato })) };
  }
  const armarLinea = (d, tema, n, rnd) => { const sets = setsDe(d, tema); return lineaDeSet(sets[Math.floor(rnd() * sets.length)], n, rnd); };
  // Plan de una partida individual: hasta 10 líneas recorriendo los sets del tema en orden barajado.
  function planIndividual(d, tema, rnd) {
    const sets = mezclar(setsDe(d, tema), rnd);
    return Array.from({ length: LINEAS_MAX }, (_, i) => lineaDeSet(sets[i % sets.length], sucesosDeLinea(i), rnd));
  }
  // Las 5 líneas de una partida en sala: mismas para todos con la misma semilla.
  function lineasPartida(d, tema, rnd) {
    const sets = mezclar(setsDe(d, tema), rnd);
    return SUCESOS_SALA.map((n, i) => lineaDeSet(sets[i % sets.length], n, rnd));
  }
  // Sucesos en su lugar; `orden` puede traer casillas vacías (null).
  function aciertos(orden, linea) {
    const bien = ordenar(linea.sucesos);
    return bien.reduce((n, x, i) => n + (orden[i] && orden[i].anio === x.anio ? 1 : 0), 0);
  }
  // Individual: perfecta = 100 + 20 por suceso + racha (hasta 100) + 2 por segundo que sobra (hasta 90); si no, 15
  // por suceso en su lugar. `racha` ya cuenta esta línea.
  function puntosIndividual({ aciertos: a, n, racha, segundosSobran }) {
    if (a !== n) return a * 15;
    return 100 + 20 * n + Math.min(Math.max(racha - 1, 0), 10) * 10 + Math.min(90, 2 * Math.max(0, Math.floor(segundosSobran)));
  }
  // Sala: 20 por suceso en su lugar y, si es perfecta, hasta 80 por rapidez (máximo 200, igual que el servidor).
  const puntosSala = (a, n, ms, limiteMs) => 20 * a + (a === n ? Math.round(80 * Math.max(0, 1 - ms / limiteMs)) : 0);
  // Bot: con su % de acierto ordena perfecto; si no, acierta de 0 a n − 2 (un cambio deja dos fuera); tarda del 20 al
  // 87.5 % del tiempo (8 a 35 s de 40).
  function botLinea(rnd, acierto, n, limiteMs) {
    const perfecta = rnd() < acierto;
    const a = perfecta ? n : Math.floor(rnd() * (n - 1));
    const ms = Math.round(limiteMs * (0.2 + rnd() * 0.675));
    return { aciertos: a, correcta: perfecta, ms, puntos: puntosSala(a, n, ms, limiteMs) };
  }
  // Podio: más puntos, luego más sucesos en su lugar y luego menos tiempo.
  const podioLinea = filas => filas.slice().sort((a, b) => b.total - a.total || b.aciertos - a.aciertos || a.ms - b.ms);
  const anioTexto = a => a < 0 ? (-a) + ' a. C.' : String(a);

  const LT = g.LineaTiempo = {
    TEMAS, VIDAS, LINEAS_MAX, SEGUNDOS, RONDAS_SALA, SUCESOS_SALA, L_MS, L_REV,
    temaValido, nombreTema, sucesosDeLinea, armarLinea, planIndividual, lineasPartida, aciertos, puntosIndividual, puntosSala,
    botLinea, podioLinea, anioTexto, ordenar,
  };

  // ======================= Pantallas (solo en el navegador) =======================
  const esc = s => escapeHtml(s);
  const plural = (n, uno, varios) => n + ' ' + (n === 1 ? uno : varios);
  // Orden correcto con año y dato curioso (revelación individual y de sala).
  const htmlCorrecto = linea => '<h3 class="lt-titulo">📜 Orden correcto</h3><ol class="lt-correcto lt-revela">' + ordenar(linea.sucesos).map(x =>
    '<li><b class="lt-anio">' + esc(anioTexto(x.anio)) + '</b> · ' + esc(x.txt) + '<div class="sub">💡 ' + esc(x.dato) + '</div></li>').join('') + '</ol>';

  // Tablero para ordenar una línea: tocar una tarjeta la pone en la primera casilla libre; tocar una casilla llena la
  // regresa; arrastrar (Pointer Events, dedo o mouse) una tarjeta o casilla a otra casilla la pone ahí (intercambia
  // si estaba ocupada). Devuelve { confirmar, revelar, boton, orden }.
  function tablero(cont, linea, opts) {
    const n = linea.sucesos.length;
    const casillas = Array(n).fill(null); // índice del suceso en cada casilla
    let confirmado = false, rev = null, sig = null, arr = null, ignorarClick = false;
    cont.innerHTML = '<div class="lt-tablero"></div>';
    const raiz = cont.firstChild;
    const orden = () => casillas.map(j => j === null ? null : linea.sucesos[j]);
    function pintar() {
      const bien = ordenar(linea.sucesos);
      const libres = linea.sucesos.map((_, j) => j).filter(j => !casillas.includes(j));
      raiz.innerHTML = '<div class="q-card lt-cab"><div class="q">' + esc(opts.cab) + '</div><div class="sub">' +
        (rev ? esc(linea.titulo) : 'Ordena del más antiguo al más reciente: toca o arrastra cada tarjeta a su lugar.') + '</div></div>' +
        '<div class="lt-extremo">⬆ Más antiguo</div><ol class="lt-linea" aria-label="Línea del tiempo">' + casillas.map((j, k) => {
          const x = j === null ? null : linea.sucesos[j];
          const estado = rev ? (x && x.anio === bien[k].anio ? ' ok' : ' bad') : '';
          return '<li><button type="button" class="lt-casilla' + (x ? ' llena' : '') + estado + (rev ? ' lt-revela' : '') + '" data-lt-casilla="' + k + '"' + (rev ? ' disabled' : '') +
            ' aria-label="Lugar ' + (k + 1) + (x ? ': ' + esc(x.txt) : ', vacío') + '"><span class="lt-num">' + (k + 1) + '</span>' +
            (x ? '<span class="lt-txt">' + esc(x.txt) + '</span>' : '<span class="lt-txt lt-vacia">Toca o arrastra un suceso aquí</span>') +
            (rev ? '<span class="lt-anio">' + (x ? esc(anioTexto(x.anio)) : '—') + ' ' + (estado === ' ok' ? '✔' : '✘') + '</span>' : '') + '</button></li>';
        }).join('') + '</ol><div class="lt-extremo">⬇ Más reciente</div>' +
        (rev ? '' : '<div class="lt-pool" aria-label="Sucesos por colocar">' + libres.map(j => '<button type="button" class="lt-tarjeta" data-lt-tarjeta="' + j + '">' + esc(linea.sucesos[j].txt) + '</button>').join('') + '</div>' +
          '<div class="row-btns"><button type="button" class="btn ghost" data-lt="borrar">↺ Borrar</button><button type="button" class="btn" data-lt="confirmar"' + (libres.length ? ' disabled' : '') + '>✔ Confirmar</button></div>') +
        (rev ? '<div class="feedback ' + (rev.ok ? 'ok' : 'bad') + '" id="lt-fb" role="status">' + esc(rev.msg) + '</div>' + htmlCorrecto(linea) : '') +
        (sig ? '<div class="row-btns"><button type="button" class="btn" data-lt="siguiente">' + esc(sig.texto) + '</button></div>' : '');
    }
    function mover(origen, destino) {
      if (origen.tipo === 'pool') { if (destino.tipo === 'casilla') casillas[destino.i] = origen.i; }
      else if (destino.tipo === 'pool') casillas[origen.i] = null;
      else { const j = casillas[origen.i]; casillas[origen.i] = casillas[destino.i]; casillas[destino.i] = j; }
      pintar();
    }
    function confirmar(porTiempo) {
      if (confirmado) return;
      confirmado = true;
      opts.alConfirmar(orden(), !!porTiempo);
    }
    function destinoEn(x, y) {
      const el = document.elementFromPoint(x, y); if (!el) return null;
      const c = el.closest('[data-lt-casilla]'); if (c && raiz.contains(c)) return { tipo: 'casilla', i: Number(c.dataset.ltCasilla) };
      const p = el.closest('.lt-pool'); if (p && raiz.contains(p)) return { tipo: 'pool' };
      return null;
    }
    const marcarDestino = d => raiz.querySelectorAll('.lt-destino').forEach(x => x.classList.remove('lt-destino')) ||
      (d && d.tipo === 'casilla' && raiz.querySelector('[data-lt-casilla="' + d.i + '"]').classList.add('lt-destino'));
    const alMover = e => {
      if (!arr || e.pointerId !== arr.id) return;
      const dx = e.clientX - arr.x, dy = e.clientY - arr.y;
      if (!arr.activo && Math.hypot(dx, dy) < 8) return;
      arr.activo = true; arr.el.classList.add('lt-arrastrando');
      arr.el.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
      marcarDestino(destinoEn(e.clientX, e.clientY));
      e.preventDefault();
    };
    const terminarArrastre = e => {
      if (!arr || e.pointerId !== arr.id) return;
      const a = arr; arr = null;
      g.removeEventListener('pointermove', alMover); g.removeEventListener('pointerup', terminarArrastre); g.removeEventListener('pointercancel', terminarArrastre);
      if (!a.activo) return;
      ignorarClick = true; setTimeout(() => { ignorarClick = false; }, 0);
      const d = e.type === 'pointerup' ? destinoEn(e.clientX, e.clientY) : null;
      if (d && !confirmado) mover(a.origen, d); else pintar();
    };
    raiz.addEventListener('pointerdown', e => {
      if (confirmado || e.button > 0) return;
      const el = e.target.closest('[data-lt-tarjeta], .lt-casilla.llena');
      if (!el) return;
      const origen = el.dataset.ltTarjeta !== undefined ? { tipo: 'pool', i: Number(el.dataset.ltTarjeta) } : { tipo: 'casilla', i: Number(el.dataset.ltCasilla) };
      arr = { el, origen, x: e.clientX, y: e.clientY, activo: false, id: e.pointerId };
      g.addEventListener('pointermove', alMover, { passive: false }); g.addEventListener('pointerup', terminarArrastre); g.addEventListener('pointercancel', terminarArrastre);
    });
    raiz.addEventListener('click', e => {
      const b = e.target.closest('[data-lt]');
      if (b && b.dataset.lt === 'siguiente' && sig) { const f = sig.fn; sig = null; b.disabled = true; return f(); }
      if (ignorarClick || confirmado) return;
      const t = e.target.closest('[data-lt-tarjeta]'), c = e.target.closest('[data-lt-casilla]');
      if (t) { const k = casillas.indexOf(null); if (k >= 0) mover({ tipo: 'pool', i: Number(t.dataset.ltTarjeta) }, { tipo: 'casilla', i: k }); return; }
      if (c && casillas[Number(c.dataset.ltCasilla)] !== null) return mover({ tipo: 'casilla', i: Number(c.dataset.ltCasilla) }, { tipo: 'pool' });
      if (b && b.dataset.lt === 'borrar') { casillas.fill(null); pintar(); }
      if (b && b.dataset.lt === 'confirmar') confirmar(false);
    });
    pintar();
    return {
      confirmar, orden,
      revelar: (msg, ok) => { rev = { msg, ok }; pintar(); },
      boton: (texto, fn) => { sig = { texto, fn }; pintar(); },
    };
  }

  // ---------- Individual: elegir tema y jugar ----------
  g.elegirLineaTiempo = async function () {
    const d = await datos('cultura');
    marco('cultura-linea', { menu: true });
    const m = document.getElementById('m-body');
    m.innerHTML = '<div class="q-card"><div class="big">📜</div><div class="q">Elige tu línea del tiempo</div><div class="sub">Ordena de 4 a 6 sucesos del más antiguo al más reciente · ' +
      LT.VIDAS + ' vidas · ' + LT.SEGUNDOS + ' s por línea</div></div><div class="opts">' + TEMAS.map(t =>
        '<button class="opt" data-ltema="' + esc(t.id) + '">' + esc(t.emoji + ' ' + t.titulo) + '</button>').join('') + '</div>';
    m.addEventListener('click', e => { const b = e.target.closest('[data-ltema]'); if (b) g.jugarLineaTiempo(d, b.dataset.ltema); });
  };

  g.jugarLineaTiempo = function (d, tema) {
    const plan = planIndividual(d, tema, Math.random);
    const m = marco('cultura-linea', { vidas: VIDAS });
    let i = 0, puntos = 0, perfectas = 0, racha = 0, vidas = VIDAS, terminado = false, stop = null, quedan = SEGUNDOS, tab = null;
    const t0 = Date.now();
    m.vidas(vidas);
    const acabar = titulo => {
      if (terminado) return; terminado = true; if (stop) stop();
      terminar('cultura-linea', { puntos, aciertos: perfectas, total: i, segundos: (Date.now() - t0) / 1000, titulo,
        detalle: 'Tema: <b>' + esc(nombreTema(tema)) + '</b> · ' + plural(perfectas, 'línea perfecta', 'líneas perfectas') + ' de ' + i });
    };
    function siguiente() {
      if (terminado) return;
      if (i >= plan.length) return acabar('🏁 ¡Completaste la línea del tiempo!');
      const linea = plan[i];
      tab = tablero(m.body, linea, { cab: 'Línea ' + (i + 1) + ' de ' + plan.length + ' · ' + plural(linea.sucesos.length, 'suceso', 'sucesos'), alConfirmar: calificar });
      if (stop) stop();
      stop = reloj(SEGUNDOS, s => { quedan = s; m.tiempo(s, SEGUNDOS); }, () => tab.confirmar(true));
    }
    function calificar(orden, porTiempo) {
      if (stop) stop();
      const linea = plan[i], n = linea.sucesos.length;
      const a = aciertos(orden, linea), perfecta = a === n;
      racha = perfecta ? racha + 1 : 0;
      const gana = puntosIndividual({ aciertos: a, n, racha, segundosSobran: quedan });
      puntos += gana; m.puntos(puntos); i++;
      if (perfecta) { perfectas++; sonidoOk(); } else { sonidoMal(); vidas--; m.vidas(vidas); }
      tab.revelar((porTiempo ? '⏰ ¡Tiempo! ' : '') + (perfecta ? '✔ ¡Línea perfecta! +' + gana + (racha > 1 ? ' · racha ×' + racha + ' 🔥' : '')
        : '✘ ' + a + ' de ' + n + ' en su lugar · +' + gana + ' · pierdes una vida'), perfecta);
      const fin = vidas <= 0 || i >= plan.length;
      tab.boton(fin ? '🏁 Ver mi resultado' : '▶ Siguiente línea', () => fin ? acabar(vidas <= 0 ? '💔 ¡Sin vidas!' : '🏁 ¡Completaste la línea del tiempo!') : siguiente());
    }
    siguiente();
  };

  // ---------- En sala (openspec: cultura-conocimiento) ----------
  // Sincronizada por reloj como el quiz: 5 líneas de 40 s + 8 s de revelación. Estado propio en sala.lt (se reinicia
  // al cambiar de sala, p. ej. en la revancha).
  const estadoSala = () => {
    const s = sala;
    if (!s.lt || s.lt.codigo !== s.codigo) s.lt = { codigo: s.codigo, enviadas: {}, ordenes: {}, tab: null };
    return s.lt;
  };
  function enviarLinea(q, orden) {
    const s = sala, st = estadoSala();
    if (st.enviadas[q]) return;
    st.enviadas[q] = true; st.ordenes[q] = orden;
    const linea = s.contenido[q], n = linea.sucesos.length, lim = dur(L_MS);
    const msEsc = Math.min(lim, Math.max(0, ahoraServidor() - (s.estado.sala.inicio + q * (lim + dur(L_REV)))));
    const a = aciertos(orden, linea), correcta = a === n;
    const puntos = puntosSala(a, n, msEsc, lim), ms = Math.round(msEsc / TIEMPO);
    s.mias = s.mias || {}; s.mias[q] = { correcta, puntos, ms, aciertos: a };
    if (correcta) sonidoOk(); else sonidoMal();
    s.vista = null; pintarSala();
    post('/juegos/sala/' + s.codigo + '/respuesta', { q, correcta, puntos, ms, aciertos: a });
  }
  // Totales hasta la línea `hasta`: puntos, sucesos acertados y tiempo (sin responder = tiempo completo).
  function totalesLinea(hasta) {
    const s = sala, e = s.estado;
    return podioLinea(participantes().map(p => {
      let total = 0, ultimo = 0, ac = 0, ms = 0;
      for (let q = 0; q <= hasta; q++) {
        const n = s.contenido[q].sucesos.length;
        const r = p.bot ? botLinea(rngDe(e.sala.seed, p.bot.id + '|linea' + q), p.bot.acierto, n, L_MS) : (p.respuestas[q] || (p.id === e.yo && s.mias && s.mias[q]));
        if (r) { total += r.puntos; ac += r.aciertos || 0; ms += r.ms; if (q === hasta) ultimo = r.puntos; } else ms += L_MS;
      }
      return { id: p.id, nombre: p.nombre, tipo: p.tipo, avatar: p.avatar, total, ultimo, aciertos: ac, ms };
    }));
  }
  const miRespuesta = q => { const s = sala, e = s.estado; return ((e.jugadores.find(x => x.id === e.yo) || {}).respuestas || {})[q] || (s.mias && s.mias[q]); };

  g.pintarLineaSala = function (body) {
    const s = sala, e = s.estado, st = estadoSala();
    const lim = dur(L_MS), ciclo = lim + dur(L_REV);
    const t = ahoraServidor() - e.sala.inicio;
    const bar = document.getElementById('m-bar');
    if (t < 0) {
      bar.hidden = true;
      const k = 'cuenta:' + Math.ceil(-t / 1000);
      if (s.vista !== k) { body.innerHTML = '<div class="q-card"><div class="sub">¡Prepárate! · ' + esc(nombreTema(e.sala.opciones.cat)) + '</div><div class="letra">' + Math.ceil(-t / 1000) + '</div><div class="sub">' + participantes().length + ' jugadores · ' + RONDAS_SALA + ' líneas</div></div>'; s.vista = k; }
      return;
    }
    const q = Math.floor(t / ciclo);
    if (q >= RONDAS_SALA) {
      const filas = totalesLinea(RONDAS_SALA - 1);
      s.finAciertos = Object.values((e.jugadores.find(x => x.id === e.yo) || {}).respuestas || {}).filter(r => r.correcta).length;
      s.finTotal = RONDAS_SALA;
      return pintarFinalSala(body, filas, null, '📜 ¡Fin de la línea del tiempo!');
    }
    const enQ = t - q * ciclo, linea = s.contenido[q], mia = miRespuesta(q);
    const cab = 'Línea ' + (q + 1) + ' de ' + RONDAS_SALA + ' · ' + plural(linea.sucesos.length, 'suceso', 'sucesos');
    if (enQ < lim) {
      bar.hidden = false; bar.firstChild.style.width = Math.max(0, 100 - enQ / lim * 100) + '%';
      const k = 'lt:' + q + ':' + (mia ? 'r' : '');
      if (s.vista !== k) {
        s.vista = k;
        if (mia) body.innerHTML = '<div class="q-card lt-cab"><div class="q">' + esc(cab) + '</div><div class="sub">' + esc(linea.titulo) + '</div></div><div class="feedback ok" role="status">✔ Línea enviada · esperando a los demás…</div>';
        else st.tab = Object.assign(tablero(body, linea, { cab, alConfirmar: orden => enviarLinea(q, orden) }), { q });
      }
      return;
    }
    // Se acabó el tiempo: se envía lo colocado (las casillas vacías cuentan como error).
    if (!mia && !st.enviadas[q]) return enviarLinea(q, st.tab && st.tab.q === q ? st.tab.orden() : []);
    bar.hidden = true;
    const k = 'ltrev:' + q + ':' + e.jugadores.map(x => Object.keys(x.respuestas || {}).length).join(',');
    if (s.vista !== k) {
      s.vista = k;
      const r = miRespuesta(q), n = linea.sucesos.length;
      body.innerHTML = '<div class="q-card lt-cab"><div class="q">' + esc(cab) + '</div><div class="sub">' + esc(linea.titulo) + '</div></div>' +
        (r ? '<div class="feedback ' + (r.correcta ? 'ok">✔ ¡Línea perfecta! +' + r.puntos : 'bad">✘ ' + r.aciertos + ' de ' + n + ' en su lugar · +' + r.puntos) + '</div>' : '<div class="feedback bad">⏰ No respondiste</div>') +
        htmlCorrecto(linea) + '<h2>🏆 Marcador</h2>' + marcadorHtml(totalesLinea(q), e.yo);
    }
  };

  // Las 5 líneas de la sala, iguales para todos (semilla de la sala).
  g.lineasDeSala = async (seed, opciones) => lineasPartida(await datos('cultura'), (opciones || {}).cat, rngDe(seed, 'linea'));
})(globalThis);
