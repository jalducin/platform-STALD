## ADDED Requirements

### Requirement: Golf
Juegos SHALL ofrecer en Arcade **«⛳ Golf»** (`golf`), un minigolf con vista desde arriba y arte propio, con 9 hoyos
hechos a mano de menor a mayor dificultad, cada uno con su par:
1. «Primer tiro» (par 2), recta;
2. «La curva» (par 2), forma de L con banda diagonal;
3. «El arenero» (par 3), arena que frena;
4. «La loma» (par 3), pendiente de lado y rampa;
5. «El lago» (par 3), agua con un puente angosto;
6. «El molino» (par 3), molino que abre y cierra el túnel;
7. «Túnel mágico» (par 3), portal que lleva cerca del hoyo;
8. «La compuerta» (par 4), compuerta que se mueve, arena y banda;
9. «Gran final» (par 5), pendiente, portal, agua, molino y arena.

La pelota SHALL rebotar en paredes y bandas, frenarse más en la arena, acelerarse en pendientes y rampas, cruzar los
portales y chocar con los obstáculos móviles. Si cae al agua, SHALL regresar a donde se tiró con un golpe de castigo.
Cada hoyo tiene un límite de par + 4 golpes: al llegar sin meterla, la pelota se recoge y el hoyo cuenta con el
límite. Se juega el recorrido de 9 hoyos o la práctica de un hoyo ya desbloqueado (el 1 siempre; los demás al
terminar el anterior).

#### Scenario: Agua con castigo
- **WHEN** una alumna tira y su pelota cae al lago del hoyo 5
- **THEN** la pelota regresa a donde tiró, se le suma un golpe de castigo y ve el aviso «💦 ¡Al agua! +1 golpe»

#### Scenario: Portal
- **WHEN** la pelota de un alumno entra al portal del hoyo 7
- **THEN** sale por el otro portal, cerca del hoyo, con la misma rapidez

#### Scenario: Molino
- **WHEN** alguien tira hacia el túnel del molino cuando un aspa tapa la entrada
- **THEN** la pelota rebota en el aspa; si la entrada está libre, la pelota pasa por el túnel

#### Scenario: Recoger la pelota
- **WHEN** un alumno llega a 7 golpes en un hoyo par 3 sin meterla
- **THEN** la pelota se recoge, el hoyo cuenta 7 golpes y sigue el siguiente hoyo

### Requirement: Controles del Golf
El Golf SHALL poderse jugar cómodo en el celular, con mando y con teclado:
- **Resortera:** poner el dedo en cualquier parte del campo y jalar hacia atrás apunta al lado contrario y elige la
  fuerza según lo largo del jalón, con una línea guía (trayectoria estimada con rebotes) y la fuerza en número; al
  soltar no tira: se tira con un botón grande «⛳ GOLPEAR».
- **Ajuste fino:** ⟲ ⟳ giran la mira medio grado por toque y − / + cambian la fuerza de uno en uno.
- **🎮 Mando clásico** (opcional, `juegos/mando.js`): cruceta ◀ ▶ apunta, L/R ajuste fino, X/Y fuerza, A golpea,
  START pausa.
- **Teclado:** ← → apuntan, ↑ ↓ cambian la fuerza, Espacio golpea, P o Esc pausan.
- El control elegido (toques o mando) SHALL recordarse en el navegador.
- La cámara SHALL seguir a la pelota cuando el hoyo no cabe en la pantalla, con un minimapa del hoyo que al tocarlo
  alterna la vista completa.

#### Scenario: Tirar con la resortera
- **WHEN** una alumna pone el dedo en el campo, lo jala hacia abajo y lo suelta
- **THEN** la mira apunta hacia arriba, la fuerza muestra un número según el jalón y la pelota no sale hasta que
  toca «⛳ GOLPEAR»

#### Scenario: Mando clásico recordado
- **WHEN** un alumno elige «🎮 Mando clásico», cierra el juego y lo vuelve a abrir
- **THEN** el mando sigue elegido; con ◀ ▶ gira la mira, con X sube la fuerza y con A golpea

#### Scenario: Teclado
- **WHEN** alguien en computadora mantiene → y luego presiona Espacio
- **THEN** la mira gira a la derecha y la pelota sale con la fuerza elegida

