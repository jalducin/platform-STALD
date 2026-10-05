// E2E: exámenes de Secundaria (openspec: examen-secundaria). Crea un examen exclusivo de prueba en la copia de datos
// (DATA): la alumna de Secundaria del fixture lo resuelve con 2 oportunidades (cuenta la mejor), una persona sin
// Secundaria ve el aviso y el admin ve los resultados por materia.
require('./lib/entorno'); // BASE, API, DATOS, DATA, CHROME, carpeta de salida y sesión de prueba en fetch
const { chromium } = require('playwright');
const fs = require('fs');
const BASE = process.env.BASE;
const API = process.env.API;
const DATA = process.env.DATA;
const out = []; const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`);
const ALUMNA = 'valeria@example.com';

// El examen de prueba (exclusivo de la alumna del fixture) viene de tests/fixtures/datos; correr.sh lo copia antes de
// arrancar el servidor.
const examen = JSON.parse(fs.readFileSync(DATA + '/contenido/secundaria/examenes/sec-e2e.json', 'utf8'));

async function pagina(b, email, ruta) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(e => { localStorage.setItem('stald_email', e); localStorage.setItem('stald_sesion_prueba', JSON.stringify({ email: e, token: 'prueba:' + e })); }, email);
  const p = await ctx.newPage(); p.on('pageerror', e => out.push('FAIL error JS (' + email + '): ' + e.message)); p.on('dialog', d => d.accept());
  await p.goto(BASE + ruta + (ruta.includes('?') ? '&' : '?') + 'api=' + encodeURIComponent(API)); return p;
}
// Contesta el examen abierto con `buenas` respuestas correctas (en el orden en que aparecen).
async function resolver(p, buenas) {
  await p.waitForSelector('#exam-form', { timeout: 60000 });
  if (await p.$('[data-action="ver-todas"]')) await p.click('[data-action="ver-todas"]');
  const ids = await p.$$eval('#exam-form [data-q]', xs => xs.map(x => x.dataset.q));
  for (const [i, id] of ids.entries()) {
    const bien = examen.banco.find(e => e.id === id).correcta;
    await p.check(`input[name="${id}"][value="${i < buenas ? bien : 1 - bien}"]`);
  }
  await p.click('#exam-send'); await p.waitForSelector('.score', { timeout: 60000 });
  return (await p.textContent('.score')).replace(/\s+/g, ' ');
}
const texto = async (p, sel) => (await p.textContent(sel)).replace(/\s+/g, ' ');

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME });

  // Alumna: desde Secundaria → 📝 Exámenes
  const al = await pagina(b, ALUMNA, '/secundaria.html');
  await al.waitForSelector('#examenes-link', { timeout: 60000 });
  await al.click('#examenes-link');
  await al.waitForSelector('#sec-examenes', { timeout: 60000 });
  ok('Secundaria → Exámenes conserva ?api= y muestra el título', al.url().includes('modo=secundaria') && al.url().includes('api=') && (await al.textContent('#titulo')).includes('Exámenes de Secundaria'));
  ok('la alumna ve su examen exclusivo', !!(await al.$('[data-sec-item="sec-e2e"]')));
  ok('sin la barra de secciones de Inglés', await al.$eval('#nav', n => n.hidden));
  await al.click('[data-sec-item="sec-e2e"] [data-action="abrir-item"]');
  const s1 = await resolver(al, 2);
  ok('1.ª oportunidad: 50 % con materias', s1.includes('50') && (await al.textContent('#content')).includes('Historia'), s1);
  await al.screenshot({ path: 'secundaria-resultado.png' });
  await al.click('[data-action="volver"]'); await al.waitForSelector('#sec-examenes');
  const fila1 = await texto(al, '[data-sec-item="sec-e2e"]');
  ok('lista: 1/2 oportunidades, mejor 50 % y Reintentar', fila1.includes('1/2') && fila1.includes('50%') && fila1.includes('Reintentar'), fila1);
  await al.click('[data-sec-item="sec-e2e"] [data-action="abrir-item"]');
  const s2 = await resolver(al, 4);
  ok('2.ª oportunidad: 100 %', s2.includes('100'), s2);
  await al.click('[data-action="volver"]'); await al.waitForSelector('#sec-examenes');
  const fila2 = await texto(al, '[data-sec-item="sec-e2e"]');
  ok('se queda la mejor (100 %) y ya no hay 3.ª', fila2.includes('2/2') && fila2.includes('100%') && fila2.includes('Ver resultado'), fila2);
  await al.screenshot({ path: 'secundaria-lista.png' });

  // Persona sin Secundaria
  const otra = await pagina(b, 'marisol@example.com', '/ingles.html?modo=secundaria');
  const aviso = await otra.waitForFunction(() => document.body.innerText.includes('solo para alumnos y alumnas de Secundaria'), null, { timeout: 60000 }).then(() => true, () => false);
  ok('sin Secundaria: aviso claro', aviso);

  // Admin: resultados por persona y materia
  const ad = await pagina(b, 'admin@example.com', '/ingles.html?modo=secundaria');
  await ad.waitForSelector('[data-sec-admin="sec-e2e"]', { timeout: 60000 });
  const card = await texto(ad, '[data-sec-admin="sec-e2e"]');
  ok('admin: Valeria con 100 %, 2/2 y materias', card.includes('Valeria') && card.includes('100%') && card.includes('2/2') && card.includes('Historia 100%'), card.slice(0, 220));
  ok('admin: dice para quién es', card.includes('solo para: valeria'));
  await ad.screenshot({ path: 'secundaria-admin.png', fullPage: true });

  await b.close();
  console.log(out.join('\n')); process.exit(out.some(x => x.startsWith('FAIL')) ? 1 : 0);
})().catch(e => { console.log(out.join('\n')); console.error('ERROR', e.message.slice(0, 400)); process.exit(2); });
