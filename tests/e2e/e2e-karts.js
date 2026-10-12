// E2E: «Karts Turbo» (openspec: juegos-plataformas-karts, karts-controles-diseno).
// Catálogo, carrera 1 de la Copa Fiesta con 8 corredores (manejo con teclado y mini-turbo morado), puntos en ⭐
// individuales, copa en curso guardada en el servidor y recuperada tras recargar, y carrera en sala con bots
// fantasma: podio por tiempo sin tocar el progreso.
// Controles en celular con TOQUES REALES (CDP Input.dispatchTouchEvent, hasTouch + isMobile): joystick que gira
// proporcional, joystick + DERRAPE a la vez (multitáctil → turbo morado), botones ◀ ▶, preferencia guardada, sensor
// con eventos deviceorientation, permiso negado y sin lecturas → joystick. Minimapa con todos los corredores (y los
// fantasmas en sala) sin encimarse con los mandos, mandos completos a 360×640, 390×844 y 844×390.
// Capturas en vertical, horizontal y escritorio. Usa ?arcadePrueba=1.
require('./lib/entorno'); // BASE, API, CHROME, carpeta de salida y sesión de prueba en fetch
const { chromium } = require('playwright');
const { abrirPagina } = require('./lib/navegador');
const API = process.env.API;
const out = []; const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const EMAIL = 'angel@example.com';
const TACTIL = { hasTouch: true, isMobile: true };
const progreso = async () => (await fetch(API + '/juegos/progreso/karts?email=' + encodeURIComponent(EMAIL))).json();
const abrir = (b, viewport, contexto, init) => abrirPagina(b, { email: EMAIL, viejo: true, viewport, contexto, init, out, ruta: '/juegos.html?arcadePrueba=1', esperar: '[data-juego="karts"]' });
const marcoDe = async (p, raiz = '') => (await p.waitForSelector(raiz + ' #arcade-frame', { timeout: 30000 })).contentFrame();
const estado = fr => fr.evaluate(() => window.__karts.estado());
const r2 = v => Math.round(v * 100) / 100;

