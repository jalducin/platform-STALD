# Reporte Step N+1 — Pruebas y verificación de estado

- Fecha: 2026-11-07
- Cambio: profe-horario-materias (rama `fix/meets-fuera-de-pendientes`)
- Agente: Claude

## Hallazgo confirmado

`estadoItem` (`server/motor.ts`) deja un meet sin reto «disponible» para siempre, y `renderProfe` (`ingles/profe.js`)
armaba `pendientes`, `urgentes`, `futuras` y `hechosPlan` sin excluirlos; `ingles/profe-rpg.js` los tomaba como misión,
reto y clase de mundo. En el fixture, «Pendiente ahora (5)» listaba el meet del 1 nov y «Ruta del mes» decía 5/17
(15 reales + 2 meets). Corrección: `ProfeHorario.sinMeets` y `ProfeHorario.planSinMeets` (mismo `esMeet`).

## Comandos ejecutados
- `npx -y deno test -A server/profe_horario_test.ts` (rojo primero: 12 pasaron, 1 falló; luego 13 pasaron)
- `bash tests/e2e/correr.sh --datos <copia del repo de datos> --puerto-api 9471 --puerto-web 9472 profe-horario`
  (rojo primero: 308 PASS, 12 FAIL en los 2 pasos nuevos × 6 tamaños; luego 320 PASS, 0 FAIL)
- `bash tests/e2e/correr.sh --datos <copia> --puerto-api 9471 --puerto-web 9472 ruta-profe profe-diseno ingles-diseno-profe profe-horario navegacion-dispositivos`
- `npx -y deno test -A server/`
- `npx -y @fission-ai/openspec@1.4.1 validate profe-horario-materias --strict`

## Resultados de pruebas
- Dirigidas: unitaria 13 pasaron, 0 fallaron; E2E `profe-horario` 320 PASS, 0 FAIL.
- E2E de regresión: `ruta-profe` 22, `profe-diseno` 11, `ingles-diseno-profe` 95, `navegacion-dispositivos` 311: todas PASS.
- Suite completa: 1128 pasaron, 0 fallaron, 6 omitidas (2m17s).

## Verificación de estado
- Antes y después: la E2E responde el GET con el fixture en el navegador y trabaja sobre una copia temporal de los
  datos; no escribe nada.
- Estado restaurado: Sí — no hubo datos que restaurar (la copia clonada está fuera del repo).

## Resultado
- Estado Step N+1: PASS
- Bloqueos: ninguno
