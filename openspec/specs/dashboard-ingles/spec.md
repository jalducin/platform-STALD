# dashboard-ingles Specification

## Purpose
Tablero de Inglés (`ingles.html`) y su contrato con el servidor: filas, secciones por estado, exámenes, actividades de la semana, corrección, filtros y vista de admin. Origen: ingles-clases-por-alumno y cambios posteriores.
## Requirements
### Requirement: Filtrado por correo en el servidor
`GET /ingles/data?email=<correo>` SHALL devolver solo las filas cuyo `Usuario` incluya a una persona con
ese correo. Si el correo coincide con `SUPER_ADMIN_EMAIL`, SHALL devolver todas las filas con
`isAdmin: true`. Sin `email` SHALL responder 400 `missing_email`.

#### Scenario: Alumno asignado
- **WHEN** un alumno con filas asignadas consulta con su correo
- **THEN** recibe solo sus filas e `isAdmin: false`

#### Scenario: Correo sin filas
- **WHEN** se consulta con un correo que no está en ningún `Usuario`
- **THEN** la respuesta es 200 con `rows: []`

#### Scenario: Sin correo
- **WHEN** se llama sin el parámetro `email`
- **THEN** la respuesta es 400 con `{ "error": "missing_email" }`

#### Scenario: Admin
- **WHEN** se consulta con el correo configurado en `SUPER_ADMIN_EMAIL`
- **THEN** se reciben las filas de todos los alumnos e `isAdmin: true`

### Requirement: Forma de la fila de Inglés
Cada fila SHALL incluir `name`, `label` ("Módulo · Tipo"), `completado`, `fecha` (de `Fecha Entrega `),
`alumno` (de `Nombre`), `userNames` y `url`. La respuesta NO SHALL incluir correos (`userEmails`) ni IDs de usuario.

#### Scenario: Fecha poblada
- **WHEN** una fila tiene `Fecha Entrega ` = 2026-10-01
- **THEN** su `fecha` en la respuesta es "2026-10-01"

#### Scenario: Sin correos en la respuesta
- **WHEN** el admin consulta `/ingles/data`
- **THEN** ninguna fila contiene las claves `userEmails` ni `userIds`

### Requirement: Vista de administrador agrupada por alumno
En `ingles.html`, cuando `isAdmin` es true, las filas SHALL agruparse por `alumno`, con un encabezado por
alumno y su conteo de completadas/total. Para un alumno, SHALL mostrarse una sola lista con pendientes primero.

#### Scenario: Admin ve grupos
- **WHEN** el admin inicia sesión
- **THEN** ve una sección por cada alumno (Angel, Fernando, Jesus, Laura, Marisol) con "x/51"

#### Scenario: Alumno ve su lista
- **WHEN** un alumno inicia sesión
- **THEN** ve solo sus clases, pendientes primero, sin encabezados de otros alumnos

### Requirement: Raíz de la función sin HTML
Cualquier ruta que el servidor no defina SHALL responder 404 JSON `{ "error": "not_found" }`. La raíz SHALL NOT
servir HTML: las páginas viven en GitHub Pages.

#### Scenario: Raíz
- **WHEN** se hace GET a la raíz del servidor
- **THEN** la respuesta es 404 con `{ "error": "not_found" }`

#### Scenario: Ruta desconocida
- **WHEN** se hace GET a una ruta que no existe, p. ej. `/ingles/nada`
- **THEN** la respuesta es 404 con `{ "error": "not_found" }`

### Requirement: Campos de avance en la fila
Cada fila de `/ingles/data` SHALL incluir además `calificacion` (texto o null), `dificultad` (A1–C2 o null)
y `editadoEn` (ISO 8601 de la última edición de la página).

#### Scenario: Calificación presente
- **WHEN** una fila tiene `Calificación` = "93%"
- **THEN** su `calificacion` en la respuesta es "93%"

#### Scenario: Sin calificación
- **WHEN** una fila tiene `Calificación` vacía
- **THEN** su `calificacion` es null

