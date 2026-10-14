// E2E: Karts en vivo (openspec: juegos-en-vivo). Sala de 8 personas (5 alumnos y alumnas de ejemplo + 3 invitados
// nuevos) con el canal SIMULADO: un relevo local (tests/e2e/lib/vivo-relevo.js) en lugar de Supabase, con latencia
// (60 ms ± 20 %), pérdida (3 %) y desorden (10 %) inyectados en cada página. Se usan 8 contextos porque es el cupo
// pedido por el profe; cada uno corre su carrera con el piloto de prueba.
// Revisa: cada quien ve el kart de los demás moverse (cerca de donde de verdad va), su nombre y personaje; minimapa
// con los 8; clasificación en vivo; mensajes por segundo del canal; podio del servidor con los 8 tiempos; fps de un
// aparato con 8 karts en vivo (sin límite y con CPU ×4; ver fpsAislado). Aparte: una sala de 3 donde alguien se
// desconecta (aviso y su kart se desvanece) y el respaldo (sin canal: aviso y fantasmas; canal que no conecta en 5 s: aviso). Capturas a 390×844 y 844×390.
require('./lib/entorno'); // BASE, API, CHROME, carpeta de salida y sesión de prueba en fetch
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
  const r = await fetch(API + ruta + '?email=' + encodeURIComponent(email), { method: 'POST', body: JSON.stringify(body) });
  return { status: r.status, body: await r.json() };
};
const jugador = (b, email, relevo, viewport = VERTICAL, opciones = {}, ruta = RUTA) => abrirPagina(b, { email, viejo: true, viewport, contexto: viewport === HORIZONTAL ? TACTIL : {}, init: relevo ? initVivo(relevo.url, opciones) : undefined, out, ruta, esperar: '[data-menu]' });
const marcoDe = async p => (await p.waitForSelector('#p-body #arcade-frame', { timeout: 60000 })).contentFrame();
const estado = fr => fr.evaluate(() => window.__karts.estado());

async function crearSala(host, mapa) {
  await host.click('[data-tab="partidas"]'); await host.waitForSelector('#f-crear');
  await host.selectOption('#p-juego', 'karts'); await host.selectOption('#p-mapa', mapa);
  await host.click('#f-crear button[type=submit]'); await host.waitForSelector('[data-p="empezar"]', { timeout: 30000 });
  return (await host.textContent('.letra')).trim();
}
async function unirse(p, codigo) {
  await p.click('[data-tab="partidas"]'); await p.fill('#p-codigo', codigo); await p.click('#f-unirse button[type=submit]');
  await p.waitForSelector('#p-body .rank li', { timeout: 30000 });
}
// Todos entran a la carrera (iframe en modo sala).
async function enCarrera(pags) {
  return Promise.all(pags.map(async p => {
    const fr = await marcoDe(p);
    await fr.waitForFunction(() => window.__karts && window.__karts.estado().sala && window.__karts.estado().modo === 'carrera', null, { timeout: 60000 });
    return fr;
  }));
}
const yoDe = p => p.evaluate(() => sala.estado.yo);
const distancia = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

