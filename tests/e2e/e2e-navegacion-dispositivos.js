// E2E navegacion-dispositivos (openspec: navegacion-dispositivos): recorre las tareas clave de cada persona en celular
// (360×740, con toque), tablet (768×1024 y 1024×768, con toque) y PC (1280×800 y 1920×1080) y mide, por tarea y
// tamaño: toques o clics de navegación, tiempo hasta que cada pantalla es usable, peticiones al API, errores de
// consola, scroll horizontal, objetivos táctiles < 44 px (solo con toque), elementos tapados o fuera de pantalla y si
// hay forma clara de volver (enlace a Inicio, barra inferior o «← Volver», y el atrás del navegador).
// Además revisa el teclado en PC (Tab, Enter y foco visible), los enlaces profundos y que el diseño aproveche el ancho
// en tablet y PC.
//
// Falla ante: scroll horizontal, objetivos táctiles < 44 px en celular, errores de consola o JS, elementos tapados,
// tareas con más toques que su tope (TOPE_TOQUES) o pantallas que tardan más de TOPE_MS, atrás del navegador que saca
// de la plataforma y foco invisible. MEDIR=1 solo imprime la tabla (sin topes), para tomar la línea base.
// NAV_SOLO=<tarea,tarea> y NAV_DISP=<dispositivo,…> acotan la corrida.
//
// Datos: la clase de Secundaria necesita `--hoy 2026-10-27` (fixture `sec-e2e-clase-*` de valeria; con otro día esa
// tarea sale OMIT) y ocultar/mostrar «Grupo 1» necesita `--pg` (sin Postgres, OMIT). Envía clases, actividades y una
// evaluación solo en la copia temporal de datos (correr.sh la borra al terminar). Deja ocultar/mostrar como estaba.
require('./lib/entorno'); // BASE, API, DATA, CHROME, carpeta de salida y sesión de prueba en fetch
const { chromium } = require('playwright');
const fs = require('node:fs');
const { abrirPagina, urlDe } = require('./lib/navegador');
const { MENU } = require('./lib/menu');
const API = process.env.API;
const MEDIR = process.env.MEDIR === '1';
const out = []; const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'} ${n}${x ? ' ' + x : ''}`);
const omit = (n, x) => out.push(`OMIT ${n} ${x}`);
const lista = v => (v ? v.split(',').map(s => s.trim()).filter(Boolean) : null);
const SOLO = lista(process.env.NAV_SOLO), SOLO_DISP = lista(process.env.NAV_DISP);

const DISPOSITIVOS = [
  { id: 'celular', w: 360, h: 740, toque: true },
  { id: 'tablet-v', w: 768, h: 1024, toque: true },
  { id: 'tablet-h', w: 1024, h: 768, toque: true },
  { id: 'pc', w: 1280, h: 800 },
  { id: 'pc-xl', w: 1920, h: 1080 },
].filter(d => !SOLO_DISP || SOLO_DISP.includes(d.id));

// Tope de toques o clics de navegación por tarea (sin contar las respuestas de un examen ni lo que se escribe).
// Fijado con la auditoría del cambio (openspec/changes/navegacion-dispositivos/reports/2026-10-22-auditoria.md): lo medido en el peor tamaño, sin holgura extra.
const TOPE_TOQUES = {
  'sec-clase': 4, // tarjeta Secundaria → la clase de hoy → Enviar → Siguiente misión (o «Ver resultado» en vez de abrir y enviar)
  'sec-secciones': 3, // Mi horario, Mis materias, Misiones (una por pestaña)
  'ingles-actividad': 4, // tarjeta Inglés → la actividad (en «Para hoy» o, si no está, «Semana» →) → Enviar
  'ingles-material': 2, // Material → Ver PDF
  'juegos-invitado': 6, // «Solo vengo a jugar» → aviso → Entrar → categoría → juego → «Volver»
  'profe-grupos': 7, // Ver grupo → Ver todos → Ocultar → Mostrar → (☰ Más →) Entregas → Guardar evaluación (no cuenta)
  'profe-secundaria': 3, // tarjeta Secundaria → elegir alumna → Resultados
  'profe-ruta': 3, // (Más →) Mi ruta → Empezar
};
const TOPE_MS = 8000; // cada pantalla usable en menos de 8 s con el servidor local (holgado para la máquina de pruebas)

const sleep = ms => new Promise(r => setTimeout(r, ms));
const api = (ruta, email, body) => fetch(API + ruta + (ruta.includes('?') ? '&' : '?') + 'email=' + encodeURIComponent(email),
  body ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : {}).then(async r => ({ status: r.status, body: await r.json().catch(() => ({})) }));

