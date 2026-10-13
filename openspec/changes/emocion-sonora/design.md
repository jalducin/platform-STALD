## Context

- `juegos/app/musica.js`: música de fondo del hub (WebAudio, estilos Alegre/Relajante/Fiesta, volumen bajo/medio en
  `localStorage.juegos_pref`) y `bajarMusica(ms)`, que ya baja la música mientras habla la voz.
- `juegos/app/nucleo.js`: `tono()`, `sonidoOk()`, `sonidoMal()` y `hablar()` del hub (sin silencio propio) y
  `limpiar()`, que corre al salir de cualquier juego.
- Arcade (iframes del mismo origen): cada página tiene su `AudioContext` y su `master`. Futbolito, Billar y Golf usan
  `mesa-ui.js` (`U.tono`, `U.botonSonido`); Karts y Axo tienen su `S = {…}`. Todos guardan el botón 🔊 en
  `localStorage.arcade_sonido` (`'0'` = silencio), así que **el silencio ya viaja entre el hub y los iframes por el
  almacenamiento compartido del mismo origen**. Dragon Run tiene su propio 🔊 sin guardar (`muted`).
- Las E2E abren los juegos de Arcade sueltos con `?prueba=1` (ganchos `window.__futbolito`, `__golf`, `__karts`…).
- `tests/e2e/e2e-peticiones.js` solo cuenta peticiones al API (un estático más no suma).

## Goals / Non-Goals

**Goals:** un módulo único y sin dependencias que cualquier juego (hub o iframe) use con una línea; sonidos
sintetizados agradables y no cansados; silencio, volumen y autoplay respetados; fallar en silencio sin
`AudioContext`; un gancho de pruebas para verificar qué pidió cada juego y cuándo.

**Non-Goals:** música nueva por juego, archivos de audio, controles nuevos fuera del menú de música, cambiar
controles o física (en particular de Futbolito, sprint 24a), mezclar el audio de los iframes con el del hub en un
solo grafo.

## Decisions

### 1. Un script clásico `juegos/emocion.js` con `window.Emocion`
Mismo patrón que `juegos/mando.js`: IIFE sobre `window`/`globalThis`, importable por Deno para las pruebas. Cada
stinger es una **receta** `(ctx, salida, t, args) → duración` en `Emocion.RECETAS`, que sirve igual para el
`AudioContext` en vivo y para un `OfflineAudioContext` (muestras WAV y su medición). `Emocion.renderizar(nombre,
ctx)` arma la misma cadena (ganancia + limitador) para renderizar.
*Alternativas:* módulo ES (descartado: el hub y los iframes cargan scripts clásicos sin build); reutilizar el
`AudioContext` de cada juego (descartado: obligaría a tocar el audio de cada página; un segundo contexto por página
es barato y aísla el limitador).

### 2. Síntesis (sin derechos de autor)
- **Tribuna** (`gol`): dos ruidos blancos filtrados (banda en 1.1 kHz con oleaje por LFO, y pasa bajos en 450 Hz)
  que suben en 0.35 s y se desvanecen en 1.2 s; encima, una **fanfarria** de «metales» (dos sierras desafinadas con
  filtro que se abre) Do-Mi-Sol y el acorde Do mayor. «¡Goool!» con la voz del navegador (`hablar` del hub o
  `speechSynthesis` es-MX en el iframe; `gol({ voz: false })` la apaga).
- **Suspenso**: redoble de golpes de ruido cada vez más seguidos (9 → 28 por segundo) y fuertes, con un timbal
  grave que crece. **Revelación**: golpe grave, platillo y acorde.
- **Derrota amable**: tres notas suaves que bajan y resuelven en un acorde **mayor** (sin zumbidos ni tonos graves
  ásperos).
- **Racha(n)**: dos notas que suben medio tono por acierto (tope en 12). **Últimos segundos**: «tic» que sube y un
  latido grave por segundo. **Silbato**: corto-corto-largo a 2.9 kHz con vibrato. **Campana**: parciales
  inarmónicos. Todo en Do mayor para que encaje con la música del hub (I–V–vi–IV en Do).
