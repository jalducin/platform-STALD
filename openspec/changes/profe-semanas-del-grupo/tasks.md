## 0. Rama (OBLIGATORIO)

- [x] 0.1 Crear y usar la rama `feature/profe-semanas-del-grupo` (worktree aparte, desde `origin/main`)

## 1. Datos (repo privado)

- [x] 1.1 Revisar la ruta: 23 tareas C1 (5 semanas), 0 intentos del profe; sus resultados están en 5 elementos del grupo
- [x] 1.2 Eliminar `contenido/profe/` y `herramientas/profe-mes-1/`; README del repo de datos; conservar `resultados/<id>/profe.json`

## 2. Servidor

- [x] 2.1 Pruebas que fallan (`server/profe_test.ts`): sin ruta propia, `semana`/`semanaSiguiente` del grupo, `plan: null`
  y solo lo del grupo; con ruta propia, conserva su semana
- [x] 2.2 Respaldo a las semanas del grupo en `listarActividades` (`server/actividades.ts`)

## 3. Frontend

- [x] 3.1 `ingles/comun.js` e `index.html`: «Mi ruta de Inglés», sin C1
- [x] 3.2 `ingles/profe.js`: sin `plan`, sin pestaña Plan del mes ni barra «Ruta del mes»; pestaña guardada inválida → Esta semana

## 4. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [x] 4.1 `e2e-ruta-profe` (vista sin ruta propia), `e2e-profe-diseno` (3 pestañas), `e2e-pronunciacion` (OMIT sin datos)
  y estado OMIT en `tests/e2e/correr.sh`

## 5. Pruebas y verificación de estado (OBLIGATORIO)

- [x] 5.1 `deno test -A server/`, `deno check server/main.ts`, `deno lint server/`
- [x] 5.2 E2E fase inglés con la copia de datos sin ruta C1: `ruta-profe`, `profe-diseno`, `profe-grupo`, `pronunciacion`
- [x] 5.3 Reporte `openspec/changes/profe-semanas-del-grupo/reports/2026-10-17-step-5-pruebas-y-verificacion.md`

## 6. Verificación manual — EL AGENTE EJECUTA (OBLIGATORIO)

- [x] 6.1 Servidor local con la copia de datos: `/ingles/profe/actividades` (admin) con semana del grupo y `plan: null`;
  `/ingles/actividades` de una alumna de ejemplo sin cambios; 403 para alumna en la ruta del profe
- [ ] 6.2 Producción tras el merge, solo lectura: la ruta del profe trae la semana del grupo

## 7. Documentación (OBLIGATORIO)

- [x] 7.1 `docs/data-model.md`, `docs/backend-standards.md`, `docs/frontend-standards.md` y la skill
  `nueva-semana-ingles` (sección «Ruta del profe»)
