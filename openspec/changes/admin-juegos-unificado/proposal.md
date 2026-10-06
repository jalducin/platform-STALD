## Por qué
El profe pide (sprint 6): «Jugadores, Invitados y Fotos pueden ir en un solo menú, con barra de desplazamiento,
búsqueda, algo más pro y estético». Hoy el admin ve 6 pestañas en `juegos.html` (Juegos, Partidas, Ranking,
🧑‍🤝‍🧑 Jugadores, 📋 Invitados y 📷 Fotos). En el celular la barra se aprieta, las tablas obligan a desplazarse de
lado y solo «Jugadores» tiene buscador.

## Qué cambia
- La barra principal queda en **4 pestañas**: 🎮 Juegos, 👥 Partidas, 🏆 Ranking y, solo para el admin,
  **🛡️ Admin**.
- «🛡️ Admin» junta las tres vistas en **cuatro sub-secciones** (control segmentado con `role="tablist"`):
  Jugadores, Pendientes, Invitados y Fotos, cada una con su **contador** (p. ej. «Jugadores 16 · Pendientes 2 ·
  Invitados 7 · Fotos 3»).
- Un **buscador único** filtra la sub-sección activa por nombre, nick o correo (sin importar mayúsculas ni
  acentos) y dice cuántas coincidencias hay.
- Cada lista tiene **desplazamiento propio** (altura máxima, scroll suave, encabezados fijos en las tablas). En el
  celular las filas se ven como **tarjetas**, sin scroll horizontal.
- Estados de **carga** (esqueleto), **error** (con «Reintentar») y **vacío** cuidados en cada sub-sección.
- La sub-sección elegida se guarda en `localStorage.juegos_admin_sub` (preferencia de interfaz, sin datos
  personales).
- Se conserva todo: registros pendientes con «🔗 Enlace de acceso» (copiar / WhatsApp), nick visible, quitar foto
  con confirmación y los CSV de jugadores y de invitados.

## Superficies
- `juegos.html` (estilos y lógica del hub de admin).
- Sin cambios de servidor: se reutilizan `/juegos/jugadores`, `/juegos/invitados`, `/juegos/fotos`,
  `/juegos/fotos/quitar` y `/auth/enlace`.
- Sin cambios en Postgres, Realtime, Auth, repo de datos ni Notion.

## Matriz de acceso
| Quién | Pestaña 🛡️ Admin | Correos y fotos |
|---|---|---|
| Admin | La ve | Los ve (como hoy) |
| Alumnos, alumnas e invitados | No la ve | El servidor responde 403 (sin cambio) |

Ocultar la pestaña no es el control de acceso: lo sigue decidiendo el servidor.

## Acciones externas
- Ninguna. Tras el merge, Pages publica `juegos.html` (verificación en producción: integrador).
