# Reporte Step 4 — Pruebas y verificación de estado

- Fecha: 2026-10-21
- Cambio: secundaria-dashboard
- Agente: Claude (sesión principal) + subagentes `verificador-pruebas` y `revisor-solo-lectura`

## Comandos ejecutados
- `npx -y deno test --allow-env --allow-read server/secundaria_tablero_test.ts server/gamificacion_test.ts`.
  TDD: las pruebas de reglas fallaron primero y después pasaron.
- `npx -y deno test -A server/`, `npx -y deno check server/main.ts` y `npx -y deno lint server/`.
- E2E con una copia temporal del repo de datos (clon de solo lectura en el scratchpad), puertos 8901/8902:
  - `bash tests/e2e/correr.sh --datos <copia> --hoy 2026-10-27 examen-secundaria secundaria-clases secundaria-clase secundaria-dashboard autoguardado`
  - `bash tests/e2e/correr.sh --datos <copia> --hoy 2026-10-27 secundaria-dashboard` (sola, para ver que no depende
    del orden)
  - `bash tests/e2e/correr.sh --datos <copia> material baja-ingles login portal peticiones` (con el «hoy» por omisión,
    2026-10-04: login y portal prueban la transición de `?email=`, que termina el 2026-10-12)
- `openspec validate secundaria-dashboard --strict`

## Resultados de pruebas
- Dirigidas: 25 pasaron, 0 fallaron, 0 omitidas (`secundaria_tablero_test.ts` 11 + `gamificacion_test.ts` 14).
- Suite completa de Deno (tras el merge de `main` con #225 y #227): 965 pasaron, 0 fallaron, 6 omitidas; `check` y
  `lint` (151 archivos) sin hallazgos.
- E2E con `--hoy 2026-10-27`:

  | Prueba | Resultado |
  |---|---|
  | `examen-secundaria` | 10/0 |
  | `secundaria-clases` | 27/0 |
  | `secundaria-clase` (PR #225) | 35/0 |
  | `secundaria-dashboard` | 83/0 en la batería y 83/0 sola |
  | `autoguardado` | 29/0 |

- E2E con el «hoy» por omisión:

  | Prueba | Resultado |
  |---|---|
  | `material` | 56/0 |
  | `baja-ingles` | 17/0 |
  | `login` | 67/0 |
  | `portal` | 16/0 |
  | `peticiones` | 10/1 |

  - La falla de `peticiones` es «sala de 2 personas: 41 ≤ 40» (sondeo de Juegos). Ya estaba en la línea base
    (`openspec/changes/juegos-categorias/reports/2026-10-12-step-4-pruebas-y-verificacion.md`); este cambio no toca
    Juegos.
  - El flujo de Secundaria medido («abrir un examen») pasa.
- Duración: Deno 39 s; E2E unos 15 min en total.

## Hallazgos del revisor atendidos
- La E2E del tablero dependía del orden. Ahora calcula lo esperado de XP, nivel, insignias, retos, progreso, promedios y
  actividad con la API y las reglas puras, y no reenvía clases que otra prueba ya hizo.
- El contador de retos y las tarjetas ya usan las mismas clases (incluye lo de ayer que vence hoy). Lo cubre la E2E.
- Escenarios agregados a la E2E:
  - «Hoy no tienes clases 🎉» con la próxima clase;
  - el portal del admin (horario de la primera alumna);
  - el portal con falla de red (aviso y botón).
- Merge de `main`:
  - `ingles.css?v=9`, `secundaria.js?v=6`;
  - `gamificacion.js` cargado una vez, antes de `secundaria-datos.js`;
  - la E2E `secundaria-clase` abre `#semana`.

## Capturas revisadas (tests/e2e/salida/, no versionadas)
- `secundaria-dashboard-inicio-360.png` y `-oscuro.png`, `secundaria-dashboard-materias-360.png` y `-oscuro.png`.
- `secundaria-dashboard-admin-360.png` y `secundaria-dashboard-escritorio.png`.
- `secundaria-dashboard-portal-360.png` y `-oscuro.png`.

## Verificación de estado
- Antes: copia temporal creada por `correr.sh` desde el clon del repo de datos; sin `SUPABASE_*` (no se tocan tablas
  `stald_`).
- Después: los envíos de la alumna del fixture quedaron solo en la copia temporal.
- Estado restaurado: Sí. `correr.sh` borra la copia y apaga los servidores. Sin push de datos.

## Resultado
- Estado Step 4: PASS (la falla de `peticiones` es ajena y está documentada)
- Bloqueos: ninguno
