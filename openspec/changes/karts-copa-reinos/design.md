## Contexto

Karts Turbo dibuja la carrera en Mode-7: un piso plano texturizado (una textura por pista, pintada una vez), un cielo
de 360° (panorama) y sprites que miran a la cámara. La física corre en el mapa 2D y no sabe de alturas. Las pistas
viven en `juegos/karts-pistas.js` (lo importan la página, la página de Juegos y el servidor). Desde
karts-pistas-grandes cada vuelta mide ≈ 12 000 a 13 300 px, 2 vueltas, y el escenario se agrupa en celdas de 512 px
con un tope de 150 adornos por cuadro.

«Carreras por dentro» en un motor plano obliga a fingir el interior: muros verticales dibujados como cuadriláteros en
3D (no sprites), un cielo distinto mientras la cámara va adentro y luz limitada. Este documento explica cómo.

## 1. Trazados

Cada pista se define igual que las demás (`puntos` Catmull-Rom, `mitad`, `vueltas: 2`) y además:

- `interiores: [{ desde, hasta, ancho, muro }]`: tramos interiores entre las muestras más cercanas a `desde` y
  `hasta` (igual que `fijos`). `ancho` = medio ancho entre muros en veces `mitad` (0.8 a 1). `muro` = `0` (dos muros),
  `1` o `-1` (solo el muro de ese lado: una cámara abierta donde se ve el centro, como el trono del jaguar).
- `obstaculos` (columnas fijas en el camino) y `mecanicas` con los tipos nuevos.

`KartsPistas.tramosInteriores(pista, M)` devuelve los tramos en muestras y `KartsPistas.muroEn(pista, M)` un arreglo
por muestra con el medio ancho del muro (0 = afuera); los usan la página, las pruebas y el minimapa. Restricciones
(probadas en `server/karts_pistas_test.ts`): cerrada, sin encimarse (≥ 2·mitad + 30 px entre tramos lejanos), radio
mínimo ≥ 100 px, meta en recta y AFUERA, referencia de 115 a 140 s, textura ≤ 12.6 M px, minimapa legible y cada tramo
interior de al menos 600 px.

Identidad de cada pista (sin duplicar el Sacbé de Chichén Itzá, que es selva y juego de pelota al aire libre):

| Pista | Afuera | Adentro | Mecánicas |
|---|---|---|---|
| Gran Pirámide de Giza 🔺 | Desierto con las tres pirámides en el horizonte | Corredor descendente, Gran Galería (recta larga con techo escalonado), cámara del rey | arena, bloques |
| Interior de El Castillo 🐍 | Plaza con la serpiente de luz del equinoccio | Escaleras interiores en zigzag, templo interior con el trono del jaguar rojo (cámara abierta) | luz, compuertas |
| Templo de Karnak 🏛️ | Avenida de esfinges y lago sagrado | Sala hipóstila (columnas gigantes en el camino: slalom), santuario | columnas, compuertas |
| Galerías de Angkor Wat 🛕 | Calzada sobre el foso, selva con raíces | Galerías de bajorrelieves (columnata a un lado) | roca rodante, bloques, arena |

## 2. Interiores en Mode-7

**Piso.** En la textura, cada tramo interior se repinta: banda ancha casi negra (lo que queda tras los muros), losas
de piedra oscura entre los muros con juntas, y charcos de luz cálida al pie de cada antorcha (horneados: costo 0 por
cuadro).

**Muros.** Segmentos de 4 muestras (32 px) a cada orilla, de 150 px de alto (más alto que la cámara, así el borde de
arriba queda sobre el horizonte y tapa lo que hay detrás). Cada segmento es un cuadrilátero proyectado con
`proyectar()`, recortado en el plano cercano, ordenado con los sprites por la distancia de su centro y pintado con un
color de una paleta precalculada (16 tonos) según la luz de la antorcha más cercana (horneada por segmento) y la
niebla por distancia. Los segmentos se agrupan en celdas de 512 px; las celdas lejanas (> 700 px) usan segmentos de 16
muestras. Desde afuera los muros se ven como la masa del monumento. En cada entrada hay una portada (dos jambas y un
dintel), dibujada como el arco de META.

**Cielo interior.** Un segundo panorama (bóveda de piedra con hiladas, falso arco y antorchas) que se dibuja encima
del de afuera con opacidad `dentro` (0 → 1 en ≈ 0.35 s al entrar; con movimiento reducido cambia de golpe). La niebla
del horizonte pasa a casi negro y los sprites se desvanecen entre 550 y 900 px (afuera, 1 100 a 1 600 px).

**Luz limitada.** Viñeta precalculada (un `drawImage` por cuadro, opacidad `dentro`) y el brillo de cada antorcha
visible con un sprite de resplandor en modo `lighter`. Las antorchas parpadean (seno determinista) solo sin
`prefers-reduced-motion`.

**Física de los muros.** Tras mover el kart, si su muestra tiene muro y la distancia lateral pasa de `muro − 9` px,
el kart vuelve a la orilla, pierde la velocidad hacia el muro (rebote con restitución 0.25) y, si el golpe fue fuerte,
su velocidad baja a ×0.7 (una vez cada 0.4 s). Aplica igual a la persona y a los bots locales; los fantasmas y las
personas remotas no chocan (como hoy). Dentro de un interior nunca se está «fuera del camino» porque el muro queda
antes de la orilla.

## 3. Dificultad (justificación)

