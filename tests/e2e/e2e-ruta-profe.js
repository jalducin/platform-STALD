// E2E: ruta del profe (openspec: ruta-profe, profe-semanas-del-grupo, profe-grupo-y-ruta-ia). El profe resuelve las
// mismas actividades de su grupo; si los datos traen ruta propia (plan.json), además ve sus clases en un bloque aparte.
// Sin ruta propia: «Esta semana» es la del grupo y no hay plan del mes.
require('./lib/entorno'); // BASE, API, DATOS, DATA, CHROME, carpeta de salida y sesión de prueba en fetch
const { chromium } = require('playwright');
const API = process.env.API;
const { abrirPagina } = require('./lib/navegador');
const out = []; const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`);
const pagina = (b, email, ruta) => abrirPagina(b, { email, viejo: true, ingles: true, out, dialogos: 'aceptar', ruta });
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME });
  const r = await (await fetch(API + '/ingles/profe/actividades?email=admin@example.com')).json();
  const sp = r.semanaPropia || r.semanaSiguientePropia; // el domingo antes de empezar su ruta, solo la siguiente
  const conRuta = !!r.plan && !!sp;
  console.log(conRuta ? 'Datos con ruta propia: ' + r.plan.titulo : 'Datos sin ruta propia');
  ok('servidor: semana del grupo', !!r.semana && /^\d{4}-\d{2}-\d{2}$/.test(r.semana.id) && r.semana.ids.some(id => r.items.some(i => i.id === id && i.grupo)), JSON.stringify(r.semana && r.semana.id));
  ok('servidor: lo del grupo sin Meet', r.items.some(i => i.grupo) && r.items.every(i => i.tipo !== 'meet'), String(r.items.length));
  if (conRuta) {
    ok('servidor: semana propia aparte con solo elementos propios', !!sp && sp.ids.every(id => !r.items.some(i => i.id === id && i.grupo)) && r.items.some(i => !i.grupo && sp.ids.includes(i.id)), JSON.stringify(sp));
  } else {
    ok('servidor: sin plan, sin semanaPropia y solo lo del grupo', r.plan === null && !('semanaPropia' in r) && r.items.every(i => i.grupo));
  }

  const ad = await pagina(b, 'admin@example.com', '/ingles.html?modo=profe');
  await ad.waitForSelector('.pf-hero', { timeout: 60000 });
  const titulo = await ad.textContent('#titulo');
  if (conRuta) {
    ok('título desde el plan, sin «ruta de Inglés»', titulo.includes(r.plan.titulo) && !/ruta de Inglés/i.test(titulo) && (await ad.title()) === r.plan.titulo, titulo);
    ok('pestaña Plan del mes visible', !!(await ad.$('[data-pf-tab="plan"]')));
    const propia = await ad.textContent('#pf-sem-propia').catch(() => '');
    const grupoSem = await ad.textContent('#pf-sem-grupo').catch(() => '');
    ok('Esta semana: bloque «Mis clases» con su semana', propia.includes('Mis clases') && propia.includes(r.plan.titulo) && propia.includes(sp.titulo), propia.replace(/\s+/g, ' ').slice(0, 140));
    ok('Esta semana: bloque «Inglés con el grupo» con la semana del grupo', grupoSem.includes('Inglés con el grupo') && grupoSem.includes(r.semana.titulo), grupoSem.replace(/\s+/g, ' ').slice(0, 140));
    const idsPropios = await ad.$$eval('#pf-sem-propia [data-id]', xs => xs.map(x => x.dataset.id));
    const idsGrupo = await ad.$$eval('#pf-sem-grupo [data-id]', xs => xs.map(x => x.dataset.id));
    ok('cada bloque solo con lo suyo', idsPropios.length > 0 && idsGrupo.length > 0 && idsPropios.every(id => id.startsWith('profe-')) && idsGrupo.every(id => !id.startsWith('profe-')), JSON.stringify([idsPropios, idsGrupo]));
    await ad.screenshot({ path: 'ruta-profe.png', fullPage: true });
    await ad.click('[data-pf-tab="plan"]');
    const plan = await ad.textContent('#ruta-plan');
    const abiertas = await ad.$$eval('#ruta-plan details.ruta-sem[open]', xs => xs.length);
    ok('Plan del mes: ' + r.plan.semanas.length + ' semanas, temas en español y solo la actual abierta', (await ad.$$('#ruta-plan details.ruta-sem')).length === r.plan.semanas.length && r.plan.semanas.every(s => plan.includes(s.titulo) && (s.temas || []).every(t => plan.includes(t))) && abiertas === 1 && !plan.includes('undefined'), 'abiertas=' + abiertas);
    await ad.screenshot({ path: 'ruta-profe-plan.png', fullPage: true });
    await ad.click('[data-pf-tab="semana"]');
  } else {
    ok('título genérico sin B1 → C1', titulo.includes('Mi ruta de Inglés') && !(await ad.textContent('body')).includes('C1'));
    ok('sin pestaña ni tarjeta de plan', !(await ad.$('[data-pf-tab="plan"]')) && !(await ad.$('#ruta-plan')));
    const semana = await ad.textContent('[data-pf-panel="semana"]');
    ok('«Esta semana» muestra la semana del grupo', semana.includes(r.semana.titulo) && !(await ad.$('#pf-sem-propia')), semana.replace(/\s+/g, ' ').slice(0, 140));
    await ad.screenshot({ path: 'ruta-profe.png', fullPage: true });
  }

  // Admin: enlace desde la vista del grupo y en el portal
  const grupo = await pagina(b, 'admin@example.com', '/ingles.html#registro');
  await grupo.waitForSelector('#alumnos-admin', { timeout: 60000 });
  ok('vista del grupo con enlace a Mi ruta', !!(await grupo.$('a.profe-link[href*="modo=profe"]')));
  const portal = await pagina(b, 'admin@example.com', '/');
  await portal.waitForSelector('[data-espacio]', { timeout: 60000 });
  ok('portal admin: tile Mi ruta', !!(await portal.$('[data-espacio="profe"]')) && !(await portal.textContent('body')).includes('B1 → C1'));

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
  ok('actividades de la alumna sin contenido del profe', Array.isArray(sus.items) && !sus.items.some(i => i.id.startsWith('profe-')) && !('semanaPropia' in sus) && !('plan' in sus), String(sus.items && sus.items.length));
  if (conRuta) {
    const id = sp.ids[0];
    const st2 = await fetch(API + '/ingles/actividades/' + id + '?email=marisol@example.com');
    ok('alumna no abre por id un elemento del profe', st2.status === 404, String(st2.status));
  }
  await b.close();
  console.log(out.join('\n')); process.exit(out.some(x => x.startsWith('FAIL')) ? 1 : 0);
})().catch(e => { console.log(out.join('\n')); console.error('ERROR', e.message.slice(0, 400)); process.exit(2); });
