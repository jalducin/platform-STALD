## Por qué
Juegos ya admite personas que no son alumnos ni alumnas (invitados). Pero el camino solo aparece después de un
error: «No encontré clases con ese correo». El profe quiere que cualquiera pueda **crear su cuenta de Juegos** de
forma clara, sin ser alumno o alumna de Inglés.

## Qué cambia
- Portal:
  - botón visible «🎮 ¿Solo vienes a jugar? Crea tu cuenta de Juegos»;
  - con un correo sin clases, invitación amable en lugar del error;
  - enlace directo para compartir: `index.html?juegos=1` lleva a crear la cuenta.
- Juegos: la entrada y la pantalla del apodo hablan de «crear tu cuenta de Juegos».
- Sin cambios en el servidor: se reutiliza el registro de invitados (`POST /juegos/invitado`, apodo + aviso,
  máximo 500).

## Impacto
- `index.html`, `juegos.html`, `tests/e2e/e2e-login.js`.
- Spec `portal`: se modifica «Entrada de invitados y Juegos activo».
