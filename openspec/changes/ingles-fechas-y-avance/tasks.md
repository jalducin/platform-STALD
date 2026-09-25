## 0. Rama (OBLIGATORIO)

- [x] 0.1 Crear y usar la rama `feature/ingles-fechas-y-avance`

## 1. Fechas en Notion

- [x] 1.1 Calcular el calendario (A1 → A2 → B1, módulo, lección) desde 2026-09-26; excluir "📋 REGLA"
- [x] 1.2 Asignar `Fecha Entrega ` a las 50 actividades de cada alumno (250 filas)
- [x] 1.3 Verificar: 50 fechas distintas por alumno, calendario idéntico entre alumnos, "📋 REGLA" sin fecha

## 2. Backend

- [x] 2.1 `extractInglesRow`: agregar `calificacion`, `dificultad`, `editadoEn`; pruebas en `rows_test.ts`
- [x] 2.2 Desplegar la función desde el repo y anotar la versión

## 3. Frontend

- [x] 3.1 `ingles.html`: contadores, secciones por estado (realizadas 3 días, atrasadas, hoy, próximas, plegadas), fecha y calificación por fila, scroll interno; vista admin por alumno con el mismo esquema

## 4. Pruebas y verificación de estado (OBLIGATORIO)

- [x] 4.1 Actualizar y ejecutar `deno test` y `deno check`
- [x] 4.2 Reporte `openspec/changes/ingles-fechas-y-avance/reports/2026-09-25-step-4-pruebas-y-verificacion.md`

## 5. Verificación manual — EL AGENTE EJECUTA (OBLIGATORIO)

- [x] 5.1 curl de `/ingles/data`: campos nuevos presentes, sin correos
- [x] 5.2 E2E local (admin y alumna): secciones, contadores, scroll y fechas; captura de pantalla
- [ ] 5.3 Tras el merge a `main`, E2E contra GitHub Pages

## 6. Documentación (OBLIGATORIO)

- [x] 6.1 `docs/data-model.md` y `docs/backend-standards.md`: campos nuevos y regla del calendario
- [ ] 6.2 Commit, push, PR y merge a `main` (autorizado por el usuario)
