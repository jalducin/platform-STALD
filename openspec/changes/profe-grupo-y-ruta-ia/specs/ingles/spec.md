## MODIFIED Requirements

### Requirement: Ruta de estudio del profe
El admin SHALL tener una subpágina propia («Mi ruta») donde resuelve, con el mismo motor que el grupo, las
actividades de su grupo y, si existe, su ruta propia en `contenido/profe/` (de Inglés o de otro tema, como IA). Sus
intentos SHALL guardarse como "Profe". `semana` y `semanaSiguiente` SHALL ser siempre las del grupo; las de su ruta
propia SHALL ir aparte en `semanaPropia` y `semanaSiguientePropia`. Alumnos y alumnas SHALL no verla ni poder abrirla.

#### Scenario: Sin ruta propia, la semana del grupo
- **WHEN** el profe abre su subpágina y `contenido/profe/` no tiene semanas
- **THEN** la respuesta trae `semana` (y el domingo `semanaSiguiente`) del grupo y `plan: null`, sin `semanaPropia`
- **AND** la lista tiene solo lo del grupo (sin el Meet), con sus fechas de profe

#### Scenario: Con ruta propia, el grupo y la suya
- **WHEN** `contenido/profe/` tiene la semana que contiene hoy
- **THEN** `semana` es la del grupo y `semanaPropia` la de su ruta, cada una con `{ id, titulo, ids }`
- **AND** la lista trae los elementos del grupo (`grupo: true`) y los de su ruta (sin `grupo`)

#### Scenario: Domingo con ruta propia
- **WHEN** es domingo y hay semana siguiente del grupo y de la ruta propia
- **THEN** la respuesta trae `semanaSiguiente` (grupo) y `semanaSiguientePropia` (ruta propia)

#### Scenario: Privado del profe
- **WHEN** un alumno o alumna pide la ruta del profe
- **THEN** responde 403 y la ruta no aparece en sus actividades

### Requirement: Vista del profe ordenada por urgencia
La vista del profe (`ingles.html?modo=profe`) SHALL mostrar primero su avance y lo que está pendiente ahora.
Después SHALL organizar el resto en pestañas: Esta semana, Plan del mes (solo si hay plan), Mi grupo y Hechas. Con
plan, el título SHALL ser `plan.titulo`; sin plan, «Mi ruta de Inglés».

#### Scenario: Lo urgente arriba
- **WHEN** el profe tiene actividades atrasadas o para hoy
- **THEN** aparecen en "🔥 Pendiente ahora", con su etiqueta (👥 Grupo, o 🎓 Mis clases si es de su ruta propia) y su
  botón para resolver

#### Scenario: Esta semana con el grupo y sus clases
- **WHEN** el profe tiene ruta propia y abre la pestaña Esta semana
- **THEN** ve el bloque «👥 Inglés con el grupo» con las actividades de la semana del grupo y el bloque
  «🎓 Mis clases · <título del plan>» con las de su ruta; ninguno oculta al otro

#### Scenario: Título según el plan
- **WHEN** hay `plan.json` con `titulo` «Claude Code en 4 semanas»
- **THEN** el título de la página es «🎓 Claude Code en 4 semanas» y no dice «ruta de Inglés»

#### Scenario: Sin plan
- **WHEN** no hay `plan.json`
- **THEN** no se muestran la pestaña Plan del mes ni la barra «Ruta del mes», y el título es «Mi ruta de Inglés»

#### Scenario: Plan del mes compacto
- **WHEN** hay plan y el profe abre la pestaña Plan del mes
- **THEN** solo la semana actual de su ruta está abierta, y las demás muestran su título y su avance (x/y)
- **AND** los datos propios del plan de Inglés (Busuu, niveles, horas, rutina) se muestran solo si existen

#### Scenario: Se recuerda la pestaña
- **WHEN** el profe deja abierta la pestaña Mi grupo y vuelve a entrar
- **THEN** la página abre en Mi grupo

#### Scenario: Escritorio en dos columnas
- **WHEN** el profe abre su vista en una pantalla de 960 px o más
- **THEN** ve el contenido a la izquierda y una barra lateral con próximas entregas (y horas y rutina si el plan las trae)

#### Scenario: Celular
- **WHEN** el profe abre su vista en el celular
- **THEN** todo va en una sola columna, sin desplazamiento horizontal de la página
