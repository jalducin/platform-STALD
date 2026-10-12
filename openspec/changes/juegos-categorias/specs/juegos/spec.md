## MODIFIED Requirements

### Requirement: Catálogo de juegos
`juegos.html` SHALL mostrar los juegos por categoría: Inglés, Cultura y Conocimiento (desde cultura-conocimiento, que
junta las antiguas secciones Español y Maratón de cultura), Mente ágil, Clásicos (desde juegos-clasicos) y Arcade
(desde juegos-plataformas-karts). La pestaña 🎮 Juegos SHALL abrir primero en las categorías y, al elegir una, mostrar
solo sus juegos (ver «Navegación por categorías»), cada uno con su ícono y su descripción.
Cada tarjeta muestra el mejor puntaje de la semana del jugador. Cada juego SHALL terminar en una pantalla
de resultado con puntos y aciertos; los de Arcade muestran el resultado de cada nivel o carrera dentro del juego.

#### Scenario: Jugar y ver el resultado
- **WHEN** una alumna termina "Vocabulario contra reloj"
- **THEN** ve sus puntos, sus aciertos y su posición en el ranking de la semana

#### Scenario: Categoría Arcade
- **WHEN** un alumno abre la categoría «🕹️ Arcade» en el inicio de Juegos
- **THEN** ve «Axo y los 12 mundos» y «Karts Turbo», con su ícono y su descripción

#### Scenario: Sección Cultura y Conocimiento
- **WHEN** una alumna abre el inicio de Juegos
- **THEN** ve una sola categoría «🧠 Cultura y Conocimiento» que contiene Maratón de cultura, Línea del tiempo,
  Ortografía y Ordena la oración
- **AND** ya no ve las secciones «📝 Español» ni «🧠 Maratón de cultura»

#### Scenario: Los puntos anteriores siguen contando
- **WHEN** un alumno ya tenía su mejor puntaje de la semana en Ortografía
- **THEN** lo sigue viendo en la tarjeta de Ortografía, dentro de Cultura y Conocimiento

### Requirement: Blackjack con fichas sin valor
Juegos SHALL ofrecer en Clásicos el **♣️ Blackjack (21)** (ícono en imagen: ver «Íconos de juego en imagen») (`blackjack`) con fichas de juego sin valor real, 500 fichas
y 8 manos.
- En cada mano se apuesta con fichas de 5, 10, 20, 50 y 100 (múltiplos de 5, de 5 hasta las fichas que tengas); luego
  cada quien puede **pedir**, **plantarse** o **doblar** (solo con 2 cartas y fichas suficientes); 21 o pasarse
  termina el turno.
- La banca SHALL pedir mientras tenga menos de 17. Ganar paga el doble de la apuesta, el empate la devuelve y el
  blackjack natural paga 3 a 2 (en múltiplos de 5).
- Individual contra la banca; en partida, hasta 6 personas contra la banca en una mesa de 3 asientos: con bots, cada
  persona que entra quita un bot (1 persona + 2 bots, 2 + 1); turnos de 30 s (al vencer: apuesta mínima o plantarse).
- En partida, el servidor SHALL aceptar solo `apostar`, `pedir`, `plantarse` y `doblar`; `apostar` SHALL traer un
  `monto` entero, múltiplo de 5 y de al menos 5, y las demás acciones no llevan monto; si no, 400 `jugada_invalida`.
- Puntos: las fichas con que terminas (tope 1000).
- La pantalla SHALL aclarar que las fichas no se compran, no se cambian y no tienen valor real.

#### Scenario: Plantarse y ganarle a la banca
- **WHEN** Laura apuesta 20, se planta con 19 y la banca termina con 18
- **THEN** recibe 40 fichas (su apuesta más 20)

#### Scenario: Monto inválido en partida
- **WHEN** alguien envía `apostar` con `monto: 7` o sin monto
- **THEN** el servidor responde 400 `jugada_invalida`

#### Scenario: Cada persona que entra quita un bot
- **WHEN** Marisol crea una sala de Blackjack con bots y luego entra Angel
- **THEN** la sala de espera pasa de «1 persona + 2 bots» a «2 personas + 1 bot»

