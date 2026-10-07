## Decisiones
- `SECCIONES` (`ingles/comun.js`): se agrega `{ id: 'registro', emoji: '➕', titulo: 'Registro', encabezado:
  'Registro de alumnos y alumnas', rol: 'admin' }` después de «Alumnos», sin `barra` (en celular va en «☰ Más»).
- `renderAdmin` (`ingles/tablero.js`): `registro` = `renderAlumnosAdmin()` y `alumnos` = solo los bloques de avance.
  El ruteo por hash ya existente muestra `#registro`.
- Después de dar de alta, cambiar de grupo o quitar, la página se vuelve a dibujar en la misma sección: el hash no
  cambia.

## Pruebas
- E2E: `alta-alumnos`, `inicio-lunes`, `grupos` y `ruta-profe` abren `#registro` en lugar de `#alumnos`.
- Paso nuevo en `alta-alumnos`: «Alumnos» ya no tiene el formulario y «Registro» sí, y las dos opciones aparecen en
  el menú.
