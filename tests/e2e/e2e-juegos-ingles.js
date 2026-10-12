// E2E de gramática de inglés en Juegos (openspec: juegos-ingles-gramatica): el selector de tema filtra, la regla
// corta aparece al fallar y la ⏳ Máquina del tiempo llega al resultado (solitario) y al podio (partida con bots).
// Capturas a 390 px (celular).
require('./lib/entorno'); // BASE, API, DATOS, DATA, CHROME, carpeta de salida y sesión de prueba en fetch
const { chromium } = require('playwright');
const fs = require('fs');
const { abrirPagina } = require('./lib/navegador');
const d = JSON.parse(fs.readFileSync(process.env.DATOS + '/ingles.json', 'utf8'));
const out = []; const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`);
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Grupos del selector (igual que juegos/ingles-gramatica.js).
const GRUPOS = { tobe: ['to be', 'to be pasado'], presente: ['to be', 'presente simple'], pasado: ['to be pasado', 'pasado simple'], futuro: ['futuro will'] };
const delGrupo = (tema) => new Set([
  ...d.verbos.filter(v => GRUPOS[tema].includes(v.tema)).map(v => v.frase),
  ...d.preguntas.filter(v => GRUPOS[tema].includes(v.tema)).map(v => v.pregunta),
]);
const oracionesDe = tema => new Set(d.oraciones.filter(o => GRUPOS[tema].includes(o.tema)).map(o => o.es));
// Máquina del tiempo: oración → { item, tiempo } y las tres formas de cada oración.
const formas = it => ({ presente: `${it.sujeto} ${it.presente} ${it.resto}`, pasado: `${it.sujeto} ${it.pasado} ${it.resto}`, futuro: `${it.sujeto} will ${it.verbo} ${it.resto}` });
const porOracion = new Map();
for (const it of d.tiempos) for (const [t, s] of Object.entries(formas(it))) porOracion.set(s, { it, t });
const TXT_T = { pasado: '⏪ Pasado', presente: '▶️ Presente', futuro: '⏩ Futuro' };

const textosOpciones = (p, sel = '[data-opt]') => p.$$eval(sel, bs => bs.map(b => b.childNodes[b.childNodes.length - 1].textContent.trim()));
async function inicio(p) {
  if (await p.$('[data-a="salir"]')) await p.click('[data-a="salir"]');
  await p.waitForSelector('[data-juego]');
}
// Respuesta correcta de la pregunta de la Máquina del tiempo que está en pantalla.
async function correctaTiempos(p) {
  const q = (await p.textContent('.q-card .q')).trim(), sub = (await p.textContent('.q-card .sub')).trim();
  const x = porOracion.get(q); if (!x) return null;
  if (/En qué tiempo/.test(sub)) return TXT_T[x.t];
  const destino = /PASADO/.test(sub) ? 'pasado' : /PRESENTE/.test(sub) ? 'presente' : 'futuro';
  return formas(x.it)[destino];
}

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME });
  const p = await abrirPagina(b, { email: 'marisol@example.com', tiempo: 0.25, out, ruta: '/juegos.html', esperar: '[data-juego]', dialogos: 'aceptar' });

  // ---- Catálogo ----
  ok('hub: ⏳ Máquina del tiempo en Inglés', !!(await p.$('.cat-ingles[data-juego="en-tiempos"]')) && /Máquina del tiempo/.test(await p.textContent('[data-juego="en-tiempos"]')));

  // ---- Selector de tema en Completa y responde ----
  await p.click('[data-juego="en-frases"]'); await p.waitForSelector('[data-tema]');
  const temas = await p.$$eval('[data-tema]', bs => bs.map(x => x.dataset.tema));
  ok('selector: Todo · To be · Presente · Pasado · Futuro', JSON.stringify(temas) === JSON.stringify(['todo', 'tobe', 'presente', 'pasado', 'futuro']), temas.join(','));
  await p.screenshot({ path: 'ingles-selector.png' });
  await p.click('[data-tema="pasado"]'); await p.waitForSelector('[data-opt]');
  const pasado = delGrupo('pasado'), vistas = [];
  let errorVisto = '';
  for (let k = 0; k < 6; k++) {
    await p.waitForSelector('.opt:not(.ok):not(.bad)', { timeout: 10000 });
    const q = (await p.textContent('.q-card .q')).trim(); vistas.push(q);
    const frase = d.verbos.find(v => v.frase === q);
    if (frase && !errorVisto) {
      // Equivocarse a propósito: la regla corta aparece en la retroalimentación.
      const ops = await textosOpciones(p); const mala = ops.findIndex(o => o !== frase.opciones[frase.correcta]);
      await p.click(`[data-opt="${mala}"]`); await p.waitForSelector('#fb.bad');
      errorVisto = (await p.textContent('#fb')).trim();
      ok('error en frase: muestra la frase correcta y la regla corta', errorVisto.includes('📌') && errorVisto.includes(frase.regla) && errorVisto.includes(frase.frase.replace('___', frase.opciones[frase.correcta])), errorVisto);
      await p.screenshot({ path: 'ingles-frases-error.png' });
      await sleep(1600);
    } else {
      await p.click('[data-opt="0"]'); await sleep(1600);
    }
  }
  ok('tema Pasado: solo frases y preguntas en pasado', vistas.every(q => pasado.has(q)), vistas.filter(q => !pasado.has(q)).join(' | ').slice(0, 160));
  ok('tema Pasado: hubo una frase para ver la regla', !!errorVisto);
  await inicio(p);

  // ---- Selector en Ordena la oración (Futuro) ----
  await p.click('[data-juego="en-ordena"]'); await p.waitForSelector('[data-tema="futuro"]');
  await p.click('[data-tema="futuro"]'); await p.waitForSelector('[data-poner]');
  const pista = (await p.textContent('.q-card .sub')).replace('💬', '').trim();
  ok('Ordena con tema Futuro: la oración es de futuro con will', oracionesDe('futuro').has(pista), pista);
  // Revisar en desorden dos veces: la regla de orden aparece
  for (let k = 0; k < 2; k++) {
    while (await p.$('[data-poner]')) await p.click('[data-poner]');
    // El orden que quedó puede ser el correcto por azar; se fuerza el desorden con las dos primeras al revés.
    const puestas = await p.$$eval('[data-quitar]', bs => bs.map(x => x.textContent));
    const meta = d.oraciones.find(o => o.es === pista).en.split(/\s+/);
    if (JSON.stringify(puestas) === JSON.stringify(meta)) { await p.click('[data-ord="borrar"]'); const ws = await p.$$('[data-poner]'); await ws[ws.length - 1].click(); while (await p.$('[data-poner]')) await p.click('[data-poner]'); }
    await p.click('[data-ord="revisar"]'); await p.waitForSelector('#fb.bad');
    if (k === 0) await p.click('[data-ord="borrar"]');
  }
  const fbOrd = (await p.textContent('#fb')).trim();
  ok('Ordena: al fallar muestra la oración y la regla del futuro', fbOrd.includes('Era:') && fbOrd.includes('📌 Futuro: sujeto + will'), fbOrd);
  await sleep(2000);
  await inicio(p);

  // ---- Máquina del tiempo en solitario ----
  await p.click('[data-juego="en-tiempos"]'); await p.waitForSelector('.q-card .q');
  ok('Máquina: primero pregunta en qué tiempo está, con 3 opciones', /En qué tiempo/.test(await p.textContent('.q-card .sub')) && (await p.$$('[data-opt]')).length === 3);
  // Paso 0 mal a propósito
  {
    const bien = await correctaTiempos(p); const ops = await textosOpciones(p);
    await p.click(`[data-opt="${ops.findIndex(o => o !== bien)}"]`); await p.waitForSelector('#fb.bad');
    const fb = (await p.textContent('#fb')).trim();
    ok('Máquina: el error explica el tiempo («Está en …»)', /Está en (pasado|presente|futuro)/.test(fb), fb);
    await p.screenshot({ path: 'ingles-tiempos-error.png' });
    await sleep(1600);
  }
  // Paso 1: cámbiala; luego varias correctas para ver la racha y una mala de conversión
  let racha = false, conversionMal = '';
  const t0 = Date.now();
  while (!(await p.$('.result .score')) && Date.now() - t0 < 60000) {
    const o = await p.$('.opt:not(.ok):not(.bad)'); if (!o) { await sleep(150); continue; }
    try {
      const sub = (await p.textContent('.q-card .sub')).trim();
      const bien = await correctaTiempos(p); const ops = await textosOpciones(p);
      if (bien === null) { await sleep(150); continue; }
      const conv = /Cámbiala/.test(sub);
      if (conv && racha && !conversionMal) {
        if (!(await p.$('.opt.ok'))) await p.screenshot({ path: 'ingles-tiempos-pregunta.png' });
        await p.click(`[data-opt="${ops.findIndex(x => x !== bien)}"]`); await p.waitForSelector('#fb.bad', { timeout: 3000 });
        conversionMal = (await p.textContent('#fb')).trim();
        await sleep(1500);
      } else {
        await p.click(`[data-opt="${ops.indexOf(bien)}"]`);
        const fb = await p.waitForSelector('#fb.ok', { timeout: 3000 }).then(h => h.textContent()).catch(() => '');
        if (/racha ×3/.test(fb)) racha = true;
        await sleep(650);
      }
    } catch (e) { await sleep(150); /* se volvió a dibujar */ }
  }
  ok('Máquina: racha 🔥 con respuestas seguidas', racha);
  ok('Máquina: error al convertir muestra la forma correcta y la regla', conversionMal.includes('Es: ') && conversionMal.includes('📌'), conversionMal);
  await p.waitForSelector('.result .score', { timeout: 60000 });
  const res = (await p.textContent('.result')).replace(/\s+/g, ' ');
  ok('Máquina: termina, guarda y dice lo que más se complicó', res.includes('a tus individuales') && res.includes('Lo que más se te complicó') && /Reconocer el|Pasado|Presente|Futuro|Was|Am \/ is/.test(res), res.slice(0, 200));
  await p.screenshot({ path: 'ingles-tiempos-resultado.png', fullPage: true });
  await p.click('[data-a="hub"]');

  // ---- Partidas: selector de tema al crear y Máquina del tiempo con bots ----
  await p.click('[data-tab="partidas"]'); await p.waitForSelector('#f-crear');
  const opcionesJuego = await p.$$eval('#p-juego option', os => os.map(o => o.value));
  ok('partidas: se puede crear la Máquina del tiempo', opcionesJuego.includes('en-tiempos'));
  await p.selectOption('#p-juego', 'en-frases');
  ok('partidas: Tema visible para Completa y responde', !(await p.$eval('#p-tema-wrap', e => e.hidden)));
  await p.selectOption('#p-tema', 'futuro');
  await p.screenshot({ path: 'ingles-sala-tema.png' });
  await p.click('#f-crear button[type=submit]'); await p.waitForSelector('[data-p="empezar"]', { timeout: 30000 });
  const temaSala = await p.evaluate(() => sala.estado.sala.opciones.tema);
  ok('sala de Completa y responde: guarda opciones.tema = futuro y lo muestra', temaSala === 'futuro' && /Futuro \(will\)/.test(await p.textContent('.play-top .t')), temaSala);
  const futuro = delGrupo('futuro');
  const qsFuturo = await p.evaluate(() => sala.contenido.map(q => q.q));
  ok('sala con tema Futuro: las 10 preguntas son de futuro con will', qsFuturo.length === 10 && qsFuturo.every(q => futuro.has(q)), qsFuturo.filter(q => !futuro.has(q)).join(' | ').slice(0, 160));
  await p.click('[data-a="salir"]'); await p.waitForSelector('[data-tab="partidas"]');
  await p.click('[data-tab="partidas"]'); await p.waitForSelector('#f-crear');
  await p.selectOption('#p-juego', 'en-tiempos');
  ok('partidas: el Tema se oculta para la Máquina del tiempo', await p.$eval('#p-tema-wrap', e => e.hidden));
  await p.click('#f-crear button[type=submit]'); await p.waitForSelector('[data-p="empezar"]', { timeout: 30000 });
  ok('sala de espera: anfitriona + 2 bots', (await p.$$('.rank li')).length === 3);
  await p.click('[data-p="empezar"]');
  await p.waitForSelector('[data-pq="0"]', { timeout: 20000 });
  const contenido = await p.evaluate(() => sala.contenido.map(q => ({ q: q.q, sub: q.sub, opciones: q.opciones, correcta: q.correcta, dato: q.dato })));
  ok('partida: 10 preguntas, en pares (tiempo y conversión), con regla', contenido.length === 10 && contenido.every((q, i) => (i % 2 ? /Cámbiala/ : /En qué tiempo/).test(q.sub) && q.dato), contenido.map(q => q.sub).join(' | ').slice(0, 160));
  const respondidas = new Set(); let revelacion = '';
  const t1 = Date.now();
  while (Date.now() - t1 < 120000 && !(await p.$('.result'))) {
    try {
      const btn = await p.$('[data-pq]');
      if (btn) {
        const q = Number(await btn.getAttribute('data-pq'));
        // Las pares, bien; las nones, mal (para el resumen de fallos).
        const idx = q % 2 ? (contenido[q].correcta + 1) % contenido[q].opciones.length : contenido[q].correcta;
        if (!respondidas.has(q)) { await p.click(`[data-pq="${q}"][data-po="${idx}"]`); respondidas.add(q); }
      } else if (!revelacion && /Respuesta correcta/.test(await p.textContent('#p-body'))) {
        revelacion = (await p.textContent('.q-card')).replace(/\s+/g, ' ');
        await p.screenshot({ path: 'ingles-sala-revelacion.png' });
      }
    } catch (e) { /* redibujado */ }
    await sleep(120);
  }
  ok('partida: la revelación muestra la regla (💡)', revelacion.includes('💡'), revelacion.slice(0, 160));
  ok('partida: llega al podio con las 10 respondidas', !!(await p.$('.result')) && respondidas.size === 10, String(respondidas.size));
  await sleep(1500);
  const podio = await p.$$eval('.rank li', ls => ls.map(l => l.textContent.replace(/\s+/g, ' ').trim()));
  ok('podio con la anfitriona y los 2 bots', podio.length === 3 && podio.some(x => x.includes('BOT-VACHIRA')) && podio.some(x => x.includes('BOT-ISAGII')), podio.join(' | '));
  await p.waitForFunction(() => /puntos de partidas/.test((document.getElementById('p-guardado') || {}).textContent || ''), null, { timeout: 15000 }).catch(() => {});
  ok('partida: puntos guardados en partidas', (await p.textContent('#p-guardado')).includes('puntos de partidas'), await p.textContent('#p-guardado'));
  const fallos = (await p.textContent('#p-fallos').catch(() => '')).replace(/\s+/g, ' ');
  ok('partida: resumen de lo que más se complicó', /Lo que más se te complicó/.test(fallos), fallos.slice(0, 160));
  await p.screenshot({ path: 'ingles-sala-podio.png', fullPage: true });

  await b.close();
  console.log(out.join('\n')); process.exit(out.some(x => x.startsWith('FAIL')) ? 1 : 0);
})().catch(e => { console.log(out.join('\n')); console.error('ERROR', e.message.slice(0, 300)); process.exit(2); });
