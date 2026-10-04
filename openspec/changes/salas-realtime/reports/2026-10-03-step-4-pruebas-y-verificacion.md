# Reporte Step 4 — Pruebas y verificación de estado

- Fecha: 2026-10-03
- Cambio: salas-realtime
- Agente: Claude Code (Opus 5.5)

## Comandos ejecutados
- `deno test -A server/`, `deno check server/main.ts`, `deno lint server/`
- Servidor local (`DATA_DIR` copia de datos, `ROWS_FIXTURE`) con `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` y
  `SUPABASE_SERVICE_KEY` del proyecto real *Portafolio* (`eolsklubeywfmuyrtxla`), solo como variables del proceso
- `node e2e-realtime.js`, `e2e-basta-rondas.js`, `e2e-partidas.js`, `e2e-loteria-sala.js`, `e2e-una-sala.js`
- Sin variables de Supabase: `node e2e-ahorro.js`

## Resultados de pruebas
- Unitarias: `realtime_test.ts` en rojo primero (2 fallaron y 1 pasó; luego el caso de `v` falló), después en verde
- Suite completa: 131 pasaron, 0 fallaron, 6 omitidas; `check` y `lint` limpios. Se agregó `require-await` a los
  `deno-lint-ignore-file` de `salud_test.ts`, `store_test.ts` y `realtime_test.ts` (fetch falsos `async`)
- E2E Realtime: 6/6
  - WebSocket abierto;
  - la anfitriona ve entrar a Angel en ~150–350 ms con 0 GET;
  - Angel recibe el inicio con 0 GET;
  - en juego, 1 GET en 40 s (respaldo de 30 s);
  - canal cortado (`routeWebSocket` cierra): sondeo normal de 2.5 s
- Regresiones con Realtime: partidas 15/15, Basta por rondas 12/12, Lotería en sala 10/10, ¡Una! en sala 11/11
- Sin configuración: `e2e-ahorro` 4/4 (5 s en quiz, 2.5 s en ¡Una!, 0 OPTIONS), igual que antes

## Hallazgos corregidos durante la verificación (artefactos actualizados primero)
- **Carrera al suscribirse:** un aviso enviado antes de la suscripción no llega. Angel se quedaba en la sala de
  espera hasta el respaldo de 30 s. Ahora, al quedar `SUBSCRIBED`, la página hace una consulta para ponerse al día.
- **Avisos fuera de orden:** en Basta por rondas, un aviso viejo llegó después de uno nuevo y borró la ronda 4
  de la anfitriona. Ahora hay contador `EnSala.v` por jugador, y `mezclarEstado` conserva la versión más alta y
  no regresa una sala ya empezada.
- **Llave secreta enmascarada:** la llave `sb_secret` que lista el CLI viene enmascarada (401). Para el E2E se
  usó la `service_role` legacy (JWT), que publica con 202. Está documentado en `deno-deploy-setup.md`.

## Verificación de estado
- Antes: copia temporal `data-rt` del repo de datos; producción sin tocar
- Después: `data-rt` borrada; servidores locales apagados; los canales de Realtime son efímeros (sin datos en Supabase)
- Estado restaurado: Sí

## Resultado
- Estado Step 4: PASS
- Bloqueos: ninguno. La verificación en producción (Step 5.2) depende de que se configuren las variables en Deno.
