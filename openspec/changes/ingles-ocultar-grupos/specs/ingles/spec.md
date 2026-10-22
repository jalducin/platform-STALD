## ADDED Requirements

### Requirement: Grupos ocultos del panel del admin
Cada grupo de Inglés SHALL tener una bandera `ocultoAdmin` (columna `oculto_admin` de `stald_grupos`, `false` por
omisión). Solo el admin SHALL poder encenderla o apagarla, con «👁️ Ocultar del panel» / «Mostrar en el panel» en
«👥 Grupos» (`POST /ingles/grupos/ocultar`). Con la bandera encendida, el grupo y sus alumnos y alumnas SHALL NOT
aparecer por omisión en ninguna vista del admin de Inglés: tablero y resumen (filas e indicadores), avance, «Últimas
calificaciones», lista de «Registro» y su contador, selector de grupo, conteo de entregas de la semana, guion y
retroalimentación de la clase por Meet y ranking de juegos. Un interruptor «Mostrar grupos ocultos (N)» SHALL mostrarlos cuando el admin quiera. La bandera SHALL NOT
cambiar nada para los alumnos y alumnas: siguen entrando, ven sus actividades, horario y Meet, entregan y sus
resultados se guardan.

#### Scenario: Ocultar un grupo
- **WHEN** el profe pulsa «👁️ Ocultar del panel» en el Grupo 2
- **THEN** el Grupo 2 queda marcado «oculto del panel» en «👥 Grupos»
- **AND** sus alumnos y alumnas ya no salen en el tablero, el resumen, el avance, «Registro», el selector de grupo ni
  el ranking
- **AND** aparece «Mostrar grupos ocultos (1)»

#### Scenario: Ver los grupos ocultos
- **WHEN** el profe enciende «Mostrar grupos ocultos (1)»
- **THEN** el Grupo 2 y sus alumnos y alumnas vuelven a todas las vistas, y el Grupo 2 se puede elegir en el selector

#### Scenario: Volver a mostrar un grupo
- **WHEN** el profe pulsa «Mostrar en el panel» en el Grupo 2
- **THEN** el Grupo 2 vuelve a las vistas por omisión y el interruptor desaparece si no queda otro oculto

#### Scenario: Resumen sin grupos ocultos
- **WHEN** el admin pide `GET /ingles/resumen` sin `ocultos=1`
- **THEN** las filas, los indicadores y «sin entregas» no cuentan a los alumnos y alumnas de grupos ocultos
- **AND** con `ocultos=1`, o con `grupo=<id del grupo oculto>`, sí los incluye

#### Scenario: Alumna de un grupo oculto
- **WHEN** una alumna del Grupo 2, oculto del panel, entra a Inglés
- **THEN** ve su calendario, el horario y el Meet de su grupo, como antes
- **AND** al entregar una actividad su resultado se guarda

#### Scenario: Solo el admin cambia la bandera
- **WHEN** un alumno o alumna (o alguien sin sesión) llama `POST /ingles/grupos/ocultar`
- **THEN** recibe 403 `solo_admin` (401 sin sesión) y la bandera no cambia

#### Scenario: Datos inválidos
- **WHEN** el admin manda un grupo que no existe o `oculto` que no es `true`/`false`
- **THEN** recibe 400 `grupo_inexistente` u `oculto_invalido` y nada cambia
