## 0. Rama (OBLIGATORIO)

- [x] 0.1 Crear y usar la rama `feature/sudoku-niveles`

## 1. Servidor

- [x] 1.1 Prueba que falla: `mente-sudoku` en el catálogo (`mente`, tope 2000) y partida guardada con tope
- [x] 1.2 Agregar `mente-sudoku` a `CATALOGO`

## 2. Frontend

- [x] 2.1 `juegos.html`: generador con solución única, selector de nivel, tablero, teclado, vidas, tiempo
  y puntos

## 3. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [x] 3.1 Ajustar pruebas que cuentan los juegos del catálogo (19 → 20)

## 4. Pruebas y verificación de estado (OBLIGATORIO)

- [x] 4.1 `deno test`, `check`, `lint`; E2E `e2e-sudoku` (unicidad y pistas por nivel, resolver Fácil
  sin errores y guardar, error marca y quita vida, 3 errores → 0) y regresión `e2e-juegos`
- [x] 4.2 Reporte `openspec/changes/sudoku-niveles/reports/2026-09-30-step-4-pruebas-y-verificacion.md`

## 5. Verificación manual — EL AGENTE EJECUTA (OBLIGATORIO)

- [ ] 5.1 Producción: `/juegos/yo` lista `mente-sudoku`; `POST /juegos/partida` de prueba con tope;
  **restaurar** la semana del admin en el repo de datos

## 6. Documentación (OBLIGATORIO)

- [x] 6.1 `docs/backend-standards.md` (catálogo 20 juegos) y `docs/frontend-standards.md` si aplica
