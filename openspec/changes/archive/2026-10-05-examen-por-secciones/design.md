## Decisiones
- `selectQuestions` sigue eligiendo igual: reparte entre temas y baraja con la semilla del intento. Al final, si
  `porSecciones` está activo, ordena de forma estable por la posición del tema en `temas`. Así cada sección conserva
  su orden barajado y los temas que no están en `temas` van al final.
- Sin el campo, el comportamiento no cambia (Inglés sigue mezclando).
- Frontend sin cambios: `conTemas` ya inserta un encabezado `.exam-sec` cuando cambia el tema.

## Pruebas
- Unitaria: con `porSecciones`, el examen de Secundaria entrega las preguntas agrupadas en el orden de `temas`, en
  los dos intentos; sin el campo, la selección no cambia.
- E2E `examen-secundaria` sin regresión.
