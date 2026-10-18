## Why

El profe pidió, para que alumnos y alumnas estudien, un **PDF de estudio** de los tres tiempos (presente simple,
pasado simple y futuro con *will*), con verbos y ejemplos, más la base del verbo *to be*; y una **actividad** para
descargarlo y pasarlo a la libreta. El mismo PDF lo descarga el profe. Después pidió **más ejercicios**: al menos 50,
por sección y de menor a mayor dificultad, con las respuestas al final.

## What Changes

- Nuevo material estático: `ingles/material/guia-tres-tiempos-y-to-be.pdf` (tamaño carta, 19 páginas), que GitHub
  Pages sirve en `https://jalducin.github.io/platform-STALD/ingles/material/guia-tres-tiempos-y-to-be.pdf`.
  - Contenido: portada con índice; línea del tiempo y «las 3 llaves» (do/does, did, will); *to be* completo
    (am/is/are, contracciones, negativo, preguntas y respuestas cortas, usos, there is/are, was/were, will be, errores
    comunes); presente simple (regla de la -s); pasado simple (-ed con ortografía y pronunciación, 25 irregulares);
    futuro con *will* (+ going to); gran cuadro comparativo; mini historia en 3 tiempos ligada a la receta;
    **71 ejercicios** (A *to be* 15, B presente 13, C pasado 17, D futuro 9, E mezcla 17) con renglones para
    contestar, sopa de letras de irregulares, «Escribe sobre ti», lista para la libreta con autoevaluación,
    recursos oficiales de Cambridge verificados y **respuestas al final**.
- Fuente versionada: `herramientas/material-ingles/guia-tres-tiempos-y-to-be.html` (HTML + CSS sin recursos de
  internet) y el generador `herramientas/material-ingles/generar-pdf.ts` (Chrome sin interfaz → PDF).
- Prueba nueva `server/material_pdf_test.ts`: cada fuente tiene su PDF publicado y la fuente no carga nada de internet.
- Repo de datos: actividad `guia-2026-10-23` («📘 Guía de estudio: los 3 tiempos + to be») en la semana `2026-10-19`
  para todos los grupos, con el enlace al PDF como tip `lectura` y un repaso corto (2 intentos, 10 preguntas, banco
  de 20); el enlace también va como tip del profe en `meet-2026-10-25` y `meet-2026-11-01`.

## Capabilities

### New Capabilities
<!-- ninguna -->

### Modified Capabilities
- `carga-semanal`: material de estudio descargable en PDF, versionado con su fuente y enlazado desde la semana.

## Impact

- Superficies: GitHub Pages (archivo estático nuevo en `ingles/material/`), repo de datos (semana `2026-10-19` y dos
  Meet). No toca `index.html`, `ingles.html`, `juegos.html`, `secundaria.html`, el servidor Deno, Postgres ni Notion.
- Privacidad: el PDF es material didáctico sin datos de alumnos o alumnas (nombres de ejemplo inventados). Las
  respuestas del repaso siguen en el repo privado; las del PDF son de la práctica de estudio, no de una evaluación.
- Acciones externas: ninguna (Pages publica con el merge a `main`; el agente sube el repo de datos después de
  confirmar que Pages sirve el PDF).
