# Reporte Step 5 — Pruebas y verificación de estado

- Fecha: 2026-10-03
- Cambio: cartas-espanolas (Sprint 2 de juegos de cartas)
- Agente: Claude Code (Opus 5.5)

## Comandos ejecutados
- `deno test -A server/`, `deno check server/main.ts`, `deno lint server/`
- Servidor local con copia de datos (`DATA_DIR`) y estáticos en `:8765`
- E2E: `node e2e-cartas-espanolas.js`, `e2e-juegos.js`, `e2e-clasicos.js`, `e2e-poker.js`, `e2e-una-sala.js`,
  `e2e-partidas.js`

## Resultados de pruebas
- Motor (`server/cartas_test.ts`): las pruebas de la baraja española se escribieron primero y fallaron 8 de 16.
  Al final pasaron las 16, las 8 del póker incluidas.
  - Se corrigió una expectativa mal escrita en la prueba: en Brisca el 5 vence al 4.
  - Brisca:
    - baza con triunfo, sin triunfo y sin seguir el palo;
    - reparto con el triunfo al fondo; con 3 jugadores, 39 cartas;
    - roba primero quien gana la baza;
    - parejas;
    - 200 partidas de bots, todas suman 120.
  - Conquián:
    - juegos válidos e inválidos (7 y sota seguidos; no da la vuelta; sin huecos);
    - tomar, descartar, pasar en primera y en segunda, y la carta muerta;
    - agregar a un juego propio;
    - ganar con 9;
    - empate cuando se acaba el mazo;
    - 200 partidas de bots que conservan las 40 cartas.
- Sala: la prueba de `validarJugada` para Brisca y Conquián falló primero. Al final, `poker_sala_test` pasó 3/3.
- Suite completa: 153 pasaron, 0 fallaron y 6 se omitieron. `check` y `lint` quedaron limpios; se quitó un
  `deno-lint-ignore` que ya no se usaba.
- E2E `e2e-cartas-espanolas`: 12/12.
  - Las ayudas de los dos juegos.
  - Brisca en pareja contra bots: 10 cartas, termina y guarda puntos.
  - Conquián individual:
    - aviso de juego inválido;
    - tomar, bajar y descartar;
    - «¡Conquián! Bajaste 9».
  - Brisca en sala con dos navegadores y 2 bots: mismo triunfo, parejas y mismo final en los dos; se guarda en
    partidas.
  - Conquián en sala contra BOT-VACHIRA: termina (empate porque se acabó el mazo).
- Regresiones:

  | E2E | Resultado |
  |---|---|
  | `e2e-juegos` | 29/29 (hub con 24 juegos) |
  | `e2e-clasicos` | 11/11 (7 clásicos) |
  | `e2e-poker` | 10/10 |
  | `e2e-una-sala` | 11/11 |
  | `e2e-partidas` | 15/15 |

## Verificación de estado
- Antes: copia temporal `data-es`; producción sin tocar.
- Después: `data-es` borrada y servidores locales apagados.
- Estado restaurado: Sí.

## Resultado
- Estado Step 5: PASS
- Bloqueos: ninguno

## Verificación en producción (Step 6.1) — 2026-10-03
- `node prod-espanolas.js` contra Pages y `stald.jalducin.deno.net` con el correo de admin: 6/6.
  - Brisca y Conquián aparecen en Clásicos.
  - Brisca individual: 3 cartas jugadas.
  - Conquián: ayuda y 8 cartas en la mano.
  - No se terminó ninguna partida individual, así que no se guardaron puntos.
  - Sala de Brisca `DZCD` con 2 bots: producción aceptó 2 jugadas.
- Restauración:
  - sala `DZCD` borrada del repo de datos y del índice `salas-semana`;
  - no se guardó ninguna partida.

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

## Verificación en producción del ajuste (8.4) — 2026-10-03
- Se ejecutó `python prod-cupos.py` contra `stald.jalducin.deno.net` con el correo de admin:
  - una sala de ajedrez creada con `bots: true` quedó en `bots: false`;
  - al intentar empezar sin rival, el servidor respondió 409 `faltan_jugadores`;
  - una sala de Brisca creada con `bots: false` quedó en `bots: true`.
- Restauración: se borraron del repo de datos y del índice las salas de prueba `XEMG` y `ULVD`.
