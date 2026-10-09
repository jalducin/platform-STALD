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
  // Alumna (openspec: meet-sin-reto): el Meet sin reto trae «📖 Material» para leer, sin preguntas.
  const al = await abrirPagina(b, { email: 'marisol@example.com', ingles: true, out, etiqueta: '', ruta: '/ingles.html#semana', esperar: '.exam-card' });
  const mat = al.locator('[data-action="abrir-material"]').first();
  ok('alumna: el Meet ofrece «📖 Material» y no «Reto en vivo»', await mat.count() > 0 && !(await al.textContent('body')).includes('Reto en vivo'));
  if (await mat.count()) {
    await mat.click(); await al.waitForSelector('.exam-card h3', { timeout: 15000 });
    const txt = (await al.textContent('#content, main, body')).replace(/\s+/g, ' ');
    ok('alumna: abre la teoría para leer, sin preguntas', txt.includes('Material de la clase') && txt.includes('Teoría') && !(await al.$('#exam-form')), txt.slice(0, 120));
    await al.screenshot({ path: 'meet-material.png', fullPage: true });
  }
  // «📌 Para ponerte al día» (openspec: semana-ponerse-al-dia): lo de otra semana que vence esta semana.
  const html = await al.evaluate(() => renderWeekCard({
    semana: { id: '2026-10-05', titulo: 'Semana 2', ids: ['act-2026-10-06'] },
    items: [
      { id: 'act-2026-10-06', tipo: 'actividad', titulo: 'De esta semana', fechaLimite: '2026-10-06', estado: 'disponible', intentosMax: 2 },
      { id: 'act-2026-09-29', tipo: 'actividad', titulo: 'Semana 1 con prórroga', fechaLimite: '2026-10-09', estado: 'disponible', intentosMax: 2 },
      { id: 'act-2026-09-30', tipo: 'actividad', titulo: 'Semana 1 vencida', fechaLimite: '2026-09-30', estado: 'disponible', intentosMax: 2 },
    ],
  }));
  ok('semana: «Para ponerte al día» con lo de otra semana que vence esta semana', html.includes('Para ponerte al día') && html.includes('Semana 1 con prórroga') && html.includes('data-fecha="2026-10-09"'));
  ok('semana: lo que venció antes de esta semana no entra en esa tarjeta', !html.includes('Semana 1 vencida'));
  // Aviso «hoy y atrasadas» y su vista (sin entregas, la alumna de prueba tiene pendientes de la semana 1).
  await al.goto(al.url().replace(/#.*$/, '#semana')); await al.waitForSelector('[data-seccion="semana"]', { timeout: 30000 });
  const aviso = al.locator('[data-seccion="semana"] .aviso-pendientes');
  ok('semana: aviso «Tienes … atrasadas» con su botón', await aviso.count() === 1 && /Tienes .*(para hoy|atrasada)/.test(await aviso.textContent()), (await aviso.textContent().catch(() => '')).trim().slice(0, 80));
  await aviso.locator('[data-action="ver-pendientes"]').click(); await al.waitForSelector('#pendientes', { timeout: 15000 });
  const filas = await al.$$eval('#pendientes .hoy-item', xs => xs.map(x => x.textContent.replace(/\s+/g, ' ')));
  ok('pendientes: solo hoy y atrasadas, cada una con su acción', filas.length > 0 && filas.every(t => /Atrasada|Hoy/.test(t)) && (await al.$$('#pendientes .hoy-item .btn')).length >= filas.length, filas.length + ' filas');
  await al.screenshot({ path: 'pendientes.png', fullPage: true });
  await b.close();
  console.log(out.join('\n')); process.exit(out.some(x => x.startsWith('FAIL')) ? 1 : 0);
})().catch(e => { console.log(out.join('\n')); console.error('ERROR', e.message.slice(0, 400)); process.exit(2); });
