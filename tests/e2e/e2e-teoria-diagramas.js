// E2E: diagramas en la teoría (openspec: teoria-diagramas). Fernando (persona de ejemplo) abre la actividad de prueba
// `diagramas-e2e` (tests/fixtures/datos, exclusiva de él) con los 5 tipos de diagrama, en modo claro y oscuro, en un
// celular de 360 px y en escritorio de 1280 px: se pintan todos, el texto con HTML sale escapado, no hay scroll
// horizontal y el flujo va en columna en el celular y en fila en escritorio. Después el admin presenta el Meet de
// prueba (meet-2026-09-27), cuya diapositiva `teoria` trae un ciclo. Capturas PNG en tests/e2e/salida/.
require('./lib/entorno'); // BASE, API, CHROME, carpeta de salida y sesión de prueba en fetch
const { chromium } = require('playwright');
const { abrirPagina } = require('./lib/navegador');
const out = []; const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`);
const ALUMNO = 'fernando@example.com';
const ID = 'diagramas-e2e';
const TIPOS = ['flujo', 'ciclo', 'capas', 'ramas', 'ramas', 'comparar', 'flujo']; // orden de la teoría del fixture
const temaGuardado = t => { try { localStorage.setItem('stald_tema', t); } catch { /* sin almacenamiento */ } };

async function revisar(b, modo, ancho) {
  const et = `${modo} ${ancho}px`;
  const p = await abrirPagina(b, {
    email: ALUMNO, ingles: true, out, etiqueta: et, viewport: { width: ancho, height: 900 }, init: [temaGuardado, modo],
    ruta: '/ingles.html#semana', esperar: `#al-dia [data-action="abrir-item"][data-id="${ID}"]`,
  });
  await p.click(`#al-dia [data-action="abrir-item"][data-id="${ID}"]`);
  await p.waitForSelector('.dg', { timeout: 60000 });
  await p.waitForTimeout(400); // animaciones de entrada

  const tipos = await p.$$eval('.dg', xs => xs.map(x => [...x.classList].find(c => /^dg-(flujo|ciclo|capas|ramas|comparar)$/.test(c)).slice(3)));
  ok(`${et}: se pintan los 7 diagramas de los 5 tipos en orden`, tipos.join(',') === TIPOS.join(','), tipos.join(','));
  const tamanos = await p.$$eval('.dg', xs => xs.map(x => { const r = x.getBoundingClientRect(); return r.width > 50 && r.height > 40; }));
  ok(`${et}: cada diagrama tiene tamaño visible`, tamanos.length === 7 && tamanos.every(Boolean));
  ok(`${et}: cajas por diagrama (4,4,4,4,6,4+cabeceras,8)`, (await p.$$eval('.dg', xs => xs.map(x => x.querySelectorAll('.dg-nodo').length))).join(',') === '4,4,4,4,6,4,8');

  // Escapado: el texto con etiquetas se ve literal y no corre nada.
  const flujo = await p.$eval('.dg-flujo', x => ({ texto: x.textContent, negritas: [...x.querySelectorAll('b')].map(e => e.textContent), scripts: x.querySelectorAll('script').length }));
  ok(`${et}: HTML de los datos escapado`, flujo.texto.includes('Abre el PR <b>sin HTML</b>') && flujo.texto.includes('<script>window.__xss = 1</script>') && flujo.scripts === 0 &&
    !flujo.negritas.includes('sin HTML') && !(await p.evaluate(() => window.__xss)), JSON.stringify(flujo.negritas));

  // Sin scroll horizontal y nada se sale de la pantalla.
  const desborde = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth,
    fuera: [...document.querySelectorAll('.dg, .dg *')].filter(e => e.getBoundingClientRect().right > window.innerWidth + 1).length }));
  ok(`${et}: sin scroll horizontal`, desborde.sw <= desborde.cw && desborde.fuera === 0, JSON.stringify(desborde));

  // Disposición: flujo en columna en el celular y en fila en escritorio; ciclo con U de regreso solo en fila.
  const tops = await p.$eval('.dg-flujo', x => [...x.querySelectorAll('.dg-nodo')].map(n => Math.round(n.getBoundingClientRect().top)));
  const enFila = new Set(tops).size === 1;
  const u = await p.$eval('.dg-ciclo .dg-regreso', x => getComputedStyle(x).borderBottomWidth);
  const abanico = await p.$eval('.dg-ramas', x => new Set([...x.querySelectorAll('.dg-nodo')].map(n => Math.round(n.getBoundingClientRect().top))).size === 1);
  const largoEnColumna = await p.$eval('.dg-flujo.dg-w3', x => new Set([...x.querySelectorAll('.dg-nodo')].map(n => Math.round(n.getBoundingClientRect().top))).size === 8);
  if (ancho <= 400) {
    ok(`${et}: flujo en columna`, !enFila && tops.every((t, i) => !i || t > tops[i - 1]), tops.join(','));
    ok(`${et}: ciclo con pastilla de regreso (sin U)`, u === '0px' && (await p.textContent('.dg-ciclo .dg-regreso')).includes('Vuelve a «Explorar»'));
    ok(`${et}: ramas en árbol`, !abanico);
  } else {
    ok(`${et}: flujo en fila`, enFila, tops.join(','));
    ok(`${et}: ciclo con U de regreso`, u === '2px', u);
    ok(`${et}: ramas (4) en abanico`, abanico);
  }
  if (ancho <= 400) ok(`${et}: flujo de 8 pasos en columna`, largoEnColumna);

  // Colores del tema.
  const fondo = await p.$eval('.dg-nodo', x => getComputedStyle(x).backgroundColor);
  const texto = await p.$eval('.dg-nodo b', x => getComputedStyle(x).color);
  const oscuro = await p.evaluate(() => document.documentElement.dataset.theme === 'dark');
  ok(`${et}: tema ${modo} aplicado`, oscuro === (modo === 'oscuro'), `${fondo} / ${texto}`);

  await p.addStyleTag({ content: '.exam-bar, #nav, .player-progreso { visibility: hidden !important; }' }); // capturas sin barras fijas encima
  const nombres = {};
  const dgs = await p.$$('.dg');
  for (let i = 0; i < dgs.length; i++) {
    const n = TIPOS[i] + (nombres[TIPOS[i]] = (nombres[TIPOS[i]] || 0) + 1);
    await dgs[i].scrollIntoViewIfNeeded();
    await dgs[i].screenshot({ path: `diagrama-${modo}-${ancho}-${n}.png` });
  }
  await p.screenshot({ path: `diagramas-${modo}-${ancho}-pantalla.png`, timeout: 60000 }).catch(() => {}); // referencia; no es parte de la verificación
  await p.context().close();
  return { fondo, texto };
}

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME });
  const colores = {};
  for (const modo of ['claro', 'oscuro']) for (const ancho of [360, 1280]) colores[modo + ancho] = await revisar(b, modo, ancho);
  ok('claro y oscuro con colores distintos', colores.claro360.fondo !== colores.oscuro360.fondo && colores.claro360.texto !== colores.oscuro360.texto, JSON.stringify(colores));

  // Diapositiva `teoria` del Meet con un ciclo.
  const p = await abrirPagina(b, { email: 'admin@example.com', out, etiqueta: 'admin', viewport: { width: 1280, height: 800 }, ruta: '/ingles.html#presentar', esperar: '#pres-semana' });
  await p.waitForSelector('#pres-anteriores [data-action="presentar"][data-id="meet-2026-09-27"]', { timeout: 15000 });
  await p.click('#pres-anteriores [data-action="presentar"][data-id="meet-2026-09-27"]');
  await p.waitForSelector('.deck', { timeout: 15000 });
  await p.keyboard.press('ArrowRight');
  await p.waitForSelector('.slide .dg-ciclo', { timeout: 15000 }).then(() => ok('diapositiva teoria con el diagrama', true), () => ok('diapositiva teoria con el diagrama', false));
  await p.waitForTimeout(500);
  const dentro = await p.evaluate(() => { const s = document.querySelector('.slide').getBoundingClientRect(); const d = document.querySelector('.slide .dg').getBoundingClientRect(); return d.bottom <= s.bottom + 1 && d.right <= s.right + 1; });
  ok('el diagrama cabe en la diapositiva', dentro);
  ok('diapositiva: ciclo en fila con U', await p.$eval('.slide .dg-regreso', x => getComputedStyle(x).borderBottomWidth === '2px'));
  await p.screenshot({ path: 'diagrama-diapositiva-ciclo.png' });
  await b.close();
  console.log(out.join('\n')); process.exit(out.some(x => x.startsWith('FAIL')) ? 1 : 0);
})().catch(e => { console.log(out.join('\n')); console.error('ERROR', e.message.slice(0, 400)); process.exit(2); });
