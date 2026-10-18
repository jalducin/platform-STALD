// E2E: modo espectador en las partidas (openspec: espectador-partidas).
// 1) Brisca llena (4 personas): quien llega ve «La partida está llena» y «👀 Ver como espectador»; ve la mesa pública
//    (asientos con dorsos, triunfo y baza) pero ninguna mano; sus jugadas dan 403; «👀 N viendo» para todos; también se
//    entra a ver con el enlace ?sala=XXXX&ver=1.
// 2) Karts en vivo ya empezado (canal simulado con el relevo local): quien especta ve moverse los karts, cambia de cámara
//    con ▶, no manda nada (0 enviados) y lo que se inyecta con su id no le llega a nadie; al final ve el podio y se une
//    a la revancha.
// 3) Fútbol en línea: «👀 Solo ver» desde el principio; quien especta recibe las fotos del anfitrión con rol espectador.
// Capturas a 390×844 y 844×390.
require('./lib/entorno');
const { chromium } = require('playwright');
const { abrirPagina } = require('./lib/navegador');
const { levantarRelevo, initVivo } = require('./lib/vivo-relevo');
const API = process.env.API;
const out = []; const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const RUTA = '/juegos.html?arcadePrueba=1&vivoSimulado=1';
const VERTICAL = { width: 390, height: 844 }, HORIZONTAL = { width: 844, height: 390 };
const TACTIL = { hasTouch: true, isMobile: true };

const pedir = async (email, ruta, body) => {
  const r = await fetch(API + ruta + '?email=' + encodeURIComponent(email), body === undefined ? {} : { method: 'POST', body: JSON.stringify(body) });
  return { status: r.status, body: await r.json() };
};
let relevo = null;
const abrir = async (b, email, viewport = VERTICAL, ruta = RUTA, esperar = '[data-menu]') => { const p = await abrirPagina(b, { email, viejo: true, viewport, contexto: viewport === HORIZONTAL ? TACTIL : {}, init: initVivo(relevo.url, { latencia: 40, perdida: 0, desorden: 0 }), out, etiqueta: email, dialogos: 'aceptar', ruta, esperar }); p.on('pageerror', e => console.error('PILA', email, (e.stack || '').slice(0, 500))); return p; };
const marcoDe = async p => (await p.waitForSelector('#p-body #arcade-frame', { timeout: 60000 })).contentFrame();
const kartsDe = fr => fr.evaluate(() => window.__karts.estado());
async function crear(p, juego, extra) {
  await p.click('[data-tab="partidas"]'); await p.waitForSelector('#f-crear');
  await p.selectOption('#p-juego', juego);
  if (extra) await extra(p);
  await p.click('#f-crear button[type=submit]'); await p.waitForSelector('[data-p="empezar"]', { timeout: 30000 });
  return (await p.textContent('#p-codigo-chip')).replace(/[^A-Z]/g, '');
}
async function intentarUnirse(p, codigo) {
  await p.click('[data-tab="partidas"]'); await p.waitForSelector('#f-unirse');
  await p.fill('#p-codigo', codigo); await p.click('#f-unirse button[type=submit]');
}

