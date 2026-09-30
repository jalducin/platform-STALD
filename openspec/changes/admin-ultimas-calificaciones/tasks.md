## 0. Rama (OBLIGATORIO)

- [x] 0.1 Crear y usar la rama `feature/admin-ultimas-calificaciones`

## 1. Pruebas primero

- [x] 1.1 E2E que falla (`e2e-ultimas.js`):
  - admin ve la tarjeta, con un máximo de 5 chips por alumno o alumna, ordenados por fecha;
  - "—" sin calificaciones;
  - detalle en el bloque del alumno o alumna;
  - la alumna no ve la tarjeta.

## 2. Frontend (`ingles.html`)

- [x] 2.1 `ultimasCalificaciones` (en línea + Notion, ordenadas, top 5) y tarjeta resumen
- [x] 2.2 Lista "🗓️ Últimas 5 calificaciones" en el bloque de cada alumno o alumna

## 3. Pruebas y verificación de estado (OBLIGATORIO)

- [x] 3.1 E2E del cambio y regresiones de Inglés (semana, corrección, filtro, marcar, guion, presentación)
- [x] 3.2 Reporte `openspec/changes/admin-ultimas-calificaciones/reports/2026-09-30-step-3-pruebas-y-verificacion.md`

## 4. Verificación manual — EL AGENTE EJECUTA (OBLIGATORIO)

- [ ] 4.1 Tras el merge: E2E de solo lectura en Pages con el correo del admin: la tarjeta con los alumnos y alumnas reales y sin envíos

## 5. Documentación (OBLIGATORIO)

- [x] 5.1 `docs/frontend-standards.md` (vista de admin: últimas calificaciones)
- [ ] 5.2 Commit, push, PR y merge a `main`
