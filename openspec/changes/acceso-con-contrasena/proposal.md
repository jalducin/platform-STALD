## Why

El 8 de octubre de 2026 nadie pudo volver a entrar: Supabase respondió `429 email rate limit exceeded`. Su correo
gratuito solo permite unos cuantos envíos por hora, y cada entrada con enlace o código gasta uno. Bastó con que el
profe abriera «🆕 Registrar» en Juegos (que cierra la sesión) y con que Jesús intentara entrar para que ambos se
quedaran fuera. Depender del correo para entrar es frágil para un grupo que entra a la misma hora.

## What Changes

- **Las clases (alumnos, alumnas y el profe) entran con correo y contraseña**, sin enlaces ni códigos por correo.
  - Contraseña inicial: «clase» para alumnos y alumnas, «sensei» para el profe.
  - La primera vez que alguien entra con la inicial, el servidor le prepara la cuenta, sin mandar correo.
  - Al entrar con la inicial se pide cambiarla. El profe debe cambiarla para seguir; alumnos y alumnas pueden
    dejarlo para después («Ahora no»).
  - El portal ofrece «🔑 Cambiar contraseña».
  - Si alguien olvida su contraseña, el profe la **restablece** a la inicial desde el portal. Esto reemplaza a
    «🔗 Enlace de acceso».
  - «¿Olvidaste tu contraseña?» manda un enlace por correo, solo a las clases y al profe (máximo 3 por correo cada
    hora). Al volver con él, se pide una contraseña nueva. Es el respaldo del profe si no acierta la suya.
- **Juegos**: quien no es de las clases se registra o entra con **correo y nick**, sin contraseña ni correo, como
  el registro directo de hoy. Si el correo es de las clases, Juegos pide su contraseña.
- **BREAKING**: se quitan el enlace mágico, el código por correo y la ayuda «¿No te llegó? / Reenviarme el enlace».

## Capabilities

### New Capabilities
<!-- ninguna -->

### Modified Capabilities
- `plataforma`: entrada con correo y contraseña, contraseña inicial, cambio y restablecimiento; se quita la ayuda
  de reenvío del enlace.
- `juegos`: registro y entrada de invitados con correo y nick; los correos de clase entran con contraseña; se quita
  el código de 8 dígitos.
- `portal`: el registro desde Juegos ya no pide enlace; el profe restablece contraseñas en lugar de mandar enlaces.

## Impact

- Frontend: `comun/auth.js` (entrada y cambio de contraseña), `index.html`, `juegos.html`, `ingles/app.js` y
  `secundaria.html`.
- Servidor: `server/auth.ts` (rutas nuevas `/auth/preparar`, `/auth/contrasena` y `/auth/restablecer`) y
  `server/main.ts`.
- Supabase Auth:
  - Las contraseñas se guardan con el prefijo `stald·`, para que las de 5 letras cumplan el mínimo de 6.
  - `app_metadata.contrasena_propia` marca si la persona ya la cambió.
- Riesgo aceptado por el profe: mientras alguien no cambie «clase», quien sepa su correo puede entrar a su cuenta.
