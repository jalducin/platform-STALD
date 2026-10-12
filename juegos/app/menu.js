// Juegos · menú (openspec: organizar-codigo).
// Catálogo (CATEGORIAS, JUEGOS), avatar, sesión y registro (iniciar, pantallaLogin) y el hub con sus pestañas.
// Script clásico (sin build ni módulos ES): juegos.html lo carga en orden y todos comparten el ámbito global
// (const/let/function de nivel superior). Ver docs/frontend-standards.md, «Estructura de juegos/app/».
// ---------- Catálogo ----------
const CATEGORIAS = [
  { id: 'ingles', titulo: '📘 Inglés', clase: 'cat-ingles' },
  { id: 'cultura', titulo: '🧠 Cultura y Conocimiento', clase: 'cat-cultura' }, // cultura-conocimiento: junta Español y Maratón
  { id: 'mente', titulo: '⚡ Mente ágil', clase: 'cat-mente' },
  { id: 'clasicos', titulo: '🎲 Clásicos', clase: 'cat-clasicos' },
  { id: 'arcade', titulo: '🕹️ Arcade', clase: 'cat-arcade' },
];
const JUEGOS = [
  { id: 'en-vocab', cat: 'ingles', emoji: '⏱️', t: 'Vocabulario contra reloj', d: '60 segundos: elige la palabra en inglés.', jugar: () => jugarVocab() },
  { id: 'en-spelling', cat: 'ingles', emoji: '🐝', t: 'Spelling bee', d: 'Escucha y escribe la palabra.', jugar: () => jugarSpelling() },
  { id: 'en-frases', cat: 'ingles', emoji: '🧩', t: 'Completa y responde', d: 'Completa frases y responde preguntas en inglés. Elige el tema.', jugar: () => elegirTemaIngles('en-frases') },
  { id: 'en-memorama', cat: 'ingles', emoji: '🃏', t: 'Memorama', d: 'Une cada palabra con su significado.', jugar: () => jugarMemorama() },
  { id: 'en-ordena', cat: 'ingles', emoji: '🔀', t: 'Ordena la oración', d: 'Arma la oración en inglés. Elige el tema.', jugar: () => elegirTemaIngles('en-ordena') },
  { id: 'en-tiempos', cat: 'ingles', emoji: '⏳', t: 'Máquina del tiempo', d: '¿Pasado, presente o futuro? Cambia el verbo contra reloj.', jugar: () => jugarTiempos() }, // openspec: juegos-ingles-gramatica
  // cultura-conocimiento: sección «🧠 Cultura y Conocimiento» (ids sin cambio: los puntos anteriores siguen contando).
  { id: 'cultura', cat: 'cultura', emoji: '🏃', t: 'Maratón de cultura', d: 'Historia, ciencias, deportes, México… 3 vidas.', jugar: () => elegirCultura() },
  { id: 'cultura-linea', cat: 'cultura', emoji: '📜', t: 'Línea del tiempo', d: 'Ordena sucesos e inventos del más antiguo al más reciente.', jugar: () => elegirLineaTiempo() },
  { id: 'es-ortografia', cat: 'cultura', emoji: '✍️', t: 'Ortografía', d: 'Letras, acentos, sinónimos y antónimos.', jugar: () => jugarOrtografia() },
  { id: 'es-ordena', cat: 'cultura', emoji: '🔀', t: 'Ordena la oración', d: 'Pon las palabras en orden.', jugar: () => jugarOrdena('es') },
  { id: 'mente-calculo', cat: 'mente', emoji: '🧮', t: 'Cálculo y secuencias', d: '75 segundos: operaciones y ¿qué número sigue?', jugar: () => jugarCalculo() },
  { id: 'mente-simon', cat: 'mente', emoji: '🟢', t: 'Simón dice', d: 'Repite la secuencia de colores.', jugar: () => jugarSimon() },
  { id: 'mente-sopa', cat: 'mente', emoji: '🔎', t: 'Sopa de letras', d: 'Encuentra las palabras en inglés.', jugar: () => jugarSopa() },
  { id: 'mente-sudoku', cat: 'mente', emoji: '🔢', t: 'Sudoku', d: 'Por niveles: fácil, medio, difícil y experto.', jugar: () => elegirSudoku() },
  { id: 'ajedrez', cat: 'mente', emoji: '♟️', t: 'Ajedrez', d: 'Contra el bot (3 niveles) o 1 vs 1 en partida.', jugar: () => elegirAjedrez() },
  { id: 'basta-es', cat: 'clasicos', emoji: '✋', t: 'Basta', d: 'Nombre, animal, fruta, país… ¡con la letra que salga!', jugar: () => jugarBasta('es') },
  { id: 'basta-en', cat: 'clasicos', emoji: '🗽', t: 'Basta en inglés', d: 'Name, animal, food… in English!', jugar: () => jugarBasta('en') },
  { id: 'una', cat: 'clasicos', emoji: '🃏', t: '¡Una!', d: 'Cartas de colores. Con una carta, ¡presiona el botón UNA!', jugar: () => elegirUna() },
  { id: 'loteria', cat: 'clasicos', emoji: '🎴', t: 'Lotería', d: 'Lotería mexicana bilingüe con gritón.', jugar: () => elegirLoteria() },
  { id: 'poker', cat: 'clasicos', emoji: '♠️', t: 'Póker', d: "Texas Hold'em estilo Casino Royale, con fichas de juego.", jugar: () => elegirPoker() },
  { id: 'brisca', cat: 'clasicos', emoji: '🏆', t: 'Brisca', d: 'Baraja española: gana rondas con el triunfo. Solo, contra 2 o en pareja.', jugar: () => elegirBrisca() },
  { id: 'conquian', cat: 'clasicos', emoji: '🪙', t: 'Conquián', d: 'Baraja española: baja tercias y escaleras hasta juntar 9 cartas.', jugar: () => elegirConquian() },
  { id: 'plataformas', cat: 'arcade', emoji: '🦎', t: 'Axo y los 12 mundos', d: 'Plataformas: salta, junta monedas y vence al jefe de cada mundo.', jugar: () => jugarArcade('plataformas') },
  { id: 'karts', cat: 'arcade', emoji: '🏎️', t: 'Karts Turbo', d: 'Carreras: derrapa, usa ítems y gana la copa contra 7 rivales.', jugar: () => jugarArcade('karts') },
  { id: 'dragon-run', cat: 'arcade', emoji: '🐉', t: 'Dragon Run', d: 'Corre, salta (¡doble salto!), cumple misiones y llega al castillo.', jugar: () => jugarDragonRun() }, // openspec: dragon-run-misiones
  // juegos-salas-grandes
  { id: 'dibuja', cat: 'ingles', emoji: '🎨', t: 'Dibuja y adivina', d: 'Por turnos: dibuja una palabra en inglés y adivina la de los demás (3 a 12).', jugar: () => elegirDibuja() },
  { id: 'bingo', cat: 'clasicos', emoji: '🎱', t: 'Bingo', d: '75 números y tu cartón: línea, esquinas o lleno. ¡Para salas de hasta 30!', jugar: () => elegirBingo() },
  { id: 'blackjack', cat: 'clasicos', emoji: '🂡', t: 'Blackjack (21)', d: 'Acércate a 21 sin pasarte y gánale a la banca, con fichas de juego.', jugar: () => elegirBlackjack() },
  { id: 'futbolito', cat: 'arcade', emoji: '⚽', t: 'Futbolito', d: 'Futbolito de mesa: desliza tu barra y patea. Contra el bot o 1 vs 1.', jugar: () => jugarArcade('futbolito') }, // futbolito-billar
  { id: 'billar', cat: 'arcade', emoji: '🎱', t: 'Billar', d: 'Bola 8 con línea guía: mete tus bolas y al final la 8. Contra el bot o 1 vs 1.', jugar: () => jugarArcade('billar') }, // futbolito-billar
  { id: 'golf', cat: 'arcade', emoji: '⛳', t: 'Golf', d: 'Minigolf de 9 hoyos: jala como resortera y métela en pocos golpes. Solo o de 2 a 4.', jugar: () => jugarArcade('golf') }, // golf
];
JUEGOS.push(...ClasicosRapidosUI.TARJETAS); // clasicos-rapidos: Gato, Conecta 4, Piedra-papel-tijera, Ahorcado y Serpientes
JUEGOS.push(...TableroUI.TARJETAS); // juegos-tablero: Damas y Batalla naval (Mente ágil), Dominó y Parchís (Clásicos)
const juegoPorId = id => JUEGOS.find(j => j.id === id);