- Un `DynamicsCompressor` (umbral −10 dB, 12:1) al final: nada satura aunque se junten varios sonidos.

### 3. Capa de tensión `intensidad(0..1)`
Un programador (`setInterval` de 100 ms con 0.3 s de anticipación, como `musica.js`) toca un latido «pum-pum» a
70 + 90·x lpm; con x > 0.45 suma un platillo a contratiempo y con x > 0.75 una cuerda grave. Va por su propio bus
(`busTension`), que se apaga con `intensidad(0)`, `calma()`, el silencio, la pestaña oculta o **60 s sin otra
llamada** (seguro contra un juego que olvide apagarla). Solo se anota en el registro cuando cambia ≥ 0.05, prende o
apaga (los juegos pueden llamarla en cada cuadro).

### 4. Ducking (bajar la música)
Los stingers grandes (gol, victoria, derrota, récord, nivel, logro, cuenta regresiva, suspenso, revelación, silbato,
campana, revancha y podio) bajan el bus de tensión y llaman a `bajarMusica(ms)` del hub: en la misma página si
existe, o en `window.parent` si es un iframe del mismo origen (en `try`). Los chicos (acierto, error, racha, cuenta,
canto, últimos segundos) no bajan nada. `Emocion._probar({ agachar })` permite verificarlo.

### 5. Silencio, volumen y autoplay
- `silenciado()` = silencio de la página (`Emocion.silencio(true)`, para el 🔊 de Dragon Run) **o**
  `localStorage.arcade_sonido === '0'` (🔊 de Arcade, compartido hub ↔ iframes) **o**
  `localStorage.juegos_emocion === '0'` (nuevo «🎉 Efectos de emoción: Sí / No» en el menú de música del hub). Se
  lee en cada llamada, así que un cambio en el hub vale de inmediato en el iframe; además, el evento `storage`
  (que el navegador manda a las demás páginas del mismo origen) llama a `calma()` al silenciar.
- Volumen: `juegos_pref.volumen` (`medio` → 0.85, si no 0.6), el mismo selector de la música.
- Autoplay: solo suena tras un gesto (`navigator.userActivation.hasBeenActive` o un `pointerdown`/`keydown`/
  `touchend` visto); el `AudioContext` se crea hasta el primer stinger permitido y se reanuda si está suspendido.
- Sin `AudioContext` (o si falla al crearse) no hay errores: el evento se anota con motivo `sin-audio`.
- `prefers-reduced-motion` no aplica al audio; la moderación viene de la **espera mínima por stinger** (p. ej. gol
  1.5 s, podio 4 s, racha 120 ms): lo repetido se anota como `repetido` y no suena.
- Con «Efectos de emoción: No», donde el stinger sustituye a un jingle del juego, **vuelve el sonido clásico**
  (patrón `if (!window.Emocion?.x()) jingleViejo()`): el stinger devuelve `true` solo si sonó.

### 6. Gancho de pruebas
`Emocion.eventos()` devuelve los últimos 200 `{ ev, t, sono, motivo, args }` y cada llamada emite el evento DOM
`emocion`. `Emocion.estado()` da `intensidad`, `tensionActiva` y `agachados`. `_probar()` y `_reiniciar()` son solo
para pruebas (inyectan `AudioContext`, almacenamiento, gesto y ducking).

### 7. Dónde se aplica (y por qué)
Criterio: solo momentos que cambian el estado de ánimo (anotar, ganar, perder, el último tramo, la revelación), nunca
acciones repetitivas (cada patada, cada moneda). Llamadas con `window.Emocion?.` para no depender del orden de carga.

