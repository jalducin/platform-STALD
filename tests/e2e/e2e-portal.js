// E2E del portal: login, tarjetas por acceso, sesión compartida, desconocido, cerrar sesión, Secundaria.
// BASE/API por entorno; ALUMNA/ADMIN/SECUNDARIA para correos (por defecto, los del fixture local).
require('./lib/entorno'); // BASE, API, DATOS, DATA, CHROME, carpeta de salida y sesión de prueba en fetch
const { chromium } = require('playwright');
const BASE = process.env.BASE;
const Q = process.env.API ? '?api=' + encodeURIComponent(process.env.API) : '';
const ALUMNA = process.env.ALUMNA || 'marisol@example.com';
const NOMBRE = process.env.NOMBRE || 'Marisol';
const ADMIN = process.env.ADMIN || 'admin@example.com';
const SEC = process.env.SECUNDARIA || 'valeria@example.com';
const out = []; const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`);
const tiles = p => p.$$eval('#tiles [data-espacio]', xs => xs.map(x => x.dataset.espacio + (x.classList.contains('soon') ? '(pronto)' : '')));

async function entrar(p, email) {
  await p.goto(BASE + '/' + Q); await p.waitForSelector('#login:not([hidden]), #home:not([hidden])');
  if (await p.$('#home:not([hidden])')) { await p.click('#logout'); }
  await p.fill('#email', email); await p.click('#login-btn');
  // Enlace mágico simulado (plataforma-login): paso del código con el verificador falso local.
  await p.waitForSelector('#code-form:not([hidden])'); await p.fill('#code', '123456'); await p.click('#code-btn');
  await p.waitForSelector('#home:not([hidden]), #login-error:not([hidden])', { timeout: 60000 });
}

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME });
  let ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); let p = await ctx.newPage();
  const noGet = []; p.on('request', r => { if (!['GET', 'OPTIONS'].includes(r.method())) noGet.push(r.method() + ' ' + r.url()); });
  await p.goto(BASE + '/' + Q);
  ok('sin sesión: formulario de correo', await p.isVisible('#login'));
  await p.screenshot({ path: 'portal-login.png' });
  await p.fill('#email', 'no-es-correo'); await p.click('#login-btn');
  ok('correo inválido: aviso', (await p.textContent('#login-error')).includes('correo válido'));
  await entrar(p, 'nadie@example.com');
  ok('desconocido: mensaje claro y sigue en login', await p.isVisible('#login') && (await p.textContent('#login-error')).includes('No encontré'));
  await entrar(p, ALUMNA);
  ok('alumna: saludo con nombre', (await p.textContent('#hello')).includes(NOMBRE));
  ok('alumna: tarjetas Inglés + Juegos (pronto)', JSON.stringify(await tiles(p)) === '["ingles","juegos"]', (await tiles(p)).join(','));
  ok('alumna: sin etiqueta de maestro', await p.$eval('#admin-tag', e => e.hidden));
  await p.screenshot({ path: 'portal-home.png', fullPage: true });
  await p.click('#tiles a[data-espacio="ingles"]');
  await p.waitForSelector('#app', { state: 'visible', timeout: 90000 });
  ok('Inglés entra sin volver a pedir el correo', !(await p.isVisible('#login')));
  ok('Inglés tiene "← Inicio"', !!(await p.$('a.home-link[href^="./"]')));
  await p.click('a.home-link'); await p.waitForSelector('#home:not([hidden])', { timeout: 60000 });
  ok('← Inicio regresa al portal con sesión', (await p.textContent('#hello')).includes(NOMBRE));
  await p.click('#tiles a[data-espacio="ingles"]'); await p.waitForSelector('#app', { state: 'visible', timeout: 90000 });
  // Cerrar sesión en Inglés lo integra el Sprint 2 (ingles.html); aquí se cierra desde el portal.
  await p.click('a.home-link'); await p.waitForSelector('#home:not([hidden])', { timeout: 60000 });
  await p.click('#logout');
  await p.goto(BASE + '/' + Q); await p.waitForSelector('#login:not([hidden]), #home:not([hidden])');
  ok('cerrar sesión en el portal: pide correo al volver', await p.isVisible('#login'));
  ok('sin envíos (solo lectura)', noGet.length === 0, noGet.join(' | ')); // el código de prueba no llama al servidor
  await ctx.close();

  // Sesión recordada de una página vieja (solo ingles_email)
  ctx = await b.newContext(); p = await ctx.newPage();
  await p.goto(BASE + '/' + Q); await p.evaluate(e => localStorage.setItem('ingles_email', e), ALUMNA);
  await p.reload(); await p.waitForSelector('#home:not([hidden])', { timeout: 60000 }).catch(() => {});
  ok('sesión recordada de Inglés: entra sola', await p.isVisible('#home'));
  await ctx.close();

  // Admin
  ctx = await b.newContext({ viewport: { width: 1280, height: 800 } }); p = await ctx.newPage();
  await entrar(p, ADMIN);
  ok('admin: 4 tarjetas (con Mi ruta, cambio ruta-profe) y Modo maestro', JSON.stringify(await tiles(p)) === '["ingles","profe","secundaria","juegos"]' && !(await p.$eval('#admin-tag', e => e.hidden)), (await tiles(p)).join(','));
  await p.screenshot({ path: 'portal-admin.png' });
  await ctx.close();

  // Solo Secundaria
  ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); p = await ctx.newPage();
  await entrar(p, SEC);
  ok('Secundaria: tarjetas Secundaria + Juegos', JSON.stringify(await tiles(p)) === '["secundaria","juegos"]', (await tiles(p)).join(','));
  await p.click('#tiles a[data-espacio="secundaria"]');
  await p.waitForSelector('#app', { state: 'visible', timeout: 90000 }).catch(() => {});
  ok('secundaria.html entra sola y muestra tareas', await p.isVisible('#app') && (await p.$$('#content .row, #content-recent .row')).length > 0);
  ok('secundaria.html tiene "← Inicio"', !!(await p.$('a.home-link[href^="./"]')));
  await ctx.close();
  await b.close();
  console.log(out.join('\n')); process.exit(out.some(x => x.startsWith('FAIL')) ? 1 : 0);
})().catch(e => { console.log(out.join('\n')); console.error('ERROR', e.message.slice(0, 300)); process.exit(2); });
