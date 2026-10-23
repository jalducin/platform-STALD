// Juegos · carga perezosa (openspec: juegos-carga-perezosa).
// juegos.html carga solo el núcleo del hub; el código de cada juego (motores de juegos/ y pantallas de juegos/app/) se
// inyecta al elegirlo, por paquetes. Script clásico (sin build ni módulos ES): va después de nucleo.js (usa app y
// escapeHtml) y antes de menu.js y arranque.js. Ver docs/frontend-standards.md, «Carga perezosa de Juegos».

// Archivos de juego con su ?v=, en el orden de dependencias que tenían en juegos.html (las dependencias al cargar van
// antes). Es la única fuente de su versión: al cambiar uno, sube aquí su ?v= (y el de cargador.js en juegos.html).
const ARCHIVOS_JUEGO = [
  'juegos/tablero.css?v=1', 'juegos/clasicos-rapidos.css?v=1',
  'juegos/cartas.js?v=4', 'juegos/mesas.js?v=8', 'juegos/fisica.js?v=3', 'juegos/futbolito-motor.js?v=3', 'juegos/arena-motor.js?v=1',
  'juegos/tablero.js?v=2', 'juegos/tablero-ui.js?v=7', 'juegos/ajedrez.js?v=2', 'juegos/clasicos-rapidos.js?v=2', 'juegos/clasicos-rapidos-ui.js?v=4',
  'juegos/karts-pistas.js?v=9', 'juegos/arcade.js?v=8', 'juegos/karts-copa.js?v=5', 'juegos/personajes.js?v=3', 'juegos/karts-ceremonia.js?v=1',
  'juegos/ingles-gramatica.js?v=3', 'juegos/salas-grandes.js?v=3', 'juegos/bingo.js?v=3', 'juegos/blackjack.js?v=4', 'juegos/dibuja.js?v=2',
  'juegos/memo-sopa-sala.js?v=2', 'juegos/linea-tiempo.js?v=3', 'juegos/basta.js?v=2', 'juegos/una.js?v=1', 'juegos/en-vivo.js?v=2',
  'juegos/app/individuales.js?v=5', 'juegos/app/arcade.js?v=17', 'juegos/app/brigada-sala.js?v=2', 'juegos/app/mente.js?v=2',
  'juegos/app/clasicos.js?v=2', 'juegos/app/naipes.js?v=4', 'juegos/reloj-sala.js?v=1', 'juegos/app/salas.js?v=18', 'juegos/app/salas-mesa.js?v=3',
];
// Paquetes: archivos (sin ?v=) u otros paquetes. Cada uno incluye lo que sus archivos usan al cargar; «todo» es lo que
// necesitan las salas (atienden a cualquier juego). Ver la tabla en el design.md del cambio.
const PAQUETES = {
  marco: ['juegos/app/individuales.js'], // marco, reloj, terminar y los juegos individuales de Inglés, Cultura y Mente
  ingles: ['marco', 'juegos/ingles-gramatica.js'],
  linea: ['marco', 'juegos/linea-tiempo.js'],
  mente: ['marco', 'juegos/ajedrez.js', 'juegos/app/mente.js'],
  clasicos: ['marco', 'juegos/basta.js', 'juegos/una.js', 'juegos/app/clasicos.js'],
  naipes: ['marco', 'juegos/cartas.js', 'juegos/app/naipes.js'],
  tablero: ['marco', 'juegos/tablero.css', 'juegos/tablero.js', 'juegos/tablero-ui.js'],
  rapidos: ['marco', 'juegos/clasicos-rapidos.css', 'juegos/clasicos-rapidos.js', 'juegos/clasicos-rapidos-ui.js'],
  arcade: ['marco', 'juegos/app/arcade.js'],
  // Los 4 de salas grandes siempre juntos: salas.js arma «Crear partida» con Object.keys(SALAS_GRANDES), en su orden.
  grandes: ['naipes', 'juegos/salas-grandes.js', 'juegos/bingo.js', 'juegos/blackjack.js', 'juegos/dibuja.js', 'juegos/memo-sopa-sala.js'],
  todo: ARCHIVOS_JUEGO.map(r => r.split('?')[0]),
};
// Paquete de cada juego de JUEGOS (y de los retirados). Un id que no esté aquí carga «todo».
const PAQUETE_DE_JUEGO = {};
for (const [paquete, ids] of Object.entries({
  marco: ['en-vocab', 'en-spelling', 'en-memorama', 'cultura', 'es-ortografia', 'es-ordena', 'mente-calculo', 'mente-simon', 'mente-sopa'],
  ingles: ['en-frases', 'en-ordena', 'en-tiempos'],
  linea: ['cultura-linea'],
  mente: ['mente-sudoku', 'ajedrez'],
  clasicos: ['basta-es', 'basta-en', 'una', 'loteria'],
  naipes: ['poker', 'brisca', 'conquian'],
  tablero: ['damas', 'naval', 'domino', 'parchis'],
  rapidos: ['gato', 'conecta4', 'ppt', 'ahorcado', 'serpientes'],
  arcade: ['plataformas', 'karts', 'dragon-run', 'futbol', 'futbolito-arena', 'billar', 'brigada', 'golf', 'futbolito'],
  grandes: ['bingo', 'blackjack'],
  todo: ['dibuja'], // su «👥 Crear partida» abre Partidas con el juego ya elegido, en el mismo turno
})) ids.forEach(id => { PAQUETE_DE_JUEGO[id] = paquete; });
const paqueteDe = id => PAQUETE_DE_JUEGO[id] || 'todo';

