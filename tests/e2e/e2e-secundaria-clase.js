// E2E: clase interactiva de Secundaria (openspec: secundaria-sin-notion, requisito «Clase interactiva de Secundaria»).
// Con el fixture de tests/fixtures/datos (clase sec-e2e-clase-2026-10-27-a con teoría, 2 videos de YouTube, una lectura
// y libreta) y el servidor con `--hoy 2026-10-27`: pasos «1 Teoría → 2 Video → 3 Ejercicios → 4 Libreta» con
// aria-current, reproductores youtube-nocookie lazy, «✅ Ya la hice» que se recuerda, resultado con temas y
// «Siguiente clase», 360 px en claro y oscuro, e Inglés sin cambios.
require('./lib/entorno'); // BASE, API, DATA, CHROME, carpeta de salida y sesión de prueba en fetch
const { chromium } = require('playwright');
const { abrirPagina } = require('./lib/navegador');
const out = []; const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`);
const ALUMNA = 'valeria@example.com';
const INGLES = 'marisol@example.com';
const HOY = '2026-10-27';
const CLASE = `sec-e2e-clase-${HOY}-a`;
const sinScrollH = p => p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
const pasoActual = p => p.$eval('[data-sec-paso][aria-current="step"]', b => b.dataset.secPaso).catch(() => null);

async function abrirClase(p) {
  await p.click(`#sec-hoy [data-sec-item="${CLASE}"] [data-action="abrir-item"]`);
  await p.waitForSelector('.sec-pasos', { timeout: 60000 });
}

