// Inicio de sesión de STALD con Supabase Auth (openspec: plataforma-login). Script clásico: expone window.StaldAuth.
// Uso en una página:
//   <script src="comun/auth.js?v=5"></script>
//   await StaldAuth.iniciar(API_BASE);           // lee /config, carga supabase-js y recupera la sesión
//   StaldAuth.email()                            // correo de la sesión o null
//   StaldAuth.fetchConSesion(url, opts)          // fetch con Authorization: Bearer <token>
//   StaldAuth.pedirJson(url, opts, { ttl })      // { ok, status, body }: en vuelo, caché por persona y reintentos de GET
//   StaldAuth.limpiarCache()                     // vacía la caché de pedirJson (también al cerrar sesión o tras un envío)
//   StaldAuth.esSesionVencida(res, body)         // true si el servidor respondió 401 de sesión
//   StaldAuth.pintarEntrada(el, { titulo, texto, correo, aviso, alEntrar, pie })  // correo y contraseña; pie: HTML propio
//   StaldAuth.entrarConContrasena(correo, pwd)   // → { email, inicial }; prepara la cuenta si es la contraseña inicial
//   StaldAuth.pintarCambio(el, { obligatorio, alListo })  // pide la contraseña nueva (openspec: acceso-con-contrasena)
//   StaldAuth.cambiarContrasena(nueva)           // POST /auth/contrasena con la sesión
//   StaldAuth.olvideContrasena(correo)           // POST /auth/olvide: enlace por correo (clases y profe)
//   StaldAuth.entroPorEnlace()                   // true si la sesión vino del enlace del correo (pedir contraseña nueva)
//   StaldAuth.entrarConToken(tokenHash, correo)    // sesión con la llave de un solo uso del servidor (registro de Juegos)
//   StaldAuth.salir()                            // cierra la sesión y borra las claves viejas de correo y las de Juegos
// La sesión se comparte entre portal, Inglés, Juegos y Secundaria (mismo origen, localStorage).
(function () {
  'use strict';
  var SUPABASE_JS = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js';
  var CLAVES_VIEJAS = ['stald_email', 'ingles_email', 'secundaria_email']; // modo anterior (solo correo)
  var CLAVE_PRUEBA = 'stald_sesion_prueba'; // solo si el servidor local responde /config { prueba: true }
  var CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  var estado = { listo: null, api: '', cliente: null, prueba: false, sesion: null, error: null, errorEnlace: null, porEnlace: false };
  var PREFIJO = 'stald·'; // la contraseña en Auth es PREFIJO + lo que se escribe (mínimo de 6 de Supabase)
  var INICIALES = { clase: 1, sensei: 1 };

  function leer(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function escribir(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* sin almacenamiento */ } }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function cargarLib() {
    if (window.supabase && window.supabase.createClient) return Promise.resolve(window.supabase);
    return new Promise(function (ok, mal) {
      var s = document.createElement('script');
      s.src = SUPABASE_JS;
      s.onload = function () { ok(window.supabase); };
      s.onerror = function () { mal(new Error('supabase')); };
      document.head.appendChild(s);
    });
  }

  // Error del enlace (vencido o ya usado): Supabase regresa con #error_description=… en la URL.
  function revisarErrorEnlace() {
    var h = location.hash || '';
    if (h.indexOf('error_description=') === -1 && h.indexOf('error_code=') === -1) return;
    var p = new URLSearchParams(h.slice(1));
    estado.errorEnlace = p.get('error_code') === 'otp_expired' || /expired|invalid/i.test(p.get('error_description') || '')
      ? 'Ese enlace ya venció o ya se usó. Pide uno nuevo.'
      : 'No se pudo abrir el enlace (' + (p.get('error_description') || p.get('error_code')) + '). Pide uno nuevo.';
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* sin historial */ }
  }

  function iniciar(apiBase) {
    if (estado.listo) return estado.listo;
    estado.api = String(apiBase).replace(/\/$/, '');
    // El enlace de «¿Olvidaste tu contraseña?» regresa con #access_token=…&type=magiclink; supabase-js lo canjea.
    estado.porEnlace = /access_token=/.test(location.hash) && /type=(magiclink|signup|recovery)/.test(location.hash);
    revisarErrorEnlace();
    // Sin no-store: el servidor deja guardar /config 10 min (openspec: cache-estabilidad).
    estado.listo = fetch(String(apiBase).replace(/\/$/, '') + '/config')
      .then(function (r) { return r.json().then(function (c) { if (!r.ok) throw new Error(c.error || ('HTTP ' + r.status)); return c; }); })
      .then(function (c) {
        if (c.prueba) {
          estado.prueba = true;
          var guardada = leer(CLAVE_PRUEBA);
          try { estado.sesion = guardada ? JSON.parse(guardada) : null; } catch (e) { estado.sesion = null; }
          return;
        }
        return cargarLib().then(function (lib) {
          estado.cliente = lib.createClient(c.supabaseUrl, c.publishableKey, {
            auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'implicit', storageKey: 'stald-auth' },
          });
          estado.cliente.auth.onAuthStateChange(function (_ev, s) { estado.sesion = s ? { email: s.user && s.user.email, token: s.access_token } : null; });
          return estado.cliente.auth.getSession().then(function (r) {
            var s = r && r.data && r.data.session;
            estado.sesion = s ? { email: s.user && s.user.email, token: s.access_token } : null;
          });
        });
      })
      .catch(function (e) { estado.error = e.message || String(e); console.warn('StaldAuth:', estado.error); });
    return estado.listo;
  }

  function email() { return estado.sesion && estado.sesion.email ? String(estado.sesion.email).toLowerCase() : null; }

  // Correo de antes del login (solo durante la transición): se sigue mandando como ?email=.
  function correoViejo() { for (var i = 0; i < CLAVES_VIEJAS.length; i++) { var v = leer(CLAVES_VIEJAS[i]); if (v) return v; } return null; }

  function getToken() {
    if (estado.prueba) return Promise.resolve(estado.sesion ? 'prueba:' + estado.sesion.email : null);
    if (!estado.cliente) return Promise.resolve(null);
    // getSession renueva el token si está por vencer.
    return estado.cliente.auth.getSession().then(function (r) {
      var s = r && r.data && r.data.session;
      estado.sesion = s ? { email: s.user && s.user.email, token: s.access_token } : null;
      return s ? s.access_token : null;
    });
  }

  // cache: 'default' (openspec: cache-estabilidad): con 'no-store' o 'no-cache' Chromium se salta también la caché de
  // verificaciones previas y cada petición con Authorization paga un OPTIONS. Las respuestas con datos personales
  // siguen llegando con Cache-Control: no-store, así que el navegador no las guarda y siempre va a la red.
  function fetchConSesion(url, opts) {
    return getToken().then(function (t) {
      var o = Object.assign({ cache: 'default' }, opts || {});
      var h = new Headers(o.headers || {});
      if (t) h.set('Authorization', 'Bearer ' + t);
      o.headers = h;
      return fetch(url, o);
    });
  }

  // ---------- Peticiones JSON con caché por persona y reintentos (openspec: cache-estabilidad) ----------
  // - GET idénticos en vuelo se juntan en uno; con { ttl } (ms) el resultado ok se guarda en memoria esa vigencia.
  // - La clave lleva el correo de la sesión: nunca se sirve lo de otra persona. salir() y cualquier envío la vacían.
  // - Los GET se reintentan ante red caída, 429, 502, 503 y 504 (2 veces, espera creciente, Retry-After ≤ 5 s).
  //   Los envíos (POST, DELETE) no se reintentan solos: si el servidor alcanzó a procesarlo, se duplicaría.
  // - Sin red responde { ok: false, status: 0, body: { error: 'sin_conexion', mensaje } } en lugar de lanzar.
  var memoria = {}; // clave → { t, ttl, r }
  var enVuelo = {}; // clave → promesa
  var REINTENTABLE = { 429: 1, 502: 1, 503: 1, 504: 1 };
  // Respuestas que no cambian por reintentar (configuración, cupos): se entregan tal cual.
  var PERMANENTE = { sin_base: 1, sin_config: 1, auth_no_disponible: 1, limite_diario: 1, cupo_lleno: 1 };
  var SIN_CONEXION = 'Sin conexión con el servidor. Revisa tu internet e intenta de nuevo.';
  function limpiarCache() { memoria = {}; enVuelo = {}; }
  function copia(r) { return { ok: r.ok, status: r.status, body: JSON.parse(JSON.stringify(r.body)) }; }
  function esperar(ms) { return new Promise(function (ok) { setTimeout(ok, ms); }); }
  function pedirUnaVez(url, opts) {
    return fetchConSesion(url, opts).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (body) {
        return { ok: res.ok, status: res.status, body: body, reintentarEn: Number(res.headers.get('Retry-After')) };
      });
    }, function () { return { ok: false, status: 0, body: { error: 'sin_conexion', mensaje: SIN_CONEXION } }; });
  }
  function pedirConReintentos(url, opts, intento) {
    return pedirUnaVez(url, opts).then(function (r) {
      if (intento >= 2 || !(r.status === 0 || REINTENTABLE[r.status]) || PERMANENTE[r.body && r.body.error]) return r;
      var base = typeof window.__REINTENTO_MS === 'number' ? window.__REINTENTO_MS : 600;
      var ms = r.reintentarEn > 0 ? Math.min(5000, r.reintentarEn * 1000) : base * Math.pow(3, intento);
      return esperar(ms).then(function () { return pedirConReintentos(url, opts, intento + 1); });
    });
  }
  function pedirJson(url, opts, cfg) {
    opts = opts || {};
    var metodo = String(opts.method || 'GET').toUpperCase();
    var limpio = function (r) { return { ok: r.ok, status: r.status, body: r.body }; };
    if (metodo !== 'GET') {
      return pedirUnaVez(url, opts).then(function (r) { limpiarCache(); return limpio(r); });
    }
    var clave = (email() || 'anon') + ' ' + url;
    var ttl = cfg && cfg.ttl > 0 ? cfg.ttl : 0;
    var m = memoria[clave];
    if (m && Date.now() - m.t < m.ttl) return Promise.resolve(copia(m.r));
    if (enVuelo[clave]) return enVuelo[clave].then(copia);
    var p = pedirConReintentos(url, opts, 0).then(function (r) {
      r = limpio(r);
      if (enVuelo[clave] === p) {
        delete enVuelo[clave];
        if (ttl && r.ok) memoria[clave] = { t: Date.now(), ttl: ttl, r: copia(r) };
      }
      return r;
    });
    enVuelo[clave] = p;
    return p.then(copia);
  }

  function esSesionVencida(res, body) {
    return !!res && res.status === 401 && (!body || !body.error || body.error === 'inicia_sesion' || body.error === 'sesion_invalida');
  }

  // Los celulares ponen mayúscula inicial: «Clase» cuenta como la contraseña inicial.
  function normalizar(p) { var t = String(p || '').trim().toLowerCase(); return INICIALES[t] ? t : String(p || ''); }
  var ERROR_CREDENCIALES = 'Correo o contraseña incorrectos. Si la olvidaste, pídele a tu profe que la restablezca.';

  // Entrada con contraseña (openspec: acceso-con-contrasena). Si Supabase la rechaza, pide al servidor preparar la
  // cuenta (solo acepta la contraseña inicial de quien aún no tiene una propia) y lo intenta otra vez.
  // Devuelve { email, inicial }; inicial es 'clase', 'sensei' o null, para pedir el cambio.
  function entrarConContrasena(correo, pwd) {
    correo = String(correo || '').trim().toLowerCase();
    var p = normalizar(pwd);
    if (!CORREO.test(correo)) return Promise.reject(new Error('Escribe un correo válido, por ejemplo tucorreo@gmail.com.'));
    if (!p) return Promise.reject(new Error('Escribe tu contraseña.'));
    var inicial = INICIALES[p] ? p : null;
    if (estado.prueba) {
      estado.sesion = { email: correo, token: 'prueba:' + correo };
      escribir(CLAVE_PRUEBA, JSON.stringify(estado.sesion));
      limpiarCache();
      return Promise.resolve({ email: correo, inicial: inicial });
    }
    if (!estado.cliente) return Promise.reject(new Error('El inicio de sesión no está disponible (' + (estado.error || 'sin configuración') + ').'));
    function intentar() {
      return estado.cliente.auth.signInWithPassword({ email: correo, password: PREFIJO + p }).then(function (r) {
        if (r.error) return null;
        var s = r.data && r.data.session;
        estado.sesion = s ? { email: s.user && s.user.email, token: s.access_token } : null;
        limpiarCache();
        var propia = s && s.user && s.user.app_metadata && s.user.app_metadata.contrasena_propia === true;
        return { email: email(), inicial: propia ? null : inicial };
      });
    }
    return intentar().then(function (ok) {
      if (ok) return ok;
      return fetch(estado.api + '/auth/preparar', { method: 'POST', headers: { 'content-type': 'text/plain;charset=UTF-8' }, body: JSON.stringify({ email: correo, password: p }) })
        .then(function (res) {
          if (res.status === 429) throw new Error('Demasiados intentos con ese correo. Espera 10 minutos o pídele a tu profe que restablezca tu contraseña.');
          if (res.status === 401 || res.status === 400) throw new Error(ERROR_CREDENCIALES);
          if (!res.ok) throw new Error('El inicio de sesión no respondió. Intenta de nuevo en un momento.');
          return intentar();
        }, function () { throw new Error('Sin conexión con el servidor. Revisa tu internet e intenta de nuevo.'); })
        .then(function (r) { if (!r) throw new Error(ERROR_CREDENCIALES); return r; });
    });
  }

  // «¿Olvidaste tu contraseña?»: el servidor manda un enlace de acceso al correo, solo a las clases y al profe.
  function olvideContrasena(correo) {
    correo = String(correo || '').trim().toLowerCase();
    if (!CORREO.test(correo)) return Promise.reject(new Error('Escribe tu correo arriba y vuelve a tocar «¿Olvidaste tu contraseña?».'));
    return fetch(estado.api + '/auth/olvide', { method: 'POST', headers: { 'content-type': 'text/plain;charset=UTF-8' }, body: JSON.stringify({ email: correo }) })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (j) {
          if (res.ok) return 'Te mandamos un enlace a ' + correo + '. Ábrelo para entrar y pon una contraseña nueva. Revisa también spam o promociones.';
          var txt = {
            no_es_de_clase: 'Ese correo no es de las clases. Si vienes a Juegos, entras con tu correo y tu nick.',
            limite_correo: 'Ahorita no se pueden mandar más correos. Pídele a tu profe que restablezca tu contraseña.',
            demasiados_intentos: 'Ya te mandamos varios enlaces. Revisa tu correo (también spam) o pídele a tu profe que restablezca tu contraseña.',
          }[j.error];
          throw new Error(txt || 'No pude mandar el enlace. Pídele a tu profe que restablezca tu contraseña.');
        });
      }, function () { throw new Error('Sin conexión con el servidor. Revisa tu internet e intenta de nuevo.'); });
  }

  function cambiarContrasena(nueva) {
    nueva = String(nueva || '');
    if (nueva.length < 6) return Promise.reject(new Error('Usa al menos 6 caracteres.'));
    if (INICIALES[nueva.trim().toLowerCase()]) return Promise.reject(new Error('Elige una contraseña distinta de la inicial.'));
    return fetchConSesion(estado.api + '/auth/contrasena', { method: 'POST', headers: { 'content-type': 'text/plain;charset=UTF-8' }, body: JSON.stringify({ nueva: nueva }) })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (j) {
          if (res.ok) return true;
          throw new Error(j.error === 'contrasena_invalida' ? 'Usa de 6 a 60 caracteres, distinta de la inicial.' : 'No pude cambiar tu contraseña (' + (j.error || res.status) + '). Intenta de nuevo.');
        });
      });
  }

  // Llave de sesión de un solo uso que da el servidor (registro de Juegos sin validar el correo, openspec:
  // registro-directo-juegos). En modo de prueba, la sesión falsa de siempre.
  function entrarConToken(tokenHash, correo) {
    correo = String(correo || '').trim().toLowerCase();
    if (estado.prueba) {
      estado.sesion = { email: correo, token: 'prueba:' + correo };
      escribir(CLAVE_PRUEBA, JSON.stringify(estado.sesion));
      return Promise.resolve(correo);
    }
    if (!estado.cliente) return Promise.reject(new Error('El inicio de sesión no está disponible.'));
    return estado.cliente.auth.verifyOtp({ token_hash: tokenHash, type: 'magiclink' }).then(function (r) {
      if (r.error) throw new Error('No pude abrir tu sesión (' + r.error.message + '). Intenta de nuevo.');
      var ses = r.data && r.data.session;
      estado.sesion = ses ? { email: ses.user && ses.user.email, token: ses.access_token } : null;
      return email();
    });
  }

  // Cerrar sesión también olvida la partida que Juegos guardó para recargar (openspec: juegos-recarga).
  var CLAVES_JUEGOS = ['juegos_sala_activa', 'juegos_partida_individual'];
  function salir() {
    CLAVES_VIEJAS.concat(CLAVES_JUEGOS).forEach(function (k) { escribir(k, null); });
    escribir(CLAVE_PRUEBA, null);
    estado.sesion = null;
    limpiarCache();
    if (!estado.cliente) return Promise.resolve();
    return estado.cliente.auth.signOut().catch(function () { /* la sesión local ya se borró */ });
  }

  // ---------- Pantalla de entrada reutilizable ----------
  var CSS = '.stald-auth{max-width:440px;margin:0 auto;padding:20px;border-radius:16px;background:var(--card,#fff);color:var(--text,inherit);border:1px solid var(--border,#e6e4f0)}' +
    '.stald-auth h2{margin:0 0 6px;font-size:1.3rem}.stald-auth p{margin:0 0 14px;color:var(--muted,#6b6880);font-size:.92rem}' +
    '.stald-auth label{display:block;font-size:.82rem;font-weight:700;margin:0 0 6px}' +
    '.stald-auth input{width:100%;box-sizing:border-box;font:inherit;font-size:1rem;padding:12px 13px;border-radius:12px;border:1.5px solid var(--border,#d4d2e0);background:var(--bg,#fff);color:inherit}' +
    '.stald-auth button{display:block;width:100%;margin-top:12px;font:inherit;font-weight:700;font-size:1rem;padding:12px 14px;border-radius:12px;border:none;cursor:pointer;color:#fff;background:var(--accent,#4f46e5)}' +
    '.stald-auth button.sec{background:none;color:var(--muted,#6b6880);font-weight:600;font-size:.88rem;padding:8px}' +
    '.stald-auth button:disabled{opacity:.6;cursor:default}' +
    '.stald-auth .msg{margin-top:12px;padding:10px 12px;border-radius:10px;font-size:.88rem;background:#fef2f2;color:#991b1b}' +
    '.stald-auth .ok{background:#ecfdf5;color:#065f46}';
  function ponerCss() {
    if (document.getElementById('stald-auth-css')) return;
    var st = document.createElement('style'); st.id = 'stald-auth-css'; st.textContent = CSS; document.head.appendChild(st);
  }

  // Pinta en el la entrada con correo y contraseña. alEntrar(correo) se llama al tener sesión; si entró con la
  // contraseña inicial, antes pide la nueva (obligatoria con «sensei»).
  function pintarEntrada(el, op) {
    op = op || {};
    ponerCss();
    var aviso = op.aviso || estado.errorEnlace || (estado.error ? 'No pude preparar el inicio de sesión (' + estado.error + '). Revisa tu internet.' : '');
    estado.errorEnlace = null;
    function paso(msg) {
      el.innerHTML = '<div class="stald-auth" data-stald-auth="contrasena"><h2>' + esc(op.titulo || '🔐 Entra a STALD') + '</h2>' +
        '<p>' + esc(op.texto || 'Entra con tu correo y tu contraseña. Si es tu primera vez, usa la que te dio tu profe.') + '</p>' +
        '<form novalidate><label for="stald-auth-correo">Tu correo</label>' +
        '<input id="stald-auth-correo" type="email" inputmode="email" autocomplete="username" autocapitalize="none" placeholder="tucorreo@gmail.com" value="' + esc(op.correo || '') + '">' +
        '<label for="stald-auth-clave" style="margin-top:10px">Tu contraseña</label>' +
        '<input id="stald-auth-clave" type="password" autocomplete="current-password" autocapitalize="none">' +
        '<button type="submit" id="stald-auth-entrar">Entrar →</button></form>' +
        '<button type="button" class="sec" data-stald-auth-olvide>¿Olvidaste tu contraseña?</button>' +
        (msg ? '<div class="msg' + (op.msgOk ? ' ok' : '') + '" role="alert">' + esc(msg) + '</div>' : '') + '</div>' + (op.pie || '');
      op.msgOk = false;
      el.querySelector('[data-stald-auth-olvide]').addEventListener('click', function () {
        var correo = el.querySelector('#stald-auth-correo').value.trim().toLowerCase();
        op.correo = correo;
        olvideContrasena(correo).then(function (t) { op.msgOk = true; paso(t); }, function (err) { paso(err.message); });
      });
      el.querySelector('form').addEventListener('submit', function (e) {
        e.preventDefault();
        var correo = el.querySelector('#stald-auth-correo').value.trim().toLowerCase();
        var b = el.querySelector('#stald-auth-entrar'); b.disabled = true; b.textContent = 'Entrando…';
        entrarConContrasena(correo, el.querySelector('#stald-auth-clave').value).then(function (r) {
          var listo = function () { if (op.alEntrar) op.alEntrar(r.email); };
          if (r.inicial) pintarCambio(el, { obligatorio: r.inicial === 'sensei', alListo: listo }); else listo();
        }, function (err) { op.correo = correo; paso(err.message); });
      });
      var i = el.querySelector(op.correo ? '#stald-auth-clave' : '#stald-auth-correo'); if (i) i.focus();
    }
    paso(aviso);
  }

  // Pide la contraseña nueva. obligatorio: sin «Ahora no» (el profe con «sensei»). alListo() al terminar u omitir.
  // texto y omitir cambian el mensaje y el botón de omitir (p. ej. «Cancelar» desde el portal).
  function pintarCambio(el, op) {
    op = op || {};
    ponerCss();
    function paso(msg) {
      el.innerHTML = '<div class="stald-auth" data-stald-auth="cambio"><h2>🔑 Cambia tu contraseña</h2>' +
        '<p>' + esc(op.texto || (op.obligatorio ? 'Por seguridad, pon una contraseña nueva para seguir.' : 'Estás usando la contraseña inicial. Pon una tuya para que nadie más entre a tu cuenta.')) + '</p>' +
        '<form novalidate><label for="stald-auth-nueva">Contraseña nueva (mínimo 6)</label>' +
        '<input id="stald-auth-nueva" type="password" autocomplete="new-password" autocapitalize="none">' +
        '<label for="stald-auth-nueva2" style="margin-top:10px">Repítela</label>' +
        '<input id="stald-auth-nueva2" type="password" autocomplete="new-password" autocapitalize="none">' +
        '<button type="submit" id="stald-auth-guardar">Guardar</button></form>' +
        (op.obligatorio ? '' : '<button type="button" class="sec" data-stald-auth-despues>' + esc(op.omitir || 'Ahora no') + '</button>') +
        (msg ? '<div class="msg" role="alert">' + esc(msg) + '</div>' : '') + '</div>';
      var despues = el.querySelector('[data-stald-auth-despues]');
      if (despues) despues.addEventListener('click', function () { if (op.alListo) op.alListo(); });
      el.querySelector('form').addEventListener('submit', function (e) {
        e.preventDefault();
        var a = el.querySelector('#stald-auth-nueva').value, b2 = el.querySelector('#stald-auth-nueva2').value;
        if (a !== b2) return paso('Las dos contraseñas no son iguales.');
        var b = el.querySelector('#stald-auth-guardar'); b.disabled = true; b.textContent = 'Guardando…';
        cambiarContrasena(a).then(function () { if (op.alListo) op.alListo(); }, function (err) { paso(err.message); });
      });
      var i = el.querySelector('#stald-auth-nueva'); if (i) i.focus();
    }
    paso('');
  }

  window.StaldAuth = {
    iniciar: iniciar,
    email: email,
    correoViejo: correoViejo,
    getToken: getToken,
    fetchConSesion: fetchConSesion,
    pedirJson: pedirJson,
    limpiarCache: limpiarCache,
    esSesionVencida: esSesionVencida,
    entrarConContrasena: entrarConContrasena,
    cambiarContrasena: cambiarContrasena,
    olvideContrasena: olvideContrasena,
    entroPorEnlace: function () { return estado.porEnlace; },
    salir: salir,
    pintarEntrada: pintarEntrada,
    pintarCambio: pintarCambio,
    entrarConToken: entrarConToken,
    modoPrueba: function () { return estado.prueba; },
    disponible: function () { return estado.prueba || !!estado.cliente; },
  };
})();
