// E2E: revisión del profe en Secundaria (openspec: revision-profe). Semana propia de la alumna del fixture
// (tests/fixtures/datos, lunes 2026-09-14; no toca la 2026-10-26 de secundaria-clases): una clase sin abrir, una en
// borrador (2 de 4), una enviada a tiempo (80 %), una fuera de tiempo (50 %, ya calificada por el profe con 6) y una de
// Español con audio y libro de ortografía (70 %).
//   1. API: semana, estados, qué pide cada clase, matriz de acceso (403 alumna o alumno, 401 sin sesión), 400 y 404, y
//      la alumna solo recibe calificación y comentario.
//   2. Profe (PC): la pestaña «📋 Revisión» es perezosa; navega a la semana; tarjetas y resumen; marca el checklist,
//      el audio y el libro, califica y comenta; recarga y todo sigue; la final sale de RevisionDatos.finalDe.
//   3. Alumna: «✅ Revisado por el profe: N · comentario» en su lista y en la clase, sin checklist.
//   4. Celular 360, tablet 768 y PC 1280, en claro y oscuro: sin scroll horizontal, objetivos ≥ 44 px, sin errores.
// Con --pg (PostgREST falso o real, solo stald_test_*) siembra el borrador y la revisión de ejemplo en stald_test_docs
// (la migración solo lleva resultados/ y avance/). Restaura lo que guarda: deja las revisiones como en el fixture.
// Selectores `data-testid` acordados para la UI: ver openspec/changes/revision-profe/design.md («Selectores de la E2E»).
require('./lib/entorno'); // BASE, API, DATA, CHROME, carpeta de salida y sesión de prueba en fetch
const { chromium } = require('playwright');
const fs = require('node:fs');
const { abrirPagina } = require('./lib/navegador');
const { irPestanaSec } = require('./lib/secundaria');
const API = process.env.API;
const DATA = process.env.DATA;
const out = []; const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`);
const ADMIN = 'admin@example.com';
const ALUMNA = 'valeria@example.com';
const SLUG = 'valeria';
const LUNES = '2026-09-14';
const ID = { sinAbrir: 'sec-rev-e2e-sin-abrir', borrador: 'sec-rev-e2e-borrador', aTiempo: 'sec-rev-e2e-a-tiempo', tarde: 'sec-rev-e2e-tarde', espanol: 'sec-rev-e2e-espanol' };
const TAMANOS = [{ n: 'celular', width: 360, height: 780 }, { n: 'tablet', width: 768, height: 1024 }, { n: 'PC', width: 1280, height: 800 }];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const texto = async (p, sel) => ((await p.textContent(sel, { timeout: 5000 }).catch(() => '')) || '').replace(/\s+/g, ' ').trim();
const tarjeta = id => `#sec-revision [data-testid="rev-tarjeta"][data-rev-id="${id}"]`;

const pedir = async (ruta, email, metodo = 'GET', body) => {
  const url = API + ruta + (email ? (ruta.includes('?') ? '&' : '?') + 'email=' + encodeURIComponent(email) : '');
  const r = await fetch(url, { method: metodo, ...(body !== undefined ? { headers: { 'content-type': 'application/json' }, body: typeof body === 'string' ? body : JSON.stringify(body) } : {}) });
  return { status: r.status, body: await r.json().catch(() => ({})) };
};
const semana = (s = LUNES) => pedir(`/profe/revision?alumna=${SLUG}&semana=${s}`, ADMIN);
const claseDe = (sem, id) => [...(sem.body.clases || []), ...(sem.body.abiertas || [])].find(c => c.id === id);
async function hasta(fn, ms = 9000) {
  const t0 = Date.now(); let v;
  while (Date.now() - t0 < ms) { v = await fn().catch(() => null); if (v) return v; await sleep(400); }
  return v;
}

