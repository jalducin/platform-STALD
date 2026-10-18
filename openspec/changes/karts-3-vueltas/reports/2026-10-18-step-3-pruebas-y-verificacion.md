# Reporte Step 3 — Pruebas y verificación de estado

- Fecha: 2026-10-18
- Cambio: karts-3-vueltas
- Agente: Claude Code (Opus 5.5)

## Comandos ejecutados
- `npx -y deno test -A server/` (primero `server/karts_3_vueltas_test.ts` en rojo: 1 pasó, 8 fallaron)
- `npx -y deno lint server/` y `npx -y deno check server/main.ts`
- `cd tests/calidad && npm run calidad` (y `calidad:detalle` sobre los archivos tocados)
- `KARTS_SOLO=vueltas` y `KARTS_SOLO=ceremonia` con `tests/e2e/correr.sh … karts` (iteración)
- `CHROME=… bash tests/e2e/correr.sh --datos <scratchpad>/data --puerto-api 10215 --puerto-web 10225 karts karts-puntos karts-vivo espectador emocion`
- Línea base: lo mismo sobre una copia de `origin/main` (`git archive`) para las fallas intermitentes

## Resultados de pruebas
- Dirigidas (`server/karts_3_vueltas_test.ts`): 10 pasaron, 0 fallaron.
- Suite del servidor: 848 pasaron, 0 fallaron, 6 omitidas. Lint y `deno check`: sin errores.
- Calidad: 317 avisos (los mismos de antes; los 2 ternarios anidados que metió el cambio se quitaron).
- E2E (corrida completa tras el merge de 43a y 43c):
  - `karts-puntos` 83/83, `emocion` 45/45, `espectador` 28/28;
  - `karts` 425/426: falla intermitente «anillos: la mecánica brecha actúa» (en sola pasa 5 de 6 veces; ver abajo);
  - `karts-vivo` 129/130: falla intermitente «estrella: el cohete llega y B no gira» (ítems entre personas, sin
    relación con las vueltas).
  - Nuevas que pasan: «Vuelta 1/3 → 2 de 3 → ¡Última vuelta! + campana → 3/3 → termina en la 3.ª»; récords de antes
    como «pista chica», «trazado anterior» y «2 vueltas»; la copa a medias (carrera 3 de 4, 27 pts) se conserva y su
    siguiente carrera ya es de 3 vueltas; HUD «Vuelta x/3» sin encimarse con ⚙️ ni con el plazo de 30 s; los mandos se
    ocultan durante la premiación y regresan con «Saltar» o al terminar.
- Rendimiento: 60 fps con CPU ×4 en las pistas (corrida sin otra carga). En la primera corrida, con las pruebas del
  servidor y la calidad corriendo en paralelo, varias pistas bajaron de 55 fps; sin carga pasan.

## Ajustes a pruebas existentes
- Las E2E de sala esperaban 31–37 s fijos (el mínimo de 2 vueltas); ahora esperan `Arcade.limitesKarts(pista).minMs`.
- `karts_puntos_copas_test.ts` (copa en sala): con 3 vueltas la llegada «realista» (108 %) queda > 30 s después del
  ganador (90 %) y la carrera ya cerró por el plazo de 43a; Angel llega 20 s después, dentro del plazo.
- `carreras_test.ts`, `karts_vivo_test.ts`, `karts_reinos_test.ts`, `karts_pistas_test.ts`, `karts_espacio_test.ts`,
  `karts_curvas_test.ts`: tiempos y versiones de 3 vueltas.

## Verificación de estado
- Antes: datos E2E en una copia temporal del repo de datos (`scratchpad/data`); el orquestador la copia otra vez.
- Después: sin cambios en el repo de datos real, Postgres (`stald_*` sin tocar; sin `--pg`), Notion ni `.env`.
- Estado restaurado: Sí — la prueba de la copa a medias deja `copaEnCurso: null` al terminar.

## Resultado
- Línea base (`origin/main` con 43a y 43c, copia con `git archive`): `karts` completa 410/410 una vez; Anillos sola
  (`KARTS_SOLO=espacio KARTS_PISTA=anillos`) falló 6 de 10 veces con el equipo cargado (fps 38 con CPU ×4). En esta
  rama, Anillos sola pasó 5 de 6. La mecánica «brecha» y los fps de Anillos dependen de la carga del equipo, no de
  las vueltas (el salto del hueco no usa vueltas ni límites).
- Estado Step 3: PASS (las 2 fallas intermitentes no dependen de este cambio).
- Bloqueos: ninguno.
