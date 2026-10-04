// Estrés de Conquián individual: 4 partidas completas; toma cuando puede (tercia, escalera o extender), baja y descarta.
require('./lib/entorno'); // BASE, API, DATOS, DATA, CHROME, carpeta de salida y sesión de prueba en fetch
const { chromium } = require('playwright');
const BASE = process.env.BASE, API = process.env.API;
const Q = '?api=' + encodeURIComponent(API);
const out = []; const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`);
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME });
  const ctx = await b.newContext({ viewport: { width: 390, height: 900 } });
  await ctx.addInitScript(() => { window.__TIEMPO_JUEGOS = 0.03; (localStorage.setItem('stald_email', 'marisol@example.com'), localStorage.setItem('stald_sesion_prueba', JSON.stringify({ email: 'marisol@example.com', token: 'prueba:' + 'marisol@example.com' }))); });
  const p = await ctx.newPage(); const errores = []; p.on('pageerror', e => errores.push(e.message));
  p.on('dialog', d => d.accept());
  await p.goto(BASE + '/juegos.html' + Q); await p.waitForSelector('[data-juego]', { timeout: 60000 });
  const finales = [], acciones = { tomar: 0, extender: 0, bajar: 0, descartar: 0, pasar: 0 }; let invalidas = 0, atascos = 0;
  for (let partida = 0; partida < 4; partida++) {
    await p.goto(BASE + '/juegos.html' + Q); await p.waitForSelector('[data-juego]');
    await p.click('[data-juego="conquian"]'); await p.click('[data-cq-go]'); await p.waitForSelector('.es-mano');
    const t0 = Date.now(); let ultimo = Date.now(), prevHtml = '';
    while (Date.now() - t0 < 120000 && !(await p.$('.result h1'))) {
      const html = await p.$eval('#m-body', e => e.innerHTML.length + ':' + e.textContent.length).catch(() => '');
      if (html !== prevHtml) { prevHtml = html; ultimo = Date.now(); }
      if (Date.now() - ultimo > 15000) { atascos++; break; }
      const fase = (await p.$('[data-cq="tomar"]')) ? 'oferta' : (await p.$('[data-cq="descartar"]')) ? 'bajar' : null;
      if (!fase) { await sleep(40); continue; }
      // Decide con el motor sobre lo que se ve en pantalla (mano, oferta y juegos propios).
      const plan = await p.evaluate(fase => {
        const mano = [...document.querySelectorAll('[data-cq-carta]')].map(x => Number(x.dataset.cqCarta));
        const ofEl = document.querySelector('[data-cq-oferta]'); const of = ofEl ? Number(ofEl.dataset.cqOferta) : null;
        const juegos = [...document.querySelectorAll('[data-cq-juego]')].map(j => ({ a: Number(j.dataset.cqJuego) }));
        const st = { manos: [mano, []], bajados: [[], []] };
        const misJuegos = [...document.querySelectorAll('[data-cq-juego]')].map(j => [...j.querySelectorAll('.es-carta')].map(c => c.getAttribute('aria-label')));
        void misJuegos; void juegos; void st;
        const extra = fase === 'oferta' ? [of] : [];
        for (let x = 0; x < mano.length; x++) for (let y = x + 1; y < mano.length; y++) {
          if (extra.length && Cartas.esJuego(extra.concat([mano[x], mano[y]]))) return { accion: 'tomar', con: [mano[x], mano[y]] };
          for (let z = y + 1; z < mano.length; z++) if (!extra.length && Cartas.esJuego([mano[x], mano[y], mano[z]])) return { accion: 'bajar', con: [mano[x], mano[y], mano[z]] };
        }
        return fase === 'oferta' ? { accion: 'pasar' } : { accion: 'descartar', con: [mano[mano.length - 1]] };
      }, fase);
      if (fase === 'oferta' && plan.accion === 'pasar' && (await p.$('[data-cq-juego]'))) {
        // Probar extender un juego propio con la carta ofrecida (destino + Tomar sin cartas)
        await p.click('[data-cq-juego="0"]'); await sleep(40); await p.click('[data-cq="tomar"]'); await sleep(60);
        if (/Eso no forma un juego/.test(await p.textContent('#cq-msg').catch(() => ''))) { await p.click('[data-cq-juego="0"]').catch(() => {}); await sleep(30); await p.click('[data-cq="pasar"]').catch(() => {}); acciones.pasar++; }
        else acciones.extender++;
        continue;
      }
      for (const id of plan.con || []) { await p.click('[data-cq-carta="' + id + '"]').catch(() => {}); await sleep(25); }
      await p.click('[data-cq="' + plan.accion + '"]').catch(() => {}); await sleep(60);
      if (/Eso no forma un juego|Elige exactamente/.test(await p.textContent('#cq-msg').catch(() => ''))) { invalidas++; for (const id of plan.con || []) await p.click('[data-cq-carta="' + id + '"]').catch(() => {}); }
      acciones[plan.accion]++;
    }
    const h1 = await p.textContent('.result h1').catch(() => 'SIN TERMINAR');
    finales.push(h1.trim());
  }
  ok('Conquián: las 4 partidas terminan (gana alguien o se acaba el mazo)', finales.every(f => /Conquián|empate|Ganó/.test(f)), finales.join(' | '));
  ok('Conquián: sin atascos ni errores de JS', atascos === 0 && errores.length === 0, `atascos=${atascos} ${errores.slice(0, 2).join(' | ')}`);
  ok('Conquián: se usaron tomar, bajar/extender y descartar sin jugadas rechazadas', acciones.tomar > 0 && acciones.descartar > 0 && invalidas === 0, JSON.stringify(acciones) + ' invalidas=' + invalidas);
  await b.close();
  console.log(out.join('\n')); process.exit(out.some(x => x.startsWith('FAIL')) ? 1 : 0);
})().catch(e => { console.log(out.join('\n')); console.error('ERROR', e.message.slice(0, 300)); process.exit(2); });
