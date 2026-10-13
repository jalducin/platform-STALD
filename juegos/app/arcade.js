// Juegos · Arcade (openspec: organizar-codigo).
// Dragon Run, Axo, Karts, Futbolito, Billar y Golf en iframe (jugarArcade, progreso en el servidor) y sus carreras en sala.
// No confundir con juegos/arcade.js (reglas sin DOM que también cargan los juegos del iframe).
// Script clásico (sin build ni módulos ES): juegos.html lo carga en orden y todos comparten el ámbito global
// (const/let/function de nivel superior). Ver docs/frontend-standards.md, «Estructura de juegos/app/».
// ---------- Arcade: Dragon Run (juego del profe en iframe del mismo origen; openspec: dragon-run, dragon-run-misiones) ----------
// Avance en el servidor de un juego embebido (Dragon Run y los de jugarArcade; organizar-codigo los unificó aquí):
// GET /juegos/progreso/<id> y PUT encadenado con la versión `v`; ante version_vieja reintenta una vez si ya se leyó el
// avance. La cola vive a nivel de página: al volver a jugar, la lectura espera al último guardado.
// sinAvance (Futbolito y Billar): no pide nada al servidor; la lectura responde un avance vacío.
const colasProgreso = {};
const AVANCE_VACIO = { ok: true, body: { v: 0, datos: null } };
function canalProgreso(id, aJuego, sinAvance) {
  let v = 0, cargado = false, pendiente = null;
  const cola = () => colasProgreso[id] || Promise.resolve();
  const lectura = cola().then(() => sinAvance ? AVANCE_VACIO : api('/juegos/progreso/' + id)).catch(() => ({ ok: false, status: 0, body: {} }));
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
// Envía un mensaje al iframe del juego (solo a este origen); si el iframe ya se cerró, no hace nada.
const mensajeA = frame => msg => { try { frame.contentWindow.postMessage(msg, location.origin); } catch (e) { /* iframe cerrado */ } };
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
  const aJuego = mensajeA(frame);
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
// futbol-en-linea: `param` extra para el juego (modo=clasif abre la Clasificatoria semanal de Fútbol Estelar).
const conParam = (id, param) => { const src = srcArcade(id); return param ? src + (src.includes('?') ? '&' : '?') + param : src; };
function jugarArcade(id, param) {
  const m = marco(id);
  document.getElementById('m-puntos').hidden = true;
  enCurso.foto = () => null; // el avance vive en el servidor: recargar no pide confirmación
  m.body.innerHTML = marcoArcade(conParam(id, param), juegoPorId(id).t); // futbol-en-linea: param
  const frame = document.getElementById('arcade-frame');
  if (matchMedia('(orientation: landscape) and (max-height: 520px)').matches) frame.parentElement.scrollIntoView({ block: 'start' });
  const estilo = musica.estilo;
  detenerMusica();
  const aJuego = mensajeA(frame);
  // Mismo canal que Dragon Run (otra pestaña que guardó antes: gana la acción más reciente, solo si se leyó el avance).
  const canal = canalProgreso(id, aJuego, SIN_AVANCE.has(id)); // futbolito-billar: sin avance
  const alMensaje = async ev => {
    const d = ev.data || {};
    if (ev.origin !== location.origin || ev.source !== frame.contentWindow || d.juego !== id) return;
    if (d.tipo === 'listo') {
      const r = await canal.lectura;
      aJuego({ tipo: 'inicio', modo: 'individual', progreso: r.ok ? r.body.datos : null, aviso: r.ok ? '' : '⚠️ No se pudo cargar tu avance: juega y se guardará cuando vuelva la conexión.' });
    } else if (d.tipo === 'guardar' && d.datos) canal.guardar(d.datos);
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
    const tiempoDe = f => { // quien sigue jugando, quien no terminó o su tiempo
      if (!f.envio) return '🏃 jugando…';
      return f.ms === null ? '—' : '⏱ ' + Arcade.formatoTiempo(f.ms);
    };
    body.innerHTML = '<div class="q-card"><div class="sub">' + escapeHtml(Arcade.nombreMapa(juego, mapa)) + '</div><div class="q">' + (mia.ms === null ? '⏰ No terminaste' : '🏁 Tu tiempo: ' + Arcade.formatoTiempo(mia.ms)) + '</div>' +
      '<div class="sub">Esperando a que terminen los demás (a más tardar en ' + Math.max(0, Math.ceil((Arcade.LIMITE_SALA[juego] + Arcade.GRACIA_SALA - t) / 1000)) + ' s)…</div></div>' +
      '<ol class="rank">' + humanos.map(f => '<li>' + avatarHtml(f.avatar, 28) + '<span class="n">' + escapeHtml(f.nombre) + '</span><span class="pts">' + tiempoDe(f) + '</span></li>').join('') + '</ol>';
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
const jugadasFisica = () => sala.estado.jugadores.flatMap(x => (x.jugadas || []).map(j => ({ jugador: x.id, ...j }))).sort((a, b) => a.n - b.n);
// futbolito-equipos: equipos de Futbolito 2v2 en la sala de espera (mismo reparto que el juego: Futbolito.repartir).
function equiposFutbolito(lista) {
  const e = sala.estado;
  if (e.sala.juego !== 'futbolito' || e.sala.opciones.formato !== '2v2' || !window.Futbolito || lista.length < 2) return '';
  const rep = Futbolito.repartir(lista.map(x => ({ id: x.id, bot: !!x.bot, ...(x.equipo === 0 || x.equipo === 1 ? { equipo: x.equipo } : {}) })));
  const ROL = { todas: 'las 4 barras', adelante: 'medios y delanteros', atras: 'portero y defensa' };
  const yo = lista.findIndex(x => x.id === e.yo);
  const fila = (x, i, eq) => '<div data-eq="' + eq + '" style="margin-top:4px">' + escapeHtml(x.nombre) + (x.bot ? ' 🤖' : '') + ' <small class="muted">· ' + ROL[rep[i].rol] + '</small></div>';
  const col = eq => '<div style="flex:1;min-width:140px"><b>' + (eq ? '🔵 Equipo azul' : '🔴 Equipo rojo') + '</b>' + lista.map((x, i) => rep[i].eq !== eq ? '' : fila(x, i, eq)).join('') + '</div>';
  return '<div class="card" id="p-equipos-fut" style="margin-bottom:10px"><div style="display:flex;gap:10px;flex-wrap:wrap">' + col(0) + col(1) + '</div>' +
    (yo >= 0 ? '<div class="row-btns" style="margin-top:8px"><button class="btn ghost sm" data-p="equipo" data-eq-a="' + (1 - rep[yo].eq) + '">🔁 Cambiar de equipo</button></div>' : '') + '</div>';
}
async function cambiarEquipoFutbolito(btn) { // futbolito-equipos
  btn.disabled = true;
  const r = await post('/juegos/sala/' + sala.codigo + '/unirse', { equipo: Number(btn.dataset.eqA) });
  if (!r.ok) alert(r.body.error === 'equipo_lleno' ? '👥 Ese equipo ya tiene 2 personas.' : 'No se pudo cambiar de equipo (' + (r.body.error || r.status) + ').');
  await traerSala(); sala.vista = null; pintarSala();
}
function pintarFisicaSala(body) {
  const e = sala.estado, s = e.sala, juego = s.juego;
  document.getElementById('m-bar').hidden = true;
  const cupo = juego === 'golf' ? 4 : 2;
  const mesa = juego === 'futbolito' ? participantes() : participantes().slice(0, cupo); // futbolito-equipos: hasta 4 según la mesa; golf: de 2 a 4
  if (mesa.length < 2) { if (sala.vista !== 'faltan') { body.innerHTML = '<div class="card muted" style="text-align:center">' + icoJuego(juego) + (juego === 'golf' ? ' Esperando a más personas: se juega de 2 a 4.' : ' Esperando a tu rival.') /* futbolito-equipos: sin «1 vs 1» (también hay 2 vs 2) */ + '</div>'; sala.vista = 'faltan'; } return; }
  const aFrame = msg => { const f = document.getElementById('arcade-frame'); try { f.contentWindow.postMessage(msg, location.origin); } catch (x) { /* iframe cerrado */ } };
  if (sala.vista === 'fisica') {
    const js = jugadasFisica(), firma = JSON.stringify(js);
    if (sala.fisicaListo && firma !== sala.fisicaFirma) { sala.fisicaFirma = firma; aFrame({ tipo: 'jugadas', jugadas: js, ahora: ahoraServidor() }); }
    return;
  }
  sala.vista = 'fisica'; sala.fisicaListo = false;
  body.innerHTML = marcoArcade(srcArcade(juego), juegoPorId(juego).t);
  const frame = document.getElementById('arcade-frame');
  if (matchMedia('(orientation: landscape) and (max-height: 520px)').matches) frame.parentElement.scrollIntoView({ block: 'start' }); // golf y futbolito-equipos: celular de lado, el marco completo a la vista
  const orden = mesa.map(p => ({ id: p.id, nombre: p.nombre, bot: !!p.bot, ...(p.equipo === 0 || p.equipo === 1 ? { equipo: p.equipo } : {}) })); // futbolito-equipos
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
      if (juego === 'golf' && d.tarjeta && Array.isArray(d.tarjeta.hoyos) && Array.isArray(d.tarjeta.golpes)) document.getElementById('p-body').insertAdjacentHTML('beforeend', tarjetaGolf(d.tarjeta, mesa)); // golf
    }
  };
  window.addEventListener('message', alMensaje);
  limpiezas.push(() => window.removeEventListener('message', alMensaje));
}

// golf: tarjeta de golpes de la sala debajo del podio (números del iframe, acotados; nombres escapados).
function tarjetaGolf(t, mesa) {
  const n = v => Math.max(0, Math.min(99, Math.round(Number(v) || 0))), hoyos = t.hoyos.slice(0, 9);
  return '<h2>⛳ Tarjeta</h2><div class="scroll-x"><table class="inv golf-tarjeta"><thead><tr><th>Jugador</th>' + hoyos.map(h => '<th>Hoyo ' + n(h && h.n) + '<br><small>par ' + n(h && h.par) + '</small></th>').join('') + '<th>Total</th></tr></thead><tbody>' +
    mesa.map((p, i) => { const gs = hoyos.map((_, k) => n(((t.golpes[i] || [])[k]))); return '<tr' + (p.id === sala.estado.yo ? ' class="yo"' : '') + '><td>' + escapeHtml(p.nombre) + '</td>' + gs.map(x => '<td class="num">' + x + '</td>').join('') + '<td class="num"><b>' + gs.reduce((a, b) => a + b, 0) + '</b></td></tr>'; }).join('') + '</tbody></table></div>';
}

// ---- Fútbol Estelar en línea 1 vs 1 (openspec: futbol-en-linea) ----
// Táctica en la sala de espera: formación y deslizadores del asiento propio (POST /unirse { tactica }). El partido se
// juega en el iframe por el canal en vivo (juegos/en-vivo.js): esta página le pasa rol, ids, semilla, canal y tácticas,
// manda al servidor el resultado que vio y pinta el podio con los puntos que devuelve el servidor.
const FUT_FORMACIONES = ['4-4-2', '4-3-3', '3-5-2', '5-3-2'];
const FUT_DESLIZADORES = [['linea', '🧱 Línea', 'Baja', 'Alta'], ['ancho', '↔️ Amplitud', 'Cerrada', 'Abierta'], ['mentalidad', '🧠 Mentalidad', 'Defensiva', 'Ofensiva'], ['presion', '🔥 Presión', 'Poca', 'Mucha']];
const tacticaDe = id => Object.assign({ formacion: '4-4-2', linea: 50, ancho: 50, mentalidad: 50, presion: 50 }, (sala.estado.jugadores.find(x => x.id === id) || {}).tactica || {});
function tacticaFutbol() { // futbol-en-linea: pizarra de la sala de espera
  const e = sala.estado;
  if (e.sala.juego !== 'futbol' || !e.jugadores.some(x => x.id === e.yo)) return '';
  const t = sala.futTactica || tacticaDe(e.yo);
  sala.futTactica = t;
  const boton = f => '<button class="btn ghost sm" data-p="fut-form" data-form="' + f + '" aria-pressed="' + (t.formacion === f) + '"' + (t.formacion === f ? ' style="outline:2px solid currentColor"' : '') + '>' + f + '</button>';
  const deslizador = ([k, n, a, b]) => '<label style="font-size:.85rem;font-weight:700">' + n + '<input type="range" min="0" max="100" step="5" data-futtac="' + k + '" value="' + t[k] + '" style="width:100%"><small class="muted" style="display:flex;justify-content:space-between"><i>' + a + '</i><i>' + b + '</i></small></label>';
  return '<div class="card" id="p-tactica-fut" style="margin-bottom:10px"><b>📋 Tu táctica para el partido en vivo</b>' +
    '<div class="row-btns" style="margin-top:6px;flex-wrap:wrap">' + FUT_FORMACIONES.map(boton).join('') + '</div>' +
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:4px 12px;margin-top:6px">' + FUT_DESLIZADORES.map(deslizador).join('') + '</div>' +
    '<div class="muted" id="p-tactica-msg" style="font-size:.8rem;min-height:1.1em"></div></div>';
}
let futTacticaT = null;
function cambiarTacticaFutbol(el) { // futbol-en-linea: botón de formación o deslizador
  const t = sala.futTactica || tacticaDe(sala.estado.yo);
  if (el.dataset.form) {
    t.formacion = el.dataset.form;
    document.querySelectorAll('[data-p="fut-form"]').forEach(b => { const on = b === el; b.setAttribute('aria-pressed', String(on)); b.style.outline = on ? '2px solid currentColor' : ''; });
  }
  if (el.dataset.futtac) t[el.dataset.futtac] = Math.max(0, Math.min(100, Math.round(Number(el.value) || 0)));
  sala.futTactica = t;
  const msg = document.getElementById('p-tactica-msg'); if (msg) msg.textContent = 'Guardando…';
  clearTimeout(futTacticaT);
  futTacticaT = setTimeout(async () => {
    const r = await post('/juegos/sala/' + sala.codigo + '/unirse', { tactica: t });
    const m = document.getElementById('p-tactica-msg'); if (m) m.textContent = r.ok ? '✔ Táctica guardada' : 'No se pudo guardar la táctica (' + (r.body.error || r.status) + ').';
  }, 350);
}
const NOTA_FUTBOL = { confirmado: '✔ Resultado confirmado por los dos aparatos.', disputa: '⚠️ Los aparatos no coincidieron: cuenta el marcador del anfitrión.', anfitrion: '⏳ Resultado del anfitrión (falta que el rival lo confirme).', invitado: '📡 El anfitrión perdió la conexión: cuenta el marcador que vio su rival.', pendiente: '⏳ Esperando el resultado.' };
// Podio con el resultado aceptado por el servidor (puntos topados; nombres escapados en pintarFinalSala).
function podioFutbol(res, mesa, host) {
  const e = sala.estado, g = res && res.goles ? res.goles : [0, 0], puntos = (res && res.puntos) || {};
  const filas = mesa.map(p => ({ id: p.id, nombre: p.nombre, tipo: p.tipo, avatar: p.avatar, total: Math.max(0, Math.min(1000, Math.round(Number(puntos[p.id]) || 0))), ultimo: 0 })).sort((a, b) => b.total - a.total);
  const rival = mesa.find(p => p.id !== host.id) || { nombre: '—' };
  sala.finAciertos = e.yo === host.id ? g[0] : g[1]; sala.finTotal = 0;
  pintarFinalSala(document.getElementById('p-body'), filas, null, '⚽ ' + host.nombre + ' ' + g[0] + ' – ' + g[1] + ' ' + rival.nombre);
  const card = document.querySelector('#p-body .result');
  if (card) card.insertAdjacentHTML('beforeend', '<div class="muted" id="p-futbol-nota" style="margin-top:6px">' + escapeHtml(NOTA_FUTBOL[(res && res.estado) || 'pendiente'] || '') + '</div>');
}
// En el podio: la nota se pone al día cuando el rival confirma (llega con el estado de la sala).
function notaFutbol() {
  const n = document.getElementById('p-futbol-nota'), res = sala.estado.futbol;
  if (n && res && NOTA_FUTBOL[res.estado] && !/No se pudo/.test(n.textContent)) n.textContent = NOTA_FUTBOL[res.estado];
}
// ¿El partido ya terminó para esta persona? (ya reportó, o su rival lo reportó hace rato).
function futbolTerminado(e) {
  const mio = (e.jugadores.find(x => x.id === e.yo) || {}).futbol;
  return !!mio || (!!e.futbol && e.futbol.estado !== 'pendiente' && ahoraServidor() - e.sala.inicio > 30000);
}
function pintarFutbolSala(body) { // futbol-en-linea
  const e = sala.estado, s = e.sala;
  document.getElementById('m-bar').hidden = true;
  if (sala.vista === 'futbol') return;
  const mesa = participantes().slice(0, 2);
  const host = mesa.find(p => p.id === s.host) || mesa[0];
  if (host && futbolTerminado(e)) return podioFutbol(e.futbol, mesa, host);
  if (mesa.length < 2) { if (sala.vista !== 'faltan') { body.innerHTML = '<div class="card muted" style="text-align:center">⚽ Esperando a tu rival.</div>'; sala.vista = 'faltan'; } return; }
  const rival = mesa.find(p => p.id !== host.id);
  sala.vista = 'futbol';
  body.innerHTML = marcoArcade(srcArcade('futbol'), juegoPorId('futbol').t);
  const frame = document.getElementById('arcade-frame');
  if (matchMedia('(orientation: landscape) and (max-height: 520px)').matches) frame.parentElement.scrollIntoView({ block: 'start' });
  const aJuego = mensajeA(frame), soyHost = e.yo === host.id;
  const finLinea = async d => {
    const goles = Array.isArray(d.goles) ? d.goles.slice(0, 2).map(x => Math.max(0, Math.round(Number(x) || 0))) : [0, 0];
    const r = await post('/juegos/sala/' + sala.codigo + '/respuesta', { futbol: { goles, ms: Math.max(0, Math.round(Number(d.ms) || 0)), ...(d.corte ? { corte: true } : {}) } });
    await traerSala();
    podioFutbol((r.ok && r.body.futbol) || sala.estado.futbol, mesa, host);
    if (!r.ok) { const n = document.getElementById('p-futbol-nota'); if (n) n.textContent = 'No se pudo registrar tu resultado (' + (r.body.error || r.status) + ').'; }
  };
  const alMensaje = ev => {
    const d = ev.data || {};
    if (ev.origin !== location.origin || ev.source !== frame.contentWindow || d.juego !== 'futbol') return;
    if (d.tipo === 'listo') {
      aJuego({ tipo: 'inicio', modo: 'linea', rol: soyHost ? 'anfitrion' : 'invitado', yo: { id: e.yo, nombre: (soyHost ? host : rival).nombre }, participantes: [host.id, rival.id], nombres: [host.nombre, rival.nombre],
        seed: s.seed, rt: e.rt || null, tacticas: [tacticaDe(host.id), tacticaDe(rival.id)] });
    } else if (d.tipo === 'fin-linea') { window.removeEventListener('message', alMensaje); finLinea(d); }
    else if (d.tipo === 'ir-clasif') { // respaldo: sin canal en vivo, a la Clasificatoria semanal
      window.removeEventListener('message', alMensaje);
      limpiar(); pantallaHub(); jugarArcade('futbol', 'modo=clasif');
    }
  };
  window.addEventListener('message', alMensaje);
  limpiezas.push(() => window.removeEventListener('message', alMensaje));
}