// ---------- Sesión ----------
// Foto del avatar (openspec: avatar-foto): si ya no existe, queda el personaje.
const fotoSrc = av => av.fotoUrl || (API_BASE + '/juegos/foto/' + encodeURIComponent(av.foto));
const avatarHtml = (av, px = 26) => av ? '<span class="av" style="--avc:' + escapeHtml(av.color) + ';width:' + px + 'px;height:' + px + 'px;font-size:' + Math.round(px * 0.58) + 'px" aria-hidden="true">' +
  (av.foto || av.fotoUrl ? '<img src="' + escapeHtml(fotoSrc(av)) + '" alt="" data-e="' + escapeHtml(av.emoji) + '" onerror="this.replaceWith(document.createTextNode(this.dataset.e))">' : escapeHtml(av.emoji)) + '</span>' : '';

// Recorta al centro y reduce a 128×128 JPEG (≤ 40 KB); el canvas descarta los metadatos.
async function fotoAvatar(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((ok, mal) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => mal(new Error('formato')); i.src = url; });
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d'), lado = Math.min(img.naturalWidth, img.naturalHeight);
    g.fillStyle = '#fff'; g.fillRect(0, 0, 128, 128);
    g.drawImage(img, (img.naturalWidth - lado) / 2, (img.naturalHeight - lado) / 2, lado, lado, 0, 0, 128, 128);
    for (const q of [0.82, 0.6, 0.4]) { const d = c.toDataURL('image/jpeg', q); if (d.length <= 40000) return d; }
    throw new Error('grande');
  } finally { URL.revokeObjectURL(url); }
}

