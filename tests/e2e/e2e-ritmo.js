// E2E ritmo más lento (ajuste del profe): con el tiempo real, la baza de la Brisca y el resultado del póker se ven ~4 s más.
require('./lib/entorno'); // BASE, API, DATOS, DATA, CHROME, carpeta de salida y sesión de prueba en fetch
const { chromium } = require('playwright');
const BASE = process.env.BASE, API = process.env.API;
const Q = '?api=' + encodeURIComponent(API);
const out = []; const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`);
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME });
  const ctx = await b.newContext({ viewport: { width: 390, height: 900 } });
  await ctx.addInitScript(() => (localStorage.setItem('stald_email', 'marisol@example.com'), localStorage.setItem('stald_sesion_prueba', JSON.stringify({ email: 'marisol@example.com', token: 'prueba:' + 'marisol@example.com' }))));
  const p = await ctx.newPage(); p.on('pageerror', e => out.push('FAIL error JS: ' + e.message));
  await p.goto(BASE + '/juegos.html' + Q); await p.waitForSelector('[data-juego]', { timeout: 60000 });
  // Brisca individual contra 1 bot: tiro yo, responde el bot y la baza completa sigue a la vista ≥ 4 s
  await p.click('[data-juego="brisca"]'); await p.click('[data-br-modo="1"]'); await p.click('[data-br-go]');
  await p.waitForSelector('.es-btn.jugable[data-br-carta]', { timeout: 15000 }).catch(() => {});
  if (!(await p.$('.es-btn.jugable[data-br-carta]'))) await p.waitForSelector('.es-btn.jugable[data-br-carta]', { timeout: 15000 });
  await p.click('.es-btn.jugable[data-br-carta]');
  await p.waitForFunction(() => document.querySelectorAll('.es-baza figure').length === 2, null, { timeout: 10000 });
  const t0 = Date.now();
  await p.waitForFunction(() => document.querySelectorAll('.es-baza figure').length !== 2 || !!document.querySelector('.es-btn.jugable'), null, { timeout: 15000 });
  const visible = Date.now() - t0;
  ok('Brisca individual: la baza completa se ve ~5 s (antes 1.3 s)', visible >= 4500, visible + ' ms');
  // Póker individual: el resultado de la mano se queda ~10 s antes de avanzar solo
  await p.goto(BASE + '/juegos.html' + Q); await p.waitForSelector('[data-juego]');
  await p.click('[data-juego="poker"]'); await p.click('[data-pk-bots="1"]'); await p.click('[data-pk-go]');
  const t1 = Date.now();
  while (Date.now() - t1 < 60000 && !(await p.$('[data-pk-sig]'))) { const r = await p.$('[data-pk="retirarse"]'); if (r) await r.click().catch(() => {}); await sleep(300); }
  const tFin = Date.now(); await p.waitForFunction(() => !document.querySelector('[data-pk-sig]'), null, { timeout: 20000 });
  const pausa = Date.now() - tFin;
  ok('Póker individual: el resultado de la mano se ve ~10 s (antes 6 s)', pausa >= 9000, pausa + ' ms');
  await b.close();
  console.log(out.join('\n')); process.exit(out.some(x => x.startsWith('FAIL')) ? 1 : 0);
})().catch(e => { console.log(out.join('\n')); console.error('ERROR', e.message.slice(0, 300)); process.exit(2); });
