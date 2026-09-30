## 0. Rama (OBLIGATORIO)

- [x] 0.1 Crear y usar la rama `feature/segundo-intento-correccion`

## 1. Servidor

- [x] 1.1 Actualizar pruebas existentes que suponen un intento 2 distinto (`actividades_test.ts`) y escribir las nuevas que fallan (`correccion_test.ts`, datos inline): mismos ejercicios, fijas, anteriores sin respuestas correctas, fijas inalterables, 100 % → completo, examen sin cambios, vista previa admin
- [x] 1.2 `correccionDe` y `estadoItem` en `motor.ts`; GET y POST en `actividades.ts`
- [x] 1.3 Texto del aviso de banco corto en `server/semana.ts`

## 2. Frontend (`ingles.html`)

- [x] 2.1 Formulario de corrección: aviso, errores primero con "Antes respondiste", fijas plegadas y deshabilitadas, contador sobre los que se corrigen
- [x] 2.2 Botón "Corregir errores" en el resultado y en el tablero para actividades

## 3. Pruebas y verificación de estado (OBLIGATORIO)

- [x] 3.1 `deno test` (con y sin `DATA_DIR`), `deno check` y `deno lint`
- [x] 3.2 Reporte `openspec/changes/segundo-intento-correccion/reports/2026-09-30-step-3-pruebas-y-verificacion.md`

## 4. Verificación manual — EL AGENTE EJECUTA (OBLIGATORIO)

- [x] 4.1 E2E local (servidor en memoria + página local), con captura:
  - intento 1 con errores;
  - corrección con fijas deshabilitadas;
  - corrige todo → 100 % y completo.
  - Examen: 1 intento.
- [x] 4.2 Producción tras el merge, sin enviar intentos reales:
  - curl de admin con `?alumno=<quien tenga 1 intento>&intento=2` → `correccion` con sus fijas;
  - Marisol (100 % en la actividad del 1) ve `completo`.

## 5. Documentación (OBLIGATORIO)

- [x] 5.1 `docs/data-model.md` (regla de intentos), `docs/backend-standards.md` (campo `correccion`) y skill `nueva-semana-ingles` (con copia)
- [x] 5.2 Commit, push, PR y merge a `main` (PR #17)
