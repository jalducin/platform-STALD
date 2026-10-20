# Reporte Step 4 — Pruebas y verificación de estado

- Fecha: 2026-10-19
- Cambio: teoria-diagramas
- Agente: Claude Code (Opus 5.5)

## Comandos ejecutados
- `npx -y deno test -A server/diagrama_test.ts` (antes de implementar: falla al no existir `server/diagrama.ts`, como se esperaba)
- `npx -y deno test -A server/diagrama_test.ts server/semana_test.ts`
- `npx -y deno test -A server/`
- `npx -y deno check server/main.ts server/validar_semana.ts`
- `npx -y deno lint server/`
- `bash tests/e2e/correr.sh --datos <clon temporal de platform-STALD-data> --puerto-api 8861 --puerto-web 8862 <fase inglés + teoria-diagramas>`
- `bash tests/e2e/correr.sh … --hoy 2026-10-19 ruta-profe profe-diseno` (diagnóstico de las dos fallas ajenas)
- `npx -y deno run --allow-read server/validar_semana.ts <copia de tests/fixtures/datos> 2026-09-21` (válida y con 3 diagramas rotos)
- `npx -y @fission-ai/openspec@1.4.1 validate --strict`

## Resultados de pruebas
- Dirigidas (`diagrama_test.ts` + `semana_test.ts`): 25 pasaron, 0 fallaron.
- Suite completa `deno test -A server/`: 874 pasaron, 0 fallaron, 6 omitidas (2m36s).
- `deno check` y `deno lint server/`: sin problemas.
- E2E nueva `teoria-diagramas`: 42/42 (claro y oscuro × 360 px y 1280 px, más la diapositiva del Meet): los 7 diagramas
  de los 5 tipos se pintan en orden, el HTML de los datos sale escapado (`<b>` y `<script>` literales, sin ejecutarse),
  sin scroll horizontal ni elementos fuera de la pantalla, flujo en columna a 360 px y en fila a 1280 px, ciclo con U
  de regreso en fila y pastilla en columna, ramas en árbol (celular) y abanico (escritorio), colores distintos por tema
  y el ciclo cabe en la diapositiva `teoria`.
- Fase inglés completa (13 pruebas): 11 PASS, 1 OMITIDA (`pronunciacion`, sin micrófono) y 2 FAIL ajenos al cambio:
  `ruta-profe` (3 pasos) y `profe-diseno` (1 paso). Se deben a que el repo de datos ya trae la ruta propia de IA del
  profe (`contenido/profe/plan.json`, desde 2026-10-19) mientras el servidor de pruebas corre con «hoy» 2026-10-04:
  la prueba detecta «sin ruta propia» y el servidor sí manda plan. Con `--hoy 2026-10-19`, `ruta-profe` pasa 16/16;
  `profe-diseno` falla en «pestaña Hechas con resultados» (sin entregas del profe en esa fecha). Este cambio no toca
  `profe.js`, la ruta del profe ni su servidor. `presentar` (cuyo fixture ganó una diapositiva `teoria`) y
  `ordenar-emparejar` (misma persona de ejemplo que la nueva actividad) siguen en verde.

## Verificación manual (CLI)
- Copia de `tests/fixtures/datos`, semana 2026-09-21: 0 errores, código 0 (solo avisos ya existentes del fixture).
- Con `tipo: "pila"`, ramas sin `centro` y comparar sin `derecha`: código 1 y tres errores claros, p. ej.
  `diagramas-e2e: teoria[3] «Ramas» diagrama: ramas necesita «centro» (el nodo del que salen los pasos)`.
- Capturas PNG (fuera del repo) revisadas a ojo: flujo, ciclo, capas, ramas (4 y 6), comparar y flujo de 8 pasos, en
  claro y oscuro, a 360 y 1280 px, y la diapositiva del ciclo.

## Verificación de estado
- Antes: sin tablas `stald_` involucradas (corrida sin `--pg`); clon temporal del repo de datos sin cambios.
- Después: igual; `correr.sh` trabaja sobre una copia del clon. No se hizo push al repo de datos.
- Estado restaurado: No aplica — no se mutó estado persistente.

## Resultado
- Estado Step 4: PASS (las 2 fallas de la fase inglés son previas y dependen de los datos/fecha, documentadas arriba)
- Bloqueos: ninguno
