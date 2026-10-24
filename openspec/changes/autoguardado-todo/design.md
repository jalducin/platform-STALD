## Decisiones

- **Clave del borrador.** Actividades: `borradores/<id>/<slug>.json` con `intento` dentro (como antes). Misiones:
  `borradores-misiones/<id>/<slug>.json` con un texto por paso. Así la clave es por actividad (o misión), por intento y
  por persona, y un flujo no pisa el de otro. En el aparato, prefijos distintos (`stald_borrador:` y
  `stald_mis_borrador:`).
- **Prefijo propio en Postgres.** `borradores-misiones/` se agrega a `PREFIJOS_INGLES` (no comparte prefijo con
  `borradores/<id>/`, así ninguna actividad choca con una misión): va a `stald_docs` sin migración ni commits a GitHub.
- **Misiones, escritura.** Lectura-modificación-escritura con `sha` y 3 reintentos (otro paso puede guardarse a la vez
  desde otro aparato). Texto vacío quita el paso; sin pasos se borra el archivo. Valida la persona y que la misión sea
  visible para ella (404 si no), 4 000 caracteres (400 `borrador_invalido`), solo texto (400 `tipo_no_permitido`) y que
  no esté evaluada salvo el paso en corrección (409 `ya_evaluado`).
- **Misiones, lectura.** `GET /misiones` agrega `borrador: { pasos, actualizado }` solo a la persona dueña (no en la
  vista del admin con `?alumna=`). Sin petición extra al abrir: el presupuesto de la E2E `peticiones` no cambia.
- **Entregar.** Tras guardar la entrega se quita el borrador de ese paso; si eso falla, la entrega ya quedó (se registra).
- **Privacidad.** El texto del borrador es tan sensible como el de la entrega: «Borrar todas sus entregas» y la retención
  del 31 de agosto (`aplicarRetencionBorradores`, mismo cron) lo borran entero. Cerrar sesión borra la copia local.
- **Paso.** `PUT …/borrador` acepta `paso` (entero 0…n-1; si no, se ignora). La página lo manda con cada guardado y,
  al cambiar de pregunta (botones ←/→ o foco en otra pregunta en la vista de lista), sube de inmediato si hay algo
  pendiente o el paso cambió. Al restaurar se abre en ese paso (modo paso) o se desplaza a esa pregunta (lista).
- **Recargar.** `ingles/app.js` recuerda `#ver/<id>` al cargar y, si el elemento sigue disponible para resolverse, lo
  reabre una sola vez. `openItem` ignora la respuesta si la persona ya se fue a otra vista mientras cargaba.
- **Dos navegadores.** Gana la última escritura (el borrador es un solo documento). Si un navegador envía, el otro
  recibe 409 `intento_invalido` al guardar y avisa «Este intento ya se envió desde otro aparato o navegador».
- **Indicador.** `haceCuanto(ms)` compartido (reproductor y misiones), repintado cada 5 s; «Reintentar» llama a la
  misma subida.

## Alternativas descartadas

- Fusionar respuestas en el servidor entre navegadores: impediría borrar una respuesta y complica el contrato.
- Guardar la libreta en el servidor: fuera de alcance (no es avance calificable); se deja anotado.

## Pruebas

- Unitarias: `server/borrador_misiones_test.ts` (guardar/recuperar, no es entrega, admin no lo ve, 4 000, paso inválido,
  matriz 403/404, entregar borra el paso, evaluada 409, borrado a petición, retención) y `server/borrador_test.ts`
  (paso).
- E2E `autoguardado-todo`: cada flujo con recarga, otro navegador, no calificado, envío y limpieza; dos navegadores a la
  vez en la clase de Secundaria; misión sin red con «Reintentar».
