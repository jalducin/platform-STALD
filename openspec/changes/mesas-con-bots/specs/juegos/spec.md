## ADDED Requirements

### Requirement: Mesas de las partidas con bots que ceden su lugar
Cada juego de sala SHALL declarar su mesa en una sola tabla (`MESAS` en `server/salas.ts`, igual a
`juegos/mesas.js`) con estos campos:
- `max`: cupo de personas. Al llenarse, el servidor SHALL responder `sala_llena`.
- `asientos` (opcional): lugares de la mesa. Si la sala lleva bots, los lugares libres SHALL completarse con bots, y
  cada persona que entra SHALL quitar un bot.
- `min`: mínimo para empezar, contando personas y bots. Si no se alcanza, el servidor SHALL responder
  `faltan_jugadores`.
- `bots`: «siempre», «nunca» u omitido. Si se omite, lo decide quien crea la sala.

Los juegos sin mesa SHALL conservar la regla de siempre: los bots se suman aparte. La sala de espera SHALL mostrar
«Mesa de N · X personas + Y bots».

#### Scenario: Dominó con 3 personas
- **WHEN** la mesa es de 4 asientos con bots y entran 3 personas
- **THEN** juegan 3 personas + 1 bot; si entra una cuarta persona, ya no hay bot

#### Scenario: Ajedrez solo entre personas
- **WHEN** el anfitrión intenta empezar ajedrez solo
- **THEN** el servidor responde `faltan_jugadores` (mínimo 2, sin bots)

#### Scenario: Mesa llena
- **WHEN** ya hay 4 personas en una mesa de máximo 4
- **THEN** la quinta recibe `sala_llena`
