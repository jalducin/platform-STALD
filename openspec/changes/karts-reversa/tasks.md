## 0. Rama (OBLIGATORIO)

- [x] 0.1 Crear y usar la rama `feature/karts-reversa` desde `origin/main`.

## 1. Pruebas que fallan primero (TDD)

- [ ] 1.1 `server/karts_reversa_test.ts`: velocidad de reversa (frena, retrocede a ≈ 38 %, aceleración suave),
  «freno parado», volante invertido y cruce de meta (adelante, atrás, ida y vuelta repetida, inicio, saltos).
- [ ] 1.2 `tests/e2e/e2e-karts.js`: botón «⏪ REVERSA» con toques reales (Botones, Joystick y Sensor), mando (B parado),
  teclado (↓ parado y R), reversa sobre la meta sin contar vuelta, y capturas a 390×844 y 844×390.
- [ ] 1.3 Correr y confirmar que fallan antes de implementar.

## 2. Implementación

- [ ] 2.1 `juegos/karts-reversa.js` (`window.KartsReversa`): `pasoVel`, `quiereReversa`, `cruzarMeta`, `factorGiro`.
- [ ] 2.2 `juegos/karts.html`: acción `reversa` (tecla R, botón ⏪), `leerEntrada(vel)`, física en `pasoKart`,
  cruce de meta con `cruzarMeta`, etiqueta de B, tutorial, `reversa` en `estado()` de prueba; `?v=` subido.

## 3. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [ ] 3.1 Revisar que las verificaciones de `e2e-karts.js`, `e2e-mando.js` y las pruebas de Deno de Karts sigan
  válidas (el teclado ↓ con el carro en marcha sigue frenando).

## 4. Ejecutar pruebas y verificar estado (OBLIGATORIO)

- [ ] 4.1 E2E `karts mando` con datos temporales (sin escribir en tablas `stald_`; la copia se descarta).
- [ ] 4.2 `npx -y deno test -A server/` y `npx -y deno lint`; `cd tests/calidad && npm run calidad` sin avisos nuevos.
- [ ] 4.3 Reporte `openspec/changes/karts-reversa/reports/2026-10-17-step-4-pruebas-y-verificacion.md`.

## 5. Verificación manual — EL AGENTE EJECUTA (OBLIGATORIO)

- [ ] 5.1 Revisar las capturas del botón a 390×844 y 844×390 en Botones, Joystick y Sensor (sin encimarse con FRENO,
  DERRAPE, 🎁, el minimapa ni el HUD). Casos de error: reversa con el motor ahogado o al terminar no mueve el carro.

## 6. Documentación (OBLIGATORIO)

- [ ] 6.1 `docs/frontend-standards.md`: reversa en Karts (acción, botón, mando, teclado y vueltas).
- [ ] 6.2 `npx -y @fission-ai/openspec@1.4.1 validate karts-reversa --strict`.

## 7. Publicación

- [ ] 7.1 Merge de `origin/main`, `?v=` arriba de main, PR, checks verdes, merge y verificación en producción. Sin
  archivar.
