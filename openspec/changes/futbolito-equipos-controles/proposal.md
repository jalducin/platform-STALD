## Why

El profe probó los juegos en producción y pidió: «el juego de futbolito debe poderse jugar en equipo y los controles no
jalan bien, de billar mejorar controles igual». El diagnóstico con toques reales (design.md §1) confirma fallas
concretas: en Futbolito la patada sale hasta **soltar** el dedo y se pierde si el dedo tiembla más de 12 px o dura más de
300 ms, la barra activa salta a la defensa cuando la pelota toca a los medios por detrás y, a medio arrastre, el dedo
pasa a mover otra barra sin aviso; no hay botones visibles. En Billar un simple toque cambia la mira de golpe, tocar
cerca de la blanca para apuntar dispara un tiro accidental (la resortera dispara con 12 px de jalón), ⟲ ⟳ mueven 0.3°
por toque y no repiten al sostener, y la barra de fuerza es delgada y salta al tocarla. En sala, Futbolito solo admite
1 vs 1.

## What Changes

- **Controles de ⚽ Futbolito** (individual en tiempo real): selector en la portada (y botón 🎮 en el HUD) con
  «🔘 Botones» (por omisión en táctil: flechas grandes que mueven la barra en la dirección en que se ve, «⚽ PATEA» y
  «🔄 BARRA» grandes), «👆 Deslizar» (mitad izquierda desliza, mitad derecha patea al tocar) y «🎮 Mando clásico»
  (`juegos/mando.js`: cruceta mueve, A patea, B/L/R cambian de barra, START pausa); la elección se recuerda
  (`localStorage.futbolito_control`). La patada sale al **bajar** el dedo; la barra activa respeta la pelota pegada por
  detrás, tiene histéresis, el cambio manual dura 2.5 s y su nombre se ve. Teclado: ↑ ↓ / W S (y ← → / A D) mueven,
  Espacio patea, Tab / Q / E cambian de barra, P / Esc pausa.
- **Futbolito en sala por equipos**: formato «1 vs 1» o «2 vs 2» al crear la sala (`opciones.formato`). En 2 vs 2 caben
  4 personas; los bots completan los asientos y ceden su lugar a cada persona que entra (1 vs 1, 2 vs 1 con o sin bots,
  2 vs 2). Equipos automáticos y balanceados por orden de entrada, con botón «🔁 Cambiar de equipo» en la sala de
  espera. Con 2 por equipo, una persona maneja medios + delanteros y la otra portero + defensa; cada quien tiene color y
  nombre en sus barras y en el marcador.
  - Sigue por tiros (la sala escribe en el repo de datos con 0.3–1.5 s de latencia): tira quien maneja la barra que
    tiene la pelota (persona o bot). Cada tiro lleva `barra` y el servidor valida que esa barra sea de quien tira
    (409 `no_es_tu_barra`).
  - Controles del tiro: flechas para correr la barra, ⟲ ⟳ (sostenidos) y barra para el ángulo, fuerza con número y
    «⚽ PATEA»; también con el mando y el teclado.
- **Controles de 🎱 Billar**: arrastrar apunta sin saltos (solo al mover más de 8 px), ajuste fino ⟲ ⟳ que repite y
  acelera al sostener (0.1° por toque), ángulo en grados a la vista, bola fantasma más clara; resortera solo desde la
  blanca, con número de fuerza, dispara con jalón ≥ 40 px y se cancela regresando a la blanca; barra de fuerza vertical
  grande con número; «🎱 TIRAR» grande; «🎮 Mando clásico» opcional (cruceta o palanca apunta, L/R fino, A tira, X/Y
  fuerza, B efecto, START pausa), recordado en `localStorage.billar_control`.
- **Servidor**: `MESAS.futbolito` con formatos (`2v2` → `{ max: 4, asientos: 4, min: 2 }`, igual en
  `juegos/mesas.js`); `opciones.formato` validado; preferencia de equipo con `POST /juegos/sala/<código>/unirse
  { equipo }` antes de empezar (409 `equipo_lleno`); `validarJugada` acepta `barra` 0…7 en Futbolito (obligatoria en
  2 vs 2) y valida dueño de la barra (`server/futbolito.ts`).

## Capabilities

### New Capabilities
<!-- ninguna -->

### Modified Capabilities
- `juegos`: requisitos nuevos de controles de Futbolito y Billar y de Futbolito por equipos en partida (los requisitos
  de `futbolito-billar` aún no están archivados en `openspec/specs/`, por eso van como ADDED).

## Impact

- **Superficies:** `juegos/futbolito.html`, `juegos/billar.html`, `juegos/futbolito-motor.js`, `juegos/fisica.js`,
  `juegos/mesa-ui.js`, `juegos/mesas.js`, `juegos.html` (cambios chicos marcados `// futbolito-equipos`: formato al
  crear, equipos en la sala de espera, mesa de hasta 4 en el puente de sala), servidor Deno (`server/salas.ts` con
  cambios chicos marcados, `server/futbolito.ts` nuevo). No toca `index.html`, `ingles.html`, `secundaria.html`,
  Notion, Postgres `stald_*`, Supabase Auth ni Realtime.
- **Datos:** el repo privado guarda `equipo` (0 | 1, opcional) en el archivo de cada jugador de la sala y `barra` en
  las jugadas de Futbolito. Sin correos ni datos personales nuevos. **Matriz de acceso:** sin cambios; cada jugador
  escribe solo su archivo de la sala (su equipo y sus jugadas) y solo los jugadores de la sala y el admin la leen.
- **Pruebas:** Deno (`server/futbolito_equipos_test.ts`: formatos, mesa, equipo, dueño de la barra; reparto y línea
  de equipos de los motores; `server/mesas_test.ts`) y E2E `e2e-futbolito` y `e2e-billar` ampliadas (toques reales,
  mando, teclado, sala 2 vs 2 con 2 personas + 2 bots).
- **Coordinación:** otro agente parte `juegos.html` en módulos (`organizar-codigo`) y otro hace Golf; este cambio
  trabaja primero en sus archivos y deja los cambios compartidos chicos y marcados. Sin push, PR ni merge: integra el
  usuario.
- **Acciones externas** (usuario, tras el merge): publicación (Pages y Deno Deploy) y prueba en un celular real con 4
  personas.
