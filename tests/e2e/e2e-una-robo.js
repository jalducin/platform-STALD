// E2E ¡Una! robo de cartas (ajuste del profe): partida de puro robar que vacía el mazo; cada robo suma 1 carta o pasa el turno.
require('./lib/entorno'); // BASE, API, DATOS, DATA, CHROME, carpeta de salida y sesión de prueba en fetch
const { chromium } = require('playwright');
const BASE = process.env.BASE, API = process.env.API;
const Q = '?api=' + encodeURIComponent(API);
const out = []; const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`);
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME });
  const ctx = await b.newContext({ viewport: { width: 390, height: 900 } });
  await ctx.addInitScript(() => { window.__TIEMPO_JUEGOS = 0.04; (localStorage.setItem('stald_email', 'marisol@example.com'), localStorage.setItem('stald_sesion_prueba', JSON.stringify({ email: 'marisol@example.com', token: 'prueba:' + 'marisol@example.com' }))); });
  const p = await ctx.newPage(); const errores = []; p.on('pageerror', e => errores.push(e.message));
  await p.goto(BASE + '/juegos.html' + Q); await p.waitForSelector('[data-juego]', { timeout: 60000 });
  await p.click('[data-juego="una"]'); await p.click('[data-una-bots="3"]'); await p.click('[data-una-go]');
  await p.waitForSelector('.una-mano');
  let robos = 0, malos = 0, sinCartas = 0, deshabilitado = 0, pasadas = 0; const detalle = [];
  const t0 = Date.now();
  let partidas = 1;
  while (Date.now() - t0 < 240000 && robos < 60) {
    if (await p.$('.result h1')) { // la ganó un bot: otra partida
      await p.click('.result [data-juego="una"]').catch(() => {}); await p.waitForSelector('[data-una-go]').catch(() => {});
      await p.click('[data-una-bots="3"]').catch(() => {}); await p.click('[data-una-go]').catch(() => {}); partidas++; await sleep(100); continue;
    }
    const robar = await p.$('[data-una="robar"]:not([disabled])');
    if (robar) {
      const antes = await p.$$eval('.una-mano .una-btn', x => x.length);
      await robar.click().catch(() => {}); await sleep(30);
      const despues = await p.$$eval('.una-mano .una-btn', x => x.length).catch(() => antes);
      const msg = await p.textContent('#una-msg').catch(() => '');
      robos++;
      if (despues === antes + 1) { /* llegó exactamente una carta */ }
      else if (despues === antes && /No quedan cartas/.test(msg)) sinCartas++;
      else { malos++; if (detalle.length < 3) detalle.push(antes + '→' + despues + ' ' + msg.slice(0, 60)); }
      const pasar = await p.$('[data-una="pasar"]'); if (pasar) { await pasar.click().catch(() => {}); pasadas++; }
      continue;
    }
    if (await p.$('[data-una="robar"][disabled]')) {
      const txt = await p.textContent('[data-una="robar"]').catch(() => '');
      if (/\(0\)/.test(txt)) deshabilitado++;
    }
    const pasar = await p.$('[data-una="pasar"]'); if (pasar) { await pasar.click().catch(() => {}); pasadas++; continue; }
    await sleep(40);
  }
  ok('cada robo suma exactamente 1 carta o avisa que no quedan', malos === 0 && robos >= 60, `partidas=${partidas} robos=${robos} malos=${malos} sinCartas=${sinCartas} ${detalle.join(' | ')}`);
  ok('sin errores de JS en la partida larga', errores.length === 0, errores.slice(0, 2).join(' | '));
  ok('las partidas avanzan sin trabarse', robos >= 60, `deshabilitado(0)=${deshabilitado} pasadas=${pasadas}`);
  await b.close();
  console.log(out.join('\n')); process.exit(out.some(x => x.startsWith('FAIL')) ? 1 : 0);
})().catch(e => { console.log(out.join('\n')); console.error('ERROR', e.message.slice(0, 300)); process.exit(2); });
