// Juegos · menú (openspec: organizar-codigo).
// Catálogo (CATEGORIAS, JUEGOS), avatar, sesión y registro (iniciar, pantallaLogin) y el hub con sus pestañas.
// Script clásico (sin build ni módulos ES): juegos.html lo carga en orden y todos comparten el ámbito global
// (const/let/function de nivel superior). Ver docs/frontend-standards.md, «Estructura de juegos/app/».
// ---------- Catálogo ----------
// Navegación por categorías (openspec: juegos-categorias): emoji, nombre y descripción corta de cada tarjeta de
// categoría; `titulo` (emoji + nombre) se conserva para quien ya lo usa. El número de juegos se cuenta de JUEGOS.
const CATEGORIAS = [
  { id: 'ingles', emoji: '📘', nombre: 'Inglés', d: 'Vocabulario, gramática y pronunciación jugando.', clase: 'cat-ingles' },
  { id: 'cultura', emoji: '🧠', nombre: 'Cultura y Conocimiento', d: 'Historia, ciencia, ortografía y línea del tiempo.', clase: 'cat-cultura' }, // cultura-conocimiento: junta Español y Maratón
  { id: 'mente', emoji: '⚡', nombre: 'Mente ágil', d: 'Cálculo, lógica, memoria y estrategia.', clase: 'cat-mente' },
  { id: 'clasicos', emoji: '🎲', nombre: 'Clásicos', d: 'Cartas, tablero y juegos de mesa de siempre.', clase: 'cat-clasicos' },
  { id: 'arcade', emoji: '🕹️', nombre: 'Arcade', d: 'Plataformas, carreras y deportes de acción.', clase: 'cat-arcade' },
];
CATEGORIAS.forEach(c => { c.titulo = c.emoji + ' ' + c.nombre; });
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
  { id: 'blackjack', cat: 'clasicos', emoji: '♣️', icono: 'juegos/iconos/blackjack.svg', t: 'Blackjack (21)', d: 'Acércate a 21 sin pasarte y gánale a la banca, con fichas de juego.', jugar: () => elegirBlackjack() },
  { id: 'futbol', cat: 'arcade', emoji: '⚽', t: 'Fútbol Estelar 2010', d: 'Futbol táctico de consola: liga, copa, carrera y torneos con amigos. Contra la IA o en local.', jugar: () => jugarArcade('futbol') }, // futbol-estelar: reemplaza a Futbolito
  { id: 'futbolito-arena', cat: 'arcade', emoji: '🤖', t: 'Futbolito Arena', d: 'Robots con joystick en una arena octagonal: embiste, patea y mete gol. Contra la IA o 2 vs 2 en vivo.', jugar: () => jugarArcade('futbolito-arena') }, // futbolito-arena
  { id: 'billar', cat: 'arcade', emoji: '🎱', t: 'Billar', d: 'Bola 8 con línea guía: mete tus bolas y al final la 8. Contra el bot o 1 vs 1.', jugar: () => jugarArcade('billar') }, // futbolito-billar
  { id: 'brigada', cat: 'arcade', emoji: '🦎', t: 'Brigada Xalli', d: 'Acción y rescate: corre, salta y revienta robots en confeti. 4 misiones, solo o en equipo.', jugar: () => jugarArcade('brigada') }, // brigada
  { id: 'golf', cat: 'arcade', emoji: '⛳', t: 'Golf', d: 'Minigolf de 9 hoyos: jala como resortera y métela en pocos golpes. Solo o de 2 a 4.', jugar: () => jugarArcade('golf') }, // golf
  // clasicos-rapidos: Gato, Conecta 4, Piedra-papel-tijera, Ahorcado y Serpientes. Sus tarjetas viven aquí y no en
  // clasicos-rapidos-ui.js para pintar el menú sin cargar ese módulo (openspec: juegos-carga-perezosa).
  { id: 'gato', cat: 'clasicos', emoji: '❌', t: 'Gato', d: 'Tres en línea contra Michi (3 niveles) o 1 vs 1.', jugar: () => ClasicosRapidosUI.jugar('gato') },
  { id: 'conecta4', cat: 'clasicos', emoji: '🔴', t: 'Conecta 4', d: 'Suelta fichas y junta 4 en línea antes que tu rival.', jugar: () => ClasicosRapidosUI.jugar('conecta4') },
  { id: 'ppt', cat: 'clasicos', emoji: '✊', t: 'Piedra, papel o tijera', d: 'Al mejor de 5, ¡todos eligen a la vez!', jugar: () => ClasicosRapidosUI.jugar('ppt') },
  { id: 'ahorcado', cat: 'clasicos', emoji: '🪢', t: 'Ahorcado en inglés', d: 'Adivina la palabra en inglés antes de que se desinfle el globo.', jugar: () => ClasicosRapidosUI.jugar('ahorcado') },
  { id: 'serpientes', cat: 'clasicos', emoji: '🐍', t: 'Serpientes y escaleras', d: 'Tira el dado, sube escaleras y esquiva serpientes.', jugar: () => ClasicosRapidosUI.jugar('serpientes') },
  // juegos-tablero: Damas y Batalla naval (Mente ágil), Dominó y Parchís (Clásicos); antes en tablero-ui.js.
  { id: 'damas', cat: 'mente', emoji: '⚫', t: 'Damas', d: 'Come en diagonal, salta varias y corona tu dama. Contra el bot o 1 vs 1.', jugar: () => TableroUI.elegir('damas') },
  { id: 'naval', cat: 'mente', emoji: '🚢', t: 'Batalla naval', d: 'Esconde tu flota y hunde la del rival: ¡agua, tocado y hundido!', jugar: () => TableroUI.elegir('naval') },
  { id: 'domino', cat: 'clasicos', emoji: '🔳', icono: 'juegos/iconos/domino.svg', t: 'Dominó', d: 'Doble seis de 2 a 4: embona tus fichas y quédate sin ninguna.', jugar: () => TableroUI.elegir('domino') },
  { id: 'parchis', cat: 'clasicos', emoji: '🎲', t: 'Parchís', d: 'Sal con 5, come fichas y llega a la meta antes que nadie.', jugar: () => TableroUI.elegir('parchis') },
];
// futbol-estelar: juegos retirados del menú (no salen en categorías ni al crear salas), pero juegoPorId los sigue
// encontrando para abrir y terminar salas que ya existían y para el ranking y el historial.
const JUEGOS_RETIRADOS = [
  { id: 'futbolito', cat: 'arcade', emoji: '⚽', t: 'Futbolito', d: 'Futbolito de mesa (retirado: lo reemplaza Fútbol Estelar 2010).', jugar: () => jugarArcade('futbolito') }, // futbolito-billar
];
const juegoPorId = id => JUEGOS.find(j => j.id === id) || JUEGOS_RETIRADOS.find(j => j.id === id);
// Ícono de un juego como HTML (openspec: juegos-categorias): con `icono` (SVG del repo) una <img class="ico-img"> del
// tamaño de la letra de donde vive; si no, su emoji. `emoji` es el respaldo en texto (<option>, avisos, títulos).
// Acepta el juego o su id.
function icoJuego(j) {
  if (typeof j === 'string') j = juegoPorId(j);
  if (!j) return '🎮';
  return j.icono ? '<img class="ico-img" src="' + escapeHtml(j.icono) + '" alt="" width="64" height="64" decoding="async">' : j.emoji;
}

