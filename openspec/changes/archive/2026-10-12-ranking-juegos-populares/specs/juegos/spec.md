## ADDED Requirements

### Requirement: Ranking de los juegos más jugados
El sistema SHALL exponer `GET /juegos/ranking/juegos?semana=<lunes>` (por omisión, la semana actual) con los juegos
del catálogo que tuvieron al menos 1 jugador en la semana: `{ pos, id, titulo, jugadores, partidas, mejor }`.
`jugadores` SHALL ser el número de personas distintas que jugaron ese juego (individual o en sala) y `partidas` el
número de partidas. Los bots SHALL NOT contar como jugadores. El orden SHALL ser por jugadores, de mayor a menor, con
desempate por partidas y luego por título. `mejor` SHALL traer el nombre visible (nick o nombre de pila) y los puntos
de la mejor partida, nunca correos. El agregado SHALL calcularse una vez por carga de la semana en caché y no leer los
archivos de la semana en cada petición. En 🏆 Ranking, la página SHALL mostrarlo en la sub-pestaña «🔥 Juegos», con el
encabezado «Semana del … al …», 🥇🥈🥉 para el top 3, emoji y nombre del juego, «N jugadores · M partidas», una barra
proporcional al líder y «👑 Mejor puntaje: {nick}». SHALL verse bien en un celular de 390 px.

#### Scenario: Orden por jugadores distintos
- **WHEN** en la semana Angel, Jesus y Laura juegan Sopa de letras, y Angel juega Ordena la oración 3 veces y Jesus 1
- **THEN** Sopa de letras aparece primero con «3 jugadores · 3 partidas» y Ordena la oración después con
  «2 jugadores · 4 partidas»

#### Scenario: Desempate por partidas
- **WHEN** dos juegos tienen 2 jugadores cada uno, uno con 4 partidas y otro con 2
- **THEN** el de 4 partidas va antes

#### Scenario: Sala con bots
- **WHEN** Jesus y Laura juegan Conquián en una sala completada con bots
- **THEN** Conquián cuenta 2 jugadores y 2 partidas; los bots no cuentan

#### Scenario: Semana sin juegos
- **WHEN** nadie ha jugado en la semana
- **THEN** la ruta responde `juegos: []` y la página dice «Todavía nadie juega esta semana. ¡Estrena un juego!»

#### Scenario: Sin registro o semana inválida
- **WHEN** pide el top un correo que no está registrado, o `?semana=` no es una fecha
- **THEN** responde 403 `no_registrado` o 400 `semana_invalida`

#### Scenario: Una sola lectura por carga
- **WHEN** se pide el top dos veces dentro de la vigencia de la caché de la semana
- **THEN** la segunda petición no vuelve a leer los archivos de la semana, y una partida nueva sí la refresca