async function salaDe8(b, relevo) {
  const sufijo = Date.now().toString(36);
  const invitados = ['Nube', 'Rayo', 'Trueno'].map((n, k) => ({ email: `kv-${n.toLowerCase()}-${sufijo}@example.com`, nombre: n + ' ' + (k + 1) }));
  const altas = await Promise.all(invitados.map(i => pedir(i.email, '/juegos/invitado', { nombre: i.nombre, acepto: true })));
  ok('alta de 3 invitados de prueba', altas.every(r => r.status === 200), altas.map(r => r.status).join(','));
  const correos = ['marisol', 'angel', 'laura', 'fernando', 'jesus'].map(n => n + '@example.com').concat(invitados.map(i => i.email));
  // Angel en horizontal (celular de lado) para la captura 844×390; los demás en vertical.
  const pags = [];
  for (const [k, email] of correos.entries()) pags.push(await jugador(b, email, relevo, k === 1 ? HORIZONTAL : VERTICAL)); // NOSONAR: abrir en orden
  const [host, ...otros] = pags;
  // Un personaje distinto por persona (la lista sale de juegos/personajes.js, no se fija aquí).
  const lista = await host.evaluate(() => new Promise(ok => { const s = document.createElement('script'); s.src = 'juegos/personajes.js'; s.onload = () => ok(window.Personajes.LISTA.map(p => p.id)); document.head.appendChild(s); }));
  await Promise.all(pags.map((p, k) => p.evaluate(id => localStorage.setItem('arcade_personaje', id), lista[k % lista.length])));
  const codigo = await crearSala(host, 'pradera');
  for (const p of otros) await unirse(p, codigo); // NOSONAR: entran en orden
  await sleep(2500);
  const lobby = await host.$$eval('#p-body .rank li', ls => ls.length);
  ok('sala de espera: 8 personas y ningún bot (cada persona quita un bot)', lobby === 8, 'filas=' + lobby);
  const extra = await jugador(b, 'valeria@example.com', relevo);
  await extra.click('[data-tab="partidas"]'); await extra.fill('#p-codigo', codigo); await extra.click('#f-unirse button[type=submit]');
  await extra.waitForSelector('#p-msg .alert', { timeout: 30000 }).catch(() => {});
  ok('la 9.ª persona no entra (sala llena)', /llena/.test(await extra.textContent('#p-msg').catch(() => '')), await extra.textContent('#p-msg').catch(() => ''));
  await extra.context().close();
  await host.click('[data-p="empezar"]');
  const frames = await enCarrera(pags);
  return { pags, frames, codigo, lista, correos };
}

