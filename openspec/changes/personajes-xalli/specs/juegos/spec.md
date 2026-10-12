## ADDED Requirements

### Requirement: Personajes de Arcade
«Axo y los 12 mundos» y «Karts Turbo» SHALL ofrecer 4 personajes jugables de inspiración prehispánica, dibujados en
código con el estilo de cada juego (sin imágenes externas ni renders):
- **Xalli**, Guardián de los Canales: ajolote con branquias coral translúcidas que brillan y atuendo turquesa y jade;
  es el personaje por omisión;
- **Itzae**, Cronista del Sol: joven astrónomo con penacho de plumas y glifos solares dorados, códice que brilla y ropa
  ocre y turquesa;
- **Yahui**, Guerrero Jaguar de las Nubes: jaguar moteado con orejas, cola, brazaletes de obsidiana y penacho de
  quetzal;
- **Xochiquetzal**, Señora de la Niebla y las Flores: corona de flores, máscara de madera, huipil bordado de
  cempasúchil y niebla que brilla.

Cada juego SHALL tener un selector que muestre a los 4 con su nombre y su título; la elección SHALL recordarse en el
navegador (`localStorage.arcade_personaje`, compartida por los dos juegos) y, sin elección guardada o con un valor
desconocido, SHALL usarse Xalli. El formato del progreso del servidor SHALL NOT cambiar, así que un avance guardado
antes de este cambio SHALL cargar con Xalli.

En plataformas, cada personaje SHALL tener las mismas poses (quieto, caminar, saltar, caer, daño, festejo) y las
variantes de champiñón (más grande) y chile (tonos de fuego), con rasgos de silueta que lo distingan en tamaño chico
(branquias; penacho y códice; manchas, orejas y cola; corona, máscara y huipil), y una partícula propia (burbujas,
glifos, hojas o pétalos).

En Karts, cada personaje SHALL verse como piloto de espaldas en el kart pseudo-3D, con el kart en sus colores (Xalli
turquesa y coral, Itzae ocre y dorado, Yahui amarillo con manchas y obsidiana, Xochiquetzal magenta y cempasúchil);
los costados y el número SHALL conservar el color de identidad del corredor (el del taller para la persona). Los bots
y los fantasmas de sala SHALL usar los otros personajes.

Los personajes SHALL ser solo cosméticos: SHALL NOT cambiar la física, los tiempos, los puntos ni el ranking. En una
sala cada quien SHALL ver a su personaje; el personaje de las otras personas no se muestra (no se dibujan en tu
carrera). Con `prefers-reduced-motion` los personajes SHALL NOT tener partículas ni vaivén. Los selectores SHALL caber
desde 320 px en vertical y en horizontal, y los juegos SHALL sostener 60 cuadros por segundo.

#### Scenario: Selector con los 4 personajes
- **WHEN** Sofy abre «Axo y los 12 mundos» o «Karts Turbo»
- **THEN** ve a Xalli, Itzae, Yahui y Xochiquetzal con su nombre y su título, y Xalli elegido

#### Scenario: La elección se recuerda
- **WHEN** Sofy elige a Yahui y recarga Juegos
- **THEN** Yahui sigue elegido en los dos juegos y es quien aparece al jugar

#### Scenario: Avance viejo
- **WHEN** Angel, con avance guardado antes de este cambio y sin elección en su navegador, abre el juego
- **THEN** juega con Xalli y su avance carga igual

#### Scenario: Valor desconocido o sin almacenamiento
- **WHEN** `arcade_personaje` tiene un valor que no existe o el navegador bloquea `localStorage`
- **THEN** el juego usa Xalli sin errores

#### Scenario: Jugar con cada personaje
- **WHEN** alguien termina un nivel de plataformas o una carrera de Karts con cualquiera de los 4
- **THEN** se dibuja su personaje y obtiene los mismos puntos que con cualquier otro

#### Scenario: Rivales con los otros personajes
- **WHEN** Marisol, con Itzae, empieza una carrera de la copa
- **THEN** su kart es ocre y dorado con Itzae al volante, y los 7 bots usan a Xalli, Yahui y Xochiquetzal

#### Scenario: Movimiento reducido
- **WHEN** el sistema pide `prefers-reduced-motion`
- **THEN** los personajes no sueltan partículas ni mueven branquias o niebla

## MODIFIED Requirements

### Requirement: Diseño visual de Axo y los 12 mundos
«Axo y los 12 mundos» SHALL verse pulido sin cambiar sus reglas, su física, sus puntos ni el formato del progreso
guardado, con arte propio dibujado en canvas o SVG (sin imágenes externas ni personajes o marcas registradas):
- el personaje por omisión SHALL ser **Xalli**, un ajolote con branquias, ojos, sonrisa y cola, con animaciones de
  caminar, saltar, caer, daño y victoria; los otros personajes (requisito «Personajes de Arcade») SHALL tener las
  mismas animaciones; con champiñón el personaje SHALL verse más grande y con chile de fuego SHALL cambiar de tono;
  durante la invulnerabilidad SHALL verse translúcido sin parpadeo fuerte;
- el título del juego («Axo y los 12 mundos») y su id `plataformas` SHALL conservarse; los textos que hablan del
  personaje SHALL usar su nombre;
- cada mundo jugable SHALL tener un fondo con paralaje de 2 a 3 capas (pradera: colinas y nubes; desierto: dunas y
  sol; hielo: montañas nevadas y auroras; volcán: humo y brillo de lava) y los castillos su propio escenario;
- los tiles SHALL tener borde, sombra y textura; las monedas SHALL girar; los enemigos y el jefe SHALL tener cara y
  detalles propios de cada mundo;
- SHALL haber partículas ligeras: polvo al aterrizar, chispas al tomar monedas y nieve o ceniza según el mundo;
- el mapa de mundos SHALL mostrar un camino ilustrado con un nodo por nivel y el castillo del jefe, candados en los
  mundos «Próximamente» y el progreso guardado (niveles superados, nivel que sigue con el personaje elegido y avance
  de los 12 mundos);
- el HUD y los botones táctiles SHALL ser legibles y no SHALL tapar el nivel en un celular vertical de 390×844;
- las capas estáticas SHALL pre-dibujarse fuera de pantalla para sostener 60 cuadros por segundo, y con
  `prefers-reduced-motion` el juego SHALL quitar el paralaje y las partículas.

#### Scenario: Xalli con poderes
- **WHEN** Sofy toma un champiñón y después un chile de fuego
- **THEN** Xalli se ve más grande y luego cambia de tono, y al recibir un golpe queda translúcido 1.5 s sin parpadear

#### Scenario: Fondo de cada mundo
- **WHEN** Angel juega el nivel 3-1
- **THEN** ve montañas nevadas y auroras que se mueven a distinta velocidad que el piso, y cae nieve

#### Scenario: Mapa con avance
- **WHEN** Marisol, con el 1-1 y el 1-2 superados, abre el mapa
- **THEN** ve el camino de la Pradera con el 1-1 y el 1-2 marcados como superados, a su personaje junto al castillo
  1-3 y candados en los mundos 5 a 12

#### Scenario: Celular vertical
- **WHEN** alguien juega en un celular de 390×844
- **THEN** el HUD queda sobre el cielo, fuera del área del nivel, y los botones táctiles quedan debajo del juego

#### Scenario: Movimiento reducido
- **WHEN** el sistema pide `prefers-reduced-motion`
- **THEN** el fondo no hace paralaje y no hay partículas de ambiente, polvo ni chispas