// ---------- Sesión ----------
// Foto del avatar (openspec: avatar-foto): si ya no existe, queda el personaje.
const fotoSrc = av => av.fotoUrl || (API_BASE + '/juegos/foto/' + encodeURIComponent(av.foto));
const avatarHtml = (av, px = 26) => {
  if (!av) return '';
  const cara = av.foto || av.fotoUrl ? '<img src="' + escapeHtml(fotoSrc(av)) + '" alt="" data-e="' + escapeHtml(av.emoji) + '" onerror="this.replaceWith(document.createTextNode(this.dataset.e))">' : escapeHtml(av.emoji);
  return '<span class="av" style="--avc:' + escapeHtml(av.color) + ';width:' + px + 'px;height:' + px + 'px;font-size:' + Math.round(px * 0.58) + 'px" aria-hidden="true">' + cara + '</span>';
};

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
  let sel = { ...(state.jugador.avatar || { emoji: listas.emojis[0], color: listas.colores[0] }) };
  let fotoNueva = null, permiso = false; // modo foto: sel.foto (actual) o fotoNueva (data URL)
  // Nick (openspec: nick-jugadores): se conserva lo escrito aunque la pantalla se vuelva a dibujar.
  const nombreReal = state.jugador.nombreReal || state.jugador.nombre;
  let nickVal = state.jugador.nombreReal ? state.jugador.nombre : '';
  const pintar = () => {
    const vista = fotoNueva ? ({ ...sel, fotoUrl: fotoNueva }) : sel;
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
      const nick = nickVal.trim().replaceAll(/\s+/g, ' ');
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
      let r;
      if (fotoNueva) r = await post('/juegos/foto', { imagen: fotoNueva, acepto: true });
      else if (sel.foto) r = { ok: true, body: { avatar: state.jugador.avatar } }; // sin cambios: conserva su foto
      else r = await post('/juegos/avatar', { emoji: sel.emoji, color: sel.color });
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
    // juegos-carga-perezosa: las salas y la reanudación necesitan el código de los juegos antes de pintar. La sala
    // pendiente se consume después de cargarlo, así «Reintentar» vuelve a intentar la misma.
    if (salaPendiente) { await cargarPaquete('todo'); const c = salaPendiente; salaPendiente = null; return VER_URL ? espectarCodigo(c) : unirseCodigo(c); } // espectador: &ver=1
    if (abrirAvatar) { abrirAvatar = false; return pantallaAvatar(); }
    // Recarga (openspec: juegos-recarga): primero la sala guardada; luego, el juego individual a medias.
    const enSala = salaGuardada(); if (enSala) { await cargarPaquete('todo'); return volverASala(enSala.codigo); }
    const revancha = revanchaGuardada(); if (revancha) { await cargarPaquete('todo'); return ofrecerRevancha(revancha.codigo); }
    if (hayPartidaGuardada()) { await cargarPaquete('todo'); const previa = partidaGuardada(); if (previa) return pantallaReanudar(previa); }
    pantallaHub();
  } catch (e) {
    const txt = { mucho_trafico: '⏳ Hay mucha actividad en este momento. Intenta de nuevo en unos minutos.', juego_sin_cargar: '😕 No se pudo cargar el juego. Revisa tu internet e intenta de nuevo.' }[e.message] || '⚠️ No pude conectarme (' + escapeHtml(e.message) + ').';
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
  } catch { /* sin conexión: se vuelve a la entrada con el aviso */ return pantallaLogin('⚠️ No pude conectarme. Revisa tu internet e intenta de nuevo.'); }
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
  app.innerHTML = htmlHeroe() + tabs + '<div id="tab-body"></div>'; // juegos-diseno-rpg: encabezado del jugador
  if (state.tab === 'ranking') return pintarRanking();
  if (state.tab === 'partidas') return conPaquete('todo', document.getElementById('tab-body'), () => pintarPartidas(), 'data-tab="juegos"'); // juegos-carga-perezosa
  if (state.tab === 'admin') return pintarAdmin();
  pintarMenuJuegos(categoriaInicial());
}

