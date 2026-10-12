## Context

- `juegos/plataformas.html` («Axo y los 12 mundos», cambio `axo-diseno`) dibuja al ajolote con `pintarAxo(c, o)`:
  trazos vectoriales en canvas a la resolución real (`K`), origen en los pies, mirando a la derecha, ~15 px lógicos de
  alto; poses `quieto`, `camina`, `salta`, `cae`, `aterriza`, `dano`, `pierde` y `gana`; paletas por poder (`base`,
  `grande`, `fuego`) y retratos `retratoAxo(poder, pose)` (data URL) para la portada y la marca del mapa. Con
  `prefers-reduced-motion` (`REDUCIR`) no hay vaivén ni partículas.
- `juegos/karts.html` («Karts Turbo», cambios `karts-pseudo3d` y `karts-mando`) dibuja cada kart como un modelo de
  cajas proyectado en 32 vistas y lo guarda en caché (`spriteKart(color, num, vista, phi)`); el piloto es una caja
  (`torso`) más un casco esférico blanco con franja del color del kart. `k.color` identifica a cada corredor en el
  minimapa, el podio y la etiqueta del rival. El color del taller (`prog.equipo.color`) se guarda en el progreso del
  servidor con un validador de forma **exacta** (`server/progreso.ts`).
- Preferencias del navegador que ya usan los juegos: `arcade_sonido` (compartida), `plataformas_control`,
  `karts_control`, `karts_acelerar`.
- En una sala, cada quien juega solo su nivel o pista; Karts dibuja como fantasmas únicamente a los bots
  (`d.bots`), nunca a las otras personas. El podio lo pinta `juegos.html` con el avatar de cada quien.

## Goals / Non-Goals

**Goals:**
- 4 personajes jugables, redibujados en el estilo de cada juego (código, sin imágenes), reconocibles en tamaño chico.
- Xalli reemplaza a Axo como personaje por omisión; el juego conserva título e id.
- Selector con nombre y título en los dos juegos; elección recordada; avance viejo → Xalli.
- Solo cosmético; 60 fps con CPU ×4; `prefers-reduced-motion`; legible desde 320 px.

**Non-Goals:**
- Renombrar el juego, cambiar física, puntos, ranking o el formato del progreso del servidor.
- Tocar `juegos.html` o el servidor; mostrar el personaje de otras personas en una sala.
- Imágenes, sprites externos o renders de IA.

## Decisions

### 1. Módulo común `juegos/personajes.js` (fuente única)
Datos (`LISTA`: `id`, `nombre`, `titulo`, `emoji`, `particula`, `firma` y paletas), `normalizar(id)` (desconocido →
`xalli`), `preferencia([id])` sobre `localStorage.arcade_personaje` (con `try/catch`: modo privado → Xalli), el dibujo
de perfil `pintar(c, id, { pose, fase, t, poder, quieto })` y `retrato(id, pose, poder)` (data URL en caché). Lo cargan
los dos juegos con `<script src="personajes.js?v=1">`, como `arcade.js` y `mando.js`.
- El dibujo de perfil vive aquí porque lo usan **los dos juegos**: Axo para jugar y la portada, Karts para las tarjetas
  del selector (de espaldas un personaje se reconoce peor). El piloto de espaldas en el kart vive en `karts.html`
  porque depende de su modelo 3D de cajas.
- `pintarAxo` sale de `plataformas.html` y se convierte en el dibujo de Xalli (mismo cuerpo, poses y paletas por
  poder), más su atuendo.

Alternativa descartada: copiar datos y dibujos en cada página (duplicación; los nombres y colores se desfasarían).

### 2. Cómo se ve cada personaje (perfil, Axo)
Todos con la misma escala que Axo (pies en el origen, ~15 px de alto sin tocado), contorno fino del tono oscuro de su
paleta, brillo blanco translúcido arriba, mejillas y ojos con brillo, como el dibujo actual. Silueta propia:

