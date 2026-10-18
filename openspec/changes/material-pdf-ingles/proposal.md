## Why

El profe pidió, para que alumnos y alumnas estudien, un **PDF de estudio** de los tres tiempos (presente simple,
pasado simple y futuro con *will*), con verbos y ejemplos, más la base del verbo *to be*; y una **actividad** para
descargarlo y pasarlo a la libreta. El mismo PDF lo descarga el profe. Después pidió **más ejercicios**: al menos 50,
por sección y de menor a mayor dificultad, con las respuestas al final. Por último pidió una versión **más compacta,
de 14 páginas**, porque alumnos y alumnas la van a copiar, **incluyendo IA en los temas que deben reforzar**.

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

### Versión compacta con IA (petición posterior del profe)

- La guía pasa de 19 a **exactamente 14 páginas** (carta, con respuestas), con la misma URL y el mismo nombre de
  archivo: tablas cortas para copiar, una regla por recuadro con 2–3 ejemplos; pasado regular + irregulares en una
  página (24 irregulares en dos tablas); *will* + *going to* en una; gran cuadro (cook, go, be) y mini historia más
  cortos; sin sopa de letras. **44 ejercicios** (A *to be* y posesivos 11, B presente 10, C pasado 8, D futuro 6, E mezcla 9) con
  todos los tipos (completar, transformar, corregir, ordenar y elegir el tiempo por la palabra de tiempo).
- Recuadros **«🤖 Practica con IA»** con prompts en inglés listos para copiar en los temas más bajos de los
  resultados: diagnóstico y semana 1 (presente do/does 30 %, -s 48 %, días 65 %, *to be* 66 %, pronombres 69 %,
  orden 70 %) y semanas 2–3 (posesivos 44 %, this/that/these/those 56 %, preguntas 56 %, adjetivo antes del
  sustantivo 59 %, will negativo/pregunta 67 %). Se agrega media página de posesivos, demostrativos y orden del
  adjetivo (pág. 4) y un bloque de preguntas (pág. 8); se recorta lo que ya va bien (was/were, -ed, irregulares); y la sección «Estudiar con IA sin hacer trampa» (tú contestas primero,
  verifica con la guía, cuida tus datos, dictado para la pronunciación), alineada con las actividades de Tec e IA.
- «Para tu libreta» dice qué copiar y en qué orden (11 pasos con su página) y trae el plan de 5 días.
- Repo de datos: los textos de `guia-2026-10-23`, `act-2026-10-23` y los Meet `meet-2026-10-25` / `meet-2026-11-01`
  pasan a 14 páginas, 44 ejercicios y las páginas nuevas.

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
