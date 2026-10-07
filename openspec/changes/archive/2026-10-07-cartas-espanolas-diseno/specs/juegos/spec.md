## ADDED Requirements

### Requirement: Diseño de la carta española
En Brisca y Conquián, cada carta española visible SHALL dibujarse como una carta real: marco con esquinas
redondeadas sobre fondo crema, color propio por palo (oros dorado, copas rojo, espadas azul y bastos verde), el número
en las dos esquinas y el palo dibujado (moneda, copa, espada o basto). La sota, el caballo y el rey SHALL mostrar una
figura estilizada con su nombre. Cada carta SHALL tener un nombre accesible con su nombre completo. El dibujo SHALL
hacerse con CSS y SVG en línea, sin imágenes externas.

#### Scenario: Carta con número y palo
- **WHEN** una alumna ve su mano en Brisca
- **THEN** cada carta muestra su número en la esquina superior y en la inferior, y el palo dibujado

#### Scenario: Figuras
- **WHEN** en la mano hay una sota, un caballo o un rey
- **THEN** la carta muestra la figura estilizada y su nombre (SOTA, CABALLO o REY)

#### Scenario: Nombre accesible
- **WHEN** un lector de pantalla llega al caballo de copas
- **THEN** la carta se anuncia como «Caballo de copas»

### Requirement: Dorso y mazo
Las cartas ocultas (mazo y cartas de los rivales) SHALL mostrarse con un dorso con patrón. El mazo SHALL verse como
una pila con el número de cartas que quedan.

#### Scenario: Dorso en el mazo y en los rivales
- **WHEN** empieza una Brisca o un Conquián
- **THEN** el mazo y las cartas de los rivales se ven por el dorso

### Requirement: Estados y tamaños de la carta
La carta SHALL tener tres tamaños (mano, mesa y miniatura) y los estados jugable (resalta al pasar o tocar),
seleccionada (sube), triunfo (marca discreta en Brisca) y deshabilitada.

#### Scenario: Selección en Conquián
- **WHEN** un alumno toca una carta de su mano en Conquián
- **THEN** la carta sube y queda marcada como seleccionada

#### Scenario: Cartas del triunfo
- **WHEN** en la mano de Brisca hay cartas del palo de triunfo
- **THEN** llevan una marca discreta de triunfo, sin cambiar las reglas

### Requirement: Mano sin desbordar
La mano SHALL caber en una sola fila sin desbordar el ancho de la pantalla, encimando las cartas en abanico cuando no
quepan, en celular (390 px) y en escritorio.

#### Scenario: Conquián en celular
- **WHEN** un alumno juega Conquián con 8 o 9 cartas en un celular de 390 px
- **THEN** todas las cartas de la mano quedan dentro de la pantalla, en una sola fila, y se ve el número de cada una

### Requirement: Animación al jugar una carta
Cuando una carta llega a la mesa, SHALL aparecer con una animación sutil, una sola vez (no al volver a pintar la
sala). Con `prefers-reduced-motion: reduce` SHALL aparecer sin animación.

#### Scenario: Movimiento reducido
- **WHEN** el aparato pide movimiento reducido
- **THEN** las cartas aparecen en la mesa sin animación
