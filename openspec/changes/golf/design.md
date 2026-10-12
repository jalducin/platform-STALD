## Context

Los juegos de Arcade viven en un iframe del mismo origen dentro de `juegos.html` y hablan con la plataforma solo por
`postMessage` (`listo` → `inicio`; `guardar` → `PUT /juegos/progreso/<juego>` → `guardado`; `puntos` →
`POST /juegos/partida` → `puntos-ok`). Futbolito y Billar (cambio `futbolito-billar`) ya resolvieron la física
determinista (`juegos/fisica.js`: trigonometría propia, azar con semilla, `linea` de turnos de sala) y el puente de
sala por tiros (`pintarFisicaSala` + `MesaUI.crearSala`). El mando común (`juegos/mando.js`, cambio `mando-arcade`)
ya lo usan Axo, Dragon Run y Karts. El golf se arma con esas piezas, sin cambiar su comportamiento: otro agente está
cambiando Futbolito, Billar, `mesa-ui.js` y `MESAS`, y otro está partiendo `juegos.html` en módulos.

## Goals / Non-Goals

**Goals:** minigolf de 9 hoyos hechos a mano con mecánicas variadas; controles cómodos en el celular (resortera +
botón grande), con mando y con teclado; puntuación de golf y avance guardado; sala de 2 a 4 personas por turnos que se
reproduce idéntica en todos los aparatos; 60 fps; desde 320 px en vertical y en horizontal; `prefers-reduced-motion`.

**Non-Goals:** editor de hoyos, hoyos al azar, pelotas que chocan entre sí, bots en sala, tiempo real en sala,
tiros con efecto o elevación (la pelota siempre rueda).

## Decisions

### 1. Motor sin DOM: `juegos/golf-motor.js` (`window.Golf`)
- Unidades del mundo: pelota de radio 6, hoyo de radio 11; `x` a la derecha y `y` hacia abajo; la salida suele
  estar abajo y el hoyo arriba.
- Paso fijo de 1/240 s (4 subpasos por cuadro a 60 fps); `velocidad(fuerza) = 30 + 6.9 · fuerza` (1–100 →
  37–720 u/s; a 720 u/s la pelota avanza 3 u por subpaso, menos que su radio, así que no atraviesa paredes).
- Fricción constante: pasto 150 u/s², arena 700 u/s²; se detiene bajo 5 u/s. Paredes: rebote 0.78 sobre la normal y
  0.98 en la tangente. La simulación solo usa `+ − * /` y `Math.sqrt` (la prueba lo revisa en el código fuente) y
  `Fisica.senCos` / `Fisica.atan2Dec` para ángulos en décimas de grado enteras.
- Un hoyo es datos: contorno (`borde`, polígono), muros interiores (polígonos), zonas (rectángulos o círculos de
  `arena`, `agua` o `pendiente` con aceleración `ax, ay`), portales de un solo sentido (`de { x, y, r }` →
  `a { x, y }` con dirección de salida en décimas) y obstáculos móviles (`molino` y `compuerta`). Las paredes son los
  segmentos de los polígonos; el choque usa el punto más cercano del segmento (las esquinas salen solas).
- **Agua:** si el centro de la pelota cae en el agua, el tiro termina, la pelota regresa a donde se tiró y se suma
  un golpe de castigo. **Fuera del campo** (no debería pasar; red de seguridad): regresa sin castigo.
- **Hoyo:** entra si el centro está a menos de 11 u y va a menos de 320 u/s; cerca del hoyo y despacio hay una
  pequeña atracción (la pelota «cae» si queda en la orilla), para que sea amable con niños y niñas.
- **Pendientes y rampas:** aceleración constante dentro de la zona. Si la pendiente es suave (≤ 200 u/s²) la
  pelota puede quedarse quieta encima (agarre del pasto); si es más fuerte (rampa) siempre rueda hacia abajo.
  Detección de atasco: si en 0.5 s se movió menos de 2 u y va lenta, el tiro termina (la pendiente contra una pared
  no deja la pelota temblando). Tope de 25 s por tiro.
- **Obstáculos móviles** dependen de `reloj` (subpasos acumulados del hoyo en el estado), nunca de la hora:
  - `molino`: aspas que giran (una vuelta cada 4 s); la puerta del túnel del molino está cerrada cuando un aspa
    apunta hacia abajo (±22°, 49 % del tiempo) y es una pared mientras tanto;
  - `compuerta`: bloque que va y viene a lo ancho de un hueco (onda triangular de 3 s) y empuja con su velocidad.
  - Si la pelota ya estaba encimada en un obstáculo al empezar el subpaso, ese obstáculo no la choca en ese
    subpaso (así nunca queda atrapada cuando la puerta se cierra sobre ella).
