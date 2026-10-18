// E2E: «🦎 Brigada Xalli» (openspec: brigada-xalli). Usa ?arcadePrueba=1 (ganchos window.__brigada).
// Modo individual: tarjeta en 🕹️ Arcade; portada con personaje, misiones y compañeros; misión con TOQUES REALES (CDP
// Input.dispatchTouchEvent: joystick, A salta, B mantenido dispara, X globo, Y cambia arma); rescate, robot derribado,
// jefe vencido, fin con estrellas, avance guardado en el servidor y puntos de ranking; 🎮 mando clásico (toque real en
// su A) y control físico simulado; teclado en escritorio; compañeros IA; capturas a 390×844, 844×390 y escritorio, y fps
// con CPU ×4.
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
const estado = fr => fr.evaluate(() => window.__brigada.estado());
const GAMEPAD = [() => { Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => window.__pads || [null, null, null, null] }); }];
const pad = (presionados = [], ejes = [0, 0, 0, 0]) => ({ id: 'Control de prueba', index: 0, connected: true, mapping: 'standard', axes: ejes, buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: presionados.includes(i), value: presionados.includes(i) ? 1 : 0 })) });
const progreso = async email => (await (await fetch(API + '/juegos/progreso/brigada?email=' + encodeURIComponent(email))).json());

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
const enMision = fr => esperar(fr, () => { const e = window.__brigada.estado(); return e.vista === 'partido' && e.estadoM === 'juego'; });