async function cartas(b) {
  const host = await abrir(b, 'marisol@example.com');
  const codigo = await crear(host, 'brisca');
  for (const e of ['angel', 'laura', 'fernando']) await pedir(e + '@example.com', '/juegos/sala/' + codigo + '/unirse', {}); // NOSONAR: en orden
  const esp = await abrir(b, 'jesus@example.com');
  await intentarUnirse(esp, codigo);
  await esp.waitForSelector('#p-no-entra', { timeout: 30000 });
  const aviso = await esp.textContent('#p-no-entra');
  ok('sala llena: «La partida está llena» con «👀 Ver como espectador»', /La partida está llena/.test(aviso) && !!(await esp.$('[data-a="espectar"]')), aviso);
  await esp.click('[data-a="espectar"]');
  await esp.waitForSelector('.esp-chip', { timeout: 30000 });
  ok('distintivo «👀 Espectador» y sala de espera sin «Empezar» ni «Unirme a jugar» (llena)', /Espectador/.test(await esp.textContent('.esp-chip')) && !(await esp.$('[data-p="empezar"]')) && !(await esp.$('[data-p="jugar-esp"]')));
  ok('la URL lleva &ver=1 (recargar sigue viendo)', /ver=1/.test(esp.url()), esp.url());
  const lista = await esp.$$eval('#p-body .rank li', ls => ls.length);
  ok('quien especta no ocupa asiento: la mesa sigue con 4 personas', lista === 4, 'filas=' + lista);
  await host.waitForFunction(() => /1 viendo/.test(document.getElementById('p-viendo').textContent), null, { timeout: 20000 }).catch(() => {});
  ok('la anfitriona ve «👀 1 viendo»', /1 viendo/.test(await host.textContent('#p-viendo')));
  // Otra persona entra a ver con el enlace del QR + &ver=1.
  const link = await abrir(b, 'valeria@example.com', VERTICAL, RUTA + '&sala=' + codigo + '&ver=1', '.esp-chip');
  ok('enlace ?sala=…&ver=1: entra directo como espectador', !!(await link.$('.esp-chip')));
  await host.waitForFunction(() => /2 viendo/.test(document.getElementById('p-viendo').textContent), null, { timeout: 20000 }).catch(() => {});
  ok('«👀 2 viendo»', /2 viendo/.test(await host.textContent('#p-viendo')));
  await link.context().close(); // al salir deja de contar (POST salir en limpiar; aquí se cierra sin más)
  await host.click('[data-p="empezar"]');
  await host.waitForSelector('[data-br-carta]', { timeout: 30000 });
  await esp.waitForSelector('.es-baza, .pk-mesa', { timeout: 30000 });
  await sleep(1500);
  const manoHost = await host.$$eval('[data-br-carta]', bs => bs.map(x => x.dataset.brCarta));
  const vista = await esp.evaluate(() => ({ manos: document.querySelectorAll('[data-br-carta]').length, yo: !!document.querySelector('#p-body .pk-yo'), asientos: document.querySelectorAll('#p-body .pk-asiento').length, dorsos: document.querySelectorAll('#p-body .pk-asientos .es-dorso, #p-body .pk-asientos [class*="dorso"]').length, mesa: !!document.querySelector('#p-body .pk-mesa') }));
  ok('mesa pública: 4 asientos con dorsos y la mesa, sin ninguna mano', vista.manos === 0 && !vista.yo && vista.asientos === 4 && vista.dorsos > 0 && vista.mesa && manoHost.length === 3, JSON.stringify(vista));
  const jugada = await pedir('jesus@example.com', '/juegos/sala/' + codigo + '/respuesta', { jugada: { n: 0, accion: 'jugar', carta: Number(manoHost[0]) } });
  ok('quien especta no puede jugar (403)', jugada.status === 403, JSON.stringify(jugada));
  const datos = await pedir('jesus@example.com', '/juegos/sala/' + codigo);
  ok('la vista del servidor es de espectador y sin canal', datos.body.espectador === true && !('rt' in datos.body) && !JSON.stringify(datos.body).includes('canal'), Object.keys(datos.body).join(','));
  await esp.screenshot({ path: 'espectador-cartas-390.png' });
  await esp.setViewportSize(HORIZONTAL); await sleep(800);
  await esp.screenshot({ path: 'espectador-cartas-844x390.png' });
  await host.context().close(); await esp.context().close();
}