async function revisarVivo(pags, frames, relevo, lista) {
  // Durante la cuenta regresiva ya se conectan; al salir, todos manejan con el piloto de prueba.
  await Promise.all(frames.map(fr => fr.waitForFunction(() => { const e = window.__karts.estado(); return e.vivo && e.vivo.estado === 'vivo'; }, null, { timeout: 20000 }).catch(() => {})));
  const ests = await Promise.all(frames.map(estado));
  ok('canal en vivo conectado en los 8', ests.every(e => e.vivo && e.vivo.estado === 'vivo'), ests.map(e => e.vivo && e.vivo.estado).join(','));
  await Promise.all(frames.map(fr => fr.waitForFunction(() => window.__karts.estado().vuelta >= 0 || window.__karts.estado().tiempo > 0, null, { timeout: 20000 }).catch(() => {})));
  await Promise.all(frames.map(fr => fr.evaluate(() => window.__karts.piloto(true))));
  await sleep(4000);
  const c0 = relevo.contar().mensajes;
  await sleep(5000);
  const porSeg = (relevo.contar().mensajes - c0) / 5;
  const e1 = await Promise.all(frames.map(estado));
  ok('cada quien ve a las otras 7 personas', e1.every(e => e.remotos.length === 7 && e.remotos.every(r => r.visible)), e1.map(e => e.remotos.filter(r => r.visible).length).join(','));
  ok('presencia: 8 conectados en cada aparato', e1.every(e => e.vivo.presencia.length === 8), e1.map(e => e.vivo.presencia.length).join(','));
  ok('8 karts a 10 Hz: ≈ 80–95 mensajes/s enviados por la sala (estados + latidos + pings)', porSeg >= 70 && porSeg <= 100, porSeg.toFixed(1) + '/s');
  // El kart de Angel en la pantalla de Marisol va cerca de donde de verdad va Angel (100 ms de interpolación + red).
  const ids = await Promise.all(pags.map(yoDe));
  const [m1] = await Promise.all([estado(frames[0]), estado(frames[1])]);
  const visto1 = m1.remotos.find(r => r.id === ids[1]);
  await sleep(1000);
  const [m2, a2] = await Promise.all([estado(frames[0]), estado(frames[1])]);
  const visto2 = m2.remotos.find(r => r.id === ids[1]);
  const real = { x: a2.camX, y: a2.camY }; // la cámara va 115 px detrás del kart: se compara con su propio estado
  ok('Marisol ve moverse el kart de Angel', visto1 && visto2 && distancia(visto1, visto2) > 60, JSON.stringify({ visto1, visto2 }).slice(0, 200));
  const propio = await frames[1].evaluate(() => { const k = window.__karts.estado(); return { x: k.camX + Math.cos(k.camAng) * 115, y: k.camY + Math.sin(k.camAng) * 115 }; });
  ok('y lo ve cerca de donde Angel va de verdad (< 120 px)', visto2 && distancia(visto2, propio) < 120, JSON.stringify({ visto2, propio, real }).slice(0, 200));
  ok('con su nombre de la sala y su personaje', visto2 && visto2.nombre === 'Angel' && visto2.personaje === lista[1 % lista.length], visto2 && visto2.nombre + ' · ' + visto2.personaje);
  ok('colores distintos por lugar en la sala', new Set(e1.map(e => e.yoColor)).size === 8, e1.map(e => e.yoColor).join(','));
  ok('minimapa: 8 corredores en cada aparato', e1.every(e => e.marcasMapa === 8 && e.yoEnMapa), e1.map(e => e.marcasMapa).join(','));
  ok('HUD: posición de 8', (await pags[0].evaluate(() => document.querySelector('#arcade-frame').contentDocument.querySelector('#h-de').textContent)) === '/8');
  const tablas = e1.map(e => e.tablaVivo || '');
  ok('clasificación en vivo con 8 filas', tablas.every(t => (t.match(/Tú/g) || []).length === 1) && (await frames[0].$$eval('#vivo-tabla li', ls => ls.length)) === 8, tablas[0]);
  // Posiciones: el lugar que Marisol ve para Angel y el que Angel ve para sí mismo coinciden (± 1 por la red).
  ok('el lugar de Angel coincide en las dos pantallas (± 1)', visto2 && Math.abs(visto2.pos - a2.pos) <= 1, (visto2 && visto2.pos) + ' vs ' + a2.pos);
  ok('latencia medida en el canal simulado (≈ 60 ms)', e1[0].vivo.latencia === null || (e1[0].vivo.latencia > 30 && e1[0].vivo.latencia < 200), String(e1[0].vivo.latencia));
  await pags[0].screenshot({ path: 'karts-vivo-390.png' });
  await pags[1].screenshot({ path: 'karts-vivo-844x390.png' });
  return { ids, porSeg };
}


async function terminarTodos(pags, frames) {
  // Mínimo de una carrera en sala: 25 % de la referencia de la pista (karts-pistas-grandes: ≈ 30 s en la Pradera).
  // Cada quien llega a la meta y manda su tiempo.
  await Promise.all(frames.map(fr => fr.waitForFunction(() => window.__karts.estado().tiempo > 31000, null, { timeout: 90000 })));
  for (const fr of frames) await fr.evaluate(() => window.__karts.adelantar()); // NOSONAR: uno por uno, como llegan
  await pags[0].waitForSelector('#p-body .result', { timeout: 90000 });
  await sleep(1500);
  const txt = await pags[0].textContent('#p-body');
  const filas = await pags[0].$$eval('.arcade-tiempos tbody tr', trs => trs.map(t => t.textContent));
  ok('podio del servidor con los tiempos de las 8 personas', filas.length === 8 && filas.every(f => /\d:\d\d\.\d/.test(f)), filas.length + ' ' + txt.slice(0, 120));
}

