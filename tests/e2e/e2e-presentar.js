// E2E: «Presentar» con clases anteriores (openspec: presentar-anteriores). La clase anterior de prueba
// (meet-2026-09-27) viene de tests/fixtures/datos y es exclusiva de nadie: solo la ve el admin.
require('./lib/entorno'); // BASE, API, CHROME y carpeta de salida
const { chromium } = require('playwright');
const { abrirPagina } = require('./lib/navegador');
const out = []; const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`);

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME });
  const p = await abrirPagina(b, { email: 'admin@example.com', out, viewport: { width: 1280, height: 800 }, ruta: '/ingles.html#presentar', esperar: '#pres-semana' });
  const semana = (await p.textContent('#pres-semana')).replace(/\s+/g, ' ');
  ok('«Esta semana» con el Meet de la semana', semana.includes('Esta semana') && !!(await p.$('#pres-semana [data-action="presentar"]')), semana.slice(0, 120));
  await p.waitForSelector('#pres-anteriores', { timeout: 15000 });
  const ant = (await p.textContent('#pres-anteriores')).replace(/\s+/g, ' ');
  ok('«Clases anteriores» con la clase de prueba', ant.includes('Clases anteriores') && ant.includes('clase anterior de prueba'), ant.slice(0, 160));
  ok('aviso para grupos nuevos', ant.includes('grupo nuevo'));
  await p.click('#pres-anteriores [data-action="presentar"][data-id="meet-2026-09-27"]');
  await p.waitForSelector('.deck', { timeout: 15000 });
  ok('presentar una clase anterior abre sus diapositivas', (await p.textContent('#deck-stage')).includes('Clase anterior de prueba'));
  await p.click('[data-deck="exit"]');
  await p.click('#pres-anteriores [data-action="abrir-guion"][data-id="meet-2026-09-27"]');
  await p.waitForFunction(() => document.body.innerText.includes('Bienvenida'), null, { timeout: 15000 }).then(() => ok('guion de una clase anterior', true), () => ok('guion de una clase anterior', false));
  await p.screenshot({ path: 'presentar-anteriores.png', fullPage: true });
  await b.close();
  console.log(out.join('\n')); process.exit(out.some(x => x.startsWith('FAIL')) ? 1 : 0);
})().catch(e => { console.log(out.join('\n')); console.error('ERROR', e.message.slice(0, 400)); process.exit(2); });
