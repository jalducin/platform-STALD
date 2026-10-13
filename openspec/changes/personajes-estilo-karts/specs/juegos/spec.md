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
partícula (huellitas, notas, gotas o pelotitas) al correr en Axo y al usar turbo en Karts, salvo con movimiento
reducido.

Los 8 personajes SHALL tener un peso (ligero, medio o pesado) que solo cambie el reparto del empuje en los choques
entre karts; SHALL NOT cambiar la aceleración, la velocidad punta, el giro, los tiempos, los puntos ni el ranking. Los
selectores de los dos juegos SHALL mostrar a los 8 con retrato y nombre, sin desplazamiento lateral desde 320 px, y
una línea con el título y la personalidad del elegido (y su peso en Karts). En una carrera de copa o rápida los 7
rivales SHALL usar a los 7 personajes que la persona no eligió.

#### Scenario: Selector con 8
- **WHEN** Sofy abre Karts Turbo en un celular de 390×844
- **THEN** ve a los 8 personajes en dos filas de 4, con retrato y nombre, sin desplazarse de lado

#### Scenario: Elegir un personaje nuevo
- **WHEN** Angel elige a Tona en Axo y recarga Juegos
- **THEN** Tona sigue elegida en Axo y en Karts, y en Karts la línea dice «Sabia de la Costa» y «🪨 Pesado»

#### Scenario: Rivales distintos
- **WHEN** Marisol, con Kinich, empieza una carrera de la copa
- **THEN** su kart es rojo con Kinich al volante y los 7 rivales son los otros 7 personajes, uno cada uno

#### Scenario: El peso solo cambia los choques
- **WHEN** chocan un kart con Tona y uno con Xolo
- **THEN** el de Xolo se mueve más que el de Tona, y la velocidad punta y la aceleración de los dos son las mismas

#### Scenario: Poses del personaje nuevo
- **WHEN** Sofy juega el 1-1 con Tlali
- **THEN** Tlali se dibuja al jugar y termina el nivel con «¡Nivel superado!»

#### Scenario: Movimiento reducido
- **WHEN** el sistema pide `prefers-reduced-motion`
- **THEN** los personajes nuevos no sueltan partículas
