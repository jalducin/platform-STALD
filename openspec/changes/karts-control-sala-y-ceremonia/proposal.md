## Why

El profe pidió dos cosas para Karts: «En las partidas falta que puedan cambiar de tipo de control» y «Agregar en la
premiación una ceremonia». En una sala el juego se salta el menú (arranca con el mensaje `inicio`), así que hoy el
control solo se puede elegir en el modo individual; y el final de una carrera o copa es una tabla con el podio en
texto, sin el momento de «subir al podio».

## What Changes

- **Control en la sala de espera:** tarjeta «🎮 Tu control» junto a «🏁 Tu piloto» (solo Karts y solo si tienes
  asiento) con las mismas opciones del modo individual: ⬅➡ Botones, 🕹️ Joystick, 📱 Sensor y 🎮 Mando clásico, y
  «⚡ Acelerar: 🤖 Automático / 👆 Con botón». Se preselecciona lo que hay en `localStorage` (`karts_control`,
  `karts_acelerar`) y la elección se guarda ahí mismo (compartida con el modo individual). No va al servidor.
- **Sensor en iPhone:** al elegir 📱 Sensor en la sala de espera se pide el permiso del giroscopio dentro del toque
  (`DeviceOrientationEvent.requestPermission`). Si al arrancar la carrera el sensor no se pudo activar sin un toque,
  se abre el panel ⚙️ con «📱 Activar sensor» (no se cambia a botones en silencio).
- **Control durante la carrera en sala:** botón ⚙️ en el HUD (la sala no se pausa) que abre un panel chico con las
  mismas opciones; el cambio aplica al momento y se recuerda. Funciona en carrera suelta y en copa, en vivo y con
  fantasmas. Quien especta no lo ve.
- **Ceremonia de premiación** (`juegos/karts-ceremonia.js`, `window.KartsCeremonia`): escena con podio de 3
  escalones, foco, confeti, nombre de la copa o pista y puntos; los personajes dibujados de 1.º, 2.º y 3.º con su kart
  y su nombre suben en orden inverso (3.º, 2.º y 1.º) con 🥉🥈🥇. Usa `window.Emocion` (revelación al 3.º y 2.º,
  redoble antes del 1.º, victoria; respeta el silencio). Botón «⏭ Saltar». Dura 7 s; con `prefers-reduced-motion`
  se ve fija, sin animación. Después sigue la tabla de siempre y «Otra con los mismos».
  - Copa individual (al terminar la 4.ª carrera), copa en sala y carrera suelta en sala.
  - En sala todos la ven a la misma hora: arranca con el reloj común (`juegos/reloj-sala.js`, `ahoraServidor()`)
    2.5 s después del cierre que da el servidor; quien llega tarde la ve desde donde va; quien especta también.
  - Los datos salen del podio que ya se pinta (orden del servidor / `Arcade.podioCarrera` / `KartsCopa.estado`):
    la ceremonia no calcula lugares.
- El orden del podio (sprint 31) no cambia.

Superficies: `juegos.html` (sala de espera y podio de Karts en `juegos/app/arcade.js`, `juegos/app/salas.js`,
`juegos/app/arranque.js`), `juegos/karts.html` y el módulo nuevo `juegos/karts-ceremonia.js`. Sin cambios en el
servidor Deno, Postgres, Realtime, Auth, repo de datos ni Notion.

## Capabilities

### Modified Capabilities
- `juegos`: Karts permite elegir y cambiar el control en las salas y agrega la ceremonia de premiación.

## Impact

- `juegos/karts-ceremonia.js` (nuevo), `juegos/karts.html`, `juegos/app/arcade.js`, `juegos/app/salas.js`,
  `juegos/app/arranque.js`, `juegos.html` (`?v=`), `server/karts_ceremonia_test.ts` (nuevo),
  `tests/e2e/e2e-karts-vivo.js`, `tests/e2e/e2e-karts.js`, `docs/frontend-standards.md`.
- Coordinación: 43a (copa de 2 de 4 carreras, `karts-copa.js`, `server/karts_copa.ts`, `app/arcade.js`) y 43b (3
  vueltas, `karts-pistas.js`). Este cambio solo agrega UI marcada `// karts-control-sala` y `// karts-ceremonia`.
- Acciones externas: ninguna. Matriz de acceso: no toca datos de alumnos y alumnas; los nombres del podio son los
  que ya se ven en la sala (escapados).
