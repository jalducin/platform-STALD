## ADDED Requirements

### Requirement: Personajes de carreras estilo karts
Además de Xalli, Itzae, Yahui y Xochiquetzal, «Axo y los 12 mundos» y «Karts Turbo» SHALL ofrecer 4 personajes más,
dibujados en código en el mismo estilo (sin imágenes externas, renders ni personajes o marcas de otras empresas) y con
nombres inventados y respetuosos:
- **Xolo**, Guía Veloz de los Caminos: xoloitzcuintle travieso con orejas grandes y collar de jade (peso ligero);
- **Tlali**, Saltarina de los Valles: chapulina oaxaqueña chistosa con sombrero bordado (peso ligero);
- **Tona**, Sabia de la Costa: tortuga marina con yelmo de jade y concha (peso pesado);
- **Kinich**, Estratega del Juego de Pelota: jugador de pelota maya astuto con yugo, rodillera y pelota de hule (peso
  medio).

Cada personaje nuevo SHALL tener en Axo todas las poses (quieto, caminar, saltar, caer, daño, perder y festejo) y las
variantes de champiñón y chile; en Karts SHALL verse de espaldas en su kart con sus colores; y SHALL soltar su propia
partícula al usar turbo (huellitas, notas, gotas o pelotitas).

Los 8 personajes SHALL tener un peso (ligero, medio o pesado) que solo cambie el empuje de los choques entre karts;
SHALL NOT cambiar la aceleración, la velocidad punta, el giro, los tiempos, los puntos ni el ranking. Los selectores
de los dos juegos SHALL mostrar a los 8 con retrato y nombre, sin desplazamiento lateral desde 320 px, y una línea con
el título y la personalidad del elegido (y su peso en Karts). En una carrera de copa o rápida los 7 rivales SHALL usar
a los 7 personajes que la persona no eligió.

#### Scenario: Selector con 8
- **WHEN** Sofy abre Karts Turbo en un celular de 390×844
- **THEN** ve a los 8 personajes en dos filas de 4, con retrato y nombre, sin desplazarse de lado

#### Scenario: Elegir un personaje nuevo
- **WHEN** Angel elige a Tona en Axo y recarga Juegos
- **THEN** Tona sigue elegida en Axo y en Karts, y la línea dice «Sabia de la Costa» y «🪨 Pesado»

#### Scenario: Rivales distintos
- **WHEN** Marisol, con Kinich, empieza la Copa Mesoamericana
- **THEN** su kart es rojo con Kinich al volante y los 7 rivales son los otros 7 personajes, uno cada uno

#### Scenario: El peso no da ventaja
- **WHEN** el piloto de prueba da una vuelta en la misma pista con Xolo y luego con Tona, sin otros karts
- **THEN** los dos tiempos son iguales (con la tolerancia de un cuadro de 1/60 s)

#### Scenario: Poses del personaje nuevo
- **WHEN** Sofy juega el 1-1 con Tlali, salta, toma el champiñón y el chile
- **THEN** Tlali se ve saltando, más grande y luego en tonos de fuego, y termina el nivel con «¡Nivel superado!»

### Requirement: Pistas mesoamericanas de Karts
Karts Turbo SHALL tener 4 pistas más inspiradas en civilizaciones de México, cada una con trazado cerrado propio,
paleta, cielo de 360° con su silueta, objetos de escenario, minimapa, nombre y descripción corta en el selector:
- **Calzadas de Tenochtitlan** (mexica): calzadas sobre el lago, chinampas, trajineras y el Templo Mayor al fondo;
  flechas turbo sobre la calzada;
- **Calzada de los Muertos** (Teotihuacan): la gran recta entre las pirámides del Sol y de la Luna; cabezas de
  serpiente emplumada que se deslizan de lado a lado;
- **Cenote de Chichén Itzá** (maya): selva, El Castillo y la cancha del juego de pelota; rampa con salto sobre el
  cenote y anillo de turbo en la cancha;
- **Selva de La Venta** (olmeca): selva húmeda, cabezas colosales y ríos; charcos de lodo que frenan.

Las mecánicas SHALL ser deterministas (mismo lugar y mismo movimiento en cada carrera, según el tiempo de carrera) y
SHALL aplicar igual a la persona y a los bots. Los récords de las pistas nuevas SHALL guardarse en el progreso como
los demás. Las pistas nuevas SHALL poder elegirse como mapa de una sala. Cada pista SHALL sostener 60 cuadros por
segundo en un celular con la CPU 4 veces más lenta.

#### Scenario: Elegir una pista nueva
- **WHEN** Angel abre «Carrera rápida»
- **THEN** ve las 8 pistas agrupadas por copa, cada una con su nombre, descripción, récord y meta

#### Scenario: Flechas turbo
- **WHEN** Sofy pasa sobre una flecha turbo en las Calzadas de Tenochtitlan
- **THEN** recibe un turbo corto

#### Scenario: Salto del cenote
- **WHEN** Marisol cruza la rampa del Cenote de Chichén Itzá
- **THEN** su kart salta sobre el cenote, aterriza del otro lado y recibe un mini-turbo azul

#### Scenario: Lodo
- **WHEN** Angel entra a un charco de lodo en la Selva de La Venta
- **THEN** su kart va más lento mientras está dentro

#### Scenario: Cabeza de serpiente
- **WHEN** Sofy choca con una cabeza de serpiente en la Calzada de los Muertos sin estrella
- **THEN** da vueltas y pierde 2 monedas, como con una cáscara

#### Scenario: Vuelta completa
- **WHEN** el piloto de prueba maneja una vuelta en cualquiera de las 4 pistas nuevas
- **THEN** cruza la meta y la vuelta cuenta

### Requirement: Copa Mesoamericana
Karts Turbo SHALL ofrecer, además de la Copa Fiesta, la **Copa Mesoamericana** con las 4 pistas nuevas, con la misma
tabla de puntos por lugar, bono final y piezas. La copa en curso SHALL guardarse y continuarse como la Copa Fiesta, y
el menú SHALL mostrar el mejor resultado de cada copa. La pintura dorada SHALL seguir pidiendo récord bajo la meta en
las 4 pistas de la Copa Fiesta.

#### Scenario: Empezar la Copa Mesoamericana
- **WHEN** Marisol elige «🏺 Copa Mesoamericana»
- **THEN** la carrera 1 de 4 es en las Calzadas de Tenochtitlan

#### Scenario: Continuar después de recargar
- **WHEN** termina la carrera 1 y recarga Juegos
- **THEN** el menú ofrece «Continuar Copa Mesoamericana» en la carrera 2 de 4 con sus puntos

#### Scenario: Mejor resultado por copa
- **WHEN** Angel terminó la Copa Fiesta en 2.º y la Copa Mesoamericana en 1.º
- **THEN** el menú muestra los dos resultados por separado
