## MODIFIED Requirements

### Requirement: Carreras de Arcade en partida
Las partidas (salas) SHALL permitir `plataformas` y `karts` como reto sin guardar avance:
- todos SHALL jugar el mismo nivel o pista, guardado en `sala.opciones.mapa` (lo elige quien crea la sala o el
  servidor al azar; 400 `mapa_invalido` si no existe), y la carrera empieza a la hora de inicio del servidor, con el
  reloj común de la sala (cada aparato estima la hora del servidor con la intersección de sus muestras; `GET
  /juegos/sala/<código>` trae `ahora` y `reloj`);
- cada persona SHALL enviar su tiempo con `POST /juegos/sala/<código>/respuesta { carrera: { ms, monedas } }`
  (`ms: null` si no terminó, con `avance` opcional de 0 a 999 ‰ de la carrera); solo cuenta el primero; el servidor
  SHALL rechazar con 400 `carrera_invalida` un tiempo fuera del mínimo y el límite del juego o que no cuadre con su
  reloj;
- BOT-VACHIRA y BOT-ISAGII, si la sala tiene bots, SHALL tener tiempos simulados creíbles, iguales en todos los
  dispositivos (semilla);
- el podio SHALL armarse cuando el servidor tiene los tiempos de todas las personas o al vencer el límite, por orden de
  llegada (tiempo desde la salida común; empate: quien lo reportó antes); quien no terminó SHALL ir después de todos
  los que terminaron, por su avance;
- los puntos de partida SHALL ser por lugar y estrictamente decrecientes (500, 440, 380, 320, 260, 200, 140, 80; no
  terminar = 0), sin monedas; el servidor SHALL calcularlos con su propio podio en `POST /juegos/partida` (ignora los
  que mande la página) y SHALL responder 409 `carrera_en_curso` sin guardar si la carrera sigue abierta;
- el progreso individual SHALL NOT cambiar.

#### Scenario: Podio con bots
- **WHEN** Marisol termina la carrera de su sala con bots en 20 s
- **THEN** ve el podio con su tiempo y los de BOT-VACHIRA y BOT-ISAGII, y sus puntos se suman a 👥 partidas

#### Scenario: Gana quien llega primero aunque tenga menos monedas
- **WHEN** en una sala de 2 personas Marisol cruza la meta primero con 0 monedas y Angel llega 2.º con 10 monedas
- **THEN** Marisol es 1.ª en el podio con 500 puntos y Angel 2.º con 440, en el servidor y en las dos pantallas

#### Scenario: Puntos inflados desde la página
- **WHEN** Angel, 2.º de la carrera, manda `POST /juegos/partida` con 9999 puntos
- **THEN** el servidor guarda 440 (los de su lugar)

#### Scenario: Carrera abierta
- **WHEN** Marisol pide guardar sus puntos y Angel todavía no manda su tiempo (sin vencer el límite)
- **THEN** responde 409 `carrera_en_curso` y no guarda nada; la página reintenta

#### Scenario: No terminó
- **WHEN** Laura no llega a la meta (avance 800 ‰) y Beto tampoco (avance 300 ‰) mientras Marisol sí llega
- **THEN** Marisol va 1.ª; Laura y Beto después, en ese orden, con 0 puntos

#### Scenario: Tiempo imposible
- **WHEN** alguien envía `ms: 5000` cuando la carrera empezó hace 60 s
- **THEN** responde 400 `carrera_invalida`

#### Scenario: Revancha con el mismo mapa
- **WHEN** termina una carrera de karts en «Lago Helado» y alguien toca «Otra con los mismos»
- **THEN** la sala nueva usa la misma pista

#### Scenario: La partida no guarda progreso
- **WHEN** alguien juega Karts Turbo en una sala
- **THEN** su progreso individual de karts no cambia

## ADDED Requirements

### Requirement: Salida pareja en las salas de Karts
En una sala de Karts, todos los aparatos SHALL arrancar a la misma hora del servidor (con el reloj común, ± la
latencia de la red) y la parrilla SHALL ser compacta y fija en píxeles, igual en las 8 pistas: filas de 2 a 48 px
(la 1.ª a 32 px detrás de la meta) y lados a ±24 px del centro del camino. Las personas SHALL ocupar los primeros
lugares en el orden de la sala y los bots (fantasmas) SHALL ir detrás; en el modo individual la persona sale en el
6.º lugar como siempre. Ninguna casilla SHALL quedar fuera del camino ni sobre una mecánica (turbo, salto, cenote,
lodo, trajinera).

#### Scenario: Salen juntos aunque la red de uno sea lenta
- **WHEN** Marisol y Angel empiezan una carrera en vivo y las respuestas del servidor le llegan a Angel con 1.5 s de
  retraso después de la primera
- **THEN** al salir, sus karts están a menos de 120 px uno del otro en las dos pantallas

#### Scenario: Parrilla en una pista grande
- **WHEN** se arma la parrilla de 8 en el Sacbé de Chichén Itzá
- **THEN** las 8 casillas quedan a menos de 200 px de la meta, sobre el camino y lejos de las mecánicas

### Requirement: Puntos de la copa de Karts en sala por lugar final
En una copa de Karts en sala, el podio final SHALL seguir la tabla de la copa (puntos de copa acumulados; desempate
por tiempo total) y cada carrera SHALL dar 15, 12, 10, 8, 6, 4, 2, 1 por orden de llegada. Los puntos de partida
SHALL salir del lugar final en la copa: 4 × los puntos por lugar de una carrera (2000, 1760, 1520…, tope 2000) y 0 si
no sumó puntos de copa, de modo que quien queda arriba en la copa SHALL recibir más puntos que quien queda abajo.

#### Scenario: Los puntos de partida siguen la tabla de la copa
- **WHEN** en una copa de 3 personas sin bots Marisol queda 1.ª, 1.ª, 3.ª y 3.ª (50 de copa), Laura 3.ª, 3.ª, 1.ª y
  1.ª (50, con más tiempo total) y Angel 2.º en las 4 (48)
- **THEN** el podio es Marisol, Laura y Angel, con 2000, 1760 y 1520 puntos de partida (antes, los 3 recibían 1700)
