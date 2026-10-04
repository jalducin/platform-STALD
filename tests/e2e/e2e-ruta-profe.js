// E2E: ruta de estudio del profe (openspec: ruta-profe).
require('./lib/entorno'); // BASE, API, DATOS, DATA, CHROME, carpeta de salida y sesión de prueba en fetch
const { chromium } = require('playwright');
const fs = require('fs');
const BASE = process.env.BASE;
const API = process.env.API;
const Q = '&api=' + encodeURIComponent(API);
const DATA = process.env.DATA;
const out = []; const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`);
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function pagina(b, email, ruta) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(e => { (localStorage.setItem('stald_email', e), localStorage.setItem('stald_sesion_prueba', JSON.stringify({ email: e, token: 'prueba:' + e }))); localStorage.setItem('ingles_email', e); }, email);
  const p = await ctx.newPage(); p.on('pageerror', e => out.push('FAIL error JS (' + email + '): ' + e.message)); p.on('dialog', d => d.accept());
  const [r, h] = ruta.split('#'); await p.goto(BASE + r + (r.includes('?') ? Q : '?' + Q.slice(1)) + (h ? '#' + h : '')); return p;
}
(async () => {
  const examen = JSON.parse(fs.readFileSync(DATA + '/contenido/profe/examenes/profe-examen-directo-s1.json', 'utf8'));
  const resp = Object.fromEntries(examen.banco.map(e => [e.id, e.tipo === 'opcion' ? e.correcta : e.aceptadas[0]]));
  const b = await chromium.launch({ executablePath: process.env.CHROME });

  const ad = await pagina(b, 'admin@example.com', '/ingles.html?modo=profe');
  await ad.waitForSelector('#ruta-plan', { timeout: 60000, state: 'attached' });
  ok('título de la subpágina', (await ad.textContent('#titulo')).includes('Mi ruta B1 → C1'));
  ok('plan con 5 semanas (0–4) y la actual marcada', (await ad.$$('.ruta-sem')).length === 5 && (await ad.textContent('.ruta-sem.actual')).includes('Semana 0'));
  ok('el plan muestra las 18 tareas con fecha', (await ad.$$('.ruta-lista li')).length >= 18 + 8, String((await ad.$$('.ruta-lista li')).length));
  const semana = (await ad.$$eval('.exam-card', xs => xs.map(x => x.textContent))).join(' ');
  ok('esta semana: examen directo y diagnóstico', semana.includes('Examen directo') && semana.includes('Diagnóstico B1 → B2'));
  await ad.screenshot({ path: 'ruta-profe.png', fullPage: true });
  // Resolver el examen directo con todo bien
  await ad.click('.exam-card [data-action="abrir-item"][data-id="profe-examen-directo-s1"]');
  await ad.waitForSelector('#exam-form'); if (await ad.$('[data-action="ver-todas"]')) await ad.click('[data-action="ver-todas"]');
  const ids = await ad.$$eval('#exam-form [data-q]', xs => xs.map(x => x.dataset.q));
  ok('27 preguntas del examen directo', ids.length === 27, String(ids.length));
  for (const id of ids) {
    const v = resp[id];
    if (typeof v === 'number') await ad.check(`input[name="${id}"][value="${v}"]`);
    else await ad.fill(`input[name="${id}"]`, v);
  }
  await ad.click('#exam-send');
  await ad.waitForSelector('.score', { timeout: 60000 });
  ok('calificación 100 % con retroalimentación por tema', (await ad.textContent('.score')).includes('100') && (await ad.textContent('#content')).includes('Artículos'));
  await ad.screenshot({ path: 'ruta-profe-resultado.png', fullPage: false });
  await ad.click('[data-action="volver"]'); await ad.waitForSelector('#ruta-plan', { state: 'attached' });
  await sleep(500);
  ok('el plan refleja ⭐ 100%', (await ad.textContent('#ruta-plan')).includes('⭐ 100%'));
  const r = await (await fetch(API + '/ingles/profe/actividades?email=admin@example.com')).json();
  ok('servidor: examen directo completo', r.items.find(i => i.id === 'profe-examen-directo-s1').estado === 'completo');

  // Admin: enlace desde la vista del grupo y en el portal
  const grupo = await pagina(b, 'admin@example.com', '/ingles.html#alumnos');
  await grupo.waitForSelector('#alumnos-admin', { timeout: 60000 });
  ok('vista del grupo con enlace a Mi ruta', !!(await grupo.$('a.profe-link[href*="modo=profe"]')));
  ok('la vista del grupo no lista elementos del profe', !(await grupo.textContent('#content')).includes('Examen directo'));
  const portal = await pagina(b, 'admin@example.com', '/');
  await portal.waitForSelector('[data-espacio]', { timeout: 60000 });
  ok('portal admin: tile Mi ruta B1 → C1', !!(await portal.$('[data-espacio="profe"]')));

  // Alumna: no la ve
  const al = await pagina(b, 'marisol@example.com', '/ingles.html?modo=profe');
  await al.waitForFunction(() => getComputedStyle(document.getElementById('login-error')).display !== 'none', null, { timeout: 60000 });
  ok('alumna en ?modo=profe: aviso "solo para el profe"', (await al.textContent('#login-error')).includes('solo para el profe'));
  const st = await fetch(API + '/ingles/profe/actividades?email=marisol@example.com');
  ok('API: 403 para alumna', st.status === 403, String(st.status));
  const alp = await pagina(b, 'marisol@example.com', '/');
  await alp.waitForSelector('[data-espacio]', { timeout: 60000 });
  ok('portal alumna: sin tile de la ruta', !(await alp.$('[data-espacio="profe"]')));
  const sus = await (await fetch(API + '/ingles/actividades?email=marisol@example.com')).json();
  ok('actividades de la alumna sin contenido del profe', Array.isArray(sus.items) && !sus.items.some(i => i.id.startsWith('profe-')), String(sus.items && sus.items.length));
  await b.close();
  console.log(out.join('\n')); process.exit(out.some(x => x.startsWith('FAIL')) ? 1 : 0);
})().catch(e => { console.log(out.join('\n')); console.error('ERROR', e.message.slice(0, 400)); process.exit(2); });