async function soloConToques(b) {
  const email = 'marisol@example.com';
  const p = await abrirPagina(b, { email, viejo: true, viewport: { width: 390, height: 844 }, contexto: { ...TACTIL, deviceScaleFactor: 2 }, out, ruta: RUTA, esperar: '[data-menu]', init: GAMEPAD });
  const tarjeta = await textoTarjeta(p, 'brigada'), arcade = await idsDe(p, 'arcade');
  ok('catálogo: «Brigada Xalli» en Arcade', /Brigada Xalli/.test(tarjeta) && arcade.includes('brigada'), arcade.join(','));
  await abrirJuego(p, 'brigada', { tap: true });
  const fr = await marcoDe(p);
  await fr.waitForSelector('#b-jugar', { timeout: 30000 });
  const portada = await fr.evaluate(() => ({ pers: document.querySelectorAll('[data-pj]').length, mis: document.querySelectorAll('[data-mision]').length, bloqueadas: document.querySelectorAll('[data-mision]:disabled').length }));
  ok('portada: 8 personajes, 4 misiones y solo la 1 desbloqueada', portada.pers === 8 && portada.mis === 4 && portada.bloqueadas === 3, JSON.stringify(portada));
  await fr.tap('[data-pj="tona"]');
  ok('portada: elegir a Tona', /Tona/.test(await fr.textContent('#pers-detalle')));
  await p.screenshot({ path: 'brigada-390-portada.png' });
  await fr.tap('#b-jugar');
  await enMision(fr);
  const e0 = await estado(fr);
  ok('misión 1 en vertical con controles debajo', e0.mision === 1 && e0.vertical && await fr.isVisible('#joy-zona') && await fr.isVisible('#b-b'), JSON.stringify({ m: e0.mision, v: e0.vertical }));
  await fr.evaluate(() => window.__brigada.invulnerable());
  // Joystick con toque real: arrastrar a la derecha → corre (con inercia).
  const joy = await centro(fr, '#joy-zona'), d = dedos(p);
  await d.poner(1, joy.x, joy.y); for (let k = 1; k <= 6; k++) { await d.mover(1, joy.x + k * 10, joy.y); await sleep(25); }
  await sleep(500);
  const corre = await estado(fr);
  ok('toques: el joystick hace correr al personaje', corre.yo.vx > 60 && corre.entrada.c4, JSON.stringify({ vx: corre.yo.vx, ent: corre.entrada }));
  // A (salta) con el joystick puesto: multitáctil.
  await d.poner(2, ...Object.values(await centro(fr, '#b-a'))); await sleep(120);
  const salta = await estado(fr);
  await d.quitar(2);
  ok('toques: A salta (multitáctil con el joystick)', salta.yo.vy < 0 || !salta.yo.suelo, JSON.stringify({ vy: salta.yo.vy, suelo: salta.yo.suelo }));
  await d.quitar(1);
  await sleep(600);
  // Joystick arriba: apunta hacia arriba (4 direcciones con toques).
  await d.poner(1, joy.x, joy.y); await d.mover(1, joy.x + 4, joy.y - 45); await sleep(150);
  ok('toques: joystick arriba apunta hacia arriba', (await estado(fr)).yo.aim === 6, String((await estado(fr)).yo.aim));
  await d.quitar(1);
  // B mantenido: ráfaga de burbujas que derriba a un robot enfrente.
  await fr.evaluate(() => { window.__brigada.limpiar(); window.__brigada.enemigo('patrulla', 90); });
  const bb = await centro(fr, '#b-b');
  await d.poner(3, bb.x, bb.y); await sleep(1500);
  const disparo = await estado(fr);
  await d.quitar(3);
  ok('toques: B mantenido dispara seguido y derriba al robot', disparo.yo.robots >= 1 && disparo.yo.puntos >= 100, JSON.stringify({ robots: disparo.yo.robots, puntos: disparo.yo.puntos }));
  await p.screenshot({ path: 'brigada-390-accion.png' });
  // Rescate: jaula enfrente y un disparo.
  await fr.evaluate(() => window.__brigada.jaula(70));
  await d.poner(3, bb.x, bb.y); await sleep(700); await d.quitar(3);
  await sleep(200);
  const rescate = await estado(fr);
  ok('rescate: la jaula se abre y suma 500', rescate.yo.rescates >= 1, JSON.stringify({ r: rescate.yo.rescates, puntos: rescate.yo.puntos }));
  // X = globo; Y = cambiar arma.
  const globos = (await estado(fr)).yo.globos;
  await tocar(p, fr, '#b-x', 80); await sleep(150);
  ok('toques: X lanza un globo de confeti', (await estado(fr)).yo.globos === globos - 1);
  await fr.evaluate(() => { window.__brigada.m().jugadores[0].mun.laser = 30; });
  await tocar(p, fr, '#b-y', 80); await sleep(120);
  ok('toques: Y cambia al láser de juguete', (await estado(fr)).yo.arma === 'laser');
  // Jefe: a la arena, debilitado y vencido a disparos.
  await fr.evaluate(() => window.__brigada.alJefe());
  await esperar(fr, () => { const e = window.__brigada.estado(); return e.jefe && e.jefe.fase !== 'entrada'; }, null, 20000);
  await sleep(600);
  await p.screenshot({ path: 'brigada-390-jefe.png' });
  ok('jefe: aparece el Tractor Tragahojas con su barra de vida', (await estado(fr)).jefe.tipo === 'tractor' && await fr.isVisible('#jefe-barra'));
  await fr.evaluate(() => window.__brigada.debilitarJefe());
  await d.poner(3, bb.x, bb.y);
  await esperar(fr, () => ['victoria', 'cumplida'].includes(window.__brigada.estado().estadoM), null, 20000).catch(() => {});
  await d.quitar(3);
  await fr.waitForSelector('#b-siguiente', { timeout: 15000 });
  await fr.waitForFunction(() => /guardados/.test(document.getElementById('res-puntos').textContent), null, { timeout: 15000 }).catch(() => {});
  const fin = await fr.textContent('#ov'), em = await fr.evaluate(() => window.Emocion.eventos().map(x => x.ev));
  ok('fin: «¡Misión cumplida!» con estrellas, puntos guardados y Emoción', /Misión cumplida/.test(fin) && /guardados/.test(fin) && em.includes('nivelSuperado'), fin.replace(/\s+/g, ' ').slice(0, 160));
  await p.screenshot({ path: 'brigada-390-fin.png' });
  await sleep(1500);
  const pr = await progreso(email);
  ok('avance: guardado en el servidor (misión 2 desbloqueada, récord y Tona)', pr.v >= 1 && pr.datos.desbloqueada === 2 && pr.datos.misiones['1'].record > 0 && pr.datos.personaje === 'tona', JSON.stringify(pr.datos).slice(0, 200));
  // 🎮 Mando clásico: se ve y su A (toque real) salta; control físico: palanca.
  await fr.tap('[data-a="menu"]'); await fr.waitForSelector('[data-control="mando"]');
  ok('portada: la misión 2 ya se puede elegir', !(await fr.isDisabled('[data-mision="2"]')));
  await fr.tap('[data-control="mando"]'); await fr.tap('[data-mision="1"]');
  await fr.tap('#b-jugar');
  await enMision(fr);
  await fr.evaluate(() => window.__brigada.invulnerable());
  await esperar(fr, () => window.__brigada.estado().mando.visible, null, 5000).catch(() => {});
  ok('mando clásico: visible y sin el joystick propio', (await estado(fr)).mando.visible && !(await fr.isVisible('#joy-zona')));
  await sleep(300);
  await tocar(p, fr, '.mando-boton[data-b="A"]', 120); await sleep(40);
  const ma = await estado(fr);
  ok('mando clásico: A con toque real salta', ma.yo.vy < 0 || !ma.yo.suelo, JSON.stringify({ vy: ma.yo.vy }));
  await p.screenshot({ path: 'brigada-390-mando.png' });
  await sleep(800);
  await fr.evaluate(p0 => { window.__pads = [p0]; }, pad([], [1, 0, 0, 0]));
  let maxV = 0; for (let k = 0; k < 8; k++) { await sleep(70); maxV = Math.max(maxV, (await estado(fr)).yo.vx); }
  ok('control físico: la palanca hace correr', maxV > 60, maxV.toFixed(1));
  await fr.evaluate(p0 => { window.__pads = [p0]; }, pad([1], [0, 0, 0, 0]));
  await sleep(500);
  const pd = await fr.evaluate(() => window.__brigada.m().balas.filter(x => x.vivo).length);
  ok('control físico: B (derecha) dispara', pd > 0, String(pd));
  await fr.evaluate(() => { window.__pads = [null]; });
  await p.context().close();
}

