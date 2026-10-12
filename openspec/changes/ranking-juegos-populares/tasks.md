## 0. Rama (OBLIGATORIO)

- [x] 0.1 Crear y cambiar a `feature/ranking-juegos-populares` desde `origin/main` (tras `git fetch`)

## 1. Servidor

- [ ] 1.1 Pruebas que fallan en `server/ranking_juegos_test.ts`:
  - agregado puro: jugadores distintos, partidas individuales y de sala, juego desconocido ignorado, mejor puntaje;
  - orden y desempates (jugadores → partidas → título);
  - sala con bots: solo cuentan las personas;
  - semana vacía (`juegos: []`);
  - ruta: 403 `no_registrado`, 400 `semana_invalida`, `?semana=` anterior y sin correos;
  - caché: la segunda petición no lee el almacén y una partida nueva refresca el top.
- [ ] 1.2 `server/juegos.ts`: `juegosPopulares`, memo en `WeakMap`, `leerSemana` con `leerCarpeta` y ruta
  `GET /juegos/ranking/juegos`
- [ ] 1.3 `server/http_cache.ts`: la ruta nueva con la política de `/juegos/ranking` (y su prueba)

## 2. Página

- [ ] 2.1 `juegos.html`: sub-pestaña «🔥 Juegos» (`data-rtipo="juegos"`), `pintarRankingJuegos`, barra, vacío
  amable y estilos a 390 px

## 3. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [ ] 3.1 `server/juegos_test.ts`, `server/cache_main_test.ts` y `server/http_cache_test.ts` siguen en verde
- [ ] 3.2 E2E nueva `tests/e2e/e2e-ranking-juegos.js`, registrada en `tests/e2e/correr.sh` (fase `base`):
  - varias personas juegan juegos distintos (individual y una sala de Conquián con bots);
  - la pestaña «🔥 Juegos» muestra el orden y los números del servidor, con el desempate;
  - capturas a 390 px y en escritorio, sin desborde horizontal.

## 4. Ejecutar pruebas y verificar estado (OBLIGATORIO)

- [ ] 4.1 `npx -y deno test -A server/`, `npx -y deno lint server/` y `npx -y deno check server/main.ts`
- [ ] 4.2 E2E `ranking-juegos juegos partidas puntos-tipo juegos-recarga peticiones` con la copia de datos (la
  original no se modifica; `correr.sh` trabaja sobre una copia) en los puertos 8977 / 8955
- [ ] 4.3 Reporte en
  `openspec/changes/ranking-juegos-populares/reports/2026-10-11-step-4-pruebas-y-verificacion.md`

## 5. Verificación manual (OBLIGATORIO) — EL AGENTE EJECUTA

- [ ] 5.1 Servidor local con una copia de datos, usando `curl`: top de la semana, `?semana=` vacía, semana
  inválida, sin registro, sin correos y `ETag` / 304
- [ ] 5.2 Revisar las capturas a 390 px y en escritorio

## 6. Documentación técnica (OBLIGATORIO)

- [ ] 6.1 `docs/backend-standards.md`: ruta `/juegos/ranking/juegos` y su caché HTTP
- [ ] 6.2 `docs/frontend-standards.md`: sub-pestaña «🔥 Juegos»
- [ ] 6.3 `npx -y @fission-ai/openspec@1.4.1 validate ranking-juegos-populares --strict`
- [ ] 6.4 Tras el merge (integrador): verificar en producción y `openspec archive`
