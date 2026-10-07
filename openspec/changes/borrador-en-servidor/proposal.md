## Por qué
Sofía sigue perdiendo el avance de su examen de Secundaria, incluso en el mismo navegador. El autoguardado actual
(`examen-autoguardado`) vive solo en `localStorage` de ese aparato: cualquier limpieza del navegador, el modo
privado, abrirlo desde WhatsApp o cambiar de aparato lo pierde. El profe pide guardarlo en la base de datos.

## Qué cambia
- El borrador del intento abierto se guarda en el servidor (Postgres en producción) mientras se contesta:
  `borradores/<id>/<slug>.json` = `{ intento, respuestas, actualizado }`.
- `PUT /…/actividades/<id>/borrador { intento, respuestas }`:
  - solo la dueña o el dueño, nunca el admin;
  - solo para el intento que le toca y solo con las preguntas de ese intento.
- `GET /…/actividades/<id>` devuelve `borrador` cuando hay uno del intento abierto.
- Al enviar el intento, el borrador se borra.
- La página guarda primero en el aparato, al instante, y luego en la cuenta, con una espera corta. Si no hay
  conexión, reintenta al volver. Al abrir el examen usa la copia más reciente. El aviso dice «Tu avance se guarda en
  tu cuenta ✔».
- Aplica a Inglés, la ruta del profe y Secundaria.