| Personaje | Cuerpo y colores | Rasgos de silueta (se leen en chico) | Partícula |
|---|---|---|---|
| Xalli | ajolote rosa claro (`#ffa3c7`), cola con aleta | 6 branquias coral translúcidas con halo; collar turquesa (`#14b8a6`) con jade (`#34d399`) y borde dorado; cinturón turquesa | burbujas |
| Itzae | chibi humano, piel morena (`#b8784e`), pelo negro | penacho en abanico de plumas turquesa y verdes con disco solar dorado (`#f5c542`); códice de amate (`#d9b77a`) con glifo que brilla en la mano; túnica ocre (`#d08a2c`) con banda turquesa | glifos dorados |
| Yahui | jaguar robusto amarillo (`#e9a83a`), hocico crema | orejas redondas, rosetas oscuras (`#4a2a10`), cola larga moteada con punta oscura; brazaletes de obsidiana (`#1f2430`); penacho de quetzal verde | hojas |
| Xochiquetzal | chibi humana, pelo largo negro | corona de cempasúchil y flores magenta/morado; máscara de madera (`#b07a45`) con ojos tallados; huipil blanco con flores bordadas y falda larga; niebla turquesa translúcida alrededor | pétalos |

Poses: las mismas de Axo (`quieto`, `camina`, `salta`, `cae`, `aterriza`, `dano`, `pierde`, `gana`). En los humanos,
piernas que se alternan al caminar, brazos arriba al festejar y al saltar, ojos en «> <» o «x» con daño y al perder.
Poderes: con 🍄 el juego ya escala el dibujo (`P.h / 13`); con 🌶️ cada paleta cambia a tonos de fuego (`fuego` por
personaje) y una flamita en la cola, el penacho, las orejas o la corona.

### 3. Piloto de espaldas en Karts
- `partesKart(paleta, color)`: carrocería, nariz, alerón y placas con los colores del personaje (`kart.cuerpo`,
  `kart.acento`, `kart.oscuro`); **los costados (pontones) y el disco del número llevan `k.color`**, el color de
  identidad del corredor que ya usan el minimapa, el podio y la etiqueta. Así cada kart sigue siendo distinto aunque
  dos bots tengan el mismo personaje, y el color del taller sigue teniendo sentido (se ve en tus costados y tu número).
- Yahui: rosetas oscuras pintadas sobre las caras de la carrocería (interpolación bilineal de la cara) y alerón y
  defensa de obsidiana.
- El torso usa la ropa del personaje; el casco se reemplaza por la cabeza dibujada según el ángulo de la vista: de
  espaldas se ven las branquias abiertas (Xalli), el abanico de plumas con el disco solar (Itzae), las orejas, el
  penacho y la cola enroscada saliendo del asiento (Yahui) o el pelo largo con la corona de flores y la niebla
  (Xochiquetzal); de frente, además, la cara.
- Caché: la clave del sprite agrega el personaje (`personaje|color|num|vista|phi`). Se siguen dibujando solo cuando se
  necesitan.
- Toque cosmético: con turbo, tu kart suelta además la partícula de tu personaje (sin movimiento reducido).

Colores de kart: Xalli turquesa `#14b8a6` / coral `#ff7f6e`; Itzae ocre `#d97706` / dorado `#facc15`; Yahui amarillo
`#eab308` con manchas / obsidiana `#1f2430`; Xochiquetzal magenta `#c026d3` / cempasúchil `#f59e0b`.

### 4. Bots y rivales
Los bots usan los otros 3 personajes en orden fijo (`otros[k % 3]`): en la copa y la carrera rápida, los 7 rivales se
reparten entre los 3; en una sala, BOT-VACHIRA y BOT-ISAGII toman los 2 primeros. Los nombres de los rivales (Chuy,
Paty…) y sus números se quedan: con 7 bots y 3 personajes habría nombres repetidos.

