## ADDED Requirements

### Requirement: Pestaña «📋 Revisión» del profe en Secundaria
La vista del admin de Secundaria (`ingles.html?modo=secundaria`) SHALL tener una pestaña «📋 Revisión» (`#revision`)
solo para el admin, con la alumna del selector «👀 Viendo el tablero de». La pestaña SHALL cargarse perezosa: ninguna
petición de revisión al abrir el tablero; la semana se pide solo al abrir la pestaña (o al llegar con `#revision`). SHALL
mostrar una semana (lunes a domingo) con «◀ Semana anterior», «Esta semana» y «Semana siguiente ▶», agrupada por día,
con una tarjeta por clase o examen con el chip de su materia, y aparte «📌 Abiertas esta semana» con las clases de otro
día que siguen abiertas esa semana. SHALL funcionar en celular (en «☰ Más»), tablet y PC, en claro y oscuro, sin
scroll horizontal.

#### Scenario: Carga perezosa
- **WHEN** el profe abre el tablero de Secundaria en otra pestaña
- **THEN** no se pide `GET /profe/revision` hasta que abre «📋 Revisión»

#### Scenario: Navegar semanas
- **WHEN** el profe toca «Semana siguiente ▶»
- **THEN** ve la semana del lunes siguiente, agrupada por día, también si sus clases aún no abren

#### Scenario: Alumna no ve la pestaña
- **WHEN** una alumna abre su tablero de Secundaria
- **THEN** no hay pestaña «📋 Revisión»

### Requirement: Avance en línea de cada clase
Cada tarjeta SHALL mostrar, con los datos que ya existen (`resultados/`, `borradores/`), el estado de la clase:
«⏳ Sin abrir» (o «🔒 Abre <fecha>»), «💾 En borrador · avanzó N de M» o «✅ Enviada»; la mejor calificación en línea;
«⏰ Fuera de tiempo» si el mejor intento llegó tarde; y «🔎 Ver respuestas» con el detalle del mejor intento. Si una
lectura falla, la tarjeta SHALL salir sin ese dato y la vista SHALL seguir funcionando.

#### Scenario: En borrador
- **WHEN** la alumna contestó 3 de 8 preguntas de una clase sin enviarla
- **THEN** la tarjeta dice «💾 En borrador · avanzó 3 de 8» y no tiene calificación en línea

#### Scenario: Enviada tarde
- **WHEN** el mejor intento de la clase se envió después de su fecha límite
- **THEN** la tarjeta dice «✅ Enviada», su porcentaje y «⏰ Fuera de tiempo»

### Requirement: Revisión manual guardada en el servidor
Cada tarjeta SHALL permitir al profe registrar: el checklist de las tareas de libreta de la clase (sus tips `libreta`),
«🎙️ Audio recibido» si la clase pide audio, «📖 Páginas del libro de ortografía revisadas» si es de Español o la pide,
su calificación (0 a 10, de medio en medio punto) y un comentario corto (hasta 300 caracteres). SHALL guardarse en el
servidor (`PUT /profe/revision`, documento `revisiones/<slug>/<id>.json` en Postgres) con
`{ checks, audio, libro, calificacion, comentario, revisadoEn }` y SHALL seguir ahí al recargar o en otro aparato. Una
revisión vacía SHALL borrarse. Datos inválidos SHALL responder 400 y una alumna o clase inexistente 404, sin guardar.

#### Scenario: Persiste al recargar
- **WHEN** el profe marca una tarea de libreta, pone 9 y el comentario «Muy buena letra», guarda y recarga
- **THEN** la tarjeta conserva la casilla, el 9 y el comentario

#### Scenario: Calificación inválida
- **WHEN** se manda una calificación de 9.3 o de 11
- **THEN** el servidor responde 400 `calificacion_invalida` y no guarda

#### Scenario: Audio solo si se pide
- **WHEN** la clase no pide audio y llega `audio: true`
- **THEN** se guarda `audio: false` y la tarjeta no muestra la casilla de audio

### Requirement: Calificación final y resumen de la semana
Cada tarjeta SHALL mostrar la calificación final de la clase: combinación del porcentaje en línea (llevado a 0–10; 0 si
nunca la envió) con la calificación del profe, por omisión el promedio simple, definida en un solo lugar
(`comun/revision-datos.js`, `FORMULA_FINAL`). Sin calificación del profe no SHALL haber final. Arriba, la pestaña SHALL
mostrar: clases de la semana, enviadas, revisadas por el profe, promedio de la semana, promedio por materia y
pendientes de revisar (enviadas sin calificación del profe), y SHALL actualizarse al guardar.

#### Scenario: Promedio simple
- **WHEN** la clase tiene 80 % en línea y el profe le pone 9
- **THEN** la final es 8.5

#### Scenario: Sin revisión del profe
- **WHEN** la clase está enviada con 70 % y el profe aún no la califica
- **THEN** la tarjeta dice «Final: falta tu revisión» y cuenta como pendiente de revisar

### Requirement: Misiones de la semana enlazadas a «📥 Entregas»
La pestaña SHALL listar las misiones de la alumna con algún paso que vence esa semana, con su estado, sus pasos
entregados y su evaluación si la tiene, y un botón que lleva a «📥 Entregas». La evaluación con rúbrica NO SHALL
duplicarse en «📋 Revisión».

#### Scenario: Enlace a la bandeja
- **WHEN** el profe toca «📥 Ir a Entregas» en una misión de la semana
- **THEN** se abre la pestaña «📥 Entregas»

### Requirement: La alumna ve la revisión del profe
Cuando una clase tiene calificación del profe, la alumna SHALL ver en su lista y en la clase «✅ Revisado por el profe:
<calificación>» y el comentario. `GET /secundaria/actividades` SHALL agregar a esas clases
`revision: { calificacion, comentario, revisadoEn }` y nada más: la alumna NO SHALL recibir el checklist, el audio ni el
libro. Si la lectura de revisiones falla, su lista SHALL salir igual, sin `revision`.

#### Scenario: Ve su calificación
- **WHEN** el profe calificó con 9 y comentó «Muy buena letra»
- **THEN** la alumna ve «✅ Revisado por el profe: 9 · Muy buena letra» y su respuesta no trae `checks`, `audio` ni `libro`

### Requirement: Matriz de acceso de la revisión
`GET` y `PUT /profe/revision` SHALL ser solo del admin: cualquier otra persona con sesión (alumna de Secundaria, alumno
o alumna de Inglés, baja, invitado) SHALL recibir 403 y sin sesión 401. Sin Postgres migrado (fuera de pruebas locales)
el `PUT` SHALL responder 503 `sin_base` y no escribir en el repo de contenido.

#### Scenario: Alumna intenta leer la revisión
- **WHEN** una alumna pide `GET /profe/revision?alumna=<su slug>`
- **THEN** recibe 403

#### Scenario: Alumna intenta calificarse
- **WHEN** una alumna manda `PUT /profe/revision`
- **THEN** recibe 403 y no se guarda nada