function pantallaAvatar() {
  limpiar(); olvidarSala();
  const listas = state.avatares || { emojis: [], colores: [] };
  let sel = Object.assign({}, state.jugador.avatar || { emoji: listas.emojis[0], color: listas.colores[0] });
  let fotoNueva = null, permiso = false; // modo foto: sel.foto (actual) o fotoNueva (data URL)
  // Nick (openspec: nick-jugadores): se conserva lo escrito aunque la pantalla se vuelva a dibujar.
  const nombreReal = state.jugador.nombreReal || state.jugador.nombre;
  let nickVal = state.jugador.nombreReal ? state.jugador.nombre : '';
  const pintar = () => {
    const vista = fotoNueva ? Object.assign({}, sel, { fotoUrl: fotoNueva }) : sel;
    app.innerHTML = '<div class="card"><h1>🎨 Tu avatar</h1><p class="lead">Elige un personaje y un color, o sube una foto. Así te verán en el ranking y en las partidas.</p>' +
      '<div style="display:flex;justify-content:center;margin:6px 0 14px" id="av-vista">' + avatarHtml(vista, 96) + '</div>' +
      '<label for="av-nick">✏️ Tu nick <small class="muted">(así te ven en el ranking y las partidas; vacío = tu nombre)</small></label>' +
      '<div class="row-btns" style="margin-top:4px"><input id="av-nick" maxlength="20" autocomplete="nickname" value="' + escapeHtml(nickVal) + '" placeholder="' + escapeHtml(nombreReal) + '" style="flex:1;min-width:0">' +
      '<button class="btn ghost" type="button" data-nick-guardar>Guardar nick</button></div><div id="nick-msg"></div>' +
      '<label>Personaje</label><div class="av-grid">' + listas.emojis.map(e => '<button type="button" data-av-emoji="' + escapeHtml(e) + '" aria-pressed="' + (e === sel.emoji) + '">' + escapeHtml(e) + '</button>').join('') + '</div>' +
      '<label>Color</label><div class="col-grid">' + listas.colores.map(c => '<button type="button" data-av-color="' + escapeHtml(c) + '" aria-pressed="' + (c === sel.color) + '" style="background:' + escapeHtml(c) + '" aria-label="Color ' + escapeHtml(c) + '"></button>').join('') + '</div>' +
      '<label>📷 O sube una foto de tu galería</label><input type="file" id="av-file" accept="image/*">' +
      '<label class="check"><input id="av-permiso" type="checkbox"' + (permiso ? ' checked' : '') + '><span>Tengo permiso de mi mamá, papá o tutor para usar esta imagen.</span></label>' +
      '<p class="muted" style="margin:4px 0 0">Se ve pequeña en el ranking y las partidas. Elegir un personaje o color quita la foto.</p>' +
      '<div class="row-btns"><button class="btn ghost" data-a="hub">Cancelar</button><button class="btn" data-av-guardar>Guardar</button></div><div id="av-msg"></div></div>';
  };
  pintar();
  const avMsg = t => { document.getElementById('av-msg').innerHTML = '<div class="alert">' + escapeHtml(t) + '</div>'; };
  app.onchange = async e => {
    if (e.target.id === 'av-permiso') permiso = e.target.checked;
    if (e.target.id === 'av-file' && e.target.files[0]) {
      try { fotoNueva = await fotoAvatar(e.target.files[0]); pintar(); }
      catch (err) { avMsg(err.message === 'grande' ? 'La imagen es demasiado pesada. Prueba con otra.' : 'No se pudo leer esa imagen. Prueba con una foto JPG o PNG.'); }
    }
  };
  app.oninput = e => { if (e.target.id === 'av-nick') nickVal = e.target.value; };
  app.onclick = async e => {
    const ng = e.target.closest('[data-nick-guardar]');
    if (ng) {
      const nick = nickVal.trim().replace(/\s+/g, ' ');
      const msg = document.getElementById('nick-msg');
      if (nick && !/^[\p{L}\p{N} ]{2,20}$/u.test(nick)) { msg.innerHTML = '<div class="alert">Tu nick debe tener de 2 a 20 letras o números.</div>'; return; }
      ng.disabled = true;
      const r = await post('/juegos/nick', { nick });
      ng.disabled = false;
      if (!r.ok) { msg.innerHTML = '<div class="alert">No se pudo guardar (' + escapeHtml(r.body.error || r.status) + ').</div>'; return; }
      state.jugador.nombre = r.body.jugador.nombre;
      if (r.body.jugador.nombreReal) state.jugador.nombreReal = r.body.jugador.nombreReal; else delete state.jugador.nombreReal;
      nickVal = nick; pintarChip();
      msg.innerHTML = '<p class="muted" style="margin:4px 0 0">✔ ' + escapeHtml(nick ? 'Ahora te ven como «' + nick + '».' : 'Listo: te ven con tu nombre.') + '</p>';
      return;
    }
    const em = e.target.closest('[data-av-emoji]'), co = e.target.closest('[data-av-color]'), gu = e.target.closest('[data-av-guardar]');
    if (em) { sel.emoji = em.dataset.avEmoji; delete sel.foto; fotoNueva = null; pintar(); }
    if (co) { sel.color = co.dataset.avColor; delete sel.foto; fotoNueva = null; pintar(); }
    if (gu) {
      if (fotoNueva && !permiso) { avMsg('Marca la casilla de permiso para usar tu foto.'); return; }
      gu.disabled = true;
      const r = fotoNueva ? await post('/juegos/foto', { imagen: fotoNueva, acepto: true })
        : sel.foto ? { ok: true, body: { avatar: state.jugador.avatar } } // sin cambios: conserva su foto
        : await post('/juegos/avatar', { emoji: sel.emoji, color: sel.color });
      if (!r.ok) { document.getElementById('av-msg').innerHTML = '<div class="alert">No se pudo guardar (' + escapeHtml(r.body.error || r.status) + ').</div>'; gu.disabled = false; return; }
      state.jugador.avatar = r.body.avatar; pintarChip(); app.onclick = null; app.onchange = null; app.oninput = null; pantallaHub();
    }
    if (e.target.closest('[data-a="hub"]')) { app.onclick = null; app.onchange = null; app.oninput = null; }
  };
}