### Requirement: Puntuación y avance del Golf
Al terminar cada hoyo el Golf SHALL mostrar el resultado por golpes contra el par (hoyo en uno, albatros, águila,
birdie, par, bogey, doble bogey, triple bogey, «+N» o recogida) y las estrellas (3 bajo par, 2 en par, 1 terminado,
0 recogida), y SHALL registrar los puntos del hoyo en ⭐ individuales: `20 + 30 · max(0, par + 2 − golpes)` más 100
por hoyo en uno (10 si se recogió), con el tope del catálogo (1000). Al terminar el recorrido SHALL mostrar la tarjeta
con los 9 hoyos (par, golpes y resultado) y el total contra el par. El avance SHALL guardarse en
`/juegos/progreso/golf`: mejor resultado y estrellas por hoyo, recorridos completos y mejor recorrido.

#### Scenario: Birdie
- **WHEN** una alumna mete la pelota en 2 golpes en un hoyo par 3
- **THEN** ve «🐦 ¡Birdie!», 3 estrellas y +110 puntos, que se suman a sus ⭐ individuales

#### Scenario: Avance guardado
- **WHEN** un alumno termina el hoyo 1 en 2 golpes, sale del juego y vuelve a entrar
- **THEN** el menú de práctica muestra su mejor resultado (2) y sus estrellas en el hoyo 1 y el hoyo 2 ya está
  desbloqueado

#### Scenario: Tarjeta final
- **WHEN** alguien termina los 9 hoyos del recorrido
- **THEN** ve la tarjeta con par, golpes y resultado de cada hoyo, el total y la diferencia contra el par

### Requirement: Golf en partida
Las partidas (salas) SHALL permitir `golf` de 2 a 4 personas, sin bots (mesa `{ max: 4, min: 2, bots: "nunca" }`),
por turnos: se juegan 3 hoyos elegidos con la semilla de la sala (uno de los hoyos 1–3, uno de 4–6 y uno de 7–9).
Tira quien no ha terminado el hoyo con menos golpes en ese hoyo (empate: el primero de la mesa); las pelotas no
chocan entre sí. Cada tiro es una jugada `{ n, accion: "tiro", angulo, fuerza }` (`angulo` 0…3599 en décimas de
grado, `fuerza` 1…100) y todos los aparatos lo simulan igual (determinista) desde la semilla de la sala;
`{ n, accion: "rendirse" }` saca a esa persona (sus hoyos pendientes cuentan con el límite) y los demás siguen. Si
quien tiene el turno no tira en 30 s, se hace un tiro automático. El servidor SHALL validar la forma de cada jugada
(400 `jugada_invalida`), SHALL rechazar un paso ya tomado (409 `turno_tomado`) y SHALL rechazar jugadas cuando la
partida ya terminó (409 `partida_terminada`). Al terminar, el podio (menos golpes gana; puntos 500 / 300 / 200 / 100
por lugar más 10 por estrella, tope 1000) se pinta con la tarjeta de la sala y se puede pedir la revancha.

#### Scenario: Dos personas ven lo mismo
- **WHEN** dos alumnas juegan Golf en la misma sala y una tira
- **THEN** las dos ven la misma trayectoria, el mismo marcador de golpes y el turno de la misma persona

#### Scenario: Sin bots
- **WHEN** un alumno crea una sala de Golf y quiere empezar sin que entre nadie más
- **THEN** el servidor responde 409 `faltan_jugadores`; la quinta persona que intenta entrar recibe `sala_llena`

#### Scenario: Jugada inválida
- **WHEN** alguien manda una jugada de Golf con `fuerza: 0`, `angulo: 3600` o `angulo: 10.5`
- **THEN** el servidor responde 400 `jugada_invalida` y no la guarda

#### Scenario: Tiro automático
- **WHEN** a quien le toca no tira en 30 s
- **THEN** todos los aparatos aplican el mismo tiro automático y el turno sigue

#### Scenario: Podio con tarjeta
- **WHEN** termina el tercer hoyo de la sala
- **THEN** cada quien ve el podio ordenado por golpes, la tarjeta con los golpes de todos por hoyo y «Otra con los
  mismos»

### Requirement: Calidad del Golf
El Golf SHALL verse completo desde 320 px de ancho en vertical y en horizontal (en horizontal el hoyo se dibuja
acostado), con textos de al menos 14 px y botones de al menos 44 px, SHALL respetar `prefers-reduced-motion` (sin
confeti, sin salpicaduras animadas y cámara sin suavizado), SHALL usar arte propio sin marcas y textos en español de
México, y SHALL aparecer en el ranking «🔥 Juegos» con su título del catálogo («Golf», Arcade, tope 1000). El motor
(`juegos/golf-motor.js`) SHALL ser determinista: la misma lista de tiros desde la misma semilla da exactamente el
mismo estado.