// --pg: borradores/ y revisiones/ viven en Postgres y la migración no los lleva. Se siembran en stald_test_docs (nunca
// en otra tabla) desde la copia de datos, solo si aún no están.
async function sembrarPg() {
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key || process.env.STALD_TABLAS !== 'stald_test_') return 'sin --pg';
  const docs = [`borradores/${ID.borrador}/${SLUG}.json`, `revisiones/${SLUG}/${ID.tarde}.json`];
  const h = { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' };
  for (const path of docs) {
    const base = url.replace(/\/+$/, '') + '/rest/v1/stald_test_docs';
    const ya = await fetch(base + '?select=path&path=eq.' + encodeURIComponent(path), { headers: h }).then(r => r.json()).catch(() => []);
    if (Array.isArray(ya) && ya.length) continue;
    const data = JSON.parse(fs.readFileSync(DATA + '/' + path, 'utf8'));
    await fetch(base, { method: 'POST', headers: { ...h, Prefer: 'return=minimal' }, body: JSON.stringify({ path, data, version: 1, actualizado: new Date().toISOString() }) });
  }
  return 'sembrado en stald_test_docs';
}

// Objetivos interactivos visibles de `raiz` más chicos que 44×44 px (la casilla se mide por su <label>).
const chicos = (p, raiz) => p.evaluate(raiz => {
  const vis = e => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
  const res = [];
  for (const e of document.querySelectorAll(raiz + ' :is(a[href], button, input:not([type=hidden]), select, textarea, [role=button])')) {
    if (e.closest('[hidden]') || e.disabled) continue;
    const t = e.matches('input[type=checkbox], input[type=radio]') ? (e.closest('label') || (e.id && document.querySelector('label[for="' + e.id + '"]')) || e) : e;
    if (!vis(t)) continue;
    const r = t.getBoundingClientRect();
    if (r.height < 43.5 || r.width < 43.5) res.push((e.dataset.testid || e.tagName.toLowerCase()) + ' ' + Math.round(r.width) + '×' + Math.round(r.height));
  }
  return res;
}, raiz);
const sinScrollH = p => p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
const fondoOscuro = p => p.evaluate(() => { const m = getComputedStyle(document.body).backgroundColor.match(/\d+/g) || []; return m.slice(0, 3).every(n => Number(n) < 70); });

// Errores de consola y JS (las fuentes de Google pueden no cargar sin red; no cuentan).
function vigilar(p) {
  p.errores = [];
  p.on('console', m => { if (m.type() === 'error' && !/favicon|fonts\.(googleapis|gstatic)/.test(m.text() + ((m.location() || {}).url || ''))) p.errores.push(m.text().slice(0, 160)); });
  p.on('pageerror', e => p.errores.push('JS: ' + e.message.slice(0, 160)));
  p.revisiones = [];
  p.on('request', r => { if (/\/profe\/revision(\?|$)/.test(r.url())) p.revisiones.push(r.method()); });
  return p;
}
const pagina = async (b, email, ruta, o = {}) => vigilar(await abrirPagina(b, { email, viejo: true, dialogos: 'aceptar', viewport: o.viewport, contexto: o.tema ? { colorScheme: o.tema } : undefined, ruta, esperar: o.esperar }));

// Lleva la pestaña a la semana LUNES con «◀ Semana anterior» / «Semana siguiente ▶».
async function irASemana(p) {
  for (let i = 0; i < 12; i++) {
    const actual = await p.getAttribute('#sec-revision [data-testid="rev-semana"]', 'data-lunes', { timeout: 30000 });
    if (actual === LUNES) return true;
    await p.click(`#sec-revision [data-testid="rev-semana-${actual > LUNES ? 'anterior' : 'siguiente'}"]`);
    await p.waitForFunction(([a]) => { const e = document.querySelector('#sec-revision [data-testid="rev-semana"]'); return e && e.dataset.lunes !== a; }, [actual], { timeout: 30000 });
  }
  return false;
}
// Calificación: input o select.
async function calificar(p, id, valor) {
  const sel = `${tarjeta(id)} [data-testid="rev-calificacion"]`;
  if (await p.$eval(sel, e => e.tagName) === 'SELECT') await p.selectOption(sel, String(valor)); else await p.fill(sel, String(valor));
}
async function guardarTarjeta(p, id, espera) {
  await p.click(`${tarjeta(id)} [data-testid="rev-guardar"]`);
  return await hasta(async () => { const c = claseDe(await semana(), id); return c && c.revision && espera(c.revision) && c; });
}
// Final mostrada vs. la regla única (RevisionDatos.finalDe) con los datos del servidor.
async function finalCoincide(p, id) {
  const c = claseDe(await semana(), id);
  const esperada = await p.evaluate(c => window.RevisionDatos ? window.RevisionDatos.finalDe(c) : 'sin RevisionDatos', c);
  const attr = await p.getAttribute(`${tarjeta(id)} [data-testid="rev-final"]`, 'data-final').catch(() => null);
  const txt = await texto(p, `${tarjeta(id)} [data-testid="rev-final"]`);
  return { ok: esperada !== null && String(esperada) === attr && txt.includes(String(esperada)), detalle: `esperada=${esperada} data-final=${attr} «${txt}»` };
}

