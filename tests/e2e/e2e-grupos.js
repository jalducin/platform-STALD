// E2E ingles-grupos contra Supabase real (tablas stald_test_*): crear grupo, alta en grupo, mover, filtrar,
// calendario por grupo, tarjeta del grupo para la alumna y resultado guardado en Postgres. Limpia al terminar.
require('./lib/entorno'); // BASE, API, DATOS, DATA, CHROME, carpeta de salida y sesión de prueba en fetch
const { chromium } = require('playwright');
const BASE = process.env.BASE, API = process.env.API;
const Q = '?api=' + encodeURIComponent(API);
const SB = process.env.SUPABASE_URL + '/rest/v1/', KEY = process.env.SUPABASE_SERVICE_KEY;
const pg = async (ruta, opts = {}) => { const r = await fetch(SB + ruta, Object.assign({ headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json', Prefer: 'return=representation' } }, opts)); const t = await r.text(); return t ? JSON.parse(t) : null; };
const api = async (ruta, email, body) => { const r = await fetch(API + ruta + (ruta.includes('?') ? '&' : '?') + 'email=' + encodeURIComponent(email), body ? { method: 'POST', headers: { 'content-type': 'text/plain' }, body: JSON.stringify(body) } : {}); return { status: r.status, body: await r.json() }; };
const out = []; const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`);
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME });
  try {
    const ctx = await b.newContext({ viewport: { width: 1100, height: 900 } });
    await ctx.addInitScript(() => (localStorage.setItem('stald_email', 'admin@example.com'), localStorage.setItem('stald_sesion_prueba', JSON.stringify({ email: 'admin@example.com', token: 'prueba:' + 'admin@example.com' }))));
    const p = await ctx.newPage(); p.on('pageerror', e => out.push('FAIL error JS: ' + e.message)); p.on('dialog', d => d.accept());
    await p.goto(BASE + '/ingles.html' + Q + '#grupos'); await p.waitForSelector('#grupos-admin', { timeout: 60000 });
    ok('admin: tarjeta 👥 Grupos con «Grupo 1» y filtro', /Grupo 1/.test(await p.textContent('#grupos-admin')) && !!(await p.$('#grupo-filtro')));
    // Crear grupo
    await p.fill('#g-nombre', 'Sábado A1'); await p.fill('#g-nivel', 'A1'); await p.fill('#g-horario', 'Sáb 10:00'); await p.fill('#g-meet', 'https://meet.google.com/abc-defg-hij');
    await p.click('#grupo-form button[type=submit]');
    await p.waitForFunction(() => /Sábado A1/.test((document.getElementById('grupos-admin') || {}).textContent || ''), null, { timeout: 15000 });
    ok('crear grupo «Sábado A1»', (await pg('stald_test_grupos?id=eq.sabado-a1&select=nombre,horario'))[0].horario === 'Sáb 10:00');
    // Validación del Meet
    await p.click('#grupos-admin summary').catch(() => {}); if (!(await p.isVisible('#g-nombre'))) await p.click('#grupos-admin summary');
    await p.fill('#g-nombre', 'Malo'); await p.fill('#g-meet', 'javascript:alert(1)'); await p.click('#grupo-form button[type=submit]'); await sleep(800);
    ok('Meet inválido se rechaza con mensaje', /https/.test(await p.textContent('#grupo-msg')));
    // Alta en grupo
    await p.goto(BASE + '/ingles.html' + Q + '#registro'); await p.waitForSelector('#alumnos-admin');
    await p.fill('#alta-nombre', 'Prueba Grupo'); await p.fill('#alta-correo', 'prueba.grupo@example.com'); await p.selectOption('#alta-grupo', 'sabado-a1');
    await p.click('#alta-alumno button[type=submit]'); await p.waitForFunction(() => /ya puede entrar/.test((document.getElementById('alta-msg') || {}).textContent || ''), null, { timeout: 20000 });
    const ins = await pg('stald_test_inscripciones?alumno=eq.prueba-grupo&select=grupo_id,desde,hasta');
    ok('alta: queda inscrita en Sábado A1 desde su lunes', ins.length === 1 && ins[0].grupo_id === 'sabado-a1' && ins[0].desde === '2026-10-05', JSON.stringify(ins));
    // Mover a Marisol a Sábado A1
    await p.selectOption('select.mover-grupo[data-alumno="Marisol"]', 'sabado-a1');
    await p.waitForFunction(() => /Marisol ahora está en Sábado A1/.test((document.getElementById('alta-msg') || {}).textContent || ''), null, { timeout: 15000 });
    ok('mover a Marisol a Sábado A1', (await pg('stald_test_inscripciones?alumno=eq.marisol&hasta=is.null&select=grupo_id'))[0].grupo_id === 'sabado-a1');
    // Filtro por grupo
    await p.selectOption('#grupo-filtro', 'sabado-a1'); await sleep(300);
    const bloques = await p.$$eval('details.student', ds => ds.map(d => d.dataset.alumno));
    ok('filtro Sábado A1: solo sus integrantes', bloques.includes('Marisol') && !bloques.includes('Angel'), bloques.join(', '));
    await p.screenshot({ path: 'grupos-admin.png', fullPage: true });
    // Calendario por grupo: la semana 2026-09-28 se asignó solo a «grupo-1» en la copia de datos
    const angel = await api('/ingles/actividades', 'angel@example.com'), mari = await api('/ingles/actividades', 'marisol@example.com');
    ok('calendario: Angel (Grupo 1) ve la semana; Marisol (Sábado A1) no', angel.body.items.some(i => i.id === 'act-2026-09-29') && !mari.body.items.some(i => i.id === 'act-2026-09-29'), angel.body.items.length + ' vs ' + mari.body.items.length);
    ok('la alumna recibe los datos de su grupo (horario y Meet)', mari.body.grupo && mari.body.grupo.nombre === 'Sábado A1' && /meet\.google/.test(mari.body.grupo.meet_url));
    // Tarjeta del grupo en su vista
    const ctx2 = await b.newContext({ viewport: { width: 390, height: 860 } }); await ctx2.addInitScript(() => (localStorage.setItem('stald_email', 'marisol@example.com'), localStorage.setItem('stald_sesion_prueba', JSON.stringify({ email: 'marisol@example.com', token: 'prueba:' + 'marisol@example.com' }))));
    const a = await ctx2.newPage(); await a.goto(BASE + '/ingles.html' + Q); await a.waitForSelector('.mi-grupo', { timeout: 30000 });
    ok('alumna: tarjeta «👥 Sábado A1» con botón al Meet', /Sábado A1/.test(await a.textContent('.mi-grupo')) && !!(await a.$('.mi-grupo a[href*="meet.google"]')));
    await a.screenshot({ path: 'grupos-alumna.png' });
    // Resultado guardado en Postgres: Angel resuelve un intento de una actividad disponible
    const it = angel.body.items.find(i => ['disponible', 'en-curso'].includes(i.estado) && i.tipo !== 'meet');
    if (it) {
      const antes = await pg('stald_test_docs?path=eq.' + encodeURIComponent('resultados/' + it.id + '/angel.json') + '&select=version,data');
      const det = await api('/ingles/actividades/' + it.id, 'angel@example.com');
      const respuestas = Object.fromEntries((det.body.preguntas || []).map(q => [q.id, q.opciones ? 0 : 'x']));
      const env = await api('/ingles/actividades/' + it.id, 'angel@example.com', { intento: det.body.intento, respuestas });
      const desp = await pg('stald_test_docs?path=eq.' + encodeURIComponent('resultados/' + it.id + '/angel.json') + '&select=version,data');
      ok('resultado de Angel guardado en Postgres (versión +1)', env.status === 200 && desp[0] && desp[0].version === (antes[0] ? antes[0].version + 1 : 1), `${it.id} v${antes[0] && antes[0].version}→v${desp[0] && desp[0].version} (${env.status})`);
    } else ok('hay una actividad disponible para Angel', false);
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
