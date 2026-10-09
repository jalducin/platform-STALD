// E2E de inicio de sesión (openspec: plataforma-login, acceso-con-contrasena) con el verificador falso del servidor
// local (ROWS_FIXTURE): en modo de prueba cualquier contraseña no vacía abre la sesión falsa, y «clase» o «sensei»
// cuentan como la inicial (se pide cambiarla). FASE=transicion (servidor normal) o FASE=despues (servidor con
// LOGIN_TRANSICION_HASTA en el pasado).
require('./lib/entorno').sinSesionEnFetch(); // BASE, API, CHROME y carpeta de salida; el token lo maneja la prueba
const { chromium } = require('playwright');
const { abrirPagina } = require('./lib/navegador');
const BASE = process.env.BASE;
const API = process.env.API;
const Q = '?api=' + encodeURIComponent(API);
const FASE = process.env.FASE || 'transicion';
const out = []; const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const tiles = p => p.$$eval('#tiles [data-espacio]', xs => xs.map(x => x.dataset.espacio));

async function contexto(b, init) {
  const i = init || {};
  const p = await abrirPagina(b, { email: i.sesion, viejo: i.viejo, tiempo: 0.4, out, etiqueta: '', dialogos: 'aceptar' });
  const peticiones = [];
  p.on('request', r => { if (r.url().startsWith(API) && r.method() !== 'OPTIONS') peticiones.push({ url: r.url(), auth: r.headers()['authorization'] || '' }); });
  return { ctx: p.context(), p, peticiones };
}

// Portal: correo y contraseña. Con la inicial aparece el cambio; `omitir` toca «Ahora no».
async function entrarPortal(p, correo, clave, omitir = true) {
  await p.waitForSelector('#login:not([hidden])', { timeout: 30000 });
  await p.fill('#email', correo); await p.fill('#password', clave); await p.click('#login-btn');
  await p.waitForFunction(() => ['#home', '#guest', '#cambio'].some(s => { const e = document.querySelector(s); return e && e.offsetParent !== null; })
    || (document.querySelector('#login-error').offsetParent !== null && document.querySelector('#login-btn').textContent.includes('Entrar →')), null, { timeout: 60000 });
  if (omitir && await p.isVisible('#cambio [data-stald-auth-despues]')) {
    await p.click('#cambio [data-stald-auth-despues]');
    await p.waitForSelector('#home:not([hidden]), #guest:not([hidden])', { timeout: 60000 });
  }
}

async function api(ruta, token, opts = {}) {
  const r = await fetch(API + ruta, { ...opts, headers: { ...(opts.headers || {}), ...(token ? { Authorization: 'Bearer ' + token } : {}) } });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}
