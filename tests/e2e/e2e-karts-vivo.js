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
async function fpsAislado(b, relevo, correos, mapa = 'pradera') {
  const m = await jugador(b, correos[0], relevo);
  const codigo = await crearSala(m, mapa); // karts-copa-espacio: también en la Nebulosa Esmeralda (la más cargada)
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
  await m.screenshot({ path: mapa === 'pradera' ? 'karts-vivo-390-cpu4.png' : 'karts-vivo-' + mapa + '-390-cpu4.png' });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  clearInterval(iv);
  const visibles = e.remotos.filter(r => r.visible).length, en = mapa === 'pradera' ? '' : ' (' + mapa + ')';
  if (mapa !== 'pradera') ok('sala en una pista espacial: el servidor la acepta y todos corren en ' + mapa, e.pista === mapa && e.espacio, JSON.stringify({ pista: e.pista }));
  ok('fps sin límite con 8 karts en vivo ≥ 55' + en, libre >= 55, 'fps=' + libre);
  ok('fps con CPU ×4 y 8 karts en vivo ≥ 55 (meta 60)' + en, lento >= 55 && visibles === 7, 'fps=' + lento + ' visibles=' + visibles);
  await m.context().close();
  return { libre, lento };
}

async function desconexion(b, relevo) {
  const pags = [];
  for (const email of ['marisol@example.com', 'angel@example.com', 'laura@example.com']) pags.push(await jugador(b, email, relevo)); // NOSONAR: en orden
  // Sala en una pista mesoamericana (las 8 pistas se ofrecen en sala desde juegos-en-vivo).
  await pags[0].click('[data-tab="partidas"]'); await pags[0].waitForSelector('#f-crear'); await pags[0].selectOption('#p-juego', 'karts');
  const opciones = (await pags[0].$$eval('#p-mapa option', os => os.map(o => o.value))).filter(Boolean);
  // karts-copa-espacio: todas las pistas de sala (las 8 de antes y las espaciales; la lista sale de las definiciones).
  ok('salas: el selector ofrece todas las pistas de sala (también las espaciales)', opciones.length >= 12 && ['chichen', 'orbital', 'nebulosa'].every(id => opciones.includes(id)), opciones.join(','));
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

// karts-copa-en-sala: sala de Copa Fiesta con 2 personas en vivo (+ 1 bot): las 4 carreras seguidas, tabla entre
// carreras con cuenta regresiva, la siguiente arranca sola, el canal en vivo sigue toda la copa y el podio final con
// suspenso y revancha. Cada quien llega a la meta con __karts.adelantar() pasado el mínimo de la pista (≈ 30–33 s).
// karts-copa-espacio: copa completa del espacio en sala: el servidor la acepta con las 4 pistas espaciales en orden y la
// carrera 1 es en la Estación Orbital para todas las personas.
async function copaEspacioEnSala(b, relevo) {
  const pags = [];
  for (const email of ['marisol@example.com', 'angel@example.com']) pags.push(await jugador(b, email, relevo)); // NOSONAR: en orden
  const [host] = pags;
  await host.click('[data-tab="partidas"]'); await host.waitForSelector('#f-crear');
  await host.selectOption('#p-juego', 'karts'); await host.selectOption('#p-kformato', 'copa:espacio');
  await host.click('#f-crear button[type=submit]'); await host.waitForSelector('[data-p="empezar"]', { timeout: 30000 });
  const codigo = (await host.textContent('.letra')).trim();
  await unirse(pags[1], codigo);
  await sleep(1500);
  await host.click('[data-p="empezar"]');
  const frames = await enCarrera(pags);
  const copa = (await (await fetch(API + '/juegos/sala/' + codigo + '?email=marisol%40example.com')).json()).copa;
  ok('copa del espacio en sala: el servidor la arma con las 4 pistas espaciales en orden', copa && copa.nombre === 'Copa del Espacio' && copa.pistas.join(',') === 'orbital,anillos,cinturon,nebulosa', JSON.stringify(copa && { nombre: copa.nombre, pistas: copa.pistas }));
  const es = await Promise.all(frames.map(estado));
  ok('copa del espacio en sala: la carrera 1 es en la Estación Orbital para las 2 personas', es.every(e => e.pista === 'orbital' && e.copa === 0), es.map(e => e.pista + ':' + e.copa).join(','));
  await sleep(6000); await host.screenshot({ path: 'karts-vivo-copa-espacio.png' });
  for (const p of pags) await p.context().close();
}
async function copaEnSala(b, relevo) {
  const pags = [];
  for (const email of ['marisol@example.com', 'angel@example.com']) pags.push(await jugador(b, email, relevo)); // NOSONAR: en orden
  const [host] = pags;
  await host.click('[data-tab="partidas"]'); await host.waitForSelector('#f-crear');
  await host.selectOption('#p-juego', 'karts');
  // karts-copa-espacio: copas en orden de dificultad (sin lista fija): Fiesta, Mesoamericana, …, Espacio y la mixta.
  const formatos = (await host.$$eval('#p-kformato option', os => os.map(o => o.value))).join(',');
  ok('copa: el formulario ofrece «Una carrera» y las copas completas en orden de dificultad', formatos.startsWith('carrera,copa:fiesta,copa:mesoamerica,') && formatos.endsWith(',copa:espacio,copa:mixta'), formatos);
  await host.selectOption('#p-kformato', 'copa:fiesta');
  ok('copa: al elegir una copa se oculta el selector de pista', await host.isHidden('#p-mapa-wrap'));
  await host.screenshot({ path: 'karts-copa-crear.png', fullPage: true });
  await host.click('#f-crear button[type=submit]'); await host.waitForSelector('[data-p="empezar"]', { timeout: 30000 });
  const codigo = (await host.textContent('.letra')).trim();
  await unirse(pags[1], codigo);
  await sleep(1500);
  await host.click('[data-p="empezar"]');
  const frames = await enCarrera(pags);
  const vista = async () => (await (await fetch(API + '/juegos/sala/' + codigo + '?email=marisol%40example.com')).json()).copa;
  const PISTAS = ['pradera', 'desierto', 'hielo', 'volcan'];
  for (let k = 0; k < 4; k++) {
    await Promise.all(frames.map(fr => fr.waitForFunction(k => { const e = window.__karts.estado(); return e.copa === k && e.modo === 'carrera' && e.tiempo > 500; }, k, { timeout: 60000 })));
    const es = await Promise.all(frames.map(estado));
    ok('copa: carrera ' + (k + 1) + ' de 4 en ' + PISTAS[k] + ' para los 2, con el otro en vivo y el bot fantasma', es.every(e => e.pista === PISTAS[k] && e.karts === 3 && e.remotos.length === 1), es.map(e => e.pista + ':' + e.karts + ':' + e.remotos.length).join(','));
    if (k === 1) ok('copa: el canal en vivo sigue en la carrera 2', es.every(e => e.vivo && e.vivo.estado === 'vivo'), es.map(e => e.vivo && e.vivo.estado).join(','));
    await Promise.all(frames.map(fr => fr.evaluate(() => window.__karts.piloto(true))));
    await Promise.all(frames.map(fr => fr.waitForFunction(() => window.__karts.estado().tiempo > 34000, null, { timeout: 60000 })));
    await frames[0].evaluate(() => window.__karts.adelantar());
    await sleep(1500);
    await frames[1].evaluate(() => window.__karts.adelantar());
    if (k < 3) {
      // Entre carreras: la tabla con la cuenta regresiva en los 2 aparatos; la siguiente arranca sola.
      await Promise.all(frames.map(fr => fr.waitForFunction(() => { const e = window.__karts.estado(); return e.copaVisible && /Empieza en|Siguiente carrera en/.test(e.copaTexto); }, null, { timeout: 30000 })));
      const t = await estado(frames[0]);
      ok('copa: tabla entre carreras ' + (k + 1) + '→' + (k + 2) + ' con puntos y cuenta regresiva', /Copa/.test(t.copaTexto) && /BOT-/.test(t.copaTexto) && /Tú|Marisol/.test(t.copaTexto), t.copaTexto.slice(0, 160));
      if (k === 0) { await pags[0].screenshot({ path: 'karts-copa-tabla-390.png' }); await pags[1].setViewportSize(HORIZONTAL); await sleep(800); await pags[1].screenshot({ path: 'karts-copa-tabla-844x390.png' }); await pags[1].setViewportSize(VERTICAL); }
      const v = await vista();
      ok('copa: el servidor marca la tabla entre carreras y la carrera ' + (k + 2), v && v.fase === 'interpodio' && v.carrera === k + 1 && v.resultados.length === k + 1, JSON.stringify(v && { fase: v.fase, carrera: v.carrera }));
    }
  }
  // Podio final con suspenso, la tabla de la copa y la revancha.
  await Promise.all(pags.map(p => p.waitForSelector('#p-body .result', { timeout: 60000 })));
  await sleep(2500);
  const txt = await host.textContent('#p-body');
  ok('copa: podio final de la Copa Fiesta con la tabla de las 4 carreras', /Copa Fiesta/.test(txt) && /Puntos de la copa/.test(txt) && (await host.$$('.copa-tabla tbody tr')).length === 3, txt.slice(0, 160));
  ok('copa: revancha en el podio', await host.isVisible('[data-p="revancha"]'));
  const v = await vista();
  ok('copa: el servidor cierra la copa con 3 en la tabla', v && v.fase === 'final' && v.tabla.length === 3 && v.tabla.every(t => t.porCarrera.length === 4), JSON.stringify(v && v.tabla.map(t => t.nombre + ':' + t.pts)));
  ok('copa: puntos de ranking guardados (tope 2000)', /a tus puntos de partidas|ya estaba guardada/.test(await host.textContent('#p-guardado').catch(() => '')), await host.textContent('#p-guardado').catch(() => ''));
  await host.screenshot({ path: 'karts-copa-podio-390.png', fullPage: true });
  for (const q of pags) await q.context().close();
}

// karts-salida-y-puntos: el profe vio que en la sala los karts salían lejos unos de otros y que, aunque Montecillo cruzó
// la meta primero, a él le dieron más puntos. Causa: cada aparato arrancaba con su propio desfase de reloj (la última
// respuesta del servidor, sin descontar procesamiento ni red; y contaba la salida después de pintar la pista) y su tiempo
// se medía desde SU salida. Aquí, a una persona le llegan las respuestas de GET /juegos/sala 1.5 s tarde (después de la
// primera, como un celular con mala señal): aun así su reloj coincide con el del servidor, arrancan a la misma hora, se
// ven pegados en la parrilla, y quien cruza la meta 0.8 s antes es 1.º del podio con más puntos (los del servidor).
const RETRASO_MS = 1500;
const SALA_GET = /\/juegos\/sala\/[A-Z]{4}(\?|$)/;
// A partir de que se pone `lento.si = true`, las respuestas de GET /juegos/sala le llegan a esta página RETRASO_MS tarde.
async function redLenta(p) {
  const lento = { si: false };
  await p.route(u => SALA_GET.test(u.href), async route => {
    if (!lento.si || route.request().method() !== 'GET') return route.continue();
    const resp = await route.fetch();
    await sleep(RETRASO_MS);
    return route.fulfill({ response: resp });
  });
  return lento;
}
const posYo = e => ({ x: e.yoX, y: e.yoY });
// En CADA pantalla, cuando su reloj de carrera pasa `ms` (con los demás ya a la vista): la mayor distancia entre su
// kart y los de las demás personas tal como los dibuja (una sola lectura, sin desfase entre páginas) y a qué hora del
// aparato arrancó (las páginas comparten el reloj de la máquina: así se compara la salida de cada una).
async function separacionEnPantallas(frames, ms) {
  const n = frames.length - 1;
  const lecturas = await Promise.all(frames.map(fr => fr.waitForFunction(([ms, n]) => {
    const e = window.__karts.estado();
    const listo = e.modo === 'carrera' && e.remotos.length === n && e.remotos.every(r => r.visible) && e.tiempo >= ms;
    if (!listo) return false;
    return { t: e.tiempo, d: Math.round(Math.max(...e.remotos.map(r => Math.hypot(r.x - e.yoX, r.y - e.yoY)))), salidaEn: e.salidaEn, listo: e.listoEn - e.salidaEn };
  }, [ms, n], { timeout: 30000 }).then(h => h.jsonValue()).catch(() => fr.evaluate(() => { const e = window.__karts.estado(); return { fallo: true, modo: e.modo, t: e.tiempo, visibles: e.remotos.map(r => r.visible), salidaEn: e.salidaEn, ahora: Date.now() }; }).catch(() => ({ fallo: true })))));
  const ok2 = lecturas.every(l => !l.fallo);
  const salidas = ok2 ? lecturas.map(l => l.salidaEn) : [];
  return { ok: ok2, max: ok2 ? Math.max(...lecturas.map(l => l.d)) : Infinity, desfaseSalida: ok2 ? Math.max(...salidas) - Math.min(...salidas) : null, lecturas };
}
// Sala de karts en `mapa` con `pags` (la 1.ª la crea); a las páginas de `lentas` les llegan tarde las respuestas.
async function salaConRedLenta(pags, lentas, mapa) {
  const lentos = [];
  for (const k of lentas) lentos.push(await redLenta(pags[k])); // NOSONAR: en orden
  const codigo = await crearSala(pags[0], mapa);
  for (const p of pags.slice(1)) await unirse(p, codigo); // NOSONAR: entran en orden
  await sleep(2500);
  lentos.forEach(l => { l.si = true; });
  await sleep(2500); // ya recibieron respuestas lentas
  await pags[0].click('[data-p="empezar"]');
  const frames = await enCarrera(pags);
  // Servidor y navegador corren en la misma máquina: el desfase verdadero es 0.
  const desfases = await Promise.all(pags.map(p => p.evaluate(() => Math.round(sala.offset))));
  ok('reloj común en ' + mapa + ': el desfase estimado de cada aparato es ≈ 0 (< 100 ms) aunque la red sea lenta', desfases.every(d => Math.abs(d) < 100), desfases.join(','));
  return { codigo, frames };
}
async function salidaYPodio(b, relevo) {
  // 1) Volcán (pista grande): Marisol de pie, Angel de lado con la red lenta.
  const [m, a] = [await jugador(b, 'marisol@example.com', relevo), await jugador(b, 'angel@example.com', relevo, HORIZONTAL)];
  const { codigo, frames } = await salaConRedLenta([m, a], [1], 'volcan');
  await m.screenshot({ path: 'karts-salida-volcan-cuenta-390.png' });
  // Recién arrancan (aceleran solos): cada pantalla ve a la otra persona junto a su kart.
  const parrilla = await separacionEnPantallas(frames, 800);
  await m.screenshot({ path: 'karts-salida-volcan-390.png' });
  await a.screenshot({ path: 'karts-salida-volcan-844x390.png' });
  ok('salida: en la parrilla las 2 personas van en la 1.ª fila, juntas (< 60 px en las dos pantallas)', parrilla.ok && parrilla.max < 60, JSON.stringify(parrilla));
  ok('salida pareja con red lenta: los 2 aparatos arrancan a la misma hora (< 150 ms)', parrilla.ok && parrilla.desfaseSalida < 150, 'desfase=' + parrilla.desfaseSalida + ' ms');
  await Promise.all(frames.map(fr => fr.evaluate(() => window.__karts.piloto(true))));
  await sleep(3000);
  const [vm, va] = await Promise.all(frames.map(estado));
  const visto = vm.remotos[0];
  ok('salida pareja: en la pantalla de Marisol, Angel va donde de verdad va (< 120 px)', visto && distancia(visto, posYo(va)) < 120, JSON.stringify({ visto: visto && { x: visto.x, y: visto.y }, propio: posYo(va) }));
  // Marisol cruza la meta 0.8 s antes que Angel (menos que el 1.5 s de la red lenta).
  await Promise.all(frames.map(fr => fr.waitForFunction(() => window.__karts.estado().tiempo > 36000, null, { timeout: 90000 })));
  await frames[0].evaluate(() => window.__karts.adelantar());
  await frames[0].waitForFunction(() => window.__karts.estado().termino !== null, null, { timeout: 10000 });
  await sleep(800);
  await frames[1].evaluate(() => window.__karts.adelantar());
  await Promise.all([m, a].map(p => p.waitForSelector('#p-body .result', { timeout: 60000 })));
  await Promise.all([m, a].map(p => p.waitForFunction(() => /\+\d+ a tus puntos|ya estaba guardada|No se guardó/.test((document.getElementById('p-guardado') || {}).textContent || ''), null, { timeout: 40000 }).catch(() => {})));
  const vista = await (await fetch(API + '/juegos/sala/' + codigo + '?email=marisol%40example.com')).json();
  const ms = Object.fromEntries(vista.jugadores.map(j => [j.nombre, j.carrera ? j.carrera.ms : null]));
  ok('meta: el tiempo de Marisol (llegó primero) es menor que el de Angel', ms.Marisol !== null && ms.Angel !== null && ms.Marisol < ms.Angel, JSON.stringify(ms));
  const [tm, ta] = await Promise.all([m, a].map(p => p.textContent('#p-body .result')));
  const [gm, ga] = await Promise.all([m, a].map(p => p.textContent('#p-guardado')));
  const pts = t => Number((/\+(\d+)/.exec(t) || [])[1]);
  ok('podio: Marisol 1.ª y Angel 2.º en las dos pantallas', /lugar 1 de 3/.test(tm) && /lugar 2 de 3/.test(ta), tm.slice(0, 80) + ' | ' + ta.slice(0, 80));
  ok('podio: la ganadora recibe más puntos (500 contra 440, del servidor)', pts(gm) === 500 && pts(ga) === 440, gm + ' | ' + ga);
  await sleep(3000); // el podio se revela con suspenso
  await m.screenshot({ path: 'karts-salida-podio-390.png', fullPage: true });
  await a.screenshot({ path: 'karts-salida-podio-844x390.png' });
  for (const p of [m, a]) await p.context().close();
  // 2) Teotihuacan (mesoamericana): 3 personas; Angel y Laura con la red lenta.
  const ps = [await jugador(b, 'marisol@example.com', relevo), await jugador(b, 'angel@example.com', relevo, HORIZONTAL), await jugador(b, 'laura@example.com', relevo)];
  const { frames: f2 } = await salaConRedLenta(ps, [1, 2], 'teotihuacan');
  await ps[0].screenshot({ path: 'karts-salida-teotihuacan-390.png' });
  await ps[1].screenshot({ path: 'karts-salida-teotihuacan-844x390.png' });
  // Casillas de las 3 personas en cada pantalla: pegadas (1.ª fila y 2.ª fila) e iguales en los 3 aparatos (orden de la sala).
  const ids2 = await Promise.all(ps.map(yoDe));
  const es2 = await Promise.all(f2.map(estado));
  const casillas = es2.map((e, k) => Object.fromEntries(e.casillas.map(c => [c.id || ids2[k], c.x + ',' + c.y])));
  const pares = cs => { const v = Object.values(cs).map(s => s.split(',').map(Number)); let m = 0; for (const a of v) for (const b of v) m = Math.max(m, Math.hypot(a[0] - b[0], a[1] - b[1])); return Math.round(m); };
  ok('salida de 3 en Teotihuacan: las 3 casillas pegadas (< 80 px entre cualquier par) en cada pantalla', es2.every(e => e.pista === 'teotihuacan') && casillas.every(cs => Object.keys(cs).length === 3 && pares(cs) < 80), JSON.stringify(casillas));
  ok('salida de 3: cada persona sale de la misma casilla en las 3 pantallas', ids2.every(id => casillas.every(cs => cs[id] === casillas[0][id])), JSON.stringify(casillas[0]));
  const p2 = await separacionEnPantallas(f2, 800);
  ok('salida de 3 con red lenta: arrancan a la misma hora (< 150 ms)', p2.ok && p2.desfaseSalida < 150, 'desfase=' + p2.desfaseSalida + ' ms');
  out.push('INFO salida de 3: distancia en pantalla al poder leerla (quien abre la pista tarde sale de su casilla tarde) ' + JSON.stringify(p2.lecturas));
  for (const p of ps) await p.context().close();
}

(async () => {
  const relevo = await levantarRelevo();
  const b = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--disable-renderer-backgrounding', '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows'] });
  if (process.env.KARTS_VIVO_SOLO === 'salida') { // karts-salida-y-puntos: solo esta parte (para iterar)
    await salidaYPodio(b, relevo);
    await b.close(); await relevo.cerrar();
    console.log(out.join('\n'));
    process.exit(out.some(x => x.startsWith('FAIL')) ? 1 : 0);
  }
  const { pags, frames, lista, correos } = await salaDe8(b, relevo);
  const r = await revisarVivo(pags, frames, relevo, lista);
  await terminarTodos(pags, frames);
  for (const p of pags) await p.context().close();
  const fps = await fpsAislado(b, relevo, correos);
  const fpsEspacio = await fpsAislado(b, relevo, correos, 'nebulosa'); // karts-copa-espacio
  await copaEspacioEnSala(b, relevo); // karts-copa-espacio
  await desconexion(b, relevo);
  await personajesEnSala(b, relevo); // personaje-en-salas
  await respaldo(b, relevo);
  await copaEnSala(b, relevo); // karts-copa-en-sala
  await salidaYPodio(b, relevo); // karts-salida-y-puntos
  await b.close(); await relevo.cerrar();
  console.log(out.join('\n'));
  console.log('RESUMEN fps(8 en vivo) libre=' + fps.libre + ' CPU×4=' + fps.lento + ' mensajes/s(sala de 8)=' + r.porSeg.toFixed(1));
  console.log('RESUMEN fps(8 en vivo, Nebulosa Esmeralda) libre=' + fpsEspacio.libre + ' CPU×4=' + fpsEspacio.lento);
  process.exit(out.some(x => x.startsWith('FAIL')) ? 1 : 0);
})().catch(e => { console.log(out.join('\n')); console.error('ERROR', e.message.slice(0, 600)); process.exit(2); });
