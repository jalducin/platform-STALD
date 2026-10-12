# Reporte Step 5 — Pruebas y verificación de estado

- Fecha: 2026-10-11
- Cambio: dragon-run-misiones
- Agente: Claude Opus 5.5 (worktree aislado, rama `feature/dragon-run-misiones`)

## Comandos ejecutados

- TDD: primero `npx -y deno test -A server/dragon_misiones_test.ts server/juegos_test.ts server/progreso_test.ts`.
  - Falló en rojo: no existían `COLORES_DRAGON`, `PREMIOS_DRAGON` ni `validarDragon`, y la categoría seguía en
    `mente`.
  - Después de implementar quedó en verde: 45/45.
- `npx -y deno test -A server/`
- `npx -y deno lint server/`
- E2E con `CHROME=…/chromium-1228/chrome-win64/chrome.exe`:
  `bash tests/e2e/correr.sh --datos <scratchpad>/data --puerto-api 8957 --puerto-web 8935 dragon-run juegos fusion clasicos plataformas karts`
- `npx -y @fission-ai/openspec@1.4.1 validate dragon-run-misiones --strict`

## Resultados de pruebas

- **Dirigidas (Deno):**
  - `server/dragon_misiones_test.ts`: 8 pruebas.
  - `juegos_test.ts` y `progreso_test.ts`: sin regresiones.
  - Total: 45 pasaron, 0 fallaron.
- **Suite completa (Deno):** 324 pasaron, 0 fallaron, 6 omitidas (9 s). El lint revisó 76 archivos, sin hallazgos.
- **E2E (7 min 38 s):** 6 corridas, 6 PASS y 0 FAIL.

  | prueba | pasos |
  |---|---|
  | juegos | 29 |
  | clasicos | 11 |
  | fusion | 10 |
  | dragon-run | 31 |
  | plataformas | 24 |
  | karts | 15 |

  Total: 120 pasos sin fallas.
- **OpenSpec:** `Change 'dragon-run-misiones' is valid`.

## Capturas revisadas (tests/e2e/salida/)

| captura | qué se revisó |
|---|---|
| `dragon-390-catalogo.png` | Dragon Run en «🕹️ Arcade» junto a Axo y Karts. |
| `dragon-390-misiones.png` | 3 misiones con barra, logros 2 por fila y JUGAR fijo abajo; se lee completo a 390 px. |
| `dragon-390-premios.png` | 7 colores y 5 estelas; los bloqueados llevan 🔒 y la pista dice cómo ganarlos. |
| `dragon-390-mision-cumplida.png` | Aviso amarillo «¡Misión cumplida! Llega al castillo 🏰» arriba del juego. |
| `dragon-390-resultado.png` | El resultado de Juegos repite la misión, el logro Conquistador 🥉 y los premios nuevos. |
| `dragon-390-tras-recargar.png` | Después de recargar, la misión sigue ✅ y la barra de «Corre 3 carreras» está en 1/3. |
| `dragon-390-jugando.png` | Celular vertical: cielo arriba, tierra abajo, estela de burbujas y «👆 Toca en cualquier parte para saltar». |
| `dragon-escritorio-misiones.png`, `dragon-escritorio-jugando.png` y `dragon-resultado.png` | Caja 16:10 en escritorio. |

Ajustes que salieron de esta revisión:
- en el celular vertical, el fondo de cielo y tierra y el recordatorio de toque;
- se quitó la sombra del aviso oculto, que se veía arriba al centro.

## Verificación de estado

- **Antes:** sin avance de `dragon-run` para `laura@example.com` (`v: 0`, `datos: null`). Lo comprueba la E2E.
- **Después:** `v: 2`, con `cumplidas: 1`, `premios: ["color-rojo", "estela-burbujas"]` y `equipo.estela: "burbujas"`.
- **Estado restaurado:** Sí.
  - El servidor de las E2E carga una copia temporal de los datos en memoria (`MemoryStore.fromDir`), y `correr.sh`
    la borra al terminar.
  - La carpeta de datos original del scratchpad no se modificó.
  - No se tocaron producción, Supabase, tablas `stald_*`, `.env` ni Notion.

## Verificación manual (Step 6.1, curl contra el servidor local en el puerto 8957)

El servidor usó una copia en `scratchpad/manual-data`, en memoria, y se apagó al terminar.

| caso | resultado |
|---|---|
| `GET` inicial (admin) | 200 `{ v: 0, datos: null }` |
| `PUT` válido | 200 `{ ok: true, v: 1 }`; el `GET` devuelve los mismos datos |
| `PUT` con color `dorado` sin desbloquear | 400 `progreso_invalido` |
| `PUT` con `v: 0` después de `v: 1` | 409 `version_vieja`, con `v: 1` y los datos guardados |
| `?email=` sin token | 401 `inicia_sesion` |
| Sin correo | 400 `missing_email` |
| Correo no registrado | 403 `no_registrado` |

## Resultado

- Estado del Step 5: PASS.
- Bloqueos: ninguno. La verificación en producción (6.2) queda para después del merge, que hace el usuario.
