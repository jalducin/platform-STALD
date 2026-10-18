// E2E: puntos de las copas de «Karts Turbo» en el modo individual (sprint 41c, reporte del profe: «en la copa Reinos
// Antiguos no suma puntos y gané en la primera carrera»). Para CADA una de las 4 copas (Fiesta, Mesoamericana, Reinos
// Antiguos y Espacio), dentro de Juegos (?arcadePrueba=1):
// - empieza la copa (con los podios que pide guardados en el servidor);
// - gana la carrera 1: el piloto de prueba (__karts.piloto + __karts.rapido) maneja la vuelta 1 completa (mecánicas,
//   muros y tramos interiores de verdad) y al empezar la vuelta 2 __karts.adelantar lo deja al final de la última para
//   asegurar el 1.er lugar; con KARTS_PUNTOS_RAPIDO=1 solo adelanta (cruza la meta en un momento) para iterar rápido;
// - la tabla de resultados muestra +15 y 15 en la columna «Copa» de tu fila;
// - las llamadas al servidor (PUT /juegos/progreso/karts y POST /juegos/partida) responden bien (page.on('response'));
// - el progreso del servidor tiene la copa en curso en la carrera 2 con tus 15 puntos;
// - al recargar sigue: «Continuar <copa> · Carrera 2 de 4» y los 15 puntos en el progreso que recibe el juego;
// - la carrera 2 suma sobre esos 15 (la columna «Copa» de tu fila es 15 + los puntos de tu lugar).
// Copa en sala de Reinos Antiguos y del Espacio (2 personas + 1 bot): el reporte de la carrera 1 responde 200 y la tabla
// del servidor y la del juego dan 15 a quien gana (KARTS_PUNTOS_SALA=0 la salta).
// KARTS_SOLO=<copa> corre solo esa copa (fiesta, mesoamerica, reinos o espacio).
require('./lib/entorno'); // BASE, API, CHROME, carpeta de salida y sesión de prueba en fetch
const { chromium } = require('playwright');
const { abrirPagina } = require('./lib/navegador');
const { abrirJuego } = require('./lib/menu');
const API = process.env.API;
const out = []; const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const EMAIL = 'angel@example.com';
const RAPIDO = process.env.KARTS_PUNTOS_RAPIDO === '1';
const REAL = process.env.KARTS_PUNTOS_REAL === '1';
const PUNTOS_COPA = [15, 12, 10, 8, 6, 4, 2, 1];
const SLOT_YO = 5; // karts.html: tu lugar en la parrilla y en copaEnCurso.puntos
const urlProgreso = API + '/juegos/progreso/karts?email=' + encodeURIComponent(EMAIL);
const progreso = async () => (await fetch(urlProgreso)).json();
const abrir = b => abrirPagina(b, { email: EMAIL, viejo: true, out, ruta: '/juegos.html?arcadePrueba=1', esperar: '[data-menu]' });
const marcoDe = async p => (await p.waitForSelector('#arcade-frame', { timeout: 30000 })).contentFrame();
const estado = fr => fr.evaluate(() => window.__karts.estado());

const COPAS = [
  { id: 'fiesta', nombre: 'Copa Fiesta', ir: 'copa-nueva', pistas: ['pradera', 'desierto'], copas: {} },
  { id: 'mesoamerica', nombre: 'Copa Mesoamericana', ir: 'copa-nueva:mesoamerica', pistas: ['laventa', 'teotihuacan'], copas: {} },
  { id: 'reinos', nombre: 'Copa Reinos Antiguos', ir: 'copa-nueva:reinos', pistas: ['giza', 'castillo'], copas: { fiesta: { lugar: 1, puntos: 54 } } },
  { id: 'espacio', nombre: 'Copa del Espacio', ir: 'copa-nueva:espacio', pistas: ['orbital', 'anillos'], copas: { fiesta: { lugar: 1, puntos: 54 }, mesoamerica: { lugar: 2, puntos: 41 } } },
];

