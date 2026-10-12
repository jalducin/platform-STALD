# Reporte Step 5 — Pruebas y verificación de estado

- Fecha: 2026-10-11
- Cambio: juegos-ingles-gramatica
- Agente: Claude Code (Opus 5.5)

## Comandos ejecutados

- `npx -y deno test -A server/ingles_datos_test.ts server/ingles_gramatica_test.ts` (en rojo antes de implementar:
  9 de 11 fallaron; después, verdes)
- `npx -y deno test -A server/`
- `npx -y deno lint server/` y `npx -y deno check server/main.ts`
- `bash tests/e2e/correr.sh --datos <copia de datos> --puerto-api 8967 --puerto-web 8945 juegos-ingles revancha juegos
  partidas juegos-recarga clasicos puntos-tipo ajustes-salas ritmo fusion peticiones` (después del merge de
  `origin/main` con la revancha)
- `bash curl-verif.sh` contra un servidor local en el puerto 8969 con una copia temporal de datos
- `npx -y @fission-ai/openspec@1.4.1 validate juegos-ingles-gramatica --strict`

## Resultados de pruebas

- Dirigidas (Deno): `ingles_datos_test.ts` 10/10 y `ingles_gramatica_test.ts` 5/5 (incluye que la revancha copia el
  tema).
- Suite del servidor: 287 pasaron, 0 fallaron, 6 omitidas (las omitidas ya existían y requieren variables de
  entorno). `deno lint`: 68 archivos sin hallazgos. `deno check`: sin errores.
- E2E: 11 corridas, 11 PASS, 0 FAIL:
  - `juegos-ingles` (nueva): 25 pasos;
  - `revancha` 20, `juegos` 28, `partidas` 15, `juegos-recarga` 37, `clasicos` 11, `fusion` 10, `puntos-tipo` 8,
    `ajustes-salas` 8, `ritmo` 2 y `peticiones` 11.
  - Antes del merge, `peticiones` falló dos veces por una petición de más (41 de un tope de 40) en una sala de
    ¡Una!, que este cambio no toca; tras el merge pasó. Es una medición sensible a los tiempos de la máquina.
- Duración: unos 18 minutos la corrida completa de E2E.

## Verificación manual (curl, servidor local)

| Caso | Resultado |
|---|---|
| Sala `en-frases` con `tema: pasado` | 200, `opciones: { tema: "pasado" }` |
| Sala `en-frases` sin tema | 200, `opciones: { tema: "todo" }` |
| Sala `en-frases` con `tema: marciano` | 400 `tema_invalido` |
| Sala `en-vocab` con tema | 200, el tema se ignora (`opciones: {}`) |
| Sala `en-tiempos`: crear, empezar y responder | 200 en los tres |
| Guardar partida de sala `en-tiempos` | 200, `guardado: true`, `modo: sala` |
| Partida individual `en-tiempos` con 5,000 puntos | 200, se guarda con el tope de 2,000 |
| Sala `en-tiempos` sin sesión | 400 `missing_email` |
| Responder en una sala ajena | 403 `no_en_sala` |

## Capturas revisadas (390 px)

`ingles-selector.png`, `ingles-frases-error.png` (regla «Después de didn't el verbo va en forma base»),
`ingles-tiempos-error.png`, `ingles-tiempos-pregunta.png`, `ingles-tiempos-resultado.png` («Lo que más se te
complicó»), `ingles-sala-tema.png`, `ingles-sala-revelacion.png` (💡 regla) e `ingles-sala-podio.png` (podio, «🔁
Otra con los mismos» y resumen de fallos). Sin desbordes ni textos cortados, salvo el título largo de la partida,
que ya se recortaba con «…» antes del cambio.

## Verificación de estado

- Antes: carpeta de datos de las E2E sin cambios; las pruebas trabajan sobre una copia temporal (`correr.sh`).
- Después: la carpeta original sigue sin cambios; la copia temporal de `curl` vive en el scratchpad, fuera del
  repo, y su servidor se detuvo (puerto 8969 libre).
- Estado restaurado: Sí. No se tocaron Postgres, Supabase, tablas `stald_*`, Notion ni producción.

## Resultado

- Estado Step 5: PASS
- Bloqueos: ninguno. Pendiente solo lo que hace el usuario: merge, verificación en producción y `openspec archive`.
