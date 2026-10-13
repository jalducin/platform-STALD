## Context

- 🕹️ Arcade carga cada juego en un iframe del mismo origen (`jugarArcade(id)` en `juegos/app/arcade.js`): el juego
  avisa `listo`, la página le manda `inicio { progreso }`, guarda lo que el juego manda con `guardar` en
  `/juegos/progreso/<id>` (versión `v`, escrituras encadenadas) y registra cada `puntos` en `/juegos/partida` (tope por
  juego en `CATALOGO`, `server/juegos.ts`). El avance tiene forma exacta por juego en `server/progreso.ts` (≤ 4096 B).
- Karts Turbo (`juegos/karts.html`) es la referencia de controles: capa de acciones (`KartsEntrada.registrar`), toques
  con *touch events* no pasivos por `identifier`, joystick flotante, botones grandes, selector recordado en
  `localStorage`, `Mando.crear` (`juegos/mando.js`) para el «🎮 Mando clásico» y el control físico, tutorial al
  empezar y distribución distinta en vertical y en horizontal. Su vista pseudo-3D sostuvo 60 fps con CPU ×4.
- Las salas (`server/salas.ts`, `juegos/app/salas.js`) escriben cada jugada en el repo de datos (0.3–1.5 s) y avisan
  por Supabase Realtime (`server/realtime.ts`, canal secreto por sala): sirven para turnos, no para tiempo real.
- El público son alumnos y alumnas en celular (sobre todo) y en PC. Sin build: HTML + JS clásico + canvas.
- Trabajo en paralelo: sprint 24b crea `juegos/emocion.js` (`gol()`, `suspenso()`, `victoria()`,
  `ultimoSegundos()`…); sprint 25 toca `server/salas.ts`, `tablero-ui.js` y Cálculo. Este cambio no toca esos archivos.

## Goals / Non-Goals

**Goals:**
- Un juego de futbol que se sienta de consola de 2010 (táctico, pausado, con peso), legible y fluido en un celular a
  60 fps, con controles como los de Karts.
- Modos para jugar solo contra la IA, en local en PC y una carrera ficticia con avance en el servidor, más una
  clasificatoria semanal que suma al ranking.
- Motor y reglas sin DOM, deterministas con semilla y probados en Deno.
- Retirar Futbolito del menú sin romper enlaces, historial ni salas en curso.
- Dejar listo el diseño del en línea en tiempo real (sprint 27).

**Non-Goals:**
- En línea en tiempo real en este sprint (ver §12).
- Licencias reales: ningún equipo, jugador, escudo, estadio o marca real.
- Cambiar `server/salas.ts`, `juegos/mando.js` (API estable), `juegos/futbolito.html` ni el ranking.
- Partidos completos de 90 minutos reales, árbitro visible, tarjetas rojas, lesiones o cambios durante el partido.

## Decisions

### 1. Nombre: «Fútbol Estelar 2010»

- Evoca la época (2010) sin usar nombres de sagas reales (se evita cualquier parecido con PES, FIFA o Winning Eleven).
- «Estelar» conecta con las **cartas de habilidad** (las «estrellas» del equipo) y con el tono de Arcade.
- Es corto para la tarjeta del menú y para el `CATALOGO`; id `futbol`, emoji ⚽ (queda libre al retirar Futbolito).
- Alternativa considerada: «Liga Estrella 2010». Se descartó porque «Liga» confunde con las ligas del universo
  (Liga Volcán, Liga del Pacífico, Liga Norte) y con el modo Carrera.

### 2. Vista: cámara lateral de transmisión en perspectiva 2.5D

| Opción | Legibilidad en celular | Costo por cuadro | Sensación 2010 |
|---|---|---|---|
| Cenital inclinada (2D con escala vertical) | buena, pero plana | mínimo | baja |
| Mode-7 por renglón (como Karts) | la cámara de Karts mira hacia adelante, no de lado | alto (por píxel) | media |
| **Proyección de puntos con cámara lateral (elegida)** | alta: profundidad clara, jugadores escalados | bajo: ~200 puntos + 22 sprites | alta |

