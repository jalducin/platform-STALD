## Context

Los juegos de Arcade (`juegos/plataformas.html`, `juegos/karts.html`) son páginas con canvas a paso fijo de 1/60 s
embebidas en `juegos.html` por un iframe del mismo origen; hablan con la plataforma solo por `postMessage`
(`listo` → `inicio`, `puntos` → `puntos-ok`, `meta` en sala). Las salas (`server/salas.ts`) guardan un archivo JSON
por jugador en el repo privado (GitHub o Postgres según el entorno) y, si hay Supabase Realtime, publican el estado
tras cada escritura; si no, la página consulta cada 2.5 s. Los juegos por turnos (¡Una!, póker, Brisca, Conquián,
ajedrez) mandan `jugada { n, … }`; el servidor solo valida la forma y que nadie más tenga el paso `n`
(`turno_tomado`), y cada cliente reproduce la partida con la semilla (los bots se calculan en el cliente).

## Goals / Non-Goals

**Goals:** dos juegos de física con arte propio, individual contra bot y sala 1 vs 1 que se reproduzca idéntica en
todos los aparatos; controles táctiles que funcionen dentro del iframe; 60 fps; 360/390 px en vertical y horizontal;
`prefers-reduced-motion`.

**Non-Goals:** guardar avance individual (no hay `/juegos/progreso` para estos juegos), torneos, más de 2 personas
por mesa, reglas completas de la WPA (bola en mano libre, cantar tronera), tiempo real de 60 fps en sala.

## Decisions

### 1. Futbolito en sala: modo por tiros (no tiempo real)
Evaluación de la latencia del modelo de salas:
- cada jugada es una escritura condicional de un archivo en el repo de datos (`store.put`, 0.3–1.5 s con GitHub) y
  Realtime publica el estado **después** de esa escritura; sin Realtime, el sondeo es de 2.5 s;
- un futbolito en tiempo real necesita intercambiar la posición de las barras 15–30 veces por segundo con menos de
  100 ms de retraso: serían cientos de escrituras por minuto por sala (límite de la API de GitHub) y aun así el
  rival vería la pelota con 1–3 s de atraso.
Decisión: **modo por tiros**, determinista. Quien tiene la pelota (posesión) elige `pos` (corrimiento lateral de
la barra que la tiene, la pelota va con su jugador), `angulo` (−60…60°, 0 = derecho a la portería rival) y
`fuerza` (10–100). El tiro se simula completo en cada aparato con el mismo motor:
- las barras de **los dos equipos** se mueven con la misma defensa automática (siguen la `x` de la pelota con
  velocidad máxima fija); las del equipo que tira se «levantan» (no chocan) mientras la pelota va hacia la portería
  rival, como cuando alguien levanta sus barras, y vuelven a chocar si la pelota regresa;
- termina con gol o cuando la pelota se frena junto a una barra (o a los 10 s): la posesión pasa a esa barra y a su
  equipo; si es del mismo equipo, vuelve a tirar;
- tras un gol saca el equipo que lo recibió, desde sus medios. Gana quien llega a 5.
Alternativas descartadas: tiempo real con Realtime *broadcast* desde el cliente (hoy solo publica el servidor tras
validar; que publiquen las páginas dejaría sin validación ni registro lo que pasa en la sala y cambiaría el modelo
de amenaza del cambio `salas-realtime`); penales por turnos (pierde las barras y el rebote, que son el juego).

### 2. Billar en sala: tiros deterministas
Cada tiro es `{ n, accion: "tiro", angulo, fuerza, efecto }` con enteros: `angulo` en décimas de grado (0–3599),
`fuerza` 1–100 y `efecto` −100…100 (negativo = retroceso, positivo = seguir). `{ n, accion: "rendirse" }` termina la
partida. El servidor no simula; cada aparato reproduce todos los tiros desde la semilla (el orden del triángulo sale
de `fisica.rng(seed, "billar-triangulo")`).

### 3. Determinismo entre navegadores
- Solo operaciones IEEE exactas (`+ − * /` y `Math.sqrt`) en la simulación. `Math.sin`, `Math.cos`, `Math.atan2`,
  `Math.hypot` y `Math.pow` pueden diferir en el último bit entre motores (V8, JavaScriptCore), así que
  `juegos/fisica.js` trae `senCos(decimas)` (serie de Taylor con reducción por cuadrantes) y `atan2Dec(y, x)` (serie
  con reducción a |t| ≤ tan 22.5°), ambos solo con aritmética básica.
