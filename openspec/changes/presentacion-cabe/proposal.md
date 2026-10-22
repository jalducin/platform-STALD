## Why

El profe reportó (2026-10-22): «mis presentaciones se cortan, no sale todo». En el modo presentación del Meet
(«🎬 Presentar la clase», `ingles/presentacion.js`) cada diapositiva es un 16:9 de alto fijo con `overflow: hidden` y
letra en `cqw` que no se adapta al contenido (`ingles/ingles.css:304` y `:315` en `main`). Las diapositivas de teoría
juntan texto, tabla, ejemplos, puntos y diagrama (`ingles/presentacion.js:122-133`) sin medir si caben, así que lo que
no cabe desaparece sin forma de verlo. Medido con los Meets reales:

- `meet-2026-10-25` diapositiva 4 (cuadro de los 3 tiempos: tabla de 7×4, 4 ejemplos y 4 puntos): 1815 px de
  contenido en un cuerpo de 464 px en 1280×720. Solo se veían 2 de las 7 filas.
- `meet-2026-10-11` diapositiva 7 (tabla de 16 verbos): 920 px de contenido en un cuerpo de 522 px.
- `meet-g1-2026-10-21` diapositivas 3, 5 y 7, y `meet-2026-10-25` diapositivas 2, 5 y 6: tablas y listas cortadas.
- En celular (360×740 vertical y 740×360 horizontal) la diapositiva medía 345×194 px y el texto bajaba a 5-8 px.

Pasaba en todos los tamaños (1280×720, 1366×768, 1920×1080, tablet y celular) porque todo escala con el ancho. El
rediseño RPG de hoy no lo causó: no tocaba el modo presentación. Además, el profe pidió que la presentación también
lleve el diseño RPG de Secundaria, Inglés y Juegos.

## What Changes

- **Todo cabe o se puede ver** (`ingles/presentacion.js`, `ajustarDiapositiva`):
  - La letra del cuerpo es adaptable (`clamp(14px, 2.25cqw, 46px)` × `--escala`) y todo lo de adentro va en `em`.
  - Si el contenido no cabe, la escala baja (búsqueda binaria) hasta un mínimo legible: 70 % y 14 px.
  - Si aun así no cabe, el cuerpo queda con scroll y el aviso «⬇️ Hay más · parte x/y». → / Espacio / clic bajan una
    parte antes de pasar a la siguiente diapositiva; ← / ↑ suben. Al final el aviso dice «✅ Parte y/y · → sigue».
  - La diapositiva se reajusta al cambiar el tamaño (pantalla completa, girar el celular), con `ResizeObserver`, y
    cuando carga el QR.
- **Tablas y diagramas se adaptan al ancho.** Las tablas tienen scroll horizontal propio y nunca se recortan. Las
  tablas de 2 columnas que se parten en dos se apilan en pantallas angostas. Los diagramas usan la paleta de la
  presentación y pasan a columna con las consultas de contenedor que ya existen.
- **Celular vertical:** la diapositiva ocupa todo el alto disponible en lugar de un 16:9 diminuto.
- **Diseño RPG** en `ingles/presentacion.css` (nuevo). Solo cambia la vista; el contenido de los Meets queda igual:
  - Portada «⚔️ Misión de la semana» con emoji, título y mundo («🌍 subtítulo»).
  - Agenda como «🗺️ Ruta de la misión», con pasos numerados y tiempos.
  - Teoría en tarjetas, con chips («EN»), puntos marcados y diagramas.
  - Práctica como «⚔️ Reto», juego como «🏟️ Arena», libreta como «📒 Tarea» y cierre «🏆 ¡Misión cumplida!».
  - Barra con botones reales de 44 px («← Anterior», «Siguiente →», ☀️/🌙, ⛶, «✕ Salir»), contador `rpg-contador`
    «x / y» y barra de progreso `rpg-xp-barra` con `role="progressbar"`.
  - Modo oscuro pensado para proyector y modo claro. Por omisión sigue el tema de la página; se cambia con ☀️/🌙 o con
    la tecla T y la elección se recuerda.
- **E2E de regresión** `tests/e2e/e2e-presentacion-cabe.js`. Recorre todas las diapositivas de 3 Meets reales con
  contenido largo y de una presentación sintética (tabla de 16×4 y diagramas de 8 pasos) en 1280×720, 1024×768 y
  360×740 (con `TAMANOS=todos`, también en 1920×1080, 1366×768 y 740×360). Falla si algún contenido queda cortado sin
  forma de verlo.

## Capabilities

### Modified Capabilities

- `ingles`: el modo presentación del Meet agrega dos requisitos: todo el contenido de cada diapositiva se ve, y el
  diseño RPG.

## Impact

- Superficies: `ingles.html` (modo presentación del admin). Archivos: `ingles/presentacion.js`,
  `ingles/presentacion.css` (nuevo), `ingles/ingles.css` (se quita el bloque viejo del modo presentación) e
  `ingles.html` (enlace y `?v=`). No cambian el servidor, el contrato HTTP ni los datos.
- Matriz de acceso: sin cambios. El modo presentación sigue siendo solo del admin y la retroalimentación grupal sigue
  sin nombres.
- Pruebas: E2E nueva `presentacion-cabe` (fase `ingles`, solo lectura, con puertos propios vía `--puerto-api` y
  `--puerto-web`). `presentar` y `teoria-diagramas` siguen en verde.
- Acciones externas: ninguna. El profe solo recarga `ingles.html` para tomar `presentacion.js?v=5` y
  `presentacion.css?v=2`.
