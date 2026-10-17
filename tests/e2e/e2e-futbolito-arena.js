// E2E: «⚽ Futbolito Arena» (openspec: futbolito-arena). Usa ?arcadePrueba=1 (ganchos window.__arena).
// Cubre: tarjeta en 🕹️ Arcade y sala en «Crear partida»; contra la IA en celular con TOQUES REALES (CDP
// Input.dispatchTouchEvent: joystick, ⚡ y 🌀), gol con grito y Emoción, fin con puntos guardados y revancha; 🎮 mando
// clásico (toque real en su A) y control físico simulado (navigator.getGamepads); teclado en escritorio (flechas,
// Espacio, K) con 3 vs 3 en la arena grande; sala 2 vs 2 con 4 contextos unidos por el canal en vivo simulado
// (EnVivo.simulado + relevo local): equipos parejos, «Cambiar de equipo», color del robot, gol de un invitado visto por
// los 4, desconexión (la IA toma su robot) y regreso, final confirmado por el servidor y podio en los 4; respaldo sin
// canal. Capturas a 390×844, 844×390 y escritorio, y fps con CPU ×4.
require('./lib/entorno');
const { chromium } = require('playwright');
const { abrirPagina } = require('./lib/navegador');
const { abrirJuego, textoTarjeta, idsDe } = require('./lib/menu');
const { levantarRelevo, initVivo } = require('./lib/vivo-relevo');
const API = process.env.API;
const out = []; const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const TACTIL = { hasTouch: true, isMobile: true };
const RUTA = '/juegos.html?arcadePrueba=1';
const marcoDe = async (p, sel = '#arcade-frame') => (await p.waitForSelector(sel, { timeout: 30000 })).contentFrame();
const esperar = (fr, fn, arg, ms = 30000) => fr.waitForFunction(fn, arg, { timeout: ms });
const estado = fr => fr.evaluate(() => window.__arena.estado());
const sala = async (codigo, quien) => (await fetch(API + '/juegos/sala/' + codigo + '?email=' + encodeURIComponent(quien))).json();
const GAMEPAD = [() => { Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => window.__pads || [null, null, null, null] }); }];
const pad = (presionados = [], ejes = [0, 0, 0, 0]) => ({ id: 'Control de prueba', index: 0, connected: true, mapping: 'standard', axes: ejes, buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: presionados.includes(i), value: presionados.includes(i) ? 1 : 0 })) });

function dedos(p) {
  let cdp = null; const vivos = {};
  const enviar = async (type, puntos) => { cdp = cdp || await p.context().newCDPSession(p); await cdp.send('Input.dispatchTouchEvent', { type, touchPoints: puntos }); };
  return {
    poner: (id, x, y) => { vivos[id] = { x, y, id }; return enviar('touchStart', Object.values(vivos)); },
    mover: (id, x, y) => { vivos[id] = { x, y, id }; return enviar('touchMove', Object.values(vivos)); },
    quitar: id => { const t = vivos[id]; delete vivos[id]; return enviar('touchEnd', [t]); },
  };
}
const centro = async (fr, sel) => { const c = await fr.locator(sel).boundingBox(); return { x: c.x + c.width / 2, y: c.y + c.height / 2 }; };
async function tocar(p, fr, sel, ms = 70) { const c = await centro(fr, sel), d = dedos(p); await d.poner(9, c.x, c.y); await sleep(ms); await d.quitar(9); }
async function medirFps(p, fr, ms = 4000) {
  const cdp = await p.context().newCDPSession(p);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await sleep(ms);
  const f = (await estado(fr)).fps;
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  return f;
}
const velocidad = r => Math.hypot(r.vx, r.vy);

