// Juegos · Arcade (openspec: organizar-codigo).
// Dragon Run, Axo, Karts, Futbolito y Billar en iframe (jugarArcade, progreso en el servidor) y sus carreras en sala.
// No confundir con juegos/arcade.js (reglas sin DOM que también cargan los juegos del iframe).
// Script clásico (sin build ni módulos ES): juegos.html lo carga en orden y todos comparten el ámbito global
// (const/let/function de nivel superior). Ver docs/frontend-standards.md, «Estructura de juegos/app/».
// ---------- Arcade: Dragon Run (juego del profe en iframe del mismo origen; openspec: dragon-run, dragon-run-misiones) ----------
// Avance en el servidor de un juego embebido: misma lógica que jugarArcade (PUT encadenado con la versión `v`; ante
// version_vieja reintenta una vez si ya se leyó el avance). La cola vive a nivel de página: al volver a jugar, la
// lectura espera al último guardado. TODO: unificar con jugarArcade cuando no haya cambios en paralelo ahí.
const colasProgreso = {};
function canalProgreso(id, aJuego) {
  let v = 0, cargado = false, pendiente = null;
  const cola = () => colasProgreso[id] || Promise.resolve();
  const lectura = cola().then(() => api('/juegos/progreso/' + id)).catch(() => ({ ok: false, status: 0, body: {} }));
  colasProgreso[id] = lectura.then(r => { if (r.ok) { v = r.body.v; cargado = true; } });
  const put = datos => api('/juegos/progreso/' + id, { method: 'PUT', headers: { 'content-type': 'text/plain;charset=UTF-8' }, body: JSON.stringify({ v, datos }) });
  const guardar = datos => {
    pendiente = datos;
    colasProgreso[id] = cola().then(async () => {
      if (!pendiente) return;
      const d = pendiente; pendiente = null;
      let r = await put(d);
      if (r.status === 409 && r.body.error === 'version_vieja' && cargado) { v = r.body.v; r = await put(d); }
      if (r.ok) v = r.body.v;
      aJuego({ tipo: 'guardado', ok: r.ok });
    }).catch(() => aJuego({ tipo: 'guardado', ok: false }));
  };
  return { lectura, guardar };
}
function jugarDragonRun() {
  const m = marco('dragon-run');
  document.getElementById('m-puntos').hidden = true;
  enCurso.foto = () => null; // el avance de misiones vive en el servidor: recargar no pide confirmación
  const q = new URLSearchParams(location.search), extra = [];
  if (q.get('dragonAuto') === '1') extra.push('auto=1'); // solo pruebas E2E
  if (q.get('arcadePrueba') === '1') extra.push('prueba=1'); // ganchos window.__dragonPrueba, solo E2E
  m.body.innerHTML = '<div class="arcade-caja"><iframe id="dragon-frame" src="juegos/dragon-run.html' + (extra.length ? '?' + extra.join('&') : '') + '" title="Dragon Run" allow="autoplay"></iframe></div>';
  const frame = document.getElementById('dragon-frame');
  frame.addEventListener('load', () => { try { frame.focus(); } catch (e) { /* sin foco */ } });
  // La música de Juegos se pausa mientras corre el dragón (el juego trae la suya).
  const estilo = musica.estilo;
  detenerMusica();
  const aJuego = msg => { try { frame.contentWindow.postMessage(msg, location.origin); } catch (e) { /* iframe cerrado */ } };
  const canal = canalProgreso('dragon-run', aJuego);
  const alMensaje = async ev => {
    const d = ev.data || {};
    if (ev.origin !== location.origin || ev.source !== frame.contentWindow || d.juego !== 'dragon-run') return;
    if (d.tipo === 'listo') {
      const r = await canal.lectura;
      aJuego({ tipo: 'inicio', progreso: r.ok ? r.body.datos : null, semilla: (state.jugador && state.jugador.id) || '', aviso: r.ok ? '' : '⚠️ No se pudo cargar tu avance: juega y se guardará cuando vuelva la conexión.' });
    } else if (d.tipo === 'guardar' && d.datos) canal.guardar(d.datos);
    else if (d.fin) {
      // Misiones, logros y premios de esta carrera (texto del juego: se escapa porque `detalle` es HTML).
      const misiones = Array.isArray(d.misiones) ? d.misiones.filter(x => typeof x === 'string').slice(0, 12).map(x => escapeHtml(x.slice(0, 120))) : [];
      terminar('dragon-run', {
        puntos: d.puntos, aciertos: d.monedas, total: 0, segundos: d.segundos,
        titulo: d.gano ? '🏰 ¡Llegaste al castillo!' : '🐉 Dragon Run',
        detalle: '📏 ' + escapeHtml(d.metros) + ' m · 🪙 ' + escapeHtml(d.monedas) + ' monedas' + (d.gano ? ' · bono castillo +200' : '') +
          (misiones.length ? '<div class="dr-misiones" style="margin-top:10px;font-weight:700;color:var(--text)">' + misiones.join('<br>') + '</div>' : ''),
      });
    }
  };
  window.addEventListener('message', alMensaje);
  limpiezas.push(() => window.removeEventListener('message', alMensaje), () => { if (estilo) iniciarMusica(estilo); });
}

