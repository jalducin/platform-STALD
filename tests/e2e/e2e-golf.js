// E2E: «⛳ Golf» (openspec: golf).
// Catálogo en Arcade; individual con TOQUES REALES (CDP Input.dispatchTouchEvent, hasTouch + isMobile): la resortera
// apunta y elige la fuerza sin tirar, ⟲ ⟳ y − + ajustan, GOLPEAR tira; teclado (← → ↑ ↓ y Espacio); mando clásico
// (cruceta, X y A con el dedo) y su preferencia recordada; terminar un hoyo (resultado, estrellas y ⭐ individuales);
// recorrido completo con su tarjeta; avance guardado en el servidor y en el menú de práctica; sala de 2 personas
// (los dos aparatos reproducen igual cada tiro) hasta el podio con la tarjeta de la sala y la revancha. Capturas a
// 320, 390 y 844×390.
require('./lib/entorno');
const { chromium } = require('playwright');
const { abrirPagina } = require('./lib/navegador');
const { abrirJuego, textoTarjeta, idsDe, contarMenu } = require('./lib/menu'); // menú por categorías (openspec: juegos-categorias)
const API = process.env.API;
const out = []; const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const TACTIL = { hasTouch: true, isMobile: true };
const abrir = (b, email, viewport, contexto) => abrirPagina(b, { email, viejo: true, viewport, contexto: Object.assign({}, TACTIL, contexto || {}), out, etiqueta: email, dialogos: 'aceptar', ruta: '/juegos.html?arcadePrueba=1', esperar: '[data-menu]' });
const marcoDe = async (p, raiz = '') => (await p.waitForSelector(raiz + ' #arcade-frame', { timeout: 30000 })).contentFrame();
const estado = fr => fr.evaluate(() => window.__golf.estado());
const esperar = (fr, fn, arg, ms = 30000) => fr.waitForFunction(fn, arg, { timeout: ms });
const quieto = fr => esperar(fr, () => !window.__golf.estado().animando, null, 40000);