// Escucha las respuestas del servidor que tocan karts: PUT del progreso y POST de la partida.
function escuchar(p) {
  const r = { puts: [], partidas: [] };
  p.on('response', async res => {
    const u = res.url(), m = res.request().method();
    const es = (m === 'PUT' && u.includes('/juegos/progreso/karts')) ? 'puts' : (m === 'POST' && /\/juegos\/partida(\?|$)/.test(u) ? 'partidas' : null);
    if (!es) return;
    let body = null; try { body = await res.json(); } catch { body = null; }
    let pedido = null; try { pedido = JSON.parse(res.request().postData() || 'null'); } catch { pedido = null; }
    r[es].push({ status: res.status(), body, pedido });
  });
  return r;
}
// Progreso de partida para la copa: los podios que la abren y nada en curso (récords limpios de la versión 3).
async function prepararProgreso(c) {
  const g = await progreso();
  const datos = { copas: c.copas, records: {}, piezas: [], equipo: { chasis: 'estandar', llantas: 'estandar', color: 'azul' }, copaEnCurso: null, pistasV: 3, recordsV1: {}, recordsV2: {} };
  const put = await fetch(urlProgreso, { method: 'PUT', body: JSON.stringify({ v: g.v, datos }) });
  ok(c.id + ': progreso inicial guardado (podios para abrir la copa)', put.ok, String(put.status) + ' ' + await put.text());
}
// Gana la carrera en curso: el piloto de prueba la corre completa (o adelantar en modo rápido) y espera los resultados.
async function ganarCarrera(fr, pista) {
  await fr.waitForFunction(() => window.__karts.estado().modo === 'carrera', null, { timeout: 30000 });
  const e0 = await estado(fr);
  ok(pista + ': la carrera es en la pista esperada', e0.pista === pista, e0.pista);
  if (RAPIDO) {
    await sleep(3800); // cuenta regresiva
    await fr.evaluate(() => window.__karts.adelantar());
  } else if (REAL) {
    // KARTS_PUNTOS_REAL=1: el piloto de prueba corre las 2 vueltas a velocidad normal, sin ganchos de tiempo (≈ 2–3 min
    // por carrera), como una persona. No siempre gana: se revisa que los puntos de su lugar se muestren y se guarden.
    await fr.evaluate(() => window.__karts.piloto(true));
  } else {
    // El piloto de prueba maneja la vuelta 1 completa (mecánicas, muros y tramos interiores de verdad). Con rapido(8)
    // los bots también corren 8 pasos por cuadro, así que el piloto no siempre gana: al empezar la vuelta 2 se adelanta
    // al final de la última vuelta para cruzar la meta en 1.er lugar.
    await fr.evaluate(() => { window.__karts.piloto(true); window.__karts.rapido(8); });
    await fr.waitForFunction(() => window.__karts.estado().vuelta >= 1, null, { timeout: 180000 });
    await fr.evaluate(() => window.__karts.adelantar());
  }
  await fr.waitForSelector('#ov-res:not(.hide)', { timeout: RAPIDO ? 20000 : 480000 });
  await fr.evaluate(() => { window.__karts.piloto(false); window.__karts.rapido(1); });
  const e = await estado(fr);
  return e;
}
// Tu fila en la tabla de resultados: lugar, +Pts y Copa.
const filaYo = fr => fr.evaluate(() => {
  const tr = document.querySelector('#res-tabla tr.yo');
  if (!tr) return null;
  const td = [...tr.querySelectorAll('td')].map(x => x.textContent.trim());
  return { lugar: Number(td[0]), mas: td[3] || null, copa: td[4] || null, celdas: td };
});
const esperarPuntosGuardados = fr => fr.waitForFunction(() => /individuales|No se guardaron/.test(document.getElementById('res-guardado').textContent), null, { timeout: 20000 }).catch(() => {});
async function esperarCopaEnServidor(copa, carrera) {
  let d = null;
  for (let i = 0; i < 30; i++) { // NOSONAR: sondeo en orden
    d = (await progreso()).datos;
    if (d && d.copaEnCurso && d.copaEnCurso.copa === copa && d.copaEnCurso.carrera === carrera) break;
    await sleep(400);
  }
  return d;
}

