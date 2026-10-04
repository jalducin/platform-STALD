// E2E de inicio de sesión (openspec: plataforma-login) con el verificador falso del servidor local (ROWS_FIXTURE).
// FASE=transicion (servidor normal) o FASE=despues (servidor con LOGIN_TRANSICION_HASTA en el pasado).
require('./lib/entorno').sinSesionEnFetch(); // BASE, API, CHROME y carpeta de salida; el token lo maneja la prueba
const { chromium } = require('playwright');
const BASE = process.env.BASE;
const API = process.env.API;
const Q = '?api=' + encodeURIComponent(API);
const FASE = process.env.FASE || 'transicion';
const out = []; const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const tiles = p => p.$$eval('#tiles [data-espacio]', xs => xs.map(x => x.dataset.espacio));

async function contexto(b, init) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(i => { window.__TIEMPO_JUEGOS = 0.4; if (i && i.viejo) localStorage.setItem('stald_email', i.viejo); if (i && i.sesion) localStorage.setItem('stald_sesion_prueba', JSON.stringify({ email: i.sesion, token: 'prueba:' + i.sesion })); }, init || null);
  const p = await ctx.newPage();
  p.on('pageerror', e => out.push('FAIL error JS: ' + e.message));
  p.on('dialog', d => d.accept());
  const peticiones = [];
  p.on('request', r => { if (r.url().startsWith(API) && r.method() !== 'OPTIONS') peticiones.push({ url: r.url(), auth: r.headers()['authorization'] || '' }); });
  return { ctx, p, peticiones };
}

async function entrarConCodigo(p, correo) {
  await p.waitForSelector('#login:not([hidden])', { timeout: 30000 });
  await p.fill('#email', correo); await p.click('#login-btn');
  await p.waitForSelector('#code-form:not([hidden])', { timeout: 10000 });
  await p.fill('#code', '123456'); await p.click('#code-btn');
  await p.waitForSelector('#home:not([hidden]), #login-error:not([hidden])', { timeout: 60000 });
}

