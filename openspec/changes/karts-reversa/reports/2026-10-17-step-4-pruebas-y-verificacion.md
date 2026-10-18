# Reporte Step 4 — Pruebas y verificación de estado

- Fecha: 2026-10-17 (terminado el 2026-10-18)
- Cambio: karts-reversa
- Agente: Claude Code (Opus 5.5)

## Comandos ejecutados
- `npx -y deno test -A server/karts_reversa_test.ts` (antes de implementar: falla, no existe el módulo; después: 8/8)
- `KARTS_SOLO=reversa CHROME=… bash tests/e2e/correr.sh --datos <copia temporal> --puerto-api 10071 --puerto-web 10081 karts`
  (antes de implementar: 3 PASS y fallas en todas las verificaciones de reversa; después: 34 PASS, 0 FAIL)
- `CHROME=… bash tests/e2e/correr.sh --datos <copia temporal> --puerto-api 10071 --puerto-web 10081 karts mando`
- `npx -y deno test -A server/` y `npx -y deno lint server/`
- `cd tests/calidad && npm run calidad` y `node calidad.mjs --detalle --archivo juegos/karts`
- `npx -y @fission-ai/openspec@1.4.1 validate karts-reversa --strict`

## Resultados de pruebas
- Unitarias de la reversa: 8 pasaron, 0 fallaron (velocidad y tope 35–40 %, aceleración suave, «freno parado»,
  volante invertido, meta: adelante, atrás, ida y vuelta ×25, una vuelta completa al revés, salida, terminado, saltos).
- `deno test -A server/`: 780 pasaron, 0 fallaron, 6 omitidas (3 min 32 s). `deno lint server/`: limpio (131 archivos).
- E2E `KARTS_SOLO=reversa`: 34 pasaron, 0 fallaron. Botón «⏪ REVERSA» con toques reales en Botones, Joystick y Sensor
  a 390×844 y 844×390 (vel −95, avance baja; al soltar vuelve a acelerar; sin encimarse con mandos, minimapa ni HUD);
  volante invertido (⬅ en reversa sube el ángulo); mando: B en marcha frena y B parado = reversa, etiqueta
  «frenar/rev»; teclado: ↓ en marcha frena, ↓ parado y R = reversa; meta cruzada en reversa 3 veces → la vuelta queda
  igual, deuda 0, sin avisos de vuelta; el piloto de prueba no usa la reversa.
- E2E completa: `mando` 64 PASS, 0 FAIL. `karts` 327 PASS, 4 FAIL: solo las mediciones de fps con CPU ×4
  (Tenochtitlan 54, Hielo 54, Anillos 47, Angkor 51 contra 60). La máquina estaba cargada por otros agentes con sus
  E2E en paralelo (≈ 40 procesos de Chrome); es la misma nota de carga ajena de reportes anteriores
  (`karts-curvas-complejas`, `espectador-partidas`). La reversa solo agrega dos llamadas de función por cuadro al kart
  propio; ninguna verificación funcional falló.
- Calidad: `juegos/karts.html` baja de 16 a 15 avisos (`pasoKart` deja de pasar de 15 de complejidad al sacar
  `velAdelante`); el módulo nuevo no tiene avisos. Sin avisos nuevos.
- OpenSpec: `karts-reversa` válido.

## Verificación de estado
- Antes: copia temporal del repo de datos en el scratchpad; sin Postgres de prueba (no se usa `--pg`).
- Después: las E2E escriben solo en esa copia temporal del servidor de prueba; ninguna tabla `stald_` tocada.
- Estado restaurado: Sí — la copia temporal se descarta; servidores de prueba detenidos.

## Verificación manual (Step 5) — capturas revisadas
`tests/e2e/salida/karts-reversa-{botones,joystick,sensor}-{390x844,844x390}.png` y `karts-reversa-mando-390x844.png`:
el botón ámbar «⏪ REVERSA» queda a lo ancho bajo FRENO y DERRAPE en vertical y en la esquina inferior derecha en
horizontal, sin tapar el minimapa, el HUD ni los demás botones. Con el mando, B dice «frenar/rev» sin encimarse.
Casos de error: con el motor ahogado, al terminar y con el piloto de prueba la reversa no actúa (código y E2E del
piloto).

## Resultado
- Estado Step 4: PASS (con la nota de fps bajo carga ajena).
- Bloqueos: ninguno.
