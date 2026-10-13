// E2E juegos de tablero (openspec: juegos-tablero): Damas, Dominó, Parchís y Batalla naval en individual; Damas y
// Batalla naval en sala con 2 personas (la flota rival no sale del servidor); Dominó y Parchís en sala con bots, y la
// mesa del Dominó (3 personas + 1 bot; con la cuarta, sin bot). Capturas a 390 px.
require('./lib/entorno'); // BASE, API, DATOS, DATA, CHROME, carpeta de salida y sesión de prueba en fetch
const { chromium } = require('playwright');
const { abrirPagina } = require('./lib/navegador');
const { contarMenu, abrirJuego } = require('./lib/menu'); // conteo del menú (openspec: organizar-codigo)
const out = []; const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const pagina = (b, email, tiempo) => abrirPagina(b, { email, viejo: true, tiempo, out, dialogos: 'aceptar', ruta: '/juegos.html', esperar: '[data-menu]' });
const sinScroll = p => p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
const texto = (p, sel) => p.textContent(sel).then(t => (t || '').replace(/\s+/g, ' ').trim()).catch(() => '');
const M = 'marisol@example.com', A = 'angel@example.com', J = 'jesus@example.com', L = 'laura@example.com';

const iconoSala = p => p.waitForFunction(() => { const i = document.querySelector('.play-top .t img.ico-img'); return i && i.complete && i.naturalWidth > 0; }, null, { timeout: 10000 }).then(() => true, () => false); // juegos-categorias
async function crearSala(p, juego, bots = true) {
  await p.click('[data-tab="partidas"]'); await p.selectOption('#p-juego', juego);
  const caja = await p.$('#p-bots');
  if (caja && await caja.isVisible() && (await caja.isChecked()) !== bots) await caja.click();
  await p.click('#f-crear button[type=submit]'); await p.waitForSelector('[data-p="empezar"]', { timeout: 20000 });
  return (await p.textContent('.letra')).trim();
}
async function unirse(p, codigo) {
  await p.click('[data-tab="partidas"]'); await p.fill('#p-codigo', codigo); await p.click('#f-unirse button[type=submit]');
  await p.waitForSelector('#p-body .rank li', { timeout: 20000 });
}
// Repite `paso` hasta que aparezca el selector (o se acabe el tiempo).
async function hasta(p, sel, paso, ms = 120000) {
  const fin = Date.now() + ms;
  while (Date.now() < fin) { if (await p.$(sel)) return true; await paso().catch(() => {}); await sleep(60); }
  return !!(await p.$(sel));
}
const getSala = (email, codigo) => fetch(process.env.API + '/juegos/sala/' + codigo + '?email=' + encodeURIComponent(email)).then(r => r.json());

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME });

  // ---------- Inicio: tarjetas ----------
  const p = await pagina(b, M, 0.05);
  const menu = await contarMenu(p), ids = menu.ids;
  ok('inicio: todos los juegos de la página (JUEGOS.length) con Damas, Batalla naval, Dominó y Parchís', menu.completo && ['damas', 'naval', 'domino', 'parchis'].every(i => ids.includes(i)), ids.length + '');
  ok('inicio: Dominó y Parchís en Clásicos; Damas y Batalla naval en Mente ágil',
    ['domino', 'parchis'].every(i => menu.porCategoria.find(c => c.id === 'clasicos').ids.includes(i)) &&
    ['damas', 'naval'].every(i => menu.porCategoria.find(c => c.id === 'mente').ids.includes(i)));

  // ---------- Damas individual ----------
  await abrirJuego(p, 'damas'); await p.click('[data-ayuda="damas"]');
  ok('damas: ayuda con captura obligatoria, saltos y coronación', /obligatorio[\s\S]*Saltos múltiples[\s\S]*Coronación/.test(await (await p.waitForSelector('dialog.ayuda[open]')).innerText()));
  await p.keyboard.press('Escape');
  await p.click('[data-tb-opt="nivel"][data-v="2"]'); await p.click('[data-tb-go]'); await p.waitForSelector('.tb-damas');
  ok('damas: 64 casillas, 24 piezas y 4 piezas que pueden mover', (await p.$$('.tb-dc')).length === 64 && (await p.$$('.tb-pz:not(.mini)')).length === 24 && (await p.$$('.tb-dc.puede')).length === 4);
  await p.click('.tb-dc.puede'); await sleep(100);
  const destinos = (await p.$$('.tb-dest')).length;
  await p.click('.tb-dc:has(.tb-dest)');
  await p.waitForFunction(() => /Tu turno/.test(document.querySelector('.feedback').textContent) && document.querySelectorAll('.tb-dc.ult').length >= 2, null, { timeout: 15000 }).catch(() => {});
  ok('damas: muevo y el bot responde', destinos >= 1 && /Tu turno/.test(await texto(p, '.feedback')), destinos + ' destinos');
  ok('damas: cabe a 390 px', await sinScroll(p));
  await p.screenshot({ path: 'tablero-damas-390.png', fullPage: true });
  await p.click('[data-tb-rendir]');
  await p.waitForSelector('.result h1', { timeout: 20000 });
  ok('damas: rendirse guarda la partida', /Ganó Gambito por rendición/.test(await texto(p, '.result')) && /a tus individuales/.test(await texto(p, '.result')));
  await p.click('[data-a="hub"]');

  // ---------- Dominó individual (contra 3 bots) ----------
  await abrirJuego(p, 'domino'); await p.click('[data-tb-go]'); await p.waitForSelector('.tb-mano');
  ok('dominó: 7 fichas en mi mano y 3 rivales', (await p.$$('.tb-fb')).length === 7 && (await p.$$('.tb-rival')).length === 3);
  let capturaDomino = false;
  const terminoDomino = await hasta(p, '.result h1', async () => {
    const lado = await p.$('[data-tb-lado]'); if (lado) return lado.click();
    const f = await p.$('.tb-fb.jugable'); if (f) await f.click();
    if (!capturaDomino && (await p.$$('.tb-mesa .tb-ficha')).length >= 6) { capturaDomino = true; await p.screenshot({ path: 'tablero-domino-390.png', fullPage: true }); ok('dominó: mesa con fichas y sin desbordar a 390 px', await sinScroll(p)); }
  });
  ok('dominó: la partida termina con resultado', terminoDomino && /Dominó|cerrado/.test(await texto(p, '.result h1')), await texto(p, '.result h1'));
  await p.click('[data-a="hub"]');

  // ---------- Parchís individual (rápida, 1 bot) ----------
  await abrirJuego(p, 'parchis'); await p.click('[data-tb-opt="rivales"][data-v="1"]'); await p.click('[data-tb-go]'); await p.waitForSelector('.tb-parchis');
  ok('parchís: tablero con 4 fichas (2 por jugador) y dado', (await p.$$('.tb-pf')).length === 4 && !!(await p.$('.tb-dado')));
  await p.screenshot({ path: 'tablero-parchis-390.png', fullPage: true });
  ok('parchís: cabe a 390 px', await sinScroll(p));
  let movi = 0;
  const terminoParchis = await hasta(p, '.result h1', async () => { const m = await p.$('.tb-movs .btn'); if (m) { await m.click(); movi++; } }, 180000);
  ok('parchís: juego hasta la meta', terminoParchis && movi > 0 && /Ganaste|Ganó/.test(await texto(p, '.result h1')), movi + ' movimientos · ' + await texto(p, '.result h1'));
  await p.click('[data-a="hub"]');

  // ---------- Batalla naval individual ----------
  await abrirJuego(p, 'naval'); await p.click('[data-tb-go]'); await p.waitForSelector('.tb-naval');
  await p.click('[data-tb-barco="0"]'); await p.click('[data-tb-n="0"]');
  ok('naval: acomodo manual del portaaviones (5 casillas)', (await p.$$('.tb-nc.barco')).length === 5);
  await p.click('[data-tb-girar]'); await p.click('[data-tb-n="9"]');
  ok('naval: girado queda vertical (acorazado de 4)', (await p.$$('.tb-nc.barco')).length === 9 && !!(await p.$('[data-tb-n="39"].barco')));
  ok('naval: «¡Listo!» desactivado con la flota incompleta', await p.$eval('[data-tb-listo]', x => x.disabled));
  await p.click('[data-tb-auto]');
  ok('naval: acomodo automático con 17 casillas', (await p.$$('.tb-nc.barco')).length === 17);
  await p.screenshot({ path: 'tablero-naval-acomodo-390.png', fullPage: true });
  await p.click('[data-tb-listo]'); await p.waitForSelector('button.tb-nc');
  let tiros = 0, capturaNaval = false;
  const terminoNaval = await hasta(p, '.result h1', async () => {
    const c = await p.$('button.tb-nc:not(.agua):not(.toc):not(.hun)');
    if (c) { await c.click(); tiros++; }
    if (!capturaNaval && tiros >= 12) { capturaNaval = true; await p.screenshot({ path: 'tablero-naval-390.png', fullPage: true }); ok('naval: dos mares a 390 px sin desbordar', await sinScroll(p)); }
  }, 180000);
  ok('naval: la batalla termina', terminoNaval && /batalla naval|Almirante/.test(await texto(p, '.result h1')), tiros + ' disparos · ' + await texto(p, '.result h1'));
  await p.context().close();

  // ---------- Damas en sala (2 personas) ----------
  {
    const host = await pagina(b, M, 0.3), otro = await pagina(b, A, 0.3);
    const codigo = await crearSala(host, 'damas', false);
    await unirse(otro, codigo); await sleep(800);
    await host.click('[data-p="empezar"]');
    await host.waitForSelector('.tb-damas', { timeout: 20000 }); await otro.waitForSelector('.tb-damas', { timeout: 20000 });
    const primera = q => q.$eval('.tb-damas .tb-dc.os', e => e.getAttribute('aria-label'));
    ok('damas sala: tablero volteado para negras', (await primera(host)).startsWith('b8') && (await primera(otro)).startsWith('g1'), (await primera(host)) + ' / ' + (await primera(otro)));
    const mover = async q => { await q.waitForSelector('.tb-dc.puede', { timeout: 20000 }); await q.click('.tb-dc.puede'); await sleep(100); await q.click('.tb-dc:has(.tb-dest)'); await sleep(700); };
    await mover(host); await mover(otro);
    await sleep(1500);
    const piezas = q => q.$$eval('.tb-dc.os', xs => xs.map(x => x.getAttribute('aria-label').replace(', destino', '')).sort().join('|'));
    ok('damas sala: los dos ven el mismo tablero tras 2 movimientos', (await piezas(host)) === (await piezas(otro)) && (await host.$$('.tb-dc.ult')).length >= 2);
    await host.screenshot({ path: 'tablero-damas-sala-390.png', fullPage: true });
    await host.waitForSelector('[data-tb-rendir]', { timeout: 20000 }); await host.click('[data-tb-rendir]');
    await host.waitForSelector('.result h1', { timeout: 20000 }); await otro.waitForSelector('.result h1', { timeout: 20000 });
    const fh = await texto(host, '.result h1'), fo = await texto(otro, '.result h1');
    ok('damas sala: mismo final y revancha', fh === fo && /Ganó Angel por rendición/.test(fh) && !!(await otro.$('[data-p="revancha"]')), fh);
    await sleep(1500);
    ok('damas sala: se guarda en partidas', /partidas/.test(await texto(otro, '#p-guardado')));
    await host.context().close(); await otro.context().close();
  }

  // ---------- Batalla naval en sala (2 personas) ----------
  {
    const host = await pagina(b, M, 0.3), otro = await pagina(b, A, 0.3);
    await host.click('[data-tab="partidas"]'); await host.selectOption('#p-juego', 'naval');
    ok('naval sala: sin casilla de bots y con nota 1 vs 1', await host.$eval('#p-bots-wrap', x => x.hidden) && /1 vs 1/.test(await texto(host, '#p-bots-nota')));
    const codigo = await crearSala(host, 'naval');
    await unirse(otro, codigo); await sleep(800);
    await host.click('[data-p="empezar"]');
    for (const q of [host, otro]) { await q.waitForSelector('[data-tb-auto]', { timeout: 20000 }); await q.click('[data-tb-auto]'); await q.click('[data-tb-listo]'); }
    await host.waitForSelector('button.tb-nc', { timeout: 20000 });
    const gm = await getSala(M, codigo), ga = await getSala(A, codigo);
    const flotaDe = (r, email) => (r.jugadores.find(j => j.nombre === (email === M ? 'Marisol' : 'Angel')) || {}).flota;
    ok('naval sala: cada quien recibe solo su flota', Array.isArray(flotaDe(gm, M)) && flotaDe(gm, A) === undefined && Array.isArray(flotaDe(ga, A)) && flotaDe(ga, M) === undefined);
    ok('naval sala: el rival espera su turno', /Turno de Marisol/.test(await texto(otro, '.feedback')) && !(await otro.$('button.tb-nc')));
    // errores-latentes: la respuesta de un disparo llega sin `jugadas` (se reenvía al servidor y se quita el campo);
    // la página no debe tener errores JS y el tablero se sincroniza con el sondeo.
    const sinJugadas = async r => {
      if (!/disparar/.test(r.request().postData() || '')) return r.continue();
      const res = await r.fetch(); const cuerpo = await res.json(); delete cuerpo.jugadas;
      return r.fulfill({ response: res, json: cuerpo });
    };
    const errores0 = out.filter(x => x.startsWith('FAIL error JS')).length;
    const esRespuesta = u => /\/juegos\/sala\/[A-Z]{4}\/respuesta$/.test(new URL(u).pathname);
    await host.route(esRespuesta, sinJugadas);
    for (let i = 0; i < 4; i++) {
      for (const q of [host, otro]) {
        const c = await q.$('button.tb-nc:not(.agua):not(.toc):not(.hun)');
        if (c) { await c.click(); await sleep(900); }
      }
      if (i === 0) {
        await host.unroute(esRespuesta);
        await sleep(1500);
        ok('naval sala: un disparo sin «jugadas» en la respuesta no da error JS y el tablero sigue',
          out.filter(x => x.startsWith('FAIL error JS')).length === errores0 && !!(await host.$('.tb-naval .tb-nc.agua, .tb-naval .tb-nc.toc, .tb-naval .tb-nc.hun')));
      }
    }
    const marcas = await host.$$('.tb-naval:not(.chico) .tb-nc.agua, .tb-naval:not(.chico) .tb-nc.toc, .tb-naval:not(.chico) .tb-nc.hun');
    ok('naval sala: los disparos muestran agua o tocado', marcas.length >= 1, marcas.length + ' marcas');
    ok('naval sala: el resultado lo pone el servidor', (await getSala(M, codigo)).jugadores.some(j => (j.jugadas || []).some(x => ['agua', 'tocado', 'hundido'].includes(x.r))));
    await host.screenshot({ path: 'tablero-naval-sala-390.png', fullPage: true });
    ok('naval sala: cabe a 390 px', await sinScroll(host));
    await otro.click('[data-tb-rendir]');
    await host.waitForSelector('.result h1', { timeout: 20000 }); await otro.waitForSelector('.result h1', { timeout: 20000 });
    const fh = await texto(host, '.result h1');
    ok('naval sala: rendirse da la victoria y el mismo final', fh === await texto(otro, '.result h1') && /Ganó Marisol por rendición/.test(fh), fh);
    await sleep(1200);
    ok('naval sala: al terminar se revelan los mares', (await host.$$('.tb-mares .tb-naval')).length === 2 && Array.isArray(flotaDe(await getSala(A, codigo), M)));
    await host.screenshot({ path: 'tablero-naval-sala-fin-390.png', fullPage: true });
    await host.context().close(); await otro.context().close();
  }

  // ---------- Dominó: mesa de 4 (3 personas + 1 bot; con la cuarta, sin bot) ----------
  {
    const ps = [await pagina(b, M, 0.05), await pagina(b, A, 0.05), await pagina(b, J, 0.05), await pagina(b, L, 0.05)];
    const codigo = await crearSala(ps[0], 'domino', true);
    await unirse(ps[1], codigo); await unirse(ps[2], codigo);
    await ps[0].waitForFunction(() => /3 personas \+ 1 bot/.test((document.getElementById('p-mesa') || {}).textContent || ''), null, { timeout: 15000 }).catch(() => {});
    ok('dominó sala: 3 personas + 1 bot', /Mesa de 4 · 3 personas \+ 1 bot/.test(await texto(ps[0], '#p-mesa')), await texto(ps[0], '#p-mesa'));
    await unirse(ps[3], codigo);
    await ps[0].waitForFunction(() => /4 personas$/.test(((document.getElementById('p-mesa') || {}).textContent || '').trim()), null, { timeout: 15000 }).catch(() => {});
    ok('dominó sala: con la cuarta persona ya no hay bot', /Mesa de 4 · 4 personas$/.test(await texto(ps[0], '#p-mesa')), await texto(ps[0], '#p-mesa'));
    await ps[0].click('[data-p="empezar"]');
    for (const q of ps) await q.waitForSelector('.tb-mano', { timeout: 20000 });
    ok('dominó sala: las 4 personas ven 7 fichas y 3 rivales', (await Promise.all(ps.map(async q => (await q.$$('.tb-fb')).length === 7 && (await q.$$('.tb-rival')).length === 3))).every(Boolean));
    for (const q of ps) await q.context().close();
  }

  // ---------- Dominó en sala con bots, hasta el podio ----------
  {
    const host = await pagina(b, M, 0.02);
    const codigo = await crearSala(host, 'domino', true);
    ok('dominó sala: el encabezado trae el ícono SVG cargado (juegos-categorias)', await iconoSala(host));
    ok('dominó sala: 1 persona + 3 bots', /1 persona \+ 3 bots/.test(await texto(host, '#p-mesa')), codigo + ' ' + await texto(host, '#p-mesa'));
    await host.click('[data-p="empezar"]');
    let foto = false;
    const fin = await hasta(host, '.result h1', async () => {
      const lado = await host.$('[data-tb-lado]'); if (lado) return lado.click();
      const f = await host.$('.tb-fb.jugable'); if (f) await f.click();
      if (!foto && (await host.$$('.tb-mesa .tb-ficha')).length >= 4) { foto = true; await host.screenshot({ path: 'tablero-domino-sala-390.png', fullPage: true }); }
    });
    ok('dominó sala: podio con 4 jugadores y 3 bots', fin && (await host.$$('.rank li')).length === 4 && (await host.$$('.rank li small')).length >= 3, await texto(host, '.result h1'));
    await sleep(1500);
    ok('dominó sala: se guarda en partidas', /partidas/.test(await texto(host, '#p-guardado')));
    await host.context().close();
  }

  // ---------- Parchís en sala: 2 personas + 2 bots ----------
  {
    const host = await pagina(b, M, 0.02), otro = await pagina(b, A, 0.02);
    const codigo = await crearSala(host, 'parchis', true);
    await unirse(otro, codigo);
    await host.waitForFunction(() => /2 personas \+ 2 bots/.test((document.getElementById('p-mesa') || {}).textContent || ''), null, { timeout: 15000 }).catch(() => {});
    ok('parchís sala: 2 personas + 2 bots', /2 personas \+ 2 bots/.test(await texto(host, '#p-mesa')), await texto(host, '#p-mesa'));
    await host.click('[data-p="empezar"]');
    await host.waitForSelector('.tb-parchis', { timeout: 20000 }); await otro.waitForSelector('.tb-parchis', { timeout: 20000 });
    ok('parchís sala: 16 fichas en el tablero', (await host.$$('.tb-pf')).length === 16);
    let foto = false;
    const jugar = async q => { const m = await q.$('.tb-movs .btn'); if (m) await m.click(); };
    const fin = await hasta(host, '.result h1', async () => {
      await jugar(host); await jugar(otro);
      if (!foto && (await host.$$('.tb-movs .btn')).length) { foto = true; await host.screenshot({ path: 'tablero-parchis-sala-390.png', fullPage: true }); }
    }, 240000);
    await otro.waitForSelector('.result h1', { timeout: 30000 }).catch(() => {});
    const fh = await texto(host, '.result h1');
    ok('parchís sala: los dos llegan al mismo podio', fin && fh === await texto(otro, '.result h1') && /Ganó/.test(fh) && (await host.$$('.rank li')).length === 4, fh);
    await host.screenshot({ path: 'tablero-parchis-sala-fin-390.png', fullPage: true });
    await host.context().close(); await otro.context().close();
  }

  await b.close();
  console.log(out.join('\n')); process.exit(out.some(x => x.startsWith('FAIL')) ? 1 : 0);
})().catch(e => { console.log(out.join('\n')); console.error('ERROR', e.message.slice(0, 300)); process.exit(2); });
