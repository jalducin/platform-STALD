// Juegos · salas (openspec: organizar-codigo).
// Partidas multijugador: azar con semilla, sala, Realtime, sala de espera, preguntas, Basta por rondas, podio,
// revancha, crear/unirse/reanudar y compartir.
// Script clásico (sin build ni módulos ES): juegos.html lo carga en orden y todos comparten el ámbito global
// (const/let/function de nivel superior). Ver docs/frontend-standards.md, «Estructura de juegos/app/».
// ---------- Partidas multijugador (openspec: juegos-partidas) ----------
// Aleatorio con semilla: todos los dispositivos de una partida generan lo mismo.
function fnv(s) { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; } // NOSONAR: aritmética entera de 32 bits del generador con semilla, no es truncado
const rngDe = (seed, etiqueta) => mulberry(fnv(seed + '|' + etiqueta));

const JUEGOS_PARTIDA = ['en-vocab', 'en-frases', 'en-tiempos', 'es-ortografia', 'cultura', 'cultura-linea', 'mente-calculo', 'basta-es', 'basta-en', 'loteria', 'una', 'poker', 'brisca', 'conquian', 'ajedrez', 'plataformas', 'karts', 'billar']; // futbol-estelar: Futbolito ya no se ofrece (sus salas en curso siguen: TIEMPO_REAL y FISICA)
JUEGOS_PARTIDA.push(...TableroUI.SALA); // juegos-tablero
JUEGOS_PARTIDA.push(...Object.keys(SALAS_GRANDES)); // juegos-salas-grandes: bingo, blackjack, dibuja, en-memorama, mente-sopa
const ARCADE = new Set(['plataformas', 'karts']); // carreras en sala (openspec: juegos-plataformas-karts)
const BOT_EXTRA = { id: 'bot-chonita', nombre: 'BOT-CHONITA', acierto: 0.5, avatar: { emoji: '👵', color: '#a855f7' } }; // 3.er bot para completar la Brisca
const BOTS = [{ id: 'bot-vachira', nombre: 'BOT-VACHIRA', acierto: 0.6, avatar: { emoji: '⚡', color: '#f59e0b' } }, { id: 'bot-isagii', nombre: 'BOT-ISAGII', acierto: 0.45, avatar: { emoji: '🌀', color: '#0ea5e9' } }];
const P_Q = 15000, P_REV = 4000, P_N = 10; // ms por pregunta, ms de revelación, preguntas
const P_BASTA = 60000, P_GRACIA = 3000, P_PAUSA = 10000; // Basta por rondas: escribir, gracia tras ¡Basta!, resultados
const dur = ms => ms * TIEMPO;

// Diez preguntas iguales para todos a partir de la semilla.
async function preguntasPartida(juego, seed, opciones) {
  if (juego === 'cultura-linea') return lineasDeSala(seed, opciones); // cultura-conocimiento: 5 líneas del tiempo
  const rnd = rngDe(seed, 'preguntas');
  let d = null; // los de Mente no usan datos
  if (juego.startsWith('en-')) d = await datos('ingles');
  else if (juego.startsWith('es-')) d = await datos('espanol');
  else if (juego === 'cultura') d = await datos('cultura');
  const lista = [];
  // Ayudantes: opción múltiple (la correcta y las demás como distractores), sinónimo/antónimo y la regla de la pregunta.
  const deOpciones = (base, f) => conOpciones(base, f.opciones[f.correcta], f.opciones.filter((_, k) => k !== f.correcta), rnd);
  const deSinonimo = f => conOpciones({ big: f.tipo === 'sinónimo' ? '🟰' : '↔️', q: '«' + f.palabra + '»', sub: 'Elige el ' + f.tipo }, f.respuesta, f.distractores, rnd);
  const conRegla = f => (f.regla ? 'Regla: ' + f.regla : '');
  const deVocab = w => {
    const dis = tomar(d.vocabulario.filter(x => x.en !== w.en && x.tema === w.tema), 2, rnd).concat(tomar(d.vocabulario.filter(x => x.tema !== w.tema), 3, rnd)).map(x => x.en).filter((v, k, a) => a.indexOf(v) === k).slice(0, 3);
    return conOpciones({ big: w.emoji, q: w.es, sub: '¿Cómo se dice en inglés?' }, w.en, dis, rnd);
  };
  const ortografia = () => {
    for (const [t, n] of [['ortografia', 4], ['acentos', 3]]) for (const f of tomar(d[t], n, rnd))
      lista.push(deOpciones({ big: t === 'acentos' ? 'á' : '✍️', q: f.frase, sub: conRegla(f) }, f));
    for (const f of tomar(poolSinonimos(d), 3, rnd)) lista.push(deSinonimo(f));
    return barajar(lista, rnd);
  };
  // Cultura: 4 fáciles, 4 medias y 2 difíciles de la categoría; si faltan, se completa con las demás.
  const ordenCultura = () => {
    const del = d.preguntas.filter(p => !opciones.cat || opciones.cat === 'todas' || p.cat === opciones.cat);
    const orden = tomar(del.filter(p => p.nivel === 1), 4, rnd).concat(tomar(del.filter(p => p.nivel === 2), 4, rnd), tomar(del.filter(p => p.nivel === 3), 2, rnd));
    return orden.concat(tomar(del.filter(x => !orden.includes(x)), P_N, rnd)).slice(0, P_N);
  };
  if (juego === 'en-vocab') for (const w of tomar(d.vocabulario, P_N, rnd)) lista.push(deVocab(w));
  if (juego === 'en-preguntas') for (const f of tomar(d.preguntas, P_N, rnd)) lista.push(deOpciones({ big: '💬', q: f.pregunta, sub: f.es }, f));
  // Fusionados (openspec: juegos-fusion): las 10 preguntas se reparten entre sus fuentes.
  // Con tema de la sala y la regla de cada pregunta en la revelación (openspec: juegos-ingles-gramatica).
  if (juego === 'en-frases') return InglesGramatica.preguntasFrasesPartida(d, opciones.tema, rnd, P_N);
  if (juego === 'en-tiempos') return InglesGramatica.preguntasTiempos(d, P_N, rnd);
  if (juego === 'es-ortografia') return ortografia();
  if (juego === 'es-acentos') for (const f of tomar(d.acentos, P_N, rnd))
    lista.push(deOpciones({ big: 'á', q: f.frase, sub: conRegla(f) }, f));
  if (juego === 'es-sinonimos') {
    const pool = d.sinonimos.map(x => ({ tipo: 'sinónimo', ...x })).concat(d.antonimos.map(x => ({ tipo: 'antónimo', ...x })));
    for (const f of tomar(pool, P_N, rnd)) lista.push(deSinonimo(f));
  }
  if (juego === 'cultura') for (const p of ordenCultura())
    lista.push(deOpciones({ q: p.pregunta, sub: (d.categorias.find(c => c.id === p.cat) || {}).titulo, dato: p.dato }, p));
  if (juego === 'mente-calculo') for (let n = 0; n < P_N; n++) lista.push(n % 3 === 2 ? genSecuencia(Math.floor(n / 3) * 2, rnd) : genCalculo(n * 2, rnd));
  if (juego === 'mente-secuencias') for (let n = 0; n < P_N; n++) lista.push(genSecuencia(n, rnd));
  return lista;
}

// Respuesta de un bot a la pregunta q: al azar con su % de acierto y un tiempo de 2 a 13 s.
function botPregunta(seed, bot, q, pregunta) {
  const r = rngDe(seed, bot.id + '|q' + q);
  const correcta = r() < bot.acierto;
  const ms = Math.round((2 + r() * 11) * 1000);
  const malas = pregunta.opciones.map((_, k) => k).filter(k => k !== pregunta.correcta);
  const opcion = correcta ? pregunta.correcta : malas[Math.floor(r() * malas.length)];
  return { correcta, opcion, ms, puntos: correcta ? 100 + Math.round(100 * Math.max(0, 1 - ms / P_Q)) : 0 };
}

// Palabras de un bot en Basta: 75 % de las categorías con una palabra del diccionario al azar.
function botBasta(seed, bot, letra, d, ronda = 0) {
  const r = rngDe(seed, bot.id + '|basta' + (ronda ? '|' + ronda : ''));
  const L = normBasta(letra);
  return Object.fromEntries(d.categorias.map(c => {
    const opciones = (d.palabras[c.id] || []).filter(w => normBasta(w).startsWith(L));
    return [c.id, r() < 0.75 && opciones.length ? opciones[Math.floor(r() * opciones.length)] : ''];
  }));
}