async function horizontalYEscritorio(b) {
  // 844×390 con 3 compañeros IA: controles encimados en las esquinas y fps con CPU ×4.
  const h = await abrirPagina(b, { email: 'angel@example.com', viejo: true, viewport: { width: 844, height: 390 }, contexto: { ...TACTIL, deviceScaleFactor: 2 }, out, ruta: RUTA, esperar: '[data-menu]' });
  await abrirJuego(h, 'brigada', { tap: true });
  const fh = await marcoDe(h);
  await fh.waitForSelector('#b-jugar', { timeout: 30000 });
  await fh.tap('[data-control="joystick"]'); await fh.tap('[data-comp="3"]');
  await h.screenshot({ path: 'brigada-844-portada.png' });
  await fh.tap('#b-jugar');
  await enMision(fh);
  const c = await fh.evaluate(() => { const r = s => document.querySelector(s).getBoundingClientRect(); return { vw: innerWidth, vh: innerHeight, joy: r('#joy-zona'), a: r('#b-a'), b: r('#b-b'), x: r('#b-x'), y: r('#b-y') }; });
  const dentro = x => x.left >= -0.5 && x.top >= -0.5 && x.right <= c.vw + 0.5 && x.bottom <= c.vh + 0.5;
  ok('844×390: joystick y A/B/X/Y dentro de la pantalla', dentro(c.joy) && dentro(c.a) && dentro(c.b) && dentro(c.x) && dentro(c.y), JSON.stringify(c.a));
  const n = await fh.evaluate(() => window.__brigada.m().jugadores.length);
  ok('compañeros IA: 4 personajes en la misión', n === 4, String(n));
  // Los compañeros avanzan solos con el grupo.
  await fh.evaluate(() => window.__brigada.invulnerable());
  const ent = { x: 1 };
  await fh.evaluate(() => window.BrigadaEntrada.registrar({ eje: () => ({ x: 1, y: 0 }), presionado: a => a === 'b' }));
  await sleep(4000);
  const av = await fh.evaluate(() => { const m = window.__brigada.m(); return { cam: m.cam.x, xs: m.jugadores.map(p => Math.round(p.x)), robots: m.jugadores.reduce((s, p) => s + p.robots, 0) }; });
  ok('compañeros: el equipo avanza y derriba robots', av.cam > 150 && av.robots >= 1 && av.xs.every(x => x >= av.cam), JSON.stringify(av) + JSON.stringify(ent));
  await h.screenshot({ path: 'brigada-844-accion.png' });
  const fps = await medirFps(h, fh);
  ok('fps: 844×390 con 4 personajes y CPU ×4 (meta 60, mínimo 50)', fps >= 50, String(fps));
  await fh.evaluate(() => window.__brigada.alJefe());
  await esperar(fh, () => { const e = window.__brigada.estado(); return e.jefe && e.jefe.fase !== 'entrada'; }, null, 20000);
  await sleep(1500);
  await h.screenshot({ path: 'brigada-844-jefe.png' });
  await h.context().close();
  // Escritorio: teclado.
  const e = await abrirPagina(b, { email: 'laura@example.com', viejo: true, viewport: { width: 1280, height: 800 }, out, ruta: RUTA, esperar: '[data-menu]' });
  await abrirJuego(e, 'brigada');
  const fe = await marcoDe(e);
  await fe.waitForSelector('#b-jugar', { timeout: 30000 });
  ok('escritorio: guía de teclas y sin controles táctiles', /K o Espacio/.test(await fe.textContent('#teclas')) && !(await fe.isVisible('[data-control="mando"]')));
  await fe.click('#b-jugar');
  await enMision(fe);
  await fe.evaluate(() => window.__brigada.invulnerable());
  await fe.locator('body').focus().catch(() => {});
  await e.keyboard.down('ArrowRight'); await sleep(450);
  ok('teclado: → corre', (await estado(fe)).yo.vx > 60);
  await e.keyboard.press('KeyK'); await sleep(80);
  ok('teclado: K salta', !(await estado(fe)).yo.suelo);
  await e.keyboard.up('ArrowRight'); await sleep(700);
  await e.keyboard.down('ArrowDown'); await sleep(120);
  ok('teclado: ↓ agacha', (await estado(fe)).yo.agachado);
  await e.keyboard.up('ArrowDown');
  await e.keyboard.down('KeyJ'); await sleep(500);
  const bk = await fe.evaluate(() => window.__brigada.m().balas.filter(x => x.vivo).length);
  await e.keyboard.up('KeyJ');
  ok('teclado: J dispara', bk > 0, String(bk));
  const gl = (await estado(fe)).yo.globos;
  await e.keyboard.press('KeyL'); await sleep(100);
  ok('teclado: L lanza globo', (await estado(fe)).yo.globos === gl - 1);
  await sleep(400);
  await e.screenshot({ path: 'brigada-escritorio-accion.png' });
  const fpsE = await medirFps(e, fe);
  ok('fps: escritorio con CPU ×4 (mínimo 50)', fpsE >= 50, String(fpsE));
  await e.keyboard.press('KeyP'); await sleep(150);
  ok('teclado: P pausa', (await estado(fe)).vista === 'pausa');
  // Misión fallida → reintentar.
  await fe.click('[data-a="seguir"]'); await sleep(150);
  await fe.evaluate(() => window.__brigada.fallarYa());
  await fe.waitForSelector('#b-reintentar', { timeout: 10000 });
  await e.screenshot({ path: 'brigada-escritorio-fallida.png' });
  await fe.click('#b-reintentar');
  await sleep(300);
  const re = await fe.evaluate(() => ({ e: window.__brigada.m().estado, r: window.__brigada.m().reintentos, v: window.__brigada.estado().vista }));
  ok('fallida: «Reintentar» vuelve al punto de control con vidas', re.e === 'juego' && re.r === 1 && re.v === 'partido', JSON.stringify(re));
  await e.context().close();
}

