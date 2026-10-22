## 0. Rama (OBLIGATORIO)

- [x] 0.1 Crear y usar la rama `feature/ingles-ocultar-grupos` (worktree aparte, desde `main`)

## 1. Base de datos

- [x] 1.1 `supabase/migrations/002_stald_grupos_oculto_admin.sql`: `oculto_admin boolean not null default false` en
  `stald_grupos` y `stald_test_grupos`, idempotente
- [x] 1.2 Aplicarla en *Portafolio* con `supabase db query --linked` (flujo de `001`) antes del merge; verificar la
  columna y que ningún grupo quedó oculto (todos `false`)

## 2. Servidor (TDD)

- [x] 2.1 Pruebas que fallan (`server/ocultar_grupos_test.ts`): ocultar/mostrar solo admin (403 alumna, 401 sin
  sesión), 400 `grupo_inexistente` / `oculto_invalido` / `json_invalido`, `sinCambio`, editar el grupo no toca la
  bandera, `GET /ingles/grupos` con `ocultoAdmin`; `/ingles/resumen` sin el grupo oculto por omisión y con él con
  `ocultos=1` o `grupo=<oculto>`; alumna del grupo oculto: `/ingles/data`, `/ingles/actividades` (grupo, horario y
  Meet sin la bandera) y una entrega que se guarda
- [x] 2.2 `server/grupos.ts`: `oculto_admin` en `Grupo`, `ocultoAdmin` en `GET`, ruta `/ocultar`, `grupoOcultoAdmin`
- [x] 2.3 `server/resumen.ts` y `server/main.ts`: filtro de grupos ocultos con `ocultos=1` y `ocultos` en la respuesta

## 3. Frontend (cambios mínimos)

- [x] 3.1 `ingles/admin.js`: `ocultoEnPanel`, interruptor «Mostrar grupos ocultos (N)», botón «👁️ Ocultar del panel» /
  «Mostrar en el panel», filtro en Registro, selector y ranking
- [x] 3.2 `ingles/tablero.js` (names y `ocultos=1` en el resumen), `ingles/comun.js` (conteo de «Esta semana»),
  `ingles/app.js` (eventos); `?v=` en `ingles.html`
- [x] 3.3 `ingles/presentacion.js`: guion y retroalimentación del Meet sin grupos ocultos; el interruptor se apaga
  solo cuando ya no queda ningún grupo oculto (hallazgos de `revisor-solo-lectura`, diseño §3 y §4)
- [x] 3.4 E2E `ocultar-grupos`: conteo «con intentos» de «Esta semana», guion del Meet, selector que vuelve a «Todos
  los grupos» al apagar el interruptor, interruptor apagado tras mostrar el último grupo, y ranking comparado con
  `/juegos/admin/resumen`

## 4. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [x] 4.1 Revisar `grupos_test`, `resumen_test`, `baja_ingles_test` y E2E `grupos` / `ingles-pro`
- [x] 4.2 E2E nueva `e2e-ocultar-grupos` (fase `grupos`, `--pg`): ocultar, desaparece de cada vista, interruptor,
  mostrar; alumna del grupo oculto entra, ve su grupo y entrega; registrar en `tests/e2e/correr.sh`
- [x] 4.3 `tests/e2e/lib/postgrest-falso.ts`: PostgREST falso en memoria (reusa `server/test_postgrest.ts`) para correr
  las fases `--pg` sin llaves ni tablas reales

## 5. Pruebas y verificación de estado (OBLIGATORIO)

- [x] 5.1 `deno test -A server/` (subagente `verificador-pruebas`), `deno check server/main.ts`, `deno lint server/`
- [x] 5.2 E2E `ocultar-grupos`, `grupos` e `ingles-pro` con `--pg` contra el PostgREST falso, copia temporal de datos y
  puertos 8941/8942 (nunca tablas `stald_` reales); revisar capturas
- [x] 5.3 Reporte `openspec/changes/ingles-ocultar-grupos/reports/2026-10-22-step-5-pruebas-y-verificacion.md`

## 6. Verificación manual — EL AGENTE EJECUTA (OBLIGATORIO)

- [x] 6.1 Servidor local con PostgREST falso: `curl` de ocultar/mostrar (admin 200, alumna 403, sin sesión 401, grupo
  inexistente 400, `oculto` inválido 400), resumen con y sin `ocultos=1`, alumna del grupo oculto con su actividad;
  estado restaurado (bandera en `false`). Hecho: 401/403/400/400/400/200/`sinCambio`; resumen 4 filas y `ocultos: 1`
  (5 con `ocultos=1`); Marisol (grupo oculto) con su grupo y `accesos.ingles: true`; tablas de prueba vacías al final
- [ ] 6.2 Producción tras el merge, solo lectura: `/salud`, `ingles.html` con los `?v=` nuevos, `POST
  /ingles/grupos/ocultar` sin sesión → 401 y columna `oculto_admin` en `false` para todos (no se oculta ningún grupo)

## 7. Documentación (OBLIGATORIO)

- [x] 7.1 `docs/data-model.md` (`oculto_admin`, migración `002`), `docs/backend-standards.md` (contrato de la ruta y
  filtro del resumen), `docs/frontend-standards.md` (interruptor y botón) y `docs/pruebas.md` (E2E nueva y PostgREST
  falso)

## 8. Cierre

- [ ] 8.1 Merge de `main` antes del PR (rediseño RPG en paralelo), revisión `revisor-solo-lectura`, PR, checks y merge
- [ ] 8.2 `openspec archive ingles-ocultar-grupos` (cuando el profe lo indique)
