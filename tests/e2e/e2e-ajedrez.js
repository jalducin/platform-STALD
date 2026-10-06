// E2E ajedrez (openspec: ajedrez): individual contra el bot y 1 vs 1 con dos navegadores (mate del tonto).
require('./lib/entorno'); // BASE, API, DATOS, DATA, CHROME, carpeta de salida y sesión de prueba en fetch
const { chromium } = require('playwright');
const { abrirPagina } = require('./lib/navegador');
const out = []; const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const sq = s => (8 - Number(s[1])) * 16 + 'abcdefgh'.indexOf(s[0]);
const pagina = (b, email, tiempo) => abrirPagina(b, { email, viejo: true, tiempo, viewport: { width: 390, height: 900 }, out, dialogos: 'aceptar', ruta: '/juegos.html', esperar: '[data-juego]' });
const mover = async (p, de, a) => { await p.click('[data-aj="' + sq(de) + '"]'); await sleep(120); await p.click('[data-aj="' + sq(a) + '"]'); };

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME });
  // ---- Individual ----
  const p = await pagina(b, 'marisol@example.com', 0.3);
  await p.click('[data-juego="ajedrez"]'); await p.click('[data-ayuda="ajedrez"]');
  ok('ayuda: piezas, enroque, captura al paso y mate', /Caballo[\s\S]*Enroque[\s\S]*Captura al paso[\s\S]*Jaque mate/.test(await (await p.waitForSelector('dialog.ayuda[open]')).innerText()));
  await p.keyboard.press('Escape');
  await p.click('[data-aj-nivel="1"]'); await p.click('[data-aj-go]'); await p.waitForSelector('.aj-tablero');
  ok('tablero 8×8 con 32 piezas', (await p.$$('.aj-c')).length === 64 && (await p.$$('.aj-c .aj-p')).length === 32);
  await p.click('[data-aj="' + sq('e2') + '"]'); await sleep(150);
  ok('al tocar el peón de e2 se marcan 2 destinos', (await p.$$('.aj-c .dest')).length === 2);
  await p.click('[data-aj="' + sq('e4') + '"]');
  await p.waitForFunction(() => /2\./.test((document.querySelector('.aj-jugadas') || {}).textContent || '') || ((document.querySelector('.aj-jugadas') || {}).textContent || '').trim().split(/\s+/).length >= 3, null, { timeout: 15000 }).catch(() => {});
  const lista = await p.textContent('.aj-jugadas').catch(() => '');
  ok('jugué e4 y el bot respondió', /1\.\s*e4\s+\S+/.test(lista), lista.trim());
  await p.click('[data-aj="' + sq('e1') + '"]'); await sleep(150);
  ok('tras e4 el rey de e1 solo puede ir a e2 (1 destino)', (await p.$$('.aj-c .dest')).length === 1);
  await p.screenshot({ path: 'ajedrez-individual.png', fullPage: true });
  await p.click('[data-aj-rendir]');
  await p.waitForSelector('.result h1', { timeout: 20000 });
  const r = await p.textContent('.result');
  ok('rendirse: gana Gambito y guarda', /Ganó Gambito por rendición/.test(r) && /a tus individuales/.test(r), r.replace(/\s+/g, ' ').slice(0, 120));
  await p.context().close();

  // ---- 1 vs 1: mate del tonto ----
  const host = await pagina(b, 'marisol@example.com', 0.3), otro = await pagina(b, 'angel@example.com', 0.3);
  await host.click('[data-tab="partidas"]'); await host.selectOption('#p-juego', 'ajedrez');
  ok('crear: reloj visible solo en ajedrez', !(await host.$eval('#p-reloj-wrap', e => e.hidden)));
  await host.selectOption('#p-reloj', '5'); // sin bots en ajedrez (ajuste del profe)
  await host.click('#f-crear button[type=submit]'); await host.waitForSelector('[data-p="empezar"]');
  const codigo = (await host.textContent('.letra')).trim();
  await otro.click('[data-tab="partidas"]'); await otro.fill('#p-codigo', codigo); await otro.click('#f-unirse button[type=submit]'); await otro.waitForSelector('#p-body .rank li');
  await sleep(1200); await host.click('[data-p="empezar"]');
  await host.waitForSelector('.aj-tablero', { timeout: 20000 }); await otro.waitForSelector('.aj-tablero', { timeout: 20000 });
  const primera = async q => q.$eval('.aj-tablero .aj-c', e => e.getAttribute('aria-label'));
  ok('tablero volteado para negras', (await primera(host)).startsWith('a8') && (await primera(otro)).startsWith('h1'), (await primera(host)) + ' / ' + (await primera(otro)));
  ok('relojes de 5:00', /5:00|4:5\d/.test(await host.textContent('#aj-reloj-0')));
  const turno = async (q, de, a) => { await q.waitForSelector('.feedback:has-text("Tu turno")', { timeout: 20000 }); await mover(q, de, a); await sleep(600); };
  await turno(host, 'f2', 'f3'); await turno(otro, 'e7', 'e5'); await turno(host, 'g2', 'g4');
  ok('negras: el alfil de f8 muestra sus 5 destinos', await (async () => { await otro.waitForSelector('.feedback:has-text("Tu turno")', { timeout: 20000 }); await otro.click('[data-aj="' + sq('f8') + '"]'); await sleep(150); const n = (await otro.$$('.aj-c .dest')).length; await otro.click('[data-aj="' + sq('f8') + '"]'); await sleep(150); return n === 5; })());
  await turno(otro, 'd8', 'h4');
  await host.waitForSelector('.result h1', { timeout: 20000 }); await otro.waitForSelector('.result h1', { timeout: 20000 });
  const fh = await host.textContent('.result h1'), fo = await otro.textContent('.result h1');
  ok('mate del tonto: mismo final en ambos', fh === fo && /Ganó Angel por jaque mate/.test(fh), fh);
  await sleep(2000);
  ok('1 vs 1: se guarda en partidas', /partidas/.test(await otro.textContent('#p-guardado').catch(() => '')));
  await otro.screenshot({ path: 'ajedrez-sala-fin.png', fullPage: true });
  await b.close();
  console.log(out.join('\n')); process.exit(out.some(x => x.startsWith('FAIL')) ? 1 : 0);
})().catch(e => { console.log(out.join('\n')); console.error('ERROR', e.message.slice(0, 300)); process.exit(2); });
