## 0. Rama (OBLIGATORIO)

- [x] 0.1 Crear y usar la rama `feature/prorroga-por-alumno`

## 1. Servidor

- [x] 1.1 Pruebas que fallan (`server/prorroga_test.ts`, datos inline): lista y detalle con prórroga, `fueraDeTiempo`, los demás sin cambio, validación
- [x] 1.2 `paraAlumno` y validación de `prorrogas` en `motor.ts`; aplicarlo en `handleActividades`
- [x] 1.3 (post-apply) Título de fila desde la propiedad de tipo `title` sin importar su nombre (`server/rows.ts` y su prueba); hallado al verificar la fila de Sofy

## 2. Alta de Sofy

- [x] 2.1 Fila en Notion "📖 Clases Inglés" (Nombre Sofy, Usuario, A1 Test #1, entrega 2026-09-29)
- [x] 2.2 `diagnostico-a1.json`: `prorrogas.sofy = "2026-09-29"` en el repo de datos

## 3. Pruebas y verificación de estado (OBLIGATORIO)

- [x] 3.1 `deno test` (con y sin `DATA_DIR`), `deno check` y `deno lint`
- [x] 3.2 Reporte `openspec/changes/prorroga-por-alumno/reports/2026-09-28-step-3-pruebas-y-verificacion.md`

## 4. Verificación manual — EL AGENTE EJECUTA (OBLIGATORIO)

- [x] 4.1 Producción, tras el merge:
  - curl de la lista con el correo de Sofy: diagnóstico con 2026-09-29, disponible y sin intentos;
  - otra alumna ve 2026-09-27;
  - `/ingles/data` de Sofy trae solo su fila.
  - No se envían intentos reales.
- [x] 4.2 E2E de solo lectura con el correo de Sofy: entra, ve la semana y el diagnóstico con fecha de mañana

## 5. Documentación (OBLIGATORIO)

- [x] 5.1 `docs/data-model.md` (`prorrogas`) y `docs/backend-standards.md`
- [x] 5.2 Commit, push, PR y merge a `main` (PR #14)
- [x] 5.3 Commit, PR y merge de la corrección 1.3 (PR #15)
