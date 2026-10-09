## Context

Un Meet con `banco` tiene reto (`tieneReto`), y hoy de eso dependen tres cosas: los botones «🎬 Presentar» y
«📋 Guion» del profe, la pantalla del guion y el GET del elemento, que responde 400 `no_aplica` si no hay reto.
Por eso quitar solo el banco dejaría al profe sin su material.

## Decisions

1. **`tieneMaterial`** en `meta`: `tipo === "meet"` y trae `presentacion` o `guion`. Es solo un booleano; el
   guion y la presentación se siguen mandando únicamente al admin.
2. **GET del material sin reto:** para el admin, un Meet sin reto responde con
   - `meta`, `teoria`, `tips`, `guion` y `presentacion`;
   - `preguntas: []` y `vistaPrevia: true`.

   Para alumnos y alumnas, desde `disponibleDesde`, responde el material de lectura (`material: true`, `teoria`,
   `tips`, sin `guion` ni `presentacion`); antes, 403 `no_disponible`. La página lo abre con «📖 Material»
   (`openMaterial` en `ingles/presentacion.js`).
3. **Botones del profe:**
   - «🎬 Presentar» y «📋 Guion» se muestran con `tieneReto || tieneMaterial`;
   - «👁 Reto» y «Probar el reto» solo se muestran con `tieneReto`.
4. **Datos:** a cada Meet se le quitan `banco`, `temas`, `intentos`, `preguntasPorIntento` y la diapositiva
   `reto`, y la descripción deja de anunciar el reto.

## Risks / Trade-offs

- Los resultados del reto del 4 de octubre quedan guardados, pero ya no se muestran ni cuentan. Aceptado: el
  profe pidió quitar el reto.