// ---------- Arcade: Axo y los 12 mundos y Karts Turbo (iframe del mismo origen; openspec: juegos-plataformas-karts) ----------
// El juego no habla con el servidor: esta página le pasa el avance (GET /juegos/progreso/<id>), guarda lo que manda
// (PUT con la versión `v`, una escritura a la vez y gana la última) y registra los puntos de cada nivel o carrera.
const marcoArcade = (src, titulo) => '<div class="arcade-caja"><iframe id="arcade-frame" src="' + src + '" title="' + escapeHtml(titulo) + '" allow="autoplay; accelerometer; gyroscope"></iframe></div>';
const SIN_AVANCE = new Set(['futbolito', 'billar']); // futbolito-billar: juegos de Arcade sin avance guardado
const srcArcade = (id, extra) => 'juegos/' + id + '.html' + (new URLSearchParams(location.search).get('arcadePrueba') === '1' ? '?prueba=1' : '') + (extra || '');
function jugarArcade(id) {
  const m = marco(id);
  document.getElementById('m-puntos').hidden = true;
  enCurso.foto = () => null; // el avance vive en el servidor: recargar no pide confirmación
  m.body.innerHTML = marcoArcade(srcArcade(id), juegoPorId(id).t);
  const frame = document.getElementById('arcade-frame');
  if (matchMedia('(orientation: landscape) and (max-height: 520px)').matches) frame.parentElement.scrollIntoView({ block: 'start' });
  const estilo = musica.estilo;
  detenerMusica();
  const lectura = SIN_AVANCE.has(id) ? Promise.resolve({ ok: true, body: { v: 0, datos: null } }) : api('/juegos/progreso/' + id).catch(() => ({ ok: false, status: 0, body: {} })); // futbolito-billar: sin avance
  let v = 0, cargado = false, pendiente = null, cola = Promise.resolve();
  const aJuego = msg => { try { frame.contentWindow.postMessage(msg, location.origin); } catch (e) { /* iframe cerrado */ } };
  const put = datos => api('/juegos/progreso/' + id, { method: 'PUT', headers: { 'content-type': 'text/plain;charset=UTF-8' }, body: JSON.stringify({ v, datos }) });
  const guardarAvance = datos => {
    pendiente = datos;
    cola = cola.then(async () => {
      if (!pendiente) return;
      const d = pendiente; pendiente = null;
      let r = await put(d);
      // Otra pestaña guardó antes: la acción más reciente manda, pero solo si sí se leyó el avance real.
      if (r.status === 409 && r.body.error === 'version_vieja' && cargado) { v = r.body.v; r = await put(d); }
      if (r.ok) v = r.body.v;
      aJuego({ tipo: 'guardado', ok: r.ok });
    }).catch(() => aJuego({ tipo: 'guardado', ok: false }));
  };
  const alMensaje = async ev => {
    const d = ev.data || {};
    if (ev.origin !== location.origin || ev.source !== frame.contentWindow || d.juego !== id) return;
    if (d.tipo === 'listo') {
      const r = await lectura;
      if (r.ok) { v = r.body.v; cargado = true; }
      aJuego({ tipo: 'inicio', modo: 'individual', progreso: r.ok ? r.body.datos : null, aviso: r.ok ? '' : '⚠️ No se pudo cargar tu avance: juega y se guardará cuando vuelva la conexión.' });
    } else if (d.tipo === 'guardar' && d.datos) guardarAvance(d.datos);
    else if (d.tipo === 'puntos') {
      const res = await post('/juegos/partida', { juego: id, puntos: Math.max(0, Math.round(Number(d.puntos) || 0)), aciertos: Number(d.aciertos) || 0, total: Number(d.total) || 0, segundos: Math.round(Number(d.segundos) || 0) });
      const ok = res.ok && res.body.guardado;
      if (ok) { state.totalIndividual = res.body.totalIndividual; state.totalPartidas = res.body.totalPartidas; state.pos = res.body.pos; state.mejores[id] = res.body.mejor; pintarChip(); }
      aJuego({ tipo: 'puntos-ok', guardado: !!ok, puntos: ok ? res.body.puntos : 0, pos: ok ? res.body.pos : null, error: ok ? null : (res.body.error || res.status) });
    }
  };
  window.addEventListener('message', alMensaje);
  limpiezas.push(() => window.removeEventListener('message', alMensaje), () => { if (estilo) iniciarMusica(estilo); });
}

