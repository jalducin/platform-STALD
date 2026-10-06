// E2E: examen con 2.ª oportunidad (openspec: examen-segunda-oportunidad). Viernes → sábado en espera → domingo.
// La fecha se simula: el servidor local corre con PERMITIR_HOY=1 y aquí se agrega &hoy= a cada petición y se fija el reloj.
require('./lib/entorno'); // BASE, API, DATOS, DATA, CHROME, carpeta de salida y sesión de prueba en fetch
const { chromium } = require('playwright');
const fs = require('fs');
const { abrirPagina, urlDe } = require('./lib/navegador');
const API = process.env.API;
const DATA = process.env.DATA;
const out = []; const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`);
const ex = JSON.parse(fs.readFileSync(DATA + '/contenido/examenes/examen-2026-10-02.json', 'utf8'));
const porId = Object.fromEntries(ex.banco.map(e => [e.id, e]));
// Fija el reloj del navegador en `f` (AAAA-MM-DD) a las 17:00 UTC.
const fijarReloj = f => { const fijo = new Date(f + 'T17:00:00Z').getTime(); const D = Date; window.Date = class extends D { constructor(...a) { super(...(a.length ? a : [fijo])); } static now() { return fijo; } }; };
async function dia(b, fecha) {
  const p = await abrirPagina(b, { email: 'marisol@example.com', ingles: true, init: [fijarReloj, fecha], out, etiqueta: '', dialogos: 'aceptar' });
  await p.context().route('**/ingles/actividades**', r => { const u = new URL(r.request().url()); u.searchParams.set('hoy', fecha); r.continue({ url: u.toString() }); });
  await p.goto(urlDe('/ingles.html#semana'));
  await p.waitForSelector('.exam-card', { timeout: 60000 });
  return p;
}
const tarjeta = p => p.$$eval('.exam-item', xs => (xs.find(x => x.textContent.includes('Examen semanal 1')) || {}).textContent || '');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME });
  // Viernes
  const v = await dia(b, '2026-10-02');
  ok('viernes: examen con 0/2 intentos y botón Resolver', /0\/2 intento/.test(await tarjeta(v)) && (await tarjeta(v)).includes('Resolver'), await tarjeta(v));
  await v.click('.exam-item:has-text("Examen semanal 1") [data-action="abrir-item"]');
  await v.waitForSelector('#exam-form'); if (await v.$('[data-action="ver-todas"]')) await v.click('[data-action="ver-todas"]');
  const ids1 = await v.$$eval('#exam-form [data-q]', xs => xs.map(x => x.dataset.q));
  for (const id of ids1) { const e = porId[id]; if (e.tipo === 'opcion') await v.check(`input[name="${id}"][value="${(e.correcta + 1) % e.opciones.length}"]`); else await v.fill(`input[name="${id}"]`, 'xxx'); }
  await v.click('#exam-send'); await v.waitForSelector('.score', { timeout: 60000 });
  const p1 = await v.textContent('.score');
  ok('viernes: aviso de la 2.ª oportunidad el domingo y sin botón de reintento', (await v.textContent('#aviso-segunda')).includes('dom 4') && !(await v.$('.exam-bar [data-action="abrir-item"]')), await v.textContent('#aviso-segunda'));
  // Sábado
  const s = await dia(b, '2026-10-03');
  const ts = await tarjeta(s);
  ok('sábado: en espera con «2.ª oportunidad dom 4» y Ver resultado', ts.includes('2.ª oportunidad dom 4') && ts.includes('Ver resultado') && !ts.includes('Resolver'), ts);
  const bloq = await (await fetch(API + '/ingles/actividades/examen-2026-10-02?email=marisol%40example.com&hoy=2026-10-03')).json();
  ok('sábado: la API responde segunda_pronto', bloq.error === 'segunda_pronto' && bloq.desde === '2026-10-04', JSON.stringify(bloq));
  // Domingo
  const d = await dia(b, '2026-10-04');
  ok('domingo: botón «2.ª oportunidad»', (await tarjeta(d)).includes('2.ª oportunidad'), await tarjeta(d));
  await d.click('.exam-item:has-text("Examen semanal 1") [data-action="abrir-item"]');
  await d.waitForSelector('#exam-form'); if (await d.$('[data-action="ver-todas"]')) await d.click('[data-action="ver-todas"]');
  const ids2 = await d.$$eval('#exam-form [data-q]', xs => xs.map(x => x.dataset.q));
  const nuevas = ids2.filter(id => !ids1.includes(id)).length;
  ok('domingo: selección nueva de preguntas', ids2.length === 20 && nuevas >= 5, nuevas + ' nuevas de ' + ids2.length);
  ok('domingo: no es corrección (sin respuestas fijas)', !(await d.$('.aviso-corr')));
  for (const id of ids2) { const e = porId[id]; if (e.tipo === 'opcion') await d.check(`input[name="${id}"][value="${e.correcta}"]`); else await d.fill(`input[name="${id}"]`, e.aceptadas[0]); }
  await d.click('#exam-send'); await d.waitForSelector('.score', { timeout: 60000 });
  const head = await d.textContent('.exam-card h3');
  ok('domingo: 100 % y cuenta la mejor', (await d.textContent('.score')).includes('100') && head.includes('intento 2 de 2') && head.includes('mejor: 100%'), p1 + ' → ' + head);
  await d.screenshot({ path: 'segunda-oportunidad.png' });
  await b.close();
  console.log(out.join('\n')); process.exit(out.some(x => x.startsWith('FAIL')) ? 1 : 0);
})().catch(e => { console.log(out.join('\n')); console.error('ERROR', e.message.slice(0, 400)); process.exit(2); });
