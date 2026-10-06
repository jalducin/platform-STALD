// Abrir páginas del navegador con sesión de prueba (openspec: e2e-ayudantes). Requiere que la prueba haya cargado
// antes `./lib/entorno` (pone BASE y API).
//
//   const { abrirPagina, urlDe } = require('./lib/navegador');
//   const p = await abrirPagina(b, { email: 'marisol@example.com', ruta: '/juegos.html', esperar: '[data-juego]', out });
//
// Opciones de abrirPagina(b, opciones) — todas opcionales:
//   email     correo de la sesión de prueba: guarda localStorage.stald_sesion_prueba = { email, token: 'prueba:'+email }.
//             Sin email, la página abre sin sesión (invitado, login).
//   viejo     correo para `stald_email` (la sesión «vieja» de antes del login); `true` = el mismo `email`.
//   ingles    correo para `ingles_email` (la sesión vieja de ingles.html); `true` = el mismo `email`.
//   tiempo    valor de window.__TIEMPO_JUEGOS (acorta los relojes de los juegos).
//   init      [fn, arg] script extra para addInitScript (se agrega después del de la sesión).
//   viewport  tamaño de la ventana; por omisión el de celular, 390×844.
//   contexto  opciones extra para newContext (colorScheme, permissions…).
//   out       arreglo de resultados de la prueba: cada error JS de la página agrega
//             'FAIL error JS (<etiqueta>): <mensaje>'.
//   etiqueta  texto entre paréntesis en ese FAIL; por omisión el `email`. Con '' queda 'FAIL error JS: <mensaje>'.
//   dialogos  'aceptar' | 'rechazar' | 'registrar' (guarda el texto en p.alertas y acepta). Sin valor no se registra
//             manejador y Playwright los descarta solo.
//   ruta      ruta a abrir con urlDe(ruta). Sin ruta la página queda en blanco (para agregar rutas o escuchas antes).
//   esperar   selector a esperar tras abrir la ruta (60 s); o [selector, opciones de waitForSelector].
// Devuelve la página; su contexto es p.context().
const CELULAR = { width: 390, height: 844 };

// URL de una página estática con ?api=<API>; respeta la query y el #hash de la ruta.
function urlDe(ruta) {
  const [r, h] = ruta.split('#');
  return process.env.BASE + r + (r.includes('?') ? '&' : '?') + 'api=' + encodeURIComponent(process.env.API) + (h ? '#' + h : '');
}

async function abrirPagina(b, o = {}) {
  const deEmail = v => (v === true ? o.email : v) || null;
  const ctx = await b.newContext({ viewport: o.viewport || CELULAR, ...(o.contexto || {}) });
  await ctx.addInitScript(s => {
    if (s.tiempo != null) window.__TIEMPO_JUEGOS = s.tiempo;
    if (s.viejo) localStorage.setItem('stald_email', s.viejo);
    if (s.ingles) localStorage.setItem('ingles_email', s.ingles);
    if (s.email) localStorage.setItem('stald_sesion_prueba', JSON.stringify({ email: s.email, token: 'prueba:' + s.email }));
  }, { email: o.email || null, viejo: deEmail(o.viejo), ingles: deEmail(o.ingles), tiempo: o.tiempo ?? null });
  if (o.init) await ctx.addInitScript(o.init[0], o.init[1]);
  const p = await ctx.newPage();
  if (o.out) {
    const etiqueta = o.etiqueta ?? o.email ?? '';
    p.on('pageerror', e => o.out.push('FAIL error JS' + (etiqueta ? ' (' + etiqueta + ')' : '') + ': ' + e.message));
  }
  if (o.dialogos === 'aceptar') p.on('dialog', d => d.accept());
  else if (o.dialogos === 'rechazar') p.on('dialog', d => d.dismiss());
  else if (o.dialogos === 'registrar') { p.alertas = []; p.on('dialog', d => { p.alertas.push(d.message()); d.accept(); }); }
  if (o.ruta) {
    await p.goto(urlDe(o.ruta));
    if (o.esperar) {
      const [sel, opciones] = Array.isArray(o.esperar) ? o.esperar : [o.esperar, {}];
      await p.waitForSelector(sel, { timeout: 60000, ...opciones });
    }
  }
  return p;
}

module.exports = { abrirPagina, urlDe, CELULAR };
