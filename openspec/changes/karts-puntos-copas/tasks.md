## 0. Rama (OBLIGATORIO)

- [x] 0.1 `git fetch` y crear la rama desde `origin/main` (`fix/karts-puntos-copas`)

## 1. Diagnóstico (TDD)

- [x] 1.1 E2E de diagnóstico: ganar la carrera 1 de las 4 copas en Juegos (Reinos con el piloto de prueba manejando
  una vuelta de verdad y una carrera completa a velocidad real) y la Copa Reinos en sala; revisar tabla, PUT/POST y
  recarga
- [x] 1.2 Prueba que falla: `server/karts_puntos_copas_test.ts` (cada copa de `KartsPistas.COPAS`: carrera 1 en 1.er
  lugar → 15 guardados y aceptados por el servidor; copa completa; récord de una carrera de más de 15 min; copas y
  topes derivados de las definiciones)

## 2. Arreglo

- [x] 2.1 `juegos/karts-pistas.js`: `PUNTOS_CARRERA`, `PUNTOS_COPA_MAX`, `RECORD_MIN_MS`/`RECORD_MAX_MS`,
  `copaNueva`, `anotarRecord`, `sumarCarreraCopa`
- [x] 2.2 `server/progreso.ts`: validación de Karts derivada de `KartsPistas` (sin listas fijas)
- [x] 2.3 `juegos/karts.html`: usa las reglas compartidas; aviso con motivo si no se guarda; puntos en «Continuar»
- [x] 2.4 `juegos/app/arcade.js`: motivo del error al guardar y aviso del tiempo rechazado en la copa en sala
- [x] 2.5 `?v=` de `karts-pistas.js` y `app/arcade.js` arriba de `main`

## 3. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [x] 3.1 `server/progreso_test.ts` y `server/karts_curvas_test.ts` siguen en verde con la validación derivada
- [x] 3.2 `tests/e2e/e2e-karts.js` (`probarPuntosCopas`) y `tests/e2e/e2e-karts-vivo.js` (`copaReinosEnSala`) en la
  corrida completa; tiempos máximos de `correr.sh`

## 4. Pruebas y verificación de estado (OBLIGATORIO)

- [x] 4.1 `npx -y deno test -A server/`, `deno lint` y `cd tests/calidad && npm run calidad` sin avisos nuevos
- [x] 4.2 E2E `karts karts-vivo mando espectador` (copia temporal de datos; nunca tablas `stald_`)
- [x] 4.3 Reporte `openspec/changes/karts-puntos-copas/reports/2026-10-18-step-4-pruebas-y-verificacion.md`

## 5. Verificación manual — EL AGENTE EJECUTA (OBLIGATORIO)

- [x] 5.1 Capturas de la tabla tras ganar la carrera 1 de Reinos y del menú tras recargar (390×844)
- [ ] 5.2 Tras el merge: `juegos/karts.html` y `juegos/karts-pistas.js?v=8` publicados; `GET /salud` del servidor

## 6. Documentación (OBLIGATORIO)

- [x] 6.1 `docs/data-model.md` (validación del progreso de Karts derivada de `KartsPistas`)

## 7. Archivo

- [ ] 7.1 `openspec archive karts-puntos-copas` (lo decide el coordinador; no en este PR)
