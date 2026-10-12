// E2E: «⚽ Futbolito» (openspec: futbolito-billar).
// Catálogo en Arcade; individual contra el bot con TOQUES REALES (CDP Input.dispatchTouchEvent, hasTouch + isMobile):
// deslizar mueve la barra activa, un toque patea, la barra activa cambia sola; ganar a 5 suma ⭐ individuales.
// Horizontal 844×390 (deslizar vertical mueve la barra) y prefers-reduced-motion (sin confeti).
// Sala 1 persona + bot (tiro con toques reales, el bot tira, rendirse → podio y revancha) y sala de 2 personas
// (los dos aparatos ven el mismo estado tras cada tiro; podio en los dos). Capturas a 390 px y en horizontal.
// futbolito-equipos-controles: selector de controles recordado; 🔘 Botones con toques reales (flecha sostenida, PATEA al
// bajar el dedo aunque tiemble o dure 350 ms, PATEA con la flecha sostenida, 🔄 BARRA), barra activa con la pelota
// pegada por detrás, 👆 Deslizar, 🎮 Mando clásico (toques reales, recordado, control físico simulado), teclado
// (↑↓, Espacio, Tab, Q/E) y capturas a 320, 390 y 844×390; sala 2 vs 2 con 2 personas + 2 bots (formato, cambio de
// equipo, colores y nombres, tira quien maneja la barra con la pelota, no_es_tu_barra, mismo estado en los dos).
require('./lib/entorno');
const { chromium } = require('playwright');
const { abrirPagina } = require('./lib/navegador');
const API = process.env.API;
const out = []; const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const TACTIL = { hasTouch: true, isMobile: true };
const abrir = (b, email, viewport, contexto) => abrirPagina(b, { email, viejo: true, viewport, contexto: Object.assign({}, TACTIL, contexto || {}), out, etiqueta: email, dialogos: 'aceptar', ruta: '/juegos.html?arcadePrueba=1', esperar: '[data-juego="futbolito"]' });
const marcoDe = async (p, raiz = '') => (await p.waitForSelector(raiz + ' #arcade-frame', { timeout: 30000 })).contentFrame();
const estado = fr => fr.evaluate(() => window.__futbolito.estado());
const esperar = (fr, fn, arg, ms = 30000) => fr.waitForFunction(fn, arg, { timeout: ms });

// Dedos reales por CDP: cada evento lleva todos los dedos que siguen en la pantalla.
function dedos(p) {
  let cdp = null; const vivos = {};
  const enviar = async (type, puntos) => { cdp = cdp || await p.context().newCDPSession(p); await cdp.send('Input.dispatchTouchEvent', { type, touchPoints: puntos }); };
  return {
    poner: (id, x, y) => { vivos[id] = { x, y, id }; return enviar('touchStart', Object.values(vivos)); },
    mover: (id, x, y) => { vivos[id] = { x, y, id }; return enviar('touchMove', Object.values(vivos)); },
    soltarTodo: () => { for (const k in vivos) delete vivos[k]; return enviar('touchEnd', []); },
  };
}
// Arrastre real en pasos de 10 px.
async function arrastrar(p, x, y, dx, dy) {
  const d = dedos(p); await d.poner(1, x, y);
  const n = Math.max(1, Math.round(Math.max(Math.abs(dx), Math.abs(dy)) / 10));
  for (let i = 1; i <= n; i++) { await d.mover(1, x + dx * i / n, y + dy * i / n); await sleep(16); }
  await d.soltarTodo();
}
async function tocar(p, x, y) { const d = dedos(p); await d.poner(1, x, y); await sleep(40); await d.soltarTodo(); }
const cajaCanvas = async fr => fr.locator('#c').boundingBox();
const dentro = (r, vw, vh) => r && r.x >= -0.5 && r.y >= -0.5 && r.x + r.width <= vw + 0.5 && r.y + r.height <= vh + 0.5;