// Puntuación de Basta en sala: única/verificada 100, repetida 50; no verificada 25/10; inválida 0 (juegos/basta.js).
const puntuarBasta = Basta.puntuar; // basta-divertida-una-robo

const sala = { codigo: null, estado: null, offset: 0, poll: null, guardado: false };
const ahoraServidor = () => Date.now() + sala.offset;
// karts-salida-y-puntos: el desfase con el servidor sale de la intersección de todas las muestras recientes
// (juegos/reloj-sala.js), no de la última: así cada aparato arranca las carreras a la misma hora del servidor.
const relojSala = RelojSala.crear();

const TIEMPO_REAL = new Set(['una', 'basta-es', 'basta-en', 'loteria', 'poker', 'brisca', 'conquian', 'ajedrez', 'futbolito', 'billar']); // futbolito-billar
ClasicosRapidosUI.IDS.forEach(id => { JUEGOS_PARTIDA.push(id); TIEMPO_REAL.add(id); }); // clasicos-rapidos
TableroUI.SALA.forEach(j => TIEMPO_REAL.add(j)); // juegos-tablero
['bingo', 'blackjack', 'dibuja', 'mente-sopa'].forEach(j => TIEMPO_REAL.add(j)); // juegos-salas-grandes
const FISICA = new Set(['futbolito', 'billar']); // futbolito-billar: 1 vs 1 por tiros en su iframe
JUEGOS_PARTIDA.push('golf'); TIEMPO_REAL.add('golf'); FISICA.add('golf'); // golf: de 2 a 4 por turnos en su iframe (pintarFisicaSala)
JUEGOS_PARTIDA.push('futbol'); TIEMPO_REAL.add('futbol'); // futbol-en-linea: 1 vs 1 en vivo en su iframe (pintarFutbolSala)

// Supabase Realtime (openspec: salas-realtime): si el servidor entrega `rt`, la página escucha el canal de la
// sala y recibe cada cambio al instante; el sondeo baja a 30 s de respaldo. Si el canal falla, vuelve el sondeo normal.
let supabaseLib = null;
function cargarSupabase() {
  if (window.supabase) return Promise.resolve(window.supabase);
  if (supabaseLib) return supabaseLib;
  supabaseLib = new Promise((ok, mal) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js';
    s.onload = () => ok(window.supabase); s.onerror = () => { supabaseLib = null; mal(new Error('supabase')); };
    document.head.appendChild(s);
  });
  return supabaseLib;
}
// Los avisos pueden llegar fuera de orden: por jugador gana la versión `v` más alta, se conservan los jugadores que
// solo existen localmente y una sala ya empezada no vuelve a la espera.
function mezclarEstado(local, p) {
  const previos = new Map(local.jugadores.map(j => [j.id, j]));
  const jugadores = p.jugadores.map(j => { const l = previos.get(j.id); previos.delete(j.id); return l && (l.v || 0) > (j.v || 0) ? l : j; }).concat([...previos.values()]);
  const salaNueva = local.sala.inicio !== null && p.sala.inicio === null ? local.sala : p.sala;
  return { sala: salaNueva, jugadores };
}
// Juego en vivo (openspec: juegos-en-vivo): transporte de EnVivo sobre el MISMO canal de la sala (un solo socket):
// el evento `vivo` lleva los mensajes de navegador a navegador; el `estado` del servidor sigue aparte.
// En E2E (?vivoSimulado=1 y window.__vivoSimulado con las opciones de EnVivo.simulado) se usa el doble de prueba.
function transporteSala() {
  const rx = EnVivo.oyentesDe(), st = EnVivo.oyentesDe();
  const t = {
    estado: 'conectando', canal: null, alReconectar: null,
    enviar(m) { if (t.canal && t.estado === 'listo') t.canal.send({ type: 'broadcast', event: 'vivo', payload: m }); },
    alRecibir: rx.agregar, alEstado: st.agregar, recibir: rx.emitir,
    reconectar() { if (t.alReconectar) t.alReconectar(); },
    fijar(e) { if (t.estado !== e) { t.estado = e; st.emitir(e); } },
  };
  return t;
}
const vivoSimulado = () => new URLSearchParams(location.search).get('vivoSimulado') === '1' && window.__vivoSimulado ? window.__vivoSimulado : null;
// Transporte de la sala para el juego en vivo: el doble de prueba, el canal de Realtime o ninguno (respaldo).
function prepararVivo(codigo) {
  const op = vivoSimulado();
  if (op) { sala.vivoTr = EnVivo.simulado(op).transporte('sala-sim-' + codigo, sala.estado.yo); return; }
  sala.vivoTr = sala.estado.rt && window.EnVivo ? transporteSala() : null;
}
const ESTADO_CANAL = { SUBSCRIBED: 'listo', CLOSED: 'caido', CHANNEL_ERROR: 'caido', TIMED_OUT: 'caido' };
async function conectarRealtime(rt, codigo, alCambiar) {
  try {
    const lib = await cargarSupabase();
    if (sala.codigo !== codigo) return;
    const cliente = lib.createClient(rt.url, rt.key, { auth: { persistSession: false, autoRefreshToken: false } });
    const canal = cliente.channel(rt.topic, { config: { broadcast: { self: false, ack: false } } });
    const tv = sala.vivoTr && sala.vivoTr.fijar ? sala.vivoTr : null; // el doble de prueba no usa el canal
    if (tv) {
      tv.canal = canal;
      tv.alReconectar = () => { if (sala.codigo !== codigo) { return; } cliente.removeChannel(canal); conectarRealtime(rt, codigo, alCambiar); };
      canal.on('broadcast', { event: 'vivo' }, ({ payload }) => { if (sala.codigo === codigo) tv.recibir(payload); });
    }
    canal.on('broadcast', { event: 'estado' }, ({ payload: p }) => {
      if (sala.codigo !== codigo || !sala.estado || !p || !p.sala) return;
      sala.estado = { ...sala.estado, ...mezclarEstado(sala.estado, p), ahora: p.ahora };
      relojSala.aviso(Date.now(), p.ahora); sala.offset = relojSala.offset();
      sala.rtRecibidos = (sala.rtRecibidos || 0) + 1;
      pintarSala();
    }).subscribe(st => {
      if (tv && tv.canal === canal && ESTADO_CANAL[st]) tv.fijar(ESTADO_CANAL[st]); // juegos-en-vivo
      const antes = sala.rtVivo;
      sala.rtVivo = st === 'SUBSCRIBED';
      if (antes !== sala.rtVivo) alCambiar();
      // Ponerse al día con lo que cambió mientras se conectaba (un aviso previo a la suscripción no llega).
      if (sala.rtVivo && !antes) traerSala().then(r => { if (r.ok && sala.codigo === codigo) pintarSala(); });
    });
    limpiezas.push(() => { sala.rtVivo = false; cliente.removeChannel(canal); });
  } catch { sala.rtVivo = false; /* sin Realtime: sigue el sondeo normal */ }
}

async function traerSala() {
  const t0 = Date.now();
  const r = await api('/juegos/sala/' + sala.codigo);
  if (r.ok) { sala.estado = r.body; relojSala.http(t0, Date.now(), r.body.ahora, r.body.reloj); sala.offset = relojSala.offset(); }
  return r;
}

