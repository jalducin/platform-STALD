## MODIFIED Requirements

### Requirement: Semanas publicadas por adelantado
Una semana subida antes de su lunes SHALL permanecer invisible hasta el **domingo anterior**: sus elementos
(incluido el examen) aparecen en la lista cuando `hoy >= lunes - 1 día`. Ese domingo, `semanaActual` SHALL seguir
siendo la semana en curso; la nueva SHALL llegar como `semanaSiguiente` y mostrarse en «⏩ Adelanta la próxima
semana». Lo que se abre el lunes (`disponibleDesde` = lunes) SHALL poder adelantarse. Lo demás se abre en su
día: el examen del viernes, el refuerzo del sábado y el Meet del domingo. Un examen SHALL considerarse "suelto"
(visible siempre, como el diagnóstico) solo si ninguna semana lo referencia, haya iniciado o no.

#### Scenario: Semana siguiente subida el sábado
- **WHEN** el 2026-10-03 (sábado) existe la semana `2026-10-05` con su examen `examen-2026-10-09`
- **THEN** la lista del 2026-10-03 no incluye ningún elemento de esa semana
- **AND** `semanaActual` sigue siendo `2026-09-28`

#### Scenario: El domingo ya se puede adelantar
- **WHEN** hoy es 2026-10-11 (domingo) y existe la semana `2026-10-12`
- **THEN** la lista incluye sus elementos, `semanaActual` sigue en `2026-10-05`, `semanaSiguiente` es `2026-10-12` y la
  actividad del martes ya se puede abrir
- **AND** el examen del viernes 2026-10-16 sigue «próximamente»

#### Scenario: Llega el lunes
- **WHEN** hoy es 2026-10-05
- **THEN** la lista incluye los elementos de la semana `2026-10-05` y `semanaActual` es `2026-10-05`

#### Scenario: Diagnóstico sigue visible
- **WHEN** existe `examenes/diagnostico-a1.json` y ninguna semana lo referencia
- **THEN** aparece en la lista como examen suelto