async function soloConToques(b) {
  const p = await abrirPagina(b, { email: 'marisol@example.com', viejo: true, viewport: { width: 390, height: 844 }, contexto: { ...TACTIL, deviceScaleFactor: 2 }, out, ruta: RUTA, esperar: '[data-menu]', init: GAMEPAD });
  const tarjeta = await textoTarjeta(p, 'futbolito-arena'), arcade = await idsDe(p, 'arcade');
  ok('catálogo: «Futbolito Arena» en Arcade (id nuevo; Futbolito sigue fuera)', /Futbolito Arena/.test(tarjeta) && arcade.includes('futbolito-arena') && !arcade.includes('futbolito'), arcade.join(','));
  await p.click('[data-tab="partidas"]'); await p.waitForSelector('#p-juego');
  ok('salas: Futbolito Arena se ofrece al crear partida', (await p.$$eval('#p-juego option', os => os.map(o => o.value))).includes('futbolito-arena'));
  await p.click('[data-tab="juegos"]').catch(() => {});
  await abrirJuego(p, 'futbolito-arena', { tap: true });
  const fr = await marcoDe(p);
  await fr.waitForSelector('#b-jugar', { timeout: 30000 });
  await fr.tap('[data-op="modo"][data-v="1v1"]'); await fr.tap('[data-op="nivel"][data-v="facil"]'); await fr.tap('[data-op="goles"][data-v="3"]');
  ok('menú: modos 1 vs 1, 2 vs 2 y 3 vs 3, dificultad y controles en el celular', (await fr.$$('[data-op="modo"]')).length === 3 && await fr.isVisible('[data-control="mando"]'));
  await p.screenshot({ path: 'arena-390-menu.png' });
  await fr.tap('#b-jugar');
  await esperar(fr, () => window.__arena.estado().estadoP === 'juego');
  const e0 = await estado(fr);
  ok('vertical: la arena se gira 90° (porterías arriba y abajo)', e0.rot === 1, String(e0.rot));
  await fr.evaluate(() => window.__arena.acelerar(0));
  // Joystick con toque real: arrastrar hacia la derecha de la pantalla.
  const joy = await centro(fr, '#joy-zona'), d = dedos(p);
  await d.poner(1, joy.x, joy.y); for (let k = 1; k <= 6; k++) { await d.mover(1, joy.x + k * 10, joy.y); await sleep(25); }
  await sleep(450);
  const movido = await estado(fr);
  const esperado = await fr.evaluate(() => window.__arena.estado().entrada);
  ok('toques: el joystick mueve tu robot en la dirección de la pantalla', velocidad(movido.robot) > 2 && Math.hypot(esperado.x, esperado.y) > 0.8, JSON.stringify({ v: movido.robot.vx.toFixed(2) + ',' + movido.robot.vy.toFixed(2), entrada: esperado }));
  // Multitáctil: con el joystick puesto, ⚡ embiste (recarga) y 🌀 gira.
  const a = await centro(fr, '#b-a');
  await d.poner(2, a.x, a.y); await sleep(70); await d.quitar(2);
  await sleep(80);
  const tras = await estado(fr);
  ok('toques: joystick + ⚡ embiste y empieza la recarga', tras.robot.recA > 0.3, String(tras.robot.recA));
  const carga = Number(await fr.$eval('#b-a', el => el.style.getPropertyValue('--carga')));
  ok('toques: el botón ⚡ muestra la recarga', carga > 0, String(carga));
  await d.quitar(1);
  await tocar(p, fr, '#b-b', 80);
  await sleep(60);
  ok('toques: 🌀 gira y frena (recarga del giro)', (await estado(fr)).robot.recB > 0.2);
  await p.screenshot({ path: 'arena-390-controles.png' });
  // Gol con grito y Emoción.
  await fr.evaluate(() => window.__arena.golYa(0));
  await esperar(fr, () => window.__arena.estado().goles[0] === 1, null, 5000);
  await sleep(250);
  const grito = await fr.textContent('#grito'), em = await fr.evaluate(() => window.Emocion.eventos().map(x => x.ev));
  ok('gol: sube el marcador, «¡GOOOL!» y Emoción (gol)', /GOOOL/.test(grito) && (await fr.textContent('#g-0')) === '1' && em.includes('gol'), grito + ' ' + em.join(','));
  await p.screenshot({ path: 'arena-390-gol.png' });
  await esperar(fr, () => window.__arena.estado().estadoP === 'saque', null, 5000).catch(() => {});
  ok('saque: tras el gol los robots vuelven a su lugar con el balón al centro', await fr.evaluate(() => { const p = window.__arena.p(); return p.balon.x === 0 && p.balon.y === 0; }));
  const fps = await medirFps(p, fr);
  ok('fps: 390×844 con CPU ×4 (meta 60, mínimo 50)', fps >= 50, String(fps));
  // Fin: victoria, puntos guardados y revancha.
  await fr.evaluate(() => window.__arena.terminarYa());
  await fr.waitForSelector('#b-revancha', { timeout: 10000 });
  await fr.waitForFunction(() => /guardados/.test(document.getElementById('res-puntos').textContent), null, { timeout: 15000 }).catch(() => {});
  const res = await fr.textContent('#ov'), em2 = await fr.evaluate(() => window.Emocion.eventos().map(x => x.ev));
  ok('fin: victoria con puntos guardados en el ranking y botón de revancha', /Victoria/.test(res) && /guardados/.test(res) && em2.includes('victoria'), res.replace(/\s+/g, ' ').slice(0, 160));
  await p.screenshot({ path: 'arena-390-fin.png' });
  // 🎮 Mando clásico: se elige, se ve y su A con toque real embiste; control físico: palanca y botón.
  await fr.tap('[data-a="menu"]'); await fr.waitForSelector('[data-control="mando"]');
  await fr.tap('[data-control="mando"]');
  await fr.tap('#b-jugar');
  await esperar(fr, () => window.__arena.estado().estadoP === 'juego');
  await esperar(fr, () => window.__arena.estado().mando.visible, null, 5000).catch(() => {});
  ok('mando clásico: visible en el partido y sin el joystick propio', (await estado(fr)).mando.visible && !(await fr.isVisible('#joy-zona')));
  await tocar(p, fr, '.mando-boton[data-b="A"]', 90);
  await sleep(60);
  ok('mando clásico: A con toque real embiste', (await estado(fr)).robot.recA > 0.3);
  await p.screenshot({ path: 'arena-390-mando.png' });
  // Tu robot en medio de la cancha (lejos de paredes y robots) y la palanca hacia arriba.
  await fr.evaluate(() => { const p = window.__arena.p(), r = p.robots[0]; Object.assign(r, { x: -4, y: 0, vx: 0, vy: 0 }); p.robots.slice(1).forEach(o => Object.assign(o, { x: 6, y: 3 })); });
  await fr.evaluate(() => { window.__pads = [{ id: 'Control de prueba', index: 0, connected: true, mapping: 'standard', axes: [0, -1, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) }]; });
  let maxV = 0, conPad = null;
  for (let k = 0; k < 8; k++) { await sleep(80); conPad = await estado(fr); maxV = Math.max(maxV, velocidad(conPad.robot)); }
  ok('control físico: la palanca mueve el robot', maxV > 2, maxV.toFixed(2) + ' ' + JSON.stringify(conPad.entrada));
  await sleep(1200);
  await fr.evaluate(p0 => { window.__pads = [p0]; }, pad([0], [0, 0, 0, 0]));
  await sleep(120);
  ok('control físico: el botón A (abajo) embiste', (await estado(fr)).robot.recA > 0.3);
  await fr.evaluate(() => { window.__pads = [null]; });
  await fr.tap('[data-a="menu"]').catch(() => {});
  await p.context().close();
}

