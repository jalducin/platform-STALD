// E2E: clases de Secundaria (openspec: secundaria-mis-clases). Con el fixture de la semana 2026-10-26
// (tests/fixtures/datos/contenido/secundaria, 15 clases exclusivas de la alumna del fixture) y el servidor con
// `--hoy 2026-10-27`: «☀️ Hoy» trae las 2 del martes con su chip y color de materia, «📅 Esta semana» va por día,
// «🗓️ Mi horario» tiene 7 días y a 360 px no hay scroll horizontal, en claro y en oscuro.
require('./lib/entorno'); // BASE, API, DATA, CHROME, carpeta de salida y sesión de prueba en fetch
const { chromium } = require('playwright');
const { abrirPagina } = require('./lib/navegador');
const out = []; const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`);
const ALUMNA = 'valeria@example.com';
const HOY = '2026-10-27';
const texto = async (p, sel) => (await p.textContent(sel)).replace(/\s+/g, ' ').trim();
const sinScrollH = p => p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

(async () => {
  // Solo con el «hoy» de la prueba (correr.sh --hoy 2026-10-27); con otro día se omite.
  const r = await fetch(process.env.API + '/secundaria/actividades?email=' + encodeURIComponent(ALUMNA)).then(x => x.json());
  if (r.hoy !== HOY) { console.log(`OMIT el servidor corre con hoy ${r.hoy}; esta prueba necesita --hoy ${HOY}`); process.exit(0); }
  const api = r.items.find(i => i.id === `sec-e2e-clase-${HOY}-a`);
  ok('API: deja pasar materia', api && api.materia === 'Matemáticas', JSON.stringify(api && api.materia));
  ok('API: sin materia en el contenido, no la inventa', !('materia' in (r.items.find(i => i.id === `sec-e2e-clase-${HOY}-b`) || { materia: 1 })));

  const b = await chromium.launch({ executablePath: process.env.CHROME });
  for (const tema of ['light', 'dark']) {
    const p = await abrirPagina(b, { email: ALUMNA, viejo: true, out, viewport: { width: 360, height: 780 }, contexto: { colorScheme: tema }, ruta: '/ingles.html?modo=secundaria', esperar: '#sec-clases' });
    const sufijo = tema === 'dark' ? ' (oscuro)' : '';
    if (tema === 'light') {
      ok('título «📚 Clases de Secundaria» y pestaña «📚 Mis clases»', (await texto(p, '#titulo')).includes('Clases de Secundaria') && (await texto(p, '#sec-tab-clases')) === '📚 Mis clases');
      const hoy = await p.$$eval('#sec-hoy [data-sec-item]', xs => xs.map(x => ({ id: x.dataset.secItem, materia: x.dataset.materia, fondo: getComputedStyle(x.querySelector('.mat-chip')).backgroundColor })));
      ok('Hoy: las 2 clases del martes 27', hoy.length === 2 && hoy.every(h => h.id.includes(HOY)), JSON.stringify(hoy.map(h => h.id)));
      ok('Hoy: chips Matemáticas y Ciencias (deducida del título)', hoy.map(h => h.materia).join() === 'Matemáticas,Ciencias', hoy.map(h => h.materia).join());
      ok('Hoy: un color por materia', hoy.length === 2 && hoy[0].fondo !== hoy[1].fondo, hoy.map(h => h.fondo).join(' / '));
      ok('Hoy va primero', await p.evaluate(() => { const h = document.getElementById('sec-hoy'), s = document.getElementById('sec-semana'); return !!(h && s && (h.compareDocumentPosition(s) & Node.DOCUMENT_POSITION_FOLLOWING)); }));
      const dias = await p.$$eval('#sec-semana [data-sec-dia]', xs => xs.map(x => ({ t: x.querySelector('h4').textContent.replace(/\s+/g, ' ').trim(), n: x.querySelectorAll('[data-sec-item]').length })));
      ok('Esta semana: 7 días de «Lunes 26» a «Domingo 1»', dias.length === 7 && dias[0].t.startsWith('Lunes 26') && dias[6].t.startsWith('Domingo 1'), dias.map(d => d.t).join(' | '));
      ok('Esta semana: 2 clases por día y 3 el domingo', dias.map(d => d.n).join() === '2,2,2,2,2,2,3', dias.map(d => d.n).join());
      ok('Esta semana: el martes marcado como hoy', (await texto(p, `[data-sec-dia="${HOY}"] h4`)).includes('hoy'));
      ok('Otras clases y exámenes: el examen de prueba', !!(await p.$('#sec-otras [data-sec-item="sec-e2e"]')));
      ok('Mis clases: sin scroll horizontal a 360 px', await sinScrollH(p));
      await p.screenshot({ path: 'secundaria-clases-hoy.png' });
      await p.screenshot({ path: 'secundaria-clases-semana.png', fullPage: true });
    }
    await p.click('[data-sec-tab="horario"]');
    await p.waitForSelector('#sec-horario:not([hidden])');
    const hor = await p.$$eval('#sec-horario [data-sec-hor-dia]', xs => xs.map(x => ({ f: x.dataset.secHorDia, hoy: x.classList.contains('es-hoy'), m: [...x.querySelectorAll('.sec-hor-clase b')].map(b => b.textContent) })));
    ok('Mi horario: 7 días' + sufijo, hor.length === 7, String(hor.length));
    ok('Mi horario: el martes con Matemáticas y Ciencias, resaltado' + sufijo, hor[1] && hor[1].hoy && hor[1].m.join() === 'Matemáticas,Ciencias', JSON.stringify(hor[1]));
    ok('Mi horario: el domingo con 3 materias' + sufijo, hor[6] && hor[6].m.length === 3, JSON.stringify(hor[6]));
    const columnas = await p.$eval('#sec-horario-semana', el => getComputedStyle(el).gridTemplateColumns.split(' ').length);
    ok('Mi horario a 360 px: lista por día (1 columna)' + sufijo, columnas === 1, String(columnas));
    ok('Mi horario: sin scroll horizontal a 360 px' + sufijo, await sinScrollH(p));
    if (tema === 'dark') {
      const fondo = await p.evaluate(() => getComputedStyle(document.body).backgroundColor);
      ok('modo oscuro: fondo oscuro', /rgb\((\d+), (\d+), (\d+)\)/.test(fondo) && fondo.match(/\d+/g).slice(0, 3).every(n => Number(n) < 60), fondo);
    }
    await p.screenshot({ path: `secundaria-horario-360${tema === 'dark' ? '-oscuro' : ''}.png`, fullPage: true });
    await p.context().close();
  }

  // Ancho de escritorio: el horario es una cuadrícula de 7 columnas.
  const ancho = await abrirPagina(b, { email: ALUMNA, viejo: true, out, viewport: { width: 1280, height: 800 }, ruta: '/ingles.html?modo=secundaria', esperar: '#sec-clases' });
  await ancho.click('[data-sec-tab="horario"]');
  const cols = await ancho.$eval('#sec-horario-semana', el => getComputedStyle(el).gridTemplateColumns.split(' ').length);
  ok('Mi horario en escritorio: 7 columnas', cols === 7, String(cols));
  ok('escritorio: sin scroll horizontal', await sinScrollH(ancho));
  await ancho.screenshot({ path: 'secundaria-horario-escritorio.png', fullPage: true });

  // Abrir una clase de hoy desde «Hoy» funciona como siempre.
  await ancho.click('[data-sec-tab="clases"]');
  await ancho.click(`#sec-hoy [data-sec-item="sec-e2e-clase-${HOY}-a"] [data-action="abrir-item"]`);
  ok('abrir la clase de hoy muestra sus preguntas', await ancho.waitForSelector('#exam-form', { timeout: 60000 }).then(() => true, () => false));

  await b.close();
  console.log(out.join('\n')); process.exit(out.some(x => x.startsWith('FAIL')) ? 1 : 0);
})().catch(e => { console.log(out.join('\n')); console.error('ERROR', e.message.slice(0, 400)); process.exit(2); });
