## ADDED Requirements

### Requirement: Definición del examen en JSON
Cada examen SHALL definirse en un archivo JSON versionado con `id`, `titulo`, `nivel`, `disponibleDesde`
(AAAA-MM-DD, hora de CDMX), `secciones` y `preguntas`. Cada pregunta SHALL tener `id`, `seccion`,
`enunciado`, `opciones` y `correcta` (índice). El diagnóstico A1 SHALL tener 33 preguntas en 6 secciones:
alfabeto, to be, presente simple, verbos comunes, días de la semana y orden de la oración.

#### Scenario: Definición válida
- **WHEN** se carga `diagnostico-a1.json`
- **THEN** tiene 33 preguntas, cada `seccion` existe en `secciones` y cada `correcta` es un índice válido de `opciones`

### Requirement: Las respuestas correctas no llegan al navegador
`GET /ingles/examenes/<id>?email=` SHALL devolver las preguntas sin el campo `correcta`.

#### Scenario: Preguntas sin respuestas
- **WHEN** un alumno pide las preguntas del diagnóstico disponible
- **THEN** ninguna pregunta de la respuesta incluye `correcta`

### Requirement: Disponibilidad por fecha
Un alumno SHALL poder obtener y enviar el examen solo a partir de `disponibleDesde` en hora de CDMX. El
admin SHALL poder previsualizarlo y enviarlo en cualquier momento; su envío no se guarda.

#### Scenario: Antes de la fecha de apertura
- **WHEN** un alumno pide el diagnóstico el 2026-09-25 (antes de `disponibleDesde` = 2026-09-26)
- **THEN** la respuesta es 403 `{ "error": "no_disponible", "disponibleDesde": "2026-09-26" }`

#### Scenario: Admin en vista previa
- **WHEN** el admin envía respuestas antes de la fecha
- **THEN** recibe la calificación con `guardado: false` y no se crea ningún archivo

### Requirement: Calificación en el servidor y un solo intento
`POST /ingles/examenes/<id>?email=` con `{ "respuestas": { "<idPregunta>": <índice> } }` SHALL calificar en
el servidor, de inmediato, y devolver `correctas`, `total`, `porcentaje`, el resultado por sección y `nivelSugerido`:
- ≥ 80 %: "A1 sólido — listo para A2".
- 50–79 %: "A1 en progreso".
- < 50 %: "Iniciando A1".

Las preguntas sin responder cuentan como incorrectas. El alumno SHALL tener un solo intento; un segundo
envío SHALL responder 409 `ya_resuelto`.

#### Scenario: Todo correcto
- **WHEN** se envían las 33 respuestas correctas
- **THEN** `porcentaje` es 100 y `nivelSugerido` es "A1 sólido — listo para A2"

#### Scenario: Segundo intento
- **WHEN** un alumno que ya resolvió el examen lo envía otra vez
- **THEN** la respuesta es 409 `{ "error": "ya_resuelto" }` y el resultado guardado no cambia

### Requirement: Resultados como JSON en Storage privado
Cada resultado de alumno SHALL guardarse en `examenes/resultados/<idExamen>/<alumno>.json` (bucket privado)
con el alumno, la fecha de envío, las respuestas y la calificación. El archivo NO SHALL incluir correos.

#### Scenario: Resultado guardado
- **WHEN** Marisol envía el diagnóstico el 2026-09-27
- **THEN** existe `resultados/diagnostico-a1/marisol.json` con su `porcentaje` y sin su correo

### Requirement: Consulta y reinicio
`GET /ingles/examenes?email=` SHALL listar los exámenes con su estado para el alumno (`proximamente`,
`disponible`, `resuelto` con su resultado). Para el admin SHALL incluir el resultado de cada alumno.
`DELETE /ingles/examenes/<id>/resultados/<alumno>?email=<admin>` SHALL borrar un intento (solo admin).

#### Scenario: Estado del alumno
- **WHEN** un alumno sin resultado consulta la lista el 2026-09-27
- **THEN** el diagnóstico aparece con estado `disponible`

#### Scenario: Reinicio por no admin
- **WHEN** un alumno llama al DELETE
- **THEN** la respuesta es 403

### Requirement: Calificación inmediata con retroalimentación por tema
Todo examen SHALL devolver la calificación en la misma respuesta del envío, sin revisión manual, e incluir:
- Por sección (tema): `correctas`, `total`, `porcentaje`, `estado` (`fortaleza` ≥ 80 %, `en-progreso`
  60–79 %, `debilidad` < 60 %) y un texto de `retroalimentacion` definido en el JSON del examen para ese
  estado.
- Las listas `fortalezas`, `enProgreso` y `debilidades` con los títulos de sección.
- `revision`: cada pregunta incorrecta o sin responder con la respuesta del alumno, la correcta y una
  `explicacion`.

Cada sección del JSON SHALL definir `retroalimentacion.fortaleza`, `retroalimentacion.en-progreso` y
`retroalimentacion.debilidad`. Cada pregunta SHALL tener `explicacion`.

#### Scenario: Retroalimentación por tema
- **WHEN** un alumno falla todas las preguntas de "Verbo to be" y acierta el resto
- **THEN** "Verbo to be" aparece en `debilidades` con su texto de retroalimentación de debilidad, y las otras 5 secciones aparecen en `fortalezas`

#### Scenario: Revisión de errores
- **WHEN** un alumno responde mal "I ___ a student."
- **THEN** `revision` incluye esa pregunta con su respuesta, la correcta ("am") y la explicación

### Requirement: Fecha límite
Cada examen SHALL tener `fechaLimite` (AAAA-MM-DD, hora de CDMX), además de `disponibleDesde`. El
diagnóstico A1 SHALL abrir el 2026-09-26 y tener fecha límite el 2026-09-27, para que el alumno pueda
adelantarlo. Un envío posterior a `fechaLimite` SHALL aceptarse y guardarse con `fueraDeTiempo: true`.

#### Scenario: Adelantar el examen
- **WHEN** un alumno pide el diagnóstico el 2026-09-26
- **THEN** recibe las preguntas (no 403)

#### Scenario: Envío tardío
- **WHEN** un alumno envía el diagnóstico el 2026-09-28
- **THEN** se califica y se guarda con `fueraDeTiempo: true`
