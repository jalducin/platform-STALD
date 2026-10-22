// E2E fix-ingles-admin (fase `ingles`; con o sin --pg): el admin de Inglés carga sin errores y puede ocultar grupos
// desde la tarjeta de cada grupo del Resumen.
// 1. Carga del admin y cada pestaña (y la ruta del profe): CUALQUIER error de consola, error JS, script o estilo que no
//    carga (4xx/5xx o fallido) o respuesta 5xx de la API es FAIL.
// 2. Resumen sin «No se pudo cargar el resumen».
// 3. Con grupos (--pg): «👁️ Ocultar del panel» visible en cada tarjeta, junto a «🔍 Ver grupo»; ocultar → la tarjeta
//    sale del tablero; «Mostrar grupos ocultos (N)» → vuelve con «Mostrar en el panel»; tocarlo → queda visible otra
//    vez. La bandera se restaura al final (también si algo falla).
// 4. Si /ingles/resumen falla (simulado en el navegador), el aviso trae «🔄 Reintentar» y las tarjetas siguen.
// 5. Celular (360 px, openspec: navegacion-mejoras): «📥 Entregas» en la barra inferior (6 botones, sin scroll horizontal,
//    44 px o más) con el contador de entregas listas = `pendientes` de la bandeja; un toque abre la bandeja. En PC el
//    menú lateral conserva el orden del catálogo.
require('./lib/entorno'); // BASE, API, DATA, CHROME, carpeta de salida y sesión de prueba en fetch
const { chromium } = require('playwright');
const { abrirPagina, urlDe } = require('./lib/navegador');
const API = process.env.API;
const out = []; const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`);
const ADMIN = 'admin@example.com';
const SECCIONES = ['resumen', 'grupos', 'alumnos', 'registro', 'semana', 'resultados', 'material', 'presentar', 'juegos', 'nicks', 'entregas'];
const api = async (ruta, body) => { const r = await fetch(API + ruta + (ruta.includes('?') ? '&' : '?') + 'email=' + ADMIN, body ? { method: 'POST', headers: { 'content-type': 'text/plain;charset=UTF-8' }, body: JSON.stringify(body) } : {}); return { status: r.status, body: await r.json().catch(() => ({})) }; };

// Registra errores de consola, errores JS, recursos que no cargan y 5xx de la API. Única excepción: sin Postgres,
// GET /ingles/grupos responde 503 `sin_base` a propósito (Chrome lo anota en consola); con --pg no se excusa nada.
function vigilar(p, errores, sinBase) {
  const excusado = m => sinBase && /status of 503/.test(m.text()) && /\/ingles\/grupos\?/.test((m.location() || {}).url || '');
  p.on('console', m => { if (m.type() === 'error' && !excusado(m)) errores.push('consola: ' + m.text().slice(0, 200) + ' ' + ((m.location() || {}).url || '').slice(0, 120)); });
  p.on('pageerror', e => errores.push('JS: ' + e.message.slice(0, 200)));
  p.on('requestfailed', r => { if (!/favicon/.test(r.url())) errores.push('falló: ' + r.url().slice(0, 160) + ' ' + ((r.failure() || {}).errorText || '')); });
  p.on('response', r => {
    const u = r.url(), s = r.status();
    if (s >= 400 && /\.(js|css)(\?|$)/.test(u)) errores.push(s + ' recurso: ' + u.slice(0, 160));
    if (s >= 500 && u.startsWith(API) && !(sinBase && s === 503 && /\/ingles\/grupos\?/.test(u))) errores.push(s + ' API: ' + u.replace(API, '').split('?')[0]);
  });
}
const esperarResumen = p => p.waitForFunction(() => document.getElementById('kpis') || document.getElementById('resumen-error'), null, { timeout: 60000 });

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME });
  const grupos = await api('/ingles/grupos');
  const conGrupos = grupos.status === 200 && (grupos.body.grupos || []).some(g => g.activo);
  // Un grupo activo y visible en el panel; su bandera original se restaura al final.
  const g1 = conGrupos ? grupos.body.grupos.find(g => g.activo && !g.ocultoAdmin) || null : null;
  const original = g1 ? g1.ocultoAdmin === true : null;
  try {
    // 1. Carga limpia del admin, pestaña por pestaña
    const errores = [];
    const p = await abrirPagina(b, { email: ADMIN, viejo: true, ingles: true }); // sin ruta: las escuchas van antes
    vigilar(p, errores, grupos.status === 503);
    await p.goto(urlDe('/ingles.html#resumen'));
    await p.waitForSelector('#app:not([style*="display: none"]) #panel-profe', { timeout: 60000 });
    await esperarResumen(p);
    ok('Resumen: sin «No se pudo cargar el resumen»', !(await p.$('#resumen-error')), (await p.$('#resumen-error')) ? await p.textContent('#resumen-error') : '');
    for (const s of SECCIONES) {
      await p.evaluate(h => { location.hash = h; }, s);
      await p.waitForFunction(h => { const x = document.querySelector('section[data-seccion="' + h + '"]'); return x && !x.hidden; }, s, { timeout: 15000 })
        .then(() => ok('pestaña «' + s + '» visible', true), () => ok('pestaña «' + s + '» visible', false));
      await p.waitForTimeout(400);
    }
    await p.screenshot({ path: 'ingles-admin-carga.png', fullPage: true });
    const ruta = await abrirPagina(b, { email: ADMIN, viejo: true, ingles: true });
    vigilar(ruta, errores, grupos.status === 503);
    await ruta.goto(urlDe('/ingles.html?modo=profe'));
    await ruta.waitForSelector('#app:not([style*="display: none"])', { timeout: 60000 });
    await ruta.waitForTimeout(1500);
    await ruta.context().close();
    ok('carga del admin de Inglés (todas las pestañas y la ruta del profe) sin errores de consola, JS, recursos ni 5xx', errores.length === 0, errores.slice(0, 6).join(' | '));

    // 3. Ocultar y mostrar desde la tarjeta del grupo
    if (!g1) {
      out.push('PASS sin Postgres no hay grupos: se omite «Ocultar del panel» en las tarjetas (corre con --pg)');
    } else {
      await p.evaluate(() => { location.hash = 'resumen'; });
      await p.waitForSelector('#pp-grupos .pp-grupo', { timeout: 30000 });
      const tarjetas = await p.$$eval('#pp-grupos .pp-grupo', xs => xs.map(x => ({ id: x.dataset.grupoId, ocultar: !!x.querySelector('[data-action="ocultar-grupo"]'), ver: !!x.querySelector('[data-action="ver-grupo"]'), texto: (x.querySelector('[data-action="ocultar-grupo"]') || {}).textContent || '' })));
      ok('cada tarjeta de grupo tiene «👁️ Ocultar del panel» junto a «🔍 Ver grupo»', tarjetas.length > 0 && tarjetas.every(t => t.ocultar && t.ver && /Ocultar del panel/.test(t.texto)), JSON.stringify(tarjetas));
      const boton = `#pp-grupos .pp-grupo[data-grupo-id="${g1.id}"] [data-action="ocultar-grupo"]`;
      ok('el botón se ve (visible y de 44 px o más)', await p.isVisible(boton) && (await p.$eval(boton, x => x.getBoundingClientRect().height)) >= 43.5);
      await p.screenshot({ path: 'ingles-admin-tarjetas.png', fullPage: true });

      await p.click(boton);
      await p.waitForFunction(id => !document.querySelector('#pp-grupos .pp-grupo[data-grupo-id="' + id + '"]') && document.getElementById('mostrar-ocultos'), g1.id, { timeout: 30000 });
      const tras = await api('/ingles/grupos');
      ok('ocultar → el grupo sale del tablero y la bandera queda en el servidor', (tras.body.grupos.find(g => g.id === g1.id) || {}).ocultoAdmin === true);
      ok('interruptor «Mostrar grupos ocultos (1)»', /Mostrar grupos ocultos \(1\)/.test(await p.textContent('.grupos-barra')));

      await p.check('#mostrar-ocultos');
      await p.waitForSelector(`#pp-grupos .pp-grupo[data-grupo-id="${g1.id}"] [data-oculto]`, { timeout: 30000 });
      ok('con el interruptor el grupo vuelve marcado y con «Mostrar en el panel»', /Mostrar en el panel/.test(await p.textContent(boton)));
      await p.click(boton);
      await p.waitForFunction(sel => /Ocultar del panel/.test((document.querySelector(sel) || {}).textContent || '') && !document.getElementById('mostrar-ocultos'), boton, { timeout: 30000 });
      const fin = await api('/ingles/grupos');
      ok('mostrar → el grupo vuelve al tablero, bandera en false y sin interruptor', (fin.body.grupos.find(g => g.id === g1.id) || {}).ocultoAdmin === false);
    }

    // 4. Resumen que falla: aviso con «Reintentar» y tarjetas de grupo a la mano
    await p.route(/\/ingles\/resumen\?/, r => r.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'upstream_error', detalle: 'Signal timed out.' }) }));
    await p.evaluate(() => { location.hash = 'resumen'; });
    await p.reload();
    await p.waitForSelector('#resumen-error', { timeout: 60000 });
    const txt = await p.textContent('#resumen-error');
    ok('resumen caído: aviso con el motivo y «🔄 Reintentar»', /upstream_error/.test(txt) && /Signal timed out/.test(txt) && !!(await p.$('#resumen-error [data-action="reintentar-resumen"]')), txt);
    if (conGrupos) ok('resumen caído: las tarjetas con «Ocultar del panel» siguen', !!(await p.$('#pp-grupos [data-action="ocultar-grupo"]')));
    await p.unroute(/\/ingles\/resumen\?/);
    await p.click('[data-action="reintentar-resumen"]');
    await p.waitForSelector('#kpis', { timeout: 60000 });
    ok('«🔄 Reintentar» carga el resumen', !(await p.$('#resumen-error')));

    // 5. Celular: «📥 Entregas» en la barra con su contador
    const bandeja = await api('/profe/entregas');
    const pend = bandeja.status === 200 ? bandeja.body.pendientes : null;
    const c = await abrirPagina(b, { email: ADMIN, viejo: true, ingles: true, viewport: { width: 360, height: 740 }, contexto: { hasTouch: true, isMobile: true } });
    await c.goto(urlDe('/ingles.html#resumen'));
    await c.waitForSelector('#panel-profe', { timeout: 60000 });
    const barra = await c.$$eval('#nav .nav-item', xs => xs.filter(x => x.offsetParent).map(x => ({ id: x.dataset.nav || x.dataset.navAccion, w: Math.round(x.getBoundingClientRect().width), h: Math.round(x.getBoundingClientRect().height) })));
    ok('celular: barra con Resumen, Alumnos, Semana, Resultados, 📥 Entregas y ☰ Más (44 px o más)', barra.map(x => x.id).join() === 'resumen,alumnos,semana,resultados,entregas,mas' && barra.every(x => x.w >= 44 && x.h >= 44), JSON.stringify(barra));
    ok('celular: la barra no causa scroll horizontal a 360 px', await c.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    if (pend !== null) {
      // La bandeja la pide el panel en paralelo: el contador aparece cuando llega (sin peticiones nuevas).
      const txt = pend ? await c.waitForSelector('#nav [data-nav="entregas"] [data-contador-entregas]', { timeout: 30000 }).then(e => e.textContent(), () => '') : '';
      ok(`celular: contador de Entregas = ${pend} listas para evaluar`, pend ? txt === String(Math.min(pend, 99)) + (pend > 99 ? '+' : '') && /por revisar/.test(await c.textContent('#nav [data-nav="entregas"]')) : !(await c.$('#nav [data-contador-entregas]')), txt);
    }
    await c.tap('#nav [data-nav="entregas"]');
    await c.waitForSelector('[data-seccion="entregas"]:not([hidden]) #sec-entregas .ent-card, [data-seccion="entregas"]:not([hidden]) #sec-entregas .vacio', { timeout: 30000 });
    ok('celular: un toque en la barra abre 📥 Entregas', new URL(c.url()).hash === '#entregas');
    await c.context().close();
    const pc = await abrirPagina(b, { email: ADMIN, viejo: true, ingles: true, viewport: { width: 1280, height: 800 }, ruta: '/ingles.html#resumen', esperar: '#panel-profe' });
    const menu = await pc.$$eval('#nav .nav-item', xs => xs.filter(x => x.offsetParent).map(x => x.dataset.nav || x.dataset.navAccion).join());
    ok('PC: el menú lateral conserva el orden del catálogo (Entregas antes de Salir)', menu === 'resumen,grupos,alumnos,registro,semana,resultados,material,presentar,ruta,juegos,nicks,entregas,salir', menu);
    await pc.context().close();
  } finally {
    if (g1) {
      const r = await api('/ingles/grupos/ocultar', { grupo: g1.id, oculto: original }); // restaura la bandera original
      const fin = await api('/ingles/grupos');
      ok('estado restaurado: la bandera del grupo como estaba (' + original + ')', r.status === 200 && (fin.body.grupos.find(g => g.id === g1.id) || {}).ocultoAdmin === original);
    }
    await b.close();
  }
  console.log(out.join('\n')); process.exit(out.some(x => x.startsWith('FAIL')) ? 1 : 0);
})().catch(e => { console.log(out.join('\n')); console.error('ERROR', e.message.slice(0, 300)); process.exit(2); });
