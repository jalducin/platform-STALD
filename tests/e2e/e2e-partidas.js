// E2E de partidas: dos navegadores (anfitriona y otro jugador) + bots. Preguntas sincronizadas y Basta.
require('./lib/entorno'); // BASE, API, DATOS, DATA, CHROME, carpeta de salida y sesión de prueba en fetch
const { chromium } = require('playwright');
const fs = require('fs');
const { abrirPagina } = require('./lib/navegador');
const basta = JSON.parse(fs.readFileSync(process.env.DATOS + '/basta.json', 'utf8'));
const out = []; const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const norm = s => String(s).trim().toLowerCase().replace(/ñ/g, '\u0001').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\u0001/g, 'ñ');

async function jugador(b, email) {
  const p = await abrirPagina(b, { email, tiempo: 0.4, out, ruta: '/juegos.html', esperar: '[data-juego]' }); // verificador falso (plataforma-login)
  await p.click('[data-tab="partidas"]'); await p.waitForSelector('#f-crear');
  return p;
}
const podio = p => p.$$eval('.rank li', ls => ls.map(l => l.querySelector('.n').childNodes[0].textContent.trim() + '=' + l.querySelector('.pts').textContent.trim()));

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME });
  const host = await jugador(b, 'marisol@example.com'), otro = await jugador(b, 'angel@example.com');

  // ---- Partida de preguntas (Maratón de cultura, todas, con bots) ----
  await host.selectOption('#p-juego', 'cultura');
  ok('opción de maratón visible para cultura', !(await host.$eval('#p-cat-wrap', e => e.hidden)));
  await host.click('#f-crear button[type=submit]'); await host.waitForSelector('[data-p="empezar"]', { timeout: 30000 });
  const codigo = (await host.textContent('.letra')).trim();
  ok('crear: código de 4 letras', /^[A-Z]{4}$/.test(codigo), codigo);
  await otro.fill('#p-codigo', codigo.toLowerCase()); await otro.click('#f-unirse button[type=submit]');
  await otro.waitForSelector('.rank li', { timeout: 30000 });
  await sleep(3200);
  const lobbyHost = await host.$$eval('.rank li', ls => ls.map(l => l.textContent));
  ok('sala de espera: 2 personas + 2 bots en ambos', lobbyHost.length === 4 && (await otro.$$('.rank li')).length === 4, lobbyHost.join(' | ').slice(0, 160));
  ok('solo la anfitriona puede empezar', !(await otro.$('[data-p="empezar"]')));
  await host.click('[data-p="empezar"]');
  // Pregunta 1 en ambos
  await host.waitForSelector('[data-pq="0"]', { timeout: 20000 }); await otro.waitForSelector('[data-pq="0"]', { timeout: 20000 });
  const qh = await host.textContent('.q-card .q'), qo = await otro.textContent('.q-card .q');
  const oh = await host.$$eval('[data-pq="0"]', bs => bs.map(x => x.textContent)), oo = await otro.$$eval('[data-pq="0"]', bs => bs.map(x => x.textContent));
  ok('misma pregunta y mismas opciones en ambos', qh === qo && JSON.stringify(oh) === JSON.stringify(oo), qh.slice(0, 60));
  await host.screenshot({ path: 'partida-pregunta.png' });
  // Responder las 10: la anfitriona la opción 1, el otro la 2
  const respondidas = { h: new Set(), o: new Set() };
  const t0 = Date.now();
  while (Date.now() - t0 < 120000 && !((await host.$('.result')) && (await otro.$('.result')))) {
    for (const [p, k, idx] of [[host, 'h', 0], [otro, 'o', 1]]) {
      try { const btn = await p.$(`[data-po="${idx}"]`); if (btn) { const q = await btn.getAttribute('data-pq'); if (!respondidas[k].has(q)) { await btn.click(); respondidas[k].add(q); } } } catch (e) { /* redibujado */ }
    }
    await sleep(120);
  }
  ok('ambos llegan al podio', !!(await host.$('.result')) && !!(await otro.$('.result')));
  ok('respondieron las 10 preguntas', respondidas.h.size === 10 && respondidas.o.size === 10, respondidas.h.size + '/' + respondidas.o.size);
  await sleep(3000);
  const ph = await podio(host), po = await podio(otro);
  ok('podio idéntico en ambos (humanos y bots)', JSON.stringify(ph) === JSON.stringify(po) && ph.length === 4, ph.join(' | '));
  ok('bots en el podio', ph.some(x => x.startsWith('BOT-VACHIRA')) && ph.some(x => x.startsWith('BOT-ISAGII')));
  await host.waitForFunction(() => /puntos de partidas/.test(document.getElementById('p-guardado').textContent), null, { timeout: 15000 }).catch(() => {}); ok('puntos guardados en partidas', (await host.textContent('#p-guardado')).includes('puntos de partidas') && (await otro.textContent('#p-guardado')).includes('puntos de partidas'));
  await host.screenshot({ path: 'partida-podio.png', fullPage: true });

  // ---- Partida de Basta ----
  await host.click('[data-tab="partidas"]'); await host.waitForSelector('#f-crear');
  await otro.click('[data-tab="partidas"]'); await otro.waitForSelector('#f-crear');
  await host.selectOption('#p-juego', 'basta-es'); await host.selectOption('#p-rondas', '5'); await host.click('#f-crear button[type=submit]'); await host.waitForSelector('[data-p="empezar"]');
  const cod2 = (await host.textContent('.letra')).trim();
  await otro.fill('#p-codigo', cod2); await otro.click('#f-unirse button[type=submit]'); await otro.waitForSelector('.rank li');
  await host.click('[data-p="empezar"]');
  await host.waitForSelector('#pb-form', { timeout: 20000 }); await otro.waitForSelector('#pb-form', { timeout: 20000 });
  const lh = (await host.textContent('.letra')).trim(), lo = (await otro.textContent('.letra')).trim();
  ok('Basta: misma letra para todos', lh === lo, lh);
  const L = norm(lh);
  const palabra = cat => basta.es.palabras[cat].filter(w => norm(w).startsWith(L));
  for (const c of basta.es.categorias) {
    const ws = palabra(c.id);
    await host.fill('#pb-' + c.id, ws[0] || (lh + 'xx'));
    await otro.fill('#pb-' + c.id, c.id === 'nombre' ? (ws[0] || lh + 'xx') : (ws[ws.length - 1] || lh + 'yy'));
  }
  ok('¡Basta! se habilita con todo lleno', !(await host.$eval('#pb-basta', x => x.disabled)));
  await host.click('#pb-basta');
  await otro.waitForFunction(() => (document.getElementById('pb-aviso') || {}).textContent?.includes('gritó BASTA') || !!document.querySelector('#pb-sig') || !!document.querySelector('.result'), null, { timeout: 15000 }).catch(() => {});
  ok('¡Basta! cierra la ronda también para el otro jugador', /gritó BASTA/.test(await otro.textContent('#p-body')) || !!(await otro.$('#pb-sig')));
  await host.waitForSelector('#pb-sig', { timeout: 30000 }); await otro.waitForSelector('#pb-sig', { timeout: 30000 }); // resultados de la ronda 1
  const tablaH = await host.$$eval('.basta-res tbody tr', trs => trs.map(t => [...t.children].map(c => c.textContent.trim())));
  const fila = tablaH.find(r => r[0].includes('Nombre'));
  ok('Basta: palabra repetida vale 50 para ambos', fila && fila[3] === '50' && (await otro.$$eval('.basta-res tbody tr', trs => trs.map(t => [...t.children].map(c => c.textContent.trim())))).find(r => r[0].includes('Nombre'))[3] === '50', JSON.stringify(fila));
  await host.waitForSelector('.result', { timeout: 180000 }); await otro.waitForSelector('.result', { timeout: 180000 }); await sleep(800);
  ok('Basta: podio idéntico en ambos', JSON.stringify(await podio(host)) === JSON.stringify(await podio(otro)), (await podio(host)).join(' | '));
  await b.close();
  console.log(out.join('\n')); process.exit(out.some(x => x.startsWith('FAIL')) ? 1 : 0);
})().catch(e => { console.log(out.join('\n')); console.error('ERROR', e.message.slice(0, 400)); process.exit(2); });
