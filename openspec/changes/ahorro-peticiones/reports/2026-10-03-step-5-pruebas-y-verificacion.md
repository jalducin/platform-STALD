# Reporte Step 5 — Pruebas y verificación de estado

- Fecha: 2026-10-03
- Cambio: ahorro-peticiones (aviso de Deno: 90 % de HTTP Requests)
- Agente: Claude Code (Opus 5.5)

## Diagnóstico
- No hay bucles: todas las llamadas al servidor salen de clics o del sondeo de salas.
- El consumo es uso real. El 3 de octubre hubo 9 salas con 3–5 jugadores entre 10:14 y 11:31 (CDMX), y en la
  semana 27 salas. Dos salas no empezaron nunca y sus pestañas seguían consultando.
- Cada envío costaba 2 peticiones por la verificación previa de CORS.

## Comandos ejecutados
- `npx deno test -A server/` · `npx deno lint server/` · `npx deno check server/main.ts`
- Servidor local con copia desechable del repo de datos; estáticos en `localhost:8765`
- `node e2e-ahorro.js` (nuevo: cuenta peticiones en el navegador), `e2e-partidas`, `e2e-alta-alumnos`

## Resultados de pruebas
- Dirigida (TDD, `server/cors_test.ts`): `OPTIONS` con `Access-Control-Max-Age: 86400`. Primero en rojo y luego
  en verde.
- Suite del servidor: 128 pasaron, 0 fallaron, 6 omitidas.
- E2E `e2e-ahorro`: 4/4 PASS.
  - Quiz (cultura): 0 `OPTIONS` con sus POST y un sondeo promedio de 5,013 ms.
  - ¡Una!: 0 `OPTIONS` y un sondeo promedio de 2,511 ms.
- Regresiones: `e2e-partidas` 15/15 y `e2e-alta-alumnos` 11/11, con los POST de Inglés ya en `text/plain`.

## Cambios incluidos
- Se incorporó el cambio local, sin commit, de otra sesión (intervalo adaptativo con `setTimeout`), con un ajuste:
  2.5 s se mantiene en ¡Una!, Basta y Lotería.
- Se quitó `server/juegos.html` (copia accidental del commit "Ok" `eaffbd7`) y la nota suelta
  `deno-deploy-usage-alert.md`.
- El vigilante pasa de cada 15 min a cada 30 min.

## Verificación de estado
- Copia desechable borrada; servidores locales detenidos.

## Resultado
- Estado Step 5: PASS
- Bloqueos: ninguno
