## Why

El profe quiere cambiar «⚽ Futbolito» (futbolito de mesa por tiros) por un **juego de futbol de verdad** en
🕹️ Arcade, inspirado en el futbol táctico de consola de 2010: ritmo pausado, peso del balón, control del cuerpo antes
de pasar o tirar, barra de potencia y cartas de habilidad pasivas, en un universo **ficticio** (sin licencias, equipos,
jugadores, escudos ni marcas reales). Pide **controles como los de Karts** (que funcionan bien en el celular):
joystick a la izquierda y botones grandes a la derecha, «🎮 Mando clásico» (`juegos/mando.js`), control físico
(Gamepad API) y teclado, con el selector recordado.

El brief completo pide además multijugador en línea en tiempo real, que **no cabe** en el motor de salas actual
(escrituras al repo de datos de 0.3–1.5 s más aviso por Supabase Realtime: por eso Futbolito, Billar y Golf se juegan
por tiros). Este cambio adapta el alcance a la plataforma y deja escrito el diseño técnico del en línea en tiempo real
para el sprint 27.

## What Changes

- **Juego nuevo «Fútbol Estelar 2010»** (`juegos/futbol.html`, id `futbol`, ⚽) en 🕹️ Arcade, en iframe como Karts:
  - cámara de transmisión de TV que sigue al balón (perspectiva 2.5D de la cancha, como el pseudo-3D de Karts pero
    con cámara lateral), jugadores pequeños con colores de su equipo, número y sombra, y balón con altura (sombra que
    se separa) para pases elevados y centros; radar de la cancha;
  - sensación de 2010: ritmo pausado, sprint y cansancio, peso e inercia del balón, primer toque, orientación del
    cuerpo que importa al pasar o tirar, barra de potencia para tiros y pases largos; pase raso, al hueco y elevado o
    centro; tiro lejano y cercano; portero con reacciones; faltas básicas (tiro libre y penal); saque inicial, de
    banda, de meta y tiro de esquina; fuera de lugar opcional;
  - **cartas de habilidad pasivas** con ícono: «🎯 Pase al hueco», «🚀 Tirador lejano», «🧱 Muro», «🌀 Regateador»,
    «🐱 Portero felino», «🎩 Cabeceador», «⚡ Velocista» y «🔋 Incansable»;
  - **pizarra táctica** (4-4-2, 4-3-3, 3-5-2, 5-3-2; línea defensiva, amplitud, mentalidad y presión) en una pantalla
    previa corta con valores por omisión;
  - **IA** por formación y táctica: apoyo al que lleva el balón, marcaje, intercepciones y decisión de pasar, regatear
    o tirar, con niveles Fácil · Medio · Difícil · Leyenda (Fácil lo gana un niño o una niña);
  - **controles como Karts**: en el celular joystick + A pase, B tiro (mantener = potencia), X al hueco, Y elevado o
    centro, R sprint, L cambiar (en defensa A presionar o barrer, B entrada, X doble presión); «🎮 Mando clásico»;
    control físico; teclado (flechas/WASD + J/K/U/I + Shift + Q); selector recordado; horizontal recomendado (en
    vertical se sugiere girar, pero se puede jugar);
  - **modos:** Partido rápido, Copa (Copa Continental de Clubes), Carrera (Liga Master ficticia), Torneo local y
    Clasificatoria semanal (contra la IA, puntos al ranking);
  - **multijugador local en PC:** de 2 a 4 personas con controles físicos y/o teclado (dos juegos de teclas),
    cooperativo contra la IA o 1 vs 1 (y 2 vs 2); torneo de sillón de 4 a 8 equipos con personas y la IA; en el
    celular, 1 persona;
  - **universo ficticio** generado por un script determinista (`herramientas/generar-futbol.ts` →
    `juegos/datos/futbol.json`): Liga Volcán (Primera), Liga del Pacífico (Segunda) y Liga Norte (Tercera) con 8 clubes
    cada una, escudos dibujados en canvas, colores, estadios y jugadores y jugadoras con nombres inventados;
    personalización del club propio (escudo, uniforme y estadio);
  - **Carrera simplificada:** club propio en Tercera, temporada de 14 jornadas contra la IA, tabla, ascensos y
    descensos, dinero para fichar y desbloquear cartas, ojeador que descubre jugadores, progresión por temporada y
    Copa Continental al quedar entre los 4 primeros de Primera; partidos configurables de 2 a 6 minutos.
- **Servidor:** `CATALOGO.futbol` («Fútbol Estelar 2010», `arcade`, tope 1000) y avance `/juegos/progreso/futbol` con
  forma exacta en `server/progreso.ts` (estadísticas, clasificatoria semanal, táctica y carrera).
- **Futbolito se retira:** sale del menú de Arcade y del menú de salas de 👥 Partidas; sus archivos, su motor, su
  entrada en `CATALOGO` y el soporte del servidor se quedan para no romper enlaces, historial ni salas en curso.
- **Audio:** «Emoción sonora» (`juegos/emocion.js`, sprint 24b, ya en `main`): `gol()`, `silbato()` al empezar y al
  final, `intensidad()` en un final cerrado, `victoria()`/`derrota()`, `suspenso()`/`revelacion()` en los penales,
  `podio()` en la copa y el torneo y `calma()` al salir; efectos propios sintetizados para patadas, postes y público.
- **Sprint 27 (propuesto, no se implementa aquí):** en línea 1 vs 1 en tiempo real, autoritativo en el anfitrión sobre
  Supabase Realtime broadcast, con el diseño técnico completo en `design.md`.

## Capabilities

### New Capabilities
<!-- ninguna: el juego se agrega a la capacidad viva `juegos` -->

### Modified Capabilities
- `juegos`: requisitos nuevos de «Fútbol Estelar 2010» (juego, controles, modos, universo, carrera, multijugador
  local, avance en el servidor) y el retiro de Futbolito del menú.

## Impact

- **Superficies:** `juegos.html` (versiones `?v=`), `juegos/futbol.html`, `juegos/futbol-motor.js`,
  `juegos/futbol-liga.js`, `juegos/datos/futbol.json`, `herramientas/generar-futbol.ts`, `juegos/app/menu.js`
  (tarjeta nueva y Futbolito retirado), `juegos/app/salas.js` (Futbolito fuera del menú de salas),
  `server/juegos.ts` (catálogo) y `server/progreso.ts` (avance). No toca `index.html`, `ingles.html`,
  `secundaria.html`, `server/salas.ts`, Notion, Postgres `stald_*`, Supabase ni `.env`.
- **Datos:** `juegos/progreso/futbol/<id-jugador>.json` en el repo de datos (como los demás juegos con avance), solo
  del propio jugador; puntos en `/juegos/partida` como los demás de Arcade. El nombre del club propio lo escribe la
  persona: se guarda solo en su avance y se escapa al pintarlo. **Matriz de acceso:** cada jugador lee y escribe solo
  su avance (id de la sesión); el ranking muestra los puntos como hoy; nadie más ve el club propio.
- **Pruebas:** `server/futbol_motor_test.ts`, `server/futbol_liga_test.ts`, `server/futbol_test.ts` (catálogo, avance
  y datos), `tests/e2e/e2e-futbol.js` (nuevo, en `correr.sh`) y ajustes en `e2e-juegos.js` y `e2e-futbolito.js`.
- **Acciones externas** (usuario, tras el merge): probar en un celular real en horizontal y vertical y con un control
  físico en PC; decidir el arranque del sprint 27.
