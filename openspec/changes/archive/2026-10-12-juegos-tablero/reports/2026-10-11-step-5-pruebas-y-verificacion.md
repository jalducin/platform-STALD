# Reporte Step 5 — Pruebas y verificación de estado

- Fecha: 2026-10-11
- Cambio: juegos-tablero
- Agente: Claude (Opus 5.5)

## Comandos ejecutados

- `npx -y deno test -A server/` y `npx -y deno lint server/`.
- E2E con la copia de datos de prueba, puertos 8937 y 8915:
  `bash tests/e2e/correr.sh --datos <copia> --puerto-api 8937 --puerto-web 8915 juegos-tablero juegos fusion clasicos
  revancha ranking-juegos partidas ajedrez una-sala poker cartas-espanolas karts ajustes-salas`.
  - Después se repitieron `juegos-tablero partidas` y otra vez `juegos-tablero`.
- Verificación manual (Step 6): un script con `curl` contra un servidor local en el puerto 8937, con otra copia de
  los datos, que se borró al terminar.

## Resultados de pruebas

- **Pruebas dirigidas** (`server/tablero_test.ts` y `server/naval_test.ts`): 29 pasaron y 0 fallaron.
  - Las pruebas se escribieron antes que el código y fallaron primero, por falta de los módulos.
- **Suite del servidor** (tras integrar `origin/main` con `mesas-con-bots`): 344 pasaron, 0 fallaron y 6 se omitieron
  (las de siempre). `lint`: 79 archivos sin avisos.
- **E2E, primera corrida:** 13 corridas, 11 PASS y 2 FAIL.
  - `juegos-tablero`: al rendirse en Batalla naval, el `n` competía con un disparo del rival y la jugada quedaba en
    `turno_tomado` sin aviso.
    - Se corrigió en `juegos/tablero-ui.js`: rendirse y reclamar se reintentan con el paso nuevo.
    - Se subió `?v=2`.
  - `partidas` («Basta: palabra repetida vale 50»): intermitente y ajeno al cambio. Pasó al repetirla (15/15).
- **E2E, repeticiones:**
  - `juegos-tablero`: 40/40 dos veces seguidas.
  - `partidas`: 15/15.
- **Regresión (todo PASS):**
  - `juegos` 28, `revancha` 20, `clasicos` 11, `fusion` 10 y `karts` 15 pasos;
  - `una-sala` 12, `poker` 27, `cartas-espanolas` 21 y `ajedrez` 12 pasos;
  - `ajustes-salas` 8 y `ranking-juegos` 50 pasos.
- **Conteo del menú:** 28 juegos en `e2e-juegos`, `e2e-fusion`, `e2e-clasicos` (9 clásicos) y `e2e-karts`.

## Capturas revisadas (tests/e2e/salida/, 390 px)

- `tablero-damas-390.png` y `tablero-damas-sala-390.png`:
  - el tablero cabe y las piezas van en las casillas oscuras;
  - las piezas que pueden mover tienen aro amarillo;
  - en sala, el tablero está volteado para negras.
- `tablero-domino-390.png` y `tablero-domino-sala-390.png`:
  - la mesa verde se acomoda en renglones;
  - se ven los extremos y la mano con las fichas que embonan resaltadas;
  - los rivales aparecen con dorsos y su última acción («pasó», «tiró 5-6»).
- `tablero-parchis-390.png` y `tablero-parchis-sala-390.png`:
  - el tablero SVG de 15×15 tiene casas, salidas de color, estrellas seguras, pasillos y meta;
  - se ven el dado y los botones de 44 px para mover;
  - las 16 fichas se ven en sala.
- `tablero-naval-acomodo-390.png`, `tablero-naval-390.png`, `tablero-naval-sala-390.png` y
  `tablero-naval-sala-fin-390.png`:
  - el acomodo, los dos mares, los marcadores de agua y tocado, y los mares revelados en el podio.
  - **Hallazgo corregido:** ganar por rendición daba 1,000 puntos con un solo disparo. Ahora vale 500 + 20 por casilla
    tocada; se actualizó `design.md`.

## Verificación manual (Step 6, curl)

| Caso | Resultado esperado |
|---|---|
| Crear sala `naval` con `bots: true` | 200 con `bots: false` |
| Unirse y empezar | 200 y 200 |
| Flota inválida | 400 `flota_invalida` |
| Flotas válidas | 200 |
| `GET` de Angel | solo trae una flota, la suya (`[[10…`) |
| Disparo fuera de turno | 409 `no_es_tu_turno` |
| Disparo de Marisol a B2 | 200, con `r: "tocado"` |
| Disparo repetido | 400 `ya_disparaste` |
| `GET` de alguien que no está en la sala | 403 `no_en_sala` |
| `GET` del admin | 0 flotas |

Todas las respuestas coincidieron con lo esperado.

## Verificación de estado

- **Antes:** las pruebas usan copias temporales de `scratchpad/data` (`correr.sh` copia y descarta). La carpeta
  original no se modificó.
- **Después:** se borraron las copias. Los puertos 8937 y 8915 quedaron libres.
- **Estado restaurado:** sí. No se tocaron producción, Supabase, las tablas `stald_*`, `.env` ni Notion.

## Resultado

- Estado Step 5: PASS.
- Bloqueos: ninguno.
