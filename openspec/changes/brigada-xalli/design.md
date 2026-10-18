## Context

Pedido del profe: «un similar a Metal Slug pero nuestra propia versión, misiones, hasta 8 jugadores a la vez». Base
técnica que se reutiliza:

- `juegos/plataformas.html` (Axo): física de personaje en canvas, niveles, cámara, avance por `postMessage`.
- `juegos/personajes.js`: los 8 personajes con `Personajes.pintar(c, id, { pose, fase, t })` (de perfil, pies en el
  origen, ~15 u de alto) y `Personajes.retrato`.
- `juegos/mando.js` (mando común), `juegos/emocion.js` (ánimo sonoro: `nivelSuperado`, `record`, `victoria`,
  `derrota`, `intensidad`, `podio`).
- Canal en vivo `juegos/en-vivo.js` (sobre de 2048 B por mensaje, `EnVivo.simulado`, `EnVivo.redSimulada`) y el modelo
  de anfitrión autoritativo de Fútbol Estelar en línea y Futbolito Arena (`juegos/arena-red.js`, `server/arena.ts`).
- Mesas (`server/salas.ts` y `juegos/mesas.js`, iguales por `server/mesas_test.ts`), personaje por asiento
  (`personaje-en-salas`), avance individual (`server/progreso.ts`) y `CATALOGO` (`server/juegos.ts`).

## Goals / Non-Goals

- Meta: un run-and-gun original, cómico y sin violencia realista, con 4 misiones, que se juegue solo (con compañeros
  IA opcionales) y en equipo en vivo de hasta 8, a 60 fps con CPU ×4 en celular.
- Fuera: servidor autoritativo o rollback, que un invitado tome el lugar del anfitrión caído, editor de niveles, que
  las misiones jugadas en sala desbloqueen el avance individual (queda como pendiente).

## Decisions

### 1. Nombre, identidad y archivos
- «🦎 Brigada Xalli», id `brigada`, categoría `arcade`, `CATALOGO` con `max: 1000`. Xalli es la mascota de la casa (el
  ajolote de Axo); *brigada* = equipo de rescate. Alternativas descartadas: «Comando Ajolote» (suena a ejército) y
  «Misión Relámpago» (no dice de quién es el juego).
- `juegos/brigada-misiones.js` (`window.BrigadaMisiones`, sin DOM): datos de las 4 misiones.
- `juegos/brigada-motor.js` (`window.BrigadaMotor`, sin DOM): física de paso fijo, armas, enemigos, jefes con patrones
  de semilla, rescates, vehículo, cámara compartida, IA (piloto automático), estrellas, puntos, plausibilidad y forma
  del avance. Lo cargan el juego y el servidor (`server/brigada.ts` lo importa, como `server/arena.ts` importa
  `juegos/arena-motor.js`): una sola fuente de las reglas.
- `juegos/brigada-red.js` (`window.BrigadaRed`, PR 2): foto, entrada, anfitrión e invitado.
- `juegos/brigada.html`: vista, controles, menús, audio y modos.

### 2. Mundo y física (paso fijo de 1/60 s)
- Unidades en píxeles nativos. La **ventana de juego** mide 480 × 270 (16:9); el suelo es un perfil de escalones
  (`suelo: [[x0, x1, y], …]`, continuo, sin fosos: nadie muere por caer) y hay plataformas de un solo sentido (se bajan
  con ↓ + saltar).
- Personaje: caja 14 × 26 (16 agachado). Correr 120 px/s con aceleración 1100 px/s² en el suelo y 650 en el aire
  (inercia), salto −330 px/s con salto variable (soltar A corta a −120), gravedad 950 px/s², caída máx. 430. Escalones
  ≤ 10 px se suben solos; más altos son pared.
- Daño: 3 corazones por vida, 1.2 s de invulnerabilidad tras un golpe; 3 vidas. Al perder la última: en solitario sin
  compañeros, «Misión fallida» → reintento desde el último punto de control; con compañeros (IA o personas), el
  personaje queda en una **burbuja** que flota con la cámara y un compañero lo revive al tocarla 0.6 s (vuelve con 1
  vida). Si todo el equipo queda fuera → reintento del equipo desde el punto de control (cuenta como reintento).

### 3. Armas (juguetes) y apuntado
- Apuntado en 8 direcciones con el joystick, la palanca o el teclado; con toques se cuantiza a 4 (adelante, arriba,
  abajo en el aire, atrás). En el suelo, ↓ = agacharse (dispara bajo hacia adelante).
