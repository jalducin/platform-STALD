## ADDED Requirements

### Requirement: Prórroga por alumno o alumna
Un elemento MAY traer `prorrogas: { "<slug>": "AAAA-MM-DD" }`. Para el alumno o alumna con ese slug, el
sistema SHALL usar esa fecha como `fechaLimite` en la lista, en el detalle y al marcar `fueraDeTiempo`.
Para los demás, y para el admin, SHALL usar la fecha base. La prórroga SHALL NOT adelantar
`disponibleDesde`.

#### Scenario: Alumna nueva con prórroga
- **WHEN** `diagnostico-a1` tiene `fechaLimite` 2026-09-27 y `prorrogas.sofy` = 2026-09-29
- **AND** Sofy consulta la lista el 2026-09-28
- **THEN** ve el diagnóstico con `fechaLimite` 2026-09-29, disponible

#### Scenario: Entrega dentro de la prórroga
- **WHEN** Sofy envía el diagnóstico el 2026-09-29
- **THEN** su intento queda con `fueraDeTiempo: false`

#### Scenario: Los demás no cambian
- **WHEN** otra alumna consulta la lista
- **THEN** ve `fechaLimite` 2026-09-27

#### Scenario: Prórroga inválida
- **WHEN** una prórroga no es fecha o es anterior a `disponibleDesde`
- **THEN** `validateItem` reporta el error
