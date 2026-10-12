// E2E: juegos para salas grandes (openspec: juegos-salas-grandes) — Bingo con 3 personas y bots, Blackjack individual y
// en sala (mesa: cada persona que entra quita un bot), Dibuja y adivina con 3 personas, y Memorama y Sopa en sala.
// Capturas a 390 px en la carpeta de salida.
require('./lib/entorno'); // BASE, API, DATOS, carpeta de salida y sesión de prueba en fetch
const path = require('node:path');
const { chromium } = require('playwright');
const { abrirPagina } = require('./lib/navegador');
const VOCAB = require(path.join(process.env.DATOS, 'ingles.json')).vocabulario;
const out = []; const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const correo = n => n + '@example.com';
const jugador = (b, n, tiempo) => abrirPagina(b, { email: correo(n), viejo: true, tiempo, out, ruta: '/juegos.html', esperar: '[data-juego]' });
const api = async (n, ruta, body) => {
  const r = await fetch(process.env.API + ruta + (ruta.includes('?') ? '&' : '?') + 'email=' + encodeURIComponent(correo(n)), body === undefined ? {} : { method: 'POST', body: JSON.stringify(body) });
  return { status: r.status, body: await r.json() };
};
async function crear(p, juego, antes) {
  await p.click('[data-tab="partidas"]'); await p.selectOption('#p-juego', juego);
  if (antes) await antes();
  await p.click('#f-crear button[type=submit]'); await p.waitForSelector('[data-p="empezar"]');
  return (await p.textContent('.letra')).trim();
}
async function unirse(p, codigo) {
  await p.click('[data-tab="partidas"]'); await p.fill('#p-codigo', codigo); await p.click('#f-unirse button[type=submit]'); await p.waitForSelector('#p-body .rank li');
}
const podio = p => p.$$eval('.rank li', ls => ls.map(l => l.querySelector('.n').childNodes[0].textContent.trim() + '=' + l.querySelector('.pts').textContent.trim()));
async function esperarFinal(pags, ms, alPaso) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    let listos = 0;
    for (const p of pags) { if (await p.$('.result h1')) listos++; else if (alPaso) await alPaso(p).catch(() => {}); }
    if (listos === pags.length) return true;
    await sleep(250);
  }
  return false;
}
async function mismoPodio(nombre, pags, n) {
  await sleep(2500);
  const ps = await Promise.all(pags.map(podio)), hs = await Promise.all(pags.map(p => p.textContent('.result h1').catch(() => '')));
  ok(nombre + ': mismo título en todos', hs.every(h => h && h === hs[0]), hs[0]);
  ok(nombre + ': podio idéntico en todos (' + n + ')', ps.every(x => JSON.stringify(x) === JSON.stringify(ps[0])) && ps[0].length === n, ps[0].join(' | '));
  ok(nombre + ': guardado en el ranking de partidas', /puntos de partidas/.test(await pags[0].textContent('#p-guardado')));
}

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME });

  // ---------------- Inicio: tarjetas ----------------
  const marisol = await jugador(b, 'marisol', 0.1);
  for (const id of ['bingo', 'blackjack', 'dibuja']) ok('tarjeta ' + id, !!(await marisol.$('[data-juego="' + id + '"]')));
  ok('Bingo y Blackjack en Clásicos; Dibuja en Inglés', !!(await marisol.$('.cat-clasicos[data-juego="bingo"]')) && !!(await marisol.$('.cat-clasicos[data-juego="blackjack"]')) && !!(await marisol.$('.cat-ingles[data-juego="dibuja"]')));

  // ---------------- Blackjack individual ----------------
  await marisol.click('[data-juego="blackjack"]'); await marisol.click('[data-bj-go]');
  await marisol.waitForSelector('[data-bj-ficha]');
  ok('blackjack: aviso de fichas sin valor', /no tienen valor real/.test(await marisol.textContent('#m-body')));
  await marisol.click('[data-bj-ficha="20"]'); await marisol.click('[data-bj-ficha="5"]');
  ok('blackjack: la apuesta se arma con fichas (25)', (await marisol.textContent('#bj-monto')).trim() === '25');
  await marisol.screenshot({ path: 'salas-grandes-390-blackjack-apuesta.png' });
  let manos = 0;
  for (let i = 0; i < 400 && !(await marisol.$('.result .score')); i++) {
    if (await marisol.$('[data-bj="apostar"]:not([disabled])')) { await marisol.click('[data-bj="apostar"]'); manos++; }
    else if (await marisol.$('[data-bj-ficha="10"]:not([disabled])')) await marisol.click('[data-bj-ficha="10"]');
    else if (await marisol.$('[data-bj="pedir"]')) {
      const t = Number((await marisol.textContent('.bj-yo .bj-total')).split('/').pop());
      if (manos === 1) await marisol.screenshot({ path: 'salas-grandes-390-blackjack-mesa.png' });
      await marisol.click(t < 15 ? '[data-bj="pedir"]' : '[data-bj="plantarse"]');
    } else if (await marisol.$('[data-bj-sig]')) await marisol.click('[data-bj-sig]');
    await sleep(80);
  }
  ok('blackjack individual: termina y guarda', /a tus individuales/.test(await marisol.textContent('.result').catch(() => '')), manos + ' manos');
  await marisol.click('[data-a="hub"]');

  // ---------------- Blackjack en sala: mesa de 3 (1 persona + 2 bots; entra otra y queda 1 bot) ----------------
  const angel = await jugador(b, 'angel', 0.2);
  const m2 = await jugador(b, 'marisol', 0.2);
  await marisol.close();
  const cbj = await crear(m2, 'blackjack');
  const mesa1 = await m2.textContent('#p-mesa').catch(() => '');
  ok('mesa: 1 persona + 2 bots', /1 persona \+ 2 bots/.test(mesa1) && (await m2.$$('#p-body .rank li')).length === 3, mesa1);
  await unirse(angel, cbj);
  await m2.waitForFunction(() => /2 personas \+ 1 bot/.test((document.getElementById('p-mesa') || {}).textContent || ''), null, { timeout: 15000 }).catch(() => {});
  const mesa2 = await m2.textContent('#p-mesa').catch(() => '');
  ok('mesa: al entrar otra persona, un bot menos', /2 personas \+ 1 bot/.test(mesa2) && (await m2.$$('#p-body .rank li')).length === 3, mesa2);
  await m2.click('[data-p="empezar"]');
  const mala = await api('angel', '/juegos/sala/' + cbj + '/respuesta', { jugada: { n: 0, accion: 'apostar', monto: 7 } });
  ok('blackjack sala: monto que no es múltiplo de 5 → 400', mala.status === 400 && mala.body.error === 'jugada_invalida', JSON.stringify(mala.body));
  let fotoBj = false;
  const turnoBj = async p => {
    if (await p.$('[data-bj="apostar"]')) {
      if (await p.$('[data-bj="apostar"]:not([disabled])')) await p.click('[data-bj="apostar"]'); else await p.click('[data-bj-ficha="10"]');
    } else if (await p.$('[data-bj="plantarse"]')) {
      if (!fotoBj) { fotoBj = true; await p.screenshot({ path: 'salas-grandes-390-blackjack-sala.png' }); }
      await p.click('[data-bj="plantarse"]');
    }
  };
  ok('blackjack sala: termina en ambos', await esperarFinal([m2, angel], 240000, turnoBj));
  await mismoPodio('blackjack sala', [m2, angel], 3);
  await m2.screenshot({ path: 'salas-grandes-390-blackjack-podio.png', fullPage: true });

  // ---------------- Memorama en sala (2 personas + 2 bots) ----------------
  const porEs = Object.fromEntries(VOCAB.map(v => [v.es, v.en]));
  const cmemo = await crear(m2, 'en-memorama', async () => {
    ok('memorama: se elige quién gana', !!(await m2.$('#p-gana')));
    await m2.selectOption('#p-gana', 'tiempo');
  });
  await unirse(angel, cmemo);
  await m2.click('[data-p="empezar"]');
  await m2.waitForSelector('[data-msm]', { timeout: 20000 }); await angel.waitForSelector('[data-msm]', { timeout: 20000 });
  const cartas = p => p.$$eval('[data-msm]', bs => bs.map(x => x.textContent));
  const [cm, ca] = [await cartas(m2), await cartas(angel)];
  ok('memorama: mismo tablero en ambos', JSON.stringify(cm) === JSON.stringify(ca) && cm.length === 16);
  await m2.screenshot({ path: 'salas-grandes-390-memorama-sala.png' });
  await sleep(9000); // el servidor no acepta terminar en menos de 8 s
  // Lado en inglés: solo el texto; lado en español: emoji (.em) + texto.
  const resolver = async (p, errores) => {
    const cs = await p.$$eval('[data-msm]', bs => bs.map(x => ({ es: !!x.querySelector('.em'), txt: x.textContent.slice(x.querySelector('.em') ? x.querySelector('.em').textContent.length : 0) })));
    const ens = cs.map((c, i) => i).filter(i => !cs[i].es);
    const par = i => cs.findIndex(c => c.es && porEs[c.txt] === cs[i].txt);
    for (let e = 0; e < errores; e++) { const i = ens[0], mal = cs.findIndex((c, k) => c.es && k !== par(i)); await p.click('[data-msm="' + i + '"]'); await p.click('[data-msm="' + mal + '"]'); await sleep(1100); }
    for (const i of ens) { await p.click('[data-msm="' + i + '"]'); await p.click('[data-msm="' + par(i) + '"]'); await sleep(150); }
  };
  await resolver(m2, 0); await resolver(angel, 1);
  ok('memorama sala: termina en ambos', await esperarFinal([m2, angel], 60000));
  await mismoPodio('memorama sala', [m2, angel], 4);
  ok('memorama sala: tabla de tiempos y errores', /Errores/.test(await m2.textContent('#p-body')));
  await m2.screenshot({ path: 'salas-grandes-390-memorama-podio.png', fullPage: true });

  // ---------------- Sopa de letras en sala ----------------
  const csopa = await crear(m2, 'mente-sopa');
  await unirse(angel, csopa);
  await m2.click('[data-p="empezar"]');
  await m2.waitForSelector('[data-mss-r]', { timeout: 20000 }); await angel.waitForSelector('[data-mss-r]', { timeout: 20000 });
  const letras = p => p.$$eval('[data-mss-r]', bs => bs.map(x => x.textContent).join(''));
  ok('sopa: misma sopa en ambos', (await letras(m2)) === (await letras(angel)));
  // Busca cada palabra en la sopa (las mismas 4 direcciones del generador).
  const buscar = async p => {
    const g = await letras(p), N = 10;
    const pistas = await p.$$eval('.lista-sopa span', ss => ss.map(s => s.textContent));
    return pistas.map(t => {
      const es = t.replace(/^\S+\s*/u, ''); const W = (porEs[es] || '').toUpperCase();
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) for (const [dy, dx] of [[0, 1], [1, 0], [1, 1], [-1, 1]]) {
        if ([...W].every((ch, k) => { const yy = y + dy * k, xx = x + dx * k; return yy >= 0 && yy < N && xx >= 0 && xx < N && g[yy * N + xx] === ch; })) return [[y, x], [y + dy * (W.length - 1), x + dx * (W.length - 1)]];
      }
      return null;
    });
  };
  const pos = await buscar(m2);
  ok('sopa: 6 palabras localizables', pos.length === 6 && pos.every(Boolean));
  const tocar = async (p, [a, z]) => { await p.click('[data-mss-r="' + a[0] + '"][data-mss-c="' + a[1] + '"]'); await p.click('[data-mss-r="' + z[0] + '"][data-mss-c="' + z[1] + '"]'); await sleep(200); };
  for (const x of pos.slice(0, 3)) await tocar(angel, x);
  await m2.waitForFunction(() => /3\/6/.test((document.getElementById('ms-prog') || {}).textContent || ''), null, { timeout: 15000 }).catch(() => {});
  ok('sopa: se ve el avance de los demás', /3\/6/.test(await m2.textContent('#ms-prog')), (await m2.textContent('#ms-prog')).slice(0, 120));
  await m2.screenshot({ path: 'salas-grandes-390-sopa-sala.png' });
  await sleep(4000);
  for (const x of pos) await tocar(m2, x);
  for (const x of pos.slice(3)) await tocar(angel, x);
  ok('sopa sala: termina en ambos', await esperarFinal([m2, angel], 60000));
  await mismoPodio('sopa sala', [m2, angel], 4);
  await m2.screenshot({ path: 'salas-grandes-390-sopa-podio.png', fullPage: true });
  await angel.close(); await m2.close();

  // ---------------- Bingo con 3 personas y bots (canto real: 4.5 s) ----------------
  const [bm, ba, bl] = [await jugador(b, 'marisol', 1), await jugador(b, 'angel', 1), await jugador(b, 'laura', 1)];
  const cbingo = await crear(bm, 'bingo', async () => {
    ok('bingo: se elige la figura', !!(await bm.$('#p-figura')));
    await bm.selectOption('#p-figura', 'linea');
  });
  await unirse(ba, cbingo); await unirse(bl, cbingo);
  await bm.click('[data-p="empezar"]');
  for (const p of [bm, ba, bl]) await p.waitForSelector('.bg-cell', { timeout: 20000 });
  await bm.waitForFunction(() => Number((document.getElementById('bg-n') || {}).textContent) >= 2, null, { timeout: 20000 });
  const falso = await api('laura', '/juegos/sala/' + cbingo + '/respuesta', { bingo: true });
  ok('bingo: un bingo falso lo rechaza el servidor (409)', falso.status === 409 && falso.body.error === 'bingo_falso', JSON.stringify(falso.body));
  await bl.click('[data-bg-grito]');
  await bl.waitForFunction(() => /Todavía no hay bingo/.test(document.getElementById('bg-msg').textContent), null, { timeout: 10000 }).catch(() => {});
  ok('bingo: la página avisa del bingo falso', /Todavía no hay bingo/.test(await bl.textContent('#bg-msg')));
  const ns = await Promise.all([bm, ba, bl].map(p => p.textContent('#bg-n'))), bolas = await Promise.all([bm, ba, bl].map(p => p.textContent('#bg-bola')));
  ok('bingo: mismo número cantado en los tres', new Set(ns).size === 1 || Math.max(...ns.map(Number)) - Math.min(...ns.map(Number)) <= 1, ns.join(',') + ' ' + bolas.join(','));
  const cartones = await Promise.all([bm, ba, bl].map(p => p.$$eval('.bg-cell', cs => cs.map(c => c.textContent).join(','))));
  ok('bingo: cartones distintos', new Set(cartones).size === 3);
  await bm.screenshot({ path: 'salas-grandes-390-bingo.png' });
  // Marca lo que ya salió (lo que no, tiembla) y grita cuando la línea está marcada.
  const LINEAS = [...Array(5).keys()].map(f => [0, 1, 2, 3, 4].map(c => f * 5 + c)).concat([...Array(5).keys()].map(c => [0, 1, 2, 3, 4].map(f => f * 5 + c)), [[0, 6, 12, 18, 24], [4, 8, 12, 16, 20]]);
  const jugarBingo = async p => {
    for (const c of await p.$$('.bg-cell:not(.marcada)')) await c.click();
    const marcas = await p.$$eval('.bg-cell', cs => cs.map(c => c.classList.contains('marcada')));
    if (LINEAS.some(l => l.every(i => marcas[i]))) await p.click('[data-bg-grito]');
  };
  ok('bingo: termina en los tres', await esperarFinal([bm, ba, bl], 420000, jugarBingo));
  const tit = await bm.textContent('.result h1').catch(() => '');
  ok('bingo: hay ganador con figura', /Bingo de .+ números/.test(tit), tit);
  await mismoPodio('bingo', [bm, ba, bl], 5);
  await bm.screenshot({ path: 'salas-grandes-390-bingo-podio.png', fullPage: true });
  await ba.close(); await bl.close(); await bm.close();

  // ---------------- Dibuja y adivina con 3 personas ----------------
  const [dm, da, dl] = [await jugador(b, 'marisol', 1), await jugador(b, 'angel', 1), await jugador(b, 'laura', 1)];
  const cdib = await crear(dm, 'dibuja', async () => {
    ok('dibuja: sin casilla de bots y con aviso', await dm.$eval('#p-bots-wrap', e => e.hidden) && /3 a 12/.test(await dm.textContent('#p-bots-nota')));
  });
  await unirse(da, cdib);
  const pocos = await api('marisol', '/juegos/sala/' + cdib + '/empezar', {});
  ok('dibuja: con 2 personas no empieza', pocos.status === 409 && pocos.body.error === 'faltan_jugadores');
  await unirse(dl, cdib);
  await dm.click('[data-p="empezar"]');
  const pags = { marisol: dm, angel: da, laura: dl };
  const orden = ['marisol', 'angel', 'laura'];
  for (let turno = 0; turno < 3; turno++) {
    const quien = orden[turno], dibuja = pags[quien], otros = orden.filter(x => x !== quien);
    await dibuja.waitForSelector('#dj-palabra', { timeout: 40000 });
    const palabra = await dibuja.getAttribute('#dj-palabra', 'data-palabra');
    const g = await api(otros[0], '/juegos/sala/' + cdib);
    ok('dibuja t' + turno + ': quien adivina no recibe la palabra', g.body.dibuja && g.body.dibuja.turno === turno && g.body.dibuja.palabra === undefined && !JSON.stringify(g.body).includes('"' + palabra + '"'), palabra);
    await pags[otros[0]].waitForSelector('#dj-form', { timeout: 15000 });
    ok('dibuja t' + turno + ': la palabra no está en la página de quien adivina', !(await pags[otros[0]].textContent('#p-body')).toLowerCase().includes(palabra));
    // Dibuja una figura con el mouse.
    const caja = await dibuja.$eval('#dj-lienzo', c => { const r = c.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width }; });
    await dibuja.mouse.move(caja.x + caja.w * .2, caja.y + caja.w * .2); await dibuja.mouse.down();
    for (let k = 1; k <= 20; k++) await dibuja.mouse.move(caja.x + caja.w * (.2 + .6 * k / 20), caja.y + caja.w * (.2 + .5 * Math.sin(k / 3)), { steps: 2 });
    await dibuja.mouse.up();
    await dibuja.click('[data-dj-color="1"]');
    await dibuja.mouse.move(caja.x + caja.w * .5, caja.y + caja.w * .8); await dibuja.mouse.down(); await dibuja.mouse.move(caja.x + caja.w * .8, caja.y + caja.w * .3, { steps: 8 }); await dibuja.mouse.up();
    let trazos = 0;
    for (let i = 0; i < 40 && trazos < 2; i++) { await sleep(300); const s = await api(otros[0], '/juegos/sala/' + cdib); trazos = ((s.body.jugadores.find(j => j.nombre.toLowerCase() === quien) || {}).dibujo || { trazos: [] }).trazos.length; }
    ok('dibuja t' + turno + ': el trazo llega simplificado a los demás', trazos >= 2, trazos + ' trazos');
    if (turno === 0) {
      await sleep(3000);
      await dibuja.screenshot({ path: 'salas-grandes-390-dibuja-dibujando.png' });
      await pags[otros[0]].screenshot({ path: 'salas-grandes-390-dibuja-adivinando.png' });
      const pinto = await pags[otros[0]].$eval('#dj-lienzo', c => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] < 200) n++; return n; });
      ok('dibuja: el lienzo de quien adivina muestra el dibujo', pinto > 200, pinto + ' pixeles');
    }
    const p1 = pags[otros[0]];
    await p1.fill('#dj-texto', 'zzz'); await p1.press('#dj-texto', 'Enter');
    await p1.waitForFunction(() => /No es/.test(document.getElementById('dj-msg').textContent), null, { timeout: 8000 }).catch(() => {});
    if (turno === 0) ok('dibuja: respuesta equivocada', /No es/.test(await p1.textContent('#dj-msg')));
    await sleep(900);
    for (const o of otros) { await pags[o].fill('#dj-texto', palabra.toUpperCase()); await pags[o].press('#dj-texto', 'Enter'); }
    await p1.waitForFunction(() => /Correcto|Adivinaste/.test(document.getElementById('dj-msg').textContent), null, { timeout: 8000 }).catch(() => {});
    ok('dibuja t' + turno + ': adivina y suma puntos', /Correcto|Adivinaste/.test(await p1.textContent('#dj-msg')));
    await pags[otros[1]].waitForSelector('#dj-revelada', { timeout: 20000 }).catch(() => {});
    ok('dibuja t' + turno + ': todos adivinaron, se revela la palabra', (await pags[otros[1]].textContent('#p-body').catch(() => '')).includes(palabra), palabra);
    if (turno === 0) await pags[otros[1]].screenshot({ path: 'salas-grandes-390-dibuja-revelada.png' });
  }
  ok('dibuja: termina en los tres', await esperarFinal([dm, da, dl], 30000));
  await mismoPodio('dibuja', [dm, da, dl], 3);
  await dm.screenshot({ path: 'salas-grandes-390-dibuja-podio.png', fullPage: true });

  // ---------------- Práctica individual de Dibuja y Bingo individual (vistazo) ----------------
  await dm.click('.result ~ .row-btns [data-a="hub"], #p-body [data-a="hub"]');
  await dm.click('[data-tab="juegos"]'); // el inicio recuerda la pestaña de Partidas
  await dm.click('[data-juego="dibuja"]'); await dm.click('[data-dj-practica]');
  await dm.waitForSelector('#dj-ptexto');
  await sleep(1500);
  await dm.screenshot({ path: 'salas-grandes-390-dibuja-practica.png' });
  ok('dibuja práctica: el lienzo se aclara', await dm.$eval('#dj-lienzo', c => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; for (let i = 0; i < d.length; i += 4) if (d[i] < 240 || d[i + 1] < 240 || d[i + 2] < 240) return true; return false; }));
  await dm.click('[data-a="salir"]');
  await dm.click('[data-juego="bingo"]'); await dm.click('[data-bg-go]');
  await dm.waitForSelector('.bg-cell');
  await sleep(1200);
  ok('bingo individual: cartón de 25 con la libre al centro', (await dm.$$('.bg-cell')).length === 25 && (await dm.textContent('.bg-cell.libre')).includes('⭐'));
  await dm.screenshot({ path: 'salas-grandes-390-bingo-individual.png' });

  await b.close();
  console.log(out.join('\n')); process.exit(out.some(x => x.startsWith('FAIL')) ? 1 : 0);
})().catch(e => { console.log(out.join('\n')); console.error('ERROR', e.message.slice(0, 300)); process.exit(2); });
