## Contexto

- Los juegos de acción ya tienen un precedente: Dragon Run (`juegos/dragon-run.html`) es una página autónoma en un
  iframe del mismo origen que avisa con `postMessage` y la plataforma guarda los puntos.
- Las salas (`server/salas.ts`) sincronizan por reloj del servidor (`inicio`), cada jugador escribe solo su archivo
  y los bots se calculan en el cliente con la semilla. El cierre usa `final` + `podio` (del host) y
  `POST /juegos/partida` con `sala`.
- Otro cambio en paralelo agrega «revancha» a las salas: los toques a `juegos.html` y `server/salas.ts` deben ser
  pequeños y localizados.

## Decisiones

### 1. Archivos propios y un módulo compartido
- `juegos/plataformas.html` y `juegos/karts.html`: cada juego completo (canvas, física, audio, controles, menús) en
  su página, embebida en un iframe como Dragon Run. Se pueden abrir solas para probarlas (el avance queda en memoria).
- `juegos/arcade.js`: reglas puras compartidas por los juegos y por `juegos.html` (sin DOM):
  - RNG con semilla (`fnv` + `mulberry32`, igual que las salas);
  - mundos (12, con `jugable` en los 4 primeros: pradera, desierto, hielo y volcán) y su física;
  - pistas (puntos de control, superficie, vueltas) y su muestreo con Catmull-Rom;
  - tiempo de referencia de cada nivel o pista, tiempos simulados de los bots de sala, mapa de la sala a partir de
    la semilla, puntos por lugar y límites de tiempo de sala.
- `juegos.html` solo agrega: la categoría Arcade y sus 2 tarjetas, `jugarArcade(id)` (iframe + intermediario de
  mensajes), los 2 ids en `JUEGOS_PARTIDA`, una línea en `pintarSala` y `pintarArcadeSala`. No modifica
  `pintarFinalSala`: la llama y agrega debajo la tabla de tiempos.

### 2. Comunicación iframe ↔ plataforma
- El juego avisa a `parent` (solo a `location.origin`); `juegos.html` acepta mensajes solo de su iframe y de su
  origen, con `d.juego` igual al juego abierto.
- Mensajes del juego: `listo`, `guardar { datos }`, `puntos { puntos, aciertos, total, segundos, titulo, detalle }`
  (individual) y `meta { ms, monedas }` (sala; `ms: null` si no terminó).
- Mensajes de la plataforma: `inicio { modo, progreso, v }` (individual) o `inicio { modo: "sala", mapa, seed,
  inicioEn, bots: [{ nombre, ms }] }`, `guardado { ok }` y `puntos-ok { guardado, puntos, totalIndividual, pos,
  error }`.
- El juego nunca habla con el servidor: así no maneja la sesión y no hay una segunda forma de autenticar.

### 3. Progreso individual en el servidor
- `GET /juegos/progreso/<juego>` → `{ juego, v, datos, actualizado }` (`v = 0` y `datos = null` si no hay).
- `PUT /juegos/progreso/<juego>` `{ v, datos }` → `{ ok: true, v: v + 1, actualizado }`.
  - Escritura condicional en dos niveles: la versión `v` que trae el cliente debe coincidir con la guardada
    (si no: 409 `version_vieja` con `{ v, datos }` actuales, para que otra pestaña vieja no pise el avance) y
    `store.put` con el `sha` leído (3 reintentos ante conflicto).
  - Validación: juego en `JUEGOS_PROGRESO` (400 `juego_sin_progreso`), JSON válido (400 `json_invalido`), `v`
    entero ≥ 0 (400 `version_invalida`), tamaño de `datos` serializado ≤ 4096 bytes (413 `progreso_grande`) y forma
    exacta por juego, sin llaves extra (400 `progreso_invalido`). 405 para otros métodos.
- Archivo `juegos/progreso/<juego>/<id-jugador>.json` = `{ v, datos, actualizado }`. Solo el dueño lo lee y escribe.
- Forma de `plataformas`:
  `{ mundo 1–12, nivel 1–3, vidas 0–99, monedas 0–99, poder "base"|"grande"|"fuego", completados ["m-n"] (≤ 36,
  sin repetir), mejores { "m-n": segundos 1–999 } (≤ 36), enCurso: null | { nivel "m-n", checkpoint boolean } }`.
