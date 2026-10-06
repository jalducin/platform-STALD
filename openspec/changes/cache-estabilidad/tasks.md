## 0. Rama (OBLIGATORIO)

- [x] 0.1 Crear y usar la rama `feature/cache-estabilidad` desde `origin/main`

## 1. Medir la línea base

- [x] 1.1 `tests/e2e/e2e-peticiones.js` (registrada en `ORDEN` de `correr.sh`, fase `base`): proxy que cuenta
  peticiones al API (con `OPTIONS`) e inyecta fallas; flujos portal, navegación, juegos + 1 individual, ranking,
  sala de 2 personas 30 s, Inglés alumna y admin, abrir un examen; pruebas de estabilidad (503 pasajero, red caída
  en la sala, pestaña oculta)
- [x] 1.2 Correrla con `MEDIR=1` sobre el código de `main` y guardar la tabla en el reporte (las pruebas de
  estabilidad deben fallar: TDD en rojo)

## 2. Pruebas primero (TDD)

- [x] 2.1 `server/cache_test.ts`: vigencia, single-flight, copia vieja ante error (y su límite), `borrar` durante
  una carga en vuelo, tope de entradas, `unaALaVez`
- [x] 2.2 `server/http_cache_test.ts`: política por ruta, ETag estable, 304 con `If-None-Match` (también lista y
  `*`), sin política en 4xx/5xx ni en `POST`, encabezados CORS en el 304
- [x] 2.3 `server/store_test.ts`: dos lecturas simultáneas de `GitHubStore` hacen un solo `fetch`; tras `put`, una
  lectura nueva no reutiliza la que estaba en vuelo
- [x] 2.4 `server/cache_main_test.ts`: `handler` responde `/config` con `max-age=600`, `/perfil` con `no-store` y sin
  `ETag`, y el ranking con 304 cuando corresponde
- [x] 2.5 Correr las pruebas nuevas y confirmar que fallan

## 3. Servidor

- [x] 3.1 `server/cache.ts` (`crearMemo`, `unaALaVez`)
- [x] 3.2 `server/http_cache.ts` (`politicaCache`, `aplicarCacheHttp`) y su uso en `handler`
- [x] 3.3 `main.ts`: `loadRows` y `resolveUser` en caché; invalidación al marcar «Completado»; `leerMarcas` con
  single-flight
- [x] 3.4 Single-flight en `GitHubStore.leer`, `cached` de actividades y `leerSemana` de Juegos

## 4. Cliente

- [x] 4.1 `comun/auth.js`: `cache: 'default'` en `fetchConSesion` y `/config`; `pedirJson` (en vuelo, `ttl`,
  reintentos de `GET`, vaciar tras envíos), `limpiarCache`, vaciar en `salir`; `auth.js?v=5` en las 4 páginas
- [x] 4.2 `juegos.html`: `api()` con `pedirJson`, ranking con `ttl` 30 s, sondeo de salas resistente (espera
  creciente, aviso «📶 Reconectando…», consulta al volver a la pestaña), `datos()` olvida la promesa fallida
- [x] 4.3 `ingles/comun.js`: `api()` con `pedirJson`

## 5. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [x] 5.1 Revisar las E2E que dependen de cuántas peticiones o del sondeo (`partidas`, `una-sala`, `juegos-recarga`,
  `login`, `login-despues`, `portal`) y las unitarias de `store_test.ts` y `juegos_test.ts`; fijar los umbrales de
  `e2e-peticiones.js` con la medición nueva

## 6. Pruebas y verificación de estado (OBLIGATORIO)

- [x] 6.1 `npx -y deno test -A server/`, `npx -y deno lint server/` y `npx -y deno check server/main.ts`
- [x] 6.2 E2E completa con `correr.sh` (puertos 8857/8835, copia de los datos; la carpeta original no se toca): todas
  en verde, las de `--pg` omitidas
- [x] 6.3 Reporte en `openspec/changes/cache-estabilidad/reports/2026-10-06-step-6-pruebas-y-verificacion.md` con la
  tabla antes/después

## 7. Verificación manual — EL AGENTE EJECUTA (OBLIGATORIO)

- [x] 7.1 API con `curl` contra el servidor local: `/config` (`max-age=600`), ranking con y sin `If-None-Match`
  (200 → 304), `/perfil` sin `ETag`, `OPTIONS` con `Access-Control-Max-Age`. Estado: servidor local sobre copia
  temporal, se apaga al terminar
- [x] 7.2 UI: la E2E `peticiones` recorre los flujos en el navegador y prueba 503 pasajero, red caída y pestaña oculta
- [ ] 7.3 Tras el merge (lo hace el usuario): abrir Juegos publicado y revisar en DevTools que el sondeo de una sala
  ya no paga un `OPTIONS` por consulta

## 8. Documentación (OBLIGATORIO)

- [x] 8.1 `docs/backend-standards.md`: caché HTTP por ruta, single-flight y caché de Notion (fuente canónica de las
  reglas del servidor)
- [x] 8.2 `docs/frontend-standards.md`: `cache: 'default'`, `pedirJson` y sondeo resistente (fuente canónica de las
  reglas del cliente), enlazando al diseño sin copiarlo

## 9. Archivo

- [ ] 9.1 `openspec archive cache-estabilidad` después del merge (lo integra el usuario)
