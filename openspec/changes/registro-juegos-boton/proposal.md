## Por qué
La entrada de **Juegos** no tiene un botón para registrarse: solo un texto («¿Primera vez?…»). El profe quiere un
botón claro para crear la cuenta de Juegos también desde ahí, no solo desde el portal.

## Qué cambia
- `juegos.html`, pantalla de entrada:
  - bloque «🆕 ¿Primera vez en Juegos?» con el botón «🆕 Registrarme en Juegos»;
  - registro en 2 pasos: (1) apodo y aceptación del aviso; (2) correo con su enlace o código;
  - al confirmar el correo, la cuenta se crea sola con el apodo elegido.
- Hub de Juegos (ya con sesión): botón «🆕 Invitar a alguien a registrarse» que comparte o copia el enlace de
  registro, para que otra persona cree su cuenta desde su teléfono.
- `juegos.html?registro=1` abre el registro directo. El botón del portal y `index.html?juegos=1` llevan ahí.
- `comun/auth.js`: `pintarEntrada` acepta `pie` (HTML propio de la página) debajo del formulario del correo.
- Servidor sin cambios: reutiliza `POST /juegos/invitado`.
