## Context

`futbolito-billar` (en producción, `main` eae63e5) dejó Futbolito individual en tiempo real contra el bot y en sala
1 vs 1 por tiros, y Billar con arrastre, resortera, barra de fuerza, ⟲ ⟳ y efecto. Los dos exponen la capa de
acciones `window.accionesJuego` (`MesaUI.crearAcciones`) y existe el mando común `juegos/mando.js` (`Mando.crear`),
que Karts ya usa como «🎮 Mando clásico» (`juegos/karts.html`, cambio `karts-mando`). El profe pidió jugar Futbolito
en equipo y mejorar los controles de los dos.

## §1 Diagnóstico (medido antes de cambiar nada)

Playwright con Chromium en emulación móvil (`hasTouch`, `isMobile`) y **toques reales** por CDP
(`Input.dispatchTouchEvent`), suelto (`juegos/futbolito.html?prueba=1`, `juegos/billar.html?prueba=1`) y dentro de
`juegos.html` (marco de Arcade), a 390×844 y 844×390. Scripts del diagnóstico: `tests/e2e/salida/diag*.js` (no
versionados; la salida está ignorada).

**Futbolito**

| Medición | 390×844 | 844×390 | Lectura |
|---|---|---|---|
| Separación entre barras / diámetro del jugador | 69 px / 21 px | 62 px / 19 px | blancos chicos; no hay botones |
| Dedo abajo 150 ms: patada durante / al soltar | 0 / sí | 0 / sí | **la patada sale al soltar**: retraso = lo que dura el toque |
| Toque con temblor de 14 px | no patea | no patea | **patadas perdidas** (umbral 12 px) |
| Toque de 350 ms | no patea | no patea | **patadas perdidas** (umbral 300 ms) |
| Segundo dedo mientras el primero desliza | patea | patea | solo funciona con dos dedos |
| Pelota tocando a los medios por detrás (y = 278) | activa: defensa | activa: defensa | **mueve la barra equivocada** |
| A medio arrastre la pelota cruza a la defensa | el dedo pasa a la defensa; los medios regresan solos a 0 | igual | **se pierde el control sin aviso** |
| Retraso dedo → barra | 1 ms | 16 ms | descartado: no hay *lag* |
| Desplazamiento y zoom de la página tras deslizar 160 px y doble toque en el marco | sin cambio (zoom 1) | sin cambio | descartado: no interfieren |
| Marco del juego dentro de `juegos.html` | 358×724, cabe | 720×374, cabe | descartado |
| Deslizar a lo largo de la mesa (no de la barra) | no mueve | no mueve | sin pista visual de hacia dónde deslizar |

**Billar**

| Medición | 390×844 | 844×390 | Lectura |
|---|---|---|---|
| Escala / radio de bola / zona de resortera / jalón que dispara | 0.57 px/u / 6.3 px / 25 px / 12.6 px | igual | bola muy chica para el dedo |
| Un toque sin arrastrar | mira 0° → 194° | 0° → 284° | **la mira salta al tocar** |
| Precisión del arrastre a 60 px | 1° por px | 1° por px | gruesa para tiros finos |
| Tocar a 22 px de la blanca para apuntar y mover 20 px | **sale un tiro** (fuerza 22) | igual | **tiro accidental** |
| ⟳ un toque / sostenido 1 s | 0.3° / 0.3° | igual | **ajuste fino inservible**: no repite |
| Barra de fuerza | 158×30 px; tocarla salta 22 → 84 | 184×30 px | delgada, sin número grande |
| Botón Tirar | 240×50 px | 184×50 px | aceptable; se agranda |

Conclusión: no es un problema de rendimiento ni de *scroll*; es de **diseño de la entrada**.

## Goals / Non-Goals

**Goals:** controles claros con botones grandes y respuesta inmediata en los dos juegos; «🎮 Mando clásico» con
`mando.js` sin cambiar su API; teclado completo; Futbolito en sala por equipos (1 vs 1, 2 vs 1, 2 vs 2 con bots)
validado por el servidor; recordar la elección; 320, 390 y 844×390.

