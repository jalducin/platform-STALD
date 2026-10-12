// Juegos · música (openspec: organizar-codigo).
// Música de fondo generada con WebAudio, su menú y el botón del avatar.
// Script clásico (sin build ni módulos ES): juegos.html lo carga en orden y todos comparten el ámbito global
// (const/let/function de nivel superior). Ver docs/frontend-standards.md, «Estructura de juegos/app/».
// ---------- Música de fondo generada (WebAudio, sin archivos ni derechos) ----------
const ESTILOS_MUSICA = {
  alegre: { nombre: '🎵 Alegre', bpm: 118 },
  relajante: { nombre: '😌 Relajante', bpm: 72 },
  fiesta: { nombre: '🎉 Fiesta', bpm: 126 },
};
const PROG = [[0, 4, 7], [7, 11, 14], [9, 12, 16], [5, 9, 12]]; // I–V–vi–IV (semitonos sobre Do)
const hz = st => 261.63 * Math.pow(2, st / 12);
const musica = { estilo: null, volumen: 'bajo', ctx: null, master: null, timer: null, paso: 0, siguiente: 0 };

function leerPrefMusica() { try { return JSON.parse(localStorage.getItem('juegos_pref') || '{}'); } catch (e) { return {}; } }
function guardarPrefMusica() { try { localStorage.setItem('juegos_pref', JSON.stringify({ musica: musica.estilo, volumen: musica.volumen })); } catch (e) { /* sin almacenamiento */ } }
const volMusica = () => musica.volumen === 'medio' ? 0.16 : 0.08;

