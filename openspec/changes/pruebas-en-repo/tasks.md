## 0. Rama (OBLIGATORIO)

- [x] 0.1 Crear y usar la rama `feature/pruebas-en-repo`

## 1. Pruebas E2E en el repo

- [ ] 1.1 `tests/e2e/package.json` (playwright como devDependency) e instalar
- [ ] 1.2 `tests/e2e/lib/entorno.js`: variables por omisión, carpeta `salida/`, sesión de prueba en `fetch`
- [ ] 1.3 Copiar las E2E vigentes (integración Sprint 2 + 3 y batería de juegos), sin rutas absolutas ni puertos
  fijos; juegos con `stald_sesion_prueba`
- [ ] 1.4 `tests/fixtures/rows-fixture.json` (revisar: solo `@example.com`) y `tests/e2e/salida/` en `.gitignore`
- [ ] 1.5 Revisar que no haya correos reales, llaves ni rutas absolutas en `tests/`

## 2. Orquestador

- [ ] 2.1 `tests/e2e/correr.sh`: `--datos`, `--pg`, puertos, `--lista`, fases, resumen, `trap` de limpieza

## 3. CI

- [ ] 3.1 `.github/workflows/pruebas.yml` (test, check y lint con `denoland/setup-deno@v2`) y validar el YAML

## 4. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [ ] 4.1 Las pruebas unitarias no cambian; confirmar que la suite sigue igual (sin pruebas nuevas en `server/`)

## 5. Pruebas y verificación de estado (OBLIGATORIO)

- [ ] 5.1 `deno test -A server/`, `deno check server/main.ts` y `deno lint server/` en verde
- [ ] 5.2 Capturar el estado previo: `stald_test_*` vacías y carpeta de datos del scratchpad sin cambios
- [ ] 5.3 Reporte `openspec/changes/pruebas-en-repo/reports/2026-10-04-step-5-pruebas-y-verificacion.md`

## 6. Verificación manual — CLI — EL AGENTE EJECUTA (OBLIGATORIO)

- [ ] 6.1 `correr.sh` con casos inválidos: sin `--datos`, ruta inexistente, prueba desconocida, `--pg` sin llaves
- [ ] 6.2 `correr.sh` en puertos 8817/8795: login, portal, juegos, partidas, una-sala, póker, cartas-españolas,
  ajedrez y la batería de juegos
- [ ] 6.3 `correr.sh --pg` con las de Inglés (`stald_test_*`) y comprobar que las tablas quedan vacías
- [ ] 6.4 Juegos con `LOGIN_TRANSICION_HASTA` en el pasado (sesión de prueba)
- [ ] 6.5 Confirmar servidores apagados y copia de datos borrada

## 7. Documentación (OBLIGATORIO)

- [ ] 7.1 `docs/pruebas.md` (unitarias, E2E, convenciones, sesión de prueba, `stald_test_*`, limpieza, por qué no
  en CI) y una línea en el índice del README
