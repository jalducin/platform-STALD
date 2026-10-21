## ADDED Requirements

### Requirement: Mis clases de Secundaria por día y materia
En `ingles.html?modo=secundaria`, la lista de la alumna o el alumno SHALL titularse «📚 Mis clases» e incluir sus
actividades y exámenes. SHALL mostrar primero «☀️ Hoy» con las clases cuya `fechaLimite` es hoy, cada una con un chip
de materia y un color por materia; después «📅 Esta semana», agrupada por día de lunes a domingo (p. ej. «Lunes 26» …
«Domingo 1») con las clases de cada día y su materia; y al final lo visible fuera de la semana. El enlace de
`secundaria.html` SHALL decir «📚 Mis clases» y el tablero de Notion de esa página SHALL seguir igual. La matriz de
acceso SHALL no cambiar.

#### Scenario: Clases de hoy
- **WHEN** hoy es 2026-10-27 y la alumna tiene 2 clases con `fechaLimite` 2026-10-27 (Matemáticas y Ciencias)
- **THEN** «☀️ Hoy» muestra esas 2 clases, cada una con su chip de materia de color distinto

#### Scenario: Semana agrupada por día
- **WHEN** la semana del 2026-10-26 tiene clases de lunes a domingo
- **THEN** «📅 Esta semana» muestra 7 días, de «Lunes 26» a «Domingo 1», cada uno con sus clases y su materia

#### Scenario: Enlace desde Secundaria
- **WHEN** la alumna abre `secundaria.html`
- **THEN** el enlace dice «📚 Mis clases», lleva a `ingles.html?modo=secundaria` (conservando `?api=`) y el tablero
  de Notion sigue en la página

#### Scenario: Sin Secundaria
- **WHEN** entra un correo sin filas de Secundaria
- **THEN** sigue recibiendo el aviso de que la sección es solo para alumnos y alumnas de Secundaria

### Requirement: Mi horario semanal
La vista de Secundaria SHALL ofrecer la pestaña «🗓️ Mi horario» con una cuadrícula de los 7 días de la semana de hoy
(lunes a domingo), armada con las clases de esa semana: cada día SHALL listar sus materias en orden. En un celular de
360 px SHALL verse como una lista por día sin scroll horizontal, y SHALL leerse en modo claro y oscuro.

#### Scenario: Cuadrícula de 7 días
- **WHEN** la alumna abre «🗓️ Mi horario» el 2026-10-27
- **THEN** ve 7 días (Lunes 26 a Domingo 1) con las materias de cada uno y el día de hoy resaltado

#### Scenario: Celular
- **WHEN** la vista mide 360 px de ancho
- **THEN** el horario es una lista por día y la página no tiene scroll horizontal

### Requirement: Materia de cada clase
Una actividad o examen de Secundaria SHALL poder traer el campo opcional `materia` (texto corto). El listado de
`/secundaria/actividades` SHALL incluir `materia` cuando el contenido la trae. Si no viene, la vista SHALL deducirla
del prefijo del título antes de « · » (sin el emoji inicial), usando el nombre canónico cuando el prefijo contiene
una materia conocida.

#### Scenario: Materia explícita
- **WHEN** una clase trae `"materia": "Matemáticas"`
- **THEN** el listado la incluye y la vista muestra el chip «Matemáticas»

#### Scenario: Materia deducida del título
- **WHEN** una clase sin `materia` se titula «🔬 Ciencias · La célula»
- **THEN** el listado no trae `materia` y la vista muestra el chip «Ciencias»