(async () => {
  const r = await fetch(process.env.API + '/secundaria/actividades?email=' + encodeURIComponent(ALUMNA)).then(x => x.json());
  if (r.hoy !== HOY) { console.log(`OMIT el servidor corre con hoy ${r.hoy}; esta prueba necesita --hoy ${HOY}`); process.exit(0); }

  const b = await chromium.launch({ executablePath: process.env.CHROME });
  for (const tema of ['dark', 'light']) { // oscuro primero: en claro se envía la clase
    const suf = tema === 'dark' ? ' (oscuro)' : '';
    const p = await abrirPagina(b, { email: ALUMNA, viejo: true, out, dialogos: 'aceptar', viewport: { width: 360, height: 780 }, contexto: { colorScheme: tema }, ruta: '/ingles.html?modo=secundaria', esperar: '#sec-clases' });
    await abrirClase(p);
    const pasos = await p.$$eval('[data-sec-paso]', xs => xs.map(x => ({ id: x.dataset.secPaso, t: x.textContent.replace(/\s+/g, ' ').trim(), dis: x.disabled, alto: x.getBoundingClientRect().height })));
    ok('pasos «1 Teoría → 2 Video → 3 Ejercicios → 4 Libreta»' + suf, pasos.map(x => x.t).join(' | ') === '1Teoría | 2Video | 3Ejercicios | 4Libreta' && pasos.every(x => !x.dis), JSON.stringify(pasos.map(x => x.t)));
    ok('botones de paso de al menos 44 px' + suf, pasos.every(x => x.alto >= 44), pasos.map(x => Math.round(x.alto)).join(','));
    const banner = (await p.textContent('.sec-mision-banner')).replace(/\s+/g, ' ');
    ok('banner «⚔️ Misión» con su materia y su mundo (comun/gamificacion.js)' + suf, banner.includes('Misión') && banner.includes('Matemáticas') && banner.includes('Valle de los Números') && banner.includes('Aritmética'), banner);
    ok('al abrir, el paso actual es Teoría' + suf, (await pasoActual(p)) === 'teoria', String(await pasoActual(p)));
    const iframes = await p.$$eval('#sec-paso-video iframe', xs => xs.map(x => ({ src: x.getAttribute('src'), lazy: x.getAttribute('loading'), title: x.title })));
    ok('2 videos incrustados con youtube-nocookie y loading="lazy"' + suf, iframes.length === 2 && iframes.every(x => x.src.startsWith('https://www.youtube-nocookie.com/embed/') && x.lazy === 'lazy' && x.title), JSON.stringify(iframes));
    ok('ids de YouTube de watch?v= y youtu.be', iframes.map(x => x.src.split('/').pop()).join() === 'dQw4w9WgXcQ,aqz-KE-bpKQ');
    ok('la lectura queda como botón-enlace' + suf, !!(await p.$('#sec-paso-video .sec-enlaces a.btn[href="https://es.khanacademy.org/math"]')));
    ok('videos sin scroll horizontal a 360 px' + suf, await sinScrollH(p));
    if (tema === 'light') {
      await p.screenshot({ path: 'secundaria-clase-pasos.png' });
      // Ir a «Ejercicios» desde el indicador.
      await p.click('[data-sec-paso="ejercicios"]');
      const llego = await p.waitForFunction(() => { const b = document.querySelector('[data-sec-paso][aria-current="step"]'); return b && b.dataset.secPaso === 'ejercicios'; }, null, { timeout: 5000 }).then(() => true, () => false);
      ok('el indicador sigue al paso visible (Ejercicios)', llego, String(await pasoActual(p)));
      // Libreta: marcar, volver y reabrir → sigue marcada; la clave no lleva el correo.
      await p.check(`#sec-paso-libreta [data-sec-libreta="${CLASE}"]`);
      const claves = await p.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('stald_libreta:')));
      ok('«✅ Ya la hice» se guarda en el aparato sin el correo', claves.length === 1 && !claves[0].includes('@'), JSON.stringify(claves));
      await p.click('#sec-paso-ejercicios [data-action="volver"]');
      await p.waitForSelector('#sec-clases', { timeout: 60000 });
      await abrirClase(p);
      ok('al reabrir la clase, la libreta sigue marcada', await p.isChecked(`#sec-paso-libreta [data-sec-libreta="${CLASE}"]`));
      // Resolver todo bien y enviar.
      if (await p.$('[data-action="ver-todas"]')) await p.click('[data-action="ver-todas"]');
      for (const id of await p.$$eval('#exam-form [data-q]', xs => xs.map(x => x.dataset.q))) await p.check(`input[name="${id}"][value="0"]`);
      await p.click('#exam-send');
      await p.waitForSelector('.score', { timeout: 60000 });
      ok('resultado: «¡Misión cumplida!» y la calificación', (await p.textContent('.exam-card h3')).includes('Misión cumplida') && (await p.textContent('.score')).includes('100'));
      const xp = await p.$eval('#sec-recompensa', s => ({ xp: s.querySelector('[data-sec-xp]').dataset.secXp, t: s.textContent.replace(/\s+/g, ' '), nivel: s.querySelector('[data-sec-nivel]').dataset.secNivel })).catch(() => null);
      // 100 % a tiempo = 100 + 20 (reglas de comun/gamificacion.js); antes no tenía XP de esta misión.
      ok('resultado: «+120 XP», nivel y rango', xp && xp.xp === '120' && xp.t.includes('+120 XP') && /Nivel \d+/.test(xp.t) && xp.t.includes('XP para el nivel'), JSON.stringify(xp));
      // Insignias nuevas con las reglas de comun/gamificacion.js: un estado de antes sin envíos y uno de después con
      // la misión al 100 % → «Primera misión» y «100 % en una clase». Y la recompensa solo sale para el envío.
      const insig = await p.evaluate(() => {
        const guardado = [state.act, state.actAntes];
        const hoy = state.act.hoy;
        state.actAntes = { id: 'x', act: { items: [], hoy, racha: 0 } };
        state.act = { hoy, racha: 0, items: [{ id: 'x', estado: 'completo', intentosUsados: 1, fechaLimite: hoy, mejor: { porcentaje: 100, correctas: 2, total: 2, secciones: [] } }] };
        const html = recompensaMision('x');
        const otra = recompensaMision('x'); // ya se consumió
        state.actAntes = { id: 'y', act: guardado[0] };
        const ajena = recompensaMision('x'); // de otra misión
        [state.act, state.actAntes] = guardado;
        return { html, otra, ajena };
      });
      ok('recompensa: insignias desbloqueadas («Primera misión», «100 % en una clase»)', insig.html.includes('¡Insignia desbloqueada!') && insig.html.includes('Primera misión') && insig.html.includes('100 % en una clase'));
      ok('recompensa: solo una vez y solo para la misión enviada', insig.otra === '' && insig.ajena === '');
      ok('resultado: retroalimentación por tema', (await p.textContent('#content')).includes('Fracciones') && (await p.textContent('#content')).includes('¡Muy bien!'));
      ok('resultado: la libreta con su casilla marcada', await p.isChecked(`#sec-resultado-libreta [data-sec-libreta="${CLASE}"]`));
      const sig = await p.$eval('.sec-siguiente', x => ({ id: x.dataset.id || '', t: x.textContent.replace(/\s+/g, ' ').trim(), alto: x.getBoundingClientRect().height }));
      ok('«Siguiente clase» apunta a otra clase pendiente', sig.id && sig.id !== CLASE && sig.t.startsWith('Siguiente misión'), JSON.stringify(sig));
      ok('«Siguiente clase» es un botón grande (≥ 44 px)', sig.alto >= 44, String(sig.alto));
      ok('resultado sin scroll horizontal a 360 px', await sinScrollH(p));
      await p.screenshot({ path: 'secundaria-clase-resultado.png', fullPage: true });
      await p.click('.sec-siguiente');
      await p.waitForSelector('#exam-form', { timeout: 60000 });
      ok('«Siguiente clase» abre esa clase', (await p.getAttribute('#exam-form', 'data-id')) === sig.id);
      ok('«Siguiente clase» es la siguiente por fecha (la otra de hoy)', sig.id === `sec-e2e-clase-${HOY}-b`, sig.id);
      // Esa clase no trae videos: el paso «Video» queda deshabilitado y los demás no.
      const dis = await p.$$eval('[data-sec-paso]', xs => xs.map(x => x.dataset.secPaso + ':' + x.disabled).join());
      ok('un paso sin contenido queda deshabilitado (Video)', dis.includes('video:true') && dis.includes('ejercicios:false'), dis);
    } else {
      const fondo = await p.evaluate(() => getComputedStyle(document.body).backgroundColor);
      ok('modo oscuro: fondo oscuro', fondo.match(/\d+/g).slice(0, 3).every(n => Number(n) < 60), fondo);
      const actual = await p.$eval('[data-sec-paso][aria-current="step"]', x => [getComputedStyle(x).color, getComputedStyle(x).backgroundColor]);
      ok('modo oscuro: el paso actual se distingue', actual[0] !== actual[1], actual.join(' / '));
      await p.screenshot({ path: 'secundaria-clase-pasos-oscuro.png' });
    }
    await p.context().close();
  }

  // Sin almacenamiento (localStorage bloqueado): la clase abre y la casilla funciona aunque no se recuerde.
  const sinAlm = await abrirPagina(b, { email: ALUMNA, viejo: true, out, init: [() => {
    const roto = () => { throw new Error('bloqueado'); };
    Object.defineProperty(window, 'localStorage', { configurable: true, get: () => ({ getItem: roto, setItem: roto, removeItem: roto, key: roto, get length() { return 0; } }) });
  }, null], ruta: '/ingles.html?modo=secundaria' });
  const abrio = await sinAlm.waitForSelector('#sec-clases [data-action="abrir-item"]', { timeout: 60000 }).then(() => true, () => false);
  if (abrio) {
    await sinAlm.click(`[data-sec-item="sec-e2e-clase-${HOY}-b"] [data-action="abrir-item"]`).catch(() => {});
    const casilla = await sinAlm.waitForSelector('[data-sec-libreta]', { timeout: 60000 }).catch(() => null);
    if (casilla) { await casilla.check(); ok('sin almacenamiento: la casilla funciona', await casilla.isChecked()); }
    else ok('sin almacenamiento: la clase abre', !!(await sinAlm.$('.sec-pasos')));
  } else {
    ok('sin almacenamiento: la página no se rompe (avisa o pide entrar)', !!(await sinAlm.$('#login, #content')));
  }
  await sinAlm.context().close();

  // Inglés: sin pasos ni reproductores incrustados.
  const ing = await abrirPagina(b, { email: INGLES, viejo: true, out, ruta: '/ingles.html', esperar: '#content' });
  const boton = await ing.waitForSelector('[data-action="abrir-item"]', { timeout: 60000 }).catch(() => null);
  if (boton) {
    await boton.click();
    await ing.waitForSelector('#exam-form, .exam-card', { timeout: 60000 });
    ok('Inglés: la actividad se ve como antes (sin pasos ni iframes)', !(await ing.$('.sec-pasos')) && !(await ing.$('iframe')));
  } else {
    ok('Inglés: el modo Secundaria está apagado', await ing.evaluate(() => MODO_SECUNDARIA === false));
  }
  await b.close();
  console.log(out.join('\n')); process.exit(out.some(x => x.startsWith('FAIL')) ? 1 : 0);
})().catch(e => { console.log(out.join('\n')); console.error('ERROR', e.message.slice(0, 400)); process.exit(2); });
