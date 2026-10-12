# Reporte Step 5 — Pruebas y verificación de estado

- Fecha: 2026-10-12
- Cambio: golf
- Agente: Claude (worktree aislado, rama `feature/golf`)

## Comandos ejecutados
- `npx -y deno test -A server/golf_test.ts` (TDD: primero en rojo) y `npx -y deno test -A server/golf_motor_test.ts`
- `npx -y deno test -A server/` y `npx -y deno lint server/`
- `CHROME=…/chromium-1228/chrome-win64/chrome.exe bash tests/e2e/correr.sh --datos <scratchpad/data> --puerto-api 9119 --puerto-web 9129 golf juegos billar mando`
  (el puerto 9029 pedido estaba ocupado por otro proceso `deno.exe` que no es de este cambio; no se tocó)
- `bash tests/e2e/correr.sh … fusion clasicos` (conteos del menú contra `JUEGOS.length`)
- `npx -y @fission-ai/openspec@1.4.1 validate golf --strict`
- Verificación manual: `scratchpad/golf/manual.sh` (servidor local `server/main.ts` en el puerto 9139 con una copia de
  los datos de prueba y `curl`) y `scratchpad/golf/reducido.js` (Playwright, `juegos/golf.html` suelto).

## Resultados de pruebas
- TDD servidor: `server/golf_test.ts` empezó con 7 de 7 en rojo; tras implementar `server/salas.ts`,
  `server/juegos.ts`, `server/progreso.ts` y `juegos/mesas.js`, 7/7 (más `mesas_test` y `progreso_test`: 19/19).
- Motor (`server/golf_motor_test.ts`): 20/20 — solo `+ − * /` y `Math.sqrt`; 9 hoyos con par 2,2,3,3,3,3,3,4,5 y todas
  las mecánicas; rebote; arena; agua con castigo; pendiente y rampa; portal; molino (abre/cierra y no atrapa);
  compuerta; captura lenta sí / rápida no; recogida a par + 4; turnos, cambio de hoyo y fin; rendirse; resultados,
  estrellas y puntos; puntos de sala; animación = reproducción; determinismo (120 tiros al azar, dos veces y con
  clones); cada hoyo terminado por el bot difícil sin recogerla (golpes 1 1 2 1 4 1 3 2 2); `hoyosSala`;
  `Fisica.linea` con `motorSala` (persona, tiro automático igual en dos cálculos, rendirse).
  - En el camino se corrigieron dos fallas que encontraron las pruebas: una rampa no hacía rodar la pelota quieta
    (la velocidad se ponía en cero en cada subpaso) y si todos se rendían no se cerraba la partida.
- Suite Deno completa: 489 pasaron, 0 fallaron, 6 omitidas (las mismas de antes). Lint: 93 archivos, 0 problemas.
- E2E: `golf` 29/29, `juegos` 31/31, `billar` 15/15, `mando` 64/64; `fusion` 10/10 y `clasicos` 13/13 (conteo del
  menú igual a `JUEGOS.length`, 40 juegos).
  - Primera corrida de `golf`: 26 PASS y 2 FAIL: (1) el ciclo de sala esperaba un marco que ya se había cambiado por el
    podio (se rehízo: se detiene al ver el podio y cuenta las comparaciones); (2) un error JS
    `Cannot read properties of null (reading 'ahora')` en la página, el mismo que el reporte de `futbolito-billar`
    vio una vez en Billar; no se repitió en las corridas siguientes (ver pendientes).
- Duración: ~6 min la corrida `golf juegos billar mando`; ~3 min `golf` sola.

## Capturas revisadas (`tests/e2e/salida/`)
- 390: `golf-390-resortera` (línea guía, liga, fuerza en número), `golf-390-hoyo` (resultado, estrellas, puntos),
  `golf-390-molino`, `golf-390-tarjeta` (9 hoyos, colores bajo/sobre par), `golf-390-practica`, `golf-390-mando`
  (mando debajo del juego, fuerza en el HUD), `golf-390-sala`, `golf-390-sala-tiro`, `golf-390-podio` (podio y
  tarjeta de la sala).
- 320: `golf-320-menu`, `golf-320-juego`. 844×390: `golf-844-horizontal` (hoyo acostado, panel a la derecha),
  `golf-844-sala-angel`, `golf-844-podio`.