function pintarPartidas() {
  const body = document.getElementById('tab-body');
  const opcionesJuego = JUEGOS_PARTIDA.map(id => { const j = juegoPorId(id); return '<option value="' + id + '">' + j.emoji + ' ' + escapeHtml(j.t) + '</option>'; }).join('');
  body.innerHTML = '<p class="muted" style="margin:10px 0">Juega con tus compañeros y compañeras al mismo tiempo. Crea una partida y comparte el código.</p>' +
    '<div class="card" style="margin-bottom:12px"><h2 style="margin-top:0">➕ Crear partida</h2>' +
    '<form id="f-crear"><label for="p-juego">Juego</label><select id="p-juego" class="sel">' + opcionesJuego + '</select>' +
    '<div id="p-modo-wrap" hidden><label for="p-modo">Modo</label><select id="p-modo" class="sel"><option value="linea">➖ Línea (rápido)</option><option value="llena">🟩 Tabla llena</option></select></div>' +
    '<div id="p-reloj-wrap" hidden><label for="p-reloj">Reloj por jugador</label><select id="p-reloj" class="sel"><option value="5">⚡ 5 min</option><option value="10" selected>⏱ 10 min</option><option value="15">🐢 15 min</option></select></div>' +
    '<div id="p-formato-wrap" hidden><label for="p-formato">Formato</label><select id="p-formato" class="sel"><option value="1v1">⚽ 1 vs 1</option><option value="2v2">👥 2 vs 2 (por equipos)</option></select></div>' + // futbolito-equipos
    '<div id="p-equipos-wrap" hidden><label class="check"><input id="p-equipos" type="checkbox"><span>👥 Por equipos (A y B, alternados por orden de entrada)</span></label></div>' +
    '<div id="p-rondas-wrap" hidden><label for="p-rondas">Rondas</label><select id="p-rondas" class="sel"><option value="5">5 rondas</option><option value="10" selected>10 rondas</option><option value="12">12 rondas</option></select>' +
      '<label>🎉 Categorías divertidas (opcional, máximo 2)</label><div id="p-extra"></div><div class="feedback" id="p-extra-aviso"></div></div>' + // basta-divertida-una-robo
    '<div id="p-kformato-wrap" hidden><label for="p-kformato">Formato</label><select id="p-kformato" class="sel"><option value="carrera">🏁 Una carrera</option>' + // karts-copa-en-sala
      '<option value="copa:fiesta">🏆 Copa completa: Copa Fiesta (4 pistas)</option><option value="copa:mesoamerica">🌽 Copa completa: Copa Mesoamericana (4 pistas)</option><option value="copa:mixta">🎲 Copa completa: mixta (2 y 2 al azar)</option></select></div>' +
    '<div id="p-mapa-wrap" hidden><label for="p-mapa">Nivel o pista</label><select id="p-mapa" class="sel"></select></div>' +
    '<div id="p-tema-wrap" hidden><label for="p-tema">Tema</label><select id="p-tema" class="sel">' + InglesGramatica.TEMAS.map(t => '<option value="' + t.id + '">' + t.emoji + ' ' + escapeHtml(t.t) + '</option>').join('') + '</select></div>' +
    '<div id="p-grandes-wrap" hidden></div>' + // juegos-salas-grandes: figura del Bingo, criterio del Memorama
    '<div id="p-cat-wrap" hidden><label for="p-cat">Maratón</label><select id="p-cat" class="sel"><option value="todas">🌈 Todas mezcladas</option></select></div>' +
    '<div id="p-ltema-wrap" hidden><label for="p-ltema">Tema de la línea del tiempo</label><select id="p-ltema" class="sel">' + LineaTiempo.TEMAS.map(t => '<option value="' + t.id + '">' + escapeHtml(t.emoji + ' ' + t.titulo) + '</option>').join('') + '</select></div>' + // cultura-conocimiento
    '<label class="check" id="p-bots-wrap"><input id="p-bots" type="checkbox" checked><span>Incluir 2 bots (BOT-VACHIRA y BOT-ISAGII) que contestan al azar</span></label>' +
    '<div class="muted" id="p-bots-nota" hidden style="font-size:.82rem;margin:6px 0"></div>' +
    '<div class="row-btns"><button class="btn" type="submit">Crear partida</button></div></form></div>' +
    '<div class="card"><h2 style="margin-top:0">🔑 Unirme con código</h2><form id="f-unirse" autocomplete="off"><label for="p-codigo">Código de 4 letras</label>' +
    '<input id="p-codigo" type="text" maxlength="4" placeholder="KXQP" style="text-transform:uppercase;letter-spacing:.3em;font-weight:800;text-align:center">' +
    '<div class="row-btns"><button class="btn" type="submit">Unirme</button></div></form><div id="p-msg"></div></div>';
  datos('basta').then(d => { const el = document.getElementById('p-extra'); if (el) el.innerHTML = selectorExtras(d.extras, 'pextra'); }).catch(() => {}); // basta-divertida-una-robo
  datos('cultura').then(d => {
    const sel = document.getElementById('p-cat'); if (!sel) return;
    sel.innerHTML += d.categorias.map(c => '<option value="' + escapeHtml(c.id) + '">' + escapeHtml(c.emoji + ' ' + c.titulo) + '</option>').join('');
  }).catch(() => {});
}

async function entrarSala(codigo) {
  limpiar();
  Object.assign(sala, { codigo, estado: null, guardado: false, arcadeMia: null, mias: {}, enviado: false, misPalabras: null, vista: null, lot: null, unaSt: null, unaLocal: null, unaElegir: null, unaEnviando: false, unaAnunciada: null, unaAnimado: null, bastaDatos: null, cqSel: new Set(), cqDestino: null, cqMsg: '', csEnviando: false, csSt: null, ajSel: null, ajPromo: null, ajEnviando: false, ajA: null, ajCache: new Map(), finAciertos: undefined, finTotal: undefined, bastaEnviado: {}, misRondas: {}, letrasBasta: null, rondaActual: 0, rtVivo: false, rtRecibidos: 0, vivoTr: null, finT: 0, revEnviando: false, revMsg: '', personajeMio: null, personajeMsg: '' }); // personaje-en-salas: personajeMio/Msg
  app.innerHTML = '<div class="loading">Entrando a la partida ' + escapeHtml(codigo) + '…</div>';
  const r = await traerSala();
  if (!r.ok) { pantallaHub('partidas'); const m = document.getElementById('p-msg'); if (m) { m.innerHTML = '<div class="alert">No se pudo abrir la partida (' + escapeHtml(r.body.error || r.status) + ').</div>'; } return; }
  // Recargar regresa aquí (openspec: juegos-recarga): código en la URL y sala activa guardada.
  recordarSala(codigo);
  try { history.replaceState(history.state, '', urlConSala(codigo)); } catch (e) { /* sin historial */ }
  modoPartida(true);
  const j = juegoPorId(sala.estado.sala.juego);
  // Contenido de la sala: salas grandes, juegos sin preguntas, Basta, Lotería o las preguntas con semilla.
  const prepararContenido = () => {
    const juego = sala.estado.sala.juego;
    if (SALAS_GRANDES[juego]) return Promise.resolve(SALAS_GRANDES[juego].preparar()); // juegos-salas-grandes
    if (['una', 'poker', 'brisca', 'conquian', 'ajedrez', 'futbolito', 'billar', 'golf', 'futbol' /* futbol-en-linea */].includes(juego)) return Promise.resolve(null);
    if (juego.startsWith('basta')) return datos('basta');
    if (juego === 'loteria') return datos('loteria');
    return preguntasPartida(juego, sala.estado.sala.seed, sala.estado.sala.opciones);
  };
  const preparar = prepararContenido();
  sala.contenido = await preparar;
  // Deja de consultar cuando ya no sirve (openspec: github-etag-cache): partida terminada, sala vencida o
  // inexistente, o 1 h con la pestaña abierta. Así una pestaña olvidada no gasta el límite de GitHub.
  const t0 = Date.now();
  let tick, detenido = false, fallos = 0, consultando = false;
  const parar = msg => { detenido = true; clearTimeout(tick); const pb = document.getElementById('p-body'); if (msg && pb && sala.vista !== 'final') pb.innerHTML = '<div class="card muted" style="text-align:center">' + msg + '</div>'; };
  const avisoRed = ver => { const e = document.getElementById('p-red'); if (e) e.hidden = !ver; };
  // Intervalo por tipo de juego (openspec: ahorro-peticiones): 2.5 s en la sala de espera y en los juegos que
  // necesitan verse en tiempo real (¡Una!, Basta, Lotería); 5 s en los de preguntas (van sincronizados por
  // reloj); 30 s de respaldo con Realtime. La sala de espera deja de consultar a los 15 min si nadie empieza.
  // Sondeo resistente (openspec: cache-estabilidad): un error de red nunca lo detiene; mientras falle, la espera
  // se duplica hasta 30 s y se avisa «Reconectando…»; al primer éxito vuelve a su ritmo.
  const intervalo = () => {
    if (sala.vista === 'final') return sala.rtVivo ? 30000 : 5000; // podio: espera una revancha (openspec: revancha-partidas)
    const esperando = sala.estado && sala.estado.sala.inicio === null;
    let base = 30000; // con Realtime
    if (!sala.rtVivo) base = esperando || TIEMPO_REAL.has(sala.estado.sala.juego) ? 2500 : 5000;
    return fallos ? Math.min(30000, base * Math.pow(2, fallos)) : base;
  };
  const ciclo = () => {
    if (detenido) return;
    if (document.hidden) return programarTick(); // pestaña oculta: no consulta (al volver, alVolver)
    // En el podio sigue consultando hasta ver la revancha (`siguiente`) o 15 min (openspec: revancha-partidas).
    if (sala.vista === 'final' && (sala.estado.sala.siguiente || Date.now() - sala.finT > REVANCHA_MS)) return parar();
    if (Date.now() - t0 > 60 * 60000 || (sala.estado.sala.inicio === null && Date.now() - t0 > 15 * 60000)) return parar('⏸️ La partida se pausó por inactividad. Vuelve a entrar con el código 🔑 ' + escapeHtml(codigo) + '.');
    consultando = true;
    traerSala().catch(() => ({ ok: false, status: 0, body: {} })).then(r => {
      consultando = false;
      if (detenido) return;
      if (!r.ok && [403, 404, 410].includes(r.status)) return parar(r.status === 410 ? '⌛ Esta partida ya terminó (vencen a las 3 horas).' : 'Esta partida ya no está disponible.');
      if (r.ok) { fallos = 0; avisoRed(false); pintarSala(); }
      else if (r.status === 0 || r.status === 429 || r.status >= 500) { fallos++; avisoRed(true); }
      else pintarSala();
      programarTick();
    });
  };
  const programarTick = () => { clearTimeout(tick); tick = setTimeout(ciclo, intervalo()); };
  programarTick();
  // Al volver a la pestaña se consulta enseguida (si no hay una consulta en vuelo).
  const alVolver = () => { if (!document.hidden && !detenido && !consultando) { clearTimeout(tick); ciclo(); } };
  document.addEventListener('visibilitychange', alVolver);
  // Al cambiar el estado del canal se reprograma el siguiente ciclo con el intervalo que corresponde.
  prepararVivo(codigo); // juegos-en-vivo: antes de conectar, para que el canal escuche también `vivo`
  limpiezas.push(() => { const t = sala.vivoTr; sala.vivoTr = null; if (t && t.cerrar) t.cerrar(); });
  if (sala.estado.rt) conectarRealtime(sala.estado.rt, codigo, () => { if (detenido) { return; } programarTick(); });
  const reloj = setInterval(() => pintarSala(), 250);
  limpiezas.push(() => { detenido = true; clearTimeout(tick); document.removeEventListener('visibilitychange', alVolver); }, () => clearInterval(reloj));
  app.innerHTML = '<div class="cat-' + escapeHtml(j.cat) + '"><div class="play-top"><button class="btn ghost sm" data-a="salir" aria-label="Salir">✕</button><span class="t">' + icoJuego(j) + ' ' + escapeHtml(j.t) + (sala.estado.sala.opciones.tema ? ' · ' + escapeHtml(InglesGramatica.nombreTema(sala.estado.sala.opciones.tema)) : '') + ' · partida</span>' +
    '<span class="stat" id="p-codigo-chip">🔑 ' + escapeHtml(codigo) + '</span></div><div class="bar" id="m-bar" hidden><span style="width:100%"></span></div>' +
    '<div id="p-red" class="muted" role="status" hidden style="text-align:center;font-size:.85rem;margin:6px 0">📶 Reconectando… tu partida sigue guardada.</div><div id="p-body"></div></div>';
  sala.vista = null;
  pintarSala();
}

