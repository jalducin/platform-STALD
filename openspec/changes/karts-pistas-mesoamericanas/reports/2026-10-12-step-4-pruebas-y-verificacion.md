# Reporte Step 4 — Pruebas y verificación de estado

- Fecha: 2026-10-12
- Cambio: karts-pistas-mesoamericanas
- Agente: Claude Code (Opus 5.5)

## Comandos ejecutados
- `npx -y deno test -A server/karts_pistas_test.ts` (primero en rojo: no existía `juegos/karts-pistas.js`)
- `npx -y deno test -A server/`
- `npx -y deno lint server/` y `npx -y deno check server/main.ts`
- `cd tests/calidad && npm run calidad` (y `node calidad.mjs --detalle` comparado con `karts.html` de `origin/main`)
- `CHROME=… bash tests/e2e/correr.sh --datos <copia de datos> --puerto-api 9339 --puerto-web 9349 karts juegos categorias emocion`
- `npx -y @fission-ai/openspec@1.4.1 validate karts-pistas-mesoamericanas --strict`

## Resultados de pruebas
- Dirigidas (`server/karts_pistas_test.ts`): 9 pasaron, 0 fallaron. Trazados cerrados, sin encimarse, radio mínimo
  ≥ 80 px, meta en recta, mecánicas sobre el camino, trajinera determinista, minimapa encuadrado, copas, salas con
  las 4 pistas originales (igual que `MAPAS_SALA`) y progreso aceptado por `validarProgreso` con cada copa.
- Servidor completo: 571 pasaron, 0 fallaron, 6 omitidas. Lint y revisión de tipos sin errores.
- Calidad: sin avisos nuevos (`karts.html` 14 avisos, los mismos 14 que en `main`; `karts-pistas.js` 0).
- E2E (tras mezclar `origin/main` con los 8 personajes): karts 211 PASS / 0 FAIL, juegos 31/0, categorias 49/0,
  emocion 45/0.
- Rendimiento con CPU ×4 (`Emulation.setCPUThrottlingRate`), 390×844 táctil: Tenochtitlan 60 fps, Teotihuacan
  60 fps, Chichén Itzá 60 fps, La Venta 58 fps (el contador redondea por segundo; umbral de la prueba ≥ 55).

## Incidencias encontradas y corregidas
- El servidor valida ids de copa con `^[a-z]{2,12}$`: `mesoamericana` (13 letras) se rechazaba al guardar. Se
  renombró el id a `mesoamerica` (sin tocar el servidor) y se agregó la prueba contra `validarProgreso`.
- El salto dependía de pisar un círculo de la rampa justo tras una curva; ahora salta quien cruza la línea de la
  rampa por el camino con más de 140 px/s (0.7 s en el aire), y el cenote queda dentro del vuelo.
- Cabezas de serpiente: la primera versión se leía como calavera; se rehízo con hocico, ojos de jade y plumas.

## Verificación de estado
- Antes: copia temporal de los datos de prueba creada por `correr.sh`; no se usa Postgres (sin `--pg`).
- Después: `correr.sh` borra la copia temporal al terminar. Nunca se escribió en tablas `stald_`.
- Estado restaurado: Sí — copia temporal descartada por el orquestador.

## Capturas revisadas
`tests/e2e/salida/karts-meso-*.png` (selector, menú y cada pista a 390×844 y 844×390): Templo Mayor con sus dos
templos y los volcanes sobre el lago con chinampas y ahuejotes; pirámides del Sol y de la Luna con la calzada roja y
las cabezas de serpiente; El Castillo, ceibas y el sacbé blanco; cabezas colosales, cacao y la pirámide de tierra en la
selva de La Venta. Todas legibles con el HUD y los mandos.

## Resultado
- Estado Step 4: PASS
- Bloqueos: ninguno
