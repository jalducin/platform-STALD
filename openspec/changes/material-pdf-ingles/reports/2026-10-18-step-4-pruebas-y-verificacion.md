# Reporte Step 4 — Pruebas y verificación de estado

- Fecha: 2026-10-18
- Cambio: material-pdf-ingles
- Agente: Claude Code (Opus 5.5)

## Comandos ejecutados
- `npx -y deno run -A herramientas/material-ingles/generar-pdf.ts`
- Render de las 19 páginas a PNG con PyMuPDF (fuera del repo) y revisión visual, más una página en escala de grises
- `npx -y deno test -A server/material_pdf_test.ts`
- `npx -y deno test -A server/`
- `npx -y deno check server/main.ts`
- `npx -y deno lint server/`
- `npx -y deno run --allow-read server/validar_semana.ts <datos> 2026-10-19` y `… 2026-10-26`
- Servidor local: `DATA_DIR=<copia> ROWS_FIXTURE=tests/fixtures/rows-fixture.json SUPER_ADMIN_EMAIL=admin@example.com PERMITIR_HOY=1 PORT=8793 deno run -A server/main.ts` y `curl` como admin y como alumno o alumna

## Resultados de pruebas
- Dirigidas (`material_pdf_test.ts`): 2 pasaron, 0 fallaron, 0 omitidas
- Suite completa (`deno test -A server/`): 826 pasaron, 0 fallaron, 6 omitidas (ignoradas por diseño)
- `deno check server/main.ts`: sin errores
- `deno lint server/`: el Deno local (2.9.6) reporta la regla nueva `no-import-prefix` en los 101 imports `jsr:` ya
  existentes del servidor (el archivo nuevo sigue el mismo patrón); no es un error del cambio y CI decide
- Duración: ~1 min 40 s

## Verificación de datos
- `validar_semana.ts 2026-10-19`: 0 errores, 5 avisos (días fuera del patrón en la semana de descanso, aceptados)
- `validar_semana.ts 2026-10-26`: 0 errores, 3 avisos (los mismos de antes; falta `meetUrl` del 1 de noviembre)
- Servidor local (domingo 18): admin y alumno o alumna ven `guia-2026-10-23` disponible, 10 preguntas, sin
  `correcta`/`aceptadas` en lo que recibe la página, y el tip con la URL del PDF. Sábado 17 → 403; sin sesión → 401;
  id inexistente → 404

## Verificación de estado
- Antes: semana `2026-10-19` con 5 elementos; `meet-2026-10-25` y `meet-2026-11-01` sin enlace al PDF
- Después: semana con 6 elementos (se agregó solo `guia-2026-10-23`); los dos Meet con un tip más al final
- Estado restaurado: Sí — la verificación local usó una copia del repo de datos que se borró al terminar; no se
  escribió en Postgres ni en producción

## Resultado
- Estado Step 4: PASS
- Bloqueos: ninguno
