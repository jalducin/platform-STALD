## 0. Rama (OBLIGATORIO)

- [x] 0.1 Crear y usar la rama `feature/teoria-diagramas` (worktree aparte, desde `origin/main`)

## 1. Validador

- [x] 1.1 Pruebas que fallan (`server/diagrama_test.ts`): los 5 tipos válidos; tipo desconocido; 1 y 9 pasos; paso sin
  `texto`; ramas sin `centro`; comparar sin `derecha`; `columnas` mal formadas; textos/iconos demasiado largos; y que
  `validarSemana` reporte el error con el id del elemento
- [x] 1.2 `server/diagrama.ts` (`validarDiagrama`) y llamada desde `server/semana.ts` para cada bloque de `teoria`

## 2. Frontend

- [x] 2.1 `ingles/comun.js`: `renderDiagrama` (escapado con `escapeHtml`) y uso en `renderTeoria`
- [x] 2.2 `ingles/ingles.css`: estilos de los 5 tipos con variables del tema (claro/oscuro), flujo vertical en celular
- [x] 2.3 `ingles/presentacion.js`: la diapositiva `teoria` muestra el diagrama
- [x] 2.4 Subir `?v=` de los JS/CSS tocados en los HTML que los cargan

## 3. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [x] 3.1 `server/semana_test.ts` sigue verde (la semana válida no trae diagramas); E2E nuevo
  `tests/e2e/e2e-teoria-diagramas.js` que abre una actividad con los 5 tipos en modo claro y oscuro, a 360 px y en
  ancho de escritorio, comprueba que se pintan, que el HTML de los datos sale escapado y que no hay scroll horizontal,
  y guarda capturas PNG fuera del repo

## 4. Pruebas y verificación de estado (OBLIGATORIO)

- [x] 4.1 `deno test -A server/`, `deno check server/main.ts`, `deno lint`
- [x] 4.2 E2E con una copia temporal del repo de datos con un fixture de diagramas; nunca se escribe en tablas
  `stald_` ni se sube nada al repo de datos
- [x] 4.3 `npx -y @fission-ai/openspec@1.4.1 validate --strict`
- [x] 4.4 Reporte `openspec/changes/teoria-diagramas/reports/2026-10-19-step-4-pruebas-y-verificacion.md`

## 5. Verificación manual — EL AGENTE EJECUTA (OBLIGATORIO)

- [x] 5.1 CLI `server/validar_semana.ts` sobre la copia con el fixture: válido (código 0) y con un diagrama roto
  (código 1 y mensaje claro)
- [x] 5.2 Revisar a ojo las capturas PNG de cada tipo (claro/oscuro, celular)
- [ ] 5.3 Producción tras el merge, solo lectura (GitHub Pages sirve el nuevo `?v=` y `renderDiagrama`)

## 6. Documentación (OBLIGATORIO)

- [x] 6.1 `docs/data-model.md` (formato de `diagrama`, fuente única) y `docs/frontend-standards.md` si aplica
- [x] 6.2 Skill `nueva-semana-ingles` (`ai-specs/skills` y su copia en `.claude/skills`): línea que menciona `diagrama`
