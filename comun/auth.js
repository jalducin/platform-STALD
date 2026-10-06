// Inicio de sesión de STALD con Supabase Auth (openspec: plataforma-login). Script clásico: expone window.StaldAuth.
// Uso en una página:
//   <script src="comun/auth.js?v=1"></script>
//   await StaldAuth.iniciar(API_BASE);           // lee /config, carga supabase-js y recupera la sesión
//   StaldAuth.email()                            // correo de la sesión o null
//   StaldAuth.fetchConSesion(url, opts)          // fetch con Authorization: Bearer <token>
//   StaldAuth.esSesionVencida(res, body)         // true si el servidor respondió 401 de sesión
//   StaldAuth.pintarEntrada(el, { titulo, texto, correo, aviso, alEntrar, pie })  // pie: HTML propio bajo el formulario
//   StaldAuth.salir()                            // cierra la sesión y borra las claves viejas de correo y las de Juegos
// La sesión se comparte entre portal, Inglés, Juegos y Secundaria (mismo origen, localStorage).
(function () {
  'use strict';
  var SUPABASE_JS = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js';
  var CLAVES_VIEJAS = ['stald_email', 'ingles_email', 'secundaria_email']; // modo anterior (solo correo)
  var CLAVE_PRUEBA = 'stald_sesion_prueba'; // solo si el servidor local responde /config { prueba: true }
  var CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  var estado = { listo: null, cliente: null, prueba: false, sesion: null, error: null, errorEnlace: null };

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
    revisarErrorEnlace();
    estado.listo = fetch(String(apiBase).replace(/\/$/, '') + '/config', { cache: 'no-store' })
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

  function fetchConSesion(url, opts) {
    return getToken().then(function (t) {
      var o = Object.assign({ cache: 'no-store' }, opts || {});
      var h = new Headers(o.headers || {});
      if (t) h.set('Authorization', 'Bearer ' + t);
      o.headers = h;
      return fetch(url, o);
    });
  }

  function esSesionVencida(res, body) {
    return !!res && res.status === 401 && (!body || !body.error || body.error === 'inicia_sesion' || body.error === 'sesion_invalida');
  }

  function enviarEnlace(correo) {
    correo = String(correo || '').trim().toLowerCase();
    if (!CORREO.test(correo)) return Promise.reject(new Error('Escribe un correo válido, por ejemplo tucorreo@gmail.com.'));
    if (estado.prueba) return Promise.resolve();
    if (!estado.cliente) return Promise.reject(new Error('El inicio de sesión no está disponible (' + (estado.error || 'sin configuración') + ').'));
    var destino = location.origin + location.pathname + location.search;
    return estado.cliente.auth.signInWithOtp({ email: correo, options: { emailRedirectTo: destino, shouldCreateUser: true } }).then(function (r) {
      if (r.error) throw new Error(/rate|seconds/i.test(r.error.message) ? 'Ya te mandamos un enlace hace poco. Espera un minuto y vuelve a intentar.' : r.error.message);
    });
  }

  function verificarCodigo(correo, codigo) {
    correo = String(correo || '').trim().toLowerCase();
    codigo = String(codigo || '').replace(/\s/g, '');
    if (!/^\d{6}$/.test(codigo)) return Promise.reject(new Error('El código tiene 6 números.'));
    if (estado.prueba) {
      estado.sesion = { email: correo, token: 'prueba:' + correo };
      escribir(CLAVE_PRUEBA, JSON.stringify(estado.sesion));
      return Promise.resolve(correo);
    }
    if (!estado.cliente) return Promise.reject(new Error('El inicio de sesión no está disponible.'));
    return estado.cliente.auth.verifyOtp({ email: correo, token: codigo, type: 'email' }).then(function (r) {
      if (r.error) throw new Error(/expired|invalid/i.test(r.error.message) ? 'El código no es válido o ya venció. Pide otro enlace.' : r.error.message);
      var s = r.data && r.data.session;
      estado.sesion = s ? { email: s.user && s.user.email, token: s.access_token } : null;
      return email();
    });
  }

  // Cerrar sesión también olvida la partida que Juegos guardó para recargar (openspec: juegos-recarga).
  var CLAVES_JUEGOS = ['juegos_sala_activa', 'juegos_partida_individual'];
  function salir() {
    CLAVES_VIEJAS.concat(CLAVES_JUEGOS).forEach(function (k) { escribir(k, null); });
    escribir(CLAVE_PRUEBA, null);
    estado.sesion = null;
    if (!estado.cliente) return Promise.resolve();
    return estado.cliente.auth.signOut().catch(function () { /* la sesión local ya se borró */ });
  }

  // ---------- Pantalla de entrada reutilizable ----------
  var CSS = '.stald-auth{max-width:440px;margin:0 auto;padding:20px;border-radius:16px;background:var(--card,#fff);color:var(--text,inherit);border:1px solid var(--border,#e6e4f0)}' +
    '.stald-auth h2{margin:0 0 6px;font-size:1.3rem}.stald-auth p{margin:0 0 14px;color:var(--muted,#6b6880);font-size:.92rem}' +
    '.stald-auth label{display:block;font-size:.82rem;font-weight:700;margin:0 0 6px}' +
    '.stald-auth input{width:100%;box-sizing:border-box;font:inherit;font-size:1rem;padding:12px 13px;border-radius:12px;border:1.5px solid var(--border,#d4d2e0);background:var(--bg,#fff);color:inherit}' +
    '.stald-auth input.codigo{letter-spacing:.4em;text-align:center;font-size:1.3rem}' +
    '.stald-auth button{display:block;width:100%;margin-top:12px;font:inherit;font-weight:700;font-size:1rem;padding:12px 14px;border-radius:12px;border:none;cursor:pointer;color:#fff;background:var(--accent,#4f46e5)}' +
    '.stald-auth button.sec{background:none;color:var(--muted,#6b6880);font-weight:600;font-size:.88rem;padding:8px}' +
    '.stald-auth button:disabled{opacity:.6;cursor:default}' +
    '.stald-auth .msg{margin-top:12px;padding:10px 12px;border-radius:10px;font-size:.88rem;background:#fef2f2;color:#991b1b}' +
    '.stald-auth .ok{background:#ecfdf5;color:#065f46}';
  function ponerCss() {
    if (document.getElementById('stald-auth-css')) return;
    var st = document.createElement('style'); st.id = 'stald-auth-css'; st.textContent = CSS; document.head.appendChild(st);
  }

  // Pinta en `el` el paso 1 (correo) y luego el paso 2 (código). `alEntrar(correo)` se llama al tener sesión.
  function pintarEntrada(el, op) {
    op = op || {};
    ponerCss();
    var aviso = op.aviso || estado.errorEnlace || (estado.error ? 'No pude preparar el inicio de sesión (' + estado.error + '). Revisa tu internet.' : '');
    estado.errorEnlace = null;
    function paso1(msg) {
      el.innerHTML = '<div class="stald-auth" data-stald-auth="correo"><h2>' + esc(op.titulo || '🔐 Entra a STALD') + '</h2>' +
        '<p>' + esc(op.texto || 'Te mandamos un enlace a tu correo para entrar, sin contraseña.') + '</p>' +
        '<form novalidate><label for="stald-auth-correo">Tu correo</label>' +
        '<input id="stald-auth-correo" type="email" inputmode="email" autocomplete="email" placeholder="tucorreo@gmail.com" value="' + esc(op.correo || '') + '">' +
        '<button type="submit" id="stald-auth-enviar">📧 Enviarme el enlace</button></form>' +
        (msg ? '<div class="msg" role="alert">' + esc(msg) + '</div>' : '') + '</div>' + (op.pie || '');
      el.querySelector('form').addEventListener('submit', function (e) {
        e.preventDefault();
        var correo = el.querySelector('#stald-auth-correo').value.trim().toLowerCase();
        var b = el.querySelector('#stald-auth-enviar'); b.disabled = true; b.textContent = 'Enviando…';
        enviarEnlace(correo).then(function () { paso2(correo); }, function (err) { op.correo = correo; paso1(err.message); });
      });
    }
    function paso2(correo, msg) {
      el.innerHTML = '<div class="stald-auth" data-stald-auth="codigo"><h2>Revisa tu correo ✉️</h2>' +
        '<p>Te mandamos un enlace a <b>' + esc(correo) + '</b>. Tócalo para entrar. Si lo abres en otro aparato, escribe aquí el código de 6 números que viene en el mismo correo.</p>' +
        '<form novalidate><label for="stald-auth-codigo">Código</label>' +
        '<input id="stald-auth-codigo" class="codigo" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="000000">' +
        '<button type="submit" id="stald-auth-verificar">Entrar →</button></form>' +
        '<button type="button" class="sec" data-stald-auth-otro>Usar otro correo</button>' +
        (msg ? '<div class="msg" role="alert">' + esc(msg) + '</div>' : '') + '</div>';
      el.querySelector('[data-stald-auth-otro]').addEventListener('click', function () { op.correo = correo; paso1(); });
      el.querySelector('form').addEventListener('submit', function (e) {
        e.preventDefault();
        var b = el.querySelector('#stald-auth-verificar'); b.disabled = true;
        verificarCodigo(correo, el.querySelector('#stald-auth-codigo').value).then(function (c) {
          if (op.alEntrar) op.alEntrar(c);
        }, function (err) { paso2(correo, err.message); });
      });
      var i = el.querySelector('#stald-auth-codigo'); if (i) i.focus();
    }
    paso1(aviso);
  }

  window.StaldAuth = {
    iniciar: iniciar,
    email: email,
    correoViejo: correoViejo,
    getToken: getToken,
    fetchConSesion: fetchConSesion,
    esSesionVencida: esSesionVencida,
    enviarEnlace: enviarEnlace,
    verificarCodigo: verificarCodigo,
    salir: salir,
    pintarEntrada: pintarEntrada,
    modoPrueba: function () { return estado.prueba; },
    disponible: function () { return estado.prueba || !!estado.cliente; },
  };
})();
