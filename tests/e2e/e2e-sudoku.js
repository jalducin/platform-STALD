// E2E: Sudoku por niveles (openspec: sudoku-niveles).
require('./lib/entorno'); // BASE, API, DATOS, DATA, CHROME, carpeta de salida y sesión de prueba en fetch
const { chromium } = require('playwright');
const BASE = process.env.BASE;
const Q = '?api=' + encodeURIComponent(process.env.API);
const out = []; const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`);
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(() => (localStorage.setItem('stald_email', 'marisol@example.com'), localStorage.setItem('stald_sesion_prueba', JSON.stringify({ email: 'marisol@example.com', token: 'prueba:' + 'marisol@example.com' }))));
  const p = await ctx.newPage(); p.on('pageerror', e => out.push('FAIL error JS: ' + e.message));
  await p.goto(BASE + '/juegos.html' + Q); await p.waitForSelector('[data-juego="mente-sudoku"]', { timeout: 60000 });
  ok('Sudoku aparece en Mente ágil', true);
  // Generador: pistas por nivel, solución única y tiempo
  const gen = await p.evaluate(() => Object.keys(SUDOKU_NIVELES).map(nv => {
    const r = [];
    for (let k = 0; k < 3; k++) {
      const t = performance.now(); const { puzzle, sol } = generarSudoku(nv); const ms = performance.now() - t;
      const valida = sol.every((v, i) => { const g = sol.slice(); g[i] = 0; return sdkPuede(g, i, v); }) && puzzle.every((v, i) => !v || v === sol[i]);
      r.push({ pistas: puzzle.filter(Boolean).length, unica: contarSoluciones(puzzle, 2) === 1, valida, ms: Math.round(ms) });
    }
    return [nv, r];
  }));
  const G = Object.fromEntries(gen);
  ok('todas las soluciones válidas y únicas', gen.every(([, r]) => r.every(x => x.valida && x.unica)), JSON.stringify(G));
  ok('pistas: fácil 40, medio 32, difícil 27', G.facil.every(x => x.pistas === 40) && G.medio.every(x => x.pistas === 32) && G.dificil.every(x => x.pistas === 27));
  ok('experto con menos pistas que difícil (≤ 27)', G.experto.every(x => x.pistas <= 27 && x.pistas >= 20), G.experto.map(x => x.pistas).join(','));
  ok('se genera en menos de 3 s', gen.every(([, r]) => r.every(x => x.ms < 3000)), gen.map(([n, r]) => n + ':' + Math.max(...r.map(x => x.ms)) + 'ms').join(' '));

  // Jugar Fácil: un error y luego resolver
  await p.click('[data-juego="mente-sudoku"]'); await p.waitForSelector('[data-sdk-nivel]');
  ok('selector con 4 niveles', (await p.$$('[data-sdk-nivel]')).length === 4);
  await p.click('[data-sdk-nivel="facil"]'); await p.click('[data-sdk-go]'); await p.waitForSelector('#sdk');
  const { puzzle, sol } = await p.evaluate(() => window.__sudoku);
  ok('tablero con 40 números fijos', (await p.$$('#sdk .fija')).length === 40);
  const vacias = puzzle.map((v, i) => v ? -1 : i).filter(i => i >= 0);
  const i0 = vacias[0], malo = sol[i0] % 9 + 1;
  await p.click(`[data-sdk-i="${i0}"]`); await p.click(`[data-sdk-n="${malo}"]`);
  ok('número equivocado se marca en rojo', await p.$eval(`[data-sdk-i="${i0}"]`, x => x.classList.contains('mal')));
  ok('pierde una vida', (await p.textContent('#m-vidas')).includes('🖤'), await p.textContent('#m-vidas'));
  await sleep(800);
  ok('el número equivocado no se queda', (await p.textContent(`[data-sdk-i="${i0}"]`)).trim() === '');
  ok('resaltado de zona al seleccionar', (await p.$$('#sdk .zona')).length >= 20);
  // Resolver: la mitad con clics y la otra mitad con el teclado físico
  for (const [k, i] of vacias.entries()) {
    await p.click(`[data-sdk-i="${i}"]`);
    if (k % 2) await p.keyboard.press(String(sol[i])); else await p.click(`[data-sdk-n="${sol[i]}"]`);
  }
  await p.waitForSelector('.result', { timeout: 15000 }); await sleep(800);
  const titulo = await p.textContent('.result h1'), pts = Number((await p.textContent('.result .score')).replace(/[^0-9]/g, ''));
  ok('¡Sudoku resuelto! con puntos (1 error → ≤ 520)', titulo.includes('resuelto') && pts > 80 && pts <= 520, titulo + ' ' + pts);
  ok('puntos guardados en el ranking', (await p.textContent('.result')).includes('de la semana'));
  await p.screenshot({ path: 'sudoku-fin.png' });

  // Sin vidas
  await p.click('.result [data-juego="mente-sudoku"]'); await p.waitForSelector('[data-sdk-nivel]');
  await p.click('[data-sdk-nivel="medio"]'); await p.click('[data-sdk-go]'); await p.waitForSelector('#sdk');
  ok('medio: 32 fijos', (await p.$$('#sdk .fija')).length === 32);
  await p.screenshot({ path: 'sudoku-tablero.png' });
  const s2 = await p.evaluate(() => window.__sudoku);
  const v2 = s2.puzzle.findIndex(v => !v);
  for (let k = 0; k < 3; k++) { await p.click(`[data-sdk-i="${v2}"]`); await p.click(`[data-sdk-n="${(s2.sol[v2] + k) % 9 + 1}"]`); await sleep(750); }
  await p.waitForSelector('.result', { timeout: 15000 }); await sleep(600);
  ok('3 errores → Sin vidas con 0 puntos', (await p.textContent('.result h1')).includes('Sin vidas') && (await p.textContent('.result .score')).trim() === '0');
  await b.close();
  console.log(out.join('\n')); process.exit(out.some(x => x.startsWith('FAIL')) ? 1 : 0);
})().catch(e => { console.log(out.join('\n')); console.error('ERROR', e.message.slice(0, 400)); process.exit(2); });
