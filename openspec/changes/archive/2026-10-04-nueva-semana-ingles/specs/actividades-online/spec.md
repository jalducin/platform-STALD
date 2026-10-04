## ADDED Requirements

### Requirement: Semanas publicadas por adelantado
Una semana subida antes de su lunes SHALL permanecer invisible: sus elementos (incluido el examen) no
aparecen en la lista hasta que `hoy >= lunes`. Un examen SHALL considerarse "suelto" (visible siempre,
como el diagnóstico) solo si ninguna semana lo referencia, haya iniciado o no.

#### Scenario: Semana siguiente subida el sábado
- **WHEN** el 2026-10-03 existe la semana `2026-10-05` con su examen `examen-2026-10-09`
- **THEN** la lista del 2026-10-03 no incluye ningún elemento de esa semana
- **AND** `semanaActual` sigue siendo `2026-09-28`

#### Scenario: Llega el lunes
- **WHEN** hoy es 2026-10-05
- **THEN** la lista incluye los elementos de la semana `2026-10-05` y `semanaActual` es `2026-10-05`

#### Scenario: Diagnóstico sigue visible
- **WHEN** existe `examenes/diagnostico-a1.json` y ninguna semana lo referencia
- **THEN** aparece en la lista como examen suelto
