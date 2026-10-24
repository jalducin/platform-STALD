// E2E: autoguardado en TODOS los flujos de respuesta (openspec: autoguardado-todo). Regla del profe (2026-10-24): si
// avanzó y no envió, se guarda; se revisa hasta que se envía. Por cada flujo: contestar parcial → borrador en el
// servidor (a los pocos segundos y al cambiar de paso) → recargar (se reabre solo, mismo paso) → otro navegador de la
// misma cuenta → no calificado ni entrega para el profe → enviar → calificado, borrador borrado y siguiente intento
// limpio. Flujos: clase de Secundaria (con dos navegadores a la vez), actividad, examen, refuerzo y reto del Meet de
// Inglés, ruta del profe, y misiones de texto de Inglés (My Hero Card) y de Secundaria (sin red + «Reintentar»).
// El examen de Secundaria lo cubre `autoguardado`. Restaura lo que envía: reinicia resultados y borra entregas.
require('./lib/entorno');
const { chromium } = require('playwright');
const { abrirPagina } = require('./lib/navegador');
const API = process.env.API;
const out = []; const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`);
const ADMIN = 'admin@example.com';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const pedir = async (ruta, email, metodo = 'GET', body) => {
  const r = await fetch(API + ruta + (ruta.includes('?') ? '&' : '?') + 'email=' + encodeURIComponent(email),
    { method: metodo, ...(body !== undefined ? { headers: { 'content-type': 'text/plain;charset=UTF-8' }, body: JSON.stringify(body) } : {}) });
  return { status: r.status, body: await r.json().catch(() => ({})) };
};
// Espera hasta `ms` a que `fn` devuelva algo verdadero (sondeo de la API).
async function hasta(fn, ms = 9000) {
  const t0 = Date.now();
  let v;
  while (Date.now() - t0 < ms) { v = await fn().catch(() => null); if (v) return v; await sleep(400); }
  return v;
}
const listo = p => p.waitForFunction(() => typeof state !== 'undefined' && state.act && Array.isArray(state.act.items), null, { timeout: 60000 });
const texto = async (p, sel) => ((await p.textContent(sel).catch(() => '')) || '').replace(/\s+/g, ' ').trim();

// Contesta la pregunta i (por contestar) según su tipo, como lo haría la alumna.
const contestar = (p, i, valor = 'guardado') => p.evaluate(([i, valor]) => {
  const q = preguntasPorContestar()[i];
  const f = document.getElementById('exam-form');
  if (!q) return false;
  const radio = q.querySelector('input[type=radio]:not(:disabled)');
  const txt = q.querySelector('input.q-text[type=text]');
  if (radio) radio.click();
  else if (txt) { txt.value = valor; txt.dispatchEvent(new Event('input', { bubbles: true })); }
  else if (q.querySelector('[data-ord]')) q.querySelectorAll('.ord-banco .ficha').forEach(b => b.click());
  else if (q.querySelector('[data-emp]')) {
    const izq = [...q.querySelectorAll('.emp-btn[data-lado="izq"]')], der = [...q.querySelectorAll('.emp-btn[data-lado="der"]')];
    izq.forEach((b, k) => { b.click(); der[k].click(); });
  } else { const h = q.querySelector('input.q-text'); h.value = 'auto:ok'; updateExamProgress(f); }
  return true;
}, [i, valor]);
const nPreguntas = p => p.evaluate(() => preguntasPorContestar().length);
const respondidas = async p => Number((await texto(p, '#exam-count')).split('/')[0]);
const abrirItem = async (p, id) => { await p.evaluate(id => openItem(id), id); await p.waitForSelector('#exam-form', { timeout: 60000 }); };
const itemDe = async (ruta, email, id) => ((await pedir(ruta, email)).body.items || []).find(x => x.id === id);

// ---------- Flujo de actividad / examen / refuerzo / reto (reproductor) ----------
async function ciclo(b, c) {
  const n = c.nombre;
  const antes = await itemDe(c.ruta, c.email, c.id);
  if (!antes || antes.intentosUsados) return ok(`${n}: elemento disponible y sin intentos`, false, JSON.stringify(antes || null));
  const resAdmin = async () => c.admin ? (((await pedir(c.ruta, ADMIN)).body.items || []).find(x => x.id === c.id)?.resultados || []).length : 0;
  const resAntes = await resAdmin();
  const p = await abrirPagina(b, { email: c.email, viejo: true, ingles: true, out, ruta: c.pagina, dialogos: 'aceptar', etiqueta: n });
  await listo(p);
  await abrirItem(p, c.id);
  const total = await nPreguntas(p);
  const enPasos = await p.$eval('#exam-form', f => f.classList.contains('paso'));
  // 1) Contestar la 1.ª y cambiar de paso: se guarda ya, con el paso.
  await contestar(p, 0);
  if (enPasos) await p.click('[data-action="q-sig"]'); else await p.focus(`#exam-form .q:not(.fija) >> nth=1`).catch(() => {});
  const b1 = await hasta(async () => { const x = (await pedir(`${c.ruta}/${c.id}`, c.email)).body.borrador; return x && Object.keys(x.respuestas).length === 1 && x; }, 9000);
  ok(`${n}: al contestar y cambiar de paso, el avance llega al servidor`, !!b1, JSON.stringify(b1));
  if (enPasos) ok(`${n}: el borrador guarda el paso visible`, b1 && b1.paso === 1, JSON.stringify(b1));
  // 2) La 2.ª: se guarda a los pocos segundos (sin enviar).
  await contestar(p, 1);
  const b2 = await hasta(async () => { const x = (await pedir(`${c.ruta}/${c.id}`, c.email)).body.borrador; return x && Object.keys(x.respuestas).length === 2 && x; }, 9000);
  ok(`${n}: a los pocos segundos el servidor tiene 2 respuestas`, !!b2, JSON.stringify(b2));
  await p.waitForFunction(() => /💾 Guardado hace \d+ s/.test(document.getElementById('autoguardado').textContent), null, { timeout: 10000 })
    .then(() => ok(`${n}: indicador «💾 Guardado hace N s»`, true), async () => ok(`${n}: indicador «💾 Guardado hace N s»`, false, await texto(p, '#autoguardado')));
  // 3) Sin enviar no se califica ni cuenta como intento, y el profe no ve resultado.
  const sin = await itemDe(c.ruta, c.email, c.id);
  ok(`${n}: sin enviar no cuenta como intento ni se califica`, sin && sin.intentosUsados === 0 && !sin.mejor && sin.estado !== 'completo', JSON.stringify(sin && { u: sin.intentosUsados, e: sin.estado }));
  if (c.admin) ok(`${n}: el profe no lo ve como entrega`, (await resAdmin()) === resAntes);
  // 4) Recargar dentro de la actividad: se reabre sola, con sus 2 respuestas y en el mismo paso.
  await p.reload();
  await p.waitForSelector('#exam-form', { timeout: 60000 }).catch(() => {});
  ok(`${n}: al recargar se reabre sola`, !!(await p.$('#exam-form')));
  if (await p.$('#exam-form')) {
    ok(`${n}: tras recargar, 2 respuestas recuperadas`, (await respondidas(p)) === 2, await texto(p, '#exam-count'));
    if (enPasos) ok(`${n}: tras recargar, el mismo paso`, await p.evaluate(() => state.paso) === 1);
  }
  // 5) Otro navegador (otro aparato, sin datos locales) con la misma cuenta.
  const otro = await abrirPagina(b, { email: c.email, viejo: true, ingles: true, out, ruta: c.pagina, dialogos: 'aceptar', etiqueta: n + ' (otro navegador)' });
  await listo(otro);
  await abrirItem(otro, c.id);
  ok(`${n}: otro navegador recupera las 2 respuestas`, (await respondidas(otro)) === 2, await texto(otro, '#exam-count'));
  if (c.dosNavegadores && total > 2) {
    // El otro navegador avanza una más; el primero, al recargar, la ve.
    await contestar(otro, 2);
    const b3 = await hasta(async () => { const x = (await pedir(`${c.ruta}/${c.id}`, c.email)).body.borrador; return x && Object.keys(x.respuestas).length === 3 && x; }, 9000);
    ok(`${n}: dos navegadores: lo del segundo llega a la cuenta`, !!b3);
    await p.reload();
    await p.waitForSelector('#exam-form', { timeout: 60000 }).catch(() => {});
    ok(`${n}: dos navegadores: el primero recupera las 3`, (await respondidas(p).catch(() => 0)) === 3);
  }
  // 6) Enviar desde el primero: se califica, el borrador se borra.
  for (let i = 0; i < total; i++) await contestar(p, i);
  await p.evaluate(() => { const f = document.getElementById('exam-form'); f.classList.remove('paso'); updateExamProgress(f); });
  await p.click('#exam-send');
  await p.waitForSelector('.score', { timeout: 60000 }).then(() => ok(`${n}: al enviar se califica`, true), () => ok(`${n}: al enviar se califica`, false));
  const despues = await itemDe(c.ruta, c.email, c.id);
  ok(`${n}: cuenta como intento al enviar`, despues && despues.intentosUsados === 1 && !!despues.mejor, JSON.stringify(despues && despues.intentosUsados));
  const g = await pedir(`${c.ruta}/${c.id}`, c.email);
  ok(`${n}: tras enviar, sin borrador en el servidor`, g.status === 409 || !g.body.borrador, JSON.stringify(g.body.borrador || g.status));
  if (c.dosNavegadores) {
    // El segundo navegador sigue con el intento viejo: al guardar, el servidor responde 409 y se avisa.
    await otro.evaluate(() => { const f = document.getElementById('exam-form'); f.querySelectorAll('input[type=radio]:not(:disabled)')[1]?.click(); });
    await otro.waitForFunction(() => /ya se envió desde otro aparato/.test(document.getElementById('autoguardado').textContent), null, { timeout: 12000 })
      .then(() => ok(`${n}: dos navegadores: el segundo avisa que ya se envió`, true), async () => ok(`${n}: dos navegadores: el segundo avisa que ya se envió`, false, await texto(otro, '#autoguardado')));
    const sigue = await pedir(`${c.ruta}/${c.id}`, c.email);
    ok(`${n}: dos navegadores: el envío viejo no crea borrador del intento nuevo`, sigue.status === 409 || !sigue.body.borrador);
  }
  // 7) El siguiente intento empieza limpio.
  if (g.status === 200) {
    await p.click('[data-action="volver"]').catch(() => {});
    await abrirItem(p, c.id);
    ok(`${n}: el siguiente intento empieza limpio`, (await respondidas(p)) === 0 && !(await p.$('#autoguardado-aviso:not(:empty)')));
  }
  await otro.context().close();
  await p.context().close();
  if (c.reiniciar) await pedir(`${c.reiniciar}/${c.id}/resultados/${encodeURIComponent(c.alumno)}`, ADMIN, 'DELETE');
}

