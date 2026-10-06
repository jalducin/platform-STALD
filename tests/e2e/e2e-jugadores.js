// E2E: pestaña «Jugadores» del admin en Juegos (openspec: jugadores-admin). Las cuentas de acceso salen de la clave
// `cuentas` del fixture (una sin confirmar y otra sin apodo). En local no hay Supabase: el enlace responde
// auth_no_disponible, así que se comprueba que la petición pide destino «juegos» y que el aviso se muestra.
require('./lib/entorno'); // BASE, API, CHROME, carpeta de salida y sesión de prueba en fetch
const { chromium } = require('playwright');
const BASE = process.env.BASE;
const API = process.env.API;
const out = []; const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`);

async function pagina(b, email) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(e => { localStorage.setItem('stald_sesion_prueba', JSON.stringify({ email: e, token: 'prueba:' + e })); }, email);
  const p = await ctx.newPage(); p.on('pageerror', e => out.push('FAIL error JS (' + email + '): ' + e.message));
  await p.goto(BASE + '/juegos.html?api=' + encodeURIComponent(API));
  await p.waitForSelector('[data-tab]', { timeout: 60000 });
  return p;
}

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME });

  const al = await pagina(b, 'marisol@example.com');
  ok('alumna: sin pestaña Jugadores', !(await al.$('[data-tab="jugadores"]')));
  const r = await al.evaluate(async api => (await fetch(api + '/juegos/jugadores', { headers: { Authorization: 'Bearer prueba:marisol@example.com' } })).status, API);
  ok('alumna: /juegos/jugadores → 403', r === 403, String(r));

  const ad = await pagina(b, 'admin@example.com');
  await ad.click('[data-tab="jugadores"]'); await ad.waitForSelector('#jug-buscar', { timeout: 30000 });
  const txt = (await ad.textContent('#tab-body')).replace(/\s+/g, ' ');
  ok('admin: pendientes «sin confirmar» y «sin apodo»', txt.includes('pendiente.confirmar@example.com') && txt.includes('No confirmó su correo') && txt.includes('pendiente.apodo@example.com') && txt.includes('Entró sin elegir apodo'));
  ok('admin: jugadores registrados (Inglés y Secundaria) sin el admin', txt.includes('marisol@example.com') && txt.includes('valeria@example.com') && !/admin@example\.com/.test(txt), txt.slice(0, 160));
  await ad.screenshot({ path: 'jugadores-admin.png', fullPage: true });

  await ad.fill('#jug-buscar', 'valeria');
  const visibles = await ad.$$eval('tr[data-busca]', trs => trs.filter(t => !t.hidden).map(t => t.dataset.busca));
  ok('buscador: solo coincide Valeria', visibles.length === 1 && visibles[0].includes('valeria'), visibles.join(' | '));
  await ad.fill('#jug-buscar', '');

  let cuerpo = null;
  ad.on('request', q => { if (q.url().includes('/auth/enlace')) cuerpo = q.postData(); });
  await ad.click('[data-enlace="pendiente.confirmar@example.com"]');
  await ad.waitForSelector('#jug-enlace .alert, #jug-enlace-caja', { timeout: 15000 });
  ok('enlace: pide destino «juegos» para ese correo', !!cuerpo && cuerpo.includes('"destino":"juegos"') && cuerpo.includes('pendiente.confirmar@example.com'), String(cuerpo));
  ok('enlace sin Supabase local: aviso claro', (await ad.textContent('#jug-enlace')).includes('No se pudo generar'));

  await b.close();
  console.log(out.join('\n')); process.exit(out.some(x => x.startsWith('FAIL')) ? 1 : 0);
})().catch(e => { console.log(out.join('\n')); console.error('ERROR', e.message.slice(0, 400)); process.exit(2); });
