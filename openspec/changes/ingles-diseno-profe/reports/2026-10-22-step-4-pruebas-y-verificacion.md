# Reporte Step 4 — Pruebas y verificación de estado

- Fecha: 2026-10-22
- Cambio: ingles-diseno-profe
- Agente: Claude Code (Opus 5.5), con los subagentes `verificador-pruebas` y `revisor-solo-lectura`

## Comandos ejecutados

- `npx -y deno test -A server/` · `npx -y deno check server/main.ts` · `npx -y deno lint server/`
- `npx -y deno test -A server/gamificacion_profe_test.ts` (primero en rojo: 0/5; luego en verde)
- `bash tests/e2e/correr.sh --datos <copia temporal> --puerto-api 8951 --puerto-web 8952` (suite completa, hoy por
  omisión 2026-10-04; subagente `verificador-pruebas`)
- La misma, con `--hoy 2026-10-22` (Inglés de admin, profe y alumnos) y con `--hoy 2026-10-27` (Secundaria)
- Tras los hallazgos de la segunda revisión: `material alta-alumnos baja-ingles profe-grupo ruta-profe profe-diseno
  ingles-diseno-profe presentar` (hoy por omisión) y lo mismo más `rpg-ingles ingles-alumno-diseno` con
  `--hoy 2026-10-22`; `peticiones`
- Sin `--pg`: no se tocó ninguna tabla `stald_`. Copia temporal del repo de datos (`gh repo clone`); sin push de datos.

## Resultados de pruebas

- Unitarias: 1062 pasaron, 0 fallaron, 6 omitidas (46 s). `check` y `lint` (174 archivos) limpios. Las 59 de
  gamificación (con las 5 nuevas de la ruta del profe) pasan: Secundaria e Inglés sin cambios.
- E2E nueva `ingles-diseno-profe`: 93/93 con `--hoy 2026-10-22`; 79/79 con 2026-10-04 (sin clases de la ruta
  publicadas: revisa «Ruta al día»).
- Inglés, hoy por omisión: 6 PASS y 2 FAIL, los mismos que en `main` (línea base): `ruta-profe` 3 pasos y
  `profe-diseno` 1 paso dependen de la fecha y los datos (con 2026-10-22 pasan 21/21 y 11/11).
- Inglés con `--hoy 2026-10-22`: 8 PASS, 2 FAIL heredados: `profe-grupo` («6 elementos», supone los datos del
  2026-10-04) y `material` «alumna 390: dirección #material» (vista de alumnos; intermitente, también en `main`).
- Secundaria con `--hoy 2026-10-27`: 6/6 PASS (examen-secundaria, secundaria-clases, secundaria-clase 35/35,
  secundaria-dashboard 83/83, misiones, autoguardado).
- `peticiones`: el tope «inglés (admin)» sube a 17 (+2: OPTIONS y GET de `/profe/entregas` para «📥 Por revisar»).
  Sigue fallando por el `GET /interruptores` heredado de `main` (+1 en los 6 escenarios).
- Juegos: fallas de fps con CPU ×4 e intermitentes por carga (karts, karts-vivo, futbol, brigada); al repetir, una-sala
  y salas-grandes pasan. Ninguna toca archivos de este cambio.
- Duración: ~2 h 30 min la suite completa.

## Verificación de estado

- Antes: copia temporal recién clonada del repo de datos; Postgres no se usó.
- Después: la E2E envía en la copia temporal un intento de la misión principal del profe (para ver «+XP»).
- Estado restaurado: Sí — la copia temporal se descarta; el repo de datos real no cambió y no hubo push.

## Hallazgos de revisión atendidos

- Primera revisión: selector de la barra tras el merge (`rpg-xp-barra`), escenario «Sin grupos» con prueba, alcance
  del encabezado con un grupo elegido, reporte de pruebas.
- Segunda revisión: pestaña «🌍 Mundos» después de «📚 Material» (E2E `material`), `profe-diseno` con 6 pestañas,
  clase por pasos solo con plan, sin «+XP» en lo del grupo, «Por revisar» solo de Inglés y con el alcance del grupo y
  de los ocultos, «🔍 Ver grupo» reinicia los nicks, comentario y docs contradictorios, delta MODIFIED del requisito de
  pestañas y nota en `ingles-alumno-diseno-rpg`.

## Resultado

- Estado Step 4: PASS (sin fallas nuevas respecto a `main`)
- Bloqueos: ninguno
