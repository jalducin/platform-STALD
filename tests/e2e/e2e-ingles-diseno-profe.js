// E2E: panel del profe de Inglés con el diseño RPG de Secundaria (openspec: ingles-diseno-profe).
// Revisa ingles.html (admin) y ingles.html?modo=profe a 360 px, en claro y en oscuro: encabezado con resumen
// (grupos activos, alumnos y alumnas, en riesgo), tarjetas por grupo, mapa de calor como tarjetas en celular,
// Registro como tarjetas con «🚪 Baja de Inglés», botones de 44 px o más en todas las secciones (y en el cajón),
// sin scroll horizontal, y la ruta del profe con su Plan del mes. Escritorio a 1280 px para las capturas.
// Sin Postgres, `/ingles/grupos` responde 503; para ver las tarjetas por grupo, la prueba intercepta solo ese GET en el
// navegador con dos grupos de ejemplo (no escribe nada). Las acciones reales de grupos las cubren `grupos` y `alta-alumnos`.
require('./lib/entorno'); // BASE, API, DATA, CHROME, carpeta de salida y sesión de prueba en fetch
const { chromium } = require('playwright');
const { abrirPagina } = require('./lib/navegador');
const out = []; const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`);
const API = process.env.API;
const ADMIN = 'admin@example.com';
const SECCIONES = ['resumen', 'grupos', 'alumnos', 'registro', 'semana', 'resultados', 'material', 'presentar', 'juegos'];
const slug = n => (n || '').normalize('NFD').replaceAll(/[̀-ͯ]/g, '').toLowerCase().split(/[^a-z0-9]/).filter(Boolean).join('-') || 'sin-nombre';
const sinScrollH = p => p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
// Controles visibles (botones, enlaces-botón, selectores, campos, encabezados plegables) que miden menos de 44 px.
const chicos = p => p.evaluate(() => {
  const sel = '#content button, #content a.btn, #content select, #content input:not([type=hidden]), #content summary, .app-top a, .app-top button, #nav .nav-item, dialog[open] button, dialog[open] select, dialog[open] input';
  return [...document.querySelectorAll(sel)].filter(x => x.offsetParent && x.getBoundingClientRect().height > 0 && x.getBoundingClientRect().height < 43.5)
    .map(x => (x.id || x.dataset.action || x.className || x.tagName) + ':' + Math.round(x.getBoundingClientRect().height)).slice(0, 8);
});
const fondoOscuro = p => p.evaluate(() => { const m = getComputedStyle(document.body).backgroundColor.match(/\d+/g).map(Number); return m[0] + m[1] + m[2] < 150; });

(async () => {
  const alumnos = (await (await fetch(`${API}/ingles/alumnos?email=${ADMIN}`)).json()).alumnos || [];
  const activos = alumnos.filter(x => !x.baja);
  ok('API: el registro trae alumnos y alumnas', activos.length >= 2, String(activos.length));
  // Dos grupos de ejemplo, repartidos por turno (solo en el navegador de la prueba).
  const grupos = {
    grupos: [
      { id: 'e2e-a', nombre: 'Sábado A1', nivel: 'A1', horario: 'Sáb 10:00', meet_url: 'https://meet.google.com/e2e-aaaa-bbb', color: '#4f46e5', activo: true },
      { id: 'e2e-b', nombre: 'Domingo A2', nivel: 'A2', horario: 'Dom 11:00', meet_url: '', color: '#047857', activo: true },
    ],
    miembros: Object.fromEntries(activos.map((x, i) => [slug(x.nombre), i % 2 ? 'e2e-b' : 'e2e-a'])),
  };
  const conGrupos = async p => p.route(/\/ingles\/grupos\?/, r => (r.request().method() === 'GET'
    ? r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(grupos) }) : r.continue()));
  const act = await (await fetch(`${API}/ingles/profe/actividades?email=${ADMIN}`)).json();

  const b = await chromium.launch({ executablePath: process.env.CHROME });
  for (const tema of ['light', 'dark']) {
    const suf = tema === 'dark' ? ' (oscuro)' : '';
    const arch = n => `ingles-diseno-profe-${n}${tema === 'dark' ? '-oscuro' : ''}.png`;
    const p = await abrirPagina(b, { email: ADMIN, viejo: true, ingles: true, out, viewport: { width: 360, height: 780 }, contexto: { colorScheme: tema } });
    await conGrupos(p);
    await p.goto(require('./lib/navegador').urlDe('/ingles.html#resumen'));
    await p.waitForSelector('#panel-profe', { timeout: 60000 });
    await p.waitForSelector('#mapa-calor, #tablero .card.error, #tablero .vacio', { timeout: 60000 });
    ok('tema ' + tema + ': fondo ' + (tema === 'dark' ? 'oscuro' : 'claro') + suf, (await fondoOscuro(p)) === (tema === 'dark'));
    const stats = await p.$$eval('#pp-stats .pp-stat', xs => xs.map(x => x.textContent.replace(/\s+/g, ' ').trim()));
    ok('encabezado: grupos activos, alumnos y alumnas y en riesgo' + suf, stats.length === 3 && /2\s*Grupos activos/.test(stats[0]) && stats[1].includes(String(activos.length)) && /En riesgo/.test(stats[2]) && !stats[2].includes('…'), JSON.stringify(stats));
    ok('encabezado: sin «entregas por revisar» (no existe ese dato)' + suf, !/revisar/i.test(await p.textContent('#panel-profe')));
    const tarjetas = await p.$$eval('.pp-grupo', xs => xs.map(x => x.textContent.replace(/\s+/g, ' ')));
    ok('tarjetas por grupo con avance de la semana' + suf, tarjetas.length === 2 && tarjetas.every(t => /Entregas de la semana/.test(t)) && !!(await p.$('.pp-grupo .barra[role="progressbar"]')), JSON.stringify(tarjetas).slice(0, 160));
    const fila = await p.$eval('#mapa-calor tbody tr', tr => ({ display: getComputedStyle(tr).display, etiqueta: getComputedStyle(tr.querySelector('td[data-label]'), '::before').content }));
    ok('mapa de calor: cada alumno o alumna es una tarjeta en celular' + suf, fila.display === 'grid' && fila.etiqueta && fila.etiqueta !== 'none', JSON.stringify(fila));
    for (const s of SECCIONES) {
      await p.evaluate(id => { location.hash = id; }, s);
      await p.waitForSelector(`[data-seccion="${s}"]:not([hidden])`, { timeout: 15000 });
      const malos = await chicos(p);
      ok(`#${s}: botones y campos de 44 px o más${suf}`, malos.length === 0, malos.join(' '));
      ok(`#${s}: sin scroll horizontal a 360 px${suf}`, await sinScrollH(p));
      if (['resumen', 'registro', 'alumnos', 'resultados', 'grupos'].includes(s)) await p.screenshot({ path: arch(s + '-360'), fullPage: true });
    }
    // Registro: tarjetas con «🚪 Baja de Inglés», grupo y Quitar.
    await p.evaluate(() => { location.hash = 'registro'; });
    const reg = await p.$$eval('#alumnos-admin .reg-fila:not(.de-baja)', xs => xs.map(x => !!x.querySelector('[data-action="baja-ingles"]') && !!x.querySelector('[data-action="quitar-alumno"]') && !!x.querySelector('select.mover-grupo')));
    ok('Registro: cada tarjeta trae grupo, «🚪 Baja de Inglés» y Quitar' + suf, reg.length === activos.length && reg.every(Boolean), String(reg.length));
    ok('Registro: campos con etiqueta visible' + suf, (await p.$$('#alta-alumno label.campo-et')).length >= 2);
    // Cajón desde el mapa de calor: botones de 44 px.
    await p.evaluate(() => { location.hash = 'resumen'; });
    await p.click('#mapa-calor td.alumno button');
    await p.waitForSelector('dialog#cajon[open] .cajon-cab');
    const malosCajon = await chicos(p);
    ok('cajón del alumno o alumna: botones y campos de 44 px o más' + suf, malosCajon.length === 0, malosCajon.join(' '));
    await p.screenshot({ path: arch('cajon-360') });
    await p.keyboard.press('Escape');
    // «🔍 Ver grupo» filtra como el selector (sin Postgres el resumen del grupo de ejemplo no existe: se revisa el filtro).
    await p.click('.pp-grupo [data-action="ver-grupo"][data-id="e2e-a"]');
    await p.waitForFunction(() => (document.getElementById('grupo-filtro') || {}).value === 'e2e-a', null, { timeout: 30000 });
    ok('«🔍 Ver grupo» filtra el panel por ese grupo' + suf, /Sábado A1/.test(await p.textContent('#pp-hero-t')));
    await p.context().close();

    // Ruta del profe (?modo=profe) con su Plan del mes.
    const m = await abrirPagina(b, { email: ADMIN, viejo: true, ingles: true, out, viewport: { width: 360, height: 780 }, contexto: { colorScheme: tema }, init: [() => { localStorage.removeItem('profe_tab'); }], ruta: '/ingles.html?modo=profe', esperar: '.pf-hero' });
    const malosRuta = await chicos(m);
    ok('ruta del profe: botones y pestañas de 44 px o más' + suf, malosRuta.length === 0, malosRuta.join(' '));
    ok('ruta del profe: sin scroll horizontal a 360 px' + suf, await sinScrollH(m));
    await m.screenshot({ path: arch('ruta-360'), fullPage: true });
    if (act.plan) {
      const delPlan = act.plan.semanas.flatMap(s => s.elementos.map(e => e.id));
      const abiertos = delPlan.filter(id => { const it = act.items.find(i => i.id === id); return it && it.estado !== 'proximamente'; }).length;
      await m.click('[data-pf-tab="plan"]');
      await m.waitForSelector('#ruta-plan');
      await m.$$eval('#ruta-plan details.ruta-sem', ds => ds.forEach(d => { d.open = true; }));
      const enPlan = await m.$$eval('#ruta-plan [data-plan-id]', xs => ({ total: xs.length, conAccion: xs.filter(x => x.querySelector('button, a.btn')).length }));
      ok(`Plan del mes: ${delPlan.length} clases y ${abiertos} abiertas con su botón${suf}`, enPlan.total === delPlan.length && enPlan.conAccion === abiertos, JSON.stringify(enPlan));
      const malosPlan = await chicos(m);
      ok('Plan del mes: botones de 44 px o más' + suf, malosPlan.length === 0, malosPlan.join(' '));
      ok('Plan del mes: sin scroll horizontal a 360 px' + suf, await sinScrollH(m));
      await m.screenshot({ path: arch('plan-360'), fullPage: true });
    } else console.log('Datos sin plan del profe: se omite el Plan del mes');
    await m.context().close();
  }

  // Escritorio (claro): panel y ruta.
  const d = await abrirPagina(b, { email: ADMIN, viejo: true, ingles: true, out, viewport: { width: 1280, height: 900 } });
  await conGrupos(d);
  await d.goto(require('./lib/navegador').urlDe('/ingles.html#resumen'));
  await d.waitForSelector('#mapa-calor', { timeout: 60000 });
  const tabla = await d.$eval('#mapa-calor tbody tr', tr => getComputedStyle(tr).display);
  ok('escritorio: el mapa de calor sigue siendo tabla', tabla === 'table-row', tabla);
  await d.screenshot({ path: 'ingles-diseno-profe-resumen-escritorio.png', fullPage: true });
  await d.evaluate(() => { location.hash = 'registro'; });
  await d.waitForSelector('[data-seccion="registro"]:not([hidden])');
  await d.screenshot({ path: 'ingles-diseno-profe-registro-escritorio.png', fullPage: true });
  await d.goto(require('./lib/navegador').urlDe('/ingles.html?modo=profe'));
  await d.waitForSelector('.pf-hero');
  await d.screenshot({ path: 'ingles-diseno-profe-ruta-escritorio.png', fullPage: true });
  await d.context().close();
  await b.close();
  console.log(out.join('\n')); process.exit(out.some(x => x.startsWith('FAIL')) ? 1 : 0);
})().catch(e => { console.log(out.join('\n')); console.error('ERROR', e.message.slice(0, 300)); process.exit(2); });
