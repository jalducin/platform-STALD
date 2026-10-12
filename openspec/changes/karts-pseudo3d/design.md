## Context

`juegos/karts.html` (canvas, paso fijo 1/60 s, embebido en `juegos.html` por iframe) simula la carrera en un mapa 2D
(`juegos/arcade.js`: pistas Catmull-Rom muestreadas cada 8 px) y la dibujaba desde arriba con la cámara siempre al
norte. El cambio `karts-controles-diseno` (en `main`, sin archivar) arregló la entrada táctil (touch events no
pasivos) y agregó joystick, sensor, selector y minimapa. El profe sigue reportando «no funciona bien» y pide la
experiencia pseudo-3D de su referencia.

## Diagnóstico (antes del cambio)

Script de Playwright con `hasTouch` + `isMobile`, dentro de `juegos.html` (iframe) a 360×740, 390×844 y 844×390, y
`juegos/karts.html` suelto a 390×844; CPU ×4 con `Emulation.setCPUThrottlingRate`.

| Revisión | Resultado |
| --- | --- |
| Marco del juego | 328×620 (360), 358×724 (390) y **720×250 en horizontal** dentro de Juegos |
| Área lógica | 270×392, 270×437 y 560×270 |
| Pista visible por delante | **~135 px de mundo = 0.54 s** a velocidad punta, en todos los tamaños |
| Sin girar, velocidad cada 0.6 s | 138, 138, 138, 225, 250, 202, 138… (se sale en la 1.ª curva y se queda en el pasto) |
| Rendimiento | 60 fps con CPU ×4 en todos los tamaños (no era el problema) |
| Menú en horizontal | el título queda cortado arriba y no se puede desplazar (`justify-content: center` + overflow) |
| Minimapa | «TÚ» desaparece del mapa si el carro se aleja de la pista |

Conclusiones (qué estaba mal):
1. **Cámara y legibilidad (lo principal):** la vista cenital con cámara fija al norte hace que, al ir hacia abajo o
   a la izquierda, ◀ y ▶ se sientan invertidos respecto a la pantalla, y con 0.54 s de pista visible no hay tiempo de
   ver la curva: el carro termina en el pasto (no se «atora»: frena a 55 % y sigue, pero no se entiende hacia dónde
   regresar).
2. **Espacio en horizontal:** dentro de Juegos el juego mide 250 px de alto y el joystick tapa parte de la pista.
3. **Controles:** el joystick por omisión no es lo que el profe espera; quiere ⬅ ➡ grandes, y acelerar/frenar.
4. **Colisiones:** sin fallas (empuje suave entre carros, rescate de lava correcto); se conservan.

## Goals / Non-Goals

**Goals:** experiencia pseudo-3D legible en celular (vertical y horizontal) y PC, 60 fps, botones claros por
omisión, ACELERAR opcional, tutorial, capa de acciones para un mando futuro, mismas reglas y mismos mensajes.

**Non-Goals:** cambiar física, tiempos, ítems, bots, copa, taller, el mensaje de sala o el formato del progreso;
tocar `arcade.js` o el servidor; depender de `juegos/mando.js` (todavía no existe en `main`).

## Decisions

### 1. Render Mode-7 sobre el mapa 2D
- La simulación no cambia. Por cuadro, `seguirCamara` acerca el ángulo de la cámara al rumbo del carro
  (`1 − e^(−6.5·dt)` aprox.; 9 con `prefers-reduced-motion`) y la pone `d = 115` px de mundo detrás. Al dar vueltas
  por un golpe la cámara no gira; al rescatar de la lava se reubica.
- Cámara sin inclinación: fila del horizonte `hy` (36 % en horizontal, 40 % en vertical), distancia focal
  `F = LW / (2·tan(½FOV))` (½FOV 0.6 rad horizontal, 0.52 vertical) y altura `h = (yK − hy)·d/F`, donde `yK` es la fila
  donde debe quedar tu carro (83 % / 80 %). Así el carro siempre cae en el mismo lugar de la pantalla.
- Piso: búfer `ImageData` de a lo más 400 px de ancho; por fila `z = h·F/(y − hy)` y se recorre la textura en línea
  recta (`Uint32Array`, sin `getImageData` por cuadro). Tres niveles de textura (1, ½, ¼) según los px de mundo por
  píxel, para que lo lejano no parpadee. Se escala al canvas con `imageSmoothingEnabled = false` (look pixelado).
- Textura por pista (una vez): fondo del tema, franjas alternas del pasto cada 40 px a lo largo de la pista
  (sensación de velocidad), piano rojo/blanco, asfalto con grano y bandas, líneas, casillas, meta a cuadros y lava.