- La cámara está detrás de la banda cercana, elevada (~29°), y sigue al balón a lo largo (x) con suavizado; a lo
  ancho (y) se desliza poco. Cada punto del mundo (metros; cancha de 105 × 68) se proyecta con una cámara estenopeica
  (`profundidad = dy·cosθ − dz·sinθ`, `pantalla = centro + d·F/profundidad`): franjas del pasto como trapecios (≤ 20
  polígonos), líneas y áreas como polilíneas proyectadas, porterías como palos y red, tribuna lejana como una franja
  pre-dibujada con paralaje.
- Jugadores: sprites pre-dibujados una vez por jugador (cuerpo, uniforme con su patrón, piel, peinado y **número**)
  en 7 cuadros (parado, 4 de carrera, patada, barrida) y espejo para mirar a la izquierda; se dibujan del fondo al
  frente, escalados por la profundidad, con su sombra. El balón tiene altura: su sombra queda en el piso y se separa
  al subir (pases elevados, centros, rebotes).
- **Horizontal** (recomendado): se ve ~50 m de largo y casi todo el ancho. **Vertical**: la cámara se acerca (~30 m)
  y el radar ayuda a ubicarse; un aviso sugiere girar el celular, pero se puede jugar.
- Rendimiento: canvas a DPR ≤ 2, área lógica fija, capas estáticas pre-dibujadas (tribuna, textura del pasto) y HUD
  en DOM que solo cambia cuando cambia su texto. Meta: 60 fps con CPU ×4 a 390×844 y 844×390 (medido en §11).

### 3. Motor sin DOM y determinista (`juegos/futbol-motor.js`, `window.FutbolMotor`)

- Paso fijo de 1/60 s; todo el azar sale de un generador con semilla (mulberry32 sobre FNV, como `juegos/arcade.js`).
  Las mismas entradas dan el mismo partido bit a bit (probado en Deno).
- API: `crearPartido({ semilla, equipos, tacticas, humanos, dificultad, minutos, fueraDeLugar, eliminatoria })`,
  `paso(p, entradas)`, `simular(p, segundos)` (IA contra IA, para pruebas) y `resultadoRapido(a, b, semilla)` (partidos
  de la IA contra la IA en la tabla, sin jugar).
- Entradas por persona: `{ x, y, pase, tiro, hueco, elevado, sprint, cambiar }` (eje analógico y botones mantenidos);
  el motor detecta los flancos (apretar y soltar) y mide cuánto se mantuvo cada botón (potencia).
- Eventos (`p.eventos`): `gol`, `poste`, `atajada`, `falta`, `penal`, `banda`, `meta`, `esquina`, `fuera_lugar`,
  `medio`, `final`, `ultimos`… La página los usa para sonidos, avisos y `Emocion`.

**Física del balón (metros, segundos):** en el piso, frenado constante de 1.5 m/s² más arrastre lineal 0.5/s (un pase
a 12.5 m/s recorre ~15 m: la distancia de un pase sale de invertir esa fórmula); en el aire, gravedad 9.81 y arrastre
0.05/s; rebote con restitución 0.55 y fricción 0.8; palos y travesaño rebotan. Gol al cruzar la línea entre los postes
(7.32 m) y bajo el travesaño (2.44 m).

**Posesión, peso e inercia:** quien lleva el balón lo empuja delante de su cuerpo con un retraso que depende de su
control (más lejos al hacer sprint: más fácil perderlo). El cuerpo gira con velocidad limitada (más lento con balón y
en sprint; «Regateador» gira más). Aceleración ~6 m/s², velocidad tope por atributo (6–8.6 m/s en sprint).
**Cansancio:** el sprint gasta energía y la energía baja la velocidad tope (hasta −25 %); «Incansable» gasta menos.

**Primer toque:** un balón suelto que llega a un jugador se controla si su velocidad relativa es menor al umbral de
control del jugador; si no, rebota con un desvío (mal control). Quien acaba de patear no puede tocarlo 0.3 s.

**Orientación del cuerpo:** pasar o tirar hacia un lado distinto al que mira el cuerpo primero gira al jugador (la
patada espera hasta quedar a ≤ 35° o 0.35 s) y suma error proporcional al ángulo. Así, acomodarse antes de patear
importa, como en 2010.

**Patadas con potencia:** al apretar empieza la barra (0 → 1 en 1 s); al soltar, se patea con esa potencia.
- A pase raso: al compañero en la dirección del joystick (o de la mirada), con velocidad para llegar y algo de
  ventaja; la potencia ajusta la fuerza (0.75×–1.3×).