async function probarCopa(b, c) {
  await prepararProgreso(c);
  const p = await abrir(b);
  const resp = escuchar(p);
  await abrirJuego(p, 'karts');
  let fr = await marcoDe(p);
  await fr.waitForSelector('#ov-menu:not(.hide)', { timeout: 30000 });
  ok(c.id + ': la copa está abierta en el menú', await fr.isEnabled('[data-ir="' + c.ir + '"]'));
  await fr.click('[data-ir="' + c.ir + '"]');
  const t0 = Date.now();
  const e = await ganarCarrera(fr, c.pistas[0]);
  const fila = await filaYo(fr);
  const info = JSON.stringify({ pos: e.pos, termino: e.termino, fila, bots: e.bots, seg: Math.round((Date.now() - t0) / 1000) });
  if (REAL) out.push('INFO ' + c.id + ': carrera completa a velocidad normal ' + info);
  else ok(c.id + ': ganaste la carrera 1 (1.er lugar)', e.pos === 1 && fila && fila.lugar === 1, info);
  // Puntos de tu lugar (15 al ganar; en KARTS_PUNTOS_REAL, los del lugar en que llegó el piloto).
  const pts = fila && fila.lugar >= 1 ? PUNTOS_COPA[fila.lugar - 1] : -1;
  ok(c.id + ': ' + (REAL ? 'tu fila llegó a la meta' : 'llegaste a la meta') + ' (tiempo propio, no estimado)', e.termino !== null && fila && !fila.celdas[2].startsWith('~'), info);
  ok(c.id + ': la tabla de resultados muestra +' + pts + ' y ' + pts + ' de copa en tu fila', fila && fila.mas === '+' + pts && fila.copa === String(pts), JSON.stringify(fila));
  ok(c.id + ': el juego lleva ' + pts + ' puntos en la copa en curso (carrera 2)', e.prog.copaEnCurso && e.prog.copaEnCurso.copa === c.id && e.prog.copaEnCurso.carrera === 1 && e.prog.copaEnCurso.puntos[SLOT_YO] === pts, JSON.stringify(e.prog.copaEnCurso));
  await esperarPuntosGuardados(fr);
  ok(c.id + ': mensaje de puntos guardados en ⭐ individuales', /a tus ⭐ individuales/.test(await fr.textContent('#res-guardado')), await fr.textContent('#res-guardado'));
  const d = await esperarCopaEnServidor(c.id, 1);
  await sleep(500);
  // Respuestas del servidor.
  const putsMal = resp.puts.filter(x => x.status !== 200);
  ok(c.id + ': cada PUT /juegos/progreso/karts responde 200', resp.puts.length > 0 && putsMal.length === 0, JSON.stringify({ n: resp.puts.length, mal: putsMal.map(x => ({ status: x.status, body: x.body, datos: x.pedido && x.pedido.datos })) }));
  const conCopa = resp.puts.filter(x => x.pedido && x.pedido.datos && x.pedido.datos.copaEnCurso && x.pedido.datos.copaEnCurso.carrera === 1);
  ok(c.id + ': se mandó al servidor la copa en curso con tus ' + pts + ' puntos', conCopa.some(x => x.status === 200 && x.pedido.datos.copaEnCurso.puntos[SLOT_YO] === pts), JSON.stringify(conCopa.map(x => ({ status: x.status, body: x.body, cc: x.pedido.datos.copaEnCurso }))));
  const partida = resp.partidas[0];
  ok(c.id + ': POST /juegos/partida responde guardado', resp.partidas.length === 1 && partida.status === 200 && partida.body && partida.body.guardado === true && partida.body.puntos > 0, JSON.stringify(resp.partidas));
  ok(c.id + ': el progreso del servidor tiene la copa en curso (carrera 2) con tus ' + pts + ' puntos', d && d.copaEnCurso && d.copaEnCurso.copa === c.id && d.copaEnCurso.carrera === 1 && d.copaEnCurso.puntos[SLOT_YO] === pts && d.copaEnCurso.puntos.reduce((a, x) => a + x, 0) === 58, JSON.stringify(d && d.copaEnCurso));
  await p.screenshot({ path: 'karts-puntos-' + c.id + '-carrera1.png' });

  // ---- Recargar: la copa y sus puntos siguen ----
  await p.reload(); await p.waitForSelector('[data-menu]', { timeout: 60000 });
  await abrirJuego(p, 'karts');
  fr = await marcoDe(p);
  await fr.waitForSelector('#ov-menu:not(.hide)', { timeout: 30000 });
  const menu = await fr.textContent('#menu-ops');
  ok(c.id + ': tras recargar, «Continuar ' + c.nombre + '» en la carrera 2 de 4', menu.includes('Continuar ' + c.nombre) && menu.includes('Carrera 2 de 4'), menu);
  const e1 = await estado(fr);
  ok(c.id + ': tras recargar, el juego recibe tus ' + pts + ' puntos de la copa', e1.prog.copaEnCurso && e1.prog.copaEnCurso.puntos[SLOT_YO] === pts, JSON.stringify(e1.prog.copaEnCurso));

  // ---- Carrera 2: suma sobre los puntos de la carrera 1 ----
  await fr.click('[data-ir="copa"]');
  await fr.waitForFunction(() => window.__karts.estado().modo === 'carrera', null, { timeout: 30000 });
  ok(c.id + ': la carrera 2 es en ' + c.pistas[1], (await estado(fr)).pista === c.pistas[1]);
  await sleep(3800);
  await fr.evaluate(() => window.__karts.adelantar());
  await fr.waitForSelector('#ov-res:not(.hide)', { timeout: 20000 });
  const f2 = await filaYo(fr);
  const esperado = f2 ? pts + PUNTOS_COPA[f2.lugar - 1] : null;
  ok(c.id + ': en la carrera 2 la columna «Copa» de tu fila suma sobre los ' + pts, f2 && Number(f2.copa) === esperado, JSON.stringify({ f2, esperado }));
  const d2 = await esperarCopaEnServidor(c.id, 2);
  ok(c.id + ': el servidor guarda la carrera 2 con los puntos acumulados', d2 && d2.copaEnCurso && d2.copaEnCurso.carrera === 2 && d2.copaEnCurso.puntos[SLOT_YO] === esperado, JSON.stringify(d2 && d2.copaEnCurso));
  await p.context().close();
}

