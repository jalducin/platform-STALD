// E2E: material de estudio siempre disponible (openspec: ingles-material-estudio). La sección «📚 Material» lista las
// guías del catálogo ingles/material/indice.json para alumnos y alumnas, el admin, la ruta del profe y sin sesión, sin
// depender de las fechas de las actividades. Se corre con el «hoy» por omisión (antes de que abra guia-2026-10-23) y
// con --hoy 2026-11-05 (cuando ya venció). Celular 390×844 y escritorio; capturas en la carpeta de salida.
require('./lib/entorno'); // BASE, API, DATA, CHROME, carpeta de salida y sesión de prueba en fetch
const { chromium } = require('playwright');
const { abrirPagina } = require('./lib/navegador');
const { BASE, API } = process.env;
const out = []; const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`);
const ESCRITORIO = { width: 1280, height: 800 };
const GUIA = 'guia-tres-tiempos-y-to-be';
// Páginas declaradas en el catálogo del repo (la prueba Deno ya compara ese número con el PDF real).
const PAGINAS = require('../../ingles/material/indice.json').find(g => g.id === GUIA).paginas;

// Revisa la lista de guías visible dentro de `raiz` y que la descarga responda con el PDF.
async function revisarLista(p, raiz, etiqueta) {
  const sel = raiz + ' .material-guia[data-guia="' + GUIA + '"]';
  await p.waitForSelector(sel, { state: 'visible', timeout: 60000 });
  const g = await p.$eval(sel, el => ({
    titulo: el.querySelector('.material-titulo').textContent,
    desc: el.querySelector('.material-desc').textContent,
    temas: [...el.querySelectorAll('.chip')].map(c => c.textContent),
    meta: el.querySelector('.material-meta').textContent,
    descargar: el.querySelector('[data-descargar]').getAttribute('href'),
    tieneDownload: el.querySelector('[data-descargar]').hasAttribute('download'),
    ver: el.querySelector('[data-ver]').getAttribute('href'),
    verBlank: el.querySelector('[data-ver]').getAttribute('target') === '_blank',
    textoBtns: [...el.querySelectorAll('.btn')].map(b => b.textContent.trim()),
    altos: [...el.querySelectorAll('.btn')].map(b => Math.round(b.getBoundingClientRect().height)),
    candado: /🔒|vence|fecha límite/i.test(el.textContent),
  }));
  ok(`${etiqueta}: guía con título, descripción, temas y páginas`, /3 tiempos/.test(g.titulo) && g.desc.length > 40 && /Practica con IA/.test(g.desc) && g.temas.includes('pasado simple') && g.meta.includes(PAGINAS + ' páginas') && g.meta.includes('Mes 1'), JSON.stringify({ t: g.titulo, temas: g.temas, meta: g.meta }));
  ok(`${etiqueta}: botones «⬇️ Descargar PDF» y «👁️ Ver»`, g.textoBtns.includes('⬇️ Descargar PDF') && g.textoBtns.includes('👁️ Ver') && g.tieneDownload && g.verBlank, g.textoBtns.join(' | '));
  ok(`${etiqueta}: sin candado ni fecha límite`, !g.candado);
  ok(`${etiqueta}: botones de al menos 44 px`, g.altos.every(h => h >= 44), g.altos.join(','));
  const url = new URL(g.descargar, p.url()).href;
  const r = await fetch(url);
  const tipo = r.headers.get('content-type') || '';
  const cabeza = Buffer.from(await r.arrayBuffer()).subarray(0, 5).toString();
  ok(`${etiqueta}: la descarga responde 200 con el PDF`, r.status === 200 && tipo.includes('application/pdf') && cabeza === '%PDF-' && url.endsWith('/ingles/material/' + GUIA + '.pdf'), `${r.status} ${tipo} ${url}`);
  ok(`${etiqueta}: «Ver» abre el mismo PDF`, new URL(g.ver, p.url()).href === url);
}
const sinScrollX = p => p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME });

  // Contexto: ¿en qué estado está la actividad de la guía según el «hoy» del servidor? (solo informativo)
  const act = await (await fetch(API + '/ingles/actividades?email=marisol@example.com')).json();
  const it = (act.items || []).find(i => i.id === 'guia-2026-10-23');
  console.log(`INFO hoy del servidor ${act.hoy}; actividad guia-2026-10-23: ${it ? it.estado + ' (vence ' + it.fechaLimite + ')' : 'no está en la semana actual'}`);

  // Catálogo público
  const ind = await fetch(BASE + '/ingles/material/indice.json');
  const lista = await ind.json();
  ok('catálogo: indice.json responde 200 con la guía', ind.status === 200 && Array.isArray(lista) && lista.some(g => g.id === GUIA), String(ind.status));

  // Alumna en celular: pestaña en la barra, junto a «Semana»
  const al = await abrirPagina(b, { email: 'marisol@example.com', viejo: true, ingles: true, out, ruta: '/ingles.html', esperar: '#nav [data-nav="material"]' });
  const barra = await al.$$eval('#nav .nav-item', xs => xs.map(x => x.dataset.nav || x.dataset.navAccion));
  ok('alumna 390: «📚 Material» en la barra, después de «Semana»', barra.indexOf('material') === barra.indexOf('semana') + 1, barra.join(','));
  await al.click('#nav [data-nav="material"]');
  await al.waitForSelector('#nav [data-nav="material"][aria-current="page"]', { timeout: 10000 }).catch(() => {}); // sin carrera tras el clic
  ok('alumna 390: dirección #material y pestaña marcada', new URL(al.url()).hash === '#material' && (await al.getAttribute('#nav [data-nav="material"]', 'aria-current')) === 'page');
  await revisarLista(al, '[data-seccion="material"]', 'alumna 390');
  ok('alumna 390: sin desplazamiento horizontal', await sinScrollX(al));
  const etiquetas = await al.$$eval('#nav .nav-label', xs => xs.map(x => x.scrollWidth <= x.clientWidth + 1));
  ok('alumna 390: etiquetas de la barra completas', etiquetas.every(Boolean), etiquetas.join(','));
  await al.screenshot({ path: 'material-alumna-390.png', fullPage: true });

  // Alumna en escritorio, entrando directo por el atajo (#material)
  const ald = await abrirPagina(b, { email: 'marisol@example.com', viejo: true, ingles: true, out, viewport: ESCRITORIO, ruta: '/ingles.html#material' });
  await revisarLista(ald, '[data-seccion="material"]', 'alumna escritorio');
  await ald.screenshot({ path: 'material-alumna-escritorio.png', fullPage: true });

  // Admin: sección en el menú (escritorio) y en «☰ Más» (celular)
  const ad = await abrirPagina(b, { email: 'admin@example.com', viejo: true, ingles: true, out, viewport: ESCRITORIO, ruta: '/ingles.html', esperar: '#nav [data-nav="material"]' });
  await ad.click('#nav [data-nav="material"]');
  await revisarLista(ad, '[data-seccion="material"]', 'admin escritorio');
  await ad.screenshot({ path: 'material-admin-escritorio.png', fullPage: true });
  const adm = await abrirPagina(b, { email: 'admin@example.com', viejo: true, ingles: true, out, ruta: '/ingles.html', esperar: '#nav [data-nav-accion="mas"]' });
  await adm.click('#nav [data-nav-accion="mas"]');
  await adm.click('#nav-mas [data-nav="material"]');
  await revisarLista(adm, '[data-seccion="material"]', 'admin 390');
  ok('admin 390: sin desplazamiento horizontal', await sinScrollX(adm));
  await adm.screenshot({ path: 'material-admin-390.png', fullPage: true });

  // Profe en su ruta: pestaña «📚 Material» junto a «Esta semana»
  const pf = await abrirPagina(b, { email: 'admin@example.com', viejo: true, ingles: true, out, ruta: '/ingles.html?modo=profe', esperar: '[data-pf-tab="material"]' });
  const tabs = await pf.$$eval('[data-pf-tab]', xs => xs.map(x => x.dataset.pfTab));
  ok('profe: pestaña «📚 Material» después de «Esta semana»', tabs[0] === 'semana' && tabs[1] === 'material', tabs.join(','));
  await pf.click('[data-pf-tab="material"]');
  await revisarLista(pf, '[data-pf-panel="material"]', 'profe 390');
  ok('profe 390: sin desplazamiento horizontal', await sinScrollX(pf));
  await pf.screenshot({ path: 'material-profe-390.png', fullPage: true });
  const pfd = await abrirPagina(b, { email: 'admin@example.com', viejo: true, ingles: true, out, viewport: ESCRITORIO, ruta: '/ingles.html?modo=profe', esperar: '[data-pf-tab="material"]' });
  await pfd.click('[data-pf-tab="material"]');
  await revisarLista(pfd, '[data-pf-panel="material"]', 'profe escritorio');
  await pfd.screenshot({ path: 'material-profe-escritorio.png', fullPage: true });

  // Sin sesión: el material público bajo la caja de entrada; nada más de Inglés
  const anon = await abrirPagina(b, { out, etiqueta: 'sin sesión', ruta: '/ingles.html' });
  await anon.waitForSelector('[data-stald-auth]', { timeout: 60000 });
  await revisarLista(anon, '#material-publico', 'sin sesión 390');
  ok('sin sesión: la app de Inglés sigue oculta', await anon.isHidden('#app') && await anon.isHidden('#nav'));
  ok('sin sesión 390: sin desplazamiento horizontal', await sinScrollX(anon));
  await anon.screenshot({ path: 'material-sin-sesion-390.png', fullPage: true });
  const sec = await abrirPagina(b, { out, etiqueta: 'secundaria sin sesión', ruta: '/ingles.html?modo=secundaria' });
  await sec.waitForSelector('[data-stald-auth]', { timeout: 60000 });
  ok('Secundaria sin sesión: sin material de Inglés', await sec.isHidden('#material-publico'));

  // Portal: atajo para la alumna y para el admin
  for (const [email, quien] of [['marisol@example.com', 'alumna'], ['admin@example.com', 'admin']]) {
    const po = await abrirPagina(b, { email, viejo: true, out, ruta: '/', esperar: '[data-espacio]' });
    ok(`portal ${quien}: atajo «📚 Material de estudio de Inglés»`, await po.isVisible('#material-link'));
    if (quien === 'alumna') {
      await po.screenshot({ path: 'material-portal-alumna-390.png', fullPage: true });
      await po.click('#material-link');
      await po.waitForSelector('[data-seccion="material"]:not([hidden]) .material-guia', { timeout: 60000 });
      ok('portal alumna: el atajo abre la sección', new URL(po.url()).hash === '#material');
    }
  }
  await b.close();
  console.log(out.join('\n')); process.exit(out.some(x => x.startsWith('FAIL')) ? 1 : 0);
})().catch(e => { console.log(out.join('\n')); console.error('ERROR', e.message.slice(0, 400)); process.exit(2); });
