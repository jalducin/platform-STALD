// E2E: foto como avatar (openspec: avatar-foto). Subir con permiso, verla en otro navegador y en el portal,
// moderación del admin, fallback al personaje y volver a un personaje.
require('./lib/entorno'); // BASE, API, DATOS, DATA, CHROME, carpeta de salida y sesión de prueba en fetch
const { chromium } = require('playwright');
const BASE = process.env.BASE;
const API = process.env.API;
const Q = '?api=' + encodeURIComponent(API);
const out = []; const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`);
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function jugador(b, email, ruta = '/juegos.html') {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(e => { (localStorage.setItem('stald_email', e), localStorage.setItem('stald_sesion_prueba', JSON.stringify({ email: e, token: 'prueba:' + e }))); }, email);
  const p = await ctx.newPage(); p.on('pageerror', e => out.push('FAIL error JS (' + email + '): ' + e.message)); p.on('dialog', d => d.accept());
  await p.goto(BASE + ruta + Q); if (ruta === '/juegos.html') await p.waitForSelector('[data-juego]', { timeout: 60000 }); return p;
}
const imgCargada = (p, sel) => p.$eval(sel, i => i.complete && i.naturalWidth > 0).catch(() => false);
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME });
  // Imagen grande de prueba (PNG 900×600) hecha en un canvas
  const g = await b.newPage();
  const b64 = await g.evaluate(() => { const c = document.createElement('canvas'); c.width = 900; c.height = 600; const x = c.getContext('2d'); for (let i = 0; i < 30; i++) { x.fillStyle = `hsl(${i * 12},80%,55%)`; x.fillRect(i * 30, 0, 30, 600); } x.fillStyle = '#fff'; x.beginPath(); x.arc(450, 300, 150, 0, 7); x.fill(); return c.toDataURL('image/png').split(',')[1]; });
  const png = Buffer.from(b64, 'base64'); await g.close();

  const m = await jugador(b, 'marisol@example.com');
  await m.click('#chip'); await m.waitForSelector('#av-file');
  ok('selector ofrece subir foto con casilla de permiso', !!(await m.$('#av-permiso')));
  await m.setInputFiles('#av-file', { name: 'yo.png', mimeType: 'image/png', buffer: png });
  await m.waitForSelector('#av-vista img');
  const prev = await m.$eval('#av-vista img', i => ({ src: i.src.slice(0, 23), largo: i.src.length }));
  ok('vista previa reducida a JPEG ≤ 40 KB', prev.src === 'data:image/jpeg;base64,' && prev.largo <= 40000, JSON.stringify(prev));
  const dims = await m.evaluate(() => new Promise(r => { const i = new Image(); i.onload = () => r([i.naturalWidth, i.naturalHeight]); i.src = document.querySelector('#av-vista img').src; }));
  ok('recorte 128×128', dims[0] === 128 && dims[1] === 128, JSON.stringify(dims));
  await m.click('[data-av-guardar]'); await sleep(400);
  ok('sin permiso no guarda y avisa', (await m.textContent('#av-msg')).includes('permiso') && !!(await m.$('#av-file')));
  await m.check('#av-permiso'); await m.click('[data-av-guardar]'); await m.waitForSelector('[data-juego]');
  await m.waitForSelector('#chip .av img'); await sleep(500);
  ok('chip con la foto (servida por el backend)', await imgCargada(m, '#chip .av img'), await m.$eval('#chip .av img', i => i.src));
  const token = await m.evaluate(() => state.jugador.avatar.foto);
  // Reabrir y guardar sin cambios conserva la foto
  await m.click('#chip'); await m.waitForSelector('[data-av-guardar]'); await m.click('[data-av-guardar]'); await m.waitForSelector('[data-juego]');
  ok('guardar sin cambios conserva la foto', (await m.evaluate(() => state.jugador.avatar.foto)) === token);
  // Partida para aparecer en el ranking
  await m.click('[data-juego="mente-calculo"]');
  const t0 = Date.now(); while (!(await m.$('.result .score')) && Date.now() - t0 < 90000) { const o = await m.$('.opt:not(.ok):not(.bad)'); if (o) await o.click().catch(() => {}); await sleep(150); }
  await m.click('[data-a="hub"]');

  const a = await jugador(b, 'angel@example.com');
  await a.click('[data-tab="ranking"]'); await a.waitForSelector('.rank li'); await sleep(600);
  const enRank = await a.$$eval('.rank li', ls => ls.filter(l => l.textContent.includes('Marisol')).map(l => !!l.querySelector('.av img') && l.querySelector('.av img').naturalWidth > 0));
  ok('otro navegador ve la foto en el ranking', enRank[0] === true, JSON.stringify(enRank));
  ok('alumno no ve la pestaña de fotos', !(await a.$('[data-tab="fotos"]')) && !(await a.$('[data-tab="admin"]')));
  // Sala: la foto aparece en la sala de espera del otro
  await m.click('[data-tab="partidas"]'); await m.waitForSelector('#f-crear'); await m.uncheck('#p-bots'); await m.click('#f-crear button[type=submit]'); await m.waitForSelector('[data-p="empezar"]');
  const codigo = (await m.textContent('.letra')).trim();
  await a.click('[data-tab="partidas"]'); await a.fill('#p-codigo', codigo); await a.click('#f-unirse button[type=submit]'); await a.waitForSelector('#p-body .rank li'); await sleep(2500);
  ok('foto en la sala de espera (otro navegador)', await a.$$eval('#p-body .rank li .av img', xs => xs.some(x => x.naturalWidth > 0)));
  // Portal
  const pp = await jugador(b, 'marisol@example.com', '/'); await pp.waitForSelector('#hello .av', { timeout: 60000 }); await sleep(800);
  ok('portal: foto en el saludo', await imgCargada(pp, '#hello .av img'));

  // Admin: modera
  const ad = await jugador(b, 'admin@example.com');
  await ad.click('[data-tab="admin"]'); await ad.click('[data-adm="fotos"]'); await ad.waitForSelector('#adm-panel .fotos-grid'); await sleep(500);
  const lista = await ad.$$eval('[data-quitar-foto]', xs => xs.map(x => x.dataset.quitarFoto));
  ok('admin ve la foto en «🛡️ Admin › Fotos»', lista.includes('a-marisol'), JSON.stringify(lista));
  ok('la foto muestra el correo de su jugador (para buscarla)', (await ad.textContent('#adm-panel .fotos-grid')).includes('marisol@example.com'));
  const nFotos = Number(await ad.textContent('[data-adm="fotos"] .adm-n'));
  await ad.screenshot({ path: 'fotos-admin.png' });
  await ad.click('[data-quitar-foto="a-marisol"]'); await sleep(1500);
  ok('admin quita la foto', !(await ad.$('[data-quitar-foto="a-marisol"]')));
  ok('el contador de fotos baja y sigue en «Fotos»', Number(await ad.textContent('[data-adm="fotos"] .adm-n')) === nFotos - 1 && (await ad.getAttribute('[data-adm="fotos"]', 'aria-selected')) === 'true');
  const st = await (await fetch(API + '/juegos/foto/' + token)).status;
  ok('la foto quitada responde 404', st === 404, String(st));
  // Fallback: una página con el token viejo muestra el personaje
  const nuevo = await b.newContext(); await nuevo.addInitScript(() => (localStorage.setItem('stald_email', 'jesus@example.com'), localStorage.setItem('stald_sesion_prueba', JSON.stringify({ email: 'jesus@example.com', token: 'prueba:' + 'jesus@example.com' }))));
  const fb = await nuevo.newPage(); await fb.goto(BASE + '/juegos.html' + Q); await fb.waitForSelector('[data-juego]', { timeout: 60000 });
  await fb.evaluate(t => { state.jugador.avatar = { emoji: '🦊', color: '#22c55e', foto: t }; pintarChip(); }, token); await sleep(1500);
  ok('fallback: avatar con foto borrada muestra el personaje', !(await fb.$('#chip .av img')) && (await fb.textContent('#chip .av')).trim() === '🦊');
  await m.evaluate(() => { limpiar(); pantallaHub('juegos'); }); await m.waitForSelector('[data-juego]');
  // Volver a un personaje quita la foto
  await m.click('#chip'); await m.waitForSelector('#av-file');
  await m.setInputFiles('#av-file', { name: 'yo.png', mimeType: 'image/png', buffer: png }); await m.waitForSelector('#av-vista img');
  await m.check('#av-permiso'); await m.click('[data-av-guardar]'); await m.waitForSelector('[data-juego]');
  const t2 = await m.evaluate(() => state.jugador.avatar.foto);
  await m.click('#chip'); await m.waitForSelector('[data-av-emoji]'); await m.click('[data-av-emoji]:nth-child(3)');
  ok('elegir personaje quita la vista de foto', !(await m.$('#av-vista img')));
  await m.click('[data-av-guardar]'); await m.waitForSelector('[data-juego]');
  ok('volver a personaje: sin foto en el chip y la foto ya no existe', !(await m.$('#chip .av img')) && (await fetch(API + '/juegos/foto/' + t2)).status === 404);
  await m.screenshot({ path: 'avatar-foto-chip.png' });
  await b.close();
  console.log(out.join('\n')); process.exit(out.some(x => x.startsWith('FAIL')) ? 1 : 0);
})().catch(e => { console.log(out.join('\n')); console.error('ERROR', e.message.slice(0, 400)); process.exit(2); });
