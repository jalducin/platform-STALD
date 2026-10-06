## ADDED Requirements

### Requirement: Pruebas que no dependen del calendario
El servidor de pruebas SHALL aceptar `HOY_FIJO` (solo con `ROWS_FIXTURE`) para fijar el día. `correr.sh` SHALL
usar por omisión el día con el que se escribieron las E2E. En producción `HOY_FIJO` SHALL NOT tener efecto.

#### Scenario: Pasa una semana
- **WHEN** se corren las E2E días después de escribirlas
- **THEN** los resultados son los mismos, porque el servidor de pruebas usa el día fijo

### Requirement: Pruebas de integración con contenido real
`correr.sh` SHALL correr `server/actividades_test.ts` con la copia de datos, para que esas pruebas no queden
desactualizadas sin que nadie lo note.

#### Scenario: Contenido cambiado
- **WHEN** cambia el formato del contenido real y la prueba ya no coincide
- **THEN** la corrida de E2E lo marca como FAIL
