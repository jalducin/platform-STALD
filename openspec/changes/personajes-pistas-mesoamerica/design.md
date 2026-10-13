## Context

- `juegos/personajes.js` (cambio `personajes-xalli`, sin archivar) es la fuente única de los 4 personajes de Arcade:
  `LISTA` (id, nombre, título, emoji, partícula, firma, colores del kart y paletas por poder), `pintar(c, id, o)` de
  perfil con las poses de Axo y `retrato()`. El piloto de espaldas vive en `karts.html` (`pintarCabeza`, `pintarCola`,
  `pintarNiebla`) porque depende del modelo 3D de cajas del kart.
- `juegos/arcade.js` define `PISTAS` (puntos de control Catmull-Rom, medio ancho, superficie de fuera, agarre, lava)
  que usan `karts.html`, `juegos.html` (lista de mapas de sala, tiempos de bots) y, copiada a mano, `server/carreras.ts`
  (`MAPAS_SALA`). El tema visual de cada pista (cielo, montañas, fondo y escenario) está en `karts.html` por id.
- `karts.html` tiene una sola copa (`COPA = { id: 'fiesta', … }`) y el progreso guarda `copas[id]`, `records[id]` y
  `copaEnCurso.copa`; el validador del servidor acepta copas `^[a-z]{2,12}$` (hasta 8) y pistas `^[a-z][a-z-]{1,19}$`
  (hasta 32): **los ids nuevos caben sin tocar el servidor de progreso**.
- Coordinación: el sprint 27 está modificando `karts.html` (rivales en vivo por Realtime, salas de 8). Para no chocar,
  este cambio pone datos y dibujos en archivos aparte y deja en `karts.html` ganchos de pocas líneas.

## Goals / Non-Goals

**Goals:** 4 personajes nuevos con personalidades y siluetas contrastadas, dibujados en código al nivel de los
actuales; 8 en los selectores sin desplazamiento lateral; 4 pistas con identidad mexica, teotihuacana, maya y olmeca,
cada una con una mecánica nueva, determinista y probada; Copa Mesoamericana; 60 fps con CPU ×4.

**Non-Goals:** ventajas por personaje, atajos, cambios de física base, puntos o ranking, mostrar el personaje de otras
personas en una sala, rehacer los temas de las 4 pistas viejas.

## Decisions

### 1. Personajes: quiénes son y por qué esos nombres

| Personaje | Rol estilo karts | Silueta (se lee en chico) | Kart (cuerpo / acento) | Partícula | Peso |
|---|---|---|---|---|---|
| **Xolo**, Guía Veloz de los Caminos | chico y rápido, travieso | orejas enormes de murciélago, copete, hocico, cola delgada, collar de jade | jade `#059669` / oro `#f2c14e` | huellitas | ligero |
| **Tlali**, Saltarina de los Valles | chistosa, bailadora | pata trasera en «Z», antenas largas, sombrero de ala ancha bordado, ojos grandes | lima `#84cc16` / magenta `#e11d48` | notas | ligero |
| **Tona**, Sabia de la Costa | grande y fuerte, sabia | caparazón con placas, aletas, yelmo de jade y concha con orejeras y plumas | azul mar `#0369a1` / arena `#fcd34d` | gotas | pesado |
| **Kinich**, Estratega del Juego de Pelota | astuto | moño alto con pluma de quetzal, pintura roja en los ojos, yugo en la cadera, rodillera y pelota de hule | rojo `#dc2626` / blanco hueso `#f5f5f4` | pelotitas | medio |

- **Nombres:** Xolo (de xoloitzcuintle, la raza), Tlali (de *tlalli*, tierra, donde vive la chapulina), Tona (nombre
  común que remite al sol y al calor de la costa) y Kinich («rostro solar», título que usaron gobernantes mayas como
  nombre propio; no es una deidad por sí solo). Ninguno es marca ni personaje de una empresa.
- **«Chapo» → «Tlali»:** en México el apodo remite a un narcotraficante conocido; en un juego escolar no se usa.
- **Respeto:** ropa e insignias inspiradas en piezas reales (yugo y rodillera del juego de pelota, orejeras zapotecas,
  bordado oaxaqueño, collar de jade), sin caricaturizar rasgos de pueblos actuales; personalidades de juego (travieso,
  chistosa, sabia, astuto), no estereotipos.
- **Las 4 originales** conservan dibujo, colores y nombre; reciben solo `peso` y `personalidad`.

### 2. Peso: sensación de karts sin ventaja

