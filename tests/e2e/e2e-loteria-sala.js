// E2E: Lotería en partida (dos navegadores + bots) y "Responde en inglés" en solitario.
require('./lib/entorno'); // BASE, API, DATOS, DATA, CHROME, carpeta de salida y sesión de prueba en fetch
const { chromium } = require('playwright');
const { abrirPagina } = require('./lib/navegador');
const out = []; const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const jugador = (b, email) => abrirPagina(b, { email, viejo: true, tiempo: 0.2, out, ruta: '/juegos.html', esperar: '[data-juego]' });
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME });
  const host = await jugador(b, 'marisol@example.com');
  // Responde en inglés (solitario)
  ok('catálogo: Completa y responde', !!(await host.$('[data-juego="en-frases"]')));
  await host.click('[data-juego="en-frases"]'); await host.waitForSelector('.opt');
  const q = await host.textContent('.q-card .q');
  ok('pregunta en inglés con traducción', /\?|!|\./.test(q) && (await host.textContent('.q-card .sub')).length > 3, q);
  await host.screenshot({ path: 'preguntas-en.png' });
  const t0 = Date.now();
  while (!(await host.$('.result .score')) && Date.now() - t0 < 60000) { const o = await host.$('.opt:not(.ok):not(.bad)'); if (o) await o.click().catch(() => {}); await sleep(150); }
  ok('Responde en inglés: termina y guarda', (await host.textContent('.result')).includes('a tus individuales'));
  await host.click('[data-a="hub"]');
  // Lotería en partida
  const otro = await jugador(b, 'angel@example.com');
  await host.click('[data-tab="partidas"]'); await host.selectOption('#p-juego', 'loteria');
  ok('selector de modo visible para Lotería', !(await host.$eval('#p-modo-wrap', e => e.hidden)));
  await host.selectOption('#p-modo', 'linea'); await host.click('#f-crear button[type=submit]'); await host.waitForSelector('[data-p="empezar"]');
  const codigo = (await host.textContent('.letra')).trim();
  const lobby = await host.textContent('#p-body');
  ok('bots renombrados en la sala', lobby.includes('BOT-VACHIRA') && lobby.includes('BOT-ISAGII'));
  await otro.click('[data-tab="partidas"]'); await otro.fill('#p-codigo', codigo); await otro.click('#f-unirse button[type=submit]'); await otro.waitForSelector('#p-body .rank li');
  await host.click('[data-p="empezar"]');
  await host.waitForSelector('.lot-cell', { timeout: 20000 }); await otro.waitForSelector('.lot-cell', { timeout: 20000 });
  await sleep(1500);
  const [ch, co] = [await host.textContent('#lot-carta'), await otro.textContent('#lot-carta')];
  const [nh, no] = [await host.textContent('#lot-n'), await otro.textContent('#lot-n')];
  ok('misma carta cantada en ambos', (ch === co && nh === no) || Math.abs(Number(nh) - Number(no)) <= 1, nh + ' vs ' + no + ' · ' + ch.slice(0, 40));
  const th = await host.$$eval('.lot-cell .nm', xs => xs.map(x => x.textContent)), to = await otro.$$eval('.lot-cell .nm', xs => xs.map(x => x.textContent));
  ok('tablas distintas', JSON.stringify(th) !== JSON.stringify(to));
  await host.screenshot({ path: 'loteria-sala.png' });
  const t1 = Date.now();
  while (Date.now() - t1 < 90000 && !((await host.$('.result')) && (await otro.$('.result')))) {
    for (const p of [host, otro]) { try { for (const c of await p.$$('.lot-cell:not(.marcada)')) await c.click(); const g = await p.$('[data-lsgrito]'); if (g) await g.click(); } catch (e) { /* redibujado */ } }
    await sleep(200);
  }
  await sleep(2500);
  const fh = await host.textContent('.result h1').catch(() => ''), fo = await otro.textContent('.result h1').catch(() => '');
  ok('mismo ganador en ambos', fh && fh === fo && /Lotería de|Se acabaron/.test(fh), fh + ' | ' + fo);
  const podio = p => p.$$eval('.rank li', ls => ls.map(l => l.querySelector('.n').childNodes[0].textContent.trim() + '=' + l.querySelector('.pts').textContent.trim()));
  const ph = await podio(host), po = await podio(otro);
  ok('podio idéntico en ambos', JSON.stringify(ph) === JSON.stringify(po) && ph.length === 4, ph.join(' | '));
  ok('guardado en el ranking', (await host.textContent('#p-guardado')).includes('puntos de partidas'));
  await b.close();
  console.log(out.join('\n')); process.exit(out.some(x => x.startsWith('FAIL')) ? 1 : 0);
})().catch(e => { console.log(out.join('\n')); console.error('ERROR', e.message.slice(0, 300)); process.exit(2); });
