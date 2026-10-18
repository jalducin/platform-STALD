## 0. Rama (OBLIGATORIO)

- [x] 0.1 Crear y cambiar a `feature/material-pdf-ingles` (worktree propio desde `origin/main`)

## 1. Guía en PDF (repo público)

- [x] 1.1 Fuente `herramientas/material-ingles/guia-tres-tiempos-y-to-be.html`: portada con índice, línea del tiempo,
  *to be* (presente, usos, there is/are, was/were, will be, errores), presente simple, pasado regular e irregulares,
  futuro con *will* (+ going to), gran cuadro, mini historia; colores que se leen en gris; sin recursos de internet
- [x] 1.2 Práctica ampliada (petición del profe): 71 ejercicios por sección y de menor a mayor dificultad (A *to be* 15,
  B presente 13, C pasado 17, D futuro 9, E mezcla 17), renglones para contestar, sopa de letras de irregulares,
  página «Escribe sobre ti» y **respuestas al final**
- [x] 1.3 Recursos oficiales de Cambridge verificados con curl (200 y título correcto); se descartó `short-answers`
  (la URL responde 200 pero muestra otra página)
- [x] 1.4 Generador `herramientas/material-ingles/generar-pdf.ts` (chrome-headless-shell de Playwright o `CHROME`) →
  `ingles/material/guia-tres-tiempos-y-to-be.pdf`
- [x] 1.5 Revisar las 19 páginas renderizadas a PNG (y una en escala de grises): nada cortado, tablas y bloques sin
  partirse entre páginas, acentos correctos; índice con los números de página reales

## 2. Actividad (repo de datos)

- [x] 2.1 `herramientas/semana-2026-10-19/gen_guia.py`: actividad `guia-2026-10-23` en la semana `2026-10-19` (todos
  los grupos, sin tocar los demás elementos), `disponibleDesde` lunes 19 (se adelanta el domingo 18 por
  `semana-desde-domingo`), entrega vie 23, teoría con las instrucciones, tip `lectura` con la URL de Pages, 3 tips
  `libreta`, 2 videos y 2 lecturas oficiales; repaso de 2 intentos × 10 preguntas con banco de 20 (`opcion`,
  `escribir`, `ordenar`)
- [x] 2.2 Tip del profe con el PDF en `meet-2026-10-25` y `meet-2026-11-01`
- [x] 2.3 `validar_semana.ts` de `2026-10-19` y `2026-10-26`: 0 errores

## 3. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [x] 3.1 Prueba nueva `server/material_pdf_test.ts` (cada fuente con su PDF publicado; fuente sin recursos externos
  ni correos). Las pruebas existentes no cambian: el cambio no toca el servidor ni las páginas

## 4. Ejecutar pruebas y verificar estado (OBLIGATORIO)

- [x] 4.1 `deno test -A server/`, `deno check server/main.ts` y `deno lint server/`
- [x] 4.2 Reporte en `openspec/changes/material-pdf-ingles/reports/2026-10-18-step-4-pruebas-y-verificacion.md`

## 5. Verificación manual (OBLIGATORIO) — EL AGENTE EJECUTA

- [x] 5.1 Servidor local con una **copia** del repo de datos (`DATA_DIR`, `ROWS_FIXTURE`, `PERMITIR_HOY`): admin y
  alumno o alumna ven `guia-2026-10-23` el domingo 18 (disponible, 10 preguntas sin respuestas expuestas y el
  enlace al PDF); el sábado 17 responde 403, sin sesión 401 e id inexistente 404. La copia se borra al terminar
- [x] 5.2 Tras el merge: Pages sirve el PDF (200, `application/pdf`); después se sube el repo de datos

## 6. Documentación técnica (OBLIGATORIO)

- [x] 6.1 `docs/data-model.md` (tips `lectura` y § «Material de estudio en PDF») y skill `nueva-semana-ingles`
  (copias en `ai-specs/skills` y `.claude/skills`)
- [x] 6.2 PR, CI y merge
- [ ] 6.3 `openspec archive material-pdf-ingles` cuando el profe confirme la guía
