## REMOVED Requirements

### Requirement: Marcar tareas de Notion como completadas
**Reason**: Fase 2 de «Inglés sin Notion»: Inglés ya no lee la base «📖 Clases Inglés», así que no hay tareas de Notion
que marcar. Se retiran la ruta `POST /ingles/data/<pageId>/completado` y `server/completar.ts`; la URL responde 404.
**Migration**: Las entregas de Inglés se registran con las actividades y exámenes en línea. Los `avance/<slug>.json`
existentes quedan como historial.
