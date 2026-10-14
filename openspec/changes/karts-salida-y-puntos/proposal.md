## Why

El profe jugó Karts en una sala con un alumno y reportó dos fallas:

1. «En el arranque debemos salir en el punto de partida muy cerca los jugadores en las partidas.» En la sala, los karts
   de las personas se ven lejos unos de otros desde la salida.
2. «Montecillo me ganó las carreras pero me dieron más puntos; en realidad debe ganar el que gane la carrera.»

Diagnóstico (ver design.md §1): la parrilla ya era compacta en píxeles (filas a 40 px y lados a ±0.42 del medio ancho,
porque las muestras de la pista van cada 8 px aun en las pistas grandes) y los puntos de la sala ya eran por lugar sin
monedas. La causa común es el **reloj de la sala**: cada aparato calcula la salida con un desfase contra el servidor
que se toma de la última respuesta (`ahora` sellado al **empezar** la petición, sin descontar el tiempo de
procesamiento ni la red; en producción, 0.2–2 s según el aparato y la petición). Así cada aparato arranca en un momento
distinto (1 s de diferencia ≈ 200 px ≈ 7 karts) y su tiempo se mide desde **su** salida: quien arrancó tarde «gana»
con menos tiempo aunque haya cruzado la meta después. Además, el servidor guardaba los puntos de sala que mandaba la
página (hasta 10 000) y, en la copa, los puntos de ranking (suma de 500, 425, 350… por carrera) podían quedar al revés
que la tabla de la copa (15, 12, 10…). Y `Arcade.puntosLugar` daba 50 al 7.º y al 8.º.

## What Changes

- **Reloj común de la sala** (`juegos/reloj-sala.js`, nuevo, sin DOM): el desfase se estima con la intersección de los
  intervalos de cada muestra (como NTP: antes y después de cada `GET /juegos/sala`, y el aviso de Realtime como cota
  inferior). `GET /juegos/sala/<código>` agrega `reloj` (hora del servidor al responder). Todos los aparatos arrancan
  a la vez (± la latencia de la red, decenas de ms) y el tiempo de cada quien equivale a la hora en que cruzó la meta.
- **La salida no se atrasa en aparatos lentos** (hallazgo de la E2E, design.md §2b): el juego fijaba su salida después
  de pintar la pista (≈ 1 s o más en una pista grande); ahora la fija antes y recibe `salidaLocal` (hora del aparato de
  la salida). La cuenta regresiva de Karts pasa de 5 a 8 s para que todos tengan la pista lista, y en la cuenta ya se
  ve en su casilla a quien está conectado.
- **Parrilla compacta y explícita** (`Arcade.parrilla`): filas de 2 a 48 px (≈ 1.7 karts), lados a ±24 px del centro,
  la 1.ª fila a 32 px de la meta, sin depender del tamaño de la pista. En sala, las personas en el orden de la sala
  adelante y los bots/fantasmas detrás (en el respaldo sin canal, tú adelante y los fantasmas detrás); en el modo
  individual sigues en el lugar 6 (fila 3).
- **Gana quien gana la carrera** (`Arcade.podioCarrera`, compartido por la página y el servidor): orden por tiempo
  desde la salida común (= orden de llegada), empate por quién lo reportó antes; quien no terminó va después, por su
  avance (`avance` en ‰, nuevo y opcional en `{ carrera: { ms: null, monedas, avance } }`). Puntos de ranking
  estrictamente decrecientes: `Arcade.puntosLugar` = 500, 440, 380, 320, 260, 200, 140, 80; no terminar = 0. Las
  monedas no cuentan en la sala.
- **El servidor calcula los puntos** de una carrera suelta en sala (`POST /juegos/partida` con `sala` de karts o Axo):
  ignora los puntos de la página y guarda los de su podio; si la carrera sigue abierta responde 409
  `carrera_en_curso` (la página reintenta). La página solo pinta el podio cuando el servidor ya tiene los tiempos de
  todas las personas (o venció el límite).
- **Copa en sala**: el podio sigue la tabla (puntos de copa acumulados; desempate por tiempo) y los puntos de ranking
  salen del **lugar final** en la copa (4 × `puntosLugar`, tope 2000; 0 si no sumó puntos), así nunca quedan al revés.
- Los puntos del modo individual no cambian. Los puntos de sala ya guardados no se reescriben.

## Capabilities

### New Capabilities

_Ninguna._

### Modified Capabilities

- `juegos`: requisito modificado «Carreras de Arcade en partida»; requisitos nuevos «Salida pareja en las salas de
  Karts» y «Puntos de la copa de Karts en sala por lugar final».

## Impact

- Superficies: `juegos.html` (carga `juegos/reloj-sala.js`, sube `?v=`), `juegos/app/salas.js`, `juegos/app/arcade.js`,
  `juegos/arcade.js`, `juegos/karts-copa.js`, `juegos/karts.html`, `juegos/plataformas.html` (`?v=` de `arcade.js`);
  servidor Deno (`server/carreras.ts`, `server/salas.ts`, `server/juegos.ts`); pruebas Deno y E2E.
- Contrato HTTP: `GET /juegos/sala/<código>` agrega `reloj` (número); `{ carrera }` acepta `avance` cuando `ms` es
  `null`; `POST /juegos/partida` de una carrera suelta en sala guarda los puntos del servidor y puede responder 409
  `carrera_en_curso`. Las páginas consumidoras cambian en el mismo PR.
- Matriz de acceso: sin cambios. El avance es un número de la carrera del asiento (sin datos personales); lo ve quien
  ya ve la sala y solo lo escribe su dueño (jugador de la sesión).
- Datos: no se escribe en tablas `stald_`; las partidas ya guardadas no se reescriben. Sin acciones externas.
