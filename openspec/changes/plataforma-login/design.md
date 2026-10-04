## Decisiones

### 1. Flujo en el navegador (`comun/auth.js`, compartido por las 4 páginas)
- Se usa supabase-js (el mismo de Realtime, que ya se carga diferido) con `createClient(url, publishableKey)` y
  `persistSession: true`.
- Pantalla de entrada:
  - campo de correo y botón «📧 Enviarme el enlace» → `auth.signInWithOtp({ email, options: { emailRedirectTo:
    location.href, shouldCreateUser: true } })`;
  - mensaje «Revisa tu correo ✉️» con un campo para el código de 6 dígitos → `verifyOtp`.
- Al volver del enlace, supabase-js toma la sesión de la URL y la limpia.
- `api()` agrega `Authorization: Bearer <access_token>` a cada petición; supabase-js renueva el token solo.
- 🚪 Cerrar sesión: `auth.signOut()` y regreso a la pantalla de entrada.

### 2. Servidor (`server/auth.ts`)
- `quienEs(req)` sigue este orden:
  1. Con `Authorization: Bearer`, valida con `GET {SUPABASE_URL}/auth/v1/user`, con `apikey` (publishable) y el
     token, y obtiene el correo verificado.
     - El resultado se guarda en caché 5 min por hash del token (se ahorran peticiones).
     - Si el token es inválido o venció: 401 `sesion_invalida`.
  2. Sin token, durante la transición (hasta `LOGIN_TRANSICION_HASTA`, ver §4), acepta `?email=` como hoy,
     **excepto para el admin**.
  3. Fuera de la transición, sin token: 401 `inicia_sesion`.
- Las rutas usan el correo que devuelve `quienEs`, no el de la URL.
- Pruebas locales:
  - `ROWS_FIXTURE` activa un verificador falso (`Bearer prueba:<correo>`);
  - el verificador falso no existe si `ROWS_FIXTURE` no está definido.

### 3. Supabase Auth (configuración, la hace el agente con la CLI o el panel)
- Site URL: `https://jalducin.github.io/platform-STALD/`; redirecciones permitidas: esa ruta y `http://localhost:8765/*`.
- Plantilla del enlace mágico en español, con el asunto «Tu enlace para entrar a STALD».
- SMTP: Resend o Gmail, para quitar el límite del servicio incluido. Las credenciales van solo en el panel de
  Supabase, nunca en el repo.
- Registro abierto (`shouldCreateUser`). Un usuario sin registro en la plataforma solo ve «No encontré tus
  clases».

### 4. Transición
1. Se despliega y las páginas empiezan a pedir el enlace. **No hay variable que activar**: el servidor acepta
   `?email=` sin token hasta la fecha `LOGIN_TRANSICION_HASTA` (constante `2026-10-12`, inclusive, hora de CDMX;
   se puede sobreescribir con la variable de entorno del mismo nombre).
2. Al día siguiente, `?email=` sin token deja de aceptarse solo (401 `inicia_sesion`), sin desplegar nada.
3. El admin (`SUPER_ADMIN_EMAIL`) requiere sesión desde el día 1, incluso durante la transición.

## Pruebas
- Unitarias de `auth.ts`:
  - token válido, inválido y vencido;
  - caché;
  - transición con y sin admin;
  - sin token fuera de la transición.
- E2E con el verificador falso:
  - entrada → sesión → Inglés, Juegos y portal funcionan;
  - cerrar sesión regresa a la pantalla de entrada;
  - el admin sin sesión recibe 401.
- Producción:
  - enlace mágico real al correo del profe;
  - entrar, ver Inglés y cerrar sesión;
  - `?email=` del admin rechazado.

## Ajuste del profe (2026-10-04): alumnos actuales registrados de una vez

- Las personas que ya están en la plataforma (alumnos, alumnas, invitados de Juegos y el profe) se dan de alta
  directamente en Supabase Auth con la API de admin (`createUser`, con `email_confirm: true`). No tienen que
  registrarse.
- Para entrar la primera vez en un dispositivo, el profe genera desde su vista un **🔗 enlace de acceso** por
  persona (`generateLink` de tipo `magiclink`) y se lo manda por WhatsApp. No se usa el correo, así que no cuenta
  para el límite del SMTP.
- Las altas nuevas reciben el enlace por correo, con el flujo normal.

## Decisiones del Sprint 3 (implementación, 2026-10-04)

### 5. Configuración pública: `GET /config`
- Sin sesión. Devuelve `{ supabaseUrl, publishableKey }` desde las variables `SUPABASE_URL` y
  `SUPABASE_PUBLISHABLE_KEY`, para no fijar llaves en el repo. Sin variables: 503 `sin_config`.
- Con `ROWS_FIXTURE` (solo pruebas locales) devuelve `{ prueba: true }` y el navegador usa el verificador falso.

