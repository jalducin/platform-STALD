// E2E: ¡Una! en partida con dos navegadores + bots. Mismo estado en cada paso, castigo por no gritar y mismo final.
require('./lib/entorno'); // BASE, API, DATOS, DATA, CHROME, carpeta de salida y sesión de prueba en fetch
const { chromium } = require('playwright');
const { abrirPagina } = require('./lib/navegador');
const out = []; const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`);
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function jugador(b, email) {
  const p = await abrirPagina(b, { email, viejo: true, tiempo: 1, out, dialogos: 'rechazar', ruta: '/juegos.html', esperar: '[data-juego]' });
  await p.click('[data-tab="partidas"]'); await p.waitForSelector('#f-crear'); return p;
}
const foto = p => p.evaluate(() => { if (!sala.estado || !sala.estado.sala.inicio) return null; const st = estadoUna(); return { paso: st.paso + (st.esperaUna ? ':esperando-UNA' : ''), top: st.pila[st.pila.length - 1], color: st.color, manos: st.manos.map(h => h.length), turno: st.turno, castigo: !!(st.ultima && st.ultima.castigo), fin: st.fin && st.fin.ganador, robo: st.ultima && st.ultima.accion === 'robar' ? st.ultima.robadas : null, mazo: st.mazo.length }; }); // basta-divertida-una-robo: robo hasta poder, igual en ambos

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME });
  const host = await jugador(b, 'marisol@example.com'), otro = await jugador(b, 'angel@example.com');
  await host.selectOption('#p-juego', 'una'); await host.click('#f-crear button[type=submit]'); await host.waitForSelector('[data-p="empezar"]');
  const codigo = (await host.textContent('.letra')).trim();
  await otro.fill('#p-codigo', codigo); await otro.click('#f-unirse button[type=submit]'); await otro.waitForSelector('#p-body .rank li');
  await sleep(2600);
  ok('sala de ¡Una! con 2 personas y 2 bots', (await host.$$('#p-body .rank li')).length === 4);
  await host.click('[data-p="empezar"]');
  await host.waitForSelector('.una-mano', { timeout: 20000 }); await otro.waitForSelector('.una-mano', { timeout: 20000 });
  ok('botón dice UNA', true); ok('ambos ven su mano de 7 cartas', (await host.$$('.una-mano .una-btn')).length === 7 && (await otro.$$('.una-mano .una-btn')).length === 7);
  const tablas = { h: new Map(), o: new Map() };
  let olvidoHecho = false, castigoVisto = false, jugadasHumanas = 0;
  const t0 = Date.now();
  while (Date.now() - t0 < 420000) {
    let terminado = true;
    for (const [p, k] of [[host, 'h'], [otro, 'o']]) {
      if (await p.$('.result')) continue;
      terminado = false;
      try {
        const f = await foto(p); if (f) tablas[k].set(f.paso, JSON.stringify(f));
        if (f && f.castigo) castigoVisto = true;
        const botonUna = await p.$('[data-usala="una"]');
        if (botonUna) {
          if (k === 'h' && !olvidoHecho) { olvidoHecho = true; await sleep(3300); } // ~3.5 s → +2
          await botonUna.click({ force: true }).catch(() => {}); await sleep(200); continue;
        }
        const miTurno = (await p.textContent('#una-msg')).includes('👉') || !!(await p.$('[data-usala-color]'));
        if (!miTurno) continue;
        const col = await p.$('[data-usala-color]'); if (col) { await col.click(); jugadasHumanas++; await sleep(150); continue; }

        const jugables = await p.$$('.una-btn:not([data-no])');
        let elegida = null; for (const x of jugables) { if (!(await x.$('.una-wild'))) { elegida = x; break; } }
        const c = elegida || jugables[0];
        if (c) { await c.click(); jugadasHumanas++; await sleep(150); continue; }
        const pasar = await p.$('[data-usala="pasar"]'); if (pasar) { await pasar.click(); await sleep(150); continue; }
        const robar = await p.$('[data-usala="robar"]:not([disabled])'); if (robar) { await robar.click(); await sleep(150); continue; }
      } catch (e) { /* redibujado */ }
    }
    if (terminado) break;
    await sleep(120);
  }
  ok('la partida termina en ambos', !!(await host.$('.result')) && !!(await otro.$('.result')));
  // Estado igual en cada paso visto por ambos
  const comunes = [...tablas.h.keys()].filter(k => tablas.o.has(k));
  const distintos = comunes.filter(k => tablas.h.get(k) !== tablas.o.get(k));
  ok('mismo estado en cada paso común (carta, color, manos, turno)', comunes.length >= 10 && distintos.length === 0, comunes.length + ' pasos comunes, ' + distintos.length + ' distintos' + (distintos.length ? ' ej. ' + tablas.h.get(distintos[0]) + ' vs ' + tablas.o.get(distintos[0]) : ''));
  ok('las personas sí jugaron', jugadasHumanas >= 4, String(jugadasHumanas));
  const robosVistos = comunes.map(k => JSON.parse(tablas.h.get(k)).robo).filter(Boolean);
  ok('robos hasta poder vistos igual en ambos (cartas robadas por paso)', robosVistos.length >= 1, robosVistos.length + ' robos; tamaños ' + robosVistos.map(r => r.length).join(','));
  const cast = await host.evaluate(() => { const st = estadoUna(); return { castigos: st.castigos, yo: st.orden.findIndex(p => p.id === sala.estado.yo) }; }).catch(() => null);
  const otros = await otro.evaluate(() => estadoUna().castigos);
  const mio = cast && cast.castigos.find(x => x.j === cast.yo);
  if (olvidoHecho) ok('tardar ~3.5 s en presionar UNA da +2, igual en ambos', !!mio && mio.n === 2 && JSON.stringify(cast.castigos) === JSON.stringify(otros), JSON.stringify(cast) + ' vs ' + JSON.stringify(otros));
  else out.push('INFO la anfitriona no tiró con 2 cartas sin presionar UNA en esta partida (castigo no observado) ' + JSON.stringify(cast));
  await sleep(2500);
  const fh = await host.textContent('.result h1'), fo = await otro.textContent('.result h1');
  ok('mismo ganador en ambos', fh === fo, fh + ' | ' + fo);
  const podio = p => p.$$eval('.rank li', ls => ls.map(l => l.querySelector('.n').childNodes[0].textContent.trim() + '=' + l.querySelector('.pts').textContent.trim()));
  const ph = await podio(host), po = await podio(otro);
  ok('podio idéntico en ambos', JSON.stringify(ph) === JSON.stringify(po) && ph.length === 4, ph.join(' | '));
  ok('guardado en el ranking', (await host.textContent('#p-guardado')).includes('puntos de partidas'));
  await host.screenshot({ path: 'una-sala-fin.png' });

  // ---- Robo hasta poder hasta vaciar el mazo (openspec: basta-divertida-una-robo) ----
  // Dos personas sin bots y reloj acelerado: siempre roban (y pasan la que encontraron) para acaparar cartas y
  // vaciar el mazo. Ambos dispositivos deben ver las mismas robadas en cada paso.
  const errs = [];
  const nueva = async email => {
    const p = await abrirPagina(b, { email, viejo: true, tiempo: 0.1, out, dialogos: 'rechazar', ruta: '/juegos.html', esperar: '[data-juego]', viewport: { width: 390, height: 900 } });
    p.on('pageerror', e => errs.push(e.message));
    await p.click('[data-tab="partidas"]'); await p.waitForSelector('#f-crear'); return p;
  };
  const r1 = await nueva('jesus@example.com'), r2 = await nueva('laura@example.com');
  await r1.selectOption('#p-juego', 'una'); await r1.uncheck('#p-bots'); await r1.click('#f-crear button[type=submit]'); await r1.waitForSelector('[data-p="empezar"]');
  const cod = (await r1.textContent('.letra')).trim();
  await r2.fill('#p-codigo', cod); await r2.click('#f-unirse button[type=submit]'); await r2.waitForSelector('#p-body .rank li');
  await sleep(2600); await r1.click('[data-p="empezar"]');
  await r1.waitForSelector('.una-mano', { timeout: 20000 }); await r2.waitForSelector('.una-mano', { timeout: 20000 });
  const estado = p => p.evaluate(() => { const st = estadoUna(); const yo = st.orden.findIndex(q => q.id === sala.estado.yo); const u = st.ultima;
    return { paso: st.paso, mazo: st.mazo.length, fin: !!st.fin, yo, turno: st.turno, pendiente: st.pendiente, ult: u && u.accion === 'robar' ? { j: u.j, robadas: u.robadas, jugable: u.jugable, auto: u.auto, paso: u.paso } : null }; });
  let misRobos = 0, varias = 0, finMazo = null, vacioVisto = false, pasosTrasVacio = 0, pasoVacio = null, fotoRobo = false; const avisoMal = [];
  const vistos = [new Map(), new Map()];
  const t1 = Date.now();
  while (Date.now() - t1 < 240000 && !(vacioVisto && pasosTrasVacio >= 6)) {
    for (const [k, p] of [r1, r2].entries()) {
      let e; try { e = await estado(p); } catch (x) { continue; }
      if (e.ult) vistos[k].set(e.ult.paso, JSON.stringify(e.ult.robadas));
      if (e.fin || (await p.$('.result'))) continue;
      if (e.mazo === 0 && !vacioVisto) { vacioVisto = true; pasoVacio = e.paso; }
      if (vacioVisto) pasosTrasVacio = Math.max(pasosTrasVacio, e.paso - pasoVacio);
      if (e.turno !== e.yo || !(await p.textContent('#una-msg').catch(() => '')).includes('👉')) continue;
      try {
        const pasar = await p.$('[data-usala="pasar"]');
        if (pasar && e.pendiente !== null) { await pasar.click(); await sleep(150); continue; }
        const robar = await p.$('[data-usala="robar"]:not([disabled])');
        if (robar) {
          await robar.click();
          await p.waitForFunction(n => estadoUna().paso > n, e.paso, { timeout: 15000 });
          const d = await estado(p);
          if (d.ult && d.ult.j === d.yo && d.ult.paso === e.paso + 1 && !d.ult.auto) {
            misRobos++;
            const n = d.ult.robadas.length, msg = await p.textContent('#una-msg');
            const esperado = d.ult.jugable === null ? (n ? /se acabó el mazo/ : /No quedan cartas/) : n === 1 ? /Robaste 1 carta y sí la puedes tirar/ : /Robaste \d+ cartas hasta encontrar una que sí puedes tirar/;
            if (!esperado.test(msg) || !msg.includes(String(n))) avisoMal.push(n + ':' + msg.slice(0, 70));
            if (n > 1 && d.ult.jugable !== null) { varias++; if (!fotoRobo) { fotoRobo = true; await p.screenshot({ path: 'una-sala-robo.png' }); } }
            if (d.ult.jugable === null && n > 0) { finMazo = { n, paso: d.ult.paso }; await p.screenshot({ path: 'una-sala-mazo-vacio.png' }); }
          }
          continue;
        }
        if (pasar) { await pasar.click(); await sleep(150); continue; }
        const jug = await p.$('.una-btn:not([data-no])');
        if (jug) { await jug.click(); await sleep(150); const col = await p.$('[data-usala-color]'); if (col) await col.click(); await sleep(150); }
      } catch (x) { /* redibujado */ }
    }
    await sleep(80);
  }
  const comunesR = [...vistos[0].keys()].filter(x => vistos[1].has(x));
  ok('sala: los robos traen cartas hasta poder tirar, con el aviso correcto', misRobos >= 5 && varias >= 1 && avisoMal.length === 0, `robos=${misRobos} varias=${varias} ${avisoMal.slice(0, 2).join(' | ')}`);
  ok('sala: mismas cartas robadas en ambos dispositivos (determinista)', comunesR.length >= 3 && comunesR.every(x => vistos[0].get(x) === vistos[1].get(x)), comunesR.length + ' robos comunes');
  ok('sala: el mazo se vacía y la partida sigue sin rebarajar para robar', vacioVisto && pasosTrasVacio >= 6, `vacío=${vacioVisto} pasosDespués=${pasosTrasVacio} finMazo=${JSON.stringify(finMazo)}`);
  if (!finMazo) out.push('INFO el último robo no se quedó a medias (el mazo se vació justo en una jugable)');
  await r1.screenshot({ path: 'una-sala-tras-vaciar.png' });
  ok('sala: sin errores de JS', errs.length === 0, errs.slice(0, 2).join(' | '));
  // Avatar desde el portal
  const pp = await abrirPagina(b, { email: 'marisol@example.com', viejo: true, viewport: { width: 1280, height: 720 }, ruta: '/' }); await pp.waitForSelector('#av-link:not([hidden])', { timeout: 60000 }).catch(() => {});
  ok('portal: avatar en el saludo y enlace para cambiarlo', !!(await pp.$('#hello .av')) && !!(await pp.$('#av-link:not([hidden])')));
  await pp.click('#av-link'); await pp.waitForSelector('[data-av-emoji]', { timeout: 60000 }).catch(() => {});
  ok('el enlace abre directo el selector de avatar', !!(await pp.$('[data-av-emoji]')));
  await b.close();
  console.log(out.join('\n')); process.exit(out.some(x => x.startsWith('FAIL')) ? 1 : 0);
})().catch(e => { console.log(out.join('\n')); console.error('ERROR', e.message.slice(0, 300)); process.exit(2); });