async function horizontalYEscritorio(b) {
  // 844×390: horizontal, controles encimados en las esquinas.
  const h = await abrirPagina(b, { email: 'angel@example.com', viejo: true, viewport: { width: 844, height: 390 }, contexto: { ...TACTIL, deviceScaleFactor: 2 }, out, ruta: RUTA, esperar: '[data-menu]' });
  await abrirJuego(h, 'futbolito-arena', { tap: true });
  const fh = await marcoDe(h);
  await fh.waitForSelector('#b-jugar', { timeout: 30000 });
  await fh.tap('[data-control="joystick"]'); await fh.tap('[data-op="modo"][data-v="2v2"]');
  await fh.tap('#b-jugar');
  await esperar(fh, () => window.__arena.estado().estadoP === 'juego');
  const c = await fh.evaluate(() => { const r = s => document.querySelector(s).getBoundingClientRect(); return { vw: innerWidth, vh: innerHeight, joy: r('#joy-zona'), a: r('#b-a'), b: r('#b-b'), m: r('#marcador') }; });
  const dentro = x => x.left >= -0.5 && x.top >= -0.5 && x.right <= c.vw + 0.5 && x.bottom <= c.vh + 0.5;
  ok('844×390: arena a lo largo, joystick, ⚡ y 🌀 dentro de la pantalla', (await estado(fh)).rot === 0 && dentro(c.joy) && dentro(c.a) && dentro(c.b) && c.a.top > c.m.bottom, JSON.stringify({ a: c.a, m: c.m.bottom }));
  await sleep(1500);
  await h.screenshot({ path: 'arena-844-partido.png' });
  await h.context().close();
  // Escritorio: teclado, 3 vs 3 en la arena grande.
  const e = await abrirPagina(b, { email: 'laura@example.com', viejo: true, viewport: { width: 1280, height: 800 }, out, ruta: RUTA, esperar: '[data-menu]' });
  await abrirJuego(e, 'futbolito-arena');
  const fe = await marcoDe(e);
  await fe.waitForSelector('#b-jugar', { timeout: 30000 });
  ok('escritorio: guía de teclas y sin controles táctiles', /Espacio/.test(await fe.textContent('#teclas')) && !(await fe.isVisible('[data-control="mando"]')));
  await fe.click('[data-op="modo"][data-v="3v3"]');
  await fe.click('#b-jugar');
  await esperar(fe, () => window.__arena.estado().estadoP === 'juego');
  const p3 = await fe.evaluate(() => ({ n: window.__arena.p().robots.length, arena: window.__arena.p().arena }));
  ok('3 vs 3: 6 robots en la arena grande', p3.n === 6 && p3.arena === 'grande', JSON.stringify(p3));
  await fe.locator('body').focus().catch(() => {});
  await e.keyboard.down('ArrowRight'); await sleep(450);
  const kr = await estado(fe);
  ok('teclado: → mueve tu robot a la derecha', kr.robot.vx > 2, String(kr.robot.vx));
  // Si justo cayó un gol (saque: nadie se mueve), se vuelve a intentar.
  let embistio = false;
  for (let k = 0; k < 3 && !embistio; k++) {
    await fe.evaluate(() => window.__arena.enJuego());
    await e.keyboard.press('Space'); await sleep(60);
    embistio = (await estado(fe)).robot.recA > 0.3;
    if (!embistio) await sleep(1300);
  }
  ok('teclado: Espacio embiste', embistio);
  await e.keyboard.up('ArrowRight');
  await e.keyboard.press('KeyK'); await sleep(60);
  ok('teclado: K gira', (await estado(fe)).robot.recB > 0.2);
  await sleep(800);
  await e.screenshot({ path: 'arena-escritorio-3v3.png' });
  const fps = await medirFps(e, fe);
  ok('fps: escritorio 3 vs 3 con CPU ×4 (meta 60, mínimo 50)', fps >= 50, String(fps));
  await e.keyboard.press('KeyP'); await sleep(150);
  ok('teclado: P pausa contra la IA', (await estado(fe)).vista === 'pausa');
  await e.context().close();
}