### 6. `comun/auth.js` (script clásico, `window.StaldAuth`)
- `iniciar(apiBase)`: lee `/config`, carga supabase-js 2.45.4 (el mismo UMD de Realtime) y crea el cliente con
  `persistSession`, `autoRefreshToken`, `detectSessionInUrl` y `flowType: 'implicit'` (los enlaces generados por la
  Admin API solo funcionan con el flujo implícito). Misma sesión en todas las páginas (mismo origen).
- `email()`, `getToken()`, `enviarEnlace(correo)` (`signInWithOtp`), `verificarCodigo(correo, código)`
  (`verifyOtp` tipo `email`), `salir()` (`signOut` y borra las claves viejas `stald_email`, `ingles_email` y
  `secundaria_email`), `fetchConSesion(url, opts)` (agrega `Authorization: Bearer`) y `esSesionVencida(res, body)`.
- `pintarEntrada(elemento, { titulo, texto, correo, aviso, alEntrar })`: pantalla de entrada reutilizable (correo →
  «📧 Enviarme el enlace» → «Revisa tu correo ✉️» con el código de 6 dígitos). Estilos propios con prefijo
  `stald-auth-` que heredan las variables de cada página.
- **Modo prueba**: si `/config` responde `{ prueba: true }`, no se carga supabase-js; el código de 6 dígitos de
  prueba es cualquier número de 6 cifras y la sesión es `prueba:<correo>` en `localStorage.stald_sesion_prueba`.
  En producción `/config` nunca devuelve `prueba`, y el servidor no acepta esos tokens.
- **Transición en las páginas**: si no hay sesión pero sí un correo guardado de antes (`stald_email`…), la página
  sigue entrando con `?email=` y muestra el aviso «🔒 Activa tu acceso seguro». Si el servidor responde 401
  (`inicia_sesion` o `sesion_invalida`), la página muestra la pantalla de entrada.

### 7. Servidor
- `quienEs(req, deps)` en `server/auth.ts` devuelve `{ ok: true, email, verificado }` o
  `{ ok: false, status, error }`. `main.ts` lo llama una vez por petición (salvo `OPTIONS`, `/salud`, `/config` y
  `/juegos/foto/<token>`, que no usan identidad) y todas las rutas reciben ese correo.
- Errores: 401 `sesion_invalida` (token rechazado), 401 `inicia_sesion` (sin token fuera de la transición o admin
  sin token), 503 `auth_no_disponible` (Supabase no respondió o no está configurado; no se guarda en caché).
- Caché del token: 5 min por SHA-256 del token, con tope de 2,000 entradas.
- CORS: `Access-Control-Allow-Headers: content-type, authorization`. El encabezado obliga a la verificación previa
  (`OPTIONS`), que el navegador recuerda un día por URL (`Access-Control-Max-Age`).
- Verificador falso: con `ROWS_FIXTURE`, `Bearer prueba:<correo>` es válido. Sin `ROWS_FIXTURE` no existe.

### 8. Alta de las personas actuales y enlace de acceso
- `herramientas/alta-usuarios-auth.ts --correos <archivo>` (uno por línea; el archivo **no** va al repo) da de alta
  cada correo con `POST /auth/v1/admin/users` `{ email, email_confirm: true }`. Un correo que ya existe cuenta como
  «ya existía». `--prueba` no llama a la red. Variables: `SUPABASE_URL` y `SUPABASE_SERVICE_KEY` solo en el proceso.
- `POST /auth/enlace { email }`: solo el admin **con sesión** (no basta `?email=`). Llama a
  `POST /auth/v1/admin/generate_link` `{ type: "magiclink", email, redirect_to }` con la llave de servicio y devuelve
  `{ enlace, codigo }` para mandarlo por WhatsApp. `redirect_to` = `SITIO_URL` o
  `https://jalducin.github.io/platform-STALD/`. 403 `solo_admin`, 400 `correo_invalido`, 404 `sin_cuenta` (correo
  sin alta en Supabase Auth), 503 `auth_no_disponible`.
- El botón «🔗 Enlace de acceso» vive en el portal (vista del admin), porque `ingles.html` se rediseña en paralelo
  (Sprint 2); Inglés puede reutilizar la misma ruta después.

### 9. Modelo de amenaza mínimo
- **Suplantación por correo**: cerrada para el admin desde el día 1 y para todos después de `LOGIN_TRANSICION_HASTA`.
- **Token robado**: dura lo que la sesión de Supabase (1 h el de acceso; se renueva). Cerrar sesión lo revoca en
  Supabase, pero el servidor puede aceptarlo hasta 5 min más por la caché.
- **Mismo origen en GitHub Pages**: `jalducin.github.io` es el mismo origen para todos los sitios Pages de la cuenta;
  cualquier otra página publicada ahí podría leer `localStorage` (y la sesión). No publicar páginas de terceros en
  esa cuenta.
- **Llaves**: la publishable va al navegador (es pública por diseño); la de servicio solo en Deno y en el proceso
  de la herramienta, nunca en el repo.
- **Registro abierto**: cualquiera puede pedir un enlace, pero sin registro en Notion/invitados no ve datos
  (`/perfil` → `conocido: false`; Juegos le ofrece entrar como invitado).
