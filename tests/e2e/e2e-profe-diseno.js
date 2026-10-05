// E2E profe-diseno: encabezado, Pendiente ahora, pestañas recordadas, acordeón y dos columnas en escritorio.
require('./lib/entorno'); // BASE, API, DATOS, DATA, CHROME, carpeta de salida y sesión de prueba en fetch
const { chromium } = require('playwright');
const API = process.env.API, BASE = process.env.BASE;
const URL = BASE + '/ingles.html?modo=profe&api=' + encodeURIComponent(API);
const out = []; const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`);
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME });
  // Escritorio
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript(() => (localStorage.setItem('stald_email', 'admin@example.com'), localStorage.setItem('stald_sesion_prueba', JSON.stringify({ email: 'admin@example.com', token: 'prueba:' + 'admin@example.com' }))));
  const p = await ctx.newPage(); p.on('pageerror', e => out.push('FAIL error JS: ' + e.message));
  await p.goto(URL);
  const hero = await p.waitForSelector('.pf-hero', { timeout: 15000 }).catch(() => null);
  ok('encabezado de progreso con contadores y barra del mes', !!hero && (await p.$$('.pf-hero .pf-stat')).length === 4 && !!(await p.$('.pf-hero .progress-bar')));
  const urg = await p.textContent('#pf-urgente').catch(() => '');
  ok('Pendiente ahora con etiquetas Ruta y Grupo', /Pendiente ahora/.test(urg) && /Ruta/.test(urg) && /Grupo/.test(urg), urg.replace(/\s+/g, ' ').slice(0, 140));
  ok('4 pestañas con "Esta semana" activa', (await p.$$('[role="tab"][data-pf-tab]')).length === 4 && (await p.getAttribute('[data-pf-tab="semana"]', 'aria-selected')) === 'true');
  const col = await p.evaluate(() => { const m = document.querySelector('.pf-main').getBoundingClientRect(), s = document.querySelector('.pf-side').getBoundingClientRect(); return { lado: s.left > m.right - 1, ancho: document.body.getBoundingClientRect().width }; });
  ok('escritorio: dos columnas y página ancha', col.lado && col.ancho > 1000, JSON.stringify(col));
  await p.click('[data-pf-tab="plan"]');
  ok('pestaña Plan sin recargar: acordeón con solo la semana actual abierta', await p.isVisible('#ruta-plan') && (await p.$$('.ruta-sem[open]')).length === 1 && !!(await p.$('.ruta-sem.actual[open]')) && (await p.$$('.ruta-sem')).length === 5);
  ok('cada semana muestra su avance x/y', (await p.$$eval('.ruta-sem summary .pf-avance', xs => xs.filter(x => /\d+\/\d+/.test(x.textContent)).length)) === 5);
  await p.click('[data-pf-tab="grupo"]');
  ok('pestaña Mi grupo muestra #grupo-profe', await p.isVisible('#grupo-profe'));
  await p.screenshot({ path: 'profe-despues-escritorio.png', fullPage: true });
  await p.reload(); await p.waitForSelector('.pf-hero');
  ok('se recuerda la pestaña al volver', (await p.getAttribute('[data-pf-tab="grupo"]', 'aria-selected')) === 'true' && await p.isVisible('#grupo-profe'));
  await p.click('[data-pf-tab="semana"]');
  const alto = await p.evaluate(() => document.body.scrollHeight);
  ok('escritorio: más corta que antes (3,579 px)', alto < 2600, alto + ' px');
  await p.click('[data-pf-tab="hechas"]');
  ok('pestaña Hechas con resultados', (await p.$$('[data-pf-panel="hechas"] [data-action="ver-resultado"]')).length >= 1);
  await ctx.close();
  // Celular
  const cm = await b.newContext({ viewport: { width: 390, height: 860 } });
  await cm.addInitScript(() => { (localStorage.setItem('stald_email', 'admin@example.com'), localStorage.setItem('stald_sesion_prueba', JSON.stringify({ email: 'admin@example.com', token: 'prueba:' + 'admin@example.com' }))); localStorage.removeItem('profe_tab'); });
  const m = await cm.newPage(); await m.goto(URL); await m.waitForSelector('.pf-hero');
  const mv = await m.evaluate(() => ({ scrollX: document.documentElement.scrollWidth <= window.innerWidth + 1, abajo: document.querySelector('.pf-side').getBoundingClientRect().top > document.querySelector('.pf-main').getBoundingClientRect().bottom - 1 }));
  ok('celular: una columna, sin desplazamiento horizontal', mv.scrollX && mv.abajo, JSON.stringify(mv));
  await m.screenshot({ path: 'profe-despues-movil.png', fullPage: true });
  console.log('alto celular', await m.evaluate(() => document.body.scrollHeight));
  await b.close();
  console.log(out.join('\n')); process.exit(out.some(x => x.startsWith('FAIL')) ? 1 : 0);
})().catch(e => { console.log(out.join('\n')); console.error('ERROR', e.message.slice(0, 300)); process.exit(2); });
