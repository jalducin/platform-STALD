## Why

El usuario pidió (2026-09-30) un menú de acceso más profesional, y más adelante acceso a juegos. Hoy cada
página tiene su propio login sencillo, y la dirección principal (`/`) abre directo el tablero de
Secundaria. Se eligió un **portal nuevo en la raíz**: se entra una vez y se ve una tarjeta por cada
espacio al que se tiene acceso.

## What Changes

- **Portal en `/` (`index.html`):**
  - Diseño profesional con marca "STALD · Plataforma de aprendizaje".
  - Login por correo.
  - Saludo con nombre y fecha.
  - Tarjetas según el acceso: 📘 Clases de Inglés, 📚 Secundaria y 🎮 Juegos. Juegos aparece como
    "Muy pronto" hasta la entrega de juegos.
- **Secundaria se muda a `secundaria.html`**, con el mismo contenido. `/` deja de ser Secundaria; los
  links viejos llevan al portal, que tiene la tarjeta de Secundaria.
- **Sesión compartida:**
  - El portal guarda el correo en `stald_email` y también en las claves de cada página, así que al abrir
    una tarjeta no se vuelve a pedir el correo.
  - "Cerrar sesión" en cualquier página limpia todas las claves.
- **"← Inicio"** en el encabezado de `ingles.html` y `secundaria.html`.
- **Nueva ruta `GET /perfil?email=`:** dice a qué espacios tiene acceso el correo y el nombre para el
  saludo. No devuelve filas ni otros correos.

## Capabilities

### New Capabilities
- `portal`: acceso único y tarjetas por espacio.

### Modified Capabilities
- `notion-data-api`: ruta `/perfil`.

## Impact

- **Superficies**:
  - `index.html` (nuevo portal) y `secundaria.html` (antes `index.html`).
  - `ingles.html`: enlace a Inicio y cierre de sesión compartido.
  - `server/main.ts` y nuevo `server/perfil.ts`.
- **Documentación:**
  - `docs/frontend-standards.md` §1–§2: `index.html` deja de ser Secundaria; claves de sesión.
  - `openspec/project.md`: URLs.
- **Acciones externas:** publicación de Pages y Deno al hacer merge (el agente verifica). Avisar a
  quien use la liga de Secundaria que ahora entra por el portal.

## Matriz de acceso

| Correo | Tarjetas |
|---|---|
| Admin | Inglés, Secundaria y Juegos, con etiqueta "Modo maestro" |
| Con filas de Inglés | Inglés y Juegos |
| Con filas de Secundaria | Secundaria y Juegos |
| Sin filas (desconocido) | Solo el aviso; en la entrega de juegos podrá entrar como invitado |

`/perfil` solo devuelve booleanos de acceso y un nombre de pila (del campo "Nombre" de Inglés o del nombre
de Notion). Nunca filas ni otros correos.
