## Por qué
El profe pide «un campo de nick adicional para los jugadores existentes y nuevos». Hoy los alumnos y alumnas
aparecen en Juegos con su nombre real, y los invitados con el apodo que eligieron al registrarse, sin poder
cambiarlo.

## Qué cambia
- Cualquier jugador (alumno, alumna, invitado o el profe) puede ponerse un **nick** desde «🎨 Tu avatar». Ese nick
  es como lo ven en el ranking, el chip y las partidas. Si lo deja vacío, vuelve a su nombre.
- `POST /juegos/nick { nick }` (2 a 20 letras o números; vacío = quitar). Se guarda en `juegos/nicks.json`
  (id del jugador → nick) y actualiza su entrada del ranking de la semana.
- La pestaña «Jugadores» del admin muestra el nombre real y el nick.
