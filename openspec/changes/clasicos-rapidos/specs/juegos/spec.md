## ADDED Requirements

### Requirement: Clásicos rápidos en el catálogo
`juegos.html` SHALL mostrar en la categoría 🎲 Clásicos cinco juegos más, con su ícono y una descripción corta:
«❌⭕ Gato», «🔴 Conecta 4», «✊ Piedra, papel o tijera», «🪢 Ahorcado en inglés» y «🐍 Serpientes y escaleras».
- El servidor SHALL aceptar `gato`, `conecta4`, `ppt`, `ahorcado` y `serpientes` en `/juegos/partida` con tope 1000
  y con sus títulos en el catálogo (para el ranking 🔥 Juegos).
- Los cinco SHALL poder crearse en partida (`POST /juegos/sala`).

#### Scenario: Ver los clásicos rápidos
- **WHEN** una alumna abre el inicio de Juegos
- **THEN** ve los cinco juegos nuevos en 🎲 Clásicos, con su ícono y su descripción

#### Scenario: Tope de puntos
- **WHEN** se envía una partida individual de `gato` con 5000 puntos
- **THEN** se guardan 1000

### Requirement: Jugadas de los clásicos rápidos en partida
El servidor SHALL validar la forma de cada jugada de los clásicos rápidos y guardar solo sus campos permitidos:
- `gato`: `{ n, accion: "marcar", casilla: 0–8 }`;
- `conecta4`: `{ n, accion: "soltar", col: 0–6 }`;
- `ppt`: `{ n: ronda 0–4, accion: "elegir", eleccion: "piedra" | "papel" | "tijera" }` o `{ n, accion: "pasar" }`;
- `ahorcado`: `{ n, accion: "letra", letra: una letra de la a a la z }` o `{ n, accion: "pasar" }`;
- `serpientes`: `{ n, accion: "tirar" }`.
Cualquier otra forma SHALL responder 400 `jugada_invalida`. En `gato`, `conecta4`, `ahorcado` y `serpientes` el paso
`n` es único en la sala (409 `turno_tomado`); en `ppt` cada persona juega la misma ronda y solo cuenta su primera
elección.

#### Scenario: Jugada fuera del tablero
- **WHEN** alguien manda `{ n: 0, accion: "marcar", casilla: 9 }` en una sala de Gato
- **THEN** responde 400 `jugada_invalida` y no se guarda nada

#### Scenario: Turno tomado
- **WHEN** en Conecta 4 Angel manda el paso 0 que Marisol ya jugó
- **THEN** responde 409 `turno_tomado`

#### Scenario: Misma ronda para todas y todos
- **WHEN** en Piedra, papel o tijera Marisol y Angel eligen en la ronda 0
- **THEN** se guardan las dos elecciones
- **AND** si Marisol vuelve a elegir en la ronda 0, se conserva la primera

### Requirement: Cupos y bots de los clásicos rápidos en partida
- Gato y Conecta 4 SHALL ser 1 vs 1 entre personas: sin bots, cupo de 2 (409 `sala_llena`) y el anfitrión no puede
  empezar con menos de 2 (409 `faltan_jugadores`).
- Piedra, papel o tijera y Ahorcado SHALL admitir hasta 8 personas, con los 2 bots si se piden.
- Serpientes y escaleras SHALL jugarse entre 2 y 4: hasta 4 personas y, si se piden bots, se completa con bots hasta
  4; si queda una sola persona sin bots, entra un bot.

#### Scenario: Tercera persona en Gato
- **WHEN** una tercera persona intenta unirse a una sala de Gato con 2 personas
- **THEN** responde 409 `sala_llena`

#### Scenario: Conecta 4 sin rival
- **WHEN** el anfitrión de una sala de Conecta 4 intenta empezar solo
- **THEN** responde 409 `faltan_jugadores`

### Requirement: Elección simultánea en Piedra, papel o tijera
La partida de Piedra, papel o tijera SHALL revelar las elecciones de una ronda a la vez para todas las personas.
- `GET /juegos/sala/<código>` SHALL mostrar `eleccion: "?"` para la elección de otra persona en una ronda en la que
  quien pregunta todavía no tiene jugada, salvo que todas las personas ya eligieron en esa ronda.
- El estado publicado en Realtime SHALL ocultar las elecciones de las rondas que no están completas.

#### Scenario: No se puede espiar
- **WHEN** Marisol eligió papel en la ronda 0 y Angel pide el estado sin haber elegido
- **THEN** Angel ve la jugada de Marisol con `eleccion: "?"`
- **AND** al elegir Angel, ambos ven las dos elecciones

### Requirement: Gato
El sistema SHALL ofrecer Gato (tres en línea) en dos modos:
- individual: serie de 3 rondas contra el bot, con 3 niveles: 🐣 fácil (al azar), 🦊 medio (gana o bloquea y a veces
  minimax) y 🦉 difícil (minimax: nunca pierde);
