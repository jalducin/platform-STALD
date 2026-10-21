## Why

Una alumna de Inglés en línea pasa a Secundaria y llevará Inglés directo en sus clases de Secundaria. Hoy no hay
forma de darla de baja de Inglés: «Quitar» (`POST /ingles/alumnos/quitar`) borra su entrada del registro y con ella
su identidad (pierde el acceso al portal y cambia su jugador de Juegos), y `/ingles/grupos` solo lista, crea, edita y
mueve de grupo. Hace falta una baja **reversible** que conserve resultados e historial y no toque Secundaria ni Juegos.

## What Changes

- **Servidor (`server/alumnos.ts`, `server/main.ts`):**
  - Campo nuevo opcional `baja: "AAAA-MM-DD"` (fecha CDMX) en la entrada de `alumnos.json`.
  - `POST /ingles/grupos/baja` `{ email }` (solo admin): marca la baja con la fecha de hoy. No borra resultados,
    avance, borradores ni inscripciones. Repetirla no cambia nada (`sinCambio: true`).
  - `POST /ingles/grupos/reactivar` `{ email }` (solo admin): quita la marca; vuelve a su grupo (la inscripción no
    se tocó) y a sus resultados.
  - Las dos rutas funcionan con o sin la base de grupos (solo escriben `alumnos.json`).
  - `GET /ingles/alumnos` incluye `baja` en las personas dadas de baja; `GET /ingles/grupos` las omite de `miembros`.
  - Quien está de baja deja de contar en Inglés: `GET /ingles/data` (tablero y avance del admin), `GET /ingles/resumen`
    (indicadores y mapa de calor) y `GET /ingles/actividades` (calendario, Meet y horario del grupo; 403
    `baja_ingles` para la persona). Si ella abre Inglés, `GET /ingles/data` responde `{ rows: [], baja: true }`.
  - `GET /perfil` responde `accesos.ingles: false` para quien está de baja; su nombre, Secundaria y Juegos no cambian.
  - La identidad de Juegos, el registro de Juegos y el alta de contraseña siguen leyendo el registro completo
    (incluye bajas): su jugador `a-<slug>`, su ranking y su avatar no cambian.
- **Vista (`ingles/admin.js`, `ingles/app.js`, `ingles.html`):**
  - En «Registro» (lista «👥 Alumnos y alumnas», junto a su grupo) cada persona activa tiene «🚪 Baja de Inglés» con
    confirmación («Sus resultados se conservan como historial»).
  - Debajo, «🗂️ De baja de Inglés» lista a quienes están de baja con su fecha y «↩️ Reactivar».
  - El contador de la lista y el de cada grupo cuentan solo a las personas activas.
  - La alumna de baja que abre `ingles.html` ve: «Ya no estás en Inglés en línea; tus clases de Inglés siguen en
    Secundaria», con enlace a `ingles.html?modo=secundaria` (conserva `?api=`) y a Juegos; su sesión sigue abierta.
- **Pruebas:** Deno (`server/baja_ingles_test.ts`) y E2E nueva `baja-ingles`.

## Capabilities

### New Capabilities
<!-- ninguna -->

### Modified Capabilities
- `ingles`: requisito nuevo «Baja de Inglés reversible» (ADDED).

## Impact

- Superficies: servidor Deno, `ingles.html` (vista del admin y de la alumna). Sin cambios en `index.html` (ya oculta
  Inglés con `accesos.ingles: false`), `juegos.html`, `secundaria.html`, Notion ni el esquema de Postgres.
- Datos: `alumnos.json` (fila `alumnos.json` de `stald_docs` en producción) gana el campo opcional `baja`. Servidores
  anteriores lo ignoran.
- Matriz de acceso:

  | Quién | `POST /ingles/grupos/baja` y `/reactivar` | `GET /ingles/alumnos` | Inglés (`/ingles/data`, `/actividades`) | Secundaria / Juegos / portal |
  |---|---|---|---|---|
  | Admin (sesión) | 200 | 200, con `baja` de cada quien | ve solo a las personas activas en tablero, resumen y avance | sin cambio |
  | Alumna o alumno activo | 403 `solo_admin` | 403 | sin cambio | sin cambio |
  | Alumna o alumno de baja | 403 `solo_admin` | 403 | `/ingles/data` 200 `{ rows: [], baja: true }`; `/ingles/actividades` 403 `baja_ingles` | sin cambio (Inglés oculto en el portal) |
  | Sin sesión | 401 (como el resto de rutas) | 401 | 401 | — |

  Nadie más ve la fecha de baja: solo el admin en `GET /ingles/alumnos`.
- Acciones externas: redeploy automático al merge (agente); verificación de producción solo lectura (agente). Dar de
  baja a una persona en producción es un clic del profe (usuario); este cambio no da de baja a nadie.

## Cómo revertir

- Una baja: «↩️ Reactivar» (o `POST /ingles/grupos/reactivar`).
- El cambio: revertir el PR. Un servidor anterior ignora `baja`, así que quien esté de baja vuelve a ver Inglés.
