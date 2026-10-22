## ADDED Requirements

### Requirement: Mi horario de Secundaria en el portal
Si `/perfil` trae `accesos.secundaria`, el portal (`index.html`) SHALL mostrar el bloque «🗓️ Mi horario». El bloque
trae:

- los 7 días de la semana de hoy en forma compacta (el emoji de cada materia, con su nombre accesible), con hoy
  marcado;
- «Hoy te toca: …» destacado con los chips de materia, o «Hoy no tienes clases 🎉»;
- los botones «📚 Mis clases» (a `secundaria.html`) y «🗓️ Mi horario» (a `secundaria.html#horario`), de 44 px o más.

El admin SHALL ver el horario de la primera alumna de Secundaria. Si la petición falla, SHALL mostrar un aviso corto
con el botón a Secundaria. Quien no tiene Secundaria no ve el bloque.

#### Scenario: Alumna de Secundaria
- **WHEN** la alumna entra al portal el 2026-10-27
- **THEN** ve «Hoy te toca: Matemáticas, Ciencias», los 7 días (2, 2, 2, 2, 2, 2 y 3 clases) con el martes marcado y
  los dos botones

#### Scenario: Sin Secundaria
- **WHEN** entra una alumna solo de Inglés
- **THEN** el bloque no aparece
