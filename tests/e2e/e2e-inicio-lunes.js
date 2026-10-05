// E2E inicio-lunes-alumnos: el admin da de alta a una alumna; ella no ve atrasos previos; el grupo sí.
require('./lib/entorno'); // BASE, API, DATOS, DATA, CHROME, carpeta de salida y sesión de prueba en fetch
const { chromium } = require('playwright');
const BASE = process.env.BASE, API = process.env.API;
const out = []; const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`);
const lista = async email => (await (await fetch(API + '/ingles/actividades?email=' + encodeURIComponent(email))).json()).items || [];
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME });
  const ctx = await b.newContext(); await ctx.addInitScript(() => (localStorage.setItem('stald_email', 'admin@example.com'), localStorage.setItem('stald_sesion_prueba', JSON.stringify({ email: 'admin@example.com', token: 'prueba:' + 'admin@example.com' }))));
  const p = await ctx.newPage(); p.on('pageerror', e => out.push('FAIL error JS: ' + e.message));
  await p.goto(BASE + '/ingles.html?api=' + encodeURIComponent(API) + '#alumnos'); await p.waitForSelector('#alumnos-admin', { timeout: 60000 });
  await p.fill('#alta-nombre', 'Prueba Lunes'); await p.fill('#alta-correo', 'prueba.lunes@example.com'); await p.click('#alta-alumno button[type=submit]');
  await p.waitForFunction(() => /Empieza el lunes/.test((document.getElementById('alta-msg') || {}).textContent || ''), null, { timeout: 20000 });
  const aviso = await p.textContent('#alta-msg');
  ok('aviso del alta con su lunes de inicio', /Empieza el lunes 5 oct/.test(aviso), aviso.trim());
  const fila = await p.$$eval('#alumnos-admin .ultimas-lista', ls => ls.map(l => l.textContent).find(t => t.includes('Prueba Lunes')) || '');
  ok('lista: "inicia el lunes"', /inicia el lunes 5 oct/.test(fila), fila.trim().slice(0, 120));
  const nueva = await lista('prueba.lunes@example.com'), grupo = await lista('marisol@example.com');
  ok('la alumna nueva no ve nada que venza antes del 5 oct', nueva.every(i => i.fechaLimite >= '2026-10-05'), nueva.length + ' elementos');
  ok('Marisol sigue viendo lo anterior', grupo.some(i => i.fechaLimite < '2026-10-05') && grupo.length > nueva.length, grupo.length + ' elementos');
  const q = await b.newContext(); await q.addInitScript(() => (localStorage.setItem('stald_email', 'prueba.lunes@example.com'), localStorage.setItem('stald_sesion_prueba', JSON.stringify({ email: 'prueba.lunes@example.com', token: 'prueba:' + 'prueba.lunes@example.com' }))));
  const pa = await q.newPage(); await pa.goto(BASE + '/ingles.html?api=' + encodeURIComponent(API)); await pa.waitForTimeout(6000);
  const txt = await pa.innerText('body');
  ok('en su página: "Tu curso empieza el lunes 5 oct"', /Tu curso empieza el lunes 5 de oct/.test(txt), txt.replace(/s+/g, ' ').slice(0, 160));
  ok('en su página: sin "En atraso"', !/En atraso/.test(txt));
  await pa.screenshot({ path: 'inicio-lunes-alumna.png', fullPage: true });
  await b.close();
  console.log(out.join('\n')); process.exit(out.some(x => x.startsWith('FAIL')) ? 1 : 0);
})().catch(e => { console.log(out.join('\n')); console.error('ERROR', e.message.slice(0, 300)); process.exit(2); });
