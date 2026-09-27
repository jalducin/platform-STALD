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

#### Scenario: Antes de la fecha
- **WHEN** un alumno pide el diagnóstico el 2026-09-26
- **THEN** la respuesta es 403 `{ "error": "no_disponible", "disponibleDesde": "2026-09-27" }`

#### Scenario: Admin en vista previa
- **WHEN** el admin envía respuestas antes de la fecha
- **THEN** recibe la calificación con `guardado: false` y no se crea ningún archivo

### Requirement: Calificación en el servidor y un solo intento
`POST /ingles/examenes/<id>?email=` con `{ "respuestas": { "<idPregunta>": <índice> } }` SHALL calificar en
el servidor y devolver `correctas`, `total`, `porcentaje`, el resultado por sección y `nivelSugerido`:
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
