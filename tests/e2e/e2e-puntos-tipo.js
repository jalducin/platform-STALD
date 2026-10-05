// E2E: puntos por tipo (openspec: puntos-por-tipo). Todo suma: ⭐ individuales y 👥 partidas.
require('./lib/entorno'); // BASE, API, DATOS, DATA, CHROME, carpeta de salida y sesión de prueba en fetch
const { chromium } = require('playwright');
const BASE = process.env.BASE;
const API = process.env.API;
const Q = '?api=' + encodeURIComponent(API);
const out = []; const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const num = t => Number(String(t).replace(/[^0-9]/g, '')) || 0;
async function jugador(b, email) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(e => { window.__TIEMPO_JUEGOS = 0.2; (localStorage.setItem('stald_email', e), localStorage.setItem('stald_sesion_prueba', JSON.stringify({ email: e, token: 'prueba:' + e }))); localStorage.setItem('ingles_email', e); }, email);
  const p = await ctx.newPage(); p.on('pageerror', e => out.push('FAIL error JS (' + email + '): ' + e.message)); p.on('dialog', d => d.accept());
  await p.goto(BASE + '/juegos.html' + Q); await p.waitForSelector('[data-juego]', { timeout: 60000 }); return p;
}
async function jugarCalculo(p) {
  await p.click('[data-juego="mente-calculo"]');
  const t0 = Date.now(); while (!(await p.$('.result .score')) && Date.now() - t0 < 60000) { const o = await p.$('.opt:not(.ok):not(.bad)'); if (o) await o.click().catch(() => {}); await sleep(120); }
  await p.waitForFunction(() => /a tus individuales|No se guardaron/.test((document.querySelector('.result') || {}).textContent || ''), null, { timeout: 30000 });
  const pts = num(await p.textContent('.result .score'));
  await p.click('[data-a="hub"]'); await p.waitForSelector('[data-juego]');
  return pts;
}
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME });
  const m = await jugador(b, 'marisol@example.com');
  const antes = await m.evaluate(() => ({ i: state.totalIndividual, p: state.totalPartidas }));
  const a1 = await jugarCalculo(m), a2 = await jugarCalculo(m);
  const desp = await m.evaluate(() => ({ i: state.totalIndividual, p: state.totalPartidas }));
  ok('dos juegos individuales suman ambos (aunque no sean récord)', desp.i === antes.i + a1 + a2 && desp.p === antes.p, JSON.stringify({ antes, a1, a2, desp }));
  ok('chip con ⭐ individuales y 👥 partidas', /⭐ [\d,]+ · 👥 [\d,]+/.test(await m.textContent('#chip')), await m.textContent('#chip'));

  // Partida en sala (cultura, sin bots, 2 personas)
  const o = await jugador(b, 'angel@example.com');
  await m.click('[data-tab="partidas"]'); await m.selectOption('#p-juego', 'cultura'); await m.uncheck('#p-bots');
  await m.click('#f-crear button[type=submit]'); await m.waitForSelector('[data-p="empezar"]');
  const codigo = (await m.textContent('.letra')).trim();
  await o.click('[data-tab="partidas"]'); await o.fill('#p-codigo', codigo); await o.click('#f-unirse button[type=submit]'); await o.waitForSelector('#p-body .rank li');
  await sleep(2600); await m.click('[data-p="empezar"]');
  const t0 = Date.now(); const resp = { m: new Set(), o: new Set() };
  while (Date.now() - t0 < 150000 && !((await m.$('.result')) && (await o.$('.result')))) {
    for (const [p, k] of [[m, 'm'], [o, 'o']]) {
      try { const btn = await p.$('[data-po="0"]'); if (btn) { const q = await btn.getAttribute('data-pq'); if (!resp[k].has(q)) { await btn.click(); resp[k].add(q); } } } catch (e) { /* redibujado */ }
    }
    await sleep(120);
  }
  await m.waitForFunction(() => /puntos de partidas|No se guardó/.test((document.getElementById('p-guardado') || {}).textContent || ''), null, { timeout: 30000 });
  const guard = await m.textContent('#p-guardado');
  const misPuntos = num(await m.textContent('.result .score'));
  ok('la partida se guarda en puntos de partidas', guard.includes('a tus puntos de partidas'), guard);
  const tras = await m.evaluate(() => ({ i: state.totalIndividual, p: state.totalPartidas }));
  ok('👥 partidas sube con la sala y ⭐ individuales no', tras.p === desp.p + misPuntos && tras.i === desp.i, JSON.stringify({ desp, misPuntos, tras }));
  const dup = await (await fetch(API + '/juegos/partida?email=marisol%40example.com', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ juego: 'cultura', puntos: 100, sala: codigo }) })).json();
  ok('la misma sala no se guarda dos veces', dup.error === 'ya_guardada', JSON.stringify(dup));

  // Ranking con pestañas
  await m.click('[data-a="hub"]').catch(() => {}); await m.click('[data-tab="ranking"]'); await m.waitForSelector('[data-rtipo]');
  await m.waitForSelector('.rank li');
  const ind = await m.$$eval('.rank li', ls => ls.map(l => l.textContent));
  ok('ranking individual con ⭐ y Marisol', ind.some(t => t.includes('Marisol') && t.includes('⭐')), ind.join(' | ').slice(0, 160));
  await m.click('[data-rtipo="partidas"]'); await sleep(800);
  const par = await m.$$eval('.rank li', ls => ls.map(l => l.textContent));
  ok('ranking de partidas con 👥 y los dos jugadores', par.some(t => t.includes('Marisol') && t.includes('👥')) && par.some(t => t.includes('Angel')), par.join(' | ').slice(0, 160));
  await m.screenshot({ path: 'ranking-partidas.png' });

  // Admin: tarjeta de juegos en Inglés
  const ctx = await b.newContext(); await ctx.addInitScript(() => (localStorage.setItem('ingles_email', 'admin@example.com'), localStorage.setItem('stald_sesion_prueba', JSON.stringify({ email: 'admin@example.com', token: 'prueba:admin@example.com' }))));
  const ad = await ctx.newPage(); await ad.goto(BASE + '/ingles.html' + Q); await ad.waitForSelector('#juegos-admin', { state: 'attached', timeout: 60000 }); // en la página nueva es un <details> plegado
  ok('admin: juegos de la semana con individuales y partidas', (await ad.textContent('#juegos-admin')).includes('individuales') && (await ad.textContent('#juegos-admin')).includes('partidas'));
  await b.close();
  console.log(out.join('\n')); process.exit(out.some(x => x.startsWith('FAIL')) ? 1 : 0);
})().catch(e => { console.log(out.join('\n')); console.error('ERROR', e.message.slice(0, 400)); process.exit(2); });
