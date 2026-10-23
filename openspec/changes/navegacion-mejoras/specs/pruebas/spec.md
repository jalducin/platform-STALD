## ADDED Requirements

### Requirement: E2E de «🌍 Mundos» con el plan de ejemplo compartido
La E2E `ingles-diseno-profe` SHALL revisar «🌍 Mundos» con el plan de ejemplo de las E2E
(`tests/fixtures/datos/contenido/profe/plan.json`), que `correr.sh` superpone en la copia temporal tras borrar la ruta
real del profe. Ese plan SHALL tener clases en los 9 mundos de `Gamificacion.MUNDOS_RUTA_PROFE` sin cambiar sus 3
semanas publicadas; las semanas sin archivo de actividad salen «Llega pronto». No cambia datos reales; `ruta-profe` y
`profe-diseno` siguen en verde con el mismo plan.

#### Scenario: Plan de ejemplo con clases en los 9 mundos
- **WHEN** la prueba abre «🌍 Mundos» con el plan de ejemplo
- **THEN** ve los 9 mundos de la ruta, con 44 px o más por botón y sin scroll horizontal

#### Scenario: Semanas sin publicar
- **WHEN** el plan trae semanas sin archivo de actividad
- **THEN** salen en el Plan del mes sin botón y no cuentan como abiertas

### Requirement: Tope de tiempo de navegación con un reintento
La E2E `navegacion-dispositivos` SHALL exigir que cada pantalla de cada tarea quede usable en menos de 8000 ms. Si en
un tamaño la pantalla más lenta llega al tope, SHALL repetir la tarea una sola vez en ese tamaño solo para medir el
tiempo y SHALL fallar si el reintento también llega al tope o falla. SHALL reportar el tiempo máximo observado
(incluidos los reintentos) y qué tareas necesitaron reintento. El tope no cambia.

#### Scenario: Pico aislado por carga
- **WHEN** una tarea tarda 9.3 s en un tamaño y 0.9 s al repetirla
- **THEN** el paso pasa y el mensaje muestra los dos tiempos

#### Scenario: Pantalla lenta de verdad
- **WHEN** una tarea se pasa del tope en la primera corrida y en el reintento
- **THEN** el paso falla con los dos tiempos

### Requirement: Prueba de Dibuja sin falsos positivos
La prueba unitaria «dibuja: la palabra solo la recibe quien dibuja» SHALL buscar la palabra y su traducción entre los
valores de texto de la respuesta y la llave `palabra` entre las llaves, de modo que una palabra del vocabulario que
también es llave (p. ej. «reloj») no la haga fallar, sin dejar de detectar una fuga.

#### Scenario: Palabra que coincide con una llave
- **WHEN** la palabra del turno es «reloj» (secreto fijo) y la respuesta trae la llave `reloj`
- **THEN** la prueba comprueba que la llave está y pasa si «reloj» no aparece como valor

#### Scenario: Fuga real
- **WHEN** la respuesta de quien no dibuja trae la palabra como valor, o la llave `palabra`
- **THEN** los ayudantes de la prueba la detectan (la palabra entre los valores y `palabra` entre las llaves)
