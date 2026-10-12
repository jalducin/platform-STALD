// E2E Sprint 22 (openspec: juegos-categorias): primero la categoría y luego el juego, categoría recordada (✕, «Otros
// juegos», recarga, #cat= y Atrás), accesibilidad, diseño de 320 px a escritorio e íconos SVG de Blackjack y Dominó.
// No escribe puntos en el servidor: las partidas de prueba se responden con page.route.
require('./lib/entorno'); // BASE, API, DATOS, DATA, CHROME, carpeta de salida y sesión de prueba en fetch
const { chromium } = require('playwright');
const { abrirPagina } = require('./lib/navegador');
const { MENU, abrirCategoria, abrirJuego, irACategorias, contarMenu } = require('./lib/menu');
const out = []; const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const EMAIL = 'marisol@example.com';
const pagina = (b, o = {}) => abrirPagina(b, Object.assign({ email: EMAIL, viejo: true, tiempo: 0.05, out, etiqueta: o.etiqueta || '', dialogos: 'aceptar', ruta: '/juegos.html', esperar: MENU }, o));
const vista = p => p.$eval(MENU, x => x.dataset.menu);
const hash = p => p.evaluate(() => location.hash);
const foco = p => p.evaluate(() => (document.activeElement || {}).id || '');
// Partidas individuales falsas: el resultado se pinta sin guardar nada en el servidor.
async function partidaFalsa(p) {
  await p.route('**/juegos/partida', r => r.request().method() === 'POST'
    ? r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ guardado: true, puntos: 120, mejor: 120, nuevoRecord: true, totalIndividual: 120, totalPartidas: 0, pos: 1 }) })
    : r.continue());
}
// Columnas de una rejilla: posiciones x distintas de sus hijos.
const columnas = (p, sel) => p.$$eval(sel, xs => new Set(xs.map(x => Math.round(x.getBoundingClientRect().left))).size);
const desborde = p => p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
// Imagen cargada y alineada: naturalWidth > 0, alto entre min y max px.
const imgOk = (p, sel, min = 16, max = 80) => p.$eval(sel, (i, [a, z]) => i.tagName === 'IMG' && i.complete && i.naturalWidth > 0 && i.getBoundingClientRect().height >= a && i.getBoundingClientRect().height <= z && i.getAttribute('alt') === '', [min, max]).catch(() => false);
const esperarImg = (p, sel) => p.waitForFunction(s => { const i = document.querySelector(s); return i && i.complete; }, sel, { timeout: 10000 }).catch(() => {});

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME });

  // ---------- 1. Pantalla de categorías (390 px) ----------
  const p = await pagina(b, { etiqueta: '390' });
  ok('al entrar: pantalla de categorías, sin tarjetas de juego', (await vista(p)) === 'categorias' && (await p.$$('.game[data-juego]')).length === 0, await vista(p).catch(() => '¿sin menú?'));
  const cat = await p.evaluate(() => CATEGORIAS.filter(c => JUEGOS.some(j => j.cat === c.id)).map(c => ({ id: c.id, nombre: c.nombre, d: c.d, n: JUEGOS.filter(j => j.cat === c.id).length })));
  const tarjetas = await p.$$eval('[data-categoria]', xs => xs.map(x => ({ id: x.dataset.categoria, tag: x.tagName, texto: x.textContent.replace(/\s+/g, ' ').trim(), aria: x.getAttribute('aria-label') || '', n: Number(x.dataset.n) })));
  ok('categorías: 5 tarjetas en el orden del catálogo (Inglés, Cultura, Mente, Clásicos, Arcade)', JSON.stringify(tarjetas.map(t => t.id)) === JSON.stringify(cat.map(c => c.id)) && JSON.stringify(cat.map(c => c.id)) === JSON.stringify(['ingles', 'cultura', 'mente', 'clasicos', 'arcade']), tarjetas.map(t => t.id).join(','));
  ok('categorías: son <button>', tarjetas.length > 0 && tarjetas.every(t => t.tag === 'BUTTON'));
  const contenidoOk = cat.every(c => { const t = tarjetas.find(x => x.id === c.id); return t && c.nombre && c.d && t.texto.includes(c.nombre) && t.texto.includes(c.d) && t.texto.includes(c.n + ' juegos') && t.n === c.n; });
  ok('categorías: nombre, «N juegos» contado de JUEGOS y descripción corta', contenidoOk, tarjetas.map(t => t.texto.slice(0, 60)).join(' | '));
  ok('categorías: aria-label con el nombre y el número de juegos', cat.every(c => { const t = tarjetas.find(x => x.id === c.id); return t && t.aria.includes(c.nombre) && t.aria.includes(c.n + ' juegos'); }), tarjetas.map(t => t.aria).join(' | '));
  ok('categorías: encabezado «Elige una categoría»', /Elige una categoría/.test(await p.textContent('#menu-titulo')));
  // Conteo dinámico: un juego nuevo en el catálogo suma en su tarjeta sin tocar nada más.
  const dinamico = await p.evaluate(() => {
    JUEGOS.push({ id: 'prueba-nuevo', cat: 'arcade', emoji: '⛳', t: 'Juego nuevo', d: 'Solo para la prueba.', jugar: () => {} });
    pantallaHub('juegos'); const n = Number(document.querySelector('[data-categoria="arcade"]').dataset.n);
    JUEGOS.pop(); pantallaHub('juegos'); return { con: n, sin: Number(document.querySelector('[data-categoria="arcade"]').dataset.n) };
  });
  ok('categorías: el conteo sale del catálogo (un juego más en Arcade = uno más en su tarjeta)', dinamico.con === dinamico.sin + 1, JSON.stringify(dinamico));
  // Foco visible con el teclado.
  let enCat = false;
  for (let k = 0; k < 40 && !enCat; k++) { await p.keyboard.press('Tab'); enCat = await p.evaluate(() => !!(document.activeElement && document.activeElement.dataset.categoria)); }
  const contorno = await p.evaluate(() => { const s = getComputedStyle(document.activeElement); return { estilo: s.outlineStyle, ancho: parseFloat(s.outlineWidth) }; });
  ok('categorías: con Tab llega a una tarjeta y se ve el contorno de foco', enCat && contorno.estilo !== 'none' && contorno.ancho >= 2, JSON.stringify(contorno));
  ok('390 px: categorías en 2 columnas y sin desborde', (await columnas(p, '[data-categoria]')) === 2 && (await desborde(p)) <= 0, String(await columnas(p, '[data-categoria]')));
  await p.screenshot({ path: 'categorias-390.png', fullPage: true });

  // ---------- 2. Cada categoría con exactamente sus juegos ----------
  const m = await contarMenu(p);
  ok('cada categoría muestra exactamente sus juegos (mismo orden de JUEGOS) y la suma es JUEGOS.length', m.completo && m.tarjetas === m.juegos && m.secciones === cat.length, m.porCategoria.map(c => c.id + ':' + c.ids.length + '/' + c.n).join(' '));
  ok('cada lista lleva su encabezado con el nombre de la categoría', m.porCategoria.every(c => c.titulo.includes(cat.find(x => x.id === c.id).nombre)), m.porCategoria.map(c => c.titulo).join(' | '));

  // ---------- 3. Entrar, «← Categorías», foco y Atrás ----------
  await p.click('[data-categoria="clasicos"]'); await p.waitForSelector('[data-menu="clasicos"]');
  ok('Clásicos: solo sus juegos, encabezado «🎲 Clásicos» y botón «← Categorías»', (await p.$$eval('.game[data-juego]', xs => xs.every(x => x.classList.contains('cat-clasicos')))) && /🎲 Clásicos/.test(await p.textContent('#menu-titulo')) && /← Categorías/.test(await p.textContent('[data-a="categorias"]')));
  ok('Clásicos: la URL lleva #cat=clasicos y el foco pasa al encabezado', (await hash(p)) === '#cat=clasicos' && (await foco(p)) === 'menu-titulo', (await hash(p)) + ' ' + (await foco(p)));
  await p.screenshot({ path: 'clasicos-390.png', fullPage: true });
  await p.click('[data-a="categorias"]'); await p.waitForSelector('[data-menu="categorias"]');
  ok('«← Categorías»: regresa a las categorías, sin #cat= y con el foco en el encabezado', (await hash(p)) === '' && (await foco(p)) === 'menu-titulo', (await hash(p)) + ' ' + (await foco(p)));
  await p.click('[data-categoria="arcade"]'); await p.waitForSelector('[data-menu="arcade"]');
  await p.goBack(); await p.waitForSelector('[data-menu="categorias"]', { timeout: 5000 }).catch(() => {});
  ok('Atrás (celular): de la lista de Arcade a las categorías, sin salir de Juegos', (await vista(p).catch(() => '')) === 'categorias' && /juegos\.html/.test(p.url()) && (await foco(p)) === 'menu-titulo', p.url());
  await p.goForward(); await p.waitForSelector('[data-menu="arcade"]', { timeout: 5000 }).catch(() => {});
  ok('Adelante: vuelve a la lista de Arcade', (await vista(p).catch(() => '')) === 'arcade');

  // ---------- 4. Volver de un juego a la misma categoría ----------
  await partidaFalsa(p);
  await abrirJuego(p, 'mente-calculo'); await p.waitForSelector('[data-a="salir"]');
  await p.click('[data-a="salir"]'); await p.waitForSelector(MENU);
  ok('✕ en un juego de Mente ágil: regresa a la lista de Mente ágil', (await vista(p)) === 'mente' && (await hash(p)) === '#cat=mente', (await vista(p)) + ' ' + (await hash(p)));
  await abrirJuego(p, 'mente-calculo');
  const t0 = Date.now(); while (!(await p.$('.result .score')) && Date.now() - t0 < 60000) { const o = await p.$('.opt:not(.ok):not(.bad)'); if (o) await o.click().catch(() => {}); await sleep(120); }
  await p.waitForFunction(() => /a tus individuales/.test((document.querySelector('.result') || {}).textContent || ''), null, { timeout: 30000 }).catch(() => {});
  await p.click('[data-a="hub"]'); await p.waitForSelector(MENU);
  ok('«🎮 Otros juegos» tras el resultado: regresa a Mente ágil con la ⭐ del mejor en la tarjeta', (await vista(p)) === 'mente' && /⭐ 120/.test(await p.textContent('.game[data-juego="mente-calculo"]')), await p.textContent('.game[data-juego="mente-calculo"]').catch(() => ''));
  await p.goBack(); await p.waitForSelector('[data-menu="categorias"]', { timeout: 5000 }).catch(() => {});
  ok('Atrás tras volver de un juego: llega a las categorías (siempre hay una entrada de categorías debajo)', (await vista(p).catch(() => '')) === 'categorias' && /juegos\.html/.test(p.url()), p.url());
  // Recarga en una categoría: se queda ahí y Atrás sigue llevando a las categorías.
  await abrirCategoria(p, 'cultura'); await p.reload(); await p.waitForSelector(MENU, { timeout: 60000 });
  ok('recarga con #cat=cultura: abre en Cultura y Conocimiento', (await vista(p)) === 'cultura');
  await p.goBack(); await p.waitForSelector('[data-menu="categorias"]', { timeout: 5000 }).catch(() => {});
  ok('Atrás tras recargar: categorías', (await vista(p).catch(() => '')) === 'categorias');
  // Pestañas: Partidas y Ranking igual; al volver a 🎮 Juegos sigue la categoría abierta.
  await abrirCategoria(p, 'arcade');
  await p.click('[data-tab="partidas"]'); await p.waitForSelector('#p-juego');
  const opciones = await p.$$eval('#p-juego option', os => Object.fromEntries(os.map(o => [o.value, o.textContent])));
  ok('Partidas: sin cambios (formulario de crear) y respaldo en texto ♣️ Blackjack y 🔳 Dominó', !!(await p.$('#f-crear')) && opciones.blackjack === '♣️ Blackjack (21)' && opciones.domino === '🔳 Dominó', opciones.blackjack + ' / ' + opciones.domino);
  await p.click('[data-tab="ranking"]'); await p.waitForSelector('[data-rtipo]');
  await p.click('[data-tab="juegos"]'); await p.waitForSelector(MENU);
  ok('pestaña 🎮 Juegos: regresa a la categoría abierta (Arcade)', (await vista(p)) === 'arcade');
  // Recordada en la pestaña del navegador: una URL sin #cat= abre la última categoría.
  await p.goto(p.url().split('#')[0]); await p.waitForSelector(MENU, { timeout: 60000 });
  ok('sessionStorage: abrir juegos.html sin #cat= recuerda Arcade', (await vista(p)) === 'arcade' && (await p.evaluate(() => sessionStorage.getItem('juegos_categoria'))) === 'arcade');
  await irACategorias(p);
  ok('sessionStorage: al volver a las categorías se olvida', (await p.evaluate(() => sessionStorage.getItem('juegos_categoria'))) === null);

  // ---------- 5. Íconos de Blackjack y Dominó ----------
  await abrirCategoria(p, 'clasicos');
  for (const id of ['blackjack', 'domino']) await esperarImg(p, '.game[data-juego="' + id + '"] img.ico-img');
  ok('tarjetas: Blackjack y Dominó con <img> SVG cargada (naturalWidth > 0)', (await imgOk(p, '.game[data-juego="blackjack"] .ico img.ico-img')) && (await imgOk(p, '.game[data-juego="domino"] .ico img.ico-img')));
  ok('tarjetas: src de juegos/iconos/', /juegos\/iconos\/blackjack\.svg$/.test(await p.getAttribute('.game[data-juego="blackjack"] img', 'src')) && /juegos\/iconos\/domino\.svg$/.test(await p.getAttribute('.game[data-juego="domino"] img', 'src')));
  // Alineado con los emojis: mismo centro que la caja .ico y alto parecido al emoji de Póker.
  const alin = await p.evaluate(() => {
    const caja = s => document.querySelector(s).getBoundingClientRect();
    const r = id => { const i = caja('.game[data-juego="' + id + '"] .ico img'), c = caja('.game[data-juego="' + id + '"] .ico'); return { dx: Math.abs(i.left + i.width / 2 - (c.left + c.width / 2)), dy: Math.abs(i.top + i.height / 2 - (c.top + c.height / 2)), h: i.height, caja: c.height }; };
    const rango = document.createRange(); rango.selectNodeContents(document.querySelector('.game[data-juego="poker"] .ico'));
    return { bj: r('blackjack'), dm: r('domino'), emoji: rango.getBoundingClientRect().height };
  });
  ok('tarjetas: el ícono queda centrado en su caja y del tamaño de los emojis', [alin.bj, alin.dm].every(x => x.dx <= 2 && x.dy <= 2 && Math.abs(x.h - alin.emoji) <= 8 && x.h < x.caja), JSON.stringify(alin));
  await p.$eval('.game[data-juego="blackjack"]', e => e.scrollIntoView({ block: 'center' }));
  await p.screenshot({ path: 'iconos-clasicos-390.png' });
  await p.locator('.game[data-juego="blackjack"]').screenshot({ path: 'icono-blackjack-tarjeta.png' });
  await p.locator('.game[data-juego="domino"]').screenshot({ path: 'icono-domino-tarjeta.png' });
  // Barra del juego y portada.
  await abrirJuego(p, 'blackjack'); await p.waitForSelector('[data-bj-go]');
  await esperarImg(p, '.play-top .t img.ico-img'); await esperarImg(p, '.q-card .big img.ico-img');
  ok('Blackjack: ícono en la barra del juego y en la portada', (await imgOk(p, '.play-top .t img.ico-img')) && (await imgOk(p, '.q-card .big img.ico-img', 30, 120)));
  await p.screenshot({ path: 'icono-blackjack-portada.png' });
  await p.click('[data-a="salir"]'); await p.waitForSelector('[data-menu="clasicos"]');
  await abrirJuego(p, 'domino'); await p.waitForSelector('[data-tb-go]');
  await esperarImg(p, '.play-top .t img.ico-img'); await esperarImg(p, '.q-card .big img.ico-img');
  ok('Dominó: ícono en la barra del juego y en la portada', (await imgOk(p, '.play-top .t img.ico-img')) && (await imgOk(p, '.q-card .big img.ico-img', 30, 120)));
  await p.screenshot({ path: 'icono-domino-portada.png' });
  await p.click('[data-a="salir"]'); await p.waitForSelector('[data-menu="clasicos"]');
  // Pantalla de resultado (partida falsa) y «¿Continuar tu partida?».
  await p.evaluate(() => terminar('blackjack', { puntos: 500, titulo: 'Fin de la partida' }));
  await p.waitForSelector('.result .score'); await esperarImg(p, '.result img.ico-img');
  ok('resultado: ícono de Blackjack en imagen', await imgOk(p, '.result img.ico-img', 30, 80));
  await p.screenshot({ path: 'icono-blackjack-resultado.png' });
  await p.click('[data-a="hub"]'); await p.waitForSelector('[data-menu="clasicos"]');
  // 🔥 Ranking de juegos (respuesta de prueba con los dos juegos).
  await p.route('**/juegos/ranking/juegos*', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ semana: '2026-10-05', juegos: [{ id: 'blackjack', titulo: 'Blackjack (21)', pos: 1, jugadores: 3, partidas: 5 }, { id: 'domino', titulo: 'Dominó', pos: 2, jugadores: 2, partidas: 2 }, { id: 'poker', titulo: 'Póker', pos: 3, jugadores: 1, partidas: 1 }] }) }));
  await p.click('[data-tab="ranking"]'); await p.click('[data-rtipo="juegos"]'); await p.waitForSelector('#rank-juegos');
  await esperarImg(p, '[data-rj="blackjack"] img.ico-img'); await esperarImg(p, '[data-rj="domino"] img.ico-img');
  ok('🔥 ranking de juegos: Blackjack y Dominó en imagen; Póker con su emoji', (await imgOk(p, '[data-rj="blackjack"] .rj-ico img.ico-img')) && (await imgOk(p, '[data-rj="domino"] .rj-ico img.ico-img')) && (await p.textContent('[data-rj="poker"] .rj-ico')).includes('♠️'));
  await p.screenshot({ path: 'icono-ranking-juegos.png' });
  await p.unroute('**/juegos/ranking/juegos*');
  // Ningún texto de la página usa 🂡 ni 🁫 (catálogo, ayudas y mensajes).
  const viejos = await p.evaluate(() => {
    const textos = [document.body.innerHTML, JSON.stringify(JUEGOS.map(j => [j.emoji, j.t])), AYUDA_GRANDES.blackjack || '', TableroUI.ayuda('domino') || '', TableroUI.faltan('domino') || ''];
    return textos.filter(t => /🂡|🁫/u.test(t)).length;
  });
  ok('sin 🂡 ni 🁫 en la página, el catálogo ni las ayudas', viejos === 0, String(viejos));
  ok('respaldo en texto: ♣️ y 🔳 no los usa otro juego', await p.evaluate(() => JUEGOS.filter(j => j.emoji === '♣️').length === 1 && JUEGOS.filter(j => j.emoji === '🔳').length === 1));
  await p.context().close();

  // ---------- 6. Enlaces directos y casos de error ----------
  const d = await pagina(b, { ruta: '/juegos.html#cat=arcade', etiqueta: 'enlace' });
  ok('enlace con #cat=arcade: abre directo la lista de Arcade', (await vista(d)) === 'arcade' && (await d.$$('.game.cat-arcade[data-juego]')).length >= 3);
  await d.goBack(); await d.waitForSelector('[data-menu="categorias"]', { timeout: 5000 }).catch(() => {});
  ok('enlace con #cat=arcade: Atrás lleva a las categorías', (await vista(d).catch(() => '')) === 'categorias');
  await d.context().close();
  const inv = await pagina(b, { ruta: '/juegos.html#cat=no-existe', etiqueta: 'inválida' });
  ok('#cat= de una categoría que no existe: pantalla de categorías, sin errores', (await vista(inv)) === 'categorias');
  await inv.context().close();
  const bloq = await pagina(b, { etiqueta: 'sin almacenamiento', init: [() => { Object.defineProperty(window, 'sessionStorage', { configurable: true, get() { throw new Error('bloqueado'); } }); }] });
  await abrirCategoria(bloq, 'mente'); await abrirJuego(bloq, 'mente-sudoku'); await bloq.waitForSelector('[data-a="salir"]');
  await bloq.click('[data-a="salir"]'); await bloq.waitForSelector(MENU);
  ok('sessionStorage bloqueado: categorías, juego y regreso a la misma categoría funcionan', (await vista(bloq)) === 'mente');
  await bloq.reload(); await bloq.waitForSelector(MENU, { timeout: 60000 });
  ok('sessionStorage bloqueado: al recargar, la categoría sale de la URL', (await vista(bloq)) === 'mente');
  await bloq.context().close();
  const red = await pagina(b, { etiqueta: 'movimiento', contexto: { reducedMotion: 'reduce' } });
  const mov = await red.$eval('[data-categoria="ingles"]', x => { const s = getComputedStyle(x); return s.transitionDuration.split(',').every(t => parseFloat(t) === 0); });
  ok('prefers-reduced-motion: las tarjetas no se animan', mov);
  await red.context().close();

  // ---------- 7. Diseño a 320, 844×390 y escritorio ----------
  for (const [nombre, viewport, cols] of [['320', { width: 320, height: 640 }, 1], ['844x390', { width: 844, height: 390 }, 3], ['1280', { width: 1280, height: 800 }, 3]]) {
    const q = await pagina(b, { viewport, etiqueta: nombre });
    const c = await columnas(q, '[data-categoria]'), dz = await desborde(q);
    const recortes = await q.$$eval('[data-categoria]', xs => xs.filter(x => x.scrollWidth > x.clientWidth + 1).length);
    ok(nombre + ': categorías en ' + cols + ' columna(s), sin desborde ni texto recortado', c === cols && dz <= 0 && recortes === 0, 'columnas=' + c + ' desborde=' + dz + ' recortes=' + recortes);
    await q.screenshot({ path: 'categorias-' + nombre + '.png', fullPage: true });
    await abrirCategoria(q, 'clasicos');
    for (const id of ['blackjack', 'domino']) await esperarImg(q, '.game[data-juego="' + id + '"] img.ico-img');
    ok(nombre + ': lista de Clásicos sin desborde y con «← Categorías» a la vista', (await desborde(q)) <= 0 && await q.isVisible('[data-a="categorias"]'));
    ok(nombre + ': íconos de Blackjack y Dominó cargados', (await imgOk(q, '.game[data-juego="blackjack"] img.ico-img')) && (await imgOk(q, '.game[data-juego="domino"] img.ico-img')));
    await q.screenshot({ path: 'clasicos-' + nombre + '.png', fullPage: true });
    await q.context().close();
  }

  await b.close();
  console.log(out.join('\n'));
  process.exit(out.some(x => x.startsWith('FAIL')) ? 1 : 0);
})().catch(e => { console.log(out.join('\n')); console.log('ERROR', e.message); process.exit(1); });
