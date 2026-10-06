## Por qué
Deuda técnica, sprint 3:
- Varias E2E dependen del calendario real. `ruta-profe` falla desde el lunes 2026-10-05 porque la «semana actual»
  cambió, aunque el código no cambió.
- Las 6 pruebas de `server/actividades_test.ts` contra el contenido real nunca corren: en CI no hay `DATA_DIR`.
  Una ya estaba desactualizada (el examen del 2 de octubre ahora tiene 2.ª oportunidad).

## Qué cambia
- `HOY_FIJO` (`AAAA-MM-DD`): solo en modo de prueba (`ROWS_FIXTURE`), congela el «hoy» del servidor (`mxToday()`
  sin argumento). En producción no tiene efecto.
- `tests/e2e/correr.sh` arranca el servidor con `HOY_FIJO=2026-10-04` por omisión:
  - es el día con el que se escribieron las E2E;
  - `--hoy AAAA-MM-DD` lo cambia y `--hoy real` usa el calendario.
- `correr.sh` también corre `server/actividades_test.ts` con `DATA_DIR` de la copia, como una prueba más
  (`actividades-datos`).
- Se actualiza la prueba del examen con 2.ª oportunidad.