// Objetivos interactivos visibles más chicos que 44×44 px. Excluye el enlace «Saltar al contenido» (fuera de pantalla a
// propósito), los enlaces dentro de un párrafo (WCAG 2.5.8 los exime), lo deshabilitado y los controles del mando de los
// juegos (tabindex=-1). Una casilla o radio dentro de su <label> se mide por la etiqueta.
async function objetivosChicos(p) {
  return p.evaluate(() => {
    const vis = e => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && Number(s.opacity) > 0; };
    const sel = 'a[href], button, input:not([type=hidden]), select, textarea, summary, [role=button], [role=tab]';
    const res = [];
    for (const e of document.querySelectorAll(sel)) {
      if (e.closest('.skip, [hidden], dialog:not([open])') || e.disabled || e.getAttribute('tabindex') === '-1' && !e.matches('[role=tab]')) continue;
      let t = e;
      if (e.matches('input[type=checkbox], input[type=radio]')) { t = e.closest('label') || (e.id && document.querySelector('label[for="' + e.id + '"]')) || e; }
      if (!vis(t)) continue;
      if (e.tagName === 'A' && !e.classList.contains('btn')) {
        const padre = e.parentElement; // enlace en línea dentro de un texto
        if (padre && /^(P|LI|SPAN|SMALL|TD)$/.test(padre.tagName) && padre.textContent.trim().length > e.textContent.trim().length + 10) continue;
      }
      const r = t.getBoundingClientRect();
      if (r.height < 43.5 || r.width < 43.5) res.push((e.id ? '#' + e.id : e.tagName.toLowerCase() + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).join('.') : '')) + ' «' + (e.textContent || e.value || e.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 24) + '» ' + Math.round(r.width) + '×' + Math.round(r.height));
    }
    return res;
  });
}
const anchoUtil = p => p.evaluate(() => {
  const m = document.querySelector('#app .shell') || document.querySelector('.wrap') || document.body; // contenedor de la página
  const r = m.getBoundingClientRect();
  return { ancho: Math.round(r.width), vista: innerWidth };
});