- partida 1 vs 1 por turnos de 20 s, al mejor de 3 rondas, alternando quién empieza.
Gana la ronda quien completa una línea de 3 (fila, columna o diagonal); si el tablero se llena sin línea, es empate.

#### Scenario: Línea de tres
- **WHEN** un jugador completa una diagonal
- **THEN** la ronda termina, se marca la línea ganadora y suma su punto

#### Scenario: Empate
- **WHEN** se llenan las 9 casillas sin línea
- **THEN** la ronda es empate y nadie suma la victoria

#### Scenario: Bot difícil
- **WHEN** alguien juega contra el nivel 🦉 difícil
- **THEN** el bot nunca pierde

#### Scenario: Tiempo agotado en partida
- **WHEN** a una persona se le acaban los 20 s de su turno
- **THEN** se marca una casilla libre al azar (igual en todos los dispositivos) y sigue la partida

### Requirement: Conecta 4
El sistema SHALL ofrecer Conecta 4 en un tablero de 7 columnas × 6 filas: la ficha cae animada a la casilla libre más
baja de la columna elegida y gana quien alinea 4 en horizontal, vertical o diagonal; con el tablero lleno, empate.
- Individual contra el bot, con 3 niveles (heurística, minimax a 4 y a 6 jugadas).
- Partida 1 vs 1 por turnos de 25 s.

#### Scenario: Columna llena
- **WHEN** alguien toca una columna llena
- **THEN** la jugada no se aplica

#### Scenario: Cuatro en diagonal
- **WHEN** un jugador completa 4 fichas en diagonal
- **THEN** gana y se resaltan las 4 fichas en ambos dispositivos

### Requirement: Piedra, papel o tijera
El sistema SHALL ofrecer Piedra, papel o tijera con elección simultánea y revelación a la vez:
- individual: al mejor de 5 contra el bot (gana quien llega a 3; los empates se repiten);
- partida de 2 a 8 participantes, todos contra todos en 5 rondas: cada quien suma una victoria por cada rival al que
  vence en la ronda; no elegir a tiempo pierde contra cualquier elección.

#### Scenario: Revelación a la vez
- **WHEN** todas las personas eligen en una ronda
- **THEN** todas ven a la vez la animación «¡Piedra, papel o tijera… ya!» y las elecciones de todos

#### Scenario: Partida con bots
- **WHEN** se crea una partida con bots
- **THEN** BOT-VACHIRA y BOT-ISAGII eligen en cada ronda igual en todos los dispositivos
- **AND** al final se ve el podio con las victorias de cada participante

### Requirement: Ahorcado en inglés sin violencia
El sistema SHALL ofrecer un Ahorcado con palabras del vocabulario de `juegos/datos/ingles.json`, mostrando la pista en
español y su emoji. Cada error desinfla un globo con carita amable (6 errores por palabra); no se dibuja a ninguna
persona colgada.
- Individual: 5 palabras.
- Partida: las mismas 3 palabras para todos, por turnos, en modo 🤝 cooperativo (el turno rota y todas y todos ganan
  +50 si la adivinan) o ⚔️ competitivo (quien acierta sigue y quien completa la palabra gana +50); +10 por cada
  aparición de la letra acertada.

#### Scenario: Letra acertada
- **WHEN** alguien elige la «e» en «apple»
- **THEN** se descubre la letra y suma 10 puntos

#### Scenario: Globo desinflado
- **WHEN** se acumulan 6 errores en una palabra
- **THEN** el globo termina de desinflarse, se muestra la palabra y se pasa a la siguiente

### Requirement: Serpientes y escaleras
El sistema SHALL ofrecer Serpientes y escaleras en un tablero de 100 casillas, con dado animado:
- la escalera sube y la serpiente baja; con 6 se vuelve a tirar; gana quien llega a la casilla 100;
- individual contra 1, 2 o 3 bots;
- partida de 2 a 4 participantes (personas y bots); el dado sale de la semilla de la sala y del paso, así nadie puede
  escoger su número y todos ven lo mismo.

#### Scenario: Escalera
- **WHEN** una ficha cae en la casilla 4
- **THEN** sube a la 14

#### Scenario: Serpiente
- **WHEN** una ficha cae en la casilla 16
- **THEN** baja a la 6

### Requirement: Calidad visual de los clásicos rápidos
Los cinco juegos SHALL dibujarse con CSS y SVG propios, verse completos a 390 px de ancho sin desplazamiento
horizontal, tener botones de al menos 44 px y animaciones suaves que se apagan con `prefers-reduced-motion`. Cada uno
SHALL tener su «📖 Cómo se juega» en español de México.

#### Scenario: Celular
- **WHEN** un alumno juega Conecta 4 en un celular de 390 px
- **THEN** ve el tablero completo y puede tocar cada columna sin hacer zoom
