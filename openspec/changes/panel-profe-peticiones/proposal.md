## Why

El profe pidió (2026-10-22, aprobado) que su panel de `ingles.html` abra más rápido, sobre todo en celular. La
auditoría `navegacion-dispositivos` midió 17–19 peticiones al abrirlo y la propuesta `navegacion-rendimiento` dejó
anotada «una petición para el panel del profe».

Línea base medida en este cambio (código de `main` 98a91d3, servidor local, PostgREST falso, `HOY_FIJO` 2026-10-27;
detalle en `reports/2026-10-22-linea-base.md`): al abrir el panel hay **15 peticiones al API (7 OPTIONS)** en **4
oleadas en cascada**, cada una esperando a la anterior:

1. `GET /config` (inicio de sesión).
2. `/ingles/actividades` y `/ingles/data` (en paralelo).
3. Solo cuando `/ingles/data` dice `isAdmin`: `/juegos/admin/resumen`, `/ingles/alumnos` y `/ingles/grupos`.
4. Solo después de dibujar: `/ingles/resumen` y `/profe/entregas` (para «📥 Por revisar»).

Tiempo hasta usable (encabezado con sus números y tablero pintados), mediana de 3: **celular 6.3 s** (360 px, red
Slow 4G de Lighthouse: 150 ms RTT, 1.6 Mbps, CPU 4×) y **PC 0.83 s** (1280 px, sin limitar). En celular cada oleada
paga otra vuelta de red y otra verificación previa (`OPTIONS`), más el dibujo con el CPU lento.

## What Changes

- **Ruta nueva `GET /ingles/panel[?grupo=<id>][&ocultos=1]`** (solo admin; 403 `solo_admin` a cualquier otra persona,
  401 sin sesión): en una respuesta, lo que la vista inicial necesita, leído **en paralelo** en el servidor:
  - `grupos`: `{ grupos (con ocultoAdmin), miembros }`, igual que `GET /ingles/grupos`;
  - `alumnos`: el registro **sin correos** (`[{ nombre, baja? }]`), solo para contar y para el filtro de grupos;
  - `resumen`: el mismo cuerpo que `GET /ingles/resumen` con los mismos `grupo` y `ocultos`;
  - `entregas`: `{ pendientes, porRevisar: [slug] }` (misiones de Inglés listas para evaluar; sin textos);
  - `fallas`: qué partes fallaron.
  Es **resiliente**: si una parte falla, esa parte trae `{ error, detalle? }` y las demás llegan (como el resumen en
  `fix-ingles-admin`); el 503 `sin_base` de los grupos (sin Postgres) viaja como `{ error: "sin_base" }` y no es falla.
- **`GET /ingles/data?incluir=panel`**: si quien pide es el admin, la respuesta trae además `panel` (el mismo cuerpo
  de `/ingles/panel`, armado en paralelo con las filas). Para cualquier otra persona el parámetro se ignora (misma
  respuesta de siempre). Así el panel abre sin la oleada 3 ni la 4: el navegador no sabe si es admin hasta esa
  respuesta.
- **Panel del profe (`ingles.html`)**:
  - Abre con `/config` → (`/ingles/actividades` ‖ `/ingles/data?incluir=panel`) → dibujo. Sin más peticiones.
  - Aviso por sección si una parte del panel falló (grupos, alumnos y alumnas, «📥 Por revisar»), con «🔄 Reintentar»
    que pide `/ingles/panel`; el resumen conserva su aviso con «🔄 Reintentar» de `fix-ingles-admin`.
  - **Perezoso**: «➕ Registro» pide `/ingles/alumnos` (con correos) al abrir esa pestaña; «🎮 Juegos» (y la línea de
    juegos en «🧑‍🎓 Alumnos» y en el cajón) pide `/juegos/admin/resumen` al abrir esa pestaña o el cajón; «📥 Entregas»
    pide la bandeja al abrirla (como ya hacía «🛡️ Nicks»). «📥 Por revisar» sale de `entregas.porRevisar` hasta que la
    bandeja se carga.
  - «👁️ Ocultar del panel» / «Mostrar en el panel» refresca grupos, resumen, alumnos y «Por revisar» con una sola
    petición a `/ingles/panel`.
  - Todas las funciones siguen: ocultar grupos, entregas, nicks, alta, baja/reactivar, quitar, mover de grupo, cajón,
    Mi ruta y presentaciones.
- **Rutas existentes sin cambio** (`/ingles/grupos`, `/ingles/alumnos`, `/ingles/resumen`, `/profe/entregas`,
  `/juegos/admin/resumen`): otras vistas, acciones y pruebas las siguen usando.
- **Presupuesto**: la E2E `peticiones` baja el tope de «inglés (admin)» de 17 al número real medido.

## Matriz de acceso

| Quién | `GET /ingles/panel` | `GET /ingles/data?incluir=panel` |
|---|---|---|
| Admin con sesión | 200 con el panel | 200 con `rows`, `isAdmin` y `panel` |
| Alumno o alumna (activo, de baja), Secundaria, invitado | 403 `solo_admin` | 200 como siempre, sin `panel` |
| Sin sesión (o `?email=` del admin) | 401 | 401 (como hoy) |

El panel no lleva correos: `alumnos` solo trae nombre y fecha de baja; `entregas` solo slugs. Los correos siguen solo
en `GET /ingles/alumnos` (pestaña «➕ Registro»). Se verifica con pruebas Deno (`server/panel_main_test.ts`).

## Capabilities

### New Capabilities
<!-- ninguna -->

### Modified Capabilities
- `ingles`: requisitos «Panel del profe en una petición», «Panel del profe resiliente por sección» y «Pestañas
  pesadas del panel bajo demanda».
- `plataforma`: requisito «Presupuesto de peticiones del panel del profe».

## Impact

- Superficies: `ingles.html` (admin) y servidor Deno. No toca `index.html`, `juegos.html`, `secundaria.html`, Postgres
  (esquema), Realtime, Auth, el repo de datos ni Notion.
- Código: `server/panel.ts` (nuevo), `server/main.ts`; `ingles/app.js`, `ingles/admin.js`, `ingles/tablero.js`,
  `ingles/rpg-ingles.js`, `?v=` en `ingles.html`.
- Pruebas: `server/panel_main_test.ts` (nueva), E2E `peticiones` (tope), `ingles-admin`, `ingles-diseno-profe`,
  `ocultar-grupos`, `puntos-tipo` (abren la pestaña antes de leerla).
- Docs: `docs/backend-standards.md`, `docs/frontend-standards.md`, `docs/pruebas.md`; la propuesta
  `navegacion-rendimiento` anota que su parte 2 la hace este cambio.
- Coordinación: `navegacion-mejoras` (PR 2) pondrá «📥 Entregas» en la barra con un contador de la bandeja; el
  contador puede salir de `entregas.pendientes` del panel (`pendientesEntregas()`), sin pedir la bandeja al abrir.
- Acciones externas: ninguna (Deno Deploy y Pages despliegan desde `main`).
