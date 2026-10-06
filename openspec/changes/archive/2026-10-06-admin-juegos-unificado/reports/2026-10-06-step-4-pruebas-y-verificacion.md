# Reporte Step 4 — Pruebas y verificación de estado

- Fecha: 2026-10-06
- Cambio: admin-juegos-unificado
- Agente: Claude Code (Opus 5.5)

## Comandos ejecutados
- `npx -y @fission-ai/openspec@1.4.1 validate admin-juegos-unificado --strict` → válido
- `npx -y deno test -A server/` · `npx -y deno lint server/` (salida completa: «Checked 58 files», sin problemas)
- `CHROME=<chromium-1228> bash tests/e2e/correr.sh --datos <copia del scratchpad> --puerto-api 8887 --puerto-web 8865 …`
  - en rojo, antes de implementar: `jugadores juegos avatar-foto nick`;
  - en verde: `jugadores juegos avatar-foto nick login portal partidas juegos-recarga`;
  - `portal` sola (intermitente conocida) y `juegos nick` tras los últimos ajustes de las pruebas.

## Resultados de pruebas
- TDD (rojo): las 4 E2E fallaron antes del cliente nuevo (no existía `[data-tab="admin"]`; la barra tenía 6 pestañas).
- Unitarias: 228 pasaron, 0 fallaron, 6 omitidas (las de `DATA_DIR`, como siempre). Lint sin problemas.
- E2E (verde):

| Prueba | Pasos | Resultado |
|---|---|---|
| jugadores | 34/34 | PASS |
| juegos | 28/28 | PASS |
| avatar-foto | 18/18 | PASS |
| nick | 7/7 | PASS |
| login | 58/58 | PASS |
| partidas | 15/15 | PASS |
| juegos-recarga | 37/37 | PASS |
| portal | 16/16 | PASS al repetirla sola. En la batería falló 1 vez «Inglés entra sin volver a pedir el correo» (intermitente conocida; no toca `juegos.html`) |

- Cobertura nueva en `jugadores`: 4 pestañas y sin desborde a 390 px; contadores (jugadores = filas, 2 pendientes,
  invitados y fotos); roles `tablist`/`tab`/`tabpanel`; tarjetas sin encabezado de tabla y sin scroll horizontal en
  celular; lista con scroll propio; buscador (coincidencias, mayúsculas y acentos, «Nada coincide» y limpiar); CSV de
  jugadores y de invitados (descarga real); pendientes y su enlace con destino «juegos»; teclado (→); preferencia
  `juegos_admin_sub` y reapertura en esa sub-sección; escritorio en modo oscuro con encabezado pegajoso; una fuente con
  error 500 (contador «!», aviso con «Reintentar» y recuperación); alumna sin la pestaña y 403 en las tres rutas.
- `avatar-foto` ahora además comprueba el correo del jugador en la tarjeta de su foto y que el contador baja al quitarla.
- `juegos` descarga el CSV de invitados y comprueba que trae al invitado.

## Verificación manual (Step 5.1, UI con Playwright)
- Capturas revisadas a ojo (en `tests/e2e/salida/`, ignorada por git; contienen datos de la copia local, no se
  versionan): `admin-jugadores-390.png`, `admin-pendientes-390.png`, `admin-invitados-390.png`, `admin-fotos-390.png`,
  `admin-escritorio.png` (oscuro, con la fuente de invitados fallando) y `admin-escritorio-pendientes.png`.
- Ajustes hechos tras revisarlas: placeholder corto que no se corta, «↻ Actualizar» sin partirse, correos que no se
  rompen a media palabra, tarjetas de 3–4 columnas con etiquetas cortas y mejor contraste de la sub-sección activa
  en modo oscuro.

## Verificación de estado
- Antes: copia de datos del scratchpad sin cambios (repo limpio).
- Después: `correr.sh` trabajó sobre una copia temporal, la borró y apagó los servidores; la copia del scratchpad
  sigue limpia. Sin Supabase ni producción.
- Estado restaurado: Sí.

## Resultado
- Estado Step 4: PASS
- Pendiente (integrador): verificación en producción tras el merge (Step 5.2) y archivo.
