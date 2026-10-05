## ADDED Requirements

### Requirement: Basta en partida por rondas
Una partida de Basta SHALL jugarse en varias rondas (5, 10 o 12; 10 por defecto), cada una con una letra
distinta e igual para todos. Cada ronda SHALL cerrar a los 60 s o 3 s después del primer "¡Basta!",
mostrar sus resultados con el marcador acumulado y pasar sola a la siguiente letra. Al terminar la última
ronda SHALL mostrarse el podio con la suma de todas las rondas.

#### Scenario: Partida de 10 rondas
- **WHEN** la profe crea una partida de Basta sin cambiar las rondas y la empieza
- **THEN** se juegan 10 rondas con 10 letras distintas y al final el podio suma los puntos de las 10

#### Scenario: Elegir rondas
- **WHEN** se crea una partida de Basta con 5 o 12 rondas
- **THEN** se juegan exactamente esas rondas; otro valor responde 400 `rondas_invalidas`

#### Scenario: ¡Basta! adelanta la ronda
- **WHEN** alguien presiona "¡Basta!" en la ronda 3
- **THEN** la ronda 3 cierra 3 s después para todos, se ven sus resultados y sigue la ronda 4

#### Scenario: Mismo marcador en todos
- **WHEN** dos navegadores juegan la misma partida
- **THEN** ven las mismas letras, los mismos puntos por ronda y el mismo podio final
