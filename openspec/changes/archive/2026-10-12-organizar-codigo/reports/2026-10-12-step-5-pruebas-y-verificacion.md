# Reporte Step 5 — Pruebas y verificación de estado

- Fecha: 2026-10-12
- Cambio: organizar-codigo
- Agente: Claude (Opus 5.5)

## Comandos ejecutados
- `npx -y deno test -A server/`, `npx -y deno check server/main.ts`, `npx -y deno lint server/` (antes y después)
- Línea base, sobre `origin/main` (`eae63e5`) en un worktree aparte:
  `bash tests/e2e/correr.sh --datos <scratchpad>/data --puerto-api 8999 --puerto-web 8979`
- Por paso (un commit por módulo movido), en la rama: `correr.sh … --puerto-api 8998 --puerto-web 8978 juegos <familia>`
- Final, en la rama ya con `origin/main` (`6fb1bfc`, personajes-xalli) mezclado: la misma corrida completa de la base
- Repeticiones sueltas de cada falla, y corrida de control de `plataformas karts` sobre `origin/main` sin este cambio
- `node --check` de cada `juegos/app/*.js` y comparación de líneas: las 3,555 líneas no vacías del `<script>` original
  están, sin cambios, en los 13 archivos (además de su encabezado); el CSS, igual línea por línea
- `npx -y @fission-ai/openspec@1.4.1 validate organizar-codigo --strict`
- Revisión de enlaces relativos de todos los `.md` (script propio fuera del repo)

Los datos: el orquestador copia la carpeta de datos a un temporal y lo borra al terminar; la carpeta original no se
modifica. No se usó Postgres (`grupos` e `ingles-pro` quedan `OMIT`, igual que en la base).

## Resultados de pruebas

### Deno
- Antes: 462 pasaron, 0 fallaron, 6 omitidas (las de `DATA_DIR`); check y lint en verde (91 archivos).
- Después (con el merge de main): 462 / 0 / 6; check y lint en verde.

### E2E completa: base contra final (pasos PASS/FAIL)

| Prueba | Base (`eae63e5`) | Final (rama) | Repetida sola |
|---|---|---|---|
| 12 de Inglés, login, portal, login-despues | PASS | PASS | — |
| juegos | FAIL 18/1 (timeout de `.result .score`) | PASS 31/0 | base: PASS 31/0 |
| juegos-tablero | FAIL 39/1 (dominó: 7 fichas) | PASS 40/0 | base: PASS 40/0 |
| peticiones | FAIL 10/1 (41 peticiones ≤ 40) | FAIL 10/1 (41 ≤ 40) | base: PASS; final: PASS 11/0 |
| una-sala | PASS 17/0 | FAIL 16/1 (un paso distinto entre jugadores) | final: PASS 17/0 |
| plataformas | PASS 31/0 | FAIL 74/1 («camina con el teclado») | final: PASS 75/0 (ver abajo) |
| karts | PASS 126/0 | PASS 158/0 | — |
| las otras 31 | PASS | PASS | — |
| **Total** | **47 PASS, 3 FAIL, 2 OMIT** | **47 PASS, 3 FAIL, 2 OMIT** | todas las fallas pasan solas |

Ninguna falla es nueva en el sentido de esta fase: todas pasan al repetirse solas y ya estaban en la lista de
intermitentes (`una-sala`/`una-robo`, `peticiones` por conteo de sondeo) o dependen del tiempo real del navegador.

`plataformas` y `karts` cambiaron con personajes-xalli (más pasos: 75 y 158) y sus nuevas aserciones de tiempo
(«camina con el teclado», «suelta su partícula», «60 cuadros por segundo», «acelera solo tras ¡YA!») son sensibles a
la carga de la máquina:
- En la rama (con `canalProgreso`): plataformas 5 de 8 corridas en verde; karts 2 de 5.
- **Control sobre `origin/main` sin este cambio**: plataformas 2 de 3 (falla «Xochiquetzal suelta su partícula»);
  karts 0 de 3 («acelera solo tras ¡YA!», «60 cuadros por segundo», «acelerar avanza»).
- Las aserciones que fallan miden movimiento y cuadros por segundo dentro del iframe; no pasan por `canalProgreso`
  (que solo responde `inicio` y `guardado`). La intermitencia es previa a este cambio.

### E2E por paso (juegos + la familia movida)
Todas en verde en cada commit, salvo una vez `plataformas` («camina con el teclado») en el paso de `canalProgreso`,
que pasó al repetirse (3 de 3 junto con `juegos` y `dragon-run`).

| Commit | Pruebas | Resultado |
|---|---|---|
| CSS → `juegos.css` | juegos, juegos-tablero | 2/2 PASS |
| `nucleo.js` | juegos, juegos-recarga | 2/2 PASS |
| `menu.js` | juegos, nick, avatar-foto | 3/3 PASS |
| `ranking.js` | juegos, ranking-juegos | 2/2 PASS |
| `admin.js` | juegos, jugadores | 2/2 PASS |
| `individuales.js` | juegos, juegos-ingles, fusion | 3/3 PASS |
| `arcade.js` | juegos, dragon-run, plataformas | 3/3 PASS |
| `mente.js` | juegos, sudoku, ajedrez | 3/3 PASS |
| `clasicos.js` | juegos, clasicos, basta-rondas | 3/3 PASS |
| `naipes.js` | juegos, poker, cartas-espanolas | 3/3 PASS |
| `salas.js` | juegos, partidas, enlace-sala, revancha | 4/4 PASS |
| `salas-mesa.js` | juegos, loteria-sala, una-sala | 3/3 PASS |
| `musica.js` | juegos | 1/1 PASS |
| `arranque.js` | juegos, ajustes-salas | 2/2 PASS |
| `canalProgreso` en `jugarArcade` | juegos, dragon-run, plataformas, karts, futbolito, billar | 5/6 (plataformas intermitente, ver arriba) |

## Verificación manual (Step 6) — el agente la ejecutó
Servidor Deno local (puerto 8996, copia temporal de datos, borrada al terminar) y estáticos (8976); Playwright:

| Caso | Resultado |
|---|---|
| 390 px: menú completo (`JUEGOS` 39 = 39 tarjetas, `CATEGORIAS` 5 = 5 secciones) | PASS |
| 390 px: sin scroll horizontal, sin errores de consola ni peticiones fallidas; 14 archivos de `juegos/app/` con 200 | PASS |
| Escritorio (1280 px): lo mismo | PASS |
| Servidor caído (`?api=` a un puerto sin servidor): la página muestra su pantalla de entrada, sin errores de script | PASS |

## Verificación de estado
- Antes: sin datos de prueba en Postgres (no se usó `--pg`); la carpeta de datos original intacta.
- Después: igual. Las corridas trabajan sobre copias temporales que el orquestador borra.
- Estado restaurado: Sí — no hubo nada que restaurar.

## Documentación y enlaces
- Enlaces relativos rotos: 8 antes (en `ai-specs/skills/writing-skills/anthropic-best-practices.md`), 0 después
  (588 archivos `.md` revisados tras el merge).
- `openspec validate organizar-codigo --strict`: válido.

## Resultado
- Estado Step 5: PASS (mismo resultado que la línea base, sin fallas nuevas atribuibles al cambio).
- Bloqueos: ninguno. Pendiente fuera de este cambio: estabilizar las aserciones de tiempo de `plataformas` y `karts`
  (personajes-xalli) y el umbral de `peticiones`.
