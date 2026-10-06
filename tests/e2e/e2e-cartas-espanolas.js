// E2E cartas españolas (openspec: cartas-espanolas): Brisca y Conquián, individual y en partida.
require('./lib/entorno'); // BASE, API, DATOS, DATA, CHROME, carpeta de salida y sesión de prueba en fetch
const { chromium } = require('playwright');
const { abrirPagina } = require('./lib/navegador');
const out = []; const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`);
const sleep = ms => new Promise(r => setTimeout(r, ms));

const pagina = (b, email, tiempo) => abrirPagina(b, { email, viejo: true, tiempo, viewport: { width: 390, height: 900 }, out, ruta: '/juegos.html', esperar: '[data-juego]' });
const brTurno = async p => { const c = await p.$('.es-btn.jugable[data-br-carta]'); if (c) { await c.click().catch(() => {}); return true; } return false; };
// Conquián: si hay una jugada válida con la carta ofrecida (pareja de la mano), la toma; si no, pasa. En fase bajar, descarta.
async function cqTurno(p) {
  const tomar = await p.$('[data-cq="tomar"]'), descartar = await p.$('[data-cq="descartar"]');
  if (!tomar && !descartar) return null;
  if (descartar) {
    const c = await p.$('[data-cq-carta]'); if (c) await c.click(); await sleep(100);
    await p.click('[data-cq="descartar"]').catch(() => {}); return 'descartar';
  }
  const par = await p.evaluate(() => {
    const of = Number(document.querySelector('[data-cq-oferta]').dataset.cqOferta);
    const mano = [...document.querySelectorAll('[data-cq-carta]')].map(b => Number(b.dataset.cqCarta));
    for (let x = 0; x < mano.length; x++) for (let y = x + 1; y < mano.length; y++) if (Cartas.esJuego([of, mano[x], mano[y]])) return [mano[x], mano[y]];
    return null;
  });
  if (!par) { await p.click('[data-cq="pasar"]').catch(() => {}); return 'pasar'; }
  for (const id of par) { await p.click('[data-cq-carta="' + id + '"]'); await sleep(80); }
  await p.click('[data-cq="tomar"]').catch(() => {}); return 'tomar';
}

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME });
  // ---- Brisca individual en pareja ----
  const p = await pagina(b, 'marisol@example.com', 0.15);
  await p.click('[data-juego="brisca"]'); await p.click('[data-ayuda="brisca"]');
  ok('ayuda Brisca: valor de las cartas y 120 puntos', /As[\s\S]*11 puntos/.test(await (await p.waitForSelector('dialog.ayuda[open]')).innerText()));
  await p.keyboard.press('Escape');
  await p.click('[data-br-modo="pareja"]'); await p.click('[data-br-go]'); await p.waitForSelector('.es-mano');
  ok('Brisca pareja: 3 cartas propias, 3 asientos, triunfo y tags de pareja', (await p.$$('.es-mano [data-br-carta]')).length === 3 && (await p.$$('.pk-asientos .pk-asiento')).length === 3 && !!(await p.$('.es-carta.triunfo')) && (await p.$$('.pk-tag.eqA, .pk-tag.eqB')).length === 4);
  await p.screenshot({ path: 'brisca-mesa.png', fullPage: true });
  let t0 = Date.now(), jug = 0;
  while (Date.now() - t0 < 180000 && !(await p.$('.result h1'))) { if (await brTurno(p)) jug++; await sleep(120); }
  const rb = await p.textContent('.result').catch(() => '');
  ok('Brisca individual: 10 cartas jugadas, termina y guarda', jug === 10 && /a tus individuales/.test(rb), 'jugadas=' + jug + ' ' + rb.replace(/\s+/g, ' ').slice(0, 120));

  // ---- Conquián individual ----
  await p.click('[data-a="hub"]').catch(() => {}); await p.waitForSelector('[data-juego="conquian"]');
  await p.click('[data-juego="conquian"]'); await p.click('[data-ayuda="conquian"]');
  ok('ayuda Conquián: juegos válidos y 7-sota', /el 7 y la sota \(10\) van seguidas/i.test(await (await p.waitForSelector('dialog.ayuda[open]')).innerText()));
  await p.keyboard.press('Escape');
  await p.click('[data-cq-go]'); await p.waitForSelector('.es-mano');
  ok('Conquián: 8 cartas en la mano y carta ofrecida', (await p.$$('[data-cq-carta]')).length === 8 && !!(await p.$('[data-cq-oferta]')));
  await p.waitForSelector('[data-cq="tomar"]', { timeout: 20000 }).catch(() => {});
  if (await p.$('[data-cq="tomar"]')) {
    await p.click('[data-cq="tomar"]'); await sleep(200);
    ok('Conquián: tomar sin juego explica por qué', /Eso no forma un juego/.test(await p.textContent('#cq-msg')));
  }
  const acciones = {}; t0 = Date.now();
  while (Date.now() - t0 < 240000 && !(await p.$('.result h1'))) { const a = await cqTurno(p); if (a) { acciones[a] = (acciones[a] || 0) + 1; await sleep(150); if (a === 'tomar' && acciones.tomar === 1) await p.screenshot({ path: 'conquian-mesa.png', fullPage: true }); } else await sleep(150); }
  const rc = await p.textContent('.result').catch(() => '');
  ok('Conquián individual: termina y guarda', /a tus individuales/.test(rc), JSON.stringify(acciones) + ' ' + rc.replace(/\s+/g, ' ').slice(0, 100));
  await p.context().close();

  // ---- Brisca en partida: 2 navegadores + 2 bots = parejas ----
  const host = await pagina(b, 'marisol@example.com', 0.3), otro = await pagina(b, 'angel@example.com', 0.3);
  await host.click('[data-tab="partidas"]'); await host.selectOption('#p-juego', 'brisca'); await host.click('#f-crear button[type=submit]'); await host.waitForSelector('[data-p="empezar"]');
  const codigo = (await host.textContent('.letra')).trim();
  await otro.click('[data-tab="partidas"]'); await otro.fill('#p-codigo', codigo); await otro.click('#f-unirse button[type=submit]'); await otro.waitForSelector('#p-body .rank li');
  await sleep(1200); await host.click('[data-p="empezar"]');
  await host.waitForSelector('.es-mano', { timeout: 20000 }); await otro.waitForSelector('.es-mano', { timeout: 20000 });
  ok('Brisca sala: mismo triunfo en ambos y parejas', (await host.textContent('.pk-titulo')) === (await otro.textContent('.pk-titulo')) && (await host.$$('.pk-tag.eqA, .pk-tag.eqB')).length === 4);
  await host.screenshot({ path: 'brisca-sala.png', fullPage: true });
  t0 = Date.now(); let js = 0;
  while (Date.now() - t0 < 240000 && !((await host.$('.result h1')) && (await otro.$('.result h1')))) { for (const q of [host, otro]) if (await brTurno(q)) { js++; await sleep(500); } await sleep(200); }
  const fh = await host.textContent('.result h1').catch(() => ''), fo = await otro.textContent('.result h1').catch(() => '');
  ok('Brisca sala: mismo final en ambos', fh && fh === fo, fh + ' · jugadas=' + js);
  await sleep(2000); ok('Brisca sala: se guarda en partidas', /partidas/.test(await host.textContent('#p-guardado').catch(() => '')));
  await host.context().close(); await otro.context().close();

  // ---- Conquián en partida: humano contra bot ----
  const h2 = await pagina(b, 'marisol@example.com', 0.3);
  await h2.click('[data-tab="partidas"]'); await h2.selectOption('#p-juego', 'conquian'); await h2.click('#f-crear button[type=submit]'); await h2.waitForSelector('[data-p="empezar"]');
  await h2.click('[data-p="empezar"]'); await h2.waitForSelector('.es-mano', { timeout: 20000 });
  ok('Conquián sala: contra BOT-VACHIRA', /BOT-VACHIRA/.test(await h2.textContent('.pk-asientos')));
  t0 = Date.now(); const ac = {};
  while (Date.now() - t0 < 300000 && !(await h2.$('.result h1'))) { const a = await cqTurno(h2); if (a) { ac[a] = (ac[a] || 0) + 1; await sleep(700); } else await sleep(250); }
  ok('Conquián sala: termina', !!(await h2.$('.result h1')), JSON.stringify(ac) + ' ' + (await h2.textContent('.result h1').catch(() => '')));
  await b.close();
  console.log(out.join('\n')); process.exit(out.some(x => x.startsWith('FAIL')) ? 1 : 0);
})().catch(e => { console.log(out.join('\n')); console.error('ERROR', e.message.slice(0, 300)); process.exit(2); });
