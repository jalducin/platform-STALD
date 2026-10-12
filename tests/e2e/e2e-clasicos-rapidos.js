// E2E de los clásicos rápidos (openspec: clasicos-rapidos): los 5 juegos en individual, Gato y Conecta 4 en sala con
// 2 personas, Piedra-papel-tijera con bots (mesa: una persona más, un bot menos) y capturas a 390 px.
require('./lib/entorno'); // BASE, API, DATOS, DATA, CHROME, carpeta de salida y sesión de prueba en fetch
const { chromium } = require('playwright');
const { abrirPagina } = require('./lib/navegador');
const out = []; const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`); const info = (n, x = '') => out.push(`INFO ${n} ${x}`);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const pagina = (b, email, tiempo) => abrirPagina(b, { email, viejo: true, tiempo, out, dialogos: 'aceptar', ruta: '/juegos.html', esperar: '[data-juego]' });
const texto = async (p, sel) => ((await p.textContent(sel).catch(() => '')) || '').replace(/\s+/g, ' ').trim();
// Repite `paso` hasta que aparezca el resultado (o se acabe el tiempo).
async function hastaResultado(p, paso, ms = 120000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (await p.$('.result .score')) return true;
    await paso().catch(() => {});
    await sleep(120);
  }
  return false;
}
const clicPrimero = async (p, sel) => { const b = await p.$(sel); if (b) await b.click({ timeout: 1000 }); return !!b; };

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME });
  const p = await pagina(b, 'marisol@example.com', 0.15);
  // ---- Menú ----
  const ids = await p.$$eval('[data-juego]', xs => xs.map(x => x.dataset.juego));
  ok('menú: todos los juegos de la página (JUEGOS.length) y 16 en Clásicos (con los 5 nuevos)', ids.length === await p.evaluate(() => JUEGOS.length) && (await p.$$('.cat-clasicos[data-juego]')).length === 16 && ['gato', 'conecta4', 'ppt', 'ahorcado', 'serpientes'].every(i => ids.includes(i)), ids.length + ' juegos');
  await p.$eval('[data-juego="gato"]', e => e.scrollIntoView({ block: 'start' })); await sleep(200);
  await p.screenshot({ path: 'clasicos-rapidos-390-menu.png', fullPage: false });

  // ---- Gato individual (difícil): Michi no pierde ----
  await p.click('[data-juego="gato"]'); await p.click('[data-cr-nivel="3"]');
  await p.click('[data-ayuda="gato"]');
  ok('gato: ayuda con líneas y empate', /tres[\s\S]*empate/i.test(await texto(p, 'dialog.ayuda[open]')));
  await p.keyboard.press('Escape');
  await p.click('[data-cr-go]'); await p.waitForSelector('.cr-gato');
  ok('gato: tablero de 9 casillas', (await p.$$('.cr-gato button')).length === 9);
  await p.click('.cr-gato button:nth-child(5)'); await sleep(300);
  await p.screenshot({ path: 'clasicos-rapidos-390-gato.png', fullPage: true });
  ok('gato: tras mi ❌ Michi responde con ⭕', await p.waitForFunction(() => document.querySelectorAll('.cr-gato .cr-o').length >= 1, null, { timeout: 8000 }).then(() => true).catch(() => false));
  const g = await hastaResultado(p, () => clicPrimero(p, '.cr-gato button:not([disabled])'));
  const rg = await texto(p, '.result');
  ok('gato: serie de 3 y puntos guardados', g && /a tus individuales/.test(rg) && /de 3/.test(rg), rg.slice(0, 140));
  ok('gato: en difícil no gané ninguna ronda (minimax)', /✅ 0 de 3/.test(rg), rg.slice(0, 80));
  await p.click('[data-a="hub"]');

  // ---- Conecta 4 individual (fácil) ----
  await p.click('[data-juego="conecta4"]'); await p.click('[data-cr-nivel="1"]'); await p.click('[data-cr-go]'); await p.waitForSelector('.cr-c4');
  ok('conecta4: tablero de 7 × 6', (await p.$$('.cr-c4 button')).length === 42);
  await p.click('.cr-c4 button[data-cr-c="3"]'); await sleep(250);
  ok('conecta4: la ficha cae hasta abajo', await p.$('.cr-c4 button:nth-child(39) .pz.R'));
  await p.waitForFunction(() => document.querySelectorAll('.cr-c4 .pz.A').length >= 1, null, { timeout: 10000 }).catch(() => {});
  await p.screenshot({ path: 'clasicos-rapidos-390-conecta4.png', fullPage: true });
  let col = 0;
  const c4 = await hastaResultado(p, async () => { const bs = await p.$$('.cr-c4 button[data-cr-c="' + (col++ % 7) + '"]:not([disabled])'); if (bs.length) await bs[0].click({ timeout: 1000 }); });
  const rc = await texto(p, '.result');
  ok('conecta4: termina y guarda', c4 && /a tus individuales/.test(rc), rc.slice(0, 100));
  await p.click('[data-a="hub"]');

  // ---- Piedra, papel o tijera individual ----
  await p.click('[data-juego="ppt"]'); await p.waitForSelector('.cr-ppt-ops');
  // Clic y lectura en la misma tarea de la página (con relojes acelerados la animación dura poco).
  const [ya, agita] = await p.evaluate(() => { document.querySelector('[data-cr-ppt="papel"]').click(); return [document.querySelector('.cr-ya').textContent, document.querySelectorAll('.cr-mano.agita').length]; });
  ok('ppt: «¡Piedra, papel o tijera… ya!» con las manos agitándose', /ya!/.test(ya) && agita === 2, ya);
  await sleep(500);
  await p.screenshot({ path: 'clasicos-rapidos-390-ppt.png', fullPage: true });
  const pp = await hastaResultado(p, () => clicPrimero(p, '[data-cr-ppt="piedra"]:not([disabled])'));
  const rp = await texto(p, '.result');
  ok('ppt: al mejor de 5 y guarda', pp && /a tus individuales/.test(rp) && /(\d) a (\d) en/.test(rp) && /[3] a|a 3/.test(rp), rp.slice(0, 140));
  await p.click('[data-a="hub"]');

  // ---- Ahorcado en inglés ----
  await p.click('[data-juego="ahorcado"]'); await p.waitForSelector('.cr-teclado');
  ok('ahorcado: pista en español con emoji y globo', /Pista:/.test(await texto(p, '.cr-pista')) && !!(await p.$('svg.cr-globo')));
  await p.click('[data-cr-l="e"]'); await p.click('[data-cr-l="z"]'); await sleep(200);
  await p.screenshot({ path: 'clasicos-rapidos-390-ahorcado.png', fullPage: true });
  const orden = 'eaoitnsrlhdcumpgbyfwkvxjqz';
  const ah = await hastaResultado(p, async () => { for (const l of orden) if (await clicPrimero(p, '[data-cr-l="' + l + '"]:not([disabled])')) return; });
  const ra = await texto(p, '.result');
  ok('ahorcado: 5 palabras y guarda', ah && /de 5 palabras/.test(ra) && /a tus individuales/.test(ra), ra.slice(0, 140));
  await p.click('[data-a="hub"]');

  // ---- Serpientes y escaleras contra 1 bot ----
  await p.click('[data-juego="serpientes"]'); await p.click('[data-cr-bots="1"]'); await p.click('[data-cr-go]'); await p.waitForSelector('.cr-serp');
  ok('serpientes: tablero de 100 casillas, escaleras y serpientes', (await p.$$('.cr-serp .celdas div')).length === 100 && (await p.$$('.cr-serp svg.arte path')).length >= 20);
  await p.click('[data-cr-tirar]'); await sleep(150);
  ok('serpientes: el dado rueda', !!(await p.$('.cr-dado.rueda')));
  await sleep(600);
  await p.screenshot({ path: 'clasicos-rapidos-390-serpientes.png', fullPage: true });
  const sp = await hastaResultado(p, () => clicPrimero(p, '[data-cr-tirar]:not([disabled])'), 240000);
  const rs = await texto(p, '.result');
  ok('serpientes: alguien llega a la meta y se guarda', sp && /a tus individuales/.test(rs), rs.slice(0, 100));
  ok('sin desplazamiento horizontal a 390 px', await p.evaluate(() => document.documentElement.scrollWidth <= 390));
  await p.context().close();

  // ---- Salas con 2 personas: Gato y Conecta 4 ----
  for (const [juego, celda, titulo] of [['gato', '.cr-gato button:not([disabled])', /Ganó|Empate/], ['conecta4', '.cr-c4 button:not([disabled])', /Ganó|Empate/]]) {
    const host = await pagina(b, 'marisol@example.com', 0.4), otro = await pagina(b, 'angel@example.com', 0.4);
    await host.click('[data-tab="partidas"]'); await host.selectOption('#p-juego', juego);
    await host.uncheck('#p-bots'); await host.click('#f-crear button[type=submit]'); await host.waitForSelector('[data-p="empezar"]');
    const codigo = (await host.textContent('.letra')).trim();
    await otro.click('[data-tab="partidas"]'); await otro.fill('#p-codigo', codigo); await otro.click('#f-unirse button[type=submit]'); await otro.waitForSelector('#p-body .rank li');
    await host.waitForFunction(() => document.querySelectorAll('#p-body .rank li').length === 2, null, { timeout: 15000 }).catch(() => {});
    ok(juego + ' sala: 2 personas y mesa de 2', (await host.$$('#p-body .rank li')).length === 2 && /Mesa de 2 · 2 personas/.test(await texto(host, '#p-mesa')), await texto(host, '#p-mesa'));
    await host.click('[data-p="empezar"]');
    await host.waitForSelector(juego === 'gato' ? '.cr-gato' : '.cr-c4', { timeout: 20000 }); await otro.waitForSelector(juego === 'gato' ? '.cr-gato' : '.cr-c4', { timeout: 20000 });
    let vueltas = 0, capturado = false;
    const t0 = Date.now();
    while (Date.now() - t0 < 240000 && !((await host.$('.result')) && (await otro.$('.result')))) {
      for (const q of [host, otro]) { if (!(await q.$('.result')) && /Tu turno/.test(await texto(q, '.cr-estado'))) { await clicPrimero(q, celda).catch(() => {}); vueltas++; } }
      if (!capturado && vueltas >= 3) { capturado = true; await sleep(400); await otro.screenshot({ path: 'clasicos-rapidos-390-' + juego + '-sala.png', fullPage: true }); }
      await sleep(250);
    }
    const fh = await texto(host, '.result h1'), fo = await texto(otro, '.result h1');
    ok(juego + ' sala: mismo final en ambos', fh && fh === fo && titulo.test(fh), fh + ' / ' + fo);
    await sleep(1500);
    ok(juego + ' sala: se guarda en partidas', /partidas/.test(await texto(host, '#p-guardado')), await texto(host, '#p-guardado'));
    ok(juego + ' sala: ofrece la revancha', !!(await host.$('[data-p="revancha"]')));
    if (juego === 'conecta4') await host.screenshot({ path: 'clasicos-rapidos-390-podio.png', fullPage: true });
    await host.context().close(); await otro.context().close();
  }

  // ---- Piedra, papel o tijera con bots: mesa de 4 (una persona más, un bot menos) ----
  const host = await pagina(b, 'marisol@example.com', 0.5), otro = await pagina(b, 'angel@example.com', 0.5);
  await host.click('[data-tab="partidas"]'); await host.selectOption('#p-juego', 'ppt'); await host.check('#p-bots');
  await host.click('#f-crear button[type=submit]'); await host.waitForSelector('[data-p="empezar"]');
  const codigo = (await host.textContent('.letra')).trim();
  const mesa1 = await texto(host, '#p-mesa'), n1 = (await host.$$('#p-body .rank li')).length;
  ok('ppt mesa: 1 persona + 3 bots', n1 === 4 && /Mesa de 4 · 1 persona \+ 3 bots/.test(mesa1), mesa1);
  await otro.click('[data-tab="partidas"]'); await otro.fill('#p-codigo', codigo); await otro.click('#f-unirse button[type=submit]'); await otro.waitForSelector('#p-body .rank li');
  await host.waitForFunction(() => /2 personas/.test((document.getElementById('p-mesa') || {}).textContent || ''), null, { timeout: 15000 }).catch(() => {});
  const mesa2 = await texto(host, '#p-mesa');
  ok('ppt mesa: al entrar otra persona, un bot menos (2 personas + 2 bots)', (await host.$$('#p-body .rank li')).length === 4 && /2 personas \+ 2 bots/.test(mesa2), mesa2);
  await host.click('[data-p="empezar"]');
  await host.waitForSelector('.cr-ppt-ops', { timeout: 20000 }); await otro.waitForSelector('.cr-ppt-ops', { timeout: 20000 });
  ok('ppt sala: 4 participantes en la ronda', (await host.$$('.cr-ppt-lista li')).length === 4);
  let revelaciones = 0, oculto = null, vistaRevelada = false, manos = '';
  const t0 = Date.now();
  while (Date.now() - t0 < 180000 && !((await host.$('.result')) && (await otro.$('.result')))) {
    const hBtn = await host.$('[data-cr-ppt="piedra"]:not([disabled])');
    if (hBtn) {
      await hBtn.click().catch(() => {});
      if (oculto === null) { // Angel aún no elige: el servidor le oculta la elección de Marisol
        await sleep(400);
        oculto = await otro.evaluate(async () => { await traerSala(); const m = sala.estado.jugadores.find(j => j.nombre === 'Marisol'); return ((m && m.jugadas) || []).map(j => j.eleccion); });
      }
    }
    const oBtn = await otro.$('[data-cr-ppt="papel"]:not([disabled])'); if (oBtn) await oBtn.click().catch(() => {});
    if (!vistaRevelada && (await host.$('.cr-ppt-lista .e'))) { vistaRevelada = true; revelaciones++; manos = await host.$$eval('.cr-ppt-lista li', ls => ls.map(l => l.textContent.replace(/\s+/g, ' ').trim()).join(' | ')); await sleep(300); await host.screenshot({ path: 'clasicos-rapidos-390-ppt-sala.png', fullPage: true }); }
    await sleep(200);
  }
  ok('ppt sala: la elección ajena llega oculta ("?") hasta elegir', Array.isArray(oculto) && oculto.includes('?'), JSON.stringify(oculto));
  ok('ppt sala: revelación con la mano de cada participante', revelaciones > 0);
  const ph = await texto(host, '.result h1'), po = await texto(otro, '.result h1');
  ok('ppt sala: mismo final y podio de 4 en ambos', ph && ph === po && (await host.$$('.rank li')).length === 4, ph + ' / ' + po);
  ok('ppt sala: en la revelación Marisol muestra ✊ y Angel ✋', /Marisols*✊/.test(manos) && /Angels*✋/.test(manos), manos);
  info('podio ppt', (await texto(otro, '.rank')).slice(0, 200));
  await host.context().close(); await otro.context().close();

  // ---- Ahorcado (cooperativo) y Serpientes en sala con bots: una persona, se ve y se juega ----
  for (const juego of ['ahorcado', 'serpientes']) {
    const q = await pagina(b, 'marisol@example.com', 0.5);
    await q.click('[data-tab="partidas"]'); await q.selectOption('#p-juego', juego); await q.check('#p-bots');
    if (juego === 'ahorcado') { ok('ahorcado sala: selector de modo', !(await q.$eval('#p-cr-modo-wrap', e => e.hidden))); await q.selectOption('#p-cr-modo', 'coop'); }
    await q.click('#f-crear button[type=submit]'); await q.waitForSelector('[data-p="empezar"]');
    const mesa = await texto(q, '#p-mesa');
    ok(juego + ' sala: mesa con bots', juego === 'ahorcado' ? /Hasta 8 personas · 1 persona \+ 2 bots/.test(mesa) : /Mesa de 4 · 1 persona \+ 3 bots/.test(mesa), mesa);
    await q.click('[data-p="empezar"]');
    if (juego === 'ahorcado') {
      await q.waitForSelector('.cr-teclado', { timeout: 20000 });
      ok('ahorcado sala: modo cooperativo y pista', /Cooperativo/.test(await texto(q, '.cr-sub')) && /Pista:/.test(await texto(q, '.cr-pista')));
      await q.waitForSelector('.cr-teclado button:not([disabled])', { timeout: 20000 }).catch(() => {});
      await clicPrimero(q, '[data-cr-l="e"]:not([disabled])'); await sleep(2500);
      ok('ahorcado sala: la letra elegida queda marcada', !!(await q.$('[data-cr-l="e"][disabled]')));
    } else {
      await q.waitForSelector('.cr-serp', { timeout: 20000 });
      await q.waitForSelector('[data-cr-tirar]:not([disabled])', { timeout: 20000 }).catch(() => {});
      await clicPrimero(q, '[data-cr-tirar]:not([disabled])'); await sleep(2500);
      ok('serpientes sala: 4 fichas y el dado tirado', (await q.$$('.cr-serp .ficha')).length === 4 && /sacó/.test(await texto(q, '#cr-serp-msg')), await texto(q, '#cr-serp-msg'));
    }
    await q.screenshot({ path: 'clasicos-rapidos-390-' + juego + '-sala.png', fullPage: true });
    await q.context().close();
  }
  await b.close();
  console.log(out.join('\n')); process.exit(out.some(x => x.startsWith('FAIL')) ? 1 : 0);
})().catch(e => { console.log(out.join('\n')); console.error('ERROR', e.message.slice(0, 300)); process.exit(2); });
