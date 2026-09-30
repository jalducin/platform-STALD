## ADDED Requirements

### Requirement: Resultados de juegos en la vista de admin
La vista de admin de `ingles.html` SHALL mostrar la tarjeta "🎮 Juegos de la semana":
- el ranking completo con puntos, juegos distintos y partidas;
- las partidas de la semana con su juego, fecha, anfitrión y podio.

El bloque de cada alumno o alumna SHALL mostrar su resumen de juegos.

#### Scenario: Después de la clase
- **WHEN** en la clase del domingo el grupo juega una partida de Maratón de cultura
- **THEN** el admin ve en su vista esa partida con el podio y los puntos de cada alumno o alumna

#### Scenario: Sin juegos
- **WHEN** nadie ha jugado en la semana
- **THEN** la tarjeta dice que aún no hay juegos esta semana