Se evaluaron tres opciones:
1. *Estadísticas completas* (aceleración/velocidad por peso): da la sensación más fiel, pero cambia los tiempos;
   aunque se equilibre en promedio, una pista con más rectas favorece al pesado y otra al ligero, y eso se nota en
   los récords, la pintura dorada y las carreras de sala (donde se comparan tiempos de personas).
2. *Solo cosmético* (sin efecto): justo, pero no se siente como karts.
3. **Elegida: el peso solo cambia los choques entre karts.** Al chocar, el empuje se reparte en proporción inversa a
   la masa (ligero 0.8, medio 1, pesado 1.25): el pesado casi no se mueve y el ligero sale volando un poco. La
   aceleración, la velocidad punta, el giro, el derrape, los ítems y los tiempos son **idénticos**. En sala los demás
   son fantasmas que no chocan, así que el tiempo no depende del personaje; contra bots el empuje es simétrico en
   promedio (los bots también tienen peso). Una prueba unitaria confirma que `velocidadPunta`, aceleración y giro no
   leen el personaje (`KartsPistas.masa` es lo único que lo usa) y la E2E compara los tiempos de una vuelta con
   piloto de prueba entre un ligero y un pesado (misma pista, mismo tiempo ±1 cuadro).

El selector de Karts muestra el peso con un ícono (🪶 Ligero, ⚖️ Medio, 🪨 Pesado) y la frase «solo cambia los choques».

### 3. Dibujo de los personajes nuevos

- **Perfil (Axo y retratos):** en `personajes.js`, igual que los actuales: pies en el origen, mirando a la derecha,
  ~15 px de alto sin tocado, contorno fino del tono oscuro, brillo blanco translúcido, ojos con brillo y las mismas
  poses (`postura(o)` común para brazos y piernas, `cara()` común para ojos y boca). Champiñón: el juego ya escala;
  chile: paleta `fuego` por personaje y una flamita en un rasgo (punta de las orejas, antenas, cresta del yelmo,
  pluma). Detalles propios: la cola de Xolo y las antenas de Tlali se mecen; los ojos de Tona son de párpado medio
  (sabia); Kinich mira de lado con una ceja levantada y sonrisa ladeada (astuto) y su pelota rebota al caminar.
- **Encuadre del retrato:** cada personaje trae `encuadre: [dx, dy]` (antes eran casos sueltos en `retrato`).
- **Piloto de espaldas:** las cabezas de los personajes nuevos viven en `personajes.js` (`Personajes.piloto(id)` →
  `{ cabeza(c, S, cr, sr, HC), extra }`), con las mismas reglas que las de `karts.html`: se dibujan según la vista
  (de espaldas se ven las orejas de Xolo, las antenas y el ala del sombrero de Tlali, el caparazón y las orejeras de
  Tona, el moño y la pluma de Kinich; de frente, además, la cara). `extra` es un accesorio con su profundidad:
  caparazón de Tona sobre el respaldo y pelota de hule de Kinich amarrada detrás del asiento. `spriteKart` pregunta
  primero a `Personajes.piloto`; las 4 originales siguen en `pintarCabeza` (moverlas sería un cambio grande en
  `karts.html` justo cuando el sprint 27 lo modifica; queda anotado como limpieza futura).
- **Partículas nuevas:** `Personajes.pintarParticula(c, forma, x, y, r, rot, color)` dibuja huellitas, notas, gotas y
  pelotitas; la usan los dos juegos (así no se duplica). Colores en `LISTA[].estela`.

### 4. Selectores con 8

- Rejilla de 4 columnas × 2 filas en los dos juegos (también en celular): retrato (40–52 px) y nombre. El título queda
  dentro del botón para lectores de pantalla (clase `.solo-lector`), y debajo de la rejilla una línea
  (`#personaje-detalle` en Axo, `#piloto-detalle` en Karts) con nombre, título, personalidad y, en Karts, el peso.
- A 320 px cada tarjeta mide ≥ 60 px de ancho; el nombre usa 10–12 px y se recorta con elipsis si no cabe.
- Bots: siguen tomando a los otros personajes en orden fijo (`perOtros[k % 7]`): con 7 rivales, **los 7 que la
  persona no eligió** (uno cada uno).

### 5. Datos de las pistas y copas (fuente única)

- `arcade.js` → `PISTAS` agrega las 4 con `puntos`, `mitad`, `fuera`, `lento`, `agarre`, `descripcion`, `cultura`,
  `mecanica` y `zonas` / `moviles` / `hoyos` (datos de juego, por eso aquí: los usan `karts.html` y las pruebas).
  `COPAS = [{ id: 'fiesta', nombre: 'Copa Fiesta', emoji: '🏆', pistas: [4 viejas] }, { id: 'mesoamerica', nombre:
  'Copa Mesoamericana', emoji: '🏺', pistas: [4 nuevas] }]` y `copaPorId(id)`. `karts.html` deja de definir `COPA`.
