// E2E: «Karts Turbo» (openspec: juegos-plataformas-karts, karts-controles-diseno, karts-pseudo3d).
// Vista pseudo-3D (Mode-7): horizonte, escenario y rivales proyectados; girar mueve el carro y la cámara; una vuelta
// completa con el piloto de prueba; tutorial de 3 s; botones ⬅ ➡ por omisión, ACELERAR opcional y teclado.
// Catálogo, carrera 1 de la Copa Fiesta con 8 corredores (manejo con teclado y mini-turbo morado), puntos en ⭐
// individuales, copa en curso guardada en el servidor y recuperada tras recargar, y carrera en sala con bots
// fantasma: podio por tiempo sin tocar el progreso.
// Controles en celular con TOQUES REALES (CDP Input.dispatchTouchEvent, hasTouch + isMobile): joystick que gira
// proporcional, joystick + DERRAPE a la vez (multitáctil → turbo morado), botones ◀ ▶, preferencia guardada, sensor
// con eventos deviceorientation, permiso negado y sin lecturas → joystick. Minimapa con todos los corredores (y los
// fantasmas en sala) sin encimarse con los mandos, mandos completos a 360×640, 390×844 y 844×390.
// Capturas en vertical, horizontal y escritorio. Usa ?arcadePrueba=1.
// Mando clásico (openspec: karts-mando): «🎮 Mando clásico» elegido y recordado, cruceta ◀ con toque real, A acelera
// con «Con botón», R + ◀ → mini-turbo, X usa el ítem, START pausa y sigue, el teclado de Karts sin cambios, control
// físico simulado (navigator.getGamepads en addInitScript) con cualquier control elegido, y distribución a 320×640,
// 390×844 y 844×390, suelto (juegos/karts.html?prueba=1) y dentro de Juegos.
// Personajes (openspec: personajes-xalli, personajes-estilo-karts): «🏁 Piloto» con los 8 (Xalli, Itzae, Yahui,
// Xochiquetzal, Xolo, Tlali, Tona y Kinich; nombre, título y peso), Xalli
// por omisión, la elección se recuerda tras recargar, los bots y fantasmas usan los otros personajes, cada personaje se
// dibuja en su kart (color de firma, capturas de cerca y hoja de vistas) y termina una carrera; valor desconocido → Xalli;
// estela del turbo solo sin movimiento reducido; el selector cabe a 320×640 y 844×390.
// Pistas mesoamericanas (openspec: karts-pistas-mesoamericanas): selector con 8 pistas por copa y descripción, en cada
// pista nueva (Tenochtitlan, Teotihuacan, Chichén Itzá y La Venta) su mecánica (trajinera, rampas, salto sobre el
// cenote y lodo), una vuelta completa con el piloto de prueba, fps con CPU ×4 y capturas a 390×844 y 844×390; Copa
// Mesoamericana dentro de Juegos: empieza en La Venta, se guarda con su id y continúa tras recargar.
require('./lib/entorno'); // BASE, API, CHROME, carpeta de salida y sesión de prueba en fetch
const { chromium } = require('playwright');
const { abrirPagina } = require('./lib/navegador');
const { contarMenu, abrirJuego, textoTarjeta } = require('./lib/menu'); // conteo del menú (openspec: organizar-codigo)
const { PERSONAJES, contarColor, recorte } = require('./lib/personajes');
const API = process.env.API;
const out = []; const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const EMAIL = 'angel@example.com';
const TACTIL = { hasTouch: true, isMobile: true };
const progreso = async () => (await fetch(API + '/juegos/progreso/karts?email=' + encodeURIComponent(EMAIL))).json();
const abrir = (b, viewport, contexto, init) => abrirPagina(b, { email: EMAIL, viejo: true, viewport, contexto, init, out, ruta: '/juegos.html?arcadePrueba=1', esperar: '[data-menu]' });
const marcoDe = async (p, raiz = '') => (await p.waitForSelector(raiz + ' #arcade-frame', { timeout: 30000 })).contentFrame();
const estado = fr => fr.evaluate(() => window.__karts.estado());
const r2 = v => Math.round(v * 100) / 100;