(async () => {
  ok('fixture: semana de revisión en la copia', fs.existsSync(DATA + `/contenido/secundaria/semanas/${LUNES}.json`));
  out.push('INFO ' + await sembrarPg());

  // ---------- 1. API ----------
  const s0 = await semana('2026-09-16');
  ok('API: cualquier día se normaliza a su lunes', s0.status === 200 && s0.body.semana && s0.body.semana.lunes === LUNES && s0.body.semana.anterior === '2026-09-07' && s0.body.semana.siguiente === '2026-09-21', JSON.stringify(s0.body.semana || s0.status));
  const c = id => claseDe(s0, id) || {};
  ok('API: sin abrir', c(ID.sinAbrir).estado === 'sin-abrir' && !c(ID.sinAbrir).mejor, JSON.stringify(c(ID.sinAbrir).estado));
  ok('API: en borrador, avanzó 2 de 4', c(ID.borrador).estado === 'borrador' && c(ID.borrador).borrador && c(ID.borrador).borrador.respondidas === 2 && c(ID.borrador).borrador.total === 4, JSON.stringify(c(ID.borrador).borrador));
  ok('API: enviada a tiempo con 80 %', c(ID.aTiempo).estado === 'enviada' && c(ID.aTiempo).mejor && c(ID.aTiempo).mejor.porcentaje === 80 && c(ID.aTiempo).fueraDeTiempo === false, JSON.stringify([c(ID.aTiempo).mejor, c(ID.aTiempo).fueraDeTiempo]));
  ok('API: enviada fuera de tiempo con 50 %', c(ID.tarde).estado === 'enviada' && c(ID.tarde).fueraDeTiempo === true && c(ID.tarde).mejor && c(ID.tarde).mejor.porcentaje === 50);
  ok('API: la revisión previa del profe (6)', c(ID.tarde).revision && c(ID.tarde).revision.calificacion === 6, JSON.stringify(c(ID.tarde).revision));
  ok('API: Español pide audio y libro; su libreta sin esas tareas', c(ID.espanol).pide && c(ID.espanol).pide.audio === true && c(ID.espanol).pide.libro === true && c(ID.espanol).pide.libreta.length === 1, JSON.stringify(c(ID.espanol).pide));
  ok('API: Historia pide 3 tareas de libreta, sin audio ni libro', c(ID.aTiempo).pide && c(ID.aTiempo).pide.libreta.length === 3 && !c(ID.aTiempo).pide.audio && !c(ID.aTiempo).pide.libro, JSON.stringify(c(ID.aTiempo).pide));
  // Matriz de acceso
  ok('acceso: la alumna lee la revisión → 403', (await pedir(`/profe/revision?alumna=${SLUG}&semana=${LUNES}`, ALUMNA)).status === 403);
  ok('acceso: la alumna intenta calificarse → 403', (await pedir('/profe/revision', ALUMNA, 'PUT', { alumna: SLUG, id: ID.aTiempo, checks: [], calificacion: 10, comentario: '' })).status === 403);
  ok('acceso: un alumno de Inglés → 403', (await pedir(`/profe/revision?alumna=${SLUG}`, 'marisol@example.com')).status === 403);
  ok('acceso: sin sesión, GET → 401', (await pedir(`/profe/revision?alumna=${SLUG}`, null)).status === 401);
  ok('acceso: sin sesión, PUT → 401', (await pedir('/profe/revision', null, 'PUT', { alumna: SLUG, id: ID.aTiempo, calificacion: 10 })).status === 401);
  const sigue = claseDe(await semana(), ID.aTiempo);
  ok('acceso: nada se guardó', sigue && sigue.revision === null, JSON.stringify(sigue && sigue.revision));
  // Validaciones
  for (const [n, body, st, err] of [
    ['calificación 9.3', { alumna: SLUG, id: ID.aTiempo, calificacion: 9.3 }, 400, 'calificacion_invalida'],
    ['calificación 11', { alumna: SLUG, id: ID.aTiempo, calificacion: 11 }, 400, 'calificacion_invalida'],
    ['comentario de 301', { alumna: SLUG, id: ID.aTiempo, comentario: 'x'.repeat(301) }, 400, 'comentario_invalido'],
    ['check fuera de rango', { alumna: SLUG, id: ID.aTiempo, checks: [3] }, 400, 'checks_invalidos'],
    ['alumna inexistente', { alumna: 'nadie', id: ID.aTiempo, calificacion: 9 }, 404, 'alumna_no_encontrada'],
    ['clase inexistente', { alumna: SLUG, id: 'sec-rev-e2e-no-existe', calificacion: 9 }, 404, 'no_encontrado'],
  ]) {
    const r = await pedir('/profe/revision', ADMIN, 'PUT', body);
    ok(`validación: ${n} → ${st} ${err}`, r.status === st && r.body.error === err, r.status + ' ' + JSON.stringify(r.body));
  }
  ok('validación: semana inválida → 400', (await semana('2026-13-45')).status === 400);
  // Lo que recibe la alumna
  const lista = await pedir('/secundaria/actividades', ALUMNA);
  const suya = (lista.body.items || []).find(x => x.id === ID.tarde);
  ok('alumna: su clase revisada trae calificación y comentario', suya && suya.revision && suya.revision.calificacion === 6 && suya.revision.comentario === 'Entrégala a tiempo, por favor.', JSON.stringify(suya && suya.revision));
  ok('alumna: sin checklist, audio ni libro', suya && suya.revision && Object.keys(suya.revision).sort().join() === 'calificacion,comentario,revisadoEn', JSON.stringify(suya && suya.revision));
  ok('alumna: las clases sin calificación no traen «revision»', (lista.body.items || []).filter(x => x.id.startsWith('sec-rev-e2e-') && x.id !== ID.tarde).every(x => !('revision' in x)));

  const b = await chromium.launch({ executablePath: process.env.CHROME });
  const pc = TAMANOS[2];
  let hayTab = false;
  try {
    // ---------- 2. Profe en PC: flujo completo ----------
    const p = await pagina(b, ADMIN, `/ingles.html?modo=secundaria&alumna=${SLUG}#inicio`, { viewport: pc, esperar: '#sec-inicio' });
    await sleep(1500);
    ok('perezosa: abrir el tablero no pide /profe/revision', p.revisiones.length === 0, p.revisiones.join());
    hayTab = (await p.$('[data-sec-tab="revision"]')) !== null;
    ok('profe: pestaña «📋 Revisión»', hayTab && (await texto(p, '.sec-tabs [data-sec-tab="revision"]')).includes('Revisión'));
    if (!hayTab) { await p.context().close(); throw new Error('falta la UI del profe (pestaña data-sec-tab="revision"); se sigue con la alumna'); }
    await irPestanaSec(p, 'revision');
    await p.waitForSelector('#sec-revision [data-testid="rev-semana"]', { timeout: 30000 });
    ok('perezosa: al abrir la pestaña, 1 GET /profe/revision', p.revisiones.filter(m => m === 'GET').length === 1, p.revisiones.join());
    ok('navegar: llega a la semana del 14 de septiembre', await irASemana(p));
    ok('navegar: «Esta semana» y «Semana siguiente ▶»', !!(await p.$('#sec-revision [data-testid="rev-semana-hoy"]')) && !!(await p.$('#sec-revision [data-testid="rev-semana-siguiente"]')));
    // Tarjetas
    const estados = await p.$$eval('#sec-revision [data-testid="rev-tarjeta"]', xs => Object.fromEntries(xs.map(x => [x.dataset.revId, x.dataset.estado])));
    ok('tarjetas: estado de cada clase', estados[ID.sinAbrir] === 'sin-abrir' && estados[ID.borrador] === 'borrador' && estados[ID.aTiempo] === 'enviada' && estados[ID.tarde] === 'enviada' && estados[ID.espanol] === 'enviada', JSON.stringify(estados));
    ok('tarjetas: por día (la del lunes en el lunes)', !!(await p.$(`#sec-revision [data-testid="rev-dia"][data-dia="${LUNES}"] [data-rev-id="${ID.sinAbrir}"]`)));
    ok('tarjeta: «⏳ Sin abrir»', (await texto(p, `${tarjeta(ID.sinAbrir)} [data-testid="rev-estado"]`)).includes('Sin abrir'));
    ok('tarjeta: «💾 En borrador · avanzó 2 de 4»', /avanzó 2 de 4/.test(await texto(p, `${tarjeta(ID.borrador)} [data-testid="rev-estado"]`)), await texto(p, `${tarjeta(ID.borrador)} [data-testid="rev-estado"]`));
    ok('tarjeta: a tiempo, «✅ Enviada» con 80 % y sin «⏰»', (await texto(p, `${tarjeta(ID.aTiempo)} [data-testid="rev-estado"]`)).includes('Enviada') && (await texto(p, `${tarjeta(ID.aTiempo)} [data-testid="rev-en-linea"]`)).includes('80') && !(await p.$(`${tarjeta(ID.aTiempo)} [data-testid="rev-fuera-de-tiempo"]`)));
    ok('tarjeta: fuera de tiempo con «⏰»', (await texto(p, `${tarjeta(ID.tarde)} [data-testid="rev-fuera-de-tiempo"]`)).includes('Fuera de tiempo'));
    ok('tarjeta: «🔎 Ver respuestas» en las enviadas', !!(await p.$(`${tarjeta(ID.aTiempo)} [data-testid="rev-ver-respuestas"]`)));
    ok('tarjeta: checklist con las 3 tareas de libreta', (await p.$$(`${tarjeta(ID.aTiempo)} [data-testid="rev-check"]`)).length === 3);
    ok('tarjeta: sin audio ni libro donde no se piden', !(await p.$(`${tarjeta(ID.aTiempo)} [data-testid="rev-audio"]`)) && !(await p.$(`${tarjeta(ID.aTiempo)} [data-testid="rev-libro"]`)));
    ok('tarjeta Español: audio y libro', !!(await p.$(`${tarjeta(ID.espanol)} [data-testid="rev-audio"]`)) && !!(await p.$(`${tarjeta(ID.espanol)} [data-testid="rev-libro"]`)));
    ok('tarjeta: sin revisión, «Final: falta tu revisión»', (await texto(p, `${tarjeta(ID.aTiempo)} [data-testid="rev-final"]`)).includes('falta tu revisión'));
    const fTarde = await finalCoincide(p, ID.tarde);
    ok('final: la ya revisada (50 % y 6) coincide con la fórmula', fTarde.ok, fTarde.detalle);
    // Resumen contra la regla única
    const resumenOk = async etapa => {
      const sem = await semana();
      const esperado = await p.evaluate(cl => window.RevisionDatos && window.RevisionDatos.resumenSemana(cl), sem.body.clases || []);
      const visto = await p.$$eval('#sec-revision [data-testid="rev-resumen"] [data-rev-resumen]', xs => Object.fromEntries(xs.map(x => [x.dataset.revResumen, x.textContent.replace(/\s+/g, ' ').trim()])));
      const num = v => v === null ? '—' : String(v);
      const bien = esperado && ['clases', 'enviadas', 'revisadas', 'pendientes', 'promedio'].every(k => (visto[k] || '').includes(num(esperado[k])));
      ok(`resumen (${etapa}): coincide con RevisionDatos.resumenSemana`, bien, JSON.stringify({ visto, esperado: esperado && { c: esperado.clases, e: esperado.enviadas, r: esperado.revisadas, p: esperado.pendientes, m: esperado.promedio } }));
      return esperado;
    };
    const r1 = await resumenOk('inicial');
    ok('resumen inicial: 1 revisada y 2 pendientes de las de prueba', r1 && r1.revisadas >= 1 && r1.pendientes >= 2);
    // Marcar, calificar y comentar (Historia): casillas 1.ª y 3.ª, 9 y comentario.
    await p.check(`${tarjeta(ID.aTiempo)} [data-testid="rev-check"][data-indice="0"]`);
    const auto = await hasta(async () => { const x = claseDe(await semana(), ID.aTiempo); return x && x.revision && x.revision.checks.includes(0) && x; });
    ok('casillas: se guardan solas al marcarlas', !!auto, JSON.stringify(auto && auto.revision));
    await p.check(`${tarjeta(ID.aTiempo)} [data-testid="rev-check"][data-indice="2"]`);
    await calificar(p, ID.aTiempo, 9);
    await p.fill(`${tarjeta(ID.aTiempo)} [data-testid="rev-comentario"]`, 'Muy buena letra');
    const g1 = await guardarTarjeta(p, ID.aTiempo, r => r.calificacion === 9 && r.comentario === 'Muy buena letra');
    ok('guardar: casillas 0 y 2, 9 y comentario en el servidor', g1 && JSON.stringify(g1.revision.checks) === '[0,2]', JSON.stringify(g1 && g1.revision));
    await p.waitForFunction(s => { const e = document.querySelector(s); return e && e.dataset.final; }, `${tarjeta(ID.aTiempo)} [data-testid="rev-final"]`, { timeout: 10000 }).catch(() => {});
    ok('final: 80 % y 9 → 8.5 (promedio simple)', (await p.getAttribute(`${tarjeta(ID.aTiempo)} [data-testid="rev-final"]`, 'data-final')) === '8.5');
    // Español: audio, libro y su tarea; 8 y comentario.
    await p.check(`${tarjeta(ID.espanol)} [data-testid="rev-audio"]`);
    await p.check(`${tarjeta(ID.espanol)} [data-testid="rev-libro"]`);
    await p.check(`${tarjeta(ID.espanol)} [data-testid="rev-check"][data-indice="0"]`);
    await calificar(p, ID.espanol, 8);
    await p.fill(`${tarjeta(ID.espanol)} [data-testid="rev-comentario"]`, 'Buen audio; revisa la b');
    const g2 = await guardarTarjeta(p, ID.espanol, r => r.calificacion === 8);
    ok('guardar Español: audio, libro, casilla, 8 y comentario', g2 && g2.revision.audio === true && g2.revision.libro === true && JSON.stringify(g2.revision.checks) === '[0]' && g2.revision.comentario === 'Buen audio; revisa la b', JSON.stringify(g2 && g2.revision));
    const r2 = await resumenOk('tras guardar');
    ok('resumen: se actualiza al guardar (2 revisadas más)', r1 && r2 && r2.revisadas === r1.revisadas + 2 && r2.pendientes === r1.pendientes - 2);
    // Recargar: la pestaña vuelve (con #revision) y todo sigue.
    p.revisiones.length = 0;
    await p.reload();
    await p.waitForSelector('#sec-revision [data-testid="rev-semana"]', { timeout: 60000 }).catch(() => {});
    ok('recarga: con #revision la pestaña se carga sola', !!(await p.$('#sec-revision:not([hidden]) [data-testid="rev-semana"]')));
    await irASemana(p);
    await p.waitForSelector(tarjeta(ID.aTiempo), { timeout: 30000 });
    const persiste = await p.evaluate(([a, e]) => {
      const q = (id, s) => document.querySelector(`#sec-revision [data-rev-id="${id}"] ${s}`);
      return {
        c0: q(a, '[data-testid="rev-check"][data-indice="0"]')?.checked, c1: q(a, '[data-testid="rev-check"][data-indice="1"]')?.checked, c2: q(a, '[data-testid="rev-check"][data-indice="2"]')?.checked,
        cal: q(a, '[data-testid="rev-calificacion"]')?.value, com: q(a, '[data-testid="rev-comentario"]')?.value,
        audio: q(e, '[data-testid="rev-audio"]')?.checked, libro: q(e, '[data-testid="rev-libro"]')?.checked, calE: q(e, '[data-testid="rev-calificacion"]')?.value,
      };
    }, [ID.aTiempo, ID.espanol]);
    ok('recarga: casillas, calificación y comentario persisten', persiste.c0 && !persiste.c1 && persiste.c2 && Number(persiste.cal) === 9 && persiste.com === 'Muy buena letra' && persiste.audio && persiste.libro && Number(persiste.calE) === 8, JSON.stringify(persiste));
    for (const id of [ID.aTiempo, ID.tarde, ID.espanol]) { const f = await finalCoincide(p, id); ok(`final ${id}: coincide con la fórmula del contrato`, f.ok, f.detalle); }
    ok('profe (PC): sin errores de consola', p.errores.length === 0, p.errores.slice(0, 3).join(' | '));
    await p.screenshot({ path: 'revision-profe-pc.png', fullPage: true });
    await p.context().close();

  } catch (e) {
    ok('profe (UI): el flujo termina', false, e.message.slice(0, 300));
  }
  // Lo que el profe guardó en la tarjeta de Historia; si su UI aún no existe, se guarda por la API para probar a la alumna.
  const hist = claseDe(await semana(), ID.aTiempo);
  if (!(hist && hist.revision && hist.revision.calificacion === 9)) {
    await pedir('/profe/revision', ADMIN, 'PUT', { alumna: SLUG, id: ID.aTiempo, checks: [0, 2], audio: false, libro: false, calificacion: 9, comentario: 'Muy buena letra' });
  }
  try {
    // ---------- 3. Alumna ----------
    const a = await pagina(b, ALUMNA, '/ingles.html?modo=secundaria#semana', { viewport: pc, esperar: '#sec-clases' });
    ok('alumna: la clase revisada está en su lista («📝 Otras clases»)', !!(await a.$(`#sec-clases [data-sec-item="${ID.aTiempo}"]`)));
    const fila = `[data-sec-item="${ID.aTiempo}"] [data-testid="revisado-profe"]`;
    await a.waitForSelector(fila, { timeout: 30000 }).catch(() => {});
    const t = await texto(a, fila);
    ok('alumna: «✅ Revisado por el profe: 9 · Muy buena letra» en su lista', t.includes('✅ Revisado por el profe: 9') && t.includes('Muy buena letra'), t);
    ok('alumna: sin pestaña «📋 Revisión»', !(await a.$('[data-sec-tab="revision"]')));
    ok('alumna: no ve checklist, audio ni libro', !(await a.$('[data-testid="rev-check"], [data-testid="rev-audio"], [data-testid="rev-libro"]')) && !(await a.evaluate(() => /Audio recibido|libro de ortografía revisadas/i.test(document.body.innerText))));
    ok('alumna: sin «Revisado» en clases que el profe no calificó', !(await a.$(`[data-sec-item="${ID.borrador}"] [data-testid="revisado-profe"]`)));
    await a.click(`[data-sec-item="${ID.aTiempo}"] [data-action]`).catch(() => {});
    await a.waitForSelector('#content [data-testid="revisado-profe"]:not([data-sec-item] *)', { timeout: 30000 }).catch(() => {});
    const enClase = await texto(a, '#content [data-testid="revisado-profe"]');
    ok('alumna: también en la clase', enClase.includes('Revisado por el profe: 9'), enClase);
    ok('alumna: sin errores de consola', a.errores.length === 0, a.errores.slice(0, 3).join(' | '));
    ok('alumna: nunca pide /profe/revision', a.revisiones.length === 0);
    await a.context().close();

  } catch (e) {
    ok('alumna (UI): el flujo termina', false, e.message.slice(0, 300));
  }
  try {
    // ---------- 4. Tamaños y temas ----------
    for (const tam of TAMANOS) for (const tema of ['light', 'dark']) {
      const et = `${tam.n} ${tam.width}${tema === 'dark' ? ', oscuro' : ''}`;
      if (hayTab) {
        const q = await pagina(b, ADMIN, `/ingles.html?modo=secundaria&alumna=${SLUG}#inicio`, { viewport: tam, tema, esperar: '#sec-inicio' });
        await irPestanaSec(q, 'revision');
        await irASemana(q);
        await q.waitForSelector(tarjeta(ID.espanol), { timeout: 30000 });
        ok(`${et}: tarjetas y resumen visibles`, (await q.$$('#sec-revision [data-testid="rev-tarjeta"]')).length >= 5 && await q.isVisible('#sec-revision [data-testid="rev-resumen"]'));
        ok(`${et}: sin scroll horizontal`, await sinScrollH(q));
        const ch = await chicos(q, '#sec-revision');
        ok(`${et}: botones y casillas de 44 px o más`, ch.length === 0, ch.slice(0, 6).join(' | '));
        if (tema === 'dark') ok(`${et}: fondo oscuro`, await fondoOscuro(q));
        ok(`${et}: sin errores de consola`, q.errores.length === 0, q.errores.slice(0, 3).join(' | '));
        await q.screenshot({ path: `revision-profe-${tam.width}-${tema}.png`, fullPage: true });
        await q.context().close();
      }
      const al = await pagina(b, ALUMNA, '/ingles.html?modo=secundaria#semana', { viewport: tam, tema, esperar: '#sec-clases' });
      await al.waitForSelector(`[data-sec-item="${ID.aTiempo}"] [data-testid="revisado-profe"]`, { timeout: 30000 }).catch(() => {});
      ok(`${et} (alumna): «✅ Revisado por el profe» visible y sin scroll horizontal`, await al.isVisible(`[data-sec-item="${ID.aTiempo}"] [data-testid="revisado-profe"]`).catch(() => false) && await sinScrollH(al));
      ok(`${et} (alumna): sin errores de consola`, al.errores.length === 0, al.errores.slice(0, 3).join(' | '));
      await al.context().close();
    }
  } catch (e) {
    ok('tamaños (UI): el flujo termina', false, e.message.slice(0, 300));
  } finally {
    // ---------- Restaurar: revisiones como en el fixture ----------
    const vacia = { checks: [], audio: false, libro: false, calificacion: null, comentario: '' };
    for (const id of [ID.sinAbrir, ID.borrador, ID.aTiempo, ID.espanol]) await pedir('/profe/revision', ADMIN, 'PUT', { alumna: SLUG, id, ...vacia });
    await pedir('/profe/revision', ADMIN, 'PUT', { alumna: SLUG, id: ID.tarde, ...vacia, calificacion: 6, comentario: 'Entrégala a tiempo, por favor.' });
    const fin = await semana();
    const revs = (fin.body.clases || []).filter(x => x.id.startsWith('sec-rev-e2e-')).map(x => x.id + ':' + (x.revision ? x.revision.calificacion : '-'));
    ok('restaurado: solo la revisión del fixture (6)', revs.length === 5 && revs.filter(r => !r.endsWith(':-')).join() === ID.tarde + ':6', revs.join());
    await b.close();
  }
  console.log(out.join('\n'));
  process.exit(out.some(x => x.startsWith('FAIL')) ? 1 : 0);
})().catch(e => { console.log(out.join('\n')); console.error('ERROR', e.message.slice(0, 400)); process.exit(2); });
