// E2E: diseño RPG de toda la vista de alumnos y alumnas de Inglés y actividad por pasos (openspec:
// ingles-alumno-diseno-rpg). A 360 px, en claro y en oscuro: tarjetas, botones reales de 44 px o más, sin scroll
// horizontal en Inicio, Semana, Material, Resultados y Perfil; la actividad se abre por pasos (Teoría → Video →
// Ejercicios → Libreta) y la vista previa del admin sigue igual.
require('./lib/entorno');
const { chromium } = require('playwright');
const { abrirPagina } = require('./lib/navegador');
const out = []; const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`);
const ALUMNA = 'marisol@example.com', ADMIN = 'admin@example.com';
const VISTA = { width: 360, height: 780 };
const SECCIONES = ['inicio', 'semana', 'material', 'resultados', 'perfil'];

// Botones visibles de la sección actual más bajos de 44 px (alto real en pantalla).
const botonesChicos = p => p.evaluate(() => [...document.querySelectorAll('#content .btn')]
  .filter(b => b.offsetParent && !b.closest('[hidden]')).filter(b => b.getBoundingClientRect().height < 43.5)
  .map(b => b.textContent.trim().slice(0, 30)));
const sinScrollH = p => p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME });
  for (const tema of ['light', 'dark']) {
    const p = await abrirPagina(b, { email: ALUMNA, viejo: true, ingles: true, out, viewport: VISTA, contexto: { colorScheme: tema }, ruta: '/ingles.html', esperar: '#rpg-stats' });
    for (const s of SECCIONES) {
      await p.evaluate(id => { location.hash = id; }, s);
      await p.waitForFunction(id => { const x = document.querySelector('[data-seccion="' + id + '"]'); return x && !x.hidden; }, s, { timeout: 30000 });
      const chicos = await botonesChicos(p);
      ok(s + ': botones de 44 px o más (' + tema + ')', chicos.length === 0, chicos.join(' | '));
      ok(s + ': sin scroll horizontal a 360 px (' + tema + ')', await sinScrollH(p));
      const panel = await p.evaluate(id => {
        const c = document.querySelector('[data-seccion="' + id + '"] .card, [data-seccion="' + id + '"] .exam-card, [data-seccion="' + id + '"] .material-guia');
        if (!c) return null;
        const st = getComputedStyle(c);
        return st.boxShadow !== 'none' && st.borderTopWidth !== '0px';
      }, s);
      ok(s + ': tarjetas con borde y brillo RPG (' + tema + ')', panel !== false, String(panel));
      await p.screenshot({ path: 'ingles-alumno-' + s + '-' + tema + '.png', fullPage: true });
    }
    await p.context().close();
  }

  // Actividad por pasos (la primera que se pueda abrir)
  const p = await abrirPagina(b, { email: ALUMNA, viejo: true, ingles: true, out, viewport: VISTA, ruta: '/ingles.html#semana', esperar: '[data-seccion="semana"] [data-action="abrir-item"]' });
  await p.click('[data-seccion="semana"] [data-action="abrir-item"]');
  await p.waitForSelector('.sec-clase-vista', { timeout: 30000 });
  const v = await p.evaluate(() => ({
    etiqueta: (document.querySelector('.sec-mision-tag') || {}).textContent || '',
    pasos: [...document.querySelectorAll('[data-sec-paso]')].map(x => x.dataset.secPaso),
    form: !!document.querySelector('#sec-paso-ejercicios #exam-form'),
    mundo: (document.querySelector('[data-sec-mundo]') || {}).textContent || '',
  }));
  ok('actividad por pasos: Teoría, Video, Ejercicios y Libreta', v.pasos.join(',') === 'teoria,video,ejercicios,libreta' && v.form, v.pasos.join(','));
  ok('etiqueta del tipo (no «Misión») y mundo de Inglés', /Actividad|Examen|Refuerzo|Reto del Meet/.test(v.etiqueta) && !v.etiqueta.includes('Misión') && v.mundo.includes('Isla del Alfabeto'), v.etiqueta + ' | ' + v.mundo);
  ok('actividad: sin scroll horizontal a 360 px', await sinScrollH(p));
  await p.screenshot({ path: 'ingles-alumno-actividad-pasos.png', fullPage: true });
  await p.context().close();

  // Admin: la vista previa sigue como lista (sin pasos)
  const ad = await abrirPagina(b, { email: ADMIN, viejo: true, ingles: true, out, viewport: { width: 1280, height: 900 }, ruta: '/ingles.html#semana', esperar: '[data-seccion="semana"] [data-action="abrir-item"]' });
  await ad.click('[data-seccion="semana"] [data-action="abrir-item"]');
  await ad.waitForSelector('#exam-form', { timeout: 30000 });
  ok('admin: vista previa sin pasos (como antes)', !(await ad.$('.sec-clase-vista')));
  await ad.context().close();
  await b.close();
  console.log(out.join('\n')); process.exit(out.some(x => x.startsWith('FAIL')) ? 1 : 0);
})().catch(e => { console.log(out.join('\n')); console.error('ERROR', e.message.slice(0, 400)); process.exit(2); });
