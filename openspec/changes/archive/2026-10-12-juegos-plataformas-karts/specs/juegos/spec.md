## MODIFIED Requirements

### Requirement: Catálogo de juegos
`juegos.html` SHALL mostrar los juegos por categoría: Inglés, Español, Maratón de cultura, Mente ágil, Clásicos
(desde juegos-clasicos) y Arcade (desde juegos-plataformas-karts), cada uno con su ícono y su descripción.
Cada tarjeta muestra el mejor puntaje de la semana del jugador. Cada juego SHALL terminar en una pantalla
de resultado con puntos y aciertos; los de Arcade muestran el resultado de cada nivel o carrera dentro del juego.

#### Scenario: Jugar y ver el resultado
- **WHEN** una alumna termina "Vocabulario contra reloj"
- **THEN** ve sus puntos, sus aciertos y su posición en el ranking de la semana

#### Scenario: Categoría Arcade
- **WHEN** un alumno abre el inicio de Juegos
- **THEN** ve la categoría «🕹️ Arcade» con «Axo y los 12 mundos» y «Karts Turbo», con su ícono y su descripción

### Requirement: Aviso al recargar juegos que no se reanudan
Los demás juegos individuales SHALL pedir confirmación del navegador (`beforeunload`) si la persona intenta
recargar o salir con una partida en curso. Las pantallas de elegir nivel o modo, los juegos que se reanudan y los
juegos de Arcade (que guardan su avance en el servidor) SHALL NOT pedirla.

#### Scenario: Recargar un Memorama en curso
- **WHEN** alguien recarga a mitad de un Memorama
- **THEN** el navegador pide confirmar antes de salir

#### Scenario: Recargar un juego de Arcade
- **WHEN** alguien recarga mientras juega «Karts Turbo» en modo individual
- **THEN** el navegador no pide confirmar y, al volver a abrir el juego, continúa con su avance guardado

## ADDED Requirements

### Requirement: Progreso individual de juegos en el servidor
El sistema SHALL exponer `GET /juegos/progreso/<juego>` y `PUT /juegos/progreso/<juego>` para los juegos con
avance (`plataformas` y `karts`), guardados en `juegos/progreso/<juego>/<id-jugador>.json` como `{ v, datos,
actualizado }`, sin correos.
- Cada jugador SHALL leer y escribir solo su propio progreso (el id sale de la sesión); no hay forma de leer el de
  otra persona, tampoco para el admin.
- `GET` responde `{ juego, v, datos, actualizado }`, con `v = 0` y `datos = null` si aún no hay avance.
- `PUT { v, datos }` SHALL escribir solo si `v` es la versión guardada (escritura condicional) y responde
  `{ ok: true, v: v + 1 }`. Si no coincide, SHALL responder 409 `version_vieja` con la versión y los datos actuales.
- SHALL validar el tamaño (≤ 4096 bytes, si no 413 `progreso_grande`) y la forma exacta de `datos` según el juego
  (400 `progreso_invalido`). Un juego sin avance responde 400 `juego_sin_progreso`; otro método, 405.

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

### Requirement: Plataformas 2D
Juegos SHALL ofrecer en Arcade el juego **«Axo y los 12 mundos»** (`plataformas`), con un personaje original y arte
propio:
- un mapa de mundos con estructura para 12, de los cuales al menos 4 SHALL ser jugables con físicas distintas:
  Pradera Verde (base), Desierto Árido (viento cruzado), Tundra de Hielo (poca fricción) y Volcán Activo (plataformas
  que caen y lava); los demás se ven como «Próximamente»;
- 3 niveles por mundo; el tercero termina con un jefe sencillo; superar un nivel desbloquea el siguiente;
- monedas (100 dan una vida extra), champiñón (aguanta un golpe), chile de fuego (lanza bolas de fuego), enemigos
  que patrullan, checkpoint a media pantalla e invulnerabilidad de 1.5 s tras recibir daño;
- en modo individual, el avance (mundo y nivel desbloqueados, niveles completados, monedas, vidas, power-up y
  checkpoint del nivel en curso) SHALL guardarse en el servidor y, al volver, el jugador SHALL continuar donde iba;
- cada nivel superado SHALL sumar sus puntos a los ⭐ individuales (tope 2000 por partida).

#### Scenario: Superar un nivel
- **WHEN** Sofy termina el nivel 1-1 con 12 monedas en 40 s
- **THEN** ve «¡Nivel superado!», sus puntos se suman a sus ⭐ individuales y el 1-2 queda desbloqueado

#### Scenario: Continuar después de recargar
- **WHEN** Sofy recarga Juegos y vuelve a abrir el juego
- **THEN** el mapa muestra el 1-1 completado, el 1-2 desbloqueado y sus mismas monedas, vidas y power-up