### Requirement: Vista organizada por estado
`ingles.html` SHALL mostrar las clases en este orden de secciones:
1. "Realizadas (últimos 3 días)": `completado` y `editadoEn` dentro de los últimos 3 días, la más reciente primero.
2. "Atrasadas": no completadas con fecha anterior a hoy, la más antigua primero.
3. "Hoy".
4. "Próximas": ascendente.
5. "Realizadas anteriores" y "Sin fecha", plegadas.

Cada fila SHALL mostrar su fecha de entrega y, si existe, su calificación. Las secciones con muchas filas
SHALL tener scroll interno. Arriba SHALL haber contadores de realizadas, atrasadas, hoy y próximas.

#### Scenario: Actividad de hoy
- **WHEN** una actividad no completada tiene fecha de hoy
- **THEN** aparece en "Hoy" y el contador de hoy la incluye

#### Scenario: Realizada ayer
- **WHEN** una actividad está completada y se editó ayer
- **THEN** aparece en "Realizadas (últimos 3 días)" con su calificación

#### Scenario: Realizada hace una semana
- **WHEN** una actividad está completada y se editó hace 7 días
- **THEN** aparece solo en "Realizadas anteriores"

#### Scenario: Vista admin
- **WHEN** el admin inicia sesión
- **THEN** cada alumno se muestra plegable, con sus contadores y el mismo orden de secciones dentro

### Requirement: Tarjeta de exámenes del alumno
`ingles.html` SHALL mostrar al alumno, arriba de su tablero, una tarjeta "📝 Exámenes" con cada examen y su
estado: "Disponible el <fecha>", botón "Resolver" con su fecha límite, o el resultado (porcentaje, nivel sugerido y secciones).

#### Scenario: Examen disponible
- **WHEN** el alumno entra el 2026-09-27 sin haberlo resuelto
- **THEN** ve "Diagnóstico A1" con el botón "Resolver"

#### Scenario: Resolver
- **WHEN** el alumno responde las 33 preguntas y confirma el envío
- **THEN** ve de inmediato su porcentaje, su nivel sugerido, sus fortalezas y debilidades por tema con su retroalimentación y la revisión de sus errores, y la tarjeta queda como resuelta

#### Scenario: Envío incompleto
- **WHEN** faltan preguntas por responder
- **THEN** el botón de enviar está deshabilitado y se indica cuántas faltan

### Requirement: Última calificación y diagnóstico en la vista admin
En la vista admin, el encabezado de cada alumno SHALL mostrar la calificación de su última actividad
completada (la de `editadoEn` más reciente con `calificacion`) y el resultado del diagnóstico o "pendiente".
Dentro del bloque del alumno SHALL verse el resultado por sección con fortalezas, debilidades y los temas a reforzar.

#### Scenario: Alumno con actividad calificada
- **WHEN** la última actividad completada de Jesus tiene calificación "9"
- **THEN** su encabezado muestra "⭐ 9"

#### Scenario: Diagnóstico pendiente
- **WHEN** un alumno no ha resuelto el diagnóstico
- **THEN** su encabezado muestra "📝 pendiente"

### Requirement: El examen aparece como actividad del día
Cada examen SHALL aparecer también como una fila del tablero del alumno con fecha = `fechaLimite`, en
la misma lógica de secciones: "📌 Hoy" en su fecha, "⏰ Atrasadas" después si no se ha resuelto y
"✅ Realizadas" cuando se resuelve, con su porcentaje como calificación. La fila SHALL tener el botón
"Resolver" (o "Ver resultado") en lugar de "Abrir ↗". La fila de examen NO SHALL contar en el total x/51
de actividades. En la vista admin, la fila se muestra en el tablero de cada alumno según su resultado.

#### Scenario: Día del examen
- **WHEN** el alumno entra el 2026-09-27 sin haberlo resuelto
- **THEN** "📝 Examen diagnóstico A1" aparece en "📌 Hoy" con el botón "Resolver" y el contador de hoy lo incluye

#### Scenario: Examen resuelto
- **WHEN** el alumno ya resolvió el diagnóstico con 76 %
- **THEN** la fila aparece en "✅ Realizadas" con "⭐ 76%" y el botón "Ver resultado"

#### Scenario: Adelantar desde Próximas
- **WHEN** el alumno entra el 2026-09-26 sin haberlo resuelto
- **THEN** la fila aparece en "📅 Próximas" como "en 1d" y ya tiene el botón "Resolver"