async function crearSala(p, bots, formato) {
  await p.click('[data-tab="partidas"]'); await p.waitForSelector('#f-crear');
  await p.selectOption('#p-juego', 'futbolito');
  if (formato) await p.selectOption('#p-formato', formato); // futbolito-equipos
  if ((await p.isChecked('#p-bots')) !== bots) await p.click('#p-bots');
  await p.click('#f-crear button[type=submit]'); await p.waitForSelector('[data-p="empezar"]', { timeout: 30000 });
  return (await p.textContent('#p-codigo-chip')).replace(/[^A-Z]/g, '');
}
// Tiro de sala con toques reales: desliza la barra, sube el ángulo y toca «¡Tirar!».
async function tirarSala(p, fr, dx) {
  await esperar(fr, () => window.__futbolito.estado().miTurno, null, 45000);
  const c = await cajaCanvas(fr);
  const antes = (await estado(fr)).posSala;
  await arrastrar(p, c.x + c.width / 2, c.y + c.height * 0.75, dx, 0);
  const despues = (await estado(fr)).posSala;
  const paso = (await estado(fr)).paso;
  await fr.tap('#b-tirar');
  await esperar(fr, n => window.__futbolito.estado().paso > n, paso, 15000);
  return { antes, despues, paso };
}
const firmaQuieta = async fr => { await esperar(fr, () => window.__futbolito.firma() !== null && !window.__futbolito.estado().animando, null, 30000); return fr.evaluate(() => window.__futbolito.firma()); };

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME });
  const p = await abrir(b, 'marisol@example.com', { width: 390, height: 844 });
  // ---- Catálogo ----
  const tarjeta = await p.textContent('[data-juego="futbolito"]');
  ok('catálogo: Futbolito en Arcade con ícono y descripción', tarjeta.includes('⚽') && tarjeta.includes('Futbolito') && /barra/.test(tarjeta) && (await p.$$('.cat-arcade[data-juego="futbolito"]')).length === 1, tarjeta);
  const total = await p.$$eval('[data-juego]', bs => bs.length);
  ok('catálogo: el menú muestra todos los juegos de la página (con Futbolito y Billar)', total === await p.evaluate(() => JUEGOS.length) && total >= 26, String(total));
  const puntosAntes = await p.evaluate(() => state.totalIndividual);

  // ---- Individual con toques reales (390×844) ----
  await p.tap('[data-juego="futbolito"]');
  let fr = await marcoDe(p);
  await fr.waitForSelector('#ov-menu:not(.hide)', { timeout: 30000 });
  ok('individual: menú con 3 niveles y ayuda táctil', (await fr.$$('[data-nivel]')).length === 3 && /PATEA/.test(await fr.textContent('#ayuda-menu')));
  await p.screenshot({ path: 'futbolito-390-menu.png' });
  await fr.tap('[data-nivel="facil"]');
  await esperar(fr, () => window.__futbolito.estado().modo === 'juego');
  await fr.evaluate(() => { window.__futbolito.pausarBot(); window.__futbolito.pelotaEnfrente(); });
  await sleep(200);
  let e = await estado(fr);
  ok('individual: la barra activa es la de tus medios con la pelota enfrente', e.puesto === 'medios' && e.activa === 4, JSON.stringify({ puesto: e.puesto }));
  const c = await cajaCanvas(fr);
  await fr.evaluate(() => window.__futbolito.ponerPelota(150, 235)); // lejos de los jugadores: la barra activa no cambia al deslizar
  const s0 = e.s[4];
  await arrastrar(p, c.x + c.width * 0.6, c.y + c.height * 0.75, -60, 0);
  await sleep(250);
  e = await estado(fr);
  ok('toque real: deslizar a la izquierda mueve la barra activa a la izquierda', e.s[4] < s0 - 10, JSON.stringify({ antes: s0, despues: e.s[4] }));
  // Capa de acciones (para un mando): mantener «barraMas» corre la barra; «cambiarBarra» cambia la activa.
  await fr.evaluate(() => window.__futbolito.ponerPelota(150, 235));
  const sA = (await estado(fr)).s[4];
  await fr.evaluate(() => window.accionesJuego.presionar('barraMas', true)); await sleep(300);
  await fr.evaluate(() => window.accionesJuego.presionar('barraMas', false));
  const sB = (await estado(fr)).s[4];
  await fr.evaluate(() => window.accionesJuego.presionar('cambiarBarra', true)); await fr.evaluate(() => window.accionesJuego.presionar('cambiarBarra', false));
  const tras = await estado(fr);
  ok('acciones: «barraMas» mueve la barra y «cambiarBarra» cambia la activa', sB > sA + 10 && tras.activa !== 4, JSON.stringify({ sA, sB, activa: tras.activa }));
  await fr.evaluate(() => window.__futbolito.pelotaEnfrente());
  await sleep(1600); // la barra automática vuelve a mandar tras el cambio manual
  await fr.evaluate(() => window.__futbolito.pelotaEnfrente());
  await sleep(60);
  const bp = await fr.locator('#c-patea').boundingBox();
  const dp = dedos(p); await dp.poner(1, bp.x + bp.width / 2, bp.y + bp.height / 2); await sleep(30); // toque real en «⚽ PATEA»
  e = await estado(fr); await dp.soltarTodo();
  ok('toque real: tocar «⚽ PATEA» patea y la pelota sale hacia la portería rival', e.pelota.vy < -200, JSON.stringify(e.pelota));
  await p.screenshot({ path: 'futbolito-390-juego.png' });
  await fr.evaluate(() => window.__futbolito.ponerPelota(150, 330));
  await sleep(100);
  e = await estado(fr);
  ok('cambio automático: con la pelota atrás de los medios la barra activa es la defensa', e.puesto === 'defensa', e.puesto);
  await sleep(2500); // medir con el juego corriendo solo (sin llamadas de la prueba en medio), como en Karts
  ok('individual: 60 cuadros por segundo', (await estado(fr)).fps >= 50, String((await estado(fr)).fps));
  for (let i = 0; i < 5; i++) await fr.evaluate(() => window.__futbolito.anotar(0));
  await fr.waitForSelector('#ov-res:not(.hide)', { timeout: 10000 });
  await fr.waitForFunction(() => /individuales|No se guardaron/.test(document.getElementById('res-guardado').textContent), null, { timeout: 20000 });
  const res = await fr.textContent('#ov-res');
  ok('ganar a 5: resultado con marcador y puntos en ⭐ individuales', /Ganaste/.test(res) && /5 – 0/.test(res) && /\+500 a tus ⭐ individuales/.test(res), res.slice(0, 160));
  ok('el total individual sube', (await p.evaluate(() => state.totalIndividual)) > puntosAntes);
  await p.screenshot({ path: 'futbolito-390-resultado.png' });
  await p.click('[data-a="salir"]').catch(() => {});

  // ---- Horizontal 844×390 ----
  const hor = await abrir(b, 'marisol@example.com', { width: 844, height: 390 });
  await hor.tap('[data-juego="futbolito"]');
  const fh = await marcoDe(hor);
  await fh.waitForSelector('#ov-menu:not(.hide)', { timeout: 30000 });
  await fh.tap('[data-nivel="dificil"]');
  await esperar(fh, () => window.__futbolito.estado().modo === 'juego');
  await fh.evaluate(() => { window.__futbolito.pausarBot(); window.__futbolito.pelotaEnfrente(); });
  await sleep(150);
  const eh = await estado(fh), ch = await cajaCanvas(fh);
  await arrastrar(hor, ch.x + ch.width * 0.3, ch.y + ch.height * 0.4, 0, 50);
  await sleep(250);
  const eh2 = await estado(fh);
  ok('horizontal: la mesa se ve de lado y deslizar hacia abajo mueve la barra', eh.horizontal && Math.abs(eh2.s[4] - eh.s[4]) > 8, JSON.stringify({ antes: eh.s[4], despues: eh2.s[4] }));
  ok('horizontal: el canvas cabe completo en la pantalla', dentro(await hor.locator('#arcade-frame').boundingBox(), 844, 390));
  await hor.screenshot({ path: 'futbolito-844-horizontal.png' });
  await hor.context().close();

  // ---- prefers-reduced-motion: sin confeti ----
  const red = await abrir(b, 'marisol@example.com', { width: 390, height: 844 }, { reducedMotion: 'reduce' });
  await red.tap('[data-juego="futbolito"]');
  const fred = await marcoDe(red);
  await fred.waitForSelector('#ov-menu:not(.hide)', { timeout: 30000 });
  await fred.tap('[data-nivel="medio"]');
  await esperar(fred, () => window.__futbolito.estado().modo === 'juego');
  for (let i = 0; i < 5; i++) await fred.evaluate(() => window.__futbolito.anotar(0));
  await fred.waitForSelector('#ov-res:not(.hide)', { timeout: 10000 });
  ok('prefers-reduced-motion: gana sin confeti', (await fred.$$('#confeti i')).length === 0);
  await red.context().close();

  // ---- Controles (futbolito-equipos-controles): suelto, toques reales ----
  const abrirSuelto = (vp, init) => abrirPagina(b, { viewport: vp, contexto: TACTIL, init, out, etiqueta: 'futbolito suelto', ruta: '/juegos/futbolito.html?prueba=1', esperar: '#ov-menu:not(.hide)' });
  const centro = async (pg, sel) => { const r = await pg.locator(sel).boundingBox(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; };
  const sostenerEn = async (pg, sel, ms) => { const d = dedos(pg), m = await centro(pg, sel); await d.poner(1, m.x, m.y); await sleep(ms); const e = await estado(pg); await d.soltarTodo(); return e; };
  const s1 = await abrirSuelto({ width: 390, height: 844 });
  ok('controles: selector con 🔘 Botones (por omisión), 👆 Deslizar y 🎮 Mando clásico', (await s1.$$('#menu-control [data-control]')).length === 3 && await s1.getAttribute('[data-control="botones"]', 'aria-pressed') === 'true');
  await s1.screenshot({ path: 'futbolito-390-menu-controles.png' });
  await s1.tap('[data-nivel="facil"]');
  await esperar(s1, () => window.__futbolito.estado().modo === 'juego');
  await s1.evaluate(() => window.__futbolito.pausarBot());
  const tam = await s1.evaluate(() => ['#c-menos', '#c-mas', '#c-patea', '#c-barra'].map(q => { const r = document.querySelector(q).getBoundingClientRect(); return [q, Math.round(r.width), Math.round(r.height)]; }));
  ok('botones: flechas, «⚽ PATEA» y «🔄 BARRA» a la vista y grandes (≥ 56 px)', tam.every(([, w, h]) => w >= 56 && h >= 56), JSON.stringify(tam));
  await s1.evaluate(() => window.__futbolito.ponerPelota(150, 300)); await sleep(150); // defensa activa (corre 81 u)
  let ia = (await estado(s1)).activa, sx0 = (await estado(s1)).s[ia];
  let ex = await sostenerEn(s1, '#c-mas', 220); await sleep(150);
  const sx2 = (await estado(s1)).s[ia]; await sleep(250);
  const sx3 = (await estado(s1)).s[ia];
  ok('botones: sostener ▶ (toque real) corre la barra a la derecha y al soltar se detiene', ex.s[ia] > sx0 + 15 && Math.abs(sx3 - sx2) < 0.5 && ex.activa === ia, JSON.stringify({ ia, sx0, sostenido: ex.s[ia], suelto: [sx2, sx3] }));
  // PATEA al bajar el dedo: sin soltar, con temblor de 14 px y 350 ms abajo (antes se perdía).
  await s1.evaluate(() => window.__futbolito.pelotaEnfrente()); await sleep(60);
  const d1 = dedos(s1), mp = await centro(s1, '#c-patea');
  await d1.poner(1, mp.x, mp.y); await sleep(50);
  const alBajar = await estado(s1);
  await d1.mover(1, mp.x + 14, mp.y); await sleep(300); await d1.soltarTodo();
  ok('PATEA: patea al bajar el dedo, aunque tiemble 14 px y dure 350 ms', alBajar.patada[4] > 0 && Math.hypot(alBajar.pelota.vx, alBajar.pelota.vy) > 150, JSON.stringify({ patada: alBajar.patada[4], vy: alBajar.pelota.vy }));
  await sleep(400); await s1.evaluate(() => window.__futbolito.pelotaEnfrente()); await sleep(60);
  const ml = await centro(s1, '#c-menos');
  await d1.poner(1, ml.x, ml.y); await sleep(80); await d1.poner(2, mp.x, mp.y); await sleep(50);
  const dosDedos = await estado(s1); await d1.soltarTodo();
  ok('PATEA con la flecha ◀ sostenida (dos dedos)', dosDedos.patada[4] > 0, JSON.stringify({ patada: dosDedos.patada[4] }));
  await s1.evaluate(() => window.__futbolito.ponerPelota(150, 235)); await sleep(120);
  const act0 = (await estado(s1)).activa;
  await sostenerEn(s1, '#c-barra', 60); await sleep(80);
  const tb = await estado(s1);
  ok('«🔄 BARRA» cambia la barra activa y dice cuál («· tú»)', tb.activa !== act0 && /tú/.test(await s1.textContent('#c-barra')), JSON.stringify({ act0, activa: tb.activa, txt: await s1.textContent('#c-barra') }));
  await sleep(2700); // el cambio manual manda 2.5 s
  await s1.evaluate(() => window.__futbolito.ponerPelota(178, 278)); await sleep(150);
  ok('barra activa: con la pelota pegada por detrás de los medios siguen activos los medios', (await estado(s1)).puesto === 'medios' && /Medios/.test(await s1.textContent('#c-barra')), (await estado(s1)).puesto);
  await s1.screenshot({ path: 'futbolito-390-botones.png' });
  // 👆 Deslizar (🎮 del HUD cambia al siguiente control)
  await s1.tap('#b-control'); await sleep(150);
  ok('🎮 del HUD cambia a 👆 Deslizar: sin flechas ni PATEA', (await estado(s1)).control === 'deslizar' && !(await s1.isVisible('#c-mas')) && !(await s1.isVisible('#c-patea')) && await s1.isVisible('#c-barra'));
  await s1.evaluate(() => window.__futbolito.ponerPelota(150, 300)); await sleep(150);
  const cv = await cajaCanvas(s1);
  ia = (await estado(s1)).activa; sx0 = (await estado(s1)).s[ia];
  await arrastrar(s1, cv.x + cv.width * 0.25, cv.y + cv.height * 0.6, 40, 0); await sleep(150);
  ok('deslizar: en la mitad izquierda corre la barra', (await estado(s1)).s[ia] > sx0 + 15, JSON.stringify({ antes: sx0, despues: (await estado(s1)).s[ia] }));
  await s1.evaluate(() => window.__futbolito.pelotaEnfrente()); await sleep(60);
  await d1.poner(1, cv.x + cv.width * 0.75, cv.y + cv.height * 0.5); await sleep(50);
  const toqueDer = await estado(s1); await d1.soltarTodo();
  ok('deslizar: tocar la mitad derecha patea al bajar el dedo', toqueDer.patada[4] > 0, String(toqueDer.patada[4]));
  await sleep(1500); // si la patada fue gol, el saque espera 1.2 s
  // 🎮 Mando clásico con toques reales
  await s1.tap('#b-control'); await sleep(200);
  ok('🎮 Mando clásico: se ve el mando y no los botones', (await estado(s1)).control === 'mando' && await s1.isVisible('.mando') && !(await s1.isVisible('#controles')));
  await s1.evaluate(() => window.__futbolito.ponerPelota(150, 300));
  await esperar(s1, () => window.__futbolito.estado().activa === 6, null, 5000); await sleep(100);
  ia = (await estado(s1)).activa; sx0 = (await estado(s1)).s[ia];
  ex = await sostenerEn(s1, '.mando-cruceta [data-dir="der"]', 220);
  ok('mando: cruceta ▶ (toque real) corre la barra', ex.s[ia] > sx0 + 15, JSON.stringify({ ia, activa: ex.activa, antes: sx0, despues: ex.s[ia], modo: ex.modo, mando: ex.mando }));
  await s1.evaluate(() => window.__futbolito.pelotaEnfrente()); await sleep(60);
  ex = await sostenerEn(s1, '.mando [data-b="A"]', 60);
  ok('mando: A patea', ex.patada[4] > 0, String(ex.patada[4]));
  await sleep(300); await s1.evaluate(() => window.__futbolito.ponerPelota(150, 235)); await sleep(100);
  const actB = (await estado(s1)).activa;
  await sostenerEn(s1, '.mando [data-b="B"]', 60);
  ok('mando: B cambia de barra', (await estado(s1)).activa !== actB);
  await sostenerEn(s1, '.mando [data-b="START"]', 60);
  const enPausa = (await estado(s1)).modo;
  await sostenerEn(s1, '.mando [data-b="START"]', 60);
  ok('mando: START pausa y START sigue', enPausa === 'pausa' && (await estado(s1)).modo === 'juego', enPausa);
  await s1.screenshot({ path: 'futbolito-390-mando.png' });
  await s1.reload(); await s1.waitForSelector('#ov-menu:not(.hide)');
  ok('la elección se recuerda al recargar (🎮 Mando clásico)', await s1.getAttribute('[data-control="mando"]', 'aria-pressed') === 'true');
  // Teclado: ↓ corre (vertical: ↓ = →), Espacio patea, Tab y Q cambian de barra.
  await s1.tap('[data-control="botones"]');
  await s1.tap('[data-nivel="facil"]'); await esperar(s1, () => window.__futbolito.estado().modo === 'juego');
  await s1.evaluate(() => { window.__futbolito.pausarBot(); window.__futbolito.ponerPelota(150, 300); }); await sleep(150);
  ia = (await estado(s1)).activa; sx0 = (await estado(s1)).s[ia];
  await s1.keyboard.down('ArrowDown'); await sleep(200); await s1.keyboard.up('ArrowDown');
  const kDown = (await estado(s1)).s[ia];
  await s1.evaluate(() => window.__futbolito.pelotaEnfrente()); await sleep(60);
  await s1.keyboard.press('Space'); await sleep(40);
  const kPat = (await estado(s1)).patada[4];
  await s1.evaluate(() => window.__futbolito.ponerPelota(150, 235)); await sleep(100);
  const k0 = (await estado(s1)).activa;
  await s1.keyboard.press('Tab'); const k1 = (await estado(s1)).activa;
  await s1.keyboard.press('KeyQ'); const k2 = (await estado(s1)).activa;
  ok('teclado: ↓ corre la barra, Espacio patea, Tab siguiente y Q anterior', kDown > sx0 + 10 && kPat > 0 && k1 !== k0 && k2 === k0, JSON.stringify({ sx0, kDown, kPat, k0, k1, k2 }));
  await s1.context().close();
  // Control físico simulado: botón de abajo patea y la palanca corre la barra (con cualquier control elegido).
  const GAMEPAD = [() => { Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => window.__pads || [null, null, null, null] }); }];
  const pad = (presionados = [], ejes = [0, 0, 0, 0]) => ({ id: 'Control de prueba', index: 0, connected: true, mapping: 'standard', axes: ejes, buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: presionados.includes(i), value: presionados.includes(i) ? 1 : 0 })) });
  const s2 = await abrirSuelto({ width: 390, height: 844 }, GAMEPAD);
  await s2.tap('[data-nivel="facil"]'); await esperar(s2, () => window.__futbolito.estado().modo === 'juego');
  await s2.evaluate(() => { window.__futbolito.pausarBot(); window.__futbolito.pelotaEnfrente(); }); await sleep(60);
  await s2.evaluate(x => { window.__pads = [x]; }, pad([0])); await sleep(150);
  const gpPat = (await estado(s2)).patada[4];
  await s2.evaluate(() => { window.__pads = null; window.__futbolito.ponerPelota(150, 300); }); await sleep(150);
  ia = (await estado(s2)).activa; sx0 = (await estado(s2)).s[ia];
  await s2.evaluate(x => { window.__pads = [x]; }, pad([], [1, 0, 0, 0])); await sleep(250);
  await s2.evaluate(() => { window.__pads = null; });
  ok('control físico: el botón de abajo patea y la palanca corre la barra (con 🔘 Botones elegido)', gpPat > 0 && (await estado(s2)).s[ia] > sx0 + 15, JSON.stringify({ gpPat, antes: sx0, despues: (await estado(s2)).s[ia] }));
  await s2.context().close();
  // Distribución: 320×640 (Botones y Mando) y 844×390 (los botones no tapan la mesa).
  for (const [w, h, control] of [[320, 640, 'botones'], [320, 640, 'mando'], [844, 390, 'botones'], [844, 390, 'mando']]) {
    const sp = await abrirSuelto({ width: w, height: h });
    await sp.tap('[data-control="' + control + '"]'); await sp.tap('[data-nivel="medio"]');
    await esperar(sp, () => window.__futbolito.estado().modo === 'juego'); await sleep(300);
    const lay = await sp.evaluate(() => {
      const r = e => { const b = e.getBoundingClientRect(); return { l: b.left, t: b.top, r: b.right, b: b.bottom }; };
      const vis = e => e && e.getBoundingClientRect().width > 0 && getComputedStyle(e).display !== 'none' && getComputedStyle(e).visibility !== 'hidden';
      const ctl = [...document.querySelectorAll('#controles button, .mando [data-b]:not(.mando-oculto), .mando-cruceta i[data-dir]:not(.mando-oculto)')].filter(vis).map(r);
      return { vw: innerWidth, vh: innerHeight, ctl, mesa: window.__futbolito.rectMesa() };
    });
    const dentroVista = lay.ctl.every(c => c.l >= -0.5 && c.t >= -0.5 && c.r <= lay.vw + 0.5 && c.b <= lay.vh + 0.5);
    const cruza = lay.ctl.filter(c => c.l < lay.mesa.r - 2 && c.r > lay.mesa.l + 2 && c.t < lay.mesa.b - 2 && c.b > lay.mesa.t + 2);
    ok('distribución ' + w + '×' + h + ' (' + control + '): controles completos en pantalla y sin tapar la mesa', lay.ctl.length >= 3 && dentroVista && !cruza.length, JSON.stringify({ n: lay.ctl.length, cruza: cruza.length, mesa: lay.mesa }));
    await sp.screenshot({ path: 'futbolito-' + w + 'x' + h + '-' + control + '.png' });
    await sp.context().close();
  }

  // ---- Sala: 1 persona + bot ----
  const codigoBot = await crearSala(p, true);
  ok('sala con bot: la mesa dice «1 persona + 1 bot»', /Mesa de 2 · 1 persona \+ 1 bot/.test(await p.textContent('#p-mesa')), await p.textContent('#p-mesa'));
  await p.click('[data-p="empezar"]');
  const fs = await marcoDe(p, '#p-body');
  await esperar(fs, () => window.__futbolito && window.__futbolito.estado().sala && window.__futbolito.estado().miTurno, null, 30000);
  await p.screenshot({ path: 'futbolito-390-sala-bot.png' });
  const t1 = await tirarSala(p, fs, -50);
  ok('sala con bot: deslizar mueve tu barra con la pelota y «¡Tirar!» manda el tiro', t1.despues !== t1.antes, JSON.stringify(t1));
  await sleep(1500);
  const sal = await (await fetch(API + '/juegos/sala/' + codigoBot + '?email=marisol%40example.com')).json();
  const j0 = ((sal.jugadores || []).find(x => x.nombre) || {}).jugadas || [];
  ok('servidor: el tiro se guardó como jugada { n, tiro, pos, angulo, fuerza }', j0.length >= 1 && j0[0].accion === 'tiro' && Number.isInteger(j0[0].pos) && Number.isInteger(j0[0].angulo) && Number.isInteger(j0[0].fuerza), JSON.stringify(j0[0]));
  // Esperar a que vuelva a ser tu turno (el bot tira si le toca) y rendirse.
  await esperar(fs, () => window.__futbolito.estado().miTurno, null, 60000);
  const hubo = await estado(fs);
  ok('sala con bot: la partida avanza con tus tiros y los del bot', hubo.paso >= 1 && hubo.mostrados === hubo.paso, JSON.stringify({ paso: hubo.paso }));
  await fs.tap('#b-rendir');
  await p.waitForSelector('#p-body .result', { timeout: 30000 });
  await sleep(1200);
  const podio = await p.textContent('#p-body');
  ok('sala con bot: rendirse → podio con el bot ganador y revancha', /BOT-VACHIRA/.test(podio) && /rendición/.test(podio) && await p.isVisible('[data-p="revancha"]'), podio.slice(0, 160));
  ok('sala con bot: puntos de sala en 👥 partidas', /partidas/.test(await p.textContent('#p-guardado')), await p.textContent('#p-guardado'));
  await p.screenshot({ path: 'futbolito-390-podio-bot.png', fullPage: true });

  // ---- Sala: 2 personas (Angel en horizontal) ----
  const a = await abrir(b, 'angel@example.com', { width: 844, height: 390 });
  const codigo = await crearSala(p, false);
  await a.click('[data-tab="partidas"]'); await a.waitForSelector('#f-unirse');
  await a.fill('#p-codigo', codigo); await a.click('#f-unirse button[type=submit]');
  await p.waitForFunction(() => /2 personas/.test((document.getElementById('p-mesa') || {}).textContent || ''), null, { timeout: 30000 });
  await p.click('[data-p="empezar"]');
  const f1 = await marcoDe(p, '#p-body'), f2 = await marcoDe(a, '#p-body');
  await esperar(f1, () => window.__futbolito && window.__futbolito.estado().sala && window.__futbolito.estado().miTurno, null, 30000);
  const e2 = await estado(f2);
  ok('2 personas: saca la anfitriona; Angel la ve volteada (su portería abajo) y espera', !e2.miTurno && e2.yo === 1, JSON.stringify({ yo: e2.yo }));
  await a.screenshot({ path: 'futbolito-844-sala-angel.png' });
  await tirarSala(p, f1, 40);
  // Los dos aparatos llegan al mismo estado tras cada tiro.
  let iguales = true, tiros = 1;
  for (let k = 0; k < 3; k++) {
    for (const f of [f1, f2]) await esperar(f, n => window.__futbolito.estado().mostrados >= n, tiros, 40000); // los dos ya animaron el tiro
    const [x1, x2] = [await firmaQuieta(f1), await firmaQuieta(f2)];
    if (x1 !== x2) { iguales = false; break; }
    const quien = (await estado(f1)).miTurno ? [p, f1] : (await estado(f2)).miTurno ? [a, f2] : null;
    if (!quien || k === 2) break;
    await tirarSala(quien[0], quien[1], k % 2 ? 30 : -30); tiros++;
  }
  ok('2 personas: los dos aparatos ven el mismo estado (posiciones, marcador y turno) tras cada tiro', iguales, 'tiros: ' + tiros);
  await p.screenshot({ path: 'futbolito-390-sala-2.png' });
  let rinde = null; // a quien le toque (puede seguir tirando quien tiró)
  for (let t = 0; t < 150 && !rinde; t++) { const [x1, x2] = [await estado(f1), await estado(f2)]; rinde = x1.miTurno ? f1 : x2.miTurno ? f2 : null; if (!rinde) await sleep(300); }
  await rinde.tap('#b-rendir');
  try { await p.waitForSelector('#p-body .result', { timeout: 30000 }); await a.waitForSelector('#p-body .result', { timeout: 30000 }); } catch (err) {
    await p.screenshot({ path: 'futbolito-falla-rendir-p.png' }); await a.screenshot({ path: 'futbolito-falla-rendir-a.png' });
    const ver = async f => f.evaluate(() => { const e = window.__futbolito.estado(); return { fin: e.fin, paso: e.paso, miTurno: e.miTurno, finEnviado: e.finEnviado, estado: document.getElementById('estado').textContent }; }).catch(x => 'sin marco: ' + x.message.slice(0, 60));
    throw new Error('rendirse sin podio: ' + (rinde === f1 ? 'Marisol' : 'Angel') + ' ' + JSON.stringify([await ver(f1), await ver(f2)]));
  }
  await sleep(1000);
  const [pod1, pod2] = [await p.textContent('#p-body'), await a.textContent('#p-body')];
  ok('2 personas: podio en los dos con Marisol y Angel y la revancha', /Marisol/.test(pod1) && /Angel/.test(pod1) && /Marisol/.test(pod2) && /Angel/.test(pod2) && await a.isVisible('[data-p="revancha"]'));
  await a.screenshot({ path: 'futbolito-844-podio.png', fullPage: true });

  // ---- Sala 2 vs 2: Marisol + Angel + 2 bots (futbolito-equipos-controles) ----
  const codigo4 = await crearSala(p, true, '2v2');
  ok('2v2: la mesa dice «Mesa de 4 · 1 persona + 3 bots»', /Mesa de 4 · 1 persona \+ 3 bots/.test(await p.textContent('#p-mesa')), await p.textContent('#p-mesa'));
  const a4 = await abrir(b, 'angel@example.com', { width: 844, height: 390 });
  await a4.click('[data-tab="partidas"]'); await a4.waitForSelector('#f-unirse');
  await a4.fill('#p-codigo', codigo4); await a4.click('#f-unirse button[type=submit]');
  await p.waitForFunction(() => /2 personas \+ 2 bots/.test((document.getElementById('p-mesa') || {}).textContent || ''), null, { timeout: 30000 });
  await p.waitForFunction(() => /Angel/.test((document.getElementById('p-equipos-fut') || {}).textContent || ''), null, { timeout: 30000 });
  const eqAntes = await p.evaluate(() => [...document.querySelectorAll('#p-equipos-fut [data-eq]')].map(x => x.dataset.eq + ':' + x.textContent));
  ok('2v2: equipos automáticos y balanceados (Marisol y Angel en equipos distintos, con un bot cada quien)', eqAntes.some(x => /^0:.*Marisol/.test(x)) && eqAntes.some(x => /^1:.*Angel/.test(x)), JSON.stringify(eqAntes));
  await a4.waitForSelector('[data-p="equipo"]', { timeout: 30000 });
  await a4.click('[data-p="equipo"]');
  let juntos = true;
  await p.waitForFunction(() => { const t = [...document.querySelectorAll('#p-equipos-fut [data-eq="0"]')].map(x => x.textContent).join(' '); return /Marisol/.test(t) && /Angel/.test(t); }, null, { timeout: 30000 }).catch(() => { juntos = false; });
  ok('2v2: «🔁 Cambiar de equipo» deja a Angel con Marisol (equipo rojo) y a los bots en el azul', juntos);
  await p.screenshot({ path: 'futbolito-390-sala-equipos.png', fullPage: true });
  await p.click('[data-p="empezar"]');
  const g1 = await marcoDe(p, '#p-body'), g2 = await marcoDe(a4, '#p-body');
  await esperar(g1, () => window.__futbolito && window.__futbolito.estado().sala && window.__futbolito.estado().miTurno, null, 30000);
  const [q1, q2] = [await estado(g1), await estado(g2)];
  const marcadorTxt = [await g1.textContent('#hud'), await g2.textContent('#hud')];
  ok('2v2: 4 asientos con color y nombre (Marisol adelante, Angel atrás, 2 bots) y saca Marisol', q1.asientos.length === 4 && q1.asientos[0].nombre === 'Marisol' && q1.asientos[0].rol === 'adelante' && q1.asientos[1].rol === 'atras' && new Set(q1.asientos.map(x => x.color)).size === 4 && /Tú \+ Angel/.test(marcadorTxt[0]) && /Marisol \+ Tú/.test(marcadorTxt[1]) && /🤖 \+ 🤖/.test(marcadorTxt[0]) && !q2.miTurno && q2.yo === 1,
    JSON.stringify({ asientos: q1.asientos, marcadorTxt }));
  ok('2v2: Angel ve quién tira («Marisol») mientras espera', /Marisol/.test(await g2.textContent('#estado')), await g2.textContent('#estado'));
  const ajena = await fetch(API + '/juegos/sala/' + codigo4 + '/respuesta?email=angel%40example.com', { method: 'POST', body: JSON.stringify({ jugada: { n: 0, accion: 'tiro', pos: 0, angulo: 0, fuerza: 50, barra: 4 } }) });
  ok('servidor: tiro de Angel con la barra de Marisol → 409 no_es_tu_barra', ajena.status === 409 && (await ajena.json()).error === 'no_es_tu_barra', String(ajena.status));
  await p.screenshot({ path: 'futbolito-390-sala-2v2.png' });
  await a4.screenshot({ path: 'futbolito-844-sala-2v2.png' });
  let tiros4 = 0, angelTiro = false, consistente = true;
  for (let k = 0; k < 14 && !angelTiro; k++) {
    let quien = null;
    for (let t = 0; t < 140 && !quien; t++) {
      const [x1, x2] = [await estado(g1), await estado(g2)];
      if (x1.fin) break;
      if (x1.miTurno) quien = [p, g1, x1]; else if (x2.miTurno) quien = [a4, g2, x2]; else await sleep(400);
    }
    if (!quien) break;
    consistente = consistente && quien[2].turnoBarras.includes(quien[2].posesionBarra);
    if (quien[1] === g2) angelTiro = true;
    await tirarSala(quien[0], quien[1], k % 2 ? 20 : -20); tiros4++;
  }
  const j4 = ((await (await fetch(API + '/juegos/sala/' + codigo4 + '?email=marisol%40example.com')).json()).jugadores || []).flatMap(x => x.jugadas || []);
  ok('2v2: cada quien tira solo cuando la pelota está en su barra y el servidor guarda la barra', consistente && tiros4 >= 2 && j4.every(j => j.accion !== 'tiro' || Number.isInteger(j.barra)), JSON.stringify({ tiros4, barras: j4.map(j => j.barra) }));
  ok('2v2: Angel (portero y defensa) tira cuando la pelota llega a su barra', angelTiro, 'tiros: ' + tiros4);
  for (const f of [g1, g2]) await esperar(f, () => !window.__futbolito.estado().animando, null, 40000);
  await sleep(1500);
  const [z1, z2] = [await firmaQuieta(g1), await firmaQuieta(g2)];
  ok('2v2: los dos aparatos ven el mismo estado', z1 === z2);
  await a4.screenshot({ path: 'futbolito-844-sala-2v2-juego.png' });
  let rinde4 = null;
  for (let t = 0; t < 200 && !rinde4; t++) { const [x1, x2] = [await estado(g1), await estado(g2)]; if (x1.fin) break; rinde4 = x1.miTurno ? g1 : x2.miTurno ? g2 : null; if (!rinde4) await sleep(400); }
  if (rinde4) await rinde4.tap('#b-rendir');
  await p.waitForSelector('#p-body .result', { timeout: 60000 }); await a4.waitForSelector('#p-body .result', { timeout: 60000 });
  await sleep(1000);
  const pod4 = await p.textContent('#p-body');
  ok('2v2: podio con Marisol, Angel y los 2 bots, título del equipo', /Marisol/.test(pod4) && /Angel/.test(pod4) && /BOT-/.test(pod4) && /equipo/i.test(pod4), pod4.slice(0, 200));
  await p.screenshot({ path: 'futbolito-390-podio-2v2.png', fullPage: true });

  await b.close();
  console.log(out.join('\n')); process.exit(out.some(x => x.startsWith('FAIL')) ? 1 : 0);
})().catch(e => { console.log(out.join('\n')); console.error('ERROR', e.message.slice(0, 400)); process.exit(2); });
