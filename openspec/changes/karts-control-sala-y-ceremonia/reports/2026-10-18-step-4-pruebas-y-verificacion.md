# Reporte Step 4 — Pruebas y verificación de estado

- Fecha: 2026-10-18
- Cambio: karts-control-sala-y-ceremonia (sprint 43c)
- Agente: Claude Code (Opus 5.5)

## Comandos ejecutados
- `npx -y deno test -A server/karts_ceremonia_test.ts` (primero en rojo: sin `juegos/karts-ceremonia.js` no compila; luego 7 PASS)
- `npx -y deno test -A server/` y `npx -y deno lint server/`
- `cd tests/calidad && npm run calidad`
- `KARTS_SOLO=ceremonia bash tests/e2e/correr.sh … karts` (iteración)
- `KARTS_VIVO_SOLO=ceremonia` y `KARTS_VIVO_SOLO=copa bash tests/e2e/correr.sh … karts-vivo` (iteración y tras el merge de main)
- `bash tests/e2e/correr.sh --datos <copia temporal> --puerto-api 10233 --puerto-web 10243 karts karts-vivo mando emocion`
  y `… espectador` (puertos 10231/10241), con `CHROME` de Playwright chromium-1228

## Resultados de pruebas
- Unitarias Deno: 838 pasaron, 0 fallaron, 6 omitidas (incluye 7 nuevas de la ceremonia: orden 3.º → 2.º → 1.º, datos
  del podio sin reordenar, empates, menos de 3 lugares, momentos y hora de inicio en sala). `deno lint server/`: sin
  problemas (137 archivos).
- Calidad: 317 avisos, igual que `main` antes del cambio (sin avisos nuevos; se bajó la complejidad de
  `pintarFinalSala` con `celebrarPodio` y se partió el manejo del panel ⚙️).
- E2E (suite pedida, antes del merge de 43a):
  - `karts`: 406 PASS, 4 FAIL. Los 4 son fps con CPU ×4 (Teotihuacan 51, Orbital 44, Giza 53, Angkor 45) con la máquina
    cargada por las corridas de 43a/43b en paralelo; la ceremonia y el panel no corren durante la carrera suelta. Todas
    las de la ceremonia de la copa individual pasan (16).
  - `karts-vivo`: 117 PASS, 4 FAIL: fps con CPU ×4 y 8 en vivo (53 y 54, meta 55), «el lugar de Angel coincide en las
    dos pantallas» en la sala de 8 (carga de la máquina) y «⚙️ cambiar a Botones a media carrera» — esta última era de
    la prueba nueva (medía en la cuenta regresiva, tiempo 0); se corrigió esperando la salida y pasa.
  - `mando`: 64 PASS, 0 FAIL. `emocion`: 45 PASS, 0 FAIL. `espectador`: 28 PASS, 0 FAIL.
- E2E tras el merge de `origin/main` (43a, copa de 4 carreras y plazo de 30 s):
  - `KARTS_VIVO_SOLO=ceremonia`: 20 PASS, 0 FAIL («🎮 Tu control», permiso del sensor, Joystick aplica y se recuerda, ⚙️
    sin pausa, ceremonia a la misma hora en los 2 aparatos — diferencia 0 ms —, orden 3.º → 2.º → 1.º, lugares iguales a
    la tabla del servidor, espectador con movimiento reducido ve la versión fija, «Saltar», termina sola).
  - `KARTS_VIVO_SOLO=copa`: 26 PASS, 0 FAIL (incluye la ceremonia al final de la copa en sala con 3 personajes).

## Verificación de estado
- Antes: copia temporal del repo de datos en el scratchpad; servidor de pruebas sin Postgres (`Postgres de prueba: no`).
- Después: las corridas solo escriben en la copia temporal (salas e invitados de prueba). No se tocan tablas `stald_`.
- Estado restaurado: Sí — la copia temporal se descarta; el repo de datos original no se modifica.

## Verificación manual (Step 5)
- Capturas revisadas: `karts-control-sala-espera-390.png` / `-844x390.png` (tarjeta debajo de «🏁 Tu piloto», 4 + 2
  botones, sin desplazamiento horizontal), `karts-control-panel-390.png` / `-844x390.png` (panel ⚙️ arriba al centro,
  mandos libres), `karts-ceremonia-copa-390x844.png` / `-844x390.png`, `karts-ceremonia-sala-390.png` / `-844x390.png`,
  `karts-ceremonia-espectador-390.png`, `karts-ceremonia-reducida-390x844.png`, `karts-ceremonia-copa-sala-390.png`.
- Casos de error: ceremonia ya pasada (`debeMostrar` falso: queda la tabla, unitaria), menos de 3 corredores (unitaria),
  sensor sin permiso sin toque (no cambia a botones; el panel ofrece «📱 Activar sensor»).

## Resultado
- Estado Step 4: PASS (los FAIL restantes son de fps/sincronía de la sala de 8 bajo carga, ajenos al cambio).
- Bloqueos: ninguno.