- X pase al hueco: al espacio delante del compañero, hacia la portería rival (6–14 m según la potencia).
- Y pase elevado o centro: parábola a 30–45°; desde la banda del último tercio, al área.
- B tiro: a la portería, al lado que marca el joystick (o al palo lejos del portero); la potencia da velocidad
  (18–32 m/s) y altura (de más, se va por arriba). Error por distancia, atributo, ángulo del cuerpo y presión.

**Defensa:** A mantenido = presionar (corre a contener a 1.2 m; la presión hace que el rival pierda el balón con más
facilidad); A con sprint = barrida (alcance 3 m; si toca al rival antes que al balón es falta); B = entrada (a ≤ 1.8 m
de frente; por detrás puede ser falta); X = doble presión (otro compañero presiona); L = cambiar al compañero más
cercano al balón (al pasar, el control pasa a quien recibe).

**Portero (siempre automático):** se acomoda entre el balón y el centro de su portería, sale en el uno contra uno y,
ante un tiro, calcula por dónde cruzará la línea; tras su tiempo de reacción se lanza (alcance extra al estirarse);
ataja si el tiro es lento y lo rechaza si es fuerte (puede irse a tiro de esquina). Con el balón en las manos, saca a
un compañero libre a 1.2 s.

**Reanudaciones:** saque inicial (y tras cada gol), de banda (lanza el rival del último que tocó), de meta y tiro de
esquina; tiros libres por falta y **penal** si la falta es dentro del área. La persona que reanuda elige con los mismos
botones (A corto, Y largo o centro, B tiro en tiros libres y penales); la IA reanuda a 1 s. Los jugadores se acomodan
solos. **Fuera de lugar** (se puede apagar): al dar un pase se marca a quien está adelantado (más allá del penúltimo
defensor, del balón y en campo rival); si es el siguiente en tocar el balón, tiro libre para el rival.

**Tiempo:** el partido dura de 2 a 6 minutos reales (por omisión 4) y el reloj muestra 0'–90'; medio tiempo cambia de
lado. En eliminatoria, el empate se define en **tanda de penales** (5 y luego muerte súbita): la persona apunta con el
joystick y tira con B; cuando tira la IA, la persona elige hacia dónde se lanza su portero con el joystick.

### 4. IA

- **Posición por formación y táctica:** cada jugador tiene un puesto (u = 0 su portería … 1 la rival, v = −1…1 a lo
  ancho). El bloque se mueve con el balón (u + (balón − 0.5)·0.55), sube con la posesión y la mentalidad, baja sin
  balón según la línea defensiva, y se abre o se cierra con la amplitud. Los delanteros no se quedan adelantados
  (Difícil y Leyenda) salvo cuando corren al hueco.
- **Apoyo:** los dos compañeros más cercanos al que lleva el balón buscan una línea de pase libre; los delanteros
  hacen desmarques de ruptura de vez en cuando.
- **Marcaje e intercepción:** sin balón, cada defensor y medio cubre al rival más cercano de su zona del lado de su
  portería; el más cercano al balón presiona (y uno más si la presión es alta); quien está cerca de la trayectoria de
  un pase va a cortarla.
- **Decisión con balón** (cada 0.2–0.6 s según el nivel): puntúa tirar (distancia, ángulo, espacio; «Tirador lejano»
  alarga el rango), pasar a cada compañero (avance, línea libre, espacio del receptor; al hueco a quien corre; «Pase
  al hueco» lo prefiere), centrar desde la banda y conducir (espacio adelante; «Regateador»), con ruido según el nivel.

| Nivel | Velocidad | Reacción | Error de pase | Error de tiro | Presión | Entradas |
|---|---|---|---|---|---|---|
| Fácil | 0.82× | 0.6 s | 0.16 rad | 1.6× | 0.4× | 0.5× |
| Medio | 0.93× | 0.4 s | 0.09 rad | 1.0× | 0.75× | 0.8× |
| Difícil | 1.0× | 0.28 s | 0.05 rad | 0.7× | 1.0× | 1.0× |
| Leyenda | 1.05× | 0.18 s | 0.03 rad | 0.5× | 1.2× | 1.15× |

Fácil además tarda en reaccionar, tira poco y su portero reacciona más lento: lo gana un niño o una niña. Prueba:
la IA en Difícil manejando al equipo «humano» le gana a Fácil en la suma de varias semillas.

### 5. Cartas de habilidad (pasivas)

