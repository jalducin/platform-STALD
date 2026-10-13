// E2E: «⚽ Fútbol Estelar 2010» en línea 1 vs 1 (openspec: futbol-en-linea).
// Dos contextos de navegador (anfitriona Marisol a 390×844 e invitado Angel a 844×390, con toques) unidos por un canal
// en vivo simulado: `juegos/en-vivo.js` se sirve con un puente que reenvía los mensajes entre contextos desde Node con
// latencia (80 ms), pérdida y desorden, y la sala recibe un `rt` de prueba (el servidor de pruebas no tiene Supabase).
// Cubre: crear la sala 1 vs 1 sin bots, unirse, táctica en la sala de espera (guardada en el asiento y usada en el
// partido), gol del invitado (su entrada viaja al anfitrión) visto por los dos y gol de la anfitriona visto por el
// invitado, latencia en pantalla, desconexión y regreso (la IA toma y devuelve al equipo), final con el resultado
// confirmado en el servidor y podio en los dos; cierre a los 15 s cuando el anfitrión se cae; y el respaldo sin canal
// (mensaje y Clasificatoria semanal). Capturas a 390×844 y 844×390.
require('./lib/entorno');
const { chromium } = require('playwright');
const { abrirPagina } = require('./lib/navegador');
const API = process.env.API;
const out = []; const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const TACTIL = { hasTouch: true, isMobile: true };

// ---- Canal en vivo simulado entre contextos (misma API que EnVivo.conectar) ----
const red = { latencia: 80, perdida: 0.03, desorden: 0.1 };
const marcos = new Map(); // `${topic}|${id}` → frame
const PUENTE_JS = `(function () {
  'use strict';
  window.EnVivo = {
    conectar(o) {
      return new Promise((ok, mal) => {
        if (window.__puenteFalla) { setTimeout(() => mal(new Error('sin_conexion')), 300); return; }
        const yo = o.yo.id, part = new Set(o.participantes), oy = {}, caidas = [], ultimo = {}, avisado = {}, lat = {}, vistos = {};
        let seq = 0;
        window.__puenteRecibir = m => {
          if (m.topic !== o.topic || !part.has(m.de) || m.de === yo) return;
          const k = m.de + '|' + m.evento;
          if (m.seq <= (vistos[k] || 0)) return;
          vistos[k] = m.seq; ultimo[m.de] = Date.now(); avisado[m.de] = false; lat[m.de] = m.latencia;
          (oy[m.evento] || []).forEach(fn => fn(m.datos, { de: m.de, seq: m.seq, t: m.t, latencia: m.latencia }));
        };
        setInterval(() => { for (const id of part) if (id !== yo && ultimo[id] !== undefined && !avisado[id] && Date.now() - ultimo[id] > 3000) { avisado[id] = true; caidas.forEach(fn => fn(id)); } }, 250);
        window.__puenteEnviar({ tipo: 'conectar', topic: o.topic, id: yo }).then(() => ok({
          enviar(evento, datos) { if (window.__puenteMudo) return; seq++; window.__puenteEnviar({ tipo: 'msg', topic: o.topic, de: yo, evento, datos, seq, t: Date.now() }); },
          al(evento, fn) { (oy[evento] = oy[evento] || []).push(fn); },
          presencia: () => [yo].concat([...part].filter(id => id !== yo && ultimo[id] && Date.now() - ultimo[id] < 3000)),
          alCambiarPresencia() {},
          latencia: id => (lat[id] === undefined ? null : lat[id]),
          alDesconectar(fn) { caidas.push(fn); },
          cerrar() { window.__puenteEnviar({ tipo: 'cerrar', topic: o.topic, id: yo }); },
        }));
      });
    },
  };
})();`;
async function conPuente(ctx, sinCanal) {
  await ctx.exposeBinding('__puenteEnviar', (src, m) => {
    if (m.tipo === 'conectar') { marcos.set(m.topic + '|' + m.id, src.frame); return true; }
    if (m.tipo === 'cerrar') { marcos.delete(m.topic + '|' + m.id); return true; }
    for (const [k, fr] of marcos) {
      const i = k.lastIndexOf('|'), topic = k.slice(0, i), id = k.slice(i + 1);
      if (topic !== m.topic || id === m.de || Math.random() < red.perdida) continue;
      const lat = red.latencia + (Math.random() < red.desorden ? Math.random() * red.latencia : 0);
      setTimeout(() => fr.evaluate(x => window.__puenteRecibir && window.__puenteRecibir(x), { ...m, latencia: Math.round(lat) }).catch(() => {}), lat);
    }
    return true;
  });
  await ctx.route(/\/juegos\/en-vivo\.js/, r => r.fulfill({ contentType: 'application/javascript', body: PUENTE_JS }));
  await ctx.route(/supabase\.js/, r => r.abort());
  await ctx.route(/\/juegos\/sala\/[A-Z]{4}(\?|$)/, async r => {
    if (r.request().method() !== 'GET') return r.continue();
    const res = await r.fetch(), j = await res.json();
    if (!sinCanal && j.sala) j.rt = { url: 'http://127.0.0.1:9', key: 'prueba', topic: 'sala-e2e-' + j.sala.codigo };
    return r.fulfill({ response: res, json: j });
  });
}
const abrir = async (b, email, viewport, init) => {
  const p = await abrirPagina(b, { email, viejo: true, viewport, contexto: TACTIL, out, etiqueta: email, dialogos: 'aceptar', init });
  await conPuente(p.context(), false);
  await p.goto(require('./lib/navegador').urlDe('/juegos.html?arcadePrueba=1'));
  await p.waitForSelector('[data-menu]', { timeout: 60000 });
  return p;
};
const marcoDe = async p => (await p.waitForSelector('#p-body #arcade-frame', { timeout: 30000 })).contentFrame();
const esperar = (fr, fn, arg, ms = 30000) => fr.waitForFunction(fn, arg, { timeout: ms });
const estado = fr => fr.evaluate(() => window.__futbol.estado());
const sala = async (codigo, quien) => (await fetch(API + '/juegos/sala/' + codigo + '?email=' + encodeURIComponent(quien))).json();

