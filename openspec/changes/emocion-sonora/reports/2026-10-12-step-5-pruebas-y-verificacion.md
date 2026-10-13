# Reporte Step 5 — Pruebas y verificación de estado

- Fecha: 2026-10-12
- Cambio: emocion-sonora
- Agente: Claude Code (Opus 5.5)

## Comandos ejecutados
- `npx -y deno test -A server/` · `npx -y deno lint server/` · `npx -y deno check server/main.ts`
- `CHROME=…/chromium-1228/chrome-win64/chrome.exe bash tests/e2e/correr.sh --datos <copia de datos del scratchpad> --puerto-api 9573 --puerto-web 9583`
  (los puertos 9239/9249 estaban ocupados), tras el merge de `origin/main` (sprint 25, `errores-latentes`).
- Repetición aislada: `… correr.sh … una-sala una-robo`.
- TDD: `… correr.sh … emocion` antes de integrar (falla: `window.Emocion` no existía en los juegos) y después.
- `cd tests/calidad && node calidad.mjs --detalle` en la rama y sobre una exportación de `origin/main` (`git archive`).

## Resultados de pruebas
- Unitarias (Deno): 521 pasaron, 0 fallaron, 6 omitidas (las de `DATA_DIR`). Nuevas: 11 en
  `server/emocion_test.ts` (recetas, gol, cuenta regresiva, racha, silencio, sin gesto, sin AudioContext, espera
  mínima, ducking, tensión y registro). Lint y check sin errores.
- E2E nueva `emocion`: 45/45 PASS (muestras WAV, Futbolito, silencio, efectos apagados, sin AudioContext, autoplay
  bloqueado, Golf, Karts, interruptor del hub, quiz, podio con suspenso y revancha).
- E2E completa: 53 corridas, 51 PASS, 2 FAIL, 2 omitidas (`grupos` e `ingles-pro` requieren `--pg`).
  - `una-sala` y `una-robo` fallaron en la corrida completa porque, al inicio, seguía viva por error una corrida
    anterior detenida (otro Chromium y otro servidor en paralelo, que además escribían en `tests/e2e/salida/`).
    Repetidas solas: **PASS** (16/16 y 6/6). Los cambios en ¡Una! son solo de sonido (`gritoUna`).
  - `peticiones`: **PASS** (11/11); la falla previa conocida (41 contra tope de 40) ya no aparece tras el merge, y
    el módulo no hace peticiones al API (solo agrega un estático).
- Calidad: 316 avisos en `origin/main` y 316 en la rama (0 nuevos); +1 revisado con `NOSONAR` (el ruido blanco de
  audio usa `Math.random`).
- Duración aproximada de la E2E completa: 75 min.

## Muestras de audio (OfflineAudioContext, 22.05 kHz, en `tests/e2e/salida/emocion/`, no versionado)

| Stinger | Duración (s) | Pico | RMS |
|---|---|---|---|
| gol | 2.70 | 0.265 | 0.0428 |
| victoria | 1.90 | 0.186 | 0.0170 |
| derrota | 1.90 | 0.141 | 0.0173 |
| record | 1.50 | 0.203 | 0.0185 |
| nivelSuperado | 1.10 | 0.108 | 0.0178 |
| logro | 1.20 | 0.169 | 0.0204 |
| cuentaRegresiva | 3.60 | 0.17 | 0.012 |
| cuenta | 0.20 | 0.069 | 0.0083 |
| ultimoSegundos | 5.00 | 0.268 | 0.0117 |
| suspenso | 1.80 | 0.297 | 0.0396 |
| revelacion | 1.10 | 0.269 | 0.0304 |
| acierto | 0.25 | 0.076 | 0.0081 |
| error | 0.22 | 0.041 | 0.0047 |
| racha | 0.22 | 0.060 | 0.0062 |
| silbato | 1.30 | 0.071 | 0.0104 |
| campana | 1.50 | 0.150 | 0.0194 |
| canto | 0.30 | 0.098 | 0.0115 |
| revancha | 0.70 | 0.121 | 0.0082 |
| podio | 3.45 | 0.535 | 0.0414 |
| tension (0.8) | 3.00 | 0.229 | 0.0263 |

Ninguna satura (pico < 0.99), ninguna es silencio (RMS > 0.003) y no queda cola después de la duración declarada.

## Verificación de estado
- Antes: copia temporal de datos creada por `correr.sh` a partir de la copia del scratchpad; Postgres no se usó.
- Después: la copia temporal se descarta; la carpeta de datos original no se modifica. No se escribió en tablas
  `stald_`.
- Estado restaurado: Sí — además se cerraron los servidores huérfanos (deno y python) de la corrida detenida.

## Resultado
- Estado Step 5: PASS
- Bloqueos: ninguno. Pendiente: prueba de oído del profe (tarea 6.3).