| Carta | Ícono | Efecto (sutil) |
|---|---|---|
| Pase al hueco | 🎯 | pases al hueco más precisos y con mejor ventaja; la IA los busca más |
| Tirador lejano | 🚀 | tiros de más de 20 m más fuertes y precisos; la IA tira desde más lejos |
| Muro | 🧱 | +entradas ganadas y más alcance para cortar pases |
| Regateador | 🌀 | gira más rápido con balón, lo lleva más pegado y le quitan menos |
| Portero felino | 🐱 | reacción −0.06 s y +0.4 m de estirada |
| Cabeceador | 🎩 | más alcance y precisión en balones aéreos |
| Velocista | ⚡ | +5 % velocidad tope y más aceleración |
| Incansable | 🔋 | gasta 40 % menos energía en sprint |

Los equipos del universo traen sus cartas; en la Carrera se desbloquean con dinero y se asignan (una por jugador).
El ícono se ve en la pizarra (alineación) y sobre el jugador que manejas.

### 6. Controles (como Karts)

| Acción | Celular (por omisión) | 🎮 Mando clásico / control físico | Teclado |
|---|---|---|---|
| Moverse | joystick flotante (izquierda) | palanca / cruceta | flechas o WASD |
| Pase · Presionar | A | A (botón de abajo) | J |
| Tiro (mantener) · Entrada | B | B | K |
| Pase al hueco · Doble presión | X | X | U |
| Elevado / centro · (barrida con sprint+A) | Y | Y | I |
| Sprint | R | R | Shift |
| Cambiar jugador | L | L | Q |
| Pausa | ⏸ | START | P o Esc |

- **Capa de acciones** `FutbolEntrada` (como `KartsEntrada`): cada fuente (teclado, toques, `Mando`, controles
  físicos por índice) responde `presionado(accion)` y `eje()`; el juego solo lee acciones. `FutbolEntrada.registrar`
  conecta fuentes nuevas.
- Toques con *touch events* no pasivos por `identifier` (lección de Karts); los botones cambian su texto en defensa
  (PASE→PRESIÓN, TIRO→ENTRADA, HUECO→DOBLE). Multitáctil: moverse, hacer sprint y patear a la vez.
- Selector en el menú: «🕹️ Joystick y botones» · «🎮 Mando clásico» (`localStorage.futbol_control`). El control
  físico y el teclado funcionan siempre en el modo de 1 persona.
- Vertical: mandos debajo de la cancha (como Karts). Horizontal: encimados en las esquinas con transparencia.
  Caben desde 320 px. Tutorial de 4 s al primer saque.

### 7. Modos

| Modo | Qué es | Puntos al ranking |
|---|---|---|
| ⚡ Partido rápido | tu club contra uno de la IA, nivel y duración a elegir | sí |
| 🏆 Copa | Copa Continental de Clubes: 8 clubes, cuartos, semifinal y final (penales si hay empate) | sí, por partido |
| 📈 Carrera | Liga Master ficticia (§9) | sí, por partido |
| 🛋️ Torneo local | llave de 4 u 8 equipos con personas y la IA (PC); los partidos IA–IA se simulan | no (aparato compartido) |
| 📅 Clasificatoria semanal | rival de la semana (igual para todos, sale de la semana ISO) en Difícil | sí (×1.2) |

Puntos por partido contra la IA: victoria 300, empate 120, derrota 40, +60 por gol a favor (máx. 6), −20 por gol en
contra, por nivel (Fácil 0.6, Medio 1, Difícil 1.4, Leyenda 1.8), acotado a [0, 1000] (tope del `CATALOGO`). Los
partidos locales no suman: varias personas comparten el aparato y la sesión.

**Multijugador local (PC):** de 2 a 4 personas; cada una elige su entrada (teclado izquierdo WASD + F/G/R/T +
Shift izq. + Q; teclado derecho flechas + J/K/U/I + Shift der. + L; o un control físico por índice de la Gamepad
API, leído con `Mando.controlABotones` uno por uno) y su lado: cooperativo contra la IA, 1 vs 1 o 2 vs 2. En este
modo no se crea el mando virtual (que junta todos los controles en uno). **En el celular, 1 persona:** dos juegos de
joystick y botones no caben sin taparse la cancha y los pulgares chocan; además la cámara lateral solo puede seguir a
un balón con buena legibilidad. Si un celular tiene controles conectados, el modo local los acepta igual.