#### Scenario: Celular chico
- **WHEN** alguien juega Golf en un celular de 320 px de ancho
- **THEN** ve el hoyo, el minimapa, la fuerza y los botones sin que se encimen ni se corten

#### Scenario: Reproducción determinista
- **WHEN** dos aparatos reproducen la misma lista de tiros con la misma semilla
- **THEN** obtienen las mismas posiciones, golpes, hoyo y turno

## MODIFIED Requirements

### Requirement: Progreso individual de juegos en el servidor
El sistema SHALL exponer `GET /juegos/progreso/<juego>` y `PUT /juegos/progreso/<juego>` para los juegos con
avance (`plataformas`, `karts`, `dragon-run` y `golf`), guardados en `juegos/progreso/<juego>/<id-jugador>.json` como
`{ v, datos, actualizado }`, sin correos.
- Cada jugador SHALL leer y escribir solo su propio progreso (el id sale de la sesión); no hay forma de leer el de
  otra persona, tampoco para el admin.
- `GET` responde `{ juego, v, datos, actualizado }`, con `v = 0` y `datos = null` si aún no hay avance.
- `PUT { v, datos }` SHALL escribir solo si `v` es la versión guardada (escritura condicional) y responde
  `{ ok: true, v: v + 1 }`. Si no coincide, SHALL responder 409 `version_vieja` con la versión y los datos actuales.
- SHALL validar el tamaño (≤ 4096 bytes, si no 413 `progreso_grande`) y la forma exacta de `datos` según el juego
  (400 `progreso_invalido`). Un juego sin avance responde 400 `juego_sin_progreso`; otro método, 405.
- Para `dragon-run`, la forma exacta es `{ totales, mejorRacha, dias, diaria, cumplidas, premios, equipo }`, con
  enteros en rango, fechas reales `AAAA-MM-DD`, premios conocidos sin repetir y un equipo (color y estela)
  desbloqueado.
- Para `golf`, la forma exacta es `{ mejores, estrellas, recorridos, mejorRecorrido }`: `mejores` con llaves `"1"`…`"9"`
  y golpes enteros 1–20, `estrellas` con llaves `"1"`…`"9"` y enteros 0–3, `recorridos` entero 0–100000 y
  `mejorRecorrido` `null` o entero 9–200.

#### Scenario: Primer guardado y lectura
- **WHEN** Marisol guarda `{ v: 0, datos }` de plataformas y luego lo pide
- **THEN** recibe `v: 1` y los mismos datos

#### Scenario: Pestaña vieja
- **WHEN** una pestaña con `v: 1` intenta guardar después de que otra ya guardó la versión 2
- **THEN** responde 409 `version_vieja` con `v: 2` y el avance guardado, sin pisarlo

#### Scenario: Forma inválida o demasiado grande
- **WHEN** alguien manda `vidas: 500`, una llave desconocida o una pieza que no desbloqueó
- **THEN** responde 400 `progreso_invalido` y no cambia nada
- **WHEN** manda un avance de más de 4096 bytes
- **THEN** responde 413 `progreso_grande`

#### Scenario: Cada quien su progreso
- **WHEN** Angel pide el progreso de plataformas después de que Marisol guardó el suyo
- **THEN** recibe `v: 0` y `datos: null`

#### Scenario: Sin registro
- **WHEN** un correo que no es alumno, alumna, admin ni invitado pide su progreso
- **THEN** responde 403 `no_registrado`

#### Scenario: Avance de Dragon Run
- **WHEN** Marisol guarda un avance de `dragon-run` con forma válida y luego lo pide
- **THEN** recibe `v: 1` y los mismos datos
- **WHEN** manda una fecha inexistente, `mejorRacha: 5000`, un premio desconocido o el color `dorado` sin haberlo
  desbloqueado
- **THEN** responde 400 `progreso_invalido` y no cambia nada

#### Scenario: Avance de Golf
- **WHEN** Marisol guarda un avance de `golf` con su mejor resultado y estrellas del hoyo 1 y luego lo pide
- **THEN** recibe `v: 1` y los mismos datos
- **WHEN** manda el hoyo `"10"`, 4 estrellas, 0 golpes o una llave desconocida
- **THEN** responde 400 `progreso_invalido` y no cambia nada
