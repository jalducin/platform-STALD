## 0. Rama (OBLIGATORIO)

- [x] 0.1 Crear y usar la rama `feature/secundaria-sin-notion-v2` desde `origin/main` (worktree aparte); el PR 2 va en
  `feature/secundaria-sin-notion-ux` desde `main` ya con el hotfix

## 1. PR 1 (hotfix) — Identidad sin Notion (servidor)

- [x] 1.1 Pruebas que fallan (`server/secundaria_sin_notion_test.ts`): registro con `secundaria: true` (también de baja
  de Inglés), `slugSecundaria`, clases exclusivas dan acceso, con registro no se consulta Notion, caída a Notion con
  aviso, Notion falla o sin token → `[]` sin lanzar, contenido ilegible → sigue con la marca
- [x] 1.2 `server/secundaria_registro.ts`: `filasDeRegistro`, `slugsExclusivos`, `filasSecundaria` (caída temporal),
  `identidadSecundaria`, `alumnasSecundaria`, `slugSecundariaDe`
- [x] 1.3 `server/main.ts`: `filasSecundaria()` (registro + exclusivos visibles + caída con aviso ≤ 1 cada 10 min) en
  `/perfil`, `/secundaria/actividades`, `/juegos/…`, `/juegos/registro` y `esDeClase`; `/data` queda como historial
- [x] 1.4 Pruebas de `main` sin Notion (`server/secundaria_sin_notion_main_test.ts`): `/perfil` 200 con
  `accesos.secundaria`, `/secundaria/actividades` 200 para Sofy (de baja de Inglés) y 403 para otra persona, admin con
  `alumnas` y `?alumna=`, Juegos `a-sofy`

## 2. PR 1 (hotfix) — Vista del profe y marca (servidor)

- [x] 2.1 Pruebas que fallan: alumna con slug del registro y `slugSecundaria` heredado; otra alumna sin el exclusivo
  (404 por id); correo sin Secundaria 403; admin con `alumnas` sin correos; `?alumna=` con su vista; slug desconocido
  404; POST con `?alumna` no escribe a su nombre; `armarPerfil` con filas del registro; marca solo admin, reversible,
  guarda `slugSecundaria` de Notion si difiere; `GET /ingles/alumnos` con `secundaria`
- [x] 2.2 `Identidad.slug?` y `handleActividades` con `quien.slug ?? slugAlumno(alumno)` (`server/actividades.ts`)
- [x] 2.3 `handleSecundaria`: identidad, `alumnas` y `?alumna=<slug>` de solo lectura
- [x] 2.4 `handleSecundariaAlumno` (`server/alumnos.ts`) en `POST /ingles/grupos/secundaria`

## 2b. Hotfix 2 — Slug canónico desde el contenido

- [x] 2b.1 Pruebas que fallan: `slugsExclusivos` da `alias → primero del arreglo`; Sofy (slug `sofy`) entra como
  `sofia`, también con la marca; `slugSecundaria` manda; sin alias, el de su nombre; en `main` ve su resultado
  anterior guardado bajo `sofia` y el admin la lista como `sofia`
- [x] 2b.2 `filasDeRegistro` y `slugsExclusivos` (`server/secundaria_registro.ts`) con el slug canónico y la
  salvaguarda (mismas 3 letras, no el slug propio de otra entrada); prueba `["sofia","ana"]` y prueba de que el intento
  nuevo queda junto al anterior; skill `clases-secundaria`: el canónico va primero (espejos sincronizados)
- [x] 2b.3 Suite completa, revisor rápido, PR, merge y verificación en producción (solo lectura)

## 3. PR 1 (hotfix) — Frontend mínimo

- [x] 3.1 `secundaria.html`: puente a `ingles.html?modo=secundaria` con la query y el hash (`location.replace`) y
  `<noscript>` con enlace; sin `/data` ni textos de Notion

## 4. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [x] 4.1 `e2e-portal`: Secundaria abre «📚 Mis clases» (no el tablero de Notion)
- [x] 4.2 `e2e-login`: Secundaria manda el token a `/secundaria/actividades` y no pide `/data`
- [x] 4.3 `server/secundaria_test.ts`, perfil, Juegos, registro y baja siguen pasando con la firma nueva
- [ ] 4.4 PR 2: E2E nueva `e2e-secundaria-sin-notion` (perfil con horario, botones, vista del profe con la marca
  «🏫 Secundaria», 360 px claro/oscuro) registrada en `tests/e2e/correr.sh`

## 5. Pruebas y verificación de estado (OBLIGATORIO)

- [x] 5.1 PR 1: `deno test -A server/` (subagente `verificador-pruebas`: 937 pasan, 0 fallan), `deno check
  server/main.ts`, `deno lint server/`
- [x] 5.2 PR 1: E2E `examen-secundaria`, `secundaria-clases`, `portal` y `login` con la copia temporal del repo de
  datos (`--puerto-api 8897 --puerto-web 8898 --hoy 2026-10-27`); sin `--pg`