async function api(ruta, token) {
  const r = await fetch(API + ruta, { headers: token ? { Authorization: 'Bearer ' + token } : {} });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME });

  if (FASE === 'despues') {
    // Fuera de la transición: ?email= sin token → 401 y las páginas piden el enlace.
    const r = await api('/perfil?email=marisol%40example.com');
    ok('después: alumna con ?email= sin token → 401 inicia_sesion', r.status === 401 && r.body.error === 'inicia_sesion', JSON.stringify(r));
    ok('después: con sesión sigue funcionando', (await api('/perfil', 'prueba:marisol@example.com')).status === 200);
    let { ctx, p } = await contexto(b, { viejo: 'marisol@example.com' });
    await p.goto(BASE + '/' + Q); await p.waitForSelector('#login:not([hidden])', { timeout: 30000 });
    ok('después: portal con correo viejo → pantalla de entrada con aviso', (await p.textContent('#login-error')).includes('enlace'), await p.textContent('#login-error'));
    ok('después: el correo queda escrito', (await p.inputValue('#email')) === 'marisol@example.com');
    await ctx.close();
    ({ ctx, p } = await contexto(b, { viejo: 'marisol@example.com' }));
    await p.goto(BASE + '/juegos.html' + Q); await p.waitForSelector('[data-stald-auth]', { timeout: 30000 });
    ok('después: Juegos con correo viejo → entrada', (await p.textContent('.stald-auth')).includes('enlace'));
    await ctx.close();
    ({ ctx, p } = await contexto(b, { viejo: 'valeria@example.com' }));
    await p.goto(BASE + '/secundaria.html' + Q); await p.waitForSelector('#login-auth [data-stald-auth]', { timeout: 30000 });
    ok('después: Secundaria con correo viejo → entrada', await p.isVisible('#login-auth .stald-auth') && !(await p.isVisible('#app')));
    await ctx.close();
    await b.close();
    console.log(out.join('\n')); process.exit(out.some(x => x.startsWith('FAIL')) ? 1 : 0);
  }

  // ---- API directa ----
  const adm = await api('/perfil?email=admin%40example.com');
  ok('admin con ?email= sin token → 401 inicia_sesion', adm.status === 401 && adm.body.error === 'inicia_sesion', JSON.stringify(adm));
  ok('admin con token → 200 y admin', (await api('/perfil', 'prueba:admin@example.com')).body.isAdmin === true);
  const alu = await api('/perfil?email=marisol%40example.com');
  ok('alumna con ?email= sin token funciona en la transición', alu.status === 200 && alu.body.nombre === 'Marisol');
  ok('token inválido → 401 sesion_invalida', (await api('/perfil', 'prueba:no-es-correo')).body.error === 'sesion_invalida');
  ok('token real sin Supabase configurado (local) → 503 auth_no_disponible', (await api('/perfil', 'otro-token')).status === 503);
  ok('el correo sale del token, no de la URL', (await api('/perfil?email=admin%40example.com', 'prueba:marisol@example.com')).body.isAdmin === false);

  // ---- Portal: entrada → sesión ----
  let { ctx, p, peticiones } = await contexto(b);
  await p.goto(BASE + '/' + Q); await p.waitForSelector('#login:not([hidden])', { timeout: 30000 });
  ok('portal sin sesión: botón «Enviarme el enlace»', (await p.textContent('#login-btn')).includes('Enviarme el enlace'));
  await p.fill('#email', 'no-es-correo'); await p.click('#login-btn');
  ok('correo inválido: aviso', (await p.textContent('#login-error')).includes('correo válido'));
  await p.fill('#email', 'marisol@example.com'); await p.click('#login-btn');
  await p.waitForSelector('#code-form:not([hidden])');
  ok('paso 2: «Revisa tu correo ✉️»', (await p.textContent('#code-sent')).includes('Revisa tu correo'));
  await p.screenshot({ path: 'login-codigo.png' });
  await p.fill('#code', '12'); await p.click('#code-btn');
  ok('código incompleto: aviso', (await p.textContent('#login-error')).includes('6 números'));
  await p.fill('#code', '123456'); await p.click('#code-btn');
  await p.waitForSelector('#home:not([hidden])', { timeout: 60000 });
  ok('con sesión: saludo y tarjetas', (await p.textContent('#hello')).includes('Marisol') && JSON.stringify(await tiles(p)) === '["ingles","juegos"]');
  ok('sin aviso de transición ni panel de admin', (await p.$eval('#secure-notice', e => e.hidden)) && (await p.$eval('#admin-link', e => e.hidden)));
  const perfil = peticiones.filter(x => x.url.includes('/perfil')).pop();
  ok('/perfil con Authorization y sin ?email=', perfil && perfil.auth === 'Bearer prueba:marisol@example.com' && !perfil.url.includes('email='), perfil && perfil.url);
  ok('🚪 Cerrar sesión en el portal', (await p.textContent('#logout')).includes('Cerrar sesión'));
  await p.screenshot({ path: 'login-portal.png', fullPage: true });

  // ---- Juegos con la misma sesión (incluida una sala) ----
  peticiones.length = 0;
  await p.click('#tiles a[data-espacio="juegos"]'); await p.waitForSelector('[data-juego]', { timeout: 60000 });
  ok('Juegos entra con la sesión', (await p.textContent('#chip')).includes('Marisol'));
  await p.click('[data-tab="partidas"]'); await p.waitForSelector('#f-crear');
  await p.selectOption('#p-juego', 'cultura');
  await p.click('#f-crear button[type=submit]'); await p.waitForSelector('[data-p="empezar"]', { timeout: 30000 });
  const codigo = (await p.textContent('.letra')).trim();
  ok('Juegos: crea una sala con la sesión', /^[A-Z]{4}$/.test(codigo), codigo);
  // Otra persona (con su propia sesión) se une con el código.
  const otro = await contexto(b, { sesion: 'angel@example.com' });
  await otro.p.goto(BASE + '/juegos.html' + Q); await otro.p.waitForSelector('[data-juego]', { timeout: 60000 });
  await otro.p.click('[data-tab="partidas"]'); await otro.p.waitForSelector('#f-unirse');
  await otro.p.fill('#p-codigo', codigo.toLowerCase()); await otro.p.click('#f-unirse button[type=submit]');
  await otro.p.waitForSelector('.rank li', { timeout: 30000 }); await sleep(3500);
  const lobby = await p.$$eval('.rank li', ls => ls.map(l => l.textContent));
  ok('sala: la anfitriona ve a quien se unió', lobby.some(t => t.includes('Angel')), lobby.join(' | ').slice(0, 120));
  const deJuegos = peticiones.filter(x => x.url.includes('/juegos/'));
  ok('todas las peticiones de Juegos llevan el token y no ?email=', deJuegos.length > 3 && deJuegos.every(x => x.auth === 'Bearer prueba:marisol@example.com' && !x.url.includes('email=')), deJuegos.length + ' peticiones');
  await otro.ctx.close();

  // ---- Cerrar sesión regresa a la entrada ----
  await p.goto(BASE + '/' + Q); await p.waitForSelector('#home:not([hidden])', { timeout: 60000 });
  await p.click('#logout'); await p.waitForSelector('#login:not([hidden])');
  ok('cerrar sesión: pantalla de entrada', await p.isVisible('#login-form'));
  ok('cerrar sesión: sin sesión ni correo guardados', await p.evaluate(() => !localStorage.getItem('stald_sesion_prueba') && !localStorage.getItem('stald_email')));
  await p.goto(BASE + '/juegos.html' + Q); await p.waitForSelector('[data-stald-auth]', { timeout: 30000 });
  ok('Juegos después de cerrar sesión: pide entrar', (await p.textContent('.stald-auth')).includes('enlace'));
  // Juegos: entrar con el código desde su propia pantalla
  await p.fill('#stald-auth-correo', 'marisol@example.com'); await p.click('#stald-auth-enviar');
  await p.waitForSelector('#stald-auth-codigo'); await p.fill('#stald-auth-codigo', '654321'); await p.click('#stald-auth-verificar');
  await p.waitForSelector('[data-juego]', { timeout: 60000 });
  ok('Juegos: entrada con código desde la propia página', (await p.textContent('#chip')).includes('Marisol'));
  await ctx.close();

  // ---- Secundaria con sesión ----
  ({ ctx, p, peticiones } = await contexto(b, { sesion: 'valeria@example.com' }));
  await p.goto(BASE + '/secundaria.html' + Q); await p.waitForSelector('#app', { state: 'visible', timeout: 60000 });
  ok('Secundaria con sesión muestra tareas', (await p.$$('#content .row, #content-recent .row')).length > 0);
  const dat = peticiones.find(x => x.url.includes('/data'));
  ok('Secundaria manda el token', dat && dat.auth === 'Bearer prueba:valeria@example.com' && !dat.url.includes('email='));
  await p.click('#logout-btn'); await p.waitForSelector('#login-auth [data-stald-auth]');
  ok('Secundaria: cerrar sesión → entrada', await p.isVisible('#login-auth .stald-auth') && !(await p.isVisible('#app')));
  await ctx.close();

  // ---- Admin: sesión, panel 🔗 y admin viejo sin sesión ----
  ({ ctx, p } = await contexto(b, { viejo: 'admin@example.com' }));
  await p.goto(BASE + '/' + Q); await p.waitForSelector('#login:not([hidden])', { timeout: 60000 });
  ok('admin con correo viejo (sin sesión) → entrada con aviso', (await p.textContent('#login-error')).includes('enlace'));
  await entrarConCodigo(p, 'admin@example.com');
  ok('admin con sesión: Modo maestro y 🔗 Enlace de acceso', !(await p.$eval('#admin-tag', e => e.hidden)) && !(await p.$eval('#admin-link', e => e.hidden)));
  await p.fill('#admin-link-email', 'marisol@example.com'); await p.click('#admin-link-btn');
  await p.waitForSelector('#admin-link-out .alert', { timeout: 10000 });
  ok('🔗 sin llave de servicio local: mensaje claro (503)', (await p.textContent('#admin-link-out')).includes('no respondió'));
  await p.screenshot({ path: 'login-admin.png', fullPage: true });
  await ctx.close();

  // ---- Transición: alumna con correo viejo entra y ve el aviso ----
  ({ ctx, p, peticiones } = await contexto(b, { viejo: 'marisol@example.com' }));
  await p.goto(BASE + '/' + Q); await p.waitForSelector('#home:not([hidden])', { timeout: 60000 });
  ok('transición: alumna con correo viejo entra sola', (await p.textContent('#hello')).includes('Marisol'));
  ok('transición: aviso «Activa tu acceso seguro»', !(await p.$eval('#secure-notice', e => e.hidden)));
  ok('transición: /perfil sin token y con ?email=', peticiones.some(x => x.url.includes('/perfil?email=') && !x.auth));
  await p.click('#secure-btn'); await p.waitForSelector('#code-form:not([hidden])');
  await p.fill('#code', '111111'); await p.click('#code-btn'); await p.waitForSelector('#home:not([hidden])');
  ok('transición: activa la sesión y el aviso desaparece', await p.$eval('#secure-notice', e => e.hidden));
  await ctx.close();
  ({ ctx, p } = await contexto(b, { viejo: 'marisol@example.com' }));
  await p.goto(BASE + '/juegos.html' + Q); await p.waitForSelector('[data-juego]', { timeout: 60000 });
  ok('transición: Juegos con correo viejo funciona', (await p.textContent('#chip')).includes('Marisol'));
  await ctx.close();

  // ---- Invitado: correo desconocido con sesión → Juegos como invitado ----
  ({ ctx, p } = await contexto(b));
  await p.goto(BASE + '/' + Q);
  await entrarConCodigo(p, 'nuevo' + Date.now() + '@example.com'); // único por corrida: el servidor guarda invitados en memoria
  ok('desconocido: «No encontré» y botón de invitado', (await p.textContent('#login-error')).includes('No encontré') && await p.isVisible('#guest'));
  await p.click('#guest-btn'); await p.waitForSelector('#f-invitado', { timeout: 60000 });
  await p.fill('#apodo', 'Nuevo'); await p.check('#acepto'); await p.click('#f-invitado button[type=submit]');
  await p.waitForSelector('[data-juego]', { timeout: 60000 });
  ok('invitado registrado con su sesión', (await p.textContent('#chip')).includes('Nuevo'));
  await ctx.close();

  await b.close();
  console.log(out.join('\n')); process.exit(out.some(x => x.startsWith('FAIL')) ? 1 : 0);
})().catch(e => { console.log(out.join('\n')); console.error('ERROR', e.message.slice(0, 400)); process.exit(2); });
