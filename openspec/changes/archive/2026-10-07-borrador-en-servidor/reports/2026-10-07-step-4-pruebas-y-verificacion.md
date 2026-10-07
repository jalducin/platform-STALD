# Reporte Step 4 — Pruebas y verificación de estado

- Fecha: 2026-10-07
- Cambio: borrador-en-servidor
- Agente: Claude Code (Opus 5.5)

## Comandos ejecutados
- `deno test -A server/` · `deno lint server/` (salida completa) · `deno check server/main.ts`
- `bash tests/e2e/correr.sh --datos <copia> --puerto-api 8847 --puerto-web 8825 autoguardado`
- La fase `ingles` con portal y login, y `--pg grupos ingles-pro` (Postgres de prueba `stald_test_*`)

## Resultados de pruebas
- TDD en el servidor: `server/borrador_test.ts` falló 3/3 antes de implementar.
- En la página, los pasos E2E se escribieron después de implementar; no hubo corrida en rojo.
- Unitarias: 240 pasaron, 0 fallaron, 6 omitidas. Lint y check sin problemas.
- Incidencia corregida: CORS no permitía `PUT`, y el navegador habría bloqueado el guardado; se agregó a
  `Access-Control-Allow-Methods`.
- E2E, todas PASS:
  - autoguardado 29/29. Pasos nuevos: el avance se sube a la cuenta; la cuenta guarda solo preguntas del intento
    (descarta un id ajeno); otro contexto del navegador, sin `localStorage`, recupera las 2 respuestas con su aviso;
    al enviar, ya no hay borrador en la cuenta;
  - actividades-datos 6, alta-alumnos 13, inicio-lunes 6, segunda-oportunidad 8, pronunciacion 11, profe-grupo 7,
    ruta-profe 15, profe-diseno 11, presentar 5, examen-secundaria 10, login 58 y portal 16;
  - con `--pg`: grupos 12 e ingles-pro 32.

## Verificación de estado
- `stald_test_*` en 0 filas al terminar, copias temporales borradas y servidores apagados.
- Estado restaurado: Sí.

## Resultado
- Estado Step 4: PASS
