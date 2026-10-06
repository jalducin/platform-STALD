## Decisiones
- **Alta compartida.** La lógica de `POST /juegos/invitado` (apodo, aviso, cupo de 500 y reintentos por concurrencia)
  pasa a `registrarInvitado(store, email, nombre, ahora)` en `server/juegos.ts`. La usan `/juegos/invitado` y
  `/juegos/registro`, sin duplicar código.
- **Sesión directa.** `generarEnlace(deps, email, redirect)` en `server/auth.ts` agrupa lo que hacía `handleEnlace`:
  `generate_link` y, si la cuenta no existe, el alta con correo confirmado y un segundo intento. Devuelve
  `action_link`, `email_otp` y `hashed_token`.
  - `handleEnlace` la reutiliza.
  - `/juegos/registro` entrega solo `hashed_token` como `token_hash`, que es de un solo uso y vence como cualquier
    enlace.
  - En modo de prueba (`ROWS_FIXTURE`) responde `{ prueba: true }` y la página usa la sesión falsa de siempre.
- **Ruta sin identidad.** `/juegos/registro` se atiende antes de exigir sesión, igual que `/salud`. Valida el correo
  y, antes de tocar Auth, decide con `resolverJugador`: alumno, alumna o admin → 409 `correo_de_clase`.
- **Cliente.** `StaldAuth.entrarConToken(tokenHash, correo)`:
  - con sesión real, `verifyOtp({ token_hash, type: "magiclink" })`;
  - en prueba, la sesión falsa.
  - Juegos usa `fetch` directo (sin sesión) para `/juegos/registro`, luego `entrarConToken`, borra el registro
    pendiente e inicia.
- **Código de acceso.** Acepta `^\d{6,8}$`, con `maxlength="8"` y el texto «el código que viene en el mismo correo».

## Pruebas
- Unitarias:
  - `server/registro_test.ts`: alta y `token_hash`; 409 para alumno, alumna y admin; 400 para apodo inválido, sin
    aviso o correo inválido; invitado que regresa; 503 si Auth falla; modo de prueba;
  - `server/auth_test.ts`: `generarEnlace` con `hashed_token` y alta si falta la cuenta.
- E2E `login`:
  - registro paso 2 con correo entra al instante con su apodo, sin código;
  - el correo de una alumna pasa a la entrada con enlace;
  - el código de 8 dígitos se acepta en el portal.
