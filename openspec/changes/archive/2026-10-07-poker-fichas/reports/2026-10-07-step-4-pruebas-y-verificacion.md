# Reporte Step 4 — Pruebas y verificación de estado

- Fecha: 2026-10-07
- Cambio: poker-fichas
- Agente: Claude Code (Opus 5.5)

## Comandos ejecutados
- `npx -y deno test -A server/cartas_test.ts server/poker_sala_test.ts` (en rojo, antes de implementar)
- `npx -y deno test -A server/` · `npx -y deno lint server/` · `npx -y deno check server/main.ts`
- `bash tests/e2e/correr.sh --datos <copia del scratchpad> --puerto-api 8897 --puerto-web 8875 poker` (en rojo y luego en verde)
- `bash tests/e2e/correr.sh --datos <copia del scratchpad> --puerto-api 8897 --puerto-web 8875 poker ritmo juegos partidas juegos-recarga ajustes-salas`

## Resultados de pruebas
- TDD en el motor y el servidor: 10 pruebas fallaron antes de implementar (9 de `cartas_test.ts` y la nueva de
  `poker_sala_test.ts`); después, 25 de 25 en verde en esos dos archivos.
- TDD en la página: `e2e-poker` falló antes de cambiar `juegos.html` (portada con 1,000 fichas, ayuda sin 5/10,
  pila de 1,000 fichas, sin pilas en el pozo, sin selector de fichas); después, 27 de 27 pasos PASS.
- Unitarias completas: 244 pasaron, 0 fallaron, 6 omitidas (las de `DATA_DIR`).
- `deno lint server/`: «Checked 62 files», sin problemas. `deno check server/main.ts`: sin errores.
- E2E (fase base), todas PASS: juegos 28, partidas 15, juegos-recarga 37, poker 27, ajustes-salas 8 y ritmo 2.
  - poker cubre: portada y ayuda con 500 fichas, ciegas 5/10 y «✅ Apostar»; mesa con 500 fichas, ciegas 5/10 y
    pilas en el pozo; selector oculto hasta «⬆️ Subir»; fichas «Ficha de 5…100»; +0 con «✅ Apostar»
    deshabilitado; 20 + 5 = +25 con 2 fichas en la pila y «Tu apuesta» correcta; fichas deshabilitadas justo
    cuando aumento + valor > máximo; «↺ Limpiar»; «✅ Apostar» con el mínimo deja «Tú sube a» la apuesta más alta
    + el aumento; partida completa; selector en escritorio (+85); sala por equipos con ciegas 5/10 y una subida
    armada con fichas que llega al servidor en múltiplo de 5.
- Verificación manual (UI) con capturas revisadas a ojo: `tests/e2e/salida/poker-fichas-390.png` (390 px),
  `poker-fichas-escritorio.png` (1280 px), `poker-mesa.png`, `poker-sala.png`. Ajuste tras la primera revisión:
  en escritorio las fichas quedaban muy separadas (`space-between`); se centraron con un espacio fijo y se
  agrandó la pila del selector.
- Verificación del API: `poker_sala_test.ts` contra `handleJuegos` (sin red): `subir` sin monto, 23, 0, "135" e
  `igualar` con 7 → `jugada_invalida`; 135 y 285 → 200.

## Verificación de estado
- Antes: copia de datos del scratchpad sin tocar; `correr.sh` trabaja sobre una copia temporal.
- Después: copia temporal borrada y servidores apagados (puertos 8897/8875 libres). Sin Supabase ni producción.
- Estado restaurado: Sí.

## Resultado
- Estado Step 4: PASS
- Bloqueos: ninguno. Pendiente del integrador: verificación en producción y `openspec archive`.
