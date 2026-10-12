// E2E: «🎱 Billar» (openspec: futbolito-billar).
// Catálogo en Arcade; individual contra el bot con TOQUES REALES (CDP Input.dispatchTouchEvent, hasTouch + isMobile):
// arrastrar apunta (línea guía hacia el dedo), jalar desde la blanca como resortera tira con fuerza proporcional,
// botón de efecto, el bot tira en su turno, meter la 8 al final gana y suma ⭐ individuales. Horizontal 844×390.
// Sala 1 persona + bot (rompe con resortera, rendirse → podio y revancha) y sala de 2 personas (los dos aparatos
// reproducen igual cada tiro; podio en los dos). Capturas a 390 px y en horizontal.
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
