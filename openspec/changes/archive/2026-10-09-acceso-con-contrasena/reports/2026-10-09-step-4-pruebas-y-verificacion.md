# Reporte Step 4 — Pruebas y verificación de estado

- Fecha: 2026-10-09
- Cambio: acceso-con-contrasena
- Agente: Claude Code (Opus 5.5)

## Comandos ejecutados
- `npx -y deno test -A server/` y `npx -y deno lint server/`
- `bash tests/e2e/correr.sh --datos <copia de datos>`: suite completa, sin `--pg`
- `bash tests/e2e/correr.sh --datos <copia de datos> ruta-profe loteria-sala`: repetición
- Prueba contra la Supabase real con la cuenta desechable `stald.e2e.contrasena@example.com`:
  - alta con la Admin API;
  - entrada con `grant_type=password` y `stald·clase`;
  - contraseña equivocada;
  - baja de la cuenta.

## Resultados de pruebas
- Unitarias: 252 pasaron, 0 fallaron, 6 omitidas (las que necesitan `DATA_DIR`). `server/contrasena_test.ts` cubre:
  - preparar: inicial, contraseña equivocada, contraseña propia, correo que no es de clase, 429 y «Clase» con mayúscula;
  - cambio y restablecer;
  - modo de prueba.
- Lint: 64 archivos, sin problemas.
- E2E, suite completa: 37 corridas, 35 PASS, 2 FAIL, 2 omitidas (`grupos` e `ingles-pro` requieren `--pg`).
  - Las afectadas por el cambio pasan:

    | Prueba | Resultado |
    |---|---|
    | `login` | 63/63 |
    | `login-despues` | 6/6 |
    | `portal` | 16/16 |
    | `juegos` | 28/28 |
    | `jugadores` | 33/33 |
    | `enlace-sala` | 7/7 |
    | `nick` | 7/7 |
    | `autoguardado` | 29/29 |

  - Las 2 fallas no tienen relación con el cambio y pasan al repetirlas:
    - `ruta-profe`: error del navegador al tomar una captura. Repetida: 15/15.
    - `loteria-sala`: carrera de tiempos entre los dos clientes. Repetida: 10/10.
- Supabase real:
  - con la contraseña derivada entra y la sesión trae `app_metadata.contrasena_propia`;
  - con una contraseña equivocada responde `invalid_credentials`;
  - la cuenta de prueba se borró (200).

## Ampliación: «¿Olvidaste tu contraseña?» (mismo día)
- Unitarias: 254 pasaron, 0 fallaron (2 pruebas nuevas de `/auth/olvide`: clases y profe sí, otros 404, 429 del
  correo y 3 por hora). Lint sin problemas.
- E2E: `login` 66/66; `portal` 16/16, `juegos` 28/28, `jugadores` 33/33, `enlace-sala` 7/7 y `login-despues` 6/6.

## Verificación de estado
- Antes: sin cuentas de prueba en Supabase Auth.
- Después: la cuenta `stald.e2e.contrasena@example.com` se borró; no se escribió en tablas `stald_*`.
- Estado restaurado: Sí. Las E2E usan una copia temporal de los datos y el verificador falso local.

## Resultado
- Estado Step 4: PASS
- Bloqueos: ninguno
