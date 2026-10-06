# Reporte Step 4.1 — Juegos en Postgres en producción

- Fecha: 2026-10-04 (18:10 hora de CDMX)
- Cambio: cierre-tecnico
- Agente: Claude Code (Opus 5.5)

## Precondiciones
- Deno ya publicaba el merge #94 (`deploy/jalducin/stald success` sobre `c2ba732`).
- Sin salas vigentes: la última jugada en GitHub fue el 2026-10-03 a las 23:54 (hora de CDMX), 18 h antes; las salas
  vencen a las 3 h.
- Se puso la etiqueta `antes-de-postgres-juegos` en el repo de datos como punto de regreso.

## Comandos (`STALD_TABLAS=stald_`, llave solo como variable de entorno)
- `migrar-ingles.ts --juegos --prueba`: 121 archivos, sin escrituras.
- `migrar-ingles.ts --juegos`:
  - 121 documentos en Postgres, faltan 0;
  - muestra de 3 documentos idénticos;
  - marca `meta/migrado-juegos` escrita.
- `migrar-ingles.ts --juegos --delta`: 0 nuevos y 0 actualizados.

## Cuadre
- `stald_docs`: 146 documentos (23 de Inglés, 121 de Juegos y 2 marcas).

## Prueba de corte (script fuera del repo)
- Un invitado de prueba `@example.com` se registró, creó la sala XTMK (Cultura), la empezó y la leyó: todo 200.
- En Postgres:
  - nuevos: `juegos/salas/XTMK/sala.json` y el jugador;
  - cambiados: `juegos/invitados.json` y `juegos/salas-semana/2026-09-28.json`.
- Commits nuevos en el repo de datos de GitHub: ninguno.
- Estado restaurado: Sí. `juegos/` en `stald_docs` quedó idéntico a la foto previa (121 documentos). Se borraron la
  sala y el jugador, y se restauraron la lista de invitados y el índice semanal.

## Resultado
- Estado 4.1: PASS
