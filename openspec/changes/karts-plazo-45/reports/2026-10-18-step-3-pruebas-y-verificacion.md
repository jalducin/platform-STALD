# Reporte Step 3 — Pruebas y verificación de estado

- Fecha: 2026-10-18
- Cambio: karts-plazo-45
- Agente: Claude Code (Opus 5.5)

## Comandos ejecutados
- `npx -y deno test -A server/karts_plazo_45_test.ts` (primero en rojo: 2 de 4 fallan con `PLAZO_MS` = 30 000)
- `npx -y deno test -A server/` · `npx -y deno check server/main.ts` · `npx -y deno lint server/`
- `cd tests/calidad && npm run calidad`
- `CHROME=… bash tests/e2e/correr.sh --datos <copia temporal> --puerto-api 10251 --puerto-web 10261 karts-vivo karts-puntos espectador`
- `KARTS_VIVO_SOLO=ceremonia bash tests/e2e/correr.sh … karts-vivo` (3 veces con 45 s y 3 con 30 s, para comparar)
- `openspec validate karts-plazo-45 --strict`

## Resultados de pruebas
- Nueva `karts_plazo_45_test.ts`: 4 PASS (plazo 45 000; cierre a los 45 s exactos en las 16 pistas; el plazo vence
  antes que el límite de 3 vueltas, aun con la llegada más rápida aceptada y con una llegada lenta al 110 %; el
  servidor acepta un 2.º lugar 44.99 s después de quien ganó al 90 % de la referencia).
- Dirigidas de Karts (`karts_copa_sala_4`, `karts_puntos_copas`, `karts_3_vueltas`, `karts_copa`,
  `karts_salida_puntos`, `karts_plazo_45`): 56 PASS, 0 FAIL. Ya usan `KC.PLAZO_MS`; la copa en sala acepta a Angel
  44 s después de Marisol y en la copa de puntos Angel llega con su tiempo realista (108 %), que ya cabe en 45 s.
- Suite completa del servidor: 851 PASS, 1 FAIL, 6 omitidas. La falla es `espectador_test.ts` «Dibuja y adivina sin
  la palabra ni el secreto» (aleatoria, ajena a Karts): al repetir el archivo pasa 11/11.
- `deno check` y `deno lint server/`: sin errores.
- Calidad: 317 avisos (185 con NOSONAR); ninguno en los archivos que toca este cambio (sin avisos nuevos).
- E2E: `karts-puntos` 83 PASS / 0 FAIL; `espectador` 28 PASS / 0 FAIL; `karts-vivo` 123 PASS / 8 FAIL.
  - Del plazo, todas pasan: «la página usa un plazo de 45 s» (45000), «⏱️ 44 s para terminar» en el juego y en la
    tabla, el HUD «Vuelta x/3» sin encimarse con `#plazo`, cierre a los 45 s (espera = 44 655 ms, ≤ 48 s), Angel NT en
    la carrera 2, 4 carreras con 3 tablas y un solo podio final.
  - Las 8 fallas son ajenas al plazo y ya pasaban en reportes anteriores con el equipo cargado (la calidad corría
    en paralelo): fps con CPU ×4 (38–42), latencia del canal simulado, lugar de Angel y parrilla de salida (vivo), y
    «ceremonia en sala: suben 3.º, luego 2.º y al final 1.º». La ceremonia no usa el plazo (las 2 personas llegan):
    con `KARTS_VIVO_SOLO=ceremonia` falla igual con 30 s (2 de 3 corridas) que con 45 s (2 de 2 tras la primera);
    es un muestreo de la animación sensible a la carga, no un efecto de este cambio.
- Duración: ≈ 35 s Deno, ≈ 20 min E2E.

## Verificación de estado
- Antes: datos en una copia temporal del repo privado (scratchpad); sin Postgres de prueba; tablas `stald_` sin tocar.
- Después: `correr.sh` copia y descarta los datos; la copia original no cambia.
- Estado restaurado: Sí — `juegos/karts-copa.js` volvió a 45 000 tras las corridas de comparación (`git checkout`).

## Resultado
- Estado Step 3: PASS (con las fallas ajenas documentadas)
- Bloqueos: ninguno
