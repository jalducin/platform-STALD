# Reporte Step 4 — Pruebas y verificación de estado

- Fecha: 2026-09-30
- Cambio: avatar-foto
- Agente: Claude Code (Opus 5.5)

## Comandos ejecutados
- `npx deno test -A server/` · `npx deno lint server/` · `npx deno check server/main.ts`
- Servidor local: `DATA_DIR=<copia del repo de datos> ROWS_FIXTURE=rows-fixture.json SUPER_ADMIN_EMAIL=admin@example.com PORT=8787 deno run -A server/main.ts`; estáticos en `localhost:8765`
- `node e2e-avatar-foto.js` (nuevo) y regresiones `e2e-avatar-musica`, `e2e-partidas`, `e2e-portal`, `e2e-resultados`

## Resultados de pruebas
- Dirigidas (TDD, `server/juegos_test.ts`): 4 pruebas nuevas, primero en rojo (4 fallaron) y luego en verde.
- Suite completa del servidor: 87 pasaron, 0 fallaron, 6 omitidas (integración con red). `lint` y `check` sin errores.
- E2E `e2e-avatar-foto`: 16/16 PASS
  - selector con subir foto y casilla de permiso; vista previa JPEG 128×128 (3.7 KB);
  - sin permiso no guarda; con permiso el chip muestra la foto servida por el backend;
  - guardar sin cambios conserva la foto;
  - otro navegador la ve en ranking y sala de espera; portal la muestra en el saludo;
  - alumno no ve "📷 Fotos"; admin la ve y la quita → 404;
  - fallback al personaje con foto borrada; elegir personaje quita la foto (404).
- Regresiones: `e2e-partidas` sin fallos. `e2e-avatar-musica` (1), `e2e-portal` (2 + timeout) y
  `e2e-resultados` (2) fallan **igual en `main`** con la misma copia de datos (verificado con `git stash`):
  la copia contiene resultados reales de la semana (Sofy encabeza el ranking, el admin ya jugó) y el
  portal tiene una expectativa vieja ("Juegos (pronto)"). No son regresiones de este cambio.
- Duración: ~6 min en total.

## Verificación de estado
- Antes: copia desechable del repo de datos (`data-foto`), recreada antes de cada corrida.
- Después: fotos y perfiles de prueba solo en la copia desechable; el repo de datos real no se tocó.
- Estado restaurado: Sí — se borró la copia desechable.

## Resultado
- Estado Step 4: PASS
- Bloqueos: ninguno
