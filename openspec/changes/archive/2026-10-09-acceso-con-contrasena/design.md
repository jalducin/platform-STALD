## Context

La sesión es de Supabase Auth y el servidor identifica a cada persona con el JWT (`quienEs`). Hoy se entra con
enlace mágico o código por correo, y el correo gratuito de Supabase se agota (429).

El registro directo de Juegos ya crea la sesión sin correo: el servidor pide `generate_link` con la llave de
servicio y la página canjea el `hashed_token`.

## Goals / Non-Goals

**Goals:**
- Entrar sin depender del correo.
- Una contraseña inicial que conozca el grupo.
- Cambio y restablecimiento de contraseña sin correo.
- Juegos con correo y nick para invitados.

**Non-Goals:**
- Recuperar la contraseña por correo.
- Contraseñas para los invitados de Juegos.
- SMTP propio.

## Decisions

1. **Contraseña derivada `stald·<lo que escribe>`.** Supabase exige un mínimo de 6 caracteres y «clase» tiene 5.
   La página y el servidor anteponen el prefijo. No es un secreto; solo ajusta la longitud.
2. **Preparación perezosa** con `POST /auth/preparar { email, password }`, sin sesión.
   - La página intenta `signInWithPassword`; si falla, llama a preparar.
   - El servidor solo acepta en dos casos:
     - el correo es del profe y la contraseña es «sensei»;
     - el correo es de las clases (`resolverJugador`, no invitado) y la contraseña es «clase».
   - Además, la cuenta de Auth no debe existir o no debe tener `app_metadata.contrasena_propia = true`.
   - Si se cumple, crea la cuenta con el correo confirmado o le pone la contraseña inicial, y la página vuelve a
     intentar.
   - Así no hay que dar de alta contraseñas en masa ni mandar correos.
   - Límite en memoria: 10 intentos por correo cada 10 minutos (429).
   - Alternativa descartada: que el servidor haga el login con contraseña. Supabase limita los inicios de sesión
     por IP, y todos saldrían de la IP del servidor.
3. **Cambio** con `POST /auth/contrasena { nueva }`, con sesión. Acepta de 6 a 72 caracteres distintos de las
   iniciales. El servidor la pone con la Admin API y marca `contrasena_propia = true`.
4. **Restablecer** con `POST /auth/restablecer { email }`, solo el profe. Pone una contraseña aleatoria y
   `contrasena_propia = false`, para que la persona vuelva a entrar con la inicial.
5. **¿Debe cambiarla?** Al entrar, si lo que escribió es una inicial, la página pide el cambio. Con «sensei» es
   obligatorio, sin «Ahora no»; con «clase» es opcional.
6. **Juegos.** La entrada de Juegos pide correo y nick y llama al registro directo (`/juegos/registro`), que ya
   registra o reingresa a un invitado. Si responde `correo_de_clase`, la misma pantalla pide la contraseña.
7. **Modo de prueba** (`ROWS_FIXTURE`): no usa Supabase. La página acepta cualquier contraseña no vacía y crea la
   sesión falsa de siempre, igual que antes con el código.

## Risks / Trade-offs

- **Contraseña inicial compartida.** Mitigación: se pide cambiarla al entrar y el profe puede restablecerla.
- **Quien conoce el correo y el nick de un invitado entra a su cuenta de Juegos.** Aceptado: Juegos no tiene
  calificaciones y los correos de clase piden contraseña.
- **`listarCuentas` lee hasta 1000 cuentas para encontrar una.** Suficiente para el tamaño actual.
