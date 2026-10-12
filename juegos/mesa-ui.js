/* Piezas de página compartidas por «Futbolito» y «Billar» (openspec: futbolito-billar): toques, sonido, avisos,
   confeti, mensajes con juegos.html y el controlador de la sala 1 vs 1 por tiros (reproduce la línea de turnos de
   juegos/fisica.js y anima cada tiro con el mismo motor). Requiere juegos/fisica.js. */
(function (raiz) {
  'use strict';
  const F = raiz.Fisica;
  const Q = new URLSearchParams(location.search);
  const EMBED = window.parent !== window, PRUEBA = Q.get('prueba') === '1';
  const REDUCIR = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const TOQUES = 'ontouchstart' in window;
  const TACTIL = TOQUES || matchMedia('(any-pointer: coarse)').matches;
  if (TACTIL) document.documentElement.classList.add('tactil');
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const leerLS = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const guardarLS = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* sin almacenamiento */ } };

  // ---- Sonido (WebAudio, opcional; misma preferencia que Arcade) ----
  let AC = null, master = null, sonido = leerLS('arcade_sonido') !== '0';
  function audio() {
    try {
      if (!AC) { AC = new (window.AudioContext || window.webkitAudioContext)(); master = AC.createGain(); master.connect(AC.destination); }
      master.gain.value = sonido ? 0.9 : 0;
      if (AC.state === 'suspended' && !document.hidden) AC.resume();
    } catch (e) { AC = null; }
  }
  function tono(f, d, tipo = 'square', v = 0.05, hasta, retraso = 0) {
    if (!AC || !sonido) return;
    const o = AC.createOscillator(), ga = AC.createGain(), s = AC.currentTime + retraso;
    o.type = tipo; o.frequency.setValueAtTime(f, s); if (hasta) o.frequency.exponentialRampToValueAtTime(hasta, s + d);
    ga.gain.setValueAtTime(v, s); ga.gain.exponentialRampToValueAtTime(0.001, s + d);
    o.connect(ga); ga.connect(master); o.start(s); o.stop(s + d + 0.02);
  }
  function botonSonido(btn) {
    const pintar = () => { btn.textContent = sonido ? '🔊' : '🔇'; btn.setAttribute('aria-pressed', String(!sonido)); };
    btn.onclick = e => { sonido = !sonido; guardarLS('arcade_sonido', sonido ? '1' : '0'); audio(); pintar(); e.currentTarget.blur(); };
    pintar();
  }
  addEventListener('pointerdown', audio, { passive: true });
  addEventListener('touchend', audio, { passive: true });
  addEventListener('keydown', audio);

  // ---- Avisos y confeti ----
  let avisoT = null;
  function avisar(txt, ms) { const a = $('aviso'); if (!a) return; a.textContent = txt; a.classList.add('ver'); clearTimeout(avisoT); avisoT = setTimeout(() => a.classList.remove('ver'), ms || 1600); }
  function confeti() {
    const c = $('confeti'); if (!c || REDUCIR) return;
    c.innerHTML = '';
    const colores = ['#facc15', '#ef4444', '#22c55e', '#3b82f6', '#a855f7', '#fb923c'];
    for (let i = 0; i < 60; i++) {
      const p = document.createElement('i');
      p.style.left = (Math.random() * 100) + '%'; p.style.background = colores[i % colores.length];
      p.style.animationDelay = (Math.random() * 0.8) + 's';
      c.appendChild(p);
    }
    setTimeout(() => { c.innerHTML = ''; }, 3800);
  }

  // ---- Toques: touch events no pasivos por dedo; pointer events solo para mouse y pluma (como Karts) ----
  function tactil(el, h) {
    const opt = { passive: false };
    el.addEventListener('touchstart', e => { e.preventDefault(); for (const t of e.changedTouches) h.inicio(t.identifier, t.clientX, t.clientY); }, opt);
    el.addEventListener('touchmove', e => { e.preventDefault(); for (const t of e.changedTouches) h.mover(t.identifier, t.clientX, t.clientY); }, opt);
    const acabar = e => { e.preventDefault(); for (const t of e.changedTouches) h.fin(t.identifier, t.clientX, t.clientY, e.type === 'touchcancel'); };
    el.addEventListener('touchend', acabar, opt); el.addEventListener('touchcancel', acabar, opt);
    let abajo = null;
    const deMouse = e => !(e.pointerType === 'touch' && TOQUES);
    el.addEventListener('pointerdown', e => { if (!deMouse(e)) return; abajo = 'p' + e.pointerId; try { el.setPointerCapture(e.pointerId); } catch (x) { /* nada */ } h.inicio(abajo, e.clientX, e.clientY); });
    el.addEventListener('pointermove', e => { if (abajo && deMouse(e)) h.mover(abajo, e.clientX, e.clientY); });
    const soltar = cancel => e => { if (!abajo || !deMouse(e)) return; const id = abajo; abajo = null; h.fin(id, e.clientX, e.clientY, cancel); };
    el.addEventListener('pointerup', soltar(false)); el.addEventListener('pointercancel', soltar(true));
  }

  // ---- Mensajes con juegos.html (solo mismo origen) ----
  let juego = '';
  const oyentes = [];
  function enviar(m) { if (!EMBED) return; try { parent.postMessage(Object.assign({ juego }, m), location.origin); } catch (e) { /* nada */ } }
  addEventListener('message', ev => {
    if (ev.origin !== location.origin || ev.source !== parent) return;
    for (const f of oyentes) f(ev.data || {});
  });

  /* ---- Sala 1 vs 1 por tiros (design.md §4 y §5) ----
     o: { motor, turnoMs, botMs, sub (subpasos por cuadro), ahoraLocal? }. Mantiene las jugadas del servidor más la
     propia recién enviada, reproduce la línea y anima los tiros nuevos uno por uno; si llegan varios juntos (al
     entrar tarde o recargar) salta al penúltimo y anima el último. */
  function crearSala(o) {
    const s = {
      orden: [], yo: null, idx: -1, seed: 0, inicio: 0, offset: 0, servidor: [], propia: null, cache: {},
      mostrado: [], estado: null, anim: null, linea: null, finDesde: 0,
    };
    const firma = h => h.idx + ':' + JSON.stringify(h.tiro);
    s.ahora = () => Date.now() + s.offset;
    s.iniciar = d => {
      Object.assign(s, { orden: d.orden || [], yo: d.yo, seed: d.seed, inicio: Number(d.inicio) || 0, offset: (Number(d.ahora) || Date.now()) - Date.now(), servidor: d.jugadas || [], propia: null, cache: {}, mostrado: [], anim: null, finDesde: 0 });
      s.idx = s.orden.findIndex(p => p.id === s.yo);
      s.estado = o.motor.inicial(s.seed);
    };
    s.recibir = (jugadas, ahora) => {
      s.servidor = jugadas || [];
      if (ahora) s.offset = ahora - Date.now();
      if (s.propia && s.servidor.some(j => j.n === s.propia.n)) s.propia = null;
    };
    const jugadas = () => s.propia ? s.servidor.filter(j => j.n !== s.propia.n).concat([s.propia]) : s.servidor;
    s.calcular = () => (s.linea = F.linea({ motor: o.motor, seed: s.seed, orden: s.orden, jugadas: jugadas(), inicio: s.inicio, ahora: s.ahora(), turnoMs: o.turnoMs, botMs: o.botMs, cache: s.cache }));
    // Un cuadro: avanza la animación o arranca la siguiente. Devuelve el tiro que terminó en este cuadro (o null).
    s.cuadro = () => {
      if (s.anim) {
        for (let i = 0; i < o.sub && !s.anim.sim.termino; i++) s.anim.sim.paso();
        if (!s.anim.sim.termino) return null;
        const h = s.anim.h;
        s.estado = h.despues; s.mostrado.push(firma(h)); s.anim = null;
        if (s.linea && s.linea.fin && s.mostrado.length === s.linea.historia.length) s.finDesde = performance.now();
        return h;
      }
      const l = s.calcular(), hs = l.historia;
      let k = 0;
      while (k < s.mostrado.length && k < hs.length && s.mostrado[k] === firma(hs[k])) k++;
      if (k < s.mostrado.length) { s.mostrado.length = k; s.estado = k ? hs[k - 1].despues : o.motor.inicial(s.seed); } // resincronizar
      if (hs.length > s.mostrado.length + 1) { // varios pendientes: saltar al penúltimo
        s.mostrado = hs.slice(0, hs.length - 1).map(firma); s.estado = hs[hs.length - 2].despues;
      }
      if (hs.length > s.mostrado.length) {
        const h = hs[s.mostrado.length];
        if (h.tiro.rendirse) { s.estado = h.despues; s.mostrado.push(firma(h)); s.finDesde = performance.now(); return h; }
        s.anim = { h, sim: o.motor.crearSim(h.antes, h.tiro) };
      } else if (l.fin && !s.finDesde) s.finDesde = performance.now();
      return null;
    };
    s.miTurno = () => !s.anim && s.linea && !s.linea.fin && s.linea.espera && s.linea.espera.tipo === 'persona' && s.linea.espera.idx === s.idx && s.mostrado.length === s.linea.historia.length && !s.propia;
    s.tirar = tiro => {
      if (!s.miTurno()) return false;
      const jugada = Object.assign({ n: s.linea.paso }, tiro);
      s.propia = Object.assign({ t: s.ahora(), jugador: s.yo }, jugada);
      enviar({ tipo: 'jugada', jugada });
      return true;
    };
    s.rechazo = () => { s.propia = null; };
    return s;
  }

  raiz.MesaUI = {
    Q, EMBED, PRUEBA, REDUCIR, TOQUES, TACTIL, $, esc, leerLS, guardarLS,
    audio, tono, botonSonido, avisar, confeti, tactil, crearSala,
    enviar, alMensaje: f => oyentes.push(f), usarJuego: id => { juego = id; },
  };
})(window);
