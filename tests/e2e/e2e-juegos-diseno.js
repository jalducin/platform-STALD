// E2E: diseño RPG de Juegos (openspec: juegos-diseno-rpg). A 360 px, en claro, en oscuro (sistema) y con el tema del
// portal (localStorage.stald_tema = 'oscuro' con el sistema en claro):
// - encabezado #jg-heroe con avatar, nick, ⭐, 👥 y lugar de /juegos/yo;
// - «⭐ Para ti» vacío y con puntajes (state.mejores en la página, sin escribir en el servidor) y su «▶ Jugar»;
// - «👥 En vivo · Salas» → pestaña Partidas con el foco en el código, y «🏆 Copas»;
// - botones de 44 px o más, foco visible, sin scroll horizontal y contraste AA de los textos del hub;
// - las pestañas Ranking y Partidas, la pantalla del avatar y los menús de Karts, Fútbol Estelar, Billar y Golf (sin los
//   controles táctiles del mando, que son de la partida y llevan tabindex=-1).
// No escribe en el servidor: solo lee /juegos/yo y el ranking.
require('./lib/entorno'); // BASE, API, DATA, CHROME, carpeta de salida y sesión de prueba en fetch
const { chromium } = require('playwright');
const { abrirPagina } = require('./lib/navegador');
const { MENU, abrirJuego } = require('./lib/menu');
const out = []; const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const EMAIL = 'marisol@example.com';
const VISTA = { width: 360, height: 780 };

// Alto mínimo de los controles visibles (botones, enlaces-botón, selects y campos de texto) dentro de `raiz`.
const ALTO_SEL = 'button, a.home-link, .btn, select, input[type=text], input[type=email]';
const altos = (ctx, raiz = 'body') => ctx.$$eval(raiz + ' :is(' + ALTO_SEL + ')', xs => xs.filter(x => x.offsetParent && x.getClientRects().length)
  .map(x => ({ h: Math.round(x.getBoundingClientRect().height), t: (x.id || x.className || x.tagName) + ':' + (x.textContent || '').trim().slice(0, 18) })));
const minimo = l => l.reduce((a, b) => (b.h < a.h ? b : a), { h: 999, t: '' });
const sinScrollH = p => p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

