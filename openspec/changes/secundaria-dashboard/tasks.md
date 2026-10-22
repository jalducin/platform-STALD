## 0. Rama (OBLIGATORIO)

- [x] 0.1 Crear y usar la rama `feature/secundaria-dashboard` desde `origin/main`, después del merge del PR #223
  (rebase sobre `main` con #224 y #227)

## 1. Reglas puras (TDD)

- [x] 1.1 Pruebas que fallan (`server/secundaria_tablero_test.ts`):
  - día de la clase, estado de la tarjeta, «Hoy te toca», progreso de la semana, racha;
  - promedio por materia, Mis materias (orden, mundos y etapa actual), último tema, horario de 7 días, materia;
  - contrato de `/secundaria/actividades` (alumna y admin con `?alumna=`)
- [x] 1.2 `comun/secundaria-datos.js` (reusa `comun/gamificacion.js` del cambio `gamificacion-nucleo`)

## 2. Frontend

- [x] 2.1 `ingles/secundaria.js`:
  - pestañas Inicio, Esta semana, Mi horario, Mis materias (y Resultados del admin) con hash;
  - carga de `/perfil` y de la vista del admin;
  - día de la clase en Hoy, Semana y Horario
- [x] 2.2 `ingles/secundaria-inicio.js`:
  - tablero RPG: barra de nivel, misión principal, retos diarios, indicadores, actividad reciente, promedios,
    insignias y accesos;
  - Mis materias con su camino de mundos; selector del admin
- [x] 2.3 `ingles/secundaria.css` (botones reales, pestañas, tablero RPG en claro y oscuro) y `estilos/materias.css`
  (movido de `ingles/ingles.css`)
- [x] 2.4 `index.html`: bloque «🗓️ Mi horario» (7 días, «Hoy te toca», botones)
- [x] 2.5 `ingles.html` e `index.html`: scripts y estilos nuevos con `?v=`; `ingles.css?v=7`, `secundaria.js?v=5`

## 3. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [x] 3.1 E2E que abrían la lista directo:
  - `#semana` en `secundaria-clases`, `autoguardado` y `peticiones`;
  - `#semana` / `#resultados` en `examen-secundaria`;
  - `#sec-inicio` en `login` y `portal`
- [x] 3.2 E2E nueva `secundaria-dashboard` (registrada en `tests/e2e/correr.sh`, fase `ingles`):
  - la alumna envía 3 clases por la API en la copia temporal;
  - Inicio (retos, estados, progreso, racha, XP, insignias, misión, actividad, promedios, accesos), botones de 44 px
    o más, foco visible, Mis materias;
  - abrir y volver de una clase, escritorio, admin y portal (claro y oscuro, 360 px)

## 4. Pruebas y verificación de estado (OBLIGATORIO)

- [x] 4.1 `deno test -A server/`, `deno check server/main.ts`, `deno lint server/` (subagente `verificador-pruebas`)
- [x] 4.2 E2E de Secundaria, portal, login y peticiones con una copia temporal del repo de datos y `--hoy 2026-10-27`
  (puertos 8901/8902). Sin escribir en tablas `stald_` y sin push de datos. Revisar las capturas
- [x] 4.3 Reporte `openspec/changes/secundaria-dashboard/reports/2026-10-21-step-4-pruebas-y-verificacion.md`

## 5. Verificación manual — EL AGENTE EJECUTA (OBLIGATORIO)

- [x] 5.1 Capturas a 360 px en claro y oscuro (Inicio, Mis materias, admin y portal) y en escritorio, revisadas por el
  agente
- [ ] 5.2 Producción tras el merge, solo lectura:
  - `/salud`;
  - `ingles.html` con `secundaria-inicio.js`, `secundaria.css` y `gamificacion.js` publicados;
  - `index.html` con el bloque del horario

## 6. Documentación (OBLIGATORIO)

- [x] 6.1 `docs/frontend-standards.md` (tablero de Secundaria, Mis materias, portal, botones, día de la clase),
  `docs/pruebas.md` (E2E nueva) y `README.md`. `docs/backend-standards.md` no cambia (no cambia el contrato)

## 7. Cierre

- [x] 7.1 Revisión `revisor-solo-lectura` y sus hallazgos atendidos
- [ ] 7.2 Merge de `main` (PR #225 si ya entró) con `?v=` por encima, PR, checks y merge
- [ ] 7.3 `openspec archive secundaria-dashboard` (cuando el profe lo vea en el celular)
