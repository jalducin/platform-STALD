## ADDED Requirements

### Requirement: Pistas grandes de Karts
Cada una de las 8 pistas de «Karts Turbo» SHALL medir por vuelta entre 2.7 y 3.3 veces lo que medía antes de este
cambio, conservando su forma general, su recta de meta y su carácter, con tramos nuevos (curvas y rectas) donde solo
escalar la dejaría monótona. Cada trazado SHALL ser cerrado, sin encimarse, con radio mínimo igual o mayor que el de
su versión anterior, y SHALL caber en una textura de a lo más 12.6 M px. Cada pista SHALL definir sus vueltas (2 en
las 8) para que una carrera dure ≈ 2 a 3 min y una copa de 4 carreras ≈ 10 a 12 min. Con la pista SHALL escalar: el
escenario y su densidad, las cajas de ítems, las monedas, la lava, las mecánicas (3 trajineras, 9 rampas de turbo,
2 saltos con cenote, 7 zonas de lodo), los adornos por tramo, el minimapa (legible: ≥ 6 px entre tramos lejanos en el
de 104×72), los tiempos de referencia de los bots y el turbo de salida. El juego SHALL dibujar solo el escenario
cercano a la cámara y sostener 60 cuadros por segundo en un celular con el CPU 4 veces más lento, también con 8 karts
en vivo.

#### Scenario: Vuelta más larga
- **WHEN** alguien corre una vuelta completa en el Lago Helado
- **THEN** recorre ≈ 12 760 px de pista (antes ≈ 4 250) y el HUD marca «Vuelta 2/2» al cruzar la meta

#### Scenario: Mecánicas en toda la pista
- **WHEN** alguien corre en Calzadas de Tenochtitlan
- **THEN** encuentra 3 canales con trajinera repartidos en la vuelta, todos sobre el camino y lejos de la meta

#### Scenario: Minimapa legible
- **WHEN** corre en un celular de lado (minimapa de 104×72)
- **THEN** ve el trazado completo sin que dos tramos lejanos se junten

#### Scenario: Rendimiento
- **WHEN** corre cualquiera de las 8 pistas con el CPU 4 veces más lento
- **THEN** el juego se mantiene a 60 cuadros por segundo

## MODIFIED Requirements

### Requirement: Karts
Juegos SHALL ofrecer en Arcade el juego **«Karts Turbo»** (`karts`), de carreras con vista cenital:
- al menos 4 pistas y 8 corredores (la persona y 7 bots), con las vueltas que defina cada pista;
- derrape con mini-turbo de 3 niveles (azul, naranja, morado), turbo de salida si se acelera con buen tiempo,
  monedas (hasta 10, suben la velocidad punta) e ítems que dependen de la posición (quien va más atrás recibe
  mejores);
- una copa de 4 carreras con puntos por lugar (15, 12, 10, 8, 6, 4, 2, 1), además de carrera rápida y un taller
  con piezas que se desbloquean;
- bots cuya dificultad se ajusta de forma acotada a cómo le va a la persona, sin trampas exageradas;
- en modo individual SHALL guardarse en el servidor la copa en curso, las copas ganadas, los mejores tiempos por
  pista y las piezas; cada carrera terminada SHALL sumar sus puntos a los ⭐ individuales (tope 2000);
- los récords SHALL guardarse con la versión de las pistas (`pistasV`): al abrir un progreso de una versión anterior,
  sus récords SHALL quedar archivados (`recordsV1`, visibles como «pista chica») con un aviso corto, sin perder las
  copas ganadas, las piezas, el equipo ni la copa en curso.

#### Scenario: Carrera de copa
- **WHEN** Angel termina la primera carrera de la Copa Fiesta en 3.er lugar
- **THEN** ve la tabla de la copa con sus 10 puntos y sus ⭐ individuales suben

#### Scenario: Continuar la copa
- **WHEN** recarga después de la primera carrera y vuelve a abrir Karts Turbo
- **THEN** puede continuar la copa en la carrera 2 de 4 con los mismos puntos

#### Scenario: Mini-turbo morado
- **WHEN** mantiene un derrape girando más de 2.1 s y lo suelta
- **THEN** recibe el turbo morado, el más largo

#### Scenario: Récords de las pistas chicas
- **WHEN** Sofy abre Karts con un récord de 1:02.3 en Pradera guardado antes de este cambio y una copa ganada
- **THEN** ve el aviso de las pistas nuevas, Pradera aparece «Sin récord» con «pista chica 1:02.3», su copa ganada
  sigue y el progreso se guarda con `pistasV: 2`

### Requirement: Carreras de Arcade en partida
Las partidas (salas) SHALL permitir `plataformas` y `karts` como reto sin guardar avance:
- todos SHALL jugar el mismo nivel o pista, guardado en `sala.opciones.mapa` (lo elige quien crea la sala o el
  servidor al azar; 400 `mapa_invalido` si no existe), y la carrera empieza a la hora de inicio del servidor;
- cada persona SHALL enviar su tiempo con `POST /juegos/sala/<código>/respuesta { carrera: { ms, monedas } }`
  (`ms: null` si no terminó); solo cuenta el primero; el servidor SHALL rechazar con 400 `carrera_invalida` un
  tiempo fuera del mínimo y el límite o que no cuadre con su reloj; en `karts` el mínimo (25 % de la referencia) y el
  límite (2.5 veces la referencia) SHALL ser los de la pista de la sala, calculados con las mismas definiciones que
  usa el juego (`juegos/karts-pistas.js` y `juegos/arcade.js`);
- BOT-VACHIRA y BOT-ISAGII, si la sala tiene bots, SHALL tener tiempos simulados creíbles, iguales en todos los
  dispositivos (semilla);
- el podio SHALL ordenarse por tiempo cuando todas las personas terminaron o al vencer el límite, y los puntos por
  lugar se guardan como partida de sala; el progreso individual SHALL NOT cambiar.

#### Scenario: Podio con bots
- **WHEN** Marisol termina la carrera de su sala con bots en 2:10
- **THEN** ve el podio con su tiempo y los de BOT-VACHIRA y BOT-ISAGII, y sus puntos se suman a 👥 partidas

#### Scenario: Tiempo imposible
- **WHEN** alguien envía `ms: 20000` en una sala de Karts en el Lago Helado (mínimo ≈ 32 s)
- **THEN** responde 400 `carrera_invalida`

#### Scenario: Revancha con el mismo mapa
- **WHEN** termina una carrera de karts en «Lago Helado» y alguien toca «Otra con los mismos»
- **THEN** la sala nueva usa la misma pista

#### Scenario: La partida no guarda progreso
- **WHEN** alguien juega Karts Turbo en una sala
- **THEN** su progreso individual de karts no cambia
