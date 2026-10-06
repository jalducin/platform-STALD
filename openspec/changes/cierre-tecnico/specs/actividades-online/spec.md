## REMOVED Requirements

### Requirement: Registro de avance en JSON
**Reason**: Fase 2 de «Inglés sin Notion»: sin la ruta para marcar tareas de Notion, nadie escribe
`avance/<slug>.json`.
**Migration**: Los archivos existentes se conservan como historial (en Postgres en producción); el avance de Inglés
sale de los resultados de las actividades y exámenes en línea.
