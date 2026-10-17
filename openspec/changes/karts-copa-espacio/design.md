## Context

«Karts Turbo» simula en un mapa 2D (curva Catmull-Rom cerrada, muestras cada 8 px) y lo proyecta con Mode-7: el piso
es una textura pintada una vez por pista (tres mipmaps en `Uint32Array`), el cielo un panorama de 360° pintado una
vez y el escenario son sprites agrupados en celdas de 512 px (tope de 150 por cuadro). Las mecánicas mesoamericanas
son zonas fijas (`colocarMecanicas`) revisadas a 60 Hz. Fuera del camino solo se frena (`pista.lento`). Las copas
viven en `KartsPistas.COPAS`; las copas de sala, sus nombres y el `<select>` de «Crear partida» eran listas fijas,
igual que `MAPAS_SALA` del servidor.

## Goals / Non-Goals

- **Goals:** 4 pistas espaciales legibles al manejar; mecánicas «imposibles» pero justas y deterministas; la copa más
  difícil con los bots más rápidos y que niñas, niños y adolescentes puedan terminar practicando; jugable sola, en
  copa de sala y suelta en sala; 60 fps con CPU ×4 y 8 karts en vivo; listas derivadas (sin fijar ids).
- **Non-Goals:** Reinos Antiguos (sprint 34); cambiar la copa mixta (sigue siendo 2 de Fiesta y 2 de Mesoamericana);
  piezas nuevas del taller; música (solo efectos sintetizados y `window.Emocion`).

## Decisions

### 1. Datos: pistas con `espacio: true`, mecánicas por fracción de la vuelta
Las 4 pistas viven en `juegos/karts-pistas.js` como las demás (`sala: true`, `vueltas: 2`, `mitad: 54`) y agregan
`espacio: true` (fuera del camino hay vacío) y `ritmoBots` (1.04 → 1.08). Las mecánicas nuevas se ubican con `f`
(fracción de la vuelta) o `tramo: [f0, f1]`, que no dependen de coordenadas: `colocarMecanicas` acepta `f`, `tramo` y
`salida` (portales) además de `cerca` (compatibilidad). Funciones puras nuevas (las prueba Deno):
`marcasEspacio(pista, M, zonas)` → `Uint8Array` por muestra con banderas `ABIERTO | HUECO | PLATAFORMA | GRAVEDAD`;
`ladoPlataforma(z, t)`, `aperturaCompuerta(z, t)`, `rescateEn(marcas, idx)`, `copaDesbloqueada(copa, prog)` y
`copasOrdenadas()`.

### 2. Bordes: barandal o vacío
En las pistas espaciales cada muestra es «con barandal» (postes de neón; el kart raspa contra el borde a `mitad + 4`,
pierde la velocidad hacia afuera y 1.5 % por paso) o «abierta» (`tramo` de tipo `abierto`, sin postes y con franjas de
peligro ámbar). En lo abierto, a más de `mitad + 10` del centro el kart **cae**: 0.8 s hundiéndose y desvaneciéndose,
y luego el **dron de rescate** (sprite propio: cuerpo blanco y naranja con 4 rotores y luz) lo sube 1.4 s y lo deja
en el centro del camino. Penalización fija: 2.2 s detenido + volver a acelerar (≈ 3.5 s en total). Dónde reaparece
(`rescateEn`): en un tramo abierto, 4 muestras atrás; en un hueco o plataforma, **2 muestras después del hueco** (el dron
te cruza: así nunca se cae en un ciclo de rampa sin velocidad). Nunca cruza la meta hacia atrás (las mecánicas están
entre el 6 % y el 94 % de la vuelta), así la cuenta de vueltas no cambia. Alternativa descartada: vacío en toda la
orilla (demasiado castigo para las y los más chicos) o reaparecer antes de la rampa (ciclos de caída sin velocidad).