- Ids: `tenochtitlan`, `teotihuacan`, `chichen-itza`, `la-venta`; copa `mesoamerica` (11 letras, cabe en el validador).
- `server/carreras.ts` (`MAPAS_SALA.karts`) agrega los 4 ids; `server/karts_pistas_test.ts` carga `juegos/arcade.js` y
  comprueba que la lista del servidor sea **la misma** que `Arcade.PISTAS`.
- **Pintura dorada:** se sigue ganando con récord bajo la meta en las 4 pistas de la Copa Fiesta (como dice el taller);
  las pistas nuevas no endurecen el requisito a quien todavía no la tiene.

Trazados (validados con un script: separación mínima entre tramos ≥ 260 px, radio mínimo de curva ≥ 70 px, como
las pistas viejas):

| Pista | Largo | Forma |
|---|---|---|
| Calzadas de Tenochtitlan | 4170 px | recta larga al sur (calzada), curvas por las chinampas y vuelta por el norte |
| Calzada de los Muertos | 3539 px | recta de ~850 px de sur a norte (la calzada) y vuelta amplia al este alrededor de la Pirámide del Sol |
| Cenote de Chichén Itzá | 4587 px | dos rectas al norte (rampa y cenote), eses por la selva y la cancha de pelota en la recta del sur |
| Selva de La Venta | 4894 px | curvas enlazadas por la selva con ríos que cruzan por debajo |

### 6. Mecánicas (deterministas, en `karts-pistas.js`)

Todas se describen por fracción de la vuelta (`f` → muestra `i = round(f·N)`) y desplazamiento lateral (`lado`, en
medios anchos), así que son las mismas en cada carrera y para cada corredor:
- **Flechas turbo** (`zonas` tipo `turbo`, Tenochtitlan y la cancha de Chichén): rectángulo de `largo` muestras y
  `ancho` medios anchos; al pisarlo, `turbo = max(turbo, 0.8 s)` (como el turbo de ítem, una vez por paso sobre la
  zona). Pintadas en la textura del piso (flechas turquesa o anillo de piedra).
- **Lodo** (`zonas` tipo `lodo`, La Venta): mientras el kart está dentro, su velocidad punta ×0.62 (como salir del
  camino); la estrella lo ignora. Manchas cafés con charcos.
- **Rampa y cenote** (`zonas` tipo `rampa` + `hoyos`, Chichén): al cruzar la rampa el kart salta (`alt` sube con
  `vz = 150 px/s` y gravedad 520 px/s², ~0.58 s en el aire) y la rampa le da al menos 190 px/s para librar el
  cenote (≈ 110 px). En el aire no se toman cajas ni monedas y el giro baja a 35 %. Al aterrizar: mini-turbo azul
  (0.5 s). Si alguien entra al cenote **sin** saltar (por la orilla), se le rescata **después** del cenote (no antes,
  para no dejarlo en un ciclo) con el aviso «💧 ¡Al cenote! Te rescatan».
- **Cabezas de serpiente** (`moviles`, Teotihuacan): cada una en la muestra `f`, con lateral
  `amplitud·mitad·sin(2π·t/periodo + fase)` donde `t` es el tiempo de carrera (`tCarrera`). Radio 13 px; tocarla
  = golpe (giro 0.9 s, −2 monedas), igual que una cáscara (la estrella las atraviesa). Se dibujan como sprite de
  piedra con plumas.
- Funciones puras: `KartsPistas.preparar(pista, M)` resuelve zonas a puntos del mapa; `KartsPistas.paso(k, ctx)`
  aplica zonas, salto y hoyos; `KartsPistas.factor(k, ctx)` da el factor de velocidad punta; `KartsPistas.moviles(t)`
  da la posición de los obstáculos. `ctx` trae `dt`, `t`, `M`, `N`, `pista`, `lateral(k)`, `golpear(k)`,
  `rescatar(k, i)` y `avisar(k, txt)`. Se prueban en Deno con karts falsos.
- Bots y piloto de prueba pasan por las mismas zonas (los bots pueden pisar lodo y chocar con serpientes como
  cualquiera); los fantasmas de sala no.

### 7. Escenario de las pistas nuevas (en `karts-pistas.js`)

