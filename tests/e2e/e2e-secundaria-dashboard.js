// E2E: tablero de Secundaria (openspec: secundaria-dashboard). Con el fixture de la semana 2026-10-26
// (tests/fixtures/datos/contenido/secundaria, 15 clases exclusivas de la alumna del fixture) y el servidor con
// `--hoy 2026-10-27`. La alumna envía 3 clases por la API (en la copia temporal de datos): lunes Inglés 100 %, lunes
// Español 50 % (en curso) y martes Matemáticas 100 %. Revisa a 360 px, en claro y en oscuro: «🏠 Inicio» (Hoy te toca,
// progreso, racha, promedio por materia, accesos), «📚 Mis materias», el admin con el mismo tablero, el bloque
// «🗓️ Mi horario» del portal y que los botones midan al menos 44 px.
require('./lib/entorno'); // BASE, API, DATA, CHROME, carpeta de salida y sesión de prueba en fetch
const { chromium } = require('playwright');
const { abrirPagina } = require('./lib/navegador');
const out = []; const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`);
const ALUMNA = 'valeria@example.com';
const ADMIN = 'admin@example.com';
const HOY = '2026-10-27';
const API = process.env.API;
const q = e => '?email=' + encodeURIComponent(e);
const texto = async (p, sel) => ((await p.textContent(sel)) || '').replace(/\s+/g, ' ').trim();
const sinScrollH = p => p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
// Alto mínimo de los botones visibles que coinciden con el selector (área táctil ≥ 44 px).
const altoMinimo = (p, sel) => p.$$eval(sel, xs => xs.filter(x => x.offsetParent).map(x => Math.round(x.getBoundingClientRect().height)).reduce((a, b) => Math.min(a, b), 999));

// Envía un intento por la API: `bien` respuestas correctas (opción 0) y el resto mal.
async function enviar(id, bien) {
  const it = await fetch(`${API}/secundaria/actividades/${id}${q(ALUMNA)}`).then(r => r.json());
  const respuestas = Object.fromEntries(it.preguntas.map((p, i) => [p.id, i < bien ? 0 : 1]));
  const r = await fetch(`${API}/secundaria/actividades/${id}${q(ALUMNA)}`, { method: 'POST', body: JSON.stringify({ intento: it.intento || 1, respuestas }) });
  return r.status;
}

(async () => {
  const r0 = await fetch(`${API}/secundaria/actividades${q(ALUMNA)}`).then(x => x.json());
  if (r0.hoy !== HOY) { console.log(`OMIT el servidor corre con hoy ${r0.hoy}; esta prueba necesita --hoy ${HOY}`); process.exit(0); }
  const envios = [await enviar('sec-e2e-clase-2026-10-26-a', 2), await enviar('sec-e2e-clase-2026-10-26-b', 1), await enviar('sec-e2e-clase-2026-10-27-a', 2)];
  ok('API: 3 envíos de la alumna (copia temporal de datos)', envios.every(s => s === 200), envios.join());
  const r1 = await fetch(`${API}/secundaria/actividades${q(ALUMNA)}`).then(x => x.json());
  ok('API: racha de 1 día con envío hoy', r1.racha && r1.racha.dias === 1 && r1.racha.hoy, JSON.stringify(r1.racha));

  const b = await chromium.launch({ executablePath: process.env.CHROME });
  for (const tema of ['light', 'dark']) {
    const sufijo = tema === 'dark' ? ' (oscuro)' : '';
    const archivo = n => `secundaria-dashboard-${n}${tema === 'dark' ? '-oscuro' : ''}.png`;
    const p = await abrirPagina(b, { email: ALUMNA, viejo: true, out, viewport: { width: 360, height: 780 }, contexto: { colorScheme: tema }, ruta: '/secundaria.html', esperar: '#sec-inicio' });
    ok('secundaria.html abre en «🏠 Inicio»' + sufijo, p.url().includes('modo=secundaria') && await p.isVisible('#sec-inicio') && (await p.getAttribute('#sec-tab-inicio', 'aria-selected')) === 'true');
    ok('saludo «Hola, …» con la fecha de hoy' + sufijo, (await texto(p, '.sec-hola')).startsWith('Hola') && (await texto(p, '.sec-fecha')) === 'Martes 27 de octubre', await texto(p, '.sec-hero'));
    const tarjetas = await p.$$eval('[data-sec-card]', xs => xs.map(x => ({ id: x.dataset.secCard, estado: x.dataset.estado, chip: x.querySelector('.mat-chip').textContent.trim(), boton: (x.querySelector('.sec-btn-grande') || {}).textContent })));
    ok('Hoy te toca: Matemáticas (hecha) y Ciencias (vence hoy)' + sufijo, tarjetas.length === 2 && tarjetas[0].chip.includes('Matemáticas') && tarjetas[0].estado === 'hecha' && tarjetas[1].chip.includes('Ciencias') && tarjetas[1].estado === 'vence-hoy', JSON.stringify(tarjetas));
    ok('botones: «Ver resultado» y «Empezar»' + sufijo, tarjetas.length === 2 && tarjetas[0].boton.includes('Ver resultado') && tarjetas[1].boton.includes('Empezar'), tarjetas.map(t => t.boton).join(' | '));
    ok('estado de la hecha con su calificación' + sufijo, (await texto(p, '[data-sec-card="sec-e2e-clase-2026-10-27-a"] .sec-estado')).includes('100 %'));
    ok('progreso de la semana: 3 de 15' + sufijo, (await texto(p, '#sec-progreso')).includes('3 de 15 clases hechas'), await texto(p, '#sec-progreso'));
    ok('racha: 1 día seguido' + sufijo, (await texto(p, '#sec-racha')).includes('1 día seguido'), await texto(p, '#sec-racha'));
    const prom = await p.$$eval('[data-sec-prom]', xs => xs.map(x => x.dataset.secProm + ':' + x.querySelector('.sec-prom-num').textContent.trim()));
    ok('promedio por materia: Inglés 100, Español 50, Matemáticas 100' + sufijo, prom.slice(0, 3).join() === 'ingles:100 %,espanol:50 %,matematicas:100 %' && prom.every(x => !/tecnologia|ciencias|sociales/.test(x)), prom.join()); // «otra» depende de examen-secundaria (mismo servidor)
    ok('accesos a Esta semana, Mi horario y Mis materias' + sufijo, (await p.$$eval('.sec-accesos [data-sec-tab]', xs => xs.map(x => x.dataset.secTab).join())) === 'clases,horario,materias');
    const altos = { tarjetas: await altoMinimo(p, '.sec-btn-grande'), pestanas: await altoMinimo(p, '.sec-tabs .tab'), accesos: await altoMinimo(p, '.sec-acceso'), encabezado: await altoMinimo(p, '.app-top .home-link, .app-top .btn') };
    ok('botones de 44 px o más (tarjetas, pestañas, accesos, Inicio/Juegos/tema/salir)' + sufijo, Object.values(altos).every(h => h >= 44), JSON.stringify(altos));
    const inicioBtn = await p.$eval('.app-top .home-link', a => { const s = getComputedStyle(a); return { borde: s.borderTopWidth, fondo: s.backgroundColor, padding: s.paddingLeft }; });
    ok('«← Inicio» parece botón (borde, fondo y padding)' + sufijo, inicioBtn.borde !== '0px' && inicioBtn.fondo !== 'rgba(0, 0, 0, 0)' && parseFloat(inicioBtn.padding) >= 8, JSON.stringify(inicioBtn));
    ok('Inicio: sin scroll horizontal a 360 px' + sufijo, await sinScrollH(p));
    if (tema === 'dark') {
      const fondo = await p.evaluate(() => getComputedStyle(document.body).backgroundColor);
      ok('modo oscuro: fondo oscuro', fondo.match(/\d+/g).slice(0, 3).every(n => Number(n) < 60), fondo);
    }
    await p.screenshot({ path: archivo('inicio-360'), fullPage: true });

    // Foco visible en un botón (teclado).
    await p.focus('[data-sec-card="sec-e2e-clase-2026-10-27-b"] .sec-btn-grande');
    await p.keyboard.press('Shift+Tab'); await p.keyboard.press('Tab');
    const foco = await p.evaluate(() => { const s = getComputedStyle(document.activeElement); return s.outlineStyle + ' ' + s.outlineWidth; });
    ok('foco visible en los botones' + sufijo, foco.startsWith('solid') && parseFloat(foco.split(' ')[1]) >= 2, foco);

    // 📚 Mis materias desde el acceso del Inicio.
    await p.click('.sec-accesos [data-sec-tab="materias"]');
    await p.waitForSelector('#sec-materias:not([hidden])');
    const materias = await p.$$eval('[data-sec-materia]', xs => xs.map(x => x.dataset.secMateria));
    ok('Mis materias: las 8 en orden y «Otras clases» (el examen sin materia)' + sufijo, materias.join() === 'ingles,espanol,matematicas,tecnologia,ciencias,sociales,artes,edfisica,otra', materias.join());
    const mate = await texto(p, '[data-sec-materia="matematicas"]');
    const actual = await p.$eval('[data-sec-materia="matematicas"] li[aria-current="step"]', li => li.textContent.trim()).catch(() => '');
    ok('Matemáticas: 1 de 2 hechas, ⭐ 100 % y secuencia Aritmética (ahora) → Geometría → Álgebra' + sufijo, mate.includes('1 de 2 clases hechas') && mate.includes('100 %') && /Aritmética.*Geometría.*Álgebra/.test(mate) && actual.startsWith('Aritmética'), mate);
    ok('Mis materias: hash #materias y sin scroll horizontal' + sufijo, p.url().endsWith('#materias') && await sinScrollH(p));
    await p.screenshot({ path: archivo('materias-360'), fullPage: true });
    await p.context().close();
  }

  // Abrir la clase de hoy desde «Hoy te toca» y volver al Inicio.
  {
    const p = await abrirPagina(b, { email: ALUMNA, viejo: true, out, viewport: { width: 360, height: 780 }, ruta: '/secundaria.html', esperar: '#sec-inicio' });
    await p.click('[data-sec-card="sec-e2e-clase-2026-10-27-b"] [data-action="abrir-item"]');
    ok('«Empezar» abre la clase', await p.waitForSelector('#exam-form', { timeout: 60000 }).then(() => true, () => false));
    await p.goBack(); await p.waitForSelector('#sec-inicio:not([hidden])', { timeout: 60000 });
    ok('Atrás regresa al Inicio', await p.isVisible('[data-sec-card]'));
    await p.click('[data-sec-card="sec-e2e-clase-2026-10-27-a"] [data-action="ver-resultado"]');
    ok('«Ver resultado» muestra su calificación', await p.waitForSelector('.score', { timeout: 60000 }).then(() => true, () => false));
    await p.context().close();
  }

  // Escritorio: tarjetas en fila e indicadores en 3 columnas.
  {
    const p = await abrirPagina(b, { email: ALUMNA, viejo: true, out, viewport: { width: 1280, height: 900 }, ruta: '/secundaria.html', esperar: '#sec-inicio' });
    const cols = await p.$eval('.sec-kpis', el => getComputedStyle(el).gridTemplateColumns.split(' ').length);
    ok('escritorio: 3 indicadores en fila', cols === 3, String(cols));
    await p.screenshot({ path: 'secundaria-dashboard-escritorio.png', fullPage: true });
    await p.context().close();
  }

  // Admin: el mismo tablero con los datos de la alumna (solo lectura) y la pestaña de resultados.
  {
    const p = await abrirPagina(b, { email: ADMIN, viejo: true, out, viewport: { width: 360, height: 780 }, ruta: '/ingles.html?modo=secundaria&alumna=valeria', esperar: '#sec-inicio' });
    ok('admin: «Tablero de Valeria» con selector', (await texto(p, '.sec-hola')).includes('Valeria') && (await p.$eval('#sec-alumna', s => s.value)) === 'valeria', await texto(p, '.sec-hola'));
    ok('admin: mismas tarjetas de hoy', (await p.$$eval('[data-sec-card]', xs => xs.map(x => x.dataset.secCard).join())) === 'sec-e2e-clase-2026-10-27-a,sec-e2e-clase-2026-10-27-b');
    ok('admin: «Vista previa» en vez de «Empezar»', (await texto(p, '[data-sec-card="sec-e2e-clase-2026-10-27-b"] .sec-btn-grande')).includes('Vista previa'));
    ok('admin: mismo progreso (3 de 15)', (await texto(p, '#sec-progreso')).includes('3 de 15'));
    ok('admin: pestaña «📝 Resultados»', !!(await p.$('#sec-tab-resultados')));
    ok('admin: sin scroll horizontal a 360 px', await sinScrollH(p));
    await p.screenshot({ path: 'secundaria-dashboard-admin-360.png', fullPage: true });
    await p.click('#sec-tab-resultados');
    ok('admin: resultados por clase', await p.waitForSelector('[data-sec-admin="sec-e2e-clase-2026-10-27-a"]', { timeout: 30000 }).then(() => true, () => false));
    await p.context().close();
  }

  // Portal: bloque «🗓️ Mi horario» compacto de 7 días, «Hoy te toca» destacado y botón a sus clases.
  for (const tema of ['light', 'dark']) {
    const sufijo = tema === 'dark' ? ' (oscuro)' : '';
    const p = await abrirPagina(b, { email: ALUMNA, viejo: true, out, viewport: { width: 360, height: 780 }, contexto: { colorScheme: tema }, ruta: '/', esperar: '#sec-hoy-toca' });
    ok('portal: «Hoy te toca» con Matemáticas y Ciencias' + sufijo, /Hoy te toca.*Matemáticas.*Ciencias/.test(await texto(p, '#sec-hoy-toca')), await texto(p, '#sec-hoy-toca'));
    const dias = await p.$$eval('[data-sec-mini]', xs => xs.map(x => x.dataset.secMini + (x.getAttribute('aria-current') ? '*' : '') + ':' + x.querySelectorAll('[role="img"]').length));
    ok('portal: 7 días (2,2,2,2,2,2,3) con hoy marcado' + sufijo, dias.join() === '2026-10-26:2,2026-10-27*:2,2026-10-28:2,2026-10-29:2,2026-10-30:2,2026-10-31:2,2026-11-01:3', dias.join());
    const alto = await altoMinimo(p, '#sec-portal .btn');
    ok('portal: botones «Mis clases» y «Mi horario» de 44 px o más' + sufijo, alto >= 44, String(alto));
    ok('portal: sin scroll horizontal a 360 px' + sufijo, await sinScrollH(p));
    await p.screenshot({ path: `secundaria-dashboard-portal-360${tema === 'dark' ? '-oscuro' : ''}.png`, fullPage: true });
    if (tema === 'light') {
      await p.click('#sec-portal-horario');
      await p.waitForSelector('#sec-horario:not([hidden])', { timeout: 60000 });
      ok('portal → «🗓️ Mi horario» abre esa pestaña', (await p.getAttribute('#sec-tab-horario', 'aria-selected')) === 'true');
    }
    await p.context().close();
  }
  // Persona sin Secundaria: el portal no muestra el bloque.
  {
    const p = await abrirPagina(b, { email: 'marisol@example.com', viejo: true, out, ruta: '/', esperar: '#home:not([hidden])' });
    ok('portal sin Secundaria: sin bloque de horario', await p.$eval('#sec-portal', s => s.hidden));
    await p.context().close();
  }

  await b.close();
  console.log(out.join('\n')); process.exit(out.some(x => x.startsWith('FAIL')) ? 1 : 0);
})().catch(e => { console.log(out.join('\n')); console.error('ERROR', e.message.slice(0, 400)); process.exit(2); });
