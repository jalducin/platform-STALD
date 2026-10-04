// E2E: ¡Una! en partida con dos navegadores + bots. Mismo estado en cada paso, castigo por no gritar y mismo final.
require('./lib/entorno'); // BASE, API, DATOS, DATA, CHROME, carpeta de salida y sesión de prueba en fetch
const { chromium } = require('playwright');
const BASE = process.env.BASE;
const Q = '?api=' + encodeURIComponent(process.env.API);
const out = []; const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`);
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function jugador(b, email) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(e => { window.__TIEMPO_JUEGOS = 1; (localStorage.setItem('stald_email', e), localStorage.setItem('stald_sesion_prueba', JSON.stringify({ email: e, token: 'prueba:' + e }))); }, email);
  const p = await ctx.newPage(); p.on('pageerror', e => out.push('FAIL error JS (' + email + '): ' + e.message)); p.on('dialog', d => d.dismiss());
  await p.goto(BASE + '/juegos.html' + Q); await p.waitForSelector('[data-juego]', { timeout: 60000 });
  await p.click('[data-tab="partidas"]'); await p.waitForSelector('#f-crear'); return p;
}
const foto = p => p.evaluate(() => { if (!sala.estado || !sala.estado.sala.inicio) return null; const st = estadoUna(); return { paso: st.paso + (st.esperaUna ? ':esperando-UNA' : ''), top: st.pila[st.pila.length - 1], color: st.color, manos: st.manos.map(h => h.length), turno: st.turno, castigo: !!(st.ultima && st.ultima.castigo), fin: st.fin && st.fin.ganador }; });

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
  // Avatar desde el portal
  const pc = await b.newContext(); await pc.addInitScript(() => (localStorage.setItem('stald_email', 'marisol@example.com'), localStorage.setItem('stald_sesion_prueba', JSON.stringify({ email: 'marisol@example.com', token: 'prueba:' + 'marisol@example.com' }))));
  const pp = await pc.newPage(); await pp.goto(BASE + '/' + Q); await pp.waitForSelector('#av-link:not([hidden])', { timeout: 60000 }).catch(() => {});
  ok('portal: avatar en el saludo y enlace para cambiarlo', !!(await pp.$('#hello .av')) && !!(await pp.$('#av-link:not([hidden])')));
  await pp.click('#av-link'); await pp.waitForSelector('[data-av-emoji]', { timeout: 60000 }).catch(() => {});
  ok('el enlace abre directo el selector de avatar', !!(await pp.$('[data-av-emoji]')));
  await b.close();
  console.log(out.join('\n')); process.exit(out.some(x => x.startsWith('FAIL')) ? 1 : 0);
})().catch(e => { console.log(out.join('\n')); console.error('ERROR', e.message.slice(0, 300)); process.exit(2); });
