# Reporte Step 5 — Pruebas y verificación de estado

- Fecha: 2026-10-03
- Cambio: ajedrez (Sprint 3)
- Agente: Claude Code (Opus 5.5)

## Comandos ejecutados
- `deno test -A server/`, `deno check server/main.ts`, `deno lint server/`
- Medición del bot: `deno run medir.mjs`. El nivel 2 tarda de 3 a 6 ms y el nivel 3 de 20 a 84 ms.
- E2E: `node e2e-ajedrez.js`, `e2e-juegos.js`, `e2e-clasicos.js`, `e2e-cartas-espanolas.js`, `e2e-una-sala.js` y
  `e2e-partidas.js`.

## Resultados de pruebas
- Motor (`server/ajedrez_test.ts`): 6/6.
  - Perft de la posición inicial (20, 400 y 8902), Kiwipete (48 y 2039) y las posiciones 3, 4 y 5. Todos coinciden
    con los valores conocidos.
  - FEN, mate del tonto, mate del pastor, ahogado, material insuficiente, regla de 50 jugadas y triple repetición.
  - Captura al paso, enroque bloqueado por casilla atacada y coronación con 4 opciones.
  - Notación en español: `Cf3`, `exd5`, `Dh4#`, `O-O`, `e8=D+` y `Tad1`.
  - El bot da mate en 1 en los niveles 2 y 3, toma la dama colgada y jugó 20 partidas contra sí mismo, todas con
    jugadas legales.
  - Desviación de TDD: las pruebas se escribieron primero, pero se ejecutaron por primera vez con el motor ya
    escrito. El rojo se confirmó después, quitando el motor (falla al cargar el módulo).
- Sala (`poker_sala_test`, caso ajedrez): primero en rojo y después en verde.
  - Reloj de 5 min, y 10 min cuando el valor no es válido.
  - Las jugadas de mover, coronar y rendirse se aceptan.
  - Se rechazan casillas inválidas, coronación a rey y acciones de otros juegos.
- Suite completa: 160 pasaron, 0 fallaron y 6 se omitieron. `check` y `lint` sin errores.
- E2E `e2e-ajedrez`: 12/12.
  - Ayuda, tablero de 64 casillas con 32 piezas y los destinos del peón de e2.
  - 1.e4 con respuesta del bot, y el rey de e1 con un solo destino.
  - Rendirse guarda la partida.
  - Reloj visible solo en ajedrez, tablero volteado para negras y relojes en 5:00.
  - El alfil de f8 muestra sus 5 destinos.
  - Mate del tonto en 1 vs 1: los dos jugadores ven el mismo final y la partida se guarda en «partidas».
  - En la primera corrida fallaron dos expectativas mal planteadas en la prueba, no en el juego: el rey sí tiene
    1 destino tras e4 y el alfil tiene 5, no 6. Además faltaba esperar el turno. Se corrigieron.
- Regresiones:
  - `e2e-juegos`: 29/29 (hub con 25 juegos);
  - `e2e-clasicos`: 10/10;
  - `e2e-cartas-espanolas`: 12/12;
  - `e2e-una-sala`: 12/12;
  - `e2e-partidas`: 15/15.

## Verificación de estado
- Antes: copia temporal `data-aj`; producción sin tocar.
- Después: `data-aj` borrada y servidores locales apagados.
- Estado restaurado: Sí

## Resultado
- Estado del Step 5: PASS
- Bloqueos: ninguno

## Verificación en producción (Step 6.1) — 2026-10-03
- Se corrió `node prod-ajedrez.js` contra Pages y `stald.jalducin.deno.net` con el correo de admin: 4/4.
  - El ajedrez aparece en Mente ágil.
  - Individual: 1.d4 y el bot respondió. No se guardaron puntos porque la partida no se terminó.
  - Sala `WMCT` contra el bot: el servidor aceptó 1.e4 y el bot respondió.
- Restauración: se borró la sala `WMCT` del repo de datos y del índice. No se guardó ninguna partida.

## Ajuste post-apply del profe (2026-10-03): sala sin bots en ajedrez y Brisca completa a 4
- Primero se actualizaron los artefactos: proposal, spec, design y tasks (sección 8).
- La prueba de servidor `cupos: ajedrez 2 personas sin bots y Brisca hasta 4 con bots` se escribió primero y falló
  (rojo). Después, la suite completa pasó: 164 pasaron, 0 fallaron.
  - La prueba anterior del ajedrez se ajustó: ahora Angel se une antes de empezar.
- E2E `e2e-ajustes-salas`: 8/8.
  - Niveles Básico, Intermedio y Avanzado.
  - La casilla de bots se oculta y aparecen las notas.
  - La sala de ajedrez no muestra bots. Sin rival aparece el aviso y la partida no empieza. Un tercer jugador recibe
    «La partida está llena». La partida queda entre Marisol y Angel.
  - En Brisca, 2 personas más 2 bots juegan en parejas.
- Regresiones:

  | E2E | Resultado |
  |---|---|
  | `e2e-ajedrez` | 12/12 |
  | `e2e-cartas-espanolas` | 12/12 |
  | `e2e-partidas` | 15/15 |
  | `e2e-una-sala` | 12/12 |
  | `e2e-poker` | 10/10 |
