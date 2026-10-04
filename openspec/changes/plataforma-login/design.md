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
  2. Sin token, durante la transición (`LOGIN_TRANSICION=1`), acepta `?email=` como hoy, **excepto para el admin**.
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
1. Se despliega con `LOGIN_TRANSICION=1` y las páginas empiezan a pedir el enlace.
2. Una semana después se quita la variable y `?email=` deja de aceptarse.
3. El admin requiere sesión desde el día 1.

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
