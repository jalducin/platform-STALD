## Decisions

- **Todas las filas siguen en la lista.**
  - Desde la fila 11, cada fila lleva la clase `rj-extra`.
  - El CSS oculta esas filas mientras la lista no tenga la clase `todos`.
  - Así, el orden y el contenido de la lista no cambian para las pruebas ni para los lectores de pantalla.
- **El botón `#rj-todos`** (con `aria-expanded`):
  - alterna la clase `todos` en `#rank-juegos`;
  - cambia su texto entre «Ver los N juegos» y «Ver solo el top 10».