- Arreglos tras revisarlas: el aviso del hoyo se partía en dos renglones (más corto y a 18 px); la pista «Jala hacia
  atrás y toca GOLPEAR» se cortaba a 320 px («👆 Jala y toca GOLPEAR»); las tarjetas de práctica partían «Par 2 ·
  mejor 2» (ahora en renglones); en horizontal dentro de Juegos la sala quedaba abajo de la pantalla (ahora se
  desplaza a la caja del juego, solo para golf); a 320×568 de alto se esconde la nota del panel para dar espacio al
  hoyo y el minimapa es más chico.

## Verificación manual (Step 6.1, el agente ejecuta)
- `curl` contra el servidor local: crear sala de golf pidiendo bots → `bots: false`; empezar con 1 persona → 409
  `faltan_jugadores` (`minimo: 2`); unirse y empezar → 200; jugada válida con un campo de más → se guarda
  `{ n, accion, angulo, fuerza, t }`; `fuerza: 0` y `angulo: 3600` → 400 `jugada_invalida`; paso tomado → 409
  `turno_tomado`; sin sesión → 400 `missing_email`; correo sin registro → 403 `no_registrado`; tras un `final` → 409
  `partida_terminada`; progreso válido → `v: 1` y se lee igual; hoyo `"10"` → 400 `progreso_invalido`; Angel ve su
  progreso vacío; partida individual de 5000 → 1000.
- `juegos/golf.html` suelto en Chromium móvil: 390×844 y 320×568 con `prefers-reduced-motion: reduce` (detectado) y
  844×390 sin él: 60 cuadros por segundo, sin errores JS, hoyo acostado en horizontal.

## Verificación de estado
- Antes: copia de prueba en `scratchpad/data` (no se modificó; `correr.sh` y `manual.sh` trabajan sobre sus copias).
- Después: `correr.sh` borró su copia; `manual.sh` borró `scratchpad/golf/datos-copia` y detuvo su servidor. Nunca se
  escribió en tablas `stald_` (sin `--pg`), Supabase, `.env` ni Notion.
- Estado restaurado: Sí.

## Resultado
- Estado Step 5: PASS
- Bloqueos: ninguno. Pendiente: el error JS intermitente `reading 'ahora'` (también visto antes en Billar) no se pudo
  reproducir para rastrearlo; la E2E del golf registra la pila si vuelve a aparecer.

## Integración sobre `juegos/app/` (2026-10-12, rama `integrar/golf`)

- Base: `origin/main` en `c0f28b5` (PR #176, `organizar-codigo`) + `git merge feature/golf` (`93c656d`).
- Único conflicto: `juegos.html`. Se dejó el shell de 72 líneas de `main` y los bloques `// golf` se movieron a
  `juegos/app/menu.js`, `salas.js`, `arcade.js` y `arranque.js` (detalle en `tasks.md` §8); `?v=2` en esos módulos y en
  `juegos/mesas.js`.
- Arreglo del error `reading 'ahora'`: la E2E lo volvió a ver una vez (pila: `pasoSala` ← `cuadro` en
  `juegos/golf.html`). Causa: el ciclo de paso fijo no revisaba `modo` después de cada paso. Con la guarda, `golf`
  pasó 29/29.

### Comandos
- `npx -y deno test -A server/` → 489 pasaron, 0 fallaron, 6 omitidas. `npx -y deno lint server/` → 93 archivos, 0
  problemas.
- `npx -y @fission-ai/openspec@1.4.1 validate --all --strict` → 26 de 26.
- `correr.sh … --puerto-api 9179 --puerto-web 9189 golf juegos billar mando fusion clasicos ranking-juegos`:
  `juegos` 31/31, `fusion` 10/10, `billar` 15/15, `ranking-juegos` 50/50, `mando` 64/64; `golf` 29/30 (el error de
  arriba, ya corregido: luego 29/29); `clasicos` 10/12 por «una: la partida termina y guarda» (inestable conocido,
  «una-robo»: falló dos veces y pasó en las dos corridas siguientes, 14/14 y 13/13; en `main` también pasó).
- Estado: `correr.sh` trabaja sobre una copia de `scratchpad/data` y la borra; sin escrituras en tablas `stald_`.
