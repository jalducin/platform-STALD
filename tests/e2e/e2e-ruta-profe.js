// E2E: ruta del profe sin ruta propia (openspec: ruta-profe, profe-semanas-del-grupo). Desde el 2026-10-17 el profe
// resuelve las mismas actividades de su grupo: «Esta semana» es la del grupo y no hay plan del mes.
require('./lib/entorno'); // BASE, API, DATOS, DATA, CHROME, carpeta de salida y sesión de prueba en fetch
const { chromium } = require('playwright');
const API = process.env.API;
const { abrirPagina } = require('./lib/navegador');
const out = []; const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`);
const pagina = (b, email, ruta) => abrirPagina(b, { email, viejo: true, ingles: true, out, dialogos: 'aceptar', ruta });
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME });
  const r = await (await fetch(API + '/ingles/profe/actividades?email=admin@example.com')).json();
  ok('servidor: sin plan y con la semana del grupo', r.plan === null && !!r.semana && /^\d{4}-\d{2}-\d{2}$/.test(r.semana.id), JSON.stringify(r.semana && r.semana.id));
  ok('servidor: solo actividades del grupo (sin Meet)', r.items.length > 0 && r.items.every(i => i.grupo && i.tipo !== 'meet'), String(r.items.length));

  const ad = await pagina(b, 'admin@example.com', '/ingles.html?modo=profe');
  await ad.waitForSelector('.pf-hero', { timeout: 60000 });
  ok('título sin B1 → C1', (await ad.textContent('#titulo')).includes('Mi ruta de Inglés') && !(await ad.textContent('body')).includes('C1'));
  ok('sin pestaña ni tarjeta de plan', !(await ad.$('[data-pf-tab="plan"]')) && !(await ad.$('#ruta-plan')));
  const semana = await ad.textContent('[data-pf-panel="semana"]');
  ok('«Esta semana» muestra la semana del grupo', semana.includes(r.semana.titulo), semana.replace(/\s+/g, ' ').slice(0, 140));
  await ad.screenshot({ path: 'ruta-profe.png', fullPage: true });

  // Admin: enlace desde la vista del grupo y en el portal
  const grupo = await pagina(b, 'admin@example.com', '/ingles.html#registro');
  await grupo.waitForSelector('#alumnos-admin', { timeout: 60000 });
  ok('vista del grupo con enlace a Mi ruta', !!(await grupo.$('a.profe-link[href*="modo=profe"]')));
  const portal = await pagina(b, 'admin@example.com', '/');
  await portal.waitForSelector('[data-espacio]', { timeout: 60000 });
  ok('portal admin: tile Mi ruta de Inglés', !!(await portal.$('[data-espacio="profe"]')) && !(await portal.textContent('body')).includes('B1 → C1'));

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
