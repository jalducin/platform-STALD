## Why

El profe dejó en `juegos/juegos_nuevos.md` el diseño de dos géneros clásicos para Juegos: **plataformas 2D** y
**carreras arcade de karts**. Es un documento amplio (12 mundos, 32 pistas, trajes, planeadores, pantalla
dividida…). Este cambio toma lo esencial y lo lleva a un alcance realista para HTML y JS sin build, en canvas y
pensado para jugar en celular (controles táctiles grandes y también teclado).

Hoy los juegos individuales no guardan avance entre sesiones: solo hay instantáneas locales de 3 h
(`juegos-recarga`). Un juego por mundos o por copas necesita que el alumno o la alumna continúe donde iba, en
cualquier aparato, así que hace falta una ruta de progreso en el servidor.

## What Changes

- **Juego nuevo `plataformas` («Axo y los 12 mundos»)**, en la categoría nueva **🕹️ Arcade** de `juegos.html`:
  - personaje original (Axo, un ajolote), arte propio en canvas, sin personajes ni marcas registradas;
  - mapa de mundos con estructura para 12; **4 mundos jugables** con físicas distintas: Pradera Verde (base),
    Desierto Árido (viento cruzado), Tundra de Hielo (poca fricción) y Volcán Activo (plataformas que caen y lava);
  - 3 niveles por mundo; el tercero es un castillo con **jefe sencillo** al final;
  - monedas (100 = vida extra), power-ups (**champiñón** aguanta un golpe, **chile de fuego** lanza bolas de fuego),
    enemigos que patrullan (con persecución acotada), **checkpoint** a media pantalla e **i-frames de 1.5 s**.
- **Juego nuevo `karts` («Karts Turbo»)**, también en 🕹️ Arcade:
  - vista cenital con cámara que sigue al carro, **4 pistas** (pradera, desierto, hielo y volcán) y **8 corredores**
    (tú y 7 bots con nombre);
  - derrape con **mini-turbo de 3 niveles** (azul, naranja y morado), **turbo de salida** con buen tiempo,
    **monedas** (hasta 10, suben la velocidad punta) e **ítems según la posición** (quien va atrás recibe mejores);
  - **Copa Fiesta** de 4 carreras con puntos por lugar, carrera rápida y taller de piezas desbloqueables;
  - bots con dificultad que se ajusta a cómo te va (acotada, sin trampas exageradas).
- **Modo individual con avance en el servidor:** ruta nueva `GET/PUT /juegos/progreso/<juego>` (solo `plataformas`
  y `karts`), guardada en `juegos/progreso/<juego>/<id-jugador>.json` con versión, escritura condicional y validación
  de tamaño y forma. Al volver, el jugador continúa donde iba. Los puntos del ranking siguen la regla de siempre:
  cada nivel o carrera terminada es una partida individual con tope (2000) en `POST /juegos/partida`.
- **Modo partida (sala):** puro reto contra bots y amigos, sin guardar avance. Todos juegan el mismo nivel o pista
  (sale de la semilla de la sala); cada quien envía su tiempo al servidor (`carrera: { ms, monedas }` en
  `/juegos/sala/<código>/respuesta`), los bots tienen tiempos simulados creíbles con la semilla y gana el mejor
  tiempo; el podio usa el flujo actual (`final`, `podio` y `POST /juegos/partida` con `sala`).
- **Calidad:** 60 fps con paso fijo, pausa automática al ocultar la pestaña, sonido opcional (🔊/🔇), controles
  grandes, sin parpadeos fuertes y respetando `prefers-reduced-motion`.
- Se versiona el documento de diseño del profe en `juegos/juegos_nuevos.md`.

## Capabilities

### Modified Capabilities
- `juegos`: catálogo con la categoría Arcade, dos juegos nuevos, progreso individual en el servidor y carreras en
  partida.

## Impact

- **Superficies:** `juegos.html` (catálogo, iframe de los juegos, sala de carreras) y servidor Deno
  (`server/juegos.ts`, `server/salas.ts`, nuevos `server/progreso.ts` y `server/carreras.ts`). No toca
  `index.html`, `ingles.html`, `secundaria.html`, Notion, Postgres `stald_*` ni Supabase Auth/Realtime.
- **Archivos nuevos:** `juegos/arcade.js` (reglas compartidas), `juegos/plataformas.html`, `juegos/karts.html`,
  `juegos/juegos_nuevos.md`, pruebas `server/progreso_test.ts`, `server/carreras_test.ts`,
  `tests/e2e/e2e-plataformas.js` y `tests/e2e/e2e-karts.js`.
- **Datos:** nuevo prefijo `juegos/progreso/` en el almacén de Juegos (repo privado o `stald_docs`, según la marca
  de migración). Sin correos: el archivo usa el id opaco del jugador.
- **Matriz de acceso:** cada jugador lee y escribe solo su propio progreso (el id sale de la sesión verificada);
  no hay ruta para leer el progreso de otra persona, ni siquiera para el admin. Sin sesión → 401/400 como el resto
  de `/juegos/…`; correo sin registro → 403 `no_registrado`.
- **Acciones externas** (usuario, tras el merge): redeploy de Deno Deploy y publicación en GitHub Pages; verificación
  en producción.