// Dedos reales por CDP: cada evento lleva todos los dedos que siguen en la pantalla.
function dedos(p) {
  let cdp = null; const vivos = {};
  const enviar = async (type, puntos) => { cdp = cdp || await p.context().newCDPSession(p); await cdp.send('Input.dispatchTouchEvent', { type, touchPoints: puntos }); };
  return {
    poner: (id, x, y) => { vivos[id] = { x, y, id }; return enviar('touchStart', Object.values(vivos)); },
    mover: (id, x, y) => { vivos[id] = { x, y, id }; return enviar('touchMove', Object.values(vivos)); },
    quitar: id => { const t = vivos[id]; delete vivos[id]; return enviar('touchEnd', [t]); }, // touchEnd lleva el dedo que se levanta
    soltarTodo: () => { for (const k in vivos) delete vivos[k]; return enviar('touchEnd', []); },
  };
}
const centro = async (fr, sel) => { const c = await fr.locator(sel).boundingBox(); return { x: c.x + c.width / 2, y: c.y + c.height / 2 }; };
// Rectángulos (dentro del iframe) del minimapa, del HUD y de los mandos visibles.
const cajas = fr => fr.evaluate(() => {
  const r = sel => { const e = document.querySelector(sel); if (!e) return null; const s = getComputedStyle(e), b = e.getBoundingClientRect(); return b.width && s.display !== 'none' && s.visibility !== 'hidden' ? { sel, l: b.left, t: b.top, r: b.right, b: b.bottom } : null; };
  return { vw: innerWidth, vh: innerHeight, mapa: r('#minimapa'), hud: ['.hud-izq', '#h-item', '#hud .der'].map(r).filter(Boolean), ctl: ['#joy-zona', '#m-flechas', '#m-sensor', '#m-item', '#m-freno', '#m-derrape', '#m-acel'].map(r).filter(Boolean) };
});
const cruza = (a, b) => a.l < b.r - 0.5 && b.l < a.r - 0.5 && a.t < b.b - 0.5 && b.t < a.b - 0.5;
const dentro = (a, vw, vh) => a.l >= -0.5 && a.t >= -0.5 && a.r <= vw + 0.5 && a.b <= vh + 0.5;
async function revisarLayout(fr, nombre) {
  const c = await cajas(fr);
  ok(nombre + ': mandos completos dentro de la pantalla', c.ctl.length >= 4 && c.ctl.every(x => dentro(x, c.vw, c.vh)), JSON.stringify({ vw: c.vw, vh: c.vh, ctl: c.ctl.map(x => x.sel + ':' + Math.round(x.r) + 'x' + Math.round(x.b)) }));
  ok(nombre + ': el minimapa no tapa los mandos', c.mapa && c.ctl.every(x => !cruza(c.mapa, x)) && dentro(c.mapa, c.vw, c.vh), JSON.stringify(c.mapa));
  ok(nombre + ': el HUD no tapa los mandos', c.hud.every(h => c.ctl.every(x => !cruza(h, x))));
}
// ---- Personajes (openspec: personajes-xalli) ----
const IDS = PERSONAJES.map(x => x.id);
const elegido = fr => fr.evaluate(() => [...document.querySelectorAll('#menu-piloto [data-personaje]')].filter(b => b.getAttribute('aria-pressed') === 'true').map(b => b.dataset.personaje).join(','));
async function revisarSelector(fr, nombre) {
  const tarjetas = await fr.$$eval('#menu-piloto [data-personaje]', bs => bs.map(b => ({ id: b.dataset.personaje, txt: b.textContent, img: !!b.querySelector('img[src^="data:image"]') })));
  ok(nombre + ': «🏁 Piloto» muestra a los 8 con nombre, título y retrato', tarjetas.length === 8 && PERSONAJES.every((x, i) => tarjetas[i].id === x.id && tarjetas[i].txt.includes(x.nombre) && tarjetas[i].txt.includes(x.titulo) && tarjetas[i].img), JSON.stringify(tarjetas.map(t => t.id + ':' + t.txt)));
}
// Tu kart con tu personaje; los bots solo con los otros (y, si hay 3 o más, con los 3).
function revisarRivales(e, mio, nombre) {
  const otros = e.personajes.slice(); otros.splice(e.yoIndice, 1);
  // personajes-estilo-karts: con 7 rivales, los 7 personajes que no elegiste (uno cada uno).
  ok(nombre + ': tu kart lleva a ' + mio + ' y los rivales a los otros personajes', e.personaje === mio && e.personajes[e.yoIndice] === mio && otros.every(x => IDS.includes(x) && x !== mio) && (otros.length < 7 || new Set(otros).size === 7), JSON.stringify(e.personajes));
}
async function probarPersonajes(b) {
  const q = await abrirPagina(b, { viewport: { width: 390, height: 844 }, contexto: { deviceScaleFactor: 2 }, out, etiqueta: 'karts suelto', ruta: '/juegos/karts.html?prueba=1', esperar: '#ov-menu:not(.hide)' });
  const f = q.mainFrame();
  await revisarSelector(f, 'suelto');
  // Hoja de revisión: cada piloto de espaldas, de lado, de tres cuartos y de frente.
  const hoja = await f.evaluate(() => window.__karts.hojaPilotos());
  require('fs').writeFileSync('karts-personajes-hoja.png', Buffer.from(hoja.split(',')[1], 'base64'));
  for (const x of PERSONAJES) {
    await f.click('[data-personaje="' + x.id + '"]');
    ok('suelto: elegir a ' + x.nombre + ' lo marca', await elegido(f) === x.id);
    if (x.nuevo) { // personajes-estilo-karts: línea con título y peso
      const detalle = await f.textContent('#piloto-detalle');
      ok('suelto: la línea del piloto dice el título y el peso de ' + x.nombre, detalle.includes(x.titulo) && detalle.includes(x.peso) && detalle.includes('choques'), detalle);
    }
    await f.click('[data-ir="pistas"]'); await f.click('[data-ir="rapida:pradera"]');
    await f.waitForFunction(() => window.__karts.estado().modo === 'carrera' && window.__karts.estado().tiempo > 1200, null, { timeout: 15000 });
    const e = await estado(f);
    revisarRivales(e, x.id, 'suelto');
    const caja = await f.evaluate(() => window.__karts.cajaYo());
    const firma = await contarColor(f, caja, x.kart);
    ok('suelto: se dibuja el kart de ' + x.nombre + ' (color de firma en tu kart)', firma >= 20, JSON.stringify({ firma, caja }));
    await recorte(q, f, caja, 'karts-personaje-' + x.id + '-carrera.png', 30);
    await q.screenshot({ path: 'karts-personaje-' + x.id + '.png' });
    if (x.nuevo) ok('suelto: la masa del choque de ' + x.nombre + ' corresponde a su peso', e.masa === x.masa, String(e.masa));
    if (x.id === 'xochiquetzal' || x.nuevo) {
      await f.evaluate(() => window.__karts.darItem('turbo')); await q.keyboard.press('KeyE'); await sleep(250);
      ok('suelto: con turbo tu kart suelta la partícula de tu personaje', (await estado(f)).estela > 0);
      await recorte(q, f, await f.evaluate(() => window.__karts.cajaYo()), 'karts-personaje-' + x.id + '-turbo.png', 30);
    }
    await f.evaluate(() => window.__karts.adelantar());
    await f.waitForSelector('#ov-res:not(.hide)', { timeout: 20000 });
    ok('suelto: ' + x.nombre + ' termina la carrera con resultados', /lugar|Ganaste|podio/.test(await f.textContent('#res-titulo')) && (await f.$$('#res-tabla tr')).length === 9);
    await f.click('#res-botones [data-ir="menu"]'); await f.waitForSelector('#ov-menu:not(.hide)');
  }
  await q.reload(); await q.waitForSelector('#ov-menu:not(.hide)');
  const ultimo = PERSONAJES.at(-1); // el último elegido en el recorrido (personajes-estilo-karts: Kinich)
  ok('suelto: tras recargar sigue elegido ' + ultimo.nombre, await elegido(f) === ultimo.id);
  await q.context().close();
  // Selector a 320×640, 390×844 y 844×390: los 8 caben en 4×2, sin desplazamiento horizontal (personajes-estilo-karts).
  for (const vp of [{ width: 320, height: 640 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
    const r = await abrirSuelto(b, vp);
    const m = await r.evaluate(() => ({ vw: innerWidth, ancho: document.documentElement.scrollWidth, cajas: [...document.querySelectorAll('#menu-piloto [data-personaje]')].map(e => { const c = e.getBoundingClientRect(); return { l: c.left, r: c.right, t: c.top, w: c.width }; }) }));
    const filas = new Set(m.cajas.map(c => Math.round(c.t))).size;
    ok(vp.width + '×' + vp.height + ': las 8 tarjetas del piloto caben a lo ancho en 2 filas', m.cajas.length === 8 && filas === 2 && m.cajas.every(c => c.l >= -0.5 && c.r <= m.vw + 0.5 && c.w >= 56) && m.ancho <= m.vw, JSON.stringify(m));
    await r.screenshot({ path: 'karts-selector-' + vp.width + 'x' + vp.height + '.png', fullPage: true });
    await r.context().close();
  }
  // Valor desconocido → Xalli; movimiento reducido → sin estela.
  const raro = [() => { try { localStorage.setItem('arcade_personaje', 'pikachu'); } catch { /* nada */ } }];
  const r1 = await abrirSuelto(b, { width: 390, height: 844 }, raro);
  ok('valor desconocido en arcade_personaje → Xalli', await elegido(r1.mainFrame()) === 'xalli');
  await r1.context().close();
  const r2b = await abrirPagina(b, { viewport: { width: 390, height: 844 }, contexto: { reducedMotion: 'reduce' }, out, etiqueta: 'karts reducido', ruta: '/juegos/karts.html?prueba=1', esperar: '#ov-menu:not(.hide)' });
  const g = r2b.mainFrame();
  await g.click('[data-personaje="yahui"]'); await g.click('[data-ir="pistas"]'); await g.click('[data-ir="rapida:pradera"]');
  await g.waitForFunction(() => window.__karts.estado().modo === 'carrera' && window.__karts.estado().tiempo > 600, null, { timeout: 15000 });
  await g.evaluate(() => window.__karts.darItem('turbo')); await r2b.keyboard.press('KeyE'); await sleep(250);
  ok('movimiento reducido: sin estela del personaje', (await estado(g)).estela === 0 && (await estado(g)).personaje === 'yahui');
  await r2b.context().close();
}
async function correrRapida(fr, pista) {
  await fr.tap('[data-ir="pistas"]'); await fr.tap('[data-ir="rapida:' + pista + '"]');
  await fr.waitForFunction(() => window.__karts.estado().modo === 'carrera' && window.__karts.estado().tiempo > 400, null, { timeout: 15000 });
}

// ================= Mando clásico (openspec: karts-mando) =================
const CON_MANDO = [() => { try { localStorage.setItem('karts_control', 'mando'); } catch { /* nada */ } }];
// Control físico simulado: cada marco (también el iframe del juego) lee window.__pads.
const GAMEPAD = [() => {
  Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => window.__pads || [null, null, null, null] });
  try { localStorage.setItem('karts_acelerar', 'manual'); } catch { /* nada */ }
}];
const pad = (presionados = [], ejes = [0, 0, 0, 0]) => ({ id: 'Control de prueba', index: 0, connected: true, mapping: 'standard', axes: ejes, buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: presionados.includes(i), value: presionados.includes(i) ? 1 : 0 })) });
const abrirSuelto = (b, viewport, init) => abrirPagina(b, { viewport, contexto: TACTIL, init, out, etiqueta: 'karts suelto', ruta: '/juegos/karts.html?prueba=1', esperar: '#ov-menu:not(.hide)' });
// Medidas (dentro del juego) del mando, la pista, el minimapa y el HUD.
const medirMando = fr => fr.evaluate(() => {
  const r = e => { const b = e.getBoundingClientRect(); return { l: b.left, t: b.top, r: b.right, b: b.bottom }; };
  const vis = e => { const s = getComputedStyle(e), b = e.getBoundingClientRect(); return b.width > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
  const m = document.querySelector('.mando');
  const ctl = m ? [...m.querySelectorAll('[data-b], .mando-cruceta i[data-dir]')].filter(vis).map(e => Object.assign({ id: e.dataset.b || e.dataset.dir }, r(e))) : [];
  const hud = ['.hud-izq', '#h-item', '#hud .der'].map(s => document.querySelector(s)).filter(e => e && vis(e)).map(r);
  return { vw: innerWidth, vh: innerHeight, ctl, visible: !!m && vis(m), pos: m ? getComputedStyle(m).position : '', mando: m ? r(m) : null, mandoAlto: getComputedStyle(document.documentElement).getPropertyValue('--mando-alto').trim(),
    pantalla: r(document.getElementById('pantalla')), mapa: r(document.getElementById('minimapa')), hud, botones: vis(document.getElementById('mandos')), ancho: document.documentElement.scrollWidth };
});
async function revisarMando(fr, nombre) {
  const m = await medirMando(fr);
  const ids = m.ctl.map(x => x.id).sort().join(',');
  ok(nombre + ': se ve el mando (◀ ▶, A, B, X, Y, L, R, START) y no los botones de antes', m.visible && !m.botones && ids === 'A,B,L,R,START,X,Y,der,izq', ids);
  ok(nombre + ': mando completo dentro de la pantalla, sin desplazamiento horizontal', m.ctl.every(x => dentro(x, m.vw, m.vh)) && m.ancho <= m.vw,
    JSON.stringify({ vw: m.vw, vh: m.vh, fuera: m.ctl.filter(x => !dentro(x, m.vw, m.vh)).map(x => x.id) }));
  ok(nombre + ': el minimapa y el HUD no se cruzan con el mando', m.ctl.every(x => !cruza(m.mapa, x) && m.hud.every(h => !cruza(h, x))) && dentro(m.mapa, m.vw, m.vh), JSON.stringify(m.mapa));
  if (m.pos === 'absolute') {
    ok(nombre + ': en horizontal va encimado en las esquinas de abajo y --mando-alto = 0', m.mandoAlto === '0px' && m.ctl.every(x => x.b > m.vh * 0.4) && m.ctl.filter(x => ['izq', 'der', 'L'].includes(x.id)).every(x => x.r < m.vw * 0.35) && m.ctl.filter(x => ['A', 'B', 'X', 'Y', 'R'].includes(x.id)).every(x => x.l > m.vw * 0.65), JSON.stringify({ alto: m.mandoAlto, ctl: m.ctl.map(x => x.id + ':' + Math.round(x.l) + ',' + Math.round(x.t)) }));
  } else {
    ok(nombre + ': en vertical va debajo de la pista y --mando-alto es su alto', !!m.mando && m.mando.t >= m.pantalla.b - 1 && Math.abs(parseFloat(m.mandoAlto) - (m.mando.b - m.mando.t) - 6) <= 2, JSON.stringify({ alto: m.mandoAlto, mando: m.mando && [Math.round(m.mando.t), Math.round(m.mando.b)], pantalla: Math.round(m.pantalla.b) }));
  }
  return m;
}
// Mantiene ◀ de la cruceta con un dedo real y revisa que el carro gire.
async function girarConCruceta(p, fr, nombre) {
  const a0 = (await estado(fr)).ang, d = dedos(p), c = await centro(fr, '.mando-cruceta .izq');
  await d.poner(7, c.x, c.y); await sleep(500);
  const e = await estado(fr); await d.soltarTodo();
  ok(nombre + ': ◀ de la cruceta (toque real) gira a la izquierda', e.giro === -1 && e.ang < a0 - 0.3, JSON.stringify({ giro: e.giro, antes: r2(a0), despues: r2(e.ang) }));
}

async function probarMando(b) {
  // ---- Celular 390×844 dentro de Juegos: elegir el mando, recordarlo y jugar con toques reales ----
  const cel = await abrir(b, { width: 390, height: 844 }, TACTIL);
  await abrirJuego(cel, 'karts', { tap: true });
  let fc = await marcoDe(cel);
  await fc.waitForSelector('#ov-menu:not(.hide)', { timeout: 30000 });
  ok('mando: el selector ofrece «🎮 Mando clásico» y por omisión siguen los Botones', /Mando clásico/.test(await fc.textContent('#menu-control').catch(() => '')) && (await fc.getAttribute('[data-control="botones"]', 'aria-pressed')) === 'true');
  await fc.tap('[data-control="mando"]').catch(() => {}); await fc.tap('[data-acel="manual"]');
  await cel.screenshot({ path: 'karts-mando-390-menu.png' });
  await cel.reload(); await cel.waitForSelector('[data-menu]', { timeout: 60000 });
  await abrirJuego(cel, 'karts', { tap: true });
  fc = await marcoDe(cel);
  await fc.waitForSelector('#ov-menu:not(.hide)', { timeout: 30000 });
  const pref = await estado(fc);
  ok('mando: tras recargar sigue elegido «🎮 Mando clásico» (y «Con botón»)', pref.control === 'mando' && pref.acel === 'manual' && (await fc.getAttribute('[data-control="mando"]', 'aria-pressed').catch(() => null)) === 'true', JSON.stringify({ control: pref.control, acel: pref.acel }));
  await fc.tap('[data-ir="pistas"]'); await fc.tap('[data-ir="rapida:pradera"]');
  await fc.waitForFunction(() => window.__karts.estado().modo === 'carrera');
  await sleep(600);
  ok('mando: tutorial con los botones del mando', (await estado(fc)).tutorial && /R \/ L/.test(await fc.textContent('#tuto')) && /X \/ Y/.test(await fc.textContent('#tuto')), await fc.textContent('#tuto'));
  await cel.screenshot({ path: 'karts-mando-390-tutorial.png' });
  await fc.waitForFunction(() => window.__karts.estado().tiempo > 400, null, { timeout: 15000 });
  await revisarMando(fc, 'mando 390×844 en Juegos');
  const em = await estado(fc);
  ok('mando: activo en la carrera', !!em.mando && em.mando.activo && em.mando.visible, JSON.stringify(em.mando));
  ok('mando: con «Con botón» y sin A el carro no avanza', em.vel < 20 && !em.acelera, JSON.stringify({ vel: em.vel }));
  const d = dedos(cel);
  const cA = await centro(fc, '.mando-boton[data-b="A"]');
  await d.poner(5, cA.x, cA.y); await sleep(1400);
  const ea = await estado(fc);
  ok('mando: mantener A (toque real) acelera', ea.acelera && ea.vel > 120, JSON.stringify({ vel: ea.vel }));
  // Cruceta ◀ con otro dedo, sin soltar A.
  const cI = await centro(fc, '.mando-cruceta .izq');
  await d.poner(1, cI.x, cI.y); await sleep(500);
  const ei = await estado(fc);
  ok('mando: A + ◀ de la cruceta a la vez: acelera y gira a la izquierda', ei.giro === -1 && ei.ang < ea.ang - 0.3 && ei.acelera, JSON.stringify({ giro: ei.giro, antes: r2(ea.ang), despues: r2(ei.ang) }));
  await cel.screenshot({ path: 'karts-mando-390-carrera.png' });
  await d.quitar(1); await sleep(150);
  const es = await estado(fc); await sleep(250);
  ok('mando: al soltar ◀ deja de girar', es.giro === 0 && Math.abs((await estado(fc)).ang - es.ang) < 0.03, JSON.stringify({ giro: es.giro }));
  // R + ◀ por 2.6 s → mini-turbo morado.
  await sleep(500);
  const cR = await centro(fc, '.mando-gatillo[data-b="R"]');
  await d.poner(1, cI.x, cI.y); await d.poner(2, cR.x, cR.y); await sleep(1200);
  const er = await estado(fc);
  ok('mando: R + ◀ derrapa', er.derrape && er.giro === -1, JSON.stringify({ derrape: er.derrape, giro: er.giro }));
  await sleep(1400);
  await d.quitar(2); await d.quitar(1); await sleep(150);
  const er2 = await estado(fc);
  ok('mando: R + ◀ 2.6 s → mini-turbo morado', er2.ultimoTurbo === 'morado', JSON.stringify({ ultimo: er2.ultimoTurbo, vel: er2.vel }));
  // X usa el ítem.
  await fc.evaluate(() => window.__karts.darItem && window.__karts.darItem('turbo'));
  const ex0 = await estado(fc);
  const cX = await centro(fc, '.mando-boton[data-b="X"]');
  await d.poner(3, cX.x, cX.y); await sleep(120); await d.quitar(3); await sleep(150);
  const ex1 = await estado(fc);
  ok('mando: X usa el ítem 🎁', ex0.item === 'turbo' && ex1.item === null && ex1.turbo > 0, JSON.stringify({ antes: ex0.item, despues: ex1.item, turbo: ex1.turbo }));
  await d.soltarTodo(); await sleep(100);
  // START pausa y START otra vez sigue.
  const cS = await centro(fc, '.mando-pildora[data-b="START"]');
  await d.poner(4, cS.x, cS.y); await sleep(100); await d.soltarTodo(); await sleep(150);
  const t0 = (await estado(fc)).tiempo; await sleep(400);
  ok('mando: START pausa la carrera («⏸ Pausa») y el reloj no corre', (await estado(fc)).modo === 'pausa' && await fc.isVisible('#ov-pausa') && (await estado(fc)).tiempo === t0);
  await cel.screenshot({ path: 'karts-mando-390-pausa.png' });
  await d.poner(4, cS.x, cS.y); await sleep(100); await d.soltarTodo(); await sleep(150);
  ok('mando: START otra vez sigue la carrera', (await estado(fc)).modo === 'carrera');
  // El teclado de Karts sigue igual con el mando elegido: P pausa una sola vez.
  await fc.focus('canvas').catch(() => {});
  await fc.evaluate(() => document.activeElement && document.activeElement.blur && document.activeElement.blur());
  await cel.keyboard.press('KeyP'); await sleep(250);
  ok('mando: con el mando elegido, P del teclado pausa (una sola vez)', (await estado(fc)).modo === 'pausa');
  await cel.keyboard.press('KeyP'); await sleep(150);
  await cel.keyboard.down('ArrowRight'); await sleep(300);
  ok('mando: con el mando elegido, → del teclado gira a la derecha', (await estado(fc)).giro === 1);
  await cel.keyboard.up('ArrowRight');
  await cel.context().close();

  // ---- Distribución a 320×640, 390×844 y 844×390, dentro de Juegos y suelto ----
  for (const [w, h] of [[320, 640], [390, 844], [844, 390]]) {
    for (const suelto of [false, true]) {
      const nombre = `mando ${w}×${h} ${suelto ? 'suelto' : 'en Juegos'}`;
      let q, f;
      if (suelto) { q = await abrirSuelto(b, { width: w, height: h }, CON_MANDO); f = q.mainFrame(); }
      else {
        q = await abrir(b, { width: w, height: h }, TACTIL, CON_MANDO);
        await abrirJuego(q, 'karts', { tap: true });
        f = await marcoDe(q);
        await f.waitForSelector('#ov-menu:not(.hide)', { timeout: 30000 });
      }
      if (w > h) ok(nombre + ': en el menú no se ve el mando (no tapa los botones)', !(await medirMando(f)).visible);
      await correrRapida(f, 'volcan');
      await revisarMando(f, nombre);
      await girarConCruceta(q, f, nombre);
      await q.screenshot({ path: `karts-mando-${w}x${h}-${suelto ? 'suelto' : 'juegos'}.png` });
      await q.context().close();
    }
  }

  // ---- Casos de error: valor desconocido y sin localStorage (modo privado) → Botones, sin errores de JS ----
  const raro = [() => { try { localStorage.setItem('karts_control', 'volante-magico'); } catch { /* nada */ } }];
  const privado = [() => { Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new Error('almacenamiento bloqueado'); } }); }];
  for (const [nombre, init] of [['valor desconocido en karts_control', raro], ['sin localStorage (modo privado)', privado]]) {
    const q = await abrirSuelto(b, { width: 390, height: 844 }, init);
    const f = q.mainFrame();
    const e = await estado(f);
    ok(`mando: ${nombre} → Botones y sin mando`, e.control === 'botones' && !(await medirMando(f)).visible, JSON.stringify({ control: e.control }));
    await f.tap('[data-control="mando"]');
    ok(`mando: ${nombre} → se puede elegir «🎮 Mando clásico»`, (await estado(f)).control === 'mando' && (await medirMando(f)).visible);
    await q.context().close();
  }

  // ---- Control físico simulado (PC, con «Botones» por omisión y «Con botón») ----
  const pg = await abrir(b, { width: 1280, height: 800 }, undefined, GAMEPAD);
  await abrirJuego(pg, 'karts');
  const fg = await marcoDe(pg);
  await fg.waitForSelector('#ov-menu:not(.hide)', { timeout: 30000 });
  await fg.click('[data-ir="pistas"]'); await fg.click('[data-ir="rapida:pradera"]');
  await fg.waitForFunction(() => window.__karts.estado().modo === 'carrera' && window.__karts.estado().tiempo > 400, null, { timeout: 15000 });
  const g0 = await estado(fg);
  ok('control físico: Karts abre con «Botones» y «Con botón»', g0.control === 'botones' && g0.acel === 'manual', JSON.stringify({ control: g0.control, acel: g0.acel }));
  await fg.evaluate(v => { window.__pads = [v, null, null, null]; }, pad());
  await sleep(400);
  ok('control físico: aviso «🎮 Control conectado»', (await fg.textContent('.mando-aviso').catch(() => '')).includes('🎮 Control conectado'));
  await fg.evaluate(v => { window.__pads = [v]; }, pad([0]));
  await sleep(1300);
  const g1 = await estado(fg);
  ok('control físico: el botón de abajo (A) acelera', g1.acelera && g1.vel > 100, JSON.stringify({ vel: g1.vel }));
  await pg.screenshot({ path: 'karts-mando-control-fisico.png' });
  await fg.evaluate(v => { window.__pads = [v]; }, pad([0], [-0.45, 0, 0, 0]));
  await sleep(150);
  const g2 = await estado(fg);
  await fg.evaluate(v => { window.__pads = [v]; }, pad([0], [-1, 0, 0, 0]));
  await sleep(150);
  const g3 = await estado(fg);
  ok('control físico: la palanca gira en proporción (poco con poca inclinación, todo con toda)', g2.giro < -0.15 && g2.giro > -0.6 && r2(g3.giro) === -1, JSON.stringify({ poca: r2(g2.giro), toda: r2(g3.giro) }));
  await fg.evaluate(v => { window.__pads = [v]; }, pad([9]));
  await sleep(150);
  ok('control físico: Start pausa', (await estado(fg)).modo === 'pausa');
  await fg.evaluate(v => { window.__pads = [v]; }, pad());
  await sleep(100);
  await fg.evaluate(v => { window.__pads = [v]; }, pad([9]));
  await sleep(150);
  ok('control físico: Start otra vez sigue', (await estado(fg)).modo === 'carrera');
  await pg.context().close();
}

