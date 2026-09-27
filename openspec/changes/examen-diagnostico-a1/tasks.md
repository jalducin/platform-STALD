## 0. Rama (OBLIGATORIO)

- [x] 0.1 Crear y usar la rama `feature/examen-diagnostico-a1`

## 1. Examen y motor

- [x] 1.1 `examenes/diagnostico-a1.json`: 33 preguntas en 6 secciones (A1), con `explicacion` por pregunta y `retroalimentacion` por sección
- [x] 1.2 `examenes.ts`: `publicQuestions`, `gradeExam` (estado por tema, fortalezas/en progreso/debilidades, retroalimentación, revisión de errores), `mxToday`, `slugAlumno`
- [x] 1.3 Pruebas `examenes_test.ts` (definición válida, sin respuestas, calificación, disponibilidad)

## 2. Backend

- [x] 2.1 Rutas `/ingles/examenes` (GET lista, GET preguntas, POST enviar, DELETE reinicio admin); CORS POST/DELETE
- [x] 2.2 Storage: bucket privado `examenes`, resultados `resultados/<id>/<alumno>.json`, un intento
- [x] 2.3 Desplegar la función y anotar la versión

## 3. Frontend

- [x] 3.1 Alumno: tarjeta "📝 Exámenes", resolver en la página, calificación inmediata con fortalezas/debilidades por tema, retroalimentación y revisión de errores
- [x] 3.2 Admin: última calificación y diagnóstico en el encabezado de cada alumno, detalle por sección, vista previa

## 4. Pruebas y verificación de estado (OBLIGATORIO)

- [x] 4.1 `deno test` y `deno check`
- [x] 4.2 Reporte `openspec/changes/examen-diagnostico-a1/reports/2026-09-26-step-4-pruebas-y-verificacion.md`

## 5. Verificación manual — EL AGENTE EJECUTA (OBLIGATORIO)

- [x] 5.1 curl: alumno antes de la fecha → 403; admin: vista previa sin `correcta` y POST con `guardado: false`; alumno DELETE → 403
- [x] 5.2 Escritura en Storage con un resultado de prueba del admin; borrarlo y verificar que se restauró el estado
- [x] 5.3 E2E: tarjeta, resolver (con fecha y respuesta simuladas), resultado y encabezado del admin
- [x] 5.4 Tras el merge a `main`, E2E contra GitHub Pages

## 6. Documentación (OBLIGATORIO)

- [x] 6.1 `docs/backend-standards.md` (rutas y Storage) y `docs/data-model.md` (formato de los JSON)
- [x] 6.2 Commit, push, PR y merge a `main`
