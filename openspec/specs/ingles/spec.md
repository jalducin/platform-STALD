# ingles Specification

## Purpose
Operación de Inglés para el profe y el grupo: alta de alumnos y alumnas, grupos y calendario por grupo, ruta de estudio del profe, pronunciación, segunda oportunidad del examen y datos en Postgres. Origen: alta-alumnos y cambios posteriores.
## Requirements
### Requirement: Alta de alumnos y alumnas desde la página
El admin SHALL poder dar de alta a un alumno o alumna con nombre y correo desde `ingles.html`. Desde ese
momento, ese correo SHALL entrar a Inglés (actividades de la semana), al portal y a Juegos como alumno o
alumna. El servidor SHALL rechazar correos inválidos o ya usados y nombres que ya tienen correo. Solo el
admin SHALL poder listar, dar de alta y quitar.

#### Scenario: Dar de alta
- **WHEN** la profe escribe "Luz María" y luz@example.com y da "Dar de alta"
- **THEN** Luz entra con su correo a Inglés y ve las actividades de la semana, y aparece en la vista de admin

#### Scenario: Correo repetido
- **WHEN** se da de alta un correo que ya tiene acceso
- **THEN** responde 409 `correo_en_uso` y la página lo explica

#### Scenario: Quitar
- **WHEN** la profe quita a alguien dado de alta en la página
- **THEN** ese correo deja de entrar; sus resultados se conservan

#### Scenario: Sin permiso
- **WHEN** un alumno o alumna llama a la ruta de alta
- **THEN** responde 403

### Requirement: Ruta de estudio del profe
El admin SHALL tener una subpágina propia con un plan mensual, temas de estudio, ejercicios de práctica y
2 exámenes por semana. Todo SHALL calificarse con el mismo motor que el grupo, y sus intentos SHALL guardarse
como "Profe". Alumnos y alumnas SHALL no verla ni poder abrirla.

#### Scenario: Examen directo de la semana del grupo
- **WHEN** el profe abre su ruta esta semana
- **THEN** encuentra el examen de los temas que su grupo ve en la semana 1 y el diagnóstico B1 → B2
- **AND** al enviar ve su calificación por tema

#### Scenario: Semana del profe
- **WHEN** empieza una semana del mes 1
- **THEN** ve la actividad A (lunes), el examen A (miércoles), la actividad B (jueves) y el examen B (sábado),
  cada examen bloqueado hasta su día

#### Scenario: Plan del mes
- **WHEN** abre la subpágina
- **THEN** ve las 4 semanas con objetivo, temas, meta de Busuu, rutina diaria y sus resultados

#### Scenario: Privado del profe
- **WHEN** un alumno o alumna pide la ruta del profe
- **THEN** responde 403 y la ruta no aparece en sus actividades

### Requirement: Ejercicios de audio y pronunciación
Un ejercicio SHALL poder llevar `audio`, que la página lee en voz alta en inglés a velocidad normal y lenta.
El tipo `pronunciar` SHALL mostrar una frase y permitir decirla en voz alta. El reconocimiento de voz del
navegador SHALL transcribirla, y el servidor SHALL calificarla como correcta si coincide al menos el 80 %
de las palabras, con contracciones equivalentes. Si el navegador no reconoce voz, SHALL ofrecer
autoevaluación.

#### Scenario: Escuchar un par mínimo
- **WHEN** el profe toca 🔊 en "Which word do you hear?"
- **THEN** escucha la palabra y elige entre ship y sheep

#### Scenario: Pronunciar bien
- **WHEN** dice "I've been teaching for years" y el navegador reconoce "I have been teaching for years"
- **THEN** cuenta como correcta

#### Scenario: Pronunciar con errores
- **WHEN** lo reconocido coincide con menos del 80 % de la frase
- **THEN** cuenta como incorrecta, y la revisión muestra lo que se escuchó y la frase modelo

#### Scenario: Navegador sin reconocimiento de voz
- **WHEN** el navegador no tiene reconocimiento de voz
- **THEN** aparecen "✔ Me salió bien" y "↺ Necesito repetir", y se califica según lo que elija

### Requirement: Pronunciación semanal del profe
La ruta del profe SHALL incluir una actividad de pronunciación cada viernes (semanas 0–4), ligada a la
gramática de la semana.