// ---- Defecto real: una carrera de más de 15 min (reloj de pared: pestaña oculta o atorado) ----
// Se atrasa la salida 16 min (carreraDe.inicioLocal, variable de nivel superior de karts.html) y se adelanta a la meta:
// ganas con 16:0x. El récord pasa de 15 min y hoy el servidor rechaza TODO el progreso (400 progreso_invalido): la copa
// en curso y sus 15 puntos se pierden al recargar. Rojo en origin/main.
async function probarCarreraLarga(b, c) {
  await prepararProgreso(c);
  const p = await abrir(b);
  const resp = escuchar(p);
  await abrirJuego(p, 'karts');
  let fr = await marcoDe(p);
  await fr.waitForSelector('#ov-menu:not(.hide)', { timeout: 30000 });
  await fr.click('[data-ir="' + c.ir + '"]');
  await fr.waitForFunction(() => window.__karts.estado().modo === 'carrera', null, { timeout: 30000 });
  await sleep(3800);
  await fr.evaluate(() => { carreraDe.inicioLocal -= 16 * 60 * 1000; window.__karts.adelantar(); }); // eslint-disable-line no-undef
  await fr.waitForSelector('#ov-res:not(.hide)', { timeout: 20000 });
  const e = await estado(fr), fila = await filaYo(fr);
  ok(c.id + ' larga: ganaste con más de 15 min', e.termino > 900000 && fila && fila.lugar === 1, JSON.stringify({ termino: e.termino, fila }));
  const d = await esperarCopaEnServidor(c.id, 1);
  await sleep(500);
  const mal = resp.puts.filter(x => x.status !== 200);
  ok(c.id + ' larga: cada PUT /juegos/progreso/karts responde 200', resp.puts.length > 0 && mal.length === 0, JSON.stringify(mal.map(x => ({ status: x.status, body: x.body, records: x.pedido && x.pedido.datos && x.pedido.datos.records }))));
  ok(c.id + ' larga: el servidor guarda la copa en curso con tus 15 puntos', d && d.copaEnCurso && d.copaEnCurso.copa === c.id && d.copaEnCurso.carrera === 1 && d.copaEnCurso.puntos[SLOT_YO] === 15, JSON.stringify(d && d.copaEnCurso));
  await p.reload(); await p.waitForSelector('[data-menu]', { timeout: 60000 });
  await abrirJuego(p, 'karts');
  fr = await marcoDe(p);
  await fr.waitForSelector('#ov-menu:not(.hide)', { timeout: 30000 });
  const menu = await fr.textContent('#menu-ops');
  ok(c.id + ' larga: tras recargar, «Continuar ' + c.nombre + '» en la carrera 2 de 4', menu.includes('Continuar ' + c.nombre) && menu.includes('Carrera 2 de 4'), menu.slice(0, 120));
  await p.context().close();
}