// ---- Carreras de Arcade en sala (openspec: juegos-plataformas-karts) ----
// Todos juegan el mismo nivel o pista (sala.opciones.mapa; la revancha lo hereda). Cada quien manda su tiempo una vez;
// los bots tienen un tiempo simulado con la semilla. Podio por tiempo con pintarFinalSala (registra final, podio y puntos).
function opcionesMapaArcade(juego) {
  const wrap = document.getElementById('p-mapa-wrap'); if (!wrap) return;
  wrap.hidden = !ARCADE.has(juego);
  if (!ARCADE.has(juego)) return;
  const lista = juego === 'karts' ? Arcade.PISTAS.map(p => p.id) : Arcade.MUNDOS.filter(x => x.jugable).flatMap(x => [x.n + '-1', x.n + '-2']);
  document.getElementById('p-mapa').innerHTML = '<option value="">🎲 Al azar</option>' + lista.map(m => '<option value="' + m + '">' + escapeHtml(Arcade.nombreMapa(juego, m)) + '</option>').join('');
}
const mapaArcade = s => (s.opciones && s.opciones.mapa) || Arcade.mapaDeSala(s.juego, s.seed);
function resultadosArcade() {
  const e = sala.estado, s = e.sala, mapa = mapaArcade(s);
  const filas = participantes().map(p => {
    if (p.bot) return { id: p.id, nombre: p.nombre, tipo: 'bot', avatar: p.avatar, ms: Arcade.tiempoBot(s.juego, mapa, s.seed, p.id), monedas: 0, envio: true };
    const j = e.jugadores.find(x => x.id === p.id);
    const c = (j && j.carrera) || (p.id === e.yo ? sala.arcadeMia : null) || null;
    return { id: p.id, nombre: p.nombre, tipo: p.tipo, avatar: p.avatar, ms: c ? c.ms : null, monedas: c ? c.monedas : 0, envio: !!c };
  }).sort((a, b) => (a.ms === null ? Infinity : a.ms) - (b.ms === null ? Infinity : b.ms));
  filas.forEach((f, i) => { f.total = f.ms === null ? 0 : Arcade.puntosLugar(i + 1); });
  return filas;
}
function pintarArcadeSala(body) {
  const e = sala.estado, s = e.sala, juego = s.juego, mapa = mapaArcade(s);
  const t = ahoraServidor() - s.inicio;
  const filas = resultadosArcade();
  const humanos = filas.filter(f => f.tipo !== 'bot');
  if (humanos.every(f => f.envio) || t > Arcade.LIMITE_SALA[juego] + Arcade.GRACIA_SALA) {
    if (sala.vista === 'final') return;
    const mio = filas.find(f => f.id === e.yo);
    sala.finAciertos = mio ? mio.monedas : 0; sala.finTotal = 0;
    pintarFinalSala(body, filas, null, '🏁 ' + Arcade.nombreMapa(juego, mapa));
    body.insertAdjacentHTML('beforeend', '<h2>⏱ Tiempos</h2><div class="scroll-x"><table class="inv arcade-tiempos"><thead><tr><th>#</th><th>Jugador</th><th>Tiempo</th><th>Pts</th></tr></thead><tbody>' +
      filas.map((f, i) => '<tr' + (f.id === e.yo ? ' class="yo"' : '') + '><td>' + (i + 1) + '</td><td>' + escapeHtml(f.nombre) + (f.tipo === 'bot' ? ' 🤖' : '') + '</td><td class="num">' + (f.ms === null ? 'No terminó' : Arcade.formatoTiempo(f.ms)) + '</td><td class="num">' + f.total + '</td></tr>').join('') + '</tbody></table></div>');
    return;
  }
  const mia = (e.jugadores.find(x => x.id === e.yo) || {}).carrera || sala.arcadeMia;
  if (mia) {
    const k = 'arcade-espera:' + humanos.map(f => f.envio ? 1 : 0).join('') + ':' + Math.ceil((Arcade.LIMITE_SALA[juego] + Arcade.GRACIA_SALA - t) / 10000);
    if (sala.vista === k) return;
    sala.vista = k;
    body.innerHTML = '<div class="q-card"><div class="sub">' + escapeHtml(Arcade.nombreMapa(juego, mapa)) + '</div><div class="q">' + (mia.ms === null ? '⏰ No terminaste' : '🏁 Tu tiempo: ' + Arcade.formatoTiempo(mia.ms)) + '</div>' +
      '<div class="sub">Esperando a que terminen los demás (a más tardar en ' + Math.max(0, Math.ceil((Arcade.LIMITE_SALA[juego] + Arcade.GRACIA_SALA - t) / 1000)) + ' s)…</div></div>' +
      '<ol class="rank">' + humanos.map(f => '<li>' + avatarHtml(f.avatar, 28) + '<span class="n">' + escapeHtml(f.nombre) + '</span><span class="pts">' + (f.envio ? (f.ms === null ? '—' : '⏱ ' + Arcade.formatoTiempo(f.ms)) : '🏃 jugando…') + '</span></li>').join('') + '</ol>';
    return;
  }
  if (sala.vista === 'arcade') return;
  sala.vista = 'arcade';
  body.innerHTML = marcoArcade(srcArcade(juego), juegoPorId(juego).t);
  const frame = document.getElementById('arcade-frame');
  const bots = participantes().filter(p => p.bot).map(p => ({ nombre: p.nombre, ms: Arcade.tiempoBot(juego, mapa, s.seed, p.id), color: (Arcade.BOTS_SALA.find(b => b.id === p.id) || {}).color }));
  const alMensaje = ev => {
    const d = ev.data || {};
    if (ev.origin !== location.origin || ev.source !== frame.contentWindow || d.juego !== juego) return;
    if (d.tipo === 'listo') frame.contentWindow.postMessage({ tipo: 'inicio', modo: 'sala', mapa, seed: s.seed, inicioEn: s.inicio - ahoraServidor(), bots }, location.origin);
    else if (d.tipo === 'meta' && !sala.arcadeMia) {
      const ms = d.ms === null ? null : Math.max(0, Math.round(Number(d.ms) || 0));
      sala.arcadeMia = { ms, monedas: Math.max(0, Math.min(999, Math.round(Number(d.monedas) || 0))) };
      window.removeEventListener('message', alMensaje);
      post('/juegos/sala/' + sala.codigo + '/respuesta', { carrera: sala.arcadeMia }).then(() => traerSala()).then(() => { if (sala.vista !== 'final') { sala.vista = null; pintarSala(); } });
      sala.vista = null; pintarSala();
    }
  };
  window.addEventListener('message', alMensaje);
  limpiezas.push(() => window.removeEventListener('message', alMensaje));
}