**Torneo de sillón:** 4 u 8 equipos, cada uno de una persona o de la IA; llave de eliminación directa; los partidos
IA–IA se resuelven con `resultadoRapido`; los empates, en penales (simulados entre IA).

### 8. Universo ficticio (`herramientas/generar-futbol.ts` → `juegos/datos/futbol.json`)

- Script determinista (semilla fija, sin `Math.random`): 3 ligas de 8 clubes: **Liga Volcán** (Primera, media
  72–80), **Liga del Pacífico** (Segunda, 64–72) y **Liga Norte** (Tercera, 56–64); **Copa Continental de Clubes**
  (trofeo «Sol de Oro»). Nombres de clubes y ciudades inventados (p. ej. «Deportivo Tizal», «Marea Azul FC»,
  «Club Nopalera»), siglas de 3 letras, colores, patrón de uniforme, escudo (forma, colores, símbolo) y estadio.
- 16 jugadores y jugadoras por club (2 POR, 6 DEF, 5 MED, 3 DEL) con nombre de pila común y apellido inventado por
  sílabas (diversos: mujeres y hombres), número, edad, piel, peinado, atributos (velocidad, pase, tiro, defensa,
  físico, portero) y, algunos, una carta.
- El JSON se versiona; una prueba de Deno regenera el universo y lo compara con el archivo (determinismo) y revisa
  invariantes (24 clubes, 16 por club, posiciones, números sin repetir, nada de nombres repetidos de club).
- Escudos dibujados en canvas (formas: escudo, círculo, diamante, hexágono; símbolos: estrella, rayo, corona, balón,
  montaña, ola, sol, llama, ave, árbol). Uniformes: liso, rayas, aros, mitades, banda. Si los colores chocan, el
  visitante usa su segundo uniforme.

### 9. Carrera (Liga Master simplificada) y avance

- Crear club: nombre, siglas, escudo, uniforme y estadio. Entra a la **Liga Norte** en lugar del club más débil, con
  una plantilla de 16 de media ~55 (generada con la semilla de la carrera).
- Temporada: liga a doble vuelta de 8 = **14 jornadas**. Cada jornada: jugar (o «⏩ simular» sin puntos) y el resto de
  partidos se resuelven con `resultadoRapido` (deterministas por semilla, temporada, jornada y partido). Tabla con
  PJ, G, E, P, GF, GC, DG y Pts.
- Fin de temporada: los 2 primeros ascienden y los 2 últimos descienden (también los clubes de la IA); los jóvenes
  (≤ 23) suben de media y los mayores (≥ 31) bajan; si quedas entre los 4 primeros de Primera juegas la Copa
  Continental (3 partidos de eliminación).
- Dinero: victoria 300, empate 120, derrota 50, +20 por gol, ascenso 1000, campeón de liga 2000, copa 3000.
  **Mercado** (8 jugadores por temporada, precio por media), **ojeador** (300: descubre 3 jóvenes con potencial,
  más baratos) y **cartas** (800 cada una, se asignan a un jugador).
- El avance cabe holgado en 4096 B porque solo se guardan **tus resultados** y la composición de las divisiones: la
  tabla se reconstruye simulando los demás partidos con la semilla. Los jugadores se guardan como referencia al
  universo (`u<club>-<n>`) o a un generado (`g<semilla>`) más su ajuste de media y su carta.

Forma exacta en `server/progreso.ts` (`futbol`):

```
{ stats { partidos, ganados, empatados, perdidos, gf, gc, copas },
  clasif: null | { semana "AAAA-Www", mejor 0–1000, jugados 0–1000 },
  tactica { formacion "4-4-2"|"4-3-3"|"3-5-2"|"5-3-2", linea, ancho, mentalidad, presion (0–100) },
  carrera: null | { semilla 1–2147483647, club { nombre, corto, escudo { forma, c1, c2, simbolo },
    uniforme { c1, c2, patron }, estadio }, temporada 1–99, divisiones [[8],[8],[8]] (enteros 0–24 sin repetir,
    con el 24 = tu club), jornada 0–14, resultados [[gf, gc]] (tantos como la jornada, 0–20), dinero 0–9999999,
    plantilla [[id, ajuste −20…20, carta|null]] (14–20, ids sin repetir), cartas [conocidas sin repetir],
    ojeador [hasta 3 ids g…], ojeadas 0–9999, copa null | { ronda 0–3, viva }, palmares { ascensos, ligas, copas } } }
```