| Factor | Mesoamericana | Reinos Antiguos |
|---|---|---|
| Medio ancho del camino | 56–58 px | 50 px afuera, 40–50 px adentro |
| Radio mínimo | ≥ 100 px (algunas curvas amplias) | ≥ 100 px con más curvas cerradas y eses |
| Fallar | salirse frena (×0.42–0.5) | adentro el muro frena (×0.7) y rebota |
| Obstáculos | 1 tipo por pista | 2 a 3 tipos por pista, con columnas y compuertas que obligan a elegir carril |
| Bots (individual) | habilidad 0.87–0.95 × dificultad | lo mismo × 1.03 (`bots` de la pista) |

Es justa porque: (1) todo obstáculo es determinista y se ve antes (sombra del bloque que crece 1 s antes de caer;
compuerta que avisa con su posición; la roca es grande y lenta); (2) los muros no tumban, solo frenan; (3) nadie
queda fuera de la pista (no hay lava ni caídas); (4) los bots también chocan con los muros y las columnas y esquivan
con la misma regla que el piloto de prueba; (5) la copa se abre al terminar la anterior (no al ganarla).

En salas los fantasmas conservan su tiempo de referencia (no se aceleran): la sala es para jugar en grupo y la pista ya
es más difícil por sí misma.

## 4. Mecánicas (deterministas)

Funciones puras en `juegos/karts-pistas.js` (probadas en Deno), con el reloj de la carrera `t`:

- `bloques`: `alturaBloque(z, t)`: ciclo `periodo` con `desfase`; escondido, baja despacio (sombra de aviso), cae y
  queda en el piso 0.5 s. Peligro si la altura < 20 px: golpe (giro y −2 monedas).
- `roca`: `ladoRoca(z, t)`: va y viene de muro a muro (seno, como la trajinera, pero dentro de los muros). Choque a
  < 24 px: golpe.
- `compuerta`: `centroCompuerta(z, t)`: una losa de medio ancho que se desliza de un lado al otro (pausa, 0.6 s de
  deslizamiento, pausa). La losa detiene al kart (vuelve 3 muestras y queda a ×0.35): no tumba.
- `arena`: como el lodo (tope ×0.6), dibujada con dunas.
- `luz`: franja de luz (triángulos de la serpiente del equinoccio): turbo como la placa de Teotihuacan.
- `obstaculos` (columnas): círculos fijos de radio 15 sobre el camino; empujan hacia afuera y frenan (×0.6).

Esquivar (bots y piloto de prueba): si a menos de 60 muestras hay una columna, una compuerta cerrada o una roca, el
carril objetivo pasa al lado libre; si no, el de siempre.

## 5. Copa y desbloqueo (para niñas, niños y adolescentes)

- Individual: `requiere: 'mesoamerica'` en la copa. Se abre al **terminar** la Copa Mesoamericana en cualquier lugar
  (`prog.copas.mesoamerica` existe). Terminarla ya pide ≈ 10 min de juego; pedir ganarla dejaría fuera a quien juega
  menos o está aprendiendo, y la frustración aleja a los más chicos. Mientras tanto se ve con candado y el motivo (la
  meta es clara y alcanzable). Sus pistas siempre están en la carrera rápida para practicar.
- Salas: siempre abiertas. Las decide la anfitriona (a veces el profe) para el grupo; no dependen del avance de cada
  quien y no se pueden «atorar» por una persona.
- **Nota para el sprint 35 (Copa Espacio)**: usar la misma regla, `requiere: 'reinos'` y `dificultad: 4`; el menú y
  el selector de sala ordenan por `dificultad` y el candado sale de `requiere`, sin código propio.

Cada copa lleva `dificultad` (1 Fiesta, 2 Mesoamericana, 3 Reinos). Récords: llaves por pista con `VERSION_PISTAS = 2`
(no cambia: las pistas de antes no cambian; las nuevas solo agregan llaves).

## 6. Sin listas fijas

- `KartsCopa.COPAS_SALA` = ids de `KP.COPAS` (por dificultad) + `mixta`; `NOMBRE` y `EMOJI` se derivan.
- Copa mixta: baraja cada copa con la semilla y toma por turnos, empezando por una copa al azar, hasta 4 pistas (2 y 2
  con dos copas, como antes; 2-1-1 con tres; 1 por copa con cuatro).
- `server/carreras.ts`: `MAPAS_SALA.karts` = `Arcade.PISTAS` (pistas con `sala: true`).
- `juegos/app/salas.js`: las opciones de «Copa completa» salen de `KartsPistas.COPAS`.

## 7. Rendimiento

Presupuesto por cuadro con CPU ×4: el piso Mode-7 domina y no cambia. Adentro la vista se acorta (sprites hasta
900 px, ≈ 40 % del área), lo que compensa los ≈ 60–90 cuadriláteros de muro (un `fill` cada uno, sin gradientes). La
viñeta y el resplandor son `drawImage` de lienzos precalculados. Se mide con las E2E (CPU ×4, 8 karts en vivo).

## Alternativas descartadas

- **Muros como sprites** (muchos billboards en fila): con 150 de tope se agotan y se ven dientes de sierra.
- **Raycasting tipo Wolfenstein**: otro motor; rompe el Mode-7 y las salas.
- **Interiores oscurecidos sin muros**: no se siente «adentro» y no hay reto de carril.
- **Desbloquear al ganar**: deja fuera a quien no gana; descartado por el público (5.º de primaria a secundaria).
