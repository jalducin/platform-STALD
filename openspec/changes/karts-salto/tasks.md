## 0. Rama (OBLIGATORIO)

- [x] 0.1 Crear y usar la rama `feature/karts-salto` desde `origin/main` (con `karts-reversa` ya integrado).

## 1. Pruebas que fallan primero (TDD)

- [x] 1.1 `server/karts_salto_test.ts`: duración y altura, enfriamiento, no toca vueltas/idx/vel ni `aire`, no cruza
  huecos de las pistas espaciales ni el cenote, esquiva cáscara y bola y no cohete, rayo ni roca, giro suave en el
  aire, salto + giro = derrape.
- [x] 1.2 `tests/e2e/e2e-karts.js` (`KARTS_SOLO=salto`): botón «⤴ SALTO» con toques reales en Botones, Joystick y
  Sensor a 390×844 y 844×390 (sube y baja, sin encimarse, capturas y kart en el aire), enfriamiento, salto + giro =
  derrape, mando (R) y teclado (ESPACIO), esquiva una cáscara, no cruza un hueco del espacio, tutorial.
- [x] 1.3 `tests/e2e/e2e-karts-vivo.js`: la otra persona ve la altura del brinco (canal simulado).
- [x] 1.4 Correr y confirmar que fallan antes de implementar (las unitarias fallaron sin el módulo; las E2E se
  escribieron junto con la implementación y se iteraron con `KARTS_SOLO=salto`).

## 2. Implementación

- [x] 2.1 `juegos/karts-salto.js` (`window.KartsSalto`).
- [x] 2.2 `juegos/karts.html`: acción `salto`, botón «⤴ SALTO», ESPACIO y R/L, física en `pasoKart`, esquiva de
  objetos (locales y de red), dibujo (altura, sombra en el piso, aplastón), `d[10]` en vivo, tutorial, teclas,
  `estado()` de prueba; `?v=` del módulo nuevo.

## 3. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [x] 3.1 Revisar `e2e-karts.js` (mini-turbo con ESPACIO, reversa, distribución de mandos), `e2e-mando.js`,
  `e2e-karts-vivo.js` y las pruebas de Deno de Karts (`karts_vivo_test.ts`).

## 4. Ejecutar pruebas y verificar estado (OBLIGATORIO)

- [x] 4.1 E2E `karts karts-vivo mando` con datos temporales (sin escribir en tablas `stald_`).
- [x] 4.2 `npx -y deno test -A server/` y `npx -y deno lint`; `cd tests/calidad && npm run calidad` sin avisos nuevos.
- [x] 4.3 Reporte `openspec/changes/karts-salto/reports/2026-10-18-step-4-pruebas-y-verificacion.md`.

## 5. Verificación manual — EL AGENTE EJECUTA (OBLIGATORIO)

- [x] 5.1 Revisar las capturas del botón a 390×844 y 844×390 en Botones, Joystick y Sensor, y de un kart en el aire.
  Casos de error: brinco durante el enfriamiento, al terminar y en la caída no actúa.

## 6. Documentación (OBLIGATORIO)

- [x] 6.1 `docs/frontend-standards.md`: salto en Karts (acción, botón, mando, teclado, en vivo y reglas justas).
- [x] 6.2 `npx -y @fission-ai/openspec@1.4.1 validate karts-salto --strict`.

## 7. Publicación

- [ ] 7.1 Merge de `origin/main`, `?v=` arriba de main, PR, checks verdes, merge y verificación en producción. Sin
  archivar.
