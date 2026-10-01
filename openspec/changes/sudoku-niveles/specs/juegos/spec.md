## ADDED Requirements

### Requirement: Sudoku por niveles
Juegos SHALL ofrecer un Sudoku individual con niveles Fácil, Medio, Difícil y Experto. Cada tablero SHALL
tener una sola solución. Un número equivocado SHALL marcarse y restar una vida (3 vidas). Al resolverlo,
los puntos SHALL depender del nivel, la rapidez y los errores, y SHALL sumarse al ranking semanal.

#### Scenario: Resolver un Sudoku fácil
- **WHEN** Sofy elige Fácil y completa el tablero sin errores
- **THEN** ve "¡Sudoku resuelto!" con sus puntos y se guardan en el ranking

#### Scenario: Número equivocado
- **WHEN** escribe un número que no va en esa celda
- **THEN** se marca en rojo, no se queda y pierde una vida

#### Scenario: Sin vidas
- **WHEN** se equivoca 3 veces
- **THEN** termina con 0 puntos

#### Scenario: Niveles distintos
- **WHEN** elige Experto
- **THEN** el tablero trae menos pistas que en Difícil, Medio y Fácil, y sigue teniendo solución única