function pintarChip() {
  if (!state.jugador) { chip.hidden = true; return; }
  chip.hidden = false;
  chip.innerHTML = avatarHtml(state.jugador.avatar, 22) + ' ' + escapeHtml(state.jugador.nombre) + (state.jugador.tipo === 'invitado' ? ' <span class="inv">INVITADO</span>' : '') +
    ' · ⭐ ' + fmt(state.totalIndividual) + ' · 👥 ' + fmt(state.totalPartidas) + (state.pos ? ' · #' + state.pos : '');
}

async function cargarYo() {
  const r = await api('/juegos/yo');
  if (r.ok) {
    Object.assign(state, { jugador: r.body.jugador, totalIndividual: r.body.totalIndividual || 0, totalPartidas: r.body.totalPartidas || 0, pos: r.body.pos, posPartidas: r.body.posPartidas, mejores: r.body.mejores, semana: r.body.semana, avatares: r.body.avatares });
    pintarChip();
  }
  return r;
}

async function iniciar() {
  app.innerHTML = '<div class="loading">Cargando juegos…</div>';
  await StaldAuth.iniciar(API_BASE);
  state.pidiendoSesion = false;
  state.email = StaldAuth.email() || StaldAuth.correoViejo();
  if (!state.email) { if (abrirRegistro) { abrirRegistro = false; return pantallaRegistro(); } return pantallaLogin(); }
  try {
    const r = await cargarYo();
    if (state.pidiendoSesion) return; // 401: ya se muestra la pantalla de entrada
    if (r.status === 403 && r.body.error === 'no_registrado') {
      const reg = registroPendiente();
      if (!reg) return pantallaInvitado();
      // Correo confirmado: se crea la cuenta con el apodo que eligió antes.
      const alta = await post('/juegos/invitado', { nombre: reg.apodo, acepto: true });
      borrarRegistro();
      if (!alta.ok) return pantallaInvitado('No se pudo crear tu cuenta (' + (alta.body.error || alta.status) + '). Intenta de nuevo.');
      return iniciar();
    }
    if (!r.ok) throw new Error(r.body.error || ('HTTP ' + r.status));
    borrarRegistro(); // ya tenía cuenta (alumno, alumna o invitado): no hay nada que registrar
    if (salaPendiente) { const c = salaPendiente; salaPendiente = null; return unirseCodigo(c); }
    if (abrirAvatar) { abrirAvatar = false; return pantallaAvatar(); }
    // Recarga (openspec: juegos-recarga): primero la sala guardada; luego, el juego individual a medias.
    const enSala = salaGuardada(); if (enSala) return volverASala(enSala.codigo);
    const revancha = revanchaGuardada(); if (revancha) return ofrecerRevancha(revancha.codigo);
    const previa = partidaGuardada(); if (previa) return pantallaReanudar(previa);
    pantallaHub();
  } catch (e) {
    const txt = e.message === 'mucho_trafico' ? '⏳ Hay mucha actividad en este momento. Intenta de nuevo en unos minutos.' : '⚠️ No pude conectarme (' + escapeHtml(e.message) + ').';
    app.innerHTML = '<div class="card"><div class="alert">' + txt + '</div><div class="row-btns"><button class="btn" data-a="reintentar">Reintentar</button></div></div>';
  }
}

