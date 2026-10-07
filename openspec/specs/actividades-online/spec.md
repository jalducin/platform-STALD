# actividades-online Specification

## Purpose
Actividades, exámenes, refuerzos y reto del Meet de Inglés que alumnos y alumnas resuelven en línea cada semana: calendario semanal, ejercicios por alumno, intentos con corrección, prórrogas y registro de avance. Origen: tareas-online-semanales y cambios posteriores.
## Requirements
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

### Requirement: Semanas publicadas por adelantado
Una semana subida antes de su lunes SHALL permanecer invisible: sus elementos (incluido el examen) no
aparecen en la lista hasta que `hoy >= lunes`. Un examen SHALL considerarse "suelto" (visible siempre,
como el diagnóstico) solo si ninguna semana lo referencia, haya iniciado o no.

#### Scenario: Semana siguiente subida el sábado
- **WHEN** el 2026-10-03 existe la semana `2026-10-05` con su examen `examen-2026-10-09`
- **THEN** la lista del 2026-10-03 no incluye ningún elemento de esa semana
- **AND** `semanaActual` sigue siendo `2026-09-28`

#### Scenario: Llega el lunes
- **WHEN** hoy es 2026-10-05
- **THEN** la lista incluye los elementos de la semana `2026-10-05` y `semanaActual` es `2026-10-05`

#### Scenario: Diagnóstico sigue visible
- **WHEN** existe `examenes/diagnostico-a1.json` y ninguna semana lo referencia
- **THEN** aparece en la lista como examen suelto

### Requirement: Prórroga por alumno o alumna
El sistema SHALL aceptar en un elemento `prorrogas: { "<slug>": "AAAA-MM-DD" }` (opcional). Para el
alumno o alumna con ese slug, SHALL usar esa fecha como `fechaLimite` en la lista, en el detalle y al marcar `fueraDeTiempo`.
Para los demás, y para el admin, SHALL usar la fecha base. La prórroga SHALL NOT adelantar
`disponibleDesde`.

#### Scenario: Alumna nueva con prórroga
- **WHEN** `diagnostico-a1` tiene `fechaLimite` 2026-09-27 y `prorrogas.sofy` = 2026-09-29
- **AND** Sofy consulta la lista el 2026-09-28
- **THEN** ve el diagnóstico con `fechaLimite` 2026-09-29, disponible

#### Scenario: Entrega dentro de la prórroga
- **WHEN** Sofy envía el diagnóstico el 2026-09-29
- **THEN** su intento queda con `fueraDeTiempo: false`

#### Scenario: Los demás no cambian
- **WHEN** otra alumna consulta la lista
- **THEN** ve `fechaLimite` 2026-09-27

#### Scenario: Prórroga inválida
- **WHEN** una prórroga no es fecha o es anterior a `disponibleDesde`
- **THEN** `validateItem` reporta el error

### Requirement: Segundo intento como corrección en actividades
En los elementos que no son examen (actividad, refuerzo y reto del Meet), el sistema SHALL armar el
intento siguiente con los mismos ejercicios del último intento guardado. Las respuestas correctas SHALL
quedar fijas: el servidor las conserva aunque el cliente mande otras. Solo los ejercicios fallados SHALL
contestarse de nuevo. Esta regla reemplaza, para esos elementos, la de "selección distinta en cada
intento". Entre alumnos y alumnas la selección sigue siendo distinta.

#### Scenario: Corrección tras un primer intento con errores
- **WHEN** un alumno o alumna resolvió el intento 1 con 9 de 12 bien y abre el intento 2
- **THEN** recibe los mismos 12 ejercicios
- **AND** `correccion.fijas` trae sus 9 respuestas correctas
- **AND** `correccion.anteriores` trae el texto de sus 3 respuestas equivocadas
- **AND** no recibe las respuestas correctas de los 3 que falló

#### Scenario: Las fijas no se pueden alterar
- **WHEN** en el intento 2 el cliente manda respuestas incorrectas para ejercicios que estaban bien
- **THEN** se califican con las respuestas del intento 1
- **AND** la calificación del intento 2 no es menor que la del intento 1

#### Scenario: Corrige todo
- **WHEN** en el intento 2 contesta bien los 3 que había fallado
- **THEN** obtiene 100 % y ese es su mejor intento

#### Scenario: Nada que corregir
- **WHEN** el último intento de una actividad tiene 100 %
- **THEN** el estado es `completo` y no se ofrece otro intento

#### Scenario: El examen no cambia
- **WHEN** un examen tiene 1 intento
- **THEN** no hay corrección y un 2.º envío responde 409 `sin_intentos`

#### Scenario: Vista previa de la corrección
- **WHEN** el admin abre `?alumno=Marisol&intento=2`
- **THEN** ve la corrección de Marisol sin guardar nada