function notaMusica(t, freq, dur, tipo, vol, filtro) {
  const c = musica.ctx; const o = c.createOscillator(); const g = c.createGain();
  o.type = tipo; o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let salida = g;
  if (filtro) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = filtro; g.connect(f); salida = f; }
  o.connect(g); salida.connect(musica.master); o.start(t); o.stop(t + dur + 0.05);
}
function ruidoMusica(t, dur, vol, agudo) {
  const c = musica.ctx; const n = Math.floor(c.sampleRate * dur); const buf = c.createBuffer(1, n, c.sampleRate); const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = c.createBufferSource(); src.buffer = buf; const g = c.createGain(); g.gain.value = vol;
  const f = c.createBiquadFilter(); f.type = agudo ? 'highpass' : 'lowpass'; f.frequency.value = agudo ? 7000 : 900;
  src.connect(f); f.connect(g); g.connect(musica.master); src.start(t);
}
function bomboMusica(t) {
  const c = musica.ctx; const o = c.createOscillator(); const g = c.createGain();
  o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
  g.gain.setValueAtTime(0.9, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
  o.connect(g); g.connect(musica.master); o.start(t); o.stop(t + 0.2);
}

// Un paso = corchea. 8 pasos por compás, 4 compases por vuelta.
function pasoMusica(t, paso) {
  const est = musica.estilo; const acorde = PROG[Math.floor(paso / 8) % 4]; const i = paso % 8; const corchea = 30 / ESTILOS_MUSICA[est].bpm;
  if (est === 'alegre') {
    const penta = [0, 2, 4, 7, 9, 12, 14, 16];
    notaMusica(t, hz(penta[(paso * 3 + acorde[0]) % penta.length] + 12), corchea * 0.9, 'square', 0.05, 2500);
    if (i % 2 === 0) notaMusica(t, hz(acorde[0] - 12), corchea * 1.8, 'triangle', 0.22);
    if (i % 2 === 1) ruidoMusica(t, 0.04, 0.05, true);
  } else if (est === 'relajante') {
    if (i === 0) acorde.forEach((st, k) => notaMusica(t, hz(st) * (1 + (k - 1) * 0.002), corchea * 8, 'sine', 0.07));
    if (i % 2 === 0) notaMusica(t, hz(acorde[(i / 2) % 3] + 12), corchea * 2.5, 'triangle', 0.035);
    if (i === 0 || i === 4) notaMusica(t, hz(acorde[0] - 24), corchea * 4, 'sine', 0.18);
    if (Math.random() < 0.3) ruidoMusica(t, 0.02, 0.012, true);
  } else if (est === 'fiesta') {
    if (i % 2 === 0) bomboMusica(t);
    if (i % 2 === 1) notaMusica(t, hz(acorde[0] - 12), corchea * 0.9, 'sawtooth', 0.12, 700);
    if (i === 2 || i === 6) acorde.forEach(st => notaMusica(t, hz(st + 12), corchea * 0.6, 'sawtooth', 0.035, 1800));
    if (i % 2 === 1) ruidoMusica(t, 0.03, 0.06, true);
  }
}

function iniciarMusica(estilo) {
  detenerMusica();
  musica.estilo = estilo; guardarPrefMusica(); pintarBotonMusica();
  if (!estilo) return;
  try {
    musica.ctx = musica.ctx || new (window.AudioContext || window.webkitAudioContext)();
    if (musica.ctx.state === 'suspended') musica.ctx.resume();
    musica.master = musica.ctx.createGain(); musica.master.gain.value = volMusica(); musica.master.connect(musica.ctx.destination);
    musica.paso = 0; musica.siguiente = musica.ctx.currentTime + 0.1;
    musica.timer = setInterval(() => {
      const corchea = 30 / ESTILOS_MUSICA[musica.estilo].bpm;
      while (musica.siguiente < musica.ctx.currentTime + 0.12) { pasoMusica(musica.siguiente, musica.paso++); musica.siguiente += corchea; }
    }, 25);
  } catch (e) { musica.estilo = null; pintarBotonMusica(); }
}
function detenerMusica() {
  if (musica.timer) clearInterval(musica.timer);
  musica.timer = null;
  if (musica.master) { try { musica.master.disconnect(); } catch (e) { /* ya desconectado */ } musica.master = null; }
}
// Mientras habla la voz (gritón, Spelling), la música baja.
function bajarMusica(ms = 2500) {
  if (!musica.master || !musica.ctx) return;
  const g = musica.master.gain, t = musica.ctx.currentTime;
  g.cancelScheduledValues(t); g.setTargetAtTime(volMusica() * 0.25, t, 0.05); g.setTargetAtTime(volMusica(), t + ms / 1000, 0.3);
}
function pintarBotonMusica() {
  const b = document.getElementById('btn-musica'); if (!b) return;
  b.textContent = musica.estilo ? ESTILOS_MUSICA[musica.estilo].nombre.split(' ')[0] + ' ♪' : '🔇';
  b.setAttribute('aria-label', 'Música: ' + (musica.estilo ? ESTILOS_MUSICA[musica.estilo].nombre : 'apagada'));
  const menu = document.getElementById('menu-musica');
  if (menu) menu.querySelectorAll('[data-mus]').forEach(x => x.setAttribute('aria-pressed', String((x.dataset.mus || null) === (musica.estilo || '') || (x.dataset.mus === '' && !musica.estilo))));
  if (menu) menu.querySelectorAll('[data-vol]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.vol === musica.volumen)));
}
function menuMusicaHtml() {
  return '<div class="menu-musica" id="menu-musica" hidden><div class="muted" style="margin-bottom:6px">Música de fondo</div>' +
    '<button class="mus-opt" data-mus="">🔇 Apagada</button>' + Object.entries(ESTILOS_MUSICA).map(([k, v]) => '<button class="mus-opt" data-mus="' + k + '">' + v.nombre + '</button>').join('') +
    '<div class="muted" style="margin:8px 0 4px">Volumen</div><div style="display:flex;gap:6px"><button class="mus-opt" data-vol="bajo">Bajo</button><button class="mus-opt" data-vol="medio">Medio</button></div></div>';
}
(() => {
  const pref = leerPrefMusica();
  if (pref.volumen === 'medio') musica.volumen = 'medio';
  // Los navegadores exigen un gesto: si había música guardada, empieza con el primer toque.
  if (pref.musica && ESTILOS_MUSICA[pref.musica]) {
    musica.estilo = pref.musica;
    const arrancar = () => { document.removeEventListener('pointerdown', arrancar); if (musica.estilo && !musica.timer) iniciarMusica(musica.estilo); };
    document.addEventListener('pointerdown', arrancar);
  }
})();

document.getElementById('menu-musica-wrap').innerHTML = menuMusicaHtml();
pintarBotonMusica();
document.getElementById('btn-musica').addEventListener('click', e => { e.stopPropagation(); const m = document.getElementById('menu-musica'); m.hidden = !m.hidden; pintarBotonMusica(); });
document.getElementById('menu-musica').addEventListener('click', e => {
  e.stopPropagation();
  const b = e.target.closest('[data-mus]'), v = e.target.closest('[data-vol]');
  if (b) iniciarMusica(b.dataset.mus || null);
  if (v) { musica.volumen = v.dataset.vol; guardarPrefMusica(); if (musica.master) musica.master.gain.value = volMusica(); pintarBotonMusica(); }
});
document.addEventListener('click', () => { const m = document.getElementById('menu-musica'); if (m) m.hidden = true; });
chip.addEventListener('click', () => { if (state.jugador) pantallaAvatar(); });
