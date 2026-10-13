// E2E: «Axo y los 12 mundos» (openspec: juegos-plataformas-karts).
// Catálogo Arcade, jugar el 1-1 (moverse con el teclado y llegar a la meta), puntos en ⭐ individuales, progreso
// guardado en el servidor y recuperado tras recargar, y partida en sala con bots: podio por tiempo sin tocar el
// progreso. Capturas a 390 px y en escritorio. Usa ?arcadePrueba=1 (ganchos window.__plat dentro del juego).
// Diseño (openspec: axo-diseno): capturas de cada mundo, del jefe y del mapa; el HUD no tapa el nivel a 390 px.
// Personajes (openspec: personajes-xalli): la portada ofrece a Xalli, Itzae, Yahui y Xochiquetzal con nombre y título;
// el avance viejo carga con Xalli; la elección se recuerda tras recargar; cada personaje se dibuja (píxeles de su color
// de firma, capturas de cerca y hoja de poses) y termina el 1-1; valor desconocido o sin localStorage → Xalli; sin
// partículas con movimiento reducido; el selector cabe a 320×640, 390×844 y 844×390.
require('./lib/entorno'); // BASE, API, CHROME, carpeta de salida y sesión de prueba en fetch
const { chromium } = require('playwright');
const { abrirPagina } = require('./lib/navegador');
const { PERSONAJES, contarColor, recorte, hojaPerfiles } = require('./lib/personajes');
const { abrirJuego, textoTarjeta } = require('./lib/menu'); // menú por categorías (openspec: juegos-categorias)
const API = process.env.API;
const out = []; const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const EMAIL = 'marisol@example.com';
const progreso = async () => (await fetch(API + '/juegos/progreso/plataformas?email=' + encodeURIComponent(EMAIL))).json();
const abrir = (b, viewport) => abrirPagina(b, { email: EMAIL, viejo: true, viewport, out, ruta: '/juegos.html?arcadePrueba=1', esperar: '[data-menu]' });
async function marcoDe(p, raiz = '') {
  const el = await p.waitForSelector(raiz + ' #arcade-frame', { timeout: 30000 });
  return el.contentFrame();
}
// Recorre los 4 mundos jugables y el castillo con jefe, con una captura de cada uno (`<prefijo>-mundo-<id>.png`).
async function recorrerMundos(pag, fr, prefijo) {
  const errores = [];
  for (const id of ['1-1', '2-1', '3-1', '4-1', '4-3']) {
    await fr.evaluate(i => window.__plat.nivel(i), id);
    await fr.waitForFunction(i => window.__plat.estado().nivel === i && window.__plat.estado().modo === 'nivel', id);
    if (id === '4-3') await fr.evaluate(() => window.__plat.irAlJefe());
    else await caminar(fr, 900);
    await sleep(id === '4-3' ? 1800 : 300);
    const e = await fr.evaluate(() => window.__plat.estado());
    if (e.modo !== 'nivel') errores.push(id + ': ' + e.modo);
    await pag.screenshot({ path: prefijo + '-mundo-' + id + '.png' });
  }
  return errores;
}
async function caminar(fr, ms) { await fr.click('canvas', { force: true }); await fr.page().keyboard.down('ArrowRight'); await sleep(ms); await fr.page().keyboard.up('ArrowRight'); }