// Entrada y registro en una sola pantalla (openspec: acceso-con-contrasena): correo y nick, sin enlaces ni
// contraseña. Si el correo es de las clases, se pide su contraseña (esas cuentas ven calificaciones).
const ACEPTO_KEY = 'juegos_acepto';
const aceptoGuardado = () => { try { return localStorage.getItem(ACEPTO_KEY) === '1'; } catch (e) { return false; } };
let entradaPrevia = { correo: '', nick: '' };
function pantallaLogin(msg) {
  limpiar(); chip.hidden = true;
  const correo = entradaPrevia.correo || (state.email || '');
  app.innerHTML = '<div class="card"><h1>🎮 Juegos</h1><p class="lead">' + (salaPendiente ? '🎉 Te invitaron a la partida <b>' + escapeHtml(salaPendiente) + '</b>. Escribe tu correo y tu nick para unirte.' : 'Aprende jugando. Escribe tu correo y tu nick: si es tu primera vez, así creas tu cuenta; si ya tienes, entras.') + '</p>' +
    '<form id="f-entrada" novalidate><label for="ent-correo">Tu correo</label><input id="ent-correo" type="email" inputmode="email" autocomplete="email" autocapitalize="none" placeholder="tucorreo@gmail.com" value="' + escapeHtml(correo) + '">' +
    '<label for="ent-nick">Tu nick</label><input id="ent-nick" type="text" maxlength="20" placeholder="Ej. Leo" autocomplete="nickname" value="' + escapeHtml(entradaPrevia.nick) + '">' +
    '<label class="check"><input id="ent-acepto" type="checkbox"' + (aceptoGuardado() ? ' checked' : '') + '><span>Acepto que se guarde mi correo y mis puntos para registrar mi avance y mejorar la plataforma.</span></label>' +
    '<div class="row-btns"><button class="btn" type="submit" id="reg-entrar">🎮 Entrar a jugar</button></div></form>' +
    '<p class="muted" style="margin-top:10px;font-size:.86rem">¿Eres alumno o alumna? Escribe el correo de tus clases y te pediremos tu contraseña.</p>' +
    (msg ? '<div class="alert">' + escapeHtml(msg) + '</div>' : '') + '</div>';
  const i = document.getElementById(correo ? 'ent-nick' : 'ent-correo'); if (i) i.focus();
}
const pantallaRegistro = pantallaLogin; // ?registro=1 y «🆕 Registrar» abren la misma pantalla

