# Reporte Step 4 — Pruebas y verificación de estado

- Fecha: 2026-10-22
- Cambio: karts-sensor-android
- Agente: Claude Code (Opus 5.5)

## Entorno

- Playwright 1.60 (`tests/e2e/node_modules`) con `CHROME` = `chromium_headless_shell-1243` (Chromium 153.0.8010.12).
- `bash tests/e2e/correr.sh --datos <copia del repo de datos> --puerto-api 8971 --puerto-web 8972 …`: el script
  copia los datos a una carpeta temporal y la borra al terminar. Sin `--pg`: no se toca ninguna tabla `stald_`.
- La máquina tenía otras sesiones corriendo E2E en paralelo (≈ 90–100 procesos de Chromium y 8 de Deno): las
  pruebas de fps y de sincronía en vivo fallan por carga, en la rama y en `main` por igual.

## Sondeo del `requestPermission` nativo (verificación manual)

Script de Playwright (fuera del repo) sobre `http://127.0.0.1:8972/juegos/karts.html?prueba=1`, contexto táctil:

| Navegador | Sensores concedidos | `permissions.query('accelerometer')` | sin gesto | con toque |
|---|---|---|---|---|
| headless shell 153 | no | `prompt` | `prompt` | `prompt` |
| headless shell 153 | sí (`grantPermissions`) | `granted` | `granted` | `granted` |
| Chromium 153 completo (`chrome.exe`) | no | `granted` | `granted` | `granted` |
| Chromium 153 completo | sí | `granted` | `granted` | `granted` |

`typeof DeviceOrientationEvent.requestPermission === 'function'` en los cuatro casos. Conclusión: Chrome real (Allow
por omisión) resuelve `'granted'`; el headless shell, sin conceder, resuelve `'prompt'` (fuera de la especificación,
no hay cuadro que contestar).

## Rojo (antes de arreglar)

- `e2e-karts` completo con los archivos de `origin/main`: `FAIL sensor: se activa con las lecturas de orientación`,
  `FAIL sensor: inclinar a la derecha gira a la derecha`, `FAIL sensor: sin lecturas espera 2 s y regresa a los
  botones` (en la primera corrida de la rama sin conceder sensores, además REVERSA y SALTO con sensor: 7 pasos).
- `KARTS_SOLO=sensor` con la línea vieja de `iniciarCarrera` (`if (control === 'sensor' && TACTIL) activarSensor();`):
  `FAIL sensor en sala sin toque … {"control":"botones","activo":false,"boton":false,"permiso":{"sinGesto":1}}` y
  `FAIL sensor en sala: «📱 Activar sensor» …` (cambió a botones en silencio).

## Verde (rama `fix/karts-sensor-android`)

| Comando | Resultado |
|---|---|
| `KARTS_SOLO=sensor … karts` (versión final de la prueba) | PASS 12, FAIL 0 |
| `KARTS_SOLO=salto … karts` | PASS 31, FAIL 0 |
| `KARTS_SOLO=reversa … karts` | PASS 32, FAIL 2 (reversa joystick y sensor 844×390: avance −5 px por carga; en la corrida completa pasaron) |
| `… karts` completo | PASS 428, FAIL 10: 9 de fps con CPU ×4 (31–52 fps) y «salto teclado: esquiva la cáscara» (pasa suelto con `KARTS_SOLO=salto`). Los 29 pasos de sensor, PASS. |
| `… karts-puntos` | PASS 83, FAIL 0 |
| `… espectador` | PASS 28, FAIL 0 |
| `… mando` | PASS 64, FAIL 0 |
| `… karts-vivo` | PASS 113, FAIL 16: fps (9–15) y sincronía en vivo bajo carga; todos los pasos de control en sala, sensor y ⚙️, PASS. En `main` bajo la misma carga, karts-vivo y espectador no llegaron a correr (servidor caído). |
| `npx -y deno test -A server/` | 1065 passed, 0 failed, 6 ignored |
| `openspec validate karts-sensor-android --strict` | válido |

Duración aproximada: 2.5 h de corridas (con la máquina compartida).

## Verificación de estado

- Antes: repo de datos original sin cambios; ninguna tabla `stald_` en uso.
- Después: `correr.sh` borró su copia temporal; el original no se modificó (se usa como origen de solo lectura).
- Estado restaurado: Sí. Las salas de prueba vivieron en el servidor local, que se apagó.

## Producción (solo lectura)

- `curl https://jalducin.github.io/platform-STALD/juegos/karts.html` → 200, idéntico (sin contar finales de línea) a
  `juegos/karts.html` de `origin/main` antes del merge.

## Resultado

- Estado: PASS para lo que toca el cambio (sensor individual, sensor en sala, controles de sala, puntos, espectador,
  mando, Deno). Las fallas restantes son de rendimiento/sincronía por carga de la máquina y no dependen del cambio.
- Bloqueos: ninguno.
