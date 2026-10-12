## 0. Rama (OBLIGATORIO)

- [x] 0.1 `git fetch` y crear la rama `feature/calidad-sonar` desde `origin/main`

## 1. Medición reproducible

- [x] 1.1 `tests/calidad/` con su propio `package.json` (versiones exactas) y `package-lock.json`: ESLint +
  `eslint-plugin-sonarjs` + `eslint-plugin-unicorn` + `eslint-plugin-html` + `typescript-eslint` (parser de
  `server/*.ts`), Stylelint + `postcss-html`; `eslint.config.mjs` con el mapa regla → clave de Sonar
- [x] 1.2 `calidad.mjs` (`npm run calidad`): conteo por regla y por archivo, `--detalle`, `--contexto`, `--regla`,
  `--archivo`, `--json`; `NOSONAR` como SonarLint; contraste WCAG AA (css:S7924) y roles ARIA (Web:S6819) propios
- [x] 1.3 Medición «antes» guardada en el reporte (por regla y por archivo)

## 2. Fase 1: archivos que el sprint 22 no toca

Alcance: `server/`, `juegos/*.html` (salvo `juegos.html`), `juegos/*.js` salvo `blackjack.js`, `salas-grandes.js` y
`tablero-ui.js`, `juegos/app/` (`nucleo`, `admin`, `mente`, `clasicos`, `naipes`, `salas-mesa`, `musica`), `ingles/`,
`comun/`, `index.html`, `ingles.html`, `secundaria.html`, `estilos/`.

- [x] 2.1 a) Posibles errores reales, uno por uno: S2681 (separar en llaves; si hay error real, corregirlo con
  prueba), S1854, S3923, S1788, S2486 (comentar o atender), S9382
- [x] 2.2 b) CSS: contraste AA en ambos temas (y lo que aplique de `break-word` y duplicados)
- [x] 2.3 c) Accesibilidad Web:S6819: `<fieldset>`/`<output>` donde no cambie el aspecto
- [x] 2.4 d) Modernizaciones mecánicas: S6661, S7723, S7767, S7781, S7784, S6653, S7773, S3735, S1135
- [x] 2.5 e) S3358: extraer ternarios anidados a ayudantes o `if/else` donde mejore la lectura
- [x] 2.6 f) S3776: partir solo las funciones de complejidad > ~40 cubiertas por E2E; justificar el resto en design.md
- [x] 2.7 g) S2245: `// NOSONAR: azar de juego, no criptográfico` en cada `Math.random` revisado
- [x] 2.8 `?v=`: se sube en 1 el de cada script u hoja cambiada en todos los HTML (ver design.md §3)

## 3. Fase 2: archivos del sprint 22

- [x] 3.1 `git fetch` y revisar con `gh pr list --state merged` si el PR «juegos-categorias» ya está en `origin/main`
- [x] 3.2 Estaba (#181, a media tarea): merge de `origin/main` sin conflictos y bloques a)–g) aplicados; además se
  encontró y corrigió un error real con su prueba (ver design.md «Error real»). Si está: merge de `origin/main` y aplicar los bloques a)–g) a sus archivos; si no: dejarlos pendientes y
  anotarlo en el reporte

## 4. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [x] 4.1 Revisar que las E2E y las pruebas Deno siguen válidas (el cambio no altera comportamiento); agregar prueba
  solo si aparece un error real: «naval: sin rival da su aviso propio» en `e2e-ajustes-salas`

## 5. Pruebas y verificación de estado (OBLIGATORIO)

- [x] 5.1 `npx -y deno test -A server/`, `deno check server/main.ts` y `deno lint server/`
- [x] 5.2 E2E por familia tras cada bloque y la batería completa al final con la copia de datos de prueba (la copia
  se descarta al terminar: estado restaurado; nunca se escribe en tablas `stald_`); las inestables conocidas se
  repiten solas y se comparan con `main`
- [x] 5.3 Medición «después» con `npm run calidad`
- [x] 5.4 Reporte `openspec/changes/calidad-sonar/reports/2026-10-12-step-5-pruebas-y-verificacion.md` con el
  antes/después por regla

## 6. Verificación manual — EL AGENTE EJECUTA (OBLIGATORIO)

- [x] 6.1 CLI: `npm run calidad`, `--detalle --regla S2245`, `--archivo`, `--json`, y una regla inexistente (salida
  vacía, código 0)
- [x] 6.2 Abrir las páginas cambiadas servidas en local (las E2E las recorren) y revisar capturas de lo visual
  (contraste, `<fieldset>`/`<output>`)
- [ ] 6.3 Tras el merge: Pages sirve los archivos cambiados y Deno Deploy queda en verde

## 7. Documentación (OBLIGATORIO)

- [x] 7.1 `docs/pruebas.md`: sección «Análisis de calidad» (cómo correrlo, qué reglas y qué hacer con `NOSONAR`)
- [x] 7.2 Índice de documentación (`README.md` / `docs/documentation-standards.md`) y `docs/frontend-standards.md`
  si aplica

## 8. Publicar y archivar

- [ ] 8.1 Push, PR en español, esperar todos los checks, merge y borrar la rama remota
- [ ] 8.2 Verificar producción (Pages y Deno)
- [ ] 8.3 `openspec archive calidad-sonar` en un PR aparte, con sus checks en verde
