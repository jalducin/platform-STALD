// E2E: emoción sonora (openspec: emocion-sonora).
// Espía `Emocion.eventos()` (registro del módulo juegos/emocion.js) en cada juego para comprobar que pide el stinger
// correcto en el momento correcto: gol, partido cerrado (tensión), silbatazo y victoria en Futbolito; resultado del
// hoyo en Golf; cuenta regresiva, última vuelta y podio en Karts; últimos segundos y final de un quiz; podio y
// revancha de una partida. También: silencio de Arcade (nada suena, ni el sonido clásico), «Efectos de emoción: No»
// (vuelve el sonido clásico), sin AudioContext y con autoplay bloqueado (sin errores). Muestras: cada stinger se
// renderiza con OfflineAudioContext y se guarda como WAV en salida/emocion/ (duración, pico < 1 y RMS > 0).
require('./lib/entorno');
const { chromium } = require('playwright');
const fs = require('node:fs');
const { abrirPagina } = require('./lib/navegador');
const { abrirJuego } = require('./lib/menu');
const out = []; const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`);
const sleep = ms => new Promise(r => setTimeout(r, ms));

const eventos = f => f.evaluate(() => window.Emocion.eventos());
const nombres = evs => evs.map(e => e.ev + (e.sono ? '' : '(' + e.motivo + ')'));
const hay = (evs, ev, f = () => true) => evs.some(e => e.ev === ev && f(e));
const esperarEvento = (f, ev, ms = 20000) => f.waitForFunction(n => window.Emocion.eventos().some(e => e.ev === n), ev, { timeout: ms }).then(() => true).catch(() => false);
// Cuenta los osciladores que crea la página (de cualquier módulo): así se ve si sonó el sonido clásico.
const CONTAR_OSC = () => {
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  const orig = AC.prototype.createOscillator;
  window.__osc = 0;
  AC.prototype.createOscillator = function () { window.__osc++; return orig.call(this); };
};
const suelto = (b, ruta, esperar, extra = {}) => abrirPagina(b, { viewport: { width: 390, height: 844 }, out, etiqueta: ruta, ruta, esperar, ...extra });

// Futbolito suelto: entra con un toque real (gesto) a un partido contra el bot quieto.
async function futbolito(b, init) {
  const p = await suelto(b, '/juegos/futbolito.html?prueba=1', '#ov-menu:not(.hide)', { init: [init || CONTAR_OSC, null] });
  await p.click('[data-nivel="facil"]');
  await p.waitForFunction(() => window.__futbolito.estado().modo === 'juego');
  await p.evaluate(() => { window.__futbolito.pausarBot(); window.Emocion.limpiar(); });
  return p;
}

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME });

  // ---------- 1. Muestras WAV de cada stinger (OfflineAudioContext) ----------
  {
    const p = await suelto(b, '/juegos/futbolito.html?prueba=1', '#ov-menu:not(.hide)');
    const muestras = await p.evaluate(async () => {
      const SR = 22050, res = [];
      const args = { cuentaRegresiva: { n: 3 }, ultimoSegundos: { n: 5 }, suspenso: { ms: 1800 }, racha: { n: 5 }, podio: { lugar: 1 }, tension: { intensidad: 0.8, dur: 3 }, cuenta: { k: 3 } };
      for (const nombre of [...window.Emocion.NOMBRES, 'tension']) {
        const c = new OfflineAudioContext(1, SR * 7, SR);
        const dur = window.Emocion.renderizar(nombre, c, args[nombre]);
        const buf = await c.startRendering();
        const d = buf.getChannelData(0), n = Math.min(d.length, Math.ceil((dur + 0.35) * SR));
        let pico = 0, suma = 0;
        const pcm = new Int16Array(n);
        for (let i = 0; i < n; i++) { const v = d[i]; pico = Math.max(pico, Math.abs(v)); suma += v * v; pcm[i] = Math.max(-1, Math.min(1, v)) * 32767; }
        // Lo que queda después de la duración declarada (debe ser casi silencio).
        let cola = 0; for (let i = Math.ceil((dur + 0.35) * SR); i < d.length; i++) cola = Math.max(cola, Math.abs(d[i]));
        let bin = ''; const bytes = new Uint8Array(pcm.buffer);
        for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
        res.push({ nombre, dur, pico, rms: Math.sqrt(suma / n), cola, b64: btoa(bin), sr: SR });
      }
      return res;
    });
    fs.mkdirSync('emocion', { recursive: true });
    const wav = (pcm, sr) => {
      const h = Buffer.alloc(44);
      h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8); h.write('fmt ', 12); h.writeUInt32LE(16, 16);
      h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(sr, 24); h.writeUInt32LE(sr * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34);
      h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
      return Buffer.concat([h, pcm]);
    };
    const tabla = ['| Stinger | Duración (s) | Pico | RMS |', '|---|---|---|---|'];
    for (const m of muestras) {
      fs.writeFileSync('emocion/' + m.nombre + '.wav', wav(Buffer.from(m.b64, 'base64'), m.sr));
      tabla.push('| ' + m.nombre + ' | ' + m.dur.toFixed(2) + ' | ' + m.pico.toFixed(3) + ' | ' + m.rms.toFixed(4) + ' |');
      ok('muestra ' + m.nombre + ': dura entre 0.15 y 7 s, sin saturar (pico < 0.99), sin silencio (RMS > 0.003) y sin cola', m.dur >= 0.15 && m.dur <= 6.6 && m.pico < 0.99 && m.pico > 0.03 && m.rms > 0.003 && m.cola < 0.02,
        JSON.stringify({ dur: m.dur, pico: +m.pico.toFixed(3), rms: +m.rms.toFixed(4), cola: +m.cola.toFixed(4) }));
    }
    fs.writeFileSync('emocion/muestras.md', tabla.join('\n') + '\n');
    ok('se guardaron ' + muestras.length + ' muestras WAV en salida/emocion/', muestras.length >= 20);
    await p.context().close();
  }

  // ---------- 2. Futbolito: gol, partido cerrado, silbatazo y victoria ----------
  {
    const p = await futbolito(b);
    await p.evaluate(() => window.__futbolito.anotar(0));
    let ev = await eventos(p);
    ok('futbolito: un gol propio pide `gol` y suena', hay(ev, 'gol', e => e.sono), nombres(ev).join(','));
    await p.evaluate(() => { window.__futbolito.anotar(1); });
    ev = await eventos(p);
    ok('futbolito: un gol del bot pide `error` (sin tribuna)', hay(ev, 'error') && ev.filter(e => e.ev === 'gol').length === 1, nombres(ev).join(','));
    await p.evaluate(() => { for (let i = 0; i < 3; i++) { window.__futbolito.anotar(0); window.__futbolito.anotar(1); } });
    const est = await p.evaluate(() => ({ m: window.__futbolito.estado().marcador, e: window.Emocion.estado() }));
    ok('futbolito: con 4-4 sube la tensión (intensidad ≥ 0.6, latido activo)', est.m.join('-') === '4-4' && est.e.intensidad >= 0.6 && est.e.tensionActiva, JSON.stringify(est));
    await p.evaluate(() => { window.Emocion.limpiar(); window.__futbolito.anotar(0); });
    const victoria = await esperarEvento(p, 'victoria', 5000);
    ev = await eventos(p);
    ok('futbolito: al final, tensión en 0, `silbato` y después `victoria`', victoria && hay(ev, 'intensidad', e => e.args.x === 0) && hay(ev, 'silbato') &&
      ev.findIndex(e => e.ev === 'silbato') < ev.findIndex(e => e.ev === 'victoria'), nombres(ev).join(','));
    ok('futbolito: la tensión queda apagada al terminar', !(await p.evaluate(() => window.Emocion.estado().tensionActiva)));
    await p.context().close();
  }

  // ---------- 3. Silencio y efectos apagados ----------
  {
    const silencio = () => { localStorage.setItem('arcade_sonido', '0'); };
    const p = await futbolito(b, silencio);
    await p.evaluate(() => { const C = window.AudioContext; const o = C.prototype.createOscillator; window.__osc = 0; C.prototype.createOscillator = function () { window.__osc++; return o.call(this); }; });
    await p.evaluate(() => { window.__futbolito.anotar(0); window.Emocion.victoria(); window.Emocion.intensidad(0.8); });
    const ev = await eventos(p);
    const osc = await p.evaluate(() => window.__osc);
    ok('silencio de Arcade: gol, victoria y tensión se anotan con motivo `silencio`', ev.length >= 3 && ev.filter(e => ['gol', 'victoria', 'intensidad'].includes(e.ev)).every(e => !e.sono && e.motivo === 'silencio'), nombres(ev).join(','));
    ok('silencio de Arcade: no se crea ningún oscilador (ni el sonido clásico)', osc === 0, String(osc));
    await p.context().close();

    const q = await futbolito(b, () => { localStorage.setItem('juegos_emocion', '0'); });
    await q.evaluate(() => { const C = window.AudioContext; const o = C.prototype.createOscillator; window.__osc = 0; C.prototype.createOscillator = function () { window.__osc++; return o.call(this); }; });
    await q.evaluate(() => window.__futbolito.anotar(0));
    const evq = await eventos(q), oscq = await q.evaluate(() => window.__osc);
    ok('efectos de emoción apagados: el gol no suena con la tribuna…', hay(evq, 'gol', e => !e.sono && e.motivo === 'silencio'), nombres(evq).join(','));
    ok('…y vuelve el sonido clásico del gol (4 notas)', oscq >= 4, String(oscq));
    await q.context().close();
  }

  // ---------- 4. Sin AudioContext y autoplay bloqueado ----------
  {
    const p = await futbolito(b, () => { delete window.AudioContext; delete window.webkitAudioContext; });
    for (let i = 0; i < 5; i++) await p.evaluate(() => { window.__futbolito.anotar(0); });
    await sleep(2600);
    const ev = await eventos(p);
    ok('sin AudioContext: el partido termina sin errores y los eventos quedan como `sin-audio`', hay(ev, 'gol', e => e.motivo === 'sin-audio') && hay(ev, 'victoria', e => e.motivo === 'sin-audio') &&
      (await p.evaluate(() => window.__futbolito.estado().modo)) === 'resultado', nombres(ev).join(','));
    await p.context().close();

    const b2 = await chromium.launch({ executablePath: process.env.CHROME, args: ['--autoplay-policy=user-gesture-required'] });
    // page.evaluate de Playwright cuenta como gesto: la prueba sin gesto corre desde un temporizador de la página.
    // (y waitForSelector también), así que corre en DOMContentLoaded, antes de que la prueba toque la página.
    const sinGesto = () => addEventListener('DOMContentLoaded', () => {
      const E = window.Emocion;
      const r = [E.gol(), E.podio(1), E.intensidad(0.7)];
      window.__sinGesto = { r, ctx: E.estado().hayContexto, ev: E.eventos(), activa: !!navigator.userActivation?.hasBeenActive };
    });
    const q = await abrirPagina(b2, { out, etiqueta: 'autoplay', init: [sinGesto, null], ruta: '/juegos/futbolito.html?prueba=1', esperar: '#ov-menu:not(.hide)' });
    await q.waitForFunction(() => window.__sinGesto, null, { timeout: 10000 });
    const sg = await q.evaluate(() => window.__sinGesto);
    ok('autoplay bloqueado: sin gesto nada suena ni crea AudioContext (motivo `sin-gesto`)', sg.r[0] === false && sg.r[1] === false && sg.ctx === false && sg.ev.length === 3 && sg.ev.every(e => e.motivo === 'sin-gesto'), nombres(sg.ev).join(',') + ' activa=' + sg.activa);
    await q.click('[data-nivel="facil"]');
    await q.evaluate(() => window.Emocion.limpiar());
    ok('autoplay: tras un toque ya suena', await q.evaluate(() => window.Emocion.logro()), nombres(await eventos(q)).join(','));
    await b2.close();
  }

  // ---------- 5. Golf: resultado del hoyo ----------
  {
    const p = await suelto(b, '/juegos/golf.html?prueba=1', '#ov-menu:not(.hide)');
    await p.click('[data-ir="practica"]');
    await p.evaluate(() => { window.__golf.practica(0); window.Emocion.limpiar(); });
    for (let i = 0; i < 8; i++) {
      await p.waitForFunction(() => window.__golf.estado().puedo || window.__golf.estado().modo === 'hoyo', null, { timeout: 30000 });
      if ((await p.evaluate(() => window.__golf.estado().modo)) === 'hoyo') break;
      await p.evaluate(() => { const t = window.__golf.ideal(); window.__golf.apuntar(t.angulo, t.fuerza); });
      await p.click('#b-golpear');
      await p.waitForFunction(() => !window.__golf.estado().animando, null, { timeout: 30000 });
    }
    const e = await p.evaluate(() => ({ modo: window.__golf.estado().modo, golpes: window.__golf.estado().golpes, ev: window.Emocion.eventos() }));
    ok('golf: al meter la pelota se pide el stinger de su resultado (victoria, logro o acierto)', e.modo === 'hoyo' && e.ev.some(x => ['victoria', 'logro', 'acierto'].includes(x.ev)), JSON.stringify({ modo: e.modo, golpes: e.golpes, ev: nombres(e.ev) }));
    await p.context().close();
  }

  // ---------- 6. Karts: cuenta regresiva, última vuelta y podio ----------
  {
    const p = await suelto(b, '/juegos/karts.html?prueba=1', '#ov-menu:not(.hide)');
    await p.click('[data-ir="pistas"]'); await p.click('[data-ir="rapida:pradera"]');
    await p.waitForFunction(() => window.__karts.estado().modo === 'carrera' && window.__karts.estado().tiempo > 300, null, { timeout: 20000 });
    let ev = await eventos(p);
    ok('karts: la cuenta regresiva pide `cuenta` 3, 2, 1 y ¡YA! (0)', [3, 2, 1, 0].every(k => hay(ev, 'cuenta', e => e.args.k === k)), nombres(ev).join(','));
    await p.evaluate(() => { window.Emocion.limpiar(); window.__karts.casiVuelta(); });
    const campana = await esperarEvento(p, 'campana', 15000);
    ev = await eventos(p);
    ok('karts: al empezar la última vuelta suena la `campana` y sube la tensión', campana && hay(ev, 'intensidad', e => e.args.x > 0), nombres(ev).join(','));
    await p.evaluate(() => window.__karts.adelantar());
    await p.waitForSelector('#ov-res:not(.hide)', { timeout: 20000 });
    ev = await eventos(p);
    const lugar = await p.evaluate(() => window.__karts.estado().pos);
    ok('karts: en los resultados se pide `podio` con tu lugar y la tensión se apaga', hay(ev, 'podio', e => e.args.lugar >= 1) && hay(ev, 'intensidad', e => e.args.x === 0), JSON.stringify({ lugar, ev: nombres(ev) }));
    await p.context().close();
  }

  // ---------- 7. Hub: interruptor, quiz y podio con revancha ----------
  {
    const p = await abrirPagina(b, { email: 'marisol@example.com', viejo: true, tiempo: 0.05, out, ruta: '/juegos.html', esperar: '[data-menu]' });
    await p.click('#btn-musica'); await p.click('[data-emo="0"]');
    ok('hub: «Efectos de emoción: No» se guarda y se marca', (await p.evaluate(() => localStorage.getItem('juegos_emocion'))) === '0' && (await p.getAttribute('[data-emo="0"]', 'aria-pressed')) === 'true');
    await p.click('[data-emo="1"]');
    ok('hub: «Efectos de emoción: Sí» lo vuelve a encender', (await p.evaluate(() => localStorage.getItem('juegos_emocion'))) === '1' && !(await p.evaluate(() => window.Emocion.silenciado())));
    await p.evaluate(() => { document.getElementById('menu-musica').hidden = true; });
    await p.evaluate(() => window.Emocion.limpiar());
    await abrirJuego(p, 'mente-calculo');
    await p.waitForSelector('.card.result h1', { timeout: 60000 });
    await sleep(300);
    const ev = await eventos(p);
    ok('quiz: en los últimos segundos del reloj se pide `ultimoSegundos`', hay(ev, 'ultimoSegundos'), nombres(ev).join(','));
    ok('quiz: al terminar se pide `record` o `revelacion`', hay(ev, 'record') || hay(ev, 'revelacion'), nombres(ev).join(','));
    ok('quiz: al salir del juego se pide `calma`', hay(ev, 'calma'), nombres(ev).join(','));

    // Partida corta con bots: Maratón de cultura de 2 personas; Marisol abre la revancha y a Angel le llega el aviso.
    const ang = await abrirPagina(b, { email: 'angel@example.com', viejo: true, tiempo: 0.3, out, ruta: '/juegos.html', esperar: '[data-menu]' });
    const mar = await abrirPagina(b, { email: 'marisol@example.com', viejo: true, tiempo: 0.3, out, ruta: '/juegos.html', esperar: '[data-menu]', contexto: { reducedMotion: 'reduce' } });
    await mar.click('[data-tab="partidas"]'); await mar.waitForSelector('#f-crear');
    await mar.selectOption('#p-juego', 'cultura'); await mar.click('#f-crear button[type=submit]');
    await mar.waitForSelector('[data-p="empezar"]', { timeout: 30000 });
    const codigo = (await mar.textContent('.letra')).trim();
    await ang.click('[data-tab="partidas"]'); await ang.waitForSelector('#f-crear');
    await ang.fill('#p-codigo', codigo); await ang.click('#f-unirse button[type=submit]'); await ang.waitForSelector('#p-codigo-chip', { timeout: 30000 });
    await mar.click('[data-p="empezar"]');
    await Promise.all([mar, ang].map(x => x.waitForSelector('#p-body .result', { timeout: 240000 })));
    const [em, ea] = await Promise.all([eventos(mar), eventos(ang)]);
    const lugarDe = async x => x.evaluate(() => { const li = [...document.querySelectorAll('.rank li')]; return li.findIndex(l => l.classList.contains('yo')) + 1; });
    const [lm, la] = await Promise.all([lugarDe(mar), lugarDe(ang)]);
    ok('podio: cada quien pide `podio` con su lugar', hay(em, 'podio', e => e.args.lugar === lm) && hay(ea, 'podio', e => e.args.lugar === la), JSON.stringify({ lm, la, em: nombres(em).slice(-4), ea: nombres(ea).slice(-4) }));
    const anim = await Promise.all([mar, ang].map(x => x.evaluate(() => { const li = document.querySelector('.podio-suspenso .rank li'); return li ? getComputedStyle(li).animationName : 'sin-podio'; })));
    ok('podio: el 1.er lugar aparece tras el redoble (animación) y sin animación con movimiento reducido', anim[1] !== 'none' && anim[1] !== 'sin-podio' && anim[0] === 'none', JSON.stringify(anim));
    await mar.screenshot({ path: 'emocion-podio.png', fullPage: true });
    await ang.evaluate(() => window.Emocion.limpiar());
    await mar.click('[data-p="revancha"]');
    await ang.waitForSelector('.revancha-aviso', { timeout: 30000 });
    ok('revancha: a quien sigue en el podio le suena `revancha` cuando alguien la abre', await esperarEvento(ang, 'revancha', 5000), nombres(await eventos(ang)).join(','));
    for (const x of [p, mar, ang]) await x.context().close();
  }

  await b.close();
  console.log(out.join('\n'));
  const fallas = out.filter(l => l.startsWith('FAIL')).length;
  console.log(`\n${out.length - fallas}/${out.length} PASS`);
  process.exit(fallas ? 1 : 0);
})().catch(e => { console.log(out.join('\n')); console.error(e); process.exit(1); });
