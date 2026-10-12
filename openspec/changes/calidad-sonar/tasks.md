## 0. Rama (OBLIGATORIO)

- [ ] 0.1 `git fetch` y crear la rama `feature/calidad-sonar` desde `origin/main`

## 1. Medición reproducible

- [ ] 1.1 `tests/calidad/` con su propio `package.json` (versiones exactas) y `package-lock.json`: ESLint +
  `eslint-plugin-sonarjs` + `eslint-plugin-unicorn` + `eslint-plugin-html` + `typescript-eslint` (parser de
  `server/*.ts`), Stylelint + `postcss-html`; `eslint.config.mjs` con el mapa regla → clave de Sonar
- [ ] 1.2 `calidad.mjs` (`npm run calidad`): conteo por regla y por archivo, `--detalle`, `--contexto`, `--regla`,
  `--archivo`, `--json`; `NOSONAR` como SonarLint; contraste WCAG AA (css:S7924) y roles ARIA (Web:S6819) propios
- [ ] 1.3 Medición «antes» guardada en el reporte (por regla y por archivo)

## 2. Fase 1: archivos que el sprint 22 no toca

Alcance: `server/`, `juegos/*.html` (salvo `juegos.html`), `juegos/*.js` salvo `blackjack.js`, `salas-grandes.js` y
`tablero-ui.js`, `juegos/app/` (`nucleo`, `admin`, `mente`, `clasicos`, `naipes`, `salas-mesa`, `musica`), `ingles/`,
`comun/`, `index.html`, `ingles.html`, `secundaria.html`, `estilos/`.

- [ ] 2.1 a) Posibles errores reales, uno por uno: S2681 (separar en llaves; si hay error real, corregirlo con
  prueba), S1854, S3923, S1788, S2486 (comentar o atender), S9382
- [ ] 2.2 b) CSS: contraste AA en ambos temas (y lo que aplique de `break-word` y duplicados)
- [ ] 2.3 c) Accesibilidad Web:S6819: `<fieldset>`/`<output>` donde no cambie el aspecto
- [ ] 2.4 d) Modernizaciones mecánicas: S6661, S7723, S7767, S7781, S7784, S6653, S7773, S3735, S1135
- [ ] 2.5 e) S3358: extraer ternarios anidados a ayudantes o `if/else` donde mejore la lectura
- [ ] 2.6 f) S3776: partir solo las funciones de complejidad > ~40 cubiertas por E2E; justificar el resto en design.md
- [ ] 2.7 g) S2245: `// NOSONAR: azar de juego, no criptográfico` en cada `Math.random` revisado
- [ ] 2.8 Decidir los `?v=`: refactor sin cambios de interfaz, no se suben (ver design.md §3)

## 3. Fase 2: archivos del sprint 22

- [ ] 3.1 `git fetch` y revisar con `gh pr list --state merged` si el PR «juegos-categorias» ya está en `origin/main`
- [ ] 3.2 Si está: merge de `origin/main` y aplicar los bloques a)–g) a sus archivos; si no: dejarlos pendientes y
  anotarlo en el reporte

## 4. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [ ] 4.1 Revisar que las E2E y las pruebas Deno siguen válidas (el cambio no altera comportamiento); agregar prueba
  solo si aparece un error real

## 5. Pruebas y verificación de estado (OBLIGATORIO)

- [ ] 5.1 `npx -y deno test -A server/`, `deno check server/main.ts` y `deno lint server/`
- [ ] 5.2 E2E por familia tras cada bloque y la batería completa al final con la copia de datos de prueba (la copia
  se descarta al terminar: estado restaurado; nunca se escribe en tablas `stald_`); las inestables conocidas se
  repiten solas y se comparan con `main`
- [ ] 5.3 Medición «después» con `npm run calidad`
- [ ] 5.4 Reporte `openspec/changes/calidad-sonar/reports/2026-10-12-step-5-pruebas-y-verificacion.md` con el
  antes/después por regla

## 6. Verificación manual — EL AGENTE EJECUTA (OBLIGATORIO)

- [ ] 6.1 CLI: `npm run calidad`, `--detalle --regla S2245`, `--archivo`, `--json`, y una regla inexistente (salida
  vacía, código 0)
- [ ] 6.2 Abrir las páginas cambiadas servidas en local (las E2E las recorren) y revisar capturas de lo visual
  (contraste, `<fieldset>`/`<output>`)
- [ ] 6.3 Tras el merge: Pages sirve los archivos cambiados y Deno Deploy queda en verde

## 7. Documentación (OBLIGATORIO)

- [ ] 7.1 `docs/pruebas.md`: sección «Análisis de calidad» (cómo correrlo, qué reglas y qué hacer con `NOSONAR`)
- [ ] 7.2 Índice de documentación (`README.md` / `docs/documentation-standards.md`) y `docs/frontend-standards.md`
  si aplica

## 8. Publicar y archivar

- [ ] 8.1 Push, PR en español, esperar todos los checks, merge y borrar la rama remota
- [ ] 8.2 Verificar producción (Pages y Deno)
- [ ] 8.3 `openspec archive calidad-sonar` en un PR aparte, con sus checks en verde
