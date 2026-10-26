## 0. Rama (OBLIGATORIO)

- [x] 0.1 Step 0: rama `feature/revision-profe` desde `main`

## 1. Reglas compartidas (TDD)

- [ ] 1.1 Pruebas que fallan de la fórmula y el resumen (`server/revision_test.ts`, parte de `comun/revision-datos.js`)
- [ ] 1.2 `comun/revision-datos.js`: `FORMULA_FINAL`, `finalDe`, `resumenSemana`, `misionesDeSemana`

## 2. Servidor (TDD)

- [ ] 2.1 Pruebas que fallan del servidor (`server/revision_test.ts`): semana, estados, qué pide cada clase, guardar y
  leer, validaciones, 404, matriz 403, revisión vacía, campo `revision` de la alumna, prefijo en Postgres
- [ ] 2.2 `server/revision.ts`: `GET` y `PUT /profe/revision`; `revisiones/` en `PREFIJOS_INGLES` (`server/db.ts`);
  `todosLosElementos` en `server/actividades.ts`
- [ ] 2.3 `revision` en la lista de la alumna (`server/actividades.ts`) y la ruta en `server/main.ts`

## 3. Página

- [ ] 3.1 `ingles/secundaria-revision.js` y estilos: pestaña «📋 Revisión» perezosa, semanas, tarjetas por día, resumen,
  guardar, misiones con enlace a «📥 Entregas»; `ingles/secundaria.js` (pestaña y carga perezosa)
- [ ] 3.2 La alumna: «✅ Revisado por el profe» en su fila y en la clase (`ingles/secundaria.js`,
  `ingles/secundaria-clase.js`); `?v=` en `ingles.html`

## 4. Verificación (OBLIGATORIO)

- [ ] 4.1 Revisar y actualizar pruebas existentes (OBLIGATORIO): E2E nueva `revision-profe` registrada en
  `tests/e2e/correr.sh` (fase `ingles`); revisar `secundaria-*`, `misiones`, `autoguardado-todo`, `peticiones`,
  `navegacion-dispositivos` e `ingles-admin`
- [ ] 4.2 Ejecutar pruebas y verificar estado (OBLIGATORIO): suite Deno y E2E (`revision-profe`, `secundaria-*`,
  `misiones`, `autoguardado-todo`, `peticiones`, `navegacion-dispositivos`, `ingles-admin`) con puertos 9081/9082, copia
  temporal de datos y, para Postgres, el PostgREST falso (`tests/e2e/lib/postgrest-falso.ts`, solo `stald_test_*`);
  reporte `openspec/changes/revision-profe/reports/2026-10-25-step-4.2-pruebas-y-verificacion.md`
- [ ] 4.3 Verificación manual — EL AGENTE EJECUTA (OBLIGATORIO): con Playwright y `curl`, marcar checklist, calificar,
  comentar, recargar, ver la calificación como alumna, 403 para no admin y 400/404 de casos inválidos; restaurar estado
  (borrar las revisiones de prueba)
- [ ] 4.4 Actualizar documentación técnica (OBLIGATORIO): `docs/backend-standards.md`, `docs/data-model.md`,
  `docs/frontend-standards.md`, `docs/pruebas.md` y `privacidad.html`
- [ ] 4.5 `openspec validate revision-profe --strict`, `verificador-pruebas` y `revisor-solo-lectura`
- [ ] 4.6 Verificación en producción tras el merge — EL AGENTE EJECUTA (OBLIGATORIO), solo lectura: `/salud`,
  `/profe/revision` sin sesión responde 401 y los `?v=` nuevos se sirven

## 5. Cierre

- [ ] 5.1 `openspec archive revision-profe` cuando el profe lo pruebe en su celular (consolida el delta en `openspec/specs/`)
