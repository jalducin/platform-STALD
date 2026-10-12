## Why

El profe mandó una captura del panel «Problemas» de VS Code con 371 avisos de SonarQube for IDE (SonarLint). La
mayoría venían de copias viejas de worktrees de agentes, pero las mismas reglas aplican al código vivo de `main`:
ternarios anidados, complejidad cognitiva, sangrías engañosas, `Math.random`, `Object.assign`, `catch` vacíos,
roles ARIA con elemento nativo, contraste y selectores CSS duplicados, entre otras. Hoy no hay forma de medirlos
desde la terminal, así que nadie sabe si suben o bajan, y alguno podría esconder un error real (p. ej. una sangría
que hace creer que una instrucción está dentro de un `if`).

## What Changes

- **Medición reproducible** (`tests/calidad/`, con su propio `package.json` como `tests/e2e`; nada en la raíz):
  ESLint con `eslint-plugin-sonarjs` y `eslint-plugin-unicorn` (las reglas equivalentes a las de Sonar, con su clave
  `Sxxxx`), Stylelint para el CSS y dos revisiones propias (contraste WCAG AA y roles ARIA en el marcado).
  `npm run calidad` imprime los avisos por regla y por archivo; respeta `// NOSONAR` como SonarLint.
- **Limpieza sin cambiar comportamiento**, por orden de riesgo y valor:
  1. posibles errores reales (S2681 sangría engañosa, S1854, S3923, S1788, S2486 `catch` vacío, S9382);
  2. CSS (`break-word` obsoleto, selectores duplicados, contraste AA en ambos temas);
  3. accesibilidad (`<fieldset>`/`<output>` en lugar de `role="group"`/`role="status"` donde no cambia el aspecto);
  4. modernizaciones mecánicas (S6661, S7723, S7767, S7781, S7784, S6653, S7773, S3735, S1135);
  5. ternarios anidados (S3358) donde extraerlos mejora la lectura;
  6. complejidad cognitiva (S3776): solo las funciones peores y cubiertas por E2E;
  7. `Math.random` (S2245): azar de juego, no criptográfico; se marca como revisado con `// NOSONAR`.
- **Dos fases** por coordinación con el sprint 22 (`feature/juegos-categorias`, aún sin merge): primero todo lo que
  ese sprint no toca; los archivos que sí toca, solo si su PR ya está en `main` al llegar a ese punto.
- **Documentación:** `docs/pruebas.md` explica cómo correr el análisis; inventario de documentación al día.

Sin cambios de comportamiento visibles para alumnos y alumnas, ni del contrato HTTP.

## Capabilities

### New Capabilities
<!-- ninguna -->

### Modified Capabilities
- `pruebas`: se agrega el requisito «Análisis de calidad reproducible».

## Impact

- **Superficies:** páginas estáticas (`index.html`, `ingles.html`, `secundaria.html`, `juegos/*.html`, `juegos/*.js`,
  `juegos/app/*`, `ingles/*`, `comun/*`) y servidor Deno (`server/*.ts`), solo refactorizaciones equivalentes. Sin
  cambios en Postgres, Realtime, Auth, repo de datos ni Notion.
- **Nuevo:** `tests/calidad/` (`package.json`, `package-lock.json`, `eslint.config.mjs`, `calidad.mjs`).
- **No se toca:** `supabase/` (legado de Fidello), Notion, `.env`, tablas `stald_*`, la rama del sprint 22.
- **Acciones externas:** ninguna.
