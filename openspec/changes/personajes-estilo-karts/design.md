## Context

- `juegos/personajes.js` (cambio `personajes-xalli`, sin archivar) es la fuente única de los personajes de Arcade:
  `LISTA` (id, nombre, título, emoji, partícula, firma, colores del kart y paletas por poder), `pintar(c, id, o)` de
  perfil con las poses de Axo y `retrato()`. El piloto de espaldas de los 4 originales vive en `karts.html`
  (`pintarCabeza`, `pintarCola`, `pintarNiebla`) porque depende del modelo 3D de cajas del kart.
- Coordinación: otros agentes modifican `karts.html` a la vez (sprint 27: rivales en vivo; pistas mesoamericanas:
  circuito y escenario). Este cambio solo toca en `karts.html` el dibujo del piloto, el selector, la estela y el
  reparto del choque, con ganchos de pocas líneas; lo demás vive en `personajes.js`.

## Goals / Non-Goals

**Goals:** 4 personajes nuevos con personalidades y siluetas contrastadas, al nivel de los actuales; 8 en los
selectores sin desplazamiento lateral; peso estilo karts sin ventaja; pruebas unitarias y E2E.

**Non-Goals:** pistas y copas (otro cambio), ventajas por personaje, mover el piloto de los 4 originales fuera de
`karts.html`, mostrar el personaje de otras personas en una sala.

## Decisions

### 1. Quiénes son y por qué esos nombres

| Personaje | Rol estilo karts | Silueta (se lee en chico) | Kart (cuerpo / acento) | Partícula | Peso |
|---|---|---|---|---|---|
| **Xolo**, Guía Veloz de los Caminos | chico y rápido, travieso | orejas enormes y puntiagudas, copete, hocico, cola delgada, collar de jade | jade `#059669` / oro `#f2c14e` | huellitas | ligero |
| **Tlali**, Saltarina de los Valles | chistosa, bailadora | pata trasera en «Z», antenas largas, sombrero de ala ancha bordado, ojos grandes | lima `#84cc16` / magenta `#e11d48` | notas | ligero |
| **Tona**, Sabia de la Costa | grande y fuerte, sabia | caparazón con placas, aletas, yelmo de jade y concha con orejeras y plumas | azul mar `#0369a1` / arena `#fcd34d` | gotas | pesado |
| **Kinich**, Estratega del Juego de Pelota | astuto | moño alto con pluma de quetzal, pintura roja en los ojos, yugo en la cadera, rodillera y pelota de hule | rojo `#dc2626` / blanco hueso `#f5f5f4` | pelotitas | medio |

- **Nombres:** Xolo (de xoloitzcuintle, la raza), Tlali (de *tlalli*, tierra, donde vive la chapulina), Tona (nombre
  común que evoca el calor de la costa) y Kinich («rostro solar», título que usaron gobernantes mayas como nombre
  propio; no es una deidad por sí solo). Ninguno es marca ni personaje de una empresa.
- **«Chapo» → «Tlali»:** en México el apodo remite a un narcotraficante conocido; en un juego escolar no se usa.
- **Respeto:** ropa e insignias inspiradas en piezas reales (yugo y rodillera del juego de pelota, orejeras zapotecas,
  bordado oaxaqueño, collar de jade), sin caricaturizar rasgos de pueblos actuales; personalidades de juego
  (travieso, chistosa, sabia, astuto), no estereotipos.
- **Las 4 originales** conservan dibujo, colores y nombre; reciben solo `peso`, `personalidad`, `estela` y `encuadre`.

### 2. Peso: sensación de karts sin ventaja

Opciones evaluadas:
1. *Estadísticas completas* (aceleración y velocidad por peso): la más fiel, pero cambia los tiempos; aunque se
   equilibre en promedio, cada pista favorecería a un peso, y eso se nota en récords, pintura dorada y salas (donde se
   comparan tiempos de personas).
