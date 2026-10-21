## 0. Rama (OBLIGATORIO)

- [x] 0.1 Crear y usar la rama `feature/ingles-baja-alumno` (worktree aparte, desde `main`)

## 1. Servidor

- [x] 1.1 Pruebas que fallan (`server/baja_ingles_test.ts`): baja y reactivar solo admin (403), 404 sin registro,
  idempotencia, sin borrar resultados; `/ingles/data`, `/ingles/resumen` y `/ingles/actividades` sin la persona de
  baja; ella recibe `baja: true` y 403 `baja_ingles`; `/perfil` con `accesos.ingles: false`; Juegos con el mismo jugador
- [x] 1.2 `server/alumnos.ts`: `baja` en `AlumnoRegistrado`, `sinBajas`, `enBajaIngles`, `handleBajaIngles`, `baja`
  en `GET /ingles/alumnos`
- [x] 1.3 `server/main.ts`: rutas `/ingles/grupos/baja` y `/reactivar` antes de exigir la base; `filasInglesActivas`
  en data, resumen y actividades; perfil sin Inglés

## 2. Frontend

- [x] 2.1 `ingles/admin.js`: «🚪 Baja de Inglés» con confirmación, sección «🗂️ De baja de Inglés» con «↩️ Reactivar»,
  conteos solo de activos
- [x] 2.2 `ingles/app.js`: eventos y aviso amable a la alumna de baja con enlace a `ingles.html?modo=secundaria`;
  `?v=` en `ingles.html`

## 3. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [x] 3.1 Revisar `alumnos_test`, `auth_main_test`, `cache_main_test` y E2E `alta-alumnos` (conteo de la lista)
- [x] 3.2 E2E nueva `e2e-baja-ingles` (fase `ingles`, sin `--pg`): baja con confirmación, fuera del tablero, aviso a
  la alumna, Juegos igual, reactivar; registrar en `tests/e2e/correr.sh`

## 4. Pruebas y verificación de estado (OBLIGATORIO)

- [x] 4.1 `deno test -A server/` (subagente `verificador-pruebas`), `deno check server/main.ts`, `deno lint server/`
- [x] 4.2 E2E `baja-ingles` y `alta-alumnos` con copia temporal de datos (sin push, sin tablas `stald_`), puertos
  8895/8896; revisar capturas
- [x] 4.3 Reporte `openspec/changes/ingles-baja-alumno/reports/2026-10-21-step-4-pruebas-y-verificacion.md`

## 5. Verificación manual — EL AGENTE EJECUTA (OBLIGATORIO)

- [x] 5.1 Servidor local con copia de datos: baja/reactivar admin 200, alumna 403, correo inexistente 404, JSON
  inválido 400; estado de `alumnos.json` igual al inicial al terminar
- [ ] 5.2 Producción tras el merge, solo lectura: `/salud`, `ingles.html` con los `?v=` nuevos y `POST
  /ingles/grupos/baja` sin sesión → 401 (no se da de baja a nadie)

## 6. Documentación (OBLIGATORIO)

- [x] 6.1 `docs/data-model.md` (`baja`), `docs/backend-standards.md` (contrato de las rutas), `docs/frontend-standards.md`
  (botón y aviso) y `docs/pruebas.md` (E2E nueva)

## 7. Cierre

- [ ] 7.1 Revisión `revisor-solo-lectura`, PR, checks y merge
- [ ] 7.2 `openspec archive ingles-baja-alumno` (cuando el profe lo indique)
