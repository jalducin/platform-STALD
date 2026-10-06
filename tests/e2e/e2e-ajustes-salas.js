// E2E ajuste post-apply: ajedrez 1 vs 1 solo personas; Brisca completa a 4 con bots; niveles renombrados.
require('./lib/entorno'); // BASE, API, DATOS, DATA, CHROME, carpeta de salida y sesión de prueba en fetch
const { chromium } = require('playwright');
const { abrirPagina } = require('./lib/navegador');
const BASE = process.env.BASE, API = process.env.API;
const Q = '?api=' + encodeURIComponent(API);
const out = []; const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const pagina = (b, email) => abrirPagina(b, { email, viejo: true, tiempo: 0.3, viewport: { width: 390, height: 900 }, out, dialogos: 'registrar', ruta: '/juegos.html', esperar: '[data-juego]' });
const unirse = async (q, codigo) => { await q.click('[data-tab="partidas"]'); await q.fill('#p-codigo', codigo); await q.click('#f-unirse button[type=submit]'); };
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME });
  const host = await pagina(b, 'marisol@example.com'), otro = await pagina(b, 'angel@example.com'), tercero = await pagina(b, 'laura@example.com');
  // Niveles del individual
  await host.click('[data-juego="ajedrez"]'); await host.waitForSelector('[data-aj-nivel]');
  const niveles = await host.$$eval('[data-aj-nivel]', bs => bs.map(x => x.textContent.trim()));
  ok('niveles: Básico, Intermedio y Avanzado', niveles.join('|') === '🐣 Básico|🦊 Intermedio|🦉 Avanzado', niveles.join('|'));
  await host.click('[data-a="salir"]').catch(() => {}); await host.goto(BASE + '/juegos.html' + Q); await host.waitForSelector('[data-juego]');
  // Ajedrez en sala
  await host.click('[data-tab="partidas"]'); await host.selectOption('#p-juego', 'ajedrez');
  ok('ajedrez: casilla de bots oculta y nota 1 vs 1', await host.$eval('#p-bots-wrap', e => e.hidden) && /1 vs 1 solo entre dos personas/.test(await host.textContent('#p-bots-nota')));
  await host.click('#f-crear button[type=submit]'); await host.waitForSelector('[data-p="empezar"]');
  const codigo = (await host.textContent('.letra')).trim();
  ok('ajedrez: la sala de espera no muestra bots', !/BOT-/.test(await host.textContent('#p-body')));
  await host.click('[data-p="empezar"]'); await sleep(1500);
  ok('ajedrez: sin rival no empieza (aviso)', host.alertas.some(a => /Espera a que se una tu rival/.test(a)) && !!(await host.$('[data-p="empezar"]')), host.alertas.join(' | '));
  await unirse(otro, codigo); await otro.waitForSelector('#p-body .rank li');
  await unirse(tercero, codigo); await sleep(2000);
  ok('ajedrez: el tercero recibe sala llena', /La partida está llena/.test(await tercero.textContent('#p-msg').catch(() => '')), await tercero.textContent('#p-msg').catch(() => ''));
  await sleep(1500); await host.click('[data-p="empezar"]');
  await host.waitForSelector('.aj-tablero', { timeout: 20000 });
  const nombres = await host.$$eval('.aj-info span:first-child', xs => xs.map(x => x.textContent));
  ok('ajedrez: juegan Marisol y Angel, sin bots', nombres.join(' ').includes('Marisol') && nombres.join(' ').includes('Angel') && !/BOT/.test(nombres.join(' ')), nombres.join(' / '));
  // Brisca con 2 personas → 2 bots. Salen con ✕: navegar sin salir regresaría a la sala (openspec: juegos-recarga).
  await host.click('[data-a="salir"]'); await host.goto(BASE + '/juegos.html' + Q); await host.waitForSelector('[data-juego]');
  await otro.click('[data-a="salir"]'); await otro.goto(BASE + '/juegos.html' + Q); await otro.waitForSelector('[data-juego]');
  await host.click('[data-tab="partidas"]'); await host.selectOption('#p-juego', 'brisca');
  ok('brisca: nota de 4 en parejas', /Se juega entre 4 en parejas/.test(await host.textContent('#p-bots-nota')) && await host.$eval('#p-bots-wrap', e => e.hidden));
  await host.click('#f-crear button[type=submit]'); await host.waitForSelector('[data-p="empezar"]');
  const cb = (await host.textContent('.letra')).trim();
  await unirse(otro, cb); await otro.waitForSelector('#p-body .rank li'); await sleep(1500);
  await host.click('[data-p="empezar"]'); await host.waitForSelector('.es-mano', { timeout: 20000 });
  const asientos = await host.$$eval('.pk-asientos .pk-asiento .n', xs => xs.map(x => x.textContent.trim()));
  ok('brisca: 2 personas + 2 bots en parejas', asientos.length === 3 && asientos.filter(x => /BOT-/.test(x)).length === 2 && (await host.$$('.pk-tag.eqA, .pk-tag.eqB')).length === 4, asientos.join(' | '));
  await b.close();
  console.log(out.join('\n')); process.exit(out.some(x => x.startsWith('FAIL')) ? 1 : 0);
})().catch(e => { console.log(out.join('\n')); console.error('ERROR', e.message.slice(0, 300)); process.exit(2); });