async function karts(b) {
  const m = await abrir(b, 'marisol@example.com'), a = await abrir(b, 'angel@example.com');
  const codigo = await crear(m, 'karts', p => p.selectOption('#p-mapa', 'pradera'));
  await intentarUnirse(a, codigo); await a.waitForSelector('#p-body .rank li', { timeout: 30000 });
  await sleep(2500);
  await m.click('[data-p="empezar"]');
  const [fm, fa] = [await marcoDe(m), await marcoDe(a)];
  await Promise.all([fm, fa].map(fr => fr.waitForFunction(() => window.__karts && window.__karts.estado().modo === 'carrera', null, { timeout: 60000 })));
  await sleep(9000); // cuenta regresiva de 8 s: ya empezó
  await Promise.all([fm, fa].map(fr => fr.evaluate(() => window.__karts.piloto(true))));
  const j = await abrir(b, 'jesus@example.com', HORIZONTAL);
  await intentarUnirse(j, codigo);
  await j.waitForSelector('#p-no-entra', { timeout: 30000 });
  ok('Karts empezado: «La partida ya empezó» con «👀 Ver como espectador»', /ya empezó/.test(await j.textContent('#p-no-entra')));
  await j.click('[data-a="espectar"]');
  const fj = await marcoDe(j);
  await fj.waitForFunction(() => window.__karts && window.__karts.estado().espectador && window.__karts.estado().modo === 'carrera', null, { timeout: 60000 });
  await fj.waitForFunction(() => window.__karts.estado().remotos.filter(r => r.visible).length === 2, null, { timeout: 20000 }).catch(() => {});
  const e1 = await kartsDe(fj);
  await sleep(1500);
  const e2 = await kartsDe(fj);
  const movio = e1.remotos.every(r => { const r2 = e2.remotos.find(x => x.id === r.id); return r2 && Math.hypot(r2.x - r.x, r2.y - r.y) > 30; });
  ok('quien especta ve los 2 karts en vivo y se mueven', e2.remotos.length === 2 && e2.remotos.every(r => r.visible) && movio, JSON.stringify(e2.remotos.map(r => [r.nombre, r.x, r.y])));
  ok('cámara del espectador: sigue al líder y lo dice', e2.espectador && e2.sigueLider && /👑/.test(e2.camEsp || ''), e2.camEsp);
  ok('sin controles del juego en el iframe (mandos ocultos)', await fj.evaluate(() => getComputedStyle(document.getElementById('mandos')).display === 'none'));
  const antes = e2.sigue;
  await fj.click('#esp-sig');
  await sleep(400);
  const e3 = await kartsDe(fj);
  ok('▶ cambia la cámara a la otra persona', e3.sigue && e3.sigue !== antes && !e3.sigueLider, antes + ' → ' + e3.sigue + ' · ' + e3.camEsp);
  ok('minimapa y clasificación en vivo con nombres', e3.marcasMapa >= 2 && /Marisol|Angel/.test(e3.tablaVivo || '') && !/Tú/.test(e3.tablaVivo || ''), e3.tablaVivo);
  await j.screenshot({ path: 'espectador-karts-844x390.png' });
  // Solo escucha: el espectador no manda nada; lo que se inyecta con su id no le llega a quien corre.
  ok('solo escucha: 0 mensajes enviados por quien especta', e3.vivo && e3.vivo.stats.enviados === 0, JSON.stringify(e3.vivo && e3.vivo.stats));
  const idJ = await j.evaluate(() => sala.estado.yo);
  const antesM = await kartsDe(fm);
  for (let k = 0; k < 10; k++) relevo.inyectar('sala-sim-' + codigo, { i: idJ, s: 1000 + k, t: Date.now(), e: 'k', d: [0, 0, 0, 0, 2, 0, 0, 999, 'xalli', 0] });
  relevo.inyectar('sala-sim-' + codigo, { i: idJ, s: 2000, t: Date.now(), e: 'item', d: [1, 2, 0, 0, 0, 180, 1, 0, 0, 0, -1, 0] });
  await sleep(800);
  const despuesM = await kartsDe(fm);
  // El puente de la página ya no deja pasar ids fuera de la sala (y EnVivo los descartaría): ni kart, ni presencia, ni ítem.
  ok('lo que «manda» quien especta no tiene efecto (no aparece como kart ni como presente; sin ítems)', despuesM.remotos.length === 1 && despuesM.remotos[0].id !== idJ && !despuesM.vivo.presencia.includes(idJ) && despuesM.objetosRed.length === antesM.objetosRed.length,
    JSON.stringify({ remotos: despuesM.remotos.map(r => r.id), pres: despuesM.vivo.presencia, objetos: [antesM.objetosRed.length, despuesM.objetosRed.length] }));
  // Podio y revancha.
  await Promise.all([fm, fa].map(fr => fr.waitForFunction(() => window.__karts.estado().tiempo > 31000, null, { timeout: 90000 })));
  for (const fr of [fm, fa]) await fr.evaluate(() => window.__karts.adelantar()); // NOSONAR: en orden
  await j.waitForSelector('#p-body .result', { timeout: 90000 });
  await sleep(1200);
  const podio = await j.$$eval('.arcade-tiempos tbody tr', trs => trs.map(t => t.textContent));
  ok('quien especta ve el podio con los tiempos de las 2 personas (y el bot)', ['Marisol', 'Angel'].every(n => podio.some(f => f.includes(n) && /\d:\d\d\.\d/.test(f))) && !podio.some(f => /Jes/.test(f)), podio.join(' | '));
  ok('sin puntos guardados para quien especta', !/puntos de partidas/.test(await j.textContent('#p-guardado')));
  await j.setViewportSize(VERTICAL); await sleep(500);
  await j.screenshot({ path: 'espectador-podio-390.png', fullPage: true });
  await m.waitForSelector('[data-p="revancha"]', { timeout: 30000 });
  await m.click('[data-p="revancha"]');
  await j.waitForSelector('[data-p="revancha-esp"]', { timeout: 30000 });
  ok('podio del espectador: «🔁 Unirme a la revancha»', /Unirme a la revancha/.test(await j.textContent('[data-p="revancha-esp"]')));
  await j.click('[data-p="revancha-esp"]');
  await j.waitForSelector('#p-body .rank li', { timeout: 30000 });
  await sleep(1500);
  const nombres = await j.$$eval('#p-body .rank li .n', ls => ls.map(l => l.textContent));
  ok('se une a la revancha como jugador (sin distintivo de espectador)', !(await j.$('.esp-chip')) && nombres.some(n => /Jes/.test(n)), nombres.join(' | '));
  await Promise.all([m, a, j].map(p => p.context().close()));
}

