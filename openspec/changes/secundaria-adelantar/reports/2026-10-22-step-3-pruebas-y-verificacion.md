# Reporte Step 3 — Pruebas y verificación de estado

- Fecha: 2026-10-22
- Cambio: secundaria-adelantar
- Agente: Claude Code (Opus 5.5), con los subagentes `verificador-pruebas` y `revisor-solo-lectura`

## Comandos ejecutados
- `npx -y deno test -A server/secundaria_adelantar_test.ts`
- `npx -y deno test -A server/` · `npx -y deno check server/main.ts` · `npx -y deno lint server/` (verificador-pruebas)
- `npx -y deno run --allow-read server/validar_semana.ts tests/fixtures/datos 2026-10-19 --secundaria` (y `2026-11-02`)
- `CHROME=<chrome del sistema> bash tests/e2e/correr.sh --datos <copia de solo lectura> --hoy 2026-10-22 --puerto-api 8921 --puerto-web 8922 secundaria-adelantar`
- `... --hoy 2026-10-27 ... examen-secundaria secundaria-clases secundaria-clase secundaria-dashboard autoguardado`
- `... (hoy por omisión 2026-10-04) ... examen-secundaria portal login peticiones material`

## Resultados de pruebas
- Dirigidas (`secundaria_adelantar_test.ts`): 9 pasaron, 0 fallaron, 0 omitidas
- Suite Deno completa: 974 pasaron, 0 fallaron, 6 omitidas; `deno check` y `deno lint` (152 archivos) sin hallazgos
- Validador CLI `--secundaria`: semanas del fixture 2026-10-19 y 2026-11-02 con 0 errores y 0 avisos
- E2E `secundaria-adelantar` (`--hoy 2026-10-22`): 16 PASS, 0 FAIL (tras atender la revisión). Comprueba que «Hoy te
  toca» trae solo las 2 del jueves, que ninguna sale atrasada, que la del viernes se abre y se resuelve hoy (a tiempo)
  y que «Mi horario» queda igual antes y después. La de la semana futura sale en «Otras clases y exámenes».
- E2E de Secundaria (`--hoy 2026-10-27`): examen-secundaria 10/0, secundaria-clases 27/0, secundaria-clase 35/0,
  secundaria-dashboard 83/0, autoguardado 29/0
- E2E con el hoy por omisión: material 56/0, examen-secundaria 10/0, login 67/0, peticiones 11/0.
  - `portal` 15/1: falla «Inglés entra sin volver a pedir el correo».
  - Esa falla ya existía en `main`: se reprodujo igual sobre `git archive main` con los mismos datos y puertos.
  - No la causa este cambio, que en `index.html` solo sube `?v=`.
- Duración: Deno ≈ 42 s; E2E ≈ 7 min en total

## Verificación de estado
- Antes: copia del repo de datos de solo lectura en el scratchpad; tablas `stald_*` sin tocar (sin `--pg`).
- Después: `correr.sh` trabaja sobre una copia temporal que borra al terminar; la copia original sigue sin cambios. No
  se escribió en Postgres ni se hizo push al repo de datos.
- Estado restaurado: Sí. No hubo nada que restaurar, porque las escrituras quedaron en la copia temporal y esta se
  borró.

## Revisión (revisor-solo-lectura)
- Atendido: faltaba este reporte.
- Atendido: la prueba de Inglés ahora usa una semana futura que ya abrió y comprueba que el grupo no la ve.
- Atendido: el efecto en la vista de listar semanas futuras ya está en el spec, en docs/frontend-standards.md y en
  la E2E: salen en «Otras clases y exámenes» y cuentan en el total de su materia.

## Resultado
- Estado Step 3: PASS
- Bloqueos: ninguno. La falla de `portal` viene de `main` y no la causa este cambio.
