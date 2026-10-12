// Juegos · núcleo (openspec: organizar-codigo).
// Configuración del backend (?api=, ?sala=), estado global (state), recarga del navegador,
// utilidades (escapeHtml, barajar…), api/post/datos, sonido y voz.
// Script clásico (sin build ni módulos ES): juegos.html lo carga en orden y todos comparten el ámbito global
// (const/let/function de nivel superior). Ver docs/frontend-standards.md, «Estructura de juegos/app/».
// Backend en Deno Deploy (ver docs/deno-deploy-setup.md). `?api=` para probar contra un servidor local.
const DEFAULT_API = 'https://stald.jalducin.deno.net';
const API_PARAM = new URLSearchParams(location.search).get('api');
const API_BASE = (API_PARAM || DEFAULT_API).replace(/\/$/, '');
const SESSION_KEYS = ['stald_email', 'ingles_email', 'secundaria_email'];
if (API_PARAM) document.querySelector('.home-link').href = './?api=' + encodeURIComponent(API_PARAM);
// Enlace de partida: juegos.html?sala=KXQP entra (o registra al invitado) y se une solo.
const SALA_URL = (new URLSearchParams(location.search).get('sala') || '').trim().toUpperCase();
let salaPendiente = /^[A-Z]{4}$/.test(SALA_URL) ? SALA_URL : null;
let abrirAvatar = new URLSearchParams(location.search).get('avatar') === '1';
// Registro de Juegos en 2 pasos (openspec: registro-juegos-boton): apodo y aviso primero, luego el correo. El
// apodo espera en este navegador (sin correo) hasta que el enlace confirma la sesión.
let abrirRegistro = new URLSearchParams(location.search).get('registro') === '1';
const REGISTRO_KEY = 'juegos_registro';
const registroPendiente = () => { try { const r = JSON.parse(localStorage.getItem(REGISTRO_KEY) || 'null'); return r && r.apodo && r.acepto === true ? r : null; } catch { /* registro ilegible o sin almacenamiento: no hay pendiente */ return null; } };
const borrarRegistro = () => { try { localStorage.removeItem(REGISTRO_KEY); } catch (e) { /* sin almacenamiento */ } };

const app = document.getElementById('app');
const chip = document.getElementById('chip');
// Puntos por tipo (openspec: puntos-por-tipo): ⭐ individuales y 👥 partidas; todo suma.
const state = { email: null, jugador: null, totalIndividual: 0, totalPartidas: 0, pos: null, posPartidas: null, mejores: {}, semana: null, tab: 'juegos', rtipo: 'individual' };
let limpiezas = []; // timers del juego en curso
// Al dejar un juego (terminar, salir, empezar otro): detiene timers y descarta la partida individual guardada.
function limpiar() { limpiezas.forEach(f => { try { f(); } catch (e) { /* ya detenido */ } }); limpiezas = []; if (window.speechSynthesis) { speechSynthesis.cancel(); } soltarPartida(); modoPartida(false); }

// ---------- Recarga del navegador (openspec: juegos-recarga) ----------
// Sala activa: la URL lleva ?sala= y localStorage.juegos_sala_activa = { codigo, quien, t, marcas? }. Juego
// individual: localStorage.juegos_partida_individual = { juego, quien, t, ...instantánea }. `quien` es el id opaco del
// jugador (nunca el correo); ambas caducan a las 3 h (vigencia de las salas).
const SALA_KEY = 'juegos_sala_activa', PARTIDA_KEY = 'juegos_partida_individual', RECARGA_MS = 3 * 3600 * 1000;
const leerLocal = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
const escribirLocal = (k, v) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } };
const vigente = x => !!x && !!state.jugador && x.quien === state.jugador.id && Math.abs(Date.now() - Number(x.t)) < RECARGA_MS;
const numEntre = (x, max) => Math.max(0, Math.min(max, Math.round(Number(x) || 0)));
const modoPartida = on => document.documentElement.classList.toggle('jugando', !!on);
function urlConSala(codigo) { const u = new URL(location.href); if (codigo) u.searchParams.set('sala', codigo); else { u.searchParams.delete('sala'); } return u.pathname + u.search + u.hash; }
function recordarSala(codigo, extra) {
  const previa = leerLocal(SALA_KEY);
  escribirLocal(SALA_KEY, { ...(previa && previa.codigo === codigo ? previa : {}), ...extra, codigo, quien: state.jugador && state.jugador.id, t: Date.now() });
}
function olvidarSala() {
  escribirLocal(SALA_KEY, null);
  if (new URLSearchParams(location.search).has('sala')) { try { history.replaceState(history.state, '', urlConSala(null)); } catch (e) { /* sin historial */ } }
}
const salaGuardada = () => { const s = leerLocal(SALA_KEY); return vigente(s) && /^[A-Z]{4}$/.test(s.codigo) ? s : null; };
// Revancha (openspec: revancha-partidas): al llegar al podio queda juegos_revancha = { codigo, quien, t } por 15 min,
// para ofrecer «Otra con los mismos» si se recarga en el podio. El podio consulta la sala vieja ese mismo tiempo.
const REVANCHA_KEY = 'juegos_revancha', REVANCHA_MS = 15 * 60000;
const revanchaGuardada = () => { const r = leerLocal(REVANCHA_KEY); return vigente(r) && Date.now() - Number(r.t) < REVANCHA_MS && /^[A-Z]{4}$/.test(r.codigo) ? r : null; };
const olvidarRevancha = () => escribirLocal(REVANCHA_KEY, null);