function dedos(p) {
  let cdp = null; const vivos = {};
  const enviar = async (type, puntos) => { cdp = cdp || await p.context().newCDPSession(p); await cdp.send('Input.dispatchTouchEvent', { type, touchPoints: puntos }); };
  return {
    poner: (id, x, y) => { vivos[id] = { x, y, id }; return enviar('touchStart', Object.values(vivos)); },
    mover: (id, x, y) => { vivos[id] = { x, y, id }; return enviar('touchMove', Object.values(vivos)); },
    soltarTodo: () => { for (const k in vivos) delete vivos[k]; return enviar('touchEnd', []); },
  };
}
async function arrastrar(p, x, y, x2, y2, pasos = 8) {
  const d = dedos(p); await d.poner(1, x, y);
  for (let i = 1; i <= pasos; i++) { await d.mover(1, x + (x2 - x) * i / pasos, y + (y2 - y) * i / pasos); await sleep(16); }
  await d.soltarTodo();
}
// Mantener un elemento del iframe con un dedo real (coordenadas de la página).
async function mantener(p, fr, selector, ms) {
  const r = await fr.locator(selector).boundingBox(), d = dedos(p);
  await d.poner(2, r.x + r.width / 2, r.y + r.height / 2); await sleep(ms); await d.soltarTodo();
}
// Tiro ideal del bot (gancho de prueba) y toque real en GOLPEAR.
async function tiroIdeal(fr) {
  await esperar(fr, () => window.__golf.estado().puedo, null, 40000);
  const t = await fr.evaluate(() => window.__golf.ideal());
  await fr.evaluate(t => window.__golf.apuntar(t.angulo, t.fuerza), t);
  await fr.tap('#b-golpear');
}
async function jugarHastaResultado(fr) {
  for (let i = 0; i < 12; i++) {
    const e = await estado(fr);
    if (e.modo !== 'juego') return;
    await tiroIdeal(fr); await sleep(300); await quieto(fr); await sleep(250);
  }
}
const cabe = fr => fr.evaluate(() => {
  const malos = ['#panel', '#b-golpear', '#hud', '#minimapa', '#b-izq', '#b-mas'].map(s => document.querySelector(s)).filter(x => x && x.offsetParent !== null)
    .map(x => { const r = x.getBoundingClientRect(); return { id: x.id, r: Math.round(r.right), b: Math.round(r.bottom), l: Math.round(r.left) }; })
    .filter(x => x.r > innerWidth + 0.5 || x.b > innerHeight + 0.5 || x.l < -0.5);
  return { malos, ancho: document.documentElement.scrollWidth <= innerWidth };
});

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME });
  const p = await abrir(b, 'marisol@example.com', { width: 390, height: 844 });
  p.on('pageerror', e => console.error('PILA', (e.stack || '').slice(0, 600)));
  const tarjeta = await textoTarjeta(p, 'golf');
  ok('catálogo: Golf en Arcade con ícono y descripción', tarjeta.includes('⛳') && tarjeta.includes('Golf') && /Minigolf/.test(tarjeta) && (await idsDe(p, 'arcade')).filter(i => i === 'golf').length === 1, tarjeta);
  ok('catálogo: el menú muestra todos los juegos de la página (con Golf)', (m => m.completo && m.ids.includes('golf'))(await contarMenu(p)));
  const puntosAntes = await p.evaluate(() => state.totalIndividual);

  // ---- Individual: menú y resortera con toques reales ----
  await abrirJuego(p, 'golf', { tap: true });
  let fr = await marcoDe(p);
  await fr.waitForSelector('#ov-menu:not(.hide)', { timeout: 30000 });
  const menu = await fr.textContent('#ov-menu');
  ok('menú: recorrido, práctica, control y cómo se juega', /Recorrido de 9 hoyos/.test(menu) && /Práctica/.test(menu) && /Mando clásico/.test(menu) && /Jala hacia atrás/.test(menu));
  await fr.tap('[data-ir="recorrido"]');
  await esperar(fr, () => window.__golf.estado().modo === 'juego');
  await sleep(500);
  const caja = await fr.locator('#c').boundingBox();
  const cx = caja.x + caja.width / 2, cy = caja.y + caja.height * 0.4;
  await arrastrar(p, cx, cy, cx + 20, cy + 110); // jalar hacia abajo (un poco a la derecha)
  await sleep(200);
  let e = await estado(fr);
  const esperado = Math.round(((Math.atan2(-110, -20) * 1800 / Math.PI) + 3600) % 3600);
  ok('resortera real: jalar hacia atrás apunta al lado contrario y elige la fuerza, sin tirar', Math.abs(e.aim - esperado) <= 20 && e.fuerza >= 55 && e.fuerza <= 75 && !e.animando && e.golpes[0][0] === 0, JSON.stringify({ aim: e.aim, esperado, fuerza: e.fuerza }));
  ok('resortera: muestra la fuerza en número', (await fr.textContent('#v-fuerza')).trim() === String(e.fuerza));
  await p.screenshot({ path: 'golf-390-resortera.png' });
  await fr.tap('#b-der'); await fr.tap('#b-der'); await fr.tap('#b-mas');
  const e2 = await estado(fr);
  ok('⟳ gira medio grado por toque y + sube la fuerza de uno en uno', e2.aim === (e.aim + 10) % 3600 && e2.fuerza === e.fuerza + 1, JSON.stringify({ antes: [e.aim, e.fuerza], despues: [e2.aim, e2.fuerza] }));
  const cabe390 = await cabe(fr);
  ok('390 px: HUD, minimapa y panel caben sin desbordar', cabe390.ancho && !cabe390.malos.length, JSON.stringify(cabe390));

  // ---- Teclado: → gira, ↑ sube la fuerza, Espacio golpea ----
  const k0 = await estado(fr);
  await p.keyboard.down('ArrowRight'); await sleep(350); await p.keyboard.up('ArrowRight');
  await p.keyboard.down('ArrowUp'); await sleep(350); await p.keyboard.up('ArrowUp');
  const k1 = await estado(fr);
  ok('teclado: → gira la mira y ↑ sube la fuerza', k1.aim !== k0.aim && k1.fuerza > k0.fuerza, JSON.stringify({ k0: [k0.aim, k0.fuerza], k1: [k1.aim, k1.fuerza] }));
  await fr.evaluate(() => window.__golf.apuntar(2700, 20));
  await p.keyboard.press('Space');
  await sleep(150);
  ok('teclado: Espacio golpea', (await estado(fr)).animando || (await estado(fr)).golpes[0][0] === 1);
  await quieto(fr);

  // ---- Terminar el hoyo 1 (tiros ideales con toque real en GOLPEAR) ----
  await jugarHastaResultado(fr);
  await fr.waitForSelector('#ov-hoyo:not(.hide)', { timeout: 20000 });
  await fr.waitForFunction(() => /individuales|No se guardaron/.test(document.getElementById('hoyo-guardado').textContent), null, { timeout: 20000 });
  const res = await fr.textContent('#ov-hoyo');
  ok('hoyo terminado: resultado contra el par, estrellas y puntos a ⭐ individuales', /Hoyo 1 · Primer tiro · Par 2/.test(res) && /(Birdie|Par|Hoyo en uno|Águila)/.test(res) && /★/.test(res) && /a tus ⭐ individuales/.test(res), res.replace(/\s+/g, ' ').slice(0, 200));
  ok('el total individual sube', (await p.evaluate(() => state.totalIndividual)) > puntosAntes);
  await p.screenshot({ path: 'golf-390-hoyo.png' });
  await sleep(800);
  const prog1 = await (await fetch(API + '/juegos/progreso/golf?email=marisol%40example.com')).json();
  ok('avance guardado en el servidor (mejor y estrellas del hoyo 1)', prog1.v >= 1 && prog1.datos && prog1.datos.mejores['1'] >= 1 && prog1.datos.estrellas['1'] >= 1, JSON.stringify(prog1.datos));

  // ---- Recorrido completo y tarjeta ----
  for (let h = 2; h <= 9; h++) {
    await fr.tap('[data-ir="siguiente"]');
    await esperar(fr, n => window.__golf.estado().modo === 'juego' && window.__golf.estado().hoyo === n, h);
    if (h === 6) { await sleep(400); await p.screenshot({ path: 'golf-390-molino.png' }); }
    await jugarHastaResultado(fr);
    await fr.waitForSelector('#ov-hoyo:not(.hide)', { timeout: 20000 });
  }
  await fr.tap('[data-ir="ver-tarjeta"]');
  await fr.waitForSelector('#ov-tarjeta:not(.hide)', { timeout: 10000 });
  const tabla = await fr.textContent('#ov-tarjeta');
  ok('tarjeta final: 9 hoyos con par, golpes y total contra el par', (await fr.$$('#tarjeta-tabla th')).length === 11 && /Terminaste el recorrido/.test(tabla) && /Total: \d+ golpes/.test(tabla) && /⭐ \d+\/27/.test(tabla), tabla.replace(/\s+/g, ' ').slice(0, 220));
  await p.screenshot({ path: 'golf-390-tarjeta.png' });
  await sleep(1200);
  const prog2 = await (await fetch(API + '/juegos/progreso/golf?email=marisol%40example.com')).json();
  ok('avance: 9 hoyos, un recorrido y mejor recorrido', Object.keys(prog2.datos.mejores).length === 9 && prog2.datos.recorridos === 1 && prog2.datos.mejorRecorrido >= 9, JSON.stringify(prog2.datos));

  // ---- Avance en el menú de práctica tras recargar ----
  await p.reload(); await p.waitForSelector('[data-menu]', { timeout: 60000 });
  await abrirJuego(p, 'golf', { tap: true }); fr = await marcoDe(p);
  await fr.waitForSelector('#ov-menu:not(.hide)', { timeout: 30000 });
  ok('menú: resumen con estrellas y mejor recorrido', /\/27/.test(await fr.textContent('#menu-resumen')) && /Mejor recorrido/.test(await fr.textContent('#menu-resumen')));
  await fr.tap('[data-ir="practica"]');
  const h1 = await fr.textContent('[data-hoyo="0"]'), h2b = await fr.$('[data-hoyo="1"]:not([disabled])');
  ok('práctica: el hoyo 1 muestra su mejor y estrellas; el 2 ya está desbloqueado', /Mejor: \d/.test(h1) && /★/.test(h1) && !!h2b, h1);
  await p.screenshot({ path: 'golf-390-practica.png' });
  await fr.tap('[data-ir="menu"]');

  // ---- Mando clásico: elegir, jugar con el dedo y que se recuerde ----
  await fr.tap('[data-control="mando"]');
  await fr.tap('[data-ir="recorrido"]');
  await esperar(fr, () => window.__golf.estado().modo === 'juego');
  await sleep(400);
  let m = await estado(fr);
  ok('mando: visible y activo; el panel de botones se esconde', m.control === 'mando' && m.mando.visible && m.mando.activo && !(await fr.isVisible('#b-golpear')), JSON.stringify({ control: m.control, visible: m.mando.visible, activo: m.mando.activo }));
  const m0 = await estado(fr);
  await mantener(p, fr, '.mando-cruceta i.der', 400);
  await mantener(p, fr, '.mando-boton[data-b="X"]', 500);
  const m1 = await estado(fr);
  ok('mando con el dedo: ▶ gira la mira y X sube la fuerza', m1.aim !== m0.aim && m1.fuerza > m0.fuerza, JSON.stringify({ m0: [m0.aim, m0.fuerza], m1: [m1.aim, m1.fuerza] }));
  await mantener(p, fr, '.mando-gatillo[data-b="R"]', 80);
  ok('mando: R ajuste fino (medio grado)', (await estado(fr)).aim === (m1.aim + 5) % 3600);
  await p.screenshot({ path: 'golf-390-mando.png' });
  await mantener(p, fr, '.mando-boton[data-b="A"]', 80);
  await sleep(120);
  ok('mando: A golpea', (await estado(fr)).animando || (await estado(fr)).golpes[0][0] === 1);
  await quieto(fr);
  await p.reload(); await p.waitForSelector('[data-menu]', { timeout: 60000 });
  await abrirJuego(p, 'golf', { tap: true }); fr = await marcoDe(p);
  await fr.waitForSelector('#ov-menu:not(.hide)', { timeout: 30000 });
  ok('mando: la preferencia se recuerda al volver', (await fr.getAttribute('[data-control="mando"]', 'aria-pressed')) === 'true' && (await estado(fr)).control === 'mando');
  await fr.tap('[data-control="toques"]');
  await p.click('[data-a="salir"]').catch(() => {});

  // ---- 320 px y horizontal 844×390 ----
  const chico = await abrir(b, 'laura@example.com', { width: 320, height: 568 });
  await abrirJuego(chico, 'golf', { tap: true });
  const fc = await marcoDe(chico);
  await fc.waitForSelector('#ov-menu:not(.hide)', { timeout: 30000 });
  await chico.screenshot({ path: 'golf-320-menu.png' });
  await fc.tap('[data-ir="recorrido"]');
  await esperar(fc, () => window.__golf.estado().modo === 'juego'); await sleep(2000);
  const c320 = await cabe(fc);
  ok('320 px: todo cabe sin desbordar (HUD, minimapa, fuerza y botones)', c320.ancho && !c320.malos.length, JSON.stringify(c320));
  await chico.screenshot({ path: 'golf-320-juego.png' });
  await chico.context().close();
  const hor = await abrir(b, 'laura@example.com', { width: 844, height: 390 });
  await abrirJuego(hor, 'golf', { tap: true });
  const fh = await marcoDe(hor);
  await fh.waitForSelector('#ov-menu:not(.hide)', { timeout: 30000 });
  await fh.tap('[data-ir="recorrido"]');
  await esperar(fh, () => window.__golf.estado().modo === 'juego'); await sleep(2000);
  const eh = await estado(fh), ch = await cabe(fh);
  ok('horizontal: el hoyo se ve acostado y el panel cabe completo', eh.horizontal && ch.ancho && !ch.malos.length, JSON.stringify(ch));
  await hor.screenshot({ path: 'golf-844-horizontal.png' });
  await hor.context().close();

  // ---- Sala de 2 personas (Angel en horizontal) ----
  await p.click('[data-tab="partidas"]'); await p.waitForSelector('#f-crear');
  await p.selectOption('#p-juego', 'golf');
  ok('crear sala: sin casilla de bots y con la nota de 2 a 4 personas', !(await p.isVisible('#p-bots-wrap')) && /De 2 a 4 personas/.test(await p.textContent('#p-bots-nota')));
  await p.click('#f-crear button[type=submit]'); await p.waitForSelector('[data-p="empezar"]', { timeout: 30000 });
  const codigo = (await p.textContent('#p-codigo-chip')).replace(/[^A-Z]/g, '');
  const a = await abrir(b, 'angel@example.com', { width: 844, height: 390 });
  await a.click('[data-tab="partidas"]'); await a.waitForSelector('#f-unirse');
  await a.fill('#p-codigo', codigo); await a.click('#f-unirse button[type=submit]');
  await p.waitForFunction(() => /2 personas/.test((document.getElementById('p-mesa') || {}).textContent || ''), null, { timeout: 30000 });
  ok('sala: «Hasta 4 personas · 2 personas»', /Hasta 4 personas · 2 personas/.test(await p.textContent('#p-mesa')));
  await p.click('[data-p="empezar"]');
  const f1 = await marcoDe(p, '#p-body'), f2 = await marcoDe(a, '#p-body');
  await esperar(f1, () => window.__golf && window.__golf.estado().sala && window.__golf.estado().miTurno, null, 30000);
  ok('2 personas: tira la anfitriona y Angel espera su turno', !(await estado(f2)).miTurno);
  await p.screenshot({ path: 'golf-390-sala.png' });
  // Cada quien tira en su turno (tiro ideal + toque real en GOLPEAR); tras cada tiro se comparan los dos aparatos.
  // Al terminar, el iframe se cambia por el podio (el marco se desconecta): eso cierra el ciclo.
  let iguales = true, tiros = 0, comparados = 0, primeraVez = true;
  const firma = async f => { await esperar(f, () => window.__golf.firma() !== null, null, 40000); return f.evaluate(() => window.__golf.firma()); };
  for (let k = 0; k < 80 && !(await p.$('#p-body .result')); k++) {
    try {
      const [s1, s2] = [await estado(f1), await estado(f2)];
      const quien = s1.miTurno ? f1 : s2.miTurno ? f2 : null;
      if (!quien) { await sleep(300); continue; }
      await tiroIdeal(quien); tiros++;
      if (primeraVez) { primeraVez = false; await sleep(700); await a.screenshot({ path: 'golf-844-sala-angel.png' }); await p.screenshot({ path: 'golf-390-sala-tiro.png' }); }
      for (const f of [f1, f2]) await esperar(f, n => window.__golf.estado().mostrados >= n, tiros, 40000);
      const [x1, x2] = [await firma(f1), await firma(f2)];
      if (x1 !== x2) { iguales = false; break; }
      comparados++;
    } catch (err) { if (/detached|closed|destroyed/i.test(err.message)) break; throw err; }
  }
  ok('2 personas: los dos aparatos reproducen igual cada tiro (pelotas, golpes, hoyo y turno)', iguales && comparados >= 2, 'tiros: ' + tiros + ' · comparados: ' + comparados);
  await p.waitForSelector('#p-body .result', { timeout: 60000 }); await a.waitForSelector('#p-body .result', { timeout: 60000 });
  await sleep(1200);
  const [pod1, pod2] = [await p.textContent('#p-body'), await a.textContent('#p-body')];
  ok('2 personas: podio en los dos con Marisol y Angel, tarjeta de 3 hoyos y revancha',
    /Marisol/.test(pod1) && /Angel/.test(pod1) && /Marisol/.test(pod2) && /Angel/.test(pod2) && /Tarjeta/.test(pod1) && (await p.$$('.golf-tarjeta thead th')).length === 5 && await p.isVisible('[data-p="revancha"]'), pod1.replace(/\s+/g, ' ').slice(0, 220));
  await p.screenshot({ path: 'golf-390-podio.png', fullPage: true });
  await a.screenshot({ path: 'golf-844-podio.png', fullPage: true });
  const sal = await (await fetch(API + '/juegos/sala/' + codigo + '?email=marisol%40example.com')).json();
  const js = (sal.jugadores || []).flatMap(x => x.jugadas || []);
  ok('servidor: cada tiro guardado como { n, accion: "tiro", angulo, fuerza }', js.length >= 2 && js.every(j => j.accion === 'tiro' && Number.isInteger(j.angulo) && Number.isInteger(j.fuerza) && Object.keys(j).sort().join() === 'accion,angulo,fuerza,n,t'), JSON.stringify(js[0]));

  await b.close();
  console.log(out.join('\n')); process.exit(out.some(x => x.startsWith('FAIL')) ? 1 : 0);
})().catch(e => { console.log(out.join('\n')); console.error('ERROR', e.message.slice(0, 400)); process.exit(2); });
