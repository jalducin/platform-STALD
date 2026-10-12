// Juegos · arranque (openspec: organizar-codigo).
// 📖 Cómo se juega (AYUDA), eventos delegados de la página y la llamada final a iniciar(). Va al último.
// Script clásico (sin build ni módulos ES): juegos.html lo carga en orden y todos comparten el ámbito global
// (const/let/function de nivel superior). Ver docs/frontend-standards.md, «Estructura de juegos/app/».
// ---------- 📖 Cómo se juega (openspec: poker; Sprint 2 suma Brisca y Conquián) ----------
const AYUDA = {
  poker: '<h2>♠️ Póker Texas Hold\'em</h2><p><b>Objetivo:</b> quedarte con más fichas al final de las 10 manos. Cada quien empieza con 500 fichas. Gana cada mano quien tenga la mejor combinación de 5 cartas, o quien siga en pie cuando los demás se retiran.</p>' +
    '<h3>Cómo va una mano</h3><ol><li><b>Ciegas:</b> los dos jugadores después del botón (D) ponen la ciega chica y la grande. Empiezan en 5/10 y suben cada 4 manos (10/20 y luego 20/40).</li><li><b>Preflop:</b> recibes 2 cartas solo para ti y se apuesta.</li>' +
    '<li><b>Flop:</b> salen 3 cartas comunes a la mesa, y otra ronda de apuestas.</li><li><b>Turn</b> (4.ª carta) y <b>river</b> (5.ª carta), cada una con su ronda.</li><li><b>Muestra:</b> se muestran las cartas y gana la mejor mano usando 5 de tus 7 cartas (tus 2 + las 5 comunes).</li></ol>' +
    '<h3>Qué puedes hacer en tu turno</h3><table><tr><td>✋ Pasar</td><td>Si nadie ha apostado en esta ronda, sigues sin poner fichas.</td></tr><tr><td>🤝 Igualar</td><td>Pones lo mismo que la apuesta más alta.</td></tr>' +
    '<tr><td>⬆️ Subir</td><td>Apuestas más: toca fichas de 5, 10, 20, 50 y 100 para armar cuánto subes y luego ✅ Apostar (↺ Limpiar para empezar de nuevo). Las fichas que pasan de lo que tienes se apagan. Los demás tendrán que igualarte o retirarse.</td></tr><tr><td>🔥 Todo (all-in)</td><td>Apuestas todas tus fichas. Si tienes menos que otros, solo puedes ganar lo que igualaste (pozo principal).</td></tr><tr><td>🏳️ Retirarme</td><td>Dejas la mano y pierdes lo que ya apostaste.</td></tr></table>' +
    '<h3>Manos, de mayor a menor</h3><table>' + [['Escalera real', '10♠ J♠ Q♠ K♠ A♠'], ['Escalera de color', '5♥ 6♥ 7♥ 8♥ 9♥'], ['Póker', '4 cartas iguales: 9♠ 9♥ 9♦ 9♣'], ['Full', 'tercia + par: K K K 7 7'], ['Color', '5 del mismo palo'], ['Escalera', '5 seguidas: 4 5 6 7 8 (A-2-3-4-5 también)'], ['Tercia', '3 iguales: Q Q Q'], ['Doble par', 'J J 4 4'], ['Par', '2 iguales: 8 8'], ['Carta alta', 'si nadie tiene nada, gana la carta más alta']].map(x => '<tr><td><b>' + x[0] + '</b></td><td>' + x[1] + '</td></tr>').join('') + '</table>' +
    '<h3>En equipo</h3><p>En pareja o por equipos (A y B) se suman las fichas de cada equipo al final; el equipo con más fichas gana +150 puntos para cada integrante.</p>' +
    '<h3>Puntos</h3><p>Al final, tus puntos son tus fichas × 2 ÷ el número de jugadores (máximo 1,000).</p>' +
    '<div class="aviso">🪙 Las fichas son solo de juego: no se compran, no se cambian y no tienen valor real. Aquí se juega por diversión y por puntos del ranking.</div>',
  ajedrez: '<h2>♟️ Ajedrez</h2><p><b>Objetivo:</b> dar <b>jaque mate</b>: atacar al rey rival de forma que no pueda escapar. Juegan blancas y negras por turnos; empiezan las blancas.</p>' +
    '<h3>Cómo mueve cada pieza</h3><table>' + [['♚', 'Rey', '1 casilla en cualquier dirección. Nunca puede quedar en jaque.'], ['♛', 'Reina (dama)', 'Las casillas que quiera en línea recta o diagonal.'], ['♜', 'Torre', 'En línea recta (horizontal o vertical).'], ['♝', 'Alfil', 'En diagonal; siempre se queda en su color.'], ['♞', 'Caballo', 'En «L» (2 + 1). Es la única que salta piezas.'], ['♟', 'Peón', 'Avanza 1 (2 en su primer movimiento) y captura en diagonal.']].map(x => '<tr><td style="font-size:1.4rem">' + x[0] + '\uFE0E</td><td><b>' + x[1] + '</b></td><td>' + x[2] + '</td></tr>').join('') + '</table>' +
    '<h3>Jugadas especiales</h3><ul><li><b>Enroque (O-O / O-O-O):</b> el rey se mueve 2 casillas hacia una torre y la torre salta a su lado. Solo si ninguno se ha movido, no hay piezas en medio y el rey no está ni pasa por jaque. Toca al rey y luego su casilla destino.</li>' +
    '<li><b>Captura al paso:</b> si un peón rival avanza 2 y queda junto al tuyo, puedes capturarlo como si hubiera avanzado 1 (solo en la jugada siguiente).</li><li><b>Coronación:</b> el peón que llega al final se convierte en reina, torre, alfil o caballo (tú eliges).</li></ul>' +
    '<h3>Cómo termina</h3><ul><li><b>Jaque mate:</b> gana quien lo da.</li><li><b>Tablas (empate):</b> rey ahogado (no hay jugadas pero no está en jaque), triple repetición, 50 jugadas sin capturas ni peones, o material insuficiente (por ejemplo, rey contra rey).</li><li>En partida 1 vs 1 cada quien tiene <b>reloj</b>: si se te acaba el tiempo, pierdes. También puedes rendirte en tu turno.</li></ul>' +
    '<h3>Notación</h3><p>R rey · D reina (dama) · T torre · A alfil · C caballo; los peones no llevan letra. «x» es captura, «+» jaque y «#» mate. Ejemplo: <b>Cf3</b>, <b>exd5</b>, <b>Dh4#</b>.</p>' +
    '<h3>Niveles del bot (solo en individual)</h3><p>🐣 Básico se equivoca a propósito · 🦊 Intermedio piensa 2 jugadas · 🦉 Avanzado piensa 3 jugadas y revisa capturas.</p><p>En <b>partida</b> juegan solo 2 personas: quien crea la sala (blancas) y quien se une (negras).</p>',
  brisca: '<h2>🏆 Brisca</h2><p><b>Baraja española</b> de 40 cartas: oros 🪙, copas 🏆, espadas ⚔️ y bastos 🪵, del 1 al 7 más sota (10), caballo (11) y rey (12).</p>' +
    '<h3>Cómo se juega</h3><ol><li>Cada quien recibe 3 cartas. Se voltea una carta: su palo es el <b>triunfo</b> y queda bajo el mazo (se roba al final).</li>' +
    '<li>En tu turno tiras una carta. <b>No es obligatorio seguir el palo.</b></li><li>Gana la ronda quien tire el <b>triunfo más alto</b>. Si nadie tiró triunfo, gana la carta más alta <b>del mismo palo que la primera carta de la ronda</b>.</li>' +
    '<li>Quien gana la ronda se lleva las cartas, roba primero y abre la siguiente. Se juega hasta acabar todas las cartas.</li></ol>' +
    '<h3>Fuerza y puntos de las cartas</h3><table><tr><td><b>As</b></td><td>11 puntos</td></tr><tr><td><b>Tres</b></td><td>10 puntos</td></tr><tr><td><b>Rey (12)</b></td><td>4 puntos</td></tr><tr><td><b>Caballo (11)</b></td><td>3 puntos</td></tr><tr><td><b>Sota (10)</b></td><td>2 puntos</td></tr><tr><td>7, 6, 5, 4, 2</td><td>0 puntos (en ese orden de fuerza)</td></tr></table>' +
    '<p>En total hay <b>120 puntos</b>: gana quien (o la pareja que) junta <b>más de 60</b>. Con 60 y 60 es empate.</p>' +
    '<h3>Consejos</h3><ul><li>Guarda tus triunfos para ganar rondas con ases o treses.</li><li>Si tu pareja va ganando la ronda, ¡cárgale puntos!</li><li>En pareja, los compañeros se sientan alternados (A, B, A, B).</li></ul>',
  conquian: '<h2>🪙 Conquián</h2><p>El rummy mexicano para 2 jugadores, con baraja española de 40 cartas. <b>Gana quien baja 9 cartas</b> en juegos.</p>' +
    '<h3>Qué es un juego</h3><table><tr><td><b>Tercia o cuarteta</b></td><td>3 o 4 cartas del mismo número, de palos distintos: 5🪙 5🏆 5⚔️</td></tr><tr><td><b>Escalera</b></td><td>3 o más seguidas del mismo palo: 3⚔️ 4⚔️ 5⚔️. Ojo: <b>el 7 y la sota (10) van seguidas</b>: 6🏆 7🏆 10🏆</td></tr></table>' +
    '<h3>Tu turno</h3><ol><li>Se voltea una carta del mazo para ti. Si te sirve, <b>tómala</b>: debes bajarla en ese momento formando un juego con cartas de tu mano, o agregarla a uno de tus juegos.</li>' +
    '<li>Después de tomar, puedes bajar más juegos y al final <b>descartas</b> una carta: se la ofreces a tu rival.</li><li>Si no la quieres, di <b>«No la quiero»</b>: la carta volteada se le ofrece a tu rival; si nadie la toma, queda muerta y se voltea otra.</li></ol>' +
    '<h3>Cómo lo haces aquí</h3><ul><li>Toca cartas de tu mano para seleccionarlas (suben).</li><li>Toca uno de tus juegos bajados si quieres agregarle cartas (se marca como destino).</li><li>Usa ✅ Tomar y bajar, ⬇️ Bajar juego, 🗑️ Descartar (1 carta seleccionada) o 🙅 No la quiero.</li></ul>' +
    '<p>Empiezas con 8 cartas: para ganar necesitas bajar las 8 más la que tomes (9). Si se acaba el mazo, es empate.</p>',
};
Object.assign(AYUDA, ClasicosRapidosUI.AYUDA); // clasicos-rapidos
function ayuda(id) {
  const d = document.createElement('dialog'); d.className = 'ayuda'; d.setAttribute('aria-label', 'Cómo se juega');
  d.innerHTML = (AYUDA[id] || TableroUI.ayuda(id) || AYUDA_GRANDES[id] || '<p>Pronto.</p>') + '<div class="row-btns"><button class="btn" data-cerrar-ayuda autofocus>Entendido</button></div>'; // juegos-tablero y juegos-salas-grandes
  document.body.appendChild(d);
  d.addEventListener('close', () => d.remove());
  d.addEventListener('click', e => { if (e.target.closest('[data-cerrar-ayuda]') || e.target === d) d.close(); });
  d.showModal();
}
document.addEventListener('click', e => { const a = e.target.closest('[data-ayuda]'); if (a) ayuda(a.dataset.ayuda); });

