## 0. Rama (OBLIGATORIO)

- [x] 0.1 Crear y usar la rama `fix/teoria-saltos-de-linea` desde `origin/main` (worktree aparte)

## 1. Revisar y actualizar pruebas existentes (OBLIGATORIO) — TDD

- [x] 1.1 Fixture `tests/fixtures/datos/contenido/actividades/diagramas-e2e.json`: bloque de teoría «Código» con
  `texto` multilínea (sangría, línea en blanco, una línea larga y HTML) y `puntos` con `\n`, más un bloque «Una línea»;
  ninguno trae diagrama, así que el orden de los diagramas no cambia
- [x] 1.2 `tests/e2e/e2e-teoria-diagramas.js`: comprobar a 360 y 1280 px, claro y oscuro, que el `texto` se pinta en
  varios renglones, que `print` queda a la derecha de `def` (sangría), que el HTML sale literal, que los `puntos` se
  parten en renglones, que un `texto` de una línea queda en un renglón y que no hay scroll horizontal. Corrida antes
  de implementar: falla (`white-space: normal`, scroll de 540 px a 360 px)
- [x] 1.3 Fixture `sec-e2e-clase-2026-10-27-a.json`: la lectura de apoyo con un título largo; la comprobación existente
  «videos sin scroll horizontal a 360 px» de `e2e-secundaria-clase.js` falla antes del arreglo de `.sec-enlaces .btn`

## 2. Implementación

- [x] 2.1 `ingles/comun.js`: clase `teoria-texto` en el `texto` de `renderTeoria`
- [x] 2.2 `ingles/ingles.css`: `.topic .teoria-texto` y `.teo-list li` con `white-space: pre-wrap` y
  `overflow-wrap: anywhere`
- [x] 2.3 `ingles/presentacion.js` / `ingles/presentacion.css`: `.s-lead.teoria-texto` y `.s-points li` igual
- [x] 2.4 `ingles/ingles.css`: `.sec-enlaces .btn` con `white-space: normal; max-width: 100%` (título largo en renglones)
- [x] 2.5 Subir `?v=` en `ingles.html`: `ingles.css` 15, `comun.js` 10, `presentacion.css` 3, `presentacion.js` 6

## 3. Pruebas y verificación de estado (OBLIGATORIO)

- [x] 3.1 `npx -y deno test -A server/`, `deno check server/main.ts`, `deno lint server/`
- [x] 3.2 E2E con `bash tests/e2e/correr.sh --datos <copia>` en puertos propios (8963/8964 y 8973/8974, con `CHROME`):
  `teoria-diagramas`, `presentar`, `presentacion-cabe`, `ruta-profe`, `profe-diseno`, `ingles-diseno-profe`,
  `ingles-alumno-diseno`, `navegacion-dispositivos`, `material`, `examen-secundaria` y, con `--hoy 2026-10-27`,
  `secundaria-clase`, `secundaria-clases`, `secundaria-dashboard`, `misiones`. La copia es temporal; no se escribe
  en `stald_*` ni en el repo de datos
- [x] 3.3 `npx -y @fission-ai/openspec@1.4.1 validate --strict`
- [x] 3.4 Reporte `openspec/changes/teoria-saltos-de-linea/reports/2026-11-02-step-3-pruebas-y-verificacion.md`

## 4. Verificación manual — EL AGENTE EJECUTA (OBLIGATORIO)

- [x] 4.1 Servidor local (README) con una copia del repo de datos: abrir la clase `sec-tec-2026-11-24` (Python) a
  360 px y en escritorio, revisar a ojo la captura (saltos, sangría, sin scroll horizontal); restaurar = borrar la copia
- [ ] 4.2 Producción tras el merge, solo lectura: GitHub Pages sirve el nuevo `?v=` y la regla `.teoria-texto`

## 5. Documentación (OBLIGATORIO)

- [x] 5.1 `docs/data-model.md`: `teoria[].texto`, `puntos` y `tips[].texto` respetan saltos y sangría (fuente única)

## 6. Cierre

- [ ] 6.1 `openspec archive teoria-saltos-de-linea` — después de la prueba del profe en el celular (no en este PR)
