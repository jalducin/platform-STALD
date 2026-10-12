# Reporte Step 8 — Pruebas y verificación de estado

- Fecha: 2026-10-11
- Cambio: juegos-plataformas-karts
- Agente: Claude (Sprint 3)

## Comandos ejecutados
- `npx -y deno test -A server/` · `npx -y deno lint server/` · `npx -y deno check server/main.ts`
- `bash tests/e2e/correr.sh --datos <copia de prueba> --puerto-api 8947 --puerto-web 8925 plataformas karts juegos partidas juegos-recarga ajustes-salas ritmo dragon-run peticiones clasicos fusion revancha`
- Verificación manual (Step 9): `curl` contra un servidor local en el puerto 8961 con otra copia de los datos.

## Resultados de pruebas
- Dirigidas (`server/progreso_test.ts`, `server/carreras_test.ts`): 17 pasaron, 0 fallaron.
- Suite del servidor: 289 pasaron, 0 fallaron, 6 omitidas (las de siempre). `lint`: 70 archivos sin avisos. `check`: OK.
- E2E (fase `base`): 12 corridas, 12 PASS, 0 FAIL, 0 omitidas:
  - nuevas: `plataformas` 24/24 pasos y `karts` 15/15 pasos;
  - regresión: `juegos` 28, `partidas` 15, `juegos-recarga` 37, `revancha` 20, `clasicos` 11, `fusion` 10, `dragon-run` 9,
    `ajustes-salas` 8, `ritmo` 2 y `peticiones` 11 pasos.
- Duración de la suite E2E: ~25 min.

## Capturas revisadas (tests/e2e/salida/)
- `plataformas-390-jugando.png`, `plataformas-390-mapa.png`, `plataformas-390-nivel-superado.png`,
  `plataformas-390-sala.png`, `plataformas-390-podio.png`, `plataformas-escritorio.png`.
- `karts-390-carrera.png`, `karts-390-resultados.png`, `karts-390-menu.png`, `karts-390-sala.png`,
  `karts-390-podio.png`, `karts-escritorio.png`.
- Hallazgos corregidos durante la revisión: la línea de salida de las pistas caía en una curva (los carros salían
  de frente al pasto) y los botones táctiles de karts no cabían a 390 px; el castillo usaba piso de pasto; Axo se
  dibujaba detrás de los menús.

## Verificación manual (curl, servidor local)
- `GET /juegos/progreso/plataformas` (Fernando) → 200 `{ v: 0, datos: null }`; `PUT { v: 0 }` → 200 `{ ok, v: 1 }`;
  `GET` → los mismos datos; `PUT` con `v: 0` → 409 `version_vieja` con lo guardado; forma inválida (`vidas: 500`) →
  400 `progreso_invalido`; karts con chasis ligero sin la pieza → 400; `sudoku` → 400 `juego_sin_progreso`; correo sin
  registro → 403 `no_registrado`; sin correo ni sesión → 400 `missing_email`; Marisol y admin ven solo el suyo (vacío).
- Sala de karts con `opciones.mapa: "hielo"` → 200 con el mapa; `mapa: "luna"` → 400 `mapa_invalido`;
  `carrera.ms: 5000` a los 16 s → 400 `carrera_invalida`; `ms: 15800` → 200; el progreso de karts sigue en `v: 0`.

## Verificación de estado
- Antes: copia de prueba de `scratchpad/data` (sin `juegos/progreso/`).
- Después: los servidores de prueba usan `MemoryStore` sobre copias temporales; `correr.sh` borra su copia al terminar
  y la copia del `curl` se borró a mano. La carpeta de datos original no se modificó.
- Estado restaurado: Sí.

## Resultado
- Estado Step 8: PASS
- Bloqueos: ninguno
