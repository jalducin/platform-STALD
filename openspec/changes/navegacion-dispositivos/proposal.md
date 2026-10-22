## Why

El profe pidió (2026-10-22): «Un agente más para confirmar que la navegación para los usuarios es ágil, tanto en
celular, tablet o PC». Hasta hoy cada E2E revisa su página a 360 px (y a veces una captura de escritorio), pero nadie
mide de punta a punta las tareas clave de cada persona en los tres tipos de aparato: cuántos toques cuestan, si algo
queda tapado o chico para el dedo, si el atrás del navegador funciona y si en tablet y PC el diseño aprovecha el ancho.

La auditoría (Playwright, 5 tamaños: 360×740 con toque, 768×1024 y 1024×768 con toque, 1280×800 y 1920×1080) encontró:

- **Atrás del navegador en Secundaria:** las pestañas (Inicio, Semana, Misiones, Mapa, Árbol, Mi horario, Mis materias,
  Resultados) usaban `history.replaceState`; «Atrás» en Android salía de Secundaria (o al portal) en vez de regresar a
  la pestaña anterior. Pasa en alumna y en el admin.
- **Objetivos táctiles < 44 px:** «← Inicio» y «🎮 Juegos» de Inglés (32 px), «Abrir en YouTube ↗» de la clase
  (35 px), el nombre del alumno en el mapa de calor (43 px de ancho), la casilla del aviso de Juegos en tablet (24 px)
  y el «✕» de los juegos (34 px de ancho). `.btn.sm` medía 36 px en tablets de 720 px o más.
- **Entregas que no cargan (sin Postgres):** el panel pide la bandeja para «📥 Por revisar» y, si la sección
  «📥 Entregas» ya se había dibujado con el esqueleto, nadie la repintaba: se quedaba cargando para siempre.
- **Selector de alumna del profe:** con `replaceState`, las entradas del historial perdían su `?alumna=`.
- **Elementos tapados:** en tablet vertical, «Siguiente misión» quedaba debajo de la barra fija del examen al llegar a él.
- **Columna de celular estirada en PC:** Inglés (alumnos y alumnas) y Secundaria en 760 px y Juegos en 720 px, también
  en 1920 px (40 % y 38 % de la ventana); las 7 pestañas de Secundaria se partían en dos filas.

Producción (solo lectura, sin sesión) está bien: todas las páginas públicas cargan en < 1 s en PC, todos los recursos
responden 200 y GitHub Pages los sirve con `max-age=600`.

## What Changes

- **Secundaria (`ingles/secundaria.js`, `ingles/app.js`):** tocar una pestaña agrega una entrada al historial
  (`pushState`); «Atrás» regresa a la pestaña anterior (`hashchange` → `irPestanaSec(…, 'nada')`). Las flechas del
  teclado siguen reemplazando la entrada (no llenan el historial). Sin hash = Inicio. «⚔️ Continuar misión», «Ver la
  retroalimentación» y «Ver misión» también agregan su entrada. El selector de alumna del profe navega
  (`location.assign`) para que cada entrada conserve su `?alumna=`.
- **Entregas (`ingles/rpg-ingles.js`, `ingles/tablero.js`, `ingles/app.js`):** `pintarEntregasPendientes()` pinta la
  bandeja si llegó cuando la sección aún mostraba el esqueleto (no toca una evaluación a medias).
- **Objetivos de 44 px:** `.home-link` y `a.link` de Inglés, botón del alumno en el mapa de calor, `.check` y `.btn.sm`
  de Juegos, y `.btn.sm` en cualquier pantalla táctil (`pointer: coarse`).
- **Nada tapado:** `html { scroll-padding-bottom: 96px }` en Inglés y Secundaria: al enfocar o desplazarse a un
  elemento, no queda bajo la barra inferior ni bajo la barra fija del examen.
- **Diseño ancho (solo CSS):**
  - Inglés, alumnos y alumnas, ≥ 1100 px: contenedor de 1100 px con el menú a un lado (como el panel del profe).
  - Secundaria ≥ 1100 px: contenedor de 1100 px; las 7 pestañas en una fila.
  - Juegos ≥ 1200 px: el hub (categorías, juegos, partidas y ranking) en 1080 px, categorías en 5 columnas y juegos en
    4; dentro de un juego la columna sigue en 720 px (sin tocar la lógica ni los canvas).
- **E2E nueva `navegacion-dispositivos`** (fase `ingles`): recorre 8 tareas clave en los 5 tamaños, el diseño ancho,
  el teclado en PC y 7 enlaces profundos; falla ante scroll horizontal, objetivos < 44 px en celular, errores de
  consola, elementos tapados, más toques que el tope de cada tarea, pantallas que tardan más de 8 s, atrás que saca de
  la plataforma o foco invisible.
- **Portal → Secundaria directo** (PR 2, tras el merge del PR 1): las tarjetas y «🗓️ Mi horario» del portal enlazan
  a `ingles.html?modo=secundaria` (con `?alumna=` del profe) en vez del puente `secundaria.html`, que en producción
  costaba una carga de página más (~0.6 s en celular: load 871 ms contra DCL 183 ms). `secundaria.html` sigue para
  enlaces guardados.
- Sin cambios de servidor, contrato HTTP, datos ni peticiones.

## Capabilities

### Modified Capabilities
- `plataforma`: requisito nuevo «Navegación ágil en celular, tablet y PC».

## Impact

- `ingles/secundaria.js`, `ingles/secundaria-inicio.js`, `ingles/secundaria-misiones.js`, `ingles/rpg-ingles.js`,
  `ingles/tablero.js`, `ingles/app.js`, `ingles/ingles.css`, `ingles/secundaria.css`, `estilos/stald.css`,
  `juegos/app/juegos.css`, `ingles.html` y `juegos.html` (`?v=`).
- `tests/e2e/e2e-navegacion-dispositivos.js` (nueva) y `tests/e2e/correr.sh`; `docs/pruebas.md`,
  `docs/frontend-standards.md`.
- PR 1 no toca `index.html` (otro agente lo rediseñaba); PR 2 solo cambia sus enlaces a Secundaria. No toca
  `ingles/presentacion.js`.
- Peticiones: las mismas (presupuestos de la E2E `peticiones` sin cambio).
- Matriz de acceso: sin cambios; solo estilos y navegación del cliente.

## Cómo revertir

Revertir el PR (solo estáticos y pruebas).
