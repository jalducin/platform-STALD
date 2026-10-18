## 0. Rama (OBLIGATORIO)

- [ ] 0.1 Step 0 — `git fetch` y crear `feature/karts-3-vueltas` desde `origin/main` (OBLIGATORIO)

## 1. Pruebas primero (OBLIGATORIO)

- [ ] 1.1 Step 1 — Revisar y actualizar pruebas existentes (OBLIGATORIO): `server/karts_pistas_test.ts`,
      `karts_espacio_test.ts`, `karts_curvas_test.ts`, `karts_puntos_reglas_test.ts`, `karts_puntos_copas_test.ts` y
      las demás que fijan 2 vueltas o la versión 3
- [ ] 1.2 Nueva `server/karts_3_vueltas_test.ts` en rojo: 3 vueltas en las 16 pistas; referencia = largo × 3; límites
      recalculados; plausibilidad del servidor (`reglasCarrera`); bots; `RECORD_MAX_MS` coherente (récord de 12 min
      válido, copa nunca perdida); `migrarRecords` v3 → v4 y v2 → v4; formas aceptadas/rechazadas por el servidor;
      reversa sin contar vueltas

## 2. Implementación

- [ ] 2.1 `juegos/karts-pistas.js`: `vueltas: 3` en las 16 pistas, `VERSION_PISTAS` 4, `recordsV3` en
      `migrarRecords` (`'vueltas'`), `RECORD_MAX_MS` 20 min (`// karts-3-vueltas`)
- [ ] 2.2 `juegos/arcade.js`: `VUELTAS = 3`
- [ ] 2.3 `server/progreso.ts`: forma `pistasV` 4 + `recordsV3`, sin romper las anteriores
- [ ] 2.4 `juegos/karts.html`: `progresoNuevo` con `recordsV3`, aviso «¡Ahora son 3 vueltas!» y etiqueta «2 vueltas»
      en el selector de pistas
- [ ] 2.5 Subir `?v=` por encima de `main`

## 3. Pruebas y verificación (OBLIGATORIO)

- [ ] 3.1 Step 3 — Ejecutar pruebas y verificar estado (OBLIGATORIO): `npx -y deno test -A server/`, lint,
      `tests/calidad` (`npm run calidad`) y E2E `karts karts-puntos karts-vivo`; reporte en
      `openspec/changes/karts-3-vueltas/reports/AAAA-MM-DD-step-3-pruebas-y-verificacion.md`. Sin escribir en tablas
      `stald_` (datos en carpeta temporal).
- [ ] 3.2 Step 4 — Verificación manual (OBLIGATORIO) — EL AGENTE EJECUTA: E2E con el juego real (carrera de 3
      vueltas, HUD 1/3 → 3/3, récords «2 vueltas», copa en curso conservada) y `curl` a `/salud` y al progreso en
      producción tras el merge

## 4. Documentación (OBLIGATORIO)

- [ ] 4.1 Step 5 — Actualizar documentación técnica (OBLIGATORIO): `docs/data-model.md` (avance de Karts, versión 4)
      y referencias a «2 vueltas» en docs

## 5. Publicación

- [ ] 5.1 Merge de `origin/main` (conservar los cambios de 43a/43c), PR en español, checks en verde, merge y borrar la
      rama remota; verificar producción. Sin archivar.
