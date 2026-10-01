# Reporte Step 4 — Pruebas y verificación de estado

- Fecha: 2026-09-30
- Cambio: alta-alumnos
- Agente: Claude Code (Opus 5.5)

## Comandos ejecutados
- `npx deno test -A server/` · `npx deno lint server/` · `npx deno check server/main.ts`
- Servidor local con copia desechable del repo de datos y `ROWS_FIXTURE`; estáticos en `localhost:8765`
- `node e2e-alta-alumnos.js` (nuevo) y regresiones `e2e-marcar`, `e2e-ultimas`, `e2e-filtro`, `e2e-resultados`

## Resultados de pruebas
- Dirigidas (TDD, `server/alumnos_test.ts`): 4 pruebas, primero en rojo (sin módulo) y luego en verde.
- Suite del servidor: 95 pasaron, 0 fallaron, 6 omitidas. `lint` y `check` sin errores.
- E2E `e2e-alta-alumnos`: 11/11 PASS
  - tarjeta "👥 Alumnos y alumnas" con los de Notion; alta "Luz María" con aviso; la lista crece y marca
    "alta en la página"; el admin ve su bloque sin tareas en Notion; correo repetido con mensaje claro;
  - la nueva alumna entra a Inglés y ve las actividades de la semana; el portal la saluda con su nombre y
    le da Inglés y Juegos; en Juegos entra como alumna (sin INVITADO);
  - una alumna no puede listar (403); quitar regresa el conteo y el correo deja de tener filas.
- Regresiones: `e2e-marcar` (1), `e2e-ultimas` (1), `e2e-filtro` (1) y `e2e-resultados` (1) fallan
  **igual en `main`** con la misma copia de datos (verificado con `git stash`): dependen de la fecha y
  de los datos reales de la copia. No son regresiones de este cambio.

## Verificación de estado
- Antes: copia desechable del repo de datos (`data-al`).
- Después: `alumnos.json` de prueba solo en la copia; el repo de datos real no se tocó.
- Estado restaurado: Sí — se borró la copia desechable.

## Resultado
- Estado Step 4: PASS
- Bloqueos: ninguno

## Step 5 — Verificación manual en producción (EL AGENTE EJECUTA)
- Script Python contra `https://stald.jalducin.deno.net`: 9/9 PASS.
  - admin lista los 6 de Notion; sin admin → 403;
  - alta de `prueba.alta.stald@example.com` ("Prueba Alta"): `/perfil` con Inglés y Juegos y su nombre,
    `/ingles/data` con su fila de identidad, `/ingles/actividades` con 6 elementos;
  - duplicado → 409 `correo_en_uso`; quitar → sin filas.
- Estado restaurado: Sí. `alumnos.json` no existía antes de la prueba; se borró del repo de datos.