- `TEMAS` (cielo, bruma, montañas lejos/cerca, franja) se combinan con los de `karts.html`
  (`Object.assign(TEMAS, KartsPistas.TEMAS)`); `pintarFondo` pregunta primero a `KartsPistas.fondo`; los adornos
  nuevos se registran en `DIBUJO_DECOR` y `DECOR_POR_PISTA` desde `KartsPistas.DECOR`; el cielo de 360° llama a
  `KartsPistas.panorama(c, id, capa, ctx)` después de cada capa de montañas para dibujar la silueta propia.
- **Tenochtitlan:** lago azul turquesa con canales y chinampas (rectángulos verdes con hileras de cultivo), calzada de
  piedra clara; adornos: trajineras de colores, ahuejotes (árboles altos de las chinampas), garzas y canoas; cielo
  claro con volcanes nevados al fondo y el **Templo Mayor** (pirámide doble con dos templos, rojo y azul).
- **Teotihuacan:** tierra ocre con pasto seco, calzada de piedra gris; adornos: plataformas escalonadas
  (talud-tablero), cabezas de serpiente emplumada en las orillas, magueyes y nopales; cielo de mediodía con la
  **Pirámide del Sol** (grande) y la **de la Luna** al norte, y cerros.
- **Chichén Itzá:** selva verde intensa con tierra rojiza, calzada blanca (*sacbé*); adornos: ceibas, palmas, muros del
  juego de pelota con su anillo, estelas; el cenote es un círculo de agua turquesa con borde de roca; cielo con nubes
  y **El Castillo** (pirámide de nueve cuerpos con templo y escalinata).
- **La Venta:** selva húmeda verde oscuro con ríos café verdoso, camino de tierra rojiza; adornos: **cabezas colosales**
  (con casco y rasgos serenos, sin exagerar), árboles de hule, platanares y garzas; cielo nublado con bruma y lomas de
  selva.
- Minimapa: igual que hoy (se arma con `M.pts` de la pista); se agregan marcas de color para turbo, lodo y cenote.

### 8. Menú, copa y avance en `karts.html`

- Menú: «▶ Continuar <copa>» si hay copa en curso (con su nombre), un botón por copa (`COPAS`) y carrera rápida.
  Empezar una copa con otra en curso la reemplaza (igual que «Copa nueva» hoy).
- Carrera rápida: las 8 pistas agrupadas por copa, cada una con emoji, nombre, descripción corta, récord y meta.
- Estadísticas del menú: mejor resultado de cada copa.
- Resultados: el botón «▶ Carrera n de 4» usa la copa en curso.
- `copaEnCurso` conserva su forma (`copa`, `carrera`, `puntos`, `dif`); un `copa` desconocido se trata como Copa Fiesta.

### 9. Rendimiento

- El piso Mode-7 no cambia (las zonas se pintan una vez en la textura); los adornos nuevos son sprites en caché; los
  obstáculos móviles son 3 sprites; el cielo sigue siendo un solo `drawImage`.
- Medición: Playwright con CPU ×4 (`Emulation.setCPUThrottlingRate`) en `karts.html?prueba=1` a 390×844 y 844×390,
  carrera de cada pista nueva con el piloto de prueba durante 5 s (fps del gancho `estado().fps`).

### 10. Ganchos de prueba nuevos

`__karts.simular(segundos)` avanza la carrera en pasos fijos de 1/60 s sin esperar al reloj (determinista para la
vuelta completa con piloto de prueba); `estado()` agrega `alt`, `zona`, `copa`, `masa`, `moviles`; `__karts.irA(f)`
coloca tu kart en una fracción de la vuelta (pruebas de mecánicas). Axo no necesita ganchos nuevos.

## Risks / Trade-offs

- [Conflictos con el sprint 27 en `karts.html`] → cambios chicos y localizados; antes del PR se integra `origin/main`
  conservando los dos lados.
- [Los obstáculos móviles frustran] → se mueven despacio (periodos de 3.2–4.4 s), dejan siempre un carril libre y el
  golpe es el mismo de una cáscara.
- [El salto deja ver el piso pixelado] → la altura máxima es baja (≈ 22 px de mundo) y la cámara no se eleva.
- [Bots en el lodo] → les toca igual que a la persona; su ajuste de ritmo (±6 %) no cambia.
- [Más pistas en la lista de sala con servidor viejo] → Pages y Deno Deploy publican con el mismo merge; durante unos
  segundos una sala con mapa nuevo podría rechazarse y basta con reintentar.

## Migration Plan

Sin migración: el progreso no cambia de forma; `copaEnCurso` viejo sigue en la Copa Fiesta; sin `arcade_personaje`
se usa Xalli. Rollback: revertir el merge.

## Open Questions

- ¿El profe quiere que la Copa Mesoamericana se desbloquee al terminar la Copa Fiesta? Hoy las dos están abiertas.
