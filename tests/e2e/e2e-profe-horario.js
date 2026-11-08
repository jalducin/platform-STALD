// E2E: «🗓️ Mi horario» y «🧭 Por materia» de la ruta del profe (openspec: profe-horario-materias).
// Fixture propio (tests/fixtures/profe-horario.json, datos inventados): la prueba responde en el navegador el GET de
// /ingles/profe/actividades con ese JSON (hoy = miércoles 2026-11-04) y no escribe nada. Revisa, a 360, 768 y 1280 px y
// en claro y oscuro: la semana de lunes a domingo con hoy resaltado, 🏢 en los días de `plan.diasOficina` con «Día de oficina: solo
// en página», cada tarea con su materia (campo `materia` o respaldo por prefijo y nivel), su estado (pendiente,
// hecha, vencida o adelantada) y su botón; las clases en vivo (meets: una pasada y una futura) con «🎥 Clase en vivo»,
// hora y liga, «✓ Impartida» o «🎥 Próxima» (nunca «Vencida») y fuera del progreso, de los chips y del cupo; flechas y «Hoy»; filtro por materia recordado; progreso por materia con el
// resumen de plan.json; la vista por materia y línea en orden de fecha; 44 px, sin scroll horizontal, contraste AA de
// las etiquetas, el encabezado y el panel de horas desde plan.json, y que las demás pestañas y el tablero RPG siguen ahí.
require('./lib/entorno'); // BASE, API, DATA, CHROME, carpeta de salida y sesión de prueba en fetch
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { abrirPagina } = require('./lib/navegador');
const out = []; const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`);
const ADMIN = 'admin@example.com';
const FIXTURE = fs.readFileSync(path.join(__dirname, '..', 'fixtures', 'profe-horario.json'), 'utf8');
const sinScrollH = p => p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
const chicos = p => p.evaluate(() => [...document.querySelectorAll('#content button, #content a.btn, #content summary')]
  .filter(x => x.offsetParent && x.getBoundingClientRect().height > 0 && x.getBoundingClientRect().height < 43.5)
  .map(x => (x.id || x.dataset.action || x.className || x.tagName) + ':' + Math.round(x.getBoundingClientRect().height)).slice(0, 8));
const fondoOscuro = p => p.evaluate(() => { const m = getComputedStyle(document.body).backgroundColor.match(/\d+/g).map(Number); return m[0] + m[1] + m[2] < 150; });
// Contraste (WCAG) de las etiquetas de materia y de estado contra su fondo propio.
const contrastes = p => p.evaluate(() => {
  const rgb = s => s.match(/[\d.]+/g).slice(0, 3).map(Number);
  const lum = c => { const [r, g, b] = c.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
  return [...document.querySelectorAll('#ph-horario .ph-mat, #ph-horario .ph-estado, #ph-horario .ph-oficina, #ph-horario .ph-vivo')].filter(x => x.offsetParent).map(x => {
    const cs = getComputedStyle(x);
    return { clase: x.className, r: Math.round(ratio(rgb(cs.color), rgb(cs.backgroundColor)) * 10) / 10 };
  });
});
const estadoDe = (p, id) => p.$eval('[data-ph-tarea="' + id + '"]', x => ({ estado: x.dataset.estado, materia: x.dataset.materia, texto: x.textContent.replace(/\s+/g, ' ').trim(), borde: getComputedStyle(x, '::before').backgroundImage + ' ' + getComputedStyle(x.querySelector('.ph-mat')).color })).catch(() => null);
const lunesVisible = p => p.$eval('#ph-semana', x => x.dataset.phLunes);
const columnas = p => p.$eval('#ph-semana', x => getComputedStyle(x).gridTemplateColumns.split(' ').filter(Boolean).length);

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME });
  for (const tema of ['light', 'dark']) {
    for (const ancho of [360, 768, 1280]) {
      const suf = ' (' + ancho + ' px' + (tema === 'dark' ? ', oscuro' : '') + ')';
      const arch = n => `profe-horario-${n}-${ancho}${tema === 'dark' ? '-oscuro' : ''}.png`;
      const ctx0 = { email: ADMIN, viejo: true, ingles: true, out, viewport: { width: ancho, height: ancho < 600 ? 780 : 900 }, contexto: { colorScheme: tema },
        init: [() => { if (!sessionStorage.getItem('ph_e2e')) { localStorage.removeItem('profe_tab'); localStorage.removeItem('profe_materia'); sessionStorage.setItem('ph_e2e', '1'); } }] };
      const p = await abrirPagina(b, ctx0);
      const pedidos = [];
      await p.route(/\/ingles\/profe\/actividades(\/[^?]+)?\?/, r => {
        const u = new URL(r.request().url());
        if (r.request().method() === 'GET' && u.pathname.endsWith('/ingles/profe/actividades')) return r.fulfill({ status: 200, contentType: 'application/json', body: FIXTURE });
        pedidos.push(u.pathname);
        return r.fulfill({ status: 404, contentType: 'application/json', body: '{"error":"no_existe"}' });
      });
      await p.goto(require('./lib/navegador').urlDe('/ingles.html?modo=profe'));
      await p.waitForSelector('.pf-hero', { timeout: 60000 });
      ok('tema: fondo ' + (tema === 'dark' ? 'oscuro' : 'claro') + suf, (await fondoOscuro(p)) === (tema === 'dark'));
      const tabs = await p.$$eval('[data-pf-tab]', xs => xs.map(x => x.dataset.pfTab));
      ok('pestañas: «Mi horario» y «Por materia» sin quitar las demás' + suf, ['semana', 'horario', 'materias', 'material', 'mundos', 'plan', 'grupo', 'hechas'].every(t => tabs.includes(t)), tabs.join(','));
      const cab = await p.evaluate(() => ({ t: document.getElementById('titulo').textContent, s: document.getElementById('subtitulo').textContent, doc: document.title, lado: (document.querySelector('.pf-side') || {}).textContent || '' }));
      ok('encabezado desde plan.titulo y plan.subtitulo (sin el texto fijo de antes)' + suf, cab.t === '🍥 Camino de ejemplo' && cab.doc === '🍥 Camino de ejemplo' && cab.s.includes('5 materias inventadas') && !/Tus clases propias/.test(cab.s), JSON.stringify(cab).slice(0, 160));
      ok('panel de horas desde plan.horasSemana y plan.reparto' + suf, cab.lado.includes('≈ 6 h por semana (ejemplo)') && cab.lado.includes('Inglés diario') && cab.lado.includes('20 min'));
      ok('el tablero RPG y «Pendiente ahora» siguen' + suf, !!(await p.$('#pf-rpg')) && !!(await p.$('#pf-urgente')));
      // Meets fuera de pendientes (openspec: profe-horario-materias): el meet pasado llega «disponible» y no es tarea.
      const pend = await p.evaluate(() => ({ urgente: document.getElementById('pf-urgente').textContent, sig: document.querySelector('.pf-sig').textContent, lado: document.querySelector('.pf-side').textContent,
        mision: (document.getElementById('pf-mision') || {}).textContent || '', retos: (document.getElementById('pf-retos') || {}).textContent || '', ruta: document.querySelector('.pf-hero .progress-text').textContent }));
      ok('meets: ni «Pendiente ahora» ni «Siguiente» ni «Próximas» ni misión ni retos los listan' + suf, ![pend.urgente, pend.sig, pend.lado, pend.mision, pend.retos].some(t => /Clase en vivo del grupo/.test(t)), JSON.stringify(pend).slice(0, 300));
      ok('meets: «Ruta del mes» no los cuenta (17 elementos del plan, 2 son meets: total 15)' + suf, /Ruta del mes: \d+\/15 /.test(pend.ruta), pend.ruta);

      // ---------- 🗓️ Mi horario ----------
      await p.click('[data-pf-tab="horario"]');
      await p.waitForSelector('#ph-semana');
      ok('semana de hoy: lunes 2026-11-02' + suf, (await lunesVisible(p)) === '2026-11-02');
      const dias = await p.$$eval('#ph-semana .ph-dia', xs => xs.map(x => ({ f: x.dataset.phDia, hoy: x.classList.contains('es-hoy'), cur: x.getAttribute('aria-current'), ofi: !!x.querySelector('[data-ph-oficina]'), t: x.querySelector('.ph-dia-t').textContent, txt: x.textContent })));
      ok('7 días de lunes a domingo' + suf, dias.length === 7 && dias[0].f === '2026-11-02' && dias[6].f === '2026-11-08', dias.map(d => d.f).join(','));
      const hoy = dias.filter(d => d.hoy);
      ok('hoy resaltado con texto «Hoy» y aria-current' + suf, hoy.length === 1 && hoy[0].f === '2026-11-04' && hoy[0].cur === 'date' && /Hoy/.test(hoy[0].txt), JSON.stringify(hoy.map(d => d.f)));
      const ofi = dias.filter(d => d.ofi);
      ok('🏢 y «Día de oficina: solo en página» solo en los días de plan.diasOficina (mar 3 y jue 5)' + suf, ofi.map(d => d.f).join(',') === '2026-11-03,2026-11-05' && ofi.every(d => d.t.includes('🏢') && /Día de oficina: solo en página/.test(d.txt)) && dias.filter(d => !d.ofi).every(d => !d.t.includes('🏢')));
      ok('máximo por día: 2 en oficina y 4 los demás' + suf, dias.every(d => d.txt.includes('máx. ' + (d.ofi ? 2 : 4))));
      const casos = [
        ['profe-lid-1', 'vencida', 'Tech Lead', /Vencida/], // sin `materia`: respaldo por prefijo
        ['profe-staff-2026-11-06', 'adelantada', 'Staff Software Engineer', /Adelantada/], // respaldo por nivel
        ['profe-cg-2026-11-08', 'pendiente', 'Cultura General', /Pendiente/],
        ['profe-examen-diagnostico-2026-11-02', 'hecha', 'Evaluación', /Hecha/],
        ['profe-act-2026-11-04', 'pendiente', 'IA · Agentic Engineer', /Pendiente/],
        ['act-2026-11-06', 'pendiente', 'Inglés', /Grupo/], // del grupo: materiaDelGrupo
      ];
      for (const [id, estado, materia, re] of casos) {
        const t = await estadoDe(p, id);
        ok(`tarea ${id}: ${materia} · ${estado}, con texto (no solo color)${suf}`, t && t.estado === estado && t.materia === materia && t.texto.includes(materia) && re.test(t.texto), t ? t.texto.slice(0, 90) : 'no está');
      }
      const ia = await estadoDe(p, 'profe-act-2026-11-04'), ing = await estadoDe(p, 'profe-ing-3');
      ok('color por materia: IA e Inglés con franja y etiqueta distintas' + suf, ia && ing && ia.borde !== ing.borde, ia && ing ? ia.borde + ' / ' + ing.borde : '');
      ok('cada tarea abierta trae su botón (Abrir o Ver resultado)' + suf, await p.$$eval('#ph-semana .ph-tarea:not(.ph-t-meet)', xs => xs.every(x => x.querySelector('[data-action="abrir-item"], [data-action="ver-resultado"]'))));
      // Clase en vivo futura (domingo 8): «🎥 Próxima», hora y liga del Meet, sin botón «Abrir»; no cuenta en el cupo.
      const mf = await p.$eval('[data-ph-tarea="meet-2026-11-08"]', x => ({ estado: x.dataset.estado, materia: x.dataset.materia, texto: x.textContent.replace(/\s+/g, ' ').trim(), liga: (x.querySelector('a[data-ph-meet]') || {}).href || '', boton: !!x.querySelector('[data-action="abrir-item"]'), cupo: x.closest('.ph-dia').querySelector('.ph-cupo').textContent })).catch(() => null);
      ok('meet futuro: «🎥 Clase en vivo», «🎥 Próxima», 18:00 y «Abrir Meet»' + suf, mf && mf.estado === 'proxima' && mf.materia === 'Inglés' && /Clase en vivo/.test(mf.texto) && /Próxima/.test(mf.texto) && !/Vencida/.test(mf.texto) && /18:00/.test(mf.texto) && mf.liga.startsWith('https://meet.google.com/') && !mf.boton, JSON.stringify(mf).slice(0, 200));
      ok('meet futuro: no cuenta en el cupo del día (domingo 8: 1 tarea)' + suf, mf && /^1 · máx\. 4$/.test(mf.cupo.trim()), mf ? mf.cupo : '');
      const chipIngles = await p.$eval('[data-ph-donde="horario"][data-ph-filtro="Inglés"] .ph-n', x => x.textContent).catch(() => '');
      ok('chip Inglés: cuenta 7 tareas, sin los 2 meets' + suf, chipIngles === '7', chipIngles);
      const cs = await contrastes(p);
      const bajos = cs.filter(x => x.r < 4.5);
      ok('contraste AA (≥ 4.5) en etiquetas de materia, estado y oficina' + suf, cs.length > 5 && !bajos.length, JSON.stringify(bajos.slice(0, 4)));
      const cols = await columnas(p);
      const minCols = ancho < 600 ? 1 : ancho < 1000 ? 2 : 3;
      ok(ancho < 600 ? 'celular: lista vertical por día (1 columna)' + suf : (ancho < 1000 ? 'tableta' : 'PC') + ': días en columnas (' + minCols + ' o más)' + suf, ancho < 600 ? cols === 1 : cols >= minCols, String(cols));
      ok('Mi horario: controles de 44 px o más' + suf, !(await chicos(p)).length, (await chicos(p)).join(' '));
      ok('Mi horario: sin scroll horizontal' + suf, await sinScrollH(p));
      await p.screenshot({ path: arch('semana'), fullPage: true });

      // Foco visible en el chip de filtro con teclado.
      await p.focus('[data-ph-donde="horario"][data-ph-filtro=""]');
      await p.keyboard.press('Tab');
      const foco = await p.evaluate(() => { const a = document.activeElement; const s = getComputedStyle(a); return { f: a.dataset.phFiltro, o: s.outlineStyle, w: parseFloat(s.outlineWidth) }; });
      ok('foco visible en los chips (teclado)' + suf, foco.f !== undefined && foco.o !== 'none' && foco.w >= 2, JSON.stringify(foco));

      // Flechas y «Hoy».
      await p.click('[data-ph-semana="1"]');
      ok('«Siguiente» lleva a la semana del 9 de noviembre' + suf, (await lunesVisible(p)) === '2026-11-09');
      const ofi2 = await p.$$eval('#ph-semana .ph-dia', xs => xs.filter(x => x.querySelector('[data-ph-oficina]')).map(x => x.dataset.phDia));
      ok('la regla nueva sale del plan: oficina lunes 9 y martes 10' + suf, ofi2.join(',') === '2026-11-09,2026-11-10', ofi2.join(','));
      ok('estado vacío cuidado en un día sin tareas («Día libre»)' + suf, await p.$$eval('#ph-semana .ph-libre', xs => xs.length > 0 && xs.every(x => /Día libre/.test(x.textContent))));
      const pronto = await p.$eval('[data-ph-tarea="profe-staff-2026-11-11"]', x => x.textContent).catch(() => '');
      ok('lo que aún no abre dice «Llega pronto» sin botón' + suf, /Llega pronto/.test(pronto) && !(await p.$('[data-ph-tarea="profe-staff-2026-11-11"] button')));
      ok('«Siguiente» deshabilitado en la última semana' + suf, await p.$eval('[data-ph-semana="1"]', x => x.disabled));
      await p.click('[data-ph-semana="hoy"]');
      ok('«Hoy» regresa a la semana de hoy' + suf, (await lunesVisible(p)) === '2026-11-02');
      await p.click('[data-ph-semana="-1"]');
      ok('«Anterior» lleva a la semana del 26 de octubre y se deshabilita al inicio' + suf, (await lunesVisible(p)) === '2026-10-26' && await p.$eval('[data-ph-semana="-1"]', x => x.disabled));
      // Clase en vivo pasada (domingo 1, sin intentos): «✓ Impartida», nunca «⏰ Vencida».
      const mp = await estadoDe(p, 'meet-2026-11-01');
      ok('meet pasado: «✓ Impartida» con «🎥 Clase en vivo», nunca «Vencida»' + suf, mp && mp.estado === 'impartida' && /Impartida/.test(mp.texto) && /Clase en vivo/.test(mp.texto) && !/Vencida/.test(mp.texto), mp ? mp.texto.slice(0, 120) : 'no está');
      ok('semana pasada: ningún meet vencido' + suf, !(await p.$('#ph-semana .ph-t-meet[data-estado="vencida"]')));
      await p.click('[data-ph-semana="hoy"]');

      // Progreso por materia (con el resumen de plan.json para Staff y Tech Lead).
      const prog = await p.$$eval('#ph-progreso .ph-prog', xs => xs.map(x => ({ m: x.dataset.phProg, n: x.querySelector('.ph-prog-n').textContent, c: x.querySelector('.ph-prog-cierre').textContent, v: x.querySelector('[role="progressbar"]').getAttribute('aria-valuenow') })));
      const de = m => prog.find(x => x.m === m) || {};
      ok('progreso: una barra por materia en el orden del catálogo' + suf, prog.map(x => x.m).join('|') === 'Inglés|IA · Agentic Engineer|Staff Software Engineer|Tech Lead|Cultura General|Evaluación', prog.map(x => x.m).join('|'));
      ok('progreso: Staff con el resumen (1/38, cierra el 29 ene 2027)' + suf, de('Staff Software Engineer').n === '1/38' && /29 ene 2027/.test(de('Staff Software Engineer').c) && de('Staff Software Engineer').v === '1', JSON.stringify(de('Staff Software Engineer')));
      ok('progreso: calculado sin resumen (IA 1/3, cierra el 10 nov 2026; Inglés 2/7 con lo del grupo)' + suf, de('IA · Agentic Engineer').n === '1/3' && /10 nov 2026/.test(de('IA · Agentic Engineer').c) && de('Inglés').n === '2/7', JSON.stringify([de('IA · Agentic Engineer'), de('Inglés')]));

      // Filtro por materia (uno para las dos pestañas, recordado tras recargar).
      await p.click('[data-ph-donde="horario"][data-ph-filtro="IA · Agentic Engineer"]');
      const visibles = await p.$$eval('#ph-semana .ph-tarea', xs => xs.map(x => x.dataset.materia));
      ok('filtro IA: solo tareas de IA en la semana' + suf, visibles.length === 1 && visibles.every(m => m === 'IA · Agentic Engineer'), visibles.join(','));
      ok('filtro: chip con aria-pressed y foco conservado' + suf, await p.$eval('[data-ph-donde="horario"][data-ph-filtro="IA · Agentic Engineer"]', x => x.getAttribute('aria-pressed') === 'true' && document.activeElement === x));
      ok('filtro: las demás barras quedan atenuadas, no se ocultan' + suf, (await p.$$('#ph-progreso .ph-prog.ph-atenuada')).length === 5);
      await p.reload();
      await p.waitForSelector('#ph-semana', { state: 'attached', timeout: 60000 });
      ok('se recuerdan la pestaña y el filtro al volver' + suf, await p.$eval('[data-pf-tab="horario"]', x => x.getAttribute('aria-selected') === 'true') && await p.$eval('[data-ph-donde="horario"][data-ph-filtro="IA · Agentic Engineer"]', x => x.getAttribute('aria-pressed') === 'true'));

      // ---------- 🧭 Por materia ----------
      await p.click('[data-pf-tab="materias"]');
      ok('Por materia: respeta el filtro elegido' + suf, (await p.$$eval('#ph-por-materia .ph-materia', xs => xs.map(x => x.dataset.phMateria))).join('|') === 'IA · Agentic Engineer');
      await p.click('[data-ph-donde="materias"][data-ph-filtro=""]');
      const mats = await p.$$eval('#ph-por-materia .ph-materia', xs => xs.map(x => ({ m: x.dataset.phMateria, l: [...x.querySelectorAll('.ph-linea')].map(l => ({ t: l.dataset.phLinea, ids: [...l.querySelectorAll('[data-ph-fila]')].map(f => f.dataset.phFila) })) })));
      ok('Por materia: todas, en el orden del catálogo' + suf, mats.map(x => x.m).join('|') === 'Inglés|IA · Agentic Engineer|Staff Software Engineer|Tech Lead|Cultura General|Evaluación', mats.map(x => x.m).join('|'));
      const ingl = (mats.find(x => x.m === 'Inglés') || { l: [] }).l;
      ok('Por materia: Inglés por línea (su nivel, «Clases en vivo» e «Inglés con el grupo»)' + suf, ingl.map(l => l.t).join('|') === 'Inglés A1|Clases en vivo|Inglés con el grupo', ingl.map(l => l.t).join('|'));
      const vivo = await p.$eval('#ph-por-materia [data-ph-linea="Clases en vivo"]', x => ({ n: x.querySelector('.ph-linea-n').textContent, est: [...x.querySelectorAll('[data-ph-fila]')].map(f => f.dataset.estado).join(',') })).catch(() => null);
      ok('Por materia: los meets se listan sin contar (0/0) y sin «vencida»' + suf, vivo && vivo.n === '0/0' && vivo.est === 'impartida,proxima', JSON.stringify(vivo));
      const ids = (ingl[0] || { ids: [] }).ids;
      ok('Por materia: dentro de la línea, en orden de fecha' + suf, ids.join(',') === 'profe-ing-0,profe-ing-1,profe-ing-2,profe-ing-3,profe-ing-4,profe-ing-5', ids.join(','));
      ok('Por materia: el filtro «Todas» también aplica en Mi horario' + suf, await p.$eval('[data-ph-donde="horario"][data-ph-filtro=""]', x => x.getAttribute('aria-pressed') === 'true'));
      ok('Por materia: controles de 44 px o más' + suf, !(await chicos(p)).length, (await chicos(p)).join(' '));
      ok('Por materia: sin scroll horizontal' + suf, await sinScrollH(p));
      await p.screenshot({ path: arch('materias'), fullPage: true });

      // La liga a cada actividad sigue: «Abrir» pide el elemento al servidor.
      await p.click('[data-pf-tab="horario"]');
      await p.click('[data-ph-tarea="profe-act-2026-11-04"] [data-action="abrir-item"]');
      await p.waitForTimeout(800);
      ok('«Abrir» abre la actividad (pide /ingles/profe/actividades/<id>)' + suf, pedidos.some(x => x.endsWith('/ingles/profe/actividades/profe-act-2026-11-04')), pedidos.join(','));
      await p.context().close();
    }
  }
  // Sin `plan.diasOficina`: no hay sello 🏢 (nunca se calcula por día de la semana).
  const sinOfi = JSON.parse(FIXTURE); delete sinOfi.plan.diasOficina; delete sinOfi.plan.titulo; delete sinOfi.plan.subtitulo;
  const q = await abrirPagina(b, { email: ADMIN, viejo: true, ingles: true, out, viewport: { width: 360, height: 780 }, init: [() => { localStorage.setItem('profe_tab', 'horario'); localStorage.removeItem('profe_materia'); }] });
  await q.route(/\/ingles\/profe\/actividades\?/, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(sinOfi) }));
  await q.goto(require('./lib/navegador').urlDe('/ingles.html?modo=profe'));
  await q.waitForSelector('#ph-semana', { timeout: 60000 });
  ok('sin plan.diasOficina: ningún sello 🏢 ni aviso de oficina, máximo 4 todos los días', !(await q.$('.ph-sello, [data-ph-oficina]')) && await q.$$eval('#ph-semana .ph-cupo', xs => xs.every(x => /máx\. 4/.test(x.textContent))));
  const cab = await q.evaluate(() => ({ t: document.getElementById('titulo').textContent, s: document.getElementById('subtitulo').textContent }));
  ok('sin plan.titulo ni plan.subtitulo: «🍥 Mi propio camino ninja» y subtítulo con sus materias', cab.t === '🍥 Mi propio camino ninja' && /Tech Lead/.test(cab.s) && !/Tus clases propias/.test(cab.s), JSON.stringify(cab));
  await q.context().close();
  await b.close();
  console.log(out.join('\n')); process.exit(out.some(x => x.startsWith('FAIL')) ? 1 : 0);
})().catch(e => { console.log(out.join('\n')); console.error('ERROR', e.message.slice(0, 300)); process.exit(2); });
