# pruebas Specification

## Purpose
TBD - created by archiving change pruebas-en-repo. Update Purpose after archive.
## Requirements
### Requirement: Pruebas unitarias en CI
El repo SHALL correr en GitHub Actions, en cada push a `main` y en cada pull request, las pruebas unitarias del
servidor (`deno test -A server/`), la revisión de tipos (`deno check server/main.ts`) y el lint
(`deno lint server/`). El workflow SHALL fallar si cualquiera de los tres falla y SHALL NOT usar secretos.

#### Scenario: PR con pruebas en verde
- **WHEN** se abre o actualiza un PR y las tres revisiones pasan
- **THEN** el check "Pruebas del servidor" queda en verde

#### Scenario: PR que rompe una prueba
- **WHEN** un cambio hace fallar una prueba, un tipo o una regla de lint
- **THEN** el check queda en rojo y el log muestra cuál falló

### Requirement: Pruebas E2E versionadas y reproducibles
Las pruebas E2E SHALL vivir en `tests/e2e/` sin rutas absolutas de una máquina. Su configuración SHALL venir de
variables de entorno con valores por omisión. Las capturas y salidas SHALL escribirse en `tests/e2e/salida/`,
ignorada por git. El repo SHALL NOT contener datos del repo privado, correos que no sean `@example.com` ni llaves.

#### Scenario: Correr las E2E en local
- **WHEN** alguien corre `tests/e2e/correr.sh --datos <copia del repo privado> [pruebas…]`
- **THEN** se copia la carpeta de datos (la original no se modifica), se levantan el servidor y los estáticos en
  los puertos indicados, se corren las pruebas, se imprime un resumen PASS/FAIL por prueba, y al final se apagan
  los servidores y se borra la copia

#### Scenario: Sin carpeta de datos
- **WHEN** se corre `correr.sh` sin `--datos` o con una ruta que no existe
- **THEN** termina con código distinto de cero y un mensaje claro, sin levantar servidores

#### Scenario: Prueba desconocida
- **WHEN** se pide una prueba que no existe
- **THEN** termina con código distinto de cero y lista las pruebas disponibles

#### Scenario: Pruebas que necesitan Postgres de prueba
- **WHEN** se piden pruebas que solo funcionan con Postgres (`grupos`, `ingles-pro`) sin `--pg`
- **THEN** se marcan como OMITIDAS en el resumen, con el motivo

#### Scenario: Modo Postgres de prueba
- **WHEN** se corre con `--pg` y `SUPABASE_URL` / `SUPABASE_SERVICE_KEY` en el entorno
- **THEN** el servidor usa `STALD_TABLAS=stald_test_` (nunca `stald_`), los datos se migran a esas tablas antes de
  cada fase, y al terminar (también si falla o se interrumpe) las tablas `stald_test_*` quedan vacías

#### Scenario: Tablas de prueba en uso
- **WHEN** se corre con `--pg` y `stald_test_*` ya tiene filas (otra corrida podría estar usándolas)
- **THEN** termina con código distinto de cero sin tocar las tablas, salvo que se pase `--pg-vaciar`

### Requirement: Sesión de prueba en E2E
Las E2E SHALL autenticarse con la sesión de prueba (`localStorage.stald_sesion_prueba = {email, token:'prueba:'+email}`
en el navegador y `Authorization: Bearer prueba:<correo>` en las llamadas directas), que el servidor acepta solo
cuando corre con `ROWS_FIXTURE`. Las pruebas de juegos SHALL seguir pasando cuando termine la transición del
inicio de sesión (`LOGIN_TRANSICION_HASTA` en el pasado).

#### Scenario: Juegos después de la transición
- **WHEN** el servidor corre con `LOGIN_TRANSICION_HASTA` en el pasado
- **THEN** las E2E de juegos siguen entrando con la sesión de prueba

