## ADDED Requirements

### Requirement: Volver a la partida al recargar
Al entrar a una partida multijugador, la página SHALL dejar el código en la URL (`?sala=CÓDIGO`, conservando los
demás parámetros) y SHALL guardar en el navegador la sala activa con su hora y el id del jugador, nunca el correo.
Al recargar o volver a abrir Juegos en menos de 3 h, la página SHALL regresar sola a esa sala, con su estado, sin
duplicar al jugador. Al salir de la sala o al terminar la partida, SHALL limpiar la URL y la sala guardada.

#### Scenario: Recargar a mitad de la partida
- **WHEN** una jugadora recarga la página mientras juega una partida de preguntas
- **THEN** vuelve a la misma sala, ve la pregunta en curso y sus respuestas anteriores, y la sala sigue con 2
  personas, no con 3

#### Scenario: Abrir Juegos sin el código en la URL
- **WHEN** alguien que estaba en una sala vigente abre `juegos.html` sin `?sala=`
- **THEN** la página reconecta a esa sala si el servidor confirma que sigue dentro; si no (403, 404 o 410), borra
  la sala guardada y muestra el inicio de Juegos sin error

#### Scenario: Otra persona en el mismo aparato
- **WHEN** quien abre Juegos no es el jugador que guardó la sala
- **THEN** la página no intenta entrar a esa sala

#### Scenario: Salir de la sala
- **WHEN** la jugadora sale con ✕ y recarga
- **THEN** ve el inicio de Juegos, la URL ya no trae `sala` y no vuelve a la sala

#### Scenario: Volver a unirse en el servidor
- **WHEN** alguien que ya está en la sala vuelve a pedir unirse, aunque la partida ya empezó o la sala está llena
- **THEN** el servidor responde que sí, sin duplicarlo y sin borrar sus respuestas

#### Scenario: Basta por rondas tras recargar
- **WHEN** una jugadora recarga después de que cerraron rondas de Basta en las que ya envió palabras
- **THEN** esas palabras siguen en el servidor y la página no las reemplaza con un envío vacío

#### Scenario: Lotería tras recargar
- **WHEN** una jugadora recarga durante la Lotería en partida
- **THEN** ve marcadas las casillas que ya había marcado

### Requirement: Reanudar juegos individuales
Los juegos individuales que se reanudan SHALL guardar en el navegador su avance: los de preguntas (Vocabulario
contra reloj, Completa y responde, Ortografía, Maratón de cultura, Cálculo y secuencias) y el Sudoku guardan en el navegador una instantánea de la partida en curso
(puntos, aciertos, preguntas contestadas, vidas, tiempo que queda o tablero). Al volver a abrir Juegos en menos de
3 h, la página SHALL preguntar «¿Continuar tu partida de X?» y, si la persona acepta, SHALL seguir con el mismo
avance. La partida SHALL contar una sola vez en el ranking.

#### Scenario: Recargar un Sudoku a medias
- **WHEN** una jugadora llena casillas de un Sudoku, recarga y elige «Continuar»
- **THEN** ve el mismo tablero con sus casillas llenas, las mismas vidas, y puede terminarlo

#### Scenario: Recargar un juego de preguntas
- **WHEN** un jugador contesta preguntas de Cálculo y secuencias, recarga y elige «Continuar»
- **THEN** sigue con los mismos puntos y aciertos y con el tiempo que le quedaba

#### Scenario: Descartar la partida guardada
- **WHEN** la persona elige «No, ir a los juegos»
- **THEN** ve el inicio de Juegos y la partida guardada se borra

#### Scenario: Una sola vez en el ranking
- **WHEN** una partida reanudada termina
- **THEN** se registra un solo `POST /juegos/partida` y recargar después ya no ofrece continuarla

#### Scenario: Salir del juego
- **WHEN** la persona sale con ✕
- **THEN** la partida guardada se borra y recargar ya no ofrece continuarla

### Requirement: Aviso al recargar juegos que no se reanudan
Los demás juegos individuales SHALL pedir confirmación del navegador (`beforeunload`) si la persona intenta
recargar o salir con una partida en curso. Las pantallas de elegir nivel o modo y los juegos que se reanudan SHALL
NOT pedirla.

#### Scenario: Recargar un Memorama en curso
- **WHEN** alguien recarga a mitad de un Memorama
- **THEN** el navegador pide confirmar antes de salir

### Requirement: Sin «jalar para recargar» durante una partida
Mientras hay una partida en curso (individual o en sala), la página SHALL evitar el «jalar para recargar» del
celular con `overscroll-behavior-y: contain`.

#### Scenario: Partida en celular
- **WHEN** hay una partida en pantalla
- **THEN** `html` lleva `overscroll-behavior-y: contain`, y al volver al inicio de Juegos se quita
