// E2E de la carga perezosa de Juegos (openspec: juegos-carga-perezosa).
// 1) Medición: archivos, KB transferidos y tiempo hasta que el menú es usable al abrir juegos.html con caché vacía,
//    en celular (360×740, táctil) y PC (1280×800), con red 4G simulada por CDP (RED_4G). Mediana de REPETICIONES.
//    Con MEDIR=1 solo imprime la tabla (línea base); sin MEDIR exige los topes MAX_ARCHIVOS y MAX_MS en celular.
// 2) El menú no carga motores; al elegir un juego se inyectan sus scripts y estilos (con su ?v=) una sola vez, con
//    «Cargando…» y, si la red falla, un aviso amable con «🔄 Reintentar».
// 3) Enlaces profundos que necesitan un motor antes de pintar: ?sala= (unirse), ?sala=…&ver=1 (espectador), #cat=
//    y ?registro=1.
// Tabla también en salida/juegos-carga.md.
require('./lib/entorno'); // BASE, API, DATOS, DATA, CHROME, carpeta de salida y sesión de prueba en fetch
const { chromium } = require('playwright');
const { abrirPagina, urlDe } = require('./lib/navegador');
const { MENU, abrirJuego } = require('./lib/menu');
const fs = require('node:fs');
const out = []; const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`);
const SOLO_MEDIR = process.env.MEDIR === '1';
const REPETICIONES = Number(process.env.REPETICIONES || 3);
const API_ORIGEN = new URL(process.env.API).origin;

// Red 4G simulada: perfil «Slow 4G» de Lighthouse (RTT 150 ms, 1.6 Mbps de bajada, 750 Kbps de subida).
const RED_4G = { offline: false, latency: 150, downloadThroughput: (1638.4 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 };
// Topes fijados con la medición del cambio (ver su reporte): menú de Juegos en celular con 4G.
const MAX_ARCHIVOS = 15;
const MAX_MS = 3000;
const CELULAR = { viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true };
const PC = { viewport: { width: 1280, height: 800 } };
// Archivos que el menú ya no debe pedir (motores y pantallas de juego).
const PEREZOSOS = ['juegos/tablero-ui.js', 'juegos/karts-pistas.js', 'juegos/personajes.js', 'juegos/clasicos-rapidos-ui.js', 'juegos/bingo.js',
  'juegos/app/individuales.js', 'juegos/app/salas.js', 'juegos/app/arcade.js', 'juegos/tablero.css', 'juegos/clasicos-rapidos.css'];
const mediana = xs => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor((s.length - 1) / 2)]; };
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Abre `ruta` con caché vacía y la red 4G; espera `listo` (selector) y a que la red quede quieta 1.5 s.
async function medirUna(b, { dispositivo, email, ruta, listo }) {
  const ctx = await b.newContext(dispositivo);
  if (email) await ctx.addInitScript(e => localStorage.setItem('stald_sesion_prueba', JSON.stringify({ email: e, token: 'prueba:' + e })), email);
  const p = await ctx.newPage();
  p.on('pageerror', e => out.push('FAIL error JS (medición ' + ruta + '): ' + e.message));
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await cdp.send('Network.emulateNetworkConditions', RED_4G);
  const pedidas = new Map(); let ultima = Date.now();
  cdp.on('Network.requestWillBeSent', e => { if (!e.request.url.startsWith('data:')) { pedidas.set(e.requestId, { url: e.request.url, bytes: 0 }); ultima = Date.now(); } });
  cdp.on('Network.loadingFinished', e => { const r = pedidas.get(e.requestId); if (r) { r.bytes = e.encodedDataLength; ultima = Date.now(); } });
  await p.goto(urlDe(ruta), { waitUntil: 'commit' });
  const usable = await p.waitForFunction(s => { const x = document.querySelector(s); return x && x.getBoundingClientRect().height > 0 ? performance.now() : 0; }, listo, { timeout: 60000, polling: 'raf' }).then(h => h.jsonValue());
  while (Date.now() - ultima < 1500) await sleep(200);
  const tiempos = await p.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0] || {}, fcp = performance.getEntriesByName('first-contentful-paint')[0];
    return { fcp: fcp ? fcp.startTime : 0, load: nav.loadEventEnd || 0 };
  });
  const todas = [...pedidas.values()];
  const archivos = todas.filter(r => !r.url.startsWith(API_ORIGEN));
  const res = {
    archivos: archivos.length, kb: Math.round(archivos.reduce((s, r) => s + r.bytes, 0) / 1024), api: todas.length - archivos.length,
    usable: Math.round(usable), fcp: Math.round(tiempos.fcp), load: Math.round(tiempos.load),
    perezosos: archivos.filter(r => PEREZOSOS.some(f => r.url.includes('/' + f))).map(r => r.url.replace(process.env.BASE + '/', '')),
  };
  await ctx.close();
  return res;
}

async function medir(b, nombre, o) {
  const xs = [];
  for (let i = 0; i < REPETICIONES; i++) xs.push(await medirUna(b, o));
  const m = k => mediana(xs.map(x => x[k]));
  return { nombre, archivos: m('archivos'), kb: m('kb'), api: m('api'), usable: m('usable'), fcp: m('fcp'), load: m('load'), muestras: xs.map(x => x.usable).join(' / '), perezosos: [...new Set(xs.flatMap(x => x.perezosos))] };
}

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME });

  // ---------- 1. Medición con caché vacía y red 4G ----------
  const EMAIL = 'marisol@example.com';
  const casos = [
    ['menú (celular 360, 4G)', { dispositivo: CELULAR, email: EMAIL, ruta: '/juegos.html', listo: '[data-categoria]' }],
    ['menú (PC 1280, 4G)', { dispositivo: PC, email: EMAIL, ruta: '/juegos.html', listo: '[data-categoria]' }],
    ['entrada ?registro=1 (celular 360, 4G)', { dispositivo: CELULAR, ruta: '/juegos.html?registro=1', listo: '#f-entrada' }],
  ];
  // Calentamiento (no cuenta): la primera visita también paga el arranque del servidor local y del navegador.
  await medirUna(b, { ...casos[0][1], dispositivo: PC });
  const tabla = [];
  for (const [nombre, o] of casos) tabla.push(await medir(b, nombre, o));
  const md = ['| Caso | Archivos | KB | Peticiones al API | Menú usable (ms) | Muestras (ms) | FCP (ms) | load (ms) |', '|---|---:|---:|---:|---:|---|---:|---:|']
    .concat(tabla.map(t => `| ${t.nombre} | ${t.archivos} | ${t.kb} | ${t.api} | ${t.usable} | ${t.muestras} | ${t.fcp} | ${t.load} |`));
  fs.writeFileSync('juegos-carga.md', md.join('\n') + '\n');
  console.log(md.join('\n'));
  for (const t of tabla) {
    if (SOLO_MEDIR) { ok(`${t.nombre}: medido`, true, `${t.archivos} archivos, ${t.kb} KB, usable ${t.usable} ms`); continue; }
    ok(`${t.nombre}: ≤ ${MAX_ARCHIVOS} archivos`, t.archivos <= MAX_ARCHIVOS, `${t.archivos} archivos, ${t.kb} KB`);
    if (t.nombre.startsWith('menú')) ok(`${t.nombre}: usable en ≤ ${MAX_MS} ms`, t.usable <= MAX_MS, `${t.usable} ms`);
    ok(`${t.nombre}: no pide motores ni pantallas de juego`, t.perezosos.length === 0, t.perezosos.join(', '));
  }
  if (SOLO_MEDIR) { await b.close(); console.log(out.join('\n')); process.exit(out.some(x => x.startsWith('FAIL')) ? 1 : 0); }

  // ---------- 2. Al elegir un juego: sus archivos una sola vez, «Cargando…» y error amable ----------
  const pedidos = p => { const l = []; p.on('request', r => l.push(r.url().replace(process.env.BASE + '/', ''))); return l; };
  const p = await abrirPagina(b, { email: EMAIL, out, etiqueta: 'carga', dialogos: 'aceptar', ruta: '/juegos.html', esperar: MENU });
  const vistos = pedidos(p);
  // Respuesta lenta del motor de Gato para ver el indicador.
  await p.route('**/juegos/clasicos-rapidos-ui.js*', async r => { await sleep(1200); await r.continue(); });
  await abrirJuego(p, 'gato');
  const cargando = await p.waitForSelector('#app .loading', { timeout: 3000 }).then(x => x.textContent()).catch(() => '');
  ok('al elegir un juego se ve «Cargando…» mientras llegan sus archivos', /Cargando/.test(cargando), cargando);
  await p.waitForSelector('#app [data-ayuda="gato"]', { timeout: 30000 });
  await p.unroute('**/juegos/clasicos-rapidos-ui.js*');
  const delGato = vistos.filter(u => /juegos\/clasicos-rapidos(-ui)?\.(js|css)/.test(u));
  ok('Gato: se piden sus scripts y estilos con ?v=', delGato.length >= 3 && delGato.every(u => /\?v=\d+$/.test(u)), delGato.join(', '));
  ok('Gato: el CSS de los clásicos rápidos queda después de juegos.css (misma cascada que antes)', await p.evaluate(() => {
    const ls = [...document.querySelectorAll('link[rel="stylesheet"]')].map(l => l.getAttribute('href'));
    return ls.findIndex(h => h.startsWith('juegos/clasicos-rapidos.css')) > ls.findIndex(h => h.startsWith('juegos/app/juegos.css'));
  }));
  await p.click('[data-a="salir"]'); await p.waitForSelector(MENU);
  const antes = vistos.length;
  await abrirJuego(p, 'gato'); await p.waitForSelector('#app [data-ayuda="gato"]', { timeout: 30000 });
  const otraVez = vistos.slice(antes).filter(u => /\.(js|css)(\?|$)/.test(u));
  ok('Gato otra vez: no se vuelve a pedir ningún archivo', otraVez.length === 0, otraVez.join(', '));
  ok('Gato: cada archivo se pidió una sola vez', vistos.filter(u => u.startsWith('juegos/clasicos-rapidos-ui.js')).length === 1);
  await p.click('[data-a="salir"]'); await p.waitForSelector(MENU);

  // Error de red al cargar Damas: aviso amable y reintento.
  await p.route('**/juegos/tablero-ui.js*', r => r.abort('internetdisconnected'));
  await abrirJuego(p, 'damas');
  await p.waitForSelector('[data-reintentar-carga]', { timeout: 30000 }).catch(() => {});
  const aviso = (await p.textContent('#app').catch(() => '')).replace(/\s+/g, ' ');
  ok('sin red: aviso amable con «Reintentar» y «Volver»', /No se pudo cargar/.test(aviso) && !!(await p.$('[data-reintentar-carga]')) && !!(await p.$('#app [data-a="hub"]')), aviso.slice(0, 160));
  await p.unroute('**/juegos/tablero-ui.js*');
  await p.click('[data-reintentar-carga]');
  const reintento = await p.waitForSelector('#app [data-tb-go]', { timeout: 30000 }).then(() => true).catch(() => false);
  ok('Reintentar: con red, el juego abre', reintento);
  ok('Damas: tablero.css queda antes de juegos.css (misma cascada que antes)', await p.evaluate(() => {
    const ls = [...document.querySelectorAll('link[rel="stylesheet"]')].map(l => l.getAttribute('href'));
    const t = ls.findIndex(h => h.startsWith('juegos/tablero.css')), j = ls.findIndex(h => h.startsWith('juegos/app/juegos.css'));
    return t >= 0 && t < j;
  }));
  await p.click('[data-a="salir"]'); await p.waitForSelector(MENU);

  // Pestaña 👥 Partidas: carga lo de las salas antes de pintar el formulario.
  await p.route('**/juegos/app/salas.js*', async r => { await sleep(1200); await r.continue(); });
  await p.click('[data-tab="partidas"]');
  const cargandoP = await p.waitForSelector('#tab-body .loading', { timeout: 3000 }).then(x => x.textContent()).catch(() => '');
  ok('👥 Partidas: «Cargando…» mientras llega el código de las salas', /Cargando/.test(cargandoP), cargandoP);
  ok('👥 Partidas: el formulario de crear sale tras cargar las salas', await p.waitForSelector('#f-crear', { timeout: 30000 }).then(() => true).catch(() => false));
  await p.selectOption('#p-juego', 'una'); await p.click('#f-crear button[type=submit]');
  await p.waitForSelector('[data-p="empezar"]', { timeout: 30000 });
  const codigo = (await p.textContent('.letra')).trim();

  // ---------- 3. Enlaces profundos con caché vacía ----------
  const otro = await abrirPagina(b, { email: 'angel@example.com', out, etiqueta: 'enlace', dialogos: 'aceptar', ruta: '/juegos.html?sala=' + codigo });
  const lobby = await otro.waitForSelector('#p-body .rank li', { timeout: 60000 }).then(() => otro.textContent('#p-body')).catch(() => '');
  ok('?sala=CODIGO: con caché vacía se une y ve la sala de espera', lobby.includes(codigo) && /Marisol/.test(lobby), lobby.replace(/\s+/g, ' ').slice(0, 120));
  await otro.context().close();
  const ver = await abrirPagina(b, { email: 'jesus@example.com', out, etiqueta: 'espectador', dialogos: 'aceptar', ruta: '/juegos.html?sala=' + codigo + '&ver=1' });
  ok('?sala=…&ver=1: entra como espectador', await ver.waitForSelector('.esp-chip', { timeout: 60000 }).then(() => true).catch(() => false));
  await ver.context().close();
  await p.context().close();

  // Enlace ?sala= sin red para el código de las salas: aviso con «Reintentar» y «← Volver», que lleva al menú.
  const sinRed = await abrirPagina(b, { email: 'laura@example.com', out, etiqueta: 'sala sin red', dialogos: 'aceptar' });
  await sinRed.route('**/juegos/app/salas.js*', r => r.abort('internetdisconnected'));
  await sinRed.goto(urlDe('/juegos.html?sala=' + codigo));
  const avisoSala = await sinRed.waitForSelector('#app .alert', { timeout: 60000 }).then(x => x.textContent()).catch(() => '');
  ok('?sala= sin red: aviso con «Reintentar» y «← Volver»', /No se pudo cargar/.test(avisoSala) && !!(await sinRed.$('[data-a="reintentar"]')) && !!(await sinRed.$('#app [data-a="hub"]')), avisoSala);
  await sinRed.click('#app [data-a="hub"]');
  ok('?sala= sin red: «← Volver» lleva al menú', await sinRed.waitForSelector(MENU, { timeout: 30000 }).then(() => true).catch(() => false));
  await sinRed.context().close();

  const cat = await abrirPagina(b, { email: EMAIL, out, etiqueta: 'cat', ruta: '/juegos.html#cat=clasicos', esperar: '[data-menu="clasicos"]' });
  const lista = await cat.$$eval('#menu-juegos .game[data-juego]', xs => xs.map(x => x.dataset.juego));
  ok('#cat=clasicos: abre la lista con los juegos que viven en motores perezosos (Gato, Dominó…)', ['gato', 'domino', 'parchis', 'bingo', 'blackjack'].every(id => lista.includes(id)), lista.join(','));
  await cat.context().close();

  await b.close();
  console.log(out.join('\n'));
  process.exit(out.some(x => x.startsWith('FAIL')) ? 1 : 0);
})().catch(e => { console.log(out.join('\n')); console.log('ERROR', e.message); process.exit(1); });
