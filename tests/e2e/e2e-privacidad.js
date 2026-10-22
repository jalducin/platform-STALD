// E2E: aviso de privacidad y formato de consentimiento detrás del interruptor `privacidad` (openspec: rpg-privacidad).
// - Apagado (el servidor de pruebas no tiene config/interruptores.json, y también con el servidor caído): sin enlaces
//   en el portal, Inglés y Juegos; privacidad.html y consentimiento.html dicen «Próximamente» sin el texto.
// - Encendido (se simula la respuesta de GET /interruptores): enlaces visibles con ?api=, títulos y secciones clave,
//   nota de borrador, sin correos en el texto, 360 px sin scroll horizontal en claro y oscuro, e impresión carta.
// Capturas y el PDF de impresión en la carpeta de salida.
require('./lib/entorno'); // BASE, API, CHROME y carpeta de salida
const fs = require('node:fs');
const { chromium } = require('playwright');
const { abrirPagina, urlDe } = require('./lib/navegador');
const out = []; const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`);
const ANGOSTO = { width: 360, height: 760 };
const SECCIONES = ['resumen', 'responsable', 'datos', 'finalidades', 'donde', 'quien', 'no-compartimos', 'tutor-ia', 'conservacion', 'menores', 'arco', 'navegador', 'cambios'];
const CORREO = /[\w.+-]+@[\w-]+\.[\w.]+/;

const sinScrollX = p => p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
const listo = p => p.waitForSelector('html[data-interruptores="listo"]', { timeout: 30000 });
const visible = (p, sel) => p.$eval(sel, el => !!el.offsetParent || getComputedStyle(el).position === 'fixed').catch(() => false);

// Abre una página a 360 px con el interruptor simulado: 'encendido', 'caido' (sin respuesta) o null (servidor real).
async function abrir(b, ruta, { modo = null, oscuro = false, esperar = null } = {}) {
  const p = await abrirPagina(b, { viewport: ANGOSTO, contexto: { colorScheme: oscuro ? 'dark' : 'light' }, out, etiqueta: ruta });
  // Las páginas con sesión (portal, Inglés, Juegos) leen el interruptor del /config que ya piden (openspec: fix-e2e-rpg);
  // privacidad.html y consentimiento.html, de /interruptores. Se simulan las dos rutas.
  const conConfig = interruptores => p.route('**/config', async r => {
    const res = await r.fetch(); const c = await res.json();
    if (interruptores) c.interruptores = interruptores; else delete c.interruptores;
    await r.fulfill({ response: res, json: c });
  });
  if (modo === 'encendido') {
    await p.route('**/interruptores', r => r.fulfill({ status: 200, contentType: 'application/json', body: '{"privacidad":true}' }));
    await conConfig({ privacidad: true, ranking: false });
  }
  if (modo === 'caido') { // /config sin interruptores (servidor anterior) y /interruptores sin respuesta: falla cerrada
    await p.route('**/interruptores', r => r.abort());
    await conConfig(null);
  }
  await p.goto(urlDe(ruta));
  await listo(p);
  if (esperar) await p.waitForSelector(esperar, { timeout: 60000 });
  return p;
}

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME });

  // --- Servidor: la ruta pública responde apagado por omisión ---
  const r = await fetch(process.env.API + '/interruptores');
  ok('servidor: GET /interruptores sin sesión → 200 { privacidad: false, ranking: false }', r.status === 200 && JSON.stringify(await r.json()) === '{"privacidad":false,"ranking":false}', String(r.status));
  const rc = await (await fetch(process.env.API + '/config')).json();
  ok('servidor: /config trae los interruptores apagados (openspec: fix-e2e-rpg)', JSON.stringify(rc.interruptores) === '{"privacidad":false,"ranking":false}', JSON.stringify(rc));

  // --- Apagado: nada visible ---
  for (const [ruta, esperar] of [['/index.html', '#login:not([hidden]), #home:not([hidden])'], ['/ingles.html', null], ['/juegos.html', null]]) {
    for (const modo of [null, 'caido']) {
      const p = await abrir(b, ruta, { modo, esperar });
      const n = await p.$$eval('a[href^="privacidad.html"]', xs => xs.filter(x => x.offsetParent).length);
      ok(`apagado${modo ? ' (servidor caído)' : ''}: ${ruta} sin enlace visible al aviso`, n === 0, String(n));
      await p.context().close();
    }
  }
  for (const [ruta, id] of [['/privacidad.html', '#aviso'], ['/consentimiento.html', '#formato']]) {
    for (const modo of [null, 'caido']) {
      const p = await abrir(b, ruta, { modo });
      const etq = `apagado${modo ? ' (servidor caído)' : ''}: ${ruta}`;
      ok(`${etq} muestra «Próximamente»`, await visible(p, '#proximamente') && /Próximamente/.test(await p.textContent('#proximamente')));
      ok(`${etq} no muestra el texto`, !(await visible(p, id)) && !(await p.isVisible('text=Borrador para revisión')));
      ok(`${etq} sin scroll horizontal a 360 px`, await sinScrollX(p));
      if (!modo) await p.screenshot({ path: `privacidad-apagado${ruta.replace(/\W+/g, '-')}360.png` });
      await p.context().close();
    }
  }

  // --- Encendido: enlaces en el portal, Inglés y Juegos ---
  for (const [ruta, esperar] of [['/index.html', '#login:not([hidden]), #home:not([hidden])'], ['/ingles.html', null], ['/juegos.html', null]]) {
    const p = await abrir(b, ruta, { modo: 'encendido', esperar });
    const enlace = await p.$$eval('a[href^="privacidad.html"]', xs => xs.filter(x => x.offsetParent).map(x => ({ t: x.textContent.trim(), href: x.getAttribute('href'), alto: x.getBoundingClientRect().height })));
    ok(`encendido: ${ruta} con enlace «🔒 Aviso de privacidad» y ?api=`, enlace.length === 1 && enlace[0].t === '🔒 Aviso de privacidad' && enlace[0].href.includes('api='), JSON.stringify(enlace));
    ok(`encendido: ${ruta} enlace de al menos 44 px`, enlace.length === 1 && enlace[0].alto >= 44, JSON.stringify(enlace));
    ok(`encendido: ${ruta} sin scroll horizontal a 360 px`, await sinScrollX(p));
    if (ruta === '/index.html') {
      // El portal también enlaza el consentimiento (openspec: portal-diseno-rpg).
      const cons = await p.$$eval('a[href^="consentimiento.html"]', xs => xs.filter(x => x.offsetParent).map(x => ({ t: x.textContent.trim(), href: x.getAttribute('href'), alto: x.getBoundingClientRect().height })));
      ok('encendido: /index.html con enlace «📝 Consentimiento» de 44 px y ?api=', cons.length === 1 && cons[0].t === '📝 Consentimiento' && cons[0].href.includes('api=') && cons[0].alto >= 44, JSON.stringify(cons));
      await p.locator('footer').scrollIntoViewIfNeeded();
      await p.screenshot({ path: 'privacidad-portal-pie-360.png', fullPage: true });
    }
    await p.context().close();
  }

  // --- Encendido: aviso de privacidad, claro y oscuro ---
  for (const oscuro of [false, true]) {
    const tema = oscuro ? 'oscuro' : 'claro';
    const p = await abrir(b, '/privacidad.html', { modo: 'encendido', oscuro, esperar: '#aviso:not([hidden])' });
    ok(`privacidad (${tema}): título de la pestaña y h1`, (await p.title()) === 'Aviso de privacidad · STALD' && /Aviso de privacidad/.test(await p.textContent('#aviso h1')));
    ok(`privacidad (${tema}): «Próximamente» oculto`, !(await visible(p, '#proximamente')));
    const faltan = [];
    for (const id of SECCIONES) if (!(await visible(p, '#' + id))) faltan.push(id);
    ok(`privacidad (${tema}): ${SECCIONES.length} secciones clave`, faltan.length === 0, faltan.join(','));
    ok(`privacidad (${tema}): nota visible de borrador para el profe`, await visible(p, '.borrador') && /Borrador para revisión del profe/.test(await p.textContent('.borrador')));
    const texto = await p.textContent('#aviso');
    ok(`privacidad (${tema}): sin correos en el texto`, !CORREO.test(texto), (texto.match(CORREO) || [''])[0]);
    ok(`privacidad (${tema}): cubre datos, no venta, tutor IA, ARCO y canal de la escuela`,
      ['Nombre de pila', 'Correo de acceso', 'Apodo de Juegos', 'Supabase', 'No vendemos', 'Avatar de Juegos', 'Invitados de Juegos', 'Finalidad secundaria', 'Tutor con inteligencia artificial', 'ARCO', 'escríbele a tu profe por el canal de la escuela', 'Cambios a este aviso'].every(s => texto.toLowerCase().includes(s.toLowerCase())));
    ok(`privacidad (${tema}): enlace al formato de consentimiento`, await visible(p, 'nav.top a[href^="consentimiento.html"]'));
    ok(`privacidad (${tema}): sin scroll horizontal a 360 px`, await sinScrollX(p));
    const fondo = await p.evaluate(() => getComputedStyle(document.body).backgroundColor);
    ok(`privacidad (${tema}): fondo del tema`, oscuro ? fondo === 'rgb(19, 17, 28)' : fondo === 'rgb(246, 245, 251)', fondo);
    await p.screenshot({ path: `privacidad-360-${tema}.png`, fullPage: true });
    await p.context().close();
  }

  // --- Encendido: formato de consentimiento ---
  for (const oscuro of [false, true]) {
    const tema = oscuro ? 'oscuro' : 'claro';
    const p = await abrir(b, '/consentimiento.html', { modo: 'encendido', oscuro, esperar: '#formato:not([hidden])' });
    ok(`consentimiento (${tema}): título y h1`, (await p.title()) === 'Formato de consentimiento · STALD' && /Autorización de mamá, papá o tutor/.test(await p.textContent('#formato h1')));
    const casillas = await p.$$eval('.casillas > li .que', xs => xs.map(x => x.textContent));
    ok(`consentimiento (${tema}): 5 autorizaciones (plataforma, foto de avatar, ranking, tutor IA, imagen y audio)`,
      casillas.length === 5 && /plataforma/.test(casillas[0]) && /Foto/.test(casillas[1]) && /Ranking/.test(casillas[2]) && /Tutor/.test(casillas[3]) && /imagen o audio/.test(casillas[4]), casillas.join(' | '));
    const rotulos = await p.$$eval('.campos .rotulo', xs => xs.map(x => x.textContent));
    ok(`consentimiento (${tema}): campos en blanco (alumno o alumna, quien firma, fecha y firma)`,
      ['Nombre del alumno o alumna', 'Nombre de quien firma', 'Fecha', 'Firma'].every(t => rotulos.includes(t)), rotulos.join(' | '));
    const texto = await p.textContent('#formato');
    ok(`consentimiento (${tema}): dice que la plataforma no guarda el documento`, /La plataforma no guarda este documento/.test(texto));
    ok(`consentimiento (${tema}): nota de borrador y sin correos`, /Borrador para revisión del profe/.test(texto) && !CORREO.test(texto));
    ok(`consentimiento (${tema}): sin scroll horizontal a 360 px`, await sinScrollX(p));
    await p.screenshot({ path: `consentimiento-360-${tema}.png`, fullPage: true });
    if (!oscuro) {
      await p.emulateMedia({ media: 'print' });
      ok('consentimiento (impresión): sin botones, navegación ni pie', !(await visible(p, '.acciones')) && !(await visible(p, 'nav.top')) && !(await visible(p, 'footer')));
      const pdf = await p.pdf({ path: 'consentimiento-carta.pdf', preferCSSPageSize: true, printBackground: true });
      const paginas = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
      const tamano = /\/MediaBox\s*\[\s*0 0 612 792\s*\]/.test(pdf.toString('latin1'));
      ok('consentimiento (impresión): una hoja tamaño carta', paginas === 1 && tamano, `páginas=${paginas} carta=${tamano}`);
    }
    await p.context().close();
  }

  await b.close();
  for (const l of out) console.log(l);
  if (!fs.existsSync('privacidad-360-claro.png')) console.log('FAIL faltó la captura privacidad-360-claro.png');
  process.exit(out.some(l => l.startsWith('FAIL')) ? 1 : 0);
})().catch(e => { console.error('ERROR', e); process.exit(1); });
