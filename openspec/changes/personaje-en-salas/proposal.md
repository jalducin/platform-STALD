## Why

El profe reporta: «en las partidas no se puede escoger entre los 8 personajes en Axo y Karts». En una sala, la página
de Juegos manda al iframe `inicio` con `modo: 'sala'` y el juego salta directo a la carrera o al nivel, sin pasar
por el menú (que es donde está el selector: `#menu-piloto` en Karts y `#personajes` en la portada de Axo). El juego
usa lo que haya en `localStorage.arcade_personaje` (o Xalli), sin forma de cambiarlo, y en Karts en vivo los demás
ven un personaje provisional hasta que llega el primer mensaje del kart.

## What Changes

- **Sala de espera (Karts y Axo)**: tarjeta «🏁 Tu piloto» (Karts) o «🦎 Tu personaje» (Axo) con los 8 personajes
  de `juegos/personajes.js` (retrato, nombre y, en Karts, peso) en una cuadrícula de 4×2 que cabe en un celular sin
  desplazamiento horizontal. Preselecciona `localStorage.arcade_personaje`; al elegir se guarda en el navegador
  (compartido con el modo individual) y en el asiento de la sala con `POST /juegos/sala/<código>/unirse { personaje }`.
  En la lista de jugadores cada quien ve, junto al nombre, el personaje de los demás.
- **Servidor**: `{ personaje }` en `/unirse` valida el id contra la lista de `juegos/personajes.js` (el servidor
  importa el mismo archivo, sin copiar la lista), solo en salas `karts` y `plataformas` y antes de empezar: 400
  `personaje_invalido` y 409 `ya_empezo` / `sala_llena` (códigos de siempre).
- **Al empezar**: la página manda en `inicio` el personaje propio y el de cada persona (`humanos[].personaje`).
  `empezarSala` de Karts y Axo lo usa (si falta: `localStorage`, luego Xalli). En Karts en vivo cada kart remoto
  arranca ya con el personaje de su asiento (y se sigue actualizando con el que manda su dueño); los fantasmas de los
  bots usan personajes que no eligió ninguna persona cuando alcanzan.
- Sin botón «Cambiar personaje» dentro del iframe (ver design.md §4).

## Capabilities

### New Capabilities

_Ninguna._

### Modified Capabilities

- `juegos`: requisito nuevo «Personaje en las salas de Karts y Axo».

## Impact

- Superficies: `juegos.html` (Partidas: carga `juegos/personajes.js`), `juegos/app/arcade.js`, `juegos/app/salas.js`,
  `juegos/app/arranque.js`, `juegos/app/juegos.css`, `juegos/karts.html`, `juegos/plataformas.html`; servidor Deno
  (`server/salas.ts`, `server/personajes.ts` nuevo).
- Matriz de acceso: el personaje es un dato de juego del asiento (un id de 8 posibles, sin datos personales). Lo ve
  quien ya ve la sala (mismas reglas de `GET /juegos/sala/<código>`); solo su dueño lo cambia (el servidor usa el
  jugador de la sesión).
- No se escribe en tablas `stald_`. Sin acciones externas.