2. *Solo cosmético*: justo, pero no se siente como karts.
3. **Elegida: el peso solo reparte el empuje de los choques entre karts.** Masas: ligero 0.8, medio 1, pesado 1.25.
   Al chocar, cada kart se mueve en proporción a la masa del **otro** (`Personajes.repartoChoque(ma, mb)`): el pesado
   casi no se mueve y el ligero sale empujado. Aceleración, velocidad punta, giro, derrape, ítems y tiempos son
   **idénticos** (ninguna de esas funciones lee el personaje). En sala los demás son fantasmas que no chocan, así que
   el tiempo no depende del personaje; contra bots el efecto es simétrico (los bots también tienen peso).

Reparto de los 8: ligeros Xolo, Tlali e Itzae; medios Xalli, Xochiquetzal y Kinich; pesados Yahui y Tona.

### 3. Dibujo

- **Perfil (Axo y retratos):** en `personajes.js`, igual que los actuales: pies en el origen, mirando a la derecha,
  ~15 px de alto sin tocado, contorno fino del tono oscuro, brillo blanco translúcido, ojos con brillo y las mismas
  poses (`postura(o)` común para brazos y piernas, `cara()` común para ojos y boca). Champiñón: el juego ya escala;
  chile: paleta `fuego` por personaje y una flamita en un rasgo (puntas de las orejas, antenas, cresta del yelmo,
  pluma). Detalles: la cola de Xolo y las antenas de Tlali se mecen; Tona tiene ojos de párpado medio (sabia); Kinich
  tiene ceja levantada y sonrisa ladeada (astuto) y su pelota va en la mano o la cadera según la pose.
- **Encuadre del retrato:** cada personaje trae `encuadre: [dx, dy]` (antes eran casos sueltos en `retrato`).
- **Piloto de espaldas de los nuevos:** en `personajes.js` (`Personajes.piloto(id)` → `{ cabeza(c, S, cr, sr, HC),
  extra }`, `null` para las 4 originales), con las mismas reglas que `pintarCabeza`: se dibuja según la vista (de
  espaldas: orejas de Xolo, antenas y ala del sombrero de Tlali, yelmo con orejeras de Tona, moño y pluma de Kinich;
  de frente, además, la cara). `extra` es un accesorio con su punto de profundidad: caparazón de Tona sobre el
  respaldo y pelota de hule de Kinich detrás del asiento. `spriteKart` pregunta primero a `Personajes.piloto`.
  Mover también a las 4 originales sería un cambio grande en `karts.html` mientras otros lo modifican: queda como
  limpieza futura.
- **Partículas nuevas:** `Personajes.pintarParticula(c, forma, x, y, r, rot, color)` dibuja huellitas, notas, gotas y
  pelotitas y devuelve `false` para las formas viejas (que siguen dibujando sus juegos); la usan Axo y Karts. Colores
  en `LISTA[].estela`.

### 4. Selectores con 8

- Rejilla de 4 columnas × 2 filas en los dos juegos (también en celular): retrato (36–52 px) y nombre. El título queda
  dentro del botón para lectores de pantalla (`.solo-lector`); debajo de la rejilla una línea (`#personaje-detalle` en
  Axo, `#piloto-detalle` en Karts) con nombre, título, personalidad y, en Karts, el peso
  (🪶 Ligero, ⚖️ Medio, 🪨 Pesado · «solo cambia los choques»).
- A 320 px cada tarjeta mide ≥ 56 px de ancho; el nombre usa 10–13 px y se recorta con elipsis si no cabe.
- Bots: siguen tomando a los otros personajes en orden fijo (`perOtros[k % perOtros.length]`): con 7 rivales y 7
  personajes libres, **uno de cada uno**.

### 5. Ganchos de prueba

`__karts.estado()` agrega `masa` (la de tu personaje). Axo usa los ganchos existentes (`cajaJugador`, `personaje`,
`rastro`).

## Risks / Trade-offs

- [Conflictos en `karts.html` con otros cambios] → cambios chicos y localizados; antes del PR se integra
  `origin/main` conservando los dos lados.
- [8 tarjetas apretadas a 320 px] → solo retrato y nombre en la tarjeta; el resto en la línea de detalle.
- [Los nombres podrían leerse como burla] → nombres comunes o de raíz náhuatl/maya, sin palabras de broma; la
  personalidad es del personaje, no del pueblo.

## Migration Plan

Sin migración: el progreso no cambia; sin `arcade_personaje` se usa Xalli. Rollback: revertir el merge.