- **Determinismo:** el estado después de cada tiro se redondea a milésimas (`Fisica.q`) y el `reloj` es entero; la
  animación usa el mismo objeto de simulación que la reproducción instantánea (`crearSim(st, tiro).paso()`).

### 2. Los 9 hoyos (de menor a mayor dificultad)
| # | Nombre | Par | Mecánica principal |
|---|--------|-----|--------------------|
| 1 | Primer tiro | 2 | Recta: aprender la resortera y la fuerza |
| 2 | La curva | 2 | Forma de L con una banda diagonal: tiro de banda |
| 3 | El arenero | 3 | Arena que frena; carril de pasto a la orilla |
| 4 | La loma | 3 | Pendiente que empuja de lado y rampa antes del hoyo |
| 5 | El lago | 3 | Agua con un puente angosto (castigo de 1 golpe) |
| 6 | El molino | 3 | Molino que abre y cierra el túnel |
| 7 | Túnel mágico | 3 | Portal que lleva cerca del hoyo; camino largo si fallas |
| 8 | La compuerta | 4 | Zigzag con compuerta que se mueve, arena y banda |
| 9 | Gran final | 5 | Pendiente, portal, agua, molino y arena juntos |
Límite por hoyo: par + 4 golpes (incluye castigos). Al llegar al límite sin meterla, la pelota se «recoge» y el hoyo
cuenta con el límite. La prueba de Deno comprueba que el bot «difícil» termina cada hoyo dentro del límite.

### 3. Turnos y partida (mismo estado para individual y sala)
Estado JSON: `{ hoyos: [índices], h, reloj, jug: [{ x, y, golpes: [por hoyo], dentro, recogidas: [h], retirado }],
tiros, ultimo, fin }`. Las pelotas no chocan entre sí (cada quien juega su pelota). Tira quien no ha terminado el hoyo
con menos golpes en ese hoyo (empate: el primero de la mesa). Cuando todos terminan el hoyo, siguen al siguiente
desde la salida; al terminar el último, `fin` con el orden por golpes totales (quien se rindió va al final).
Rendirse en sala: esa persona deja de tirar y sus hoyos pendientes cuentan con el límite; los demás siguen.

### 4. Sala de 2 a 4 personas, por turnos y sin bots
- Mesa `{ max: 4, min: 2, bots: "nunca" }` en `server/salas.ts` y `juegos/mesas.js`.
- **Sin bots (decisión):** el golf es por turnos y cada tiro de bot agrega 3–6 s de espera a todos; con 3 bots una
  persona esperaría más de lo que juega. Quien quiera jugar solo tiene el recorrido individual (con avance y
  estrellas). Las pelotas no se estorban, así que un bot no agrega competencia real entre compañeros y compañeras.
  La sala es para jugar entre personas, como el ajedrez y la Batalla naval.
- **3 hoyos por sala:** `Golf.hoyosSala(seed)` elige con la semilla uno de los hoyos 1–3, uno de 4–6 y uno de 7–9.
  Con 4 personas, 9 hoyos durarían más de 25 min (unos 4 golpes por hoyo, 4–8 s cada uno); 3 hoyos caben en una
  clase. La revancha trae semilla nueva y por lo tanto otros hoyos. Se hace sin `opciones` nuevas en el servidor.
- Jugada: `{ n, accion: "tiro", angulo: entero 0…3599, fuerza: entero 1…100 }` o `{ n, accion: "rendirse" }`; otros
  campos se descartan. El servidor no simula: valida la forma, `turno_tomado` y, si ya hay `final`/`podio`, 409
  `partida_terminada` (mismo conjunto `FISICA` que Futbolito y Billar).
- La línea de turnos es `Fisica.linea` sin cambios: turno de 30 s; si nadie tira a tiempo (más 3 s de gracia) se
  aplica un tiro automático (`tiroBot(st, "auto", rng(seed, "auto|" + paso))`). `Golf.motorSala(n)` arma el motor de
  `n` jugadores (la línea solo pasa la semilla a `inicial`).
- En la sala los obstáculos móviles avanzan solo mientras rueda una pelota (el `reloj` vive en el estado; la espera
  de cada quien no es determinista). En individual el `reloj` también avanza mientras apuntas (se ven moverse).
- Puente en `juegos.html` (`pintarFisicaSala`, `// golf`): mesa de hasta 4 (`participantes()`), y el `fin` del
  iframe trae además `tarjeta { hoyos: [{ n, par }], golpes: [[…] por lugar de la mesa] }`, que se pinta (escapada)
  debajo del podio. Puntos de sala por lugar: 500 / 300 / 200 / 100 (empates comparten lugar) + 10 por estrella
  (máx. 90); quien se rinde, solo estrellas. Tope 1000.

