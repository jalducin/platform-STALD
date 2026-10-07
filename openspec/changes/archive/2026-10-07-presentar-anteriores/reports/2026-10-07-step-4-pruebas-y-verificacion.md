# Reporte Step 4 — Pruebas y verificación de estado

- Fecha: 2026-10-07
- Cambio: presentar-anteriores
- Agente: Claude Code (Opus 5.5)
- Nota: el script que escribía este reporte, las tareas y la nota de `docs/pruebas.md` falló antes del merge (#132)
  sin que se notara, y el cambio se archivó (#133) sin ellos. Se agregan aquí después. El código publicado y las
  pruebas no cambian.

## Comandos ejecutados
- `bash tests/e2e/correr.sh --datos <copia> --puerto-api 8847 --puerto-web 8825 presentar` (en rojo)
- Fase `ingles` (12 pruebas, con login) y `--pg grupos ingles-pro`
- `deno test -A server/` · `deno lint server/`

## Resultados de pruebas
- TDD: `presentar` falló antes de implementar (no existía `#pres-semana`).
- Después, todas PASS:
  - presentar 5/5: esta semana, clases anteriores, aviso, presentar y guion de una clase anterior;
  - alta-alumnos 13;
  - inicio-lunes 6;
  - segunda-oportunidad 8;
  - pronunciacion 11;
  - profe-grupo 7;
  - ruta-profe 15;
  - profe-diseno 11;
  - examen-secundaria 10;
  - autoguardado 24;
  - login 58;
  - grupos 12;
  - ingles-pro 32.
- `actividades-datos` falló una vez por el fixture nuevo: la prueba contaba todos los elementos visibles. Ahora cuenta
  los de la semana 1 más los exámenes sueltos y pasa 6/6.
- Unitarias: 237 pasaron, 0 fallaron.
- Producción: la página publicada trae «Clases anteriores» (`#pres-anteriores`).

## Verificación de estado
- `stald_test_*` en 0 filas al terminar, copias temporales borradas y servidores apagados.
- Estado restaurado: Sí.

## Resultado
- Estado Step 4: PASS
