// E2E de los clásicos: Basta (es/en), ¡Una! y Lotería. Relojes acelerados; guarda partidas en el servidor local.
require('./lib/entorno'); // BASE, API, DATOS, DATA, CHROME, carpeta de salida y sesión de prueba en fetch
const { chromium } = require('playwright');
const fs = require('fs');
const BASE = process.env.BASE;
const Q = '?api=' + encodeURIComponent(process.env.API);
const basta = JSON.parse(fs.readFileSync(process.env.DATOS + '/basta.json', 'utf8'));
const out = []; const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`); const info = (n, x = '') => out.push(`INFO ${n} ${x}`);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const norm = s => String(s).trim().toLowerCase().replace(/ñ/g, '\u0001').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\u0001/g, 'ñ');

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(() => { window.__TIEMPO_JUEGOS = 0.08; (localStorage.setItem('stald_email', 'marisol@example.com'), localStorage.setItem('stald_sesion_prueba', JSON.stringify({ email: 'marisol@example.com', token: 'prueba:' + 'marisol@example.com' }))); });
  const p = await ctx.newPage();
  p.on('dialog', d => d.accept()); p.on('pageerror', e => out.push('FAIL error JS: ' + e.message));
  await p.goto(BASE + '/juegos.html' + Q); await p.waitForSelector('[data-juego]', { timeout: 60000 });
  ok('hub: categoría Clásicos con 7 juegos (con Póker, Brisca y Conquián)', (await p.$$('.cat-clasicos[data-juego]')).length === 7 && (await p.$$('[data-juego]')).length === 21);

  // Basta (es): verificada, desconocida y con otra letra
  await p.click('[data-juego="basta-es"]'); await p.waitForSelector('#basta-form');
  const letra = (await p.textContent('.letra')).trim();
  const L = norm(letra);
  const deCat = cat => basta.es.palabras[cat].find(w => norm(w).startsWith(L));
  await p.fill('#b-nombre', deCat('nombre'));
  await p.fill('#b-animal', letra + 'qwzx');
  await p.fill('#b-fruta', (L === 'z' ? 'manzana' : 'zzz' + 'uva'));
  await p.fill('#b-color', deCat('color').toUpperCase());
  await p.click('#basta-form button[type=submit]');
  await p.waitForSelector('.result .score', { timeout: 30000 });
  const res = (await p.textContent('.result')).replace(/\s+/g, ' ');
  ok('basta: verificada (100), desconocida (50) y otra letra (0)', res.includes('verificada') && res.includes('no la conozco') && res.includes('no empieza con'), res.slice(0, 200));
  ok('basta: mayúsculas/acentos cuentan como verificada', (res.match(/verificada/g) || []).length >= 2);
  ok('basta: guarda en la semana', res.includes('a tus individuales'));
  await p.click('[data-a="hub"]');

  // Basta (en): todo verificado → bono
  await p.click('[data-juego="basta-en"]'); await p.waitForSelector('#basta-form');
  const le = norm((await p.textContent('.letra')).trim());
  for (const c of basta.en.categorias) await p.fill('#b-' + c.id, basta.en.palabras[c.id].find(w => norm(w).startsWith(le)));
  await p.click('#basta-form button[type=submit]'); await p.waitForSelector('.result .score');
  const re = (await p.textContent('.result')).replace(/\s+/g, ' ');
  ok('basta en inglés: 6 verificadas y bono', (re.match(/verificada/g) || []).length === 6 && re.includes('Bono'), re.slice(0, 120));
  await p.click('[data-a="hub"]');

  // ¡Una! contra 1 bot, en inglés
  await p.click('[data-juego="una"]'); await p.waitForSelector('[data-una-bots]');
  await p.click('[data-una-bots="1"]'); await p.click('[data-una-lang="en"]'); await p.click('[data-una-go]');
  await p.waitForSelector('.una-mano');
  let invalidaProbada = false, castigoVisto = false, dejarPasarUna = true, gritos = 0;
  const t0 = Date.now();
  while (!(await p.$('.result .score')) && Date.now() - t0 < 150000) {
    try {
      const grito = await p.$('[data-una="una"]:not([disabled])');
      if (grito) {
        if (dejarPasarUna) { dejarPasarUna = false; const antes = (await p.$$('.una-btn')).length; await sleep(260); const despues = (await p.$$('.una-btn')).length; castigoVisto = antes === 1 && despues >= 3; info('una: cartas antes/después de no gritar', antes + ' → ' + despues); continue; }
        await grito.click(); gritos++; await sleep(300); continue;
      }
      if (!invalidaProbada) {
        const mala = await p.$('.una-btn[data-no]');
        const mesa = await p.$('.una-mazo:not([disabled])');
        if (mala && mesa) { await mala.click(); const msg = await p.textContent('#una-msg'); ok('una: jugada inválida rechazada', /Match|Debe ser|Play the card/.test(msg), msg); invalidaProbada = true; }
      }
      const color = await p.$('[data-una-color]');
      if (color) { await color.click(); await sleep(100); continue; }
      const jugable = await p.$('.una-btn:not([data-no])');
      if (jugable) { await jugable.click(); await sleep(120); continue; }
      const pasar = await p.$('[data-una="pasar"]');
      if (pasar) { await pasar.click(); continue; }
      const robar = await p.$('[data-una="robar"]:not([disabled])');
      if (robar) { await robar.click(); await sleep(120); continue; }
    } catch (e) { /* redibujado */ }
    await sleep(120);
  }
  await p.waitForSelector('.result .score', { timeout: 10000 }).catch(() => {});
  const ru = (await p.textContent('.result').catch(() => '')).replace(/\s+/g, ' ');
  ok('una: la partida termina y guarda', ru.includes('a tus individuales'), ru.slice(0, 120));
  if (dejarPasarUna) info('una: nunca quedó con una carta (castigo no observado)');
  else ok('una: castigo por no decir «¡Una!»', castigoVisto);
  info('una: veces que gritó «¡Una!»', String(gritos));
  await p.click('[data-a="hub"]').catch(() => {});

  // Lotería (línea, bilingüe)
  await p.click('[data-juego="loteria"]'); await p.waitForSelector('[data-lot-go]');
  await p.click('[data-lot-go]'); await p.waitForSelector('.lot-cell');
  // Marca inválida: una casilla cuya carta no ha salido
  const salida = await p.textContent('#lot-carta');
  const celdas = await p.$$eval('.lot-cell', cs => cs.map(c => c.querySelector('.nm').textContent));
  const noSalida = celdas.findIndex(n => !salida.includes(n));
  await p.click(`[data-lot="${noSalida}"]`);
  ok('lotería: no marca una carta que no ha salido', (await p.textContent('#lot-msg')).includes('todavía no sale') && !(await p.$(`[data-lot="${noSalida}"].marcada`)));
  await p.click('[data-lot-grito]');
  ok('lotería: grito falso avisa y sigue', (await p.textContent('#lot-msg')).includes('Aún no tienes'));
  const t1 = Date.now();
  while (!(await p.$('.result .score')) && Date.now() - t1 < 90000) {
    try { for (const c of await p.$$('.lot-cell:not(.marcada)')) await c.click(); const g = await p.$('[data-lot-grito]'); if (g) await g.click(); } catch (e) { /* redibujado */ }
    await sleep(150);
  }
  await p.waitForSelector('.result .score', { timeout: 10000 }).catch(() => {});
  const rl = (await p.textContent('.result').catch(() => '')).replace(/\s+/g, ' ');
  ok('lotería: termina (lotería o bot) y guarda', rl.includes('de la semana') && /LOTERÍA|Lotería de/.test(rl), rl.slice(0, 120));
  await p.screenshot({ path: 'loteria-fin.png' });
  await b.close();
  console.log(out.join('\n')); process.exit(out.some(x => x.startsWith('FAIL')) ? 1 : 0);
})().catch(e => { console.log(out.join('\n')); console.error('ERROR', e.message.slice(0, 400)); process.exit(2); });
