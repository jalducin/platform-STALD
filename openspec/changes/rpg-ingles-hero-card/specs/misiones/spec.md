## ADDED Requirements

### Requirement: Misión principal en la vista de Inglés
`ingles.html` SHALL mostrar a alumnos y alumnas activas de Inglés sus misiones principales visibles (las de su grupo o
asignadas a su slug, desde su `disponibleDesde`; quien también está en Secundaria las ve en Secundaria), con la misma vista y el mismo motor que Secundaria: tarjeta en «🏠
Inicio», sección «⚔️ Misiones», pasos con entrega solo en texto, rúbrica y aviso cuando el profe evalúa.
`/ingles/actividades` SHALL incluir `misiones: true` solo si la persona tiene alguna misión visible, y la página SHALL
pedir `/misiones` solo en ese caso. La XP de las misiones evaluadas SHALL sumarse a la barra RPG de Inglés. El admin
SHALL evaluar esas entregas desde «📥 Entregas» en su vista de Inglés. Cada paso entregado SHALL sumar 20 puntos de
constancia en el ranking de Inglés.

#### Scenario: Alumna del grupo destinatario
- **WHEN** una alumna del Grupo 1 abre Inglés después de que abrió «My Hero Card»
- **THEN** ve la tarjeta «⚔️ Misión principal del mundo» con «Continuar misión», que la lleva a «⚔️ Misiones»

#### Scenario: Alumno sin misiones
- **WHEN** un alumno de otro grupo abre Inglés
- **THEN** no ve la tarjeta y la página no pide `/misiones`

#### Scenario: Entrega y evaluación
- **WHEN** la alumna entrega los pasos y el profe la evalúa con la rúbrica en «📥 Entregas»
- **THEN** en su siguiente carga ve «¡El profe evaluó tu misión!» con la XP, y su nivel la incluye

#### Scenario: Constancia
- **WHEN** entrega un paso el martes de la semana actual
- **THEN** suma 20 puntos de constancia esa semana