// ---- Pistas mesoamericanas (openspec: karts-pistas-mesoamericanas) ----
const MESO = [
  { id: 'tenochtitlan', nombre: 'Calzadas de Tenochtitlan', mecanica: 'trajinera' },
  { id: 'teotihuacan', nombre: 'Calzada de los Muertos', mecanica: 'turbo' },
  { id: 'chichen', nombre: 'Sacbé de Chichén Itzá', mecanica: 'salto' },
  { id: 'laventa', nombre: 'Selva de La Venta', mecanica: 'lodo' },
];
// Selector con las 8 pistas por copa, una vuelta completa con el piloto de prueba en cada pista nueva, su mecánica,
// fps con el CPU 4 veces más lento y capturas de cerca a 390×844 y 844×390.
async function probarPistasMeso(b) {
  const q = await abrirSuelto(b, { width: 390, height: 844 });
  const f = q.mainFrame();
  await f.tap('[data-ir="pistas"]'); await sleep(200);
  const sel = await f.evaluate(() => ({ grupos: [...document.querySelectorAll('#pistas-ops .ops-grupo')].map(e => e.textContent), pistas: [...document.querySelectorAll('#pistas-ops [data-ir^="rapida:"]')].map(e => ({ id: e.dataset.ir.slice(7), txt: e.textContent })), ancho: document.documentElement.scrollWidth, vw: innerWidth }));
  ok('pistas: 8 pistas agrupadas en Copa Fiesta y Copa Mesoamericana', sel.pistas.length === 8 && sel.grupos.length === 2 && /Copa Fiesta/.test(sel.grupos[0]) && /Copa Mesoamericana/.test(sel.grupos[1]) && sel.ancho <= sel.vw, JSON.stringify(sel.grupos));
  ok('pistas: cada pista nueva con su nombre, civilización y descripción corta', MESO.every(m => { const x = sel.pistas.find(p => p.id === m.id); return x && x.txt.includes(m.nombre) && /Mexica|Teotihuacana|Maya|Olmeca/.test(x.txt) && /meta/.test(x.txt); }), JSON.stringify(sel.pistas.slice(4).map(p => p.txt)));
  await q.screenshot({ path: 'karts-meso-selector.png', fullPage: true });
  const cdp = await q.context().newCDPSession(q);
  for (const m of MESO) {
    await f.tap('[data-ir="rapida:' + m.id + '"]');
    await f.waitForFunction(() => window.__karts.estado().modo === 'carrera' && window.__karts.estado().tiempo > 400, null, { timeout: 15000 });
    const e0 = await estado(f);
    ok(m.id + ': se elige y corre con 8 corredores, su mecánica y el minimapa completo', e0.pista === m.id && e0.karts === 8 && e0.zonas.includes(m.mecanica) && e0.marcasMapa === 8 && e0.yoEnMapa, JSON.stringify({ pista: e0.pista, zonas: e0.zonas, marcas: e0.marcasMapa }));
    // Rendimiento: CPU 4 veces más lento, como un celular modesto.
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 }); await sleep(3500);
    const fps = (await estado(f)).fps;
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    ok(m.id + ': 60 cuadros por segundo con CPU ×4', fps >= 55, 'fps=' + fps);
    fpsMeso[m.id] = fps;
    await q.screenshot({ path: 'karts-meso-' + m.id + '-390x844.png' });
    // Mecánica: con el piloto de prueba (sigue el centro de la pista), te pone justo antes de la zona (la trajinera,
    // donde va a pasar).
    await f.evaluate(t => { window.__karts.piloto(true); window.__karts.antesDe(t); }, m.mecanica);
    if (m.mecanica === 'salto') {
      await f.waitForFunction(() => window.__karts.estado().eventos.salto >= 1, null, { timeout: 6000 }).catch(() => {}); await sleep(1000); const es = await estado(f);
      ok(m.id + ': la rampa salta sobre el cenote sin mojarse', es.eventos.salto >= 1 && es.eventos.cenote === 0, JSON.stringify(es.eventos));
    } else {
      await f.waitForFunction(t => window.__karts.estado().eventos[t] >= 1, m.mecanica, { timeout: 6000 }).catch(() => {}); const es = await estado(f);
      ok(m.id + ': la mecánica «' + m.mecanica + '» actúa', es.eventos[m.mecanica] >= 1, JSON.stringify(es.eventos));
    }
    // Una vuelta completa de verdad con el piloto de prueba.
    await f.evaluate(() => window.__karts.piloto(true));
    const v0 = (await estado(f)).vuelta;
    await f.waitForFunction(v => window.__karts.estado().vuelta >= v + 1, v0, { timeout: 80000 }).catch(() => {});
    const ev = await estado(f);
    ok(m.id + ': una vuelta completa con el piloto de prueba', ev.vuelta >= v0 + 1, JSON.stringify({ vuelta: ev.vuelta, t: ev.tiempo }));
    await q.setViewportSize({ width: 844, height: 390 }); await sleep(900);
    await q.screenshot({ path: 'karts-meso-' + m.id + '-844x390.png' });
    await q.setViewportSize({ width: 390, height: 844 }); await sleep(300);
    await f.evaluate(() => { window.__karts.piloto(false); window.__karts.adelantar(); });
    await f.waitForSelector('#ov-res:not(.hide)', { timeout: 20000 });
    await f.evaluate(() => document.querySelector('#res-botones [data-ir="menu"]').click());
    await f.waitForSelector('#ov-menu:not(.hide)');
    await f.tap('[data-ir="pistas"]');
  }
  await q.context().close();
}
const fpsMeso = {};
// Copa Mesoamericana dentro de Juegos: empieza en La Venta, se guarda con su id y continúa tras recargar.
async function probarCopaMeso(b) {
  const p = await abrir(b);
  await abrirJuego(p, 'karts');
  let fr = await marcoDe(p);
  await fr.waitForSelector('#ov-menu:not(.hide)', { timeout: 30000 });
  ok('menú: Copa Fiesta y Copa Mesoamericana', /Copa Fiesta/.test(await fr.textContent('#menu-ops')) && await fr.isVisible('[data-ir="copa-nueva:mesoamerica"]'));
  await p.screenshot({ path: 'karts-meso-menu.png', fullPage: true });
  await fr.click('[data-ir="copa-nueva:mesoamerica"]');
  await fr.waitForFunction(() => window.__karts.estado().modo === 'carrera');
  ok('Copa Mesoamericana: la carrera 1 es en la Selva de La Venta', (await estado(fr)).pista === 'laventa');
  await sleep(3800);
  await fr.evaluate(() => window.__karts.adelantar());
  await fr.waitForSelector('#ov-res:not(.hide)', { timeout: 20000 });
  await fr.waitForFunction(() => /individuales|No se guardaron/.test(document.getElementById('res-guardado').textContent), null, { timeout: 20000 });
  for (let i = 0; i < 20; i++) { const d = (await progreso()).datos; if (d && d.copaEnCurso && d.copaEnCurso.copa === 'mesoamerica') break; await sleep(500); }
  ok('Copa Mesoamericana: resultados con la siguiente carrera en Teotihuacan', /Carrera 2 de 4: Calzada de los Muertos/.test(await fr.textContent('#res-botones')), await fr.textContent('#res-botones'));
  const g = await progreso(), cc = g.datos && g.datos.copaEnCurso;
  ok('progreso: Copa Mesoamericana en curso (carrera 2) guardada en el servidor', cc && cc.copa === 'mesoamerica' && cc.carrera === 1, JSON.stringify(cc));
  await p.reload(); await p.waitForSelector('[data-menu]', { timeout: 60000 });
  await abrirJuego(p, 'karts');
  fr = await marcoDe(p);
  await fr.waitForSelector('#ov-menu:not(.hide)', { timeout: 30000 });
  const menu = await fr.textContent('#menu-ops');
  ok('tras recargar: «Continuar Copa Mesoamericana» en la carrera 2 de 4', menu.includes('Continuar Copa Mesoamericana') && menu.includes('Carrera 2 de 4'), menu);
  await fr.click('[data-ir="copa"]');
  await fr.waitForFunction(() => window.__karts.estado().modo === 'carrera');
  ok('continúa en la Calzada de los Muertos', (await estado(fr)).pista === 'teotihuacan');
  await p.context().close();
}

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME });
  const p = await abrir(b);
  const tarjeta = await textoTarjeta(p, 'karts');
  ok('catálogo: Karts Turbo con ícono y descripción', tarjeta.includes('🏎️') && tarjeta.includes('Karts Turbo') && tarjeta.includes('copa'), tarjeta);
  ok('catálogo: todas las categorías (CATEGORIAS) y todos los juegos de la página', (m => m.secciones === m.categorias && m.completo)(await contarMenu(p)));
  const puntosAntes = await p.evaluate(() => state.totalIndividual);

  // ---- Copa: carrera 1 (teclado) ----
  await abrirJuego(p, 'karts');
  let fr = await marcoDe(p);
  await fr.waitForSelector('#ov-menu:not(.hide)', { timeout: 30000 });
  await revisarSelector(fr, 'menú');
  ok('menú: Xalli elegido por omisión', await elegido(fr) === 'xalli');
  await p.screenshot({ path: 'karts-390-menu-piloto.png', fullPage: true });
  await fr.click('[data-ir="copa-nueva"]');
  await fr.waitForFunction(() => window.__karts.estado().modo === 'carrera');
  const e0 = await estado(fr);
  ok('carrera con 8 corredores en la primera pista', e0.karts === 8 && e0.pista === 'pradera', JSON.stringify({ karts: e0.karts, pista: e0.pista }));
  revisarRivales(e0, 'xalli', 'copa');
  await sleep(3600); // cuenta regresiva
  await fr.click('canvas', { force: true });
  await sleep(1500);
  const e1 = await estado(fr);
  ok('acelera solo tras ¡YA!', e1.vel > 150 && e1.tiempo > 1000, JSON.stringify({ vel: e1.vel, t: e1.tiempo }));
  ok('minimapa: 8 corredores con el tuyo resaltado', e1.marcasMapa === 8 && e1.yoEnMapa, JSON.stringify({ marcas: e1.marcasMapa, yo: e1.yoEnMapa }));
  await p.screenshot({ path: 'karts-390-carrera.png' });
  // Derrape largo girando hacia el mismo lado → mini-turbo morado.
  await p.keyboard.down('ArrowLeft'); await p.keyboard.down('Space'); await sleep(2500); await p.keyboard.up('Space'); await p.keyboard.up('ArrowLeft');
  await sleep(150);
  const e2 = await estado(fr);
  ok('mini-turbo morado tras derrapar 2.1 s', e2.ultimoTurbo === 'morado' && e2.turbo > 0, JSON.stringify({ ultimo: e2.ultimoTurbo, turbo: e2.turbo }));
  await fr.evaluate(() => window.__karts.adelantar());
  await fr.waitForSelector('#ov-res:not(.hide)', { timeout: 20000 });
  await fr.waitForFunction(() => /individuales|No se guardaron/.test(document.getElementById('res-guardado').textContent), null, { timeout: 20000 });
  const res = await fr.textContent('#ov-res');
  ok('resultados con tabla de la copa y puntos en ⭐ individuales', /Copa/.test(res) && res.includes('a tus ⭐ individuales') && /\+15/.test(res), res.slice(0, 200));
  ok('resultados con podio de 3 y tarjetas de tiempo, monedas y puntos', (await fr.$$('#res-podio .esc')).length === 3 && /Tu tiempo/.test(res) && /Monedas/.test(res) && /Puntos/.test(res));
  ok('el total individual sube', (await p.evaluate(() => state.totalIndividual)) > puntosAntes);
  await p.screenshot({ path: 'karts-390-resultados.png' });
  await sleep(800);
  const g1 = await progreso();
  const cc = g1.datos && g1.datos.copaEnCurso;
  ok('progreso: copa en curso en la carrera 2 con puntos', cc && cc.carrera === 1 && cc.puntos.reduce((a, x) => a + x, 0) === 58, JSON.stringify(g1.datos));

  // ---- Recargar y continuar la copa ----
  await p.reload(); await p.waitForSelector('[data-menu]', { timeout: 60000 });
  await abrirJuego(p, 'karts');
  fr = await marcoDe(p);
  await fr.waitForSelector('#ov-menu:not(.hide)', { timeout: 30000 });
  const menu = await fr.textContent('#menu-ops');
  ok('tras recargar: «Continuar Copa Fiesta» en la carrera 2 de 4', menu.includes('Continuar Copa Fiesta') && menu.includes('Carrera 2 de 4'), menu);
  await p.screenshot({ path: 'karts-390-menu.png' });
  ok('avance viejo: Xalli sigue elegido', await elegido(fr) === 'xalli');
  await fr.click('[data-personaje="itzae"]');
  ok('elegir a Itzae lo marca', await elegido(fr) === 'itzae');
  await p.reload(); await p.waitForSelector('[data-menu]', { timeout: 60000 });
  await abrirJuego(p, 'karts');
  fr = await marcoDe(p);
  await fr.waitForSelector('#ov-menu:not(.hide)', { timeout: 30000 });
  ok('tras recargar Juegos sigue elegido Itzae', await elegido(fr) === 'itzae');
  await fr.click('[data-ir="copa"]');
  await fr.waitForFunction(() => window.__karts.estado().modo === 'carrera');
  ok('continúa en la segunda pista (desierto)', (await estado(fr)).pista === 'desierto');
  revisarRivales(await estado(fr), 'itzae', 'copa tras recargar');
  const prog2 = await progreso();
  ok('el progreso de karts no cambia de forma (sin personaje)', prog2.datos && !('personaje' in prog2.datos) && Object.keys(prog2.datos).length === 5, Object.keys(prog2.datos || {}).join(','));
  await p.click('[data-a="salir"]').catch(() => {});

  // ---- Celular (toques reales): botones ⬅ ➡ por omisión, vista 3D, multitáctil y layout a 390×844 vertical ----
  const cel = await abrir(b, { width: 390, height: 844 }, TACTIL);
  await abrirJuego(cel, 'karts', { tap: true });
  let fc = await marcoDe(cel);
  await fc.waitForSelector('#ov-menu:not(.hide)', { timeout: 30000 });
  ok('celular: selector de controles visible con Botones y acelerar automático por omisión', await fc.isVisible('#menu-control') && (await fc.getAttribute('[data-control="botones"]', 'aria-pressed')) === 'true' && (await fc.getAttribute('[data-acel="auto"]', 'aria-pressed')) === 'true' && (await estado(fc)).tactil);
  await cel.screenshot({ path: 'karts-390-menu-controles.png' });
  await fc.tap('[data-ir="pistas"]'); await fc.tap('[data-ir="rapida:pradera"]');
  await fc.waitForFunction(() => window.__karts.estado().modo === 'carrera');
  await sleep(600);
  ok('tutorial de controles visible al empezar', (await estado(fc)).tutorial && /Girar/.test(await fc.textContent('#tuto')) && /DERRAPE/.test(await fc.textContent('#tuto')));
  await cel.screenshot({ path: 'karts-390-tutorial.png' });
  await fc.waitForFunction(() => window.__karts.estado().tiempo > 400, null, { timeout: 15000 });
  await sleep(200);
  ok('tutorial: se quita solo a los 3 s', !(await estado(fc)).tutorial);
  const v3 = await estado(fc);
  ok('vista pseudo-3D: horizonte, escenario y rivales proyectados', v3.vista === '3d' && v3.horizonte > 40 && v3.dibujados >= 8, JSON.stringify({ hy: v3.horizonte, dib: v3.dibujados }));
  await revisarLayout(fc, '390×844 vertical');
  const d = dedos(cel);
  const bi = await centro(fc, '[data-k="izq"]'), bd = await centro(fc, '[data-k="der"]');
  let a0 = (await estado(fc)).ang, c0 = (await estado(fc)).camAng;
  await d.poner(1, bi.x, bi.y); await sleep(600);
  const eb = await estado(fc);
  ok('botones: mantener ⬅ con toque real gira el carro a la izquierda', eb.giro === -1 && eb.ang < a0 - 0.4, JSON.stringify({ giro: eb.giro, antes: r2(a0), despues: r2(eb.ang) }));
  ok('botones: la cámara 3D gira con el carro', eb.camAng < c0 - 0.3, JSON.stringify({ antes: r2(c0), despues: r2(eb.camAng) }));
  await cel.screenshot({ path: 'karts-390-carrera-3d.png' });
  await d.soltarTodo(); await sleep(150);
  const suelto = await estado(fc); await sleep(300);
  ok('botones: al soltar deja de girar', suelto.giro === 0 && Math.abs((await estado(fc)).ang - suelto.ang) < 0.02);
  a0 = (await estado(fc)).ang;
  await d.poner(1, bd.x, bd.y); await sleep(500);
  const ed = await estado(fc); await d.soltarTodo();
  ok('botones: mantener ➡ gira a la derecha', ed.giro === 1 && ed.ang > a0 + 0.3, JSON.stringify({ antes: r2(a0), despues: r2(ed.ang) }));
  await sleep(400);
  // Multitáctil: ⬅ con un dedo y DERRAPE con otro durante 2.6 s.
  const dz = await centro(fc, '#m-derrape');
  await d.poner(1, bi.x, bi.y); await d.poner(2, dz.x, dz.y); await sleep(1200);
  const mt = await estado(fc);
  ok('multitáctil: gira y derrapa a la vez', mt.derrape && mt.giro === -1, JSON.stringify({ derrape: mt.derrape, giro: mt.giro }));
  await sleep(1400);
  await d.soltarTodo(); await sleep(150);
  const mt2 = await estado(fc);
  ok('multitáctil: ⬅ + DERRAPE 2.6 s → mini-turbo morado', mt2.ultimoTurbo === 'morado', JSON.stringify({ ultimo: mt2.ultimoTurbo, vel: mt2.vel }));
  const scrollAntes = await cel.evaluate(() => scrollY);
  await d.poner(3, bi.x, bi.y); await d.mover(3, bi.x + 10, bi.y - 120); await d.soltarTodo();
  ok('arrastrar sobre los botones no desplaza la página de Juegos', (await cel.evaluate(() => scrollY)) === scrollAntes);

  // ---- Joystick y «Acelerar con botón» elegidos, guardados tras recargar ----
  await fc.evaluate(() => window.__karts.adelantar());
  await fc.waitForSelector('#ov-res:not(.hide)', { timeout: 20000 });
  await fc.tap('#res-botones [data-ir="menu"]');
  await fc.tap('[data-control="joystick"]'); await fc.tap('[data-acel="manual"]');
  await cel.reload(); await cel.waitForSelector('[data-menu]', { timeout: 60000 });
  await abrirJuego(cel, 'karts', { tap: true });
  fc = await marcoDe(cel);
  await fc.waitForSelector('#ov-menu:not(.hide)', { timeout: 30000 });
  const pref = await estado(fc);
  ok('preferencia: tras recargar siguen elegidos «Joystick» y «Con botón»', (await fc.getAttribute('[data-control="joystick"]', 'aria-pressed')) === 'true' && pref.control === 'joystick' && pref.acel === 'manual', JSON.stringify({ control: pref.control, acel: pref.acel }));
  await correrRapida(fc, 'desierto');
  await sleep(800);
  const sinAcel = await estado(fc);
  ok('acelerar con botón: sin tocar ACELERAR el carro no avanza', sinAcel.vel < 20 && !sinAcel.acelera, JSON.stringify({ vel: sinAcel.vel }));
  const ac = await centro(fc, '#m-acel');
  const d2 = dedos(cel);
  await d2.poner(5, ac.x, ac.y); await sleep(1200);
  const conAcel = await estado(fc);
  ok('acelerar con botón: mantener ACELERAR (toque real) avanza', conAcel.acelera && conAcel.vel > 120, JSON.stringify({ vel: conAcel.vel }));
  const jz = await centro(fc, '#joy-zona');
  a0 = conAcel.ang;
  await d2.poner(1, jz.x, jz.y); await d2.mover(1, jz.x - 15, jz.y); await sleep(250);
  const suave = await estado(fc);
  await d2.mover(1, jz.x - 60, jz.y); await sleep(500);
  const fuerte = await estado(fc);
  ok('joystick: arrastre corto gira poco y arrastre largo gira al máximo (proporcional)', suave.giro < -0.1 && suave.giro > -0.4 && r2(fuerte.giro) === -1, JSON.stringify({ suave: r2(suave.giro), fuerte: r2(fuerte.giro) }));
  ok('joystick: el carro gira a la izquierda', fuerte.ang < a0 - 0.4, JSON.stringify({ antes: r2(a0), despues: r2(fuerte.ang) }));
  await revisarLayout(fc, '390×844 joystick + ACELERAR');
  await cel.screenshot({ path: 'karts-390-joystick.png' });
  await d2.soltarTodo(); await sleep(150);
  ok('joystick: al soltar regresa al centro', (await estado(fc)).giro === 0);
  await d2.poner(1, jz.x, jz.y); await d2.mover(1, jz.x - 5, jz.y); await sleep(150);
  ok('joystick: zona muerta', (await estado(fc)).giro === 0);
  await d2.mover(1, jz.x, jz.y + 50); await sleep(150);
  ok('joystick: jalar hacia abajo frena', (await estado(fc)).freno === true);
  await d2.soltarTodo();
  await fc.evaluate(() => window.__karts.adelantar());
  await fc.waitForSelector('#ov-res:not(.hide)', { timeout: 20000 });
  await fc.tap('#res-botones [data-ir="menu"]');
  await fc.tap('[data-control="botones"]'); await fc.tap('[data-acel="auto"]');
  await cel.context().close();

  // ---- Sensor con eventos deviceorientation ----
  const inclinable = [() => {
    if (!location.pathname.endsWith('karts.html')) return;
    window.__inclinar = 0;
    setInterval(() => dispatchEvent(new DeviceOrientationEvent('deviceorientation', { alpha: 0, beta: 8, gamma: window.__inclinar })), 40);
  }];
  const sen = await abrir(b, { width: 390, height: 844 }, TACTIL, inclinable);
  await abrirJuego(sen, 'karts', { tap: true });
  const fs1 = await marcoDe(sen);
  await fs1.waitForSelector('#ov-menu:not(.hide)', { timeout: 30000 });
  await fs1.tap('[data-control="sensor"]');
  await fs1.tap('#b-activar-sensor');
  await fs1.waitForFunction(() => window.__karts.estado().sensorActivo, null, { timeout: 5000 }).catch(() => {});
  ok('sensor: se activa con las lecturas de orientación', (await estado(fs1)).sensorActivo && /Sensor listo/.test(await fs1.textContent('#ctl-estado')));
  await sen.screenshot({ path: 'karts-390-menu-sensor.png' });
  await correrRapida(fs1, 'hielo');
  await sleep(300);
  a0 = (await estado(fs1)).ang;
  await fs1.evaluate(() => { window.__inclinar = 18; });
  await sleep(600);
  const es1 = await estado(fs1);
  ok('sensor: inclinar a la derecha gira a la derecha', es1.giro > 0.5 && es1.ang > a0 + 0.3, JSON.stringify({ giro: r2(es1.giro), antes: r2(a0), despues: r2(es1.ang) }));
  await sen.screenshot({ path: 'karts-390-sensor.png' });
  await fs1.evaluate(() => { window.__inclinar = 1; }); await sleep(200);
  ok('sensor: cerca del centro (zona muerta) no gira', (await estado(fs1)).giro === 0);
  await sen.context().close();

  // Permiso negado (como en iOS) → aviso y regreso al joystick.
  const negado = [() => { if (window.DeviceOrientationEvent) window.DeviceOrientationEvent.requestPermission = () => Promise.resolve('denied'); }];
  const neg = await abrir(b, { width: 390, height: 844 }, TACTIL, negado);
  await abrirJuego(neg, 'karts', { tap: true });
  const fn = await marcoDe(neg);
  await fn.waitForSelector('#ov-menu:not(.hide)', { timeout: 30000 });
  await fn.tap('[data-control="sensor"]'); await fn.tap('#b-activar-sensor');
  await fn.waitForFunction(() => window.__karts.estado().control === 'botones', null, { timeout: 5000 }).catch(() => {});
  const en = await estado(fn);
  ok('sensor: permiso negado → aviso amable y regreso a los botones', en.control === 'botones' && !en.sensorActivo && /No se pudo usar el sensor/.test(await fn.textContent('#ctl-estado')), JSON.stringify({ control: en.control }));
  await neg.screenshot({ path: 'karts-390-sensor-negado.png' });
  await neg.context().close();

  // Sin giroscopio (no llegan lecturas) → a los 2 s regresa al joystick.
  const sin = await abrir(b, { width: 390, height: 844 }, TACTIL);
  await abrirJuego(sin, 'karts', { tap: true });
  const fsn = await marcoDe(sin);
  await fsn.waitForSelector('#ov-menu:not(.hide)', { timeout: 30000 });
  await fsn.tap('[data-control="sensor"]'); await fsn.tap('#b-activar-sensor');
  await sleep(800);
  const antesDe2 = await estado(fsn);
  await sleep(1900);
  const trasDe2 = await estado(fsn);
  ok('sensor: sin lecturas espera 2 s y regresa a los botones', antesDe2.control === 'sensor' && trasDe2.control === 'botones' && /No se pudo usar el sensor/.test(await fsn.textContent('#ctl-estado')), JSON.stringify({ antes: antesDe2.control, despues: trasDe2.control }));
  await sin.context().close();

  // ---- Horizontal 844×390 y celular angosto 360×640 ----
  const hor = await abrir(b, { width: 844, height: 390 }, TACTIL);
  await abrirJuego(hor, 'karts', { tap: true });
  const fh = await marcoDe(hor);
  await fh.waitForSelector('#ov-menu:not(.hide)', { timeout: 30000 });
  await correrRapida(fh, 'volcan');
  await revisarLayout(fh, '844×390 horizontal');
  const marcoH = await hor.evaluate(() => { const r = document.querySelector('#arcade-frame').getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top) }; });
  ok('horizontal: el juego usa casi toda la altura de la pantalla dentro de Juegos', marcoH.h >= 360 && marcoH.top >= -1 && marcoH.top + marcoH.h <= 391, JSON.stringify(marcoH));
  const jh = await centro(fh, '[data-k="der"]');
  a0 = (await estado(fh)).ang;
  const d3 = dedos(hor);
  await d3.poner(1, jh.x, jh.y); await sleep(500);
  const eh = await estado(fh);
  ok('horizontal: el botón ➡ gira a la derecha', eh.giro === 1 && eh.ang > a0 + 0.4, JSON.stringify({ giro: eh.giro }));
  await hor.screenshot({ path: 'karts-844-horizontal.png' });
  await d3.soltarTodo();
  await hor.context().close();

  const ang = await abrir(b, { width: 360, height: 640 }, TACTIL);
  await abrirJuego(ang, 'karts', { tap: true });
  const fa = await marcoDe(ang);
  await fa.waitForSelector('#ov-menu:not(.hide)', { timeout: 30000 });
  await correrRapida(fa, 'pradera');
  await revisarLayout(fa, '360×640 vertical');
  await ang.screenshot({ path: 'karts-360-vertical.png' });
  await ang.context().close();
  const mini = await abrir(b, { width: 320, height: 640 }, TACTIL);
  await abrirJuego(mini, 'karts', { tap: true });
  const fm = await marcoDe(mini);
  await fm.waitForSelector('#ov-menu:not(.hide)', { timeout: 30000 });
  await correrRapida(fm, 'hielo');
  await revisarLayout(fm, '320×640 vertical');
  await mini.screenshot({ path: 'karts-320-vertical.png' });
  await mini.context().close();

  // ---- Escritorio ----
  const escr = await abrir(b, { width: 1280, height: 800 });
  await abrirJuego(escr, 'karts');
  const fe = await marcoDe(escr);
  await fe.waitForSelector('#ov-menu:not(.hide)', { timeout: 30000 });
  ok('escritorio: sin mandos táctiles ni selector, con ayuda del teclado', !(await fe.isVisible('#mandos')) && !(await fe.isVisible('#menu-control')) && await fe.isVisible('#teclas'), JSON.stringify({ tactil: (await estado(fe)).tactil }));
  await fe.click('[data-ir="pistas"]'); await fe.click('[data-ir="rapida:volcan"]');
  await fe.waitForFunction(() => window.__karts.estado().modo === 'carrera');
  await sleep(5000);
  const ee = await estado(fe);
  ok('escritorio: vista ancha y 60 cuadros por segundo', ee.lw > 400 && ee.fps >= 50, JSON.stringify({ lw: ee.lw, fps: ee.fps }));
  ok('escritorio: acelerar avanza (automático)', ee.vel > 150 && ee.acelera, JSON.stringify({ vel: ee.vel }));
  await escr.screenshot({ path: 'karts-escritorio.png' });
  const k0 = await estado(fe);
  await escr.keyboard.down('ArrowRight'); await sleep(500);
  const k1 = await estado(fe); await escr.keyboard.up('ArrowRight');
  ok('teclado: → gira el carro y la cámara a la derecha', k1.giro === 1 && k1.ang > k0.ang + 0.3 && k1.camAng > k0.camAng + 0.2, JSON.stringify({ ang: [r2(k0.ang), r2(k1.ang)], cam: [r2(k0.camAng), r2(k1.camAng)] }));
  await escr.keyboard.down('KeyA'); await sleep(300);
  ok('teclado: A gira a la izquierda', (await estado(fe)).giro === -1); await escr.keyboard.up('KeyA');
  await escr.keyboard.down('ArrowDown'); await sleep(200);
  ok('teclado: ↓ frena', (await estado(fe)).freno === true); await escr.keyboard.up('ArrowDown');
  // Una vuelta completa de verdad con el piloto de prueba (sin teletransportes).
  await fe.evaluate(() => window.__karts.piloto(true));
  const vIni = (await estado(fe)).vuelta;
  await fe.waitForFunction(v => window.__karts.estado().vuelta >= Math.max(1, v + 1), vIni, { timeout: 70000 }).catch(() => {});
  const ev = await estado(fe);
  ok('una vuelta completa recorriendo la pista en 3D', ev.vuelta >= Math.max(1, vIni + 1) && !ev.fuera, JSON.stringify({ vuelta: ev.vuelta, t: ev.tiempo, pos: ev.pos }));
  await escr.screenshot({ path: 'karts-escritorio-vuelta.png' });
  await escr.context().close();

  // ---- Mando clásico (openspec: karts-mando) ----
  await probarMando(b);

  // ---- Personajes (openspec: personajes-xalli) ----
  await probarPersonajes(b);

  // ---- Pistas mesoamericanas (openspec: karts-pistas-mesoamericanas) ----
  await probarPistasMeso(b);

  // ---- Partida en sala con bots fantasma ----
  const vAntes = (await progreso()).v;
  await p.click('[data-tab="partidas"]'); await p.waitForSelector('#f-crear');
  await p.selectOption('#p-juego', 'karts'); await p.selectOption('#p-mapa', 'hielo');
  await p.click('#f-crear button[type=submit]'); await p.waitForSelector('[data-p="empezar"]', { timeout: 30000 });
  await p.click('[data-p="empezar"]');
  const fsala = await marcoDe(p, '#p-body');
  await fsala.waitForFunction(() => window.__karts && window.__karts.estado().sala && window.__karts.estado().modo === 'carrera', null, { timeout: 30000 });
  const es = await estado(fsala);
  ok('sala: la pista elegida (hielo) con 2 fantasmas', es.pista === 'hielo' && es.karts === 3, JSON.stringify({ pista: es.pista, karts: es.karts }));
  revisarRivales(es, 'itzae', 'sala');
  await sleep(9000);
  const es2 = await estado(fsala);
  ok('sala: el minimapa muestra a los 2 fantasmas y a ti', es2.marcasMapa === 3 && es2.yoEnMapa, JSON.stringify({ marcas: es2.marcasMapa }));
  await p.screenshot({ path: 'karts-390-sala.png' });
  await sleep(8000);
  await fsala.evaluate(() => window.__karts.adelantar());
  await p.waitForSelector('#p-body .result', { timeout: 30000 });
  await sleep(1500);
  const podio = await p.textContent('#p-body');
  ok('podio con bots y tiempos', /BOT-VACHIRA/.test(podio) && /BOT-ISAGII/.test(podio) && /Tiempos/.test(podio), podio.slice(0, 200));
  ok('puntos de sala en 👥 partidas', /a tus puntos de partidas/.test(await p.textContent('#p-guardado')), await p.textContent('#p-guardado'));
  await p.screenshot({ path: 'karts-390-podio.png', fullPage: true });
  ok('la partida no guarda progreso', (await progreso()).v === vAntes);

  // ---- Copa Mesoamericana (al final: cambia la copa en curso) ----
  await probarCopaMeso(b);
  console.log('fps con CPU ×4 por pista nueva: ' + JSON.stringify(fpsMeso));

  await b.close();
  console.log(out.join('\n')); process.exit(out.some(x => x.startsWith('FAIL')) ? 1 : 0);
})().catch(e => { console.log(out.join('\n')); console.error('ERROR', e.message.slice(0, 400)); process.exit(2); });