- Forma de `karts`:
  `{ copas { <copa>: { lugar 1–8, puntos 0–60 } } (≤ 8), records { <pista>: ms 10000–900000 } (≤ 32),
  piezas ["chasis-ligero"|"llantas-todoterreno"|"pintura-dorada"] (sin repetir), equipo { chasis "estandar"|"ligero",
  llantas "estandar"|"todoterreno", color de la lista }, copaEnCurso: null | { copa, carrera 0–3, puntos [8 × 0–60],
  dif 80–110 } }`. Una pieza equipada debe estar desbloqueada (el color `dorado` pide `pintura-dorada`).
- El cliente guarda al terminar o perder un nivel, al tocar el checkpoint, al terminar cada carrera de la copa y al
  cambiar el equipo. Las escrituras se encadenan (una a la vez, gana la última); ante 409 adopta la `v` del servidor
  y reenvía su avance una vez (la acción más reciente del jugador manda).
- Si el `GET` falla, el juego arranca con avance nuevo y lo avisa: el 409 protege el avance real de ser pisado.

### 4. Puntos del ranking
- Sin cambios en la regla: cada nivel o carrera terminada es un `POST /juegos/partida` individual con el tope del
  catálogo (`plataformas` y `karts`, categoría `arcade`, tope 2000) y cuenta para el límite diario de 100.
- Plataformas: `300 + monedas del nivel × 10 + enemigos × 20 + 2 × max(0, 300 − segundos) + 500 si venció al jefe`.
- Karts: `(9 − lugar) × 60 + monedas × 10`, y en la 4.ª carrera de la copa `+400/250/150` por oro, plata o bronce.

### 5. Carreras en partida (sala)
- `plataformas` y `karts` entran a `JUEGOS_PARTIDA` (servidor y página). Opciones: ninguna.
- Mapa: `Arcade.mapaDeSala(juego, seed)` elige un nivel normal (`m-1` o `m-2` de los mundos 1–4) o una de las 4
  pistas. Todos juegan lo mismo; nada se guarda en el progreso.
- Reloj: la carrera arranca en `sala.inicio` (hora del servidor). El juego recibe `inicioEn` y mide el tiempo desde
  ese instante; si alguien recarga, vuelve a la salida con el reloj corriendo.
- Envío: `POST /juegos/sala/<c>/respuesta { carrera: { ms, monedas } }` (`server/carreras.ts`):
  - `ms` entero entre el mínimo del juego (plataformas 6 s, karts 15 s) y su límite (240 s y 300 s), o `null` (no
    terminó); `monedas` entero 0–999;
  - el servidor exige que `ms` cuadre con su reloj: `ms ≤ (ahora − inicio) + 3 s` y `ms ≥ (ahora − inicio) − 20 s`;
    así nadie manda un tiempo más corto que el real tiempo después;
  - solo cuenta el primer envío (como las respuestas de preguntas); 400 `carrera_invalida`, 409 `no_empezo`.
- Bots: `tiempoBot = ref × factor`, con factor de la semilla por bot (BOT-VACHIRA 1.00–1.10, BOT-ISAGII 1.08–1.25).
  `ref` sale de la longitud del nivel (plataformas) o de la pista × vueltas (karts) entre una velocidad media.
  En karts, los bots de la sala corren como «fantasmas» que avanzan por la pista al ritmo de su tiempo; en
  plataformas, el HUD muestra su tiempo a vencer.
- Podio: se resuelve cuando todas las personas enviaron su carrera o al pasar `límite + 10 s`. Orden por tiempo
  (quien no terminó va al final). Puntos por lugar: `max(50, 500 − 75 × (lugar − 1))`, 0 si no terminó. Se usa
  `pintarFinalSala` (registra `final`, `podio` y la partida de sala) y debajo una tabla con los tiempos.

### 6. Plataformas
- Vista de 15 tiles de alto (16 px, 240 px lógicos); el ancho se adapta a la pantalla (256–480 px). Paso fijo de
  1/60 s con acumulador; escala entera del canvas para pixeles nítidos.
- Niveles generados con la semilla `m-n` a partir de **tramos** de 16 columnas hechos a mano (todos alcanzables
  con el salto: hoyos de hasta 3 columnas, subidas de hasta 2 tiles). Inicio, tramos, checkpoint a la mitad,
  tramos y meta; el castillo (nivel 3) termina en la arena del jefe. Más tramos y más dificultad por mundo y nivel.