// fps de UN aparato con 8 karts en vivo, sin límite y con CPU ×4. Con 8 navegadores dibujando a la vez en la misma
// máquina la medición sale contaminada (15–50 fps según la carga), así que aquí solo Marisol abre el navegador: las
// otras 7 personas entran a la sala por la API y el relevo fabrica sus karts a 10 Hz recorriendo la pista. Marisol
// recibe y dibuja lo mismo que en una sala real de 8.
async function fpsAislado(b, relevo, correos) {
  const m = await jugador(b, correos[0], relevo);
  const codigo = await crearSala(m, 'pradera');
  for (const email of correos.slice(1)) await pedir(email, '/juegos/sala/' + codigo + '/unirse', {}); // NOSONAR: entran en orden
  const ids = (await (await fetch(API + '/juegos/sala/' + codigo + '?email=' + encodeURIComponent(correos[0]))).json()).jugadores.map(j => j.id).filter(id => id !== 'a-marisol');
  await m.waitForFunction(() => document.querySelectorAll('#p-body .rank li').length >= 8, null, { timeout: 30000 }).catch(() => {});
  await m.click('[data-p="empezar"]');
  const [fr] = await enCarrera([m]);
  const ruta = await fr.evaluate(() => window.__karts.ruta());
  let seq = 0, n = 0;
  const iv = setInterval(() => {
    n++;
    ids.forEach((id, k) => {
      const i = (n * 3 + k * 25) % ruta.length, [x, y, a] = ruta[i], lado = (k % 2 ? 1 : -1) * 20;
      const d = [Math.round((x - Math.sin(a / 1000) * lado) * 10), Math.round((y + Math.cos(a / 1000) * lado) * 10), a, 180, 1, i, k === 0 ? 1 : 0, 0, 'xalli'];
      relevo.inyectar('sala-sim-' + codigo, { i: id, s: ++seq, t: Date.now(), e: 'k', d });
    });
  }, 100);
  // fps = mediana de 8 lecturas (una cada 0.5 s; el juego cuenta cuadros por segundo) tras calentar la caché de sprites.
  const medianaFps = async () => {
    const xs = [];
    for (let k = 0; k < 8; k++) { await sleep(500); xs.push((await estado(fr)).fps); } // NOSONAR: lecturas en orden
    xs.sort((a, b) => a - b);
    return xs[4];
  };
  await sleep(9000); // cuenta regresiva + 3 s de carrera
  await fr.evaluate(() => window.__karts.piloto(true));
  await sleep(3000);
  const libre = await medianaFps();
  const cdp = await m.context().newCDPSession(m);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await sleep(1500);
  const lento = await medianaFps();
  const e = await estado(fr);
  await m.screenshot({ path: 'karts-vivo-390-cpu4.png' });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  clearInterval(iv);
  const visibles = e.remotos.filter(r => r.visible).length;
  ok('fps sin límite con 8 karts en vivo ≥ 55', libre >= 55, 'fps=' + libre);
  ok('fps con CPU ×4 y 8 karts en vivo ≥ 55 (meta 60)', lento >= 55 && visibles === 7, 'fps=' + lento + ' visibles=' + visibles);
  await m.context().close();
  return { libre, lento };
}

