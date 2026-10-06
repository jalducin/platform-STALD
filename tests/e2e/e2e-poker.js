// E2E póker (openspec: poker): individual con ayuda y partida por equipos con dos navegadores.
require('./lib/entorno'); // BASE, API, DATOS, DATA, CHROME, carpeta de salida y sesión de prueba en fetch
const { chromium } = require('playwright');
const { abrirPagina } = require('./lib/navegador');
const out = []; const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`);
const sleep = ms => new Promise(r => setTimeout(r, ms));

const pagina = (b, email, tiempo) => abrirPagina(b, { email, viejo: true, tiempo, viewport: { width: 390, height: 900 }, out, ruta: '/juegos.html', esperar: '[data-juego]' });
// Juega lo seguro: pasar si se puede; si no, igualar.
async function jugarTurno(p) {
  const pasar = await p.$('[data-pk="pasar"]'); if (pasar) { await pasar.click().catch(() => {}); return true; }
  const igualar = await p.$('[data-pk="igualar"]'); if (igualar) { await igualar.click().catch(() => {}); return true; }
  return false;
}

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME });
  // ---- Individual ----
  const p = await pagina(b, 'marisol@example.com', 0.15);
  await p.click('[data-juego="poker"]'); await p.waitForSelector('[data-pk-go]');
  await p.click('[data-ayuda="poker"]');
  const dlg = await p.waitForSelector('dialog.ayuda[open]');
  const txt = await dlg.innerText();
  ok('ayuda: reglas, tabla de manos y aviso de fichas', /Escalera real/.test(txt) && /Preflop/.test(txt) && /no tienen valor real/.test(txt));
  await p.keyboard.press('Escape'); await sleep(300);
  ok('ayuda: se cierra con Esc', !(await p.$('dialog.ayuda[open]')));
  await p.click('[data-pk-bots="2"]'); await p.click('[data-pk-go]');
  await p.waitForSelector('.pk-mesa');
  ok('mesa: 2 rivales, 2 cartas propias visibles y 5 espacios comunes', (await p.$$('.pk-asientos .pk-asiento')).length === 2 && (await p.$$('.pk-yo .pk-carta:not(.oculta)')).length === 2 && (await p.$$('.pk-comunes .pk-carta')).length === 5);
  await p.screenshot({ path: 'poker-mesa.png', fullPage: true });
  let subi = false, manos = 0; const t0 = Date.now();
  while (Date.now() - t0 < 240000 && !(await p.$('.result h1'))) {
    const sig = await p.$('[data-pk-sig]'); if (sig) { manos++; if (manos === 1) await p.screenshot({ path: 'poker-muestra.png', fullPage: true }); await sig.click().catch(() => {}); await sleep(150); continue; }
    if (!subi && await p.$('[data-pk="subir"]')) { await p.click('[data-pk="subir"]').catch(() => {}); subi = true; await sleep(150); continue; }
    if (!(await jugarTurno(p))) await sleep(120);
  }
  const res = await p.textContent('.result').catch(() => '');
  ok('individual: termina y guarda en individuales', /a tus individuales/.test(res), res.replace(/\s+/g, ' ').slice(0, 160));
  ok('individual: se jugaron manos y una subida', manos >= 1 && subi, 'manos=' + manos);
  await p.screenshot({ path: 'poker-fin.png', fullPage: true });
  await p.context().close();

  // ---- Partida por equipos: dos navegadores + 2 bots ----
  const host = await pagina(b, 'marisol@example.com', 0.3), otro = await pagina(b, 'angel@example.com', 0.3);
  await host.click('[data-tab="partidas"]'); await host.selectOption('#p-juego', 'poker');
  ok('crear: opción por equipos visible solo en póker', !(await host.$eval('#p-equipos-wrap', e => e.hidden)));
  await host.check('#p-equipos'); await host.click('#f-crear button[type=submit]'); await host.waitForSelector('[data-p="empezar"]');
  const codigo = (await host.textContent('.letra')).trim();
  await otro.click('[data-tab="partidas"]'); await otro.fill('#p-codigo', codigo); await otro.click('#f-unirse button[type=submit]'); await otro.waitForSelector('#p-body .rank li');
  await sleep(1500); await host.click('[data-p="empezar"]');
  await host.waitForSelector('.pk-mesa', { timeout: 20000 }); await otro.waitForSelector('.pk-mesa', { timeout: 20000 });
  // Misma mesa: comunes, bote y tags de equipo iguales en ambos (se reintenta por el desfase de consultas)
  let igual = false;
  for (let k = 0; k < 20 && !igual; k++) {
    const f = async q => [await q.$eval('.pk-bote', e => e.textContent).catch(() => ''), await q.$$eval('.pk-tag.eqA, .pk-tag.eqB', ts => ts.length).catch(() => 0)];
    const [a, bb] = [await f(host), await f(otro)];
    igual = a[0] && a[0] === bb[0] && a[1] === 4 && bb[1] === 4; if (!igual) await sleep(300);
  }
  ok('partida: misma mesa y equipos A/B en ambos', igual);
  await host.screenshot({ path: 'poker-sala.png', fullPage: true });
  const t1 = Date.now(); let jugadas = 0;
  while (Date.now() - t1 < 300000 && !((await host.$('.result h1')) && (await otro.$('.result h1')))) {
    for (const q of [host, otro]) if (!(await q.$('.result h1')) && await jugarTurno(q)) { jugadas++; await sleep(400); }
    await sleep(200);
  }
  const fh = await host.textContent('.result h1').catch(() => ''), fo = await otro.textContent('.result h1').catch(() => '');
  ok('partida: ambos ven el mismo final por equipos', fh && fh === fo && /equipo/i.test(fh), fh);
  ok('partida: jugadas humanas enviadas', jugadas >= 5, 'jugadas=' + jugadas);
  await sleep(2500);
  const g = await host.textContent('#p-guardado').catch(() => '');
  ok('partida: se guarda en puntos de partidas', /partidas/.test(g), g);
  await host.screenshot({ path: 'poker-sala-fin.png', fullPage: true });
  await b.close();
  console.log(out.join('\n')); process.exit(out.some(x => x.startsWith('FAIL')) ? 1 : 0);
})().catch(e => { console.log(out.join('\n')); console.error('ERROR', e.message.slice(0, 300)); process.exit(2); });
