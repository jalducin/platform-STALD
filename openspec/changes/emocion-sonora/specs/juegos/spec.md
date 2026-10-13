## ADDED Requirements

### Requirement: Emoción sonora compartida
Juegos SHALL tener un módulo común `juegos/emocion.js` (script clásico, sin build ni archivos de audio) que publique
`window.Emocion` en `juegos.html` y en las páginas de Arcade, con stingers sintetizados con WebAudio: `gol()`
(tribuna de ruido filtrado + fanfarria + «¡Goool!» con la voz del navegador), `victoria()`, `derrota()` (amable, que
resuelve en acorde mayor), `record()`, `nivelSuperado()`, `logro()`, `cuentaRegresiva(n)` y `cuenta(k)` (3-2-1-¡YA!),
`ultimoSegundos(n)`, `suspenso(ms)`, `revelacion()`, `acierto()`, `error()`, `racha(n)` (sube de tono con cada
acierto, con tope), `silbato()`, `campana()`, `canto()`, `revancha()` y `podio(lugar)`. SHALL ofrecer una capa de
tensión `intensidad(0..1)` (latido más rápido y fuerte con más intensidad; 0 la apaga) y `calma()`, que apaga la
tensión y desvanece lo que suena. Los stingers grandes SHALL bajar un momento la música de fondo del hub, también
desde un iframe de Arcade. Un limitador SHALL evitar la saturación. Cada stinger SHALL tener una espera mínima: si se
repite antes, no suena.

#### Scenario: Gol con tribuna
- **WHEN** un juego llama `Emocion.gol()` después de un toque de quien juega y con el sonido encendido
- **THEN** suena la tribuna con la fanfarria y la voz dice «¡Goool!», y la música de fondo baja mientras tanto

#### Scenario: Cuenta regresiva
- **WHEN** un juego llama `Emocion.cuentaRegresiva(3)`
- **THEN** suenan tres bips a un segundo de distancia y un «¡YA!» más agudo al cuarto segundo

#### Scenario: Tensión que sube y baja
- **WHEN** un juego llama `Emocion.intensidad(0.8)` y después `Emocion.intensidad(0)`
- **THEN** suena un latido que se apaga con la segunda llamada; sin otra llamada en 60 s se apaga solo

#### Scenario: Muestras sin saturación ni silencio
- **WHEN** cada stinger se renderiza con `OfflineAudioContext`
- **THEN** dura lo esperado, su pico es menor que 1 y no es silencio

### Requirement: Emoción sonora respeta el silencio, el volumen y la reproducción automática
`Emocion` SHALL NOT sonar si `localStorage.arcade_sonido` es `'0'` (botón 🔊 de Arcade, compartido entre el hub y los
iframes del mismo origen), si `localStorage.juegos_emocion` es `'0'` o si la página se silenció con
`Emocion.silencio(true)`; al silenciarse desde otra página SHALL callar de inmediato. SHALL usar el volumen de la
música (`juegos_pref.volumen`). SHALL sonar solo después de un gesto de quien juega y, sin `AudioContext` o si no se
puede crear, SHALL NOT lanzar errores. Cada llamada SHALL quedar anotada en `Emocion.eventos()` con si sonó y, si no,
por qué (`silencio`, `sin-gesto`, `repetido`, `sin-audio`).

#### Scenario: Silencio de Arcade
- **WHEN** quien juega apagó el 🔊 en un juego de Arcade y mete un gol en Futbolito
- **THEN** no suena nada y el evento `gol` queda anotado con motivo `silencio`

#### Scenario: Sin AudioContext
- **WHEN** el navegador no tiene `AudioContext` y se juega un partido de Futbolito completo
- **THEN** el juego funciona sin errores y los eventos quedan anotados con motivo `sin-audio`

#### Scenario: Autoplay bloqueado
- **WHEN** un juego pide un stinger antes de cualquier toque o tecla de quien juega
- **THEN** no suena, no hay errores y el evento queda anotado con motivo `sin-gesto`

### Requirement: Momentos de emoción en los juegos
Los juegos SHALL usar `Emocion` en sus momentos de emoción, sin cambiar sus reglas, controles ni física, como lo
detalla el diseño del cambio `emocion-sonora`: Futbolito (gol, partido cerrado al final, silbatazo, victoria y
derrota), Billar (bolas seguidas, suspenso con la 8, final), Golf (hoyo en uno, birdie, agua, último hoyo, tarjeta),
Karts (cuenta regresiva, última vuelta, rebasar al 1.er lugar, podio), Axo (jefe, últimos segundos, nivel y récord),
Dragon Run (misión, tramo final, castillo, récord), Lotería y Bingo (canto y grito válido), Basta por rondas (últimos
segundos y fin de la ronda), el marco común de quiz/trivia/Inglés/Cultura/Mente (últimos segundos, racha y resultado
final), el podio y la revancha de todas las partidas, Póker (ir con todo), Blackjack (blackjack natural) y ¡Una!
(gritar «¡UNA!»). Donde el juego ya tenía un jingle para el mismo momento, el stinger SHALL sustituirlo y, con los
efectos de emoción apagados, SHALL volver el sonido clásico. Al salir de un juego SHALL llamarse `calma()`.

#### Scenario: Gol en Futbolito
- **WHEN** quien juega mete un gol al bot
- **THEN** `Emocion.eventos()` registra `gol` en ese momento

#### Scenario: Partido cerrado y silbatazo
- **WHEN** el marcador llega 4-4 en un partido a 5 y luego alguien anota el quinto
- **THEN** se registra `intensidad` mayor que 0 con el 4-4, y al final `intensidad` 0, `silbato` y `victoria` o `derrota`

#### Scenario: Terminar un hoyo de Golf
- **WHEN** quien juega mete la pelota en un hoyo
- **THEN** se registra el stinger de su resultado (`victoria` en hoyo en uno, `logro` con birdie, `acierto` con par)

#### Scenario: Última vuelta de Karts
- **WHEN** quien juega cruza la meta para empezar la última vuelta
- **THEN** se registran `campana` e `intensidad` mayor que 0

#### Scenario: Final de un quiz
- **WHEN** termina un quiz individual
- **THEN** se registra `record` si hubo récord personal o `revelacion` si no

#### Scenario: Podio de una partida
- **WHEN** termina una partida y aparece el podio
- **THEN** se registra `podio` con el lugar de quien mira, y el 1.er lugar aparece después del redoble (al momento con
  movimiento reducido)

## MODIFIED Requirements

### Requirement: Música de fondo
`juegos.html` SHALL ofrecer música de fondo generada en el navegador, con los estilos Alegre, Relajante y
Fiesta, dos volúmenes y la opción Apagada. SHALL empezar solo tras un gesto del usuario, bajar mientras
suena una voz o un stinger de emoción y recordar la preferencia en el dispositivo. El mismo menú SHALL ofrecer
«🎉 Efectos de emoción: Sí / No» (encendido por omisión), recordado en `localStorage.juegos_emocion`, que vale también
dentro de los juegos de Arcade.

#### Scenario: Elegir estilo
- **WHEN** el jugador elige "😌 Relajante"
- **THEN** suena la música relajante y la preferencia se recuerda al volver

#### Scenario: Apagar
- **WHEN** elige "Apagada"
- **THEN** la música se detiene

#### Scenario: Apagar los efectos de emoción
- **WHEN** elige «Efectos de emoción: No» y luego mete un gol en Futbolito
- **THEN** no suena la tribuna (suena el sonido clásico del gol) y la preferencia se recuerda al volver
