// E2E: revancha con los mismos jugadores (openspec: revancha-partidas).
// Cuatro personas y bots terminan una Maratón de cultura corta. Dos tocan «Otra con los mismos» casi a la vez y caen
// en la misma sala nueva; la tercera se une desde el aviso del podio; la cuarta recarga en el podio y se une desde el
// inicio de Juegos. Capturas a 390 px. También revisa los errores de la ruta (no terminó, no jugó).
require('./lib/entorno'); // BASE, API, CHROME, carpeta de salida y sesión de prueba en fetch
const { chromium } = require('playwright');
const { abrirPagina } = require('./lib/navegador');
const API = process.env.API;
const out = []; const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`);

const jugador = (b, email) => abrirPagina(b, { email, viejo: true, tiempo: 0.3, out, ruta: '/juegos.html', esperar: '[data-juego]' });
const salaApi = async (codigo, email) => (await fetch(API + '/juegos/sala/' + codigo + '?email=' + encodeURIComponent(email))).json();
const revanchaApi = async (codigo, email) => { const r = await fetch(API + '/juegos/sala/' + codigo + '/revancha?email=' + encodeURIComponent(email), { method: 'POST', body: '{}' }); return { status: r.status, body: await r.json() }; };
const codigoDe = async p => ((await p.textContent('#p-codigo-chip').catch(() => '')) || '').replace(/[^A-Z]/g, '');
// Espera a que la página esté en la sala de espera de una sala distinta de `viejo` y devuelve su código.
async function enSalaNueva(p, viejo) {
  await p.waitForFunction(v => { const c = document.getElementById('p-codigo-chip'); return c && !c.textContent.includes(v) && document.querySelector('#p-body .letra'); }, viejo, { timeout: 30000 });
  return codigoDe(p);
}

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME });
  const [mar, ang, jes, lau] = await Promise.all(['marisol', 'angel', 'jesus', 'laura'].map(n => jugador(b, n + '@example.com')));

  // ---- Partida corta: Maratón de cultura con bots ----
  await mar.click('[data-tab="partidas"]'); await mar.waitForSelector('#f-crear');
  await mar.selectOption('#p-juego', 'cultura'); await mar.click('#f-crear button[type=submit]');
  await mar.waitForSelector('[data-p="empezar"]', { timeout: 30000 });
  const viejo = (await mar.textContent('.letra')).trim();
  for (const p of [ang, jes, lau]) {
    await p.click('[data-tab="partidas"]'); await p.waitForSelector('#f-crear');
    await p.fill('#p-codigo', viejo); await p.click('#f-unirse button[type=submit]'); await p.waitForSelector('#p-codigo-chip', { timeout: 30000 });
  }
  const espera = await revanchaApi(viejo, 'angel@example.com');
  ok('revancha antes de terminar: 409 no_termino', espera.status === 409 && espera.body.error === 'no_termino', JSON.stringify(espera));
  await mar.waitForFunction(() => /\(6\)/.test((document.querySelector('#p-body h2') || {}).textContent || ''), null, { timeout: 30000 }).catch(() => {});
  await mar.click('[data-p="empezar"]');
  await Promise.all([mar, ang, jes, lau].map(p => p.waitForSelector('#p-body .result', { timeout: 240000 })));
  ok('las cuatro personas llegan al podio', true);
  const botones = await Promise.all([mar, ang, jes, lau].map(p => p.waitForSelector('[data-p="revancha"]', { timeout: 10000 }).then(x => x.textContent()).catch(() => '')));
  ok('el podio ofrece «Otra con los mismos» a todos', botones.every(t => t.includes('Otra con los mismos')), botones.join(' | '));
  await mar.screenshot({ path: 'revancha-podio.png', fullPage: true });
  const fuera = await revanchaApi(viejo, 'fernando@example.com');
  ok('quien no jugó no puede pedirla (403)', fuera.status === 403, JSON.stringify(fuera));
  const marca = JSON.parse(await lau.evaluate(() => localStorage.getItem('juegos_revancha')) || 'null');
  ok('al terminar queda la marca de revancha (sin correo) y se limpia la sala guardada', marca && marca.codigo === viejo && !JSON.stringify(marca).includes('@') &&
    (await lau.evaluate(() => localStorage.getItem('juegos_sala_activa'))) === null, JSON.stringify(marca));

  // ---- Dos personas tocan a la vez ----
  await Promise.all([mar.click('[data-p="revancha"]'), ang.click('[data-p="revancha"]')]);
  const [nm, na] = await Promise.all([enSalaNueva(mar, viejo), enSalaNueva(ang, viejo)]);
  ok('las dos caen en la misma sala nueva', nm && nm === na && nm !== viejo, nm + ' / ' + na);
  const nuevo = nm;
  const sn = await salaApi(nuevo, 'marisol@example.com');
  ok('misma configuración: Maratón de cultura, categoría y bots', sn.sala && sn.sala.juego === 'cultura' && sn.sala.opciones.cat === 'todas' && sn.sala.bots === true && sn.sala.inicio === null, JSON.stringify(sn.sala));
  const anfitrion = sn.jugadores.find(j => j.id === sn.sala.host);
  ok('la anfitriona es una de las dos que la pidieron', !!anfitrion && ['Marisol', 'Angel'].includes(anfitrion.nombre), anfitrion && anfitrion.nombre);
  const hosts = (await Promise.all([mar, ang].map(p => p.$('[data-p="empezar"]')))).filter(Boolean).length;
  ok('solo una ve «Empezar partida»', hosts === 1, String(hosts));
  ok('la sala vieja apunta a la nueva', (await salaApi(viejo, 'jesus@example.com')).sala.siguiente === nuevo);
  ok('la URL lleva la sala nueva', new URL(mar.url()).searchParams.get('sala') === nuevo, mar.url());

  // ---- La tercera se une desde el aviso del podio ----
  await jes.waitForSelector('.revancha-aviso', { timeout: 30000 });
  const aviso = await jes.textContent('#p-revancha');
  ok('el podio de Jesús avisa quién abrió la revancha', aviso.includes(anfitrion.nombre + ' abrió la revancha') && aviso.includes('Unirme'), aviso);
  await jes.screenshot({ path: 'revancha-aviso.png', fullPage: true });
  await jes.click('[data-p="revancha"]');
  ok('Jesús entra a la misma sala con un toque', (await enSalaNueva(jes, viejo)) === nuevo);

  // ---- La cuarta recarga en el podio y se une desde el inicio ----
  await lau.reload(); await lau.waitForSelector('#revancha-inicio', { timeout: 30000 });
  const tarjeta = await lau.textContent('#revancha-inicio');
  ok('al recargar en el podio, el inicio ofrece la revancha', tarjeta.includes('abrió la revancha') && !!(await lau.$('[data-juego]')) && !new URL(lau.url()).searchParams.get('sala'), tarjeta);
  await lau.screenshot({ path: 'revancha-recarga.png', fullPage: true });
  await lau.click('[data-a="revancha-inicio"]');
  ok('Laura entra a la misma sala tras recargar', (await enSalaNueva(lau, viejo)) === nuevo);
  ok('ya no queda la marca de revancha', (await lau.evaluate(() => localStorage.getItem('juegos_revancha'))) === null);

  // ---- Sala nueva completa y se puede jugar ----
  const fin = await salaApi(nuevo, 'laura@example.com');
  const nombres = fin.jugadores.map(j => j.nombre).sort();
  ok('la sala nueva tiene a las cuatro personas, sin duplicar', nombres.join(',') === 'Angel,Jesús,Laura,Marisol' || (nombres.length === 4 && new Set(nombres).size === 4), nombres.join(','));
  const host = anfitrion.nombre === 'Marisol' ? mar : ang;
  await host.waitForFunction(() => /\(6\)/.test((document.querySelector('#p-body h2') || {}).textContent || ''), null, { timeout: 30000 }).catch(() => {});
  await host.screenshot({ path: 'revancha-sala.png', fullPage: true });
  const ancho = await host.evaluate(() => document.documentElement.scrollWidth);
  ok('a 390 px no hay desplazamiento horizontal', ancho <= 390, String(ancho));
  await host.click('[data-p="empezar"]');
  await Promise.all([mar, ang, jes, lau].map(p => p.waitForSelector('#p-body .q-card', { timeout: 30000 })));
  ok('la revancha empieza para las cuatro', true);
  const tarde = await revanchaApi(viejo, 'marisol@example.com');
  ok('pedirla otra vez devuelve la misma sala (ya dentro)', tarde.status === 200 && tarde.body.codigo === nuevo, JSON.stringify(tarde));

  await b.close();
  console.log(out.join('\n')); process.exit(out.some(x => x.startsWith('FAIL')) ? 1 : 0);
})().catch(e => { console.log(out.join('\n')); console.error('ERROR', e.message.slice(0, 400)); process.exit(2); });
