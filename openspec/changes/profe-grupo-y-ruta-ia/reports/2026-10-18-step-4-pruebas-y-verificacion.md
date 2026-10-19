# Reporte Step 4 — Pruebas y verificación de estado

- Fecha: 2026-10-18
- Cambio: profe-grupo-y-ruta-ia
- Agente: Claude Code (Opus 5.5)

## Comandos ejecutados
- `npx -y deno test -A server/profe_test.ts` (antes de implementar: 3 fallaron, como se esperaba; después: 12/12)
- `npx -y deno test -A server/`
- `npx -y deno check server/main.ts`
- `npx -y deno lint server/`
- `npx -y @fission-ai/openspec@1.4.1 validate --all --strict`
- E2E (`CHROME=… bash tests/e2e/correr.sh --puerto-api 8851 --puerto-web 8852 …`) con dos copias temporales del repo de
  datos fuera del repo (`C:\tmp\agente-profe-ia\`):
  - `datos` (copia tal cual, sin ruta propia), hoy por omisión 2026-10-04: fase inglés completa + `portal`.
  - `datos-con-ia` (misma copia + ruta propia de prueba «Claude Code en 4 semanas»: `plan.json`, 4 semanas
    2026-10-19 … 2026-11-09, una actividad y un examen por semana), con `--hoy 2026-10-20` (martes) y
    `--hoy 2026-10-18` (domingo, antes de que empiece la ruta): `profe-grupo ruta-profe profe-diseno`.

## Resultados de pruebas
- Dirigidas (`server/profe_test.ts`): 12 pasaron, 0 fallaron.
- Suite completa `deno test -A server/`: 861 pasaron, 0 fallaron, 6 omitidas (1m48s).
- `deno check` y `deno lint server/`: sin problemas. OpenSpec: 55/55 válidos.
- E2E sin ruta propia (hoy 2026-10-04): 13 PASS, 0 FAIL, 1 OMIT (`pronunciacion`, sin datos de pronunciación).
- E2E con ruta propia, martes 2026-10-20: `ruta-profe` 16/16, `profe-diseno` 11/11.
- E2E con ruta propia, domingo 2026-10-18: `ruta-profe` 16/16, `profe-diseno` 11/11 (bloque propio con «⏩ Adelanta»
  de la semana 1 de IA; Plan del mes abre la semana 1).
- `profe-grupo` falla con `--hoy` distinto de 2026-10-04 (cuenta fija de 6 elementos de la alumna para esa fecha);
  falla igual con la copia sin ruta propia, así que es dependencia de fecha preexistente, no de este cambio. Con la
  fecha por omisión pasa (7/7).

## Verificación de estado
- Antes: repo de datos sin `contenido/profe/`; tablas `stald_*` sin tocar (sin `--pg`).
- Después: la ruta de prueba solo existe en la copia temporal `C:\tmp\agente-profe-ia\datos-con-ia`; `correr.sh` trabaja
  sobre otra copia. No se hizo push al repo de datos.
- Estado restaurado: Sí — nada que restaurar fuera de las copias temporales.

## Verificación manual (Step 5.1, el agente ejecuta)
Contra el servidor local de las E2E (copia `datos-con-ia`, hoy 2026-10-20), `GET /ingles/profe/actividades` (admin):
`semana = { id: "2026-10-19", titulo: "Semana de descanso · Receta en inglés", ids: [...] }` (grupo) y
`semanaPropia = { id: "2026-10-19", titulo: "IA · Semana 1: Qué es Claude Code", ids: ["profe-act-2026-10-20",
"profe-examen-2026-10-22"] }`; `plan.titulo = "Claude Code en 4 semanas"`. Alumna de ejemplo: `GET /ingles/actividades`
sin `semanaPropia`, sin `plan` y sin ids `profe-`; `GET /ingles/profe/actividades` → 403; `GET
/ingles/actividades/profe-act-2026-10-20` → 404. Capturas: `tests/e2e/salida/ruta-profe.png` y `ruta-profe-plan.png`.

## Resultado
- Estado Step 4: PASS
- Bloqueos: ninguno
