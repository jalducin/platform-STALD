// E2E: tablero RPG de Inglés, ranking de mi grupo detrás del interruptor y moderación de nicks (openspec:
// rpg-fase2-ingles). A 360 px, en claro y en oscuro. Cuentas de prueba @example.com. Al final deja el interruptor
// apagado, los nicks como estaban y a todas las personas ocultas (la fase «ingles» comparte datos).
require('./lib/entorno');
const { chromium } = require('playwright');
const API = process.env.API;
const { abrirPagina } = require('./lib/navegador');
const out = []; const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`);
const ADMIN = 'admin@example.com', MARISOL = 'marisol@example.com', ANGEL = 'angel@example.com';
const VISTA = { width: 360, height: 780 };
const pedir = async (ruta, email, body, metodo) => {
  const r = await fetch(API + ruta + (ruta.includes('?') ? '&' : '?') + 'email=' + encodeURIComponent(email),
    body ? { method: metodo || 'POST', headers: { 'content-type': 'text/plain;charset=UTF-8' }, body: JSON.stringify(body) } : {});
  return { status: r.status, body: await r.json().catch(() => ({})) };
};
const sinScrollH = p => p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
const nickDe = j => (j && j.nombreReal ? j.nombre : '');
let nicksAntes = null;
async function restaurar() {
  for (const c of [MARISOL, ANGEL]) await pedir('/gamificacion/perfil', c, { aparecer: false }, 'PUT').catch(() => {});
  await pedir('/profe/ranking', ADMIN, { ranking: false }).catch(() => {});
  if (nicksAntes) for (const [c, n] of Object.entries(nicksAntes)) await pedir('/juegos/nick', c, { nick: n }).catch(() => {});
}

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME });
  nicksAntes = { [MARISOL]: nickDe((await pedir('/juegos/yo', MARISOL)).body.jugador), [ANGEL]: nickDe((await pedir('/juegos/yo', ANGEL)).body.jugador) };
  await pedir('/profe/ranking', ADMIN, { ranking: false });

  // 1) Interruptor apagado: tablero RPG sí; del ranking, nada (ni el botón para aparecer).
  for (const tema of ['light', 'dark']) {
    const p = await abrirPagina(b, { email: MARISOL, viejo: true, ingles: true, out, viewport: VISTA, contexto: { colorScheme: tema }, ruta: '/ingles.html', esperar: '#rpg-stats' });
    const v = await p.evaluate(() => ({ rango: (document.getElementById('rpg-rango') || {}).textContent || '', xp: (document.getElementById('rpg-xp') || {}).textContent || '',
      racha: !!document.getElementById('rpg-racha'), mundo: (document.getElementById('rpg-mundo') || {}).textContent || '', rk: !!document.getElementById('rpg-ranking'),
      texto: document.getElementById('content').textContent, secciones: [...document.querySelectorAll('[data-seccion]')].map(s => s.dataset.seccion) }));
    const s = ' (' + tema + ')';
    ok('tablero RPG: nivel y rango' + s, /^Nv\. \d+ · /.test(v.rango), v.rango);
    ok('tablero RPG: XP del nivel, racha y mundo' + s, /^\d+ \/ 300$/.test(v.xp) && v.racha && v.mundo.includes('Isla del Alfabeto'), v.xp + ' | ' + v.mundo);
    ok('apagado: sin tarjeta de ranking ni botón para aparecer' + s, !v.rk && !v.texto.includes('Aparecer en el ranking') && !v.texto.includes('Ranking de mi grupo'));
    ok('siguen Semana, Material y Para hoy' + s, ['inicio', 'semana', 'material', 'resultados', 'perfil'].every(x => v.secciones.includes(x)) && v.texto.includes('Para hoy'), v.secciones.join(','));
    ok('Inicio sin scroll horizontal a 360 px' + s, await sinScrollH(p));
    await p.screenshot({ path: 'rpg-ingles-apagado-' + tema + '.png', fullPage: true });
    await p.context().close();
  }
  const apagado = await pedir('/gamificacion/ranking', ANGEL);
  ok('apagado: /gamificacion/ranking → 404 sin_ranking', apagado.status === 404 && apagado.body.error === 'sin_ranking', JSON.stringify(apagado));
  ok('apagado: PUT perfil → 404', (await pedir('/gamificacion/perfil', MARISOL, { aparecer: true }, 'PUT')).status === 404);

  // 2) El profe lo enciende desde «🛡️ Nicks».
  const ad = await abrirPagina(b, { email: ADMIN, viejo: true, ingles: true, out, viewport: VISTA, ruta: '/ingles.html#nicks', esperar: '#rk-interruptor' });
  ok('admin: interruptor general «apagado»', (await ad.textContent('#rk-general')) === 'apagado');
  await ad.click('[data-nk="general"]');
  await ad.waitForFunction(() => (document.getElementById('rk-general') || {}).textContent === 'encendido', null, { timeout: 30000 });
  ok('admin: lo enciende con un botón', true);

  // 3) Marisol se pone nick en Juegos y pide aparecer: queda pendiente.
  await pedir('/juegos/nick', MARISOL, { nick: 'Estrella Azul' });
  await pedir('/juegos/nick', ANGEL, { nick: '' });
  const ma = await abrirPagina(b, { email: MARISOL, viejo: true, ingles: true, out, viewport: VISTA, ruta: '/ingles.html', esperar: '#rk-estado [data-rk="aparecer"]' });
  ok('encendido: «Nadie ve tu nick» y «🏆 Aparecer en el ranking»', (await ma.textContent('#rk-estado')).includes('Nadie ve tu nick'));
  ok('su posición privada «(solo tú lo ves)»', (await ma.textContent('#rk-yo')).includes('solo tú lo ves'));
  await ma.click('[data-rk="aparecer"]');
  await ma.waitForFunction(() => /esperando que el profe lo apruebe/.test((document.getElementById('rk-estado') || {}).textContent || ''), null, { timeout: 30000 });
  ok('pide aparecer → pendiente hasta que el profe lo apruebe', true);
  const an1 = await pedir('/gamificacion/ranking', ANGEL);
  ok('pendiente: no aparece para los demás', an1.status === 200 && !an1.body.lista.some(f => f.nick === 'Estrella Azul'), JSON.stringify(an1.body.lista));

  // Angel sin nick: el botón lo manda a Juegos.
  const sinNick = await pedir('/gamificacion/perfil', ANGEL, { aparecer: true }, 'PUT');
  ok('sin nick → 400 sin_nick', sinNick.status === 400 && sinNick.body.error === 'sin_nick');
  await pedir('/juegos/nick', ANGEL, { nick: 'Marisol fan' });
  const malo = await pedir('/gamificacion/perfil', ANGEL, { aparecer: true }, 'PUT');
  ok('nick con un nombre del registro → 400 nick_invalido', malo.status === 400 && malo.body.error === 'nick_invalido' && malo.body.motivo === 'nombre', JSON.stringify(malo.body));

  // 4) El profe lo aprueba en la cola.
  await ad.reload(); await ad.waitForSelector('#nk-cola [data-nk="aprobar"][data-nick="Estrella Azul"]', { timeout: 60000 });
  ok('cola: muestra nombre de pila y nick, sin correos', (await ad.textContent('#nk-cola')).includes('Estrella Azul') && !(await ad.textContent('#nicks-admin')).includes('@'));
  ok('admin «Nicks» sin scroll horizontal a 360 px', await sinScrollH(ad));
  await ad.screenshot({ path: 'rpg-ingles-admin-nicks.png', fullPage: true });
  await ad.click('#nk-cola [data-nk="aprobar"][data-nick="Estrella Azul"]');
  await ad.waitForFunction(() => (document.getElementById('nk-msg') || {}).textContent.includes('Listo'), null, { timeout: 30000 });
  ok('aprobar desde la cola', true);

  // 5) Angel ve a Estrella Azul; el JSON no trae datos personales.
  for (const tema of ['light', 'dark']) {
    const p = await abrirPagina(b, { email: ANGEL, viejo: true, ingles: true, out, viewport: VISTA, contexto: { colorScheme: tema }, ruta: '/ingles.html', esperar: '#rk-lista' });
    ok('Angel ve «Estrella Azul» en el ranking de su grupo (' + tema + ')', (await p.textContent('#rk-lista')).includes('Estrella Azul'));
    ok('ranking sin scroll horizontal a 360 px (' + tema + ')', await sinScrollH(p));
    await p.screenshot({ path: 'rpg-ingles-ranking-' + tema + '.png', fullPage: true });
    await p.context().close();
  }
  const rk = await pedir('/gamificacion/ranking', ANGEL);
  const txt = JSON.stringify(rk.body).toLowerCase();
  ok('JSON del ranking: sin correos, nombres, slugs, XP ni calificaciones', !/@|marisol|angel|"(nombre|alumno|slug|xp|nivel|porcentaje|calificacion)"/.test(txt), txt.slice(0, 200));

  // 5b) El profe rechaza un nick con motivo: el alumno ve el motivo y el botón a Juegos.
  await pedir('/juegos/nick', ANGEL, { nick: 'Rayo Veloz' });
  await pedir('/gamificacion/perfil', ANGEL, { aparecer: true }, 'PUT');
  await ad.reload(); await ad.waitForSelector('#nk-cola [data-nk="rechazar"][data-nick="Rayo Veloz"]', { timeout: 60000 });
  await ad.click('#nk-cola [data-nk="rechazar"][data-nick="Rayo Veloz"]');
  await ad.fill('.nk-motivo input', 'Elige uno sin la palabra Veloz');
  await ad.click('[data-nk="rechazar-ok"]');
  await ad.waitForFunction(() => (document.getElementById('nk-msg') || {}).textContent.includes('Listo'), null, { timeout: 30000 });
  const an = await abrirPagina(b, { email: ANGEL, viejo: true, ingles: true, out, viewport: VISTA, ruta: '/ingles.html', esperar: '#rk-estado' });
  const est = await an.textContent('#rk-estado');
  ok('rechazado: ve el motivo y el botón para cambiarlo en Juegos', est.includes('no aprobó') && est.includes('Elige uno sin la palabra Veloz') && !!(await an.$('#rk-estado a[href*="juegos.html"]')), est.slice(0, 120));
  await an.context().close();
  await pedir('/gamificacion/perfil', ANGEL, { aparecer: false }, 'PUT');

  // 6) Se oculta y desaparece en la siguiente carga.
  await ma.reload(); await ma.waitForSelector('[data-rk="ocultar"]', { timeout: 60000 });
  await ma.click('[data-rk="ocultar"]');
  await ma.waitForSelector('#rk-estado [data-rk="aparecer"]', { timeout: 30000 });
  const an2 = await pedir('/gamificacion/ranking', ANGEL);
  ok('se oculta → ya no aparece para los demás', !an2.body.lista.some(f => f.nick === 'Estrella Azul'), JSON.stringify(an2.body.lista));

  // 7) El profe lo apaga: desaparece todo.
  await pedir('/profe/ranking', ADMIN, { ranking: false });
  await ma.reload(); await ma.waitForSelector('#rpg-stats', { timeout: 60000 });
  ok('apagado otra vez: sin rastro del ranking', !(await ma.$('#rpg-ranking')));
  await b.close();
  await restaurar();
  console.log(out.join('\n')); process.exit(out.some(x => x.startsWith('FAIL')) ? 1 : 0);
})().catch(async e => { await restaurar(); console.log(out.join('\n')); console.error('ERROR', e.message.slice(0, 400)); process.exit(2); });
