## ADDED Requirements

### Requirement: Horario semanal del profe por materia
Con `plan.json`, la vista del profe (`ingles.html?modo=profe`) SHALL tener la pestaña «🗓️ Mi horario» con la semana de
lunes a domingo por días: lista vertical en celular y columnas en tableta y PC. Cada tarea de su ruta y de su grupo
SHALL mostrar el ícono, el color y el nombre de su materia, su estado con ícono y texto (pendiente, hecha, vencida o
adelantada) y su botón para abrirla o ver su resultado. El día de hoy SHALL resaltarse con el texto «Hoy». Las flechas
SHALL llevar a la semana anterior o siguiente (solo entre la primera y la última semana con tareas) y «Hoy» SHALL
regresar a la semana de hoy. Sin `plan.json` la pestaña no aparece.

#### Scenario: Semana con hoy resaltado
- **WHEN** el profe abre «🗓️ Mi horario» un miércoles
- **THEN** ve los 7 días de esa semana, el miércoles con «Hoy», y cada tarea con su materia, su estado y su botón

#### Scenario: Estados de las tareas
- **WHEN** una tarea se hizo antes de su fecha, otra se hizo, otra pasó su fecha sin hacerse y otra no ha llegado
- **THEN** se marcan «⏩ Adelantada», «✅ Hecha», «⏰ Vencida» y «⏳ Pendiente», con texto y no solo con color

#### Scenario: Lo del grupo en el horario
- **WHEN** el profe tiene una actividad del grupo por resolver antes que ellos
- **THEN** aparece el día de su fecha de profe con «👥 Grupo» y la materia de `plan.materiaDelGrupo`

#### Scenario: Cambiar de semana
- **WHEN** el profe toca «Siguiente» en la última semana con tareas
- **THEN** el botón está deshabilitado; «Hoy» lo regresa a la semana de hoy

#### Scenario: Lo que aún no abre
- **WHEN** un elemento del plan todavía no está disponible
- **THEN** su tarjeta dice «🗓️ Llega pronto» y no trae botón

#### Scenario: Día sin tareas
- **WHEN** un día de la semana no tiene tareas
- **THEN** muestra «Día libre» en lugar de una tarjeta vacía

### Requirement: Días de oficina desde el plan
Los días de oficina SHALL salir solo de `plan.diasOficina` (fechas AAAA-MM-DD); la vista no los calcula por día de la
semana. Cada día de oficina SHALL mostrar el sello 🏢, el texto «Día de oficina: solo en página» y «máx. 2»; los demás
días, «máx. 4». Las reglas de su calendario (oficina, máximo por día, inglés diario y todo abierto para adelantar) SHALL
mostrarse plegadas, sin validarse.

#### Scenario: Regla nueva de oficina
- **WHEN** `plan.diasOficina` trae el martes 3 y el jueves 5, y el lunes 9 y el martes 10 de noviembre
- **THEN** esa semana el sello va en martes y jueves, y la siguiente en lunes y martes

#### Scenario: Plan sin días de oficina
- **WHEN** `plan.json` no trae `diasOficina`
- **THEN** ningún día muestra el sello 🏢 y todos dicen «máx. 4»

### Requirement: Materia de cada elemento de la ruta del profe
La materia de cada elemento SHALL ser su campo `materia` (de la actividad o del elemento del plan). Si falta, SHALL
deducirse con un respaldo por prefijo del id, `nivel` y título: `profe-ing-`, `act-`, `tec-`, `refuerzo-`, `examen-` y
`guia-` → Inglés; `profe-lid-` → Tech Lead; `profe-staff-` y `profe-ref-` según su nivel; `profe-cg-` → Cultura
General; exámenes semanales, diagnóstico y AI Assessment → Evaluación; el resto de `profe-act-`, `profe-rag-` y
`profe-loop-` → IA · Agentic Engineer.

#### Scenario: Sin campo materia
- **WHEN** un elemento `profe-lid-…` no trae `materia`
- **THEN** se muestra como Tech Lead

#### Scenario: Con campo materia
- **WHEN** un elemento `profe-act-…` trae `materia: "Cultura General"`
- **THEN** se muestra como Cultura General

### Requirement: Filtro y progreso por materia en la ruta del profe
«🗓️ Mi horario» y «🧭 Por materia» SHALL compartir un filtro con chips («Todas» o una materia) con `aria-pressed`, que se
recuerda en el navegador. «Mi horario» SHALL mostrar una barra por materia con hechas/totales y «Cierra el …». Si
`plan.materias` trae el resumen, el total (`elementos`) y el cierre (`fin`) SHALL salir de ahí, sin que el total
quede debajo de las tareas existentes; si no, SHALL calcularse con las tareas (la última fecha es el cierre).

#### Scenario: Filtrar por una materia
- **WHEN** el profe toca el chip «IA · Agentic Engineer»
- **THEN** la semana muestra solo tareas de IA, las otras barras quedan atenuadas y el filtro sigue al recargar

#### Scenario: Progreso con resumen del plan
- **WHEN** `plan.materias` trae Staff Software Engineer con 38 elementos y fin 2027-01-29, y el profe hizo 1
- **THEN** la barra de Staff dice «1/38» y «Cierra el 29 ene 2027»

### Requirement: Ruta del profe por materia
Con `plan.json`, la pestaña «🧭 Por materia» SHALL listar la ruta agrupada por materia (en el orden Inglés, IA, Staff,
Tech Lead, Cultura General y Evaluación) con su barra de avance y, dentro de cada materia, por línea o tema (`linea`,
`tema` o `nivel`; lo del grupo en «Inglés con el grupo»), cada línea plegable con hechas/totales y sus tareas en orden
de fecha con su estado y su botón.

#### Scenario: Agrupado por materia y línea
- **WHEN** el profe abre «🧭 Por materia»
- **THEN** ve Inglés con sus líneas «Inglés A1» e «Inglés con el grupo», y dentro de cada una las tareas por fecha

### Requirement: Encabezado de la ruta del profe desde el plan
El título y el subtítulo de la vista del profe SHALL salir de `plan.titulo` y `plan.subtitulo`; si el plan no los
trae, SHALL usarse «🍥 Mi propio camino ninja» y un subtítulo con sus materias. El panel de horas SHALL salir de
`plan.horasSemana` y `plan.reparto`. La tarjeta «Mi ruta» del portal SHALL decir «🍥 Mi camino ninja · IA, Staff, Tech
Lead, Inglés y Cultura General, con todo abierto para avanzar a mi ritmo».

#### Scenario: Plan con título y subtítulo
- **WHEN** `plan.json` trae `titulo` y `subtitulo`
- **THEN** el encabezado y la pestaña del navegador los muestran, sin el texto fijo anterior

#### Scenario: Plan sin título
- **WHEN** `plan.json` no trae `titulo` ni `subtitulo`
- **THEN** el encabezado dice «🍥 Mi propio camino ninja» con un subtítulo de sus materias

### Requirement: Horario del profe accesible en todos los tamaños
«Mi horario» y «Por materia» SHALL verse sin scroll horizontal a 360 px, en tableta y en PC, en claro y oscuro, con
controles de 44 px o más, foco visible, etiquetas de materia, estado y oficina con contraste de 4.5:1 o más, y
animaciones que se apagan con `prefers-reduced-motion`.

#### Scenario: Celular en oscuro
- **WHEN** el profe abre «Mi horario» a 360 px en modo oscuro
- **THEN** los días van en una sola columna, sin scroll horizontal, y las etiquetas cumplen el contraste
