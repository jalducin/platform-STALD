## MODIFIED Requirements

### Requirement: Ruta de estudio del profe
El admin SHALL tener una subpágina propia («Mi ruta de Inglés») donde resuelve, con el mismo motor que el grupo,
las actividades de su grupo y, si existe, su ruta propia en `contenido/profe/`. Sus intentos SHALL guardarse como
"Profe". Si no tiene semanas propias, «Esta semana» y la semana siguiente SHALL ser las del grupo. Alumnos y
alumnas SHALL no verla ni poder abrirla.

#### Scenario: Sin ruta propia, la semana del grupo
- **WHEN** el profe abre su subpágina y `contenido/profe/` no tiene semanas
- **THEN** la respuesta trae `semana` (y el domingo `semanaSiguiente`) del grupo y `plan: null`
- **AND** la lista tiene solo lo del grupo (sin el Meet), con sus fechas de profe

#### Scenario: Con ruta propia, manda la suya
- **WHEN** `contenido/profe/` tiene semanas
- **THEN** `semana` es la de su ruta, como antes

#### Scenario: Privado del profe
- **WHEN** un alumno o alumna pide la ruta del profe
- **THEN** responde 403 y la ruta no aparece en sus actividades

### Requirement: Vista del profe ordenada por urgencia
La vista del profe (`ingles.html?modo=profe`) SHALL mostrar primero su avance y lo que está pendiente ahora.
Después SHALL organizar el resto en pestañas: Esta semana, Plan del mes (solo si hay plan), Mi grupo y Hechas.

#### Scenario: Lo urgente arriba
- **WHEN** el profe tiene actividades del grupo atrasadas o para hoy
- **THEN** aparecen en "🔥 Pendiente ahora", con su etiqueta (👥 Grupo, o 🎓 Ruta si es de su ruta propia) y su botón para resolver

#### Scenario: Sin plan
- **WHEN** no hay `plan.json`
- **THEN** no se muestran la pestaña Plan del mes ni la barra «Ruta del mes», y el título no menciona C1

#### Scenario: Plan del mes compacto
- **WHEN** hay plan y el profe abre la pestaña Plan del mes
- **THEN** solo la semana actual está abierta, y las demás muestran su título y su avance (x/y)

#### Scenario: Se recuerda la pestaña
- **WHEN** el profe deja abierta la pestaña Mi grupo y vuelve a entrar
- **THEN** la página abre en Mi grupo

#### Scenario: Escritorio en dos columnas
- **WHEN** el profe abre su vista en una pantalla de 960 px o más
- **THEN** ve el contenido a la izquierda y una barra lateral con próximas entregas (y horas y rutina si hay plan)

#### Scenario: Celular
- **WHEN** el profe abre su vista en el celular
- **THEN** todo va en una sola columna, sin desplazamiento horizontal de la página

## REMOVED Requirements

### Requirement: Pronunciación semanal del profe
**Reason**: la ruta B1 → C1 (y con ella la pronunciación de cada viernes) se eliminó a pedido del profe el 2026-10-17.
**Migration**: el tipo `pronunciar` y el `audio` siguen disponibles en el motor (requisito «Ejercicios de audio y
pronunciación») para usarlos en actividades del grupo; la ruta se recupera con `git revert` en el repo de datos.
