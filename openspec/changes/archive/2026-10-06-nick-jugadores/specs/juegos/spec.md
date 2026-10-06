## ADDED Requirements

### Requirement: Nick de jugador
Todo jugador de Juegos SHALL poder ponerse un nick de 2 a 20 letras o números desde «🎨 Tu avatar». El nick SHALL
mostrarse en lugar de su nombre en el chip, el ranking y las partidas. Si lo quita, SHALL volver a su nombre. El
admin SHALL ver el nombre real y el nick en la pestaña «Jugadores».

#### Scenario: Alumna con nick
- **WHEN** Marisol se pone el nick «Mari Star»
- **THEN** el ranking y su chip muestran «Mari Star», y el profe ve «Marisol» con el nick «Mari Star»

#### Scenario: Quitar el nick
- **WHEN** deja el nick vacío y guarda
- **THEN** vuelve a aparecer con su nombre
