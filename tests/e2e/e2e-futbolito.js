// E2E: «⚽ Futbolito» (openspec: futbolito-billar).
// Catálogo en Arcade; individual contra el bot con TOQUES REALES (CDP Input.dispatchTouchEvent, hasTouch + isMobile):
// deslizar mueve la barra activa, un toque patea, la barra activa cambia sola; ganar a 5 suma ⭐ individuales.
// Horizontal 844×390 (deslizar vertical mueve la barra) y prefers-reduced-motion (sin confeti).
// Sala 1 persona + bot (tiro con toques reales, el bot tira, rendirse → podio y revancha) y sala de 2 personas
// (los dos aparatos ven el mismo estado tras cada tiro; podio en los dos). Capturas a 390 px y en horizontal.
require('./lib/entorno');
const { chromium } = require('playwright');
const { abrirPagina } = require('./lib/navegador');
const { contarMenu } = require('./lib/menu'); // conteo del menú (openspec: organizar-codigo)
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

async function crearSala(p, bots) {
  await p.click('[data-tab="partidas"]'); await p.waitForSelector('#f-crear');
  await p.selectOption('#p-juego', 'futbolito');
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
  const menu = await contarMenu(p), total = menu.tarjetas;
  ok('catálogo: el menú muestra todos los juegos de la página (con Futbolito y Billar)', menu.completo && total >= 26, String(total));
  const puntosAntes = await p.evaluate(() => state.totalIndividual);

  // ---- Individual con toques reales (390×844) ----
  await p.tap('[data-juego="futbolito"]');
  let fr = await marcoDe(p);
  await fr.waitForSelector('#ov-menu:not(.hide)', { timeout: 30000 });
  ok('individual: menú con 3 niveles y ayuda táctil', (await fr.$$('[data-nivel]')).length === 3 && /Desliza/.test(await fr.textContent('#ayuda-menu')));
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
  await tocar(p, c.x + c.width / 2, c.y + c.height * 0.8);
  await sleep(90);
  e = await estado(fr);
  ok('toque real: tocar patea y la pelota sale hacia la portería rival', e.pelota.vy < -200, JSON.stringify(e.pelota));
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
  const rinde = (await estado(f1)).miTurno ? [p, f1] : [a, f2];
  await esperar(rinde[1], () => window.__futbolito.estado().miTurno, null, 30000);
  await rinde[1].tap('#b-rendir');
  await p.waitForSelector('#p-body .result', { timeout: 30000 }); await a.waitForSelector('#p-body .result', { timeout: 30000 });
  await sleep(1000);
  const [pod1, pod2] = [await p.textContent('#p-body'), await a.textContent('#p-body')];
  ok('2 personas: podio en los dos con Marisol y Angel y la revancha', /Marisol/.test(pod1) && /Angel/.test(pod1) && /Marisol/.test(pod2) && /Angel/.test(pod2) && await a.isVisible('[data-p="revancha"]'));
  await a.screenshot({ path: 'futbolito-844-podio.png', fullPage: true });

  await b.close();
  console.log(out.join('\n')); process.exit(out.some(x => x.startsWith('FAIL')) ? 1 : 0);
})().catch(e => { console.log(out.join('\n')); console.error('ERROR', e.message.slice(0, 400)); process.exit(2); });
