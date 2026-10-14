## Context

- `juegos/karts-pistas.js` define las 8 pistas (Catmull-Rom cerrada por `puntos`, `mitad` = medio ancho), sus
  mecánicas (`mecanicas` con `cerca: [x, y]`), sus adornos por tramo (`fijos`) y el río de La Venta. `juegos/arcade.js`
  muestrea cada trazado cada 8 px (`muestrearPista`) y calcula el tiempo de referencia (`refKarts` = largo × vueltas
  ÷ 200 px/s). Hoy: largo 3 989 a 4 418 px, radio mínimo 83 a 131 px, 3 vueltas, referencia de 60 a 66 s.
- `juegos/karts.html` pinta una textura del piso del tamaño de la caja del trazado (+220 px) y la proyecta en Mode-7;
  la carrera se simula en ese mapa 2D. Cajas, monedas, lava y adornos se colocan por fracción de la vuelta o al azar
  con semilla; el escenario (≤ 360 adornos) se recorre completo en cada cuadro y se descarta por distancia (1 600 px).
- Salas: `LIMITE_SALA.karts` = 300 s y `MIN_SALA.karts` = 15 s, iguales en `server/carreras.ts`
  (`CARRERAS.karts`), que además compara el tiempo con su reloj (±3 s / −20 s).
- Progreso de Karts (`server/progreso.ts`, forma exacta): `{ copas, records, piezas, equipo, copaEnCurso }`.

## Goals / Non-Goals

- Meta: vueltas ≈ 3 veces más largas en las 8 pistas, conservando su carácter y siendo manejables; todo lo que vive en
  la pista escala con ella; récords nuevos sin romper el progreso guardado; 60 fps con el CPU ×4 y 8 karts en vivo.
- Fuera: copas en sala (cambio `karts-copa-en-sala`), física nueva, pistas nuevas.

## Decisions

### 1. Trazados: escalar y agregar tramos (no solo escalar)
- Escalar ×3 conserva la forma pero triplica todos los radios (las curvas se vuelven rectas largas) y la caja llega a
  18 M px en el Volcán (más que los 16.7 M px que permite iOS a un lienzo). Por eso: escala ≈ 2.2–2.4× y **tramos
  nuevos hacia el interior** de cada circuito, que estaba vacío:
  - Pradera: lazo interior suave y una ese en la esquina de la meta.
  - Cañón: zigzag de cañón hacia el centro y una muesca en el costado izquierdo.
  - Lago Helado: lazo amplio de curvas largas (el hielo castiga las cerradas) y una ese suave.
  - Volcán: lazo sinuoso hacia el centro y una ese cerca de la meta.
  - Tenochtitlan: una calzada que entra al lago y vuelve (curvas en ángulo, como las calzadas).
  - Teotihuacan: la Calzada de los Muertos (recta de meta) sigue igual de larga; horquillas en la parte baja.
  - Chichén Itzá: el sacbé baja por el centro de la selva; el juego de pelota sigue en la recta de abajo.
  - La Venta: lazo que cruza el río por el centro de la selva.
- Los puntos se afinaron con una búsqueda local (mover cada punto de control ±30 px mientras baje un costo) con estas
  metas, que quedan como pruebas de Deno: largo 3× el original (±10 %), radio mínimo ≥ el de la pista original (en
  Volcán y La Venta, ≥ 100 px, más amplio que antes), tramos que se alejan 1 000 px por la pista separados ≥ 300 px en
  el mapa, recta de meta (< 0.25 rad) y caja ≤ 12.6 M px.

| Pista | Largo antes → ahora | Radio mín. antes → ahora | Caja (M px) |
|---|---|---|---|
| Pradera | 3 989 → 11 968 (3.00×) | 118 → 125 | 10.4 |
| Cañón | 4 221 → 12 664 (3.00×) | 124 → 131 | 11.6 |
| Lago Helado | 4 255 → 12 763 (3.00×) | 131 → 137 | 11.7 |
| Volcán | 4 418 → 13 257 (3.00×) | 83 → 100 | 12.5 |
| Tenochtitlan | 4 121 → 12 364 (3.00×) | 104 → 109 | 10.9 |
| Teotihuacan | 4 225 → 12 677 (3.00×) | 92 → 102 | 11.0 |
| Chichén Itzá | 4 042 → 12 132 (3.00×) | 120 → 139 | 10.2 |
| La Venta | 4 373 → 13 115 (3.00×) | 85 → 141 | 11.8 |

