## Why

El profe pidió: «música de emoción de gool, igual juegos que aplique emoción y suspenso etc.». Hoy cada juego hace
sus propios pitidos con WebAudio (un arpegio corto al anotar, al llegar a la meta o al acertar), pero ningún momento
grande —un gol, la última vuelta, el 8 en el billar, el podio de una partida— tiene el «¡aaah!» de la tribuna, el
redoble antes de revelar al ganador ni la tensión de los últimos segundos. Tampoco hay una forma común de hacerlo:
cada juego tendría que inventar su sonido.

## What Changes

- **Módulo compartido `juegos/emocion.js`** (script clásico, sin build, sin archivos de audio): `window.Emocion` con
  stingers sintetizados con WebAudio —`gol()` (tribuna con ruido filtrado + fanfarria + «¡Goool!» con la voz del
  navegador), `victoria()`, `derrota()` (amable), `record()`, `nivelSuperado()`, `logro()`, `cuentaRegresiva(n)`,
  `cuenta(k)`, `ultimoSegundos(n)`, `suspenso(ms)`, `revelacion()`, `acierto()`, `error()`, `racha(n)`, `silbato()`,
  `campana()`, `canto()`, `revancha()` y `podio(lugar)`— y una **capa de tensión** dinámica `intensidad(0..1)`
  (latido que se acelera) con `calma()`. Los stingers grandes bajan la música de fondo del hub un momento (ducking),
  también desde los iframes de Arcade. Un limitador evita la saturación.
- **Respeta el silencio y el volumen existentes:** el botón 🔊 de Arcade (`localStorage.arcade_sonido`, compartido por
  el hub y los iframes del mismo origen), el volumen de la música (`juegos_pref.volumen`) y un interruptor nuevo
  **«🎉 Efectos de emoción: Sí / No»** en el menú de música del hub (`localStorage.juegos_emocion`). Solo suena tras un
  gesto (política de reproducción automática) y sin `AudioContext` no hace nada ni lanza errores.
- **Dónde se aplica** (detalle y justificación en `design.md`): Futbolito, Billar, Golf, Karts, Axo, Dragon Run,
  Lotería, Bingo, Basta por rondas, quiz/trivia/Inglés/Cultura/Mente (marco común), podio y revancha de todas las
  partidas, Póker, Blackjack y ¡Una!. Donde un juego ya tenía un jingle para el mismo momento, el stinger lo
  sustituye; con «Efectos de emoción: No» vuelve el sonido clásico.
- **Futbolito:** solo se agregan llamadas de audio aisladas y marcadas `// emocion-sonora`; no se tocan controles ni
  física (los cambia el sprint 24a en paralelo).
- **Gancho de pruebas:** `Emocion.eventos()` registra cada evento pedido, si sonó y por qué no (silencio, sin gesto,
  repetido, sin audio), y emite el evento DOM `emocion`.
- **Pruebas:** unitarias de Deno (`server/emocion_test.ts`, con un AudioContext falso) y E2E nueva
  `tests/e2e/e2e-emocion.js` (eventos en cada juego, silencio, sin AudioContext, autoplay bloqueado y muestras WAV
  renderizadas con OfflineAudioContext, medidas sin saturación ni silencio).

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `juegos`: emoción sonora en los juegos (módulo, silencio, tensión, ducking y su uso en cada juego) y el
  interruptor «Efectos de emoción» en el menú de música.

## Impact

- **Superficies:** `juegos.html` (carga `juegos/emocion.js`), `juegos/app/*.js` (marco común, salas, podio, menú de
  música, naipes), `juegos/bingo.js`, `juegos/blackjack.js`, las páginas de Arcade (`futbolito.html`, `billar.html`,
  `golf.html`, `karts.html`, `plataformas.html`, `dragon-run.html`), `juegos/app/juegos.css` (suspenso visual del 1.º
  lugar del podio, sin animación con movimiento reducido).
- **Sin cambios** en el servidor Deno, Postgres/Realtime/Auth de Supabase, el repo de datos ni Notion. No agrega
  peticiones al API (solo un archivo estático más).
- **Acciones externas:** ninguna. La prueba de oído del profe queda pendiente antes de archivar.
