## Context

`juegosPopulares` (`server/juegos.ts`) ya entrega `mejor: { nombre, puntos }`; la página solo pintaba el nombre.

## Decisions

- Formato «👑 Mejor puntaje: {nick} · N puntos», con el helper `plural` de la página (separador de miles es-MX y
  singular «1 punto»), igual que «N jugadores · M partidas» en la misma fila.
- Sin cambios en el servidor ni en la caché.

## Risks / Trade-offs

- Nicks largos más el número pueden ocupar dos renglones a 390 px; la fila ya permite salto de línea.