- Paso fijo: Billar 4 subpasos de 1/240 s por cuadro; Futbolito 3 de 1/180 s. Orden fijo de bolas y pares.
- Tras cada tiro, posiciones redondeadas a milésimas (`q`) y velocidades en cero: el estado de partida de cada tiro
  es exactamente el mismo aunque hubiera una diferencia mínima.
- La animación usa el mismo objeto de simulación que la reproducción instantánea (`crearSim(st, tiro).paso()`), así
  que lo que se ve y el resultado son lo mismo.
- Prueba con Deno: reproducir dos veces la misma lista de tiros da el mismo estado (bit a bit, `JSON.stringify`).

### 4. Línea de turnos de sala (`Fisica.linea`)
Función pura compartida por los dos juegos (en `juegos/fisica.js`):
`linea({ motor, seed, orden, jugadas, inicio, ahora, turnoMs, botMs, gracia, cache })` →
`{ estados, tiros, fin, turno, paso, limite, … }`.
- `paso` = número de tiros aplicados; la jugada humana válida es la del jugador en turno con `n === paso` y
  `t ≤ T0 + turnoMs` (`T0` = fin del tiro anterior, en hora del servidor: `t` del tiro + duración simulada).
- Turno de un bot: tira en `T0 + botMs` con `motor.tiroBot(st, nivel, rng(seed, "bot|" + paso))`.
- Si nadie tira a tiempo (`ahora ≥ T0 + turnoMs + gracia`), se aplica un tiro automático (el del bot fácil) en
  `T0 + turnoMs`. La gracia evita que un aparato adelante el tiro automático antes de recibir una jugada a tiempo.
  Futbolito: 30 s por tiro; Billar: 60 s.
- Caché por prefijo (firma de los tiros) para no volver a simular la historia en cada cambio.
- `rendirse` del jugador en turno termina la partida a favor del otro.

### 5. Puente de sala en `juegos.html` (`pintarFisicaSala`)
El juego vive en el iframe (como Arcade). `juegos.html`:
- al `listo` responde `inicio { modo: "sala", seed, inicio, ahora, yo, orden, jugadas }` (`orden` = los 2 de la
  mesa de `participantes()`: personas y, si falta, el bot);
- en cada cambio de la sala manda `jugadas { jugadas, ahora }` (solo si cambió su firma);
- `jugada { jugada }` del iframe → `POST /respuesta { jugada }` y responde `jugada-ok { ok, error }`; con error el
  iframe se resincroniza con lo que diga el servidor;
- `fin { gana, puntos, titulo, aciertos, total }` → `pintarFinalSala` con los puntos de cada lugar (topados a 1000) y
  la revancha. El fin lo calcula el iframe con el motor (mismo origen y mismo código en todos los aparatos); el
  servidor topa los puntos con el catálogo, como en los demás juegos de sala.
- Sondeo de 2.5 s (`TIEMPO_REAL`) o Realtime.

### 6. Servidor
- `JUEGOS_PARTIDA` += `futbolito`, `billar`; `MESAS` += `{ max: 2, asientos: 2, min: 2 }` para los dos (igual en
  `juegos/mesas.js`). Sin `bots` fijo: lo decide quien crea la sala; con bots, 1 persona + 1 bot.
- `validarJugada`:
  - `futbolito`: `{ n, accion: "tiro", pos: entero −150…150, angulo: entero −60…60, fuerza: entero 10…100 }` o
    `{ n, accion: "rendirse" }`;
  - `billar`: `{ n, accion: "tiro", angulo: entero 0…3599, fuerza: entero 1…100, efecto?: entero −100…100 }` o
    `{ n, accion: "rendirse" }`; otros campos se descartan.
- **Fin de partida:** en `futbolito` y `billar`, si algún jugador ya mandó `final` (o el host `podio`), una jugada
  nueva responde 409 `partida_terminada`.
- `CATALOGO`: `futbolito` («Futbolito») y `billar` («Billar bola 8»), categoría `arcade`, tope 1000.

### 7. Futbolito: física y controles
- Mesa de 300 × 480 unidades; porterías de 90; 8 barras cada 60 (desde arriba: portero 1, defensa 2 y medios 5 del
  rival intercaladas con delanteros 3, medios 5, defensa 2 y portero 1 tuyos). Jugadores = círculos de radio 9;
  pelota de radio 6. Rebote en paredes (0.85) y en jugadores (0.6), fricción y **pendiente** suave hacia la línea de
  barra más cercana cuando la pelota va lenta (como las mesas reales con hundimiento), y en las esquinas de las
  porterías, para que nunca quede fuera del alcance.
