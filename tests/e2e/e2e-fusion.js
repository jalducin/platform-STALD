// E2E Sprint 4 (openspec: juegos-fusion): menú fusionado, mezclas, categorías nuevas y partida de Ortografía.
require('./lib/entorno'); // BASE, API, DATOS, DATA, CHROME, carpeta de salida y sesión de prueba en fetch
const { chromium } = require('playwright');
const { abrirPagina } = require('./lib/navegador');
const BASE = process.env.BASE, API = process.env.API;
const Q = '?api=' + encodeURIComponent(API);
const out = []; const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`);
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME });
  const p = await abrirPagina(b, { email: 'marisol@example.com', viejo: true, tiempo: 1, viewport: { width: 390, height: 900 }, out, etiqueta: '', ruta: '/juegos.html', esperar: '[data-juego]' });
  const ids = await p.$$eval('[data-juego]', bs => bs.map(x => x.dataset.juego));
  ok('menú: 21 juegos sin los absorbidos', ids.length === 21 && !ids.some(i => ['en-preguntas', 'es-acentos', 'es-sinonimos', 'mente-secuencias'].includes(i)), ids.length + ' juegos');
  ok('menú: títulos fusionados', /Completa y responde/.test(await p.textContent('[data-juego="en-frases"]')) && /Cálculo y secuencias/.test(await p.textContent('[data-juego="mente-calculo"]')) && /acentos, sinónimos/.test(await p.textContent('[data-juego="es-ortografia"]')));
  // Vuelve al inicio saliendo con ✕: navegar a mitad de un juego que se reanuda ofrecería continuarlo
  // (openspec: juegos-recarga).
  async function inicio() {
    if (await p.$('[data-a="salir"]')) await p.click('[data-a="salir"]');
    await p.goto(BASE + '/juegos.html' + Q); await p.waitForSelector('[data-juego]');
  }
  // Recorre N preguntas y junta el emoji grande de cada una
  async function iconos(id, n) {
    await inicio();
    await p.click('[data-juego="' + id + '"]'); const vistos = [];
    for (let k = 0; k < n; k++) {
      await p.waitForSelector('.q-card .big', { timeout: 10000 }); const big = await p.textContent('.q-card .big'); vistos.push(big.trim());
      await p.click('[data-opt="0"]'); await p.waitForFunction(prev => (document.querySelector('.q-card .big') || {}).textContent !== prev || true, big); await sleep(1500);
    }
    return vistos;
  }
  const fr = await iconos('en-frases', 6);
  ok('Completa y responde: mezcla 🧩 y 💬', fr.includes('🧩') && fr.includes('💬'), fr.join(' '));
  const ca = await iconos('mente-calculo', 6);
  ok('Cálculo y secuencias: mezcla 🧮 y 🔢', ca.includes('🧮') && ca.includes('🔢'), ca.join(' '));
  const ort = await iconos('es-ortografia', 12);
  ok('Ortografía: mezcla al menos 2 tipos (✍️, á, 🟰/↔️)', new Set(ort.map(x => x === '↔️' ? '🟰' : x)).size >= 2, ort.join(' '));
  // Cultura con categorías nuevas
  await inicio(); await p.click('[data-juego="cultura"]');
  await p.waitForSelector('[data-cat="ia"]');
  ok('Maratón: categorías IA y Tecnología', !!(await p.$('[data-cat="ia"]')) && !!(await p.$('[data-cat="tecnologia"]')));
  await p.click('[data-cat="ia"]'); await p.waitForSelector('.q-card');
  ok('Maratón IA: pregunta de nivel fácil de IA', /Nivel fácil · Inteligencia artificial/.test(await p.textContent('.q-card')), (await p.textContent('.q-card')).replace(/\s+/g, ' ').slice(0, 120));
  // Partida de Ortografía: el selector ya no ofrece los absorbidos y las preguntas se mezclan
  await inicio(); await p.click('[data-tab="partidas"]');
  const opciones = await p.$$eval('#p-juego option', os => os.map(o => o.value));
  ok('partidas: sin juegos absorbidos', !opciones.some(o => ['en-preguntas', 'es-acentos', 'es-sinonimos', 'mente-secuencias'].includes(o)) && opciones.includes('es-ortografia'), opciones.join(','));
  const tipos = await p.evaluate(async () => (await preguntasPartida('es-ortografia', 12345, {})).map(q => q.big));
  ok('partida de Ortografía: 10 preguntas de varios tipos', tipos.length === 10 && new Set(tipos.map(x => x === '↔️' ? '🟰' : x)).size === 3, tipos.join(' '));
  const enf = await p.evaluate(async () => (await preguntasPartida('en-frases', 7, {})).map(q => q.big));
  ok('partida de Completa y responde: 5 y 5', enf.filter(x => x === '🧩').length === 5 && enf.filter(x => x === '💬').length === 5);
  await b.close();
  console.log(out.join('\n')); process.exit(out.some(x => x.startsWith('FAIL')) ? 1 : 0);
})().catch(e => { console.log(out.join('\n')); console.error('ERROR', e.message.slice(0, 300)); process.exit(2); });
