# Reporte Step 4 — Pruebas y verificación de estado

- Fecha: 2026-10-06
- Cambio: ingles-menu-registro
- Agente: Claude Code (Opus 5.5)

## Comandos ejecutados
- `deno test -A server/` (sin cambios de servidor)
- `bash tests/e2e/correr.sh --datos <copia> --puerto-api 8847 --puerto-web 8825 alta-alumnos` (en rojo)
- `bash tests/e2e/correr.sh … alta-alumnos inicio-lunes ruta-profe profe-diseno profe-grupo`
- `bash tests/e2e/correr.sh … --pg grupos ingles-pro` (Postgres de prueba `stald_test_*`; 0 filas al terminar)

## Resultados de pruebas
- TDD: `alta-alumnos` falló antes de implementar, porque no existía `#registro`.
- Unitarias: 237 pasaron, 0 fallaron, 6 omitidas.
- E2E, todas PASS:
  - alta-alumnos 13/13: 2 pasos nuevos, menú separado y alta solo en «Registro»;
  - inicio-lunes 6;
  - ruta-profe 15;
  - profe-diseno 11;
  - profe-grupo 7;
  - grupos 11;
  - ingles-pro 32.
- Ajuste esperado: `ingles-pro` contaba 9 opciones en el menú lateral del escritorio; ahora son 10, con «➕ Registro».

## Verificación de estado
- Copias temporales borradas, servidores apagados y `stald_test_*` en 0 filas.
- Estado restaurado: Sí.

## Resultado
- Estado Step 4: PASS
