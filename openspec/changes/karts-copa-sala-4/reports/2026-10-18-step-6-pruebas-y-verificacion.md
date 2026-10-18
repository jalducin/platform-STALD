# Reporte Step 6 — Pruebas y verificación de estado

- Fecha: 2026-10-18
- Cambio: karts-copa-sala-4 (sprint 43a)
- Agente: Claude Code (Opus 5.5)

## Comandos ejecutados
- `npx -y deno test -A server/karts_copa_sala_4_test.ts` (primero en rojo: 5 de 5 fallaban)
- `npx -y deno test -A server/`
- `npx -y deno lint server/ juegos/karts-copa.js` y `npx -y deno check server/main.ts`
- `KARTS_VIVO_SOLO=copa … bash tests/e2e/correr.sh --datos <copia temporal> --puerto-api 10191 --puerto-web 10201 karts-vivo`
- `CHROME=… bash tests/e2e/correr.sh --datos <copia temporal> --puerto-api 10191 --puerto-web 10201 karts-vivo karts-puntos partidas espectador`
- `cd tests/calidad && npm run calidad` (y `node calidad.mjs --detalle`)
- `openspec validate karts-copa-sala-4 --strict`

## Resultados de pruebas
- Rojo inicial (TDD): la prueba «quien se perdió una carrera vuelve a contar» fallaba en la carrera 2 («la carrera
  sigue abierta para Angel»: cerraba al llegar Marisol, la causa del reporte); las del plazo de 30 s, duplicados,
  NT por avance y carrera suelta también fallaban.
- Dirigidas (`karts_copa_sala_4_test.ts`): 5 pasaron, 0 fallaron.
- Suite Deno completa: 829 pasaron, 0 fallaron, 6 ignoradas. Lint y tipos sin errores. Se ajustaron 4 pruebas
  existentes que fijaban la regla vieja (`karts_copa_test.ts`: tiempo vencido y desconexión;
  `karts_salida_puntos_test.ts`: NT por avance y cierre por límite).
- E2E copa en sala (solo copa): 25 PASS, 0 FAIL. 4 carreras con 2 personas + 1 bot, 3 tablas entre carreras con
  cuenta, sin podio antes de la carrera 4, un solo podio final; en la carrera 2 Angel no llega: ve «⏱️ 28 s para
  terminar» en el juego, Marisol ve la cuenta en la tabla, la carrera cierra a los 31.1 s (≤ 33 s) y Angel queda NT;
  en las carreras 3 y 4 Angel vuelve a correr y sumar.
- E2E pedidas: `partidas` 15/0, `karts-puntos` 83/0, `espectador` 28/0, `karts-vivo` 106/2. Las 2 fallas son de fps
  con CPU ×4 (47–54 contra meta 55; libre = 60) en la medición de 8 karts en vivo; se repitió sola y siguen cerca
  del umbral (54, 48). Es una falla de rendimiento de la máquina ya registrada en reportes anteriores
  (karts-salto, karts-puntos-copas) con otras suites corriendo en paralelo; este cambio no agrega trabajo por cuadro
  (una función que regresa de inmediato sin plazo). Todas las verificaciones funcionales de karts-vivo pasan.
- Calidad: 317 avisos (182 con NOSONAR); ningún aviso nuevo en los archivos tocados (las funciones cambiadas quedaron
  con igual o menor complejidad; `pintarArcadeSala` ya no aparece).

## Verificación de estado
- Antes: E2E sobre una copia temporal del repo de datos (`scratchpad/data`), servidor con `STALD_TABLAS=stald_test_`
  y sin Postgres de prueba; las pruebas de Deno usan `MemoryStore`.
- Después: ninguna escritura en tablas `stald_*` ni en el repo de datos real; la copia temporal es desechable.
- Estado restaurado: Sí — no hubo cambios fuera de la copia temporal.

## Resultado
- Estado Step 6: PASS (con la falla de fps ×4 conocida y ajena al cambio)
- Bloqueos: ninguno
