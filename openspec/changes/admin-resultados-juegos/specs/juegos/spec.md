## ADDED Requirements

### Requirement: Registro y resumen de partidas para el admin
El sistema SHALL registrar cada partida creada en un índice semanal y guardar el total final de cada
jugador y el podio del anfitrión al terminar. SHALL exponer `GET /juegos/admin/resumen`, solo para el
admin, con los jugadores de la semana (total, mejores, partidas, última vez) y las partidas (juego, fecha,
anfitrión, jugadores con su total y podio), sin correos.

#### Scenario: Partida registrada
- **WHEN** Marisol crea una partida, Angel se une y ambos envían su total final
- **THEN** el resumen del admin incluye la partida con los dos jugadores y sus totales

#### Scenario: Podio del anfitrión
- **WHEN** el anfitrión envía el podio con los bots
- **THEN** el resumen muestra ese podio
- **WHEN** alguien que no es el anfitrión envía un podio
- **THEN** se ignora

#### Scenario: Enlace directo para un invitado
- **WHEN** alguien sin sesión abre `juegos.html?sala=KXQP`, escribe su correo nuevo y se registra como invitado
- **THEN** entra directo a la sala de espera de la partida KXQP

#### Scenario: Compartir desde la sala de espera
- **WHEN** el anfitrión está en la sala de espera
- **THEN** ve el enlace, el botón "📤 Compartir" y un código QR con ese enlace

#### Scenario: Solo admin
- **WHEN** una alumna consulta `/juegos/admin/resumen`
- **THEN** responde 403