- Cielo: panorama de 360° (1 rad = F px, igual que el piso) con degradado, sol o estrellas, nubes y dos capas de
  montañas hechas con senos de frecuencia entera (empatan al dar la vuelta); el lienzo lleva una copia extra de una
  pantalla para dibujarlo con un solo `drawImage` sin costuras. Volcán con cráter y humo; cumbres nevadas en hielo;
  mesetas en el desierto.
- Sprites (billboards) ordenados de lejos a cerca: escenario por pista (≤360 objetos, recorte por campo de visión y
  1600 px), monedas que giran, cajas que flotan, objetos (cáscara, bola, cohete), arco de META, partículas y carros.
  Bruma en el horizonte y desvanecido de 1100 a 1600 px.
- Carros: modelo de cajas (llantas, pontones, carrocería, nariz, motor, escapes, piloto, alerón con número) proyectado
  en 32 vistas según el ángulo relativo carro–cámara y la inclinación de la cámara; se pre-dibujan bajo demanda y se
  reutilizan. Tu carro se dibuja siempre encima (los que quedan entre la cámara y tú, translúcidos), se inclina con
  el volante y el derrape y vibra a toda velocidad (sin esto con movimiento reducido). Rayo = carro más chico.
- Alternativas descartadas: WebGL (más código, riesgo en celulares viejos y sin necesidad: 60 fps con canvas 2D) y
  pseudo-3D por segmentos tipo OutRun (exige rehacer las pistas como segmentos y cambiaría la simulación).

### 2. Controles
- Por omisión en celular: **Botones** (⬅ ➡ de 72×100 px a la izquierda; a la derecha 🎁, FRENO y DERRAPE en una
  rejilla de 2×2, con DERRAPE de dos filas). Con «👆 Con botón» aparece **ACELERAR** y DERRAPE ocupa una fila. Caben
  desde 320 px (rejilla de 56 px y flechas de 58×92 abajo de 340 px). Joystick y sensor siguen en el selector; si el
  sensor falla se regresa a Botones (el control por omisión).
- `localStorage.karts_acelerar` = `auto` (por omisión, la regla de siempre) o `manual`. En manual, sin ACELERAR el
  objetivo de velocidad es 0 con la misma desaceleración de antes; nada más cambia.
- Teclado: ←/A, →/D, ↑/W acelerar, ↓/S frenar, ESPACIO derrape, E/Shift/X/K ítem, P/Esc pausa (antes ↑/W y Shift
  derrapaban; X sigue funcionando).
- Turbo de salida: cuenta el primer toque de DERRAPE **o** ACELERAR durante la cuenta (ventanas sin cambio).
- Tutorial `#tuto` de 3 s durante la cuenta regresiva, según el aparato y el control, sin bloquear; los mandos
  brillan mientras tanto (sin animación con movimiento reducido).
- «↩ ¡Vas al revés!» si el rumbo va contra la pista más de 0.8 s (solo aviso).

### 3. Capa de acciones
- `ACCIONES = acel, freno, izq, der, derrape, item, pausa` + eje de giro. Fuentes internas: teclado y botones táctiles
  (con pulso al presionar, para no perder toques más cortos que un cuadro), joystick y sensor (eje). Fuentes
  externas: `window.KartsEntrada.registrar({ presionado(accion), eje() })` (devuelve una función para quitarla); sus
  flancos se revisan una vez por cuadro. Mapeo sugerido para el mando común: A = acel, B = freno, R = derrape,
  L/X = item, START = pausa, cruceta/palanca = dirección.

### 4. Juegos en horizontal
- `juegos.html`: `@media (orientation: landscape) and (max-height: 520px)` → `.arcade-caja:has(#arcade-frame)` mide
  `100dvh − 16px` y al abrir el juego se hace `scrollIntoView`. Solo Arcade (plataformas y karts); Dragon Run no.
- `.ov` usa `justify-content: safe center` para que el menú se pueda desplazar desde arriba.

## Risks / Trade-offs

- [El piso pixelado cerca de la cámara] → es el estilo Mode-7; el búfer se limita a 400 px para sostener 60 fps.
- [Sprites 3D por ángulo ocupan memoria] → se crean bajo demanda (normalmente 2–4 vistas por carro) y la caché se
  separa por inclinación de cámara.
- [`:has()` en navegadores viejos] → sin soporte, el marco queda como antes (250 px); el juego sigue funcionando.
- [Los objetos del escenario no chocan] → igual que antes (decoración): se puede pasar entre árboles.

## Migration Plan

Solo estáticos; se publica con el merge a `main`. Archivar `karts-controles-diseno` antes que este cambio.