async function desconexion(b, relevo) {
  const pags = [];
  for (const email of ['marisol@example.com', 'angel@example.com', 'laura@example.com']) pags.push(await jugador(b, email, relevo)); // NOSONAR: en orden
  // Sala en una pista mesoamericana (las 8 pistas se ofrecen en sala desde juegos-en-vivo).
  await pags[0].click('[data-tab="partidas"]'); await pags[0].waitForSelector('#f-crear'); await pags[0].selectOption('#p-juego', 'karts');
  const opciones = (await pags[0].$$eval('#p-mapa option', os => os.map(o => o.value))).filter(Boolean);
  ok('salas: el selector ofrece las 8 pistas', opciones.length === 8 && opciones.includes('chichen'), opciones.join(','));
  const codigo = await crearSala(pags[0], 'chichen');
  await unirse(pags[1], codigo); await unirse(pags[2], codigo);
  await sleep(1500);
  await pags[0].click('[data-p="empezar"]');
  const frames = await enCarrera(pags);
  await Promise.all(frames.map(fr => fr.waitForFunction(() => { const e = window.__karts.estado(); return e.vivo && e.remotos.every(r => r.visible); }, null, { timeout: 25000 }).catch(() => {})));
  await Promise.all(frames.map(fr => fr.evaluate(() => window.__karts.piloto(true))));
  await sleep(3000);
  const enChichen = await Promise.all(frames.map(estado));
  ok('sala en pista nueva (Sacbé de Chichén Itzá): los 3 corren ahí y se ven en vivo', enChichen.every(e => e.pista === 'chichen' && e.remotos.length === 2 && e.remotos.every(r => r.visible)), enChichen.map(e => e.pista + ':' + e.remotos.filter(r => r.visible).length).join(','));
  const idLaura = await yoDe(pags[2]);
  // Laura se queda sin señal (no avisa): a los 3 s los demás la dan por desconectada.
  relevo.cortar(idLaura);
  const avisos = new Set();
  const t0 = Date.now();
  while (Date.now() - t0 < 7000) { avisos.add((await estado(frames[0])).aviso); await sleep(100); } // NOSONAR: sondeo del aviso
  const e = await estado(frames[0]);
  const laura = e.remotos.find(r => r.id === idLaura);
  ok('desconexión: aviso «👋 Laura perdió la conexión»', [...avisos].some(a => /Laura perdió la conexión/.test(a)), [...avisos].join(' | ').slice(0, 160));
  ok('desconexión: su kart se desvaneció y salió de la clasificación', laura && !laura.visible && !/Laura/.test(e.tablaVivo || ''), JSON.stringify(laura));
  ok('desconexión: Angel sigue visible', e.remotos.find(r => r.nombre === 'Angel').visible);
  await pags[0].screenshot({ path: 'karts-vivo-desconexion.png' });
  // Vuelve la señal: reaparece.
  relevo.reanudar(idLaura);
  await frames[0].waitForFunction(id => window.__karts.estado().remotos.find(r => r.id === id).visible, idLaura, { timeout: 8000 }).catch(() => {});
  ok('al volver la señal, Laura reaparece', (await estado(frames[0])).remotos.find(r => r.id === idLaura).visible);
  for (const p of pags) await p.context().close();
}

