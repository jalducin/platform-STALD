## Why

El profe pidió (sprint 39, fase 3 · sprint 2): «un similar a Metal Slug pero nuestra propia versión, misiones, hasta 8
jugadores a la vez». La plataforma es escolar (niñas, niños y adolescentes): el juego tiene que ser **original** (sin
nombres, personajes, arte, sonidos ni niveles de terceros), de tono caricaturesco y cómico, **sin violencia realista ni
sangre**. Los enemigos son robots, drones, máquinas y alienígenas invasores que revientan en engranes y confeti; las
armas son juguetes («lanzaburbujas», «láser de juguete», «cañón de confeti»).

## What Changes

- **Juego nuevo «🦎 Brigada Xalli»** (id `brigada`) en 🕹️ Arcade: acción 2D de desplazamiento horizontal con inercia.
  Nombre: Xalli es el personaje de la casa (el ajolote de Axo) y una *brigada* es un equipo de rescate, no un ejército:
  la misión es **rescatar** animalitos y defender lugares de una invasión de robots traviesos.
- **Protagonistas**: los 8 personajes de `juegos/personajes.js` (Xalli, Itzae, Yahui, Xochiquetzal, Xolo, Tlali, Tona y
  Kinich) con sus colores, más equipo visible: casco, mochila y lanzaburbujas.
- **Jugabilidad**: correr, saltar (salto variable), agacharse; disparar en 8 direcciones (4 en el celular); globos de
  confeti (granada); armas que se recogen (ráfaga, abanico de confeti, láser de juguete) y escudo burbuja; rescates de
  animalitos en jaulas robóticas que dan premios; un vehículo (el «Armadillo», tanquecito saltarín); minijefes y jefes
  con patrones de semilla; corazones, vidas y, en equipo, revivir a quien cae.
- **4 misiones** con puntos de control, jefe, dificultad creciente y escenarios variados y respetuosos: Selva de Ceibas,
  Desierto de Saguaros, Ciudad de Colores y Estación Orbital. Cada misión da puntos, 1–3 estrellas y récord; se
  desbloquean en orden. El avance se guarda en `/juegos/progreso/brigada` con forma exacta y versionada.
- **Controles** como Karts/Arcade: en el celular joystick a la izquierda y **A = saltar, B = disparar (mantener =
  ráfaga), X = globo de confeti, Y = cambiar arma** a la derecha; 🎮 mando común (`juegos/mando.js`), control físico y
  teclado. Se recomienda el celular de lado.
- **Modo individual** con compañeros IA opcionales (0, 1 o 3).
- **Cooperativo en vivo de 1 a 8** (modo principal, en la segunda entrega): sala de 1–8 sin bots o con compañeros IA,
  anfitrión autoritativo por el canal en vivo (`juegos/en-vivo.js`), predicción del personaje propio, golpes resueltos
  por el anfitrión, IA para quien se desconecta, respaldo sin canal, cámara compartida con «liga», puntos por persona
  y por equipo, podio con `Emocion.podio` y revancha; la dificultad sube con el número de jugadores.
- **Entrega en 2 PR**: (1) juego individual, misiones, avance y ranking; (2) cooperativo en vivo de hasta 8.

## Capabilities

### New Capabilities

_Ninguna._

### Modified Capabilities

- `juegos`: requisitos nuevos de Brigada Xalli (catálogo, jugabilidad, misiones y avance, controles, modo individual,
  cooperativo en vivo, sala y resultado validado, rendimiento).

## Impact

- Superficies: `juegos.html` (menú y Partidas); páginas nuevas `juegos/brigada.html`, `juegos/brigada-misiones.js`,
  `juegos/brigada-motor.js` y (PR 2) `juegos/brigada-red.js`; `juegos/app/menu.js`, `juegos/app/arcade.js`, (PR 2)
  `juegos/app/salas.js`, `juegos/app/arranque.js` y `juegos/mesas.js`; servidor Deno: `server/brigada.ts` nuevo,
  `server/progreso.ts`, `server/juegos.ts` y (PR 2) `server/salas.ts`. Supabase Realtime solo a través de
  `juegos/en-vivo.js`.
- Archivos compartidos con otros agentes: cambios pequeños marcados `// brigada`. No se toca nada de `karts*`.
- Datos: avance individual en el repo de datos (`juegos/progreso/brigada/<id>.json`, sin correos); el partido en sala
  viaja por el canal en vivo sin datos personales (ids de asiento y números). No se escribe en tablas `stald_`.
- Propiedad intelectual: todo el arte se dibuja con trazos de canvas propios; los sonidos son síntesis propia y
  `juegos/emocion.js`. Ningún nombre, personaje, nivel ni sonido de terceros.
- Acciones externas: ninguna (no cambia la configuración de Supabase ni las variables de Deno Deploy).
