// E2E: «🎱 Billar» (openspec: futbolito-billar).
// Catálogo en Arcade; individual contra el bot con TOQUES REALES (CDP Input.dispatchTouchEvent, hasTouch + isMobile):
// arrastrar apunta (línea guía hacia el dedo), jalar desde la blanca como resortera tira con fuerza proporcional,
// botón de efecto, el bot tira en su turno, meter la 8 al final gana y suma ⭐ individuales. Horizontal 844×390.
// Sala 1 persona + bot (rompe con resortera, rendirse → podio y revancha) y sala de 2 personas (los dos aparatos
// reproducen igual cada tiro; podio en los dos). Capturas a 390 px y en horizontal.
// futbolito-equipos-controles: un toque no cambia la mira ni dispara (tampoco cerca de la blanca), ⟳ fino que repite
// al sostener, ángulo y fuerza con número, barra de fuerza vertical, resortera que se cancela al regresar, «🎱 TIRAR»
// grande, 🎮 Mando clásico (toques reales, recordado, control físico simulado), teclado y capturas a 320, 390 y 844×390.
require('./lib/entorno');
const { chromium } = require('playwright');
const { abrirPagina } = require('./lib/navegador');
const API = process.env.API;
const out = []; const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const TACTIL = { hasTouch: true, isMobile: true };
const abrir = (b, email, viewport, contexto) => abrirPagina(b, { email, viejo: true, viewport, contexto: Object.assign({}, TACTIL, contexto || {}), out, etiqueta: email, dialogos: 'aceptar', ruta: '/juegos.html?arcadePrueba=1', esperar: '[data-juego="billar"]' });
const marcoDe = async (p, raiz = '') => (await p.waitForSelector(raiz + ' #arcade-frame', { timeout: 30000 })).contentFrame();
const estado = fr => fr.evaluate(() => window.__billar.estado());
const esperar = (fr, fn, arg, ms = 30000) => fr.waitForFunction(fn, arg, { timeout: ms });

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
// Coordenadas de la página (no del iframe) de un punto de la mesa.
async function enPagina(fr, x, y) {
  const r = await fr.locator('#c').boundingBox(), q = await fr.evaluate(([a, b]) => window.__billar.pantalla(a, b), [x, y]);
  return { x: r.x + q.x, y: r.y + q.y };
}
// Resortera real: dedo en la blanca y jalón en sentido contrario al ángulo (en grados), de `largo` unidades de mesa.
async function resortera(p, fr, grados, largo) {
  const pos = await fr.evaluate(() => window.__billar.blancaMesa());
  const rad = grados * Math.PI / 180;
  const a = await enPagina(fr, pos.x, pos.y), z = await enPagina(fr, pos.x - Math.cos(rad) * largo, pos.y - Math.sin(rad) * largo);
  await arrastrar(p, a.x, a.y, z.x, z.y, 10);
}
async function crearSala(p, bots) {
  await p.click('[data-tab="partidas"]'); await p.waitForSelector('#f-crear');
  await p.selectOption('#p-juego', 'billar');
  if ((await p.isChecked('#p-bots')) !== bots) await p.click('#p-bots');
  await p.click('#f-crear button[type=submit]'); await p.waitForSelector('[data-p="empezar"]', { timeout: 30000 });
  return (await p.textContent('#p-codigo-chip')).replace(/[^A-Z]/g, '');
}
const firmaQuieta = async fr => { await esperar(fr, () => window.__billar.firma() !== null && !window.__billar.estado().animando, null, 40000); return fr.evaluate(() => window.__billar.firma()); };

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME });
  const p = await abrir(b, 'marisol@example.com', { width: 390, height: 844 });
  const tarjeta = await p.textContent('[data-juego="billar"]');
  ok('catálogo: Billar en Arcade con ícono y descripción', tarjeta.includes('🎱') && tarjeta.includes('Billar') && /Bola 8/.test(tarjeta) && (await p.$$('.cat-arcade[data-juego="billar"]')).length === 1, tarjeta);
  const puntosAntes = await p.evaluate(() => state.totalIndividual);

  // ---- Individual con toques reales ----
  await p.tap('[data-juego="billar"]');
  let fr = await marcoDe(p);
  await fr.waitForSelector('#ov-menu:not(.hide)', { timeout: 30000 });
  ok('individual: menú con 3 niveles, reglas y cómo apuntar', (await fr.$$('[data-nivel]')).length === 3 && /resortera/.test(await fr.textContent('#ov-menu')) && /8 antes de tiempo/.test(await fr.textContent('#ov-menu')));
  await fr.tap('[data-nivel="facil"]');
  await esperar(fr, () => window.__billar.estado().modo === 'juego');
  await sleep(1300);
  // Apuntar arrastrando: la mira apunta hacia el dedo.
  const objetivo = await enPagina(fr, 750, 120);
  const bl0 = await fr.evaluate(() => window.__billar.blancaMesa());
  await arrastrar(p, objetivo.x - 30, objetivo.y + 20, objetivo.x, objetivo.y);
  let e = await estado(fr);
  const esperado = Math.round(((Math.atan2(120 - bl0.y, 750 - bl0.x) * 1800 / Math.PI) + 3600) % 3600);
  ok('toque real: arrastrar sobre la mesa apunta hacia el dedo (línea guía)', Math.abs(e.aim - esperado) <= 15, JSON.stringify({ aim: e.aim, esperado }));
  await p.screenshot({ path: 'billar-390-apuntar.png' });
  await fr.tap('#b-efecto');
  ok('efecto: el botón cambia a «Seguir»', (await estado(fr)).efecto === 70 && /Seguir/.test(await fr.textContent('#b-efecto')));
  await fr.tap('#b-efecto'); await fr.tap('#b-efecto');
  // Capa de acciones (para un mando): el eje gira la mira y «fuerzaMas» sube la fuerza.
  const a0 = (await estado(fr)).aim, f0 = (await estado(fr)).fuerza;
  await fr.evaluate(() => { window.accionesJuego.ponerEje(1); window.accionesJuego.presionar('fuerzaMas', true); }); await sleep(400);
  await fr.evaluate(() => { window.accionesJuego.ponerEje(0); window.accionesJuego.presionar('fuerzaMas', false); });
  const ea = await estado(fr);
  ok('acciones: el eje gira la mira y «fuerzaMas» sube la fuerza', ea.aim !== a0 && ea.fuerza > f0, JSON.stringify({ a0, aim: ea.aim, f0, fuerza: ea.fuerza }));
  // Rompe con resortera (jalón largo = fuerza alta).
  await resortera(p, fr, 0, 220);
  e = await estado(fr);
  ok('toque real: jalar desde la blanca tira con fuerza según el jalón', e.animando && e.fuerza >= 70 && (e.aim <= 30 || e.aim >= 3570), JSON.stringify({ fuerza: e.fuerza, aim: e.aim, animando: e.animando }));
  await esperar(fr, () => window.__billar.estado().tiros >= 1 && !window.__billar.estado().animando, null, 30000);
  await p.screenshot({ path: 'billar-390-rompe.png' });
  // El bot tira en su turno (si le toca).
  e = await estado(fr);
  if (e.turno === 1) await esperar(fr, () => window.__billar.estado().tiros >= 2, null, 30000);
  ok('el bot tira cuando es su turno', (await estado(fr)).tiros >= 1);
  await esperar(fr, () => window.__billar.estado().turno === 0 && !window.__billar.estado().animando, null, 120000);
  // Mesa lista para ganar y tiro real a la 8 (con su grupo completo).
  await fr.evaluate(() => window.__billar.prepararFinal());
  await sleep(100);
  await resortera(p, fr, 225, 140);
  await fr.waitForSelector('#ov-res:not(.hide)', { timeout: 20000 });
  await fr.waitForFunction(() => /individuales|No se guardaron/.test(document.getElementById('res-guardado').textContent), null, { timeout: 20000 });
  const res = await fr.textContent('#ov-res');
  ok('meter la 8 al final gana y suma ⭐ individuales', /Ganaste/.test(res) && /la 8 al final/.test(res) && /a tus ⭐ individuales/.test(res), res.slice(0, 200));
  ok('el total individual sube', (await p.evaluate(() => state.totalIndividual)) > puntosAntes);
  await p.screenshot({ path: 'billar-390-resultado.png' });
  await p.click('[data-a="salir"]').catch(() => {});

  // ---- Controles (futbolito-equipos-controles): suelto, toques reales ----
  const abrirSuelto = (vp, init) => abrirPagina(b, { viewport: vp, contexto: TACTIL, init, out, etiqueta: 'billar suelto', ruta: '/juegos/billar.html?prueba=1', esperar: '#ov-menu:not(.hide)' });
  const centro = async (pg, sel) => { const r = await pg.locator(sel).boundingBox(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, r }; };
  const sostenerEn = async (pg, sel, ms) => { const d = dedos(pg), m = await centro(pg, sel); await d.poner(1, m.x, m.y); await sleep(ms); await d.soltarTodo(); await sleep(40); return estado(pg); };
  const s1 = await abrirSuelto({ width: 390, height: 844 });
  ok('controles: selector 👆 Táctil (por omisión) y 🎮 Mando clásico', (await s1.$$('#menu-control [data-control]')).length === 2 && await s1.getAttribute('[data-control="tactil"]', 'aria-pressed') === 'true');
  await s1.tap('[data-nivel="facil"]');
  await esperar(s1, () => window.__billar.estado().modo === 'juego'); await sleep(1300);
  let eb = await estado(s1);
  const bl = await enPagina(s1, (await s1.evaluate(() => window.__billar.blancaMesa())).x, (await s1.evaluate(() => window.__billar.blancaMesa())).y);
  const d1 = dedos(s1);
  await d1.poner(1, bl.x + 30, bl.y - 120); await sleep(40); await d1.soltarTodo(); await sleep(60);
  ok('toque real: tocar la mesa sin arrastrar no cambia la mira', (await estado(s1)).aim === eb.aim, JSON.stringify({ antes: eb.aim, despues: (await estado(s1)).aim }));
  await d1.poner(1, bl.x + 22, bl.y + 5); await sleep(30); await d1.mover(1, bl.x + 34, bl.y + 20); await sleep(30); await d1.soltarTodo(); await sleep(80);
  eb = await estado(s1);
  ok('toque real: tocar junto a la blanca y mover 20 px no dispara', !eb.animando && eb.tiros === 0, JSON.stringify({ animando: eb.animando, tiros: eb.tiros }));
  const g0 = (await estado(s1)).aim;
  const g1 = (await sostenerEn(s1, '#b-der', 40)).aim;
  const g2 = (await sostenerEn(s1, '#b-der', 1000)).aim;
  ok('ajuste fino: ⟳ un toque = 0.1° y sostenido 1 s gira varios grados', g1 - g0 === 1 && g2 - g1 >= 30, JSON.stringify({ toque: g1 - g0, sostenido: g2 - g1 }));
  ok('el ángulo se ve en grados', /°/.test(await s1.textContent('#v-angulo')) && (await s1.textContent('#v-angulo')).includes((g2 / 10).toFixed(1)), await s1.textContent('#v-angulo'));
  const fz = await centro(s1, '#fuerza');
  await d1.poner(1, fz.x, fz.r.y + fz.r.height * 0.08); await sleep(40); await d1.soltarTodo(); await sleep(40);
  const fArriba = (await estado(s1)).fuerza;
  await d1.poner(1, fz.x, fz.r.y + fz.r.height * 0.9); await sleep(40); await d1.soltarTodo(); await sleep(40);
  const fAbajo = (await estado(s1)).fuerza;
  ok('fuerza: barra vertical grande con número (arriba ≥ 85, abajo ≤ 20)', fz.r.width >= 44 && fz.r.height >= 100 && fArriba >= 85 && fAbajo <= 20 && (await s1.textContent('#v-fuerza')).trim() === String(fAbajo), JSON.stringify({ w: fz.r.width, h: fz.r.height, fArriba, fAbajo }));
  // Resortera que se cancela al regresar el dedo a la blanca.
  const blm = await s1.evaluate(() => window.__billar.blancaMesa());
  const pa = await enPagina(s1, blm.x, blm.y), pz = await enPagina(s1, blm.x - 160, blm.y);
  await d1.poner(1, pa.x, pa.y);
  for (let i = 1; i <= 8; i++) { await d1.mover(1, pa.x + (pz.x - pa.x) * i / 8, pa.y + (pz.y - pa.y) * i / 8); await sleep(16); }
  const jalando = await s1.evaluate(() => window.__billar.estado().resortera);
  for (let i = 7; i >= 0; i--) { await d1.mover(1, pa.x + (pz.x - pa.x) * i / 8, pa.y + (pz.y - pa.y) * i / 8); await sleep(16); }
  await d1.soltarTodo(); await sleep(80);
  eb = await estado(s1);
  ok('resortera: muestra la fuerza al jalar y se cancela al regresar a la blanca', jalando && jalando.fuerza > 20 && !eb.animando && eb.tiros === 0, JSON.stringify({ jalando, tiros: eb.tiros }));
  const bt = (await centro(s1, '#b-tirar')).r;
  ok('«🎱 TIRAR» grande (≥ 56 px de alto)', bt.height >= 56, JSON.stringify(bt));
  await s1.screenshot({ path: 'billar-390-controles.png' });
  // 🎮 Mando clásico
  await s1.tap('#b-control'); await sleep(200);
  ok('🎮 Mando clásico: se ve el mando, no el panel, y una franja con ángulo y fuerza', (await estado(s1)).control === 'mando' && await s1.isVisible('.mando') && !(await s1.isVisible('#panel')) && /°/.test(await s1.textContent('#datos')));
  const m0 = (await estado(s1)).aim;
  const m1 = (await sostenerEn(s1, '.mando-cruceta [data-dir="der"]', 300)).aim;
  const fm0 = (await estado(s1)).fuerza;
  const fm1 = (await sostenerEn(s1, '.mando [data-b="X"]', 300)).fuerza;
  const mf = (await sostenerEn(s1, '.mando [data-b="L"]', 40)).aim;
  const efm = (await sostenerEn(s1, '.mando [data-b="B"]', 40)).efecto;
  ok('mando: cruceta ▶ gira, X sube la fuerza, L ajusta fino y B cambia el efecto', m1 !== m0 && fm1 > fm0 && mf === m1 - 1 && efm !== 0, JSON.stringify({ m0, m1, fm0, fm1, mf, efm }));
  await s1.screenshot({ path: 'billar-390-mando.png' });
  eb = await sostenerEn(s1, '.mando [data-b="A"]', 60);
  ok('mando: A tira', eb.animando || eb.tiros > 0, JSON.stringify({ animando: eb.animando, tiros: eb.tiros }));
  await s1.reload(); await s1.waitForSelector('#ov-menu:not(.hide)');
  ok('la elección se recuerda al recargar (🎮 Mando clásico)', await s1.getAttribute('[data-control="mando"]', 'aria-pressed') === 'true');
  // Teclado: → gira, ↑ sube la fuerza, E fino, Espacio tira.
  await s1.tap('[data-control="tactil"]');
  await s1.tap('[data-nivel="facil"]'); await esperar(s1, () => window.__billar.estado().modo === 'juego'); await sleep(1300);
  const k0 = await estado(s1);
  await s1.keyboard.down('ArrowRight'); await sleep(250); await s1.keyboard.up('ArrowRight');
  await s1.keyboard.down('ArrowUp'); await sleep(250); await s1.keyboard.up('ArrowUp');
  const k1 = await estado(s1);
  await s1.keyboard.press('KeyE'); const k2 = await estado(s1);
  await s1.keyboard.press('Space'); await sleep(60); const k3 = await estado(s1);
  ok('teclado: → gira, ↑ sube la fuerza, E ajuste fino y Espacio tira', k1.aim !== k0.aim && k1.fuerza > k0.fuerza && k2.aim === (k1.aim + 1) % 3600 && (k3.animando || k3.tiros > 0), JSON.stringify({ a: [k0.aim, k1.aim, k2.aim], f: [k0.fuerza, k1.fuerza] }));
  await s1.context().close();
  // Control físico simulado (con 👆 Táctil elegido): palanca gira, botón de abajo tira.
  const GAMEPAD = [() => { Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => window.__pads || [null, null, null, null] }); }];
  const pad = (presionados = [], ejes = [0, 0, 0, 0]) => ({ id: 'Control de prueba', index: 0, connected: true, mapping: 'standard', axes: ejes, buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: presionados.includes(i), value: presionados.includes(i) ? 1 : 0 })) });
  const s2 = await abrirSuelto({ width: 390, height: 844 }, GAMEPAD);
  await s2.tap('[data-nivel="facil"]'); await esperar(s2, () => window.__billar.estado().modo === 'juego'); await sleep(1300);
  const gp0 = (await estado(s2)).aim;
  await s2.evaluate(x => { window.__pads = [x]; }, pad([], [1, 0, 0, 0])); await sleep(300);
  await s2.evaluate(() => { window.__pads = null; }); await sleep(80);
  const gp1 = (await estado(s2)).aim;
  await s2.evaluate(x => { window.__pads = [x]; }, pad([0])); await sleep(150);
  await s2.evaluate(() => { window.__pads = null; });
  const gpT = await estado(s2);
  ok('control físico: la palanca gira la mira y el botón de abajo tira', gp1 !== gp0 && (gpT.animando || gpT.tiros > 0), JSON.stringify({ gp0, gp1, tiros: gpT.tiros }));
  await s2.context().close();
  // Distribución a 320×640 y 844×390 (táctil y mando): todo cabe y no tapa la mesa.
  for (const [w, h, control] of [[320, 640, 'tactil'], [320, 640, 'mando'], [844, 390, 'tactil'], [844, 390, 'mando']]) {
    const sp = await abrirSuelto({ width: w, height: h });
    await sp.tap('[data-control="' + control + '"]'); await sp.tap('[data-nivel="medio"]');
    await esperar(sp, () => window.__billar.estado().modo === 'juego'); await sleep(1300);
    const lay = await sp.evaluate(() => {
      const r = e => { const b = e.getBoundingClientRect(); return { l: b.left, t: b.top, r: b.right, b: b.bottom }; };
      const vis = e => e && e.getBoundingClientRect().width > 0 && getComputedStyle(e).display !== 'none' && getComputedStyle(e).visibility !== 'hidden';
      const ctl = [...document.querySelectorAll('#panel button, #fuerza, .mando [data-b]:not(.mando-oculto), .mando-cruceta i[data-dir]:not(.mando-oculto)')].filter(vis).map(r);
      return { vw: innerWidth, vh: innerHeight, ctl, mesa: window.__billar.rectMesa() };
    });
    const dentroVista = lay.ctl.every(c => c.l >= -0.5 && c.t >= -0.5 && c.r <= lay.vw + 0.5 && c.b <= lay.vh + 0.5);
    const cruza = lay.ctl.filter(c => c.l < lay.mesa.r - 2 && c.r > lay.mesa.l + 2 && c.t < lay.mesa.b - 2 && c.b > lay.mesa.t + 2);
    ok('distribución ' + w + '×' + h + ' (' + control + '): controles completos y sin tapar la mesa', lay.ctl.length >= 3 && dentroVista && !cruza.length, JSON.stringify({ n: lay.ctl.length, cruza: cruza.length, mesa: lay.mesa }));
    await sp.screenshot({ path: 'billar-' + w + 'x' + h + '-' + control + '.png' });
    await sp.context().close();
  }

  // ---- Horizontal 844×390 ----
  const hor = await abrir(b, 'marisol@example.com', { width: 844, height: 390 });
  await hor.tap('[data-juego="billar"]');
  const fh = await marcoDe(hor);
  await fh.waitForSelector('#ov-menu:not(.hide)', { timeout: 30000 });
  await fh.tap('[data-nivel="dificil"]');
  await esperar(fh, () => window.__billar.estado().modo === 'juego');
  await sleep(600);
  const eh = await estado(fh);
  const cajas = await fh.evaluate(() => ['#panel', '#b-tirar', '#hud'].map(s => { const r = document.querySelector(s).getBoundingClientRect(); return { s, r: r.right, b: r.bottom, w: innerWidth, h: innerHeight }; }));
  ok('horizontal: la mesa se ve horizontal y el panel cabe completo', eh.horizontal && cajas.every(x => x.r <= x.w + 0.5 && x.b <= x.h + 0.5), JSON.stringify(cajas));
  await hor.screenshot({ path: 'billar-844-horizontal.png' });
  await hor.context().close();

  // ---- Sala: 1 persona + bot ----
  const codigoBot = await crearSala(p, true);
  await p.click('[data-p="empezar"]');
  const fs = await marcoDe(p, '#p-body');
  await esperar(fs, () => window.__billar && window.__billar.estado().sala && window.__billar.estado().miTurno, null, 30000);
  await p.screenshot({ path: 'billar-390-sala-bot.png' });
  await resortera(p, fs, 0, 200);
  await esperar(fs, () => window.__billar.estado().paso >= 1, null, 15000);
  await sleep(1500);
  const sal = await (await fetch(API + '/juegos/sala/' + codigoBot + '?email=marisol%40example.com')).json();
  const j0 = ((sal.jugadores || [])[0] || {}).jugadas || [];
  ok('servidor: el tiro se guardó como jugada { n, tiro, angulo, fuerza }', j0.length >= 1 && j0[0].accion === 'tiro' && Number.isInteger(j0[0].angulo) && j0[0].fuerza >= 60, JSON.stringify(j0[0]));
  await esperar(fs, () => window.__billar.estado().miTurno, null, 90000);
  await fs.tap('#b-rendir');
  await p.waitForSelector('#p-body .result', { timeout: 30000 });
  await sleep(1200);
  const podio = await p.textContent('#p-body');
  ok('sala con bot: rendirse → podio con el bot y revancha', /BOT-VACHIRA/.test(podio) && /rendición/.test(podio) && await p.isVisible('[data-p="revancha"]'), podio.slice(0, 160));
  await p.screenshot({ path: 'billar-390-podio-bot.png', fullPage: true });

  // ---- Sala: 2 personas (Angel en horizontal) ----
  const a = await abrir(b, 'angel@example.com', { width: 844, height: 390 });
  const codigo = await crearSala(p, false);
  await a.click('[data-tab="partidas"]'); await a.waitForSelector('#f-unirse');
  await a.fill('#p-codigo', codigo); await a.click('#f-unirse button[type=submit]');
  await p.waitForFunction(() => /2 personas/.test((document.getElementById('p-mesa') || {}).textContent || ''), null, { timeout: 30000 });
  await p.click('[data-p="empezar"]');
  const f1 = await marcoDe(p, '#p-body'), f2 = await marcoDe(a, '#p-body');
  await esperar(f1, () => window.__billar && window.__billar.estado().sala && window.__billar.estado().miTurno, null, 30000);
  ok('2 personas: rompe la anfitriona y Angel espera su turno', !(await estado(f2)).miTurno);
  await resortera(p, f1, 0, 210);
  let iguales = true, tiros = 1;
  for (let k = 0; k < 3; k++) {
    for (const f of [f1, f2]) await esperar(f, n => window.__billar.estado().mostrados >= n, tiros, 40000); // los dos ya animaron el tiro
    const [x1, x2] = [await firmaQuieta(f1), await firmaQuieta(f2)];
    if (x1 !== x2) { iguales = false; break; }
    if (k === 2) break;
    const quien = (await estado(f1)).miTurno ? [p, f1] : (await estado(f2)).miTurno ? [a, f2] : null;
    if (!quien) break;
    await quien[1].tap('#b-tirar'); tiros++;
  }
  ok('2 personas: los dos aparatos reproducen igual cada tiro (bolas, grupos y turno)', iguales, 'tiros: ' + tiros);
  await a.screenshot({ path: 'billar-844-sala-angel.png' });
  await p.screenshot({ path: 'billar-390-sala-2.png' });
  const rinde = (await estado(f1)).miTurno ? f1 : f2;
  await rinde.tap('#b-rendir');
  await p.waitForSelector('#p-body .result', { timeout: 30000 }); await a.waitForSelector('#p-body .result', { timeout: 30000 });
  await sleep(1000);
  const [pod1, pod2] = [await p.textContent('#p-body'), await a.textContent('#p-body')];
  ok('2 personas: podio en los dos con Marisol y Angel y la revancha', /Marisol/.test(pod1) && /Angel/.test(pod1) && /Marisol/.test(pod2) && /Angel/.test(pod2) && await p.isVisible('[data-p="revancha"]'));
  await a.screenshot({ path: 'billar-844-podio.png', fullPage: true });

  await b.close();
  console.log(out.join('\n')); process.exit(out.some(x => x.startsWith('FAIL')) ? 1 : 0);
})().catch(e => { console.log(out.join('\n')); console.error('ERROR', e.message.slice(0, 400)); process.exit(2); });
