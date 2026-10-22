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
const SECCIONES = ['inicio', 'semana', 'misiones', 'material', 'resultados', 'perfil'];

// Todos los botones visibles de la sección actual (button y a.btn) más bajos de 44 px (alto real en pantalla).
const botonesChicos = p => p.evaluate(() => [...document.querySelectorAll('#content [data-seccion]:not([hidden]) button, #content [data-seccion]:not([hidden]) a.btn')]
  .filter(b => b.offsetParent && !b.closest('[hidden]')).filter(b => b.getBoundingClientRect().height < 43.5)
  .map(b => (b.className + ': ' + b.textContent.trim()).slice(0, 50)));
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
      // «⚔️ Misiones» sin misiones solo muestra el aviso vacío (sin tarjeta); las demás deben tener tarjetas RPG.
      ok(s + ': tarjetas con borde y brillo RPG (' + tema + ')', s === 'misiones' ? panel !== false : panel === true, String(panel));
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
    // Cada paso habilitado tiene su bloque y cada deshabilitado no (el indicador refleja el contenido).
    coherentes: [...document.querySelectorAll('[data-sec-paso]')].every(x => !x.disabled === !!document.getElementById('sec-paso-' + x.dataset.secPaso)),
    habilitados: [...document.querySelectorAll('[data-sec-paso]:not([disabled])')].map(x => x.dataset.secPaso),
    form: !!document.querySelector('#sec-paso-ejercicios #exam-form'),
    mundo: (document.querySelector('[data-sec-mundo]') || {}).textContent || '',
  }));
  ok('actividad por pasos: indicador de 4 pasos coherente con su contenido y Ejercicios con el formulario', v.pasos.join(',') === 'teoria,video,ejercicios,libreta' && v.coherentes && v.habilitados.includes('ejercicios') && v.form, v.habilitados.join(','));
  ok('actividad: botones de 44 px o más', (await p.evaluate(() => [...document.querySelectorAll('#content button, #content a.btn')].filter(b => b.offsetParent && b.getBoundingClientRect().height < 43.5).map(b => b.textContent.trim().slice(0, 30)))).length === 0);
  // Pantalla de resultado de Inglés (lo que dibuja showResult tras un envío): «¡Listo!», recompensa con XP y nivel, y
  // «Lo siguiente →» o «📅 Mi semana». Se dibuja con una calificación de ejemplo, sin enviar al servidor.
  const res = await p.evaluate(() => {
    const id = state.claseAbierta.id;
    state.actAntes = { id, act: state.act };
    showResult({ correctas: 4, total: 5, porcentaje: 80, nivelSugerido: 'Bien', secciones: [], fortalezas: [], enProgreso: [], debilidades: [], revision: [] }, { id, intento: 1, intentosMax: 2, restantes: 1 });
    const s = document.querySelector('.sec-siguiente');
    // Título largo, como el de algunas clases reales, para que el desborde se note (openspec: fix-e2e-rpg).
    const chico = s && s.querySelector('small');
    if (chico) chico.textContent = 'Actividad: Presente simple con adverbios de frecuencia y rutinas diarias de la semana';
    const r = s && s.getBoundingClientRect();
    return { texto: document.getElementById('content').textContent, recompensa: !!document.getElementById('sec-recompensa'), siguiente: (s || {}).textContent || '',
      cabe: !s || (r.left >= 0 && r.right <= innerWidth + 1 && s.scrollWidth <= s.clientWidth + 1), medida: s ? [Math.round(r.left), Math.round(r.right), s.scrollWidth, s.clientWidth] : [] };
  });
  ok('resultado en Inglés: «Lo siguiente →» cabe a 360 px, sin desbordar (openspec: fix-e2e-rpg)', res.cabe, JSON.stringify(res.medida));
  ok('resultado en Inglés: «¡Listo!», +XP y nivel', res.texto.includes('¡Listo!') && res.recompensa && /\+\d+ XP/.test(res.texto) && res.texto.includes('Nv. '), res.texto.slice(0, 80));
  ok('resultado en Inglés: «Lo siguiente →» o «📅 Mi semana» (no «misión»)', /Lo siguiente|Mi semana/.test(res.siguiente) && !/misi[oó]n/i.test(res.siguiente), res.siguiente.slice(0, 60));
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
