// E2E ¡Una! robo hasta poder tirar (openspec: basta-divertida-una-robo; antes «cada robo suma 1 carta»).
// Partida individual de puro robar (y pasar) que vacía el mazo: cada robo trae cartas hasta la primera que sí se
// puede tirar (solo esa queda jugable) o hasta que el mazo se acaba; el descarte no se rebaraja para robar.
require('./lib/entorno'); // BASE, API, DATOS, DATA, CHROME, carpeta de salida y sesión de prueba en fetch
const { chromium } = require('playwright');
const { abrirPagina, urlDe } = require('./lib/navegador');
const out = []; const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`);
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME });
  const p = await abrirPagina(b, { email: 'marisol@example.com', viejo: true, tiempo: 0.04, viewport: { width: 390, height: 900 } });
  const errores = []; p.on('pageerror', e => errores.push(e.message));
  await p.goto(urlDe('/juegos.html')); await p.waitForSelector('[data-juego]', { timeout: 60000 });
  await p.click('[data-juego="una"]'); await p.click('[data-una-bots="3"]'); await p.click('[data-una-go]');
  await p.waitForSelector('.una-mano');
  let robos = 0, malos = 0, varias = 0, finMazo = 0, sinCartas = 0, deshabilitado = 0, pasadas = 0, tiradas = 0, animadas = 0, foto = false; const detalle = [];
  const mano = () => p.$$eval('.una-mano .una-btn', xs => xs.map(x => ({ robada: x.classList.contains('robada'), nueva: x.classList.contains('nueva'), k: x.style.getPropertyValue('--k'), jugable: !x.hasAttribute('data-no') })));
  const t0 = Date.now();
  let partidas = 1;
  while (Date.now() - t0 < 240000 && (robos < 40 || finMazo + sinCartas + deshabilitado === 0)) {
    if (await p.$('.result h1')) { // la ganó alguien: otra partida
      await p.click('.result [data-juego="una"]').catch(() => {}); await p.waitForSelector('[data-una-go]').catch(() => {});
      await p.click('[data-una-bots="3"]').catch(() => {}); await p.click('[data-una-go]').catch(() => {}); partidas++; await sleep(100); continue;
    }
    const robar = await p.$('[data-una="robar"]:not([disabled])');
    if (robar) {
      const antes = await p.$$eval('.una-mano .una-btn', x => x.length);
      await robar.click().catch(() => {});
      const h = await mano().catch(() => []); // se lee al instante: la animación marca las nuevas
      const msg = await p.textContent('#una-msg').catch(() => '');
      const n = h.length - antes;
      robos++;
      const m = /Robaste (\d+) cartas? (hasta encontrar una que sí puedes tirar|y sí la puedes tirar|y se acabó el mazo)/.exec(msg);
      const nuevas = h.filter(x => x.nueva);
      if (nuevas.length === n && n > 0 && nuevas.map(x => x.k).join() === [...Array(n).keys()].join()) animadas++;
      if (m && Number(m[1]) === n && n >= 1) {
        if (/se acabó el mazo/.test(m[2])) finMazo++;
        else {
          // Solo la última robada sirve: una sola «robada» jugable y las demás nuevas no se pueden tirar.
          const r = h.filter(x => x.robada);
          if (!(r.length === 1 && r[0].jugable && h.filter(x => x.jugable).length === 1 && nuevas.filter(x => x.jugable).length === 1)) { malos++; if (detalle.length < 3) detalle.push('jugables ' + JSON.stringify(h.filter(x => x.nueva || x.jugable))); }
          if (n > 1) {
            varias++;
            if (!foto && /Robaste \d+ cartas hasta encontrar una que sí puedes tirar/.test(msg)) { foto = true; await p.screenshot({ path: 'una-robo-varias.png' }); }
          }
        }
      } else if (n === 0 && /No quedan cartas/.test(msg)) sinCartas++;
      else { malos++; if (detalle.length < 3) detalle.push(antes + '→' + h.length + ' ' + msg.slice(0, 80)); }
      const pasar = await p.$('[data-una="pasar"]'); if (pasar) { await pasar.click().catch(() => {}); pasadas++; }
      continue;
    }
    if (await p.$('[data-una="robar"][disabled]')) {
      const txt = await p.textContent('[data-una="robar"]').catch(() => '');
      if (/\(0\)/.test(txt)) deshabilitado++;
    }
    const pasar = await p.$('[data-una="pasar"]'); if (pasar) { await pasar.click().catch(() => {}); pasadas++; continue; }
    // Mazo vacío y con carta jugable: hay que tirarla para seguir.
    const jugable = await p.$('.una-mano .una-btn:not([data-no])');
    if (jugable && /Tu turno/.test(await p.textContent('#una-msg').catch(() => ''))) {
      await jugable.click().catch(() => {}); const col = await p.$('[data-una-color]'); if (col) await col.click().catch(() => {});
      tiradas++; continue;
    }
    await sleep(40);
  }
  if (deshabilitado || finMazo) await p.screenshot({ path: 'una-robo-mazo-vacio.png' });
  ok('cada robo trae N≥1 cartas, el aviso dice cuántas y solo la última es jugable', malos === 0 && robos >= 40, `partidas=${partidas} robos=${robos} malos=${malos} ${detalle.join(' | ')}`);
  ok('se vio «Robaste N cartas hasta encontrar una que sí puedes tirar» (N≥2)', varias >= 1, 'varias=' + varias);
  ok('las cartas robadas se animan en orden (--k 0..N-1)', animadas >= robos - sinCartas - 1, `animadas=${animadas}/${robos}`);
  ok('mazo vacío: el robo se detiene y pasa el turno, sin rebarajar el descarte', finMazo + sinCartas + deshabilitado > 0, `finMazo=${finMazo} sinCartas=${sinCartas} deshabilitado(0)=${deshabilitado} tiradas=${tiradas}`);
  ok('sin errores de JS en la partida larga', errores.length === 0, errores.slice(0, 2).join(' | '));
  ok('las partidas avanzan sin trabarse', robos >= 40, `pasadas=${pasadas}`);
  await b.close();
  console.log(out.join('\n')); process.exit(out.some(x => x.startsWith('FAIL')) ? 1 : 0);
})().catch(e => { console.log(out.join('\n')); console.error('ERROR', e.message.slice(0, 300)); process.exit(2); });
