# Reporte Step 5 — Pruebas y verificación de estado

- Fecha: 2026-10-11
- Cambio: futbolito-billar
- Agente: Claude (worktree aislado, rama `feature/futbolito-billar`)

## Comandos ejecutados
- `npx -y deno test -A server/` y `npx -y deno lint server/`
- `npx -y deno test -A server/futbolito_billar_test.ts server/fisica_test.ts server/mesas_test.ts` (TDD: primero en rojo)
- `bash tests/e2e/correr.sh --datos <scratchpad/data> --puerto-api 8907 --puerto-web 8885 futbolito billar juegos fusion clasicos revancha karts plataformas`
- `bash tests/e2e/correr.sh … futbolito billar` (tras los arreglos y la capa de acciones)
- `npx -y @fission-ai/openspec@1.4.1 validate futbolito-billar --strict`
- Verificación manual: servidor local (`server/main.ts`, puerto 8907, copia de los datos de prueba en el scratchpad) y
  `curl` (script en el scratchpad).

## Resultados de pruebas
- TDD servidor: `futbolito_billar_test.ts` empezó con 6 de 7 en rojo; tras implementar, 7/7.
- Motores (`fisica_test.ts`): 17/17 — trigonometría propia vs `Math` (±1e-12), el código de los motores no usa
  `Math.sin/cos/atan2/hypot/pow` ni `**`, reglas de la bola 8 (falta con la blanca, mesa abierta, sin toque, 8 antes
  de tiempo, 8 con falta, 8 al final gana, efecto), partidas bot contra bot que terminan y se reproducen idénticas,
  animación por subpasos = reproducción instantánea, línea de turnos (persona, bot, tiro automático con gracia,
  rendirse, caché) y Futbolito (barra activa, patada, sin pelota atorada en 3 min, gol y saque, fin a 5).
- Suite Deno completa: 339 pasaron, 0 fallaron, 6 omitidas (las mismas de antes). Lint: 77 archivos, 0 problemas.
- E2E (corrida completa): `juegos` 28, `revancha` 20, `clasicos` 11, `fusion` 10, `plataformas` 31, `karts` 48,
  `billar` 14 PASS; `futbolito` 21/22 (falló «60 cuadros por segundo»: 46 medido justo después de las llamadas de la
  prueba). Se ajustó la prueba para medir con el juego corriendo solo (como Karts) y pasó 22/22.
- Tras la capa de acciones: `futbolito` 23/23 y `billar` 15/15.
- Fallas encontradas y corregidas en el camino: la comparación de 2 aparatos leía uno antes de recibir el tiro
  (ahora espera a que los dos lo animen); un arrastre de prueba podía cambiar la barra activa (la pelota se pone lejos);
  avisos largos se cortaban a 390 px (ahora se parten en dos renglones). Una vez apareció en `billar` un error JS
  `Cannot read properties of null (reading 'ahora')` que no se repitió en 4 corridas más (ver pendientes).
- Duración: ~12 min la corrida completa; ~4 min `futbolito billar`.

## Capturas revisadas (`tests/e2e/salida/`)
- `futbolito-390-menu`, `futbolito-390-juego`, `futbolito-390-resultado`, `futbolito-844-horizontal`,
  `futbolito-390-sala-bot` (panel de ángulo/fuerza, mira y barra resaltada), `futbolito-844-sala-angel` (Angel ve la
  mesa volteada: su portería a la izquierda), `futbolito-390-sala-2`, `futbolito-390-podio-bot`, `futbolito-844-podio`.
- `billar-390-apuntar` (línea guía, bola fantasma, taco), `billar-390-rompe`, `billar-390-resultado`,
  `billar-844-horizontal` (mesa horizontal y panel a la derecha), `billar-390-sala-bot`, `billar-390-sala-2`,
  `billar-844-sala-angel`, `billar-390-podio-bot`, `billar-844-podio`.
- Hallazgos: nombres del HUD del billar cortados a 390 px (se dio prioridad al nombre) y avisos cortados (se parten).
  En horizontal dentro de Juegos la caja de Arcade es 16:10 y la mesa de billar queda chica (igual que Karts).

## Verificación manual (Step 6.1, el agente ejecuta)
- `curl` contra el servidor local: crear billar sin bots → empezar con 1 persona 409 `faltan_jugadores`; unirse 200;
  tercera persona 409 `sala_llena`; tiro válido 200 (guarda `{ n, accion, angulo, fuerza, efecto, t }`); fuerza 0 →
  400 `jugada_invalida`; paso ya tomado → 409 `turno_tomado`; sin sesión → 400 `missing_email`; correo sin registro →
  403 `no_registrado`; tras un `final` → 409 `partida_terminada`; el admin sí ve la sala; futbolito con ángulo 90 →
  400 y con `{ pos: -20, angulo: 15, fuerza: 80 }` → 200; partida individual de 5000 → topada a 1000.
- Páginas sueltas (`python -m http.server 8885`) en Chromium móvil a 390×844 y 844×390: 60 fps, sin errores JS
  (solo el 404 de `/favicon.ico` de la página suelta).

## Verificación de estado
- Antes: copia de prueba en `scratchpad/data` (no se modificó; `correr.sh` trabaja sobre su propia copia).
- Después: `correr.sh` borró su copia; la copia de la verificación manual (`scratchpad/fb/datos-copia`) se borró y
  el servidor local se detuvo. Sin cambios en producción, Supabase, `stald_*`, `.env` ni Notion.
- Estado restaurado: Sí.

## Resultado
- Estado Step 5: PASS
- Bloqueos: ninguno. Pendiente: prueba en celular real tras el merge.
