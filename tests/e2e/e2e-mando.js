// E2E: mando de Arcade (openspec: mando-arcade). Módulo compartido juegos/mando.js en Axo y Dragon Run, dentro de
// Juegos (iframe del mismo origen):
// - celular con TOQUES REALES (CDP Input.dispatchTouchEvent, hasTouch + isMobile): cruceta + A a la vez en Axo (avanza
//   y salta), deslizar de A a B, la página no se desplaza; A y START en Dragon Run (salta una vez, pausa y sigue);
// - teclado en escritorio (→ + J, Enter para pausa) y guía «⌨️ Controles»;
// - control físico simulado (navigator.getGamepads inyectado con addInitScript): aviso, cruceta, palanca y botón de abajo;
// - preferencia recordada tras recargar (Axo «Botones», Dragon «Tocar la pantalla»);
// - mando completo dentro de la pantalla y capturas a 360×640, 640×360, 390×844, 844×390 y escritorio, más el mando
//   completo con palanca y un botón desconocido.
require('./lib/entorno'); // BASE, API, CHROME, carpeta de salida y sesión de prueba en fetch
const { chromium } = require('playwright');
const { abrirPagina } = require('./lib/navegador');
const BASE = process.env.BASE;
const out = []; const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const EMAIL = 'fernando@example.com'; // sin avance de Axo ni de Dragon que otras pruebas revisen
const TACTIL = { hasTouch: true, isMobile: true };
// Control físico simulado: cada marco (también el iframe del juego) lee window.__pads.
const GAMEPAD = [() => {
  Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => window.__pads || [null, null, null, null] });
}, null];
const abrir = (b, viewport, contexto, init) => abrirPagina(b, { email: EMAIL, viejo: true, viewport, contexto, init, out, ruta: '/juegos.html?arcadePrueba=1', esperar: '[data-juego="plataformas"]' });
const marcoDe = async (p, sel = '#arcade-frame') => (await p.waitForSelector(sel, { timeout: 30000 })).contentFrame();

// Dedos reales por CDP: cada evento lleva todos los dedos que siguen en la pantalla.
function dedos(p) {
  let cdp = null; const vivos = {};
  const enviar = async (type, puntos) => { cdp = cdp || await p.context().newCDPSession(p); await cdp.send('Input.dispatchTouchEvent', { type, touchPoints: puntos }); };
  return {
    poner: (id, c) => { vivos[id] = { x: c.x, y: c.y, id }; return enviar('touchStart', Object.values(vivos)); },
    mover: (id, c) => { vivos[id] = { x: c.x, y: c.y, id }; return enviar('touchMove', Object.values(vivos)); },
    quitar: id => { const t = vivos[id]; delete vivos[id]; return enviar('touchEnd', [t]); }, // touchEnd lleva el dedo que se levanta
    soltarTodo: () => { for (const k in vivos) delete vivos[k]; return enviar('touchEnd', []); },
  };
}
const centro = async (fr, sel) => { const c = await fr.locator(sel).boundingBox(); return { x: c.x + c.width / 2, y: c.y + c.height / 2 }; };
const tocar = async (p, c) => { const d = dedos(p); await d.poner(1, c); await sleep(80); await d.soltarTodo(); };

