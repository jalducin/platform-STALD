// E2E: portal con diseño RPG (openspec: portal-diseno-rpg). A 360 px, en claro y en oscuro (sistema), para:
// - alumna de Secundaria: héroe con su nombre, avance de la semana y racha (sin nivel ni XP), tarjetas Secundaria
//   («… hoy») y Juegos, y «🗓️ Mi horario»;
// - alumno de Inglés: tarjetas Inglés y Juegos y el atajo de Material, sin avance RPG inventado;
// - invitado de Juegos (registrado por la API en la copia temporal de datos): solo la tarjeta Juegos, a todo el ancho;
// - admin: «Modo maestro», 4 tarjetas, selector de alumna de Secundaria que cambia el botón sin pedir nada al servidor,
//   y «🔑 Restablecer contraseña»;
// - sin sesión: entrada con correo, contraseña, «¿Olvidaste tu contraseña?», «Crea tu cuenta de Juegos» y el selector de
//   tema (guarda stald_tema y se conserva al recargar); index.html?juegos=1 lleva al registro de Juegos.
// En todos: botones de 44 px o más, sin scroll horizontal, contraste AA de los textos, foco visible, sin errores de
// consola y el pie sin enlaces legales con el interruptor `privacidad` apagado.
require('./lib/entorno'); // BASE, API, DATA, CHROME, carpeta de salida y sesión de prueba en fetch
require('../../comun/gamificacion.js'); // globalThis.Gamificacion (lo usa secundaria-datos)
require('../../comun/secundaria-datos.js'); // globalThis.SecundariaDatos: avance esperado de la semana
const { chromium } = require('playwright');
const { abrirPagina, urlDe } = require('./lib/navegador');
const API = process.env.API;
const out = []; const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`);
const VISTA = { width: 360, height: 780 };
const SEC = 'valeria@example.com';
const INGLES = 'marisol@example.com';
const ADMIN = 'admin@example.com';
const INVITADO = 'portal.invitado@example.com';
const APODO = 'Portalito';

// Alto mínimo de los controles visibles.
const CONTROLES = 'button, a.btn, .link-btn, select, input[type=email], input[type=password], .atajo-material, .tema-btn, .av-link, .pie-legal a';
const altos = p => p.$$eval(CONTROLES, xs => xs.filter(x => x.offsetParent && x.getClientRects().length)
  .map(x => ({ h: Math.round(x.getBoundingClientRect().height), t: (x.id || x.className || x.tagName) + ':' + (x.textContent || '').trim().slice(0, 18) })));
const minimo = l => l.reduce((a, b) => (b.h < a.h ? b : a), { h: 999, t: '' });
const sinScrollH = p => p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
const visible = (p, s) => p.$eval(s, e => !!e.offsetParent && !e.hidden).catch(() => false);
const texto = (p, s) => p.$eval(s, e => e.textContent.replace(/\s+/g, ' ').trim()).catch(() => '');

// Contraste WCAG del texto de cada selector (todos los visibles) contra el primer fondo opaco hacia arriba.
const contrastes = (p, sels) => p.evaluate(ss => {
  const rgb = c => (c.match(/[\d.]+/g) || []).map(Number);
  const lum = ([r, g, b]) => { const f = x => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const fondo = el => { for (let e = el; e; e = e.parentElement) { const c = rgb(getComputedStyle(e).backgroundColor); if (c.length === 3 || (c.length === 4 && c[3] >= 0.99)) return c.slice(0, 3); } return [255, 255, 255]; };
  const r = [];
  for (const s of ss) for (const el of document.querySelectorAll(s)) {
    if (!el.offsetParent || !el.textContent.trim()) continue;
    const a = lum(rgb(getComputedStyle(el).color).slice(0, 3)), b = lum(fondo(el));
    r.push({ s, r: Math.round(((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)) * 100) / 100 });
  }
  return r;
}, sels);
const TEXTOS_HOME = ['#hello', '.date', '.heroe .sub', '#portal-etiqueta', '#admin-tag', '.avance-linea span', '.rpg-dato-t', '.rpg-dato-v', '.seccion-t', '.area-t',
  '.area-d', '.area-estado', '.area .btn', '.area label', '.atajo-material', '.sec-portal h2', '.sec-hoy-toca b', '.sec-mini-d', '.sec-acciones .btn', '.admin-box h2', '.admin-box .hint', '.who', '.link-btn', 'footer'];
const TEXTOS_LOGIN = ['.entrada-heroe h1', '.entrada-heroe .lead', '.entrada-heroe .rpg-etiqueta', '.entrada-areas li', '.entrada-form h2', 'label', '#login-hint', '.guest-t', '.guest .hint', '#login-btn', '#juegos-cta-btn', '#olvide-btn', 'footer'];

// Revisión común a 360 px: botones, scroll, contraste, consola y pie apagado.
async function revisar(p, et, textos, errores) {
  await p.waitForFunction(() => document.documentElement.dataset.interruptores === 'listo', null, { timeout: 30000 }).catch(() => {});
  const m = minimo(await altos(p));
  ok('botones visibles de 44 px o más' + et, m.h >= 44, JSON.stringify(m));
  ok('sin scroll horizontal a 360 px' + et, await sinScrollH(p));
  const cs = await contrastes(p, textos);
  ok('contraste AA (4.5:1) de los textos' + et, cs.length > 0 && cs.every(c => c.r >= 4.5), JSON.stringify(cs.filter(c => c.r < 4.5)));
  ok('pie sin enlaces legales (interruptor apagado)' + et, !(await visible(p, '.pie-legal')) && (await p.$$eval('a[href^="privacidad.html"], a[href^="consentimiento.html"]', xs => xs.filter(x => x.offsetParent).length)) === 0);
  ok('sin errores de consola' + et, errores.length === 0, errores.slice(0, 3).join(' | '));
}

async function abrir(b, email, tema, ruta = '/') {
  const p = await abrirPagina(b, { email, viejo: email ? true : undefined, out, etiqueta: (email || 'sin sesión') + ' ' + tema, viewport: VISTA, contexto: { colorScheme: tema } });
  p.errores = [];
  p.on('console', m => { if (m.type() === 'error') p.errores.push(m.text()); });
  await p.goto(urlDe(ruta));
  return p;
}
const tarjetas = p => p.$$eval('#tiles [data-espacio]', xs => xs.map(x => x.dataset.espacio));

(async () => {
  // Invitado de Juegos registrado por la API (copia temporal de datos; sesión de prueba con ?email=).
  const reg = await fetch(API + '/juegos/invitado?email=' + encodeURIComponent(INVITADO), { method: 'POST', headers: { 'content-type': 'text/plain;charset=UTF-8' }, body: JSON.stringify({ nombre: APODO, acepto: true }) });
  ok('invitado de Juegos registrado (copia temporal)', reg.ok, String(reg.status));

  const b = await chromium.launch({ executablePath: process.env.CHROME });
  for (const tema of ['light', 'dark']) {
    const suf = tema === 'dark' ? '-oscuro' : '';
    const T = tema === 'dark' ? ' (oscuro)' : ' (claro)';

    // ---------- Alumna de Secundaria ----------
    {
      const p = await abrir(b, SEC, tema);
      await p.waitForSelector('#home:not([hidden])', { timeout: 60000 });
      await p.waitForSelector('#sec-hoy-toca, #sec-portal .sec-aviso:not(:empty)', { timeout: 60000 }).catch(() => {});
      await p.waitForFunction(() => !/Cargando/.test(document.getElementById('sec-portal').textContent), null, { timeout: 60000 }).catch(() => {});
      await p.waitForTimeout(800);
      const et = ' · Secundaria' + T;
      ok('héroe con saludo, fecha y etiqueta' + et, (await visible(p, '#portal-heroe')) && /Hola, \S+/.test(await texto(p, '#hello')) && (await texto(p, '#date')).length > 5 && (await texto(p, '#portal-etiqueta')) === '🏠 Tu inicio', await texto(p, '#hello'));
      ok('tarjetas Secundaria y Juegos con botón real' + et, JSON.stringify(await tarjetas(p)) === '["secundaria","juegos"]' && (await p.$$('#tiles a.btn[data-espacio]')).length === 2, (await tarjetas(p)).join());
      const estado = await texto(p, '[data-estado="secundaria"]');
      ok('línea de estado de Secundaria con las clases de hoy' + et, /clases? hoy|Hoy no tienes clases/.test(estado), estado);
      const heroe = await texto(p, '#portal-heroe');
      ok('héroe sin nivel ni XP inventados' + et, !/\bNv\.|\bXP\b|Nivel/i.test(heroe), heroe);
      // Avance esperado con la misma respuesta de /secundaria/actividades: visible solo con clases en la semana o racha.
      const act = await (await fetch(API + '/secundaria/actividades?email=' + encodeURIComponent(SEC))).json();
      const SD = globalThis.SecundariaDatos, prog = SD.progresoSemana(act.items || [], act.hoy), racha = SD.rachaDe(act);
      const av = await p.$eval('#portal-avance', e => ({ ver: !e.hidden, barra: !!e.querySelector('.rpg-xp-barra[role="progressbar"]'), racha: (e.querySelector('#portal-racha .rpg-num') || {}).textContent, txt: e.textContent.replace(/\s+/g, ' ') }));
      if (prog.total || racha.dias) ok('avance: semana ' + prog.hechas + ' / ' + prog.total + ' con barra y racha ' + racha.dias + et, av.ver && av.barra && av.txt.includes(prog.hechas + ' / ' + prog.total + ' clases') && av.racha === String(racha.dias), av.txt);
      else ok('avance: oculto sin clases en la semana ni racha (hoy ' + act.hoy + ')' + et, !av.ver);
      ok('«🗓️ Mi horario» con el estilo del portal' + et, await visible(p, '#sec-portal'));
      await revisar(p, et, TEXTOS_HOME, p.errores);
      await p.screenshot({ path: 'portal-diseno-secundaria-360' + suf + '.png', fullPage: true });
      // Foco visible con el teclado en el botón de una tarjeta.
      let enTarjeta = false;
      for (let k = 0; k < 20 && !enTarjeta; k++) { await p.keyboard.press('Tab'); enTarjeta = await p.evaluate(() => !!document.activeElement?.dataset?.espacio); }
      const contorno = await p.evaluate(() => { const s = getComputedStyle(document.activeElement); return { estilo: s.outlineStyle, ancho: parseFloat(s.outlineWidth) }; });
      ok('foco visible (3 px) en el botón de una tarjeta con Tab' + et, enTarjeta && contorno.estilo !== 'none' && contorno.ancho >= 3, JSON.stringify(contorno));
      await p.context().close();
    }

    // ---------- Alumno de Inglés ----------
    {
      const p = await abrir(b, INGLES, tema);
      await p.waitForSelector('#home:not([hidden])', { timeout: 60000 });
      await p.waitForSelector('[data-estado="juegos"]:not([hidden])', { timeout: 30000 }).catch(() => {});
      const et = ' · Inglés' + T;
      ok('tarjetas Inglés y Juegos, atajo de Material' + et, JSON.stringify(await tarjetas(p)) === '["ingles","juegos"]' && await visible(p, '#material-link'), (await tarjetas(p)).join());
      ok('sin avance RPG ni horario de Secundaria' + et, !(await visible(p, '#portal-avance')) && !(await visible(p, '#sec-portal')));
      ok('Inglés sin línea de estado (sin dato en el portal)' + et, !(await visible(p, '[data-estado="ingles"]')));
      // La línea de Juegos sale de /juegos/yo: puntos individuales con su lugar del ranking individual.
      const yo = await (await fetch(API + '/juegos/yo?email=' + encodeURIComponent(INGLES))).json();
      const lineaJ = await texto(p, '[data-estado="juegos"]');
      const esperada = yo.totalIndividual ? '⭐ ' + Number(yo.totalIndividual).toLocaleString('es-MX') + ' puntos individuales esta semana' + (yo.pos ? ' · #' + yo.pos : '') : null;
      ok('Juegos con su línea de la semana (/juegos/yo, individuales con su lugar)' + et, esperada ? lineaJ === esperada : /puntos en partidas esta semana|Aún no juegas esta semana/.test(lineaJ), lineaJ + ' | esperada: ' + esperada);
      ok('avatar de Juegos dentro del saludo' + et, !!(await p.$('#hello .av')));
      await revisar(p, et, TEXTOS_HOME, p.errores);
      await p.screenshot({ path: 'portal-diseno-ingles-360' + suf + '.png', fullPage: true });
      await p.context().close();
    }

    // ---------- Invitado de Juegos ----------
    {
      const p = await abrir(b, INVITADO, tema);
      await p.waitForSelector('#home:not([hidden])', { timeout: 60000 });
      await p.waitForSelector('[data-estado="juegos"]:not([hidden])', { timeout: 30000 }).catch(() => {});
      const et = ' · invitado' + T;
      ok('saludo con su apodo y etiqueta de Juegos' + et, (await texto(p, '#hello')).includes(APODO) && (await texto(p, '#portal-etiqueta')).includes('Juegos'), await texto(p, '#hello'));
      ok('solo la tarjeta Juegos, a todo el ancho' + et, JSON.stringify(await tarjetas(p)) === '["juegos"]' && await p.$eval('#area-juegos', e => e.classList.contains('wide')));
      ok('sin Material, horario ni bloque del admin' + et, !(await visible(p, '#material-link')) && !(await visible(p, '#sec-portal')) && !(await visible(p, '#admin-link')));
      await revisar(p, et, TEXTOS_HOME, p.errores);
      await p.screenshot({ path: 'portal-diseno-invitado-360' + suf + '.png', fullPage: true });
      await p.context().close();
    }

    // ---------- Admin ----------
    {
      const p = await abrir(b, ADMIN, tema);
      await p.waitForSelector('#home:not([hidden])', { timeout: 60000 });
      await p.waitForSelector('#sec-alumna-portal', { timeout: 60000 }).catch(() => {});
      await p.waitForSelector('#sec-hoy-toca', { timeout: 60000 }).catch(() => {});
      const et = ' · admin' + T;
      ok('Modo maestro y etiqueta del profe' + et, (await visible(p, '#admin-tag')) && (await texto(p, '#portal-etiqueta')).includes('profe'));
      ok('4 tarjetas: Inglés, Mi ruta, Secundaria y Juegos' + et, JSON.stringify(await tarjetas(p)) === '["ingles","profe","secundaria","juegos"]', (await tarjetas(p)).join());
      ok('botones: panel de Inglés y Mi ruta' + et, (await p.getAttribute('a[data-espacio="ingles"]', 'href')).startsWith('ingles.html') && (await p.getAttribute('a[data-espacio="profe"]', 'href')).includes('modo=profe'));
      const opciones = await p.$$eval('#sec-alumna-portal option', xs => xs.map(x => x.value)).catch(() => []);
      ok('selector de alumna o alumno con la lista de Secundaria' + et, opciones.length >= 1 && (await p.getAttribute('a[data-espacio="secundaria"]', 'href')).includes('alumna=' + encodeURIComponent(opciones[0])), opciones.join());
      ok('línea de Secundaria con el número de alumnas y alumnos' + et, /\d+ alumna/.test(await texto(p, '[data-estado="secundaria"]')), await texto(p, '[data-estado="secundaria"]'));
      if (tema === 'light') {
        // Si la copia trae una sola persona, se agrega una opción solo en la página para probar el cambio de destino.
        if (opciones.length < 2) await p.$eval('#sec-alumna-portal', s => s.add(new Option('Otra persona', 'otra-prueba')));
        const otra = opciones[1] || 'otra-prueba';
        const pedidas = []; const escucha = r => { if (r.url().startsWith(API)) pedidas.push(r.url()); };
        p.on('request', escucha);
        await p.selectOption('#sec-alumna-portal', otra); await p.waitForTimeout(500);
        p.off('request', escucha);
        ok('elegir otra persona cambia el botón sin pedir nada al servidor', (await p.getAttribute('a[data-espacio="secundaria"]', 'href')).includes('alumna=' + encodeURIComponent(otra)) && pedidas.length === 0, pedidas.join());
      }
      ok('«🔑 Restablecer contraseña» visible' + et, await visible(p, '#admin-link'));
      await revisar(p, et, TEXTOS_HOME, p.errores);
      await p.screenshot({ path: 'portal-diseno-admin-360' + suf + '.png', fullPage: true });
      await p.context().close();
    }

    // ---------- Sin sesión ----------
    {
      const p = await abrir(b, null, tema);
      await p.waitForSelector('#login:not([hidden])', { timeout: 60000 });
      const et = ' · sin sesión' + T;
      ok('entrada: correo, contraseña, «¿Olvidaste…?», «Crea tu cuenta de Juegos» y tema' + et,
        (await visible(p, '#email')) && (await visible(p, '#password')) && (await visible(p, '#olvide-btn')) && (await visible(p, '#juegos-cta-btn')) && (await visible(p, '#tema-btn')));
      await revisar(p, et, TEXTOS_LOGIN, p.errores);
      await p.screenshot({ path: 'portal-diseno-login-360' + suf + '.png', fullPage: true });
      if (tema === 'light') {
        // Tema: automático → oscuro, se guarda y se conserva al recargar.
        await p.click('#tema-btn');
        const t1 = await p.evaluate(() => ({ theme: document.documentElement.dataset.theme || '', guardado: localStorage.getItem('stald_tema'), label: document.getElementById('tema-btn').getAttribute('aria-label') }));
        ok('selector de tema: oscuro con el sistema en claro', t1.theme === 'dark' && t1.guardado === 'oscuro' && /oscuro/.test(t1.label), JSON.stringify(t1));
        await p.reload(); await p.waitForSelector('#login:not([hidden])', { timeout: 60000 });
        const fondo = await p.evaluate(() => ({ theme: document.documentElement.dataset.theme || '', bg: getComputedStyle(document.body).backgroundColor }));
        ok('tema oscuro conservado al recargar', fondo.theme === 'dark' && /11, 16, 32/.test(fondo.bg), JSON.stringify(fondo));
        const cs = await contrastes(p, TEXTOS_LOGIN);
        ok('tema oscuro elegido: contraste AA', cs.every(c => c.r >= 4.5), JSON.stringify(cs.filter(c => c.r < 4.5)));
        await p.screenshot({ path: 'portal-diseno-login-360-tema-oscuro.png', fullPage: true });
        // La misma elección la leen Inglés y Juegos antes de pintar.
        for (const ruta of ['/ingles.html', '/juegos.html']) {
          const q = await p.context().newPage();
          await q.goto(urlDe(ruta));
          ok('tema oscuro del portal también en ' + ruta, (await q.evaluate(() => document.documentElement.dataset.theme)) === 'dark');
          await q.close();
        }
        await p.click('#tema-btn'); await p.click('#tema-btn'); // claro → automático
        ok('selector de tema: vuelve a automático', await p.evaluate(() => !document.documentElement.dataset.theme && localStorage.getItem('stald_tema') === 'auto'));
        // «Crea tu cuenta de Juegos» y ?juegos=1 llevan al registro de Juegos.
        await p.click('#juegos-cta-btn'); await p.waitForURL(/juegos\.html\?registro=1/, { timeout: 30000 }).catch(() => {});
        ok('«Crea tu cuenta de Juegos» abre el registro', /juegos\.html\?registro=1/.test(p.url()), p.url());
        await p.goto(urlDe('/index.html?juegos=1')); await p.waitForURL(/juegos\.html\?registro=1/, { timeout: 30000 }).catch(() => {});
        ok('index.html?juegos=1 lleva al registro de Juegos', /juegos\.html\?registro=1/.test(p.url()), p.url());
      }
      await p.context().close();
    }
  }
  await b.close();
  console.log(out.join('\n'));
  process.exit(out.some(l => l.startsWith('FAIL')) ? 1 : 0);
})().catch(e => { console.log(out.join('\n')); console.log('ERROR ' + (e.stack || e.message)); process.exit(1); });