async function sala2v2(b, relevo) {
  const abrir = (email, viewport, extra, opciones) => abrirPagina(b, { email, viejo: true, viewport, contexto: extra, out, etiqueta: email, dialogos: 'aceptar', init: initVivo(relevo.url, { latencia: 80, perdida: 0.03, desorden: 0.1, ...(opciones || {}) }), ruta: RUTA + '&vivoSimulado=1', esperar: '[data-menu]' });
  const ps = [await abrir('marisol@example.com', { width: 390, height: 844 }, TACTIL), await abrir('angel@example.com', { width: 844, height: 390 }, TACTIL),
    await abrir('laura@example.com', { width: 390, height: 844 }, TACTIL), await abrir('fernando@example.com', { width: 1280, height: 800 }, {})];
  const [p] = ps;
  await p.click('[data-tab="partidas"]'); await p.waitForSelector('#f-crear');
  await p.selectOption('#p-juego', 'futbolito-arena');
  ok('crear: formato, arena y goles visibles al elegir Futbolito Arena', await p.isVisible('#p-aformato') && await p.isVisible('#p-agoles'));
  await p.selectOption('#p-aformato', '2v2');
  await p.click('#f-crear button[type=submit]'); await p.waitForSelector('[data-p="empezar"]', { timeout: 30000 });
  const codigo = (await p.textContent('#p-codigo-chip')).replace(/[^A-Z]/g, '');
  for (const q of ps.slice(1)) { await q.click('[data-tab="partidas"]'); await q.waitForSelector('#f-unirse'); await q.fill('#p-codigo', codigo); await q.click('#f-unirse button[type=submit]'); await q.waitForSelector('#p-equipos-arena', { timeout: 30000 }); }
  await p.waitForFunction(() => /4 personas/.test((document.getElementById('p-mesa') || {}).textContent || ''), null, { timeout: 30000 });
  const eqDe = async (q, nombre) => q.evaluate(n => { const d = [...document.querySelectorAll('#p-equipos-arena [data-eq]')].find(x => x.textContent.includes(n)); return d ? Number(d.dataset.eq) : -1; }, nombre);
  ok('espera: equipos parejos (Marisol y Laura 🌊, Angel y Fernando 🔥)', (await eqDe(p, 'Marisol')) === 0 && (await eqDe(p, 'Angel')) === 1 && (await eqDe(p, 'Laura')) === 0 && (await eqDe(p, 'Fernando')) === 1);
  // Laura se cambia al 🔥 Sol: Fernando pasa al 🌊 Mar para que queden parejos.
  await ps[2].click('[data-p="arena-equipo"]');
  await p.waitForFunction(() => { const d = [...document.querySelectorAll('#p-equipos-arena [data-eq]')].find(x => x.textContent.includes('Laura')); return d && d.dataset.eq === '1'; }, null, { timeout: 20000 });
  ok('espera: «Cambiar de equipo» (Laura al 🔥 Sol, Fernando al 🌊 Mar)', (await eqDe(p, 'Laura')) === 1 && (await eqDe(p, 'Fernando')) === 0);
  await ps[1].click('[data-p="arena-robot"][data-v="2"]');
  await p.waitForFunction(() => { const d = [...document.querySelectorAll('#p-equipos-arena [data-eq]')].find(x => x.textContent.includes('Angel')); return d && /249, 115, 22|f97316/i.test(d.innerHTML); }, null, { timeout: 20000 }).catch(() => {});
  const s0 = await sala(codigo, 'angel@example.com'), id = n => s0.jugadores.find(j => j.nombre === n).id;
  ok('espera: Angel eligió el robot naranja (3.er color del 🔥 Sol) y todos lo ven', s0.jugadores.find(j => j.nombre === 'Angel').robot === 2 && /f97316/i.test(await p.innerHTML('#p-equipos-arena')));
  await p.screenshot({ path: 'arena-390-espera-2v2.png', fullPage: true });
  await ps[1].screenshot({ path: 'arena-844-espera-2v2.png', fullPage: true });
  // ---- Partido en vivo ----
  await p.click('[data-p="empezar"]');
  const frs = []; for (const q of ps) frs.push(await marcoDe(q, '#p-body #arcade-frame'));
  await esperar(frs[0], () => window.__arena && window.__arena.red() && window.__arena.estado().vista === 'partido', null, 45000);
  for (const fr of frs.slice(1)) await esperar(fr, () => window.__arena && window.__arena.red() && window.__arena.red().recibidas > 5, null, 45000);
  const roles = await Promise.all(frs.map(fr => fr.evaluate(() => window.__arena.red().rol)));
  ok('roles: la anfitriona simula y los otros 3 son invitados', JSON.stringify(roles) === JSON.stringify(['anfitrion', 'invitado', 'invitado', 'invitado']), roles.join());
  await frs[1].waitForFunction(() => /\d+ ms/.test(document.getElementById('lat').textContent), null, { timeout: 15000 }).catch(() => {});
  ok('latencia en pantalla (📶 ms)', /📶 \d+ ms/.test(await frs[1].textContent('#lat')));
  // Gol de Angel (invitado): su ⚡ viaja al anfitrión.
  const yoAngel = await frs[1].evaluate(() => window.__arena.estado().yo);
  await frs[1].evaluate(() => { window.__boton = null; window.ArenaEntrada.registrar({ presionado: a => window.__boton === a, eje: () => ({ x: 0, y: 0 }) }); });
  let gol = false;
  for (let k = 0; k < 5 && !gol; k++) {
    await frs[0].evaluate(i => window.__arena.ponerParaTiro(i), yoAngel);
    await sleep(600);
    await frs[1].evaluate(() => { window.__boton = 'a'; }); await sleep(200); await frs[1].evaluate(() => { window.__boton = null; });
    try { await esperar(frs[0], () => window.__arena.estado().goles[1] >= 1, null, 4000); gol = true; } catch { await sleep(1800); }
  }
  ok('gol del invitado: su ⚡ llega al anfitrión y anota el 🔥 Sol', gol);
  for (const fr of frs) await esperar(fr, () => window.__arena.p().goles[1] >= 1, null, 8000).catch(() => {});
  const vistos = await Promise.all(frs.map(fr => fr.evaluate(() => window.__arena.p().goles.join('-'))));
  const gritos = await Promise.all(frs.map(fr => fr.evaluate(() => document.getElementById('grito').textContent)));
  ok('gol visto por los 4 (mismo marcador y grito)', vistos.every(v => v === vistos[0] && v.endsWith('-1')) && gritos.filter(g => /GOOOL/.test(g)).length >= 3, vistos.join(' ') + ' | ' + gritos.map(g => g.slice(0, 8)).join(','));
  await ps[1].screenshot({ path: 'arena-844-gol-sala.png' });
  await p.screenshot({ path: 'arena-390-sala-partido.png' });
  await ps[3].screenshot({ path: 'arena-escritorio-sala.png' });
  // Desconexión de Fernando y regreso.
  const yoFer = await frs[3].evaluate(() => window.__arena.estado().yo);
  relevo.cortar(id('Fernando'));
  await esperar(frs[0], i => window.__arena.red().caidos.includes(i), yoFer, 10000).catch(() => {});
  await sleep(400); // el aviso sale en el cuadro siguiente
  const caida = await frs[0].evaluate(() => ({ red: window.__arena.red(), aviso: document.getElementById('aviso').textContent }));
  ok('desconexión: la IA maneja el robot de Fernando y se avisa', caida.red.caidos.includes(yoFer) && /Fernando/.test(caida.aviso), JSON.stringify(caida));
  await p.screenshot({ path: 'arena-390-desconexion.png' });
  relevo.reanudar(id('Fernando'));
  await esperar(frs[0], i => !window.__arena.red().caidos.includes(i), yoFer, 10000).catch(() => {});
  ok('regreso: Fernando recupera su robot', !(await frs[0].evaluate(i => window.__arena.red().caidos.includes(i), yoFer)));
  // Final: confirmado por el servidor y podio en los 4.
  await frs[0].evaluate(() => window.__arena.terminarYa());
  for (const q of ps) await q.waitForSelector('#p-body .result', { timeout: 30000 });
  await p.waitForFunction(() => /confirmado/.test((document.getElementById('p-arena-nota') || {}).textContent || ''), null, { timeout: 20000 }).catch(() => {});
  const s1 = await sala(codigo, 'marisol@example.com');
  // Ganó el 🔥 Sol 1–0 (gol de Angel): Angel y Laura ganan, Marisol y Fernando pierden.
  ok('servidor: resultado confirmado 0–1 y puntos por equipo', s1.arena && s1.arena.estado === 'confirmado' && s1.arena.goles.join() === '0,1' && s1.arena.puntos[id('Angel')] === 360 && s1.arena.puntos[id('Laura')] === 360 && s1.arena.puntos[id('Marisol')] === 20, JSON.stringify(s1.arena));
  const podios = await Promise.all(ps.map(q => q.textContent('#p-body')));
  ok('podio en los 4 con el marcador y la revancha', podios.every(t => /Mar 0 – 1 Sol/.test(t)) && await p.isVisible('#p-revancha'), podios[1].replace(/\s+/g, ' ').slice(0, 140));
  await p.screenshot({ path: 'arena-390-podio.png', fullPage: true });
  await ps[1].screenshot({ path: 'arena-844-podio.png', fullPage: true });
  for (const q of ps) await q.context().close();
}