function participantes() {
  const e = sala.estado;
  const humanos = e.jugadores.map(x => ({ id: x.id, nombre: x.nombre, tipo: x.tipo, avatar: x.avatar, respuestas: x.respuestas || {}, palabras: x.palabras, basta: x.basta, rondasBasta: x.rondasBasta || {}, loteria: x.loteria, ...(x.equipo === 0 || x.equipo === 1 ? { equipo: x.equipo } : {}) })); // futbolito-equipos: equipo pedido
  const comoBot = b => ({ id: b.id, nombre: b.nombre, tipo: 'bot', bot: b, avatar: b.avatar });
  // Mesas (openspec: mesas-con-bots, juegos/mesas.js): con asientos, los bots completan los lugares libres y cada
  // persona que entra quita un bot (Brisca: 3 personas + 1 bot); sin mesa, los bots se suman aparte.
  const mesa = Mesas.de(e.sala.juego, e.sala.opciones); // futbolito-equipos: mesa por formato
  const h = mesa ? humanos.slice(0, mesa.max) : humanos;
  const nb = Mesas.botsEnMesa(e.sala.juego, h.length, e.sala.bots, e.sala.opciones);
  if (nb !== null) return h.concat(BOTS.concat(BOT_EXTRA).slice(0, nb).map(comoBot));
  return e.sala.bots && !(mesa && mesa.bots === 'nunca') ? h.concat(BOTS.map(comoBot)) : h;
}

function pintarSala() {
  const e = sala.estado; if (!e) return;
  const body = document.getElementById('p-body'); if (!body) return;
  const s = e.sala;
  if (sala.vista === 'final') return finalSala(s); // el podio ya no se vuelve a dibujar (futbol-en-linea: solo su nota)
  if (s.inicio === null) return pintarEspera(body);
  if (s.juego.startsWith('basta')) return pintarBastaSala(body);
  if (s.juego === 'loteria') return pintarLoteriaSala(body);
  if (s.juego === 'una') return pintarUnaSala(body);
  if (s.juego === 'poker') return pintarPokerSala(body);
  if (s.juego === 'brisca' || s.juego === 'conquian') return pintarCartasSala(body, s.juego);
  if (s.juego === 'ajedrez') return pintarAjedrezSala(body);
  if (ClasicosRapidosUI.IDS.includes(s.juego)) return ClasicosRapidosUI.pintarSala(body); // clasicos-rapidos
  if (TableroUI.esSala(s.juego)) return TableroUI.pintarSala(body); // juegos-tablero
  if (ARCADE.has(s.juego)) return pintarArcadeOCopa(body); // karts-copa-en-sala
  if (SALAS_GRANDES[s.juego]) return SALAS_GRANDES[s.juego].pintar(body); // juegos-salas-grandes
  if (s.juego === 'cultura-linea') return pintarLineaSala(body); // cultura-conocimiento
  if (s.juego === 'futbol') return pintarFutbolSala(body); // futbol-en-linea
  if (FISICA.has(s.juego)) return pintarFisicaSala(body); // futbolito-billar
  return pintarPreguntaSala(body);
}

// basta-divertida-una-robo: categorías divertidas de la partida, visibles en la sala de espera.
function extrasEspera(s) {
  const ids = s.juego.startsWith('basta') ? Basta.extrasDe(s.opciones) : [];
  const ex = ((sala.contenido || {}).extras || []).filter(x => ids.includes(x.id));
  return ex.length ? '<p class="muted" id="p-extras" style="margin:8px 0">🎉 Categorías divertidas: <b>' + ex.map(x => escapeHtml(x.emoji + ' ' + x.titulo)).join(' · ') + '</b></p>' : '';
}
function pintarEspera(body) {
  const e = sala.estado;
  const lista = participantes();
  const html = '<div class="q-card"><div class="sub">Código de la partida</div><div class="letra" style="letter-spacing:.15em">' + escapeHtml(e.sala.codigo) + '</div>' +
    '<div class="sub">Compártelo en el Meet o por WhatsApp · entran desde 🎮 Juegos → 👥 Partidas</div>' +
    '<div class="p-share"><div id="p-qr" aria-label="Código QR de la partida"></div><div><div class="muted" style="word-break:break-all;font-size:.76rem" id="p-enlace">' + escapeHtml(enlaceSala(e.sala.codigo)) + '</div>' +
    '<div class="row-btns" style="margin-top:8px"><button class="btn ghost sm" data-p="compartir">📤 Compartir</button></div></div></div></div>' +
    extrasEspera(e.sala) + // basta-divertida-una-robo
    '<h2>👥 Jugadores (' + lista.length + ')</h2>' + (Mesas.de(e.sala.juego) ? '<p class="muted" id="p-mesa" style="margin:-4px 0 8px">🪑 ' + escapeHtml(Mesas.textoMesa(e.sala.juego, lista.filter(x => !x.bot).length, lista.filter(x => x.bot).length, e.sala.opciones)) + '</p>' : '') + equiposFutbolito(lista) /* futbolito-equipos */ + tacticaFutbol() /* futbol-en-linea */ + tarjetaPersonaje() /* personaje-en-salas */ + '<ol class="rank">' + lista.map(x => '<li>' + avatarHtml(x.avatar, 32) + '<span class="n">' + escapeHtml(x.nombre) +
      (x.id === e.sala.host ? ' <small>(anfitrión)</small>' : '') + (x.tipo === 'invitado' ? ' <small>(invitado)</small>' : '') + personajeEnLista(x) /* personaje-en-salas */ + '</span></li>').join('') + '</ol>' +
    '<div class="row-btns">' + (e.soyHost ? '<button class="btn" data-p="empezar">▶ Empezar partida</button>' : '<div class="muted" style="text-align:center;width:100%">Esperando a que el anfitrión empiece…</div>') + '</div>';
  // La clave cuenta personas y bots: en una mesa de 4, una persona nueva desplaza a un bot y la lista no cambia de largo.
  const clave = 'espera:' + lista.map(x => x.id + (x.equipo === undefined ? '' : '/' + x.equipo) + '@' + (personajeDeAsiento(x.id) || '')).join(',') + ':' + e.soyHost + ':' + (sala.personajeMio || '') + ':' + (sala.personajeMsg || ''); // futbolito-equipos: también el equipo pedido; personaje-en-salas: y el personaje
  if (sala.vista !== clave) { body.innerHTML = html; sala.vista = clave; pintarQr(document.getElementById('p-qr'), enlaceSala(e.sala.codigo)); }
  sincronizarPersonaje(); // personaje-en-salas: el asiento toma el personaje del navegador si aún no tiene
}

