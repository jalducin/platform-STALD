## ADDED Requirements

### Requirement: Estilos RPG compartidos
Los tokens del diseño RPG SHALL vivir en `estilos/ui.css`, el CSS común de las páginas:

- colores `--rpg-*` en claro y oscuro (`prefers-color-scheme` y `data-theme`), panel, borde, texto suave, degradado
  del encabezado, brillo y barra de progreso.

Los componentes reutilizables también SHALL vivir ahí: `.rpg-num`, `.rpg-etiqueta`, `.rpg-xp-barra`, `.rpg-xp-chip`,
`.rpg-dato*` y `.rpg-contador`. Los usan Secundaria y Juegos, y cualquier página puede enlazarlo. Los componentes
SHALL tener respaldo para los tokens base (`--r-md`, `--accent-soft`, `--ok-soft`, `--border`) y funcionar con
`estilos/stald.css` o con los tokens propios de `juegos/app/juegos.css`. Mover los estilos ahí NO SHALL cambiar cómo
se ve Secundaria.

#### Scenario: Secundaria igual que antes
- **WHEN** se abre `ingles.html?modo=secundaria` con `estilos/ui.css` enlazado y sin esos tokens en
  `ingles/secundaria.css`
- **THEN** el tablero RPG se ve igual y su E2E (`secundaria-dashboard`) pasa

#### Scenario: Juegos usa los mismos tokens
- **WHEN** se abre `juegos.html`
- **THEN** el encabezado y las secciones RPG usan `--rpg-*` de `estilos/ui.css`