### 3. Mecánicas nuevas (todas O(zonas) por kart y por paso, deterministas)
- `brecha` (hueco con rampa): rampa en `f` y hueco de 10 muestras (80 px) desde la muestra +2. Salta quien cruza la
  rampa a más de 150 px/s (0.7 s en el aire ⇒ ≥ 105 px, más que los 96 px hasta el final del hueco); sin velocidad,
  cae. Siempre en rectas.
- `gravedad` (tramo): agarre × 0.4 y saltos × 1.6 de largos; piso morado con anillos.
- `plataforma`: hueco de 14 muestras con una plataforma que va y viene de lado (`ladoPlataforma = sen(2πt/periodo) ·
  amp · mitad`, `amp` 0.6–0.7 y medio ancho 0.5 · mitad). Sobre ella el kart viaja con ella; fuera de ella cae. Se
  dibuja **parcheando la textura del piso** (los tres mipmaps) en la caja del hueco: los píxeles del hueco se
  precalculan (índice, lado y franja) al preparar la pista y cada cuadro se escribe plataforma o vacío (≈ 20 mil
  escrituras por plataforma cercana). Así queda en perspectiva exacta, con recorte, sin dibujar polígonos.
- `turbo` (la de siempre, dibujada con neón) y `antiturbo` (franja roja: velocidad punta × 0.6 mientras la pisas; la
  estrella la ignora).
- `portal`: anillo a un lado del camino (`lado`, radio 24); al entrar se sale en `salida` (fracción) al mismo lado, con
  la misma velocidad y el rumbo de la pista. Entrada y salida en la misma mitad de la vuelta (nunca saltan la ventana
  40–60 % ni la meta), así la cuenta de vueltas es la de siempre. Ahorra ≈ 6 % de la vuelta y está en un tramo
  abierto: riesgo y premio.
- `compuerta`: dos hojas que abren y cierran (`aperturaCompuerta = 0.3 + 0.7 · (½ + ½ cos 2πt/periodo)` de la
  mitad); quien cruza la línea fuera de la abertura choca (gira y pierde 2 monedas, como la trajinera). El centro
  (±16 px) nunca se cierra: con calma siempre se pasa.
- `asteroide`: roca que cruza el camino de orilla a orilla (misma ecuación que la trajinera, `ladoTrajinera`).

### 4. Equilibrio: la más difícil, pero terminable
- La dificultad viene de **consecuencias** (caer cuesta ≈ 3.5 s) y de leer el camino, no de reflejos imposibles:
  donde hay barandal no se cae; el centro de las compuertas siempre pasa; la plataforma cubre el centro casi todo el
  ciclo y te lleva; las rampas piden solo 150 px/s (60 % de la punta); el dron siempre te deja adelante del hueco.
- Curva de la copa: la Estación (casi todo con barandal, 2 tramos abiertos cortos) enseña compuertas y antiturbo;
  Anillos suma hielo (agarre 0.7) y rocas; el Cinturón suma huecos y plataformas; la Nebulosa junta todo con portales y
  gravedad baja (4 tramos abiertos).
- Bots: `ritmoBots` 1.04, 1.05, 1.06 y 1.08 multiplica su habilidad (en solitario) y divide el tiempo de los fantasmas
  de sala: son los más rápidos de todas las copas. En solitario también caen (misma física) y siguen la plataforma.
  La dificultad de la copa sigue ajustándose por carrera (`dif` 85–105) y la banda de goma (±6 %) sigue igual: quien
  practica los alcanza.
- Límites de sala: los de siempre (25 % y 2.5 veces la referencia de la pista, ≈ 4.8–5.8 min): aun con 10 caídas sobra
  tiempo. Las pistas miden 2.9–3.5 veces las de antes (referencia 120–139 s, como las grandes).

### 5. Desbloqueo (nota para integrar con el sprint 34)
- **Regla:** la Copa del Espacio pide **podio (1.º a 3.º) en 2 copas distintas** (`requiere: { podios: 2 }` en la copa;
  `copaDesbloqueada` cuenta `prog.copas[id].lugar <= 3` en las otras). Razón: quien ya subió al podio dos veces sabe
  derrapar y leer mecánicas; con 2 copas fáciles disponibles hoy (Fiesta y Mesoamericana) es alcanzable, y quien ya
  las ganó la tiene abierta al instante.
