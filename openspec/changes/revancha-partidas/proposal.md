## Por qué
Al terminar una partida multijugador (sala), los alumnos y alumnas quieren seguir jugando **con las mismas
personas**. Hoy cada quien tiene que volver a 👥 Partidas, alguien crea otra sala y comparte el código otra vez.
Se pierde tiempo y se pierden jugadores en el camino.

## Qué cambia
- **«🔁 Otra con los mismos» en el podio.** El podio de todas las partidas (preguntas, Basta, Lotería, ¡Una!,
  póker, Brisca, Conquián y ajedrez comparten `pintarFinalSala`) muestra el botón. Cualquiera de los que jugaron
  lo puede tocar. El primero que lo toca abre la sala nueva: mismo juego, mismas opciones (rondas, categoría,
  modo, reloj, equipos), mismos bots y con esa persona como anfitriona. Es idempotente: si varias personas lo tocan
  a la vez, todas caen en la misma sala nueva.
- **Ruta nueva `POST /juegos/sala/<código>/revancha`** (`server/salas.ts`). Solo para jugadores de esa sala y solo
  si la partida ya terminó. La sala vieja guarda `siguiente` (código nuevo) y `siguienteHost` (id opaco de quien la
  abrió) con escritura condicional (sha), así solo se crea una sala nueva. Une a quien la pidió y publica el
  cambio en Realtime.
- **Aviso para los demás.** El podio sigue consultando la sala (cada 5 s, o el respaldo de 30 s con Realtime)
  hasta 15 min o hasta ver `siguiente`. Al verlo muestra «🔁 {Nombre} abrió la revancha» con el botón «Unirme»:
  un toque y entra.
- **Recarga.** Al terminar se sigue limpiando la sala guardada (requisito de `juegos-recarga`), pero se guarda una
  marca corta `juegos_revancha = { codigo, quien, t }` (15 min). Si alguien recarga en el podio, el inicio de
  Juegos le ofrece la revancha («Otra con los mismos» o «{Nombre} abrió la revancha · Unirme»).

## Superficies
- Servidor Deno: `server/salas.ts` (ruta nueva y dos campos de la sala) y `server/salas_test.ts`.
- `juegos.html`: botón y aviso en el podio, sondeo del podio, aviso al recargar.
- `comun/auth.js`: cerrar sesión también borra `juegos_revancha`; `auth.js?v=7` en `index.html`, `ingles.html`,
  `juegos.html` y `secundaria.html`.
- Pruebas E2E: nueva `tests/e2e/e2e-revancha.js`, registrada en `correr.sh` (fase `base`).
- Documentación: `docs/backend-standards.md` (ruta nueva) y `docs/frontend-standards.md` (clave y sondeo del podio).
- Sin cambios en Postgres, Auth, repo de datos (fuera de los archivos de sala de siempre) ni Notion. Realtime se usa
  igual que hoy (se publica el estado de las dos salas).

## Matriz de acceso
| Quién | `POST …/revancha` | Ve `siguiente` |
|---|---|---|
| Jugador o jugadora de la sala, partida terminada | 200, entra a la sala nueva | Sí (GET de la sala vieja) |
| Jugador o jugadora de la sala, partida sin terminar | 409 `no_termino` | — |
| Persona registrada que no está en la sala | 403 `no_en_sala` | No (el GET ya responde 403) |
| Sin registro | 403 (como el resto de Juegos) | No |
| Sala inexistente o vencida (3 h) | 404 / 410 | — |

`siguienteHost` es el id opaco del jugador (`a-…`, `i-<hash>`), nunca el correo. La marca `juegos_revancha` solo
guarda código, hora e id opaco, y vale solo para el mismo jugador. Se verifica con `server/salas_test.ts` y la E2E.

## Acciones externas
Ninguna. Se publica con el merge a `main` (Deno Deploy y Pages); el usuario integra.
