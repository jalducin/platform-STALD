## ADDED Requirements

### Requirement: Contenido en un solo paquete
El servidor SHALL leer `contenido/**` del repo de datos en un solo paquete por versión y SHALL revisar a lo más cada
60 s, con una petición condicional, si hay versión nueva. Si GitHub falla, SHALL servir la copia en memoria o, sin ella,
el respaldo de Postgres. El respaldo SHALL NOT ser legible con la llave pública.

#### Scenario: Arranque en frío
- **WHEN** una instancia nueva lee todas las clases
- **THEN** hace 2 consultas a la API de GitHub (el commit y el paquete), sin importar cuántas clases haya

#### Scenario: Sin cambios
- **WHEN** pasan 60 s y `main` no cambió
- **THEN** la revisión responde 304 y no se baja el paquete

#### Scenario: Contenido nuevo
- **WHEN** se sube una clase y pasan 60 s
- **THEN** se baja el paquete nuevo y la clase se lee

#### Scenario: Límite agotado en una instancia nueva
- **WHEN** GitHub responde por límite y la instancia no tiene copia
- **THEN** se sirve el respaldo de Postgres

#### Scenario: Límite agotado con copia
- **WHEN** GitHub responde por límite y la instancia ya tenía el paquete
- **THEN** se sirve su copia

#### Scenario: Escritura
- **WHEN** el profe guarda una prórroga
- **THEN** se escribe con el `sha` del archivo y la lectura siguiente trae lo guardado
