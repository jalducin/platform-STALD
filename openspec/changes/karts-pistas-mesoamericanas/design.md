## Context

«Karts Turbo» (`juegos/karts.html`, pseudo-3D Mode-7 del cambio `karts-pseudo3d`) simula en un mapa 2D: cada pista
es una curva Catmull-Rom cerrada por puntos de control (`Arcade.muestrearPista`, muestras cada 8 px) con medio ancho
`mitad`. Hoy el trazado y la física de las 4 pistas viven en `juegos/arcade.js` (que también usan las salas de
`juegos.html`) y la paleta del cielo (`TEMAS`) y el escenario (`DECOR_POR_PISTA`) en `juegos/karts.html`. El servidor
solo conoce las 4 pistas de sala (`server/carreras.ts`, `MAPAS_SALA`).

## Goals / Non-Goals

- **Goals:** 4 pistas nuevas con identidad visual y una mecánica barata y determinista cada una; Copa Mesoamericana;
  las definiciones en un archivo de datos; 60 fps con CPU ×4.
- **Non-Goals:** pistas nuevas en salas (exigiría cambiar el servidor y la coordinación con 27A); personajes (28a);
  nuevas piezas del taller.

## Decisions

### 1. `juegos/karts-pistas.js` como fuente única de las pistas
Script clásico (igual que `arcade.js`, sin módulos ni build) que publica `KartsPistas = { PISTAS, COPAS,
encuadrarMinimapa, enZona }` en `window`/`globalThis` (así también lo importan las pruebas de Deno). Cada pista
lleva: `id, nombre, emoji, desc, civ, sala, mitad, fuera, lento, agarre, color, tema, decor, puntos` y, las nuevas,
`mecanicas`. `arcade.js` lo lee al cargar: `PISTAS` = las que tienen `sala: true` (las 4 de siempre, igual que el
servidor) y `pistaPorId` busca en todas. Por eso `juegos.html` y `karts.html` cargan `karts-pistas.js` **antes** de
`arcade.js`. Alternativa descartada: meter las 8 en `Arcade.PISTAS`, porque el selector de mapa de sala
(`juegos/app/arcade.js`) y `Arcade.mapaDeSala` ofrecerían pistas que el servidor rechaza.

### 2. Mecánicas por zonas a lo largo de la pista
Cada mecánica se declara con la fracción de la vuelta donde está (`f`), su lado (`lado`, en veces `mitad`) y su
largo/radio. Al preparar la pista se convierten a puntos del mapa. En cada paso (60 Hz) se revisa con distancias al
cuadrado contra 1–6 zonas: costo despreciable. Todas dependen solo de la posición y de `tCarrera`, así que son
deterministas:
- `trajinera` (Tenochtitlan): canal que cruza la calzada en `f`; la trajinera recorre el canal de lado a lado con
  `lado(t) = sen(2πt/periodo) · (mitad + 70)`. Choque (radio 20 px) → `golpear(k)` (gira y pierde 2 monedas).
- `turbo` (Teotihuacan): placa en la calzada; al pisarla, `k.turbo = max(k.turbo, 0.7)`.
- `salto` + `cenote` (Chichén Itzá): rampa; si se pisa a más de 140 px/s, el kart queda en el aire 0.55 s (sin
  frenarse por el piso, se dibuja más alto). El cenote, justo después, frena a 45 % solo a quien va en el suelo.
- `lodo` (La Venta): manchas que bajan la velocidad punta a 55 % (la estrella lo ignora).

### 3. Escenario y cielo
Los adornos nuevos son sprites con dibujo propio (ahuejote, maíz, canoa amarrada, maguey, cabeza de serpiente
emplumada, estela, ceiba, palma, muro del juego de pelota con su aro, cabeza colosal, helecho, altar). Los que dan
identidad a un tramo (cabezas de serpiente en la calzada, muros del juego de pelota, cabezas colosales) se colocan en
posiciones fijas a lo largo de la pista; el resto, al azar con la semilla de la pista (como hoy). El cielo de 360°
agrega una silueta por pista con funciones de dibujo por id: Templo Mayor (doble templo) con los volcanes,
pirámides del Sol y de la Luna con el Cerro Gordo, El Castillo con su escalinata y templo, y la gran pirámide de
tierra de La Venta con dosel de selva. El agua (lago, canal, cenote, río) y el lodo se pintan en la textura del
piso una sola vez.

### 4. Copas
`COPAS = [fiesta, mesoamericana]`. `prog.copaEnCurso.copa` dice cuál está en curso; si falta (progreso viejo) es
`fiesta`. `prog.copas[id]` guarda el mejor resultado de cada una. Bono y piezas iguales para ambas. La pintura
dorada sigue pidiendo los récords de las 4 pistas de la Copa Fiesta (no se endurece una regla ya ganada).

### 5. Respeto cultural
Siluetas y adornos sobrios, inspirados en la arquitectura y el arte (talud-tablero, escalinatas, serpiente emplumada
de la Ciudadela, cabezas colosales con casco), sin caras burlonas ni estereotipos de personas. Textos en español de
México.

## Risks / Trade-offs

- **Bots y obstáculos:** la trajinera puede golpear a bots; es parte del juego y es igual para todos.
- **Conflictos con 27A y 28a:** los cambios en `karts.html` se concentran en el bloque de pistas, escenario, cielo,
  copa y selector; antes del PR se mezcla `origin/main` conservando ambos lados.
- **Rendimiento:** la textura del piso y el panorama se pintan una vez por pista; los sprites nuevos se cachean
  como los de siempre.