async function respaldo(b, relevo) {
  const abrir = (email, viewport) => abrirPagina(b, { email, viejo: true, viewport, contexto: TACTIL, out, etiqueta: email, dialogos: 'aceptar', init: initVivo(relevo.url, { noConecta: true }), ruta: RUTA + '&vivoSimulado=1', esperar: '[data-menu]' });
  const q = await abrir('jesus@example.com', { width: 390, height: 844 }), w = await abrir('angel@example.com', { width: 844, height: 390 });
  await q.click('[data-tab="partidas"]'); await q.waitForSelector('#f-crear');
  await q.selectOption('#p-juego', 'futbolito-arena'); await q.selectOption('#p-aformato', '1v1');
  await q.click('#f-crear button[type=submit]'); await q.waitForSelector('[data-p="empezar"]', { timeout: 30000 });
  const codigo = (await q.textContent('#p-codigo-chip')).replace(/[^A-Z]/g, '');
  await w.click('[data-tab="partidas"]'); await w.waitForSelector('#f-unirse'); await w.fill('#p-codigo', codigo); await w.click('#f-unirse button[type=submit]');
  await q.waitForFunction(() => /2 personas/.test((document.getElementById('p-mesa') || {}).textContent || ''), null, { timeout: 30000 });
  await q.click('[data-p="empezar"]');
  const fq = await marcoDe(q, '#p-body #arcade-frame');
  await fq.waitForSelector('#b-ir-solo', { timeout: 30000 });
  ok('respaldo: sin canal, mensaje claro y «Jugar contra la IA»', /no está disponible en esta sala/.test(await fq.textContent('#ov')));
  await q.screenshot({ path: 'arena-390-respaldo.png' });
  await fq.click('#b-ir-solo');
  const fs = await marcoDe(q);
  await fs.waitForSelector('#b-jugar', { timeout: 30000 });
  ok('respaldo: el botón abre el juego contra la IA', true);
  await q.context().close(); await w.context().close();
}

(async () => {
  const relevo = await levantarRelevo();
  const b = await chromium.launch({ executablePath: process.env.CHROME });
  await soloConToques(b);
  await horizontalYEscritorio(b);
  await sala2v2(b, relevo);
  await respaldo(b, relevo);
  await b.close(); await relevo.cerrar();
  console.log(out.join('\n')); process.exit(out.some(x => x.startsWith('FAIL')) ? 1 : 0);
})().catch(e => { console.log(out.join('\n')); console.error('ERROR', e.message.slice(0, 400)); process.exit(2); });