// ---- Futbolito y Billar en sala (openspec: futbolito-billar) ----
// El juego vive en su iframe y reproduce los tiros con su motor determinista. Esta página le pasa la mesa (los 2 de
// participantes(): personas y, si falta, el bot), las jugadas del servidor cuando cambian, envía sus tiros y pinta
// el podio con pintarFinalSala (puntos topados a 1000) cuando el juego avisa el fin.
const jugadasFisica = () => sala.estado.jugadores.flatMap(x => (x.jugadas || []).map(j => Object.assign({ jugador: x.id }, j))).sort((a, b) => a.n - b.n);
function pintarFisicaSala(body) {
  const e = sala.estado, s = e.sala, juego = s.juego;
  document.getElementById('m-bar').hidden = true;
  const mesa = participantes().slice(0, 2);
  if (mesa.length < 2) { if (sala.vista !== 'faltan') { body.innerHTML = '<div class="card muted" style="text-align:center">' + juegoPorId(juego).emoji + ' Esperando a tu rival: se juega 1 vs 1.</div>'; sala.vista = 'faltan'; } return; }
  const aFrame = msg => { const f = document.getElementById('arcade-frame'); try { f.contentWindow.postMessage(msg, location.origin); } catch (x) { /* iframe cerrado */ } };
  if (sala.vista === 'fisica') {
    const js = jugadasFisica(), firma = JSON.stringify(js);
    if (sala.fisicaListo && firma !== sala.fisicaFirma) { sala.fisicaFirma = firma; aFrame({ tipo: 'jugadas', jugadas: js, ahora: ahoraServidor() }); }
    return;
  }
  sala.vista = 'fisica'; sala.fisicaListo = false;
  body.innerHTML = marcoArcade(srcArcade(juego), juegoPorId(juego).t);
  const frame = document.getElementById('arcade-frame');
  const orden = mesa.map(p => ({ id: p.id, nombre: p.nombre, bot: !!p.bot }));
  const alMensaje = async ev => {
    const d = ev.data || {};
    if (ev.origin !== location.origin || ev.source !== frame.contentWindow || d.juego !== juego) return;
    if (d.tipo === 'listo') {
      const js = jugadasFisica(); sala.fisicaFirma = JSON.stringify(js); sala.fisicaListo = true;
      aFrame({ tipo: 'inicio', modo: 'sala', seed: s.seed, inicio: s.inicio, ahora: ahoraServidor(), yo: e.yo, orden, jugadas: js });
    } else if (d.tipo === 'jugada' && d.jugada && typeof d.jugada === 'object') {
      const r = await post('/juegos/sala/' + sala.codigo + '/respuesta', { jugada: d.jugada });
      aFrame({ tipo: 'jugada-ok', ok: r.ok, error: r.ok ? null : (r.body.error || r.status) });
      await traerSala(); pintarSala();
    } else if (d.tipo === 'fin' && sala.vista === 'fisica') {
      window.removeEventListener('message', alMensaje);
      const pts = Array.isArray(d.puntos) ? d.puntos : [], yo = orden.findIndex(p => p.id === e.yo);
      const filas = mesa.map((p, i) => ({ id: p.id, nombre: p.nombre, tipo: p.bot ? 'bot' : p.tipo, avatar: p.avatar, total: Math.max(0, Math.min(1000, Math.round(Number(pts[i]) || 0))), ultimo: 0 })).sort((a, b) => b.total - a.total);
      sala.finAciertos = yo >= 0 ? Math.max(0, Math.round(Number((d.aciertos || [])[yo]) || 0)) : 0; sala.finTotal = Math.max(0, Math.round(Number(d.total) || 0));
      pintarFinalSala(document.getElementById('p-body'), filas, null, String(d.titulo || '🏁 ¡Fin de la partida!').slice(0, 90));
    }
  };
  window.addEventListener('message', alMensaje);
  limpiezas.push(() => window.removeEventListener('message', alMensaje));
}