// Registro o regreso directo: el servidor crea o actualiza la cuenta y da una llave de sesión de un solo uso.
async function registrarDirecto(apodo, correo) {
  entradaPrevia = { correo, nick: apodo };
  const b = document.getElementById('reg-entrar'); if (b) { b.disabled = true; b.textContent = 'Entrando…'; }
  let r;
  try {
    const res = await fetch(API_BASE + '/juegos/registro', { method: 'POST', headers: { 'content-type': 'text/plain;charset=UTF-8' }, body: JSON.stringify({ email: correo, nombre: apodo, acepto: true }) });
    r = { ok: res.ok, status: res.status, body: await res.json().catch(() => ({})) };
  } catch (e) { return pantallaLogin('⚠️ No pude conectarme. Revisa tu internet e intenta de nuevo.'); }
  if (r.status === 409 && r.body.error === 'correo_de_clase') {
    borrarRegistro(); limpiar(); chip.hidden = true;
    return StaldAuth.pintarEntrada(app, { titulo: '📘 Ese correo es de las clases', texto: 'Para cuidar tus calificaciones, entra con tu contraseña de las clases. Si es tu primera vez, usa la que te dio tu profe.', correo, alEntrar: () => iniciar() });
  }
  if (!r.ok) {
    const txt = { correo_invalido: 'Escribe un correo válido, por ejemplo tucorreo@gmail.com.', cupo_lleno: 'Ya no hay lugares para cuentas nuevas. Avísale a tu profe.', apodo_invalido: 'Tu nick debe tener de 2 a 20 letras o números.' }[r.body.error];
    return pantallaLogin(txt || 'No se pudo entrar (' + (r.body.error || r.status) + '). Intenta de nuevo.');
  }
  try { await StaldAuth.entrarConToken(r.body.token_hash, correo); } catch (e) { return pantallaLogin(e.message); }
  borrarRegistro(); entradaPrevia = { correo: '', nick: '' };
  iniciar();
}


