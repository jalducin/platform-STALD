## ADDED Requirements

### Requirement: Pistas espaciales de Karts
«Karts Turbo» SHALL ofrecer 4 pistas espaciales originales, del tamaño de las pistas grandes y con 2 vueltas: Estación
Orbital Quetzal, Anillos de Saturno, Cinturón de Asteroides y Nebulosa Esmeralda. Cada una SHALL tener un trazado
cerrado y manejable, un camino flotante de piso metálico translúcido con orillas de neón, un cielo de 360° con
estrellas y al menos un planeta, nebulosa, estación o luna, su escenario, su minimapa, su nombre y una descripción
corta. No SHALL usar nombres, naves, logotipos, sonidos ni personajes de ninguna franquicia. Las 4 SHALL poder
elegirse en «Carrera rápida» y en las partidas en sala (la lista de pistas de sala del servidor sale de las mismas
definiciones). Cada pista SHALL sostener 60 cuadros por segundo en un celular con el CPU 4 veces más lento.

#### Scenario: Elegir una pista espacial
- **WHEN** alguien abre «Carrera rápida»
- **THEN** ve las pistas agrupadas por copa en orden de dificultad, con las 4 espaciales al final, cada una con su
  nombre, su descripción corta, su récord y su meta

#### Scenario: Vuelta completa en una pista espacial
- **WHEN** un kart recorre completa cualquiera de las pistas espaciales
- **THEN** el contador marca la vuelta siguiente y el minimapa muestra el trazado completo

#### Scenario: Sala en una pista espacial
- **WHEN** alguien crea una partida de Karts en sala y elige una pista espacial
- **THEN** el servidor la acepta con el mínimo y el límite de esa pista y todas las personas corren en ella

#### Scenario: Pista desconocida en sala
- **WHEN** alguien pide una sala de Karts con una pista que no existe
- **THEN** el servidor la rechaza como siempre

### Requirement: Mecánicas espaciales
Las pistas espaciales SHALL usar mecánicas deterministas (dependen solo de la posición y del reloj de la carrera) que
las hacen las más difíciles pero justas:
- **Tramos sin barandal:** donde no hay postes de neón, salirse del camino es caer al vacío; un dron de rescate
  original devuelve el kart al camino con una penalización fija. Donde hay barandal, el kart raspa y sigue.
- **Huecos con rampa:** cruzar la rampa con velocidad salta el hueco; sin velocidad, se cae.
- **Gravedad baja:** saltos más largos y menos agarre.
- **Plataformas móviles:** el hueco se cruza encima de una plataforma que va y viene de lado.
- **Franjas turbo y antiturbo.**
- **Portales:** la misma entrada siempre lleva a la misma salida, más adelante en la misma vuelta.
- **Compuertas** que abren y cierran (el centro nunca se cierra del todo) y **rocas que cruzan** el camino.

#### Scenario: Caer al vacío y reaparecer
- **WHEN** un kart sale del camino en un tramo sin barandal
- **THEN** cae, el dron de rescate lo deja en el centro del camino después de una penalización fija y sigue la misma
  vuelta

#### Scenario: Barandal
- **WHEN** un kart choca con la orilla en un tramo con barandal
- **THEN** se queda en el camino y pierde un poco de velocidad, sin caer

#### Scenario: Saltar un hueco
- **WHEN** un kart cruza la rampa de un hueco a buena velocidad
- **THEN** salta el hueco sin caer; si la cruza lento, cae y el dron lo deja del otro lado del hueco

#### Scenario: Portal determinista
- **WHEN** un kart entra a un portal
- **THEN** sale siempre en el mismo punto de salida, con su velocidad y el rumbo de la pista

#### Scenario: Plataforma móvil
- **WHEN** un kart cruza un hueco encima de la plataforma
- **THEN** pasa al otro lado; si queda fuera de la plataforma, cae

#### Scenario: Compuerta
- **WHEN** un kart cruza una compuerta fuera de su abertura
- **THEN** choca, gira y pierde 2 monedas; por el centro siempre puede pasar

### Requirement: Copa del Espacio
«Karts Turbo» SHALL ofrecer la **Copa del Espacio** (`espacio`: Estación Orbital, Anillos, Cinturón y Nebulosa) con
las reglas de las demás copas y los bots más rápidos de todas. El menú, el selector de pistas y las copas en sala SHALL
mostrar las copas en orden de dificultad (Fiesta, Mesoamericana, …, Espacio) sin listas fijas. En el modo individual
la Copa del Espacio SHALL desbloquearse al terminar en el podio dos copas distintas; sus pistas SHALL poder
practicarse siempre en «Carrera rápida» y en sala. En sala SHALL poder jugarse como copa completa. Los récords de las
pistas nuevas SHALL guardarse con la misma forma versionada del progreso.

#### Scenario: Copa bloqueada
- **WHEN** alguien sin dos podios de copa abre el menú
- **THEN** ve la Copa del Espacio bloqueada con lo que le falta, y puede practicar sus pistas en «Carrera rápida»

#### Scenario: Empezar la Copa del Espacio
- **WHEN** alguien con podio en dos copas elige «Copa del Espacio»
- **THEN** la carrera 1 de 4 es en la Estación Orbital Quetzal y la copa en curso se guarda con el id `espacio`

#### Scenario: Copa del Espacio en sala
- **WHEN** alguien crea una partida de Karts con «Copa completa: Copa del Espacio»
- **THEN** el servidor la acepta y las 4 carreras son las pistas espaciales en orden

#### Scenario: Progreso con la copa nueva
- **WHEN** el juego guarda el progreso con la Copa del Espacio y récords de las pistas espaciales
- **THEN** el servidor lo acepta con la misma forma de siempre