#### Scenario: Semana con 3 actividades
- **WHEN** empieza una semana del mes 1
- **THEN** la ruta muestra la actividad A (lunes), el examen A (miércoles), la actividad B (jueves), la
  pronunciación (viernes) y el examen B (sábado)

### Requirement: Actividades del grupo en la ruta del profe
La ruta del profe SHALL incluir las actividades, exámenes y refuerzos de su grupo, disponibles en cuanto se suben
y con fecha límite el día anterior a que se abran para el grupo. Sus intentos SHALL guardarse como "Profe" y SHALL
no aparecer en ninguna vista de resultados del grupo.

#### Scenario: Lo ya publicado, en atraso
- **WHEN** el profe abre su ruta el 1 de octubre
- **THEN** ve las actividades del 29 de sep y del 1 de oct y el diagnóstico como atrasadas, el examen del
  viernes para hoy y el refuerzo para mañana, y puede resolverlos

#### Scenario: Semana nueva antes que el grupo
- **WHEN** se sube la semana siguiente el fin de semana
- **THEN** el profe ya puede resolver sus actividades, aunque al grupo se le abran el lunes

#### Scenario: Sin mezclarse con el grupo
- **WHEN** el profe resuelve una actividad del grupo
- **THEN** su calificación no aparece en los resultados, temas a reforzar ni últimas calificaciones del grupo

### Requirement: Examen semanal con segunda oportunidad
El examen semanal SHALL ofrecer dos oportunidades: la primera desde su día (viernes) y la segunda desde la fecha de
`segundaOportunidad` (domingo), con una selección nueva de preguntas. SHALL contar la mejor de las dos. Entre una y
otra SHALL quedar en espera y mostrar la fecha de la segunda.

#### Scenario: Primera oportunidad el viernes
- **WHEN** una alumna resuelve el examen el viernes
- **THEN** ve su resultado y el aviso "Tienes una 2.ª oportunidad el dom 4 de oct"

#### Scenario: Esperando el domingo
- **WHEN** intenta abrir el examen el sábado
- **THEN** no puede (en espera) y ve la fecha de su 2.ª oportunidad

#### Scenario: Segunda oportunidad el domingo
- **WHEN** abre el examen el domingo
- **THEN** recibe preguntas nuevas del banco, y su calificación es la mejor de las dos

#### Scenario: Validación
- **WHEN** un examen trae `segundaOportunidad` sin `intentos: 2` o con una fecha que no es posterior a su día
- **THEN** el validador lo marca como error

### Requirement: Inicio el lunes siguiente para alumnos y alumnas nuevos
Un alta nueva SHALL guardar `inicio`, que es el lunes siguiente a la fecha del alta en CDMX. Las actividades con
fecha límite anterior a `inicio` SHALL NOT aparecer en la lista de esa persona, ni como atrasadas ni como
pendientes.

#### Scenario: Alta a media semana
- **WHEN** el profe da de alta a Luz el miércoles 30 de septiembre
- **THEN** su `inicio` es el lunes 5 de octubre y no ve como atrasadas las actividades que vencieron antes

#### Scenario: Antes de su lunes
- **WHEN** Luz entra a Inglés antes de su lunes de inicio
- **THEN** ve "Tu curso empieza el lunes 5 de oct" en lugar de una lista vacía

#### Scenario: Actividades desde su inicio
- **WHEN** hay un examen con fecha límite del 9 de octubre
- **THEN** Luz lo ve igual que el resto del grupo

#### Scenario: Liga de un alumno existente
- **WHEN** el alta solo liga un correo a un alumno que ya tiene clases en Notion
- **THEN** no se guarda `inicio` y sus atrasos se ven como siempre

### Requirement: Vista del profe ordenada por urgencia
La vista del profe (`ingles.html?modo=profe`) SHALL mostrar primero su avance y lo que está pendiente ahora.
Después SHALL organizar el resto en pestañas: Esta semana, Plan del mes, Mi grupo y Hechas.

#### Scenario: Lo urgente arriba
- **WHEN** el profe tiene una actividad de su ruta atrasada y un examen del grupo por resolver
- **THEN** ambas aparecen en "🔥 Pendiente ahora", con su etiqueta (🎓 Ruta o 👥 Grupo) y su botón para resolver

