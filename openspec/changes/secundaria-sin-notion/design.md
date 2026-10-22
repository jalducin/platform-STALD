## Contexto

La identidad de Secundaria salía de las filas de Notion (`loadRows(SECUNDARIA_DB_ID, extractSecundariaRow,
"secundaria")`), con cinco consumidores en `server/main.ts`:

| Consumidor | Para qué |
|---|---|
| `rutaPerfil` (`armarPerfil`) | `accesos.secundaria` y el nombre del portal cuando no hay Inglés |
| `/secundaria/actividades` (`handleSecundaria`) | quién entra y con qué nombre y slug |
| `/juegos/…` (`resolverJugador`, `armarJugadores`) | jugador `s-<slug>` y lista de correos del admin |
| `/juegos/registro` | rechaza correos de clase |
| `/auth/*` (`esDeClase`) | la contraseña inicial solo vale para correos de clase |

Con las bases de Notion borradas (2026-10-22) `queryDatabase` lanza y esas rutas responden `upstream_error`.

## Decisiones

### 1. Registro: `alumnos.json` (el de Inglés), no un archivo nuevo

- Primera idea: `contenido/secundaria/alumnos.json` en el repo de datos. Se descartó: subir un correo real al repo de
  datos quedó bloqueado por permisos, y ya existe un registro con correos fuera del repo público
  (`alumnos.json`, en Postgres `stald_docs`).
- Campos nuevos de `AlumnoRegistrado`: `secundaria?: true` y `slugSecundaria?: string`.
- Acceso a Secundaria = `secundaria === true` **o** el slug de la entrada aparece en `alumnos` de algún elemento
  visible de Secundaria (`visibleItems(store, hoy, AMBITO_SECUNDARIA)`, la misma caché de 60 s que la vista). La
  segunda regla da acceso a Sofía sin esperar un clic: está como «Sofy» y sus clases traen `alumnos: ["sofia","sofy"]`.
- La baja de Inglés no quita Secundaria: se lee el registro completo (`leerRegistro`, con bajas).
- `filasDeRegistro` devuelve la forma `FilaConUsuarios` (`userEmails`, `userNames`, `slug`), así `armarPerfil`,
  `resolverJugador`, `armarJugadores` y `esDeClase` no cambian.

### 2. Slug

- Slug de Secundaria = `slugSecundaria` (si es válido) o `slugAlumno(nombre)`. Para Sofía: `sofy`.
- Antes era `slugAlumno(primer nombre en Notion)`. Si su nombre de Notion era «Sofía…», sus resultados de
  Secundaria anteriores (examen mensual de septiembre, repaso del 21) están en `resultados/<id>/sofia.json`; desde el
  hotfix los nuevos quedan en `sofy`. No se pudo leer Postgres de producción desde esta sesión para confirmarlo.
  - Para dejar un solo slug: poner `"slugSecundaria": "sofia"` en su entrada. La marca del profe (PR 2) lo hace sola
    si al marcar todavía hay filas de Notion; con Notion borrado ya no, así que queda como acción manual opcional (o
    mover sus resultados de `sofia` a `sofy`). Ver el reporte.
- `Identidad.slug?` y `handleActividades` usa `quien.slug ?? slugAlumno(alumno)`. Inglés y la ruta del profe no lo
  mandan.
- Juegos no cambia: Sofía es `a-sofy` porque Inglés tiene prioridad en `resolverJugador`.

### 3. Caída temporal a Notion, sin romper nada

```
filas = registro con Secundaria (marca o exclusivos)
si filas → filas (Notion no se consulta)
si no → aviso en el log (≤ 1 cada 10 min por mensaje)
      → Notion solo si hay NOTION_TOKEN o ROWS_FIXTURE; si falla, no es lista o no hay token → []
```

Si leer el contenido falla, se sigue solo con la marca. Nunca lanza: `/perfil` y Juegos siguen en 200. Se quita en
el seguimiento 9.1.

### 4. `secundaria.html`: puente

`location.replace('ingles.html?' + query con modo=secundaria + hash)`; `<noscript>` con enlace y «← Inicio». Se
descartó duplicar la vista dentro de `secundaria.html` (sesión, reproductor, borradores en dos lugares). El portal
sigue llevando a `secundaria.html`. En el PR 2 la experiencia se mejora dentro de la vista de Secundaria.

### 5. Vista del profe

- Admin sin `?alumna`: respuesta de admin + `alumnas: [{ nombre, slug }]`.
- Admin con `?alumna=<slug>` (solo GET de la lista): `handleActividades` como esa alumna + `isAdmin: true`, `vistaDe`.
  Otras rutas o métodos con `?alumna` = admin normal (vista previa, no escribe a su nombre). Slug desconocido → 404.
- Para quien no es admin, `?alumna` se ignora.

### 6. Marca del profe

`POST /ingles/grupos/secundaria { email, secundaria: boolean }` (solo admin; `handleSecundariaAlumno` en
`server/alumnos.ts`). Al marcar, si hay filas de Notion con ese correo y su slug difiere del del nombre, guarda
`slugSecundaria`. Al quitar, conserva `slugSecundaria`. La UI va en el PR 2.

### 7. Notion como historial

`/data` sigue en el servidor sin consumidores. `NOTION_TOKEN` es opcional; no se borra de Deno Deploy.

## Modelo de amenaza mínimo

- El correo sale de la sesión verificada (`quienEs`); el registro y el contenido solo dicen quién tiene Secundaria.
- La regla de exclusivos depende del contenido del repo privado: solo quien edita ese repo puede dar acceso, igual
  que quien edita `alumnos.json`.
- `?alumna` y la marca son solo del admin; la vista del profe es de solo lectura.
- Sin correos en respuestas; fixtures `@example.com`.

## Orden de archivo

Archivar primero `secundaria-mis-clases` y después este cambio; al archivarlo, quitar de la spec viva el escenario
«Enlace desde Secundaria» (decía que el tablero de Notion seguía).

## Pruebas

- Deno: `server/secundaria_sin_notion_test.ts` (registro, exclusivos, caída, alumna, admin, otra persona, marca,
  perfil) y `server/secundaria_sin_notion_main_test.ts` (main sin Notion: `/perfil`, `/secundaria/actividades`,
  admin, Juegos).
- E2E: `portal` y `login` (Secundaria abre «📚 Mis clases» y no pide `/data`), `secundaria-clases`,
  `examen-secundaria`. PR 2: perfil con horario, botones, vista del profe, 360 px claro/oscuro.
