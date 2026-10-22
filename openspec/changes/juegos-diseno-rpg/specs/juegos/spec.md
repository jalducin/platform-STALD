## ADDED Requirements

### Requirement: Entrada de Juegos con estilo RPG
El hub de `juegos.html` SHALL abrir con un encabezado `#jg-heroe` que muestre:

- el avatar y el nick del jugador;
- ⭐ puntos individuales, 👥 puntos de partidas y el lugar de la semana, todo de `/juegos/yo`;
- el botón «🆕 Registrar», que se conserva.

Juegos no tiene nivel ni XP: el encabezado SHALL mostrar solo esos datos y no inventar otros.

La pestaña «🎮 Juegos», en la vista de categorías, SHALL mostrar estas secciones en orden:

1. «⭐ Para ti» (`[data-seccion="para-ti"]`): hasta 3 juegos con tu mejor puntaje de la semana, de mayor a menor. Cada
   tarjeta lleva el ícono, el nombre, un chip con su categoría y color, el puntaje y un botón «▶ Jugar» que abre el
   juego. Sin puntajes en la semana, un estado vacío amable que invita a elegir una categoría.
2. Las categorías (`#menu-juegos[data-menu="categorias"]`), con el mismo contenido y comportamiento que antes.
3. «👥 En vivo · Salas» (`[data-seccion="en-vivo"]`): «➕ Crear partida» y «🔑 Unirme con código», que llevan a la
   pestaña «👥 Partidas».
4. «🏆 Copas» (`[data-seccion="copas"]`): Karts Turbo y Fútbol Estelar 2010 con «▶ Jugar».

Las tarjetas de estas secciones no usan `.game[data-juego]`: esa clase queda solo para la lista de una categoría. Las
tarjetas de juego (`.game`) SHALL llevar la franja de color de su categoría y una píldora «▶ Jugar». Todo SHALL verse
a 360 px sin scroll horizontal, en claro y en oscuro (sistema o `stald_tema`), con contraste AA.

#### Scenario: Jugador con puntajes en la semana
- **WHEN** el jugador tiene en `mejores` 3 o más juegos esta semana
- **THEN** «⭐ Para ti» muestra los 3 de mayor puntaje, cada uno con chip de categoría, «⭐ <puntaje>» y «▶ Jugar», y
  al tocar «▶ Jugar» se abre ese juego

#### Scenario: Jugador sin puntajes
- **WHEN** el jugador no ha jugado esta semana
- **THEN** «⭐ Para ti» muestra un estado vacío amable y las categorías siguen debajo

#### Scenario: En vivo
- **WHEN** el jugador toca «🔑 Unirme con código» en «👥 En vivo · Salas»
- **THEN** se abre la pestaña «👥 Partidas» con el formulario para unirse

#### Scenario: Encabezado del jugador
- **WHEN** `/juegos/yo` responde con su avatar, nick, `totalIndividual`, `totalPartidas` y `pos`
- **THEN** `#jg-heroe` muestra el avatar, «¡Hola, <nick>!», ⭐ y 👥 con esos totales y «#<pos>» (o «—» si aún no
  tiene lugar)

#### Scenario: Tema del portal
- **WHEN** `localStorage.stald_tema` vale `oscuro` y el sistema está en modo claro
- **THEN** `juegos.html` se ve en modo oscuro (`<html data-theme="dark">`)

### Requirement: Botones reales en Juegos
En `juegos.html`, los botones de navegación, menús, formularios y overlays SHALL verse como botones: fondo, borde,
padding, hover, foco visible (contorno de 3 px), estado deshabilitado y un área táctil de 44 px o más de alto. Esto
incluye `.btn` (también `.btn.sm`), las pestañas, `.opt`, «← Inicio», el botón de música, el chip del avatar, las
opciones de música, avatar y color, `.adm-sub`, las tarjetas de categoría y de juego, y los botones de «Para ti»,
«En vivo» y «Copas». En los menús y overlays de Karts, Fútbol Estelar, Futbolito Arena, Billar, Golf, Futbolito,
Brigada, Plataformas y Dragon Run, los botones `.btn` (también `.btn.chico`) SHALL medir 44 px o más y tener foco
visible.

No cambian la lógica de los juegos, el canvas, los HUD dentro de la partida ni las piezas del tablero (celdas,
cartas, fichas, teclas de Sudoku o letras de la sopa).

#### Scenario: Hub a 360 px
- **WHEN** se abre el hub a 360 px en claro y en oscuro
- **THEN** todos los botones visibles miden 44 px o más y no hay scroll horizontal

#### Scenario: Menú de Karts
- **WHEN** se abre `juegos/karts.html` a 360 px
- **THEN** los botones `.btn` visibles del menú miden 44 px o más

#### Scenario: Foco con teclado
- **WHEN** se navega con Tab por el hub
- **THEN** el botón con foco muestra un contorno visible de 3 px
