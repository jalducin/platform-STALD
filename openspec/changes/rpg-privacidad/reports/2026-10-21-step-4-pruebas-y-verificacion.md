# Reporte Step 4 — Pruebas y verificación de estado

- Fecha: 2026-10-21
- Cambio: rpg-privacidad
- Agente: Claude Code (Opus 5.5); suite con el subagente `verificador-pruebas`

## Comandos ejecutados
- `npx -y deno test -A server/interruptores_test.ts server/interruptores_main_test.ts server/cache_main_test.ts server/http_cache_test.ts` (dirigidas)
- `npx -y deno test -A server/` (suite completa)
- `npx -y deno check server/main.ts`
- `npx -y deno lint server/`
- `CHROME=…/chromium-1228/chrome-win64/chrome.exe bash tests/e2e/correr.sh --datos <copia mínima en el scratchpad> --puerto-api 8905 --puerto-web 8906 privacidad portal login juegos material`
- Verificación manual (Step 5.1): servidor local en el puerto 8905 con tres copias de datos y `curl` a `/interruptores`
- `npx -y @fission-ai/openspec@1.4.1 validate rpg-privacidad --strict` y `validate plataforma-rpg --strict`

## Resultados de pruebas
- Dirigidas: 15 pasaron, 0 fallaron, 0 omitidas
- Suite completa: 972 pasaron, 0 fallaron, 6 omitidas (las marcadas como ignoradas en el código); 49 s
- `deno check`: sin errores; `deno lint`: 0 hallazgos en 154 archivos
- E2E: 5 corridas, 5 PASS (privacidad 57 pasos, portal 16, login 67, juegos 31, material 56); 159 s
- OpenSpec: ambos cambios válidos con `--strict`
- Búsqueda de correos y nombres reales en los archivos nuevos: 0

## Verificación manual (curl, servidor local)
| Caso | Respuesta |
|---|---|
| Sin `config/interruptores.json` | 200 `{"privacidad":false}`, `cache-control: public, max-age=60` |
| `POST /interruptores` | 405 `{"error":"metodo_no_permitido"}` |
| Con sesión de prueba | `{"privacidad":false}` (misma respuesta, no depende de la identidad) |
| `{"privacidad":true,"otra":"x"}` | 200 `{"privacidad":true}` (la llave de más no sale) |
| `{"privacidad":"true"}` | 200 `{"privacidad":false}` |

E2E (navegador, 360 px): apagado y servidor caído → «Próximamente» sin texto ni enlaces en portal, Inglés y Juegos;
encendido (respuesta simulada) → enlaces de 44 px con `?api=`, 13 secciones, nota de borrador, sin correos, claro y
oscuro sin scroll horizontal; impresión del formato: 1 hoja carta (612 × 792 pt) sin navegación ni botones.

Capturas (scratchpad local, fuera del repo): `privacidad-360-claro.png`, `privacidad-360-oscuro.png`,
`consentimiento-360-claro.png`, `consentimiento-360-oscuro.png`, `consentimiento-carta.pdf`,
`privacidad-portal-pie-360.png` y las dos de «Próximamente».

## Verificación de estado
- Antes: sin `config/interruptores.json` en producción ni en las copias de prueba (apagado)
- Después: igual; las E2E simulan el encendido en el navegador y la verificación manual usó copias temporales
- Estado restaurado: Sí — no se escribió en `stald_*` ni en el repo de datos; copias temporales borradas o en el scratchpad

## Resultado
- Estado Step 4: PASS
- Bloqueos: ninguno