// ---------- Entrada estilo RPG (openspec: juegos-diseno-rpg) ----------
// Encabezado del jugador con datos de /juegos/yo (avatar, nick, ⭐ individuales, 👥 partidas y lugar de la semana).
// Juegos no tiene nivel ni XP: no se inventan. Tokens y componentes rpg- de estilos/ui.css.
function htmlHeroe() {
  const j = state.jugador || {};
  const dato = (ico, t, v, id) => '<div class="rpg-dato" id="' + id + '"><span class="rpg-dato-ico" aria-hidden="true">' + ico + '</span><div><div class="rpg-dato-t">' + t + '</div><div class="rpg-dato-v rpg-num">' + v + '</div></div></div>';
  return '<section id="jg-heroe" class="jg-heroe" aria-labelledby="jg-hola">' +
    '<div class="jg-heroe-top">' + (j.avatar ? avatarHtml(j.avatar, 56) : '<span class="av jg-av-vacio" aria-hidden="true">🎮</span>') +
    '<div class="jg-heroe-txt"><span class="rpg-etiqueta">🎮 Juegos</span><h1 id="jg-hola" class="jg-hola">¡Hola, ' + escapeHtml(j.nombre || 'jugador') + '!</h1>' +
    '<p class="jg-lead">Aprende jugando y suma puntos para el ranking de la semana.</p></div></div>' +
    '<div class="jg-stats">' + dato('⭐', 'Individuales', fmt(state.totalIndividual), 'jg-pts-ind') + dato('👥', 'Partidas', fmt(state.totalPartidas), 'jg-pts-par') +
    dato('🏅', 'Tu lugar', state.pos ? '#' + state.pos : '—', 'jg-lugar') + '</div>' +
    '<div class="jg-heroe-acc"><button class="btn ghost" type="button" data-heroe="avatar">🎨 Mi avatar</button>' +
    '<button class="btn ghost" type="button" id="registrar-btn" data-a="registrar">🆕 Registrar</button></div></section>';
}

