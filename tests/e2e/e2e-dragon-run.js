// E2E: Dragon Run (openspec: dragon-run). Integración con Juegos, guardado en ⭐ individuales, doble salto y música propia.
require('./lib/entorno'); // BASE, API, DATOS, DATA, CHROME, carpeta de salida y sesión de prueba en fetch
const { chromium } = require('playwright');
const BASE = process.env.BASE;
const API = process.env.API;
const out = []; const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`);
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME, args: ['--autoplay-policy=no-user-gesture-required'] });
  // 1) Sola: doble salto, no un tercero; su música arranca; sin plataforma no envía nada
  const sola = await (await b.newContext()).newPage(); sola.on('pageerror', e => out.push('FAIL error JS (sola): ' + e.message));
  await sola.goto(BASE + '/juegos/dragon-run.html');
  await sola.click('#bS'); await sleep(300);
  const s0 = await sola.evaluate(() => window.__dragon);
  await sola.evaluate(() => { window.__saltar(); window.__saltar(); window.__saltar(); });
  const s1 = await sola.evaluate(() => window.__dragon);
  ok('sola: arranca a jugar', s0.st === 'play');
  ok('doble salto: 2 saltos en el aire, no 3', s1.saltos === 2 && s1.air, JSON.stringify(s1));
  ok('el juego trae su propia música (melodía sonando)', await sola.evaluate(() => typeof mi !== 'undefined' && mi !== null));
  ok('texto de inicio menciona el doble salto', (await sola.textContent('#ovS')).includes('doble salto'));

  // 2) En Juegos: modo auto juega y termina; se guarda en ⭐ individuales
  const ctx = await b.newContext({ viewport: { width: 900, height: 900 } });
  await ctx.addInitScript(() => (localStorage.setItem('stald_email', 'marisol@example.com'), localStorage.setItem('stald_sesion_prueba', JSON.stringify({ email: 'marisol@example.com', token: 'prueba:' + 'marisol@example.com' }))));
  const p = await ctx.newPage(); p.on('pageerror', e => out.push('FAIL error JS (juegos): ' + e.message));
  await p.goto(BASE + '/juegos.html?dragonAuto=1&api=' + encodeURIComponent(API));
  await p.waitForSelector('[data-juego="dragon-run"]', { timeout: 60000 });
  ok('Dragon Run en Mente ágil', (await p.textContent('[data-juego="dragon-run"]')).includes('Dragon Run'));
  const antes = await p.evaluate(() => state.totalIndividual);
  await p.click('[data-juego="dragon-run"]');
  const fr = await (await p.waitForSelector('#dragon-frame', { timeout: 20000 })).contentFrame();
  await fr.waitForSelector('#bS'); await fr.click('#bS');
  await sleep(1500);
  ok('juego corriendo dentro de Juegos', (await fr.evaluate(() => window.__dragon.st)) === 'play');
  await p.waitForSelector('.result', { timeout: 150000 });
  await p.waitForFunction(() => /a tus individuales|No se guardaron/.test((document.querySelector('.result') || {}).textContent || ''), null, { timeout: 30000 });
  const res = await p.textContent('.result');
  const pts = Number((await p.textContent('.result .score')).replace(/[^0-9]/g, ''));
  const desp = await p.evaluate(() => state.totalIndividual);
  ok('al terminar se guarda en ⭐ individuales', res.includes('a tus individuales') && desp === antes + pts && pts > 0, `${antes} + ${pts} = ${desp}`);
  ok('resultado con metros y monedas', /📏 \d+ m · 🪙 \d+ monedas/.test(res), res.slice(0, 160));
  await p.screenshot({ path: 'dragon-resultado.png' });
  // 3) Un mensaje falso desde otra ventana no guarda nada
  await p.click('[data-juego="dragon-run"]'); await p.waitForSelector('#dragon-frame');
  await p.evaluate(() => window.postMessage({ juego: 'dragon-run', fin: true, gano: true, puntos: 2000, monedas: 0, metros: 600, segundos: 1 }, '*'));
  await sleep(1200);
  ok('mensaje que no viene del juego se ignora', !(await p.$('.result')) && !!(await p.$('#dragon-frame')));
  await b.close();
  console.log(out.join('\n')); process.exit(out.some(x => x.startsWith('FAIL')) ? 1 : 0);
})().catch(e => { console.log(out.join('\n')); console.error('ERROR', e.message.slice(0, 400)); process.exit(2); });