- | Arma | Cadencia | Daño | Munición | Nota |
  |---|---|---|---|---|
  | 🫧 Lanzaburbujas | 0.16 s | 1 | ∞ | la de siempre |
  | 💨 Ráfaga turbo | 0.07 s | 1 | 150 | mantener B |
  | 🎉 Abanico de confeti | 0.34 s | 1 × 5 | 40 | alcance corto, abanico de ±24° |
  | 🔦 Láser de juguete | 0.12 s | 2 | 80 | atraviesa |
  | 🎈 Globo de confeti (X) | — | 6 en 40 px | 10 | arco, revienta al tocar |
  | 🛡️ Escudo burbuja | — | — | 10 s | absorbe golpes |
- **Y = cambiar arma** entre las que tienen munición. Al acabarse vuelve al lanzaburbujas.
- Proyectiles en *pools* de tamaño fijo (160 propios, 64 enemigos, 24 globos); nada se crea por cuadro.

### 4. Enemigos, rescates, objetos y vehículo
- Enemigos (robots y alienígenas, revientan en engranes o confeti): Patrullabot (camina y lanza tuercas), Dron
  zumbador (vuela en onda y suelta gotas), Torreta tuerca (fija, dispara apuntado), Saltabot (salta hacia ti),
  Escudobot (escudo al frente: atácalo por arriba, por detrás o con globo) y Gelatino invasor (alien, salta y dispara
  en abanico). Aparecen cuando la cámara llega a su `x`; los que se quedan atrás se van sin dar puntos.
- **Rescates**: animalitos (ajolotito, xolito, guacamaya, tortuguita, conejito y colibrí) en jaulas robóticas; un
  disparo o un toque abre la jaula: +500, «¡Gracias!» y suelta un premio (arma, globos, escudo o corazón).
- **Vehículo «Armadillo»**: tanquecito saltarín (8 de vida). Se sube al tocarlo; dispara bolas de confeti (daño 4) en 8
  direcciones; X = bajarse. Si su vida llega a 0 revienta en confeti y el personaje sale con invulnerabilidad.
- Escalado con N personajes en la misión (personas + IA): vida de los enemigos × (1 + 0.15 (N−1)), copias extra de
  algunos enemigos (índice mod 4 < ⌊(N−1)/2⌋) y vida de jefes × (1 + 0.45 (N−1)).

### 5. Misiones (dificultad creciente)
| # | Escenario | Largo | Puntos de control | Minijefe | Jefe |
|---|---|---|---|---|---|
| 1 | 🌳 Selva de Ceibas | 3600 | 1 | — | Tractor Tragahojas |
| 2 | 🌵 Desierto de Saguaros | 4200 | 2 | Excavadora | Escorpión de Hojalata |
| 3 | 🏙️ Ciudad de Colores | 4600 | 2 | Grúa robot | Antenón (dirigible) |
| 4 | 🛰️ Estación Orbital | 5000 | 2 | Torre láser | Reina Nodriza |

- Escenarios sin caricaturas: ceibas y ruinas en silueta lejana; mesas, saguaros y un pueblito de adobe; fachadas de
  colores con papel picado y azoteas; estación con módulos y la Tierra al fondo.
- Jefes con fases que elige `rng(semilla)` (mulberry32): cada fase avisa (destello o polvo) antes de atacar. En la
  segunda mitad de su vida los jefes aceleran.
- Al llegar a la arena del (mini)jefe la cámara se fija hasta vencerlo.
- **Puntos**: robot 80–250 según el tipo, minijefe 2000, jefe 5000, rescate 500, objeto 50, estrella 300, bono de
  tiempo `10 × (tiempoMeta − s)` (si es positivo). Los enemigos que invoca un jefe no dan puntos (así los puntos
  tienen tope: `puntosMaximos(misión, N)`).
- **Estrellas**: ★ completar, ★★ rescatar a todos los animalitos, ★★★ sin reintentos.
- **Ranking**: `min(1000, round(puntos / 20))` por misión (individual: con `puntos`; sala: los pone el servidor).

### 6. Cámara compartida con liga (decisión)
- Una sola ventana de 480 px para todo el equipo (como el arcade de siempre), simulada por el motor: avanza para dejar
  al de adelante al 40 % pero nunca deja fuera al de atrás; no regresa; se fija en la arena de cada jefe. Los
  personajes no salen de la ventana.
- **Liga**: si el de atrás frena a la cámara mientras el de adelante empuja el borde durante 3 s, el de atrás «salta»
  junto al grupo («¡Jalón!»). Así nadie se queda atrás ni un ausente detiene al equipo.
