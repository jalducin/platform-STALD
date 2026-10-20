## ADDED Requirements

### Requirement: Ruta propia del profe abierta a su ritmo
En la ruta propia del profe (`contenido/profe/`), la apertura de cada elemento SHALL depender solo de su
`disponibleDesde`, no del lunes de su semana: `/ingles/profe/actividades` SHALL listar, además de sus semanas
iniciadas, los elementos de semanas futuras con `disponibleDesde` ≤ hoy, y el profe SHALL poder abrirlos y
resolverlos (incluidos los exámenes). `fechaLimite` SHALL funcionar como ritmo sugerido: una fecha futura no marca el
elemento como atrasado. La pestaña «Plan del mes» SHALL mostrar en cada elemento ya abierto de todas las semanas su
botón para resolverlo o ver su resultado. Para alumnos y alumnas nada cambia: siguen viendo solo semanas del grupo ya
iniciadas, y la ruta del profe les responde 403.

#### Scenario: Toda la ruta abierta desde el primer lunes
- **WHEN** los 24 elementos de la ruta tienen `disponibleDesde` 2026-10-19 y hoy es 2026-10-20
- **THEN** la lista del profe trae los 24, ninguno «próximamente», y cada uno se abre por id con sus preguntas

#### Scenario: Examen de una semana futura
- **WHEN** el profe abre desde «Plan del mes» el examen del 2026-12-12 el 2026-10-20
- **THEN** ve sus preguntas, lo envía y su intento no queda «fuera de tiempo»

#### Scenario: Fecha sugerida futura
- **WHEN** un elemento abierto tiene `fechaLimite` posterior a hoy
- **THEN** no aparece en «🔥 Pendiente ahora» ni cuenta como atrasado

#### Scenario: Semana futura que aún no abre
- **WHEN** un elemento de una semana futura tiene `disponibleDesde` posterior a hoy
- **THEN** no se lista y el plan lo muestra con «🔒 abre su lunes»

#### Scenario: Alumnos y alumnas sin cambios
- **WHEN** una semana futura del grupo tiene un elemento con `disponibleDesde` ya pasado
- **THEN** alumnos y alumnas no lo ven hasta el lunes de esa semana (o el domingo anterior, para adelantar)
