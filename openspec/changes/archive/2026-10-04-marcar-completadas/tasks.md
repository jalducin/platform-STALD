## 0. Rama (OBLIGATORIO)

- [x] 0.1 Crear y usar la rama `feature/marcar-completadas`

## 1. Servidor

- [x] 1.1 Pruebas que fallan (`server/completar_test.ts`, dependencias simuladas):
  - la alumna marca su fila (parche a Notion + avance);
  - fila ajena → 403; admin → 200;
  - 400 por correo o cuerpo inválido;
  - Notion 403 → 502 `sin_permiso_notion`;
  - desmarcar e historial;
  - `id` en `extractInglesRow` (`rows_test.ts`).
- [x] 1.2 `server/completar.ts` (`handleCompletar`), `id` en `rows.ts`, ruta en `main.ts` (parche real a Notion; en fixture, en memoria)

## 2. Frontend (`ingles.html`)

- [x] 2.1 Botones "✓ Marcar hecha" / "↩" en filas de Notion; confirmación; recarga
- [x] 2.2 Actividades con intento cuentan como hechas (alumno y admin)

## 3. Pruebas y verificación de estado (OBLIGATORIO)

- [x] 3.1 `deno test` (con y sin `DATA_DIR`), `deno check` y `deno lint`; E2E local de marcar/desmarcar y regresiones (semana, corrección, filtro, guion, presentación)
- [x] 3.2 Reporte `openspec/changes/marcar-completadas/reports/2026-09-30-step-3-pruebas-y-verificacion.md`

## 4. Verificación manual — EL AGENTE EJECUTA (OBLIGATORIO)

- [x] 4.1 Producción, tras el merge:
  - curl de alumna sobre fila ajena → 403;
  - sin correo → 400;
  - ciclo marcar y desmarcar como admin sobre una fila de prueba, verificando Notion;
  - **restaurar**: la fila queda como estaba y se quitan del repo de datos las entradas de avance de la
    prueba.
- [x] 4.2 La actividad del 29 aparece como hecha para quien envió el intento 1 (lista y conteo), sin enviar nada

## 5. Documentación (OBLIGATORIO)

- [x] 5.1 `docs/backend-standards.md` (ruta nueva), `docs/data-model.md` (`id` en filas y `avance/`), README del repo de datos
- [x] 5.2 Commit, push, PR y merge a `main` (PR #21)
