## ADDED Requirements

### Requirement: Las carreras de Karts Turbo son de 3 vueltas
Cada carrera de Karts Turbo (carrera rápida, copa individual, carrera en sala y copa en sala) SHALL durar 3 vueltas en
las 16 pistas. El tiempo de referencia de cada pista SHALL ser el de sus 3 vueltas a 200 px/s (≈ 3:00–3:30), el límite
de una carrera de sala SHALL ser 2.5 veces la referencia (en decenas de segundo) y el mínimo el 25 %; el servidor SHALL
validar los tiempos de las salas con esos mismos límites y los bots de sala SHALL correr a partir de esa referencia. El
HUD SHALL mostrar «Vuelta 1/3» a «Vuelta 3/3», el aviso «¡Última vuelta!» y la campana de la última vuelta SHALL
llegar al empezar la 3.ª, y la carrera SHALL terminar al cruzar la meta por 3.ª vez. Cruzar la meta en reversa SHALL
seguir sin contar vueltas.

#### Scenario: Carrera rápida de 3 vueltas
- **WHEN** alguien corre una carrera rápida en cualquier pista
- **THEN** el HUD dice «Vuelta 1/3», al empezar la 3.ª avisa «¡Última vuelta!» y suena la campana, y la carrera
  termina al completar la 3.ª vuelta

#### Scenario: Límites de sala con 3 vueltas
- **WHEN** el servidor recibe el tiempo de una carrera de sala
- **THEN** lo valida con el mínimo y el límite de la pista calculados con sus 3 vueltas, y rechaza los tiempos fuera
  de ese rango con `carrera_invalida`

#### Scenario: Reversa sobre la meta
- **WHEN** alguien cruza la meta en reversa y vuelve a cruzarla hacia adelante varias veces
- **THEN** el conteo de vueltas no cambia

### Requirement: Récords de Karts de 3 vueltas, con los de 2 vueltas archivados
El juego SHALL guardar el avance de Karts con la versión de pistas 4 y archivar los récords de las carreras de 2
vueltas en `recordsV3`, mostrándolos como «2 vueltas» junto al récord nuevo y con un aviso corto al abrir el juego.
Las copas ganadas, las piezas, el equipo, la copa en curso y los récords ya archivados (`recordsV1`, `recordsV2`) SHALL
conservarse. Las carreras que falten de una copa en curso SHALL correrse de 3 vueltas, conservando sus puntos y su
número de carrera. Un récord SHALL anotarse solo si está entre 10 s y 20 min (`RECORD_MAX_MS`, ≥ 2 veces el mayor
límite de sala), y una carrera más lenta SHALL guardar la copa sin récord. El servidor SHALL aceptar la forma nueva y
las anteriores (pestañas viejas) y rechazar las combinaciones inválidas con `400 progreso_invalido`.

#### Scenario: Avance con récords de 2 vueltas
- **WHEN** alguien con récords de 2 vueltas (versión 3) abre Karts
- **THEN** sus récords pasan a «2 vueltas», cada pista dice «Sin récord» hasta correrla de nuevo, se avisa
  «¡Ahora son 3 vueltas!» y se conservan sus copas, piezas y la copa en curso

#### Scenario: Copa en curso al cambiar a 3 vueltas
- **WHEN** alguien tenía una copa a medias (p. ej. carrera 2 de 4 con 27 puntos)
- **THEN** el menú ofrece continuarla con sus puntos y la siguiente carrera es de 3 vueltas

#### Scenario: Carrera lenta de 3 vueltas
- **WHEN** una carrera individual de 3 vueltas tarda 12 minutos
- **THEN** se anota como récord válido y el servidor acepta el avance

#### Scenario: Carrera de más de 20 minutos
- **WHEN** una carrera de copa termina después de 20 minutos
- **THEN** no se anota récord, la copa suma sus puntos y el servidor acepta el avance

#### Scenario: Forma inválida
- **WHEN** llega un avance con `recordsV3` y una versión distinta de 4, o con versión 4 sin `recordsV3`
- **THEN** el servidor responde `400 progreso_invalido`
