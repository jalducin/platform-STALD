// Conteo del menú de juegos.html (openspec: organizar-codigo). Un solo lugar para comparar lo que pinta el hub con el
// catálogo de la página (`JUEGOS` y `CATEGORIAS` son globales de juegos/app/menu.js).
//
//   const { contarMenu } = require('./lib/menu');
//   const m = await contarMenu(p);   // p: página de juegos.html con el hub ya pintado ([data-juego])
//   ok('menú completo', m.completo && m.tarjetas >= 39, String(m.tarjetas));
//
// Devuelve:
//   ids         data-juego de cada tarjeta, en orden
//   tarjetas    cuántas tarjetas pinta el hub
//   juegos      JUEGOS.length de la página
//   secciones   cuántas secciones (main h2) pinta el hub
//   categorias  CATEGORIAS.length de la página
//   completo    tarjetas === juegos (el hub pinta todo el catálogo)
async function contarMenu(p) {
  const ids = await p.$$eval('[data-juego]', xs => xs.map(x => x.dataset.juego));
  const secciones = (await p.$$('main h2')).length;
  const { juegos, categorias } = await p.evaluate(() => ({ juegos: JUEGOS.length, categorias: CATEGORIAS.length }));
  return { ids, tarjetas: ids.length, juegos, secciones, categorias, completo: ids.length === juegos };
}

module.exports = { contarMenu };
