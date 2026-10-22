// E2E: todo el contenido de cada diapositiva se ve (openspec: presentacion-cabe). Recorre todas las diapositivas de
// Meets reales con teoría larga (copia del repo de datos) y una presentación sintética con diagramas de 8 pasos y una
// tabla de 16 filas, en varios tamaños de pantalla. Falla si algún contenido queda cortado sin forma de verlo:
//   - un elemento de la diapositiva con overflow oculto cuyo contenido no cabe (scrollHeight/scrollWidth > client*),
//   - un elemento que se sale del área visible de la diapositiva o de su contenedor con scroll,
//   - un cuerpo con scroll que no muestra el aviso «⬇️ hay más», o un texto por debajo del mínimo legible.
// Solo lectura: no escribe datos. TAMANOS=todos mide además 1920×1080, 1366×768 y 740×360 (celular horizontal).
require('./lib/entorno'); // BASE, API, CHROME y carpeta de salida
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { abrirPagina } = require('./lib/navegador');
const out = []; const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`);

// Meets reales con más contenido (tablas de 7 a 16 filas, textos largos, ejemplos y puntos).
const REALES = ['meet-2026-10-25', 'meet-2026-10-11', 'meet-g1-2026-10-21', 'meet-2026-11-01'];
const SINTETICO = 'meet-sintetico-cabe-e2e';
const TAMANOS = [
  { n: '1280x720', width: 1280, height: 720 },
  { n: 'tablet 1024x768', width: 1024, height: 768 },
  { n: 'celular 360x740', width: 360, height: 740 },
].concat(process.env.TAMANOS === 'todos' ? [
  { n: '1920x1080', width: 1920, height: 1080 },
  { n: '1366x768', width: 1366, height: 768 },
  { n: 'celular 740x360', width: 740, height: 360 },
] : []);
const MIN_PX = 10; // texto mínimo legible dentro de la diapositiva

// Presentación sintética: el peor caso (tabla larga de 4 columnas, diagramas de 8 pasos, muchos puntos).
const paso = (t, i) => ({ texto: t, detalle: 'Detalle del paso ' + (i + 1) + ' con varias palabras para que ocupe espacio', icono: '🔹' });
const sintetico = {
  id: SINTETICO, tipo: 'meet', titulo: 'Presentación sintética (E2E)', fechaLimite: '2026-10-04', hora: '10:00',
  guion: Array.from({ length: 9 }, (_, i) => ({ titulo: (i + 1) + '. Bloque con un título bastante largo número ' + (i + 1), tiempo: '10 min' })),
  teoria: [
    { titulo: 'Tabla larga', texto: 'Una tabla de dieciséis filas y cuatro columnas con un texto introductorio largo que ocupa más de una línea en la diapositiva.',
      tabla: { columnas: ['Verbo', 'Pasado', 'Participio', 'Significado'], filas: Array.from({ length: 16 }, (_, i) => ['verb ' + i, 'past ' + i, 'participle ' + i, 'significado largo ' + i]) },
      puntos: ['Primer punto con bastante texto para ocupar una línea completa.', 'Segundo punto.', 'Tercer punto.'] },
    { titulo: 'Flujo de 8', diagrama: { tipo: 'flujo', titulo: 'Ocho pasos', pasos: ['Uno', 'Dos', 'Tres', 'Cuatro', 'Cinco', 'Seis', 'Siete', 'Ocho'].map(paso), nota: 'Nota del diagrama.' } },
    { titulo: 'Ramas de 8', texto: 'Mapa con muchas ramas.', diagrama: { tipo: 'ramas', centro: 'Centro', pasos: ['Uno', 'Dos', 'Tres', 'Cuatro', 'Cinco', 'Seis', 'Siete', 'Ocho'].map(paso) } },
    { titulo: 'Ciclo y ejemplos', texto: 'Texto previo.', ejemplos: Array.from({ length: 6 }, (_, i) => ({ en: 'Example sentence number ' + i, es: 'Oración de ejemplo número ' + i })),
      diagrama: { tipo: 'ciclo', pasos: ['Explorar', 'Planear', 'Codificar', 'Probar', 'Commit', 'Revisar'].map(paso) } },
  ],
  tips: Array.from({ length: 7 }, (_, i) => ({ tipo: 'libreta', texto: 'Tarea de libreta ' + (i + 1) + ': escribe cinco oraciones con el tema de hoy y súbrayalas.' })),
  presentacion: { diapositivas: [
    { tipo: 'portada', titulo: 'Presentación sintética con un título muy largo para la portada', subtitulo: 'Subtítulo largo de la portada', emoji: '🎬', texto: 'Texto de la portada' },
    { tipo: 'agenda', titulo: 'Agenda' },
    { tipo: 'teoria', ref: 0 }, { tipo: 'teoria', ref: 1 }, { tipo: 'teoria', ref: 2 }, { tipo: 'teoria', ref: 3 },
    { tipo: 'practica', titulo: 'Práctica', instrucciones: 'Completa las oraciones.', frases: Array.from({ length: 10 }, (_, i) => 'Frase de práctica número ' + (i + 1) + ' ____') },
    { tipo: 'juego', titulo: 'Juego', reglas: Array.from({ length: 8 }, (_, i) => 'Regla del juego número ' + (i + 1) + ' con su explicación') },
    { tipo: 'libreta', titulo: 'Libreta' },
    { tipo: 'cierre', titulo: 'Cierre', emoji: '👋' },
  ] },
};

// Medición dentro de la página: devuelve la lista de problemas de la diapositiva visible.
function medir(minPx) {
  const slide = document.querySelector('#deck-stage .slide');
  if (!slide) return ['no hay diapositiva'];
  const problemas = [];
  const desc = el => (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : el.tagName.toLowerCase()) + ' «' + (el.textContent || '').trim().slice(0, 40) + '»';
  const desplazable = el => { const s = getComputedStyle(el); return /auto|scroll/.test(s.overflowY) || /auto|scroll/.test(s.overflowX); };
  const sr = slide.getBoundingClientRect();
  for (const el of [slide, ...slide.querySelectorAll('*')]) {
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden') continue;
    // 1) Contenido oculto por overflow (sin scroll): hidden/clip con contenido que no cabe.
    const oculta = /hidden|clip/.test(s.overflowY + ' ' + s.overflowX);
    if (oculta && !desplazable(el) && (el.scrollHeight > el.clientHeight + 2 || el.scrollWidth > el.clientWidth + 2)) {
      problemas.push('recortado ' + desc(el) + ' ' + el.scrollWidth + 'x' + el.scrollHeight + ' > ' + el.clientWidth + 'x' + el.clientHeight);
    }
    // 2) Texto ellipsis truncado.
    if (s.textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth + 1) problemas.push('truncado con … ' + desc(el));
    // 3) Fuera del área visible: de la diapositiva o del contenedor con scroll más cercano (que sí deja verlo).
    if (el !== slide && el.children.length === 0 && (el.textContent || '').trim()) {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      let cont = el.parentElement;
      while (cont && cont !== slide && !desplazable(cont)) cont = cont.parentElement;
      if (cont && cont !== slide) continue; // dentro de un contenedor con scroll: se alcanza desplazándose
      if (r.bottom > sr.bottom + 1 || r.right > sr.right + 1 || r.top < sr.top - 1 || r.left < sr.left - 1) problemas.push('fuera de la diapositiva ' + desc(el));
      const fs = parseFloat(s.fontSize);
      if (fs < minPx) problemas.push('texto ilegible (' + fs.toFixed(1) + 'px) ' + desc(el));
    }
  }
  // 4) Un cuerpo con scroll que no cabe debe avisar «hay más».
  const body = slide.querySelector('.slide-body');
  if (body && desplazable(body) && body.scrollHeight > body.clientHeight + 2) {
    const aviso = slide.querySelector('.slide-mas');
    if (!aviso || getComputedStyle(aviso).display === 'none') problemas.push('hay scroll sin aviso «hay más»');
  }
  return [...new Set(problemas)];
}

(async () => {
  const DATA = process.env.DATA;
  const reales = REALES.filter(id => DATA && fs.existsSync(path.join(DATA, 'contenido', 'actividades', id + '.json')));
  if (!reales.length) { console.log('OMIT presentacion-cabe: la copia de datos no trae los Meets reales (' + REALES.join(', ') + ')'); process.exit(0); }
  const b = await chromium.launch({ executablePath: process.env.CHROME });
  const resumen = [];
  for (const t of TAMANOS) {
    const p = await abrirPagina(b, { email: 'admin@example.com', out, etiqueta: t.n, viewport: { width: t.width, height: t.height }, ruta: '/ingles.html#presentar', esperar: '#pres-semana' });
    await p.route('**/actividades/' + SINTETICO + '*', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(sintetico) }));
    for (const id of [...reales.slice(0, 3), SINTETICO]) {
      await p.evaluate(m => openPresentacion(m), id);
      const abierta = await p.waitForSelector('.deck #deck-stage .slide', { timeout: 15000 }).then(() => true, () => false);
      if (!abierta) { ok(`${t.n} · ${id}: abre la presentación`, false); continue; }
      const total = Number((await p.textContent('#deck-count')).split('/')[1]);
      const malas = [];
      const nombre = k => `presentacion-cabe-${id}-${t.n.replace(/\W+/g, '_')}-${k + 1}.png`;
      for (let k = 0; k < total; k++) {
        await p.waitForFunction(n => document.getElementById('deck-count').textContent.startsWith((n + 1) + ' /'), k, { timeout: 5000 });
        await p.waitForTimeout(450); // animación de entrada y ajuste de la escala
        const prob = await p.evaluate(medir, MIN_PX);
        if (prob.length) { malas.push((k + 1) + ': ' + prob.slice(0, 3).join(' | ')); await p.screenshot({ path: nombre(k) }); }
        else if (process.env.CAPTURAS) await p.screenshot({ path: nombre(k) });
        // Con scroll: → baja una parte a la vez (sin cambiar de diapositiva) hasta llegar al final del contenido.
        const partes = await p.evaluate(() => { const bd = document.querySelector('#deck-stage .slide-body'); return bd && bd.classList.contains('desborda') ? (document.querySelector('.slide-mas') || {}).textContent || '?' : ''; });
        if (partes) {
          resumen.push(`${t.n} · ${id} · ${k + 1}: ${partes}`);
          let pasos = 0, alFinal = false;
          while (!alFinal && pasos < 12) {
            await p.keyboard.press('ArrowRight'); await p.waitForTimeout(500); pasos++;
            const e = await p.evaluate(() => { const bd = document.querySelector('#deck-stage .slide-body'); return { cuenta: document.getElementById('deck-count').textContent, fin: !!bd && bd.scrollTop + bd.clientHeight >= bd.scrollHeight - 2 }; });
            if (!e.cuenta.startsWith((k + 1) + ' /')) { malas.push((k + 1) + ': → cambió de diapositiva sin mostrar el resto'); break; }
            alFinal = e.fin;
          }
          if (!alFinal) malas.push((k + 1) + ': → no llega al final del contenido');
          const fin = await p.evaluate(() => (document.querySelector('.slide-mas') || {}).textContent || '');
          if (!/Parte \d+\/\d+/.test(fin)) malas.push((k + 1) + ': al final falta «parte x/y» (' + fin + ')');
          if (process.env.CAPTURAS) await p.screenshot({ path: nombre(k).replace('.png', '-final.png') });
        }
        await p.keyboard.press('ArrowRight');
      }
      ok(`${t.n} · ${id}: ${total} diapositivas sin contenido cortado`, malas.length === 0, malas.slice(0, 4).join(' || '));
      // Las flechas siguen navegando: ← sube las partes de la diapositiva (si tiene scroll) y luego regresa una.
      let cuenta = '';
      for (let n = 0; n < 12; n++) {
        await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(400);
        cuenta = await p.textContent('#deck-count');
        if (!cuenta.startsWith(total + ' /')) break;
      }
      ok(`${t.n} · ${id}: ← regresa a la diapositiva anterior`, cuenta.startsWith((total - 1) + ' /'), cuenta);
      if (id === reales[0]) await p.screenshot({ path: `presentacion-cabe-${t.n.replace(/\W+/g, '_')}.png` });
      await p.click('[data-deck="exit"]');
      await p.waitForSelector('.deck', { state: 'detached', timeout: 5000 });
    }
    await p.context().close();
  }
  // Modo oscuro (proyector) y claro: por omisión el del sistema; ☀️/🌙 o T lo cambia. Botones reales de navegación.
  const o = await abrirPagina(b, { email: 'admin@example.com', out, etiqueta: 'oscuro', viewport: { width: 1280, height: 720 }, contexto: { colorScheme: 'dark' }, ruta: '/ingles.html#presentar', esperar: '#pres-semana' });
  await o.evaluate(m => openPresentacion(m), reales[0]);
  await o.waitForSelector('.deck #deck-stage .slide');
  const fondo = () => o.$eval('#deck-stage .slide-body', x => getComputedStyle(x.closest('.slide')).backgroundColor);
  await o.click('[data-deck="next"]'); await o.waitForTimeout(450);
  const tema1 = await o.$eval('.deck', x => x.dataset.tema);
  const f1 = await fondo();
  await o.screenshot({ path: 'presentacion-cabe-oscuro.png' });
  await o.keyboard.press('t'); await o.waitForTimeout(200);
  const tema2 = await o.$eval('.deck', x => x.dataset.tema);
  const f2 = await fondo();
  await o.screenshot({ path: 'presentacion-cabe-claro.png' });
  ok('oscuro por omisión con sistema oscuro y T cambia a claro', tema1 === 'oscuro' && tema2 === 'claro' && f1 !== f2, `${tema1} ${f1} → ${tema2} ${f2}`);
  await o.click('[data-deck="prev"]');
  ok('botón «Anterior» regresa', (await o.textContent('#deck-count')).startsWith('1 /'));
  ok('barra de progreso con aria-valuenow', (await o.$eval('#deck-progress', x => x.getAttribute('aria-valuenow'))) === '1');
  await o.context().close();
  await b.close();
  if (resumen.length) console.log('INFO ' + resumen.join('\nINFO '));
  console.log(out.join('\n')); process.exit(out.some(x => x.startsWith('FAIL')) ? 1 : 0);
})().catch(e => { console.log(out.join('\n')); console.error('ERROR', e.message.slice(0, 400)); process.exit(2); });