// ---------- Eventos ----------
app.addEventListener('click', e => {
  const t = e.target.closest('[data-tab]'); if (t) { limpiar(); olvidarRevancha(); return pantallaHub(t.dataset.tab); }
  const pq = e.target.closest('[data-pq]'); if (pq) return responderSala(Number(pq.dataset.pq), Number(pq.dataset.po));
  if (SalasGrandes.clic(e)) return; // juegos-salas-grandes
  if (sala.estado && sala.estado.sala.juego === 'una' && document.getElementById('p-body') && clicUnaSala(e)) return;
  if (sala.estado && sala.estado.sala.juego === 'poker' && document.getElementById('p-body') && e.target.closest('[data-pk]')) { clicPokerSala(e); return; }
  if (sala.estado && ['brisca', 'conquian'].includes(sala.estado.sala.juego) && document.getElementById('p-body') && clicCartasSala(e)) return;
  if (sala.estado && sala.estado.sala.juego === 'ajedrez' && document.getElementById('p-body') && clicAjedrezSala(e)) return;
  if (sala.estado && TableroUI.esSala(sala.estado.sala.juego) && document.getElementById('p-body') && TableroUI.clicSala(e)) return; // juegos-tablero
  const lsc = e.target.closest('[data-lsc]'); if (lsc) return marcarLoteriaSala(Number(lsc.dataset.lsc), lsc);
  if (e.target.closest('[data-lsgrito]')) return gritarLoteriaSala();
  const lsv = e.target.closest('[data-lsvoz]'); if (lsv) { sala.lot.voz = lsv.dataset.lsvoz; document.querySelectorAll('[data-lsvoz]').forEach(x => x.setAttribute('aria-pressed', String(x === lsv))); return; }
  const pa = e.target.closest('[data-p]');
  if (pa && pa.dataset.p === 'compartir') return compartirSala(pa);
  if (pa && pa.dataset.p === 'revancha') return revanchaDesdePodio();
  if (pa && pa.dataset.p === 'equipo') return cambiarEquipoFutbolito(pa); // futbolito-equipos
  if (pa && pa.dataset.p === 'empezar') { pa.disabled = true; return post('/juegos/sala/' + sala.codigo + '/empezar', {}).then(r => { if (!r.ok && r.body.error === 'faltan_jugadores') { pa.disabled = false; alert('👥 Faltan jugadores. Espera a que se una tu rival.'); } return traerSala(); }).then(() => { sala.vista = null; pintarSala(); }); }
  if (pa && pa.dataset.p === 'empezar') { pa.disabled = true; return post('/juegos/sala/' + sala.codigo + '/empezar', {}).then(r => { if (!r.ok && r.body.error === 'faltan_jugadores') { pa.disabled = false; alert(TableroUI.faltan(sala.estado.sala.juego) || '👥 Faltan jugadores. Espera a que se una tu rival.'); /* juegos-tablero */ } return traerSala(); }).then(() => { sala.vista = null; pintarSala(); }); }
  const adm = e.target.closest('[data-adm]'); if (adm) return cambiarSubAdmin(adm.dataset.adm);
  const qf = e.target.closest('[data-quitar-foto]'); if (qf) return quitarFoto(qf);
  const rt = e.target.closest('[data-rtipo]'); if (rt) { state.rtipo = rt.dataset.rtipo; return pintarRanking(); }
  const rjt = e.target.closest('#rj-todos'); // top 10 ↔ todos (openspec: ranking-juegos-top10)
  if (rjt) { const ol = document.getElementById('rank-juegos'), abre = !ol.classList.contains('todos'); ol.classList.toggle('todos', abre); rjt.setAttribute('aria-expanded', String(abre)); rjt.textContent = abre ? 'Ver solo el top 10 ▴' : 'Ver los ' + rjt.dataset.total + ' juegos ▾'; return; }
  const cc = e.target.closest('[data-categoria]'); if (cc) return abrirCategoria(cc.dataset.categoria); // juegos-categorias
  const g = e.target.closest('[data-juego]');
  if (g) { limpiar(); const j = juegoPorId(g.dataset.juego); app.innerHTML = '<div class="loading">Preparando…</div>'; return Promise.resolve(j.jugar()).catch(err => { app.innerHTML = '<div class="alert">No se pudo cargar el juego (' + escapeHtml(err.message) + ').</div>'; }); }
  const a = e.target.closest('[data-a]'); if (!a) return;
  if (a.dataset.a === 'categorias') return verCategorias(); // juegos-categorias: «← Categorías»
  if (a.dataset.a === 'reanudar') return reanudarPartida();
  if (a.dataset.a === 'revancha-no') { olvidarRevancha(); const c = document.getElementById('revancha-inicio'); if (c) c.remove(); return; }
  if (a.dataset.a === 'revancha-inicio') {
    a.disabled = true;
    return pedirRevancha(a.dataset.codigo).then(msg => { if (msg === null) return; a.disabled = false; const m = document.getElementById('revancha-msg'); if (m) m.innerHTML = '<div class="alert">' + escapeHtml(msg) + '</div>'; });
  }
  if (a.dataset.a === 'adm-actualizar') return cargarAdmin(ADM_FUENTES);
  if (a.dataset.a === 'adm-reintentar') return cargarAdmin([a.dataset.fuente]);
  if (a.dataset.a === 'adm-limpiar') { const q = document.getElementById('adm-buscar'); q.value = ''; aplicarBusqueda(); return q.focus(); }
  if (a.dataset.a === 'salir' || a.dataset.a === 'hub') { limpiar(); olvidarRevancha(); pantallaHub(); }
  if (a.dataset.a === 'reintentar') iniciar();
  if (a.dataset.a === 'csv') descargarCsv([['correo', 'apodo', 'registrado', 'ultima_visita', 'visitas', 'puntos_semana']].concat((state.invitadosLista || []).map(x => [x.email, x.nombre, x.registradoEn, x.ultimaVisita, x.visitas, x.puntosSemana])), 'invitados-juegos.csv');
  if (a.dataset.a === 'csv-jugadores') { const l = state.jugadoresLista || { jugadores: [], pendientes: [] }; descargarCsv([['estado', 'nombre', 'nick', 'correo', 'tipo', 'puntos_semana', 'partidas_semana', 'ultima_visita_o_registro']].concat(l.jugadores.map(j => ['registrado', j.nombre, j.nick || '', j.email, j.espacio, j.puntosSemana, j.partidasSemana, j.ultimaVisita]), l.pendientes.map(p => [p.estado, '', '', p.email, '', '', '', p.creada])), 'jugadores-juegos.csv'); }
  if (a.dataset.a === 'registro') return pantallaRegistro();
  // «🆕 Registrar» (openspec: registro-juegos-hub): cierra la sesión en este aparato y abre el registro para otra persona.
  if (a.dataset.a === 'registrar') {
    if (!confirm('¿Cerrar tu sesión en este aparato para que otra persona cree su cuenta de Juegos?')) return;
    StaldAuth.salir().then(() => { state.email = null; borrarRegistro(); pantallaRegistro(); });
    return;
  }
  if (a.dataset.a === 'otro-correo') { StaldAuth.salir().then(() => { state.email = null; pantallaLogin(); }); }
});
app.addEventListener('change', e => { if (e.target.id === 'p-juego') { document.getElementById('p-cat-wrap').hidden = e.target.value !== 'cultura'; document.getElementById('p-modo-wrap').hidden = e.target.value !== 'loteria'; document.getElementById('p-rondas-wrap').hidden = !e.target.value.startsWith('basta'); document.getElementById('p-equipos-wrap').hidden = e.target.value !== 'poker'; document.getElementById('p-reloj-wrap').hidden = e.target.value !== 'ajedrez'; opcionesMapaArcade(e.target.value); document.getElementById('p-tema-wrap').hidden = e.target.value !== 'en-frases';
  const nota = { ajedrez: '♟️ Partida 1 vs 1 solo entre dos personas: quien crea y quien se une. Sin bots.', brisca: '🏆 Se juega entre 4 en parejas: si faltan personas, se completa con bots. Máximo 4.', golf: '⛳ De 2 a 4 personas por turnos, sin bots: cada quien tira su pelota en 3 hoyos.' /* golf */ }[e.target.value];
  document.getElementById('p-bots-wrap').hidden = !!nota; const n = document.getElementById('p-bots-nota'); n.hidden = !nota; n.textContent = nota || '';
  TableroUI.alCambiarJuego(e.target.value); } }); // juegos-tablero
