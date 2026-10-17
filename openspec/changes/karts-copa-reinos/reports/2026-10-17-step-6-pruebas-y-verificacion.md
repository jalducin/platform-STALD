# Reporte Step 6 — Pruebas y verificación de estado

- Fecha: 2026-10-17
- Cambio: karts-copa-reinos
- Agente: Claude Code (sprint 34)

## Comandos ejecutados

- `npx -y deno test -A server/` · `npx -y deno lint server/` · `npx -y deno check server/main.ts`
- `cd tests/calidad && npm run calidad` (y `node calidad.mjs --archivo …` sobre los archivos tocados, comparado con `main`)
- `CHROME=…/chromium-1228/chrome-win64/chrome.exe bash tests/e2e/correr.sh --datos <copia de datos> --puerto-api 9871 --puerto-web 9881 karts karts-vivo juegos categorias`
- Verificación manual: servidor local (`deno run -A server/main.ts`, puerto 9873, copia de los datos de prueba con los
  alumnos y alumnas de ejemplo) y `curl` (ver abajo).

## Resultados de pruebas

- Unitarias (Deno): 688 pasaron, 0 fallaron, 6 omitidas (las omitidas son las de siempre). Nuevas en
  `server/karts_reinos_test.ts` (7) y generalizadas en `karts_pistas_test.ts` y `karts_copa_test.ts`.
- `deno lint` sin avisos; `deno check` correcto.
- Calidad: 0 avisos en `juegos/karts-reinos.js` y `server/karts_reinos_test.ts`; `karts.html`, `juegos/app/arcade.js`,
  `juegos/app/salas.js`, `karts-pistas.js` y `karts-copa.js` con los mismos avisos que en `main` (22 en el conjunto,
  antes y después). Sin avisos nuevos.
- E2E (tras fusionar `origin/main` con Futbolito Arena):
  - `juegos` 31/31, `categorias` 49/49, `karts` 258/258 PASS.
  - `karts-vivo`: 70/72 en esa corrida; las 2 fallas fueron solo las lecturas de fps con CPU ×4, una de ellas en la
    Pradera (sin código nuevo: 38 fps) porque la máquina estaba cargada por otros agentes. En la corrida anterior
    `karts-vivo` pasó completo (72/72: 60 fps con 8 en vivo y 59 fps con 8 en vivo dentro de El Castillo). Repetición
    final: ver «Repetición de karts-vivo».
- Duración: `karts` ≈ 11 min (por eso su tope en `correr.sh` sube 420 s), `karts-vivo` ≈ 14 min.

## Rendimiento (60 fps, celular con CPU ×4)

Condiciones: Windows 11, Chromium 1228 de Playwright, `Emulation.setCPUThrottlingRate` = 4. La máquina NO estaba
quieta: otros agentes corrían sus E2E a la vez (≈ 99 procesos de Chrome, 4 servidores Deno, carga de CPU entre 13 y
79 %). Por eso la E2E de pistas mide la mediana de 6 lecturas (como ya hacía `karts-vivo` con 8).

| Medición | fps |
|---|---|
| Dentro de Giza / El Castillo / Karnak / Angkor (piloto de prueba, CPU ×4) | 60 / 60 / 60 / 60 |
| 8 karts en vivo, Pradera, CPU ×4 (corrida sin carga ajena) | 60 |
| 8 karts en vivo dentro de El Castillo, CPU ×4 (corrida sin carga ajena) | 59 |
| Sin tope de vsync, CPU ×4, dentro de El Castillo (844×390) | cuadro medio 9.5 ms (≈ 105 fps) |

Optimizaciones medidas: dentro de un corredor solo se dibujan los muros de ese tramo (y el vecino cerca de la unión),
en lote y unidos por tono; bajo la bóveda no se pinta el cielo de afuera; el resplandor de las antorchas es un sprite
sin `lighter`, con tope de tamaño y solo a menos de 560 px.

## Verificación manual (curl, servidor local)

| Caso | Resultado |
|---|---|
| `POST /juegos/sala` copa `reinos` | 200, `opciones { mapa: "giza", modo: "copa", copa: "reinos" }` |
| copa `egipto` | 400 (`copa_invalida`) |
| sala suelta en `angkor`, unirse y empezar | 200 / 200 / 200 |
| mapa `luna` | 400 (`mapa_invalido`) |
| sin correo ni sesión | 400 |
| tiempo de 10.5 s en Angkor (debajo de su mínimo) | 400 `carrera_invalida` |

## Verificación de estado

- Antes: copia de los datos de prueba en el scratchpad (el repo privado nunca se toca); 0 escrituras en `stald_`.
- Después: las E2E usan su propia copia (`correr.sh`); la copia de curl se borró al terminar. Sin Postgres.
- Estado restaurado: Sí — servidores locales detenidos y copia temporal eliminada.

## Capturas revisadas

`tests/e2e/salida/karts-reinos-<pista>-{afuera,adentro}-{390x844,844x390}.png` (16), `karts-reinos-menu-candado-390.png`,
`karts-reinos-menu-390.png`, `karts-reinos-sala-karnak-{390,844x390}.png`, `karts-vivo-390-cpu4-castillo.png`.
Iteraciones por la revisión visual: Angkor sin bóveda (galería en sombra con el patio y las torres a la vista), captura
«adentro» lejos de compuertas y columnas, bloque de hielo y bloque que cae con nombres distintos.

## Resultado

- Estado Step 6: PASS (con la nota de fps bajo carga ajena documentada arriba).
- Bloqueos: ninguno.