- Por qué no pantallas por persona: con pantallas separadas los enemigos y el jefe dejarían de ser los mismos para
  todos, aparecer enemigos dependería de 8 cámaras y la foto tendría que llevar 8 zonas del mapa. Con una ventana
  compartida, todos ven el mismo combate, el anfitrión decide qué aparece y la foto es una sola. Cada aparato dibuja la
  ventana a su escala y, si es más ancho que 16:9, muestra un poco más de escenario a los lados (decorativo).

### 7. IA (compañeros, piloto automático y quien se desconecta)
- Produce la misma entrada que una persona (`{ x, y, a, b, ga, gx, gy }`). Avanza con el grupo, se detiene a disparar
  al enemigo más cercano en su lado (apuntado de 8 direcciones), salta escalones, proyectiles y saltabots, abre jaulas,
  revive burbujas, lanza globos a grupos o al jefe, y frente al jefe mantiene distancia y esquiva.
- Prueba: el piloto automático (1, 4 y 8 personajes) termina las 4 misiones con varias semillas.

### 8. Vista
- Canvas 2D a la escala que quepa (k = alto / 270, o ancho / 480 si es menor); `dpr` hasta 2. Fondos de cada misión
  pre-dibujados en tiras (cielo, lejano a 0.2 y medio a 0.5 de paralaje); personajes pre-dibujados por pose (quieto,
  4 de caminar, salto, caída, daño, gana) con casco del color del personaje, mochila y lanzaburbujas encima (el casco
  se coloca con la caja medida del dibujo); enemigos pre-dibujados por tipo y cuadro; partículas en *pool* (confeti y
  engranes). Solo se dibuja lo que cae en la vista (*culling*).
- HUD: corazones y vidas, arma y munición, globos, puntos, barra de avance de la misión, barra del jefe; en equipo, un
  renglón por persona (color, nombre corto y corazones).

### 9. Controles
- Capa `BrigadaEntrada` (como `ArenaEntrada`): teclado, toques, mando y fuentes registradas (pruebas). Las presiones
  más cortas que un cuadro no se pierden (`pulso`).
- Táctil: joystick flotante a la izquierda; a la derecha A (saltar, grande), B (disparar, grande; mantener = ráfaga),
  X (globo) e Y (cambiar arma). *Touch events* no pasivos por dedo. En vertical los controles van debajo; en
  horizontal, encimados en las esquinas.
- Mando común: `Mando.crear({ acciones: { saltar: 'A', disparar: 'B', globo: 'X', arma: 'Y', pausa: 'START' },
  analogico: true, teclas: todas null })`.
- Teclado: flechas/WASD mueven y apuntan (↓ agacharse), K o Espacio saltan, J o Z disparan, L o X lanzan globo, I o C
  cambian arma, P/Esc pausa (solo en solitario).

### 10. Avance (forma exacta y versionada)
`datos = { ver: 1, desbloqueada: 1–4, personaje, misiones: { "1"…"4": { estrellas: 0–3, record: 0–tope, mejorMs:
null | 20 000–3 600 000 } }, companeros: 0 | 1 | 3, totales: { robots, rescatados, completadas } }`. El servidor
valida la forma exacta (`validarProgresoBrigada` del motor): `ver` = 1 (una versión nueva tendrá su migración), sin
misiones por encima de `desbloqueada`, una misión con estrellas obliga a desbloquear la siguiente, récord ≤
`puntosMaximos(misión, 8)`.

### 11. Netcode (PR 2; anfitrión = quien creó la sala)
- **Foto** `bx:foto` a 12 Hz: `{ q, t, c (cámara), e (estado), k (punto de control), j: [x, y, banderas, apuntado·arma,
  corazones·vidas] × N, n: [id, tipo, x, y, fase] × ≤ 24 enemigos (los más cercanos a la ventana), p: [x, y, tipo] ×
  ≤ 16 proyectiles enemigos, ev, s (cada 1 s o al cambiar: puntos y munición), r (jaulas abiertas, máscara), o
  (objetos, al cambiar), b (vida del jefe en %) }`. Posiciones en px enteros.
- **Entrada** `bx:entrada` a 12 Hz (10 Hz con más de 4 personas): `{ s, x, y, m (A y B mantenidos), na, nb, nx, ny }`
  con contadores de presiones (mod 64): una presión no se pierde aunque se pierda un paquete.
- **Invitado**: predice solo su personaje con la misma física (nivel, cámara de la foto) y lo reconcilia con la foto
  (re-aplica las entradas con `seq` mayor que la última aplicada); interpola a los demás y a los enemigos por id con
  100 ms de retraso. Sus disparos y los de los demás son cosméticos (los dibuja al instante); **los golpes los resuelve
  solo el anfitrión** y las explosiones llegan como eventos.
