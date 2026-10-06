## Decisiones
- `mxToday(now?)`: sin `now` y con `ROWS_FIXTURE` + `HOY_FIJO` válido, devuelve `HOY_FIJO`. Con `now` explícito
  (racha, fechas de envío) no cambia. Así una sola función cubre todas las rutas que calculan «hoy» (actividades,
  grupos, juegos, resumen), sin tocar cada una.
- `ahoraIso()`: el momento actual en ISO; con `HOY_FIJO` en pruebas devuelve ese día a mediodía de la Ciudad de México. Lo usa el alta de alumnos y alumnas (`handleAlumnos`, `ahora`), que antes tomaba `new Date()` y calculaba el lunes de inicio con el calendario real (lo descubrió `inicio-lunes`).
- La guarda `ROWS_FIXTURE` impide que una variable olvidada en producción congele el calendario.
- `correr.sh`:
  - pasa `HOY_FIJO` al servidor; el navegador sigue con su fecha real, que las E2E no usan para decidir;
  - la prueba `actividades-datos` corre `deno test server/actividades_test.ts` con `DATA_DIR=<copia>` y se cuenta
    en el resumen PASS/FAIL como las demás.

## Pruebas
- Unitaria `server/hoy_test.ts`:
  - sin `ROWS_FIXTURE`, `HOY_FIJO` no tiene efecto;
  - con `ROWS_FIXTURE`, `mxToday()` devuelve la fecha fija y `mxToday(fecha)` la real;
  - un valor inválido se ignora.
- E2E: `ruta-profe` vuelve a 15/15 con la fecha fija, y la regresión de las fases `ingles` y `base` sigue en verde.
