## ADDED Requirements

### Requirement: Análisis de calidad reproducible
El repo SHALL incluir en `tests/calidad/`, con su propio `package.json` (sin dependencias en la raíz), un análisis de
calidad que se corre desde la terminal con `npm run calidad` y aplica las reglas equivalentes a las de SonarQube for
IDE que el proyecto atiende, identificadas con su clave de Sonar. SHALL cubrir el JS del navegador (`juegos/`,
`ingles/`, `comun/` y los `<script>` de los HTML de la raíz y de `juegos/`), el CSS (archivos `.css` y `<style>`) y
`server/*.ts`, e imprimir los avisos por regla y por archivo. SHALL respetar el comentario `NOSONAR` como SonarLint y
contar aparte los avisos así revisados. SHALL NOT modificar archivos ni fallar por tener avisos: es una medición.

#### Scenario: Medir la calidad
- **WHEN** alguien corre `npm install` y `npm run calidad` en `tests/calidad/`
- **THEN** ve el total de avisos, el conteo por regla de Sonar (p. ej. `S3358`, `css:S4666`, `Web:S6819`) y por
  archivo, y cuántos están marcados como revisados con `NOSONAR`

#### Scenario: Ver el detalle de una regla
- **WHEN** corre `node calidad.mjs --detalle --regla S2681 --contexto 1`
- **THEN** ve cada aviso de esa regla con archivo, línea, mensaje y las líneas de código alrededor

#### Scenario: Azar de juego revisado
- **WHEN** una línea con `Math.random()` lleva `// NOSONAR: azar de juego, no criptográfico`
- **THEN** su aviso `S2245` no cuenta en el total y aparece en «revisados con NOSONAR»
