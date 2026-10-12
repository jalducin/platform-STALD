// E2E: Basta en partida por rondas (openspec: basta-rondas). Dos navegadores + bots, 5 rondas aceleradas;
// una partida de 10 rondas por defecto y otra con 2 categorías divertidas y su revancha (basta-divertida-una-robo).
require('./lib/entorno'); // BASE, API, DATOS, DATA, CHROME, carpeta de salida y sesión de prueba en fetch
const { chromium } = require('playwright');
const fs = require('fs');
const { abrirPagina } = require('./lib/navegador');
const basta = JSON.parse(fs.readFileSync(process.env.DATOS + '/basta.json', 'utf8'));
const out = []; const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const norm = s => String(s).trim().toLowerCase().replace(/ñ/g, '\u0001').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\u0001/g, 'ñ');
async function jugador(b, email, tiempo = 0.4) {
  const p = await abrirPagina(b, { email, viejo: true, tiempo, out, ruta: '/juegos.html', esperar: '[data-menu]' });
  await p.click('[data-tab="partidas"]'); await p.waitForSelector('#f-crear'); return p;
}
const podio = p => p.$$eval('.rank li', ls => ls.map(l => l.querySelector('.n').childNodes[0].textContent.trim() + '=' + l.querySelector('.pts').textContent.trim()));
const tabla = p => p.$$eval('.basta-res tbody tr', trs => trs.map(t => [...t.children].map(c => c.textContent.trim())));
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME });
  const host = await jugador(b, 'marisol@example.com'), otro = await jugador(b, 'angel@example.com');
  await host.selectOption('#p-juego', 'basta-es');
  ok('selector de rondas visible con 10 por defecto', !(await host.$eval('#p-rondas-wrap', x => x.hidden)) && (await host.$eval('#p-rondas', x => x.value)) === '10');
  await host.selectOption('#p-rondas', '5'); await host.click('#f-crear button[type=submit]'); await host.waitForSelector('[data-p="empezar"]');
  const codigo = (await host.textContent('.letra')).trim();
  await otro.fill('#p-codigo', codigo); await otro.click('#f-unirse button[type=submit]'); await otro.waitForSelector('#p-body .rank li');
  await sleep(2600); await host.click('[data-p="empezar"]');
  const letras = { h: [], o: [] }; const acumH = [], acumO = []; let bastaVisto = false;
  for (let r = 0; r < 5; r++) {
    await host.waitForFunction(r => (document.querySelector('#pb-form') && sala.vista === 'basta' + r), r, { timeout: 30000 });
    await otro.waitForFunction(r => (document.querySelector('#pb-form') && sala.vista === 'basta' + r), r, { timeout: 30000 });
    const lh = (await host.textContent('.letra')).trim(), lo = (await otro.textContent('.letra')).trim();
    letras.h.push(lh); letras.o.push(lo);
    const ronda = await host.textContent('.q-card .sub');
    if (r === 0) ok('cabecera "Ronda 1 de 5"', ronda.includes('Ronda 1 de 5'), ronda);
    const L = norm(lh);
    for (const c of basta.es.categorias) {
      const ws = basta.es.palabras[c.id].filter(w => norm(w).startsWith(L));
      await host.fill('#pb-' + c.id, ws[0] || '');
      await otro.fill('#pb-' + c.id, c.id === 'nombre' ? (ws[0] || '') : (ws[ws.length - 1] || ''));
    }
    if (r === 1) { // el otro grita ¡Basta! y la ronda cierra para ambos
      const listo = !(await otro.$eval('#pb-basta', x => x.disabled));
      if (listo) {
        await otro.click('#pb-basta');
        await host.waitForFunction(() => /gritó BASTA/.test((document.getElementById('pb-aviso') || {}).textContent || '') || !document.querySelector('#pb-form'), null, { timeout: 10000 }).catch(() => {});
        bastaVisto = true;
      }
    }
    // Resultados de la ronda (pausa)
    const dump = p => p.evaluate(() => ({ vista: sala.vista, ahora: ahoraServidor(), cal: calendarioBasta().slice(0, 3), rb: sala.estado.jugadores.map(j => Object.fromEntries(Object.entries(j.rondasBasta || {}).map(([k, v]) => [k, v.basta || 0]))), env: sala.bastaEnviado, html: document.getElementById('p-body').textContent.slice(0, 120) }));
    if (r === 4) break; // tras la última ronda va directo al podio
    try { await host.waitForSelector('#pb-sig', { timeout: 30000 }); await otro.waitForSelector('#pb-sig', { timeout: 30000 }); }
    catch (e) { console.log('HOST', JSON.stringify(await dump(host))); console.log('OTRO', JSON.stringify(await dump(otro))); throw e; }
    await sleep(200);
    acumH.push(await podio(host)); acumO.push(await podio(otro));
    if (r === 0) {
      const fila = (await tabla(host)).find(x => x[0].includes('Nombre'));
      ok('resultados de la ronda 1: nombre repetido vale 50', fila && (fila[3] === '50' || fila[1] === '—'), JSON.stringify(fila));
      await host.screenshot({ path: 'basta-ronda.png', fullPage: true });
    }
  }
  ok('5 letras distintas', new Set(letras.h).size === 5, letras.h.join(''));
  ok('mismas letras en ambos navegadores', letras.h.join('') === letras.o.join(''), letras.o.join(''));
  ok('¡Basta! adelantó la ronda 2 para ambos', bastaVisto);
  ok('marcador acumulado igual en ambos tras cada ronda', JSON.stringify(acumH) === JSON.stringify(acumO), JSON.stringify(acumH[3]));
  await host.waitForSelector('.result', { timeout: 30000 }); await otro.waitForSelector('.result', { timeout: 30000 }); await sleep(800);
  const ph = await podio(host), po = await podio(otro);
  ok('podio final idéntico (4 participantes)', JSON.stringify(ph) === JSON.stringify(po) && ph.length === 4, ph.join(' | '));
  const th = await tabla(host);
  const suma = th.reduce((a, x) => a + Number(x[2]), 0);
  const score = Number((await host.textContent('.result .score')).replace(/[^0-9]/g, ''));
  ok('tabla de 5 rondas que suma el total', th.length === 5 && suma === score, JSON.stringify(th) + ' = ' + score);
  ok('guardado en el ranking', /puntos de partidas|No se guardó/.test(await host.textContent('#p-guardado')), await host.textContent('#p-guardado'));
  await host.screenshot({ path: 'basta-podio.png', fullPage: true });

  // Partida de 10 rondas por defecto (una persona, bots)
  const solo = await jugador(b, 'jesus@example.com', 0.05);
  await solo.selectOption('#p-juego', 'basta-en'); await solo.click('#f-crear button[type=submit]'); await solo.waitForSelector('[data-p="empezar"]');
  ok('basta-en por defecto: 10 rondas', (await solo.evaluate(() => sala.estado.sala.opciones.rondas)) === '10');
  await solo.click('[data-p="empezar"]');
  await solo.waitForSelector('.result', { timeout: 180000 }); await sleep(500);
  const t10 = await tabla(solo);
  ok('10 rondas jugadas con 10 letras distintas', t10.length === 10 && new Set(t10.map(x => x[1])).size === 10, t10.map(x => x[1]).join(''));

  // ---- Categorías divertidas (openspec: basta-divertida-una-robo): 2 en sala, se califican y la revancha las hereda ----
  const h2 = await jugador(b, 'laura@example.com', 0.15), o2 = await jugador(b, 'fernando@example.com', 0.15);
  await h2.selectOption('#p-juego', 'basta-es'); await h2.waitForSelector('[data-pextra]');
  ok('crear: 10 categorías divertidas para elegir', (await h2.$$('[data-pextra]')).length === 10);
  await h2.selectOption('#p-rondas', '5');
  await h2.check('[data-pextra="pokemon"]'); await h2.check('[data-pextra="antojito"]'); await h2.click('[data-pextra="flor"]');
  ok('crear: máximo 2 categorías divertidas', !(await h2.isChecked('[data-pextra="flor"]')) && /Máximo 2/.test(await h2.textContent('#p-extra-aviso')), await h2.textContent('#p-extra-aviso'));
  await h2.screenshot({ path: 'basta-extras-crear.png', fullPage: true });
  await h2.click('#f-crear button[type=submit]'); await h2.waitForSelector('[data-p="empezar"]');
  const cod2 = (await h2.textContent('.letra')).trim();
  ok('sala guarda las divertidas en opciones.extra', (await h2.evaluate(() => sala.estado.sala.opciones.extra)) === 'pokemon,antojito');
  await o2.fill('#p-codigo', cod2); await o2.click('#f-unirse button[type=submit]'); await o2.waitForSelector('#p-body .rank li');
  ok('sala de espera muestra las categorías divertidas', /Pokémon/.test(await o2.textContent('#p-extras')) && /Antojito mexicano/.test(await o2.textContent('#p-extras')), await o2.textContent('#p-extras'));
  await sleep(2600); await h2.click('[data-p="empezar"]');
  await h2.waitForFunction(() => document.querySelector('#pb-form') && sala.vista === 'basta0', null, { timeout: 30000 });
  await o2.waitForFunction(() => document.querySelector('#pb-form') && sala.vista === 'basta0', null, { timeout: 30000 });
  ok('ronda con 7 + 2 casillas (Pokémon y Antojito al final)', (await h2.$$('#pb-form input')).length === 9 && !!(await o2.$('#pb-pokemon')) && !!(await o2.$('#pb-antojito')));
  const L2 = norm((await h2.textContent('.letra')).trim());
  const banco = id => basta.extras.find(x => x.id === id).palabras.filter(w => norm(w).startsWith(L2));
  // Lo que escriben los bots (misma semilla): la antojito de la anfitriona debe ser distinta para que sea única.
  const deBots = await h2.evaluate(() => participantes().filter(p => p.bot).map(p => botBasta(sala.estado.sala.seed, p.bot, letrasBasta()[0], datosBasta(), 0).antojito));
  const poke = banco('pokemon')[0] || '', anto = banco('antojito').find(w => !deBots.includes(w)) || '';
  await h2.fill('#pb-pokemon', poke); await o2.fill('#pb-pokemon', poke); // repetida → 50 cada quien
  await h2.fill('#pb-antojito', anto); // única → 100; vacía → 0
  await h2.screenshot({ path: 'basta-extras-ronda.png', fullPage: true });
  await h2.waitForSelector('#pb-sig', { timeout: 30000 }); await o2.waitForSelector('#pb-sig', { timeout: 30000 }); await sleep(200);
  const tH = await tabla(h2), tO = await tabla(o2);
  const fila = (t, txt) => t.find(x => x[0].includes(txt)) || [];
  ok('Pokémon repetido vale 50 para ambos', poke ? fila(tH, 'Pokémon')[3] === '50' && fila(tO, 'Pokémon')[3] === '50' && fila(tH, 'Pokémon')[2] === 'repetida' : true, poke + ' ' + JSON.stringify(fila(tH, 'Pokémon')));
  ok('Antojito única vale 100 y vacía 0', anto ? fila(tH, 'Antojito')[3] === '100' && fila(tO, 'Antojito')[3] === '0' : fila(tH, 'Antojito')[3] === '0', anto + ' ' + JSON.stringify(fila(tH, 'Antojito')) + JSON.stringify(fila(tO, 'Antojito')));
  await o2.screenshot({ path: 'basta-extras-resultados.png', fullPage: true });
  await h2.waitForSelector('.result', { timeout: 90000 }); await o2.waitForSelector('.result', { timeout: 90000 }); await sleep(800);
  ok('podio igual en ambos con las divertidas', JSON.stringify(await podio(h2)) === JSON.stringify(await podio(o2)), (await podio(h2)).join(' | '));
  await o2.waitForSelector('[data-p="revancha"]', { timeout: 15000 }); await o2.click('[data-p="revancha"]');
  await o2.waitForFunction(c => sala.estado && sala.estado.sala.codigo !== c && !sala.estado.sala.inicio, cod2, { timeout: 30000 });
  await o2.waitForSelector('#p-extras', { timeout: 15000 }).catch(() => {});
  const rev = await o2.evaluate(() => ({ extra: sala.estado.sala.opciones.extra, rondas: sala.estado.sala.opciones.rondas, txt: (document.getElementById('p-extras') || {}).textContent || '' }));
  ok('la revancha hereda las 2 categorías divertidas', rev.extra === 'pokemon,antojito' && rev.rondas === '5' && /Pokémon/.test(rev.txt), JSON.stringify(rev));
  await o2.screenshot({ path: 'basta-extras-revancha.png', fullPage: true });
  await b.close();
  console.log(out.join('\n')); process.exit(out.some(x => x.startsWith('FAIL')) ? 1 : 0);
})().catch(e => { console.log(out.join('\n')); console.error('ERROR', e.message.slice(0, 400)); process.exit(2); });
