## ADDED Requirements

### Requirement: Vista de corrección
Cuando el detalle de una actividad trae `correccion`, la página SHALL mostrar:
- un aviso con cuántos ejercicios hay que corregir;
- los ejercicios fallados con la respuesta anterior ("Antes respondiste: X");
- los correctos prellenados, de solo lectura y plegados en "✅ Ya las tenías bien (N)".

El contador y el botón Enviar SHALL considerar solo los ejercicios a corregir. En el resultado de una
actividad con intento restante, el botón SHALL decir "Corregir errores".

#### Scenario: Abrir la corrección
- **WHEN** la alumna abre el intento 2 de una actividad donde falló 3 de 12
- **THEN** ve 3 ejercicios para contestar, cada uno con su respuesta anterior
- **AND** ve plegados los 9 correctos, llenos y sin poder cambiarlos
- **AND** "Enviar" se habilita al contestar los 3

#### Scenario: Botón tras el primer intento
- **WHEN** termina el intento 1 de una actividad con errores
- **THEN** el botón dice "Corregir errores (1 intento restante)"