- Patada: giro del jugador de 0.18 s; si la pelota está al alcance, sale hacia la portería rival con un ángulo según
  dónde la toque el pie (±35°) y la velocidad lateral de la barra.
- Individual: la barra activa es la tuya más cercana detrás de la pelota; deslizar el dedo (relativo) en la mitad
  de abajo mueve la barra activa; un toque corto patea. Tus otras barras siguen la pelota solas, más despacio
  (asistencia). Teclado: ← → / A D y Espacio. Bot: Fácil, Medio y Difícil cambian velocidad de barras, reacción,
  error y fuerza.
- Puntos (individual y sala): 60 por gol + al ganar 200/350/500 (Fácil/Medio/Difícil; en sala, 350); tope 1000.

### 8. Billar: física, reglas y controles
- Mesa de 1000 × 500, bolas de radio 11, troneras en esquinas (captura 26) y a media banda (22). Choques elásticos
  entre bolas (restitución 0.95), bandas 0.75, desaceleración de 500 u/s² y alto bajo 4 u/s. Fuerza 1–100 →
  315–1800 u/s. Efecto: al primer choque de la blanca se suma `efecto/100 · 0.5 · rapidez` en la dirección del tiro
  (positivo sigue, negativo regresa).
- Reglas básicas: rompe quien está primero en la mesa; la mesa está abierta hasta que alguien mete una bola sin
  falta (esa define su grupo; si mete de los dos tipos, cuenta la primera). Falta: meter la blanca, no tocar
  ninguna bola o tocar primero una que no es de tu grupo (con mesa abierta, la 8). Con falta el turno pasa y la
  blanca, si cayó, vuelve a su punto (o al lugar libre más cercano). Sigues tirando si metes una de tu grupo sin
  falta. Meter la 8 con tu grupo completo y sin falta gana; antes de tiempo o con falta, pierde.
- Controles: arrastrar sobre la mesa apunta (línea guía con el primer choque y la desviación de la bola tocada);
  la fuerza sale de lo largo del arrastre o de la barra; botón de efecto (⬆ seguir · ● sin efecto · ⬇ retroceder);
  «Tirar». La mesa se dibuja vertical en celular de pie y horizontal en apaisado.
- Bot: busca, para cada bola válida y cada tronera, el tiro de «bola fantasma» con camino libre y menor corte;
  agrega error según el nivel. Puntos: 30 por bola propia metida + al ganar 500 y 10 por bola del rival que quedó
  (+100/+200 en Medio/Difícil individual); tope 1000.

### 9. Capa de acciones (pedido del integrador: mando común de Arcade)
La entrada de los dos juegos pasa por `MesaUI.crearAcciones` (acciones con nombre: sostenidas, de pulso y un eje
analógico −1…1). El teclado es un adaptador; un mando (el futuro `juegos/mando.js`, que aún no está en `main`) se
conectará con un adaptador que llame `window.accionesJuego.presionar(nombre, on)` y `ponerEje(v)`, sin depender de él
ahora. Los toques directos (arrastrar, tocar, resortera) siguen aparte.
- Futbolito: `barraMenos`/`barraMas` (o el eje) mueven la barra a lo largo de su eje (← → en vertical, ↑ ↓ en
  horizontal), `cambiarBarra` (K; la automática espera 1.5 s), `patear` (Espacio/J; en sala, tirar) y `pausa`
  (P/Esc/Enter).
- Billar: `apuntarMenos`/`apuntarMas` o el eje (← →; giro fino cerca del centro), `fuerzaMenos`/`fuerzaMas` (↓ ↑),
  `tirar` (Espacio/J), `efecto` (K) y `pausa` (P/Esc/Enter).

## Risks / Trade-offs

- [Diferencias de punto flotante entre navegadores] → matemática propia, paso fijo, redondeo tras cada tiro y
  pruebas de determinismo con Deno.
- [El tiro automático por tiempo puede adelantarse en un aparato] → gracia de 3 s y la línea se recalcula desde las
  jugadas del servidor: si cambió, el iframe se resincroniza.
- [Futbolito por tiros se siente distinto al individual] → misma mesa, misma física y mismos jugadores; se explica
  en «Cómo se juega».
- [Varios agentes tocan `juegos.html`, `server/salas.ts`, `server/juegos.ts`, `juegos/mesas.js`] → cambios chicos y
  localizados con el comentario `// futbolito-billar`; los juegos viven en archivos propios.

## Migration Plan

Sin migración de datos. Se publica con el merge a `main` (Pages y Deno Deploy). Para retirar los juegos basta
quitarlos de `JUEGOS`, `JUEGOS_PARTIDA` y `MESAS`; sus puntos quedan en el catálogo.
