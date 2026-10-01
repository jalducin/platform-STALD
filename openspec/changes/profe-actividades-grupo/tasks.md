## 0. Rama (OBLIGATORIO)

- [x] 0.1 Crear y usar la rama `feature/profe-actividades-grupo`

## 1. Servidor

- [x] 1.1 Pruebas que fallan (`server/profe_test.ts`):
  - el listado del profe incluye los elementos del grupo (sin Meet), de semanas futuras también, con la fecha del
    profe y `grupo: true`;
  - el intento se guarda en `resultados/<id>/profe.json`;
  - el admin del grupo no ve los resultados del profe;
  - el grupo no cambia.
- [x] 1.2 `itemsDelGrupo`, `paraProfe` y exclusión de `profe.json` en `server/actividades.ts`

## 2. Frontend

- [x] 2.1 `ingles.html?modo=profe`: tarjeta "📚 Lo de tu grupo" con pendientes primero

## 3. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [x] 3.1 Suite completa en verde; ajustar las pruebas del listado del profe que contaban solo sus elementos

## 4. Pruebas y verificación de estado (OBLIGATORIO)

- [x] 4.1 `deno test`, `check` y `lint`
- [x] 4.2 E2E `e2e-profe-grupo`:
  - tarjeta con las actividades atrasadas;
  - resolver una;
  - la vista de admin del grupo no muestra al profe.
  - Regresión `e2e-ruta-profe`.
- [x] 4.3 Reporte `openspec/changes/profe-actividades-grupo/reports/2026-10-01-step-4-pruebas-y-verificacion.md`

## 5. Verificación manual — EL AGENTE EJECUTA (OBLIGATORIO)

- [ ] 5.1 Producción, solo lectura:
  - la ruta lista los 5 elementos del grupo con sus fechas del profe;
  - abrir uno sin enviar;
  - la vista del grupo sin "Profe".

## 6. Documentación (OBLIGATORIO)

- [x] 6.1 `docs/backend-standards.md` (ruta del profe con elementos del grupo) y `docs/data-model.md`
  (`resultados/<id>/profe.json` excluido del grupo)