#### Scenario: Mesa compartida
- **WHEN** dos personas y un bot juegan en la misma sala
- **THEN** todos ven las mismas cartas, apuestas y resultados de cada mano

## ADDED Requirements

### Requirement: Navegación por categorías
La pestaña 🎮 Juegos SHALL mostrar primero una pantalla de **tarjetas de categoría**, en el orden del catálogo, cada una
con su emoji, su nombre, cuántos juegos tiene y una descripción corta. El número de juegos SHALL contarse del catálogo
de la página (sin números fijos). Las tarjetas SHALL ser botones con contorno de foco visible y un `aria-label` que
incluya el número de juegos. La rejilla SHALL tener 1 columna a 320 px, 2 a 390 px y 3 en escritorio, sin
desplazamiento horizontal.

Al elegir una categoría SHALL verse solo sus juegos, con las tarjetas de siempre (ícono, título, descripción y mejor
puntaje de la semana), el nombre de la categoría como encabezado y un botón «← Categorías». Al cambiar de vista, el
foco SHALL pasar al encabezado.

La categoría abierta SHALL recordarse en la pestaña del navegador (`sessionStorage`, sin fallar si no hay
almacenamiento) y en la URL (`#cat=<id>`): al salir de un juego, al recargar o al abrir un enlace con `#cat=` SHALL
verse esa categoría. El botón Atrás del navegador o del celular SHALL regresar de la lista de una categoría a la
pantalla de categorías. Las animaciones de las tarjetas SHALL desactivarse con `prefers-reduced-motion`. Las pestañas
Partidas, Ranking y Admin, las salas y los enlaces de partida (`?sala=`) SHALL funcionar igual.

#### Scenario: Elegir categoría y luego juego
- **WHEN** Marisol abre Juegos en su celular
- **THEN** ve las tarjetas 📘 Inglés, 🧠 Cultura y Conocimiento, ⚡ Mente ágil, 🎲 Clásicos y 🕹️ Arcade con cuántos
  juegos tiene cada una
- **AND** al tocar 🎲 Clásicos ve solo los juegos de Clásicos, el encabezado «🎲 Clásicos» y «← Categorías»

#### Scenario: Regresar a las categorías
- **WHEN** Angel está en la lista de 🕹️ Arcade y toca «← Categorías» o el botón Atrás del celular
- **THEN** vuelve a la pantalla de categorías sin salir de Juegos

#### Scenario: Volver de un juego a la misma categoría
- **WHEN** Laura juega Sudoku desde ⚡ Mente ágil y sale con ✕ o con «🎮 Otros juegos»
- **THEN** ve otra vez la lista de ⚡ Mente ágil

#### Scenario: Juego nuevo en el catálogo
- **WHEN** se agrega un juego a Arcade
- **THEN** la tarjeta de 🕹️ Arcade cuenta uno más sin cambiar nada en la pantalla de categorías

#### Scenario: Sin almacenamiento
- **WHEN** el navegador bloquea `sessionStorage`
- **THEN** las categorías y los juegos funcionan igual y la categoría se toma de la URL

### Requirement: Íconos de juego en imagen
El catálogo SHALL aceptar en cada juego un ícono opcional en imagen (`icono`, un SVG del repo). Donde el ícono del juego se pinta como
HTML (tarjeta del menú, ranking de juegos, barra del juego, resultado, encabezado de la sala, portada del juego y
«¿Continuar tu partida?») SHALL usarse esa imagen, del tamaño de los emojis vecinos y con texto alternativo vacío;
donde va como texto SHALL usarse un emoji de respaldo que se dibuje en cualquier celular. Blackjack SHALL usar
`juegos/iconos/blackjack.svg` (respaldo ♣️) y Dominó `juegos/iconos/domino.svg` (respaldo 🔳); ningún texto de la
página SHALL usar 🂡 ni 🁫.

#### Scenario: Íconos que se ven
- **WHEN** una alumna abre 🎲 Clásicos
- **THEN** las tarjetas de Blackjack y Dominó muestran su imagen cargada, alineada con los emojis de las demás

#### Scenario: Respaldo en texto
- **WHEN** un alumno abre el selector de juego en 👥 Partidas
- **THEN** ve «♣️ Blackjack (21)» y «🔳 Dominó»
