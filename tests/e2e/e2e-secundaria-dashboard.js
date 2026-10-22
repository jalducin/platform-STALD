// E2E: tablero de Secundaria (openspec: secundaria-dashboard). Con el fixture de la semana 2026-10-26
// (tests/fixtures/datos/contenido/secundaria, 15 clases exclusivas de la alumna del fixture) y el servidor con
// `--hoy 2026-10-27`. La alumna envía por la API (en la copia temporal de datos) lunes Inglés 100 %, lunes Español 50 %
// (en curso) y, si nadie la hizo antes, martes Matemáticas 100 %. Corre en la misma fase que `examen-secundaria` y
// `secundaria-clase`, que también envían: lo que se espera de XP, nivel, insignias, retos, progreso y promedios sale
// de la API en ese momento y de las reglas puras (comun/gamificacion.js y comun/secundaria-datos.js, probadas en Deno).
// Revisa a 360 px, en claro y en oscuro: «🏠 Inicio» RPG, «📚 Mis materias», el admin con el mismo tablero, el
// bloque «🗓️ Mi horario» del portal (alumna, admin y falla de red) y que los botones midan al menos 44 px.
require('./lib/entorno'); // BASE, API, DATA, CHROME, carpeta de salida y sesión de prueba en fetch
require('../../comun/gamificacion.js'); // globalThis.Gamificacion
require('../../comun/secundaria-datos.js'); // globalThis.SecundariaDatos
const { chromium } = require('playwright');
const { abrirPagina } = require('./lib/navegador');
const G = globalThis.Gamificacion;
const SD = globalThis.SecundariaDatos;
const out = []; const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`);
const ALUMNA = 'valeria@example.com';
const ADMIN = 'admin@example.com';
const HOY = '2026-10-27';
const API = process.env.API;
const q = e => '?email=' + encodeURIComponent(e);
const texto = async (p, sel) => ((await p.textContent(sel)) || '').replace(/\s+/g, ' ').trim();
const sinScrollH = p => p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
// Alto mínimo de los botones visibles que coinciden con el selector (área táctil ≥ 44 px).
const altoMinimo = (p, sel) => p.$$eval(sel, xs => xs.filter(x => x.offsetParent).map(x => Math.round(x.getBoundingClientRect().height)).reduce((a, b) => Math.min(a, b), 999));
const lista = () => fetch(`${API}/secundaria/actividades${q(ALUMNA)}`).then(x => x.json());

// Envía el intento que toca por la API: `bien` respuestas correctas (opción 0) y el resto mal. Si ya está hecha (otra
// prueba de la fase la envió), no la toca.
async function enviar(id, bien) {
  const r = await fetch(`${API}/secundaria/actividades/${id}${q(ALUMNA)}`);
  const it = await r.json();
  if (r.status === 409 || (it.intento || 1) > 1) return 'ya';
  const respuestas = Object.fromEntries(it.preguntas.map((p, i) => [p.id, i < bien ? 0 : 1]));
  const res = await fetch(`${API}/secundaria/actividades/${id}${q(ALUMNA)}`, { method: 'POST', body: JSON.stringify({ intento: it.intento || 1, respuestas }) });
  return res.status;
}

(async () => {
  const r0 = await lista();
  if (r0.hoy !== HOY) { console.log(`OMIT el servidor corre con hoy ${r0.hoy}; esta prueba necesita --hoy ${HOY}`); process.exit(0); }
  const envios = [await enviar('sec-e2e-clase-2026-10-26-a', 2), await enviar('sec-e2e-clase-2026-10-26-b', 1), await enviar('sec-e2e-clase-2026-10-27-a', 2)];
  ok('API: envíos de la alumna (copia temporal de datos)', envios.every(s => s === 200 || s === 'ya'), envios.join());
  const act = await lista();
  ok('API: racha de 1 día con envío hoy', act.racha && act.racha.dias === 1 && act.racha.hoy, JSON.stringify(act.racha));
  const items = act.items;
  // Lo esperado, con las reglas puras sobre lo que devuelve la API ahora.
  // XP de clases + misiones principales evaluadas (openspec: rpg-fase2-misiones; la E2E de misiones puede evaluar una).
  const mis = await fetch(`${API}/misiones${q(ALUMNA)}`).then(x => x.json());
  const nivel = G.nivelDe(G.xpTotalConMisiones(items, mis.misiones || [], { hoy: HOY }));
  const insignias = [...G.insigniasDe({ items, hoy: HOY, racha: act.racha }), ...G.insigniasRpgDe({ items, misiones: mis.misiones || [], hoy: HOY, catalogo: mis.mundos })].map(i => i.id);
  const totalInsignias = G.INSIGNIAS.length + G.INSIGNIAS_RPG.length;
  const deHoy = SD.clasesDeHoy(items, HOY);
  const hechasHoy = deHoy.filter(G.estaHecha).length;
  const prog = SD.progresoSemana(items, HOY);
  const proms = SD.resumenMaterias(items, HOY).filter(m => m.promedio !== null).map(m => m.clave + ':' + m.promedio + ' %');
  const mateEsperada = SD.resumenMaterias(items, HOY).find(m => m.clave === 'matematicas');
  const recientes = G.actividadReciente(items, 5);
  ok('esperado: 15 clases en la semana, 3 hechas, Ciencias pendiente', prog.total === 15 && prog.hechas >= 3 && !G.estaHecha(items.find(i => i.id === 'sec-e2e-clase-2026-10-27-b')), JSON.stringify(prog));

  const b = await chromium.launch({ executablePath: process.env.CHROME });
  for (const tema of ['light', 'dark']) {
    const sufijo = tema === 'dark' ? ' (oscuro)' : '';
    const archivo = n => `secundaria-dashboard-${n}${tema === 'dark' ? '-oscuro' : ''}.png`;
    const p = await abrirPagina(b, { email: ALUMNA, viejo: true, out, viewport: { width: 360, height: 780 }, contexto: { colorScheme: tema }, ruta: '/secundaria.html', esperar: '#sec-inicio' });
    ok('secundaria.html abre en «🏠 Inicio»' + sufijo, p.url().includes('modo=secundaria') && await p.isVisible('#sec-inicio') && (await p.getAttribute('#sec-tab-inicio', 'aria-selected')) === 'true');
    ok('saludo «Hola, …» con la fecha de hoy' + sufijo, (await texto(p, '.sec-hola')).startsWith('Hola') && (await texto(p, '.sec-fecha')) === 'Martes 27 de octubre', await texto(p, '.sec-hero'));
    const tarjetas = await p.$$eval('[data-sec-card]', xs => xs.map(x => ({ id: x.dataset.secCard, estado: x.dataset.estado, chip: x.querySelector('.mat-chip').textContent.trim(), boton: (x.querySelector('.sec-btn-grande') || {}).textContent })));
    ok('Hoy te toca: Matemáticas (hecha) y Ciencias (vence hoy)' + sufijo, tarjetas.length === 2 && tarjetas[0].chip.includes('Matemáticas') && tarjetas[0].estado === 'hecha' && tarjetas[1].chip.includes('Ciencias') && tarjetas[1].estado === 'vence-hoy', JSON.stringify(tarjetas));
    ok('Hoy te toca: los estados que dan las reglas' + sufijo, tarjetas.map(t => t.estado).join() === deHoy.map(it => SD.estadoClase(it, HOY).clave).join());
    ok('botones: «Ver resultado» y «Empezar»' + sufijo, tarjetas.length === 2 && tarjetas[0].boton.includes('Ver resultado') && tarjetas[1].boton.includes('Empezar'), tarjetas.map(t => t.boton).join(' | '));
    ok('estado de la hecha con su calificación' + sufijo, (await texto(p, '[data-sec-card="sec-e2e-clase-2026-10-27-a"] .sec-estado')).includes('100 %'));
    ok(`progreso de la semana: ${prog.hechas} de ${prog.total}` + sufijo, (await texto(p, '#sec-progreso')).includes(prog.hechas + ' de ' + prog.total + ' clases hechas'), await texto(p, '#sec-progreso'));
    ok('racha: 1 día seguido' + sufijo, (await texto(p, '#sec-racha')).includes('1 día seguido'), await texto(p, '#sec-racha'));
    const prom = await p.$$eval('[data-sec-prom]', xs => xs.map(x => x.dataset.secProm + ':' + x.querySelector('.sec-prom-num').textContent.trim()));
    ok('promedio por materia (Inglés 100, Español 50, Matemáticas 100, …)' + sufijo, prom.join() === proms.join() && prom.slice(0, 3).join() === 'ingles:100 %,espanol:50 %,matematicas:100 %', prom.join());
    // Estilo RPG (openspec: gamificacion-nucleo).
    ok(`RPG: Nv. ${nivel.nivel} · ${nivel.rango} con ${nivel.xpNivel} / 300 XP` + sufijo, (await texto(p, '#rpg-rango')) === `Nv. ${nivel.nivel} · ${nivel.rango}` && (await texto(p, '#rpg-xp')) === `${nivel.xpNivel} / 300`, (await texto(p, '#rpg-rango')) + ' | ' + (await texto(p, '#rpg-xp')));
    ok('RPG: barra de XP accesible (progressbar)' + sufijo, (await p.getAttribute('.rpg-xp-barra', 'aria-valuenow')) === String(nivel.xpNivel));
    const ganadas = await p.$$eval('[data-insignia].ganada', xs => xs.map(x => x.dataset.insignia));
    ok('RPG: insignias ganadas (al menos Primera misión y 100 %)' + sufijo, ganadas.join() === insignias.join() && ganadas.includes('primera-mision') && ganadas.includes('perfecto') && (await texto(p, '#rpg-insignias')).includes(insignias.length + ' / ' + totalInsignias), ganadas.join());
    ok('RPG: racha 1 día en la barra' + sufijo, (await texto(p, '#rpg-racha')).includes('1 día'));
    ok('RPG: misión principal = Ciencias · La célula con «Empezar»' + sufijo, (await texto(p, '#rpg-mision')).includes('Misión principal activa') && (await texto(p, '#rpg-mision .rpg-mision-t')) === 'La célula' && (await texto(p, '#rpg-mision-btn')).startsWith('Empezar'), await texto(p, '#rpg-mision'));
    ok('RPG: la misión dice su mundo (Selva de la Vida)' + sufijo, (await texto(p, '#rpg-mision .rpg-mision-d')).includes('Selva de la Vida'));
    ok(`RPG: retos diarios ${hechasHoy} / ${deHoy.length} y «te falta 1»` + sufijo, (await texto(p, '#rpg-retos')) === `${hechasHoy} / ${deHoy.length}` && (await texto(p, '#rpg-retos-texto')).includes('falta 1 reto'), await texto(p, '#rpg-retos-texto'));
    ok('RPG: XP en las tarjetas (+120 hecha a tiempo, hasta +120 pendiente)' + sufijo, (await texto(p, '[data-sec-card="sec-e2e-clase-2026-10-27-a"] .rpg-xp-chip')) === '+120 XP' && (await texto(p, '[data-sec-card="sec-e2e-clase-2026-10-27-b"] .rpg-xp-chip')) === 'hasta +120 XP');
    const actv = await p.$$eval('[data-sec-act]', xs => xs.map(x => x.dataset.secAct + ':' + x.querySelector('.rpg-xp-chip').textContent.trim()));
    ok('RPG: actividad reciente con su XP' + sufijo, actv.join() === recientes.map(r => r.item.id + ':+' + r.xp + ' XP').join() && actv.includes('sec-e2e-clase-2026-10-26-b:+50 XP'), actv.join());
    ok('RPG: mundos 0 completados en el indicador' + sufijo, (await texto(p, '#sec-mundos')).includes('0 completados'));
    ok('accesos a Esta semana, Mi horario y Mis materias' + sufijo, (await p.$$eval('.sec-accesos [data-sec-tab]', xs => xs.map(x => x.dataset.secTab).join())) === 'clases,horario,materias');
    const altos = { tarjetas: await altoMinimo(p, '.sec-btn-grande'), pestanas: await altoMinimo(p, '.sec-tabs .tab'), accesos: await altoMinimo(p, '.sec-acceso'), mision: await altoMinimo(p, '#rpg-mision-btn, .rpg-btn-sec'), encabezado: await altoMinimo(p, '.app-top .home-link, .app-top .btn') };
    ok('botones de 44 px o más (tarjetas, pestañas, accesos, misión, Inicio/Juegos/tema/salir)' + sufijo, Object.values(altos).every(h => h >= 44), JSON.stringify(altos));
    const inicioBtn = await p.$eval('.app-top .home-link', a => { const s = getComputedStyle(a); return { borde: s.borderTopWidth, fondo: s.backgroundColor, padding: s.paddingLeft }; });
    ok('«← Inicio» parece botón (borde, fondo y padding)' + sufijo, inicioBtn.borde !== '0px' && inicioBtn.fondo !== 'rgba(0, 0, 0, 0)' && parseFloat(inicioBtn.padding) >= 8, JSON.stringify(inicioBtn));
    ok('Inicio: sin scroll horizontal a 360 px' + sufijo, await sinScrollH(p));
    if (tema === 'dark') {
      const fondo = await p.evaluate(() => getComputedStyle(document.body).backgroundColor);
      ok('modo oscuro: fondo oscuro', fondo.match(/\d+/g).slice(0, 3).every(n => Number(n) < 60), fondo);
    }
    await p.screenshot({ path: archivo('inicio-360'), fullPage: true });

    // Foco visible en un botón (teclado).
    await p.focus('[data-sec-card="sec-e2e-clase-2026-10-27-b"] .sec-btn-grande');
    await p.keyboard.press('Shift+Tab'); await p.keyboard.press('Tab');
    const foco = await p.evaluate(() => { const s = getComputedStyle(document.activeElement); return s.outlineStyle + ' ' + s.outlineWidth; });
    ok('foco visible en los botones' + sufijo, foco.startsWith('solid') && parseFloat(foco.split(' ')[1]) >= 2, foco);

    // 📚 Mis materias desde el acceso del Inicio.
    await p.click('.sec-accesos [data-sec-tab="materias"]');
    await p.waitForSelector('#sec-materias:not([hidden])');
    const materias = await p.$$eval('[data-sec-materia]', xs => xs.map(x => x.dataset.secMateria));
    ok('Mis materias: las 8 en orden y «Otras clases» (el examen sin materia)' + sufijo, materias.join() === 'ingles,espanol,matematicas,tecnologia,ciencias,sociales,artes,edfisica,otra', materias.join());
    const mate = await texto(p, '[data-sec-materia="matematicas"]');
    const actual = await p.$eval('[data-sec-materia="matematicas"] li[aria-current="step"]', li => li.dataset.mundo).catch(() => '');
    const mundos = await p.$$eval('[data-sec-materia="matematicas"] li[data-mundo]', xs => xs.map(x => x.dataset.mundo + ':' + x.className));
    ok('Matemáticas: hechas/total, ⭐ 100 % y mundos Valle (ahora) → Ciudad → Torre' + sufijo, mate.includes(mateEsperada.hechas + ' de ' + mateEsperada.total + ' clases hechas') && mate.includes('100 %') && /Aritmética.*Geometría.*Álgebra/.test(mate) && actual === 'Valle de los Números' && mundos.length === 3 && mundos[2].includes('mundo-bloqueado'), mate + ' | ' + mundos.join());
    ok('Mis materias: hash #materias y sin scroll horizontal' + sufijo, p.url().endsWith('#materias') && await sinScrollH(p));
    await p.screenshot({ path: archivo('materias-360'), fullPage: true });

    if (tema === 'light') {
      // Escenarios sin datos en el fixture, con las mismas funciones de dibujo de la página.
      const vacio = await p.evaluate(() => renderSecInicio({ items: [{ id: 'x', tipo: 'actividad', titulo: '🔬 Ciencias · Volcanes', materia: 'Ciencias', disponibleDesde: '2026-10-29', fechaLimite: '2026-10-30', estado: 'proximamente', intentosUsados: 0, mejor: null }], racha: { dias: 0, hoy: false } }, { hoy: '2026-10-27', nombre: 'Valeria', admin: false }));
      ok('sin clases hoy: «Hoy no tienes clases 🎉» y su próxima clase', vacio.includes('id="sec-hoy-vacio"') && vacio.includes('Hoy no tienes clases 🎉') && vacio.includes('Tu próxima clase: Jue 29 · 🔬 Ciencias'));
      const ayer = await p.evaluate(() => renderSecInicio({ items: [
        { id: 'lun', tipo: 'actividad', titulo: '📖 Español · Lunes', materia: 'Español', disponibleDesde: '2026-10-26', fechaLimite: '2026-10-27', estado: 'disponible', intentosUsados: 0, mejor: null },
        { id: 'mar', tipo: 'actividad', titulo: '📐 Matemáticas · Martes', materia: 'Matemáticas', disponibleDesde: '2026-10-27', fechaLimite: '2026-10-28', estado: 'completo', intentosUsados: 1, mejor: { porcentaje: 100, correctas: 2, total: 2, secciones: [] }, mejorATiempo: true },
      ], racha: { dias: 1, hoy: true } }, { hoy: '2026-10-27', nombre: 'Valeria', admin: false }));
      ok('lo de ayer que vence hoy cuenta en las tarjetas y en el contador (1 / 2, te falta 1)', ayer.includes('data-sec-card="lun"') && ayer.includes('>1 / 2<') && ayer.includes('falta 1 reto'));
    }
    await p.context().close();
  }

  // Abrir la clase de hoy desde la misión principal y volver al Inicio; «Ver resultado» de la hecha.
  {
    const p = await abrirPagina(b, { email: ALUMNA, viejo: true, out, viewport: { width: 360, height: 780 }, ruta: '/secundaria.html', esperar: '#sec-inicio' });
    await p.click('#rpg-mision-btn');
    ok('«Empezar» de la misión abre la clase', await p.waitForSelector('#exam-form', { timeout: 60000 }).then(() => true, () => false));
    await p.goBack(); await p.waitForSelector('#sec-inicio:not([hidden])', { timeout: 60000 });
    ok('Atrás regresa al Inicio', await p.isVisible('[data-sec-card]'));
    await p.click('[data-sec-card="sec-e2e-clase-2026-10-27-a"] [data-action="ver-resultado"]');
    ok('«Ver resultado» muestra su calificación', await p.waitForSelector('.score', { timeout: 60000 }).then(() => true, () => false));
    await p.context().close();
  }

  // Escritorio: indicadores en 3 columnas.
  {
    const p = await abrirPagina(b, { email: ALUMNA, viejo: true, out, viewport: { width: 1280, height: 900 }, ruta: '/secundaria.html', esperar: '#sec-inicio' });
    const cols = await p.$eval('.sec-kpis', el => getComputedStyle(el).gridTemplateColumns.split(' ').length);
    ok('escritorio: 3 indicadores en fila', cols === 3, String(cols));
    await p.screenshot({ path: 'secundaria-dashboard-escritorio.png', fullPage: true });
    await p.context().close();
  }

  // Admin: el mismo tablero con los datos de la alumna (solo lectura) y la pestaña de resultados.
  {
    const p = await abrirPagina(b, { email: ADMIN, viejo: true, out, viewport: { width: 360, height: 780 }, ruta: '/ingles.html?modo=secundaria&alumna=valeria', esperar: '#sec-inicio' });
    ok('admin: «Tablero de Valeria» con selector', (await texto(p, '.sec-hola')).includes('Valeria') && (await p.$eval('#sec-alumna', s => s.value)) === 'valeria', await texto(p, '.sec-hola'));
    ok('admin: mismas tarjetas de hoy', (await p.$$eval('[data-sec-card]', xs => xs.map(x => x.dataset.secCard).join())) === deHoy.map(i => i.id).join());
    ok('admin: «Vista previa» en vez de «Empezar»', (await texto(p, '[data-sec-card="sec-e2e-clase-2026-10-27-b"] .sec-btn-grande')).includes('Vista previa'));
    ok('admin: mismo progreso y nivel', (await texto(p, '#sec-progreso')).includes(prog.hechas + ' de ' + prog.total) && (await texto(p, '#rpg-rango')) === `Nv. ${nivel.nivel} · ${nivel.rango}`);
    ok('admin: pestaña «📝 Resultados»', !!(await p.$('#sec-tab-resultados')));
    ok('admin: sin scroll horizontal a 360 px', await sinScrollH(p));
    await p.screenshot({ path: 'secundaria-dashboard-admin-360.png', fullPage: true });
    await p.click('#sec-tab-resultados');
    ok('admin: resultados por clase', await p.waitForSelector('[data-sec-admin="sec-e2e-clase-2026-10-27-a"]', { timeout: 30000 }).then(() => true, () => false));
    await p.context().close();
  }

  // Portal: bloque «🗓️ Mi horario» compacto de 7 días, «Hoy te toca» destacado y botones a sus clases.
  for (const tema of ['light', 'dark']) {
    const sufijo = tema === 'dark' ? ' (oscuro)' : '';
    const p = await abrirPagina(b, { email: ALUMNA, viejo: true, out, viewport: { width: 360, height: 780 }, contexto: { colorScheme: tema }, ruta: '/', esperar: '#sec-hoy-toca' });
    ok('portal: «Hoy te toca» con Matemáticas y Ciencias' + sufijo, /Hoy te toca.*Matemáticas.*Ciencias/.test(await texto(p, '#sec-hoy-toca')), await texto(p, '#sec-hoy-toca'));
    const dias = await p.$$eval('[data-sec-mini]', xs => xs.map(x => x.dataset.secMini + (x.getAttribute('aria-current') ? '*' : '') + ':' + x.querySelectorAll('[role="img"]').length));
    ok('portal: 7 días (2,2,2,2,2,2,3) con hoy marcado' + sufijo, dias.join() === '2026-10-26:2,2026-10-27*:2,2026-10-28:2,2026-10-29:2,2026-10-30:2,2026-10-31:2,2026-11-01:3', dias.join());
    const alto = await altoMinimo(p, '#sec-portal .btn');
    ok('portal: botones «Mis clases» y «Mi horario» de 44 px o más' + sufijo, alto >= 44, String(alto));
    ok('portal: sin scroll horizontal a 360 px' + sufijo, await sinScrollH(p));
    await p.screenshot({ path: `secundaria-dashboard-portal-360${tema === 'dark' ? '-oscuro' : ''}.png`, fullPage: true });
    if (tema === 'light') {
      await p.click('#sec-portal-horario');
      await p.waitForSelector('#sec-horario:not([hidden])', { timeout: 60000 });
      ok('portal → «🗓️ Mi horario» abre esa pestaña', (await p.getAttribute('#sec-tab-horario', 'aria-selected')) === 'true');
    }
    await p.context().close();
  }
  // Portal del admin: el horario de la primera alumna de Secundaria.
  {
    const p = await abrirPagina(b, { email: ADMIN, viejo: true, out, ruta: '/', esperar: '#sec-hoy-toca' });
    ok('portal del admin: «🗓️ Horario de <alumna>» con 7 días y su enlace', (await texto(p, '#sec-portal-t')).startsWith('🗓️ Horario de') && (await p.$$('[data-sec-mini]')).length === 7 && (await p.getAttribute('#sec-portal-clases', 'href')).includes('alumna='));
    await p.context().close();
  }
  // Portal con falla de red en /secundaria/actividades: aviso corto y botón a Secundaria.
  {
    const p = await abrirPagina(b, { email: ALUMNA, viejo: true, out, etiqueta: '' });
    await p.route('**/secundaria/actividades**', r => r.abort());
    await p.goto(process.env.BASE + '/?api=' + encodeURIComponent(API));
    await p.waitForFunction(() => (document.getElementById('sec-portal') || {}).textContent?.includes('No pude cargar'), null, { timeout: 60000 }).catch(() => {});
    const aviso = await texto(p, '#sec-portal');
    ok('portal con falla: aviso corto y «📚 Mis clases»', aviso.includes('No pude cargar tu horario') && aviso.includes('Mis clases'), aviso);
    await p.context().close();
  }
  // Persona sin Secundaria: el portal no muestra el bloque.
  {
    const p = await abrirPagina(b, { email: 'marisol@example.com', viejo: true, out, ruta: '/', esperar: '#home:not([hidden])' });
    ok('portal sin Secundaria: sin bloque de horario', await p.$eval('#sec-portal', s => s.hidden));
    await p.context().close();
  }

  await b.close();
  console.log(out.join('\n')); process.exit(out.some(x => x.startsWith('FAIL')) ? 1 : 0);
})().catch(e => { console.log(out.join('\n')); console.error('ERROR', e.message.slice(0, 400)); process.exit(2); });
