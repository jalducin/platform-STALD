## Why

La categoría 🕹️ Arcade tiene dos juegos de carreras («Axo y los 12 mundos» y «Karts Turbo»). Los alumnos y las
alumnas, que juegan sobre todo en el celular, piden juegos de física «de mesa» para retarse entre ellos. Se agregan
dos juegos nuevos, con arte propio y sin marcas: **⚽ Futbolito** (futbolito de mesa con vista cenital) y
**🎱 Billar** (bola 8). Los dos se juegan solos contra un bot y en sala 1 vs 1.

## What Changes

- **⚽ Futbolito** (`futbolito`, `juegos/futbolito.html`): mesa vista desde arriba con 4 barras por equipo
  (portero, defensa, medios y delanteros) cuyos jugadores se deslizan y giran al patear; rebote con física de paso
  fijo a 60 fps; gana quien llega primero a 5 goles.
  - **Individual** contra el bot (Fácil, Medio, Difícil), en tiempo real: deslizar el dedo en tu mitad mueve la
    barra activa y tocar patea; la barra activa cambia sola según dónde está la pelota. Teclado en escritorio.
  - **En sala 1 vs 1 por tiros** (decisión en `design.md`: el modelo de salas escribe un archivo por jugada en el
    repo de datos y Realtime solo avisa cambios, así que el tiempo real a 60 fps no es viable): quien tiene la
    pelota acomoda su barra, apunta y elige la fuerza; el tiro se manda como jugada `{ pos, angulo, fuerza }` y se
    simula igual en todos los aparatos (las demás barras se mueven con una defensa automática igual para los dos).
    Si entra una sola persona, juega contra un bot.
- **🎱 Billar** (`billar`, `juegos/billar.html`): bola 8 con 15 bolas (lisas 1–7, rayadas 9–15 y la 8), 6 troneras,
  colisiones elásticas y fricción. Apuntar arrastrando con línea guía; fuerza con la barra o con lo largo del
  arrastre; efecto opcional (seguir o retroceder). Reglas básicas: falta con la blanca (la blanca vuelve a su punto y
  el turno pasa), meter la 8 antes de tiempo o con falta pierde.
  - **Individual** contra el bot (Fácil, Medio, Difícil).
  - **En sala 1 vs 1 por turnos**: cada tiro es una jugada `{ angulo, fuerza, efecto }` que todos los aparatos
    simulan de forma **determinista** (matemática propia sin `Math.sin`/`Math.cos`/`Math.atan2` y estado redondeado
    tras cada tiro). Si entra una sola persona, juega contra un bot.
- **Motores sin DOM** compartidos por los juegos y probados con Deno: `juegos/fisica.js` (trigonometría
  determinista, azar con semilla y línea de turnos de sala), `juegos/futbolito-motor.js` y `juegos/billar-motor.js`.
- **Servidor** (`server/salas.ts`, `server/juegos.ts`): `futbolito` y `billar` en `JUEGOS_PARTIDA`; `validarJugada`
  para sus tiros (y `rendirse`); una partida terminada (ya hay `final`) rechaza jugadas nuevas con 409
  `partida_terminada`; mesa `{ max: 2, asientos: 2, min: 2 }` en `MESAS` y en `juegos/mesas.js`; catálogo con título
  para el ranking «🔥 Juegos» y tope de 1000.
- **`juegos.html`**: dos tarjetas en Arcade (iframe como los otros juegos de Arcade, sin avance guardado) y un puente
  de sala (`pintarFisicaSala`) que pasa jugadas y jugadores al iframe, manda los tiros y pinta el podio con
  `pintarFinalSala` (revancha incluida).
- Se ven bien a 360/390 px en vertical y en horizontal, respetan `prefers-reduced-motion` y los textos están en
  español de México.

## Capabilities

### New Capabilities
<!-- ninguna -->

### Modified Capabilities
- `juegos`: requisitos nuevos de Futbolito y Billar (individual, sala, reglas, controles) y de las jugadas de física
  en sala.

## Impact

- **Superficies:** `juegos.html`, `juegos/futbolito.html`, `juegos/billar.html`, `juegos/fisica.js`,
  `juegos/futbolito-motor.js`, `juegos/billar-motor.js`, `juegos/mesas.js`, servidor Deno (`server/salas.ts`,
  `server/juegos.ts`). No toca `index.html`, `ingles.html`, `secundaria.html`, Notion, Postgres `stald_*`,
  Supabase Auth ni Realtime (Realtime sigue igual: solo avisa los cambios de la sala).
- **Datos:** el repo privado guarda las jugadas de sala como los demás juegos por turnos
  (`juegos/salas/<código>/<id>.json`, `jugadas[]`) y las partidas en `juegos/semanas/…`. Sin correos ni datos
  nuevos. **Matriz de acceso:** sin cambios; cada jugador escribe solo su archivo de la sala y solo jugadores de la
  sala (y el admin) la leen.
- **Pruebas:** Deno (`server/futbolito_billar_test.ts`: validación, fin de partida, mesas, catálogo y motores
  deterministas) y E2E `tests/e2e/e2e-futbolito.js` y `tests/e2e/e2e-billar.js` (individual con toques reales, sala
  con 1 persona + bot y con 2 personas, capturas a 390 px y en horizontal); conteo del menú robusto en `e2e-juegos`,
  `e2e-fusion`, `e2e-clasicos` y `e2e-karts`.
- **Acciones externas** (usuario, tras el merge): publicación en GitHub Pages y Deno Deploy (merge a `main`) y
  prueba en un celular real.
