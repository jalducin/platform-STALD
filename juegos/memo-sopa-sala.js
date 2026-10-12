// 🃏 Memorama y 🔎 Sopa de letras en partida (openspec: juegos-salas-grandes): todos resuelven el mismo tablero (misma
// semilla), cada quien envía su resultado (el servidor lo valida contra su reloj) y el podio sale por tiempo, errores o
// palabras. Contra bots y amigos. El modo individual sigue en juegos.html (jugarMemorama, jugarSopa).
(function (g) {
  'use strict';
  const LIMITE_MS = 180000, GRACIA_MS = 5000, PARES = 8, PALABRAS = 6, N_SOPA = 10;
  const DIRS = [[0, 1], [1, 0], [1, 1], [-1, 1]], LETRAS = 'ABCDEFGHIJKLMNOPRSTUVWY';
  const barajarCon = (a, r) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
  // Tablero del Memorama: 8 pares inglés–español.
  function memo(vocab, r) {
    const pares = barajarCon(vocab, r).slice(0, PARES);
    return barajarCon(pares.flatMap((p, k) => [{ k, lado: 'en', txt: p.en }, { k, lado: 'es', txt: p.es, em: p.emoji }]), r);
  }
  // Sopa de 10×10 con exactamente 6 palabras (sigue probando candidatas hasta acomodarlas).
  function sopa(vocab, r) {
    const grid = Array.from({ length: N_SOPA }, () => new Array(N_SOPA).fill('')), puestas = [];
    for (const w of barajarCon(vocab.filter(v => /^[a-z]{3,8}$/.test(v.en)), r)) {
      if (puestas.length >= PALABRAS) break;
      const W = w.en.toUpperCase();
      for (let intento = 0; intento < 60; intento++) {
        const [dr, dc] = DIRS[Math.floor(r() * DIRS.length)], r0 = Math.floor(r() * N_SOPA), c0 = Math.floor(r() * N_SOPA);
        const celdas = [...W].map((_, k) => [r0 + dr * k, c0 + dc * k]);
        if (celdas.every(([y, x], k) => y >= 0 && y < N_SOPA && x >= 0 && x < N_SOPA && (!grid[y][x] || grid[y][x] === W[k]))) {
          celdas.forEach(([y, x], k) => { grid[y][x] = W[k]; }); puestas.push({ w, W, celdas }); break;
        }
      }
    }
    for (let y = 0; y < N_SOPA; y++) for (let x = 0; x < N_SOPA; x++) if (!grid[y][x]) grid[y][x] = LETRAS[Math.floor(r() * LETRAS.length)];
    return { grid, puestas };
  }
  g.MemoSopaSala = { LIMITE_MS, PARES, PALABRAS, memo, sopa };
  if (typeof document === 'undefined') return;

  const SG = g.SalasGrandes;
  SG.css('css-memo-sopa', `
  .ms-prog { list-style: none; margin: 10px 0 0; padding: 0; font-size: .85rem; }
  .ms-prog li { display: flex; justify-content: space-between; gap: 8px; padding: 3px 4px; border-bottom: 1px dashed var(--border); }
  .ms-barra { height: 6px; border-radius: 3px; background: var(--border); overflow: hidden; flex: 1; max-width: 120px; align-self: center; }
  .ms-barra i { display: block; height: 100%; background: var(--ok); }
  `);
  const fmtMs = ms => ms === null || ms === undefined ? '—' : (ms / 1000).toFixed(1) + ' s';
  // Resultado simulado de un bot con su generador `r` (mismo orden de llamadas a r que antes). Con `conVaEn`, la sopa
  // sin terminar trae también la hora a la que «va» (para el avance en vivo).
  function resultadoBot(juego, r, conVaEn) {
    if (juego === 'en-memorama') return { ms: 30000 + Math.floor(r() * 70000), errores: 2 + Math.floor(r() * 12), pares: PARES, fin: true };
    if (r() < 0.75) return { ms: 45000 + Math.floor(r() * 110000), encontradas: PALABRAS, fin: true };
    const b = { ms: null, encontradas: 3 + Math.floor(r() * 3), fin: true };
    if (conVaEn) b.vaEn = 120000 + Math.floor(r() * 50000);
    return b;
  }

  // Resultado de cada participante: el suyo (servidor) o el simulado de los bots (aparece a su hora).
  function resultados(juego) {
    const e = sala.estado, s = e.sala, ahora = ahoraServidor() - s.inicio;
    return participantes().map(p => {
      if (p.bot) {
        const r = rngDe(s.seed, juego + '|' + p.id);
        const b = resultadoBot(juego, r, true);
        const cuando = b.ms !== null ? b.ms : LIMITE_MS;
        if (ahora >= cuando) return { p, r: b };
        return { p, r: juego === 'mente-sopa' ? { ms: null, encontradas: Math.floor(PALABRAS * ahora / (b.vaEn || cuando)), fin: false } : null };
      }
      const j = e.jugadores.find(x => x.id === p.id);
      const r = (j && j.resultado) || (p.id === e.yo && sala.ms && sala.ms.mio) || null;
      return { p, r };
    });
  }
  function podio(juego, lista) {
    const gana = (sala.estado.sala.opciones || {}).gana === 'errores' ? 'errores' : 'tiempo';
    const completo = x => x.r && x.r.fin && x.r.ms !== null;
    const orden = lista.slice().sort((a, b) => {
      if (completo(a) !== completo(b)) return completo(a) ? -1 : 1;
      if (completo(a)) {
        if (juego === 'en-memorama' && gana === 'errores') return a.r.errores - b.r.errores || a.r.ms - b.r.ms;
        return a.r.ms - b.r.ms || (a.r.errores || 0) - (b.r.errores || 0);
      }
      const va = x => {
        if (!x.r) return -1;
        return juego === 'en-memorama' ? x.r.pares : x.r.encontradas;
      };
      return va(b) - va(a);
    });
    // Puntos: por lugar si terminó; si no, por pares o palabras encontradas.
    const totalDe = (x, i) => {
      if (completo(x)) return SG.puntosLugar(i);
      if (!x.r) return 0;
      return juego === 'en-memorama' ? (x.r.pares || 0) * 30 : (x.r.encontradas || 0) * 60;
    };
    return orden.map((x, i) => ({ id: x.p.id, nombre: x.p.nombre, tipo: x.p.tipo, avatar: x.p.avatar, ultimo: 0, r: x.r,
      total: totalDe(x, i) }));
  }
  // Cómo va cada quien: jugando, terminó (tiempo y errores o palabras) o se le acabó el tiempo.
  function textoProgreso(juego, r) {
    if (!r) return '🏃 jugando…';
    if (juego === 'en-memorama') return r.ms !== null ? '✅ ' + fmtMs(r.ms) + ' · ' + r.errores + ' errores' : '⏰ ' + r.pares + ' pares';
    if (r.fin && r.ms !== null) return '✅ ' + fmtMs(r.ms);
    return r.encontradas + '/' + PALABRAS + (r.fin ? ' ⏰' : '');
  }
  function progresoHtml(juego) {
    return resultados(juego).map(({ p, r }) => {
      const txt = textoProgreso(juego, r);
      const barra = juego === 'mente-sopa' ? '<span class="ms-barra"><i style="width:' + Math.round(((r && r.encontradas) || 0) / PALABRAS * 100) + '%"></i></span>' : '';
      return '<li' + (p.id === sala.estado.yo ? ' style="font-weight:800"' : '') + '><span>' + avatarHtml(p.avatar, 18) + ' ' + escapeHtml(p.nombre) + (p.bot ? ' 🤖' : '') + '</span>' + barra + '<span>' + txt + '</span></li>';
    }).join('');
  }
  function enviar(resultado) {
    sala.ms.mio = resultado;
    post('/juegos/sala/' + sala.codigo + '/respuesta', { resultado }).then(() => traerSala());
  }

  function pintar(body) {
    const e = sala.estado, s = e.sala, juego = s.juego, st = sala.ms;
    const memoJ = juego === 'en-memorama';
    if (SG.cuenta(body, '¡Prepárense! ' + (memoJ ? 'Mismo memorama para todos' : 'Misma sopa para todos'))) return;
    const t = ahoraServidor() - s.inicio;
    const lista = resultados(juego);
    const humanosListos = lista.filter(x => !x.p.bot).every(x => x.r && x.r.fin);
    if (humanosListos || t > LIMITE_MS + GRACIA_MS) {
      pintarResultados(body, juego, lista);
      return;
    }
    SG.barra(Math.max(0, (LIMITE_MS - t) / LIMITE_MS));
    if (t >= LIMITE_MS && !(st.mio && st.mio.fin)) enviar(memoJ ? { ms: null, errores: st.errores, pares: st.pares, fin: true } : { ms: null, encontradas: st.encontradas, fin: true });
    const listo = st.mio && st.mio.fin;
    const clave = 'ms:' + (listo ? 'espera' : 'juega');
    if (sala.vista !== clave) {
      sala.vista = clave;
      body.innerHTML = vistaJuego(st, s, memoJ, listo) +
        '<h2>👥 Así van</h2><ul class="ms-prog" id="ms-prog"></ul>';
      if (!listo && !memoJ) st.encontradasSet.forEach(i => marcarPalabra(i));
    }
    const prog = progresoHtml(juego), ul = document.getElementById('ms-prog');
    if (ul && ul.innerHTML !== prog) ul.innerHTML = prog;
  }
  // Podio y tabla de resultados al terminar (todas las personas acabaron o pasó el tiempo con gracia).
  function pintarResultados(body, juego, lista) {
    const e = sala.estado, s = e.sala, st = sala.ms;
    const memoJ = juego === 'en-memorama';
    SG.barra(null);
    if (sala.vista === 'final') return;
    const filas = podio(juego, lista.map(x => x.p.bot && (!x.r || !x.r.fin) ? { p: x.p, r: resultadoBotFinal(juego, x.p) } : x));
    const mio = st.mio || {};
    sala.finAciertos = memoJ ? (mio.pares || 0) : (mio.encontradas || 0); sala.finTotal = memoJ ? PARES : PALABRAS;
    let crit = 'gana quien encontró más palabras y más rápido';
    if (memoJ) crit = (s.opciones || {}).gana === 'errores' ? 'gana quien tuvo menos errores' : 'gana el menor tiempo';
    const dato = f => {
      if (!f.r) return '—';
      return memoJ ? f.r.errores : f.r.encontradas;
    };
    pintarFinalSala(body, filas, null, memoJ ? '🃏 ¡Memorama terminado!' : '🔎 ¡Sopa terminada!');
    body.insertAdjacentHTML('beforeend', '<h2>⏱ Resultados</h2><p class="muted" style="margin-top:-6px">' + crit + '.</p><div class="scroll-x"><table class="inv"><thead><tr><th>#</th><th>Jugador</th><th>Tiempo</th><th>' + (memoJ ? 'Errores' : 'Palabras') + '</th><th>Pts</th></tr></thead><tbody>' +
      filas.map((f, i) => '<tr' + (f.id === e.yo ? ' class="yo"' : '') + '><td>' + (i + 1) + '</td><td>' + escapeHtml(f.nombre) + (f.tipo === 'bot' ? ' 🤖' : '') + '</td><td class="num">' + (f.r && f.r.fin && f.r.ms !== null ? fmtMs(f.r.ms) : 'No terminó') + '</td><td class="num">' +
        dato(f) + '</td><td class="num">' + f.total + '</td></tr>').join('') + '</tbody></table></div>');
  }
  // Contenido mientras se juega: espera (ya terminé), memorama o sopa.
  function vistaJuego(st, s, memoJ, listo) {
    if (listo) return '<div class="q-card"><div class="q">' + (st.mio.ms !== null ? '🏁 ¡Terminaste en ' + fmtMs(st.mio.ms) + '!' : '⏰ Se acabó tu tiempo') + '</div><div class="sub">Esperando a los demás…</div></div>';
    if (memoJ) {
      return '<p class="muted" style="text-align:center;margin-top:0">Une cada palabra en inglés con su significado. ' + ((s.opciones || {}).gana === 'errores' ? 'Gana quien se equivoque menos.' : 'Gana el más rápido.') + ' <b id="ms-err">0</b> errores</p><div class="memo">' +
        st.contenido.map((c, i) => '<button data-msm="' + i + '" aria-label="Carta ' + (i + 1) + '">' + (c.em ? '<span class="em">' + escapeHtml(c.em) + '</span>' : '') + escapeHtml(c.txt) + '</button>').join('') + '</div>';
    }
    return '<p class="muted" style="text-align:center;margin-top:0">Toca la primera y la última letra de cada palabra en inglés. ¡Carrera!</p><div class="sopa" style="grid-template-columns:repeat(' + N_SOPA + ',1fr)">' +
      st.contenido.grid.flatMap((fila, y) => fila.map((l, x) => '<button data-mss-r="' + y + '" data-mss-c="' + x + '">' + l + '</button>')).join('') + '</div>' +
      '<div class="lista-sopa">' + st.contenido.puestas.map((p, i) => '<span id="mss-w' + i + '">' + escapeHtml(p.w.emoji + ' ' + p.w.es) + '</span>').join('') + '</div>';
  }
  function resultadoBotFinal(juego, p) {
    const r = rngDe(sala.estado.sala.seed, juego + '|' + p.id);
    return resultadoBot(juego, r, false);
  }
  function marcarPalabra(i) {
    const p = sala.ms.contenido.puestas[i];
    p.celdas.forEach(([y, x]) => { const c = document.querySelector('[data-mss-r="' + y + '"][data-mss-c="' + x + '"]'); if (c) c.classList.add('found'); });
    const w = document.getElementById('mss-w' + i); if (w) { w.classList.add('found'); w.textContent = p.w.emoji + ' ' + p.w.es + ' = ' + p.W; }
  }

  function clic(e) {
    const st = sala.ms; if (!st || (st.mio && st.mio.fin) || ahoraServidor() < sala.estado.sala.inicio) return false;
    const b = e.target.closest('[data-msm]');
    if (b) {
      if (st.bloqueado || b.classList.contains('up') || b.classList.contains('done')) return true;
      b.classList.add('up'); st.abiertas.push(Number(b.dataset.msm));
      if (st.abiertas.length < 2) return true;
      const [a, c] = st.abiertas.map(x => st.contenido[x]), btns = st.abiertas.map(x => document.querySelector('[data-msm="' + x + '"]'));
      if (a.k === c.k && a.lado !== c.lado) {
        btns.forEach(x => x.classList.add('done')); st.abiertas = []; st.pares++; sonidoOk();
        if (st.pares === PARES) enviar({ ms: Math.round(ahoraServidor() - sala.estado.sala.inicio), errores: st.errores, pares: PARES, fin: true });
      } else {
        st.errores++; st.bloqueado = true; sonidoMal();
        const n = document.getElementById('ms-err'); if (n) n.textContent = st.errores;
        setTimeout(() => { btns.forEach(x => x && x.classList.remove('up')); st.abiertas = []; st.bloqueado = false; }, 900);
      }
      return true;
    }
    const cel = e.target.closest('[data-mss-r]');
    if (cel) {
      const y = Number(cel.dataset.mssR), x = Number(cel.dataset.mssC);
      if (!st.inicioSel) { st.inicioSel = [y, x]; cel.classList.add('sel'); return true; }
      const [y0, x0] = st.inicioSel; st.inicioSel = null;
      document.querySelectorAll('.sopa .sel').forEach(z => z.classList.remove('sel'));
      const extremos = p => [p.celdas[0], p.celdas[p.celdas.length - 1]];
      const hit = st.contenido.puestas.findIndex((p, i) => {
        if (st.encontradasSet.has(i)) return false;
        const [a, z] = extremos(p);
        return (a[0] === y0 && a[1] === x0 && z[0] === y && z[1] === x) || (z[0] === y0 && z[1] === x0 && a[0] === y && a[1] === x);
      });
      if (hit < 0) { sonidoMal(); return true; }
      st.encontradasSet.add(hit); st.encontradas = st.encontradasSet.size; marcarPalabra(hit); sonidoOk();
      enviar({ ms: Math.round(ahoraServidor() - sala.estado.sala.inicio), encontradas: st.encontradas, fin: st.encontradas === PALABRAS });
      return true;
    }
    return false;
  }

  async function preparar() {
    const s = sala.estado.sala, d = await datos('ingles');
    const contenido = s.juego === 'en-memorama' ? memo(d.vocabulario, rngDe(s.seed, 'memo')) : sopa(d.vocabulario, rngDe(s.seed, 'sopa'));
    const mio = (sala.estado.jugadores.find(j => j.id === sala.estado.yo) || {}).resultado || null;
    sala.ms = { contenido, mio, abiertas: [], errores: 0, pares: 0, bloqueado: false, encontradas: mio ? mio.encontradas || 0 : 0, encontradasSet: new Set(), inicioSel: null };
    return contenido;
  }
  const registro = { preparar, pintar, clic };
  g.SALAS_GRANDES['en-memorama'] = { ...registro, opcionesHtml: '<label for="p-gana">¿Quién gana?</label><select id="p-gana" class="sel"><option value="tiempo">⏱ El menor tiempo</option><option value="errores">🎯 Menos errores</option></select>',
    opciones: () => ({ gana: document.getElementById('p-gana').value }),};
  g.SALAS_GRANDES['mente-sopa'] = registro;
})(globalThis);
