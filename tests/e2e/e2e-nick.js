// E2E: nick de jugador (openspec: nick-jugadores). Una alumna pone su nick en «Tu avatar», lo ve en el chip y en el
// ranking, el admin lo ve en «Jugadores», y al quitarlo vuelve su nombre.
require('./lib/entorno'); // BASE, API, CHROME, carpeta de salida y sesión de prueba en fetch
const { chromium } = require('playwright');
const BASE = process.env.BASE;
const API = process.env.API;
const out = []; const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`);

async function pagina(b, email, ruta) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(e => { localStorage.setItem('stald_sesion_prueba', JSON.stringify({ email: e, token: 'prueba:' + e })); }, email);
  const p = await ctx.newPage(); p.on('pageerror', e => out.push('FAIL error JS (' + email + '): ' + e.message));
  await p.goto(BASE + ruta + (ruta.includes('?') ? '&' : '?') + 'api=' + encodeURIComponent(API));
  return p;
}

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME });
  const al = await pagina(b, 'marisol@example.com', '/juegos.html?avatar=1');
  await al.waitForSelector('#av-nick', { timeout: 60000 });
  ok('avatar: campo de nick con su nombre de sugerencia', (await al.getAttribute('#av-nick', 'placeholder')) === 'Marisol');
  await al.fill('#av-nick', 'x'); await al.click('[data-nick-guardar]');
  ok('nick inválido avisa', (await al.textContent('#nick-msg')).includes('de 2 a 20'));
  await al.fill('#av-nick', 'Mari Star');
  await al.click('[data-av-emoji]:not([aria-pressed="true"])'); // elegir personaje redibuja la pantalla
  ok('el nick escrito se conserva al redibujar', (await al.inputValue('#av-nick')) === 'Mari Star');
  await al.click('[data-nick-guardar]'); await al.waitForFunction(() => document.getElementById('nick-msg').textContent.includes('Mari Star'), null, { timeout: 15000 });
  ok('chip con el nick', (await al.textContent('#chip')).includes('Mari Star'));
  const yo = await al.evaluate(async api => (await (await fetch(api + '/juegos/yo', { headers: { Authorization: 'Bearer prueba:marisol@example.com' } })).json()).jugador, API);
  ok('servidor: nombre = nick y nombreReal = Marisol', yo.nombre === 'Mari Star' && yo.nombreReal === 'Marisol', JSON.stringify(yo).slice(0, 120));

  const ad = await pagina(b, 'admin@example.com', '/juegos.html');
  await ad.waitForSelector('[data-tab="jugadores"]', { timeout: 60000 });
  await ad.click('[data-tab="jugadores"]'); await ad.waitForSelector('#jug-tabla', { timeout: 30000 });
  const fila = await ad.$eval('#jug-tabla', t => [...t.querySelectorAll('tr')].map(r => r.textContent).find(x => x.includes('marisol@example.com')) || '');
  ok('admin: Marisol con su nick', fila.includes('Marisol') && fila.includes('Mari Star'), fila.replace(/\s+/g, ' '));

  await al.fill('#av-nick', ''); await al.click('[data-nick-guardar]');
  await al.waitForFunction(() => document.getElementById('nick-msg').textContent.includes('tu nombre'), null, { timeout: 15000 });
  ok('quitar el nick: vuelve su nombre en el chip', (await al.textContent('#chip')).includes('Marisol') && !(await al.textContent('#chip')).includes('Mari Star'));

  await b.close();
  console.log(out.join('\n')); process.exit(out.some(x => x.startsWith('FAIL')) ? 1 : 0);
})().catch(e => { console.log(out.join('\n')); console.error('ERROR', e.message.slice(0, 400)); process.exit(2); });