// ================= Cooperativo en vivo (canal simulado: relevo local + EnVivo.simulado) =================
const pedir = async (email, ruta, body) => {
  const r = await fetch(API + ruta + '?email=' + encodeURIComponent(email), { method: 'POST', body: JSON.stringify(body || {}) });
  return { status: r.status, body: await r.json() };
};
const salaDe = async (codigo, quien) => (await fetch(API + '/juegos/sala/' + codigo + '?email=' + encodeURIComponent(quien))).json();
async function crearSalaBrigada(p, mision = '1', bots = false) {
  await p.click('[data-tab="partidas"]'); await p.waitForSelector('#f-crear');
  await p.selectOption('#p-juego', 'brigada');
  await p.selectOption('#p-bmision', mision);
  const conBots = await p.isChecked('#p-bots');
  if (conBots !== bots) await p.click('#p-bots');
  await p.click('#f-crear button[type=submit]'); await p.waitForSelector('[data-p="empezar"]', { timeout: 30000 });
  return (await p.textContent('#p-codigo-chip')).replace(/[^A-Z]/g, '');
}
async function unirseSala(q, codigo) {
  await q.click('[data-tab="partidas"]'); await q.waitForSelector('#f-unirse');
  await q.fill('#p-codigo', codigo); await q.click('#f-unirse button[type=submit]');
  await q.waitForSelector('#p-personaje', { timeout: 30000 });
}
const enSala = (fr, n = 3) => esperar(fr, k => window.__brigada && window.__brigada.red() && (window.__brigada.red().rol === 'anfitrion' || window.__brigada.red().recibidas > k), n, 60000);