// ---- Copa en sala (Reinos Antiguos y Espacio): Marisol y Angel (+ 1 bot) sin canal en vivo (respaldo con fantasmas).
// Los 2 corren con el piloto de prueba y, pasado el mínimo de la pista (25 % de la referencia, ≈ 33–35 s), Marisol
// adelanta a la meta y gana; Angel llega 1.5 s después. El reporte de cada quien (POST /juegos/sala/<código>/respuesta)
// debe responder 200 y la tabla del servidor darle 15 a Marisol en la carrera 1.
const pedirSala = async (codigo, email) => (await fetch(API + '/juegos/sala/' + codigo + '?email=' + encodeURIComponent(email))).json();
function escucharSala(p) {
  const r = [];
  p.on('response', async res => {
    if (res.request().method() !== 'POST' || !/\/juegos\/sala\/[A-Z]{4}\/respuesta/.test(res.url())) return;
    let body = null; try { body = await res.json(); } catch { body = null; }
    let pedido = null; try { pedido = JSON.parse(res.request().postData() || 'null'); } catch { pedido = null; }
    r.push({ status: res.status(), body, pedido });
  });
  return r;
}
async function probarCopaSala(b, copa, pista) {
  const correos = ['marisol@example.com', 'angel@example.com'];
  const pags = [];
  for (const email of correos) pags.push(await abrirPagina(b, { email, viejo: true, out, ruta: '/juegos.html?arcadePrueba=1', esperar: '[data-menu]' })); // NOSONAR: en orden
  const resp = pags.map(escucharSala);
  const [host, otro] = pags;
  await host.click('[data-tab="partidas"]'); await host.waitForSelector('#f-crear');
  await host.selectOption('#p-juego', 'karts'); await host.selectOption('#p-kformato', 'copa:' + copa);
  await host.click('#f-crear button[type=submit]'); await host.waitForSelector('[data-p="empezar"]', { timeout: 30000 });
  const codigo = (await host.textContent('.letra')).trim();
  await otro.click('[data-tab="partidas"]'); await otro.fill('#p-codigo', codigo); await otro.click('#f-unirse button[type=submit]');
  await otro.waitForSelector('#p-body .rank li', { timeout: 30000 });
  await sleep(1500);
  await host.click('[data-p="empezar"]');
  const frames = await Promise.all(pags.map(async p => {
    const fr = await (await p.waitForSelector('#p-body #arcade-frame', { timeout: 60000 })).contentFrame();
    await fr.waitForFunction(() => window.__karts && window.__karts.estado().sala && window.__karts.estado().modo === 'carrera' && window.__karts.estado().copa === 0, null, { timeout: 60000 });
    return fr;
  }));
  const es = await Promise.all(frames.map(estado));
  ok('sala ' + copa + ': la carrera 1 es en ' + pista + ' para los 2', es.every(e => e.pista === pista), es.map(e => e.pista).join(','));
  await Promise.all(frames.map(fr => fr.evaluate(() => window.__karts.piloto(true))));
  await Promise.all(frames.map(fr => fr.waitForFunction(() => window.__karts.estado().tiempo > 37000, null, { timeout: 90000 })));
  await frames[0].evaluate(() => window.__karts.adelantar());
  await sleep(1500);
  await frames[1].evaluate(() => window.__karts.adelantar());
  let v = null;
  for (let i = 0; i < 40; i++) { v = (await pedirSala(codigo, correos[0])).copa; if (v && v.resultados && v.resultados.length >= 1) break; await sleep(500); } // NOSONAR: sondeo en orden
  await sleep(800);
  const reps = resp.map(r => r.filter(x => x.pedido && x.pedido.copa && x.pedido.copa.carrera === 0));
  ok('sala ' + copa + ': el reporte de la carrera 1 responde 200 para los 2', reps.every(r => r.length === 1 && r[0].status === 200), JSON.stringify(reps.map(r => r.map(x => ({ status: x.status, body: x.body, pedido: x.pedido })))));
  const marisol = v && v.tabla.find(t => t.nombre === 'Marisol');
  ok('sala ' + copa + ': la tabla del servidor da 15 a Marisol (1.ª en la carrera 1)', marisol && marisol.pts === 15 && marisol.porCarrera[0] && marisol.porCarrera[0].lugar === 1, JSON.stringify(v && { fase: v.fase, tabla: v.tabla.map(t => ({ n: t.nombre, pts: t.pts, por: t.porCarrera })) }));
  await frames[0].waitForFunction(() => { const e = window.__karts.estado(); return e.copaVisible && /15/.test(e.copaTexto); }, null, { timeout: 30000 }).catch(() => {});
  const t = await estado(frames[0]);
  ok('sala ' + copa + ': la tabla entre carreras del juego muestra los 15 puntos de Marisol', /15/.test(t.copaTexto), t.copaTexto.slice(0, 200));
  await host.screenshot({ path: 'karts-puntos-sala-' + copa + '.png' });
  for (const p of pags) await p.context().close();
}
// ---- Defecto real: tiempo de sala rechazado (carrera_invalida) sin aviso ----
// El reporte de Marisol en la carrera 1 lo rechaza el servidor (se simula con page.route: 400 carrera_invalida, como
// cuando el reloj del aparato no cuadra con el del servidor). Hoy juegos/app/arcade.js no revisa la respuesta: Marisol
// se queda con 0 sin enterarse. La página debe avisarlo (texto con «no se guard», «no cont» o «inválid»). Rojo en main.
async function probarSalaRechazada(b, copa) {
  const correos = ['marisol@example.com', 'angel@example.com'];
  const pags = [];
  for (const email of correos) pags.push(await abrirPagina(b, { email, viejo: true, out, ruta: '/juegos.html?arcadePrueba=1', esperar: '[data-menu]' })); // NOSONAR: en orden
  const [host, otro] = pags;
  let rechazados = 0;
  await host.route(/\/juegos\/sala\/[A-Z]{4}\/respuesta/, async (route) => {
    let d = null; try { d = JSON.parse(route.request().postData() || 'null'); } catch { d = null; }
    if (d && d.copa && d.copa.carrera === 0 && Number.isInteger(d.copa.ms)) { rechazados++; return route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: 'carrera_invalida' }) }); }
    return route.continue();
  });
  await host.click('[data-tab="partidas"]'); await host.waitForSelector('#f-crear');
  await host.selectOption('#p-juego', 'karts'); await host.selectOption('#p-kformato', 'copa:' + copa);
  await host.click('#f-crear button[type=submit]'); await host.waitForSelector('[data-p="empezar"]', { timeout: 30000 });
  const codigo = (await host.textContent('.letra')).trim();
  await otro.click('[data-tab="partidas"]'); await otro.fill('#p-codigo', codigo); await otro.click('#f-unirse button[type=submit]');
  await otro.waitForSelector('#p-body .rank li', { timeout: 30000 });
  await sleep(1500);
  await host.click('[data-p="empezar"]');
  const frames = await Promise.all(pags.map(async p => {
    const fr = await (await p.waitForSelector('#p-body #arcade-frame', { timeout: 60000 })).contentFrame();
    await fr.waitForFunction(() => window.__karts && window.__karts.estado().modo === 'carrera' && window.__karts.estado().copa === 0, null, { timeout: 60000 });
    return fr;
  }));
  await Promise.all(frames.map(fr => fr.evaluate(() => window.__karts.piloto(true))));
  await Promise.all(frames.map(fr => fr.waitForFunction(() => window.__karts.estado().tiempo > 37000, null, { timeout: 90000 })));
  await frames[0].evaluate(() => window.__karts.adelantar());
  await sleep(1500);
  await frames[1].evaluate(() => window.__karts.adelantar());
  await sleep(4000);
  ok('sala ' + copa + ' rechazada: el reporte de Marisol se rechazó (simulado)', rechazados >= 1, String(rechazados));
  const aviso = /no se guard|no cont|inv[aá]lid/i;
  const txtPagina = await host.textContent('body').catch(() => '');
  const txtJuego = (await estado(frames[0])).copaTexto + ' ' + await frames[0].textContent('#aviso').catch(() => '');
  ok('sala ' + copa + ' rechazada: la página o el juego avisa que el tiempo no contó', aviso.test(txtPagina) || aviso.test(txtJuego), JSON.stringify({ juego: txtJuego.slice(0, 200) }));
  await host.screenshot({ path: 'karts-puntos-sala-rechazada-' + copa + '.png' });
  for (const p of pags) await p.context().close();
}

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME });
  const solo = process.env.KARTS_SOLO;
  for (const c of COPAS.filter(x => !solo || x.id === solo)) {
    try { await probarCopa(b, c); } catch (e) { ok(c.id + ': la prueba termina sin excepción', false, e.message.split('\n')[0]); } // NOSONAR: copas en orden (comparten el progreso)
  }
  for (const c of COPAS.filter(x => x.id === 'reinos' && (!solo || x.id === solo))) {
    try { await probarCarreraLarga(b, c); } catch (e) { ok(c.id + ' larga: la prueba termina sin excepción', false, e.message.split('\n')[0]); }
  }
  const salas = [['reinos', 'giza'], ['espacio', 'orbital']].filter(([c]) => !solo || c === solo);
  if (process.env.KARTS_PUNTOS_SALA !== '0') for (const [c, pista] of salas) {
    try { await probarCopaSala(b, c, pista); } catch (e) { ok('sala ' + c + ': la prueba termina sin excepción', false, e.message.split('\n')[0]); } // NOSONAR: en orden
  }
  if (process.env.KARTS_PUNTOS_SALA !== '0' && (!solo || solo === 'reinos')) {
    try { await probarSalaRechazada(b, 'reinos'); } catch (e) { ok('sala reinos rechazada: la prueba termina sin excepción', false, e.message.split('\n')[0]); }
  }
  await b.close();
  console.log(out.join('\n'));
  process.exit(out.some(x => x.startsWith('FAIL')) ? 1 : 0);
})();
