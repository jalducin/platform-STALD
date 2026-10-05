## Decisiones

- `lunesDeInicio(altaIso)`:
  - toma la fecha del alta en CDMX (UTC−6, sin horario de verano);
  - devuelve el lunes siguiente, estrictamente posterior (`AAAA-MM-DD`).
- Formato del registro: `alumnos.json` → `{ "<correo>": { nombre, alta, inicio? } }`.
  - Al ligar a un nombre que ya tiene filas en Notion, no se guarda `inicio`.
- `Identidad` suma `inicio?: string`. `main.ts` lo busca en el registro por el slug del alumno:
  - en `/ingles/actividades`;
  - también en el perfil de Inglés si lo necesita.
- En `handleActividades` (GET de la lista, alumno, ámbito clase): se filtra
  `items.filter(it => !inicio || it.fechaLimite >= inicio)`.
  - Se usa la fecha límite propia del alumno, ya con la prórroga aplicada.
  - El acceso directo a un elemento anterior sigue permitido (práctica), pero no aparece en la lista ni cuenta como
    atraso.
- `GET /ingles/actividades` devuelve `inicio` a quien lo tiene. Si `hoy < inicio`, `ingles.html` muestra la tarjeta
  "📅 Tu curso empieza el lunes …".
- `GET /ingles/alumnos` devuelve `inicio` en las altas que lo tienen. En `ingles.html`, la tarjeta de alta muestra
  "inicia el lunes 5 de oct".

## Pruebas

- `lunesDeInicio`: miércoles → lunes siguiente; lunes → lunes de la semana siguiente; domingo 23:00 en CDMX (lunes
  05:00 UTC) → el día siguiente.
- Alta nueva con `inicio`; la liga a un alumno de Notion va sin `inicio`.
- La lista de actividades de una alumna nueva omite lo que venció antes de su inicio; el resto del grupo lo sigue
  viendo.