### 2. Vueltas: 2 en todas las pistas
- Con 3 vueltas la referencia sería de 3 a 3.3 min por carrera y una copa de 4 carreras pasaría de 13 min (más la
  espera entre carreras en sala). Con **2 vueltas** la referencia queda entre 1:59.6 (Pradera) y 2:12.5 (Volcán): una
  persona tarda ≈ 2 a 2.5 min y una copa ≈ 9 a 11 min, dentro de la meta del profe (2–3 min por carrera, copa de
  10–12 min). Cada pista lleva `vueltas: 2` en `juegos/karts-pistas.js` y `Arcade.vueltasDe(id)` la lee (por si algún
  día una pista necesita otra cantidad); `VUELTAS` se queda como valor por omisión (2).
- Lo que dependía de `A.VUELTAS` en `karts.html` (meta, «última vuelta», HUD, fantasmas, tiempo estimado de quien no
  llegó, vuelta de los karts remotos y ganchos de prueba) usa `vueltas`, la de la pista en curso.

### 3. Todo escala con la pista
- **Cajas de ítems**: de 3 filas de 4 a 7 filas (cada ~1/7 de vuelta); **monedas**: de 12 a 30 grupos de 3 (el tope de
  10 monedas por carrera no cambia). **Lava** (Volcán): un charco cada ~730 px (15), alternando orillas.
- **Mecánicas** (definidas en `karts-pistas.js`, todas sobre el camino y lejos de la meta):
  Tenochtitlan 3 trajineras (canales con periodo 5.2, 4.6 y 5.8 s, desfasados), Teotihuacan 9 rampas de turbo
  (4 en la Calzada de los Muertos, 3 en la recta baja y 2 en la del costado), Chichén Itzá 2 rampas con su cenote,
  La Venta 7 zonas de lodo. El código de la trajinera pasa de una sola (`trajinera`) a una lista (`trajineras`).
- **Adornos por tramo** (`fijos`): cabezas de serpiente a lo largo de toda la Calzada de los Muertos (`cada` 14),
  juego de pelota en la recta baja del sacbé, dos tramos de cabezas colosales en La Venta; el río de La Venta cruza
  el lazo nuevo.
- **Escenario al azar**: tope de 360 → 1 080 adornos (3 veces la vuelta) y 900 → 2 700 intentos; manchas del piso
  (pasto, arena, hielo, lava, hojarasca, brillos del agua) proporcionales al área de la textura.
- **Turbo de salida**: la carrera completa mide ≈ 2× lo de antes (2 vueltas × 3), así que el súper arranque pasa de
  1.3 a 2.3 s, el buen arranque de 0.8 a 1.4 s y el de los bots de 0.5 a 0.9 s (factor 1.8): la ventaja de salir bien
  pesa lo mismo en una carrera más larga. Los mini-turbos y los ítems no cambian (son de cada curva, no de la vuelta).
- **Minimapa**: mismo tamaño (124×92 y 104×72 en horizontal) con trazo de 3 px y borde de 5 px (antes 4 y 7) para
  que los tramos cercanos no se junten; la prueba exige ≥ 6 px entre tramos lejanos en el minimapa de 104×72.

### 4. Límites de sala y plausibilidad por pista
- `Arcade.limitesKarts(id)` → `{ minMs, limiteMs }`: `minMs` = 25 % de la referencia (la misma proporción que antes:
  15 s de una referencia de 60 s) y `limiteMs` = 2.5 × la referencia, redondeado a 10 s (300 a 340 s). Ni con turbo
  permanente (337 px/s) se baja de ≈ 60 % de la referencia, así que el mínimo no rechaza a nadie legítimo.
- `LIMITE_SALA.karts` = el límite mayor (340 s) para lo que no conoce la pista; `karts.html` y la página de la sala
  usan el de la pista.
