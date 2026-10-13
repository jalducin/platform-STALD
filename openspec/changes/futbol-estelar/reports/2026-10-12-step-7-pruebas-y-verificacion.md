# Reporte Step 7 — Pruebas y verificación de estado

- Fecha: 2026-10-12
- Cambio: futbol-estelar
- Agente: Claude (sprint 26)

## Comandos ejecutados
- TDD: `npx -y deno test -A server/futbol_motor_test.ts` antes de escribir el motor (falla: el módulo no existía) y
  después en verde; `server/futbol_liga_test.ts` y `server/futbol_test.ts` escritas antes de `futbol-liga.js` y de la
  validación del avance.
- `npx -y deno run -A herramientas/generar-futbol.ts` (universo → `juegos/datos/futbol.json`, 71 KB).
- `npx -y deno test -A server/` · `npx -y deno check server/main.ts` · `npx -y deno lint server/` (lo que corre CI).
- `cd tests/calidad && npm run calidad` en la rama y en una copia limpia de `origin/main`.
- `CHROME=… bash tests/e2e/correr.sh --datos <scratchpad/data> --puerto-api 9471 --puerto-web 9481 futbol juegos categorias mando karts billar golf futbolito emocion portal revancha`
  (los puertos 9279/9289 pedidos estaban ocupados) y la suite completa sin nombres.
- `npx -y @fission-ai/openspec@1.4.1 validate futbol-estelar --strict`.

## Resultados de pruebas
- Deno (dirigidas): motor 18/18, liga 13/13, servidor 6/6. Suite `server/`: 558 pasaron, 0 fallaron, 6 ignoradas
  (tras el merge de `origin/main` con emoción sonora). `deno check` y `deno lint server/` sin errores.
- Partidos IA contra IA (diagnóstico con semillas): 2–6 tiros por partido de 2 min, 13–31 pases por equipo, goles
  0–3; Difícil le gana a Fácil en las 6 semillas probadas (prueba con 4 semillas en verde).
- E2E `futbol`: 52/52 (dos corridas seguidas) — catálogo sin Futbolito, 5 modos, toques reales (saque con A, joystick,
  joystick + A, joystick + B con barra de potencia, textos de defensa), gol, final con ⭐, ranking, avance en el
  servidor, mando clásico recordado con toque real, distribución a 320×640 y 844×390, teclado (J, →, K), control
  físico simulado, dos controles locales (cada uno mueve solo a su equipo), torneo de 4 hasta el campeón, clasificatoria
  (mejor de la semana guardado), carrera creada, simulada, jugada y recuperada tras recargar, y emoción sonora
  (`Emocion.eventos()`: silbato, gol, victoria, intensidad en un final cerrado, podio y calma).
- Lote pedido tras el merge: `juegos` 31, `categorias` 49, `mando` 64, `karts` 158, `billar` 33, `golf` 29,
  `futbolito` 55, `emocion` 45, `revancha` 20 y `portal` 16 — todas PASS (las fallas sueltas de `portal`
  «Inglés entra sin volver a pedir el correo», `revancha` y `karts` «acelera solo tras ¡YA!» de la primera suite
  completa no tocan este cambio y pasaron al repetirlas; `futbolito` 320×640 también pasó al repetir).
- Suite completa (antes del merge de 24b): 53 corridas, 50 PASS, 3 FAIL (las tres de arriba, intermitentes), 2
  omitidas (`grupos` e `ingles-pro` requieren `--pg`). `peticiones` pasó en esta corrida.
- Calidad: `origin/main` 316 avisos → rama 316 (0 nuevos). +2 revisados con `NOSONAR` (la aritmética de 32 bits del
  generador con semilla de `juegos/futbol-motor.js`, como en `juegos/arcade.js`). Los archivos nuevos
  (`futbol-motor.js`, `futbol-liga.js`, `futbol-vista.js`, `futbol.html`) quedan en 0 avisos.
- Duración: suite completa ~80 min; `futbol` ~4 min.

## Rendimiento (verificación manual, el agente ejecuta)
- CPU ×4 (`Emulation.setCPUThrottlingRate`) dentro de `juegos.html`: 390×844 → 60 fps; 844×390 → 60 fps. Sin CPU
  limitada: 60 fps a 390×844, 844×390 y 1100×650 (página suelta).

## Capturas revisadas (iteración)
- Primera vuelta: la banda cercana quedaba fuera de la pantalla en horizontal (la perspectiva agrandaba la cercana) →
  la cámara se aleja si el ancho de la cancha no cabe; jugadores muy chicos → se dibujan 1.3×; el número salía al
  revés al mirar a la izquierda → 16 cuadros (8 en espejo con el número al derecho); el aviso de girar tapaba el menú →
  solo en el partido, compacto y se va solo a los 6 s; marcador encimado con 🔊 ⏸ a 320 px → marcador compacto;
  opciones del editor sin acentos → nombres legibles.
- Final: `futbol-390-menu`, `futbol-390-partido`, `futbol-390-gol`, `futbol-390-resultado`, `futbol-390-mando`,
  `futbol-320x640-partido`, `futbol-844x390-partido`, `futbol-escritorio-partido`, `-local`, `-local-partido`,
  `-torneo`, `-torneo-final`, `-crear-club` y `-carrera` (en `tests/e2e/salida/`): cancha completa con franjas,
  líneas, porterías con red, tribuna y vallas inventadas; jugadores y jugadoras con número y sombra; radar; mandos
  completos sin tapar el marcador.

## Verificación de estado
- Antes: copia de prueba `scratchpad/data` (no se modifica: `correr.sh` trabaja sobre una copia temporal).
- Después: `correr.sh` borró su copia; el avance `juegos/progreso/futbol/*` y los puntos de prueba solo vivieron en esa
  copia. Sin cambios en `supabase/`, tablas `stald_*`, Notion ni `.env`. El worktree temporal de `origin/main` para
  comparar la calidad se borró.
- Estado restaurado: Sí.

## Resultado
- Estado Step 7: PASS
- Bloqueos: ninguno