**Non-Goals:** tiempo real en sala; más de 2 por equipo; elegir puesto (atrás/adelante) a mano; torneos; cambiar las
reglas o la física de los motores (salvo la barra activa del modo vivo, que es entrada).

## Decisions

### §2 Futbolito individual: tres controles y patada al bajar el dedo
- Selector «🎮 Controles» en la portada y botón 🎮 en el HUD que cambia al siguiente: **🔘 Botones** (por omisión en
  táctil), **👆 Deslizar** y **🎮 Mando clásico**. `localStorage.futbolito_control` (`botones` | `deslizar` | `mando`;
  valor desconocido → `botones`).
- **Botones** (`#controles`): a la izquierda dos flechas grandes que mueven la barra en la dirección en que se ve en
  pantalla (◀ ▶ en vertical, ▲ ▼ en horizontal), a 300 u/s mientras se sostienen (igual que el teclado y el mando); a la derecha «⚽ PATEA» (grande) y
  «🔄 BARRA» con el nombre de la barra activa («Medios · auto» o «Defensa · tú»). Cada botón usa *touch events* no
  pasivos por dedo (como Karts): se pueden sostener una flecha y tocar PATEA a la vez.
- **Deslizar**: la mitad izquierda del canvas mueve la barra con el deslizamiento proyectado sobre el eje de la barra en
  pantalla (relativo, 1:1); tocar la mitad derecha patea. «🔄 BARRA» sigue a la vista.
- **La patada sale en `touchstart`** (botón PATEA o mitad derecha), sin umbral de movimiento ni de tiempo. La patada
  dura 0.2 s (sin cambio en el motor), así que una pelota que llega un poco después también sale.
- **Barra activa** (`Futbolito.barraActivaCon(st, eq, actual)`, en el motor, sin DOM): la candidata es la propia más
  cercana con la pelota delante o **pegada por detrás hasta el alcance** (`ALCANCE` = 15 u, antes 4 u); se cambia solo
  si la pelota salió de la zona de la actual (más de `ALCANCE + 6` u detrás de ella o más cerca de otra). El cambio
  manual («🔄 BARRA», B, L/R, Tab, Q/E) manda 2.5 s.
- **Mando clásico** (`Mando.crear`, como Karts): `mover` = cruceta (las 4 flechas; el juego proyecta `eje()` sobre el
  eje de la barra en pantalla, así la palanca de un control físico mueve en proporción), A = patear, B = siguiente
  barra, L = barra anterior, R = siguiente, START = pausa. Sin teclas (todas en `null`): el teclado del juego no
  cambia. Activo en el juego y la pausa con cualquier elección (un control físico funciona siempre); se ve solo con
  «Mando clásico» y entonces se oculta `#controles`.
- **Teclado**: ↑ ↓ / W S y ← → / A D mueven (la dirección de pantalla se proyecta sobre la barra; si es perpendicular,
  ↑ = ← y ↓ = →), Espacio / J patea, Tab / E / K siguiente barra, Q anterior, P / Esc / Enter pausa.

### §3 Futbolito en sala: controles del tiro
El tiro es `{ pos, angulo, fuerza }` como antes. Panel nuevo: flechas grandes que corren tu barra con la pelota
(sostenidas), ⟲ ⟳ sostenidos para el ángulo (1° por paso, repiten), barra de fuerza con número y «⚽ PATEA» grande.
Deslizar sobre la mesa sigue corriendo la barra. Mando: cruceta a lo largo de la barra = correr, L / R = ángulo,
X / Y (o ▲ ▼ si la barra se ve de lado) = fuerza, A = patear. Teclado: flechas/WASD corren la barra, Q / E ángulo,
R / F fuerza, Espacio patea.

