## ADDED Requirements

### Requirement: Conteo de alumnos y alumnas por grupo
El contador de cada grupo en «👥 Grupos» SHALL contar a los alumnos y alumnas del registro según su grupo efectivo:
su inscripción vigente o, si no tiene, el primer grupo activo.

#### Scenario: Grupo por omisión
- **WHEN** el Grupo 1 es el primer grupo activo y 6 personas no tienen inscripción, más 1 inscrita en él
- **THEN** el Grupo 1 dice «👤 7 alumnos y alumnas»