// ---- Personajes (openspec: personajes-xalli, personajes-estilo-karts: 8 personajes) ----
const elegido = fr => fr.evaluate(() => [...document.querySelectorAll('#personajes [data-personaje]')].filter(b => b.getAttribute('aria-pressed') === 'true').map(b => b.dataset.personaje).join(','));
async function revisarSelector(fr, nombre) {
  const tarjetas = await fr.$$eval('#personajes [data-personaje]', bs => bs.map(b => ({ id: b.dataset.personaje, txt: b.textContent, img: !!b.querySelector('img[src^="data:image"]') })));
  ok(nombre + ': el selector muestra a los 8 con nombre, título y retrato', tarjetas.length === 8 && PERSONAJES.every((x, i) => tarjetas[i].id === x.id && tarjetas[i].txt.includes(x.nombre) && tarjetas[i].txt.includes(x.titulo) && tarjetas[i].img), JSON.stringify(tarjetas.map(t => t.id + ':' + t.txt)));
}
// Caja del personaje (px del lienzo) y sus píxeles: su color de firma sí; las branquias de Xalli solo en Xalli.
async function revisarDibujo(fr, id, nombre) {
  const caja = await fr.evaluate(() => window.__plat.cajaJugador());
  const x = PERSONAJES.find(z => z.id === id), firma = await contarColor(fr, caja, x.firma), branquias = id === 'xalli' ? 0 : await contarColor(fr, caja, PERSONAJES[0].firma);
  ok(nombre + ': se dibuja a ' + x.nombre + ' (color de firma en su caja)', firma >= 12 && branquias < 4, JSON.stringify({ firma, branquias, caja }));
  return caja;
}
// Juego suelto: con cada personaje se dibuja, se toma de cerca (quieto, caminando, saltando) y termina el 1-1.
async function probarPersonajes(b) {
  const q = await abrirPagina(b, { viewport: { width: 390, height: 844 }, contexto: { deviceScaleFactor: 3 }, out, etiqueta: 'plataformas suelto', ruta: '/juegos/plataformas.html?prueba=1', esperar: '#ov-titulo:not(.hide)' });
  const f = q.mainFrame();
  await revisarSelector(f, 'suelto');
  await hojaPerfiles(f, 'personajes-hoja-perfil.png');
  for (const x of PERSONAJES) {
    await f.click('[data-personaje="' + x.id + '"]');
    ok('suelto: elegir a ' + x.nombre + ' lo marca y cambia la portada', await elegido(f) === x.id && (await f.getAttribute('#portada-axo', 'alt')).includes(x.nombre));
    const detalle = await f.textContent('#personaje-detalle'); // personajes-estilo-karts: línea con título y personalidad
    ok('suelto: la línea de detalle habla de ' + x.nombre, detalle.includes(x.nombre) && detalle.includes(x.titulo), detalle);
    await q.screenshot({ path: 'plataformas-personaje-' + x.id + '-portada.png' });
    await f.click('#b-jugar'); await f.waitForSelector('#ov-mapa:not(.hide)');
    ok('suelto: la marca del mapa es ' + x.nombre, (await f.getAttribute('.marca img', 'data-personaje')) === x.id);
    await f.click('[data-nivel="1-1"]');
    await f.waitForFunction(() => window.__plat.estado().modo === 'nivel');
    await sleep(500);
    ok('suelto: juega con ' + x.nombre, (await f.evaluate(() => window.__plat.estado().personaje)) === x.id);
    const caja = await revisarDibujo(f, x.id, 'suelto');
    await recorte(q, f, caja, 'plataformas-personaje-' + x.id + '-quieto.png', 20);
    await q.keyboard.down('ArrowRight'); await sleep(450);
    await recorte(q, f, await f.evaluate(() => window.__plat.cajaJugador()), 'plataformas-personaje-' + x.id + '-camina.png', 20);
    await q.keyboard.down('Space'); await sleep(170);
    await recorte(q, f, await f.evaluate(() => window.__plat.cajaJugador()), 'plataformas-personaje-' + x.id + '-salta.png', 20);
    await q.keyboard.up('Space'); await sleep(250); await q.keyboard.up('ArrowRight');
    ok('suelto: ' + x.nombre + ' suelta su partícula al correr y saltar', (await f.evaluate(() => window.__plat.estado().rastro)) > 0);
    await q.screenshot({ path: 'plataformas-personaje-' + x.id + '-nivel.png' });
    await f.evaluate(() => window.__plat.irAMeta()); await caminar(f, 1500);
    await f.waitForSelector('#ov-fin:not(.hide)', { timeout: 20000 });
    ok('suelto: ' + x.nombre + ' termina el 1-1 con sus puntos', (await f.textContent('#fin-titulo')).includes('Nivel superado') && /⭐ \d+ puntos/.test(await f.textContent('#fin-puntos')));
    await q.reload(); await q.waitForSelector('#ov-titulo:not(.hide)');
    ok('suelto: tras recargar sigue elegido ' + x.nombre, await elegido(f) === x.id);
  }
  await q.context().close();
  // Selector a 320×640, 390×844 y 844×390: los 8 caben en 4×2 sin desplazamiento horizontal (personajes-estilo-karts).
  for (const vp of [{ width: 320, height: 640 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
    const r = await abrirPagina(b, { viewport: vp, contexto: { hasTouch: true, isMobile: true }, out, etiqueta: 'plataformas ' + vp.width, ruta: '/juegos/plataformas.html?prueba=1', esperar: '#ov-titulo:not(.hide)' });
    const m = await r.evaluate(() => ({ vw: innerWidth, ancho: document.documentElement.scrollWidth, vh: innerHeight, cajas: [...document.querySelectorAll('#personajes [data-personaje]')].map(e => { const c = e.getBoundingClientRect(); return { l: c.left, r: c.right, t: c.top, w: c.width }; }), jugar: document.getElementById('b-jugar').getBoundingClientRect().width, jugarAbajo: document.getElementById('b-jugar').getBoundingClientRect().bottom }));
    const filas = new Set(m.cajas.map(c => Math.round(c.t))).size;
    ok(vp.width + '×' + vp.height + ': las 8 tarjetas caben a lo ancho en 2 filas', m.cajas.length === 8 && filas === 2 && m.cajas.every(c => c.l >= -0.5 && c.r <= m.vw + 0.5 && c.w >= 56) && m.ancho <= m.vw && m.jugar > 0 && m.jugarAbajo <= m.vh, JSON.stringify(m));
    await r.screenshot({ path: 'plataformas-selector-' + vp.width + 'x' + vp.height + '.png' });
    await r.context().close();
  }
  // Casos de error: valor desconocido y sin localStorage → Xalli; con movimiento reducido no hay partículas.
  const raro = [() => { try { localStorage.setItem('arcade_personaje', 'pikachu'); } catch { /* nada */ } }];
  const privado = [() => { Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new Error('almacenamiento bloqueado'); } }); }];
  for (const [nombre, init, ctx] of [['valor desconocido', raro, {}], ['sin localStorage (modo privado)', privado, {}], ['movimiento reducido', null, { reducedMotion: 'reduce' }]]) {
    const r = await abrirPagina(b, { viewport: { width: 390, height: 844 }, contexto: ctx, init: init || undefined, out, etiqueta: 'plataformas ' + nombre, ruta: '/juegos/plataformas.html?prueba=1', esperar: '#ov-titulo:not(.hide)' });
    const g = r.mainFrame();
    if (nombre === 'movimiento reducido') await g.click('[data-personaje="xochiquetzal"]');
    else ok(nombre + ' → Xalli', await elegido(g) === 'xalli');
    await g.click('#b-jugar'); await g.waitForSelector('#ov-mapa:not(.hide)'); await g.click('[data-nivel="1-1"]');
    await g.waitForFunction(() => window.__plat.estado().modo === 'nivel');
    await r.keyboard.down('ArrowRight'); await r.keyboard.press('Space'); await sleep(900); await r.keyboard.up('ArrowRight');
    const e = await g.evaluate(() => window.__plat.estado());
    if (nombre === 'movimiento reducido') ok('movimiento reducido: sin partículas del personaje', e.personaje === 'xochiquetzal' && e.rastro === 0, JSON.stringify({ rastro: e.rastro }));
    else ok(nombre + ': juega con Xalli sin errores', e.personaje === 'xalli');
    await r.context().close();
  }
}

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME });
  const p = await abrir(b);
  // ---- Catálogo ----
  const tarjeta = await textoTarjeta(p, 'plataformas'); // abre 🕹️ Arcade
  ok('catálogo: categoría 🕹️ Arcade', (await p.textContent('#tab-body')).includes('🕹️ Arcade'));
  ok('catálogo: tarjeta con ícono y descripción', tarjeta.includes('🦎') && tarjeta.includes('Axo y los 12 mundos') && tarjeta.includes('vence al jefe'), tarjeta);
  const antes = await progreso();
  ok('sin avance al empezar', antes.v === 0 && antes.datos === null, JSON.stringify(antes));
  const puntosAntes = await p.evaluate(() => state.totalIndividual);

  // ---- Jugar el 1-1 ----
  await abrirJuego(p, 'plataformas');
  let fr = await marcoDe(p);
  await fr.waitForSelector('#ov-titulo:not(.hide)', { timeout: 30000 });
  await revisarSelector(fr, 'portada');
  const portada = await fr.textContent('#ov-titulo');
  ok('portada: Xalli elegido por omisión y el texto habla de Xalli (el juego sigue siendo «Axo y los 12 mundos»)', await elegido(fr) === 'xalli' && portada.includes('Xalli') && !portada.includes('Axo, el ajolote') && portada.includes('y los 12 mundos'), portada.slice(0, 200));
  await p.screenshot({ path: 'plataformas-390-portada.png' });
  await fr.click('#b-jugar'); await fr.waitForSelector('#ov-mapa:not(.hide)');
  ok('mapa: 12 mundos y el 1-2 bloqueado', (await fr.textContent('#mapa-num')).includes('/ 12') && await fr.$eval('[data-nivel="1-2"]', x => x.disabled));
  await fr.click('[data-nivel="1-1"]');
  await fr.waitForFunction(() => window.__plat.estado().modo === 'nivel');
  const x0 = (await fr.evaluate(() => window.__plat.estado())).x;
  await caminar(fr, 1200);
  const e1 = await fr.evaluate(() => window.__plat.estado());
  ok('Xalli camina con el teclado', e1.x > x0 + 60 && e1.personaje === 'xalli', x0 + ' → ' + e1.x + ' · ' + e1.personaje);
  ok('canvas a 390 px: 15 tiles de alto y nítido', e1.lw >= 224 && e1.k >= 1, JSON.stringify({ lw: e1.lw, k: e1.k }));
  await p.screenshot({ path: 'plataformas-390-jugando.png' });
  const enCurso = await progreso();
  ok('al empezar el nivel se guarda enCurso', enCurso.datos && enCurso.datos.enCurso && enCurso.datos.enCurso.nivel === '1-1', JSON.stringify(enCurso.datos));
  // Monedas para comprobar que se conservan y la vida extra con 100.
  await fr.evaluate(() => window.__plat.darMonedas(103));
  const e2 = await fr.evaluate(() => window.__plat.estado());
  ok('100 monedas = vida extra', e2.vidas === 6 && e2.monedas === 3, JSON.stringify({ vidas: e2.vidas, monedas: e2.monedas }));
  // Daño con champiñón: vuelve a base sin perder vida.
  await fr.evaluate(() => { window.__plat.poder('grande'); window.__plat.danar(); });
  const e3 = await fr.evaluate(() => window.__plat.estado());
  ok('golpe con champiñón: vuelve a base y no pierde vida', e3.poder === 'base' && e3.vidas === 6, JSON.stringify({ poder: e3.poder, vidas: e3.vidas }));
  await fr.evaluate(() => window.__plat.irAMeta()); await caminar(fr, 1500);
  await fr.waitForSelector('#ov-fin:not(.hide)', { timeout: 20000 });
  await fr.waitForFunction(() => /individuales|No se guardaron/.test(document.getElementById('fin-guardado').textContent), null, { timeout: 20000 });
  const fin = await fr.textContent('#ov-fin');
  ok('nivel superado y puntos en ⭐ individuales', fin.includes('¡Nivel superado!') && fin.includes('a tus ⭐ individuales'), fin.slice(0, 160));
  const puntosDespues = await p.evaluate(() => state.totalIndividual);
  ok('el total individual sube', puntosDespues > puntosAntes, puntosAntes + ' → ' + puntosDespues);
  await p.screenshot({ path: 'plataformas-390-nivel-superado.png' });
  await sleep(800);
  const guardado = await progreso();
  const d = guardado.datos || {};
  ok('progreso en el servidor: 1-1 completado y 1-2 desbloqueado', d.completados && d.completados.includes('1-1') && d.mundo === 1 && d.nivel === 2 && d.vidas === 6 && d.monedas === 3 && d.enCurso === null, JSON.stringify(d));
  ok('el progreso no cambia de forma (sin personaje)', !('personaje' in d) && Object.keys(d).length === 8, Object.keys(d).join(','));

  // ---- Recargar y continuar ----
  await p.reload(); await p.waitForSelector('[data-menu]', { timeout: 60000 });
  ok('recargar no deja el juego abierto', !(await p.$('#arcade-frame')));
  await abrirJuego(p, 'plataformas');
  fr = await marcoDe(p);
  await fr.waitForSelector('#ov-titulo:not(.hide)', { timeout: 30000 });
  // Avance viejo (sin personaje) y sin elección en el navegador → Xalli. Elegir a Yahui y recargar.
  ok('avance viejo: carga con Xalli elegido', await elegido(fr) === 'xalli');
  await fr.click('[data-personaje="yahui"]');
  ok('elegir a Yahui lo marca', await elegido(fr) === 'yahui');
  await p.reload(); await p.waitForSelector('[data-menu]', { timeout: 60000 });
  await abrirJuego(p, 'plataformas');
  fr = await marcoDe(p);
  await fr.waitForSelector('#ov-titulo:not(.hide)', { timeout: 30000 });
  ok('tras recargar Juegos sigue elegido Yahui', await elegido(fr) === 'yahui');
  await fr.click('#b-jugar');
  await fr.waitForSelector('#ov-mapa:not(.hide)');
  const hecho = await fr.$eval('[data-nivel="1-1"]', x => x.classList.contains('hecho'));
  const abierto = await fr.$eval('[data-nivel="1-2"]', x => !x.disabled);
  const stats = await fr.textContent('#mapa-stats');
  ok('tras recargar: 1-1 superado, 1-2 abierto, mismas vidas y monedas', hecho && abierto && stats.includes('❤️ 6') && stats.includes('🪙 3'), stats);
  ok('mapa: escena ilustrada, Yahui en el nivel que sigue y candados en «Próximamente»', await fr.$('#mapa-svg svg') !== null && (await fr.getAttribute('.marca img', 'data-personaje')) === 'yahui' && (await fr.textContent('#mapa-mundos')).includes('🔒'));
  await p.screenshot({ path: 'plataformas-390-mapa.png' });
  await fr.click('[data-mundo="6"]');
  ok('mapa: mundo 6 «Próximamente» con nodos bloqueados', (await fr.textContent('#mapa-aviso')).includes('Próximamente') && await fr.$eval('[data-nivel="6-1"]', x => x.disabled));
  await p.screenshot({ path: 'plataformas-390-mapa-proximamente.png' });
  await fr.click('[data-mundo="1"]');
  // ---- Diseño a 390 px: los 4 mundos y el jefe; el HUD y los botones no tapan el nivel ----
  ok('390: los 4 mundos y el jefe se dibujan', (await recorrerMundos(p, fr, 'plataformas-390')).length === 0);
  ok('390: los mundos se juegan con Yahui', (await fr.evaluate(() => window.__plat.estado().personaje)) === 'yahui');
  const hud = await fr.evaluate(() => {
    const c = document.getElementById('c').getBoundingClientRect(), e = window.__plat.estado(), esc = c.height / e.vh;
    return { hud: Math.round(document.getElementById('hud').getBoundingClientRect().bottom), nivel: Math.round(c.top + e.oy * esc), fin: Math.round(c.bottom), mandos: Math.round(document.querySelector('.mando').getBoundingClientRect().top), dibujoMs: +e.dibujoMs.toFixed(2) };
  });
  ok('390: el HUD queda sobre el cielo, fuera del nivel', hud.hud <= hud.nivel + 1, JSON.stringify(hud));
  // Con «🎮 Mando clásico» (por omisión, openspec: mando-arcade) el mando de Arcade reemplaza a los botones de antes.
  ok('390: el mando táctil queda debajo del juego', hud.mandos >= hud.fin - 1 && await fr.isVisible('.mando') && !(await fr.isVisible('#mandos')), JSON.stringify(hud));
  ok('390: dibujo por cuadro con margen para 60 fps', hud.dibujoMs > 0 && hud.dibujoMs < 8, hud.dibujoMs + ' ms');
  await p.click('[data-a="salir"]').catch(() => {});

  // ---- Escritorio ----
  const esc = await abrir(b, { width: 1280, height: 800 });
  await abrirJuego(esc, 'plataformas');
  const fe = await marcoDe(esc);
  await fe.waitForSelector('#ov-titulo:not(.hide)', { timeout: 30000 }); await fe.click('#b-jugar');
  await fe.waitForSelector('#ov-mapa:not(.hide)'); await fe.click('[data-nivel="1-2"]');
  await fe.waitForFunction(() => window.__plat.estado().modo === 'nivel');
  await caminar(fe, 1800);
  const ee = await fe.evaluate(() => window.__plat.estado());
  ok('escritorio: vista más ancha', ee.lw > 300, String(ee.lw));
  await esc.screenshot({ path: 'plataformas-escritorio.png' });
  ok('escritorio: sin botones táctiles ni mando', !(await fe.isVisible('#mandos')) && !(await fe.isVisible('.mando')));
  ok('escritorio: los 4 mundos y el jefe se dibujan', (await recorrerMundos(esc, fe, 'plataformas-escritorio')).length === 0);
  await fe.evaluate(() => window.__plat.alMapa());
  await fe.waitForSelector('#ov-mapa:not(.hide)');
  await esc.screenshot({ path: 'plataformas-escritorio-mapa.png' });
  await esc.click('[data-a="salir"]').catch(() => {});
  await esc.context().close();

  // ---- Personajes: cada uno se dibuja y termina un nivel; selector, errores y movimiento reducido ----
  await probarPersonajes(b);

  // ---- Partida en sala con bots ----
  const vAntes = (await progreso()).v;
  await p.click('[data-tab="partidas"]'); await p.waitForSelector('#f-crear');
  await p.selectOption('#p-juego', 'plataformas');
  ok('sala: selector de nivel', await p.isVisible('#p-mapa'));
  await p.selectOption('#p-mapa', '1-1');
  await p.click('#f-crear button[type=submit]'); await p.waitForSelector('[data-p="empezar"]', { timeout: 30000 });
  ok('sala de espera con los 2 bots', /BOT-VACHIRA/.test(await p.textContent('#p-body')) && /BOT-ISAGII/.test(await p.textContent('#p-body')));
  await p.click('[data-p="empezar"]');
  const fs = await marcoDe(p, '#p-body');
  await fs.waitForFunction(() => window.__plat && window.__plat.estado().sala && window.__plat.estado().nivel === '1-1', null, { timeout: 30000 });
  await fs.waitForFunction(() => document.getElementById('ov-sala').classList.contains('hide'), null, { timeout: 20000 });
  ok('sala: mismo nivel elegido (1-1) y tiempos a vencer', (await fs.textContent('#h-bots')).includes('BOT-VACHIRA'));
  ok('sala: juegas con tu personaje (Yahui)', (await fs.evaluate(() => window.__plat.estado().personaje)) === 'yahui');
  await p.screenshot({ path: 'plataformas-390-sala.png' });
  await sleep(6500);
  await fs.evaluate(() => window.__plat.irAMeta()); await caminar(fs, 1200);
  await p.waitForSelector('#p-body .result', { timeout: 30000 });
  await p.waitForFunction(() => /partidas|guardó/.test((document.getElementById('p-guardado') || {}).textContent || ''), null, { timeout: 20000 }).catch(() => {});
  const podio = await p.textContent('#p-body');
  ok('podio con bots y tiempos', /BOT-VACHIRA/.test(podio) && /BOT-ISAGII/.test(podio) && /Tiempos/.test(podio) && /\d:\d\d\.\d/.test(podio), podio.slice(0, 200));
  ok('podio: gana el mejor tiempo (Marisol primera)', await p.$eval('.arcade-tiempos tbody tr', tr => tr.textContent.includes('Marisol')));
  ok('puntos de sala en 👥 partidas', /a tus puntos de partidas/.test(await p.textContent('#p-guardado')), await p.textContent('#p-guardado'));
  ok('podio con «Otra con los mismos» (revancha)', !!(await p.waitForSelector('[data-p="revancha"]', { timeout: 15000 }).catch(() => null)));
  await p.screenshot({ path: 'plataformas-390-podio.png', fullPage: true });
  const vDespues = (await progreso()).v;
  ok('la partida no guarda progreso', vDespues === vAntes, vAntes + ' → ' + vDespues);

  await b.close();
  console.log(out.join('\n')); process.exit(out.some(x => x.startsWith('FAIL')) ? 1 : 0);
})().catch(e => { console.log(out.join('\n')); console.error('ERROR', e.message.slice(0, 400)); process.exit(2); });
