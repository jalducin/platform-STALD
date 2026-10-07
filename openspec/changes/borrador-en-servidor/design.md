## Decisiones
- **Dónde.** `borradores/` se agrega a `PREFIJOS_INGLES` de `PgStore`, así que en producción vive en Postgres (como
  `resultados/`) y no genera commits en GitHub. Es una ruta nueva, por lo que no hace falta migrar nada. En pruebas
  usa el almacén local.
- **Ruta.** En `handleActividades`, `partes[1] === "borrador"` reutiliza el cálculo del intento (`n = usados + 1`),
  el estado (próximamente, completo, en espera → mismos errores) y la selección de preguntas. Valida:
  - admin → 403 `solo_alumno`;
  - `intento !== n` → 409 `intento_invalido`;
  - `sanitizeRespuestas(preguntas, …)` descarta ids ajenos;
  - en la corrección del intento 2 de actividades, las preguntas fijas no se guardan.
- **Escritura.** `put` con el `sha` vigente y 3 reintentos, igual que los resultados. Un borrador vacío se borra.
- **Lectura.** El GET del intento agrega `borrador: { respuestas, actualizado }` si `borrador.intento === n`.
- **Envío.** Tras guardar el intento, `store.remove(borrador)`; si falla no afecta la calificación (se registra).
- **Cliente (`ingles/reproductor.js`):**
  - el borrador local se queda como copia inmediata;
  - `guardarEnCuenta` hace PUT con 2.5 s de espera entre cambios, y también al ocultar la pestaña (`keepalive`);
  - si el PUT falla, queda pendiente y se reintenta con el evento `online` o con el siguiente cambio;
  - al abrir, entre el borrador local y el del servidor gana el de `actualizado` más reciente;
  - aviso: «Tu avance se guarda en tu cuenta ✔ · hace un momento» o, sin conexión, «Guardado en este aparato; se
    subirá al reconectar».
- **Privacidad.** El borrador guarda solo ids de preguntas y respuestas, sin correo. La ruta usa el slug, como
  `resultados/`.

## Pruebas
- Unitarias (`server/borrador_test.ts`, con el ámbito de Secundaria):
  - guardar y recuperar;
  - otra persona → 404;
  - correo sin Secundaria → 403;
  - admin → 403;
  - intento equivocado → 409;
  - ids ajenos descartados;
  - enviar borra el borrador;
  - examen completo → 409.
- E2E `autoguardado`: contestar, esperar «en tu cuenta», abrir en **otro contexto del navegador** (otro aparato, sin
  `localStorage`) y recuperar las respuestas; al enviar, el borrador del servidor desaparece.
