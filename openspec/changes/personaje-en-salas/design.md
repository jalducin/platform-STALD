## Context

- Salas de Arcade (`juegos-plataformas-karts`): al empezar, `pintarArcadeSala` (juegos/app/arcade.js) abre el iframe
  y le manda `{ tipo: 'inicio', modo: 'sala', mapa, seed, inicioEn, bots, yo, humanos, vivo }`. El inicio de la sala
  es a los 3 s de tocar «Empezar»: el iframe se abre ya con la cuenta regresiva corriendo.
- Personajes (`personajes-xalli`, `personajes-estilo-karts`): `juegos/personajes.js` es la fuente única de los 8
  (`Personajes.LISTA`, `normalizar`, `preferencia`, `retrato`). Script clásico sin DOM al cargar (solo `retrato` usa
  `document`), ya probado en Deno (`server/personajes_test.ts`).
- Karts en vivo (`juegos-en-vivo`): cada kart manda `[…, personaje]` por el canal; antes del primer mensaje el kart
  remoto se dibujaba con un personaje provisional (`perOtros[n]`).
- Patrón del asiento: la táctica de Fútbol en línea (`futbol-en-linea`) se guarda con `POST /unirse { tactica }`
  (también para quien ya está dentro), solo en su juego y antes de empezar (409 `ya_empezo`).

## Goals / Non-Goals

- Meta: elegir cualquiera de los 8 personajes en una sala de Karts o Axo, verlo en la sala de espera junto al nombre
  de cada quien y correr con él; en Karts en vivo, que cada quien vea a los demás con su personaje desde la salida.
- Fuera: cambiar el personaje con la carrera empezada; personajes para los bots en Axo (en Axo los bots son solo
  tiempos, no se dibujan).

## Decisions

### 1. Servidor: misma lista que la página, sin copiarla
- `server/personajes.ts` importa `../juegos/personajes.js` (efecto: `globalThis.Personajes`) y exporta
  `PERSONAJES_IDS` y `esPersonaje(id)`. Así no hay una segunda lista que mantener: Deno Deploy ya sirve archivos de
  `juegos/` al servidor (`server/salas_grandes.ts` importa `juegos/datos/ingles.json`).
- Alternativa descartada: copiar los 8 ids en el servidor con una prueba que compare (duplicación).
- `POST /juegos/sala/<código>/unirse { personaje }` (como `{ tactica }`):
  - sala que no es `karts` ni `plataformas` o id que no está en la lista → 400 `personaje_invalido`;
  - sala ya empezada → 409 `ya_empezo`;
  - quien no está dentro entra con ese personaje (si hay lugar; si no, 409 `sala_llena`), igual que con la táctica;
  - se guarda en el asiento (`personaje`), se publica la sala por Realtime y responde `{ ok, codigo, personaje }`.

### 2. Sala de espera
- `tarjetaPersonaje()` en arcade.js (llamada desde `pintarEspera`): título «🏁 Tu piloto» (Karts) o «🦎 Tu
  personaje» (Axo), cuadrícula `repeat(4, minmax(0, 1fr))` con botones `data-p="personaje"` (retrato de
  `Personajes.retrato(id, 'quieto')` de 40–48 px, nombre recortado con elipsis y, en Karts, el peso
  `🪶 Ligero / ⚖️ Medio / 🪨 Pesado`). `aria-pressed` marca el elegido.
- Preselección: el personaje del asiento; si no tiene, `Personajes.preferencia()` (localStorage, o Xalli).
- Sincronía automática: al entrar a la espera, si el asiento no tiene personaje, la página guarda una vez el de
  `localStorage` (así los demás ven el de cada quien aunque nadie toque la tarjeta y el iframe recibe el de todos).
- Al tocar uno: `Personajes.preferencia(id)` (localStorage compartido con el modo individual), marca inmediata y
  `POST /unirse { personaje }`; luego `traerSala()` y se vuelve a pintar. Si falla, mensaje en la tarjeta.
- Lista de jugadores: junto al nombre, `<small class="p-pers">` con el retrato chico (22 px) y el nombre del
  personaje. La clave de la vista de espera incluye el personaje de cada quien para que se repinte al cambiar.
- `juegos.html` carga `juegos/personajes.js?v=3` (el mismo archivo y versión que los iframes, comparte caché).

### 3. Inicio de la carrera
- `inicio` lleva `personaje` (el del asiento propio o, si falta, la preferencia) y `humanos[].personaje` (el del
  asiento de cada persona, `null` si no tiene).
- Karts `empezarSala`: `personaje = válido(d.personaje) ? d.personaje : Personajes.preferencia()` (que ya cae en
  Xalli). `humanosDeSala` conserva `personaje` solo si es un id válido.
- Karts `prepararCarrera`: los karts remotos arrancan con `h.personaje` (si falta, uno libre); los fantasmas toman
  personajes «libres» (los 8 menos el tuyo y los de las personas), y si no alcanzan, los de siempre (`perOtros`).
  El mensaje en vivo sigue mandando el personaje (`d[8]`): si alguien llega con otro, manda el del mensaje.
- Axo `empezarSala`: igual que Karts para `personaje` antes de `iniciarNivel`.
- Nada se escribe en `localStorage` desde el iframe en modo sala (lo hace la página al elegir).

### 4. Sin «Cambiar personaje» dentro del iframe (decisión)
El iframe se abre cuando la sala ya empezó (cuenta regresiva de 3 s) y el servidor rechaza cambios después del
inicio (409 `ya_empezo`). Un botón ahí solo cambiaría el dibujo local, los demás verían otro personaje y la cuenta
regresiva no da tiempo. La sala de espera, que sí tiene espera, es el lugar.

## Risks / Trade-offs

- [Importar un script del navegador en el servidor] → no toca el DOM al cargar y ya se prueba en Deno; la prueba
  nueva comprueba que `PERSONAJES_IDS` es exactamente `Personajes.LISTA`.
- [Una petición más por persona al entrar a la espera] → solo si su asiento no tiene personaje (una vez).
- [Salas viejas sin `personaje`] → todo cae en `localStorage` y luego Xalli, como antes.

## Migration Plan

Merge a `main` (Pages + Deno Deploy). Verificar en producción que `/salud` responde y que `POST /unirse
{ personaje: 'x' }` sobre un código inexistente responde como antes (sin sala no se valida). Reversa: revertir el
merge.
