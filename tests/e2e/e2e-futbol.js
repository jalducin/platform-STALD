// E2E: «⚽ Fútbol Estelar 2010» (openspec: futbol-estelar). Usa ?arcadePrueba=1 (ganchos window.__futbol).
// Catálogo: Fútbol Estelar en 🕹️ Arcade y Futbolito fuera del menú y de «Crear partida». Menú con los 5 modos.
// Celular con TOQUES REALES (CDP Input.dispatchTouchEvent, hasTouch + isMobile): saque con A, joystick que mueve al
// jugador, multitáctil (joystick + A pasa, joystick + B mantenido tira con potencia), textos de defensa, gol y partido
// rápido que termina con ⭐ en el ranking y avance en el servidor. Mando clásico elegido y recordado (A con toque real),
// control físico simulado (navigator.getGamepads), teclado (J/K, flechas), dos controles locales simulados (cada uno
// mueve solo a su equipo), carrera creada, simulada, guardada y recuperada tras recargar, torneo de 4 hasta el final,
// clasificatoria semanal (mejor de la semana guardado), distribución a 320×640 y 844×390, capturas y fps con CPU ×4.
require('./lib/entorno');
const { chromium } = require('playwright');
const { abrirPagina } = require('./lib/navegador');
const { contarMenu, abrirJuego, textoTarjeta, idsDe } = require('./lib/menu');
const API = process.env.API;
const out = []; const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const EMAIL = 'marisol@example.com';
const TACTIL = { hasTouch: true, isMobile: true };
const abrir = (b, viewport, contexto, init) => abrirPagina(b, { email: EMAIL, viejo: true, viewport, contexto, init, out, ruta: '/juegos.html?arcadePrueba=1', esperar: '[data-menu]' });
const marcoDe = async p => (await p.waitForSelector('#arcade-frame', { timeout: 30000 })).contentFrame();
const estado = fr => fr.evaluate(() => window.__futbol.estado());
const esperar = (fr, fn, arg, ms = 30000) => fr.waitForFunction(fn, arg, { timeout: ms });
const progreso = async () => (await fetch(API + '/juegos/progreso/futbol?email=' + encodeURIComponent(EMAIL))).json();

