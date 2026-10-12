// Menú de juegos.html (openspec: organizar-codigo; navegación por categorías desde juegos-categorias).
// La pestaña 🎮 Juegos abre en las tarjetas de categoría ([data-categoria]) y, al tocar una, muestra solo sus juegos
// (.game[data-juego]). `[data-menu]` existe en las dos vistas: "categorias" o el id de la categoría abierta.
// `JUEGOS` y `CATEGORIAS` son globales de juegos/app/menu.js.
//
//   const { esperarMenu, abrirJuego, abrirCategoria, recorrerMenu, contarMenu, MENU } = require('./lib/menu');
//   const p = await abrirPagina(b, { …, ruta: '/juegos.html', esperar: MENU });
//   await abrirJuego(p, 'poker');                 // abre la categoría del juego (si hace falta) y toca su tarjeta
//   await abrirJuego(p, 'karts', { tap: true });  // con toque (contextos táctiles)
//   const m = await contarMenu(p);                // entra a cada categoría y cuenta
//   ok('menú completo', m.completo && m.tarjetas >= 39, String(m.tarjetas));
const MENU = '[data-menu]';

const tocar = (p, sel, tap) => (tap ? p.tap(sel) : p.click(sel));

// Espera a que el hub pinte el menú (cualquiera de las dos vistas).
const esperarMenu = (p, opciones = {}) => p.waitForSelector(MENU, { timeout: 60000, ...opciones });

// Lleva a la pantalla de categorías con «← Categorías» (si ya está ahí, no hace nada).
async function irACategorias(p, { tap } = {}) {
  await esperarMenu(p);
  if (await p.$('[data-menu="categorias"]')) return;
  await tocar(p, '[data-a="categorias"]', tap);
  await p.waitForSelector('[data-menu="categorias"]');
}

// Abre la categoría `cat` (si ya está abierta, no hace nada).
async function abrirCategoria(p, cat, { tap } = {}) {
  await esperarMenu(p);
  if (await p.$('[data-menu="' + cat + '"]')) return;
  await irACategorias(p, { tap });
  await tocar(p, '[data-categoria="' + cat + '"]', tap);
  await p.waitForSelector('[data-menu="' + cat + '"]');
}

// Categoría de un juego según el catálogo de la página.
async function categoriaDe(p, id) {
  const cat = await p.evaluate(i => { const j = JUEGOS.find(x => x.id === i); return j ? j.cat : null; }, id);
  if (!cat) throw new Error('juego desconocido en JUEGOS: ' + id);
  return cat;
}

// Abre la categoría del juego y toca su tarjeta del menú.
async function abrirJuego(p, id, { tap } = {}) {
  await abrirCategoria(p, await categoriaDe(p, id), { tap });
  await tocar(p, '.game[data-juego="' + id + '"]', tap);
}

// Texto de la tarjeta de un juego en el menú (abre su categoría).
async function textoTarjeta(p, id) {
  await abrirCategoria(p, await categoriaDe(p, id));
  return p.textContent('.game[data-juego="' + id + '"]');
}

// Entra a cada categoría en orden y devuelve [{ id, titulo, n, ids, clases }]:
//   n       número que dice la tarjeta de la categoría
//   titulo  encabezado de la lista
//   ids     data-juego de las tarjetas de la lista, en orden
//   clases  true si todas las tarjetas llevan la clase de su categoría (cat-<id>)
// Termina en la pantalla de categorías.
async function recorrerMenu(p) {
  await irACategorias(p);
  const cats = await p.$$eval('[data-categoria]', xs => xs.map(x => ({ id: x.dataset.categoria, n: Number(x.dataset.n) })));
  const res = [];
  for (const c of cats) {
    await abrirCategoria(p, c.id);
    const titulo = (await p.textContent('#menu-titulo')).trim();
    const ids = await p.$$eval('#menu-juegos .game[data-juego]', xs => xs.map(x => x.dataset.juego));
    const clases = await p.$$eval('#menu-juegos .game[data-juego]', (xs, cat) => xs.every(x => x.classList.contains('cat-' + cat)), c.id);
    res.push({ id: c.id, titulo, n: c.n, ids, clases });
    await irACategorias(p);
  }
  return res;
}

// Conteo del menú (openspec: organizar-codigo) sobre las categorías. Devuelve:
//   ids         data-juego de todas las tarjetas, categoría por categoría
//   tarjetas    cuántas tarjetas hay sumando las categorías
//   juegos      JUEGOS.length de la página
//   secciones   cuántas tarjetas de categoría pinta el hub
//   categorias  CATEGORIAS.length de la página
//   porCategoria  [{ id, titulo, n, ids, clases }] (ver recorrerMenu)
//   completo    el hub pinta todo el catálogo: cada categoría muestra exactamente sus juegos de JUEGOS (mismo orden),
//               el número de su tarjeta coincide y la suma es JUEGOS.length
async function contarMenu(p) {
  const porCategoria = await recorrerMenu(p);
  const { juegos, categorias, esperado } = await p.evaluate(() => ({
    juegos: JUEGOS.length, categorias: CATEGORIAS.length,
    esperado: Object.fromEntries(CATEGORIAS.map(c => [c.id, JUEGOS.filter(j => j.cat === c.id).map(j => j.id)])),
  }));
  const ids = porCategoria.flatMap(c => c.ids);
  const exactas = porCategoria.every(c => c.clases && c.n === c.ids.length && JSON.stringify(c.ids) === JSON.stringify(esperado[c.id] || []));
  return { ids, tarjetas: ids.length, juegos, secciones: porCategoria.length, categorias, porCategoria, completo: exactas && ids.length === juegos };
}

module.exports = { MENU, esperarMenu, irACategorias, abrirCategoria, abrirJuego, textoTarjeta, recorrerMenu, contarMenu };