Textos libres (nombre del club y del estadio): letras, números, espacio y `.'-`, 2–24 caracteres; colores
`#rrggbb`. Se escapan siempre al pintarlos. Las preferencias de aparato (control, nivel, minutos, fuera de lugar,
sonido) viven en `localStorage`, no en el servidor.

### 10. Futbolito: se retira del menú

- Sale de `JUEGOS` (menú de Arcade) y de `JUEGOS_PARTIDA` (menú de salas): el futbol nuevo lo reemplaza y no tiene
  sentido ofrecer dos «⚽» en la misma categoría ni crear salas nuevas de un juego retirado.
- Se queda como **juego retirado** (`JUEGOS_RETIRADOS` en `juegos/app/menu.js`): `juegoPorId('futbolito')` lo sigue
  encontrando, así una sala de Futbolito que ya existía (enlace, revancha o recarga) se abre y se termina igual,
  y el ranking y el historial siguen con su título. `juegos/futbolito.html`, `futbolito-motor.js`, `server/futbolito.ts`,
  el soporte de salas de `server/salas.ts` y `CATALOGO.futbolito` no cambian.
- Alternativa descartada: borrar los archivos (rompería salas en curso y enlaces guardados) o dejar las dos tarjetas
  (confunde y parte el ranking de futbol en dos).
- La pantalla de categorías cuenta sola (sprint 22): Arcade pasa de 6 a 6 juegos (sale Futbolito, entra Fútbol
  Estelar). `e2e-juegos.js` y `e2e-futbolito.js` se ajustan: Futbolito ya no está en el menú, y su E2E prueba la sala
  heredada agregando la opción solo en la prueba.

### 11. Pruebas y rendimiento

- Deno (sin DOM): física del balón (frenado, altura y rebote, gol, poste), posesión y primer toque, pases (llega al
  compañero), determinismo con semilla, partidos completos IA–IA que terminan con marcador, reloj y medio tiempo,
  fuera de lugar on/off, faltas y penal, tanda de penales, cartas que cambian atributos, Difícil vence a Fácil,
  tabla y ascensos, calendario de 14 jornadas, mercado y ojeador deterministas, universo regenerado igual al JSON,
  y `server` (catálogo y forma del avance, incluido el límite de 4096 B con una carrera llena).
- E2E `tests/e2e/e2e-futbol.js`: menú y modos, toques reales (CDP) en el celular (mover + pase + tiro, multitáctil),
  mando clásico y control físico simulado, teclado, dos controles locales simulados, partido rápido que termina, gol,
  carrera guardada y recuperada, torneo de 4, ranking, capturas a 390×844, 844×390 y escritorio, y fps.
- fps con CPU ×4 (`Emulation.setCPUThrottlingRate`) como en Karts; meta 60, mínimo aceptable 50.

### 12. En línea en tiempo real (propuesta para el sprint 27)

**Por qué no cabe en las salas actuales:** cada jugada de sala es una escritura condicional al repo de datos
(0.3–1.5 s) y luego un aviso por Realtime. Un partido de futbol necesita ~10–20 actualizaciones por segundo con
≤ 150 ms de retraso. Rollback (los dos simulan y corrigen) exige un motor que pueda retroceder N cuadros y entradas
puntuales de ambos lados: posible porque el motor es determinista, pero con 22 jugadores e IA la re-simulación de
8–10 cuadros por corrección pesa en un celular con CPU modesta. Un servidor autoritativo en Deno Deploy no garantiza
una instancia por sala ni estado en memoria compartido (aislados efímeros), así que tampoco cabe.

**Elegido: autoritativo en el anfitrión sobre Supabase Realtime broadcast.**

- **Sala:** la de siempre (`/juegos/sala`, código, revancha, podio) con un juego `futbol` en formato `1v1` (mesa de
  2, sin bots). El servidor solo crea la sala, entrega el canal secreto (`rt.topic` con `canalNuevo()`, 24 hex) y al
  final registra el resultado. No simula.
- **Canal:** además del evento `estado` que hoy publica el servidor, los navegadores usan *broadcast cliente a
  cliente* en el mismo `topic` secreto con eventos `fe:entrada` (invitado → anfitrión) y `fe:foto` (anfitrión →
  invitado). Requiere habilitar `broadcast: { self: false, ack: false }` en el cliente y una política de Realtime que
  permita enviar en canales `sala-*` con la llave publicable (hoy solo escucha): **acción externa** en Supabase.