// Tarjeta de las secciones del hub («Para ti» y «Copas»): no es `.game[data-juego]` (esa clase es solo de la lista de
// una categoría); el botón «▶ Jugar» lleva `data-jugar`.
function tarjetaSeccion(j, extra) {
  const c = CATEGORIAS.find(x => x.id === j.cat) || { clase: '', emoji: '🎮', nombre: '' };
  return '<li class="jg-tarjeta ' + c.clase + '" data-jg="' + escapeHtml(j.id) + '"><span class="jg-ico" aria-hidden="true">' + icoJuego(j) + '</span>' +
    '<div class="jg-tarjeta-txt"><span class="jg-cat">' + c.emoji + ' ' + escapeHtml(c.nombre) + '</span><b class="jg-tarjeta-t">' + escapeHtml(j.t) + '</b>' + (extra || '') + '</div>' +
    '<button type="button" class="btn jg-jugar-btn" data-jugar="' + escapeHtml(j.id) + '" aria-label="Jugar ' + escapeHtml(j.t) + '">▶ Jugar</button></li>';
}

// «⭐ Para ti»: hasta 3 juegos con tu mejor puntaje de la semana (state.mejores), de mayor a menor.
function htmlParaTi() {
  const top = Object.entries(state.mejores || {}).filter(([id, n]) => n > 0 && JUEGOS.some(j => j.id === id))
    .sort((a, b) => b[1] - a[1]).slice(0, 3);
  const cuerpo = top.length
    ? '<ul class="jg-lista">' + top.map(([id, n]) => tarjetaSeccion(juegoPorId(id), '<span class="rpg-xp-chip">⭐ ' + fmt(n) + '</span>')).join('') + '</ul>'
    : '<div class="jg-vacio"><span class="jg-vacio-e" aria-hidden="true">🌱</span><b>Aún no juegas esta semana</b><span>Elige una categoría y estrena tu puntaje. Aquí verás tus favoritos.</span></div>';
  return '<section class="jg-seccion" data-seccion="para-ti" aria-labelledby="jg-para-ti"><h2 id="jg-para-ti">⭐ Para ti</h2>' + cuerpo + '</section>';
}

// «👥 En vivo · Salas»: no hay lista de salas abiertas en el servidor; lleva a la pestaña Partidas (data-ir-tab).
function htmlEnVivo() {
  return '<section class="jg-seccion" data-seccion="en-vivo" aria-labelledby="jg-en-vivo"><h2 id="jg-en-vivo">👥 En vivo · Salas</h2>' +
    '<div class="jg-panel"><p>Juega al mismo tiempo con tus compañeros y compañeras: crea una sala y comparte el código, o únete con el código de alguien más.</p>' +
    '<div class="jg-acciones"><button type="button" class="btn" data-ir-tab="partidas" data-foco="p-juego">➕ Crear partida</button><button type="button" class="btn ghost" data-ir-tab="partidas" data-foco="p-codigo">🔑 Unirme con código</button></div></div></section>';
}

