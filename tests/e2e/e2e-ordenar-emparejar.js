// E2E: ejercicios para ordenar la oración y unir pares (openspec: ejercicios-ordenar-emparejar). Fernando (persona de
// ejemplo) resuelve en un celular de 390 px la actividad de prueba `fichas-e2e` (tests/fixtures/datos, exclusiva de él,
// con fecha esta semana: aparece en «Para ponerte al día»): fichas que no revelan el orden, deshacer y «Borrar», unir
// y deshacer pares, recarga a medio intento, envío con errores, revisión, corrección y vista previa del admin.
require('./lib/entorno'); // BASE, API, CHROME, carpeta de salida y sesión de prueba en fetch
const { chromium } = require('playwright');
const { abrirPagina, urlDe } = require('./lib/navegador');
const API = process.env.API;
const out = []; const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`);
// Capturas de un ejercicio sin las barras fijas encima (Volver/Enviar, navegación y progreso).
const OCULTAR_BARRAS = '.exam-bar, #nav, .player-progreso { visibility: hidden !important; }';
const ALUMNO = 'fernando@example.com';
const ID = 'fichas-e2e';
const texto = async (p, sel) => ((await p.textContent(sel)) || '').replace(/\s+/g, ' ').trim();
const espiarVoz = () => { window.__habladas = []; if (window.speechSynthesis) window.speechSynthesis.speak = u => window.__habladas.push({ texto: u.text, rate: u.rate }); };

// Acciones sobre los ejercicios.
const ficha = (p, q, palabra, donde = 'banco') => p.locator(`[data-q="${q}"] .ord-${donde} .ficha`, { hasText: new RegExp('^' + palabra + '$') });
const tocar = async (p, q, palabras) => { for (const w of palabras) await ficha(p, q, w).click(); };
const linea = (p, q) => p.inputValue(`[data-q="${q}"] input.q-text`);
const lado = (p, q, l, v) => p.locator(`[data-q="${q}"] .emp-btn[data-lado="${l}"][data-v="${v}"]`);
const unir = async (p, q, a, b) => { await lado(p, q, 'izq', a).click(); await lado(p, q, 'der', b).click(); };
const abrir = async p => {
  await p.click(`#al-dia [data-action="abrir-item"][data-id="${ID}"]`);
  await p.waitForSelector('#exam-form', { timeout: 60000 });
  if (await p.$('[data-action="ver-todas"]')) await p.click('[data-action="ver-todas"]');
};

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME });
  const p = await abrirPagina(b, { email: ALUMNO, ingles: true, init: [espiarVoz], out, etiqueta: '', dialogos: 'aceptar', ruta: '/ingles.html#semana', esperar: `#al-dia [data-id="${ID}"]` });
  ok('la actividad aparece en «Para ponerte al día»', !!(await p.$(`#al-dia [data-action="abrir-item"][data-id="${ID}"]`)));
  await p.click(`#al-dia [data-action="abrir-item"][data-id="${ID}"]`);
  await p.waitForSelector('#exam-form', { timeout: 60000 });
  ok('celular: una pregunta por pantalla (modo paso)', await p.$eval('#exam-form', f => f.classList.contains('paso')));
  await p.screenshot({ path: 'ordenar-emparejar-paso-390.png' });
  await p.click('[data-action="ver-todas"]');

  // 1) Las fichas y la derecha llegan barajadas, nunca en el orden correcto, y sin respuestas en la vista pública.
  const fichas1 = await p.$$eval('[data-q="fe-o1"] .ord-banco .ficha', xs => xs.map(x => x.textContent));
  const fichas2 = await p.$$eval('[data-q="fe-o2"] .ord-banco .ficha', xs => xs.map(x => x.textContent));
  ok('ordenar: fichas con el distractor, barajadas', fichas1.length === 5 && fichas1.includes('going') && fichas1.slice(0, 4).join(' ') !== 'I will travel tomorrow', fichas1.join(','));
  ok('ordenar (escucha): no viene en el orden correcto', fichas2.join(' ') !== 'She is reading a book', fichas2.join(','));
  const der = await p.$$eval('[data-q="fe-m1"] .emp-btn[data-lado="der"]', xs => xs.map(x => x.dataset.v));
  ok('emparejar: 4 a la izquierda en orden y la derecha barajada', (await p.$$eval('[data-q="fe-m1"] .emp-btn[data-lado="izq"]', xs => xs.map(x => x.dataset.v))).join('|') === 'this|these|that|those' &&
    der.join('|') !== 'este / esta|estos / estas|ese / esa / aquel|esos / esas', der.join('|'));
  const pub = await (await fetch(API + `/ingles/actividades/${ID}?email=${ALUMNO}`)).json();
  ok('API: sin palabras, distractores, aceptadas ni pares', pub.preguntas.every(x => !x.palabras && !x.distractores && !x.aceptadas && !x.pares && !x.explicacion), JSON.stringify(pub.preguntas.map(x => Object.keys(x))));
  ok('API: mismo orden que la página (determinista)', pub.preguntas.find(x => x.id === 'fe-o1').fichas.join(',') === fichas1.join(','));

  // 2) Ordenar: tocar agrega, tocar en la línea regresa, «Borrar» limpia; teclado y lector de pantalla.
  await tocar(p, 'fe-o1', ['I', 'will', 'going']);
  ok('tocar agrega a la línea', (await linea(p, 'fe-o1')) === 'I will going');
  await ficha(p, 'fe-o1', 'going', 'linea').click();
  ok('tocar en la línea regresa la ficha', (await linea(p, 'fe-o1')) === 'I will' && await ficha(p, 'fe-o1', 'going').count() === 1);
  ok('anuncio para lector de pantalla', (await texto(p, '[data-q="fe-o1"] [data-anuncio]')).includes('Quitaste «going»'), await texto(p, '[data-q="fe-o1"] [data-anuncio]'));
  ok('la ficha en la línea dice su lugar (aria-label)', (await ficha(p, 'fe-o1', 'will', 'linea').getAttribute('aria-label')).includes('ficha 2 de tu oración'));
  await p.click('[data-q="fe-o1"] [data-action="ord-borrar"]');
  ok('«Borrar» regresa todas', (await linea(p, 'fe-o1')) === '' && await p.locator('[data-q="fe-o1"] .ord-banco .ficha').count() === 5);
  await ficha(p, 'fe-o1', 'I').focus(); await p.keyboard.press('Enter');
  ok('con teclado: Enter mueve la ficha y el foco sigue en las fichas', (await linea(p, 'fe-o1')) === 'I' && await p.evaluate(() => document.activeElement.classList.contains('ficha')));
  await ficha(p, 'fe-o1', 'will').focus(); await p.keyboard.press('Space');
  ok('con teclado: Espacio también', (await linea(p, 'fe-o1')) === 'I will');

  // 3) Emparejar: dos pares, deshacer uno y volver a unirlo.
  await unir(p, 'fe-m1', 'this', 'este / esta');
  await unir(p, 'fe-m1', 'these', 'estos / estas');
  ok('pares marcados con color y número', await lado(p, 'fe-m1', 'izq', 'this').evaluate(x => x.classList.contains('unido') && x.classList.contains('par-0') && x.textContent.startsWith('1')) &&
    await lado(p, 'fe-m1', 'der', 'estos / estas').evaluate(x => x.classList.contains('par-1')));
  await lado(p, 'fe-m1', 'der', 'este / esta').click();
  ok('tocar un par lo deshace', !(await lado(p, 'fe-m1', 'izq', 'this').evaluate(x => x.classList.contains('unido'))) && (await texto(p, '[data-q="fe-m1"] [data-anuncio]')).includes('Deshiciste'));
  await lado(p, 'fe-m1', 'der', 'este / esta').click(); await lado(p, 'fe-m1', 'izq', 'this').click(); // también de derecha a izquierda
  ok('se une también empezando por la derecha', await lado(p, 'fe-m1', 'izq', 'this').evaluate(x => x.classList.contains('par-0')));
  ok('pares incompletos no cuentan como respondida', (await texto(p, '#exam-count')).startsWith('1/4') && !(await p.$eval('[data-q="fe-m1"]', q => q.classList.contains('answered'))), await texto(p, '#exam-count'));

  // 4) Recargar a medio intento: la oración y los pares siguen armados.
  await p.waitForFunction(() => /en tu cuenta ✔ · Guardado/.test(document.getElementById('autoguardado').textContent), null, { timeout: 15000 })
    .then(() => ok('el avance se sube a la cuenta', true), async () => ok('el avance se sube a la cuenta', false, await texto(p, '#autoguardado')));
  const cuenta = (await (await fetch(API + `/ingles/actividades/${ID}?email=${ALUMNO}`)).json()).borrador;
  ok('borrador en la cuenta con el avance parcial de los pares', !!cuenta && cuenta.respuestas['fe-o1'] === 'I will' && JSON.stringify(cuenta.respuestas['fe-m1']) === JSON.stringify(['este / esta', 'estos / estas', '', '']), JSON.stringify(cuenta));
  await p.reload(); // como jalar la pantalla para recargar; luego vuelve a la sección Semana
  await p.goto(urlDe('/ingles.html#semana'));
  await p.waitForSelector(`#al-dia [data-id="${ID}"]`, { timeout: 60000 });
  await abrir(p);
  ok('tras recargar: la oración sigue armada', (await linea(p, 'fe-o1')) === 'I will' && (await p.$$eval('[data-q="fe-o1"] .ord-linea .ficha', xs => xs.map(x => x.textContent))).join(' ') === 'I will');
  ok('tras recargar: los pares siguen unidos', await lado(p, 'fe-m1', 'der', 'estos / estas').evaluate(x => x.classList.contains('par-1')) && await lado(p, 'fe-m1', 'izq', 'this').evaluate(x => x.classList.contains('par-0')));
  ok('aviso «Recuperamos tus 2 respuestas»', (await texto(p, '#autoguardado-aviso')).includes('Recuperamos tus 2 respuestas'), await texto(p, '#autoguardado-aviso'));

  // 5) Terminar con errores: oración con el distractor y dos pares cruzados.
  await p.click('[data-q="fe-o1"] [data-action="ord-borrar"]');
  await tocar(p, 'fe-o1', ['I', 'going', 'travel', 'tomorrow']);
  await tocar(p, 'fe-o2', ['She', 'is', 'reading', 'a', 'book']);
  await unir(p, 'fe-m1', 'that', 'esos / esas');
  await unir(p, 'fe-m1', 'those', 'ese / esa / aquel');
  await p.check('input[name="fe-c1"][value="0"]');
  await p.click('[data-q="fe-o2"] [data-action="tts"]:not([data-lento])');
  const habl = await p.evaluate(() => window.__habladas);
  ok('ordenar con audio: 🔊 lee la oración', habl.length === 1 && habl[0].texto === 'She is reading a book', JSON.stringify(habl));
  ok('4/4 respondidas y «Enviar» activo', (await texto(p, '#exam-count')).startsWith('4/4') && !(await p.isDisabled('#exam-send')), await texto(p, '#exam-count'));
  await p.screenshot({ path: 'ordenar-emparejar-390.png', fullPage: true });
  await p.locator('[data-q="fe-o1"]').screenshot({ path: 'ordenar-390.png', style: OCULTAR_BARRAS });
  await p.locator('[data-q="fe-m1"]').screenshot({ path: 'emparejar-390.png', style: OCULTAR_BARRAS });
  ok('a 390 px no hay desborde horizontal', await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), String(await p.evaluate(() => document.documentElement.scrollWidth)));
  await p.click('#exam-send');
  await p.waitForSelector('.score', { timeout: 60000 });
  const res = await texto(p, '#content');
  ok('calificación 2/4 (50 %)', (await texto(p, '.score')).includes('50'), await texto(p, '.score'));
  ok('revisión: lo que armó y la oración correcta', res.includes('✗ I going travel tomorrow') && res.includes('✓ I will travel tomorrow'));
  ok('revisión: pares propios y correctos', res.includes('that → esos / esas') && res.includes('✓ this → este / esta · these → estos / estas · that → ese / esa / aquel · those → esos / esas'));
  await p.screenshot({ path: 'ordenar-emparejar-resultado-390.png', fullPage: true });

  // 6) Corrección: las correctas fijas y armadas; solo se vuelven a hacer las 2 falladas.
  await p.click(`.exam-bar [data-action="abrir-item"][data-id="${ID}"]`);
  await p.waitForSelector('#exam-form', { timeout: 60000 });
  if (await p.$('[data-action="ver-todas"]')) await p.click('[data-action="ver-todas"]');
  ok('corrección: 2 por corregir', (await texto(p, '#exam-count')).includes('/2'), await texto(p, '#exam-count'));
  ok('corrección: «Antes respondiste» con lo que armó', (await texto(p, '[data-q="fe-o1"] .antes')).includes('I going travel tomorrow'));
  ok('corrección: la oración correcta queda fija y armada', (await p.$$eval('.q.fija[data-q="fe-o2"] .ord-linea .ficha', xs => xs.map(x => x.textContent + (x.disabled ? '' : '!')))).join(' ') === 'She is reading a book');
  await tocar(p, 'fe-o1', ['tomorrow', 'I', 'will', 'travel']); // otro orden aceptado
  // Los pares de nuevo: se deshacen los cruzados del intento anterior (no se guardan en la corrección).
  for (const [a, c] of [['this', 'este / esta'], ['these', 'estos / estas'], ['that', 'ese / esa / aquel'], ['those', 'esos / esas']]) await unir(p, 'fe-m1', a, c);
  await p.click('#exam-send');
  await p.waitForSelector('.score', { timeout: 60000 });
  ok('corrección: 100 % (con otro orden aceptado)', (await texto(p, '.score')).includes('100'), await texto(p, '.score'));
  const it = (await (await fetch(API + `/ingles/actividades?email=${ALUMNO}`)).json()).items.find(i => i.id === ID);
  ok('servidor: 2 intentos y mejor 100 %', it.intentosUsados === 2 && it.mejor.porcentaje === 100, JSON.stringify(it.mejor && it.mejor.porcentaje));

  // 7) Vista previa del admin: fichas y pares, sin respuestas ni borrador.
  const adm = await (await fetch(API + `/ingles/actividades/${ID}?email=admin@example.com`)).json();
  ok('admin: vista previa sin respuestas', adm.vistaPrevia === true && adm.preguntas.some(x => x.fichas) && adm.preguntas.some(x => x.derecha) && adm.preguntas.every(x => !x.palabras && !x.pares));
  const a = await abrirPagina(b, { email: 'admin@example.com', ingles: true, out, etiqueta: 'admin', ruta: '/ingles.html', esperar: ['#content .exam-card, #content section', { timeout: 60000 }] });
  await a.evaluate(id => openItem(id), ID);
  await a.waitForSelector('#exam-form', { timeout: 60000 });
  if (await a.$('[data-action="ver-todas"]')) await a.click('[data-action="ver-todas"]');
  await tocar(a, 'fe-o1', ['I']);
  await unir(a, 'fe-m1', 'this', 'este / esta');
  ok('admin: el reproductor funciona en vista previa y no guarda borrador', (await linea(a, 'fe-o1')) === 'I' && (await a.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('stald_borrador:')).length)) === 0 && (await texto(a, '#exam-form')).length > 0);
  await b.close();
  console.log(out.join('\n')); process.exit(out.some(x => x.startsWith('FAIL')) ? 1 : 0);
})().catch(e => { console.log(out.join('\n')); console.error('ERROR', e.message.slice(0, 400)); process.exit(2); });
