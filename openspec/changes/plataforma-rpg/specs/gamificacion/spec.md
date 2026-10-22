## ADDED Requirements

### Requirement: Reglas de XP y nivel de la Fase 1 como invariante
El sistema SHALL calcular la XP de cada clase como su mejor porcentaje (0 a 100) más 20 si se entregó a tiempo, con el
mini examen 🎯 contando doble, y el nivel como floor(XP / 300) + 1, tal como lo implementa la Fase 1 en
`comun/gamificacion.js` (conciliado el 2026-10-21): cada acierto de una sección 🎯 cuenta otra vez, es decir
round(100 × (correctas + correctas🎯) / total), y el bono de 20 a tiempo **no** se duplica. Los 10 casos fijos de
`server/gamificacion_regresion_test.ts` fijan estas reglas (XP, nivel y racha). Las fases 2 a
4 SHALL NOT cambiar estas reglas; solo SHALL sumar XP de misiones principales al mismo total. La XP SHALL NOT ser
negativa ni restarse como castigo (clases vencidas o errores); solo SHALL cambiar hacia abajo si el profe corrige una
calificación.

#### Scenario: Clase a tiempo
- **WHEN** una alumna saca 85 % en una clase sin tema 🎯 y la envía antes de su `fechaLimite`
- **THEN** esa clase le da 105 XP

#### Scenario: Mini examen tardío
- **WHEN** un alumno saca 70 % en el mini examen 🎯 después de la fecha límite
- **THEN** ese mini examen le da 140 XP

#### Scenario: Subir de nivel
- **WHEN** su XP total pasa de 290 a 310
- **THEN** su nivel pasa de 1 a 2

#### Scenario: Clase vencida sin intento
- **WHEN** una clase vence sin ningún intento
- **THEN** da 0 XP, no resta XP y aparece en «por recuperar»

### Requirement: Estado de gamificación derivado de los resultados
XP, nivel, rango, racha, insignias automáticas, estado de mundos y árbol de habilidades SHALL calcularse con una sola
función pura a partir de los resultados y del contenido, la misma en el navegador y en el servidor. El sistema SHALL
NOT guardar XP acumulada en Postgres. Del estado de gamificación solo SHALL guardarse en `stald_docs` lo que no se
puede derivar: nick, estado del nick, preferencia de ranking e insignias manuales (`gamificacion/perfiles/<slug>.json`)
y la configuración del ranking por grupo (`gamificacion/config.json`). El perfil SHALL borrarse 30 días después de la
baja de la persona.

#### Scenario: El profe corrige una calificación
- **WHEN** el profe reinicia un intento o da una prórroga y la calificación cambia
- **THEN** la XP y el nivel reflejan el cambio en la siguiente carga sin ninguna migración

#### Scenario: Navegador y servidor coinciden
- **WHEN** se calculan los 10 casos fijos de prueba (XP, nivel y racha) en el navegador y en el servidor
- **THEN** ambos dan los mismos valores
