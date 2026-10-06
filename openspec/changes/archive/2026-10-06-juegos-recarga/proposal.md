## Por qué
Comentario de jugadores: «Juegos: si se refresca el navegador se pierde la partida. Mejor manejo de caché.»

Diagnóstico (verificado en el código):
- **Partidas (salas).** Al crear o unirse a una sala, `juegos.html` no deja el código en la URL. Al recargar,
  la página vuelve al inicio de Juegos aunque la sala siga viva en el servidor (`juegos/salas/<código>/`). El
  servidor ya permite volver: `POST /juegos/sala/<código>/unirse` de alguien que ya está dentro responde
  `{ ok: true }` sin duplicarlo, incluso si la partida ya empezó o está llena; sus respuestas y jugadas viven en
  el servidor. Lo que falta es que la página sepa a qué sala regresar.
- **Juegos individuales.** El estado vive solo en memoria (closures de cada juego): recargar lo pierde todo.
- **Celular.** Arrastrar hacia abajo en medio de una partida dispara el «jalar para recargar» del navegador.

## Qué cambia
- **Volver a la sala al recargar.** Al entrar a una sala, la URL queda como `juegos.html?sala=CÓDIGO` (con
  `history.replaceState`, conservando `?api=` y los demás parámetros) y se guarda la sala activa en
  `localStorage.juegos_sala_activa` con su hora y el id del jugador. Al cargar, la página reconecta sola: por la
  URL (flujo de `unirseCodigo`) o, si la URL ya no trae el código, por la clave guardada (menos de 3 h y del mismo
  jugador). Al salir de la sala o al terminar la partida se limpian la URL y la clave.
- **Basta por rondas tras recargar.** Las rondas que el jugador ya envió (según el servidor) no se vuelven a
  enviar vacías.
- **Lotería en sala.** Las casillas marcadas se guardan en la misma clave de la sala y se recuperan al recargar.
- **Reanudar juegos individuales.** Los juegos de preguntas (Vocabulario contra reloj, Completa y responde,
  Ortografía, Maratón de cultura, Cálculo y secuencias) y el Sudoku guardan una instantánea en
  `localStorage.juegos_partida_individual`. Al volver se pregunta «¿Continuar tu partida de X?».
- **Aviso al salir.** Los demás juegos individuales piden confirmación (`beforeunload`) si hay una partida en
  curso.
- **Sin «jalar para recargar»** durante una partida: `overscroll-behavior-y: contain`.
- Los puntos de una partida cuentan **una sola vez**. La instantánea se borra antes del `POST /juegos/partida`, y
  en salas el servidor ya rechaza el segundo registro (`ya_guardada`).

## Superficies
- `juegos.html`; `comun/auth.js` (cerrar sesión borra las claves de Juegos), con `?v=2` en `index.html`,
  `ingles.html`, `juegos.html` y `secundaria.html`.
- Servidor Deno: **sin cambios de código**. Se agrega una prueba unitaria en `server/salas_test.ts` que fija el
  comportamiento de volver a unirse del que depende este cambio.
- Pruebas E2E: nueva `tests/e2e/e2e-juegos-recarga.js`, registrada en `correr.sh` (fase `base`).
- Documentación: `docs/frontend-standards.md`.
- Sin cambios en Postgres, Realtime, Auth, repo de datos ni Notion.

## Matriz de acceso
No cambia quién ve qué. La clave de la sala solo guarda el código, la hora y el id opaco del jugador (`a-…`,
`i-<hash>`), nunca el correo. La instantánea individual guarda puntos y estado del tablero, sin datos personales.
Reconectar usa las mismas rutas con sesión: `GET /juegos/sala/<código>` sigue respondiendo 403 a quien no está
en la sala.

## Acciones externas
Ninguna. Se publica con el merge a `main` (Pages); el usuario integra.