- **Anfitrión** (quien creó la sala): corre `FutbolMotor` a 60 Hz con sus entradas y las últimas del invitado; manda
  una **foto** a 15 Hz: `{ t, seq, b: [x,y,z,vx,vy,vz,dueño], j: 22 × [x,y,dir,anim] cuantizados a 0.05 m, marcador,
  reloj, estado }` (~500 B; ~7.5 KB/s, dentro de los límites de Realtime), y eventos importantes (gol, falta) con
  `ack`.
- **Invitado:** manda su entrada a 30 Hz solo cuando cambia (`{ seq, x, y, botones }`, ~40 B) con el último `seq`
  de foto visto; dibuja **interpolando** entre las dos últimas fotos con 100 ms de retraso; predice solo a su jugador
  controlado (movimiento sin balón) y lo corrige suave hacia la foto (reconciliación simple).
- **Reloj y pausa:** el anfitrión es dueño del reloj; si el invitado no manda entradas en 3 s, su equipo pasa a la IA
  y se avisa; si el anfitrión se cae (sin fotos en 4 s), se muestra «Conexión perdida» y la sala termina con el
  marcador de la última foto (el invitado lo reporta y el servidor lo acepta solo si el anfitrión no reportó).
- **Táctica sin tiempos muertos:** cada quien elige formación y deslizadores en la sala de espera (se guardan en
  `opciones` de su asiento con la escritura normal de la sala, antes del partido); el anfitrión los lee al empezar.
- **Respaldo:** sin `SUPABASE_*` o si el canal no conecta en 5 s, el en línea en tiempo real no se ofrece y la sala
  sugiere jugar la Clasificatoria semanal; nunca se cae a jugar por sondeo.
- **Seguridad:** el canal es secreto por sala (no se adivina); los mensajes llevan el id de asiento y el anfitrión
  ignora entradas de quien no está en la sala; el resultado final lo valida el servidor (marcadores 0–30, una sola
  vez por sala, igual que las demás salas). Sin datos personales en el canal (solo ids de sala y asientos).
- **Pruebas:** dos contextos de Playwright con un Realtime simulado (bus local) para latencia artificial de 50/150/
  300 ms y pérdida de paquetes; métricas: retraso percibido, saltos de posición y desincronización del marcador.
- **Partido igual en ranked y amistoso:** clasificatoria en línea (puntos al ranking de 👥 partidas) y amistoso sin
  puntos con equipos personalizados (el club de tu Carrera viaja en las opciones del asiento).

## Risks / Trade-offs

- [Motor grande en un solo archivo] → funciones cortas (complejidad ≤ 15, como pide `tests/calidad`), secciones
  claras y pruebas por pieza.
- [La IA puede verse torpe o demasiado buena] → parámetros por nivel en una tabla; prueba de que Difícil vence a Fácil
  y revisión de partidos IA–IA con capturas.
- [Rendimiento en celulares de gama baja] → sprites pre-dibujados, proyección de pocos puntos, DPR ≤ 2, medición con
  CPU ×4; `prefers-reduced-motion` quita sacudidas y confeti.
- [Avance que no cabe en 4096 B] → solo se guardan tus resultados y referencias; prueba con una carrera llena.
- [Nombres inventados que coincidan con personas reales] → apellidos por sílabas y nombres de pila comunes; sin
  apodos ni datos de alumnos.
- [Futbolito en salas viejas] → se conserva todo su soporte; solo deja de ofrecerse.

## Migration Plan

1. Merge a `main` (Pages publica la página y Deno Deploy el catálogo y el avance).
2. Verificar en producción: `juegos/futbol.html` y `juegos/datos/futbol.json` responden 200, la tarjeta aparece en
   Arcade sin Futbolito, `/juegos/progreso/futbol` responde y un partido suma puntos.
3. Reversa: revertir el merge (el avance guardado en `juegos/progreso/futbol/` queda sin uso y no afecta a nadie).

## Open Questions

- Si el profe quiere tarjetas rojas, lesiones o cambios en el partido (fuera de este MVP).
- Arranque del sprint 27 (necesita la política de Realtime para broadcast entre clientes).