function dedos(p) {
  let cdp = null; const vivos = {};
  const enviar = async (type, puntos) => { cdp = cdp || await p.context().newCDPSession(p); await cdp.send('Input.dispatchTouchEvent', { type, touchPoints: puntos }); };
  return {
    poner: (id, x, y) => { vivos[id] = { x, y, id }; return enviar('touchStart', Object.values(vivos)); },
    mover: (id, x, y) => { vivos[id] = { x, y, id }; return enviar('touchMove', Object.values(vivos)); },
    quitar: id => { const t = vivos[id]; delete vivos[id]; return enviar('touchEnd', [t]); },
    soltarTodo: () => { for (const k in vivos) delete vivos[k]; return enviar('touchEnd', []); },
  };
}
const centro = async (fr, sel) => { const c = await fr.locator(sel).boundingBox(); return { x: c.x + c.width / 2, y: c.y + c.height / 2 }; };
async function tocar(p, fr, sel, ms = 60) { const c = await centro(fr, sel), d = dedos(p); await d.poner(9, c.x, c.y); await sleep(ms); await d.quitar(9); }
// Empieza un partido rápido desde el menú del juego y espera a que la persona tenga el saque.
async function partidoRapido(p, fr, tap) {
  if (tap) { await fr.tap('[data-a="rapido"]'); await fr.waitForSelector('#b-jugar'); await fr.tap('#b-jugar'); } else { await fr.click('[data-a="rapido"]'); await fr.waitForSelector('#b-jugar'); await fr.click('#b-jugar'); }
  await esperar(fr, () => window.__futbol.estado().vista === 'partido');
}
const GAMEPAD = [() => { Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => window.__pads || [null, null, null, null] }); }];
const pad = (index, presionados = [], ejes = [0, 0, 0, 0]) => ({ id: 'Control de prueba ' + index, index, connected: true, mapping: 'standard', axes: ejes, buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: presionados.includes(i), value: presionados.includes(i) ? 1 : 0 })) });
const ponerPads = (fr, pads) => fr.evaluate(ps => { window.__pads = ps; }, pads);
async function cajas(fr) {
  return fr.evaluate(() => {
    const r = sel => { const e = document.querySelector(sel); if (!e) return null; const s = getComputedStyle(e), b = e.getBoundingClientRect(); return b.width && s.display !== 'none' && s.visibility !== 'hidden' ? { sel, l: b.left, t: b.top, r: b.right, b: b.bottom } : null; };
    return { vw: innerWidth, vh: innerHeight, marcador: r('#marcador'), ctl: ['#joy-zona', '#m-A', '#m-B', '#m-X', '#m-Y', '#m-L', '#m-R'].map(r).filter(Boolean) };
  });
}
const cruza = (a, b) => a.l < b.r - 0.5 && b.l < a.r - 0.5 && a.t < b.b - 0.5 && b.t < a.b - 0.5;
const dentro = (a, vw, vh) => a.l >= -0.5 && a.t >= -0.5 && a.r <= vw + 0.5 && a.b <= vh + 0.5;
async function medirFps(p, fr, ms = 3500) {
  const cdp = await p.context().newCDPSession(p);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await sleep(ms);
  const f = (await estado(fr)).fps;
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  return f;
}

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME });
  // ================= Catálogo y menú (celular, toques) =================
  const p = await abrir(b, { width: 390, height: 844 }, { ...TACTIL, deviceScaleFactor: 2 });
  const tarjeta = await textoTarjeta(p, 'futbol');
  const arcade = await idsDe(p, 'arcade');
  ok('catálogo: «Fútbol Estelar 2010» en Arcade con ⚽ y descripción', tarjeta.includes('⚽') && tarjeta.includes('Fútbol Estelar 2010') && arcade.filter(i => i === 'futbol').length === 1, tarjeta);
  ok('catálogo: Futbolito ya no está en Arcade', !arcade.includes('futbolito'), arcade.join(','));
  const menu = await contarMenu(p);
  ok('catálogo: el menú pinta todo el catálogo (categorías cuentan solas)', menu.completo, String(menu.tarjetas));
  await p.click('[data-tab="partidas"]'); await p.waitForSelector('#p-juego');
  const opcionesSala = await p.$$eval('#p-juego option', os => os.map(o => o.value));
  ok('salas: Futbolito no se ofrece al crear partida (Billar y Golf siguen)', !opcionesSala.includes('futbolito') && opcionesSala.includes('billar') && opcionesSala.includes('golf'), opcionesSala.join(','));
  ok('salas: juegoPorId sigue encontrando Futbolito para salas viejas', await p.evaluate(() => juegoPorId('futbolito') && juegoPorId('futbolito').t === 'Futbolito'));
  await p.click('[data-tab="juegos"]').catch(() => {});
  const puntosAntes = await p.evaluate(() => state.totalIndividual || 0);
  await abrirJuego(p, 'futbol', { tap: true });
  let fr = await marcoDe(p);
  await fr.waitForSelector('[data-a="rapido"]', { timeout: 30000 });
  const modos = await fr.$$eval('.modo', xs => xs.map(x => x.dataset.a));
  ok('menú: 5 modos (rápido, copa, carrera, local, clasificatoria)', JSON.stringify(modos) === JSON.stringify(['rapido', 'copa', 'carrera', 'local', 'clasif']), modos.join(','));
  ok('menú: selector de controles visible en el celular', await fr.isVisible('[data-control="mando"]'));
  await p.screenshot({ path: 'futbol-390-menu.png' });

  // ================= Partido rápido con toques reales =================
  await partidoRapido(p, fr, true);
  await p.screenshot({ path: 'futbol-390-previa-saque.png' });
  await esperar(fr, () => { const e = window.__futbol.estado(); return e.estado === 'parada' && e.controlado >= 0; });
  await sleep(1000);
  await tocar(p, fr, '#m-A', 80);
  await esperar(fr, () => window.__futbol.estado().pases[0] >= 1, null, 8000).catch(() => {});
  ok('toques: A hace el saque inicial (pase)', (await estado(fr)).pases[0] >= 1, JSON.stringify((await estado(fr)).pases));
  // Le damos el balón al jugador que maneja la persona y pausamos a la IA para medir la entrada.
  await fr.evaluate(() => { window.__futbol.iaPausada(true); window.__futbol.darBalon(window.__futbol.estado().controlado); });
  const joy = await centro(fr, '#joy-zona'), d = dedos(p);
  const x0 = (await estado(fr)).jugador.x;
  await d.poner(1, joy.x, joy.y); for (let k = 1; k <= 6; k++) { await d.mover(1, joy.x + k * 10, joy.y); await sleep(30); }
  await sleep(500);
  const corriendo = await estado(fr);
  ok('toques: el joystick mueve al jugador (hacia la derecha)', corriendo.jugador.vx > 1 && corriendo.jugador.x > x0, JSON.stringify(corriendo.jugador));
  const pasesAntes = corriendo.pases[0];
  const a = await centro(fr, '#m-A');
  await d.poner(2, a.x, a.y); await sleep(70); await d.quitar(2);
  await sleep(400);
  ok('multitáctil: joystick + A da un pase', (await estado(fr)).pases[0] > pasesAntes, JSON.stringify((await estado(fr)).pases));
  await fr.evaluate(() => window.__futbol.darBalon(window.__futbol.estado().controlado));
  const tirosAntes = (await estado(fr)).tiros[0];
  const bb = await centro(fr, '#m-B');
  await d.poner(3, bb.x, bb.y); await sleep(500);
  const cargando = await estado(fr);
  await d.quitar(3); await sleep(300);
  ok('multitáctil: mantener B carga la barra y al soltar tira', cargando.carga && cargando.carga.boton === 'tiro' && cargando.carga.t > 0.3 && (await estado(fr)).tiros[0] > tirosAntes, JSON.stringify(cargando.carga));
  await d.soltarTodo();
  await fr.evaluate(() => { const p = window.__futbol.p(); window.__futbol.darBalon(11 + 9); });
  await sleep(300);
  ok('botones: sin el balón cambian a PRESIÓN · ENTRADA · BARRIDA', (await estado(fr)).textos === 'defensa' && /PRESIÓN/.test(await fr.textContent('#m-A')) && /ENTRADA/.test(await fr.textContent('#m-B')), await fr.textContent('#m-A'));
  await fr.evaluate(() => window.__futbol.iaPausada(false));
  // Gol y final.
  await fr.evaluate(() => window.__futbol.golYa(0));
  await esperar(fr, () => window.__futbol.estado().goles[0] === 1, null, 5000);
  await sleep(300);
  ok('gol: el marcador sube y se grita «¡GOOOL!»', /GOOOL/.test(await fr.textContent('#grito')) && (await fr.textContent('#g-0')) === '1', await fr.textContent('#grito'));
  await p.screenshot({ path: 'futbol-390-gol.png' });
  await sleep(2800);
  ok('gol: se reanuda con saque del rival', ['parada', 'juego'].includes((await estado(fr)).estado));
  await p.screenshot({ path: 'futbol-390-partido.png' });
  const fps390 = await medirFps(p, fr);
  ok('fps: 390×844 con CPU ×4 (meta 60, mínimo 45)', fps390 >= 45, String(fps390));
  await fr.evaluate(() => window.__futbol.terminarYa());
  await fr.waitForSelector('#res-puntos', { timeout: 15000 });
  await esperar(fr, () => /⭐ individuales/.test((document.getElementById('res-puntos') || {}).textContent || ''), null, 20000).catch(() => {});
  const res = await fr.textContent('#res-puntos');
  ok('final: el partido rápido termina y suma ⭐ individuales', /\+\d+ a tus ⭐ individuales/.test(res), res);
  await p.screenshot({ path: 'futbol-390-resultado.png' });
  const puntosDespues = await p.evaluate(() => state.totalIndividual || 0);
  ok('ranking: el total individual de la semana subió', puntosDespues > puntosAntes, puntosAntes + ' → ' + puntosDespues);
  const rk = await (await fetch(API + '/juegos/ranking?tipo=individual&email=' + encodeURIComponent(EMAIL))).json();
  ok('ranking: Marisol aparece en ⭐ individuales', JSON.stringify(rk.top || []).includes('Marisol'), JSON.stringify(rk.yo || {}));
  await sleep(1500);
  const pr = await progreso();
  ok('avance: el servidor guardó las estadísticas (1 partido, ganado)', pr.datos && pr.datos.stats.partidos === 1 && pr.datos.stats.ganados === 1 && pr.datos.stats.gf >= 1, JSON.stringify(pr.datos && pr.datos.stats));

  // ================= Mando clásico (recordado) con toque real =================
  await fr.click('[data-a="menu"]'); await fr.waitForSelector('[data-control="mando"]');
  await fr.tap('[data-control="mando"]');
  await p.reload(); await p.waitForSelector('[data-menu]');
  await abrirJuego(p, 'futbol', { tap: true });
  fr = await marcoDe(p);
  await fr.waitForSelector('[data-a="rapido"]');
  ok('mando clásico: la elección se recuerda tras recargar', (await fr.getAttribute('[data-control="mando"]', 'aria-pressed')) === 'true');
  await partidoRapido(p, fr, true);
  await esperar(fr, () => window.__futbol.estado().mando.visible, null, 8000).catch(() => {});
  ok('mando clásico: se ve en el partido y los botones de antes no', (await estado(fr)).mando.visible && !(await fr.isVisible('#m-A')));
  await esperar(fr, () => { const e = window.__futbol.estado(); return e.estado === 'parada' && e.controlado >= 0; });
  await sleep(1000);
  await tocar(p, fr, '.mando-boton[data-b="A"]', 90);
  await esperar(fr, () => window.__futbol.estado().pases[0] >= 1, null, 8000).catch(() => {});
  ok('mando clásico: A con toque real hace el saque', (await estado(fr)).pases[0] >= 1, JSON.stringify((await estado(fr)).mando));
  await p.screenshot({ path: 'futbol-390-mando.png' });
  await fr.evaluate(() => { const b = document.querySelector('[data-a]'); return b; });
  await fr.evaluate(() => window.__futbol.terminarYa());
  await fr.waitForSelector('#res-puntos', { timeout: 15000 });
  await fr.click('[data-a="menu"]'); await fr.tap('[data-control="joystick"]');
  await p.context().close();

  // ================= Distribución a 320×640 y 844×390 =================
  for (const vp of [{ width: 320, height: 640 }, { width: 844, height: 390 }]) {
    const q = await abrir(b, vp, { ...TACTIL, deviceScaleFactor: 2 });
    await abrirJuego(q, 'futbol', { tap: true });
    const f = await marcoDe(q);
    await f.waitForSelector('[data-a="rapido"]');
    await partidoRapido(q, f, true);
    await sleep(1200);
    const c = await cajas(f);
    ok(vp.width + '×' + vp.height + ': mandos completos dentro de la pantalla', c.ctl.length === 7 && c.ctl.every(x => dentro(x, c.vw, c.vh)), JSON.stringify(c.ctl.map(x => x.sel + ':' + Math.round(x.r) + 'x' + Math.round(x.b))));
    ok(vp.width + '×' + vp.height + ': el marcador no queda tapado por los mandos', c.marcador && c.ctl.every(x => !cruza(c.marcador, x)), JSON.stringify(c.marcador));
    await q.screenshot({ path: 'futbol-' + vp.width + 'x' + vp.height + '-partido.png' });
    if (vp.width === 844) {
      const f844 = await medirFps(q, f);
      ok('fps: 844×390 con CPU ×4 (meta 60, mínimo 45)', f844 >= 45, String(f844));
    }
    await q.context().close();
  }

  // ================= Escritorio: teclado, control físico y dos controles locales =================
  const e = await abrir(b, { width: 1280, height: 860 }, {}, GAMEPAD);
  await abrirJuego(e, 'futbol');
  let fe = await marcoDe(e);
  await fe.waitForSelector('[data-a="rapido"]');
  ok('escritorio: sin mandos táctiles y con la guía de teclas', !(await fe.isVisible('#ctl')) && /J pase/.test(await fe.textContent('#teclas')));
  await partidoRapido(e, fe, false);
  await esperar(fe, () => { const x = window.__futbol.estado(); return x.estado === 'parada' && x.controlado >= 0; });
  await sleep(1000);
  await fe.focus('canvas').catch(() => {});
  await e.keyboard.down('KeyJ'); await sleep(80); await e.keyboard.up('KeyJ');
  await esperar(fe, () => window.__futbol.estado().pases[0] >= 1, null, 8000).catch(() => {});
  ok('teclado: J hace el saque', (await estado(fe)).pases[0] >= 1);
  await fe.evaluate(() => { window.__futbol.iaPausada(true); window.__futbol.darBalon(window.__futbol.estado().controlado); });
  const xk = (await estado(fe)).jugador.x;
  await e.keyboard.down('ArrowRight'); await sleep(600); await e.keyboard.up('ArrowRight');
  ok('teclado: → mueve al jugador', (await estado(fe)).jugador.x > xk + 1, xk + ' → ' + (await estado(fe)).jugador.x);
  const tk = (await estado(fe)).tiros[0];
  await e.keyboard.down('KeyK'); await sleep(400); await e.keyboard.up('KeyK'); await sleep(300);
  ok('teclado: K mantenido tira', (await estado(fe)).tiros[0] > tk);
  // Control físico simulado con Joystick elegido (como Karts: funciona siempre).
  await fe.evaluate(() => window.__futbol.darBalon(window.__futbol.estado().controlado));
  const xp = (await estado(fe)).jugador.x;
  await ponerPads(fe, [pad(0, [], [-1, 0, 0, 0]), null, null, null]); await sleep(700);
  await ponerPads(fe, [pad(0), null, null, null]);
  ok('control físico: la palanca mueve al jugador (izquierda)', (await estado(fe)).jugador.x < xp - 1, xp + ' → ' + (await estado(fe)).jugador.x);
  const pp = (await estado(fe)).pases[0];
  await ponerPads(fe, [pad(0, [0]), null, null, null]); await sleep(150); await ponerPads(fe, [pad(0), null, null, null]); await sleep(400);
  ok('control físico: el botón de abajo (A) pasa', (await estado(fe)).pases[0] > pp);
  await e.screenshot({ path: 'futbol-escritorio-partido.png' });
  await fe.evaluate(() => window.__futbol.terminarYa());
  await fe.waitForSelector('#res-puntos', { timeout: 15000 });
  // Dos controles locales: cada uno mueve solo a su equipo.
  await ponerPads(fe, [pad(0), pad(1), null, null]);
  await fe.click('[data-a="menu"]'); await fe.click('[data-a="local"]'); await fe.waitForSelector('.persona');
  await fe.selectOption('[data-p-fuente="0"]', 'pad0'); await fe.selectOption('[data-p-fuente="1"]', 'pad1');
  await fe.selectOption('[data-p-lado="0"]', '0'); await fe.selectOption('[data-p-lado="1"]', '1');
  ok('local: ve los 2 controles conectados', (await fe.textContent('#n-pads')) === '2');
  await e.screenshot({ path: 'futbol-escritorio-local.png' });
  await fe.click('[data-a="local-partido"]');
  await esperar(fe, () => window.__futbol.estado().vista === 'partido');
  const hl = (await estado(fe)).humanos;
  ok('local: 1 vs 1 con dos personas (una por equipo)', hl.length === 2 && hl[0].eq === 0 && hl[1].eq === 1, JSON.stringify(hl));
  await fe.evaluate(() => { window.__futbol.iaPausada(true); window.__futbol.enJuego(); for (const j of window.__futbol.p().jug) { j.vx = 0; j.vy = 0; } });
  const pos = () => fe.evaluate(() => { const p = window.__futbol.p(); return p.humanos.map(h => ({ x: p.jug[h.jug].x, y: p.jug[h.jug].y })); });
  const antes = await pos();
  await ponerPads(fe, [pad(0), pad(1, [], [0, 1, 0, 0]), null, null]); await sleep(700); await ponerPads(fe, [pad(0), pad(1), null, null]);
  const despues = await pos();
  ok('local: el control 2 mueve solo a su jugador hacia abajo (el de P1 no se mueve)', despues[1].y < antes[1].y - 1 && Math.hypot(despues[0].x - antes[0].x, despues[0].y - antes[0].y) < 0.3, JSON.stringify({ antes, despues }));
  await e.screenshot({ path: 'futbol-escritorio-local-partido.png' });
  await fe.evaluate(() => window.__futbol.terminarYa());
  await fe.waitForSelector('#res-puntos', { timeout: 15000 });
  ok('local: el partido local no suma al ranking', /no suma/.test(await fe.textContent('#res-puntos')), await fe.textContent('#ov'));

  // ================= Torneo de 4 (una persona + 3 de la IA) =================
  await fe.click('[data-a="local"]'); await fe.waitForSelector('.persona');
  await fe.click('[data-a="local-menos"]');
  await fe.selectOption('[data-p-fuente="0"]', 'tecladoIzq');
  await fe.click('[data-a="local-torneo4"]');
  await fe.waitForSelector('.llave');
  ok('torneo: llave de 4 con semifinales', (await estado(fe)).torneo.equipos === 4 && (await fe.$$('.ronda')).length >= 1);
  await e.screenshot({ path: 'futbol-escritorio-torneo.png' });
  for (let k = 0; k < 2 && await fe.$('[data-a="torneo-jugar"]'); k++) {
    await fe.click('[data-a="torneo-jugar"]');
    await esperar(fe, () => window.__futbol.estado().vista === 'partido');
    const eqYo = (await estado(fe)).humanos[0].eq;
    await fe.evaluate(q => window.__futbol.golYa(q), eqYo);
    await sleep(500);
    await fe.evaluate(() => window.__futbol.terminarYa());
    await fe.waitForSelector('[data-a="ver-torneo"]', { timeout: 20000 });
    await fe.click('[data-a="ver-torneo"]'); await fe.waitForSelector('.llave');
  }
  const t = (await estado(fe)).torneo;
  ok('torneo: ganando cada partido se llega al campeón', t.campeon !== null && t.rondas === 2, JSON.stringify(t));
  ok('torneo: se anuncia al campeón', /campeón/.test(await fe.textContent('#ov')));
  await e.screenshot({ path: 'futbol-escritorio-torneo-final.png' });

  // ================= Clasificatoria semanal =================
  await fe.click('[data-a="menu"]'); await fe.click('[data-a="clasif"]'); await fe.waitForSelector('[data-a="clasif-jugar"]');
  ok('clasificatoria: muestra la semana y al rival', /Semana \d{4}-W\d\d/.test(await fe.textContent('#ov')));
  await fe.click('[data-a="clasif-jugar"]'); await fe.click('#b-jugar');
  await esperar(fe, () => window.__futbol.estado().vista === 'partido');
  await fe.evaluate(() => window.__futbol.golYa(0)); await sleep(400);
  await fe.evaluate(() => window.__futbol.terminarYa());
  await fe.waitForSelector('#res-puntos', { timeout: 15000 });
  await sleep(1500);
  const pc = await progreso();
  ok('clasificatoria: se guarda el mejor de la semana', pc.datos && pc.datos.clasif && pc.datos.clasif.mejor > 0 && pc.datos.clasif.jugados === 1, JSON.stringify(pc.datos && pc.datos.clasif));

  // ================= Carrera: crear, simular, guardar y recuperar =================
  await fe.click('[data-a="menu"]'); await fe.click('[data-a="carrera"]');
  await fe.waitForSelector('#f-nombre');
  await fe.fill('#f-nombre', 'Ajolotes del Lago'); await fe.fill('#f-corto', 'ajo'); await fe.fill('#f-estadio', 'Estadio Lago Azul');
  await fe.click('[data-simbolo="ola"]'); await fe.click('[data-patron="aros"]');
  await e.screenshot({ path: 'futbol-escritorio-crear-club.png' });
  await fe.click('[data-a="guardar-club"]');
  await fe.waitForSelector('[data-a="carrera-jugar"]');
  ok('carrera: el club nuevo empieza en la Liga Norte, jornada 1', /Liga Norte/.test(await fe.textContent('#ov')) && /Jornada 1\/14/.test(await fe.textContent('#ov')));
  await fe.click('[data-a="carrera-simular"]');
  await fe.waitForSelector('[data-a="carrera-jugar"]');
  ok('carrera: simular avanza a la jornada 2', /Jornada 2\/14/.test(await fe.textContent('#ov')));
  await fe.click('[data-tab="tabla"]');
  ok('carrera: la tabla tiene 8 clubes con tu club', (await fe.$$('.tabla tbody tr')).length === 8 && (await fe.$$('.tabla tr.yo')).length === 1);
  await e.screenshot({ path: 'futbol-escritorio-carrera.png' });
  await fe.click('[data-tab="partido"]'); await fe.click('[data-a="carrera-jugar"]'); await fe.click('#b-jugar');
  await esperar(fe, () => window.__futbol.estado().vista === 'partido');
  await fe.evaluate(() => window.__futbol.terminarYa());
  await fe.waitForSelector('[data-a="carrera"]', { timeout: 15000 });
  await sleep(2000);
  await e.reload(); await e.waitForSelector('[data-menu]');
  await abrirJuego(e, 'futbol');
  fe = await marcoDe(e);
  await fe.waitForSelector('[data-a="carrera"]');
  ok('carrera: tras recargar, el menú muestra tu club', /Ajolotes del Lago/.test(await fe.textContent('[data-a="carrera"]')));
  await fe.click('[data-a="carrera"]'); await fe.waitForSelector('.vista-club');
  ok('carrera: se recupera en la jornada 3 con el club y el dinero', /Jornada 3\/14/.test(await fe.textContent('#ov')) && /Ajolotes del Lago/.test(await fe.textContent('#ov')));
  const pk = await progreso();
  ok('carrera: el servidor guarda club, 2 resultados y plantilla de 16', pk.datos.carrera && pk.datos.carrera.club.corto === 'AJO' && pk.datos.carrera.resultados.length === 2 && pk.datos.carrera.plantilla.length === 16, JSON.stringify(pk.datos.carrera && pk.datos.carrera.club));
  await e.context().close();

  await b.close();
  out.forEach(l => console.log(l));
  const fallas = out.filter(l => l.startsWith('FAIL')).length;
  console.log(`\n${out.length - fallas}/${out.length} pasaron`);
  process.exit(fallas ? 1 : 0);
})().catch(err => { out.forEach(l => console.log(l)); console.error('ERROR', err); process.exit(1); });