- **Práctica siempre abierta:** las 4 pistas están en «Carrera rápida» y en sala desde el principio (practicar es lo
  que permite terminarla). En sala la copa tampoco se bloquea: la eligen juntas y juntos.
- **Para el sprint 34 (Reinos Antiguos):** la regla es **genérica por datos**. Sugerencia coherente: Reinos con
  `requiere: { podios: 1 }` (nivel 3) y Espacio con 2 (nivel 4); Fiesta y Mesoamericana sin `requiere`. Si Reinos
  queda con 1, el orden es natural: Fiesta/Meso → Reinos → Espacio. Quien integre solo debe poner `nivel: 3` y, si
  quiere, `requiere` en la copa de Reinos; menú, selector y salas ya ordenan por `nivel`.

### 6. Dibujo (juegos/karts-espacio.js) y rendimiento
`karts-espacio.js` es un script clásico sin estado (`window.KartsEspacio`): `pintarPiso` (vacío con estrellas y
nebulosa, camino metálico translúcido con juntas, neón en lo que tiene barandal y franjas ámbar en lo abierto, huecos,
rampas, gravedad, portales, compuertas, turbo y antiturbo en la textura), `DIBUJOS` (sprites: poste de neón, boya,
satélite, roca, cristal, hielo, módulo, panel, dron, portal, hoja de compuerta) y `pintarCielo` (estrellas, planeta
con anillos, nebulosa, estación, luna con base). Todo se pinta **una vez por pista** (textura y panorama) o se cachea
(sprites). Por cuadro solo se agregan: parches de plataformas cercanas, hasta 3 rocas, 2 hojas por compuerta cercana,
4 anillos de portal y el dron: < 15 sprites y ≈ 40 mil escrituras de píxel. No hay partículas de estrellas por cuadro.
Se mide con la E2E (CPU ×4, 390×844) en cada pista y con 8 karts en vivo (`e2e-karts-vivo`).

### 7. Copas y listas derivadas
Cada copa lleva `nivel` (1 Fiesta, 2 Mesoamericana, 4 Espacio; 3 queda para Reinos). `copasOrdenadas()` da el orden
del menú y del selector. `KartsCopa.COPAS_SALA`, `NOMBRE` y `EMOJI` salen de las copas (+ la mixta, que toma sus
pistas por id). El `<select>` de «Crear partida» se arma con esa lista. `MAPAS_SALA.karts` = `Arcade.PISTAS` (las de
`sala: true`). Récords: mismo `records[pista]` con `VERSION_PISTAS` 2: las pistas viejas no cambian, sus récords siguen
comparables, y las nuevas empiezan sin récord.

### 8. Audio
Efectos sintetizados propios con el `tono` del juego (caída: barrido grave; dron: dos bips; portal: barrido agudo;
compuerta: zumbido) y `window.Emocion` como en las demás pistas (cuenta, campana de última vuelta, logro al pasar un
portal o al rebasar al 1.º, podio). Sin música ni sonidos de terceros.

## Risks / Trade-offs

- **Conflictos con el sprint 34:** mismos archivos. Mitigación: bloques marcados `// karts-copa-espacio`, el dibujo
  espacial en un archivo aparte y listas derivadas; al mezclar `origin/main` se conservan ambos lados y se revisa que
  `nivel` quede 1–4.
- **Caídas de bots:** los bots también caen; es justo (misma física) y los hace más humanos. Su ritmo extra compensa.
- **Parche de textura:** escribe sobre los mipmaps; se rehace al preparar la pista (nunca queda sucio entre carreras).
- **En vivo:** las caídas de otras personas se ven con dos banderas nuevas del mensaje (`cae`, `remolque`); un aparato
  viejo las ignora.