### §4 Futbolito por equipos en sala
- **Formato** (`opciones.formato`): `1v1` (por omisión) o `2v2`; se elige al crear la sala. Mesa por formato en la
  tabla compartida (`MESAS` en `server/salas.ts` y `juegos/mesas.js`, iguales por `server/mesas_test.ts`):
  `futbolito: { max: 2, asientos: 2, min: 2, formatos: { "2v2": { max: 4, asientos: 4, min: 2 } } }`.
  `Mesas.de(juego, opciones)` y `enMesa(juego, humanos, conBots, opciones)` aplican el formato; sin `opciones`, la
  regla de siempre. Con bots, los bots completan los 4 asientos y cada persona que entra quita uno; sin bots se juega
  con las personas que haya (2 → 1 vs 1, 3 → 2 vs 1, 4 → 2 vs 2).
- **Reparto** (función pura, idéntica en `Futbolito.repartir` y `server/futbolito.ts`, comparadas en Deno):
  asientos = personas por orden de entrada (`unido`) y luego bots; cupo por equipo = ⌈asientos / 2⌉.
  1. Las personas con preferencia (`equipo` 0 | 1) entran a su equipo si cabe, en orden;
  2. las demás personas se alternan por orden de entrada (la k-ésima al equipo k % 2; si está lleno, al otro), así
     «cambiar de equipo» te lleva con quien ya estaba ahí sin mover a nadie más (salvo que el equipo se llene);
  3. los bots van al equipo con menos integrantes (empate: equipo 0).
  Dentro de cada equipo, por orden de asiento: con un integrante maneja las 4 barras; con dos, el primero
  **medios + delanteros** («adelante») y el segundo **portero + defensa** («atrás»).
- **Cambiar de equipo**: en la sala de espera de un 2 vs 2, «🔁 Cambiar de equipo» manda
  `POST /juegos/sala/<código>/unirse { equipo }`. Solo antes de empezar y solo en `futbolito` con formato `2v2`;
  si ya hay 2 personas con esa preferencia → 409 `equipo_lleno`; otro valor → 400 `equipo_invalido`. Se guarda en el
  archivo del jugador (`equipo`).
- **Esquema por tiros con latencia de 0.3–1.5 s** (cada jugada es una escritura condicional en el repo de datos y
  Realtime avisa después): el tiempo real en equipo necesitaría 15–30 mensajes por segundo **por persona** y
  publicación desde los clientes (rompe el modelo de `salas-realtime`), así que se descarta. Se elige el esquema
  determinista existente extendido a asientos: **tira el asiento que maneja la barra con la pelota**
  (`Futbolito.motorSala(reparto)` envuelve el motor: `turno(st)` = asiento dueño de `st.posesion.barra`; si es bot,
  tira el bot; si no tira a tiempo, tiro automático). Así:
  - cada tiro es una escritura (igual que 1 vs 1) y todos los aparatos reproducen lo mismo con `Fisica.linea`;
  - la cooperación sale sola: la pelota que se frena en tus medios es tuya, la que llega a la defensa es de tu pareja;
  - alternativas descartadas: turnos fijos alternados entre compañeros (ignora dónde está la pelota y deja tiros sin
    sentido), y «el anfitrión simula y los demás mandan su barra» (latencia de 1–3 s para ver tu propio movimiento).
- **Validación en el servidor** (`server/futbolito.ts`, llamada desde `salas.ts`): el servidor no simula, pero sí
  conoce el reparto (mismos datos: jugadores por `unido`, `equipo`, bots y formato). La jugada de tiro lleva
  `barra` (0…7): obligatoria en `2v2` (sin ella, 400 `jugada_invalida`), opcional en `1v1` (compatibilidad); si viene,
  debe ser de una barra del asiento de quien tira (409 `no_es_tu_barra`). Quien no tiene asiento (más personas que el
  cupo) → 403 `no_en_mesa`. En el cliente, `Fisica.linea` acepta un `motor.valida(st, jugada)` opcional: una jugada
  con `barra` distinta de la que tiene la pelota no cuenta (se espera o hay tiro automático), igual en todos los
  aparatos.