function totalesPreguntas(hasta) {
  const e = sala.estado; const s = e.sala;
  return participantes().map(p => {
    let total = 0, ultimo = 0;
    for (let q = 0; q <= hasta; q++) {
      const r = p.bot ? botPregunta(s.seed, p.bot, q, sala.contenido[q]) : p.respuestas[q];
      if (r) { total += r.puntos; if (q === hasta) ultimo = r.puntos; }
    }
    return { id: p.id, nombre: p.nombre, tipo: p.tipo, avatar: p.avatar, total, ultimo };
  }).sort((a, b) => b.total - a.total);
}

function marcadorHtml(filas, yo, max = 6) {
  const medallas = ['🥇', '🥈', '🥉']; // del 4.º lugar en adelante, el número
  return '<ol class="rank">' + filas.slice(0, max).map((f, i) => '<li class="' + (f.id === yo ? 'yo' : '') + '"><span class="pos">' + (medallas[i] || i + 1) + '</span>' +
    avatarHtml(f.avatar, 28) + '<span class="n">' + escapeHtml(f.nombre) + (f.tipo === 'bot' ? ' <small>🤖</small>' : '') + (f.ultimo ? ' <small>+' + f.ultimo + '</small>' : '') + '</span><span class="pts">⭐ ' + fmt(f.total) + '</span></li>').join('') + '</ol>';
}

function pintarPreguntaSala(body) {
  const e = sala.estado; const s = e.sala;
  const t = ahoraServidor() - s.inicio;
  const ciclo = dur(P_Q + P_REV);
  const bar = document.getElementById('m-bar');
  if (t < 0) { bar.hidden = true; const k = 'cuenta:' + Math.ceil(-t / 1000); if (sala.vista !== k) { body.innerHTML = '<div class="q-card"><div class="sub">¡Prepárate!</div><div class="letra">' + Math.ceil(-t / 1000) + '</div><div class="sub">' + participantes().length + ' jugadores</div></div>'; sala.vista = k; } return; }
  const q = Math.floor(t / ciclo);
  if (q >= P_N) return pintarFinalSala(body, totalesPreguntas(P_N - 1));
  const enQ = t - q * ciclo;
  const p = sala.contenido[q];
  const mia = (e.jugadores.find(x => x.id === e.yo) || { respuestas: {} }).respuestas[q] || sala.mias && sala.mias[q];
  if (enQ < dur(P_Q)) {
    bar.hidden = false; bar.firstChild.style.width = Math.max(0, 100 - enQ / dur(P_Q) * 100) + '%';
    const k = 'q:' + q + ':' + (mia ? 'r' : '');
    if (sala.vista !== k) {
      sala.vista = k;
      const opcionesHtml = () => '<div class="opts' + (p.opciones.some(o => String(o).length > 18) ? ' una-col' : '') + '">' + p.opciones.map((o, i) => '<button class="opt" data-pq="' + q + '" data-po="' + i + '"><span class="k">' + (i + 1) + '</span>' + escapeHtml(o) + '</button>').join('') + '</div>';
      body.innerHTML = '<div class="muted" style="text-align:center;margin-bottom:6px">Pregunta ' + (q + 1) + ' de ' + P_N + '</div><div class="q-card">' + (p.big ? '<div class="big">' + escapeHtml(p.big) + '</div>' : '') +
        '<div class="q">' + escapeHtml(p.q) + '</div>' + (p.sub ? '<div class="sub">' + escapeHtml(p.sub) + '</div>' : '') + '</div>' +
        (mia ? '<div class="feedback ok">✔ Respuesta enviada · esperando a los demás…</div>' : opcionesHtml());
      sala.inicioQ = s.inicio + q * ciclo;
    }
  } else {
    bar.hidden = true;
    const k = 'rev:' + q + ':' + e.jugadores.map(x => Object.keys(x.respuestas || {}).length).join(',');
    if (sala.vista !== k) {
      sala.vista = k;
      let feedback = '<div class="feedback bad">⏰ No respondiste</div>';
      if (mia) feedback = '<div class="feedback ' + (mia.correcta ? 'ok">✔ ¡Bien! +' + mia.puntos : 'bad">✘ Esta vez no') + '</div>';
      body.innerHTML = '<div class="q-card"><div class="q">' + escapeHtml(p.q) + '</div><div class="sub">Respuesta correcta: <b>' + escapeHtml(p.opciones[p.correcta]) + '</b></div>' +
        feedback +
        (p.dato ? '<div class="sub">💡 ' + escapeHtml(p.dato) + '</div>' : '') + '</div><h2>🏆 Marcador</h2>' + marcadorHtml(totalesPreguntas(q), e.yo);
    }
  }
}

async function responderSala(q, i) {
  const s = sala.estado.sala; const p = sala.contenido[q];
  if (sala.mias && sala.mias[q]) return;
  const ms = Math.max(0, ahoraServidor() - (s.inicio + q * dur(P_Q + P_REV)));
  if (ms > dur(P_Q)) return;
  const correcta = i === p.correcta;
  const puntos = correcta ? 100 + Math.round(100 * Math.max(0, 1 - ms / dur(P_Q))) : 0;
  sala.mias = sala.mias || {}; sala.mias[q] = { correcta, puntos, ms };
  correcta ? sonidoOk() : sonidoMal();
  sala.vista = null; pintarSala();
  await post('/juegos/sala/' + sala.codigo + '/respuesta', { q, correcta, puntos, ms: Math.round(ms / TIEMPO) });
}

// ---- Basta en sala por rondas (openspec: basta-rondas) ----
const rondasDeSala = () => Number(sala.estado.sala.opciones.rondas || 1);
const datosBasta = () => { // basta-divertida-una-robo: con las categorías divertidas de la sala (la revancha las hereda)
  const ids = Basta.extrasDe(sala.estado.sala.opciones), k = sala.estado.sala.juego + '|' + ids.join(',');
  if (!sala.bastaDatos || sala.bastaDatos.k !== k) sala.bastaDatos = { k, d: bastaConExtras(sala.contenido, sala.estado.sala.juego === 'basta-en' ? 'en' : 'es', ids) };
  return sala.bastaDatos.d;
};
// Letras sin repetir, iguales para todos (semilla de la sala).
function letrasBasta() {
  if (!sala.letrasBasta) sala.letrasBasta = barajar(datosBasta().letras, rngDe(sala.estado.sala.seed, 'letras')).slice(0, rondasDeSala());
  return sala.letrasBasta;
}
// Calendario: cierre_r = min(inicio_r + 60 s, primer ¡Basta! + 3 s); inicio_{r+1} = cierre_r + 10 s.
function calendarioBasta() {
  const e = sala.estado; const cal = []; let ini = e.sala.inicio;
  for (let r = 0; r < rondasDeSala(); r++) {
    const gritos = e.jugadores.map(x => ((x.rondasBasta || {})[r] || {}).basta).filter(t => t && t >= ini);
    const limite = ini + dur(P_BASTA);
    const cierre = gritos.length ? Math.min(limite, Math.min(...gritos) + dur(P_GRACIA)) : limite;
    cal.push({ ini, cierre });
    ini = cierre + dur(P_PAUSA);
  }
  return cal;
}
const palabrasForm = () => Object.fromEntries(datosBasta().categorias.map(c => [c.id, ((document.getElementById('pb-' + c.id) || {}).value || '').trim()]));
function enviarRonda(r, palabras) {
  sala.bastaEnviado[r] = true; sala.misRondas[r] = palabras;
  post('/juegos/sala/' + sala.codigo + '/respuesta', { ronda: r, palabras }).then(() => traerSala());
}
// Todos enviaron, o pasaron 6 s reales (el sondeo es cada 2.5 s; sin escalar en pruebas aceleradas).
const rondaLista = (r, cal) => sala.estado.jugadores.every(x => (x.rondasBasta || {})[r]) || ahoraServidor() > cal[r].cierre + 6000;
// Puntos de cada ronda (hasta la ronda `hasta`) y acumulado por participante.
function marcadorBasta(hasta) {
  const e = sala.estado, d = datosBasta(), letras = letrasBasta();
  const ps = participantes();
  const acum = Object.fromEntries(ps.map(p => [p.id, { id: p.id, nombre: p.nombre, tipo: p.bot ? 'bot' : '', avatar: p.avatar, total: 0, ultimo: 0, porRonda: [], aciertos: 0, detalle: {} }]));
  // Palabras de la ronda r: las del bot, las mías recién enviadas o las que tiene el servidor.
  const palabrasDe = (p, r) => {
    if (p.bot) return botBasta(e.sala.seed, p.bot, letras[r], d, r);
    if (p.id === e.yo && sala.misRondas[r]) return sala.misRondas[r];
    return ((p.rondasBasta || {})[r] || {}).palabras || {};
  };
  for (let r = 0; r <= hasta; r++) {
    const parts = ps.map(p => ({ id: p.id, nombre: p.nombre, palabras: palabrasDe(p, r) }));
    for (const x of puntuarBasta(d, letras[r], parts)) {
      const a = acum[x.id]; a.total += x.total; a.ultimo = x.total; a.porRonda[r] = x.total; a.detalle = x.detalle;
      a.aciertos += Object.values(x.detalle).filter(y => y.pts > 0).length;
    }
  }
  return Object.values(acum).sort((a, b) => b.total - a.total);
}

