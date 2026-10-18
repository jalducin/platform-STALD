## ADDED Requirements

### Requirement: Material de estudio descargable en PDF
El proyecto SHALL publicar el material de estudio de Inglés como PDF estático en `ingles/material/<nombre>.pdf`,
servido por GitHub Pages, con su fuente versionada en `herramientas/material-ingles/<nombre>.html` y un generador
(`herramientas/material-ingles/generar-pdf.ts`) que lo regenera. La fuente SHALL NOT cargar recursos de internet ni
contener datos de alumnos o alumnas. Una actividad de la semana SHALL enlazar el PDF con un tip `lectura` cuya `url`
es la dirección absoluta de Pages, y el repo de datos SHALL subirse solo después de que Pages sirva el PDF.

#### Scenario: Descargar la guía
- **WHEN** alumno, alumna o el profe abre el tip «📄 Descarga la guía» de la actividad `guia-2026-10-23`
- **THEN** Pages responde 200 con `content-type: application/pdf` y se descarga la guía de los 3 tiempos + to be

#### Scenario: Fuente sin PDF publicado
- **WHEN** existe `herramientas/material-ingles/<nombre>.html` sin su `ingles/material/<nombre>.pdf`
- **THEN** la prueba `server/material_pdf_test.ts` falla

#### Scenario: Fuente que depende de internet
- **WHEN** la fuente HTML carga una hoja de estilos, fuente, script o imagen de otro sitio, o contiene un correo
- **THEN** la prueba `server/material_pdf_test.ts` falla

#### Scenario: Guía compacta para copiar en la libreta
- **WHEN** se imprime la guía `guia-tres-tiempos-y-to-be.pdf`
- **THEN** tiene exactamente 14 páginas tamaño carta, con 40 a 45 ejercicios por sección (to be, presente, pasado,
  futuro y mezcla) y las respuestas todas en la última página, no junto a los ejercicios
- **AND** una sección «Para tu libreta» dice qué copiar y en qué orden, con la página de cada cosa

#### Scenario: Práctica con IA en los temas a reforzar
- **WHEN** alumno o alumna estudia un tema con resultados bajos (presente simple y la -s, to be, días, orden)
- **THEN** la sección trae un recuadro «🤖 Practica con IA» con 1–2 prompts en inglés listos para copiar
- **AND** la guía explica cómo usar la IA sin hacer trampa: contestar primero, verificar con la guía, no dar datos
  personales y usar el dictado para la pronunciación
