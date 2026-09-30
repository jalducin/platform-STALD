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

## Verificación de estado
- Sin datos reales modificados. Las copias se borraron y el servidor local se detuvo.
- Estado restaurado: Sí.

## Resultado
- Estado Step 3: PASS
- Bloqueos: ninguno