function pintarBastaSala(body) {
  const e = sala.estado; const s = e.sala;
  const idioma = s.juego === 'basta-en' ? 'en' : 'es';
  const d = datosBasta(), letras = letrasBasta(), n = rondasDeSala();
  const ahora = ahoraServidor();
  const bar = document.getElementById('m-bar');
  if (ahora < s.inicio) { bar.hidden = true; const k = 'cuenta:' + Math.ceil((s.inicio - ahora) / 1000); if (sala.vista !== k) { body.innerHTML = '<div class="q-card"><div class="sub">¡Prepárate! · ' + n + (n === 1 ? ' ronda' : ' rondas') + '</div><div class="letra">' + Math.ceil((s.inicio - ahora) / 1000) + '</div></div>'; sala.vista = k; } return; }
  const cal = calendarioBasta();
  // Al cerrar cada ronda, enviar mis palabras una sola vez (antes de redibujar el formulario).
  // Tras recargar, las rondas que el servidor ya tiene no se reenvían vacías (openspec: juegos-recarga).
  const yaEnviadas = (e.jugadores.find(x => x.id === e.yo) || {}).rondasBasta || {};
  for (let r = 0; r < n; r++) if (ahora >= cal[r].cierre && !sala.bastaEnviado[r] && !yaEnviadas[r]) enviarRonda(r, sala.vista === 'basta' + r ? palabrasForm() : {});
  const r = cal.findIndex(c => ahora < c.cierre + dur(P_PAUSA));
  const ultima = n - 1;
  if (r === -1 || (ahora >= cal[ultima].cierre && rondaLista(ultima, cal))) {
    const filas = marcadorBasta(ultima);
    const mio = filas.find(f => f.id === e.yo);
    if (mio) { sala.finAciertos = mio.aciertos; sala.finTotal = d.categorias.length * n; }
    return pintarFinalSala(body, filas, { d, letras, porRonda: true });
  }
  sala.rondaActual = r;
  const cab = '<div class="sub">' + (idioma === 'en' ? 'Round ' : 'Ronda ') + (r + 1) + (idioma === 'en' ? ' of ' : ' de ') + n + ' · ' + (idioma === 'en' ? 'Letter' : 'Letra') + '</div><div class="letra">' + escapeHtml(letras[r]) + '</div>';
  // Ronda abierta: formulario con la letra y aviso de quién gritó ¡Basta!
  const pintarEscritura = () => {
    bar.hidden = false; bar.firstChild.style.width = Math.max(0, (cal[r].cierre - ahora) / dur(P_BASTA) * 100) + '%';
    if (sala.vista !== 'basta' + r) {
      sala.vista = 'basta' + r;
      body.innerHTML = '<div class="q-card">' + cab + '<div class="sub" id="pb-aviso">Todos tienen la misma letra</div></div>' +
        '<form id="pb-form" autocomplete="off" class="basta-grid">' + d.categorias.map(c => '<label for="pb-' + c.id + '">' + escapeHtml(c.emoji + ' ' + c.titulo) + '</label><input id="pb-' + c.id + '" data-pbcat="' + c.id + '" type="text" maxlength="40" autocapitalize="off" spellcheck="false" placeholder="' + escapeHtml(letras[r]) + '…">').join('') +
        '<div class="row-btns" style="grid-column:1/-1"><button class="btn" type="submit" id="pb-basta" disabled>✋ ¡Basta!</button></div></form>';
      const primero = document.getElementById('pb-' + d.categorias[0].id); if (primero && r > 0) primero.focus();
    }
    if (sala.emoBasta !== r && cal[r].cierre - ahora <= 5000 * TIEMPO) { sala.emoBasta = r; window.Emocion?.ultimoSegundos(Math.max(1, Math.ceil((cal[r].cierre - ahora) / 1000 / TIEMPO))); } // emocion-sonora
    const gritador = e.jugadores.filter(x => ((x.rondasBasta || {})[r] || {}).basta).sort((a, b) => a.rondasBasta[r].basta - b.rondasBasta[r].basta)[0];
    if (gritador) { const a = document.getElementById('pb-aviso'); if (a) { a.textContent = '✋ ¡' + gritador.nombre + ' gritó BASTA! Cierra en ' + Math.max(0, Math.ceil((cal[r].cierre - ahora) / 1000 / TIEMPO)) + ' s'; a.style.color = 'var(--bad)'; } }
  };
  // Pausa: resultados de la ronda y marcador acumulado; luego sigue sola la siguiente letra.
  const pintarPausa = () => {
    bar.hidden = false; bar.firstChild.style.width = Math.max(0, (cal[r].cierre + dur(P_PAUSA) - ahora) / dur(P_PAUSA) * 100) + '%';
    const lista = rondaLista(r, cal);
    if (sala.emoPausa !== r) { sala.emoPausa = r; window.Emocion?.revelacion(); } // emocion-sonora: fin de la ronda
    const k = 'res' + r + ':' + (lista ? e.jugadores.filter(x => (x.rondasBasta || {})[r]).length : 'esperando');
    if (sala.vista !== k) {
      sala.vista = k;
      if (!lista) { body.innerHTML = '<div class="q-card">' + cab + '<div class="big">✋</div><div class="sub">Juntando las palabras de todos…</div></div>'; }
      else {
        const filas = marcadorBasta(r);
        const mio = filas.find(f => f.id === e.yo);
        body.innerHTML = '<div class="q-card">' + cab + '<div class="sub">' + (mio ? '+' + mio.ultimo + ' en esta ronda' : '') + ' · <span id="pb-sig"></span></div></div>' +
          (mio ? '<div class="scroll-x"><table class="inv basta-res"><thead><tr><th>Categoría</th><th>Tu palabra</th><th></th><th>Pts</th></tr></thead><tbody>' +
            d.categorias.map(c => { const x = mio.detalle[c.id]; return '<tr><td>' + escapeHtml(c.emoji + ' ' + c.titulo) + '</td><td><b>' + escapeHtml(x.palabra || '—') + '</b></td><td>' + escapeHtml(x.estado) + '</td><td>' + x.pts + '</td></tr>'; }).join('') + '</tbody></table></div>' : '') +
          '<h2>📊 Marcador acumulado</h2>' + marcadorHtml(filas, e.yo, 28);
      }
    }
    const sig = document.getElementById('pb-sig');
    if (sig) sig.textContent = 'Siguiente letra en ' + Math.max(0, Math.ceil((cal[r].cierre + dur(P_PAUSA) - ahora) / 1000 / TIEMPO)) + ' s';
  };
  if (ahora < cal[r].cierre) pintarEscritura();
  else pintarPausa();
}

