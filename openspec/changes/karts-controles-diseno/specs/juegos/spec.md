## ADDED Requirements

### Requirement: Controles táctiles de Karts
«Karts Turbo» SHALL mostrar sus controles táctiles en cualquier aparato con pantalla táctil y SHALL atender los
toques con *touch events* no pasivos (`preventDefault`, cada dedo por su `identifier`), de modo que el navegador no
los convierta en desplazamiento de la página ni los cancele, también dentro del iframe de `juegos.html`. Los
*pointer events* SHALL usarse para mouse y pluma. El control por omisión en celular SHALL ser un **joystick
virtual**:
- a la izquierda, el joystick aparece donde cae el pulgar; arrastrarlo gira con intensidad proporcional (el giro
  máximo es el mismo que con el teclado), tiene zona muerta, regresa al centro al soltar y jalarlo hacia abajo frena;
- a la derecha, botones grandes: DERRAPE (se mantiene), 🎁 ítem y FRENO;
- multitáctil: se puede girar y derrapar a la vez.
Los controles SHALL caber completos desde 320 px de ancho en vertical y en horizontal. Las reglas de la carrera
(aceleración automática, derrape, mini-turbos y sus tiempos) SHALL NOT cambiar.

#### Scenario: Girar con el joystick
- **WHEN** en una carrera alguien pone el pulgar en la zona del joystick y lo arrastra a la izquierda
- **THEN** el carro gira a la izquierda con una intensidad proporcional al arrastre y, al soltar, deja de girar

#### Scenario: Girar y derrapar a la vez
- **WHEN** mantiene el joystick a la izquierda con un dedo y DERRAPE con otro durante más de 2.1 s y suelta
- **THEN** recibe el mini-turbo morado

#### Scenario: Celular de 360 px
- **WHEN** alguien juega en un celular de 360 px de ancho dentro de Juegos
- **THEN** ve completos el joystick, DERRAPE, 🎁 y FRENO, sin que nada quede fuera de la pantalla

### Requirement: Volante por sensor en Karts
«Karts Turbo» SHALL ofrecer «📱 Inclinar el celular para girar» con `DeviceOrientationEvent`: `gamma` en vertical
y `beta` en horizontal según la orientación de la pantalla, con el centro calibrado al empezar cada carrera (y con
«🎯 Centrar») y sensibilidad Baja, Media o Alta. Si el navegador exige permiso (iOS), SHALL pedirlo con un toque
en «Activar sensor». Si no hay sensor, no llegan lecturas en 2 s o se niega el permiso, SHALL mostrar un aviso
amable y regresar al joystick.

#### Scenario: Inclinar para girar
- **WHEN** con el sensor activo la persona inclina el celular a la derecha respecto al centro calibrado
- **THEN** el carro gira a la derecha

#### Scenario: Permiso negado
- **WHEN** toca «Activar sensor» y el permiso de orientación se niega
- **THEN** ve el aviso de que se seguirá con el joystick y el control queda en Joystick

#### Scenario: Sin giroscopio
- **WHEN** activa el sensor en un aparato que no manda lecturas de orientación
- **THEN** a los 2 s ve el aviso y el control regresa al joystick

### Requirement: Selector de controles de Karts
En un aparato táctil, el menú de «Karts Turbo» SHALL mostrar antes de correr un selector de controles
(🕹️ Joystick · 📱 Sensor · 🔘 Botones, estos últimos los ◀ ▶ de antes), y SHALL recordar la elección y la
sensibilidad del sensor en `localStorage` del navegador. El teclado SHALL seguir funcionando en escritorio con
cualquier elección.

#### Scenario: La elección se recuerda
- **WHEN** alguien elige «Botones», cierra el juego y lo vuelve a abrir
- **THEN** el selector muestra «Botones» elegido y la carrera usa los botones ◀ ▶

### Requirement: Minimapa de Karts
Durante la carrera, «Karts Turbo» SHALL mostrar siempre un minimapa de la pista con la posición en tiempo real de
todos los corredores: el propio más grande, con borde, flecha de dirección y la etiqueta «TÚ»; cada rival con su
color y su número. En una sala SHALL mostrar también a los fantasmas de los bots. El minimapa SHALL NOT tapar el
joystick ni los botones a 390×844, en vertical u horizontal.

#### Scenario: Ver a todos en el mapa
- **WHEN** corre una carrera de la copa con 8 corredores
- **THEN** el minimapa muestra 8 marcas que se mueven con los carros y la suya resaltada con «TÚ»

#### Scenario: Fantasmas en sala
- **WHEN** corre en una sala con BOT-VACHIRA y BOT-ISAGII
- **THEN** el minimapa muestra a los dos fantasmas además de su propio carro

#### Scenario: Horizontal sin encimarse
- **WHEN** juega con el celular en horizontal (844×390)
- **THEN** el minimapa no se cruza con el joystick ni con los botones

### Requirement: Diseño visual de Karts
«Karts Turbo» SHALL dibujar karts vistos desde arriba con llantas, alerón, casco del piloto, sombra, brillo, el
color de cada corredor y su número; humo y chispas del mini-turbo con el color de su nivel (azul, naranja,
morado); pistas con orilla tipo piano, texturas, decoración propia de cada pista (pradera, desierto, hielo,
volcán) y línea de meta a cuadros; un HUD con posición grande, vuelta, tiempo, monedas e ítem; y una pantalla de
resultados con podio. Los personajes y marcas SHALL ser originales. La pista y los sprites SHALL pre-dibujarse para
sostener 60 fps en celular, `prefers-reduced-motion` SHALL reducir partículas y quitar el confeti, y los textos
visibles SHALL estar en español de México.

#### Scenario: Resultados con podio
- **WHEN** termina una carrera
- **THEN** ve un podio con los tres primeros (medalla, color y número), su tiempo, sus monedas y sus puntos, y la
  tabla de la carrera

#### Scenario: Movimiento reducido
- **WHEN** el sistema pide `prefers-reduced-motion`
- **THEN** el derrape muestra menos partículas y los resultados no tienen confeti