// personaje-en-salas: sala de 3 (vertical, horizontal y vertical). La tarjeta «🏁 Tu piloto» marca el del modo
// individual; cada quien elige otro distinto, ve el de los demás junto a su nombre y en la carrera su kart y los de
// los rivales llevan el elegido desde la salida.
async function personajesEnSala(b, relevo) {
  const quienes = [['marisol@example.com', VERTICAL, 'tona'], ['angel@example.com', HORIZONTAL, 'kinich'], ['laura@example.com', VERTICAL, 'yahui']];
  const pags = [];
  for (const [email, vp] of quienes) pags.push(await jugador(b, email, relevo, vp)); // NOSONAR: en orden
  await pags[0].evaluate(() => localStorage.setItem('arcade_personaje', 'itzae')); // lo eligió antes en el modo individual
  const codigo = await crearSala(pags[0], 'pradera');
  await unirse(pags[1], codigo); await unirse(pags[2], codigo);
  await pags[0].waitForSelector('#p-personaje [data-personaje]', { timeout: 15000 });
  const marcados = await pags[0].$$eval('#p-personaje [data-personaje]', bs => bs.map(b => ({ id: b.dataset.personaje, on: b.getAttribute('aria-pressed') === 'true', txt: b.textContent })));
  ok('sala de espera: «🏁 Tu piloto» con los 8 (nombre y peso) e Itzae marcado, el del modo individual', /Tu piloto/.test(await pags[0].textContent('#p-personaje')) && marcados.length === 8 && marcados.every(m => /Ligero|Medio|Pesado/.test(m.txt)) && marcados.filter(m => m.on).map(m => m.id).join() === 'itzae', JSON.stringify(marcados.filter(m => m.on)));
  // 4×2 sin desplazamiento horizontal, de pie y de lado.
  for (const [k, nombre] of [[0, '390×844'], [1, '844×390']]) {
    const m = await pags[k].evaluate(() => { const bs = [...document.querySelectorAll('#p-personaje [data-personaje]')].map(e => e.getBoundingClientRect()); return { vw: innerWidth, ancho: document.documentElement.scrollWidth, filas: new Set(bs.map(r => Math.round(r.top))).size, fuera: bs.filter(r => r.right > innerWidth || r.left < 0).length }; });
    ok('sala de espera ' + nombre + ': los 8 en 4×2 sin desplazamiento horizontal', m.filas === 2 && m.fuera === 0 && m.ancho <= m.vw, JSON.stringify(m));
  }
  for (const [k, [, , id]] of quienes.entries()) await pags[k].click('#p-personaje [data-personaje="' + id + '"]'); // NOSONAR: uno por uno
  const nombres = { tona: 'Tona', kinich: 'Kinich', yahui: 'Yahui' };
  await Promise.all(pags.map(p => p.waitForFunction(n => { const t = (document.querySelector('#p-body .rank') || {}).textContent || ''; return n.every(x => t.includes(x)); }, Object.values(nombres), { timeout: 20000 }).catch(() => {})));
  const listas = await Promise.all(pags.map(p => p.$$eval('#p-body .rank li', ls => ls.map(l => l.textContent.replace(/\s+/g, ' ').trim()))));
  const fila = (l, n) => l.find(t => t.includes(n)) || '';
  ok('sala de espera: cada quien ve el personaje de los demás junto a su nombre', listas.every(l => /Tona$/.test(fila(l, 'Marisol')) && /Kinich$/.test(fila(l, 'Angel')) && /Yahui$/.test(fila(l, 'Laura'))), listas[0].join(' | ').slice(0, 160));
  const guardados = await Promise.all(pags.map(p => p.evaluate(() => localStorage.getItem('arcade_personaje'))));
  ok('sala de espera: la elección queda en el navegador (compartida con el modo individual)', guardados.join() === 'tona,kinich,yahui', guardados.join());
  await pags[0].screenshot({ path: 'karts-sala-espera-390.png', fullPage: true });
  await pags[1].screenshot({ path: 'karts-sala-espera-844x390.png' });
  await pags[1].screenshot({ path: 'karts-sala-espera-844x390-completa.png', fullPage: true });
  const ids = await Promise.all(pags.map(yoDe));
  await pags[0].click('[data-p="empezar"]');
  const frames = await enCarrera(pags);
  // Desde la salida (antes de que llegue el primer mensaje en vivo), cada kart remoto ya trae el personaje de su asiento.
  const e0 = await Promise.all(frames.map(estado));
  const esperado = Object.fromEntries(ids.map((id, k) => [id, quienes[k][2]]));
  ok('carrera: cada quien corre con el suyo', e0.map(e => e.personaje).join() === 'tona,kinich,yahui', e0.map(e => e.personaje).join());
  ok('carrera: los rivales llevan su personaje desde la salida', e0.every(e => e.remotos.length === 2 && e.remotos.every(r => r.personaje === esperado[r.id])), JSON.stringify(e0.map(e => e.remotos.map(r => r.personaje))));
  await Promise.all(frames.map(fr => fr.waitForFunction(() => { const e = window.__karts.estado(); return e.vivo && e.remotos.every(r => r.visible); }, null, { timeout: 25000 }).catch(() => {})));
  await Promise.all(frames.map(fr => fr.evaluate(() => window.__karts.piloto(true))));
  await sleep(2500);
  const e1 = await Promise.all(frames.map(estado));
  ok('carrera en vivo: los 3 se ven y con su personaje', e1.every(e => e.remotos.every(r => r.visible && r.personaje === esperado[r.id])), JSON.stringify(e1.map(e => e.remotos.map(r => r.personaje + ':' + r.visible))));
  await pags[0].screenshot({ path: 'karts-sala-carrera-390.png' });
  await pags[1].screenshot({ path: 'karts-sala-carrera-844x390.png' });
  for (const p of pags) await p.context().close();
}

