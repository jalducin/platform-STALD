## 0. Rama (OBLIGATORIO)

- [x] 0.1 Crear y usar la rama `feature/alta-alumnos`

## 1. Servidor

- [x] 1.1 Pruebas que fallan (`server/alumnos_test.ts`): fusión con Notion sin mutar, alta, lista,
  validaciones y duplicados, solo admin, quitar solo registrados
- [x] 1.2 `server/alumnos.ts` y rutas en `server/main.ts`; `source` en `server/rows.ts`

## 2. Frontend

- [x] 2.1 `ingles.html`: tarjeta "👥 Alumnos y alumnas" (alta, lista, quitar) y bloque para quien no
  tiene tareas en Notion

## 3. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [x] 3.1 Revisadas: ninguna prueba existente depende del tipo de fila; suite completa en verde

## 4. Pruebas y verificación de estado (OBLIGATORIO)

- [x] 4.1 `deno test`, `check`, `lint`; E2E `e2e-alta-alumnos` (alta, acceso a Inglés/portal/Juegos,
  duplicado, quitar) y regresiones de Inglés
- [x] 4.2 Reporte `openspec/changes/alta-alumnos/reports/2026-09-30-step-4-pruebas-y-verificacion.md`

## 5. Verificación manual — EL AGENTE EJECUTA (OBLIGATORIO)

- [ ] 5.1 Producción: alta de un correo de prueba, acceso con `/perfil` e `/ingles/data`, duplicado 409,
  quitar; **restaurar** `alumnos.json`

## 6. Documentación (OBLIGATORIO)

- [x] 6.1 `docs/backend-standards.md`, `docs/data-model.md`, README del repo de datos (la skill
  `nueva-semana-ingles` no menciona altas: sin cambio)