// Abre Axo desde Juegos y entra al 1-1.
async function abrirAxo(p) {
  await p.click('[data-juego="plataformas"]');
  const fr = await marcoDe(p);
  await fr.waitForSelector('#ov-titulo:not(.hide)', { timeout: 30000 });
  return fr;
}
async function entrarNivel(fr) {
  await fr.click('#b-jugar'); await fr.waitForSelector('#ov-mapa:not(.hide)');
  await fr.click('[data-nivel="1-1"]');
  await fr.waitForFunction(() => window.__plat.estado().modo === 'nivel');
  await sleep(500);
}
// Medidas del mando dentro del iframe: botones visibles dentro de la pantalla, sin desplazamiento horizontal y, en
// vertical, debajo del juego.
const medir = fr => fr.evaluate(() => {
  const vis = e => { const s = getComputedStyle(e), r = e.getBoundingClientRect(); return r.width > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
  const ctl = [...document.querySelectorAll('.mando [data-b], .mando-cruceta i[data-dir], .mando-palanca')].filter(vis).map(e => { const r = e.getBoundingClientRect(); return { id: e.dataset.b || e.dataset.dir || 'palanca', l: r.left, t: r.top, r: r.right, b: r.bottom }; });
  const m = document.querySelector('.mando').getBoundingClientRect(), c = document.getElementById('c').getBoundingClientRect();
  return { vw: innerWidth, vh: innerHeight, ctl, mando: { t: m.top, b: m.bottom, pos: getComputedStyle(document.querySelector('.mando')).position }, canvas: { t: c.top, b: c.bottom }, ancho: document.documentElement.scrollWidth };
});
const dentro = (x, vw, vh) => x.l >= -0.5 && x.t >= -0.5 && x.r <= vw + 0.5 && x.b <= vh + 0.5;
async function revisarLayout(fr, nombre, esperados) {
  const m = await medir(fr);
  const ids = m.ctl.map(x => x.id).sort().join(',');
  ok(nombre + ': se ven solo los botones del juego (' + esperados + ')', ids === esperados, ids);
  ok(nombre + ': mando completo dentro de la pantalla, sin desplazamiento horizontal', m.ctl.every(x => dentro(x, m.vw, m.vh)) && m.ancho <= m.vw,
    JSON.stringify({ vw: m.vw, vh: m.vh, ancho: m.ancho, fuera: m.ctl.filter(x => !dentro(x, m.vw, m.vh)).map(x => x.id) }));
  if (m.mando.pos !== 'absolute') ok(nombre + ': en vertical, el mando va debajo del juego', m.mando.t >= m.canvas.b - 1, JSON.stringify({ mando: m.mando, canvas: m.canvas }));
  else ok(nombre + ': en horizontal, el mando va encimado en las esquinas', m.ctl.every(x => x.b > m.vh * 0.45), JSON.stringify(m.ctl.map(x => x.id + ':' + Math.round(x.t))));
  return m;
}

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME, args: ['--autoplay-policy=no-user-gesture-required'] });

  // ===== 1) Celular 390×844 con toques reales: Axo =====
  let p = await abrir(b, { width: 390, height: 844 }, TACTIL);
  let fr = await abrirAxo(p);
  ok('Axo: por omisión «🎮 Mando clásico»', await fr.$eval('#ov-titulo [data-control="mando"]', x => x.getAttribute('aria-pressed')) === 'true' && await fr.evaluate(() => window.__plat.control()) === 'mando');
  ok('Axo: la portada ofrece «🔘 Botones» y «⌨️ Controles»', !!(await fr.$('#ov-titulo [data-control="botones"]')) && (await fr.textContent('#ov-titulo')).includes('⌨️ Controles'));
  ok('Axo: sin la palabra de la marca en la interfaz', !/nintendo/i.test(await fr.evaluate(() => document.body.innerText)));
  await p.screenshot({ path: 'mando-axo-390-portada.png' });
  await entrarNivel(fr);
  ok('Axo jugando: mando visible y botones de antes ocultos', await fr.isVisible('.mando') && !(await fr.isVisible('#mandos')));
  await revisarLayout(fr, 'Axo 390×844', 'A,B,START,der,izq');
  const d = dedos(p);
  const cDer = await centro(fr, '.mando-cruceta .der'), cA = await centro(fr, '.mando-boton[data-b="A"]'), cB = await centro(fr, '.mando-boton[data-b="B"]');
  const e0 = await fr.evaluate(() => window.__plat.estado());
  const scroll0 = await p.evaluate(() => scrollY);
  await d.poner(1, cDer); await sleep(450);
  await d.mover(1, { x: cDer.x + 6, y: cDer.y + 14 }); // el pulgar se mueve sobre la cruceta
  await d.poner(2, cA); await sleep(120);
  const t1 = await fr.evaluate(() => window.__plat.tecla());
  const e1 = await fr.evaluate(() => window.__plat.estado());
  ok('toques: cruceta → y A a la vez (multitáctil)', t1.der && t1.saltar && !t1.izq, JSON.stringify(t1));
  ok('toques: Axo avanza y salta al mismo tiempo', e1.x > e0.x + 20 && e1.y < e0.y - 4, JSON.stringify({ x: [e0.x, e1.x], y: [e0.y, e1.y] }));
  ok('toques: la página de Juegos no se desplaza', (await p.evaluate(() => scrollY)) === scroll0);
  await p.screenshot({ path: 'mando-axo-390-vertical.png' });
  await d.mover(2, cB); await sleep(80);
  const t2 = await fr.evaluate(() => window.__plat.tecla());
  ok('toques: deslizar el dedo de A a B cambia la tecla', !t2.saltar && t2.fuego && t2.der, JSON.stringify(t2));
  await d.quitar(1); await sleep(60);
  const t3 = await fr.evaluate(() => window.__plat.tecla());
  ok('toques: soltar un dedo no suelta el otro', !t3.der && t3.fuego, JSON.stringify(t3));
  await d.soltarTodo(); await sleep(60);
  const t4 = await fr.evaluate(() => window.__plat.tecla());
  ok('toques: al soltar todo no queda nada presionado', !t4.der && !t4.fuego && !t4.saltar && (await fr.evaluate(() => window.__plat.mando().dedos)) === 0, JSON.stringify(t4));
  // START en el mando pausa; otra vez, sigue.
  await tocar(p, await centro(fr, '.mando-pildora[data-b="START"]')); await sleep(100);
  ok('toques: START pausa a Axo', (await fr.evaluate(() => window.__plat.estado().modo)) === 'pausa' && await fr.isVisible('#ov-pausa'));
  await p.screenshot({ path: 'mando-axo-390-pausa.png' });
  await tocar(p, await centro(fr, '.mando-pildora[data-b="START"]')); await sleep(100);
  ok('toques: START otra vez sigue el nivel', (await fr.evaluate(() => window.__plat.estado().modo)) === 'nivel');
  // Preferencia: «🔘 Botones» se recuerda tras recargar.
  await tocar(p, await centro(fr, '.mando-pildora[data-b="START"]')); await sleep(100);
  await fr.click('#ov-pausa [data-control="botones"]');
  ok('Axo: elegir «🔘 Botones» oculta el mando', (await fr.evaluate(() => window.__plat.control())) === 'botones' && !(await fr.isVisible('.mando')));
  await p.reload(); await p.waitForSelector('[data-juego="plataformas"]', { timeout: 60000 });
  fr = await abrirAxo(p);
  ok('preferencia recordada: Axo abre con «🔘 Botones»', await fr.$eval('#ov-titulo [data-control="botones"]', x => x.getAttribute('aria-pressed')) === 'true');
  await entrarNivel(fr);
  ok('con «🔘 Botones» se ven los botones de antes y no el mando', await fr.isVisible('#mandos') && !(await fr.isVisible('.mando')));
  await p.screenshot({ path: 'mando-axo-390-botones.png' });
  // El botón de antes sigue funcionando con toque real.
  const xb = (await fr.evaluate(() => window.__plat.estado())).x;
  const d2 = dedos(p); await d2.poner(1, await centro(fr, '#mandos [data-k="der"]')); await sleep(400); await d2.soltarTodo();
  ok('con «🔘 Botones», ▶ mueve a Axo', (await fr.evaluate(() => window.__plat.estado())).x > xb + 15);
  await fr.evaluate(() => window.__plat.alMapa());
  await fr.evaluate(() => { localStorage.setItem('plataformas_control', 'mando'); });

  // ===== 2) Dragon Run con toques reales (390×844) =====
  await p.click('[data-a="salir"]').catch(() => {});
  await p.reload(); await p.waitForSelector('[data-juego="dragon-run"]', { timeout: 60000 });
  await p.click('[data-juego="dragon-run"]');
  let fd = await marcoDe(p, '#dragon-frame');
  await fd.waitForFunction(() => window.__dragonPrueba && document.querySelectorAll('#misiones .mis[data-tipo]').length === 3, null, { timeout: 20000 });
  ok('Dragon: por omisión «🎮 Mando clásico» y guía en la pantalla de misiones', (await fd.evaluate(() => window.__dragonPrueba.control())) === 'mando' && (await fd.textContent('#ovS')).includes('⌨️ Controles'));
  await fd.click('#bS'); await fd.waitForFunction(() => window.__dragon.st === 'play'); await sleep(300);
  const mD = await medir(fd);
  ok('Dragon 390: solo A y START, dentro de la pantalla y debajo del juego', mD.ctl.map(x => x.id).sort().join(',') === 'A,START' && mD.ctl.every(x => dentro(x, mD.vw, mD.vh)) && mD.mando.t >= mD.canvas.b - 1, JSON.stringify(mD.ctl.map(x => x.id)));
  await tocar(p, await centro(fd, '.mando-boton[data-b="A"]')); await sleep(60);
  const s1 = await fd.evaluate(() => window.__dragon);
  ok('toques: A salta en Dragon Run (una sola vez, sin el salto del toque en pantalla)', s1.saltos === 1 && s1.air, JSON.stringify(s1));
  await tocar(p, await centro(fd, '.mando-boton[data-b="A"]')); await sleep(30);
  ok('toques: A en el aire hace el doble salto', (await fd.evaluate(() => window.__dragon.saltos)) === 2);
  await p.screenshot({ path: 'mando-dragon-390-vertical.png' });
  await tocar(p, await centro(fd, '.mando-pildora[data-b="START"]')); await sleep(150);
  const dist1 = await fd.evaluate(() => window.__dragon.dist); await sleep(400);
  ok('toques: START pausa Dragon Run («⏸ Pausa») y la carrera no avanza', (await fd.evaluate(() => window.__dragon.st)) === 'pause' && await fd.isVisible('#ovP') && (await fd.evaluate(() => window.__dragon.dist)) === dist1);
  await p.screenshot({ path: 'mando-dragon-390-pausa.png' });
  await tocar(p, await centro(fd, '.mando-pildora[data-b="START"]')); await sleep(300);
  ok('toques: START otra vez sigue la carrera', (await fd.evaluate(() => window.__dragon.st)) === 'play' && (await fd.evaluate(() => window.__dragon.dist)) > dist1);
  // Preferencia: «👆 Tocar la pantalla».
  await fd.evaluate(() => { localStorage.setItem('dragon_control', 'toque'); });
  await p.reload(); await p.waitForSelector('[data-juego="dragon-run"]', { timeout: 60000 });
  await p.click('[data-juego="dragon-run"]');
  fd = await marcoDe(p, '#dragon-frame');
  await fd.waitForFunction(() => window.__dragonPrueba && document.querySelectorAll('#misiones .mis[data-tipo]').length === 3, null, { timeout: 20000 });
  ok('preferencia recordada: Dragon abre con «👆 Tocar la pantalla»', await fd.$eval('[data-control="toque"]', x => x.getAttribute('aria-pressed')) === 'true');
  await fd.click('#bS'); await fd.waitForFunction(() => window.__dragon.st === 'play'); await sleep(300);
  ok('con «👆 Tocar la pantalla» no se ve el mando', !(await fd.isVisible('.mando')));
  await tocar(p, await centro(fd, 'canvas'));
  ok('con «👆 Tocar la pantalla», tocar el juego salta', (await fd.evaluate(() => window.__dragon.saltos)) === 1);
  await p.screenshot({ path: 'mando-dragon-390-toque.png' });
  await p.context().close();

  // ===== 3) Capturas y medidas a 360×640 y en horizontal =====
  for (const [w, h] of [[360, 640], [640, 360], [844, 390]]) {
    const q = await abrir(b, { width: w, height: h }, TACTIL);
    const f = await abrirAxo(q);
    await entrarNivel(f);
    await revisarLayout(f, `Axo ${w}×${h}`, 'A,B,START,der,izq');
    await q.screenshot({ path: `mando-axo-${w}x${h}.png` });
    // Moverse con toque real también en esta medida.
    const x0 = (await f.evaluate(() => window.__plat.estado())).x;
    const dd = dedos(q); await dd.poner(1, await centro(f, '.mando-cruceta .der')); await sleep(400); await dd.soltarTodo();
    ok(`Axo ${w}×${h}: la cruceta mueve a Axo`, (await f.evaluate(() => window.__plat.estado())).x > x0 + 15);
    await q.click('[data-a="salir"]').catch(() => {});
    await q.click('[data-juego="dragon-run"]');
    const g = await marcoDe(q, '#dragon-frame');
    await g.waitForFunction(() => window.__dragonPrueba && document.querySelectorAll('#misiones .mis[data-tipo]').length === 3, null, { timeout: 20000 });
    await g.click('#bS'); await g.waitForFunction(() => window.__dragon.st === 'play'); await sleep(300);
    const md = await medir(g);
    ok(`Dragon ${w}×${h}: A y START dentro de la pantalla`, md.ctl.length === 2 && md.ctl.every(x => dentro(x, md.vw, md.vh)) && md.ancho <= md.vw, JSON.stringify(md.ctl));
    await q.screenshot({ path: `mando-dragon-${w}x${h}.png` });
    await q.context().close();
  }

  // ===== 4) Escritorio con teclado =====
  const pe = await abrir(b, { width: 1280, height: 800 });
  const fe = await abrirAxo(pe);
  ok('escritorio: el texto de la portada explica J y Enter', /J, ESPACIO o ↑ para saltar/.test(await fe.textContent('#teclas')) && await fe.isVisible('#teclas'));
  await entrarNivel(fe);
  ok('escritorio: sin mando en la pantalla', !(await fe.isVisible('.mando')) && !(await fe.isVisible('#mandos')));
  await fe.click('canvas', { force: true });
  const k0 = await fe.evaluate(() => window.__plat.estado());
  await pe.keyboard.down('ArrowRight'); await sleep(350); await pe.keyboard.down('KeyJ'); await sleep(110);
  const k1 = await fe.evaluate(() => window.__plat.estado()), kt = await fe.evaluate(() => window.__plat.tecla());
  ok('teclado: → y J (A) a la vez: avanza y salta', kt.der && kt.saltar && k1.x > k0.x + 15 && k1.y < k0.y - 4, JSON.stringify({ kt, x: [k0.x, k1.x], y: [k0.y, k1.y] }));
  await pe.keyboard.up('KeyJ'); await pe.keyboard.up('ArrowRight');
  await pe.keyboard.down('KeyK'); await sleep(50);
  ok('teclado: K es B (fuego)', (await fe.evaluate(() => window.__plat.tecla())).fuego);
  await pe.keyboard.up('KeyK');
  await pe.screenshot({ path: 'mando-escritorio-axo.png' });
  await pe.keyboard.press('Enter'); await sleep(100);
  ok('teclado: Enter (START) pausa', (await fe.evaluate(() => window.__plat.estado().modo)) === 'pausa');
  await fe.click('#ov-pausa .mando-guia-btn');
  await fe.waitForSelector('.mando-guia:not([hidden])');
  const guia = await fe.textContent('.mando-guia');
  ok('guía «⌨️ Controles»: acciones, teclas y control', /Saltar/.test(guia) && /Fuego/.test(guia) && /Pausa/.test(guia) && /J/.test(guia) && /Enter/.test(guia) && /Botón de abajo/.test(guia) && !/nintendo|xbox|playstation/i.test(guia), guia.slice(0, 200));
  await pe.screenshot({ path: 'mando-escritorio-guia.png' });
  await pe.keyboard.press('Escape'); await sleep(80);
  ok('guía: se cierra con Esc sin quitar la pausa', !(await fe.isVisible('.mando-guia')) && (await fe.evaluate(() => window.__plat.estado().modo)) === 'pausa');
  await fe.focus('#b-seguir'); await pe.keyboard.press('Enter'); await sleep(100);
  ok('teclado: Enter sobre «▶ Seguir» usa el botón (no lo intercepta el mando)', (await fe.evaluate(() => window.__plat.estado().modo)) === 'nivel');
  await pe.click('[data-a="salir"]').catch(() => {});
  await pe.click('[data-juego="dragon-run"]');
  const fde = await marcoDe(pe, '#dragon-frame');
  await fde.waitForFunction(() => window.__dragonPrueba && document.querySelectorAll('#misiones .mis[data-tipo]').length === 3, null, { timeout: 20000 });
  await fde.click('#bS'); await fde.waitForFunction(() => window.__dragon.st === 'play'); await sleep(200);
  await pe.keyboard.press('KeyJ'); await sleep(40);
  ok('teclado: J salta en Dragon Run', (await fde.evaluate(() => window.__dragon.saltos)) === 1);
  await pe.keyboard.press('Enter'); await sleep(80);
  ok('teclado: Enter pausa Dragon Run', (await fde.evaluate(() => window.__dragon.st)) === 'pause');
  await pe.screenshot({ path: 'mando-escritorio-dragon-pausa.png' });
  await pe.keyboard.press('Enter'); await sleep(80);
  ok('teclado: Enter otra vez sigue (también con el foco en SEGUIR)', (await fde.evaluate(() => window.__dragon.st)) === 'play');
  await pe.context().close();

  // ===== 5) Control físico simulado (Gamepad API) =====
  const pg = await abrir(b, { width: 1280, height: 800 }, undefined, GAMEPAD);
  const fg = await abrirAxo(pg);
  await entrarNivel(fg);
  const pad = (presionados = [], ejes = [0, 0, 0, 0]) => ({ id: 'Control de prueba', index: 0, connected: true, mapping: 'standard', axes: ejes, buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: presionados.includes(i), value: presionados.includes(i) ? 1 : 0 })) });
  await fg.evaluate(v => { window.__pads = [v, null, null, null]; }, pad());
  await fg.waitForSelector('.mando-aviso.ver', { timeout: 5000 }).catch(() => null); await sleep(300);
  ok('control físico: aviso «🎮 Control conectado»', (await fg.textContent('.mando-aviso')).includes('🎮 Control conectado'));
  await pg.screenshot({ path: 'mando-control-conectado.png' });
  const g0 = await fg.evaluate(() => window.__plat.estado());
  await fg.evaluate(v => { window.__pads = [v]; }, pad([15]));
  await sleep(400);
  await fg.evaluate(v => { window.__pads = [v]; }, pad([15, 0]));
  await sleep(110);
  const gt = await fg.evaluate(() => window.__plat.tecla()), g1 = await fg.evaluate(() => window.__plat.estado());
  ok('control físico: cruceta → y botón de abajo (A): avanza y salta', gt.der && gt.saltar && g1.x > g0.x + 15 && g1.y < g0.y - 4, JSON.stringify({ gt, x: [g0.x, g1.x], y: [g0.y, g1.y] }));
  await fg.evaluate(v => { window.__pads = [v]; }, pad([], [-0.9, 0.05, 0, 0]));
  await sleep(80);
  const gp = await fg.evaluate(() => ({ t: window.__plat.tecla(), e: window.__plat.mando().eje }));
  ok('control físico: palanca izquierda a la izquierda = cruceta ←', gp.t.izq && !gp.t.der && !gp.t.saltar && gp.e.x < -0.8, JSON.stringify(gp));
  await fg.evaluate(v => { window.__pads = [v]; }, pad([9]));
  await sleep(80);
  ok('control físico: Start pausa', (await fg.evaluate(() => window.__plat.estado().modo)) === 'pausa');
  await fg.evaluate(() => { window.__pads = [null]; });
  await sleep(150);
  ok('control físico: aviso al desconectar', (await fg.textContent('.mando-aviso')).includes('desconectado'));
  await pg.context().close();

  // ===== 6) El mando completo (palanca y todos los botones) y errores de la API =====
  const pc = await (await b.newContext({ viewport: { width: 390, height: 844 }, ...TACTIL })).newPage();
  pc.on('pageerror', e => out.push('FAIL error JS (completo): ' + e.message));
  await pc.setContent('<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0"><script src="' + BASE + '/juegos/mando.js"></script></body></html>');
  await pc.waitForFunction(() => !!window.Mando);
  const err = await pc.evaluate(() => { try { window.Mando.crear({ acciones: { correr: 'Z' } }); return ''; } catch (e) { return e.message; } });
  ok('API: un botón desconocido lanza error con su nombre', /«Z»/.test(err) && /correr/.test(err), err);
  await pc.evaluate(() => {
    const c = document.createElement('div'); c.id = 'demo'; c.style.cssText = 'position:fixed;inset:0;z-index:20;display:flex;flex-direction:column;background:#5db4f5';
    const s = document.createElement('div'); s.style.flex = '1'; c.appendChild(s); document.body.appendChild(c);
    window.demo = window.Mando.crear({ contenedor: c, analogico: true, visible: true, acciones: { mover: ['arriba', 'abajo', 'izq', 'der'], a: 'A', b: 'B', x: 'X', y: 'Y', l: 'L', r: 'R', start: 'START', select: 'SELECT' } });
  });
  const pal = await centro(pc, '#demo .mando-palanca');
  const dp = dedos(pc); await dp.poner(1, pal); await dp.mover(1, { x: pal.x + 60, y: pal.y }); await sleep(60);
  const ej = await pc.evaluate(() => ({ eje: window.demo.eje(), mover: window.demo.presionado('mover') }));
  ok('palanca: arrastrar a la derecha da eje x positivo y presiona la dirección', ej.eje.x > 0.6 && Math.abs(ej.eje.y) < 0.2 && ej.mover, JSON.stringify(ej));
  await dp.poner(2, await centro(pc, '#demo .mando-gatillo[data-b="R"]')); await sleep(60);
  ok('palanca + R a la vez', await pc.evaluate(() => window.demo.presionado('r') && window.demo.eje().x > 0.6));
  await pc.screenshot({ path: 'mando-completo-390.png' });
  await dp.soltarTodo(); await sleep(60);
  ok('palanca: al soltar regresa al centro', await pc.evaluate(() => { const e = window.demo.eje(); return e.x === 0 && e.y === 0 && !window.demo.presionado('r'); }));
  const dg = await centro(pc, '#demo .mando-cruceta'); await dp.poner(3, { x: dg.x + 40, y: dg.y - 40 }); await sleep(60);
  ok('cruceta: la diagonal presiona dos direcciones', JSON.stringify(await pc.evaluate(() => window.demo.estado().botones)) === '["arriba","der"]');
  await dp.soltarTodo();
  await pc.context().close();

  await b.close();
  console.log(out.join('\n')); process.exit(out.some(x => x.startsWith('FAIL')) ? 1 : 0);
})().catch(e => { console.log(out.join('\n')); console.error('ERROR', e.message.slice(0, 400)); process.exit(2); });