// Archivos de un paquete, sin repetir y en el orden de ARCHIVOS_JUEGO (con su ?v=).
function archivosDe(nombre) {
  const nombres = new Set();
  const expandir = n => { if (PAQUETES[n]) PAQUETES[n].forEach(expandir); else nombres.add(n); };
  expandir(nombre);
  return ARCHIVOS_JUEGO.filter(r => nombres.has(r.split('?')[0]));
}

// Promesa de cada archivo (ruta con ?v=): un archivo nunca se inyecta dos veces. Si falla, se olvida para reintentar.
const cargas = {};
const esCss = ruta => ruta.split('?')[0].endsWith('.css');
const archivoListo = ruta => !!(cargas[ruta] && cargas[ruta].listo);
const paqueteListo = nombre => archivosDe(nombre).every(archivoListo);
const errorCarga = () => new Error('juego_sin_cargar');

// Misma cascada de antes: tablero.css antes de juegos/app/juegos.css y clasicos-rapidos.css justo después.
const CSS_ANTES_DE_JUEGOS = new Set(['juegos/tablero.css']);
function cargarEstilo(ruta) {
  return new Promise((ok, mal) => {
    const l = document.createElement('link');
    l.rel = 'stylesheet'; l.href = ruta;
    l.onload = () => ok();
    l.onerror = () => { l.remove(); mal(errorCarga()); };
    const base = document.querySelector('link[href^="juegos/app/juegos.css"]');
    if (!base) document.head.appendChild(l);
    else if (CSS_ANTES_DE_JUEGOS.has(ruta.split('?')[0])) base.before(l);
    else base.after(l);
  });
}
// Descarga en paralelo (una sola petición por archivo; el <script> la toma del preload).
function precargar(ruta) {
  const l = document.createElement('link');
  l.rel = 'preload'; l.as = 'script'; l.href = ruta; l.dataset.precarga = ruta;
  document.head.appendChild(l);
}
const quitarPrecarga = ruta => document.querySelectorAll('link[rel="preload"]').forEach(l => { if (l.dataset.precarga === ruta) l.remove(); });
function ejecutarScript(ruta) {
  return new Promise((ok, mal) => {
    const s = document.createElement('script');
    s.src = ruta; s.async = false;
    s.onload = () => { quitarPrecarga(ruta); ok(); };
    s.onerror = () => { s.remove(); quitarPrecarga(ruta); mal(errorCarga()); };
    document.body.appendChild(s);
  });
}
function cargarArchivo(ruta) {
  if (!cargas[ruta]) {
    const p = (esCss(ruta) ? cargarEstilo(ruta) : ejecutarScript(ruta)).then(() => { p.listo = true; }, e => { delete cargas[ruta]; throw e; });
    cargas[ruta] = p;
  }
  return cargas[ruta];
}

