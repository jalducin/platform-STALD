## ADDED Requirements

### Requirement: Futbolito
Juegos SHALL ofrecer en Arcade **«⚽ Futbolito»** (`futbolito`), futbolito de mesa con vista cenital y arte propio:
4 barras por equipo (portero, defensa, medios y delanteros) con jugadores que se deslizan y giran al patear, pelota
con rebote y paso fijo a 60 cuadros por segundo. Gana quien llega primero a 5 goles. En individual se juega contra
un bot de nivel Fácil, Medio o Difícil, en tiempo real: deslizar el dedo en la mitad de abajo mueve la barra activa,
un toque corto patea y la barra activa cambia sola según dónde está la pelota (las otras barras propias siguen la
pelota solas, más despacio). En escritorio, ← → (o A D) y Espacio. Al terminar SHALL registrar los puntos
(60 por gol más 200, 350 o 500 al ganar según el nivel; tope 1000) en ⭐ individuales.

#### Scenario: Mover la barra y patear con el dedo
- **WHEN** una alumna desliza el dedo a la izquierda en su mitad de la mesa y luego toca la pantalla
- **THEN** su barra activa se mueve a la izquierda y el jugador gira y patea la pelota hacia la portería rival

#### Scenario: Cambio automático de barra
- **WHEN** la pelota pasa de la zona de los medios a la de la defensa propia
- **THEN** la barra activa (resaltada) pasa a ser la defensa sin que nadie la elija

#### Scenario: Ganar a 5 goles
- **WHEN** un alumno mete su quinto gol contra el bot en nivel Medio
- **THEN** ve el resultado con el marcador y sus puntos, y estos se suman a sus ⭐ individuales

### Requirement: Billar bola 8
Juegos SHALL ofrecer en Arcade **«🎱 Billar»** (`billar`), bola 8 con arte propio: 15 bolas (lisas 1–7, rayadas
9–15 y la 8) en triángulo, 6 troneras, colisiones elásticas entre bolas, rebote en bandas y fricción. Para tirar se
arrastra sobre la mesa para apuntar (línea guía hasta el primer choque), la fuerza sale de lo largo del arrastre o de
una barra, y el efecto es opcional (seguir o retroceder). Reglas básicas: la mesa está abierta hasta que alguien mete
una bola sin falta, lo que define su grupo; es falta meter la blanca, no tocar ninguna bola o tocar primero una que no
es de tu grupo; con falta el turno pasa y la blanca vuelve a su punto; quien mete una de su grupo sin falta sigue
tirando; meter la 8 con su grupo completo y sin falta gana, y meterla antes de tiempo o con falta pierde. En
individual se juega contra un bot de nivel Fácil, Medio o Difícil y los puntos (tope 1000) van a ⭐ individuales.

#### Scenario: Apuntar con línea guía y tirar
- **WHEN** un alumno arrastra el dedo sobre la mesa y suelta
- **THEN** ve la línea guía mientras arrastra y, al soltar, la blanca sale en esa dirección con una fuerza
  proporcional a lo largo del arrastre

#### Scenario: Falta con la blanca
- **WHEN** una alumna mete la blanca en una tronera
- **THEN** se marca falta, la blanca regresa a su punto de salida y el turno pasa al rival

#### Scenario: Meter la 8 antes de tiempo
- **WHEN** alguien mete la 8 cuando todavía le quedan bolas de su grupo
- **THEN** pierde la partida

#### Scenario: Ganar con la 8
- **WHEN** alguien ya metió sus 7 bolas y mete la 8 sin falta
- **THEN** gana la partida

### Requirement: Futbolito y Billar en partida
Las partidas (salas) SHALL permitir `futbolito` y `billar` 1 vs 1 con mesa `{ max: 2, asientos: 2, min: 2 }`: si la
sala lleva bots y entra una sola persona, juega contra un bot; sin bots necesita 2 personas. Ambos se juegan por
turnos de tiro: cada tiro se manda como `jugada` y todos los aparatos lo simulan igual (determinista) desde la
semilla de la sala:
- Futbolito: `{ n, accion: "tiro", pos, angulo, fuerza }` (`pos` −150…150, `angulo` −60…60, `fuerza` 10…100). Tira
  quien tiene la pelota; las barras de los dos equipos se mueven con la misma defensa automática; la posesión pasa a
  la barra junto a la que se frena la pelota y tras un gol saca quien lo recibió. Gana quien llega a 5.
- Billar: `{ n, accion: "tiro", angulo, fuerza, efecto? }` (`angulo` 0…3599 en décimas de grado, `fuerza` 1…100,
  `efecto` −100…100) con las reglas de la bola 8.
- Los dos aceptan `{ n, accion: "rendirse" }`. Si quien tiene el turno no tira a tiempo (30 s en Futbolito, 60 s en
  Billar), se hace un tiro automático.
El servidor SHALL validar la forma de cada jugada con `validarJugada` (400 `jugada_invalida`), SHALL rechazar un
paso ya tomado por otra persona (409 `turno_tomado`) y SHALL rechazar jugadas nuevas cuando la partida ya terminó
(algún `final` registrado: 409 `partida_terminada`). Al terminar, el podio se pinta como en las demás partidas y se
puede pedir la revancha.

#### Scenario: Una persona contra el bot
- **WHEN** una alumna crea una sala de Billar con bots y empieza sin que entre nadie más
- **THEN** juega contra un bot que tira en su turno y, al terminar, ve el podio con «Otra con los mismos»

#### Scenario: Dos personas ven lo mismo
- **WHEN** dos alumnos juegan Futbolito en la misma sala y uno manda un tiro
- **THEN** los dos ven la misma trayectoria, el mismo marcador y el turno de la misma persona

#### Scenario: Jugada inválida
- **WHEN** alguien manda en Billar una jugada con `fuerza: 0` o `angulo: 4000`, o en Futbolito con `angulo: 90`
- **THEN** el servidor responde 400 `jugada_invalida` y no la guarda

#### Scenario: Partida terminada
- **WHEN** ya se registró el final de una partida de Futbolito y llega otra jugada
- **THEN** el servidor responde 409 `partida_terminada`

#### Scenario: Reproducción determinista
- **WHEN** dos aparatos reproducen la misma lista de tiros de Billar con la misma semilla
- **THEN** obtienen exactamente las mismas posiciones, bolas metidas, turno y resultado

### Requirement: Calidad de Futbolito y Billar
Futbolito y Billar SHALL verse completos a 360 y 390 px de ancho en vertical y en horizontal (la mesa se acomoda a
la pantalla), SHALL atender toques con *touch events* no pasivos dentro del iframe, SHALL respetar
`prefers-reduced-motion` (sin confeti ni sacudidas) y SHALL usar arte propio sin marcas y textos en español de
México. Los dos SHALL aparecer en el ranking «🔥 Juegos» con su título del catálogo.

#### Scenario: Celular en horizontal
- **WHEN** alguien juega Billar con el celular de lado (844×390)
- **THEN** la mesa se ve horizontal y completa, con los controles a la vista y sin encimarse