// Juego individual en curso: { id, foto? }. `foto()` (solo en los que se reanudan) devuelve su instantánea o null.
let enCurso = null, reanudacion = null;
function guardarPartida() {
  if (!enCurso || !enCurso.foto || !state.jugador) return;
  const f = enCurso.foto();
  escribirLocal(PARTIDA_KEY, f ? ({ ...f, juego: enCurso.id, quien: state.jugador.id, t: Date.now() }) : null);
}
function soltarPartida() { enCurso = null; escribirLocal(PARTIDA_KEY, null); }
const partidaGuardada = () => { const p = leerLocal(PARTIDA_KEY); return vigente(p) && Object.hasOwn(REANUDAR, p.juego) ? p : null; };
// La instantánea que se va a reanudar: una sola vez y solo para su juego.
function tomarReanudacion(id) { const r = reanudacion && reanudacion.juego === id ? reanudacion : null; reanudacion = null; return r; }
window.addEventListener('pagehide', guardarPartida);
document.addEventListener('visibilitychange', () => { if (document.hidden) guardarPartida(); });
// Los juegos que no se reanudan piden confirmación antes de recargar o salir.
window.addEventListener('beforeunload', e => { if (enCurso && !enCurso.foto) { e.preventDefault(); e.returnValue = ''; } });

function escapeHtml(s) {
  return String(s == null ? '' : s).replaceAll(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
const fmt = n => Number(n || 0).toLocaleString('es-MX');
const barajar = (a, rnd = Math.random) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const tomar = (a, n, rnd = Math.random) => barajar(a, rnd).slice(0, n);
const sinAcentos = s => String(s).normalize('NFD').replaceAll(/[̀-ͯ]/g, '');

// Cada petición lleva la sesión (Authorization: Bearer, comun/auth.js; openspec: plataforma-login). Sin sesión, durante
// la transición, se manda el correo guardado de antes como ?email=. Un 401 de sesión lleva a la pantalla de entrada.
// Sale por StaldAuth.pedirJson (openspec: cache-estabilidad): junta GET iguales en vuelo, guarda los que piden
// `cfg.ttl`, reintenta lecturas ante fallas pasajeras y, sin red, responde status 0 en lugar de lanzar.
async function api(ruta, opts, cfg) {
  const url = API_BASE + (StaldAuth.email() ? ruta : ruta + (ruta.includes('?') ? '&' : '?') + 'email=' + encodeURIComponent(state.email));
  const { ok, status, body } = await StaldAuth.pedirJson(url, opts, cfg);
  const res = { ok, status };
  if (StaldAuth.esSesionVencida(res, body) && !state.pidiendoSesion) {
    state.pidiendoSesion = true;
    const eraViejo = !StaldAuth.email();
    StaldAuth.salir().then(() => pantallaLogin(eraViejo ? '🔒 Por seguridad, vuelve a entrar con tu correo.' : 'Tu sesión terminó. Vuelve a entrar con tu correo.'));
  }
  return { ok, status, body };
}
const post = (ruta, datos) => api(ruta, { method: 'POST', headers: { 'content-type': 'text/plain;charset=UTF-8' }, body: JSON.stringify(datos) });

const cacheDatos = {};
async function datos(nombre) {
  // Si la descarga falla, se olvida la promesa para reintentar la próxima vez (openspec: cache-estabilidad).
  if (!cacheDatos[nombre]) cacheDatos[nombre] = fetch('juegos/datos/' + nombre + '.json').then(r => { if (!r.ok) { throw new Error('datos ' + nombre); } return r.json(); })
    .catch(e => { delete cacheDatos[nombre]; throw e; });
  return cacheDatos[nombre];
}

// ---------- Sonido (WebAudio, sin archivos) ----------
let audioCtx = null;
function tono(freq, ms = 120, tipo = 'sine', vol = .08) {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = tipo; o.frequency.value = freq; g.gain.value = vol;
    o.connect(g); g.connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime + ms / 1000);
  } catch (e) { /* sin audio */ }
}
const sonidoOk = () => { tono(660, 90); setTimeout(() => tono(880, 120), 90); };
const sonidoMal = () => tono(180, 220, 'square', .05);

function hablar(texto, lang = 'en-US', rate = .9) {
  if (!window.speechSynthesis) return false;
  if (typeof bajarMusica === 'function') bajarMusica();
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(texto);
  u.lang = lang; u.rate = rate;
  const v = speechSynthesis.getVoices().find(x => x.lang && x.lang.toLowerCase().startsWith(lang.slice(0, 2).toLowerCase()));
  if (v) u.voice = v;
  speechSynthesis.speak(u);
  return true;
}