async function futbol(b) {
  const p = await abrir(b, 'marisol@example.com'), a = await abrir(b, 'angel@example.com', HORIZONTAL);
  const codigo = await crear(p, 'futbol');
  const j = await abrir(b, 'jesus@example.com');
  await j.click('[data-tab="partidas"]'); await j.fill('#p-codigo', codigo); await j.click('[data-a="espectar-form"]');
  await j.waitForSelector('.esp-chip', { timeout: 30000 });
  ok('«👀 Solo ver»: especta desde la sala de espera y ve «Unirme a jugar» (hay lugar)', !!(await j.$('[data-p="jugar-esp"]')));
  ok('sin la táctica (solo es para quien juega)', !(await j.$('#p-tactica-fut')));
  await intentarUnirse(a, codigo); await p.waitForFunction(() => /· 2 personas/.test((document.getElementById('p-mesa') || {}).textContent || ''), null, { timeout: 30000 });
  await p.click('[data-p="empezar"]');
  const fj = await marcoDe(j);
  await fj.waitForFunction(() => window.__futbol && window.__futbol.red() && window.__futbol.red().recibidas > 5, null, { timeout: 60000 });
  const r = await fj.evaluate(() => window.__futbol.red());
  ok('Fútbol: el espectador recibe las fotos del anfitrión con rol espectador', r.rol === 'espectador' && r.recibidas > 5, JSON.stringify(r));
  ok('Fútbol: sin mandos y con «👀 Espectador» en la cancha', await fj.evaluate(() => document.body.classList.contains('espectador') && !!document.getElementById('esp-chip')));
  await sleep(1500);
  await j.screenshot({ path: 'espectador-futbol-390.png' });
  await j.setViewportSize(HORIZONTAL); await sleep(800);
  await j.screenshot({ path: 'espectador-futbol-844x390.png' });
  await Promise.all([p, a, j].map(x => x.context().close()));
}

