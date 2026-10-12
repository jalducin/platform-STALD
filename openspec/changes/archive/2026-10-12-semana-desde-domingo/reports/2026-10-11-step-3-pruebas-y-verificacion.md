# Reporte Step 3 — Pruebas y verificación de estado

- Fecha: 2026-10-11
- Cambio: semana-desde-domingo
- Agente: Claude Code (Opus 5.5)

## Comandos ejecutados
- `npx -y deno test -A server/`: en rojo antes de implementar y en verde después
- `npx -y deno lint server/`
- `bash tests/e2e/correr.sh --datos <copia de datos>` con las 12 E2E de Inglés y `login`

## Resultados de pruebas
- Servidor: 313 pasaron, 0 fallaron. `semana_domingo_test.ts` cubre:
  - `abreYa`;
  - que el domingo se ve la semana siguiente aparte;
  - que lo del lunes se puede abrir y el examen sigue cerrado;
  - que el sábado todavía no se ve.
- E2E: 12/12 en Inglés y `login` 66/66.
- Una primera corrida falló en 4 pruebas porque el «hoy» de las E2E es el domingo 2026-10-04:
  - Si «Esta semana» cambiaba a la nueva, se escondía la 2.ª oportunidad del examen del domingo. Se corrigió el
    diseño: la semana siguiente va aparte en `semanaSiguiente`.
  - `profe-grupo` ahora cuenta aparte la semana siguiente.

## Verificación de estado
- Sin datos modificados. Estado restaurado: Sí.

## Resultado
- Estado Step 3: PASS
- Bloqueos: ninguno