app.addEventListener('change', e => { if (e.target.id === 'p-juego') SalasGrandes.formulario(e.target.value); }); // juegos-salas-grandes
app.addEventListener('change', e => { if (e.target.id === 'p-juego') document.getElementById('p-formato-wrap').hidden = e.target.value !== 'futbolito'; }); // futbolito-equipos
// cultura-conocimiento: el tema de la Línea del tiempo solo se ve al elegirla.
app.addEventListener('change', e => { if (e.target.id === 'p-juego') document.getElementById('p-ltema-wrap').hidden = e.target.value !== 'cultura-linea'; });
app.addEventListener('change', e => { if (e.target.dataset && e.target.dataset.pextra) limitarExtras(e.target, 'pextra', 'p-extra-aviso'); }); // basta-divertida-una-robo
app.addEventListener('input', e => {
  if (e.target.dataset && e.target.dataset.pbcat) { const f = document.getElementById('pb-form'); const lleno = [...f.querySelectorAll('input')].every(i => i.value.trim()); document.getElementById('pb-basta').disabled = !lleno; }
});
app.addEventListener('submit', async e => {
  if (e.target.id === 'f-crear') { e.preventDefault(); return crearPartida(); }
  if (e.target.id === 'f-unirse') { e.preventDefault(); return unirsePartida(); }
  if (e.target.id === 'pb-form') {
    e.preventDefault();
    const palabras = palabrasForm();
    document.getElementById('pb-basta').disabled = true;
    return post('/juegos/sala/' + sala.codigo + '/respuesta', { ronda: sala.rondaActual, palabras, basta: true }).then(() => traerSala());
  }
  if (e.target.id === 'f-entrada') {
    e.preventDefault();
    const correo = document.getElementById('ent-correo').value.trim().toLowerCase();
    const apodo = document.getElementById('ent-nick').value.trim().replace(/\s+/g, ' ');
    entradaPrevia = { correo, nick: apodo };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) return pantallaLogin('Escribe un correo válido, por ejemplo tucorreo@gmail.com.');
    if (!/^[\p{L}\p{N} ]{2,20}$/u.test(apodo)) return pantallaLogin('Tu nick debe tener de 2 a 20 letras o números.');
    if (!document.getElementById('ent-acepto').checked) return pantallaLogin('Para entrar a Juegos necesitas aceptar el aviso.');
    try { localStorage.setItem(ACEPTO_KEY, '1'); } catch (err) { /* sin almacenamiento */ }
    return registrarDirecto(apodo, correo);
  }
  if (e.target.id === 'f-invitado') {
    e.preventDefault();
    const nombre = document.getElementById('apodo').value.trim();
    if (!document.getElementById('acepto').checked) return pantallaInvitado('Para crear tu cuenta de Juegos necesitas aceptar el aviso.');
    if (!/^[\p{L}\p{N} ]{2,20}$/u.test(nombre)) return pantallaInvitado('Tu apodo debe tener de 2 a 20 letras o números.');
    const r = await post('/juegos/invitado', { nombre, acepto: true });
    if (!r.ok) return pantallaInvitado('No se pudo registrar (' + (r.body.error || r.status) + ').');
    localStorage.setItem('stald_email', state.email);
    iniciar();
  }
});

iniciar();
