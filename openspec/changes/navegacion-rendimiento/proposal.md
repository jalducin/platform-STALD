## Estado

**Parte 2 implementada** en el cambio `panel-profe-peticiones` (2026-10-22: el panel abre con 5 peticiones, antes 15;
ver su reporte). **La parte 1 (carga perezosa de Juegos) sigue sin implementar.** Son las dos recomendaciones grandes de la auditoría de navegación
(`openspec/changes/navegacion-dispositivos/reports/2026-10-22-auditoria.md`) que el profe pidió (2026-10-22) dejar
anotadas y fuera de `navegacion-mejoras`. Antes de implementarlas: `enrich-us` / `openspec-ff-change` con este
documento como punto de partida (design, specs y tasks), y medir otra vez la línea base.

> **2026-10-22:** la parte 1 (carga perezosa de Juegos) la implementa el cambio `juegos-carga-perezosa`; aquí queda
> pendiente solo la parte 2 (panel del profe en una petición).

## Why

- **Juegos carga 51 archivos de entrada.** `juegos.html` y `juegos.html?registro=1` piden 51 recursos (todos 200) aunque
  la persona solo vea el menú de categorías o la entrada de invitado. En celular, la primera carga en producción fue
  FCP 448 ms / load 578 ms; con red móvil real (3G/4G lenta) cada archivo cuesta un viaje más. Casi todo el código de
  cada juego (motores, tableros, sprites, sonido) no hace falta hasta tocar ese juego.
- **El panel del profe hace 17–19 peticiones al abrir.** La tarea «profe-grupos» midió 19 peticiones al API en
  celular y tablet y 17 en PC (resumen por grupo, grupos, alumnos y alumnas, actividades, bandeja de entregas, nicks,
  material, etc.). Cada una paga verificación de sesión y lectura en el servidor; en celular se nota en la pantalla
  más lenta del panel (≈ 0.6–0.7 s con servidor local; más en producción).

## What Changes (propuesta)

### 1. Carga perezosa de Juegos
- Separar en `juegos.html` lo que necesita el hub (menú, categorías, ranking, entrada de invitado, salas) de lo que
  necesita cada juego.
- Cargar el código de un juego al tocarlo (`import()` dinámico o `<script>` insertado bajo demanda, con un indicador
  de carga) y conservarlo en caché del navegador (`?v=` por archivo, como hoy).
- Precargar (`<link rel="prefetch">`) solo los juegos más jugados, cuando la red esté libre.
- Mantener los `?v=` y el orden de dependencias (motores comunes antes que cada juego).
- Meta medible: el hub en ≤ 15 archivos; FCP y load en celular al menos 30 % más bajos; sin cambiar la experiencia
  dentro de un juego.

### 2. Una petición para el panel del profe
- Ruta nueva del servidor (p. ej. `GET /ingles/profe/panel`) que junte en una respuesta lo que el panel necesita al
  abrir (resumen, grupos, conteos, bandeja de entregas y nicks pendientes), con caché corta por persona en el servidor
  (ya existe el patrón de cargas coalescidas).
- El cliente pinta con esa respuesta y deja las secciones pesadas (registro completo, material, juegos) para cuando se
  abren.
- Meta medible: el panel en ≤ 6 peticiones; el presupuesto de la E2E `peticiones` se baja en el mismo cambio.
- Contrato HTTP nuevo: actualizar backend y todas las páginas consumidoras en el mismo cambio; matriz de acceso
  explícita (solo admin) y pruebas de sesión vencida, correo no admin y error de la fuente de datos.

## Capabilities (previstas)

- `juegos`: requisito «Carga perezosa del código de cada juego».
- `ingles` / `plataforma`: requisito «Panel del profe en una petición» y ajuste de los presupuestos de peticiones.

## Impact (previsto)

- `juegos.html`, `juegos/app/*`, motores de `juegos/`; `server/` (ruta nueva), `ingles/tablero.js`, `ingles/app.js`;
  E2E `peticiones`, `juegos*`, `navegacion-dispositivos`, `ingles-admin`; `docs/backend-standards.md`,
  `docs/frontend-standards.md`, `docs/pruebas.md`.
- Riesgo: alto (muchos archivos y contrato HTTP nuevo). Conviene hacerlo en dos cambios separados.
