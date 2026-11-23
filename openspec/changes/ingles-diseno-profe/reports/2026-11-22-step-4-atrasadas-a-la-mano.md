# Reporte Step 4 — Atrasadas a la mano (pruebas y verificación)

- Fecha: 2026-11-22
- Cambio: ingles-diseno-profe (ajuste post-apply, design 13)
- Agente: Claude Code (Opus 5.5)

## Comandos ejecutados
- `npx -y deno test -A server/`
- `bash tests/e2e/correr.sh --datos <repo de datos, se copia> --puerto-api 8951 --puerto-web 8952 --hoy 2026-11-22 ingles-diseno-profe ruta-profe profe-diseno profe-grupo presentar`
- La misma sin `--hoy` (2026-10-04): `ingles-diseno-profe profe-diseno`
- Repetición final tras el ajuste de CSS: `ingles-diseno-profe profe-diseno ruta-profe` con `--hoy 2026-11-22`

## Resultados de pruebas
- Unitarias: 1128 pasaron, 0 fallaron, 6 omitidas (1 min 14 s).
- Dirigidas: `ingles-diseno-profe` 99/99 (con 16 atrasadas en claro y 15 en oscuro: el contador coincide con las filas
  de `#pf-atrasadas` y tocarlo abre la lista; el tablero RPG sigue sin «atrasada»), `ruta-profe` 22/22,
  `profe-diseno` 11/11 (ahora cuenta 5 contadores), `presentar` 11/11.
- Primera corrida en rojo (TDD): el `summary` de la lista medía menos de 44 px (6 fallas) y `profe-diseno` esperaba 4
  contadores; corregidos.
- `profe-grupo` 6/7 con `--hoy 2026-11-22`: «6 elementos» supone los datos del 2026-10-04 (falla heredada, ya anotada
  en el reporte del 2026-10-22; no toca este cambio).
- Capturas revisadas: `ingles-diseno-profe-ruta-escritorio.png` (5 contadores en fila) y `-ruta-360.png` («Atrasadas»
  a lo ancho, sin scroll horizontal).

## Verificación de estado
- Antes: repo de datos local limpio; sin Postgres.
- Después: `correr.sh` trabaja en una copia temporal; el repo de datos sigue limpio (`git status` vacío).
- Estado restaurado: Sí — no hubo que restaurar nada.

## Resultado
- Estado Step 4: PASS
- Bloqueos: ninguno
