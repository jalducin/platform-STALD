# Reporte Step 5 — Pruebas y verificación de estado

- Fecha: 2026-10-12
- Cambio: calidad-sonar
- Agente: Claude Code (Opus 5.5), con subagentes para los bloques e y f por grupos de archivos

## Comandos ejecutados
- `cd tests/calidad && npm install && npm run calidad` (y `node calidad.mjs --json …` antes y después)
- `npx -y deno test -A server/`, `npx -y deno check server/main.ts`, `npx -y deno lint server/`
- E2E completas sobre una copia fija de cada commit (para poder seguir editando):
  `CHROME=…/chrome.exe bash tests/e2e/correr.sh --datos <copia de datos de prueba> --puerto-api 9199 --puerto-web 9209`,
  tras el bloque a (`cc387c4`), tras los bloques a–g de la fase 1 (`bf8d319`) y al final, con la fase 2 (`b38e223`)
- Prueba nueva en rojo y luego en verde: `correr.sh … ajustes-salas` sobre `72c6506` (falla) y en la corrida final (pasa)
- Repetición de inestables: `correr.sh … peticiones` sobre la rama y sobre `main`

## Medición de calidad (antes → después)

«Antes» = `origin/main` en `3570583` (ya con el sprint 22, #181). «Después» = `b38e223`. Medido con `tests/calidad`
(mismas reglas que SonarLint; ver `design.md` §1). En el panel de VS Code del profe había 371 avisos, casi todos de
copias viejas de worktrees; la medición recorre todo el código vivo, por eso el «antes» es mayor.

| Regla | Antes | Después | De ellos en archivos del sprint 22 | Revisados con NOSONAR |
|---|---:|---:|---:|---:|
| S3358 | 473 | 0 | 0 | 0 |
| S3776 | 192 | 171 | 22 | 0 |
| S2681 | 172 | 0 | 0 | 0 |
| S9382 | 144 | 143 | 1 | 0 |
| S2245 | 96 | 0 | 0 | 96 |
| S6661 | 65 | 0 | 0 | 1 |
| S7781 | 50 | 0 | 0 | 1 |
| S7723 | 39 | 0 | 0 | 0 |
| S7767 | 34 | 0 | 0 | 26 |
| Web:S6819 | 27 | 2 | 0 | 0 |
| S2486 | 19 | 0 | 0 | 0 |
| S7784 | 10 | 0 | 0 | 3 |
| S1788 | 8 | 0 | 0 | 0 |
| S3735 | 6 | 0 | 0 | 0 |
| S3923 | 4 | 0 | 0 | 0 |
| S7773 | 4 | 0 | 0 | 0 |
| css:S7924 | 3 | 0 | 0 | 0 |
| S1854 | 3 | 0 | 0 | 0 |
| css:S4666 | 2 | 0 | 0 | 0 |
| S6653 | 2 | 0 | 0 | 0 |
| css:S1874 | 1 | 0 | 0 | 0 |
| S1135 | 1 | 0 | 0 | 0 |
| **Total** | **1355** | **316** | **23** | **127** |

Lo que queda, con su motivo (detalle en `design.md`):
- **S3776 (171):** funciones con complejidad entre 16 y 40; ninguna pasa de 40. Partirlas no mejora la lectura y
  arriesga el comportamiento.
- **S9382 (143):** `await` en bucles a propósito: reintentos de escritura con `sha`, paginación de Notion, validación
  en orden, pruebas en secuencia y la animación del Simón.
- **Web:S6819 (2):** el control de fuerza de Billar (`role="slider"`) y el minimapa de Golf (`<canvas role="button">`):
  cambiarlos altera el aspecto y el manejo táctil.
- **Revisados con NOSONAR (127):** `Math.random` de juegos (96), aritmética entera de 32 bits del generador con
  semilla, hash y bucle por píxel (26), copias JSON deterministas (3) y `comun/auth.js` en ES5 (3).

### Por archivo

| Archivo | Antes | Después |
|---|---:|---:|
| `juegos/plataformas.html` | 106 | 17 |
| `juegos/karts.html` | 93 | 13 |
| `juegos/app/salas-mesa.js` | 69 | 12 |
| `juegos/tablero-ui.js` (sprint 22) | 63 | 6 |
| `juegos/clasicos-rapidos-ui.js` | 56 | 4 |
| `juegos/dragon-run.html` | 55 | 2 |
| `juegos/app/naipes.js` | 46 | 3 |
| `juegos/app/salas.js` (sprint 22) | 43 | 4 |
| `juegos/blackjack.js` (sprint 22) | 36 | 2 |
| `juegos/golf.html` | 36 | 8 |
| `ingles/reproductor.js` | 35 | 2 |
| `juegos/app/clasicos.js` | 31 | 2 |
| `juegos/futbolito.html` | 29 | 4 |
| `juegos/billar.html` | 26 | 4 |
| `juegos/app/individuales.js` (sprint 22) | 24 | 4 |
| `juegos/clasicos-rapidos.js` | 23 | 5 |
| `juegos/tablero.js` | 21 | 3 |
| `server/juegos.ts` | 20 | 19 |
| `juegos/cartas.js` | 19 | 4 |
| `juegos/memo-sopa-sala.js` | 19 | 2 |
| `juegos/mesa-ui.js` | 19 | 1 |
| `ingles/comun.js` | 18 | 1 |
| `server/clasicos_rapidos_test.ts` | 17 | 16 |
| `server/salas_grandes_test.ts` | 17 | 9 |
| `juegos/ajedrez.js` | 16 | 4 |
| `juegos/app/mente.js` | 16 | 2 |
| `server/futbolito_billar_test.ts` | 15 | 15 |
| `juegos/app/admin.js` | 13 | 1 |
| `juegos/app/menu.js` (sprint 22) | 13 | 2 |
| `juegos/linea-tiempo.js` | 13 | 1 |
| `juegos/personajes.js` | 13 | 3 |
| `server/actividades.ts` | 13 | 13 |
| `server/salas.ts` | 13 | 11 |
| `server/tablero_test.ts` | 13 | 12 |
| `juegos/billar-motor.js` | 12 | 4 |
| `juegos/golf-motor.js` | 12 | 2 |
| `server/salas_grandes.ts` | 11 | 1 |
| `juegos/app/nucleo.js` | 10 | 0 |
| `juegos/bingo.js` | 10 | 1 |
| `server/motor.ts` | 10 | 3 |
| `ingles/app.js` | 9 | 2 |
| `secundaria.html` | 9 | 0 |
| `ingles/alumno.js` | 8 | 1 |
| `ingles/presentacion.js` | 8 | 1 |
| `juegos/dibuja.js` | 8 | 1 |
| `juegos/mando.js` | 8 | 1 |
| `server/poker_sala_test.ts` | 8 | 7 |
| `juegos/basta.js` | 7 | 1 |
| `juegos/fisica.js` | 7 | 1 |
| `server/ingles_gramatica_test.ts` | 7 | 7 |
| `comun/auth.js` | 6 | 0 |
| `ingles/admin.js` | 6 | 0 |
| `ingles/tablero.js` | 6 | 1 |
| `juegos/app/arcade.js` (sprint 22) | 6 | 2 |
| `juegos/ingles-gramatica.js` | 6 | 1 |
| `juegos/app/arranque.js` (sprint 22) | 5 | 3 |
| `juegos/app/musica.js` | 5 | 1 |
| `server/cartas_test.ts` | 5 | 2 |
| `server/progreso.ts` | 5 | 5 |
| `index.html` | 4 | 0 |
| `juegos/app/ranking.js` (sprint 22) | 4 | 0 |
| `juegos/dragon-misiones.js` | 4 | 1 |
| `juegos/futbolito-motor.js` | 4 | 3 |
| `server/alumnos.ts` | 4 | 2 |
| `server/contrasena_test.ts` | 4 | 4 |
| `server/golf_test.ts` | 4 | 4 |
| `server/semana.ts` | 4 | 3 |
| `juegos/app/juegos.css` (sprint 22) | 3 | 0 |
| `server/contrasena.ts` | 3 | 2 |
| `server/futbolito_equipos_test.ts` | 3 | 3 |
| `server/linea_tiempo_test.ts` | 3 | 1 |
| `server/main.ts` | 3 | 2 |
| `server/progreso_test.ts` | 3 | 2 |
| `ingles/profe.js` | 2 | 1 |
| `juegos/arcade.js` | 2 | 0 |
| `server/ajedrez_test.ts` | 2 | 0 |
| `server/basta_una_test.ts` | 2 | 2 |
| `server/cache_main_test.ts` | 2 | 2 |
| `server/clasicos_rapidos_motor_test.ts` | 2 | 0 |
| `server/fusion_test.ts` | 2 | 2 |
| `server/golf_motor_test.ts` | 2 | 0 |
| `server/grupos.ts` | 2 | 1 |
| `server/http_cache_test.ts` | 2 | 2 |
| `server/http_cache.ts` | 2 | 0 |
| `server/juegos_test.ts` | 2 | 2 |
| `server/jugadores.ts` | 2 | 1 |
| `server/ranking_juegos_test.ts` | 2 | 2 |
| `server/salas_test.ts` | 2 | 2 |
| `server/salud.ts` | 2 | 0 |
| `server/secundaria_test.ts` | 2 | 2 |
| `server/store_test.ts` | 2 | 1 |
| `server/test_postgrest.ts` | 2 | 1 |
| `juegos/mesas.js` | 1 | 0 |
| `juegos/una.js` | 1 | 1 |
| `server/auth.ts` | 1 | 1 |
| `server/carreras_test.ts` | 1 | 1 |
| `server/clasicos_rapidos.ts` | 1 | 1 |
| `server/dragon_misiones_test.ts` | 1 | 1 |
| `server/fisica_test.ts` | 1 | 0 |
| `server/futbolito.ts` | 1 | 0 |
| `server/naval_test.ts` | 1 | 1 |
| `server/naval.ts` | 1 | 1 |
| `server/registro_test.ts` | 1 | 1 |
| `server/registro.ts` | 1 | 0 |
| `server/resumen_test.ts` | 1 | 1 |
| `server/store.ts` | 1 | 0 |

## Resultados de pruebas
- Deno: 501 pasaron, 0 fallaron, 6 omitidas (las de `DATA_DIR`) en cada bloque y al final; `deno check` y `deno lint`
  sin errores (95 archivos).
- E2E tras el bloque a (`cc387c4`): 47 PASS, 4 FAIL, 2 OMIT. Las 4 son inestables conocidas o de la misma familia
  (partícula de Xalli/Itzae en Plataformas, Karts «acelerar avanza», Futbolito 320×640, peticiones) y pasaron en la
  corrida siguiente.
- E2E tras la fase 1 completa (`bf8d319`): 49 PASS, 2 FAIL (Futbolito 2v2 «Angel tira cuando la pelota llega» y
  peticiones, ambas inestables conocidas), 2 OMIT.
- **E2E final con la fase 2 (`b38e223`, 52 pruebas, incluida `categorias` del sprint 22): 51 PASS, 1 FAIL
  (peticiones, inestable conocida: 41 peticiones con tope de 40; también falla en `main`), 2 OMIT.** `peticiones`
  sola sobre la rama: PASS (11/11).
- OMIT: `grupos` e `ingles-pro` requieren `--pg` (Postgres de prueba con la llave de servicio); no se corrieron porque
  este cambio no toca Postgres ni lee llaves o `.env`.
- Prueba nueva «naval: sin rival da su aviso propio» (`e2e-ajustes-salas`): FAIL antes del arreglo («👥 Faltan
  jugadores…»), PASS después.
- Además, los subagentes compararon versión vieja contra nueva en `vm` con partidas simuladas con semilla (motores,
  mesa, ¡Una!, póker, brisca, conquián, lotería, clásicos rápidos, salas de tablero, blackjack, preguntas de sala):
  0 diferencias en estado y HTML; el arnés sí detectó las mutaciones de control.

## Verificación manual — CLI (EL AGENTE EJECUTÓ)
- `npm run calidad`: resumen por regla y por archivo, código 0.
- `node calidad.mjs --regla S0000`: sin avisos, código 0.
- `node calidad.mjs --detalle --regla S2245 --archivo juegos/karts.html`: 0 avisos, 23 revisados con NOSONAR.
- `node calidad.mjs --detalle --contexto 1 --regla Web:S6819`: los 2 que quedan, con su código alrededor.
- Diagnósticos reales de SonarLint en VS Code sobre archivos editados (p. ej. `juegos/app/juegos.css` sin avisos tras
  el cambio; `billar.html` con los mismos Web:S6819 que la medición propia).

## Verificación de estado
- Antes: copia de datos de prueba en el scratchpad; `correr.sh` la vuelve a copiar a una carpeta temporal.
- Después: `correr.sh` borra su copia al terminar; la carpeta de datos original no se modifica. Sin `--pg`: no se tocó
  ninguna tabla `stald_*` ni `stald_test_*`.
- Estado restaurado: Sí — nada que restaurar fuera de las copias temporales.

## Pendientes
- 2 Web:S6819 (slider de Billar y minimapa de Golf) y 171 S3776 de 16–40, por decisión (ver arriba).
- Posibles errores vistos y no corregidos (ya estaban; sin prueba que los cubra): `server/salas.ts` responde
  `{ ok: true }` al unirse aunque `guardarJugador` falle tras 3 intentos, y al empezar no revisa el resultado de
  `store.put`; `clicNaval` de `tablero-ui.js` truena si la respuesta llega sin `jugadas`; `genCalculo` no termina con
  `n = NaN`.
- Unificar el generador mulberry32 copiado en 7 archivos (cambio propio).

## Resultado
- Estado Step 5: PASS
- Bloqueos: ninguno