#### Scenario: Plan del mes compacto
- **WHEN** el profe abre la pestaña Plan del mes
- **THEN** solo la semana actual está abierta, y las demás muestran su título y su avance (x/y)

#### Scenario: Se recuerda la pestaña
- **WHEN** el profe deja abierta la pestaña Mi grupo y vuelve a entrar
- **THEN** la página abre en Mi grupo

#### Scenario: Escritorio en dos columnas
- **WHEN** el profe abre su vista en una pantalla de 960 px o más
- **THEN** ve el contenido a la izquierda y una barra lateral con horas, rutina y próximas entregas

#### Scenario: Celular
- **WHEN** el profe abre su vista en el celular
- **THEN** todo va en una sola columna, sin desplazamiento horizontal de la página

### Requirement: Grupos de clase
El sistema SHALL permitir al admin crear y editar grupos, con nombre, nivel, horario, enlace de Meet y color. Cada
alumno o alumna SHALL pertenecer a un solo grupo vigente.

#### Scenario: Crear un grupo
- **WHEN** el profe crea el grupo "Sábado A1" con su horario y su Meet
- **THEN** el grupo aparece en el selector y en el alta de alumnos y alumnas

#### Scenario: Mover de grupo
- **WHEN** el profe mueve a Luz de "Sábado A1" a "Domingo B1"
- **THEN** desde ese día Luz ve el calendario de "Domingo B1"
- **AND** sus resultados anteriores se conservan

### Requirement: Calendario por grupo
Cada semana de contenido SHALL poder asignarse a uno o varios grupos. Una semana sin asignación SHALL aplicar a
todos.

#### Scenario: Semana solo para un grupo
- **WHEN** la semana del 12 de octubre se asigna solo a "Domingo B1"
- **THEN** solo los alumnos y alumnas de "Domingo B1" ven sus actividades

### Requirement: Datos de Inglés en Postgres
Los alumnos y alumnas, sus inscripciones, sus resultados y su avance SHALL guardarse en Postgres (tablas `stald_*`
del esquema `public`, con RLS y sin políticas públicas; ver `design.md`, «Revisión antes de implementar») y SHALL ser
accesibles solo desde el servidor. Una lectura fallida SHALL recurrir al respaldo en GitHub durante el
periodo de transición.

#### Scenario: Migración sin pérdida
- **WHEN** se migran los datos actuales
- **THEN** los conteos de alumnos, resultados y avance coinciden con los JSON
- **AND** cada calificación se ve igual que antes

#### Scenario: Navegador sin acceso directo
- **WHEN** alguien intenta leer las tablas `stald_*` con la llave pública
- **THEN** la base no devuelve datos (RLS sin políticas públicas)

### Requirement: Registro y avance separados en el menú del profe
La vista del profe en Inglés SHALL tener una opción de menú «Registro» con el alta y la administración de alumnos
y alumnas (grupo y quitar), separada de «Alumnos», que SHALL mostrar solo el avance de cada quien.

#### Scenario: Dar de alta sin empalmarse con el avance
- **WHEN** el profe abre «Registro»
- **THEN** ve el formulario de alta y la lista para administrar, sin los bloques de avance

#### Scenario: Revisar el avance
- **WHEN** el profe abre «Alumnos»
- **THEN** ve el avance de cada alumno o alumna, sin el formulario de alta

### Requirement: Conteo de alumnos y alumnas por grupo
El contador de cada grupo en «👥 Grupos» SHALL contar a los alumnos y alumnas del registro según su grupo efectivo:
su inscripción vigente o, si no tiene, el primer grupo activo.

#### Scenario: Grupo por omisión
- **WHEN** el Grupo 1 es el primer grupo activo y 6 personas no tienen inscripción, más 1 inscrita en él
- **THEN** el Grupo 1 dice «👤 7 alumnos y alumnas»

### Requirement: Presentar clases anteriores
«🎬 Presentar» SHALL mostrar, además de la clase de la semana actual, todas las clases por Meet anteriores, con sus
botones para presentar y ver el guion, para usarlas con grupos nuevos.

#### Scenario: Grupo nuevo
- **WHEN** el profe abre «Presentar» para dar la primera clase a un grupo nuevo
- **THEN** encuentra la clase de la Semana 1 en «Clases anteriores» y puede presentarla