### 5. Bot (tiro automático y ayuda de pruebas)
Campo de distancias por hoyo: rejilla de 8 u, Dijkstra desde el hoyo (8 vecinos), celdas bloqueadas fuera del
campo, dentro de muros, pegadas a una pared o en el agua; la arena cuesta ×4 y cada portal une su entrada con la
distancia de su salida. Para elegir el tiro se simulan 72 ángulos × 8 fuerzas y se afina alrededor del mejor (el
resultado se guarda en caché por posición y `reloj`, porque `Fisica.linea` vuelve a pedir el tiro en cada cuadro).
Error por nivel: `ideal` 0, `dificil` ±0.6° / ±2, `medio` ±2° / ±5, `facil` ±5° / ±10, `auto` ±6° / ±12.

### 6. Puntuación y avance
- Resultado del hoyo por golpes − par: hoyo en uno (1 golpe), albatros (−3), águila (−2), birdie (−1), par,
  bogey (+1), doble bogey (+2), triple bogey (+3), «+N» y «recogida».
- Estrellas: 3 bajo par, 2 en par, 1 terminado, 0 recogida.
- Puntos por hoyo (individual): `20 + 30 · max(0, par + 2 − golpes)` + 100 por hoyo en uno; recogida 10. Se mandan
  al terminar cada hoyo (aunque no termine el recorrido); el catálogo topa en 1000 por partida.
- Avance (`/juegos/progreso/golf`), forma exacta: `{ mejores: { "1"…"9": golpes 1–20 }, estrellas: { "1"…"9":
  0–3 }, recorridos: 0–100000, mejorRecorrido: null | 9–200 }`. La práctica de un hoyo se desbloquea al terminar el
  anterior (el 1 siempre); el recorrido completo siempre está disponible.

### 7. Pantalla y controles (`juegos/golf.html`)
- Canvas a pantalla completa del iframe; en horizontal el hoyo se dibuja acostado (la salida a la izquierda) con la
  matriz `[0, K, −K, 0, …]`, como la mesa del Billar en vertical. Escala: la que hace caber el hoyo, pero no menos de
  `0.75 · lado corto / 300`; si no cabe, la cámara sigue a la pelota (suave; inmediata con `prefers-reduced-motion`).
  Minimapa en la esquina con el hoyo, las pelotas y el recuadro de la vista; tocarlo alterna «vista completa».
- **Resortera:** se pone el dedo en cualquier parte del campo y se jala hacia atrás; la mira apunta al lado contrario
  y la fuerza es lo largo del jalón (hasta 170 px = 100). Al soltar no tira: se ajusta con ⟲ ⟳ (0.5° por toque,
  repite al mantener) y − / + (1 por toque) y se tira con «⛳ GOLPEAR» (botón grande). Línea guía punteada con la
  trayectoria estimada en pasto (hasta 2 rebotes en las paredes) y la fuerza en número.
- **Mando clásico** (`Mando.crear`, API sin cambios): `apuntarMenos` izq, `apuntarMas` der, `finoMenos` L,
  `finoMas` R, `fuerzaMas` X, `fuerzaMenos` Y, `golpear` A, `pausa` START; `teclas` en `null` (el teclado lo maneja
  el juego) y nombres cortos. Con el mando se esconden los botones del panel (quedan la fuerza y la guía).
- **Teclado** por `MesaUI.crearAcciones`: ← → apuntan (más rápido al mantener; Shift fino), ↑ ↓ fuerza, Espacio o
  J golpea, P / Esc pausa. `window.accionesJuego` expone la capa para otros adaptadores.
- Preferencia en `localStorage.golf_control` (`toques` | `mando`).
- Entrada táctil con `MesaUI.tactil` (*touch events* no pasivos); los botones del panel son `<button>` normales.

## Risks / Trade-offs

- [El bot cuesta ~600 simulaciones] → solo se usa para el tiro automático y en pruebas; caché por posición.
- [En sala el molino se queda quieto mientras apuntas] → se explica en «Cómo se juega»; es lo que hace la sala
  determinista sin agregar campos a la jugada.
- [La línea guía ayuda mucho] → es geométrica (no cuenta arena, pendientes ni obstáculos móviles) y se detiene a 2
  rebotes; para niños y niñas es mejor ayudar de más.
- [Varios agentes tocan `juegos.html`, `server/salas.ts`, `juegos/mesas.js`, `server/juegos.ts`, `correr.sh`] →
  cambios de una o pocas líneas marcados `// golf`; el juego vive en archivos propios y no se tocan `fisica.js` ni
  `mesa-ui.js`.

## Migration Plan

Sin migración de datos. Se publica con el merge a `main` (Pages y Deno Deploy). Para retirar el golf basta quitarlo
de `JUEGOS`, `JUEGOS_PARTIDA` y `MESAS`; sus puntos quedan en el catálogo y su avance en el repo de datos.
