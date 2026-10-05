## Why

El profe pidió (2026-10-02) que el examen semanal de alumnos y alumnas tenga **dos oportunidades**: la primera
el viernes y la segunda el domingo, para que estudien el sábado (con su refuerzo).

## What Changes

- **Examen con segunda oportunidad:** campo opcional `segundaOportunidad` (AAAA-MM-DD) en un examen con
  `intentos: 2`.
  - **1.ª oportunidad**: desde `disponibleDesde` (el viernes), igual que hoy.
  - **2.ª oportunidad**: se abre en `segundaOportunidad` (el domingo) con una **selección nueva** de preguntas
    del banco, no la corrección de las mismas.
  - **Cuenta la mejor** de las dos.
  - Entre una y otra, el examen queda **en espera**: se ve el resultado y la fecha de la 2.ª oportunidad, y
    pedirlo antes responde 403 `segunda_pronto`.
  - La 2.ª oportunidad se marca fuera de tiempo si se hace después de su fecha.
- **Validador:** un examen con `segundaOportunidad` debe tener `intentos: 2` y una fecha posterior a
  `fechaLimite`. Si no, es error.
- **Ruta del profe:** los exámenes del grupo no esperan; el profe puede hacer las dos oportunidades cuando quiera.
- **Contenido:** `examen-2026-10-02` pasa a 2 intentos con segunda oportunidad el domingo 2026-10-04.
- **Skill `nueva-semana-ingles`:** los exámenes nuevos llevan 2 intentos, la segunda oportunidad el domingo y un
  banco de unos 40 ejercicios para que la segunda tenga variedad.

## Capabilities

### Modified Capabilities
- `ingles`: examen semanal con segunda oportunidad.

## Impact

- `server/motor.ts`, `server/actividades.ts`, `server/semana.ts`, `ingles.html`.
- Repo de datos: `contenido/examenes/examen-2026-10-02.json`.
- Acciones externas: redeploy, subir el contenido y verificar en producción.
