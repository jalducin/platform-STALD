# Reporte Step 5 — Pruebas y verificación de estado

- Fecha: 2026-10-03
- Cambio: poker (Sprint 1 de juegos de cartas)
- Agente: Claude Code (Opus 5.5)

## Comandos ejecutados
- `deno test -A server/`, `deno check server/main.ts`, `deno lint server/`
- Servidor local con una copia de datos (`DATA_DIR`) y estáticos en `:8765`
- E2E: `node e2e-poker.js`, `e2e-juegos.js`, `e2e-clasicos.js`, `e2e-partidas.js`, `e2e-una-sala.js`,
  `e2e-loteria-sala.js`, `e2e-sudoku.js`, `e2e-puntos-tipo.js`

## Resultados de pruebas
- Motor (`server/cartas_test.ts`): primero en rojo porque no existía `juegos/cartas.js`; después 8/8.
  - Orden de las categorías, escalera baja y mejor mano de 7 cartas.
  - Ciegas y turnos, cara a cara y reapertura con subida.
  - Bote lateral con all-in corto y empate a tres.
  - 200 partidas de bots con semilla: todas las jugadas fueron válidas y las fichas se conservaron.
- Sala (`server/poker_sala_test.ts`): primero en rojo; después 2/2.
  - Sala con equipos.
  - Jugadas válidas, inválidas y `turno_tomado`.
  - ¡Una! rechaza las acciones de póker.
  - Partida individual en el catálogo.
- Suite completa: 144 pasaron, 0 fallaron y 6 se omitieron. `check` y `lint` sin observaciones.
- E2E `e2e-poker`: 10/10.
  - La ayuda abre con reglas, tabla de manos y aviso de fichas, y se cierra con Esc.
  - Mesa individual con 2 rivales: 4 manos con una subida, termina y guarda en individuales.
  - Partida por equipos con dos navegadores y 2 bots:
    - ambos ven la misma mesa con tags A/B;
    - hubo 79 jugadas humanas;
    - el final fue el mismo en ambos («Ganó el equipo A, 3,115 vs 885»);
    - se guardó en partidas.
- Regresiones:

  | E2E | Resultado |
  |---|---|
  | `e2e-partidas` | 15/15 |
  | `e2e-una-sala` | 11/11 |
  | `e2e-loteria-sala` | 10/10 |
  | `e2e-sudoku` | 15/15 |
  | `e2e-puntos-tipo` | 8/8 |
  | `e2e-juegos` | 29/29 |
  | `e2e-clasicos` | 11/11 |

  En `e2e-juegos` y `e2e-clasicos` se actualizó el conteo del hub: 22 juegos y 5 clásicos.

## Verificación de estado
- Antes: copia temporal `data-pk`; producción sin tocar.
- Después: `data-pk` borrada y servidores locales apagados.
- Estado restaurado: Sí.

## Resultado
- Estado Step 5: PASS
- Bloqueos: ninguno

## Verificación en producción (Step 6.1) — 2026-10-03
- Se corrió `node prod-poker.js` contra GitHub Pages y `stald.jalducin.deno.net` con el correo de admin. Resultado: 6/6.
  - El póker aparece en Clásicos y la ayuda abre.
  - En la mesa individual se hicieron 4 jugadas. Se salió sin terminar a propósito, así que no se guardaron puntos ni
    quedó ruido en el ranking (0 POST a `/juegos/partida`).
  - Se creó una sala `DZDE` con 2 bots: el servidor aceptó 2 jugadas y la mesa mostró 3 asientos.
- Restauración: se borró la sala `DZDE` del repo de datos y del índice `salas-semana`. No se guardó ninguna partida.

## Sprint final (2026-10-04): ritmo más lento y robo de ¡Una!
- Los artefactos se actualizaron primero: `poker` (§8), `cartas-espanolas` (§9), `una-en-partida` y
  `juegos-clasicos` (§A).
- E2E (pruebas de punta a punta):
  - `e2e-ritmo`: 2/2. Con el tiempo real, la baza completa de la Brisca se ve 5.3 s (antes 1.3 s) y el resultado
    del Póker unos 9.7 s (antes 6 s).
  - `e2e-una-robo`: 3/3. Se jugaron 5 partidas con 60 robos: cada robo sumó exactamente una carta, no hubo errores
    de JS y nada se trabó.
- Regresiones:

  | E2E | Resultado |
  |---|---|
  | `e2e-una-sala` | 11/11 (141 pasos idénticos entre navegadores) |
  | `e2e-clasicos` | 11/11 |
  | `e2e-cartas-espanolas` | 12/12 |
  | `e2e-poker` | 10/10 |
  | `e2e-ajustes-salas` | 8/8 |

- La copia temporal `data-rt2` se borró y los servidores locales se apagaron.

## Verificación en producción (sprint final) — 2026-10-04
- Pages sirve los tiempos nuevos (`CS_PAUSA_BAZA_MS` y `U_BOT_MS = 3000`).
- `prod-ritmo.js` contra producción, sin terminar partidas ni guardar puntos:
  - baza de la Brisca a la vista 5,293 ms;
  - resultado del Póker a la vista 9,693 ms.
- Adela Peñasco e Irving Moreno Candia quedaron con inicio el 2026-10-05 en `alumnos.json` y no tienen elementos
  anteriores a esa fecha (verificado en `/ingles/actividades`).
