## 0. Rama (OBLIGATORIO)

- [x] 0.1 `git fetch` y crear `feature/ingles-material-estudio` desde `origin/main` (worktree propio)

## 1. Catálogo y generador

- [x] 1.1 Prueba que falla primero: `server/material_indice_test.ts` (campos, URL de Pages, PDF existente, páginas
  reales, todo PDF catalogado, sin correos)
- [x] 1.2 `ingles/material/indice.json` con la guía de los tres tiempos + *to be* (con `mes`: guías mensuales,
  petición del profe; descripción con «🤖 Practica con IA»)
- [x] 1.3 `generar-pdf.ts`: opción `--todas` y aviso de páginas por PDF

## 2. Sección en Inglés y atajo en el portal

- [x] 2.1 `ingles/material.js` (carga del catálogo y tarjetas) y estilos en `ingles/ingles.css` (390 px)
- [x] 2.2 Sección `#material` para alumnos y alumnas (barra) y para el admin (menú / «☰ Más»)
- [x] 2.3 Pestaña «📚 Material» en la ruta del profe
- [x] 2.4 Material bajo la caja de entrada sin sesión (no en Secundaria)
- [x] 2.5 Atajo «📚 Material de estudio de Inglés» en `index.html`; subir `?v=` de los scripts tocados

## 3. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [x] 3.1 `tests/e2e/e2e-material.js` (alumna, admin, profe y sin sesión; 390×844 y escritorio; descarga 200
  `application/pdf`; capturas) y agregarla a `correr.sh` (fase `ingles`)
- [x] 3.2 Ajustar los conteos de pestañas de `e2e-ingles-pro.js` (alumno 6, admin escritorio 11)

## 4. Ejecutar pruebas y verificar estado (OBLIGATORIO)

- [x] 4.1 `npx -y deno test -A server/`, `deno lint server/` y `cd tests/calidad && npm run calidad` sin avisos nuevos
- [x] 4.2 E2E `material actividades-datos profe-grupo ruta-profe portal login` con `--hoy` por omisión (antes de
  la actividad) y `material` con `--hoy 2026-11-05` (después de que vence); los datos son una copia, sin `stald_`
- [x] 4.3 Reporte en `openspec/changes/ingles-material-estudio/reports/2026-10-18-step-4-pruebas-y-verificacion.md`

## 5. Verificación manual (OBLIGATORIO) — EL AGENTE EJECUTA

- [x] 5.1 Revisar las capturas (390×844 y escritorio) de alumna, admin, profe y sin sesión
- [ ] 5.2 Tras el merge: Pages sirve `ingles/material/indice.json` (200, JSON) y `ingles.html` muestra la sección

## 6. Documentación técnica (OBLIGATORIO)

- [x] 6.1 `docs/data-model.md` (§ «Material de estudio en PDF»: catálogo y cómo agregar una guía),
  `docs/frontend-standards.md` y skill `nueva-semana-ingles` (copias idénticas en `ai-specs/skills` y
  `.claude/skills`)
- [ ] 6.2 PR, CI y merge; borrar la rama remota
- [ ] 6.3 `openspec archive ingles-material-estudio` cuando el profe confirme (no en este PR)
