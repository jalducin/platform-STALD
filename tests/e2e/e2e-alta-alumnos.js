// E2E: alta de alumnos y alumnas desde ingles.html (openspec: alta-alumnos).
require('./lib/entorno'); // BASE, API, DATOS, DATA, CHROME, carpeta de salida y sesión de prueba en fetch
const { chromium } = require('playwright');
const API = process.env.API;
const { abrirPagina } = require('./lib/navegador');
const out = []; const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const pagina = (b, email, ruta) => abrirPagina(b, { email, viejo: true, ingles: true, out, dialogos: 'aceptar', ruta });
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME });
  const ad = await pagina(b, 'admin@example.com', '/ingles.html#alumnos');
  await ad.waitForSelector('#alumnos-admin', { timeout: 60000 });
  const antes = Number(await ad.textContent('#alumnos-admin .count'));
  ok('tarjeta "Alumnos y alumnas" con la lista de Notion', antes >= 5, String(antes));
  await ad.fill('#alta-nombre', 'Luz María'); await ad.fill('#alta-correo', 'Luz.Prueba@Example.com');
  await ad.click('#alta-alumno button[type=submit]');
  await ad.waitForFunction(() => (document.getElementById('alta-msg') || {}).textContent?.includes('ya puede entrar'), null, { timeout: 30000 });
  ok('alta con aviso', (await ad.textContent('#alta-msg')).includes('luz.prueba@example.com'), await ad.textContent('#alta-msg'));
  ok('la lista crece y marca "alta en la página"', Number(await ad.textContent('#alumnos-admin .count')) === antes + 1 && (await ad.textContent('#alumnos-admin')).includes('alta en la página'));
  ok('el admin ve su bloque aunque no tenga tareas en Notion', !!(await ad.$('details.student[data-alumno="Luz María"]')));
  // Duplicado
  await ad.fill('#alta-nombre', 'Otra'); await ad.fill('#alta-correo', 'luz.prueba@example.com'); await ad.click('#alta-alumno button[type=submit]');
  await ad.waitForFunction(() => (document.getElementById('alta-msg') || {}).textContent?.includes('ya tiene acceso'), null, { timeout: 15000 }).catch(() => {});
  ok('correo repetido: mensaje claro', (await ad.textContent('#alta-msg')).includes('ya tiene acceso'));
  await ad.screenshot({ path: 'alta-admin.png', fullPage: false });

  // La nueva alumna entra
  const luz = await pagina(b, 'luz.prueba@example.com', '/ingles.html');
  await luz.waitForFunction(() => /Empezar|Resolver|Ver resultado/.test((document.getElementById('content') || {}).innerText || ''), null, { timeout: 60000 }).catch(() => {});
  const txt = await luz.evaluate(() => ({ app: getComputedStyle(document.getElementById('app')).display, c: document.getElementById('content').innerText }));
  ok('Inglés: entra y ve cuándo empieza su curso (openspec: inicio-lunes-alumnos)', txt.app !== 'none' && /Tu curso empieza el lunes/.test(txt.c), txt.c.slice(0, 100).replace(/s+/g, ' '));
  const portal = await pagina(b, 'luz.prueba@example.com', '/');
  await portal.waitForSelector('#hello', { timeout: 60000 }); await sleep(2500);
  const pt = await portal.textContent('body');
  ok('portal: saludo con su nombre y acceso a Inglés y Juegos', pt.includes('Luz María') && !!(await portal.$('a[href*="ingles.html"]')) && !!(await portal.$('a[href*="juegos.html"]')), (await portal.textContent('#hello')));
  const jg = await pagina(b, 'luz.prueba@example.com', '/juegos.html');
  await jg.waitForSelector('#chip:not([hidden])', { timeout: 60000 });
  ok('Juegos: entra como alumna (sin INVITADO)', (await jg.textContent('#chip')).includes('Luz María') && !(await jg.textContent('#chip')).includes('INVITADO'), await jg.textContent('#chip'));

  // Solo admin
  const r = await fetch(API + '/ingles/alumnos?email=marisol@example.com'); ok('alumna no puede listar (403)', r.status === 403, String(r.status));

  // Quitar
  await ad.reload(); await ad.waitForSelector('#alumnos-admin', { timeout: 60000 });
  await ad.click('[data-action="quitar-alumno"][data-email="luz.prueba@example.com"]');
  await ad.waitForFunction(() => (document.getElementById('alta-msg') || {}).textContent?.includes('Se quitó'), null, { timeout: 30000 });
  ok('quitar: vuelve al conteo anterior', Number(await ad.textContent('#alumnos-admin .count')) === antes);
  const d = await (await fetch(API + '/ingles/data?email=luz.prueba@example.com')).json();
  ok('ya no tiene filas', Array.isArray(d.rows) && d.rows.length === 0, JSON.stringify(d).slice(0, 80));
  await b.close();
  console.log(out.join('\n')); process.exit(out.some(x => x.startsWith('FAIL')) ? 1 : 0);
})().catch(e => { console.log(out.join('\n')); console.error('ERROR', e.message.slice(0, 400)); process.exit(2); });
