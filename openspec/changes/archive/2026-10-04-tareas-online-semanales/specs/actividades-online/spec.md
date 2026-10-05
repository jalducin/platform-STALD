## ADDED Requirements

### Requirement: Calendario semanal
Cada semana SHALL definirse en `contenido/semanas/<lunes>.json` del repo de datos, con sus elementos por
fecha: actividades (martes, jueves y sábado; tipo `actividad` o `refuerzo`), examen (viernes; tipo
`examen`) y repaso (domingo; tipo `meet`). Cada elemento SHALL tener `id`, `tipo`, `titulo`,
`disponibleDesde` y `fecha` (límite).

#### Scenario: Semana 1
- **WHEN** se carga `contenido/semanas/2026-09-28.json`
- **THEN** contiene 2026-09-29 actividad, 2026-10-01 actividad, 2026-10-02 examen, 2026-10-03 refuerzo y 2026-10-04 meet

### Requirement: Teoría, ejercicios y tips
Cada actividad, refuerzo y examen SHALL tener `temas` (con `retroalimentacion` por estado), un `banco` de
ejercicios etiquetados por tema, cada uno con `explicacion`, y `tips` (ejercicios en libreta y búsquedas
de video). Las actividades y el refuerzo SHALL tener además `teoria`. Los ejercicios SHALL ser de tipo
`opcion` (índice correcto) o `escribir` (lista de respuestas aceptadas, comparadas sin mayúsculas,
acentos ni espacios extra).

#### Scenario: Escribir un plural
- **WHEN** el ejercicio "box → ___" acepta ["boxes"] y el alumno escribe " Boxes "
- **THEN** cuenta como correcto

### Requirement: Ejercicios distintos por alumno y por intento
El servidor SHALL elegir para cada alumno o alumna e intento `preguntasPorIntento` ejercicios del banco,
repartidos entre temas, con una semilla determinista (actividad + alumno + número de intento). Dos alumnos
SHALL recibir, en general, selecciones distintas; el mismo alumno en el mismo intento SHALL recibir siempre
la misma. Las respuestas correctas NO SHALL enviarse al navegador antes de calificar.

#### Scenario: Determinismo
- **WHEN** Marisol pide su intento 1 de la actividad del 29 dos veces
- **THEN** recibe los mismos ejercicios en el mismo orden

#### Scenario: Variación
- **WHEN** Marisol y Angel piden su intento 1
- **THEN** sus selecciones no son idénticas

### Requirement: Intentos y calificación
Las actividades y el refuerzo SHALL permitir hasta 2 intentos y el examen 1. Cada envío SHALL calificarse de
inmediato con porcentaje, estado por tema (fortaleza ≥ 80 %, en progreso 60–79 %, debilidad < 60 %),
retroalimentación y revisión de errores. La calificación que cuenta SHALL ser la del **mejor intento**. Un
envío sin intentos disponibles SHALL responder 409 `sin_intentos`.

#### Scenario: Segundo intento mejor
- **WHEN** un alumno obtiene 50 % y luego 80 %
- **THEN** la actividad queda con `mejor` = 80 % y se guardan ambos intentos

#### Scenario: Tercer intento
- **WHEN** un alumno con 2 intentos envía otra vez
- **THEN** la respuesta es 409 `sin_intentos`

### Requirement: Refuerzo personalizado
Para el refuerzo, el servidor SHALL elegir ejercicios de los temas del examen semanal en estado
`debilidad` o `en-progreso` de ese alumno o alumna. Si no hay examen resuelto, SHALL usar el diagnóstico.
Si todo es fortaleza, SHALL mezclar todos los temas.

#### Scenario: Refuerzo según debilidades
- **WHEN** en el examen semanal de Laura "Plurales" quedó como debilidad
- **THEN** la mayoría de los ejercicios de su refuerzo son de plurales

### Requirement: Admin
El admin SHALL poder previsualizar cualquier actividad o examen sin guardar y ver por alumno o alumna todos
sus intentos, su mejor calificación y los temas a reforzar, acumulados de todas sus actividades y exámenes.

#### Scenario: Temas a reforzar
- **WHEN** Jesus tiene "Presente simple" como debilidad en el diagnóstico y "Plurales" en progreso en la actividad del jueves
- **THEN** su resumen admin lista ambos temas a reforzar

### Requirement: Clase del domingo (Meet)
El elemento `meet` SHALL poder traer:
- `guion` (solo admin): bloques con tiempo, objetivo y pasos para dar la clase. El primero es la
  retroalimentación, que la vista admin completa con los datos de cada alumno o alumna.
- `teoria` y `tips` de libreta, visibles para alumnos y alumnas desde `disponibleDesde`.
- `banco` para un **reto interactivo en vivo**, con las mismas reglas que una actividad (2 intentos, cuenta
  el mejor).

El `guion` NO SHALL enviarse a quien no sea admin. Semana 1: presente simple negativo y en pregunta, WH
questions, adjetivos (van antes del sustantivo) y adjetivos posesivos (my, your, his, her, its, our,
their).

#### Scenario: Guion solo para admin
- **WHEN** una alumna abre la clase del domingo
- **THEN** recibe la teoría, los tips y el reto, pero no el `guion`

#### Scenario: Reto en vivo
- **WHEN** el alumno resuelve el reto durante el Meet
- **THEN** ve su calificación inmediata y el admin ve su resultado al recargar
