// E2E: baja de Inglés reversible desde «Registro» de ingles.html (openspec: ingles-baja-alumno).
require('./lib/entorno'); // BASE, API, DATOS, DATA, CHROME, carpeta de salida y sesión de prueba en fetch
const { chromium } = require('playwright');
const API = process.env.API;
const { abrirPagina } = require('./lib/navegador');
const out = []; const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`);
const LAURA = 'laura@example.com';
const pagina = (b, email, ruta, dialogos = 'aceptar') => abrirPagina(b, { email, viejo: true, ingles: true, out, dialogos, ruta });
const pedir = async (ruta, email, body) => {
  const r = await fetch(API + ruta + (ruta.includes('?') ? '&' : '?') + 'email=' + encodeURIComponent(email), body ? { method: 'POST', headers: { 'content-type': 'text/plain;charset=UTF-8' }, body: JSON.stringify(body) } : {});
  return { status: r.status, body: await r.json() };
};
// Deja a Laura activa pase lo que pase: la fase «ingles» comparte datos con otras pruebas.
const restaurar = () => pedir('/ingles/grupos/reactivar', 'admin@example.com', { email: LAURA }).catch(() => {});
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME });
  const jugadorAntes = (await pedir('/juegos/yo', LAURA)).body.jugador;
  const ad = await pagina(b, 'admin@example.com', '/ingles.html#registro', 'registrar');
  await ad.waitForSelector('#alumnos-admin [data-action="baja-ingles"]', { timeout: 60000 });
  const antes = Number(await ad.textContent('#alumnos-admin .count'));
  ok('cada persona activa tiene «🚪 Baja de Inglés»', (await ad.$$('#alumnos-admin [data-action="baja-ingles"]')).length === antes, String(antes));
  ok('Laura está en el tablero antes de la baja', !!(await ad.$('details.student[data-alumno="Laura"]')));

  // Solo admin
  const ajena = await pedir('/ingles/grupos/baja', 'marisol@example.com', { email: LAURA });
  ok('una alumna no puede dar de baja (403 solo_admin)', ajena.status === 403 && ajena.body.error === 'solo_admin', JSON.stringify(ajena));

  // Baja con confirmación
  await ad.click('[data-action="baja-ingles"][data-email="' + LAURA + '"]');
  await ad.waitForFunction(() => (document.getElementById('alta-msg') || {}).textContent?.includes('quedó de baja'), null, { timeout: 30000 });
  ok('confirmación clara: «Sus resultados se conservan como historial»', (ad.alertas[0] || '').includes('Sus resultados se conservan como historial') && ad.alertas[0].includes('Laura'), (ad.alertas[0] || '').slice(0, 90));
  ok('la lista activa baja en uno', Number(await ad.textContent('#alumnos-admin .count')) === antes - 1);
  ok('«🗂️ De baja de Inglés» con Laura y «↩️ Reactivar»', (await ad.textContent('#bajas-ingles')).includes('Laura') && !!(await ad.$('#bajas-ingles [data-action="reactivar-ingles"][data-email="' + LAURA + '"]')));
  ok('Laura ya no está en el tablero', !(await ad.$('details.student[data-alumno="Laura"]')));
  const anchoAd = await ad.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  ok('Registro a 390 px sin scroll horizontal', anchoAd);
  await ad.screenshot({ path: 'baja-admin.png', fullPage: true });

  // Ella entra a Inglés: aviso amable con enlace a Secundaria
  const la = await pagina(b, LAURA, '/ingles.html');
  await la.waitForFunction(() => /Ya no estás en Inglés en línea/.test((document.getElementById('content') || {}).textContent || ''), null, { timeout: 60000 }).catch(() => {});
  const v = await la.evaluate(() => ({ app: getComputedStyle(document.getElementById('app')).display, txt: document.getElementById('content').textContent, sec: (document.querySelector('#content a[href*="modo=secundaria"]') || {}).href || '' }));
  ok('alumna de baja: aviso «Ya no estás en Inglés en línea; tus clases de Inglés siguen en Secundaria»', v.app !== 'none' && v.txt.includes('Ya no estás en Inglés en línea') && v.txt.includes('Tus clases de Inglés siguen en Secundaria'), v.txt.slice(0, 120).replace(/\s+/g, ' '));
  ok('enlace a ingles.html?modo=secundaria (con ?api=)', v.sec.includes('ingles.html?modo=secundaria') && v.sec.includes('api='), v.sec);
  ok('sin actividades ni Meet en su vista', !/Unirme|Empezar|Resolver/.test(v.txt));
  await la.screenshot({ path: 'baja-alumna.png', fullPage: false });
  const act = await pedir('/ingles/actividades', LAURA);
  ok('/ingles/actividades → 403 baja_ingles', act.status === 403 && act.body.error === 'baja_ingles', JSON.stringify(act.body));
  const perfil = (await pedir('/perfil', LAURA)).body;
  ok('portal sin Inglés; Juegos sigue', perfil.accesos && perfil.accesos.ingles === false && perfil.accesos.juegos === true && perfil.nombre === 'Laura', JSON.stringify(perfil.accesos));
  const jugador = (await pedir('/juegos/yo', LAURA)).body.jugador;
  ok('Juegos: mismo jugador', JSON.stringify(jugador) === JSON.stringify(jugadorAntes) && jugador.id === 'a-laura', JSON.stringify(jugador));
  const res = await pedir('/ingles/resumen', 'admin@example.com');
  ok('resumen del profe sin Laura', res.status === 200 && !res.body.filas.some(f => f.alumno === 'Laura'), String(res.status));

  // Reactivar
  await ad.reload(); await ad.waitForSelector('#bajas-ingles', { timeout: 60000 });
  await ad.click('#bajas-ingles [data-action="reactivar-ingles"][data-email="' + LAURA + '"]');
  await ad.waitForFunction(() => (document.getElementById('alta-msg') || {}).textContent?.includes('de nuevo en Inglés'), null, { timeout: 30000 });
  ok('reactivar: vuelve al conteo y al tablero', Number(await ad.textContent('#alumnos-admin .count')) === antes && !!(await ad.$('details.student[data-alumno="Laura"]')) && !(await ad.$('#bajas-ingles')));
  const d = await pedir('/ingles/data', LAURA);
  ok('Laura vuelve a tener Inglés', d.body.rows.length > 0 && !d.body.baja, JSON.stringify(d.body).slice(0, 80));
  await b.close();
  await restaurar(); // por si un paso falló entre la baja y «Reactivar»
  console.log(out.join('\n')); process.exit(out.some(x => x.startsWith('FAIL')) ? 1 : 0);
})().catch(async e => { await restaurar(); console.log(out.join('\n')); console.error('ERROR', e.message.slice(0, 400)); process.exit(2); });
