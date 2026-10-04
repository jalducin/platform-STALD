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
