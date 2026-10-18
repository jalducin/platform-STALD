# Reporte Step 4 — Pruebas y verificación de estado

- Fecha: 2026-10-18
- Cambio: ingles-material-estudio
- Agente: Claude Code (Opus 5.5)

## Comandos ejecutados
- `openspec validate ingles-material-estudio --strict` → válido
- `npx -y deno test -A server/material_indice_test.ts` → primero **falla** (sin `indice.json`, TDD) y luego 5/5
- `npx -y deno test -A server/` · `npx -y deno lint server/` · `npx -y deno check server/main.ts`
- `npx -y deno run -A herramientas/material-ingles/generar-pdf.ts --todas` → «19 páginas («paginas»: 19 en
  indice.json)»; el PDF regenerado se descartó (`git checkout`) para no cambiar el publicado
- `CHROME=… bash tests/e2e/correr.sh --datos <copia> --puerto-api 10271 --puerto-web 10281 material actividades-datos profe-grupo ruta-profe portal login`
- `… --hoy 2026-11-05 material` (después de que vence `guia-2026-10-23`, entrega 2026-10-24)
- `cd tests/calidad && npm run calidad`

## Resultados de pruebas
- Deno: 853 pasaron, 0 fallaron, 6 omitidas (incluye `material_indice_test.ts`, 5 pruebas). Lint: 139 archivos sin
  avisos. Check: OK.
- E2E (hoy 2026-10-04, antes de que abra la guía): actividades-datos 6, **material 56**, profe-grupo 7, ruta-profe 11,
  login 66, portal 16 pasos PASS; 0 FAIL.
- E2E `material` con `--hoy 2026-11-05` (actividad ya vencida): 56 PASS, 0 FAIL.
- `e2e-ingles-pro.js` (conteos de pestañas: alumno 6, admin escritorio 11) solo corre con `--pg`; no se corrió para
  no tocar Postgres.
- Calidad: 317 avisos antes y 317 después (0 nuevos; el único aviso nuevo, S2681 en `ingles/material.js`, se corrigió).

## Qué cubre `e2e-material.js`
- Alumna 390×844 y escritorio, admin 390 («☰ Más») y escritorio, profe en `?modo=profe` 390 y escritorio, sin sesión
  390, Secundaria sin sesión (no muestra el material), atajo del portal (alumna y admin).
- Cada vista: título, descripción, temas, «🗓️ Mes 1», páginas, «⬇️ Descargar PDF» (`download`) y «👁️ Ver»
  (`_blank`), sin candado ni fecha límite, botones ≥ 44 px, sin desplazamiento horizontal; la descarga responde 200,
  `application/pdf` y empieza con `%PDF-`.

## Capturas revisadas (tests/e2e/salida/, ignorada por git)
- `material-alumna-390.png`, `material-alumna-escritorio.png`, `material-admin-390.png`,
  `material-admin-escritorio.png`, `material-profe-390.png`, `material-profe-escritorio.png`,
  `material-sin-sesion-390.png`, `material-portal-alumna-390.png`: nada cortado; la barra de 6 pestañas de la alumna
  cabe completa a 390 px.

## Verificación de estado
- Antes: copia del repo de datos en una carpeta temporal de `correr.sh`; sin Postgres.
- Después: `correr.sh` borra su copia al terminar. No se escribió en tablas `stald_` ni `stald_test_`.
- Estado restaurado: Sí — el PDF regenerado por la prueba del generador se restauró con `git checkout`.

## Resultado
- Estado Step 4: PASS
- Bloqueos: ninguno. Nota: otro cambio rehace la guía a 14 páginas; esa PR debe actualizar `paginas` en
  `indice.json` (la prueba Deno lo exige).
