// E2E: actividades del grupo en la ruta del profe (openspec: profe-actividades-grupo), con el contenido real de la semana 1.
require('./lib/entorno'); // BASE, API, DATOS, DATA, CHROME, carpeta de salida y sesión de prueba en fetch
const { chromium } = require('playwright');
const { abrirPagina } = require('./lib/navegador');
const fs = require('fs');
const BASE = process.env.BASE;
const API = process.env.API;
const DATA = process.env.DATA;
const out = []; const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`);
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const act = JSON.parse(fs.readFileSync(DATA + '/contenido/actividades/act-2026-09-29.json', 'utf8'));
  const porId = Object.fromEntries(act.banco.map(e => [e.id, e]));
  const b = await chromium.launch({ executablePath: process.env.CHROME });
  const p = await abrirPagina(b, { email: 'admin@example.com', ingles: true, out, etiqueta: '', dialogos: 'aceptar', ruta: '/ingles.html?modo=profe', esperar: ['#grupo-profe', { state: 'attached' }] });
  await p.click('[data-pf-tab="grupo"]'); // pestaña (openspec: profe-diseno)
  const ctx = p.context();
  const card = await p.textContent('#grupo-profe');
  ok('tarjeta "Lo de tu grupo" con las actividades, el examen, el refuerzo y el diagnóstico', ['Alfabeto', 'Verbos con -s', 'Examen semanal 1', 'diagnóstico'].every(t => card.includes(t)) && !card.includes('Repaso por Meet'), card.slice(0, 200));
  const atraso = (card.match(/En atraso/g) || []).length;
  ok('lo ya publicado aparece en atraso (≥ 3)', atraso >= 3, String(atraso));
  await p.screenshot({ path: 'profe-grupo.png', fullPage: false });
  await p.click('#grupo-profe [data-id="act-2026-09-29"]');
  await p.waitForSelector('#exam-form'); if (await p.$('[data-action="ver-todas"]')) await p.click('[data-action="ver-todas"]');
  const ids = await p.$$eval('#exam-form [data-q]', xs => xs.map(x => x.dataset.q));
  for (const id of ids) { const e = porId[id]; if (e.tipo === 'opcion') await p.check(`input[name="${id}"][value="${e.correcta}"]`); else await p.fill(`input[name="${id}"]`, e.aceptadas[0]); }
  await p.click('#exam-send'); await p.waitForSelector('.score', { timeout: 60000 });
  ok('resuelve la actividad del grupo con 100 %', (await p.textContent('.score')).includes('100'));
  await p.click('[data-action="volver"]'); await p.waitForSelector('#grupo-profe', { state: 'attached' }); await sleep(400);
  ok('la tarjeta la marca como hecha con ⭐ 100%', (await p.textContent('#grupo-profe')).includes('Hechas: 1') && (await p.textContent('#grupo-profe')).includes('⭐ 100%'));
  // Vista del grupo: el profe no aparece
  const adm = await (await fetch(API + '/ingles/actividades?email=admin@example.com')).json();
  const a1 = adm.items.find(i => i.id === 'act-2026-09-29');
  ok('admin del grupo: sin resultado de Profe ni en el resumen', !a1.resultados.some(r => r.alumno === 'Profe') && !('Profe' in adm.resumen));
  const g = await ctx.newPage(); await g.goto(BASE + '/ingles.html?api=' + encodeURIComponent(API) + '#resultados'); await g.waitForSelector('#ultimas', { timeout: 60000 });
  ok('vista del grupo sin bloque ni calificaciones de Profe', !(await g.$('details.student[data-alumno="Profe"]')) && !(await g.textContent('#ultimas')).includes('Profe'));
  // La alumna no ve nada nuevo
  const al = await (await fetch(API + '/ingles/actividades?email=marisol@example.com')).json();
  ok('la alumna sigue viendo sus 6 elementos', al.items.length === 6 && !al.items.some(i => i.grupo), String(al.items.length));
  await b.close();
  console.log(out.join('\n')); process.exit(out.some(x => x.startsWith('FAIL')) ? 1 : 0);
})().catch(e => { console.log(out.join('\n')); console.error('ERROR', e.message.slice(0, 400)); process.exit(2); });
