## 0. Rama (OBLIGATORIO)

- [x] 0.1 Step 0 — `git fetch` y crear `feat/karts-plazo-45` desde `origin/main` (OBLIGATORIO)

## 1. Pruebas primero (OBLIGATORIO)

- [x] 1.1 Step 1 — Revisar y actualizar pruebas existentes (OBLIGATORIO): `server/karts_copa_sala_4_test.ts`,
      `karts_puntos_copas_test.ts`, `karts_3_vueltas_test.ts`, `karts_copa_test.ts` y `karts_salida_puntos_test.ts`
      usan `KC.PLAZO_MS` en lugar de 30 s fijos; la E2E `karts-vivo` lee el plazo de la página (≤ plazo + 3 s)
- [x] 1.2 Nueva `server/karts_plazo_45_test.ts` en rojo: `PLAZO_MS` = 45 000; cierre a los 45 s exactos en las 16
      pistas; el plazo vence antes que el límite de 3 vueltas; el servidor acepta un 2.º lugar 44.99 s después

## 2. Implementación

- [x] 2.1 `juegos/karts-copa.js`: `PLAZO_MS` = 45 000 y comentarios
- [x] 2.2 Comentarios que decían 30 s: `juegos/app/arcade.js`, `juegos/karts.html`, `server/carreras.ts`,
      `server/karts_copa.ts`, `server/salas.ts`
- [x] 2.3 Subir `?v=` de `juegos/karts-copa.js` (5) y `juegos/app/arcade.js` (17) por encima de `main`

## 3. Pruebas y verificación (OBLIGATORIO)

- [x] 3.1 Step 3 — Ejecutar pruebas y verificar estado (OBLIGATORIO): `npx -y deno test -A server/`, `deno check`,
      `deno lint server/`, `tests/calidad` (`npm run calidad`) y E2E `karts-vivo karts-puntos espectador`; reporte en
      `openspec/changes/karts-plazo-45/reports/2026-10-18-step-3-pruebas-y-verificacion.md`. Sin escribir en tablas
      `stald_` (datos en carpeta temporal).
- [ ] 3.2 Step 4 — Verificación manual (OBLIGATORIO) — EL AGENTE EJECUTA: E2E con el juego real (copa en sala: cuenta
      «⏱️ N s para terminar» y cierre a los 45 s) y, tras el merge, `curl` a Pages: `juegos/karts-copa.js` con
      `PLAZO_MS = 45000` y `juegos.html` con `karts-copa.js?v=5`

## 4. Documentación (OBLIGATORIO)

- [x] 4.1 Step 5 — `docs/backend-standards.md` y `docs/frontend-standards.md`: plazo de 45 s (`KartsCopa.PLAZO_MS`)