// karts-salida-y-puntos: en una carrera suelta los puntos los calcula el servidor; si todavía no tiene el tiempo de
// alguien (409 carrera_en_curso), se vuelve a pedir cada 2.5 s (hasta 8 veces) sin cambiar nada más.
async function guardarPartidaSala(datos) {
  let r = await post('/juegos/partida', datos);
  for (let i = 0; i < 8 && r.status === 409 && r.body && r.body.error === 'carrera_en_curso'; i++) {
    await new Promise(ok => setTimeout(ok, 2500)); // NOSONAR: espera entre reintentos, en orden
    r = await post('/juegos/partida', datos); // NOSONAR: un reintento a la vez
  }
  return r;
}
function pintarFinalSala(body, todas, basta, titulo) {
  if (sala.vista === 'final') return;
  sala.vista = 'final';
  olvidarSala(); // terminó: recargar ya no vuelve a la sala
  sala.finT = Date.now(); escribirLocal(REVANCHA_KEY, { codigo: sala.codigo, quien: state.jugador && state.jugador.id, t: sala.finT }); // pero sí ofrece la revancha
  const filas = todas.map(f => ({ ...f, ultimo: 0 })); // en el podio no se muestra el +puntos de la última pregunta
  document.getElementById('m-bar').hidden = true;
  const e = sala.estado; const juego = e.sala.juego;
  const mio = filas.find(f => f.id === e.yo);
  let detalle = ''; // Basta: mis puntos por ronda o, en una sola ronda, por categoría
  if (basta && basta.porRonda && mio) detalle = '<h2>🔤 Tus puntos por ronda</h2><div class="scroll-x"><table class="inv basta-res"><thead><tr><th>Ronda</th><th>Letra</th><th>Pts</th></tr></thead><tbody>' +
    basta.letras.map((l, i) => '<tr><td>' + (i + 1) + '</td><td><b>' + escapeHtml(l) + '</b></td><td>' + (mio.porRonda[i] || 0) + '</td></tr>').join('') + '</tbody></table></div>';
  else if (basta && mio) detalle = '<div class="scroll-x"><table class="inv basta-res"><thead><tr><th>Categoría</th><th>Tu palabra</th><th></th><th>Pts</th></tr></thead><tbody>' +
    basta.d.categorias.map(c => { const x = mio.detalle[c.id]; return '<tr><td>' + escapeHtml(c.emoji + ' ' + c.titulo) + '</td><td><b>' + escapeHtml(x.palabra || '—') + '</b></td><td>' + escapeHtml(x.estado) + '</td><td>' + x.pts + '</td></tr>'; }).join('') + '</tbody></table></div>';
  body.innerHTML = '<div class="card result"><div style="font-size:2.4rem">🏆</div><h1>' + escapeHtml(titulo || '¡Fin de la partida!') + '</h1>' +
    (mio ? '<div class="score">' + fmt(mio.total) + '</div><div class="muted">tus puntos · lugar ' + (filas.indexOf(mio) + 1) + ' de ' + filas.length + '</div>' : '') +
    '<div id="p-guardado" class="muted" style="margin-top:8px"></div><div id="p-revancha"></div></div><h2>🥇 Podio</h2><div class="podio-suspenso">' + marcadorHtml(filas, e.yo, 30) + '</div>' + detalle + resumenFallosSala(sala, P_N) +
    '<div class="row-btns"><button class="btn ghost" data-a="hub">🎮 Otros juegos</button><button class="btn ghost" data-tab="partidas">👥 Otra partida</button></div>';
  pintarRevancha();
  window.Emocion?.podio(mio ? filas.indexOf(mio) + 1 : 0); // emocion-sonora: redoble, revelación y tu lugar
  if (mio && mio.total > 0) confeti();
  if (mio && !sala.guardado) {
    sala.guardado = true;
    // Registro de la partida para el admin: total final de cada quien y, del anfitrión, el podio con bots.
    post('/juegos/sala/' + sala.codigo + '/respuesta', { final: mio.total, ...(e.soyHost ? { podio: filas.map(f => ({ nombre: f.nombre, total: f.total, ...(f.tipo === 'bot' ? { bot: true } : {}) })) } : {}) });
    // Total de la partida y mis aciertos: los que dejó el juego o, si no, según el tipo (Basta, Lotería o preguntas).
    const totalFinal = () => {
      if (sala.finTotal !== undefined) return sala.finTotal;
      if (basta) return basta.d.categorias.length;
      return juego === 'loteria' ? 16 : P_N;
    };
    const aciertosFinal = () => {
      if (sala.finAciertos !== undefined) return sala.finAciertos;
      if (juego === 'loteria') return sala.aciertosLoteria || 0;
      if (basta) return Object.values(mio.detalle).filter(x => x.pts > 0).length;
      return Object.values((e.jugadores.find(x => x.id === e.yo) || {}).respuestas || {}).filter(x => x.correcta).length;
    };
    const n = totalFinal();
    const aciertos = aciertosFinal();
    guardarPartidaSala({ juego, puntos: mio.total, aciertos, total: n, segundos: 0, sala: sala.codigo }).then(r => {
      const g = document.getElementById('p-guardado');
      if (r.ok) { state.totalIndividual = r.body.totalIndividual; state.totalPartidas = r.body.totalPartidas; state.posPartidas = r.body.pos; state.mejores[juego] = r.body.mejor; pintarChip(); if (g) g.textContent = '✔ +' + fmt(r.body.puntos) + ' a tus puntos de partidas · 👥 ' + fmt(r.body.totalPartidas) + ' en la semana (#' + r.body.pos + ')'; }
      else if (g && r.body.error === 'ya_guardada') g.textContent = '✔ Esta partida ya estaba guardada en tus puntos de partidas';
      else if (g) g.textContent = 'No se guardó en el ranking (' + (r.body.error || r.status) + ')';
    });
  }
}

// ---- Revancha (openspec: revancha-partidas) ----
// Quien la abrió: su nombre en la sala vieja (por siguienteHost).
const abrioRevancha = est => ((est.jugadores || []).find(j => j.id === est.sala.siguienteHost) || {}).nombre || 'Alguien';
const TXT_REVANCHA = { conflicto_escritura: 'No se pudo entrar a la revancha, intenta de nuevo.', ya_empezo: 'La revancha ya empezó. Crea otra partida en 👥 Partidas.', sala_llena: 'La revancha ya está llena.', sala_vencida: 'Esta partida ya venció.', no_termino: 'La partida todavía no termina.', no_en_sala: 'No jugaste en esta partida.' };
// Podio: «Otra con los mismos» o, si alguien ya la abrió, «{Nombre} abrió la revancha · Unirme». Solo redibuja si cambia.
function pintarRevancha() {
  const el = document.getElementById('p-revancha'); const e = sala.estado; if (!el || !e) return;
  const sig = e.sala.siguiente || '';
  const k = sig + '|' + (sala.revMsg || '') + '|' + !!sala.revEnviando;
  if (el.dataset.k === k) return;
  if (sig && el.dataset.k && !el.dataset.k.startsWith(sig + '|')) window.Emocion?.revancha(); // emocion-sonora: alguien abrió la revancha
  el.dataset.k = k;
  el.innerHTML = (sig ? '<div class="revancha-aviso" role="status">🔁 ' + escapeHtml(abrioRevancha(e)) + ' abrió la revancha</div>' : '') +
    '<div class="row-btns"><button class="btn" data-p="revancha"' + (sala.revEnviando ? ' disabled' : '') + '>' + (sig ? '🔁 Unirme' : '🔁 Otra con los mismos') + '</button></div>' +
    (sala.revMsg ? '<div class="alert">' + escapeHtml(sala.revMsg) + '</div>' : '');
}
// Abre la revancha o se une a la que ya existe (la ruta es idempotente) y entra a su sala de espera.
async function pedirRevancha(codigo) {
  const r = await post('/juegos/sala/' + codigo + '/revancha', {});
  if (r.ok) { olvidarRevancha(); entrarSala(r.body.codigo); return null; }
  return TXT_REVANCHA[r.body.error] || ('No se pudo abrir la revancha (' + (r.body.error || r.status) + ').');
}
async function revanchaDesdePodio() {
  if (sala.revEnviando) return;
  sala.revEnviando = true; sala.revMsg = ''; pintarRevancha();
  const msg = await pedirRevancha(sala.codigo);
  if (msg === null) return;
  sala.revEnviando = false; sala.revMsg = msg; pintarRevancha();
}
// Tras recargar en el podio: el inicio de Juegos con la tarjeta de revancha arriba (si la sala vieja responde).
async function ofrecerRevancha(codigo) {
  const r = await api('/juegos/sala/' + codigo);
  if (state.pidiendoSesion) return;
  pantallaHub();
  if (!r.ok) return olvidarRevancha();
  const j = juegoPorId(r.body.sala.juego);
  const sig = r.body.sala.siguiente;
  const tabs = app.querySelector('.tabs'); if (!tabs) return;
  tabs.insertAdjacentHTML('beforebegin', '<div class="card" id="revancha-inicio" style="margin-bottom:12px;text-align:center"><div class="revancha-aviso" role="status">' +
    (sig ? '🔁 ' + escapeHtml(abrioRevancha(r.body)) + ' abrió la revancha de ' : '🏁 Terminó tu partida de ') + escapeHtml(j.emoji + ' ' + j.t) + (sig ? '' : '. ¿Otra con los mismos?') + '</div>' +
    '<div class="row-btns"><button class="btn ghost" data-a="revancha-no">No, gracias</button><button class="btn" data-a="revancha-inicio" data-codigo="' + escapeHtml(codigo) + '">' + (sig ? '🔁 Unirme' : '🔁 Otra con los mismos') + '</button></div><div id="revancha-msg"></div></div>');
}

