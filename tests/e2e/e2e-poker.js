// E2E póker (openspec: poker, poker-fichas): individual con ayuda y selector de fichas, y partida por equipos con
// dos navegadores (con una subida armada con fichas).
require('./lib/entorno'); // BASE, API, DATOS, DATA, CHROME, carpeta de salida y sesión de prueba en fetch
const { chromium } = require('playwright');
const { abrirPagina } = require('./lib/navegador');
const out = []; const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const FICHAS = [5, 10, 20, 50, 100];

const pagina = (b, email, tiempo, viewport) => abrirPagina(b, { email, viejo: true, tiempo, viewport: viewport || { width: 390, height: 900 }, out, ruta: '/juegos.html', esperar: '[data-juego]' });
// Juega lo seguro: pasar si se puede; si no, igualar.
async function jugarTurno(p) {
  const pasar = await p.$('[data-pk="pasar"]'); if (pasar) { await pasar.click().catch(() => {}); return true; }
  const igualar = await p.$('[data-pk="igualar"]'); if (igualar) { await igualar.click().catch(() => {}); return true; }
  return false;
}
// Estado del selector de fichas: aumento, límites y fichas deshabilitadas.
const selector = p => p.evaluate(() => {
  const s = document.getElementById('pk-subir');
  if (!s) return null;
  return { abierto: !s.hidden, aum: Number(s.dataset.aum), min: Number(s.dataset.min), max: Number(s.dataset.max), base: Number(s.dataset.base),
    texto: document.getElementById('pk-aum').textContent.trim(), apostar: !document.querySelector('#pk-subir [data-pk="subir"]').disabled,
    fichas: [...s.querySelectorAll('[data-pk-ficha]')].map(b => ({ v: Number(b.dataset.pkFicha), label: b.getAttribute('aria-label'), off: b.disabled })),
    pila: s.querySelectorAll('#pk-pila .pk-mini').length };
});
// Arma `monto` con las fichas, de la más grande a la más chica.
async function armar(p, monto) {
  for (const v of FICHAS.slice().reverse()) while (monto >= v) { await p.click(`[data-pk-ficha="${v}"]`); monto -= v; }
}

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME });
  // ---- Individual ----
  const p = await pagina(b, 'marisol@example.com', 0.15);
  await p.click('[data-juego="poker"]'); await p.waitForSelector('[data-pk-go]');
  const portada = await p.textContent('.q-card');
  ok('portada: 500 fichas y fichas para subir', /500 fichas/.test(portada) && /5, 10, 20, 50 y 100/.test(portada), portada.replace(/\s+/g, ' ').slice(0, 160));
  await p.click('[data-ayuda="poker"]');
  const dlg = await p.waitForSelector('dialog.ayuda[open]');
  const txt = await dlg.innerText();
  ok('ayuda: reglas, tabla de manos y aviso de fichas', /Escalera real/.test(txt) && /Preflop/.test(txt) && /no tienen valor real/.test(txt));
  ok('ayuda: 500 fichas, ciegas 5/10 y subir con fichas', /500 fichas/.test(txt) && /5\/10/.test(txt) && /✅ Apostar/.test(txt) && !/\bbote\b/i.test(txt));
  await p.keyboard.press('Escape'); await sleep(300);
  ok('ayuda: se cierra con Esc', !(await p.$('dialog.ayuda[open]')));
  await p.click('[data-pk-bots="2"]'); await p.click('[data-pk-go]');
  await p.waitForSelector('.pk-mesa');
  ok('mesa: 2 rivales, 2 cartas propias visibles y 5 espacios comunes', (await p.$$('.pk-asientos .pk-asiento')).length === 2 && (await p.$$('.pk-yo .pk-carta:not(.oculta)')).length === 2 && (await p.$$('.pk-comunes .pk-carta')).length === 5);
  const bote = await p.textContent('.pk-bote');
  ok('mesa: ciegas 5/10 en la primera mano', /ciegas 5\/10/.test(bote) && /mano 1\/10/.test(bote), bote);
  const misFichas = await p.textContent('.pk-yo .pk-fichas');
  ok('mesa: empiezo con 500 fichas (menos mi ciega, si me tocó)', /🪙 (500|495|490)$/.test(misFichas.trim()), misFichas);
  ok('mesa: el pozo se ve con pilas de fichas', (await p.$$('.pk-mesa .pk-pila .pk-mini')).length > 0);
  await p.screenshot({ path: 'poker-mesa.png', fullPage: true });
  let subi = false, manos = 0; const t0 = Date.now();
  while (Date.now() - t0 < 240000 && !(await p.$('.result h1'))) {
    const sig = await p.$('[data-pk-sig]'); if (sig) { manos++; if (manos === 1) await p.screenshot({ path: 'poker-muestra.png', fullPage: true }); await sig.click().catch(() => {}); await sleep(150); continue; }
    if (!subi && await p.$('[data-pk-abrir]')) {
      subi = true;
      ok('selector: oculto hasta tocar «⬆️ Subir»', (await selector(p)).abierto === false);
      await p.click('[data-pk-abrir]');
      let s = await selector(p);
      ok('selector: se abre con fichas de 5, 10, 20, 50 y 100 (aria-label)', s.abierto && s.fichas.map(f => f.label).join('|') === FICHAS.map(v => 'Ficha de ' + v).join('|'), s.fichas.map(f => f.label).join('|'));
      ok('selector: empieza en +0 y «✅ Apostar» deshabilitado bajo el mínimo', s.aum === 0 && s.texto === '+0' && !s.apostar && s.min > 0, JSON.stringify({ min: s.min, max: s.max }));
      await p.click('[data-pk-ficha="20"]'); await p.click('[data-pk-ficha="5"]');
      s = await selector(p);
      ok('selector: las fichas se suman al aumento y a la pila', s.aum === 25 && s.texto === '+25' && s.pila === 2, s.texto + ' pila=' + s.pila);
      ok('selector: muestra cómo queda la apuesta', (await p.textContent('#pk-total')).includes(String(s.base + 25)), await p.textContent('#pk-total'));
      await p.screenshot({ path: 'poker-fichas-390.png', fullPage: true });
      for (let k = 0; k < 12 && !(await p.$eval('[data-pk-ficha="100"]', x => x.disabled)); k++) await p.click('[data-pk-ficha="100"]');
      s = await selector(p);
      ok('selector: deshabilita las fichas que pasan del máximo', s.fichas.every(f => f.off === (s.aum + f.v > s.max)) && s.fichas.some(f => f.off) && s.aum <= s.max, JSON.stringify({ aum: s.aum, max: s.max, off: s.fichas.filter(f => f.off).map(f => f.v) }));
      await p.click('[data-pk-limpiar]');
      s = await selector(p);
      ok('selector: «↺ Limpiar» regresa a +0', s.aum === 0 && s.texto === '+0' && s.pila === 0 && !s.apostar && s.fichas.every(f => f.off === (f.v > s.max)));
      await armar(p, s.min);
      s = await selector(p);
      ok('selector: con el mínimo se habilita «✅ Apostar»', s.aum === s.min && s.apostar, s.texto);
      await p.click('#pk-subir [data-pk="subir"]');
      const msg = await p.textContent('#pk-msg');
      ok('selector: la apuesta queda en la más alta + el aumento', msg.includes('Tú sube a ' + (s.base + s.min)), msg);
      await sleep(150); continue;
    }
    if (!(await jugarTurno(p))) await sleep(120);
  }
  const res = await p.textContent('.result').catch(() => '');
  ok('individual: termina y guarda en individuales', /a tus individuales/.test(res), res.replace(/\s+/g, ' ').slice(0, 160));
  ok('individual: se jugaron manos y una subida con fichas', manos >= 1 && subi, 'manos=' + manos);
  await p.screenshot({ path: 'poker-fin.png', fullPage: true });
  await p.context().close();

  // ---- Escritorio: el selector también se ve bien en una ventana ancha ----
  const d = await pagina(b, 'marisol@example.com', 1, { width: 1280, height: 900 });
  await d.click('[data-juego="poker"]'); await d.click('[data-pk-bots="3"]'); await d.click('[data-pk-go]');
  await d.waitForSelector('[data-pk-abrir], [data-pk-sig]', { timeout: 30000 });
  if (await d.$('[data-pk-abrir]')) {
    await d.click('[data-pk-abrir]'); await armar(d, 85);
    ok('escritorio: selector abierto con +85', (await d.textContent('#pk-aum')).trim() === '+85');
  } else ok('escritorio: selector abierto con +85', false, 'no llegó mi turno');
  await d.screenshot({ path: 'poker-fichas-escritorio.png', fullPage: true });
  await d.context().close();

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
  ok('partida: ciegas 5/10 en la primera mano', /ciegas 5\/10/.test(await host.textContent('.pk-bote')));
  await host.screenshot({ path: 'poker-sala.png', fullPage: true });
  const t1 = Date.now(); let jugadas = 0, subiSala = false;
  while (Date.now() - t1 < 300000 && !((await host.$('.result h1')) && (await otro.$('.result h1')))) {
    if (!subiSala && await host.$('[data-pk-abrir]')) {
      subiSala = true;
      await host.click('[data-pk-abrir]').catch(() => {});
      const s = await selector(host);
      if (s && s.abierto) { await armar(host, s.min); await host.click('#pk-subir [data-pk="subir"]').catch(() => {}); jugadas++; await sleep(400); continue; }
    }
    for (const q of [host, otro]) if (!(await q.$('.result h1')) && await jugarTurno(q)) { jugadas++; await sleep(400); }
    await sleep(200);
  }
  const fh = await host.textContent('.result h1').catch(() => ''), fo = await otro.textContent('.result h1').catch(() => '');
  ok('partida: ambos ven el mismo final por equipos', fh && fh === fo && /equipo/i.test(fh), fh);
  ok('partida: jugadas humanas enviadas', jugadas >= 5, 'jugadas=' + jugadas);
  const est = await fetch(process.env.API + '/juegos/sala/' + codigo + '?email=marisol%40example.com').then(r => r.json()).catch(() => ({}));
  const subidas = JSON.stringify(est).match(/"accion":"subir","monto":\d+/g) || [];
  ok('partida: la subida armada con fichas llegó al servidor en múltiplos de 5', subiSala && subidas.length >= 1 && subidas.every(x => Number(x.split(':').pop()) % 5 === 0), subidas.join(' '));
  await sleep(2500);
  const g = await host.textContent('#p-guardado').catch(() => '');
  ok('partida: se guarda en puntos de partidas', /partidas/.test(g), g);
  await host.screenshot({ path: 'poker-sala-fin.png', fullPage: true });
  await b.close();
  console.log(out.join('\n')); process.exit(out.some(x => x.startsWith('FAIL')) ? 1 : 0);
})().catch(e => { console.log(out.join('\n')); console.error('ERROR', e.message.slice(0, 300)); process.exit(2); });
