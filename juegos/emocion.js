// Emoción sonora (openspec: emocion-sonora): stingers (gol, victoria, suspenso…) y una capa de «tensión» que sube y
// baja, todo sintetizado con WebAudio (sin archivos de audio ni derechos de autor).
// Script clásico sin dependencias ni build: lo cargan juegos.html y las páginas de Arcade (iframes del mismo origen).
// Respeta el silencio de Juegos: localStorage.arcade_sonido === '0' (botón 🔊 de Arcade, compartido con el hub) y
// localStorage.juegos_emocion === '0' («Efectos de emoción» del menú de música); el volumen sale de juegos_pref.volumen.
// Solo suena después de un gesto de quien juega (política de reproducción automática) y nunca lanza errores: sin
// AudioContext, cada llamada solo queda anotada.
// API y reglas de uso para un juego nuevo: docs/frontend-standards.md, sección «Emoción sonora».
(function (g) {
  'use strict';
  const LS = { sonido: 'arcade_sonido', emocion: 'juegos_emocion', pref: 'juegos_pref' };
  const MAX_REGISTRO = 200;
  const nota = st => 261.63 * Math.pow(2, st / 12); // semitonos sobre Do4
  const acotar = (x, a, b) => Math.max(a, Math.min(b, x));

  // ================= Síntesis (sirve igual para AudioContext y OfflineAudioContext) =================
  function envolvente(p, t, vol, ataque, dur) {
    p.setValueAtTime(0.0001, t);
    p.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + ataque);
    p.exponentialRampToValueAtTime(0.0001, t + Math.max(dur, ataque + 0.01));
  }
  // Un oscilador con envolvente. o: tipo, vol, ataque, hasta (barrido), filtro (pasa bajos), vibrato [hz, prof].
  function tono(c, out, t, f, dur, o = {}) {
    const osc = c.createOscillator(), ga = c.createGain();
    osc.type = o.tipo || 'sine';
    osc.frequency.setValueAtTime(f, t);
    if (o.hasta) osc.frequency.exponentialRampToValueAtTime(o.hasta, t + dur);
    if (o.vibrato) {
      const l = c.createOscillator(), lg = c.createGain();
      l.frequency.value = o.vibrato[0]; lg.gain.value = o.vibrato[1];
      l.connect(lg); lg.connect(osc.frequency); l.start(t); l.stop(t + dur + 0.05);
    }
    envolvente(ga.gain, t, o.vol || 0.2, o.ataque || 0.01, dur);
    let fin = ga;
    if (o.filtro) { const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = o.filtro; ga.connect(fl); fin = fl; }
    osc.connect(ga); fin.connect(out); osc.start(t); osc.stop(t + dur + 0.05);
  }
  // Metal (trompeta sintética): dos sierras desafinadas con un filtro que se abre y se cierra.
  function metal(c, out, t, f, dur, vol = 0.07) {
    const fl = c.createBiquadFilter(), ga = c.createGain();
    fl.type = 'lowpass'; fl.Q.value = 2;
    fl.frequency.setValueAtTime(f * 1.5, t); fl.frequency.exponentialRampToValueAtTime(f * 6, t + 0.06); fl.frequency.exponentialRampToValueAtTime(f * 2, t + dur);
    envolvente(ga.gain, t, vol, 0.025, dur);
    for (const d of [-6, 6]) {
      const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = d;
      o.connect(fl); o.start(t); o.stop(t + dur + 0.05);
    }
    fl.connect(ga); ga.connect(out);
  }
  // Campanita: parciales inarmónicos que se apagan solos.
  function campanita(c, out, t, f, vol = 0.12, dur = 1) {
    [[1, 1], [2.76, 0.4], [5.4, 0.18]].forEach(([k, v]) => tono(c, out, t, f * k, dur / k, { vol: vol * v, ataque: 0.004 }));
  }
  const RUIDO = new WeakMap(); // un segundo de ruido blanco por contexto
  function bufferRuido(c) {
    let b = RUIDO.get(c);
    if (!b) {
      b = c.createBuffer(1, c.sampleRate, c.sampleRate);
      const d = b.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; // NOSONAR: ruido de audio, no criptográfico
      RUIDO.set(c, b);
    }
    return b;
  }
  // Ruido filtrado. o: tipo de filtro, f, q, vol, ataque, caida, lfo [hz, profundidad] (oleaje de la tribuna).
  function ruido(c, out, t, dur, o = {}) {
    const src = c.createBufferSource(), fl = c.createBiquadFilter(), ga = c.createGain();
    src.buffer = bufferRuido(c); src.loop = true;
    fl.type = o.tipo || 'bandpass'; fl.frequency.value = o.f || 1000; fl.Q.value = o.q || 0.8;
    const vol = o.vol || 0.2, ataque = o.ataque || 0.005, caida = Math.min(o.caida || dur * 0.6, dur - ataque);
    ga.gain.setValueAtTime(0.0001, t);
    ga.gain.exponentialRampToValueAtTime(vol, t + ataque);
    ga.gain.setValueAtTime(vol, t + dur - caida);
    ga.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let fin = ga;
    if (o.lfo) {
      const am = c.createGain(), l = c.createOscillator(), lg = c.createGain();
      am.gain.value = 1 - o.lfo[1] / 2; l.frequency.value = o.lfo[0]; lg.gain.value = o.lfo[1] / 2;
      l.connect(lg); lg.connect(am.gain); ga.connect(am); fin = am; l.start(t); l.stop(t + dur + 0.05);
    }
    src.connect(fl); fl.connect(ga); fin.connect(out); src.start(t); src.stop(t + dur + 0.05);
  }
  // Redoble que crece (golpes cada vez más seguidos y fuertes) con un timbal grave debajo.
  function redoble(c, out, t, dur) {
    let tt = 0;
    while (tt < dur) {
      const k = tt / dur;
      ruido(c, out, t + tt, 0.05, { f: 2400, q: 0.9, vol: 0.05 + 0.22 * k, caida: 0.04 });
      tt += 1 / (9 + 19 * k);
    }
    tono(c, out, t, 58, dur, { vol: 0.25, ataque: dur * 0.9 });
  }
  // Latido de la capa de tensión (un «pum-pum»; con más intensidad se suman platillo y cuerda).
  function pulsoTension(c, out, t, x) {
    const beat = 60 / (70 + 90 * x);
    tono(c, out, t, 64, 0.14, { vol: 0.3 * (0.5 + x / 2), hasta: 42 });
    tono(c, out, t + 0.17, 60, 0.12, { vol: 0.18 * (0.5 + x / 2), hasta: 40 });
    if (x > 0.45) ruido(c, out, t + beat / 2, 0.04, { tipo: 'highpass', f: 7000, vol: 0.05 * x, caida: 0.03 });
    if (x > 0.75) tono(c, out, t, nota(-12), beat * 0.8, { tipo: 'sawtooth', vol: 0.05 * x, ataque: 0.05, filtro: 600 });
    return beat;
  }

  // Cada receta programa su sonido desde el tiempo t en la salida `out` y devuelve su duración en segundos.
  const RECETAS = {
    gol(c, out, t) {
      ruido(c, out, t, 2.6, { f: 1100, q: 0.7, vol: 0.32, ataque: 0.35, caida: 1.2, lfo: [3.2, 0.35] }); // «¡aaah!» de la tribuna
      ruido(c, out, t + 0.05, 2.4, { tipo: 'lowpass', f: 450, vol: 0.22, ataque: 0.4, caida: 1 });
      [12, 16, 19].forEach((s, i) => metal(c, out, t + 0.1 + i * 0.12, nota(s), 0.14, 0.08));
      [12, 16, 19, 24].forEach(s => metal(c, out, t + 0.48, nota(s), 1.1, 0.06));
      return 2.7;
    },
    victoria(c, out, t) {
      [7, 12, 16, 19].forEach((s, i) => metal(c, out, t + i * 0.14, nota(s), 0.16, 0.08));
      [12, 16, 19, 24].forEach(s => metal(c, out, t + 0.6, nota(s), 1.2, 0.06));
      [36, 40, 43].forEach((s, i) => tono(c, out, t + 0.62 + i * 0.08, nota(s), 0.5, { tipo: 'triangle', vol: 0.05 }));
      return 1.9;
    },
    // Derrota amable: baja suave y resuelve en un acorde mayor («¡a la otra!»), sin zumbidos.
    derrota(c, out, t) {
      [7, 5, 4].forEach((s, i) => tono(c, out, t + i * 0.28, nota(s), 0.32, { tipo: 'triangle', vol: 0.14 }));
      [0, 4, 7].forEach(s => tono(c, out, t + 0.9, nota(s), 0.9, { vol: 0.07, ataque: 0.08 }));
      return 1.9;
    },
    record(c, out, t) {
      [24, 28, 31, 36, 40].forEach((s, i) => tono(c, out, t + i * 0.07, nota(s), 0.25, { tipo: 'triangle', vol: 0.08 }));
      campanita(c, out, t + 0.4, nota(36), 0.1);
      [12, 16, 19].forEach(s => metal(c, out, t + 0.4, nota(s), 0.9, 0.05));
      return 1.5;
    },
    nivelSuperado(c, out, t) {
      [12, 16, 19, 24, 19, 24].forEach((s, i) => tono(c, out, t + i * 0.09, nota(s), 0.12, { tipo: 'square', vol: 0.1, filtro: 2600 }));
      tono(c, out, t + 0.54, nota(28), 0.45, { tipo: 'square', vol: 0.1, filtro: 2600 });
      return 1.1;
    },
    logro(c, out, t) {
      campanita(c, out, t, nota(31)); campanita(c, out, t + 0.15, nota(36));
      return 1.2;
    },
    cuenta(c, out, t, a) {
      if ((a.k || 0) > 0) { tono(c, out, t, 440, 0.16, { tipo: 'square', vol: 0.16, filtro: 2000 }); return 0.2; }
      tono(c, out, t, 880, 0.5, { tipo: 'square', vol: 0.14, filtro: 2400 });
      [12, 19].forEach(s => metal(c, out, t, nota(s), 0.4, 0.05));
      return 0.6;
    },
    cuentaRegresiva(c, out, t, a) {
      const n = acotar(Math.round(a.n || 3), 1, 10);
      for (let i = 0; i < n; i++) RECETAS.cuenta(c, out, t + i, { k: n - i });
      return n + RECETAS.cuenta(c, out, t + n, { k: 0 });
    },
    // Últimos segundos: un latido con «tic» por segundo que va subiendo.
    ultimoSegundos(c, out, t, a) {
      const n = acotar(Math.round(a.n || 5), 1, 10);
      for (let i = 0; i < n; i++) {
        tono(c, out, t + i, nota(24 + i * 2), 0.06, { tipo: 'triangle', vol: 0.1 });
        tono(c, out, t + i, 70, 0.12, { vol: 0.22, hasta: 45 });
      }
      return n;
    },
    suspenso(c, out, t, a) {
      const d = acotar((a.ms || 1800) / 1000, 0.4, 6);
      redoble(c, out, t, d);
      return d;
    },
    revelacion(c, out, t) {
      tono(c, out, t, 90, 0.5, { vol: 0.45, hasta: 40 });
      ruido(c, out, t, 1, { tipo: 'highpass', f: 5000, vol: 0.14, caida: 0.9 });
      [12, 16, 19, 24].forEach(s => metal(c, out, t, nota(s), 0.5, 0.05));
      return 1.1;
    },
    acierto(c, out, t) {
      tono(c, out, t, nota(19), 0.12, { vol: 0.1 }); tono(c, out, t + 0.09, nota(24), 0.14, { vol: 0.1 });
      return 0.25;
    },
    error(c, out, t) {
      tono(c, out, t, 180, 0.18, { tipo: 'triangle', vol: 0.12, hasta: 140, filtro: 900 });
      return 0.22;
    },
    // Racha: dos notas que suben medio tono por cada acierto seguido (tope en 12).
    racha(c, out, t, a) {
      const base = 12 + acotar(Math.round(a.n || 1), 1, 12);
      tono(c, out, t, nota(base), 0.08, { tipo: 'square', vol: 0.07, filtro: 3000 });
      tono(c, out, t + 0.07, nota(base + 7), 0.12, { tipo: 'square', vol: 0.07, filtro: 3000 });
      return 0.22;
    },
    // Silbatazo final del árbitro: corto, corto, largo.
    silbato(c, out, t) {
      [[0, 0.18], [0.28, 0.18], [0.56, 0.7]].forEach(([d, l]) => tono(c, out, t + d, 2900, l, { vol: 0.08, vibrato: [28, 90] }));
      return 1.3;
    },
    // Campana de última vuelta.
    campana(c, out, t) {
      campanita(c, out, t, nota(28), 0.12, 1.2); campanita(c, out, t + 0.35, nota(28), 0.12, 1.2);
      return 1.5;
    },
    // Canto de lotería o bingo: un golpe de tambor suave con brillo.
    canto(c, out, t) {
      tono(c, out, t, 140, 0.2, { vol: 0.25, hasta: 80 });
      ruido(c, out, t, 0.2, { tipo: 'highpass', f: 6000, vol: 0.04, caida: 0.15 });
      return 0.3;
    },
    revancha(c, out, t) {
      tono(c, out, t, 220, 0.35, { tipo: 'sawtooth', vol: 0.06, hasta: 880, filtro: 1800 });
      [12, 19].forEach(s => metal(c, out, t + 0.35, nota(s), 0.25, 0.06));
      return 0.7;
    },
    // Podio: redoble, revelación y, según tu lugar, victoria, logro o la derrota amable.
    podio(c, out, t, a) {
      const lugar = Math.round(a.lugar || 0);
      redoble(c, out, t, 1.4);
      RECETAS.revelacion(c, out, t + 1.4);
      let fin = 0;
      if (lugar === 1) fin = RECETAS.victoria(c, out, t + 1.55);
      else if (lugar >= 2 && lugar <= 3) fin = RECETAS.logro(c, out, t + 1.55);
      else if (lugar > 3) fin = RECETAS.derrota(c, out, t + 1.55);
      return 1.55 + Math.max(fin, 0.95); // sin lugar (solo miraste): termina con la revelación
    },
    // Muestra de la capa de tensión (para escucharla y medirla; en el juego la programa intensidad()).
    tension(c, out, t, a) {
      const x = acotar(Number(a.intensidad) || 0.8, 0.05, 1), d = a.dur || 3;
      let tt = 0;
      while (tt < d - 0.3) tt += pulsoTension(c, out, t + tt, x);
      return d;
    },
  };
  // Espera mínima entre dos disparos del mismo stinger (ms): evita que se amontonen y cansen.
  const ESPERA = { gol: 1500, victoria: 2500, derrota: 2500, record: 2000, nivelSuperado: 1500, logro: 1500, cuentaRegresiva: 2000, cuenta: 150, ultimoSegundos: 3000, suspenso: 1000, revelacion: 800, acierto: 80, error: 150, racha: 120, silbato: 1500, campana: 2000, canto: 300, revancha: 3000, podio: 4000 };
  const AGACHA = new Set(['gol', 'victoria', 'derrota', 'record', 'nivelSuperado', 'logro', 'cuentaRegresiva', 'suspenso', 'revelacion', 'silbato', 'campana', 'revancha', 'podio']);

  // ================= Motor en vivo =================
  const E = {
    ctx: null, master: null, busTension: null, ctor: undefined, almacen: undefined, gesto: false, silencioLocal: false,
    agachar: null, agachados: 0, ultimo: {}, voces: [], registro: [], tension: { x: 0, timer: null, siguiente: 0, vigente: 0 },
  };
  function almacen() {
    if (E.almacen !== undefined) return E.almacen;
    try { return g.localStorage || null; } catch { /* sin almacenamiento (iframe sandbox o modo privado) */ return null; }
  }
  function leer(k) { try { const a = almacen(); return a ? a.getItem(k) : null; } catch { /* sin almacenamiento */ return null; } }
  // ¿Está apagado el sonido? Silencio del juego (página), botón 🔊 de Arcade o «Efectos de emoción».
  function silenciado() { return E.silencioLocal || leer(LS.sonido) === '0' || leer(LS.emocion) === '0'; }
  function volumen() {
    let pref = {};
    try { pref = JSON.parse(leer(LS.pref) || '{}') || {}; } catch { /* preferencia ilegible: volumen bajo */ }
    return pref.volumen === 'medio' ? 0.85 : 0.6;
  }
  function hayGesto() {
    if (E.gesto) return true;
    return !!g.navigator?.userActivation?.hasBeenActive;
  }
  function reanudar(c) {
    if (c?.state !== 'suspended' || typeof c.resume !== 'function') return;
    try { c.resume()?.catch?.(() => { /* el navegador aún no lo permite */ }); } catch { /* sin permiso */ }
  }
  function contexto() {
    if (E.ctx) return E.ctx;
    const Ctor = E.ctor === undefined ? (g.AudioContext || g.webkitAudioContext) : E.ctor;
    if (!Ctor) return null;
    try {
      const c = new Ctor();
      const lim = c.createDynamicsCompressor(); // limitador: nada se satura aunque se junten varios sonidos
      lim.threshold.value = -10; lim.ratio.value = 12; lim.attack.value = 0.003; lim.release.value = 0.25;
      E.master = c.createGain(); E.master.gain.value = volumen();
      E.busTension = c.createGain(); E.busTension.gain.value = 0.7;
      E.busTension.connect(E.master); E.master.connect(lim); lim.connect(c.destination);
      E.ctx = c;
    } catch { /* el navegador no deja crear audio: todo queda en silencio */ E.ctx = null; }
    return E.ctx;
  }
  function anotar(ev, args, motivo) {
    const fila = { ev, t: Date.now(), sono: !motivo, motivo: motivo || '', args: args || {} };
    E.registro.push(fila);
    if (E.registro.length > MAX_REGISTRO) E.registro.shift();
    try { if (g.dispatchEvent && g.CustomEvent) g.dispatchEvent(new g.CustomEvent('emocion', { detail: fila })); } catch { /* sin eventos del DOM */ }
  }
  // Baja la música de fondo (la del hub, aunque el juego esté en un iframe) y la capa de tensión mientras suena el stinger.
  function agachar(seg) {
    const ms = Math.round(seg * 1000);
    E.agachados++;
    if (E.busTension && E.ctx) {
      const p = E.busTension.gain, t = E.ctx.currentTime;
      p.cancelScheduledValues(t); p.setTargetAtTime(0.15, t, 0.05); p.setTargetAtTime(0.7, t + seg, 0.3);
    }
    try {
      if (E.agachar) { E.agachar(ms); return; }
      if (typeof g.bajarMusica === 'function') { g.bajarMusica(ms); return; }
      const padre = g.parent === g ? null : g.parent;
      if (typeof padre?.bajarMusica === 'function') padre.bajarMusica(ms);
    } catch { /* la página de arriba no es del mismo origen */ }
  }
  function limpiarVoces(ahora) {
    E.voces = E.voces.filter(v => {
      if (v.fin > ahora - 0.5) return true;
      try { v.voz.disconnect(); } catch { /* ya desconectada */ }
      return false;
    });
  }
  // Toca una receta si se puede; si no, solo la anota con el motivo. Devuelve true si sonó.
  function disparar(ev, args) {
    let motivo = '';
    if (silenciado()) motivo = 'silencio';
    else if (!hayGesto()) motivo = 'sin-gesto';
    else if (Date.now() - (E.ultimo[ev] || -1e12) < (ESPERA[ev] || 250)) motivo = 'repetido';
    const c = motivo ? null : contexto();
    if (!motivo && !c) motivo = 'sin-audio';
    anotar(ev, args, motivo);
    if (motivo) return false;
    E.ultimo[ev] = Date.now();
    try {
      reanudar(c);
      E.master.gain.value = volumen();
      limpiarVoces(c.currentTime);
      const voz = c.createGain(); voz.connect(E.master);
      const t = c.currentTime + 0.03;
      const dur = RECETAS[ev](c, voz, t, args || {});
      E.voces.push({ voz, fin: t + dur });
      if (AGACHA.has(ev)) agachar(dur);
      return true;
    } catch { /* un fallo de audio nunca rompe el juego */ return false; }
  }
  function decir(texto) {
    try {
      if (typeof g.hablar === 'function') { g.hablar(texto, 'es-MX', 1.05); return; }
      if (!g.speechSynthesis || !g.SpeechSynthesisUtterance) return;
      const u = new g.SpeechSynthesisUtterance(texto); u.lang = 'es-MX'; u.rate = 1.05; u.pitch = 1.1;
      g.speechSynthesis.speak(u);
    } catch { /* sin voz */ }
  }

  // ---- Capa de tensión ----
  function apagarTension() {
    const T = E.tension;
    if (T.timer) clearInterval(T.timer);
    T.timer = null;
    if (E.busTension && E.ctx) { const p = E.busTension.gain, t = E.ctx.currentTime; p.cancelScheduledValues(t); p.setTargetAtTime(0, t, 0.15); }
  }
  function tickTension() {
    const T = E.tension, c = E.ctx;
    const oculta = !!g.document?.hidden;
    if (!c || T.x <= 0 || silenciado() || Date.now() > T.vigente || oculta) { apagarTension(); return; }
    if (T.siguiente < c.currentTime) T.siguiente = c.currentTime + 0.05;
    while (T.siguiente < c.currentTime + 0.3) T.siguiente += pulsoTension(c, E.busTension, T.siguiente, T.x);
  }
  // intensidad(0..1): 0 apaga la capa; más intensidad = latido más rápido y fuerte. Dura 60 s sin otra llamada.
  function intensidad(x) {
    const T = E.tension, antes = T.x;
    const v = acotar(Number(x) || 0, 0, 1);
    T.x = v; T.vigente = Date.now() + 60000;
    let motivo = '';
    if (v > 0 && silenciado()) motivo = 'silencio';
    else if (v > 0 && !hayGesto()) motivo = 'sin-gesto';
    const c = v > 0 && !motivo ? contexto() : null;
    if (v > 0 && !motivo && !c) motivo = 'sin-audio';
    const prende = v > 0 && antes === 0, apaga = v === 0 && antes > 0;
    if (Math.abs(antes - v) >= 0.05 || prende || apaga) anotar('intensidad', { x: v }, motivo);
    if (v === 0 || motivo) { apagarTension(); return; }
    reanudar(c);
    const p = E.busTension.gain; p.cancelScheduledValues(c.currentTime); p.setTargetAtTime(0.7, c.currentTime, 0.2);
    if (!T.timer) { T.siguiente = c.currentTime + 0.05; T.timer = setInterval(tickTension, 100); tickTension(); }
  }
  // Calma: apaga la tensión y desvanece lo que esté sonando (al salir de un juego, pausar o silenciar).
  function calma() {
    E.tension.x = 0; apagarTension();
    if (E.ctx) {
      const t = E.ctx.currentTime;
      E.voces.forEach(v => { try { v.voz.gain.cancelScheduledValues(t); v.voz.gain.setTargetAtTime(0, t, 0.05); } catch { /* ya terminó */ } });
    }
    anotar('calma', {}, '');
  }

  if (typeof g.addEventListener === 'function') {
    const gesto = () => { E.gesto = true; reanudar(E.ctx); };
    for (const tipo of ['pointerdown', 'keydown', 'touchend']) g.addEventListener(tipo, gesto, { capture: true, passive: true });
    // Silencio desde otra página del mismo origen (el hub o un iframe): se apaga al momento.
    g.addEventListener('storage', e => { if (e && (e.key === LS.sonido || e.key === LS.emocion) && silenciado()) calma(); });
  }

  g.Emocion = {
    gol: (o = {}) => {
      const s = disparar('gol', o);
      if (s && o.voz !== false) decir('¡Goool!');
      return s;
    },
    victoria: () => disparar('victoria'),
    derrota: () => disparar('derrota'),
    record: () => disparar('record'),
    nivelSuperado: () => disparar('nivelSuperado'),
    logro: () => disparar('logro'),
    cuentaRegresiva: (n = 3) => disparar('cuentaRegresiva', { n }),
    cuenta: k => disparar('cuenta', { k }),
    ultimoSegundos: (n = 5) => disparar('ultimoSegundos', { n }),
    suspenso: (ms = 1800) => disparar('suspenso', { ms }),
    revelacion: () => disparar('revelacion'),
    acierto: () => disparar('acierto'),
    error: () => disparar('error'),
    racha: n => disparar('racha', { n }),
    silbato: () => disparar('silbato'),
    campana: () => disparar('campana'),
    canto: () => disparar('canto'),
    revancha: () => disparar('revancha'),
    podio: lugar => disparar('podio', { lugar }),
    intensidad, calma,
    // Silencio propio de la página (p. ej. el 🔊 de Dragon Run, que no se guarda).
    silencio: on => { E.silencioLocal = !!on; if (on) calma(); },
    silenciado,
    // Gancho de pruebas: lo que se pidió, si sonó y por qué no (silencio, sin-gesto, repetido, sin-audio).
    eventos: () => E.registro.map(f => ({ ...f, args: { ...f.args } })),
    limpiar: () => { E.registro = []; },
    estado: () => ({ intensidad: E.tension.x, tensionActiva: !!E.tension.timer, agachados: E.agachados, voces: E.voces.length, hayContexto: !!E.ctx }),
    RECETAS, NOMBRES: Object.keys(ESPERA),
    // Renderiza una receta en un contexto dado (OfflineAudioContext para medirla), con el mismo limitador.
    renderizar(nombre, c, args) {
      const lim = c.createDynamicsCompressor();
      lim.threshold.value = -10; lim.ratio.value = 12; lim.attack.value = 0.003; lim.release.value = 0.25;
      const m = c.createGain(); m.gain.value = 0.85; m.connect(lim); lim.connect(c.destination);
      return RECETAS[nombre](c, m, 0.02, args || {});
    },
    // Solo pruebas: inyecta AudioContext (o null = no hay), almacenamiento, gesto y bajada de música; reinicia todo.
    _probar(o = {}) {
      E.ctor = 'AudioContext' in o ? o.AudioContext : undefined;
      E.almacen = 'almacen' in o ? o.almacen : undefined;
      E.gesto = !!o.gesto; E.agachar = o.agachar || null; E.silencioLocal = false;
      g.Emocion._reiniciar();
    },
    _reiniciar() {
      apagarTension();
      E.ctx = null; E.master = null; E.busTension = null; E.ultimo = {}; E.voces = []; E.registro = []; E.agachados = 0;
      E.tension = { x: 0, timer: null, siguiente: 0, vigente: 0 };
    },
    _tick: tickTension,
  };
})(typeof window !== 'undefined' ? window : globalThis);
