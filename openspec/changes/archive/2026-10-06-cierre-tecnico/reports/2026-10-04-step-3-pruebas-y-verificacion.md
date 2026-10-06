# Reporte Step 3 — Pruebas y verificación de estado

- Fecha: 2026-10-04
- Cambio: cierre-tecnico
- Agente: Claude Code (Opus 5.5)

## Comandos ejecutados
- `deno test -A server/`
- `deno check server/main.ts herramientas/migrar-ingles.ts`
- `deno lint server/ herramientas/`
- `openspec validate cierre-tecnico --strict`
- Script de integración (fuera del repo) con `STALD_TABLAS=stald_test_`:
  - `migrar-ingles.ts --datos <copia>` (Inglés);
  - `migrar-ingles.ts --datos <copia> --juegos --prueba`, normal, segunda corrida y `--delta`;
  - servidor local en modo Postgres de prueba (`DATA_DIR` copia, `ROWS_FIXTURE`, sesión de prueba) y E2E de Juegos
    con Playwright.

## Resultados de pruebas
- Unitarias: 202 pasaron, 0 fallaron, 6 omitidas (13 s). Incluyen `server/cierre_test.ts`:
  - `esRutaPg` con prefijos;
  - `PgStore` con y sin `juegos/`;
  - errores propagados sin respaldo;
  - `importarNotion`.
- Tipos y lint: sin errores.
- Migración `--juegos` en `stald_test_*`:
  - 121 documentos copiados;
  - verificación de 3 documentos idénticos;
  - marca `meta/migrado-juegos` escrita;
  - la segunda corrida se rechaza;
  - `--delta` es idempotente (0 nuevos).
- E2E de Juegos con Juegos en Postgres (PASS/FAIL):

| Prueba | PASS | FAIL |
|---|---|---|
| juegos | 26 | 0 |
| partidas | 15 | 0 |
| enlace-sala | 8 | 0 |
| basta-rondas | 12 | 0 |
| loteria-sala | 10 | 0 |
| poker | 10 | 0 |
| cartas-espanolas | 12 | 0 |
| ajedrez | 12 | 0 |
| ajustes-salas | 8 | 0 |
| sudoku | 15 | 0 |
| fusion | 10 | 0 |
| avatar-foto | 16 | 0 |
| puntos-tipo | 8 | 0 |

- una-sala: los estados finales coinciden. Entre jugadores hay diferencias transitorias porque la captura se toma
  mientras llegan los últimos registros de «¡Una!»: es consistencia eventual del canal en tiempo real, no un defecto
  de guardado.
- Varias pruebas viejas se ajustaron para la sesión de prueba (`stald_sesion_prueba`) y las rutas con hash
  (`#juegos`) de Inglés Pro. Los ajustes solo tocan las copias de integración; el repo no cambia.

## Verificación de estado
- Antes de los E2E, `stald_test_docs`: tenía los documentos migrados de Inglés y de Juegos.
- Después: docs 150, juegos 125, salas 37 (las salas nuevas de los E2E quedaron en Postgres).
- Salas nuevas en el directorio local: 0. Ninguna escritura de Juegos fue al almacén base.
- Estado restaurado: Sí.
  - Se vaciaron `stald_test_docs`, `stald_test_grupos` y `stald_test_inscripciones`.
  - Se borró la copia de datos y se detuvieron los servidores.
  - No se tocaron las tablas `stald_` de producción.

## Resultado
- Estado Step 3: PASS
- Bloqueos: ninguno. La producción (paso 4) va después del merge.
