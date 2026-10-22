## ADDED Requirements

### Requirement: Adelantar clases de Secundaria
Las actividades y exámenes SHALL aceptar el campo opcional `dia` (AAAA-MM-DD): el día del horario en que toca la
clase. Para que la alumna pueda adelantar, una clase de Secundaria SHALL poder traer `dia` = su día del horario,
`disponibleDesde` = inicio del bloque de 2 semanas y `fechaLimite` = el día siguiente a `dia`.

- `diaDeClase` SHALL devolver `dia` cuando viene; sin `dia` SHALL mantener la regla anterior. Todas las vistas que
  agrupan por día («Hoy te toca» y retos diarios, «Esta semana», «Mi horario», mundos y el horario del portal) SHALL
  usar `diaDeClase`.
- Antes de su `dia`, una clase abierta SHALL NOT contar como «de hoy» ni como atrasada. Hecha antes de su día SHALL
  contar como hecha a tiempo; el bonus de XP sigue la regla vigente.
- `/secundaria/actividades` e `/ingles/actividades` SHALL dejar pasar `dia` cuando viene y no inventarlo si falta.
- `/secundaria/actividades` SHALL listar también las clases de semanas futuras cuyo `disponibleDesde` ya llegó; la
  vista SHALL mostrarlas en «📝 Otras clases y exámenes» (fuera de la semana actual) y SHALL contarlas en el total de
  su materia. El grupo de Inglés SHALL seguir viendo solo semanas iniciadas.
- El validador SHALL marcar error si `dia` no es una fecha real dentro de [`disponibleDesde`, `fechaLimite`]. Con
  `--secundaria` y `dia`, `disponibleDesde` MAY ser anterior al lunes de la semana y `dia` SHALL caer de lunes a
  domingo de esa semana. Las reglas de apertura de Inglés SHALL NOT cambiar.

#### Scenario: Clase de mañana abierta hoy
- **WHEN** hoy es jueves 22, el bloque abrió el miércoles 21 y hay 2 clases con `dia` jueves 22 y 1 con `dia` viernes 23
- **THEN** «Hoy te toca» trae solo las 2 del jueves, sin ninguna atrasada
- **AND** la del viernes se puede abrir y resolver hoy, y cuenta como hecha a tiempo
- **AND** «Mi horario» y «Esta semana» la siguen mostrando el viernes, antes y después de resolverla

#### Scenario: Semana siguiente del bloque
- **WHEN** hoy es jueves 22 y una clase de la semana del lunes 26 trae `disponibleDesde` 21 y `dia` lunes 26
- **THEN** `/secundaria/actividades` la lista disponible, con su `dia`
- **AND** en la vista sale en «📝 Otras clases y exámenes» (con «hasta el …») para poder adelantarla, no en «Hoy»,
  «Esta semana» ni «Mi horario» de la semana actual
- **AND** cuenta en el total de su materia en «📚 Mis materias», como toda clase listada
- **AND** el validador `--secundaria` de esa semana no marca error por abrir antes del lunes

#### Scenario: Sin `dia`
- **WHEN** una clase no trae `dia`
- **THEN** su día es el de antes (`disponibleDesde` si dura un día; si tiene ventana, `fechaLimite`)
- **AND** con `--secundaria`, abrir antes del lunes de la semana sigue siendo error

#### Scenario: `dia` inválido
- **WHEN** `dia` no es una fecha real o queda fuera de [`disponibleDesde`, `fechaLimite`], o con `--secundaria` cae fuera de la semana
- **THEN** el validador marca error y la semana no se sube