async function respaldo(b, relevo) {
  // Sin canal (sala sin Realtime ni doble): aviso inmediato y la carrera de siempre con fantasmas.
  const sin = [await jugador(b, 'fernando@example.com', null, VERTICAL, {}, '/juegos.html?arcadePrueba=1'), await jugador(b, 'jesus@example.com', null, VERTICAL, {}, '/juegos.html?arcadePrueba=1')];
  // personaje-en-salas: Fernando con Yahui y Jesús con Xalli; el fantasma del bot no usa ninguno de los dos.
  await sin[0].evaluate(() => localStorage.setItem('arcade_personaje', 'yahui')); await sin[1].evaluate(() => localStorage.setItem('arcade_personaje', 'xalli'));
  const c1 = await crearSala(sin[0], 'desierto');
  await unirse(sin[1], c1); await sleep(1500);
  await sin[0].click('[data-p="empezar"]');
  const f1 = await enCarrera(sin);
  const avisos = new Set(), t0 = Date.now();
  while (Date.now() - t0 < 6000) { avisos.add((await estado(f1[0])).aviso); await sleep(100); } // NOSONAR: sondeo del aviso
  const e = await estado(f1[0]);
  ok('respaldo sin Realtime: aviso «Sin conexión en vivo»', [...avisos].some(a => /Sin conexión en vivo/.test(a)), [...avisos].join(' | ').slice(0, 160));
  ok('respaldo sin Realtime: tú + 1 fantasma, sin personas remotas', e.vivo === null && e.remotos.length === 0 && e.karts === 2, JSON.stringify({ karts: e.karts, remotos: e.remotos.length }));
  ok('respaldo: el fantasma usa un personaje que no eligió ninguna persona', e.personaje === 'yahui' && e.personajes.length === 2 && !['yahui', 'xalli'].includes(e.personajes[1 - e.yoIndice]), e.personajes.join());
  await sin[0].screenshot({ path: 'karts-vivo-respaldo.png' });
  for (const p of sin) await p.context().close();
  // Canal que no conecta: a los 5 s el mismo aviso.
  const mudos = [await jugador(b, 'fernando@example.com', relevo, VERTICAL, { noConecta: true }), await jugador(b, 'jesus@example.com', relevo, VERTICAL, { noConecta: true })];
  const c2 = await crearSala(mudos[0], 'volcan');
  await unirse(mudos[1], c2); await sleep(1500);
  await mudos[0].click('[data-p="empezar"]');
  const f2 = await enCarrera(mudos);
  const av2 = new Set(), t1 = Date.now();
  while (Date.now() - t1 < 9000) { av2.add((await estado(f2[0])).aviso); await sleep(100); } // NOSONAR: sondeo del aviso
  ok('canal que no conecta en 5 s: aviso de respaldo', [...av2].some(a => /Sin conexión en vivo/.test(a)), [...av2].join(' | ').slice(0, 160));
  ok('canal que no conecta: nadie remoto a la vista', (await estado(f2[0])).remotos.every(r => !r.visible));
  for (const p of mudos) await p.context().close();
}

(async () => {
  const relevo = await levantarRelevo();
  const b = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--disable-renderer-backgrounding', '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows'] });
  const { pags, frames, lista, correos } = await salaDe8(b, relevo);
  const r = await revisarVivo(pags, frames, relevo, lista);
  await terminarTodos(pags, frames);
  for (const p of pags) await p.context().close();
  const fps = await fpsAislado(b, relevo, correos);
  await desconexion(b, relevo);
  await personajesEnSala(b, relevo); // personaje-en-salas
  await respaldo(b, relevo);
  await b.close(); await relevo.cerrar();
  console.log(out.join('\n'));
  console.log('RESUMEN fps(8 en vivo) libre=' + fps.libre + ' CPU×4=' + fps.lento + ' mensajes/s(sala de 8)=' + r.porSeg.toFixed(1));
  process.exit(out.some(x => x.startsWith('FAIL')) ? 1 : 0);
})().catch(e => { console.log(out.join('\n')); console.error('ERROR', e.message.slice(0, 600)); process.exit(2); });