### 5. Selectores
- **Axo:** en la portada, debajo del título, un grupo `#personajes` (role `radiogroup`) con 4 tarjetas
  `[data-personaje]` (retrato, nombre y título; `aria-pressed`). La portada grande muestra al elegido festejando.
  En 2×2 hasta 520 px de ancho y en fila de 4 arriba de eso; con poca altura (horizontal) el retrato grande y la
  descripción se achican u ocultan para que quepa.
- **Karts:** en el menú, después de las opciones (copa, carrera rápida y taller), un bloque `#menu-piloto` «🏁 Piloto»
  con las mismas 4 tarjetas (retrato de perfil desde `personajes.js`). Se ve también en la PC (no depende de táctil).
- Los dos guardan en `localStorage.arcade_personaje` (compartida, como `arcade_sonido`): elegir a Itzae en un juego lo
  deja elegido en el otro.

Alternativas descartadas:
- **Guardar en el progreso del servidor:** el validador es exacto (habría que cambiar `server/progreso.ts`, el modelo
  de datos y desplegar servidor y páginas en orden), y en una sala el juego no recibe el progreso. Como es cosmético,
  basta el navegador, igual que los controles.
- **Una preferencia por juego** (`plataformas_personaje`, `karts_personaje`): posible, pero los alumnos y alumnas
  esperan «su» personaje en los dos juegos.

### 6. Salas
Cada quien ve a su personaje y los bots fantasma con los otros. **No se manda el personaje en la sala**: las otras
personas no se dibujan en tu carrera (Karts solo pinta a los bots; en plataformas juegas solo) y el podio de
`juegos.html` usa el avatar. Mandarlo exigiría agregar un campo a `carrera { ms, monedas }` (validado en el servidor) y
pintarlo en `juegos.html`, sin nada donde mostrarlo en la carrera. Queda como mejora posible.

### 7. Nombre del juego
El ajolote ahora se llama **Xalli** en los textos que hablan del personaje (descripción de la portada, `alt` del
retrato, avisos). Se conservan el título «Axo y los 12 mundos», el id `plataformas`, `A.VEL_AXO`, los nombres de las
funciones internas que no se ven y el catálogo de `juegos.html` y del servidor, para no romper avance ni ranking.
**Renombrar el título es un cambio de una línea por superficie si el profe lo pide:** `<title>`/`h1` de
`juegos/plataformas.html`, la tarjeta `t:` de `juegos.html` y `CATALOGO.plataformas.titulo` de `server/juegos.ts`
(el id no cambia).

### 8. Rendimiento y movimiento reducido
- Perfil: ~40–70 trazos por cuadro solo para tu personaje; el resto del cuadro no cambia (tiles y fondos en caché).
- Karts: un sprite por (personaje, color, número, vista); en la copa hay como mucho 8 combinaciones por vista.
- Partículas del personaje: máximo ~3 por segundo al correr y una ráfaga al saltar; con `REDUCIR` ninguna, sin vaivén
  de branquias ni de la niebla.
- Medición: script de Playwright con CPU ×4 (`Emulation.setCPUThrottlingRate`) en los dos juegos sueltos a 390×844 y
  844×390 con cada personaje (resultados en el reporte).

## Risks / Trade-offs

- [Dos bots con el mismo personaje] → los distinguen el número, el nombre y el color de costados y minimapa.
- [La preferencia vive en el navegador] → en otro dispositivo se empieza con Xalli; es cosmético.
- [Detalle fino a 320 px] → se eligieron rasgos de silueta grandes (abanico de plumas, orejas y cola, corona, branquias)
  y se revisan capturas de cerca.
- [`juegos.html` en reorganización (`organizar-codigo`)] → este cambio no lo toca.

## Migration Plan

Sin migración: el progreso no cambia de forma; sin `arcade_personaje` se usa Xalli. Rollback: revertir el commit.

## Open Questions

- ¿El profe quiere que el juego se llame distinto (p. ej. «Xalli y los 12 mundos»)? Ver §7.