async function cooperativo4(b, relevo) {
  const abrir = (email, viewport, extra) => abrirPagina(b, { email, viejo: true, viewport, contexto: extra, out, etiqueta: email, dialogos: 'aceptar', init: initVivo(relevo.url, { latencia: 80, perdida: 0.03, desorden: 0.1 }), ruta: RUTA + '&vivoSimulado=1', esperar: '[data-menu]' });
  const ps = [await abrir('marisol@example.com', { width: 390, height: 844 }, TACTIL), await abrir('angel@example.com', { width: 844, height: 390 }, TACTIL),
    await abrir('laura@example.com', { width: 390, height: 844 }, TACTIL), await abrir('fernando@example.com', { width: 1280, height: 800 }, {})];
  const [p] = ps;
  await p.click('[data-tab="partidas"]'); await p.waitForSelector('#f-crear');
  await p.selectOption('#p-juego', 'brigada');
  ok('crear: Brigada Xalli con la misión a elegir', await p.isVisible('#p-bmision'));
  const codigo = await crearSalaBrigada(p, '1', false);
  for (const q of ps.slice(1)) await unirseSala(q, codigo); // NOSONAR: entran en orden
  await p.waitForFunction(() => /4 personas/.test((document.getElementById('p-mesa') || {}).textContent || ''), null, { timeout: 30000 }).catch(() => {});
  await ps[1].click('[data-p="personaje"][data-personaje="kinich"]');
  await p.waitForFunction(() => /Kinich/.test(document.getElementById('p-body').textContent), null, { timeout: 20000 }).catch(() => {});
  const s0 = await salaDe(codigo, 'angel@example.com'), id = n => s0.jugadores.find(j => j.nombre === n).id;
  ok('espera: 4 personas sin bots y Angel eligió a Kinich', s0.jugadores.length === 4 && s0.jugadores.find(j => j.nombre === 'Angel').personaje === 'kinich', JSON.stringify(s0.jugadores.map(j => j.personaje)));
  await p.screenshot({ path: 'brigada-390-espera.png', fullPage: true });
  await p.click('[data-p="empezar"]');
  const frs = []; for (const q of ps) frs.push(await marcoDe(q, '#p-body #arcade-frame')); // NOSONAR: en orden
  await enSala(frs[0]);
  for (const fr of frs.slice(1)) await enSala(fr, 5); // NOSONAR: en orden
  const roles = await Promise.all(frs.map(fr => fr.evaluate(() => window.__brigada.red().rol)));
  ok('roles: la anfitriona simula y los otros 3 son invitados', JSON.stringify(roles) === JSON.stringify(['anfitrion', 'invitado', 'invitado', 'invitado']), roles.join());
  await frs[0].evaluate(() => window.__brigada.invulnerable());
  // Todos avanzan a la derecha disparando (fuente registrada en cada aparato): aparecen enemigos.
  for (const fr of frs) await fr.evaluate(() => { window.__mueve = true; window.BrigadaEntrada.registrar({ eje: () => ({ x: window.__mueve ? 1 : 0, y: 0 }), presionado: a => a === 'b' && window.__dispara !== false }); }); // NOSONAR: en orden
  const t0 = Date.now();
  await sleep(6000);
  // Enemigos por id: lo que ve cada invitado tiene que estar en lo que simuló el anfitrión en los últimos 1.5 s.
  const host = new Set();
  for (let k = 0; k < 4; k++) { (await frs[0].evaluate(() => window.__brigada.red().enemigos)).forEach(x => host.add(x)); if (k === 2) var vistas = await Promise.all(frs.slice(1).map(fr => fr.evaluate(() => window.__brigada.red().enemigos))); await sleep(400); } // NOSONAR: muestras en orden
  const parecido = vistas.map(v => (v.length ? v.filter(x => host.has(x)).length / v.length : 1));
  ok('mismos enemigos en los 4 aparatos (por id)', host.size > 0 && vistas.some(v => v.length) && parecido.every(x => x >= 0.6), JSON.stringify({ host: host.size, vistas: vistas.map(v => v.length), parecido }));
  await frs[1].waitForFunction(() => /\d+ ms/.test(document.getElementById('lat').textContent), null, { timeout: 15000 }).catch(() => {});
  ok('latencia en pantalla (📶 ms)', /📶 \d+ ms/.test(await frs[1].textContent('#lat')));
  await ps[1].screenshot({ path: 'brigada-844-equipo.png' });
  await p.screenshot({ path: 'brigada-390-equipo.png' });
  await ps[3].screenshot({ path: 'brigada-escritorio-equipo.png' });
  // Desconexión de Fernando y regreso.
  const yoFer = await frs[3].evaluate(() => window.__brigada.estado().yo ? window.__brigada.m().jugadores.findIndex(j => j === window.__brigada.m().jugadores[window.__brigada.estado().yo]) : 3);
  relevo.cortar(id('Fernando'));
  await esperar(frs[0], () => window.__brigada.red().caidos.length > 0, null, 10000).catch(() => {});
  await sleep(300);
  const caida = await frs[0].evaluate(() => ({ red: window.__brigada.red().caidos, aviso: document.getElementById('aviso').textContent }));
  ok('desconexión: la IA maneja al personaje de Fernando y se avisa', caida.red.length === 1 && /Fernando/.test(caida.aviso), JSON.stringify(caida) + yoFer);
  relevo.reanudar(id('Fernando'));
  await esperar(frs[0], () => window.__brigada.red().caidos.length === 0, null, 10000).catch(() => {});
  ok('regreso: Fernando recupera su personaje', (await frs[0].evaluate(() => window.__brigada.red().caidos.length)) === 0);
  // Jefe: Angel (invitada) lo vence a burbujazos; su disparo viaja al anfitrión.
  for (const fr of frs) await fr.evaluate(() => { window.__mueve = false; window.__dispara = false; }); // NOSONAR: en orden
  await frs[0].evaluate(() => window.__brigada.alJefe());
  await esperar(frs[0], () => { const j = window.__brigada.estado().jefe; return j && j.fase !== 'entrada'; }, null, 20000);
  await esperar(frs[1], () => !!window.__brigada.m().jefe, null, 10000).catch(() => {});
  await sleep(500);
  await ps[1].screenshot({ path: 'brigada-844-jefe-equipo.png' });
  // El servidor no acepta una misión de menos de 20 s (imposible jugando): se espera a que pasen 24 s.
  await sleep(Math.max(0, 24000 - (Date.now() - t0)));
  await frs[0].evaluate(() => window.__brigada.debilitarJefe());
  await frs[1].evaluate(() => { window.__dispara = true; });
  await esperar(frs[0], () => ['victoria', 'cumplida'].includes(window.__brigada.estado().estadoM), null, 20000).catch(() => {});
  const ganador = await frs[0].evaluate(() => window.__brigada.m().jugadores.map(j => j.puntos));
  ok('jefe vencido por la invitada (su disparo llega al anfitrión)', ganador[1] >= 5000, ganador.join(','));
  // Al terminar, cada iframe manda `fin-sala` y la página lo cambia por el podio (el título dice «cumplida»).
  for (const q of ps) await q.waitForSelector('#p-body .result', { timeout: 30000 }); // NOSONAR: en orden
  const fines = await Promise.all(ps.map(q => q.textContent('#p-body .result h1')));
  ok('los 4 ven la misión cumplida', fines.every(t => /cumplida/.test(t)), fines.join(' | '));
  await p.waitForFunction(() => /confirmado/.test((document.getElementById('p-brigada-nota') || {}).textContent || ''), null, { timeout: 20000 }).catch(() => {});
  const s1 = await salaDe(codigo, 'marisol@example.com');
  ok('servidor: resultado confirmado, puntos por persona y del equipo', s1.brigada && s1.brigada.estado === 'confirmado' && s1.brigada.ranking[id('Angel')] >= 250 && s1.brigada.equipo > 5000, JSON.stringify(s1.brigada).slice(0, 200));
  const podios = await Promise.all(ps.map(q => q.textContent('#p-body')));
  ok('podio en los 4 con los puntos del equipo y la revancha', podios.every(t => /equipo/.test(t)) && await p.isVisible('#p-revancha'), podios[1].replace(/\s+/g, ' ').slice(0, 140));
  const em = await p.evaluate(() => (window.Emocion ? window.Emocion.eventos().map(x => x.ev) : []));
  ok('podio con Emocion.podio', em.includes('podio'), em.slice(-6).join(','));
  await p.screenshot({ path: 'brigada-390-podio.png', fullPage: true });
  await ps[1].screenshot({ path: 'brigada-844-podio.png', fullPage: true });
  for (const q of ps) await q.context().close(); // NOSONAR: en orden
}