const postApi = (ruta, body, token) => api(ruta, token, { method: 'POST', body: JSON.stringify(body) });

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME });

  if (FASE === 'despues') {
    // Fuera de la transición: ?email= sin token → 401 y las páginas piden entrar con contraseña.
    const r = await api('/perfil?email=marisol%40example.com');
    ok('después: alumna con ?email= sin token → 401 inicia_sesion', r.status === 401 && r.body.error === 'inicia_sesion', JSON.stringify(r));
    ok('después: con sesión sigue funcionando', (await api('/perfil', 'prueba:marisol@example.com')).status === 200);
    let { ctx, p } = await contexto(b, { viejo: 'marisol@example.com' });
    await p.goto(BASE + '/' + Q); await p.waitForSelector('#login:not([hidden])', { timeout: 30000 });
    ok('después: portal con correo viejo → entrada con aviso de contraseña', (await p.textContent('#login-error')).includes('contraseña'), await p.textContent('#login-error'));
    ok('después: el correo queda escrito', (await p.inputValue('#email')) === 'marisol@example.com');
    await ctx.close();
    ({ ctx, p } = await contexto(b, { viejo: 'marisol@example.com' }));
    await p.goto(BASE + '/juegos.html' + Q); await p.waitForSelector('#f-entrada', { timeout: 30000 });
    ok('después: Juegos con correo viejo → entrada con correo y nick', await p.isVisible('#ent-nick'));
    await ctx.close();
    ({ ctx, p } = await contexto(b, { viejo: 'valeria@example.com' }));
    await p.goto(BASE + '/secundaria.html' + Q); await p.waitForSelector('#login-auth [data-stald-auth]', { timeout: 30000 });
    ok('después: Secundaria con correo viejo → entrada con contraseña', await p.isVisible('#login-auth #stald-auth-clave') && !(await p.isVisible('#app')));
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
  // Rutas de contraseña (openspec: acceso-con-contrasena).
  ok('preparar: alumna con «Clase» → listo', (await postApi('/auth/preparar', { email: 'marisol@example.com', password: 'Clase' })).body.listo === true);
  ok('preparar: contraseña equivocada → 401', (await postApi('/auth/preparar', { email: 'marisol@example.com', password: 'otra' })).status === 401);
  ok('preparar: correo que no es de clase → 401', (await postApi('/auth/preparar', { email: 'nadie@example.com', password: 'clase' })).status === 401);
  ok('preparar: el profe con «sensei» → listo', (await postApi('/auth/preparar', { email: 'admin@example.com', password: 'sensei' })).body.listo === true);
  ok('cambiar: sin sesión → 401', (await postApi('/auth/contrasena', { nueva: 'nueva2026' })).status === 401);
  ok('cambiar: «clase» como nueva → 400', (await postApi('/auth/contrasena', { nueva: 'clase' }, 'prueba:marisol@example.com')).status === 400);
  ok('restablecer: alumna → 403', (await postApi('/auth/restablecer', { email: 'sofy@example.com' }, 'prueba:marisol@example.com')).status === 403);

  // ---- Portal: correo y contraseña → sesión ----
  let { ctx, p, peticiones } = await contexto(b);
  await p.goto(BASE + '/' + Q); await p.waitForSelector('#login:not([hidden])', { timeout: 30000 });
  ok('portal sin sesión: correo, contraseña y «Entrar»', await p.isVisible('#password') && (await p.textContent('#login-btn')).includes('Entrar'));
  ok('portal: sin enlace ni código', !(await p.$('#code-form')) && !(await p.textContent('#login')).includes('enlace'));
  await p.fill('#email', 'no-es-correo'); await p.fill('#password', 'clase'); await p.click('#login-btn');
  ok('correo inválido: aviso', (await p.textContent('#login-error')).includes('correo válido'));
  await p.fill('#email', 'marisol@example.com'); await p.fill('#password', ''); await p.click('#login-btn');
  ok('sin contraseña: aviso', (await p.textContent('#login-error')).includes('contraseña'));
  await p.fill('#email', 'marisol@example.com'); await p.fill('#password', 'Clase'); await p.click('#login-btn');
  await p.waitForSelector('#cambio:not([hidden])', { timeout: 30000 });
  ok('con «Clase»: pide cambiarla y ofrece «Ahora no»', (await p.textContent('#cambio')).includes('Cambia tu contraseña') && await p.isVisible('#cambio [data-stald-auth-despues]'));
  await p.screenshot({ path: 'login-cambio.png' });
  await p.click('#cambio [data-stald-auth-despues]'); await p.waitForSelector('#home:not([hidden])', { timeout: 60000 });
  ok('con sesión: saludo y tarjetas', (await p.textContent('#hello')).includes('Marisol') && JSON.stringify(await tiles(p)) === '["ingles","juegos"]');
  ok('sin aviso de transición ni panel de admin', (await p.$eval('#secure-notice', e => e.hidden)) && (await p.$eval('#admin-link', e => e.hidden)));
  const perfil = peticiones.filter(x => x.url.includes('/perfil')).pop();
  ok('/perfil con Authorization y sin ?email=', perfil && perfil.auth === 'Bearer prueba:marisol@example.com' && !perfil.url.includes('email='), perfil && perfil.url);
  // 🔑 Cambiar contraseña desde el portal.
  await p.click('#cambiar-btn'); await p.waitForSelector('#cambio:not([hidden])');
  await p.fill('#stald-auth-nueva', 'mari2026'); await p.fill('#stald-auth-nueva2', 'otra2026'); await p.click('#stald-auth-guardar');
  ok('cambiar: si no coinciden avisa', (await p.textContent('#cambio')).includes('no son iguales'));
  await p.fill('#stald-auth-nueva', 'mari2026'); await p.fill('#stald-auth-nueva2', 'mari2026'); await p.click('#stald-auth-guardar');
  await p.waitForSelector('#home:not([hidden])', { timeout: 60000 });
  ok('cambiar: guarda y vuelve al portal', (await p.textContent('#hello')).includes('Marisol'));
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
  // Juegos sin sesión: correo y nick; con un correo de clase pide la contraseña.
  await p.goto(BASE + '/juegos.html' + Q); await p.waitForSelector('#f-entrada', { timeout: 30000 });
  ok('Juegos después de cerrar sesión: correo y nick, sin enlace', await p.isVisible('#ent-nick') && !(await p.textContent('#app')).includes('enlace'));
  await p.fill('#ent-correo', 'marisol@example.com'); await p.fill('#ent-nick', 'Mari'); await p.check('#ent-acepto'); await p.click('#reg-entrar');
  await p.waitForSelector('#stald-auth-clave', { timeout: 30000 });
  ok('Juegos: correo de clase → pide su contraseña', (await p.textContent('#app')).includes('Ese correo es de las clases') && (await p.inputValue('#stald-auth-correo')) === 'marisol@example.com');
  ok('Juegos: correo de clase sin sesión todavía', await p.evaluate(() => localStorage.getItem('stald_sesion_prueba') === null));
  await p.fill('#stald-auth-clave', 'mari2026'); await p.click('#stald-auth-entrar');
  await p.waitForSelector('[data-juego]', { timeout: 60000 });
  ok('Juegos: la alumna entra con su contraseña', (await p.textContent('#chip')).includes('Marisol'));
  await ctx.close();

  // ---- Secundaria con sesión ----
  ({ ctx, p, peticiones } = await contexto(b, { sesion: 'valeria@example.com' }));
  await p.goto(BASE + '/secundaria.html' + Q); await p.waitForSelector('#app', { state: 'visible', timeout: 60000 });
  ok('Secundaria con sesión muestra tareas', (await p.$$('#content .row, #content-recent .row')).length > 0);
  const dat = peticiones.find(x => x.url.includes('/data'));
  ok('Secundaria manda el token', dat && dat.auth === 'Bearer prueba:valeria@example.com' && !dat.url.includes('email='));
  await p.click('#logout-btn'); await p.waitForSelector('#login-auth [data-stald-auth]');
  ok('Secundaria: cerrar sesión → entrada con contraseña', await p.isVisible('#login-auth #stald-auth-clave') && !(await p.isVisible('#app')));
  await ctx.close();

  // ---- Admin: «sensei» obliga a cambiarla; 🔑 Restablecer contraseña ----
  ({ ctx, p } = await contexto(b, { viejo: 'admin@example.com' }));
  await p.goto(BASE + '/' + Q); await p.waitForSelector('#login:not([hidden])', { timeout: 60000 });
  ok('admin con correo viejo (sin sesión) → entrada con aviso', (await p.textContent('#login-error')).includes('contraseña'));
  await entrarPortal(p, 'admin@example.com', 'sensei', false);
  ok('admin con «sensei»: cambio obligatorio, sin «Ahora no»', await p.isVisible('#cambio') && !(await p.$('#cambio [data-stald-auth-despues]')));
  await p.fill('#stald-auth-nueva', 'sensei'); await p.fill('#stald-auth-nueva2', 'sensei'); await p.click('#stald-auth-guardar');
  ok('admin: no puede quedarse con la inicial', (await p.textContent('#cambio')).includes('distinta de la inicial'));
  await p.fill('#stald-auth-nueva', 'profe2026'); await p.fill('#stald-auth-nueva2', 'profe2026'); await p.click('#stald-auth-guardar');
  await p.waitForSelector('#home:not([hidden])', { timeout: 60000 });
  ok('admin con sesión: Modo maestro y 🔑 Restablecer contraseña', !(await p.$eval('#admin-tag', e => e.hidden)) && (await p.textContent('#admin-link')).includes('Restablecer contraseña'));
  await p.fill('#admin-link-email', 'sofy@example.com'); await p.click('#admin-link-btn');
  await p.waitForSelector('#admin-link-out .ok-msg, #admin-link-out .alert', { timeout: 10000 });
  ok('restablecer: «Listo» con el correo', (await p.textContent('#admin-link-out')).includes('sofy@example.com ya puede entrar'), await p.textContent('#admin-link-out'));
  await p.screenshot({ path: 'login-admin.png', fullPage: true });
  await ctx.close();

  // ---- Transición: alumna con correo viejo entra y ve el aviso ----
  ({ ctx, p, peticiones } = await contexto(b, { viejo: 'marisol@example.com' }));
  await p.goto(BASE + '/' + Q); await p.waitForSelector('#home:not([hidden])', { timeout: 60000 });
  ok('transición: alumna con correo viejo entra sola', (await p.textContent('#hello')).includes('Marisol'));
  ok('transición: aviso para entrar con contraseña', !(await p.$eval('#secure-notice', e => e.hidden)) && (await p.textContent('#secure-notice')).includes('contraseña'));
  ok('transición: /perfil sin token y con ?email=', peticiones.some(x => x.url.includes('/perfil?email=') && !x.auth));
  await p.click('#secure-btn'); await p.waitForSelector('#login:not([hidden])');
  ok('transición: el aviso lleva a la entrada con su correo', (await p.inputValue('#email')) === 'marisol@example.com');
  await entrarPortal(p, 'marisol@example.com', 'clase');
  ok('transición: activa la sesión y el aviso desaparece', await p.$eval('#secure-notice', e => e.hidden));
  await ctx.close();
  ({ ctx, p } = await contexto(b, { viejo: 'marisol@example.com' }));
  await p.goto(BASE + '/juegos.html' + Q); await p.waitForSelector('[data-juego]', { timeout: 60000 });
  ok('transición: Juegos con correo viejo funciona', (await p.textContent('#chip')).includes('Marisol'));
  await ctx.close();

  // ---- Invitado: correo desconocido con sesión → Juegos como invitado ----
  ({ ctx, p } = await contexto(b));
  await p.goto(BASE + '/' + Q);
  await entrarPortal(p, 'nuevo' + Date.now() + '@example.com', 'algo123'); // único por corrida
  ok('desconocido: invitación sin error', await p.isHidden('#login-error') && await p.isVisible('#guest') && (await p.textContent('#guest')).includes('Crear mi cuenta de Juegos'));
  await p.click('#guest-btn'); await p.waitForSelector('#f-invitado', { timeout: 60000 });
  await p.fill('#apodo', 'Nuevo'); await p.check('#acepto'); await p.click('#f-invitado button[type=submit]');
  await p.waitForSelector('[data-juego]', { timeout: 60000 });
  ok('invitado registrado con su sesión', (await p.textContent('#chip')).includes('Nuevo'));
  await ctx.close();

  // ---- Cuenta de Juegos desde el portal y desde ?juegos=1 ----
  ({ ctx, p } = await contexto(b));
  await p.goto(BASE + '/' + Q); await p.waitForSelector('#login:not([hidden])', { timeout: 30000 });
  ok('portal: botón visible «Crea tu cuenta de Juegos»', await p.isVisible('#juegos-cta') && (await p.textContent('#juegos-cta')).includes('Crea tu cuenta de Juegos'));
  await p.click('#juegos-cta-btn'); await p.waitForURL(/juegos\.html\?registro=1/, { timeout: 30000 });
  await p.waitForSelector('#f-entrada', { timeout: 30000 });
  ok('botón del portal → entrada de Juegos con su API', p.url().includes('api='));
  await p.goto(BASE + '/index.html?juegos=1&api=' + encodeURIComponent(API)); await p.waitForURL(/juegos\.html\?registro=1/, { timeout: 30000 });
  ok('?juegos=1 → entrada de Juegos con su API', p.url().includes('api='));
  await ctx.close();

  // ---- Juegos: registro o regreso con correo y nick, sin enlace ni contraseña ----
  ({ ctx, p } = await contexto(b));
  await p.goto(BASE + '/juegos.html' + Q); await p.waitForSelector('#f-entrada', { timeout: 30000 });
  await p.fill('#ent-correo', 'registro@example.com'); await p.fill('#ent-nick', 'x'); await p.click('#reg-entrar');
  ok('Juegos: nick inválido avisa', (await p.textContent('#app')).includes('de 2 a 20 letras'));
  ok('Juegos: conserva el correo escrito', (await p.inputValue('#ent-correo')) === 'registro@example.com');
  await p.fill('#ent-nick', 'Registro'); await p.uncheck('#ent-acepto'); await p.click('#reg-entrar');
  ok('Juegos: sin aceptar avisa', (await p.textContent('#app')).includes('aceptar el aviso'));
  await p.fill('#ent-correo', 'no-es-correo'); await p.fill('#ent-nick', 'Registro'); await p.check('#ent-acepto'); await p.click('#reg-entrar');
  ok('Juegos: correo inválido avisa', (await p.textContent('#app')).includes('correo válido'));
  const correoNuevo = 'registro' + Date.now() + '@example.com';
  const altas = []; p.on('request', q => { if (q.url().includes('/juegos/registro')) altas.push(q.postData()); });
  await p.fill('#ent-correo', correoNuevo); await p.fill('#ent-nick', 'Registro'); await p.check('#ent-acepto'); await p.click('#reg-entrar');
  await p.waitForSelector('[data-juego]', { timeout: 60000 });
  ok('Juegos: invitado nuevo entra con su nick al instante', (await p.textContent('#chip')).includes('Registro'));
  ok('Juegos: una sola petición con nick y aviso', altas.length === 1 && altas[0].includes('"nombre":"Registro"') && altas[0].includes('"acepto":true'), String(altas.length));
  // «🆕 Registrar» cierra la sesión en este aparato y abre la entrada para otra persona.
  ok('hub: botón «Registrar»', (await p.textContent('#registrar-btn')).includes('Registrar'));
  await p.click('#registrar-btn'); await p.waitForSelector('#f-entrada', { timeout: 30000 });
  ok('Registrar: cierra la sesión y abre la entrada', await p.evaluate(() => localStorage.getItem('stald_sesion_prueba') === null));
  ok('Registrar: el aviso ya aceptado queda marcado', await p.isChecked('#ent-acepto'));
  await p.fill('#ent-correo', 'segunda' + Date.now() + '@example.com'); await p.fill('#ent-nick', 'Segunda'); await p.click('#reg-entrar');
  await p.waitForSelector('[data-juego]', { timeout: 60000 });
  ok('Registrar: la segunda persona entra con su nick', (await p.textContent('#chip')).includes('Segunda'));
  // El invitado regresa con su correo y nick.
  await p.click('#registrar-btn'); await p.waitForSelector('#f-entrada', { timeout: 30000 });
  await p.fill('#ent-correo', correoNuevo); await p.fill('#ent-nick', 'Registro'); await p.click('#reg-entrar');
  await p.waitForSelector('[data-juego]', { timeout: 60000 });
  ok('Juegos: el invitado regresa con su correo y nick', (await p.textContent('#chip')).includes('Registro'));
  await p.screenshot({ path: 'login-juegos.png' });
  await ctx.close();

  await b.close();
  console.log(out.join('\n')); process.exit(out.some(x => x.startsWith('FAIL')) ? 1 : 0);
})().catch(e => { console.log(out.join('\n')); console.error('ERROR', e.message.slice(0, 400)); process.exit(2); });
