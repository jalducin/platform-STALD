## Context

La plataforma es estática (GitHub Pages desde la raíz de `main`) y el contenido de Inglés vive en el repo privado de
datos. Los tips de una actividad ya admiten enlaces (`{ tipo: "lectura", texto, url }`). No existía material
descargable.

## Goals / Non-Goals

**Goals:** un PDF imprimible, bonito y legible también en blanco y negro; fuente versionada y regenerable; descarga
para alumnos, alumnas y el profe con una URL estable; una actividad que guíe el estudio y confirme con un repaso.

**Non-Goals:** un visor de PDF en la página, subir archivos desde la plataforma o generar el PDF en el servidor.

## Decisions

- **Dónde vive el PDF: en el repo público** (`ingles/material/`). Es material didáctico sin datos personales y
  Pages lo sirve como `application/pdf` sin código nuevo. Alternativa descartada: servirlo desde Deno leyendo el repo
  privado (más código y sin beneficio, porque no hay nada que proteger).
- **Fuente HTML + CSS en `herramientas/material-ingles/`**, junto al generador, igual que los otros generadores del
  repo (`herramientas/generar-futbol.ts`). Así el PDF se puede corregir y regenerar con un comando.
- **Impresión con Chrome sin interfaz** (`--print-to-pdf --no-pdf-header-footer`). El pie con «Página N de M» sale de
  las cajas de margen de `@page` (Chrome ≥ 131). El generador busca primero `chrome-headless-shell` de Playwright,
  porque en Windows `chrome.exe --headless` se quedaba colgado; se puede forzar otra ruta con `CHROME`.
- **Sin internet:** fuentes del sistema (Segoe UI / Arial, Segoe UI Emoji) e ilustración en SVG en línea. La prueba
  `server/material_pdf_test.ts` lo vigila.
- **Escala de grises:** cada tiempo tiene color, símbolo (● presente, ◄ pasado, ► futuro) y tipo de línea (continua,
  punteada, doble), para que se distinga impreso en blanco y negro.
- **Saltos de página:** tablas, cajas y cada bloque de ejercicios con `break-inside: avoid`; títulos con
  `break-after: avoid`. Se revisan las páginas renderizadas a PNG antes de publicar.
- **Práctica:** 71 ejercicios numerados de corrido, por sección y de lo fácil a lo difícil, y las respuestas juntas
  al final para que no se vean al contestar.

## Risks / Trade-offs

- El PDF (≈ 2.7 MB) es binario y se versiona en git → aceptable por su tamaño; si cambia, se regenera completo.
- Los emojis dependen de la fuente del sistema donde se genera (Windows: Segoe UI Emoji); el PDF ya los lleva
  incrustados, así que se ven igual al descargarlo.
