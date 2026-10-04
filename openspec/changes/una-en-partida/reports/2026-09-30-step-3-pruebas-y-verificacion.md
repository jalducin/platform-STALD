# Reporte Step 3 — Pruebas y verificación de estado

- Fecha: 2026-09-30
- Cambio: una-en-partida
- Agente: Claude Code (Opus 5.5)

## Comandos ejecutados
- `npx -y deno test --allow-env --allow-read server/`, `deno check` y `deno lint`
- E2E:
  - `e2e-una-sala.js`, dos veces: dos navegadores con bots. Registra el estado de cada paso en ambos y
    los compara. Incluye un "olvido" de UNA y el avatar del portal.
  - Regresiones: `e2e-clasicos`, `e2e-partidas`, `e2e-loteria-sala` y `e2e-portal`.

## Resultados de pruebas
- **TDD:**
  - La prueba nueva de `salas_test.ts` (sala de `una`, jugada con `t`, `n` tomado → 409, inválidas → 400)
    falló antes de implementar.
  - La prueba anterior, que usaba `una` como "juego no permitido", se actualizó a `en-memorama`, porque
    ahora `una` sí se permite.
  - 82 pasaron y 6 omitidas. `check` y `lint` limpios.
- **E2E de ¡Una! en partida:** 12/12 en las dos corridas.
  - La sala tiene 2 personas y 2 bots, y cada persona ve su mano de 7 cartas.
  - **Estado idéntico en todos los pasos comunes** (carta de arriba, color, manos y turno): 83 y 21
    pasos, 0 distintos.
  - Las personas jugaron y la partida terminó en ambos, con el mismo ganador, podio idéntico y guardado
    en el ranking.
  - **Castigo por no presionar UNA** (+2), registrado igual en ambos (`castigos: [0]`).
  - Portal: el avatar aparece en el saludo y "🎨 Cambiar avatar" abre el selector.
- **Ajustes durante el cambio:**
  - El castigo se verifica con el registro del motor (`st.castigos`). La primera corrida lo buscaba en un
    instante que el bot ya había pasado.
  - A pedido del usuario, los textos dicen "presiona el botón UNA" y el botón dice "UNA", en solitario y
    en partida.
- **Regresiones:** clásicos 11/11 (castigo en solitario 1 → 3), partidas 15/15, Lotería 10/10 y portal
  16/16.

## Post-apply: castigo por segundos en UNA (2b)
- **Servidor:** la prueba nueva (`unas` con `t`, una por paso, paso inválido → 400) falló antes de
  implementar. Después, 83 pasaron y 6 omitidas.
- **Bugs reales encontrados y corregidos:**
  - La mesa se redibujaba dos veces por segundo durante la ventana del UNA y reemplazaba el botón mientras
    se tocaba. Ahora la cuenta regresiva se actualiza sin redibujar.
  - El botón UNA salía hasta confirmar la jugada con el servidor, dos viajes de red que le restaban
    tiempo a quien jugaba. Ahora aparece al instante y el UNA se envía al confirmarse la jugada.
- **Notas de prueba:**
  - El botón tiene una animación de pulso y Playwright espera a que deje de moverse, así que en las
    pruebas se usa un clic forzado.
  - Con los relojes acelerados, la ventana de 2 s era irrealizable con la red de por medio; estas pruebas
    corren a velocidad real.
- **E2E determinista** (`e2e-una-segundos.js`, sala de una persona), 2 corridas: a los 3.3 s → +2; al
  instante → 0.
- **E2E de dos navegadores:** estado idéntico en cada paso común.
- **Solitario** (`e2e-una-solo-segundos.js`): unos 3.5 s → +2; sin presionar → +4.
- **Regresiones:** clásicos 11/11, partidas 15/15, Lotería 10/10, avatar y música 12/12.
- **Producción de PR #39:** la primera jugada coincidió con el cambio de versión en Deno Deploy, que
  respondió "no_empezo". Al repetir, empezar → jugada guardada con `t`. Las salas de prueba (HGSV y ECPH)
  se borraron.

## Verificación de estado
- Sin datos reales modificados. Las copias se borraron y el servidor local se detuvo.
- Estado restaurado: Sí.

## Resultado
- Estado Step 3: PASS
- Bloqueos: ninguno

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
