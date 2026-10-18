## Context

La guía en PDF vive en el repo público (`ingles/material/`, cambio `material-pdf-ingles`) y solo se enlaza desde una
actividad con fechas (`guia-2026-10-23`) y desde tips del Meet. `ingles.html` es una página estática con secciones
por hash (`SECCIONES` en `ingles/comun.js`), una ruta del profe con pestañas (`ingles/profe.js`) y una caja de
entrada sin sesión (`StaldAuth.pintarEntrada`).

## Goals / Non-Goals

**Goals:** que alumnos, alumnas y el profe encuentren siempre todas las guías, sin depender de fechas; agregar una
guía nueva = generar su PDF y agregar una entrada al catálogo, sin tocar código de las páginas.

**Non-Goals:** visor de PDF propio, subir archivos desde la plataforma, catálogo en el servidor Deno o en el repo de
datos, cambiar las reglas de disponibilidad de las actividades.

## Decisions

- **Catálogo estático en Pages** (`ingles/material/indice.json`), junto a los PDF. Es público y sin datos personales,
  así que no necesita servidor ni sesión. Alternativa descartada: una ruta en Deno que liste `ingles/material/`
  (más código, y el servidor no tiene el repo público en disco).
- **Forma del catálogo:** `{ id, titulo, descripcion, temas[], nivel, mes, paginas, url, fecha }`.
  - `mes` = mes del curso (1, 2, …): las guías son **mensuales** (mes 1: 14 páginas, temas ligeros; desde el mes 2:
    20 páginas). La sección ordena por `mes` (el más reciente primero) y lo muestra como «🗓️ Mes N»; no es un candado.
  - `id` = nombre del PDF sin `.pdf` y de su fuente HTML (`herramientas/material-ingles/<id>.html`).
  - `url` = dirección absoluta de Pages (la misma que usan los tips de las actividades). La página **no** usa la
    `url` tal cual: arma la dirección relativa `ingles/material/<id>.pdf` desde donde se sirvió el catálogo, para que
    funcione igual en Pages y en el servidor local de pruebas.
  - `fecha` = publicación (AAAA-MM-DD); desempata dentro del mismo mes, no se muestra como límite.
- **Un solo componente** `ingles/material.js` (`renderMaterial()`, `htmlMaterialLista()` y `mostrarMaterialPublico()`): lo usan la vista de alumno o
  alumna, la del admin, la ruta del profe y la entrada sin sesión. El catálogo se pide una vez al cargar la página; la
  sección se pinta con un marcador `[data-material]` que se rellena cuando llega (no retrasa el resto de Inglés).
- **Dónde se ve:**
  - alumnos y alumnas: sección `#material` con pestaña en la barra (6 pestañas a 390 px; las etiquetas son cortas);
  - admin: sección `#material` en el menú; en celular queda en «☰ Más» para no mover sus 4 accesos de la barra;
  - ruta del profe: pestaña «📚 Material» en sus pestañas;
  - portal: atajo `ingles.html#material` bajo las tarjetas (no es una tarjeta nueva: no es un espacio aparte).
- **Sin sesión sí se muestra** (bajo la caja de entrada de Inglés, no en Secundaria). Justificación: el material ya es
  público (cualquiera con la URL de Pages lo descarga), no tiene datos personales y así una alumna que olvidó su
  contraseña o cuya sesión venció puede seguir estudiando. Riesgo: ninguno nuevo; no se expone nada del servidor.
- **«⬇️ Descargar PDF»** = `<a download>`; **«👁️ Ver»** = el mismo PDF en otra pestaña (`target="_blank"`, visor del
  navegador o del celular).
- **Actividades sin cambios:** el tip `lectura` de `guia-2026-10-23` sigue igual; la sección es una vía permanente al
  mismo PDF, aunque la actividad no haya abierto o ya haya vencido.
- **Generador:** `generar-pdf.ts --todas` regenera todas las fuentes; tras cada PDF informa sus páginas (cuenta los
  objetos `/Type /Page`) para copiarlas al catálogo. La prueba Deno compara ese conteo con `paginas`.

## Risks / Trade-offs

- Olvidar agregar un PDF al catálogo → la prueba Deno falla si hay un PDF sin entrada (y viceversa).
- Seis pestañas en la barra del celular → se revisa a 390 px que nada se corte ni haya scroll horizontal.
- Caché del navegador del catálogo → se pide con `cache: 'no-cache'`.
