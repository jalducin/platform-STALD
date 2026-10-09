// E2E: menú «🛡️ Admin» de Juegos (openspec: jugadores-admin y admin-juegos-unificado). Jugadores, Pendientes,
// Invitados y Fotos en una sola pestaña con contadores, buscador único y la sub-sección guardada. Las cuentas de
// acceso salen de la clave `cuentas` del fixture (una sin confirmar y otra sin apodo). En local no hay Supabase: el
// enlace responde auth_no_disponible, así que se comprueba que la petición pide destino «juegos» y que el aviso se ve.
require('./lib/entorno'); // BASE, API, CHROME, carpeta de salida y sesión de prueba en fetch
const { chromium } = require('playwright');
const { abrirPagina, CELULAR } = require('./lib/navegador');
const BASE = process.env.BASE;
const API = process.env.API;
const out = []; const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`);

// Página con sesión de prueba (ayudante común, openspec: e2e-ayudantes); descargas permitidas para los CSV.
const pagina = (b, email, viewport = CELULAR, colorScheme = 'light') =>
  abrirPagina(b, { email, out, viewport, contexto: { colorScheme, acceptDownloads: true }, ruta: '/juegos.html', esperar: '[data-tab]' });
// Abre «🛡️ Admin» y espera a que los 4 contadores dejen de decir «…».
async function abrirAdmin(p) {
  await p.click('[data-tab="admin"]');
  await p.waitForSelector('#adm-subs', { timeout: 30000 });
  await p.waitForFunction(() => [...document.querySelectorAll('#adm-subs .adm-n')].length === 4 && [...document.querySelectorAll('#adm-subs .adm-n')].every(n => n.textContent !== '…'), null, { timeout: 30000 });
}
const contadores = p => p.$$eval('#adm-subs [data-adm]', xs => Object.fromEntries(xs.map(x => [x.dataset.adm, x.querySelector('.adm-n').textContent.trim()])));
const activa = p => p.$eval('#adm-subs [aria-selected="true"]', x => x.dataset.adm);
const visibles = p => p.$$eval('#adm-panel [data-busca]', xs => xs.filter(x => !x.hidden && x.offsetParent !== null).map(x => x.dataset.busca));
const sinScrollLateral = p => p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME });

  // Alumna: sin pestaña y el servidor le niega las tres listas.
  const al = await pagina(b, 'marisol@example.com');
  const tabsAl = await al.$$eval('[role="tablist"] [data-tab]', xs => xs.map(x => x.dataset.tab));
  ok('alumna: 3 pestañas y sin «Admin»', JSON.stringify(tabsAl) === '["juegos","partidas","ranking"]', JSON.stringify(tabsAl));
  for (const ruta of ['/juegos/jugadores', '/juegos/invitados', '/juegos/fotos']) {
    const r = await al.evaluate(async ([api, ruta]) => (await fetch(api + ruta, { headers: { Authorization: 'Bearer prueba:marisol@example.com' } })).status, [API, ruta]);
    ok('alumna: ' + ruta + ' → 403', r === 403, String(r));
  }

  // Admin en celular (390×844).
  const ad = await pagina(b, 'admin@example.com');
  const tabsAd = await ad.$$eval('[role="tablist"] [data-tab]', xs => xs.map(x => x.dataset.tab));
  ok('admin: barra de 4 pestañas (Juegos, Partidas, Ranking, Admin)', JSON.stringify(tabsAd) === '["juegos","partidas","ranking","admin"]', JSON.stringify(tabsAd));
  ok('admin: la barra no se desborda a 390 px', await ad.$eval('[role="tablist"]', t => t.scrollWidth <= t.clientWidth + 1 && [...t.children].every(c => c.scrollWidth <= c.clientWidth + 1)));
  await abrirAdmin(ad);
  const n = await contadores(ad);
  const filasJug = await ad.$$eval('#jug-tabla tbody tr[data-busca]', xs => xs.length);
  ok('contadores: jugadores = filas, 2 pendientes y números en invitados y fotos', Number(n.jugadores) === filasJug && filasJug > 0 && n.pendientes === '2' && /^\d+$/.test(n.invitados) && /^\d+$/.test(n.fotos), JSON.stringify(n) + ' filas=' + filasJug);
  ok('sub-secciones con roles: tablist, tabs y tabpanel', await ad.evaluate(() => document.getElementById('adm-subs').getAttribute('role') === 'tablist' && document.querySelectorAll('#adm-subs [role="tab"]').length === 4 && document.getElementById('adm-panel').getAttribute('role') === 'tabpanel'));
  ok('abre en «Jugadores» la primera vez', (await activa(ad)) === 'jugadores');
  const txt = (await ad.textContent('#adm-panel')).replace(/\s+/g, ' ');
  ok('jugadores registrados (Inglés y Secundaria) sin el admin', txt.includes('marisol@example.com') && txt.includes('valeria@example.com') && !/admin@example\.com/.test(txt), txt.slice(0, 160));
  ok('celular: filas como tarjetas (sin encabezado de tabla)', await ad.evaluate(() => getComputedStyle(document.querySelector('#jug-tabla thead')).display === 'none' && getComputedStyle(document.querySelector('#jug-tabla tbody tr')).display !== 'table-row'));
  ok('celular: sin desplazamiento horizontal', await sinScrollLateral(ad));
  ok('lista con desplazamiento propio (altura máxima y overflow)', await ad.$eval('#adm-panel .adm-lista', l => { const s = getComputedStyle(l); return s.overflowY === 'auto' && s.maxHeight !== 'none'; }));
  await ad.screenshot({ path: 'admin-jugadores-390.png', fullPage: true });

  // Buscador único
  await ad.fill('#adm-buscar', 'valeria');
  let v = await visibles(ad);
  ok('buscador: solo coincide Valeria', v.length === 1 && v[0].includes('valeria'), v.join(' | '));
  ok('buscador: dice cuántas coinciden', (await ad.textContent('#adm-resumen')).includes('1 de'), await ad.textContent('#adm-resumen'));
  await ad.fill('#adm-buscar', 'VALERÍA');
  v = await visibles(ad);
  ok('buscador: sin importar mayúsculas ni acentos', v.length === 1, v.join(' | '));
  await ad.fill('#adm-buscar', 'zzzz');
  ok('buscador: «Nada coincide» con botón para limpiar', (await ad.textContent('#adm-panel')).includes('Nada coincide') && !!(await ad.$('[data-a="adm-limpiar"]')));
  await ad.click('[data-a="adm-limpiar"]');
  ok('limpiar búsqueda: vuelven todas las filas', (await visibles(ad)).length === filasJug && (await ad.inputValue('#adm-buscar')) === '');

  // CSV de jugadores
  let dl = ad.waitForEvent('download', { timeout: 15000 });
  await ad.click('[data-a="csv-jugadores"]');
  ok('CSV de jugadores', (await dl).suggestedFilename() === 'jugadores-juegos.csv');

  // Pendientes: sin enlaces de acceso (openspec: acceso-con-contrasena; entran con correo y nick)
  await ad.click('[data-adm="pendientes"]');
  const txtP = (await ad.textContent('#adm-panel')).replace(/\s+/g, ' ');
  ok('pendientes «sin confirmar» y «sin apodo»', txtP.includes('pendiente.confirmar@example.com') && txtP.includes('No confirmó su correo') && txtP.includes('pendiente.apodo@example.com') && txtP.includes('Entró sin elegir apodo'));
  await ad.fill('#adm-buscar', 'apodo');
  v = await visibles(ad);
  ok('buscador filtra la sub-sección activa (Pendientes)', v.length === 1 && v[0].includes('pendiente.apodo'), v.join(' | '));
  await ad.fill('#adm-buscar', '');
  await ad.screenshot({ path: 'admin-pendientes-390.png', fullPage: true });
  ok('pendientes: sin botón de enlace y con la nota de correo y nick', !(await ad.$('[data-enlace]')) && txtP.includes('correo y su nick'));

  // Teclado: → pasa a Invitados
  await ad.focus('#adm-subs [aria-selected="true"]'); await ad.keyboard.press('ArrowRight');
  ok('teclado: → elige «Invitados» y le pasa el foco', (await activa(ad)) === 'invitados' && (await ad.evaluate(() => document.activeElement.dataset.adm)) === 'invitados');
  dl = ad.waitForEvent('download', { timeout: 15000 });
  await ad.click('[data-a="csv"]');
  ok('CSV de invitados', (await dl).suggestedFilename() === 'invitados-juegos.csv');
  ok('celular: invitados sin desplazamiento horizontal', await sinScrollLateral(ad));
  await ad.screenshot({ path: 'admin-invitados-390.png', fullPage: true });
  await ad.click('[data-adm="fotos"]');
  ok('fotos: lista o aviso de que no hay', !!(await ad.$('#adm-panel .fotos-grid, #adm-panel .adm-vacio')));
  ok('fotos: sin botón de CSV', !(await ad.$('#adm-tools [data-a^="csv"]')));
  await ad.screenshot({ path: 'admin-fotos-390.png', fullPage: true });
  await ad.click('[data-adm="invitados"]');

  // Preferencia guardada
  ok('preferencia: solo el nombre de la sub-sección en localStorage', (await ad.evaluate(() => localStorage.getItem('juegos_admin_sub'))) === 'invitados');
  await ad.reload(); await ad.waitForSelector('[data-tab]', { timeout: 60000 });
  await abrirAdmin(ad);
  ok('preferencia: al volver abre en «Invitados»', (await activa(ad)) === 'invitados');

  // Escritorio (modo oscuro): encabezados fijos y una fuente con error que no tapa a las demás
  const es = await pagina(b, 'admin@example.com', { width: 1280, height: 800 }, 'dark');
  let fallar = true;
  await es.route('**/juegos/invitados*', r => fallar ? r.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"falla_de_prueba"}' }) : r.continue());
  await es.evaluate(() => localStorage.setItem('juegos_admin_sub', 'jugadores'));
  await abrirAdmin(es);
  ok('escritorio: encabezados fijos en la tabla', await es.$eval('#jug-tabla thead th', th => getComputedStyle(th).position === 'sticky'));
  ok('error en una fuente: contador «!» y las demás con número', (await contadores(es)).invitados === '!' && /^\d+$/.test((await contadores(es)).jugadores));
  await es.screenshot({ path: 'admin-escritorio.png' });
  await es.click('[data-adm="invitados"]');
  ok('error: aviso con «Reintentar»', (await es.textContent('#adm-panel')).includes('falla_de_prueba') && !!(await es.$('[data-a="adm-reintentar"]')));
  fallar = false;
  await es.click('[data-a="adm-reintentar"]');
  await es.waitForSelector('#inv-tabla, #adm-panel .adm-vacio', { timeout: 15000 });
  ok('reintentar: carga la lista', /^\d+$/.test((await contadores(es)).invitados));
  await es.click('[data-adm="pendientes"]');
  await es.screenshot({ path: 'admin-escritorio-pendientes.png' });

  await b.close();
  console.log(out.join('\n')); process.exit(out.some(x => x.startsWith('FAIL')) ? 1 : 0);
})().catch(e => { console.log(out.join('\n')); console.error('ERROR', e.message.slice(0, 400)); process.exit(2); });