async function crearSala(p, a) {
  await p.click('[data-tab="partidas"]'); await p.waitForSelector('#f-crear');
  await p.selectOption('#p-juego', 'futbol');
  const nota = await p.textContent('#p-bots-nota');
  await p.click('#f-crear button[type=submit]'); await p.waitForSelector('[data-p="empezar"]', { timeout: 30000 });
  const codigo = (await p.textContent('#p-codigo-chip')).replace(/[^A-Z]/g, '');
  await a.click('[data-tab="partidas"]'); await a.waitForSelector('#f-unirse');
  await a.fill('#p-codigo', codigo); await a.click('#f-unirse button[type=submit]');
  await p.waitForFunction(() => /· 2 personas/.test((document.getElementById('p-mesa') || {}).textContent || ''), null, { timeout: 30000 });
  return { codigo, nota };
}
// Botón presionado por una fuente extra de FutbolEntrada (la entrada viaja como cualquier otra).
const fuente = fr => fr.evaluate(() => { window.__boton = null; window.FutbolEntrada.registrar({ presionado: a => window.__boton === a, eje: () => ({ x: 0, y: 0 }) }); });
async function tiroDe(fr, ms) { await fr.evaluate(() => { window.__boton = 'tiro'; }); await sleep(ms); await fr.evaluate(() => { window.__boton = null; }); }

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME });
  const p = await abrir(b, 'marisol@example.com', { width: 390, height: 844 });
  const a = await abrir(b, 'angel@example.com', { width: 844, height: 390 });
  p.on('pageerror', e => console.error('PILA', (e.stack || '').slice(0, 600)));

  // ---- Sala 1 vs 1 y táctica en la sala de espera ----
  const { codigo, nota } = await crearSala(p, a);
  ok('crear: Fútbol Estelar sin casilla de bots y con la nota de 1 vs 1 en vivo', /1 vs 1 en vivo/.test(nota) && !(await p.isVisible('#p-bots-wrap')), nota);
  ok('sala: «Hasta 2 personas · 2 personas»', /Hasta 2 personas · 2 personas/.test(await p.textContent('#p-mesa')));
  await a.waitForSelector('#p-tactica-fut', { timeout: 30000 });
  await a.click('[data-p="fut-form"][data-form="4-3-3"]');
  await a.$eval('[data-futtac="presion"]', el => { el.value = '80'; el.dispatchEvent(new Event('change', { bubbles: true })); });
  await a.waitForFunction(() => /guardada/.test(document.getElementById('p-tactica-msg').textContent), null, { timeout: 15000 });
  const asiento = (await sala(codigo, 'angel@example.com')).jugadores.find(j => j.nombre === 'Angel');
  ok('táctica: el asiento de Angel guarda 4-3-3 y presión 80', asiento && asiento.tactica && asiento.tactica.formacion === '4-3-3' && asiento.tactica.presion === 80, JSON.stringify(asiento && asiento.tactica));
  await p.screenshot({ path: 'futbol-linea-390-espera.png', fullPage: true });
  await a.screenshot({ path: 'futbol-linea-844-espera.png' });

  // ---- Partido en vivo ----
  await p.click('[data-p="empezar"]');
  const f1 = await marcoDe(p), f2 = await marcoDe(a);
  await esperar(f1, () => window.__futbol && window.__futbol.estado().vista === 'partido' && window.__futbol.red(), null, 45000);
  await esperar(f2, () => window.__futbol && window.__futbol.red() && window.__futbol.red().recibidas > 5, null, 45000);
  const r1 = await f1.evaluate(() => window.__futbol.red()), r2 = await f2.evaluate(() => window.__futbol.red());
  ok('roles: la anfitriona simula y Angel es el invitado', r1.rol === 'anfitrion' && r2.rol === 'invitado', JSON.stringify([r1.rol, r2.rol]));
  const tacticaB = await f1.evaluate(() => window.__futbol.p().eq[1].tactica);
  ok('táctica: el partido usa la de Angel (4-3-3, presión 80)', tacticaB.formacion === '4-3-3' && tacticaB.presion === 80, JSON.stringify(tacticaB));
  await sleep(1500);
  const l2 = await f2.evaluate(() => document.getElementById('lat').textContent);
  ok('latencia en pantalla (📶 ms)', /📶 \d+ ms/.test(l2), l2);
  // Posiciones parecidas en los dos aparatos (el invitado dibuja ~100 ms + latencia atrás).
  const pos = async fr => fr.evaluate(() => window.__futbol.p().jug.map(j => [j.x, j.y]));
  const [x1, x2] = [await pos(f1), await pos(f2)];
  const dif = Math.max(...x1.map((q, i) => Math.hypot(q[0] - x2[i][0], q[1] - x2[i][1])));
  ok('los dos aparatos dibujan a los 22 jugadores cerca (< 4 m con 80 ms)', dif < 4, dif.toFixed(2));
  await p.screenshot({ path: 'futbol-linea-390-partido.png' });
  await a.screenshot({ path: 'futbol-linea-844-partido.png' });

  // ---- Gol de Angel: su tiro viaja al anfitrión ----
  await fuente(f1); await fuente(f2);
  let golB = false;
  for (let k = 0; k < 5 && !golB; k++) {
    const jug = await f1.evaluate(() => window.__futbol.p().humanos[1].jug);
    await f1.evaluate(i => window.__futbol.ponerParaTiro(i), jug);
    await sleep(500);
    await tiroDe(f2, 450);
    try { await esperar(f1, () => window.__futbol.estado().goles[1] >= 1, null, 5000); golB = true; } catch { /* falló el tiro: otra vez */ }
  }
  ok('gol del invitado: su entrada llega al anfitrión y anota', golB);
  await esperar(f2, () => window.__futbol.p().eq[1].goles >= 1, null, 10000).catch(() => {});
  const g2 = await f2.evaluate(() => [window.__futbol.p().eq[0].goles, window.__futbol.p().eq[1].goles]);
  const grito2 = await f2.evaluate(() => document.getElementById('grito').textContent);
  ok('el invitado ve su gol (marcador y ¡GOOOL!)', g2[1] === 1 && /GOOOL/.test(grito2), JSON.stringify(g2) + ' ' + grito2);
  await a.screenshot({ path: 'futbol-linea-844-gol.png' });
  // ---- Gol de la anfitriona visto por el invitado ----
  await sleep(2500);
  let golA = false;
  for (let k = 0; k < 5 && !golA; k++) {
    const jug = await f1.evaluate(() => window.__futbol.p().humanos[0].jug);
    await f1.evaluate(i => window.__futbol.ponerParaTiro(i), jug);
    await sleep(300);
    await tiroDe(f1, 450);
    try { await esperar(f1, () => window.__futbol.estado().goles[0] >= 1, null, 5000); golA = true; } catch { /* otra vez */ }
  }
  await esperar(f2, () => window.__futbol.p().eq[0].goles >= 1, null, 10000).catch(() => {});
  const g2b = await f2.evaluate(() => [window.__futbol.p().eq[0].goles, window.__futbol.p().eq[1].goles]);
  ok('gol de la anfitriona visto por el invitado (1–1 en los dos)', golA && g2b[0] === 1 && g2b[1] === 1, JSON.stringify(g2b));
  await f1.evaluate(() => window.__futbol.iaPausada(false));

  // ---- Desconexión y regreso del invitado ----
  await f2.evaluate(() => { window.__puenteMudo = true; });
  await esperar(f1, () => window.__futbol.red().ia && /se cierra en/.test(window.__futbol.red().aviso), null, 10000).catch(() => {});
  const caida = await f1.evaluate(() => window.__futbol.red());
  ok('desconexión: aviso con cuenta de 15 s y la IA juega por el invitado', caida.ia && /Se perdió la conexión con Angel/.test(caida.aviso) && /se cierra en \d+ s/.test(caida.aviso), JSON.stringify(caida));
  await p.screenshot({ path: 'futbol-linea-390-desconexion.png' });
  await f2.evaluate(() => { window.__puenteMudo = false; });
  await esperar(f1, () => !window.__futbol.red().ia, null, 10000).catch(() => {});
  ok('regreso: Angel recupera su equipo', !(await f1.evaluate(() => window.__futbol.red().ia)));

  // ---- Final: resultado confirmado en el servidor y podio en los dos ----
  await f1.evaluate(() => window.__futbol.terminarYa());
  await p.waitForSelector('#p-body .result', { timeout: 30000 }); await a.waitForSelector('#p-body .result', { timeout: 30000 });
  await p.waitForFunction(() => /confirmado/.test((document.getElementById('p-futbol-nota') || {}).textContent || ''), null, { timeout: 20000 }).catch(() => {});
  const s1 = await sala(codigo, 'marisol@example.com');
  ok('servidor: resultado confirmado 1–1 por los dos', s1.futbol && s1.futbol.estado === 'confirmado' && s1.futbol.goles.join() === '1,1', JSON.stringify(s1.futbol));
  const [pod1, pod2] = [await p.textContent('#p-body'), await a.textContent('#p-body')];
  ok('podio en los dos con el marcador y la nota de confirmado', /Marisol 1 – 1 Angel/.test(pod1) && /Marisol 1 – 1 Angel/.test(pod2) && /confirmado/.test(pod1) && /confirmado/.test(pod2), pod2.replace(/\s+/g, ' ').slice(0, 200));
  await p.screenshot({ path: 'futbol-linea-390-podio.png', fullPage: true });
  await a.screenshot({ path: 'futbol-linea-844-podio.png', fullPage: true });

  // ---- Se cae el anfitrión: el invitado cierra a los 15 s y reporta ----
  const c2 = await crearSala(p, a);
  await p.click('[data-p="empezar"]');
  const h1 = await marcoDe(p), h2 = await marcoDe(a);
  await esperar(h2, () => window.__futbol && window.__futbol.red() && window.__futbol.red().recibidas > 5, null, 45000);
  await h1.evaluate(() => { window.__puenteMudo = true; });
  await esperar(h2, () => /Se perdió la conexión/.test(window.__futbol.red().aviso), null, 10000).catch(() => {});
  ok('se cae el anfitrión: el invitado ve el aviso', /Se perdió la conexión con Marisol/.test((await h2.evaluate(() => window.__futbol.red())).aviso));
  await a.screenshot({ path: 'futbol-linea-844-sin-anfitrion.png' });
  await a.waitForSelector('#p-body .result', { timeout: 30000 });
  await sleep(1000);
  const s2 = await sala(c2.codigo, 'angel@example.com');
  ok('a los 15 s se cierra y cuenta el resultado del invitado (corte)', s2.futbol && ['invitado', 'confirmado', 'disputa'].includes(s2.futbol.estado) && s2.jugadores.some(j => j.futbol && j.futbol.corte), JSON.stringify(s2.futbol));
  await p.context().close(); await a.context().close();

  // ---- Respaldo: el canal no conecta ----
  const falla = [() => { window.__puenteFalla = true; }];
  const q = await abrir(b, 'laura@example.com', { width: 390, height: 844 }, falla), w = await abrir(b, 'angel@example.com', { width: 844, height: 390 }, falla);
  await crearSala(q, w);
  await q.click('[data-p="empezar"]');
  const fq = await marcoDe(q), fw = await marcoDe(w);
  await fq.waitForSelector('#b-ir-clasif', { timeout: 30000 }); await fw.waitForSelector('#b-ir-clasif', { timeout: 30000 });
  const msg = await fq.textContent('#ov');
  ok('respaldo: mensaje claro en los dos y botón a la Clasificatoria semanal', /no está disponible en esta sala/.test(msg) && /Clasificatoria semanal/.test(msg), msg.replace(/\s+/g, ' ').slice(0, 160));
  await q.screenshot({ path: 'futbol-linea-390-respaldo.png' });
  await w.screenshot({ path: 'futbol-linea-844-respaldo.png' });
  await fq.click('#b-ir-clasif');
  const fc = await (await q.waitForSelector('#arcade-frame', { timeout: 30000 })).contentFrame();
  await fc.waitForFunction(() => /Clasificatoria semanal/.test((document.getElementById('ov') || {}).textContent || ''), null, { timeout: 30000 });
  ok('respaldo: el botón abre la Clasificatoria semanal de Fútbol Estelar', /Tu mejor de la semana/.test(await fc.textContent('#ov')));

  await b.close();
  console.log(out.join('\n')); process.exit(out.some(x => x.startsWith('FAIL')) ? 1 : 0);
})().catch(e => { console.log(out.join('\n')); console.error('ERROR', e.message.slice(0, 400)); process.exit(2); });
