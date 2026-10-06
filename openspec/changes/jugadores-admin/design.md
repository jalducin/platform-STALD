## Decisiones
- **`server/jugadores.ts`** con la función pura `armarJugadores({ admin, ingles, secundaria, invitados, semana,
  cuentas })`:
  - identidad con la misma prioridad que `resolverJugador`: alumno de Inglés > Secundaria > invitado;
  - un correo aparece una sola vez y el admin no aparece;
  - `pendientes`: cuentas de Auth cuyo correo no es jugador ni admin; «sin confirmar» si no tiene
    `email_confirmed_at`, si no «sin apodo».
- **`listarCuentas` en `server/auth.ts`**:
  - `GET /auth/v1/admin/users` con la llave de servicio (solo servidor), guardada 60 s en `main.ts`;
  - si falla, la pestaña muestra a los jugadores y avisa que no pudo leer los pendientes (`cuentasError`);
  - en modo de prueba, las cuentas salen de la clave `cuentas` de `ROWS_FIXTURE`.
- **Puntos y partidas de la semana:** del mismo `leerSemana` que usa el ranking.
- **Enlace:** se reutiliza `/auth/enlace`; `destino: "juegos"` cambia `redirect_to` a `<sitio>/juegos.html`, que ya
  está en las redirecciones permitidas (`platform-STALD/**`).

## Pruebas
- Unitarias (`server/jugadores_test.ts` y `server/auth_test.ts`):
  - armado y prioridad de identidad, sin duplicados ni el admin;
  - pendientes «sin confirmar» y «sin apodo»;
  - la ruta: 403 para quien no es admin y 200 con listas para el admin;
  - `cuentasError` si Auth falla;
  - `listarCuentas` con Auth falsa;
  - `destino: "juegos"`.
- E2E `e2e-jugadores.js`:
  - el admin ve la pestaña, las listas y el buscador, y genera el enlace de un pendiente;
  - una alumna no ve la pestaña.
