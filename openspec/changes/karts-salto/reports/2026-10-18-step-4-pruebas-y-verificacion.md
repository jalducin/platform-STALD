# Reporte Step 4 — Pruebas y verificación de estado

- Fecha: 2026-10-18
- Cambio: karts-salto
- Agente: Claude Code (Opus 5.5)

## Comandos ejecutados
- `npx -y deno test -A server/karts_salto_test.ts` (antes de implementar: falla, no existe `juegos/karts-salto.js`;
  después: 9/9)
- `KARTS_SOLO=salto KARTS_VIVO_SOLO=salto CHROME=… bash tests/e2e/correr.sh --datos <copia temporal> --puerto-api 10131 --puerto-web 10141 karts karts-vivo`
- `CHROME=… bash tests/e2e/correr.sh --datos <copia temporal> --puerto-api 10131 --puerto-web 10141 karts karts-vivo mando`
  (y de nuevo `karts` tras ajustar el ancho a 320 px y la prueba de la cáscara)
- `npx -y deno test -A server/` y `npx -y deno lint server/ juegos/karts-salto.js`
- `cd tests/calidad && npm run calidad`; `node calidad.mjs --detalle --archivo juegos/karts` y `--archivo server/karts_salto`
- `npx -y @fission-ai/openspec@1.4.1 validate karts-salto --strict`

## Resultados de pruebas
- Unitarias del salto: 9 pasaron, 0 fallaron (duración 0.4 s y 14 px, aplastón; enfriamiento ≈ 0.6 s y ≤ 1 brinco por
  segundo apretando sin parar; no brinca con rampa, cayendo, con el dron, golpeado ni al terminar; no toca vel, idx,
  vuelta, mitadOk ni `aire`; **no cruza ningún hueco de las 4 pistas espaciales** brincando de 0 a 6 muestras antes a
  la punta con turbo; **no cruza el cenote** ni salva del lodo; esquiva cáscara y bola solo en lo alto y nunca cohete,
  rayo, bloques ni roca; giro al 35 % en el aire; salto mantenido + giro al caer = derrape, en el aire no empieza).
- `deno test -A server/`: 824 pasaron, 0 fallaron, 6 omitidas. (Una primera corrida, con la E2E completa en paralelo,
  dio 1 falla de tiempo que no se repitió; la segunda, 824/0.) `deno lint`: limpio.
- E2E `karts` completa: 394 PASS, 0 FAIL (incluye fps 60 con CPU ×4 en las pistas). Del salto: botón «⤴ SALTO» con
  toques reales en Botones, Joystick y Sensor a 390×844 y 844×390 (sube a 14 px y baja, sin encimarse con DERRAPE,
  FRENO, REVERSA, 🎁, minimapa ni HUD); enfriamiento al caer; SALTO mantenido + ⬅ → derrape al caer y mini-turbo
  naranja; tutorial; mando: R táctil brinca y el tutorial dice «R / L: Salto · mantén y gira»; L del control físico
  (Gamepad API) brinca; teclado: ESPACIO brinca sin derrapar si no giras; sin brincar la cáscara te tumba y brincando
  pasa encima y sigue en la pista; hueco de Anillos de Saturno sin la rampa: brincando cae y llega el dron (`brecha` 0);
  el piloto de prueba no brinca. Distribución de mandos a 320×640 y dentro de Juegos (358 px) dentro de la pantalla.
- E2E `karts-vivo`: 100 PASS, 0 FAIL (incluye «salto en vivo: la otra persona ve el kart subir y volver a bajar»:
  propio 14 px, visto 14.2 px, luego 0). `mando`: 64 PASS, 0 FAIL.
- La primera corrida completa encontró 3 fallas que se corrigieron: los mandos se salían por la izquierda a 320 px y
  dentro de Juegos (≈ 358 px) por la columna nueva (se ajustaron anchos con `max-width: 380px` y `340px`), y la prueba
  de la cáscara medía antes de que el kart quedara derecho tras `ponerEn` (espera de 350 ms).
- Calidad: `juegos/karts.html` 15 avisos (los mismos de antes; ninguno nuevo); `juegos/karts-salto.js` y
  `server/karts_salto_test.ts` sin avisos.
- OpenSpec: `karts-salto` válido.

## Verificación de estado
- Antes: copia temporal del repo de datos en el scratchpad; sin Postgres de prueba (no se usa `--pg`).
- Después: las E2E escriben solo en esa copia del servidor de prueba; ninguna tabla `stald_` tocada.
- Estado restaurado: Sí — la copia temporal se descarta; servidores de prueba detenidos.

## Verificación manual (Step 5) — capturas revisadas
`tests/e2e/salida/karts-salto-{botones,joystick,sensor}-{390x844,844x390}.png`, `karts-salto-aire-{390x844,844x390}.png`,
`karts-salto-mando-390x844.png`, `karts-salto-hueco-390x844.png`, `karts-salto-vivo-390.png` y `karts-320-vertical.png`:
el botón azul «⤴ SALTO» es una columna alta a la derecha de DERRAPE, FRENO y REVERSA (donde descansa el pulgar), en
vertical y en la esquina inferior derecha en horizontal, sin tapar el minimapa ni el HUD; a 320 px todo cabe. En el
aire el kart sube y su sombra se queda en el piso, más chica. Casos de error: brinco durante el enfriamiento, al
terminar, cayendo y con el piloto de prueba no actúa (unitarias y E2E).

## Resultado
- Estado Step 4: PASS
- Bloqueos: ninguno.
