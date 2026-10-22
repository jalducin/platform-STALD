// E2E: misión principal en Inglés con el motor de Secundaria (openspec: rpg-ingles-hero-card). Jesus (cuenta de
// prueba) tiene la misión de ejemplo `mis-ingles-e2e-hero-card` (tests/fixtures/datos); Angel no tiene misiones. El
// profe la evalúa en «📥 Entregas» y la XP llega al tablero RPG. A 360 px, en claro y en oscuro.
require('./lib/entorno');
const { chromium } = require('playwright');
const API = process.env.API;
const { abrirPagina } = require('./lib/navegador');
const out = []; const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`);
const ADMIN = 'admin@example.com', JESUS = 'jesus@example.com', ANGEL = 'angel@example.com';
const ID = 'mis-ingles-e2e-hero-card';
const VISTA = { width: 360, height: 780 };
const pedir = async (ruta, email, body) => {
  const r = await fetch(API + ruta + (ruta.includes('?') ? '&' : '?') + 'email=' + encodeURIComponent(email),
    body ? { method: 'POST', headers: { 'content-type': 'text/plain;charset=UTF-8' }, body: JSON.stringify(body) } : {});
  return { status: r.status, body: await r.json().catch(() => ({})) };
};
const sinScrollH = p => p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
const xpTexto = p => p.evaluate(() => ({ nivel: (document.getElementById('rpg-rango') || {}).textContent || '', xp: (document.getElementById('rpg-xp') || {}).textContent || '' }));
// Al final: borrar el texto de sus entregas (la fase «ingles» comparte datos con otras pruebas).
const restaurar = () => pedir('/profe/entregas/persona/jesus/borrar', ADMIN, {}).catch(() => {});

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME });
  // Aviso en /ingles/actividades: solo quien tiene misiones visibles
  ok('/ingles/actividades avisa misiones a Jesus', (await pedir('/ingles/actividades', JESUS)).body.misiones === true);
  ok('/ingles/actividades no avisa misiones a Angel', (await pedir('/ingles/actividades', ANGEL)).body.misiones === undefined);

  // 1) Jesus: tarjeta de misión en Inicio y sección «⚔️ Misiones»
  const pedidas = [];
  const p = await abrirPagina(b, { email: JESUS, viejo: true, ingles: true, out, viewport: VISTA, ruta: '/ingles.html', esperar: '#mis-inicio' });
  p.on('request', r => pedidas.push(r.url()));
  const antes = await xpTexto(p);
  ok('Inicio: «⚔️ Misión principal del mundo» con «Continuar misión»', (await p.textContent('#mis-inicio')).includes('My Hero Card') && !!(await p.$('#mis-inicio [data-mis-abrir]')));
  ok('la barra sigue con 6 pestañas (Misiones se abre desde Inicio)', (await p.$$('#nav .nav-item')).length === 6 && !(await p.$('#nav [data-nav="misiones"]')));
  ok('Inicio sin scroll horizontal a 360 px', await sinScrollH(p));
  await p.screenshot({ path: 'misiones-ingles-inicio.png', fullPage: true });
  await p.click('#mis-inicio [data-mis-abrir]');
  await p.waitForSelector('[data-seccion="misiones"]:not([hidden]) [data-mis-detalle]', { timeout: 30000 });
  ok('«Continuar misión» abre la misión en «⚔️ Misiones»', (await p.evaluate(() => location.hash)) === '#misiones');
  ok('detalle: consigna, pasos con cuadro de texto y rúbrica', (await p.$$('[data-seccion="misiones"] form.mis-entrega')).length >= 1 && (await p.textContent('[data-seccion="misiones"]')).includes('Consigna'));
  await p.fill('[data-seccion="misiones"] form.mis-entrega textarea', 'My hero is Captain Nova. She is twelve. Her colors are blue and silver.');
  await p.click('[data-seccion="misiones"] form.mis-entrega button[type=submit]');
  await p.waitForFunction(() => /Paso entregado/.test(document.querySelector('[data-seccion="misiones"]').textContent), null, { timeout: 30000 });
  ok('entrega del paso 1 en texto: «✅ ¡Paso entregado!»', true);
  ok('misión: sin scroll horizontal a 360 px', await sinScrollH(p));
  await p.screenshot({ path: 'misiones-ingles-detalle.png', fullPage: true });
  await p.context().close();

  // Pasos 2 y 3 por la API (mismo motor) para dejarla lista para evaluar
  for (const paso of ['p2', 'p3']) {
    const r = await pedir('/misiones/' + ID + '/entrega', JESUS, { paso, texto: 'She has a red bike and a small robot.' });
    ok('entrega ' + paso, r.status === 200, String(r.status));
  }

  // 2) Angel: sin misiones, mensaje amable y sin pedir /misiones
  const a = await abrirPagina(b, { email: ANGEL, viejo: true, ingles: true, out, viewport: VISTA, ruta: '/ingles.html', esperar: '#rpg-stats' });
  const pedidasA = [];
  a.on('request', r => pedidasA.push(r.url()));
  await a.reload(); await a.waitForSelector('#rpg-stats', { timeout: 60000 });
  ok('Angel: sin tarjeta de misión en Inicio', !(await a.$('#mis-inicio')));
  ok('Angel: no se pide /misiones', !pedidasA.some(u => /\/misiones(\?|$)/.test(u)), pedidasA.filter(u => u.includes('misiones')).join(','));
  await a.context().close();

  // 3) Profe: «📥 Entregas» y evaluación con la rúbrica
  const ad = await abrirPagina(b, { email: ADMIN, viejo: true, ingles: true, out, viewport: VISTA, ruta: '/ingles.html#entregas', esperar: '#sec-entregas form.ent-evaluar' });
  ok('bandeja: la entrega de Jesus «Lista para evaluar», sin correos', (await ad.textContent('#sec-entregas')).includes('Jesus') && (await ad.textContent('#sec-entregas')).includes('Lista para evaluar') && !(await ad.textContent('#sec-entregas')).includes('@'));
  for (const c of ['c1', 'c2', 'c3', 'c4']) await ad.check('form.ent-evaluar input[data-criterio="' + c + '"][value="25"]');
  await ad.fill('form.ent-evaluar [data-ent-comentario]', 'Great hero card!');
  await ad.click('form.ent-evaluar button[type=submit]');
  await ad.waitForFunction(() => /Evaluada/.test(document.getElementById('sec-entregas').textContent), null, { timeout: 30000 });
  ok('el profe la evalúa con la rúbrica', true);
  ok('bandeja sin scroll horizontal a 360 px', await sinScrollH(ad));
  await ad.screenshot({ path: 'misiones-ingles-bandeja.png', fullPage: true });
  await ad.context().close();

  // 4) Jesus ve la retroalimentación y la XP de la misión en su tablero (claro y oscuro)
  for (const tema of ['light', 'dark']) {
    const m = await abrirPagina(b, { email: JESUS, viejo: true, ingles: true, out, viewport: VISTA, contexto: { colorScheme: tema }, ruta: '/ingles.html', esperar: '#rpg-stats' });
    const despues = await xpTexto(m);
    if (tema === 'light') {
      ok('aviso «¡El profe evaluó tu misión!» con +XP', !!(await m.$('#mis-recompensa')) && (await m.textContent('#mis-recompensa')).includes('XP'));
      ok('la XP de la misión suma al tablero RPG', despues.nivel !== antes.nivel || despues.xp !== antes.xp, JSON.stringify([antes, despues]));
    }
    ok('Inicio con misión evaluada sin scroll horizontal (' + tema + ')', await sinScrollH(m));
    await m.screenshot({ path: 'misiones-ingles-evaluada-' + tema + '.png', fullPage: true });
    await m.context().close();
  }
  await b.close();
  await restaurar();
  console.log(out.join('\n')); process.exit(out.some(x => x.startsWith('FAIL')) ? 1 : 0);
})().catch(async e => { await restaurar(); console.log(out.join('\n')); console.error('ERROR', e.message.slice(0, 400)); process.exit(2); });