// Contraste WCAG del texto de cada selector contra el primer fondo opaco hacia arriba.
const contrastes = (p, sels) => p.evaluate(ss => {
  const rgb = c => (c.match(/[\d.]+/g) || []).map(Number);
  const lum = ([r, g, b]) => { const f = x => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const fondo = el => { for (let e = el; e; e = e.parentElement) { const c = rgb(getComputedStyle(e).backgroundColor); if (c.length === 3 || (c.length === 4 && c[3] >= 0.99)) return c.slice(0, 3); } return [255, 255, 255]; };
  return ss.map(s => {
    const el = document.querySelector(s); if (!el) return { s, r: 0 };
    const a = lum(rgb(getComputedStyle(el).color).slice(0, 3)), b = lum(fondo(el));
    return { s, r: Math.round(((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)) * 100) / 100 };
  });
}, sels);

async function hub(b, tema, temaPortal) {
  const init = temaPortal ? [t => localStorage.setItem('stald_tema', t), temaPortal] : undefined;
  return abrirPagina(b, { email: EMAIL, viejo: true, tiempo: 0.05, out, etiqueta: tema, dialogos: 'aceptar', viewport: VISTA,
    contexto: { colorScheme: tema }, init, ruta: '/juegos.html', esperar: MENU });
}

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME });
  const casos = [['light', null, ''], ['dark', null, '-oscuro'], ['light', 'oscuro', '-tema-portal']];
  for (const [tema, temaPortal, suf] of casos) {
    const et = ' (' + (temaPortal ? 'stald_tema oscuro' : tema === 'dark' ? 'oscuro' : 'claro') + ')';
    const p = await hub(b, tema, temaPortal);
    // ---------- Encabezado ----------
    const yo = await p.evaluate(() => ({ nombre: state.jugador.nombre, ind: state.totalIndividual, par: state.totalPartidas, pos: state.pos, oscuro: matchMedia('(prefers-color-scheme: dark)').matches, theme: document.documentElement.dataset.theme || '' }));
    const heroe = await p.$eval('#jg-heroe', h => ({ txt: h.textContent.replace(/\s+/g, ' '), av: !!h.querySelector('.av'), ind: h.querySelector('#jg-pts-ind .rpg-dato-v').textContent, par: h.querySelector('#jg-pts-par .rpg-dato-v').textContent, lugar: h.querySelector('#jg-lugar .rpg-dato-v').textContent })).catch(() => null);
    const fmt = n => Number(n || 0).toLocaleString('es-MX');
    ok('encabezado: avatar, «¡Hola, <nick>!», ⭐, 👥 y lugar de /juegos/yo' + et, !!heroe && heroe.av && heroe.txt.includes('¡Hola, ' + yo.nombre + '!') &&
      heroe.ind === fmt(yo.ind) && heroe.par === fmt(yo.par) && heroe.lugar === (yo.pos ? '#' + yo.pos : '—'), JSON.stringify(heroe && { ...heroe, txt: '' }));
    ok('encabezado: sin nivel ni XP inventados' + et, !!heroe && !/nivel|XP/i.test(heroe.txt));
    ok('encabezado: conserva «🆕 Registrar» y agrega «🎨 Mi avatar»' + et, !!(await p.$('#jg-heroe #registrar-btn[data-a="registrar"]')) && !!(await p.$('#jg-heroe [data-heroe="avatar"]')));
    if (temaPortal) ok('stald_tema=oscuro con el sistema en claro: <html data-theme="dark">', yo.theme === 'dark' && !yo.oscuro, JSON.stringify(yo));
    // Fondo oscuro de verdad cuando toca.
    const fondoBody = await p.evaluate(() => getComputedStyle(document.body).backgroundColor);
    const debeOscuro = tema === 'dark' || temaPortal === 'oscuro';
    ok('fondo de la página acorde al tema' + et, debeOscuro ? /19, 17, 28/.test(fondoBody) : /247, 245, 251/.test(fondoBody), fondoBody);

    // ---------- Secciones ----------
    const orden = await p.$$eval('#tab-body > section', xs => xs.map(x => x.dataset.seccion || x.dataset.menu));
    ok('secciones en orden: Para ti, categorías, En vivo, Copas' + et, orden.join() === 'para-ti,categorias,en-vivo,copas', orden.join());
    ok('secciones sin .game[data-juego] (solo en la lista de una categoría)' + et, (await p.$$('#tab-body .game[data-juego]')).length === 0);
    // Para ti vacío.
    await p.evaluate(() => { state.mejores = {}; pantallaHub('juegos'); });
    ok('Para ti sin puntajes: estado vacío amable' + et, /Aún no juegas esta semana/.test(await p.textContent('[data-seccion="para-ti"]')) && (await p.$$('[data-seccion="para-ti"] .jg-tarjeta')).length === 0);
    await p.screenshot({ path: 'juegos-diseno-hub-vacio-360' + suf + '.png', fullPage: true });
    // Para ti con puntajes (solo en la página): los 3 mejores en orden.
    await p.evaluate(() => { state.mejores = { 'mente-calculo': 300, 'en-vocab': 900, karts: 50, 'mente-sudoku': 600, 'no-existe': 9999 }; pantallaHub('juegos'); });
    const pt = await p.$$eval('[data-seccion="para-ti"] .jg-tarjeta', xs => xs.map(x => ({ id: x.dataset.jg, txt: x.textContent.replace(/\s+/g, ' '), jugar: !!x.querySelector('button[data-jugar]'), cat: (x.querySelector('.jg-cat') || {}).textContent || '', clase: x.className })));
    ok('Para ti: los 3 mejores de la semana, de mayor a menor' + et, pt.map(x => x.id).join() === 'en-vocab,mente-sudoku,mente-calculo', pt.map(x => x.id).join());
    ok('Para ti: chip de categoría con color, ⭐ puntaje y botón «▶ Jugar»' + et, pt.length === 3 && pt.every(x => x.jugar && x.cat && /cat-/.test(x.clase) && /⭐/.test(x.txt) && /▶ Jugar/.test(x.txt)) && pt[0].txt.includes('⭐ 900'), JSON.stringify(pt.map(x => x.cat)));
    const copas = await p.$$eval('[data-seccion="copas"] [data-jugar]', xs => xs.map(x => x.dataset.jugar));
    ok('Copas: Karts Turbo y Fútbol Estelar con «▶ Jugar»' + et, copas.join() === 'karts,futbol', copas.join());

    // ---------- Botones, scroll y contraste ----------
    const hubAltos = await altos(p);
    ok('hub: todos los botones visibles de 44 px o más' + et, minimo(hubAltos).h >= 44, JSON.stringify(minimo(hubAltos)));
    ok('hub: sin scroll horizontal a 360 px' + et, await sinScrollH(p));
    const cs = await contrastes(p, ['#jg-hola', '.jg-lead', '#jg-pts-ind .rpg-dato-v', '#jg-pts-ind .rpg-dato-t', '.rpg-etiqueta', '.home-link', '.tab[aria-selected="false"]', '[data-seccion="para-ti"] .jg-cat', '.jg-tarjeta-t', '.cat-card .cat-n', '.cat-card .cat-d', '.jg-panel p', '#registrar-btn']);
    ok('hub: contraste AA (4.5:1) de los textos' + et, cs.every(c => c.r >= 4.5), JSON.stringify(cs.filter(c => c.r < 4.5)));
    // Foco visible con el teclado en un «▶ Jugar».
    let enJugar = false;
    for (let k = 0; k < 30 && !enJugar; k++) { await p.keyboard.press('Tab'); enJugar = await p.evaluate(() => !!document.activeElement?.dataset?.jugar); }
    const contorno = await p.evaluate(() => { const s = getComputedStyle(document.activeElement); return { estilo: s.outlineStyle, ancho: parseFloat(s.outlineWidth) }; });
    ok('foco visible (3 px) en «▶ Jugar» con Tab' + et, enJugar && contorno.estilo !== 'none' && contorno.ancho >= 3, JSON.stringify(contorno));
    await p.screenshot({ path: 'juegos-diseno-hub-360' + suf + '.png', fullPage: true });

    // ---------- Lista de una categoría ----------
    await p.click('[data-categoria="mente"]'); await p.waitForSelector('[data-menu="mente"]');
    const pildoras = await p.$$eval('.game[data-juego]', xs => xs.every(x => x.querySelector('.jg-pildora') && getComputedStyle(x, '::before').width === '5px'));
    ok('lista de categoría: tarjetas con franja de color y píldora «▶ Jugar»' + et, pildoras);
    ok('lista de categoría: botones de 44 px o más y sin scroll horizontal' + et, minimo(await altos(p)).h >= 44 && await sinScrollH(p), JSON.stringify(minimo(await altos(p))));
    await p.screenshot({ path: 'juegos-diseno-categoria-360' + suf + '.png', fullPage: true });
    await p.click('[data-a="categorias"]'); await p.waitForSelector('[data-menu="categorias"]');

    if (!suf) {
      // ▶ Jugar de Para ti abre el juego (y ✕ regresa al hub).
      await p.click('[data-seccion="para-ti"] [data-jugar="mente-calculo"]');
      await p.waitForSelector('[data-a="salir"]', { timeout: 20000 }).catch(() => {});
      ok('«▶ Jugar» de Para ti abre el juego', !!(await p.$('[data-a="salir"]')) && !(await p.$('#jg-heroe')));
      const juegoAltos = await altos(p, '#app');
      ok('dentro de un juego individual: botones de 44 px o más', minimo(juegoAltos).h >= 44, JSON.stringify(minimo(juegoAltos)));
      await p.click('[data-a="salir"]'); await p.waitForSelector(MENU);
      if (await p.$('[data-a="categorias"]')) { await p.click('[data-a="categorias"]'); await p.waitForSelector('[data-menu="categorias"]'); }
    }

    // ---------- En vivo → Partidas ----------
    await p.click('[data-seccion="en-vivo"] [data-foco="p-codigo"]'); await p.waitForSelector('#f-unirse');
    ok('En vivo: «🔑 Unirme con código» abre Partidas con el foco en el código' + et, (await p.evaluate(() => document.activeElement.id)) === 'p-codigo' && (await p.getAttribute('[data-tab="partidas"]', 'aria-selected')) === 'true');
    ok('Partidas: botones y campos de 44 px o más, sin scroll horizontal' + et, minimo(await altos(p)).h >= 44 && await sinScrollH(p), JSON.stringify(minimo(await altos(p))));
    await p.screenshot({ path: 'juegos-diseno-partidas-360' + suf + '.png', fullPage: true });

    // ---------- Ranking ----------
    await p.click('[data-tab="ranking"]'); await p.waitForSelector('[data-rtipo]');
    await p.waitForFunction(() => !document.querySelector('#tab-body .loading'), null, { timeout: 20000 }).catch(() => {});
    ok('Ranking: botones de 44 px o más, sin scroll horizontal' + et, minimo(await altos(p)).h >= 44 && await sinScrollH(p), JSON.stringify(minimo(await altos(p))));
    await p.screenshot({ path: 'juegos-diseno-ranking-360' + suf + '.png', fullPage: true });

    // ---------- Avatar ----------
    await p.click('[data-tab="juegos"]'); await p.waitForSelector('#jg-heroe');
    await p.click('[data-heroe="avatar"]'); await p.waitForSelector('[data-av-guardar]');
    ok('«🎨 Mi avatar»: abre el avatar con botones de 44 px o más, sin scroll horizontal' + et, minimo(await altos(p, '#app')).h >= 44 && await sinScrollH(p), JSON.stringify(minimo(await altos(p, '#app'))));
    await p.screenshot({ path: 'juegos-diseno-avatar-360' + suf + '.png', fullPage: true });
    await p.click('[data-a="hub"]'); await p.waitForSelector('#jg-heroe');
    await p.context().close();
  }

  // ---------- Menús de los juegos de Arcade (360 px, claro) ----------
  const p = await hub(b, 'light');
  for (const id of ['karts', 'futbol', 'billar', 'golf']) {
    await abrirJuego(p, id);
    const fr = await (await p.waitForSelector('#arcade-frame', { timeout: 30000 })).contentFrame();
    await fr.waitForSelector('button', { state: 'visible', timeout: 30000 }).catch(() => {});
    await sleep(2500);
    const hs = await fr.$$eval('button', xs => xs.filter(x => x.offsetParent && x.getClientRects().length && x.getAttribute('tabindex') !== '-1') /* sin los controles táctiles del mando (tabindex=-1) */.map(x => ({ h: Math.round(x.getBoundingClientRect().height), w: Math.round(x.getBoundingClientRect().width), t: (x.id || x.className) + ':' + x.textContent.trim().slice(0, 18) })));
    console.log('INFO menú de ' + id + ': ' + JSON.stringify(hs.filter(x => x.h < 44)));
    ok('menú de ' + id + ': botones visibles del menú de 44 px o más', hs.length > 0 && minimo(hs).h >= 44, hs.length + ' ' + JSON.stringify(minimo(hs)));
    await p.screenshot({ path: 'juegos-diseno-menu-' + id + '-360.png' });
    await p.click('[data-a="salir"]'); await p.waitForSelector(MENU);
  }
  await b.close();
  console.log(out.join('\n'));
  process.exit(out.some(l => l.startsWith('FAIL')) ? 1 : 0);
})().catch(e => { console.log(out.join('\n')); console.log('ERROR ' + (e.stack || e.message)); process.exit(1); });
