# Reporte Step 7 — Pruebas y verificación de estado

- Fecha: 2026-10-17
- Cambio: futbolito-arena
- Agente: Claude Code (sprint 36)

## Comandos ejecutados

- TDD: `npx -y deno test -A server/arena_motor_test.ts` antes del motor (falla de tipos por el módulo inexistente), y
  lo mismo con `server/arena_red_test.ts` y `server/arena_test.ts` antes de la red y del servidor.
- `npx -y deno test -A server/` · `npx -y deno lint server/` · `npx -y deno check server/main.ts`
- `cd tests/calidad && npm run calidad` (y `node calidad.mjs --archivo …` sobre los archivos compartidos con la versión
  de `origin/main` para comparar)
- `CHROME=… bash tests/e2e/correr.sh --datos <scratchpad>/data --puerto-api 9931 --puerto-web 9941 futbolito-arena futbol
  futbol-en-linea juegos categorias partidas emocion mando` (9911/9921 los ocupaba el agente del sprint 35)
- Huella del motor (4 partidos completos 1v1, 2v2, 3v3 y 1v2) antes y después del refactor de calidad: idéntica.
- curl contra un servidor local (puerto 9951, copia de datos en el scratchpad con las personas de ejemplo)

## Resultados de pruebas

- Dirigidas: `server/arena_motor_test.ts` 13/13, `server/arena_red_test.ts` 7/7, `server/arena_test.ts` 6/6,
  `server/mesas_test.ts` 3/3.
  - IA (8 semillas, 1 vs 1 a 3 goles): un jugador «de niña o niño» (corre al balón y aprieta A sin buscar el momento)
    le gana a Fácil 8 de 8; Difícil le gana a Fácil 8 de 8 (contra Medio y Difícil ese jugador de reflejos perfectos gana más de la mitad: la IA no hace trampa de velocidad).
  - Red 2 vs 2 con 120 ms, 8 % de pérdida y 20 % de desorden (y el reloj de las páginas distinto al del canal): mismo
    marcador y mismo final en los 4, un aviso de gol por gol, las embestidas de los invitados llegan al anfitrión;
    robot propio predicho: mediana 0.30 u y p90 1.33 u del autoritativo (la cola son choques que la predicción no
    simula); demás robots interpolados: p90 0.20 u. Fotos 14.9/s, entradas 14.3/s.
  - Red 3 vs 3 con 80 ms: 72.3 envíos por sala/s (≤ 80; Karts de 8 midió ≈ 80 contra el Supabase real sin pérdida),
    foto de 244 B al final (< 560 B en cualquier momento), p90 propio 0.64 u y demás 0.22 u. **Decisión: sí hay 3 vs 3.**
  - Foto 2 vs 2 < 420 B; entrada < 50 B; error de posición ≤ 0.025 u y de dirección ≤ 1/64 de vuelta.
- Suite del servidor: 677 pasaron, 0 fallaron, 6 omitidas (35 s). `deno lint` y `deno check` sin problemas.
- Calidad: los archivos nuevos (`juegos/arena-motor.js`, `juegos/arena-red.js`, `juegos/futbolito-arena.html`,
  `server/arena*.ts`) tienen 0 avisos. Los compartidos (`server/salas.ts`, `server/juegos.ts`, `juegos/mesas.js`,
  `juegos/app/*`) tienen exactamente los mismos avisos que en `origin/main`. Total del repo: 317.
- E2E: `futbolito-arena` 38/38, `futbol` 52/52, `juegos` 31/31, `categorias` 49/49, `partidas` 15/15, `emocion` 45/45,
  `mando` 64/64, `futbol-en-linea` 18/18. Con la máquina cargada por otros agentes (≈ 70 % de CPU, ~100 procesos de
  Chrome), `futbol-en-linea` falló una vez «22 jugadores cerca» (33 m) y pasó al repetirla sola; no se tocaron sus
  archivos. En `futbolito-arena`, «Espacio embiste» falló una vez porque cayó un gol de la IA justo antes (saque: nadie
  se mueve); la prueba ahora pone el partido en juego y reintenta.
- fps con CPU ×4: 60 a 390×844 (2 vs 2 normal) y 60 en escritorio 1280×800 (3 vs 3, arena grande), medidos en las
  corridas de la E2E.

## Verificación manual (curl, servidor local)

| Caso | Resultado |
| --- | --- |
| Crear 2v2 con bots | 200, opciones `{ formato: 2v2, arena: normal, goles: 5 }` |
| Crear 3v3 pidiendo arena normal | 200, `arena: grande` |
| Crear 4v4 | 400 `formato_invalido` |
| Angel y Laura piden el 🔥 Sol | 200 y 200 |
| Fernando pide el 🔥 Sol | 409 `equipo_lleno` |
| Equipo 5 / robot 9 | 400 `equipo_invalido` / 400 `robot_invalido` |
| Robot 2 | 200 `{ robot: 2 }` |
| Resultado antes de empezar | 409 `no_empezo` |
| Invitado intenta empezar | 403 `solo_host` |
| 9–0 a 3 goles / más largo que la sala | 400 `resultado_invalido` |
| Anfitriona 2–1 → Angel confirma | `anfitrion` → `confirmado`, puntos 400 (🌊) y 60 (🔥) |
| Persona fuera de la sala | 403 `no_en_sala` |
| Ranking de la sala mandando 999 | se guardan 400 (los del servidor) |
| Ranking contra la IA mandando 5000 | se guardan 1000 (tope del catálogo) |
| Admin sin sesión | 401 `inicia_sesion` (regla de siempre: el admin necesita sesión) |

## Capturas revisadas (tests/e2e/salida/)

`arena-390-menu.png`, `arena-390-controles.png` (joystick + ⚡ con recarga), `arena-390-gol.png`, `arena-390-fin.png`,
`arena-390-mando.png`, `arena-844-partido.png`, `arena-escritorio-3v3.png`, `arena-390-espera-2v2.png` /
`arena-844-espera-2v2.png` (equipos, «Cambiar de equipo» y color), `arena-390-sala-partido.png`,
`arena-844-gol-sala.png`, `arena-escritorio-sala.png`, `arena-390-desconexion.png`, `arena-390-podio.png` /
`arena-844-podio.png`, `arena-390-respaldo.png`. Iteraciones tras revisarlas: el aviso «Mejor con el celular de lado»
se oculta a los 5 s (tapaba la portería rival), los colores del robot van en su propio renglón y el marcador pone a tu
equipo a la izquierda, como tu portería.

## Verificación de estado

- Antes: copias de datos en el scratchpad (E2E y curl); ninguna tabla `stald_` involucrada (sin `--pg`).
- Después: las copias se descartan; el repo de datos original no se toca.
- Estado restaurado: Sí — servidores locales apagados (9931/9941 por `correr.sh`, 9951 y 9925 a mano).

## Resultado

- Estado Step 7: PASS
- Bloqueos: ninguno