| Juego | Momento | Emoción |
|---|---|---|
| Futbolito (individual y sala) | gol propio / del rival | `gol()` (sustituye el arpegio; sin emoción vuelve) / `error()` |
| | marcador a un gol de la meta y diferencia ≤ 1 | `intensidad(0.6)`, `0.8` si van empatados; si no, `0` |
| | fin del partido | `intensidad(0)`, `silbato()` y luego `victoria()` o `derrota()` |
| Billar | tirar cuando te toca la 8 (tú o el bot) | `suspenso()` + `intensidad(0.7)` mientras rueda |
| | meter bolas tuyas seguidas | `racha(n)`; primera `acierto()` |
| | fin | `intensidad(0)`, `revelacion()`, luego `victoria()`/`derrota()` |
| Golf | hoyo en uno / birdie o mejor / par | `victoria()` / `logro()` / `acierto()` |
| | al agua | `error()` |
| | último hoyo del recorrido | `campana()` + `intensidad(0.35)` |
| | tarjeta final | `intensidad(0)` y `victoria()` (≥ 18 ⭐) o `nivelSuperado()` |
| Karts | 3-2-1-¡YA! | `cuenta(n)` y `cuenta(0)` (sustituyen los bips) |
| | última vuelta | `campana()` + `intensidad(0.5)` |
| | rebasar al 1.er lugar | `logro()` (espera mínima: no se repite) |
| | meta / resultados | `intensidad(0)` / `podio(lugar)` |
| Axo | jefe | `intensidad(0.6)`; al vencerlo `intensidad(0)` + `logro()` |
| | últimos 5 s del reloj | `ultimoSegundos(5)` |
| | nivel superado (récord de tiempo) | `nivelSuperado()` (sustituye `S.meta`) y `record()` si mejoró su tiempo |
| Dragon Run | 🔊 propio | `Emocion.silencio(muted)` |
| | misión cumplida / tramo final (≥ 500 m) | `logro()` / `intensidad(0.5)` |
| | castillo / choque | `victoria()` / `record()` si fue récord, si no `derrota()` (sustituyen jingles) |
| Lotería y Bingo | cada carta o número cantado | `canto()` |
| | «¡Lotería!» / «¡Bingo!» válido | `logro()` (sustituye `sonidoOk`) |
| | te falta un número (Bingo individual) | `intensidad(0.5)` |
| Basta por rondas | últimos 5 s de escritura / fin de la ronda | `ultimoSegundos()` / `revelacion()` |
| Quiz, trivia, Inglés, Cultura, Mente (marco común) | últimos 5 s de un reloj de ≥ 10 s | `ultimoSegundos()`; al detenerse, `calma()` |
| | racha de 3 o más | `racha(n)` (sustituye `sonidoOk`) |
| | resultado final | `record()` si hay récord personal; si no `revelacion()` |
| Partidas (todas) | podio | `podio(lugar)` + el 1.er lugar aparece tras 1.4 s (sin animación con movimiento reducido) |
| | alguien abrió la revancha | `revancha()` |
| Póker | vas con todo | `suspenso()` + `intensidad(0.6)`; al final `victoria()`/`derrota()` |
| | ganas una mano sin ir con todo | `logro()` (sustituye `sonidoOk`) |
| Blackjack | blackjack natural (21 con 2 cartas) | `logro()` |
| ¡Una! | gritar «¡UNA!» | `logro()` (sustituye `sonidoOk`) |
| Cualquier juego | salir (`limpiar()`) | `calma()` |

Futbolito: los cambios son líneas aisladas marcadas `// emocion-sonora` en `sonar()`, `anotar()`, la parte de goles
de `pasoSala()` y los finales; no se tocan controles, entrada ni física. (El sprint 24a de controles se canceló y
Futbolito se reemplazará por un juego de fútbol nuevo en el sprint 26: ese juego debe volver a usar `gol()`,
`intensidad()`, `silbato()` y `victoria()`/`derrota()` en los mismos momentos.)

## Risks / Trade-offs

- **Cansancio** → stingers cortos (≤ 2.7 s salvo podio y suspenso), espera mínima por stinger, tensión con tope de
  60 s y el interruptor «Efectos de emoción».
- **Dos `AudioContext` por iframe** (el del juego y el de emoción) → costo bajo; Chrome ya no limita su número.
- **La voz «¡Goool!» corta otra voz** del hub → solo se usa en Futbolito (iframe sin otras voces).
- **Pruebas en headless**: el audio real no se escucha; se verifica por el registro de eventos y por las muestras
  WAV renderizadas con `OfflineAudioContext` (duración, pico < 1 y RMS > 0).
