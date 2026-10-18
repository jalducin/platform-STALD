## Why

El profe pidió: «cuando alguien no alcance a entrar a una partida pueda espectar». Hoy, si la sala está llena
(`sala_llena`) o ya empezó (`ya_empezo`), la persona solo ve un error y se queda fuera. Los alumnos y las alumnas que
llegan tarde al Meet quieren ver la partida de sus compañeros y compañeras, y unirse a la revancha si hay lugar.

## What Changes

- **Entrar como espectador:** al intentar unirse a una sala llena o empezada, en lugar del error solo se ve «La
  partida está llena / ya empezó» con el botón **«👀 Ver como espectador»**. También se puede espectar desde el
  principio: botón «👀 Solo ver» junto a «Unirme» en 🔑 Unirme con código, y el enlace `?sala=XXXX&ver=1`.
- **Servidor:**
  - `POST /juegos/sala/<código>/espectar` registra a una persona registrada como espectadora (y `{ salir: true }` la
    quita); `GET /juegos/sala/<código>` le responde la **vista de espectador** (`espectador: true`).
  - Quien especta **no ocupa asiento**, no cuenta para MESAS, ni para empezar, ni para el podio ni el ranking; no puede
    jugar (403 `no_en_sala` en `/respuesta`, como hoy). Cupo de **30 espectadores** por sala; «👀 N viendo» para todos.
  - **Privacidad de la información oculta:** la vista de espectador es la **vista pública de la mesa**, la misma que
    ya publica el canal de la sala: sin flotas de Batalla naval, sin elecciones de Piedra-papel-tijera antes de
    revelarse, sin la palabra de Dibuja (solo letras y las ya reveladas), y nunca el canal secreto salvo en juegos en
    vivo. El admin, que ya podía ver salas, usa la misma vista.
- **Juegos en vivo (solo escucha):** solo en Karts, Fútbol en línea, Futbolito Arena y Brigada Xalli (con
  un gancho para juegos en vivo nuevos) el espectador recibe el topic de la sala; se conecta en modo **solo escucha** (`EnVivo` con `escucha: true`
  no envía nada, ni latidos) y los demás ignoran cualquier mensaje suyo porque no está en `participantes`.
  - Karts: cámara que sigue al líder o a quien elijas (◀ ▶), minimapa y clasificación en vivo.
  - Fútbol y Arena: la cancha completa con el marcador, interpolando las fotos del anfitrión.
  - Brigada Xalli: la misión con la cámara compartida del anfitrión y el equipo en el HUD.
- **Interfaz del espectador:** distintivo «👀 Espectador», sin controles del juego, sonido del juego con botón para
  silenciar, el podio al final y «🔁 Unirme a la revancha» si hay lugar. Funciona con sondeo si no hay Realtime.

## Capabilities

### New Capabilities
<!-- ninguna -->

### Modified Capabilities
- `juegos`: modo espectador en las partidas (entrada, vista pública sin secretos, juegos en vivo en solo escucha,
  interfaz y revancha).

## Impact

- **Superficies:** servidor Deno (`server/salas.ts`, cambios marcados `// espectador`), `juegos.html` (solo `?v=`),
  `juegos/app/salas.js`, `salas-mesa.js`, `arcade.js`, `arranque.js`, `nucleo.js`, `juegos/app/juegos.css`,
  `juegos/app/naipes.js` (Conquián visto por espectador), `juegos/en-vivo.js` (modo solo escucha), `juegos/karts.html`,
  `juegos/futbol.html`, `juegos/futbolito-arena.html`, `juegos/brigada.html`, `juegos/brigada-red.js` y
  `juegos/app/brigada-sala.js` (modo espectador del iframe). No toca `index.html`,
  `ingles.html`, `secundaria.html`, Postgres `stald_*`, `supabase/`, Notion ni `.env`.
- **Datos:** un archivo por espectador en el repo de datos, `juegos/salas/<código>/espectadores/<id>.json` con
  `{ id, t }` (id opaco y hora; sin nombre ni correo). Vence con la sala (3 h).
- **Matriz de acceso:**

  | Quién | Ve la sala | Recibe el topic | Juega / ranking |
  |---|---|---|---|
  | Jugador o jugadora (dentro) | su vista (su mano, su flota, su elección) | sí | sí |
  | Espectador registrado | vista pública de la mesa | solo en juegos en vivo | no (403) |
  | Admin | vista pública de la mesa | solo en juegos en vivo | no |
  | Persona registrada sin espectar | no (403 `no_en_sala`) | no | no |
  | Sin cuenta de Juegos o sin sesión | no (rechazo de acceso de siempre) | no | no |

  Se verifica con `server/espectador_test.ts` (tabla de juegos con secretos) y la E2E `tests/e2e/e2e-espectador.js`.
- **Coordinación:** sprint 38 (pistas de Karts, `karts-pistas.js`) y sprint 39 (Brigada Xalli, `server/salas.ts`,
  `juegos/mesas.js`, `juegos/app/*.js`). Cambios marcados `// espectador`. Brigada Xalli llegó a `main` durante el
  cambio: se mezcló `origin/main` y quedó conectada (`ESPECTADOR_EN_VIVO` en el servidor y `ESPECTAR_EN_VIVO` en la
  página, el gancho para juegos en vivo nuevos).
- **Acciones externas:** ninguna (Pages y Deno Deploy publican con el merge a `main`).
