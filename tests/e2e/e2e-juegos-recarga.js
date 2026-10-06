// E2E: recargar el navegador no pierde la partida (openspec: juegos-recarga).
// (a) sala de 2 personas: recargar a mitad de la partida regresa a la misma sala, sin duplicar;
// (b) juegos individuales: Sudoku y Cálculo se reanudan con el mismo avance y cuentan una vez; Memorama avisa;
// (c) al salir de la sala (o al terminar), recargar ya no mete de nuevo.
require('./lib/entorno'); // BASE, API, DATOS, DATA, CHROME, carpeta de salida y sesión de prueba en fetch
const { chromium } = require('playwright');
const BASE = process.env.BASE;
const API = process.env.API;
const Q = '?api=' + encodeURIComponent(API);
const out = []; const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`);
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function jugador(b, email) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(e => { window.__TIEMPO_JUEGOS = 0.4; localStorage.setItem('stald_email', e); localStorage.setItem('stald_sesion_prueba', JSON.stringify({ email: e, token: 'prueba:' + e })); }, email);
  const p = await ctx.newPage(); p.on('pageerror', e => out.push('FAIL error JS (' + email + '): ' + e.message));
  await p.goto(BASE + '/juegos.html' + Q); await p.waitForSelector('[data-juego]', { timeout: 60000 });
  return p;
}
const salaApi = async (codigo, email) => (await fetch(API + '/juegos/sala/' + codigo + '?email=' + encodeURIComponent(email))).json();
const parametros = p => new URL(p.url()).searchParams;
const guardada = (p, k) => p.evaluate(k => localStorage.getItem(k), k);
const overscroll = p => p.evaluate(() => getComputedStyle(document.documentElement).overscrollBehaviorY);
// Responde lo que haya en pantalla para cada jugador (opción idx), una vez por pregunta.
async function responderVisibles(pares, hechas) {
  for (const [p, k, idx] of pares) {
    try { const btn = await p.$(`[data-po="${idx}"]`); if (btn) { const q = await btn.getAttribute('data-pq'); if (!hechas[k].has(q)) { await btn.click(); hechas[k].add(q); } } } catch (e) { /* redibujado */ }
  }
}

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME });
  const host = await jugador(b, 'marisol@example.com'), otro = await jugador(b, 'angel@example.com');

  // ---- (a) Partida de preguntas: recargar a mitad ----
  await host.click('[data-tab="partidas"]'); await host.waitForSelector('#f-crear');
  await host.selectOption('#p-juego', 'cultura'); await host.click('#f-crear button[type=submit]');
  await host.waitForSelector('[data-p="empezar"]', { timeout: 30000 });
  const codigo = (await host.textContent('.letra')).trim();
  ok('(a) al entrar, la URL lleva ?sala= y conserva ?api=', parametros(host).get('sala') === codigo && parametros(host).get('api') === API, host.url());
  await otro.click('[data-tab="partidas"]'); await otro.waitForSelector('#f-crear');
  await otro.fill('#p-codigo', codigo); await otro.click('#f-unirse button[type=submit]'); await otro.waitForSelector('.rank li', { timeout: 30000 });
  ok('(a) quien se une también tiene ?sala= en la URL', parametros(otro).get('sala') === codigo, otro.url());
  const clave = JSON.parse(await guardada(otro, 'juegos_sala_activa') || 'null');
  ok('(a) sala activa guardada con código, hora y id (sin correo)', clave && clave.codigo === codigo && clave.quien && clave.t > 0 && !JSON.stringify(clave).includes('@'), JSON.stringify(clave));
  ok('(a) sin «jalar para recargar» en la sala', (await overscroll(otro)) === 'contain', await overscroll(otro));
  await host.click('[data-p="empezar"]');
  const hechas = { h: new Set(), o: new Set() };
  const t0 = Date.now();
  while (Date.now() - t0 < 60000 && hechas.o.size < 2) { await responderVisibles([[host, 'h', 0], [otro, 'o', 1]], hechas); await sleep(120); }
  ok('(a) Angel contestó 2 preguntas antes de recargar', hechas.o.size >= 2, [...hechas.o].join(','));
  const antes = await salaApi(codigo, 'angel@example.com');
  const misAntes = Object.keys((antes.jugadores.find(j => j.nombre === 'Angel') || {}).respuestas || {});
  await otro.reload(); await otro.waitForSelector('#p-codigo-chip', { timeout: 30000 });
  ok('(a) tras recargar vuelve a la misma sala', (await otro.textContent('#p-codigo-chip')).includes(codigo) && parametros(otro).get('sala') === codigo);
  await otro.waitForSelector('#p-body .q-card, #p-body .result', { timeout: 20000 }).catch(() => {});
  ok('(a) ve la partida en curso, no la sala de espera', !(await otro.$('[data-p="empezar"]')) && !!(await otro.$('#p-body .q-card, #p-body .result')));
  const despues = await salaApi(codigo, 'angel@example.com');
  const nombres = despues.jugadores.map(j => j.nombre);
  ok('(a) la sala sigue con 2 personas (sin duplicar)', nombres.length === 2 && nombres.filter(n => n === 'Angel').length === 1, nombres.join(','));
  const misDespues = Object.keys((despues.jugadores.find(j => j.nombre === 'Angel') || {}).respuestas || {});
  ok('(a) conserva sus respuestas', misAntes.every(q => misDespues.includes(q)), misAntes.join(',') + ' → ' + misDespues.join(','));
  await otro.screenshot({ path: 'recarga-sala.png' });
  const t1 = Date.now();
  while (Date.now() - t1 < 120000 && !((await host.$('.result')) && (await otro.$('.result')))) { await responderVisibles([[host, 'h', 0], [otro, 'o', 1]], hechas); await sleep(120); }
  ok('(a) ambos terminan la partida', !!(await host.$('.result')) && !!(await otro.$('.result')));
  await sleep(2500);
  const podio = await otro.$$eval('.rank li .n', ls => ls.map(l => l.childNodes[0].textContent.trim()));
  ok('(a) podio con Angel una sola vez', podio.filter(n => n === 'Angel').length === 1 && podio.length === 4, podio.join(' | '));
  ok('(c) al terminar se limpian la URL y la sala guardada', !parametros(otro).get('sala') && (await guardada(otro, 'juegos_sala_activa')) === null, otro.url());
  await otro.reload(); await otro.waitForSelector('[data-juego]', { timeout: 30000 });
  ok('(c) recargar tras terminar no vuelve a la sala', !(await otro.$('#p-codigo-chip')));

  // ---- (c) Sala de espera: recargar, abrir sin ?sala= y salir ----
  await host.click('[data-tab="partidas"]'); await host.waitForSelector('#f-crear');
  await host.selectOption('#p-juego', 'cultura'); await host.click('#f-crear button[type=submit]'); await host.waitForSelector('[data-p="empezar"]');
  const cod2 = (await host.textContent('.letra')).trim();
  await host.reload(); await host.waitForSelector('[data-p="empezar"]', { timeout: 30000 });
  ok('(c) recargar en la sala de espera regresa a ella', (await host.textContent('.letra')).trim() === cod2);
  await host.goto(BASE + '/juegos.html' + Q); await host.waitForSelector('#p-codigo-chip, [data-juego]', { timeout: 30000 });
  ok('(c) abrir Juegos sin ?sala= reconecta con la sala guardada', ((await host.textContent('#p-codigo-chip').catch(() => '')) || '').includes(cod2) && parametros(host).get('sala') === cod2, host.url());
  ok('(c) la anfitriona no se duplica', (await salaApi(cod2, 'marisol@example.com')).jugadores.length === 1);
  await host.click('[data-a="salir"]'); await host.waitForSelector('[data-juego]');
  ok('(c) al salir se limpian la URL y la sala guardada', !parametros(host).get('sala') && parametros(host).get('api') === API && (await guardada(host, 'juegos_sala_activa')) === null, host.url());
  ok('(c) sin sala, vuelve el «jalar para recargar»', (await overscroll(host)) !== 'contain', await overscroll(host));
  await host.reload(); await host.waitForSelector('[data-juego]', { timeout: 30000 }); await sleep(800);
  ok('(c) recargar después de salir ya no entra', !(await host.$('#p-codigo-chip')));
  // Clave de una sala en la que no está (otra persona en el mismo aparato): no entra y se borra.
  await otro.evaluate(c => localStorage.setItem('juegos_sala_activa', JSON.stringify({ codigo: c, quien: 'i-otra', t: Date.now() })), cod2);
  await otro.reload(); await otro.waitForSelector('[data-juego]', { timeout: 30000 }); await sleep(800);
  ok('(c) la sala guardada de otra persona no se abre', !(await otro.$('#p-codigo-chip')));
  await otro.evaluate(c => localStorage.setItem('juegos_sala_activa', JSON.stringify({ codigo: c, quien: state.jugador.id, t: Date.now() })), cod2);
  await otro.reload(); await otro.waitForSelector('[data-juego]', { timeout: 30000 }); await sleep(800);
  ok('(c) sala guardada en la que no estaba: inicio sin error y clave borrada', !(await otro.$('#p-codigo-chip')) && !(await otro.$('.alert')) && (await guardada(otro, 'juegos_sala_activa')) === null);

  // ---- (b) Sudoku: reanudar y contar una vez ----
  const p = host;
  const partidas = []; p.on('request', r => { if (r.method() === 'POST' && r.url().includes('/juegos/partida')) partidas.push(r.url()); });
  await p.click('[data-juego="mente-sudoku"]'); await p.waitForSelector('[data-sdk-nivel]');
  ok('(b) el menú de niveles no cuenta como partida guardada', (await guardada(p, 'juegos_partida_individual')) === null);
  await p.click('[data-sdk-nivel="facil"]'); await p.click('[data-sdk-go]'); await p.waitForSelector('#sdk');
  ok('(b) sin «jalar para recargar» en el juego', (await overscroll(p)) === 'contain');
  const s1 = await p.evaluate(() => window.__sudoku);
  const vacias = s1.puzzle.map((v, i) => v ? -1 : i).filter(i => i >= 0);
  const primeras = vacias.slice(0, 6);
  for (const i of primeras) { await p.click(`[data-sdk-i="${i}"]`); await p.click(`[data-sdk-n="${s1.sol[i]}"]`); }
  const malo = vacias[6]; await p.click(`[data-sdk-i="${malo}"]`); await p.click(`[data-sdk-n="${s1.sol[malo] % 9 + 1}"]`); await sleep(900);
  const vidasAntes = await p.textContent('#m-vidas');
  await p.reload(); await p.waitForSelector('[data-a="reanudar"]', { timeout: 30000 });
  ok('(b) al recargar pregunta «¿Continuar tu partida de Sudoku?»', /Continuar tu partida de .*Sudoku/.test(await p.textContent('main')), (await p.textContent('main')).replace(/\s+/g, ' ').slice(0, 120));
  await p.screenshot({ path: 'recarga-reanudar.png' });
  await p.click('[data-a="reanudar"]'); await p.waitForSelector('#sdk');
  const s2 = await p.evaluate(() => window.__sudoku);
  const llenas = await p.$$eval('[data-sdk-i]', bs => bs.map(x => x.textContent.trim()));
  ok('(b) mismo tablero', JSON.stringify(s2.puzzle) === JSON.stringify(s1.puzzle));
  ok('(b) conserva las casillas llenas', primeras.every(i => llenas[i] === String(s1.sol[i])) && llenas[malo] === '');
  ok('(b) conserva las vidas', (await p.textContent('#m-vidas')) === vidasAntes, vidasAntes);
  for (const i of vacias.slice(6)) { await p.click(`[data-sdk-i="${i}"]`); await p.click(`[data-sdk-n="${s1.sol[i]}"]`); }
  await p.waitForSelector('.result', { timeout: 15000 }); await sleep(1500);
  ok('(b) termina el Sudoku reanudado y guarda puntos', (await p.textContent('.result h1')).includes('resuelto') && (await p.textContent('.result')).includes('de la semana'));
  ok('(b) un solo POST /juegos/partida', partidas.length === 1, String(partidas.length));
  await p.reload(); await p.waitForSelector('[data-juego]', { timeout: 30000 }); await sleep(500);
  ok('(b) tras terminar, recargar ya no ofrece continuar', !(await p.$('[data-a="reanudar"]')) && (await guardada(p, 'juegos_partida_individual')) === null);

  // ---- (b) Cálculo y secuencias: mismos puntos y tiempo ----
  const correcta = async () => {
    const q = (await p.textContent('.q-card .q')).trim();
    const m = /^(\d+) ([+−×÷]) (\d+) = \?$/.exec(q);
    const opciones = await p.$$eval('[data-opt]', bs => bs.map(x => x.textContent.replace(/^\d/, '').trim()));
    if (!m) return 0;
    const [a, op, c] = [Number(m[1]), m[2], Number(m[3])];
    const r = op === '+' ? a + c : op === '−' ? a - c : op === '×' ? a * c : a / c;
    return Math.max(0, opciones.indexOf(String(r)));
  };
  await p.click('[data-juego="mente-calculo"]'); await p.waitForSelector('[data-opt]');
  for (let k = 0; k < 3; k++) { await p.waitForSelector('[data-opt]:not(.ok):not(.bad)'); await p.click(`[data-opt="${await correcta()}"]`); await sleep(1600); }
  const ptsAntes = (await p.textContent('#m-puntos')).trim(), segAntes = Number((await p.textContent('#m-tiempo')).replace(/\D/g, ''));
  await p.reload(); await p.waitForSelector('[data-a="reanudar"]', { timeout: 30000 });
  ok('(b) Cálculo: la oferta muestra los puntos', (await p.textContent('main')).includes(ptsAntes.replace('⭐', '').trim()), ptsAntes);
  await p.click('[data-a="reanudar"]'); await p.waitForSelector('[data-opt]');
  const ptsDespues = (await p.textContent('#m-puntos')).trim(), segDespues = Number((await p.textContent('#m-tiempo')).replace(/\D/g, ''));
  ok('(b) Cálculo: mismos puntos al continuar', ptsAntes === ptsDespues && ptsAntes !== '⭐ 0', ptsAntes + ' → ' + ptsDespues);
  ok('(b) Cálculo: sigue con el tiempo que quedaba', segDespues <= segAntes + 1 && segDespues >= segAntes - 3, segAntes + ' → ' + segDespues);
  await p.click('[data-a="salir"]'); await p.waitForSelector('[data-juego]');
  await p.reload(); await p.waitForSelector('[data-juego]', { timeout: 30000 }); await sleep(500);
  ok('(b) salir con ✕ borra la partida guardada', !(await p.$('[data-a="reanudar"]')) && (await guardada(p, 'juegos_partida_individual')) === null);

  // ---- (b) Descartar ----
  await p.click('[data-juego="mente-calculo"]'); await p.waitForSelector('[data-opt]'); await p.click('[data-opt="0"]'); await sleep(1600);
  await p.reload(); await p.waitForSelector('[data-a="reanudar"]', { timeout: 30000 });
  await p.click('[data-a="hub"]'); await p.waitForSelector('[data-juego]');
  await p.reload(); await p.waitForSelector('[data-juego]', { timeout: 30000 }); await sleep(500);
  ok('(b) «No, ir a los juegos» descarta la partida guardada', !(await p.$('[data-a="reanudar"]')));

  // ---- (b) Memorama: no se reanuda, pero avisa ----
  await p.click('[data-juego="en-memorama"]'); await p.waitForSelector('[data-memo]'); await p.click('[data-memo="0"]');
  let dialogo = null;
  p.once('dialog', d => { dialogo = d.type(); d.accept().catch(() => {}); });
  await p.reload().catch(() => {}); await p.waitForSelector('[data-juego]', { timeout: 30000 });
  ok('(b) Memorama en curso: el navegador pide confirmar al recargar', dialogo === 'beforeunload', String(dialogo));
  ok('(b) Memorama no ofrece continuar', !(await p.$('[data-a="reanudar"]')));

  await b.close();
  console.log(out.join('\n')); process.exit(out.some(x => x.startsWith('FAIL')) ? 1 : 0);
})().catch(e => { console.log(out.join('\n')); console.error('ERROR', e.message.slice(0, 400)); process.exit(2); });