- **Desconexión**: 3 s sin entradas → la IA maneja ese personaje y lo devuelve en cuanto llega su entrada. Si se cae el
  anfitrión, los invitados ven una cuenta de 15 s y cierran con los puntos de la última foto (`corte`).
- **Respaldo**: sin canal (la sala no trae `rt` o no conecta en 6 s) y con más de una persona → «La misión en vivo no
  está disponible en esta sala» + «🦎 Jugar solo». Con una sola persona (y compañeros IA) no hace falta canal.
- **Lo lento aparte**: puntos, munición, objetos y vehículos viajan en su propio mensaje `bx:lento` (al cambiar, a lo
  más cada 250 ms, o cada 1 s), no en la foto. Los eventos (explosiones, rescates, jefe…) van compactos
  `[n, tipo, i, x, y, aux]`, a lo más 12 por foto, repetidos en 3 fotos por si se pierde una.
- **Presupuesto** (medido en `server/brigada_red_test.ts` con la red simulada de `EnVivo`):

  | Caso | Envíos por sala/s | Foto promedio | Foto máxima |
  |---|---|---|---|
  | 8 personas, misión 2, 80 ms y 3 % de pérdida | 83.3 | 420 B | 770 B |
  | 4 personas, misión 1, 120 ms y 5 % de pérdida | 49.4 | — | 509 B |
  | Peor caso armado: 8 personajes, 24 enemigos, 16 proyectiles y 12 eventos | — | — | < 1700 B |

  En el navegador, con 8 contextos, la foto máxima fue de 432 B. Karts con 8 midió ≈ 80 envíos/s contra el Supabase
  real sin pérdida.
  El personaje propio predicho va adelantado a lo que simula el anfitrión una latencia más un intervalo de entrada:
  p90 de 19 px a 80 ms y de 30 px a 120 ms (a 120 px/s). La corrección es suave en x (25 % por cuadro).
- **Fin**: cada aparato manda el tiempo real desde el inicio (el servidor lo compara con el tiempo transcurrido) y los
  puntos de cada persona que vio (los invitados los reciben en `bx:lento`).

### 12. Sala y resultado (PR 2)
- `MESAS.brigada = { max: 8, asientos: 4, min: 1 }` en el servidor y en la página: sin bots, de 1 a 8 personas; con
  bots, los asientos libres hasta 4 son compañeros IA y cada persona que entra quita uno. Opción `mision` ("1"–"4").
  Personaje por asiento como Karts y Axo (`personaje-en-salas`).
- Cada persona manda `POST /respuesta { brigada: { mision, ms, completada, puntos: { <id>: n }, corte? } }` (solo el
  primero). Validación: misión de la sala, `ms` de 20 s a 40 min y ≤ tiempo desde el inicio + 5 s, cada puntaje ≤
  `puntosMaximos(misión, N)`, ids de la mesa. Estado como Futbolito Arena: `confirmado` (todos coinciden con el
  anfitrión), `disputa` (cuenta el del anfitrión), `anfitrion`, `invitado`, `pendiente`. Puntos de ranking por persona =
  `min(1000, round(puntos / 20))`; `POST /juegos/partida` con sala de `brigada` toma los del servidor.
- Podio de la sala con `pintarFinalSala` (que ya llama a `Emocion.podio`), los puntos del equipo y revancha.

## Risks / Trade-offs

- [Celular lento como anfitrión de 8] → simulación barata (pools, sin asignaciones por cuadro); se mide el costo del
  paso con 8 personajes en la prueba de red.
- [Foto grande con mucho combate] → tope de enemigos y proyectiles por foto (los más cercanos a la ventana), números
  enteros y lo lento (puntos, munición, objetos) solo al cambiar.
- [Disparos cosméticos vs. golpes del anfitrión] → aceptado: un disparo puede verse pasar cerca y no contar; la
  explosión siempre la decide el anfitrión.
- [Niñas y niños pequeños] → corazones, nada de fosos, Escudo y compañeros IA; misión 1 corta y amable.

## Migration Plan

PR 1 y PR 2 por separado; merge a `main` (Pages + Deno Deploy). Verificar en producción que `juegos/brigada.html` y sus
scripts responden 200, que `/juegos/progreso/brigada` acepta la forma y (PR 2) que la sala `brigada` se crea.
Reversa: revertir el merge. Sin datos que migrar (el avance empieza vacío).