// «🏆 Copas»: los juegos que tienen copas.
const JUEGOS_COPA = [['karts', 'Copas de 4 pistas contra 7 rivales.'], ['futbol', 'Liga, copa y torneos con amigos.']];
function htmlCopas() {
  const js = JUEGOS_COPA.filter(([id]) => JUEGOS.some(j => j.id === id));
  if (!js.length) return '';
  return '<section class="jg-seccion" data-seccion="copas" aria-labelledby="jg-copas"><h2 id="jg-copas">🏆 Copas</h2><ul class="jg-lista">' +
    js.map(([id, d]) => tarjetaSeccion(juegoPorId(id), '<span class="jg-tarjeta-d">' + escapeHtml(d) + '</span>')).join('') + '</ul></section>';
}

// Clics del hub RPG: «🎨 Mi avatar» y «👥 En vivo · Salas», que cambia de pestaña. No usa data-tab porque las E2E
// tocan la pestaña con ese selector; los demás clics los atiende juegos/app/arranque.js.
app.addEventListener('click', e => {
  if (e.target.closest('[data-heroe="avatar"]')) return pantallaAvatar();
  const it = e.target.closest('[data-ir-tab]'); if (!it) return;
  const foco = it.dataset.foco;
  limpiar(); olvidarRevancha();
  // juegos-carga-perezosa: Partidas puede tardar en pintarse (carga el código de las salas); se enfoca al final.
  Promise.resolve(pantallaHub(it.dataset.irTab)).then(() => {
    const f = foco && document.getElementById(foco);
    if (f) { f.scrollIntoView({ block: 'center' }); f.focus({ preventScroll: true }); }
  });
});