// Carga lo que falte de un paquete: estilos en paralelo y scripts descargados en paralelo pero ejecutados uno tras otro;
// ante la primera falla no se ejecuta nada de lo que sigue (un script clásico a medias no se puede volver a correr).
const cargasPaquete = {};
function cargarPaquete(nombre) {
  if (paqueteListo(nombre)) return Promise.resolve();
  if (!cargasPaquete[nombre]) {
    const pendientes = archivosDe(nombre).filter(r => !archivoListo(r));
    pendientes.filter(r => !esCss(r) && !cargas[r]).forEach(precargar);
    let cadena = Promise.resolve();
    for (const r of pendientes.filter(x => !esCss(x))) cadena = cadena.then(() => cargarArchivo(r));
    const estilos = pendientes.filter(esCss).map(cargarArchivo);
    cargasPaquete[nombre] = Promise.all([cadena, ...estilos]).then(() => { delete cargasPaquete[nombre]; }, e => {
      delete cargasPaquete[nombre];
      pendientes.forEach(r => { if (!cargas[r]) quitarPrecarga(r); });
      throw e;
    });
  }
  return cargasPaquete[nombre];
}

// ---------- Pantallas: «Cargando…» y aviso con «Reintentar» ----------
let reintentarCarga = null;
const htmlCargando = () => '<div class="loading" role="status" aria-live="polite">Cargando…</div>';
const htmlFallaCarga = volver => '<div class="card" role="alert"><p class="lead" style="margin-top:0">😕 No se pudo cargar el juego. Revisa tu internet e intenta de nuevo.</p>' +
  '<div class="row-btns"><button class="btn ghost" type="button" ' + volver + '>← Volver</button><button class="btn" type="button" data-reintentar-carga>🔄 Reintentar</button></div></div>';
// Llama a fn con el paquete listo. Si ya estaba, al instante (mismo turno, como antes de la carga perezosa); si no,
// «Cargando…» en `contenedor` y fn solo si esa pantalla sigue a la vista. `volver`: atributo del botón «← Volver».
function conPaquete(nombre, contenedor, fn, volver = 'data-a="hub"') {
  if (paqueteListo(nombre)) return fn();
  contenedor.innerHTML = htmlCargando();
  const marca = contenedor.firstElementChild;
  return cargarPaquete(nombre).then(() => (marca.isConnected ? fn() : undefined), () => {
    if (!marca.isConnected) return;
    contenedor.innerHTML = htmlFallaCarga(volver);
    reintentarCarga = () => conPaquete(nombre, contenedor, fn, volver);
  });
}
app.addEventListener('click', e => {
  if (!e.target.closest('[data-reintentar-carga]') || !reintentarCarga) return;
  const f = reintentarCarga; reintentarCarga = null; f();
});

// Abre un juego del catálogo (tarjeta, «▶ Jugar» de Para ti y Copas, «🔁 Jugar otra vez»).
function abrirJuego(j) {
  limpiar();
  return conPaquete(paqueteDe(j.id), app, () => {
    app.innerHTML = '<div class="loading">Preparando…</div>';
    return Promise.resolve(j.jugar()).catch(err => { app.innerHTML = '<div class="alert">No se pudo cargar el juego (' + escapeHtml(err.message) + ').</div>'; });
  });
}