- [x] 5.3 Estado: sin push al repo de datos, sin escribir en tablas `stald_`; copia temporal borrada al terminar
- [x] 5.4 Reporte `openspec/changes/secundaria-sin-notion/reports/2026-10-22-step-5-pruebas-y-verificacion.md`
- [ ] 5.5 PR 2: suite completa y E2E de UX con capturas

## 6. Verificación manual — EL AGENTE EJECUTA (OBLIGATORIO)

- [x] 6.1 Servidor local con la copia, sin `NOTION_TOKEN` (curl): alumna con exclusivos 200; admin 200 con `alumnas`;
  `?alumna=` 200; `?alumna=nadie` 404; correo sin Secundaria 403; sin sesión 401; `/perfil` 200
- [ ] 6.2 Producción tras el merge del PR 1, solo lectura: `/salud`, `/perfil` y `/secundaria/actividades` sin sesión →
  401 (no 500), `secundaria.html` publicado con el puente

## 7. Documentación (OBLIGATORIO)

- [x] 7.1 PR 1: proposal, design, specs y tasks de este cambio con el diseño real (registro `alumnos.json`, dos PR)
- [x] 7.2 PR 1: `docs/data-model.md` (campos `secundaria` y `slugSecundaria`; base «📖 Clases» como historial),
  `docs/backend-standards.md` (identidad de Secundaria y caída), `docs/deno-deploy-setup.md` (`NOTION_TOKEN` opcional,
  no borrarlo), contexto de `openspec/config.yaml`
- [ ] 7.3 PR 2: `docs/frontend-standards.md`, `docs/pruebas.md`, `README.md`, `openspec/project.md`
- [x] 7.4 Skills: no hay skill de Secundaria en `ai-specs/skills` (no hace falta sincronizar espejos)

## 8. PR 2 — Experiencia (después del hotfix)

- [ ] 8.1 Registro del admin (`ingles/admin.js`): «🏫 Secundaria: sí/no» por persona (también en «De baja de Inglés»)
- [ ] 8.2 Vista del profe (`ingles/secundaria.js`): «👀 Como la ve…», «🗓️ Su horario», «📊 Resultados» y selector
- [ ] 8.3 Secundaria: encabezado «Hola, …» con fecha y lo de hoy, tarjetas con estado (pendiente / hecha con
  calificación / vence mañana), acción principal grande, progreso de la semana, vacío amable
- [ ] 8.4 Portal (`index.html`): «🗓️ Mi horario» en el perfil de quien tiene Secundaria con «Hoy te toca: …» y botón
- [ ] 8.5 Botones reales (≥ 44 px, hover/focus/disabled) en Secundaria y el perfil; 360 px y claro/oscuro

## 8b. PR 2a — Clase interactiva

Rama `feature/secundaria-clase-interactiva`. El dashboard, «Mis materias» y el horario en el perfil van en el PR del
otro agente.

- [x] 8b.1 `ingles/secundaria-clase.js` (archivo nuevo, para no chocar con el PR del dashboard): vista de la clase en modo Secundaria con indicador de pasos (Teoría, Video,
  Ejercicios, Libreta; `aria-current="step"` con IntersectionObserver), videos de YouTube incrustados
  (`youtube-nocookie`, `loading="lazy"`, enlace de respaldo), libreta con «✅ Ya la hice» (localStorage con try/catch)
- [x] 8b.2 `ingles/reproductor.js`: en modo Secundaria, `openItem` usa la vista por pasos y `showResult` agrega la
  libreta y «Siguiente clase»; Inglés igual
- [x] 8b.3 `ingles/ingles.css` (`?v=` nuevo): pasos, video 16:9, libreta y acciones ≥ 44 px, foco visible, claro/oscuro,
  360 px
- [x] 8b.4 E2E `e2e-secundaria-clase` (registrada en `tests/e2e/correr.sh`, `--hoy 2026-10-27`): pasos y
  `aria-current`, iframes `youtube-nocookie` lazy, casilla que persiste al recargar, resultado con temas y «Siguiente
  clase» que abre otra clase, Inglés sin pasos; 360 px claro/oscuro sin scroll horizontal; capturas
- [x] 8b.6 Estilo «RPG educativo» (referencia del profe): textos «Misión», banner «⚔️ Misión» con materia y mundo,
  y en el resultado «+N XP», nivel e insignia nueva con `comun/gamificacion.js` del PR del dashboard (merge de `main`
  cuando esté; sin duplicar fórmulas)
- [ ] 8b.5 Suite completa, E2E de Secundaria e Inglés afectadas, `revisor-solo-lectura`, PR, checks, merge y
  verificación en producción; docs (`docs/frontend-standards.md`, `docs/pruebas.md`)

## 9. Cierre y seguimiento

- [ ] 9.1 Seguimiento: quitar la caída a Notion de `filasSecundaria` (Notion ya está borrado)
- [ ] 9.2 Revisión `revisor-solo-lectura` antes de cada PR; checks y merge; borrar ramas remotas
- [ ] 9.3 `openspec archive secundaria-sin-notion` después de archivar `secundaria-mis-clases`; quitar de la spec viva
  el escenario «Enlace desde Secundaria»
