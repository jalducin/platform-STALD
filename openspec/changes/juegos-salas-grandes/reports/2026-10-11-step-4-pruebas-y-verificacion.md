# Reporte Step 4 — Pruebas y verificación de estado

- Fecha: 2026-10-11
- Cambio: juegos-salas-grandes
- Agente: Claude (worktree aislado, rama `feature/juegos-salas-grandes`)

## Comandos ejecutados
- `npx -y deno test -A server/` · `npx -y deno lint server/` · `npx -y deno check server/main.ts`
- `bash tests/e2e/correr.sh --datos <copia de prueba> --puerto-api 8947 --puerto-web 8925 salas-grandes juegos fusion clasicos revancha ranking-juegos partidas loteria-sala poker peticiones ajustes-salas`
- Para descartar regresiones: `loteria-sala peticiones` en un worktree temporal y limpio de `origin/main` (#167).
- Verificación manual (Step 5): script de `curl` contra un servidor local en el puerto 8947 con otra copia de los datos.
- Se integró `origin/main` dos veces: mesas comunes (#162, `mesas-con-bots`) y Dragon Run en Arcade (#166/#167).

## Resultados de pruebas
- Dirigidas (`server/salas_grandes_test.ts`): 18 pasaron, 0 fallaron (Bingo: canto y cartón deterministas con paridad
  contra `juegos/bingo.js`, figuras, bingo falso o verdadero; Blackjack: motor, pagos, banca hasta 17, montos y mesa;
  Dibuja: mínimo y cupo, la palabra no se filtra en GET ni Realtime, trazo y sus límites, adivinar, calendario;
  Memorama y Sopa: criterio, resultado válido, imposible y repetido; catálogo y revancha).
  - Una corrida intermedia falló una vez en «la palabra solo la recibe quien dibuja» y no se reprodujo en 55 corridas
    posteriores (40 del archivo filtrado y 15 completas). Queda anotado como posible inestabilidad.
- Suite del servidor (tras el último merge): 342 pasaron, 0 fallaron, 6 omitidas (las de siempre). `lint`: 78 archivos
  sin avisos. `check`: OK.
- Prueba existente actualizada: `server/salas_test.ts` usaba `en-memorama` como «juego no permitido en sala»; ahora
  usa `mente-simon` (Memorama ya va en partida).
- E2E (fase `base`): 11 corridas, 9 PASS, 2 FAIL:
  - nueva `salas-grandes`: 63/63 pasos (Bingo con 3 personas y 2 bots y bingo falso 409; Blackjack individual y en
    sala con la mesa «1 persona + 2 bots» → «2 personas + 1 bot»; Dibuja y adivina con 3 personas y 3 turnos;
    Memorama y Sopa en sala con bots; práctica de Dibuja y Bingo individual);
  - regresión: `juegos` 28, `partidas` 15, `revancha` 20, `clasicos` 10, `fusion` 10, `poker` 27, `ajustes-salas` 8,
    `ranking-juegos` 50 pasos;
  - `loteria-sala` (1 de 10: «pregunta en inglés con traducción», ahora sale el selector de tema) y `peticiones`
    (1 de 11: 41 peticiones en vez de ≤ 40 en la sala de ¡Una!) **fallan igual en `origin/main` limpio**: no son de este
    cambio.
  - Conteo del menú en `e2e-juegos`, `e2e-clasicos` y `e2e-fusion`: 27 juegos en 6 categorías (Clásicos 9).
- Duración: ~25 min la corrida de 11 pruebas (Bingo usa el canto real de 4.5 s).

## Capturas revisadas (tests/e2e/salida/, 390 px)
- `salas-grandes-390-bingo.png`, `-bingo-podio.png`, `-bingo-individual.png`, `-blackjack-apuesta.png`,
  `-blackjack-mesa.png`, `-blackjack-sala.png`, `-blackjack-podio.png`, `-dibuja-dibujando.png`,
  `-dibuja-adivinando.png`, `-dibuja-revelada.png`, `-dibuja-podio.png`, `-dibuja-practica.png`,
  `-memorama-sala.png`, `-memorama-podio.png`, `-sopa-sala.png`, `-sopa-podio.png`.
- Hallazgos corregidos: la bola del Bingo giraba al entrar (ahora solo cae), la casilla libre tapaba la estrella, los
  botones de voz se partían en dos renglones, los lugares vacíos de tus cartas en Blackjack no se veían sobre fondo
  claro, la lista de intentos de Dibuja empezaba vacía sin aviso y el título del podio de Memorama/Sopa era demasiado
  largo (el criterio pasó a la tabla de resultados); texto inclusivo «¡Adivina antes que nadie!».

## Verificación manual (curl, servidor local 8947)
- Crear salas: `bingo` (figura `linea` por omisión), `blackjack`, `dibuja` (`bots: false` forzado), `en-memorama`
  (`gana: tiempo`) y `mente-sopa` → 200. Figura `estrella` → 400 `figura_invalida`; `gana: suerte` → 400
  `criterio_invalido`; sin sesión → 400 `missing_email`; correo sin registro → 403 `no_registrado`.
- Bingo al primer número → 409 `bingo_falso`.
- Blackjack: `apostar` con `monto: 7` → 400 `jugada_invalida`; con 25 → 200.
- Dibuja: empezar con 2 → 409 `faltan_jugadores` (`minimo: 3`); con 3, el GET de quien dibuja trae
  `palabra/es/emoji` y el de quien adivina solo `letras` y `forma`; `secreto` no aparece; trazo de quien no dibuja →
  409 `no_dibujas`; trazo de 65 puntos → 400 `trazo_invalido`; respuesta equivocada → 200 `correcta: false`.
- Sopa: final con `ms` fuera del límite → 400 `resultado_invalido`; avance de 1 palabra al primer segundo → 200.
- `/juegos/yo`: `bingo` y `blackjack` (clásicos) y `dibuja` (inglés), tope 1000.

## Verificación de estado
- Antes: copia de datos de prueba en una carpeta temporal (la original del scratchpad no se tocó).
- Después: `correr.sh` borra su copia al terminar; la copia del `curl` se borró a mano y el servidor se detuvo (puerto
  8947 libre). No se tocó producción, Supabase, tablas `stald_*`, `.env` ni Notion.
- Estado restaurado: Sí.

## Resultado
- Estado Step 4: PASS (las 2 fallas de regresión existen igual en `origin/main` y no las causa este cambio).
- Bloqueos: ninguno.