- **Servidor**: `server/carreras.ts` importa `juegos/karts-pistas.js` y `juegos/arcade.js` (como `server/personajes.ts`
  importa `juegos/personajes.js`) y valida con `limitesKarts(mapa)` de la sala: una sola fuente de verdad, sin copiar
  números. Plataformas no cambia. `validarCarrera(juego, crudo, inicio, ahora, mapa)`.

### 5. Récords versionados
- Forma nueva del progreso (exacta): `{ copas, records, piezas, equipo, copaEnCurso, pistasV: 2, recordsV1 }`.
  `recordsV1` = los récords de las pistas chicas (mismas llaves y valores que `records`, ≤ 32). El servidor acepta
  también la forma anterior (5 llaves) para no romper a quien tenga una pestaña vieja abierta.
- Al recibir el progreso (`inicio`), `karts.html` migra: si `pistasV` no es 2, `recordsV1 = records`,
  `records = {}`, `pistasV = 2`, guarda y avisa «🏁 Las pistas ahora son 3 veces más grandes: tus récords anteriores
  quedaron como «pista chica».». Copas ganadas, piezas, equipo y copa en curso no se tocan (los puntos de copa no
  dependen del tamaño). En el selector, cada pista muestra su récord nuevo y, si hay, «pista chica 1:02.3».
- La pintura dorada ya ganada se queda; para ganarla de nuevo cuentan solo los récords nuevos.

### 6. Rendimiento
- La textura del piso sigue a 1 px de mundo por texel (con 2 px se ve borrosa a 3–5 px de pantalla cerca del carro).
  Caja ≤ 12.6 M px ⇒ ≤ 50 MB para el nivel 0 (+ 25 % de los niveles 1 y 2). El lienzo de trabajo se suelta al
  terminar (`capa` queda solo con su ancho y alto).
- **Escenario por celdas** de 512 px: `juntarVisibles` solo revisa las celdas a ≤ 1 600 px de la cámara, en vez de los
  1 080 adornos en cada cuadro. Monedas y cajas siguen con su alcance (900 y 1 100 px).
- El costo por cuadro del Mode-7 no depende del tamaño de la pista (un píxel de textura por píxel del búfer).
- Tope de adornos dibujados (ajuste tras la suite completa, cambio `karts-copa-en-sala`): solo los 150 más cercanos
  (`MAX_DECOR`; los lejanos ya se ven chicos y desvanecidos) y las cabezas de serpiente de la Calzada cada 18 muestras
  (antes 14): el costo de dibujar no crece con la pista. Con la máquina cargada (la suite completa y otra suite a la
  vez), las pistas con más adornos cercanos bajaban a 39–54 fps con CPU ×4.
- Medición: fps con CPU ×4 en cada una de las 8 pistas (E2E), y con 8 karts en vivo (`e2e-karts-vivo`).

### 7. Pruebas
- Deno (`server/karts_pistas_test.ts`): largo 3× (±10 %), radio ≥ el original, sin encimarse, separación en el
  minimapa, mecánicas sobre el camino, conteos de mecánicas, `vueltas`, límites por pista; `server/carreras_test.ts`
  con los límites nuevos; `server/progreso_test.ts` con la forma versionada y la anterior.
- E2E: vuelta completa con el piloto de prueba en pistas escaladas. Para no tardar 1 min por vuelta, el gancho de
  prueba `__karts.rapido(n)` corre n pasos de física por cuadro (la misma física y las mismas reglas, solo más pasos;
  el reloj de la carrera sigue siendo el real). Solo existe con `?prueba=1`.

## Risks / Trade-offs

- Memoria: ≈ 60 MB de texturas por pista en un celular. Mitigación: caja acotada y lienzo de trabajo liberado;
  alternativa futura: textura por mosaicos solo cerca del camino.
- Tiempo de preparación de la pista (pintar 12 M px): se mide en la E2E con CPU ×4; ocurre antes de la cuenta
  regresiva (en sala hay 5 s de cuenta del servidor).
- Récords: quien tenía récords los pierde como récords vigentes (quedan archivados). Es lo justo: no son comparables.
