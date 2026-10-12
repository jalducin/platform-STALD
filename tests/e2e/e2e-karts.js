// E2E: «Karts Turbo» (openspec: juegos-plataformas-karts).
// Catálogo, carrera 1 de la Copa Fiesta con 8 corredores (manejo con teclado y mini-turbo morado), puntos en ⭐
// individuales, copa en curso guardada en el servidor y recuperada tras recargar, y carrera en sala con bots
// fantasma: podio por tiempo sin tocar el progreso. Capturas a 390 px y en escritorio. Usa ?arcadePrueba=1.
require('./lib/entorno'); // BASE, API, CHROME, carpeta de salida y sesión de prueba en fetch
const { chromium } = require('playwright');
const { abrirPagina } = require('./lib/navegador');
const API = process.env.API;
const out = []; const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const EMAIL = 'angel@example.com';
const progreso = async () => (await fetch(API + '/juegos/progreso/karts?email=' + encodeURIComponent(EMAIL))).json();
const abrir = (b, viewport) => abrirPagina(b, { email: EMAIL, viejo: true, viewport, out, ruta: '/juegos.html?arcadePrueba=1', esperar: '[data-juego="karts"]' });
const marcoDe = async (p, raiz = '') => (await p.waitForSelector(raiz + ' #arcade-frame', { timeout: 30000 })).contentFrame();
const estado = fr => fr.evaluate(() => window.__karts.estado());

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME });
  const p = await abrir(b);
  const tarjeta = await p.textContent('[data-juego="karts"]');
  ok('catálogo: Karts Turbo con ícono y descripción', tarjeta.includes('🏎️') && tarjeta.includes('Karts Turbo') && tarjeta.includes('copa'), tarjeta);
  ok('catálogo: 6 categorías y 29 juegos', (await p.$$('main h2')).length === 6 && (await p.$$('[data-juego]')).length === 29);
  const puntosAntes = await p.evaluate(() => state.totalIndividual);

  // ---- Copa: carrera 1 ----
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

  // ---- Escritorio ----
  const esc = await abrir(b, { width: 1280, height: 800 });
  await esc.click('[data-juego="karts"]');
  const fe = await marcoDe(esc);
  await fe.waitForSelector('#ov-menu:not(.hide)', { timeout: 30000 });
  await fe.click('[data-ir="pistas"]'); await fe.click('[data-ir="rapida:volcan"]');
  await fe.waitForFunction(() => window.__karts.estado().modo === 'carrera');
  await sleep(5000);
  ok('escritorio: vista ancha', (await estado(fe)).lw > 400);
  await esc.screenshot({ path: 'karts-escritorio.png' });
  await esc.context().close();

  // ---- Partida en sala con bots fantasma ----
  const vAntes = (await progreso()).v;
  await p.click('[data-tab="partidas"]'); await p.waitForSelector('#f-crear');
  await p.selectOption('#p-juego', 'karts'); await p.selectOption('#p-mapa', 'hielo');
  await p.click('#f-crear button[type=submit]'); await p.waitForSelector('[data-p="empezar"]', { timeout: 30000 });
  await p.click('[data-p="empezar"]');
  const fs = await marcoDe(p, '#p-body');
  await fs.waitForFunction(() => window.__karts && window.__karts.estado().sala && window.__karts.estado().modo === 'carrera', null, { timeout: 30000 });
  const es = await estado(fs);
  ok('sala: la pista elegida (hielo) con 2 fantasmas', es.pista === 'hielo' && es.karts === 3, JSON.stringify({ pista: es.pista, karts: es.karts }));
  await sleep(9000);
  await p.screenshot({ path: 'karts-390-sala.png' });
  await sleep(8000);
  await fs.evaluate(() => window.__karts.adelantar());
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
