## Why

En la teoría de las clases, `renderTeoria()` (`ingles/comun.js`) pinta `texto` en un `<div class="r">` que junta los
saltos de línea y la sangría. El código de ejemplo (Python de Tecnología de Secundaria; Python, MCP y entrevistas en
la ruta del profe) se ve en un solo renglón y no se entiende. Los enunciados de los ejercicios ya lo respetan
(`.q .e { white-space: pre-wrap }`, cambio `examen-secundaria`), la teoría no.

Revisión del resto (repo de datos al 2026-11-02): solo `teoria[].texto` trae saltos (34 bloques); `puntos`, `tips`,
`tabla`, `ejemplos` y los diagramas no traen ninguno. Aun así, `puntos` y `tips` (lista `.teo-list`) quedan cubiertos
para que el contenido nuevo no repita el problema. Los diagramas no cambian: el validador limita sus textos a
etiquetas cortas.

## What Changes

- **Frontend (`ingles/comun.js`, `ingles/ingles.css`):** el `texto` de la teoría lleva la clase `teoria-texto` con
  `white-space: pre-wrap` (respeta saltos y sangría) y `overflow-wrap: anywhere` (una línea larga de código se parte
  en lugar de dar scroll horizontal a 360 px). Las listas `.teo-list` (puntos y tips) también usan `pre-wrap`.
  Un texto de una sola línea se ve igual que antes.
- **Diapositiva `teoria` del Meet (`ingles/presentacion.js`, `ingles/presentacion.css`):** el `texto` (`.s-lead`) y
  los `puntos` (`.s-points`) respetan los saltos igual.
- **Enlaces de apoyo de la clase de Secundaria (`.sec-enlaces .btn`, paso «Video»):** la verificación visual con la
  clase real `sec-tec-2026-11-24` mostró scroll horizontal a 360 px por los botones «📖 Documentación oficial de
  Python: …» (`.btn` trae `white-space: nowrap` de `estilos/stald.css`). Ahora el título largo se parte en renglones
  (`white-space: normal; max-width: 100%`).
- Subir `?v=` de los archivos tocados en `ingles.html`.

Vistas que usan `renderTeoria` (todas reciben el arreglo por ser el mismo componente): clases de Inglés de alumnos y
alumnas (`reproductor.js`), clases de Secundaria (`secundaria-clase.js`) y sus misiones (`secundaria-misiones.js`),
ruta propia del profe (`ingles.html?modo=profe`, mismo reproductor) y el material del Meet (`presentacion.js`).
Juegos no usa `renderTeoria`.

## Capabilities

### New Capabilities
<!-- ninguna -->

### Modified Capabilities
- `actividades-online`: el texto de la teoría respeta saltos de línea y sangría.

## Impact

- Superficies: `ingles.html` (`ingles/comun.js`, `ingles/ingles.css`, `ingles/presentacion.js`,
  `ingles/presentacion.css`); `secundaria.html` es un puente a `ingles.html` y no cambia. Sin servidor, sin
  Postgres/Realtime/Auth, sin repo de datos, sin Notion.
- Contrato HTTP y de datos: sin cambios de forma; `texto` ya viaja con sus `\n`.
- Matriz de acceso: sin cambios (es presentación del contenido que ya ve cada quien).
- Acciones externas: ninguna. GitHub Pages publica con el merge a `main`.
