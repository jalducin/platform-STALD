# Reporte Step 4 — Pruebas y verificación de estado

- Fecha: 2026-10-21
- Cambio: ingles-baja-alumno
- Agente: Claude (Opus 5.5) + subagente `verificador-pruebas` (suite completa)

## Comandos ejecutados
- `npx -y deno test -A server/baja_ingles_test.ts` (primero en rojo: 4 fallas; después en verde)
- `npx -y deno test -A server/` (subagente `verificador-pruebas`)
- `npx -y deno check server/main.ts` · `npx -y deno lint server/`
- `cd tests/calidad && npm ci && npm run calidad` (solo informa)
- `bash tests/e2e/correr.sh --datos <copia temporal de platform-STALD-data> --puerto-api 8895 --puerto-web 8896 baja-ingles alta-alumnos inicio-lunes`
- Verificación manual con `curl` contra un servidor local (`DATA_DIR` = copia temporal, puerto 8895)

## Resultados de pruebas
- Dirigidas (`baja_ingles_test.ts`, `alumnos_test`, `auth_main_test`, `cache_main_test`, `grupos_test`): 22 pasaron, 0 fallaron
- Suite completa `deno test -A server/`: 910 pasaron, 0 fallaron, 6 omitidas (1 m 14 s, `verificador-pruebas`); tras
  atender la revisión `revisor-solo-lectura`: 911 pasaron, 0 fallaron, 6 omitidas (1 m 9 s)
- `deno check`: 0 errores · `deno lint`: 0 avisos (146 archivos)
- Calidad: salida 0. Se atendió el aviso nuevo de complejidad de `rutear` (la rama de grupos pasó a `rutaGrupos`) y
  el ternario anidado de la prueba.
- E2E (fase `ingles`, sin `--pg`): `baja-ingles` 17/17, `alta-alumnos` 13/13, `inicio-lunes` 6/6. Capturas
  `baja-admin.png` (Registro a 390 px, sin scroll horizontal) y `baja-alumna.png` (aviso amable) revisadas.

## Hallazgos de la revisión `revisor-solo-lectura` (atendidos)
- Conteo de grupos sin la lista de alumnos: `GET /ingles/grupos` ahora omite de `miembros` a quien está de baja.
- Grupo al reactivar: prueba nueva en `server/grupos_test.ts` (PostgREST falso, sin tablas reales): la inscripción
  queda vigente, `grupoDe` sigue en su grupo y al reactivar vuelve a `miembros` del mismo grupo.
- Secundaria sin cambio: `server/baja_ingles_test.ts` llama `/secundaria/actividades` con la alumna de baja (200).
- E2E: `restaurar()` reactiva a Laura al final y ante cualquier error (la fase `ingles` comparte datos).
- Caché de 30 s del registro por proceso: anotado en Risks de `design.md`.

## Verificación manual (curl, servidor local)
| Caso | Resultado |
|---|---|
| Admin `POST /ingles/grupos/baja` (laura) | 200 `baja: "2026-10-21"` |
| Repetir la baja | 200 `sinCambio: true` (misma fecha) |
| Laura `GET /ingles/data` | 200 `{ rows: [], isAdmin: false, baja: true }` |
| Laura `GET /ingles/actividades` | 403 `baja_ingles` |
| Laura `GET /perfil` | 200 `accesos.ingles: false`, `juegos: true`, `nombre: "Laura"` |
| Laura `POST /ingles/grupos/reactivar` | 403 `solo_admin` |
| Admin, correo inexistente | 404 `not_found` |
| Admin, JSON inválido | 400 `json_invalido` |
| Sin sesión | 401 `inicia_sesion` |
| Admin `POST /ingles/grupos/reactivar` | 200, sin `baja` |

## Verificación de estado
- Antes: registro de la copia temporal sin ninguna `baja`.
- Después: 0 personas con `baja` (la E2E y la verificación manual reactivan al final); la copia temporal se borró.
- Postgres: no se usó (`stald_` ni `stald_test_` intactas). Repo de datos: solo clon local, sin push.
- Estado restaurado: Sí — reactivación y borrado de la copia; servidor local detenido.

## Resultado
- Estado Step 4: PASS
- Bloqueos: ninguno
