## MODIFIED Requirements

### Requirement: Las respuestas correctas no llegan al navegador
`GET /ingles/actividades/<id>?email=` SHALL devolver las preguntas de un examen sin el campo `correcta` (ni las
respuestas aceptadas de los ejercicios de escribir). Esta ruta sustituye a `/ingles/examenes/<id>`.

#### Scenario: Preguntas sin respuestas
- **WHEN** un alumno o alumna pide las preguntas del diagnóstico disponible
- **THEN** ninguna pregunta de la respuesta incluye `correcta`

### Requirement: Calificación en el servidor y un solo intento
`POST /ingles/actividades/<id>?email=` con `{ "respuestas": { "<idPregunta>": <respuesta> } }` SHALL calificar en
el servidor, de inmediato, y devolver `correctas`, `total`, `porcentaje`, el resultado por sección y `nivelSugerido`:
- ≥ 80 %: "A1 sólido — listo para A2".
- 50–79 %: "A1 en progreso".
- < 50 %: "Iniciando A1".

Las preguntas sin responder cuentan como incorrectas. Un examen SHALL tener un solo intento, salvo que su JSON
indique otra cosa; un envío sin intentos disponibles SHALL responder 409 `sin_intentos`.

#### Scenario: Todo correcto
- **WHEN** se envían las 33 respuestas correctas del diagnóstico
- **THEN** `porcentaje` es 100 y `nivelSugerido` es "A1 sólido — listo para A2"

#### Scenario: Segundo intento
- **WHEN** un alumno o alumna que ya resolvió el examen lo envía otra vez
- **THEN** la respuesta es 409 `{ "error": "sin_intentos" }` y el resultado guardado no cambia

### Requirement: Consulta y reinicio
`GET /ingles/actividades?email=` SHALL listar los exámenes, junto con los demás elementos, con su estado para el
alumno o alumna (`proximamente`, `disponible`, `completo` con su resultado). Para el admin SHALL incluir el resultado
de cada alumno o alumna. `DELETE /ingles/actividades/<id>/resultados/<alumno>?email=<admin>` SHALL borrar un
intento (solo admin).

#### Scenario: Estado del alumno
- **WHEN** un alumno o alumna sin resultado consulta la lista el 2026-09-27
- **THEN** el diagnóstico aparece con estado `disponible`

#### Scenario: Reinicio por no admin
- **WHEN** un alumno o alumna llama al DELETE
- **THEN** la respuesta es 403

## REMOVED Requirements

### Requirement: Resultados como JSON en Storage privado
**Reason**: el backend dejó Supabase Storage y la Edge Function; los resultados se guardan en el repo privado de
datos (ver la capability `plataforma-sin-fidello`, «Datos en el repo privado de GitHub»).
**Migration**: los resultados de `diagnostico-a1` se copiaron a `resultados/diagnostico-a1/` del repo de datos
(«Migración del diagnóstico»), sin cambiar calificaciones.