// Dedos reales por CDP: cada evento lleva todos los dedos que siguen en la pantalla.
function dedos(p) {
  let cdp = null; const vivos = {};
  const enviar = async (type, puntos) => { cdp = cdp || await p.context().newCDPSession(p); await cdp.send('Input.dispatchTouchEvent', { type, touchPoints: puntos }); };
  return {
    poner: (id, x, y) => { vivos[id] = { x, y, id }; return enviar('touchStart', Object.values(vivos)); },
    mover: (id, x, y) => { vivos[id] = { x, y, id }; return enviar('touchMove', Object.values(vivos)); },
    soltarTodo: () => { for (const k in vivos) delete vivos[k]; return enviar('touchEnd', []); },
  };
}
const centro = async (fr, sel) => { const c = await fr.locator(sel).boundingBox(); return { x: c.x + c.width / 2, y: c.y + c.height / 2 }; };
// Rectángulos (dentro del iframe) del minimapa, del HUD y de los mandos visibles.
const cajas = fr => fr.evaluate(() => {
  const r = sel => { const e = document.querySelector(sel); if (!e) return null; const s = getComputedStyle(e), b = e.getBoundingClientRect(); return b.width && s.display !== 'none' && s.visibility !== 'hidden' ? { sel, l: b.left, t: b.top, r: b.right, b: b.bottom } : null; };
  return { vw: innerWidth, vh: innerHeight, mapa: r('#minimapa'), hud: ['.hud-izq', '#h-item', '#hud .der'].map(r).filter(Boolean), ctl: ['#joy-zona', '#m-flechas', '#m-sensor', '#m-item', '#m-freno', '#m-derrape'].map(r).filter(Boolean) };
});
const cruza = (a, b) => a.l < b.r - 0.5 && b.l < a.r - 0.5 && a.t < b.b - 0.5 && b.t < a.b - 0.5;
const dentro = (a, vw, vh) => a.l >= -0.5 && a.t >= -0.5 && a.r <= vw + 0.5 && a.b <= vh + 0.5;
async function revisarLayout(fr, nombre) {
  const c = await cajas(fr);
  ok(nombre + ': mandos completos dentro de la pantalla', c.ctl.length >= 4 && c.ctl.every(x => dentro(x, c.vw, c.vh)), JSON.stringify({ vw: c.vw, vh: c.vh, ctl: c.ctl.map(x => x.sel + ':' + Math.round(x.r) + 'x' + Math.round(x.b)) }));
  ok(nombre + ': el minimapa no tapa los mandos', c.mapa && c.ctl.every(x => !cruza(c.mapa, x)) && dentro(c.mapa, c.vw, c.vh), JSON.stringify(c.mapa));
  ok(nombre + ': el HUD no tapa los mandos', c.hud.every(h => c.ctl.every(x => !cruza(h, x))));
}
async function correrRapida(fr, pista) {
  await fr.tap('[data-ir="pistas"]'); await fr.tap('[data-ir="rapida:' + pista + '"]');
  await fr.waitForFunction(() => window.__karts.estado().modo === 'carrera' && window.__karts.estado().tiempo > 400, null, { timeout: 15000 });
}

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME });
  const p = await abrir(b);
  const tarjeta = await p.textContent('[data-juego="karts"]');
  ok('catálogo: Karts Turbo con ícono y descripción', tarjeta.includes('🏎️') && tarjeta.includes('Karts Turbo') && tarjeta.includes('copa'), tarjeta);
  ok('catálogo: 6 categorías y todos los juegos de la página', (await p.$$('main h2')).length === 6 && (await p.$$('[data-juego]')).length === await p.evaluate(() => JUEGOS.length));
  const puntosAntes = await p.evaluate(() => state.totalIndividual);

  // ---- Copa: carrera 1 (teclado) ----
  await p.click('[data-juego="karts"]');
  let fr = await marcoDe(p);
  await fr.waitForSelector('#ov-menu:not(.hide)', { timeout: 30000 });
  await fr.click('[data-ir="copa-nueva"]');
  await fr.waitForFunction(() => window.__karts.estado().modo === 'carrera');
  const e0 = await estado(fr);
  ok('carrera con 8 corredores en la primera pista', e0.karts === 8 && e0.pista === 'pradera', JSON.stringify({ karts: e0.karts, pista: e0.pista }));
  await sleep(3600); // cuenta regresiva
  await fr.click('canvas', { force: true });
  await sleep(1500);
  const e1 = await estado(fr);
  ok('acelera solo tras ¡YA!', e1.vel > 150 && e1.tiempo > 1000, JSON.stringify({ vel: e1.vel, t: e1.tiempo }));
  ok('minimapa: 8 corredores con el tuyo resaltado', e1.marcasMapa === 8 && e1.yoEnMapa, JSON.stringify({ marcas: e1.marcasMapa, yo: e1.yoEnMapa }));
  await p.screenshot({ path: 'karts-390-carrera.png' });
  // Derrape largo girando hacia el mismo lado → mini-turbo morado.
  await p.keyboard.down('ArrowLeft'); await p.keyboard.down('Space'); await sleep(2500); await p.keyboard.up('Space'); await p.keyboard.up('ArrowLeft');
  await sleep(150);
  const e2 = await estado(fr);
  ok('mini-turbo morado tras derrapar 2.1 s', e2.ultimoTurbo === 'morado' && e2.turbo > 0, JSON.stringify({ ultimo: e2.ultimoTurbo, turbo: e2.turbo }));
  await fr.evaluate(() => window.__karts.adelantar());
  await fr.waitForSelector('#ov-res:not(.hide)', { timeout: 20000 });
  await fr.waitForFunction(() => /individuales|No se guardaron/.test(document.getElementById('res-guardado').textContent), null, { timeout: 20000 });
  const res = await fr.textContent('#ov-res');
  ok('resultados con tabla de la copa y puntos en ⭐ individuales', /Copa/.test(res) && res.includes('a tus ⭐ individuales') && /\+15/.test(res), res.slice(0, 200));
  ok('resultados con podio de 3 y tarjetas de tiempo, monedas y puntos', (await fr.$$('#res-podio .esc')).length === 3 && /Tu tiempo/.test(res) && /Monedas/.test(res) && /Puntos/.test(res));
  ok('el total individual sube', (await p.evaluate(() => state.totalIndividual)) > puntosAntes);
  await p.screenshot({ path: 'karts-390-resultados.png' });
  await sleep(800);
  const g1 = await progreso();
  const cc = g1.datos && g1.datos.copaEnCurso;
  ok('progreso: copa en curso en la carrera 2 con puntos', cc && cc.carrera === 1 && cc.puntos.reduce((a, x) => a + x, 0) === 58, JSON.stringify(g1.datos));

  // ---- Recargar y continuar la copa ----
  await p.reload(); await p.waitForSelector('[data-juego="karts"]', { timeout: 60000 });
  await p.click('[data-juego="karts"]');
  fr = await marcoDe(p);
  await fr.waitForSelector('#ov-menu:not(.hide)', { timeout: 30000 });
  const menu = await fr.textContent('#menu-ops');
  ok('tras recargar: «Continuar Copa Fiesta» en la carrera 2 de 4', menu.includes('Continuar Copa Fiesta') && menu.includes('Carrera 2 de 4'), menu);
  await p.screenshot({ path: 'karts-390-menu.png' });
  await fr.click('[data-ir="copa"]');
  await fr.waitForFunction(() => window.__karts.estado().modo === 'carrera');
  ok('continúa en la segunda pista (desierto)', (await estado(fr)).pista === 'desierto');
  await p.click('[data-a="salir"]').catch(() => {});

  // ---- Celular (toques reales): joystick, multitáctil, minimapa y layout a 390×844 vertical ----
  const cel = await abrir(b, { width: 390, height: 844 }, TACTIL);
  await cel.tap('[data-juego="karts"]');
  let fc = await marcoDe(cel);
  await fc.waitForSelector('#ov-menu:not(.hide)', { timeout: 30000 });
  ok('celular: selector de controles visible con Joystick por omisión', await fc.isVisible('#menu-control') && (await fc.getAttribute('[data-control="joystick"]', 'aria-pressed')) === 'true' && (await estado(fc)).tactil);
  await cel.screenshot({ path: 'karts-390-menu-controles.png' });
  await correrRapida(fc, 'pradera');
  await revisarLayout(fc, '390×844 vertical');
  const d = dedos(cel);
  const jz = await centro(fc, '#joy-zona');
  let a0 = (await estado(fc)).ang;
  await d.poner(1, jz.x, jz.y); await d.mover(1, jz.x - 15, jz.y); await sleep(250);
  const suave = await estado(fc);
  await d.mover(1, jz.x - 60, jz.y); await sleep(500);
  const fuerte = await estado(fc);
  ok('joystick: arrastre corto gira poco y arrastre largo gira al máximo (proporcional)', suave.giro < -0.1 && suave.giro > -0.4 && r2(fuerte.giro) === -1, JSON.stringify({ suave: r2(suave.giro), fuerte: r2(fuerte.giro) }));
  ok('joystick: el carro gira a la izquierda', fuerte.ang < a0 - 0.4, JSON.stringify({ antes: r2(a0), despues: r2(fuerte.ang) }));
  await cel.screenshot({ path: 'karts-390-joystick.png' });
  await d.soltarTodo(); await sleep(150);
  const suelto = await estado(fc); await sleep(300);
  const quieto = await estado(fc);
  ok('joystick: al soltar regresa al centro y deja de girar', suelto.giro === 0 && Math.abs(quieto.ang - suelto.ang) < 0.02, JSON.stringify({ giro: suelto.giro, delta: r2(quieto.ang - suelto.ang) }));
  // Zona muerta: un movimiento mínimo no gira.
  await d.poner(1, jz.x, jz.y); await d.mover(1, jz.x - 5, jz.y); await sleep(150);
  ok('joystick: zona muerta', (await estado(fc)).giro === 0);
  // Jalar hacia abajo frena.
  await d.mover(1, jz.x, jz.y + 50); await sleep(150);
  ok('joystick: jalar hacia abajo frena', (await estado(fc)).freno === true);
  await d.soltarTodo(); await sleep(400);
  // Multitáctil: joystick a la izquierda con un dedo y DERRAPE con otro durante 2.6 s.
  const dz = await centro(fc, '#m-derrape');
  await d.poner(1, jz.x, jz.y); await d.mover(1, jz.x - 60, jz.y);
  await d.poner(2, dz.x, dz.y); await sleep(1200);
  const mt = await estado(fc);
  ok('multitáctil: gira y derrapa a la vez', mt.derrape && mt.giro === -1, JSON.stringify({ derrape: mt.derrape, giro: mt.giro }));
  await sleep(1400);
  await d.soltarTodo(); await sleep(150);
  const mt2 = await estado(fc);
  ok('multitáctil: joystick + DERRAPE 2.6 s → mini-turbo morado', mt2.ultimoTurbo === 'morado', JSON.stringify({ ultimo: mt2.ultimoTurbo, vel: mt2.vel }));
  // 🎁 con toque real (sin ítem no pasa nada, pero no rompe) y la página de Juegos no se desplaza.
  const scrollAntes = await cel.evaluate(() => scrollY);
  await d.poner(3, jz.x + 10, jz.y); await d.mover(3, jz.x + 10, jz.y - 120); await d.soltarTodo();
  ok('arrastrar en la zona del joystick no desplaza la página de Juegos', (await cel.evaluate(() => scrollY)) === scrollAntes);

  // ---- Botones ◀ ▶ con toque real y preferencia guardada ----
  await fc.evaluate(() => window.__karts.adelantar());
  await fc.waitForSelector('#ov-res:not(.hide)', { timeout: 20000 });
  await fc.tap('#res-botones [data-ir="menu"]');
  await fc.tap('[data-control="botones"]');
  await cel.reload(); await cel.waitForSelector('[data-juego="karts"]', { timeout: 60000 });
  await cel.tap('[data-juego="karts"]');
  fc = await marcoDe(cel);
  await fc.waitForSelector('#ov-menu:not(.hide)', { timeout: 30000 });
  ok('preferencia: tras recargar sigue elegido «Botones»', (await fc.getAttribute('[data-control="botones"]', 'aria-pressed')) === 'true' && (await estado(fc)).control === 'botones');
  await correrRapida(fc, 'desierto');
  const bi = await centro(fc, '[data-k="izq"]');
  a0 = (await estado(fc)).ang;
  const d2 = dedos(cel);
  await d2.poner(1, bi.x, bi.y); await sleep(500);
  const eb = await estado(fc);
  await d2.soltarTodo();
  ok('botones: mantener ◀ con toque real gira a la izquierda', eb.giro === -1 && eb.ang < a0 - 0.4, JSON.stringify({ giro: eb.giro, antes: r2(a0), despues: r2(eb.ang) }));
  await revisarLayout(fc, '390×844 botones');
  await cel.screenshot({ path: 'karts-390-botones.png' });
  await cel.context().close();

  // ---- Sensor con eventos deviceorientation ----
  const inclinable = [() => {
    if (!location.pathname.endsWith('karts.html')) return;
    window.__inclinar = 0;
    setInterval(() => dispatchEvent(new DeviceOrientationEvent('deviceorientation', { alpha: 0, beta: 8, gamma: window.__inclinar })), 40);
  }];
  const sen = await abrir(b, { width: 390, height: 844 }, TACTIL, inclinable);
  await sen.tap('[data-juego="karts"]');
  const fs1 = await marcoDe(sen);
  await fs1.waitForSelector('#ov-menu:not(.hide)', { timeout: 30000 });
  await fs1.tap('[data-control="sensor"]');
  await fs1.tap('#b-activar-sensor');
  await fs1.waitForFunction(() => window.__karts.estado().sensorActivo, null, { timeout: 5000 }).catch(() => {});
  ok('sensor: se activa con las lecturas de orientación', (await estado(fs1)).sensorActivo && /Sensor listo/.test(await fs1.textContent('#ctl-estado')));
  await sen.screenshot({ path: 'karts-390-menu-sensor.png' });
  await correrRapida(fs1, 'hielo');
  await sleep(300);
  a0 = (await estado(fs1)).ang;
  await fs1.evaluate(() => { window.__inclinar = 18; });
  await sleep(600);
  const es1 = await estado(fs1);
  ok('sensor: inclinar a la derecha gira a la derecha', es1.giro > 0.5 && es1.ang > a0 + 0.3, JSON.stringify({ giro: r2(es1.giro), antes: r2(a0), despues: r2(es1.ang) }));
  await sen.screenshot({ path: 'karts-390-sensor.png' });
  await fs1.evaluate(() => { window.__inclinar = 1; }); await sleep(200);
  ok('sensor: cerca del centro (zona muerta) no gira', (await estado(fs1)).giro === 0);
  await sen.context().close();

  // Permiso negado (como en iOS) → aviso y regreso al joystick.
  const negado = [() => { if (window.DeviceOrientationEvent) window.DeviceOrientationEvent.requestPermission = () => Promise.resolve('denied'); }];
  const neg = await abrir(b, { width: 390, height: 844 }, TACTIL, negado);
  await neg.tap('[data-juego="karts"]');
  const fn = await marcoDe(neg);
  await fn.waitForSelector('#ov-menu:not(.hide)', { timeout: 30000 });
  await fn.tap('[data-control="sensor"]'); await fn.tap('#b-activar-sensor');
  await fn.waitForFunction(() => window.__karts.estado().control === 'joystick', null, { timeout: 5000 }).catch(() => {});
  const en = await estado(fn);
  ok('sensor: permiso negado → aviso amable y regreso al joystick', en.control === 'joystick' && !en.sensorActivo && /No se pudo usar el sensor/.test(await fn.textContent('#ctl-estado')), JSON.stringify({ control: en.control }));
  await neg.screenshot({ path: 'karts-390-sensor-negado.png' });
  await neg.context().close();

  // Sin giroscopio (no llegan lecturas) → a los 2 s regresa al joystick.
  const sin = await abrir(b, { width: 390, height: 844 }, TACTIL);
  await sin.tap('[data-juego="karts"]');
  const fsn = await marcoDe(sin);
  await fsn.waitForSelector('#ov-menu:not(.hide)', { timeout: 30000 });
  await fsn.tap('[data-control="sensor"]'); await fsn.tap('#b-activar-sensor');
  await sleep(800);
  const antesDe2 = await estado(fsn);
  await sleep(1900);
  const trasDe2 = await estado(fsn);
  ok('sensor: sin lecturas espera 2 s y regresa al joystick', antesDe2.control === 'sensor' && trasDe2.control === 'joystick' && /No se pudo usar el sensor/.test(await fsn.textContent('#ctl-estado')), JSON.stringify({ antes: antesDe2.control, despues: trasDe2.control }));
  await sin.context().close();

  // ---- Horizontal 844×390 y celular angosto 360×640 ----
  const hor = await abrir(b, { width: 844, height: 390 }, TACTIL);
  await hor.tap('[data-juego="karts"]');
  const fh = await marcoDe(hor);
  await fh.waitForSelector('#ov-menu:not(.hide)', { timeout: 30000 });
  await correrRapida(fh, 'volcan');
  await revisarLayout(fh, '844×390 horizontal');
  const jh = await centro(fh, '#joy-zona');
  a0 = (await estado(fh)).ang;
  const d3 = dedos(hor);
  await d3.poner(1, jh.x, jh.y); await d3.mover(1, jh.x + 60, jh.y); await sleep(500);
  const eh = await estado(fh);
  ok('horizontal: el joystick gira a la derecha', eh.giro === 1 && eh.ang > a0 + 0.4, JSON.stringify({ giro: eh.giro }));
  await hor.screenshot({ path: 'karts-844-horizontal.png' });
  await d3.soltarTodo();
  await hor.context().close();

  const ang = await abrir(b, { width: 360, height: 640 }, TACTIL);
  await ang.tap('[data-juego="karts"]');
  const fa = await marcoDe(ang);
  await fa.waitForSelector('#ov-menu:not(.hide)', { timeout: 30000 });
  await correrRapida(fa, 'pradera');
  await revisarLayout(fa, '360×640 vertical');
  await ang.screenshot({ path: 'karts-360-vertical.png' });
  await ang.context().close();

  // ---- Escritorio ----
  const escr = await abrir(b, { width: 1280, height: 800 });
  await escr.click('[data-juego="karts"]');
  const fe = await marcoDe(escr);
  await fe.waitForSelector('#ov-menu:not(.hide)', { timeout: 30000 });
  ok('escritorio: sin mandos táctiles ni selector, con ayuda del teclado', !(await fe.isVisible('#mandos')) && !(await fe.isVisible('#menu-control')) && await fe.isVisible('#teclas'), JSON.stringify({ tactil: (await estado(fe)).tactil }));
  await fe.click('[data-ir="pistas"]'); await fe.click('[data-ir="rapida:volcan"]');
  await fe.waitForFunction(() => window.__karts.estado().modo === 'carrera');
  await sleep(5000);
  const ee = await estado(fe);
  ok('escritorio: vista ancha y 60 cuadros por segundo', ee.lw > 400 && ee.fps >= 50, JSON.stringify({ lw: ee.lw, fps: ee.fps }));
  await escr.screenshot({ path: 'karts-escritorio.png' });
  await escr.context().close();

  // ---- Partida en sala con bots fantasma ----
  const vAntes = (await progreso()).v;
  await p.click('[data-tab="partidas"]'); await p.waitForSelector('#f-crear');
  await p.selectOption('#p-juego', 'karts'); await p.selectOption('#p-mapa', 'hielo');
  await p.click('#f-crear button[type=submit]'); await p.waitForSelector('[data-p="empezar"]', { timeout: 30000 });
  await p.click('[data-p="empezar"]');
  const fsala = await marcoDe(p, '#p-body');
  await fsala.waitForFunction(() => window.__karts && window.__karts.estado().sala && window.__karts.estado().modo === 'carrera', null, { timeout: 30000 });
  const es = await estado(fsala);
  ok('sala: la pista elegida (hielo) con 2 fantasmas', es.pista === 'hielo' && es.karts === 3, JSON.stringify({ pista: es.pista, karts: es.karts }));
  await sleep(9000);
  const es2 = await estado(fsala);
  ok('sala: el minimapa muestra a los 2 fantasmas y a ti', es2.marcasMapa === 3 && es2.yoEnMapa, JSON.stringify({ marcas: es2.marcasMapa }));
  await p.screenshot({ path: 'karts-390-sala.png' });
  await sleep(8000);
  await fsala.evaluate(() => window.__karts.adelantar());
  await p.waitForSelector('#p-body .result', { timeout: 30000 });
  await sleep(1500);
  const podio = await p.textContent('#p-body');
  ok('podio con bots y tiempos', /BOT-VACHIRA/.test(podio) && /BOT-ISAGII/.test(podio) && /Tiempos/.test(podio), podio.slice(0, 200));
  ok('puntos de sala en 👥 partidas', /a tus puntos de partidas/.test(await p.textContent('#p-guardado')), await p.textContent('#p-guardado'));
  await p.screenshot({ path: 'karts-390-podio.png', fullPage: true });
  ok('la partida no guarda progreso', (await progreso()).v === vAntes);

  await b.close();
  console.log(out.join('\n')); process.exit(out.some(x => x.startsWith('FAIL')) ? 1 : 0);
})().catch(e => { console.log(out.join('\n')); console.error('ERROR', e.message.slice(0, 400)); process.exit(2); });
