# Reporte Step 4 — Pruebas y verificación de estado

- Fecha: 2026-10-02 (incidente: 21:00 CDMX)
- Cambio: github-etag-cache
- Agente: Claude Code (Opus 5.5)

## Incidente
- Todas las rutas respondían `500 upstream_error`: Juegos, Inglés y el portal.
- GitHub respondía "API rate limit exceeded" al usuario dueño del token; el límite es de 5,000 por hora.
- Causa: cada consulta de sala, cada 2.5 s por jugador, leía `sala.json`, la lista y el archivo de cada jugador. La
  caché era de 2 s por instancia y Deno corre varias instancias. Una partida de 10–15 min basta para agotar el
  límite.
- Desde `alta-alumnos`, Inglés y el portal también leen el repo de datos, por eso cayó todo.
- Se recuperó solo al reiniciarse el límite. A las 03:18 UTC el servidor respondía de nuevo.

## Comandos ejecutados
- `npx deno test -A server/` · `npx deno lint server/` · `npx deno check server/main.ts`
- Servidor local con copia desechable del repo de datos; estáticos en `localhost:8765`
- `node e2e-partidas.js` (con el sondeo nuevo)

## Resultados de pruebas
- Dirigidas (TDD):
  - `server/store_test.ts` (4 pruebas, con un `fetch` falso de GitHub): ETag/304 sin volver a descargar; 404 limpia
    la copia; `put` y `remove` invalidan la copia y la lista; con el límite agotado sirve la copia, y sin copia
    lanza `github_rate_limit`; tope de entradas.
  - `server/salas_test.ts`: una sala vencida responde 410 sin listar a sus jugadores.
  - Ambas primero en rojo y luego en verde.
- Suite del servidor: 120 pasaron, 0 fallaron, 6 omitidas. `lint` y `check` sin errores.
- E2E `e2e-partidas`: 15/15 PASS con el sondeo nuevo (deja de consultar al llegar al podio).

## Verificación de estado
- Copia desechable (`data-gh`), borrada al terminar. Los servidores locales de prueba quedaron detenidos.

## Resultado
- Estado Step 4: PASS
- Bloqueos: ninguno
