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
- `columnas` (columnas fijas en el camino, alternadas), `adornos` (sueltos), `lago`, `foso`, `bots` y `mecanicas` con los tipos nuevos.

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
visible con un sprite de resplandor (sin `lighter`: más barato), con tope de tamaño y solo a menos de 560 px. Las antorchas parpadean (seno determinista) solo sin
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
| Bots | habilidad 0.87–0.95 × dificultad | lo mismo × 1.03 (`ritmoBots` de la pista; en salas, el tiempo de los fantasmas ÷ 1.03) |

Es justa porque: (1) todo obstáculo es determinista y se ve antes (sombra del bloque que crece 1 s antes de caer;
compuerta que avisa con su posición; la roca es grande y lenta); (2) los muros no tumban, solo frenan; (3) nadie
queda fuera de la pista (no hay lava ni caídas); (4) los bots también chocan con los muros y las columnas y esquivan
con la misma regla que el piloto de prueba; (5) la copa se abre al terminar la anterior (no al ganarla).

Al integrar la Copa del Espacio se adoptó su campo `ritmoBots` (`Arcade.ritmoBots`), que también divide el tiempo de los
fantasmas de sala: con 1.03 los fantasmas van un 3 % más rápido (la del Espacio usa 1.04 a 1.08).

## 4. Mecánicas (deterministas)

Funciones puras en `juegos/karts-pistas.js` (probadas en Deno), con el reloj de la carrera `t`:

- `bloques`: `alturaBloque(z, t)`: ciclo `periodo` con `desfase`; escondido, baja despacio (sombra de aviso), cae y
  queda en el piso 0.5 s. Peligro si la altura < 20 px: golpe (giro y −2 monedas).
- `roca`: `ladoRoca(z, t)`: va y viene de muro a muro (seno, como la trajinera, pero dentro de los muros). Choque a
  < 24 px: golpe.
- `losa` (compuerta de piedra; el tipo `compuerta` es la compuerta espacial de karts-copa-espacio): `centroCompuerta(z,
  t)`: una losa de medio ancho que se desliza de un lado al otro (pausa, deslizamiento, pausa). La losa detiene al kart
  (vuelve 4 muestras y queda a ×0.35): no tumba.
- `arena`: como el lodo (tope ×0.6), dibujada con dunas.
- `luz`: franja de luz (triángulos de la serpiente del equinoccio): turbo como la placa de Teotihuacan.
- `columnas`: círculos fijos de radio 15 sobre el camino; empujan hacia afuera y frenan (×0.6).

Esquivar (bots y piloto de prueba): si a menos de 60 muestras hay una columna, una compuerta cerrada o una roca, el
carril objetivo pasa al lado libre; si no, el de siempre.

## 5. Copa y desbloqueo (para niñas, niños y adolescentes)

La primera propuesta era abrirla al **terminar** la Copa Mesoamericana. El sprint 35 (Copa del Espacio) llegó antes a
`main` con un desbloqueo genérico por datos: cada copa lleva `nivel` (orden de dificultad del menú, del selector y de
las salas) y `requiere: { podios }` (podios, 1.º a 3.º, en OTRAS copas). Para que las dos copas sigan una sola regla:

- Individual: `nivel: 3` y `requiere: { podios: 1 }`. Un podio en la Copa Fiesta (la fácil) basta: es una meta clara y
  alcanzable para quien juega menos o está aprendiendo, y no obliga a pasar por la Mesoamericana. La del Espacio pide 2
  (escalón final). Mientras tanto se ve con candado y lo que falta. Sus pistas siempre están en la carrera rápida.
- Salas: siempre abiertas. Las decide la anfitriona (a veces el profe) para el grupo; no dependen del avance de cada
  quien y no se pueden «atorar» por una persona.

Récords: llaves por pista con `VERSION_PISTAS = 2` (no cambia: las pistas de antes no cambian; las nuevas solo agregan
llaves).

## 6. Sin listas fijas

Lo resolvió igual el sprint 35 (karts-copa-espacio) y se conservó su versión al fusionar:

- `KartsCopa.COPAS_SALA` = ids de `KP.copasOrdenadas()` (por `nivel`) + `mixta`; `NOMBRE` y `EMOJI` se derivan.
- Copa mixta: sigue tomando 2 y 2 de Fiesta y Mesoamericana (Reinos Antiguos y Espacio no entran).
- `server/carreras.ts`: `MAPAS_SALA.karts` = `Arcade.PISTAS` (pistas con `sala: true`).
- `juegos/app/salas.js`: las opciones de «Copa completa» salen de `KartsCopa.COPAS_SALA`.

## 7. Rendimiento

Dentro de un corredor de dos muros (cámara y kart en el mismo tramo) solo se dibujan los muros de ese tramo y, cerca
de la unión, los del tramo vecino: todo lo demás queda detrás. Esos muros van en lote (de lejos a cerca, uniendo los
seguidos del mismo tono en un solo relleno) y, con la bóveda opaca, no se pinta el cielo de afuera. Medido: cuadro
medio de ≈ 9.5 ms con CPU ×4 dentro de El Castillo (reporte del Step 6). Presupuesto por cuadro con CPU ×4: el piso
Mode-7 domina y no cambia. Adentro la vista se acorta (sprites hasta
900 px, ≈ 40 % del área), lo que compensa los ≈ 60–90 cuadriláteros de muro (un `fill` cada uno, sin gradientes). La
viñeta y el resplandor son `drawImage` de lienzos precalculados. Se mide con las E2E (CPU ×4, 8 karts en vivo).

## Alternativas descartadas

- **Muros como sprites** (muchos billboards en fila): con 150 de tope se agotan y se ven dientes de sierra.
- **Raycasting tipo Wolfenstein**: otro motor; rompe el Mode-7 y las salas.
- **Interiores oscurecidos sin muros**: no se siente «adentro» y no hay reto de carril.
- **Desbloquear al ganar**: deja fuera a quien no gana; descartado por el público (5.º de primaria a secundaria).
