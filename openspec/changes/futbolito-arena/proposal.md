## Why

El profe mandó una imagen de referencia (un juego de mesa comercial; aquí no se usa su nombre ni su marca): una arena
octagonal de futbol con paredes, dos porterías y 4 robots redondos (verde azulado, azul, amarillo y rojo) que cada
persona maneja con un control remoto de **joystick + un botón**. Sus palabras: «ahora sí te mando una imagen, te dará
mejor idea de controles, y para un 2 vs 2 más grande». El Futbolito de barras salió del menú en el sprint 26 (sus
archivos se quedan por las salas viejas); el sprint 36 trae un futbolito nuevo, de robots, pensado para jugar en
equipo y en vivo.

## What Changes

- **Juego nuevo «⚽ Futbolito Arena»** (id `futbolito-arena`, nunca `futbolito`) en 🕹️ Arcade, en el `CATALOGO` del
  servidor con tope de 1000 por partida (como Fútbol Estelar).
- **Vista**: arena octagonal vista desde arriba con una ligera inclinación (pasto con franjas y líneas blancas, paredes
  que rebotan, 2 porterías). Cada robot es redondo, del color de su equipo, con su número, su apodo corto y un
  indicador de dirección; el balón tiene inercia y rebota en paredes y robots. En vertical la arena se gira 90° (las
  porterías quedan arriba y abajo, como en la imagen) y tu portería siempre queda de tu lado.
- **Controles como el control remoto**: joystick para moverse (dirección y velocidad), **botón A = ⚡ embestida /
  patada** con recarga y **botón B = 🌀 giro y freno** (opcional). Funciona con toques (joystick a la izquierda y botón
  grande a la derecha, como Karts), con el 🎮 mando común (`juegos/mando.js`), con controles físicos (Gamepad) y con
  teclado. Se recomienda el celular de lado.
- **Modos**:
  - **Contra la IA**: 1 vs 1, 2 vs 2 con compañero IA y 3 vs 3 en la arena grande; Fácil / Medio / Difícil (en Fácil
    una niña o un niño puede ganar); partido a 3, 5 o 7 goles o 3 minutos con gol de oro.
  - **En partida (sala)**: 2 vs 2 en vivo (modo principal), 1 vs 1, 1 vs 2 y 3 vs 3 (arena grande); los bots ocupan
    los asientos libres y cada persona que entra quita un bot. Equipo y robot se eligen en la sala de espera, con
    equipos parejos y «🔁 Cambiar de equipo».
  - **Netcode**: anfitrión autoritativo sobre el canal en vivo `juegos/en-vivo.js` (como Fútbol Estelar en línea):
    predicción del robot propio, interpolación de los demás, resultado validado por el servidor, respaldo sin canal y
    la IA toma el robot de quien se desconecta.
- **Reglas**: saque al centro tras cada gol, `window.Emocion` (gol, silbato, victoria o derrota, tensión al final),
  podio con revancha.

## Capabilities

### New Capabilities

_Ninguna._

### Modified Capabilities

- `juegos`: requisitos nuevos de Futbolito Arena (catálogo, arena y física, controles, modos contra la IA, sala por
  equipos, partido en vivo, desconexión y respaldo, resultado validado).

## Impact

- Superficies: `juegos.html` (menú y Partidas), páginas nuevas `juegos/futbolito-arena.html`,
  `juegos/arena-motor.js` y `juegos/arena-red.js`; `juegos/mesas.js`, `juegos/app/menu.js`, `juegos/app/salas.js`,
  `juegos/app/arcade.js`, `juegos/app/arranque.js`; servidor Deno (`server/salas.ts`, `server/juegos.ts`,
  `server/arena.ts` nuevo). Supabase Realtime solo a través de `juegos/en-vivo.js`.
- Archivos compartidos con otros agentes: cambios pequeños marcados `// futbolito-arena`. No se toca nada de `karts*`.
- Sin datos personales en el canal (ids de asiento y números del partido). En la arena se ve el apodo corto que ya
  muestra la sala. No se escribe en tablas `stald_`.
- Acciones externas: ninguna (no cambia la configuración de Supabase ni las variables de Deno Deploy).
