// E2E de medición y estabilidad (openspec: cache-estabilidad): cuántas peticiones al API hace cada flujo
// representativo y cómo se recupera la página ante fallas pasajeras.
// Las páginas hablan con un proxy local que cuenta TODO lo que llega al servidor (también las verificaciones previas
// OPTIONS, que Playwright no reporta) y lo reenvía al API real. El proxy también puede inyectar fallas (503 o red
// caída) en una ruta. Imprime una tabla por flujo y ruta (también en salida/peticiones.md) y PASS si cada flujo queda
// en su umbral o por debajo (fijado tras la optimización; ver el reporte del cambio).
// MEDIR=1 solo imprime los conteos (sin umbrales), para tomar la línea base; las pruebas de estabilidad corren igual.
require('./lib/entorno'); // BASE, API, DATOS, DATA, CHROME, carpeta de salida y sesión de prueba en fetch
const { chromium } = require('playwright');
const http = require('node:http');
const fs = require('node:fs');
const BASE = process.env.BASE;
const API = process.env.API;
const SOLO_MEDIR = process.env.MEDIR === '1';
const out = []; const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`);
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Umbral por flujo (peticiones al API, OPTIONS incluidas). Ver la tabla antes/después en el reporte del cambio.
const UMBRAL = {
  'portal (alumna)': 5,
  'navegar portal → inglés → portal → juegos (alumna)': 12,
  'juegos + 1 juego individual': 5,
  'ranking: abrir y alternar pestañas 4 veces': 6, // 2 son las fotos de avatar (<img>, caché de 1 h)
  'sala de 2 personas (30 s, ambas)': 40,
  'inglés (alumna)': 5,
  'inglés (admin)': 15,
  'abrir un examen': 2,
};

// ---------- Proxy que cuenta (y puede fallar a propósito) ----------
let registro = [];
let falla = null; // { ruta: RegExp, modo: '503' | 'red', veces?: n, hasta?: ms }
const destino = new URL(API);
const proxy = http.createServer((req, res) => {
  const ruta = req.url.split('?')[0];
  const fila = { metodo: req.method, ruta, status: 0 };
  registro.push(fila);
  if (falla && req.method === 'GET' && falla.ruta.test(ruta) && (falla.veces === undefined || falla.veces > 0) && (falla.hasta === undefined || Date.now() < falla.hasta)) {
    if (falla.veces !== undefined) falla.veces--;
    if (falla.modo === 'red') { fila.status = 'red'; req.socket.destroy(); return; }
    fila.status = 503;
    res.writeHead(503, { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end('{"error":"mucho_trafico"}');
    return;
  }
  const p = http.request({ host: destino.hostname, port: destino.port, method: req.method, path: req.url, headers: { ...req.headers, host: destino.host } }, r => {
    fila.status = r.statusCode;
    res.writeHead(r.statusCode, r.headers);
    r.pipe(res);
  });
  p.on('error', () => { fila.status = 599; res.writeHead(502); res.end(); });
  req.pipe(p);
});

// Ruta normalizada: códigos de sala, ids de elementos y fotos se agrupan.
const normal = r => r.replace(/\/juegos\/sala\/[A-Z]{4}/, '/juegos/sala/<código>')
  .replace(/\/(ingles|secundaria)\/actividades\/[^/]+/, '/$1/actividades/<id>')
  .replace(/\/juegos\/foto\/[^/]+/, '/juegos/foto/<token>');
function resumen(filas) {
  const m = new Map();
  for (const f of filas) { const k = f.metodo + ' ' + normal(f.ruta); m.set(k, (m.get(k) || 0) + 1); }
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}
// Espera a que el API deje de recibir peticiones `ms` milisegundos (o `max`).
async function quieto(ms = 2500, max = 30000) {
  const t0 = Date.now(); let n = registro.length, desde = Date.now();
  while (Date.now() - t0 < max) {
    await sleep(200);
    if (registro.length !== n) { n = registro.length; desde = Date.now(); } else if (Date.now() - desde >= ms) return;
  }
}

const tabla = [];
async function medir(nombre, fn) {
  registro = [];
  let error = null;
  try { await fn(); } catch (e) { error = e; }
  const filas = registro.slice();
  const total = filas.length, opciones = filas.filter(f => f.metodo === 'OPTIONS').length, n304 = filas.filter(f => f.status === 304).length;
  tabla.push({ nombre, total, opciones, n304, rutas: resumen(filas) });
  const detalle = resumen(filas).map(([k, v]) => v + '× ' + k).join(', ').slice(0, 300);
  if (error) ok(`${nombre}: el flujo termina`, false, error.message.slice(0, 160));
  else if (SOLO_MEDIR) ok(`${nombre}: medido`, true, `${total} peticiones`);
  else ok(`${nombre}: ${total} peticiones ≤ ${UMBRAL[nombre]}`, total <= UMBRAL[nombre], detalle);
}

async function contexto(b, email) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(e => { window.__TIEMPO_JUEGOS = 0.4; localStorage.setItem('stald_sesion_prueba', JSON.stringify({ email: e, token: 'prueba:' + e })); }, email);
  const p = await ctx.newPage();
  p.on('dialog', d => d.accept());
  p.on('pageerror', e => out.push('FAIL error JS (' + email + '): ' + e.message));
  return p;
}

(async () => {
  await new Promise(r => proxy.listen(0, '127.0.0.1', r));
  const PROXY = 'http://127.0.0.1:' + proxy.address().port;
  const Q = '?api=' + encodeURIComponent(PROXY);
  const b = await chromium.launch({ executablePath: process.env.CHROME });
  const estaticos = { datos: 0 };
  const hub = async p => { await p.goto(BASE + '/juegos.html' + Q); await p.waitForSelector('[data-juego]', { timeout: 60000 }); };

  await medir('portal (alumna)', async () => {
    const p = await contexto(b, 'marisol@example.com');
    await p.goto(BASE + '/' + Q); await p.waitForSelector('#home:not([hidden])', { timeout: 60000 });
    await quieto();
    await p.context().close();
  });

  await medir('navegar portal → inglés → portal → juegos (alumna)', async () => {
    const p = await contexto(b, 'marisol@example.com');
    await p.goto(BASE + '/' + Q); await p.waitForSelector('#home:not([hidden])', { timeout: 60000 }); await quieto();
    await p.click('#tiles a[data-espacio="ingles"]'); await p.waitForSelector('#app', { state: 'visible', timeout: 60000 }); await quieto();
    await p.click('a.home-link'); await p.waitForSelector('#home:not([hidden])', { timeout: 60000 }); await quieto();
    await p.click('#tiles a[data-espacio="juegos"]'); await p.waitForSelector('[data-juego]', { timeout: 60000 }); await quieto();
    await p.context().close();
  });

  await medir('juegos + 1 juego individual', async () => {
    const p = await contexto(b, 'marisol@example.com');
    p.on('request', r => { if (r.url().includes('/juegos/datos/')) estaticos.datos++; });
    await hub(p);
    await p.click('[data-juego="en-vocab"]');
    const t0 = Date.now();
    while (!(await p.$('.result .score')) && Date.now() - t0 < 60000) { const o = await p.$('.opt:not(.ok):not(.bad)'); if (o) await o.click().catch(() => {}); await sleep(150); }
    await p.waitForSelector('.result .score', { timeout: 60000 });
    await p.click('[data-a="hub"]'); await p.waitForSelector('[data-juego]');
    await quieto();
    await p.context().close();
  });

  {
    const p = await contexto(b, 'marisol@example.com');
    await hub(p); await quieto();
    await medir('ranking: abrir y alternar pestañas 4 veces', async () => {
      await p.click('[data-tab="ranking"]'); await p.waitForSelector('[data-rtipo]', { timeout: 30000 });
      for (const t of ['partidas', 'individual', 'partidas', 'individual']) {
        await p.click(`[data-rtipo="${t}"]`); await p.waitForSelector(`[data-rtipo="${t}"][aria-pressed="true"]`, { timeout: 30000 });
      }
      await quieto();
    });
    // Estabilidad: un 503 pasajero (mucho tráfico) en una lectura se reintenta solo y la página no muestra error.
    // Se pide el ranking de nuevo tras un envío (que vacía la caché del cliente) para que salga a la red.
    await p.click('[data-tab="partidas"]'); await p.waitForSelector('#f-crear');
    await p.evaluate(() => window.StaldAuth && StaldAuth.limpiarCache && StaldAuth.limpiarCache());
    registro = [];
    falla = { ruta: /\/juegos\/ranking$/, modo: '503', veces: 1 };
    await p.click('[data-tab="ranking"]');
    await p.waitForSelector('#tab-body .rank, #tab-body .alert, #tab-body .card.muted', { timeout: 30000 });
    const alerta = await p.$('#tab-body .alert');
    const rk = registro.filter(f => f.metodo === 'GET' && /\/juegos\/ranking$/.test(f.ruta)).map(f => f.status);
    ok('503 pasajero: el ranking se muestra sin error (reintento con espera)', !alerta && rk.includes(503) && rk[rk.length - 1] === 200, rk.join(','));
    falla = null;
    await p.context().close();
  }

  {
    const host = await contexto(b, 'marisol@example.com'), otro = await contexto(b, 'angel@example.com');
    let codigo = '';
    await medir('sala de 2 personas (30 s, ambas)', async () => {
      for (const p of [host, otro]) { await hub(p); await p.click('[data-tab="partidas"]'); await p.waitForSelector('#f-crear'); }
      await host.selectOption('#p-juego', 'una');
      await host.click('#f-crear button[type=submit]'); await host.waitForSelector('[data-p="empezar"]', { timeout: 30000 });
      codigo = (await host.textContent('.letra')).trim();
      await otro.fill('#p-codigo', codigo); await otro.click('#f-unirse button[type=submit]');
      await otro.waitForSelector('.rank li', { timeout: 30000 });
      await host.click('[data-p="empezar"]');
      await sleep(30000);
    });
    // Estabilidad: la red se cae 6 s para las consultas de la sala; al volver, ambas páginas siguen consultando.
    const salaGet = f => f.metodo === 'GET' && f.ruta === '/juegos/sala/' + codigo;
    registro = [];
    falla = { ruta: new RegExp('^/juegos/sala/' + codigo + '$'), modo: 'red', hasta: Date.now() + 6000 };
    await sleep(6000);
    falla = null;
    const caidas = registro.filter(f => salaGet(f) && f.status === 'red').length;
    registro = [];
    await sleep(12000);
    const despues = registro.filter(f => salaGet(f) && f.status === 200).length;
    ok('red caída 6 s en la sala: el sondeo se recupera solo', caidas >= 1 && despues >= 2, `fallidas=${caidas} después=${despues}`);
    // Pestaña oculta: no consulta; al volver a verse, se pone al día enseguida.
    await host.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); });
    await otro.context().close();
    await sleep(1000);
    registro = [];
    await sleep(8000);
    const oculta = registro.filter(salaGet).length;
    await host.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' }); document.dispatchEvent(new Event('visibilitychange')); });
    await sleep(1200);
    const alVolver = registro.filter(salaGet).length - oculta;
    ok('pestaña oculta: no consulta la sala; al volver consulta enseguida', oculta === 0 && alVolver >= 1, `oculta=${oculta} al volver (1.2 s)=${alVolver}`);
    await host.context().close();
  }

  await medir('inglés (alumna)', async () => {
    const p = await contexto(b, 'marisol@example.com');
    await p.goto(BASE + '/ingles.html' + Q); await p.waitForSelector('#app', { state: 'visible', timeout: 60000 });
    await quieto();
    await p.context().close();
  });

  await medir('inglés (admin)', async () => {
    const p = await contexto(b, 'admin@example.com');
    await p.goto(BASE + '/ingles.html' + Q); await p.waitForSelector('#tablero', { state: 'attached', timeout: 60000 });
    await quieto(3000);
    await p.context().close();
  });

  // Abrir un examen (solo GET; no se envía): el de prueba de Secundaria, exclusivo de la alumna del fixture.
  {
    const p = await contexto(b, 'valeria@example.com');
    await p.goto(BASE + '/ingles.html?modo=secundaria&api=' + encodeURIComponent(PROXY));
    await p.waitForSelector('[data-sec-item="sec-e2e"] [data-action="abrir-item"]', { timeout: 60000 });
    await quieto();
    await medir('abrir un examen', async () => {
      await p.click('[data-sec-item="sec-e2e"] [data-action="abrir-item"]');
      await p.waitForSelector('#exam-form', { timeout: 60000 });
      await quieto();
    });
    await p.context().close();
  }

  await b.close();
  proxy.close();

  const lineas = ['| Flujo | Peticiones | OPTIONS | 304 | Detalle |', '|---|---:|---:|---:|---|'];
  for (const t of tabla) lineas.push(`| ${t.nombre} | ${t.total} | ${t.opciones} | ${t.n304} | ${t.rutas.map(([k, v]) => v + '× `' + k + '`').join(', ')} |`);
  lineas.push('', `Archivos de juegos/datos pedidos (estáticos, no cuentan como API): ${estaticos.datos}`);
  fs.writeFileSync('peticiones.md', lineas.join('\n') + '\n');
  console.log(lineas.join('\n'));
  console.log(out.join('\n'));
  process.exit(out.some(l => l.startsWith('FAIL')) ? 1 : 0);
})().catch(e => { console.log('FAIL error: ' + e.message); process.exit(1); });