// 4) Brigada Xalli en equipo: quien especta escucha las fotos del anfitrión y sigue la cámara compartida, sin mandar nada.
async function brigada(b) {
  const p = await abrir(b, 'marisol@example.com'), a = await abrir(b, 'angel@example.com');
  const codigo = await crear(p, 'brigada', async q => { await q.selectOption('#p-bmision', '1'); if (await q.isChecked('#p-bots')) await q.click('#p-bots'); });
  await intentarUnirse(a, codigo); await a.waitForSelector('#p-body .rank li', { timeout: 30000 });
  await p.click('[data-p="empezar"]');
  const fa = await marcoDe(a);
  await fa.waitForFunction(() => window.__brigada && window.__brigada.red() && window.__brigada.red().recibidas > 3, null, { timeout: 60000 });
  const j = await abrir(b, 'jesus@example.com', HORIZONTAL);
  await intentarUnirse(j, codigo);
  await j.waitForSelector('[data-a="espectar"]', { timeout: 30000 });
  await j.click('[data-a="espectar"]');
  const fj = await marcoDe(j);
  await fj.waitForFunction(() => window.__brigada && window.__brigada.red() && window.__brigada.red().recibidas > 5, null, { timeout: 60000 });
  const fm = await marcoDe(p);
  await fm.evaluate(() => window.__brigada.invulnerable());
  const c1 = await fj.evaluate(() => window.__brigada.m().cam.x);
  await fm.evaluate(() => { const m = window.__brigada.m(); m.cam.x += 300; m.jugadores.forEach(q => { q.x += 300; }); }); // la brigada avanza: la cámara compartida también
  await sleep(1500);
  const r = await fj.evaluate(() => ({ red: window.__brigada.red(), cam: window.__brigada.m().cam.x, clase: document.body.classList.contains('espectador'), chip: !!document.getElementById('esp-chip') }));
  ok('Brigada: el espectador recibe las fotos del anfitrión (rol espectador) y sigue la cámara compartida', r.red.rol === 'espectador' && r.red.recibidas > 5 && r.cam > c1 + 100 && r.clase && r.chip, JSON.stringify({ rol: r.red.rol, rec: r.red.recibidas, cam: [c1, r.cam] }));
  const s = await pedir('marisol@example.com', '/juegos/sala/' + codigo);
  ok('Brigada: la mesa sigue con 2 personas y 1 viendo', s.body.jugadores.length === 2 && s.body.viendo === 1, JSON.stringify({ n: s.body.jugadores.length, viendo: s.body.viendo }));
  await j.screenshot({ path: 'espectador-brigada-844x390.png' });
  await Promise.all([p, a, j].map(x => x.context().close()));
}

(async () => {
  relevo = await levantarRelevo();
  const b = await chromium.launch({ executablePath: process.env.CHROME });
  for (const [nombre, fn] of (process.env.SOLO ? [['brigada', brigada]] : [['cartas', cartas], ['karts', karts], ['futbol', futbol], ['brigada', brigada]])) {
    try { await fn(b); } catch (e) { ok('parte ' + nombre + ' sin errores', false, e.message.slice(0, 300)); }
  }
  await b.close(); await relevo.cerrar();
  console.log(out.join('\n')); process.exit(out.some(x => x.startsWith('FAIL')) ? 1 : 0);
})().catch(e => { console.log(out.join('\n')); console.error('ERROR', e.message.slice(0, 400)); process.exit(2); });
