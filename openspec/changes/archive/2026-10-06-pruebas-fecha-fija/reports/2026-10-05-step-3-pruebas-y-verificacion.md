# Reporte Step 3 — Pruebas y verificación de estado

- Fecha: 2026-10-05
- Cambio: pruebas-fecha-fija
- Agente: Claude Code (Opus 5.5)

## Comandos ejecutados
- `DATA_DIR=<copia> deno test -A server/actividades_test.ts` (antes y después de actualizarla)
- `deno test -A server/` · `deno lint server/` (salida completa) · `deno check server/main.ts`
- `bash tests/e2e/correr.sh --datos <copia> --puerto-api 8847 --puerto-web 8825 …`, en tres corridas:
  - fase `ingles` con login, portal y juegos;
  - repetición de `inicio-lunes` y `portal`;
  - regresión de la fase `base`.

## Resultados de pruebas
- `actividades_test.ts` con datos: el examen esperaba 1 intento y ahora tiene 2 con la 2.ª oportunidad el domingo.
  Se actualizó y pasa 6/6.
- TDD: `server/hoy_test.ts` en rojo antes de implementar; hoy 4/4.
- Unitarias: 212 pasaron, 0 fallaron, 6 omitidas. Lint y check sin problemas.
- E2E con «hoy» 2026-10-04, todas PASS:
  - actividades-datos 6/6;
  - alta-alumnos 11;
  - inicio-lunes 6;
  - segunda-oportunidad 8;
  - pronunciacion 11;
  - profe-grupo 7;
  - **ruta-profe 15/15** (antes 14/15);
  - profe-diseno 11;
  - examen-secundaria 10;
  - autoguardado 24;
  - login 54;
  - portal 16;
  - juegos 26;
  - partidas 15;
  - enlace-sala 8;
  - clasicos 10;
  - fusion 10;
  - sudoku 15;
  - basta-rondas 12;
  - loteria-sala 10;
  - poker 10;
  - cartas-espanolas 12;
  - ajedrez 12;
  - login-despues 6.
- `inicio-lunes` falló en la primera corrida. El alta usaba `new Date()` y no el «hoy» del servidor. Se actualizó
  el diseño y se agregó `ahoraIso()`; después pasó 6/6.
- `portal` falló 1 paso en la primera corrida («Inglés entra sin volver a pedir el correo») y pasó 16/16 al
  repetirla: es intermitente por tiempos.

## Verificación de estado
- Copias temporales borradas y servidores apagados.
- La copia del scratchpad no se modificó: `MemoryStore` trabaja en memoria y `correr.sh` usa una copia.
- Estado restaurado: Sí.

## Resultado
- Estado Step 3: PASS
