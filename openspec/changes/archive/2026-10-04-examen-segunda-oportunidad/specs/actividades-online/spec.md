## MODIFIED Requirements

### Requirement: Intentos y calificación
Las actividades y el refuerzo SHALL permitir hasta 2 intentos. El examen SHALL permitir 1, salvo el examen semanal
con `segundaOportunidad`, que permite 2 (ver «Examen semanal con segunda oportunidad»). Cada envío SHALL
calificarse de inmediato con porcentaje, estado por tema (fortaleza ≥ 80 %, en progreso 60–79 %, debilidad
< 60 %), retroalimentación y revisión de errores. La calificación que cuenta SHALL ser la del **mejor intento**. Un
envío sin intentos disponibles SHALL responder 409 `sin_intentos`.

#### Scenario: Segundo intento mejor
- **WHEN** un alumno o alumna obtiene 50 % y luego 80 %
- **THEN** la actividad queda con `mejor` = 80 % y se guardan ambos intentos

#### Scenario: Tercer intento
- **WHEN** un alumno o alumna con 2 intentos envía otra vez
- **THEN** la respuesta es 409 `sin_intentos`

#### Scenario: Examen sin segunda oportunidad
- **WHEN** un examen sin `segundaOportunidad` ya tiene su intento
- **THEN** un segundo envío responde 409 `sin_intentos`