// ---------- Navegación por categorías (openspec: juegos-categorias) ----------
// 🎮 Juegos abre en las tarjetas de categoría; al tocar una se ven solo sus juegos. `#menu-juegos[data-menu]` vale
// "categorias" o el id de la categoría abierta. La categoría abierta vive en state.cat, en sessionStorage (para
// volver a ella al salir de un juego o al recargar) y en la URL (#cat=<id>, con history.pushState para que el botón
// Atrás regrese de la lista a las categorías). Debajo de una lista siempre queda una entrada de categorías.
const CATEGORIA_KEY = 'juegos_categoria';
const juegosDe = id => JUEGOS.filter(j => j.cat === id);
const catValida = id => !!id && CATEGORIAS.some(c => c.id === id) && juegosDe(id).length > 0;
const catDeHash = () => { const m = /^#cat=([a-z0-9-]+)$/.exec(location.hash || ''); return m ? m[1] : null; };
const rutaSinHash = () => location.pathname + location.search;
const cuantosJuegos = n => n + (n === 1 ? ' juego' : ' juegos');

// Prioridad: #cat= de la URL; la de esta página (state.cat); la de la entrada del historial (sobrevive a recargas y
// al Atrás que vuelve a cargar la página); la guardada en la pestaña (sessionStorage).
function categoriaInicial() {
  const h = catDeHash();
  if (catValida(h)) return h;
  if (location.hash.startsWith('#cat=')) return null; // #cat= de una categoría que no existe: categorías
  if (state.cat !== undefined) return catValida(state.cat) ? state.cat : null;
  if (history.state && Object.hasOwn(history.state, 'cat')) return catValida(history.state.cat) ? history.state.cat : null;
  let guardada = null;
  try { guardada = sessionStorage.getItem(CATEGORIA_KEY); } catch (e) { /* sin almacenamiento: solo URL y memoria */ }
  return catValida(guardada) ? guardada : null;
}

function recordarCategoria(id) {
  state.cat = id;
  try { if (id) sessionStorage.setItem(CATEGORIA_KEY, id); else sessionStorage.removeItem(CATEGORIA_KEY); } catch (e) { /* sin almacenamiento */ }
}

// Deja el historial de acuerdo con la vista: categorías = entrada sin hash; lista = entrada #cat=<id> encima de una
// de categorías (si la actual no es de esa categoría, la convierte en la de categorías y empuja la de la lista).
function marcarHistorial(id) {
  try {
    const actual = (history.state && history.state.cat) || null;
    if (!id) { if (actual || location.hash.startsWith('#cat=')) { history.replaceState({ ...history.state, cat: null }, '', rutaSinHash()); } return; }
    if (actual === id && location.hash === '#cat=' + id) return;
    if (actual) { history.replaceState({ ...history.state, cat: id }, '', rutaSinHash() + '#cat=' + id); return; }
    history.replaceState({ ...history.state, cat: null }, '', rutaSinHash());
    history.pushState({ cat: id }, '', rutaSinHash() + '#cat=' + id);
  } catch (e) { /* sin historial: queda la vista */ }
}

function tarjetaJuego(j, c) {
  const best = state.mejores[j.id];
  return '<button class="game ' + c.clase + '" data-juego="' + j.id + '"><span class="ico" aria-hidden="true">' + icoJuego(j) + '</span>' +
    '<span class="t">' + escapeHtml(j.t) + '</span><span class="d">' + escapeHtml(j.d) + '</span>' +
    (best ? '<span class="best" title="Tu mejor de la semana">⭐ ' + fmt(best) + '</span>' : '') +
    '<span class="jg-pildora" aria-hidden="true">▶ Jugar</span></button>'; // juegos-diseno-rpg
}

function htmlCategorias() {
  return '<section id="menu-juegos" data-menu="categorias" aria-labelledby="menu-titulo"><h2 id="menu-titulo" tabindex="-1">Elige una categoría</h2><div class="cat-grid">' +
    CATEGORIAS.map(c => {
      const n = juegosDe(c.id).length;
      if (!n) return '';
      return '<button type="button" class="cat-card ' + c.clase + '" data-categoria="' + c.id + '" data-n="' + n + '" aria-label="' + escapeHtml(c.nombre + ', ' + cuantosJuegos(n) + '. ' + c.d) + '">' +
        '<span class="cat-ico" aria-hidden="true">' + c.emoji + '</span><span class="cat-txt"><span class="cat-nombre">' + escapeHtml(c.nombre) + '</span>' +
        '<span class="cat-n">' + cuantosJuegos(n) + '</span><span class="cat-d">' + escapeHtml(c.d) + '</span></span></button>';
    }).join('') + '</div></section>';
}

function htmlCategoria(id) {
  const c = CATEGORIAS.find(x => x.id === id), js = juegosDe(id);
  return '<section id="menu-juegos" data-menu="' + id + '" class="' + c.clase + '" aria-labelledby="menu-titulo">' +
    '<div class="menu-top"><button type="button" class="btn ghost" data-a="categorias">← Categorías</button></div>' +
    '<h2 id="menu-titulo" tabindex="-1">' + escapeHtml(c.titulo) + ' <span class="menu-n">' + cuantosJuegos(js.length) + '</span></h2>' +
    '<div class="grid">' + js.map(j => tarjetaJuego(j, c)).join('') + '</div></section>';
}

// Pinta las categorías (id null) o la lista de una categoría. `foco`: al cambiar de vista por una acción, el foco pasa
// al encabezado y, si el menú quedó arriba de la pantalla, se desplaza a su inicio.
function pintarMenuJuegos(id, foco) {
  const body = document.getElementById('tab-body'); if (!body) return;
  id = catValida(id) ? id : null;
  recordarCategoria(id); marcarHistorial(id);
  body.innerHTML = id ? htmlCategoria(id) : htmlParaTi() + htmlCategorias() + htmlEnVivo() + htmlCopas(); // juegos-diseno-rpg: secciones del hub
  if (!foco) return;
  const sec = document.getElementById('menu-juegos'), h = document.getElementById('menu-titulo');
  if (sec.getBoundingClientRect().top < 0) sec.scrollIntoView({ block: 'start' });
  h.focus({ preventScroll: true });
}
const abrirCategoria = id => pintarMenuJuegos(id, true);
// «← Categorías»: si la entrada actual es de una categoría, Atrás (la de abajo es de categorías); si no, pinta.
function verCategorias() {
  if (history.state && history.state.cat) { history.back(); return; }
  pintarMenuJuegos(null, true);
}
// Atrás/Adelante y cambios del #cat=: solo con el menú a la vista (en un juego o en otra pestaña no se interrumpe nada;
// al volver al menú se usa state.cat).
function alNavegarMenu() {
  if (!document.getElementById('menu-juegos')) return;
  const h = catDeHash(), id = catValida(h) ? h : null;
  if (id === state.cat && document.querySelector('[data-menu="' + (id || 'categorias') + '"]')) return;
  pintarMenuJuegos(id, true);
}
window.addEventListener('popstate', alNavegarMenu);
window.addEventListener('hashchange', alNavegarMenu);
