## Contexto

Cada pista es una curva Catmull-Rom cerrada por `puntos` que `Arcade.muestrearPista` remuestrea cada 8 px. Las pruebas
ya exigen: trazado cerrado, sin encimarse (tramos lejanos ≥ 2·mitad + 30 px), radio ≥ 100 px (ventana de 12 muestras),
meta en recta, textura ≤ 12.6 M px, minimapa legible (tramos a ≥ 1000 px por la pista separados ≥ 6 px en 104×72) y
referencia de 115 a 140 s. El motor es Mode-7 de un solo plano.

## Decisiones

### 1. Diseño con tortuga y cierre exacto
Los trazados se diseñan con rectas y arcos (incluida una espiral doble y arcos de radio variable) y se cierran
resolviendo el largo de dos rectas no paralelas; luego se muestrean cada 150 px como `puntos`. El generador vive fuera
del repo (es una herramienta de diseño); al repo solo llegan los `puntos`, como siempre.

### 2. Espiral doble en lugar de ocho
Una curva cerrada que no se cruza solo puede girar más de 360° alrededor de un punto si después «se desenrolla»: la
espiral doble entra girando en un sentido, pasa por una S en el centro y sale entre sus propios brazos. Es la forma
plana de un giro de 400°+ (Anillos 443°, Nebulosa 410°). El ocho con cruce a otra altura no cabe en un motor de un
solo plano (la muestra más cercana sería ambigua en el cruce); se descarta y el «paso por encima» se simula con un
portal (el de la Nebulosa corta por el centro del remolino).

### 3. Minimapa como límite de diseño
Con 6 px en 104×72, dos brazos lejanos por la pista necesitan ≈ 280–320 px de separación. Eso fija el paso de las
espirales (brazos alternos de entrada y salida), el ancho del cuello del sacacorchos y la separación de las grecas.

### 4. Complejidad medible (`KartsPistas.complejidad`)
Función pura sobre las muestras: tramos de giro en un mismo sentido (radio < 1000 px; se ignoran los de < 8° y se unen
los separados por ≤ 80 px). De ahí salen: curvas > 120°, espirales (≥ 360°), sacacorchos (≥ 270°), la racha más larga
de giros de 60°–120° separados ≤ 600 px (laberinto), chicanas (curvas ≥ 45° de sentido contrario a ≤ 250 px) y
horquillas (150°–230° con radio ≤ 220 px). La usan las pruebas; el juego no la necesita al correr.

### 5. Récords por trazado (VERSION_PISTAS 3)
Se reutiliza el esquema de karts-pistas-grandes: `pistasV` sube a 3 y las pistas rediseñadas llevan `trazado: 3`.
Migración en `karts.html` (`migrarRecords`): sin `pistasV` → todo a `recordsV1` (como antes); con `pistasV: 2` → solo
los récords de las pistas con `trazado: 3` pasan a `recordsV2`. `server/progreso.ts` acepta 3 formas: anterior (5
llaves), `pistasV: 2` + `recordsV1` (pestaña vieja) y `pistasV: 3` + `recordsV1` + `recordsV2`. Una pestaña vieja que
recibe `pistasV: 3` intentaría guardar `pistasV: 2` con `recordsV2`: el servidor lo rechaza y no se pierde nada.

### 6. Mecánicas y bots
Las mecánicas espaciales ya van por fracción de la vuelta (`f`, `tramo`); se reubican en los tramos nuevos (huecos y
plataformas en rectas, portales en la misma mitad, tramos abiertos en espirales, serpientes y horquillas). Las de Reinos
van por coordenadas (`cerca`, `desde`, `hasta`): se recalculan con las muestras del trazado nuevo. La IA de los bots no
cambia si completan la vuelta sin caer más de lo razonable (se mide en el E2E).

## Riesgos

- Curvas cerradas en tramos sin barandal: más caídas de bots. Mitigación: el E2E cuenta las caídas y exige que terminen.
- El minimapa queda justo (≈ 6.2 px) en la Estación Orbital: la prueba lo vigila.
