## ADDED Requirements

### Requirement: Título de la fila sin depender del nombre de la propiedad
El sistema SHALL tomar el título de cada fila de Notion de la propiedad de tipo `title`, se llame como se
llame (en "📖 Clases Inglés" hoy no tiene nombre). Solo si no hay texto SHALL usar "(sin título)".

#### Scenario: Propiedad de título renombrada
- **WHEN** la propiedad de título de la base se llama "" (vacío) en lugar de "Name"
- **THEN** la fila muestra su título real, p. ej. "📋 A1 Test #1 — Verbo TO BE + Pronombres"

#### Scenario: Título vacío
- **WHEN** la propiedad de título no tiene texto
- **THEN** la fila muestra "(sin título)"