### Requirement: Esta semana
`ingles.html` SHALL mostrar a cada alumno o alumna la tarjeta "📚 Esta semana" con los elementos de la semana
en orden de fecha: actividades, examen, refuerzo y Meet. Cada uno muestra estado, fecha límite, intentos
usados y mejor calificación. Los elementos SHALL aparecer también como filas del tablero (Hoy, Atrasadas,
Realizadas, Próximas), sin contar en el total x/51 de Notion. Las actividades de Notion se mantienen.

#### Scenario: Martes 29
- **WHEN** el alumno entra el 2026-09-29
- **THEN** la actividad del día aparece en "📌 Hoy" con el botón "Empezar"

### Requirement: Vista de actividad
Al abrir una actividad SHALL verse primero la teoría, luego los ejercicios y, al enviar, el resultado
inmediato (porcentaje, temas con retroalimentación y revisión de errores), con "Intento n de 2 · mejor x %"
y el botón "Reintentar" si queda un intento. Los tips extra (libreta y videos) SHALL verse en la teoría y
en el resultado.

#### Scenario: Reintentar
- **WHEN** el alumno termina su intento 1 con 60 %
- **THEN** ve su resultado y "Reintentar (1 intento restante)"; el intento 2 trae ejercicios distintos

### Requirement: Meet del domingo
El elemento `meet` SHALL mostrarse como fila del domingo con el enlace a la reunión cuando exista en el
JSON (`meetUrl`), o "El enlace se comparte por WhatsApp" si todavía no existe.

#### Scenario: Sin enlace
- **WHEN** `meetUrl` es null
- **THEN** la fila del domingo dice "El enlace se comparte por WhatsApp"

### Requirement: Guion de la clase del domingo en la vista admin
La vista admin SHALL tener el botón "📋 Guion de clase" en el elemento `meet`. El guion SHALL mostrar
primero la retroalimentación por alumno o alumna (mejores calificaciones de la semana y temas a
reforzar) y luego los bloques de la clase con sus tiempos, la teoría para compartir en pantalla, las tareas
de libreta y el reto en vivo (con vista previa).

#### Scenario: Retroalimentación en el guion
- **WHEN** el admin abre el guion
- **THEN** ve una tarjeta por alumno o alumna con sus porcentajes de la semana y sus temas a reforzar

### Requirement: Modo presentación para el Meet
La vista admin SHALL tener "🎬 Presentar" en el elemento `meet`. Abre diapositivas a pantalla completa
(16:9, letra grande, colores por tema) definidas en `presentacion.diapositivas` del JSON:

| Tipo | Contenido |
|---|---|
| `portada` | Título de la clase |
| `agenda` | Bloques del guion con sus tiempos |
| `retro` | Retroalimentación **grupal**: promedio por actividad, entregas, fortalezas del grupo y errores más comunes, **sin nombres** |
| `teoria` | Un bloque de la teoría |
| `practica` | Frases para practicar en voz alta |
| `juego` | Reglas de un juego |
| `reto` | Enlace a la página (y QR) |
| `libreta` | Tareas de libreta |
| `cierre` | Despedida |

Se navega con ← / →, espacio, clic o botones, con contador y barra de avance; F alterna pantalla completa
y Esc sale.

#### Scenario: Retroalimentación sin exponer a nadie
- **WHEN** el admin proyecta la diapositiva de retroalimentación
- **THEN** ve promedios y errores del grupo, y ningún nombre de alumno o alumna

#### Scenario: Navegación
- **WHEN** el admin presiona → en la diapositiva 1
- **THEN** pasa a la diapositiva 2 y el contador lo refleja

### Requirement: Vista de corrección
Cuando el detalle de una actividad trae `correccion`, la página SHALL mostrar:
- un aviso con cuántos ejercicios hay que corregir;
- los ejercicios fallados con la respuesta anterior ("Antes respondiste: X");
- los correctos prellenados, de solo lectura y plegados en "✅ Ya las tenías bien (N)".

El contador y el botón Enviar SHALL considerar solo los ejercicios a corregir. En el resultado de una
actividad con intento restante, el botón SHALL decir "Corregir errores".

