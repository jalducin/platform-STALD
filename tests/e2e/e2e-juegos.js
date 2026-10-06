// E2E de la plataforma de juegos: los 14 juegos terminan y guardan; récord, ranking, invitado y panel admin.
require('./lib/entorno'); // BASE, API, DATOS, DATA, CHROME, carpeta de salida y sesión de prueba en fetch
const { chromium } = require('playwright');
const { abrirPagina } = require('./lib/navegador');
const fs = require('fs');
const BASE = process.env.BASE;
const API = process.env.API;
const Q = '?api=' + encodeURIComponent(API);
const DATOS = process.env.DATOS; // carpeta juegos/datos
const ingles = JSON.parse(fs.readFileSync(DATOS + '/ingles.json', 'utf8'));
const espanol = JSON.parse(fs.readFileSync(DATOS + '/espanol.json', 'utf8'));
const out = []; const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`);
const sleep = ms => new Promise(r => setTimeout(r, ms));

// verificador falso (plataforma-login); sin email abre como invitado
const nuevaPagina = (b, email) => abrirPagina(b, { email, tiempo: 0.08, out, etiqueta: '', dialogos: 'aceptar' });
const enResultado = p => p.waitForSelector('.result .score', { timeout: 60000 });

async function jugarHastaFin(p, id, accion) {
  await p.click(`[data-juego="${id}"]`);
  const t0 = Date.now();
  while (!(await p.$('.result .score')) && Date.now() - t0 < 60000) { await accion(p).catch(() => {}); await sleep(150); }
  await enResultado(p);
  const txt = (await p.textContent('.result')).replace(/\s+/g, ' ');
  return txt;
}
const clicOpcion = async p => { const o = await p.$('.opt:not(.ok):not(.bad)'); if (o) await o.click(); };

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME });
  let p = await nuevaPagina(b, 'marisol@example.com');
  await p.goto(BASE + '/juegos.html' + Q);
  await p.waitForSelector('[data-juego]', { timeout: 60000 });
  ok('hub: 21 juegos (fusión del Sprint 4) en 5 categorías', (await p.$$('[data-juego]')).length === 21 && (await p.$$('main h2')).length === 5);
  ok('chip con el nombre', (await p.textContent('#chip')).includes('Marisol'));
  await p.screenshot({ path: 'juegos-hub.png', fullPage: true });

  const quizReloj = ['en-vocab', 'en-frases', 'es-ortografia', 'mente-calculo'] // fusión del Sprint 4;
  for (const id of quizReloj) {
    const txt = await jugarHastaFin(p, id, clicOpcion);
    ok(`${id}: termina y guarda`, txt.includes('a tus individuales') && !txt.includes('No se guardaron'), txt.slice(0, 90));
    await p.click('[data-a="hub"]');
  }
  // Primer juego: récord personal
  // (en-vocab ya se jugó; se revisa que el hub muestre su mejor)
  ok('hub muestra el mejor de la semana', (await p.$$('.game .best')).length >= 1);

  // Vidas: cultura (elige "Todas") y secuencias
  await p.click('[data-juego="cultura"]'); await p.waitForSelector('[data-cat]');
  ok('cultura: 11 maratones para elegir (con IA y Tecnología)', (await p.$$('[data-cat]')).length === 11);
  await p.click('[data-cat="todas"]');
  { const t0 = Date.now(); while (!(await p.$('.result .score')) && Date.now() - t0 < 60000) { await clicOpcion(p).catch(() => {}); await sleep(200); } }
  await enResultado(p);
  ok('cultura: termina y guarda', (await p.textContent('.result')).includes('a tus individuales'));
  await p.click('[data-a="hub"]');
  // mente-secuencias se fusionó con mente-calculo (openspec: juegos-fusion)

  // Spelling (respuestas equivocadas) con pista
  {
    await p.click('[data-juego="en-spelling"]'); await p.waitForSelector('#sp-in');
    await p.click('[data-sp="pista"]');
    ok('spelling: pista con traducción', (await p.textContent('#sp-pista')).includes('letras'));
    const t0 = Date.now();
    while (!(await p.$('.result .score')) && Date.now() - t0 < 60000) {
      const inp = await p.$('#sp-in:not([disabled])');
      const btn = await p.$('#sp-form button:not([disabled])');
      if (inp && btn) { try { await inp.fill('xyz'); await btn.click(); } catch (e) { /* se volvió a dibujar */ } }
      await sleep(300);
    }
    await enResultado(p);
    ok('en-spelling: termina y guarda', (await p.textContent('.result')).includes('a tus individuales'));
    await p.click('[data-a="hub"]');
  }

  // Memorama resuelto con el diccionario
  {
    await p.click('[data-juego="en-memorama"]'); await p.waitForSelector('[data-memo]');
    const cartas = await p.$$eval('[data-memo]', bs => bs.map(x => ({ i: x.dataset.memo, txt: x.textContent, em: !!x.querySelector('.em') })));
    const esToEn = new Map(ingles.vocabulario.map(v => [v.emoji + v.es, v.en]));
    for (const c of cartas.filter(c => !c.em)) {
      const par = cartas.find(x => x.em && esToEn.get(x.txt) === c.txt);
      if (!par) continue;
      await p.click(`[data-memo="${c.i}"]`); await p.click(`[data-memo="${par.i}"]`); await sleep(120);
    }
    await enResultado(p);
    const txt = (await p.textContent('.result')).replace(/\s+/g, ' ');
    ok('en-memorama: completo con 8 de 8', txt.includes('8 de 8') && txt.includes('a tus individuales'), txt.slice(0, 90));
    await p.click('[data-a="hub"]');
  }

  // Ordena (en y es) resuelto con los datos
  for (const [id, fuente] of [['en-ordena', ingles.oraciones.map(o => ({ txt: o.en, pista: o.es }))], ['es-ordena', espanol.oraciones.map(o => ({ txt: o, pista: '' }))]]) {
    await p.click(`[data-juego="${id}"]`); await p.waitForSelector('[data-poner]');
    const t0 = Date.now();
    while (!(await p.$('.result .score')) && Date.now() - t0 < 60000) {
      const chips = await p.$$eval('[data-poner]', bs => bs.map(x => x.textContent));
      if (!chips.length) { await sleep(200); continue; }
      const clave = [...chips].sort().join('|');
      const meta = fuente.find(o => o.txt.split(/\s+/).sort().join('|') === clave);
      if (!meta) { out.push('FAIL ' + id + ': no encontré la oración'); break; }
      for (const w of meta.txt.split(/\s+/)) {
        const cand = await p.$$('[data-poner]');
        for (const c of cand) { try { if ((await c.textContent()) === w) { await c.click(); break; } } catch (e) { /* redibujado */ } }
      }
      await p.click('[data-ord="revisar"]'); await sleep(1100);
    }
    await enResultado(p);
    const txt = (await p.textContent('.result')).replace(/\s+/g, ' ');
    ok(`${id}: 6 de 6 correctas`, txt.includes('6 de 6') && txt.includes('a tus individuales'), txt.slice(0, 90));
    await p.click('[data-a="hub"]');
  }

  // Simón: falla y termina
  { const txt = await jugarHastaFin(p, 'mente-simon', async q => { const pad = await q.$('[data-sim]:not([disabled])'); if (pad) await pad.click(); });
    ok('mente-simon: termina y guarda', txt.includes('a tus individuales'), txt.slice(0, 80)); await p.click('[data-a="hub"]'); }
  // Sopa: encuentra una palabra y deja correr el reloj
  {
    await p.click('[data-juego="mente-sopa"]'); await p.waitForSelector('[data-r]');
    await enResultado(p);
    ok('mente-sopa: termina y guarda', (await p.textContent('.result')).includes('a tus individuales'));
    await p.click('[data-a="hub"]');
  }
  ok('chip: suma puntos de la semana', /⭐ [\d,]+/.test(await p.textContent('#chip')));

  // Ranking
  await p.click('[data-tab="ranking"]'); await p.waitForSelector('.rank li', { timeout: 30000 }).catch(() => {});
  const rank = (await p.textContent('#tab-body')).replace(/\s+/g, ' ');
  ok('ranking: Marisol con juegos y marcada como yo', rank.includes('Marisol') && !!(await p.$('.rank li.yo')), rank.slice(0, 120));
  await p.screenshot({ path: 'juegos-ranking.png' });
  ok('alumna: sin pestaña de invitados ni «🛡️ Admin»', !(await p.$('[data-tab="invitados"]')) && !(await p.$('[data-tab="admin"]')));

  // Invitado desde el portal
  p = await nuevaPagina(b, null);
  await p.goto(BASE + '/' + Q); await p.fill('#email', 'leo.invitado@example.com'); await p.click('#login-btn');
  await p.waitForSelector('#code-form:not([hidden])'); await p.fill('#code', '123456'); await p.click('#code-btn'); // enlace mágico simulado
  await p.waitForSelector('#guest:not([hidden])', { timeout: 60000 });
  ok('portal: ofrece crear la cuenta de Juegos', (await p.textContent('#guest')).includes('Crear mi cuenta de Juegos'));
  await p.click('#guest-btn'); await p.waitForSelector('#f-invitado', { timeout: 60000 });
  await p.fill('#apodo', 'Leo'); await p.click('#f-invitado button[type=submit]');
  ok('invitado: sin aceptar no entra', (await p.textContent('main')).includes('necesitas aceptar'));
  await p.fill('#apodo', 'Leo'); await p.check('#acepto'); await p.click('#f-invitado button[type=submit]');
  await p.waitForSelector('[data-juego]', { timeout: 60000 });
  ok('invitado: entra con chip INVITADO', (await p.textContent('#chip')).includes('INVITADO'));
  { const txt = await jugarHastaFin(p, 'mente-calculo', clicOpcion); ok('invitado: su partida se guarda', txt.includes('a tus individuales')); }
  await p.click('[data-a="hub"]'); await p.click('[data-tab="ranking"]'); await p.waitForSelector('.rank li');
  ok('ranking: invitado marcado', (await p.textContent('#tab-body')).includes('Leo (invitado)'));
  await p.goto(BASE + '/' + Q); await p.waitForSelector('#home:not([hidden])', { timeout: 60000 });
  ok('portal: invitado ve solo Juegos', JSON.stringify(await p.$$eval('#tiles [data-espacio]', xs => xs.map(x => x.dataset.espacio))) === '["juegos"]');

  // Admin: panel de invitados
  p = await nuevaPagina(b, 'admin@example.com');
  await p.goto(BASE + '/juegos.html' + Q); await p.waitForSelector('[data-tab="admin"]', { timeout: 60000 });
  ok('admin: Invitados vive en «🛡️ Admin» (sin pestaña suelta)', !(await p.$('[data-tab="invitados"]')));
  await p.click('[data-tab="admin"]'); await p.click('[data-adm="invitados"]'); await p.waitForSelector('#inv-tabla', { timeout: 30000 }).catch(() => {});
  ok('admin: ve al invitado con su correo', (await p.textContent('#adm-panel')).includes('leo.invitado@example.com'));
  { const dl = p.waitForEvent('download', { timeout: 15000 }); await p.click('[data-a="csv"]'); const d = await dl;
    const csv = require('node:fs').readFileSync(await d.path(), 'utf8');
    ok('admin: CSV de invitados con el invitado', d.suggestedFilename() === 'invitados-juegos.csv' && csv.includes('leo.invitado@example.com'), d.suggestedFilename()); }
  await p.screenshot({ path: 'juegos-invitados.png' });
  await b.close();
  console.log(out.join('\n')); process.exit(out.some(x => x.startsWith('FAIL')) ? 1 : 0);
})().catch(e => { console.log(out.join('\n')); console.error('ERROR', e.message.slice(0, 400)); process.exit(2); });
