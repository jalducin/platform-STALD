## Why

Hoy toda la plataforma (portal, Inglés, Juegos y Secundaria) identifica a cada persona **solo por su correo**: se
escribe en la página y viaja como `?email=` en cada petición. No se verifica nada. Cualquiera que sepa el correo de
alguien puede entrar como esa persona, ver sus calificaciones o hacer sus exámenes, e incluso entrar como admin si
conoce el correo del admin.

El profe aprobó resolverlo en el Sprint 3, aprovechando Supabase, que ya usamos.

## What Changes

- **Inicio de sesión con enlace mágico** (Supabase Auth, sin contraseñas):
  1. La persona escribe su correo y presiona «📧 Enviarme el enlace».
  2. Abre el correo y toca el enlace.
  3. Queda dentro, con una sesión que dura semanas en ese dispositivo.
  - Opcionalmente, un código de 6 dígitos en el mismo correo, para quien abra el correo en otro dispositivo.
- **El servidor verifica la sesión:**
  - cada petición manda `Authorization: Bearer <token>`;
  - Deno valida el token con Supabase (`/auth/v1/user`) y obtiene el correo **verificado**;
  - las reglas de quién puede ver qué no cambian: alumno o alumna por su registro, admin por `SUPER_ADMIN_EMAIL`,
    invitados de Juegos e integrantes de Secundaria.
- **Transición sin cortes:**
  - durante una semana conviven el modo actual (`?email=`) y el nuevo;
  - la página empieza a pedir el enlace;
  - después, `?email=` deja de aceptarse;
  - el admin siempre requiere sesión desde el primer día.
- **Correo de envío propio (SMTP):**
  - El servicio de correo incluido en Supabase solo permite **pocos correos por hora**, lo que no alcanza para un
    grupo que entra a la vez.
  - Se configura un SMTP gratuito: Resend (3,000 correos al mes) o Gmail con contraseña de aplicación.
  - El correo dice «Plataforma STALD» y está en español.
- 🚪 **Cerrar sesión** en el menú 👤 Perfil y en el portal.

## Capabilities

### New Capabilities
- `plataforma-login`: autenticación con enlace mágico y verificación en el servidor.

### Modified Capabilities
- `plataforma`: identificación de cada persona en portal, Inglés, Juegos y Secundaria.

## Impact

- Archivos que cambian:
  - `index.html`, `ingles.html`, `juegos.html` y `secundaria.html`;
  - `server/main.ts`: `quienEs(req)`.
- Archivo nuevo: `server/auth.ts`.
- Configuración de Supabase Auth:
  - URL del sitio;
  - redirecciones permitidas a GitHub Pages;
  - plantilla del correo en español;
  - SMTP.
- Variables de Deno: ninguna nueva.
- Se ajustan los E2E: un modo de prueba local acepta un token falso solo si `PERMITIR_HOY=1` / `ROWS_FIXTURE`, nunca
  en producción.
