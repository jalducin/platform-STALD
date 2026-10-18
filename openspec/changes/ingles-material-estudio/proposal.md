## Why

El profe pidió que **las guías de estudio siempre estén disponibles**. Hoy la guía en PDF
(`ingles/material/guia-tres-tiempos-y-to-be.pdf`, cambio `material-pdf-ingles`) solo se encuentra desde la actividad
`guia-2026-10-23` y desde un tip del Meet. Cuando la actividad vence o cambia la semana, alumnos y alumnas pierden el
enlace, y una actividad vencida puede no dejar abrir su contenido. El profe también la necesita a la mano.

## What Changes

- **Catálogo público de material**: `ingles/material/indice.json`, servido por GitHub Pages, con un arreglo
  `[{ id, titulo, descripcion, temas, nivel, mes, paginas, url, fecha }]`. Sin datos personales. Primera entrada: la guía
  de los tres tiempos + *to be*.
- **Sección «📚 Material de estudio»** en `ingles.html`, siempre visible y sin fechas ni candados:
  - alumnos y alumnas: pestaña «📚 Material» en la barra (junto a «📅 Semana»);
  - admin: sección «📚 Material» en el menú (en celular, dentro de «☰ Más»);
  - ruta del profe (`?modo=profe`): pestaña «📚 Material» junto a «📅 Esta semana»;
  - sin sesión: el mismo catálogo bajo la caja de entrada (el material es público).
  Cada guía muestra título, descripción, temas, nivel y páginas, con «⬇️ Descargar PDF» y «👁️ Ver».
- **Portal** (`index.html`): atajo «📚 Material de estudio de Inglés» para quien tiene Inglés y para el admin.
- **Generador**: `herramientas/material-ingles/generar-pdf.ts` acepta `--todas` e informa las páginas de cada PDF
  para copiarlas al `indice.json`.
- **Pruebas**: `server/material_indice_test.ts` (Deno: campos, URL de Pages, archivo existente, páginas reales, cada
  PDF catalogado, sin PII) y `tests/e2e/e2e-material.js` (alumna, admin, profe y sin sesión; 390×844 y escritorio;
  antes y después de la actividad).
- **Documentación**: `docs/data-model.md` (§ «Material de estudio en PDF» con el catálogo), `docs/frontend-standards.md`
  y la skill `nueva-semana-ingles` (copias en `ai-specs/skills` y `.claude/skills`).
- Las reglas de las actividades **no cambian**: la actividad sigue con sus fechas; el catálogo es otra vía al PDF.

## Capabilities

### New Capabilities
<!-- ninguna -->

### Modified Capabilities
- `ingles`: sección permanente de material de estudio, alimentada por un catálogo público.

## Impact

- Superficies: `ingles.html` (y `ingles/*.js`, `ingles/ingles.css`), `index.html` (atajo), GitHub Pages
  (`ingles/material/indice.json`). No toca el servidor Deno, Postgres, Realtime, Auth, el repo de datos ni Notion.
- Privacidad: el catálogo y los PDF son material didáctico sin datos de alumnos o alumnas. Matriz de acceso: todos
  (con o sin sesión) pueden ver el catálogo y descargar los PDF, igual que hoy cualquiera con la URL de Pages.
- Acciones externas: ninguna (Pages publica con el merge a `main`).
