## ADDED Requirements

### Requirement: Aviso propio al empezar una sala de tablero sin jugadores
Cuando quien creó la sala toca «Empezar» y el servidor responde 409 `faltan_jugadores`, `juegos.html` SHALL mostrar el
aviso propio del juego de tablero que da `TableroUI.faltan(juego)` (Damas, Batalla naval, Dominó y Parchís) y, para
los demás juegos, el aviso general «👥 Faltan jugadores. Espera a que se una tu rival.». El botón «Empezar» SHALL
volver a quedar activo.

#### Scenario: Batalla naval sin rival
- **WHEN** alguien crea una sala de Batalla naval y toca «Empezar» sin que nadie más se haya unido
- **THEN** ve «🚢 Espera a que se una tu rival: la batalla naval es 1 vs 1.» y la sala sigue en espera

#### Scenario: Ajedrez sin rival
- **WHEN** alguien crea una sala de Ajedrez y toca «Empezar» solo
- **THEN** ve el aviso general «👥 Faltan jugadores. Espera a que se una tu rival.»
