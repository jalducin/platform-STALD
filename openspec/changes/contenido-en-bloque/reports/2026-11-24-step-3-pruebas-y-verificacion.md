# Reporte Step 3 — Pruebas y verificación de estado

- Fecha: 2026-11-24
- Cambio: contenido-en-bloque
- Agente: Claude Code (Opus 5.5)

## Comandos ejecutados
- `npx -y deno test -A server/contenido_test.ts` (en rojo antes de implementar; verde después)
- `npx -y deno check server/main.ts`
- `npx -y deno test -A server/`
- Comparación del paquete real (`gh api …/tarball/<sha>`) contra `git ls-tree` de la copia local, con `ContenidoStore`
- Conteo de lecturas únicas de `todosLosElementos` por ámbito, sin red

## Resultados de pruebas
- Dirigidas: 6 pasaron, 0 fallaron.
- Suite del servidor: 1134 pasaron, 0 fallaron, 6 omitidas.
- Duración de la suite: 126 min según Deno (lo normal es ~1 min; no se investigó la causa).
- Las E2E no se corrieron: usan `DATA_DIR` (`MemoryStore`) y no pasan por este código.

## Verificación de estado
- Antes: 129 (Inglés) + 306 (profe) + 247 (Secundaria) = 682 lecturas únicas por arranque completo.
- Después: 2 consultas; 708 de 708 archivos con el mismo `sha` de git; arranque local de 601 ms sin contar la descarga.
- Respaldo: 3.25 MB en base64; leído con GitHub en 403, 708 de 708 iguales (almacén simulado).
- El guardado en el Postgres real solo se puede ver en producción (sin acceso a esa base desde aquí).
- Estado restaurado: Sí — todo fue de solo lectura.

## Resultado
- Estado Step 3: PASS
- Bloqueos: ninguno

## Producción (PR 271, 2026-11-24)
- `/salud` en 200 y `estado: ok`; `/config` 200; `/secundaria/actividades` sin sesión 401.
- Arranque en frío: 1 consulta contada (el tarball y los 304 no contaron al medirlos).
- Uso continuo (24 peticiones tras el arranque, cada ~4.5 s): 0 consultas más.
- Tiempo de `/salud`: ~0.4 s en caliente; de 2.2 a 6.4 s en frío (baja el paquete).
- Sin verificar: la fila `respaldo/contenido` en Postgres y el flujo con la sesión de una alumna.
