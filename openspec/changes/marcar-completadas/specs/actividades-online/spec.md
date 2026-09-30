## ADDED Requirements

### Requirement: Registro de avance en JSON
Cada vez que se marca o desmarca una tarea de Notion, el sistema SHALL registrarlo en `avance/<slug>.json`
del repo privado de datos: estado actual por tarea en `notion` y la entrada en `historial`, con título,
valor, fecha y quién marcó (`alumno` o `admin`). SHALL NOT guardar correos.

#### Scenario: Primera marca
- **WHEN** Sofy marca "A1 Test #1" como hecha
- **THEN** `avance/sofy.json` tiene `notion[<id>].completado = true` y una entrada en `historial` con `por: "alumno"`

#### Scenario: Desmarcar
- **WHEN** después el admin la desmarca
- **THEN** `notion[<id>].completado = false` y el historial tiene 2 entradas, la última con `por: "admin"`
