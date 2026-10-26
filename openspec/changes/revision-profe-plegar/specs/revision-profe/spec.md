## ADDED Requirements

### Requirement: Tarjetas plegables en «📋 Revisión»
En todos los tamaños, cada tarjeta de la pestaña «📋 Revisión» SHALL poder plegarse y desplegarse tocando su cabecera,
que SHALL ser un botón de 44 px o más con `aria-expanded`. Por omisión SHALL salir plegadas las clases que aún no abren
(estado `sin-abrir`) y las que el profe ya revisó (con calificación); las pendientes de revisar (enviadas o en borrador
sin revisión) SHALL salir desplegadas. Una tarjeta plegada SHALL mostrar en una línea el chip de materia, el tema, el
estado y, si existe, la calificación final, y SHALL llevar `data-plegada="1"` (`"0"` desplegada). Guardar una
revisión SHALL NOT plegar la tarjeta. Arriba de la lista SHALL haber un botón «Mostrar todo» / «Plegar revisadas» cuya
preferencia se guarde por aparato en `localStorage` dentro de `try/catch`; sin almacenamiento la vista SHALL funcionar
con el plegado por omisión.

#### Scenario: Revisada plegada
- **WHEN** el profe abre una semana con una clase que ya calificó
- **THEN** esa tarjeta sale plegada en una línea con su materia, tema, «✅ Revisada» y «Final N»
- **AND** al tocarla se despliega con su formulario

#### Scenario: Pendiente desplegada
- **WHEN** la semana tiene una clase enviada o en borrador sin revisión
- **THEN** su tarjeta sale desplegada con el formulario a la vista

#### Scenario: Mostrar todo se recuerda
- **WHEN** el profe toca «Mostrar todo» y recarga la página en el mismo aparato
- **THEN** todas las tarjetas salen desplegadas y el botón dice «Plegar revisadas»