### Requirement: Autoguardado del avance en el aparato
El reproductor de actividades y exámenes (Inglés, Ruta del profe y Secundaria) SHALL guardar el avance de cada
intento en el `localStorage` del aparato, con una clave por ámbito, persona (hash corto del correo, nunca el correo
en claro), elemento e intento, y SHALL restaurarlo al volver a abrir el mismo intento. El borrador NUNCA SHALL
enviarse al servidor. SHALL funcionar con opción múltiple, respuesta escrita y pronunciación, en lista y en modo
paso, y no SHALL tocar las preguntas fijas de la corrección. La vista previa del admin no SHALL guardar borrador.

#### Scenario: Recargar no pierde respuestas
- **WHEN** la alumna contesta una pregunta de opción múltiple y una escrita, recarga la página y vuelve a abrir el examen
- **THEN** ambas respuestas aparecen marcadas y escritas, el avance cuenta 2 respondidas y se avisa «Recuperamos tus 2 respuestas»

#### Scenario: Modo paso continúa donde se quedó
- **WHEN** se restaura un borrador en una pantalla de menos de 600 px
- **THEN** la pregunta visible es la primera sin contestar

#### Scenario: Volver y reabrir
- **WHEN** la alumna toca «← Volver» con respuestas sin enviar y vuelve a abrir el mismo examen
- **THEN** sus respuestas siguen ahí

#### Scenario: Ids que ya no existen
- **WHEN** el borrador trae una pregunta que no está en el intento abierto
- **THEN** se ignora sin error y solo se restauran las que existen

#### Scenario: Corrección con preguntas fijas
- **WHEN** se abre la corrección (intento 2) de una actividad
- **THEN** el borrador es del intento 2 y no cambia las respuestas fijas del intento anterior

#### Scenario: Sin correo en claro
- **WHEN** se guarda un borrador
- **THEN** ni la clave ni el valor contienen el correo de la persona

#### Scenario: Sin almacenamiento disponible
- **WHEN** el navegador no permite `localStorage`
- **THEN** el examen funciona como antes, sin error

### Requirement: Borrado y caducidad del borrador
El borrador SHALL borrarse al enviar el intento con éxito, al abrir un intento posterior del mismo elemento, al
abrir un elemento ya terminado y al tocar «Cerrar sesión» en Inglés. Los borradores con más de 14 días SHALL
borrarse al cargar el reproductor o abrir un elemento. Si el envío falla, el borrador SHALL conservarse.

#### Scenario: Enviar borra el borrador
- **WHEN** la alumna envía el examen y ve su resultado
- **THEN** ya no existe el borrador de ese intento

#### Scenario: Envío fallido
- **WHEN** el servidor rechaza el envío
- **THEN** el borrador sigue guardado

#### Scenario: Borrador viejo
- **WHEN** hay un borrador guardado hace 15 días y se abre la página
- **THEN** ese borrador se borra

### Requirement: Avisos de guardado y protección al salir
Mientras un examen está abierto, el reproductor SHALL mostrar «Tu avance se guarda solo en este aparato ✔» y,
tras cada guardado, «Guardado hace un momento». SHALL evitar el «jalar para recargar» con
`overscroll-behavior-y: contain` y SHALL pedir confirmación del navegador al salir o recargar si hay respuestas
sin enviar. Fuera del examen no SHALL haber ni confirmación ni bloqueo del desplazamiento.

#### Scenario: Indicador de guardado
- **WHEN** la alumna contesta una pregunta
- **THEN** el aviso dice «Guardado hace un momento»

#### Scenario: Recargar con respuestas pide confirmación
- **WHEN** hay respuestas sin enviar y la alumna recarga la página
- **THEN** el navegador pide confirmar antes de salir

#### Scenario: Tras enviar no hay bloqueo
- **WHEN** la alumna ya envió y está en su resultado
- **THEN** la página no lleva `examen-abierto` ni pide confirmación al salir

### Requirement: Avance del examen guardado en la cuenta
Mientras alguien contesta un intento, la plataforma SHALL guardar su avance en el servidor, asociado a su cuenta y
a ese intento. Al volver a abrirlo desde cualquier aparato o navegador SHALL recuperar las respuestas. Al enviar el
intento, el borrador SHALL borrarse. Nadie más SHALL poder leer ni escribir ese borrador.

#### Scenario: Otro aparato
- **WHEN** Sofía contesta 30 preguntas en su celular y luego abre el examen en la computadora
- **THEN** ve sus 30 respuestas recuperadas y sigue donde se quedó

#### Scenario: Se borra el navegador
- **WHEN** el navegador pierde sus datos locales a mitad del examen
- **THEN** al volver a abrirlo recupera el avance guardado en su cuenta

