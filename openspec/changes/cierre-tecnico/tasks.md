## 0. Rama (OBLIGATORIO)

- [x] 0.1 Crear y usar la rama `feature/cierre-tecnico`

## 1. Servidor (TDD)

- [x] 1.1 Pruebas que fallan:
  - prefijos de `PgStore`;
  - errores sin respaldo;
  - `importarNotion`.
- [x] 1.2 Implementar en `PgStore`:
  - prefijos;
  - quitar el respaldo;
  - marcas en `main.ts`.
- [x] 1.3 Fase 1: importar identidades de Notion en `GET /ingles/alumnos` (admin)
- [x] 1.4 `migrar-ingles.ts --juegos`

## 2. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [x] 2.1 Ajustar las pruebas del respaldo de `PgStore` y dejar la suite completa en verde

## 3. Pruebas y verificación de estado (OBLIGATORIO)

- [x] 3.1 Migrar Juegos en `stald_test_*`
- [x] 3.2 Correr los E2E de Juegos en modo Postgres de prueba
- [x] 3.3 Escribir el reporte

## 4. Producción — EL AGENTE EJECUTA (OBLIGATORIO)

- [x] 4.1 Publicar la fase 1 y la migración de Juegos:
  - no debe haber salas vigentes;
  - correr `--prueba`, la migración real y `--delta`;
  - cuadrar los conteos;
  - jugar una partida de prueba y borrarla.
- [ ] 4.2 Importar Notion: el profe abre Inglés y se verifica en la base que el registro tenga a todas las personas
  con correo
- [ ] 4.3 Fase 2 (Inglés sin Notion), cambio post-apply (ver design §4 «Fase 2»):
  - [x] 4.3.0 Crear y usar la rama `feature/ingles-sin-notion-fase2` desde `origin/main` (OBLIGATORIO, primero)
  - [x] 4.3.1 Actualizar design, spec y tasks; validar con `openspec validate cierre-tecnico --strict`
  - [ ] 4.3.1b Deltas de las specs vivas que describían tareas de Notion de Inglés: REMOVED en `notion-data-api`,
    `actividades-online`, `ingles` y `dashboard-ingles` («Marcar hecha»); MODIFIED «Últimas 5 calificaciones»
  - [ ] 4.3.2 Línea base: correr la suite E2E completa sobre `origin/main` y guardar PASS/FAIL por prueba
  - [ ] 4.3.3 Pruebas que fallan (TDD) — revisar y actualizar pruebas existentes (OBLIGATORIO):
    - `auth_main_test.ts`: identidad desde `alumnos.json`; filas de Inglés del fixture ignoradas; sin importación
      en `GET /ingles/alumnos`; `POST /ingles/data/<id>/completado` → 404;
    - `cierre_test.ts`: `filasIngles` = `aplicarAlumnos([], registro)` conserva la identidad (también `origen: "notion"`);
    - retirar las pruebas de lo que se elimina (`importarNotion`, `sinHuerfanas`, `completar_test.ts`,
      `extractInglesRow`) y pasar las de `filterForEmail` a filas de Secundaria
  - [ ] 4.3.4 Servidor: `filasIngles` solo del registro; `handleAlumnos` con `filas: () => Promise.resolve([])`;
    retirar la importación de la fase 1, la ruta `/ingles/data/<id>/completado`, `server/completar.ts` y el código
    muerto (`filasNotion`, `marcasFixture`, `parcheCompletado`, `CLASES_INGLES_DB_ID`, `extractInglesRow`,
    `sinHuerfanas`, `importarNotion`). Secundaria no cambia
  - [ ] 4.3.5 Páginas de Inglés (`ingles/*.js`): sin tareas, botones ni calificaciones de Notion; bloques del admin
    desde el registro; textos sin «Notion»
  - [ ] 4.3.6 E2E: `tests/fixtures/alumnos-ejemplo.json` con Marisol, Angel, Jesus, Laura y Fernando
    (`@example.com`, `origen: "notion"`); `correr.sh` lo combina con el `alumnos.json` de la copia (sin pisar);
    `rows-fixture.json` sin la clave `ingles`
  - [ ] 4.3.7 E2E que dependían de tareas de Notion de Inglés: actualizarlas o retirarlas y documentar cuáles y por qué
  - [ ] 4.3.8 Pruebas y verificación (OBLIGATORIO, EL AGENTE EJECUTA): `deno test -A server/`, `deno lint server/`,
    `deno check server/main.ts` y la suite E2E completa; comparar con la línea base; reporte en
    `openspec/changes/cierre-tecnico/reports/2026-10-06-step-4-3-fase2-pruebas-y-verificacion.md`
  - [ ] 4.3.9 Documentación (OBLIGATORIO): `README.md`, `docs/backend-standards.md`, `docs/data-model.md`,
    `docs/frontend-standards.md`, `docs/pruebas.md`, `openspec/config.yaml` y `openspec/project.md` sin decir que
    Inglés se alimenta de Notion
  - [ ] 4.3.10 Publicar y verificar en producción (integrador, después del merge): las personas importadas siguen
    entrando (perfil 200 con sesión o por la transición) y ven sus resultados; Secundaria sigue igual

## 5. Documentación (OBLIGATORIO)

- [x] 5.1 Actualizar `docs/data-model.md`, `docs/backend-standards.md` y `README.md`
