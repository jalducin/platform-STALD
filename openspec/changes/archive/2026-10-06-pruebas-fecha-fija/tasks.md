## 0. Rama (OBLIGATORIO)

- [x] 0.1 Crear y usar la rama `feature/pruebas-fecha-fija`

## 1. Servidor (TDD)

- [x] 1.1 `server/hoy_test.ts` en rojo
- [x] 1.2 `mxToday` con `HOY_FIJO` (solo con `ROWS_FIXTURE`) y `ahoraIso()` para el alta

## 2. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [x] 2.1 `actividades_test.ts`: examen con 2.ª oportunidad (6/6 con la copia de datos)
- [x] 2.2 `correr.sh`: `HOY_FIJO` por omisión, `--hoy`, y la prueba `actividades-datos`

## 3. Pruebas y verificación de estado (OBLIGATORIO)

- [x] 3.1 Unitarias, lint y check (salida completa)
- [x] 3.2 E2E: `ruta-profe` 15/15 y regresión de las fases `ingles` y `base`
- [x] 3.3 Reporte en `openspec/changes/pruebas-fecha-fija/reports/`

## 4. Producción — EL AGENTE EJECUTA (OBLIGATORIO)

- [x] 4.1 CI en verde antes del merge; confirmar que producción no define `HOY_FIJO` (sin efecto sin `ROWS_FIXTURE`)

## 5. Documentación (OBLIGATORIO)

- [x] 5.1 `docs/pruebas.md`: fecha fija, `--hoy` y `actividades-datos`
