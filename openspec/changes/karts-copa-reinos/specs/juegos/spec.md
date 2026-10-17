## ADDED Requirements

### Requirement: Copa Reinos Antiguos de Karts
«Karts Turbo» SHALL ofrecer la **Copa Reinos Antiguos** (id `reinos`) con 4 pistas nuevas: Gran Pirámide de Giza,
Interior de El Castillo, Templo de Karnak y Galerías de Angkor Wat. Cada pista SHALL ser cerrada, sin encimarse,
con radio mínimo ≥ 100 px, una vuelta de referencia de 115 a 140 s en 2 vueltas, una textura de a lo más 12.6 M px y
un minimapa legible (≥ 6 px entre tramos lejanos en el de 104×72). Cada pista SHALL tener al menos un tramo dentro
del monumento y al menos dos mecánicas, todas sobre el camino y lejos de la meta. La copa SHALL ser más difícil que
la Copa Mesoamericana y justa: carriles más angostos adentro, muros que frenan, obstáculos con aviso visible y bots
un poco más rápidos (`ritmoBots` 1.03, menos que en la Copa del Espacio). La copa SHALL tener `nivel: 3` (entre la
Mesoamericana y la del Espacio) y, en el modo individual, SHALL abrirse con 1 podio (1.º a 3.º) en cualquier otra copa,
con la misma regla de desbloqueo que la Copa del Espacio (antes se ve con candado y lo que falta); sus pistas SHALL
estar siempre en la carrera rápida. En salas SHALL estar disponible como copa completa, dentro de la copa mixta y como pistas sueltas, con el
mínimo y el límite de cada pista validados por el servidor. Los récords SHALL guardarse con la versión de pistas
vigente, como los de las demás pistas. Los textos SHALL ser de aventura, sin maldiciones ni sustos.

#### Scenario: Copa cerrada al principio
- **WHEN** alguien abre Karts sin ningún podio en una copa
- **THEN** ve «Copa Reinos Antiguos» con candado y que le falta 1 podio, y no la puede empezar

#### Scenario: Copa abierta
- **WHEN** alguien queda 3.º en la Copa Fiesta y vuelve al menú
- **THEN** puede empezar la Copa Reinos Antiguos (la del Espacio sigue cerrada) y la carrera 1 es en la Gran Pirámide de
  Giza

#### Scenario: Carrera rápida en una pista nueva
- **WHEN** alguien elige «Templo de Karnak» en la carrera rápida
- **THEN** corre con 8 corredores, encuentra las columnas de la sala hipóstila y las compuertas, y el minimapa muestra
  el trazado completo con los tramos interiores marcados

#### Scenario: Sala en una pista nueva
- **WHEN** la anfitriona crea una sala de Karts en «Galerías de Angkor Wat»
- **THEN** el servidor acepta la pista, valida el tiempo con el mínimo y el límite de esa pista y rechaza uno debajo
  del mínimo con 400 `carrera_invalida`

#### Scenario: Copa en sala
- **WHEN** la anfitriona crea una sala con «Copa completa: Copa Reinos Antiguos»
- **THEN** la sala corre las 4 pistas de la copa en orden y cualquier id de copa que no exista responde 400
  `copa_invalida`

### Requirement: Interiores de monumentos en Karts
Las pistas con tramos interiores SHALL dibujar, mientras la cámara va adentro: piso de piedra oscura, muros de piedra
en 3D en las dos orillas (o en la de afuera cuando el tramo es una cámara abierta), un cielo interior oscuro con
antorchas, una viñeta y el brillo de las antorchas, y una portada de piedra en cada entrada. Los muros SHALL detener
al kart en la orilla y frenarlo al tocarlos, igual para la persona y los bots. Las mecánicas SHALL ser deterministas
(posición y reloj de la carrera): bloques que caen en ciclo (sombra de aviso antes de caer), roca rodante, losas
(compuertas de piedra) que se deslizan, arena que frena, columnas en el camino y franjas de luz que dan turbo. Con
`prefers-reduced-motion` las antorchas SHALL quedarse quietas y la luz SHALL cambiar sin transición animada. El juego
SHALL sostener 60 cuadros por segundo en un celular con el CPU 4 veces más lento, también con 8 karts en vivo.

#### Scenario: Muro
- **WHEN** el kart toca el muro de un tramo interior a toda velocidad
- **THEN** se queda dentro del camino, pierde velocidad y sigue avanzando

#### Scenario: Bloque que cae
- **WHEN** el kart pasa bajo un bloque justo cuando cae
- **THEN** da un giro y pierde 2 monedas; un segundo antes, la sombra del bloque ya se veía en el piso

#### Scenario: Movimiento reducido
- **WHEN** el sistema pide movimiento reducido
- **THEN** las antorchas no parpadean y al entrar al monumento la luz cambia de golpe, sin animación

### Requirement: Copas de Karts sin listas fijas
Karts SHALL tomar de las definiciones compartidas de pistas y copas (`juegos/karts-pistas.js`) las copas de sala,
sus nombres y emojis, los mapas de sala del servidor y el selector de formato de la página de Juegos. Los selectores
SHALL mostrar las copas en orden de dificultad (`nivel`). La copa mixta SHALL seguir tomando 2 y 2 de la Copa Fiesta y
la Mesoamericana (decisión de karts-copa-espacio), al azar con la semilla de la sala.

#### Scenario: Copa nueva sin tocar listas
- **WHEN** se agrega una copa a `KartsPistas.COPAS`
- **THEN** aparece en el menú individual y en el selector de copa en sala, y el servidor la acepta, sin editar otra lista

#### Scenario: Orden de dificultad
- **WHEN** alguien abre el menú de Karts o el selector de copa de una sala
- **THEN** ve Copa Fiesta, Copa Mesoamericana, Copa Reinos Antiguos y Copa del Espacio en ese orden
