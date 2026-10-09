## Why

La cuenta de Jesús en Supabase Auth quedó con el correo **sin confirmar**: se creó con un intento de enlace
mágico que nunca abrió. `/auth/preparar` le pone la contraseña inicial, pero no confirma el correo, y Supabase
rechaza el inicio de sesión de cuentas sin confirmar. Jesús vería «Correo o contraseña incorrectos» aunque
escribiera «clase».

## What Changes

- Al preparar la cuenta de alguien de las clases o del profe, el servidor también confirma su correo
  (`email_confirm: true`). Es seguro: solo pasa con correos registrados en las clases y con su contraseña inicial.

## Capabilities

### New Capabilities
<!-- ninguna -->

### Modified Capabilities
- `plataforma`: «Entrada con correo y contraseña» confirma el correo al preparar la cuenta.

## Impact

- `server/contrasena.ts` (`actualizar` con `email_confirm`) y `server/contrasena_test.ts`.
