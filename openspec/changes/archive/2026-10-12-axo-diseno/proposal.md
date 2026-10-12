## Why

«Axo y los 12 mundos» (cambio archivado `juegos-plataformas-karts`) ya funciona, pero se ve simple: Axo es un
rectángulo rosa pixelado, el pasto y la tierra son planos, casi no hay decoraciones y el mapa de mundos es un panel
con tres botones. Los alumnos y las alumnas juegan sobre todo en celular, y en un celular vertical (390×844) el
nivel ocupa una franja chica al centro con mucho espacio vacío arriba y abajo.

El profe quiere que el juego se vea **mucho mejor**, sin cambiar las reglas ni romper el guardado de progreso.

## What Changes

- **Axo** se dibuja como un ajolote original con más carisma (branquias rosas, ojos con brillo, sonrisa, cachetes y
  cola) y animaciones de reposo, caminar, saltar, caer, aterrizar, daño (translúcido suave, sin parpadeo fuerte),
  victoria y caída al perder; variantes visuales con champiñón (más grande) y con chile de fuego (otro tono).
- **Mundos:** fondos con paralaje de 2–3 capas por mundo (pradera con colinas y nubes, desierto con dunas y sol,
  hielo con montañas nevadas y auroras, volcán con humo y brillo de lava) y castillos con muros, ventanas,
  estandartes y antorchas; tiles con borde, sombra y textura; plataformas, cajas, monedas que giran, banderas,
  enemigos con personalidad por mundo y un jefe más vistoso con barra de vida.
- **Partículas ligeras:** polvo al aterrizar, chispas al tomar monedas y ambiente por mundo (nieve, ceniza y brasas,
  arena, polen).
- **Mapa de mundos:** escena ilustrada por mundo con un camino, nodos por nivel y el castillo del jefe; tira de los
  12 mundos con el avance; candados en los mundos «Próximamente»; Axo parado en el nivel que sigue.
- **HUD y botones táctiles** más pulidos y legibles; en celular vertical el sobrante de pantalla se vuelve cielo y
  subsuelo del mismo nivel, así el HUD no tapa el juego.
- **Rendimiento:** capas estáticas pre-dibujadas en canvas fuera de pantalla (fondos, tiles), sin imágenes externas;
  `prefers-reduced-motion` quita el paralaje y las partículas.
- Sin cambios de reglas, física, puntos, mensajes con la plataforma ni formato del progreso guardado.

## Capabilities

### New Capabilities
- Ninguna.

### Modified Capabilities
- `juegos`: requisito nuevo de diseño visual de «Axo y los 12 mundos».

## Impact

- Superficies: solo `juegos.html` indirectamente (el juego vive en su iframe). No toca el portal, Inglés,
  Secundaria, el servidor Deno, Postgres/Realtime/Auth de Supabase, el repo de datos ni Notion.
- Archivos que cambian: `juegos/plataformas.html` (dibujo, mapa, HUD, botones y CSS) y
  `tests/e2e/e2e-plataformas.js` (capturas por mundo y del mapa). `juegos/arcade.js` no cambia.
- Documentación: `docs/frontend-standards.md` (nota de dibujo de Arcade).
- Acciones externas: ninguna. Tras el merge, GitHub Pages publica sola (usuario).
