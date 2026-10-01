## Decisiones

### 0. Post-apply: castigo por segundos en UNA
- **Servidor:** `respuesta` acepta `{ una: { paso } }` y guarda `unas[]` `{ paso, t }` (la primera por paso,
  hasta 100). `paso` es el paso de la jugada que dejó una carta.
- **Reproducción:**
  - al aplicar una jugada que deja una carta en `t0`, el reloj de la partida queda en espera hasta
    resolver el UNA;
  - con `d = tUna - t0`: ≤ 2 s 0 cartas; ≤ 3 s 1; ≤ 4 s 2; ≤ 5 s 3; sin UNA con `ahora ≥ t0 + 5 s`, 4
    cartas;
  - el siguiente turno empieza en `min(tUna, t0 + 5 s)`;
  - los bots presionan en `t0 + 0.8..1.8 s`, con `rngDe(seed, 'una' + paso)`;
  - `jugada.una` ya no se usa.
- **Solitario:** misma escala, con la ventana de 5 s contada desde que se tira la penúltima carta.
- Los tiempos se escalan con `__TIEMPO_JUEGOS` en pruebas.


### 1. Estado reconstruido por reproducción (cliente, determinista)
`estadoUna(sala, orden, jugadas, ahora)`:
- **Mazo:** las 108 cartas con `id` 0..107, barajadas con `rngDe(seed, 'una-mazo')`.
- **Reparto:** 7 por jugador, en el orden de la sala (humanos por hora de entrada y después los bots).
  La primera carta de la pila no puede ser +4.
- **Ciclo:** se aplica paso a paso. En el paso `p` le toca a `orden[turno]`, con el turno iniciado en `T0`
  (la hora de la jugada anterior o `inicio`).

  | Le toca a | Qué pasa |
  |---|---|
  | Bot | Juega en `T0 + 1.5 s` si ya pasó esa hora (estrategia determinista con `rngDe(seed, 'bot' + p)`) |
  | Persona, con jugada `n = p` válida hecha a tiempo (`t ≤ T0 + 30 s`) | Se aplica su jugada |
  | Persona, sin jugada y con `ahora ≥ T0 + 30 s` | Jugada automática: roba 1 y pasa |
  | Persona, sin jugada y todavía a tiempo | Se detiene; se espera |

- **Acciones:**
  - `jugar { carta, color?, una? }`: la carta debe estar en la mano y ser válida (o ser la robada
    pendiente).
    - Comodín y +4 fijan `color`.
    - Si la mano queda en 1 sin `una: true`, roba 2.
    - Si queda en 0, termina.
    - Efectos: Salta, Reversa (con 2 jugadores funciona como Salta), +2 y +4.
  - `robar`: roba 1. Si sirve, queda `pendiente` y el mismo jugador decide: `jugar` esa carta o `pasar`.
    Si no sirve, pasa el turno.
  - `pasar`: solo con `pendiente`.
- **Mazo vacío:** se rebaraja la pila (menos la carta de arriba) con `rngDe(seed, 'rebaraja' + p)`.
- **Jugadas inválidas:** se ignoran; la página solo ofrece jugadas válidas.
- **Deuda anotada:** las reglas se duplican con el modo solitario, que se deja intacto para no arriesgar
  regresiones. Se puede unificar después.

### 2. Servidor
- `respuesta` con `jugada`:
  - valida `n` (0–2000), `accion` (`jugar`, `robar` o `pasar`), `carta` (0–107), `color` (`r`, `y`, `g`
    o `b`) y `una` (booleano);
  - si otro jugador de la sala ya tiene esa `n`, responde 409 `turno_tomado`;
  - agrega la jugada a `jugadas[]` del archivo propio, con `t` = hora del servidor, hasta 600.
- El servidor no reproduce la partida.

### 3. Página
- **Mesa:**
  - rivales con su número de cartas, "¡Una!" si les queda 1 y el turno resaltado;
  - carta de arriba y color vigente;
  - botón Robar, barra de tiempo del turno y la última jugada anunciada con voz.
- **Mano propia:** muestra las cartas jugables; hay selector de color para comodines, el interruptor
  📣 "¡Una!" con 2 cartas y "Pasar" cuando hay pendiente.
- **Sondeo:** cada 2 s. Tras una jugada propia, se consulta de inmediato.
- **Idioma:** botones locales Español o English para etiquetas y voz.
- **Final:** `pintarFinalSala` con el podio; envía `final` y la partida de `una` al ranking.
