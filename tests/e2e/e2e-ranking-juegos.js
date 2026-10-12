// E2E: 🔥 Juegos más jugados de la semana en 🏆 Ranking (openspec: ranking-juegos-populares).
// Varias personas juegan juegos que nadie más jugó en la copia de datos (individual y una sala de Conquián con bots);
// la pestaña muestra el orden y los números del servidor, con el desempate por partidas. Capturas a 390 px y escritorio.
require('./lib/entorno'); // BASE, API, DATOS, DATA, CHROME, carpeta de salida y sesión de prueba en fetch
const { chromium } = require('playwright');
const API = process.env.API;
const { abrirPagina } = require('./lib/navegador');
const out = []; const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`);

const pedir = async (email, ruta, body) => {
  const r = await fetch(API + ruta + (ruta.includes('?') ? '&' : '?') + 'email=' + encodeURIComponent(email),
    body === undefined ? {} : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  return { status: r.status, body: await r.json() };
};
const partida = (email, juego, puntos, extra = {}) => pedir(email, '/juegos/partida', { juego, puntos, aciertos: 5, total: 10, segundos: 60, ...extra });

(async () => {
  // Jugadores invitados nuevos en cada corrida: la fase `base` comparte servidor y otras pruebas ya jugaron estos
  // juegos, así que se compara contra el top de antes (antes + lo que juega esta prueba).
  const sufijo = Date.now().toString(36);
  const [g1, g2, g3, g4] = ['Gabo', 'Ximena', 'Tono', 'Paty'].map(n => `rj-${n.toLowerCase()}-${sufijo}@example.com`);
  const altas = [];
  for (const [e, n] of [[g1, 'Gabo'], [g2, 'Ximena'], [g3, 'Tono'], [g4, 'Paty']]) altas.push(await pedir(e, '/juegos/invitado', { nombre: n, acepto: true }));
  ok('alta de 4 invitados de prueba', altas.every(r => r.status === 200), altas.map(r => r.status).join(','));
  const antes = await pedir('marisol@example.com', '/juegos/ranking/juegos');
  ok('ruta del top responde 200', antes.status === 200, JSON.stringify(antes.body).slice(0, 120));

  // Individuales: Sopa de letras (3 personas), Ordena la oración (2 personas, 4 partidas), Completa y responde (1).
  const envios = [];
  for (const e of [g1, g2, g3]) envios.push(await partida(e, 'mente-sopa', 300));
  for (let i = 0; i < 3; i++) envios.push(await partida(g1, 'es-ordena', 200 + i));
  envios.push(await partida(g2, 'es-ordena', 800));
  envios.push(await partida(g4, 'en-frases', 150));
  // Sala de Conquián con bots: Ximena (host) y Toño; los bots no envían partidas.
  const sala = await pedir(g2, '/juegos/sala', { juego: 'conquian', bots: true });
  const codigo = sala.body.codigo;
  envios.push(await pedir(g3, `/juegos/sala/${codigo}/unirse`, {}));
  envios.push(await pedir(g2, `/juegos/sala/${codigo}/empezar`, {}));
  envios.push(await partida(g2, 'conquian', 900, { sala: codigo }));
  envios.push(await partida(g3, 'conquian', 400, { sala: codigo }));
  ok('sala de Conquián con bots', sala.status === 200 && sala.body.sala.bots === true, codigo);
  ok('todas las partidas se guardan', envios.every(r => r.status === 200), envios.map(r => r.status).join(','));

  const api = await pedir('marisol@example.com', '/juegos/ranking/juegos');
  const de = (r, id) => r.body.juegos.find(j => j.id === id) || { jugadores: 0, partidas: 0 };
  const suma = (id, jug, par) => { const a = de(antes, id), d = de(api, id); return d.jugadores === a.jugadores + jug && d.partidas === a.partidas + par; };
  const ordenado = api.body.juegos.every((j, i, a) => i === 0 || a[i - 1].jugadores > j.jugadores || (a[i - 1].jugadores === j.jugadores && (a[i - 1].partidas > j.partidas || (a[i - 1].partidas === j.partidas && a[i - 1].titulo.localeCompare(j.titulo, 'es-MX') <= 0))));
  ok('el servidor ordena por jugadores, luego partidas y título', ordenado && api.body.juegos.every((j, i) => j.pos === i + 1), api.body.juegos.map(j => `${j.id}:${j.jugadores}/${j.partidas}`).join(' '));
  ok('Sopa de letras: +3 jugadores y +3 partidas', suma('mente-sopa', 3, 3), JSON.stringify([de(antes, 'mente-sopa'), de(api, 'mente-sopa')]));
  ok('Ordena la oración: +2 jugadores y +4 partidas', suma('es-ordena', 2, 4), JSON.stringify([de(antes, 'es-ordena'), de(api, 'es-ordena')]));
  ok('Conquián con bots: solo +2 jugadores y +2 partidas', suma('conquian', 2, 2), JSON.stringify([de(antes, 'conquian'), de(api, 'conquian')]));
  ok('Completa y responde: +1 jugador y +1 partida', suma('en-frases', 1, 1));
  ok('jugadores de la semana: +4 personas', api.body.jugadores === antes.body.jugadores + 4, `${antes.body.jugadores} → ${api.body.jugadores}`);
  ok('sin correos en el top', !JSON.stringify(api.body).includes('@'));

  const b = await chromium.launch({ executablePath: process.env.CHROME });
  const revisar = async (p, nombre) => {
    await p.click('[data-tab="ranking"]'); await p.waitForSelector('[data-rtipo="juegos"]');
    await p.click('[data-rtipo="juegos"]'); await p.waitForSelector('#rank-juegos li, #tab-body .card.muted', { timeout: 30000 });
    const ui = await p.$$eval('#rank-juegos li', ls => ls.map(l => ({ id: l.dataset.rj, pos: l.querySelector('.pos').textContent, txt: l.textContent, ancho: l.querySelector('.rj-barra span').style.width })));
    const sub = await p.$$eval('[data-rtipo]', bs => bs.map(x => x.dataset.rtipo + ':' + x.getAttribute('aria-pressed')));
    ok(`${nombre}: sub-pestañas ⭐ 👥 🔥 con 🔥 activa`, sub.join(',') === 'individual:false,partidas:false,juegos:true', sub.join(','));
    ok(`${nombre}: encabezado «Semana del … al …»`, /Semana del .+ al .+/.test(await p.textContent('#tab-body p.muted')), await p.textContent('#tab-body p.muted'));
    ok(`${nombre}: lista semántica con nombre accesible`, (await p.getAttribute('#rank-juegos', 'aria-label')) === 'Juegos más jugados de la semana');
    ok(`${nombre}: mismo orden que el servidor`, ui.map(x => x.id).join() === api.body.juegos.map(j => j.id).join(), ui.map(x => x.id).join());
    ok(`${nombre}: 🥇🥈🥉 en el top 3 y número después`, ui[0].pos === '🥇' && ui[1].pos === '🥈' && ui[2].pos === '🥉' && (!ui[3] || ui[3].pos === '4'));
    const fila = id => ui.find(x => x.id === id) || { txt: '' };
    const n = (k, uno, varios) => k.toLocaleString('es-MX') + ' ' + (k === 1 ? uno : varios);
    const iguales = api.body.juegos.every(j => fila(j.id).txt.includes(j.titulo + n(j.jugadores, 'jugador', 'jugadores') + ' · ' + n(j.partidas, 'partida', 'partidas')));
    ok(`${nombre}: cada fila con el título y «N jugadores · M partidas» del servidor (singular con 1)`, iguales, fila('mente-sopa').txt);
    ok(`${nombre}: 🔎 Sopa de letras con su emoji`, fila('mente-sopa').txt.includes('🔎Sopa de letras'), fila('mente-sopa').txt);
    const conMejor = api.body.juegos.filter(j => j.mejor);
    ok(`${nombre}: 👑 Mejor puntaje con el nick y los puntos del servidor`, conMejor.length > 0 && conMejor.every(j => fila(j.id).txt.includes('👑 Mejor puntaje: ' + j.mejor.nombre + ' · ' + n(j.mejor.puntos, 'punto', 'puntos'))), conMejor[0] && fila(conMejor[0].id).txt); // openspec: ranking-juegos-puntos
    ok(`${nombre}: nombres distintos (sin dos «Ordena la oración» iguales)`, new Set(api.body.juegos.map(j => j.titulo)).size === ui.length, fila('en-ordena').txt);
    ok(`${nombre}: barra del líder al 100 %`, ui[0].ancho === '100%', ui[0].ancho);
    // Top 10 (openspec: ranking-juegos-top10): como mucho 10 visibles; con más, el botón despliega y pliega.
    const visibles = () => p.$$eval('#rank-juegos li', ls => ls.filter(l => l.offsetParent !== null).length);
    const total = api.body.juegos.length, vis = await visibles();
    ok(`${nombre}: top 10 visible (${total} juegos)`, vis === Math.min(10, total), vis + ' de ' + total);
    if (total > 10) {
      ok(`${nombre}: botón «Ver los ${total} juegos»`, (await p.textContent('#rj-todos')).includes('Ver los ' + total + ' juegos') && (await p.getAttribute('#rj-todos', 'aria-expanded')) === 'false');
      await p.click('#rj-todos');
      ok(`${nombre}: al tocarlo se ven los ${total}`, (await visibles()) === total && (await p.getAttribute('#rj-todos', 'aria-expanded')) === 'true' && (await p.textContent('#rj-todos')).includes('Ver solo el top 10'));
      await p.click('#rj-todos');
      ok(`${nombre}: «Ver solo el top 10» vuelve a plegar`, (await visibles()) === 10);
    } else ok(`${nombre}: sin botón con 10 o menos juegos`, !(await p.$('#rj-todos')));
    const desborde = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    ok(`${nombre}: sin desborde horizontal`, desborde <= 0, String(desborde));
  };

  const cel = await abrirPagina(b, { email: 'marisol@example.com', out, ruta: '/juegos.html', esperar: '[data-juego]' });
  await revisar(cel, '390 px');
  const alto = await cel.$eval('[data-rtipo="juegos"]', x => x.getBoundingClientRect().top === document.querySelector('[data-rtipo="individual"]').getBoundingClientRect().top);
  ok('390 px: las tres sub-pestañas en una fila', alto);
  await cel.screenshot({ path: 'ranking-juegos-390.png', fullPage: true });
  // Vuelve a ⭐ Individuales sin romper el ranking de personas.
  await cel.click('[data-rtipo="individual"]'); await cel.waitForSelector('[data-rtipo="individual"][aria-pressed="true"]');
  await cel.waitForSelector('.rank li');
  ok('⭐ Individuales sigue mostrando personas', (await cel.$$('#rank-juegos')).length === 0 && (await cel.$$('.rank li')).length > 0);

  const esc = await abrirPagina(b, { email: 'angel@example.com', out, viewport: { width: 1280, height: 900 }, ruta: '/juegos.html', esperar: '[data-juego]' });
  await revisar(esc, 'escritorio');
  await esc.screenshot({ path: 'ranking-juegos-escritorio.png', fullPage: true });

  // Top 10 con 12 juegos (openspec: ranking-juegos-top10): la respuesta se intercepta para tener más de 10.
  const doce = await abrirPagina(b, { email: 'marisol@example.com', out, ruta: '/juegos.html', esperar: '[data-juego]' });
  await doce.route('**/juegos/ranking/juegos*', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ semana: '2026-09-28', jugadores: 30,
    juegos: Array.from({ length: 12 }, (_, i) => ({ pos: i + 1, id: 'juego-' + i, titulo: 'Juego ' + (i + 1), jugadores: 12 - i, partidas: 20 - i, mejor: null })) }) }));
  await doce.click('[data-tab="ranking"]'); await doce.click('[data-rtipo="juegos"]'); await doce.waitForSelector('#rank-juegos li');
  const vis12 = () => doce.$$eval('#rank-juegos li', ls => ls.filter(l => l.offsetParent !== null).length);
  ok('12 juegos: se ven 10 y el botón «Ver los 12 juegos»', (await vis12()) === 10 && (await doce.textContent('#rj-todos')).includes('Ver los 12 juegos'));
  await doce.click('#rj-todos');
  ok('12 juegos: al tocarlo se ven los 12', (await vis12()) === 12 && (await doce.getAttribute('#rj-todos', 'aria-expanded')) === 'true');
  await doce.screenshot({ path: 'ranking-juegos-todos-390.png', fullPage: true });
  await doce.click('#rj-todos');
  ok('12 juegos: vuelve al top 10', (await vis12()) === 10);

  // Semana sin juegos: la ruta responde vacío y la página muestra el mensaje amable.
  const vacia = await pedir('marisol@example.com', '/juegos/ranking/juegos?semana=2026-09-14');
  ok('semana sin juegos: juegos []', vacia.status === 200 && vacia.body.juegos.length === 0 && vacia.body.jugadores === 0, JSON.stringify(vacia.body));
  const v = await abrirPagina(b, { email: 'laura@example.com', out, ruta: '/juegos.html', esperar: '[data-juego]' });
  await v.route('**/juegos/ranking/juegos*', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(vacia.body) }));
  await v.click('[data-tab="ranking"]'); await v.click('[data-rtipo="juegos"]');
  await v.waitForSelector('#tab-body .card.muted');
  ok('vacío amable', (await v.textContent('#tab-body .card.muted')).includes('Todavía nadie juega esta semana. ¡Estrena un juego!'));
  await v.screenshot({ path: 'ranking-juegos-vacio-390.png' });

  // Errores: semana inválida y correo sin registro.
  const mala = await pedir('marisol@example.com', '/juegos/ranking/juegos?semana=ayer');
  ok('semana inválida → 400', mala.status === 400 && mala.body.error === 'semana_invalida');
  const nadie = await pedir('nadie@example.com', '/juegos/ranking/juegos');
  ok('sin registro → 403', nadie.status === 403 && nadie.body.error === 'no_registrado', String(nadie.status));

  await b.close();
  console.log(out.join('\n')); process.exit(out.some(x => x.startsWith('FAIL')) ? 1 : 0);
})().catch(e => { console.log(out.join('\n')); console.error('ERROR', e.message.slice(0, 400)); process.exit(2); });
