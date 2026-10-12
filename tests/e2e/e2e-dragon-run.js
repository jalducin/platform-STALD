// E2E: Dragon Run (openspec: dragon-run, dragon-run-misiones). Integración con Juegos en Arcade, guardado en
// ⭐ individuales, doble salto y música propia; misiones diarias con ganchos (?arcadePrueba=1 → window.__dragonPrueba),
// aviso «¡Misión cumplida!», avance y premios en el servidor recuperados tras recargar, movimiento reducido y
// capturas a 390 px y en escritorio.
require('./lib/entorno'); // BASE, API, DATOS, DATA, CHROME, carpeta de salida y sesión de prueba en fetch
const { chromium } = require('playwright');
const BASE = process.env.BASE, API = process.env.API;
const { abrirPagina } = require('./lib/navegador');
const { abrirJuego, idsDe, textoTarjeta } = require('./lib/menu'); // menú por categorías (openspec: juegos-categorias)
const out = []; const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const EMAIL = 'laura@example.com'; // sin avance previo de Dragon Run
const FECHA = '2026-10-11';
const progreso = async (email = EMAIL) => (await fetch(API + '/juegos/progreso/dragon-run?email=' + encodeURIComponent(email))).json();
async function esperarProgreso(cond, ms = 15000, email = EMAIL) {
  const fin = Date.now() + ms; let r;
  while (Date.now() < fin) { r = await progreso(email); if (cond(r)) return r; await sleep(300); }
  return r;
}
// Abre Dragon Run desde Juegos y espera la pantalla de misiones con el avance ya cargado.
async function abrirDragon(p) {
  await abrirJuego(p, 'dragon-run');
  const fr = await (await p.waitForSelector('#dragon-frame', { timeout: 20000 })).contentFrame();
  await fr.waitForFunction(() => window.__dragonPrueba && document.querySelectorAll('#misiones .mis[data-tipo]').length === 3 && !/Cargando/.test(document.getElementById('misiones').textContent), null, { timeout: 20000 });
  await fr.evaluate(f => window.__dragonPrueba.fecha(f), FECHA);
  return fr;
}

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME, args: ['--autoplay-policy=no-user-gesture-required'] });
  // 1) Sola: doble salto, no un tercero; su música arranca; sin plataforma no envía nada
  const sola = await (await b.newContext()).newPage(); sola.on('pageerror', e => out.push('FAIL error JS (sola): ' + e.message));
  await sola.goto(BASE + '/juegos/dragon-run.html');
  await sola.click('#bS'); await sleep(300);
  const s0 = await sola.evaluate(() => window.__dragon);
  await sola.evaluate(() => { window.__saltar(); window.__saltar(); window.__saltar(); });
  const s1 = await sola.evaluate(() => window.__dragon);
  ok('sola: arranca a jugar', s0.st === 'play');
  ok('doble salto: 2 saltos en el aire, no 3', s1.saltos === 2 && s1.air, JSON.stringify(s1));
  ok('doble salto cuenta para las misiones', s1.dobles === 1, JSON.stringify(s1));
  ok('el juego trae su propia música (melodía sonando)', await sola.evaluate(() => typeof mi !== 'undefined' && mi !== null));
  ok('texto de inicio menciona el doble salto', (await sola.textContent('#ovS')).includes('doble salto'));

  // 2) Catálogo a 390 px: Dragon Run en Arcade, no en Mente ágil
  const p = await abrirPagina(b, { email: EMAIL, viejo: true, out, etiqueta: 'misiones', ruta: '/juegos.html?arcadePrueba=1', esperar: '[data-menu]' });
  const mente = await idsDe(p, 'mente'), arcade = await idsDe(p, 'arcade'); // termina con 🕹️ Arcade abierta
  ok('catálogo: Dragon Run en 🕹️ Arcade con Axo y Karts', ['plataformas', 'karts', 'dragon-run'].every(id => arcade.includes(id)), arcade.join(','));
  ok('catálogo: Dragon Run ya no está en Mente ágil', mente.length > 0 && !mente.includes('dragon-run'), mente.join(','));
  await (await p.$('.game[data-juego="dragon-run"]')).scrollIntoViewIfNeeded();
  await p.screenshot({ path: 'dragon-390-catalogo.png' });
  const antes = await progreso();
  ok('sin avance al empezar', antes.v === 0 && antes.datos === null, JSON.stringify(antes));

  // 3) Pantalla de misiones a 390 px
  let fr = await abrirDragon(p);
  const semilla = await fr.evaluate(() => window.__dragonPrueba.semilla());
  ok('el juego recibe el id del jugador como semilla (no el correo)', semilla && !semilla.includes('@') && semilla === await p.evaluate(() => state.jugador.id), semilla);
  const mis = await fr.evaluate(() => window.__dragonPrueba.misiones());
  ok('3 misiones del día, de tipos distintos', mis.length === 3 && new Set(mis.map(m => m.tipo)).size === 3, mis.map(m => m.texto).join(' | '));
  const mis2 = await fr.evaluate(() => window.__dragonPrueba.misiones());
  ok('misiones deterministas (misma fecha y jugador)', JSON.stringify(mis) === JSON.stringify(mis2));
  ok('5 logros con medallas', (await fr.$$('#logros .logro')).length === 5);
  ok('premios: 7 colores y 5 estelas, solo verde y fuego abiertos', (await fr.$$('[data-color]')).length === 7 && (await fr.$$('[data-estela]')).length === 5 &&
    (await fr.$$('.sw:not([aria-disabled="true"])')).length === 2);
  const medidas = await fr.evaluate(() => {
    const r = document.getElementById('bS').getBoundingClientRect(), t = document.querySelector('.mis .fila');
    return { botonDentro: r.bottom <= innerHeight && r.top >= 0, letra: parseFloat(getComputedStyle(t).fontSize), ancho: document.documentElement.scrollWidth <= innerWidth, alto: innerHeight };
  });
  ok('390 px: JUGAR visible, letra legible y sin scroll horizontal', medidas.botonDentro && medidas.letra >= 14 && medidas.ancho, JSON.stringify(medidas));
  await p.screenshot({ path: 'dragon-390-misiones.png' });
  await fr.click('[data-color="dorado"]', { force: true }); // aria-disabled: Playwright lo trata como deshabilitado, pero se puede tocar
  ok('premio bloqueado: dice cómo conseguirlo', /🔒 Dorado: Coleccionista 🥇/.test(await fr.textContent('#pista')), await fr.textContent('#pista'));
  await fr.evaluate(() => { const m = document.querySelector('.menu-in'); m.scrollTop = m.scrollHeight; });
  await p.screenshot({ path: 'dragon-390-premios.png' });

  // 4) Cumplir una misión diaria con ganchos de prueba
  const i = mis.findIndex(m => m.tipo !== 'carreras'); // «Corre 3 carreras» no se cumple en una
  await fr.click('#bS');
  await fr.waitForFunction(() => window.__dragon.st === 'play');
  await fr.evaluate(k => window.__dragonPrueba.cumplir(k), i);
  await fr.waitForSelector('#toast.ver', { timeout: 5000 });
  const aviso = await fr.textContent('#toast');
  ok('aviso «¡Misión cumplida!» durante la carrera', aviso.includes('¡Misión cumplida!') && aviso.includes(mis[i].texto), aviso);
  await p.screenshot({ path: 'dragon-390-mision-cumplida.png' });
  await fr.evaluate(() => window.__dragonPrueba.terminar(false));
  await p.waitForFunction(() => /a tus individuales|No se guardaron/.test((document.querySelector('.result') || {}).textContent || ''), null, { timeout: 30000 });
  const res = await p.textContent('.result');
  ok('resultado: repite la misión cumplida y guarda los puntos', res.includes('🎯 ¡Misión cumplida! ' + mis[i].texto) && res.includes('a tus individuales'), res.slice(0, 300));
  ok('resultado: estrena la estela de burbujas', res.includes('Nuevo premio: estela Burbujas'), res.slice(0, 300));
  await p.screenshot({ path: 'dragon-390-resultado.png', fullPage: true });
  const g1 = await esperarProgreso(r => r.v >= 1 && r.datos && r.datos.cumplidas >= 1);
  const d1 = g1.datos || {};
  ok('avance en el servidor: misión cumplida, carrera contada y premio', d1.diaria && d1.diaria.fecha === FECHA && d1.diaria.avance[i] >= mis[i].meta && d1.totales.carreras === 1 &&
    d1.premios.includes('estela-burbujas') && d1.dias.racha === 1, JSON.stringify(d1));

  // 5) Elegir la estela nueva y recuperar todo tras recargar
  await p.click('.result [data-juego="dragon-run"]');
  fr = await (await p.waitForSelector('#dragon-frame', { timeout: 20000 })).contentFrame();
  await fr.waitForFunction(() => window.__dragonPrueba && !/Cargando/.test(document.getElementById('misiones').textContent), null, { timeout: 20000 });
  await fr.evaluate(f => window.__dragonPrueba.fecha(f), FECHA);
  ok('al volver a jugar, la misión sale cumplida ✅', await fr.$eval(`#misiones .mis:nth-child(${i + 1})`, x => x.classList.contains('ok') && x.textContent.includes('✅')));
  await fr.click('[data-estela="burbujas"]');
  const g2 = await esperarProgreso(r => r.datos && r.datos.equipo.estela === 'burbujas');
  ok('elegir la estela se guarda en el servidor', g2.datos && g2.datos.equipo.estela === 'burbujas' && g2.v === g1.v + 1, JSON.stringify(g2.datos && g2.datos.equipo) + ' v' + g2.v);
  await p.reload(); await p.waitForSelector('[data-menu]', { timeout: 60000 });
  ok('recargar no deja el juego abierto', !(await p.$('#dragon-frame')));
  fr = await abrirDragon(p);
  const tras = await fr.evaluate(() => window.__dragonPrueba.progreso());
  ok('tras recargar: misión cumplida, estela elegida y premio abierto', (await fr.$eval(`#misiones .mis:nth-child(${i + 1})`, x => x.classList.contains('ok'))) &&
    (await fr.$eval('[data-estela="burbujas"]', x => x.getAttribute('aria-pressed'))) === 'true' && tras.premios.includes('estela-burbujas'), JSON.stringify(tras.equipo));
  await p.screenshot({ path: 'dragon-390-tras-recargar.png' });
  // Corre con la estela nueva para la captura del juego en el celular.
  await fr.click('#bS'); await sleep(1400);
  await fr.evaluate(() => { window.__saltar(); });
  await sleep(250);
  await p.screenshot({ path: 'dragon-390-jugando.png' });
  // Avance con trampa: el servidor lo rechaza
  const malo = await fetch(API + '/juegos/progreso/dragon-run?email=' + encodeURIComponent(EMAIL), { method: 'PUT', body: JSON.stringify({ v: (await progreso()).v, datos: { ...tras, equipo: { color: 'dorado', estela: 'fuego' } } }) });
  ok('servidor: color sin desbloquear → 400 progreso_invalido', malo.status === 400 && (await malo.json()).error === 'progreso_invalido');

  // 6) Movimiento reducido: sin sacudidas ni animación en el aviso
  const rm = await (await b.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' })).newPage();
  rm.on('pageerror', e => out.push('FAIL error JS (reducido): ' + e.message));
  await rm.goto(BASE + '/juegos/dragon-run.html?prueba=1');
  await rm.click('#bS'); await sleep(200);
  const red = await rm.evaluate(() => ({ r: REDUCIR, trans: getComputedStyle(document.getElementById('toast')).transitionDuration }));
  ok('prefers-reduced-motion: detectado y aviso sin animación', red.r === true && red.trans === '0s', JSON.stringify(red));
  await rm.context().close();

  // 7) Escritorio: modo auto juega y termina; se guarda en ⭐ individuales
  const pe = await abrirPagina(b, { email: 'marisol@example.com', viejo: true, viewport: { width: 900, height: 900 }, out, etiqueta: 'juegos', ruta: '/juegos.html?dragonAuto=1', esperar: '[data-menu]' });
  ok('Dragon Run en Arcade (escritorio)', (await idsDe(pe, 'arcade')).includes('dragon-run') && (await textoTarjeta(pe, 'dragon-run')).includes('Dragon Run'));
  const antesE = await pe.evaluate(() => state.totalIndividual);
  await abrirJuego(pe, 'dragon-run');
  const fe = await (await pe.waitForSelector('#dragon-frame', { timeout: 20000 })).contentFrame();
  await fe.waitForSelector('#bS'); await fe.waitForFunction(() => document.querySelectorAll('#misiones .mis[data-tipo]').length === 3);
  await pe.screenshot({ path: 'dragon-escritorio-misiones.png' });
  await fe.click('#bS');
  await sleep(1500);
  ok('juego corriendo dentro de Juegos', (await fe.evaluate(() => window.__dragon.st)) === 'play');
  await pe.screenshot({ path: 'dragon-escritorio-jugando.png' });
  await pe.waitForSelector('.result', { timeout: 150000 });
  await pe.waitForFunction(() => /a tus individuales|No se guardaron/.test((document.querySelector('.result') || {}).textContent || ''), null, { timeout: 30000 });
  const resE = await pe.textContent('.result');
  const pts = Number((await pe.textContent('.result .score')).replace(/[^0-9]/g, ''));
  const desp = await pe.evaluate(() => state.totalIndividual);
  ok('al terminar se guarda en ⭐ individuales', resE.includes('a tus individuales') && desp === antesE + pts && pts > 0, `${antesE} + ${pts} = ${desp}`);
  ok('resultado con metros y monedas', /📏 \d+ m · 🪙 \d+ monedas/.test(resE), resE.slice(0, 160));
  await pe.screenshot({ path: 'dragon-resultado.png' });
  const gm = await esperarProgreso(r => r.v >= 1, 15000, 'marisol@example.com');
  ok('la carrera automática también suma a su avance', gm.datos && gm.datos.totales.carreras >= 1, JSON.stringify(gm.datos && gm.datos.totales));
  // 8) Un mensaje falso desde otra ventana no guarda nada
  await pe.click('.result [data-juego="dragon-run"]'); await pe.waitForSelector('#dragon-frame'); // «Jugar otra vez» del resultado
  await pe.evaluate(() => window.postMessage({ juego: 'dragon-run', fin: true, gano: true, puntos: 2000, monedas: 0, metros: 600, segundos: 1 }, '*'));
  await sleep(1200);
  ok('mensaje que no viene del juego se ignora', !(await pe.$('.result')) && !!(await pe.$('#dragon-frame')));
  await b.close();
  console.log(out.join('\n')); process.exit(out.some(x => x.startsWith('FAIL')) ? 1 : 0);
})().catch(e => { console.log(out.join('\n')); console.error('ERROR', e.message.slice(0, 400)); process.exit(2); });
