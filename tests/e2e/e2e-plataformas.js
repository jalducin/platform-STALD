// E2E: «Axo y los 12 mundos» (openspec: juegos-plataformas-karts).
// Catálogo Arcade, jugar el 1-1 (moverse con el teclado y llegar a la meta), puntos en ⭐ individuales, progreso
// guardado en el servidor y recuperado tras recargar, y partida en sala con bots: podio por tiempo sin tocar el
// progreso. Capturas a 390 px y en escritorio. Usa ?arcadePrueba=1 (ganchos window.__plat dentro del juego).
// Diseño (openspec: axo-diseno): capturas de cada mundo, del jefe y del mapa; el HUD no tapa el nivel a 390 px.
require('./lib/entorno'); // BASE, API, CHROME, carpeta de salida y sesión de prueba en fetch
const { chromium } = require('playwright');
const { abrirPagina } = require('./lib/navegador');
const API = process.env.API;
const out = []; const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const EMAIL = 'marisol@example.com';
const progreso = async () => (await fetch(API + '/juegos/progreso/plataformas?email=' + encodeURIComponent(EMAIL))).json();
const abrir = (b, viewport) => abrirPagina(b, { email: EMAIL, viejo: true, viewport, out, ruta: '/juegos.html?arcadePrueba=1', esperar: '[data-juego="plataformas"]' });
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

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME });
  const p = await abrir(b);
  // ---- Catálogo ----
  const tarjeta = await p.textContent('[data-juego="plataformas"]');
  ok('catálogo: categoría 🕹️ Arcade', (await p.textContent('#tab-body')).includes('🕹️ Arcade'));
  ok('catálogo: tarjeta con ícono y descripción', tarjeta.includes('🦎') && tarjeta.includes('Axo y los 12 mundos') && tarjeta.includes('vence al jefe'), tarjeta);
  const antes = await progreso();
  ok('sin avance al empezar', antes.v === 0 && antes.datos === null, JSON.stringify(antes));
  const puntosAntes = await p.evaluate(() => state.totalIndividual);

  // ---- Jugar el 1-1 ----
  await p.click('[data-juego="plataformas"]');
  let fr = await marcoDe(p);
  await fr.waitForSelector('#ov-titulo:not(.hide)', { timeout: 30000 });
  await fr.click('#b-jugar'); await fr.waitForSelector('#ov-mapa:not(.hide)');
  ok('mapa: 12 mundos y el 1-2 bloqueado', (await fr.textContent('#mapa-num')).includes('/ 12') && await fr.$eval('[data-nivel="1-2"]', x => x.disabled));
  await fr.click('[data-nivel="1-1"]');
  await fr.waitForFunction(() => window.__plat.estado().modo === 'nivel');
  const x0 = (await fr.evaluate(() => window.__plat.estado())).x;
  await caminar(fr, 1200);
  const e1 = await fr.evaluate(() => window.__plat.estado());
  ok('Axo camina con el teclado', e1.x > x0 + 60, x0 + ' → ' + e1.x);
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

  // ---- Recargar y continuar ----
  await p.reload(); await p.waitForSelector('[data-juego="plataformas"]', { timeout: 60000 });
  ok('recargar no deja el juego abierto', !(await p.$('#arcade-frame')));
  await p.click('[data-juego="plataformas"]');
  fr = await marcoDe(p);
  await fr.waitForSelector('#ov-titulo:not(.hide)', { timeout: 30000 }); await fr.click('#b-jugar');
  await fr.waitForSelector('#ov-mapa:not(.hide)');
  const hecho = await fr.$eval('[data-nivel="1-1"]', x => x.classList.contains('hecho'));
  const abierto = await fr.$eval('[data-nivel="1-2"]', x => !x.disabled);
  const stats = await fr.textContent('#mapa-stats');
  ok('tras recargar: 1-1 superado, 1-2 abierto, mismas vidas y monedas', hecho && abierto && stats.includes('❤️ 6') && stats.includes('🪙 3'), stats);
  ok('mapa: escena ilustrada, Axo en el nivel que sigue y candados en «Próximamente»', await fr.$('#mapa-svg svg') !== null && await fr.$('.marca img') !== null && (await fr.textContent('#mapa-mundos')).includes('🔒'));
  await p.screenshot({ path: 'plataformas-390-mapa.png' });
  await fr.click('[data-mundo="6"]');
  ok('mapa: mundo 6 «Próximamente» con nodos bloqueados', (await fr.textContent('#mapa-aviso')).includes('Próximamente') && await fr.$eval('[data-nivel="6-1"]', x => x.disabled));
  await p.screenshot({ path: 'plataformas-390-mapa-proximamente.png' });
  await fr.click('[data-mundo="1"]');
  // ---- Diseño a 390 px: los 4 mundos y el jefe; el HUD y los botones no tapan el nivel ----
  ok('390: los 4 mundos y el jefe se dibujan', (await recorrerMundos(p, fr, 'plataformas-390')).length === 0);
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
  await esc.click('[data-juego="plataformas"]');
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