- Física por mundo (`Arcade.MUNDOS[i].fisica`): aceleración, frenado, control en el aire y viento. Desierto: ráfagas
  de viento de la semilla con aviso 💨; hielo: frenado mínimo; volcán: las plataformas sobre hoyos caen 0.45 s
  después de pisarlas y vuelven a los 4 s, y los hoyos tienen lava.
- Salto con altura variable, *coyote time* y búfer de salto. Daño: grande o fuego → base con i-frames de 1.5 s
  (el personaje se ve translúcido, sin parpadear); base → pierde vida y reaparece en el checkpoint.
- Enemigos: caminante (patrulla sin caerse de las orillas y persigue dentro de 90 px) y saltarín. Se vencen
  pisándolos o con fuego. Jefe: 6 de vida (pisotón 2, fuego 1), camina hacia ti, salta cada pocos segundos; el del
  volcán además lanza fuego. Mundos 5–12 se muestran como «Próximamente».

### 7. Karts
- Vista cenital (más fluida en celular que un pseudo-3D por píxel): la pista se dibuja una vez en un canvas fuera
  de pantalla y cada cuadro se copia la parte visible. Cámara que sigue al carro con adelanto.
- Pista = curva cerrada Catmull-Rom muestreada cada 8 px; el avance, las vueltas (con paso obligatorio por la mitad)
  y las posiciones salen del índice de la muestra más cercana. Fuera del camino se frena según la superficie.
- Conducción: acelera solo; ◀ ▶ giran; «Derrape» con giro carga el mini-turbo (azul 0.6 s, naranja 1.3 s, morado
  2.1 s → turbo de 0.5, 0.9 o 1.4 s). Turbo de salida: tocar «¡Arranque!» en los últimos 0.5 s antes de «¡YA!»
  (super si es en los últimos 0.25 s); antes de eso, el motor se ahoga 0.8 s.
- Monedas: hasta 10; cada una +1.5 % de velocidad punta; un golpe quita 2.
- Ítems por posición relativa (primer lugar: cáscara, bola y monedas; al fondo: turbo, cohete guiado, estrella y
  rayo). El rayo frena 2.5 s a quienes van adelante, con un tinte suave en lugar de un destello.
- Bots: siguen la línea de la pista con carril propio y frenan antes de las curvas. Ajuste acotado: ±6 % según la
  distancia al jugador y una dificultad de copa entre 0.85 y 1.05 que sube 2 puntos si ganas y baja 3 si quedas 5.º o
  peor.
- Copa Fiesta: 4 carreras de 3 vueltas, puntos 15-12-10-8-6-4-2-1. Piezas: chasis ligero (copa en el podio),
  llantas todoterreno (ganar la copa) y pintura dorada (récord bajo la referencia en las 4 pistas).

### 8. Calidad y accesibilidad
- `visibilitychange` oculto → pausa (y audio suspendido); botón ⏸. Sonido WebAudio, opcional y recordado.
- `prefers-reduced-motion`: sin sacudidas de cámara, menos partículas y efectos sin destellos.
- Controles táctiles de 64 px con `pointerdown`/`pointerup` por botón (multitáctil); teclado: flechas/WASD, espacio
  y X.
- Ganchos de prueba solo con `?prueba=1` (`window.__plat`, `window.__karts`), como el `?auto=1` de Dragon Run.

## Alternativas descartadas
- **Pseudo-3D tipo «modo 7»**: se ve bien pero cuesta un recorrido por píxel cada cuadro; en celulares modestos baja
  de 60 fps.
- **Guardar el avance en `localStorage`**: no sigue al jugador entre aparatos y se pierde al cerrar sesión.
- **Carreras en vivo con posiciones de otras personas**: exige sincronía en tiempo real; con el modelo de salas
  (cada quien su archivo) basta comparar tiempos con el mismo mapa.

## Riesgos
- Un cliente modificado puede mandar un tiempo falso dentro de la ventana de 20 s; es un juego escolar sin premios
  y el servidor ya limita mínimos, máximos y el reloj.
- Merge con «revancha»: se evitó tocar `pintarFinalSala` y los manejadores existentes.
