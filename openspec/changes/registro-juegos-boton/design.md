## Decisiones
- **Apodo antes del correo.** El paso 1 valida el apodo con la misma regla que el servidor (2 a 20 letras o
  números) y la aceptación del aviso. Los guarda en `localStorage` (`juegos_registro`, sin correo).
- **Paso 2.** Usa `StaldAuth.pintarEntrada` con el título «🆕 Crea tu cuenta de Juegos», así que el enlace y el
  código funcionan igual que en la entrada normal.
- **Al volver con sesión.** Si `/juegos/yo` responde `no_registrado` y hay un registro pendiente, se manda
  `POST /juegos/invitado` con el apodo y `acepto: true`, se borra el pendiente y se entra al hub. Si falla, se
  muestra la pantalla del apodo con el error. Si el correo ya era de alumno o alumna, el pendiente se borra sin
  registrar nada.
- **`pie` en `pintarEntrada`.** Es HTML de confianza de la página, solo en el paso del correo; el clic se atiende
  con la delegación de eventos de Juegos (`data-a`).
- Portal: el botón «Crea tu cuenta de Juegos» lleva a `juegos.html?registro=1`, y `?juegos=1` también.

## Pruebas
- E2E de login:
  - Juegos sin sesión muestra el botón;
  - el registro completo (apodo → correo → código) deja al invitado dentro con su apodo;
  - el botón del portal y `?juegos=1` abren el registro.
