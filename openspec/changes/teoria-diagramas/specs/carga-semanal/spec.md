## ADDED Requirements

### Requirement: Validar los diagramas de la teoría
El validador de semana SHALL revisar el `diagrama` de cada bloque de `teoria` que lo traiga y reportar **errores**
en español que digan el elemento, el bloque y el problema: `tipo` fuera de `flujo`, `ciclo`, `capas`, `ramas`,
`comparar`; `pasos` con menos de 2 o más de 8 elementos o con `texto` vacío; `ramas` sin `centro`; `comparar` sin
`derecha` de 2–8 elementos; `columnas` que no sean 2 textos; textos o iconos demasiado largos.

#### Scenario: Diagrama válido
- **WHEN** una actividad trae un diagrama de cada tipo bien formado
- **THEN** no hay errores

#### Scenario: Tipo desconocido
- **WHEN** un diagrama tiene `tipo: "pastel"`
- **THEN** hay un error que menciona el tipo y los válidos

#### Scenario: Pocos o demasiados pasos
- **WHEN** un diagrama tiene 1 paso o 9 pasos, o un paso sin `texto`
- **THEN** hay un error

#### Scenario: Ramas sin centro y comparar sin derecha
- **WHEN** un diagrama `ramas` no trae `centro` o uno `comparar` no trae `derecha`
- **THEN** hay un error por cada caso