// errores-latentes: errores pasajeros al guardar la sala (503); se pide intentar de nuevo.
const NO_GUARDO = new Set(['conflicto_escritura', 'sin_codigo']);
async function crearPartida() {
  const juego = document.getElementById('p-juego').value;
  const valor = id => document.getElementById(id).value;
  // Opciones del formulario que aplican al juego elegido.
  const opcionesDelJuego = () => {
    if (juego === 'en-frases') return { tema: valor('p-tema') };
    if (juego === 'cultura') return { cat: valor('p-cat') };
    if (juego === 'cultura-linea') return { cat: valor('p-ltema') };
    if (juego === 'loteria') return { modo: valor('p-modo') };
    if (juego.startsWith('basta')) return { rondas: valor('p-rondas'), extra: [...document.querySelectorAll('[data-pextra]:checked')].map(x => x.dataset.pextra) };
    if (juego === 'poker') return document.getElementById('p-equipos').checked ? { equipos: '1' } : {};
    if (juego === 'ajedrez') return { reloj: valor('p-reloj') };
    if (juego === 'karts' && valor('p-kformato').startsWith('copa:')) return { modo: 'copa', copa: valor('p-kformato').slice(5) }; // karts-copa-en-sala
    return ARCADE.has(juego) && valor('p-mapa') ? { mapa: valor('p-mapa') } : {};
  };
  const opciones = opcionesDelJuego();
  Object.assign(opciones, ClasicosRapidosUI.opcionesCrear(juego)); // clasicos-rapidos: modo del Ahorcado
  Object.assign(opciones, SalasGrandes.opciones(juego)); // juegos-salas-grandes
  if (juego === 'futbolito') opciones.formato = document.getElementById('p-formato').value; // futbolito-equipos
  const r = await post('/juegos/sala', { juego, opciones, bots: document.getElementById('p-bots').checked });
  if (!r.ok) { document.getElementById('p-msg').innerHTML = '<div class="alert">' + escapeHtml(NO_GUARDO.has(r.body.error) ? 'No se pudo crear la partida, intenta de nuevo.' : 'No se pudo crear (' + (r.body.error || r.status) + ').') + '</div>'; return; }
  entrarSala(r.body.codigo);
}

async function unirsePartida() {
  const codigo = document.getElementById('p-codigo').value.trim().toUpperCase();
  if (!/^[A-Z]{4}$/.test(codigo)) { document.getElementById('p-msg').innerHTML = '<div class="alert">El código tiene 4 letras.</div>'; return; }
  unirseCodigo(codigo);
}

// ---- Volver tras recargar (openspec: juegos-recarga) ----
// Sala guardada sin ?sala= en la URL: solo entra si el servidor confirma que sigue dentro (GET, nunca unirse).
async function volverASala(codigo) {
  app.innerHTML = '<div class="loading">Volviendo a tu partida ' + escapeHtml(codigo) + '…</div>';
  const r = await api('/juegos/sala/' + codigo);
  if (state.pidiendoSesion) return;
  if (!r.ok) { olvidarSala(); return pantallaHub(); }
  return entrarSala(codigo);
}
// Juegos individuales que se reanudan y cómo volver a lanzarlos con su instantánea; los demás solo avisan.
const REANUDAR = {
  'en-vocab': () => jugarVocab(), 'en-frases': p => jugarFrasesTema(p.tema), 'en-tiempos': () => jugarTiempos(), 'es-ortografia': () => jugarOrtografia(), 'mente-calculo': () => jugarCalculo(),
  cultura: async p => jugarCultura(await datos('cultura'), typeof p.cat === 'string' ? p.cat : 'todas'),
  'mente-sudoku': p => jugarSudoku(SUDOKU_NIVELES[p.nivel] ? p.nivel : 'facil'),
};
function pantallaReanudar(p) {
  const j = juegoPorId(p.juego);
  app.innerHTML = '<div class="card result" id="reanudar"><div style="font-size:2.4rem">' + icoJuego(j) + '</div><h1>¿Continuar tu partida de ' + escapeHtml(j.t) + '?</h1>' +
    '<p class="muted">Se recargó la página a mitad del juego. Puedes seguir donde ibas.</p><div class="pills">' +
    (p.puntos ? '<span class="stat">⭐ ' + fmt(p.puntos) + '</span>' : '') + (p.total ? '<span class="stat">✅ ' + fmt(p.aciertos) + ' de ' + fmt(p.total) + '</span>' : '') +
    (p.faltan ? '<span class="stat">🔢 Faltan ' + fmt(p.faltan) + ' casillas</span>' : '') + '</div>' +
    '<div class="row-btns"><button class="btn ghost" data-a="hub">No, ir a los juegos</button><button class="btn" data-a="reanudar">▶️ Continuar</button></div></div>';
}
function reanudarPartida() {
  const p = partidaGuardada(); if (!p) return pantallaHub();
  reanudacion = p; app.innerHTML = '<div class="loading">Preparando…</div>';
  return Promise.resolve(REANUDAR[p.juego](p)).catch(err => { app.innerHTML = '<div class="alert">No se pudo cargar el juego (' + escapeHtml(err.message) + ').</div>'; });
}

async function unirseCodigo(codigo) {
  const r = await post('/juegos/sala/' + codigo + '/unirse', {});
  if (!r.ok) {
    const txt = { conflicto_escritura: 'No se pudo entrar a la sala, intenta de nuevo.', sala_no_existe: 'No existe una partida con ese código.', ya_empezo: 'Esa partida ya empezó.', sala_llena: 'La partida está llena.', sala_vencida: 'La partida ya venció.' }[r.body.error] || ('Error ' + (r.body.error || r.status));
    if (!document.getElementById('p-msg')) pantallaHub('partidas');
    document.getElementById('p-msg').innerHTML = '<div class="alert">' + escapeHtml(txt) + '</div>'; return;
  }
  entrarSala(codigo);
}

const enlaceSala = codigo => location.origin + location.pathname + '?sala=' + codigo + (API_PARAM ? '&api=' + encodeURIComponent(API_PARAM) : '');
let qrLib = null;
function pintarQr(el, texto) {
  qrLib = qrLib || new Promise((ok, fail) => { const sc = document.createElement('script'); sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js'; sc.onload = ok; sc.onerror = fail; document.head.appendChild(sc); });
  qrLib.then(() => { if (el.isConnected && !el.childNodes.length) new QRCode(el, { text: texto, width: 150, height: 150, correctLevel: QRCode.CorrectLevel.M }); }).catch(() => { el.textContent = ''; });
}
async function compartirSala(btn) {
  const url = enlaceSala(sala.codigo);
  const j = juegoPorId(sala.estado.sala.juego);
  const texto = '🎮 ¡Juega conmigo ' + j.t + '! Entra con este enlace (código ' + sala.codigo + '):';
  if (navigator.share) { try { await navigator.share({ title: 'Partida ' + sala.codigo, text: texto, url }); return; } catch (e) { /* cancelado: copiar */ } }
  try { await navigator.clipboard.writeText(texto + ' ' + url); btn.textContent = '✔ ¡Enlace copiado!'; } catch { /* sin permiso de portapapeles */ btn.textContent = 'Copia el enlace de arriba'; }
  setTimeout(() => { if (btn.isConnected) btn.textContent = '📤 Compartir'; }, 2500);
}