// Chequeo ligero con 8 contextos (todos se conectan y ven la misma misión) y fps del anfitrión con 8 personajes
// (las otras 7 entradas las inyecta el relevo desde Node, como Karts en vivo: 8 navegadores dibujando a la vez
// contaminan la medición).
async function ocho(b, relevo) {
  const sufijo = Date.now() % 100000;
  const invitados = ['Nube', 'Rayo', 'Trueno'].map((n, k) => ({ email: `bx-${n.toLowerCase()}-${sufijo}@example.com`, nombre: n + ' ' + (k + 1) }));
  const altas = await Promise.all(invitados.map(i => pedir(i.email, '/juegos/invitado', { nombre: i.nombre, acepto: true })));
  ok('alta de 3 invitados de prueba', altas.every(r => r.status === 200), altas.map(r => r.status).join(','));
  const correos = ['marisol', 'angel', 'laura', 'fernando', 'jesus'].map(n => n + '@example.com').concat(invitados.map(i => i.email));
  const abrir = email => abrirPagina(b, { email, viejo: true, viewport: { width: 640, height: 400 }, out, etiqueta: email, dialogos: 'aceptar', init: initVivo(relevo.url, { latencia: 60, perdida: 0.02, desorden: 0.1 }), ruta: RUTA + '&vivoSimulado=1', esperar: '[data-menu]' });
  const ps = [];
  for (const e of correos) ps.push(await abrir(e)); // NOSONAR: en orden
  const codigo = await crearSalaBrigada(ps[0], '2', false);
  for (const q of ps.slice(1)) await unirseSala(q, codigo); // NOSONAR: en orden
  await ps[0].waitForFunction(() => /8 personas/.test((document.getElementById('p-mesa') || {}).textContent || ''), null, { timeout: 30000 }).catch(() => {});
  const lleno = await pedir('valeria@example.com', '/juegos/sala/' + codigo + '/unirse', {});
  ok('sala de 8: la novena persona recibe «sala_llena»', lleno.status === 409 && lleno.body.error === 'sala_llena', JSON.stringify(lleno.body));
  await ps[0].click('[data-p="empezar"]');
  const frs = []; for (const q of ps) frs.push(await marcoDe(q, '#p-body #arcade-frame')); // NOSONAR: en orden
  let conectados = 0;
  for (const fr of frs) { try { await enSala(fr, 3); conectados++; } catch { /* lo cuenta abajo */ } } // NOSONAR: en orden
  ok('8 aparatos conectados al canal (anfitrión + 7 invitados con fotos)', conectados === 8, String(conectados));
  const n = await frs[0].evaluate(() => window.__brigada.m().jugadores.length);
  ok('misión con 8 personajes', n === 8, String(n));
  await sleep(2000);
  const bytes = await frs[0].evaluate(() => window.__brigada.red().bytes);
  ok('fotos de 8 personajes < 1700 B', bytes.length > 0 && Math.max(...bytes) < 1700, 'máx ' + Math.max(...bytes) + ' prom ' + Math.round(bytes.reduce((s, x) => s + x, 0) / bytes.length));
  await ps[3].screenshot({ path: 'brigada-ocho.png' });
  await frs[0].evaluate(() => window.__brigada.terminarYa());
  let fin = 0;
  for (const q of ps) { try { await q.waitForSelector('#p-body .result', { timeout: 30000 }); fin++; } catch { /* lo cuenta abajo */ } } // NOSONAR: en orden
  ok('los 8 ven el podio', fin === 8, String(fin));
  for (const q of ps) await q.context().close(); // NOSONAR: en orden
}
async function fpsAnfitrion8(b, relevo) {
  const sufijo = Date.now() % 100000;
  const invitados = Array.from({ length: 7 }, (_, k) => ({ email: `bxf-${k}-${sufijo}@example.com`, nombre: 'Brigada ' + (k + 1) }));
  await Promise.all(invitados.map(i => pedir(i.email, '/juegos/invitado', { nombre: i.nombre, acepto: true })));
  const m = await abrirPagina(b, { email: 'valeria@example.com', viejo: true, viewport: { width: 844, height: 390 }, contexto: { ...TACTIL, deviceScaleFactor: 2 }, out, init: initVivo(relevo.url, { latencia: 60 }), ruta: RUTA + '&vivoSimulado=1', esperar: '[data-menu]' });
  const codigo = await crearSalaBrigada(m, '3', false);
  for (const i of invitados) await pedir(i.email, '/juegos/sala/' + codigo + '/unirse', {}); // NOSONAR: en orden
  const s = await salaDe(codigo, invitados[0].email), ids = s.jugadores.map(j => j.id).filter(x => x !== s.sala.host);
  await m.waitForFunction(() => /8 personas/.test((document.getElementById('p-mesa') || {}).textContent || ''), null, { timeout: 30000 }).catch(() => {});
  let seq = 0;
  const iv = setInterval(() => ids.forEach((id, k) => { seq++; relevo.inyectar('sala-sim-' + codigo, { i: id, s: seq, t: Date.now(), e: 'bx:entrada', d: { s: seq, x: k % 3 ? 100 : 60, y: 0, m: 2, na: 0, nx: 0, ny: 0 } }); }), 100);
  await m.click('[data-p="empezar"]');
  const fr = await marcoDe(m, '#p-body #arcade-frame');
  await enSala(fr);
  await fr.evaluate(() => window.__brigada.invulnerable());
  await sleep(5000);
  const cdp = await m.context().newCDPSession(m);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await sleep(1500);
  const xs = [];
  for (let k = 0; k < 8; k++) { await sleep(500); xs.push((await estado(fr)).fps); } // NOSONAR: lecturas en orden
  xs.sort((a, b2) => a - b2);
  const e = await fr.evaluate(() => ({ n: window.__brigada.m().jugadores.length, enemigos: window.__brigada.estado().enemigos, caidos: window.__brigada.red().caidos }));
  await m.screenshot({ path: 'brigada-844-ocho-cpu4.png' });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  clearInterval(iv);
  ok('fps del anfitrión con 8 personajes y enemigos, CPU ×4 (meta 60, mínimo 50)', xs[4] >= 50 && e.n === 8 && e.caidos.length === 0, 'fps=' + xs[4] + ' ' + JSON.stringify(e));
  await m.context().close();
}
async function respaldoSinCanal(b, relevo) {
  const abrir = (email, viewport) => abrirPagina(b, { email, viejo: true, viewport, contexto: TACTIL, out, etiqueta: email, dialogos: 'aceptar', init: initVivo(relevo.url, { noConecta: true }), ruta: RUTA + '&vivoSimulado=1', esperar: '[data-menu]' });
  const q = await abrir('jesus@example.com', { width: 390, height: 844 }), w = await abrir('angel@example.com', { width: 844, height: 390 });
  const codigo = await crearSalaBrigada(q, '1', false);
  await unirseSala(w, codigo);
  await q.waitForFunction(() => /2 personas/.test((document.getElementById('p-mesa') || {}).textContent || ''), null, { timeout: 30000 }).catch(() => {});
  await q.click('[data-p="empezar"]');
  const fq = await marcoDe(q, '#p-body #arcade-frame');
  await fq.waitForSelector('#b-ir-solo', { timeout: 30000 });
  ok('respaldo: sin canal, mensaje claro y «Jugar solo»', /no está disponible en esta sala/.test(await fq.textContent('#ov')));
  await q.screenshot({ path: 'brigada-390-respaldo.png' });
  await fq.click('#b-ir-solo');
  const fs = await marcoDe(q);
  await fs.waitForSelector('#b-jugar', { timeout: 30000 });
  ok('respaldo: el botón abre el juego individual', true);
  await q.context().close(); await w.context().close();
}

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME });
  const soloCoop = process.env.BRIGADA_SOLO_COOP === '1';
  if (!soloCoop) {
    await soloConToques(b);
    await horizontalYEscritorio(b);
  }
  const relevo = await levantarRelevo();
  await cooperativo4(b, relevo);
  await ocho(b, relevo);
  await fpsAnfitrion8(b, relevo);
  await respaldoSinCanal(b, relevo);
  await relevo.cerrar();
  await b.close();
  console.log(out.join('\n')); process.exit(out.some(x => x.startsWith('FAIL')) ? 1 : 0);
})().catch(e => { console.log(out.join('\n')); console.error('ERROR', e.message.slice(0, 400)); process.exit(2); });