// Medidor de una tarea en una página: cuenta toques, tiempos por pantalla, peticiones al API y errores.
function medidor(p, disp, tarea) {
  const m = { puentes: 0, toques: 0, pantallas: [], peticiones: 0, errores: [], scrollH: [], chicos: new Set(), tapados: [], t: Date.now() };
  p.on('request', r => { if (r.url().startsWith(API)) m.peticiones++; if (r.resourceType() === 'document' && /\/secundaria\.html(\?|#|$)/.test(r.url())) m.puentes++; });
  // Sin Postgres de prueba, /ingles/grupos responde 503 `sin_base` a propósito (como en la E2E ingles-admin): se excusa.
  let sinBase = 0;
  p.on('response', r => { if (r.status() === 503 && /\/ingles\/grupos(\?|$)/.test(r.url())) sinBase++; });
  p.on('console', x => {
    if (x.type() !== 'error' || /favicon/.test(x.text())) return;
    if (sinBase > 0 && /status of 503/.test(x.text())) { sinBase--; return; }
    m.errores.push(x.text().slice(0, 160));
  });
  p.on('pageerror', e => m.errores.push('JS: ' + e.message.slice(0, 160)));
  m.ir = async ruta => { m.t = Date.now(); await p.goto(urlDe(ruta)); };
  // Toca (o hace clic en) el primer elemento visible de `sel`; revisa antes que no esté tapado ni fuera de pantalla.
  m.toca = async (sel, { contar = true } = {}) => {
    const loc = p.locator(sel).filter({ visible: true }).first();
    await loc.waitFor({ state: 'visible', timeout: 30000 });
    await loc.scrollIntoViewIfNeeded();
    const i = await loc.evaluate(e => {
      const r = e.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + Math.min(r.height / 2, 20);
      const arriba = document.elementFromPoint(Math.max(0, Math.min(innerWidth - 1, x)), Math.max(0, Math.min(innerHeight - 1, y)));
      const etq = e.closest('label');
      const tapado = !!arriba && !(arriba === e || e.contains(arriba) || arriba.contains(e) || (etq && etq.contains(arriba)));
      return { w: r.width, h: r.height, tapado, quien: arriba ? (arriba.id ? '#' + arriba.id : arriba.tagName.toLowerCase() + '.' + String(arriba.className).split(' ')[0]) : '', fuera: r.left < -1 || r.right > innerWidth + 1 };
    });
    if (i.tapado) m.tapados.push(sel + ' tapado por ' + i.quien);
    if (i.fuera) m.tapados.push(sel + ' fuera de pantalla');
    if (disp.toque) await loc.tap(); else await loc.click();
    if (contar) m.toques++;
    m.t = Date.now();
  };
  // Espera la pantalla usable, anota su tiempo y revisa scroll horizontal y objetivos chicos.
  m.listo = async (sel, nombre, opciones = {}) => {
    await p.waitForSelector(sel, { timeout: 60000, ...opciones });
    m.pantallas.push({ nombre, ms: Date.now() - m.t });
    await m.revisar(nombre);
  };
  m.revisar = async nombre => {
    if (await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)) m.scrollH.push(nombre);
    if (disp.toque) for (const c of await objetivosChicos(p)) m.chicos.add(nombre + ': ' + c);
  };
  m.tarea = tarea;
  return m;
}

// Formas de volver: enlace visible a Inicio (portal), barra inferior y «← Volver» (o «← Juegos»).
async function formasDeVolver(p) {
  return p.evaluate(() => {
    const vis = e => { if (!e) return false; const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
    const inicio = [...document.querySelectorAll('a[href]')].some(a => vis(a) && /^(\.\/|index\.html)(\?|#|$)/.test(a.getAttribute('href')) && /Inicio/.test(a.textContent));
    const barra = [...document.querySelectorAll('nav')].some(n => vis(n) && getComputedStyle(n).position === 'fixed' && n.getBoundingClientRect().bottom >= innerHeight - 2);
    const volver = [...document.querySelectorAll('[data-action="volver"], [data-a="hub"], [data-a="categorias"], .sec-volver')].some(vis);
    return { inicio, barra, volver };
  });
}
// Atrás del navegador: debe quedarse en la plataforma y mostrar algo (no una página en blanco ni un error).
// `esperado` puede ser una lista: un «atrás» por elemento, en orden (p. ej. pestaña por pestaña).
async function probarAtras(p, esperado) {
  if (Array.isArray(esperado)) {
    let r = { ok: true, a: '' };
    for (const e of esperado) { const x = await probarAtras(p, e); r = { ok: r.ok && x.ok, a: (r.a ? r.a + ' → ' : '') + x.a }; if (!x.ok) break; }
    return r;
  }
  const antes = p.url();
  await p.goBack({ timeout: 15000 }).catch(() => null);
  await sleep(800);
  const url = p.url();
  const enPlataforma = url.startsWith(process.env.BASE);
  const llego = esperado ? await p.waitForSelector(esperado, { timeout: 15000 }).then(() => true, () => false) : true;
  return { ok: enPlataforma && llego && url !== antes, a: url.replace(process.env.BASE, '').replace(/[?&]api=[^&#]+/, '') || '/' };
}

// Contesta el examen o la actividad abierta (opción 1 en cada pregunta; «x» en las de texto). No cuenta como toques.
async function responder(p) {
  if (await p.$('[data-action="ver-todas"]')) await p.click('[data-action="ver-todas"]').catch(() => {});
  // Como lo haría el teclado (reproductor.js): marca y avisa con `change` / `input`; sirve también en el modo de una
  // pregunta a la vez, donde las demás preguntas están ocultas.
  await p.evaluate(() => {
    for (const q of document.querySelectorAll('#exam-form [data-q]')) {
      const r = q.querySelector('input[type=radio]:not(:disabled)');
      if (r) { r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true })); continue; }
      const t = q.querySelector('input.q-text:not(:disabled)');
      if (t) { t.value = 'x'; t.dispatchEvent(new Event('input', { bubbles: true })); }
    }
  });
  return p.waitForFunction(() => { const b = document.getElementById('exam-send'); return b && !b.disabled; }, null, { timeout: 15000 }).then(() => true, () => false);
}

// ---------------------------------------------------------------------------------------------------------------
// Tareas. Cada una recibe (p, m, d, ctx) y devuelve { atras: selector esperado tras «atrás» } o lanza error.
const TAREAS = [
  {
    id: 'sec-clase', titulo: 'portal → Secundaria → clase de hoy → terminar → «Siguiente misión»', email: 'valeria@example.com',
    requiere: ctx => ctx.hoy === '2026-10-27' || 'necesita --hoy 2026-10-27 (clases sec-e2e-clase-* del fixture)',
    // Solo hay 2 clases hoy: la primera vez que queda una pendiente se resuelve y se envía; en los demás tamaños se
    // abre el resultado de la que ya se envió (mismo «Siguiente misión»), sin gastar más clases de la copia.
    async antes(ctx) {
      const r = await api('/secundaria/actividades', 'valeria@example.com');
      const hoy = (r.body.items || []).filter(i => i.id.startsWith('sec-e2e-clase-' + ctx.hoy));
      ctx.secPendiente = (hoy.find(i => i.estado === 'disponible') || {}).id || null;
      ctx.secHecha = (hoy.find(i => i.estado === 'completo') || {}).id || null;
    },
    async correr(p, m, d, ctx) {
      await m.ir('/'); await m.listo('#tiles a[data-espacio="secundaria"]', 'portal');
      if (ctx.secPendiente) {
        const id = ctx.secPendiente; ctx.secPendiente = null;
        await m.toca('#tiles a[data-espacio="secundaria"]'); await m.listo('#sec-inicio [data-sec-card="' + id + '"] [data-action="abrir-item"]', 'Secundaria · Inicio');
        await m.toca('#sec-inicio [data-sec-card="' + id + '"] [data-action="abrir-item"]'); await m.listo('#exam-form', 'clase');
        if (!(await responder(p))) throw new Error('no se pudo contestar la clase');
        await m.toca('#exam-send'); await m.listo('.score', 'resultado');
        ctx.secHecha = id;
      } else {
        if (!ctx.secHecha) throw new Error('no hay clase de hoy pendiente ni enviada');
        await m.toca('#tiles a[data-espacio="secundaria"]'); await m.listo('#sec-inicio [data-sec-card="' + ctx.secHecha + '"] [data-action="ver-resultado"]', 'Secundaria · Inicio');
        await m.toca('#sec-inicio [data-sec-card="' + ctx.secHecha + '"] [data-action="ver-resultado"]'); await m.listo('.score', 'resultado');
      }
      await m.toca('.sec-siguiente'); await m.listo('#exam-form', 'siguiente misión');
      return { atras: '.score, #sec-inicio, #exam-form' };
    },
  },
  {
    id: 'sec-secciones', titulo: 'Secundaria → Mi horario / Mis materias / Misiones', email: 'valeria@example.com',
    async correr(p, m) {
      await m.ir('/secundaria.html'); await m.listo('#sec-inicio', 'Secundaria · Inicio');
      for (const [tab, nombre] of [['horario', 'Mi horario'], ['materias', 'Mis materias'], ['misiones', 'Misiones']]) {
        await m.toca('.sec-tabs [data-sec-tab="' + tab + '"]'); await m.listo('#sec-' + tab + ':not([hidden])', nombre);
      }
      return { atras: ['#sec-materias:not([hidden])', '#sec-horario:not([hidden])', '#sec-inicio:not([hidden])'] }; // pestaña por pestaña hasta Inicio
    },
  },
  {
    id: 'ingles-actividad', titulo: 'portal → Inglés → actividad pendiente → resultado', email: 'marisol@example.com',
    async antes(ctx) { // una actividad de opción múltiple o texto, disponible para Marisol
      const r = await api('/ingles/actividades', 'marisol@example.com');
      const items = (r.body.items || []).filter(i => ['disponible', 'en-curso'].includes(i.estado) && i.tipo !== 'meet');
      ctx.inglesItems = [];
      for (const it of items) {
        if (it.tipo === 'refuerzo') continue;
        const d = await api('/ingles/actividades/' + encodeURIComponent(it.id), 'marisol@example.com');
        const qs = d.body.preguntas || [];
        if (d.status === 200 && qs.length && qs.every(q => (q.tipo === 'opcion' && Array.isArray(q.opciones) && q.opciones.length) || q.tipo === 'escribir')) ctx.inglesItems.push(it.id);
        if (ctx.inglesItems.length >= 6) break;
      }
    },
    async correr(p, m, d, ctx) {
      const id = ctx.inglesItems.shift();
      if (!id) { const e = new Error('no quedan actividades de opción múltiple disponibles para Marisol en la copia (con --hoy 2026-10-27 alcanzan)'); e.omitir = true; throw e; }
      await m.ir('/'); await m.listo('#tiles a[data-espacio="ingles"]', 'portal');
      await m.toca('#tiles a[data-espacio="ingles"]'); await m.listo('#app [data-action="abrir-item"]', 'Inglés · Inicio');
      // La actividad puede estar en «Para hoy» (Inicio) o solo en «Semana»: si no se ve en Inicio, se va a Semana.
      const sel = '[data-action="abrir-item"][data-id="' + id + '"]';
      if (!(await p.locator(sel).filter({ visible: true }).count())) { await m.toca('#nav [data-nav="semana"]'); await m.listo(sel, 'Inglés · Semana'); }
      await m.toca(sel); await m.listo('#exam-form', 'actividad');
      if (!(await responder(p))) throw new Error('no se pudo contestar la actividad ' + id);
      await m.toca('#exam-send'); await m.listo('.score', 'resultado');
      return { atras: '#app' };
    },
  },
  {
    id: 'ingles-material', titulo: 'Inglés → Material de estudio → PDF', email: 'marisol@example.com',
    async correr(p, m) {
      await m.ir('/ingles.html'); await m.listo('#nav [data-nav="material"]', 'Inglés · Inicio');
      await m.toca('#nav [data-nav="material"]'); await m.listo('[data-seccion="material"]:not([hidden]) a[data-ver]', 'Material');
      const href = await p.locator('[data-seccion="material"]:not([hidden]) a[data-ver]').first().getAttribute('href');
      const [nueva] = await Promise.all([p.context().waitForEvent('page', { timeout: 15000 }).catch(() => null), m.toca('[data-seccion="material"]:not([hidden]) a[data-ver]')]);
      const r = await fetch(href).catch(() => null);
      m.pdf = { abre: !!nueva, status: r ? r.status : 0, tipo: r ? r.headers.get('content-type') : '' };
      if (nueva) await nueva.close();
      return { atras: '#app' };
    },
  },
  {
    id: 'juegos-invitado', titulo: 'portal sin sesión → Juegos → jugar uno → volver', email: null,
    async correr(p, m, d) {
      await m.ir('/'); await m.listo('#juegos-cta-btn', 'portal sin sesión');
      await m.toca('#juegos-cta-btn'); await m.listo('#f-entrada', 'entrada a Juegos');
      await p.fill('#ent-correo', 'invitado-nav-' + d.id + '@example.com'); await p.fill('#ent-nick', 'Nav ' + d.id.replace(/\W/g, ''));
      if (!(await p.isChecked('#ent-acepto'))) await m.toca('label:has(#ent-acepto)');
      await m.toca('#reg-entrar'); await m.listo(MENU, 'Juegos · categorías');
      await m.toca('[data-categoria="ingles"]'); await m.listo('.game[data-juego="en-vocab"]', 'categoría Inglés');
      await m.toca('.game[data-juego="en-vocab"]'); await m.listo('.opt', 'juego');
      m.anchoJuego = await p.evaluate(() => Math.round(document.querySelector('.wrap').getBoundingClientRect().width)); // dentro del juego no cambia
      const t0 = Date.now();
      while (!(await p.$('.result .score')) && Date.now() - t0 < 60000) { const o = await p.$('.opt:not(.ok):not(.bad)'); if (o) await o.click().catch(() => {}); await sleep(120); }
      m.t = Date.now(); await m.listo('.result .score', 'resultado del juego');
      await m.toca('.result [data-a="hub"]'); await m.listo(MENU, 'Juegos · menú');
      return { atras: null };
    },
  },
  {
    id: 'profe-grupos', titulo: 'profe: panel de Inglés → ver grupo → ocultar/mostrar → Entregas → evaluar', email: 'admin@example.com',
    async antes(ctx) { // entregas de la misión de Secundaria de valeria para evaluar (las que falten)
      ctx.entregas = 0;
      for (const paso of ['p1', 'p2', 'p3']) {
        const r = await api('/misiones/mis-e2e-valle-de-los-numeros/entrega', 'valeria@example.com', { paso, texto: 'Entrega de prueba de navegación (' + paso + ').' });
        if (r.status === 200) ctx.entregas++;
      }
    },
    // Si la tarea falla entre «Ocultar» y «Mostrar», el grupo vuelve a mostrarse (la copia queda como estaba).
    async despues(ctx) { if (ctx.conGrupos) await api('/ingles/grupos/ocultar', 'admin@example.com', { grupo: 'grupo-1', oculto: false }); },
    async correr(p, m, d, ctx) {
      await m.ir('/ingles.html'); await m.listo('#panel-profe', 'panel del profe');
      if (ctx.conGrupos) {
        await m.toca('.pp-grupo [data-action="ver-grupo"][data-id="grupo-1"]'); await m.listo('.pp-grupo.actual [data-action="ver-grupo"][data-id=""]', 'Grupo 1');
        await m.toca('.pp-grupo [data-action="ver-grupo"][data-id=""]'); await m.listo('.pp-grupo [data-action="ver-grupo"][data-id="grupo-1"]', 'todos los grupos');
        await m.toca('.pp-grupo[data-grupo-id="grupo-1"] [data-action="ocultar-grupo"][data-oculto="1"]');
        await m.listo('#mostrar-ocultos, [data-action="ocultar-grupo"][data-id="grupo-1"][data-oculto="0"]', 'grupo oculto', { state: 'attached' });
        // Mostrar de nuevo: desde la tarjeta (con el interruptor) o desde «👥 Grupos».
        if (!(await p.locator('[data-action="ocultar-grupo"][data-id="grupo-1"][data-oculto="0"]').filter({ visible: true }).count())) await m.toca('#mostrar-ocultos');
        await m.toca('[data-action="ocultar-grupo"][data-id="grupo-1"][data-oculto="0"]');
        await m.listo('.pp-grupo[data-grupo-id="grupo-1"] [data-action="ocultar-grupo"][data-oculto="1"]', 'grupo visible');
      }
      if (await p.locator('#nav [data-nav="entregas"]').filter({ visible: true }).count()) await m.toca('#nav [data-nav="entregas"]');
      else { await m.toca('#nav [data-nav-accion="mas"]'); await m.toca('#nav-mas [data-nav="entregas"]'); }
      await m.listo('#sec-entregas .ent-card, #sec-entregas .vacio', 'Entregas'); // sin entregas (otro «hoy»), la bandeja vacía
      const pendiente = p.locator('#sec-entregas .ent-card:has(form.ent-evaluar)').first();
      m.evaluo = false;
      if (ctx.entregas > 0 && await pendiente.count()) { // evalúa solo si quedan entregas sin evaluar en la copia
        const card = '[data-ent="' + await pendiente.getAttribute('data-ent') + '"]';
        for (const c of ['c1', 'c2', 'c3', 'c4']) await p.check(card + ' input[data-criterio="' + c + '"][value="25"]', { force: true });
        await m.toca(card + ' form.ent-evaluar button[type=submit]', { contar: false });
        await m.listo(card + ' .ent-top:has-text("Evaluada")', 'evaluada');
        ctx.entregas--; m.evaluo = true;
      }
      return { atras: '#app' };
    },
  },
  {
    id: 'profe-secundaria', titulo: 'profe: Secundaria → selector de alumna → Resultados', email: 'admin@example.com',
    async correr(p, m, d) {
      await m.ir('/'); await m.listo('#tiles a[data-espacio="secundaria"]', 'portal');
      await m.toca('#tiles a[data-espacio="secundaria"]'); await m.listo('#sec-alumna', 'Secundaria (admin)');
      await m.toca('#sec-alumna', { contar: true });
      if (d.toque) await p.keyboard.press('Escape').catch(() => {});
      await p.selectOption('#sec-alumna', { value: 'valeria' });
      await m.listo('#sec-inicio', 'tablero de la alumna');
      await m.toca('#sec-tab-resultados'); await m.listo('[data-sec-admin]', 'Resultados');
      return { atras: '#sec-inicio, #content' };
    },
  },
  {
    id: 'profe-ruta', titulo: 'profe: panel → Mi ruta → clase de IA', email: 'admin@example.com',
    async correr(p, m) {
      await m.ir('/ingles.html'); await m.listo('#panel-profe', 'panel del profe');
      if (await p.locator('#nav [data-nav="ruta"]').filter({ visible: true }).count()) await m.toca('#nav [data-nav="ruta"]');
      else { await m.toca('#nav [data-nav-accion="mas"]'); await m.toca('#nav-mas [data-nav="ruta"]'); }
      await m.listo('#pf-mision-btn', 'Mi ruta');
      await m.toca('#pf-mision-btn'); await m.listo('.sec-clase-vista .sec-pasos', 'clase de la ruta');
      return { atras: '.pf-hero' };
    },
  },
].filter(t => !SOLO || SOLO.includes(t.id));

// ---------------------------------------------------------------------------------------------------------------
(async () => {
  const sec = await api('/secundaria/actividades', 'valeria@example.com');
  const grupos = await api('/ingles/grupos', 'admin@example.com');
  const ctx = { hoy: sec.body.hoy, conGrupos: grupos.status === 200 && (grupos.body.grupos || []).some(g => g.id === 'grupo-1') };
  if (!ctx.conGrupos) omit('ocultar/mostrar «Grupo 1»', 'sin Postgres de prueba (corre con --pg)');
  const b = await chromium.launch({ executablePath: process.env.CHROME });
  const filas = [];
  for (const t of TAREAS) {
    const req = t.requiere ? t.requiere(ctx) : true;
    if (req !== true) { omit(t.id, req); continue; }
    if (t.antes) await t.antes(ctx);
    for (const d of DISPOSITIVOS) {
      const p = await abrirPagina(b, { email: t.email, dialogos: 'aceptar', tiempo: 0.4, viewport: { width: d.w, height: d.h }, contexto: d.toque ? { hasTouch: true, isMobile: d.w < 600 } : {} });
      const m = medidor(p, d, t.id);
      const t0 = Date.now();
      let error = null, res = {};
      let omitir = false;
      try { res = await t.correr(p, m, d, ctx) || {}; } catch (e) { error = e.message.split('\n')[0].slice(0, 200); omitir = !!e.omitir; } finally { if (t.despues) await t.despues(ctx).catch(() => {}); }
      if (omitir) { omit(`${t.id} (${d.id})`, error); await p.context().close(); continue; }
      const total = Date.now() - t0;
      const volver = error ? {} : await formasDeVolver(p);
      await p.screenshot({ path: `nav-${t.id}-${d.id}.png` }).catch(() => {});
      const errores = m.errores.slice(), peticiones = m.peticiones; // antes de «atrás» (lo que pase después no es de la tarea)
      const atras = error ? { ok: false, a: '—' } : await probarAtras(p, res.atras);
      const fila = { tarea: t.id, disp: d.id, toques: m.toques, maxMs: Math.max(0, ...m.pantallas.map(x => x.ms)), total, peticiones, errores,scrollH: m.scrollH, chicos: [...m.chicos], tapados: m.tapados, volver, atras, error, pantallas: m.pantallas, pdf: m.pdf, evaluo: m.evaluo };
      filas.push(fila);
      const nombre = `${t.id} (${d.id})`;
      if (error) { ok(nombre + ': la tarea termina', false, error); await p.context().close(); continue; }
      ok(nombre + ': sin errores de consola ni JS', !fila.errores.length, fila.errores.slice(0, 3).join(' | '));
      ok(nombre + ': sin scroll horizontal', !fila.scrollH.length, fila.scrollH.join(', '));
      ok(nombre + ': nada tapado ni fuera de pantalla al tocar', !fila.tapados.length, fila.tapados.join(' | '));
      if (d.toque) ok(nombre + ': objetivos táctiles ≥ 44 px', MEDIR || !fila.chicos.length, fila.chicos.length + ' chicos: ' + fila.chicos.slice(0, 6).join(' | '));
      if (!MEDIR) ok(nombre + `: ${fila.toques} toques ≤ ${TOPE_TOQUES[t.id]}`, fila.toques <= TOPE_TOQUES[t.id]);
      if (!MEDIR) ok(nombre + `: cada pantalla usable en < ${TOPE_MS} ms`, fila.maxMs < TOPE_MS, fila.pantallas.map(x => x.nombre + ' ' + x.ms).join(', '));
      ok(nombre + ': hay forma de volver (Inicio, barra o «← Volver»)', fila.volver.inicio || fila.volver.barra || fila.volver.volver, JSON.stringify(fila.volver));
      ok(nombre + ': atrás del navegador se queda en la plataforma', fila.atras.ok, fila.atras.a);
      // El portal lleva directo a ingles.html?modo=secundaria, sin la carga extra del puente secundaria.html.
      if (['sec-clase', 'profe-secundaria'].includes(t.id)) ok(nombre + ': el portal abre Secundaria sin pasar por secundaria.html', m.puentes === 0, String(m.puentes));
      if (m.anchoJuego) ok(nombre + ': dentro del juego la columna sigue en 720 px o menos', m.anchoJuego <= 720, String(m.anchoJuego));
      if (fila.pdf) ok(nombre + ': el PDF abre en otra pestaña y responde 200', fila.pdf.abre && fila.pdf.status === 200 && /pdf/.test(fila.pdf.tipo), JSON.stringify(fila.pdf));
      await p.context().close();
    }
  }

  // ---------- Diseño en tablet y PC: el contenido aprovecha el ancho ----------
  const anchos = [];
  const PAGINAS = [
    { id: 'Inglés (alumna)', email: 'marisol@example.com', ruta: '/ingles.html', listo: '#rpg-stats' },
    { id: 'Secundaria (alumna)', email: 'valeria@example.com', ruta: '/secundaria.html', listo: '#sec-inicio' },
    { id: 'Juegos', email: 'marisol@example.com', ruta: '/juegos.html', listo: MENU },
    { id: 'Panel del profe', email: 'admin@example.com', ruta: '/ingles.html', listo: '#panel-profe' },
    { id: 'Mi ruta', email: 'admin@example.com', ruta: '/ingles.html?modo=profe', listo: '.pf-hero' },
  ];
  if (!SOLO || SOLO.includes('anchos')) for (const pg of PAGINAS) for (const d of DISPOSITIVOS.filter(x => x.w >= 1024)) {
    const p = await abrirPagina(b, { email: pg.email, viewport: { width: d.w, height: d.h }, ruta: pg.ruta, esperar: pg.listo });
    await sleep(600);
    const a = await anchoUtil(p);
    anchos.push({ pagina: pg.id, disp: d.id, ...a, pct: Math.round(a.ancho * 100 / a.vista) });
    await p.screenshot({ path: `nav-ancho-${pg.id.replace(/\W+/g, '-').toLowerCase()}-${d.id}.png` });
    await p.context().close();
  }
  // En PC el contenido usa al menos 960 px (o el 70 % de la ventana si es menor): nada de una columna de celular estirada.
  for (const a of anchos) if (!MEDIR) ok(`ancho ${a.pagina} (${a.disp}): ${a.ancho} px de ${a.vista}`, a.ancho >= Math.min(960, a.vista * 0.7));

  // ---------- Teclado en PC: Tab, Enter y foco visible ----------
  if (!SOLO || SOLO.includes('teclado')) {
    const p = await abrirPagina(b, { email: 'valeria@example.com', viewport: { width: 1280, height: 800 }, ruta: '/', esperar: '#tiles a[data-espacio="secundaria"]' });
    const sinFoco = [];
    let llego = false;
    for (let i = 0; i < 25 && !llego; i++) {
      await p.keyboard.press('Tab');
      const f = await p.evaluate(() => {
        const e = document.activeElement; if (!e || e === document.body) return null;
        const s = getComputedStyle(e);
        const visible = (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0) || (s.boxShadow && s.boxShadow !== 'none');
        return { t: (e.id ? '#' + e.id : e.tagName.toLowerCase()) + ' «' + e.textContent.trim().slice(0, 20) + '»', visible, sec: e.matches('a[data-espacio="secundaria"]') };
      });
      if (f && !f.visible) sinFoco.push(f.t);
      if (f && f.sec) llego = true;
    }
    ok('teclado (portal): Tab llega a la tarjeta de Secundaria', llego);
    ok('teclado (portal): foco visible en cada parada', !sinFoco.length, sinFoco.join(' | '));
    if (llego) { await p.keyboard.press('Enter'); ok('teclado (portal): Enter abre Secundaria', await p.waitForSelector('#sec-inicio', { timeout: 30000 }).then(() => true, () => false)); }
    // Pestañas de Secundaria con flechas (role=tablist) y Enter
    const tabs = await p.$('.sec-tabs [aria-selected="true"]');
    if (tabs) {
      const largo = await p.evaluate(() => history.length);
      await tabs.focus(); await p.keyboard.press('ArrowRight');
      const sig = await p.evaluate(() => document.activeElement && document.activeElement.dataset.secTab);
      ok('teclado (Secundaria): la flecha → mueve a la siguiente pestaña', !!sig && sig !== 'inicio', String(sig));
      ok('teclado (Secundaria): las flechas no agregan entradas al historial', await p.evaluate(() => history.length) === largo);
    }
    await p.context().close();
    // Inglés: Tab por la navegación con foco visible
    const q = await abrirPagina(b, { email: 'marisol@example.com', viewport: { width: 1280, height: 800 }, ruta: '/ingles.html', esperar: '#nav [data-nav="material"]' });
    const sinFocoIng = [];
    for (let i = 0; i < 12; i++) {
      await q.keyboard.press('Tab');
      const f = await q.evaluate(() => { const e = document.activeElement; if (!e || e === document.body) return null; const s = getComputedStyle(e); return { t: (e.id ? '#' + e.id : e.tagName.toLowerCase()) + ' «' + e.textContent.trim().slice(0, 20) + '»', visible: (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0) || (s.boxShadow && s.boxShadow !== 'none') }; });
      if (f && !f.visible) sinFocoIng.push(f.t);
    }
    ok('teclado (Inglés): foco visible en las primeras 12 paradas', !sinFocoIng.length, sinFocoIng.join(' | '));
    await q.context().close();
  }

  // ---------- Enlaces profundos ----------
  if (!SOLO || SOLO.includes('enlaces')) {
    const ENLACES = [
      { n: '?modo=secundaria (alumna)', email: 'valeria@example.com', ruta: '/ingles.html?modo=secundaria', sel: '#sec-inicio' },
      { n: 'secundaria.html#horario (alumna)', email: 'valeria@example.com', ruta: '/secundaria.html#horario', sel: '#sec-horario:not([hidden])' },
      { n: 'secundaria.html#misiones (alumna)', email: 'valeria@example.com', ruta: '/secundaria.html#misiones', sel: '#sec-misiones:not([hidden])' },
      { n: '?modo=profe (admin)', email: 'admin@example.com', ruta: '/ingles.html?modo=profe', sel: '.pf-hero' },
      { n: 'ingles.html#material (alumna)', email: 'marisol@example.com', ruta: '/ingles.html#material', sel: '[data-seccion="material"]:not([hidden])' },
      { n: 'juegos.html?registro=1 (sin sesión)', email: null, ruta: '/juegos.html?registro=1', sel: '#f-entrada' },
      { n: '?modo=secundaria (sin sesión) pide entrar', email: null, ruta: '/ingles.html?modo=secundaria', sel: '[data-stald-auth]' },
      { n: 'index.html?juegos=1 (sin sesión)', email: null, ruta: '/index.html?juegos=1', sel: '#f-entrada' },
    ];
    for (const e of ENLACES) {
      const p = await abrirPagina(b, { email: e.email, viewport: { width: 360, height: 740 }, contexto: { hasTouch: true, isMobile: true }, ruta: e.ruta });
      ok('enlace profundo ' + e.n, await p.waitForSelector(e.sel, { timeout: 30000 }).then(() => true, () => false));
      await p.context().close();
    }
  }
  await b.close();

  // ---------- Tabla ----------
  const marca = f => f.error ? '❌' : (f.errores.length || f.scrollH.length || f.tapados.length || !f.atras.ok || f.chicos.length || f.toques > TOPE_TOQUES[f.tarea]) ? '⚠️' : '✅';
  const lineas = ['| Tarea | Dispositivo | Toques | Pantalla más lenta (ms) | Total (ms) | Peticiones | Errores | Scroll H | < 44 px | Tapados | Volver (Inicio/barra/←) | Atrás | Estado |', '|---|---|---:|---:|---:|---:|---:|---|---:|---:|---|---|---|'];
  for (const f of filas) lineas.push(`| ${f.tarea} | ${f.disp} | ${f.toques} | ${f.maxMs} | ${f.total} | ${f.peticiones} | ${f.errores.length} | ${f.scrollH.length ? 'sí' : 'no'} | ${f.chicos.length} | ${f.tapados.length} | ${f.volver.inicio ? 'I' : '-'}/${f.volver.barra ? 'B' : '-'}/${f.volver.volver ? '←' : '-'} | ${f.atras.ok ? '✅' : '❌'} ${f.atras.a} | ${marca(f)}${f.error ? ' ' + f.error : ''} |`);
  lineas.push('', '| Página | Dispositivo | Ancho útil | Ventana | % |', '|---|---|---:|---:|---:|');
  for (const a of anchos) lineas.push(`| ${a.pagina} | ${a.disp} | ${a.ancho} | ${a.vista} | ${a.pct} |`);
  lineas.push('', '### Objetivos < 44 px por tarea (con toque)');
  for (const f of filas) if (f.chicos.length) lineas.push(`- ${f.tarea} (${f.disp}): ${f.chicos.join(' · ')}`);
  lineas.push('', '### Detalle de pantallas');
  for (const f of filas) lineas.push(`- ${f.tarea} (${f.disp}): ${f.pantallas.map(x => x.nombre + ' ' + x.ms + ' ms').join(' → ')}${f.errores.length ? ' · errores: ' + f.errores.join(' | ') : ''}${f.tapados.length ? ' · tapados: ' + f.tapados.join(' | ') : ''}`);
  fs.writeFileSync('navegacion-dispositivos.md', lineas.join('\n') + '\n');
  console.log(lineas.join('\n'));
  console.log(out.join('\n'));
  process.exit(out.some(l => l.startsWith('FAIL')) ? 1 : 0);
})().catch(e => { console.log(out.join('\n')); console.log('FAIL error: ' + e.message.slice(0, 400)); process.exit(1); });
