// E2E de «🧠 Cultura y Conocimiento» (openspec: cultura-conocimiento): sección única con sus 4 juegos, dato del Maratón
// al acertar, 📜 Línea del tiempo individual (tocar, arrastrar, vidas y resultado guardado) y en sala con bots (mismas
// líneas para todos, envío al acabarse el tiempo, revelación, podio y revancha). Capturas a 390 px.
require('./lib/entorno'); // BASE, API, DATOS, CHROME, carpeta de salida y sesión de prueba en fetch
const { chromium } = require('playwright');
const fs = require('fs');
const { abrirPagina } = require('./lib/navegador');
const API = process.env.API;
const cultura = JSON.parse(fs.readFileSync(process.env.DATOS + '/cultura.json', 'utf8'));
const out = []; const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`);
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Año de cada suceso por su texto (un mismo texto repetido en dos sets tiene el mismo año).
const anioDe = {};
for (const s of cultura.linea.sets) for (const x of s.sucesos) anioDe[x.txt] = x.anio;
const tarjetas = p => p.$$eval('.lt-pool .lt-tarjeta', bs => bs.map(b => ({ j: b.dataset.ltTarjeta, txt: b.textContent })));
// Coloca las tarjetas tocándolas en orden (ascendente = correcto; descendente = mal).
async function colocar(p, asc = true) {
  const ts = (await tarjetas(p)).sort((a, b) => asc ? anioDe[a.txt] - anioDe[b.txt] : anioDe[b.txt] - anioDe[a.txt]);
  for (const t of ts) await p.click('.lt-pool [data-lt-tarjeta="' + t.j + '"]');
  return ts;
}
const textoDe = async (p, sel) => ((await p.textContent(sel).catch(() => '')) || '').replace(/\s+/g, ' ').trim();

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME });
  const p = await abrirPagina(b, { email: 'marisol@example.com', viejo: true, tiempo: 0.6, out, etiqueta: '', dialogos: 'aceptar', ruta: '/juegos.html', esperar: '[data-juego]' });

  // ---- Sección única ----
  const secciones = await p.$$eval('main h2', hs => hs.map(h => ({ t: h.textContent.trim(), ids: h.nextElementSibling ? [...h.nextElementSibling.querySelectorAll('[data-juego]')].map(x => x.dataset.juego) : [] })));
  const cc = secciones.find(x => x.t === '🧠 Cultura y Conocimiento');
  ok('hub: sección «🧠 Cultura y Conocimiento» con sus 4 juegos', !!cc && JSON.stringify(cc.ids) === JSON.stringify(['cultura', 'cultura-linea', 'es-ortografia', 'es-ordena']), JSON.stringify(cc));
  ok('hub: ya no hay secciones «📝 Español» ni «🧠 Maratón de cultura»', !secciones.some(x => /Español|Maratón de cultura/.test(x.t)), secciones.map(x => x.t).join(' | '));
  ok('hub: la tarjeta de Línea del tiempo trae ícono y descripción', /📜[\s\S]*Línea del tiempo[\s\S]*más antiguo/.test(await textoDe(p, '[data-juego="cultura-linea"]')));
  await (await p.$('[data-juego="cultura"]')).scrollIntoViewIfNeeded();
  await p.screenshot({ path: 'cultura-hub.png' });

  // ---- Maratón: categorías nuevas y dato al acertar ----
  await p.click('[data-juego="cultura"]'); await p.waitForSelector('[data-cat]');
  const cats = await p.$$eval('[data-cat]', bs => bs.map(x => x.dataset.cat));
  ok('Maratón: 15 opciones con Matemáticas, Deportes, Naturaleza y Cultura de México', cats.length === cultura.categorias.length + 1 && ['matematicas', 'deportes', 'naturaleza', 'cultura-mexico'].every(c => cats.includes(c)), cats.join(','));
  await p.click('[data-cat="deportes"]'); await p.waitForSelector('.q-card .q');
  const q = (await p.textContent('.q-card .q')).trim();
  const preg = cultura.preguntas.find(x => x.pregunta === q);
  ok('Maratón Deportes: la pregunta es de Deportes', preg && preg.cat === 'deportes', q);
  if (preg) {
    const opciones = await p.$$eval('.opt[data-opt]', bs => bs.map(x => x.textContent.replace(/^\d/, '').trim()));
    await p.click('.opt[data-opt="' + opciones.indexOf(preg.opciones[preg.correcta]) + '"]');
    await p.waitForSelector('#fb .quiz-dato', { timeout: 5000 }).catch(() => {});
    ok('Maratón: al acertar se ve el dato 💡', (await textoDe(p, '#fb .quiz-dato')).includes(preg.dato), await textoDe(p, '#fb'));
    await p.screenshot({ path: 'cultura-maraton-dato.png' });
  }
  await p.click('[data-a="salir"]'); await p.waitForSelector('[data-juego]');

  // ---- Línea del tiempo individual ----
  await p.click('[data-juego="cultura-linea"]'); await p.waitForSelector('[data-ltema]');
  ok('Línea: 5 temas para elegir', (await p.$$('[data-ltema]')).length === 5);
  await p.screenshot({ path: 'linea-temas.png' });
  await p.click('[data-ltema="inventos"]'); await p.waitForSelector('.lt-tarjeta');
  const t1 = await tarjetas(p);
  ok('Línea 1: 4 sucesos de inventos por colocar', t1.length === 4 && t1.every(t => anioDe[t.txt] !== undefined), t1.map(t => t.txt).join(' · '));
  ok('Línea: «Confirmar» empieza deshabilitado', await p.$eval('[data-lt="confirmar"]', x => x.disabled));
  await colocar(p, true);
  await p.screenshot({ path: 'linea-ordenada.png' });
  await p.click('[data-lt="confirmar"]'); await p.waitForSelector('#lt-fb');
  ok('Línea 1 perfecta: puntos y años revelados', /Línea perfecta! \+\d+/.test(await textoDe(p, '#lt-fb')) && (await p.$$('.lt-casilla.ok')).length === 4, await textoDe(p, '#lt-fb'));
  ok('Línea 1: orden correcto con año y dato 💡 de cada suceso', (await p.$$eval('.lt-correcto li', ls => ls.filter(l => /💡/.test(l.textContent)).length)) === 4);
  await sleep(600); await p.screenshot({ path: 'linea-revelada.png', fullPage: true }); // tras la animación de revelado
  await p.click('[data-lt="siguiente"]'); await p.waitForFunction(() => /Línea 2 de/.test((document.querySelector('.lt-cab .q') || {}).textContent || ''));

  // Línea 2: arrastrar la más antigua a la casilla 1, tocar las demás, regresar una y volver a ponerla.
  const t2 = (await tarjetas(p)).sort((a, c) => anioDe[a.txt] - anioDe[c.txt]);
  const origen = await p.$('.lt-pool [data-lt-tarjeta="' + t2[0].j + '"]'), destino = await p.$('[data-lt-casilla="0"]');
  const bo = await origen.boundingBox(), bd = await destino.boundingBox();
  await p.mouse.move(bo.x + bo.width / 2, bo.y + bo.height / 2); await p.mouse.down();
  await p.mouse.move(bo.x + bo.width / 2 + 10, bo.y + bo.height / 2 - 10, { steps: 3 });
  await p.mouse.move(bd.x + bd.width / 2, bd.y + bd.height / 2, { steps: 8 }); await p.mouse.up();
  await sleep(150);
  ok('Línea 2: arrastrar pone la tarjeta en la casilla', (await textoDe(p, '[data-lt-casilla="0"]')).includes(t2[0].txt), await textoDe(p, '[data-lt-casilla="0"]'));
  for (const t of t2.slice(1)) await p.click('.lt-pool [data-lt-tarjeta="' + t.j + '"]');
  await p.click('[data-lt-casilla="1"]');
  ok('Línea 2: tocar una casilla llena la regresa', (await p.$$('.lt-pool .lt-tarjeta')).length === 1 && !(await p.$eval('[data-lt="confirmar"]', x => !x.disabled)));
  await p.click('.lt-pool .lt-tarjeta');
  await p.click('[data-lt="confirmar"]'); await p.waitForSelector('#lt-fb');
  ok('Línea 2 perfecta con racha', /racha ×2/.test(await textoDe(p, '#lt-fb')), await textoDe(p, '#lt-fb'));

  // Líneas 3 a 5 al revés: se pierden las 3 vidas y se guarda el resultado.
  for (let k = 3; k <= 5; k++) {
    await p.click('[data-lt="siguiente"]');
    await p.waitForFunction(n => new RegExp('Línea ' + n + ' de').test((document.querySelector('.lt-cab .q') || {}).textContent || ''), k);
    await colocar(p, false); await p.click('[data-lt="confirmar"]'); await p.waitForSelector('#lt-fb');
    if (k === 3) {
      ok('Línea con errores: pierde una vida y ve el orden correcto', /pierdes una vida/.test(await textoDe(p, '#lt-fb')) && (await p.$$('.lt-casilla.bad')).length >= 2 && (await textoDe(p, '#m-vidas')).includes('🖤'), await textoDe(p, '#lt-fb'));
      await sleep(600); await p.screenshot({ path: 'linea-error.png', fullPage: true });
    }
  }
  ok('Sin vidas: botón para ver el resultado', /Ver mi resultado/.test(await textoDe(p, '[data-lt="siguiente"]')));
  await p.click('[data-lt="siguiente"]');
  await p.waitForSelector('.result .score', { timeout: 30000 });
  const res = await textoDe(p, '.result');
  ok('Línea individual: termina, guarda y muestra 2 de 5 líneas perfectas', res.includes('a tus individuales') && /2 líneas perfectas de 5/.test(res) && Number((await textoDe(p, '.result .score')).replace(/\D/g, '')) > 0, res.slice(0, 160));
  await p.screenshot({ path: 'linea-resultado.png' });

  // ---- Línea del tiempo en sala con bots ----
  const mar = await abrirPagina(b, { email: 'marisol@example.com', viejo: true, tiempo: 0.3, out, etiqueta: 'marisol', ruta: '/juegos.html', esperar: '[data-juego]' });
  const ang = await abrirPagina(b, { email: 'angel@example.com', viejo: true, tiempo: 0.3, out, etiqueta: 'angel', ruta: '/juegos.html', esperar: '[data-juego]' });
  await mar.click('[data-tab="partidas"]'); await mar.waitForSelector('#f-crear');
  ok('Crear partida: Línea del tiempo en la lista', !!(await mar.$('#p-juego option[value="cultura-linea"]')));
  await mar.selectOption('#p-juego', 'cultura-linea');
  ok('Crear partida: se ve el selector de tema', await mar.$eval('#p-ltema-wrap', x => !x.hidden) && await mar.$eval('#p-cat-wrap', x => x.hidden));
  await mar.selectOption('#p-ltema', 'ciencia');
  await mar.screenshot({ path: 'linea-sala-crear.png' });
  await mar.click('#f-crear button[type=submit]');
  await mar.waitForSelector('[data-p="empezar"]', { timeout: 30000 });
  const codigo = (await mar.textContent('.letra')).trim();
  await ang.click('[data-tab="partidas"]'); await ang.waitForSelector('#f-crear');
  await ang.fill('#p-codigo', codigo); await ang.click('#f-unirse button[type=submit]'); await ang.waitForSelector('#p-codigo-chip', { timeout: 30000 });
  await mar.waitForFunction(() => /2 personas \+ 2 bots/.test((document.getElementById('p-mesa') || {}).textContent || ''), null, { timeout: 30000 }).catch(() => {});
  ok('Sala de espera: «Hasta 30 personas · 2 personas + 2 bots»', /Hasta 30 personas · 2 personas \+ 2 bots/.test(await textoDe(mar, '#p-mesa')), await textoDe(mar, '#p-mesa'));
  await mar.screenshot({ path: 'linea-sala-espera.png' });
  await mar.click('[data-p="empezar"]');

  const enLinea = (pg, k) => pg.waitForFunction(n => new RegExp('Línea ' + n + ' de 5').test((document.querySelector('.lt-cab .q') || {}).textContent || '') && document.querySelector('.lt-pool .lt-tarjeta'), k, { timeout: 60000 });
  const enRevelacion = (pg, k) => pg.waitForFunction(n => new RegExp('Línea ' + n + ' de 5').test((document.querySelector('.lt-cab .q') || {}).textContent || '') && document.querySelector('.lt-correcto'), k, { timeout: 60000 });
  for (let q = 0; q < 5; q++) {
    await Promise.all([enLinea(mar, q + 1), enLinea(ang, q + 1)]);
    if (q === 0) {
      const [a, c] = await Promise.all([tarjetas(mar), tarjetas(ang)]);
      ok('Sala: las dos personas ven la misma línea en el mismo orden', a.length === 4 && JSON.stringify(a.map(x => x.txt)) === JSON.stringify(c.map(x => x.txt)), a.map(x => x.txt).join(' · '));
      ok('Sala: sucesos del tema «ciencia»', a.every(x => cultura.linea.sets.some(s => s.tema === 'ciencia' && s.sucesos.some(y => y.txt === x.txt))));
      await mar.screenshot({ path: 'linea-sala-ordenar.png' });
    }
    await colocar(mar, true); await mar.click('[data-lt="confirmar"]');
    if (q === 1) { // Angel deja dos colocadas y se le acaba el tiempo: se envía lo colocado.
      const ts = (await tarjetas(ang)).sort((x, y) => anioDe[x.txt] - anioDe[y.txt]);
      for (const t of ts.slice(0, 2)) await ang.click('.lt-pool [data-lt-tarjeta="' + t.j + '"]');
    } else { await colocar(ang, q % 2 === 0); await ang.click('[data-lt="confirmar"]'); }
    ok('Sala línea ' + (q + 1) + ': Marisol ve «Línea enviada»', (await textoDe(mar, '#p-body .feedback')).includes('Línea enviada'));
    await Promise.all([enRevelacion(mar, q + 1), enRevelacion(ang, q + 1)]);
    if (q === 0) {
      ok('Sala revelación: orden correcto con datos y marcador con bots', (await mar.$$('.lt-correcto li')).length === 4 && /🤖/.test(await textoDe(mar, '#p-body .rank')), await textoDe(mar, '#p-body .feedback'));
      await sleep(400); await mar.screenshot({ path: 'linea-sala-revelacion.png', fullPage: true });
    }
    if (q === 1) ok('Sala: al acabarse el tiempo se envía lo colocado', /2 de 5 en su lugar|en su lugar/.test(await textoDe(ang, '#p-body .feedback')), await textoDe(ang, '#p-body .feedback'));
  }
  await Promise.all([mar, ang].map(pg => pg.waitForSelector('#p-body .result', { timeout: 60000 })));
  const podio = await textoDe(mar, '#p-body');
  ok('Podio: título, personas y bots', podio.includes('Fin de la línea del tiempo') && podio.includes('BOT-VACHIRA') && podio.includes('Angel'), podio.slice(0, 160));
  const [pm, pa] = await Promise.all([mar, ang].map(async pg => Number((await textoDe(pg, '#p-body .result .score')).replace(/\D/g, ''))));
  ok('Podio: Marisol (todo en orden) suma más que Angel', pm > pa && pm >= 5 * 100, pm + ' vs ' + pa);
  ok('Podio: ofrece «Otra con los mismos»', /Otra con los mismos/.test(await textoDe(mar, '[data-p="revancha"]').catch(() => '')));
  await mar.waitForFunction(() => /a tus puntos de partidas/.test((document.getElementById('p-guardado') || {}).textContent || ''), null, { timeout: 20000 }).catch(() => {});
  ok('Podio: se guarda en puntos de partidas', /a tus puntos de partidas/.test(await textoDe(mar, '#p-guardado')), await textoDe(mar, '#p-guardado'));
  await mar.screenshot({ path: 'linea-sala-podio.png', fullPage: true });
  const s = await (await fetch(API + '/juegos/sala/' + codigo + '?email=marisol%40example.com')).json();
  const rm = (s.jugadores.find(j => j.nombre === 'Marisol') || {}).respuestas || {}, ra = (s.jugadores.find(j => j.nombre === 'Angel') || {}).respuestas || {};
  ok('Servidor: 5 líneas perfectas de Marisol con sus aciertos', Object.keys(rm).length === 5 && Object.values(rm).every(r => r.correcta && r.aciertos >= 4 && r.puntos <= 200), JSON.stringify(rm).slice(0, 200));
  ok('Servidor: la línea 2 de Angel se guardó al acabarse el tiempo', ra[1] && ra[1].correcta === false && ra[1].aciertos <= 2, JSON.stringify(ra[1]));

  // Revancha: misma configuración (tema y bots).
  await mar.click('[data-p="revancha"]');
  await mar.waitForFunction(v => { const c = document.getElementById('p-codigo-chip'); return c && !c.textContent.includes(v) && document.querySelector('#p-body .letra'); }, codigo, { timeout: 30000 });
  const nuevo = ((await mar.textContent('#p-codigo-chip')) || '').replace(/[^A-Z]/g, '');
  const sn = await (await fetch(API + '/juegos/sala/' + nuevo + '?email=marisol%40example.com')).json();
  ok('Revancha: sala nueva de Línea del tiempo con el mismo tema y bots', sn.sala && sn.sala.juego === 'cultura-linea' && sn.sala.opciones.cat === 'ciencia' && sn.sala.bots === true, JSON.stringify(sn.sala && sn.sala.opciones));

  await b.close();
  console.log(out.join('\n'));
  const fallas = out.filter(x => x.startsWith('FAIL')).length;
  console.log(`\n${out.length - fallas}/${out.length} PASS`);
  process.exit(fallas ? 1 : 0);
})().catch(e => { console.log(out.join('\n')); console.error('ERROR', e.message.slice(0, 300)); process.exit(2); });
