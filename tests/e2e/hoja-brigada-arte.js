// Capturas de la hoja de arte de «🦎 Brigada Xalli» (openspec: brigada-xalli): abre tests/e2e/brigada-hoja-arte.html
// desde el disco (sin servidor), revisa que no haya errores de JS ni piezas sin dibujo y guarda una captura por
// sección en tests/e2e/salida/brigada-arte/ (ignorada por git), también con movimiento reducido.
//   node tests/e2e/hoja-brigada-arte.js        (CHROME opcional: ruta de Chromium; sin ella, el de Playwright)
const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

const SALIDA = path.resolve(__dirname, 'salida', 'brigada-arte');
const HOJA = pathToFileURL(path.join(__dirname, 'brigada-hoja-arte.html')).href;

(async () => {
  fs.mkdirSync(SALIDA, { recursive: true });
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const fallas = [];
  for (const [modo, reducedMotion] of [['normal', 'no-preference'], ['reducido', 'reduce']]) {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1, reducedMotion });
    const p = await ctx.newPage();
    p.on('pageerror', e => { fallas.push(`error JS (${modo}): ${e.message}`); console.log('FAIL error JS:', e.stack); });
    await p.goto(HOJA);
    await p.waitForFunction(() => window.__hoja && window.__hoja.listo, null, { timeout: 30000 });
    const { errores } = await p.evaluate(() => window.__hoja);
    for (const e of errores) fallas.push(`${modo}: ${e}`);
    const ids = await p.$$eval('canvas[id]', cs => cs.map(c => c.id));
    for (const id of ids) {
      if (modo === 'reducido' && !id.startsWith('hoja-jefes')) continue;
      const archivo = path.join(SALIDA, `${id}${modo === 'reducido' ? '-reducido' : ''}.png`);
      await p.locator('#' + id).screenshot({ path: archivo });
      console.log('captura:', archivo);
    }
    await ctx.close();
  }
  await b.close();
  if (fallas.length) { console.log(fallas.map(f => 'FAIL ' + f).join('\n')); process.exit(1); }
  console.log('PASS hoja de arte sin errores');
})().catch(e => { console.error(e); process.exit(1); });
