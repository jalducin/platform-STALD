# Reporte Step 3 — Pruebas y verificación de estado

- Fecha: 2026-09-30
- Cambio: marcar-completadas
- Agente: Claude Code (Opus 5.5)

## Comandos ejecutados
- **Permiso de Notion:** PATCH a la fila de Sofy con el mismo valor (`Completado: false`) para verificar el
  permiso de actualización. Respondió 200 sin cambio de datos.
- **Servidor:**
  - `npx -y deno test --allow-env --allow-read server/` (sin y con `DATA_DIR`)
  - `deno check` y `deno lint`
- **Servidor local con fixture:** `DATA_DIR=<copia> ROWS_FIXTURE=… SUPER_ADMIN_EMAIL=admin@example.com PORT=8787 deno run -A server/main.ts`
- **Curl de errores:** fila ajena, sin correo, cuerpo inválido y GET.
- **E2E:** `e2e-marcar.js` y regresiones (`e2e-semana`, `e2e-correccion`, `e2e-filtro`, `e2e-guion` y
  `e2e-presentacion`), cada una en un servidor nuevo.

## Resultados de pruebas
- **TDD:** `completar_test.ts` y la prueba nueva de `rows_test.ts` no compilaban antes de implementar
  (faltaban el módulo y el campo `id`). Después pasan.
- **Suites:** sin `DATA_DIR`, 49 pasaron y 6 omitidas; con `DATA_DIR`, 55 pasaron. `check` y `lint`
  limpios.
- **Curl local:**
  - fila ajena → 403 `sin_acceso`;
  - sin correo → 400 `missing_email`;
  - `completado: "si"` → 400 `json_invalido`;
  - GET → 405;
  - `/ingles/data` trae `id` en cada fila.
- **E2E de marcar:** 9/9.
  - "A1 Test #3" pasa de Atrasadas a Realizadas y sube "Hechas 3 días".
  - Aparece "↩ Desmarcar"; al desmarcar regresa a Atrasadas.
  - La actividad con 1 intento queda en Realizadas con "Corregir errores".
  - El admin marca en Angel y su bloque sigue abierto.
- **Regresiones:** semana 16/16, corrección 11/11, filtro 11/11, guion 8/8, presentación 8/8.
- **Limpieza:** se quitó un `rowAction` duplicado y muerto (del examen de Supabase), que anulaba la
  definición posterior.

## Producción (4.1 y 4.2)
- **Antes:** 8 filas de Inglés en Notion; solo la de Sofy sin completar. No existía `avance/`.
- **Curl a `https://stald.jalducin.deno.net`:**
  - Sofy sobre la fila de Marisol → 403 `sin_acceso`; Marisol sigue igual en Notion.
  - Sin correo → 400. Correo desconocido → 403.
  - Admin marca la fila de Sofy → 200, `registrado: true`; Notion `true` y Sofy la ve completada.
  - Admin desmarca → 200; Notion `false`.
- **Restauración:**
  - La fila de Sofy quedó sin completar, igual que antes; las 8 filas coinciden con el estado previo.
  - Se borró `avance/sofy.json` del repo de datos. Tenía solo las 2 entradas de la prueba, ambas
    `por: admin`.
- **E2E de solo lectura en Pages (Angel y Sofy, 0 envíos):** la actividad del 29 con 1 intento aparece en
  "Realizadas · últimos 3 días", con ⭐ 75 % y "Corregir errores". Progreso: Angel 4/8, Sofy 2/7.

## Verificación de estado
- Notion: sin cambios (la verificación de permiso reescribió el mismo valor).
- Repo de datos: solo el README (`avance/`). Las pruebas usaron copias en memoria, que se borraron, y el
  servidor local se detuvo.
- Estado restaurado: Sí.

## Resultado
- Estado Step 3: PASS
- Bloqueos: ninguno
