# Reporte Step 3 — Pruebas y verificación de estado

- Fecha: 2026-09-30
- Cambio: segundo-intento-correccion
- Agente: Claude Code (Opus 5.5)

## Comandos ejecutados
- `npx -y deno test --allow-env --allow-read server/` (sin y con `DATA_DIR=<copia del repo de datos>`)
- `npx -y deno check server/main.ts server/validar_semana.ts` y `npx -y deno lint server/`
- Servidor local en memoria: `DATA_DIR=<copia> ROWS_FIXTURE=… SUPER_ADMIN_EMAIL=admin@example.com PORT=8787 deno run -A server/main.ts`
- E2E (Playwright, página local `ingles.html?api=http://127.0.0.1:8787`): `e2e-correccion.js`, `e2e-semana.js`, `e2e-guion.js` y `e2e-presentacion.js`

## Resultados de pruebas
- **TDD:** `correccion_test.ts` (datos inline) falló 5 de 6 antes de implementar. La del examen ya pasaba
  porque no cambia. Después pasan 6 de 6.
- **Prueba existente actualizada:** `actividades_test.ts` ("intento 2 distinto" → "corrección con los
  mismos ejercicios").
  - La prueba usa ahora un alumno de prueba sin resultados, porque el repo de datos ya trae intentos
    reales (Marisol hizo la actividad del 29).
- Suite sin `DATA_DIR`: 42 pasaron, 0 fallaron, 6 omitidas. Con `DATA_DIR`: 48 pasaron, 0 fallaron.
- `check` y `lint`: sin problemas.

## Verificación manual (4.1, EL AGENTE EJECUTA)
- **E2E de la corrección:** 11/11.
  - Intento 1: 9 de 12 → 75 %.
  - Botón "Corregir errores (1 intento restante)".
  - Aviso "tus 9 respuestas correctas ya están guardadas. Corrige solo las 3 que fallaste".
  - 3 ejercicios por corregir, cada uno con "Antes respondiste".
  - 9 fijas llenas y deshabilitadas; contador en 0/3 y Enviar deshabilitado.
  - Tras corregir: 100 %, sin más intentos, y en el tablero "Ver resultado".
- **Ajuste tras revisar la captura:** en la corrección la teoría queda plegada, para que los errores salgan
  arriba.
- **Regresión de la semana:** 16/16. El script se actualizó a la nueva regla ("Corregir errores" y mismos
  ejercicios en el intento 2).
  - La fila del diagnóstico ahora se lee con `textContent`: desde el 30 queda en una sección plegada.
- **Regresión del guion:** 8/8. **Presentación:** 8/8.
  - La presentación se corrió con los resultados reales, porque la retroalimentación grupal necesita
    entregas de la semana. En una copia sin resultados, 2 verificaciones fallan por falta de datos.
- **Examen (1 intento, sin corrección):** cubierto por `correccion_test.ts` y `actividades_test.ts`. En la
  página está bloqueado hasta el viernes.

## Verificación de estado
- Antes: repo de datos real sin cambios. Las pruebas usan copias en memoria (`data-e2e`).
- Después: el repo de datos no se tocó. Se borraron las copias y se detuvo el servidor local.
- Estado restaurado: Sí.

## Resultado
- Estado Step 3: PASS
- Bloqueos: ninguno
