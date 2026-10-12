# Reporte Step 5 — Pruebas y verificación de estado

- Fecha: 2026-10-11
- Cambio: cultura-conocimiento
- Agente: Claude (Opus 5.5)

## Comandos ejecutados
- `npx -y deno test -A server/cultura_datos_test.ts` (antes de cambiar el JSON: 4 fallan, rojo; después: 6/6, verde)
- `npx -y deno test -A server/linea_tiempo_test.ts` (antes del código: falla la verificación de tipos; después: verde)
- `npx -y deno test -A server/`
- `npx -y deno lint server/`
- `bash tests/e2e/correr.sh --datos <scratchpad>/data --puerto-api 8997 --puerto-web 8975 cultura-conocimiento juegos fusion clasicos revancha ranking-juegos partidas`
- Verificación manual con `curl` contra un servidor local (puerto 8997, copia temporal de los datos)
- `npx -y @fission-ai/openspec@1.4.1 validate cultura-conocimiento --strict`

## Resultados de pruebas
- Dirigidas: `cultura_datos_test` 6/6, `linea_tiempo_test` 15/15 y `mesas_test` 2/2.
- Suite completa de Deno: 336 pasaron, 0 fallaron, 6 omitidas (las que necesitan Postgres). `fusion_test` se ajustó:
  ahora pide al menos 6, 6 y 4 preguntas de IA y Tecnología, porque esas categorías crecieron.
- Lint: 77 archivos revisados, sin problemas.
- E2E: 7 de 7 en verde, en unos 10 min.

| Prueba | Pasos PASS | FAIL |
|---|---|---|
| juegos | 28 | 0 |
| partidas | 15 | 0 |
| revancha | 20 | 0 |
| clasicos | 11 | 0 |
| fusion | 10 | 0 |
| cultura-conocimiento (nueva) | 36 | 0 |
| ranking-juegos | 50 | 0 |

## Verificación manual (API, servidor local)
| Caso | Resultado |
|---|---|
| Crear una sala `cultura-linea` con `cat: "inventos"` | 200, `opciones.cat = "inventos"` |
| Tema inexistente (`deportes`) | 400 `tema_invalido` |
| Correo no registrado | 403 `no_registrado` |
| Responder antes de empezar | 409 `no_empezo` |
| Respuesta con 2 aciertos que pide 200 puntos | 200; se guardan 40 puntos, `ms` 30000 y `aciertos` 2 |
| Línea 5 (fuera de rango) | 400 `respuesta_invalida` |
| Respuesta sin `aciertos` | 400 `respuesta_invalida` |
| Persona que no está en la sala | 403 `no_en_sala` |

## Verificación de estado
- Antes: la carpeta de datos de las E2E (scratchpad `data`) no se modifica. `correr.sh` trabaja sobre una copia y el
  servidor guarda en memoria.
- Después: la carpeta original sigue sin cambios. La copia temporal de la prueba manual (`copia-api`) se borró y el
  servidor se apagó.
- Estado restaurado: Sí. No se tocaron producción, Supabase, las tablas `stald_*`, `.env` ni Notion.

## Capturas revisadas (390 px, en `tests/e2e/salida/`)
- `cultura-hub.png`: la sección única con los 4 juegos y el mejor puntaje en las tarjetas.
- `cultura-maraton-dato.png`: el dato 💡 se ve al acertar.
- `linea-temas.png`, `linea-ordenada.png`, `linea-revelada.png`, `linea-error.png` y `linea-resultado.png`:
  individual. Las casillas no se desbordan; en la revelación se ven los años, ✔/✘ y el orden correcto con su dato.
- `linea-sala-crear.png`, `linea-sala-espera.png`, `linea-sala-ordenar.png`, `linea-sala-revelacion.png` y
  `linea-sala-podio.png`: en sala, con la mesa de 30, la revelación con el marcador y bots, y el podio con revancha.
- Nota: en Chrome de Windows la bandera 🇲🇽 se ve como «MX», porque falta la fuente de banderas; en celular se ve
  bien. Las banderas del Maratón ya se comportaban igual.

## Resultado
- Estado Step 5: PASS
- Bloqueos: ninguno
