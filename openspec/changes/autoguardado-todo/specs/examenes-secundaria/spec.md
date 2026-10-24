## ADDED Requirements

### Requirement: Avance de la clase de Secundaria guardado en la cuenta
Las clases por pasos (Teoría → Video → Ejercicios → Libreta), repasos y exámenes de Secundaria SHALL guardar el avance
de los ejercicios en la cuenta de la alumna como cualquier intento (capability `actividades-online`): a los pocos
segundos y al cambiar de paso, con el paso visible; al recargar o abrir en otro navegador SHALL recuperarse en el mismo
paso; NO SHALL calificarse ni contar como intento hasta «Enviar», y el admin no SHALL verlo como resultado. Al enviar,
el borrador SHALL borrarse.

#### Scenario: La alumna deja la clase a la mitad
- **WHEN** la alumna contesta 2 de 3 ejercicios de su clase y cierra el navegador
- **THEN** al abrirla en otro aparato ve sus 2 respuestas, en el mismo paso, y la clase sigue «en curso» sin calificación

#### Scenario: El admin no ve el avance como resultado
- **WHEN** la alumna tiene un borrador sin enviar
- **THEN** la vista del admin no muestra resultado de esa clase para ella
