## 0. Rama (OBLIGATORIO)

- [x] 0.1 Crear y usar la rama `feature/profe-grupo-y-ruta-ia` (worktree aparte, desde `origin/main`)

## 1. Servidor

- [x] 1.1 Pruebas que fallan (`server/profe_test.ts`): con ruta propia, `semana` del grupo y `semanaPropia` de la
  ruta; el domingo, `semanaSiguiente` y `semanaSiguientePropia`; sin ruta propia, sin `semanaPropia`
- [x] 1.2 `listarActividades` (`server/actividades.ts`): semanas del grupo siempre y las propias aparte

## 2. Frontend

- [x] 2.1 `ingles/comun.js`: `renderWeekCard` con prefijo de ids opcional; título genérico «Mi ruta de Inglés»
- [x] 2.2 `ingles/profe.js`: bloques «👥 Inglés con el grupo» y «🎓 Mis clases · <plan>» en Esta semana; título desde
  `plan.titulo`; etiqueta «🎓 Mis clases»; Plan del mes con campos opcionales y semana actual de la ruta propia
- [x] 2.3 `index.html`: tarjeta «Mi ruta»; subir `?v=` de los JS tocados en `ingles.html`

## 3. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [x] 3.1 `server/profe_test.ts` (fixture con semanas del grupo + semanas propias)
- [x] 3.2 `e2e-ruta-profe` y `e2e-profe-diseno`: adaptativas, con y sin ruta propia

## 4. Pruebas y verificación de estado (OBLIGATORIO)

- [x] 4.1 `deno test -A server/`, `deno check server/main.ts`, `deno lint`
- [x] 4.2 E2E fase inglés con una copia de datos con ruta propia de prueba (IA, 4 semanas) y con la copia sin ruta
  propia; nunca se escribe en tablas `stald_` ni en el repo de datos
- [x] 4.3 `npx -y @fission-ai/openspec@1.4.1 validate --strict`
- [x] 4.4 Reporte `openspec/changes/profe-grupo-y-ruta-ia/reports/2026-10-18-step-4-pruebas-y-verificacion.md`

## 5. Verificación manual — EL AGENTE EJECUTA (OBLIGATORIO)

- [x] 5.1 Servidor local con la copia con ruta propia: `/ingles/profe/actividades` (admin) trae `semana` del grupo y
  `semanaPropia`; alumna de ejemplo sin elementos `profe-`; 403 para alumna en la ruta del profe
- [ ] 5.2 Producción tras el merge, solo lectura (Deno Deploy y GitHub Pages)

## 6. Documentación (OBLIGATORIO)

- [x] 6.1 `docs/backend-standards.md` (contrato de la ruta del profe) y `docs/data-model.md` (`contenido/profe/`,
  campos opcionales de `plan.json`)
