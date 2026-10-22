// E2E: misiones principales de Secundaria (openspec: rpg-fase2-misiones). Con la misión inventada del fixture
// (tests/fixtures/datos/contenido/secundaria/misiones/mis-e2e-valle-de-los-numeros.json, solo para la alumna del
// fixture), mundos.json y el servidor con `--hoy 2026-10-27`. Corre en la fase de Secundaria sobre la copia temporal
// de datos (o stald_test_* con --pg), que correr.sh borra al terminar: no queda ninguna entrega de prueba.
// Revisa a 360 px, en claro y en oscuro: «⚔️ Misiones» (pasos, recordatorio de privacidad, contador, entrega en texto,
// práctica comprobada en el servidor), archivo → 400, la bandeja del admin con la rúbrica (XP = rúbrica × 3 + 60),
// la retroalimentación de la alumna (XP y nivel), «🗺️ Mapa» y «🌳 Árbol».
require('./lib/entorno');
require('../../comun/gamificacion.js');
const { chromium } = require('playwright');
const { abrirPagina } = require('./lib/navegador');
const G = globalThis.Gamificacion;
const out = []; const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`);
const ALUMNA = 'valeria@example.com';
const ADMIN = 'admin@example.com';
const HOY = '2026-10-27';
const ID = 'mis-e2e-valle-de-los-numeros';
const API = process.env.API;
const q = e => '?email=' + encodeURIComponent(e);
const texto = async (p, sel) => ((await p.textContent(sel)) || '').replace(/\s+/g, ' ').trim();
const sinScrollH = p => p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
const altoMinimo = (p, sel) => p.$$eval(sel, xs => xs.filter(x => x.offsetParent).map(x => Math.round(x.getBoundingClientRect().height)).reduce((a, b) => Math.min(a, b), 999));
const misiones = e => fetch(`${API}/misiones${q(e)}`).then(async x => ({ status: x.status, body: await x.json() }));
const post = (ruta, e, body, tipo = 'application/json') => fetch(`${API}${ruta}${q(e)}`, { method: 'POST', headers: { 'content-type': tipo }, body: typeof body === 'string' ? body : JSON.stringify(body) })
  .then(async x => ({ status: x.status, body: await x.json().catch(() => ({})) }));

(async () => {
  const r0 = await fetch(`${API}/secundaria/actividades${q(ALUMNA)}`).then(x => x.json());
  if (r0.hoy !== HOY) { console.log(`OMIT el servidor corre con hoy ${r0.hoy}; esta prueba necesita --hoy ${HOY}`); process.exit(0); }
  const m0 = await misiones(ALUMNA);
  const mision = (m0.body.misiones || []).find(m => m.id === ID);
  ok('API: la alumna ve la misión de prueba y el catálogo de mundos', m0.status === 200 && !!mision && Array.isArray(m0.body.mundos), m0.status);
  ok('API: la práctica de la teoría llega sin la respuesta', !!mision && !JSON.stringify(mision.teoria).includes('"correcta"') && !JSON.stringify(mision.teoria).includes('aceptadas'));
  if (!mision) { console.log(out.join('\n')); process.exit(1); }
  if (mision.evaluacion) { console.log('OMIT la misión ya está evaluada en esta copia de datos (otra corrida)'); process.exit(0); }
  // Matriz básica por la API.
  ok('API: imagen → 400 tipo_no_permitido', (await post(`/misiones/${ID}/entrega`, ALUMNA, { paso: 'p1', texto: 'x', imagen: 'data:image/png;base64,AAAA' })).body.error === 'tipo_no_permitido');
  ok('API: multipart → 400 tipo_no_permitido', (await post(`/misiones/${ID}/entrega`, ALUMNA, '--b\r\n\r\nAAAA\r\n--b--', 'multipart/form-data; boundary=b')).body.error === 'tipo_no_permitido');
  ok('API: > 4 000 caracteres → 400 entrega_invalida', (await post(`/misiones/${ID}/entrega`, ALUMNA, { paso: 'p1', texto: 'x'.repeat(4001) })).body.error === 'entrega_invalida');
  ok('API: la bandeja es solo del admin (403 a la alumna)', (await fetch(`${API}/profe/entregas${q(ALUMNA)}`)).status === 403);
  ok('API: correo no asignado → 403', (await misiones('nadie.asignado@example.com')).status === 403);

  const b = await chromium.launch({ executablePath: process.env.CHROME });
  for (const tema of ['light', 'dark']) {
    const sufijo = tema === 'dark' ? ' (oscuro)' : '';
    const archivo = n => `misiones-${n}${tema === 'dark' ? '-oscuro' : ''}.png`;
    const p = await abrirPagina(b, { email: ALUMNA, viejo: true, out, viewport: { width: 360, height: 780 }, contexto: { colorScheme: tema }, ruta: '/secundaria.html#misiones', esperar: '#sec-misiones:not([hidden])' });
    ok('pestaña «⚔️ Misiones» con la tarjeta de la misión' + sufijo, await p.isVisible(`[data-mis-card="${ID}"]`));
    ok('Inicio: tarjeta de la misión principal y misiones de la semana sin XP' + sufijo, (await p.$('#mis-inicio')) !== null && (await p.$('#mis-semana')) !== null);
    await p.click(`[data-mis-card="${ID}"] [data-mis-abrir]`);
    await p.waitForSelector('[data-mis-detalle]');
    ok('detalle: consigna con saltos de línea, 3 pasos y rúbrica de 4 criterios' + sufijo, (await p.$$('.mis-paso')).length === 3 && (await p.$$('.mis-criterio')).length === 4 && (await p.$eval('.mis-pre', x => getComputedStyle(x).whiteSpace)) === 'pre-line');
    ok('recordatorio «Sin nombres reales…» antes de enviar y sin campo de nombre' + sufijo, (await texto(p, '[data-mis-paso="p1"] .mis-aviso')).includes('Sin nombres reales, direcciones ni datos de contacto') && (await p.$$('[data-mis-detalle] input[name*="nombre" i]')).length === 0);
    await p.fill('[data-mis-paso="p1"] textarea', 'Jamaica: 12.50 pesos');
    ok('contador de caracteres' + sufijo, (await texto(p, '[data-mis-paso="p1"] .mis-cuenta')) === '20 / 4000', await texto(p, '[data-mis-paso="p1"] .mis-cuenta'));
    ok('misión: sin scroll horizontal a 360 px' + sufijo, await sinScrollH(p));
    ok('misión: botones y casillas de 44 px o más' + sufijo, (await altoMinimo(p, '[data-mis-detalle] .btn, .mis-opcion')) >= 44, String(await altoMinimo(p, '[data-mis-detalle] .btn, .mis-opcion')));
    if (tema === 'light') {
      // Práctica (se comprueba en el servidor).
      await p.click('[data-mis-detalle] .mis-teoria summary');
      await p.check('form[data-practica="e2e-q1"] input[value="1"]');
      await p.click('form[data-practica="e2e-q1"] button');
      await p.waitForFunction(() => document.querySelector('form[data-practica="e2e-q1"] .mis-practica-res').textContent.length > 0);
      ok('práctica: respuesta incorrecta → «Casi» con pista', (await texto(p, 'form[data-practica="e2e-q1"] .mis-practica-res')).includes('Divide 50 entre 10'));
      await p.fill('form[data-practica="e2e-q2"] input', ' Quince ');
      await p.click('form[data-practica="e2e-q2"] button');
      await p.waitForFunction(() => document.querySelector('form[data-practica="e2e-q2"] .mis-practica-res').textContent.includes('Correcto'));
      ok('práctica: respuesta abierta correcta → «¡Correcto!»', true);
      // Entrega del paso 1 desde la página.
      await p.click('[data-mis-paso="p1"] button[type=submit]');
      await p.waitForSelector('.mis-res.ok', { timeout: 30000 });
      ok('entrega del paso 1: «¡Paso entregado!» y faltan 2', (await texto(p, '.mis-res.ok')).includes('faltan 2 pasos'), await texto(p, '.mis-res.ok'));
      ok('el paso 1 se ve entregado a tiempo', (await texto(p, '[data-mis-paso="p1"] .mis-paso-meta')).includes('Entregado a tiempo'));
    }
    await p.screenshot({ path: archivo('detalle-360'), fullPage: true });
    await p.context().close();
  }

  // Pasos 2 y 3 por la API y la bandeja del admin en la página.
  const e2 = await post(`/misiones/${ID}/entrega`, ALUMNA, { paso: 'p2', texto: '10 % de 12.50 = 1.25' });
  const e3 = await post(`/misiones/${ID}/entrega`, ALUMNA, { paso: 'p3', texto: 'Vendí 30 vasos y gasté 200 pesos.' });
  ok('API: pasos 2 y 3 entregados; la misión queda completa', e2.status === 200 && e3.status === 200 && e3.body.completos === 3, e2.status + ' ' + e3.status);
  {
    const p = await abrirPagina(b, { email: ADMIN, viejo: true, out, viewport: { width: 360, height: 780 }, ruta: '/secundaria.html#entregas', esperar: '#sec-entregas:not([hidden]) .ent-card', dialogos: 'aceptar' });
    const card = `[data-ent="${ID}/valeria"]`;
    ok('bandeja: la entrega está «Lista para evaluar» con el nombre de pila y sin correos', (await texto(p, card + ' .ent-top')).includes('Lista para evaluar') && (await texto(p, card + ' .ent-top')).startsWith('Valeria') && !(await texto(p, '#sec-entregas')).includes('@'));
    for (const [c, pts] of [['c1', 25], ['c2', 20], ['c3', 25], ['c4', 15]]) await p.check(`${card} input[data-criterio="${c}"][value="${pts}"]`);
    ok('rúbrica: 25 + 20 + 25 + 15 = 85 % y 315 XP antes de guardar', (await texto(p, card + ' .ent-total')).includes('85 % · 315 XP'), await texto(p, card + ' .ent-total'));
    await p.fill(card + ' [data-ent-comentario]', '¡Muy buen trabajo con los porcentajes!');
    await p.click(card + ' form.ent-evaluar button[type=submit]');
    await p.waitForFunction(s => document.querySelector(s + ' .ent-top') && document.querySelector(s + ' .ent-top').textContent.includes('Evaluada'), card, { timeout: 30000 });
    ok('bandeja: queda «Evaluada · 85 % · +315 XP»', (await texto(p, card + ' .ent-top')).includes('85 % · +315 XP'), await texto(p, card + ' .ent-top'));
    ok('bandeja: sin scroll horizontal a 360 px', await sinScrollH(p));
    await p.screenshot({ path: 'misiones-bandeja-360.png', fullPage: true });
    await p.context().close();
  }
  ok('API: reenviar un paso evaluado → 409 ya_evaluado', (await post(`/misiones/${ID}/entrega`, ALUMNA, { paso: 'p2', texto: 'otra vez' })).status === 409);

  // La alumna ve la retroalimentación: XP de la misión en el mismo total, mapa y árbol.
  const act = await fetch(`${API}/secundaria/actividades${q(ALUMNA)}`).then(x => x.json());
  const mis = (await misiones(ALUMNA)).body;
  const nivel = G.nivelDe(G.xpTotalConMisiones(act.items, mis.misiones, { hoy: HOY }));
  for (const tema of ['light', 'dark']) {
    const sufijo = tema === 'dark' ? ' (oscuro)' : '';
    const p = await abrirPagina(b, { email: ALUMNA, viejo: true, out, viewport: { width: 360, height: 780 }, contexto: { colorScheme: tema }, ruta: '/secundaria.html', esperar: '#sec-inicio' });
    if (tema === 'light') ok('Inicio: aviso «+315 XP» de la misión evaluada (una vez)', (await texto(p, '#mis-recompensa')).includes('+315 XP'), await texto(p, '#mis-recompensa').catch(() => ''));
    ok(`Inicio: Nv. ${nivel.nivel} con la XP de la misión incluida` + sufijo, (await texto(p, '#rpg-rango')).startsWith('Nv. ' + nivel.nivel) && (await texto(p, '#rpg-xp')) === `${nivel.xpNivel} / 300`, await texto(p, '#rpg-xp'));
    ok('Inicio: insignia «⚔️ Misión principal» ganada' + sufijo, (await p.$('[data-insignia="mision-principal"].ganada')) !== null);
    await p.click('.sec-tabs [data-sec-tab="misiones"]');
    await p.click(`[data-mis-card="${ID}"] [data-mis-abrir]`);
    ok('detalle: evaluación con comentario y sin cuadro de entrega' + sufijo, (await texto(p, '#mis-evaluacion')).includes('+315 XP') && (await texto(p, '#mis-evaluacion')).includes('Muy buen trabajo') && (await p.$$('form.mis-entrega')).length === 0);
    await p.click('.sec-tabs [data-sec-tab="mapa"]');
    ok('Mapa: Valle de los Números en curso con su misión; Ciudad de las Formas bloqueada' + sufijo,
      (await texto(p, '[data-mundo-id="valle-de-los-numeros"]')).includes('En curso') && (await texto(p, '[data-mundo-id="valle-de-los-numeros"]')).includes('Misión de prueba') && (await texto(p, '[data-mundo-id="ciudad-de-las-formas"]')).includes('Bloqueado'));
    ok('Mapa: sin scroll horizontal' + sufijo, await sinScrollH(p));
    await p.screenshot({ path: `misiones-mapa-360${tema === 'dark' ? '-oscuro' : ''}.png`, fullPage: true });
    await p.click('.sec-tabs [data-sec-tab="arbol"]');
    ok('Árbol: nodos por materia con su estado' + sufijo, (await p.$$('[data-arbol-materia] .mis-nodo')).length > 0 && await sinScrollH(p));
    ok('pestañas de 44 px o más' + sufijo, (await altoMinimo(p, '.sec-tabs .tab')) >= 44);
    await p.screenshot({ path: `misiones-arbol-360${tema === 'dark' ? '-oscuro' : ''}.png`, fullPage: true });
    await p.context().close();
  }
  await b.close();
  console.log(out.join('\n'));
  process.exit(out.some(x => x.startsWith('FAIL')) ? 1 : 0);
})().catch(e => { console.log(out.join('\n')); console.log('FAIL excepción: ' + e.message); process.exit(1); });