#### Scenario: Daño con champiñón
- **WHEN** Axo, grande por el champiñón, toca a un enemigo
- **THEN** vuelve a su tamaño base, no pierde vida y durante 1.5 s no recibe más daño

#### Scenario: Cien monedas
- **WHEN** junta la moneda número 100
- **THEN** gana una vida y su contador de monedas vuelve a empezar

### Requirement: Karts
Juegos SHALL ofrecer en Arcade el juego **«Karts Turbo»** (`karts`), de carreras con vista cenital:
- al menos 4 pistas y 8 corredores (la persona y 7 bots);
- derrape con mini-turbo de 3 niveles (azul, naranja, morado), turbo de salida si se acelera con buen tiempo,
  monedas (hasta 10, suben la velocidad punta) e ítems que dependen de la posición (quien va más atrás recibe
  mejores);
- una copa de 4 carreras con puntos por lugar (15, 12, 10, 8, 6, 4, 2, 1), además de carrera rápida y un taller
  con piezas que se desbloquean;
- bots cuya dificultad se ajusta de forma acotada a cómo le va a la persona, sin trampas exageradas;
- en modo individual SHALL guardarse en el servidor la copa en curso, las copas ganadas, los mejores tiempos por
  pista y las piezas; cada carrera terminada SHALL sumar sus puntos a los ⭐ individuales (tope 2000).

#### Scenario: Carrera de copa
- **WHEN** Angel termina la primera carrera de la Copa Fiesta en 3.er lugar
- **THEN** ve la tabla de la copa con sus 10 puntos y sus ⭐ individuales suben

#### Scenario: Continuar la copa
- **WHEN** recarga después de la primera carrera y vuelve a abrir Karts Turbo
- **THEN** puede continuar la copa en la carrera 2 de 4 con los mismos puntos

#### Scenario: Mini-turbo morado
- **WHEN** mantiene un derrape girando más de 2.1 s y lo suelta
- **THEN** recibe el turbo morado, el más largo

### Requirement: Carreras de Arcade en partida
Las partidas (salas) SHALL permitir `plataformas` y `karts` como reto sin guardar avance:
- todos SHALL jugar el mismo nivel o pista, guardado en `sala.opciones.mapa` (lo elige quien crea la sala o el
  servidor al azar; 400 `mapa_invalido` si no existe), y la carrera empieza a la hora de inicio del servidor;
- cada persona SHALL enviar su tiempo con `POST /juegos/sala/<código>/respuesta { carrera: { ms, monedas } }`
  (`ms: null` si no terminó); solo cuenta el primero; el servidor SHALL rechazar con 400 `carrera_invalida` un
  tiempo fuera del mínimo y el límite del juego o que no cuadre con su reloj;
- BOT-VACHIRA y BOT-ISAGII, si la sala tiene bots, SHALL tener tiempos simulados creíbles, iguales en todos los
  dispositivos (semilla);
- el podio SHALL ordenarse por tiempo cuando todas las personas terminaron o al vencer el límite, y los puntos por
  lugar se guardan como partida de sala; el progreso individual SHALL NOT cambiar.

#### Scenario: Podio con bots
- **WHEN** Marisol termina la carrera de su sala con bots en 20 s
- **THEN** ve el podio con su tiempo y los de BOT-VACHIRA y BOT-ISAGII, y sus puntos se suman a 👥 partidas

#### Scenario: Tiempo imposible
- **WHEN** alguien envía `ms: 5000` cuando la carrera empezó hace 60 s
- **THEN** responde 400 `carrera_invalida`

#### Scenario: Revancha con el mismo mapa
- **WHEN** termina una carrera de karts en «Lago Helado» y alguien toca «Otra con los mismos»
- **THEN** la sala nueva usa la misma pista

#### Scenario: La partida no guarda progreso
- **WHEN** alguien juega Karts Turbo en una sala
- **THEN** su progreso individual de karts no cambia

### Requirement: Calidad de los juegos de Arcade
Los juegos de Arcade SHALL correr con paso fijo a 60 cuadros por segundo, SHALL pausarse solos al ocultar la
pestaña, SHALL tener sonido opcional (🔊/🔇, recordado) y controles táctiles grandes además del teclado, SHALL
evitar destellos fuertes y SHALL respetar `prefers-reduced-motion` (sin sacudidas de cámara y con menos partículas).

#### Scenario: Pestaña oculta
- **WHEN** la persona cambia de pestaña a mitad de un nivel individual
- **THEN** el juego queda en pausa y el tiempo del nivel no corre (en una sala el reloj del servidor sigue)

#### Scenario: Celular
- **WHEN** alguien juega en un celular de 390 px de ancho
- **THEN** ve el juego completo y botones grandes para moverse, saltar o derrapar