function pantallaInvitado(msg) {
  limpiar(); chip.hidden = true;
  app.innerHTML = '<div class="card"><h1>🎮 Crea tu cuenta de Juegos</h1><p class="lead">Tu correo <b>' + escapeHtml(state.email) + '</b> todavía no tiene cuenta. Elige tu apodo y empieza a jugar' + (salaPendiente ? ' en la partida <b>' + escapeHtml(salaPendiente) + '</b>' : '') + '.</p>' +
    '<form id="f-invitado" novalidate><label for="apodo">¿Cómo te llamamos? (apodo)</label><input id="apodo" type="text" maxlength="20" placeholder="Ej. Leo" autocomplete="nickname">' +
    '<label class="check"><input id="acepto" type="checkbox"><span>Acepto que se guarde mi correo y mis puntos para registrar mi avance y mejorar la plataforma.</span></label>' +
    '<div class="row-btns"><button class="btn ghost" type="button" data-a="otro-correo">Usar otro correo</button><button class="btn" type="submit">Crear mi cuenta y jugar</button></div></form>' +
    (msg ? '<div class="alert">' + escapeHtml(msg) + '</div>' : '') + '</div>';
}

// ---------- Hub ----------
function pantallaHub(tab) {
  limpiar(); olvidarSala();
  state.tab = tab || state.tab || 'juegos';
  const admin = state.jugador && state.jugador.tipo === 'admin';
  // Pestañas viejas del admin: ahora son sub-secciones de «🛡️ Admin» (openspec: admin-juegos-unificado).
  if (subAdmin(state.tab)) { state.admSub = state.tab; state.tab = 'admin'; }
  if (state.tab === 'admin' && !admin) state.tab = 'juegos';
  const tabs = '<div class="tabs" role="tablist">' +
    ['juegos:🎮 Juegos', 'partidas:👥 Partidas', 'ranking:🏆 Ranking'].concat(admin ? ['admin:🛡️ Admin'] : []).map(x => {
      const [id, t] = x.split(':');
      return '<button class="tab" role="tab" data-tab="' + id + '" aria-selected="' + (state.tab === id) + '">' + t + '</button>';
    }).join('') + '</div>';
  app.innerHTML = '<h1>🎮 Juegos</h1><p class="lead">Aprende jugando y suma puntos para el ranking de la semana.</p>' +
    '<div class="row-btns" style="margin:-6px 0 12px"><button class="btn ghost" type="button" id="registrar-btn" data-a="registrar">🆕 Registrar</button></div>' +
    tabs + '<div id="tab-body"></div>';
  if (state.tab === 'ranking') return pintarRanking();
  if (state.tab === 'partidas') return pintarPartidas();
  if (state.tab === 'admin') return pintarAdmin();
  document.getElementById('tab-body').innerHTML = CATEGORIAS.map(c => {
    const js = JUEGOS.filter(j => j.cat === c.id);
    if (!js.length) return '';
    return '<h2>' + c.titulo + '</h2><div class="grid">' + js.map(j => {
      const best = state.mejores[j.id];
      return '<button class="game ' + c.clase + '" data-juego="' + j.id + '"><span class="ico" aria-hidden="true">' + j.emoji + '</span>' +
        '<span class="t">' + escapeHtml(j.t) + '</span><span class="d">' + escapeHtml(j.d) + '</span>' +
        (best ? '<span class="best" title="Tu mejor de la semana">⭐ ' + fmt(best) + '</span>' : '') + '</button>';
    }).join('') + '</div>';
  }).join('');
}