- **Colores y nombres**: cada asiento tiene color propio (equipo rojo: amarillo y rosa; equipo azul: cian y lima) que
  se ve en el mango de sus barras con su nombre corto, en el marcador («Ana + Bot» vs «Luis + Bot») y en la leyenda de
  turno («⏳ Tira Ana · medios»). Tus barras llevan además el brillo de «tú». Tu equipo siempre ataca hacia arriba.
- **Puntos**: por equipo (60 por gol + 350 al ganar, tope 1000) para cada integrante.

### §5 Billar: apuntar fino, fuerza clara, tirar grande y mando
- **Arrastrar** sobre la mesa apunta hacia el dedo **solo cuando el dedo se movió más de 8 px** (un toque ya no cambia
  la mira). Ángulo a la vista («🎯 123.4°»).
- **Ajuste fino**: ⟲ ⟳ de 44 px o más; un toque = 0.1°; sostenidos repiten cada 60 ms y aceleran de 0.1° a 2° por paso.
- **Bola fantasma**: círculo relleno translúcido con borde en el punto de choque, línea de salida de la bola tocada
  (amarilla) y de la blanca.
- **Resortera**: empieza solo si el dedo baja a menos de `max(4R·K, 36 px)` de la blanca; muestra «💪 63» junto a la
  blanca; dispara al soltar solo si el jalón es ≥ 48 px (con 40 px, tocar a 22 px de la blanca y mover 20 px —el caso del diagnóstico— quedaba en 39 px, demasiado justo); regresar a menos de 24 px cancela.
- **Fuerza**: barra vertical propia (`#fuerza`, 56 px de ancho) con número grande; arrastrar o tocar en ella fija el
  valor según la altura; − / + al lado. Teclado ↑ ↓ / W S.
- **«🎱 TIRAR»** de 60 px de alto.
- **Mando clásico** (`Mando.crear` con `analogico: true`): cruceta ◀ ▶ o palanca = apuntar (proporcional), L / R =
  fino, A = tirar, X / ▲ = más fuerza, Y / ▼ = menos fuerza, B = efecto, START = menú/pausa. Sin teclas. Con el mando
  se oculta el panel y se ve una franja de datos (ángulo, fuerza, efecto). `localStorage.billar_control` (`tactil` |
  `mando`); selector en la portada y botón 🎮 en el HUD.

### §6 Archivos y coordinación
Todo lo de controles vive en `juegos/futbolito.html`, `juegos/billar.html`, `juegos/mesa-ui.js` (botón sostenido con
repetición `MesaUI.sostener`) y los motores. Los cambios compartidos son chicos y marcados `// futbolito-equipos`:
`server/salas.ts` (formato, `equipo` en unirse, `barra` en la jugada, llamada a `server/futbolito.ts`, mesa por
formato), `juegos/mesas.js` (formatos), `juegos.html` (selector de formato, equipos en la espera, mesa de hasta 4 en
`pintarFisicaSala`, `participantes()` con `opciones`).

## Risks / Trade-offs

- [El reparto del servidor y el del cliente difieren] → una sola regla escrita dos veces y una prueba Deno que compara
  las dos en muchos casos (como `mesas_test.ts`).
- [Una persona entra cuando ya empezó] → no cambia: `ya_empezo`. El reparto se calcula con los jugadores de la sala, que
  ya no cambian tras empezar.
- [Un tiro de otra versión de la página sin `barra` en 2 vs 2] → 400 y la página se resincroniza; en 1 vs 1 sigue
  valiendo sin `barra`.
- [Más controles = más ruido en pantallas de 320 px] → capturas a 320, 390 y 844×390 revisadas; los botones se encogen
  con `clamp` y el mando ocupa el lugar de `#controles`.
- [Conflictos con `organizar-codigo` y Golf en `juegos.html`/`salas.ts`] → cambios mínimos, marcados, sin mover
  código.

## Migration Plan

Sin migración: las salas viejas de Futbolito no tienen `formato` (= `1v1`) y sus jugadas sin `barra` siguen valiendo.
Se publica con el merge a `main` (Pages y Deno Deploy).
