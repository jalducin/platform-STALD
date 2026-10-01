## MODIFIED Requirements

### Requirement: Puntaje semanal por tipo de juego
Cada partida SHALL sumar a un puntaje semanal según su tipo: los juegos individuales a **⭐ Individuales** y
las partidas multijugador a **👥 Partidas**. Volver a jugar SHALL sumar siempre, dentro del límite diario y
del tope por partida. El ranking SHALL poder verse por cada tipo.

#### Scenario: Jugar de nuevo suma
- **WHEN** Sofy juega Simón dice dos veces (600 y 400)
- **THEN** su puntaje individual sube 1,000 en total, aunque 400 no sea récord

#### Scenario: Partida multijugador
- **WHEN** termina una partida de Basta en sala con 2,350 puntos
- **THEN** suma 2,350 a sus puntos de partidas y no a los individuales

#### Scenario: Partida de sala duplicada o ajena
- **WHEN** se intenta guardar dos veces la misma sala, o una sala donde el jugador no está
- **THEN** responde 409 `ya_guardada` o 403 `no_en_sala`, y no suma

#### Scenario: Dos rankings
- **WHEN** se abre el ranking
- **THEN** hay pestañas ⭐ Individuales y 👥 Partidas, cada una ordenada por su puntaje
