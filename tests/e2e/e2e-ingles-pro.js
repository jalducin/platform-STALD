// E2E ingles-pro (Sprint 2): alumna (anillo, racha, próxima clase, para hoy, barra inferior + Atrás, semana),
// reproductor (una pregunta por pantalla y atajos), profe (selector de grupo, mapa de calor, cajón con prórroga),
// celular 390 px sin desplazamiento horizontal y modo oscuro. Requiere el servidor con Postgres de prueba (pg.sh).
require('./lib/entorno'); // BASE, API, DATOS, DATA, CHROME, carpeta de salida y sesión de prueba en fetch
const { chromium } = require('playwright');
const BASE = process.env.BASE, API = process.env.API;
const Q = '?api=' + encodeURIComponent(API);
const out = []; const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`);
const api = async (ruta, email, body) => { const r = await fetch(API + ruta + (ruta.includes('?') ? '&' : '?') + 'email=' + encodeURIComponent(email), body ? { method: 'POST', headers: { 'content-type': 'text/plain' }, body: JSON.stringify(body) } : {}); return { status: r.status, body: await r.json() }; };
const ADMIN = 'admin@example.com';
const sinScrollX = p => p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);

async function contexto(b, email, ancho, opciones = {}) {
  const ctx = await b.newContext({ viewport: { width: ancho, height: 860 }, ...(opciones.oscuro ? { colorScheme: 'dark' } : {}) });
  await ctx.addInitScript(({ e, f }) => {
    (localStorage.setItem('stald_email', e), localStorage.setItem('stald_sesion_prueba', JSON.stringify({ email: e, token: 'prueba:' + e })));
    window.SpeechRecognition = undefined; window.webkitSpeechRecognition = undefined; // pronunciación: autoevaluación
    if (f) { const fijo = new Date(f).getTime(), D = Date; window.Date = class extends D { constructor(...a) { super(...(a.length ? a : [fijo])); } static now() { return fijo; } }; }
  }, { e: email, f: opciones.reloj || null });
  if (opciones.hoy) await ctx.route('**/ingles/actividades**', r => { const u = new URL(r.request().url()); u.searchParams.set('hoy', opciones.hoy); r.continue({ url: u.toString() }); });
  const p = await ctx.newPage(); p.on('pageerror', e => out.push('FAIL error JS (' + email + '): ' + e.message)); p.on('dialog', d => d.accept());
  return { ctx, p };
}

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME });
  // ---------- Preparación por API: dos grupos con horario y Meet ----------
  await api('/ingles/grupos', ADMIN, { nombre: 'Sábado A1', nivel: 'A1', horario: 'Sáb 10:00', meet_url: 'https://meet.google.com/abc-defg-hij', color: '#db2777' });
  await api('/ingles/grupos', ADMIN, { nombre: 'Domingo B1', nivel: 'B1', horario: 'Dom 11:00', meet_url: 'https://meet.google.com/xyz-abcd-efg', color: '#0d9488' });
  await api('/ingles/grupos/mover', ADMIN, { alumno: 'Marisol', grupo: 'sabado-a1' });
  await api('/ingles/grupos/mover', ADMIN, { alumno: 'Angel', grupo: 'domingo-b1' });

  // ---------- Alumna en celular, sábado 3 oct 9:00 (antes de su clase de las 10:00) ----------
  const { ctx: c1, p } = await contexto(b, 'marisol@example.com', 390, { reloj: '2026-10-03T09:00:00', hoy: '2026-10-03' });
  await p.goto(BASE + '/ingles.html' + Q);
  await p.waitForSelector('[data-seccion="inicio"]:not([hidden]) .hero', { timeout: 60000 });
  await p.screenshot({ path: 'pro-alumna-inicio.png', fullPage: true });
  const esperada = (await (await fetch(API + '/ingles/actividades?email=marisol%40example.com&hoy=2026-10-03')).json()).racha;
  ok('anillo de avance de la semana', /\d+ % semana/.test(await p.getAttribute('#anillo .anillo', 'aria-label')), await p.getAttribute('#anillo .anillo', 'aria-label'));
  ok('racha 🔥 del servidor', (await p.textContent('#racha')).trim() === '🔥 ' + esperada.dias, (await p.textContent('#racha')) + ' vs ' + JSON.stringify(esperada));
  ok('nivel', /Nivel A1/.test(await p.textContent('#nivel')));
  const pc = await p.textContent('.proxima-clase');
  ok('próxima clase: su grupo, cuenta regresiva y Meet', /Sábado A1/.test(pc) && /Empieza en (1 h 0 min|60 min)/.test(await p.textContent('#cuenta-regresiva')) && !!(await p.$('.proxima-clase a[href*="meet.google.com/abc"]')), pc.replace(/\s+/g, ' '));
  ok('Para hoy con acciones', (await p.$$('#para-hoy .hoy-item')).length >= 1 && (await p.$$('#para-hoy .hoy-item .btn')).length >= 1, String((await p.$$('#para-hoy .hoy-item')).length));
  ok('insignias', (await p.$$('#insignias .insignia')).length === 4);
  const barra = await p.evaluate(() => { const n = document.getElementById('nav'), r = n.getBoundingClientRect(); return { pos: getComputedStyle(n).position, abajo: Math.round(innerHeight - r.bottom), items: n.querySelectorAll('.nav-item').length, txt: n.innerText.replace(/\s+/g, ' ') }; });
  ok('barra inferior fija con 5 secciones', barra.pos === 'fixed' && barra.abajo <= 1 && barra.items === 5 && /Inicio.*Semana.*Resultados.*Juegos.*Perfil/.test(barra.txt), JSON.stringify(barra));
  const altos = await p.$$eval('#nav .nav-item, [data-seccion="inicio"] .btn', xs => xs.filter(x => x.offsetParent).map(x => Math.round(x.getBoundingClientRect().height)));
  ok('botones de al menos 44 px', altos.every(h => h >= 44), altos.join(','));
  ok('celular: inicio sin desplazamiento horizontal', await sinScrollX(p));
  // Navegación: ⭐ Resultados y Atrás
  await p.click('#nav [data-nav="resultados"]');
  await p.waitForSelector('[data-seccion="resultados"]:not([hidden])');
  ok('⭐ Resultados: dirección #resultados y pestaña marcada', new URL(p.url()).hash === '#resultados' && (await p.getAttribute('#nav [data-nav="resultados"]', 'aria-current')) === 'page' && await p.isVisible('#temas-reforzar, #tr-titulo'));
  ok('celular: resultados sin desplazamiento horizontal', await sinScrollX(p));
  await p.screenshot({ path: 'pro-alumna-resultados.png', fullPage: true });
  await p.goBack();
  await p.waitForSelector('[data-seccion="inicio"]:not([hidden])');
  ok('Atrás regresa a 🏠 Inicio', (await p.getAttribute('#nav [data-nav="inicio"]', 'aria-current')) === 'page' && await p.isHidden('[data-seccion="resultados"]'));
  // Semana: filtrar por día
  await p.click('#nav [data-nav="semana"]');
  await p.waitForSelector('#semana-linea');
  const total = (await p.$$('[data-seccion="semana"] .exam-item[data-fecha]')).length;
  await p.click('#semana-linea .dia[data-fecha="2026-09-29"]');
  const visibles = await p.$$eval('[data-seccion="semana"] .exam-item[data-fecha]', xs => xs.filter(x => !x.hidden).map(x => x.dataset.fecha));
  ok('semana L–D: tocar un día filtra la lista', visibles.length >= 1 && visibles.length < total && visibles.every(f => f === '2026-09-29'), visibles.join(',') + ' de ' + total);
  ok('celular: semana sin desplazamiento horizontal', await sinScrollX(p));
  await p.screenshot({ path: 'pro-alumna-semana.png', fullPage: true });
  // Perfil: modo oscuro
  await p.click('#nav [data-nav="perfil"]');
  await p.check('input[name="tema"][value="oscuro"]');
  const fondo = await p.evaluate(() => ({ tema: document.documentElement.dataset.theme, bg: getComputedStyle(document.body).backgroundColor }));
  ok('modo oscuro desde 👤 Perfil', fondo.tema === 'dark' && fondo.bg === 'rgb(18, 17, 28)', JSON.stringify(fondo));
  await p.click('#nav [data-nav="inicio"]');
  await p.screenshot({ path: 'pro-alumna-oscuro.png', fullPage: true });
  await p.check('input[name="tema"][value="auto"]').catch(() => {});
  await p.evaluate(() => localStorage.removeItem('stald_tema'));
  await c1.close();

  // Modo oscuro del sistema (prefers-color-scheme)
  const { ctx: c2, p: o } = await contexto(b, 'marisol@example.com', 390, { oscuro: true });
  await o.goto(BASE + '/ingles.html' + Q); await o.waitForSelector('.hero', { timeout: 60000 });
  ok('modo oscuro del sistema', (await o.evaluate(() => getComputedStyle(document.body).backgroundColor)) === 'rgb(18, 17, 28)');
  await c2.close();

  // ---------- Reproductor en celular: una pregunta por pantalla y atajos (Angel, fecha real) ----------
  const lista = (await api('/ingles/actividades', 'angel@example.com')).body;
  const antesRacha = lista.racha;
  const it = lista.items.find(i => ['disponible', 'en-curso'].includes(i.estado) && i.tipo !== 'meet' && i.tipo !== 'examen') || lista.items.find(i => ['disponible', 'en-curso'].includes(i.estado) && i.tipo !== 'meet');
  const { ctx: c3, p: a } = await contexto(b, 'angel@example.com', 390);
  await a.goto(BASE + '/ingles.html' + Q + '#semana');
  await a.waitForSelector('[data-seccion="semana"]:not([hidden]) .exam-card', { timeout: 60000 });
  await a.click(`[data-seccion="semana"] .exam-item [data-action="abrir-item"][data-id="${it.id}"]`);
  await a.waitForSelector('#exam-form.paso');
  ok('reproductor: dirección propia para Atrás', new URL(a.url()).hash.startsWith('#ver/'));
  const n = (await a.$$('#exam-form .q:not(.fija)')).length;
  ok('celular: una pregunta por pantalla', (await a.$$eval('#exam-form .q:not(.fija)', xs => xs.filter(x => x.offsetParent).length)) === 1, n + ' preguntas');
  for (let i = 0; i < n; i++) {
    const q = await a.$('#exam-form .q.actual');
    if (await q.$('input[type=radio]')) await a.keyboard.press('1');
    else if (await q.$('input.q-text[type=text]')) { await (await q.$('input.q-text')).fill('x'); }
    else if (await q.$('[data-action="auto"]')) await (await q.$('[data-action="auto"]')).click();
    if (i < n - 1) await a.keyboard.press('Enter');
  }
  const ancho = await a.$eval('#player-bar', x => x.style.width);
  ok('barra de progreso al 100 %', ancho === '100%', ancho);
  await a.screenshot({ path: 'pro-reproductor.png' });
  await a.keyboard.press('Enter'); // todas respondidas: Enter envía (confirmación aceptada)
  await a.waitForSelector('.score', { timeout: 60000 });
  ok('resultado con anillo y barras por tema', !!(await a.$('.score .anillo')) && (await a.$$('.topic .bar')).length >= 1);
  await a.screenshot({ path: 'pro-resultado.png', fullPage: true });
  await a.click('[data-action="volver"]');
  await a.waitForSelector('[data-seccion="semana"]:not([hidden])');
  await a.click('#nav [data-nav="inicio"]');
  const despues = (await api('/ingles/actividades', 'angel@example.com')).body.racha;
  ok('racha: entregar hoy la cuenta', despues.hoy === true && despues.dias >= 1 && (await a.textContent('#racha')).trim() === '🔥 ' + despues.dias, JSON.stringify(antesRacha) + ' → ' + JSON.stringify(despues));
  await c3.close();

  // ---------- Profe en escritorio: selector de grupo, mapa de calor y cajón con prórroga ----------
  const { ctx: c4, p: d } = await contexto(b, ADMIN, 1280);
  await d.goto(BASE + '/ingles.html' + Q);
  await d.waitForSelector('#mapa-calor', { timeout: 60000 });
  ok('escritorio: menú lateral con 9 secciones', await d.evaluate(() => getComputedStyle(document.getElementById('nav')).position === 'sticky') && (await d.$$eval('#nav .nav-item', xs => xs.filter(x => x.offsetParent).length)) === 9);
  ok('indicadores del grupo', (await d.$$('#kpis .kpi')).length === 4);
  await d.selectOption('#grupo-filtro', 'sabado-a1');
  await d.waitForFunction(() => { const t = document.getElementById('mapa-calor'); return t && [...t.querySelectorAll('tbody tr')].map(r => r.dataset.alumno).join() === 'Marisol'; }, null, { timeout: 15000 });
  ok('selector de grupo: solo Sábado A1 en el mapa', true);
  ok('mapa de calor: quién va atrasado', (await d.$$('#mapa-calor .celda.atrasado')).length >= 1);
  await d.screenshot({ path: 'pro-profe-tablero.png', fullPage: true });
  await d.click('#mapa-calor tr[data-alumno="Marisol"] .alumno button');
  await d.waitForSelector('dialog#cajon[open] .cajon-fila');
  ok('cajón de Marisol con sus acciones', /Marisol/.test(await d.textContent('#cajon-titulo')) && (await d.$$('#cajon [data-action="prorroga"]')).length >= 1 && !!(await d.$('#cajon #cajon-grupo')));
  await d.fill('#cajon #pr-act-2026-10-01', '2026-10-10');
  await d.click('#cajon .cajon-fila[data-item="act-2026-10-01"] [data-action="prorroga"][data-modo="dar"]');
  await d.waitForFunction(() => /Prórroga/.test((document.getElementById('cajon-msg') || {}).textContent || ''), null, { timeout: 15000 });
  const conPr = (await api('/ingles/actividades', 'marisol@example.com')).body.items.find(i => i.id === 'act-2026-10-01');
  ok('prórroga guardada: Marisol ve su nueva fecha', conPr.fechaLimite === '2026-10-10', conPr.fechaLimite);
  await d.screenshot({ path: 'pro-profe-cajon.png' });
  await d.click('#cajon .cajon-fila[data-item="act-2026-10-01"] [data-action="prorroga"][data-modo="quitar"]');
  await d.waitForFunction(() => /quitó/.test((document.getElementById('cajon-msg') || {}).textContent || ''), null, { timeout: 15000 });
  ok('quitar prórroga', (await api('/ingles/actividades', 'marisol@example.com')).body.items.find(i => i.id === 'act-2026-10-01').fechaLimite === '2026-10-01');
  await d.keyboard.press('Escape');
  ok('el cajón se cierra con Esc', !(await d.$('dialog#cajon[open]')));
  await c4.close();

  // ---------- Profe en celular: barra con «☰ Más» ----------
  const { ctx: c5, p: m } = await contexto(b, ADMIN, 390);
  await m.goto(BASE + '/ingles.html' + Q);
  await m.waitForSelector('#mapa-calor', { timeout: 60000 });
  ok('celular admin: tablero sin desplazamiento horizontal', await sinScrollX(m));
  ok('celular admin: 4 secciones + Más', (await m.$$eval('#nav .nav-item', xs => xs.filter(x => x.offsetParent).length)) === 5);
  await m.screenshot({ path: 'pro-profe-movil.png', fullPage: true });
  await m.click('#nav [data-nav-accion="mas"]');
  await m.click('#nav-mas [data-nav="grupos"]');
  await m.waitForSelector('[data-seccion="grupos"]:not([hidden]) #grupos-admin');
  ok('☰ Más → 👥 Grupos', new URL(m.url()).hash === '#grupos' && await m.isHidden('#nav-mas'));
  await c5.close();

  await b.close();
  console.log(out.join('\n')); process.exit(out.some(x => x.startsWith('FAIL')) ? 1 : 0);
})().catch(e => { console.log(out.join('\n')); console.error('ERROR', e.message.slice(0, 500)); process.exit(2); });
