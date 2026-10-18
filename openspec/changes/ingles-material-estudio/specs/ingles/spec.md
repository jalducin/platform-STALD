## ADDED Requirements

### Requirement: Material de estudio siempre disponible
El proyecto SHALL publicar un catálogo público `ingles/material/indice.json` (GitHub Pages) con un arreglo de guías
`{ id, titulo, descripcion, temas, nivel, mes, paginas, url, fecha }`, donde `url` es la dirección absoluta de Pages de un
PDF que existe en `ingles/material/`, y cada PDF de esa carpeta SHALL aparecer en el catálogo. El catálogo SHALL NOT
contener datos de alumnos o alumnas. `ingles.html` SHALL mostrar una sección «📚 Material de estudio» que lista todas
las guías del catálogo, del mes más reciente al primero, con su título, descripción, temas, mes y páginas, y los botones «⬇️ Descargar PDF» y «👁️ Ver», sin
fechas ni candados: la ven alumnos y alumnas de todos los grupos, el admin, el profe en su ruta (`?modo=profe`) y
también quien no ha iniciado sesión. La sección SHALL NOT depender de las fechas de las actividades ni cambiar sus
reglas.

#### Scenario: Alumna abre el material
- **WHEN** una alumna entra a Inglés y toca «📚 Material»
- **THEN** ve la guía de los tres tiempos + *to be* con su descripción, temas y páginas
- **AND** «⬇️ Descargar PDF» apunta al PDF publicado y responde 200 con `application/pdf`

#### Scenario: Antes y después de la actividad
- **WHEN** la actividad `guia-2026-10-23` todavía no abre o ya pasó su fecha límite
- **THEN** la sección sigue listando la guía con su descarga, sin candado

#### Scenario: El profe
- **WHEN** el admin abre `ingles.html` o su ruta (`?modo=profe`)
- **THEN** encuentra «📚 Material» en el menú o en las pestañas de su ruta, con las mismas guías

#### Scenario: Sin sesión
- **WHEN** alguien abre `ingles.html` sin sesión
- **THEN** bajo la caja de entrada ve el material de estudio y puede descargarlo; nada más de Inglés

#### Scenario: Catálogo inválido
- **WHEN** una entrada de `indice.json` no tiene sus campos, apunta a un PDF que no existe, declara otro número de
  páginas, contiene un correo, o un PDF de `ingles/material/` no está en el catálogo
- **THEN** la prueba `server/material_indice_test.ts` falla

#### Scenario: Catálogo que no carga
- **WHEN** el navegador no puede leer `indice.json`
- **THEN** la sección muestra un aviso para intentar más tarde, sin romper el resto de la página

#### Scenario: Celular
- **WHEN** se abre la sección a 390 px de ancho
- **THEN** las tarjetas se leen completas, los botones miden al menos 44 px y no hay desplazamiento horizontal
