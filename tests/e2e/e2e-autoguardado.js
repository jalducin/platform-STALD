// E2E: autoguardado del avance del examen (openspec: examen-autoguardado). La alumna de Secundaria del fixture abre
// su examen exclusivo de prueba `sec-e2e-guardado` (opción múltiple y respuesta escrita, sin barajar) en un celular,
// contesta, recarga la página, vuelve a abrirlo y encuentra sus respuestas; al enviar, el borrador se borra.
// Usa un examen propio para no gastar las oportunidades de `sec-e2e`, que comprueba `examen-secundaria`.
require('./lib/entorno'); // BASE, API, DATA, CHROME, carpeta de salida y sesión de prueba en fetch
const { chromium } = require('playwright');
const { abrirPagina, urlDe } = require('./lib/navegador');
const out = []; const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`);
const ALUMNA = 'valeria@example.com';
const ID = 'sec-e2e-guardado';
const DIA = 24 * 3600 * 1000;

const borradores = p => p.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('stald_borrador:')).map(k => [k, localStorage.getItem(k)]));
const abrir = async p => {
  await p.waitForSelector(`[data-sec-item="${ID}"] [data-action="abrir-item"]`, { timeout: 60000 });
  await p.click(`[data-sec-item="${ID}"] [data-action="abrir-item"]`);
  await p.waitForSelector('#exam-form', { timeout: 60000 });
};
// ¿El navegador pediría confirmar al salir? (evento sintético: no depende de cómo Playwright trate los diálogos)
const pideConfirmar = p => p.evaluate(() => { const e = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(e); return e.defaultPrevented; });
const texto = async (p, sel) => ((await p.textContent(sel)) || '').replace(/\s+/g, ' ');

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME });
  const p = await abrirPagina(b, { email: ALUMNA, out, etiqueta: '' });
  const dialogos = [];
  p.on('dialog', d => { dialogos.push(d.type()); d.accept(); });
  await p.goto(urlDe('/ingles.html?modo=secundaria'));

  // 1) Abrir y contestar una de opción múltiple y una escrita (modo paso: una por pantalla).
  await abrir(p);
  ok('modo paso en celular', await p.$eval('#exam-form', f => f.classList.contains('paso')));
  ok('aviso «Tu avance se guarda solo en este aparato ✔»', (await texto(p, '#autoguardado')).includes('Tu avance se guarda solo en este aparato ✔'), await texto(p, '#autoguardado'));
  ok('examen abierto: html.examen-abierto y overscroll contain', await p.evaluate(() => document.documentElement.classList.contains('examen-abierto') && getComputedStyle(document.documentElement).overscrollBehaviorY === 'contain'));
  ok('sin respuestas no pide confirmar al salir', !(await pideConfirmar(p)));
  await p.check('input[name="g-h1"][value="0"]');
  await p.click('[data-action="q-sig"]');
  await p.fill('input[name="g-h2"]', 'cinco');
  ok('indicador «Guardado hace un momento»', (await texto(p, '#autoguardado')).includes('Guardado hace un momento'), await texto(p, '#autoguardado'));
  let bs = await borradores(p);
  const clave = bs.length === 1 ? bs[0][0] : '';
  ok('un borrador por persona, elemento e intento', bs.length === 1 && clave.startsWith('stald_borrador:secundaria:') && clave.endsWith(':' + ID + ':1'), clave);
  ok('el borrador no lleva el correo', bs.every(([k, v]) => !k.includes('valeria') && !k.includes('@') && !v.includes('valeria')));
  ok('el borrador tiene las 2 respuestas', bs.length === 1 && JSON.stringify(JSON.parse(bs[0][1]).r) === '{"g-h1":0,"g-h2":"cinco"}', bs.length ? bs[0][1] : '');
  ok('con respuestas sin enviar pide confirmar al salir', await pideConfirmar(p));
  // Un id que ya no existe en el intento y un borrador caducado (15 días) de otro examen.
  await p.evaluate(([k, viejo]) => {
    const d = JSON.parse(localStorage.getItem(k)); d.r['ya-no-existe'] = 1; localStorage.setItem(k, JSON.stringify(d));
    localStorage.setItem('stald_borrador:secundaria:zzz:otro-examen:1', JSON.stringify({ v: 1, t: viejo, r: { a: 0 } }));
  }, [clave, Date.now() - 15 * DIA]);

  // 2) Recargar (como jalar la pantalla hacia abajo) y volver a abrir.
  await p.reload();
  ok('recargar con respuestas: el navegador pidió confirmar (beforeunload)', dialogos.includes('beforeunload'), dialogos.join(','));
  await abrir(p);
  ok('borrador caducado (15 días) se borra al cargar', !(await borradores(p)).some(([k]) => k.includes('otro-examen')));
  ok('tras recargar: radio restaurado', await p.isChecked('input[name="g-h1"][value="0"]'));
  ok('tras recargar: respuesta escrita restaurada', (await p.inputValue('input[name="g-h2"]')) === 'cinco');
  ok('avance 2/6 respondidas', (await texto(p, '#exam-count')).startsWith('2/6'), await texto(p, '#exam-count'));
  ok('aviso «Recuperamos tus 2 respuestas»', (await texto(p, '#autoguardado-aviso')).includes('Recuperamos tus 2 respuestas'), await texto(p, '#autoguardado-aviso'));
  ok('el aviso de recuperación no se confunde con la corrección (.aviso-corr)', !(await p.$('.aviso-corr')));
  ok('modo paso: continúa en la primera sin contestar', await p.$eval('#exam-form .q.actual', q => q.dataset.q) === 'g-h3');
  await p.screenshot({ path: 'autoguardado-restaurado.png' });

  // 3) «← Volver» y reabrir: sigue ahí.
  await p.click('#exam-form [data-action="volver"]');
  await p.waitForSelector('#sec-examenes', { timeout: 60000 });
  ok('fuera del examen: sin examen-abierto ni confirmación', !(await p.evaluate(() => document.documentElement.classList.contains('examen-abierto'))) && !(await pideConfirmar(p)));
  await abrir(p);
  ok('volver y reabrir: respuestas restauradas', await p.isChecked('input[name="g-h1"][value="0"]') && (await p.inputValue('input[name="g-h2"]')) === 'cinco');

  // 4) Contestar el resto y enviar: el borrador se borra.
  await p.click('[data-action="ver-todas"]');
  await p.check('input[name="g-h3"][value="1"]');
  await p.check('input[name="g-i1"][value="0"]');
  await p.fill('input[name="g-i2"]', 'dog');
  await p.check('input[name="g-i3"][value="1"]');
  await p.click('#exam-send');
  await p.waitForSelector('.score', { timeout: 60000 });
  ok('envío: 100 % con lo restaurado', (await texto(p, '.score')).includes('100'), await texto(p, '.score'));
  ok('tras enviar: sin borrador', (await borradores(p)).length === 0, JSON.stringify(await borradores(p)));
  ok('tras enviar: sin examen-abierto ni confirmación', !(await p.evaluate(() => document.documentElement.classList.contains('examen-abierto'))) && !(await pideConfirmar(p)));
  await p.screenshot({ path: 'autoguardado-resultado.png' });

  // 5) El 2.º intento empieza limpio.
  await p.click('[data-action="volver"]');
  await abrir(p);
  ok('2.º intento: sin respuestas ni aviso de recuperación', (await texto(p, '#exam-count')).startsWith('0/6') && !(await p.$('#autoguardado-aviso:not(:empty)')));
  ok('diálogos vistos: confirmación del envío', dialogos.includes('confirm'), dialogos.join(','));

  await b.close();
  console.log(out.join('\n')); process.exit(out.some(x => x.startsWith('FAIL')) ? 1 : 0);
})().catch(e => { console.log(out.join('\n')); console.error('ERROR', e.message.slice(0, 400)); process.exit(2); });