// ---------- Misión de texto ----------
async function cicloMision(b, c) {
  const n = c.nombre;
  const mis = async () => ((await pedir('/misiones', c.email)).body.misiones || []).find(m => m.id === c.id);
  const m0 = await mis();
  if (!m0) return ok(`${n}: misión visible`, false);
  const abrir = async p => { await p.waitForSelector(`[data-mis-abrir="${c.id}"]`, { timeout: 60000 }); await p.click(`[data-mis-abrir="${c.id}"]`); await p.waitForSelector(`[data-mis-detalle="${c.id}"] [data-mis-paso="p1"] textarea`, { timeout: 30000 }); };
  const area = `[data-mis-detalle="${c.id}"] [data-mis-paso="p1"] textarea`;
  const pie = `[data-mis-detalle="${c.id}"] [data-mis-paso="p1"] .mis-guardado`;
  const p = await abrirPagina(b, { email: c.email, viejo: true, ingles: true, out, ruta: c.pagina, dialogos: 'aceptar', etiqueta: n });
  await abrir(p);
  // Coexistencia: un borrador de actividad de la misma persona no se pisa con el de la misión.
  if (c.actividad) await pedir(`${c.actividad.ruta}/${c.actividad.id}/borrador`, c.email, 'PUT', { intento: 1, respuestas: c.actividad.respuestas });
  await p.fill(area, 'Mi héroe inventado: Capitana Nube');
  ok(`${n}: indicador «Guardando…» mientras escribe`, /Guardando…|💾/.test(await texto(p, pie)), await texto(p, pie));
  const b1 = await hasta(async () => { const m = await mis(); return m && m.borrador && m.borrador.pasos.p1 && m.borrador.pasos.p1.texto === 'Mi héroe inventado: Capitana Nube' && m; });
  ok(`${n}: el texto llega al servidor a los pocos segundos (borrador por paso)`, !!b1);
  await p.waitForFunction(s => /💾 Guardado hace \d+ s/.test(document.querySelector(s).textContent), pie, { timeout: 10000 })
    .then(() => ok(`${n}: indicador «💾 Guardado hace N s»`, true), async () => ok(`${n}: indicador «💾 Guardado hace N s»`, false, await texto(p, pie)));
  ok(`${n}: el borrador no es entrega`, b1 && !b1.entrega);
  const bandeja = (await pedir('/profe/entregas', ADMIN)).body.entregas || [];
  ok(`${n}: el profe no lo ve en «📥 Entregas»`, !bandeja.some(x => x.mision.id === c.id));
  if (c.actividad) {
    const a = (await pedir(`${c.actividad.ruta}/${c.actividad.id}`, c.email)).body.borrador;
    ok(`${n}: el borrador de la actividad sigue intacto (no se pisan)`, !!a && JSON.stringify(a.respuestas) === JSON.stringify(c.actividad.respuestas), JSON.stringify(a));
    await pedir(`${c.actividad.ruta}/${c.actividad.id}/borrador`, c.email, 'PUT', { intento: 1, respuestas: {} });
  }
  // Recargar y otro navegador.
  await p.reload();
  await abrir(p);
  ok(`${n}: tras recargar, el texto sigue en su paso`, (await p.inputValue(area)) === 'Mi héroe inventado: Capitana Nube');
  const otro = await abrirPagina(b, { email: c.email, viejo: true, ingles: true, out, ruta: c.pagina, dialogos: 'aceptar', etiqueta: n + ' (otro navegador)' });
  await abrir(otro);
  ok(`${n}: otro navegador recupera el texto desde la cuenta`, (await otro.inputValue(area)) === 'Mi héroe inventado: Capitana Nube');
  await otro.context().close();
  // Sin red: aviso y «Reintentar».
  await p.context().setOffline(true);
  await p.fill(area, 'Mi héroe inventado: Capitana Nube vuela');
  await p.waitForFunction(s => /No se pudo guardar/.test(document.querySelector(s).textContent), pie, { timeout: 12000 })
    .then(() => ok(`${n}: sin red, aviso «No se pudo guardar» con «Reintentar»`, true), async () => ok(`${n}: sin red, aviso «No se pudo guardar» con «Reintentar»`, false, await texto(p, pie)));
  await p.context().setOffline(false);
  await p.click(`${pie} [data-mis-reintentar]`).catch(() => {});
  const b2 = await hasta(async () => { const m = await mis(); return m && m.borrador && m.borrador.pasos.p1.texto.endsWith('vuela') && m; });
  ok(`${n}: «Reintentar» sube el texto pendiente`, !!b2);
  ok(`${n}: más de 4 000 caracteres → 400`, (await pedir(`/misiones/${c.id}/borrador`, c.email, 'PUT', { paso: 'p1', texto: 'x'.repeat(4001) })).status === 400);
  ok(`${n}: el admin no escribe borradores (403)`, (await pedir(`/misiones/${c.id}/borrador`, ADMIN, 'PUT', { paso: 'p1', texto: 'x' })).status === 403);
  // Entregar: se vuelve entrega y el borrador del paso desaparece.
  await p.click(`[data-mis-detalle="${c.id}"] [data-mis-paso="p1"] button[type=submit]`);
  await p.waitForSelector('.mis-res.ok', { timeout: 30000 }).catch(() => {});
  const m3 = await mis();
  ok(`${n}: al entregar, el paso queda entregado`, !!(m3 && m3.entrega && m3.entrega.pasos.p1), JSON.stringify(m3 && m3.entrega));
  ok(`${n}: al entregar, el borrador del paso se borra`, !(m3 && m3.borrador && m3.borrador.pasos.p1));
  ok(`${n}: el profe ya lo ve en «📥 Entregas»`, ((await pedir('/profe/entregas', ADMIN)).body.entregas || []).some(x => x.mision.id === c.id));
  ok(`${n}: sin borrador local del paso`, await p.evaluate(() => !Object.keys(localStorage).some(k => k.startsWith('stald_mis_borrador:') && k.endsWith(':p1'))));
  await p.context().close();
  await pedir(`/profe/entregas/persona/${c.slug}/borrar`, ADMIN, 'POST', {}); // restaurar: sin texto de prueba
}

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME });
  const hoy = (await pedir('/ingles/actividades', 'angel@example.com')).body.hoy;
  // Alumna de Secundaria: clase por pasos (con dos navegadores) y misión de texto.
  await ciclo(b, { nombre: 'Secundaria · clase', email: 'valeria@example.com', ruta: '/secundaria/actividades', pagina: '/ingles.html?modo=secundaria', id: 'sec-e2e-todo-clase', admin: true, dosNavegadores: true, reiniciar: '/secundaria/actividades', alumno: 'valeria' });
  await cicloMision(b, { nombre: 'Secundaria · misión', email: 'valeria@example.com', slug: 'valeria', pagina: '/secundaria.html#misiones', id: 'mis-e2e-zz-borrador-sec', actividad: { ruta: '/secundaria/actividades', id: 'sec-e2e-todo-clase', respuestas: { 'todo-1': 0 } } });
  // Alumno de Inglés: actividad, examen, refuerzo y reto del Meet; My Hero Card de Laura.
  const items = (await pedir('/ingles/actividades', 'angel@example.com')).body.items || [];
  const primero = tipo => items.find(x => x.tipo === tipo && x.intentosMax > 0 && !x.intentosUsados && (x.estado === 'disponible' || x.estado === 'en-curso') && x.id !== 'meet-e2e-reto-borrador');
  for (const [tipo, nombre] of [['actividad', 'Inglés · actividad'], ['examen', 'Inglés · examen'], ['refuerzo', 'Inglés · refuerzo']]) {
    const it = primero(tipo);
    if (!it) { ok(`${nombre}: hay uno disponible el ${hoy}`, false); continue; }
    await ciclo(b, { nombre, email: 'angel@example.com', ruta: '/ingles/actividades', pagina: '/ingles.html', id: it.id, admin: true, reiniciar: '/ingles/actividades', alumno: 'Angel' });
  }
  await ciclo(b, { nombre: 'Inglés · reto del Meet', email: 'angel@example.com', ruta: '/ingles/actividades', pagina: '/ingles.html', id: 'meet-e2e-reto-borrador', admin: true, reiniciar: '/ingles/actividades', alumno: 'Angel' });
  await cicloMision(b, { nombre: 'Inglés · My Hero Card', email: 'laura@example.com', slug: 'laura', pagina: '/ingles.html', id: 'mis-ingles-e2e-zz-borrador' });
  // Profe en su ruta (clase como misión).
  const deProfe = ((await pedir('/ingles/profe/actividades', ADMIN)).body.items || []).find(x => !x.grupo && x.intentosMax > 0 && !x.intentosUsados && x.estado === 'disponible');
  if (deProfe) await ciclo(b, { nombre: 'Profe · ruta', email: ADMIN, ruta: '/ingles/profe/actividades', pagina: '/ingles.html?modo=profe', id: deProfe.id });
  else ok('Profe · ruta: hay una clase propia disponible', false);
  await b.close();
  console.log(out.join('\n'));
  process.exit(out.some(x => x.startsWith('FAIL')) ? 1 : 0);
})().catch(e => { console.log(out.join('\n')); console.error('ERROR', e.message.slice(0, 400)); process.exit(2); });
