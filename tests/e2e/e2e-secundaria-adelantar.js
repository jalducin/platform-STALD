// E2E: adelantar clases de Secundaria (openspec: secundaria-adelantar). Con el fixture de la semana 2026-10-19
// (tests/fixtures/datos/contenido/secundaria: 3 clases de la alumna del fixture que abren el miércoles 21 y traen `dia`
// jueves 22 ×2 y viernes 23) y el servidor con `--hoy 2026-10-22`: «Hoy te toca» trae solo las 2 del jueves, la del
// viernes se puede abrir y resolver hoy (cuenta a tiempo) y «🗓️ Mi horario» no cambia antes ni después de resolverla.
require('./lib/entorno'); // BASE, API, DATA, CHROME, carpeta de salida y sesión de prueba en fetch
const { chromium } = require('playwright');
const { abrirPagina } = require('./lib/navegador');
const { irPestanaSec } = require('./lib/secundaria'); // fila de pestañas, barra inferior o «☰ Más» según el tamaño
const out = []; const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`);
const ALUMNA = 'valeria@example.com';
const HOY = '2026-10-22';
const MANANA = 'sec-adelanta-2026-10-23-a';
const FUTURA = 'sec-adelanta-2026-11-02-a'; // semana 2026-11-02, abierta desde el 21
const DE_HOY = ['sec-adelanta-2026-10-22-a', 'sec-adelanta-2026-10-22-b'];
const API = process.env.API;
const q = '?email=' + encodeURIComponent(ALUMNA);
const lista = () => fetch(`${API}/secundaria/actividades${q}`).then(x => x.json());
const sinScrollH = p => p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
const tarjetasHoy = p => p.$$eval('[data-sec-card]', xs => xs.map(x => x.dataset.secCard));
const horario = async p => {
  await irPestanaSec(p, 'horario');
  await p.waitForSelector('#sec-horario:not([hidden])');
  return p.$$eval('#sec-horario [data-sec-hor-dia]', xs => xs.map(x => x.dataset.secHorDia + ':' + [...x.querySelectorAll('[data-sec-hor-item]')].map(c => c.dataset.secHorItem).join('+')).join(' | '));
};

(async () => {
  const r0 = await lista();
  if (r0.hoy !== HOY) { console.log(`OMIT el servidor corre con hoy ${r0.hoy}; esta prueba necesita --hoy ${HOY}`); process.exit(0); }
  const por = new Map(r0.items.map(i => [i.id, i]));
  const man = por.get(MANANA);
  ok('API: deja pasar `dia`', DE_HOY.every(id => por.get(id) && por.get(id).dia === HOY) && man && man.dia === '2026-10-23', JSON.stringify(man && man.dia));
  ok('API: la de la semana 2026-11-02 ya abrió y se lista', por.get(FUTURA) && por.get(FUTURA).estado === 'disponible', JSON.stringify(por.get(FUTURA) && por.get(FUTURA).estado));
  ok('API: la del viernes ya abrió (bloque desde el 21) y no está hecha', man && man.disponibleDesde === '2026-10-21' && man.estado === 'disponible' && !man.intentosUsados, JSON.stringify(man && man.estado));

  const b = await chromium.launch({ executablePath: process.env.CHROME });
  let p = await abrirPagina(b, { email: ALUMNA, viejo: true, out, viewport: { width: 360, height: 780 }, ruta: '/secundaria.html', esperar: '#sec-inicio' });
  const hoy1 = await tarjetasHoy(p);
  ok('Hoy te toca: solo las 2 del jueves 22', hoy1.join() === DE_HOY.join(), hoy1.join());
  const estados = await p.$$eval('[data-sec-card]', xs => xs.map(x => x.dataset.estado));
  ok('Hoy te toca: ninguna atrasada', !estados.includes('atrasada'), estados.join());
  const hor1 = await horario(p);
  ok('Mi horario: jueves 22 con 2 y viernes 23 con 1, por su `dia`', hor1.includes(`2026-10-22:${DE_HOY.join('+')}`) && hor1.includes(`2026-10-23:${MANANA}`) && hor1.includes('2026-10-21: |'), hor1);
  await p.screenshot({ path: 'secundaria-adelantar-horario.png', fullPage: true });

  // La de mañana se abre desde «📅 Esta semana».
  await irPestanaSec(p, 'clases');
  ok('Esta semana: la del viernes en su día', !!(await p.$(`[data-sec-dia="2026-10-23"] [data-sec-item="${MANANA}"]`)));
  ok('Esta semana: la del viernes no va en «Hoy»', !(await p.$(`#sec-hoy [data-sec-item="${MANANA}"]`)));
  ok('semana futura ya abierta: en «Otras clases y exámenes», no en esta semana', !!(await p.$(`#sec-otras [data-sec-item="${FUTURA}"]`)) && !(await p.$(`#sec-semana [data-sec-item="${FUTURA}"]`)));
  await p.click(`[data-sec-dia="2026-10-23"] [data-sec-item="${MANANA}"] [data-action="abrir-item"]`);
  ok('la del viernes se abre hoy y muestra sus preguntas', await p.waitForSelector('#exam-form', { timeout: 60000 }).then(() => true, () => false));
  await p.screenshot({ path: 'secundaria-adelantar-abierta.png', fullPage: true });

  // Se resuelve por la API (copia temporal de datos): todas bien.
  const abierta = await fetch(`${API}/secundaria/actividades/${MANANA}${q}`).then(x => x.json());
  const respuestas = Object.fromEntries((abierta.preguntas || []).map(x => [x.id, 0]));
  const envio = await fetch(`${API}/secundaria/actividades/${MANANA}${q}`, { method: 'POST', body: JSON.stringify({ intento: abierta.intento || 1, respuestas }) });
  ok('la del viernes se resuelve hoy', envio.status === 200, String(envio.status));
  const r1 = await lista();
  const hecha = r1.items.find(i => i.id === MANANA);
  ok('API: hecha a tiempo (cuenta el bonus de XP)', hecha && hecha.estado === 'completo' && hecha.mejorATiempo === true, JSON.stringify(hecha && { estado: hecha.estado, aTiempo: hecha.mejorATiempo }));

  // Después de resolverla: «Hoy te toca» y el horario quedan igual.
  await p.context().close();
  p = await abrirPagina(b, { email: ALUMNA, viejo: true, out, viewport: { width: 360, height: 780 }, ruta: '/secundaria.html', esperar: '#sec-inicio' });
  const hoy2 = await tarjetasHoy(p);
  ok('después: Hoy te toca sigue con las 2 del jueves', hoy2.join() === DE_HOY.join(), hoy2.join());
  const hor2 = await horario(p);
  ok('después: el horario queda igual', hor2 === hor1, hor2);
  await irPestanaSec(p, 'clases');
  const fila = (await p.textContent(`[data-sec-dia="2026-10-23"] [data-sec-item="${MANANA}"]`)) || '';
  ok('después: en «Esta semana» la del viernes sale con su calificación', fila.includes('100%'), fila.replace(/\s+/g, ' ').trim());
  ok('sin scroll horizontal a 360 px', await sinScrollH(p));
  await p.screenshot({ path: 'secundaria-adelantar-hecha.png', fullPage: true });

  await b.close();
  console.log(out.join('\n')); process.exit(out.some(x => x.startsWith('FAIL')) ? 1 : 0);
})().catch(e => { console.log(out.join('\n')); console.error('ERROR', e.message.slice(0, 400)); process.exit(2); });
