## 0. Rama (OBLIGATORIO)

- [x] 0.1 `git fetch` y crear la rama `fix/karts-sensor-android` desde `origin/main`.
- [x] 0.2 Crear el cambio OpenSpec y validarlo con `openspec validate karts-sensor-android --strict`.

## 1. Investigación

- [x] 1.1 Leer el sensor de Karts (`juegos/karts.html` `activarSensor`, `iniciarCarrera`, `sensorEnSala`;
  `juegos/app/arcade.js` `permisoSensorSala`).
- [x] 1.2 Fuentes oficiales (MDN, BCD, Chrome Platform Status, blink-dev, W3C) y sondeo del Chromium 153 completo y
  del headless shell. Conclusión en `design.md`: modo individual sin bug; bug latente en sala; pruebas dependientes
  del permiso del headless.

## 2. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [x] 2.1 `tests/e2e/e2e-karts.js`: contextos táctiles con `accelerometer` y `gyroscope` concedidos.
- [x] 2.2 `probarSensorPermiso` (y `KARTS_SOLO=sensor`): nativo permitido, nativo sin conceder, `granted`, ausente,
  `denied`, rechazo y ausente sin lecturas; control usable en cada uno y una llamada con activación de usuario.
- [x] 2.3 `probarSensorEnSala`: sala sin toque con `requestPermission` que rechaza → sigue el sensor, ⚙️ ofrece
  «📱 Activar sensor» y con el toque se activa.
- [x] 2.4 Rojo antes de arreglar: con el headless shell, 7 pasos de sensor de `e2e-karts` fallaban (activar, girar,
  sin lecturas, REVERSA y SALTO con sensor); con la línea vieja de `iniciarCarrera`, los 2 pasos de sala fallaban
  (`control: 'botones'`, sin botón «Activar sensor»).

## 3. Implementación

- [x] 3.1 `juegos/karts.html` `iniciarCarrera`: activar el sensor solo fuera de sala (`!op.sala`); en sala lo hace
  `sensorEnSala`. Sin `?v=` que subir (script en línea de la página del iframe, que se carga sin versión).

## 4. Ejecutar pruebas y verificar estado (OBLIGATORIO)

- [x] 4.1 E2E `karts karts-puntos karts-vivo mando espectador` en puertos 8971/8972 con copia temporal de datos (sin
  tablas `stald_`); `npx -y deno test -A server/`.
- [x] 4.2 Reporte `openspec/changes/karts-sensor-android/reports/2026-10-22-step-4-pruebas-y-verificacion.md`.

## 5. Verificación manual — EL AGENTE EJECUTA (OBLIGATORIO)

- [x] 5.1 Sondeo con Playwright del `requestPermission` nativo (Chromium 153 completo y headless shell; con y sin
  gesto; con y sin permisos concedidos), documentado en el reporte. Producción en solo lectura.

## 6. Documentación (OBLIGATORIO)

- [x] 6.1 `docs/frontend-standards.md` (sensor con Chrome 151+ y en sala) y `docs/pruebas.md` (cómo se prueba).

## 7. Publicación

- [ ] 7.1 Revisor de solo lectura, PR en español, checks en verde, merge y verificación en producción. Sin archivar.
