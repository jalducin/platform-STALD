# Reporte Step 4 — Pruebas y verificación de estado

- Fecha: 2026-10-03
- Cambio: inicio-lunes-alumnos
- Agente: Claude Code (Opus 5.5)

## Comandos ejecutados
- `deno test -A server/`, `deno check server/main.ts`, `deno lint server/`
- Servidor local con una copia de datos (`DATA_DIR`) y `ROWS_FIXTURE`
- `node e2e-inicio-lunes.js`, `e2e-alta-alumnos.js`, `DATA=… node e2e-profe-grupo.js`

## Resultados de pruebas
- Unitarias:
  - `inicio_lunes_test.ts` falló primero (no existía `lunesDeInicio`) y después pasó;
  - se actualizó `alumnos_test.ts`, porque el alta ahora devuelve `inicio`.
- Suite completa: 134 pasaron, 0 fallaron, 6 omitidas. `check` y `lint` limpios.
- E2E `e2e-inicio-lunes`: 6/6.
  - el aviso del alta dice "Empieza el lunes 5 oct";
  - la lista del admin muestra "inicia el lunes 5 oct";
  - la alumna nueva tiene 0 elementos vencidos antes del 5 oct y Marisol sigue viendo 6;
  - en su página aparece "Tu curso empieza el lunes 5 de oct" y no hay "En atraso".
- Regresiones:
  - `e2e-alta-alumnos`: 11/11. Se actualizó el chequeo de la semana actual: ahora la alumna ve su lunes de inicio.
  - `e2e-profe-grupo`: 7/7, quitando de la copia los `profe.json` reales, igual que en cambios anteriores.

## Verificación de estado
- Antes: copia temporal `data-il`, sin tocar producción.
- Después: `data-il` borrada y servidores locales apagados.
- Estado restaurado: Sí.

## Resultado
- Estado del Step 4: PASS
- Bloqueos: ninguno
