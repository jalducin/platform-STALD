# Reporte Step 7 — Pruebas y verificación de estado

- Fecha: 2026-10-12
- Cambio: errores-latentes
- Agente: Claude Code (Opus)

## TDD por error (prueba en rojo → arreglo → prueba en verde)

| Error | Prueba | Rojo (código anterior) | Verde |
| --- | --- | --- | --- |
| 1. Unirse responde `ok` sin guardar | `server/salas_escritura_test.ts` «unirse responde 503…» (almacén `StoreQueFalla`) | `{"ok":true,"codigo":"BADE"}` | 503 `conflicto_escritura`, sin jugador medio unido |
| 2. Empezar no revisa `store.put` | «empezar responde 503…» y «si otra petición ya la empezó…» | `ok` con un `inicio` que no se guardó / que pisaba el ajeno | 503 tras 3 intentos; responde la sala ya empezada sin reescribirla |
| Mismo patrón: crear | «crear responde 503 y no deja una sala sin anfitrión» | 200 con sala sin anfitrión | 503, sin sala ni índice |
| Mismo patrón: revancha | «revancha responde 503 con el código…» | `{"ok":true,"codigo":"DKTW"}` sin la persona dentro | 503 con `codigo`; al reintentar entra a la misma |
| 1 y 2 en la página | `e2e-ajustes-salas` (3 pasos con `page.route` → 503) | «Error conflicto_escritura», «No se pudo crear (conflicto_escritura).» y sin alerta al empezar | «No se pudo entrar a la sala, intenta de nuevo.», «No se pudo crear la partida, intenta de nuevo.», «No se pudo empezar la partida, intenta de nuevo.» con el botón activo |
| 3. `clicNaval` sin `jugadas` | `e2e-juegos-tablero` (respuesta real reenviada sin `jugadas`) | `FAIL error JS: Cannot read properties of undefined (reading 'length')` | sin error JS y el tablero sigue |
| 4. `genCalculo(NaN)` | `server/mente_calculo_test.ts` (azar con tope de 10 000 llamadas) | `no termina: más de 10000 llamadas al azar`; `genSecuencia`: `tipos[rnd(...)] is not a function`; `aleatorio is not a function` | 4/4 en verde |

Equivalencia de Cálculo y secuencias con `n` válido: huella SHA-256 de 4 800 preguntas con semilla (40 semillas ×
60 pasos, `genCalculo` y `genSecuencia`) idéntica antes y después:
`2a40d2aaaa56e1147657dc3c47110e5b4f241f99ccf0da2d58a1391ebc88bba1`.

## Comandos ejecutados

- `npx -y deno test -A server/`
- `npx -y deno check server/main.ts` y `npx -y deno lint server/` (el primer intento del PR falló en CI por `require-await` en `empezarSala`: el filtro local con `tail -1` ocultaba el aviso; se corrigió y se volvió a correr completo)
- `cd tests/calidad && node calidad.mjs --detalle` (en la rama y con los archivos de `origin/main`, para comparar)
- `CHROME=… bash tests/e2e/correr.sh --datos <copia> --puerto-api 9259 --puerto-web 9269 juegos categorias partidas
  juegos-tablero ajustes-salas salas-grandes revancha enlace-sala fusion juegos-recarga puntos-tipo`
- Verificación manual con `curl` contra un servidor local (puerto 9279, copia de datos en memoria)

## Resultados de pruebas

- Deno: 510 pasaron, 0 fallaron, 6 omitidas (las de `actividades_test.ts` sin `DATA_DIR`, como siempre); 9 nuevas.
- `deno check` y `deno lint`: sin problemas.
- Calidad: `main` 316 avisos (127 con NOSONAR) → rama 316 avisos (128 con NOSONAR: el mulberry32 de la prueba nueva,
  con su motivo). Sin avisos nuevos: el reintento de «empezar» es recursivo (`fijarInicio`) para no sumar S9382.
- E2E: 11 corridas, 11 PASS, 0 FAIL, 0 omitidas (juegos 31, categorias 49, partidas 15, enlace-sala 7, juegos-recarga
  37, revancha 20, fusion 10, puntos-tipo 8, juegos-tablero 42, ajustes-salas 12, salas-grandes 64 pasos). Las de
  Cálculo y secuencias son `fusion`, `juegos-recarga`, `puntos-tipo`, `juegos` y `categorias`.

## Verificación manual (curl, servidor local)

| Caso | Respuesta |
| --- | --- |
| Crear (Marisol) | 200 `{ codigo, sala }` |
| Unirse (Angel) | 200 `{ ok: true, codigo }` |
| Unirse a sala inexistente | 404 `sala_no_existe` |
| Unirse sin sesión | 400 `missing_email` |
| Unirse con correo no registrado | 403 `no_registrado` |
| Empezar sin ser anfitrión | 403 `solo_host` |
| Empezar (anfitrión) | 200 con `inicio` = ahora + 5 s |
| Empezar otra vez | 200 con el mismo `inicio` |
| Empezar sala inexistente | 404 `sala_no_existe` |
| Unirse a sala empezada | 409 `ya_empezo` |
| Crear como admin (sesión de prueba) | 200, anfitrión `admin` |

El 503 `conflicto_escritura` no se puede provocar con el almacén en memoria del servidor local; lo cubren las pruebas
Deno (almacén que falla a propósito) y las E2E con `page.route`.

## Verificación de estado

- Antes: copia de datos de prueba recién hecha por `correr.sh` (y otra para `curl`); ninguna tabla `stald_*` tocada
  (sin `--pg`).
- Después: las salas creadas viven solo en la memoria de los servidores de prueba.
- Estado restaurado: Sí — servidores apagados y copias descartadas (`correr.sh` borra la suya; la de `curl` se borró a
  mano). La copia original de datos no se modificó.

## Resultado

- Estado Step 7: PASS
- Bloqueos: ninguno