#### Scenario: Abrir la corrección
- **WHEN** la alumna abre el intento 2 de una actividad donde falló 3 de 12
- **THEN** ve 3 ejercicios para contestar, cada uno con su respuesta anterior
- **AND** ve plegados los 9 correctos, llenos y sin poder cambiarlos
- **AND** "Enviar" se habilita al contestar los 3

#### Scenario: Botón tras el primer intento
- **WHEN** termina el intento 1 de una actividad con errores
- **THEN** el botón dice "Corregir errores (1 intento restante)"

### Requirement: Tarjetas de resumen que filtran
Las tarjetas "Hechas 3 días", "Atrasadas", "Hoy" y "Próximas" SHALL ser botones.
- Al activar una, su tablero SHALL mostrar solo la sección correspondiente, marcar la tarjeta
  (`aria-pressed="true"`) y ofrecer "Ver todo".
- Al activarla de nuevo, o con "Ver todo", SHALL mostrarse todo.
- En la vista de admin, cada tablero de alumno o alumna SHALL filtrarse por separado.

#### Scenario: Filtrar atrasadas
- **WHEN** la alumna toca la tarjeta "Atrasadas"
- **THEN** solo se ve la sección "⏰ Atrasadas" y la tarjeta queda marcada

#### Scenario: Quitar el filtro
- **WHEN** con el filtro activo toca otra vez la tarjeta, o "Ver todo"
- **THEN** vuelven a verse todas las secciones

#### Scenario: Cambiar de filtro
- **WHEN** con "Atrasadas" activo toca "Próximas"
- **THEN** solo se ve "📅 Próximas" y solo esa tarjeta queda marcada

#### Scenario: Admin por alumno
- **WHEN** el admin filtra "Hoy" en el tablero de Marisol
- **THEN** el tablero de los demás alumnos y alumnas no cambia

### Requirement: Actividad con intento cuenta como hecha
Una actividad en línea (actividad, refuerzo, reto) con al menos un intento enviado SHALL contar como hecha
en el tablero y en el progreso, con su calificación. El botón "Corregir errores" SHALL seguir disponible
mientras quede intento, porque la corrección es opcional.

#### Scenario: Primer intento enviado
- **WHEN** la alumna envió el intento 1 de una actividad con 75 %
- **THEN** la actividad aparece como hecha, con ⭐ 75 % y el botón "Corregir errores"

### Requirement: Últimas 5 calificaciones por alumno o alumna (admin)
La vista de admin de `ingles.html` SHALL mostrar una tarjeta "📊 Últimas calificaciones", con una fila
por alumno o alumna y hasta 5 calificaciones de la más reciente a la más antigua. Toma las actividades y
exámenes en línea (mejor calificación y fecha del último envío); Inglés ya no muestra calificaciones de Notion.
El mismo detalle SHALL aparecer en el bloque de cada alumno o alumna.

#### Scenario: Orden por fecha
- **WHEN** Marisol tiene el diagnóstico (70 %, 27 sep) y una actividad (92 %, 29 sep)
- **THEN** su fila muestra 92% y 70%, en ese orden

#### Scenario: Más de 5
- **WHEN** un alumno o alumna tiene 7 calificaciones
- **THEN** se muestran solo las 5 más recientes

#### Scenario: Sin calificaciones
- **WHEN** un alumno o alumna aún no tiene calificaciones
- **THEN** su fila muestra "—"

#### Scenario: Vista de alumno o alumna
- **WHEN** entra un alumno o alumna
- **THEN** no ve la tarjeta de últimas calificaciones

### Requirement: Resultados de juegos en la vista de admin
La vista de admin de `ingles.html` SHALL mostrar la tarjeta "🎮 Juegos de la semana":
- el ranking completo con puntos, juegos distintos y partidas;
- las partidas de la semana con su juego, fecha, anfitrión y podio.

El bloque de cada alumno o alumna SHALL mostrar su resumen de juegos.

#### Scenario: Después de la clase
- **WHEN** en la clase del domingo el grupo juega una partida de Maratón de cultura
- **THEN** el admin ve en su vista esa partida con el podio y los puntos de cada alumno o alumna

#### Scenario: Sin juegos
- **WHEN** nadie ha jugado en la semana
- **THEN** la tarjeta dice que aún no hay juegos esta semana

