// E2E ingles-ocultar-grupos (fase `grupos`, --pg; tablas stald_test_* o el PostgREST falso de lib/postgrest-falso.ts):
// el admin oculta un grupo del panel con «👁️ Ocultar del panel», sus alumnos y alumnas desaparecen de cada vista del
// admin, el interruptor «Mostrar grupos ocultos (N)» los devuelve y «Mostrar en el panel» lo revierte. Una alumna del
// grupo oculto entra, ve su grupo y su semana, entrega y su resultado se guarda. Limpia las tablas al terminar.
require('./lib/entorno'); // BASE, API, DATOS, DATA, CHROME, carpeta de salida y sesión de prueba en fetch
const { chromium } = require('playwright');
const { abrirPagina } = require('./lib/navegador');
const API = process.env.API;
const SB = process.env.SUPABASE_URL + '/rest/v1/', KEY = process.env.SUPABASE_SERVICE_KEY;
const pg = async (ruta, opts = {}) => { const r = await fetch(SB + ruta, Object.assign({ headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json', Prefer: 'return=representation' } }, opts)); const t = await r.text(); return t ? JSON.parse(t) : null; };
const api = async (ruta, email, body) => { const r = await fetch(API + ruta + (ruta.includes('?') ? '&' : '?') + 'email=' + encodeURIComponent(email), body ? { method: 'POST', headers: { 'content-type': 'text/plain;charset=UTF-8' }, body: JSON.stringify(body) } : {}); return { status: r.status, body: await r.json() }; };
const out = []; const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`);
const ADMIN = 'admin@example.com', MARISOL = 'marisol@example.com';
const bandera = async () => ((await pg('stald_test_grupos?id=eq.grupo-1&select=oculto_admin'))[0] || {}).oculto_admin === true;
const ocultarApi = oculto => api('/ingles/grupos/ocultar', ADMIN, { grupo: 'grupo-1', oculto });
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME });
  try {
    // Preparación: «Grupo 2» visible con Angel; Marisol y quien no tiene inscripción quedan en «Grupo 1».
    const g2 = await api('/ingles/grupos', ADMIN, { id: 'grupo-2', nombre: 'Grupo 2', color: '#db2777' });
    const mv = await api('/ingles/grupos/mover', ADMIN, { alumno: 'Angel', grupo: 'grupo-2' });
    // Marisol juega una partida: así aparece en el ranking de la semana.
    const jugo = await api('/juegos/partida', MARISOL, { juego: 'mente-sopa', puntos: 300, aciertos: 5, total: 10, segundos: 60 });
    ok('preparación: Grupo 2 con Angel y una partida de Marisol', g2.status === 200 && mv.status === 200 && jugo.status === 200, [g2.status, mv.status, jugo.status].join('/'));

    // Solo el admin cambia la bandera
    const ajena = await api('/ingles/grupos/ocultar', MARISOL, { grupo: 'grupo-1', oculto: true });
    ok('una alumna no puede ocultar un grupo (403 solo_admin)', ajena.status === 403 && ajena.body.error === 'solo_admin' && !(await bandera()), JSON.stringify(ajena.body));

    // Alumna del grupo oculto: con la bandera encendida nada cambia para ella
    const oc = await ocultarApi(true);
    ok('con el Grupo 1 oculto (bandera en la tabla)', oc.status === 200 && await bandera());
    const act = await api('/ingles/actividades', MARISOL);
    ok('alumna del grupo oculto: /ingles/actividades 200 con su grupo (sin la bandera)', act.status === 200 && act.body.grupo && act.body.grupo.id === 'grupo-1' && !('ocultoAdmin' in act.body.grupo) && !('oculto_admin' in act.body.grupo), JSON.stringify(act.body.grupo));
    ok('alumna del grupo oculto: ve la semana de su grupo', act.body.items.some(i => i.id === 'act-2026-09-29'), String(act.body.items.length));
    const al = await abrirPagina(b, { email: MARISOL, viejo: true, ingles: true, out, ruta: '/ingles.html' });
    await al.waitForSelector('.mi-grupo', { timeout: 60000 });
    ok('alumna del grupo oculto: su página muestra «👥 Grupo 1»', /Grupo 1/.test(await al.textContent('.mi-grupo')));
    await al.screenshot({ path: 'ocultar-grupos-alumna.png' });
    const it = act.body.items.find(i => ['disponible', 'en-curso'].includes(i.estado) && i.tipo !== 'meet');
    if (it) {
      const ruta = 'stald_test_docs?path=eq.' + encodeURIComponent('resultados/' + it.id + '/marisol.json') + '&select=version,data';
      const antes = await pg(ruta);
      const det = await api('/ingles/actividades/' + it.id, MARISOL);
      const respuestas = Object.fromEntries((det.body.preguntas || []).map(q => [q.id, q.opciones ? 0 : 'x']));
      const env = await api('/ingles/actividades/' + it.id, MARISOL, { intento: det.body.intento, respuestas });
      const desp = await pg(ruta);
      ok('alumna del grupo oculto: entrega y su resultado se guarda', env.status === 200 && env.body.guardado === true && desp[0] && desp[0].data.intentos.length === (antes[0] ? antes[0].data.intentos.length : 0) + 1, `${it.id} (${env.status})`);
    } else ok('hay una actividad disponible para Marisol', false);
    await ocultarApi(false); // el admin la oculta desde la página

    const ad = await abrirPagina(b, { email: ADMIN, viejo: true, ingles: true, out, dialogos: 'aceptar', viewport: { width: 1100, height: 900 }, ruta: '/ingles.html#grupos' });
    await ad.waitForSelector('#grupos-admin [data-action="ocultar-grupo"][data-id="grupo-1"]', { timeout: 60000 }).catch(async e => { await ad.screenshot({ path: 'ocultar-grupos-depura.png', fullPage: true }); out.push('DEPURA ' + (await ad.textContent('body')).slice(0, 400).replace(/\s+/g, ' ')); throw e; });
    ok('sin grupos ocultos no hay interruptor', !(await ad.$('#mostrar-ocultos')));
    ok('cada grupo tiene «👁️ Ocultar del panel»', (await ad.$$('#grupos-admin [data-action="ocultar-grupo"]')).length === 2 && /Ocultar del panel/.test(await ad.textContent('[data-action="ocultar-grupo"][data-id="grupo-1"]')));
    // Conteo «N con intentos» de «Esta semana» para la actividad que entregó Marisol
    const conIntentos = async () => ad.evaluate(t => { const x = [...document.querySelectorAll('.exam-item')].find(e => (e.querySelector('.t') || {}).textContent && e.querySelector('.t').textContent.includes(t) && /con intentos/.test(e.textContent)); const m = x && /(\d+) con intentos/.exec(x.textContent); return m ? Number(m[1]) : null; }, it ? it.titulo : '');
    const intentosVisible = await conIntentos();
    const enRanking = async () => !!(await ad.$('#juegos-admin tr[data-jugador="Marisol"]'));
    ok('antes de ocultar: Marisol en el ranking de juegos', await enRanking());

    // Ocultar el Grupo 1 desde la página
    await ad.click('[data-action="ocultar-grupo"][data-id="grupo-1"]');
    await ad.waitForFunction(() => /Mostrar en el panel/.test((document.querySelector('[data-action="ocultar-grupo"][data-id="grupo-1"]') || {}).textContent || ''), null, { timeout: 15000 });
    ok('la bandera queda en la tabla (oculto_admin = true)', await bandera());
    ok('«👥 Grupos» marca «oculto del panel»', !!(await ad.$('#grupos-admin [data-oculto]')));
    ok('interruptor «Mostrar grupos ocultos (1)»', /Mostrar grupos ocultos \(1\)/.test(await ad.textContent('.grupos-barra')) && !(await ad.isChecked('#mostrar-ocultos')));
    const opciones = await ad.$$eval('#grupo-filtro option', os => os.map(o => o.value));
    ok('selector de grupo sin el grupo oculto', !opciones.includes('grupo-1') && opciones.includes('grupo-2'), opciones.join(','));
    await ad.screenshot({ path: 'ocultar-grupos-admin.png', fullPage: true });

    // Vistas del admin sin Marisol (Grupo 1 oculto) y con Angel (Grupo 2)
    const alumnosVista = async () => ad.$$eval('details.student', ds => ds.map(d => d.dataset.alumno));
    let vistos = await alumnosVista();
    ok('avance («Alumnos») sin el grupo oculto', vistos.includes('Angel') && !vistos.includes('Marisol'), vistos.join(', '));
    const ultimas = await ad.$$eval('#ultimas tr[data-alumno]', ts => ts.map(t => t.dataset.alumno));
    ok('«Últimas calificaciones» sin el grupo oculto', ultimas.includes('Angel') && !ultimas.includes('Marisol'), ultimas.join(', '));
    const registro = await ad.textContent('#alumnos-admin');
    const cuenta = Number(await ad.textContent('#alumnos-admin .count'));
    ok('«Registro» sin el grupo oculto y con su contador', registro.includes('angel@example.com') && !registro.includes(MARISOL) && cuenta === 1, 'count=' + cuenta);
    ok('ranking de juegos sin el grupo oculto', !(await enRanking()));
    const intentosOculto = await conIntentos();
    ok('«Esta semana»: el conteo «con intentos» no cuenta al grupo oculto', it && intentosVisible !== null && intentosOculto !== null && intentosOculto < intentosVisible, `${intentosVisible} → ${intentosOculto}`);
    const res = await api('/ingles/resumen', ADMIN), resTodos = await api('/ingles/resumen?ocultos=1', ADMIN);
    const nombres = r => r.body.filas.map(f => f.alumno);
    ok('resumen (tablero) sin el grupo oculto; ocultos=1 lo incluye', res.status === 200 && nombres(res).includes('Angel') && !nombres(res).includes('Marisol') && nombres(resTodos).includes('Marisol') && res.body.ocultos > 0 && res.body.kpis.alumnos === res.body.filas.length, `ocultos=${res.body.ocultos}`);
    await ad.evaluate(() => { location.hash = '#resumen'; });
    await ad.waitForSelector('#kpis', { timeout: 30000 });
    const mapa = await ad.$$eval('#mapa-calor tr[data-alumno]', ts => ts.map(t => t.dataset.alumno));
    ok('mapa de calor sin el grupo oculto', !mapa.includes('Marisol'), mapa.join(', '));

    // Guion de la clase por Meet (retroalimentación por alumno o alumna)
    const guion = await ad.$('[data-action="abrir-guion"]');
    if (guion) {
      await ad.evaluate(() => document.querySelector('[data-action="abrir-guion"]').click());
      await ad.waitForFunction(() => /Retroalimentación por alumno o alumna/.test(document.getElementById('content').textContent), null, { timeout: 30000 });
      const txt = await ad.textContent('#content');
      ok('guion del Meet sin el grupo oculto', txt.includes('👤 Angel') && !txt.includes('👤 Marisol'));
      await ad.evaluate(() => { location.hash = '#grupos'; }); await ad.reload();
      await ad.waitForSelector('#mostrar-ocultos', { timeout: 60000 });
    } else ok('hay una clase por Meet con guion esta semana', false);

    // Interruptor: los muestra
    await ad.check('#mostrar-ocultos');
    await ad.waitForFunction(() => [...document.querySelectorAll('details.student')].some(d => d.dataset.alumno === 'Marisol'), null, { timeout: 15000 });
    vistos = await alumnosVista();
    const opciones2 = await ad.$$eval('#grupo-filtro option', os => os.map(o => o.value));
    ok('con el interruptor: Marisol vuelve al avance, a «Registro» y el grupo al selector', vistos.includes('Marisol') && (await ad.textContent('#alumnos-admin')).includes(MARISOL) && opciones2.includes('grupo-1'), vistos.length + ' · ' + opciones2.join(','));
    ok('con el interruptor: Marisol en el ranking y en el conteo de «Esta semana»', await enRanking() && (await conIntentos()) === intentosVisible);
    await ad.screenshot({ path: 'ocultar-grupos-interruptor.png', fullPage: true });
    // Elegir el grupo oculto en el selector y apagar el interruptor: el filtro vuelve a «Todos los grupos»
    await ad.selectOption('#grupo-filtro', 'grupo-1');
    await ad.waitForFunction(() => document.getElementById('grupo-filtro').value === 'grupo-1', null, { timeout: 15000 });
    await ad.uncheck('#mostrar-ocultos');
    await ad.waitForFunction(() => ![...document.querySelectorAll('details.student')].some(d => d.dataset.alumno === 'Marisol'), null, { timeout: 15000 });
    ok('al apagar el interruptor: se ocultan otra vez y el selector vuelve a «Todos los grupos»', (await ad.$eval('#grupo-filtro', s => s.value)) === '' && (await alumnosVista()).includes('Angel'));

    // «Mostrar en el panel» con el interruptor encendido: el interruptor se apaga solo
    await ad.check('#mostrar-ocultos');
    await ad.waitForFunction(() => [...document.querySelectorAll('details.student')].some(d => d.dataset.alumno === 'Marisol'), null, { timeout: 15000 });
    await ad.click('[data-action="ocultar-grupo"][data-id="grupo-1"]');
    await ad.waitForFunction(() => /Ocultar del panel/.test((document.querySelector('[data-action="ocultar-grupo"][data-id="grupo-1"]') || {}).textContent || ''), null, { timeout: 15000 });
    vistos = await alumnosVista();
    ok('«Mostrar en el panel»: bandera en false, sin interruptor y Marisol de vuelta', !(await bandera()) && !(await ad.$('#mostrar-ocultos')) && vistos.includes('Marisol'), vistos.length + ' alumnos');
    // Ocultarlo otra vez en la misma sesión: desaparece de inmediato (el interruptor no quedó encendido)
    await ad.click('[data-action="ocultar-grupo"][data-id="grupo-1"]');
    await ad.waitForFunction(() => /Mostrar en el panel/.test((document.querySelector('[data-action="ocultar-grupo"][data-id="grupo-1"]') || {}).textContent || ''), null, { timeout: 15000 });
    ok('volver a ocultar en la misma sesión: Marisol desaparece y el interruptor está apagado', !(await alumnosVista()).includes('Marisol') && !(await ad.isChecked('#mostrar-ocultos')));
    await ad.click('[data-action="ocultar-grupo"][data-id="grupo-1"]');
    await ad.waitForFunction(() => /Ocultar del panel/.test((document.querySelector('[data-action="ocultar-grupo"][data-id="grupo-1"]') || {}).textContent || ''), null, { timeout: 15000 });
    ok('estado final: bandera en false', !(await bandera()));
  } finally {
    // Limpieza de las tablas de prueba
    await pg('stald_test_inscripciones?alumno=neq.__', { method: 'DELETE' });
    await pg('stald_test_grupos?id=neq.__', { method: 'DELETE' });
    await pg('stald_test_docs?path=neq.__', { method: 'DELETE' });
    const quedan = (await pg('stald_test_docs?select=path')).length + (await pg('stald_test_grupos?select=id')).length;
    out.push((quedan === 0 ? 'PASS' : 'FAIL') + ' limpieza: tablas de prueba vacías ' + quedan);
    await b.close();
  }
  console.log(out.join('\n')); process.exit(out.some(x => x.startsWith('FAIL')) ? 1 : 0);
})().catch(e => { console.log(out.join('\n')); console.error('ERROR', e.message.slice(0, 300)); process.exit(2); });
